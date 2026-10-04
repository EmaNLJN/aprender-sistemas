#!/bin/sh
# Prueba de humo del stack de compose.yaml, por Nginx como lo usa el navegador: Nginx, PHP-FPM y
# Laravel, con el contenedor php de sólo lectura. MySQL no: ninguna ruta de C1 usa la base.
# Requiere el stack levantado con `docker compose up --build -d --wait`. Uso, desde la raíz:
# sh api/scripts/smoke.sh.
set -u
# La dirección sale de Compose, como en `up`: respeta TALLER_PORT y el proyecto del .env aunque
# no estén exportados en el shell.
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

# Cabeceras de una respuesta, sin \r, para buscarlas con grep.
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
exit "$fail"
