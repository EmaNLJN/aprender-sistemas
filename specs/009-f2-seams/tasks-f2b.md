# Tasks: F2b · Seams sin cambio visible, unidades 5 a 8

**Input**: `specs/009-f2-seams/` (`spec.md`, `plan-f2b.md`, `research-f2b.md` y `quickstart-f2b.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S2) están en «Reparto en paralelo» de [plan-f2b.md](./plan-f2b.md). Cada línea remite al paso del plan con sus archivos, sus interfaces y sus comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea, aunque no esté en una fase de historia, para trazarla a la spec.
- **La numeración** sigue la de F2a (T001 a T019, en [tasks.md](./tasks.md)), para que un commit que nombra una tarea no sea ambiguo dentro de la carpeta.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo. La unidad 8 se prueba con la protección de F1, en verde antes y después.
- **El orden de los PR** es el de las unidades 8, 5, 7 y 6.
- **Decisiones del usuario:** la partición, Q1 y Q4 se respondieron el 2026-10-06 (spec, `## Clarifications`; plan, «Decisiones del usuario»).

## Phase 1: Setup — Línea base (coordinador K, onda 0)

- [ ] T020 [US1] K · Línea base sobre la base de implementación (`master` con F2a entera): los oráculos, el script, el estilo y el marcado del dist con su hash, `html.length`, el multiconjunto del CSS, los 35 avisos y los escenarios de cada check, en `specs/009-f2-seams/research-f2b.md` (FR-002 a FR-004, FR-009, FR-016; plan 0.1; quickstart-f2b §1)

## Phase 2: Foundational

No hay: las cuatro unidades parten de S0 y tocan archivos disjuntos. La única espera es la de T036, que parte de S1.

## Phase 3: User Story 7 - El aspecto que pasa de una hoja a otra queda igual (Priority: P2) — Unidad 8 (onda 1: H; onda 2: K)

- [ ] T021 [P] [US7] H · Las 26 reglas de las nueve filas, al final de la hoja de su dueño y en el orden de hoy, en `frontend/styles.css`, `frontend/lab.css` y `frontend/campaign.css`; el multiconjunto y el barrido de estilo computado sin diferencias, y su control negativo (FR-008, FR-058 a FR-060; SC-007; plan 1.2; quickstart-f2b §3.1)
- [ ] T022 [US7] K · Compuerta, comparaciones, documentación y PR de la unidad 8 (FR-001, FR-002, FR-007 a FR-009; SC-001, SC-002, SC-011, SC-012; plan 1.3)

## Phase 4: User Story 4 - Los puentes, las URL y los modelos de Sistemas son datos que se importan (Priority: P2) — Unidad 5 (onda 1: S y U; onda 2: K)

- [ ] T023 [P] [US4] S · Regla R6 del guard en `qa/lib/seams-guard.ts`, con sus escenarios primero en rojo en `qa/seams-guard-check.ts` (FR-014, FR-018; plan 2.1)
- [ ] T024 [P] [US4] U · Specs en rojo de la gramática y de los puentes: `frontend/src/shared/config/url-grammar.spec.ts`, `frontend/src/entities/campaign/model/mission-bridge.spec.ts`, `frontend/src/entities/campaign/bridge.spec.ts`, `frontend/src/entities/systems-workshop/model/workshop-bridge.spec.ts` y `frontend/src/entities/systems-workshop/bridge.spec.ts` (FR-012, FR-018, FR-044, FR-047; plan 2.2)
- [ ] T025 [US4] U · `url-grammar.ts`, `mission-bridge.ts`, `workshop-bridge.ts` y las dos entradas `bridge.ts`, con las specs de T024 en verde (FR-014, FR-043, FR-045; plan 2.3)
- [ ] T026 [US4] U · `frontend/campaign.js`, `frontend/systems.js`, `frontend/lab.js`, `frontend/src/pages/atlas/ui/ConceptDetail.tsx` y la parte de la URL de `frontend/app.js` usan la gramática y los puentes; las dos comparaciones sin diferencias (FR-011, FR-043, FR-044, FR-046, FR-047; SC-008; plan 2.4; quickstart-f2b §3.2)
- [ ] T027 [US4] K · Compuerta, correspondencia de `lab-bridge-check`, documentación y PR de la unidad 5; su integración es S1 (FR-001, FR-002, FR-013, FR-017; SC-009; plan 2.5 y 2.7)

## Phase 5: User Story 6 - Un explorador es un modelo puro y su selección es explícita (Priority: P2) — Unidad 7 (onda 1: X; onda 2: K)

- [ ] T028 [P] [US6] X · Fixture congelada `qa/fixtures/explorer-kinds-<base>.json`, generada desde las expresiones regulares en el commit base (FR-055, FR-057; plan 3.1; quickstart-f2b §3.3)
- [ ] T029 [US6] X · Specs en rojo del mapa y de los modelos: `explorer-kinds.spec.ts`, `lab-explorer.spec.ts` y `quest-explorer.spec.ts` en `frontend/src/entities/exercise/model/`, y `frontend/src/entities/exercise/explorers.spec.ts` (FR-012, FR-018, FR-057; plan 3.2)
- [ ] T030 [US6] X · El mapa explícito y los modelos en `explorer-kinds.ts`, `lab-explorer.ts` y `quest-explorer.ts`, en `frontend/src/entities/exercise/model/`, y la entrada `explorers.ts` (FR-014, FR-054, FR-055; plan 3.3)
- [ ] T031 [US6] X · `frontend/lab-explorers.js` y `frontend/quest-explorers.js` dibujan los modelos; la comparación sin diferencias (FR-011, FR-016, FR-054, FR-056; SC-008; plan 3.4; quickstart-f2b §3.3)
- [ ] T032 [US6] K · Compuerta, correspondencia de `quest-explorers-check`, documentación y PR de la unidad 7 (FR-001, FR-002, FR-013; SC-009; plan 3.5 y 3.6)

## Phase 6: User Story 5 - D1c reemplaza importar y borrar sin tocar a quien llama (Priority: P2) — Unidad 6 (onda 1: B; onda 2: B, desde S1; onda 3: K)

- [ ] T033 [P] [US5] B · Specs en rojo en `frontend/src/features/progress-backup/model/create-progress-backup.spec.ts`, con áreas falsas, áreas asíncronas y las dos exportaciones congeladas (FR-012, FR-049, FR-050, FR-052, FR-053; SC-010; plan 4.1)
- [ ] T034 [US5] B · `frontend/src/features/progress-backup/index.ts`, `model/types.ts` y `model/create-progress-backup.ts`, con el código que se mueve de `app.js` (FR-014, FR-015, FR-048 a FR-052; plan 4.2)
- [ ] T035 [US5] B · `qa/app-shell-check.ts`: `await` en el primer escenario de «h) borrar todo», la opción `asyncAdapters` y 4 gemelos, 2 en rojo (FR-013, FR-053; SC-010; plan 4.3)
- [ ] T036 [US5] B · Desde S1, `frontend/app.js` arma `progress-backup` con sus adaptadores y espera importar y «Borrar todo»; la comparación de 24 pares (FR-005, FR-006, FR-011, FR-048, FR-051, FR-052; SC-003, SC-010; plan 4.4; quickstart-f2b §3.4)
- [ ] T037 [US5] K · Compuerta, correspondencia de `app-shell-check`, documentación y PR de la unidad 6 (FR-001, FR-002, FR-013; SC-009; plan 4.5 y 4.6)

## Phase 7: Polish — Cierre (coordinador K, onda 3)

- [ ] T038 [US1] K · Compuerta acumulada de las cuatro unidades, la tabla de lo que toman F5 a F8, F10, A2 y D1c, y el aviso al coordinador de lo que le toca a la hoja de ruta y a las specs de F6, F8 y D1 (FR-010; SC-001, SC-002, SC-013; plan 5.1; quickstart-f2b §5)
