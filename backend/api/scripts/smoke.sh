#!/bin/sh
set -u
addr=$(docker compose port taller 8080 2>/dev/null) || addr=""
if [ -z "$addr" ]; then
  echo "FALLO: el servicio taller no está levantado en este proyecto de Compose"
  exit 1
fi
base="http://$addr"
fail=0

check() {
  if [ "$1" = "$2" ]; then
    echo "ok    $3"
  else
    echo "FALLO $3: esperaba «$2» y llegó «$1»"
    fail=1
  fi
}

headers() {
  curl -s -D - -o /dev/null "$1" | tr -d '\r'
}

check "$(curl -s -H 'Accept: application/json' "$base/api/up")" '{"status":"up"}' \
  "/api/up responde up en JSON"
check "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$base/api/up")" \
  '200 text/html; charset=utf-8' "/api/up responde 200 en HTML (la vista se compila en el tmpfs)"
check "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$base/api/no-existe")" \
  '404 application/json' "una ruta desconocida de /api responde 404 en JSON"
check "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$base/api/")" \
  '404 application/json' "la raíz /api/ responde 404 en JSON"
body=$(curl -s "$base/api/no-existe")
check "$(printf '%s' "$body" | grep -c '"message"') $(printf '%s' "$body" | grep -c '"trace"')" \
  '1 0' "los errores de la API traen message y no exponen trazas (APP_DEBUG=false)"
check "$(headers "$base/api/up" | grep -ci '^content-security-policy:')" 1 \
  "la CSP de Nginx también cubre /api"
check "$(headers "$base/api/up" | grep -ci '^x-powered-by:')" 0 \
  "PHP no anuncia su versión (X-Powered-By)"
check "$(headers "$base/api" | sed -n 's/^[Ll]ocation: //p')" '/api/' \
  "/api redirige a /api/ en el mismo origen"
check "$(curl -s -o /dev/null -w '%{http_code}' "$base/")" 200 "Nginx sigue sirviendo el front"
check "$(docker compose exec -T taller nginx -t 2>&1 | grep -c 'test is successful')" 1 \
  "nginx -t valida la configuración"

can_resolve() {
  if docker compose exec -T "$1" getent hosts "$2" >/dev/null 2>&1; then echo si; else echo no; fi
}
for service in php scheduler mysql taller; do
  case "$service" in
    mysql|taller) internal=php ;;
    *) internal=mysql ;;
  esac
  check "$(can_resolve "$service" example.com) $(can_resolve "$service" "$internal")" 'no si' \
    "$service no resuelve nombres de Internet y sí el de $internal"
done
migrate_resolves() {
  docker compose run --rm --no-deps --entrypoint php migrate -r \
    "echo gethostbyname('$1') === '$1' ? 'no' : 'si';" 2>/dev/null
}
check "$(migrate_resolves example.com) $(migrate_resolves mysql)" 'no si' \
  "migrate no resuelve nombres de Internet y sí el de mysql"

check "$(docker compose ps --status running --services | grep -cx scheduler)" 1 \
  "el servicio scheduler corre"
check "$(docker compose config --services | grep -cx db-grants)" 0 \
  "db-grants no se levanta sin el perfil ops"
check "$(docker compose --profile ops config --services | grep -cx db-grants)" 1 \
  "db-grants existe con el perfil ops"

request_headers=$(curl -s -D - -o /dev/null "$base/api/exercises?catalog=lab&language=rust&secreto=XYZ" | tr -d '\r')
request_id=$(printf '%s\n' "$request_headers" | sed -n 's/^[Xx]-[Rr]equest-[Ii]d: //p')
check "$(printf '%s' "$request_id" | grep -Ec '^[0-9a-f]{32}$')" 1 "la respuesta trae un X-Request-Id de 32 hexadecimales"
nginx_line=$(docker compose logs --no-log-prefix taller 2>&1 | grep -F "$request_id" | grep -F '/api/exercises')
check "$(printf '%s' "$nginx_line" | grep -c .)" 1 "Nginx registra el pedido con su request_id"
check "$(docker compose logs --no-log-prefix taller 2>&1 | grep -c 'secreto=XYZ')" 0 "el registro de Nginx no lleva la query string"

burst_dir=$(mktemp -d)
trap 'rm -rf "$burst_dir"' EXIT
seq 150 | xargs -P 50 -I{} curl -s -D "$burst_dir/{}.headers" -o "$burst_dir/{}.body" "$base/api/session"
limited=$(grep -l '^HTTP/[0-9.]* 429' "$burst_dir"/*.headers 2>/dev/null | head -n 1)
check "$(printf '%s' "$limited" | grep -c .)" 1 "150 pedidos en paralelo a /api/session reciben al menos un 429"
if [ -n "$limited" ]; then
  check "$(tr -d '\r' <"$limited" | grep -ci '^content-type: application/json')" 1 "el 429 de Nginx es JSON"
  check "$(tr -d '\r' <"$limited" | grep -ci '^retry-after: ')" 1 "el 429 de Nginx trae Retry-After"
  check "$(cat "${limited%.headers}.body")" \
    '{"message":"Demasiados intentos. Esperá un momento antes de volver a probar.","code":"too_many_requests"}' \
    "el 429 de Nginx trae el cuerpo {message, code}"
fi
sleep 15
check "$(curl -s -o /dev/null -w '%{http_code}' "$base/api/session" | grep -c '^429$')" 0 \
  "15 segundos después, /api/session vuelve a responder sin 429"
exit "$fail"
