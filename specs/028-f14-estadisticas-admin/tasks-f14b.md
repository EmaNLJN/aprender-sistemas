# Tasks: F14b · Las estadísticas del admin, por cuenta

**Input**: `specs/028-f14-estadisticas-admin/` (`spec.md`, `plan-f14b.md`, `research-f14b.md`, `quickstart-f14b.md` y `contracts/usage-section.md`)

Las ondas y los dueños están en «Reparto en paralelo» de [plan-f14b.md](./plan-f14b.md), y las reglas comunes, en [plan.md](./plan.md). F14b empieza con F14a en `master` y sigue su numeración ([tasks.md](./tasks.md) termina en T028).

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda.
- **`[US#]`** va en cada tarea de código.
- **Las pruebas no son opcionales:** cada tarea de código abre con su spec en rojo, y ninguna prueba de F12a, F12b ni F14a se edita.
- **La integración:** cada unidad es un PR contra `f14b/base`, y F14b llega a `master` en un solo PR, en T041.

## Phase 1: Setup — U0, la base (coordinador K, onda 0)

- [ ] T029 K · La línea base sobre `f14b/base`, las ramas B1 a B5, el presupuesto que dejó F14a y las firmas reales de F14a, en `specs/028-f14-estadisticas-admin/research-f14b.md` (FR-057 y FR-061; plan-f14b 0.1; quickstart-f14b §1)

## Phase 2: Foundational — U1, las formas por cuenta, sus reglas y sus pedidos (onda 1: M; onda 1b: K)

- [ ] T030 [P] [US3] M · Las formas por cuenta en `usage-types.ts`, las fábricas y las specs en rojo de `parse-students`, `account-usage` y `usage-endpoints-students` en `frontend/src/pages/admin/` (FR-025, FR-026, FR-030 a FR-035, FR-037 y FR-039; plan-f14b 1.1)
- [ ] T031 [US3] M · `parseStudentRow`, `parseStudentDetail`, `account-usage.ts`, los textos de `usage-labels.ts` y `listStudents`, `getStudentDetail` y `listAccountRuns`, y la compuerta de U1 (FR-025, FR-026, FR-030 a FR-035, FR-037 y FR-039; plan-f14b 1.2)

## Phase 3: User Stories 3 y 4 — U2, «Alumnos» y el uso de una cuenta (onda 2: D y luego S)

- [ ] T034 [P] [US4] D · Desde S1, spec en rojo de `ui/account-usage.spec.tsx` (FR-030 a FR-037, FR-042; SC-002 y SC-004; plan-f14b 2.1)
- [ ] T035 [US4] D · `AccountUsage.tsx`, `AccountUsageReport.tsx`, `ExerciseGrid.tsx`, `AccountRuns.tsx`, `emptyText` en `RunsList.tsx` e `isNotFound` en `stats-failure.ts` (FR-029 a FR-037, FR-041, FR-042 y FR-045; plan-f14b 2.2)
- [ ] T032 [US3] S · Desde T035, spec en rojo de `ui/students-view.spec.tsx` (FR-025 a FR-027 y FR-039; plan-f14b 2.3)
- [ ] T033 [US3] S · `ui/StudentsView.tsx` sobre `usePagedList` y `ListView` de F12a (FR-025 a FR-027, FR-029 y FR-040; plan-f14b 2.4)

## Phase 4: User Story 4 en «Cuentas» — U3, la columna, la lista oculta y la vista (onda 3: P; onda 4: K)

- [ ] T036 [US4] P · Desde S2, spec en rojo de `ui/accounts-usage.spec.tsx`: la columna «Uso», la lista montada y oculta, el 404 y «Alumnos» en la sección (FR-002, FR-028, FR-029 y FR-036; Review Focus 2 y 4; plan-f14b 3.1)
- [ ] T037 [US4] P · `AccountsTable.tsx` con `onUsage`, `AccountsSection.tsx` con la lista oculta y el detalle, `'students'` en `UsageView` y `VIEW_LABELS`, `UsageSection.tsx` y `admin.css`, con el peso acumulado, y la compuerta de U3 (FR-002, FR-028, FR-029, FR-054 y FR-057; plan-f14b 3.2)

## Phase 5: User Stories 3, 4 y 5 de punta a punta — U4, las E2E (onda 1: E; onda 3: E)

- [ ] T038 [P] [US5] E · Los datos de una cuenta al final de `qa/e2e/lib/usage-contract.ts` (FR-060; plan-f14b 4.1)
- [ ] T039 [US5] E · Desde S2, las E2E en rojo `admin-usage-students` y `admin-usage-account` en `qa/e2e/specs/` (FR-025 a FR-038, FR-044, FR-054, FR-058 y FR-060; SC-002 a SC-004 y SC-008; Review Focus 1, 3 y 5; plan-f14b 4.2)

## Phase 6: Polish — documentación, peso y cierre (onda 4: K)

- [ ] T040 K · `docs/architecture.md` y `qa/AGENTS.md` (FR-062; plan-f14b 5.1)
- [ ] T041 K · El peso acumulado desde T001 de F14a (corte en 95 000), la compuerta final con la red cinco veces, la revisión manual con datos armados, SC-008 y el PR de `f14b/base` a `master` (FR-057, FR-061 y FR-062; SC-007, SC-008 y SC-010; plan-f14b 5.2; quickstart-f14b §4 y §5)
