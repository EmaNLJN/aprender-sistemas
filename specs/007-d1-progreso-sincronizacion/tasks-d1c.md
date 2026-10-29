# Tasks: D1c · El cliente v2 del progreso

**Input**: `specs/007-d1-progreso-sincronizacion/` (`spec.md`, [plan-d1c.md](./plan-d1c.md), [research-d1c.md](./research-d1c.md), [data-model-d1c.md](./data-model-d1c.md), [contracts/sync-client-d1c.md](./contracts/sync-client-d1c.md) y [quickstart-d1c.md](./quickstart-d1c.md))

## Phase 1: Setup

- [ ] T001 Línea base, detecciones B1 a B10 e inventario de E2E para aprobar (plan-d1c.md §0)

## Phase 2: Foundational (bloquea las historias)

- [ ] T002 [P] `wellFormed` y `sha256Hex` en `frontend/src/shared/lib/`
- [ ] T003 Operaciones, estado, topes, textos y UUID en `frontend/src/features/progress-sync/model/`
- [ ] T004 Filas, contexto y traducción de la forma v1 a operaciones (`diff-progress.ts`)
- [ ] T005 De las filas a la forma v1 y el delta en la copia (`apply-rows.ts`, `merge-areas.ts`)
- [ ] T006 La cola (`queue.ts`)
- [ ] T007 El espacio de la cuenta y sus registros (`account-space.ts`, `sync-records.ts`)
- [ ] T008 La importación del v1 y la nueva corrección (`v1-import.ts`, `reevaluate.ts`)
- [ ] T009 Compuerta de U1
- [ ] T010 El transporte (`frontend/src/features/progress-sync/api/sync-transport.ts`)
- [ ] T011 El motor, su contexto de React y la API pública (`create-progress-sync.ts`, `index.ts`)
- [ ] T012 Compuerta de U2

## Phase 3: User Story 2 - Trabajo en dos dispositivos y todo converge (Priority: P1)

- [ ] T013 [P] [US2] La vinculación del almacenamiento (`shared/lib/progress-storage.ts`, `versioned-storage.ts`)
- [ ] T014 [US2] Las entidades exportan su clave y su parser; la guarda R4 admite el armado
- [ ] T015 [US2] La versión publicada, el contexto real y los adaptadores (`frontend/src/app/progress-sync/`)
- [ ] T016 [US2] El motor único y la etapa `progressStage`
- [ ] T017 [US2] La etapa en `main.tsx` y `load-order-check`, `afterPublish` y `boot-check`
- [ ] T018 [US2] Compuerta de U3

## Phase 4: User Story 1 - Mi progreso de hoy llega a mi cuenta sin perder nada (Priority: P1)

- [ ] T019 [US1] El armado de `progress-backup` con D1c (`frontend/src/app/progress-backup/with-progress-sync.ts`)

## Phase 5: User Story 3 - En una computadora compartida no se mezclan las cuentas (Priority: P1)

- [ ] T020 [US3] El puerto de «Salir» (`frontend/src/features/sign-in/model/sign-out.ts`, sus dos llamadores y `AccountRoot`)
- [ ] T021 [US3] El número de intentos vuelve a la revisión (D1c-6)
- [ ] T022 [US3] Compuerta de U4

## Phase 6: User Story 4 - Trabajo sin conexión y no pierdo nada (Priority: P2)

- [ ] T023 [US4] El doble de la API sincroniza y `StorageControl` traduce al espacio (`qa/e2e/fixtures/`)
- [ ] T024 [US4] Las ediciones de E2E aprobadas por el usuario, una por commit
- [ ] T025 [US4] Los E2E de D1c (`qa/e2e/specs/progress-sync.spec.ts`)
- [ ] T026 [US4] Compuerta de U5

## Phase 7: Polish

- [ ] T027 Documentación: `docs/architecture.md`, `qa/AGENTS.md` y `AGENTS.md`
- [ ] T028 Cierre: checks, tamaño, `api:sync:check` y `api:import:check` con permiso, y la verificación a mano de FR-086
