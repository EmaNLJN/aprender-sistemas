# Tasks: F12b · La administración, con correo

**Input**: `specs/023-f12-administracion/` (`spec.md`, `plan-f12b.md`, `research-f12b.md`, `quickstart-f12b.md` y `contracts/admin-page.md`)

Las ondas, los dueños de archivos y los puntos de sincronización (S1 a S3) están en «Reparto en paralelo» de [plan-f12b.md](./plan-f12b.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **La numeración** sigue la de F12a (T001 a T026, en [tasks.md](./tasks.md)), para que un commit que nombra una tarea no sea ambiguo dentro de la carpeta.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo, en un archivo nuevo, y ninguna spec de F12a se edita.
- **La integración:** cada unidad es un PR contra `f12b/base`, y F12b llega a `master` en un solo PR, en T041 (research-f12b.md, R1).

## Phase 1: Setup — U0, la base (coordinador K, onda 0)

- [ ] T027 K · La línea base sobre `f12b/base` (`master` con F12a y C3c): `html.length`, los checks, Vitest, los avisos de lint, los E2E y `git apply --check` de los 18 diffs, en `specs/023-f12-administracion/research-f12b.md` (FR-057 y FR-060; plan 0.1; quickstart-f12b §1)

## Phase 2: Foundational — U1, el modelo, los pedidos y el doble (onda 1: M y E; onda 1b: K)

- [ ] T028 [P] [US7] M · `types.ts`, los stubs de `mail.ts`, `parseMailedInvitation` e `invitationActionsFor`, y `mail-model.spec.ts` en rojo, en `frontend/src/pages/admin/model/` (FR-045 a FR-047, FR-049 y FR-058; plan 1.1)
- [ ] T029 [US7] M · `mail.ts`, `parse-admin.ts`, `invitation-texts.ts`, `link-texts.ts` y `react-to-failure.ts` (FR-044 a FR-047 y FR-049; Review Focus 2; plan 1.2)
- [ ] T030 [US7] M · Los stubs de `resendByEmail` y `sendPasswordReset`, `signInWithMail` en `render-admin.tsx`, y en rojo `api/admin-endpoints-mail.spec.ts` y `ui/action-dialog-mail.spec.tsx` (FR-044, FR-047 a FR-049; Review Focus 1, 2 y 5; plan 1.3)
- [ ] T031 [US7] M · `admin-endpoints.ts`, `ActionDialog.tsx` y `use-action-dialog.ts`: la entrega al invitar, los dos pedidos nuevos y la prop `withoutMail` (FR-039, FR-044, FR-047 a FR-049; plan 1.4)
- [ ] T032 [P] [US7] E · `features` en `qa/e2e/fixtures/api-double.ts`, `mail_unavailable` y `WITH_MAIL` en `qa/e2e/lib/admin-contract.ts`, la entrega en `qa/e2e/pages/admin.ts` y la sección `qa/e2e` de `contracts/admin-page.md` (FR-059; plan 1.5)
- [ ] T033 K · Compuerta y PR de U1 contra `f12b/base` (FR-054 y FR-060; plan 1.6)

## Phase 3: User Story 7 - Invitar y recuperar por correo (Priority: P3) — U2 (onda 2: I, L y E; onda 2b: K)

- [ ] T034 [P] [US7] I · Desde S1, el stub de `DeliveryField.tsx` y `ui/invitations-mail.spec.tsx` en rojo (FR-044 a FR-047, FR-049 y FR-051; Review Focus 1 a 3; plan 2.1)
- [ ] T035 [US7] I · `DeliveryField.tsx`, `InviteForm.tsx`, `InvitationsTable.tsx` e `InvitationsSection.tsx` en `frontend/src/pages/admin/ui/` (FR-044 a FR-047, FR-049, FR-051 y FR-055; plan 2.2)
- [ ] T036 [P] [US7] L · Desde S1, `model/user-actions-mail.spec.ts` y `ui/accounts-mail.spec.tsx` en rojo (FR-048, FR-049 y FR-051; Review Focus 3 y 4; plan 2.3)
- [ ] T037 [US7] L · `user-actions.ts`, `AccountsTable.tsx` y `AccountsSection.tsx`: la recuperación de un tercero, al final de la fila (FR-048 y FR-049; plan 2.4)
- [ ] T038 [P] [US7] E · Desde T033, `qa/e2e/specs/admin-mail.spec.ts` en rojo (FR-044 a FR-053 y FR-059; SC-006 y SC-008; plan 2.5)
- [ ] T039 K · Compuerta de U2 con la red tres veces seguidas, la revisión en el navegador y el PR (FR-054 y FR-060; SC-003; plan 2.6)

## Phase 4: Polish — documentación, peso y cierre (onda 3: K)

- [ ] T040 K · `docs/architecture.md`, `qa/AGENTS.md` y el párrafo de F12b de `specs/023-f12-administracion/contracts/admin-page.md` (FR-061; plan 3.1)
- [ ] T041 K · El peso contra T027 con su condición de corte, la compuerta final con la red cinco veces seguidas, `docker compose build taller`, la verificación a mano contra el stack con correo y el PR de `f12b/base` a `master` (FR-056, FR-057 y FR-061; SC-007 y SC-009; plan 3.2; quickstart-f12b §3 y §4)
