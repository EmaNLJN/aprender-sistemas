# Tasks: F4 · Proyecto, el port de la página y de sus hitos

**Input**: `specs/013-f4-proyecto/` (`spec.md`, `plan.md`, `research.md` y `quickstart.md`)

El detalle de cada tarea (archivos, interfaces, código y comandos) está en su sección de [plan.md](./plan.md). Los dueños son K (el agente principal), E (los E2E), H (las hojas) y P (el port); las ondas y el orden de los commits están en «Commits, dueños y ondas» del plan. `[P]` marca lo que corre a la vez que otras tareas de su onda, con archivos disjuntos. `[US#]` va en cada tarea, aunque no esté en una fase de historia, para trazarla a la spec, como en F2b. Las pruebas no son opcionales (constitución, principio II): los E2E nacen contra el legacy y las specs nuevas, en el único commit rojo.

## Phase 1: Setup — Línea base (K, onda 0)

- [ ] T001 [US6] K · Línea base sobre `master` con F2a, A2 y F2b: oráculos, partes del dist, `html.length`, multiconjunto del CSS, avisos y el valor de `render()`, escenarios de `app-shell-check` y `boot-check`, restricciones de `load-order-check`, archivos y pruebas de Vitest, y qué de lo compartido con F3 y F9 ya está en `master`, en `$TMPDIR/f4-baseline.txt` (FR-002, FR-033; plan 0.1; quickstart §1)

## Phase 2: Foundational — La red contra el legacy, el CSS y la pila de DOM (onda 1: E, H y K; onda 2: K integra)

- [ ] T002 [P] [US1] E · Commit 1: 17 E2E de Proyecto en verde contra el legacy (la 15 como `KNOWN DEFECT`) en `qa/e2e/specs/project.spec.ts`, el Page Object `qa/e2e/pages/project.ts`, el fixture `project` en `qa/e2e/fixtures/index.ts`, `StorageControl.blockWrites()` y `routeMilestoneIds` en `qa/e2e/lib/curriculum.ts` (FR-001, FR-003, FR-012, FR-021, FR-027; SC-002, SC-005, SC-006; plan 1.2)
- [ ] T003 [P] [US4] H y K · Commit 2: las reglas de Proyecto de `frontend/styles.css` a `frontend/src/pages/project/ui/project.css`, con el bloque de 590 px y la regla de impresión partidos, y su import en `frontend/src/app/main.tsx`; multiconjunto y comparación en 0, y su control negativo (FR-013, FR-030, FR-032, FR-034; SC-004, SC-009; plan 2.1 y 2.2; quickstart §3.1)
- [ ] T004 [P] [US6] K · Commit 3, sólo si F3 no la instaló y con permiso del usuario: `jsdom` y Testing Library en `package.json`, dos proyectos en `frontend/vitest.config.ts` y `frontend/src/vitest-setup-dom.ts` (FR-028, FR-036; plan §3)

## Phase 3: User Stories 1 a 4 y 6 — Las specs en rojo (onda 3: P)

- [ ] T005 [US1] P · Commit 4, el único rojo: `toggleMark` con su firma y sus cinco pruebas en `frontend/src/entities/guide/model/route-store.ts` y su spec; el catálogo con su firma y su spec en `project-milestones.ts`; el modelo y su spec en `frontend/src/pages/project/model/project-progress.ts`; la página y su spec en `frontend/src/pages/project/ui/ProjectPage.tsx`; el E2E 8 de las pistas abiertas (FR-009, FR-010, FR-014, FR-017, FR-018, FR-027, FR-028; SC-002, SC-006; plan 4.2)

## Phase 4: User Stories 1 a 6 — El port (onda 3: P)

- [ ] T006 [US5] P · Commit 5: `toggleMark`, el catálogo con los textos de hoy, `MILESTONE_IDS` derivada, el modelo, `ProjectPage.tsx`, `MilestoneCard.tsx`, `frontend/src/pages/project/index.ts`, `frontend/src/app/legacy/register-project-page.tsx` y su línea en `legacy-views.ts`; `frontend/app.js` sin `renderProject`, el arreglo ni la rama, con el montaje y la suscripción del pie; `route-milestones-check`, `app-shell-check`, `app-adapters`, el arnés, `boot-check` y `load-order-check` adaptados; 141 E2E en verde (FR-004 a FR-013, FR-016 a FR-026, FR-029, FR-036; SC-001, SC-003, SC-008, SC-010; plan §5)
- [ ] T007 [US4] K · Comparación única sobre el commit 5, antes de T008: 7 árboles y 49 capturas con 0 diferencias, los 140 textos de los hitos iguales, el multiconjunto y los bytes del dist; cantidades para el PR (FR-004, FR-030, FR-032, FR-033; SC-004, SC-009, SC-011; plan §6; quickstart §3.2)

## Phase 5: User Story 4 — La pista de Go (onda 4: P, con el texto aprobado)

- [ ] T008 [US4] P · Commit 6, TDD en un commit: la prueba `KNOWN DEFECT` del E2E 15, de `project-milestones.spec.ts` y de `project-progress.spec.ts` pasa al texto aprobado y falla; después, la cadena `go` del primer hito en `frontend/src/entities/guide/model/project-milestones.ts` (FR-001, FR-015, FR-018; SC-002; plan §7; quickstart §5)

## Phase 6: Polish — Roturas, documentación y PR (onda 5: K)

- [ ] T009 [US6] K · Las 11 roturas deliberadas de FR-031, cada una con la prueba que la detecta (FR-031; SC-007; plan §8; quickstart §4)
- [ ] T010 [US6] K · Commit 7: `docs/architecture.md`, `docs/refactor-roadmap.md`, `qa/AGENTS.md`, el ADR 0008 si corrió T004, la línea base en `research.md` y la evidencia en este archivo (FR-037; plan 9.1)
- [ ] T011 [US6] K · Compuerta final, imagen web con permiso y PR en inglés con la correspondencia de `app-shell-check`, la comparación, los bytes, el tamaño, la complejidad y las roturas (FR-001, FR-002, FR-035, FR-037; SC-001, SC-011, SC-012; plan 9.2)
