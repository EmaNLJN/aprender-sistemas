# Quickstart: validar C3b de punta a punta

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [contracts/http.md](./contracts/http.md) y [contracts/console.md](./contracts/console.md). Es una guía de validación contra el stack levantado: qué correr y qué tiene que pasar. El detalle de cada contrato está en los contratos, no acá. **Ningún comando de este archivo se ejecutó al planificar**; los resultados esperados salen de los contratos.

## Prerrequisitos

```sh
sh backend/api/scripts/init-env.sh
docker compose up --build -d --wait

BASE=http://127.0.0.1:${TALLER_PORT:-8080}
ADMIN=$(mktemp)
STUDENT=$(mktemp)
```

Los helpers que siguen: `xsrf` devuelve el valor decodificado de la cookie `XSRF-TOKEN` de un frasco; `call` manda un pedido con la cookie, el CSRF y la cuenta esperada; `sql` corre una consulta con `root`.

```sh
xsrf() { node -p 'decodeURIComponent(process.argv[1])' "$(awk '$6=="XSRF-TOKEN"{print $7}' "$1")"; }
call() { jar=$1; uid=$2; method=$3; path=$4; shift 4
  curl -s -w '\n%{http_code}\n' -b "$jar" -c "$jar" -X "$method" -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -H "X-XSRF-TOKEN: $(xsrf "$jar")" -H "X-Taller-User: $uid" "$@" "$BASE$path"; }
sql() { docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -B -e "$1"' sh "$1"; }
```

Para tener un admin y un alumno con sesión, usá el alta de C3a (`quickstart.md` de C3a, escenario 2) con `taller:invite admin@example.com --role=admin` y `taller:invite ana@example.com`, y guardá los frascos en `$ADMIN` y `$STUDENT` y los ids en `ADMIN_ID` y `STUDENT_ID` (`GET /api/session` los trae). Antes de cada acción sensible, confirmá la contraseña: `call "$ADMIN" "$ADMIN_ID" POST /api/auth/confirm-password -d '{"password":"…"}'` responde 201 y vale 900 segundos.

## 1. La suite y el análisis

```sh
npm run api:format:check
npm run api:analyse          # nivel 9, 0 errores, sin baseline
npm run api:test             # y otra vez con -- --order-by=random
npm run api:test -- --testsuite=Concurrency
npm run api:test:down
```

**Esperado:** todo en verde. Cubre FR-031 a FR-050, FR-053 a FR-056 y la parte de pruebas de SC-005 a SC-009.

## 2. Un admin invita por link (historia 1, SC-013)

```sh
call "$ADMIN" "$ADMIN_ID" POST /api/admin/invitations \
  -d '{"emails":["beto@example.com","carla@example.com"],"role":"student","delivery":"link"}'
call "$ADMIN" "$ADMIN_ID" GET '/api/admin/invitations?state=pending'
call "$ADMIN" "$ADMIN_ID" POST /api/admin/invitations \
  -d '{"emails":["dani@example.com"],"role":"student","delivery":"email"}'
```

**Esperado:** el primero responde 200 con `created` dos veces y, para cada email, una `url` `…/#invitacion=<43 caracteres>`; repetirlo da `invitation_pending` y ninguna `url`. El listado trae las dos invitaciones y **ningún token**. El tercero responde **503** `mail_unavailable` con `Retry-After: 3600` y no crea ninguna invitación (`SELECT COUNT(*) FROM invitations WHERE email = 'dani@example.com'` da 0). Invitar con `"role":"admin"` sin la contraseña reconfirmada responde 423.

Reenviar y revocar:

```sh
call "$ADMIN" "$ADMIN_ID" POST /api/admin/invitations/<id>/resend
call "$ADMIN" "$ADMIN_ID" DELETE /api/admin/invitations/<id>
```

**Esperado:** el reenvío responde 200 con una `url` nueva, y la anterior da 404 `invitation_not_found` en `POST /api/auth/invitations/lookup`; la revocación responde 204 y su link también da 404.

## 3. Administrar cuentas sin quedarse sin admin (historia 2, SC-005 y SC-006)

```sh
call "$ADMIN" "$ADMIN_ID" GET '/api/admin/users?q=ana&sort=-createdAt'
call "$ADMIN" "$ADMIN_ID" PATCH "/api/admin/users/$STUDENT_ID" -d '{"status":"disabled"}'
call "$STUDENT" "$STUDENT_ID" GET /api/guide
call "$ADMIN" "$ADMIN_ID" PATCH "/api/admin/users/$ADMIN_ID" -d '{"status":"disabled"}'
call "$STUDENT" "$STUDENT_ID" GET /api/admin/users
```

**Esperado:** el listado trae a Ana con `perPage`, `total` y `lastPage`; el `PATCH` responde 200 con `status: "disabled"`; el alumno recibe **403** `account_disabled` en su siguiente pedido (su sesión sigue viva); el admin que intenta deshabilitarse a sí mismo recibe **422**; un alumno que pide `/api/admin/users` recibe 403 `forbidden`, también con un id que no existe (`/api/admin/users/999999`). Con **un solo** admin activo, `DELETE /api/me` responde **409** `last_admin` y la cuenta sigue `active`.

La recuperación de un tercero:

```sh
call "$ADMIN" "$ADMIN_ID" POST "/api/admin/users/$STUDENT_ID/password-reset"
```

**Esperado:** **503** `mail_unavailable` y ninguna fila nueva en `password_reset_tokens`. El link para ese alumno sale por consola: `docker compose exec -T php php artisan taller:password-reset-link ana@example.com`.

## 4. Llevarse los datos (historia 3)

```sh
call "$STUDENT" "$STUDENT_ID" POST /api/auth/confirm-password -d '{"password":"…"}'
curl -s -D - -b "$STUDENT" -X POST -H 'Accept: application/json' -H "X-XSRF-TOKEN: $(xsrf "$STUDENT")" \
  -H "X-Taller-User: $STUDENT_ID" "$BASE/api/me/export" -o export.json
node -p 'const d = JSON.parse(require("fs").readFileSync("export.json", "utf8")); [d.format, Object.keys(d).join(","), d.account.email].join(" | ")'
```

**Esperado:** 200 con `Content-Type: application/json` y `Content-Disposition: attachment; filename="taller-<id>-<fecha>.json"`; el archivo es JSON válido, empieza por `taller-export-1`, trae las claves `format,exportedAt,account,exerciseProgress,attempts` y **sólo** los datos de esa cuenta, sin hash ni token. El cuarto pedido del día responde 429 con `Retry-After`.

## 5. Borrar la cuenta y ver que desaparece (historias 3 y 5, SC-007, SC-008 y SC-014)

```sh
call "$STUDENT" "$STUDENT_ID" DELETE /api/me
call "$STUDENT" "$STUDENT_ID" GET /api/session
until [ "$(sql "SELECT COUNT(*) FROM users WHERE id = $STUDENT_ID")" = 0 ]; do sleep 5; done
sql "SELECT user_id, user_created_at, deleted_at FROM account_deletions WHERE user_id = $STUDENT_ID"
```

**Esperado:** el `DELETE` responde 202 con el mensaje que dice que se borra todo y no se deshace; el siguiente pedido ya no tiene cuenta (`user: null` en `GET /api/session`). La cuenta desaparece **sola** en 3 minutos o menos (el `scheduler` procesa la cola cada minuto) y queda **una** fila en `account_deletions` sin datos personales. Buscar el id en cualquier tabla declarada no encuentra nada.

Una purga trabada se retoma:

```sh
sql "UPDATE users SET status = 'deleting', updated_at = NOW(3) - INTERVAL 20 MINUTE WHERE email = 'carla@example.com'"
docker compose exec -T php php artisan taller:resume-purges
```

**Esperado:** el comando dice «1 purga retomada», los registros traen `purge.resumed` con el id, y a los pocos minutos la cuenta desaparece.

## 6. Restaurar sin resucitar cuentas (historia 4, SC-009)

Con una cuenta `X` creada antes de un volcado y suprimida después, y otra con un id reutilizado, armá a mano un libro de tres columnas separadas por tabuladores:

```sh
printf 'user_id\tuser_created_at\tdeleted_at\n%s\t%s\t%s\n' <id de X> '<su created_at>' '2026-10-06 08:30:00.000' > libro.tsv
docker compose exec -T php php artisan taller:reapply-deletions - < libro.tsv
docker compose exec -T php php artisan taller:reapply-deletions - < libro.tsv
```

**Esperado:** la primera corrida dice «1 cuenta borrada» y agrega la fila al libro con su `deleted_at` original; la cuenta nueva con un id reutilizado (otro `created_at`) **no se toca** y el comando lo dice; la segunda corrida dice «0 cuentas borradas, 0 filas agregadas». Un archivo con una línea mal formada sale con código 2 y no procesa nada. La salida no trae emails.

Para producir el libro desde el cliente de MySQL (lo que hará el respaldo de C4):

```sh
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --batch --raw --skip-column-names taller \
  -e "SELECT user_id, user_created_at, deleted_at FROM account_deletions ORDER BY user_id"' > libro.tsv
```

## 7. Operación (historia 5, SC-014)

- **Las tareas del `scheduler`:** `docker compose exec -T scheduler php artisan schedule:list` muestra las ocho: las cuatro de C3a y `queue:work database --queue=default --stop-when-empty --max-time=50` cada minuto, `queue:prune-failed --hours=168` y `model:prune --model=App\Models\DeletedAccount` por día, y `taller:resume-purges` cada 5 minutos.
- **Sólo `default`:** con un trabajo en la cola `runs` (B2), el `scheduler` no lo toca.
- **Las podas:** una fila de `failed_jobs` de hace ocho días y una de `account_deletions` de hace 36 desaparecen al día siguiente; las de hace 6 y 34 días quedan.
- **Sin correo (SC-013):** `GET /api/session` informa `features.passwordReset` en `false`; los tres caminos que piden correo responden 503; `taller:invite` y `taller:password-reset-link` siguen imprimiendo sus links.
- **Registros:** `docker compose logs php scheduler` trae `admin.invitation`, `admin.account_changed`, `account.deletion_requested`, `purge.done` y los demás de [contracts/console.md](./contracts/console.md), y ninguno trae un email, un nombre, un token ni un link.
- **El check de punta a punta:** `sh backend/api/scripts/check-admin-lifecycle.sh` recorre los escenarios 2, 4 y 5 con cuentas propias y no deja ninguna.

## 8. Compuerta de cierre

```sh
npm test && npm run lint && npm run format:check && git diff --check
docker compose config --services    # contra master: no cambia
docker compose config --volumes     # sin cambios
npm run api:smoke && npm run api:content:check && sh backend/api/scripts/deploy-check.sh
```
