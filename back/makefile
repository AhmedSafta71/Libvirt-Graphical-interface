CC = gcc
CFLAGS = -Wall -I. -I./components/server -I./components/connect_handler -I./components/displayVms_handler -I./components/createVM -I./components/vm_actions_handler -I./components/session_handler_console -I./components/migratevm_handler
LIBS = -lmicrohttpd -lvirt -lcjson
LIBS = -lmicrohttpd -lvirt -lcjson
 
SRC = main.c \
      components/server/http-server.c \
      components/connect_handler/handler_connect.c \
      libvirt-utils.c \
	  components/displayVms_handler/displayvms_handler.c \
	  components/createVM/createVM.c \
	  components/vm_actions_handler/vm_actions_handler.c \
	  components/session_handler_console/session_handler_console.c \
	  components/migratevm_handler/migratevm_handler.c

LIBS = -lmicrohttpd -lvirt -lcjson

	
OUT = backend

all:
	$(CC) $(SRC) -o $(OUT) $(CFLAGS) $(LIBS)
run: all
	./$(OUT)

clean:
	rm -f $(OUT)