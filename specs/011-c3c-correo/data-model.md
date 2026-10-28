# Data Model: C3c · Correo

**Input**: [spec.md](./spec.md), ADR 0006 §5.5 (`mail_jobs`) y D21, el `data-model.md` de C3a (`invitations`, `users` y `password_reset_tokens`) y el de C3b (`account_deletions`), y [research.md](./research.md).

C3c crea **una tabla**, `mail_jobs`. Del resto, sólo cambia qué se escribe en columnas que ya existen, quién puede escribirlas y qué viaja dentro de los trabajos. La tabla nueva no tiene `user_id`, así que no entra en `UserData` (C3b).

## 1. `mail_jobs`

Es la cola de la conexión `mail`, con la misma forma que `jobs` (ADR 0006 §5.5). Se escribe en un único `CREATE TABLE` (D35), en la migración `2026_10_28_100001_create_mail_jobs_table.php`. Ese bloque de C3c va de `2026_10_28_100001` a `100099`, después del último de D1b (`2026_10_06_100012`), para que ordene detrás de lo ya desplegado.

```sql
CREATE TABLE `mail_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` VARCHAR(255) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `attempts` SMALLINT UNSIGNED NOT NULL,
  `reserved_at` INT UNSIGNED NULL,
  `available_at` INT UNSIGNED NOT NULL,
  `created_at` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `mail_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

- **Quién la usa.** La escriben `php` y `scheduler` (al encolar) y `worker-mail` (al reservar, soltar y borrar). La lee sólo `worker-mail`.
- **Qué guarda `payload`.** El JSON de Laravel con `data.command` **cifrado** con `APP_KEY` (`ShouldBeEncrypted`). Ningún email, nombre ni link queda en claro (FR-004).
- **El respaldo** de C4 vuelca sólo su estructura, sin datos (FR-034 de C4, que ya la nombra).

## 2. Lo que viaja dentro de los trabajos

Los tres trabajos que llevan un email son `ShouldBeEncrypted`. La lista es la de FR-004.

| Trabajo | Conexión y cola | Lleva | Quién lo corre |
| --- | --- | --- | --- |
| `App\Jobs\SendMail` | `mail` / `mail` | Un `App\Mail\OutgoingMail`. Si es una invitación, también su `InvitationRef` | `worker-mail` |
| `App\Jobs\SendPasswordResetLink` | `database` / `default` | El email canónico pedido (`string $email`) | `scheduler` |
| `App\Jobs\PurgeUserData` (C3b, cambia) | `database` / `default` | `int $userId` y, desde C3c, `?DeletionNotice $notice` (email y nombre del titular) | `scheduler` |

**`OutgoingMail`** (`final readonly`):

| Campo | Tipo | Qué es |
| --- | --- | --- |
| `kind` | `MailKind` | Uno de los ocho tipos (abajo) |
| `to` | `string` | El destinatario, canónico |
| `name` | `?string` | El nombre para el saludo. `null` en la invitación, porque la persona todavía no lo eligió |
| `link` | `?string` | Sólo en `invitation`, `password_reset` y `email_verification`: `<APP_URL>/#…` |
| `linkExpiresAt` | `?CarbonImmutable` | El vencimiento del link, en UTC |
| `invitation` | `?InvitationRef` | `{id: int, tokenHash: string}`, sólo en `invitation` |
| `queuedAt` | `CarbonImmutable` | Cuándo se armó |
| `deadline` | `CarbonImmutable` | El plazo de `retryUntil()` (R4) |

**`MailKind`** (`string` enum), con lo que lleva cada tipo:

| Caso | Valor | Link | Destinatario |
| --- | --- | --- | --- |
| `Invitation` | `invitation` | `#invitacion=<token>` | El email invitado |
| `PasswordReset` | `password_reset` | `#restablecer=<token>&email=<email codificado>` | El titular |
| `PasswordChanged` | `password_changed` | — | El titular |
| `AdminRole` | `admin_role` | — | La cuenta promovida |
| `AccountDeleted` | `account_deleted` | — | El email que guardó la purga |
| `EmailVerification` | `email_verification` | `#verificar=<id>.<vence>.<firma>` | La cuenta sin verificar |
| `EmailChanged` | `email_changed` | — | La dirección vieja y la nueva (dos trabajos) |
| `RegistrationAttempt` | `registration_attempt` | — | El titular del email que alguien intentó registrar |

**`DeletionNotice`** (`final readonly`) tiene `to` y `name`. `DeletionNotice::for(User $user): ?self` devuelve `null` si el email de la cuenta nunca se verificó (research.md, R10).

**Compatibilidad de `PurgeUserData`.** `$notice` es una propiedad declarada con `= null`, no promovida. Un trabajo encolado antes de C3c no estaba cifrado y no la tiene: se deserializa (su `command` empieza por `O:`), queda con `null` y no avisa.

## 3. `invitations` (C3a): lo que C3c escribe

Las columnas ya existen desde C3a: `delivery ENUM('email','link')`, `sent_at` y `send_failed_at` (`DATETIME(3) NULL`).

| Hecho | `delivery` | `sent_at` | `send_failed_at` | `token_hash` y `expires_at` | Quién escribe |
| --- | --- | --- | --- | --- | --- |
| Crear o renovar con `delivery=link` | `link` | `NULL` | `NULL` | nuevos | `php` (C3b, sin cambios) |
| Crear o renovar con `delivery=email` | `email` | `NULL` | `NULL` | nuevos | `php` (C3c) |
| Reenviar con `delivery=link` o `email` | el pedido, o el de la fila si falta | `NULL` | `NULL` | nuevos | `php` |
| El proveedor acepta el mensaje | — | ahora | — | — | `worker-mail`, sólo si `id` y `token_hash` siguen siendo los del trabajo |
| El plazo vence o falla sin remedio | — | — | ahora | — | `worker-mail` (`failed()`), con el mismo `WHERE` |
| Aceptar, revocar o suprimir a quien la creó | se borra la fila | | | | `php` (C3a y C3b, sin cambios) |

- **La forma publicada.** `sentAt` es «entregada al proveedor», no «llegó al buzón». `sendFailedAt` es «agotó los reintentos», dentro de las 24 horas por omisión (R4). Las dos siguen en `null` en una invitación por link.
- **Un mismo trabajo** no escribe las dos columnas. Un trabajo cuya invitación cambió de token no escribe ninguna.
- **El modelo `Invitation`** suma `@property string $delivery` a su PHPDoc. No cambia sus `casts`.

## 4. `users` (C3a): las cuentas del registro

No cambia el esquema.

- **Una cuenta del registro** nace con `role = student`, `status = active`, `email_verified_at = NULL`, `privacy_version` vigente y `privacy_accepted_at = now`.
- **`email_verified_at IS NULL`** identifica a las cuentas del registro: las de una invitación nacen verificadas y la migración de C3a completó las anteriores (research.md, R13).
- **`taller:change-email`** cambia `email`, rota `remember_token` y no toca `email_verified_at`.

## 5. Tablas que C3c escribe sin cambiar su forma

| Tabla | Qué escribe C3c | Cuándo |
| --- | --- | --- |
| `account_deletions` (C3b) | Una fila `(user_id, user_created_at, deleted_at)` | Cuando aceptar una invitación por correo reemplaza una cuenta sin verificar (FR-021) |
| `password_reset_tokens` | Un `DELETE` por email | Al reemplazar una cuenta sin verificar y al cambiar un email por consola. El token es por email, no por id |
| `password_reset_tokens` | La fila del broker (`createToken`) | En `SendPasswordResetLink` y en la recuperación de un tercero |
| `failed_jobs` | Una fila por correo que agotó su plazo | `worker-mail`. `exception` sin dirección (R5); `payload`, cifrado |
| `cache` | Las claves de los limitadores (tabla siguiente) | `php` |

## 6. Claves de los limitadores

Todas viven en la caché (`cache`, el store `database` de `php`). Ninguna lleva un email en claro.

| Clave | Límite | Respuesta al pasarse |
| --- | --- | --- |
| `forgot-password` (con nombre), por red: dos límites | 5 por minuto y 20 por hora | 429 con `Retry-After` |
| `forgot-password:email:<sha256 del email canónico>` | 3 por hora | 202 igual, sin encolar |
| `register` (con nombre), por red /48 en IPv6 y en total | 5 por hora por red; 100 por hora en total | 429 con `Retry-After` |
| `verification-mail:<user id>` | 3 por hora, incluido el del registro | 429 con `Retry-After` |
| `admin-mail:<admin id>` | 300 por cada 86 400 s, con `increment` y `decrement` | `rate_limited` en la invitación; 429 en el reenvío |

## 7. El usuario de MySQL `taller_mail`

Lo crean `docker/mysql/db-grants.sql` y `docker/mysql/apply-grants.sh` (research.md, R16). Su contraseña es `MAIL_DB_PASSWORD`, que vive en `.env` y no entra en Git.

| Objeto | Permisos | Por qué |
| --- | --- | --- |
| `taller.mail_jobs` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | Reservar, soltar y borrar sus trabajos |
| `taller.failed_jobs` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | El registro de fallos de `database-uuids` (FR-005; la matriz de C4) |
| `taller.invitations` | `SELECT (id, token_hash)` | El `WHERE` del control y de las marcas (R6) |
| `taller.invitations` | `UPDATE (sent_at, send_failed_at)` | Las marcas |
| Todo lo demás | nada | FR-005: ni `users`, `sessions`, `password_reset_tokens`, otra tabla u otra columna, DDL, `GRANT`, `FILE` ni `PROCESS` |

**Lo que cambia respecto de C4.** La matriz de C4 (`specs/008-c4-exposicion/data-model.md`, §3) le da a `taller_mail` `SELECT (id)` sobre `invitations`. C3c necesita también `token_hash`. Es un hallazgo para C4: su fixture `qa/fixtures/mysql-roles.json` tiene que decir `"SELECT": ["id", "token_hash"]`.

## 8. Configuración

| Clave de `config/` | Variable de entorno | Valor por omisión | Dónde se define la variable |
| --- | --- | --- | --- |
| `mail.default` | `MAIL_MAILER` | `log` | `x-laravel-env` (`${MAIL_MAILER:-log}`) |
| `taller.mail.required` | `MAIL_REQUIRED` | `true` | `x-laravel-env` (`${MAIL_REQUIRED:-true}`) |
| `taller.mail.retry_seconds` | `MAIL_RETRY_SECONDS` | `86400` | `x-laravel-env` |
| `taller.mail.backoff` | `MAIL_BACKOFF` | `60,300,900,3600` | `x-laravel-env` |
| `taller.mail.admin_daily_limit` | — | `300` | — |
| `taller.mail.timezone` | — | `America/Argentina/Buenos_Aires` | — |
| `taller.registration.open` | `REGISTRATION_OPEN` | `false` | `x-laravel-env` |
| `taller.registration.allowed_domains` | `REGISTRATION_ALLOWED_DOMAINS` (separados por coma) | vacía | `x-laravel-env` |
| `taller.registration.per_hour_network`, `per_hour_global`, `verification_per_hour`, `verification_minutes`, `unverified_days` | — | 5, 100, 3, 60 y 7 | — |
| `taller.forgot_password.per_minute_network`, `per_hour_network`, `per_hour_email` | — | 5, 20 y 3 | — |
| `mail.mailers.smtp.host`, `port`, `scheme`, `username`, `password` | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD` | `127.0.0.1`, `587`, `null`, `null`, `null` | Sólo `worker-mail`, desde `.env` |
| `mail.mailers.smtp.timeout` | — | `20` | — |
| `mail.mailers.smtp.require_tls` | `MAIL_REQUIRE_TLS` | `true` | Sólo `worker-mail` |
| `mail.mailers.smtp.local_domain` | `MAIL_EHLO_DOMAIN` | el host de `APP_URL` | Sólo `worker-mail` |
| `mail.from.address`, `mail.from.name` | `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | `hello@example.com`, `Taller Rust y Go` | Sólo `worker-mail` |
| `database.connections.mysql.username` y `password` en `worker-mail` | `DB_USERNAME`, `DB_PASSWORD` | `taller_mail` y `${MAIL_DB_PASSWORD}` | Sólo `worker-mail` |
| `cache.default` en `worker-mail` | `CACHE_STORE` | `array` | Sólo `worker-mail` |
| — | `MAIL_DB_PASSWORD` | la genera `init-env.sh` | `.env`; la leen `mysql`, `grants`, `db-grants` y `worker-mail` |
| — | `MAILPIT_PORT` | `8025` | Sólo el perfil `dev` |

`config('taller.features')` desaparece. `GET /api/session` toma las dos banderas de `App\Auth\Features` (research.md, R7).

## 9. Qué prueba el esquema y los permisos

| Prueba | Archivo | Qué exige |
| --- | --- | --- |
| A | `tests/Feature/MailJobsSchemaTest.php` | Lo exige leyendo `information_schema`, no la migración: `mail_jobs` tiene las siete columnas con su tipo y su nulidad, es InnoDB, tiene la clave primaria `(id)` y el índice `mail_jobs_queue_index (queue)`, y ninguna clave foránea |
| B | `tests/Content/MigrationsTest.php` (cambia) | Al deshacer, `mail_jobs` no existe; al migrar otra vez, su `SHOW CREATE TABLE` es el mismo |
| C | `tests/Feature/UserDataCoverageTest.php` (sin cambios) | Sigue en verde: `mail_jobs` no tiene `user_id` |
| D | `tests/Feature/Mail/MailJobsAtRestTest.php` | Con la cola `database` real, ni `mail_jobs.payload` ni `jobs.payload` contienen el email, el nombre ni el link de la persona |
| E | `tests/Content/MailUserPrivilegesTest.php` | Con los permisos que salen de `db-grants.sql`, el usuario hace todo lo de la tabla 7 y recibe 1142 o 1143 en el resto, y el worker real envía con él |
