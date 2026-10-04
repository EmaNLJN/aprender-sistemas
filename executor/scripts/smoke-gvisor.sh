#!/bin/sh
# Prueba de humo de gVisor. La corre el usuario después de instalar runsc
# (`sudo runsc install` y `sudo systemctl reload docker`). Verifica que el runtime responde y
# que, con el driver de cgroups systemd, se aplican la memoria, los procesos y la red apagada.
set -u
image=alpine:3.24
fail=0
check() { if [ "$1" -eq 0 ]; then echo "ok   $2"; else echo "FALLO $2"; fail=1; fi; }

docker run --rm --runtime=runsc "$image" dmesg 2>/dev/null | grep -qi gvisor
check $? "el contenedor corre dentro de gVisor"

docker run --rm --runtime=runsc --memory 64m --memory-swap 64m "$image" \
  sh -c 'head -c 512m /dev/zero | tail' >/dev/null 2>&1
[ $? -ne 0 ]; check $? "el límite de memoria detiene a un proceso que pide 512 MiB"

docker run --rm --runtime=runsc --pids-limit 16 "$image" \
  sh -c 'for i in $(seq 1 64); do sleep 5 & done; wait' >/dev/null 2>&1
[ $? -ne 0 ]; check $? "el límite de procesos impide lanzar 64 procesos con --pids-limit 16"

docker run --rm --runtime=runsc --network none "$image" \
  sh -c 'wget -q -T 3 -O /dev/null http://1.1.1.1' >/dev/null 2>&1
[ $? -ne 0 ]; check $? "sin red con --network none"

exit $fail
