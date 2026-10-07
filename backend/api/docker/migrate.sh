#!/bin/sh
# ADR 0006 D35: the single retry layer (the import runs with `attempts: 1`), only on lock wait timeout 1205 or deadlock 1213.
set -u

pauses=${MIGRATE_PAUSES:-"5 15"}
log=$(mktemp)
trap 'rm -f "$log"' EXIT
attempt=1

# A decision, not a lock wait: it runs once and is never retried.
php artisan taller:check-transactions || exit $?

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
