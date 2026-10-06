# Tasks: B2 · API de ejecuciones

**Input**: `specs/005-b2-api-ejecuciones/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `reference-generator.md` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (A0 y S0 a S3) están en la sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su fase: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, sus firmas, su código de referencia y sus comandos. Como en C2 y C6, cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec. B2 parte de S2 de C3a (A0), no de su entrega. Todo el PHP, el SQL, el YAML y la configuración del plan son referencia sin ejecutar: cada tarea abre con sus pruebas y cierra con PHPStan en el nivel 9.

## Phase 1: Setup — Esquema, tipos, candado, generador y base de la imagen (onda 0: B y G a la vez, y después el coordinador)

*Parten de A0. T001 a T003 son la cola de B y T004 a T006 la de G. T007 parte cuando las dos entregaron. La suite de contenido de la API queda en rojo a propósito desde T005 hasta T009: la rama de S0 es la base de la onda 1 y no va sola a `master`.*

- [ ] T001 [P] [US2] Esquema: las siete migraciones `backend/api/database/migrations/2026_10_05_3000NN_*.php`, `backend/api/tests/Feature/Runs/SchemaTest.php`, `backend/api/tests/Content/RunsMigrationsTest.php`, `backend/api/tests/Support/RunInvariants.php` y la suite `Concurrency` en `phpunit.xml` y `tests/Pest.php` (FR-028, FR-029, FR-033, FR-043; SC-011; plan 0.1)
- [ ] T002 [US1] Tipos compartidos, `config/runs.php`, `RunLog` y `RunWorld`: enums, `Instant`, `RunRow`, `RunProgress`, `AttemptFacts`, `ExecutorResult`, `ExpectedEvidence`, `TestVerdict` y `Verdict` en `backend/api/app/Runs/`, `ProgressHead` en `app/Progress/` y sus pruebas (FR-009, FR-020, FR-042, FR-049; plan 0.2)
- [ ] T003 [US4] `AccountLock`, `AccountGone` y `ProgressHead`, el candado único de la cuenta que D1 reutiliza, con `Parallel` y su prueba de concurrencia (FR-015; SC-004; plan 0.3)
- [ ] T004 [P] [US6] Claves de prueba libres: `tools/content/exercises.ts`, `qa/content-check.ts` y `qa/content-exercises-check.ts` (FR-039; SC-010; plan 1.1)
- [ ] T005 [US6] El `grading_hash` con los `imports` de Go: `tools/content/meta.ts` y `qa/curriculum-meta-check.ts`; cambian 49 hashes y ninguno más (FR-037; SC-010; plan 1.2)
- [ ] T006 [US6] La plantilla del harness como 18.ª porción: `tools/content/harness.ts`, `content/harness/{rust,go}.tpl`, `qa/content-harness-check.ts` y el fixture `qa/fixtures/shared/harness-cases.json` (FR-035, FR-036; SC-009; plan 1.3)
- [ ] T007 [US7] La base de la imagen y las líneas de integración de S0: `backend/api/Dockerfile` (PCNTL, `harness.json` y el fixture), la conexión `runs` de `config/queue.php`, `bootstrap/app.php`, `ApiCode` con sus tres códigos y `lang/es/api.php` (FR-012, FR-013, FR-035, FR-049; plan 2.1)

## Phase 2: Foundational — Programa, contenido, cierre y camino del trabajo (onda 1: E, C y X a la vez)

*Parten de S0. Cada cola es secuencial y los archivos son disjuntos. Al llegar S1 están integradas T008 a T012.*

- [ ] T008 [P] [US1] El programa y la evidencia, puros: `backend/api/app/Runs/Program/` y `app/Runs/Evidence/{Evidence,EvidenceReader,ResultClassifier}.php`, con el fixture, la batería de SC-002 y la prueba de pureza (FR-004, FR-021, FR-022, FR-023, FR-036, FR-038; SC-001, SC-002, SC-009; plan 3.1)
- [ ] T009 [P] [US6] `harness` como 18.ª porción en `backend/api/app/Content/` y el mensaje nuevo del importador: `Portion`, `ContentTables`, `ContentSource`, `ContentRows`, `ContentReader`, `PortionAssembler`, `ContentInvariants` y `ContentDiff`, `GET /api/harness` y las pruebas que decían «17» o «21» (FR-035, FR-040; SC-009, SC-010; plan 4.1)
- [ ] T010 [P] [US2] El progreso y el cierre: `ProgressMerge`, `ProgressWriter`, `RunCloser`, `RunStore` y `RunWriteFailed` en `backend/api/app/Runs/Execution/`, con la prueba de concurrencia del cierre (FR-027, FR-030, FR-031, FR-032, FR-042; SC-006, SC-007; plan 5.1)
- [ ] T011 [US4] El reclamo, el reencolado y el trabajo: `RunClaimer`, `RunRequeuer`, el puerto `RunProcessor` y `backend/api/app/Jobs/ExecuteRun.php` (FR-013, FR-015, FR-016, FR-018, FR-019; plan 5.2)
- [ ] T012 [US5] La cancelación, el vencimiento y el listener: `RunCanceller`, `ActiveRuns`, `RunExpiry` y `CancelRunsOfRestrictedAccount`, y el evento de C3b si todavía no existe (FR-018, FR-026, FR-050; SC-007; plan 5.3)

## Phase 3: User Story 1, 3 y 4 - Ejecutar, admitir con cuotas y publicar (Priority: P1) — Ejecución y HTTP (onda 2: J y A a la vez)

*Parten de S1. J y A tienen archivos disjuntos. Al llegar S2 están integradas T013 a T017.*

- [ ] T013 [P] [US1] El cliente del ejecutor: `ReplyKind`, `ExecutorReply` y `ExecutorClient` en `backend/api/app/Runs/Execution/`, con qué prueba que no corrió (errno 6 y 7, y el 503) (FR-013, FR-016, FR-017; plan 6.1)
- [ ] T014 [US1] La ejecución de un trabajo: `RunExecution`, que implementa `RunProcessor`, con sus pruebas contra `Http::fake` y el log sin código (FR-013 a FR-017, FR-042; SC-005, SC-008; plan 6.2)
- [ ] T015 [US7] El barrido y la poda: `Uuid7Cutoff`, `RunPruner` y los comandos `runs:sweep` y `runs:prune` (FR-018, FR-044; plan 6.3)
- [ ] T016 [P] [US3] La admisión y las cuotas: `backend/api/app/Runs/Admission/` con `QuotaPolicy`, `RunAdmission` y `ExerciseReader`, con idempotencia y cuotas bajo concurrencia real (FR-002, FR-004 a FR-010, FR-019, FR-031; SC-003, SC-004; plan 7.1)
- [ ] T017 [US1] El HTTP: `RunController`, `SubmitRunRequest`, `RunReader`, `RunPresenter`, `RunLimiters` y `backend/api/routes/api/runs.php` (FR-001 a FR-003, FR-011, FR-024 a FR-026, FR-034, FR-041; SC-008; plan 7.2)

## Phase 4: Polish — Integración, operación, punta a punta, documentación y compuerta (onda 3: coordinador y O)

*Parte de S2. T018 y T019 son del coordinador; T020 es de O y espera a T019 y a T024 de C3a; T021 y T022 cierran.*

- [ ] T018 [US7] Las líneas de integración de S2: `AppServiceProvider` (el puerto, el clasificador, el limitador y el listener), `routes/console.php` con `ScheduleTest`, el grupo de `routes/api/harness.php`, `ContentEndpointTest` y `qa/api-content-check.ts`, con `WiringTest` y `TimeoutChainTest` (FR-013; plan 8.1)
- [ ] T019 [US7] La operación: `executor`, `worker-runs` y las imágenes del sandbox en `docker/compose.yaml`, la ubicación de `/api/runs` en `docker/nginx/nginx.conf`, `init-env.sh`, `deploy.sh`, `smoke.sh` y los checks `qa/nginx-api-blocks-check.ts` y `qa/compose-runs-check.ts` (FR-009, FR-012, FR-014, FR-045, FR-046; plan 8.2)
- [ ] T020 [US1] El check de punta a punta con el ejecutor real, `qa/api-runs-check.ts` y `npm run api:runs:check`: los 12 casos, las cuotas y el tope, el log y la medición de SC-012 (FR-048; SC-001, SC-003, SC-008, SC-012; plan 8.3; quickstart.md, escenario 6)
- [ ] T021 [US7] Documentación en `README.md`, `backend/api/AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` y `AGENTS.md` (plan 8.4)
- [ ] T022 [US7] Compuerta final y evidencia de cierre: cada comando de SC-013, los escenarios 7, 9 y 10 del quickstart y `/speckit-converge` (FR-047, FR-049; SC-005, SC-013; plan 8.5; quickstart.md)
