# Data Model: C3a · Identidad y acceso: autenticación

**Input**: [spec.md](./spec.md), ADR 0006 §5.2 y §5.5 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)) y las decisiones de [research.md](./research.md).

> **El DDL es de referencia y no se ejecutó.** Esta planificación no tuvo MySQL: el SQL sale del ADR y del estilo de las migraciones de C2 (un `CREATE TABLE` con claves y restricciones en línea, restricciones con nombre). El juez es la prueba de esquema del paso 1.1 del plan, cuyas expectativas salen del ADR y no de las migraciones. Si el DDL de abajo y la prueba discrepan, se corrige el DDL.

## Entidades

| Entidad (spec) | Almacén | Quién la escribe | Cuánto vive |
| --- | --- | --- | --- |
| Cuenta | `users` | `Invitations::accept` (alta); `AccountPasswords::set` y `MeController` (contraseña, nombre, aviso); `AccountSessions` (token de «recordarme»). El rol y el estado no se escriben por HTTP | Mientras exista la cuenta |
| Invitación | `invitations` | `taller:invite`, y `Invitations::accept` (la borra) | Hasta aceptarse; vencida, 30 días más y se poda |
| Sesión | `sessions` (driver `database`) | El middleware de sesión de Laravel en cada pedido; `AccountSessions` y la poda las borran | 30 minutos de inactividad |
| Token de recuperación | `password_reset_tokens` (broker de Laravel) | `taller:password-reset-link`; el broker lo borra al usarse | 60 minutos |
| Contador de fallos y bloqueo | `cache` (claves de abajo) | `LoginPipeline`, `PasswordProof` y el restablecimiento (lo limpia) | 24 horas desde el último fallo; 30 días si llegó a 100 |
| Cookie de dispositivo | Navegador; sin tabla | `DeviceCookie` al ingresar | 180 días |
| Aviso de privacidad | `users.privacy_version` y `privacy_accepted_at` | `Invitations::accept` y `POST /api/me/privacy` | Mientras exista la cuenta |
| Cuenta esperada | Cabecera `X-Taller-User` | El cliente, en cada pedido que modifica | Un pedido |
| Contenido y catálogos | Las tablas de C2 | `content:import` (sólo lectura acá) | — |
| Lista de contraseñas bloqueadas | `backend/api/resources/passwords/blocked-15plus.txt` | Se descarga y filtra una vez, con permiso | Versionada en Git |

## Migraciones: nombres y orden

Siete archivos, una tabla por archivo, en el bloque `2026_10_05_200001` a `2026_10_05_200099`, que ordena después de las 21 de C2 (`2026_10_05_100001` a `100021`) y antes de lo que sume C3b, B2 o D1 (cuyas claves apuntan a `users`). Cada `up()` es una sentencia atómica por tabla (ADR 0006 D35); donde dice «(dos sentencias)» son el relleno previo y el `ALTER`.

| Archivo | Tabla | Qué hace |
| --- | --- | --- |
| `2026_10_05_200001_alter_users_table.php` | `users` | `ALTER` único: rol, estado, aviso, colación del email, instantes a `DATETIME(3)`, índice y CHECK (dos sentencias) |
| `2026_10_05_200002_create_invitations_table.php` | `invitations` | `CREATE TABLE` nueva |
| `2026_10_05_200003_recreate_password_reset_tokens_table.php` | `password_reset_tokens` | `DROP` y `CREATE`: está vacía y nadie la usa todavía |
| `2026_10_05_200004_recreate_sessions_table.php` | `sessions` | `DROP` y `CREATE`: está vacía y nadie la usa todavía |
| `2026_10_05_200005_recreate_cache_table.php` | `cache` | `CREATE` de una tabla nueva, `RENAME TABLE` atómico y `DROP` de la vieja: el `php` anterior sigue leyéndola mientras corre `migrate` |
| `2026_10_05_200006_recreate_cache_locks_table.php` | `cache_locks` | Igual que `cache` |
| `2026_10_05_200007_alter_failed_jobs_table.php` | `failed_jobs` | `ALTER` del instante `failed_at` |

`down()` sirve sólo en desarrollo y vuelve a la forma de C1. El de `users` falla si ya hay emails que sólo difieren en acentos, y volver a `TIMESTAMP` falla fuera de 1970 a 2038 (ADR 0006 §10). Cada `down()` se prueba con migrar, deshacer y migrar (paso 1.1).

## 1. `users` (`ALTER`)

El relleno corre antes, en una sentencia aparte. La tabla está vacía en producción y a lo sumo tiene el usuario de prueba del seeder en desarrollo, así que el `COPY` no pesa.

```sql
UPDATE `users`
SET `created_at` = COALESCE(`created_at`, NOW(3)),
    `updated_at` = COALESCE(`updated_at`, NOW(3)),
    `email_verified_at` = COALESCE(`email_verified_at`, NOW(3));

ALTER TABLE `users`
  MODIFY `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
  MODIFY `email_verified_at` DATETIME(3) NULL,
  ADD COLUMN `role` ENUM('admin','student') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'student' AFTER `password`,
  ADD COLUMN `status` ENUM('active','disabled','deleting') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active' AFTER `role`,
  ADD COLUMN `privacy_version` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER `status`,
  ADD COLUMN `privacy_accepted_at` DATETIME(3) NULL AFTER `privacy_version`,
  MODIFY `created_at` DATETIME(3) NOT NULL,
  MODIFY `updated_at` DATETIME(3) NOT NULL,
  ADD INDEX `users_role_status_index` (`role`, `status`),
  ADD CONSTRAINT `users_privacy_check` CHECK ((`privacy_version` IS NULL) = (`privacy_accepted_at` IS NULL));
```

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | Sin cambios (C1) |
| `name` | `VARCHAR(255)` | De 1 a 80 caracteres en la app, ya recortado, sin caracteres de control; se muestra escapado (FR-001) |
| `email` | `VARCHAR(255)`, `utf8mb4_0900_as_ci` | Se guarda sin espacios y en minúsculas; único; sin `CHECK` (ADR 0006 §3.1) |
| `email_verified_at` | `DATETIME(3) NULL` | Lo completa la aceptación de una invitación |
| `password` | `VARCHAR(255)` | Hash bcrypt de 12 rondas, siempre de `AccountPasswords`; oculto |
| `role` | `ENUM('admin','student')`, por omisión `student` | No asignable en masa |
| `status` | `ENUM('active','disabled','deleting')`, por omisión `active` | No asignable en masa; sólo `active` entra |
| `privacy_version` y `privacy_accepted_at` | `VARCHAR(32)` ascii y `DATETIME(3)`, nulos juntos | `users_privacy_check` |
| `remember_token` | `VARCHAR(100) NULL` | Sin cambios; sólo estudiantes; se rota al salir y al cambiar o restablecer la contraseña |
| `created_at`, `updated_at` | `DATETIME(3) NOT NULL` | UTC; antes `TIMESTAMP` |

La clave única `users_email_unique` de C1 se reconstruye sola con la colación nueva. No hay `last_login_at` ni columnas de 2FA (R3, R5).

## 2. `invitations`

```sql
CREATE TABLE `invitations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
  `role` ENUM('admin','student') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'student',
  `delivery` ENUM('email','link') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `invited_by` BIGINT UNSIGNED NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `sent_at` DATETIME(3) NULL,
  `send_failed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invitations_email_unique` (`email`),
  UNIQUE KEY `invitations_token_hash_unique` (`token_hash`),
  KEY `invitations_invited_by_index` (`invited_by`),
  KEY `invitations_expires_at_index` (`expires_at`),
  CONSTRAINT `invitations_invited_by_foreign` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `invitations_token_hash_check` CHECK (REGEXP_LIKE(`token_hash`, '^[0-9a-f]{64}$', 'c')),
  CONSTRAINT `invitations_expiry_check` CHECK (`expires_at` > `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

- `delivery` es `link` para todo lo que crea C3a (`taller:invite`). `email` y las columnas `sent_at` y `send_failed_at` son de C3b: la tabla nace completa para no alterarla después (D28).
- `token_hash` es el sha256 en hexadecimal del texto del token tal como viaja en el link. El token es el texto en base64url sin relleno de 32 bytes aleatorios (43 caracteres) y nunca se guarda.
- `invited_by` es `NULL` si la creó la consola, que es el único camino de C3a.
- `invitations_expiry_check` compara `expires_at` y `created_at`, que no tienen acción referencial (D07). El tamaño de la tabla es el de las invitaciones pendientes.
- El rol de la invitación vence a los 7 días para `student` y a las 48 horas para `admin`, contados desde que se crea o se renueva.

## 3. `password_reset_tokens`

```sql
CREATE TABLE `password_reset_tokens` (
  `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(3) NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

Sin clave foránea: el broker busca por email. `token` es el hash bcrypt del token (lo escribe el broker de Laravel). El broker vence el token a los 60 minutos y no emite otro antes de 60 segundos (`config/auth.php`, `expire` y `throttle`, que ya valen 60). Lo poda `auth:clear-resets` cada 15 minutos.

## 4. `sessions`

```sql
CREATE TABLE `sessions` (
  `id` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `ip_address` VARCHAR(45) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `user_agent` TEXT NULL,
  `payload` LONGTEXT NOT NULL,
  `last_activity` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`),
  CONSTRAINT `sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`user_id` es `NULL` en una sesión de invitado. La clave foránea en cascada es la limpieza del driver `database`: la revocación no depende de ella (FR-007). `payload` va cifrado (`SESSION_ENCRYPT=true`). `ip_address` es un dato personal transitorio que no se expone.

## 5. `cache` y `cache_locks`

```sql
CREATE TABLE `cache_next` (
  `key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `value` MEDIUMTEXT NOT NULL,
  `expiration` BIGINT NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;

RENAME TABLE `cache` TO `cache_previous`, `cache_next` TO `cache`;
DROP TABLE `cache_previous`;
```

`cache_locks` es igual, con `key` en `utf8mb4_0900_bin`, `owner VARCHAR(255)`, `expiration BIGINT` y `cache_locks_expiration_index`, por el mismo camino (`cache_locks_next`, `cache_locks_previous`). El índice de `expiration` conserva el nombre que `Schema::create` le dio en C1 (`cache_expiration_index`, `cache_locks_expiration_index`). Una clave en `utf8mb4_0900_bin` distingue acentos y mayúsculas: dos claves del limitador que difieren en una tilde ya no comparten contador (ADR 0006 D03). La tabla es efímera: se pierde la caché de cuerpos, que el `content:import` de `migrate` vuelve a calentar y que el `php` anterior arma por su cuenta mientras tanto.

## 6. `failed_jobs`

```sql
ALTER TABLE `failed_jobs` MODIFY `failed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
```

## Estado en la caché

Las claves llevan el prefijo del store (`taller-cache-`). `email` es el email canónico (sin espacios y en minúsculas); `red` es la IPv4 o el /64 de IPv6 (`NetworkKey`). Todos los valores son enteros o arreglos simples: `cache.serializable_classes` es `false`.

| Clave | Quién | Valor | Vida |
| --- | --- | --- | --- |
| `login:attempts:email:<sha256(email)>:<red>` | `LoginThrottle` | Contador de `RateLimiter`, tope 5 | 60 s |
| `login:attempts:network:<red>` | `LoginThrottle` | Contador, tope 60 | 60 s |
| `login:account:<sha256(email)>` | `AccountLockout` | `{fails: int, lockedUntil: int}` | 24 h desde el último fallo; 30 días si `fails` llega a 100 |
| `login:device-attempts:<deviceId>` | `DeviceCookie` | Contador, tope 5 | 60 s |
| `login:device-fails:<deviceId>` | `DeviceCookie` | Fallos seguidos de ese dispositivo | 24 h desde el último fallo |
| `proof:<userId>` | `PasswordProof` | Contador, tope 5 | 60 s |
| `content-body:<porción>:<sha256>` | C2 (`BodyCache`) | El cuerpo | 30 días |

Los límites de las invitaciones y del restablecimiento los lleva el middleware `throttle` de Laravel con los limitadores con nombre `invitations` y `reset-password`; sus claves son las del framework.

El bloqueo progresivo (FR-013): con `fails` de 1 a 9 no hay bloqueo; desde el décimo fallo, `lockedUntil = ahora + min(900, 60 × 2^(fails − 10))` segundos (60, 120, 240, 480 y desde el 14.º, 900); con `fails` de 100 o más, los dispositivos desconocidos no entran hasta que se restablezca la contraseña. Mientras dura el bloqueo, un intento no evalúa la contraseña y no suma un fallo.

## Estado en la sesión

| Clave | Quién la escribe | Para qué |
| --- | --- | --- |
| `login_web_<hash>` | El guard de Laravel | El id de la cuenta |
| `password_hash_web` | El guard (`login`) | El hash de la contraseña con que se ingresó; `AuthenticateSession` lo compara con el de la cuenta |
| `taller.authenticated_at` | `LoginPipeline` y `Invitations::accept`; `DropInvalidSession` la completa si falta (un ingreso por la cookie de recuerdo) | Instante (epoch) del ingreso, para el máximo de 8 horas |
| `auth.password_confirmed_at` | `ConfirmPasswordController` | Instante de la última confirmación; vale 900 segundos |
| `_token` | `PreventRequestForgery` | El token CSRF |

## Cookies

| Cookie | Atributos | Contenido |
| --- | --- | --- |
| `taller-session` | HttpOnly, `SameSite=Lax`, ruta `/`, cifrada; sin `Secure` hasta C4 | El id de la sesión |
| `XSRF-TOKEN` | No HttpOnly (el front la lee), `SameSite=Lax`, cifrada | El token CSRF, que el front devuelve en `X-XSRF-TOKEN` |
| `taller-device` (nombre de `taller.device_cookie.name`) | HttpOnly, `SameSite=Lax`, ruta `/`, sin `Domain`, 180 días, cifrada y firmada por `EncryptCookies`; `Secure` por configuración (`taller.device_cookie.secure`) | `{uid: id de la cuenta, did: 128 bits aleatorios en hexadecimal}` |
| `remember_web_<hash>` | HttpOnly, 30 días, la emite el guard | `id|remember_token|hash` de la contraseña; sólo estudiantes que lo pidieron |

## Transiciones

**Cuenta** (`status`): `active` → `disabled` (por consola con `tinker` hasta C3b) → `active`. `deleting` lo crea C3b. Sólo `active` entra. Cuando la cuenta deja de estar `active`, o cambia su contraseña, las sesiones viejas dejan de servir en el siguiente pedido (FR-007).

**Invitación**: no existe → pendiente (`taller:invite`) → aceptada (se borra con la creación de la cuenta). Una pendiente o vencida se renueva con `taller:invite`: rota el token, el rol y el vencimiento, y el link anterior deja de valer. Una vencida se borra 30 días después de vencer. Una aceptada, revocada o inventada responde 404; sólo la vencida responde 410.

**Sesión**: invitado (la crea `GET /api/session` o cualquier pedido sin cookie) → autenticada (ingreso o aceptación, con ID nuevo) → vencida por inactividad (30 minutos) o por antigüedad (8 horas, salvo «recordarme») → borrada. Una sesión también se descarta en el siguiente pedido si la cuenta no está `active`, si cambió la contraseña con que se ingresó o si la cuenta pasó a `deleting`.

**Bloqueo**: sin fallos → fallos seguidos (1 a 9) → bloqueado por tramos de 1, 2, 4, 8 y 15 minutos (10 a 13 fallos, y 15 minutos desde el 14.º) → bloqueado hasta restablecer (100 fallos). Lo limpian un ingreso correcto y `reset-password`. La cookie de dispositivo exime del bloqueo hasta 10 fallos seguidos del propio dispositivo.

## Qué prueba el esquema (paso 1.1)

Las expectativas salen del ADR 0006 §5.2 y §5.5, y se leen de `information_schema`, como `ContentSchemaTest`:

- **A.** Las siete tablas existen en InnoDB; ninguna columna de ellas es `TIMESTAMP` (los instantes son `datetime(3)`, salvo `sessions.last_activity` y las columnas de epoch de `cache`).
- **B.** Los tipos y las colaciones de las columnas de arriba: el email de `users`, de `invitations` y de `password_reset_tokens` en `utf8mb4_0900_as_ci`; `sessions.id`, `ip_address`, `token_hash` y los ENUM en `ascii_bin`; las claves de `cache` y `cache_locks` en `utf8mb4_0900_bin`; `sessions.last_activity` sin signo.
- **C.** Las claves únicas e índices con los nombres de arriba.
- **D.** Las claves foráneas: `sessions_user_id_foreign` en cascada, `invitations_invited_by_foreign` en `SET NULL`, las dos con `ON UPDATE RESTRICT`.
- **E.** Los CHECK por nombre (`users_privacy_check`, `invitations_token_hash_check`, `invitations_expiry_check`), aplicados.
- **F.** Migrar, deshacer los siete y migrar deja el mismo `SHOW CREATE TABLE` en las siete tablas.
- **G (FR-004).** Toda tabla con una columna `user_id` tiene una clave foránea a `users(id)` con `DELETE_RULE = CASCADE`; y toda tabla que referencia a `users` sin tener `user_id` está en una lista de excepciones (`invitations`, `password_reset_tokens`, `account_deletions`, `attempt_tests` y `attempt_payloads`). Hoy el recorrido sólo encuentra `sessions` y `invitations`. Cuando B2, D1 y C3b sumen tablas, la prueba las cubre sin cambiarse, y la lista de excepciones es lo único que se edita.

## Modelos de Eloquent

- **`User`**: `implements MustVerifyEmail` (sin eso, el middleware `verified` deja pasar a todos); casts `role` a `Role`, `status` a `AccountStatus`, `email_verified_at` y `privacy_accepted_at` a fecha con milisegundos (`$dateFormat = 'Y-m-d H:i:s.v'`); `#[Fillable(['name', 'email', 'password'])]` como hoy, así que `role` y `status` no se asignan en masa. `UserFactory` suma los estados `admin()`, `disabled()`, `deleting()`, `unverified()` y `withPassword(string $plain)`.
- **`Invitation`**: sólo la usan `Invitations` y `taller:invite`. Casts `role` a `Role` y los instantes con milisegundos; implementa `Prunable` (invitaciones con `expires_at` de hace más de 30 días).
- Los instantes que salen en el JSON van en ISO 8601 UTC con milisegundos y `Z`, con `App\Support\Iso8601`.
