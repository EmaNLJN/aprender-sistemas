---
description: "Tareas de A4, el laboratorio con el sandbox propio: un registro liviano; el detalle está en plan.md"
---

# Tasks: A4 · Laboratorio con el sandbox propio

**Input**: `specs/017-a4-laboratorio-sandbox/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md` y `contracts/`)

## Phase 1: Setup

- [ ] T001 Base de integración (F7a, F11a, A3 y B3), firmas de R0 y línea base en `specs/017-a4-laboratorio-sandbox/research.md` (plan §0.1)

## Phase 2: Foundational (bloquea las historias)

- [ ] T002 [P] [US3] Pest rojas de `attemptId` en `backend/api/tests/Unit/Runs/RunPresenterTest.php` y `backend/api/tests/Feature/Runs/RunAttemptIdTest.php` (plan §1.1)
- [ ] T003 [US3] `attemptId` en `backend/api/app/Runs/RunPresenter.php` (plan §1.2)
- [ ] T004 [P] Refactor: el resultado con una sola forma, `LabResultV1`, en `frontend/src/entities/exercise/model/` (plan §2.1)
- [ ] T005 [US3] `sanitizeResult` conserva `attemptId` en `frontend/src/entities/exercise/model/lab-state.ts` (plan §2.2)
- [ ] T006 [P] [US6] `renderHarness` contra el fixture en `frontend/src/entities/exercise/model/render-harness.ts` (plan §2.3)
- [ ] T007 [US1] Las explicaciones del servidor en `diagnose` (`frontend/src/entities/exercise/model/server-explanations.ts`) (plan §2.4)

## Phase 3: User Story 1 y 2 - Ejecutar en el sandbox, sin aprobados falsos (Priority: P1)

- [ ] T008 [P] [US5] `quota` en el error de la API en `frontend/src/shared/api/http/` (plan §3.1)
- [ ] T009 [US2] `parseServerRun`, `verdictOfRun` y `withoutEvidence` en `frontend/src/features/run-exercise/api/` (plan §3.2)
- [ ] T010 [US4] El calendario, `retryHint` y `describeRunProgress` en `frontend/src/features/run-exercise/` (plan §3.3)
- [ ] T011 [US2] `decideSubmit` y `decidePoll` en `frontend/src/features/run-exercise/api/run-decisions.ts` (plan §3.4)
- [ ] T012 [US1] Specs rojas del adaptador y sus dobles en `frontend/src/features/run-exercise/api/` (plan §3.5)
- [ ] T013 [US1] El adaptador `createApiRunsTransport` en `frontend/src/features/run-exercise/api/api-runs-transport.ts` (plan §3.6)

## Phase 4: User Story 6 - La vista previa con la plantilla del servidor (Priority: P2)

- [ ] T014 [US6] La vista previa, el tope de 64 KiB y el índice en `frontend/src/features/run-exercise/` (plan §3.7)
- [ ] T015 [US6] La plantilla en la copia de A3 y `update` en `frontend/src/shared/api/content/` y `frontend/src/app/boot/content-stage.ts` (plan §3.8)
- [ ] T016 [US6] `createHarnessHolder` con `If-None-Match` en `frontend/src/shared/api/content/harness-holder.ts` (plan §3.9)
- [ ] T017 [US1] La composición en `frontend/src/app/lab/server-execution.ts` y `frontend/src/features/sign-in/requests.ts` (plan §3.10)

## Phase 5: User Story 8 - La red sigue protegiendo (Priority: P3)

- [ ] T018 [P] [US8] Los dobles: `qa/e2e/fixtures/api-double.ts`, `compiler-double.ts`, `qa/e2e/lib/compiler-results.ts`, `lab-copy.ts` y `qa/e2e/pages/lab.ts` (plan §4.1)
- [ ] T019 [US8] Las 20 E2E editadas, con la aprobación del usuario, y `qa/e2e/specs/lab-sandbox.spec.ts`, en rojo (plan §4.2)

## Phase 6: User Story 4, 5 y 7 - La espera, las cuotas y sin Playgrounds en la vista (Priority: P2)

- [ ] T020 [US1] `frontend/lab.js` compone el adaptador, la plantilla y la guarda; `qa/lab-state-check.ts` (plan §5.1)
- [ ] T021 [US7] Los textos sin el Playground y la línea de intentos en `frontend/lab.js` (plan §5.2)
- [ ] T022 [US4] La revisión en curso con la línea, el anuncio, la demora y el foco en `frontend/lab.js` (plan §5.3)

## Phase N: Polish

- [ ] T023 [P] `build-run-result.spec.ts` con valores escritos, sin `interpretRun` (plan §6.1)
- [ ] T024 Retiro del cliente de los Playgrounds, `buildProgram`, `interpretRun`, `runner-check` y `runtime-check` (plan §6.2)
- [ ] T025 [P] La CSP en `docker/nginx/nginx.conf` y la guarda de los hosts en `qa/nginx-api-blocks-check.ts` y `qa/build-check.ts` (plan §6.3)
- [ ] T026 [P] La medición de SC-007 en `qa/api-runs-check.ts` (plan §6.4)
- [ ] T027 La documentación: `AGENTS.md`, `README.md`, `qa/AGENTS.md`, `docs/architecture.md` y el ADR 0008 (plan §6.5)
- [ ] T028 La verificación contra el stack con gVisor, con el usuario (plan §6.6; `quickstart.md` §6)
- [ ] T029 Compuerta final y PR (plan §6.7; `quickstart.md` §7)
