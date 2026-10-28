# Quickstart: validar C3c · Correo

**Input**: [plan.md](./plan.md), [contracts/console.md](./contracts/console.md) y [contracts/http.md](./contracts/http.md).

Estos escenarios verifican la entrega desde la raíz del repositorio. Del 1 al 8 se corren sin el dominio. El 6 necesita el permiso de Mailpit (T002), y el 9 es la verificación con correo real (T037).

## La regla del proyecto

> **Cada comando de Docker lleva `COMPOSE_PROJECT_NAME` en su misma línea.** El `compose.yaml` de la raíz fija `name: taller-rust-go`, que es el stack del usuario. Sin la variable, Compose actúa sobre ese stack y sobre su volumen `taller-rust-go_mysql-data`.
>
> - Nunca uses `export`: la variable va en cada línea, también en los `npm run api:*` y en los scripts de `backend/api/scripts/`.
> - Nunca corras `docker compose down -v`, `docker volume rm` ni un `up` sin la variable.
> - Los ejemplos usan `taller-c3c` y el puerto 8093, para no chocar con el 8080 del usuario.

## 0. Preparación

```sh
sh backend/api/scripts/init-env.sh   # suma MAIL_DB_PASSWORD si falta; un .env de antes de C3c lo necesita
grep -c '^MAIL_DB_PASSWORD=' .env    # 1
```

Si un comando de Compose dice `falta MAIL_DB_PASSWORD en .env`, es porque el `.env` es de antes de C3c: corré `init-env.sh` otra vez.

## 1. Las pruebas y el análisis (sin el stack)

```sh
COMPOSE_PROJECT_NAME=taller-c3c npm run api:test
COMPOSE_PROJECT_NAME=taller-c3c npm run api:analyse        # nivel 9, 0 errores
COMPOSE_PROJECT_NAME=taller-c3c npm run api:format:check
npm test                                                   # incluye apply-grants-check, compose-mail-check e init-env-check
npm run lint
npm run format:check
git diff --check
COMPOSE_PROJECT_NAME=taller-c3c npm run api:test:down
```

**Esperado:** todo en verde. Entre las pruebas de Pest están:

| Prueba | Qué cubre |
| --- | --- |
| `SendMailTest` y `SendMailFailureTest` | Los reintentos, el plazo, el cifrado y la falla sin dirección |
| `ForgotPasswordQueriesTest` | SC-002: las mismas consultas, ninguna sobre `users` |
| `InvitationEmailTest` | El tope, `rate_limited` y el reenvío |
| `RegisterTest` | SC-011 |
| `AcceptReplacesUnverifiedTest` | FR-021 |
| `MailUserPrivilegesTest` | FR-005 con el usuario real |

## 2. Modo sólo link (los valores por omisión)

```sh
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 sh backend/api/scripts/deploy.sh
curl -s http://127.0.0.1:8093/api/session | node -p "JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')).features)"
# {"passwordReset":false,"registration":false}
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 npm run api:smoke
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 npm run api:content:check
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 sh backend/api/scripts/deploy-check.sh
```

**Esperado:**
- **El smoke** pasa con `forgot-password` en 503 `mail_unavailable`;
- **`worker-mail`** corre con `taller_mail`, resuelve `mysql` y no `php`;
- **`php`** no tiene `MAIL_PASSWORD`;
- **`mailpit`** no existe;
- **el resto** sigue como en C3b (SC-010 y FR-030).

**La consola.** `taller:password-reset-link` sigue imprimiendo el link:

```sh
COMPOSE_PROJECT_NAME=taller-c3c docker compose exec php php artisan taller:password-reset-link <email de una cuenta>
```

## 3. Con correo y el mailer `log` (sin Mailpit)

```sh
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAIL_REQUIRED=false sh backend/api/scripts/deploy.sh
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 npm run api:smoke             # forgot-password responde 202
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 sh backend/api/scripts/check-mail.sh
```

**Esperado:**
- **La invitación por correo** responde sin `url`, y su fila tiene `sent_at` en 30 s o menos;
- **la recuperación** registra `mail.sent` en 3 minutos o menos (SC-002; el script imprime el tiempo);
- **los registros de `worker-mail`** no tienen tokens ni emails en claro (`COMPOSE_PROJECT_NAME=taller-c3c docker compose logs --no-log-prefix worker-mail`);
- **el script** termina con `LÍMITE: sin Mailpit, que el link abra queda como verificación manual (FR-052).`

## 4. El aislamiento de `worker-mail`

```sh
COMPOSE_PROJECT_NAME=taller-c3c docker compose config --format json | node -e "
const c = JSON.parse(require('fs').readFileSync(0, 'utf8'));
for (const net of ['mail', 'egress']) {
  console.log(net, Object.entries(c.services).filter(([, s]) => s.networks && net in s.networks).map(([n]) => n).sort().join(','));
}
console.log('dns', JSON.stringify(c.services['worker-mail'].dns ?? []));"
# mail mysql,worker-mail
# egress worker-mail
# dns []
COMPOSE_PROJECT_NAME=taller-c3c docker compose exec -T php getent hosts example.com || echo "php no resuelve Internet"
COMPOSE_PROJECT_NAME=taller-c3c docker compose exec -T worker-mail getent hosts php || echo "worker-mail no ve a php"
COMPOSE_PROJECT_NAME=taller-c3c npm run api:test -- --filter=MailUserPrivilegesTest
```

**Esperado:** las tres líneas de la configuración tal cual, `php` sin DNS de Internet, `worker-mail` sin ver a `php`, y la prueba del usuario real en verde (SC-004).

## 5. Un proveedor caído

```sh
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAIL_REQUIRED=false MAIL_MAILER=smtp MAIL_HOST=mysql MAIL_PORT=1 MAIL_REQUIRE_TLS=false MAIL_RETRY_SECONDS=20 MAIL_BACKOFF=5 sh backend/api/scripts/deploy.sh
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 CHECK_MAIL_EXPECT=failed sh backend/api/scripts/check-mail.sh
```

**Esperado.** Con `CHECK_MAIL_EXPECT=failed`, el script espera la falla en lugar del envío:
- la invitación queda con `send_failed_at` en menos de un minuto, y sin `sent_at`;
- `failed_jobs` tiene su fila, y ni `exception` ni `payload` contienen la dirección;
- los registros de `worker-mail` muestran `mail.attempt_failed` y `mail.failed` con `cause`, sin la dirección;
- la respuesta de la invitación llegó en menos de un segundo, sin esperar al proveedor (SC-003).

Al terminar, volvé al escenario 2 con su comando de despliegue.

## 6. Con Mailpit (sólo con el permiso de T002)

```sh
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAILPIT_PORT=8026 MAIL_REQUIRED=true MAIL_MAILER=smtp MAIL_HOST=mailpit MAIL_PORT=1025 MAIL_REQUIRE_TLS=false MAIL_FROM_ADDRESS=taller@taller.invalid docker compose --profile dev up --build -d --wait
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAILPIT_PORT=8026 sh backend/api/scripts/check-mail.sh
```

**Esperado:**
- **El modo completo pasa** (FR-052): la invitación llega a Mailpit con un link que empieza por `APP_URL` y abre; la recuperación llega y su link restablece la contraseña; llega el aviso de contraseña cambiada.
- **La interfaz** está en `http://127.0.0.1:8026` y sólo en `127.0.0.1`.
- **Con `MAIL_REQUIRED=true` y `MAIL_MAILER=smtp`,** `features.passwordReset` es `true`: es la configuración real, con Mailpit en el lugar del proveedor.

Sin `--profile dev`, `mailpit` no existe: el escenario 2 vuelve a pasar.

## 7. Registro abierto (con Mailpit, o en Pest)

```sh
COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAILPIT_PORT=8026 REGISTRATION_OPEN=true REGISTRATION_ALLOWED_DOMAINS=taller.invalid MAIL_MAILER=smtp MAIL_HOST=mailpit MAIL_PORT=1025 MAIL_REQUIRE_TLS=false MAIL_FROM_ADDRESS=taller@taller.invalid docker compose --profile dev up -d --wait
```

1. `GET /api/session` responde `features.registration: true`.
2. Con un archivo de cookies y `X-XSRF-TOKEN`, `POST /api/auth/register` con un email `@taller.invalid` responde 201. `GET /api/guide` responde 403 `email_unverified`.
3. El correo de verificación llega a Mailpit. Su link trae `#verificar=<token>`, y `POST /api/auth/email/verify {token}` con la misma sesión responde 204. `GET /api/guide` pasa a 200 (SC-011).
4. Un registro con un email `@otra.org` responde 422 `errors.email`.
5. Un registro con el email del paso 2 responde 422, y llega a Mailpit «Alguien intentó crear una cuenta con tu email».

Sin Mailpit, `RegisterTest` y `EmailVerificationTest` cubren el mismo recorrido en Pest. Al terminar, volvé a desplegar sin `REGISTRATION_OPEN`: las tres rutas responden 404.

## 8. El cambio de email por consola

```sh
COMPOSE_PROJECT_NAME=taller-c3c docker compose exec php php artisan taller:change-email <actual> <nuevo>
```

**Esperado:**
- la salida del contrato y el código 0;
- la sesión de esa cuenta deja de servir;
- con correo, salen dos avisos `email_changed`, a la dirección vieja y a la nueva;
- con un `nuevo` que ya tiene cuenta, sale 1 y el mensaje del contrato, sin cambiar nada.

## 9. Correo real (T037, con el usuario)

Recién después de T032 a T035: el dominio, Brevo con SPF, DKIM y DMARC, la credencial en `.env`, `APP_URL` público y `MAIL_MAILER=smtp`.

| Correo | Cómo se dispara |
| --- | --- |
| `invitation` | Un admin, `POST /api/admin/invitations` con `delivery: "email"` (o desde F12b) |
| `password_reset` | `POST /api/auth/forgot-password` con el email de una cuenta de prueba |
| `password_changed` | `POST /api/auth/reset-password` con el link del correo anterior |
| `admin_role` | Un admin, `PATCH /api/admin/users/<id>` con `{role: "admin"}` sobre la cuenta de prueba (y después de vuelta a `student`) |
| `email_changed` | `COMPOSE_PROJECT_NAME=<tu proyecto> docker compose exec php php artisan taller:change-email <actual> <nuevo>` |
| `email_verification` y `registration_attempt` | Con `REGISTRATION_OPEN=true` por un rato: un registro nuevo, y otro con un email que ya tiene cuenta |
| `account_deleted` | `DELETE /api/me` de la cuenta de prueba, que tiene que estar verificada |

Para cada uno, en los tres buzones (Google, Microsoft y la escuela), anotá:
- si llegó y en qué carpeta;
- si `Authentication-Results` dice `spf=pass`, `dkim=pass` y `dmarc=pass`;
- si el link empieza exactamente por `APP_URL`;
- si el link abre.

## 10. Apagar

```sh
COMPOSE_PROJECT_NAME=taller-c3c docker compose --profile dev down -v   # sólo el proyecto de la prueba
COMPOSE_PROJECT_NAME=taller-c3c npm run api:test:down
```

Nunca sin la variable: el stack `taller-rust-go` y su volumen no se tocan.
