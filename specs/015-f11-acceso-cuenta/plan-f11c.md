# Implementation Plan: F11c · Recuperar por correo

**Branch**: `015-f11-acceso-cuenta` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F11, en su parte c: FR-060 y FR-061, el lado de FR-034 que depende del correo, los transversales FR-066 a FR-077, SC-004 (la fila «Pedir el enlace»), SC-007, SC-008, SC-010 (la parte de F11c) y SC-011, y la historia 8. Decisiones y mediciones: [research-f11c.md](./research-f11c.md). Interfaces: [contracts/forgot-password-f11c.md](./contracts/forgot-password-f11c.md), que extiende [contracts/front-interfaces.md](./contracts/front-interfaces.md). Validación: [quickstart-f11c.md](./quickstart-f11c.md). Tareas: [tasks-f11c.md](./tasks-f11c.md). El [plan de F11a](./plan.md) fija la forma y la base, y el [de F11b](./plan-f11b.md), la numeración que este sigue.

**Objetivo:** que quien olvidó su contraseña pida el enlace por correo desde el ingreso, sin depender de quien opera el taller, cuando el taller manda correo.

**Arquitectura:**

- **El ingreso** muestra «¿Te olvidaste la contraseña?» sólo con `features.passwordReset` en `true`, y abre una pantalla más del acceso, «Recuperá tu contraseña».
- **La pantalla** llama a `POST /api/auth/forgot-password` sin `X-Taller-User` y muestra siempre el mismo texto.
- **El enlace del correo** es el de la consola, que el restablecimiento de F11a ya abre, así que no hay ninguna ruta nueva.

**Stack:** el de F11a: TypeScript, React 19.2.8, React Hook Form 7.89.0 y Zustand 5.0.15; Vitest 5.0.3 con jsdom y Testing Library, y Playwright 1.63.0. Ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», el contrato y la sección de tu tarea. `tasks-f11c.md` tiene una línea por tarea (T054 a T059) y remite acá.
> - **Cuándo.** F11c espera a C3c en `master` (spec, «Partición»; el dominio). T054 lo comprueba antes de empezar.
> - **La numeración** sigue la de F11b (T036 a T053, U5 a U7): F11c es la unidad U8, con las tareas T054 a T059 (research-f11c.md, R34).
> - **El código verificado.** Ninguno. Se planificó leyendo la base de F11a en `impl-f11a` (`a7b3c71d`), su plan para el `AccessScreen` final (T032) y el contrato de C3c, que todavía no está implementada.

## Summary

- **Una unidad, U8, y un PR** (R34). Sale de `master` con F11a y C3c. No depende de F11b.
- **Una pantalla más del acceso** (R35): `AccessScreen` suma `{kind: 'forgot', email}`, y `LoginForm` suma `onForgotPassword`. `requestResetLink` llama a `forgot-password` como un pedido anónimo.
- **El texto del 202 es el de la spec** (R36; decisión 2 del informe): es el mismo para cualquier email, y dice cuánto dura el enlace.
- **Sin correo, el camino sin correo** (R37): el 503 muestra el mensaje del servidor y «Pedile el enlace a quien administra el taller.», sin bloquear el botón.
- **El doble de la API suma `features`** (R38), una propiedad pública como `account`. Los E2E prenden el correo sin copiar la sesión.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0.

**Primary Dependencies**: las de F11a. Ninguna nueva.

**Storage**: ninguno. El email vive en el formulario.

**Testing:** Vitest (`node` para `*.spec.ts` y `dom` para `*.spec.tsx`, con `frontend/src/vitest.setup.ts`; TR-6), y Playwright con Page Objects y el doble de la API. Los valores esperados salen del contrato de C3c, de `lang/es/` y de la spec.

**Target Platform**: navegador moderno (ES2020); Linux y macOS.

**Project Type**: aplicación web, con una pantalla nueva dentro del acceso de F11a.

**Performance Goals**: ninguna. El peso tiene presupuesto (R42).

**Scale/Scope:**

- 2 archivos nuevos y 4 cambiados en `features/sign-in`, con 2 specs;
- un E2E nuevo, el doble con una propiedad más y un método en el Page Object del acceso;
- `docs/architecture.md`, `qa/AGENTS.md` y `contracts/front-interfaces.md`.

## Restricciones globales

- **La red:**
  - **sin editar:** los E2E de la base de T054 (F1, A2, F11a y lo que haya entrado después) y los escenarios de `boot-check`, `dist-content-check` y `load-order-check` (FR-076);
  - **lo que cambia de `qa/`:** `qa/e2e/fixtures/api-double.ts`, que suma `features` sin cambiar su respuesta por omisión, y `qa/e2e/pages/access.ts`, que suma un método;
  - **lo que se suma:** `qa/e2e/specs/forgot-password.spec.ts`.
- **Las specs de la base:** ninguna se edita. `access-endpoints.spec.ts` suma un `describe`.
- **El documento:** ningún `.sr-only` nuevo; ninguna región `alert` ni `status` mientras no se muestra nada.
- **El estilo:** ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` (FR-069). F11c usa las clases de F11a y no suma reglas.
- **La seguridad:**
  - el pedido es anónimo: sin `X-Taller-User`, aunque haya una cuenta en el store (FR-017);
  - el texto del 202 es el mismo para cualquier email (FR-061 y FR-071);
  - el formulario se envía sólo por `handleSubmit`, con `noValidate` (FR-024).
- **Los textos:** los de la spec, «Textos que lee el alumno», «Pedir el enlace (F11c)» tal cual, más «Volver al ingreso» (research-f11c.md, «Textos que agrega el plan»). Los mensajes de error del servidor se muestran como llegan.
- **El peso:** `dist/index.html` bajo `BOOT_SIZE_LIMIT`, **1 500 000** caracteres, y F11c suma como mucho **+5 000** sobre T054 (R42).
- **La complejidad:** ninguna función nueva de más de 10. Los avisos de lint no suben respecto de T054.
- **La accesibilidad:** teclado (FR-066), 320 px y campos de 16 px (FR-067), sin animaciones (FR-068).
- **El backend:** no cambia. El contrato de C3c se consume tal cual.

## Constitution Check

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, un componente por archivo con `export default` y los slices de F11a, sin capas nuevas |
| II. TDD y pruebas útiles | Sí | Cada tarea de código abre con su spec en rojo contra stubs `const` tipados (TR-2). SC-010 se comprueba por rol, porque la nota sin correo contiene las mismas palabras (R39) |
| III. Código entendible | Sí | Un formulario de un campo; `describeFailure` de F11a traduce las fallas, y sólo el 503 suma el camino sin correo |
| IV. Contenido en Git, IDs estables | Sí | Ninguna URL nueva: el enlace del correo es el de F11a |
| V. Capas y contratos explícitos | Sí | Todo en `features/sign-in`, cuyo índice no cambia |
| VI. Español, accesibilidad y portabilidad | Sí | Textos de la spec; teclado y 320 px con E2E |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva |
| VIII. Flow-forward | Sí | `tasks-f11c.md`, una línea por tarea |

## Decisiones que aplica este plan

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **P1:** la partición de F11 | Este plan es F11c, que espera a C3c | T054 |
| **El doble de la API canónico** (2026-10-28, noche) | `features` es una propiedad más de `ApiDouble`, como `account`; ningún `replyTo` ni otra copia de la sesión | T055 |
| **La lista blanca `/status of NNN/`** | Cada error esperado del E2E se declara con su código | T055 |
| **Los stubs del rojo como `const` tipados** (TR-2) | Los stubs de `requestResetLink` y `ForgotPasswordForm` | T056 |
| **`stubDialogs` con un `showModal` que enfoca** (F11a-7) | Las specs del acceso lo usan, de `render-access.tsx` | T056 |
| **El tope del HTML** | `BOOT_SIZE_LIMIT` de 1 500 000, con un subpresupuesto de +5 000 | T059 |
| **F11c-1 a F11c-3** (hallazgos) | El 202 con `{message}`, el 422 en `errors.email`, ninguna ruta nueva, y `features` en el doble. El registro y `#verificar=` siguen fuera | R35 a R38 |

## Project Structure

### Documentation (this feature)

```text
specs/015-f11-acceso-cuenta/
├── plan-f11c.md                       # este archivo
├── research-f11c.md                   # decisiones y mediciones de F11c
├── quickstart-f11c.md                 # cómo se verifica F11c
├── contracts/forgot-password-f11c.md  # lo que suma F11c
└── tasks-f11c.md                      # T054 a T059
```

### Source Code (repository root)

```text
frontend/src/features/sign-in/          # (A)
├── api/access-endpoints.ts (+ .spec.ts)   # cambia: requestResetLink
├── ui/access-texts.ts                  # cambia: RESET_LINK_SENT y ASK_ADMIN_FOR_LINK
├── ui/ForgotPasswordForm.tsx           # nuevo
├── ui/forgot-password.spec.tsx         # nuevo
├── ui/LoginForm.tsx                    # cambia: onForgotPassword y el botón
└── ui/AccessScreen.tsx                 # cambia: el estado 'forgot'
qa/e2e/                                 # (E)
├── fixtures/api-double.ts              # cambia: features, público
├── pages/access.ts                     # cambia: requestResetLink
└── specs/forgot-password.spec.ts       # nuevo
docs/architecture.md, qa/AGENTS.md      # cambian (K, T058)
specs/015-f11-acceso-cuenta/contracts/front-interfaces.md   # cambia (E en T055; K en T058)
```

**Structure Decision:** todo vive en `features/sign-in`, porque la pantalla es parte del acceso (R35). Ningún slice nuevo.

## Review Focus

Lo que el revisor mira primero:

- **El pedido es anónimo** y lleva el CSRF.
- **El texto del 202 no cambia con el email,** tampoco en el segundo pedido del mismo documento.
- **Sin correo,** no hay ningún botón ni enlace con ese nombre, y la nota de F11a sigue igual.
- **El doble responde la sesión igual que antes** con `features` por omisión: la red de la base no se edita.
- **Ningún `style=`,** y el peso.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **El 503 trae `Retry-After: 3600`,** pero el botón no tiene que quedar bloqueado una hora: el camino es el sin correo. Lo fija «shows the message of the server and the way without mail…», que exige el botón habilitado (T056).
2. **El ingreso como diálogo después de un 401,** con una cuenta en el store: el pedido tampoco lleva `X-Taller-User` (FR-017). Lo fija «does not send X-Taller-User even when the access opens over a session» (T056).
3. **Dos pedidos en el mismo documento,** uno con un email con cuenta y otro sin cuenta: el segundo muestra el mismo texto, sin restos del primero (SC-010). Lo fijan «…shows the same text for an email with an account and one without» (T056) y su E2E (T055).
4. **La nota sin correo contiene «¿Te olvidaste la contraseña?».** Buscar el texto no distingue los dos estados, así que se busca por rol (R39). Lo fijan «offers no «¿Te olvidaste la contraseña?» button…» (T056) y el E2E «without mail» (T055).
5. **Un email mal formado pasa por el navegador** (`noValidate`), y el servidor lo marca con `errors.email`. Lo fija «marks the email that the server refuses» (T056).

## Reparto en paralelo

- **A, el acceso:** `features/sign-in`.
- **E, los E2E:** `qa/e2e/fixtures/api-double.ts`, `qa/e2e/pages/access.ts`, `qa/e2e/specs/forgot-password.spec.ts` y la sección del doble de `front-interfaces.md`.
- **K, el coordinador:** T054, T058, T059 y la revisión de cada diff.

A y E son delegables al subagente `implementador`, con sus archivos, el contrato, los valores exactos y los checks, y sin comentarios.

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T054, la línea base y C3c |
| 1 | A y E | **A:** T056 y T057. **E:** T055 |
| 2 | K | T058 y T059 |

**Puertos de los E2E:** K `E2E_PORT=4173`, E `4191` y A `4192`.

**Integración** (R34): F11c sale de `master` con F11a y C3c, o de `f11a/base` si F11a todavía no entró, y llega a `master` en un solo PR, en T059.

## Reglas para todos los agentes

Las de [plan-f11b.md](./plan-f11b.md), «Reglas para todos los agentes», valen tal cual, con estos cambios:

- **Leé** las historias 8 y 2 de la spec, FR-034, FR-060 y FR-061, research-f11c.md, los dos contratos, el de C3c y tu tarea.
- **Los commits** usan `test(front): …`, `test(qa): …`, `feat(front): …`, `refactor(qa): …` y `docs: …`.
- **Las specs del acceso** usan `withReplies`, `renderAccess`, `resetSession` y `stubDialogs` de `features/sign-in/ui/render-access.tsx`, y nada más.

## 0. La línea base (coordinador K)

### Tarea 0.1 · La línea base y C3c (T054)

**Archivos:** `specs/015-f11-acceso-cuenta/research-f11c.md` (suma «Línea base de la implementación»).

1. **Que C3c esté en `master`.** F11c no empieza sin la ruta ni las features reales:

   ```sh
   grep -rn "forgot-password" backend/api/routes/api/
   ls backend/api/app/Auth/Features.php backend/api/app/Http/Controllers/Auth/ForgotPasswordController.php
   grep -n "mail_unavailable" backend/api/lang/es/api.php
   ```

   Si falta algo, F11c espera.
2. **Que la base de F11a sea la del plan:**

   ```sh
   grep -n "passwordResetByMail\|¿Te olvidaste" frontend/src/features/sign-in/ui/LoginForm.tsx
   grep -n "kind: 'reset'\|case 'privacy'\|PASSWORD_CHANGED" frontend/src/features/sign-in/ui/AccessScreen.tsx
   grep -n "REQUIRED\|PASSWORD_CHANGED" frontend/src/features/sign-in/ui/access-texts.ts
   grep -n "FEATURES\|features" qa/e2e/fixtures/api-double.ts
   grep -n "layer()\|requestResetLink" qa/e2e/pages/access.ts
   ```

   **Lo que se espera:** `LoginForm` recibe `passwordResetByMail` y dibuja la nota sin correo; `AccessScreen` es el final de T032 de F11a; `access-texts.ts` exporta `REQUIRED`; el doble tiene la constante `FEATURES`; `AccessPage` tiene `layer()`. Si una firma difiere, se anota, y la tarea que la usa sigue la real.
3. **Las medidas,** con quickstart-f11c.md §1: `html.length`, los checks, Vitest, los avisos de lint y los E2E.
4. **Commit:** `docs(specs): línea base de F11c`.

### 0.2 · La compuerta de U8

La de [plan-f11b.md](./plan-f11b.md), 0.2, sobre la rama de F11c y contra su base, con quickstart-f11c.md §2. La lista de archivos de `qa/` trae sólo `api-double.ts`, `pages/access.ts` y `forgot-password.spec.ts`.

## 8. U8 · Pedir el enlace por correo (onda 1: A y E; onda 2: K)

**Cubre:** FR-060 y FR-061; el lado de FR-034 que depende del correo; en la pantalla, FR-017, FR-021, FR-022, FR-024, FR-025, FR-027, FR-028, FR-030 y FR-031; FR-066 a FR-077; SC-004 (la fila «Pedir el enlace»), SC-007, SC-008, SC-010 (la parte de F11c) y SC-011; la historia 8.

### Tarea 8.1 · `features` en el doble y el E2E, en rojo (T055, E)

**Archivos:** `qa/e2e/fixtures/api-double.ts`, `qa/e2e/pages/access.ts`, `qa/e2e/specs/forgot-password.spec.ts` (nuevo) y la sección del doble de `specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`.

**Consume:** el doble y los Page Objects de F11a. **Produce:** `ApiDouble.features` y `AccessPage.requestResetLink`.

1. **`api-double.ts`** (R38), un refactor en verde:
   - se borra `const FEATURES = { passwordReset: false, registration: false };`;
   - después de los imports se suma:

     ```ts
     export interface SessionFeatures {
       passwordReset: boolean;
       registration: boolean;
     }
     ```

   - la clase suma, junto a `account` y `signInAccount`, `features: SessionFeatures = { passwordReset: false, registration: false };`;
   - en `installDefaults`, la sesión responde `features: this.features` en lugar de `features: FEATURES`.

   **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e`: toda la red de la base, en verde y sin editar. **Commit:** `refactor(qa): el doble de la API expone las features de la sesión`. En el mismo commit, `front-interfaces.md` suma `features: SessionFeatures` a la firma de `ApiDouble`, y la fila de `GET /api/session` de la tabla dice `features: api.features`.
2. **`qa/e2e/pages/access.ts`.** `AccessPage` suma:

   ```ts
   async requestResetLink(email: string): Promise<void> {
     await this.button('¿Te olvidaste la contraseña?').click();
     await this.field('Email').fill(email);
     await this.button('Mandarme el enlace').click();
   }
   ```

3. **`qa/e2e/specs/forgot-password.spec.ts`.** Cubre la historia 8, SC-010 y FR-061:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { STUDENT } from '../lib/api-contract';
   import { urls } from '../lib/urls';

   const SENT =
     'Si el email corresponde a una cuenta, te llega un enlace para elegir una contraseña nueva. Vence en 60 minutos.';
   const ACCEPTED = {
     status: 202,
     json: {
       message:
         'Si hay una cuenta con ese email, te mandamos un enlace para elegir otra contraseña. Revisá tu correo en unos minutos.',
     },
   };
   const NO_MAIL_HINT =
     '¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.';
   const WITH_MAIL = { passwordReset: true, registration: false };

   async function tabTo(page: Page, target: Locator): Promise<void> {
     for (let step = 0; step < 12; step += 1) {
       if (await target.evaluate((element) => element === document.activeElement)) return;
       await page.keyboard.press('Tab');
     }
     await expect(target).toBeFocused();
   }

   test.use({ sessionAccount: null });

   test.describe('without mail', () => {
     test('the sign-in offers no «¿Te olvidaste la contraseña?» button nor link, only the way without mail', async ({
       access,
       page,
     }) => {
       await page.goto(urls.view('recorrido'));
       await expect(access.heading('Ingresá al taller')).toBeVisible();
       await expect(page.getByRole('button', { name: '¿Te olvidaste la contraseña?', exact: true })).toHaveCount(0);
       await expect(page.getByRole('link', { name: '¿Te olvidaste la contraseña?', exact: true })).toHaveCount(0);
       await expect(page.getByText(NO_MAIL_HINT)).toBeVisible();
     });
   });

   test.describe('with mail', () => {
     test.beforeEach(({ api }) => {
       api.features = WITH_MAIL;
     });

     test('sends the email without X-Taller-User and shows the same text for an email with an account and one without', async ({
       access,
       api,
       page,
     }) => {
       api.on('POST /api/auth/forgot-password', () => ACCEPTED);
       await page.goto(urls.view('recorrido'));
       await access.requestResetLink(STUDENT.email);
       await expect(access.layer().getByRole('status')).toHaveText(SENT);
       await access.button('Volver al ingreso').click();
       await access.requestResetLink('nadie@x.com');
       await expect(access.layer().getByRole('status')).toHaveText(SENT);
       const calls = api.callsTo('POST /api/auth/forgot-password');
       expect(calls.map((call) => call.body)).toEqual([{ email: STUDENT.email }, { email: 'nadie@x.com' }]);
       expect(calls.map((call) => call.user)).toEqual([undefined, undefined]);
       expect(calls[0]?.xsrf).toBe(api.xsrfValue());
     });

     test('shows the message of the server and the way without mail when the taller cannot send mail', async ({
       access,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(/status of 503/, 'the 503 mail_unavailable of the reset link');
       api.on('POST /api/auth/forgot-password', () => ({
         status: 503,
         headers: { 'Retry-After': '3600' },
         json: { message: 'El taller no puede mandar correos por ahora.', code: 'mail_unavailable' },
       }));
       await page.goto(urls.view('recorrido'));
       await access.requestResetLink(STUDENT.email);
       const alert = access.alert();
       await expect(alert).toContainText('El taller no puede mandar correos por ahora.');
       await expect(alert).toContainText('Pedile el enlace a quien administra el taller.');
       await expect(access.button('Mandarme el enlace')).toBeEnabled();
     });

     test('waits for Retry-After after too many requests', async ({ access, api, pageIssues, page }) => {
       pageIssues.expectIssue(/status of 429/, 'the 429 of the reset link');
       await page.clock.install();
       api.on('POST /api/auth/forgot-password', () => ({
         status: 429,
         headers: { 'Retry-After': '60' },
         json: {
           message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
           code: 'too_many_requests',
         },
       }));
       await page.goto(urls.view('recorrido'));
       await access.requestResetLink(STUDENT.email);
       await expect(access.alert()).toContainText('Podés volver a intentar en 1 minuto.');
       const send = access.button('Mandarme el enlace');
       await expect(send).toBeDisabled();
       await page.clock.fastForward(60_000);
       await expect(send).toBeEnabled();
     });

     test.describe('at 320 px', () => {
       test.use({ viewport: { width: 320, height: 760 } });

       test('asks for the link with the keyboard alone, without sideways scrolling', async ({ access, api, page }) => {
         api.on('POST /api/auth/forgot-password', () => ACCEPTED);
         await page.goto(urls.view('recorrido'));
         await expect(access.field('Email')).toBeFocused();
         await page.keyboard.type(STUDENT.email);
         await tabTo(page, access.button('¿Te olvidaste la contraseña?'));
         await page.keyboard.press('Enter');
         await expect(access.heading('Recuperá tu contraseña')).toBeVisible();
         await expect(access.field('Email')).toBeFocused();
         await expect(access.field('Email')).toHaveValue(STUDENT.email);
         await page.keyboard.press('Enter');
         await expect(access.layer().getByRole('status')).toBeFocused();
         expect(await access.layer().evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
       });
     });
   });
   ```

4. **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e -- specs/forgot-password.spec.ts`. Antes de T057, el primer escenario pasa (es el comportamiento de F11a) y los demás fallan por la razón esperada: no hay botón «¿Te olvidaste la contraseña?». Después, todo en verde.
5. **Commit:** `test(qa): E2E del pedido del enlace por correo, en rojo`.

### Tarea 8.2 · Las specs del pedido del enlace, en rojo (T056, A)

**Archivos:** en `frontend/src/features/sign-in/`, `api/access-endpoints.ts` (el stub de `requestResetLink`), `api/access-endpoints.spec.ts` (suma un `describe`), `ui/ForgotPasswordForm.tsx` (stub) y `ui/forgot-password.spec.tsx` (nueva).

**Consume:** el cliente, `shared/ui/form` y la ayuda de las specs del acceso. **Produce:** las firmas del contrato.

1. **Los stubs:**

   ```ts
   // api/access-endpoints.ts, al final
   export const requestResetLink: (
     client: ApiClient,
     email: string,
   ) => Promise<EndpointResult<null>> = () => Promise.reject(new Error('not implemented'));
   ```

   ```tsx
   // ui/ForgotPasswordForm.tsx
   import type { FunctionComponent } from 'react';

   interface ForgotPasswordFormProps {
     readonly headingLevel: 1 | 2;
     readonly initialEmail: string;
     onBack(email: string): void;
   }

   const ForgotPasswordForm: FunctionComponent<ForgotPasswordFormProps> = () => {
     throw new Error('not implemented');
   };

   export default ForgotPasswordForm;
   ```

2. **`api/access-endpoints.spec.ts`** suma `requestResetLink` al import y, al final:

   ```ts
   describe('requestResetLink', () => {
     it('sends the email with the CSRF token and without X-Taller-User, and accepts the 202', async () => {
       const { client, calls } = clientWith([
         {
           status: 202,
           json: {
             message:
               'Si hay una cuenta con ese email, te mandamos un enlace para elegir otra contraseña. Revisá tu correo en unos minutos.',
           },
         },
       ]);
       expect(await requestResetLink(client, 'ana@x.com')).toEqual({ ok: true, value: null });
       expect(calls[0]).toMatchObject({
         method: 'POST',
         path: '/api/auth/forgot-password',
         body: { email: 'ana@x.com' },
       });
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
       expect(calls[0]?.headers['x-xsrf-token']).toBe('abc');
     });

     it('gives back the failure when the taller cannot send mail', async () => {
       const { client } = clientWith([
         {
           status: 503,
           headers: { 'Retry-After': '3600' },
           json: { message: 'El taller no puede mandar correos por ahora.', code: 'mail_unavailable' },
         },
       ]);
       expect(await requestResetLink(client, 'ana@x.com')).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 503, code: 'mail_unavailable', retryAfterSeconds: 3600 },
       });
     });
   });
   ```

3. **`ui/forgot-password.spec.tsx`:**

   ```tsx
   import { screen, waitFor } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import type { FetchLike } from '../../../shared/api/http';
   import { createFakeFetch } from '../../../shared/api/http/fake-fetch';
   import { renderAccess, resetSession, stubDialogs, withReplies, type AccessUser } from './render-access';

   const ANA: PublishedUser = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };
   const SENT =
     'Si el email corresponde a una cuenta, te llega un enlace para elegir una contraseña nueva. Vence en 60 minutos.';
   const ACCEPTED = {
     status: 202,
     json: {
       message:
         'Si hay una cuenta con ese email, te mandamos un enlace para elegir otra contraseña. Revisá tu correo en unos minutos.',
     },
   };
   const NO_MAIL_HINT =
     '¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.';

   beforeAll(stubDialogs);

   function withMail(passwordReset: boolean, account: PublishedUser | null = null): void {
     resetSession(account);
     sessionStore.setState({ features: { passwordReset, registration: false } });
   }

   async function typeInto(user: AccessUser, label: string, value: string): Promise<void> {
     await user.click(screen.getByLabelText(label));
     await user.paste(value);
   }

   async function openForgot(user: AccessUser, email = ''): Promise<void> {
     if (email !== '') await typeInto(user, 'Email', email);
     await user.click(screen.getByRole('button', { name: '¿Te olvidaste la contraseña?' }));
     await screen.findByRole('heading', { name: 'Recuperá tu contraseña' });
   }

   async function requestLink(user: AccessUser): Promise<void> {
     await user.click(screen.getByRole('button', { name: 'Mandarme el enlace' }));
   }

   describe('asking for the reset link by mail', () => {
     beforeEach(() => {
       withMail(true);
     });

     it('offers no «¿Te olvidaste la contraseña?» button nor link while the taller has no mail', () => {
       withMail(false);
       withReplies([]);
       expect(screen.queryByRole('button', { name: '¿Te olvidaste la contraseña?' })).toBeNull();
       expect(screen.queryByRole('link', { name: '¿Te olvidaste la contraseña?' })).toBeNull();
       expect(screen.getByText(NO_MAIL_HINT)).toBeInTheDocument();
     });

     it('opens its screen with the email already typed and the focus on it', async () => {
       const { user } = withReplies([]);
       await openForgot(user, 'ana@x.com');
       const email = screen.getByLabelText('Email');
       expect(email).toHaveValue('ana@x.com');
       await waitFor(() => expect(email).toHaveFocus());
       expect(screen.queryByText(NO_MAIL_HINT)).toBeNull();
     });

     it('sends the email without X-Taller-User and shows the same text for an email with an account and one without', async () => {
       const { user, calls } = withReplies([ACCEPTED, ACCEPTED]);
       await openForgot(user, 'ana@x.com');
       await requestLink(user);
       const first = await screen.findByRole('status');
       expect(first).toHaveTextContent(SENT);
       expect(first).toHaveFocus();
       await user.click(screen.getByRole('button', { name: 'Volver al ingreso' }));
       expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
       await user.clear(screen.getByLabelText('Email'));
       await openForgot(user, 'nadie@x.com');
       await requestLink(user);
       expect(await screen.findByRole('status')).toHaveTextContent(SENT);
       expect(calls.map((call) => call.body)).toEqual([{ email: 'ana@x.com' }, { email: 'nadie@x.com' }]);
       expect(calls.map((call) => call.headers['x-taller-user'])).toEqual([undefined, undefined]);
     });

     it('does not send X-Taller-User even when the access opens over a session', async () => {
       withMail(true, ANA);
       const { user, calls } = withReplies([ACCEPTED], {});
       await openForgot(user, 'ana@x.com');
       await requestLink(user);
       await screen.findByRole('status');
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
     });

     it('shows the message of the server and the way without mail when the taller cannot send mail', async () => {
       const { user } = withReplies([
         {
           status: 503,
           headers: { 'Retry-After': '3600' },
           json: { message: 'El taller no puede mandar correos por ahora.', code: 'mail_unavailable' },
         },
       ]);
       await openForgot(user, 'ana@x.com');
       await requestLink(user);
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent('El taller no puede mandar correos por ahora.');
       expect(alert).toHaveTextContent('Pedile el enlace a quien administra el taller.');
       expect(screen.getByRole('button', { name: 'Mandarme el enlace' })).toBeEnabled();
     });

     it('says how long to wait after too many requests and keeps the button waiting', async () => {
       const { user } = withReplies([
         {
           status: 429,
           headers: { 'Retry-After': '120' },
           json: {
             message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
             code: 'too_many_requests',
           },
         },
       ]);
       await openForgot(user, 'ana@x.com');
       await requestLink(user);
       expect(await screen.findByRole('alert')).toHaveTextContent('Podés volver a intentar en 2 minutos.');
       expect(screen.getByRole('button', { name: 'Mandarme el enlace' })).toBeDisabled();
     });

     it('marks the email that the server refuses', async () => {
       const { user } = withReplies([
         {
           status: 422,
           json: {
             message: 'Hay datos que corregir.',
             code: 'validation_failed',
             errors: { email: ['El campo email debe ser un email válido.'] },
           },
         },
       ]);
       await openForgot(user, 'ana@');
       await requestLink(user);
       const email = screen.getByLabelText('Email');
       await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
       expect(email).toHaveAccessibleDescription('El campo email debe ser un email válido.');
       expect(email).toHaveFocus();
     });

     it('keeps the button busy while the server answers and sends once', async () => {
       let answer: () => void = () => {};
       const answered = new Promise<void>((resolve) => {
         answer = resolve;
       });
       const fake = createFakeFetch([ACCEPTED]);
       const fetch: FetchLike = async (path, init) => {
         await answered;
         return fake.fetch(path, init);
       };
       const { user } = renderAccess(fetch);
       await openForgot(user, 'ana@x.com');
       await user.dblClick(screen.getByRole('button', { name: 'Mandarme el enlace' }));
       expect(await screen.findByRole('button', { name: 'Mandando…' })).toBeDisabled();
       answer();
       await screen.findByRole('status');
       expect(fake.calls).toHaveLength(1);
     });

     it('asks for the email before sending, and goes back to the sign-in with what was typed', async () => {
       const { user, calls } = withReplies([]);
       await openForgot(user);
       await requestLink(user);
       await waitFor(() =>
         expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Completá este campo.'),
       );
       expect(calls).toHaveLength(0);
       await typeInto(user, 'Email', 'ana@x.com');
       await user.click(screen.getByRole('button', { name: 'Volver al ingreso' }));
       expect(await screen.findByRole('heading', { name: 'Ingresá al taller' })).toBeInTheDocument();
       expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
     });
   });
   ```

4. **Correr** `npm run typecheck` y `npm run test:unit -- frontend/src/features/sign-in`: en rojo las nuevas (por `not implemented` o porque falta el botón), salvo la primera de la pantalla, que fija el comportamiento sin correo de F11a y ya pasa. Las de F11a, en verde.
5. **Commit:** `test(front): specs del pedido del enlace por correo, en rojo`.

### Tarea 8.3 · El pedido del enlace (T057, A)

**Archivos:** en `frontend/src/features/sign-in/`, `api/access-endpoints.ts`, `ui/access-texts.ts`, `ui/ForgotPasswordForm.tsx`, `ui/LoginForm.tsx` y `ui/AccessScreen.tsx`.

1. **`api/access-endpoints.ts`.** El stub se reemplaza por:

   ```ts
   export async function requestResetLink(
     client: ApiClient,
     email: string,
   ): Promise<EndpointResult<null>> {
     const result = await client.send('POST', '/api/auth/forgot-password', { email });
     return result.ok ? { ok: true, value: null } : result;
   }
   ```

2. **`ui/access-texts.ts`** suma (R36 y R37):

   ```ts
   export const RESET_LINK_SENT =
     'Si el email corresponde a una cuenta, te llega un enlace para elegir una contraseña nueva. Vence en 60 minutos.';
   export const ASK_ADMIN_FOR_LINK = 'Pedile el enlace a quien administra el taller.';
   ```

3. **`ui/ForgotPasswordForm.tsx`.** Sólo el 503 suma el camino sin correo, y sólo el 429 bloquea el botón (R37):

   ```tsx
   import { useEffect, useRef, useState } from 'react';
   import { useForm } from 'react-hook-form';
   import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   import {
     ServerError,
     TextField,
     describeFailure,
     messagesOf,
     showFailure,
     useGuardedSubmit,
     useRetryCountdown,
     type FailureDescription,
   } from '../../../shared/ui/form';
   import { requestResetLink } from '../api/access-endpoints';
   import AccessHeading from './AccessHeading';
   import { ASK_ADMIN_FOR_LINK, REQUIRED, RESET_LINK_SENT } from './access-texts';

   interface ForgotValues {
     email: string;
   }

   interface ForgotPasswordFormProps {
     readonly headingLevel: 1 | 2;
     readonly initialEmail: string;
     onBack(email: string): void;
   }

   const VISIBLE_FIELDS = ['email'] as const;
   const MAIL_UNAVAILABLE = 'mail_unavailable';

   function describeLinkFailure(failure: ApiFailure): FailureDescription {
     const description = describeFailure(failure, VISIBLE_FIELDS);
     if (failure.kind !== 'response' || failure.code !== MAIL_UNAVAILABLE) return description;
     return { ...description, generalMessages: [...description.generalMessages, ASK_ADMIN_FOR_LINK] };
   }

   const ForgotPasswordForm = ({ headingLevel, initialEmail, onBack }: ForgotPasswordFormProps) => {
     const client = useApiClient();
     const countdown = useRetryCountdown();
     const notice = useRef<HTMLParagraphElement>(null);
     const [sentTo, setSentTo] = useState<string | null>(null);
     const {
       register,
       handleSubmit,
       setError,
       setFocus,
       getValues,
       formState: { errors, isSubmitting },
     } = useForm<ForgotValues>({ criteriaMode: 'all', defaultValues: { email: initialEmail } });

     useEffect(() => {
       if (sentTo === null) setFocus('email');
       else notice.current?.focus();
     }, [sentTo, setFocus]);

     const submit = useGuardedSubmit(async ({ email }: ForgotValues) => {
       const result = await requestResetLink(client, email);
       if (result.ok) {
         setSentTo(email);
         return;
       }
       const description = describeLinkFailure(result.failure);
       showFailure(setError, description, VISIBLE_FIELDS);
       if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
     });

     if (sentTo !== null) {
       return (
         <div className="form-stack">
           <AccessHeading level={headingLevel}>Recuperá tu contraseña</AccessHeading>
           <p ref={notice} className="access-notice" role="status" tabIndex={-1}>
             {RESET_LINK_SENT}
           </p>
           <div className="form-actions">
             <button className="button secondary" type="button" onClick={() => onBack(sentTo)}>
               Volver al ingreso
             </button>
           </div>
         </div>
       );
     }

     return (
       <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
         <AccessHeading level={headingLevel}>Recuperá tu contraseña</AccessHeading>
         <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={errors.email === undefined} />
         <TextField
           label="Email"
           type="email"
           autoComplete="email"
           registration={register('email', { required: REQUIRED })}
           messages={messagesOf(errors.email)}
         />
         <div className="form-actions">
           <button className="button" type="submit" disabled={isSubmitting || countdown.waiting}>
             {isSubmitting ? 'Mandando…' : 'Mandarme el enlace'}
           </button>
           <button className="text-button" type="button" onClick={() => onBack(getValues('email'))}>
             Volver al ingreso
           </button>
         </div>
       </form>
     );
   };

   export default ForgotPasswordForm;
   ```

   `REQUIRED` sale de `./access-texts`, que lo define (F11a) o lo reexporta de `shared/ui/form` (si F11b ya entró). F11c no depende de F11b.
4. **`ui/LoginForm.tsx`,** tres cambios sobre la versión de la base:
   - `LoginFormProps` suma `onForgotPassword(email: string): void;`, y el componente lo recibe en su lista de props;
   - la desestructuración de `useForm` suma `getValues`;
   - el bloque de la nota sin correo pasa a:

     ```tsx
     {passwordResetByMail ? (
       <button
         type="button"
         className="text-button"
         onClick={() => onForgotPassword(getValues('email'))}
       >
         ¿Te olvidaste la contraseña?
       </button>
     ) : (
       <p className="form-hint">
         ¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.
       </p>
     )}
     ```

5. **`ui/AccessScreen.tsx`.** Sobre la versión final de T032 de F11a, suma el estado `forgot`. Queda así:

   ```tsx
   import { useState } from 'react';
   import { useStore } from 'zustand';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import type { AccessRequest } from '../model/access-request';
   import { EXPIRED_NOTICE, PASSWORD_CHANGED } from './access-texts';
   import ForgotPasswordForm from './ForgotPasswordForm';
   import InvitationScreen from './InvitationScreen';
   import LoginForm from './LoginForm';
   import PrivacyReacceptance from './PrivacyReacceptance';
   import ResetPasswordScreen from './ResetPasswordScreen';

   interface AccessScreenProps {
     readonly request: AccessRequest;
     onFinish(user: PublishedUser): void;
     reloadDocument(): void;
   }

   type Screen =
     | { readonly kind: 'login'; readonly email: string; readonly notice: string | null }
     | { readonly kind: 'forgot'; readonly email: string }
     | { readonly kind: 'invitation'; readonly token: string }
     | { readonly kind: 'reset'; readonly token: string; readonly email: string | null }
     | { readonly kind: 'privacy'; readonly account: PublishedUser };

   function loginScreen(notice: string | null, email = ''): Screen {
     return { kind: 'login', email, notice };
   }

   function initialScreen(request: AccessRequest, account: PublishedUser | null): Screen {
     const { token } = request;
     if (token?.kind === 'invitation') return { kind: 'invitation', token: token.token };
     if (token?.kind === 'reset') return { kind: 'reset', token: token.token, email: token.email };
     if (account !== null && !account.privacyAccepted) return { kind: 'privacy', account };
     return loginScreen(request.reason === 'expired' ? EXPIRED_NOTICE : null);
   }

   const AccessScreen = ({ request, onFinish, reloadDocument }: AccessScreenProps) => {
     const account = useStore(sessionStore, (state) => state.user);
     const passwordResetByMail = useStore(sessionStore, (state) => state.features.passwordReset);
     const [screen, setScreen] = useState(() => initialScreen(request, account));
     const level = request.presentation === 'page' ? 1 : 2;
     const signedIn = (user: PublishedUser): void => {
       if (user.privacyAccepted) onFinish(user);
       else setScreen({ kind: 'privacy', account: user });
     };
     switch (screen.kind) {
       case 'invitation':
         return (
           <InvitationScreen
             token={screen.token}
             headingLevel={level}
             onCreated={onFinish}
             onGoToSignIn={() => setScreen(loginScreen(null))}
           />
         );
       case 'reset':
         return (
           <ResetPasswordScreen
             token={screen.token}
             email={screen.email}
             headingLevel={level}
             onDone={(email) => setScreen(loginScreen(PASSWORD_CHANGED, email))}
           />
         );
       case 'privacy':
         return (
           <PrivacyReacceptance
             account={screen.account}
             headingLevel={level}
             onAccepted={onFinish}
             onSessionLost={() => setScreen(loginScreen(EXPIRED_NOTICE))}
             reloadDocument={reloadDocument}
           />
         );
       case 'forgot':
         return (
           <ForgotPasswordForm
             headingLevel={level}
             initialEmail={screen.email}
             onBack={(email) => setScreen(loginScreen(null, email))}
           />
         );
       case 'login':
         return (
           <LoginForm
             headingLevel={level}
             initialEmail={screen.email}
             notice={screen.notice}
             passwordResetByMail={passwordResetByMail}
             onSignedIn={signedIn}
             onForgotPassword={(email) => setScreen({ kind: 'forgot', email })}
           />
         );
     }
   };

   export default AccessScreen;
   ```

   Si T054 anotó diferencias con T032 (otros estados u otras props), se conservan, y el cambio sigue siendo el estado `forgot`, su `case` y la prop de `LoginForm`.
6. **Correr** `npm run test:unit -- frontend/src/features/sign-in` (todo en verde, también las specs de F11a sin editar), `npm run typecheck` y `npm run lint`. `AccessScreen` sube un `case`; si su complejidad pasa de 10, se informa en la revisión.
7. **Commit:** `feat(front): pedir el enlace para elegir una contraseña nueva por correo`.

### Tarea 8.4 · La documentación (T058, K)

- **`docs/architecture.md`:** la fila «Sesión, aviso de privacidad y acceso» suma el pedido del enlace por correo.
- **`qa/AGENTS.md`:** la fila «Acceso, sesión y Tu cuenta» suma `forgot-password.spec.tsx` y `forgot-password.spec.ts`. «Pruebas del front» dice que `api.features` prende el correo antes de `page.goto`, y que «no aparece» se comprueba por rol.
- **`contracts/front-interfaces.md`:** la sección de `features/sign-in` suma `requestResetLink`, la prop `onForgotPassword` y el estado `forgot`, y remite a [forgot-password-f11c.md](./contracts/forgot-password-f11c.md).

**Comprobar** las rutas, los comandos y los enlaces, y `git diff --check`. Commit: `docs: el pedido del enlace por correo de F11c`.

### Tarea 8.5 · El peso, la compuerta y el PR (T059, K)

1. **El peso:** `html.length` contra T054. **La condición de corte:** más de +5 000 caracteres, o llegar a 1 500 000, y F11c no cierra; decide el usuario (R42).
2. **La compuerta de 0.2,** con la red completa tres veces seguidas y `docker compose build taller`, con permiso.
3. **La verificación a mano** (quickstart-f11c.md §3), con permiso para Docker y, si el usuario lo da, para Mailpit.
4. **El PR** `feat(front): ask for the reset link by mail (F11c)`, a `master`, con la descripción en inglés: el problema, lo que cambia, el peso, la verificación a mano y lo que queda (el registro y `#verificar=`, fuera de F11).

**Reversión de U8:** se revierten T059, T058, T057, T056 y T055, en ese orden. El refactor del doble (T055, paso 1) puede quedar, porque no cambia ninguna respuesta.

## Lo que otros ítems toman de F11c

- **F12b:** `api.features` para prender el correo en sus E2E.
- **A3:** conserva `features: this.features` si cambia la ruta de la sesión del doble.
- **C3c:** nada; su contrato se consume tal cual.

## Cobertura de requisitos

| Requisito | Dónde | Prueba |
| --- | --- | --- |
| FR-060 | T057 | «opens its screen with the email already typed…», «sends the email…» (Vitest y E2E) |
| FR-061 | T057 | El mismo texto para dos emails; el 503 con el camino sin correo; el 429 con su espera (Vitest y E2E) |
| FR-034 (el lado del correo) | T057 | «offers no «¿Te olvidaste la contraseña?» button nor link…» (Vitest y E2E), por rol |
| FR-017 | T057 | Sin `X-Taller-User`, también sobre una sesión |
| FR-021 y FR-022 | T057 | El 429; la red y lo que no es JSON, por `describeFailure` de F11a |
| FR-024, FR-025, FR-027, FR-028, FR-030 y FR-031 | T057 | `noValidate` y `handleSubmit`; el 422 en el campo, con el foco; sólo lo obligatorio; el doble clic; `autoComplete="email"` |
| FR-066 a FR-068 | T055 | El teclado a 320 px; el movimiento reducido, por la regla global de F11a |
| FR-069 | T059 | El `grep` de la compuerta |
| FR-070 y FR-071 | T057 | No hay contraseñas ni tokens; el mismo texto para cualquier email |
| FR-072 y FR-073 | T059 | Ninguna dependencia; la medida contra T054 |
| FR-074 a FR-077 | Todas | Rojo y verde; Page Objects; la red sin editar; la documentación |
| SC-004 (fila «Pedir el enlace») | T055 y T056 | La tabla de abajo |
| SC-007 | T055 | «asks for the link with the keyboard alone, without sideways scrolling» |
| SC-008 y SC-011 | T059 | El peso y la compuerta |
| SC-010 (la parte de F11c) | T055 y T056 | Sin el botón con `false`, por rol; el mismo texto con `true` |

**SC-005** no suma nada en F11c: la pantalla no maneja contraseñas ni tokens, y el email no es un secreto.

## Los estados de SC-004 (la fila «Pedir el enlace»)

| Estado | Prueba |
| --- | --- |
| Cargando («Mandando…») | «keeps the button busy while the server answers and sends once» |
| Error de campo (`errors.email`) | «marks the email that the server refuses»; «asks for the email before sending…» |
| Error del servidor (503 y 5xx) | «shows the message of the server and the way without mail…» (Vitest y E2E); el 5xx, por `describeFailure` de F11a |
| Sesión (419) | El cliente renueva el CSRF y repite una vez un pedido anónimo (specs del cliente de F11a, «renews the session and repeats an anonymous request once») |
| Límite (429) | «says how long to wait…» y «waits for Retry-After…» |

## Descargas y permisos

- **Ninguna descarga de npm.**
- **Docker,** con permiso, en T059.
- **Mailpit** (16,1 MiB, C3c-3), sólo para abrir el enlace real en la verificación a mano. Sin el permiso, esa parte queda declarada como no verificada en el PR.

## Riesgos y lo que quedó sin verificar

1. **C3c puede cambiar al implementarse.** *Mitigación:* T054 comprueba la ruta, el 503 y las features en el código real; el contrato de C3c ya confirmó los supuestos.
2. **El `AccessScreen` final de F11a puede diferir del plan.** *Mitigación:* T054 lo compara, y el cambio de F11c es un estado y un `case`.
3. **La decisión del texto del 202** (R36). *Mitigación:* cambiarla cuesta una línea y su valor esperado.
4. **El enlace real del correo.** *Mitigación:* el quickstart lo prueba con Mailpit, si hay permiso.

## Complexity Tracking

Ninguna decisión agrega complejidad: F11c usa las piezas de F11a y suma un estado a la pantalla del acceso.
