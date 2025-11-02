#include <stdio.h>
#include <string.h>
#include <microhttpd.h>
#include "routes.h"
#include "libvirt_utils.h"

static int send_json_response(struct MHD_Connection *conn, const char *json) {
    struct MHD_Response *response = MHD_create_response_from_buffer(strlen(json), (void*)json, MHD_RESPMEM_PERSISTENT);
    MHD_add_response_header(response, "Content-Type", "application/json");
    int ret = MHD_queue_response(conn, MHD_HTTP_OK, response);
    MHD_destroy_response(response);
    return ret;
}

int route_handler(void *cls, struct MHD_Connection *connection,
                  const char *url, const char *method,
                  const char *version, const char *upload_data,
                  size_t *upload_data_size, void **con_cls) {

    if (strcmp(url, "/vms") == 0 && strcmp(method, "GET") == 0) {
        const char *json = get_all_vms_json();  // récupère la liste via libvirt_utils.c
        return send_json_response(connection, json);
    }

    if (strcmp(url, "/ping") == 0) {
        return send_json_response(connection, "{\"status\":\"ok\"}");
    }

    const char *not_found = "{\"error\":\"route inconnue\"}";
    return send_json_response(connection, not_found);
}
