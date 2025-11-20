// migratevm_handler.c
#include "migratevm_handler.h"
#include <libvirt/libvirt.h>
#include <libvirt/virterror.h>
#include <cjson/cJSON.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void log_libvirt_error(const char *prefix) {
    virErrorPtr err = virGetLastError();
    if (err) {
        fprintf(stderr, "[%s] Libvirt error: %s (code=%d domain=%d)\n",
                prefix, err->message, err->code, err->domain);
    } else {
        fprintf(stderr, "[%s] Unknown libvirt error\n", prefix);
    }
}

static char *make_json_error(const char *msg) {
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "status", "error");
    cJSON_AddStringToObject(root, "message", msg);
    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return out;
}

static char *make_json_ok(const char *vmName, const char *destUri) {
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "status", "ok");
    cJSON_AddStringToObject(root, "vmName", vmName);
    cJSON_AddStringToObject(root, "destUri", destUri);
    cJSON_AddStringToObject(root, "message", "Migration completed successfully");
    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return out;
}

/**
 * POST /migratevm
 * BODY JSON:
 * {
 *   "uri": "qemu:///system",             // source hypervisor (déjà utilisé partout)
 *   "vmName": "debian13",                // VM à migrer
 *   "destUri": "qemu+ssh://user@IP/system"  // hyperviseur de destination
 * }
 */
char *handle_migratevm(const char *post_data) {
    fprintf(stderr, "[handle_migratevm] BODY=%s\n", post_data ? post_data : "(null)");

    if (!post_data)
        return make_json_error("missing body");

    cJSON *root = cJSON_Parse(post_data);
    if (!root)
        return make_json_error("invalid JSON");

    cJSON *uri_item     = cJSON_GetObjectItem(root, "uri");
    cJSON *vm_item      = cJSON_GetObjectItem(root, "vmName");
    cJSON *dest_item    = cJSON_GetObjectItem(root, "destUri");

    if (!cJSON_IsString(uri_item) ||
        !cJSON_IsString(vm_item) ||
        !cJSON_IsString(dest_item)) {
        cJSON_Delete(root);
        return make_json_error("uri, vmName or destUri missing or invalid");
    }

    const char *srcUri  = uri_item->valuestring;
    const char *vmName  = vm_item->valuestring;
    const char *destUri = dest_item->valuestring;

    // Connexion source
    virConnectPtr src_conn = virConnectOpen(srcUri);
    if (!src_conn) {
        log_libvirt_error("virConnectOpen(src)");
        cJSON_Delete(root);
        return make_json_error("cannot connect to source hypervisor");
    }

    // Domaine sur la source
    virDomainPtr dom = virDomainLookupByName(src_conn, vmName);
    if (!dom) {
        log_libvirt_error("virDomainLookupByName");
        virConnectClose(src_conn);
        cJSON_Delete(root);
        return make_json_error("VM not found on source hypervisor");
    }

    // Connexion destination
    virConnectPtr dest_conn = virConnectOpen(destUri);
    if (!dest_conn) {
        log_libvirt_error("virConnectOpen(dest)");
        virDomainFree(dom);
        virConnectClose(src_conn);
        cJSON_Delete(root);
        return make_json_error("cannot connect to destination hypervisor");
    }

    // Flags de migration (live + persiste sur dest + undefine sur source).
    unsigned long flags = VIR_MIGRATE_LIVE |
                          VIR_MIGRATE_PERSIST_DEST |
                          VIR_MIGRATE_UNDEFINE_SOURCE;

    fprintf(stderr, "[migratevm] Migrating '%s' from '%s' to '%s' (flags=%lu)\n",
            vmName, srcUri, destUri, flags);

    virDomainPtr migrated_dom = virDomainMigrate(dom, dest_conn, flags,
                                                 NULL,  // dname (nom sur dest, NULL => même nom)
                                                 NULL,  // uri (transport), NULL => auto
                                                 0);    // bandwidth, 0 => default

    if (!migrated_dom) {
        log_libvirt_error("virDomainMigrate");
        virConnectClose(dest_conn);
        virDomainFree(dom);
        virConnectClose(src_conn);
        cJSON_Delete(root);
        return make_json_error("migration failed");
    }

    fprintf(stderr, "[migratevm] Migration of %s to %s successful\n", vmName, destUri);

    virDomainFree(migrated_dom);
    virDomainFree(dom);
    virConnectClose(dest_conn);
    virConnectClose(src_conn);
    cJSON_Delete(root);

    return make_json_ok(vmName, destUri);
}
