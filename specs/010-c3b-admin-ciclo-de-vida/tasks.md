# Tasks: C3b · Administración y ciclo de vida de la cuenta

**Input**: `specs/010-c3b-admin-ciclo-de-vida/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S2) están en la sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, sus firmas y sus comandos. Como en C3a, cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec.

## Phase 1: Setup — Línea de base y piezas comunes (coordinador, onda 0)

- [ ] T001 [US5] Línea de base: C3a (PR #24) y B2 (PR #22) integrados en la rama de trabajo, `npm run api:format:check`, `api:analyse` (nivel 9) y `api:test` en verde, y el bloque de migraciones `2026_10_05_400001` a `400099` reservado (FR-055; plan 0.1)
- [ ] T002 [US2] Piezas comunes: `ApiCode::{LastAdmin,MailUnavailable}` con `MailUnavailable`, `EnsureUserIsAdmin` y el grupo `admin` en `backend/api/bootstrap/app.php`, los límites `admin` y `export` en `Limiters`, `config/{queue,taller}.php`, `PageMeta` y los cuatro archivos de rutas en `backend/api/routes/api/` (FR-031, FR-050, FR-056; plan 0.2)

## Phase 2: Foundational — Esquema, registro y purga por lotes (dueño S, onda 1)

*Parte de S0. T003 a T006 son la cola de S.*

- [ ] T003 [P] [US3] Pruebas de esquema que fallan: `backend/api/tests/Feature/{AccountDeletionsSchemaTest,UserIdForeignKeyTest}.php` (con la lista de excepciones de `user_id`) y `backend/api/tests/Content/MigrationsTest.php` (FR-047; plan 1.1)
- [ ] T004 [US3] La migración `backend/api/database/migrations/2026_10_05_400001_create_account_deletions_table.php` y `backend/api/app/Models/DeletedAccount.php` (FR-047; plan 1.2)
- [ ] T005 [US3] El registro `UserData`: `backend/api/app/Accounts/{Ownership,UserTable,UserTables,UserData}.php` y su prueba de cobertura contra `information_schema` (FR-042; plan 1.3)
- [ ] T006 [US3] `UserPurge` (los lotes en el orden de D06), `backend/api/tests/Support/PopulatedAccount.php` y la prueba de `DELETE FROM users` poblado (FR-042, FR-045, FR-054; SC-007; plan 1.4)

## Phase 3: User Story 2 - Administración de cuentas (dueño A, onda 1)

*T007 parte de S0. T008 cierra S1 por el lado de A. T009 a T011 no esperan a S1.*

- [ ] T007 [P] [US2] `LastAdminGuard` y `AccountChanges::change` en `backend/api/app/Admin/`, con los efectos de FR-035, el evento después del COMMIT y la carrera de 20 corridas en `backend/api/tests/Concurrency/LastAdminRaceTest.php` (FR-034, FR-035, FR-053; SC-005; plan 2.1)
- [ ] T008 [US3] `AccountChanges::beginDeletion` y la matriz del último admin (FR-034, FR-035, FR-044, FR-053; SC-005; plan 2.2)
- [ ] T009 [US2] `GET /api/admin/users` y `/{user}`: `UserDirectory`, `PublishedAdminUser`, `UserController`, `ListUsersRequest` y `routes/api/admin-users.php` (FR-031, FR-032; SC-006; plan 2.3)
- [ ] T010 [US2] `PATCH /api/admin/users/{user}`: `UpdateUserRequest` y `UserController::update` (FR-033 a FR-035, FR-040; plan 2.4)
- [ ] T011 [US2] `POST /api/admin/users/{user}/password-reset`, que responde 503 hasta C3c (FR-036, FR-040, FR-056; SC-013; plan 2.5)

## Phase 4: User Story 1 - Invitaciones de admin (dueño I, onda 1)

*T012 parte de S0 y corre a la vez que S, A y X.*

- [ ] T012 [P] [US1] `AdminInvitations` (crear, renovar, reenviar y revocar, con la carrera del UNIQUE) en `backend/api/app/Admin/` (FR-038, FR-039; plan 3.1)
- [ ] T013 [US1] Los cuatro endpoints de `/api/admin/invitations`: `InvitationController`, sus `FormRequest` y `routes/api/admin-invitations.php`, con el 503 de la entrega por correo (FR-031, FR-037 a FR-040, FR-056; SC-013; plan 3.2)

## Phase 5: User Story 3 - Exportación (dueño X, ondas 1 y 2)

*T014 parte de S0. T015 parte de S1.*

- [ ] T014 [P] [US3] `UserExport`, las tres secciones y `RowShape` en `backend/api/app/Accounts/Export/`, con la prueba de que no queda una transacción abierta (FR-042, FR-043, FR-054; plan 4.1)
- [ ] T015 [P] [US3] `POST /api/me/export`: `ExportController`, `routes/api/export.php` y la prueba de cobertura de las secciones (FR-040, FR-042, FR-043; SC-007; plan 4.2)

## Phase 6: User Story 3 y 4 - Supresión y restauración (dueño L, onda 2)

*Parte de S1. T016 a T019 son la cola de L.*

- [ ] T016 [P] [US3] `PurgeUserData` en `backend/api/app/Jobs/`: único, idempotente, por lotes y con la transacción final bajo `AccountLock` (FR-045, FR-054; SC-007, SC-008; plan 5.1)
- [ ] T017 [US3] `AccountDeletion`, `DeletionController` y las rutas `DELETE /api/me` y `DELETE /api/admin/users/{user}` (FR-040, FR-044, FR-049; plan 5.2)
- [ ] T018 [US3] `taller:resume-purges`, el barrido de las cuentas trabadas en `deleting` (FR-046, FR-054; SC-008; plan 5.3)
- [ ] T019 [US4] `taller:reapply-deletions`, con el libro por la entrada estándar (FR-048, FR-054; SC-009; plan 5.4)

## Phase 7: User Story 5 - Integración, checks y cierre (coordinador, onda 3)

*Parte de S2.*

- [ ] T020 [US5] El `scheduler`: las cuatro tareas nuevas en `backend/api/routes/console.php` y `ScheduleTest` (FR-046, FR-047, FR-050; SC-014; plan 6.1)
- [ ] T021 [US2] Recorridos y matrices: `RouteAccessTest`, `ExpectedAccountMatrixTest`, `AdminAccessMatrixTest`, `PasswordConfirmMatrixTest`, `NoStudentTextsTest` y `MassAssignmentTest` en `backend/api/tests/Feature/` (FR-031, FR-033, FR-041, FR-053, FR-056; SC-006; plan 6.2)
- [ ] T022 [US2] El evento llega a B2: `backend/api/tests/Feature/Accounts/AccountRestrictedWiringTest.php` (FR-035; plan 6.3)
- [ ] T023 [US5] Los checks contra el stack: `backend/api/scripts/check-admin-lifecycle.sh`, `check-account.sh` y `smoke.sh` (FR-050, FR-056; SC-013, SC-014; plan 6.4)
- [ ] T024 [US5] Documentación: `backend/api/AGENTS.md`, `AGENTS.md`, `README.md` y `docs/architecture.md` (FR-055; plan 6.5)
- [ ] T025 [US5] Compuerta final y evidencia de cierre (FR-055; SC-012; plan 6.6)
