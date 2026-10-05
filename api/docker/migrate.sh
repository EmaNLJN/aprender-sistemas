#!/bin/sh
# The deployment's `migrate` step (ADR 0006 D35): runs the migrations, then content:import. It retries
# with growing pauses only on a lock wait timeout (1205) or a deadlock (1213); any other error ends the
# step. This is the single retry layer: the import runs with `attempts: 1` so retries do not multiply.
# Each attempt waits at most 5 s for a lock (MYSQL_ATTR_INIT_COMMAND in compose.yaml).
#
# MIGRATE_PAUSES: seconds to wait between attempts; "5 15" means 3 attempts. Tests set "0 0".
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

  # The error is matched with whitespace squeezed: the console may wrap it across two lines.
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
