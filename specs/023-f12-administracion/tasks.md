# Tasks: F12a · La administración, sin correo

**Input**: `specs/023-f12-administracion/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/admin-page.md`)

Las ondas, los dueños de archivos y los puntos de sincronización (S1 a S4) están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos. F12b tendrá `plan-f12b.md` y sus propias tareas.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo, y cada par rojo y verde es de su dueño.
- **La integración:** cada unidad es un PR contra `f12a/base`, y F12a llega a `master` en un solo PR, en T026 (research.md, R1).

## Phase 1: Setup — U0, la base (coordinador K, onda 0)

- [ ] T001 K · La línea base sobre `f12a/base` (`master` con F11a): `html.length`, los checks, Vitest, los avisos de lint, los E2E y las firmas de F11a que difieren, en `specs/023-f12-administracion/research.md` (FR-057 y FR-060; plan 0.1; quickstart §1)
- [ ] T002 K · `reloadDocument` pasa de `frontend/src/app/account/` a `frontend/src/shared/lib/reload-document.ts`, sin cambio de comportamiento, y la compuerta de U0 (FR-062; plan 0.2)

## Phase 2: Foundational — U1, el modelo, los endpoints, la entrada y el doble (onda 1: M, A y E; onda 1b: K)

- [ ] T003 [P] [US3] M · `types.ts`, `admin.factory.ts` y specs en rojo de `parse-admin`, `emails`, `user-actions`, `link-texts` y `react-to-failure` en `frontend/src/pages/admin/model/` (FR-009, FR-015, FR-016, FR-019 a FR-021, FR-024, FR-025, FR-027, FR-028, FR-040 y FR-058; plan 1.1)
- [ ] T004 [US3] M · `parse-admin.ts`, `emails.ts`, `user-actions.ts`, `link-texts.ts`, `react-to-failure.ts`, `labels.ts` e `invitation-texts.ts` (FR-002, FR-009, FR-015, FR-016, FR-020 a FR-028 y FR-040; plan 1.2)
- [ ] T005 [US3] M · Spec en rojo de `frontend/src/pages/admin/api/admin-endpoints.spec.ts` (FR-009 a FR-011, FR-016, FR-019, FR-026, FR-032, FR-033, FR-036 y FR-039; plan 1.3)
- [ ] T006 [US3] M · `frontend/src/pages/admin/api/admin-endpoints.ts`: los ocho pedidos (FR-009 a FR-011, FR-016, FR-019, FR-026, FR-032, FR-033, FR-036 y FR-039; plan 1.4)
- [ ] T007 [P] [US5] A · Specs en rojo de `frontend/src/entities/session/model/is-admin.spec.ts` y `frontend/src/pages/account/ui/admin-entry.spec.tsx`, con la interfaz `AdministrationProps` (FR-001 y FR-004; plan 1.5)
- [ ] T008 [US5] A · `isAdmin`, `AccountMenu.tsx` con el panel y la prop `administration`, «Administrar el taller» en `AccountDialog.tsx` y el índice de `pages/account` (FR-001, FR-004 y FR-062; plan 1.6)
- [ ] T009 [P] [US5] E · `search` en `qa/e2e/fixtures/api-double.ts`, el fixture `admin` en `qa/e2e/fixtures/index.ts`, `qa/e2e/lib/admin-contract.ts` y `qa/e2e/pages/admin.ts` (FR-059 y FR-063; SC-010; plan 1.7)
- [ ] T010 K · Compuerta y PR de U1 contra `f12a/base` (FR-054 y FR-060; plan 1.8)

## Phase 3: User Stories 1 a 6 — U2, la página (onda 2: D, L y E; onda 3: L e I; onda 4: P; onda 4b: K)

- [ ] T011 [P] [US6] D · `frontend/src/pages/admin/ui/render-admin.tsx` y spec en rojo de `action-dialog.spec.tsx` (FR-005, FR-029 a FR-031, FR-036 a FR-038 y FR-043; SC-004; Review Focus 2 y 3; plan 2.1)
- [ ] T012 [US6] D · `copy-text.ts`, `recover-session.ts`, `FailureNotice.tsx`, `ConfirmStep.tsx`, `PasswordStep.tsx`, `LinkResult.tsx`, `LinksStep.tsx`, `ActionDialog.tsx` y `use-action-dialog.ts` (FR-005, FR-006, FR-029 a FR-031, FR-036 a FR-038, FR-043 y FR-055; plan 2.2)
- [ ] T013 [P] [US3] L · Spec en rojo de `frontend/src/pages/admin/ui/paged-list.spec.tsx` (FR-012 a FR-014, FR-041 y FR-042; plan 2.3)
- [ ] T014 [US3] L · `use-paged-list.ts`, `ListView.tsx`, `Pagination.tsx` y `FilterSelect.tsx` (FR-011 a FR-014, FR-023, FR-041 y FR-042; plan 2.4)
- [ ] T015 [US3] L · Desde S2, spec en rojo de `accounts-section.spec.tsx` (FR-002, FR-005, FR-006, FR-009 a FR-011, FR-013 a FR-020, FR-041 y FR-042; SC-005; plan 2.5)
- [ ] T016 [US3] L · `AccountsTable.tsx` y `AccountsSection.tsx` (FR-009 a FR-020, FR-051 y FR-055; plan 2.6)
- [ ] T017 [P] [US1] I · Desde S2, spec en rojo de `invitations-section.spec.tsx` (FR-021, FR-022, FR-024 a FR-028, FR-032 a FR-036, FR-040 y FR-042; plan 2.7)
- [ ] T018 [US1] I · `EmailsField.tsx`, `InviteForm.tsx`, `InvitationsTable.tsx` e `InvitationsSection.tsx` (FR-021 a FR-035, FR-051 y FR-055; plan 2.8)
- [ ] T019 [US5] P · Desde S3, `frontend/src/pages/admin/index.ts` y spec en rojo de `admin-page.spec.tsx`: la página montada sola (FR-050 y FR-062; SC-010; plan 2.9)
- [ ] T020 [US5] P · `AdminPage.tsx` y `admin.css` (FR-050 a FR-054 y FR-062; plan 2.10)
- [ ] T021 K · Compuerta y PR de U2 contra `f12a/base` (FR-054, FR-060 y FR-062; plan 2.11)

## Phase 4: User Story 5 de punta a punta — U3, los E2E y el cableado (onda 2: E; onda 5: K)

- [ ] T022 [P] [US5] E · Desde T010, los E2E en rojo `admin-entry.spec.ts`, `admin-accounts.spec.ts`, `admin-invitations.spec.ts` y `admin-layout.spec.ts` en `qa/e2e/specs/` (FR-001 a FR-008, FR-010, FR-050 a FR-053, FR-059 y FR-063; SC-001 a SC-006; Review Focus 4 y 5; plan 3.1)
- [ ] T023 [US5] K · Spec en rojo y después `frontend/src/app/account/AdminDialog.tsx`, `AccountRoot.tsx` con `administration={AdminDialog}` y el import de `admin.css` en `frontend/src/app/main.tsx` (FR-003, FR-004 y FR-062; Review Focus 1; plan 3.2)
- [ ] T024 K · Compuerta de U3 con la red tres veces seguidas, la revisión en el navegador y el PR (FR-007, FR-054 y FR-060; plan 3.3)

## Phase 5: Polish — documentación, peso y cierre (onda 6: K)

- [ ] T025 K · `docs/architecture.md` y `qa/AGENTS.md` (FR-061; plan 4.1)
- [ ] T026 K · El peso contra T001 con su condición de corte, la compuerta final con la red cinco veces seguidas, `docker compose build taller`, la verificación a mano y el PR de `f12a/base` a `master` (FR-056, FR-057 y FR-061; SC-003, con la tabla de estados del plan, SC-007 y SC-009; plan 4.2; quickstart §3 y §4)
