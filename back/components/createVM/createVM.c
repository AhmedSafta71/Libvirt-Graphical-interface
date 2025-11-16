#include "createVM.h"
#include "../../libvirt-utils.h" 
#include <libvirt/libvirt.h>
#include <cjson/cJSON.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <stdbool.h>

/* chemin du partage NFS monté localement */
static const char *NFS_BASE = "/var/lib/libvirt/images/NFS";

/* helper: build full path under NFS */
static void build_nfs_path(char *out, size_t out_size, const char *basename) {
    snprintf(out, out_size, "%s/%s", NFS_BASE, basename);
}

/* helper: check file exists */
static int file_exists(const char *path) {
    struct stat st;
    return (stat(path, &st) == 0);
}

/* helper: run a command and return exit status */
static int run_command(const char *cmd) {
    int rc = system(cmd);
    if (rc == -1) return -1;
    /* system() returns status<<8 - normalize */
    if (WIFEXITED(rc)) return WEXITSTATUS(rc);
    return -1;
}

char *handle_create_vm(const char *json_body) {
    cJSON *root = cJSON_Parse(json_body);
    if (!root) return strdup("{\"success\":false,\"error\":\"invalid json\"}");

    /* Required fields */
    cJSON *j_vmName = cJSON_GetObjectItemCaseSensitive(root, "vmName");
    cJSON *j_cpu = cJSON_GetObjectItemCaseSensitive(root, "cpu");
    cJSON *j_memory = cJSON_GetObjectItemCaseSensitive(root, "memory");
    cJSON *j_iso = cJSON_GetObjectItemCaseSensitive(root, "iso");
    cJSON *j_disk_size = cJSON_GetObjectItemCaseSensitive(root, "disk_size");

    if (!cJSON_IsString(j_vmName) || !cJSON_IsNumber(j_cpu) ||
        !cJSON_IsNumber(j_memory) || !cJSON_IsString(j_iso) ||
        !cJSON_IsNumber(j_disk_size)) {
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"missing or invalid fields\"}");
    }

    const char *vmName = j_vmName->valuestring;
    int cpu = j_cpu->valueint;
    int memory = j_memory->valueint;
    const char *iso = j_iso->valuestring;
    int disk_size_mb = j_disk_size->valueint;

    /* validate basic limits */
    if (cpu < 1 || cpu > 64 || memory < 128 || memory > 524288 ||
        disk_size_mb < 1 || disk_size_mb > 1000000) {
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"field values out of bounds\"}");
    }

    /* Read optional libvirt connection params (reuse existing helper pattern) */
    const char *protocol = NULL, *user = NULL, *host = NULL, *path = NULL;
    int port = 0;
    cJSON *j;
#define GETSTR(name) ((j = cJSON_GetObjectItemCaseSensitive(root, name)) && cJSON_IsString(j) ? j->valuestring : NULL)
    protocol = GETSTR("protocol");
    user     = GETSTR("user");
    host     = GETSTR("host");
    path     = GETSTR("path");
    if ((j = cJSON_GetObjectItemCaseSensitive(root, "port")) && cJSON_IsNumber(j)) {
        port = j->valueint;
    }
#undef GETSTR

    if (!protocol) protocol = "qemu";
    if (!path) path = "system";

    /* build libvirt uri and connect */
    char uri[512];
    build_libvirt_uri(uri, sizeof(uri), protocol, user, host, port, path);
    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"cannot connect to libvirt\"}");
    }

    /* Build ISO path and disk path */
    char iso_path[1024];
    build_nfs_path(iso_path, sizeof(iso_path), iso);

    if (!file_exists(iso_path)) {
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"iso not found on server\"}");
    }

    /* disk file name: <vmName>.qcow2 under NFS_BASE */
    char disk_path[1024];
    snprintf(disk_path, sizeof(disk_path), "%s/%s.qcow2", NFS_BASE, vmName);

    /* if disk already exists, return error to avoid overwrite */
    if (file_exists(disk_path)) {
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"disk already exists\"}");
    }

    /* Create qcow2 using qemu-img (needs qemu-img installed and proper permissions) */
    /* command example: qemu-img create -f qcow2 /var/lib/libvirt/images/NFS/vmName.qcow2 10G */
    char cmd[2048];
    /* size in GB string */
    double gb = (double)disk_size_mb / 1024.0;
    /* build string like 10G or 10240M - use M to be precise */
    snprintf(cmd, sizeof(cmd), "qemu-img create -f qcow2 '%s' %dM", disk_path, disk_size_mb);

    int rc = run_command(cmd);
    if (rc != 0) {
        /* cleanup if any partial file */
        unlink(disk_path);
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"failed to create disk image\"}");
    }

    /* Set permissions so libvirt/qemu can access file (may need uid/gid adjustments) */
    /* chown/chmod if necessary — here we set mode 0644 */
    chmod(disk_path, 0644);

    /* Construct domain XML */
    char xml[12288];
    int r = snprintf(xml, sizeof(xml),
        "<domain type='kvm'>"
          "<name>%s</name>"
          "<memory unit='MiB'>%d</memory>"
          "<vcpu>%d</vcpu>"
          "<os>"
            "<type arch='x86_64'>hvm</type>"
            "<boot dev='hd'/>"
            "<boot dev='cdrom'/>"
          "</os>"
          "<features><acpi/><apic/></features>"
          "<clock offset='utc'/>"
          "<on_poweroff>destroy</on_poweroff>"
          "<on_reboot>restart</on_reboot>"
          "<on_crash>restart</on_crash>"
          "<devices>"
            "<emulator>/usr/bin/qemu-system-x86_64</emulator>"
            "<disk type='file' device='disk'>"
              "<driver name='qemu' type='qcow2' cache='none'/>"
              "<source file='%s'/>"
              "<target dev='vda' bus='virtio'/>"
            "</disk>"
            "<disk type='file' device='cdrom'>"
              "<driver name='qemu' type='raw'/>"
              "<source file='%s'/>"
              "<target dev='hdc' bus='ide'/>"
              "<readonly/>"
            "</disk>"
            "<interface type='network'>"
              "<source network='default'/>"
            "</interface>"
            "<serial type='pty'><target port='0'/></serial>"
            "<console type='pty'><target type='serial' port='0'/></console>"
            "<graphics type='vnc' port='-1' autoport='yes' listen='0.0.0.0'/>"
            "<video><model type='cirrus' vram='9216' heads='1'/></video>"
            "<memballoon model='virtio'/>"
          "</devices>"
        "</domain>",
        vmName, memory, cpu, disk_path, iso_path);

    if (r < 0 || (size_t)r >= sizeof(xml)) {
        /* malformed */
        unlink(disk_path);
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"xml build failed\"}");
    }

    /* Create domain */
    virDomainPtr dom = virDomainCreateXML(conn, xml, 0);
    cJSON *resp = cJSON_CreateObject();
    if (!dom) {
        /* domain creation failed - remove disk */
        unlink(disk_path);
        cJSON_AddBoolToObject(resp,"succes", false);
        cJSON_AddStringToObject(resp, "error", "virDomainCreateXML failed");
    } else {
        cJSON_AddBoolToObject(resp, "success", true);
        cJSON_AddStringToObject(resp, "message", "VM created and started");
        /* optionally return domain name/uuid */
        char *uuid = NULL;
        uuid = malloc(37);
        if (uuid && virDomainGetUUIDString(dom, uuid) == 0) {
            cJSON_AddStringToObject(resp, "uuid", uuid);
        }
        free(uuid);
        virDomainFree(dom);
    }

    virConnectClose(conn);
    cJSON_Delete(root);

    char *out = cJSON_PrintUnformatted(resp);
    cJSON_Delete(resp);
    return out;
}