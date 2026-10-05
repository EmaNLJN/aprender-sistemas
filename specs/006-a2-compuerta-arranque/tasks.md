# Tasks: A2 · Compuerta de arranque

**Input**: `specs/006-a2-compuerta-arranque/` (`spec.md`, `plan.md`, `research.md`, `data-model.md` y `quickstart.md`)

Las ondas, los dueños de archivos, las interfaces y los puntos de sincronización (S0 a S4) están en «Reparto en paralelo» de [plan.md](./plan.md). `[P]` marca lo que puede correr a la vez que otras tareas `[P]` de su fase: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial. Cada línea remite al paso del plan con sus archivos, su código de referencia y sus comandos, y lleva su `[US#]` aunque no esté en una fase de historia, para trazarla a la spec (como en C2 y C6). US4, que A3 y el port no reescriban la compuerta, la cubren T003 y T004 (la fuente intercambiable y un spec con una fuente con la forma de la API) y T007 (la secuencia de etapas). **T001 es una compuerta:** si P1 falla, el plan se detiene y el usuario decide. Sus cifras van en el mensaje de su commit y en `research.md`.

## Phase 1: Setup — Spike y línea base (coordinador, onda 0)

- [ ] T001 [US1] El spike, que es la compuerta del plan: P1 a P4 sobre la base con F1 y F2.1 a F2.4, con su regla de decisión; resultados en el mensaje del commit y en `specs/006-a2-compuerta-arranque/research.md` (SC-008; plan 1.1)
- [ ] T002 [US1] Línea base de `node tools/content/dump-globals.ts .` sobre la base, con el `documentHash` del documento y antes de cualquier cambio de código (FR-017; plan 1.2)

## Phase 2: Foundational — Compuerta, soporte de QA y build (onda 1: G, Q y el coordinador a la vez)

*Parten de S0. La cola de G es secuencial: T003 y después T004.*

- [ ] T003 [P] [US2] Transporte y almacén en `frontend/src/shared/api/content/`, con sus specs: las 17 porciones, la fuente intercambiable, la fuente estática, los fallos y el almacén (FR-007, FR-011, FR-012; SC-004; plan 2.1)
- [ ] T004 [US2] Contenido tipado y compuerta: `frontend/src/app/content/` y `frontend/src/app/boot/{run-boot,content-gate,gate-view,content-stage}.ts` con sus specs, y la línea de `frontend/src/pages/atlas/index.ts` que reexporta `AtlasByLanguage` (FR-001, FR-006 a FR-013; SC-004; plan 2.2)
- [ ] T005 [P] [US1] Soporte de QA: `withContent` en `qa/lib/{sources,legacy-sources}.ts`, `content-document`, `publish-content-fixture` y `built-page`, `runtime-check`, los checks del Atlas y `tools/content/dump-globals.ts` con las dos disposiciones (FR-017, FR-019; plan 3.1)
- [ ] T006 [P] [US3] `dist/` como raíz web completa: el plugin de `frontend/vite.config.ts`, el `COPY` único de `frontend/Dockerfile`, el montaje entero de `docker/compose.preview.yaml` y el artefacto en `qa/build-check.ts` (FR-004, FR-014 a FR-016; plan 4.1)

## Phase 3: User Story 1 - El taller abre igual que hoy cuando el contenido llega (Priority: P1) — El corte (onda 2: Q y después el coordinador)

*Parte de S1. Las pruebas de T007 tienen que fallar antes de T008.*

- [ ] T007 [US1] Pruebas del corte, que fallan: `qa/lib/{boot-harness,content-server}.ts`, `qa/boot-check.ts` (los casos de la base, sin cambiar sus valores, más los de FR-020) y `qa/load-order-check.ts` leyendo la secuencia de etapas (FR-001, FR-003, FR-008, FR-009, FR-013, FR-020; SC-004; plan 5.1)
- [ ] T008 [US1] El corte, en un solo commit: `frontend/src/app/main.tsx` con `runBoot`, `frontend/src/app/boot/legacy-views.ts`, los adaptadores y el Atlas leyendo `getContent()`, y `frontend/src/pages/atlas/model/atlas-catalog.ts` borrado (FR-001 a FR-003, FR-005, FR-006, FR-013, FR-023; SC-001; plan 5.2)

## Phase 4: User Stories 1 a 3 - Oráculos, tamaño y E2E (Priority: P1) — El HTML sin currículo y el navegador real (onda 3: Q, el coordinador y E a la vez)

*Parten de S3.*

- [ ] T009 [P] [US1] El check del bundle construido, `qa/dist-content-check.ts`, con `evaluateBuiltPage` en `qa/lib/built-page.ts` (globals, bytes y 17 huellas), su alta en `qa/run-checks.ts` y el retiro de `tools/content/dump-dist-globals.ts` (FR-018; SC-001, SC-002; plan 6.1)
- [ ] T010 [P] [US3] `qa/build-check.ts` lee la página por `built-page.ts` y suma el módulo, el tope medido, el oráculo de ausencia y la versión en el HTML (FR-014, FR-015; SC-003; plan 6.2)
- [ ] T011 [P] [US2] E2E de A2 en la red de F1, en `qa/e2e/`: enlaces profundos, recarga, sin red, contenido roto, reintento, teclado y móvil (FR-007 a FR-010, FR-024; SC-004, SC-007; plan 6.3)

## Phase 5: Polish — Documentación y compuerta final (coordinador, onda 4)

*Parte de S4.*

- [ ] T012 [US3] La documentación que llama «autónomo» al HTML: `README.md`, `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` y `docs/refactor-roadmap.md` (FR-021; plan, «Documentación del FR-021»)
- [ ] T013 [US1] Compuerta final: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check`; el volcado de T002 también sobre la raíz de un commit anterior; Docker, con permiso; el tiempo hasta la primera vista (FR-016, FR-017, FR-022 a FR-024; SC-001, SC-002, SC-005 a SC-007; plan 7.2)
