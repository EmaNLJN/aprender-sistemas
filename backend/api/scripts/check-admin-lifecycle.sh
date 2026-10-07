#!/bin/sh
# C3b end to end against the running stack: an admin invites and lists, a student exports and
# deletes the account, and the purge removes it within SC-014's three minutes.
set -u

. backend/api/scripts/check-account.sh

fail=0
body=$(mktemp)
admin_jar=""
admin_id=""
student_id=""
invited_email=""

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

cleanup() {
  ledger_ids=${student_id:-0}
  check_account_sql "DELETE FROM users WHERE email LIKE 'check-%@taller.invalid'; DELETE FROM invitations WHERE email LIKE 'check-%@taller.invalid'; DELETE FROM account_deletions WHERE user_id IN ($ledger_ids)" >/dev/null 2>&1
  check_account_close
  rm -f "$body" "$admin_jar"
}
trap cleanup EXIT
trap 'abort "interrumpido"' INT TERM HUP

xsrf() {
  awk '$6 == "XSRF-TOKEN" { print $7 }' "$1" | sed -e 's/%3D/=/g' -e 's/%2F/\//g' -e 's/%2B/+/g'
}

call() {
  jar=$1
  user_id=$2
  method=$3
  path=$4
  data=${5:-}
  if [ -n "$data" ]; then
    printf '%s' "$data" | curl -s -o "$body" -w '%{http_code}' -X "$method" -b "$jar" -c "$jar" \
      -H 'Accept: application/json' -H 'Content-Type: application/json' \
      -H "X-XSRF-TOKEN: $(xsrf "$jar")" -H "X-Taller-User: $user_id" --data-binary @- "$base$path"
  else
    curl -s -o "$body" -w '%{http_code}' -X "$method" -b "$jar" -c "$jar" \
      -H 'Accept: application/json' -H "X-XSRF-TOKEN: $(xsrf "$jar")" -H "X-Taller-User: $user_id" "$base$path"
  fi
}

json() {
  node -p "const d = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); $2" "$1"
}

session_user_id() {
  curl -s -b "$1" -H 'Accept: application/json' "$base/api/session" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).user.id"
}

addr=$(docker compose port taller 8080 2>/dev/null) || abort "el servicio taller no está levantado"
base="http://$addr"

echo "== Cuentas de prueba"
check_account_open "$base" admin || abort "no se pudo abrir el admin de prueba"
admin_jar=$CHECK_ACCOUNT_JAR
admin_password=$CHECK_ACCOUNT_PASSWORD
admin_id=$(session_user_id "$admin_jar")
check_account_open "$base" student || abort "no se pudo abrir el estudiante de prueba"
student_jar=$CHECK_ACCOUNT_JAR
student_password=$CHECK_ACCOUNT_PASSWORD
student_id=$(session_user_id "$student_jar")
[ -n "$admin_id" ] && [ -n "$student_id" ] || abort "no se pudieron leer los ids de las cuentas"

echo "== Admin"
check "$(call "$admin_jar" "$admin_id" POST /api/auth/confirm-password "{\"password\":\"$admin_password\"}")" 201 \
  "el admin reconfirma la contraseña"
check "$(call "$admin_jar" "$admin_id" GET '/api/admin/users?q=check-')" 200 "el admin lista cuentas"
check "$(json "$body" 'd.meta.total >= 2')" true "el listado trae al menos las dos cuentas de prueba"

invited_email="check-$(openssl rand -hex 6)@taller.invalid"
check "$(call "$admin_jar" "$admin_id" POST /api/admin/invitations \
  "{\"emails\":[\"$invited_email\"],\"role\":\"student\",\"delivery\":\"link\"}")" 200 \
  "el admin invita por link"
check "$(json "$body" 'd.data[0].result + " " + d.data[0].url.includes("#invitacion=")')" 'created true' \
  "la invitación queda creada y trae su url"
check "$(call "$admin_jar" "$admin_id" POST /api/admin/invitations \
  "{\"emails\":[\"$invited_email\"],\"role\":\"student\",\"delivery\":\"email\"}")" 503 \
  "invitar por email responde 503"
check "$(json "$body" 'd.code')" mail_unavailable "el 503 trae code mail_unavailable"

check "$(call "$admin_jar" "$admin_id" GET '/api/admin/invitations?state=pending')" 200 \
  "el admin lista las invitaciones pendientes"
invitation_id=$(json "$body" "(d.data.find(i => i.email === '$invited_email') || {}).id")
check "$(json "$body" "d.data.some(i => i.email === '$invited_email')") $(grep -c '#invitacion=' "$body")" 'true 0' \
  "el listado trae la invitación y ningún token"
check "$(call "$admin_jar" "$admin_id" DELETE "/api/admin/invitations/$invitation_id")" 204 \
  "el admin revoca la invitación"
check "$(call "$student_jar" "$student_id" GET /api/admin/users)" 403 "el estudiante no entra a /api/admin/users"

echo "== Estudiante"
check "$(call "$student_jar" "$student_id" POST /api/auth/confirm-password "{\"password\":\"$student_password\"}")" 201 \
  "el estudiante reconfirma la contraseña"
check "$(call "$student_jar" "$student_id" POST /api/me/export)" 200 "el estudiante exporta sus datos"
check "$(json "$body" 'd.format')" taller-export-1 "la copia trae format taller-export-1"
check "$(call "$student_jar" "$student_id" DELETE /api/me)" 202 "el estudiante pide borrar su cuenta"
check "$(curl -s -b "$student_jar" -H 'Accept: application/json' "$base/api/session" | grep -c '"user":null')" 1 \
  "la sesión ya no tiene cuenta"

purge_started=$(date +%s)
purge_done=no
while [ $(($(date +%s) - purge_started)) -lt 180 ]; do
  remaining=$(check_account_sql "SELECT COUNT(*) FROM users WHERE id = $student_id")
  if [ "$remaining" = 0 ]; then
    purge_done=si
    break
  fi
  sleep 5
done
purge_seconds=$(($(date +%s) - purge_started))
check "$purge_done" si "la purga borra la cuenta en 180 segundos o menos"
check "$(check_account_sql "SELECT COUNT(*) FROM account_deletions WHERE user_id = $student_id")" 1 \
  "el libro tiene una fila con el id de la cuenta"
echo "info  la purga tardó $purge_seconds segundos (SC-014)"

exit "$fail"
