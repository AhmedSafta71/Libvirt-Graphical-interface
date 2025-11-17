// File: components/createVM/createVM.c

#include "createVM.h"
#include "../../libvirt-utils.h"

#include <libvirt/libvirt.h>
#include <cjson/cJSON.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>   // pour WIFEXITED, WEXITSTATUS
#include <stdbool.h>

/* Chemin du partage NFS monté localement */
static const char *NFS_BASE = "/mnt/vmstore";

/* --------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

/* Construit un chemin complet sous NFS_BASE */
static void build_nfs_path(char *out, size_t out_size, const char *basename) {
    /* Assure de ne pas dépasser la taille du buffer */
    snprintf(out, out_size, "%s/%s", NFS_BASE, basename);
}

/* Teste l’existence d’un fichier */
static int file_exists(const char *path) {
    struct stat st;
    return (stat(path, &st) == 0);
}

/* Exécute une commande système et retourne son code de sortie normalisé */
static int run_command(const char *cmd) {
    int rc = system(cmd);
    if (rc == -1) {
        return -1;
    }
    if (WIFEXITED(rc)) {
        return WEXITSTATUS(rc);
    }
    return -1;
}

/* --------------------------------------------------------------------------
 * Handler principal : handle_create_vm
 * -------------------------------------------------------------------------- */

/**
 * handle_create_vm
 *
 * @param json_body : corps JSON de la requête HTTP
 *   Exemple de payload attendu :
 *   {
 *     "vmName": "vm-test",
 *     "cpu": 2,
 *     "memory": 1024,
 *     "iso": "ubuntu-11.04-server-amd64.iso",
 *     "disk_size": 8192,
 *     "network": "default",       // optionnel, "default" si absent
 *     "protocol": "qemu",         // optionnel
 *     "user": null,               // optionnel
 *     "host": "192.168.122.1",    // optionnel
 *     "port": 16509,              // optionnel
 *     "path": "system"            // optionnel
 *   }
 *
 * @return : JSON alloué dynamiquement (char*) à libérer par l’appelant.
 */
char *handle_create_vm(const char *json_body) {
    cJSON *root = cJSON_Parse(json_body);
    if (!root) {
        return strdup("{\"success\":false,\"error\":\"invalid json\"}");
    }

    /* Champs obligatoires */
    cJSON *j_vmName    = cJSON_GetObjectItemCaseSensitive(root, "vmName");
    cJSON *j_cpu       = cJSON_GetObjectItemCaseSensitive(root, "cpu");
    cJSON *j_memory    = cJSON_GetObjectItemCaseSensitive(root, "memory");
    cJSON *j_iso       = cJSON_GetObjectItemCaseSensitive(root, "iso");
    cJSON *j_disk_size = cJSON_GetObjectItemCaseSensitive(root, "disk_size");
    cJSON *j_network   = cJSON_GetObjectItemCaseSensitive(root, "network");

    if (!cJSON_IsString(j_vmName) || !cJSON_IsNumber(j_cpu) ||
        !cJSON_IsNumber(j_memory) || !cJSON_IsString(j_iso) ||
        !cJSON_IsNumber(j_disk_size)) {
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"missing or invalid fields\"}");
    }

    const char *vmName      = j_vmName->valuestring;
    int         cpu         = j_cpu->valueint;
    int         memory      = j_memory->valueint;        // en MiB
    const char *iso         = j_iso->valuestring;
    int         disk_size_mb = j_disk_size->valueint;    // en MiB

    /* Network : optionnel, default si absent */
    const char *network_name =
        (j_network && cJSON_IsString(j_network) && j_network->valuestring &&
         strlen(j_network->valuestring) > 0)
        ? j_network->valuestring
        : "default";

    /* Validation minimale des limites */
    if (cpu < 1 || cpu > 64 ||
        memory < 128 || memory > 524288 ||       /* 128 MiB à 512 GiB */
        disk_size_mb < 1 || disk_size_mb > 1000000) {  /* 1 MiB à 1 TiB en gros */
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"field values out of bounds\"}");
    }

    /* Paramètres optionnels de connexion libvirt */
    const char *protocol = NULL;
    const char *user     = NULL;
    const char *host     = NULL;
    const char *path     = NULL;
    int port             = 0;

    cJSON *j = NULL;
#define GETSTR(name) \
    ((j = cJSON_GetObjectItemCaseSensitive(root, name)) && cJSON_IsString(j) ? j->valuestring : NULL)

    protocol = GETSTR("protocol");
    user     = GETSTR("user");
    host     = GETSTR("host");
    path     = GETSTR("path");
#undef GETSTR

    if ((j = cJSON_GetObjectItemCaseSensitive(root, "port")) && cJSON_IsNumber(j)) {
        port = j->valueint;
    }

    /* Valeurs par défaut si non fournies */
    if (!protocol) protocol = "qemu";
    if (!path)     path     = "system";

    /* ------------------------------------------------------------------
     * Connexion à libvirt
     * ------------------------------------------------------------------ */
    char uri[512];
    build_libvirt_uri(uri, sizeof(uri), protocol, user, host, port, path);

    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"cannot connect to libvirt\"}");
    }

    /* ------------------------------------------------------------------
     * Préparation chemins ISO et disque
     * ------------------------------------------------------------------ */

    /* Chemin complet de l'ISO sur le NFS */
    char iso_path[1024];
    build_nfs_path(iso_path, sizeof(iso_path), iso);

    if (!file_exists(iso_path)) {
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"iso not found on server\"}");
    }

    /* Nom de fichier disque : <vmName>.qcow2 sous NFS_BASE */
    char disk_path[1024];
    snprintf(disk_path, sizeof(disk_path), "%s/%s.qcow2", NFS_BASE, vmName);

    /* Si le disque existe déjà -> erreur pour éviter d’écraser */
    if (file_exists(disk_path)) {
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"disk already exists\"}");
    }

    /* ------------------------------------------------------------------
     * Création de l'image disque qcow2
     * ------------------------------------------------------------------ */

    char cmd[2048];
    /* On utilise une taille en MiB : ex: qemu-img create -f qcow2 /path/vm.qcow2 8192M */
    snprintf(cmd, sizeof(cmd), "qemu-img create -f qcow2 '%s' %dM", disk_path, disk_size_mb);

    int rc = run_command(cmd);
    if (rc != 0) {
        /* Nettoyage si échec de création */
        unlink(disk_path);
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"failed to create disk image\"}");
    }

    /* Permissions : à adapter selon l’utilisateur qemu/libvirt sur ta machine */
    chmod(disk_path, 0644);

    /* ------------------------------------------------------------------
     * Construction du XML de domaine libvirt
     * ------------------------------------------------------------------ */
    char xml[12288];

    int r = snprintf(
        xml,
        sizeof(xml),
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
              "<source network='%s'/>"
            "</interface>"
            "<serial type='pty'><target port='0'/></serial>"
            "<console type='pty'><target type='serial' port='0'/></console>"
            "<graphics type='vnc' port='-1' autoport='yes' listen='0.0.0.0'/>"
            "<video><model type='cirrus' vram='9216' heads='1'/></video>"
            "<memballoon model='virtio'/>"
          "</devices>"
        "</domain>",
        vmName,      // %s
        memory,      // %d
        cpu,         // %d
        disk_path,   // %s
        iso_path,    // %s
        network_name // %s
    );

    if (r < 0 || (size_t)r >= sizeof(xml)) {
        /* Erreur de format / buffer trop petit */
        unlink(disk_path);
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"xml build failed\"}");
    }

    /* ------------------------------------------------------------------
     * Création du domaine libvirt
     * ------------------------------------------------------------------ */
    virDomainPtr dom = virDomainCreateXML(conn, xml, 0);

    cJSON *resp = cJSON_CreateObject();
    if (!resp) {
        unlink(disk_path);
        virConnectClose(conn);
        cJSON_Delete(root);
        return strdup("{\"success\":false,\"error\":\"internal json alloc error\"}");
    }

    if (!dom) {
        /* Échec création domaine -> on supprime le disque créé */
        unlink(disk_path);
        cJSON_AddBoolToObject(resp, "success", false);
        cJSON_AddStringToObject(resp, "error", "virDomainCreateXML failed");
    } else {
        cJSON_AddBoolToObject(resp, "success", true);
        cJSON_AddStringToObject(resp, "message", "VM created and started");

        char uuid_str[37];
        if (virDomainGetUUIDString(dom, uuid_str) == 0) {
            cJSON_AddStringToObject(resp, "uuid", uuid_str);
        }

        /* Nom du domaine (normalement = vmName, mais on le renvoie pour info) */
        const char *dom_name = virDomainGetName(dom);
        if (dom_name) {
            cJSON_AddStringToObject(resp, "domain_name", dom_name);
        }

        virDomainFree(dom);
    }

    virConnectClose(conn);
    cJSON_Delete(root);

    char *out = cJSON_PrintUnformatted(resp);
    cJSON_Delete(resp);

    return out;  /* à free() par l’appelant */
}
