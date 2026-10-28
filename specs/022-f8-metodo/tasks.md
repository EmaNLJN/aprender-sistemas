---
description: "Tareas de F8, el port de Método"
---

# Tasks: F8 · El port de Método

**Input**: `specs/022-f8-metodo/` (`spec.md`, `plan.md`, `research.md`, `contracts/method-interfaces.md` y `quickstart.md`). El detalle de cada tarea está en el plan.

## Phase 1: Setup (U0)

- [ ] T001 La línea base, la detección de B1 a B10 y su registro en `specs/022-f8-metodo/research.md` (FR-004, FR-005, FR-043; SC-009)

## Phase 2: Foundational · los E2E contra el legacy (U1)

- [ ] T002 [P] El Page Object, su fixture y los archivos de importación en `qa/e2e/pages/method.ts`, `qa/e2e/lib/method-files.ts` y `qa/e2e/fixtures/index.ts` (FR-040)
- [ ] T003 [US1] [US2] [US4] [US5] Los flujos de Método, en verde contra el legacy, en `qa/e2e/specs/method-journal.spec.ts`, `method-files.spec.ts` y `method-reset.spec.ts` (FR-001, FR-013, FR-016, FR-017, FR-020, FR-021, FR-026 a FR-033, FR-038; SC-003, SC-004)
- [ ] T004 [US2] [US3] El foco y `#note-state` después de importar y de «Borrar todo», en rojo, en `qa/e2e/specs/method-kept-state.spec.ts` (FR-018, FR-019, FR-023, FR-028)

## Phase 3: El CSS sobre el DOM legacy (U2)

- [ ] T005 Las 24 reglas de Método van a `frontend/src/pages/method/ui/method.css`, con la clase `.routine-note` y las restricciones de `qa/load-order-check.ts` (FR-036, FR-037; SC-005)

## Phase 4: User Stories 1, 2, 4, 5 y 6 · el port con el borrado local (U3)

- [ ] T006 [P] [US1] El modelo de Método, en rojo, en `frontend/src/pages/method/model/method-texts.spec.ts` y `write-note.spec.ts` (FR-027, FR-028, FR-029, FR-039)
- [ ] T007 [US1] El modelo en `frontend/src/pages/method/model/method-texts.ts` y `write-note.ts`
- [ ] T008 [P] [US6] Las áreas del armado, R4 para el armado y su importación sin almacenamiento, en rojo, en `frontend/src/app/progress-backup/progress-areas.spec.ts`, `qa/seams-guard-check.ts` y `frontend/src/app/singletons-import.spec.ts` (FR-015, FR-039)
- [ ] T009 [US6] El armado y los tipos de Q1, en `frontend/src/app/progress-backup/progress-areas.ts` y `app-progress-backup.ts`, `features/progress-backup/model/types.ts` y `qa/lib/seams-guard.ts` (FR-015, FR-045)
- [ ] T010 [US1] [US2] [US4] [US5] La página, en rojo, en `frontend/src/pages/method/ui/method-page.spec.tsx`, con el doble y la ayuda de render (FR-007, FR-017, FR-018, FR-020, FR-022, FR-030, FR-031, FR-039)
- [ ] T011 [US1] [US2] [US4] [US5] La página sin montar, en `frontend/src/pages/method/ui/` y `lib/copy-with-fallback.ts`, y `downloadJsonFile` en `frontend/src/shared/lib/download-file.ts` (FR-007, FR-013, FR-026 a FR-036)
- [ ] T012 [US6] `app-shell-check` y `boot-check` arrancan `app.js` con su instancia, del mismo bundle, en `qa/lib/sources.ts`, `legacy-sources.ts`, `app-shell-harness.ts`, `qa/app-shell-check.ts` y `qa/boot-check.ts`; el escenario de la suscripción, en rojo (FR-033, FR-041, FR-046)
- [ ] T013 [US6] El corte: el adaptador `frontend/src/app/legacy/register-method.tsx`, `legacy-views.ts`, `frontend/app.js`, `frontend/src/index.html` y los checks de `qa/`, con la correspondencia de §3.9 (FR-008 a FR-014, FR-041, FR-045, FR-046; SC-006, SC-010)

## Phase 5: User Story 3 · «Borrar todo» con el servidor (U4)

- [ ] T014 [US3] «Borrar todo» con la contraseña y el reset, en rojo, en `qa/e2e/specs/method-reset-server.spec.ts`, el doble de la API y los E2E que cambian a propósito (FR-021 a FR-025, FR-040, FR-047 a FR-049; SC-013)
- [ ] T015 [P] [US3] El paso del servidor y su lugar en `resetAll`, en rojo, en `frontend/src/app/progress-backup/server-reset.spec.ts` y `features/progress-backup/model/progress-backup-edges.spec.ts` (FR-022, FR-024, FR-047, FR-048)
- [ ] T016 [US3] `resetWithServer` en `features/progress-backup/model/create-progress-backup.ts`, `server-reset.ts` y el paso en `app-progress-backup.ts` (FR-022, FR-024, FR-047 a FR-049)
- [ ] T017 [P] [US3] La confirmación con la contraseña, en rojo, en `frontend/src/pages/method/ui/reset-dialog.spec.tsx` (FR-021, FR-025, FR-039, FR-047)
- [ ] T018 [US3] La confirmación en `frontend/src/pages/method/ui/ResetDialog.tsx`, `ProgressPanel.tsx` y `MethodPage.tsx`, `readOnly` en `shared/ui/form` y `reloadDocument` en el adaptador (FR-021, FR-025, FR-034, FR-047)
- [ ] T019 [P] [US3] `boot-check` con el servidor: las rutas en `qa/lib/content-server.ts`, `cookie` en `boot-harness.ts` y el orden en `qa/boot-check.ts`, en rojo hasta T016 (FR-022, FR-041; SC-013)
- [ ] T020 La compuerta de U4 y la verificación a mano contra el stack (SC-001, SC-002)

## Phase 6: Polish (U5)

- [ ] T021 Las comparaciones únicas: el DOM, la confirmación después de Q1 y los bytes del archivo (FR-042; SC-003, SC-007)
- [ ] T022 La documentación en `docs/architecture.md` y `qa/AGENTS.md` (FR-044)
- [ ] T023 El peso, la compuerta final y el PR a `master` (FR-004, FR-006; SC-008, SC-011, SC-012)
