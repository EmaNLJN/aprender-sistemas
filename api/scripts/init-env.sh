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

# Una clave presente con valor vacío (copiada de api/.env.example, por ejemplo) no se completa:
# Compose la rechazaría y correr este script de nuevo no la arreglaría.
add_missing() {
  if grep -q "^$1=." "$env_file"; then
    return 0
  fi
  if grep -q "^$1=\$" "$env_file"; then
    echo "$1 está vacía en $env_file: completala o borrá la línea y volvé a correr este script" >&2
    exit 1
  fi
  printf '%s=%s\n' "$1" "$2" >> "$env_file"
  echo "$1 agregada a $env_file"
}

# Cada valor se genera en su propia asignación: si openssl falla, set -e corta antes de escribir.
app_key=$(openssl rand -base64 32)
mysql_password=$(openssl rand -hex 24)
mysql_root_password=$(openssl rand -hex 24)
add_missing APP_KEY "base64:$app_key"
add_missing MYSQL_PASSWORD "$mysql_password"
add_missing MYSQL_ROOT_PASSWORD "$mysql_root_password"
