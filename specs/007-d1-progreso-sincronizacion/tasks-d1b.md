# Tasks: D1b · Importación y «Borrar todo»

**Input**: `specs/007-d1-progreso-sincronizacion/`: `spec.md`, `plan-d1b.md`, `research-d1b.md`, `data-model-d1b.md`, `contracts/http-d1b.md`, `contracts/import-fixture.md` y `quickstart-d1b.md`. Lo que se hereda de D1a está en `plan.md` y sus contratos.

Las ondas, los dueños de los archivos, las interfaces y los puntos de sincronización (S0 a S3) están en [plan-d1b.md](./plan-d1b.md), «Reparto en paralelo». Cada línea remite al paso del plan con sus archivos, sus firmas y sus comandos.

- **`[P]`** marca lo que puede correr a la vez que otras tareas `[P]` de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea, aunque no esté en una fase de historia, para trazarla a la spec, como en D1a.
- **La base** es D1a con su S2 integrado.
- **Cada tarea** abre con sus pruebas y cierra con PHPStan en el nivel 9, o con `npm run lint` y `npm run typecheck` en TypeScript.

## Phase 1: Setup — Línea de base (coordinador, onda 0)

- [x] T001 [US7] Línea de base sobre `feat/d1a-sincronizacion` con su S2, el código `import_needs_confirmation` en `backend/api/app/Http/ApiCode.php` y `lang/es/api.php`, los limitadores `import` y `reset` en `backend/api/app/Http/ProgressLimiters.php`, el motivo como parámetro de `backend/api/app/Runs/Execution/ActiveRuns.php`, y los worktrees por dueño (FR-029, FR-036, FR-040, FR-041, FR-044, FR-059; plan 0.1)

## Phase 2: Foundational — Esquema, decodificación y fixture (dueños S, D y F, onda 1)

*S, D y F parten de S0. La cola de S es T002 a T004, y la de D, T005 y T006. F (T007) depende de F2 y se integra antes de S2. S1 son T002 a T006 integradas.*

- [x] T002 [P] [US7] Pruebas de esquema que fallan: `backend/api/tests/Feature/Progress/ImportSchemaTest.php` y `backend/api/tests/Content/ImportMigrationsTest.php` (FR-051 a FR-053, FR-084; SC-009; plan 1.1)
- [x] T003 [US7] Las migraciones `backend/api/database/migrations/2026_10_06_100011_create_progress_imports_table.php` y `…100012_create_campaign_seals_table.php`; si C3b está en la base, en el mismo commit: `UserTables`, `PopulatedAccount` y `ImportsSection` (FR-035, FR-051 a FR-053, FR-059; SC-009; plan 1.2)
- [x] T004 [US5] `backend/api/config/progress.php`, `campaign_seals` en `ProgressTables::STATE`, `ProgressInvariants` ampliada, y `AccountLock::peek` y `::reset` en `backend/api/app/Progress/AccountLock.php` (FR-037, FR-041, FR-058; plan 1.3)
- [x] T005 [P] [US1] `LegacyDecoder`, los tipos de `backend/api/app/Progress/Import/Legacy/`, el puerto `LegacyWriter` con `WrittenRows` y `backend/api/lang/es/import.php` (FR-024, FR-025, FR-032, FR-033; plan 2.1)
- [x] T006 [US1] `ImportContent` contra la base, en `backend/api/app/Progress/Import/ImportContent.php` (FR-024, FR-032; plan 2.2)
- [x] T007 [P] [US1] El fixture de importación congelado y su check: `qa/fixtures/shared/{import-cases.json,import-cases.sha256}`, `qa/lib/import-cases.ts`, `qa/import-cases-check.ts` y `qa/run-checks.ts` (FR-038, FR-039; SC-001; plan 3.1)

## Phase 3: User Story 1 y 5 — Importar y borrar todo (dueños W, I, R, P, O y S, onda 2)

*Parten de S1 y corren a la vez, con archivos disjuntos. I prueba contra falsos de `LegacyWriter` y `ChangesReader`. S2 son T007 a T016 integradas.*

- [x] T008 [P] [US1] `ImportSql` y `AttemptPointer` en `backend/api/app/Progress/Import/`, con el SQL exacto de las cuatro sentencias (FR-026, FR-035; plan 4.1)
- [x] T009 [US1] `LegacyAttempts` y `DatabaseLegacyWriter` en `backend/api/app/Progress/Import/`, contra MySQL real (FR-026, FR-027, FR-031, FR-032, FR-034, FR-035, FR-039, FR-053, FR-084; plan 4.2)
- [x] T010 [P] [US1] `ImportService`, `ImportLedger`, `ImportConflicts` e `ImportReport` en `backend/api/app/Progress/Import/`, con falsos de los dos puertos (FR-024, FR-027 a FR-030, FR-033, FR-034, FR-057, FR-084; plan 5.1)
- [x] T011 [US1] `POST /api/progress/import`: `ProgressImportController`, `ImportBodyRequest` y `backend/api/routes/api/progress-import.php` (FR-024, FR-025, FR-029, FR-030, FR-036, FR-057, FR-058; SC-008; plan 5.2)
- [x] T012 [P] [US5] `ProgressReset` en `backend/api/app/Progress/Reset/`, con la cancelación después del COMMIT (FR-040 a FR-045, FR-084; SC-005; plan 6.1)
- [x] T013 [US5] `POST /api/progress/reset`: `ProgressResetController`, `ResetBodyRequest` y `backend/api/routes/api/progress-reset.php` (FR-040, FR-057, FR-058; SC-005, SC-008; plan 6.2)
- [x] T014 [P] [US1] `V1Projection`, `LosslessNormalization` e `ImportCases` en `backend/api/tests/Support/`, con sus pruebas (FR-038, FR-039, FR-084; SC-001; plan 7.1)
- [x] T015 [P] [US7] La poda `progress:prune-import-payloads`: `ImportPayloadPruner`, `PruneImportPayloads` y su prueba (FR-028, FR-037, FR-055; plan 8.1)
- [x] T016 [P] [US1] La foto lee `campaign_seals` y muestra el grupo de repaso legado: `backend/api/app/Progress/Snapshot/{ProgressSnapshotReader,CampaignWire,ExerciseWire}.php` (FR-035; plan 9.1)

## Phase 4: Polish — Integración, punta a punta, Nginx, check, documentación y compuerta (coordinador y O, onda 3)

*Parte de S2. T017 a T019 son del coordinador; T020 es de O y parte de S3; T021 y T022 cierran.*

- [x] T017 [US1] Las líneas de integración: `backend/api/bootstrap/app.php`, `AppServiceProvider`, `routes/console.php` con `ScheduleTest`, `qa/lib/api-account.ts`, e `ImportResetWiringTest` (FR-055, FR-056; plan 10.1)
- [x] T018 [US1] Las pruebas con los servicios reales: `backend/api/tests/Content/ImportLosslessTest.php` (SC-001, con las mutaciones J1 a J6), `backend/api/tests/Feature/Progress/Import/` y `Reset/`, y `backend/api/tests/Concurrency/ImportResetConcurrencyTest.php` (FR-024 a FR-045, FR-053, FR-057, FR-084; SC-001, SC-005, SC-008; plan 10.2)
- [x] T019 [US7] `location = /api/progress/import` en `docker/nginx/nginx.conf`, `post_max_size` en `backend/api/docker/php.ini`, `qa/nginx-api-blocks-check.ts`, `backend/api/scripts/smoke.sh` y `PhpLimitsTest` (FR-036, FR-056; SC-008; plan 10.3)
- [x] T020 [P] [US1] El check de punta a punta con el stack, `qa/api-import-check.ts`, y `npm run api:import:check`, con la medición de la importación más grande (FR-087; SC-001, SC-005, SC-010; plan 10.4; quickstart-d1b.md, escenario 14)
- [x] T021 [US7] Documentación en `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md` y `qa/AGENTS.md` (plan 10.5)
- [x] T022 [US7] Compuerta final y evidencia de cierre: cada comando de SC-011, los escenarios de quickstart-d1b.md y la convergencia a mano sobre este archivo (FR-059, FR-088; SC-011; plan 10.6)
