#!/bin/sh
# C2 deployment check (spec 001, FR-046) against the real stack, deploying with backend/api/scripts/deploy.sh: with
# a new image whose `migrate` fails on
# a lock held by another client, `php` is not recreated and the old one keeps serving; once the lock is
# released, the same content under that image keeps the same ETag and Content-Version.
# Builds images, leaves the stack up and takes minutes (`migrate` retries 3 times, pausing 5 and 15 s).
# Not part of `npm test`, like api:smoke. Needs the root .env (sh backend/api/scripts/init-env.sh) and the
# workshop port free. Run from the root: sh backend/api/scripts/deploy-check.sh
#
# Depends on compose.yaml passing CONTENT_SOURCE_COMMIT to the image build (another commit, another
# image, so `php` is recreated) and on `migrate` running migrate-and-import with lock waits capped at 5 s.
set -u

old_commit=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
new_commit=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
fail=0
holder_id=""
log=$(mktemp)

check() {
  if [ "$1" = "$2" ]; then
    echo "ok    $3"
  else
    echo "FALLO $3: esperaba «$2» y llegó «$1»"
    fail=1
  fi
}

abort() {
  echo "ABORTO: $1"
  exit 1
}

# MySQL as root inside the container, where the password is already in the environment (compose.yaml).
sql() {
  docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -B -e "$1" 2>/dev/null' sh "$1"
}

cleanup() {
  if [ -n "$holder_id" ]; then
    sql "kill $holder_id" >/dev/null 2>&1
  fi
  rm -f "$log"
}
trap cleanup EXIT
# On Ctrl-C or a signal, abort exits and so runs the EXIT trap above; without this the session would keep
# the lock on exercises until its SLEEP ends.
trap 'abort "interrumpido"' INT TERM HUP

# ETag and Content-Version of /api/guide, without \r, as two lines: "etag …" and "version …".
guide() {
  curl -s -D - -o /dev/null "http://$addr/api/guide" | tr -d '\r' \
    | sed -n -e 's/^[Ee][Tt]ag: /etag /p' -e 's/^[Cc]ontent-[Vv]ersion: /version /p'
}

echo "== 1. Despliegue sano con el commit $old_commit"
CONTENT_SOURCE_COMMIT=$old_commit sh backend/api/scripts/deploy.sh || abort "el despliegue inicial falló"
addr=$(docker compose port taller 8080 2>/dev/null) || abort "el servicio taller no está levantado"
php_before=$(docker compose ps -q php)
[ -n "$php_before" ] || abort "no hay contenedor php"
started_before=$(docker inspect -f '{{.State.StartedAt}}' "$php_before")
guide_before=$(guide)
check "$(printf '%s\n' "$guide_before" | wc -l | tr -d ' ')" 2 "la guía responde con ETag y Content-Version"

echo "== 2. Otro cliente retiene un bloqueo sobre exercises: el import de migrate no puede leerla"
# Build the new image before taking the lock: step 3's deploy then only reuses the cache, and the
# 180 s of lock cover migrate's 3 attempts however slow the build is.
CONTENT_SOURCE_COMMIT=$new_commit docker compose build php migrate || abort "no se pudo construir la imagen nueva"
sql 'LOCK TABLES exercises WRITE; SELECT SLEEP(180)' >/dev/null 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  holder_id=$(sql 'show processlist' | awk -F '\t' '$8 ~ /^SELECT SLEEP\(180\)/ { print $1 }')
  [ -n "$holder_id" ] && break
  sleep 1
done
[ -n "$holder_id" ] || abort "no se encontró la sesión que retiene el bloqueo"

echo "== 3. Despliegue con una imagen nueva (commit $new_commit): migrate falla y php no se recrea"
if CONTENT_SOURCE_COMMIT=$new_commit sh backend/api/scripts/deploy.sh >"$log" 2>&1; then
  echo "FALLO el despliegue con migrate bloqueado terminó bien: no se dio el escenario"
  fail=1
else
  echo "ok    el despliegue con migrate bloqueado falló, como debía"
fi
tail -n 5 "$log" | sed 's/^/      compose: /'
check "$(grep -c 'sigue fallando por bloqueos después de 3 intentos' "$log")" 1 \
  "migrate reintentó 3 veces y se rindió"
check "$(docker compose ps -q php)" "$php_before" "php no se recreó: sigue el mismo contenedor"
check "$(docker inspect -f '{{.State.StartedAt}}' "$php_before")" "$started_before" "php no se reinició"
check "$(guide)" "$guide_before" "el php anterior sigue sirviendo la guía, con el mismo ETag y Content-Version"

echo "== 4. Se libera el bloqueo: el mismo despliegue sale bien y deja el mismo contenido"
sql "kill $holder_id" >/dev/null 2>&1
holder_id=""
CONTENT_SOURCE_COMMIT=$new_commit sh backend/api/scripts/deploy.sh || abort "el despliegue sin el bloqueo falló"
php_after=$(docker compose ps -q php)
if [ "$php_after" != "$php_before" ]; then recreated=si; else recreated=no; fi
check "$recreated" si "con migrate sano, php se recrea con la imagen nueva"
check "$(guide)" "$guide_before" "con otra imagen y el mismo contenido, el ETag y el Content-Version no cambian"
exit "$fail"
