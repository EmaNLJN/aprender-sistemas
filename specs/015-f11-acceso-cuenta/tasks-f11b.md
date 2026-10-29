# Tasks: F11b · La cuenta

**Input**: `specs/015-f11-acceso-cuenta/` (`spec.md`, `plan-f11b.md`, `research-f11b.md`, `quickstart-f11b.md`, `contracts/account-f11b.md` y `contracts/front-interfaces.md`)

Las ondas, los dueños de archivos y los puntos de sincronización (S4 y S5) están en «Reparto en paralelo» de [plan-f11b.md](./plan-f11b.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **La numeración** sigue la de F11a (T001 a T035, en [tasks.md](./tasks.md)), y las unidades son U5 a U7.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo, y cada par rojo y verde es de su dueño.
- **La integración:** cada unidad es un PR contra `f11b/base`, y F11b llega a `master` en un solo PR, en T053, después de F11a (research-f11b.md, R19).

## Phase 1: Setup — la línea base (coordinador K, onda 0)

- [ ] T036 K · La línea base sobre `f11b/base`: «Tu cuenta» de F11a, F12a y las rutas del doble, el tamaño, los checks, Vitest, los avisos de lint y los E2E, en `specs/015-f11-acceso-cuenta/research-f11b.md` (FR-073 y FR-076; plan 0.1; quickstart-f11b §1)

## Phase 2: Foundational — U5, las piezas compartidas (onda 1: C y W; onda 2: M; onda 3: K)

- [ ] T037 [P] [US7] C · Specs en rojo de `download` y `readAttachmentName` en `frontend/src/shared/api/http/`, con `FakeReply.body` y `cutBody`; `download` en `fetch-session.spec.ts` y en `contracts/front-interfaces.md` (FR-056; SC-009; Review Focus 1 y 5; plan 5.1)
- [ ] T038 [US7] C · `download` y `renewingCsrf` en `api-client.ts`, y `attachment-name.ts` (FR-016 a FR-018 y FR-056; plan 5.2)
- [ ] T039 [P] [US7] W · Specs en rojo de `frontend/src/features/confirm-password/`, el slice que decidió el usuario el 2026-10-28 (FR-055; plan 5.3)
- [ ] T040 [US7] W · `confirmPassword`, `WRONG_PASSWORD` («La contraseña no es correcta.») e `isWrongPassword`, como decidió el usuario el 2026-10-28; `REQUIRED`, `MISMATCH` y `PASSWORD_HINT` en `frontend/src/shared/ui/form/form-texts.ts`, reexportados por `access-texts.ts` (FR-055; plan 5.4)
- [ ] T041 [US7] W · Si F12a está en la base, su `confirmPassword` y su texto pasan a `features/confirm-password`, y `PasswordStep` se queda en `pages/admin` (decisión del usuario, 2026-10-28), con `action-dialog.spec.tsx` sin editar; si no, «no aplica» en la línea base (plan 5.5)
- [ ] T042 [US6] M · Desde S4, specs en rojo de `account-context`, `account-failure` (el 422 `auth_failed` con texto propio, por la decisión del usuario del 2026-10-28) y `account-endpoints` en `frontend/src/pages/account/` (FR-054 a FR-056, FR-059 y FR-023; plan 5.6)
- [ ] T043 [US6] M · `model/account-context.ts`, `model/account-failure.ts` y `api/account-endpoints.ts` (FR-053 a FR-056 y FR-059; plan 5.7)
- [ ] T044 K · Compuerta y PR de U5 contra `f11b/base` (FR-076 y FR-077; plan 5.8)

## Phase 3: User Story 6 - Cambiar la contraseña (Priority: P2) — U6 (onda 4: M y E; onda 5: K)

- [ ] T045 [US6] M · La ayuda `render-account.tsx` y las specs en rojo `account-actions.spec.tsx` y `change-password.spec.tsx`, con la «á» descompuesta escrita con el escape (FR-019 a FR-021, FR-023, FR-025 a FR-031, FR-053, FR-054 y FR-066; Review Focus 3; plan 6.1)
- [ ] T046 [US6] M · `AccountSubdialog`, `AccountResult`, `AccountFailureNotice`, `use-account-failure`, `ChangePasswordForm`, `ChangePasswordDialog`, `AccountActions`, `account-texts.ts`, `AccountContext` en `AccountDialog.tsx` y `account.css` (FR-053, FR-054, FR-067 y FR-069; plan 6.2)
- [ ] T047 [P] [US6] E · `qa/e2e/lib/account-contract.ts`, los métodos de `qa/e2e/pages/account.ts` y el E2E `account-password.spec.ts` (FR-019 a FR-021, FR-053, FR-054, FR-066 y FR-075; plan 6.3)
- [ ] T048 [US6] K · Compuerta y PR de U6 contra `f11b/base` (FR-069, FR-076 y FR-077; plan 6.4)

## Phase 4: User Story 7 - Llevarse los datos y borrar la cuenta (Priority: P2) — U7 (onda 6: M, E y K; onda 7: K)

- [ ] T049 [US7] M · Specs en rojo `download-data.spec.tsx` y `delete-account.spec.tsx`, con el 422 `auth_failed` en el campo (decisión del usuario, 2026-10-28), y el orden de las tres acciones en `account-actions.spec.tsx` (FR-055 a FR-059; SC-009; Review Focus 1, 2 y 4; plan 7.1)
- [ ] T050 [US7] M · `use-still-mounted`, `IrreversibleField`, `DownloadDataForm`, `DownloadDataDialog`, `DeleteAccountForm`, `DeleteAccountDialog`, `AccountActions` y `account-texts.ts` finales; el 422 `auth_failed` de la confirmación, en el campo con «La contraseña no es correcta.» (decisión del usuario, 2026-10-28; FR-025 enmendado) (FR-055 a FR-059 y FR-071; plan 7.2)
- [ ] T051 [P] [US7] E · Las respuestas de la cuenta en `account-contract.ts` y los E2E `account-data.spec.ts` y `account-hygiene.spec.ts` (FR-055 a FR-059, FR-066 a FR-068, FR-070 y FR-075; SC-004, SC-005, SC-007 y SC-009; Review Focus 5; plan 7.3)

## Phase 5: Polish — documentación, peso y cierre (onda 6: K; onda 7: K)

- [ ] T052 K · `docs/architecture.md`, `qa/AGENTS.md` y la sección «`pages/account`» de `contracts/front-interfaces.md` (FR-077; plan 7.4)
- [ ] T053 K · El peso contra T036, la compuerta final con la red cinco veces seguidas, `docker compose build taller`, la verificación a mano y el PR de `f11b/base` a `master` (FR-069, FR-073 y FR-077; SC-004, con la tabla de estados del plan, SC-008 y SC-011; plan 7.5; quickstart-f11b §3 y §4)
