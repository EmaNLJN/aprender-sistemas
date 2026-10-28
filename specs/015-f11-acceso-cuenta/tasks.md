# Tasks: F11a · El acceso

**Input**: `specs/015-f11-acceso-cuenta/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md` y `contracts/front-interfaces.md`)

Las ondas, los dueños de archivos y los puntos de sincronización (S1 a S3) están en «Reparto en paralelo» de [plan.md](./plan.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar. La cola de cada dueño es secuencial.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo, y cada par rojo y verde es de su dueño.
- **La integración:** cada unidad es un PR contra `f11a/base`, y F11a llega a `master` en un solo PR, en T035 (research.md, R1).

## Phase 1: Setup — U0, la base (coordinador K, onda 0)

- [ ] T001 K · La línea base sobre `f11a/base`: el tamaño de `dist/index.html`, los checks, Vitest, los avisos de lint y los 123 E2E, en `specs/015-f11-acceso-cuenta/research.md` (FR-073; plan 0.1; quickstart §1)
- [ ] T002 K · Con permiso, `react-hook-form` 7.89.0 en `package.json` y `package-lock.json`, con su licencia en `frontend/THIRD-PARTY-NOTICES.txt` (FR-072; plan 0.2)
- [ ] T003 K · Con permiso (salvo que F3, F4 o F9 la hayan traído), la pila de DOM y `fishery`; `frontend/vitest.config.ts` con los proyectos `node` y `dom`, y `frontend/src/vitest.setup.ts` (FR-074; plan 0.3)

## Phase 2: Foundational — U1, el cliente, la sesión, las etapas, el doble y el proxy (onda 1: C, S, A, B, Q, E y K; onda 2: K)

- [ ] T004 [P] [US5] C · Specs en rojo del cliente: `frontend/src/shared/api/http/api-client.spec.ts` y `read-xsrf-token.spec.ts`, con `fake-fetch.ts` y `api-error.factory.ts` (FR-015 a FR-018 y FR-022; Review Focus 1; plan 1.1)
- [ ] T005 [US5] C · El cliente: `api-client.ts`, `api-failure.ts`, `read-xsrf-token.ts`, `api-client-context.ts` e `index.ts` en `frontend/src/shared/api/http/` (FR-015 a FR-018 y FR-022; plan 1.2)
- [ ] T006 [P] [US2] S · Specs en rojo de la sesión en `frontend/src/entities/session/model/`, con `session.factory.ts` (FR-008, FR-028 y FR-029; plan 1.3)
- [ ] T007 [US2] S · `parse-session.ts`, `session-store.ts`, `fetch-session.ts`, `password-length.ts` e `index.ts` de `frontend/src/entities/session/` (FR-008, FR-028 y FR-029; plan 1.4)
- [ ] T008 [US2] A · Desde S0, specs en rojo de «pedir el ingreso», de `reauthenticate` y de la puerta del acceso en `frontend/src/features/sign-in/` (FR-006, FR-010, FR-011 y FR-020; Review Focus 2; plan 1.5)
- [ ] T009 [US2] A · `access-request.ts`, `reauthenticate.ts`, `AccessGate.tsx`, `AccessPage.tsx`, `AccessDialog.tsx`, `AccessScreen.tsx`, `AccessHeading.tsx`, `access.css` e `index.ts` de `frontend/src/features/sign-in/` (FR-006, FR-010, FR-011 y FR-020; plan 1.6)
- [ ] T010 [P] [US5] B · Specs en rojo de `frontend/src/shared/lib/format-wait.ts` y de `access-tokens.ts`, `session-view.ts` y `session-gate.ts` en `frontend/src/app/boot/` (FR-002 a FR-007 y FR-009; SC-003; Review Focus 3 y 4; plan 1.7)
- [ ] T011 [US5] B · `format-wait.ts`, `access-tokens.ts`, `session-view.ts` y `session-gate.ts` (FR-001 a FR-009; plan 1.8)
- [ ] T012 [US5] K · Cableado desde S1: `frontend/src/index.html`, `frontend/styles.css`, `frontend/src/app/main.tsx`, `frontend/src/app/boot/account-stages.ts`, `frontend/src/app/account/` y la tabla de `qa/load-order-check.ts` (FR-001, FR-010 y FR-076; plan 1.11)
- [ ] T013 [P] [US5] Q · `qa/lib/content-server.ts` responde la sesión, aparte, y `qa/boot-check.ts` suma «the session is asked once, before the content» (FR-076; plan 1.9)
- [ ] T014 [P] [US5] E · `qa/e2e/lib/api-contract.ts`, `qa/e2e/fixtures/api-double.ts`, `qa/e2e/fixtures/index.ts`, `qa/e2e/pages/access.ts` y `qa/e2e/specs/session-stage.spec.ts` (FR-002 a FR-004, FR-009, FR-011, FR-014 y FR-075; SC-001 a SC-003; plan 1.10)
- [ ] T015 [P] [US5] K · `qa/vite-proxy-check.ts` (registrado en `qa/run-checks.ts`), `frontend/vite.config.ts`, `docker/compose.preview.yaml` y su escenario en `qa/compose-runs-check.ts` (FR-036; SC-012; Review Focus 5; plan 1.12)
- [ ] T016 [US5] K · Compuerta y PR de U1 contra `f11a/base` (FR-069, FR-076 y FR-077; SC-002; plan 1.13)

## Phase 3: User Story 2 - Ingresar y salir (Priority: P1) — U2 (onda 3: F, P, A, M y E; onda 4: K)

- [ ] T017 [P] [US2] F · Specs en rojo de los formularios: `describe-failure.spec.ts`, `form-components.spec.tsx` y `form-hooks.spec.tsx` en `frontend/src/shared/ui/form/` (FR-019, FR-021, FR-022 y FR-025 a FR-031; plan 2.1)
- [ ] T018 [US2] F · `describe-failure.ts`, `show-failure.ts`, `use-guarded-submit.ts`, `use-retry-countdown.ts`, `TextField.tsx`, `PasswordField.tsx`, `ServerError.tsx`, `form.css` e `index.ts` (FR-025 a FR-031 y FR-067; plan 2.2)
- [ ] T019 [P] [US4] P · `frontend/src/entities/privacy-notice/`: spec en rojo y después `config/privacy-notice.ts`, `PrivacyNoticeText.tsx`, `PrivacyNoticeDialog.tsx` y `privacy-notice.css` (FR-045 y FR-048; plan 2.3)
- [ ] T020 [US2] A · Desde S2, specs en rojo del ingreso y de «Salir»: `access-endpoints.spec.ts`, `sign-out.spec.ts` y `sign-in-screen.spec.tsx` (FR-023, FR-024 y FR-030 a FR-035; plan 2.4)
- [ ] T021 [US2] A · `access-endpoints.ts` (`login`), `sign-out.ts`, `LoginForm.tsx` y `AccessScreen.tsx` en `frontend/src/features/sign-in/` (FR-024 y FR-032 a FR-035; plan 2.5)
- [ ] T022 [US2] M · Desde S2, spec en rojo de «Tu cuenta»: `frontend/src/pages/account/ui/account-menu.spec.tsx` (FR-012, FR-013 y FR-049 a FR-052; plan 2.6)
- [ ] T023 [US2] M · `AccountMenu.tsx`, `AccountEntry.tsx`, `AccountDialog.tsx`, `SignOutSection.tsx`, `account.css` e `index.ts` de `frontend/src/pages/account/` (FR-012, FR-013, FR-019, FR-049 a FR-052 y FR-067; plan 2.7)
- [ ] T024 [P] [US2] E · `qa/e2e/pages/account.ts` y los E2E `sign-in.spec.ts` y `account.spec.ts` (FR-007, FR-012, FR-013, FR-016, FR-017, FR-019, FR-021 a FR-023, FR-030, FR-032, FR-033, FR-048, FR-050 a FR-052 y FR-075; SC-006 y SC-007; plan 2.8)
- [ ] T025 [US2] K · `AccountMenu` en `frontend/src/app/account/AccountRoot.tsx`, las hojas en `main.tsx`, y la compuerta y el PR de U2 (FR-069 y FR-077; plan 2.9)

## Phase 4: User Story 1 - Crear la cuenta con el enlace de invitación (Priority: P1) y User Story 4 - El aviso de privacidad (Priority: P2) — U3 (onda 5: A, E y K; onda 6: K)

- [ ] T026 [US1] A · Specs en rojo de `format-local-date-time.ts`, `invitation-problem.ts`, los endpoints del alta y del aviso, `invitation-screen.spec.tsx` y `privacy-reacceptance.spec.tsx` (FR-005, FR-025 a FR-030, FR-037 a FR-041, FR-046 y FR-047; plan 3.1)
- [ ] T027 [US1] A · `format-local-date-time.ts`, `invitation-problem.ts`, `access-texts.ts`, `InvitationScreen.tsx`, `InvitationProblem.tsx`, `InvitationSummary.tsx`, `SignupForm.tsx`, `AcceptPrivacyField.tsx`, `PrivacyReacceptance.tsx` y `AccessScreen.tsx` (FR-037 a FR-041, FR-046 y FR-047; plan 3.2)
- [ ] T028 [P] [US4] K · `PRIVACY_VERSION` en `x-laravel-env` de `docker/compose.yaml`, con su escenario primero en rojo en `qa/compose-runs-check.ts` (FR-045; plan 3.3)
- [ ] T029 [P] [US1] E · Los E2E `invitation.spec.ts` y `privacy-notice.spec.ts` (FR-005, FR-037 a FR-041, FR-046 a FR-048 y FR-075; SC-001; plan 3.4)
- [ ] T030 [US1] K · Compuerta de U3, la verificación a mano del alta contra el stack, y el PR (FR-069 y FR-077; plan 3.5; quickstart §4)

## Phase 5: User Story 3 - Restablecer la contraseña con el enlace (Priority: P1) — U4 (onda 7: A, E y K)

- [ ] T031 [US3] A · Specs en rojo de `resetPassword` y `reset-password-screen.spec.tsx` (FR-042 a FR-044; plan 4.1)
- [ ] T032 [US3] A · `resetPassword`, `ResetPasswordScreen.tsx`, `ResetPasswordForm.tsx`, `access-texts.ts` y la versión final de `AccessScreen.tsx` (FR-042 a FR-044; plan 4.2)
- [ ] T033 [P] [US3] E · Los E2E `reset-password.spec.ts` y `access-hygiene.spec.ts`, con `layer()` y `topbar` en los Page Objects (FR-042 a FR-044, FR-066 a FR-068, FR-070, FR-071 y FR-075; SC-005 a SC-007; plan 4.3)

## Phase 6: Polish — documentación, peso y cierre (onda 7: K; onda 8: K)

- [ ] T034 K · `docs/architecture.md`, `qa/AGENTS.md`, `AGENTS.md` y `README.md` (FR-077; plan 4.4)
- [ ] T035 K · El peso con la librería separada del código propio, la compuerta final con la red cinco veces seguidas, `docker compose build taller`, la verificación a mano y el PR de `f11a/base` a `master` (FR-069, FR-073 y FR-077; SC-004, con la tabla de estados del plan, SC-008 y SC-011; plan 4.5; quickstart §3 y §4)
