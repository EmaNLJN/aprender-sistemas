#!/bin/sh
# Test account for the checks that read content behind the session (FR-046). Source it, then call
# `check_account_open <base-url>` and, from an EXIT trap, `check_account_close`.
# Opens the account through the real path: taller:invite, GET /api/session for the CSRF cookie and
# POST /api/auth/invitations/accept. It leaves the cookie jar at $CHECK_ACCOUNT_JAR.

CHECK_ACCOUNT_EMAIL=""
CHECK_ACCOUNT_JAR=""

check_account_sql() {
  docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -B -e "$1" 2>/dev/null' sh "$1"
}

check_account_open() {
  base=$1
  CHECK_ACCOUNT_EMAIL="check-$(openssl rand -hex 6)@taller.invalid"
  CHECK_ACCOUNT_JAR=$(mktemp)
  password=$(openssl rand -hex 16)

  link=$(docker compose exec -T php php artisan taller:invite "$CHECK_ACCOUNT_EMAIL" | sed -n 's/.*#invitacion=//p')
  [ -n "$link" ] || { echo "ABORTO: taller:invite no devolvió un enlace"; return 1; }
  privacy_version=$(docker compose exec -T -e HOME=/tmp php php artisan tinker --execute="echo config('taller.privacy_version');" | tr -d '\r\n')
  [ -n "$privacy_version" ] || { echo "ABORTO: no se pudo leer privacy_version"; return 1; }

  curl -s -o /dev/null -c "$CHECK_ACCOUNT_JAR" "$base/api/session"
  xsrf=$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$CHECK_ACCOUNT_JAR" | sed -e 's/%3D/=/g' -e 's/%2F/\//g' -e 's/%2B/+/g')
  accept_status=$(printf '{"token":"%s","name":"Check","password":"%s","password_confirmation":"%s","privacyVersion":"%s"}' \
    "$link" "$password" "$password" "$privacy_version" \
    | curl -s -o /dev/null -w '%{http_code}' -b "$CHECK_ACCOUNT_JAR" -c "$CHECK_ACCOUNT_JAR" \
      -H 'Content-Type: application/json' -H 'Accept: application/json' -H "X-XSRF-TOKEN: $xsrf" \
      --data-binary @- "$base/api/auth/invitations/accept")
  [ "$accept_status" = 201 ] || { echo "ABORTO: aceptar la invitación respondió $accept_status"; return 1; }
}

check_account_close() {
  if [ -n "$CHECK_ACCOUNT_EMAIL" ]; then
    check_account_sql "DELETE FROM users WHERE email = '$CHECK_ACCOUNT_EMAIL'; DELETE FROM invitations WHERE email = '$CHECK_ACCOUNT_EMAIL'" >/dev/null 2>&1
    CHECK_ACCOUNT_EMAIL=""
  fi
  [ -n "$CHECK_ACCOUNT_JAR" ] && rm -f "$CHECK_ACCOUNT_JAR"
  CHECK_ACCOUNT_JAR=""
}
