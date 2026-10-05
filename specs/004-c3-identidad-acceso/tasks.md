# Tasks: C3a · Identidad y acceso: autenticación

**Input**: `specs/004-c3-identidad-acceso/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S3) están en la sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, sus firmas y sus comandos. Como en C2 y C6, cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec.

## Phase 1: Setup — Línea de base y descargas (coordinador, onda 0)

- [ ] T001 [US7] Línea de base: C6 (PR #17) integrado en la rama de trabajo, `npm run api:format:check`, `api:analyse` (nivel 9) y `api:test` en verde, y el bloque de migraciones `2026_10_05_200001` a `200099` reservado (FR-051; plan 0.1)
- [ ] T002 [US2] Declarar `symfony/polyfill-intl-normalizer` en `backend/api/composer.json` y `backend/api/composer.lock`, con permiso del usuario (FR-023; plan 0.2)
- [ ] T003 [US1] Lista de contraseñas bloqueadas en `backend/api/resources/passwords/{blocked-15plus.txt,SOURCE.md}`: se baja y se filtra con permiso del usuario (FR-023, FR-024; plan 0.3)

## Phase 2: Foundational — Esquema, piezas puras, errores, sesión y límites (dueños S, P, F y L)

*S, P y F parten de S0 y corren a la vez (onda 1). T010 y T011 parten de S1 (onda 2).*

- [ ] T004 [P] [US1] Pruebas de esquema que fallan: `backend/api/tests/Feature/{IdentitySchemaTest,UserIdForeignKeyTest}.php` y `backend/api/tests/Content/MigrationsTest.php` (FR-001, FR-003, FR-004; plan 1.1)
- [ ] T005 [US1] Las siete migraciones `backend/api/database/migrations/2026_10_05_2000NN_*.php` (FR-001, FR-003, FR-017; plan 1.2)
- [ ] T006 [US1] `User`, `Invitation`, `Role`, `AccountStatus`, `UserFactory` y `WriteTransaction` en `backend/api/app/` y `backend/api/database/factories/` (FR-001, FR-002; plan 1.3)
- [ ] T007 [P] [US1] `Email`, `EmailFingerprint`, `NetworkKey`, `InvitationToken` e `Iso8601` en `backend/api/app/Auth/` y `backend/api/app/Support/`, con sus pruebas unitarias (FR-021, FR-023; plan 2.1)
- [ ] T008 [US2] `PlainPassword`, `AccountPasswords`, `PasswordPolicy`, `BlockedPasswords`, `PrivacyNotice` y `PublishedUser` en `backend/api/app/Auth/`, `backend/api/lang/es/password-policy.php` y la prueba de arquitectura (FR-022, FR-023, FR-024, FR-035; plan 2.2)
- [ ] T009 [P] [US7] Errores con código y configuración: `ApiCode`, `ApiError::of`, `ApiExceptions`, `backend/api/lang/es/{api,validation,auth,passwords}.php`, `backend/api/config/{taller,hashing,app,session,auth}.php` y la parte de errores de `backend/api/bootstrap/app.php` (FR-037, FR-038, FR-052; SC-007; plan 3.1)
- [ ] T010 [P] [US6] Sesión: los seis middleware de `backend/api/app/Http/Middleware/`, `AccountSessions`, los grupos `api` y `account` en `bootstrap/app.php` y `backend/api/tests/Support/Browser.php` (FR-005 a FR-009, FR-030, FR-036, FR-047; plan 3.2)
- [ ] T011 [P] [US2] Límites en `backend/api/app/Auth/`: `LoginThrottle`, `AccountLockout`, `DeviceCookie` (con nombre y atributos de la configuración, compatible con `__Host-`), `PasswordProof` y `Limiters` (FR-012 a FR-014, FR-026, FR-030; plan 4.1)

## Phase 3: Foundational — Operación (dueño O)

*T012 y T013 parten de S0 (onda 1). T014 y T015 parten de S1 (onda 2).*

- [ ] T012 [P] [US7] Nginx (zonas con 429 en JSON y registro sin la query), DNS cerrado, servicios `scheduler` y `db-grants`, `init-env.sh` y `smoke.sh` en `docker/` y `backend/api/scripts/` (FR-039, FR-040, FR-043, FR-044, FR-052; SC-009, SC-010; plan 5.1)
- [ ] T013 [US7] Chequeo de transacciones largas: `LongTransactionCheck`, `taller:check-transactions`, `backend/api/docker/migrate.sh`, `MigrateScriptTest` y la prueba del criterio J con un usuario restringido (FR-040 a FR-042; SC-008; plan 5.2)
- [ ] T014 [P] [US7] Podas y `scheduler`: `taller:prune-sessions`, `taller:prune-cache`, `Invitation` prunable y `backend/api/routes/console.php` (FR-039; plan 5.3)
- [ ] T015 [US7] Registros sin secretos: `RequestContext`, `SecretScrubber` y `backend/api/config/logging.php` (FR-021, FR-045; plan 5.4)

## Phase 4: User Story 1 y 5 - Alta e invitaciones, recuperación sin correo (Priority: P1 y P2) — dueño I

*Parten de S2 (onda 3).*

- [ ] T016 [P] [US1] `Invitations` y `taller:invite` en `backend/api/app/Auth/` y `backend/api/app/Console/Commands/` (FR-017, FR-018, FR-020, FR-021; plan 6.1)
- [ ] T017 [US1] `POST /api/auth/invitations/lookup` y `accept`: `InvitationController`, sus `FormRequest`, `backend/api/routes/api/access.php` y las carreras (FR-019, FR-020, FR-022; SC-002; plan 6.2)
- [ ] T018 [US5] Recuperación por consola: `PasswordResetLinks`, `taller:password-reset-link` y `POST /api/auth/reset-password` (FR-025, FR-026; SC-005; plan 6.3)

## Phase 5: User Story 2, 3 y 4 - Ingreso y sesión, `GET /api/session`, cuenta propia (Priority: P1 y P2) — dueño A

*Parten de S2 (onda 3).*

- [ ] T019 [P] [US2] Ingreso y salida: `LoginPipeline`, `LoginController`, `LogoutController` y `backend/api/routes/api/account.php` (FR-006, FR-008, FR-010 a FR-016; SC-003, SC-004, SC-010; plan 7.1)
- [ ] T020 [US3] `GET /api/session`: `SessionController`, `ActiveCatalogs`, `Catalog::fromRow` y `ContentImports::latestVersion` (FR-009, FR-034, FR-035; plan 7.2)
- [ ] T021 [US4] Cuenta propia: `MeController` (nombre, contraseña, aviso y otras sesiones) y `ConfirmPasswordController` (FR-007, FR-008, FR-027 a FR-030, FR-049; SC-005; plan 7.3)

## Phase 6: User Story 3 y 6 - Contenido detrás de la sesión y cuenta esperada (Priority: P1 y P2) — Integración (coordinador, onda 4)

*Parte de S3.*

- [ ] T022 [US3] Contenido detrás de la sesión: `backend/api/routes/api.php`, `ContentAccessTest` y `ContentEndpointTest` autenticado (FR-031 a FR-033; SC-001; plan 8.1)
- [ ] T023 [US6] Recorridos y matrices: `RouteAccessTest`, `ExpectedAccountMatrixTest`, `MassAssignmentTest` y `LogsWithoutSecretsTest` en `backend/api/tests/Feature/` (FR-002, FR-036, FR-037, FR-045, FR-048, FR-049; SC-006; plan 8.2)

## Phase 7: Polish — Checks contra el stack, documentación y compuerta (O y coordinador)

- [ ] T024 [US7] Los checks se autentican: `backend/api/scripts/check-account.sh`, `qa/lib/api-account.ts`, `smoke.sh`, `deploy-check.sh` y `qa/api-content-check.ts` (FR-046; plan 9.1)
- [ ] T025 [US7] `deploy-check.sh`: una transacción larga detiene el despliegue antes de migrar (FR-041; SC-008; plan 9.2)
- [ ] T026 [US7] Documentación: `backend/api/AGENTS.md`, `AGENTS.md`, `README.md` y `docs/architecture.md` (FR-052; plan 9.3)
- [ ] T027 [US6] Prueba en un navegador real de la cookie, el CSRF y el cambio de cuenta (FR-050; SC-012; plan 9.4; quickstart.md, escenario 8)
- [ ] T028 [US7] Compuerta final y evidencia de cierre (FR-051; SC-011; plan 9.5)
