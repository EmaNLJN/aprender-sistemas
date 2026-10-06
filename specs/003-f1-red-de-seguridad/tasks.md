# Tasks: F1 · Red de seguridad del port del front

**Input**: `specs/003-f1-red-de-seguridad/` (`spec.md`, `plan.md`, `research.md`, `data-model.md` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S2) están en la sección «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca la cabeza de una cola que puede correr a la vez que otras de su fase: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, su código de referencia, sus roturas deliberadas y sus comandos. Cada tarea lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec. Cada spec de la red describe lo que el front hace hoy: nace en verde y se prueba con una rotura deliberada del código de producción, que no se commitea (constitución, principio II; plan, «Constitution Check»).

## Phase 1: Setup — Dependencias y esqueleto de la red (coordinador K, onda 0)

- [ ] T001 [US5] Dependencias `vitest` 5.0.3 y `@playwright/test` 1.63.0 en `package.json` y `package-lock.json` (el commit ya está en el worktree de F1, `feat/f1-red-de-seguridad`) y el Chrome Headless Shell con `npx playwright install --only-shell chromium` (FR-024; plan 1.1)
- [ ] T002 [US5] Esqueleto de la red: `qa/e2e/playwright.config.ts`, `qa/e2e/tsconfig.json`, `tsconfig.qa.json` y los scripts `test:e2e`, `test:e2e:install` y `typecheck` de `package.json`; sin `dist/`, `npm run test:e2e` falla con «Falta dist/index.html…» (FR-001, FR-019; plan 1.2)

## Phase 2: Foundational — Librerías, guardas y Vitest (onda 1: B y V a la vez)

*Parten de S0. B y V tocan archivos disjuntos.*

- [ ] T003 [P] [US3] Red base (dueño B): `qa/e2e/lib/`, `qa/e2e/fixtures/` (`pageIssues`, `strictNetwork`, `compiler` y `storage`), `qa/e2e/pages/` (el shell, el laboratorio, campaña, Sistemas y el Atlas) y `qa/e2e/specs/guards.spec.ts`, con las guardas probadas por `test.fail()` (FR-009, FR-010, FR-011, FR-015; SC-004; plan 2.1)
- [ ] T004 [P] [US4] Vitest (dueño V): `frontend/vitest.config.ts`, `tsconfig.node.json` y las specs `frontend/src/entities/guide/model/route-store-instances.spec.ts` y `frontend/src/app/engine-init-order.spec.ts`, en verde con el defecto conocido (FR-014, FR-016, FR-017, FR-018; SC-005; plan 3.1)

## Phase 3: Specs de la red — Enlaces, puentes, ciclo, arranque y aspecto (onda 2: U, C, P y S a la vez)

*Parten de S1, con T003 integrado. Cada dueño sólo toca sus specs en `qa/e2e/specs/`.*

- [ ] T005 [P] [US1] Las ocho vistas por hash y el historial: `qa/e2e/specs/views.spec.ts` (dueño U; FR-002, FR-014; SC-001; plan 4.1)
- [ ] T006 [US1] Las seis formas de URL con query y los bordes: `qa/e2e/specs/url-contract.spec.ts` (dueño U; FR-003, FR-015; SC-001; plan 4.2)
- [ ] T007 [US1] Los 11 enlaces que cambian la query recargan el documento, y qué estado se pierde: `qa/e2e/specs/reload.spec.ts` (dueño U; FR-004, FR-015; SC-002; plan 4.3)
- [ ] T008 [P] [US1] Los puentes del laboratorio con campaña y Sistemas: `qa/e2e/specs/bridges.spec.ts` (dueño C; FR-005, FR-014; plan 4.4)
- [ ] T009 [US3] El ciclo entre vistas con el compilador simulado, con sus cuatro resultados: `qa/e2e/specs/cycle.spec.ts` (dueño C; FR-006, FR-009; SC-004; plan 4.5)
- [ ] T010 [P] [US2] El arranque con el progreso de master y con el almacenamiento bloqueado, y la persistencia de los cuatro almacenes: `qa/e2e/specs/startup-storage.spec.ts` (dueño P; FR-007, FR-008; SC-003; plan 4.6)
- [ ] T011 [P] [US6] El contrato de CSS de las diez reglas que cruzan hojas, el movimiento reducido y el indicador de ejecución: `qa/e2e/specs/css-contract.spec.ts` (dueño S; FR-012, FR-014; SC-008; plan 4.7)

## Phase 4: Polish — Cierre: scripts, CI, documentación, roturas, corridas y compuerta (coordinador K, onda 3)

*Parte de S2, con T004 a T011 integrados.*

- [ ] T012 [US5] `npm test` corre Vitest y `npm run test:unit` lo corre solo, en `package.json`; el job `front` instala el navegador, corre la red y sube el informe si falla, en `.github/workflows/ci.yml` (FR-020, FR-021; plan 5.1)
- [ ] T013 [US5] Los comandos reales en `AGENTS.md`, `qa/AGENTS.md` y `docs/agent-skills.md`, en lugar del aviso «hasta que se integre, no existen», y la «Enmienda» de `docs/adr/0008-pruebas-del-front.md` con las nueve precisiones del plan (FR-023; plan 5.2)
- [ ] T014 [US5] Roturas deliberadas sobre el árbol integrado, sin commitear: 3 de 3 de SC-006 y 10 de 10 de SC-008, más las de las guardas y las de Vitest (SC-006, SC-008; plan 5.3; quickstart.md, secciones 6 a 8)
- [ ] T015 [US5] Cinco corridas seguidas de la red sin reintentos y medición de los tiempos, que se anotan en la hoja de ruta (SC-007; plan 5.4; quickstart.md, secciones 5 y 11)
- [ ] T016 [US5] Compuerta final con producción intacta y PR en inglés, con los tres jobs de la CI en verde (FR-018, FR-022; SC-005, SC-009; plan 5.5; quickstart.md, sección 10)
