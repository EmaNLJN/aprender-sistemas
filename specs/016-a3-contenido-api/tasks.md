# Tasks: A3 · El front lee el contenido de la API

**Input**: `specs/016-a3-contenido-api/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md` y `contracts/front-interfaces.md`)

Las ondas, los dueños de archivos y los puntos de sincronización (S1 y S2) están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **Las pruebas no son opcionales** (constitución, principio II). Cada tarea de código abre con su spec en rojo, y cada par rojo y verde es de su dueño.
- **La integración:** cada unidad es un PR contra `a3/base`, y A3 llega a `master` en un solo PR, en T016 (research.md, R16).

## Phase 1: Setup — U0, la base (coordinador K, onda 0)

- [ ] T001 K · La línea base sobre `a3/base` (`master` con F11a) y el contraste de las firmas de F11a con su contrato, en `specs/016-a3-contenido-api/research.md` (Q1; plan 0.1; quickstart §1)

## Phase 2: Foundational — U1, los módulos nuevos sin cablear (onda 1: S y B; onda 2: K)

- [ ] T002 [P] [US2] S · Specs en rojo de `frontend/src/shared/lib/wait.ts` y `frontend/src/shared/api/content/content-copy.ts`, con `fake-copy-store.ts`, `portion-resources.ts` y los tipos nuevos de `content-source.ts` (FR-015, FR-017 y FR-018; plan 1.1)
- [ ] T003 [US2] S · `wait.ts` y `content-copy.ts` (FR-015, FR-017 y FR-018; plan 1.2)
- [ ] T004 [P] [US4] B · Specs en rojo de `attempt-budget.ts`, `session-reader.ts` y `copy-notice.ts` en `frontend/src/app/boot/`, y de `frontend/src/shared/lib/format-long-date.ts` (FR-001, FR-002, FR-009, FR-010, FR-021 y FR-025; Review Focus 1; plan 1.3)
- [ ] T005 [US4] B · `attempt-budget.ts`, `session-reader.ts`, `copy-notice.ts` y `format-long-date.ts` (FR-001, FR-002, FR-009, FR-010, FR-021, FR-025 y FR-026; plan 1.4)
- [ ] T006 [US3] S · Desde T003, specs en rojo de `api-content-source.ts` e `indexeddb-copy-store.ts` en `frontend/src/shared/api/content/`, con `fake-content-api.ts` y `fake-indexed-db.ts` (FR-004 a FR-009, FR-011, FR-012, FR-014, FR-016, FR-019, FR-022 a FR-024; SC-002, SC-003 y SC-006; Review Focus 2 a 5; plan 1.5)
- [ ] T007 [US3] S · `api-content-source.ts`, `indexeddb-copy-store.ts`, `content-copies.ts` e `index.ts` de `frontend/src/shared/api/content/` (FR-004 a FR-009, FR-011, FR-012, FR-014 a FR-019 y FR-021 a FR-024; plan 1.6)
- [ ] T008 K · Compuerta y PR de U1 contra `a3/base` (FR-031 y FR-034; plan 1.7)

## Phase 3: User Story 1 - El taller abre con el contenido de la API (Priority: P1), con las historias 2 a 6 en el corte — U2 (onda 3: G, Q, E y K; onda 4: K)

- [ ] T009 [P] [US1] G · Desde S1, specs en rojo del corte: `content-gate.spec.ts`, `gate-view.spec.ts`, `session-gate.spec.ts` y `session-view.spec.ts` en `frontend/src/app/boot/`, y `frontend/src/features/sign-in/model/sign-out.spec.ts` (FR-003, FR-010, FR-021, FR-027 y FR-028; Review Focus 1; plan 2.1)
- [ ] T010 [US1] G · El corte en el front:
  - en `frontend/src/shared/api/content/`: `content-source.ts`, `api-content-source.ts` e `index.ts`, y el borrado de `static-content-source.ts` y su spec;
  - en `frontend/src/app/boot/`: `content-gate.ts`, `gate-view.ts`, `session-gate.ts`, `session-view.ts`, `account-stages.ts` y `content-stage.ts`;
  - `frontend/src/app/content/content.ts`, `frontend/src/index.html`, `frontend/styles.css` y `frontend/vite.config.ts`;
  - «Salir»: `sign-out.ts`, `PrivacyReacceptance.tsx` y `SignOutSection.tsx`;
  - el contrato de F11a.

  (FR-001 a FR-003, FR-010, FR-013, FR-015, FR-021, FR-024 a FR-029 y FR-031; plan 2.2)
- [ ] T011 [P] [US6] Q · Desde S1, en rojo y en verde desde S2: en `qa/lib/`, `boot-harness.ts`, `content-server.ts`, `built-page.ts` y `sources.ts`; y en `qa/`, `boot-check.ts`, `dist-content-check.ts` y `build-check.ts` (FR-013, FR-020, FR-023, FR-030 y FR-035 a FR-037; SC-001, SC-003 y SC-009; plan 2.3)
- [ ] T012 [P] [US3] E · Desde S1, en rojo y en verde desde S2, cada adaptación en su commit:
  - en `qa/e2e/lib/`: `content-portions.ts`, `content-requests.ts` y `content-copy.ts`;
  - `qa/e2e/fixtures/api-double.ts`;
  - la adaptación de `qa/e2e/specs/content-gate.spec.ts` (A2), y la de `qa/e2e/specs/session-stage.spec.ts` y `qa/e2e/specs/sign-in.spec.ts` (F11a);
  - el nuevo `qa/e2e/specs/content-api.spec.ts`.

  (FR-002, FR-005, FR-012, FR-014, FR-016, FR-019, FR-021, FR-023 a FR-026, FR-038 a FR-041; SC-002 a SC-006; plan 2.4)
- [ ] T013 K · La documentación en `AGENTS.md`, `README.md`, `docs/architecture.md`, `qa/AGENTS.md` y `docs/refactor-roadmap.md` (FR-018 y FR-043; plan 2.5)
- [ ] T014 K · Compuerta de U2, con el peso y su condición de corte, `dump-globals` y la red tres veces, y el PR (FR-031, FR-034, FR-035 y FR-038; SC-001, SC-008 y SC-009; plan 2.6; quickstart §2)

## Phase 4: Polish — U3, contra el stack y el cierre (onda 5: K)

- [ ] T015 [US5] K · Con permiso, `qa/classroom-boot-check.ts` y los 40 arranques contra el stack, con y sin copia (FR-042; SC-007 y SC-010; plan 3.1; quickstart §3)
- [ ] T016 K · Con permiso, la imagen web sin `/content/`, la vista previa, `npm run dev`, la verificación a mano sin servidor, la compuerta final con la red cinco veces y el PR de `a3/base` a `master` (FR-030, FR-032 y FR-033; SC-003 y SC-009; plan 3.2; quickstart §3)
