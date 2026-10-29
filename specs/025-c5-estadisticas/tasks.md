# Tasks: C5 · Estadísticas del admin

**Input**: `specs/025-c5-estadisticas/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/http.md` y `quickstart.md`)

Las tareas son secuenciales: comparten las rutas, los controladores y cuatro pruebas de C3b que fijan conteos (plan, «Unidades, orden y modo de ejecución»). Cada línea remite a su tarea del plan, con sus archivos, sus interfaces y su código de referencia sin ejecutar. T001, T014, T017, T018 y las líneas de `docker/compose.yaml` y `package.json` de T012 y T016 son del coordinador. Las tres decisiones del plan las tomó el usuario el 2026-10-28 (plan, «Decisiones del usuario»): D1, la escala de T017; D2, los comandos en la imagen; D3, `usage: null` en la ficha de una cuenta en supresión.

## Phase 1: Setup — La base (U1)

- [ ] T001 La línea de base: la suite de la API, PHPStan y los cuatro conteos de C3b que cambia el plan (plan T001)
- [ ] T002 [US1] El período y sus intervalos locales: `backend/api/config/stats.php`, `app/Stats/Granularity.php`, `app/Stats/Period.php` y `tests/Unit/Stats/PeriodTest.php` (FR-023; plan T002)
- [ ] T003 [US2] La mediana y el percentil: `backend/api/app/Stats/Median.php`, `Percentile.php` y sus pruebas (FR-011, FR-025, FR-033; plan T003)
- [ ] T004 [US6] El portón `StatsRows`, el 503 `stats_timeout` y `StatsCache`, con `ApiCode`, `lang/es/api.php`, `ApiCodeTest` y la prueba por HTTP del tope (FR-034, FR-036; SC-007; plan T004)

## Phase 2: User Story 1 y 2 - Los agregados (Priority: P1) (U2)

- [ ] T005 [US1] `StatsWorld`, `StatsSql`, `AttemptCounts`, `Moment`, `OverviewReader`, `StatsPeriodRequest` y `StatsController::overview`, la ruta, y la matriz de C3b con las claves y los testigos nuevos (FR-001 a FR-003, FR-013, FR-016 a FR-023; SC-001, SC-002; plan T005)
- [ ] T006 [US2] `ContentFilters`, `CatalogStats`, `ExerciseStats`, `ContentStatsReader`, `ContentStatsRequest` y la ruta `stats/exercises` (FR-024 a FR-027; SC-001; plan T006)
- [ ] T007 [US2] `CampaignStats`, `WorkshopStats` y `RouteStats` en `backend/api/app/Stats/Content/` (FR-027, FR-028; SC-001; plan T007)

## Phase 3: User Story 4 - Por cuenta (Priority: P2) (U3)

- [ ] T008 [US4] `StudentFilters`, `StudentDirectory`, `ListStudentsRequest` y la ruta `stats/students` (FR-029, FR-037; SC-001; plan T008)
- [ ] T009 [US4] `StudentDetailReader`, `StudentAccessLog`, la ruta `stats/students/{user}` y su escenario en la matriz (FR-009, FR-015, FR-017, FR-030, FR-035; SC-004, SC-005; plan T009)
- [ ] T010 [US4] `UsageSummary` y `usage` en `UserController::show`, nulo para una cuenta en supresión (D3), con `UserShowTest` (FR-015, FR-017, FR-031; SC-004, SC-005; plan T010)

## Phase 4: User Story 5 - La operación (Priority: P2) (U4)

- [ ] T011 [US5] `RunFilters`, `RunMetadataReader`, `ListRunsRequest` y `OperationsController::runs` (FR-010, FR-012, FR-015, FR-032; SC-002, SC-005; plan T011)
- [ ] T012 [US5] `QueueReader`, `OperationsController::queue`, `executor.slots` en `config/runs.php` y `EXECUTOR_MAX_CONCURRENT` para `php` en `docker/compose.yaml` (FR-033; plan T012)

## Phase 5: User Story 3 y 6 - El límite (Priority: P1 y P3) (U5)

- [ ] T013 [US3] `tests/Unit/Stats/StatsArchTest.php` y `tests/Feature/Stats/StatsReadOnlyTest.php` (FR-004, FR-006, FR-007, FR-008, FR-014, FR-036; SC-003, SC-006; plan T013)
- [ ] T014 La sección «Estadísticas del admin (C5)» en `backend/api/AGENTS.md` (FR-042; plan T014)

## Phase 6: User Story 6 - La medición (Priority: P3) (U6)

- [ ] T015 [US6] `BenchDatabase`, `SyntheticPopulation` y `stats:synthesize`, en la imagen y con su guarda (D2) (FR-038; plan T015)
- [ ] T016 [US6] `stats:measure`, `backend/api/scripts/stats-bench.sh`, el perfil `stats-bench` de Compose y `api:stats:bench` (FR-038; plan T016)
- [ ] T017 [US6] Correr la medición a escala completa si el disco lo permite, o con `--per-day=7500` extrapolando (D1), después del permiso de disco y de tiempo del usuario; y, si el criterio lo pide, los índices de `attempts` con `SchemaTest` (FR-005, FR-039, FR-040; SC-008; plan T017)

## Phase 7: Polish

- [ ] T018 La compuerta final, la comparación con la línea de base y la descripción del PR (FR-041, FR-042; SC-009; plan T018)
