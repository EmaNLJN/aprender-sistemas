# Tasks: B3 · Auditoría local del currículo

**Input**: `specs/020-b3-auditoria-curriculo/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S3) están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite a su paso del plan, con sus archivos, sus firmas, su código de referencia y sus comandos. `[P]` marca la cabeza de una cola que puede correr a la vez que otras de su onda; la cola de cada dueño es secuencial. Cada tarea lleva su `[US#]` para trazarla a la spec. Todo el PHP, el YAML y el TypeScript del plan son referencia sin ejecutar: cada tarea abre con sus pruebas en rojo. Los bugs de contenido van a `.specify/bugs/<slug>/` con la extensión `bug`, no a este archivo.

## Phase 1: Setup — Línea base (coordinador K, onda 0)

- [ ] T001 [US1] K · Línea base de checks y de Pest, el host (imágenes y runsc) y el ejemplo del informe en `qa/fixtures/shared/audit-report-example.json` (FR-019, FR-035; plan 0.1)

## Phase 2: Foundational — El cliente de B2 y los tipos (onda 1)

- [ ] T002 [P] [US1] P · `ExecutorClient` expone `prepare`, `body` y `read` sin cambiar `send`, con `tests/Feature/Runs/Execution/ExecutorClientPoolTest.php` y `ExecutorClientTest.php` sin tocar (FR-003, FR-008; plan 1.1)
- [ ] T003 [US1] P · `config/audit.php`, los enums, `CustomTestProbe`, `AuditedExercise`, `AuditCatalog`, `AuditProgram`, `PhaseTiming`, `AuditLimits` y `AuditRefused` en `backend/api/app/Audit/`, con `tests/Unit/Audit/{AuditConfigTest,AuditTypesTest}.php`; su integración es S1 (FR-016, FR-022, FR-023, FR-034; plan 1.2)

## Phase 3: User Story 1 - Auditar el currículo entero en el sandbox propio (Priority: P1) — onda 2

- [ ] T004 [US1] P · `AuditCatalogReader` y `tests/Support/AuditWorld.php`, con `tests/Feature/Audit/AuditCatalogReaderTest.php` (FR-001, FR-003, FR-012, FR-013, FR-020; plan 1.3)
- [ ] T005 [US1] P · `AuditSelection` y `AuditPlan`, con `tests/Feature/Audit/AuditPlanTest.php` (FR-002, FR-003, FR-015, FR-034; SC-004; plan 1.4)

## Phase 4: User Story 2 - Saber qué falló, corregirlo y volver a correr (Priority: P1) — onda 2

- [ ] T006 [P] [US2] J · `Diagnostic`, `JudgedProgram` y `ProgramJudge`, con `tests/Support/AuditCases.php` y `tests/Unit/Audit/ProgramJudgeTest.php` (FR-005 a FR-007, FR-022 a FR-025, FR-030; SC-002; plan 1.5)
- [ ] T007 [US2] P · `ExecutorDispatcher` y `tests/Support/AuditExecutorDouble.php`, con `tests/Feature/Audit/ExecutorDispatcherTest.php` (FR-008, FR-016; plan 1.6)
- [ ] T008 [US3] P · `ExecutorPreflight` y `AuditLock`, con `tests/Feature/Audit/AuditGuardsTest.php` (FR-013; plan 1.7)
- [ ] T009 [US2] J · `HostStamps`, `AuditRun`, `AuditReport` y `AuditReportText`, con `tests/Unit/Audit/AuditReportTest.php` contra el ejemplo escrito a mano; con T004 a T008, su integración es S2 (FR-014, FR-017 a FR-020, FR-022, FR-026; plan 1.8)

## Phase 5: User Story 3 - Auditar sin tocar a los alumnos (Priority: P1) — ondas 1 y 3

- [ ] T010 [US1] P · `AuditRunner` y `php artisan curriculum:audit` en `backend/api/app/Console/Commands/AuditCurriculum.php`, con `tests/Feature/Audit/AuditCommandTest.php` y `tests/Unit/Audit/AuditArchTest.php` (FR-004, FR-009, FR-012 a FR-018, FR-034, FR-035; SC-002, SC-003, SC-007; plan 1.9)
- [ ] T014 [P] [US3] K · `x-executor-base`, `executor-audit`, `audit` y la red `audit` en `docker/compose.yaml`, con `qa/compose-runs-check.ts`; la entrada `qa/curriculum-audit.ts`, `api:audit` y `audit:gate` en `package.json`, y `qa/curriculum-audit/` en `.gitignore` y `.dockerignore` (FR-009 a FR-011, FR-016, FR-020, FR-021, FR-025; plan 3.1)

## Phase 6: User Story 5 - Una compuerta que se puede comprobar (Priority: P2) — onda 1

- [ ] T012 [US5] Q · `qa/lib/{audit-surface,audit-summary,content-stamps}.ts` y `qa/audit-summary-check.ts` con sus 14 escenarios, en `qa/run-checks.ts` (FR-021, FR-032, FR-038; SC-004, SC-009; plan 2.2)
- [ ] T013 [US5] Q · `qa/audit-summary-gate.ts` y `.github/workflows/audit-summary.yml` (FR-038; plan 2.3)

## Phase 7: User Story 6 - El caché de Go sigue a los `imports` (Priority: P3) — onda 1

- [ ] T011 [P] [US6] Q · `qa/lib/go-warm-cache.ts` y `qa/go-warm-cache-check.ts`, en el grupo de operación de `qa/run-checks.ts` (FR-027, FR-036; SC-006; plan 2.1)

## Phase 8: Polish — Documentación y entrega (coordinador K, desde S3)

- [ ] T015 [US5] K · Documentación: `backend/api/AGENTS.md`, `README.md`, `qa/AGENTS.md`, `backend/executor/AGENTS.md`, `AGENTS.md`, `docs/architecture.md` y la enmienda (plan B3) del ADR 0005 (FR-011, FR-028, FR-032, FR-033; plan 3.2)
- [ ] T016 [US4] K · Primera corrida de registro con runsc: las imágenes reconstruidas, SC-003 (cuentas, señuelo y redes) y las cifras de SC-005 en el PR (FR-014, FR-024, FR-031; SC-003, SC-005; plan 4.1; quickstart §2 a §4)
- [ ] T017 [US2] K · Los hallazgos de T016 (se esperan `rust-63` y `rust-71`) como bugs en `.specify/bugs/<slug>/`, corregidos en `content/` y verificados con una corrida parcial (FR-029 a FR-031; plan 4.2; quickstart §6)
- [ ] T018 [US1] K · Corrida completa de registro en verde con el árbol limpio, `audit:gate`, SC-004, SC-006, SC-008, el PR con el resumen y B3 `Entregado` para A4 (FR-031, FR-032, FR-037; SC-001, SC-004, SC-006 a SC-008; plan 4.3; quickstart §5 y §7)
