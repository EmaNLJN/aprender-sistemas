# Tasks: D1a · Sincronización del servidor

**Input**: `specs/007-d1-progreso-sincronizacion/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `reference-merge.md` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S3) están en la sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, sus firmas y sus comandos. Como en C2, C3a y B2, cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec. D1a parte de C3a entregada y de B2 hasta su punto S1. Todo el PHP, el SQL y la configuración del plan son referencia sin ejecutar; el TypeScript de `reference-merge.md` sí se ejecutó. Cada tarea abre con sus pruebas y cierra con PHPStan en el nivel 9 (o con `npm run lint` y `typecheck` en TypeScript).

## Phase 1: Setup — Línea de base (coordinador, onda 0)

- [x] T001 [US7] Línea de base: C3a entregada y B2 hasta S1 integrados, suite en verde, el bloque de migraciones `2026_10_06_100001` a `100099` reservado, la línea del Dockerfile que copia `qa/fixtures/shared/` confirmada, los códigos `epoch_mismatch` y `client_outdated` en `ApiCode`, `lang/es/api.php` y `ApiCodeTest`, y los worktrees por dueño (FR-018, FR-059, FR-083; plan 0.1)

## Phase 2: Foundational — Esquema, fixture, contenido y operaciones puras (dueños S, F, C y M, onda 1)

*S, F, C y M parten de S0 y corren a la vez. La cola de S es T002 a T004, la de F, T005 y T006, la de C, T007 y T008 (juntas, sin llevar T007 sola a `master`), y la de M, T009. S1 son T002 a T006 y T009 integrados.*

- [x] T002 [P] [US7] Pruebas de esquema y de D32 que fallan: `backend/api/tests/Feature/Progress/SchemaTest.php` y `backend/api/tests/Content/{ProgressMigrationsTest,ProgressEnumFkTest}.php` (FR-011, FR-051 a FR-053, FR-084; SC-009; plan 1.1)
- [x] T003 [US7] Las diez migraciones `backend/api/database/migrations/2026_10_06_1000NN_*.php`, con el tipo de `language` que decidió D32 (FR-051 a FR-053, FR-059; SC-009; plan 1.2)
- [x] T004 [US7] `backend/api/config/progress.php`, `ProgressTables`, `ContentNotImported`, `ProgressWorld` y `ProgressInvariants` con sus pruebas (FR-051, FR-052; plan 1.3)
- [x] T005 [P] [US2] El fixture compartido congelado y sus checks: `qa/fixtures/shared/{merge-cases.json,merge-cases.sha256,route-milestones.json}`, `qa/lib/merge-fixture.ts`, `qa/merge-fixture-check.ts`, `qa/route-milestones-check.ts` y `qa/run-checks.ts` (FR-001, FR-003, FR-080 a FR-083; SC-002; plan 2.1)
- [x] T006 [US2] El módulo de fusión en TypeScript `frontend/src/features/progress-sync/model/{merge-rules,field-kinds}.ts`, con las mutaciones M1 a M8 (FR-001, FR-003, FR-080 a FR-082; SC-002; plan 2.2)
- [x] T007 [P] [US6] El id de etapa en el generador: `tools/content/workshops.ts`, `qa/content-records-check.ts`, `qa/curriculum-meta-check.ts` y la comparación de una vez (FR-046 a FR-049; SC-007; plan 3.1)
- [x] T008 [US6] El id de etapa en PHP: `backend/api/app/Content/Record/WorkshopStep.php`, `WorkshopRecordsTest`, `ContentRoundTripTest`, `ContentFixture` e `ImportContentTest`, con el primer import de 100 filas (FR-046 a FR-050; SC-007; plan 3.2)
- [x] T009 [P] [US2] Operaciones puras: `backend/api/app/Progress/Operations/` (catálogo de dieciséis tipos, decodificación, hash, hitos y el puerto `OperationProcessor`) y `backend/api/app/Progress/Merge/UpsertSql.php`, con sus pruebas unitarias (FR-001, FR-005, FR-006, FR-008, FR-009; plan 4.1)

## Phase 3: User Story 2 y 6 — Sincronizar y leer (dueños M, L, Y y O, onda 2)

*Parten de S1 y corren a la vez, con archivos disjuntos. Y prueba contra puertos falsos de M y de L. S2 son T010 a T014 integrados.*

- [x] T010 [P] [US2] `DatabaseOperationProcessor`, `ContentLookup` y `OperationWriter`, con `AffectedRowsTest`, `MergeFixtureTest` (275 casos contra MySQL real), `ContentLookupTest` y `OperationWriterTest`, y las mutaciones M1 a M6 y M8 a M10 (FR-001, FR-003, FR-005 a FR-010, FR-051, FR-052, FR-080 a FR-082, FR-084; SC-002; plan 4.2)
- [x] T011 [P] [US2] `ProgressSnapshotReader`, `ChangesReader` y `GET /api/progress` con `backend/api/routes/api/progress.php`: la foto, el delta, el validador y el 304 (FR-017, FR-019 a FR-023, FR-054, FR-084; SC-006; plan 5.1)
- [x] T012 [P] [US2] `SyncService`, `ClockCorrection` y el registro de UUID en `backend/api/app/Progress/Sync/`, con puertos falsos (FR-002, FR-004, FR-007, FR-010, FR-013 a FR-019, FR-023, FR-058, FR-084; SC-003; plan 6.1)
- [x] T013 [US2] `POST /api/sync`: `SyncController`, `SyncBodyRequest`, `ProgressLimiters` y `backend/api/routes/api/sync.php` (FR-012, FR-015, FR-018, FR-056 a FR-058; SC-008; plan 6.2)
- [x] T014 [P] [US7] La poda `progress:prune-sync-operations`: `SyncOperationsPruner`, `PruneSyncOperations` y su prueba (FR-014, FR-055, FR-084; plan 7.1)

## Phase 4: Polish — Integración, punta a punta, Nginx, check con el stack, documentación y compuerta (coordinador y O, onda 3)

*Parte de S2. T015 a T017 son del coordinador; T018 es de O y parte de S3 y de T024 de C3a; T019 y T020 cierran.*

- [x] T015 [US2] Las líneas de integración: `backend/api/bootstrap/app.php`, `AppServiceProvider`, `routes/console.php` con `ScheduleTest` y `UserData` si existe, y `WiringTest` (FR-055, FR-056; plan 8.1)
- [x] T016 [US2] Las pruebas con los servicios reales en `backend/api/tests/Feature/Progress/` y `backend/api/tests/Concurrency/SyncConcurrencyTest.php`: los escenarios de US2, los 43 casos del servidor, la foto más el delta, el texto intacto, los registros sin texto, la matriz de acceso, el límite y la concurrencia (FR-002, FR-004, FR-005, FR-007 a FR-014, FR-016 a FR-018, FR-054, FR-055, FR-057, FR-082, FR-084; SC-002, SC-003, SC-006, SC-008; plan 8.2)
- [x] T017 [US7] La ubicación de `/api/sync` en `docker/nginx/nginx.conf`, con `qa/nginx-api-blocks-check.ts` y `backend/api/scripts/smoke.sh` (FR-018, FR-056; SC-008; plan 8.3)
- [x] T018 [P] [US2] El check de punta a punta con dos clientes: `qa/api-sync-check.ts` y `npm run api:sync:check`, con la convergencia de SC-002 y la medición de SC-010 (FR-087; SC-002, SC-003, SC-006, SC-010; plan 8.4; quickstart.md, escenarios 4 a 12)
- [x] T019 [US7] Documentación en `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md` y `qa/AGENTS.md` (plan 8.5)
- [x] T020 [US7] Compuerta final y evidencia de cierre: cada comando de SC-011, los escenarios 1 y 3 del quickstart y `/speckit-converge` (FR-050, FR-059, FR-088; SC-007, SC-011; plan 8.6; quickstart.md)
