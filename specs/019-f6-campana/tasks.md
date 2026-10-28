# Tasks: F6 · Campaña

**Input**: `specs/019-f6-campana/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/campaign-interfaces.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S2) están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite al paso del plan con sus archivos, sus interfaces y sus comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea, para trazarla a la spec.
- **Las pruebas no son opcionales** (constitución, principio II):
  - los E2E de T003 a T005 caracterizan el legacy y pasan desde su commit;
  - cada módulo nuevo abre con su spec en rojo;
  - T015 es el commit rojo del corte.
- **Decisiones del usuario:** Q1 a Q3 del clarify del 2026-10-28, más las dos del informe del plan (research.md R2 y R12).

## Phase 1: Setup — Línea base y arnés (coordinador K, onda 0)

- [ ] T001 [US1] K · Línea base sobre la base de implementación: el dist, los avisos, los escenarios de cada check, los E2E y los predicados de R12 y R13, en `specs/019-f6-campana/research.md` (FR-002, FR-046; plan 0.1; quickstart §1)
- [ ] T002 [US6] K · Si falta: el arnés de componentes con permiso (jsdom, Testing Library y fishery), los dos proyectos de `frontend/vitest.config.ts`, `frontend/src/vitest-setup-dom.ts` y la guarda de `useStore` en `eslint.config.ts` (FR-026, FR-042; plan 0.2)

## Phase 2: Foundational

No hay: las colas de la onda 1 parten de S0 y tocan archivos disjuntos.

## Phase 3: User Story 1 - El alumno recorre la campaña como siempre (Priority: P1) — E2E contra el legacy (onda 1: E)

- [ ] T003 [P] [US1] E · El Page Object ampliado en `qa/e2e/pages/campaign.ts` y la fábrica del progreso v1 en `qa/e2e/lib/campaign-progress.ts` (FR-041; plan 1.1)
- [ ] T004 [US1] E · Los flujos (a) a (h) en `qa/e2e/specs/campaign.spec.ts`, en verde contra el legacy (FR-003, FR-006, FR-010 a FR-012, FR-021, FR-041; SC-002, SC-003; plan 1.2)
- [ ] T005 [US1] E · Los flujos (i) a (o) en `qa/e2e/specs/campaign.spec.ts`, en verde contra el legacy (FR-013 a FR-015, FR-041; SC-002; plan 1.3)

## Phase 4: User Story 4 - Los conteos y el XP salen del catálogo (Priority: P1) — El modelo (onda 1: M)

- [ ] T006 [P] [US4] M · Specs en rojo de los selectores, los conteos y las constantes en `frontend/src/entities/campaign/model/selectors.spec.ts`, `constants.spec.ts` y `bridge.spec.ts`, con los exports de `index.ts`, `bridge.ts` y `entities/exercise/@x/campaign.ts` (FR-027 a FR-029; plan 2.1)
- [ ] T007 [US4] M · `frontend/src/entities/campaign/model/selectors.ts`, con las specs de T006 en verde y `campaign-check` sin cambios (FR-005, FR-028, FR-030; SC-006; plan 2.2)
- [ ] T008 [US6] M · Tres escenarios del adaptador en `qa/seams-guard-check.ts`: la entrada sin estado sí, el modelo (R6) y el índice (R4) no (FR-025, FR-029; SC-011; plan 2.3)

## Phase 5: User Story 5 - El aspecto no cambia y la hoja desaparece (Priority: P2) — El CSS del laboratorio (onda 1: C)

- [ ] T009 [P] [US5] C · `.quest-direct-lock` del final de `frontend/campaign.css` al final de `frontend/lab.css`, con el multiconjunto, el barrido y R10 sin diferencias (FR-039; SC-004; plan 2.4; quickstart §3.1)
- [ ] T010 [US1] K · Integración de la onda 1 y su compuerta: 123 + 21 E2E contra el legacy; es S1 (FR-001, FR-002; plan 2.5)

## Phase 6: User Story 1 y 4 - La página, sin montar (Priority: P1) — (onda 2: P)

- [ ] T011 [US1] P · Specs en rojo de la sesión en `frontend/src/pages/campaign/model/campaign-session.spec.ts` y `open-campaign-session.spec.ts`, con el índice y los tipos (FR-013, FR-014; plan 3.1)
- [ ] T012 [US1] P · `campaign-session.ts` y `open-campaign-session.ts`, con sus specs en verde (FR-013, FR-014; plan 3.2)
- [ ] T013 [US4] P · Las fábricas, el arnés y las cuatro specs en rojo de `frontend/src/pages/campaign/ui/` (los contratos, el catálogo armado, las constantes reemplazadas y el texto editorial) (FR-007 a FR-022, FR-030 a FR-032, FR-042; SC-006, SC-007, SC-009; plan 3.3)
- [ ] T014 [US1] P · `CampaignPage.tsx` y sus doce componentes, con las specs de T013 en verde y ninguna función de más de 10 (FR-007 a FR-020, FR-022, FR-037, FR-046; plan 3.4)

## Phase 7: User Story 3 y 2 - El laboratorio sigue usando la campaña y los enlaces no cambian (Priority: P1) — El corte (onda 3: E y A)

- [ ] T015 [US3] E y A · Commit rojo: `qa/e2e/specs/campaign-kept-state.spec.ts` (el flujo p) y `frontend/src/app/legacy/register-campaign.spec.tsx`, con las firmas de los dos adaptadores (FR-003, FR-017 a FR-019, FR-033; plan 4.1)
- [ ] T016 [US3] A · `campaign-bridges.ts`, `register-campaign.tsx`, `startApp()` en `frontend/app.js`, `legacy-views.ts`, la línea de `main.tsx`, el `git mv` a `campaign-page.css`, el borrado de `frontend/campaign.js` y `register-effects.ts` según R13 (FR-023 a FR-025, FR-033 a FR-037, FR-040; plan 4.2)
- [ ] T017 [US2] A · Los checks cargan los adaptadores: `qa/lib/legacy-sources.ts`, `qa/lib/app-adapters.ts`, `qa/lib/app-shell-harness.ts`, `qa/app-shell-check.ts`, `qa/boot-check.ts`, `qa/lab-bridge-check.ts` y `qa/load-order-check.ts`; un solo commit con T016 (FR-034, FR-036, FR-043; SC-010; plan 4.3 y 4.4)

## Phase 8: User Story 5 y 6 - Nada cambió y cada pieza está en su capa (Priority: P2) — Verificación (onda 4: K)

- [ ] T018 [US5] K · Las comparaciones únicas: el multiconjunto, el DOM, el estilo y la accesibilidad en 21 estados, y los puentes (FR-035, FR-040, FR-044; SC-004, SC-005; plan 5.1; quickstart §3)
- [ ] T019 [US6] K · Las catorce roturas deliberadas, N de N (FR-045; SC-007, SC-009; plan 5.2; quickstart §4)
- [ ] T020 [US6] K · La compuerta del PR: la red, el dist bajo 1 250 000, los avisos −2 y SC-008 (FR-002, FR-038, FR-046; SC-001, SC-008, SC-011, SC-012; plan 0.3 y 5.3)

## Phase 9: Polish — Documentación y PR (coordinador K)

- [ ] T021 [US6] K · `AGENTS.md`, `README.md`, `docs/architecture.md`, `qa/AGENTS.md` y, si T002 trajo el arnés, `docs/adr/0008-pruebas-del-front.md` (FR-047; plan 6.1)
- [ ] T022 [US1] K · El PR, la lectura con lector de pantalla del usuario y `docker compose build taller` con permiso (FR-048; SC-012; plan 6.2)
