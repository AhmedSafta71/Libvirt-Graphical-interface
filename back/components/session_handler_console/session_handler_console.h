#ifndef SESSION_HANDLER_CONSOLE_H
#define SESSION_HANDLER_CONSOLE_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Handler consolevm
 * Prend en entrée une chaîne JSON (POST body)
 * Retourne une chaîne JSON allouée dynamiquement (à free() après usage)
 *
 * Exemple input:
 * {
 *   "uri": "qemu:///system",
 *   "vmName": "debian12"
 * }
 *
 * Exemple output:
 * {
 *   "status": "ok",
 *   "consoleType": "vnc",
 *   "port": "5901",
 *   "mode": "direct"
 * }
 */
char *handle_consolevm(const char *post_data);

#ifdef __cplusplus
}
#endif

#endif // SESSION_HANDLER_CONSOLE_H
