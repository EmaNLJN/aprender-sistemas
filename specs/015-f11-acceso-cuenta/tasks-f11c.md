# Tasks: F11c · Recuperar por correo

**Input**: `specs/015-f11-acceso-cuenta/` (`spec.md`, `plan-f11c.md`, `research-f11c.md`, `quickstart-f11c.md`, `contracts/forgot-password-f11c.md` y `contracts/front-interfaces.md`)

Las ondas y los dueños de archivos están en «Reparto en paralelo» de [plan-f11c.md](./plan-f11c.md). Cada línea remite a la tarea del plan, que tiene los archivos, las interfaces, el código y los comandos.

- **`[P]`** marca la cabeza de una cola que puede correr a la vez que otras de su onda: archivos disjuntos y ninguna tarea anterior sin cerrar.
- **`[US#]`** va en cada tarea de código, para trazarla a la spec.
- **La numeración** sigue la de F11b (T036 a T053, en [tasks-f11b.md](./tasks-f11b.md)): F11c es la unidad U8.
- **Las pruebas no son opcionales** (constitución, principio II): cada tarea de código abre con su spec en rojo.
- **Cuándo:** F11c espera a C3c en `master`. Llega a `master` en un solo PR, en T059 (research-f11c.md, R34).

## Phase 1: Setup — la línea base (coordinador K, onda 0)

- [ ] T054 K · La línea base: C3c en `master`, las firmas de `LoginForm`, `AccessScreen` y el doble, el tamaño, los checks, Vitest, los avisos de lint y los E2E, en `specs/015-f11-acceso-cuenta/research-f11c.md` (FR-073 y FR-076; plan 0.1; quickstart-f11c §1)

## Phase 2: User Story 8 - Pedir el enlace por correo (Priority: P3) — U8 (onda 1: A y E; onda 2: K)

- [ ] T055 [P] [US8] E · `features` público en `qa/e2e/fixtures/api-double.ts`, con su línea en `contracts/front-interfaces.md`; `requestResetLink` en `qa/e2e/pages/access.ts`; el E2E `forgot-password.spec.ts` (FR-034, FR-060, FR-061, FR-066, FR-067 y FR-075; SC-007 y SC-010; Review Focus 3 y 4; plan 8.1)
- [ ] T056 [P] [US8] A · Specs en rojo: `requestResetLink` en `access-endpoints.spec.ts` y `frontend/src/features/sign-in/ui/forgot-password.spec.tsx` (FR-017, FR-021, FR-025, FR-027, FR-028, FR-030, FR-034, FR-060 y FR-061; SC-010; Review Focus 1 a 5; plan 8.2)
- [ ] T057 [US8] A · `requestResetLink`, `ForgotPasswordForm.tsx`, los textos de `access-texts.ts` (el 202 con el texto de la spec, decidido por el usuario el 2026-10-28), `onForgotPassword` en `LoginForm.tsx` y el estado `forgot` en `AccessScreen.tsx` (FR-060, FR-061, FR-069 y FR-071; plan 8.3)

## Phase 3: Polish — documentación, peso y cierre (onda 2: K)

- [ ] T058 K · `docs/architecture.md`, `qa/AGENTS.md` y la sección de `features/sign-in` de `contracts/front-interfaces.md` (FR-077; plan 8.4)
- [ ] T059 K · El peso contra T054, la compuerta, `docker compose build taller`, la verificación a mano y el PR a `master` (FR-069, FR-073 y FR-077; SC-004, con la tabla de estados del plan, SC-008 y SC-011; plan 8.5; quickstart-f11c §3)
