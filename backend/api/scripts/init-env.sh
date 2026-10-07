#!/bin/sh
# Never replaces an existing value: MySQL takes its passwords only when it creates the volume.
# To add a variable, append one `add_missing NAME "$(openssl ...)"` line at the end: no other structure changes.
set -eu
env_file="$(cd "$(dirname "$0")/../../.." && pwd)/.env"
touch "$env_file"
chmod 600 "$env_file"
if [ -s "$env_file" ] && [ -n "$(tail -c 1 "$env_file")" ]; then
  echo >> "$env_file"
fi

# Compose keeps the last definition: a second one would override the one MySQL took.
key_pattern() {
  printf '^[[:space:]]*(export[[:space:]]+)?%s[[:space:]]*=' "$1"
}

add_missing() {
  if grep -Eq "$(key_pattern "$1")[[:space:]]*[^[:space:]]" "$env_file"; then
    return 0
  fi
  if grep -Eq "$(key_pattern "$1")" "$env_file"; then
    echo "$1 está vacía en $env_file: completala o borrá la línea y volvé a correr este script" >&2
    exit 1
  fi
  printf '%s=%s\n' "$1" "$2" >> "$env_file"
  echo "$1 agregada a $env_file"
}

add_missing APP_KEY "base64:$(openssl rand -base64 32)"
add_missing MYSQL_PASSWORD "$(openssl rand -hex 24)"
add_missing MYSQL_ROOT_PASSWORD "$(openssl rand -hex 24)"
add_missing LOG_HMAC_KEY "$(openssl rand -base64 32)"
add_missing EXECUTOR_TOKEN "$(openssl rand -hex 32)"

docker_socket="${DOCKER_SOCKET:-/var/run/docker.sock}"
if [ ! -e "$docker_socket" ]; then
  echo "No existe el socket de Docker en $docker_socket: EXECUTOR_DOCKER_GID no se puede calcular. Levantá Docker o indicá otra ruta con DOCKER_SOCKET." >&2
  exit 1
fi
add_missing EXECUTOR_DOCKER_GID "$(ls -lnL "$docker_socket" | awk '{print $4}')"
