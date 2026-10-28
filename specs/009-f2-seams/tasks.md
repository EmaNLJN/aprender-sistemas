# Tasks: F2a · Seams sin cambio visible, unidades 1 a 4

**Input**: `specs/009-f2-seams/` (`spec.md`, `plan.md`, `research.md` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S4) están en «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, sus interfaces, sus roturas y sus comandos. Cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec. Las pruebas no son opcionales (constitución, principio II): cada tarea de código abre con su spec en rojo, y el plan dice por qué falla. El orden de los PR es el de las unidades 2, 4, 1 y 3 (FR-019). **Decisiones del usuario:** la partición, Q2 y Q3 se respondieron el 2026-10-06 (spec, `## Clarifications`; plan, «Decisiones del usuario»). La unidad 1, T008 a T015, usa Zustand para la suscripción; las unidades 2 y 4 no cambian.

## Phase 1: Setup — Línea base (coordinador K, onda 0)

- [x] T001 [US1] K · Línea base sobre la base de implementación con F1 integrada: los cinco hashes, el tamaño del HTML en caracteres, los 35 avisos de complejidad y los escenarios de cada check, en `specs/009-f2-seams/research.md` y en el mensaje del commit (FR-003, FR-004, FR-009, FR-016; plan 0.1; quickstart §1)

## Phase 2: Foundational — Unidades 2 y 4 y la dependencia de Zustand (onda 1: C, M y K a la vez; T005 y T007 son de la onda 2)

*Parten de S0. C, M y K tocan archivos disjuntos. Las dos compuertas de K salen cuando C y M entregan.*

- [x] T002 [P] [US2] C · Specs del catálogo y de `buildProgram` en `frontend/src/entities/exercise/model/`, en rojo contra firmas que lanzan `not implemented` (FR-012, FR-034; plan 1.1)
- [x] T003 [US2] C · Catálogo y `buildProgram` en `entities/exercise`; `frontend/lab.js` los usa y `window.TallerLab` deja de publicar `buildProgram` (FR-014, FR-017, FR-032, FR-033; plan 1.2)
- [x] T004 [US2] C · `qa/runtime-check.ts`, `qa/systems-check.ts` y `qa/project-kit-check.ts` cargan la fábrica pura, y la comparación única de los 822 programas (FR-011, FR-013, FR-033; SC-008; plan 1.3)
- [x] T005 [US2] K · Compuerta, documentación y PR de la unidad 2 (FR-001, FR-002, FR-007 a FR-009; SC-001, SC-002, SC-011, SC-012; plan 1.4)
- [x] T006 [P] [US4] M · Registro de modelos de Sistemas: `mergeModelGroups` con su spec en rojo en `entities/systems-simulation` y `frontend/systems.js:init` (FR-012, FR-014, FR-041, FR-042; plan 2.1)
- [x] T007 [US4] K · Compuerta, documentación y PR de la unidad 4 (FR-001, FR-002, FR-007 a FR-009; plan 2.2)
- [x] T008 [P] [US2] K · Dependencia de Zustand: `zustand` 5.0.15, exacta, en `package.json` y el lockfile, y su aviso de licencia en `frontend/THIRD-PARTY-NOTICES.txt`; es el primer commit de la unidad 1 (FR-010, FR-023; plan 3.1)

## Phase 3: User Story 2 - Quien porta importa lo compartido en lugar de abrir una copia (Priority: P1) — Unidad 1 (onda 1: G, E y L; onda 2: G, L y S; onda 3: K)

*G, E y L parten de S1 (T008 integrada) y pueden escribir sus specs antes. T013 parte de S2 (el PR de la unidad 2 en `master`). El PR de la unidad 1 sólo se abre después de S2.*

- [x] T009 [P] [US2] G · Almacén del recorrido en `frontend/src/entities/guide` (`routeStore` con su `changes` de Zustand, `parseRouteProgress`, `MILESTONE_IDS`) y la prueba de riesgo 1 de F1 invertida en `route-store.spec.ts` (FR-012, FR-014, FR-020 a FR-024, FR-027, FR-030, FR-031; SC-006; plan 3.2)
- [x] T010 [P] [US2] E · `campaignEngine` y `systemsEngine` con su `changes` de Zustand, el motor de Sistemas lanza sin `init` y la prueba de riesgo 2 de F1 invertida en `engine-init-order.spec.ts` (FR-012, FR-014, FR-020 a FR-024, FR-031, FR-040; SC-006; plan 3.3)
- [x] T011 [P] [US2] L · Almacén del laboratorio en `frontend/src/entities/exercise/model` (`labStore` con su `changes` de Zustand, `lab-state`), con la identidad de sus registros (FR-012, FR-014, FR-020 a FR-025, FR-028, FR-031; plan 3.4)
- [x] T012 [US2] G · `frontend/app.js` lee y escribe el recorrido por `routeStore` (FR-026; plan 3.5)
- [x] T013 [US2] L · `frontend/lab.js` lee y escribe el laboratorio por `labStore` (FR-026; plan 3.6)
- [x] T014 [US2] S · Guard `qa/seams-guard-check.ts` (R1 a R5), `frontend/src/app/singletons-import.spec.ts` y la regla de dos pestañas en `qa/versioned-storage-check.ts`; K lo registra en `qa/run-checks.ts` (FR-012, FR-015, FR-018, FR-029, FR-030, FR-031, FR-032; SC-004; plan 3.7)
- [x] T015 [US2] K · Comparación única, compuerta, documentación y PR de la unidad 1, con el diff de la dependencia (FR-001, FR-002, FR-005 a FR-011; SC-003, SC-008; plan 3.8)

## Phase 4: User Story 3 - El arranque es una función que se llama en orden (Priority: P1) — Unidad 3 (onda 4: Q y A a la vez; onda 5: K)

*Parte de S3 (los PR de las unidades 4 y 1 en `master`). T016 tiene que fallar antes de T017, y T017 es un solo commit.*

- [x] T016 [US3] Q · En dos commits: los arneses en verde (`runModule`, `loadAppShell`, `bundleApp` sin la llamada final y la lectura de imports con nombre de `load-order-check`) y las pruebas del arranque en rojo (`app-adapters`, `qa/boot-check.ts`, `qa/app-shell-check.ts` y `qa/load-order-check.ts`); A suma la firma de `startApp` en `frontend/app.js` (FR-013, FR-035 a FR-040; plan 4.1)
- [x] T017 [US3] A · El corte, con K, en un solo commit: `startApp()` en `frontend/app.js`, `TallerLab.init` en `frontend/lab.js`, `frontend/src/app/main.tsx` con el import con nombre y la llamada, y `loadLab` y el `buildHarness` de `app-shell-check` (FR-017, FR-035 a FR-038; SC-005; plan 4.2)
- [x] T018 [US3] K · Comparación del orden de efectos, compuerta, documentación y PR de la unidad 3 (FR-001, FR-002, FR-007 a FR-009, FR-038; SC-005, SC-012; plan 4.3)

## Phase 5: Polish — Cierre y entrega a A2 (coordinador K, onda 5)

*Parte de S4.*

- [x] T019 [US1] K · Compuerta acumulada de las cuatro unidades, la tabla de F2-I1 a F2-I6 para A2 y el aviso al coordinador de lo que le toca a la hoja de ruta (FR-010, FR-019; SC-001, SC-002, SC-013; plan 5.1)
