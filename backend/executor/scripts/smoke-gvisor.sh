#!/bin/sh
# gVisor smoke test. Run it after installing runsc (the apt package registers it in Docker),
# adding `--network=none` with `sudo runsc install -- --network=none` and reloading Docker
# (`sudo systemctl reload docker`). It checks the ADR 0005 configuration and that, with the
# systemd cgroup driver, memory, process and network limits apply.
# Every check requires the sandbox to have started: a sandbox that fails to start proves nothing.
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

# --pids-limit counts the sandbox host threads (sentry and gofer): below about 20 the sandbox
# does not even start, and above the limit gVisor kills the whole sandbox or forks fail. Tested
# with the real run limit (64).
out=$(run --pids-limit 64 "$image" sh -c 'echo arrancó; for i in $(seq 1 200); do sleep 3 & done; wait; echo terminó' 2>&1)
echo "$out" | grep -q arrancó && { ! echo "$out" | grep -q terminó || echo "$out" | grep -q "can't fork"; }
check $? "con --pids-limit 64 arranca, y una bomba de 200 procesos queda contenida"

# Without Docker's --network none: if the sandbox still sees only loopback, runsc's
# --network=none is active.
out=$(run "$image" sh -c 'echo arrancó; tail -n +3 /proc/net/dev | cut -d: -f1 | tr -d " "' 2>&1)
[ "$out" = "$(printf 'arrancó\nlo')" ]
check $? "con la red por defecto de Docker, el sandbox ve sólo loopback"

exit $fail
