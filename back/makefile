CC=gcc
CFLAGS=-Wall
LIBS=-lmicrohttpd -lvirt

SRC=main.c routes.c libvirt_utils.c
OUT=backend

all:
	$(CC) $(SRC) -o $(OUT) $(CFLAGS) $(LIBS)

clean:
	rm -f $(OUT)
