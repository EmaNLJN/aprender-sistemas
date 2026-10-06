# Implementation Plan: C3b · Administración y ciclo de vida de la cuenta

**Branch**: `010-c3b-admin-ciclo-de-vida` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-c3b-admin-ciclo-de-vida/spec.md`. Decisiones: [research.md](./research.md). Tablas: [data-model.md](./data-model.md). Contratos: [contracts/http.md](./contracts/http.md) y [contracts/console.md](./contracts/console.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completa la sección de tu dueño y las «Reglas para todos los agentes». `tasks.md` tiene una línea por tarea (T001…) y remite acá.
>
> **Código sin ejecutar.** Se planificó sin PHP, sin Composer y sin Docker. Nada de lo que sigue corrió: las firmas, el SQL y la configuración son referencia, y las pruebas son el contrato. La sección «Lo que quedó sin verificar» lista lo que hay que medir al implementar.
>
> **Línea de base.** El plan parte de `master` más C3a (PR #24, `feat/c3a-identidad`, `656b14e`) y B2 (PR #22, `feat/b2-ejecuciones`, `1d263c3`). B2 trae el evento de cuenta restringida, `AccountLock`, `ActiveRuns`, la suite `Concurrency` y `Tests\Support\Parallel`, que C3b usa. Esta rama sólo tiene las specs, así que el código de C3a y de B2 se leyó de sus ramas. T001 los trae antes de empezar.

## Summary

C3b le da al taller lo que hace falta para operarlo con gente real, sin paquetes nuevos y sin correo. Un admin crea, renueva y revoca invitaciones por HTTP, y deshabilita, rehabilita, promueve, degrada o suprime cuentas sin poder dejar al taller sin un admin activo. Una persona exporta sus datos y borra su cuenta, y la supresión se lleva también los intentos, las ejecuciones y las importaciones. El `scheduler` procesa la cola `default`, que es por donde pasa la purga. Lo que pediría un correo responde 503 `mail_unavailable` hasta que llegue C3c. El enfoque:

- **Un solo código cambia el rol y el estado.** `AccountChanges` toma la guardia del último admin (los admins activos y después el destino, `FOR UPDATE`, en READ COMMITTED), aplica los efectos de FR-035 en la misma transacción y dispara el evento que B2 ya espera **después** de confirmar (research.md, R3).
- **El rol se comprueba antes que el destino.** Un grupo de middleware `admin` y rutas sin binding implícito: un estudiante recibe 403 con un id que existe y con uno que no (R2).
- **Sin correo, sin una capa para el correo.** Tres sitios lanzan `MailUnavailable` y los dos avisos no existen; C3c los completa (R1).
- **`UserData` es un registro, y una prueba lo cuida.** Cada tabla con `user_id` (o hija de una) se declara con su exportación y su supresión, y `PopulatedAccount` puebla las que existan: una tabla nueva que no se declare rompe la prueba (R5).
- **La supresión es idempotente y se retoma sola.** `PurgeUserData` es único por cuenta, borra por lotes y cierra con la cabecera de B2 bloqueada; un barrido cada 5 minutos retoma lo trabado (R7). Un libro de supresiones y un comando que lo reaplica sobre una base restaurada cierran el ciclo (R8).
- **La exportación no sostiene una transacción.** `streamJson` con generadores, fragmentos de 100 intentos leídos en transacciones cortas que terminan antes de escribir (R6).

## Technical Context

**Language/Version**: PHP 8.5 (FPM) y Laravel 13.34 (`composer.lock`) en `backend/api/`, sin sintaxis posterior a PHP 8.3 (`composer.json` pide `^8.3`) y sin `declare(strict_types=1)`.

**Primary Dependencies**: ninguna nueva. Se usan los atributos de colas de `Illuminate\Queue\Attributes` (`Tries`, `Timeout`, `Backoff`, `UniqueFor`), `response()->streamJson` y `Prunable`, del núcleo de Laravel 13; Larastan 3.12.3, PHPStan 2.2.17 y Pest 5.3, ya instalados.

**Storage**: MySQL 9.7. Una tabla nueva, `account_deletions` ([data-model.md](./data-model.md)); la cola `default` en la tabla `jobs` y los fallos en `failed_jobs`, que ya existen.

**Testing**: Pest contra `mysql-test` (`npm run api:test`), con las suites `Unit`, `Feature`, `Content` y `Concurrency`; PHPStan en el nivel 9 que fija `phpstan.neon` desde C6 (`npm run api:analyse`) y Pint. Las pruebas de sesión, límites y confirmación fijan los drivers `database` por prueba (`Browser::useDatabaseDrivers()`). Contra el stack levantado: `npm run api:smoke`, `npm run api:content:check`, `sh backend/api/scripts/deploy-check.sh` y el check nuevo, `sh backend/api/scripts/check-admin-lifecycle.sh`.

**Target Platform**: Docker Compose en un servidor, Linux o macOS. Cada dueño usa su propio `COMPOSE_PROJECT_NAME`.

**Project Type**: servicio web (API Laravel) con Nginx delante.

**Performance Goals**: una cuenta suprimida por HTTP desaparece sola en 3 minutos o menos (SC-014); una exportación de una cuenta con decenas de miles de intentos se entrega sin acumularse en memoria (fragmentos de 100). La guardia del último admin serializa dos pedidos y no los degrada: `users` tiene unas 5.000 filas como mucho y los admins son pocos.

**Constraints**:

- `php` con el disco de sólo lectura y sin salida a Internet: nada de C3b lo necesita (el libro entra por la entrada estándar);
- ningún dato personal en la carga útil del trabajo de purga ni en los registros;
- sin descargas: no se instala ni se baja nada;
- sin `@phpstan-ignore` ni baseline;
- ninguna transacción abierta mientras se escribe la exportación.

**Scale/Scope**: 11 endpoints nuevos; 1 tabla; 1 trabajo; 2 comandos; 4 tareas programadas; unos 45 archivos nuevos en `app/`, 1 migración, unos 50 archivos de prueba y 25 tareas en cuatro ondas (de la 0 a la 3).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.3.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `backend/api/AGENTS.md`: Collections y `Arr::` para los arreglos, Pest contra MySQL real, una tabla con un `CREATE TABLE`. T024 actualiza esa guía, `docs/architecture.md` y el README en el mismo cambio (FR-055). |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con las pruebas, que fallan por la razón que dice el paso. Los esperados salen de afuera del código probado: los códigos, los mensajes y el orden de las respuestas, de `contracts/http.md`; los límites y los plazos, del ADR y de la spec; el esquema, del ADR §5.2 y no de la migración; los ejemplos de listado, ordenamiento y purga, resueltos aparte en la tarea. Dos trampas del plan: un `{user}` con binding implícito esconde el 403 detrás de un 404 (R2), y una prueba de concurrencia con una sola corrida no demuestra una carrera (20 corridas). |
| III. Código entendible | Sí, con revisión | Clases chicas con nombre y contrato. Para revisar por cohesión y complejidad: `AccountChanges::change` (cinco pasos con nombre, uno por regla de R3) y `PurgeUserData::handle`. |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | No cambia ningún ID, fila ni byte del contenido. Lo que se borra es de la cuenta (D06), no del contenido. |
| V. Capas y contratos explícitos | Sí | Dominio (`app/Admin`, `app/Accounts`), transporte (`app/Http`), operación (`app/Console`, `app/Jobs`) y contratos (`contracts/`). Ninguna capa, framework ni dependencia nueva, y ninguna interfaz sin un segundo uso: el 503 de C3b no tiene puerto (R1). |
| VI. Español, accesibilidad y portabilidad | Sí | Los mensajes de la API y de la consola, en español; el código y las pruebas, en inglés. No hay interfaz. Los comandos son de POSIX `sh` y portables. |
| VII. Secretos y salidas generadas fuera de Git | Sí | C3b no suma secretos, variables ni descargas. El libro de supresiones es una salida del respaldo que queda fuera de Git (la copia la guarda C4). |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. Lo que falte lo agrega `/speckit-converge` al final; al entregar, el directorio queda inmutable, y C3c, D1b y los cambios posteriores van a specs nuevas que extienden a esta. |

## Project Structure

### Documentation (this feature)

```text
specs/010-c3b-admin-ciclo-de-vida/
├── spec.md              # qué y por qué, con el clarify del 2026-10-06
├── research.md          # decisiones de diseño, alternativas y cómo se verificaron
├── data-model.md        # account_deletions, el registro UserData y el estado de una cuenta
├── contracts/
│   ├── http.md          # endpoints, orden de las respuestas, errores y lo que consumen los demás ítems
│   └── console.md       # comandos, tareas programadas, registros y el formato del libro
├── quickstart.md        # escenarios de validación con sus comandos
├── plan.md              # este archivo: cómo, repartido en dueños
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

```text
backend/api/
├── app/
│   ├── Admin/           (nuevo) AccountChanges, LastAdminGuard, LockedTarget, las tres excepciones, UserDirectory, UserFilters,
│   │                    PublishedAdminUser, AdminInvitations, InviteOutcome, InviteResult, PublishedInvitation, PageMeta
│   ├── Accounts/        (nuevo) UserTable, UserTables, UserData, UserPurge, Ownership, AccountDeletion, DeletionLedgerFile,
│   │   │                LedgerEntry, MalformedLedger
│   │   └── Export/      ExportSection, UserExport, AccountSection, ExerciseProgressSection, AttemptsSection, RowShape
│   ├── Http/            ApiCode (cambia); MailUnavailable (nuevo)
│   │   ├── Controllers/ Admin/{UserController,InvitationController}, Account/{ExportController,DeletionController}
│   │   ├── Middleware/  EnsureUserIsAdmin
│   │   └── Requests/    Admin/{ListUsersRequest,UpdateUserRequest,InviteRequest,ListInvitationsRequest,ResendInvitationRequest}
│   ├── Jobs/            PurgeUserData
│   ├── Models/          DeletedAccount
│   ├── Console/Commands/ ResumePurges, ReapplyDeletions
│   └── Auth/Limiters.php (cambia: admin y export)
├── bootstrap/app.php    (cambia: el grupo admin, el alias account.admin y cuatro archivos de rutas)
├── config/              queue.php (after_commit en la conexión database) y taller.php (cuatro claves)
├── database/migrations/ 2026_10_05_400001_create_account_deletions_table.php
├── lang/es/             api.php (cambia); admin.php, invitations.php y account.php (nuevos)
├── routes/              api/{admin-users,admin-invitations,export,deletion}.php (nuevos); console.php (cambia: el scheduler)
├── scripts/             check-admin-lifecycle.sh (nuevo); check-account.sh y smoke.sh (cambian)
└── tests/               Unit/, Feature/, Content/ y Concurrency/; Support/{PopulatedAccount,UserDataCoverage}.php (nuevos)
backend/api/AGENTS.md  AGENTS.md  README.md  docs/architecture.md                                  (T024)
```

**Structure Decision:** la administración vive en `app/Admin/` y el ciclo de vida en `app/Accounts/`, una carpeta por responsabilidad como `app/Content/` y `app/Auth/`; el transporte, en `app/Http/`; lo que corre fuera de un pedido, en `app/Jobs/` y `app/Console/`. Cada característica de rutas tiene su archivo en `routes/api/`, que `bootstrap/app.php` lista en `withRouting(api: [...])`: dos dueños no tocan el mismo archivo de rutas. Sin barrels ni capas nuevas.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo. C3b concentra la autoridad del admin y los datos del alumno: un error acá es una pérdida de acceso o una pérdida de datos.

- **La guardia del último admin.**
  - El orden del bloqueo: primero los admins activos por el índice `(role, status)` y después el destino, y nunca `progress_heads`. Con dos pedidos concurrentes el segundo lee lo que dejó el primero (READ COMMITTED).
  - El 422 propio se decide antes de tocar la base. Las 20 corridas de `LastAdminRaceTest` dan exactamente un éxito y un `last_admin`.
  - Los tres caminos que quitan a un admin activo (deshabilitar, degradar y suprimir) pasan por la misma guardia, también `DELETE /api/me` y `taller:reapply-deletions` (sin la guardia, a propósito).
- **403 antes que 404.** Ninguna ruta de `/api/admin` usa binding implícito. La matriz pide un id que existe y uno que no con una cuenta de estudiante, y los dos dan 403.
- **El 503 y su orden.** Después de 423, 404 y 422, antes de escribir. No se emite ningún token ni se crea ninguna invitación: la prueba cuenta filas antes y después.
- **Deshabilitar conserva la sesión; suprimir la corta.** Una sesión deshabilitada recibe 403 `account_disabled`, no 401. La sesión del propio pedido de `DELETE /api/me` termina, y el siguiente es 401.
- **La purga.**
  - `progress_heads` se toma antes de borrar `users` (D08), y nada escribe `users` entre los lotes.
  - Cada intento se puede repetir sin daño: la cuenta cortada a mitad termina con el mismo resultado que una sin corte.
  - El trabajo no lleva datos personales.
  - La cancelación de ejecuciones es de mejor esfuerzo y deja registro.
- **La cobertura de `UserData`.** Un `user_id` sin declarar, una hija sin declarar y una sección de exportación que falta rompen la prueba, y `PopulatedAccount` obliga a poblar cada tabla declarada que exista.
- **La exportación.** Ninguna transacción abierta mientras se escribe; sólo lo propio; sin el hash ni el token; el formato `taller-export-1`; un fragmento por transacción corta.
- **El `scheduler`.** `--queue=default` explícito (B2 comparte la tabla `jobs`), el bloqueo que vence a los 10 minutos y las ocho tareas sin solaparse.
- **Registros.** Ninguna línea con un email, un nombre, un token ni un link; los emails salen como HMAC.
- **Lo que C3c y D1 esperan.** Los tres sitios del 503 y los dos puntos de aviso con su nombre, y `UserTables`, `PopulatedAccount` y `UserExport` como los archivos donde D1a y D1b suman sus tablas.
- **Complejidad.** `AccountChanges::change` puede pasar de 10 caminos: se revisa por pasos con nombre y por su tabla de pruebas, no se fragmenta por una cuota.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | Coordinador | T001 y T002: la línea de base (C3a y B2 integrados) y las piezas comunes (los dos códigos, el grupo `admin`, los límites, la configuración, `PageMeta` y los cuatro archivos de rutas) |
| 1 | S, A, I y X, a la vez | **S**: T003 a T006, el esquema y el registro `UserData`. **A**: T007 a T011, el núcleo de cuentas y los endpoints de usuarios. **I**: T012 y T013, las invitaciones de admin. **X**: T014, las secciones de la exportación |
| 2 | L y X (desde S1) | **L**: T016 a T019, la supresión: el trabajo, el pedido y sus rutas, el barrido y el comando de restauración. **X**: T015, el endpoint de la exportación y su cobertura |
| 3 | Coordinador (desde S2) | T020 a T025: el `scheduler`, las matrices, el evento hacia B2, los checks contra el stack, la documentación y la compuerta |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| Coordinador | `backend/api/app/Http/ApiCode.php`, `backend/api/lang/es/api.php`, `backend/api/tests/Unit/ApiCodeTest.php`, `backend/api/app/Http/MailUnavailable.php`, `backend/api/app/Http/Middleware/EnsureUserIsAdmin.php`, `backend/api/app/Admin/PageMeta.php`, `backend/api/app/Auth/Limiters.php`, `backend/api/config/{queue,taller}.php`, `backend/api/bootstrap/app.php`, `backend/api/routes/console.php`, `backend/api/tests/Unit/{MailUnavailableTest,Admin/PageMetaTest}.php`, `backend/api/tests/Feature/{ConfigTest,ScheduleTest,RouteAccessTest,ExpectedAccountMatrixTest,MassAssignmentTest}.php`, `backend/api/tests/Feature/Limits/LimitersTest.php`, `backend/api/tests/Feature/Admin/{AdminGroupTest,AdminAccessMatrixTest,PasswordConfirmMatrixTest,NoStudentTextsTest}.php`, `backend/api/tests/Feature/Accounts/AccountRestrictedWiringTest.php`, `backend/api/scripts/{check-admin-lifecycle,check-account,smoke}.sh`, `backend/api/AGENTS.md`, `AGENTS.md`, `README.md`, `docs/architecture.md`, `specs/backend-multiusuario/roadmap.md` | todo | la línea de base, las piezas comunes (con los cuatro archivos de `routes/api/` creados vacíos, que enseguida pasan a su dueño), el `scheduler`, las matrices, el evento hacia B2, los checks contra el stack, la documentación y la evidencia de cierre |
| S · Esquema y registro | `backend/api/database/migrations/2026_10_05_400001_create_account_deletions_table.php`, `backend/api/app/Models/DeletedAccount.php`, `backend/api/app/Accounts/{UserTable,UserTables,UserData,UserPurge,Ownership}.php`, `backend/api/tests/Feature/{AccountDeletionsSchemaTest,UserIdForeignKeyTest,UserDataCoverageTest,DeletedAccountTest}.php`, `backend/api/tests/Feature/Accounts/{UserPurgeTest,PopulatedAccountTest}.php`, `backend/api/tests/Content/{MigrationsTest,UserDataCoverageProbeTest}.php`, `backend/api/tests/Unit/Accounts/UserTablesTest.php`, `backend/api/tests/Support/{PopulatedAccount,UserDataCoverage}.php` | T001 y T002 | la tabla, `DeletedAccount`, el registro `UserData` con `tables()`, `UserPurge::inBatches` y `PopulatedAccount::create` |
| A · Administración de cuentas | `backend/api/app/Admin/{LastAdminGuard,LockedTarget,AccountChanges,LastAdmin,RestrictsItself,AccountBeingDeleted,UserDirectory,UserFilters,PublishedAdminUser}.php`, `backend/api/app/Http/Controllers/Admin/UserController.php`, `backend/api/app/Http/Requests/Admin/{ListUsersRequest,UpdateUserRequest}.php`, `backend/api/routes/api/admin-users.php`, `backend/api/lang/es/admin.php`, `backend/api/tests/Feature/Admin/{LastAdminGuardTest,AccountChangesTest,AccountBeginDeletionTest,LastAdminMatrixTest,UsersListTest,UserShowTest,UserUpdateTest,PasswordResetHookTest}.php`, `backend/api/tests/Unit/Admin/PublishedAdminUserTest.php`, `backend/api/tests/Concurrency/LastAdminRaceTest.php` | T001 y T002 | `AccountChanges::change` y `::beginDeletion` (las usa L), `LastAdmin` y los endpoints de usuarios |
| I · Invitaciones de admin | `backend/api/app/Admin/{AdminInvitations,InviteOutcome,InviteResult,PublishedInvitation}.php`, `backend/api/app/Http/Controllers/Admin/InvitationController.php`, `backend/api/app/Http/Requests/Admin/{InviteRequest,ListInvitationsRequest,ResendInvitationRequest}.php`, `backend/api/routes/api/admin-invitations.php`, `backend/api/lang/es/invitations.php`, `backend/api/tests/Feature/Admin/{AdminInvitationsTest,InvitationsEndpointTest,InvitationsListTest}.php`, `backend/api/tests/Concurrency/InviteRaceTest.php` | T001 y T002 | `AdminInvitations` y los cuatro endpoints de invitaciones |
| X · Exportación | `backend/api/app/Accounts/Export/{ExportSection,UserExport,AccountSection,ExerciseProgressSection,AttemptsSection,RowShape}.php`, `backend/api/app/Http/Controllers/Account/ExportController.php`, `backend/api/routes/api/export.php`, `backend/api/tests/Unit/Accounts/Export/RowShapeTest.php`, `backend/api/tests/Feature/Accounts/{UserExportTest,AttemptsSectionTest,ExportEndpointTest,UserExportCoverageTest}.php`, `backend/api/tests/Content/ExportTransactionTest.php` | T001 y T002; de S, `UserData` y `PopulatedAccount` (T015) | `UserExport::document` y `::sectionKeys`, y `POST /api/me/export` |
| L · Supresión | `backend/api/app/Jobs/PurgeUserData.php`, `backend/api/app/Accounts/{AccountDeletion,DeletionLedgerFile,LedgerEntry,MalformedLedger}.php`, `backend/api/app/Console/Commands/{ResumePurges,ReapplyDeletions}.php`, `backend/api/app/Http/Controllers/Account/DeletionController.php`, `backend/api/routes/api/deletion.php`, `backend/api/lang/es/account.php`, `backend/api/tests/Feature/Accounts/{PurgeUserDataTest,PurgeUserDataQueueTest,AccountDeletionTest,DeleteMeTest,DeleteUserTest}.php`, `backend/api/tests/Feature/Console/{ResumePurgesTest,ReapplyDeletionsTest}.php`, `backend/api/tests/Unit/Accounts/DeletionLedgerFileTest.php` | S (el registro, `UserPurge`, `DeletedAccount`, `PopulatedAccount`) y A (`AccountChanges::beginDeletion`) | el trabajo de purga, el pedido de supresión con sus dos rutas, el barrido y el comando de restauración |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 y T002 integrados. Todos parten de ahí.
- **S1:** T003 a T008 integrados: el esquema, el registro, la purga por lotes, el núcleo de cuentas y el pedido de supresión del núcleo. L y T015 parten de ahí. I, X (T014) y el resto de A no esperan a S1.
- **S2:** T009 a T019 integrados. El coordinador cierra (T020 a T025).

**Líneas de integración** (las pone el coordinador al integrar; ningún dueño toca esos archivos):

| Cuándo | Archivo | Línea |
| --- | --- | --- |
| S0 (T002) | `backend/api/bootstrap/app.php` | El alias `'account.admin' => EnsureUserIsAdmin::class`, el grupo `$middleware->group('admin', ['account.active', 'auth:web', 'account.expected', 'verified', 'account.admin', 'throttle:admin'])` y los cuatro archivos nuevos en `withRouting(api: [...])` |
| S0 (T002) | `backend/api/app/Auth/Limiters.php` | `RateLimiter::for('admin', …)` (120 por minuto por usuario) y `RateLimiter::for('export', …)` (3 por día por usuario) |
| S2 (T020) | `backend/api/routes/console.php` | Las cuatro tareas nuevas del `scheduler` |
| S2 (T021) | `backend/api/tests/Feature/{RouteAccessTest,ExpectedAccountMatrixTest}.php` | El reemplazo de `{user}` y `{invitation}` por `1`, y las rutas de C3b en la lista de las que modifican |

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **B2** ya entregó el evento `App\Auth\Events\AccountRestricted` con `AccountRestriction` (`Disabled`, `Demoted` y `Deleting`) y su listener, `CancelRunsOfRestrictedAccount`, que implementa `ShouldHandleEventsAfterCommit` y lee `users.status` ya confirmado. C3b lo dispara y no lo crea. El cableado (`Event::listen(AccountRestricted::class, CancelRunsOfRestrictedAccount::class)` en `AppServiceProvider`) es la tarea T018 de B2: T001 comprueba que esté, y T022 lo prueba de punta a punta. B2 también deja `ActiveRuns::cancelAllOf`, que la purga llama.
- **D1a** (planificado, rama `spec/d1-progreso`) declara sus diez tablas para `UserData` en su `data-model.md`, sección 7, y C3b ya las toma en `UserTables`. Cuando D1a se implemente: suma su sección `progress` en `UserExport` (con `ProgressSnapshotReader::areas(userId, null)` dentro de una transacción corta de lectura), retira `ExerciseProgressSection`, sube `format` a `taller-export-2` (la clave `exerciseProgress` desaparece), agrega sus tablas a `PopulatedAccount` y migra en el bloque `2026_10_06_100001` a `100099`. **D1b** declara `progress_imports` y `campaign_seals` y suma `imports`. D1a afirma que `UserIdForeignKeyTest` sigue en verde, pero `workshop_observations` y `workshop_step_marks` no declaran una clave directa hacia `users`: R11 de la investigación lo resuelve en C3b con la lista de excepciones, y D1a lo confirma.
- **C3c** (spec 011, sin plan) completa los tres sitios del 503 y los dos puntos de aviso (contracts/http.md, «Para los ítems que se apoyan en C3b»).
- **C4** (rama `spec/c4-exposicion`) usa `account_deletions` y `taller:reapply-deletions` para el respaldo y su restauración: el formato de la copia es el de [contracts/console.md](./contracts/console.md). Su borrador atribuye `worker-mail` y el usuario `mail` a C3b: son de C3c.
- **`docker/compose.yaml`, `docker/mysql/db-grants.sql` y `init-env.sh`** no cambian: C3b no suma servicios, secretos ni privilegios.
- **Timestamps de migraciones.** C3b usa `2026_10_05_400001` a `400099`; se propone `2026_10_05_500001` a `500099` para C3c.
- **El front** no toca `backend/api/`: F11 (exportar y borrar la cuenta) y F12 se apoyan en [contracts/http.md](./contracts/http.md).

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md` y la constitución;
  - la spec, [contracts/http.md](./contracts/http.md), [contracts/console.md](./contracts/console.md), [data-model.md](./data-model.md), [research.md](./research.md) y tu sección;
  - las skills `tdd`, `laravel-tdd`, `laravel-security`, `laravel-specialist` y `php-pro`. Mandan el ADR y las decisiones del usuario: de las skills no se toman `Gate::before`, policies por modelo, notificaciones que releen el modelo ni la meta de cobertura (research.md, R2).
- **TDD, siempre.**
  - Escribí las pruebas de tu paso y comprobá que fallan por la razón que dice el plan. Recién entonces implementá.
  - Si una prueba de C3a o de B2 falla, el error está en el código nuevo: su valor esperado no se toca (salvo las que este plan dice que cambian, en T002, T003 y T020 a T022).
  - Un esperado sale del contrato, de la consigna o de un ejemplo resuelto aparte; nunca del código que probás.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos.** En cada terminal: `export COMPOSE_PROJECT_NAME=taller-c3b-<dueño>`, y un `.env` con `sh backend/api/scripts/init-env.sh`. Después:
  - `npm run api:test -- --filter=<Prueba>`, `npm run api:test -- --testsuite=Unit` y `--testsuite=Concurrency`;
  - `npm run api:analyse` (nivel 9, sin baseline: tu código tiene que dar 0 errores);
  - `npm run api:format:check`;
  - `npm run api:test:down`.

  Sólo el coordinador levanta el stack (`docker compose up`), con su propio `COMPOSE_PROJECT_NAME` y `TALLER_PORT`. Las imágenes y la caché están en la máquina: si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo.**
  - Código y pruebas en inglés. Los mensajes de la API salen de `lang/es`; los de la consola, literales en español.
  - **Comentarios: no.** Sólo en lo que lo exija su complejidad o para una referencia puntual (un ADR, un bug); el código se explica solo.
  - Sin `declare(strict_types=1)`, sin sintaxis posterior a PHP 8.3, sin `@phpstan-ignore` ni baseline. Los modismos del nivel 9 están en research.md, R12.
  - Los arreglos se transforman con Collections y `Arr::`; una `list<…>` tipada se arma con `foreach`.
  - Los datos de un pedido pasan de `FormRequest` a un registro `readonly` antes de salir del controlador.
  - `role` y `status` los cambia sólo `AccountChanges`: nadie más asigna esas dos columnas.
  - Formato con Pint.
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva la prueba con lo que verifica. La evidencia de una tarea es su commit, y lo que midas va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Base (coordinador, onda 0)

**Cubre:** la línea de base y las piezas comunes que todos los dueños necesitan desde el primer día (FR-031, FR-050 y FR-055; FR-056 en lo que toca al código de error).

**Entrega:** el árbol de C3b parte de `master` con C3a y B2, con la suite en verde, los dos códigos de error, el grupo `admin`, los límites, la configuración y los cuatro archivos de rutas ya registrados.

### Tarea 0.1 · La línea de base (T001)

**Pasos:**

1. Traé `master` a la rama de trabajo (`git merge master`). Si `master` todavía no trae el PR #24 y el PR #22, integrá `feat/c3a-identidad` y después `feat/b2-ejecuciones`, en ese orden, y avisá.
2. Comprobá que existen, con las firmas que lee este plan: `app/Auth/{AccountSessions,Invitations,PasswordResetLinks,Email,InvitationToken,IssuedInvitation,Role,AccountStatus}.php`, `app/Http/{ApiCode,ApiError,ApiExceptions,CurrentAccount}.php`, `app/Http/Middleware/RequirePassword.php` (con `isConfirmed` y `markConfirmed`), `app/Auth/Events/{AccountRestricted,AccountRestriction}.php`, `app/Progress/{AccountLock,AccountGone,ProgressHead}.php`, `app/Runs/Execution/{ActiveRuns,CancelRunsOfRestrictedAccount}.php` (con `cancelAllOf(int): int`), `app/Database/WriteTransaction.php`, `app/Support/Iso8601.php`, `app/Runs/Record/Instant.php`, `tests/Support/{Browser,Parallel,RunWorld,RunInvariants}.php`, `tests/Feature/UserIdForeignKeyTest.php`, la suite `Concurrency` en `phpunit.xml` y `tests/Pest.php`, las migraciones `2026_10_05_3000NN` de B2 y que el `Dockerfile` de la API compile `pcntl` (B2), sin el cual el `Timeout` de un trabajo no se aplica. Si falta algo, pará y avisá: el plan no tiene camino sin B2.
3. Mirá si `app('events')->hasListeners(AccountRestricted::class)` es verdadero: el cableado del listener es la T018 de B2. Si no lo es, anotalo para T022.
4. Corré `npm run api:format:check`, `npm run api:analyse` y `npm run api:test`. El análisis tiene que dar 0 errores en el nivel 9, sin baseline. Anotá el número de pruebas y de aserciones, y cuántos casos tiene `ApiCode` (20 con B2; `ApiCodeTest` los cuenta).
5. Reservá el bloque de migraciones `2026_10_05_400001` a `400099` y avisá a quien planifica D1a (que reservó `2026_10_06_100001` a `100099`) y a C3c.

**Compuerta:** la suite en verde sobre la base y `git status` limpio.

### Tarea 0.2 · Las piezas comunes (T002)

Es del coordinador, o de un implementador bajo su revisión: son archivos que B2, D1a y C3c también tocan, y todos los dueños los necesitan desde S0.

- **Crea:** `backend/api/app/Http/MailUnavailable.php`, `backend/api/app/Http/Middleware/EnsureUserIsAdmin.php`, `backend/api/app/Admin/PageMeta.php`, `backend/api/routes/api/{admin-users,admin-invitations,export,deletion}.php` (cada uno con sólo `<?php`), `backend/api/tests/Unit/MailUnavailableTest.php`, `backend/api/tests/Unit/Admin/PageMetaTest.php` y `backend/api/tests/Feature/Admin/AdminGroupTest.php`.
- **Modifica:** `backend/api/app/Http/ApiCode.php`, `backend/api/lang/es/api.php`, `backend/api/tests/Unit/ApiCodeTest.php`, `backend/api/app/Auth/Limiters.php`, `backend/api/tests/Feature/Limits/LimitersTest.php`, `backend/api/config/queue.php`, `backend/api/config/taller.php`, `backend/api/tests/Feature/ConfigTest.php` y `backend/api/bootstrap/app.php`.
- **Entrega** (firmas de referencia):

```php
// ApiCode: dos casos nuevos, al final, con su estado y su mensaje de lang/es/api.php
case LastAdmin = 'last_admin';              // 409 · Tiene que quedar al menos un admin activo.
case MailUnavailable = 'mail_unavailable';  // 503 · El taller no puede mandar correos por ahora.

final class MailUnavailable extends HttpResponseException
{
    public function __construct();   // ApiError::of(ApiCode::MailUnavailable, headers: ['Retry-After' => '3600'])
}

final class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response;   // 403 forbidden si el rol no es Role::Admin
}

final readonly class PageMeta
{
    /** @return array{page: int, perPage: int, total: int, lastPage: int} */
    public static function of(LengthAwarePaginator $page): array;
}
```

```php
// Limiters::register()
RateLimiter::for('admin', fn (Request $request) => Limit::perMinute(120)->by(self::accountKey($request)));
RateLimiter::for('export', fn (Request $request) => Limit::perDay(3)->by(self::accountKey($request)));
// accountKey: 'user:'.$user->id si hay una cuenta (User), y 'network:'.NetworkKey::of($request->ip()) si no: sin un cast de mixed

// bootstrap/app.php: el alias, el grupo y los archivos de rutas
$middleware->alias(['account.admin' => EnsureUserIsAdmin::class /* , los de C3a */]);
$middleware->group('admin', ['account.active', 'auth:web', 'account.expected', 'verified', 'account.admin', 'throttle:admin']);
// withRouting(api: [... los de C3a y B2, y routes/api/admin-users.php, admin-invitations.php, export.php y deletion.php])

// config/queue.php: connections.database.after_commit = true y retry_after = 330 (más que el Timeout de 300 s de PurgeUserData; la conexión `runs` de B2 sigue en false y en 140)
// config/taller.php: 'ledger_days' => 35, 'purge' => ['batch_size' => 500, 'stuck_minutes' => 15], 'export' => ['chunk' => 100]
```

**Pasos:**

1. Las pruebas, que fallan porque las piezas no existen:
   - **`ApiCodeTest`**: la cuenta de casos sube en 2 respecto de la base, y `last_admin` es 409 con «Tiene que quedar al menos un admin activo.», `mail_unavailable` es 503 con «El taller no puede mandar correos por ahora.».
   - **`MailUnavailableTest`**: lanzar `new MailUnavailable` y renderizarlo da 503, el cuerpo `{message, code}` con `mail_unavailable` y `Retry-After: 3600`.
   - **`PageMetaTest`**: 140 elementos, 25 por página, página 2 dan `{page: 2, perPage: 25, total: 140, lastPage: 6}`; una lista vacía da `{page: 1, perPage: 25, total: 0, lastPage: 1}`.
   - **`AdminGroupTest`**: la prueba registra una ruta de sonda `Route::middleware('admin')->get('api/_probe/admin', …)` (y una `post`). Sin sesión, 401; un estudiante verificado, 403 `forbidden`; un estudiante con el email sin verificar, 403 `email_unverified` (antes que `forbidden`); un admin, 200; un admin que modifica sin `X-Taller-User`, 409 `account_mismatch`; una cuenta `disabled` con la sesión viva, 403 `account_disabled`; y el pedido 121 de un minuto del mismo admin, 429 con `Retry-After`.
   - **`LimitersTest`**: `RateLimiter::limiter('admin')` y `('export')` existen; con `export`, el cuarto pedido del mismo día queda sin intentos.
   - **`ConfigTest`**: `queue.connections.database.after_commit` es verdadero y `retry_after` vale 330 (mayor que el `Timeout` del trabajo de purga), y en `runs` siguen en falso y 140; `taller.ledger_days` vale 35, `taller.purge.batch_size` 500, `taller.purge.stuck_minutes` 15 y `taller.export.chunk` 100.
2. Implementá las piezas y los cuatro archivos de rutas vacíos. `EnsureUserIsAdmin` responde con `ApiError::of(ApiCode::Forbidden)`.
3. `npm run api:analyse`: 0 errores en el nivel 9.

**Compuerta:** las pruebas en verde y la suite entera en verde. Una ruta sin el grupo `admin` no existe todavía: los cuatro archivos están vacíos.

## 1. Esquema y registro (dueño S, onda 1)

**Cubre:** FR-042, FR-047 y FR-054 (la parte de `DELETE FROM users`); las tablas que usan FR-044 a FR-048.

**Entrega:** al llegar S1, la tabla del libro con su modelo, el registro `UserData` con su prueba de cobertura, la purga por lotes y la cuenta poblada de pruebas.

### Tarea 1.1 · Las pruebas de esquema, antes de la migración (T003)

- **Crea:** `backend/api/tests/Feature/AccountDeletionsSchemaTest.php`.
- **Modifica:** `backend/api/tests/Feature/UserIdForeignKeyTest.php` y `backend/api/tests/Content/MigrationsTest.php`.
- **Entrega:** las pruebas A a F de [data-model.md](./data-model.md), «Qué prueba el esquema».

**Pasos:**

1. Escribí `AccountDeletionsSchemaTest` (pruebas A a D) con las expectativas de §5.2 y de data-model.md, leídas de `information_schema` sin mirar la migración: tres columnas (`user_id` `bigint unsigned`, `user_created_at` y `deleted_at` `datetime(3)`, todas `NOT NULL`), InnoDB, ninguna `TIMESTAMP`, clave primaria `(user_id)`, el índice `account_deletions_deleted_at_index` y ninguna clave foránea desde ni hacia la tabla.
2. En `UserIdForeignKeyTest` (prueba E), sumá una constante aparte, `USER_ID_WITHOUT_USERS_FOREIGN_KEY`, con las tres tablas y su motivo (research.md, R11): `account_deletions`, `workshop_observations` y `workshop_step_marks`. La primera prueba resta esas tablas de las que le faltan; una segunda prueba exige que `workshop_observations` y `workshop_step_marks`, **si existen**, tengan una clave foránea compuesta en cascada hacia `workshop_progress`, y que `account_deletions`, si existe, no tenga ninguna. No toques `REFERENCE_USERS_WITHOUT_USER_ID`: alimenta la segunda prueba de C3a.
3. En `MigrationsTest`, después de deshacer, `account_deletions` no existe; al migrar de nuevo, el `SHOW CREATE TABLE` de la tabla queda igual (prueba F). El `--step` ya sale de contar los archivos de `database/migrations/`: comprobá que sigue cubriendo la migración nueva.
4. Corré las tres: A a D y F fallan por «la tabla `account_deletions` no existe», que es la razón esperada, y el resto sigue en verde. La prueba E pasa ahora (todavía no hay tabla) y es la que atrapa a T004: sin su lista, la primera prueba de `UserIdForeignKeyTest` fallaría al existir `account_deletions`.

**Compuerta:** las pruebas fallan por esa razón y la suite sigue en verde.

### Tarea 1.2 · La migración y el modelo del libro (T004)

- **Crea:** `backend/api/database/migrations/2026_10_05_400001_create_account_deletions_table.php`, `backend/api/app/Models/DeletedAccount.php` y `backend/api/tests/Feature/DeletedAccountTest.php`.

**Pasos:**

1. `DeletedAccountTest`, que falla porque el modelo no existe:
   - una fila con `deleted_at` de hace 36 días la borra `model:prune --model=App\Models\DeletedAccount`, y una de hace 34 días queda;
   - `insertOrIgnore` dos veces del mismo `user_id` deja una fila, y la primera conserva sus valores;
   - el modelo guarda y devuelve `user_created_at` con milisegundos (`2026-10-05 12:00:00.123`).
2. Escribí `up()` con el `CREATE TABLE` de data-model.md, sección 1, en un único `DB::statement`, con el mismo encabezado de una línea que las de C3a y B2 («One CREATE TABLE … Source of truth: specs/010-c3b-admin-ciclo-de-vida/data-model.md»). `down()` es `Schema::dropIfExists`. `DeletedAccount` sigue data-model.md, «Modelos de Eloquent».
3. Corré las pruebas de 1.1 y la nueva: pasan. Corré `npm run api:test` entero y `npm run api:analyse`.

**Compuerta:** `AccountDeletionsSchemaTest`, `UserIdForeignKeyTest`, `MigrationsTest` y `DeletedAccountTest` en verde, y la suite entera en verde.

### Tarea 1.3 · El registro `UserData` y su prueba de cobertura (T005)

- **Crea:** `backend/api/app/Accounts/{Ownership,UserTable,UserTables,UserData}.php`, `backend/api/tests/Support/UserDataCoverage.php`, `backend/api/tests/Feature/UserDataCoverageTest.php`, `backend/api/tests/Content/UserDataCoverageProbeTest.php` y `backend/api/tests/Unit/Accounts/UserTablesTest.php`.
- **Entrega** (firmas de referencia):

```php
namespace App\Accounts;

enum Ownership: string { case UserId = 'user_id'; case Child = 'child'; case ByEmail = 'email'; case Ledger = 'ledger'; }

final readonly class UserTable
{
    public static function owned(string $name, ?string $export, ?string $excluded, ?string $batchesBy, ?string $note): self;
    public static function child(string $name, string $of, ?string $export, ?string $excluded, string $note): self;
    public static function exception(string $name, Ownership $ownership, string $reason): self;
    // `export` es la clave de la sección; `excluded`, el motivo de no exportarla (uno de los dos). `batchesBy` es el ORDER BY de la purga por lotes
}

final class UserTables
{
    /** @return list<UserTable> las 20 tablas de data-model.md, sección 2, en este orden */
    public static function all(): array;
}

final class UserData
{
    public function __construct(private ?array $tables = null);   // por omisión, UserTables::all()
    /** @return list<UserTable> */
    public function tables(): array;
    /** @return list<UserTable> las que se purgan por lotes, en el orden de D06: runs, exercise_progress, attempts, sync_operations */
    public function batchTables(): array;
    /** @return list<string> el vocabulario de las secciones del contrato de exportación: account, exerciseProgress, attempts, progress e imports */
    public function exportKeys(): array;
}
```

**Pasos:**

1. Las pruebas, que fallan porque las clases no existen:
   - **`UserTablesTest`** (sin base): `UserTables::all()` tiene 20 filas con nombres distintos; las cuatro excepciones (`sessions`, `invitations`, `password_reset_tokens` y `account_deletions`) tienen un motivo no vacío; `batchTables()` da, en este orden, `runs` (por `id`), `exercise_progress` (por `exercise_id`), `attempts` (por `id`) y `sync_operations` (por `operation_id`); toda hija nombra un padre declarado (`attempt_tests` y `attempt_payloads` de `attempts`; `workshop_observations` y `workshop_step_marks` de `workshop_progress`); `exportKeys()` es `account`, `exerciseProgress`, `attempts`, `progress` y `imports`, sin repetidas.
   - **`UserDataCoverageTest`** (Feature): con la ayuda de `UserDataCoverage::undeclared()`, que calcula desde `information_schema` el conjunto de tablas de la cuenta (las que tienen una columna `user_id` y, repitiendo hasta que no sume ninguna, las que tienen una clave foránea hacia una tabla ya del conjunto) y devuelve las que `UserData::tables()` no declara, exige que el resultado sea `[]`. Además exige que cada fila declarada que **exista** en el esquema tenga su exportación (o su motivo) y su supresión (un lote o su nota).
   - **`UserDataCoverageProbeTest`** (suite `Content`, porque el DDL confirma su transacción): crea `zz_coverage_probe (user_id BIGINT UNSIGNED NOT NULL)`, comprueba que `UserDataCoverage::undeclared()` da `['zz_coverage_probe']` (la prueba falla y nombra la tabla, escenario 8 de la historia 3), la borra en un `finally` y comprueba que vuelve a dar `[]`. Una hija sin declarar (`zz_coverage_child` con una clave foránea hacia `attempts`) también se detecta.
2. Implementá el registro con las 20 filas de data-model.md, sección 2: las de C3a, B2 y D1a, **declaradas por nombre, existan o no**. `exerciseProgress` es la sección provisoria de `exercise_progress` hasta que D1a entregue `progress`.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. `UserDataCoverageTest` pasa con el esquema de hoy (C3a, B2 y la tabla del libro) y fallaría con una tabla con `user_id` sin declarar.

### Tarea 1.4 · La purga por lotes y la cuenta poblada (T006)

- **Crea:** `backend/api/app/Accounts/UserPurge.php`, `backend/api/tests/Support/PopulatedAccount.php`, `backend/api/tests/Feature/Accounts/UserPurgeTest.php` y `backend/api/tests/Feature/Accounts/PopulatedAccountTest.php`.
- **Entrega** (firmas de referencia):

```php
final class UserPurge
{
    public function __construct(private UserData $data);
    /** Borra las filas de la cuenta de cada tabla por lotes declarada que exista, en orden; cada sentencia es su propia transacción corta. @return int filas borradas por las sentencias (no cuenta las cascadas) */
    public function inBatches(int $userId): int;
}

final class PopulatedAccount   // en tests/Support
{
    /** Una cuenta con una fila en cada tabla declarada que exista (Ownership::UserId y Child), más una invitación que creó y su token de recuperación. @param array<string, mixed> $state */
    public static function create(array $state = []): User;
}
```

**Pasos:**

1. Las pruebas, que fallan porque las clases no existen:
   - **`PopulatedAccountTest`**: para cada fila declarada que exista con `Ownership::UserId` o `Child`, la cuenta tiene al menos una fila (directa o por su padre); `sessions`, `progress_heads`, `runs`, `exercise_progress`, `attempts`, `attempt_tests` y `attempt_payloads` figuran con una fila; y falla si el registro declara una tabla existente que `create()` no pobló (así, un ítem que crea una tabla y no la agrega acá rompe la prueba).
   - **`UserPurgeTest`**: con `taller.purge.batch_size` fijado en 2 y una cuenta con 5 `runs`, 3 filas de `exercise_progress` y 5 `attempts` (con sus pruebas y su payload), más otra cuenta poblada, `inBatches` devuelve 13 (con las tablas de B2: 5 + 3 + 5; D1a lo ajusta al sumar `sync_operations`), borra sólo las filas de la primera cuenta y deja las de la segunda; las sentencias salen en el orden `runs`, `exercise_progress`, `attempts`, cada una con `ORDER BY` y `LIMIT 2` (se leen con `DB::listen`); las hijas de `attempts` desaparecen por la cascada; una segunda corrida devuelve 0; con una tabla declarada que no existe (un `UserData` armado en la prueba con `zz_missing`) no falla.
   - **`DELETE FROM users` poblado** (FR-054), en el mismo archivo: con `PopulatedAccount::create()` y sin purgar antes, `DELETE FROM users WHERE id = ?` no da error de clave foránea y, después, ninguna tabla declarada que exista guarda una fila con ese `user_id` (ni, por su padre, una hija): la red de seguridad de C3a anda con las tablas de B2.
2. Implementá `UserPurge`: `DB::delete('delete from `{tabla}` where `user_id` = ? order by {clave} limit {n}', …)` repetido hasta que una sentencia afecta menos de `n` filas, con `n = taller.purge.batch_size`. `PopulatedAccount` usa `RunWorld::exercise`, `RunWorld::user` y `RunWorld::run` de B2 para el contenido y `runs`, y `AccountLock::within` para `progress_heads`; las demás filas las inserta con las columnas obligatorias del DDL de B2 (`data-model.md` de B2, sección 1).
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde, y la suite entera en verde. `PopulatedAccount` es lo que D1a extiende con sus diez tablas.

## 2. Administración de cuentas (dueño A, onda 1)

**Cubre:** FR-031 a FR-036, FR-040 y FR-041 (la parte de usuarios), FR-044 (el pedido de supresión) y FR-053.

**Entrega:** el núcleo de cuentas (la guardia, el cambio y el pedido de supresión), que L usa, y los cuatro endpoints de usuarios.

### Tarea 2.1 · La guardia y el cambio de rol o de estado (T007)

- **Crea:** `backend/api/app/Admin/{LastAdminGuard,LockedTarget,AccountChanges,LastAdmin,RestrictsItself,AccountBeingDeleted}.php`, `backend/api/tests/Feature/Admin/{LastAdminGuardTest,AccountChangesTest}.php` y `backend/api/tests/Concurrency/LastAdminRaceTest.php`.
- **Entrega** (firmas de referencia):

```php
namespace App\Admin;

final readonly class LockedTarget { public function __construct(public User $user, public int $otherActiveAdmins) {} }

final class LastAdminGuard
{
    /** Dentro de una WriteTransaction: bloquea los admins activos (índice (role, status)) y después el destino. @throws ModelNotFoundException */
    public function lock(int $targetId): LockedTarget;
}

final class AccountChanges
{
    public function __construct(private LastAdminGuard $guard, private AccountSessions $sessions);
    /** @throws RestrictsItself @throws ModelNotFoundException @throws AccountBeingDeleted @throws LastAdmin */
    public function change(User $actor, int $targetId, ?Role $role, ?AccountStatus $status): User;
    /** T008 */
    public function beginDeletion(int $targetId, bool $guardLastAdmin = true): User;
}
// LastAdmin, RestrictsItself y AccountBeingDeleted son excepciones de dominio sin cuerpo: las traduce el controlador (como EmailTaken en C3a)
```

**Pasos:**

1. Las pruebas, que fallan porque las clases no existen. Los esperados salen de la spec (FR-033 a FR-035) y de `contracts/http.md`.
   - **`LastAdminGuardTest`**: con un solo admin activo A, `lock(A)` da `otherActiveAdmins` 0; con A y B activos, 1; con A y B activos y C admin deshabilitado, sigue en 1 (C no cuenta); un estudiante activo no cuenta; `lock(999999)` lanza `ModelNotFoundException`. Con `DB::listen`, las dos sentencias llevan `for update` y la primera lee `role = 'admin' and status = 'active'`.
   - **`AccountChangesTest`**, una fila por caso:

| Caso | Llamada | Esperado |
| --- | --- | --- |
| A y B admins activos | `change(A, B, null, Disabled)` | B queda `disabled`; se borran su token de recuperación y las invitaciones que B creó; evento `Disabled` |
| A activo; B admin deshabilitado, actor | `change(B, A, null, Disabled)` | `LastAdmin`; no cambia nada; ningún evento |
| A único admin | `change(A, A, null, Disabled)` | `RestrictsItself`, **sin ninguna consulta** (`DB::getQueryLog()` vacío) |
| A único admin | `change(A, A, Student, null)` | `RestrictsItself` |
| A y B activos | `change(A, B, Student, null)` | B queda `student`; se borran las invitaciones de B; evento `Demoted`, ningún `Disabled`; el token de recuperación de B sigue |
| A activo; S estudiante | `change(A, S, Admin, null)` | S queda `admin`; su `remember_token` cambia; ningún evento |
| A activo; S deshabilitado | `change(A, S, null, Active)` | S queda `active`; ningún evento; no borra nada |
| A activo; S con dos filas de `sessions` | `change(A, S, null, Disabled)` | las dos filas de `sessions` siguen (no se borran) |
| A activo; S en `deleting` | `change(A, S, null, Disabled)` | `AccountBeingDeleted` |
| A activo; S sin cambios | `change(A, S, Student, Active)` | devuelve S, **cero escrituras** (ninguna sentencia `update`, `insert` ni `delete`) y ningún evento |
| A activo | `change(A, 999999, null, Disabled)` | `ModelNotFoundException` |

   - **Los eventos:** una prueba registra un listener real de `AccountRestricted` (sin `Event::fake`) que anota el id, la restricción y `DB::transactionLevel()`: el nivel es el de afuera de la transacción del cambio, no el de adentro. Una promoción y una rehabilitación no disparan nada, y las otras pruebas usan `Event::fake([AccountRestricted::class])` para decir qué se dispara.
   - **`LastAdminRaceTest`** (suite `Concurrency`, `Parallel::run`): 20 veces, dos admins A y B activos y dos tareas a la vez: `change(A, B, null, Disabled)` y `change(B, A, null, Disabled)`. En cada corrida, queda al menos un admin activo y los resultados son exactamente un éxito y un `LastAdmin` (SC-005).
2. Implementá en cinco pasos con nombre, uno por regla de research.md, R3: (1) el 422 propio, antes de tocar la base; (2) `WriteTransaction::run` con `lock`; (3) el destino en `deleting`; (4) lo que no cambia; (5) la guardia y los efectos de FR-035 (`DELETE FROM invitations WHERE invited_by = ?`, `DELETE FROM password_reset_tokens WHERE email = ?`, `setRememberToken(Str::random(60))`). Los eventos se disparan **después** de que `run` devuelve.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde, también en orden aleatorio, y la carrera dando 20 de 20.

### Tarea 2.2 · El pedido de supresión del núcleo (T008)

- **Crea:** `backend/api/tests/Feature/Admin/{AccountBeginDeletionTest,LastAdminMatrixTest}.php`.
- **Modifica:** `backend/api/app/Admin/AccountChanges.php` (el método `beginDeletion`).

**Pasos:**

1. Las pruebas, que fallan porque `beginDeletion` no existe:
   - **`AccountBeginDeletionTest`**: un estudiante S activo con dos sesiones, un token de recuperación, una invitación pendiente dirigida a su email y un `remember_token`: después de `beginDeletion(S)`, S está en `deleting`, sus filas de `sessions` son 0, su `remember_token` cambió, la invitación a su email y el token de recuperación ya no están, y se disparó `AccountRestricted(S, Deleting)` después de confirmar. Un admin con dos invitaciones creadas: se borran. **Idempotente:** sobre una cuenta que ya está en `deleting` devuelve la cuenta sin una sola escritura (no toca `updated_at`, que es lo que mide el barrido) y sin evento. Con un solo admin activo, `beginDeletion(A)` lanza `LastAdmin` y no cambia nada; con `guardLastAdmin: false` procede. Un id inexistente lanza `ModelNotFoundException`.
   - **`LastAdminMatrixTest`** (SC-005): la matriz deshabilitar, degradar y suprimir, contra otro admin y contra sí mismo, con un solo admin y con dos, llamando a `change` y a `beginDeletion`; después de cada camino permitido, la cantidad de admins activos es al menos 1, y cada camino que dejaría 0 lanza `LastAdmin` o `RestrictsItself`.
2. Implementá `beginDeletion` en la misma transacción corta: `lock`, la guardia si corresponde, `status = 'deleting'` por la vía de `forceFill`, `AccountSessions::endAll` (borra las sesiones y rota el token de «recordarme»), las dos bajas de invitaciones (las que creó si es admin y las de su email) y la del token de recuperación. El evento sale después.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. Con esto llega S1 desde el lado de A.

### Tarea 2.3 · El listado y la ficha de usuarios (T009)

- **Crea:** `backend/api/app/Admin/{UserDirectory,UserFilters,PublishedAdminUser}.php`, `backend/api/app/Http/Controllers/Admin/UserController.php`, `backend/api/app/Http/Requests/Admin/ListUsersRequest.php`, `backend/api/lang/es/admin.php`, `backend/api/tests/Feature/Admin/{UsersListTest,UserShowTest}.php` y `backend/api/tests/Unit/Admin/PublishedAdminUserTest.php`.
- **Modifica:** `backend/api/routes/api/admin-users.php` (las dos rutas de lectura).
- **Entrega** (firmas de referencia):

```php
final readonly class UserFilters { public function __construct(public int $page, public int $perPage, public ?string $q, public ?Role $role, public ?AccountStatus $status, public string $sort) {} }

final class UserDirectory
{
    /** @return LengthAwarePaginator<int, User> */
    public function page(UserFilters $filters): LengthAwarePaginator;
    /** @throws ModelNotFoundException */
    public function find(int $id): User;
}

final readonly class PublishedAdminUser
{
    public static function from(User $user): self;
    /** @return array{id: int, name: string, email: string, role: string, status: string, emailVerified: bool, privacyVersion: string|null, createdAt: string, updatedAt: string} */
    public function toPublished(): array;
}
```

**Pasos:**

1. Las pruebas, que fallan porque no existen. Con estas cuentas, creadas por la fábrica (el esperado sale de acá y no del código):

| Nombre | Email | Rol | Estado |
| --- | --- | --- | --- |
| Ana Pérez | `ana@x.com` | `student` | `active` |
| Beto Ruiz | `beto@x.com` | `student` | `disabled` |
| Carla Gómez | `carla@x.com` | `admin` | `active` |
| Diego Ana | `diego@y.com` | `student` | `active` |
| Eva Lúa | `eva@z.com` | `student` | `deleting` |
| Fede Mora | `fede@x.com` | `admin` | `disabled` |
| Gala Sosa | `gala@x.com` | `student` | `active`, sin verificar |

   - **`UsersListTest`**: con `perPage=3`, la página 2 trae a Diego, Eva y Fede (con el orden `name` por omisión) y `meta` es `{page: 2, perPage: 3, total: 7, lastPage: 3}`; la página 4 da `data: []` con el mismo `lastPage`. Sin `perPage` rige 25; `perPage=101` y `perPage=0` dan 422. `q=ana` encuentra a Ana Pérez y a Diego Ana (por el nombre), `q=PÉREZ` y `q=perez` encuentran a Ana (la colación del nombre no distingue mayúsculas ni acentos), `q=y.com` encuentra a Diego (por el email) y `q=%` no encuentra a nadie (el `%` es literal). `role=admin&status=active` da sólo a Carla; `status=deleting`, sólo a Eva. `sort=-name` invierte `sort=name`, `sort=email` ordena por email y un `sort` inválido da 422 con `errors.sort`. Un estudiante recibe 403 y sin sesión 401 (la matriz completa es de T021).
   - **`UserShowTest`**: la ficha de Ana trae **exactamente** las nueve claves de `AdminUser`, en ese orden, con `emailVerified: true` y `privacyVersion` `null` o el de la cuenta; la de Gala trae `emailVerified: false`; ninguna trae `password`, `rememberToken` ni `remember_token`. Un id inexistente da 404 `not_found`; `abc` en lugar del id, 404 `not_found` (la ruta no coincide).
   - **`PublishedAdminUserTest`** (sin base): las nueve claves, el rol y el estado como texto, y los instantes en ISO 8601 UTC con `Z`.
2. Implementá. `UserDirectory::page` arma la consulta con los filtros, escapa `%` y `_` de `q` y desempata por `id`. `ListUsersRequest` valida y pasa un `UserFilters`. Las dos rutas van en `routes/api/admin-users.php` bajo `Route::middleware('admin')->prefix('admin')`, con `->whereNumber('user')` en la ficha. El listado responde `{data, meta}` con `PageMeta::of`.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

### Tarea 2.4 · Cambiar el rol o el estado por HTTP (T010)

- **Crea:** `backend/api/app/Http/Requests/Admin/UpdateUserRequest.php` y `backend/api/tests/Feature/Admin/UserUpdateTest.php`.
- **Modifica:** `backend/api/app/Http/Controllers/Admin/UserController.php` (`update`) y `backend/api/routes/api/admin-users.php`.

**Pasos:**

1. `UserUpdateTest`, que falla porque la ruta no existe (con `Browser`; el esperado sale de [contracts/http.md](./contracts/http.md)):
   - **El orden de las respuestas:** sin la contraseña reconfirmada, 423, también con un id inexistente; confirmada, un id inexistente da 404.
   - **Validación (422):** `{}` da 422 con «Indicá el rol o el estado.»; `{status: "deleting"}` y `{role: "root"}` dan 422; `{email: "otra@x.com"}` solo da 422 (no hay nada que cambiar); un admin que se deshabilita (`errors.status`) o se degrada (`errors.role`) a sí mismo da 422; una cuenta en `deleting` como destino da 422.
   - **Éxito (200):** `{role: "student", email: "otra@x.com", name: "X", user_id: 99}` cambia **sólo** el rol: el email, el nombre y el id no cambian; la respuesta es `{data: AdminUser}` con el rol nuevo. Pedir lo que la cuenta ya tiene da 200.
   - **Lo que se ve después (FR-035):** una cuenta deshabilitada con la sesión viva recibe 403 `account_disabled` en su siguiente pedido (con otro `Browser` ya autenticado) y su token de recuperación ya no está; un estudiante promovido recibe 200 en su siguiente pedido a `/api/admin/users` y su `remember_token` cambió; un admin degradado recibe 403 `forbidden`.
   - **Registros:** `Log::spy()`: sale `admin.account_changed` con `target_id` y los `from` y `to`, y ninguna línea contiene el email.
2. Implementá `update`: `UpdateUserRequest` valida y arma un registro `readonly`; el controlador llama a `AccountChanges::change` y traduce `RestrictsItself`, `AccountBeingDeleted` (422, con mensajes de `lang/es/admin.php`) y `LastAdmin` (409 `last_admin`); `ModelNotFoundException` ya sale 404. La ruta lleva `->middleware('password.confirm')`.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

### Tarea 2.5 · La recuperación de un tercero, sin correo (T011)

- **Crea:** `backend/api/tests/Feature/Admin/PasswordResetHookTest.php`.
- **Modifica:** `backend/api/app/Http/Controllers/Admin/UserController.php` (`passwordReset`) y `backend/api/routes/api/admin-users.php`.

**Pasos:**

1. `PasswordResetHookTest`, que falla porque la ruta no existe:
   - sin la contraseña reconfirmada, 423 (aun con un id inexistente); confirmada, un id inexistente da 404;
   - un destino admin da 422 con `errors.user`, y uno deshabilitado o en `deleting`, 422: los dos **antes** del 503;
   - un estudiante activo da 503 `mail_unavailable` con `Retry-After: 3600`;
   - en el 503 **no se emitió ningún token** (`password_reset_tokens` tiene las mismas filas antes y después) y no se encoló nada (`Queue::fake()` y `Queue::assertNothingPushed()`);
   - `Log::spy()`: sale `admin.password_reset_refused` con `target_id` y `reason`, sin email.
2. Implementá `passwordReset` con las comprobaciones en ese orden y, por último, `throw new MailUnavailable`. La ruta lleva `->middleware('password.confirm')`. No hay otra rama: C3c la completa.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. Con esto A cierra la onda 1.

## 3. Invitaciones de admin (dueño I, onda 1)

**Cubre:** FR-037 a FR-040 (la parte de invitaciones) y FR-056 (el 503 de la entrega por correo).

**Entrega:** `AdminInvitations` y los cuatro endpoints de invitaciones.

### Tarea 3.1 · `AdminInvitations` (T012)

- **Crea:** `backend/api/app/Admin/{AdminInvitations,InviteOutcome,InviteResult,PublishedInvitation}.php`, `backend/api/lang/es/invitations.php`, `backend/api/tests/Feature/Admin/AdminInvitationsTest.php` y `backend/api/tests/Concurrency/InviteRaceTest.php`.
- **Entrega** (firmas de referencia):

```php
namespace App\Admin;

enum InviteOutcome: string { case Created = 'created'; case Renewed = 'renewed'; case UserExists = 'user_exists'; case Pending = 'invitation_pending'; }

final readonly class InviteResult { public function __construct(public string $email, public InviteOutcome $outcome, public ?IssuedInvitation $issued) {} }

final class AdminInvitations
{
    /** Su propia WriteTransaction por email. Reutiliza InvitationToken y IssuedInvitation de C3a. */
    public function invite(string $email, Role $role, int $adminId): InviteResult;
    public function resend(Invitation $invitation): IssuedInvitation;
    public function revoke(Invitation $invitation): void;
    /** @throws ModelNotFoundException */
    public function find(int $id): Invitation;
}

final readonly class PublishedInvitation
{
    public static function from(Invitation $invitation, ?User $inviter): self;
    /** @return array{id: int, email: string, role: string, delivery: string, expiresAt: string, expired: bool, sentAt: string|null, sendFailedAt: string|null, invitedBy: array{id: int, name: string}|null, createdAt: string} */
    public function toPublished(): array;
}
```

**Pasos:**

1. Las pruebas, que fallan porque no existen (relojes fijados con `Carbon::setTestNow`; el esperado del hash sale de `hash('sha256', $token)`, calculado en la prueba):
   - **Crear:** `invite('beto@x.com', Student, A)` da `Created`; el token tiene 43 caracteres base64url; `expires_at` es de 7 días desde ahora (48 horas con `Admin`); `invited_by` es A; `delivery` es `link`; `token_hash` es el sha256 del token; `sent_at` y `send_failed_at` son `NULL`.
   - **Vigente:** repetirla antes del vencimiento da `Pending` y la fila queda igual (mismo `token_hash`, mismo `expires_at`).
   - **Vencida:** después de `travel(8)->days`, `invite('beto@x.com', Admin, A)` da `Renewed`, con otro token, otro `token_hash`, el rol `admin` y el vencimiento nuevo.
   - **Con cuenta:** `invite('ANA@X.com', …)` con una cuenta `ana@x.com` da `UserExists` (se canonicaliza); con una cuenta `papá@x.com`, invitar `papa@x.com` da `Created` (la colación del email distingue acentos, como en C3a).
   - **Reenviar:** `resend` cambia el token y el vencimiento (según el rol); el token anterior ya no pasa `Invitations::lookup` de C3a (`InvitationNotFound`); una invitación vencida también se reenvía; deja `delivery = link`, `sent_at` y `send_failed_at` en `NULL`, y no cambia `invited_by`.
   - **Revocar:** borra la fila; el token deja de servir.
   - **`InviteRaceTest`** (suite `Concurrency`): 10 veces, dos admins invitan al mismo email a la vez: un `Created` y un `Pending`, y una sola fila.
2. Implementá `invite` clasificando dentro de la transacción y creando o renovando con `InvitationToken::generate()` y `hash()`; ante `UniqueConstraintViolationException`, volvé a clasificar **una vez**. No uses `Invitations::issue` (research.md, R4).
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde, también en orden aleatorio.

### Tarea 3.2 · Los endpoints de invitaciones (T013)

- **Crea:** `backend/api/app/Http/Controllers/Admin/InvitationController.php`, `backend/api/app/Http/Requests/Admin/{InviteRequest,ListInvitationsRequest,ResendInvitationRequest}.php`, `backend/api/tests/Feature/Admin/{InvitationsEndpointTest,InvitationsListTest}.php`.
- **Modifica:** `backend/api/routes/api/admin-invitations.php`.

**Pasos:**

1. Las pruebas, que fallan porque las rutas no existen (con `Browser`; el esperado sale de [contracts/http.md](./contracts/http.md)):
   - **`InvitationsEndpointTest`, `POST /api/admin/invitations`:**
     - **El orden:** el lote vacío, uno de 101, un email inválido y uno repetido (`a@x.com` y `A@X.com`) dan 422 con `errors.emails` o `errors.emails.1`. Con `role: "admin"` sin la contraseña reconfirmada, 423, **sin crear nada**. Con `delivery: "email"` (y `role: "student"`), 503 `mail_unavailable` con `Retry-After: 3600`, sin crear nada. Con `role: "admin"` y `delivery: "email"` sin confirmar, 423 (antes que el 503).
     - **El éxito:** un lote de 3 emails con `delivery: "link"` da `created` ×3, cada uno con `expiresAt` y una `url` `…/#invitacion=<token>` de 43 caracteres que `POST /api/auth/invitations/lookup` de C3a acepta; los resultados salen en el orden del pedido; una cuenta existente da `user_exists` y una invitación vigente, `invitation_pending`, sin `url`; una vencida da `renewed` con su `url`.
     - **Los registros:** una línea `admin.invitation` por email, con `email_hmac` y sin el email.
   - **`resend`:** sin confirmar y con la invitación de un admin, 423; la de un alumno no lo pide; un id inexistente da 404 (y `abc`, 404); con `delivery: "email"`, 503; sin `delivery`, rota el token y devuelve `{data: {id, email, role, delivery, expiresAt, url}}`; el link anterior responde 404 `invitation_not_found` en la consulta de C3a.
   - **`DELETE /api/admin/invitations/{id}`:** 204, y la consulta de C3a con su link da 404; un id inexistente da 404; no pide la contraseña reconfirmada, ni siquiera para la de un admin.
   - **`InvitationsListTest`:** con cuatro invitaciones, (a) de admin vigente creada hace 1 día, (b) de alumno vigente creada ahora, (c) de admin vencida creada hace 10 días y (d) de alumno vencida creada hace 9, el orden es **a, b, d, c** (primero las de admin pendientes; después por `createdAt` descendente); `state=pending` da a y b; `state=expired`, d y c; `role=admin`, a y c; ninguna respuesta lleva `token`, `token_hash` ni el valor de un token (se busca el texto en el cuerpo); `invitedBy` es `{id, name}`, o `null` si salió de la consola. Con 3 de 7 por página, `meta` es `{page: 1, perPage: 3, total: 7, lastPage: 3}`.
2. Implementá el controlador: `store` valida, comprueba `RequirePassword::isConfirmed` si el rol es `admin`, lanza `MailUnavailable` si la entrega es `email` y recién entonces recorre los emails con `AdminInvitations::invite`; `resend` busca la invitación, comprueba la confirmación según **su** rol y el 503, y llama a `resend`; `destroy` revoca. Los emails se canonicalizan con `Email::canonical`. Las rutas van en `routes/api/admin-invitations.php` bajo `Route::middleware('admin')->prefix('admin')`, con `->whereNumber('invitation')`.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. Con esto I cierra la onda 1.

## 4. Exportación (dueño X, ondas 1 y 2)

**Cubre:** FR-042 (la exportación), FR-043 y FR-054 (la parte de la exportación).

**Entrega:** al llegar S2, `UserExport` con sus tres secciones y `POST /api/me/export`.

### Tarea 4.1 · Las secciones y `UserExport` (T014)

- **Crea:** `backend/api/app/Accounts/Export/{ExportSection,UserExport,AccountSection,ExerciseProgressSection,AttemptsSection,RowShape}.php`, `backend/api/tests/Unit/Accounts/Export/RowShapeTest.php`, `backend/api/tests/Feature/Accounts/{UserExportTest,AttemptsSectionTest}.php` y `backend/api/tests/Content/ExportTransactionTest.php`.
- **Entrega** (firmas de referencia):

```php
namespace App\Accounts\Export;

interface ExportSection
{
    public function key(): string;
    /** @return array<array-key, mixed>|Generator<int, array<string, mixed>> un objeto o una lista; las listas grandes son generadores */
    public function read(int $userId): array|Generator;
}

final class UserExport
{
    public function __construct(AccountSection $account, ExerciseProgressSection $progress, AttemptsSection $attempts);
    /** @return array<string, mixed> `format`, `exportedAt` y una clave por sección, en este orden; la lista de intentos es un generador */
    public function document(int $userId): array;
    /** @return list<string> las claves de las secciones que existen */
    public function sectionKeys(): array;
}

final class RowShape
{
    /** @param array<string, mixed> $row @param list<string> $dateColumns @param list<string> $without @return array<string, mixed> */
    public static function of(array $row, array $dateColumns, array $without): array;
    /** @return list<string> las columnas DATETIME de la tabla, según information_schema (se lee una vez por proceso) */
    public static function dateColumnsOf(string $table): array;
}
```

**Pasos:**

1. Las pruebas, que fallan porque las clases no existen:
   - **`RowShapeTest`** (sin base): `['exercise_id' => 'rust-01', 'solved_at' => '2026-10-06 12:00:00.123', 'attempt_count' => 2, 'user_id' => 7]` con `solved_at` como fecha y `user_id` excluido da `['exerciseId' => 'rust-01', 'solvedAt' => '2026-10-06T12:00:00.123Z', 'attemptCount' => 2]`; un `NULL` sigue siendo `null` y `custom_test_set_at` pasa a `customTestSetAt`.
   - **`UserExportTest`**: con las cuentas A y B de `PopulatedAccount`, A con 2 filas de `exercise_progress` y 3 intentos (uno sin payload) y B con 2 intentos, y el reloj fijado en `2026-10-12 15:30:00.123`, `document(A)` tiene las claves `format` (`taller-export-1`), `exportedAt` (`2026-10-12T15:30:00.123Z`), `account`, `exerciseProgress` y `attempts`, en ese orden; `account` tiene **exactamente** `id`, `name`, `email`, `role`, `emailVerifiedAt`, `privacyVersion`, `privacyAcceptedAt`, `createdAt` y `updatedAt`; `exerciseProgress` tiene 2 entradas; `attempts`, 3, con los ids de A; el intento sin payload trae `payload: null` y los demás un `payload` con `code`; ninguna entrada trae `userId`, y el texto completo (`json_encode` del documento ya recorrido) no contiene el email de B ni los ids de los intentos de B, ni `password` ni `rememberToken`.
   - **`AttemptsSectionTest`**: las pruebas de un intento salen en `tests` sin `attemptId`; con `taller.export.chunk` en 2 y 5 intentos, los 5 salen en orden de `id`, una vez cada uno.
   - **`ExportTransactionTest`** (suite `Content`, sin la transacción de la prueba): con 250 intentos de una cuenta y el fragmento en 100, recorrer `AttemptsSection::read` anota `DB::transactionLevel()` en cada intento que entrega: **siempre 0**; y se abren exactamente 3 transacciones (100, 100 y 50), que se cuentan con el evento `TransactionBeginning`. Las lecturas son por clave (`user_id = ? and id > ? order by id limit 100`).
2. Implementá. `AttemptsSection` lee **cada fragmento dentro de una `DB::transaction` de sólo lectura** que devuelve los arreglos de intentos, pruebas y payloads del fragmento, y recién después los entrega (`yield`) uno por uno. `ExerciseProgressSection` lee las filas en una transacción corta. Las filas pasan por `RowShape` (sin `user_id`, y sin `attempt_id` en las hijas). `UserExport::document` arma el arreglo con los generadores adentro.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. La memoria de una exportación grande se mide al implementar (ver «Lo que quedó sin verificar»).

### Tarea 4.2 · `POST /api/me/export` y su cobertura (T015)

- **Crea:** `backend/api/app/Http/Controllers/Account/ExportController.php`, `backend/api/tests/Feature/Accounts/{ExportEndpointTest,UserExportCoverageTest}.php`.
- **Modifica:** `backend/api/routes/api/export.php`.

**Pasos:**

1. Las pruebas, que fallan porque la ruta no existe (con `Browser`):
   - **`ExportEndpointTest`:** sin la contraseña reconfirmada, 423; confirmada, 200 con `Content-Type: application/json`, `Content-Disposition: attachment; filename="taller-<id>-20261012.json"` (reloj fijado), `Cache-Control: no-store` y `X-Accel-Buffering: no`; el cuerpo (`streamedContent()`) es un JSON válido con `format: "taller-export-1"` y **sólo** los datos de la cuenta de la sesión: con la cuenta A, ni el email ni los intentos de B; una cuenta con el email sin verificar también exporta (la ruta no lleva `verified`); una cuenta en `deleting` recibe 401. **Límite:** cinco pedidos sin confirmar dan 423 y no gastan el cupo; tres exportaciones confirmadas dan 200 y la cuarta, 429 `too_many_requests` con `Retry-After`. Sale una línea `account.exported` con el `user_id`.
   - **`UserExportCoverageTest`:** para cada fila declarada con una clave de sección que **existe** en el esquema, `UserExport::sectionKeys()` contiene esa clave; y una tabla declarada con `progress` o `imports` que exista sin que su sección esté registrada hace fallar la prueba y nombra la tabla (el mecanismo que obliga a D1a y a D1b). Con el esquema de hoy, pasa.
2. Implementá el controlador invocable: `CurrentAccount::of($request)`, el registro, y `response()->streamJson($export->document($user->id), 200, [...])` con las cuatro cabeceras. La ruta: `Route::post('/me/export', ExportController::class)->middleware(['account', 'password.confirm', 'throttle:export'])`, con la confirmación **antes** del límite, para que un pedido sin confirmar no gaste el cupo.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. Con esto X cierra su parte.

## 5. Supresión (dueño L, onda 2)

**Cubre:** FR-044 a FR-049 y FR-054 (la purga, el barrido y el libro).

**Entrega:** al llegar S2, el trabajo de purga, el pedido de supresión con sus dos rutas, el barrido y el comando de restauración.

### Tarea 5.1 · `PurgeUserData` (T016)

- **Crea:** `backend/api/app/Jobs/PurgeUserData.php`, `backend/api/tests/Feature/Accounts/{PurgeUserDataTest,PurgeUserDataQueueTest}.php`.
- **Entrega** (firma de referencia):

```php
#[Tries(8)]
#[Timeout(300)]
#[Backoff(60, 300, 900, 1800, 3600)]
#[UniqueFor(18000)]
final class PurgeUserData implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $userId) {}
    public function uniqueId(): string;                       // (string) $userId
    public function handle(UserPurge $purge, ActiveRuns $runs, AccountLock $lock): void;
    public function failed(Throwable $error): void;           // registra purge.failed con el id y la clase de la excepción
}
```

**Pasos:**

1. Las pruebas, que fallan porque la clase no existe:
   - **`PurgeUserDataTest`:** con una cuenta de `PopulatedAccount` en `deleting` (por `AccountChanges::beginDeletion`), `handle` deja 0 filas en `users` y en cada tabla declarada que exista; hay **1** fila en `account_deletions` con el `created_at` de la cuenta (con milisegundos) y un `deleted_at` de ahora; otra cuenta poblada queda intacta; una segunda llamada no lanza nada y deja la misma fila del libro. Una cuenta `active` no se toca (sale `purge.skipped`).
   - **Cortada a mitad:** un listener de `DB::listen` lanza una excepción tras la primera sentencia `delete from attempts`; el primer `handle` falla con la cuenta todavía en `deleting` y las filas a medias; el segundo termina y deja **el mismo resultado** que una purga sin corte (SC-008).
   - **La cancelación:** con una ejecución `queued` de la cuenta, `ActiveRuns::cancelAllOf` corre **antes** de borrar `runs` (se ve en el orden de las sentencias); si la cancelación falla (el truco de B2: `FOREIGN_KEY_CHECKS=0` y borrar el ejercicio), sale `purge.cancel_failed` con la clase de la excepción y la purga **sigue** y termina.
   - **El orden de los bloqueos:** `select … from progress_heads … for update` aparece **antes** de `delete from users`, y no hay ningún `update users` entre los lotes.
   - **`PurgeUserDataQueueTest`:** `PurgeUserData::dispatch(5)` dos veces empuja **un** trabajo (`Queue::fake()`; la unicidad usa el almacén `array`); por reflexión, los atributos son `Tries(8)`, `Timeout(300)`, `UniqueFor(18000)` y `Backoff(60, 300, 900, 1800, 3600)`; la clase **no** implementa `ShouldBeEncrypted`; y con `queue.default` en `database`, la fila de `jobs.payload` contiene el id y **no** contiene el email de la cuenta.
2. Implementá `handle` con los cuatro pasos de research.md, R7: la guarda de estado, la cancelación de mejor esfuerzo, `UserPurge::inBatches` y la transacción final con `AccountLock::within` (que toma la cabecera, vuelve a leer la cuenta `FOR UPDATE` con `status = 'deleting'`, inserta la fila del libro con `insertOrIgnore` y borra la cuenta). Si `AccountLock` lanza `AccountGone`, termina bien. Sin comentarios: los nombres de los pasos son la explicación.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

### Tarea 5.2 · El pedido de supresión y sus dos rutas (T017)

- **Crea:** `backend/api/app/Accounts/AccountDeletion.php`, `backend/api/app/Http/Controllers/Account/DeletionController.php`, `backend/api/lang/es/account.php`, `backend/api/tests/Feature/Accounts/{AccountDeletionTest,DeleteMeTest,DeleteUserTest}.php`.
- **Modifica:** `backend/api/routes/api/deletion.php`.
- **Entrega** (firma de referencia):

```php
final class AccountDeletion
{
    public function __construct(private AccountChanges $changes);
    /** `beginDeletion` y, después del COMMIT, `PurgeUserData::dispatch($id)`. @throws LastAdmin @throws ModelNotFoundException */
    public function request(int $targetId): User;
}
```

**Pasos:**

1. Las pruebas, que fallan porque las rutas no existen (con `Browser`; el esperado sale de [contracts/http.md](./contracts/http.md)):
   - **`DeleteMeTest`:** sin la contraseña reconfirmada, 423; confirmada, 202 con **exactamente** `{"data": {"status": "deleting"}, "message": "Se está borrando tu cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer."}`; la cuenta queda en `deleting`; `sessions` no tiene filas de la cuenta; **el siguiente pedido del mismo `Browser` da 401** `unauthenticated`; un ingreso con la contraseña correcta da 422 `auth_failed`; se empujó `PurgeUserData` con el id y se disparó `AccountRestricted(…, Deleting)`. El único admin activo recibe 409 `last_admin` y **nada cambia** (sigue `active`, no hay trabajo ni evento); con dos admins, 202. Una cuenta con el email sin verificar también puede (la ruta no lleva `verified`).
   - **`DeleteUserTest`:** `DELETE /api/admin/users/{id}` sin confirmar da 423; un estudiante da 202 con el mensaje de la administración («Se está borrando la cuenta con todo lo que guardó: …»); un id inexistente, 404; el único admin activo, 409 `last_admin`; un admin con otro activo, 202 y las invitaciones que creó ya no están; una cuenta que ya está en `deleting`, 202 sin cambios (no toca `updated_at`); la propia cuenta del admin vale como `DELETE /api/me`, y la sesión termina.
   - **`AccountDeletionTest`:** pedir dos veces la supresión de la misma cuenta empuja **un** trabajo (la unicidad).
2. Implementá `request` y el controlador. Para la sesión propia, el controlador hace lo mismo que `DropInvalidSession::drop` (`logoutCurrentDevice`, `invalidate` y `regenerateToken`) y responde 202. Los mensajes de las dos respuestas salen de `lang/es/account.php`. Cada ruta lleva su grupo y `->middleware('password.confirm')`: `DELETE /api/me` en `account`, y `DELETE /api/admin/users/{user}` en `admin` con `->whereNumber('user')`. Sale una línea `account.deletion_requested`.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

### Tarea 5.3 · El barrido de las supresiones trabadas (T018)

- **Crea:** `backend/api/app/Console/Commands/ResumePurges.php` y `backend/api/tests/Feature/Console/ResumePurgesTest.php`.

**Pasos:**

1. `ResumePurgesTest`, que falla porque el comando no existe. Con el reloj fijado y `Queue::fake()`: S1 en `deleting` con `updated_at` de hace 15 minutos y 1 segundo, S2 en `deleting` desde hace 14 minutos y 59 segundos, S3 `active` y S4 `disabled`. `taller:resume-purges` empuja `PurgeUserData` **sólo** para S1, sale con 0 y dice «1 purga retomada»; sale una línea `purge.resumed` con el id de S1 y ningún email; S2, S3 y S4 no se tocan. Si ya hay un trabajo de S1 en la cola, corriendo o esperando su siguiente intento (la unicidad tomada), no se empuja otro.
2. Implementá el comando: las cuentas con `status = 'deleting'` y `updated_at` anterior a `ahora − taller.purge.stuck_minutes`, y `PurgeUserData::dispatch` por cada una.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde.

### Tarea 5.4 · `taller:reapply-deletions` (T019)

- **Crea:** `backend/api/app/Accounts/{DeletionLedgerFile,LedgerEntry,MalformedLedger}.php`, `backend/api/app/Console/Commands/ReapplyDeletions.php`, `backend/api/tests/Unit/Accounts/DeletionLedgerFileTest.php` y `backend/api/tests/Feature/Console/ReapplyDeletionsTest.php`.
- **Entrega** (firmas de referencia):

```php
final readonly class LedgerEntry { public function __construct(public int $userId, public CarbonImmutable $userCreatedAt, public CarbonImmutable $deletedAt) {} }

final class MalformedLedger extends RuntimeException { /** @param list<int> $lines */ public function __construct(public readonly array $lines); }

final class DeletionLedgerFile
{
    /** @return list<LedgerEntry> @throws MalformedLedger con los números de las líneas mal formadas */
    public function parse(string $contents): array;
}
```

**Pasos:**

1. Las pruebas, que fallan porque no existen:
   - **`DeletionLedgerFileTest`** (sin base): `"user_id\tuser_created_at\tdeleted_at\n12\t2026-10-05 12:00:00.123\t2026-10-06 08:30:00.000\n\n13\t2026-10-05 12:00:00\t2026-10-06 09:00:00\n"` da dos entradas, de ids 12 y 13 (el encabezado y la línea vacía se ignoran), y la del 13 tiene `userCreatedAt` en `…12:00:00.000`; `"12\tabc\t2026-10-06 08:30:00"` lanza `MalformedLedger` con la línea 1; una fila con dos columnas, un id `0` o `-3`, o un instante sin hora también; con tres filas malas, las tres líneas.
   - **`ReapplyDeletionsTest`:** en una base «restaurada», la cuenta 12 (`created_at` `2026-10-05 12:00:00.123`, poblada por `PopulatedAccount`), la cuenta 13 (`created_at` `2026-10-06 10:00:00.000`, un id reutilizado) y ninguna cuenta 14; con un archivo con `12` (creada `2026-10-05 12:00:00.123`, borrada `2026-10-06 08:30:00.000`), `13` (creada `2026-10-05 12:00:00.000`) y `14`: **la 12 queda purgada** (sin filas en ninguna tabla declarada), **la 13 no se toca** y el comando lo dice, la 14 no encuentra nada; `account_deletions` tiene las tres filas con los valores **del archivo** (incluido el `deleted_at` de la 12); no se empujó nada a la cola (la purga corrió en el momento); sale con 0 y dice «1 cuenta borrada, 1 id reutilizado salteado y 3 filas agregadas al libro». Una **segunda corrida** no cambia nada («0 cuentas borradas, 0 filas agregadas»). La salida no contiene ningún email.
   - **Errores:** un archivo con una línea mal formada sale con 2, nombra su número y **no procesa ninguna** (la cuenta 12 sigue); un archivo que no existe sale con 1; si la purga de una cuenta falla, las demás se procesan y el código es 1. Si la cuenta 12 era el único admin, se purga igual (sin la guardia) y el comando avisa que no queda ningún admin activo y trae `taller:invite {email} --role=admin`.
2. Implementá. El comando lee `php://stdin` si `archivo` es `-`, valida **todo** el archivo antes de tocar nada, ordena por `user_id` y, por cada entrada, hace primero `insertOrIgnore` del libro y después, si hay una cuenta con ese id **y** ese `created_at`, `AccountChanges::beginDeletion($id, guardLastAdmin: false)` y `PurgeUserData::dispatchSync($id)`. Salen las líneas `ledger.reapplied` y `ledger.skipped`. La lectura de la entrada estándar se prueba en el stack (quickstart.md, escenario 6) y no en Pest.
3. `npm run api:analyse`: 0 errores.

**Compuerta:** las pruebas en verde. Con esto L cierra la onda 2.

## 6. Integración y cierre (coordinador, onda 3)

**Cubre:** FR-050, FR-053, FR-055, FR-056 y los criterios SC-006, SC-012, SC-013 y SC-014.

**Entrega:** el `scheduler` completo, las matrices de acceso y de confirmación, el evento probado de punta a punta con B2, los checks contra el stack, la documentación y la evidencia de cierre.

### Tarea 6.1 · El `scheduler` (T020)

- **Modifica:** `backend/api/routes/console.php` y `backend/api/tests/Feature/ScheduleTest.php`.

**Pasos:**

1. Reescribí `ScheduleTest` primero, que falla porque faltan las tareas. Hoy exige exactamente cuatro y «ninguna procesa una cola»; ahora exige **ocho**: las cuatro de C3a, sin cambios, y estas, con su expresión de cron (el esperado sale de [contracts/console.md](./contracts/console.md)):

| Comando | Cron | Sin solaparse |
| --- | --- | --- |
| `queue:work database --queue=default --stop-when-empty --max-time=50` | `* * * * *` | Sí, con el bloqueo vencido a los 10 minutos (`$event->expiresAt === 10`) |
| `queue:prune-failed --hours=168` | `0 0 * * *` | Sí |
| `model:prune --model=App\Models\DeletedAccount` | `0 0 * * *` | Sí |
| `taller:resume-purges` | `*/5 * * * *` | Sí |

   Además: **exactamente una** tarea contiene `queue:work`, lleva `--queue=default`, y ninguna menciona la cola `runs`.
2. Sumá las cuatro líneas a `routes/console.php`: `Schedule::command('queue:work database --queue=default --stop-when-empty --max-time=50')->everyMinute()->withoutOverlapping(10)`, `Schedule::command('queue:prune-failed', ['--hours' => 168])->daily()->withoutOverlapping()`, `Schedule::command('model:prune', ['--model' => DeletedAccount::class])->daily()->withoutOverlapping()` y `Schedule::command('taller:resume-purges')->everyFiveMinutes()->withoutOverlapping()`.
3. `npm run api:test -- --filter=ScheduleTest` y `npm run api:analyse`.

**Compuerta:** `ScheduleTest` en verde y la suite entera en verde.

### Tarea 6.2 · Los recorridos y las matrices (T021)

- **Crea:** `backend/api/tests/Feature/Admin/{AdminAccessMatrixTest,PasswordConfirmMatrixTest,NoStudentTextsTest}.php`.
- **Modifica:** `backend/api/tests/Feature/{RouteAccessTest,ExpectedAccountMatrixTest,MassAssignmentTest}.php`.

**Pasos:**

1. **`RouteAccessTest`:** el recorrido que pide con 401 cada ruta protegida de lectura reemplaza hoy `{id}` por `rust-01`; sumá el reemplazo de cualquier otro `{parámetro}` por `1`. La lista blanca **no cambia**: ninguna ruta de C3b es pública. Sumá que **toda** ruta de `/api/admin` lleva `account.admin` y `throttle:admin` entre sus middleware.
2. **`ExpectedAccountMatrixTest`:** la lista de rutas que modifican suma las de C3b (`DELETE /api/me`, `POST /api/me/export`, `POST /api/admin/invitations`, `POST /api/admin/invitations/{invitation}/resend`, `DELETE /api/admin/invitations/{invitation}`, `PATCH` y `DELETE /api/admin/users/{user}` y `POST /api/admin/users/{user}/password-reset`); el esperado sale de [contracts/http.md](./contracts/http.md) y se suma a lo que ya trajeron B2 y D1a. El pedido de la matriz reemplaza `{user}` y `{invitation}` por `1`.
3. **`AdminAccessMatrixTest`** (FR-053, SC-006), para **cada** ruta de `/api/admin` de las nueve, con un id de destino que existe y con uno que no (999999): sin sesión, 401; un estudiante verificado, 403 `forbidden` **en los dos casos**; un estudiante con el email sin verificar, 403 `email_unverified`; una cuenta `disabled` con la sesión viva, 403 `account_disabled`; un admin que modifica sin `X-Taller-User` o con el id de otra cuenta, 409 `account_mismatch` y **ninguna escritura fuera de `sessions` y `cache`** (la técnica de `ExpectedAccountMatrixTest`). Un `{user}` que es `abc` da 404 para todos. `POST /api/me/export` y `DELETE /api/me` no reciben ningún id: con la sesión de B y `X-Taller-User` de A, 409.
4. **`PasswordConfirmMatrixTest`** (FR-053): lo que **siempre** exige la contraseña reconfirmada (423 sin ella): `PATCH` y `DELETE /api/admin/users/{user}`, `POST /api/admin/users/{user}/password-reset`, `POST /api/me/export` y `DELETE /api/me`; lo que la exige **según el rol**: `POST /api/admin/invitations` con `role: "admin"` y el `resend` de una invitación de admin; lo que **no** la exige: las dos lecturas de usuarios, el listado de invitaciones, `DELETE /api/admin/invitations/{id}`, la creación con `role: "student"` y el `resend` de una de alumno. Confirmada, ninguna da 423; después de `travel(901)->seconds`, las que la exigen vuelven a dar 423.
5. **`NoStudentTextsTest`** (FR-041): con una cuenta con una `reflection` y un `custom_test` en `exercise_progress`, y un intento con payload, recorre las respuestas **con éxito** de cada ruta de `/api/admin` (las lecturas y las mutaciones que la matriz ejecuta) y falla si en cualquier nivel aparece una de las claves `code`, `reflection`, `note`, `body`, `custom_test` o `raw_payload`. Una prueba hermana comprueba que recorre las rutas que haya en el router, y que una ruta nueva que devolviera `code` en un 200 lo rompería (se agrega una de prueba).
6. **`MassAssignmentTest`:** `PATCH /api/admin/users/{id}` con `{role: "student", email: "otra@x.com", name: "X", password: "x", user_id: 99}` cambia **sólo** el rol: el email, el nombre, la contraseña y el id no cambian.

**Compuerta:** las matrices y los recorridos en verde. Es el cierre de SC-006.

### Tarea 6.3 · El evento llega a B2 (T022)

- **Crea:** `backend/api/tests/Feature/Accounts/AccountRestrictedWiringTest.php`.

**Pasos:**

1. Con el listener de B2 cableado (T001 lo comprobó; si no, el coordinador suma `Event::listen(AccountRestricted::class, CancelRunsOfRestrictedAccount::class)` en `AppServiceProvider`, que es la línea de la T018 de B2, y avisa a B2), la prueba arma, con `RunWorld`, una cuenta con una ejecución `queued` y, **por HTTP**:
   - `PATCH /api/admin/users/{id}` con `{status: "disabled"}` deja la ejecución **cancelada**;
   - `PATCH` con `{role: "student"}` sobre un admin activo con una ejecución `queued` la deja **como estaba** (`Demoted` no cancela, porque la cuenta sigue activa);
   - `DELETE /api/me` con una ejecución `queued` la deja cancelada y, ejecutada la purga, borrada.
2. `app('events')->hasListeners(AccountRestricted::class)` es verdadero (el mismo cableado de B2).

**Compuerta:** la prueba en verde. Es la prueba de que C3b y B2 se encuentran.

### Tarea 6.4 · Los checks contra el stack (T023)

- **Crea:** `backend/api/scripts/check-admin-lifecycle.sh`.
- **Modifica:** `backend/api/scripts/check-account.sh` y `backend/api/scripts/smoke.sh`.

**Pasos:**

1. `check-account.sh` (de C3a) suma un segundo parámetro opcional, el rol (`check_account_open <base-url> [admin|student]`, que pasa `--role=admin` a `taller:invite`), y deja la contraseña en `CHECK_ACCOUNT_PASSWORD`. Los tres checks de C3a lo siguen usando igual. `smoke.sh` suma una porción nueva: `GET /api/admin/users` sin sesión responde 401 en JSON con `code` `unauthenticated`.
2. Con el stack levantado, escribí `check-admin-lifecycle.sh` (POSIX `sh`, con `set -u`, un `trap … EXIT` que limpia con `DELETE FROM users WHERE email LIKE 'check-%@taller.invalid'` y las filas del libro de los ids que creó, y la salida `ok` o `FALLO` de `smoke.sh`). Abre un admin y un estudiante con el helper y recorre:
   - **El admin:** `confirm-password` (201); `GET /api/admin/users?q=check-` (200, con al menos 2 en `meta.total`); `POST /api/admin/invitations` por link (200, `created` y una `url` con `#invitacion=`); lo mismo con `delivery: "email"` (503 `mail_unavailable`); `GET /api/admin/invitations?state=pending` (la ve, sin token); `DELETE` de esa invitación (204); y la del estudiante a `GET /api/admin/users` (403).
   - **El estudiante:** `confirm-password`; `POST /api/me/export` (200 y un JSON con `format: "taller-export-1"`); `DELETE /api/me` (202); `GET /api/session` (`user: null`); y **espera hasta 180 segundos**, mirando MySQL cada 5, a que la cuenta desaparezca y haya **una** fila en `account_deletions` con su id (SC-014): anota cuánto tardó.
3. Corré `sh backend/api/scripts/check-admin-lifecycle.sh`, `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`: pasan, y no queda ninguna cuenta de prueba ni fila del libro.

**Compuerta:** los cuatro en verde y ninguna cuenta olvidada.

### Tarea 6.5 · La documentación (T024)

- **Modifica:** `backend/api/AGENTS.md`, `AGENTS.md`, `README.md` y `docs/architecture.md`.

**Pasos:**

1. `backend/api/AGENTS.md` (FR-055): reemplazá «Hasta C3b, el rol y el estado de una cuenta se cambian con `php artisan tinker`» por lo vigente, y sumá una sección «Administración y ciclo de vida (C3b)» con: el grupo `admin` y que ninguna ruta de `/api/admin` usa el binding implícito; que `role` y `status` los cambia sólo `AccountChanges`; `UserData` (`UserTables`, `UserPurge`, `UserExport` y `PopulatedAccount`) y la regla de que **toda tabla nueva con `user_id` se declara en `UserTables` y en `PopulatedAccount`**; `PurgeUserData`, el barrido y el comando `taller:reapply-deletions`; las ocho tareas del `scheduler` y que el `queue:work` es sólo de `default`; la suite `Concurrency` y `Parallel` para las carreras; y que el 503 `mail_unavailable` es de C3b hasta que llegue C3c.
2. `README.md`: en la sección de cuentas, la administración por API, la supresión, la copia del libro junto a cada respaldo y la restauración con `taller:reapply-deletions` por la entrada estándar. `AGENTS.md`: sólo si cambia un comando de la raíz (no cambia).
3. `docs/architecture.md`: una fila de «Administración y ciclo de vida (C3b)» en el mapa, con `backend/api/app/Admin/`, `app/Accounts/`, `app/Jobs/` y `routes/api/` y los contratos de `specs/010-c3b-admin-ciclo-de-vida/contracts/`.
4. Verificá rutas, comandos y enlaces locales de lo editado (un recorrido que resuelva cada ruta citada) y `git diff --check`.

**Compuerta:** las rutas y los enlaces resuelven; los comandos citados existen.

### Tarea 6.6 · La compuerta final (T025)

**Pasos:** corré, en este orden, y anotá el resultado real de cada uno:

1. `npm run api:format:check`, `npm run api:analyse` (0 errores, nivel 9, sin baseline) y `npm run api:test`, también en orden aleatorio (`-- --order-by=random`) y la suite `Concurrency` sola (`-- --testsuite=Concurrency`).
2. `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`.
3. Con `docker compose up --build -d --wait`: `npm run api:smoke`, `npm run api:content:check`, `sh backend/api/scripts/deploy-check.sh` y `sh backend/api/scripts/check-admin-lifecycle.sh`.
4. `docker compose config --services` y `--volumes` contra `master`: **no cambian** (C3b no suma servicios).
5. Los escenarios 1 a 7 de [quickstart.md](./quickstart.md) contra el stack; el 6 (la restauración con el libro por la entrada estándar) con un libro armado a mano.
6. El PR, con título `feat(api): …` en inglés y su descripción completa, con la evidencia y los límites (lo que no se verificó).

**Compuerta:** todo lo anterior en verde o con su límite escrito.

## Cobertura de requisitos

Cada requisito con las tareas que lo implementan o lo prueban. `tasks.md` cita los mismos requisitos en cada línea.

| Requisito | Tareas |
| --- | --- |
| FR-031 | T002, T009, T013, T021 |
| FR-032 | T009 |
| FR-033 | T010, T021 |
| FR-034 | T007, T008, T010 |
| FR-035 | T007, T008, T010, T022 |
| FR-036 | T011 |
| FR-037 | T013 |
| FR-038 | T012, T013 |
| FR-039 | T012, T013 |
| FR-040 | T010, T011, T013, T015, T017 |
| FR-041 | T021 |
| FR-042 | T005, T006, T014, T015 |
| FR-043 | T014, T015 |
| FR-044 | T008, T017 |
| FR-045 | T006, T016 |
| FR-046 | T018, T020 |
| FR-047 | T003, T004, T020 |
| FR-048 | T019 |
| FR-049 | T017 |
| FR-050 | T002, T020, T023 |
| FR-053 | T007, T008, T021 |
| FR-054 | T006, T014, T016, T018, T019 |
| FR-055 | T001, T024, T025 |
| FR-056 | T002, T011, T013, T021, T023 |
| SC-005 | T007, T008 |
| SC-006 | T009, T021 |
| SC-007 | T006, T015, T016 |
| SC-008 | T016, T018 |
| SC-009 | T019 |
| SC-012 | T025 |
| SC-013 | T011, T013, T023 |
| SC-014 | T020, T023 |

## Descargas y permisos

Ninguna. C3b no baja ni instala nada: ni paquetes de Composer, ni imágenes, ni archivos (constitución, principio VII). Para las pruebas que usan Docker (T023 y T025), las imágenes ya están en la máquina: si un comando intenta descargar algo, pará y pedí permiso.

## Lo que quedó sin verificar

Esta planificación no ejecutó nada. Lo que hay que medir o comprobar al implementar, y quién lo hace:

| Qué | Cómo se resuelve |
| --- | --- |
| Todo el código de referencia: las firmas, el SQL y la configuración | Las pruebas de cada tarea; si algo no compila o no corre, se corrige la referencia, no la prueba |
| El DDL de [data-model.md](./data-model.md) contra MySQL 9.7 | La prueba de esquema y `migrate:fresh` de T003 y T004 |
| Los atributos de colas de Laravel 13 (`Backoff(array\|int ...)`, `UniqueFor`, `Tries`, `Timeout`) con `ShouldBeUnique` sobre el almacén `database` (`cache_locks`) | T016 con el almacén `array` en las pruebas, y T023 contra el stack |
| Que la guardia serialice dos pedidos con las claves foráneas de la capa SQL de MySQL 9.6 y 9.7 (candados y cascadas distintos de los de InnoDB nativo) | Las 20 corridas de `LastAdminRaceTest` (T007) y las de `InviteRaceTest` (T012) |
| Que `SubstituteBindings` corra antes que `account.admin` y que, sin el binding implícito, el 403 gane al 404 | La matriz con un id inexistente de T021 |
| `response()->streamJson` con generadores dentro de un arreglo y con cabeceras propias (`Content-Disposition`, `X-Accel-Buffering`) | T015 con `streamedContent()`; si el generador no se recorre en orden, se arma la respuesta con `response()->stream` |
| Que Nginx no acumule la respuesta en `/tmp/fastcgi_temp` (tmpfs de 32 MB) con `X-Accel-Buffering: no`, y que `max_execution_time` y FPM no corten una exportación larga | No se midió: Nginx no reenvía esa cabecera al cliente. Se mide al implementar con una cuenta de prueba de unos 30.000 intentos (límite declarado en el PR si no se hace) |
| La memoria de una exportación grande | T014 y el paso anterior; la prueba de memoria, si resulta inestable, se declara como límite |
| `DELETE … ORDER BY … LIMIT` por `DB::delete` y su plan con los índices de B2 | Las sentencias capturadas en T006; `EXPLAIN` sobre `runs` y `attempts` |
| `AccountLock::within` con `AccountGone` cuando la fila de `users` ya no existe | T016, con la segunda llamada de `handle` |
| Que `StartSession` no vuelva a guardar la fila de `sessions` que `AccountSessions::endAll` borró al terminar el pedido de `DELETE /api/me` | T017: el siguiente pedido del `Browser` da 401 y `sessions` no tiene filas de la cuenta |
| Que el candado de unicidad de 5 horas (`UniqueFor(18000)`, que cubre los ocho intentos con su espera) se libere al terminar o al agotar los intentos, y que un trabajo perdido sin liberarlo (por ejemplo, una tabla `jobs` vaciada a mano) deje la purga sin barrido hasta que el candado venza | T016 con el almacén `array` y T023 contra el stack |
| Que el listener de B2 esté cableado en la base | T001 y T022 |
| Que `retry_after` de 330 s alcance para el `Timeout` de 300 s de la purga, y que la imagen tenga `pcntl` (B2 lo compila) para que ese `Timeout` se aplique | T001 (la imagen) y T016 |
| `schedule:work` con `queue:work` y `withoutOverlapping(10)`, y que `--max-time=50` no deje trabajos sin procesar | T023 contra el stack (SC-014) |
| El formato TSV de `mysql --batch --raw --skip-column-names` con `DATETIME(3)` | Quickstart, escenario 6, con el cliente de `mysql:9.7` |
| La lectura del libro por la entrada estándar | Quickstart, escenario 6: Pest no la cubre |
| La línea de base: se leyó de `feat/c3a-identidad` (`656b14e`) y de `feat/b2-ejecuciones` (`1d263c3`), y los PR mergeados pueden diferir | T001 |

## Complexity Tracking

Sin violaciones de la constitución que justificar. Hay desvíos del ADR 0006, no de la constitución, que la hoja de ruta debería registrar como enmiendas: no se usan un `Gate admin` ni policies por modelo (§4.5, R2 de la investigación), y `UserData` se parte en un registro y dos operaciones con un dueño cada una (§8, R5). Ningún desvío cambia lo que el ADR promete: la guardia del último admin, la supresión física con su libro, la exportación en transacciones cortas y el 403 de un estudiante en toda ruta de administración.
