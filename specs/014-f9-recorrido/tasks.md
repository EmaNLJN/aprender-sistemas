# Tasks: F9 · Port de Recorrido a React

**Input**: `specs/014-f9-recorrido/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/taller-route.md`)

Las ondas, los dueños de los archivos, las interfaces y los puntos de sincronización (S0 a S3) están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite a la tarea del plan, con sus archivos, su código y sus comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda.
- **`[US#]`** va en cada tarea para trazarla a la spec.
- **Las pruebas no son opcionales** (constitución, principio II). La red E2E va primero y contra el legacy; cada módulo, con su spec en rojo.
- **Un solo PR** con todas las tareas, en este orden de commits.

## Phase 1: Setup — Línea base y pila (coordinador K, onda 0)

- [ ] T001 [US5] K · Línea base, worktree de la base y la rama de cada fila de «Lo compartido con F3, F4 y F8», en `specs/014-f9-recorrido/research.md` (FR-004, FR-045; SC-008; plan 0.1; quickstart §1)
- [ ] T002 [US5] K · La pila de componentes de #67 (los proyectos `node` y `dom` y `frontend/src/vitest.setup.ts`), verificada sin instalar nada; y la guarda de `useStore` de F6 en `eslint.config.ts`, si ni F5 ni F6 la trajeron (FR-003, FR-042; SC-011; plan 0.2)

## Phase 2: Foundational — La red del Recorrido contra el legacy (dueño E y usuario, onda 1)

- [ ] T003 [P] [US1] E · Page Objects y datos: `qa/e2e/pages/route.ts`, `qa/e2e/lib/route-progress.ts`, la fixture `route` en `qa/e2e/fixtures/index.ts` y `resetAllProgress` e `importCopy` sumados a `qa/e2e/pages/method.ts`, que creó F5 (FR-043; plan 1.1)
- [ ] T004 [US1] E · `qa/e2e/specs/route-steps.spec.ts`, 9 en verde contra el legacy: pasos, barra lateral, idioma, teclado, orden de tabulación, impresión y un `KNOWN DEFECT` (FR-001, FR-016, FR-022 a FR-024, FR-038, FR-040; plan 1.2)
- [ ] T005 [US2] E · `qa/e2e/specs/route-lesson.spec.ts`, 16 en verde: contenido, respuesta, 9 cierres con foco, el fondo, completar y Tab; un `KNOWN DEFECT` (FR-033 a FR-036, FR-038; plan 1.3)
- [ ] T006 [US3] E · `qa/e2e/specs/route-timer.spec.ts`, 11 en verde con `page.clock`: ritmo, pausa, navegación, aviso, idioma, importación, «Borrar todo» y dos `KNOWN DEFECT` (FR-026 a FR-031; plan 1.4)
- [ ] T007 [US4] E · `qa/e2e/specs/route-progress.spec.ts`, 4 en verde: las fixtures sin escribir, una escritura por acción, almacenamiento bloqueado y exportación (FR-020, FR-021; SC-004; plan 1.5)
- [ ] T008 [US2] E · `qa/e2e/specs/route-kept-state.spec.ts`, 6 en rojo contra el legacy por la razón esperada: módulos, foco y Atrás (FR-017, FR-025, FR-036; plan 1.6)
- [ ] T009 [US2] Usuario · Lector de pantalla sobre `#quiz-feedback` del legacy, anotado en `specs/014-f9-recorrido/research.md` (FR-037; plan 1.7)

## Phase 3: User Stories 1 a 4 — El CSS, el modelo y la página (dueños C, M y P, ondas 1 y 2)

- [ ] T010 [P] [US1] C · Las 114 reglas y los dos selectores de impresión a `frontend/src/pages/route/ui/route.css`, el import en `frontend/src/app/main.tsx` (K) y las restricciones de hojas en `qa/load-order-check.ts`; el multiconjunto y el barrido en 0 y su control negativo (FR-039, FR-041; SC-005; plan 2.1; quickstart §3)
- [ ] T011 [P] [US1] M · Spec en rojo de `frontend/src/entities/guide/model/route-selectors.spec.ts`; alternar un paso es `routeStore.toggleMark` de F4 (FR-023, FR-042; plan 3.1)
- [ ] T012 [US1] M · `route-selectors.ts` y su export en `frontend/src/entities/guide/index.ts` (FR-023; plan 3.2)
- [ ] T013 [US3] M · Specs en rojo de `frontend/src/pages/route/model/focus-timer.spec.ts`, `route-actions.spec.ts` y `route-view.spec.ts` (FR-020, FR-026 a FR-028, FR-032, FR-042; plan 3.3)
- [ ] T014 [US3] M · `focus-timer.ts`, `route-actions.ts` y `route-view.ts` en `frontend/src/pages/route/model/` (FR-018 a FR-020, FR-026 a FR-028, FR-031, FR-032; SC-007; plan 3.4)
- [ ] T015 [US2] P · Specs en rojo de `frontend/src/pages/route/ui/RoutePage.spec.tsx` y `LessonDialog.spec.tsx`, con los stubs del diálogo (FR-019, FR-024, FR-025, FR-034 a FR-037, FR-042; plan 4.1)
- [ ] T016 [US1] P · Los siete componentes de `frontend/src/pages/route/ui/` y `frontend/src/pages/route/index.ts` (FR-007 a FR-010, FR-017, FR-019, FR-023 a FR-025, FR-033 a FR-040; plan 4.2)

## Phase 4: User Story 5 — El corte (dueño A, onda 3)

- [ ] T017 [US5] A · `qa/boot-check.ts` lee `innerHTML` y los nodos con el `mountedText` de F4, sin ayudantes en `qa/lib/fake-dom.ts`, y suma «startApp registers no interval», en rojo (FR-013, FR-044; plan 5.1)
- [ ] T018 [US5] A · En un commit: `frontend/src/app/legacy/register-route.tsx`, `legacy-views.ts` (K), el corte de `frontend/app.js` con la suscripción de F4 pasada a `syncShell`, `frontend/src/index.html`, los arneses, `qa/lib/app-adapters.ts`, `qa/load-order-check.ts`, `qa/boot-check.ts` y `qa/app-shell-check.ts`, en la rama que anotó T001 (FR-002, FR-009, FR-011 a FR-015, FR-022, FR-031, FR-044; SC-001, SC-006, SC-007; plan 5.2)

## Phase 5: Polish — Comparaciones, documentación y PR (coordinador K y usuario, onda 4)

- [ ] T019 [US1] K · El barrido de la base contra el port, el multiconjunto y la comparación única del HTML (72 páginas y 192 lecciones), con sus cantidades en `specs/014-f9-recorrido/research.md` (FR-040, FR-041; SC-003, SC-005; plan 6.1; quickstart §3 y §4)
- [ ] T020 [US5] K · `docs/architecture.md` y `qa/AGENTS.md` (FR-046; plan 6.2)
- [ ] T021 [US5] K · Compuerta final, correspondencia de los checks y PR (FR-002 a FR-006, FR-044; SC-001, SC-008 a SC-010, SC-012; plan 6.3; quickstart §2 y §6)
- [ ] T022 [US2] Usuario · Lector de pantalla sobre `#quiz-feedback` de la página, comparado con T009 (FR-037; plan 6.4)
