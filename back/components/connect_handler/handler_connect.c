#include "handler_connect.h"
#include "../../libvirt-utils.h"
#include <cjson/cJSON.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char* handle_connect(const char *json_body) {
    cJSON *root = cJSON_Parse(json_body);
    if (!root) {
        return strdup("{\"success\":false,\"error\":\"invalid json\"}");
    }

    const char *protocol = NULL, *user = NULL, *host = NULL, *path = NULL;
    int port = 0;

    cJSON *jprotocol = cJSON_GetObjectItemCaseSensitive(root, "protocol");
    cJSON *juser = cJSON_GetObjectItemCaseSensitive(root, "user");
    cJSON *jhost = cJSON_GetObjectItemCaseSensitive(root, "host");
    cJSON *jport = cJSON_GetObjectItemCaseSensitive(root, "port");
    cJSON *jpath = cJSON_GetObjectItemCaseSensitive(root, "path");

    if (cJSON_IsString(jprotocol)) protocol = jprotocol->valuestring;
    if (cJSON_IsString(juser)) user = juser->valuestring;
    if (cJSON_IsString(jhost)) host = jhost->valuestring;
    if (cJSON_IsNumber(jport)) port = jport->valueint;
    if (cJSON_IsString(jpath)) path = jpath->valuestring;

    if (!protocol) protocol = "qemu+ssh";
    if (!path) path = "system";

    char uri[512];
    build_libvirt_uri(uri, sizeof(uri), protocol, user, host, port, path);

    int ok = test_libvirt_connection(uri);

    cJSON *resp = cJSON_CreateObject();
    cJSON_AddStringToObject(resp, "uri", uri);
    cJSON_AddBoolToObject(resp, "success", ok == 0);
    if (ok == 0)
        cJSON_AddStringToObject(resp, "message", "connected successfully");
    else
        cJSON_AddStringToObject(resp, "message", "failed to connect to hypervisor");

    char *out = cJSON_PrintUnformatted(resp);
    cJSON_Delete(resp);
    cJSON_Delete(root);
    return out; // caller frees
}
