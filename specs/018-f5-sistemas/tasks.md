# Tasks: F5 · Port de Sistemas

**Input**: `specs/018-f5-sistemas/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/taller-systems.md`)

Cada línea remite a su tarea de [plan.md](./plan.md), que tiene los archivos, las interfaces, el código y los comandos.

- **`[P]`** marca una tarea que puede correr a la vez que otras de su onda (plan, «Reparto y orden»): tiene archivos disjuntos.
- **`[US#]`** traza la tarea a la historia de la spec.
- **Las pruebas van primero** (constitución, principio II): los E2E abren el PR contra el legacy, y cada módulo o componente abre con su spec en rojo.
- **Las tareas condicionales** dicen en qué caso corren. T001 detecta el caso (plan, «Integración con F3, F6 y F8»).

## Phase 1: Setup — línea base y verificaciones previas (K)

- [ ] T001 [US2] K · Línea base y detección de lo que entró antes (F3, F6, F8), en «Línea base de la implementación» de `specs/018-f5-sistemas/research.md` (FR-045; plan 0.1; quickstart §1)
- [ ] T002 [US6] K · Permisos y descargas de lo que falte: `nuqs` 2.10.2 con `@standard-schema/spec` 1.1.0, la pila de componentes y `fishery` 2.4.0, en `package.json` y `package-lock.json` (FR-046; plan 0.2)
- [ ] T003 [US2] K · Spike descartable de V6 (el adaptador real de nuqs en jsdom, con el arnés de T007 copiado a la copia si F3 no lo trajo) y de V1 (el peso), con sus resultados en `research.md`; si una salida difiere, la decisión vuelve al usuario (FR-011, FR-045; SC-010; plan 0.3; quickstart §2.1 y §2.2)

## Phase 2: Foundational — los E2E contra el legacy y la infraestructura compartida

- [ ] T004 [P] [US1] E · Page Object, `MethodPage`, `systems-progress.ts` y `qa/e2e/specs/systems.spec.ts`, en verde contra el legacy (FR-038, FR-039, FR-050; SC-001; plan 1.1)
- [ ] T005 [US1] E · `failWrites()` y `qa/e2e/specs/systems-react.spec.ts`: los cuatro E2E de C2, en rojo contra el legacy (FR-038, FR-051; plan 1.2)
- [ ] T006 [US2] E · `qa/e2e/specs/systems-url.spec.ts`: las diferencias de nuqs, en rojo contra el legacy, sólo si el usuario acepta D1 (FR-011; SC-010; plan 1.3)
- [ ] T007 [P] [US6] H · El arnés de componentes, si F3 no lo trajo: `frontend/vitest.config.ts`, `frontend/src/vitest-setup.ts` y la guarda de `useStore` en `eslint.config.ts` (FR-042, FR-046; plan 2.1)
- [ ] T008 [US2] K · `frontend/src/app/legacy/url-state.tsx` con su spec y el aviso de nuqs en `frontend/THIRD-PARTY-NOTICES.txt`, si F3 no los trajo (FR-011, FR-046; plan 2.2)
- [ ] T009 [P] [US5] Q · `runSourceGroup` en `qa/lib/sources.ts`; `loadSystemsUi` y `lab-bridge-check` con un solo motor (V3) (FR-021, FR-041; plan 2.3; quickstart §2.3)
- [ ] T010 [P] [US6] Q · `REACT_VIEWS` y `mountedText` en `qa/boot-check.ts` (FR-041; plan 2.4)

## Phase 3: User Story 4 - La escena no rompe la página ni inyecta estilo (Priority: P1)

- [ ] T011 [P] [US4] S · La spec en rojo de `frontend/src/entities/systems-simulation/lib/sanitize-scene.spec.ts`, con los doce casos de FR-026 (plan 3.1)
- [ ] T012 [US4] S · `sanitize-scene.ts` y su exportación en `entities/systems-simulation/index.ts` (FR-023; SC-005; plan 3.2)

## Phase 4: User Story 3 - La sesión y la selección (Priority: P1)

- [ ] T013 [US2] M · `pages/systems/model/types.ts`, `workshop-views.ts` y `systems-page.factory.ts` (FR-018, FR-020; plan 4.1)
- [ ] T014 [US1] M · `pages/systems/model/catalog-filter.ts` con su spec, rojo y verde (FR-004; plan 4.2)
- [ ] T015 [US3] M · `pages/systems/model/systems-session.ts` con su spec, rojo y verde (FR-017; plan 4.3)
- [ ] T016 [US2] M · `pages/systems/model/useWorkshopSelection.ts` con su spec, rojo y verde (FR-011; SC-010; plan 4.4)

## Phase 5: User Story 1 - El alumno recorre Sistemas y no nota el cambio (Priority: P1)

- [ ] T017 [US4] U · `pages/systems/ui/SceneView.tsx` con su spec: el único `style={`, con el fondo saneado (FR-024, FR-025; plan 5.1)
- [ ] T018 [US1] U · `ModelPanel.tsx`, `ModelTable.tsx` y `ModelTrace.tsx` con su spec (FR-006, FR-051; plan 5.2)
- [ ] T019 [US1] U · `Checkpoint.tsx` con su spec (FR-007, FR-016; plan 5.3)
- [ ] T020 [US1] U · `ExplorePart.tsx` y `WorkshopSources.tsx` con su spec (FR-005, FR-006, FR-016, FR-019; plan 5.4)
- [ ] T021 [US1] U · `BuildPart.tsx` y `ShipPart.tsx` con sus specs (FR-005, FR-012, FR-014, FR-015; plan 5.5)
- [ ] T022 [US1] U · `SystemsCatalog.tsx`, `WorkshopCard.tsx` y `ExternalTools.tsx` con su spec (FR-004, FR-008, FR-009; plan 5.6; quickstart §4.1)
- [ ] T023 [US1] U · `WorkshopDetail.tsx`, `SystemsPage.tsx`, su spec y `pages/systems/index.ts` (FR-008, FR-011, FR-018, FR-020; plan 5.7)

## Phase 6: User Story 5 - El laboratorio, la campaña y «Borrar todo» siguen usando a Sistemas (Priority: P2)

- [ ] T024 [US5] K · El corte en un commit: `frontend/src/app/legacy/register-systems.tsx`, una línea de `legacy-views.ts` y de `main.tsx`, borrar `frontend/systems.js`, mudar `frontend/systems.css`, las tablas de `qa/` y las ramas D2 y F8 cuando correspondan (FR-001, FR-002, FR-028 a FR-037, FR-049; SC-006, SC-008; plan 6.1)

## Phase 7: Polish — compuerta, comparaciones y entrega (K)

- [ ] T025 [US7] K · Compuerta (con el grep de estilos en línea partido en dos: 0 `style="` y un solo `style={`, hallazgo 6 de la spec), DOM (V4), escenas, barrido de estilo ampliado, CSP (V2), V5, revert, mutaciones y `docker compose build taller`, con los resultados en `research.md` (FR-025, FR-027, FR-040, FR-043 a FR-045; SC-002 a SC-005, SC-007, SC-008; plan 7.1; quickstart §3 y §4)
- [ ] T026 [US6] K · Documentación (`AGENTS.md`, `README.md`, `docs/architecture.md`, `qa/AGENTS.md` y la enmienda del ADR 0008 si F5 trajo el arnés) y el PR con la tabla de los nueve métodos (FR-033, FR-037, FR-047; SC-009; plan 7.2)
