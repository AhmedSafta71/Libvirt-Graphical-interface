// components/displayVms_handler/vm_actions_handler.h
#ifndef VM_ACTIONS_HANDLER_H
#define VM_ACTIONS_HANDLER_H

char *handle_startvm(const char *post_data);
char *handle_stopvm(const char *post_data);
char *handle_shutdownvm(const char *post_data);
char *handle_deletevm(const char *post_data);

#endif