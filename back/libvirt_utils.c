#include "libvirt_utils.h"
#include <libvirt/libvirt.h>
#include <stdio.h>
#include <string.h>
    
void build_libvirt_uri(char *uri, size_t size,
                       const char *protocol,
                       const char *user,
                       const char *host,
                       int port,
                       const char *path)
{
    if (!protocol) protocol = "qemu+ssh";
    if (!path) path = "system";

    if (strcmp(protocol, "local") == 0 || strcmp(protocol, "qemu") == 0 || !host) {
        snprintf(uri, size, "qemu:///system");
        return;
    }

    if (user && host) {
        if (port > 0)
            snprintf(uri, size, "%s://%s@%s:%d/%s", protocol, user, host, port, path);
        else
            snprintf(uri, size, "%s://%s@%s/%s", protocol, user, host, path);
    } else {
        snprintf(uri, size, "%s://%s/%s", protocol, host, path);
    }
}

int test_libvirt_connection(const char *uri) {
    virConnectPtr conn = virConnectOpen(uri);
    if (!conn) {
        fprintf(stderr, "Failed to connect to hypervisor: %s\n", uri);
        return -1;
    }
    virConnectClose(conn);
    return 0;
}
