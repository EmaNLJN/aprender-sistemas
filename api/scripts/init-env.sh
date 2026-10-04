#!/bin/sh
# Agrega al .env de la raíz los secretos que faltan para compose.yaml: APP_KEY,
# MYSQL_PASSWORD y MYSQL_ROOT_PASSWORD. Nunca reemplaza un valor existente, porque MySQL toma
# las contraseñas sólo al crear su volumen. Uso: sh api/scripts/init-env.sh
set -eu
env_file="$(cd "$(dirname "$0")/../.." && pwd)/.env"
touch "$env_file"
chmod 600 "$env_file" # guarda secretos: sólo lo lee el usuario
# Sin salto de línea final, el primer agregado se pegaría a la última línea del archivo.
if [ -s "$env_file" ] && [ -n "$(tail -c 1 "$env_file")" ]; then
  echo >> "$env_file"
fi

add_missing() {
  if ! grep -q "^$1=" "$env_file"; then
    printf '%s=%s\n' "$1" "$2" >> "$env_file"
    echo "$1 agregada a $env_file"
  fi
}

add_missing APP_KEY "base64:$(openssl rand -base64 32)"
add_missing MYSQL_PASSWORD "$(openssl rand -hex 24)"
add_missing MYSQL_ROOT_PASSWORD "$(openssl rand -hex 24)"
