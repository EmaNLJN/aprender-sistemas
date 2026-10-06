# Quickstart: validar C3a de punta a punta

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [contracts/http.md](./contracts/http.md) y [contracts/console.md](./contracts/console.md). Es una guía de validación contra el stack levantado: qué correr y qué tiene que pasar. El detalle de cada contrato está en los contratos, no acá. **Ningún comando de este archivo se ejecutó al planificar**; los resultados esperados salen de los contratos.

## Prerrequisitos

```sh
sh backend/api/scripts/init-env.sh          # agrega LOG_HMAC_KEY al .env si falta
docker compose up --build -d --wait
# Sólo si el volumen de MySQL ya existía antes de C3a (si no, el SQL se aplica solo):
docker compose --profile ops run --rm db-grants

BASE=http://127.0.0.1:${TALLER_PORT:-8080}
JAR=$(mktemp)
```

Un helper para lo que sigue: devuelve el valor decodificado de la cookie `XSRF-TOKEN` del frasco.

```sh
xsrf() { node -p 'decodeURIComponent(process.argv[1])' "$(awk '$6=="XSRF-TOKEN"{print $7}' "$JAR")"; }
```

## 1. La suite y el análisis

```sh
npm run api:format:check
npm run api:analyse          # nivel 9, 0 errores, sin baseline
npm run api:test             # y otra vez con -- --order-by=random
npm run api:test:down
```

**Esperado:** todo en verde. Cubre FR-001 a FR-038, FR-047 a FR-049 y FR-051.

## 2. Alta con un link de un solo uso (historia 1, SC-002)

```sh
docker compose exec -T php php artisan taller:invite ana@example.com
# imprime: https://…/#invitacion=<43 caracteres>
TOKEN=<el token del link>

curl -s -c "$JAR" -b "$JAR" "$BASE/api/session" >/dev/null
curl -s -c "$JAR" -b "$JAR" -H "X-XSRF-TOKEN: $(xsrf)" -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOKEN\"}" "$BASE/api/auth/invitations/lookup"
```

**Esperado:** el comando sale con 0 y el link; la consulta responde 200 con `{"email":"ana@example.com","role":"student","expiresAt":"…Z"}`.

Aceptar con una contraseña de 15 caracteres o más que no esté en la lista y la versión vigente del aviso (`docker compose exec -T php php artisan tinker --execute="echo config('taller.privacy_version');"`):

```sh
curl -s -i -c "$JAR" -b "$JAR" -H "X-XSRF-TOKEN: $(xsrf)" -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"name\":\"Ana\",\"password\":\"una-frase-larga-y-propia\",\"password_confirmation\":\"una-frase-larga-y-propia\",\"privacyVersion\":\"<versión>\"}" \
  "$BASE/api/auth/invitations/accept"
```

**Esperado:** 201 con `{"data":{"id":…,"name":"Ana","email":"ana@example.com","role":"student","privacyAccepted":true}}` y un `Set-Cookie: taller-session=…; HttpOnly; SameSite=lax`. Repetir la aceptación con el mismo token da 404 `invitation_not_found`. `docker compose exec -T php php artisan taller:invite ana@example.com` ahora sale con 1: la cuenta existe.

## 3. Ingreso, límites y bloqueo (historia 2, SC-003, SC-004)

```sh
login() { curl -s -o /dev/null -w '%{http_code}\n' -c "$JAR" -b "$JAR" -H "X-XSRF-TOKEN: $(xsrf)" \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$BASE/api/auth/login"; }
```

- `login ana@example.com una-frase-larga-y-propia` → **200**, con la cookie de sesión HttpOnly y la de dispositivo.
- Un email inexistente y la contraseña equivocada de `ana@example.com` → los dos **422** `auth_failed`, con el mismo cuerpo y casi el mismo tiempo (`curl -w '%{time_total}'`).
- Seis intentos fallidos seguidos con el mismo email → el sexto da **429** con `Retry-After`.

## 4. El contenido, detrás de la sesión (historia 3, SC-001)

```sh
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/guide"                        # sin cookie: 401, sin Accept
curl -s -o /dev/null -w '%{http_code}\n' -b "$JAR" "$BASE/api/guide"              # con la sesión de Ana: 200
npm run api:content:check
sh backend/api/scripts/deploy-check.sh
```

**Esperado:** 401 `unauthenticated` sin sesión (también para un `curl` sin `Accept`) y 200 con ella. Los dos checks pasan: se autentican con una cuenta propia (`check-…@taller.invalid`) que crean y retiran, y no dejan ninguna.

## 5. Cuenta esperada y CSRF (historia 6, SC-006)

```sh
# Sin X-XSRF-TOKEN: 419 csrf_token_mismatch
curl -s -b "$JAR" -H 'Content-Type: application/json' -d '{"name":"Ana"}' -X PATCH "$BASE/api/me"
# Con el token pero sin X-Taller-User: 409 account_mismatch
curl -s -b "$JAR" -H "X-XSRF-TOKEN: $(xsrf)" -H 'Content-Type: application/json' -d '{"name":"Ana"}' -X PATCH "$BASE/api/me"
# Con el id de la cuenta de la sesión: 200
curl -s -b "$JAR" -H "X-XSRF-TOKEN: $(xsrf)" -H 'X-Taller-User: <id de Ana>' -H 'Content-Type: application/json' \
  -d '{"name":"Ana M."}' -X PATCH "$BASE/api/me"
```

## 6. Recuperar la contraseña sin correo (historia 5)

```sh
docker compose exec -T php php artisan taller:password-reset-link ana@example.com
# imprime: https://…/#restablecer=<token>&email=ana%40example.com
# Una segunda corrida a los pocos segundos sale con 1 y dice cuánto falta.
```

Con el token, `POST /api/auth/reset-password` con `{token, email, password, password_confirmation}` responde **200**, no abre sesión, y la sesión de Ana de arriba deja de servir (401 en su siguiente pedido). Un token inválido, uno vencido y un email sin cuenta dan el mismo **422**.

## 7. Operación (historia 7, SC-007 a SC-010)

- **Errores en español y con `code`:** `curl -s "$BASE/api/no-existe"` → 404 `{"message":"No existe lo que pedís.","code":"not_found"}`; `curl -s -X POST "$BASE/api/up"` → 405 `method_not_allowed`.
- **Transacción larga:** en `mysql`, `START TRANSACTION; SELECT COUNT(*) FROM users; SELECT SLEEP(40);`; pasados 32 segundos, `docker compose run --rm migrate` sale distinto de 0 con «transacciones abiertas» y no migra. Sin el privilegio (un volumen sin `db-grants`) falla cerrado con el comando que lo aplica. `deploy-check.sh` lo recorre.
- **DNS:** desde `php`, `scheduler`, `mysql` y `taller`, resolver `example.com` falla y resolver `mysql` o `php` funciona (`docker compose exec -T php php -r 'var_dump(gethostbyname("example.com"), gethostbyname("mysql"));'`).
- **`scheduler`:** `docker compose logs scheduler` muestra las tareas de cada 15 minutos; con filas vencidas en `sessions` y en `cache`, a los 15 minutos desaparecen y los pedidos no corren esa limpieza.
- **Límite de Nginx:** una ráfaga de unos 150 pedidos a `/api/session` da algún 429 con cuerpo JSON y `Retry-After`; a los 15 segundos vuelve a responder.
- **Registros:** `docker compose logs php taller` no contiene ninguna contraseña, token ni ID de sesión; los emails salen como `email:<hmac>`; la línea de Nginx de `/api/` no lleva la query string y trae el `request_id`.
- **Smoke:** `npm run api:smoke` en verde.

## 8. En un navegador real (FR-050, SC-012)

Guion manual, mientras Playwright no esté adoptado. Abrí `http://127.0.0.1:8080` en un navegador con las herramientas de desarrollo; anotá cuál y su versión.

1. **La cookie.** Pedí `GET /api/session` desde la consola (`fetch('/api/session')`) y mirá en Aplicación → Cookies: `taller-session` tiene HttpOnly y `SameSite=Lax`, y su valor no es legible desde JavaScript (`document.cookie` no lo trae); `XSRF-TOKEN` no es HttpOnly.
2. **El CSRF.** Ingresá como A: `fetch('/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)[1])}, body: …})` responde 200. La misma llamada sin `X-XSRF-TOKEN` **también** responde 200: Laravel 13 (`PreventRequestForgery`) da por buena una petición con `Sec-Fetch-Site: same-origin`, que el navegador pone y una página ajena no puede falsificar. Lo que se observa es el caso cruzado: un formulario de otro origen que hace `POST` al taller recibe 419 `csrf_token_mismatch` (corrección del 2026-10-06, verificada en Chrome 152 al implementar C3a).
3. **El cambio de cuenta en el mismo navegador.** En la pestaña 1 ingresá como A y anotá su id. En la pestaña 2 salí e ingresá como B (comparte las cookies). En la pestaña 1 mandá `PATCH /api/me` con `X-Taller-User: <id de A>`: responde **409** `account_mismatch` y no cambia nada de B. Un `GET /api/session` desde la pestaña 1 devuelve a B, que es lo que el cliente compara antes de reintentar.

**Esperado:** los tres observados. Si alguno no se pudo ver, el PR lo declara como no verificado.

## 9. Compuerta de cierre

```sh
npm test && npm run lint && npm run format:check && git diff --check
docker compose config --services    # contra master: sólo suman scheduler y db-grants
docker compose config --volumes     # sin cambios
```
