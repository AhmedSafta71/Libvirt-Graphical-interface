// File: components/vm_actions_handler/vm_actions_handler.c

#include "vm_actions_handler.h"
#include "../../libvirt-utils.h"

#include <libvirt/libvirt.h>
#include <libvirt/virterror.h>  // virGetLastError
#include <cjson/cJSON.h>

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>             // sleep, unlink

/* --------------------------------------------------------------------------
 * Constantes
 * -------------------------------------------------------------------------- */

/* Même chemin que dans createVM.c pour les disques qcow2 */
static const char *NFS_BASE = "/mnt/vmstore";

/* --------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

static void log_libvirt_error(const char *context)
{
    virErrorPtr err = virGetLastError();
    if (err) {
        fprintf(stderr,
                "[%s] libvirt error (code=%d, domain=%d): %s\n",
                context, err->code, err->domain,
                err->message ? err->message : "(no message)");
    } else {
        fprintf(stderr,
                "[%s] libvirt error: (no details from virGetLastError)\n", context);
    }
}

static char *make_error_json(const char *msg)
{
    cJSON *root = cJSON_CreateObject();
    cJSON_AddBoolToObject(root, "success", 0);
    cJSON_AddStringToObject(root, "error", msg);
    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return out;
}

static char *make_ok_json(const char *vm_name, const char *action)
{
    cJSON *root = cJSON_CreateObject();
    cJSON_AddBoolToObject(root, "success", 1);
    if (vm_name) {
        cJSON_AddStringToObject(root, "vmName", vm_name);
    }
    if (action) {
        cJSON_AddStringToObject(root, "action", action);
    }
    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return out;
}

/**
 * Body JSON attendu côté frontend :
 *
 * {
 *   "uri": "qemu:///system",
 *   "vmName": "debian-13"
 * }
 *
 * Pour tous les handlers ci-dessous.
 */

/* --------------------------------------------------------------------------
 * handle_startvm
 * -------------------------------------------------------------------------- */

char *handle_startvm(const char *post_data)
{
    fprintf(stderr, "[handle_startvm] body: %s\n", post_data ? post_data : "(null)");

    if (!post_data) {
        return make_error_json("missing body");
    }

    cJSON *root = cJSON_Parse(post_data);
    if (!root) {
        fprintf(stderr, "[handle_startvm] invalid JSON\n");
        return make_error_json("invalid json");
    }

    cJSON *uri_item  = cJSON_GetObjectItem(root, "uri");
    cJSON *name_item = cJSON_GetObjectItem(root, "vmName");

    if (!cJSON_IsString(uri_item) || !cJSON_IsString(name_item)) {
        fprintf(stderr, "[handle_startvm] uri or vmName missing/not string\n");
        cJSON_Delete(root);
        return make_error_json("missing uri or vmName");
    }

    const char *uri     = uri_item->valuestring;
    const char *vm_name = name_item->valuestring;
    fprintf(stderr, "[handle_startvm] uri=%s, vmName=%s\n", uri, vm_name);

    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        fprintf(stderr, "[handle_startvm] cannot connect to hypervisor\n");
        log_libvirt_error("handle_startvm:virConnectOpen");
        cJSON_Delete(root);
        return make_error_json("cannot connect to hypervisor");
    }

    virDomainPtr dom = virDomainLookupByName(conn, vm_name);
    if (!dom) {
        fprintf(stderr, "[handle_startvm] domain not found: %s\n", vm_name);
        log_libvirt_error("handle_startvm:virDomainLookupByName");
        virConnectClose(conn);
        cJSON_Delete(root);
        return make_error_json("domain not found");
    }

    int state = -1, reason = -1;
    if (virDomainGetState(dom, &state, &reason, 0) == 0) {
        fprintf(stderr, "[handle_startvm] current state=%d, reason=%d\n", state, reason);
        if (state == VIR_DOMAIN_RUNNING || state == VIR_DOMAIN_BLOCKED) {
            fprintf(stderr, "[handle_startvm] domain already running\n");
            virDomainFree(dom);
            virConnectClose(conn);
            cJSON_Delete(root);
            return make_ok_json(vm_name, "already-running");
        }
    } else {
        fprintf(stderr, "[handle_startvm] virDomainGetState failed\n");
        log_libvirt_error("handle_startvm:virDomainGetState");
    }

    if (virDomainCreate(dom) < 0) {
        fprintf(stderr, "[handle_startvm] virDomainCreate failed\n");
        log_libvirt_error("handle_startvm:virDomainCreate");
        virDomainFree(dom);
        virConnectClose(conn);
        cJSON_Delete(root);
        return make_error_json("failed to start domain");
    }

    fprintf(stderr, "[handle_startvm] domain started successfully\n");
    virDomainFree(dom);
    virConnectClose(conn);
    cJSON_Delete(root);
    return make_ok_json(vm_name, "start");
}

/* --------------------------------------------------------------------------
 * handle_stopvm  (power off brutal = destroy)
 * -------------------------------------------------------------------------- */

char *handle_stopvm(const char *post_data)
{
    fprintf(stderr, "[handle_stopvm] body: %s\n", post_data ? post_data : "(null)");

    if (!post_data) {
        return make_error_json("missing body");
    }

    cJSON *root = cJSON_Parse(post_data);
    if (!root) {
        fprintf(stderr, "[handle_stopvm] invalid JSON\n");
        return make_error_json("invalid json");
    }

    cJSON *uri_item  = cJSON_GetObjectItem(root, "uri");
    cJSON *name_item = cJSON_GetObjectItem(root, "vmName");

    if (!cJSON_IsString(uri_item) || !cJSON_IsString(name_item)) {
        fprintf(stderr, "[handle_stopvm] uri or vmName missing/not string\n");
        cJSON_Delete(root);
        return make_error_json("missing uri or vmName");
    }

    const char *uri     = uri_item->valuestring;
    const char *vm_name = name_item->valuestring;
    fprintf(stderr, "[handle_stopvm] uri=%s, vmName=%s\n", uri, vm_name);

    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        fprintf(stderr, "[handle_stopvm] cannot connect to hypervisor\n");
        log_libvirt_error("handle_stopvm:virConnectOpen");
        cJSON_Delete(root);
        return make_error_json("cannot connect to hypervisor");
    }

    virDomainPtr dom = virDomainLookupByName(conn, vm_name);
    if (!dom) {
        fprintf(stderr, "[handle_stopvm] domain not found: %s\n", vm_name);
        log_libvirt_error("handle_stopvm:virDomainLookupByName");
        virConnectClose(conn);
        cJSON_Delete(root);
        return make_error_json("domain not found");
    }

    int state_before = -1, reason_before = -1;
    if (virDomainGetState(dom, &state_before, &reason_before, 0) == 0) {
        fprintf(stderr, "[handle_stopvm] state BEFORE destroy: %d (reason=%d)\n",
                state_before, reason_before);
    } else {
        fprintf(stderr, "[handle_stopvm] virDomainGetState BEFORE failed\n");
        log_libvirt_error("handle_stopvm:virDomainGetState(before)");
    }

    // Arrêt brutal (power off)
    if (virDomainDestroy(dom) < 0) {
        fprintf(stderr, "[handle_stopvm] virDomainDestroy failed\n");
        log_libvirt_error("handle_stopvm:virDomainDestroy");
        virDomainFree(dom);
        virConnectClose(conn);
        cJSON_Delete(root);
        return make_error_json("failed to destroy domain");
    }

    fprintf(stderr, "[handle_stopvm] destroy sent successfully\n");
    virDomainFree(dom);
    virConnectClose(conn);
    cJSON_Delete(root);
    return make_ok_json(vm_name, "stop");
}

/* --------------------------------------------------------------------------
 * handle_shutdownvm  (shutdown propre SANS destroy forcé)
 * -------------------------------------------------------------------------- */

char *handle_shutdownvm(const char *post_data)
{
    fprintf(stderr, "[handle_shutdownvm] body: %s\n", post_data ? post_data : "(null)");

    if (!post_data) {
        return make_error_json("missing body");
    }

    cJSON *root = cJSON_Parse(post_data);
    if (!root) {
        fprintf(stderr, "[handle_shutdownvm] invalid JSON\n");
        return make_error_json("invalid json");
    }

    cJSON *uri_item  = cJSON_GetObjectItem(root, "uri");
    cJSON *name_item = cJSON_GetObjectItem(root, "vmName");

    if (!cJSON_IsString(uri_item) || !cJSON_IsString(name_item)) {
        fprintf(stderr, "[handle_shutdownvm] uri or vmName missing/not string\n");
        cJSON_Delete(root);
        return make_error_json("missing uri or vmName");
    }

    const char *uri     = uri_item->valuestring;
    const char *vm_name = name_item->valuestring;
    fprintf(stderr, "[handle_shutdownvm] uri=%s, vmName=%s\n", uri, vm_name);

    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        fprintf(stderr, "[handle_shutdownvm] cannot connect to hypervisor\n");
        log_libvirt_error("handle_shutdownvm:virConnectOpen");
        cJSON_Delete(root);
        return make_error_json("cannot connect to hypervisor");
    }

    virDomainPtr dom = virDomainLookupByName(conn, vm_name);
    if (!dom) {
        fprintf(stderr, "[handle_shutdownvm] domain not found: %s\n", vm_name);
        log_libvirt_error("handle_shutdownvm:virDomainLookupByName");
        virConnectClose(conn);
        cJSON_Delete(root);
        return make_error_json("domain not found");
    }

    int state_before = -1, reason_before = -1;
    if (virDomainGetState(dom, &state_before, &reason_before, 0) == 0) {
        fprintf(stderr, "[handle_shutdownvm] state BEFORE shutdown: %d (reason=%d)\n",
                state_before, reason_before);

        // Déjà éteinte → rien à faire
        if (state_before == VIR_DOMAIN_SHUTOFF ||
            state_before == VIR_DOMAIN_CRASHED ||
            state_before == VIR_DOMAIN_PMSUSPENDED) {
            fprintf(stderr, "[handle_shutdownvm] domain already not running\n");
            virDomainFree(dom);
            virConnectClose(conn);
            cJSON_Delete(root);
            return make_ok_json(vm_name, "already-shutoff");
        }
    } else {
        fprintf(stderr, "[handle_shutdownvm] virDomainGetState BEFORE failed\n");
        log_libvirt_error("handle_shutdownvm:virDomainGetState(before)");
    }

    // 1) Tentative d'arrêt propre (ACPI)
    if (virDomainShutdown(dom) < 0) {
        fprintf(stderr, "[handle_shutdownvm] virDomainShutdown failed\n");
        log_libvirt_error("handle_shutdownvm:virDomainShutdown");
        virDomainFree(dom);
        virConnectClose(conn);
        cJSON_Delete(root);
        return make_error_json("failed to shutdown domain");
    }

    fprintf(stderr,
            "[handle_shutdownvm] ACPI shutdown signal sent, waiting a bit...\n");

    // 2) On attend quelques secondes (5s par ex.)
    int final_state  = state_before;
    int final_reason = reason_before;

    for (int i = 0; i < 5; ++i) { // 5 * 1s = 5 secondes
        sleep(1);
        if (virDomainGetState(dom, &final_state, &final_reason, 0) < 0) {
            log_libvirt_error("handle_shutdownvm:virDomainGetState(loop)");
            break;
        }

        fprintf(stderr, "[handle_shutdownvm] loop %d, state=%d, reason=%d\n",
                i + 1, final_state, final_reason);

        if (final_state == VIR_DOMAIN_SHUTOFF ||
            final_state == VIR_DOMAIN_CRASHED ||
            final_state == VIR_DOMAIN_PMSUSPENDED) {
            fprintf(stderr, "[handle_shutdownvm] domain is now stopped (state=%d)\n",
                    final_state);
            virDomainFree(dom);
            virConnectClose(conn);
            cJSON_Delete(root);
            return make_ok_json(vm_name, "shutdown");
        }
    }

    // 3) Si on arrive ici, la VM n'a pas voulu s'éteindre, mais on NE FORCE PAS
    fprintf(stderr,
            "[handle_shutdownvm] domain still running after timeout, NOT forcing destroy.\n");

    virDomainFree(dom);
    virConnectClose(conn);
    cJSON_Delete(root);

    // On indique seulement que le shutdown est demandé mais pas terminé
    return make_ok_json(vm_name, "shutdown-timeout");
}

/* --------------------------------------------------------------------------
 * handle_deletevm  (stop + undefine + delete disk)
 * -------------------------------------------------------------------------- */

char *handle_deletevm(const char *post_data)
{
    fprintf(stderr, "[handle_deletevm] body: %s\n", post_data ? post_data : "(null)");

    if (!post_data) {
        return make_error_json("missing body");
    }

    cJSON *root = cJSON_Parse(post_data);
    if (!root) {
        fprintf(stderr, "[handle_deletevm] invalid JSON\n");
        return make_error_json("invalid json");
    }

    cJSON *uri_item  = cJSON_GetObjectItem(root, "uri");
    cJSON *name_item = cJSON_GetObjectItem(root, "vmName");

    if (!cJSON_IsString(uri_item) || !cJSON_IsString(name_item)) {
        fprintf(stderr, "[handle_deletevm] uri or vmName missing/not string\n");
        cJSON_Delete(root);
        return make_error_json("missing uri or vmName");
    }

    const char *uri     = uri_item->valuestring;
    const char *vm_name = name_item->valuestring;
    fprintf(stderr, "[handle_deletevm] uri=%s, vmName=%s\n", uri, vm_name);

    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        fprintf(stderr, "[handle_deletevm] cannot connect to hypervisor\n");
        log_libvirt_error("handle_deletevm:virConnectOpen");
        cJSON_Delete(root);
        return make_error_json("cannot connect to hypervisor");
    }

    virDomainPtr dom = virDomainLookupByName(conn, vm_name);
    if (dom) {
        int state = -1, reason = -1;
        if (virDomainGetState(dom, &state, &reason, 0) == 0) {
            fprintf(stderr, "[handle_deletevm] current state=%d, reason=%d\n",
                    state, reason);

            // Si la VM tourne, on la stoppe brutalement
            if (state == VIR_DOMAIN_RUNNING ||
                state == VIR_DOMAIN_BLOCKED ||
                state == VIR_DOMAIN_PAUSED) {
                fprintf(stderr, "[handle_deletevm] domain is running, destroying...\n");
                if (virDomainDestroy(dom) < 0) {
                    fprintf(stderr, "[handle_deletevm] virDomainDestroy failed\n");
                    log_libvirt_error("handle_deletevm:virDomainDestroy");
                    virDomainFree(dom);
                    virConnectClose(conn);
                    cJSON_Delete(root);
                    return make_error_json("failed to destroy running domain");
                }
            }
        } else {
            fprintf(stderr, "[handle_deletevm] virDomainGetState failed\n");
            log_libvirt_error("handle_deletevm:virDomainGetState");
        }

        // Undefine (supprime la définition libvirt)
        fprintf(stderr, "[handle_deletevm] undefining domain...\n");
        if (virDomainUndefine(dom) < 0) {
            fprintf(stderr, "[handle_deletevm] virDomainUndefine failed\n");
            log_libvirt_error("handle_deletevm:virDomainUndefine");
            // On continue quand même pour tenter de supprimer le disque
        }

        virDomainFree(dom);
    } else {
        fprintf(stderr, "[handle_deletevm] domain not found in libvirt, continue to disk removal.\n");
        log_libvirt_error("handle_deletevm:virDomainLookupByName");
    }

    // Suppression du disque qcow2 supposé être NFS_BASE/vmName.qcow2
    char disk_path[1024];
    snprintf(disk_path, sizeof(disk_path), "%s/%s.qcow2", NFS_BASE, vm_name);
    fprintf(stderr, "[handle_deletevm] trying to remove disk file: %s\n", disk_path);

    if (unlink(disk_path) != 0) {
        perror("[handle_deletevm] unlink(disk_path) failed");
        // On log seulement, on peut quand même considérer que la VM est supprimée de libvirt
    }

    virConnectClose(conn);
    cJSON_Delete(root);

    return make_ok_json(vm_name, "deleted");
}
