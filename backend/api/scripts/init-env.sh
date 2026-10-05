#!/bin/sh
# Never replaces an existing value: MySQL takes its passwords only when it creates the volume.
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

app_key=$(openssl rand -base64 32)
mysql_password=$(openssl rand -hex 24)
mysql_root_password=$(openssl rand -hex 24)
add_missing APP_KEY "base64:$app_key"
add_missing MYSQL_PASSWORD "$mysql_password"
add_missing MYSQL_ROOT_PASSWORD "$mysql_root_password"
