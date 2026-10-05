# Implementation Plan: C3a · Identidad y acceso: autenticación

**Branch**: `004-c3-identidad-acceso` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-c3-identidad-acceso/spec.md`. Decisiones: [research.md](./research.md). Tablas: [data-model.md](./data-model.md). Contratos: [contracts/http.md](./contracts/http.md) y [contracts/console.md](./contracts/console.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completa la sección de tu dueño y las «Reglas para todos los agentes». `tasks.md` tiene una línea por tarea (T001…) y remite acá.
>
> **Código sin ejecutar.** Se planificó sin PHP, sin Composer y sin Docker. Nada de lo que sigue corrió: las firmas, el SQL y la configuración son referencia, y las pruebas son el contrato. La sección «Lo que quedó sin verificar» lista lo que hay que medir al implementar.
>
> **Línea de base.** El plan parte de `master` más C6 (PR #17: PHPStan en el nivel 9 y los registros de `app/Content/Record/`). Esta rama sólo tiene `master` en `0df5b07`, sin ese PR, así que el código de C6 se leyó de la rama `feat/c6-registros-tipados` (`afd00ac`). T001 trae C6 antes de empezar.

## Summary

C3a le da identidad al taller sin paquetes nuevos. Hay cuentas con rol y estado, una sesión de Laravel con CSRF, el ingreso con sus límites y su bloqueo, el alta por invitación de un solo uso, la recuperación por consola, el contenido de C2 detrás de la sesión, `GET /api/session` y la cuenta esperada en cada pedido que modifica. Además cierra lo que C2 le dejó a C3: los errores del framework en español y con `code`, el chequeo de transacciones largas con `db-grants`, el `scheduler`, la poda de lo vencido y el reenvío DNS. El enfoque:

- **Sin Fortify ni Sanctum.** El guard de sesión, `Hash`, el broker de contraseñas, `RateLimiter` y `Timebox` hacen lo que el ADR 0006 le pedía a Fortify (research.md, R1 y R2). El montaje es un grupo `api` con seis middleware (cinco de D16 con `DropInvalidSession` en lugar de `AuthenticateSession`, más el identificador del pedido) y un grupo `account` que B2 y D1 usan para sus rutas.
- **La revocación no depende del driver.** `DropInvalidSession` descarta una sesión de una cuenta que dejó de estar `active`, que cambió su contraseña o que pasó su máximo; el grupo `account` responde 403 o 401. `GET /api/session`, que es pública, responde `user: null` en esos casos (R3).
- **Un solo punto para toda contraseña.** `PlainPassword` normaliza a NFC y sólo `AccountPasswords` toca `Hash` (research.md, R5).
- **El esquema primero.** Siete migraciones en el bloque `2026_10_05_2000NN`, con la prueba de esquema escrita desde el ADR antes que el DDL.
- **Los contratos están escritos antes del código.** Los errores, las rutas, los comandos y las cookies están en `contracts/`; B2 y D1 se apoyan en ellos sin leer el código.
- **Operación probada.** El chequeo de transacciones largas falla cerrado y se prueba con un usuario restringido (criterio J); el DNS, los límites de Nginx y los registros sin secretos tienen su comprobación contra el stack.

## Technical Context

**Language/Version**: PHP 8.5 (FPM) y Laravel 13.34 (`composer.lock`) en `backend/api/`, sin sintaxis posterior a PHP 8.3 (`composer.json` pide `^8.3`) y sin `declare(strict_types=1)`.

**Primary Dependencies**: ninguna nueva. Se declara en `composer.json` `symfony/polyfill-intl-normalizer` (v1.43.0), que `composer.lock` ya trae por `symfony/string`: no suma un paquete, y la resolución consulta Packagist, así que pide permiso (T002). Se usan Larastan 3.12.3, PHPStan 2.2.17 y Pest 5.3, ya instalados.

**Storage**: MySQL 9.7. Siete tablas nuevas o cambiadas ([data-model.md](./data-model.md)); sesiones, caché y límites en el driver `database`.

**Testing**: Pest contra `mysql-test` (`npm run api:test`), con las suites `Unit`, `Feature` y `Content`; PHPStan en el nivel 9 que fija `phpstan.neon` desde C6 (`npm run api:analyse`) y Pint. Las pruebas de sesión, límites, bloqueo y restablecimiento fijan los drivers `database` por prueba (`Browser::useDatabaseDrivers()`). Contra el stack levantado: `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.

**Target Platform**: Docker Compose en un servidor, Linux o macOS. Cada dueño usa su propio `COMPOSE_PROJECT_NAME`.

**Project Type**: servicio web (API Laravel) con Nginx delante.

**Performance Goals**: 40 alumnos tras una misma IP ingresan en un minuto sin un 429 (SC-010). El ingreso tarda al menos 200 ms a propósito. Cada pedido con sesión escribe una fila de `sessions`: no se mide ni se ajusta FPM o el buffer pool sin una medición que lo pida (§9).

**Constraints**:

- los mismos bytes, validadores y cabeceras del contenido, con sesión;
- `php` sin salida a Internet: nada consulta una red (la lista de contraseñas es local);
- sin descargas salvo las dos con permiso del usuario (la lista y la declaración del polyfill);
- los tokens viajan sólo en el fragmento y en el cuerpo de un `POST`;
- sin `@phpstan-ignore` ni baseline.

**Scale/Scope**: 12 endpoints nuevos y las 6 rutas de contenido protegidas; 7 tablas; 2 servicios de Compose (`scheduler` y `db-grants`); unos 70 archivos nuevos en `app/`, 7 migraciones, unos 55 archivos de prueba y 28 tareas en cinco ondas (de la 0 a la 4).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.3.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `backend/api/AGENTS.md`: Collections y `Arr::` para los arreglos, Pest contra MySQL real, tablas con un `CREATE TABLE` por migración. T026 actualiza esa guía, `docs/architecture.md` y el comentario de `bootstrap/app.php` en el mismo cambio (FR-052). |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con las pruebas, que fallan por la razón que dice el paso. Los esperados salen de afuera del código probado: los códigos y mensajes, de `contracts/http.md`; los números de los límites, del ADR; los catálogos y el sha256 de las porciones, del meta del generador; el esquema, de las tablas del ADR y no de las migraciones. Dos trampas del plan: el CSRF no corre en las pruebas (R7) y un chequeo con relojes no mide el tiempo de pared (R21). |
| III. Código entendible | Sí, con revisión | Clases chicas con nombre y contrato. Para revisar por cohesión y complejidad: `LoginPipeline` (se parte en pasos con nombre, uno por paso del ADR) y `DropInvalidSession` (una tabla de decisión). |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | No cambia ningún ID, fila ni byte del contenido. La lista de contraseñas bloqueadas es un archivo versionado con su origen y su licencia. |
| V. Capas y contratos explícitos | Sí | Dominio (`app/Auth`), transporte (`app/Http`), operación (`app/Operations`, `app/Console`) y contratos (`contracts/`). Ningún framework ni dependencia nueva. La enmienda de D17 (sin Fortify) queda registrada como pendiente del ADR 0006 en la hoja de ruta. |
| VI. Español, accesibilidad y portabilidad | Sí | Los mensajes de la API y de la consola, en español; el código y las pruebas, en inglés. No hay interfaz: las pantallas son del front. Los comandos son de POSIX `sh` y portables. |
| VII. Secretos y salidas generadas fuera de Git | Sí | `LOG_HMAC_KEY` vive en el `.env` de la raíz, que `init-env.sh` completa. Las dos descargas piden permiso con nombre, origen, tamaño y licencia. No hay secretos ni rutas locales en el repositorio. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. Lo que falte lo agrega `/speckit-converge` al final; al entregar, el directorio queda inmutable. |

## Project Structure

### Documentation (this feature)

```text
specs/004-c3-identidad-acceso/
├── spec.md              # qué y por qué, con el clarify del 2026-10-05
├── research.md          # decisiones de diseño, alternativas y cómo se verificaron
├── data-model.md        # las siete tablas, la caché, la sesión, las cookies y las transiciones
├── contracts/
│   ├── http.md          # endpoints, errores, cookies y lo que consumen B2 y D1
│   └── console.md       # comandos, tareas programadas, servicios y variables
├── quickstart.md        # escenarios de validación con sus comandos
├── plan.md              # este archivo: cómo, repartido en dueños
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

```text
backend/api/
├── app/
│   ├── Auth/            (nuevo) dominio: enums, valores, contraseñas, límites, sesión, invitaciones
│   ├── Http/            ApiError (cambia); ApiCode, ApiExceptions (nuevos)
│   │   ├── Controllers/ SessionController, MeController, Auth/{Login,Logout,ConfirmPassword,Invitation,ResetPassword}Controller
│   │   ├── Middleware/  AssignRequestId, DropInvalidSession, EnsureUserIsActive, EnsureExpectedAccount,
│   │   │                EnsureEmailIsVerified, RequirePassword
│   │   └── Requests/    LoginRequest, ConfirmPasswordRequest, UpdateNameRequest, ChangePasswordRequest,
│   │                    PrivacyRequest, LogoutOthersRequest, InvitationTokenRequest, AcceptInvitationRequest,
│   │                    ResetPasswordRequest
│   ├── Models/          User (cambia), Invitation (nuevo)
│   ├── Console/Commands/ InviteUser, IssuePasswordResetLink, CheckLongTransactions, PruneSessions, PruneCache
│   ├── Operations/      LongTransactionCheck, LongTransactionsOpen, CheckUnavailable
│   ├── Logging/         RequestContext, SecretScrubber
│   ├── Database/        WriteTransaction
│   ├── Support/         Iso8601
│   └── Content/         ActiveCatalogs (nuevo); ContentImports y Record/Catalog (cambian)
├── bootstrap/app.php    (cambia: errores, grupos, alias y archivos de rutas)
├── config/              taller.php y hashing.php (nuevos); app, session, auth, logging (cambian)
├── database/            7 migraciones 2026_10_05_2000NN_*; UserFactory (cambia)
├── docker/migrate.sh    (cambia: el chequeo previo)
├── lang/es/             api, validation, auth, passwords, password-policy
├── resources/passwords/ blocked-15plus.txt y SOURCE.md
├── routes/              api.php (cambia: el contenido, detrás de la sesión); api/account.php y api/access.php
│                        (nuevos); console.php (cambia: el scheduler)
├── scripts/             init-env, smoke, deploy, deploy-check (cambian); check-account.sh (nuevo)
└── tests/               Unit/, Feature/, Content/ y Support/Browser.php, Support/RestrictedMysqlUser.php (nuevos)
docker/                  compose.yaml y nginx/nginx.conf (cambian); mysql/db-grants.sql (nuevo)
qa/                      api-content-check.ts (cambia); lib/api-account.ts (nuevo)
backend/api/AGENTS.md  docs/architecture.md                                                    (T026)
```

**Structure Decision:** el dominio de identidad vive en `app/Auth/`, una carpeta por responsabilidad como `app/Content/`; el transporte, en `app/Http/`; lo que corre fuera de un pedido, en `app/Console/` y `app/Operations/`. Cada característica de rutas tiene su archivo en `routes/api/`, que `bootstrap/app.php` lista en `withRouting(api: [...])`: dos dueños no tocan el mismo archivo de rutas, y B2 y D1 siguen el mismo patrón. Sin barrels ni capas nuevas.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo. Sin Fortify, todo lo que sigue es código propio: un error acá es una vulnerabilidad (riesgo 5 de la spec).

- **Enumeración y tiempo.**
  - Un email inexistente, una contraseña equivocada y una cuenta `deleting` dan el mismo estado, el mismo cuerpo y el mismo piso de 200 ms. El hash ficticio tiene el costo configurado.
  - El 429 del bloqueo depende del email canónico y de la cookie, nunca de si la cuenta existe.
  - `reset-password` da el mismo 422 para un token inválido, uno vencido, una cuenta inexistente y una que no está `active`; el 422 por política no revela si el token servía.
  - La invitación usada, revocada o inventada da el mismo 404.
- **La revocación sin el driver.** Ninguna prueba de revocación borra la fila de `sessions` al preparar el escenario (sólo cambia la cuenta) y todas comprueban que la sesión ya no sirve en el pedido siguiente. `AuthenticateSession` se usa como sonda, no se copia. Mirá el orden efectivo del grupo `api` (el ordenador de middleware de Laravel puede reubicar los que están en su lista de prioridad).
- **Una sola puerta para las contraseñas.** Ninguna clase fuera de `AccountPasswords` usa `Hash`, ni `Auth::attempt` (su rehash automático hashearía la cadena sin normalizar). Cada ruta que fija o verifica una contraseña tiene su prueba con la `á` descompuesta y compuesta.
- **CSRF y cuenta esperada.** El orden es 419, sesión descartada, 401, 409 y 403 de `verified`. Las pruebas de 419 tienen que cambiar el entorno (el CSRF se salta en las pruebas); sin eso, pasarían sin probar nada. El recorrido de rutas es por defecto cerrado: una ruta nueva sin el grupo `account` y fuera de la lista blanca falla.
- **Secretos.** Los tokens de invitación y de restablecimiento viajan sólo en el fragmento y en el cuerpo de un `POST`; `SecretScrubber` los quita de los registros (también de un `QueryException`); Nginx registra `/api/` sin la query string; la base guarda sólo hashes.
- **El contenido no cambia.** Con sesión, el sha256 de cada porción y de cada ejercicio es el del generador; `Cache-Control: private, no-cache` sin tocar y sin `Vary`. El diff de `ContentEndpointTest` no cambia ningún valor esperado, sólo autentica.
- **Nivel 9.** Sin baseline, sin `@phpstan-ignore` y sin casts de `mixed`: los accesores tipados de la configuración y del pedido (research.md, R18).
- **Falla cerrado.** El chequeo de transacciones largas (error 1142, instrumentación apagada, no verse a sí mismo), la lista blanca de rutas y el ancla de pruebas de `LOG_HMAC_KEY`.
- **Lo que C4 endurece sin tocar código.** El nombre y los atributos de la cookie de dispositivo salen de `taller.device_cookie` (no de `APP_ENV`) y ya cumplen las reglas de `__Host-`; `docker/mysql/db-grants.sql` es el único archivo de usuarios y privilegios; `trustProxies` queda vacío y una prueba lo exige (los límites por red cuentan `REMOTE_ADDR`); `init-env.sh` tiene un solo dueño de su estructura.
- **El esquema.** Las colaciones (`as_ci` y `0900_bin`), la cascada de `sessions`, el `SET NULL` de `invitations`, los CHECK con nombre y el intercambio atómico de `cache` y `cache_locks`.
- **Complejidad.** `LoginPipeline` y `DropInvalidSession` pueden pasar de 10 caminos: se revisan por pasos con nombre y por su tabla de pruebas, no se fragmentan por una cuota.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | Coordinador | T001 a T003: C6 integrado, el polyfill declarado y la lista de contraseñas (las dos con permiso) |
| 1 | S, P, F, O, a la vez | **S**: T004 a T006, el esquema y los modelos. **P**: T007 y T008, las piezas puras. **F**: T009, los errores, los mensajes y la configuración. **O**: T012 y T013, la infraestructura y el chequeo de transacciones largas |
| 2 | F, L, O, a la vez (desde S1) | **F**: T010, la sesión. **L**: T011, los límites. **O**: T014 y T015, las podas y los registros |
| 3 | I y A, a la vez (desde S2) | **I**: T016 a T018, las invitaciones y el restablecimiento. **A**: T019 a T021, el ingreso, `GET /api/session` y la cuenta propia |
| 4 | Coordinador y O (desde S3) | T022 y T023, el contenido detrás de la sesión y los recorridos; T024 y T025, los checks contra el stack; T026 a T028, la documentación, el navegador y la compuerta |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| Coordinador | `backend/api/composer.json`, `backend/api/composer.lock`, `backend/api/resources/passwords/blocked-15plus.txt`, `backend/api/resources/passwords/SOURCE.md`, `backend/api/routes/api.php`, `backend/api/app/Providers/AppServiceProvider.php`, `backend/api/tests/Content/ContentEndpointTest.php`, `backend/api/tests/Content/ContentAccessTest.php`, `backend/api/tests/Feature/RouteAccessTest.php`, `backend/api/tests/Feature/ExpectedAccountMatrixTest.php`, `backend/api/tests/Feature/MassAssignmentTest.php`, `backend/api/tests/Feature/LogsWithoutSecretsTest.php`, `backend/api/AGENTS.md`, `AGENTS.md`, `README.md`, `docs/architecture.md`, `specs/backend-multiusuario/roadmap.md` | todo | la línea de base, las dos descargas, el contenido detrás de la sesión, los recorridos, la documentación y la evidencia de cierre |
| S · Esquema | `backend/api/database/migrations/2026_10_05_2000NN_*.php` (siete), `backend/api/app/Models/User.php`, `backend/api/app/Models/Invitation.php`, `backend/api/app/Auth/Role.php`, `backend/api/app/Auth/AccountStatus.php`, `backend/api/database/factories/UserFactory.php`, `backend/api/app/Database/WriteTransaction.php`, `backend/api/tests/Feature/IdentitySchemaTest.php`, `backend/api/tests/Feature/UserIdForeignKeyTest.php`, `backend/api/tests/Feature/UserModelTest.php`, `backend/api/tests/Feature/WriteTransactionTest.php`, `backend/api/tests/Content/MigrationsTest.php` | — | las tablas, `User` con `Role` y `AccountStatus`, `Invitation`, la fábrica con sus estados y `WriteTransaction::run()` |
| P · Piezas puras | `backend/api/app/Auth/{Email,EmailFingerprint,NetworkKey,PlainPassword,AccountPasswords,PasswordPolicy,PasswordViolation,BlockedPasswords,PrivacyNotice,PublishedUser,InvitationToken}.php`, `backend/api/app/Support/Iso8601.php`, `backend/api/lang/es/password-policy.php`, `backend/api/tests/Unit/Auth/`, `backend/api/tests/Unit/Support/`, `backend/api/tests/Unit/ArchitectureTest.php`, `backend/api/tests/Support/fixtures/blocked-sample.txt` | — | los valores y reglas que usan todos |
| F · Fundación HTTP | `backend/api/app/Http/{ApiCode,ApiError,ApiExceptions}.php`, `backend/api/app/Http/Middleware/`, `backend/api/app/Auth/{AccountSessions,DropReason}.php`, `backend/api/bootstrap/app.php`, `backend/api/config/{taller,hashing,app,session,auth}.php`, `backend/api/lang/es/{api,validation,auth,passwords}.php`, `backend/api/tests/Support/Browser.php`, `backend/api/tests/Unit/ApiCodeTest.php`, `backend/api/tests/Feature/{ApiExceptionsTest,ApiErrorsTest,ConfigTest,HealthTest}.php`, `backend/api/tests/Feature/Session/` | S y P | los errores con código, los grupos `account` y `api`, `AccountSessions` y el `Browser` de pruebas |
| L · Límites | `backend/api/app/Auth/{LoginThrottle,AccountLockout,LockoutState,DeviceCookie,DeviceToken,PasswordProof,ProofResult,Limiters}.php`, `backend/api/tests/Feature/Limits/` | S, P y F | el límite, el bloqueo, la cookie de dispositivo y la prueba de contraseña |
| O · Operación | `docker/compose.yaml`, `docker/nginx/nginx.conf`, `docker/mysql/db-grants.sql`, `backend/api/scripts/{init-env,smoke,deploy,deploy-check}.sh`, `backend/api/scripts/check-account.sh`, `backend/api/.env.example`, `backend/api/docker/migrate.sh`, `backend/api/app/Operations/`, `backend/api/app/Console/Commands/{CheckLongTransactions,PruneSessions,PruneCache}.php`, `backend/api/routes/console.php`, `backend/api/app/Logging/`, `backend/api/config/logging.php`, `qa/lib/api-account.ts`, `qa/api-content-check.ts`, `backend/api/tests/Content/LongTransactionTest.php`, `backend/api/tests/Unit/MigrateScriptTest.php`, `backend/api/tests/Feature/{PruneTest,ScheduleTest}.php`, `backend/api/tests/Unit/Logging/`, `backend/api/tests/Support/RestrictedMysqlUser.php` | S, P y F | el stack con sus servicios, el chequeo previo, las podas, los registros y los checks |
| I · Invitaciones | `backend/api/app/Auth/{Invitations,IssuedInvitation,InvitationNotFound,InvitationExpired,EmailTaken,PasswordResetLinks,IssuedResetLink,ResetLinkThrottled,AccountNotActive}.php`, `backend/api/app/Console/Commands/{InviteUser,IssuePasswordResetLink}.php`, `backend/api/app/Http/Controllers/Auth/{InvitationController,ResetPasswordController}.php`, `backend/api/app/Http/Requests/{InvitationTokenRequest,AcceptInvitationRequest,ResetPasswordRequest}.php`, `backend/api/routes/api/access.php`, `backend/api/tests/Feature/Invitations/`, `backend/api/tests/Feature/Console/`, `backend/api/tests/Feature/Auth/ResetPasswordTest.php`, `backend/api/tests/Content/InvitationRaceTest.php` | S, P, F y L | el alta y la recuperación |
| A · Cuenta | `backend/api/app/Auth/{LoginPipeline,LoginOutcome,LoginResult}.php`, `backend/api/app/Http/Controllers/{SessionController,MeController}.php`, `backend/api/app/Http/Controllers/Auth/{LoginController,LogoutController,ConfirmPasswordController}.php`, `backend/api/app/Http/Requests/{LoginRequest,ConfirmPasswordRequest,UpdateNameRequest,ChangePasswordRequest,PrivacyRequest,LogoutOthersRequest}.php`, `backend/api/app/Content/ActiveCatalogs.php`, `backend/api/app/Content/ContentImports.php`, `backend/api/app/Content/Record/Catalog.php`, `backend/api/routes/api/account.php`, `backend/api/tests/Feature/Auth/{LoginTest,LogoutTest,RememberMeTest,SessionLifetimeTest,ConfirmPasswordTest,MeTest}.php`, `backend/api/tests/Feature/SessionEndpointTest.php`, `backend/api/tests/Content/SessionEndpointTest.php`, `backend/api/tests/Unit/Record/CatalogFromRowTest.php` | S, P, F y L | el ingreso, la salida, `GET /api/session` y la cuenta propia |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 integrado. Todos parten de ahí.
- **S1:** T004 a T009 integrados (el esquema, las piezas puras y los errores). F (T010), L, y las podas y los registros de O parten de ahí.
- **S2:** T010 a T015 integrados. Con las líneas de integración de abajo. I y A parten de ahí.
- **S3:** T016 a T021 integrados. El coordinador y O cierran.

**Líneas de integración** (las pone el coordinador al integrar; ningún dueño toca esos archivos):

| Cuándo | Archivo | Línea |
| --- | --- | --- |
| S2 | `backend/api/app/Providers/AppServiceProvider.php`, en `boot()` | `Limiters::register();` y `Auth::guard('web')->setRememberDuration(config()->integer('taller.remember_days') * 1440);` |
| S3 | `backend/api/routes/api.php` | El contenido pasa a `Route::middleware(['account', 'verified'])->group(...)` (T022) |

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **B2 y D1** se planifican a la vez y dependen de C3a por `Auth::id()`, `users.status`, `X-Taller-User` y el cuerpo `{message, code}`. Lo que consumen está en [contracts/http.md](./contracts/http.md), «Para los ítems que se apoyan en C3a». Comparten con C3a `bootstrap/app.php`, `routes/console.php`, `config/`, `composer.json`, `phpstan.neon`, `docker/compose.yaml`, `docker/nginx/nginx.conf`, `lang/es` y `backend/api/AGENTS.md`. C3a no cambia `phpstan.neon` (el nivel 9 viene de C6) y sólo suma una línea a `composer.json` (T002). Mientras C3a se implementa, los dueños de arriba son los únicos que los editan; B2 y D1 empiezan cuando C3a se entrega (ola 3 de la hoja de ruta), y cada uno agrega su archivo en `routes/api/` en lugar de editar los de C3a.
- **El punto de extensión que B2 espera** (cancelar ejecuciones al deshabilitar, degradar o suprimir una cuenta) y `UserData` **no** los entrega C3a: ningún código de C3a hace esas tres cosas. Los trae C3b, y la prueba de esquema de FR-004 ya cubre las tablas de B2 y D1 sin cambiarse.
- **Zonas de Nginx.** B2 espera `limit_req_status 429` (T012); sus ubicaciones nuevas repiten el límite y los `fastcgi_param`. Las zonas y los límites por red suponen que `trustProxies` queda vacío (R22): C3a no lo configura y una prueba lo exige.
- **Timestamps de migraciones.** C3a reserva `2026_10_05_200001` a `200099`; C3b, B2 y D1 usan un bloque posterior, porque sus claves apuntan a `users`.
- **C4 (exposición).** Toma de C3a tres cosas, y ninguna exige cambiar código de C3a: la cookie de dispositivo, cuyo nombre y atributos salen de `taller.device_cookie` y que ya cumple las reglas de `__Host-` (basta `DEVICE_COOKIE_NAME` y `DEVICE_COOKIE_SECURE`); `docker/mysql/db-grants.sql`, el único archivo de usuarios y privilegios, que C4 extiende con sus usuarios por rol (supuesto de forma: su spec todavía no tiene clarify); y la IP del cliente, que C4 fija y de la que dependen los límites por red.
- **`init-env.sh`** lo tocan C3a, C3b y C4: el dueño de su estructura es C3a (T012). C3b y C4 sólo suman líneas `add_missing` con el mismo patrón.
- **C3b (correo y administración).** Toma `invitations` (nace completa), `role` y `status`, `AccountSessions::endAll`, el alias `password.confirm` con `RequirePassword::isConfirmed()` y `markConfirmed()`, la prueba de esquema de FR-004 con su lista de excepciones y los `features` de `GET /api/session`, que salen de `config('taller.features')`. `Invitations::issue` sólo crea invitaciones por link: C3b le suma el parámetro de entrega.
- **La limpieza al inglés y el épico del front** no tocan `backend/api/`.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md` y la constitución;
  - la spec, [contracts/http.md](./contracts/http.md), [contracts/console.md](./contracts/console.md), [data-model.md](./data-model.md), [research.md](./research.md) y tu sección;
  - las skills `tdd`, `laravel-tdd`, `laravel-security`, `laravel-specialist` y `php-pro`. Mandan el ADR y las decisiones del usuario: de las skills no se toman Sanctum, `Password::uncompromised()`, `Gate::before`, `strict_types` ni la meta de cobertura (research.md, R19).
- **TDD, siempre.**
  - Escribí las pruebas de tu paso y comprobá que fallan por la razón que dice el plan. Recién entonces implementá.
  - Si una prueba de C2 falla, el error está en el código nuevo: su valor esperado no se toca.
  - Un esperado sale del contrato, de la consigna o de un ejemplo resuelto aparte; nunca del código que probás.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos.** En cada terminal: `export COMPOSE_PROJECT_NAME=taller-c3a-<dueño>`, y un `.env` con `sh backend/api/scripts/init-env.sh`. Después:
  - `npm run api:test -- --filter=<Prueba>` y `npm run api:test -- --testsuite=Unit`;
  - `npm run api:analyse` (nivel 9, sin baseline: tu código tiene que dar 0 errores);
  - `npm run api:format:check`;
  - `npm run api:test:down`.

  Sólo O y el coordinador levantan el stack (`docker compose up`), con su propio `COMPOSE_PROJECT_NAME` y `TALLER_PORT`. Las imágenes y la caché están en la máquina: si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo.**
  - Código y pruebas en inglés. Los mensajes de la API salen de `lang/es`; los de la consola, literales en español, como los de C2.
  - Comentarios sólo en lo complejo o para una referencia (un ADR, un bug).
  - Sin `declare(strict_types=1)`, sin sintaxis posterior a PHP 8.3, sin `@phpstan-ignore` ni baseline. Los modismos del nivel 9 están en research.md, R18.
  - Los arreglos se transforman con Collections y `Arr::`; una `list<…>` tipada se arma con `foreach`.
  - Los datos de un pedido pasan de `FormRequest` a un registro `readonly` antes de salir del controlador.
  - Formato con Pint.
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva la prueba con lo que verifica. La evidencia de una tarea es su commit, y lo que midas va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Base (coordinador, onda 0)

**Cubre:** la línea de base y las dos descargas con permiso (FR-023, FR-024, FR-051).

**Entrega:** el árbol de C3a parte de `master` con C6, con la suite en verde y la lista de contraseñas guardada.

### Tarea 0.1 · La línea de base (T001)

**Pasos:**

1. Traé `master` con el PR #17 a la rama de trabajo (`git merge master`). Si `master` todavía no lo trae, integrá `feat/c6-registros-tipados` y avisá.
2. Corré `npm run api:format:check`, `npm run api:analyse` y `npm run api:test`. El análisis tiene que dar 0 errores en el nivel 9 que trae C6, sin baseline. Anotá el número de pruebas y de aserciones.
3. Mirá si `backend/api/app/Content/Record/Catalog.php` tiene `fromRow`. En `afd00ac` no la tiene (`Language.php` sí, y C6 dejó la de `Catalog` para su primer lector); T020 la suma si falta y, si el PR #17 mergeado ya la trae, sólo la usa.
4. Reservá el bloque de migraciones `2026_10_05_200001` a `200099` y avisá a quien planifica B2 y D1.

**Compuerta:** la suite en verde sobre la base y `git status` limpio.

### Tarea 0.2 · Declarar `symfony/polyfill-intl-normalizer` (T002)

**Pide permiso al usuario.** `composer.lock` ya trae el paquete (v1.43.0, por `symfony/string`) y `vendor/` lo instala: no baja nada nuevo, pero `composer require` consulta Packagist.

**Pasos:**

1. Con el permiso: `docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/backend/api":/app -w /app composer:2.10 require --no-install --no-scripts 'symfony/polyfill-intl-normalizer:^1.43'`.
2. `git diff backend/api/composer.json backend/api/composer.lock`: `composer.json` suma una línea en `require`; `composer.lock` sólo cambia su `content-hash`, y la lista de paquetes queda igual.
3. `npm run api:test`: verde.

**No bloquea** a los demás: la clase `Normalizer` ya está disponible por la dependencia transitiva.

### Tarea 0.3 · La lista de contraseñas bloqueadas (T003)

**Pide permiso al usuario**, con:

- nombre: `100k-most-used-passwords-NCSC.txt`;
- origen: `https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt`;
- tamaño: 835 538 bytes (confirmado con la API de GitHub el 2026-10-05, sin descargar);
- licencia: SecLists es MIT; el origen y la licencia de los datos del NCSC no se pudieron confirmar, y hay que confirmarlos antes de publicar.

**Pasos:**

1. Con el permiso, bajá el archivo a un directorio temporal fuera del repositorio.
2. Filtralo: sólo las líneas de 15 caracteres o más, en minúsculas, sin repetidas y ordenadas: `LC_ALL=C awk 'length($0) >= 15' <archivo> | tr '[:upper:]' '[:lower:]' | LC_ALL=C sort -u > backend/api/resources/passwords/blocked-15plus.txt`.
3. Medí y anotá cuántas líneas y cuántos bytes quedan. Si quedan muy pocas, informalo: es la hipótesis de la spec (con un mínimo de 15 la lista filtra poco) y la política sigue valiendo por su mínimo.
4. Escribí `backend/api/resources/passwords/SOURCE.md` con el nombre, el origen, la fecha, el tamaño original y el filtrado, las dos licencias (la de los datos, sin confirmar) y el comando del filtro.
5. Commit: `chore(api): lista local de contraseñas bloqueadas (SecLists, NCSC)`, con la medición en el mensaje.

**Compuerta:** cada línea del archivo tiene 15 caracteres o más y está en minúsculas (`awk 'length($0) < 15' … | wc -l` da 0), y `SOURCE.md` está completo.

Hasta que llegue la lista, las pruebas usan una muestra propia (`tests/Support/fixtures/blocked-sample.txt`). Sin la lista real, `BlockedPasswords` falla en voz alta al usarse: la aceptación, el restablecimiento y el cambio de contraseña no aceptan contraseñas sin poder compararlas.

## 1. Esquema y cuentas (dueño S, onda 1)

**Cubre:** FR-001, FR-002 (la asignación en masa), FR-003 y FR-004; las tablas que usan FR-007, FR-017 y FR-022.

**Entrega:** al llegar S1, las siete tablas, `User` con su rol y su estado, `Invitation`, la fábrica con sus estados y `WriteTransaction`.

### Tarea 1.1 · Las pruebas de esquema, antes de las migraciones (T004)

- **Crea:** `backend/api/tests/Feature/IdentitySchemaTest.php` y `backend/api/tests/Feature/UserIdForeignKeyTest.php`.
- **Modifica:** `backend/api/tests/Content/MigrationsTest.php`.
- **Entrega:** las pruebas A a G de [data-model.md](./data-model.md), «Qué prueba el esquema».

**Pasos:**

1. Escribí `IdentitySchemaTest` con las expectativas del ADR 0006 §5.2 y §5.5, leídas de `information_schema` como `ContentSchemaTest`, sin mirar las migraciones. Cuántas columnas tiene cada tabla: `users` 12, `invitations` 11, `password_reset_tokens` 3, `sessions` 6, `cache` 3, `cache_locks` 3 y `failed_jobs` 7. Los ENUM de `role` y `status` con sus valores en ese orden, las colaciones, las claves, los índices y los tres CHECK por nombre.
2. Escribí `UserIdForeignKeyTest` (prueba G): toda columna `user_id` tiene una clave foránea a `users(id)` en cascada, y toda tabla que referencia a `users` sin `user_id` está en la lista de excepciones. Hoy encuentra `sessions` e `invitations`.
3. En `MigrationsTest`, el `--step` de la prueba «migrate, rollback and migrate» deja de ser `count(ContentDatabase::TABLES)`: pasa a ser el número de archivos de `database/migrations/` menos los tres de C1, para deshacer también las siete de C3a. Después de deshacer, `exercises` e `invitations` no existen; al migrar de nuevo, el `SHOW CREATE TABLE` de las 21 tablas de contenido y de las siete de identidad queda igual (prueba F).
4. Corré las tres: fallan por «la tabla `invitations` no existe» y «`users` no tiene la columna `role`», que es la razón esperada, y no por un error de sintaxis.

**Compuerta:** las tres fallan por esa razón y el resto de la suite sigue verde.

### Tarea 1.2 · Las siete migraciones (T005)

- **Crea:** las siete migraciones `backend/api/database/migrations/2026_10_05_2000NN_*.php` de [data-model.md](./data-model.md), «Migraciones: nombres y orden».

**Pasos:**

1. Escribí cada `up()` con el DDL de `data-model.md` en `DB::statement`, con el mismo encabezado que las de C2 («Source of truth: specs/004-c3-identidad-acceso/data-model.md»). `users` corre el relleno y el `ALTER`; `cache` y `cache_locks` crean la tabla nueva, la renombran con `RENAME TABLE` y borran la vieja. Escribí cada `down()`.
2. Corré las pruebas de 1.1: pasan.
3. Corré `npm run api:test` completo. Anotá el tiempo de `migrate:fresh`.

**Compuerta:** `IdentitySchemaTest`, `UserIdForeignKeyTest` y `MigrationsTest` en verde, y la suite entera en verde.

### Tarea 1.3 · Los modelos, la fábrica y `WriteTransaction` (T006)

- **Crea:** `backend/api/app/Auth/Role.php`, `backend/api/app/Auth/AccountStatus.php`, `backend/api/app/Models/Invitation.php`, `backend/api/app/Database/WriteTransaction.php`, `backend/api/tests/Feature/UserModelTest.php` y `backend/api/tests/Feature/WriteTransactionTest.php`.
- **Modifica:** `backend/api/app/Models/User.php` y `backend/api/database/factories/UserFactory.php`.
- **Entrega** (firmas de referencia):

```php
enum Role: string { case Admin = 'admin'; case Student = 'student'; }
enum AccountStatus: string { case Active = 'active'; case Disabled = 'disabled'; case Deleting = 'deleting'; }

// User implements MustVerifyEmail; casts: role => Role, status => AccountStatus, privacy_accepted_at => datetime;
// $dateFormat = 'Y-m-d H:i:s.v'; #[Fillable(['name', 'email', 'password'])] como hoy.
// UserFactory: admin(), disabled(), deleting(), unverified(), withPassword(string $plain)

final class WriteTransaction
{
    /**
     * READ COMMITTED y DB::transaction(..., attempts: 3), como pide D08 de todo escritor.
     *
     * @template T
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function run(Closure $callback): mixed;
}
```

**Pasos:**

1. `UserModelTest` y `WriteTransactionTest`, que fallan:
   - `User::create(['name' => 'Ana', 'email' => 'ana@x.com', 'password' => 'x', 'role' => 'admin', 'status' => 'disabled'])` guarda `student` y `active` (FR-002).
   - `role` y `status` salen como `Role` y `AccountStatus`; el estado `unverified()` no tiene el email verificado y `hasVerifiedEmail()` es falso; `created_at` guarda y devuelve `2026-10-05 12:00:00.123` con los milisegundos.
   - Dentro de `WriteTransaction::run`, `SELECT @@transaction_isolation` es `READ-COMMITTED`; fuera, `REPEATABLE-READ`.
2. Implementá `Role`, `AccountStatus`, `User`, `Invitation` (`Prunable`: `expires_at` de hace más de 30 días), la fábrica y `WriteTransaction` (la sesión en `READ COMMITTED` durante `DB::transaction` y el nivel anterior restaurado en un `finally`, para que cada reintento de un deadlock también corra en READ COMMITTED; research.md, «READ COMMITTED»).
3. `npm run api:analyse`: 0 errores en el nivel 9.

**Compuerta:** las pruebas en verde y la suite entera en verde. `backend/api/database/seeders/DatabaseSeeder.php` sigue creando su usuario por la fábrica, sin cambios.

## 2. Piezas puras (dueño P, onda 1)

**Cubre:** FR-023 y FR-024 (la política y la lista local), FR-035 (el usuario publicado), FR-022 (la versión del aviso) y los valores que usan los demás: el email canónico, la red, el token de invitación y la hora.

**Entrega:** los valores y reglas que usan todos los dueños, sin base de datos (salvo `AccountPasswords` y `PrivacyNotice`, que tocan un `User`).

### Tarea 2.1 · Email, red, token y hora (T007)

- **Crea:** `backend/api/app/Auth/{Email,EmailFingerprint,NetworkKey,InvitationToken}.php`, `backend/api/app/Support/Iso8601.php` y sus pruebas en `backend/api/tests/Unit/Auth/` y `backend/api/tests/Unit/Support/`.
- **Entrega** (firmas de referencia):

```php
final class Email { public static function canonical(string $raw): string; }   // recorte, NFC y mb_strtolower; conserva los acentos
final class EmailFingerprint { public static function of(string $email): string; }   // HMAC-SHA256 del email canónico con LOG_HMAC_KEY, 16 hexadecimales
final class NetworkKey { public static function of(?string $ip): string; }
final class InvitationToken {
    public static function generate(): string;                 // 32 bytes aleatorios en base64url sin relleno: 43 caracteres
    public static function hash(string $token): string;        // sha256 en hexadecimal
    public static function isWellFormed(string $token): bool;  // ^[A-Za-z0-9_-]{43}$
}
final class Iso8601 { public static function utc(CarbonInterface $instant): string; }
```

**Pasos:** las pruebas, con estos ejemplos resueltos aparte (fallan porque las clases no existen); después, la implementación.

| Qué | Entrada | Esperado |
| --- | --- | --- |
| `Email::canonical` | `'  Ana@X.com '` | `ana@x.com` |
| `Email::canonical` | `'PAPÁ@Ejemplo.com.ar'` | `papá@ejemplo.com.ar` (conserva la tilde) |
| `Email::canonical` | `"PA\u{0301}PA@Ejemplo.com"` (la `A` y U+0301) | `pápa@ejemplo.com`, con la `á` compuesta |
| `NetworkKey::of` | `'203.0.113.7'` | `203.0.113.7` |
| `NetworkKey::of` | `'2001:db8:1:2:aaaa:bbbb:cccc:dddd'` | `v6:20010db800010002` |
| `NetworkKey::of` | `'2001:db8:1:2::1'` y `'2001:db8:1:2:ffff:ffff:ffff:ffff'` | la misma clave que la anterior |
| `NetworkKey::of` | `'::ffff:203.0.113.7'` | `203.0.113.7` |
| `NetworkKey::of` | `null` y `'no-es-una-ip'` | `unknown` |
| `InvitationToken::hash` | `'abc'` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| `InvitationToken::isWellFormed` | 43 caracteres válidos; 42; uno con `+`; uno con `=` | verdadero; falso; falso; falso |
| `InvitationToken::generate` | dos llamadas | 43 caracteres válidos y distintos |
| `EmailFingerprint::of` | `'Ana@X.com'` con la clave `secret` | `8a7122f355ddfdc8`, igual que `'ana@x.com'` |
| `EmailFingerprint::of` | `'ana@x.com'` con la clave `otra-clave` | `738e0f38b85ed75e` |
| `EmailFingerprint::of` | cualquiera, sin clave configurada | `LogicException` |
| `Iso8601::utc` | `2026-10-12 15:30:00.123456` en UTC, y el mismo instante en `-03:00` | `2026-10-12T15:30:00.123Z` los dos |

**Compuerta:** las pruebas en verde y `npm run api:analyse` en 0.

### Tarea 2.2 · Contraseñas, aviso y usuario publicado (T008)

- **Crea:** `backend/api/app/Auth/{PlainPassword,AccountPasswords,PasswordPolicy,PasswordViolation,BlockedPasswords,PrivacyNotice,PublishedUser}.php`, `backend/api/lang/es/password-policy.php`, `backend/api/tests/Unit/Auth/…`, `backend/api/tests/Unit/ArchitectureTest.php` y `backend/api/tests/Support/fixtures/blocked-sample.txt`.
- **Entrega** (firmas de referencia):

```php
final readonly class PlainPassword
{
    public string $value;                                   // normalizada a NFC
    public static function of(string $raw): self;
    public function characters(): int;                      // mb_strlen de la forma NFC
    public function bytes(): int;                           // strlen de la forma NFC
}

final class AccountPasswords   // la única clase de app/ que usa Hash y logoutOtherDevices
{
    public function hash(PlainPassword $password): string;                         // bcrypt, rondas de config('hashing.bcrypt.rounds')
    public function set(User $user, PlainPassword $password): void;                // asigna el hash; guarda quien llama
    public function verify(User $user, PlainPassword $password): bool;
    public function verifyOrDummy(?User $user, PlainPassword $password): bool;     // mismo costo con o sin cuenta
    public function dummyHash(): string;                                           // se arma una vez por proceso, con el costo configurado
    public function logoutOtherDevices(PlainPassword $current): void;              // Auth::logoutOtherDevices con la forma NFC
}

enum PasswordViolation: string
{
    case TooShort = 'too_short'; case TooLong = 'too_long'; case TooManyBytes = 'too_many_bytes';
    case Blocked = 'blocked'; case ContainsEmail = 'contains_email'; case ContainsName = 'contains_name';
    public function message(): string;                                             // __('password-policy.'.$this->value)
}
final class BlockedPasswords { public function __construct(private string $path); public function contains(string $candidate): bool; }
final class PasswordPolicy
{
    public function __construct(private BlockedPasswords $blocked);
    /** @return list<PasswordViolation> */
    public function violations(PlainPassword $password, ?string $name, ?string $email): array;
}
final class PrivacyNotice
{
    public function current(): string;                                             // config('taller.privacy_version')
    public function isCurrent(string $version): bool;
    public function acceptedBy(User $user): bool;
    public function accept(User $user): void;                                      // fija la versión y el instante, y guarda
}
final readonly class PublishedUser
{
    public static function from(User $user): self;
    /** @return array{id: int, name: string, email: string, role: string, privacyAccepted: bool} */
    public function toPublished(): array;
}
```

Mensajes de `lang/es/password-policy.php` (las pruebas los exigen tal cual):

| Clave | Mensaje |
| --- | --- |
| `too_short` | Tiene que tener al menos 15 caracteres. |
| `too_long` | Puede tener hasta 64 caracteres. |
| `too_many_bytes` | Es demasiado larga para guardarse: con tildes o eñes entran menos de 64 caracteres. |
| `blocked` | Es una contraseña muy usada: elegí otra. |
| `contains_email` | No puede contener tu email. |
| `contains_name` | No puede contener tu nombre. |

**Pasos:**

1. Las pruebas, que fallan porque las clases no existen:
   - **`PlainPassword`**: `a` seguida de U+0301 pasa a U+00E1; 15 veces `á` son 15 caracteres y 30 bytes; 40 veces `á` son 40 caracteres y 80 bytes.
   - **`PasswordPolicy`**, con la lista de muestra:
     - 14 caracteres: `[TooShort]`; 15 aleatorios: `[]`; 65: `[TooLong]`;
     - 37 veces `á` (37 caracteres, 74 bytes): `[TooManyBytes]`;
     - una entrada de la muestra en mayúsculas: `[Blocked]`;
     - una contraseña que contiene `ana@x.com` o la parte local `analuz` (de 4 o más caracteres): `[ContainsEmail]`; con la parte local `ana` (menos de 4), no;
     - una que contiene `Ana Luz` sin distinguir mayúsculas: `[ContainsName]`;
     - los motivos salen todos juntos y en el orden del enum.
   - **`BlockedPasswords`**: la muestra de tres entradas; busca sin distinguir mayúsculas; un archivo inexistente lanza `RuntimeException`; con `Http::fake()`, una política evaluada no manda ningún pedido (`Http::assertNothingSent()`, FR-024).
   - **`AccountPasswords`**: `hash` empieza con `$2y$` y su costo es `config('hashing.bcrypt.rounds')`; `verify` acepta la misma contraseña; `verifyOrDummy(null, …)` es falso y `dummyHash()` tiene ese mismo costo; fijar con la `á` descompuesta y verificar con la compuesta da verdadero.
   - **`PrivacyNotice`**: `isCurrent` con la versión de la configuración; `acceptedBy` falso sin versión o con otra; `accept` fija la versión y el instante.
   - **`PublishedUser`**: las cinco claves exactas y en ese orden; el rol como texto; ningún `status`, `password` ni `remember_token`.
   - **`ArchitectureTest`**: una prueba de arquitectura de Pest (`arch()`) y un recorrido de texto de `app/**/*.php` que exigen que `Hash::`, `Auth::attempt(`, `attemptWhen(` y `logoutOtherDevices(` sólo aparezcan en `app/Auth/AccountPasswords.php`.
2. Implementá. `PasswordPolicy` rechaza el email completo, la parte local del email y el nombre completo sólo si tienen 4 o más caracteres, siempre sin distinguir mayúsculas (research.md, R5). `BlockedPasswords` lee el archivo una vez por proceso, en minúsculas.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde y la prueba de arquitectura en verde. `AccountPasswords` no usa `Auth::attempt`: su rehash automático hashearía la cadena sin normalizar.

## 3. Fundación HTTP (dueño F, ondas 1 y 2)

**Cubre:** FR-005 a FR-009, FR-036 a FR-038 y FR-047. El grupo `account` y los errores con código son lo que usan después A, I, B2 y D1.

**Entrega:** al llegar S1, los errores con código y la configuración (T009); al llegar S2, la sesión, los grupos de middleware y el `Browser` de pruebas (T010).

### Tarea 3.1 · Errores, mensajes y configuración (T009)

- **Crea:** `backend/api/app/Http/ApiCode.php`, `backend/api/app/Http/ApiExceptions.php`, `backend/api/config/taller.php`, `backend/api/config/hashing.php`, `backend/api/lang/es/{api,validation,auth,passwords}.php`, `backend/api/tests/Unit/ApiCodeTest.php`, `backend/api/tests/Feature/ApiExceptionsTest.php` y `backend/api/tests/Feature/ConfigTest.php`.
- **Modifica:** `backend/api/app/Http/ApiError.php`, `backend/api/bootstrap/app.php` (la parte de los errores), `backend/api/config/{app,session,auth}.php`, `backend/api/tests/Feature/ApiErrorsTest.php`.
- **Entrega** (firmas de referencia):

```php
enum ApiCode: string   // los 17 códigos de contracts/http.md; los de C2 siguen en ContentDelivery
{
    case Unauthenticated = 'unauthenticated';          // 401
    case Forbidden = 'forbidden'; case AccountDisabled = 'account_disabled'; case EmailUnverified = 'email_unverified';   // 403
    case NotFound = 'not_found'; case InvitationNotFound = 'invitation_not_found';                                         // 404
    case MethodNotAllowed = 'method_not_allowed';      // 405
    case EmailTaken = 'email_taken'; case AccountMismatch = 'account_mismatch';                                            // 409
    case InvitationExpired = 'invitation_expired';     // 410
    case CsrfTokenMismatch = 'csrf_token_mismatch';    // 419
    case ValidationFailed = 'validation_failed'; case AuthFailed = 'auth_failed';                                          // 422
    case PasswordConfirmationRequired = 'password_confirmation_required';   // 423
    case TooManyRequests = 'too_many_requests';        // 429
    case BadRequest = 'bad_request';                   // 400
    case ServerError = 'server_error';                 // 500
    public function status(): int;
    public function message(): string;                 // __('api.'.$this->value)
}

final class ApiError
{
    public static function response(int $status, string $code, string $message, array $extra = [], array $headers = []): JsonResponse;   // existe, sin cambios
    /** @param array<string, mixed> $extra @param array<string, string> $headers */
    public static function of(ApiCode $code, array $extra = [], array $headers = [], ?int $status = null): JsonResponse;   // $status sólo para BadRequest: conserva el 4xx original
}

final class ApiExceptions { public static function render(Throwable $error, Request $request): ?JsonResponse; }   // null deja pasar HttpResponseException y Responsable
```

`config/taller.php` (las claves que leen los demás; las variables de entorno están en [contracts/console.md](./contracts/console.md)):

| Clave | Valor |
| --- | --- |
| `taller.privacy_version` | `env('PRIVACY_VERSION', '2026-10-dev')` |
| `taller.password_blocklist` | `env('PASSWORD_BLOCKLIST_PATH', resource_path('passwords/blocked-15plus.txt'))` |
| `taller.invitations` | `['student_days' => 7, 'admin_hours' => 48, 'prune_days' => 30]` |
| `taller.session_max_hours` | `(int) env('SESSION_MAX_HOURS', 8)` |
| `taller.remember_days` | `30` |
| `taller.device_cookie` | `['name' => env('DEVICE_COOKIE_NAME', 'taller-device'), 'secure' => env('DEVICE_COOKIE_SECURE'), 'same_site' => 'lax', 'days' => 180]` |
| `taller.features` | `['password_reset' => false, 'registration' => false]` |
| `taller.long_transaction_seconds` | `(int) env('LONG_TRANSACTION_SECONDS', 30)` |
| `taller.log_hmac_key` | `env('LOG_HMAC_KEY')` |

Los cambios de configuración:

- `config/app.php`: `locale` y `fallback_locale` por omisión en `es`.
- `config/session.php`: `lifetime` por omisión 30, `encrypt` por omisión verdadero y `lottery` en `[0, 100]`.
- `config/auth.php`: `password_timeout` por omisión 900.
- `config/hashing.php`: `'bcrypt' => ['rounds' => (int) env('BCRYPT_ROUNDS', 12)]`, para que `BCRYPT_ROUNDS=4` de `phpunit.xml` se lea (research.md, R5).
- `bootstrap/app.php`: `$exceptions->render(fn (Throwable $error, Request $request) => ApiExceptions::render($error, $request))`, además del `shouldRenderJsonWhen(fn () => true)` que ya está; `$middleware->redirectGuestsTo(fn () => null)`; `withRouting(api: [routes/api.php, routes/api/account.php, routes/api/access.php], …)` (los dos últimos los crean A e I; un archivo que no existe se omite); y el comentario sobre Sanctum se reescribe: C3a monta la sesión a mano y no instala ningún paquete (FR-052).

**Pasos:**

1. Las pruebas, que fallan:
   - **`ApiCodeTest`**: cada caso de `ApiCode` tiene un estado de la tabla de [contracts/http.md](./contracts/http.md) y un mensaje en español en `lang/es/api.php` que no es su clave.
   - **`ApiExceptionsTest`**, con rutas de prueba registradas en el test: `GET /api/no-existe` da 404 `{"message":"No existe lo que pedís.","code":"not_found"}`; `POST /api/up` da 405 con `Allow` y `method_not_allowed`; una ruta que valida da 422 `validation_failed` con `errors` por campo; una ruta con `throttle:1,1` llamada dos veces da 429 `too_many_requests` con `Retry-After`; una ruta que lanza una excepción cualquiera da 500 `server_error`, sin `trace`, `exception` ni `file`, también con `APP_DEBUG=true`; una que lanza `HttpException(418)` da 418 `bad_request`; una con `auth` y sin `Accept` da 401 `unauthenticated` en JSON (no un 500 por la ruta `login` que no existe); un `TokenMismatchException` da 419 `csrf_token_mismatch`; un `AuthorizationException` da 403 `forbidden`.
   - **`ApiErrorsTest`**: los tres casos de C1 siguen valiendo, y `/fuera` responde JSON.
   - **`ConfigTest`**: `app.locale` es `es`; la sesión dura 30 minutos, va cifrada y su sorteo es `[0, 100]`; `auth.password_timeout` es 900; `hashing.bcrypt.rounds` es 4 con el entorno de las pruebas; `taller.*` trae las claves de arriba, con `taller.features` en `false` y la cookie de dispositivo sin `Secure`; y `Request::getTrustedProxies()` es `[]` después de arrancar la aplicación (research.md, R22).
2. Implementá. Los mensajes de `lang/es/api.php` son los de la tabla de errores de [contracts/http.md](./contracts/http.md); `validation.php`, `auth.php` y `passwords.php` traducen lo que C3a usa (`required`, `string`, `email`, `min`, `max`, `confirmed`, `boolean`, los `attributes` de `email`, `password`, `name` y `token`, y los estados del broker).
3. `npm run api:analyse`: 0 errores, con los accesores tipados de research.md, R18.

**Compuerta:** las pruebas en verde y la suite de C2 sin cambios en verde.

### Tarea 3.2 · La sesión: middleware, grupos y `Browser` (T010)

- **Crea:** `backend/api/app/Http/Middleware/{AssignRequestId,DropInvalidSession,EnsureUserIsActive,EnsureExpectedAccount,EnsureEmailIsVerified,RequirePassword}.php`, `backend/api/app/Auth/{AccountSessions,DropReason}.php`, `backend/api/tests/Support/Browser.php` y `backend/api/tests/Feature/Session/`.
- **Modifica:** `backend/api/bootstrap/app.php` (el montaje) y `backend/api/tests/Feature/HealthTest.php`.
- **Entrega** (firmas de referencia):

```php
enum DropReason: string { case PasswordChanged = 'password_changed'; case Deleting = 'deleting'; case Disabled = 'disabled'; case Expired = 'expired'; }

final class AccountSessions
{
    public function __construct(private AccountPasswords $passwords);
    /** Borra todas las filas de sessions de la cuenta y rota su token de «recordarme». Para el restablecimiento. */
    public function endAll(User $user): void;
    /** Corta las demás sesiones: cambia el hash de la contraseña (AuthenticateSession las descarta), borra sus filas y rota el token de «recordarme». Este dispositivo sigue con su sesión y, si tenía cookie de recuerdo, recibe una nueva. */
    public function endOthers(User $user, Request $request, PlainPassword $current): void;
}

// RequirePassword (alias password.confirm) responde 423 y ofrece, para quien confirma la contraseña:
//   public static function isConfirmed(Request $request): bool;     // hay una confirmación de menos de auth.password_timeout segundos
//   public static function markConfirmed(Request $request): void;   // guarda auth.password_confirmed_at con el instante actual
```

El montaje de `bootstrap/app.php`:

```php
$middleware->api(prepend: [AssignRequestId::class, EncryptCookies::class, AddQueuedCookiesToResponse::class,
                           StartSession::class, PreventRequestForgery::class, DropInvalidSession::class]);
$middleware->alias(['verified' => EnsureEmailIsVerified::class, 'password.confirm' => RequirePassword::class,
                    'account.active' => EnsureUserIsActive::class, 'account.expected' => EnsureExpectedAccount::class]);
$middleware->group('account', ['account.active', 'auth:web', 'account.expected']);
```

`DropInvalidSession` (research.md, R3 y R4) decide así y deja la razón en `$request->attributes['session.dropped']`:

| Situación | Resultado |
| --- | --- |
| Sin usuario en la sesión ni cookie de recuerdo | Sigue como invitado |
| `AuthenticateSession`, usado como sonda, lanza `AuthenticationException` | Descarta: `PasswordChanged` |
| La cuenta está `deleting` | Descarta: `Deleting` |
| La cuenta está `disabled` | Descarta: `Disabled` |
| Pasaron más de `taller.session_max_hours` desde `taller.authenticated_at` y el pedido no lleva la cookie de recuerdo | Descarta: `Expired` |
| Todo en regla | Sigue; si no está `taller.authenticated_at`, la marca con el instante actual |

«Descartar» es `Auth::logoutCurrentDevice()`, `session()->invalidate()` y `session()->regenerateToken()`.

**Pasos:**

1. `Browser` y las pruebas, que fallan (usan rutas de prueba registradas en el test: una pública que devuelve `Auth::id()`, una en el grupo `account` y una con `account` y `verified`):
   - **`Browser`** (`tests/Support/Browser.php`): guarda los `Set-Cookie` de cada respuesta y los reenvía con `withUnencryptedCookies`; copia `XSRF-TOKEN` a `X-XSRF-TOKEN`; agrega `X-Taller-User` si se le dijo `signedInAs($user)`; ofrece `useDatabaseDrivers()` (`session.driver` y `cache.default` en `database`, FR-047), `enforceCsrf()` (cambia `$app['env']` a `local` para que `PreventRequestForgery` no se salte), `fromIp()`, `withAccountHeader()`, `cookie()` y `forget()`. Tiene su propia prueba.
   - **Cookies y sesión**: `taller-session` sale HttpOnly y `SameSite=Lax`, y su valor no es el id de la sesión (va cifrada); `XSRF-TOKEN` no es HttpOnly; un pedido de invitado deja una fila de `sessions` con `user_id` nulo y el `payload` cifrado; la sesión vence a los 31 minutos de inactividad (`travel`).
   - **Salud**: `GET /api/up` no crea ninguna fila en `sessions` y no manda `Set-Cookie` (FR-009).
   - **`DropInvalidSessionTest`**, una fila por situación de la tabla: la cuenta pasa a `disabled`, `deleting` o cambia su contraseña (una segunda sesión con el hash viejo); pasan 9 horas sin y con cookie de recuerdo; ninguna prepara el escenario borrando la fila de `sessions`: sólo cambia la cuenta o el reloj, y la sesión ya no sirve en el pedido siguiente.
   - **Grupo `account`**: sin sesión y sin `Accept`, 401 `unauthenticated` en JSON; con la sesión descartada por una cuenta `disabled`, 403 `account_disabled` y el pedido siguiente, 401; la ruta pública con una sesión inválida devuelve `null`.
   - **`EnsureExpectedAccountTest`**: un `GET` sin cabecera pasa; un `POST` con el id de la cuenta pasa; sin cabecera, con otro id, vacía o con un valor que no es un entero positivo, 409 `account_mismatch` sin una sola escritura (el registro de consultas no tiene `insert`, `update` ni `delete`, salvo `sessions` y `cache`).
   - **`EnsureEmailIsVerifiedTest`**: una cuenta sin verificar recibe 403 `email_unverified`; una verificada pasa.
   - **`RequirePasswordTest`**: sin confirmación, 423 `password_confirmation_required` con `{message, code}`; con `auth.password_confirmed_at` de hace 899 segundos pasa; con 901, 423. `isConfirmed` es verdadero a los 899 segundos y falso a los 901, y `markConfirmed` lo vuelve verdadero.
   - **CSRF** (con `enforceCsrf()`): un `POST` sin `X-XSRF-TOKEN` da 419 `csrf_token_mismatch`; con el token de un `GET` previo pasa.
   - **Orden efectivo**: `app('router')->gatherRouteMiddleware($ruta)` de una ruta de `account` es `AssignRequestId`, `EncryptCookies`, `AddQueuedCookiesToResponse`, `StartSession`, `PreventRequestForgery`, `DropInvalidSession`, luego `EnsureUserIsActive`, `Authenticate:web` y `EnsureExpectedAccount`, en ese orden relativo.
   - **`AccountSessionsTest`**: `endAll` borra las filas de la cuenta y rota el token; `endOthers` conserva la actual, borra las demás, rota el token y, con cookie de recuerdo, emite una con el token nuevo.
2. Implementá y montá. Si el ordenador de middleware de Laravel reubica alguno y falla la prueba del orden, fijalo con `$middleware->priority([...])`.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde, el contenido de C2 sin tocar todavía (T022 lo mueve al grupo) y la suite entera en verde.

## 4. Límites (dueño L, onda 2)

**Cubre:** FR-012, FR-013, FR-014, el límite y el bloqueo de FR-030, y los límites de FR-020 y FR-026 (los limitadores con nombre).

**Entrega:** el límite, el bloqueo progresivo, la cookie de dispositivo y la prueba de contraseña que usan A (T019 a T021) e I (T016 a T018).

### Tarea 4.1 · Límites, bloqueo, cookie de dispositivo y prueba de contraseña (T011)

- **Crea:** `backend/api/app/Auth/{LoginThrottle,AccountLockout,LockoutState,DeviceCookie,DeviceToken,PasswordProof,ProofResult,Limiters}.php` y sus pruebas en `backend/api/tests/Feature/Limits/`.
- **Entrega** (firmas de referencia; las claves de caché, en [data-model.md](./data-model.md)):

```php
final class LoginThrottle
{
    public function __construct(private RateLimiter $limiter);
    /** Cuenta este intento. Segundos de espera si pasó los 5 por minuto por email y red, o los 60 por minuto por red; si no, null. */
    public function hit(string $emailKey, string $network): ?int;
    /** Limpia el contador de email y red tras un ingreso correcto. El de la red no se limpia. */
    public function clear(string $emailKey, string $network): void;
}

final readonly class LockoutState
{
    public function __construct(public int $fails, public int $lockedUntil);   // lockedUntil: epoch, 0 si no hay bloqueo
    public function isPermanent(): bool;                                       // 100 fallos o más
    public function retryAfter(int $now): int;                                 // segundos que faltan; 0 si no está bloqueada
}

final class AccountLockout
{
    public function state(string $emailKey): LockoutState;
    public function recordFailure(string $emailKey): LockoutState;             // un fallo de un dispositivo desconocido
    public function clear(string $emailKey): void;
}

final readonly class DeviceToken { public function __construct(public int $userId, public string $deviceId); }

final class DeviceCookie
{
    public function __construct(Repository $config);                           // lee taller.device_cookie; LogicException si el nombre lleva __Host- y no es Secure
    public function name(): string;                                            // config('taller.device_cookie.name'), 'taller-device' por omisión
    public function read(Request $request, ?User $account): ?DeviceToken;      // válida para esa cuenta y sin 10 fallos seguidos
    public function make(User $account, ?DeviceToken $current): Cookie;        // emite o renueva: HttpOnly, ruta /, sin Domain, el resto de taller.device_cookie
    public function retryAfter(DeviceToken $device): ?int;                     // 5 fallos por minuto: segundos de espera o null
    public function recordFailure(DeviceToken $device): void;
    public function clear(DeviceToken $device): void;
}

enum ProofOutcome: string { case Verified = 'verified'; case Wrong = 'wrong'; case Throttled = 'throttled'; case Locked = 'locked'; }
final readonly class ProofResult { public function __construct(public ProofOutcome $outcome, public int $retryAfter = 0); }

final class PasswordProof   // confirmar, cambiar la contraseña y cerrar las otras sesiones
{
    public function verify(User $user, PlainPassword $password, Request $request): ProofResult;
}

final class Limiters { public static function register(): void; }   // 'invitations' y 'reset-password'
```

**Pasos:**

1. Las pruebas, con `Browser::useDatabaseDrivers()` y los relojes fijados con `Carbon::setTestNow()` y `travel()`. Fallan porque las clases no existen:
   - **`LoginThrottle`**: cinco `hit` con el mismo email y red devuelven `null` y el sexto devuelve entre 1 y 60; a los 61 segundos vuelve a pasar; con 60 emails distintos desde la misma red, el 61.º devuelve un tiempo; `clear` libera el email y red, no la red.
   - **`AccountLockout`**, la tabla de [data-model.md](./data-model.md): con 9 fallos no hay bloqueo; con 10, 60 s; con 11, 120 s; con 12, 240 s; con 13, 480 s; con 14 y con 20 y con 99, 900 s; con 100, permanente. Pasadas 24 horas del último fallo el estado vuelve a cero; con 100 fallos dura 30 días. `clear` lo deja en cero. La clave sale de `sha256` del email canónico, exista o no la cuenta: el mismo estado para `ANA@x.com` y `ana@x.com` si el que llama los canonicaliza.
   - **`DeviceCookie`**: el ida y vuelta de `make` y `read` por una ruta de prueba (la cookie sale cifrada: su valor en `Set-Cookie` no es JSON); caduca a los 180 días; el nombre y los atributos salen de `taller.device_cookie`: con `name` en `__Host-taller-device` y `secure` en verdadero, la cookie sale `Secure`, con ruta `/` y sin `Domain`, y con ese nombre sin `secure`, el constructor lanza una `LogicException`; una cookie de otra cuenta, sin cookie o con un contenido que no es `{uid, did}` da `null`; con 5 `recordFailure` en un minuto, `retryAfter` devuelve entre 1 y 60, y a los 61 segundos `null`; con 10 fallos seguidos, `read` devuelve `null`; `clear` lo revierte.
   - **Sin `trustProxies`**: seis intentos de ingreso con el mismo `REMOTE_ADDR` y seis valores distintos de `X-Forwarded-For` reciben 429 en el sexto (research.md, R22).
   - **`PasswordProof`**: cinco contraseñas equivocadas en un minuto y la sexta es `Throttled` sin evaluarse; un fallo desde un dispositivo desconocido suma 1 al contador de la cuenta, y uno desde un dispositivo conocido suma al del dispositivo y no al de la cuenta; un acierto es `Verified` y limpia el contador; con la cuenta en 10 fallos y un dispositivo desconocido, `Locked`.
   - **`Limiters`**: `invitations` deja 10 pedidos por minuto por red y el 11.º recibe 429 con `Retry-After`; dos redes distintas no se cuentan juntas; `reset-password` deja 10 por minuto por red y 5 por minuto por email (el sexto pedido con el mismo email desde otra red recibe 429), con el email canonicalizado.
2. Implementá. Los limitadores de ingreso y de prueba de contraseña usan `RateLimiter` sobre el store `database` con las claves de [data-model.md](./data-model.md). El estado del bloqueo se guarda como un arreglo simple, con el TTL de la tabla de la sección «Estado en la caché».
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde y la suite entera en verde. Las líneas `Limiters::register();` y `setRememberDuration` las integra el coordinador en S2.

## 5. Operación (dueño O, ondas 1 y 2)

**Cubre:** FR-039 a FR-046; FR-021 en lo que toca a los registros y a Nginx.

**Entrega:** el stack con `scheduler` y `db-grants`, el chequeo previo a migrar, las podas, los registros sin secretos y los checks autenticados.

### Tarea 5.1 · Nginx, DNS y Compose (T012)

- **Modifica:** `docker/compose.yaml`, `docker/nginx/nginx.conf`, `backend/api/scripts/{init-env,smoke,deploy}.sh` y `backend/api/.env.example`.
- **Crea:** `docker/mysql/db-grants.sql`.
- **Entrega:** [contracts/console.md](./contracts/console.md) hecho: los servicios `scheduler` y `db-grants`, el DNS cerrado, las zonas de Nginx con su 429 en JSON, el registro sin la query string y `LOG_HMAC_KEY`.

**Pasos:**

1. Escribí en `smoke.sh` las comprobaciones, que fallan por lo que falta:
   - `docker compose exec -T taller nginx -t` da `successful`.
   - **DNS:** desde `php`, `scheduler`, `mysql` y `taller`, resolver `example.com` falla y resolver `mysql` o `php` funciona (`nslookup` o `getent hosts`, según lo que traiga cada imagen); desde `migrate` (`docker compose run --rm --no-deps --entrypoint php migrate -r '…gethostbyname…'`), lo mismo.
   - **Ráfaga:** 150 pedidos a `/api/session` en paralelo (por ejemplo `xargs -P 50`) dan al menos un 429 con `Content-Type: application/json`, el cuerpo `{"message":"Demasiados intentos. Esperá un momento antes de volver a probar.","code":"too_many_requests"}` y `Retry-After`; pasados 15 segundos el mismo pedido vuelve a responder sin 429. La ruta todavía no existe en esta onda (la crea T020): el límite es de Nginx y responde antes que PHP, así que la comprobación vale igual.
   - **Registro:** un pedido a `/api/exercises?catalog=lab&language=rust&secreto=XYZ` no deja `secreto=XYZ` en el registro de Nginx, y la línea del pedido lleva un `request_id` de 32 hexadecimales; la respuesta trae `X-Request-Id`.
   - **Servicios:** `scheduler` corre; `docker compose config --services` no lista `db-grants`, y con `--profile ops` sí.
2. Corré el smoke: falla en el 429 (hoy Nginx no limita), en el registro y en los servicios, y en el DNS si el motor reenvía. Anotá si el DNS ya falla sin la opción.
3. Implementá, con esta referencia (sin ejecutar):

```nginx
# http { ... }
limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s;
map $uri $session_limit_key { default ""; ~^/api/session/?$ $binary_remote_addr; }
limit_req_zone $session_limit_key zone=session:10m rate=5r/s;
limit_req_status 429;
log_format api '$remote_addr [$time_local] "$request_method $uri $server_protocol" $status $body_bytes_sent $request_id';

# location ^~ /api/ { ... }   (lo que ya tiene, más:)
access_log /dev/stdout api;
limit_req zone=api burst=400 nodelay;
limit_req zone=session burst=60 nodelay;
error_page 429 = @too_many_requests;
fastcgi_param HTTP_X_REQUEST_ID $request_id;

location @too_many_requests {
    default_type application/json;
    add_header Retry-After 1 always;
    add_header X-Content-Type-Options nosniff always;
    return 429 '{"message":"Demasiados intentos. Esperá un momento antes de volver a probar.","code":"too_many_requests"}';
}
```

   Un `add_header` en esa ubicación reemplaza las cabeceras del servidor: repetí la CSP y `Referrer-Policy` o movelas a una variable (`map`) que usen las dos ubicaciones.

```yaml
# docker/compose.yaml (referencia)
x-laravel-env:      # suma APP_LOCALE: es · LOG_STDERR_FORMATTER: 'Monolog\Formatter\JsonFormatter'
                    # · LOG_HMAC_KEY: '${LOG_HMAC_KEY:?falta LOG_HMAC_KEY en .env (sh backend/api/scripts/init-env.sh)}'
x-laravel-test-env: # LOG_HMAC_KEY: no-es-un-secreto
x-laravel-runtime:  # suma dns: ['127.0.0.1']  (lo heredan php, migrate y scheduler)
services:
  scheduler:
    <<: *laravel-runtime
    command: ['php', 'artisan', 'schedule:work']
    depends_on:
      mysql: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
    restart: unless-stopped
  db-grants:
    profiles: [ops]
    image: *mysql-image
    entrypoint: ['sh', '-c', 'mysql -h mysql -uroot -p"$$MYSQL_ROOT_PASSWORD" < /db-grants.sql']
    environment: { MYSQL_ROOT_PASSWORD: '${MYSQL_ROOT_PASSWORD:?falta MYSQL_ROOT_PASSWORD en .env}' }
    volumes: ['./docker/mysql/db-grants.sql:/db-grants.sql:ro']
    networks: [app]
    dns: ['127.0.0.1']
    depends_on: { mysql: { condition: service_healthy } }
    restart: 'no'
  mysql:             # suma dns y volumes: ['./docker/mysql/db-grants.sql:/docker-entrypoint-initdb.d/10-db-grants.sql:ro']
  taller: mysql-test: test:   # suman dns: ['127.0.0.1']
```

   `init-env.sh` agrega `add_missing LOG_HMAC_KEY "$(openssl rand -base64 32)"`, con un comentario de cabecera que fija el patrón para C3b y C4 (una línea `add_missing` por variable, sin pisar nunca un valor existente); el dueño de esa estructura es esta tarea. `docker/mysql/db-grants.sql` empieza con el comentario que dice que es el único archivo de usuarios y privilegios de MySQL y que sólo `db-grants` y el inicio de un volumen nuevo lo aplican con `root`; C4 le suma sus usuarios por rol sin cambiar eso; `deploy.sh` suma `scheduler` a `docker compose up -d --wait --no-deps mysql php taller scheduler`; `.env.example` suma `LOG_HMAC_KEY=` vacío, como referencia.
4. Corré de nuevo el smoke contra un stack limpio (`docker compose up --build -d --wait`): todo `ok`.

**Compuerta:** `smoke.sh` en verde con las comprobaciones nuevas, `docker compose config --services` y `--volumes` sin cambios respecto de `master` salvo `scheduler` y `db-grants` (ADR 0007, invariante 1), y `api:test` en verde (el ancla de pruebas fija `LOG_HMAC_KEY`).

### Tarea 5.2 · El chequeo de transacciones largas y el criterio J (T013)

- **Crea:** `backend/api/app/Operations/{LongTransactionCheck,LongTransactionsOpen,CheckUnavailable}.php`, `backend/api/app/Console/Commands/CheckLongTransactions.php`, `backend/api/tests/Support/RestrictedMysqlUser.php` y `backend/api/tests/Content/LongTransactionTest.php`.
- **Modifica:** `backend/api/docker/migrate.sh` y `backend/api/tests/Unit/MigrateScriptTest.php`.
- **Entrega** (firmas de referencia; el comando y sus mensajes, en [contracts/console.md](./contracts/console.md)):

```php
final class LongTransactionCheck
{
    public function __construct(private ConnectionInterface $connection);
    /**
     * @throws LongTransactionsOpen  alguna transacción lleva más de $seconds en ACTIVE
     * @throws CheckUnavailable      no puede ver las transacciones: falta el privilegio (error 1142), la
     *                               instrumentación está apagada o no se ve a sí mismo
     */
    public function run(int $seconds): void;
}
final class LongTransactionsOpen extends RuntimeException { /** @param list<int> $secondsOpen */ public function __construct(public readonly array $secondsOpen); }
final class CheckUnavailable extends RuntimeException {}
```

**Pasos:**

1. Las pruebas. `RestrictedMysqlUser` crea con `root` un usuario `taller_j_<aleatorio>` con los privilegios que se le pidan, sin `PROCESS`, y devuelve una conexión con él; la borra al terminar. `LongTransactionTest` va en la suite `Content`: una transacción que envuelve a la prueba se vería a sí misma como transacción larga.
   - **Con el privilegio** (`GRANT SELECT ON performance_schema.events_transactions_current`): otra conexión abre `START TRANSACTION` y lee `migrations`; pasan 2 segundos; `run(1)` lanza `LongTransactionsOpen` con una entrada de 1 segundo o más. Sin esa transacción, `run(1)` no lanza. Una transacción más corta que el umbral no lanza.
   - **Sin el privilegio**: `run` lanza `CheckUnavailable`, y su mensaje nombra `db-grants`.
   - **Instrumentación apagada** (`UPDATE performance_schema.setup_consumers SET ENABLED = 'NO' WHERE NAME = 'events_transactions_current'`, y se restaura en `finally`): `run` lanza `CheckUnavailable`, porque no se ve a sí mismo.
   - **El motivo del privilegio mínimo**: el usuario sin `PROCESS` no ve la transacción abierta en `information_schema.INNODB_TRX` (el error 1227 o cero filas).
   - **El comando** `taller:check-transactions --seconds=1` sale con 0, 1 y 2 en esos tres casos y con los mensajes de [contracts/console.md](./contracts/console.md).
   - **`MigrateScriptTest`**: cada escenario existente suma una primera línea `0|checked` al guion del `php` falso, y sus llamadas pasan de 2, 3 y 4 a 3, 4 y 5; nuevos: el chequeo sale con 1 y el script sale con 1 después de una sola llamada, sin migrar y con el mensaje del chequeo en la salida; el chequeo sale con 2 y pasa lo mismo; el chequeo no se reintenta.
2. Implementá. La consulta, como en [contracts/console.md](./contracts/console.md): una transacción propia con una lectura de `migrations`, la fila de su propio hilo (`PS_CURRENT_THREAD_ID()`) debe ser `ACTIVE`, y después las filas `ACTIVE` de otros hilos con `TIMER_WAIT` mayor que `$seconds × 10¹²`. `migrate.sh` corre `php artisan taller:check-transactions || exit $?` una vez, antes del ciclo de reintentos.
3. `npm run api:analyse` y `npm run api:test`: verdes.

**Compuerta:** las pruebas en verde. Si `PS_CURRENT_THREAD_ID()` pide un privilegio que el usuario restringido no tiene, o el manual de 9.0 no vale para 9.7, la prueba con el usuario restringido lo muestra: se ajusta la consulta (y el SQL de `db-grants`), no la prueba.

### Tarea 5.3 · Podas y `scheduler` (T014)

- **Crea:** `backend/api/app/Console/Commands/{PruneSessions,PruneCache}.php`, `backend/api/tests/Feature/{PruneTest,ScheduleTest}.php`.
- **Modifica:** `backend/api/routes/console.php`.
- **Entrega:** los dos comandos y las cuatro tareas programadas de [contracts/console.md](./contracts/console.md).

**Pasos:**

1. Las pruebas, que fallan porque los comandos no existen:
   - **`taller:prune-sessions`**: con 2 500 sesiones vencidas y 10 vivas, quedan las 10; las sentencias `delete from sessions` son al menos 3, todas con `order by last_activity` y `limit 1000`, y ninguna sin `limit`; una fila con `last_activity` justo en el corte (`ahora − SESSION_LIFETIME × 60`) se borra y una un segundo más nueva se conserva.
   - **`taller:prune-cache`**: con 3 000 filas vencidas de `cache` y de `cache_locks`, se borran de a 1 000 y las vivas quedan, incluida una clave `content-body:` con 30 días de vida.
   - **`Invitation::prunable()`** toma las invitaciones con `expires_at` de hace más de 30 días y no las de hace 29, ni las vigentes.
   - **`ScheduleTest`**: el `Schedule` tiene exactamente estas tareas: `taller:prune-sessions`, `auth:clear-resets` y `taller:prune-cache` cada 15 minutos (`*/15 * * * *`) y `model:prune --model="App\Models\Invitation"` una vez al día, todas con `withoutOverlapping`; ninguna procesa una cola (`queue:work`).
2. Implementá. La poda de sesiones borra con `DB::table('sessions')->where('last_activity', '<=', $corte)->orderBy('last_activity')->limit(1000)->delete()` en un bucle hasta que el borrado devuelve menos de 1 000 filas; la de la caché hace lo mismo por `expiration`, sobre las dos tablas.
3. `npm run api:analyse` y `npm run api:test`: verdes.

**Compuerta:** las pruebas en verde. Que el generador de SQL del query builder admita `order by` y `limit` en un `delete` de MySQL es lo que las sentencias capturadas comprueban.

### Tarea 5.4 · Registros sin secretos (T015)

- **Crea:** `backend/api/app/Logging/{RequestContext,SecretScrubber}.php` y `backend/api/tests/Unit/Logging/`.
- **Modifica:** `backend/api/config/logging.php`.
- **Entrega:** dos procesadores de Monolog en el canal `stderr` (`processors => [PsrLogMessageProcessor::class, RequestContext::class, SecretScrubber::class]`); el formato JSON lo fija Compose (`LOG_STDERR_FORMATTER`).

**Pasos:**

1. Las pruebas unitarias, que fallan porque las clases no existen:
   - **`RequestContext`** agrega `request_id`, `ip` y `user_id` a `extra` desde los atributos del pedido, sin consultar la base; sin pedido (consola), no falla y no agrega nada.
   - **`SecretScrubber`**, con la clave `secret`:
     - reemplaza el id de la sesión actual;
     - reemplaza todo email por `email:` más su HMAC (para `ana@x.com`, `email:8a7122f355ddfdc8`);
     - reemplaza por `[redactado]` el valor de las claves `password`, `token`, `secret`, `authorization` y `cookie`, también anidadas;
     - reemplaza `#invitacion=…` y `#restablecer=…` por su nombre con `[redactado]`;
     - deja intacto lo demás.
   - **Una `QueryException`** cuyo mensaje trae el SQL con el email y el id de la sesión, ya sustituidos, sale sin ninguno de los dos.
2. Implementá. `SecretScrubber` usa `EmailFingerprint` (de P) y lee el id de la sesión del pedido, sin tocar la base. `config/logging.php` agrega los procesadores al canal `stderr`.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. La prueba de punta a punta con un ingreso fallido y uno correcto es T023.

## 6. Invitaciones y recuperación (dueño I, onda 3)

**Cubre:** FR-017 a FR-022, FR-025 y FR-026 (historias 1 y 5).

**Entrega:** el alta por invitación (consola y HTTP) y la recuperación por consola, con las rutas de `routes/api/access.php`.

### Tarea 6.1 · `Invitations` y `taller:invite` (T016)

- **Crea:** `backend/api/app/Auth/{Invitations,IssuedInvitation,InvitationNotFound,InvitationExpired,EmailTaken}.php`, `backend/api/app/Console/Commands/InviteUser.php` y sus pruebas en `backend/api/tests/Feature/Invitations/InvitationsTest.php` y `backend/api/tests/Feature/Console/InviteUserTest.php`.
- **Entrega** (firmas de referencia):

```php
final readonly class IssuedInvitation
{
    public function __construct(public Invitation $invitation, public string $token, public bool $renewed);
    public function link(): string;                                              // <APP_URL>/#invitacion=<token>, de config('app.url')
}
final class InvitationNotFound extends RuntimeException {}
final class InvitationExpired extends RuntimeException {}
final class EmailTaken extends RuntimeException {}

final class Invitations
{
    public function issue(string $email, Role $role, ?int $invitedBy): IssuedInvitation;        // crea o renueva; EmailTaken si ya hay una cuenta; delivery = link
    public function lookup(string $token): Invitation;                                          // InvitationNotFound | InvitationExpired
    public function accept(string $token, string $name, PlainPassword $password, string $privacyVersion): User;   // no inicia sesión
}
```

`accept` hashea la contraseña (`AccountPasswords::hash`) antes de abrir la transacción. En `WriteTransaction::run` hace `SELECT … WHERE token_hash = ? FOR UPDATE`, comprueba el vencimiento, inserta la cuenta (rol de la invitación, `active`, email verificado, versión del aviso aceptada) y borra la invitación; el UNIQUE de `users.email` es la última guarda (`EmailTaken`). Después del commit deja `Log::info('invitation.accepted', …)` con el id de quien invitó y el de la cuenta.

**Pasos:**

1. Las pruebas, con `Carbon::setTestNow('2026-10-05 12:00:00')`. Fallan porque las clases no existen:
   - **`issue`**: crea una fila con el email canonicalizado, `role` `student`, `delivery` `link`, `invited_by` nulo y `expires_at` `2026-10-12 12:00:00.000`; con `Role::Admin`, `2026-10-07 12:00:00.000` (48 horas). El token tiene 43 caracteres y `token_hash` es el sha256 de ese texto, calculado en la prueba con `hash('sha256', …)`. El link es `<APP_URL>/#invitacion=<token>` aun con otro `Host` en el pedido.
   - **Renovar** sobre una pendiente o una vencida: la misma fila (una por email), otro `token_hash`, el rol y el vencimiento nuevos y `renewed` verdadero; el token anterior ya no se encuentra.
   - **`EmailTaken`** si hay una cuenta con ese email, también con otras mayúsculas; `papa.com.ar` y `papá.com.ar` son emails distintos.
   - **`lookup`**: una vigente la devuelve; pasados 7 días y un segundo, `InvitationExpired`; un token inventado o mal formado, `InvitationNotFound`, y el mal formado sin consultar `invitations`.
   - **`accept`**: crea la cuenta (activa, verificada, con el rol de la invitación, el nombre y la versión del aviso con su fecha), la contraseña verifica con `AccountPasswords::verify`, la invitación se borra y el registro trae `invitation.accepted` con `invited_by` nulo y el id de la cuenta. El hash se calcula con `DB::transactionLevel() === 0` (un hasher de prueba lo registra). Fijar con la `á` descompuesta y verificar con la compuesta da verdadero.
   - **`InviteUserTest`**, con la tabla de [contracts/console.md](./contracts/console.md): una invitación nueva sale con 0 y el link en su propia línea, que cumple `^https?://.+/#invitacion=[A-Za-z0-9_-]{43}$`; una renovación sale con 0 y otro token; un email con cuenta sale con 1 y dice que la cuenta existe; un `--role` inválido o un email inválido salen con 2; con `config(['app.url' => 'https://taller.example'])` el link empieza con esa URL; la base no guarda el token en ninguna columna; el link no aparece en los registros.
2. Implementá `Invitations` y el comando.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

### Tarea 6.2 · `InvitationController`: consultar y aceptar (T017)

- **Crea:** `backend/api/app/Http/Controllers/Auth/InvitationController.php`, `backend/api/app/Http/Requests/{InvitationTokenRequest,AcceptInvitationRequest}.php`, `backend/api/routes/api/access.php`, `backend/api/tests/Feature/Invitations/{LookupTest,AcceptTest}.php` y `backend/api/tests/Content/InvitationRaceTest.php`.
- **Entrega:** `POST /api/auth/invitations/lookup` y `POST /api/auth/invitations/accept`, con `throttle:invitations`, tal como en [contracts/http.md](./contracts/http.md).

El flujo de `accept`: `AcceptInvitationRequest` valida la forma (token; nombre de 1 a 80 caracteres sin caracteres de control; contraseña, con `password_confirmation` `same:password`; `privacyVersion` igual a la vigente); después `Invitations::lookup` (404 o 410); después `PasswordPolicy::violations` con el nombre del pedido y el email de la invitación (422 con `errors.password`, y la invitación sigue vigente); después `Invitations::accept`; y, ya fuera de la transacción, `Auth::login($user)` (que regenera el ID de la sesión), `taller.authenticated_at` y la respuesta 201 con `PublishedUser`.

**Pasos:**

1. Las pruebas, con `Browser::useDatabaseDrivers()`. Fallan porque las rutas no existen:
   - **Consultar**: 200 con exactamente `{email, role, expiresAt}` y `expiresAt` en ISO con `.000Z`; 410 `invitation_expired` pasado el vencimiento; 404 `invitation_not_found` para una usada, una revocada (borrada), una inventada de 43 caracteres y una mal formada, y la mal formada sin consultar la base; 422 `validation_failed` sin token; sin `X-Taller-User` el pedido pasa (es público).
   - **Aceptar, el camino feliz**: 201 `{"data": {id, name, email, role, privacyAccepted: true}}`, la cookie de sesión nueva (otro valor que la de antes del pedido), un pedido siguiente a una ruta del grupo `account` con ese `Browser` responde 200, la cuenta nace `active` y con el email verificado, y la invitación ya no está. Un `GET /api/session` posterior trae el usuario.
   - **El rol sale de la invitación**: una invitación de admin crea un `admin`; un cuerpo con `role: 'admin'`, `status` o `user_id` sobre una de alumno se ignora.
   - **422 con la invitación intacta**, una prueba por motivo: contraseña de 14 caracteres, que contiene la parte local del email, que contiene el nombre, que está en la lista de muestra; no coincide con su confirmación (`errors.password_confirmation`); `privacyVersion` vieja (`errors.privacyVersion`); nombre vacío, de 81 caracteres y con un carácter de control. Después de cada una, la consulta sigue dando 200.
   - **Límite**: entre consultar y aceptar se comparten los 10 por minuto por red: 6 consultas y 4 aceptaciones pasan y el pedido 11 recibe 429 con `Retry-After`; otra red pasa.
   - **CSRF** (con `enforceCsrf()`): un `POST` sin token da 419.
   - **El registro** de `invitation.accepted` aparece una vez, sin el token ni la contraseña.
   - **Carreras, en la suite `Content`** (`InvitationRaceTest`, con un gancho que corre después de la primera consulta a `invitations`, como en `ContentEndpointTest`): otro actor completa la aceptación entre la consulta y la transacción, y la nuestra da 404; otro inserta una cuenta con ese email en el medio, y la nuestra da 409 `email_taken`; una segunda aceptación seguida del mismo token da 404.
2. Implementá el controlador, los `FormRequest` y las dos rutas.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. Las rutas se agregan sólo a `routes/api/access.php`.

### Tarea 6.3 · Recuperación por consola (T018)

- **Crea:** `backend/api/app/Auth/{PasswordResetLinks,IssuedResetLink,ResetLinkThrottled,AccountNotActive}.php`, `backend/api/app/Console/Commands/IssuePasswordResetLink.php`, `backend/api/app/Http/Controllers/Auth/ResetPasswordController.php`, `backend/api/app/Http/Requests/ResetPasswordRequest.php`, `backend/api/tests/Feature/Console/PasswordResetLinkTest.php` y `backend/api/tests/Feature/Auth/ResetPasswordTest.php`.
- **Modifica:** `backend/api/routes/api/access.php` (suma `POST /api/auth/reset-password` con `throttle:reset-password`).
- **Entrega** (firmas de referencia):

```php
final readonly class IssuedResetLink { public function __construct(public string $url, public CarbonImmutable $expiresAt); }
final class ResetLinkThrottled extends RuntimeException { public function __construct(public readonly int $secondsLeft); }
final class AccountNotActive extends RuntimeException {}

final class PasswordResetLinks
{
    /** @throws ResetLinkThrottled  se emitió otro hace menos de 60 segundos
     *  @throws AccountNotActive    la cuenta está disabled o deleting */
    public function issue(User $user): IssuedResetLink;      // <APP_URL>/#restablecer=<token>&email=<email codificado>
}
```

El flujo de `ResetPasswordController`: valida la forma; busca la cuenta por email (para su nombre); `PasswordPolicy` con el email del pedido y, si existe, el nombre (422 con `errors.password`, antes de tocar el token); `Password::broker()->reset(['email' => …, 'status' => 'active', 'token' => …, 'password' => …], $callback)`. El callback fija la contraseña con `AccountPasswords::set`, guarda, llama a `AccountSessions::endAll` y a `AccountLockout::clear`. `PASSWORD_RESET` da 200 `{}`; `INVALID_USER` e `INVALID_TOKEN` dan el mismo 422 con `errors.token`. No inicia sesión.

**Pasos:**

1. Las pruebas, con `Carbon::setTestNow()`. Fallan porque las clases no existen:
   - **Consola**: una cuenta `active` (también un admin) sale con 0 y el link `<APP_URL>/#restablecer=<token>&email=ana%40x.com`; la base guarda un hash bcrypt y no el token; una segunda corrida a los 10 segundos sale con 1 y dice que faltan 50; a los 61 segundos emite; un email sin cuenta, una cuenta `disabled` y una `deleting` salen con 1; no se envía ningún correo ni notificación (`Mail::fake()` y `Notification::fake()` sin nada enviado).
   - **El restablecimiento, camino feliz**: 200 con el objeto `{}` (el cuerpo es `{}` y no `[]`: `response()->json((object) [])`); la contraseña nueva verifica (fijada con la `á` descompuesta y verificada con la compuesta); el `remember_token` cambió; las filas de `sessions` de la cuenta ya no existen; el estado del bloqueo (fijado en 12 fallos) quedó en cero; no hay una sesión abierta en la respuesta; el token no sirve una segunda vez.
   - **El mismo 422**: un token inválido, uno vencido (a los 61 minutos), un email sin cuenta, una cuenta `disabled` y una `deleting` dan cuerpos idénticos (`errors.token`).
   - **La política va primero**: una contraseña de 14 caracteres da 422 con `errors.password` con un token válido y con uno inválido, igual en los dos.
   - **Límites**: 10 por minuto por red y 5 por minuto por email (el sexto pedido con el mismo email desde otra red da 429).
   - **CSRF**: un `POST` sin token da 419 (con `enforceCsrf()`).
2. Implementá `PasswordResetLinks` (consulta `password_reset_tokens.created_at` para decir cuántos segundos faltan), el comando, el controlador y la ruta.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

## 7. Cuenta y sesión (dueño A, onda 3)

**Cubre:** FR-008, FR-010 a FR-016, FR-022, FR-027 a FR-030, FR-034 y FR-035 (historias 2 y 4, y `GET /api/session` de la 3).

**Entrega:** el ingreso, la salida, `GET /api/session` y la cuenta propia, con las rutas de `routes/api/account.php`.

### Tarea 7.1 · Ingreso y salida (T019)

- **Crea:** `backend/api/app/Auth/{LoginPipeline,LoginOutcome,LoginResult}.php`, `backend/api/app/Http/Controllers/Auth/{LoginController,LogoutController}.php`, `backend/api/app/Http/Requests/LoginRequest.php`, `backend/api/routes/api/account.php` y `backend/api/tests/Feature/Auth/{LoginTest,LogoutTest,RememberMeTest,SessionLifetimeTest}.php`.
- **Entrega** (firmas de referencia):

```php
enum LoginResult: string { case Success = 'success'; case Failed = 'failed'; case Disabled = 'disabled'; case Throttled = 'throttled'; case Locked = 'locked'; }
final readonly class LoginOutcome
{
    public function __construct(public LoginResult $result, public ?User $user = null, public ?DeviceToken $device = null, public int $retryAfter = 0);
}
final class LoginPipeline   // un método por paso de ADR 0006 §4.2 (research.md, R6)
{
    public function attempt(string $rawEmail, PlainPassword $password, bool $remember, Request $request): LoginOutcome;
}
```

`LoginController::store` traduce el resultado: `Success` a 200 `{data: PublishedUser}` con la cookie de dispositivo (`DeviceCookie::make`); `Failed` a 422 `auth_failed`; `Disabled` a 403 `account_disabled`; `Throttled` y `Locked` a 429 con `Retry-After`. `LogoutController` hace `Auth::logout()` (que rota el token de «recordarme»), invalida la sesión, regenera el token CSRF y responde 204. `routes/api/account.php` empieza con `POST /auth/login` (pública) y el grupo `account` con `POST /auth/logout`.

El ingreso no usa `Auth::attempt`: su rehash automático hashearía la cadena sin normalizar. Hace `Auth::login($user, $remember)`, que ya regenera el ID de la sesión.

**Pasos:**

1. Las pruebas, con `Browser::useDatabaseDrivers()`, `Sleep::fake()` y `Carbon::setTestNow()`. Fallan porque las rutas no existen:
   - **Éxito**: 200 con las cinco claves del usuario; la cookie de sesión (HttpOnly, `SameSite=Lax`) con un valor distinto del de antes del ingreso y la fila vieja de `sessions` descartada; la cookie de dispositivo con 180 días; la de recuerdo (HttpOnly, 30 días: `Max-Age` 2 592 000) sólo si es un estudiante con `remember: true`, y nunca para un admin con `remember: true`; `taller.authenticated_at` marcado. Una contraseña fijada con la `á` descompuesta ingresa con la compuesta.
   - **Sin enumeración**: un email que no existe y una contraseña equivocada dan el mismo estado, el mismo cuerpo `{message, code: auth_failed}` y las mismas cabeceras (salvo las cookies); con `Sleep::fake()` los dos caminos registran un sueño total de entre 150 y 200 ms; `AccountPasswords::dummyHash()` tiene el costo configurado.
   - **Estado**: `disabled` con la contraseña correcta, 403 `account_disabled` y ninguna sesión (ni cookie de sesión autenticada); con la incorrecta, 422 `auth_failed`; `deleting`, 422 `auth_failed` igual que un email inexistente.
   - **Límites** (FR-012): cinco intentos fallidos con el mismo email y red dan 422 y el sexto 429 con `Retry-After` entre 1 y 60; con 60 emails distintos de la misma red, el 61.º da 429; cuatro fallos, un ingreso correcto y cuatro fallos más no dan 429 (el éxito limpia el contador de email y red).
   - **Bloqueo** (FR-013), con IPs distintas para no chocar con el límite por red: diez fallos seguidos desde dispositivos sin cookie; el siguiente dispositivo desconocido recibe 429 con `Retry-After` de 60 (más o menos un segundo); el titular con su cookie de dispositivo ingresa igual; el siguiente fallo, tras esperar, bloquea 120 s; con 100 fallos, hasta `AccountLockout::clear`. Los emails inexistentes se bloquean igual que los existentes.
   - **«Recordarme»** (FR-015): con la fila de la sesión borrada (vencida) y la cookie de recuerdo, un pedido de una ruta del grupo `account` responde 200 con una sesión nueva; salir invalida esa cookie; el token de «recordarme» cambia al salir.
   - **Duración de la sesión** (FR-006): a los 31 minutos de inactividad, 401 `unauthenticated`; a las 8 horas y un minuto de actividad continua, 401 sin cookie de recuerdo y 200 con ella.
   - **Salir** (FR-016): 204; la cookie ya no sirve ni con la de recuerdo vieja; el siguiente pedido a una ruta de `account` da 401.
   - **Validación**: sin email o contraseña, o con un email sin forma de email, 422 `validation_failed`; con el CSRF forzado, un `POST` sin token da 419.
   - **SC-010**: 40 cuentas distintas, la misma red y la contraseña correcta, ingresan en el mismo minuto sin un solo 429.
2. Implementá `LoginPipeline` con un método por paso, y los controladores.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. El valor de `Max-Age` de la cookie de recuerdo confirma que el coordinador puso `setRememberDuration` (S2).

### Tarea 7.2 · `GET /api/session` (T020)

- **Crea:** `backend/api/app/Http/Controllers/SessionController.php`, `backend/api/app/Content/ActiveCatalogs.php`, `backend/api/tests/Feature/SessionEndpointTest.php`, `backend/api/tests/Content/SessionEndpointTest.php` y `backend/api/tests/Unit/Record/CatalogFromRowTest.php`.
- **Modifica:** `backend/api/app/Content/Record/Catalog.php`, `backend/api/app/Content/ContentImports.php` y `backend/api/routes/api/account.php` (suma `GET /session`).
- **Entrega** (firmas de referencia):

```php
// Catalog (C6) suma, si todavía no lo tiene (T001), con el patrón de Language::fromRow:
public static function fromRow(array $row): self;                              // RowFields: code, slice_by, chain_position
/** @return array{code: string, sliceBy: string, chainPosition: int|null} */
public function toPublished(): array;

// ContentImports suma:
public function latestVersion(): ?string;   // los 32 primeros hexadecimales del document_hash del último import; sin decodificar portion_hashes

final class ActiveCatalogs
{
    /** @return list<array{code: string, sliceBy: string, chainPosition: int|null}> activos: primero por posición (de menor a mayor), después los sin posición, cada grupo por code */
    public function published(): array;
}
```

`SessionController::show` responde `{user, features, contentVersion, catalogs}` con `Cache-Control: no-store`. `features` sale de `config('taller.features')`.

**Pasos:**

1. Las pruebas. Fallan porque la ruta y los métodos no existen:
   - **`CatalogFromRowTest`**: con los valores como los devuelve el driver (`chain_position` como `'3'` o `null`), da `Catalog` con un entero o `null`; `toPublished` tiene las tres claves; una fila sin la columna lanza `LogicException`.
   - **Sin import** (`Feature`): un invitado recibe 200 con `user: null`, `features` en `false`, `contentVersion: null` y `catalogs: []`; la cabecera `Cache-Control` es `no-store`; hay una cookie `XSRF-TOKEN` y la de sesión; se creó una fila de `sessions` con `user_id` nulo; no hay una clave `appBuild`.
   - **Con import** (`Content`, que importa el contenido): `contentVersion` es el prefijo de 32 hexadecimales del `documentHash` de `curriculum.meta.json`, leído del archivo; `catalogs` es la lista `catalogs` de ese meta, con `{code, sliceBy, chainPosition}`, en el orden de la tabla del contrato; un catálogo con `status` `deprecated` insertado a mano no sale; la respuesta no consulta `exercises`, `topics` ni `workshops`.
   - **Con sesión**: el usuario sale con las cinco claves; `privacyAccepted` es falso sin la versión vigente y verdadero con ella.
   - **Sesión inválida** (cuenta `disabled`, contraseña cambiada en otra sesión, 8 horas sin cookie de recuerdo): 200 con `user: null` y la sesión ya no sirve en el pedido siguiente.
2. Implementá `Catalog::fromRow` y `toPublished`, `ContentImports::latestVersion`, `ActiveCatalogs` y el controlador.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde y las de C6 (`tests/Unit/Record/`) sin cambios en verde.

### Tarea 7.3 · Cuenta propia: nombre, contraseña, aviso, otras sesiones y confirmación (T021)

- **Crea:** `backend/api/app/Http/Controllers/MeController.php`, `backend/api/app/Http/Controllers/Auth/ConfirmPasswordController.php`, `backend/api/app/Http/Requests/{ConfirmPasswordRequest,UpdateNameRequest,ChangePasswordRequest,PrivacyRequest,LogoutOthersRequest}.php`, `backend/api/tests/Feature/Auth/{ConfirmPasswordTest,MeTest}.php`.
- **Modifica:** `backend/api/routes/api/account.php` (suma `PATCH /me`, `PUT /me/password`, `POST /me/privacy`, `POST /me/sessions/logout-others`, `POST /auth/confirm-password` y `GET /auth/confirmed-password-status`, todas en el grupo `account`).
- **Entrega:** los seis endpoints de [contracts/http.md](./contracts/http.md).

El flujo de `PUT /api/me/password`: valida la forma; `PasswordProof::verify` de la contraseña actual (equivocada, 422 `auth_failed`; limitada o bloqueada, 429); `PasswordPolicy` de la nueva con el nombre y el email de la cuenta (422 con `errors.password`); `WriteTransaction::run` fija la contraseña con `AccountPasswords::set` y guarda; después `AccountSessions::endOthers`; y responde 200 `{data: PublishedUser}`. `POST /me/sessions/logout-others` verifica con `PasswordProof` y llama a `endOthers`. `POST /auth/confirm-password` verifica con `PasswordProof`, llama a `RequirePassword::markConfirmed` y regenera el ID de la sesión; `GET /auth/confirmed-password-status` responde `RequirePassword::isConfirmed`.

**Pasos:**

1. Las pruebas, con `Browser::useDatabaseDrivers()`. Fallan porque las rutas no existen:
   - **`PATCH /api/me`**: 200 `{data: user}` con el nombre nuevo; un cuerpo con `email`, `role`, `status` o `user_id` los ignora (el rol y el estado guardados no cambian); un nombre de 0 o de 81 caracteres, o con un carácter de control, da 422.
   - **Revocación** (FR-007, FR-049): una cuenta con una sesión viva pasa a `disabled` y el siguiente pedido a una ruta de `account` recibe 403 `account_disabled` aunque la prueba no haya tocado la fila de `sessions`, y el que sigue recibe 401. Con dos sesiones abiertas, cambiar la contraseña en la primera da 200 con un ID de sesión nuevo, y la segunda recibe 401 en su siguiente pedido, también con su cookie de recuerdo (un estudiante con «recordarme»); la primera conserva su cookie de recuerdo, ya con el token nuevo.
   - **`PUT /api/me/password`**: la actual equivocada da 422 `auth_failed` y suma un fallo al bloqueo; una nueva que no cumple la política da 422 `errors.password`; 5 pedidos por minuto, el sexto 429. La nueva fijada con la `á` descompuesta ingresa con la compuesta.
   - **`POST /api/me/sessions/logout-others`**: 204; las otras sesiones dejan de servir, la actual sigue y el token de «recordarme» cambió; con la contraseña equivocada, 422 `auth_failed`.
   - **`POST /api/me/privacy`**: 204 con la versión vigente y las columnas guardadas; 422 con otra.
   - **Confirmación**: `POST /api/auth/confirm-password` con la contraseña correcta da 201 con el objeto `{}` (no `[]`), cambia el ID de la sesión y `confirmed-password-status` pasa a `{"confirmed": true}` durante 900 segundos (899 sí, 901 no); sin confirmar, una ruta de prueba con `password.confirm` da 423 `password_confirmation_required`; con la contraseña equivocada, 422 `auth_failed`, un fallo más para el bloqueo; el sexto intento en un minuto, 429.
   - **Pasada por el bloqueo**: diez contraseñas equivocadas en confirmar, cambiar o cerrar las otras sesiones, desde un dispositivo sin cookie, bloquean el ingreso de esa cuenta para dispositivos desconocidos.
   - **Cuenta esperada**: cada una de estas rutas sin `X-Taller-User` da 409 (el recorrido general es T023).
2. Implementá los controladores, los `FormRequest` y las rutas.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

## 8. Integración (coordinador, onda 4)

**Cubre:** FR-031 a FR-033, FR-036, FR-037, FR-045, FR-048 y FR-049 (historias 3 y 6).

**Entrega:** el contenido detrás de la sesión y las pruebas que recorren todas las rutas. Parte de S3.

### Tarea 8.1 · El contenido detrás de la sesión (T022)

- **Crea:** `backend/api/tests/Content/ContentAccessTest.php`.
- **Modifica:** `backend/api/routes/api.php` y `backend/api/tests/Content/ContentEndpointTest.php`.

**Pasos:**

1. `ContentAccessTest`, con el contenido importado. Falla porque hoy el contenido es público:
   - Las seis rutas (`/api/exercises?catalog=lab&language=rust`, `/api/exercises/rust-01`, `/api/worlds?language=go`, `/api/workshops?domain=pc`, `/api/atlas?language=rust` y `/api/guide`) sin sesión dan 401 `unauthenticated` en JSON, con y sin `Accept`, sin un solo dato del contenido (6 de 6).
   - Con una cuenta sin verificar, 403 `email_unverified` (6 de 6).
   - Con una cuenta `admin` verificada, el cuerpo y las cabeceras son los de una cuenta de alumno.
   - Con sesión, el sha256 del cuerpo de cada una de las 17 porciones es el de `portions` de `curriculum.meta.json` y el de cada uno de los 274 ejercicios es su `contentHash`; `ETag` y `Content-Version` son los de C2; el 304 responde ante un `If-None-Match` fuerte y uno débil; `Cache-Control` es exactamente `private, no-cache`; no hay `Vary` ni `X-RateLimit-*`.
2. En `ContentEndpointTest`, una línea `beforeEach(fn () => $this->actingAs(User::factory()->create()))` autentica sus unos 33 pedidos. Ningún valor esperado cambia. Corrélo: pasa antes y después del paso 3.
3. En `routes/api.php`, las seis rutas pasan a `Route::middleware(['account', 'verified'])->group(...)`, y se reescribe el comentario («public until C3»).
4. Corré la suite: `ContentAccessTest` y `ContentEndpointTest` en verde.
5. Anotá que `api:content:check`, `deploy-check.sh` y `smoke.sh` quedan en rojo hasta T024.

**Compuerta:** `npm run api:test` en verde.

### Tarea 8.2 · Recorridos y matrices (T023)

- **Crea:** `backend/api/tests/Feature/{RouteAccessTest,ExpectedAccountMatrixTest,MassAssignmentTest,LogsWithoutSecretsTest}.php`.

Estas pruebas recorren lo que entregaron los demás, y por eso nacen en verde. Para ver que detectan, cada una tiene su mutación: quitá un middleware de una ruta (o un `account_mismatch` de una escritura) en una copia de trabajo, comprobá que la prueba falla por esa razón y restaurá.

**Pasos:**

1. **`RouteAccessTest`** (FR-048): recorre `Route::getRoutes()` y, para toda ruta de `api/` que no esté en la lista blanca (`api/up`, `api/session`, `api/auth/login`, `api/auth/invitations/lookup`, `api/auth/invitations/accept` y `api/auth/reset-password`), exige en `gatherRouteMiddleware` el `Authenticate` de `web`, `EnsureUserIsActive` y, si el método no es `GET`, `EnsureExpectedAccount`. Cada ruta `GET` protegida, sin sesión y sin `Accept`, da 401 `unauthenticated` en JSON. Una prueba aparte pasa a la misma función una ruta inventada sin middleware y comprueba que la marca: el recorrido falla por defecto.
2. **`ExpectedAccountMatrixTest`** (FR-036, SC-006): para cada ruta protegida que modifica, con la cuenta A y `X-Taller-User` de B, o sin la cabecera, la respuesta es 409 `account_mismatch` y el registro de consultas no tiene una sola escritura salvo en `sessions` y `cache`.
3. **`MassAssignmentTest`** (FR-002): `User::create` con `role` y `status`; `PATCH /api/me` con `role`, `status`, `email` y `user_id`; `POST /api/auth/invitations/accept` con `role`, `status` y `user_id`: el rol y el estado guardados no cambian.
4. **`LogsWithoutSecretsTest`** (historia 7, escenario 7; FR-045): con un `TestHandler` de Monolog en el canal `stderr`, diez ingresos fallidos, uno correcto, la aceptación de una invitación y un `QueryException` registrado. Ningún registro contiene la contraseña, el token de la invitación ni el ID de la sesión; el email sólo sale como `email:<hmac>`; el escalón del bloqueo trae el HMAC, la IP y el `request_id`; la aceptación trae `invited_by` nulo y el id de la cuenta.

**Compuerta:** las cuatro en verde, cada una con su mutación comprobada.

## 9. Checks contra el stack y cierre (O y coordinador, onda 4)

**Cubre:** FR-041, FR-046, FR-050 a FR-052 y SC-008, SC-011 y SC-012.

**Entrega:** los checks que siguen pasando con el contenido protegido, la documentación al día y la evidencia de cierre.

### Tarea 9.1 · Los checks se autentican (T024)

- **Crea:** `backend/api/scripts/check-account.sh` y `qa/lib/api-account.ts`.
- **Modifica:** `backend/api/scripts/{smoke,deploy-check}.sh` y `qa/api-content-check.ts`.

**Pasos:**

1. Con T022 integrado y el stack levantado, corré `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`: fallan con 401, que es la razón esperada. Anotá las líneas.
2. Escribí el helper del shell (`check_account_open`, que crea la invitación con `docker compose exec -T php php artisan taller:invite check-<aleatorio>@taller.invalid`, toma el token del link, pide `GET /api/session` para la cookie `XSRF-TOKEN` y acepta la invitación con una contraseña aleatoria de 32 caracteres y la versión del aviso que lee con `php artisan tinker --execute="echo config('taller.privacy_version');"`, y deja el frasco de cookies; y `check_account_close`, que borra la cuenta con SQL de `root` por `docker compose exec -T mysql`, como el `sql()` de `deploy-check.sh`) y su par en TypeScript (`qa/lib/api-account.ts`, con `execFileSync` y `node:http`).
3. Adaptá los tres checks:
   - `qa/api-content-check.ts` manda la cookie en cada pedido y cierra la cuenta en un `finally`.
   - `deploy-check.sh` abre la cuenta después del despliegue sano (paso 1), usa el frasco en `guide()` y la cierra en su `trap … EXIT`.
   - `smoke.sh` suma: una porción sin sesión responde 401 `unauthenticated` en JSON; `GET /api/session` responde 200 con `user: null` y `Cache-Control: no-store`.
4. Corré `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`: pasan.
5. Comprobá que no queda una cuenta de prueba (`SELECT COUNT(*) FROM users WHERE email LIKE 'check-%@taller.invalid'` da 0), también si un check falla a la mitad.

**Compuerta:** los tres checks en verde y ninguna cuenta olvidada.

### Tarea 9.2 · `deploy-check.sh`: una transacción larga detiene el despliegue (T025)

- **Modifica:** `backend/api/scripts/deploy-check.sh`.

**Pasos:**

1. Escribí el escenario nuevo: con `root`, en segundo plano, `START TRANSACTION; SELECT COUNT(*) FROM users; SELECT SLEEP(40)`; esperá 32 segundos; corré `docker compose run --rm migrate` con la imagen vigente. Nace en verde, porque T013 ya cableó el chequeo en `migrate.sh`. Para ver que detecta, comentá esa línea de `migrate.sh` en una copia de trabajo, comprobá que el escenario falla (`migrate` no se detiene) y restaurala.
2. El escenario exige: `migrate` sale con un código distinto de cero; su salida contiene «transacciones abiertas»; `php` sigue siendo el mismo contenedor y no se reinició; la cantidad de filas de `migrations` no cambió. Después se corta la sesión y el mismo `migrate` sale bien.
3. Confirmá que el escenario 3 del script (el sostenedor `LOCK TABLES … SELECT SLEEP(180)`, sin transacción) sigue dando «migrate reintentó 3 veces y se rindió»: el chequeo corre en los primeros segundos y ese sostenedor no abre una transacción de InnoDB. Si el chequeo lo detectara, el escenario se ajusta, no el chequeo.
4. Corré `sh backend/api/scripts/deploy-check.sh`: pasa. Anotá cuánto tarda.

**Compuerta:** `deploy-check.sh` en verde con el escenario nuevo.

### Tarea 9.3 · La documentación (T026)

- **Modifica:** `backend/api/AGENTS.md`, `AGENTS.md`, `README.md` y `docs/architecture.md`.

**Pasos:**

1. `backend/api/AGENTS.md` (FR-052): reemplazá la frase sobre Sanctum («sin `php artisan install:api`, que instala Sanctum; la autenticación llega en C3 con `composer require`») por lo vigente: no se usa Sanctum, la sesión se monta a mano en `bootstrap/app.php`. Sumá una sección «Identidad y acceso (C3a)» con: los grupos `account` y `verified` y el archivo propio por característica en `routes/api/`; `ApiCode` y `ApiError::of`; `PlainPassword` y `AccountPasswords` como única puerta de las contraseñas; `Browser` y `Browser::useDatabaseDrivers()` en las pruebas; los comandos `taller:invite`, `taller:password-reset-link` y `taller:check-transactions`; `db-grants`; y que el rol y el estado de una cuenta se cambian con `tinker` hasta C3b.
2. `AGENTS.md` y `README.md`: el `.env` ahora lleva también `LOG_HMAC_KEY` (la lista de secretos que agrega `init-env.sh`); `README.md` suma una sección «Cuentas» con el alta (`taller:invite`), la recuperación (`taller:password-reset-link`) y el `db-grants` de un volumen existente.
3. `docs/architecture.md`: una fila de «Identidad y acceso (ADR 0006, C3a)» en el mapa, con `backend/api/app/Auth/`, `app/Http/`, `routes/api/` y los contratos de `specs/004-c3-identidad-acceso/contracts/`.
4. Verificá rutas, comandos y enlaces locales de lo editado (un recorrido que resuelva cada ruta citada) y `git diff --check`.

**Compuerta:** las rutas y los enlaces resuelven; los comandos citados existen.

### Tarea 9.4 · La prueba en un navegador real (T027)

**Pasos:** el coordinador ejecuta el guion del escenario 8 de [quickstart.md](./quickstart.md) en un navegador real contra el stack de Docker: la cookie de sesión (HttpOnly y SameSite), el CSRF y el cambio de cuenta en el mismo navegador (una pestaña de A, después de que B ingresó, recibe 409). Anota lo que vio, con el navegador y su versión. Si el usuario adopta Playwright antes (la F1 del épico del front prevé hacerlo, pero sus pruebas corren contra `vite preview`, sin `/api`), el mismo guion se escribe como prueba contra el stack. Si no, se declara como límite en el PR.

**Compuerta:** los tres escenarios de FR-050 vistos y anotados, o declarados como no verificados.

### Tarea 9.5 · La compuerta final (T028)

**Pasos:** corré, en este orden, y anotá el resultado real de cada uno:

1. `npm run api:format:check`, `npm run api:analyse` (0 errores, nivel 9, sin baseline) y `npm run api:test`, también en orden aleatorio (`-- --order-by=random`).
2. `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`.
3. Con `docker compose up --build -d --wait`: `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.
4. `docker compose config --services` y `--volumes` contra `master`: sólo suman `scheduler` y `db-grants`.
5. Un despliegue desde una base vacía (volumen nuevo): el `db-grants.sql` se aplica solo, el chequeo pasa y `taller:invite --role=admin` más la aceptación dejan al primer admin con sesión.
6. El PR, con título `feat(api): …` en inglés y su descripción completa, con la evidencia y los límites (lo que no se verificó).

**Compuerta:** todo lo anterior en verde o con su límite escrito.

## Cobertura de requisitos

Cada requisito con las tareas que lo implementan o lo prueban. `tasks.md` cita los mismos requisitos en cada línea.

| Requisito | Tareas |
| --- | --- |
| FR-001 | T004, T005, T006 |
| FR-002 | T006, T017, T021, T023 |
| FR-003, FR-004 | T004, T005 |
| FR-005 | T009, T010 |
| FR-006 | T009, T010, T019 |
| FR-007 | T010, T019, T021, T023 |
| FR-008 | T017, T019, T021 |
| FR-009 | T010, T020 |
| FR-010 | T007, T019 |
| FR-011, FR-015, FR-016 | T019 |
| FR-012 | T007, T011, T019 |
| FR-013 | T011, T019, T021 |
| FR-014 | T011, T019 |
| FR-017 | T005, T007, T016 |
| FR-018 | T016 |
| FR-019 | T017 |
| FR-020 | T016, T017 |
| FR-021 | T007, T012, T015, T016, T017, T018, T023 |
| FR-022 | T008, T017, T021 |
| FR-023 | T002, T003, T008, T017, T018, T021 |
| FR-024 | T003, T008 |
| FR-025 | T018 |
| FR-026 | T011, T018 |
| FR-027 a FR-029 | T021 |
| FR-030 | T010, T011, T021 |
| FR-031 a FR-033 | T022 |
| FR-034 | T020 |
| FR-035 | T008, T019, T020, T021 |
| FR-036 | T010, T023 |
| FR-037 | T009, T023 |
| FR-038 | T009 |
| FR-039 | T012, T014 |
| FR-040 | T012, T013 |
| FR-041 | T013, T025 |
| FR-042 | T013 |
| FR-043, FR-044 | T012 |
| FR-045 | T007, T015, T023 |
| FR-046 | T024 |
| FR-047 | T010 |
| FR-048 | T023 |
| FR-049 | T021, T023 |
| FR-050 | T027 |
| FR-051 | T001, T028 |
| FR-052 | T009, T012, T026 |
| SC-001 | T022 |
| SC-002 | T016, T017 |
| SC-003, SC-004 | T011, T019 |
| SC-005 | T010, T018, T021 |
| SC-006 | T023 |
| SC-007 | T009, T023 |
| SC-008 | T013, T025 |
| SC-009 | T012 |
| SC-010 | T012, T019 |
| SC-011 | T028 |
| SC-012 | T027 |

## Descargas y permisos

Ninguna se hace sin el permiso del usuario, con nombre, origen y tamaño (constitución, principio VII).

| Qué | Tarea | Detalle |
| --- | --- | --- |
| `100k-most-used-passwords-NCSC.txt` | T003 | SecLists, `Passwords/Common-Credentials/`, 835 538 bytes. La licencia de SecLists es MIT; la de los datos del NCSC está sin confirmar |
| Declarar `symfony/polyfill-intl-normalizer` | T002 | Ya está en `composer.lock` (v1.43.0). No baja un paquete nuevo, pero `composer require` consulta Packagist |
| Imágenes de Docker | — | Ninguna nueva: `db-grants` usa la imagen `mysql:9.7` ya fijada, y `scheduler`, la de `php` |
| Playwright | T027 | No entra por omisión (FR-050): sólo si el usuario lo adopta |

Para las pruebas que usan Docker (T012, T013, T024, T025 y T028), las imágenes ya están en la máquina: si un comando intenta descargar algo, se pide permiso.

## Lo que quedó sin verificar

Esta planificación no ejecutó nada. Lo que hay que medir o comprobar al implementar, y quién lo hace:

| Qué | Cómo se resuelve |
| --- | --- |
| Todo el código de referencia: las firmas, el SQL, la configuración de Nginx y de Compose y los scripts | Las pruebas de cada tarea; si algo no compila o no corre, se corrige la referencia, no la prueba |
| El DDL de [data-model.md](./data-model.md) contra MySQL 9.7 (el `ALTER` de `users`, el `RENAME TABLE` bajo `lock_wait_timeout=5`) | La prueba de esquema y `migrate:fresh` de T004 y T005 |
| Si Docker reenvía el DNS desde un contenedor que sólo está en redes `internal` | T012: la comprobación va primero y dice si ya fallaba sin la opción |
| `PS_CURRENT_THREAD_ID()` con un usuario sin privilegios, y que el manual de la serie 9.0 valga para 9.7 | T013, con el usuario restringido |
| El `map` con expresión regular y claves vacías de Nginx, la página del 429 y la repetición de cabeceras | `nginx -t` y el smoke de T012 |
| Que el ordenador de middleware de Laravel respete el orden del grupo `api` | La prueba del orden efectivo de T010 |
| Que `$app['env'] = 'local'` haga correr `PreventRequestForgery` en las pruebas | El paso rojo de las pruebas de 419 (T010): si no aparece el 419, no se sigue |
| `AuthenticateSession` como sonda (con un `$next` vacío), con y sin cookie de recuerdo, y que `Auth::login` guarde `password_hash_web` | T010, T019 y T021 |
| El doble hash de `logoutOtherDevices` al cambiar la contraseña, y que el cast `hashed` no vuelva a hashear un hash ya hecho | T016 y T021 |
| `DELETE … ORDER BY … LIMIT` por el generador de SQL del query builder | Las sentencias capturadas de T014 |
| Cuántas líneas de la lista del NCSC alcanzan los 15 caracteres | T003 |
| Que el chequeo previo no vea al sostenedor de `deploy-check.sh` y no cambie sus escenarios | T025 |
| El orden en que `Handler::render` aplica `prepareException` y los callbacks (los tipos que ven) | `ApiExceptionsTest` de T009 |
| Que `Timebox` con `Sleep::fake()` registre entre 150 y 200 ms | T019 |
| La línea de base: se leyó de `feat/c6-registros-tipados` (`afd00ac`) y el PR #17 mergeado puede diferir | T001 |
| La prueba en un navegador real | T027: manual y declarada, salvo que se adopte Playwright |

## Complexity Tracking

Sin violaciones de la constitución que justificar. Hay dos desvíos del ADR 0006, no de la constitución, que el usuario conoce y que la hoja de ruta registra como enmiendas pendientes: D17 (sin Fortify: decidido en el clarify) y D16 (`AuthenticateSession` corre dentro de `DropInvalidSession` en lugar de ir suelto en el grupo `api`, para que `GET /api/session` no responda 401: research.md, R3).
