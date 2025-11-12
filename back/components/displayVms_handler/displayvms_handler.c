#include "displayvms_handler.h"
#include "../../libvirt-utils.h"
#include <libvirt/libvirt.h>
#include <cjson/cJSON.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>





char *get_all_vms_json(const char *uri)
{
    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        return strdup("{\"success\":false,\"error\":\"cannot connect to hypervisor\"}");
    }

    cJSON *root = cJSON_CreateArray();

    /* ----- VMs actifs ----- */
    int num_active = virConnectNumOfDomains(conn);
    if (num_active > 0) {
        int *active_ids = malloc(sizeof(int) * num_active);
        virConnectListDomains(conn, active_ids, num_active);

        for (int i = 0; i < num_active; i++) {
            virDomainPtr dom = virDomainLookupByID(conn, active_ids[i]);
            if (dom) {
                const char *name = virDomainGetName(dom);
                cJSON *obj = cJSON_CreateObject();
                cJSON_AddStringToObject(obj, "name", name);
                cJSON_AddBoolToObject(obj, "active", 1);
                cJSON_AddItemToArray(root, obj);
                virDomainFree(dom);
            }
        }
        free(active_ids);
    }

    /* ----- VMs inactifs ----- */
    int num_inactive = virConnectNumOfDefinedDomains(conn);
    if (num_inactive > 0) {
        char **names = malloc(sizeof(char *) * num_inactive);
        virConnectListDefinedDomains(conn, names, num_inactive);

        for (int i = 0; i < num_inactive; i++) {
            cJSON *obj = cJSON_CreateObject();
            cJSON_AddStringToObject(obj, "name", names[i]);
            cJSON_AddBoolToObject(obj, "active", 0);
            cJSON_AddItemToArray(root, obj);
            free(names[i]);
        }
        free(names);
    }

    virConnectClose(conn);

    char *json_str = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return json_str;
}
