#!/bin/sh
# Paso `migrate` del despliegue (ADR 0006 D35, enmendado en C2): aplica las migraciones y corre
# content:import. Si falla por una espera de bloqueo vencida (1205) o un interbloqueo (1213), lo
# repite con pausas crecientes; cualquier otro error termina el paso sin reintentar. Es la única
# capa de reintentos: el import usa `attempts: 1` para que no se multipliquen. Cada intento espera
# como mucho 5 s por un bloqueo (MYSQL_ATTR_INIT_COMMAND de compose.yaml).
# El código se busca con los espacios normalizados: la consola puede partirlo entre dos líneas.
#
# MIGRATE_PAUSES son las pausas, en segundos, entre intentos: «5 15» son 3 intentos. Las pruebas
# la ponen en «0 0».
set -u

pauses=${MIGRATE_PAUSES:-"5 15"}
log=$(mktemp)
trap 'rm -f "$log"' EXIT
attempt=1

while :; do
  status=0
  { php artisan migrate --force && php artisan content:import; } >"$log" 2>&1 || status=$?
  cat "$log"
  [ "$status" -eq 0 ] && exit 0

  if ! tr -s '[:space:]' ' ' <"$log" | grep -Eq 'General error: 1205|Serialization failure: 1213'; then
    exit "$status"
  fi

  pause=""
  position=0
  for candidate in $pauses; do
    position=$((position + 1))
    [ "$position" -eq "$attempt" ] && pause=$candidate
  done
  if [ -z "$pause" ]; then
    echo "migrate: sigue fallando por bloqueos después de ${attempt} intentos."
    exit "$status"
  fi
  echo "migrate: espera de bloqueo o interbloqueo (intento ${attempt}); reintento en ${pause} s."
  sleep "$pause"
  attempt=$((attempt + 1))
done
