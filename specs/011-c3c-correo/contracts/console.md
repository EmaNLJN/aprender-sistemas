# Contrato de consola y de operación de C3c

**Input**: [spec.md](../spec.md), el contrato de consola de C3a ([004](../../004-c3-identidad-acceso/contracts/console.md)) y el de C3b ([010](../../010-c3b-admin-ciclo-de-vida/contracts/console.md)), el de C4 ([008](../../008-c4-exposicion/contracts/console.md), «`grants` y `db-grants`») y [research.md](../research.md).

Cada comando de Docker que nombra este contrato lleva **en su misma línea** `COMPOSE_PROJECT_NAME=<proyecto>`. El `compose.yaml` de la raíz fija `name: taller-rust-go`, que es el stack del usuario: sin esa variable, Compose actúa sobre ese stack y su volumen. Los ejemplos usan `taller-c3c`.

## Comandos de Artisan

Se corren con `COMPOSE_PROJECT_NAME=taller-c3c docker compose exec php php artisan …`.

### `taller:change-email {actual} {nuevo}`

Cambia el email de una cuenta. Es el único camino (Q2).

| Caso | Salida | Código |
| --- | --- | --- |
| Hecho | `Email cambiado: <actual> → <nuevo>. Se cerraron sus sesiones y le avisamos a las dos direcciones.` (sin correo: `… y no se mandaron avisos: el taller no tiene correo.`) | 0 |
| `actual` sin cuenta | `No hay una cuenta con el email <actual>.` | 1 |
| `nuevo` no es un email válido o pasa de 254 caracteres | `<nuevo> no es un email válido.` | 1 |
| `nuevo` ya tiene una cuenta, aunque difiera en mayúsculas | `Ya hay una cuenta con el email <nuevo>.` | 1 |
| `nuevo` tiene una invitación, vigente o vencida | `Hay una invitación para <nuevo>: revocala antes de cambiar el email.` | 1 |
| `actual` y `nuevo` son el mismo email canónico | `El email nuevo es igual al actual.` | 1 |

- **Lo que hace.** Canonicaliza los dos emails, cambia el email, borra las sesiones de la cuenta, rota su token de «recordarme» y borra su token de recuperación. Conserva `email_verified_at`.
- **Los avisos.** Al confirmar, encola el aviso `email_changed` a las dos direcciones.
- **El registro.** Deja `account.email_changed` con `user_id`, `from_hmac` y `to_hmac`.

### `taller:prune-unverified`

Pide la supresión, por el camino de C3b (`AccountDeletion::request`), de cada cuenta que cumple las tres condiciones:

- `email_verified_at` en `NULL`;
- creada hace más de 7 días (`taller.registration.unverified_days`);
- `status` distinto de `deleting`.

Imprime `<n> cuentas sin verificar pedidas para borrar.` (`1 cuenta …` en singular) y sale con 0. No manda el aviso de cuenta borrada. El `scheduler` lo corre cada hora.

### Los de C3a y C3b que cambian

- **`taller:password-reset-link {email}`.** Sin cambios: sigue imprimiendo el link. Es el camino de un admin (Q5) y del modo sólo link.
- **`taller:invite {email} {--role=student}`.** Sin cambios: sigue siendo por link.
- **`taller:resume-purges`.** Vuelve a pedir la purga **con** el aviso de cuenta borrada si el email estaba verificado.
- **`taller:reapply-deletions`.** Nunca avisa.

## El `scheduler`

Suma una línea en `routes/console.php`:

```php
Schedule::command('taller:prune-unverified')->hourly()->withoutOverlapping()->appendOutputTo('/proc/1/fd/2');
```

El `queue:work database --queue=default` de C3b procesa `SendPasswordResetLink`, igual que `PurgeUserData`.

## `worker-mail`

| | |
| --- | --- |
| Imagen | La de `php` (`x-laravel-runtime`) |
| Comando | `php artisan queue:work mail --queue=mail --sleep=3 --timeout=60 --max-jobs=500 --max-time=3600` |
| Redes | `mail` (interna, con `mysql`) y `egress` (con salida) |
| DNS | El del host (`dns: []`): es la única excepción a la regla de C3a |
| Usuario de MySQL | `taller_mail`, con `MAIL_DB_PASSWORD` |
| Variables propias | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_REQUIRE_TLS`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_EHLO_DOMAIN`, `CACHE_STORE=array`, `DB_USERNAME` y `DB_PASSWORD` |
| Depende de | `mysql` sano, `migrate` terminado y `grants` terminado |
| Puertos | ninguno |
| Disco | De sólo lectura, con el tmpfs `/tmp` del ancla |
| Límites | 256 MB, 64 procesos, `cap_drop: ALL`, `no-new-privileges`, `restart: unless-stopped` y `stop_grace_period: 150s` |

**Al arrancar,** si el host de `APP_URL` es `localhost`, `127.0.0.1`, `::1`, `0.0.0.0` o termina en `.localhost`, escribe en stderr una advertencia (`mail.app_url_local`, con `host`): los links de los correos no abren fuera de este equipo.

## `grants` y `db-grants`

Es el mecanismo del plan de C4, sólo con `taller_mail`. C4 suma sus cuatro cuentas con el mismo archivo y el mismo script.

| | `grants` | `db-grants` |
| --- | --- | --- |
| Perfil | Ninguno: está en la cadena de arranque | `ops` |
| Imagen | `mysql:9.7`, la que ya fija Compose | La misma |
| Qué corre | `apply-grants.sh --phase tables --host mysql` | `apply-grants.sh --phase all --host mysql` |
| Depende de | `mysql` sano y `migrate` terminado | `mysql` sano |
| Quién depende de él | `worker-mail` | Nadie |
| Entorno | `MYSQL_ROOT_PASSWORD` y `MAIL_DB_PASSWORD` | El mismo |
| Archivos | `docker/mysql/db-grants.sql` y `docker/mysql/apply-grants.sh`, de sólo lectura | Los mismos |
| Redes | `app`, con `dns: ['127.0.0.1']` | Las mismas |

### `docker/mysql/apply-grants.sh [--phase users|tables|all] [--host <nombre>]`

- **El archivo que lee.** `docker/mysql/db-grants.sql`, o el de `DB_GRANTS_SQL`, con dos secciones: `-- @phase users` y `-- @phase tables`.
- **La contraseña.** Valida que `MAIL_DB_PASSWORD` cumpla `[A-Za-z0-9._~-]{24,128}`. Si falta o no cumple, sale con 64 y el mensaje `MAIL_DB_PASSWORD falta o no tiene de 24 a 128 caracteres de [A-Za-z0-9._~-] (sh backend/api/scripts/init-env.sh)`.
- **Las fases.** Una fase que no sea `users`, `tables` ni `all` sale con 64 y `fase inválida: <fase>`. Un argumento desconocido sale con 64 y el uso.
- **Lo que manda a `mysql`.** Reemplaza `@@MAIL_DB_PASSWORD@@` en la sección pedida y antepone `SET SESSION sql_log_bin = 0;` y `SET SESSION lock_wait_timeout = 5;`. Entrega el SQL a `mysql -uroot --batch` **por la entrada estándar**, con `MYSQL_PWD` tomado de `MYSQL_ROOT_PASSWORD`: ninguna contraseña aparece en los argumentos. Sin `--host` usa el socket, que es lo que hace el inicio de un volumen nuevo.
- **Errores.** Sale con el estado de `mysql` y se detiene en el primer error de SQL.
- **`docker/mysql/10-db-grants.sh`** corre `apply-grants.sh --phase users` en el inicio de un volumen nuevo. Reemplaza al `10-db-grants.sql` que hoy se monta tal cual.
- **Las fases por dentro:**
  - `users`: `CREATE USER IF NOT EXISTS 'taller_mail'@'%' IDENTIFIED BY …`, `ALTER USER 'taller_mail'@'%' IDENTIFIED BY …` y la línea de C3a (`GRANT SELECT ON performance_schema.events_transactions_current TO 'taller'@'%'`);
  - `tables`: los permisos de [data-model.md](../data-model.md), §7.
- **Idempotente.** Se puede correr cuantas veces haga falta. Lo que se quite de la matriz se revoca con una línea explícita en el mismo cambio.

## `backend/api/scripts/init-env.sh`

Suma una línea con el patrón `add_missing` de C3a, sin cambiar nada más:

```sh
add_missing MAIL_DB_PASSWORD "$(openssl rand -hex 24)"
```

**Las credenciales del proveedor no las genera el script.** Son `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` y `MAIL_EHLO_DOMAIN`: las escribe en `.env` quien opera. `MAIL_REQUIRED` vale `true` por omisión en `docker/compose.yaml`.

**Un `.env` de antes de C3c** no tiene `MAIL_DB_PASSWORD`, y todo comando de Compose falla en la interpolación (`falta MAIL_DB_PASSWORD en .env`). Hay que correr el script otra vez.

## `backend/api/scripts/deploy.sh`

Corre `db-grants` en cada despliegue, después de `migrate`: crea `taller_mail` en un volumen existente y sincroniza su contraseña con `.env`. Después levanta también `worker-mail`. Como todo comando de Compose, se corre con `COMPOSE_PROJECT_NAME=<proyecto> sh backend/api/scripts/deploy.sh`.

```sh
docker compose build
docker compose run --rm migrate
docker compose --profile ops run --rm db-grants
docker compose up -d --wait --no-deps mysql php taller scheduler executor worker-runs worker-mail
```

## Los checks contra el stack

| Comando | Qué suma C3c |
| --- | --- |
| `npm run api:smoke` | Comprueba siete cosas: <br>• `worker-mail` corre; <br>• resuelve `mysql` y no resuelve `php`; <br>• es la única excepción del lazo de DNS de C3a (`php`, `scheduler`, `migrate` y los demás siguen sin resolver nombres de Internet); <br>• `php` no tiene `MAIL_PASSWORD` ni `MAIL_USERNAME`; <br>• `grants` y `mailpit` no existen sin su perfil, o terminaron; <br>• `POST /api/auth/forgot-password` responde 202 con correo y 503 `mail_unavailable` en modo sólo link; <br>• `features.passwordReset` lo dice |
| `sh backend/api/scripts/check-mail.sh` (nuevo) | **Con Mailpit** (perfil `dev`): una invitación por correo creada por la API llega a Mailpit por `worker-mail`, con `taller_mail`; su link empieza por `APP_URL`, la consulta del token responde 200 y la fila tiene `sent_at`. La recuperación llega y su link restablece la contraseña. <br>**Sin Mailpit** (`MAIL_REQUIRED=false` y el mailer `log`): `sent_at` se completa, y los registros de `worker-mail` no tienen un token ni un email en claro. Avisa que «el link abre» queda como verificación manual. <br>Crea y borra sus cuentas (`check-mail-*@taller.invalid`) |
| `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh` | Pasan sin editarse, con `worker-mail` en el stack y con o sin proveedor |

## Registros

Todos van a stderr en JSON, con el `X-Request-Id` cuando hay un pedido. **Ninguno lleva un email en claro, un nombre, un link, un token ni el cuerpo**. Un email va como HMAC (`EmailFingerprint`, con `LOG_HMAC_KEY`).

| Evento | Quién | Campos |
| --- | --- | --- |
| `mail.queued` | `php` o `scheduler` | `kind`, `recipient_hmac` |
| `mail.skipped` | `php` o `scheduler` | `kind`, `reason: link_only` |
| `mail.sent` | `worker-mail` | `job`, `kind`, `recipient_hmac`, `attempt` |
| `mail.attempt_failed` | `worker-mail` | `job`, `kind`, `recipient_hmac`, `attempt` y `cause` (la clase corta y el código) |
| `mail.failed` | `worker-mail` | `job`, `kind`, `recipient_hmac` y `cause` (`expired`, `unavailable` o la clase y el código) |
| `mail.superseded` | `worker-mail` | `job`, `invitation_id` |
| `mail.app_url_local` | `worker-mail`, al arrancar | `host` |
| `mail.reset_skipped` | `scheduler` | `reason`: `no_account`, `not_active`, `admin` o `throttled` |
| `account.email_changed` | consola | `user_id`, `from_hmac` y `to_hmac` |
| `account.unverified_pruned` | consola | `user_id` |
| `admin.password_reset_requested` | `php` | `target_id` |

`job` es el UUID del trabajo (`$this->job->uuid()`), que se mantiene entre intentos.

## Mailpit (perfil `dev`)

Sólo existe con el permiso del usuario (T002) y con `--profile dev`. No se levanta con `docker compose up` a secas, y la prueba de puertos de C4 corre sin este perfil.

| | |
| --- | --- |
| Imagen | `axllent/mailpit:v1.31.4@sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48` |
| Redes | `egress`, la única que comparte con `worker-mail` |
| Puertos | `127.0.0.1:${MAILPIT_PORT:-8025}:8025` (la interfaz y la API). El SMTP 1025 no se publica |
| Entorno | `MP_DISABLE_VERSION_CHECK=true`, `MP_SMTP_AUTH_ACCEPT_ANY=true`, `MP_SMTP_AUTH_ALLOW_INSECURE=true` y `MP_MAX_MESSAGES=500` |
| Para que `worker-mail` le entregue | `MAIL_MAILER=smtp`, `MAIL_HOST=mailpit`, `MAIL_PORT=1025`, `MAIL_REQUIRE_TLS=false` y `MAIL_FROM_ADDRESS=taller@taller.invalid`, en línea o en `.env` |
