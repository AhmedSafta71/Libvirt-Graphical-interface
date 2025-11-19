// session_handler_console.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libvirt/libvirt.h>
#include <libvirt/virterror.h>
#include <cjson/cJSON.h>
#include <unistd.h>

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

static char *make_json_console(const char *vmName, int wsPort) {
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "status", "ok");
    cJSON_AddStringToObject(root, "vmName", vmName);
    cJSON_AddNumberToObject(root, "websocketPort", wsPort);
    cJSON_AddNumberToObject(root, "port", wsPort);
    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return out;
}

// Choose free port for websocket (novnc)
int get_free_port() {
    for (int p = 6900; p < 7000; p++) {
        char cmd[256];
        snprintf(cmd, sizeof(cmd), "ss -ltn | grep -q ':%d'", p);
        if (system(cmd) != 0) return p;
    }
    return -1;
}

char *handle_consolevm(const char *post_data) {
    fprintf(stderr, "[handle_consolevm] BODY=%s\n", post_data);
    if (!post_data)
        return make_json_error("missing body");

    // parse JSON
    cJSON *root = cJSON_Parse(post_data);
    if (!root) return make_json_error("invalid JSON");

    cJSON *uri_item = cJSON_GetObjectItem(root, "uri");
    cJSON *vm_item  = cJSON_GetObjectItem(root, "vmName");

    if (!cJSON_IsString(uri_item) || !cJSON_IsString(vm_item)) {
        cJSON_Delete(root);
        return make_json_error("uri or vmName missing");
    }

    char uri[256];
    char vmName[256];
    snprintf(uri, sizeof(uri), "%s", uri_item->valuestring);
    snprintf(vmName, sizeof(vmName), "%s", vm_item->valuestring);

    cJSON_Delete(root);

    // connect hypervisor
    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        log_libvirt_error("virConnectOpen");
        return make_json_error("cannot connect hypervisor");
    }

    virDomainPtr dom = virDomainLookupByName(conn, vmName);
    if (!dom) {
        log_libvirt_error("virDomainLookupByName");
        virConnectClose(conn);
        return make_json_error("domain not found");
    }

    char *xml = virDomainGetXMLDesc(dom, 0);
    if (!xml) {
        log_libvirt_error("virDomainGetXMLDesc");
        virDomainFree(dom);
        virConnectClose(conn);
        return make_json_error("cannot get domain XML");
    }

    // 🔥 look for the RIGHT <graphics type='vnc' ...> block
    char *gfx = strstr(xml, "<graphics type='vnc'");
    if (!gfx) gfx = strstr(xml, "<graphics type=\"vnc\"");
    if (!gfx) {
        free(xml);
        virDomainFree(dom);
        virConnectClose(conn);
        return make_json_error("VM has no VNC graphics");
    }

    char *portPtr = strstr(gfx, "port='");
    if (!portPtr) portPtr = strstr(gfx, "port=\"");
    if (!portPtr) {
        free(xml);
        virDomainFree(dom);
        virConnectClose(conn);
        return make_json_error("cannot find VNC port attribute");
    }

    portPtr += 6;
    int vncPort = atoi(portPtr);
    fprintf(stderr, "[consolevm] Extracted VNC port=%d\n", vncPort);

    // ❗ IF port is -1 or 0, libvirt is in autoport mode
    // In this case, FORCE a static port (e.g. 5901)
    if (vncPort <= 0) {
        fprintf(stderr, "[consolevm] WARNING: autoport mode detected, forcing static port 5901\n");
        vncPort = 5901;
    }

    free(xml);
    virDomainFree(dom);
    virConnectClose(conn);

    int wsPort = get_free_port();
    if (wsPort < 0) return make_json_error("no free port for noVNC");

    char cmd[512];
    snprintf(cmd, sizeof(cmd),
        "nohup /home/user/noVNC/utils/novnc_proxy "
        "--vnc 127.0.0.1:%d "
        "--listen %d "
        "--web /home/user/noVNC "
        "--cert /home/user/noVNC/certs/novnc-self.pem "
        "--ssl-only "
        ">/dev/null 2>&1 &",
        vncPort, wsPort);

    fprintf(stderr, "[consolevm] Launching: %s\n", cmd);
    system(cmd);

    fprintf(stderr, "[noVNC] HTTPS WebSocket proxy started on %d for VM %s\n",
            wsPort, vmName);

    return make_json_console(vmName, wsPort);
}
