#include "handler_connect.h"
#include "../../libvirt-utils.h"
#include <cjson/cJSON.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *handle_connect(const char *json_body)
{
    cJSON *root = cJSON_Parse(json_body);
    if (!root)
        return strdup("{\"success\":false,\"error\":\"invalid json\"}");

    const char *protocol = NULL, *user = NULL, *host = NULL, *path = NULL;
    int port = 0;

    cJSON *j;
#define GET(name) ((j = cJSON_GetObjectItemCaseSensitive(root, name)) && \
                   cJSON_IsString(j) ? j->valuestring : NULL)
    protocol = GET("protocol");
    user     = GET("user");
    host     = GET("host");
    path     = GET("path");
    if ((j = cJSON_GetObjectItemCaseSensitive(root, "port")) && cJSON_IsNumber(j))
        port = j->valueint;
#undef GET

    if (!protocol) protocol = "qemu";
    if (!path)     path     = "system";

    /* Build base URI */
    char uri[512];
    build_libvirt_uri(uri, sizeof(uri), protocol, user, host, port, path);

    /* Test the connection */
    int ok = test_libvirt_connection(uri);

    /* Build JSON response */
    cJSON *resp = cJSON_CreateObject();
    cJSON_AddStringToObject(resp, "uri", uri);
    cJSON_AddBoolToObject(resp, "success", ok == 0);
    cJSON_AddStringToObject(resp, "message",
                            ok == 0 ? "connected successfully"
                                    : "failed to connect to hypervisor");

    char *out = cJSON_PrintUnformatted(resp);
    cJSON_Delete(resp);
    cJSON_Delete(root);
    return out;  /* caller frees */
}
