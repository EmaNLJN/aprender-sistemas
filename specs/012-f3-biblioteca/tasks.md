# Tasks: F3 · Biblioteca

**Input**: `specs/012-f3-biblioteca/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/library-url.md`)

El detalle de cada tarea está en [plan.md](./plan.md): sus archivos, sus interfaces, el código de cada paso, los comandos y la compuerta. La sección «Unidades, reparto y orden» dice los dueños (K, E, S, P y H), las ondas y los puertos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda.
- **Las tareas condicionales** (T005 a T009, T013, T015, T016 y T019) siguen lo que T001 encontró en la base: si su pieza ya está, se comprueba y no se rehace.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su prueba en rojo. Los E2E de lo que se conserva van primero y en verde contra el legacy; los de los tres cambios, en rojo antes de cada cambio.

## Phase 1: Setup — Línea base y verificación (K, onda 0)

- [ ] T001 [US3] K · La línea base y la tabla «Qué ya está en la base», en `specs/012-f3-biblioteca/research.md` (FR-002, FR-038, FR-039; plan 0.1; quickstart §1)
- [ ] T002 [US4] K · La verificación corta de nuqs 2.10.2 (riesgo 14), con el permiso P1 y P2, en la copia descartable `../f3-nuqs-probe`, con su resultado en `research.md` (FR-042; plan 0.2; quickstart §2)

## Phase 2: Foundational — Los E2E contra el legacy y lo compartido (E, K y S, onda 1)

- [ ] T003 [P] [US1] E · El Page Object `qa/e2e/pages/library.ts`, la fixture `library` en `qa/e2e/fixtures/index.ts` y `blockWrites()` en `qa/e2e/fixtures/storage-control.ts` (FR-031; plan 1.1)
- [ ] T004 [US1] E · Los 22 casos de lo que se conserva en `qa/e2e/specs/library.spec.ts`, en verde contra el legacy tres veces (FR-003, FR-005, FR-012 a FR-018, FR-031, FR-044; SC-002, SC-003; plan 1.2)
- [ ] T005 [P] [US5] K · jsdom, Testing Library y fishery en `package.json`, con el permiso P2 (FR-033, FR-034; plan 2.1)
- [ ] T006 [US5] K · Los proyectos `node` y `jsdom` en `frontend/vitest.config.ts`, `frontend/src/vitest-setup.ts` y la guarda de `useStore` en `eslint.config.ts` (FR-011, FR-033; SC-010, SC-012; plan 2.2)
- [ ] T007 [P] [US5] S · `toggleItem` en `frontend/src/entities/guide/model/toggle-item.ts`, con su spec, y `frontend/app.js` la importa (FR-012; plan 2.3)
- [ ] T008 [US5] S · `runModuleEntry` en `qa/lib/sources.ts`, el `routeStore` del bundle de `app.js` en `qa/lib/legacy-sources.ts` y `qa/lib/app-shell-harness.ts`, y los dos escenarios de `favorite` de `qa/app-shell-check.ts` (FR-013, FR-035; SC-008; plan 2.4)
- [ ] T009 [US2] S · El escenario del pie en `qa/app-shell-check.ts` (rojo) y la suscripción `routeStore.changes.subscribe(updateSaveLabel)` en `frontend/app.js` (FR-014; plan 2.5)

## Phase 3: User Story 1 - La alumna busca y filtra recursos como siempre (Priority: P1) — La página y el corte (P, E y K, ondas 2 y 3)

- [ ] T010 [US1] P · El modelo, con sus specs en rojo y después en verde: `filter-resources.ts`, `resource-labels.ts` y `guide-resource.factory.ts` en `frontend/src/pages/library/model/`, y los valores de la Biblioteca en `frontend/src/shared/config/url-grammar.ts` (FR-008, FR-015, FR-030, FR-034; plan 2.6)
- [ ] T011 [US1] P · La página sin montar, `frontend/src/pages/library/ui/LibraryPage.tsx`, con `LibraryFiltersBar.tsx`, `ResourceCard.tsx`, `EmptyLibrary.tsx`, `model/use-library-filters.ts` e `index.ts`, y su spec `LibraryPage.spec.tsx` en rojo y después en verde (FR-007 a FR-010, FR-012, FR-016 a FR-018, FR-022 a FR-025, FR-032; plan 2.7)
- [ ] T012 [US1] E · El caso del detalle abierto en `qa/e2e/specs/library.spec.ts`, en rojo contra el legacy (FR-003, FR-022; plan 3.1)
- [ ] T013 [US3] K · El corte en un solo commit: `frontend/src/app/legacy/register-library.tsx`, `frontend/src/app/boot/legacy-views.ts`, `frontend/app.js` y los cinco checks de `qa/` (FR-001, FR-009, FR-027 a FR-029, FR-035; SC-001, SC-005, SC-008; plan 3.2; quickstart §3.1)

## Phase 4: User Story 2 - Guarda favoritos y los encuentra al volver (Priority: P1) — El foco (P y E, onda 4)

- [ ] T014 [US2] P y E · Las pruebas en rojo, en `qa/e2e/specs/library.spec.ts`, `model/focus-after-removal.spec.ts` y `ui/LibraryPage.spec.tsx`, y después `focusAfterRemoval`, `flushSync` y las refs en `LibraryPage.tsx`, `ResourceCard.tsx` y `EmptyLibrary.tsx` (FR-019, FR-025, FR-032; plan 4.1)

## Phase 5: User Story 4 - Los filtros viajan en la URL (Priority: P2) — nuqs (K, P y E, onda 4)

- [ ] T015 [US4] K · `nuqs` 2.10.2 en `package.json` y su aviso en `frontend/THIRD-PARTY-NOTICES.txt`, con el permiso P1 (FR-042; plan 4.2)
- [ ] T016 [US4] K · `frontend/src/app/legacy/url-state.tsx` (`UrlStateProvider` y `startUrlStateSync`), con su spec en rojo y después en verde (FR-042; plan 4.3)
- [ ] T017 [US4] P y E · Las pruebas de la URL, en rojo: `url-grammar.spec.ts`, `library-query.spec.ts`, `LibraryPage.spec.tsx`, `qa/e2e/specs/library.spec.ts` y `qa/e2e/specs/url-contract.spec.ts` (FR-003, FR-006, FR-018, FR-021, FR-043, FR-044; SC-013; plan 4.4)
- [ ] T018 [US4] P y K · Los filtros en la URL: `withLanguageQuery` en `url-grammar.ts`, `library-query.ts`, `useQueryStates` en `LibraryPage.tsx` sin la sesión, y `UrlStateProvider` y `startUrlStateSync` en `register-library.tsx` (FR-006, FR-021, FR-028, FR-042 a FR-044; SC-001, SC-013; plan 4.5)

## Phase 6: User Story 3 - Nada cambia fuera de la página (Priority: P1) — El CSS (H y K, onda 5)

- [ ] T019 [US3] H y K · Las 41 reglas a `frontend/src/pages/library/ui/library.css`, fuera de `frontend/styles.css` y con el import en `frontend/src/app/main.tsx`. El multiconjunto y el barrido, con 0 diferencias, y el control negativo (FR-020, FR-026, FR-038; SC-006; plan 5.1; quickstart §5)

## Phase 7: Polish — El cierre (K, onda 6)

- [ ] T020 [US3] K · La comparación única, legacy contra port, con 15 estados y 4 anchos (FR-036; SC-004; plan 6.1; quickstart §4)
- [ ] T021 [US5] K · Las 14 roturas deliberadas (FR-037; SC-007; plan 6.2; quickstart §6)
- [ ] T022 [US5] K · `docs/architecture.md`, `qa/AGENTS.md`, `docs/agent-skills.md` y la enmienda de `docs/adr/0008-pruebas-del-front.md` (FR-040; plan 6.3)
- [ ] T023 [US3] K · La compuerta del PR, la imagen web con el permiso P3 y el PR (FR-002, FR-038, FR-039, FR-041; SC-001, SC-009, SC-011; plan 6.4; quickstart §3.2 y §7)
