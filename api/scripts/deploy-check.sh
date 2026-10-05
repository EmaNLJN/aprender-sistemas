#!/bin/sh
# Prueba de despliegue de C2 (spec 001, FR-046), contra el stack real. Con una imagen nueva cuyo
# `migrate` falla porque otro cliente retiene un bloqueo, `php` no se recrea y el anterior sigue
# sirviendo; y, ya sin el bloqueo, esa imagen nueva con el mismo contenido deja el mismo ETag y el
# mismo `Content-Version`. Construye imágenes, deja el stack levantado y tarda unos minutos:
# `migrate` reintenta 3 veces, con pausas de 5 y 15 s, antes de rendirse. No forma parte de
# `npm test`, como api:smoke. Necesita el .env de la raíz (sh api/scripts/init-env.sh) y el puerto
# del taller libre. Uso, desde la raíz: sh api/scripts/deploy-check.sh
#
# Depende de que compose.yaml pase CONTENT_SOURCE_COMMIT a la construcción de la imagen (otro
# commit es otra imagen, así que `php` tiene que recrearse) y de que `migrate` corra
# migrate-and-import con la espera de bloqueos acotada a 5 s.
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

# MySQL como root, dentro del contenedor: la contraseña ya está en su entorno (compose.yaml).
sql() {
  docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -B -e "$1" 2>/dev/null' sh "$1"
}

# Corta la sesión que retiene el bloqueo, si sigue viva, y borra el registro temporal.
cleanup() {
  if [ -n "$holder_id" ]; then
    sql "kill $holder_id" >/dev/null 2>&1
  fi
  rm -f "$log"
}
trap cleanup EXIT
# Con Ctrl-C o una señal, el EXIT de arriba también corre: sin esto la sesión seguiría reteniendo
# el bloqueo sobre exercises hasta que termine su SLEEP.
trap 'abort "interrumpido"' INT TERM HUP

# ETag y Content-Version de /api/guide, sin \r, en dos líneas: «etag …» y «version …».
guide() {
  curl -s -D - -o /dev/null "http://$addr/api/guide" | tr -d '\r' \
    | sed -n -e 's/^[Ee][Tt]ag: /etag /p' -e 's/^[Cc]ontent-[Vv]ersion: /version /p'
}

echo "== 1. Despliegue sano con el commit $old_commit"
CONTENT_SOURCE_COMMIT=$old_commit docker compose up --build -d --wait || abort "el despliegue inicial falló"
addr=$(docker compose port taller 8080 2>/dev/null) || abort "el servicio taller no está levantado"
php_before=$(docker compose ps -q php)
[ -n "$php_before" ] || abort "no hay contenedor php"
started_before=$(docker inspect -f '{{.State.StartedAt}}' "$php_before")
guide_before=$(guide)
check "$(printf '%s\n' "$guide_before" | wc -l | tr -d ' ')" 2 "la guía responde con ETag y Content-Version"

echo "== 2. Otro cliente retiene un bloqueo sobre exercises: el import de migrate no puede leerla"
# La imagen nueva se construye antes de tomar el bloqueo: así el `up --build` del paso 3 sólo
# reutiliza la caché y los 180 s del bloqueo alcanzan para los 3 intentos de migrate, por lenta
# que sea la construcción.
CONTENT_SOURCE_COMMIT=$new_commit docker compose build php migrate || abort "no se pudo construir la imagen nueva"
# La sesión de MySQL vive mientras dure el SLEEP, o hasta que cleanup la corte.
sql 'LOCK TABLES exercises WRITE; SELECT SLEEP(180)' >/dev/null 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  holder_id=$(sql 'show processlist' | awk -F '\t' '$8 ~ /^SELECT SLEEP\(180\)/ { print $1 }')
  [ -n "$holder_id" ] && break
  sleep 1
done
[ -n "$holder_id" ] || abort "no se encontró la sesión que retiene el bloqueo"

echo "== 3. Despliegue con una imagen nueva (commit $new_commit): migrate falla y php no se recrea"
if CONTENT_SOURCE_COMMIT=$new_commit docker compose up --build -d --wait >"$log" 2>&1; then
  echo "FALLO el despliegue con migrate bloqueado terminó bien: no se dio el escenario"
  fail=1
else
  echo "ok    el despliegue con migrate bloqueado falló, como debía"
fi
# Las últimas líneas de compose dicen por qué falló, o qué pasó si no falló.
tail -n 5 "$log" | sed 's/^/      compose: /'
check "$(docker compose logs --no-color migrate 2>&1 | grep -c 'sigue fallando por bloqueos después de 3 intentos')" 1 \
  "migrate reintentó 3 veces y se rindió"
check "$(docker compose ps -q php)" "$php_before" "php no se recreó: sigue el mismo contenedor"
check "$(docker inspect -f '{{.State.StartedAt}}' "$php_before")" "$started_before" "php no se reinició"
check "$(guide)" "$guide_before" "el php anterior sigue sirviendo la guía, con el mismo ETag y Content-Version"

echo "== 4. Se libera el bloqueo: el mismo despliegue sale bien y deja el mismo contenido"
sql "kill $holder_id" >/dev/null 2>&1
holder_id=""
CONTENT_SOURCE_COMMIT=$new_commit docker compose up --build -d --wait || abort "el despliegue sin el bloqueo falló"
php_after=$(docker compose ps -q php)
if [ "$php_after" != "$php_before" ]; then recreated=si; else recreated=no; fi
check "$recreated" si "con migrate sano, php se recrea con la imagen nueva"
check "$(guide)" "$guide_before" "con otra imagen y el mismo contenido, el ETag y el Content-Version no cambian"
exit "$fail"
