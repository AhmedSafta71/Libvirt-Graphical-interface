#include <stdio.h>
#include <stdlib.h>
#include <libvirt/libvirt.h>
#include <libvirt/virterror.h>
#include <string.h>
#include "libvirt_utils.h"

const char* get_all_vms_json() {
    static char buffer[2048];
    buffer[0] = '\0';

    virConnectPtr conn = virConnectOpen("qemu:///system");
    if (!conn) {
        snprintf(buffer, sizeof(buffer), "{\"error\":\"impossible de se connecter à libvirt\"}");
        return buffer;
    }

    int numDomains = virConnectNumOfDomains(conn);
    int *activeDomains = malloc(sizeof(int) * numDomains);
    virConnectListDomains(conn, activeDomains, numDomains);

    strcat(buffer, "[");
    for (int i = 0; i < numDomains; i++) {
        virDomainPtr dom = virDomainLookupByID(conn, activeDomains[i]);
        const char *name = virDomainGetName(dom);
        char entry[256];
        snprintf(entry, sizeof(entry),
                 "{\"name\":\"%s\",\"state\":\"running\"}%s",
                 name, (i == numDomains - 1 ? "" : ","));
        strcat(buffer, entry);
        virDomainFree(dom);
    }
    strcat(buffer, "]");

    free(activeDomains);
    virConnectClose(conn);
    return buffer;
}
