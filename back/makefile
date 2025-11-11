CC = gcc
CFLAGS = -Wall -I. -I./components/server -I./components/connect_handler
LIBS = -lmicrohttpd -lvirt -lcjson
 
SRC = main.c \
      components/server/http-server.c \
      components/connect_handler/handler_connect.c \
      libvirt-utils.c

OUT = backend

all:
	$(CC) $(SRC) -o $(OUT) $(CFLAGS) $(LIBS)
run: all
	./$(OUT)

clean:
	rm -f $(OUT)