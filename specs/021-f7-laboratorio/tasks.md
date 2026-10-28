---
description: "Tareas de F7a, el laboratorio sin vista nueva: un registro liviano; el detalle está en plan.md"
---

# Tasks: F7a · El laboratorio sin vista nueva

**Input**: `specs/021-f7-laboratorio/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/run-exercise.md`). F7b va en `tasks-f7b.md`.

## Phase 1: Setup

- [ ] T001 Línea base sobre `master` con F2a, A2 y F2b: medir y anotar en `specs/021-f7-laboratorio/research.md` (plan §0.1)

## Phase 2: Foundational (la red contra el legacy, antes de tocar `frontend/lab.js`)

- [ ] T002 [P] Page Object y dobles: `qa/e2e/pages/lab.ts`, `qa/e2e/fixtures/compiler-double.ts`, `qa/e2e/lib/compiler-results.ts` y `qa/e2e/lib/lab-copy.ts` (plan §1.1)
- [ ] T003 [P] [US1] E2E del mapa contra el legacy en `qa/e2e/specs/lab-map.spec.ts` (plan §1.2)
- [ ] T004 [P] [US2] E2E de las tres fases contra el legacy en `qa/e2e/specs/lab-exercise.spec.ts` (plan §1.3)
- [ ] T005 [P] [US2] E2E de la ejecución contra el legacy en `qa/e2e/specs/lab-run.spec.ts` (plan §1.4)
- [ ] T006 [P] [US4] E2E de lo guardado y de las fixtures congeladas en `qa/e2e/specs/lab-storage.spec.ts` (plan §1.5)
- [ ] T007 [P] [US5] E2E de los nueve exploradores en `qa/e2e/specs/lab-explorers.spec.ts` (plan §1.6)

## Phase 3: User Story 6 - El transporte como puerto, con las reglas y los selectores que usa la vista (Priority: P2)

- [ ] T008 [P] [US6] Specs rojas de `diagnose`, `liveHint`, los selectores, los parches, `reviewStateOf` y `readTestMarkers` en `frontend/src/entities/exercise/model/` (plan §2.1)
- [ ] T009 [US6] Las reglas en `frontend/src/entities/exercise/model/` y su índice (plan §2.2)
- [ ] T010 [P] [US1] Selectores del mapa en `frontend/src/pages/lab/model/map-selectors.ts` y `frontend/src/pages/lab/index.ts`, con su spec roja y después la implementación (plan §2.3)
- [ ] T011 [US6] Contrato, stubs y specs rojas de `frontend/src/features/run-exercise/` (plan §3.1)
- [ ] T012 [US6] `features/run-exercise`: el armado del `result`, la orquestación y el adaptador de los Playgrounds (plan §3.2)

## Phase 4: User Story 7 - `lab.js` como raíz de composición y el retiro de `TallerRunner` (Priority: P3)

- [ ] T013 [US7] `frontend/lab.js` usa las reglas y los selectores (plan §4.1)
- [ ] T014 [US7] `frontend/lab.js` compone `features/run-exercise`; `qa/lab-state-check.ts` ejecuta por `fetch` y suma el reset durante una ejecución (plan §4.2)
- [ ] T015 [US7] Retirar `frontend/src/app/legacy/register-runner.ts` y su línea de `legacy-views.ts`; re-apuntar `qa/runner-check.ts`; el aislamiento de `lab.js` en `qa/lab-state-check.ts` (plan §4.3)

## Phase N: Polish

- [ ] T016 Documentación: `docs/architecture.md` y `qa/AGENTS.md` (plan §5.1)
- [ ] T017 Compuerta final y PR (plan §5.2 y quickstart.md §5)
