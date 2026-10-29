# Tasks: F14a · Las estadísticas del admin, los agregados y la operación

**Input**: `specs/028-f14-estadisticas-admin/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/usage-section.md`)

Las ondas, los dueños de archivos y los puntos de sincronización (S1 a S4) están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos. F14b sigue en [tasks-f14b.md](./tasks-f14b.md), de T029 a T041.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo, y cada par rojo y verde es de su dueño.
- **La integración:** cada unidad es un PR contra `f14a/base`, y F14a llega a `master` en un solo PR, en T028, con C5 ya integrada.

## Phase 1: Setup — U0, la base y uPlot (coordinador K, onda 0)

- [ ] T001 K · La línea base sobre `f14a/base`: el tamaño de `dist/index.html`, los checks, Vitest, los avisos de lint, los E2E, las ramas B1 a B8 y las firmas de F12a y F11a que difieren, en `specs/028-f14-estadisticas-admin/research.md` (FR-057 y FR-061; plan 0.1; quickstart §1)
- [ ] T002 K · Con permiso del usuario, `uplot` 1.6.32 en `package.json` y `package-lock.json`, su tamaño minificado (corte en 60 000) y su bloque en `frontend/THIRD-PARTY-NOTICES.txt` (FR-056 y FR-057; plan 0.2; quickstart §2)

## Phase 2: Foundational — U1, el modelo, el gráfico como datos y los pedidos (onda 1: M, C y A; onda 1b: K)

- [ ] T003 [P] [US1] M · `usage-types.ts`, `usage.factory.ts` y la spec en rojo de `parse-usage` en `frontend/src/pages/admin/model/` (FR-011, FR-012, FR-015, FR-016, FR-019, FR-021 y FR-023; SC-001; plan 1.1)
- [ ] T004 [US1] M · `json-reader.ts` y `parse-usage.ts` (FR-011, FR-012, FR-015, FR-016, FR-019, FR-021 y FR-023; plan 1.2)
- [ ] T005 [US2] M · Specs en rojo de `period`, `usage-format`, `exercise-order`, `curriculum-filters`, `stats-failure` y `content-titles` (FR-004 a FR-006, FR-010, FR-014, FR-017, FR-020, FR-041, FR-042 y FR-050; plan 1.3)
- [ ] T006 [US2] M · `usage-labels.ts`, `usage-format.ts`, `period.ts`, `exercise-order.ts`, `curriculum-filters.ts`, `stats-failure.ts` y `content-titles.ts` (FR-004 a FR-010, FR-014, FR-017, FR-020, FR-040 a FR-042 y FR-050; plan 1.4)
- [ ] T007 [P] [US1] C · Desde T002, specs en rojo de `model/bar-chart` y `lib/bar-plot-options` (FR-045 a FR-048 y FR-063; plan 1.5)
- [ ] T008 [US1] C · `bar-chart.ts`, `bar-plot-options.ts`, `lib/plot.ts` con la licencia de uPlot, `matchMedia` en `frontend/src/vitest.setup.ts` y los dos globals de `qa/lib/boot-harness.ts` (FR-045 a FR-048, FR-055, FR-061 y FR-063; Review Focus 1 y 2; plan 1.6)
- [ ] T009 [P] [US6] A · `export` de `decode` en `api/admin-endpoints.ts` y la spec en rojo de `api/usage-endpoints` (FR-004, FR-014, FR-021, FR-024 y FR-044; plan 1.7)
- [ ] T010 [US6] A · `frontend/src/pages/admin/api/usage-endpoints.ts`: los cuatro pedidos a C5 (FR-004, FR-014, FR-021, FR-024 y FR-044; plan 1.8)
- [ ] T011 K · Compuerta y PR de U1 contra `f14a/base` (FR-056 y FR-061; plan 1.9)

## Phase 3: User Stories 1, 2 y 6 — U2, los hooks y las piezas (onda 2: H; onda 2b: K)

- [ ] T012 [P] [US8] H · Desde S1, `ui/usage-fetch.ts` y la spec en rojo de los hooks y los contextos, `ui/usage-hooks.spec.tsx` (FR-004, FR-044, FR-050 y FR-051; plan 2.1)
- [ ] T013 [US8] H · `lib/use-stats-request.ts`, `lib/use-runs-pages.ts`, `ui/period-context.tsx` y `ui/content-titles-context.tsx` (FR-004, FR-020, FR-044, FR-049 a FR-051; plan 2.2)
- [ ] T014 [US7] H · Spec en rojo de las piezas, `ui/usage-pieces.spec.tsx`, con `lib/plot` reemplazado (FR-005, FR-006, FR-041, FR-042, FR-046, FR-047, FR-050, FR-053 y FR-063; plan 2.3)
- [ ] T015 [US7] H · `StatsTable`, `Figures`, `RateCell`, `Distribution`, `StatsFailure`, `RequestState`, `AggregateNotes`, `DateField`, `PeriodForm` y `SeriesChart`, y la compuerta de U2 (FR-005 a FR-008, FR-041 a FR-055 y FR-063; plan 2.4 y 2.5)

## Phase 4: User Stories 1, 2 y 6 — U3, las vistas, la sección y su cableado (onda 3: V1, V2 y V3; onda 4: P; onda 5: K)

- [ ] T016 [P] [US1] V1 · Desde S2, specs en rojo de `model/overview-series` y de `ui/overview-view` (FR-001, FR-004 a FR-013, FR-050 y FR-051; SC-001; plan 3.1)
- [ ] T017 [US1] V1 · `model/overview-series.ts`, `ui/OverviewView.tsx` y `ui/OverviewReport.tsx` (FR-006 a FR-013 y FR-045 a FR-047; plan 3.2)
- [ ] T018 [P] [US2] V2 · Desde S2, spec en rojo de `ui/exercises-view` (FR-014 a FR-020, FR-041 y FR-042; SC-001 y SC-002; plan 3.3)
- [ ] T019 [US2] V2 · `ui/curriculum-columns.tsx`, `ui/CurriculumReport.tsx`, `ui/ExerciseDetail.tsx` y `ui/ExercisesView.tsx` (FR-014 a FR-020, FR-040 a FR-042, FR-052 y FR-053; plan 3.4)
- [ ] T020 [P] [US6] V3 · Desde S2, spec en rojo de `ui/runs-view` (FR-021 a FR-024; SC-001; plan 3.5)
- [ ] T021 [US6] V3 · `ui/QueuePanel.tsx`, `ui/RunFiltersForm.tsx`, `ui/RunsList.tsx` y `ui/RunsView.tsx` (FR-021 a FR-024; plan 3.6)
- [ ] T022 [US1] P · Desde S3, spec en rojo de `ui/usage-section`: la página sola con «Uso del taller», la cancelación y el período compartido (FR-001 a FR-004 y FR-044; SC-009; Review Focus 3; plan 3.7)
- [ ] T023 [US1] P · `ui/UsageSection.tsx`, `AdminSection` con `'usage'`, `AdminPage` con `PeriodProvider`, el índice, `admin.css` y la aserción de la licencia en `qa/build-check.ts`, con el peso medido (FR-001 a FR-003, FR-054, FR-055 y FR-057; Review Focus 1 y 2; plan 3.8)
- [ ] T024 [US2] K · `ContentTitlesProvider` con `getContent` en el contenedor de `app/` que dibuja `<AdminPage` (B3), la compuerta de U3 con la red tres veces y la revisión en el navegador (FR-020 y FR-061; plan 3.9)

## Phase 5: User Stories 5, 7 y 8 de punta a punta — U4, las E2E (onda 1: E; onda 3: E)

- [ ] T025 [P] [US5] E · `qa/e2e/lib/usage-contract.ts`, `qa/e2e/pages/usage.ts` y el fixture `usage` en `qa/e2e/fixtures/index.ts` (FR-060; SC-009; plan 4.1)
- [ ] T026 [US5] E · Desde S2, las E2E en rojo `admin-usage-overview`, `admin-usage-exercises`, `admin-usage-runs` y `admin-usage-layout` en `qa/e2e/specs/` (FR-005, FR-010, FR-022, FR-038, FR-043, FR-044, FR-048, FR-050, FR-052 a FR-054, FR-058, FR-060 y FR-063; SC-001 a SC-008; Review Focus 4 y 5; plan 4.2)

## Phase 6: Polish — documentación, peso y cierre (onda 6: K)

- [ ] T027 K · `docs/architecture.md` y `qa/AGENTS.md` (FR-062; plan 5.1)
- [ ] T028 K · El peso contra T001 (corte en 80 000), la compuerta final con la red cinco veces, la revisión manual con datos armados, SC-008 y el PR de `f14a/base` a `master` con C5 integrada (FR-057, FR-061 y FR-062; SC-007, SC-008 y SC-010; plan 5.2; quickstart §5 a §7)
