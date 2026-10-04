#!/bin/sh
# Prueba de humo del stack de compose.yaml, por Nginx como lo usa el navegador: Nginx, PHP-FPM,
# Laravel y MySQL, con el contenedor php de sólo lectura. Requiere el stack levantado con
# `docker compose up --build -d --wait`. Uso, desde la raíz: sh api/scripts/smoke.sh.
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

check "$(curl -s -H 'Accept: application/json' "$base/api/up")" '{"status":"up"}' \
  "/api/up responde up en JSON"
check "$(curl -s -o /dev/null -w '%{http_code}' "$base/api/up")" 200 \
  "/api/up responde 200 en HTML (la vista se compila en el tmpfs)"
check "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$base/api/no-existe")" \
  '404 application/json' "una ruta desconocida de /api responde 404 en JSON"
check "$(curl -s "$base/api/no-existe" | grep -c '"trace"')" 0 \
  "los errores de la API no exponen trazas (APP_DEBUG=false)"
check "$(curl -s -D - -o /dev/null "$base/api/up" | grep -ci '^content-security-policy:')" 1 \
  "la CSP de Nginx también cubre /api"
check "$(curl -s -o /dev/null -w '%{http_code}' "$base/")" 200 "Nginx sigue sirviendo el front"
exit "$fail"
