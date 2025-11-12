#include "http-server.h"
#include "../connect_handler/handler_connect.h"
#include <microhttpd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define POSTBUFFERSIZE 512*1024

struct connection_info_struct {
    char *post_data;
    size_t post_size;
};

static int send_json(struct MHD_Connection *connection, const char *json, int status_code) {
    struct MHD_Response *response;
    int ret;
    response = MHD_create_response_from_buffer(strlen(json), (void *)json, MHD_RESPMEM_MUST_COPY);
    if (!response) return MHD_NO;
    MHD_add_response_header(response, "Content-Type", "application/json");
    MHD_add_response_header(response, "Access-Control-Allow-Origin", "*");
    ret = MHD_queue_response(connection, status_code, response);
    MHD_destroy_response(response);
    return ret;
}

static enum MHD_Result answer_to_connection(void *cls, struct MHD_Connection *connection,
                                const char *url, const char *method,
                                const char *version, const char *upload_data,
                                size_t *upload_data_size, void **con_cls) {
    if (*con_cls == NULL) {
        struct connection_info_struct *con_info = malloc(sizeof(struct connection_info_struct));
        con_info->post_data = NULL;
        con_info->post_size = 0;
        *con_cls = con_info;
        return MHD_YES;
    }

    struct connection_info_struct *con_info = *con_cls;

    if (*upload_data_size != 0) {
        size_t s = *upload_data_size;
        con_info->post_data = realloc(con_info->post_data, con_info->post_size + s + 1);
        memcpy(con_info->post_data + con_info->post_size, upload_data, s);
        con_info->post_size += s;
        con_info->post_data[con_info->post_size] = '\0';
        *upload_data_size = 0;
        return MHD_YES;
    }

    char *response_json = NULL;

    if (strcmp(method, "POST") == 0) {
        if (strcmp(url, "/connect") == 0) {
            response_json = handle_connect(con_info->post_data);
        } else if (strcmp(url, "/listallvms") == 0) {
            response_json = handle_listallvms(con_info->post_data);  // ✅ on ajoute cette fonction
        } else {
            response_json = strdup("{\"error\":\"not found\"}");
        }
    } else {
        response_json = strdup("{\"error\":\"method not allowed\"}");
    }

    int ret = send_json(connection, response_json, MHD_HTTP_OK);
    free(response_json);
    free(con_info->post_data);
    free(con_info);
    *con_cls = NULL;
    return ret;
}

int start_http_server(int port) {
    struct MHD_Daemon *daemon = MHD_start_daemon(
        MHD_USE_SELECT_INTERNALLY | MHD_USE_POLL,
        port,
        NULL, NULL,
        &answer_to_connection, NULL,
        MHD_OPTION_END);

    if (!daemon) return 1;

    printf("HTTP server running on http://0.0.0.0:%d\n", port);
    printf("Available routes: POST /connect, POST /listallvms\n");
    getchar();
    MHD_stop_daemon(daemon);
    return 0;
}
