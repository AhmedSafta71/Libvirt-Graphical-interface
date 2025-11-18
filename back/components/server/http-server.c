#include "http-server.h"
#include "../connect_handler/handler_connect.h"
#include "../createVM/createVM.h"
#include "../displayVms_handler/displayvms_handler.h"
#include "../vm_actions_handler/vm_actions_handler.h"   
#include "../session_handler_console/session_handler_console.h"         // <-- AJOUT POUR handle_consolevm()
#include <microhttpd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define POSTBUFFERSIZE 512*1024

struct connection_info_struct {
    char *post_data;
    size_t post_size;
};

/**
 * Envoie une réponse JSON avec CORS
 */
static int send_json(struct MHD_Connection *connection, const char *json, int status_code) {
    struct MHD_Response *response = MHD_create_response_from_buffer(
        strlen(json), (void *)json, MHD_RESPMEM_MUST_COPY);

    if (!response) return MHD_NO;

    // Headers CORS
    MHD_add_response_header(response, "Content-Type", "application/json");
    MHD_add_response_header(response, "Access-Control-Allow-Origin", "*");
    MHD_add_response_header(response, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    MHD_add_response_header(response, "Access-Control-Allow-Headers", "Content-Type, Authorization");
    MHD_add_response_header(response, "Access-Control-Max-Age", "86400");

    int ret = MHD_queue_response(connection, status_code, response);
    MHD_destroy_response(response);
    return ret;
}

/**
 * Handler principal HTTP
 */
static enum MHD_Result answer_to_connection(void *cls, struct MHD_Connection *connection,
                                            const char *url, const char *method,
                                            const char *version, const char *upload_data,
                                            size_t *upload_data_size, void **con_cls) {

    // OPTIONS (CORS preflight)
    if (strcmp(method, "OPTIONS") == 0) {
        struct MHD_Response *resp = MHD_create_response_from_buffer(0, "", MHD_RESPMEM_PERSISTENT);
        MHD_add_response_header(resp, "Access-Control-Allow-Origin", "*");
        MHD_add_response_header(resp, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        MHD_add_response_header(resp, "Access-Control-Allow-Headers", "Content-Type, Authorization");
        MHD_add_response_header(resp, "Access-Control-Max-Age", "86400");
        int ret = MHD_queue_response(connection, MHD_HTTP_OK, resp);
        MHD_destroy_response(resp);
        return ret;
    }

    // ⬅ Initialisation
    if (*con_cls == NULL) {
        struct connection_info_struct *con_info = malloc(sizeof(struct connection_info_struct));
        con_info->post_data = NULL;
        con_info->post_size = 0;
        *con_cls = con_info;
        return MHD_YES;
    }

    struct connection_info_struct *con_info = *con_cls;

    // Accumulation des données POST
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

    //
    // ------ ROUTING ------
    //
    if (strcmp(method, "POST") == 0) {

        if (strcmp(url, "/connect") == 0) {
            response_json = handle_connect(con_info->post_data);

        } else if (strcmp(url, "/listallvms") == 0) {
            response_json = handle_listallvms(con_info->post_data);

        } else if (strcmp(url, "/createvm") == 0) {
            response_json = handle_create_vm(con_info->post_data);

        } else if (strcmp(url, "/startvm") == 0) {
            response_json = handle_startvm(con_info->post_data);

        } else if (strcmp(url, "/stopvm") == 0) {
            response_json = handle_stopvm(con_info->post_data);

        } else if (strcmp(url, "/shutdownvm") == 0) {
            response_json = handle_shutdownvm(con_info->post_data);

        } else if (strcmp(url, "/deletevm") == 0) {
            response_json = handle_deletevm(con_info->post_data);

        } else if (strcmp(url, "/consolevm") == 0) {    
            response_json = handle_consolevm(con_info->post_data);

        } else {
            response_json = strdup("{\"error\":\"not found\"}");
        }

    } else {
        response_json = strdup("{\"error\":\"method not allowed\"}");
    }

    //
    // ------ RÉPONSE ------
    //
    int ret = send_json(connection, response_json, MHD_HTTP_OK);

    free(response_json);
    free(con_info->post_data);
    free(con_info);
    *con_cls = NULL;

    return ret;
}

/**
 * Démarrage du serveur HTTP
 */
int start_http_server(int port) {
    struct MHD_Daemon *daemon = MHD_start_daemon(
        MHD_USE_SELECT_INTERNALLY | MHD_USE_POLL,
        port,
        NULL, NULL,
        &answer_to_connection, NULL,
        MHD_OPTION_END);

    if (!daemon) return 1;

    printf("HTTP server running on http://0.0.0.0:%d\n", port);
    printf("Routes: POST /connect, /listallvms, /createvm, /startvm, /stopvm, /shutdownvm, /deletevm, /consolevm\n");

    getchar();
    MHD_stop_daemon(daemon);
    return 0;
}
