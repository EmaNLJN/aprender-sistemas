# Implementation Plan: C3c · Correo, recuperación por email y registro abierto

**Branch**: `011-c3c-correo` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-c3c-correo/spec.md`, con su clarify del 2026-10-06. Decisiones: [research.md](./research.md). Tablas: [data-model.md](./data-model.md). Contratos: [contracts/http.md](./contracts/http.md), [contracts/console.md](./contracts/console.md) y [contracts/mail.md](./contracts/mail.md). Validación: [quickstart.md](./quickstart.md).

> **Objetivo.** Que el taller mande sus ocho correos desde un único contenedor aislado, por Brevo con SMTP, sin que un fallo del proveedor ni su ausencia rompan nada, y que todo se pueda implementar y probar antes de tener el dominio.
>
> **Arquitectura.**
> - **Una sola salida.** Todo correo es un trabajo cifrado, `SendMail`, en la cola `mail` (`mail_jobs`). Lo encola sólo `Mailbox`, después del COMMIT, y no encola nada en modo sólo link.
> - **Un solo proceso que habla con el proveedor.** Es `worker-mail`, en la red `mail` con `mysql` y en `egress`, con el usuario de MySQL `taller_mail` y las credenciales SMTP sólo en su entorno.
> - **El resto, sin cambiar su forma.** La recuperación, el registro, la verificación y los ganchos de C3b se apoyan en ese canal sin tocar el contrato de C3a.
>
> **Stack.** PHP 8.5 y Laravel 13.34 con `symfony/mailer` 8.1.7, ya en el lockfile; MySQL 9.7; Docker Compose; Pest 5.3 y PHPStan 2.2.17 en el nivel 9; checks de `qa/` en TypeScript con Node 24. Sin paquetes nuevos. La única descarga es Mailpit, y sólo con permiso.

> **Para quien lo implementa.**
> - El trabajo está partido en siete unidades, de la 0 a la 6, con su compuerta.
> - Cada tarea dice qué archivos crea y cuáles modifica, qué consume y qué produce, y sus pasos, que empiezan por la prueba.
> - `tasks.md` tiene una línea por tarea (T001…) y remite acá.
> - Las tareas de las acciones del usuario están al final y separadas: los agentes no las hacen.
>
> **Código sin ejecutar.** Se planificó sin correr PHP ni el stack. Las firmas, el SQL, el YAML y los textos son de referencia; las pruebas y los contratos mandan. «Lo que quedó sin verificar» lista lo que hay que medir al implementar.
>
> **Línea de base.** `master` en `dd870a9c`, con C3a (PR #24), B2 (PR #31), D1a (PR #36), C3b (PR #37) y D1b (PR #39) integrados. Los ganchos de C3b que C3c completa están en `master` (`App\Http\MailUnavailable` y sus tres sitios). F2a y F2b no tocan `backend/api/` ni `docker/`.
>
> **La regla del proyecto.** El `compose.yaml` de la raíz fija `name: taller-rust-go`, que es el stack del usuario. **Cada comando de Docker lleva `COMPOSE_PROJECT_NAME=taller-c3c` (u otro propio) en su misma línea**, también los `npm run api:*`. Nunca se toca el stack `taller-rust-go` ni su volumen `taller-rust-go_mysql-data`: ni `down -v`, ni `volume rm`, ni un `up` sin la variable.

## Summary

C3c le da al taller el correo que C3a y C3b dejaron pendiente. Lo hace con un único canal y sin agregar paquetes:

- **El canal.**
  - `Mailbox::queue(OutgoingMail)` es la única puerta: en modo sólo link no encola nada, y con correo encola un `SendMail` cifrado en la conexión `mail`, con `after_commit` (R1 y R7).
  - `SendMail` corre sólo en `worker-mail` y hace cuatro cosas: vuelve a mirar si hay correo, descarta un correo cuya invitación cambió de token (R6), manda un `Mailable` de texto sin vistas (R2) y marca `sent_at`.
  - Un fallo se reintenta a 1, 5, 15 y 60 minutos hasta el plazo (el vencimiento del link o 24 horas, lo que llegue primero: decisión 1, R4). Agotado el plazo, queda en `failed_jobs` sin la dirección (R5) y marca `send_failed_at`.
- **Recuperación.**
  - `forgot-password` responde siempre 202 sin consultar la cuenta y encola un trabajo cifrado en `default`, que arma el link y encola el correo (R8).
  - La recuperación de un tercero emite el link en el pedido del admin y responde 429 si el broker todavía no deja emitir otro.
  - El aviso de contraseña cambiada se engancha en `AccountPasswords::set()`.
- **Administración.**
  - La invitación por correo guarda su entrega, y cada admin manda hasta 300 correos por día, con `rate_limited` (R9).
  - El aviso de rol de admin sale al confirmar el cambio, y el de cuenta borrada, al terminar la purga, con el email cifrado dentro del trabajo (R10).
- **Registro abierto, apagado.**
  - Un middleware responde 404 con el interruptor apagado.
  - El registro abre la sesión y manda la verificación, con un token firmado en el fragmento y confirmado por un POST con sesión (R11).
  - Aceptar una invitación por correo reemplaza una cuenta sin verificar (R12), y una tarea programada poda las que nadie verificó (R13).
- **Cambio de email,** sólo por consola (R14).
- **Operación.**
  - `worker-mail` está en las redes `mail` y `egress`, sin el DNS cerrado (R15).
  - El usuario `taller_mail` sale del mecanismo de dos fases que diseñó C4, que C3c implementa ahora sólo para su cuenta (R16), y una prueba de Pest lo usa de verdad (R17).
  - Mailpit, en el perfil `dev`, sólo con permiso.

## Technical Context

**Language/Version**: PHP 8.5 (FPM y CLI) y Laravel 13.34 (`composer.lock`), en `backend/api/`. La sintaxis no pasa de PHP 8.3 (`composer.json` pide `^8.3`) y no hay `declare(strict_types=1)`. POSIX `sh` para los scripts, y TypeScript borrable con Node 24 para los checks de `qa/`.

**Primary Dependencies**: ninguna nueva. El código usa:
- del núcleo de Laravel 13: `Mailable`, `Mailer`, `ShouldBeEncrypted`, `retryUntil`, los atributos de colas, `RateLimiter::increment`/`decrement` y el evento `WorkerStarting`;
- el `EsmtpTransport` de `symfony/mailer` 8.1.7;
- Pest 5.3 con sus pruebas de arquitectura, PHPStan 2.2.17 y Larastan 3.12.3.

**Storage**: MySQL 9.7.
- **Una tabla nueva:** `mail_jobs` (data-model.md, §1).
- **Columnas que ya existen y C3c escribe:** `invitations.delivery`, `sent_at` y `send_failed_at`; `users.email_verified_at`; `account_deletions`; `password_reset_tokens`; `failed_jobs`.
- **Un usuario de MySQL nuevo:** `taller_mail`.

**Testing**:
- **Pest** contra `mysql-test` (`npm run api:test`), en las suites `Unit`, `Feature`, `Content` y `Concurrency`, con `MAIL_MAILER=array`. Las pruebas de «después del COMMIT», de los reintentos y del worker fijan el driver `database` para la conexión `mail` (R3).
- **Análisis y formato:** PHPStan en el nivel 9 (`npm run api:analyse`) y Pint.
- **Checks de `qa/`:** `apply-grants-check` y `compose-mail-check`, en `npm test`.
- **Contra el stack:** `npm run api:smoke`, `npm run api:content:check`, `sh backend/api/scripts/deploy-check.sh` y el nuevo `sh backend/api/scripts/check-mail.sh`.

**Target Platform**: Docker Compose en un servidor, Linux o macOS.

**Project Type**: servicio web (API Laravel) detrás de Nginx, con un worker de correo.

**Performance Goals**:
- el correo de recuperación sale hacia el proveedor en 3 minutos o menos (SC-002): hasta 60 s del `scheduler` más 3 s de `--sleep` del worker;
- ningún pedido HTTP espera al proveedor (SC-003);
- un lote de 100 invitaciones por correo son 100 transacciones cortas y 100 filas en `mail_jobs`.

**Constraints**:
- `php`, `scheduler`, `migrate` y los demás servicios siguen sin salida a Internet;
- ningún email, nombre, link ni token en claro en `mail_jobs`, en `jobs`, en `failed_jobs.exception` ni en los registros;
- sin `@phpstan-ignore` ni baseline;
- sin descargas, salvo Mailpit con permiso (T002).

**Scale/Scope**:

| Qué | Cuánto |
| --- | --- |
| Endpoints nuevos | 4 |
| Endpoints que cambian su respuesta | 4 (dos de invitaciones, la recuperación de un tercero y la aceptación) |
| Tablas nuevas | 1 |
| Trabajos nuevos y que cambian | 2 nuevos, 1 que cambia |
| Comandos nuevos | 2 |
| Tareas programadas nuevas | 1 |
| Servicios de Compose nuevos | 2 (`worker-mail` y `grants`), más Mailpit en el perfil `dev` |
| Redes nuevas | 2 |
| Archivos nuevos en `app/` | unos 30 |
| Archivos de prueba | unos 40 |
| Tareas | 37: 31 del implementador y del coordinador, en siete unidades, y 6 de las acciones del usuario |

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `backend/api/AGENTS.md`: un `CREATE TABLE` por migración, errores con `ApiError::of`, contraseñas por `AccountPasswords`, rutas por característica, Collections, Pest contra MySQL real y `COMPOSE_PROJECT_NAME` en línea. T030 actualiza esa guía, `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y el README en el mismo cambio (FR-055) |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con sus pruebas, que fallan por la razón que dice el paso. Los esperados salen de los contratos (`contracts/mail.md` tiene un correo resuelto a mano), de la spec (los topes, los plazos, la lista de permisos de FR-005) y de ejemplos resueltos en la prueba, nunca del código que se prueba. Hay dos trampas, que el plan esquiva: `Queue::fake()` no mira la transacción (R3), y los permisos de MySQL se prueban con el SQL real y una lista escrita aparte (R17) |
| III. Código entendible | Sí, con revisión | Clases chicas con un nombre y un contrato. Para revisar por complejidad: `SendMail::handle` (cuatro pasos con nombre), `InvitationController::store` (el tope, la clasificación y el encolado por email) y `Invitations::accept` (el reemplazo) |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | No toca el contenido ni sus IDs |
| V. Capas y contratos explícitos | Sí | Dominio del correo en `app/Mail/`, trabajos en `app/Jobs/`, transporte en `app/Http/`, operación en `app/Console/` y `docker/`, y contratos en `contracts/`. Ningún framework, paquete ni capa nueva: `Mailbox` es la puerta que ya pide D21, no un puerto sin uso |
| VI. Español, accesibilidad y portabilidad | Sí | Los correos, los mensajes de la API y la consola, en español; el código y las pruebas, en inglés. No hay interfaz. Los scripts son POSIX `sh`, y los checks de `qa/`, Node puro |
| VII. Secretos y salidas generadas fuera de Git | Sí | `MAIL_DB_PASSWORD` la genera `init-env.sh` en `.env`. La credencial SMTP la pone quien opera, y sólo `worker-mail` la recibe. Ninguna contraseña entra en `db-grants.sql`, en la línea de comandos ni en el binlog. Mailpit sólo con permiso (T002); ningún paquete de Composer |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. Al entregar, el directorio queda inmutable; lo que falte lo suma `/speckit-converge` al final |

## Restricciones globales

Son valores exactos, copiados de la spec, de la constitución y de los contratos. Una tarea no los cambia.

- **Plazos de los links:**
  - recuperación, 60 minutos, y uno cada 60 s por cuenta (`auth.passwords.users`, C3a);
  - invitación, 7 días para un alumno y 48 horas para un admin (C3b);
  - verificación, 60 minutos.
  - Una cuenta del registro que nadie verificó se poda a los 7 días.
- **Límites** (`contracts/http.md`, «Límites nuevos»):
  - `forgot-password`, 5 por minuto y 20 por hora por red, con 429, y 3 por hora por email en silencio;
  - registro, 5 por hora por red (/48 en IPv6) y 100 por hora en total;
  - verificación, 3 correos por hora y cuenta;
  - invitaciones, 300 correos por admin cada 24 horas.
- **Reintentos:** a los 60, 300, 900 y 3600 s, y después cada 3600 s. El plazo es el vencimiento del link o 24 horas desde que se encoló, lo que llegue primero (R4, decisión 1).
- **Cadena de plazos:** el SMTP espera 20 s, el trabajo dura como mucho 60 s, la conexión tiene `retry_after` de 120 s y `worker-mail`, `stop_grace_period` de 150 s. Cada uno es estrictamente menor que el siguiente.
- **El modo sólo link:** `MAIL_REQUIRED=true` y `MAIL_MAILER=log` por omisión en `docker/compose.yaml`. El 503 es `mail_unavailable`, con `Retry-After: 3600` y «El taller no puede mandar correos por ahora.».
- **Links:**
  - `<APP_URL>/#invitacion=<token>`;
  - `<APP_URL>/#restablecer=<token>&email=<rawurlencode(email)>`;
  - `<APP_URL>/#verificar=<id>.<vence>.<firma>`.
  - Siempre desde `config('app.url')`, nunca desde `Host`.
- **Textos:** los de [contracts/mail.md](./contracts/mail.md), byte a byte. La zona horaria es `America/Argentina/Buenos_Aires`.
- **Permisos de `taller_mail`:** los de data-model.md, §7, y ninguno más.
- **Redes:** en el perfil por omisión, `mail` = {`mysql`, `worker-mail`} y `egress` = {`worker-mail`}. En `dev` se suma `mailpit` a `egress`, publicado sólo en `127.0.0.1`.
- **Calidad:**
  - PHPStan nivel 9, sin baseline ni `ignoreErrors`;
  - Pint;
  - Pest contra MySQL 9.7, sin SQLite;
  - `npm test`, `npm run lint`, `npm run format:check` y `git diff --check` en verde.
- **Dependencias:** ningún paquete de Composer ni de npm. La única imagen nueva es `axllent/mailpit:v1.31.4`, con su digest, y sólo con permiso.
- **Comentarios:** ninguno, salvo una referencia puntual (un FR, un ADR o una regla de MySQL) donde el código no la puede decir solo.
- **Compose:** `COMPOSE_PROJECT_NAME` en la misma línea de cada comando. Nunca el stack `taller-rust-go`.

## Project Structure

### Documentation (this feature)

```text
specs/011-c3c-correo/
├── spec.md              # qué y por qué, con el clarify del 2026-10-06
├── research.md          # decisiones, alternativas, Context7 y mediciones
├── data-model.md        # mail_jobs, los trabajos cifrados, invitations, taller_mail y la configuración
├── contracts/
│   ├── http.md          # endpoints nuevos y cambiados, límites, y lo que toman F11c y F12b
│   ├── console.md       # comandos, worker-mail, grants, init-env, deploy, checks y registros
│   └── mail.md          # los ocho correos, byte a byte
├── quickstart.md        # escenarios de validación, con COMPOSE_PROJECT_NAME en línea
├── plan.md              # este archivo
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

**Se crean.** En `backend/api/app/`:

| Archivo | De qué se encarga |
| --- | --- |
| `Mail/MailKind.php` | Los ocho tipos de correo |
| `Mail/OutgoingMail.php` | El valor `readonly` que viaja cifrado: tipo, destinatario, nombre, link, vencimiento, invitación y plazo |
| `Mail/InvitationRef.php` | `{id, tokenHash}` de una invitación |
| `Mail/MailDeadline.php` | El plazo de reintentos (R4, decisión 1) |
| `Mail/MailText.php` | El asunto y el cuerpo desde `lang/es/mail.php` |
| `Mail/PlainTextMessage.php` | El `Mailable` de texto, sin vistas |
| `Mail/MailAvailability.php` | Si hay correo o el taller está en modo sólo link |
| `Mail/Mailbox.php` | La única puerta para encolar un correo |
| `Mail/InvitationSendStatus.php` | El control de vigencia y las marcas de `invitations`, sin Eloquent |
| `Mail/MailNotSent.php` | La excepción de un envío fallido, sin dirección ni `previous` |
| `Mail/MailLog.php` | Los registros del correo, con HMAC |
| `Mail/WarnLocalAppUrl.php` | La advertencia de `APP_URL` local al arrancar `worker-mail` |
| `Mail/DeletionNotice.php` | Lo que lleva la purga para avisar |
| `Jobs/SendMail.php` | El trabajo de la cola `mail` |
| `Jobs/SendPasswordResetLink.php` | El trabajo de `default` que arma la recuperación |
| `Auth/Features.php` | Las dos banderas de `GET /api/session` |
| `Auth/Delivery.php` | `link` o `email` |
| `Auth/EmailVerificationLinks.php` | Emitir y comprobar el token de `#verificar=` |
| `Auth/EmailVerifications.php` | Mandar la verificación con su tope de 3 por hora |
| `Auth/AllowedDomains.php` | La lista de dominios del registro |
| `Auth/Registrations.php` | Crear la cuenta del registro |
| `Admin/AdminMailQuota.php` | El tope de 300 correos por admin |
| `Http/Middleware/EnsureMailAvailable.php` | 503 en modo sólo link |
| `Http/Middleware/EnsureRegistrationOpen.php` | 404 con el registro apagado |
| `Http/Controllers/Auth/ForgotPasswordController.php` | `POST /api/auth/forgot-password` |
| `Http/Controllers/Auth/RegisterController.php` | `POST /api/auth/register` |
| `Http/Controllers/Auth/EmailVerificationController.php` | `verification-notification` y `verify` |
| `Http/Requests/ForgotPasswordRequest.php`, `RegisterRequest.php`, `VerifyEmailRequest.php` | La validación de esos pedidos |
| `Console/Commands/ChangeEmail.php` | `taller:change-email` |
| `Console/Commands/PruneUnverified.php` | `taller:prune-unverified` |

En el resto del repositorio:

| Archivo | De qué se encarga |
| --- | --- |
| `backend/api/database/migrations/2026_10_28_100001_create_mail_jobs_table.php` | La tabla |
| `backend/api/lang/es/mail.php`, `recovery.php` y `registration.php` | Los textos |
| `backend/api/routes/api/recovery.php` y `registration.php` | Las rutas nuevas |
| `backend/api/scripts/check-mail.sh` | El check de punta a punta |
| `docker/mysql/apply-grants.sh` y `docker/mysql/10-db-grants.sh` | El mecanismo de los usuarios de MySQL |
| `qa/apply-grants-check.ts` y `qa/compose-mail-check.ts` | Los checks de `npm test` |
| `backend/api/tests/Support/MailWorld.php` y `MailGrants.php` | Las ayudas de las pruebas |

**Se modifican:**

| Archivo | Qué cambia |
| --- | --- |
| `backend/api/config/taller.php` | Suma `mail`, `registration` y `forgot_password`, y quita `features` |
| `backend/api/config/queue.php` | La conexión `mail` |
| `backend/api/config/mail.php` | `timeout`, `require_tls`, el puerto 587 y el nombre del remitente |
| `backend/api/phpunit.xml` | `MAIL_MAILER` y `MAIL_REQUIRED` forzados |
| `backend/api/app/Http/Controllers/SessionController.php` | Las banderas salen de `Features` |
| `backend/api/app/Auth/AccountPasswords.php` | El aviso de contraseña cambiada |
| `backend/api/app/Auth/Invitations.php` | El reemplazo de FR-021 |
| `backend/api/app/Auth/NetworkKey.php` | `wide()`: /48 en IPv6 |
| `backend/api/app/Auth/Limiters.php` | `forgot-password` y `register` |
| `backend/api/app/Admin/AdminInvitations.php` | Guarda la entrega |
| `backend/api/app/Admin/AccountChanges.php` | El aviso de rol de admin |
| `backend/api/app/Http/Controllers/Admin/InvitationController.php` y `UserController.php` | Los caminos con correo |
| `backend/api/app/Http/Requests/Admin/InviteRequest.php` y `ResendInvitationRequest.php` | `delivery()` devuelve `Delivery` |
| `backend/api/app/Jobs/PurgeUserData.php` | Cifrado, con el aviso |
| `backend/api/app/Accounts/AccountDeletion.php` y `app/Console/Commands/ResumePurges.php` | Llevan el aviso |
| `backend/api/app/Logging/SecretScrubber.php` | `verificar` |
| `backend/api/app/Models/Invitation.php` | El PHPDoc de `delivery` |
| `backend/api/app/Providers/AppServiceProvider.php` | El listener |
| `backend/api/bootstrap/app.php` | Las rutas y los alias |
| `backend/api/routes/console.php` | La poda |
| `backend/api/tests/Support/RestrictedMysqlUser.php` | La base, como parámetro |
| `backend/api/Dockerfile` | La etapa `dev` copia `db-grants.sql` |
| `docker/compose.yaml` y `docker/mysql/db-grants.sql` | El servicio, las redes y los permisos |
| `backend/api/scripts/init-env.sh`, `deploy.sh` y `smoke.sh` | La contraseña nueva, el despliegue y el smoke |
| `qa/init-env-check.ts` y `qa/run-checks.ts` | Los checks |
| `backend/api/AGENTS.md`, `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y `README.md` | La documentación (T030) |

**Decisión de estructura.**
- **El correo vive en `app/Mail/`.** Una carpeta por responsabilidad, como `app/Content/`, `app/Admin/` y `app/Accounts/`. Los dos trabajos nuevos van en `app/Jobs/`, junto a los de B2 y C3b.
- **Cada característica de rutas tiene su archivo.** `recovery.php` y `registration.php` se suman a `withRouting(api: [...])` de `bootstrap/app.php`.
- Sin barrels ni capas nuevas.

## Review Focus

Son cinco entradas o fallas que la spec implica y que ninguna prueba de las tareas, escrita como «el camino feliz más sus errores», ejercitaría por sí sola. Cada una tiene la prueba que la fija, agregada a la tarea dueña. El revisor las mira primero.

1. **Un correo de una invitación que ya cambió** (FR-007 y FR-057 a). El admin reenvía (o revoca, o la persona acepta) mientras el correo anterior sigue reintentando. El trabajo viejo no tiene que salir con un link que responde 404, ni marcar `sent_at` o `send_failed_at` sobre la invitación nueva.
   - **Prueba:** `SendMailTest`, «a mail whose invitation was rotated, revoked or accepted is neither sent nor marks the row» (T006).
   - **Y de punta a punta:** `InvitationEmailTest`, «resending by email while the first mail waits sends only the new link» (T014). Con la cola `database` real: crear por correo, reenviar por correo, correr el worker dos veces. Sale un solo correo, con el link nuevo, y la fila queda con `sent_at` y sin `send_failed_at`.
2. **Un rechazo SMTP que nombra la dirección** (FR-004, FR-007 y FR-029).
   - **Prueba:** `SendMailFailureTest`, «a rejection that names the recipient leaves no address in failed_jobs nor in the logs» (T006). Un transporte de prueba lanza `TransportException("550 5.1.1 <ana@x.com>: Recipient address rejected")`; con el plazo vencido, la fila de `failed_jobs` (las columnas `exception` y `payload`) no contiene `ana@x.com` ni el token, y ningún registro capturado lo contiene.
3. **El token de recuperación de una cuenta reemplazada** (FR-021). Quien registró un email ajeno pidió una recuperación antes de que el dueño aceptara su invitación por correo. Ese token no tiene que servir para la cuenta nueva.
   - **Prueba:** `AcceptReplacesUnverifiedTest`, «a reset token issued to the replaced account does not reset the new one» (T020). Con el token emitido antes de aceptar, `POST /api/auth/reset-password` responde 422 `errors.token`, y la sesión del registro responde 401.
4. **Un `PurgeUserData` encolado antes de C3c** (FR-057 d). Una purga en vuelo durante el despliegue llega sin cifrar y sin la propiedad `notice`.
   - **Prueba:** `PurgeUserDataCompatibilityTest`, «a purge queued before C3c still runs and sends no notice» (T016). Inserta en `jobs` un payload armado a mano con `serialize()` de un objeto sin `notice` y sin cifrar, corre `queue:work database --queue=default --once`, y la cuenta desaparece sin que `mail_jobs` tenga filas.
5. **El modo sólo link con correos ya encolados** (FR-008). Alguien vuelve a `MAIL_MAILER=log` con trabajos en `mail_jobs`. El worker no tiene que mandarlos por el mailer `log`, que escribiría el token en los registros.
   - **Prueba:** `SendMailTest`, «a queued mail is failed, not logged, when the workshop went link only» (T006). Con `taller.mail.required=true`, el mailer `log` y un canal de log capturado, correr el worker deja el trabajo en `failed_jobs` con `cause: unavailable`, y ningún registro contiene `#invitacion=` ni el email.

**También para revisar:**
- el orden de `rate_limited` y la devolución del tope (R9);
- que `forgot-password` no nombre `users` en ninguna consulta (SC-002);
- que `worker-mail` no use Eloquent sobre `invitations` (R6);
- que ninguna clase fuera de `SendMail` use la fachada `Mail` o `Notification` ni el evento `Registered` (R11);
- la cadena de plazos (R3);
- y que `dns: []` quede vacío en la configuración efectiva (R15).

## Unidades y orden

Hay siete unidades, cada una con su compuerta. Las tareas de una misma unidad que no comparten archivos pueden ir en paralelo; la columna «Paralelo» lo dice.

| Unidad | Tareas | Qué entrega | Compuerta | Paralelo |
| --- | --- | --- | --- | --- |
| 0 · Base | T001 y T002 | La línea de base y el pedido de permiso de Mailpit | La suite en verde sobre `master`, y el pedido hecho | — |
| 1 · El canal | T003 a T008 | La configuración, las banderas, `mail_jobs`, los textos, `SendMail`, `Mailbox` y la advertencia | G1: `SendMailTest` y `SendMailFailureTest` en verde con la cola `database` real; la suite entera, PHPStan y Pint | T004, T005 y T008 en paralelo después de T003; T006 después de T004 y T005; T007 después de T006 |
| 2 · Recuperación | T009 a T012 | `forgot-password`, su trabajo, el aviso de contraseña y la recuperación de un tercero | G2: SC-002 medido en `ForgotPasswordQueriesTest` y la suite en verde | T009 y luego T010; T011 y T012 en paralelo con ellas, después de G1 |
| 3 · Administración y avisos | T013 a T016 | Las invitaciones por correo y su tope, y los avisos de rol de admin y de cuenta borrada | G3: los cuatro ganchos de C3b dejan de responder 503 o de callar con correo, y vuelven a hacerlo sin él (SC-015 en Pest) | T013 y luego T014; T015 y T016 en paralelo con ellas |
| 4 · Registro y email | T017 a T022 | El interruptor, la verificación, el registro, el reemplazo, la poda y el cambio de email | G4: SC-011 en Pest (3 de 3 rutas en 404; el recorrido de 403 a 200) | T017, luego T018 y T019; T020, T021 y T022 en paralelo |
| 5 · Operación | T023 a T029 | Los permisos de MySQL, `init-env`, la prueba del usuario real, Compose, el despliegue, el smoke, `check-mail.sh` y Mailpit | G5: `npm test`, `api:smoke`, `api:content:check`, `deploy-check.sh` y `check-mail.sh` contra un stack `taller-c3c` | T023 y T024 en paralelo; T025 después de T023; T026 después de T023 y T024; T027 y T028 después de T026; T029 sólo con el permiso de T002 |
| 6 · Cierre | T030 y T031 | La documentación y la compuerta final | Todo SC-012 en verde y el quickstart recorrido | — |
| Acciones del usuario | T032 a T037 | El dominio, Brevo, SPF, DKIM y DMARC, la credencial, `APP_URL` y el envío real | — | Las hace el usuario; T037 verifica con él |

Las unidades 1 a 4 son de PHP y se prueban enteras sin el stack. La 5 necesita Docker, y la única tarea que necesita el permiso de Mailpit es T029. **Sin el dominio se puede llegar hasta T031 inclusive**: el correo real es T037.

## Reglas para los implementadores

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, los tres contratos, data-model.md, research.md y tu tarea;
  - las skills `tdd`, `laravel-tdd`, `laravel-security`, `laravel-specialist` y `php-pro`. Mandan el ADR y las decisiones del usuario: de las skills **no** se toman notificaciones que releen el modelo, `Mail::raw()`, vistas de Blade para el correo ni paquetes nuevos (research.md, R1, R2 y R11).
- **TDD, siempre.**
  - Escribí las pruebas de tu paso y comprobá que fallan por la razón que dice el plan, no por un error de sintaxis ni de entorno. Recién entonces implementá lo mínimo.
  - Una prueba de C3a, B2, D1 o C3b que falla quiere decir que el código nuevo está mal. Las únicas que cambian son las que tu tarea nombra en «Modifica».
  - El esperado sale del contrato, de la spec o de un ejemplo resuelto en la prueba, nunca del código que probás.
- **Los comandos.** Cada línea lleva su `COMPOSE_PROJECT_NAME`. **Nunca** uses `export`: cada comando con su variable en la misma línea, y cada worktree con su propio nombre.
  - `COMPOSE_PROJECT_NAME=taller-c3c npm run api:test -- --filter=<Prueba>`
  - `COMPOSE_PROJECT_NAME=taller-c3c npm run api:test -- --testsuite=Content`
  - `COMPOSE_PROJECT_NAME=taller-c3c npm run api:analyse` (nivel 9, 0 errores)
  - `COMPOSE_PROJECT_NAME=taller-c3c npm run api:format:check`
  - `COMPOSE_PROJECT_NAME=taller-c3c npm run api:test:down` al terminar
  - El `.env` se arma con `sh backend/api/scripts/init-env.sh`. Desde T024 hay que volver a correrlo, por `MAIL_DB_PASSWORD`.
- **Descargas.** Las imágenes y la caché ya están en la máquina. Si un comando intenta bajar algo, pará y avisá.
- **El estilo:**
  - El código y las pruebas, en inglés. Los mensajes de la API salen de `lang/es`; los de la consola, literales en español.
  - **Sin comentarios.** Sólo una referencia puntual (un FR, un ADR, la regla de MySQL de R16) donde el código no la puede decir solo.
  - Sin `declare(strict_types=1)`, sin sintaxis posterior a PHP 8.3, y sin `@phpstan-ignore` ni baseline.
  - Los arreglos se transforman con Collections o `Arr::`, y en los bordes salen con `->all()`.
  - Todo error de la API sale de `ApiError::of(ApiCode::…)`. Ninguna contraseña se toca fuera de `AccountPasswords`.
  - **En `worker-mail`, nada de Eloquent sobre `invitations`:** sólo `DB::table('invitations')` con `value('id')` o `update([...])` de las dos columnas (R6).
- **Los commits.** Chicos, en español, con prefijo Angular (`feat(api): …`, `test(api): …`, `chore(docker): …`) y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada uno lleva la prueba con lo que verifica. Antes de cada commit: `git diff --check`.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Base (coordinador)

### Tarea 0.1 · La línea de base (T001)

**Pasos:**

1. Partí de `master` (`git log --oneline -1` es `dd870a9c` o posterior). C3b y D1b tienen que estar integrados: comprobá que existen `app/Http/MailUnavailable.php`, `app/Jobs/PurgeUserData.php`, `app/Accounts/AccountDeletion.php`, `app/Admin/{AdminInvitations,AccountChanges}.php`, `app/Auth/{PasswordResetLinks,AccountPasswords,AccountSessions,Invitations,NetworkKey,Limiters,EmailFingerprint}.php`, `app/Logging/SecretScrubber.php` y `tests/Support/{Browser,RestrictedMysqlUser,PopulatedAccount}.php`, con las firmas que cita este plan.
2. Corré la suite, con la variable en la misma línea: `COMPOSE_PROJECT_NAME=taller-c3c npm run api:format:check`, `COMPOSE_PROJECT_NAME=taller-c3c npm run api:analyse` y `COMPOSE_PROJECT_NAME=taller-c3c npm run api:test`. Anotá el número de pruebas y de aserciones, y que el análisis da 0 errores.
3. Reservá el bloque de migraciones `2026_10_28_100001` a `100099` para C3c. C3b proponía `2026_10_05_500001`, pero esa fecha ordenaría antes de las migraciones de D1 ya desplegadas (`2026_10_06_*`).
4. Anotá la salida de `COMPOSE_PROJECT_NAME=taller-c3c docker compose config --services`: es la lista contra la que T026 suma `worker-mail` y `grants`.

**Compuerta:** la suite en verde y `git status` limpio.

### Tarea 0.2 · El permiso de Mailpit (T002)

**Es un pedido al usuario, no una descarga.** El coordinador le pide permiso, con estos datos de la spec («Descargas previstas»):

| Qué | Origen | Tamaño | Licencia | Para qué |
| --- | --- | --- | --- | --- |
| `axllent/mailpit:v1.31.4` (índice `sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48`; amd64 `sha256:c8e498023104710cd71a7bb1856a51f2183ff0dc1ea07675067a38ecda08428f`) | Docker Hub | 16 836 010 bytes (16,1 MiB, comprimido, amd64) | MIT | FR-011 y FR-052, sólo en el perfil `dev` |

- **Con el permiso:** T029 suma el servicio y `check-mail.sh` corre en su modo completo.
- **Sin el permiso:** T029 no se hace. FR-052 queda como verificación manual declarada, y `check-mail.sh` corre en su modo sin Mailpit (R20), que prueba el resto.

El pedido sale ahora para que la respuesta llegue antes de la unidad 5. Ninguna tarea de las unidades 1 a 4 lo espera.

## 1. El canal del correo (unidad 1)

**Cubre:** FR-003, FR-004, FR-006 (la parte de la aplicación), FR-007, FR-008, FR-009, FR-010 (los textos), FR-029 y FR-051 (la parte del canal); SC-001 (en Pest), SC-003 y SC-010 (la bandera).

### Tarea 1.1 · La configuración, la disponibilidad y las banderas (T003)

- **Crea:**
  - `backend/api/app/Mail/MailAvailability.php` y `backend/api/app/Auth/Features.php`;
  - `backend/api/tests/Support/MailWorld.php`;
  - `backend/api/tests/Unit/Mail/MailAvailabilityTest.php` y `backend/api/tests/Feature/FeaturesTest.php`.
- **Modifica:**
  - `backend/api/config/taller.php`, `config/queue.php`, `config/mail.php` y `phpunit.xml`;
  - `backend/api/app/Http/Controllers/SessionController.php`;
  - `backend/api/tests/Feature/ConfigTest.php` y `tests/Feature/SessionEndpointTest.php`.
- **Entrega:**

```php
namespace App\Mail;

final class MailAvailability
{
    public function isAvailable(): bool
    {
        if (! config()->boolean('taller.mail.required')) {
            return true;
        }
        $mailer = config()->string('mail.default');

        return ! in_array(config()->string("mail.mailers.{$mailer}.transport"), ['log', 'array'], true);
    }
}

namespace App\Auth;

final class Features
{
    public function __construct(private MailAvailability $mail) {}
    public function passwordReset(): bool;   // $this->mail->isAvailable()
    public function registration(): bool;    // config()->boolean('taller.registration.open') && $this->mail->isAvailable()
}

namespace Tests\Support;

final class MailWorld
{
    /** Turns mail on in a test: MAIL_REQUIRED off over the array mailer of phpunit.xml. */
    public static function available(): void;          // config(['taller.mail.required' => false])
    /** The mail connection on the real database driver, so after-commit and the worker behave as in production (R3). */
    public static function onDatabaseQueue(): void;    // config(['queue.connections.mail.driver' => 'database'])
    /** @return list<\Symfony\Component\Mailer\SentMessage> what the array transport kept */
    public static function sent(): array;
}
```

**Configuración (referencia):**

```php
// config/taller.php: se quita 'features' y se suma
'mail' => [
    'required' => filter_var(env('MAIL_REQUIRED', true), FILTER_VALIDATE_BOOLEAN),
    'retry_seconds' => (int) env('MAIL_RETRY_SECONDS', 86400),
    'backoff' => array_map('intval', explode(',', (string) env('MAIL_BACKOFF', '60,300,900,3600'))),
    'admin_daily_limit' => 300,
    'timezone' => 'America/Argentina/Buenos_Aires',
],
'registration' => [
    'open' => filter_var(env('REGISTRATION_OPEN', false), FILTER_VALIDATE_BOOLEAN),
    'allowed_domains' => array_values(array_filter(array_map(
        fn (string $domain) => strtolower(trim($domain)),
        explode(',', (string) env('REGISTRATION_ALLOWED_DOMAINS', '')),
    ))),
    'per_hour_network' => 5,
    'per_hour_global' => 100,
    'verification_per_hour' => 3,
    'verification_minutes' => 60,
    'unverified_days' => 7,
],
'forgot_password' => ['per_minute_network' => 5, 'per_hour_network' => 20, 'per_hour_email' => 3],

// config/queue.php, en connections
'mail' => [
    'driver' => 'database',
    'connection' => env('DB_QUEUE_CONNECTION'),
    'table' => 'mail_jobs',
    'queue' => 'mail',
    'retry_after' => 120,
    'after_commit' => true,
],

// config/mail.php, en mailers.smtp
'port' => env('MAIL_PORT', 587),
'timeout' => 20,
'require_tls' => filter_var(env('MAIL_REQUIRE_TLS', true), FILTER_VALIDATE_BOOLEAN),
// y en from: 'name' => env('MAIL_FROM_NAME', 'Taller Rust y Go'),
```

`config/taller.php` es configuración, así que el `array_map` y el `explode` son la excepción que admite `backend/api/AGENTS.md` para `config/`. Si Pint o PHPStan piden otra forma, se usa `collect(...)->all()`.

En `phpunit.xml`, al lado de los que ya existen:

```xml
<env name="MAIL_MAILER" value="array" force="true"/>
<server name="MAIL_MAILER" value="array"/>
<env name="MAIL_REQUIRED" value="true" force="true"/>
<server name="MAIL_REQUIRED" value="true"/>
<env name="REGISTRATION_OPEN" value="false" force="true"/>
<server name="REGISTRATION_OPEN" value="false"/>
```

**Pasos:**

1. **Las pruebas, que fallan porque las clases y las claves no existen:**
   - **`MailAvailabilityTest`** (Unit, con la aplicación). Cada esperado sale de FR-008:

     | `required` | mailer | Resultado |
     | --- | --- | --- |
     | `true` | `log` | no hay correo |
     | `true` | `array` | no hay correo |
     | `true` | `smtp` | hay correo |
     | `false` | `log` | hay correo |
     | `true` | un mailer `custom` con `transport: log` | no hay correo, porque decide el transporte y no el nombre |

   - **`FeaturesTest`:**
     - sin correo y con el registro abierto, `registration()` es `false`;
     - con correo y el registro cerrado, `passwordReset()` es `true` y `registration()`, `false`;
     - con correo y el registro abierto, las dos son `true`.
   - **`SessionEndpointTest`** (cambia):
     - el invitado recibe `features: {passwordReset: false, registration: false}` con la configuración de `phpunit.xml`;
     - con `MailWorld::available()`, `passwordReset` es `true`;
     - la prueba «takes the features from the configuration» pasa a «takes the features from mail availability and the registration switch».
   - **`ConfigTest`** (cambia):
     - quita la aserción de `taller.features`;
     - exige `taller.mail.required === true`, `retry_seconds === 86400`, `backoff === [60, 300, 900, 3600]`, `admin_daily_limit === 300` y `timezone === 'America/Argentina/Buenos_Aires'`;
     - exige `taller.registration.open === false` y `allowed_domains === []`;
     - con `REGISTRATION_ALLOWED_DOMAINS=" Escuela.edu.ar ,,otra.org"` releído (`$this->refreshApplication()` después de `putenv`), da `['escuela.edu.ar', 'otra.org']`;
     - exige `queue.connections.mail` con `table: mail_jobs`, `queue: mail`, `retry_after: 120` y `after_commit: true`;
     - exige `mail.mailers.smtp.timeout === 20`, `require_tls === true` y `port === 587`.
2. **Implementá** las clases, la configuración y `phpunit.xml`. `SessionController` recibe `Features` por constructor y arma `features` con sus dos métodos.
3. **Corré y verificá:** las pruebas nuevas y las cambiadas en verde, la suite entera en verde y `npm run api:analyse` con 0 errores.

**Compuerta:** `config('taller.features')` no aparece en `app/` (`grep -rn "taller.features" backend/api/app` vacío).

### Tarea 1.2 · `mail_jobs` (T004)

- **Crea:**
  - `backend/api/database/migrations/2026_10_28_100001_create_mail_jobs_table.php`;
  - `backend/api/tests/Feature/MailJobsSchemaTest.php`.
- **Modifica:** `backend/api/tests/Content/MigrationsTest.php`.

**Pasos:**

1. **`MailJobsSchemaTest`** (prueba A de data-model.md, §9). Lee `information_schema` y falla por «la tabla no existe». Exige:
   - las siete columnas: `id` `bigint unsigned` con auto incremento, `queue` `varchar(255)`, `payload` `longtext`, `attempts` `smallint unsigned`, `reserved_at` `int unsigned` nula, `available_at` y `created_at` `int unsigned`, y todas salvo `reserved_at` `NOT NULL`;
   - InnoDB, la clave primaria `(id)` y el índice `mail_jobs_queue_index` sobre `queue`;
   - ninguna clave foránea desde la tabla ni hacia ella.
2. **`MigrationsTest`** (prueba B): después de deshacer, `mail_jobs` no existe; al migrar otra vez, su `SHOW CREATE TABLE` es el mismo. Comprobá que el `--step`, que sale de contar los archivos, cubre la migración nueva.
3. **Implementá** la migración con el `CREATE TABLE` de data-model.md, §1, en un único `DB::statement`. La primera línea es el encabezado de las demás: `// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/011-c3c-correo/data-model.md`. `down()` es `Schema::dropIfExists('mail_jobs')`.
4. **Corré y verificá:** las pruebas en verde, y `UserDataCoverageTest` sigue en verde sin cambios, porque la tabla no tiene `user_id`.

### Tarea 1.3 · Los tipos, los textos y el mensaje (T005)

- **Crea:**
  - en `backend/api/app/Mail/`: `MailKind.php`, `InvitationRef.php`, `OutgoingMail.php`, `MailDeadline.php`, `MailText.php` y `PlainTextMessage.php`;
  - `backend/api/lang/es/mail.php`;
  - las pruebas: `backend/api/tests/Unit/Mail/MailDeadlineTest.php`, `backend/api/tests/Feature/Mail/MailTextTest.php` y `backend/api/tests/Feature/Mail/PlainTextMessageTest.php`.
- **Consume:** `IssuedInvitation` (C3a), `IssuedResetLink` (C3a) e `InvitationToken::hash`.
- **Entrega:**

```php
namespace App\Mail;

enum MailKind: string
{
    case Invitation = 'invitation';
    case PasswordReset = 'password_reset';
    case PasswordChanged = 'password_changed';
    case AdminRole = 'admin_role';
    case AccountDeleted = 'account_deleted';
    case EmailVerification = 'email_verification';
    case EmailChanged = 'email_changed';
    case RegistrationAttempt = 'registration_attempt';

    public function carriesLink(): bool;   // Invitation, PasswordReset and EmailVerification
}

final readonly class InvitationRef
{
    public function __construct(public int $id, public string $tokenHash) {}
}

final readonly class OutgoingMail
{
    private function __construct(
        public MailKind $kind,
        public string $to,
        public ?string $name,
        public ?string $link,
        public ?CarbonImmutable $linkExpiresAt,
        public ?InvitationRef $invitation,
        public CarbonImmutable $queuedAt,
        public CarbonImmutable $deadline,
    ) {}

    public static function invitation(IssuedInvitation $issued): self;
    public static function passwordReset(string $to, string $name, IssuedResetLink $issued): self;
    public static function emailVerification(string $to, string $name, string $link, CarbonImmutable $expiresAt): self;
    /** @throws \LogicException for a kind that carries a link */
    public static function notice(MailKind $kind, string $to, ?string $name): self;
}

final class MailDeadline
{
    /** The earlier of the link's expiry and the retry window (research.md, R4: decision 1). */
    public static function for(CarbonImmutable $queuedAt, ?CarbonImmutable $linkExpiresAt): CarbonImmutable
    {
        $window = $queuedAt->addSeconds(config()->integer('taller.mail.retry_seconds'));

        return $linkExpiresAt === null ? $window : $linkExpiresAt->min($window);
    }
}

final class MailText
{
    public function subject(MailKind $kind): string;   // __("mail.{$kind->value}.subject")
    public function body(OutgoingMail $mail): string;  // the layout of contracts/mail.md, joined with "\n\n", ending in "\n"
}

final class PlainTextMessage extends Mailable
{
    public function __construct(public readonly OutgoingMail $mail) {}
    public function envelope(): Envelope;   // to: $mail->to (address only), subject: MailText::subject; from is mail.from
    /** @return array{text: HtmlString} */
    protected function buildView(): array; // ['text' => new HtmlString((new MailText)->body($this->mail))]
}
```

**Las cuatro fábricas de `OutgoingMail`:**
- `invitation()` toma `to` del email de la invitación, `name` en `null`, `link` de `$issued->link()`, `linkExpiresAt` de `expires_at` e `invitation` como `new InvitationRef($id, InvitationToken::hash($issued->token))`.
- `passwordReset()` toma el link y el vencimiento de `IssuedResetLink`.
- `notice()` no lleva link.
- Las cuatro fijan `queuedAt = CarbonImmutable::now()` y `deadline = MailDeadline::for($queuedAt, $linkExpiresAt)`.

**Pasos:**

1. **Las pruebas, que fallan porque las clases no existen:**
   - **`MailDeadlineTest`** (Unit, con la aplicación y `retry_seconds` en 86 400). Encolado el 2026-10-12 a las 12:00 UTC:
     - un link que vence a las 13:00 da un plazo a las 13:00;
     - un link que vence el 2026-10-19 a las 12:00 (7 días) da el 2026-10-13 a las 12:00;
     - sin link, da el 2026-10-13 a las 12:00;
     - con `retry_seconds` en 20, sin link, da las 12:00:20.

     Los esperados están escritos a mano en la prueba.
   - **`MailTextTest`:**
     - el ejemplo resuelto de [contracts/mail.md](./contracts/mail.md), «Un ejemplo resuelto», comparado byte a byte. La prueba copia el texto esperado, con `APP_URL=https://taller.example`, el token `abc123`, `ana@x.com` y el vencimiento del 2026-10-12 a las 19:30 UTC;
     - para cada uno de los otros siete tipos, el asunto exacto de la tabla del contrato, el saludo (`Hola:` en la invitación y `Hola, Beto:` en el resto), el texto, el cierre y la firma;
     - en los tres con link, el link en su renglón y la línea de vencimiento con «(hora de Argentina)»;
     - en los cinco sin link, ningún `http`;
     - ningún cuerpo contiene `password`, `contraseña: ` seguido de un valor, ni `<`;
     - un nombre `Ana :expires` sale literal, sin reemplazar.
   - **`PlainTextMessageTest`:**
     - con `Mail::fake()`, mandar un `PlainTextMessage` de una invitación registra un `Mail::assertSent(PlainTextMessage::class, fn ($m) => $m->hasTo('ana@x.com') && $m->hasSubject('Te invitaron al Taller Rust y Go'))`;
     - `$mailable->assertSeeInText('#invitacion=')` y `assertDontSeeInText('&amp;')` con el link de recuperación;
     - con el transporte `array` real (sin `Mail::fake`), `Mail::send($mailable)` deja un `SentMessage` cuyo `getOriginalMessage()` es un `Email` con `getTextBody()` igual a `MailText::body()`, `getHtmlBody()` en `null`, un solo destinatario sin nombre y el `From` de `mail.from`.
2. **Implementá** las clases y `lang/es/mail.php`, copiado de [contracts/mail.md](./contracts/mail.md). `MailText::body()`:
   - formatea el vencimiento con `$mail->linkExpiresAt->setTimezone(config()->string('taller.mail.timezone'))->format(__('mail.expires_format'))`;
   - arma los bloques en orden: saludo, texto, link, vencimiento, cierre y firma;
   - los une con `"\n\n"` y termina con `"\n"`.
3. **Corré y verificá:** las pruebas en verde y `npm run api:analyse` con 0 errores. `buildView()` redefinido con su tipo de retorno no choca con el de `Mailable`, que no declara tipo.

### Tarea 1.4 · El trabajo `SendMail` (T006)

- **Crea:**
  - en `backend/api/app/`: `Jobs/SendMail.php`, `Mail/InvitationSendStatus.php`, `Mail/MailNotSent.php` y `Mail/MailLog.php`;
  - las pruebas, en `backend/api/tests/Feature/Mail/`: `SendMailTest.php`, `SendMailFailureTest.php` y `MailLogTest.php`;
  - `backend/api/tests/Unit/Mail/MailTimeoutChainTest.php`.
- **Consume:** T003 (la conexión `mail` y `MailAvailability`), T004 y T005.
- **Entrega:**

```php
namespace App\Jobs;

#[Timeout(60)]
final class SendMail implements ShouldQueue, ShouldBeEncrypted
{
    use Queueable;

    public function __construct(public readonly OutgoingMail $mail)
    {
        $this->onConnection('mail');
        $this->onQueue('mail');
    }

    public function retryUntil(): DateTimeInterface
    {
        return $this->mail->deadline;
    }

    /** @return list<int> */
    public function backoff(): array
    {
        $backoff = config()->array('taller.mail.backoff');

        return array_values(array_map(fn (mixed $seconds) => is_int($seconds) ? $seconds : 60, $backoff));
    }

    public function handle(Mailer $mailer, MailAvailability $availability, InvitationSendStatus $invitations): void
    {
        if (! $availability->isAvailable()) {
            $this->fail(MailNotSent::unavailable());

            return;
        }
        if ($this->mail->invitation !== null && ! $invitations->isCurrent($this->mail->invitation)) {
            MailLog::superseded($this->jobUuid(), $this->mail->invitation->id);

            return;
        }

        try {
            $mailer->send(new PlainTextMessage($this->mail));
        } catch (TransportExceptionInterface $error) {
            MailLog::attemptFailed($this->jobUuid(), $this->mail, $this->attempts(), $error);

            throw MailNotSent::from($error);
        }

        if ($this->mail->invitation !== null) {
            $invitations->markSent($this->mail->invitation);
        }
        MailLog::sent($this->jobUuid(), $this->mail, $this->attempts());
    }

    public function failed(?Throwable $error): void
    {
        if ($this->mail->invitation !== null) {
            app(InvitationSendStatus::class)->markFailed($this->mail->invitation);
        }
        MailLog::failed($this->jobUuid(), $this->mail, $error);
    }

    private function jobUuid(): string;   // $this->job?->uuid() ?? 'sync'
}

namespace App\Mail;

final class InvitationSendStatus
{
    public function isCurrent(InvitationRef $ref): bool;  // DB::table('invitations')->where('id', $ref->id)->where('token_hash', $ref->tokenHash)->value('id') !== null
    public function markSent(InvitationRef $ref): void;   // the same WHERE, update(['sent_at' => now as 'Y-m-d H:i:s.v'])
    public function markFailed(InvitationRef $ref): void; // the same WHERE, update(['send_failed_at' => …])
}

final class MailNotSent extends RuntimeException
{
    public static function from(TransportExceptionInterface $error): self;  // "El proveedor no aceptó el correo: <short class> <code>." and no previous
    public static function unavailable(): self;                              // "El taller está en modo sólo link: el correo no se mandó."
    public function cause(): string;                                         // "<short class> <code>" or "unavailable"
}

final class MailLog
{
    public static function queued(OutgoingMail $mail): void;
    public static function skipped(MailKind $kind): void;
    public static function sent(string $job, OutgoingMail $mail, int $attempt): void;
    public static function attemptFailed(string $job, OutgoingMail $mail, int $attempt, Throwable $error): void;
    public static function failed(string $job, OutgoingMail $mail, ?Throwable $error): void;  // cause: 'expired' for MaxAttemptsExceededException, else MailNotSent::cause or the short class
    public static function superseded(string $job, int $invitationId): void;
    public static function resetSkipped(string $reason): void;
    public static function appUrlLocal(string $host): void;
}
```

`MailLog` registra con los nombres y los campos de [contracts/console.md](./contracts/console.md), «Registros». El destinatario va como `EmailFingerprint::of($mail->to)`.

`backoff()` normaliza los valores en lugar de confiar en el `mixed` de `config()`, como pide el nivel 9. Si `config()->array()` con un `@var list<int>` alcanza, se usa eso.

**Pasos:**

1. **`SendMailTest`.** Usa `MailWorld::available()` y `MailWorld::onDatabaseQueue()`, invitaciones reales en la base y el worker real (`$this->artisan('queue:work', ['connection' => 'mail', '--queue' => 'mail', '--once' => true, '--stop-when-empty' => true])`). Falla porque el trabajo no existe:
   - **una invitación vigente:** sale un correo por el transporte `array`, `mail_jobs` queda vacía y la fila tiene `sent_at` y no `send_failed_at`;
   - **un aviso sin invitación** (`password_changed`): sale, y ninguna consulta nombra `invitations` (`DB::listen`);
   - **«a mail whose invitation was rotated, revoked or accepted is neither sent nor marks the row»** (Review Focus 1), con tres casos:
     - rotada: cambia `token_hash` antes de correr;
     - revocada: se borra la fila;
     - aceptada: se borra la fila y existe la cuenta.

     En los tres: 0 correos, `sent_at` y `send_failed_at` sin tocar, `mail_jobs` vacía y un registro `mail.superseded`;
   - **«a queued mail is failed, not logged, when the workshop went link only»** (Review Focus 5). Encolá con correo, después volvé a `taller.mail.required = true` con `mail.default = log` y un canal capturado. El worker deja una fila en `failed_jobs` y `send_failed_at` en la invitación, y ningún registro contiene `#invitacion=` ni `ana@x.com`;
   - **el trabajo nunca lee `users`:** con `DB::listen`, ninguna consulta del worker nombra `users`, `sessions` ni `password_reset_tokens`;
   - **el `payload` está cifrado:** el de `mail_jobs`, leído antes de correr el worker, no contiene `ana@x.com`, el nombre ni el token, y `json_decode($payload)['data']['command']` no empieza por `O:`.
2. **`SendMailFailureTest`.** Usa un transporte de prueba registrado con `Mail::extend('failing', …)` que lanza `TransportException`, con `mail.default = failing` y `MailWorld::available()`, y fija el reloj con `$this->travelTo()`:
   - **el primer intento falla:**
     - el trabajo vuelve a `mail_jobs` con `available_at` = ahora + 60;
     - `attempts` es 1;
     - queda `mail.attempt_failed` con `cause` y sin la dirección;
     - la invitación sigue sin `sent_at` ni `send_failed_at`;
   - **los intentos siguientes** quedan disponibles a los +300, +900, +3600 y +3600 s. El reloj avanza hasta cada `available_at`, y los esperados salen de la lista de la spec;
   - **el plazo vencido:**
     - con el reloj después de `deadline` (24 horas para una invitación de 7 días), el worker falla el trabajo sin llamar al transporte (el transporte cuenta sus llamadas: no sube);
     - `failed_jobs` tiene la fila, la invitación tiene `send_failed_at` y queda `mail.failed` con `cause: expired`;
   - **la recuperación con su link de 60 minutos:** a los 61 minutos no se manda (FR-007, escenario 6 de la historia 2);
   - **«a rejection that names the recipient leaves no address in failed_jobs nor in the logs»** (Review Focus 2): el mensaje de la excepción es `550 5.1.1 <ana@x.com>: Recipient address rejected`, y se lee `failed_jobs.exception`, `failed_jobs.payload` y los registros capturados.
3. **`MailLogTest`:** cada método escribe exactamente las claves del contrato, y `queued` y `sent` llevan `recipient_hmac` de 16 hexadecimales, que no es el email.
4. **`MailTimeoutChainTest`** (Unit). Lee de la configuración y de los atributos (con `ReflectionClass(SendMail::class)->getAttributes(Timeout::class)`) y exige `mail.mailers.smtp.timeout` (20) < el `Timeout` de `SendMail` (60) < `queue.connections.mail.retry_after` (120). El cuarto eslabón, `stop_grace_period`, lo comprueba `qa/compose-mail-check.ts` (T026).
5. **Implementá.** `InvitationSendStatus` escribe la hora con `now()->format('Y-m-d H:i:s.v')`. `MailNotSent::from()` arma la causa con `(new ReflectionClass($error))->getShortName()` y `$error->getCode()`, y llama a `parent::__construct($message)` sin `previous`.
6. **Corré y verificá:** las pruebas en verde, la suite entera en verde y `npm run api:analyse` con 0 errores.

### Tarea 1.5 · `Mailbox`, la arquitectura y los secretos (T007)

- **Crea:**
  - `backend/api/app/Mail/Mailbox.php`;
  - las pruebas: `backend/api/tests/Feature/Mail/MailboxTest.php`, `backend/api/tests/Feature/Mail/MailJobsAtRestTest.php` y `backend/api/tests/Unit/Mail/MailArchTest.php`.
- **Modifica:** `backend/api/app/Logging/SecretScrubber.php` y `backend/api/tests/Unit/Logging/SecretScrubberTest.php`.
- **Entrega:**

```php
namespace App\Mail;

final class Mailbox
{
    public function __construct(private MailAvailability $availability) {}

    /** Queues the mail after the surrounding commit, or does nothing in link-only mode. */
    public function queue(OutgoingMail $mail): bool
    {
        if (! $this->availability->isAvailable()) {
            MailLog::skipped($mail->kind);

            return false;
        }
        SendMail::dispatch($mail);
        MailLog::queued($mail);

        return true;
    }
}
```

**Pasos:**

1. **`MailboxTest`**, con la cola `database` real:
   - **sin correo:** devuelve `false`, `mail_jobs` queda vacía y queda `mail.skipped`;
   - **con correo:** devuelve `true` y deja una fila en `mail_jobs` con `queue = mail`;
   - **dentro de una transacción** que vuelve atrás (`DB::transaction` que lanza): `mail_jobs` queda vacía;
   - **dentro de una que confirma:** la fila aparece recién al confirmar (`DB::afterCommit` comprueba que antes no estaba).
2. **`MailJobsAtRestTest`** (prueba D de data-model.md). Con `PasswordResetLinks` y una invitación reales encola un correo de cada tipo con link, y lee `mail_jobs.payload` con una consulta cruda. Ninguno contiene el email, el nombre, el token ni `#invitacion`. `jobs` se cubre en T010 y T016.
3. **`MailArchTest`:**
   - `arch()->expect('App')->not->toUse([Mail::class, Notification::class, Registered::class])->ignoring('App\Jobs\SendMail')`, con `Mail` y `Notification` (las fachadas) y `Illuminate\Auth\Events\Registered`;
   - `arch()->expect('App')->not->toUse(Mailer::class)->ignoring(['App\Jobs\SendMail', 'App\Mail\PlainTextMessage'])`;
   - una prueba de texto, como `ArchitectureTest`, que exige que ningún archivo de `app/` contenga `->notify(` ni `sendEmailVerificationNotification(`.
4. **`SecretScrubberTest`** (cambia): un registro con `https://t.example/#verificar=12.1760000000.abcdef` sale con `verificar=[redactado]`, como ya pasa con `invitacion` y `restablecer`.
5. **Implementá.** En `SecretScrubber`, el patrón pasa a `'/(invitacion|restablecer|verificar)=[^\s"\']*/'`.
6. **Corré y verificá:** las pruebas en verde y `MailArchTest` en verde con el código de hoy. Si falla, el error está en otro archivo, no en la prueba.

### Tarea 1.6 · La advertencia de `APP_URL` local (T008)

- **Crea:**
  - `backend/api/app/Mail/WarnLocalAppUrl.php`;
  - `backend/api/tests/Feature/Mail/WarnLocalAppUrlTest.php`.
- **Modifica:** `backend/api/app/Providers/AppServiceProvider.php`.
- **Entrega:**

```php
final class WarnLocalAppUrl
{
    public function handle(WorkerStarting $event): void;   // only for $event->connectionName === 'mail'
}
// AppServiceProvider::boot(): Event::listen(WorkerStarting::class, WarnLocalAppUrl::class);
```

**Pasos:**

1. **`WarnLocalAppUrlTest`**, con `Log::spy()` y `event(new WorkerStarting('mail', 'mail', new WorkerOptions))`:
   - **avisa una vez,** con `mail.app_url_local` y su `host`, para cada uno de estos valores de `APP_URL`:
     - `http://localhost:8080`;
     - `http://127.0.0.1`;
     - `http://[::1]:8080`;
     - `http://0.0.0.0`;
     - `http://taller.localhost`;
   - **no avisa** con `https://taller.example`;
   - **no avisa** con la conexión `runs` ni con `database`, aunque `APP_URL` sea local.
2. **Implementá** el listener (usa `MailLog::appUrlLocal`) y su registro.
3. **Corré y verificá:** las pruebas en verde.

**Compuerta G1:**
- `SendMailTest`, `SendMailFailureTest`, `MailboxTest`, `MailJobsAtRestTest`, `MailArchTest` y `MailTextTest` en verde con la cola `database` real;
- la suite entera en verde, `npm run api:analyse` con 0 errores y Pint;
- las tres pruebas de la «Review Focus» que viven en T006 (la 1, la 2 y la 5) están, con su nombre.

## 2. Recuperación por correo (unidad 2)

**Cubre:** FR-012 a FR-015, FR-057 (b) y FR-051 (la parte de la recuperación); SC-002 y SC-010 (los caminos de `forgot-password` y de la recuperación de un tercero).

### Tarea 2.1 · El trabajo que arma la recuperación (T009)

- **Crea:**
  - `backend/api/app/Jobs/SendPasswordResetLink.php`;
  - `backend/api/tests/Feature/Auth/SendPasswordResetLinkTest.php`.
- **Consume:** `PasswordResetLinks::issue` (C3a), `Mailbox`, `OutgoingMail::passwordReset` y `MailLog::resetSkipped` (unidad 1).
- **Entrega:**

```php
namespace App\Jobs;

#[Tries(3)]
#[Backoff(60)]
#[Timeout(30)]
final class SendPasswordResetLink implements ShouldQueue, ShouldBeEncrypted
{
    use Queueable;

    public function __construct(public readonly string $email) {}

    public function handle(PasswordResetLinks $links, Mailbox $mailbox, MailAvailability $availability): void
    {
        if (! $availability->isAvailable()) {
            MailLog::resetSkipped('link_only');

            return;
        }
        $user = User::where('email', $this->email)->first();
        if ($user === null) {
            MailLog::resetSkipped('no_account');

            return;
        }
        if ($user->status !== AccountStatus::Active) {
            MailLog::resetSkipped('not_active');

            return;
        }
        if ($user->role === Role::Admin) {
            MailLog::resetSkipped('admin');

            return;
        }

        try {
            $issued = $links->issue($user);
        } catch (ResetLinkThrottled|AccountNotActive) {
            MailLog::resetSkipped('throttled');

            return;
        }
        $mailbox->queue(OutgoingMail::passwordReset($user->email, $user->name, $issued));
    }
}
```

Va en la conexión por omisión (`database`) y en la cola `default`, que procesa el `scheduler`. El motivo `link_only` se suma a la lista de `mail.reset_skipped` de [contracts/console.md](./contracts/console.md).

**Pasos:**

1. **`SendPasswordResetLinkTest`**, con `MailWorld::available()`, `MailWorld::onDatabaseQueue()` y el worker real de la cola `mail`. Falla porque el trabajo no existe:
   - **un alumno activo:**
     - `SendPasswordResetLink::dispatchSync('ana@x.com')` deja una fila en `mail_jobs`;
     - correr el worker manda un correo cuyo texto tiene `https://taller.example/#restablecer=` y `&email=ana%40x.com` (con `app.url` fijado en la prueba) y el vencimiento a los 60 minutos;
     - el token del link, usado en `POST /api/auth/reset-password` con una contraseña válida, responde 200;
   - **sin correo:** una cuenta inexistente, una `disabled`, una `deleting` y un admin (Q5) dejan `mail_jobs` vacía, `password_reset_tokens` sin fila para ese email y el registro `mail.reset_skipped` con `no_account`, `not_active`, `not_active` y `admin`;
   - **otra vez antes de 60 s:** dos trabajos seguidos para la misma cuenta dejan una sola fila en `mail_jobs`, y el segundo registra `throttled`;
   - **en modo sólo link:** el trabajo no emite un token, y registra `link_only`;
   - **cifrado:** despachado con `SendPasswordResetLink::dispatch()` sobre la cola `database` real, la fila de `jobs` no contiene `ana@x.com` (FR-004).
2. **Implementá** el trabajo.
3. **Corré y verificá:** la prueba en verde y PHPStan con 0 errores.

### Tarea 2.2 · `POST /api/auth/forgot-password` (T010)

- **Crea:**
  - en `backend/api/app/Http/`: `Middleware/EnsureMailAvailable.php`, `Controllers/Auth/ForgotPasswordController.php` y `Requests/ForgotPasswordRequest.php`;
  - `backend/api/routes/api/recovery.php` y `backend/api/lang/es/recovery.php`;
  - las pruebas: `backend/api/tests/Feature/Auth/ForgotPasswordTest.php` y `backend/api/tests/Feature/Auth/ForgotPasswordQueriesTest.php`.
- **Modifica:**
  - `backend/api/bootstrap/app.php`: el alias `'mail.available' => EnsureMailAvailable::class` y `routes/api/recovery.php` en `withRouting`;
  - `backend/api/app/Auth/Limiters.php`;
  - `backend/api/tests/Feature/Limits/LimitersTest.php`;
  - `backend/api/tests/Feature/RouteAccessTest.php` y `backend/api/tests/Feature/ExpectedAccountMatrixTest.php`: `api/auth/forgot-password` en sus listas de rutas públicas.
- **Consume:** T009.
- **Entrega:**

```php
// routes/api/recovery.php
Route::post('/auth/forgot-password', ForgotPasswordController::class)->middleware(['throttle:forgot-password', 'mail.available']);

// Limiters::register()
RateLimiter::for('forgot-password', fn (Request $request) => [
    Limit::perMinute(config()->integer('taller.forgot_password.per_minute_network'))->by('minute:'.NetworkKey::of($request->ip())),
    Limit::perHour(config()->integer('taller.forgot_password.per_hour_network'))->by('hour:'.NetworkKey::of($request->ip())),
]);

final class EnsureMailAvailable
{
    public function __construct(private MailAvailability $mail) {}
    public function handle(Request $request, Closure $next): Response;   // throw new MailUnavailable when there is no mail
}

final class ForgotPasswordController
{
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $email = Email::canonical($request->string('email')->toString());
        RateLimiter::attempt(
            'forgot-password:email:'.hash('sha256', $email),
            config()->integer('taller.forgot_password.per_hour_email'),
            fn () => SendPasswordResetLink::dispatch($email),
            3600,
        );

        return response()->json(['message' => __('recovery.sent')], 202);
    }
}

// ForgotPasswordRequest::rules(): ['email' => ['required', 'string', 'email', 'max:254']], with the messages of lang/es/recovery.php
```

`lang/es/recovery.php`:

```php
return [
    'sent' => 'Si hay una cuenta con ese email, te mandamos un enlace para elegir otra contraseña. Revisá tu correo en unos minutos.',
    'email' => [
        'required' => 'Escribí tu email.',
        'string' => 'El email debe ser texto.',
        'email' => 'Este email no es válido.',
        'max' => 'Un email no puede tener más de :max caracteres.',
    ],
];
```

**Pasos:**

1. **`ForgotPasswordTest`**, con `Queue::fake([SendPasswordResetLink::class])`. Falla porque la ruta no existe (404):
   - **en modo sólo link:** para un email con cuenta y para uno sin cuenta, 503 con `{message: 'El taller no puede mandar correos por ahora.', code: 'mail_unavailable'}`, `Retry-After: 3600` y nada empujado;
   - **con correo, la misma respuesta para todos:** un alumno activo, un email sin cuenta, una cuenta `disabled`, una `deleting` y un admin dan el mismo 202 y el mismo cuerpo exacto (el texto de `recovery.sent`), y cinco `SendPasswordResetLink` empujados, cada uno con su email canónico;
   - **un email inválido o vacío:** 422 `validation_failed` con `errors.email`, y nada empujado;
   - **el límite por red, por minuto:** el sexto pedido de un minuto desde la misma IP es 429 `too_many_requests` con `Retry-After`;
   - **el límite por red, por hora:** con el reloj avanzando un minuto cada cinco pedidos, el 21.º de una hora es 429;
   - **el límite por email:** el cuarto pedido de una hora para `Ana@X.com ` y `ana@x.com` (el mismo canónico), desde redes distintas, responde el mismo 202, y hay sólo 3 empujados;
   - **el orden:** en modo sólo link, el sexto pedido de un minuto es 429 y no 503, porque el límite va primero.
2. **`ForgotPasswordQueriesTest`** (SC-002), con `Browser::useDatabaseDrivers()` y la cola `database` real para `default`:
   - con `DB::enableQueryLog()`, el mismo pedido para un email con cuenta y para uno sin cuenta hace la **misma cantidad** de consultas;
   - **ninguna** consulta nombra `users` ni `password_reset_tokens`;
   - las dos respuestas son idénticas en estado, cuerpo y en `Content-Type`.
3. **`RouteAccessTest` y `ExpectedAccountMatrixTest`:** suman `api/auth/forgot-password` a sus listas de rutas públicas. Sin eso fallan, porque la ruta no está en el grupo `account`. **`LimitersTest`:** `RateLimiter::limiter('forgot-password')` existe y devuelve dos límites.
4. **Implementá** el middleware, el controlador, el pedido, la ruta, el texto y el limitador.
5. **Corré y verificá:** las pruebas en verde y la suite entera en verde.

### Tarea 2.3 · El aviso de contraseña cambiada (T011)

- **Crea:** `backend/api/tests/Feature/Auth/PasswordChangedNoticeTest.php`.
- **Modifica:** `backend/api/app/Auth/AccountPasswords.php`.
- **Entrega:**

```php
final class AccountPasswords
{
    public function __construct(private ?Mailbox $mailbox = null) {}

    public function set(User $user, PlainPassword $password): void
    {
        $user->password = $this->hash($password);
        if ($user->exists) {
            ($this->mailbox ?? app(Mailbox::class))->queue(OutgoingMail::notice(MailKind::PasswordChanged, $user->email, $user->name));
        }
    }
    // hash, verify, verifyOrDummy, dummyHash, signOutOtherDevices and rounds stay as they are
}
```

**Por qué así:**
- **El constructor opcional.** Las pruebas de C3a construyen `new AccountPasswords` sin argumentos, y el contenedor inyecta el `Mailbox`.
- **El control de `$user->exists`.** `set()` sobre una cuenta que todavía no se guardó no tiene titular a quien avisar.
- **Cuándo sale el correo.** Los dos llamadores escriben dentro de `WriteTransaction`, así que el correo sale al confirmar (`after_commit`, R3).

**Pasos:**

1. **`PasswordChangedNoticeTest`**, con `MailWorld::available()` y la cola `database` real:
   - **un `reset-password` correcto** deja exactamente una fila en `mail_jobs`. El worker la manda con el asunto «Cambió la contraseña de tu cuenta del taller» al titular;
   - **un `PUT /api/me/password` correcto** hace lo mismo;
   - **un `reset-password` con el token equivocado (422)** y **un `PUT /api/me/password` con `current_password` equivocada (422)** no dejan ninguna fila;
   - **si la transacción vuelve atrás** después de `set()` (un `save()` que lanza, simulado con `User::saving(fn () => throw new RuntimeException)` en la prueba), no hay ninguna fila;
   - **sin correo:** los dos caminos responden igual que en C3a y no dejan filas.
2. **Implementá.**
3. **Corré y verificá:** las pruebas de C3a de `AccountPasswordsTest`, `AccountPasswordsSessionTest`, `ResetPasswordTest` y `MeTest` siguen en verde sin cambios.

### Tarea 2.4 · La recuperación de la contraseña de un tercero (T012)

- **Modifica:**
  - `backend/api/app/Http/Controllers/Admin/UserController.php` (`passwordReset`);
  - `backend/api/tests/Feature/Admin/PasswordResetHookTest.php`.
- **Consume:** `PasswordResetLinks::issue`, `Mailbox`, `MailAvailability` y `OutgoingMail::passwordReset`.
- **Entrega:**

```php
public function passwordReset(int $user): JsonResponse|Response
{
    $target = $this->directory->find($user);
    // the 422 for an admin and for an account that is not active stay as in C3b
    if (! $this->mail->isAvailable()) {
        Log::info('admin.password_reset_refused', ['target_id' => $user, 'reason' => 'mail_unavailable']);
        throw new MailUnavailable;
    }
    try {
        $issued = $this->resetLinks->issue($target);
    } catch (ResetLinkThrottled $throttled) {
        return ApiError::of(ApiCode::TooManyRequests, headers: ['Retry-After' => (string) $throttled->secondsLeft]);
    }
    $this->mailbox->queue(OutgoingMail::passwordReset($target->email, $target->name, $issued));
    Log::info('admin.password_reset_requested', ['target_id' => $user]);

    return response()->noContent(202);
}
```

`UserController` suma `MailAvailability`, `PasswordResetLinks` y `Mailbox` a su constructor.

**Pasos:**

1. **`PasswordResetHookTest`** (cambia):
   - **siguen sin cambios:** el 423, el 404, los dos 422 y el registro de la negativa sin email;
   - **la prueba del 503** pasa a decir «in link-only mode», y sigue igual;
   - **con correo** (`MailWorld::available()` y la cola `database` real), el pedido sobre un alumno activo responde 202 sin cuerpo y sin `url`, y hay una fila en `mail_jobs`. El worker manda un correo a ese alumno con un link `#restablecer=` que funciona en `reset-password`;
   - **un segundo pedido dentro de los 60 s** responde 429 `too_many_requests` con un `Retry-After` entre 1 y 60, y no deja una segunda fila;
   - **un `taller:password-reset-link` corrido antes** hace que el pedido responda 429, porque el broker cuenta todos los caminos.
2. **Implementá.**
3. **Corré y verificá:** las pruebas en verde, y `AdminAccessMatrixTest` y `PasswordConfirmMatrixTest` en verde sin cambios.

**Compuerta G2:**
- `ForgotPasswordQueriesTest` en verde: SC-002 medido, con las mismas consultas y ninguna sobre `users`;
- `SendPasswordResetLinkTest` con el link que restablece;
- la suite entera en verde, PHPStan y Pint.

## 3. Invitaciones por correo y los avisos de la administración (unidad 3)

**Cubre:** FR-057 (a), (c) y (d), FR-007 (las marcas de la invitación) y FR-010 (sus avisos); SC-015 en Pest.

### Tarea 3.1 · La entrega guardada y el tope de 300 (T013)

- **Crea:**
  - `backend/api/app/Auth/Delivery.php` y `backend/api/app/Admin/AdminMailQuota.php`;
  - `backend/api/tests/Feature/Admin/AdminMailQuotaTest.php`.
- **Modifica:**
  - `backend/api/app/Admin/AdminInvitations.php`;
  - `backend/api/app/Http/Requests/Admin/InviteRequest.php` y `ResendInvitationRequest.php`;
  - `backend/api/app/Models/Invitation.php` (sólo el PHPDoc);
  - `backend/api/tests/Feature/Admin/AdminInvitationsTest.php`.
- **Entrega:**

```php
namespace App\Auth;

enum Delivery: string
{
    case Link = 'link';
    case Email = 'email';
}

namespace App\Admin;

final class AdminInvitations
{
    public function invite(string $email, Role $role, int $adminId, Delivery $delivery): InviteResult;
    public function resend(Invitation $invitation, Delivery $delivery): IssuedInvitation;
    // revoke and find stay as they are; rotate() takes the Delivery and writes delivery = $delivery->value, sent_at = null and send_failed_at = null
}

final class AdminMailQuota
{
    /** Takes one mail of the admin's 300 per 86 400 s; false, and nothing taken, when none is left. */
    public function reserve(int $adminId): bool
    {
        $key = 'admin-mail:'.$adminId;
        if (RateLimiter::increment($key, 86400) <= config()->integer('taller.mail.admin_daily_limit')) {
            return true;
        }
        RateLimiter::decrement($key, 86400);

        return false;
    }

    public function release(int $adminId): void;     // RateLimiter::decrement('admin-mail:'.$adminId, 86400)
    public function availableIn(int $adminId): int;  // RateLimiter::availableIn('admin-mail:'.$adminId)
}

// InviteRequest::delivery(): Delivery            (Delivery::from of the validated string)
// ResendInvitationRequest::delivery(): ?Delivery
```

En `Invitation`, el PHPDoc suma `@property string $delivery`.

**Pasos:**

1. **Las pruebas, que fallan porque el enum y el tope no existen:**
   - **`AdminInvitationsTest`** (cambia): las llamadas existentes pasan `Delivery::Link`, y sus esperados no cambian. Se suman tres:
     - `invite(..., Delivery::Email)` deja la fila con `delivery = email`;
     - `resend($invitation, Delivery::Link)` sobre una de correo con `sent_at` y `send_failed_at` la deja en `link`, con las dos en `null` y un `token_hash` nuevo;
     - `resend($invitation, Delivery::Email)` la deja en `email`, también con las dos en `null`.
   - **`AdminMailQuotaTest`** (con la caché `database` de `Browser::useDatabaseDrivers()`, que es la que hace atómico `increment`):
     - 300 reservas seguidas del admin 7 dan `true` y la 301.ª, `false`; una reserva del admin 8 da `true`;
     - después de `release(7)` una vez, la siguiente reserva del 7 da `true`, y la que sigue, `false`;
     - `availableIn(7)` está entre 86 300 y 86 400 justo después;
     - con el reloj adelantado 86 401 s, el admin 7 vuelve a reservar.
2. **Implementá.**
3. **Corré y verificá:** `AdminInvitationsTest`, `InvitationsEndpointTest` (que todavía responde 503 por correo, porque el controlador no cambió) e `InviteRaceTest` en verde.

### Tarea 3.2 · La invitación por correo en la API (T014)

- **Crea:** `backend/api/tests/Feature/Admin/InvitationEmailTest.php`.
- **Modifica:**
  - `backend/api/app/Http/Controllers/Admin/InvitationController.php`;
  - `backend/api/tests/Feature/Admin/InvitationsEndpointTest.php` (la prueba del 503 pasa a decir «in link-only mode»).
- **Consume:** T013, `Mailbox`, `MailAvailability` y `OutgoingMail::invitation`.
- **Entrega** (el orden de [contracts/http.md](./contracts/http.md)):

```php
public function store(InviteRequest $request): JsonResponse
{
    // 423 for an admin role without confirmation, then 503 when delivery is email and there is no mail (as in C3b)
    $adminId = CurrentAccount::of($request)->id;
    $entries = [];
    foreach ($request->emails() as $email) {
        $entries[] = $request->delivery() === Delivery::Email
            ? $this->inviteByEmail($email, $request->role(), $adminId)
            : $this->inviteByLink($email, $request->role(), $adminId);
    }

    return response()->json(['data' => $entries]);
}

/** @return array{email: string, result: string, expiresAt?: string} */
private function inviteByEmail(string $email, Role $role, int $adminId): array
{
    if (! $this->quota->reserve($adminId)) {
        return ['email' => Email::canonical($email), 'result' => 'rate_limited'];
    }
    $result = $this->invitations->invite($email, $role, $adminId, Delivery::Email);
    if ($result->issued === null) {
        $this->quota->release($adminId);

        return ['email' => $result->email, 'result' => $result->outcome->value];
    }
    $this->mailbox->queue(OutgoingMail::invitation($result->issued));

    return ['email' => $result->email, 'result' => $result->outcome->value, 'expiresAt' => Iso8601::utc($result->issued->invitation->expires_at)];
}
```

`resend()` sigue este orden: 422, 404, 423 y 503, como en C3b. Con la entrega `email` agrega el tope antes de rotar (`ApiError::of(ApiCode::TooManyRequests, headers: ['Retry-After' => (string) $this->quota->availableIn($adminId)])`). Después rota con la entrega pedida y, si es `email`, encola el correo y responde sin `url`. El registro `admin.invitation` conserva sus campos, y `admin.invitation_resent` suma `delivery`.

**Pasos:**

1. **`InvitationEmailTest`**, con `MailWorld::available()` y la cola `database` real. Falla porque el controlador todavía responde 503:
   - **crear por correo:**
     - un admin pide `{emails: ['ana@x.com'], role: 'student', delivery: 'email'}` y recibe 200 con `[{email: 'ana@x.com', result: 'created', expiresAt: …}]`, **sin** `url`;
     - la fila tiene `delivery = email`;
     - `mail_jobs` tiene una fila que aparece después de confirmar;
     - el worker manda el correo con el link `#invitacion=`, y la consulta de ese token (`POST /api/auth/invitations/lookup`) responde 200;
     - la fila queda con `sent_at`;
   - **los que no mandan nada:** un email con cuenta (`user_exists`) y uno con una invitación vigente (`invitation_pending`) no dejan filas en `mail_jobs` ni gastan tope: después de ellos, `AdminMailQuota::reserve` del mismo admin todavía llega a 300;
   - **el tope:**
     - con 298 reservas hechas antes en la prueba, un lote de cuatro emails nuevos da `created`, `created`, `rate_limited` y `rate_limited`, y deja exactamente dos filas en `invitations` y dos en `mail_jobs`;
     - un quinto email que ya tenía cuenta, en el mismo lote después del tope, también da `rate_limited` (el orden de `contracts/http.md`);
     - un lote con `delivery: 'link'` del mismo admin no se ve afectado;
   - **el reenvío:**
     - `resend` con `{delivery: 'email'}` responde 200 con `delivery: 'email'` y sin `url`, y el link anterior responde 404 en `lookup`;
     - con el tope agotado responde 429 con `Retry-After`, y el `token_hash` de la fila no cambia;
     - `resend` con `{delivery: 'link'}` sobre una de correo responde con `url`, y deja `delivery = link`, `sent_at` y `send_failed_at` en `null`;
   - **«resending by email while the first mail waits sends only the new link»** (Review Focus 1, de punta a punta): se crea por correo sin correr el worker, se reenvía por correo y se corre el worker dos veces. Sale un solo correo, cuyo link es el nuevo, y la fila queda con `sent_at` y `send_failed_at` en `null`;
   - **sin correo:** los dos caminos por correo siguen respondiendo 503 sin crear ni rotar nada (SC-010).
2. **Implementá:** el controlador suma `AdminMailQuota`, `Mailbox` y `MailAvailability` a su constructor, y `requireMailDelivery` pasa a mirar la disponibilidad.
3. **Corré y verificá:** las pruebas en verde, `InvitationsEndpointTest`, `InvitationsListTest`, `InviteRaceTest`, `AdminAccessMatrixTest` y `NoStudentTextsTest` en verde, y PHPStan.

### Tarea 3.3 · El aviso de rol de admin (T015)

- **Modifica:**
  - `backend/api/app/Admin/AccountChanges.php`;
  - `backend/api/tests/Feature/Admin/AccountChangesTest.php`.
- **Entrega.** `applyChange` devuelve también si la cuenta pasó a admin, en el cuarto lugar de la tupla: `array{User, list<AccountRestriction>, array{role: string, status: string}|null, bool}`. `change()`, después de que `WriteTransaction::run` vuelve, llama a `$this->mailbox->queue(OutgoingMail::notice(MailKind::AdminRole, $target->email, $target->name))` cuando ese valor es verdadero. `AccountChanges` suma `Mailbox` a su constructor.

**Pasos:**

1. **`AccountChangesTest`** (suma), con `MailWorld::available()` y la cola `database` real:
   - **promover** a un alumno deja una fila en `mail_jobs` del tipo `admin_role` para su email;
   - **no avisan:** degradar a un admin, deshabilitar, rehabilitar o pedir un cambio que no cambia nada;
   - **un `LastAdmin`** (la guardia lanza) no deja nada;
   - **sin correo,** promover no deja nada y responde igual.
2. **Implementá.**
3. **Corré y verificá:** `AccountChangesTest`, `UserUpdateTest`, `LastAdminMatrixTest` y `LastAdminRaceTest` en verde.

### Tarea 3.4 · El aviso de cuenta borrada (T016)

- **Crea:**
  - `backend/api/app/Mail/DeletionNotice.php`;
  - `backend/api/tests/Feature/Accounts/PurgeNoticeTest.php` y `backend/api/tests/Feature/Accounts/PurgeUserDataCompatibilityTest.php`.
- **Modifica:**
  - en `backend/api/app/`: `Jobs/PurgeUserData.php`, `Accounts/AccountDeletion.php` y `Console/Commands/ResumePurges.php`;
  - las pruebas, en `backend/api/tests/Feature/`: `Accounts/PurgeUserDataQueueTest.php` (la aserción `not->toBeInstanceOf(ShouldBeEncrypted::class)` pasa a `toBeInstanceOf`), `Console/ResumePurgesTest.php` y `Content/ReapplyDeletionsTest.php`.
- **Entrega:**

```php
namespace App\Mail;

final readonly class DeletionNotice
{
    public function __construct(public string $to, public string $name) {}

    /** Only to an address someone confirmed: a never-verified account gets no notice. */
    public static function for(User $user): ?self
    {
        return $user->email_verified_at === null ? null : new self($user->email, $user->name);
    }
}

#[Tries(8)] #[Timeout(300)] #[Backoff(60, 300, 900, 1800, 3600)] #[UniqueFor(18000)]
final class PurgeUserData implements ShouldBeUnique, ShouldQueue, ShouldBeEncrypted
{
    use Queueable;

    public ?DeletionNotice $notice = null;

    public function __construct(public readonly int $userId, ?DeletionNotice $notice = null)
    {
        $this->notice = $notice;
    }
    // handle() as in C3b; deleteAccountAndRecord() adds, next to PurgeLog::done in DB::afterCommit, the notice:
    //   if ($this->notice !== null) { app(Mailbox::class)->queue(OutgoingMail::notice(MailKind::AccountDeleted, $this->notice->to, $this->notice->name)); }
}

// AccountDeletion::request(): PurgeUserData::dispatch($targetId, DeletionNotice::for($target));
// ResumePurges: PurgeUserData::dispatch($account->id, DeletionNotice::for($account));
// ReapplyDeletions: unchanged, PurgeUserData::dispatchSync($userId) without a notice
```

**Pasos:**

1. **`PurgeNoticeTest`**, con `MailWorld::available()` y las colas `database` reales:
   - **`DELETE /api/me` de una cuenta verificada:** al correr la purga (`queue:work database --queue=default --once`), la cuenta desaparece y `mail_jobs` tiene un `account_deleted` para su email. El worker de `mail` lo manda con el nombre que tenía la cuenta, aunque `users` ya no tiene la fila;
   - **la purga de una cuenta sin verificar** no deja nada en `mail_jobs`;
   - **una purga que no borra** (la cuenta ya no está en `deleting`) no avisa;
   - **`taller:reapply-deletions`** sobre una cuenta del libro no deja nada en `mail_jobs` (escenario 3 de la historia 3);
   - **`taller:resume-purges`** sobre una cuenta trabada lleva el aviso: al correr la purga, sale;
   - **cifrado:** la fila de `jobs` de la purga no contiene el email ni el nombre (FR-004).
2. **`PurgeUserDataCompatibilityTest`** («a purge queued before C3c still runs and sends no notice», Review Focus 4):
   - inserta en `jobs` un payload armado a mano como lo armaba C3b: el JSON de Laravel con `data.command` igual a `serialize()` de un objeto `PurgeUserData` **sin** la propiedad `notice` y sin cifrar. Para armarlo sin la propiedad, la prueba serializa una instancia, borra del texto el fragmento de `notice` y ajusta la cuenta de propiedades;
   - corre el worker;
   - la cuenta desaparece y `mail_jobs` queda vacía.
3. **Implementá.**
4. **Corré y verificá:** `PurgeUserDataTest`, `PurgeUserDataQueueTest` (cambiada), `AccountDeletionTest`, `DeleteMeTest`, `DeleteUserTest`, `ResumePurgesTest` y `ReapplyDeletionsTest` en verde.

**Compuerta G3:** SC-015 en Pest. Con correo, los cuatro ganchos dejan filas en `mail_jobs` y el worker los manda: la invitación (T014), la recuperación de un tercero (T012), el rol de admin (T015) y la cuenta borrada (T016). Sin correo, los dos primeros responden 503 y los dos avisos no dejan nada. Además, la suite entera en verde.

## 4. Registro abierto, verificación y cambio de email (unidad 4)

**Cubre:** FR-016 a FR-024, FR-018 (el aviso de intento de registro) y FR-010 (sus correos); SC-011.

### Tarea 4.1 · El interruptor, las rutas y los límites del registro (T017)

- **Crea:**
  - `backend/api/app/Http/Middleware/EnsureRegistrationOpen.php`;
  - `backend/api/routes/api/registration.php`, con las tres rutas apuntando a controladores que todavía responden 501 desde un cierre provisorio. T018 y T019 los reemplazan;
  - las pruebas: `backend/api/tests/Feature/Auth/RegistrationSwitchTest.php` y `backend/api/tests/Unit/Auth/NetworkKeyWideTest.php`.
- **Modifica:**
  - `backend/api/bootstrap/app.php`: el alias `'registration.open'` y el archivo de rutas;
  - `backend/api/app/Auth/NetworkKey.php` y `backend/api/app/Auth/Limiters.php`;
  - `backend/api/tests/Feature/RouteAccessTest.php` y `backend/api/tests/Feature/ExpectedAccountMatrixTest.php`: `api/auth/register` en las listas públicas. La matriz abre el registro en su `beforeEach` (`config(['taller.registration.open' => true])`) para que las dos rutas de verificación lleguen a `account.expected`;
  - `backend/api/tests/Feature/Limits/LimitersTest.php`.
- **Entrega:**

```php
// routes/api/registration.php
Route::middleware('registration.open')->group(function () {
    Route::post('/auth/register', RegisterController::class)->middleware('throttle:register');
    Route::middleware('account')->prefix('auth/email')->group(function () {
        Route::post('/verification-notification', [EmailVerificationController::class, 'send']);
        Route::post('/verify', [EmailVerificationController::class, 'verify']);
    });
});

final class EnsureRegistrationOpen
{
    public function handle(Request $request, Closure $next): Response;   // ApiError::of(ApiCode::NotFound) unless taller.registration.open
}

final class NetworkKey
{
    // of() stays: IPv4 as is, IPv6 by /64
    public static function wide(?string $ip): string;   // like of(), but IPv6 by /48: 'v6w:'.bin2hex(substr($packed, 0, 6))
}

// Limiters::register()
RateLimiter::for('register', fn (Request $request) => [
    Limit::perHour(config()->integer('taller.registration.per_hour_network'))->by('network:'.NetworkKey::wide($request->ip())),
    Limit::perHour(config()->integer('taller.registration.per_hour_global'))->by('global'),
]);
```

**Pasos:**

1. **Las pruebas:**
   - **`NetworkKeyWideTest`** (Unit, sin aplicación):
     - `2001:db8:abcd:1::1` y `2001:db8:abcd:ffff::2` dan la misma clave, y `2001:db8:abce::1`, otra;
     - `203.0.113.7` da `203.0.113.7`;
     - `::ffff:203.0.113.7` da `203.0.113.7`;
     - un texto que no es una IP da `unknown`.
   - **`RegistrationSwitchTest`:**
     - **con el registro apagado:** `POST /api/auth/register`, `/api/auth/email/verification-notification` y `/api/auth/email/verify` responden 404 `not_found` en JSON, **sin sesión y con sesión**, y `features.registration` es `false`;
     - **con el registro abierto y una sesión:** las dos de verificación ya no responden 404;
     - **las rutas existen** en `Route::getRoutes()` en los dos estados, para que funcionen con la caché de rutas;
     - **el límite por red:** con el registro abierto y correo, el sexto `register` de una hora desde la misma red es 429 con `Retry-After`. Desde una red distinta pasa, aunque el cuerpo sea inválido: el limitador corre antes que la validación;
     - **el límite global:** con `per_hour_global` en 3 dentro de la prueba, el cuarto registro de una hora desde otras tres redes es 429.
   - **`RouteAccessTest`, `ExpectedAccountMatrixTest` y `LimitersTest`:** como dice «Modifica».
2. **Implementá.**
3. **Corré y verificá:** las pruebas en verde y la suite entera en verde.

### Tarea 4.2 · La verificación de email (T018)

- **Crea:**
  - en `backend/api/app/`: `Auth/EmailVerificationLinks.php`, `Auth/EmailVerifications.php`, `Http/Controllers/Auth/EmailVerificationController.php` y `Http/Requests/VerifyEmailRequest.php`;
  - `backend/api/lang/es/registration.php`, con las claves de la verificación. T019 suma las del registro;
  - las pruebas: `backend/api/tests/Unit/Auth/EmailVerificationLinksTest.php` y `backend/api/tests/Feature/Auth/EmailVerificationTest.php`.
- **Modifica:** `backend/api/routes/api/registration.php`, para reemplazar los cierres provisorios de las dos rutas de verificación.
- **Entrega:**

```php
final readonly class IssuedVerificationLink
{
    public function __construct(public string $url, public CarbonImmutable $expiresAt) {}
}

final class EmailVerificationLinks
{
    public function issue(User $user): IssuedVerificationLink;
    // token = "{$user->id}.{$expires}.{$signature}", with $expires a Unix timestamp now + taller.registration.verification_minutes
    // signature = hash_hmac('sha256', "{$user->id}.{$expires}.".hash('sha256', Email::canonical($user->email)), config()->string('app.key'))
    // url = rtrim(config()->string('app.url'), '/').'/#verificar='.$token

    public function verify(User $user, string $token): bool;
    // false unless the token is three dot-separated parts, the id is $user->id, $expires is in the future
    // and hash_equals(the expected signature, the given one)
}

final class EmailVerifications
{
    public function __construct(private EmailVerificationLinks $links, private Mailbox $mailbox) {}

    /** False when the account already used its 3 mails of the last hour. */
    public function send(User $user): bool;  // RateLimiter::attempt('verification-mail:'.$user->id, 3, fn () => queue the email_verification mail, 3600)
    public function availableIn(User $user): int;
}

final class EmailVerificationController
{
    public function send(Request $request): JsonResponse|Response;   // 202 if verified (nothing sent); 503 without mail; 429 with Retry-After; 202
    public function verify(VerifyEmailRequest $request): JsonResponse|Response;  // 204, or 422 errors.token with registration.verification.invalid
}
```

`IssuedVerificationLink` va en `app/Auth/IssuedVerificationLink.php`, junto a `IssuedResetLink`. `verify` marca con `$user->markEmailAsVerified()`, que es del framework y no dispara eventos. `VerifyEmailRequest` exige `token` (`required`, `string`, `max:200`).

**Pasos:**

1. **`EmailVerificationLinksTest`** (Unit, con la aplicación, `app.key` y `app.url` fijados en la prueba):
   - un link emitido para la cuenta 12 tiene la forma `https://taller.example/#verificar=12.<10 dígitos>.<64 hexadecimales>`, y `verify` con su token da `true`;
   - **da `false`:**
     - con el id cambiado a 13;
     - con un dígito de la firma cambiado;
     - con el vencimiento cambiado;
     - después de 61 minutos (`travelTo`);
     - después de cambiar el email de la cuenta;
     - con `''`, `'12'`, `'12.x.y'` y cuatro partes.
2. **`EmailVerificationTest`**, con el registro abierto, `MailWorld::available()` y la cola `database` real:
   - **`verification-notification`** de una cuenta sin verificar responde 202 y deja un `email_verification` en `mail_jobs`. El cuarto de una hora responde 429 con `Retry-After`, y el registro del 201 de T019 cuenta como el primero: esa prueba vive en T019;
   - **una cuenta ya verificada** recibe 202 sin fila nueva;
   - **sin correo,** la notificación responde 503;
   - **`verify` con el token del link** que manda el worker responde 204, y `GET /api/guide` pasa de 403 `email_unverified` a 200. Otra vez da 204;
   - **`verify` con un token de otra cuenta, vencido o alterado** responde 422 `validation_failed` con `errors.token`, y la cuenta sigue sin verificar;
   - **no hay ningún GET:** `Route::getRoutes()` no tiene una ruta `GET` bajo `api/auth/email`.
3. **Implementá.**
4. **Corré y verificá:** las pruebas en verde y PHPStan.

### Tarea 4.3 · El registro (T019)

- **Crea:**
  - en `backend/api/app/`: `Auth/AllowedDomains.php`, `Auth/Registrations.php`, `Http/Controllers/Auth/RegisterController.php` y `Http/Requests/RegisterRequest.php`;
  - las pruebas: `backend/api/tests/Unit/Auth/AllowedDomainsTest.php` y `backend/api/tests/Feature/Auth/RegisterTest.php`.
- **Modifica:**
  - `backend/api/lang/es/registration.php`, con las claves del registro;
  - `backend/api/routes/api/registration.php`, para reemplazar el cierre provisorio de `register`.
- **Consume:** `PasswordRejection`, `AccountPasswords::hash`, `PrivacyNotice`, `PublishedUser`, `EmailVerifications`, `Mailbox` y `MailAvailability`.
- **Entrega:**

```php
final class AllowedDomains
{
    /** An empty list allows any domain (Q3). The comparison is exact, on the canonical email's domain. */
    public function permits(string $canonicalEmail): bool;
}

final class Registrations
{
    public function __construct(private AccountPasswords $passwords) {}

    /** @throws EmailTaken when the email already has an account, also on a unique-key race */
    public function register(string $name, string $canonicalEmail, PlainPassword $password, string $privacyVersion): User;
    // WriteTransaction: a student, active, email_verified_at null, privacy accepted now, password = $this->passwords->hash($password)
}

final class RegisterController
{
    public function __invoke(RegisterRequest $request): JsonResponse;
    // 503 without mail; the domain 422; the password policy 422 (PasswordRejection with name and email); if the email has an account:
    // queue registration_attempt to the holder and answer 422 errors.email; else register, sign in like C3a's accept, send the
    // verification (EmailVerifications::send) and answer 201 {data: PublishedUser}
}
```

`RegisterRequest` toma las reglas de `AcceptInvitationRequest` para `name`, `password`, `password_confirmation` y `privacyVersion`, y suma `email` (`required`, `string`, `email`, `max:254`, canonicalizado en `prepareForValidation`). El inicio de sesión repite lo que hace `InvitationController::signIn` de C3a: `Auth::guard('web')->login($user)` y `taller.authenticated_at`. Si eso se repite en dos lugares, se extrae a un método compartido sólo si la revisión lo pide.

`lang/es/registration.php` (completo, con lo de T018):

```php
return [
    'domain' => 'Con este email no se puede crear una cuenta: el registro está abierto sólo para algunos dominios.',
    'email_taken' => 'Ya hay una cuenta con ese email.',
    'verification' => [
        'invalid' => 'El enlace de verificación no es válido o venció.',
    ],
];
```

**Pasos:**

1. **`AllowedDomainsTest`:**
   - con `[]`, cualquier dominio pasa;
   - con `['escuela.edu.ar']`, `ana@escuela.edu.ar` pasa, y `ana@alumnos.escuela.edu.ar` y `ana@otra.org` no.
2. **`RegisterTest`**, con el registro abierto, `MailWorld::available()` y la cola `database` real:
   - **un registro válido** (escenario 2 de la historia 6):
     - responde 201 con `{data: {id, name, email, role: 'student', privacyAccepted: true}}` y una sesión nueva;
     - `GET /api/session` trae al usuario;
     - `GET /api/guide` responde 403 `email_unverified`;
     - en la base, `email_verified_at` es `null` y `status` es `active`;
     - hay un `email_verification` en `mail_jobs`;
   - **el recorrido de SC-011:** registrarse, tomar el token del correo que manda el worker, `POST /api/auth/email/verify` y `GET /api/guide` pasa a 200;
   - **un email que ya tiene cuenta:** 422 con `errors.email` igual a «Ya hay una cuenta con ese email.», un `registration_attempt` en `mail_jobs` para el titular, ninguna cuenta nueva y la sesión sigue de invitado;
   - **un dominio fuera de la lista:** con `allowed_domains = ['escuela.edu.ar']` y `ana@otra.org`, 422 con `errors.email` igual al texto de `registration.domain`, y nada encolado;
   - **una contraseña que no cumple la política:** 422 con `errors.password`, como en C3a;
   - **una invitación pendiente para el email:** el registro responde 201 y la fila de `invitations` no cambia (mismo `token_hash` y `expires_at`);
   - **sin correo y con el registro abierto:** 503, ninguna cuenta y `features.registration` en `false`;
   - **el tope de verificación:** después del registro, dos `verification-notification` responden 202 y la tercera, 429.
3. **Implementá.**
4. **Corré y verificá:** las pruebas en verde, `RouteAccessTest` y `ExpectedAccountMatrixTest` en verde, y PHPStan.

### Tarea 4.4 · Aceptar por correo reemplaza la cuenta sin verificar (T020)

- **Crea:** `backend/api/tests/Feature/Invitations/AcceptReplacesUnverifiedTest.php`.
- **Modifica:** `backend/api/app/Auth/Invitations.php` (`accept`).
- **Entrega** (dentro de la transacción de `accept`, antes de `createAccount`):

```php
$holder = User::where('email', $invitation->email)->lockForUpdate()->first();
if ($holder !== null) {
    if ($invitation->delivery !== Delivery::Email->value || $holder->email_verified_at !== null) {
        throw new EmailTaken;
    }
    $this->replaceUnverified($holder);
}

private function replaceUnverified(User $holder): void
{
    DB::table('account_deletions')->insertOrIgnore([
        'user_id' => $holder->id,
        'user_created_at' => $holder->created_at?->format('Y-m-d H:i:s.v'),
        'deleted_at' => now()->format('Y-m-d H:i:s.v'),
    ]);
    DB::table('password_reset_tokens')->where('email', $holder->email)->delete();
    DB::delete('delete from `users` where `id` = ?', [$holder->id]);
}
```

La cuenta reemplazada sale del registro como `invitation.replaced_unverified` (`replaced_id`, `user_id`), después de confirmar.

**Pasos:**

1. **`AcceptReplacesUnverifiedTest`.** Se arma una cuenta del registro, sin verificar, con una sesión abierta en un `Browser` y un token de recuperación emitido con `PasswordResetLinks::issue`, y una invitación por correo para el mismo email:
   - **la aceptación:** responde 201 con una cuenta de **id distinto**, verificada y con el rol de la invitación;
   - **la cuenta vieja:**
     - `users` no tiene el id viejo, y `account_deletions` sí;
     - la sesión vieja recibe 401 en `GET /api/auth/confirmed-password-status`;
   - **«a reset token issued to the replaced account does not reset the new one»** (Review Focus 3): ese token en `POST /api/auth/reset-password` responde 422 `errors.token`;
   - **una invitación por link** con la misma cuenta sin verificar responde 409 `email_taken`, y la cuenta sigue;
   - **una invitación por correo con una cuenta verificada** responde 409 `email_taken`;
   - **la aceptación concurrente** de C3a sigue igual: `InvitationRaceTest` en verde.
2. **Implementá.**
3. **Corré y verificá:** `AcceptTest`, `LookupTest`, `InvitationsTest` y `InvitationRaceTest` en verde.

### Tarea 4.5 · La poda de las cuentas nunca verificadas (T021)

- **Crea:**
  - `backend/api/app/Console/Commands/PruneUnverified.php`;
  - `backend/api/tests/Feature/Console/PruneUnverifiedTest.php`.
- **Modifica:**
  - `backend/api/routes/console.php` (la línea de [contracts/console.md](./contracts/console.md));
  - `backend/api/tests/Feature/ScheduleTest.php`: la cuenta pasa de doce a trece, y se suma `taller:prune-unverified` con `0 * * * *` y sin solaparse.
- **Entrega:** `taller:prune-unverified` toma las cuentas con `email_verified_at` en `null`, `created_at` anterior a `now()->subDays(config()->integer('taller.registration.unverified_days'))` y `status` distinto de `deleting`, en orden de `id`. Pide cada supresión con `AccountDeletion::request($id)`, saltea un `LastAdmin` con su registro, y deja `account.unverified_pruned` por cuenta.

**Pasos:**

1. **`PruneUnverifiedTest`.** Con cinco cuentas:
   - sin verificar, de hace 8 días;
   - sin verificar, de hace 6 días;
   - verificada, de hace 30 días;
   - sin verificar, de hace 8 días y ya en `deleting`;
   - sin verificar, de hace 8 días y `disabled`.

   El comando pasa a `deleting` exactamente la primera y la quinta, empuja dos `PurgeUserData` (con `Queue::fake`), los dos con `notice` en `null`, imprime `2 cuentas sin verificar pedidas para borrar.` y sale con 0. Corrido otra vez, imprime `0 cuentas …`.
2. **Implementá.**
3. **Corré y verificá:** las pruebas en verde.

### Tarea 4.6 · `taller:change-email` (T022)

- **Crea:**
  - `backend/api/app/Console/Commands/ChangeEmail.php`;
  - `backend/api/tests/Feature/Console/ChangeEmailTest.php`.
- **Entrega:** el contrato de [contracts/console.md](./contracts/console.md). Usa `Email::canonical`, `Validator::make(['email' => $nuevo], ['email' => ['required', 'email', 'max:254']])`, `WriteTransaction::run` con `lockForUpdate`, `AccountSessions::endAll` y, después de confirmar, `Mailbox::queue` dos veces con `OutgoingMail::notice(MailKind::EmailChanged, …, $user->name)`: una a la dirección vieja y otra a la nueva.

**Pasos:**

1. **`ChangeEmailTest`**, con `MailWorld::available()`, la cola `database` real y `Browser::useDatabaseDrivers()`:
   - **un cambio correcto:**
     - `taller:change-email ana@x.com ana.perez@x.com` sale con 0 y la salida exacta del contrato;
     - en la base cambió el email y se conservó `email_verified_at`;
     - una sesión abierta de la cuenta recibe 401;
     - el `remember_token` cambió;
     - `password_reset_tokens` no tiene fila para `ana@x.com`;
     - `mail_jobs` tiene dos `email_changed`, uno para cada dirección;
   - **las fallas,** con sus salidas del contrato, código 1 y nada cambiado (ni el email, ni las sesiones, ni `mail_jobs`):
     - el actual sin cuenta;
     - el nuevo inválido;
     - el nuevo con cuenta, también en `ANA.PEREZ@x.com`, que sólo difiere en mayúsculas;
     - el nuevo con una invitación;
     - el mismo email;
   - **sin correo:** el cambio se hace, la salida dice que no se mandaron avisos y `mail_jobs` queda vacía;
   - **`PATCH /api/me` con `email`** no cambia el email, y **`PATCH /api/admin/users/{id}` con `email`** tampoco (FR-024; escenario 3 de la historia 5).
2. **Implementá.**
3. **Corré y verificá:** las pruebas en verde y PHPStan.

**Compuerta G4:**
- SC-011 en Pest: 3 de 3 rutas en 404 apagadas, y el recorrido registrarse, verificar y pedir contenido de 403 a 200 en `RegisterTest`;
- `AcceptReplacesUnverifiedTest` con la prueba de la «Review Focus»;
- la suite entera en verde, PHPStan con 0 errores y Pint.

## 5. Operación: el usuario de MySQL, Compose y los checks (unidad 5)

**Cubre:** FR-001, FR-002, FR-005, FR-006 (la parte de Compose), FR-011, FR-025 a FR-028, FR-030 y FR-052; SC-003 (en el stack), SC-004 y SC-012 (los checks contra el stack).

Desde acá hace falta Docker. Cada comando lleva `COMPOSE_PROJECT_NAME=taller-c3c` en su línea, y nunca se toca `taller-rust-go`.

### Tarea 5.1 · Los permisos de MySQL: el script, las fases y su check (T023)

- **Crea:**
  - `docker/mysql/apply-grants.sh` y `docker/mysql/10-db-grants.sh`, los dos ejecutables en Git (`git update-index --chmod=+x`);
  - `qa/apply-grants-check.ts`.
- **Modifica:** `docker/mysql/db-grants.sql` y `qa/run-checks.ts`, que suma `apply-grants-check.ts` a `operationChecks`.
- **Entrega:**

`docker/mysql/db-grants.sql`:

```sql
-- The only file with MySQL users and privileges. Only docker/mysql/apply-grants.sh applies it, as root: the init of a
-- new volume (users), the grants service after migrate (tables) and db-grants (all). It must stay idempotent.

-- @phase users
CREATE USER IF NOT EXISTS 'taller_mail'@'%' IDENTIFIED BY '@@MAIL_DB_PASSWORD@@';
ALTER USER 'taller_mail'@'%' IDENTIFIED BY '@@MAIL_DB_PASSWORD@@';
GRANT SELECT ON performance_schema.events_transactions_current TO 'taller'@'%';

-- @phase tables
-- A column in the WHERE of an UPDATE needs SELECT on that column (MySQL 9.7, "Privileges Provided"): hence token_hash.
GRANT SELECT, INSERT, UPDATE, DELETE ON `taller`.`mail_jobs` TO 'taller_mail'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `taller`.`failed_jobs` TO 'taller_mail'@'%';
GRANT SELECT (`id`, `token_hash`), UPDATE (`sent_at`, `send_failed_at`) ON `taller`.`invitations` TO 'taller_mail'@'%';
```

`docker/mysql/apply-grants.sh` (POSIX `sh`):

```sh
#!/bin/sh
set -eu
usage='uso: apply-grants.sh [--phase users|tables|all] [--host <nombre>]'
phase=all
host=""
while [ $# -gt 0 ]; do
  case "$1" in
    --phase) [ $# -ge 2 ] || { echo "$usage" >&2; exit 64; }; phase=$2; shift 2 ;;
    --host) [ $# -ge 2 ] || { echo "$usage" >&2; exit 64; }; host=$2; shift 2 ;;
    *) echo "$usage" >&2; exit 64 ;;
  esac
done
case "$phase" in users|tables|all) ;; *) echo "fase inválida: $phase" >&2; exit 64 ;; esac
sql=${DB_GRANTS_SQL:-/db-grants.sql}
for role in MAIL; do
  eval "value=\${${role}_DB_PASSWORD:-}"
  case "$value" in
    *[!A-Za-z0-9._~-]*|'') valid=no ;;
    *) if [ "${#value}" -ge 24 ] && [ "${#value}" -le 128 ]; then valid=yes; else valid=no; fi ;;
  esac
  if [ "$valid" = no ]; then
    echo "${role}_DB_PASSWORD falta o no tiene de 24 a 128 caracteres de [A-Za-z0-9._~-] (sh backend/api/scripts/init-env.sh)" >&2
    exit 64
  fi
done
section() {
  awk -v want="$1" '/^-- @phase /{ on = (want == "all" || $3 == want); next } on { print }' "$sql"
}
render() {
  echo 'SET SESSION sql_log_bin = 0;'
  echo 'SET SESSION lock_wait_timeout = 5;'
  section "$phase" | sed -e "s/@@MAIL_DB_PASSWORD@@/$MAIL_DB_PASSWORD/g"
}
MYSQL_PWD=${MYSQL_ROOT_PASSWORD:?falta MYSQL_ROOT_PASSWORD}
export MYSQL_PWD
render | mysql -uroot ${host:+-h "$host"} --batch
```

C4 suma `APP RUNS MIGRATE BACKUP` a la lista del `for` y un `-e` por marcador. `docker/mysql/10-db-grants.sh`:

```sh
#!/bin/sh
exec /usr/local/bin/apply-grants.sh --phase users
```

**Pasos:**

1. **`qa/apply-grants-check.ts`.** Es Node puro, con `scenarios()` de `qa/lib/content-fixtures.ts` como los demás checks de operación. Pone un `mysql` falso en el `PATH`, un script de `sh` que vuelca sus argumentos y su entrada estándar a dos archivos de un directorio temporal. Corre `sh docker/mysql/apply-grants.sh` con `DB_GRANTS_SQL=docker/mysql/db-grants.sql`, `MYSQL_ROOT_PASSWORD=root-de-ejemplo` y `MAIL_DB_PASSWORD` de 48 hexadecimales. Falla porque el script no existe, y comprueba:
   - **el encabezado:** con `--phase users --host mysql`, las dos primeras líneas de la entrada son `SET SESSION sql_log_bin = 0;` y `SET SESSION lock_wait_timeout = 5;`;
   - **la contraseña:** no queda ningún `@@`, la contraseña está en la entrada y **no** en los argumentos, y los argumentos son exactamente `-uroot -h mysql --batch`;
   - **las fases:**
     - `users` contiene `CREATE USER IF NOT EXISTS 'taller_mail'@'%'`, `ALTER USER 'taller_mail'@'%'` y la línea de `taller`, y ninguna de `` `taller`.`mail_jobs` ``;
     - `tables`, al revés;
     - `all` tiene las dos;
   - **sin `--host`,** los argumentos son `-uroot --batch`;
   - **los errores, con 64 y un mensaje en español:**
     - una contraseña de 10 caracteres, una con `'` y una vacía;
     - `--phase otra`;
     - un argumento `--x`;
   - **sin `MYSQL_ROOT_PASSWORD`,** sale distinto de 0.
2. **Implementá** los dos scripts y el SQL.
3. **Contra un MySQL descartable,** con la imagen local y sin publicar puertos ni tocar volúmenes:

   ```sh
   docker run --rm -d --name c3c-grants-probe --tmpfs /var/lib/mysql:rw,size=1g -e MYSQL_ROOT_PASSWORD=probe-root-0123456789 mysql:9.7@sha256:e2bde46db6563855d7177adb5f0b57b9dc663f5a20927a90f4259d3312068497
   ```

   - **Las fases sobre tablas vacías.** Después de crear la base `taller` y las tablas `mail_jobs`, `failed_jobs` e `invitations` (con las columnas `id`, `token_hash`, `sent_at`, `send_failed_at` y `email`) con `docker exec`, la fase `users` corre dos veces sin error y la fase `tables` corre sin error.
   - **Sin las tablas, la fase `tables` falla.** Es la regla de MySQL que justifica las dos fases.
   - **Cambiar la contraseña** y volver a correr `users` la actualiza.
   - **Al final,** `docker rm -f c3c-grants-probe`.
4. **Corré y verificá:** `node qa/apply-grants-check.ts` y `npm test` en verde.

### Tarea 5.2 · `MAIL_DB_PASSWORD` en `init-env.sh` (T024)

- **Modifica:** `backend/api/scripts/init-env.sh` (una línea al final del bloque de `add_missing`, antes del bloque del socket) y `qa/init-env-check.ts`.

**Pasos:**

1. **`init-env-check`** suma tres pruebas, que fallan:
   - el script agrega `MAIL_DB_PASSWORD` con 48 hexadecimales;
   - una segunda corrida conserva un valor existente;
   - una línea `MAIL_DB_PASSWORD=` vacía hace fallar el script con el mensaje del patrón `add_missing`.
2. **Implementá** la línea `add_missing MAIL_DB_PASSWORD "$(openssl rand -hex 24)"`.
3. **Corré y verificá:** `node qa/init-env-check.ts`. En el worktree, `sh backend/api/scripts/init-env.sh` suma la variable al `.env` local, que está fuera de Git.

### Tarea 5.3 · El usuario de MySQL real en Pest (T025)

- **Crea:**
  - `backend/api/tests/Support/MailGrants.php`;
  - `backend/api/tests/Content/MailUserPrivilegesTest.php`.
- **Modifica:**
  - `backend/api/Dockerfile`, que en la etapa `dev` suma `COPY --from=repo docker/mysql/db-grants.sql tests/Fixtures/db-grants.sql`, después de la copia de `qa/fixtures/shared`;
  - `backend/api/tests/Support/RestrictedMysqlUser.php`, que suma el parámetro `?string $database = null` a `create()` y lo usa en la configuración de la conexión en lugar de `''` cuando viene.
- **Consume:** T023 (el SQL) y la unidad 1.
- **Entrega:**

```php
namespace Tests\Support;

final class MailGrants
{
    /**
     * The privilege clauses db-grants.sql gives taller_mail in its tables phase, aimed at $database.
     *
     * @return list<string> e.g. "SELECT, INSERT, UPDATE, DELETE ON `taller_test`.`mail_jobs`"
     */
    public static function clauses(string $database): array;
}
```

**Pasos:**

1. **`MailUserPrivilegesTest`** (suite `Content`, con `DatabaseTruncation`). Crea un usuario con `RestrictedMysqlUser::create(MailGrants::clauses($db), $db)`, con `$db` la base de la prueba, y lo borra en un `finally`. La lista de lo esperado está escrita en la prueba, sacada de FR-005 y de data-model.md, §7, **no** de `MailGrants`:
   - **lo que puede:**
     - `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre `mail_jobs` y sobre `failed_jobs`, con sondas sin efectos: `… LIMIT 0`, `UPDATE … WHERE 1 = 0`, `DELETE … WHERE 1 = 0` e `INSERT … SELECT … WHERE 1 = 0`;
     - `SELECT id, token_hash FROM invitations LIMIT 0`;
     - `UPDATE invitations SET sent_at = sent_at WHERE id = 0 AND token_hash = ''` y lo mismo con `send_failed_at`;
   - **lo que no puede, con el error 1142 o 1143:**
     - `SELECT email FROM invitations`, `SELECT * FROM invitations` y `UPDATE invitations SET expires_at = expires_at WHERE 1 = 0`;
     - lo mismo con `updated_at`;
     - `SELECT … FROM users`, `sessions` y `password_reset_tokens`;
     - `INSERT INTO jobs … SELECT … WHERE 1 = 0`;
     - `CREATE TABLE zz_mail_probe (id INT)`;
     - `SELECT … FROM mysql.user`;
   - **`GRANT SELECT ON {$db}.mail_jobs TO CURRENT_USER`** falla con un error de privilegios (1044, 1142, 1227 o 1410);
   - **«y aun así envía»:**
     - con root se crea una invitación por correo y se encola su `SendMail` en la cola `database` real;
     - con la conexión por omisión, la de la cola `mail` y la de `failed_jobs` apuntando al usuario restringido, `cache.default = array` y las instancias resueltas de la cola olvidadas, `Artisan::call('queue:work', ['connection' => 'mail', '--queue' => 'mail', '--once' => true])` manda el correo por el transporte `array`;
     - leído con root, la fila tiene `sent_at` y `mail_jobs` está vacía;
   - **«y deja el fallo»:** con el transporte que falla y el reloj después del plazo, el mismo worker deja una fila en `failed_jobs` y `send_failed_at` en la invitación, leídos con root.
2. **Implementá** `MailGrants`, el parámetro de `RestrictedMysqlUser` y la línea del `Dockerfile`. Si el worker falla con 1142 o 1143 sobre una tabla que no está en la lista, es un error del código del worker (algo usa Eloquent o lee de más), no de la lista.
3. **Corré y verificá:** `COMPOSE_PROJECT_NAME=taller-c3c npm run api:test -- --filter=MailUserPrivilegesTest` en verde, y `LongTransactionTest` (C3a, el otro usuario de `RestrictedMysqlUser`) también.

### Tarea 5.4 · `worker-mail`, `grants`, las redes y su check (T026)

- **Crea:** `qa/compose-mail-check.ts`.
- **Modifica:** `docker/compose.yaml` y `qa/run-checks.ts`, que suma `compose-mail-check.ts` a `operationChecks`.
- **Entrega** (referencia; los nombres y los valores son los de [contracts/console.md](./contracts/console.md)):

```yaml
x-mail-db-password: &mail-db-password '${MAIL_DB_PASSWORD:?falta MAIL_DB_PASSWORD en .env (sh backend/api/scripts/init-env.sh)}'

x-laravel-env: &laravel-env
  <<: *laravel-base-env
  # … the RUNS_* of B2 stay
  MAIL_MAILER: '${MAIL_MAILER:-log}'
  MAIL_REQUIRED: '${MAIL_REQUIRED:-true}'
  MAIL_RETRY_SECONDS: '${MAIL_RETRY_SECONDS:-86400}'
  MAIL_BACKOFF: '${MAIL_BACKOFF:-60,300,900,3600}'
  REGISTRATION_OPEN: '${REGISTRATION_OPEN:-false}'
  REGISTRATION_ALLOWED_DOMAINS: '${REGISTRATION_ALLOWED_DOMAINS:-}'

x-grants: &grants
  image: *mysql-image
  entrypoint: ['/usr/local/bin/apply-grants.sh', '--phase', 'tables', '--host', 'mysql']
  environment:
    MYSQL_ROOT_PASSWORD: '${MYSQL_ROOT_PASSWORD:?falta MYSQL_ROOT_PASSWORD en .env (sh backend/api/scripts/init-env.sh)}'
    MAIL_DB_PASSWORD: *mail-db-password
  volumes:
    - ./docker/mysql/db-grants.sql:/db-grants.sql:ro
    - ./docker/mysql/apply-grants.sh:/usr/local/bin/apply-grants.sh:ro
  networks: [app]
  dns: ['127.0.0.1']
  restart: 'no'

services:
  worker-mail:
    <<: *laravel-runtime
    environment:
      <<: *laravel-env
      DB_USERNAME: taller_mail
      DB_PASSWORD: *mail-db-password
      CACHE_STORE: array
      MAIL_HOST: '${MAIL_HOST:-}'
      MAIL_PORT: '${MAIL_PORT:-587}'
      MAIL_SCHEME: '${MAIL_SCHEME:-}'
      MAIL_USERNAME: '${MAIL_USERNAME:-}'
      MAIL_PASSWORD: '${MAIL_PASSWORD:-}'
      MAIL_REQUIRE_TLS: '${MAIL_REQUIRE_TLS:-true}'
      MAIL_FROM_ADDRESS: '${MAIL_FROM_ADDRESS:-}'
      MAIL_FROM_NAME: '${MAIL_FROM_NAME:-Taller Rust y Go}'
      MAIL_EHLO_DOMAIN: '${MAIL_EHLO_DOMAIN:-}'
    command: ['php', 'artisan', 'queue:work', 'mail', '--queue=mail', '--sleep=3', '--timeout=60', '--max-jobs=500', '--max-time=3600']
    networks: [mail, egress]
    dns: []
    depends_on:
      mysql:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
      grants:
        condition: service_completed_successfully
    stop_grace_period: 150s
    restart: unless-stopped

  grants:
    <<: *grants
    depends_on:
      mysql:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully

  db-grants:
    <<: *grants
    profiles: [ops]
    entrypoint: ['/usr/local/bin/apply-grants.sh', '--phase', 'all', '--host', 'mysql']
    depends_on:
      mysql:
        condition: service_healthy

  mysql:
    # … as today, plus:
    environment:
      # … MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD and MYSQL_ROOT_PASSWORD as today
      MAIL_DB_PASSWORD: *mail-db-password
    volumes:
      - mysql-data:/var/lib/mysql
      - ./docker/mysql/10-db-grants.sh:/docker-entrypoint-initdb.d/10-db-grants.sh:ro
      - ./docker/mysql/db-grants.sql:/db-grants.sql:ro
      - ./docker/mysql/apply-grants.sh:/usr/local/bin/apply-grants.sh:ro
    networks: [app, mail]

networks:
  # … edge, web, app, testing and sandbox as today
  mail:
    internal: true
  egress: {}
```

**Las variables de `worker-mail`.**
- **Cuáles son suyas.** `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD` y las demás de `MAIL_*` que no son `MAIL_MAILER` ni `MAIL_REQUIRED` están sólo ahí (FR-006).
- **Lo que hereda.** `<<: *laravel-env` le da `APP_KEY` (descifra los trabajos) y `LOG_HMAC_KEY` (el HMAC de los registros).
- **Lo que pisa.** `DB_USERNAME` y `DB_PASSWORD` pisan los del ancla.
- **El DNS.** `dns: []` limpia el `127.0.0.1` del ancla (research.md, mediciones).

**Pasos:**

1. **`qa/compose-mail-check.ts`.** Es Node puro y lee `docker/compose.yaml` con `parse(…, {merge: true})`, como `compose-runs-check`. Para «el perfil por omisión», filtra los servicios sin `profiles`. Falla porque `worker-mail` no existe, y comprueba:
   - **las redes, en el perfil por omisión:**
     - los miembros de `mail` son exactamente `mysql` y `worker-mail`, y los de `egress`, exactamente `worker-mail`;
     - las redes de `worker-mail` son exactamente `['mail', 'egress']`;
     - `mail` es `internal: true` y `egress` no;
   - **el endurecimiento:** `worker-mail` no tiene `ports`, tiene `read_only: true`, `cap_drop: ['ALL']`, `security_opt` con `no-new-privileges:true`, `mem_limit: 256m`, `pids_limit: 64`, `restart: unless-stopped`, `dns: []` y `stop_grace_period: '150s'`;
   - **las dependencias:** `worker-mail` depende de `mysql` sano, `migrate` terminado y `grants` terminado;
   - **las credenciales:**
     - el usuario de MySQL de `worker-mail` es `taller_mail`;
     - los servicios con `MAIL_PASSWORD` o `MAIL_USERNAME` en su entorno son exactamente `['worker-mail']`;
     - el texto anterior a `services:` no contiene `MAIL_PASSWORD` ni `MAIL_USERNAME`;
   - **los valores por omisión:** el ancla `x-laravel-env` trae `MAIL_REQUIRED` con `${MAIL_REQUIRED:-true}` y `MAIL_MAILER` con `${MAIL_MAILER:-log}`, y `x-laravel-base-env` no trae ninguna `MAIL_*`;
   - **los permisos:** `grants` no tiene `profiles`, corre `--phase tables` y depende de `migrate`; `db-grants` está en `ops` y corre `--phase all`;
   - **la cadena de plazos:** `mail.mailers.smtp.timeout` (20, leído de `backend/api/config/mail.php`) < el `#[Timeout(60)]` de `backend/api/app/Jobs/SendMail.php` < el `retry_after` de la conexión `mail` (120, de `config/queue.php`) < el `stop_grace_period` de `worker-mail` (150). Los valores se leen con expresiones regulares, como hace `compose-runs-check`.
2. **Implementá** los cambios de `docker/compose.yaml`.
3. **Corré y verificá:**
   - `node qa/compose-mail-check.ts`, `node qa/compose-runs-check.ts` y `npm test`;
   - `COMPOSE_PROJECT_NAME=taller-c3c docker compose config --services`: difiere de lo anotado en T001 sólo en `grants` y `worker-mail`;
   - `COMPOSE_PROJECT_NAME=taller-c3c docker compose config --format json`: el `dns` de `worker-mail` está ausente o vacío.

### Tarea 5.5 · El despliegue y el smoke (T027)

- **Modifica:** `backend/api/scripts/deploy.sh` (el de [contracts/console.md](./contracts/console.md)) y `backend/api/scripts/smoke.sh`.

**`smoke.sh` suma estos chequeos,** con el estilo de `check` que ya tiene:

```sh
check "$(docker compose ps --status running --services | grep -cx worker-mail)" 1 "el servicio worker-mail corre"
check "$(can_resolve worker-mail mysql) $(can_resolve worker-mail php)" 'si no' \
  "worker-mail resuelve mysql y no php: sólo comparte red con mysql (es la única excepción del DNS cerrado)"
check "$(docker compose exec -T php printenv MAIL_PASSWORD 2>/dev/null | grep -c .) $(docker compose exec -T php printenv MAIL_USERNAME 2>/dev/null | grep -c .)" '0 0' \
  "php no tiene las credenciales del proveedor"
check "$(docker compose exec -T worker-mail printenv DB_USERNAME 2>/dev/null)" taller_mail "worker-mail usa el usuario taller_mail"
check "$(docker compose config --services | grep -cx mailpit)" 0 "mailpit no existe sin el perfil dev"
```

El lazo de DNS de C3a queda como está, con sus seis servicios. `worker-mail` no entra a ese lazo: tiene su propia línea, que dice que es la excepción.

**El chequeo de `forgot-password`** (FR-030):
1. Un `GET /api/session` con un archivo de cookies temporal.
2. `reset=$(… | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).features.passwordReset")`.
3. Un `POST /api/auth/forgot-password` con `X-XSRF-TOKEN` y `{"email": "smoke-<azar>@taller.invalid"}`.
4. Exige `202` si `reset` es `true` y `503 mail_unavailable` si es `false`.

**Pasos:**

1. **Levantá un stack propio desde cero,** sin tocar el del usuario: `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 sh backend/api/scripts/deploy.sh`, con el `.env` de T024.
2. **Corré los checks:**
   - `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 npm run api:smoke`, en modo sólo link: el 503;
   - otra vez con `MAIL_REQUIRED=false` en la misma línea del despliegue, que deja el correo «disponible» con el mailer `log`: el 202;
   - `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 npm run api:content:check` y `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 sh backend/api/scripts/deploy-check.sh`, sin editar.
3. **El volumen existente.** Con un volumen creado con el `docker/compose.yaml` de `master` (una corrida de `deploy.sh` desde `master` con `COMPOSE_PROJECT_NAME=taller-c3c-viejo`), el `deploy.sh` nuevo con el mismo nombre crea `taller_mail` por `db-grants` y deja a `worker-mail` corriendo.
4. **Al terminar,** `COMPOSE_PROJECT_NAME=taller-c3c-viejo docker compose down -v` (sólo ese proyecto, que es de la prueba).

### Tarea 5.6 · `check-mail.sh` (T028)

- **Crea:** `backend/api/scripts/check-mail.sh`.
- **Consume:** `backend/api/scripts/check-account.sh` (C3a y C3b: abre un admin de prueba con su archivo de cookies).
- **Entrega:** el check de [contracts/console.md](./contracts/console.md) y de research.md, R20. Usa las funciones `check`, `abort`, `call`, `xsrf` y `json` con la misma forma que `check-admin-lifecycle.sh`, y limpia sus cuentas e invitaciones (`check-mail-%@taller.invalid`) en un `trap … EXIT`.

**Los modos.** El script decide con `docker compose ps --status running --services | grep -cx mailpit`. Con `CHECK_MAIL_EXPECT=failed` corre el tercero, el del proveedor caído: espera `send_failed_at` en lugar de `sent_at` (hasta 60 s), exige que `failed_jobs.exception` y `failed_jobs.payload` de esa fila no contengan la dirección, que los registros de `worker-mail` tengan `mail.failed` sin la dirección y que el pedido de la invitación haya tardado menos de un segundo (`curl -w '%{time_total}'`).

- **Sin Mailpit** (el stack corre con `MAIL_REQUIRED=false` y `MAIL_MAILER=log`):
  1. un admin invita por correo a `check-mail-<azar>@taller.invalid`: 200 con `created` y sin `url`;
  2. dentro de 30 s, `sent_at` de esa invitación ya no es `NULL` (lo lee con `check_account_sql`);
  3. `docker compose logs --no-log-prefix worker-mail` no contiene `check-mail-` ni `#invitacion=` seguido de 43 caracteres de base64url;
  4. un `forgot-password` para el admin de prueba responde 202, y en 3 minutos aparece un `mail.sent` del tipo `password_reset`. Ese tiempo es la medición de SC-002;
  5. imprime `LÍMITE: sin Mailpit, que el link abra queda como verificación manual (FR-052).`
- **Con Mailpit** (T029):
  1. lo mismo, sin el chequeo de los registros;
  2. busca el mensaje en `http://127.0.0.1:${MAILPIT_PORT:-8025}/api/v1/search?query=to:"check-mail-<azar>@taller.invalid"` hasta 30 s;
  3. lee `GET /api/v1/message/<ID>` y comprueba que `Text` contiene `$APP_URL/#invitacion=`;
  4. extrae el token, y `POST /api/auth/invitations/lookup {token}` responde 200;
  5. repite con `forgot-password` (hasta 3 minutos): el link `#restablecer=…&email=…` restablece la contraseña con `POST /api/auth/reset-password`, que responde 200;
  6. comprueba que llegó el aviso de contraseña cambiada.

**Pasos:**

1. **Corré el modo sin Mailpit:** `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAIL_REQUIRED=false sh backend/api/scripts/deploy.sh` y después `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 sh backend/api/scripts/check-mail.sh`. Anotá el tiempo de la recuperación.
2. **El proveedor caído** (quickstart, escenario 5): con `MAIL_REQUIRED=false MAIL_MAILER=smtp MAIL_HOST=mysql MAIL_PORT=1 MAIL_REQUIRE_TLS=false MAIL_RETRY_SECONDS=20 MAIL_BACKOFF=5` en la línea del despliegue, `CHECK_MAIL_EXPECT=failed sh backend/api/scripts/check-mail.sh` pasa. Una invitación por correo queda con `send_failed_at` en menos de un minuto, `failed_jobs` tiene una fila sin la dirección, y el pedido de la invitación respondió en menos de un segundo (SC-003).

### Tarea 5.7 · Mailpit en el perfil `dev` (T029)

**Sólo con el permiso de T002.** Sin permiso, esta tarea se cierra con la nota «sin permiso: FR-052 queda como verificación manual» y no se hace nada más.

- **Modifica:** `docker/compose.yaml` y `qa/compose-mail-check.ts`.
- **Entrega** (los valores de [contracts/console.md](./contracts/console.md), «Mailpit»):

```yaml
  mailpit:
    profiles: [dev]
    image: axllent/mailpit:v1.31.4@sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48
    environment:
      MP_DISABLE_VERSION_CHECK: 'true'
      MP_SMTP_AUTH_ACCEPT_ANY: 'true'
      MP_SMTP_AUTH_ALLOW_INSECURE: 'true'
      MP_MAX_MESSAGES: '500'
    networks: [egress]
    ports:
      - '127.0.0.1:${MAILPIT_PORT:-8025}:8025'
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    healthcheck:
      test: ['CMD', '/mailpit', 'readyz']
      interval: 5s
      timeout: 3s
      retries: 10
    restart: 'no'
```

**Pasos:**

1. **`compose-mail-check`** suma tres pruebas, que fallan:
   - con el perfil `dev`, `mailpit` está en `['egress']` y en ninguna otra red, y sus `ports` son exactamente `['127.0.0.1:${MAILPIT_PORT:-8025}:8025']`;
   - `mailpit` tiene `profiles: ['dev']` y la imagen con su digest;
   - en el perfil por omisión, `egress` sigue siendo sólo `worker-mail`.
2. **Bajá la imagen** (la descarga permitida): `docker pull axllent/mailpit:v1.31.4@sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48`.
3. **Comprobá el usuario, el binario y el disco:**
   - `docker image inspect` muestra el `User` y el `Entrypoint`. Si el binario no está en `/mailpit`, corregí el `healthcheck`;
   - con `read_only` y el tmpfs, `COMPOSE_PROJECT_NAME=taller-c3c MAILPIT_PORT=8026 docker compose --profile dev up -d --wait mailpit` queda sano. Si Mailpit necesita escribir fuera de `/tmp`, sumá el tmpfs que pida y anotalo.
4. **Corré** `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAILPIT_PORT=8026 MAIL_MAILER=smtp MAIL_HOST=mailpit MAIL_PORT=1025 MAIL_REQUIRE_TLS=false MAIL_FROM_ADDRESS=taller@taller.invalid docker compose --profile dev up -d --wait` y después `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 MAILPIT_PORT=8026 sh backend/api/scripts/check-mail.sh`: el modo completo pasa (FR-052).
5. **Sin el perfil:** `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093 npm run api:smoke` sigue pasando, y `mailpit` no existe.

**Compuerta G5:**
- `npm test`, con `apply-grants-check`, `compose-mail-check` e `init-env-check`;
- contra el stack `taller-c3c`, en modo sólo link y con correo: `api:smoke`, `api:content:check`, `deploy-check.sh` y `check-mail.sh`;
- `MailUserPrivilegesTest`;
- el volumen viejo, con `taller_mail` creado por `deploy.sh`;
- y, con el permiso, el modo completo con Mailpit.

## 6. Cierre (unidad 6)

### Tarea 6.1 · La documentación (T030)

- **Modifica:**
  - **`backend/api/AGENTS.md`:**
    - una sección «Correo (C3c)», con los contratos en `specs/011-c3c-correo/contracts/`;
    - que todo correo pasa por `Mailbox::queue` y sólo `SendMail` usa el `Mailer`;
    - que `worker-mail` no usa Eloquent sobre `invitations`;
    - `MailWorld` y la cola `database` para las pruebas de «después del COMMIT»;
    - los comandos `taller:change-email` y `taller:prune-unverified`;
    - `check-mail.sh` en la lista de comandos;
    - `db-grants.sql` en dos fases, con `apply-grants.sh`, y que `deploy.sh` corre `db-grants`;
    - y que se quita la línea «Hasta C3c no hay correo».
  - **`AGENTS.md`:** `MAIL_DB_PASSWORD` en la lista de variables del `.env`, y que un `.env` de antes de C3c necesita correr `init-env.sh` otra vez; `worker-mail` en la descripción del stack; el perfil `dev` con Mailpit.
  - **`qa/AGENTS.md`:**
    - las filas de la tabla para `apply-grants-check`, `compose-mail-check` y `check-mail.sh`;
    - `operationChecks` con sus cuatro checks.
  - **`docs/architecture.md`:** el correo en el mapa de fuentes del backend.
  - **`README.md`:** cómo prender el correo (las variables de `.env`, `MAIL_MAILER=smtp` sólo con `APP_URL` público) y el modo sólo link.

**Pasos:**

1. Comprobá cada ruta, comando y enlace local que escribas, con `ls` y con los enlaces relativos.
2. Corré `git diff --check`.

### Tarea 6.2 · La compuerta final (T031)

**Pasos:**

1. **Corré** todo SC-012 y anotá el resultado real de cada uno:
   - con `COMPOSE_PROJECT_NAME=taller-c3c` en su línea: `npm run api:test`, `npm run api:format:check` y `npm run api:analyse` (nivel 9, 0 errores);
   - `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`;
   - con `COMPOSE_PROJECT_NAME=taller-c3c TALLER_PORT=8093` en su línea: `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`;
   - `sh backend/api/scripts/check-mail.sh`.
2. **Recorré [quickstart.md](./quickstart.md)** del escenario 1 al 9.
3. **Anotá** los números de la suite (pruebas y aserciones) y el tiempo de la recuperación de SC-002.
4. **Abrí el PR** de implementación: título en inglés con la notación de Angular (`feat(api): send the workshop's mail from an isolated worker`) y la descripción completa: el problema, qué cambia, cómo se verificó y qué queda pendiente (las acciones del usuario, T032 a T037).
5. **Apagá** el stack de prueba con `COMPOSE_PROJECT_NAME=taller-c3c docker compose down -v`, que es sólo el proyecto de la prueba. **Nunca** sin la variable.

**Compuerta:** todo SC-012 en verde. La hoja de ruta pasa C3c a «Entregado» con el PR; el correo real queda pendiente en T037, y se anota así.

## Acciones del usuario (al final y separadas)

Los agentes no las hacen. Salen de la fila C3c de «Acciones del usuario» de la hoja de ruta del backend y de la spec. Ninguna bloquea las tareas T001 a T031, que se implementan y se prueban con el modo sólo link, con el mailer `log` y, si hay permiso, con Mailpit.

### T032 · El dominio y la transferencia internacional

- **Elegí el dominio** con el que sale el correo. Es el mismo que pide C4 en su acción 2.
- **Comprobá que podés editar su DNS:** registros TXT y CNAME en subnombres. Un subdominio gratuito de DNS dinámico puede no dejarlo.
- **Confirmá con quien responde por la base** la vía de transferencia internacional de Brevo (Ley 25.326, art. 12): país adecuado, cláusulas modelo o la que corresponda.

### T033 · Brevo, SPF, DKIM y DMARC, y el remitente

1. **Creá la cuenta de Brevo.** Antes de contratar, verificá en su fuente dos cosas: el plan gratuito de 300 correos por día para toda la cuenta y que sus servidores están en la UE.
2. **Autenticá el dominio:**
   - SPF y DKIM con los valores que te da Brevo;
   - un DMARC propio, empezando en monitoreo (`p=none`).
3. **Elegí la dirección remitente,** por ejemplo una de no responder del dominio, y su nombre (`Taller Rust y Go` por omisión).
4. **El rastreo de aperturas y de clics.** Si la cuenta lo ofrece para los correos transaccionales, apagalo: reescribiría los links y le entregaría el token a un tercero más (FR-009).

### T034 · La credencial SMTP en `.env`

1. **Generá una clave SMTP**, de las que se usan para el relay, no una clave de API.
2. **Copiá de la página «SMTP & API» de tu cuenta** el servidor, el puerto y el usuario. El ejemplo de Brevo usa `smtp-relay.brevo.com` y el 587, pero mandan los valores de tu cuenta.
3. **Escribí en `.env`:**
   - `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` (la clave);
   - `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` y `MAIL_EHLO_DOMAIN` (el dominio).

   **Dejá `MAIL_MAILER` sin poner** (vale `log`) hasta T035: así el taller sigue en modo sólo link.
4. **Corré** `sh backend/api/scripts/init-env.sh` (suma `MAIL_DB_PASSWORD` si falta) y `COMPOSE_PROJECT_NAME=<tu proyecto> sh backend/api/scripts/deploy.sh`. El despliegue crea `taller_mail` por `db-grants`.

Los agentes no ven el `.env`.

### T035 · Un `APP_URL` público

- **Cuando llegue C4**, `APP_URL` pasa a ser el dominio público. Hasta entonces vale `http://localhost:8080`, y los links no abren fuera del equipo.
- **Con el `APP_URL` real,** poné `MAIL_MAILER=smtp` en `.env` y desplegá otra vez.
- **Comprobá** que `worker-mail` ya no advierte `mail.app_url_local` (`COMPOSE_PROJECT_NAME=<tu proyecto> docker compose logs worker-mail`) y que `GET /api/session` responde `features.passwordReset: true`.

### T036 · El aviso de privacidad y la lista de dominios

- **Antes del despliegue público,** el aviso de privacidad nombra a Brevo como encargado del tratamiento y, si corresponde, la transferencia internacional.
- **Decidí quién responde por la base** y si hay que inscribirla ante la AAIP (§13.14).
- **Antes de prender `REGISTRATION_OPEN`,** definí `REGISTRATION_ALLOWED_DOMAINS` (Q3). Vacía, el registro queda abierto a cualquiera.

### T037 · La verificación con el dominio real (con el coordinador)

Es la tarea de verificación de C3c con correo real (SC-001 y FR-052 con el proveedor). La hace el usuario con el coordinador, después de T032 a T035. Con el stack público de C4, o con el local y `APP_URL` público:

1. **Dispará los ocho correos,** con los comandos del escenario 9 de [quickstart.md](./quickstart.md), hacia tres buzones de distinto tipo: uno de Google, uno de Microsoft y el de la escuela.
2. **Para cada correo y cada buzón, anotá:**
   - si llegó y en qué carpeta (entrada o spam);
   - si las cabeceras `Authentication-Results` dicen `spf=pass`, `dkim=pass` y `dmarc=pass`;
   - si el link empieza exactamente por `APP_URL`, sin un dominio de Brevo delante: si Brevo lo reescribe, volvé a T033, paso 4;
   - si el link abre y hace lo suyo.
3. **Comprobá en la base** que cada invitación tiene `sent_at`, y en `failed_jobs`, que no quedó ninguno.
4. **Volvé a cerrar `REGISTRATION_OPEN`** si lo abriste para los correos de verificación y de intento de registro.

La evidencia va en el PR o en la hoja de ruta, como «C3c con correo real: verificado el <fecha>». Mailpit no prueba la entregabilidad: sólo esta tarea lo hace.

## Lo que quedó sin verificar

Se planificó sin correr PHP ni el stack. Hay que medirlo al implementar, en la tarea que se nombra:

| Qué | Dónde se comprueba |
| --- | --- |
| Que `buildView()` redefinido y el `HtmlString` lleguen como una sola parte `text/plain`, y que `assertSeeInText` los lea. Se leyó en el código de Laravel 13.34, sin correrlo | T005 |
| Que `queue:work --once` dentro de Pest tome la conexión restringida después de olvidar las instancias resueltas de la cola y del registro de fallos | T025 |
| Los códigos exactos de MySQL 9.7 para un permiso de columna negado (1143) y uno de tabla (1142). La prueba acepta los dos donde corresponde | T025 |
| Que `dns: []` quede vacío en el `docker/compose.yaml` real. Se midió sobre un archivo descartable | T026 |
| Que `awk` y `sed` estén en la imagen `mysql:9.7` que fija Compose (se midió: están, en `/usr/bin`) y que el inicio de un volumen nuevo ejecute `10-db-grants.sh` con la contraseña de root ya fijada | T023 y T027 |
| El usuario, la ruta del binario y el disco de sólo lectura de Mailpit | T029 |
| Que Brevo ofrezca STARTTLS en el 587 (`MAIL_REQUIRE_TLS=true`) y no reescriba los links de un correo de texto | T037 |
| El tiempo real de la recuperación (SC-002, 3 minutos o menos) | T028 |

## Puntos de integración con otros ítems

- **C4** ([spec 008](../008-c4-exposicion/spec.md), planificada): C3c entrega antes, y su plan lo previó («Si C3c llegó antes de T014 con otro mecanismo, T014 lo adopta»).
  - **Lo que encuentra hecho:**
    - `docker/mysql/apply-grants.sh`, `10-db-grants.sh` y el servicio `grants`, con los nombres, los marcadores y las fases de su plan;
    - `worker-mail` con `taller_mail`.
  - **Lo que suma su T014:**
    - sus cuatro contraseñas al `for` del script y a `mysql`;
    - sus cuentas a las dos fases;
    - `php` y `scheduler` como dependientes de `grants`;
    - la línea que retira a `taller`.
  - **Dos diferencias, que van como hallazgos:**
    - la matriz de `taller_mail` necesita `SELECT (id, token_hash)` y no sólo `SELECT (id)`;
    - `deploy.sh` corre `db-grants` en cada despliegue, cosa que su plan hacía sólo en un volumen viejo.
  - **Sin cambios para C4:** la prueba de puertos de C4 corre sin el perfil `dev`, y el respaldo vuelca sólo la estructura de `mail_jobs`, como ya prevé.
- **C3b** ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md), entregada). C3c completa sus cuatro ganchos sin cambiar su contrato salvo por dos 429 nuevos (contracts/http.md). `PurgeUserData` pasa a cifrado: `PurgeUserDataQueueTest`, que exigía lo contrario, cambia en T016.
- **F11c y F12b** (specs 015 y 023): la tabla «Lo que toman F11c y F12b» de [contracts/http.md](./contracts/http.md) confirma sus supuestos y corrige dos, los dos 429. Se planifican con este contrato.
- **La hoja de ruta del backend:** la fila C3c pasa a «Planificado» con este plan, y la integra el coordinador.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
