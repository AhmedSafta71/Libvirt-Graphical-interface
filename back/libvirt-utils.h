#ifndef LIBVIRT_UTILS_H
#define LIBVIRT_UTILS_H

#include <stddef.h>
#include <stdio.h>

void build_libvirt_uri(char *uri, size_t size,
                       const char *protocol,
                       const char *user,
                       const char *host,
                       int port,
                       const char *path);

int test_libvirt_connection(const char *uri);

/* Liste tous les VMs (actifs et inactifs) */
char *list_all_vms(const char *uri);




#endif

