#!/bin/sh
# Prueba de humo de gVisor. La corre el usuario después de instalar runsc (el paquete apt lo
# registra en Docker), agregarle `--network=none` con `sudo runsc install -- --network=none` y
# recargar Docker (`sudo systemctl reload docker`). Verifica la configuración que pide el ADR
# 0005 y que, con el driver de cgroups systemd, se aplican la memoria, los procesos y la red.
# Cada chequeo exige que el sandbox haya arrancado: un sandbox que no arranca no prueba nada.
set -u
image=alpine:3.24
fail=0
check() { if [ "$1" -eq 0 ]; then echo "ok   $2"; else echo "FALLO $2"; fail=1; fi; }
run() { docker run --rm --pull=never --runtime=runsc "$@"; }

runtime=$(docker info --format '{{json .Runtimes.runsc}}' 2>/dev/null)
echo "$runtime" | grep -q '"path"'
check $? "Docker tiene registrado el runtime runsc"
echo "$runtime" | grep -q -- '--network=none'
check $? "runsc corre con --network=none (defensa en profundidad del ADR 0005)"

run "$image" dmesg 2>/dev/null | grep -qi gvisor
check $? "el contenedor corre dentro de gVisor"

out=$(run --memory 64m --memory-swap 64m "$image" sh -c 'echo arrancó; head -c 512m /dev/zero | tail' 2>&1)
rc=$?
echo "$out" | grep -q arrancó && [ "$rc" -eq 137 ]
check $? "el límite de memoria mata a un proceso que pide 512 MiB (exit 137)"

# --pids-limit cuenta los hilos del host del sandbox (sentry y gofer): con menos de unos 20 el
# sandbox ni arranca, y al excederlo gVisor mata el sandbox entero o fallan los fork. Se prueba
# con el límite real de la ejecución (64).
out=$(run --pids-limit 64 "$image" sh -c 'echo arrancó; for i in $(seq 1 200); do sleep 3 & done; wait; echo terminó' 2>&1)
echo "$out" | grep -q arrancó && { ! echo "$out" | grep -q terminó || echo "$out" | grep -q "can't fork"; }
check $? "con --pids-limit 64 arranca, y una bomba de 200 procesos queda contenida"

# Sin --network none de Docker: si el sandbox igual ve sólo loopback, el --network=none de runsc
# está activo.
out=$(run "$image" sh -c 'echo arrancó; tail -n +3 /proc/net/dev | cut -d: -f1 | tr -d " "' 2>&1)
[ "$out" = "$(printf 'arrancó\nlo')" ]
check $? "con la red por defecto de Docker, el sandbox ve sólo loopback"

exit $fail
