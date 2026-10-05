# Tasks: C2 · Contenido en MySQL

**Input**: `specs/001-c2-contenido-mysql/` (`spec.md`, `plan.md` y `data-model.md`)

Ondas, dueños de archivos, interfaces y puntos de sincronización (S0, S1, S2): sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su fase: archivos disjuntos y ninguna tarea anterior sin cerrar; la cola de cada dueño es secuencial. Cada línea remite al paso del plan donde están los archivos, el código de referencia y los comandos, y lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec. FR-036 y el criterio J del DBA pasan a C3 y no tienen tareas acá.

## Phase 1: Setup — Base (coordinador, onda 0)

### Generador y meta (TypeScript, verificado; delegable en un agente de TypeScript)

- [x] T001 [P] [US5] Prueba que falla `qa/curriculum-meta-check.ts` y su registro en `qa/run-checks.ts` (FR-028, FR-029, SC-009; plan 1.1)
  - Commit: 7ea35ea
- [x] T002 [US5] Codemod de etapas en las 25 fichas de `content/workshops/`, `qa/fixtures/workshop-steps-v1.json`, y `tools/content/workshops.ts` y `load-curriculum.ts` leyendo las claves sin publicarlas (FR-029, FR-030, SC-009; plan 1.2)
  - Commit: 7ea35ea
- [x] T003 [US5] Meta del generador en `tools/content/{meta,catalogs,build-curriculum}.ts`: `portions`, huellas por ejercicio, claves de etapa y commit de origen (FR-028, FR-031, FR-032, FR-037; plan 1.3)
  - Commit: 7ea35ea
- [x] T004 [US5] Compuerta del generador: mismo sha256 de `build/curriculum.json` y de `dump-globals`; `npm run build` y `npm test` (FR-030, SC-006; plan 1.4)
  - Commit: 5c438c0

### Imagen y conexión

- [x] T005 [P] [US1] Prueba que falla `api/tests/Feature/ConnectionTest.php`: UTC, alias de upsert y `php` sin la espera acotada (FR-024, FR-041; plan 1.5)
  - Commit: b32c5a6
- [x] T006 [US1] `api/config/database.php`, `api/config/content.php`, `api/phpunit.xml` (suites `Unit` y `Content`) y `api/tests/Pest.php` (FR-041; plan 1.6)
  - Commit: b32c5a6
- [x] T007 [US6] Etapa `curriculum` en `api/Dockerfile` y `additional_contexts` con `CONTENT_SOURCE_COMMIT` en `compose.yaml`; la primera construcción descarga paquetes y pide permiso (FR-037, FR-045; plan 1.7)
  - Commit: 1da440e

## Phase 2: Foundational — Piezas en paralelo (onda 1: agentes A, B y C, cada uno en su worktree)

*Parten de la base (S0).*

### Agente A · Esquema

- [x] T008 [P] [US1] Pruebas de esquema que fallan: `ContentSchemaTest`, `SchemaBehaviorTest`, `MigrationsTest`, `LockWaitTest` y `ContentDatabase` en `api/tests/` (FR-041, FR-042, SC-007; plan 2.1)
  - Commit: 23c2e5b, e3da175
- [x] T009 [US1] Las 21 migraciones de `api/database/migrations/`, generadas desde `data-model.md` (FR-041; plan 2.2)
  - Commit: 23c2e5b
- [x] T010 [P] [US1] Medición de los cuatro casos de D07 en `api/tests/Content/OnlineDdlTest.php`, con `D07_MEASURED` fijado (FR-048; plan 2.3)
  - Commit: bbcdfeb

### Agente B · Formato y códecs

- [x] T011 [P] [US2] `PublishedJson` con `PublishedJsonTest` en `api/app/Content/` (FR-014; plan 3.1)
  - Commit: f00848f
- [x] T012 [P] [US2] `Portion` e `InvalidPortionRequest` con `PortionTest` (FR-013, FR-016; plan 3.2)
  - Commit: 681fec8
- [x] T013 [US1] `ContentSource`, `InvalidContent` y `ContentFixture` con `ContentSourceTest` y `ContentFixtureTest` (FR-006, FR-037; plan 3.3)
  - Commit: 7c5c2e9
- [x] T014 [US1] Códecs de `api/app/Content/Codec/`, `ContentTables`, `RowSet` y `ContentRows` con `ContentRowsTest` y `ContentRoundTripTest` (FR-005, FR-006, FR-031; plan 3.4)
  - Commit: c4533be
- [x] T015 [US2] `PortionAssembler`: las 17 porciones y los 274 ejercicios con las huellas del generador (FR-005, FR-014, FR-038, SC-001; plan 3.5)
  - Commit: d294821

### Agente C · Despliegue

- [x] T016 [P] [US6] `MigrateScriptTest` que falla y `api/docker/migrate.sh`, que reintenta sólo ante 1205 y 1213 (FR-033, FR-035, FR-042; plan 4.1)
  - Commit: e90986a, 787d757
- [x] T017 [P] [US6] `api/scripts/deploy-check.sh`: si `migrate` falla, `php` no se recrea (FR-034, FR-046; plan 4.2)
  - Commit: badef7b
- [x] T018 [P] [US3] `qa/api-content-check.ts`: las 17 porciones con y sin gzip, 304 débil y 40 clientes lentos (FR-047, SC-004; plan 4.3)
  - Commit: 15ec4a7

## Phase 3: User Stories — Import y entrega (onda 2: agentes W y E)

*Parten de A y B integrados (S1).*

### Agente W · Lectura de tablas e import

- [x] T019 [P] [US4] `ContentDiffTest` que falla; `ContentPlan`, `ContentReport`, `LatestImport` y `ContentDiff` (FR-002, FR-003, FR-009, FR-010, FR-027; plan 5.1)
  - Commit: dc35b77, e2ee086
- [x] T020 [P] [US1] Pruebas que fallan: `ImportContentTest` y `ContentContractTest` (FR-004, FR-007, FR-008, FR-032, FR-038, FR-039; plan 5.2)
  - Commit: 0ae0649, 1090b7b, 0d1e92f
- [x] T021 [US1] Lectura (`ContentReader`, `PortionRenderer`, `BodyCache`, `ContentImports`, `ContentSnapshot`) e import (`ContentStore`, `ContentWriter`, `ContentInvariants`, `ImportLock`, `ContentImporter`, `ImportContent`) (FR-001 a FR-012, FR-026, SC-002, SC-005, SC-008; plan 5.3)
  - Commit: c7d64fe, 0ae0649, ecc7690

### Agente E · Entrega

*Las pruebas con datos esperan S2: el import de W integrado en su worktree.*

- [x] T022 [P] [US3] `ContentEndpointTest` que falla (FR-040; plan 6.1)
  - Commit: a35f7fd, 2e11bf2, 60900c4
- [x] T023 [US2] `ApiError`, `ConditionalRequest`, `ContentDelivery`, `ContentController` y `routes/api.php` (FR-013 a FR-025, FR-044, SC-003, SC-004, SC-011; plan 6.2)
  - Commit: c2f5dee

## Phase 4: Polish — Integración y cierre (coordinador, onda 3)

- [x] T024 [US6] Servicio `migrate` en `compose.yaml` (`MYSQL_ATTR_INIT_COMMAND` y `migrate-and-import`) y `COPY` de `migrate.sh` en `api/Dockerfile` (FR-033, FR-034, FR-035; plan 7.1)
  - Commit: a2f16e1
- [x] T025 [US3] `package.json`: `npm run api:content:check` contra el stack levantado (FR-047; plan 7.2)
  - Commit: 8876ab9
- [x] T026 [P] Documentación en `README.md`, `qa/AGENTS.md`, `docs/architecture.md`, `api/AGENTS.md` y `api/scripts/smoke.sh` (FR-043; plan 7.3)
  - Commit: 2411ef4
- [x] T027 [US3] Medición del tmpfs de Nginx con 40 clientes lentos, con 24 MB y 100 MiB como máximo, y su comentario en `compose.yaml` (FR-047; plan 7.4)
  - Evidencia: medido sin cambios en compose.yaml: pico de /tmp 0 MB y de memoria 17,3 MiB con 40 clientes lentos
- [x] T028 Compuerta final: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run api:test`, `api:smoke`, `api:content:check` y `deploy-check.sh` (FR-043, FR-046, SC-006, SC-010; plan 7.5)
  - Commit: b955269 (despliegue con api/scripts/deploy.sh); arreglos de la revisión en 425b63f y 9156b44; compuerta en verde
