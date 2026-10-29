---
description: "Tareas de F10a, el spike del router y la red de E2E: un registro liviano; el detalle está en plan.md"
---

# Tasks: F10a · El spike del router y la red de E2E

**Input**: `specs/024-f10-shell/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/f10a-check-correspondence.md`). F10b sigue la numeración en `tasks-f10b.md`, desde T015.

## Phase 1: Setup

- [ ] T001 Línea base sobre `master` con F3 a F9, F11a y F12a: la red, el tope, el `dist`, el margen, los escenarios de los tres checks y los nombres que usan las E2E, en `specs/024-f10-shell/research.md` (plan §0.1; quickstart §1)

## Phase 2: User Story 8 - El spike decide el router con datos (Priority: P1)

- [ ] T002 [US8] Pedido de permiso de descarga de los candidatos, con el nombre, la versión, el origen, la licencia y el tamaño de cada paquete (acción del usuario; plan §1; research R3)
- [ ] T003 [US8] La copia descartable, el seam de `startSpikeRouter` y la variante del router propio, con C1 a C8 y el peso (plan §2.1; quickstart §2)
- [ ] T004 [US8] React Router con `createHashRouter` y, si falla, `HashRouter`, en la copia (plan §2.2)
- [ ] T005 [US8] TanStack Router con `createHashHistory` y, si falla, una historia propia, en la copia (plan §2.3)
- [ ] T006 [US8] La decisión con la regla de FR-010, en «Resultado del spike» de `specs/024-f10-shell/research.md` (plan §2.4; SC-002)

## Phase 3: User Story 1, 2, 3 y 4 - La red del shell y del arranque, contra la base (Priority: P1)

- [ ] T007 [P] [US1] El Page Object del shell en `qa/e2e/pages/shell.ts` y las sondas `qa/e2e/lib/main-mounts.ts` y `qa/e2e/lib/store-openings.ts` (plan §3.1)
- [ ] T008 [US1] La navegación, el foco, Atrás y Adelante, el hash desconocido y el salto al contenido en `qa/e2e/specs/shell-navigation.spec.ts` (plan §3.2)
- [ ] T009 [US1] Un montaje por navegación y ninguno por `replaceState` en `qa/e2e/specs/shell-mounts.spec.ts` (plan §3.3; SC-010)
- [ ] T010 [US2] El idioma del shell y de los enlaces en `qa/e2e/specs/shell-language.spec.ts` (plan §3.4)
- [ ] T011 [US3] La barra lateral, los conteos, la exportación y el toast en `qa/e2e/specs/shell-sidebar.spec.ts` (plan §3.5)
- [ ] T012 [US4] El arranque observado por sus efectos en `qa/e2e/specs/boot-order.spec.ts` (plan §3.6; SC-006)

## Phase 4: User Story 7 - La tabla de correspondencia (Priority: P2)

- [ ] T013 [US7] La correspondencia de `boot-check`, `app-shell-check` y `load-order-check`, reconciliada con la base, en `specs/024-f10-shell/contracts/f10a-check-correspondence.md` (plan §4; SC-007)

## Phase 5: Polish

- [ ] T014 Compuerta y PR de F10a (plan §0.2 y §5; quickstart §3)
