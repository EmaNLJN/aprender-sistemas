# Tasks: C6 · Registros tipados del contenido

**Input**: `specs/002-c6-registros-tipados/` (`spec.md`, `plan.md`, `research.md`, `data-model.md` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S3) están en la sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su fase: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, su código de referencia y sus comandos. Como en C2, cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec.

## Phase 1: Setup — El oráculo de filas (dueño B, onda 0)

- [ ] T001 [US2] Oráculo de filas de C2, en su propio commit y antes de cualquier cambio en `app/`: `backend/api/tests/Support/{RowOracle.php,ContentPipeline.php,print-row-oracle.php,row-oracle.json}` y `backend/api/tests/Unit/RowOracleTest.php` (FR-006, FR-016, FR-018; plan 1.1)

## Phase 2: Foundational — Lectores, meta, piloto y bordes (onda 1: B y E a la vez)

*Parten de S0. La cola de B es secuencial; E corre a la vez.*

- [ ] T002 [US3] Lectores `KeyOrder`, `JsonValue`, `DocumentFields` y `RowFields` en `backend/api/app/Content/Record/`, con sus pruebas en `backend/api/tests/Unit/Record/` (FR-003, FR-004, FR-007, FR-008; plan 1.2)
- [ ] T003 [US3] Meta tipado: `backend/api/app/Content/ContentMeta.php` y `Record/{Catalog,StepKey,ExerciseHashes,Language}.php`, con `ContentMetaTest`. Lo usan `ContentSource`, `ContentRows`, `ContentImporter`, `ContentWriter` y `ContentDiff`, y las pruebas leen el meta como archivo (FR-001, FR-008, FR-016; plan 1.3)
- [ ] T004 [US3] Piloto `backend/api/app/Content/Record/AtlasConcept.php` con `AtlasRecordsTest`. Lo usan `ContentRows` y `PortionAssembler`, se borra `Codec/AtlasCodec.php` y las pruebas construyen con `ContentPipeline` (FR-001 a FR-005, FR-017; plan 1.4)
- [ ] T005 [P] [US4] Bordes del nivel 9, sin cambios de comportamiento: `backend/api/app/Content/{ContentSnapshot,ImportLock,BodyCache,Portion,ContentTables,ContentImports}.php` y `backend/api/app/Console/Commands/ImportContent.php`, de 28 errores a 0 (FR-012; plan 2.1)

## Phase 3: User Story 3 - Un dato mal escrito no pasa (Priority: P1) — Familias de registros (onda 2: R1 a R4 a la vez)

*Parten de S1, con T004 integrado. Sólo tocan `Record/` y sus pruebas.*

- [ ] T006 [P] [US3] Mundos: `backend/api/app/Content/Record/{World,WorldExercise,WorldRole}.php` y `backend/api/tests/Unit/Record/WorldRecordsTest.php` (FR-001, FR-002, FR-004, FR-007, FR-008, FR-017; plan 3.1)
- [ ] T007 [P] [US3] Ejercicios: `backend/api/app/Content/Record/{Exercise,ExerciseTest,ExerciseHint,Topic}.php` y `backend/api/tests/Unit/Record/ExerciseRecordsTest.php` (FR-001, FR-002, FR-004, FR-007, FR-008, FR-017; plan 3.2)
- [ ] T008 [P] [US3] Talleres: `backend/api/app/Content/Record/{Workshop,WorkshopObjective,WorkshopStep,WorkshopRelatedExercise}.php` y `backend/api/tests/Unit/Record/WorkshopRecordsTest.php` (FR-001, FR-002, FR-004, FR-007, FR-008, FR-017; plan 3.3)
- [ ] T009 [P] [US3] Guía: `backend/api/app/Content/Record/{Guide,GuideResource,GuideSource,GuideTrack,GuideModule,GuideStep,GuideStepResource}.php` y `backend/api/tests/Unit/Record/GuideRecordsTest.php` (FR-001, FR-002, FR-004, FR-007, FR-008, FR-017; plan 3.4)

## Phase 4: User Story 2 - El import se comporta igual (Priority: P1) — Integración del import (onda 3: W)

*Parte de S2, con T005 a T009 integrados.*

- [ ] T010 [US2] `backend/api/app/Content/ContentRows.php` arma los registros con `rowsByTable()`, y `ContentDiff` y `ContentWriter` estrechan sus columnas, con el oráculo de filas como juez (FR-006, FR-008, FR-009, FR-010, FR-012, FR-018; SC-003; plan 4.1)

## Phase 5: User Story 1 - Nada cambia para quien consume el contenido (Priority: P1) — Integración de la entrega (onda 3: W)

- [ ] T011 [US1] `PortionAssembler`, `PortionRenderer`, `ContentReader` y `JsonDiff` arman registros, y se borra `backend/api/app/Content/Codec/` (FR-005, FR-011, FR-012, FR-015; SC-001; plan 4.2)

## Phase 6: User Story 4 - El análisis estático sube de nivel y se queda ahí (Priority: P2) — Nivel 9 y documentación (onda 4: coordinador)

*Parte de S3, con T011 integrado, y de C3 si ya se integró.*

- [ ] T012 [US4] `backend/api/phpstan.neon` en el nivel 9, y `backend/api/config/filesystems.php`: `npm run api:analyse` sin errores, sin baseline ni ignores, y `composer.json` sin cambios (FR-012, FR-014; SC-004, SC-006; plan 5.1)
- [ ] T013 [P] [US4] Documentación del nivel nuevo en `backend/api/AGENTS.md`, `docs/agent-skills.md` y `docs/architecture.md` (FR-013; plan 5.2)

## Phase 7: Polish — Mutaciones, despliegue sobre C2, compuerta y retiro del oráculo (coordinador)

- [ ] T014 [US3] Mutaciones: un nombre mal escrito por familia, 5 de 5 detectadas por `npm run api:analyse` (SC-005; plan 5.3; quickstart.md, escenario 3)
- [ ] T015 [US1] Despliegue de la imagen nueva sobre un stack que importó el código de C2, y compuerta final (FR-019; SC-001, SC-002, SC-003, SC-007; plan 5.4; quickstart.md, escenarios 4 y 5)
- [ ] T016 [US2] Retiro del oráculo, después de T015: `backend/api/tests/Support/{RowOracle.php,print-row-oracle.php,row-oracle.json}` y `backend/api/tests/Unit/RowOracleTest.php` (research.md, R7; plan 5.5)
