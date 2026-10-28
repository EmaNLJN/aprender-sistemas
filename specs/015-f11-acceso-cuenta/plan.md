# Implementation Plan: F11a · El acceso

**Branch**: `015-f11-acceso-cuenta` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F11, en su parte a: FR-001 a FR-052, los transversales FR-066 a FR-077, SC-001 a SC-008, SC-011 y SC-012, y las historias 1 a 5. Decisiones y mediciones: [research.md](./research.md). Interfaces públicas: [contracts/front-interfaces.md](./contracts/front-interfaces.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md). F11b, F11c y F11d tendrán `plan-f11b.md` y los siguientes.

**Objetivo:** que nadie entre al taller sin cuenta, y que crear la cuenta, ingresar, restablecer la contraseña, aceptar el aviso y salir funcionen desde el navegador, sin que el resto del taller cambie.

**Arquitectura:**

- **Dos etapas nuevas** abren el arranque de A2: `runBoot([tokenStage, sessionStage, contentGate, legacyViews])`.
  - La primera borra de la URL los fragmentos con token.
  - La segunda pide `GET /api/session` y, si hace falta, espera «pedir el ingreso».
- **Una raíz de React propia,** fuera de `#main` y de `.app-shell`, dibuja el acceso y «Tu cuenta». El acceso se muestra como página en el arranque y como diálogo con el shell andando.
- **Un cliente de la API sin estado** atiende a las dos, con `fetch` inyectado. El estado de la sesión vive en un store de Zustand.

**Stack:** TypeScript y React 19.2.8 con Vite 8.3.2, Zustand 5.0.15 (ya instalados) y React Hook Form 7.89.0 (nueva). Las pruebas: Vitest 5.0.3 con jsdom 30.1.2, Testing Library y fishery 2.4.0 (nuevas, si F3 no las trajo antes), y Playwright 1.63.0.

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», el contrato y la sección de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T035) y remite acá.
> - **Cómo se integra.** Las unidades U0 a U4 son PR contra la rama de integración `f11a/base`. F11a llega a `master` en un solo PR, al final (research.md, R1; «Integración»).
> - **El código verificado.** Ninguno: se planificó leyendo `f2b-acum` (`2b37caf4`), sin correr nada ni descargar nada. Lo que el plan no pudo medir está en research.md, «Lo que no se verificó», y cada tarea lo comprueba en su compuerta.

## Summary

F11a trae la sesión obligatoria (Q1) y las pantallas que la hacen posible. El enfoque:

- **Cinco unidades apiladas, con un solo merge a `master`** (research.md, R1). La sesión obligatoria no se puede integrar a medias: `master` nunca exige la sesión si faltan el ingreso, el alta con su aviso y la reaceptación.
  - **U0, la base:** la línea base, React Hook Form y la pila de DOM.
  - **U1, la infraestructura:** el cliente, la sesión, «pedir el ingreso», las etapas, la raíz de la cuenta, el doble de la API y el proxy.
  - **U2:** el ingreso, «Tu cuenta» y «Salir».
  - **U3:** el alta y el aviso de privacidad.
  - **U4:** el restablecimiento, la higiene transversal, la documentación y el peso.
- **El cliente no tiene estado** (R3). Devuelve un resultado discriminado, lee y decodifica la cookie `XSRF-TOKEN` en cada pedido, pone `X-Taller-User` cuando quien llama lo pide y resuelve el 419. El 401 lo resuelve quien llama, con «pedir el ingreso».
- **«Pedir el ingreso» es una promesa compartida** (R4). La etapa de sesión la espera sin topes; A3, F8, F11b y F12 la usan después. Se presenta como página en el arranque, con el shell `inert`, y como diálogo con el shell andando.
- **Las etapas copian la forma de la compuerta de A2** (R5 y R6): las mismas esperas, la guarda `settled` y una vista con `innerHTML`, en su propio elemento `#session-status`.
- **La red de 123 E2E pasa sin editar un escenario,** gracias al doble de la API, que es un fixture automático con un estudiante por omisión (R10). `boot-check` y `dist-content-check` cambian sólo su servidor de contenido (R11).
- **React Hook Form arma los formularios** (R8): campos no controlados, varios motivos por campo y el error general con el foco. `describeFailure` es la única traducción de una falla de la API.
- **La vista previa y `npm run dev` pasan `/api/` al stack, y `vite preview` no** (R12).

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0; las versiones de arriba.

**Primary Dependencies**:

- **Nuevas:** `react-hook-form` 7.89.0 (de ejecución). Además, como dependencias de desarrollo, `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7, `@testing-library/jest-dom` 7.0.1 y `fishery` 2.4.0, salvo que F3, F4 o F9 las hayan instalado antes. Cada una entra con su permiso (T002 y T003).
- **Ya instaladas:** React 19.2.8, `react-dom`, Zustand 5.0.15, Vite, Vitest y Playwright.

**Storage**: ninguno. F11a no lee ni escribe `localStorage`, `sessionStorage`, IndexedDB ni cookies propias (FR-070). La sesión vive en memoria, en el store de Zustand; el token, en el pedido de acceso en curso.

**Testing**: Vitest con dos proyectos: `node` para `*.spec.ts` y `dom` (jsdom) para `*.spec.tsx`. Además, los checks de `qa/` y Playwright con Page Objects contra `vite preview` y el doble de la API. Los valores esperados salen del contrato de C3a, de `lang/es/` y de la spec, nunca del código que se prueba.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript con vistas legacy), con pantallas nuevas.

**Performance Goals**: ninguna de velocidad. El peso de `dist/index.html` tiene presupuesto (R15).

**Scale/Scope**: unos 45 archivos de producción nuevos en `frontend/src/`, unas 20 specs nuevas, 7 E2E nuevos con 2 Page Objects y el doble de la API. Cambian `index.html`, `main.tsx`, `styles.css`, `vite.config.ts`, `vitest.config.ts`, tres archivos de `qa/` y dos de `docker/`.

## Restricciones globales

Valen para toda tarea. Los valores están copiados de la spec y de la constitución.

- **La red:**
  - **sin editar:** los 123 E2E de F1 y A2, en `qa/e2e/specs/*.spec.ts` (106 de F1 y 17 de `content-gate.spec.ts`), y los escenarios de `boot-check`, `dist-content-check` y `load-order-check`;
  - **lo único que cambia de esos archivos:** la tabla de etapas de `load-order-check` (`STAGE_CONSTRAINTS`), `qa/lib/content-server.ts` y `qa/e2e/fixtures/index.ts` (FR-076);
  - **lo que se suma:** a `boot-check`, un escenario; a `compose-runs-check`, dos.
- **El documento:**
  - **mientras F11 no muestra nada,** ninguna región `alert` ni `status`, ningún `h1` visible con el shell andando y ningún botón «Reintentar»;
  - **ningún elemento nuevo con la clase `.sr-only`,** porque R5 de `css-contract` la busca en modo estricto;
  - **la entrada «Tu cuenta» no lleva `.button`,** porque el contrato de movimiento reducido mide `.button` `.first()`.
- **El estilo:** ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` (FR-069, SC-011). Las reglas nuevas van en `form.css`, `access.css` y `account.css`, y las del shell, al final de `styles.css`.
- **La seguridad:**
  - ninguna contraseña ni token en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial, el store de la sesión, `window` ni la consola (FR-070);
  - los formularios se envían sólo por `handleSubmit`, con `noValidate` y sin `action` (FR-024);
  - el front no distingue entre dos 422 de credenciales ni entre los motivos de un restablecimiento que falla (FR-071).
- **Los textos:** los de la spec, «Textos que lee el alumno», tal cual. Los del servidor se muestran como llegan. Los que agrega el plan están en research.md, «Textos que agrega el plan».
- **Los topes:**
  - **la sesión:** 20 000 ms por pedido, y la espera visible a los 400 ms;
  - **el ingreso:** sin ningún tope (FR-006).
- **La contraseña:** de 15 a 64 caracteres, contados como puntos de código después de NFC, con los mensajes de `lang/es/password-policy.php`.
- **El aviso:** la versión del front es `2026-10-dev` hasta que el usuario dé la suya, y la misma va en `PRIVACY_VERSION` (Q2).
- **El peso:** `dist/index.html` bajo 1 250 000 caracteres (`qa/build-check.ts`), y F11a suma como mucho +60 000 sobre la línea base de T001, con el texto del aviso adentro (R15).
- **La complejidad:** ninguna función nueva de más de 10 sin justificarla en la revisión. Los avisos de `npm run lint` no suben respecto de T001.
- **La accesibilidad:**
  - todo se completa con el teclado (FR-066);
  - de 320 px en adelante no hay desplazamiento horizontal, los campos tienen 16 px o más y «Tu cuenta» ocupa la pantalla en el celular (FR-067);
  - con movimiento reducido no hay transiciones (FR-068).
- **El backend:** no cambia. Los contratos de C3a se consumen tal cual.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, Feature-Sliced Design, `interface` para las formas, un componente por archivo con `export default`, Zustand para el estado compartido y nada de nuqs ni MSW. `AGENTS.md` cambia sólo en sus comandos (T034) |
| II. TDD y pruebas útiles | Sí | Cada tarea de código abre con su spec en rojo contra firmas que lanzan `not implemented`. Los valores esperados salen del contrato de C3a, de `lang/es/` y de la spec. Las factories de fishery arman entradas, nunca el valor esperado |
| III. Código entendible | Sí | El cliente devuelve resultados, sin excepciones. Las pantallas se parten por responsabilidad: un formulario por archivo y un resumen aparte para el alta. `describeFailure` es la única traducción de una falla |
| IV. Contenido en Git, IDs estables | Sí | `content/`, el progreso y las URL de las vistas no cambian. Los fragmentos con token se borran antes de que `app.js` los mire |
| V. Capas y contratos explícitos | Sí | `shared/api/http`, `shared/ui/form`, `entities/session`, `entities/privacy-notice`, `features/sign-in` y `pages/account`, cada uno con su índice. `app/` los compone. Las dependencias nuevas entran con su primer caso real y con permiso |
| VI. Español, accesibilidad y portabilidad | Sí | Textos en rioplatense; teclado, foco visible, 320 px y movimiento reducido con E2E; los comandos son portables |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva. `PRIVACY_VERSION` va en `.env`, que sigue fuera de Git, con un valor por omisión en Compose |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. F11b, F11c y F11d tendrán sus propios planes |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **P1:** la partición en F11a a F11d | Este plan es F11a, y deja las interfaces que suman las otras partes | Todo el plan; contrato |
| **R1:** «pedir el ingreso» | `requestSignIn` en `features/sign-in`: una promesa compartida, sin topes, como página o como diálogo | T008, T009 y T021 |
| **C1:** la etapa de sesión es de F11a | `sessionStage` en `app/boot`, con `fetchSession` y la vista propia; A3 la extiende (contrato) | T010 a T012 |
| **Q1:** la sesión obligatoria | `GET /api/session` en cada arranque, el acceso sin sesión, el doble de la API y el proxy | U1 |
| **Q2:** el aviso en un archivo del front | `entities/privacy-notice/config/privacy-notice.ts`, y `PRIVACY_VERSION` llega a la API | T019 y T028 |
| **Q3:** «Tu cuenta» en la barra superior | `#account-entry` dentro de `.topbar-actions`, con un portal y un diálogo modal | T023 |
| **Q4:** «Salir» no toca el progreso | `signOut` no lee ni escribe el almacenamiento, y la nota va junto al botón | T023 |
| **A3-Q3:** la vista previa pasa `/api/` | `server.proxy` en Vite y la red externa en `compose.preview.yaml` | T015 |
| **El tiempo del ingreso** no cuenta para los topes del arranque | La etapa arma un tope por pedido y lo borra al terminar el pedido | T010 y T011 |

## Project Structure

### Documentation (this feature)

```text
specs/015-f11-acceso-cuenta/
├── spec.md                         # F11 entera, con su clarify
├── research.md                     # decisiones, consultas de documentación y mediciones de F11a
├── plan.md                         # este archivo (F11a)
├── quickstart.md                   # cómo se verifica la entrega de F11a
├── contracts/front-interfaces.md   # las interfaces públicas que deja F11a
└── tasks.md                        # T001 a T035
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
frontend/src/
├── index.html                                  # cambia (K): #session-status, .topbar-actions con #account-entry, #account-root
├── vitest.setup.ts                             # nuevo (K): cleanup y jest-dom para el proyecto dom
├── app/
│   ├── main.tsx                                # cambia (K): las dos etapas y las tres hojas
│   ├── account/                                # nuevo (K)
│   │   ├── api-client.ts                       # la instancia del cliente, con window.fetch y document.cookie
│   │   ├── AccountRoot.tsx                     # el proveedor del cliente, AccessGate y AccountMenu
│   │   ├── mount-account-root.tsx              # monta la raíz una vez, si existen los hosts
│   │   ├── reload-document.ts                  # window.location.reload()
│   │   └── shell-inertness.ts                  # .app-shell y .skip-link inert
│   └── boot/
│       ├── access-tokens.ts (+ .spec.ts)       # nuevo (B): readAccessToken y createTokenStage
│       ├── session-view.ts (+ .spec.ts)        # nuevo (B): la espera y el error de la sesión en #session-status
│       ├── session-gate.ts (+ .spec.ts)        # nuevo (B): createSessionGate
│       └── account-stages.ts                   # nuevo (K): tokenStage y sessionStage, armados
├── shared/
│   ├── api/http/                               # nuevo (C): el cliente
│   │   ├── api-client.ts (+ .spec.ts)
│   │   ├── api-failure.ts
│   │   ├── read-xsrf-token.ts (+ .spec.ts)
│   │   ├── api-client-context.ts
│   │   ├── fake-fetch.ts                       # ayuda de las specs: un fetch falso con respuestas reales
│   │   ├── api-error.factory.ts                # fishery: cuerpos {message, code}
│   │   └── index.ts
│   ├── lib/
│   │   ├── format-wait.ts (+ .spec.ts)                 # nuevo (B)
│   │   └── format-local-date-time.ts (+ .spec.ts)      # nuevo (A, U3)
│   └── ui/form/                                # nuevo (F)
│       ├── describe-failure.ts (+ .spec.ts)
│       ├── show-failure.ts
│       ├── use-guarded-submit.ts
│       ├── use-retry-countdown.ts
│       ├── TextField.tsx, PasswordField.tsx, ServerError.tsx
│       ├── form-components.spec.tsx, form-hooks.spec.tsx
│       ├── form.css
│       └── index.ts
├── entities/
│   ├── session/                                # nuevo (S)
│   │   ├── model/types.ts, parse-session.ts, session-store.ts, fetch-session.ts, password-length.ts
│   │   ├── model/*.spec.ts, model/session.factory.ts
│   │   └── index.ts
│   └── privacy-notice/                         # nuevo (P)
│       ├── config/privacy-notice.ts
│       ├── ui/PrivacyNoticeText.tsx, ui/PrivacyNoticeDialog.tsx, ui/privacy-notice.css
│       ├── ui/privacy-notice.spec.tsx
│       └── index.ts
├── features/sign-in/                           # nuevo (A)
│   ├── model/access-request.ts, reauthenticate.ts, sign-out.ts, invitation-problem.ts (+ specs)
│   ├── api/access-endpoints.ts (+ .spec.ts)
│   ├── ui/AccessGate.tsx, AccessPage.tsx, AccessDialog.tsx, AccessScreen.tsx, AccessHeading.tsx, access-texts.ts
│   ├── ui/LoginForm.tsx, InvitationScreen.tsx, InvitationProblem.tsx, InvitationSummary.tsx
│   ├── ui/SignupForm.tsx, AcceptPrivacyField.tsx, PrivacyReacceptance.tsx
│   ├── ui/ResetPasswordScreen.tsx, ResetPasswordForm.tsx
│   ├── ui/*.spec.tsx, ui/access.css
│   └── index.ts
└── pages/account/                              # nuevo (M)
    ├── ui/AccountMenu.tsx, AccountEntry.tsx, AccountDialog.tsx, SignOutSection.tsx
    ├── ui/account-menu.spec.tsx, ui/account.css
    └── index.ts
frontend/styles.css                             # cambia (K): .session-status, al final
frontend/vite.config.ts                         # cambia (K): server.proxy y preview.proxy {}
frontend/vitest.config.ts                       # cambia (K): proyectos node y dom
frontend/THIRD-PARTY-NOTICES.txt                # cambia (K): la licencia de React Hook Form
qa/
├── lib/content-server.ts                       # cambia (Q): responde la sesión, aparte
├── boot-check.ts                               # cambia (Q): suma un escenario
├── load-order-check.ts                         # cambia (K): dos restricciones de etapas
├── vite-proxy-check.ts                         # nuevo (K)
├── compose-runs-check.ts                       # cambia (K): suma dos escenarios
├── run-checks.ts                               # cambia (K): registra vite-proxy-check
└── e2e/
    ├── lib/api-contract.ts                     # nuevo (E): cuentas, invitación, enlace y mensajes del contrato
    ├── fixtures/api-double.ts                  # nuevo (E): el doble de la API
    ├── fixtures/index.ts                       # cambia (E): sessionAccount, api (automático), access y account
    ├── pages/access.ts, pages/account.ts       # nuevos (E)
    └── specs/session-stage, sign-in, account, invitation, privacy-notice, reset-password y access-hygiene (.spec.ts)   # nuevos (E)
docker/compose.preview.yaml                     # cambia (K): la red del stack, externa
docker/compose.yaml                             # cambia (K): PRIVACY_VERSION en x-laravel-env
package.json, package-lock.json                 # cambian (K): las dependencias de T002 y T003
AGENTS.md, README.md, docs/architecture.md, qa/AGENTS.md   # cambian (K, T034)
```

**Structure Decision:** cada módulo vive en la capa que fija research.md, R2. Se crean `shared/api/http`, `shared/ui/form`, `entities/session`, `entities/privacy-notice`, `features/sign-in` y `pages/account`, todos con un caso real en F11a y con consumidores anunciados (contrato). Ningún slice importa un archivo interno de otro: se importa su `index.ts`.

## Review Focus

Lo que el revisor mira primero:

- **El invariante de integración.** `master` no recibe ninguna unidad suelta: F11a entra entera (R1).
- **La red sin editar.** El diff de `qa/e2e/specs/` toca sólo archivos nuevos, y el de `qa/` toca sólo los archivos que nombran las «Restricciones globales».
- **El arranque.**
  - El orden es tokens, sesión, compuerta y vistas, en `runBoot` y en la tabla.
  - Ningún timer de la sesión actúa después de resolver.
  - El ingreso no corre bajo ningún tope.
  - Después del ingreso, la sesión se pide una vez más, y nada se recarga.
- **El cliente.**
  - La cookie se lee en cada pedido y se decodifica.
  - `X-Taller-User` va sólo en los pedidos que modifican y que lo piden.
  - El 419 se reintenta una vez como mucho, y el 401 no lo toca el cliente.
  - El 204 da `body: null`, y lo que no es JSON da `unexpected`.
- **Lo que queda en el documento.**
  - Ningún `alert`, `status`, `h1` ni «Reintentar» sobrante.
  - El shell sale de `inert` al terminar el acceso.
  - La entrada aparece sólo con la cuenta lista.
- **Los formularios.**
  - Todos los motivos de un campo se muestran.
  - El foco va al primer campo con error o al error general.
  - Un doble clic hace un solo pedido.
  - Mientras corre la espera de un 429, el botón no se habilita.
  - Ningún `style=`.
- **El peso,** con la librería separada del código propio (R15).

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **Una cookie `XSRF-TOKEN` con caracteres codificados** (`%3D`, como la que manda Laravel), y que cambia entre dos pedidos. La spec del cliente arma dos pedidos con dos cookies y exige los dos valores decodificados (T004).
2. **Dos 401 a la vez** (dos pantallas o dos pedidos simultáneos). La spec de `access-request` exige una sola petición, la misma promesa y las dos resueltas con la cuenta (T008).
3. **Los timers de la sesión después de resolver.** El arnés de `boot-check` corre todos los timers y no cancela ninguno. La spec de la etapa avanza 30 s después de una respuesta rápida y exige que ni la espera ni el error aparezcan (T010).
4. **Un enlace de restablecimiento con `%2B` en el email** (`ana+1@x.com`), **y un `#invitacion` sin `=`.** La spec de los tokens exige `ana+1@x.com`, un token vacío y que el fragmento se borre igual (T010).
5. **`vite preview` heredando el proxy de `npm run dev`.** La documentación de Vite dice que `preview.proxy` vale `server.proxy` por omisión, y sin cuidado los E2E pegarían contra un stack levantado. `qa/vite-proxy-check.ts` exige el proxy en `server` y `{}` en `preview` (T015).

## Reparto en paralelo

Los dueños tienen archivos disjuntos («Project Structure»). Cada uno trabaja en su worktree sobre `f11a/base` y entrega una rama.

- **Delegables al subagente `implementador`:** C, S, B, A, F, P, M, E y Q (`AGENTS.md`, «Trabajo con subagentes»). Se les dan sus archivos, el contrato, los valores exactos y los checks, y se les dice que no dejen comentarios.
- **K, el coordinador,** es el agente principal. Hace U0, el cableado de `app/`, `main.tsx`, `index.html`, las configuraciones, `docker/`, `qa/load-order-check.ts`, `qa/run-checks.ts` y la documentación, y además revisa cada diff y corre las compuertas.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 a T003 (U0) |
| 1 | C, S, A, B, Q, E y K a la vez | **C:** T004 y T005. **S:** T006 y T007. **A:** T008 y T009. **B:** T010 y T011. **Q:** T013. **E:** T014. **K:** T015 |
| 2 | K | T012 (cableado, desde S1) y T016 (compuerta de U1) |
| 3 | F, P, A, M y E | **F:** T017 y T018. **P:** T019. **A:** T020 y T021 (desde S2). **M:** T022 y T023 (desde S2). **E:** T024 |
| 4 | K | T025 (compuerta de U2) |
| 5 | A, E y K | **A:** T026 y T027. **E:** T029. **K:** T028 |
| 6 | K | T030 (compuerta de U3) |
| 7 | A, E y K | **A:** T031 y T032. **E:** T033. **K:** T034 |
| 8 | K | T035 (peso, compuerta final y PR a `master`) |

**Puntos de sincronización:**

- **S1:** C, S, A y B entregaron. K cablea T012 sobre sus ramas integradas.
- **S2:** F y P entregaron (T018 y T019). A y M usan `shared/ui/form` y `entities/privacy-notice`.
- **S3:** cada compuerta (T016, T025, T030 y T035) integra su unidad en `f11a/base`.

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173`, E `4191`, A `4192` y M `4193`.

**Integración** (R1):

- Las unidades son PR contra `f11a/base`, que sale de `master` con F2a, A2 y F2b integradas.
- Cada PR se revierte solo en `f11a/base`.
- El PR final de `f11a/base` a `master` lo abre K en T035, después de que el usuario:
  - dé el texto del aviso y su versión;
  - invite a cada alumno.

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **A2 y F2b tienen que estar en `master`** antes de T001: F2a #40 y F2b #41 a #44 seguían abiertos el 2026-10-28. Si no, `f11a/base` sale de `f2b-acum` y T001 lo anota.
- **F3, F4 o F9 pueden traer antes la pila de DOM.** T003 se reduce a verificar sus versiones, y la configuración de Vitest que dejen manda, si ya tiene los dos proyectos.
- **F8 y F12a esperan a F11a entera.** Se planifican sobre su contrato.
- **A3 extiende la etapa de sesión** sobre `f11a/base` o sobre `master` con F11a, según lo que llegue antes a su plan.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (historias 1 a 5, FR-001 a FR-052 y FR-066 a FR-077), research.md, el contrato y tu tarea;
  - las skills `tdd`, `clean-code`, `codebase-design`, `vitest` y, si escribís componentes, `react-testing` y las de Vercel;
  - si escribís E2E, `playwright-best-practices`.
- **TDD, siempre.**
  - Cada módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, para que su spec falle por comportamiento y no por un import.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca.
  - Los valores esperados salen del contrato de C3a, de `backend/api/lang/es/`, de la spec o de un ejemplo resuelto a mano, nunca del módulo que se prueba ni de una factory.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Imports:** un slice se importa por su `index.ts`. Dentro de tu slice, por ruta directa. Las ayudas de specs (`fake-fetch.ts` y las `*.factory.ts`) se importan por ruta directa, sólo desde specs.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>` y `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - `npm run build` y, después, `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo.**
  - Código, nombres de test y comentarios en inglés; la interfaz y los mensajes en español rioplatense, con el texto exacto de la spec.
  - **Sin comentarios.** Los únicos permitidos son los que este plan escribe en el código, que son referencias puntuales.
  - `interface` para las formas de objetos.
  - Un componente o un hook por archivo, declarado como `const` con nombre, con `export default` al final. Las funciones y las constantes van con exports nombrados.
  - Ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText`.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(front): …` o `test(qa): …` para la spec en rojo;
  - `feat(front): …` para lo que cambia a propósito;
  - `chore(deps): …` para las dependencias;
  - `docs: …` para la documentación.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. U0 · La base, React Hook Form y la pila de DOM (coordinador K, onda 0)

**Cubre:** FR-072, FR-073 (la medida inicial), FR-074 (la infraestructura) y FR-077 (la base de los checks).

### Tarea 0.1 · La línea base (T001)

- **Quién y cuándo:** K, sobre `f11a/base` recién creada (`master` con F2a, A2 y F2b) y antes de cualquier cambio.
- **Entrega:** un commit de documentación que suma a research.md la sección «Línea base de la implementación», con:
  - el hash de la base y la fecha;
  - `html.length` de `dist/index.html`;
  - la cantidad de checks de `npm test` y de pruebas de Vitest;
  - los avisos de `npm run lint`;
  - los E2E (123).
- **Pasos:**
  1. Correr, todo en verde: `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`. Si algo falla, F11a no empieza.
  2. Medir `node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"` y contar los avisos (`npm run lint 2>&1 | grep -c warning`).
  3. Registrar los valores, y comparar el tamaño con los 1 136 702 de F2b (T020) y los 1 141 337 del coordinador. El presupuesto de F11a (+60 000) se cuenta desde lo medido acá.
- **Compuerta:** los pasos 1 y 2, con los valores anotados.
- **Vuelta atrás:** revertí el commit; nada depende de él.

### Tarea 0.2 · El permiso y la instalación de React Hook Form (T002)

- **Quién:** K. Pide el permiso al usuario y no instala nada antes del sí.
- **El pedido de permiso**, textual: «Permiso para bajar `react-hook-form` 7.89.0 del registro de npm (`registry.npmjs.org`): licencia MIT, sin dependencias (sólo `react` como peer), 1 527 796 bytes desempaquetados. Va como dependencia de ejecución y su peso se mide en `dist/index.html` (FR-072 y FR-073).»
- **Pasos, con el sí:**
  1. `npm install --save-exact react-hook-form@7.89.0`.
  2. Comprobar que `package.json` diga `"react-hook-form": "7.89.0"` en `dependencies` y que `package-lock.json` lo tenga con su `integrity`.
  3. Sumar al final de `frontend/THIRD-PARTY-NOTICES.txt` un bloque con la misma forma que el de Zustand. La primera línea es `React Hook Form — https://github.com/react-hook-form/react-hook-form`, y debajo va el texto de `node_modules/react-hook-form/LICENSE`, copiado entero.
  4. Correr `npm run typecheck` y `npm run build`, y después `node qa/build-check.ts`, que exige que `dist/THIRD-PARTY-NOTICES.txt` tenga los mismos bytes que la fuente. `dist/index.html` no cambia: todavía nadie importa la librería.
- **Commit:** `chore(deps): React Hook Form 7.89.0 para los formularios de F11a`.

### Tarea 0.3 · La pila de DOM, fishery y los dos proyectos de Vitest (T003)

- **Quién:** K.
- **Si la pila ya está:** si `package.json` ya tiene `jsdom` y `@testing-library/react` porque F3, F4 o F9 los trajeron, la tarea sólo comprueba las versiones y que exista el proyecto `jsdom`, y saltea el pedido de permiso.
- **El pedido de permiso**, textual: «Permiso para bajar, como dependencias de desarrollo y del registro de npm:
  - `jsdom` 30.1.2;
  - `@testing-library/react` 16.3.3;
  - `@testing-library/dom` 10.4.2;
  - `@testing-library/user-event` 14.6.7;
  - `@testing-library/jest-dom` 7.0.1.

  Son 56 paquetes con sus dependencias, unos 26,3 MB desempaquetados (ADR 0008), y todos MIT. Además, `fishery` 2.4.0 (MIT): 2 paquetes, unos 0,19 MB. Ninguno llega a `dist/index.html`.»
- **Pasos, con el sí:**
  1. `npm install --save-dev --save-exact jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 @testing-library/jest-dom@7.0.1 fishery@2.4.0`.
  2. Antes de cambiar la configuración, correr `npm run test:unit` y anotar cuántas pruebas pasan: es el total del proyecto `node`.
  3. Crear `frontend/src/vitest.setup.ts`:

     ```ts
     import '@testing-library/jest-dom/vitest';
     import { cleanup } from '@testing-library/react';
     import { afterEach } from 'vitest';

     afterEach(() => {
       cleanup();
     });
     ```

  4. Reemplazar `frontend/vitest.config.ts` por esto. El comentario del `cacheDir` se conserva, porque se mueve con su código:

     ```ts
     import { resolve } from 'node:path';
     import { defineConfig, mergeConfig } from 'vitest/config';
     import viteConfig from './vite.config.ts';

     export default mergeConfig(
       viteConfig,
       defineConfig({
         // Vite's root is frontend/src: without this the cache would land in frontend/src/node_modules.
         cacheDir: resolve(import.meta.dirname, '../node_modules/.vite'),
         test: {
           projects: [
             { test: { name: 'node', environment: 'node', include: ['**/*.spec.ts'] } },
             {
               test: {
                 name: 'dom',
                 environment: 'jsdom',
                 include: ['**/*.spec.tsx'],
                 setupFiles: [resolve(import.meta.dirname, 'src/vitest.setup.ts')],
               },
             },
           ],
         },
       }),
     );
     ```

     La raíz no declara `include` ni `environment`. Un proyecto en línea hereda la raíz y los arreglos se concatenan (Vitest 5, «Projects»), así que el proyecto `dom` correría de nuevo todas las `*.spec.ts`.
  5. Correr `npm run test:unit`. El proyecto `node` tiene que dar el mismo total que en el paso 2. Después, `npx vitest run --config frontend/vitest.config.ts --project dom --passWithNoTests`, que termina en 0 sin pruebas.
  6. Correr `npm run typecheck`: la aumentación de tipos de jest-dom entra por el setup, que está dentro de `frontend/src` (ADR 0008, «Tipos»).
- **Commits:**
  - `chore(deps): la pila de DOM de Vitest y fishery para F11a`;
  - `test(front): proyectos node y dom de Vitest`.

### 0.4 · La compuerta de cada unidad

K la corre antes de integrar cada unidad en `f11a/base` (T016, T025, T030 y T035). Cada dueño corre en lo suyo los pasos 2 y 3, sin Docker. La unidad no se integra con una sola casilla en rojo.

1. **Antes de empezar,** sobre su base: `npm test` y la red E2E en verde.
2. **Los comandos:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`, con los 123 de la red más los nuevos.
3. **La red sin editar:** `git diff --name-only f11a/base -- qa/e2e/specs qa/boot-check.ts qa/dist-content-check.ts` lista sólo los E2E nuevos de F11a y `qa/boot-check.ts`. Además, `git diff f11a/base -- qa/boot-check.ts` muestra sólo líneas agregadas.
4. **Sin estilos en línea:** `git diff f11a/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'` no imprime nada.
5. **Complejidad:** `npm run lint` da 0 errores y, como mucho, los avisos de T001.
6. **Peso:** `html.length` de `dist/index.html`, anotado en la descripción del PR con la diferencia contra T001.
7. **La documentación** de la unidad, si la tiene (sección 5).
8. **El PR,** contra `f11a/base`, con título y descripción en inglés. La descripción cuenta el contexto, qué faltaba, qué cambia, cómo se verificó (con los comandos y las medidas de arriba) y qué queda pendiente.

## 1. U1 · El cliente, la sesión, las etapas, el doble y el proxy (onda 1: C, S, A, B, Q, E y K; onda 2: K)

**Cubre:** FR-001 a FR-011, FR-014 a FR-019, FR-036, FR-070 (en el arranque) y FR-076; SC-001 (la URL), SC-002, SC-003 y SC-012; historia 5, escenarios 1 a 3; historia 2, escenarios 1 y 6.

**Entrega:**

- el cliente de la API;
- la sesión y su store;
- «pedir el ingreso» con la raíz que lo dibuja. Todavía no tiene formulario: el ingreso llega en U2;
- las dos etapas, cableadas;
- el doble de la API de los E2E;
- `boot-check` y `dist-content-check` con la sesión respondida;
- el proxy de `npm run dev` y de la vista previa.

Con U1, un navegador sin sesión ve «Ingresá al taller» con el shell inerte y no evalúa ninguna fuente legacy.

### Tarea 1.1 · Las specs del cliente, en rojo (T004, C)

**Archivos:** en `frontend/src/shared/api/http/`, `api-failure.ts`, los stubs de `api-client.ts` y `read-xsrf-token.ts`, `fake-fetch.ts`, `api-error.factory.ts`, `api-client.spec.ts` y `read-xsrf-token.spec.ts`.

**Consume:** nada. **Produce:** las firmas del contrato («`shared/api/http`»).

1. **`api-failure.ts`:** los tipos `FieldErrors`, `ApiFailure` y `ApiResult`, copiados del contrato.
2. **Los stubs.**
   - `api-client.ts` exporta los tipos `FetchLike`, `ApiMethod`, `ApiRequestOptions`, `ApiClient` y `ApiClientOptions` del contrato, y `createApiClient`, que lanza `new Error('not implemented')`.
   - `read-xsrf-token.ts` exporta `XSRF_COOKIE_NAME = 'XSRF-TOKEN'` y `readXsrfToken`, que lanza lo mismo.
3. **`fake-fetch.ts`,** la ayuda de las specs, que arma `Response` reales:

   ```ts
   import type { FetchLike } from './api-client';

   export interface FakeReply {
     readonly status: number;
     readonly json?: unknown;
     readonly text?: string;
     readonly headers?: Readonly<Record<string, string>>;
   }

   export interface RecordedCall {
     readonly path: string;
     readonly method: string;
     readonly credentials: RequestCredentials | undefined;
     readonly headers: Readonly<Record<string, string>>;
     readonly body: unknown;
   }

   export interface FakeFetch {
     readonly fetch: FetchLike;
     readonly calls: RecordedCall[];
   }

   function responseOf(reply: FakeReply): Response {
     const text = reply.text ?? (reply.json === undefined ? '' : JSON.stringify(reply.json));
     return new Response(reply.status === 204 ? null : text, {
       status: reply.status,
       headers: reply.headers,
     });
   }

   export function createFakeFetch(replies: readonly (FakeReply | 'network-error')[]): FakeFetch {
     const calls: RecordedCall[] = [];
     let index = 0;
     const fetch: FetchLike = async (path, init) => {
       calls.push({
         path,
         method: init.method ?? 'GET',
         credentials: init.credentials,
         headers: Object.fromEntries(new Headers(init.headers).entries()),
         body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
       });
       const reply = replies[Math.min(index, replies.length - 1)];
       index += 1;
       if (reply === undefined) throw new Error('the fake fetch has no reply');
       if (reply === 'network-error') throw new TypeError('Failed to fetch');
       return responseOf(reply);
     };
     return { fetch, calls };
   }
   ```

4. **`api-error.factory.ts`:**

   ```ts
   import { Factory } from 'fishery';

   export interface ApiErrorBody {
     message: string;
     code: string;
     errors?: Record<string, string[]>;
   }

   export const apiErrorBodyFactory = Factory.define<ApiErrorBody>(() => ({
     message: 'Hay datos que corregir.',
     code: 'validation_failed',
   }));
   ```

5. **`read-xsrf-token.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { readXsrfToken } from './read-xsrf-token';

   describe('readXsrfToken', () => {
     it('is empty without the cookie', () => {
       expect(readXsrfToken('')).toBe('');
       expect(readXsrfToken('theme=dark')).toBe('');
     });

     it('decodes the value of XSRF-TOKEN among other cookies', () => {
       expect(readXsrfToken('theme=dark; XSRF-TOKEN=eyJpdiI6%3D%3D; lang=es')).toBe('eyJpdiI6==');
     });

     it('does not take a cookie whose name only starts the same', () => {
       expect(readXsrfToken('XSRF-TOKEN-OLD=viejo')).toBe('');
     });

     it('keeps a value that cannot be decoded as it came', () => {
       expect(readXsrfToken('XSRF-TOKEN=abc%E0')).toBe('abc%E0');
     });
   });
   ```

6. **`api-client.spec.ts`.** Los mensajes salen de `backend/api/lang/es/api.php` y `password-policy.php`:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from './api-client';
   import { apiErrorBodyFactory } from './api-error.factory';
   import { createFakeFetch, type FakeReply } from './fake-fetch';

   const CSRF_EXPIRED: FakeReply = {
     status: 419,
     json: { message: 'La página venció: recargala e intentá de nuevo.', code: 'csrf_token_mismatch' },
   };
   const TOO_MANY = {
     message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
     code: 'too_many_requests',
   };

   function sessionOf(id: number | null): FakeReply {
     const user =
       id === null
         ? null
         : { id, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
     return { status: 200, json: { user } };
   }

   function clientWith(replies: readonly (FakeReply | 'network-error')[], cookies = 'XSRF-TOKEN=abc') {
     const fake = createFakeFetch(replies);
     let cookieHeader = cookies;
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => cookieHeader });
     return {
       client,
       calls: fake.calls,
       setCookies(value: string) {
         cookieHeader = value;
       },
     };
   }

   describe('the API client', () => {
     it('sends a GET to the same origin with the cookies and without CSRF or account headers', async () => {
       const { client, calls } = clientWith([{ status: 200, json: { user: null } }]);
       await client.get('/api/session');
       expect(calls).toHaveLength(1);
       expect(calls[0]?.path).toBe('/api/session');
       expect(calls[0]?.method).toBe('GET');
       expect(calls[0]?.credentials).toBe('same-origin');
       expect(calls[0]?.headers).toEqual({ accept: 'application/json' });
     });

     it('copies the XSRF-TOKEN cookie into X-XSRF-TOKEN, decoded and read on each request', async () => {
       const { client, calls, setCookies } = clientWith(
         [{ status: 204 }],
         'theme=dark; XSRF-TOKEN=eyJpdiI6%3D%3D',
       );
       await client.send('POST', '/api/auth/login', {});
       setCookies('XSRF-TOKEN=second%3D');
       await client.send('POST', '/api/auth/login', {});
       expect(calls.map((call) => call.headers['x-xsrf-token'])).toEqual(['eyJpdiI6==', 'second=']);
     });

     it('names the account in X-Taller-User only when the request asks for it', async () => {
       const { client, calls } = clientWith([{ status: 204 }]);
       await client.send('POST', '/api/auth/logout', undefined, { asUser: 41 });
       await client.send('POST', '/api/auth/login', { email: 'ana@x.com' });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
       expect(calls[1]?.headers['x-taller-user']).toBeUndefined();
       expect(calls[1]?.headers['content-type']).toBe('application/json');
       expect(calls[1]?.body).toEqual({ email: 'ana@x.com' });
     });

     it('returns the parsed body of a 2xx and null for a 204', async () => {
       const { client } = clientWith([{ status: 200, json: { data: { id: 41 } } }, { status: 204 }]);
       expect(await client.send('POST', '/api/auth/login', {})).toEqual({
         ok: true,
         status: 200,
         body: { data: { id: 41 } },
       });
       expect(await client.send('POST', '/api/auth/logout', undefined)).toEqual({
         ok: true,
         status: 204,
         body: null,
       });
     });

     it('turns a {message, code} body into a response failure with every message of each field', async () => {
       const body = apiErrorBodyFactory.build({
         errors: {
           password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
         },
       });
       const { client } = clientWith([{ status: 422, json: body }]);
       expect(await client.send('POST', '/api/auth/invitations/accept', {})).toEqual({
         ok: false,
         failure: {
           kind: 'response',
           status: 422,
           code: 'validation_failed',
           message: 'Hay datos que corregir.',
           fieldErrors: {
             password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
           },
           retryAfterSeconds: null,
         },
       });
     });

     it('reads Retry-After in seconds and ignores a date', async () => {
       const { client } = clientWith([
         { status: 429, json: TOO_MANY, headers: { 'Retry-After': '120' } },
         { status: 429, json: TOO_MANY, headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } },
       ]);
       expect(await client.send('POST', '/api/auth/login', {})).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 429, retryAfterSeconds: 120 },
       });
       expect(await client.send('POST', '/api/auth/login', {})).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 429, retryAfterSeconds: null },
       });
     });

     it('reports a body that is not JSON, or an error without {message, code}, as unexpected', async () => {
       const { client } = clientWith([
         { status: 502, text: '<html>Bad Gateway</html>' },
         { status: 200, text: 'not json' },
         { status: 500, json: { error: 'boom' } },
       ]);
       expect(await client.send('POST', '/api/auth/login', {})).toEqual({
         ok: false,
         failure: { kind: 'unexpected', status: 502 },
       });
       expect(await client.get('/api/session')).toEqual({
         ok: false,
         failure: { kind: 'unexpected', status: 200 },
       });
       expect(await client.get('/api/session')).toEqual({
         ok: false,
         failure: { kind: 'unexpected', status: 500 },
       });
     });

     it('reports a rejected fetch as a network failure', async () => {
       const { client } = clientWith(['network-error']);
       expect(await client.get('/api/session')).toEqual({ ok: false, failure: { kind: 'network' } });
     });

     describe('a 419', () => {
       it('renews the session and repeats an anonymous request once', async () => {
         const { client, calls } = clientWith([
           CSRF_EXPIRED,
           sessionOf(null),
           { status: 200, json: { data: {} } },
         ]);
         const result = await client.send('POST', '/api/auth/login', {});
         expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
           'POST /api/auth/login',
           'GET /api/session',
           'POST /api/auth/login',
         ]);
         expect(result.ok).toBe(true);
       });

       it('repeats a request of the same account once', async () => {
         const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(41), { status: 204 }]);
         expect((await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).ok).toBe(true);
         expect(calls).toHaveLength(3);
       });

       it('does not repeat when the session has no account any more', async () => {
         const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(null)]);
         expect(await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).toEqual({
           ok: false,
           failure: { kind: 'signed-out' },
         });
         expect(calls).toHaveLength(2);
       });

       it('does not repeat when the session is another account, and keeps the message of the server', async () => {
         const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(7)]);
         expect(await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).toEqual({
           ok: false,
           failure: {
             kind: 'account-changed',
             message: 'La página venció: recargala e intentá de nuevo.',
           },
         });
         expect(calls).toHaveLength(2);
       });

       it('repeats at most once', async () => {
         const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(null), CSRF_EXPIRED]);
         expect(await client.send('POST', '/api/auth/login', {})).toMatchObject({
           ok: false,
           failure: { kind: 'response', status: 419 },
         });
         expect(calls).toHaveLength(3);
       });

       it('returns the 419 when the renewal itself fails', async () => {
         const { client, calls } = clientWith([CSRF_EXPIRED, 'network-error']);
         expect(await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).toMatchObject({
           ok: false,
           failure: { kind: 'response', status: 419 },
         });
         expect(calls).toHaveLength(2);
       });
     });
   });
   ```

7. **Correr** `npm run test:unit -- frontend/src/shared/api/http`: todo falla con `not implemented`.
8. **Commit:** `test(front): specs del cliente de la API, en rojo`.

### Tarea 1.2 · El cliente (T005, C)

**Archivos:** en `frontend/src/shared/api/http/`, `read-xsrf-token.ts`, `api-client.ts`, `api-client-context.ts` e `index.ts`.

1. **`read-xsrf-token.ts`:**

   ```ts
   export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';

   function decode(value: string): string {
     try {
       return decodeURIComponent(value);
     } catch {
       return value;
     }
   }

   export function readXsrfToken(cookies: string): string {
     for (const pair of cookies.split(';')) {
       const separator = pair.indexOf('=');
       if (separator < 0) continue;
       if (pair.slice(0, separator).trim() !== XSRF_COOKIE_NAME) continue;
       return decode(pair.slice(separator + 1).trim());
     }
     return '';
   }
   ```

2. **`api-client.ts`,** entero. El 401 no se resuelve acá (research.md, R3):

   ```ts
   import { isPlainObject } from '../../lib/is-plain-object';
   import type { ApiFailure, ApiResult, FieldErrors } from './api-failure';
   import { readXsrfToken } from './read-xsrf-token';

   export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
   export type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

   export interface ApiRequestOptions {
     readonly asUser?: number;
     readonly signal?: AbortSignal;
   }

   export interface ApiClient {
     get(path: string, options?: ApiRequestOptions): Promise<ApiResult>;
     send(method: ApiMethod, path: string, body: unknown, options?: ApiRequestOptions): Promise<ApiResult>;
   }

   export interface ApiClientOptions {
     readonly fetch: FetchLike;
     readonly readCookies: () => string;
   }

   const SESSION_PATH = '/api/session';
   const CSRF_EXPIRED = 419;
   const NOT_JSON = Symbol('not-json');

   function parseBody(text: string): unknown {
     if (text === '') return null;
     try {
       return JSON.parse(text) as unknown;
     } catch {
       return NOT_JSON;
     }
   }

   function fieldErrorsOf(value: unknown): FieldErrors {
     if (!isPlainObject(value)) return {};
     const errors: Record<string, string[]> = {};
     for (const [field, messages] of Object.entries(value)) {
       if (!Array.isArray(messages)) continue;
       errors[field] = messages.filter((message): message is string => typeof message === 'string');
     }
     return errors;
   }

   function retryAfterOf(headers: Headers): number | null {
     const value = headers.get('Retry-After')?.trim() ?? '';
     return /^\d+$/.test(value) ? Number(value) : null;
   }

   function failureOf(response: Response, body: unknown): ApiFailure {
     if (!isPlainObject(body) || typeof body.message !== 'string' || typeof body.code !== 'string') {
       return { kind: 'unexpected', status: response.status };
     }
     return {
       kind: 'response',
       status: response.status,
       code: body.code,
       message: body.message,
       fieldErrors: fieldErrorsOf(body.errors),
       retryAfterSeconds: retryAfterOf(response.headers),
     };
   }

   function csrfExpiredMessage(result: ApiResult): string | null {
     if (result.ok || result.failure.kind !== 'response') return null;
     return result.failure.status === CSRF_EXPIRED ? result.failure.message : null;
   }

   function sessionAccountOf(result: ApiResult): number | null | undefined {
     if (!result.ok || !isPlainObject(result.body)) return undefined;
     const { user } = result.body;
     if (user === null) return null;
     return isPlainObject(user) && typeof user.id === 'number' ? user.id : undefined;
   }

   export function createApiClient({ fetch, readCookies }: ApiClientOptions): ApiClient {
     function headersFor(method: 'GET' | ApiMethod, asUser: number | undefined): Record<string, string> {
       const headers: Record<string, string> = { Accept: 'application/json' };
       if (method === 'GET') return headers;
       headers['Content-Type'] = 'application/json';
       headers['X-XSRF-TOKEN'] = readXsrfToken(readCookies());
       if (asUser !== undefined) headers['X-Taller-User'] = String(asUser);
       return headers;
     }

     async function perform(
       method: 'GET' | ApiMethod,
       path: string,
       body: unknown,
       options: ApiRequestOptions,
     ): Promise<ApiResult> {
       let response: Response;
       let text: string;
       try {
         response = await fetch(path, {
           method,
           credentials: 'same-origin',
           headers: headersFor(method, options.asUser),
           body: body === undefined ? undefined : JSON.stringify(body),
           signal: options.signal,
         });
         text = await response.text();
       } catch {
         return { ok: false, failure: { kind: 'network' } };
       }
       const parsed = parseBody(text);
       if (!response.ok) return { ok: false, failure: failureOf(response, parsed) };
       if (parsed === NOT_JSON) return { ok: false, failure: { kind: 'unexpected', status: response.status } };
       return { ok: true, status: response.status, body: parsed };
     }

     async function send(
       method: ApiMethod,
       path: string,
       body: unknown,
       options: ApiRequestOptions = {},
     ): Promise<ApiResult> {
       const first = await perform(method, path, body, options);
       const expiredMessage = csrfExpiredMessage(first);
       if (expiredMessage === null) return first;
       const account = sessionAccountOf(await perform('GET', SESSION_PATH, undefined, {}));
       if (account === undefined) return first;
       if (options.asUser === undefined || account === options.asUser) {
         return perform(method, path, body, options);
       }
       if (account === null) return { ok: false, failure: { kind: 'signed-out' } };
       return { ok: false, failure: { kind: 'account-changed', message: expiredMessage } };
     }

     return {
       get: (path, options = {}) => perform('GET', path, undefined, options),
       send,
     };
   }
   ```

3. **`api-client-context.ts`:**

   ```ts
   import { createContext, useContext } from 'react';
   import type { ApiClient } from './api-client';

   export const ApiClientContext = createContext<ApiClient | null>(null);

   export function useApiClient(): ApiClient {
     const client = useContext(ApiClientContext);
     if (client === null) {
       throw new Error('Falta ApiClientContext: la raíz de la cuenta provee el cliente.');
     }
     return client;
   }
   ```

4. **`index.ts`:**

   ```ts
   export { createApiClient } from './api-client';
   export type {
     ApiClient,
     ApiClientOptions,
     ApiMethod,
     ApiRequestOptions,
     FetchLike,
   } from './api-client';
   export type { ApiFailure, ApiResult, FieldErrors } from './api-failure';
   export { XSRF_COOKIE_NAME, readXsrfToken } from './read-xsrf-token';
   export { ApiClientContext, useApiClient } from './api-client-context';
   ```

5. **Correr** `npm run test:unit -- frontend/src/shared/api/http`, en verde, y después `npm run typecheck` y `npm run lint`. `perform` y `send` quedan por debajo de 10.
6. **Commit:** `feat(front): el cliente de la API, con CSRF, X-Taller-User y el 419`.

### Tarea 1.3 · Las specs de la sesión, en rojo (T006, S)

**Archivos:** en `frontend/src/entities/session/model/`, `types.ts`, los stubs de `parse-session.ts`, `session-store.ts`, `fetch-session.ts` y `password-length.ts`, `session.factory.ts` y una spec por módulo.

**Consume:** de C, los tipos `ApiClient` y `ApiResult` (contrato). Escribís contra el contrato aunque C no haya entregado: tu spec usa un cliente falso. **Produce:** «`entities/session`» del contrato.

1. **`types.ts`:** `AccountRole`, `PublishedUser`, `SessionFeatures`, `SessionSnapshot`, `SessionStatus`, `SessionState` y `SessionOutcome`, copiados del contrato.
2. **Los stubs:**
   - `parse-session.ts` exporta `parsePublishedUser` y `parseSessionBody`;
   - `session-store.ts`, `createSessionStore`, `sessionStore` y `selectReadyAccount`;
   - `fetch-session.ts`, `fetchSession`;
   - `password-length.ts`, `PASSWORD_MIN_LENGTH = 15`, `PASSWORD_MAX_LENGTH = 64` y `checkNewPasswordLength`.

   Cada función lanza `not implemented`. `sessionStore` se declara como `createSessionStore()`, así que lanza al importarse; la spec del store sólo usa la fábrica.
3. **`session.factory.ts`:**

   ```ts
   import { Factory } from 'fishery';
   import type { PublishedUser } from './types';

   export interface SessionBody {
     user: PublishedUser | null;
     features: { passwordReset: boolean; registration: boolean };
     contentVersion: string | null;
     catalogs: unknown[];
   }

   export const publishedUserFactory = Factory.define<PublishedUser>(({ sequence }) => ({
     id: 40 + sequence,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   }));

   export const sessionBodyFactory = Factory.define<SessionBody>(() => ({
     user: publishedUserFactory.build(),
     features: { passwordReset: false, registration: false },
     contentVersion: '0123456789abcdef0123456789abcdef',
     catalogs: [],
   }));
   ```

4. **`parse-session.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { parsePublishedUser, parseSessionBody } from './parse-session';
   import { publishedUserFactory, sessionBodyFactory } from './session.factory';

   const ANA = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };

   describe('parseSessionBody', () => {
     it('keeps the account, the features and the content version and drops the catalogs', () => {
       const body = sessionBodyFactory.build({ user: publishedUserFactory.build({ id: 41 }) });
       expect(parseSessionBody(body)).toEqual({
         user: ANA,
         features: { passwordReset: false, registration: false },
         contentVersion: '0123456789abcdef0123456789abcdef',
       });
     });

     it('accepts a session without an account and without content', () => {
       const body = sessionBodyFactory.build({ user: null, contentVersion: null });
       expect(parseSessionBody(body)).toEqual({
         user: null,
         features: { passwordReset: false, registration: false },
         contentVersion: null,
       });
     });

     it.each([
       ['a body that is not an object', 'texto'],
       ['an account whose id is text', { ...sessionBodyFactory.build(), user: { ...ANA, id: '41' } }],
       ['an account with an unknown role', { ...sessionBodyFactory.build(), user: { ...ANA, role: 'teacher' } }],
       ['an account without privacyAccepted', { ...sessionBodyFactory.build(), user: { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student' } }],
       ['a session without features', { user: null, contentVersion: null }],
       ['a content version that is a number', { ...sessionBodyFactory.build(), contentVersion: 7 }],
     ])('rejects %s', (_name, body) => {
       expect(parseSessionBody(body)).toBeNull();
     });
   });

   describe('parsePublishedUser', () => {
     it('keeps the five published fields of an admin', () => {
       expect(parsePublishedUser({ ...ANA, id: 1, role: 'admin', extra: 'x' })).toEqual({
         ...ANA,
         id: 1,
         role: 'admin',
       });
     });

     it('rejects null', () => {
       expect(parsePublishedUser(null)).toBeNull();
     });
   });
   ```

5. **`session-store.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createSessionStore, selectReadyAccount } from './session-store';
   import type { PublishedUser } from './types';

   const ANA: PublishedUser = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
   const BRUNO: PublishedUser = { id: 77, name: 'Bruno Díaz', email: 'bruno@x.com', role: 'student', privacyAccepted: true };
   const FEATURES = { passwordReset: true, registration: false };

   describe('the session store', () => {
     it('starts unknown, without an account, without features and without a content version', () => {
       const { status, user, features, contentVersion } = createSessionStore().getState();
       expect({ status, user, features, contentVersion }).toEqual({
         status: 'unknown',
         user: null,
         features: { passwordReset: false, registration: false },
         contentVersion: null,
       });
     });

     it('is signed in after a snapshot with an account and signed out after one without', () => {
       const store = createSessionStore();
       store.getState().applySnapshot({ user: ANA, features: FEATURES, contentVersion: 'v1' });
       expect(store.getState().status).toBe('signed-in');
       store.getState().applySnapshot({ user: null, features: FEATURES, contentVersion: 'v1' });
       expect(store.getState().status).toBe('signed-out');
       expect(store.getState().user).toBeNull();
     });

     it('keeps the features and the content version when a sign-in changes the account', () => {
       const store = createSessionStore();
       store.getState().applySnapshot({ user: null, features: FEATURES, contentVersion: 'v1' });
       store.getState().applyUser(BRUNO);
       const { status, user, features, contentVersion } = store.getState();
       expect({ status, user, features, contentVersion }).toEqual({
         status: 'signed-in',
         user: BRUNO,
         features: FEATURES,
         contentVersion: 'v1',
       });
     });

     it('offers the account to «Tu cuenta» only with the current notice accepted', () => {
       const store = createSessionStore();
       store.getState().applyUser({ ...ANA, privacyAccepted: false });
       expect(selectReadyAccount(store.getState())).toBeNull();
       store.getState().applyUser(ANA);
       expect(selectReadyAccount(store.getState())).toEqual(ANA);
     });
   });
   ```

6. **`fetch-session.spec.ts`:**

   ```ts
   import { describe, expect, it, vi } from 'vitest';
   import type { ApiClient, ApiResult } from '../../../shared/api/http';
   import { fetchSession } from './fetch-session';
   import { sessionBodyFactory } from './session.factory';

   function clientAnswering(result: ApiResult) {
     const get = vi.fn<ApiClient['get']>(async () => result);
     const client: ApiClient = { get, send: vi.fn<ApiClient['send']>() };
     return { client, get };
   }

   const response = (status: number, code: string, message: string) => ({
     ok: false as const,
     failure: {
       kind: 'response' as const,
       status,
       code,
       message,
       fieldErrors: {},
       retryAfterSeconds: status === 429 ? 30 : null,
     },
   });

   describe('fetchSession', () => {
     it('asks GET /api/session with the signal and returns the snapshot', async () => {
       const { client, get } = clientAnswering({
         ok: true,
         status: 200,
         body: sessionBodyFactory.build({ user: null }),
       });
       const signal = new AbortController().signal;
       expect(await fetchSession(client, { signal })).toEqual({
         kind: 'session',
         snapshot: {
           user: null,
           features: { passwordReset: false, registration: false },
           contentVersion: '0123456789abcdef0123456789abcdef',
         },
       });
       expect(get).toHaveBeenCalledWith('/api/session', { signal });
     });

     it.each([
       ['a body that is not a session', { ok: true as const, status: 200, body: { user: 'ana' } }],
       ['the network', { ok: false as const, failure: { kind: 'network' as const } }],
       ['an answer that is not JSON', { ok: false as const, failure: { kind: 'unexpected' as const, status: 502 } }],
       ['a server error', response(500, 'server_error', 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.')],
     ])('treats %s as a server that did not answer', async (_name, result) => {
       const { client } = clientAnswering(result);
       expect(await fetchSession(client, {})).toEqual({ kind: 'unreachable' });
     });

     it('passes a rate limit on with its message and its wait', async () => {
       const { client } = clientAnswering(
         response(429, 'too_many_requests', 'Demasiados intentos. Esperá un momento antes de volver a probar.'),
       );
       expect(await fetchSession(client, {})).toEqual({
         kind: 'rate-limited',
         message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
         retryAfterSeconds: 30,
       });
     });
   });
   ```

7. **`password-length.spec.ts`.** Los mensajes salen de `lang/es/password-policy.php`, y el caso de la «á» descompuesta, de la historia 1, escenario 3:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { checkNewPasswordLength } from './password-length';

   describe('checkNewPasswordLength', () => {
     it.each([
       ['14 letters', 'a'.repeat(14), 'Tiene que tener al menos 15 caracteres.'],
       ['15 letters', 'a'.repeat(15), true],
       ['64 letters', 'a'.repeat(64), true],
       ['65 letters', 'a'.repeat(65), 'Puede tener hasta 64 caracteres.'],
       ['14 letters and a decomposed «á» (16 UTF-16 units, 15 after NFC)', `${'a'.repeat(14)}á`, true],
       ['15 emoji (30 UTF-16 units)', '😀'.repeat(15), true],
       ['14 emoji', '😀'.repeat(14), 'Tiene que tener al menos 15 caracteres.'],
     ])('%s', (_name, value, expected) => {
       expect(checkNewPasswordLength(value)).toBe(expected);
     });
   });
   ```

8. **Correr** `npm run test:unit -- frontend/src/entities/session`: todo falla con `not implemented`.
9. **Commit:** `test(front): specs de la sesión, en rojo`.

### Tarea 1.4 · La sesión (T007, S)

**Archivos:** los cuatro módulos de `frontend/src/entities/session/model/` e `index.ts`.

1. **`parse-session.ts`:**

   ```ts
   import { isPlainObject } from '../../../shared/lib/is-plain-object';
   import type { AccountRole, PublishedUser, SessionFeatures, SessionSnapshot } from './types';

   function isAccountRole(value: unknown): value is AccountRole {
     return value === 'student' || value === 'admin';
   }

   export function parsePublishedUser(value: unknown): PublishedUser | null {
     if (!isPlainObject(value)) return null;
     const { id, name, email, role, privacyAccepted } = value;
     if (typeof id !== 'number' || typeof name !== 'string' || typeof email !== 'string') return null;
     if (!isAccountRole(role) || typeof privacyAccepted !== 'boolean') return null;
     return { id, name, email, role, privacyAccepted };
   }

   function parseFeatures(value: unknown): SessionFeatures | null {
     if (!isPlainObject(value)) return null;
     const { passwordReset, registration } = value;
     if (typeof passwordReset !== 'boolean' || typeof registration !== 'boolean') return null;
     return { passwordReset, registration };
   }

   export function parseSessionBody(body: unknown): SessionSnapshot | null {
     if (!isPlainObject(body)) return null;
     const user = body.user === null ? null : parsePublishedUser(body.user);
     if (body.user !== null && user === null) return null;
     const features = parseFeatures(body.features);
     if (features === null) return null;
     const { contentVersion } = body;
     if (contentVersion !== null && typeof contentVersion !== 'string') return null;
     return { user, features, contentVersion };
   }
   ```

2. **`session-store.ts`:**

   ```ts
   import { createStore, type StoreApi } from 'zustand/vanilla';
   import type { PublishedUser, SessionFeatures, SessionState } from './types';

   const NO_FEATURES: SessionFeatures = { passwordReset: false, registration: false };

   export function createSessionStore(): StoreApi<SessionState> {
     return createStore<SessionState>()((set) => ({
       status: 'unknown',
       user: null,
       features: NO_FEATURES,
       contentVersion: null,
       applySnapshot: (snapshot) =>
         set({ ...snapshot, status: snapshot.user === null ? 'signed-out' : 'signed-in' }),
       applyUser: (user) => set({ user, status: 'signed-in' }),
     }));
   }

   export const sessionStore = createSessionStore();

   export function selectReadyAccount(state: SessionState): PublishedUser | null {
     return state.user !== null && state.user.privacyAccepted ? state.user : null;
   }
   ```

3. **`fetch-session.ts`:**

   ```ts
   import type { ApiClient } from '../../../shared/api/http';
   import { parseSessionBody } from './parse-session';
   import type { SessionOutcome } from './types';

   const TOO_MANY_REQUESTS = 429;

   export async function fetchSession(
     client: ApiClient,
     request: { readonly signal?: AbortSignal },
   ): Promise<SessionOutcome> {
     const result = await client.get('/api/session', { signal: request.signal });
     if (result.ok) {
       const snapshot = parseSessionBody(result.body);
       return snapshot === null ? { kind: 'unreachable' } : { kind: 'session', snapshot };
     }
     const { failure } = result;
     if (failure.kind === 'response' && failure.status === TOO_MANY_REQUESTS) {
       return {
         kind: 'rate-limited',
         message: failure.message,
         retryAfterSeconds: failure.retryAfterSeconds,
       };
     }
     return { kind: 'unreachable' };
   }
   ```

4. **`password-length.ts`:**

   ```ts
   export const PASSWORD_MIN_LENGTH = 15;
   export const PASSWORD_MAX_LENGTH = 64;

   const TOO_SHORT = 'Tiene que tener al menos 15 caracteres.';
   const TOO_LONG = 'Puede tener hasta 64 caracteres.';

   export function checkNewPasswordLength(value: string): true | string {
     const length = [...value.normalize('NFC')].length;
     if (length < PASSWORD_MIN_LENGTH) return TOO_SHORT;
     if (length > PASSWORD_MAX_LENGTH) return TOO_LONG;
     return true;
   }
   ```

5. **`index.ts`:**

   ```ts
   export type {
     AccountRole,
     PublishedUser,
     SessionFeatures,
     SessionOutcome,
     SessionSnapshot,
     SessionState,
     SessionStatus,
   } from './model/types';
   export { parsePublishedUser, parseSessionBody } from './model/parse-session';
   export { createSessionStore, selectReadyAccount, sessionStore } from './model/session-store';
   export { fetchSession } from './model/fetch-session';
   export {
     PASSWORD_MAX_LENGTH,
     PASSWORD_MIN_LENGTH,
     checkNewPasswordLength,
   } from './model/password-length';
   ```

6. **Correr** `npm run test:unit -- frontend/src/entities/session`, en verde, y después `npm run typecheck` y `npm run lint`.
7. **Commit:** `feat(front): la sesión, su store y su lectura`.

### Tarea 1.5 · Las specs de «pedir el ingreso» y de la puerta del acceso, en rojo (T008, A)

**Archivos:** en `frontend/src/features/sign-in/`:

- `model/access-request.ts` (tipos completos y `createAccessRequests` como stub);
- el stub de `model/reauthenticate.ts`;
- los stubs de `ui/AccessGate.tsx`, `AccessPage.tsx`, `AccessDialog.tsx`, `AccessScreen.tsx` y `AccessHeading.tsx`, cada uno con `const X = () => { throw new Error('not implemented'); }; export default X;`;
- `model/access-request.spec.ts`, `model/reauthenticate.spec.ts` y `ui/access-gate.spec.tsx`.

**Consume:** de S, `PublishedUser` y `sessionStore`; de C, `ApiClientContext` y `createApiClient` (contrato). **Produce:** «`features/sign-in`» del contrato, sin las pantallas de U2 a U4.

1. **`model/access-request.ts`:** los tipos `AccessToken`, `AccessPresentation`, `AccessReason`, `SignInOptions`, `AccessRequest`, `RequestSignIn` y `AccessRequests`, copiados del contrato. `createAccessRequests` lanza `not implemented`, y `accessRequests` y `requestSignIn` se declaran en T009.
2. **`model/access-request.spec.ts`:**

   ```ts
   import { describe, expect, it, vi } from 'vitest';
   import type { PublishedUser } from '../../../entities/session';
   import { createAccessRequests } from './access-request';

   const ANA: PublishedUser = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };

   describe('the access requests', () => {
     it('has no request until someone asks', () => {
       expect(createAccessRequests().current()).toBeNull();
     });

     it('publishes the request with its presentation, its reason and its token', () => {
       const requests = createAccessRequests();
       const listener = vi.fn();
       requests.subscribe(listener);
       void requests.request({
         presentation: 'page',
         reason: 'boot',
         token: { kind: 'invitation', token: 'k3J8' },
       });
       expect(requests.current()).toEqual({
         id: 1,
         presentation: 'page',
         reason: 'boot',
         token: { kind: 'invitation', token: 'k3J8' },
       });
       expect(listener).toHaveBeenCalledOnce();
     });

     it('defaults to a dialog for an expired session, without a token', () => {
       const requests = createAccessRequests();
       void requests.request();
       expect(requests.current()).toEqual({ id: 1, presentation: 'dialog', reason: 'expired', token: null });
     });

     it('answers two callers with one request and resolves both with the account', async () => {
       const requests = createAccessRequests();
       const first = requests.request();
       const second = requests.request({ presentation: 'page' });
       expect(second).toBe(first);
       expect(requests.current()?.presentation).toBe('dialog');
       requests.finish(ANA);
       await expect(first).resolves.toEqual(ANA);
       await expect(second).resolves.toEqual(ANA);
       expect(requests.current()).toBeNull();
     });

     it('opens a new request with a new id after the previous one finished', () => {
       const requests = createAccessRequests();
       void requests.request();
       requests.finish(ANA);
       void requests.request();
       expect(requests.current()?.id).toBe(2);
     });

     it('ignores a finish without a request', () => {
       const requests = createAccessRequests();
       const listener = vi.fn();
       requests.subscribe(listener);
       requests.finish(ANA);
       expect(listener).not.toHaveBeenCalled();
     });

     it('stops telling a listener that unsubscribed', () => {
       const requests = createAccessRequests();
       const listener = vi.fn();
       const unsubscribe = requests.subscribe(listener);
       unsubscribe();
       void requests.request();
       expect(listener).not.toHaveBeenCalled();
     });
   });
   ```

3. **`model/reauthenticate.spec.ts`:**

   ```ts
   import { describe, expect, it, vi } from 'vitest';
   import type { PublishedUser } from '../../../entities/session';
   import type { RequestSignIn } from './access-request';
   import { reauthenticate } from './reauthenticate';

   const ANA: PublishedUser = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };

   describe('reauthenticate', () => {
     it('asks for the sign-in as a dialog and goes on with the same account', async () => {
       const requestSignIn = vi.fn<RequestSignIn>(async () => ANA);
       const reloadDocument = vi.fn();
       expect(await reauthenticate(41, { requestSignIn, reloadDocument })).toBe('same-account');
       expect(requestSignIn).toHaveBeenCalledWith({ presentation: 'dialog', reason: 'expired' });
       expect(reloadDocument).not.toHaveBeenCalled();
     });

     it('reloads the document when another account signs in', async () => {
       const requestSignIn = vi.fn<RequestSignIn>(async () => ({ ...ANA, id: 77 }));
       const reloadDocument = vi.fn();
       expect(await reauthenticate(41, { requestSignIn, reloadDocument })).toBe('reloading');
       expect(reloadDocument).toHaveBeenCalledOnce();
     });
   });
   ```

4. **`ui/access-gate.spec.tsx`.** jsdom no implementa `showModal` ni `close`, así que la spec define un stub mínimo (ADR 0008):

   ```tsx
   import { act, render, screen } from '@testing-library/react';
   import { beforeAll, describe, expect, it, vi } from 'vitest';
   import { ApiClientContext, createApiClient } from '../../../shared/api/http';
   import { createFakeFetch } from '../../../shared/api/http/fake-fetch';
   import { createAccessRequests, type AccessRequests } from '../model/access-request';
   import AccessGate from './AccessGate';

   beforeAll(() => {
     HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
       this.open = true;
     };
     HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
       this.open = false;
     };
   });

   function renderGate(requests: AccessRequests) {
     const client = createApiClient({ fetch: createFakeFetch([]).fetch, readCookies: () => '' });
     const setShellInert = vi.fn();
     const reloadDocument = vi.fn();
     const view = render(
       <ApiClientContext value={client}>
         <AccessGate requests={requests} setShellInert={setShellInert} reloadDocument={reloadDocument} />
       </ApiClientContext>,
     );
     return { ...view, setShellInert };
   }

   describe('the access gate', () => {
     it('draws nothing, and no live region, while nobody asks', () => {
       const { container } = renderGate(createAccessRequests());
       expect(container).toBeEmptyDOMElement();
     });

     it('shows the access as a page with a level-one title and the shell inert', () => {
       const requests = createAccessRequests();
       const { setShellInert } = renderGate(requests);
       act(() => {
         void requests.request({ presentation: 'page', reason: 'boot' });
       });
       expect(screen.getByRole('heading', { level: 1, name: 'Ingresá al taller' })).toBeVisible();
       expect(screen.getByRole('main')).toBeInTheDocument();
       expect(setShellInert).toHaveBeenLastCalledWith(true);
     });

     it('gives the shell back when the request finishes', () => {
       const requests = createAccessRequests();
       const { setShellInert } = renderGate(requests);
       act(() => {
         void requests.request({ presentation: 'page', reason: 'boot' });
       });
       act(() => {
         requests.finish({ id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true });
       });
       expect(screen.queryByRole('heading', { name: 'Ingresá al taller' })).toBeNull();
       expect(setShellInert).toHaveBeenLastCalledWith(false);
     });

     it('shows the access as a dialog over a running shell, with a level-two title', () => {
       const requests = createAccessRequests();
       const { setShellInert } = renderGate(requests);
       act(() => {
         void requests.request();
       });
       expect(screen.getByRole('dialog', { name: 'Ingresá al taller' })).toBeInTheDocument();
       expect(screen.getByRole('heading', { level: 2, name: 'Ingresá al taller' })).toBeInTheDocument();
       expect(setShellInert).not.toHaveBeenCalled();
     });
   });
   ```

5. **Correr** `npm run test:unit -- frontend/src/features/sign-in`: todo falla con `not implemented`.
6. **Commit:** `test(front): specs de «pedir el ingreso» y de la puerta del acceso, en rojo`.

### Tarea 1.6 · «Pedir el ingreso» y la puerta del acceso (T009, A)

**Archivos:** `model/access-request.ts`, `model/reauthenticate.ts`, `ui/AccessGate.tsx`, `ui/AccessPage.tsx`, `ui/AccessDialog.tsx`, `ui/AccessScreen.tsx`, `ui/AccessHeading.tsx`, `ui/access.css` e `index.ts`, en `frontend/src/features/sign-in/`.

1. **`createAccessRequests`,** en `model/access-request.ts`, debajo de los tipos:

   ```ts
   interface PendingRequest {
     readonly request: AccessRequest;
     readonly promise: Promise<PublishedUser>;
     readonly resolve: (user: PublishedUser) => void;
   }

   export function createAccessRequests(): AccessRequests {
     let pending: PendingRequest | null = null;
     let nextId = 1;
     const listeners = new Set<() => void>();
     const notify = (): void => {
       for (const listener of listeners) listener();
     };

     return {
       request(options = {}) {
         if (pending !== null) return pending.promise;
         let resolve: (user: PublishedUser) => void = () => {};
         const promise = new Promise<PublishedUser>((onResolve) => {
           resolve = onResolve;
         });
         const request: AccessRequest = {
           id: nextId,
           presentation: options.presentation ?? 'dialog',
           reason: options.reason ?? 'expired',
           token: options.token ?? null,
         };
         nextId += 1;
         pending = { request, promise, resolve };
         notify();
         return promise;
       },
       current: () => pending?.request ?? null,
       subscribe(listener) {
         listeners.add(listener);
         return () => {
           listeners.delete(listener);
         };
       },
       finish(user) {
         const done = pending;
         if (done === null) return;
         pending = null;
         notify();
         done.resolve(user);
       },
     };
   }

   export const accessRequests = createAccessRequests();

   export const requestSignIn: RequestSignIn = (options) => accessRequests.request(options);
   ```

   El archivo importa `import type { PublishedUser } from '../../../entities/session';`.
2. **`model/reauthenticate.ts`:**

   ```ts
   import type { RequestSignIn } from './access-request';

   export type ReauthenticationOutcome = 'same-account' | 'reloading';

   export async function reauthenticate(
     expectedUserId: number,
     dependencies: { readonly requestSignIn: RequestSignIn; readonly reloadDocument: () => void },
   ): Promise<ReauthenticationOutcome> {
     const user = await dependencies.requestSignIn({ presentation: 'dialog', reason: 'expired' });
     if (user.id === expectedUserId) return 'same-account';
     dependencies.reloadDocument();
     return 'reloading';
   }
   ```

3. **`ui/AccessHeading.tsx`:**

   ```tsx
   import type { ReactNode } from 'react';

   interface AccessHeadingProps {
     readonly level: 1 | 2;
     readonly children: ReactNode;
   }

   const AccessHeading = ({ level, children }: AccessHeadingProps) =>
     level === 1 ? (
       <h1 className="access-title">{children}</h1>
     ) : (
       <h2 className="access-title">{children}</h2>
     );

   export default AccessHeading;
   ```

4. **`ui/AccessScreen.tsx`.** En U1 sólo muestra el título y el pie del ingreso; U2 le suma el formulario, U3 el alta y la reaceptación, y U4 el restablecimiento:

   ```tsx
   import type { PublishedUser } from '../../../entities/session';
   import type { AccessRequest } from '../model/access-request';
   import AccessHeading from './AccessHeading';

   interface AccessScreenProps {
     readonly request: AccessRequest;
     onFinish(user: PublishedUser): void;
     reloadDocument(): void;
   }

   const AccessScreen = ({ request }: AccessScreenProps) => (
     <div className="form-stack">
       <AccessHeading level={request.presentation === 'page' ? 1 : 2}>Ingresá al taller</AccessHeading>
       <p>Usá el email con el que te invitaron.</p>
     </div>
   );

   export default AccessScreen;
   ```

5. **`ui/AccessPage.tsx`:**

   ```tsx
   import { useEffect, type ReactNode } from 'react';

   interface AccessPageProps {
     setShellInert(inert: boolean): void;
     readonly children: ReactNode;
   }

   const AccessPage = ({ setShellInert, children }: AccessPageProps) => {
     useEffect(() => {
       setShellInert(true);
       return () => setShellInert(false);
     }, [setShellInert]);
     return (
       <div className="access-page">
         <main className="access-main">{children}</main>
       </div>
     );
   };

   export default AccessPage;
   ```

6. **`ui/AccessDialog.tsx`.** El ingreso como diálogo no se cierra con Esc, porque quien lo pidió espera una cuenta:

   ```tsx
   import { useEffect, useRef, type ReactNode } from 'react';

   interface AccessDialogProps {
     readonly children: ReactNode;
   }

   const AccessDialog = ({ children }: AccessDialogProps) => {
     const dialog = useRef<HTMLDialogElement>(null);
     useEffect(() => {
       const element = dialog.current;
       if (element !== null && !element.open) element.showModal();
       return () => element?.close();
     }, []);
     return (
       <dialog
         ref={dialog}
         className="access-dialog"
         aria-label="Ingresá al taller"
         onCancel={(event) => event.preventDefault()}
       >
         <div className="dialog-content">{children}</div>
       </dialog>
     );
   };

   export default AccessDialog;
   ```

7. **`ui/AccessGate.tsx`:**

   ```tsx
   import { useSyncExternalStore } from 'react';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import type { AccessRequests } from '../model/access-request';
   import AccessDialog from './AccessDialog';
   import AccessPage from './AccessPage';
   import AccessScreen from './AccessScreen';

   interface AccessGateProps {
     readonly requests: AccessRequests;
     setShellInert(inert: boolean): void;
     reloadDocument(): void;
   }

   const AccessGate = ({ requests, setShellInert, reloadDocument }: AccessGateProps) => {
     const request = useSyncExternalStore(requests.subscribe, requests.current);
     if (request === null) return null;
     const finish = (user: PublishedUser): void => {
       sessionStore.getState().applyUser(user);
       requests.finish(user);
     };
     const screen = (
       <AccessScreen key={request.id} request={request} onFinish={finish} reloadDocument={reloadDocument} />
     );
     if (request.presentation === 'page') {
       return <AccessPage setShellInert={setShellInert}>{screen}</AccessPage>;
     }
     return <AccessDialog>{screen}</AccessDialog>;
   };

   export default AccessGate;
   ```

8. **`ui/access.css`:**

   ```css
   .access-page {
     position: fixed;
     inset: 0;
     z-index: 20;
     overflow-y: auto;
     background: var(--paper);
   }
   .access-main {
     max-width: 520px;
     margin: 0 auto;
     padding: 72px 24px 48px;
   }
   .access-title {
     font-size: 34px;
     letter-spacing: -1px;
     margin-bottom: 12px;
   }
   .access-notice {
     color: var(--green);
   }
   .access-dialog {
     width: min(520px, calc(100% - 32px));
   }
   @media (max-width: 590px) {
     .access-main {
       padding: 40px 16px 32px;
     }
     .access-title {
       font-size: 28px;
     }
     .access-dialog {
       width: 100%;
       max-width: none;
       height: 100%;
       max-height: none;
       margin: 0;
       border-radius: 0;
     }
   }
   ```

9. **`index.ts`:**

   ```ts
   export {
     accessRequests,
     createAccessRequests,
     requestSignIn,
   } from './model/access-request';
   export type {
     AccessPresentation,
     AccessReason,
     AccessRequest,
     AccessRequests,
     AccessToken,
     RequestSignIn,
     SignInOptions,
   } from './model/access-request';
   export { reauthenticate } from './model/reauthenticate';
   export type { ReauthenticationOutcome } from './model/reauthenticate';
   export { default as AccessGate } from './ui/AccessGate';
   ```

10. **Correr** `npm run test:unit -- frontend/src/features/sign-in`, en verde, y después `npm run typecheck` y `npm run lint`. `access.css` todavía no la importa nadie: la suma T012.
11. **Commit:** `feat(front): «pedir el ingreso» y la puerta del acceso, como página o como diálogo`.

### Tarea 1.7 · Las specs de las etapas, en rojo (T010, B)

**Archivos:**

- en `frontend/src/shared/lib/`, el stub de `format-wait.ts` y `format-wait.spec.ts`;
- en `frontend/src/app/boot/`, los stubs de `access-tokens.ts`, `session-view.ts` y `session-gate.ts`, con `access-tokens.spec.ts`, `session-view.spec.ts` y `session-gate.spec.ts`.

**Consume:** de S, `SessionOutcome`, `SessionSnapshot` y `PublishedUser`; de A, `AccessToken`, `RequestSignIn` y `SignInOptions`. Son tipos del contrato, y la spec no necesita sus implementaciones. **Produce:** «`app/boot`» del contrato.

1. **Los stubs:** `formatWait`, `readAccessToken`, `createTokenStage`, `SESSION_LOADING_MARKUP` (`''`), `sessionFailureMarkup`, `createSessionView` y `createSessionGate`, con los tipos del contrato. Las funciones lanzan `not implemented`.
2. **`format-wait.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { formatWait } from './format-wait';

   describe('formatWait', () => {
     it.each([
       [0, '1 segundo'],
       [1, '1 segundo'],
       [59, '59 segundos'],
       [60, '1 minuto'],
       [61, '2 minutos'],
       [120, '2 minutos'],
       [3599, '1 hora'],
       [3660, '1 hora y 1 minuto'],
       [30000, '8 horas y 20 minutos'],
     ])('says %i seconds as «%s»', (seconds, text) => {
       expect(formatWait(seconds)).toBe(text);
     });
   });
   ```

3. **`access-tokens.spec.ts`.** El enlace de restablecimiento sale de `PasswordResetLinks.php`, con el email pasado por `rawurlencode`:

   ```ts
   import { describe, expect, it, vi } from 'vitest';
   import { createTokenStage, readAccessToken } from './access-tokens';

   const TOKEN = 'k3J8xQ2mN7pL4vR9tY6wZ1aB5cD0eF3gH8iJ2kL7mN4';

   describe('readAccessToken', () => {
     it.each([
       [`#invitacion=${TOKEN}`, { kind: 'invitation', token: TOKEN }],
       ['#invitacion', { kind: 'invitation', token: '' }],
       ['#restablecer=9f2c&email=ana%2B1%40x.com', { kind: 'reset', token: '9f2c', email: 'ana+1@x.com' }],
       ['#restablecer=9f2c', { kind: 'reset', token: '9f2c', email: null }],
       ['#restablecer=9f2c&email=%E0%A4%A', { kind: 'reset', token: '9f2c', email: null }],
     ])('reads %s', (hash, token) => {
       expect(readAccessToken(hash)).toEqual(token);
     });

     it.each(['', '#', '#laboratorio', '#invitacionx', '#recorrido'])('finds no token in «%s»', (hash) => {
       expect(readAccessToken(hash)).toBeNull();
     });
   });

   describe('the token stage', () => {
     function environment(hash: string) {
       const replaceState = vi.fn();
       return {
         replaceState,
         location: { pathname: '/', search: '?ejercicio=rust-02&paso=code', hash },
         history: { state: { kept: true }, replaceState },
       };
     }

     it('removes the fragment without touching the path or the query, and gives the token once', async () => {
       const env = environment('#invitacion=abc');
       const stage = createTokenStage(env);
       await stage.run();
       expect(env.replaceState).toHaveBeenCalledWith({ kept: true }, '', '/?ejercicio=rust-02&paso=code');
       expect(stage.hadToken).toBe(true);
       expect(stage.take()).toEqual({ kind: 'invitation', token: 'abc' });
       expect(stage.take()).toBeNull();
       expect(stage.hadToken).toBe(true);
     });

     it('leaves any other fragment alone', async () => {
       const env = environment('#laboratorio');
       const stage = createTokenStage(env);
       await stage.run();
       expect(env.replaceState).not.toHaveBeenCalled();
       expect(stage.hadToken).toBe(false);
       expect(stage.take()).toBeNull();
     });
   });
   ```

4. **`session-view.spec.ts`.** Necesita DOM, y la primera línea es la directiva de Vitest (ADR 0008), la única línea que empieza como un comentario:

   ```ts
   // @vitest-environment jsdom
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import { SESSION_LOADING_MARKUP, createSessionView, sessionFailureMarkup } from './session-view';

   describe('the session markup', () => {
     it('says it is connecting, as a status', () => {
       expect(SESSION_LOADING_MARKUP).toContain('Conectando con el taller…');
       expect(SESSION_LOADING_MARKUP).toContain('role="status"');
     });

     it('says it could not connect and offers a retry', () => {
       const markup = sessionFailureMarkup({ kind: 'unreachable' });
       expect(markup).toContain('No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.');
       expect(markup).toContain('role="alert"');
       expect(markup).toContain('>Reintentar</button>');
       expect(markup).not.toContain('style=');
     });

     it('shows the message of a rate limit, escaped, with the time left', () => {
       const markup = sessionFailureMarkup({
         kind: 'rate-limited',
         message: 'Demasiados <intentos>.',
         retryAfterSeconds: 120,
       });
       expect(markup).toContain('Demasiados &lt;intentos&gt;. Podés volver a intentar en 2 minutos.');
     });
   });

   describe('the session view', () => {
     beforeEach(() => {
       document.body.innerHTML = '<div id="session-status" tabindex="-1"></div>';
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
       document.body.innerHTML = '';
     });

     function retryButton(): HTMLButtonElement {
       const button = document.getElementById('session-retry');
       if (!(button instanceof HTMLButtonElement)) throw new Error('no «Reintentar»');
       return button;
     }

     it('draws the failure, focuses «Reintentar» and calls retry on a click', () => {
       const retry = vi.fn();
       createSessionView().showFailure({ kind: 'unreachable' }, retry);
       expect(document.activeElement).toBe(retryButton());
       retryButton().click();
       expect(retry).toHaveBeenCalledOnce();
     });

     it('keeps «Reintentar» disabled until Retry-After passes', () => {
       createSessionView().showFailure(
         { kind: 'rate-limited', message: 'Demasiados intentos.', retryAfterSeconds: 2 },
         vi.fn(),
       );
       expect(retryButton().disabled).toBe(true);
       vi.advanceTimersByTime(1_999);
       expect(retryButton().disabled).toBe(true);
       vi.advanceTimersByTime(1);
       expect(retryButton().disabled).toBe(false);
     });

     it('leaves no status or alert behind when it clears', () => {
       const view = createSessionView();
       view.showLoading();
       view.clear();
       expect(document.getElementById('session-status')?.innerHTML).toBe('');
     });

     it('does nothing without its element', () => {
       document.body.innerHTML = '';
       expect(() => createSessionView().showFailure({ kind: 'unreachable' }, vi.fn())).not.toThrow();
     });
   });
   ```

5. **`session-gate.spec.ts`,** con el reloj simulado. Fija el Review Focus 3 y SC-003:

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import type { PublishedUser, SessionOutcome, SessionSnapshot } from '../../entities/session';
   import type { AccessToken, RequestSignIn } from '../../features/sign-in';
   import { createSessionGate, type SessionGateOptions } from './session-gate';
   import type { SessionView } from './session-view';

   const ANA: PublishedUser = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
   const INVITATION: AccessToken = { kind: 'invitation', token: 'k3J8' };

   function snapshotOf(user: PublishedUser | null): SessionSnapshot {
     return { user, features: { passwordReset: false, registration: false }, contentVersion: 'v1' };
   }

   function sessionOf(user: PublishedUser | null): SessionOutcome {
     return { kind: 'session', snapshot: snapshotOf(user) };
   }

   function deferred<T>() {
     let resolve: (value: T) => void = () => {};
     const promise = new Promise<T>((onResolve) => {
       resolve = onResolve;
     });
     return { promise, resolve };
   }

   function setup(
     outcomes: readonly (SessionOutcome | Promise<SessionOutcome>)[],
     overrides: Partial<SessionGateOptions> = {},
   ) {
     let index = 0;
     const fetchSession = vi.fn(async () => {
       const next = outcomes[Math.min(index, outcomes.length - 1)];
       index += 1;
       if (next === undefined) throw new Error('no outcome');
       return next;
     });
     const signIn = deferred<PublishedUser>();
     const view = {
       showLoading: vi.fn<SessionView['showLoading']>(),
       showFailure: vi.fn<SessionView['showFailure']>(),
       clear: vi.fn<SessionView['clear']>(),
     };
     const options: SessionGateOptions = {
       fetchSession,
       storeSession: vi.fn(),
       takeAccessToken: vi.fn(() => null),
       requestSignIn: vi.fn<RequestSignIn>(() => signIn.promise),
       onReady: vi.fn(),
       view,
       timeoutMs: 20_000,
       loadingDelayMs: 400,
       ...overrides,
     };
     let resolved = false;
     const finished = createSessionGate(options)
       .run()
       .then(() => {
         resolved = true;
       });
     return { options, view, fetchSession, signIn, finished, isResolved: () => resolved };
   }

   const flush = () => vi.advanceTimersByTimeAsync(0);

   describe('the session stage', () => {
     beforeEach(() => {
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
     });

     it('asks for the session once and resolves when the account is ready', async () => {
       const { options, fetchSession, finished } = setup([sessionOf(ANA)]);
       await finished;
       expect(fetchSession).toHaveBeenCalledOnce();
       expect(options.storeSession).toHaveBeenCalledWith(snapshotOf(ANA));
       expect(options.onReady).toHaveBeenCalledOnce();
       expect(options.requestSignIn).not.toHaveBeenCalled();
     });

     it('leaves no timer acting after a fast answer', async () => {
       const { view, finished } = setup([sessionOf(ANA)]);
       await finished;
       await vi.advanceTimersByTimeAsync(30_000);
       expect(view.showLoading).not.toHaveBeenCalled();
       expect(view.showFailure).not.toHaveBeenCalled();
     });

     it('says it is connecting after 400 ms', async () => {
       const pending = deferred<SessionOutcome>();
       const { view } = setup([pending.promise]);
       await vi.advanceTimersByTimeAsync(399);
       expect(view.showLoading).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(view.showLoading).toHaveBeenCalledOnce();
     });

     it('without an account asks for the sign-in as a page and then asks for the session once more', async () => {
       const { options, fetchSession, signIn, finished, isResolved } = setup([sessionOf(null), sessionOf(ANA)]);
       await flush();
       expect(options.requestSignIn).toHaveBeenCalledWith({ presentation: 'page', reason: 'boot', token: null });
       expect(isResolved()).toBe(false);
       signIn.resolve(ANA);
       await finished;
       expect(fetchSession).toHaveBeenCalledTimes(2);
       expect(options.onReady).toHaveBeenCalledOnce();
     });

     it('fires no cap while a sign-in lasts longer than the cap', async () => {
       const { view, fetchSession, signIn, finished } = setup([sessionOf(null), sessionOf(ANA)]);
       await flush();
       await vi.advanceTimersByTimeAsync(120_000);
       expect(view.showFailure).not.toHaveBeenCalled();
       expect(view.showLoading).not.toHaveBeenCalled();
       expect(fetchSession).toHaveBeenCalledOnce();
       signIn.resolve(ANA);
       await finished;
       expect(view.showFailure).not.toHaveBeenCalled();
     });

     it('with a token asks for the access even with a live session, and only once', async () => {
       const takeAccessToken = vi.fn<() => AccessToken | null>().mockReturnValueOnce(INVITATION).mockReturnValue(null);
       const { options, signIn, finished } = setup([sessionOf(ANA), sessionOf(ANA)], { takeAccessToken });
       await flush();
       expect(options.requestSignIn).toHaveBeenCalledWith({ presentation: 'page', reason: 'boot', token: INVITATION });
       signIn.resolve(ANA);
       await finished;
       expect(options.requestSignIn).toHaveBeenCalledOnce();
     });

     it('asks for the access when the account has not accepted the current notice', async () => {
       const { options, signIn, finished } = setup([sessionOf({ ...ANA, privacyAccepted: false }), sessionOf(ANA)]);
       await flush();
       expect(options.requestSignIn).toHaveBeenCalledOnce();
       signIn.resolve(ANA);
       await finished;
       expect(options.onReady).toHaveBeenCalledOnce();
     });

     it('shows the failure when the session does not answer, and retries on demand', async () => {
       const { view, fetchSession, finished } = setup([{ kind: 'unreachable' }, sessionOf(ANA)]);
       await flush();
       expect(view.showFailure).toHaveBeenCalledWith({ kind: 'unreachable' }, expect.any(Function));
       const retry = view.showFailure.mock.calls[0]?.[1];
       retry?.();
       expect(view.showLoading).toHaveBeenCalledOnce();
       await finished;
       expect(fetchSession).toHaveBeenCalledTimes(2);
     });

     it('aborts the request and fails after the 20 s cap', async () => {
       const fetchSession = vi.fn(
         ({ signal }: { readonly signal: AbortSignal }) =>
           new Promise<SessionOutcome>((resolve) => {
             signal.addEventListener('abort', () => resolve({ kind: 'unreachable' }));
           }),
       );
       const { view } = setup([], { fetchSession });
       await vi.advanceTimersByTimeAsync(19_999);
       expect(view.showFailure).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(view.showFailure).toHaveBeenCalledWith({ kind: 'unreachable' }, expect.any(Function));
     });

     it('passes a rate limit to the view', async () => {
       const limited: SessionOutcome = {
         kind: 'rate-limited',
         message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
         retryAfterSeconds: 30,
       };
       const { view } = setup([limited]);
       await flush();
       expect(view.showFailure).toHaveBeenCalledWith(limited, expect.any(Function));
     });

     it('makes a single request for two retries at once', async () => {
       const { view, fetchSession } = setup([{ kind: 'unreachable' }, sessionOf(ANA)]);
       await flush();
       const retry = view.showFailure.mock.calls[0]?.[1];
       retry?.();
       retry?.();
       await flush();
       expect(fetchSession).toHaveBeenCalledTimes(2);
     });
   });
   ```

6. **Correr** `npm run test:unit -- frontend/src/app/boot frontend/src/shared/lib/format-wait.spec.ts`: las specs nuevas fallan con `not implemented`, y las de A2 siguen en verde.
7. **Commit:** `test(front): specs de las etapas de los tokens y de sesión, en rojo`.

### Tarea 1.8 · Las etapas (T011, B)

**Archivos:** `frontend/src/shared/lib/format-wait.ts` y, en `frontend/src/app/boot/`, `access-tokens.ts`, `session-view.ts` y `session-gate.ts`.

1. **`format-wait.ts`:**

   ```ts
   function counted(count: number, singular: string, plural: string): string {
     return `${count} ${count === 1 ? singular : plural}`;
   }

   export function formatWait(seconds: number): string {
     const total = Math.max(1, Math.ceil(seconds));
     if (total < 60) return counted(total, 'segundo', 'segundos');
     const minutes = Math.ceil(total / 60);
     if (minutes < 60) return counted(minutes, 'minuto', 'minutos');
     const hours = counted(Math.floor(minutes / 60), 'hora', 'horas');
     const rest = minutes % 60;
     return rest === 0 ? hours : `${hours} y ${counted(rest, 'minuto', 'minutos')}`;
   }
   ```

2. **`access-tokens.ts`:**

   ```ts
   import type { AccessToken } from '../../features/sign-in';
   import type { BootStage } from './run-boot';

   export interface LocationLike {
     readonly pathname: string;
     readonly search: string;
     readonly hash: string;
   }

   export interface HistoryLike {
     readonly state: unknown;
     replaceState(data: unknown, unused: string, url: string): void;
   }

   export interface TokenStage extends BootStage {
     take(): AccessToken | null;
     readonly hadToken: boolean;
   }

   const INVITATION = /^#invitacion(?:=|$)/;
   const RESET = /^#restablecer(?:[=&]|$)/;
   const INVITATION_PREFIX = '#invitacion=';

   function decodeEmail(value: string | undefined): string | null {
     if (value === undefined || value === '') return null;
     try {
       return decodeURIComponent(value);
     } catch {
       return null;
     }
   }

   function fragmentParameters(hash: string): Map<string, string> {
     const parameters = new Map<string, string>();
     for (const part of hash.slice(1).split('&')) {
       const separator = part.indexOf('=');
       if (separator < 0) parameters.set(part, '');
       else parameters.set(part.slice(0, separator), part.slice(separator + 1));
     }
     return parameters;
   }

   export function readAccessToken(hash: string): AccessToken | null {
     if (INVITATION.test(hash)) return { kind: 'invitation', token: hash.slice(INVITATION_PREFIX.length) };
     if (!RESET.test(hash)) return null;
     const parameters = fragmentParameters(hash);
     return {
       kind: 'reset',
       token: parameters.get('restablecer') ?? '',
       email: decodeEmail(parameters.get('email')),
     };
   }

   export function createTokenStage(environment: {
     readonly location: LocationLike;
     readonly history: HistoryLike;
   }): TokenStage {
     let token: AccessToken | null = null;
     let hadToken = false;
     return {
       name: 'tokenStage',
       get hadToken() {
         return hadToken;
       },
       async run() {
         const { location, history } = environment;
         const found = readAccessToken(location.hash);
         if (found === null) return;
         token = found;
         hadToken = true;
         history.replaceState(history.state, '', `${location.pathname}${location.search}`);
       },
       take() {
         const taken = token;
         token = null;
         return taken;
       },
     };
   }
   ```

3. **`session-view.ts`:**

   ```ts
   import { escapeHtml } from '../../shared/lib/escape-html';
   import { formatWait } from '../../shared/lib/format-wait';

   export type SessionFailure =
     | { readonly kind: 'unreachable' }
     | { readonly kind: 'rate-limited'; readonly message: string; readonly retryAfterSeconds: number | null };

   export interface SessionView {
     showLoading(): void;
     showFailure(failure: SessionFailure, retry: () => void): void;
     clear(): void;
   }

   const UNREACHABLE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';
   const RETRY_ID = 'session-retry';

   export const SESSION_LOADING_MARKUP =
     '<section class="empty-state" data-session-gate="loading"><p role="status">Conectando con el taller…</p></section>';

   function failureText(failure: SessionFailure): string {
     if (failure.kind === 'unreachable') return UNREACHABLE;
     const message = escapeHtml(failure.message);
     if (failure.retryAfterSeconds === null) return message;
     return `${message} Podés volver a intentar en ${formatWait(failure.retryAfterSeconds)}.`;
   }

   export function sessionFailureMarkup(failure: SessionFailure): string {
     return (
       `<section class="empty-state" data-session-gate="failed" data-failure="${failure.kind}">` +
       `<p role="alert">${failureText(failure)}</p>` +
       `<button class="button" id="${RETRY_ID}" type="button">Reintentar</button>` +
       '</section>'
     );
   }

   function waitOf(failure: SessionFailure): number {
     return failure.kind === 'rate-limited' ? (failure.retryAfterSeconds ?? 0) : 0;
   }

   export function createSessionView(): SessionView {
     let enableTimer: ReturnType<typeof setTimeout> | undefined;
     const render = (markup: string): HTMLElement | null => {
       clearTimeout(enableTimer);
       const host = document.getElementById('session-status');
       if (host) host.innerHTML = markup;
       return host;
     };
     return {
       showLoading() {
         const hadFocus = document.activeElement?.id === RETRY_ID;
         const host = render(SESSION_LOADING_MARKUP);
         if (hadFocus) host?.focus();
       },
       showFailure(failure, retry) {
         if (render(sessionFailureMarkup(failure)) === null) return;
         const button = document.getElementById(RETRY_ID);
         if (!(button instanceof HTMLButtonElement)) return;
         button.addEventListener('click', retry);
         const wait = waitOf(failure);
         if (wait === 0) {
           button.focus();
           return;
         }
         button.disabled = true;
         enableTimer = setTimeout(() => {
           button.disabled = false;
           button.focus();
         }, wait * 1000);
       },
       clear() {
         render('');
       },
     };
   }
   ```

4. **`session-gate.ts`.** El comentario de `requestOnce` es la referencia puntual que también lleva `content-gate.ts`:

   ```ts
   import type { SessionOutcome, SessionSnapshot } from '../../entities/session';
   import type { AccessToken, RequestSignIn } from '../../features/sign-in';
   import type { BootStage } from './run-boot';
   import type { SessionView } from './session-view';

   export interface SessionGateOptions {
     readonly fetchSession: (request: { readonly signal: AbortSignal }) => Promise<SessionOutcome>;
     readonly storeSession: (snapshot: SessionSnapshot) => void;
     readonly takeAccessToken: () => AccessToken | null;
     readonly requestSignIn: RequestSignIn;
     readonly onReady: () => void;
     readonly view: SessionView;
     readonly timeoutMs: number;
     readonly loadingDelayMs: number;
   }

   function needsAccess(snapshot: SessionSnapshot, token: AccessToken | null): boolean {
     if (token !== null) return true;
     return snapshot.user === null || !snapshot.user.privacyAccepted;
   }

   // One request. Its timers do nothing once it has settled: the harness of boot-check runs every
   // queued timer on flush() and never cancels one.
   async function requestOnce(
     options: SessionGateOptions,
     showLoadingAfterDelay: boolean,
   ): Promise<SessionOutcome> {
     const controller = new AbortController();
     let settled = false;
     const loadingTimer = showLoadingAfterDelay
       ? setTimeout(() => {
           if (!settled) options.view.showLoading();
         }, options.loadingDelayMs)
       : undefined;
     const capTimer = setTimeout(() => {
       if (!settled) controller.abort();
     }, options.timeoutMs);
     try {
       return await options.fetchSession({ signal: controller.signal });
     } finally {
       settled = true;
       clearTimeout(loadingTimer);
       clearTimeout(capTimer);
     }
   }

   export function createSessionGate(options: SessionGateOptions): BootStage {
     return {
       name: 'sessionStage',
       run: () =>
         new Promise<void>((resolve) => {
           let token = options.takeAccessToken();
           let inFlight = false;

           async function attempt(showLoadingAfterDelay: boolean): Promise<void> {
             if (inFlight) return;
             inFlight = true;
             const outcome = await requestOnce(options, showLoadingAfterDelay);
             inFlight = false;
             if (outcome.kind !== 'session') {
               options.view.showFailure(outcome, retry);
               return;
             }
             options.view.clear();
             options.storeSession(outcome.snapshot);
             if (needsAccess(outcome.snapshot, token)) {
               const pendingToken = token;
               token = null;
               await options.requestSignIn({ presentation: 'page', reason: 'boot', token: pendingToken });
               void attempt(true);
               return;
             }
             options.onReady();
             resolve();
           }

           function retry(): void {
             if (inFlight) return;
             options.view.showLoading();
             void attempt(false);
           }

           void attempt(true);
         }),
     };
   }
   ```

5. **Correr** `npm run test:unit -- frontend/src/app/boot frontend/src/shared/lib`, en verde, y después `npm run typecheck` y `npm run lint`.
6. **Commit:** `feat(front): las etapas de los tokens y de sesión`.

### Tarea 1.9 · El servidor de contenido responde la sesión (T013, Q)

**Archivos:** `qa/lib/content-server.ts` y `qa/boot-check.ts` (un escenario más; ninguno cambia).

**Por qué así** (research.md, R11): `boot-check` y `dist-content-check` exigen que `server.requests` sea exactamente la lista de pedidos de contenido. La sesión se anota aparte, y `order` guarda los dos en el orden en que llegan.

1. **El escenario nuevo de `qa/boot-check.ts`,** en rojo. Se agrega justo después de «the happy path never shows the loading state and asks for the content once»:

   ```ts
   await test('the session is asked once, before the content', async () => {
     const server = createContentServer();
     const harness = await boot({}, server);
     assert.deepEqual(harness.errors, []);
     assert.deepEqual(server.order, ['/api/session', CONTENT_URL]);
   });
   ```

   Falla hasta que T012 cablea la etapa: antes, `order` sólo tiene el contenido.
2. **`qa/lib/content-server.ts`.** Suma `sessionRequests` y `order` a la interfaz y responde la sesión con un `Response` real de Node, que trae `text()` y `headers`, como los usa el cliente:

   ```ts
   export interface ContentServer {
     fetch: (url: string, init?: { signal?: AbortSignal }) => Promise<FakeResponse | Response>;
     requests: string[];
     sessionRequests: string[];
     order: string[];
   }

   const SESSION_PATH = '/api/session';

   function sessionResponse(): Response {
     const body = {
       user: { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true },
       features: { passwordReset: false, registration: false },
       contentVersion: contentVersion(),
       catalogs: [],
     };
     return new Response(JSON.stringify(body), {
       status: 200,
       headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
     });
   }
   ```

   En `createContentServer`, las dos listas nuevas se declaran junto a `requests`, y el comienzo de `fetch` pasa a ser este. El resto de la función no cambia:

   ```ts
   async fetch(requested, init) {
     order.push(requested);
     if (requested === SESSION_PATH) {
       sessionRequests.push(requested);
       return sessionResponse();
     }
     requests.push(requested);
     if (requested !== url) return respond(404, 'not found');
   ```

   El objeto que devuelve `createContentServer` suma `sessionRequests` y `order`.
3. **Correr** `node qa/boot-check.ts`: pasan todos menos el nuevo, que espera T012. Correr también `node qa/dist-content-check.ts` (después de `npm run build`): en verde, porque `requests` no cambió.
4. **Commit:** `test(qa): el servidor de contenido responde la sesión, aparte, y boot-check pide la sesión antes`.

### Tarea 1.10 · El doble de la API y los E2E de la etapa, en rojo (T014, E)

**Archivos:** `qa/e2e/lib/api-contract.ts`, `qa/e2e/fixtures/api-double.ts`, `qa/e2e/fixtures/index.ts`, `qa/e2e/pages/access.ts` y `qa/e2e/specs/session-stage.spec.ts`.

**Produce:** «`qa/e2e`: el doble de la API» del contrato.

1. **`qa/e2e/lib/api-contract.ts`.** Los mensajes se copian de `backend/api/lang/es/api.php`, `passwords.php`, `password-policy.php` y `validation.php`, y del `messages()` de `PrivacyRequest`:

   ```ts
   export interface PublishedAccount {
     id: number;
     name: string;
     email: string;
     role: 'student' | 'admin';
     privacyAccepted: boolean;
   }

   export const STUDENT: PublishedAccount = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };

   export const ADMIN: PublishedAccount = {
     id: 1,
     name: 'Olga Ruiz',
     email: 'olga@x.com',
     role: 'admin',
     privacyAccepted: true,
   };

   export const INVITATION = {
     token: 'k3J8xQ2mN7pL4vR9tY6wZ1aB5cD0eF3gH8iJ2kL7mN4',
     email: 'bruno@x.com',
     role: 'student' as const,
     expiresAt: '2026-10-12T15:30:00.000Z',
   };

   export const RESET_LINK = {
     token: '9f2c4e6a8b0d1f3e5a7c9b1d3f5e7a9c2b4d6f8a0c1e3b5d7f9a1c3e5b7d9f0a',
     email: 'ana@x.com',
   };

   export const MESSAGES = {
     auth_failed: 'El email o la contraseña no son correctos.',
     account_disabled: 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
     invitation_not_found: 'La invitación no existe o ya se usó.',
     invitation_expired: 'La invitación venció. Pedí una nueva a quien te invitó.',
     email_taken: 'Ya hay una cuenta con ese email.',
     account_mismatch: 'La sesión cambió de cuenta: recargá la página.',
     csrf_token_mismatch: 'La página venció: recargala e intentá de nuevo.',
     validation_failed: 'Hay datos que corregir.',
     too_many_requests: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
     unauthenticated: 'Iniciá sesión para continuar.',
     not_found: 'No existe lo que pedís.',
     server_error: 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.',
   } as const;

   export type ApiCode = keyof typeof MESSAGES;

   export const FIELD_MESSAGES = {
     resetToken: 'El enlace para restablecer la contraseña no es válido o venció.',
     privacyChanged: 'El aviso de privacidad cambió: leelo de nuevo antes de aceptarlo.',
     tooShort: 'Tiene que tener al menos 15 caracteres.',
     blocked: 'Es una contraseña muy usada: elegí otra.',
     containsName: 'No puede contener tu nombre.',
   } as const;

   export function errorBody(code: ApiCode, errors?: Record<string, string[]>) {
     return errors === undefined
       ? { message: MESSAGES[code], code }
       : { message: MESSAGES[code], code, errors };
   }
   ```

2. **`qa/e2e/fixtures/api-double.ts`** (research.md, R10):

   ```ts
   import { readFileSync } from 'node:fs';
   import { resolve } from 'node:path';
   import { expect, type BrowserContext, type Page, type Request, type Route } from '@playwright/test';
   import { INVITATION, STUDENT, errorBody, type PublishedAccount } from '../lib/api-contract';

   export type ApiRoute = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /api/${string}`;

   export interface ApiCall {
     method: string;
     path: string;
     xsrf: string | undefined;
     user: string | undefined;
     body: unknown;
   }

   export interface ApiReply {
     status: number;
     json?: unknown;
     body?: string;
     contentType?: string;
     headers?: Record<string, string>;
   }

   export type ApiHandler = (call: ApiCall) => ApiReply | Promise<ApiReply>;

   const MODIFYING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
   const FEATURES = { passwordReset: false, registration: false };
   const META = resolve(import.meta.dirname, '../../../build/curriculum.meta.json');
   const CONTENT_VERSION = (JSON.parse(readFileSync(META, 'utf8')) as { documentHash: string }).documentHash.slice(0, 32);

   async function callOf(request: Request): Promise<ApiCall> {
     const headers = await request.allHeaders();
     const text = request.postData();
     return {
       method: request.method(),
       path: new URL(request.url()).pathname,
       xsrf: headers['x-xsrf-token'],
       user: headers['x-taller-user'],
       body: text ? (JSON.parse(text) as unknown) : undefined,
     };
   }

   function nameOf(body: unknown): string {
     const name = (body as { name?: unknown } | undefined)?.name;
     return typeof name === 'string' ? name : '';
   }

   export class ApiDouble {
     account: PublishedAccount | null;
     signInAccount: PublishedAccount = STUDENT;
     readonly calls: ApiCall[] = [];
     private readonly unhandled: string[] = [];
     private readonly handlers = new Map<ApiRoute, ApiHandler>();
     private readonly queued = new Map<ApiRoute, ApiReply[]>();
     private xsrfGeneration = 1;

     private constructor(
       private readonly context: BrowserContext,
       private readonly origin: string,
       account: PublishedAccount | null,
     ) {
       this.account = account;
       this.installDefaults();
     }

     static async install(
       page: Page,
       context: BrowserContext,
       baseURL: string,
       account: PublishedAccount | null,
     ): Promise<ApiDouble> {
       const api = new ApiDouble(context, new URL(baseURL).origin, account);
       await api.setXsrfCookie();
       await page.route('**/api/**', (route) => api.handle(route));
       return api;
     }

     xsrfValue(): string {
       return `e2e-xsrf-${this.xsrfGeneration}=`;
     }

     on(route: ApiRoute, handler: ApiHandler): void {
       this.handlers.set(route, handler);
     }

     reply(route: ApiRoute, ...replies: ApiReply[]): void {
       this.queued.set(route, [...replies]);
     }

     callsTo(route: ApiRoute): ApiCall[] {
       const [method, path] = route.split(' ');
       return this.calls.filter((call) => call.method === method && call.path === path);
     }

     assertAllHandled(): void {
       expect(this.unhandled, 'Pedidos a /api sin respuesta en el doble de la API').toEqual([]);
     }

     private async setXsrfCookie(): Promise<void> {
       await this.context.addCookies([
         { name: 'XSRF-TOKEN', value: encodeURIComponent(this.xsrfValue()), url: this.origin },
       ]);
     }

     private async rotateXsrf(): Promise<void> {
       this.xsrfGeneration += 1;
       await this.setXsrfCookie();
     }

     private async handle(route: Route): Promise<void> {
       const call = await callOf(route.request());
       this.calls.push(call);
       const reply = await this.replyTo(call);
       await route.fulfill({
         status: reply.status,
         headers: reply.headers,
         contentType: reply.contentType ?? (reply.json === undefined ? undefined : 'application/json'),
         body: reply.json === undefined ? reply.body : JSON.stringify(reply.json),
       });
     }

     private async replyTo(call: ApiCall): Promise<ApiReply> {
       const route = `${call.method} ${call.path}` as ApiRoute;
       if (MODIFYING.has(call.method) && call.xsrf !== this.xsrfValue()) {
         return { status: 419, json: errorBody('csrf_token_mismatch') };
       }
       const next = this.queued.get(route)?.shift();
       if (next !== undefined) return next;
       const handler = this.handlers.get(route);
       if (handler !== undefined) return handler(call);
       this.unhandled.push(route);
       return { status: 404, json: errorBody('not_found') };
     }

     private installDefaults(): void {
       this.on('GET /api/session', () => ({
         status: 200,
         headers: { 'Cache-Control': 'no-store' },
         json: { user: this.account, features: FEATURES, contentVersion: CONTENT_VERSION, catalogs: [] },
       }));
       this.on('POST /api/auth/login', async () => {
         this.account = this.signInAccount;
         await this.rotateXsrf();
         return { status: 200, json: { data: this.signInAccount } };
       });
       this.on('POST /api/auth/logout', async () => {
         this.account = null;
         await this.rotateXsrf();
         return { status: 204 };
       });
       this.on('POST /api/auth/invitations/lookup', () => ({
         status: 200,
         json: { email: INVITATION.email, role: INVITATION.role, expiresAt: INVITATION.expiresAt },
       }));
       this.on('POST /api/auth/invitations/accept', async (call) => {
         const created: PublishedAccount = {
           id: 77,
           name: nameOf(call.body),
           email: INVITATION.email,
           role: 'student',
           privacyAccepted: true,
         };
         this.account = created;
         await this.rotateXsrf();
         return { status: 201, json: { data: created } };
       });
       this.on('POST /api/auth/reset-password', () => ({ status: 200, json: {} }));
       this.on('POST /api/me/privacy', () => {
         if (this.account !== null) this.account = { ...this.account, privacyAccepted: true };
         return { status: 204 };
       });
     }
   }
   ```

3. **`qa/e2e/fixtures/index.ts`.** Suma la opción `sessionAccount`, el fixture automático `api` y los Page Objects `access` y `account`. `account` llega en U2 (T024): en U1 se suma sólo `access`.

   ```ts
   import { test as base, expect } from '@playwright/test';
   import { STUDENT, type PublishedAccount } from '../lib/api-contract';
   import { AccessPage } from '../pages/access';
   import { AtlasPage } from '../pages/atlas';
   import { CampaignPage } from '../pages/campaign';
   import { LabPage } from '../pages/lab';
   import { ShellPage } from '../pages/shell';
   import { SystemsPage } from '../pages/systems';
   import { ApiDouble } from './api-double';
   import { CompilerDouble } from './compiler-double';
   import { PageIssues } from './page-issues';
   import { StorageControl } from './storage-control';
   import { StrictNetwork } from './strict-network';

   interface Options {
     sessionAccount: PublishedAccount | null;
   }

   interface Fixtures {
     pageIssues: PageIssues;
     strictNetwork: StrictNetwork;
     api: ApiDouble;
     compiler: CompilerDouble;
     storage: StorageControl;
     shell: ShellPage;
     lab: LabPage;
     campaign: CampaignPage;
     systems: SystemsPage;
     atlas: AtlasPage;
     access: AccessPage;
   }

   export const test = base.extend<Fixtures & Options>({
     sessionAccount: [STUDENT, { option: true }],
     pageIssues: [
       async ({ page }, use) => {
         const issues = new PageIssues(page);
         await use(issues);
         issues.assertClean();
       },
       { auto: true },
     ],
     strictNetwork: [
       async ({ context, baseURL }, use) => {
         const network = await StrictNetwork.install(context, baseURL!);
         await use(network);
         network.assertNothingBlocked();
       },
       { auto: true },
     ],
     api: [
       async ({ page, context, baseURL, sessionAccount }, use) => {
         const api = await ApiDouble.install(page, context, baseURL!, sessionAccount);
         await use(api);
         api.assertAllHandled();
       },
       { auto: true },
     ],
     compiler: async ({ page }, use) => use(new CompilerDouble(page)),
     storage: async ({ context, page }, use) => use(new StorageControl(context, page)),
     shell: async ({ page }, use) => use(new ShellPage(page)),
     lab: async ({ page }, use) => use(new LabPage(page)),
     campaign: async ({ page }, use) => use(new CampaignPage(page)),
     systems: async ({ page }, use) => use(new SystemsPage(page)),
     atlas: async ({ page }, use) => use(new AtlasPage(page)),
     access: async ({ page }, use) => use(new AccessPage(page)),
   });

   export { expect };
   ```

4. **`qa/e2e/pages/access.ts`.** U1 usa `heading` y `alert`; los demás métodos se usan desde U2 y se escriben ya, para no editar el Page Object en cada unidad:

   ```ts
   import type { Locator, Page } from '@playwright/test';

   export class AccessPage {
     constructor(readonly page: Page) {}

     heading(name: string): Locator {
       return this.page.getByRole('heading', { name, exact: true });
     }

     field(label: string): Locator {
       return this.page.getByLabel(label, { exact: true });
     }

     button(name: string): Locator {
       return this.page.getByRole('button', { name, exact: true });
     }

     alert(): Locator {
       return this.page.getByRole('alert');
     }

     async signIn(email: string, password: string): Promise<void> {
       await this.field('Email').fill(email);
       await this.field('Contraseña').fill(password);
       await this.button('Ingresar').click();
     }

     async createAccount(name: string, password: string): Promise<void> {
       await this.field('Tu nombre').fill(name);
       await this.field('Contraseña').fill(password);
       await this.field('Repetí la contraseña').fill(password);
       await this.page.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }).check();
       await this.button('Crear mi cuenta').click();
     }

     async chooseNewPassword(password: string): Promise<void> {
       await this.field('Contraseña nueva').fill(password);
       await this.field('Repetí la contraseña nueva').fill(password);
       await this.button('Cambiar la contraseña').click();
     }
   }
   ```

5. **`qa/e2e/specs/session-stage.spec.ts`.** Cubre SC-001 (la URL), SC-002 y SC-003, la historia 2 en sus escenarios 1 y 6, y la historia 5 en los escenarios 1 y 2:

   ```ts
   import type { Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { INVITATION, MESSAGES } from '../lib/api-contract';
   import { trackContentRequests } from '../lib/content-requests';
   import { urls } from '../lib/urls';

   const FAILED_RESOURCE = /Failed to load resource/;
   const UNREACHABLE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';

   function legacyEvaluated(page: Page): Promise<boolean> {
     return page.evaluate(() => 'TallerLab' in window);
   }

   function trackApiAndContent(page: Page): string[] {
     const seen: string[] = [];
     page.on('request', (request) => {
       const { pathname } = new URL(request.url());
       if (pathname === '/api/session' || pathname.startsWith('/content/')) seen.push(pathname);
     });
     return seen;
   }

   test.describe('every start', () => {
     test('asks for the session once, before the content', async ({ shell, lab, page }) => {
       const seen = trackApiAndContent(page);
       await shell.goto(urls.exercise('rust-02', 'code'));
       await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
       expect(seen.filter((path) => path === '/api/session')).toHaveLength(1);
       expect(seen[0]).toBe('/api/session');
     });
   });

   test.describe('without an account', () => {
     test.use({ sessionAccount: null });

     test('shows the access with the shell inert, evaluates no legacy source and asks for no content', async ({
       access,
       page,
     }) => {
       const contentRequests = trackContentRequests(page);
       await page.goto(urls.exercise('rust-02', 'code'));
       await expect(access.heading('Ingresá al taller')).toBeVisible();
       await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
       expect(contentRequests).toHaveLength(0);
       expect(await legacyEvaluated(page)).toBe(false);
     });
   });

   test.describe('a link with a token', () => {
     test('leaves the address bar and the history before app.js runs', async ({ context, page }) => {
       await context.addInitScript(() => {
         const pushes: string[] = [];
         (window as unknown as { __e2ePushes: string[] }).__e2ePushes = pushes;
         const pushState = history.pushState.bind(history);
         history.pushState = (data, unused, url) => {
           pushes.push(String(url));
           pushState(data, unused, url);
         };
       });
       await page.goto(`/?ejercicio=rust-02&paso=code#invitacion=${INVITATION.token}`);
       await expect(page).toHaveURL(/\/\?ejercicio=rust-02&paso=code$/);
       expect(await page.evaluate(() => (window as unknown as { __e2ePushes: string[] }).__e2ePushes)).toEqual([]);
       expect(await legacyEvaluated(page)).toBe(false);
     });

     test('of a reset leaves the address bar too', async ({ page }) => {
       await page.goto('/#restablecer=9f2c&email=ana%40x.com');
       await expect(page).toHaveURL(/\/$/);
       expect(await legacyEvaluated(page)).toBe(false);
     });
   });

   test.describe('the session does not answer', () => {
     test('shows the error, evaluates no legacy source and retries without reloading', async ({
       api,
       lab,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 502 of the first session request');
       api.reply('GET /api/session', {
         status: 502,
         body: '<html>Bad Gateway</html>',
         contentType: 'text/html',
       });
       await page.goto(urls.exercise('rust-02', 'code'));
       await expect(page.getByRole('alert')).toHaveText(UNREACHABLE);
       expect(await legacyEvaluated(page)).toBe(false);
       const retry = page.getByRole('button', { name: 'Reintentar' });
       await expect(retry).toBeFocused();
       await retry.click();
       await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
       expect(api.callsTo('GET /api/session')).toHaveLength(2);
     });

     test('with a 429 waits for Retry-After before letting retry', async ({ api, pageIssues, page }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 429 of the first session request');
       await page.clock.install();
       api.reply('GET /api/session', {
         status: 429,
         headers: { 'Retry-After': '2' },
         json: { message: MESSAGES.too_many_requests, code: 'too_many_requests' },
       });
       await page.goto(urls.view('recorrido'));
       await expect(page.getByRole('alert')).toHaveText(
         `${MESSAGES.too_many_requests} Podés volver a intentar en 2 segundos.`,
       );
       const retry = page.getByRole('button', { name: 'Reintentar' });
       await expect(retry).toBeDisabled();
       await page.clock.fastForward(2_000);
       await expect(retry).toBeEnabled();
     });
   });
   ```

6. **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e`.
   - **Los 123 de la red,** en verde: el doble ya responde la sesión, aunque todavía nadie la pida.
   - **`session-stage.spec.ts`,** en rojo, por la razón esperada: sin la etapa, no hay acceso ni error, y el token sigue en la URL.
   - **Antes de cablear,** `assertAllHandled` no ve ningún pedido sin manejador.
7. **Commit:** `test(qa): el doble de la API de los E2E y los E2E de la etapa de sesión, en rojo`.

### Tarea 1.11 · El cableado del arranque y de la raíz de la cuenta (T012, K, desde S1)

**Archivos:** `frontend/src/index.html`, `frontend/styles.css`, `frontend/src/app/main.tsx`, `frontend/src/app/boot/account-stages.ts`, `frontend/src/app/account/` (`api-client.ts`, `reload-document.ts`, `shell-inertness.ts`, `mount-account-root.tsx` y `AccountRoot.tsx`) y `qa/load-order-check.ts`.

**Consume:** todo lo de T005, T007, T009 y T011. **Produce:** el arranque de F11a, que pone en verde la spec de T014 y el escenario de T013.

1. **`frontend/src/index.html`,** tres cambios.
   - **La barra superior.** La línea de `<header class="topbar">` pasa a ser:

     ```html
           <header class="topbar"><span class="topbar-label">APRENDER ES CONSTRUIR</span><div class="topbar-actions"><div class="language-switch" role="group" aria-label="Lenguaje del recorrido"><button data-language="rust" aria-pressed="true">Rust <span class="recommended-dot" aria-hidden="true"></span></button><button data-language="go" aria-pressed="false">Go</button></div><div class="account-entry" id="account-entry"></div></div></header>
           <div class="session-status" id="session-status" tabindex="-1"></div>
     ```

   - **La raíz.** Entre el cierre de `.app-shell` y `<dialog id="lesson-dialog"…>` se agrega `<div id="account-root"></div>`.
2. **`frontend/styles.css`.** Al final del archivo, las reglas del elemento nuevo del shell, con los mismos rellenos que `main` en sus tres anchos:

   ```css
   .session-status {
     max-width: 1330px;
     margin: auto;
     padding: 44px 52px 0;
   }
   .session-status:empty {
     display: none;
   }
   @media (max-width: 1150px) {
     .session-status {
       padding: 34px 32px 0;
     }
   }
   @media (max-width: 590px) {
     .session-status {
       padding: 29px 20px 0;
     }
   }
   ```

3. **`frontend/src/app/account/`.**
   - **`api-client.ts`:**

     ```ts
     import { createApiClient } from '../../shared/api/http';

     export const apiClient = createApiClient({
       fetch: (input, init) => window.fetch(input, init),
       readCookies: () => document.cookie,
     });
     ```

   - **`reload-document.ts`:**

     ```ts
     export function reloadDocument(): void {
       window.location.reload();
     }
     ```

   - **`shell-inertness.ts`:**

     ```ts
     export function setShellInert(inert: boolean): void {
       for (const element of document.querySelectorAll<HTMLElement>('.app-shell, .skip-link')) {
         element.inert = inert;
       }
     }
     ```

   - **`AccountRoot.tsx`.** U2 le suma `AccountMenu`, que usa `entryHost`:

     ```tsx
     import { AccessGate, accessRequests } from '../../features/sign-in';
     import { ApiClientContext, type ApiClient } from '../../shared/api/http';
     import { reloadDocument } from './reload-document';
     import { setShellInert } from './shell-inertness';

     interface AccountRootProps {
       readonly client: ApiClient;
       readonly entryHost: HTMLElement;
     }

     const AccountRoot = ({ client }: AccountRootProps) => (
       <ApiClientContext value={client}>
         <AccessGate requests={accessRequests} setShellInert={setShellInert} reloadDocument={reloadDocument} />
       </ApiClientContext>
     );

     export default AccountRoot;
     ```

   - **`mount-account-root.tsx`.** Sin los dos elementos no monta nada: es el caso del DOM falso de `boot-check` (research.md, R11):

     ```tsx
     import { createRoot } from 'react-dom/client';
     import AccountRoot from './AccountRoot';
     import { apiClient } from './api-client';

     let mounted = false;

     export function mountAccountRoot(): void {
       if (mounted) return;
       const host = document.getElementById('account-root');
       const entryHost = document.getElementById('account-entry');
       if (host === null || entryHost === null) return;
       mounted = true;
       const root = createRoot(host, {
         onUncaughtError(error) {
           console.error('No se pudo mostrar la cuenta.', error);
         },
       });
       root.render(<AccountRoot client={apiClient} entryHost={entryHost} />);
     }
     ```

4. **`frontend/src/app/boot/account-stages.ts`:**

   ```ts
   import { fetchSession, sessionStore } from '../../entities/session';
   import { requestSignIn } from '../../features/sign-in';
   import { apiClient } from '../account/api-client';
   import { mountAccountRoot } from '../account/mount-account-root';
   import { createTokenStage } from './access-tokens';
   import { createSessionGate } from './session-gate';
   import { createSessionView } from './session-view';

   const SESSION_TIMEOUT_MS = 20_000;
   const LOADING_DELAY_MS = 400;

   export const tokenStage = createTokenStage({ location: window.location, history: window.history });

   export const sessionStage = createSessionGate({
     fetchSession: (request) => fetchSession(apiClient, request),
     storeSession: (snapshot) => sessionStore.getState().applySnapshot(snapshot),
     takeAccessToken: () => tokenStage.take(),
     requestSignIn: (options) => {
       mountAccountRoot();
       return requestSignIn(options);
     },
     onReady: mountAccountRoot,
     view: createSessionView(),
     timeoutMs: SESSION_TIMEOUT_MS,
     loadingDelayMs: LOADING_DELAY_MS,
   });
   ```

5. **`frontend/src/app/main.tsx`:**

   ```tsx
   import '../../styles.css';
   import '../../lab.css';
   import '../pages/atlas/ui/atlas.css';
   import '../../campaign.css';
   import '../../quest-explorers.css';
   import '../../systems.css';
   import '../features/sign-in/ui/access.css';

   import { sessionStage, tokenStage } from './boot/account-stages';
   import { contentGate } from './boot/content-stage';
   import { legacyViews } from './boot/legacy-views';
   import { runBoot } from './boot/run-boot';

   // qa/load-order-check.ts reads this call: a new stage goes here and in its table.
   runBoot([tokenStage, sessionStage, contentGate, legacyViews]).catch((error: unknown) => {
     console.error('No se pudo iniciar el taller.', error);
   });
   ```

6. **`qa/load-order-check.ts`:** `STAGE_CONSTRAINTS` pasa a tener tres restricciones, y la de A2 no cambia:

   ```ts
   const STAGE_CONSTRAINTS: Constraint[] = [
     [
       'tokenStage',
       'sessionStage',
       'la etapa de los tokens borra de la URL los fragmentos con token antes de que la sesión decida qué mostrar y antes de que app.js mire el hash',
     ],
     [
       'sessionStage',
       'contentGate',
       'sin sesión no se pide el contenido: la etapa de sesión espera «pedir el ingreso» antes de la compuerta (F11-Q1)',
     ],
     [
       'contentGate',
       'legacyViews',
       'los adaptadores y las vistas legacy leen el contenido publicado al evaluarse',
     ],
   ];
   ```

7. **Correr:**
   - `node qa/load-order-check.ts`;
   - `node qa/boot-check.ts`, con el escenario de T013 ya en verde;
   - `npm run build && node qa/dist-content-check.ts`;
   - `npm test` y `npm run lint`;
   - `E2E_PORT=4173 npm run test:e2e`: los 123 y `session-stage.spec.ts`, todos en verde.

   Si `boot-check` anota oyentes en «main.tsx without its call evaluates quietly», la raíz se montó en el DOM falso: revisá la guarda de los hosts.
8. **Commit:** `feat(front): las etapas de los tokens y de sesión en el arranque, y la raíz de la cuenta`.

### Tarea 1.12 · El proxy de `npm run dev` y la vista previa con la API (T015, K)

**Archivos:** `qa/vite-proxy-check.ts`, `qa/run-checks.ts`, `frontend/vite.config.ts`, `docker/compose.preview.yaml` y `qa/compose-runs-check.ts`.

1. **`qa/vite-proxy-check.ts`,** en rojo. Fija el Review Focus 5:

   ```ts
   /* npm run dev pasa /api/ al stack, y vite preview, el servidor de los E2E, no (F11 FR-036).
    * node qa/vite-proxy-check.ts
    */
   import assert from 'node:assert/strict';
   import path from 'node:path';
   import { loadConfigFromFile } from 'vite';
   import { repoRoot } from './lib/sources.ts';

   const loaded = await loadConfigFromFile(
     { command: 'serve', mode: 'development' },
     path.join(repoRoot, 'frontend', 'vite.config.ts'),
   );
   assert.ok(loaded, 'no se pudo leer frontend/vite.config.ts');
   const stackPort = process.env.TALLER_PORT ?? '8080';
   assert.deepEqual(loaded.config.server?.proxy, {
     '/api': { target: `http://127.0.0.1:${stackPort}`, changeOrigin: false },
   });
   assert.deepEqual(
     loaded.config.preview?.proxy,
     {},
     'vite preview hereda server.proxy si no se lo vacía: los E2E pegarían contra el stack',
   );
   console.log('vite-proxy-check OK: npm run dev pasa /api/ al stack y vite preview no.');
   ```

   Se registra en `qa/run-checks.ts`, en `webChecks`, justo después de `'load-order-check.ts'`. Correrlo da falla: `server.proxy` es `undefined`.
2. **`frontend/vite.config.ts`.** Suma la constante y las dos claves:

   ```ts
   const stackOrigin = `http://127.0.0.1:${process.env.TALLER_PORT ?? '8080'}`;
   ```

   ```ts
   server: { proxy: { '/api': { target: stackOrigin, changeOrigin: false } } },
   preview: { proxy: {} },
   ```

   Van dentro de `defineConfig({...})`, después de `plugins`. Correr `node qa/vite-proxy-check.ts`: en verde.
3. **`docker/compose.preview.yaml`.** Sale `network_mode: bridge`, y el servicio se une a la red interna del stack como externa (research.md, R12):

   ```yaml
   name: taller-rust-go-preview
   services:
     preview:
       image: taller-rust-go-taller:latest
       build:
         context: ..
         dockerfile: frontend/Dockerfile
       networks: [edge, stack-web]
       ports:
         - '127.0.0.1:8765:8080'
       volumes:
         - ../dist:/usr/share/nginx/html:ro
       read_only: true
       tmpfs:
         - /tmp:rw,noexec,nosuid,size=32m
       security_opt:
         - no-new-privileges:true
       cap_drop:
         - ALL
       mem_limit: 128m
       pids_limit: 64

   networks:
     edge: {}
     stack-web:
       external: true
       name: taller-rust-go_web
   ```

4. **`qa/compose-runs-check.ts`.** Suma un escenario antes de `done()`:

   ```ts
   test('the preview joins the web network of the stack, so its Nginx reaches php for /api/', () => {
     const preview = parse(read('docker/compose.preview.yaml')) as {
       services: { preview: { networks?: string[]; network_mode?: string } };
       networks: Record<string, { external?: boolean; name?: string }>;
     };
     assert.equal(preview.services.preview.network_mode, undefined);
     assert.ok(preview.services.preview.networks?.includes('stack-web'));
     assert.deepEqual(preview.networks['stack-web'], { external: true, name: 'taller-rust-go_web' });
   });
   ```

   Escribilo antes de cambiar `compose.preview.yaml` y miralo fallar (`node qa/compose-runs-check.ts`).
5. **Verificación con Docker,** con permiso del usuario:
   - con el stack levantado (`docker compose up --build -d --wait`), primero `npm run build`, después `docker compose -f docker/compose.preview.yaml up --build -d --wait`;
   - `curl -s http://127.0.0.1:8765/api/session` devuelve el JSON de C3a con `"user":null`;
   - `npm run dev` y `curl -s http://127.0.0.1:5173/api/session` devuelven lo mismo;
   - sin el stack, el `up` de la vista previa falla con «network taller-rust-go_web declared as external, but could not be found», como prevé la spec (SC-012).

   Anotá las salidas en la descripción del PR.
6. **Commits:**
   - `test(qa): vite-proxy-check y la red de la vista previa, en rojo`;
   - `feat(front): npm run dev y la vista previa pasan /api/ al stack`.

### Tarea 1.13 · La compuerta de U1 (T016, K)

La compuerta de 0.4, con estos puntos propios:

- **El escenario de T013** pasa, y ningún otro de `boot-check` cambió.
- **Los E2E:** los 123 y `session-stage.spec.ts` en verde, tres veces seguidas (`--repeat-each=3 --retries=0`). La etapa nueva no puede volver inestable la red.
- **Lo que queda en el documento:** con un estudiante, `#session-status` está vacío y `#account-root` no tiene nodos (todavía no hay entrada). Se comprueba en el navegador con `document.getElementById('account-root').childNodes.length === 0`.
- **El PR:** `feat(front): mandatory session stage, API client and the account root (F11a U1)`, contra `f11a/base`.

**Reversión de U1:** se revierten T015, T012, T014, T013, T011, T009, T007 y T005, con sus specs, en ese orden. U0 se queda.

## 2. U2 · El ingreso, «Tu cuenta» y «Salir» (onda 3: F, P, A, M y E; onda 4: K)

**Cubre:** FR-012, FR-013, FR-020 (la regla, con `reauthenticate` de U1), FR-021 a FR-035, FR-048 (desde el ingreso y desde «Tu cuenta») y FR-049 a FR-052; SC-006 (el ingreso) y SC-007 (el diálogo); historia 2, escenarios 2 a 5 y 7, e historia 5, escenario 4.

**Entrega:** los formularios compartidos, el aviso de privacidad, el ingreso, «Tu cuenta» con «Salir» y sus E2E.

**Los diálogos en jsdom.** Toda spec de componente que abre un `<dialog>` define, en su `beforeAll`, este stub mínimo, que también dispara `close` como el navegador (ADR 0008):

```ts
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});
```

La spec de la puerta del acceso de T008 cambia su stub de `close` por este en T020.

### Tarea 2.1 · Las specs de los formularios, en rojo (T017, F)

**Archivos:** en `frontend/src/shared/ui/form/`:

- los stubs de `describe-failure.ts` (con `NETWORK_MESSAGE` y `UNEXPECTED_MESSAGE` ya escritos), `show-failure.ts`, `use-guarded-submit.ts`, `use-retry-countdown.ts`, `TextField.tsx`, `PasswordField.tsx` y `ServerError.tsx`;
- `describe-failure.spec.ts`, `form-components.spec.tsx` y `form-hooks.spec.tsx`.

**Consume:** de C, `ApiFailure`; de B, `formatWait`. **Produce:** «`shared/ui/form`» del contrato.

1. **`describe-failure.spec.ts`.** Los mensajes salen de `lang/es/api.php` y de la spec («Mensajes comunes»):

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ApiFailure } from '../../api/http';
   import { describeFailure } from './describe-failure';

   const NOTHING = {
     fieldMessages: {},
     generalMessages: [],
     retryAfterSeconds: null,
     offerReload: false,
     signedOut: false,
   };

   function response(
     status: number,
     code: string,
     message: string,
     extra: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number | null } = {},
   ): ApiFailure {
     return {
       kind: 'response',
       status,
       code,
       message,
       fieldErrors: extra.fieldErrors ?? {},
       retryAfterSeconds: extra.retryAfterSeconds ?? null,
     };
   }

   describe('describeFailure', () => {
     it('says the workshop could not be reached on a network failure', () => {
       expect(describeFailure({ kind: 'network' }, [])).toEqual({
         ...NOTHING,
         generalMessages: ['No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.'],
       });
     });

     it('says the answer was not the expected one when it is not JSON', () => {
       expect(describeFailure({ kind: 'unexpected', status: 502 }, [])).toEqual({
         ...NOTHING,
         generalMessages: ['El taller no respondió como esperábamos. Probá de nuevo en un rato.'],
       });
     });

     it('sends every message of a visible field to that field and the rest to the general error', () => {
       const failure = response(422, 'validation_failed', 'Hay datos que corregir.', {
         fieldErrors: {
           password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
           token: ['El enlace para restablecer la contraseña no es válido o venció.'],
         },
       });
       expect(describeFailure(failure, ['password', 'password_confirmation'])).toEqual({
         ...NOTHING,
         fieldMessages: {
           password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
         },
         generalMessages: ['El enlace para restablecer la contraseña no es válido o venció.'],
       });
     });

     it('falls back to the message of the server when no field brings one', () => {
       expect(describeFailure(response(422, 'validation_failed', 'Hay datos que corregir.'), ['email'])).toEqual({
         ...NOTHING,
         generalMessages: ['Hay datos que corregir.'],
       });
     });

     it('shows wrong credentials only in the general error', () => {
       const failure = response(422, 'auth_failed', 'El email o la contraseña no son correctos.');
       expect(describeFailure(failure, ['email', 'password'])).toEqual({
         ...NOTHING,
         generalMessages: ['El email o la contraseña no son correctos.'],
       });
     });

     it('adds the time left to a rate limit and keeps it', () => {
       const failure = response(429, 'too_many_requests', 'Demasiados intentos. Esperá un momento antes de volver a probar.', {
         retryAfterSeconds: 120,
       });
       expect(describeFailure(failure, [])).toEqual({
         ...NOTHING,
         generalMessages: [
           'Demasiados intentos. Esperá un momento antes de volver a probar.',
           'Podés volver a intentar en 2 minutos.',
         ],
         retryAfterSeconds: 120,
       });
     });

     it('shows only the message of a rate limit without Retry-After', () => {
       const failure = response(429, 'too_many_requests', 'Demasiados intentos. Esperá un momento antes de volver a probar.');
       expect(describeFailure(failure, [])).toEqual({
         ...NOTHING,
         generalMessages: ['Demasiados intentos. Esperá un momento antes de volver a probar.'],
       });
     });

     it('offers to reload when the session belongs to another account', () => {
       const mismatch = response(409, 'account_mismatch', 'La sesión cambió de cuenta: recargá la página.');
       expect(describeFailure(mismatch, [])).toEqual({
         ...NOTHING,
         generalMessages: ['La sesión cambió de cuenta: recargá la página.'],
         offerReload: true,
       });
       expect(
         describeFailure({ kind: 'account-changed', message: 'La página venció: recargala e intentá de nuevo.' }, []),
       ).toEqual({
         ...NOTHING,
         generalMessages: ['La página venció: recargala e intentá de nuevo.'],
         offerReload: true,
       });
     });

     it('asks for the sign-in on a 401 or on a 419 without an account, with nothing to show', () => {
       expect(describeFailure(response(401, 'unauthenticated', 'Iniciá sesión para continuar.'), [])).toEqual({
         ...NOTHING,
         signedOut: true,
       });
       expect(describeFailure({ kind: 'signed-out' }, [])).toEqual({ ...NOTHING, signedOut: true });
     });

     it('shows the message of the server for any other answer', () => {
       const disabled = response(
         403,
         'account_disabled',
         'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
       );
       expect(describeFailure(disabled, ['email'])).toEqual({
         ...NOTHING,
         generalMessages: ['Tu cuenta está deshabilitada. Consultá con quien administra el taller.'],
       });
     });
   });
   ```

2. **`form-components.spec.tsx`:**

   ```tsx
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { useForm } from 'react-hook-form';
   import { describe, expect, it } from 'vitest';
   import PasswordField from './PasswordField';
   import ServerError from './ServerError';
   import TextField from './TextField';

   interface HarnessProps {
     readonly messages: readonly string[];
     readonly hint?: string;
   }

   const Harness = ({ messages, hint }: HarnessProps) => {
     const { register } = useForm<{ email: string; password: string }>();
     return (
       <form>
         <TextField
           label="Email"
           type="email"
           autoComplete="username"
           registration={register('email')}
           messages={messages}
           hint={hint}
         />
         <PasswordField
           label="Contraseña"
           autoComplete="current-password"
           registration={register('password')}
           messages={[]}
         />
       </form>
     );
   };

   describe('TextField', () => {
     it('labels its input and leaves it valid without messages', () => {
       render(<Harness messages={[]} />);
       const input = screen.getByLabelText('Email');
       expect(input).toHaveAttribute('autocomplete', 'username');
       expect(input).not.toHaveAttribute('aria-invalid');
       expect(screen.queryByRole('list')).toBeNull();
     });

     it('marks the input and describes it with its hint and every message', () => {
       render(
         <Harness
           messages={['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.']}
           hint="Entre 15 y 64 caracteres."
         />,
       );
       const input = screen.getByLabelText('Email');
       expect(input).toHaveAttribute('aria-invalid', 'true');
       expect(input).toHaveAccessibleDescription(
         /Entre 15 y 64 caracteres\..*No puede contener tu nombre\..*Es una contraseña muy usada: elegí otra\./,
       );
       expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
         'No puede contener tu nombre.',
         'Es una contraseña muy usada: elegí otra.',
       ]);
     });

     it('accepts a pasted value', async () => {
       const user = userEvent.setup();
       render(<Harness messages={[]} />);
       await user.click(screen.getByLabelText('Email'));
       await user.paste('ana@x.com');
       expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
     });
   });

   describe('PasswordField', () => {
     it('hides the password and shows it on demand without sending the form', async () => {
       const user = userEvent.setup();
       render(<Harness messages={[]} />);
       const input = screen.getByLabelText('Contraseña');
       expect(input).toHaveAttribute('type', 'password');
       await user.click(screen.getByRole('button', { name: 'Mostrar' }));
       expect(input).toHaveAttribute('type', 'text');
       await user.click(screen.getByRole('button', { name: 'Ocultar' }));
       expect(input).toHaveAttribute('type', 'password');
       expect(screen.getByRole('button', { name: 'Mostrar' })).toHaveAttribute('type', 'button');
     });
   });

   describe('ServerError', () => {
     it('leaves no alert in the document without messages', () => {
       render(<ServerError messages={[]} takeFocus />);
       expect(screen.queryByRole('alert')).toBeNull();
     });

     it('announces every message, keeps its action and takes the focus when asked', () => {
       render(
         <ServerError messages={['La sesión cambió de cuenta: recargá la página.']} takeFocus>
           <button type="button">Recargar</button>
         </ServerError>,
       );
       const alert = screen.getByRole('alert');
       expect(alert).toHaveTextContent('La sesión cambió de cuenta: recargá la página.');
       expect(alert).toHaveFocus();
       expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
     });

     it('leaves the focus alone when a field has an error', () => {
       render(<ServerError messages={['Hay datos que corregir.']} takeFocus={false} />);
       expect(screen.getByRole('alert')).not.toHaveFocus();
     });
   });
   ```

3. **`form-hooks.spec.tsx`:**

   ```tsx
   import { act, render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { afterEach, describe, expect, it, vi } from 'vitest';
   import useGuardedSubmit from './use-guarded-submit';
   import useRetryCountdown from './use-retry-countdown';

   const GuardedButton = ({ handler }: { readonly handler: () => Promise<void> }) => {
     const guarded = useGuardedSubmit(handler);
     return (
       <button type="button" onClick={() => void guarded()}>
         Enviar
       </button>
     );
   };

   const Countdown = ({ seconds }: { readonly seconds: number }) => {
     const { waiting, start } = useRetryCountdown();
     return (
       <button type="button" disabled={waiting} onClick={() => start(seconds)}>
         Esperar
       </button>
     );
   };

   describe('useGuardedSubmit', () => {
     it('lets one submission through while the previous one has not finished', async () => {
       const user = userEvent.setup();
       let release: () => void = () => {};
       const handler = vi.fn(
         () =>
           new Promise<void>((resolve) => {
             release = resolve;
           }),
       );
       render(<GuardedButton handler={handler} />);
       await user.dblClick(screen.getByRole('button', { name: 'Enviar' }));
       expect(handler).toHaveBeenCalledOnce();
       await act(async () => {
         release();
       });
       await user.click(screen.getByRole('button', { name: 'Enviar' }));
       expect(handler).toHaveBeenCalledTimes(2);
     });
   });

   describe('useRetryCountdown', () => {
     afterEach(() => {
       vi.useRealTimers();
     });

     it('waits the seconds it was given', () => {
       vi.useFakeTimers();
       render(<Countdown seconds={2} />);
       const button = screen.getByRole('button', { name: 'Esperar' });
       act(() => button.click());
       expect(button).toBeDisabled();
       act(() => {
         vi.advanceTimersByTime(1_999);
       });
       expect(button).toBeDisabled();
       act(() => {
         vi.advanceTimersByTime(1);
       });
       expect(button).toBeEnabled();
     });
   });
   ```

4. **Correr** `npm run test:unit -- frontend/src/shared/ui/form`: todo en rojo.
5. **Commit:** `test(front): specs de los formularios compartidos, en rojo`.

### Tarea 2.2 · Los formularios (T018, F)

**Archivos:** los siete módulos de 2.1, `form.css` e `index.ts`, en `frontend/src/shared/ui/form/`.

1. **`describe-failure.ts`:**

   ```ts
   import type { ApiFailure, FieldErrors } from '../../api/http';
   import { formatWait } from '../../lib/format-wait';

   export const NETWORK_MESSAGE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';
   export const UNEXPECTED_MESSAGE = 'El taller no respondió como esperábamos. Probá de nuevo en un rato.';

   export interface FailureDescription {
     readonly fieldMessages: FieldErrors;
     readonly generalMessages: readonly string[];
     readonly retryAfterSeconds: number | null;
     readonly offerReload: boolean;
     readonly signedOut: boolean;
   }

   type ResponseFailure = Extract<ApiFailure, { kind: 'response' }>;

   const UNAUTHENTICATED = 401;
   const TOO_MANY_REQUESTS = 429;
   const NOTHING: FailureDescription = {
     fieldMessages: {},
     generalMessages: [],
     retryAfterSeconds: null,
     offerReload: false,
     signedOut: false,
   };

   function describeRateLimit(failure: ResponseFailure): FailureDescription {
     const seconds = failure.retryAfterSeconds;
     if (seconds === null) return { ...NOTHING, generalMessages: [failure.message] };
     return {
       ...NOTHING,
       generalMessages: [failure.message, `Podés volver a intentar en ${formatWait(seconds)}.`],
       retryAfterSeconds: seconds,
     };
   }

   function describeResponse(failure: ResponseFailure, visibleFields: readonly string[]): FailureDescription {
     if (failure.status === UNAUTHENTICATED) return { ...NOTHING, signedOut: true };
     if (failure.status === TOO_MANY_REQUESTS) return describeRateLimit(failure);
     const fieldMessages: Record<string, readonly string[]> = {};
     const generalMessages: string[] = [];
     for (const [field, messages] of Object.entries(failure.fieldErrors)) {
       if (visibleFields.includes(field)) fieldMessages[field] = messages;
       else generalMessages.push(...messages);
     }
     if (generalMessages.length === 0 && Object.keys(fieldMessages).length === 0) {
       generalMessages.push(failure.message);
     }
     return {
       ...NOTHING,
       fieldMessages,
       generalMessages,
       offerReload: failure.code === 'account_mismatch',
     };
   }

   export function describeFailure(failure: ApiFailure, visibleFields: readonly string[]): FailureDescription {
     switch (failure.kind) {
       case 'network':
         return { ...NOTHING, generalMessages: [NETWORK_MESSAGE] };
       case 'unexpected':
         return { ...NOTHING, generalMessages: [UNEXPECTED_MESSAGE] };
       case 'signed-out':
         return { ...NOTHING, signedOut: true };
       case 'account-changed':
         return { ...NOTHING, generalMessages: [failure.message], offerReload: true };
       case 'response':
         return describeResponse(failure, visibleFields);
     }
   }
   ```

2. **`show-failure.ts`:**

   ```ts
   import type { FieldError, FieldValues, Path, UseFormSetError } from 'react-hook-form';
   import type { FailureDescription } from './describe-failure';

   function typesOf(messages: readonly string[]): Record<string, string> {
     return Object.fromEntries(messages.map((message, index) => [`server${index}`, message]));
   }

   export function messagesOf(error: FieldError | undefined): string[] {
     if (error === undefined) return [];
     const fromTypes = Object.values(error.types ?? {})
       .flat()
       .filter((value): value is string => typeof value === 'string');
     if (fromTypes.length > 0) return fromTypes;
     return error.message ? [error.message] : [];
   }

   export function showFailure<T extends FieldValues>(
     setError: UseFormSetError<T>,
     description: FailureDescription,
     visibleFields: readonly Path<T>[],
   ): void {
     let focused = false;
     for (const field of visibleFields) {
       const messages = description.fieldMessages[field] ?? [];
       if (messages.length === 0) continue;
       setError(field, { type: 'server', types: typesOf(messages) }, { shouldFocus: !focused });
       focused = true;
     }
     if (description.generalMessages.length > 0) {
       setError('root.serverError', { type: 'server', types: typesOf(description.generalMessages) });
     }
   }
   ```

3. **`use-guarded-submit.ts`:**

   ```ts
   import { useCallback, useRef } from 'react';

   const useGuardedSubmit = <A extends unknown[]>(handler: (...args: A) => Promise<void>) => {
     const pending = useRef(false);
     return useCallback(
       async (...args: A): Promise<void> => {
         if (pending.current) return;
         pending.current = true;
         try {
           await handler(...args);
         } finally {
           pending.current = false;
         }
       },
       [handler],
     );
   };

   export default useGuardedSubmit;
   ```

4. **`use-retry-countdown.ts`:**

   ```ts
   import { useCallback, useEffect, useRef, useState } from 'react';

   const useRetryCountdown = () => {
     const [waiting, setWaiting] = useState(false);
     const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
     useEffect(() => () => clearTimeout(timer.current), []);
     const start = useCallback((seconds: number) => {
       clearTimeout(timer.current);
       if (seconds <= 0) return;
       setWaiting(true);
       timer.current = setTimeout(() => setWaiting(false), seconds * 1000);
     }, []);
     return { waiting, start };
   };

   export default useRetryCountdown;
   ```

5. **`TextField.tsx`:**

   ```tsx
   import { useId, type ReactNode } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';

   interface TextFieldProps {
     readonly label: string;
     readonly registration: UseFormRegisterReturn;
     readonly messages: readonly string[];
     readonly autoComplete: string;
     readonly type?: 'text' | 'email' | 'password';
     readonly hint?: string;
     readonly adornment?: ReactNode;
   }

   const TextField = ({
     label,
     registration,
     messages,
     autoComplete,
     type = 'text',
     hint,
     adornment,
   }: TextFieldProps) => {
     const id = useId();
     const hintId = `${id}-hint`;
     const errorsId = `${id}-errors`;
     const invalid = messages.length > 0;
     const describedBy = [hint === undefined ? '' : hintId, invalid ? errorsId : ''].filter(Boolean).join(' ');
     return (
       <div className="form-field">
         <label className="field-label" htmlFor={id}>
           {label}
         </label>
         <div className="form-control">
           <input
             id={id}
             className="form-input"
             type={type}
             autoComplete={autoComplete}
             aria-invalid={invalid || undefined}
             aria-describedby={describedBy || undefined}
             {...registration}
           />
           {adornment}
         </div>
         {hint === undefined ? null : (
           <p id={hintId} className="form-hint">
             {hint}
           </p>
         )}
         {invalid ? (
           <ul id={errorsId} className="form-errors">
             {messages.map((message) => (
               <li key={message}>{message}</li>
             ))}
           </ul>
         ) : null}
       </div>
     );
   };

   export default TextField;
   ```

6. **`PasswordField.tsx`:**

   ```tsx
   import { useState } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';
   import TextField from './TextField';

   interface PasswordFieldProps {
     readonly label: string;
     readonly registration: UseFormRegisterReturn;
     readonly messages: readonly string[];
     readonly autoComplete: 'current-password' | 'new-password';
     readonly hint?: string;
   }

   const PasswordField = ({ label, registration, messages, autoComplete, hint }: PasswordFieldProps) => {
     const [visible, setVisible] = useState(false);
     return (
       <TextField
         label={label}
         registration={registration}
         messages={messages}
         autoComplete={autoComplete}
         hint={hint}
         type={visible ? 'text' : 'password'}
         adornment={
           <button type="button" className="text-button form-reveal" onClick={() => setVisible((shown) => !shown)}>
             {visible ? 'Ocultar' : 'Mostrar'}
           </button>
         }
       />
     );
   };

   export default PasswordField;
   ```

7. **`ServerError.tsx`:**

   ```tsx
   import { useEffect, useRef, type ReactNode } from 'react';

   interface ServerErrorProps {
     readonly messages: readonly string[];
     readonly takeFocus: boolean;
     readonly children?: ReactNode;
   }

   const ServerError = ({ messages, takeFocus, children }: ServerErrorProps) => {
     const region = useRef<HTMLDivElement>(null);
     const text = messages.join('\n');
     useEffect(() => {
       if (takeFocus && text !== '') region.current?.focus();
     }, [takeFocus, text]);
     if (messages.length === 0) return null;
     return (
       <div ref={region} className="form-server-error" role="alert" tabIndex={-1}>
         {messages.map((message) => (
           <p key={message}>{message}</p>
         ))}
         {children}
       </div>
     );
   };

   export default ServerError;
   ```

8. **`form.css`.** Los campos tienen 16 px (FR-067), y `.field-label` y `.text-button` son de `styles.css`:

   ```css
   .form-stack {
     display: grid;
     gap: 18px;
     max-width: 440px;
   }
   .form-field {
     display: grid;
     gap: 6px;
   }
   .form-control {
     display: flex;
     align-items: center;
     gap: 10px;
   }
   .form-input {
     flex: 1 1 auto;
     min-width: 0;
     padding: 11px 13px;
     border: 1px solid var(--line);
     border-radius: 4px;
     background: var(--surface);
     color: var(--ink);
     font-size: 16px;
   }
   .form-input[aria-invalid='true'] {
     border-color: #a83928;
   }
   .form-hint {
     margin: 0;
     font-size: 12px;
   }
   .form-errors {
     margin: 0;
     padding-left: 18px;
     color: #a83928;
     font-size: 13px;
   }
   .form-check {
     display: flex;
     gap: 10px;
     align-items: flex-start;
     font-size: 13px;
   }
   .form-reveal {
     flex: 0 0 auto;
   }
   .form-server-error {
     padding: 12px 14px;
     border: 1px solid #a83928;
     border-radius: 4px;
     background: var(--accent-soft);
   }
   .form-server-error:focus {
     outline: 3px solid var(--accent);
     outline-offset: 4px;
   }
   .form-server-error p {
     margin: 0 0 6px;
     color: var(--ink);
     font-size: 13px;
   }
   .form-actions {
     display: flex;
     flex-wrap: wrap;
     gap: 10px;
     align-items: center;
   }
   ```

9. **`index.ts`:**

   ```ts
   export {
     NETWORK_MESSAGE,
     UNEXPECTED_MESSAGE,
     describeFailure,
   } from './describe-failure';
   export type { FailureDescription } from './describe-failure';
   export { messagesOf, showFailure } from './show-failure';
   export { default as useGuardedSubmit } from './use-guarded-submit';
   export { default as useRetryCountdown } from './use-retry-countdown';
   export { default as TextField } from './TextField';
   export { default as PasswordField } from './PasswordField';
   export { default as ServerError } from './ServerError';
   ```

10. **Correr** `npm run test:unit -- frontend/src/shared/ui/form`, en verde, y después `npm run typecheck` y `npm run lint`. `describeResponse` queda por debajo de 10.
11. **Commit:** `feat(front): los formularios compartidos, con errores accesibles y el error general`.

### Tarea 2.3 · El aviso de privacidad (T019, P)

**Archivos:** en `frontend/src/entities/privacy-notice/`, `config/privacy-notice.ts`, `ui/PrivacyNoticeText.tsx`, `ui/PrivacyNoticeDialog.tsx`, `ui/privacy-notice.css`, `ui/privacy-notice.spec.tsx` e `index.ts`.

**Produce:** «`entities/privacy-notice`» del contrato. `PrivacyNoticeDialog` está abierto mientras está montado: quien lo usa lo monta para abrirlo y lo desmonta en `onClose`.

1. **La spec en rojo** (`ui/privacy-notice.spec.tsx`), con los stubs de los dos componentes y la constante. La versión esperada es la que el stack acepta por omisión (`backend/api/config/taller.php`):

   ```tsx
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { useState } from 'react';
   import { beforeAll, describe, expect, it } from 'vitest';
   import { PRIVACY_NOTICE } from '../config/privacy-notice';
   import PrivacyNoticeDialog from './PrivacyNoticeDialog';
   import PrivacyNoticeText from './PrivacyNoticeText';

   beforeAll(() => {
     HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
       this.open = true;
     };
     HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
       this.open = false;
       this.dispatchEvent(new Event('close'));
     };
   });

   const Opener = () => {
     const [open, setOpen] = useState(false);
     return (
       <>
         <button type="button" onClick={() => setOpen(true)}>
           Aviso de privacidad
         </button>
         {open ? <PrivacyNoticeDialog onClose={() => setOpen(false)} /> : null}
       </>
     );
   };

   describe('the privacy notice', () => {
     it('carries the version that the stack accepts by default', () => {
       expect(PRIVACY_NOTICE.version).toBe('2026-10-dev');
     });

     it('shows each section under a heading of the level it is given', () => {
       render(<PrivacyNoticeText headingLevel={2} />);
       for (const section of PRIVACY_NOTICE.sections) {
         expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
       }
     });

     it('opens as a dialog named after the notice and gives the focus back when it closes', async () => {
       const user = userEvent.setup();
       render(<Opener />);
       const opener = screen.getByRole('button', { name: 'Aviso de privacidad' });
       await user.click(opener);
       expect(screen.getByRole('dialog', { name: 'Aviso de privacidad' })).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Cerrar' }));
       expect(screen.queryByRole('dialog', { name: 'Aviso de privacidad' })).toBeNull();
       expect(opener).toHaveFocus();
     });
   });
   ```

   Correrla (`npm run test:unit -- frontend/src/entities/privacy-notice`), verla fallar y hacer el commit `test(front): spec del aviso de privacidad, en rojo`.
2. **`config/privacy-notice.ts`.** El texto es provisional, con la versión `2026-10-dev`, hasta que el usuario dé el suyo (Q2; «Acciones del usuario»):

   ```ts
   export interface PrivacyNoticeSection {
     readonly heading: string;
     readonly paragraphs: readonly string[];
   }

   export interface PrivacyNotice {
     readonly version: string;
     readonly title: string;
     readonly sections: readonly PrivacyNoticeSection[];
   }

   export const PRIVACY_NOTICE: PrivacyNotice = {
     version: '2026-10-dev',
     title: 'Aviso de privacidad',
     sections: [
       {
         heading: 'Un texto provisional',
         paragraphs: [
           'Este aviso es provisional y sirve para usar el taller en una computadora propia. Antes de abrir el taller a sus alumnos, quien lo administra lo reemplaza por el aviso definitivo.',
         ],
       },
       {
         heading: 'Qué guarda el taller',
         paragraphs: [
           'Tu nombre, tu email, tu rol, la fecha en que aceptaste este aviso y los datos de tus sesiones. Tu progreso sigue guardado en este navegador.',
         ],
       },
       {
         heading: 'Para qué',
         paragraphs: [
           'Para que ingreses con tu cuenta y para que quien administra el taller pueda invitarte y ayudarte a recuperar el acceso.',
         ],
       },
       {
         heading: 'Tus derechos',
         paragraphs: [
           'Podés pedirle a quien administra el taller una copia de tus datos o que borre tu cuenta (Ley 25.326, artículos 14 y 16).',
         ],
       },
     ],
   };
   ```

3. **`ui/PrivacyNoticeText.tsx`:**

   ```tsx
   import { PRIVACY_NOTICE } from '../config/privacy-notice';

   interface PrivacyNoticeTextProps {
     readonly headingLevel: 2 | 3;
   }

   const PrivacyNoticeText = ({ headingLevel }: PrivacyNoticeTextProps) => {
     const Heading = headingLevel === 2 ? 'h2' : 'h3';
     return (
       <div className="privacy-notice">
         {PRIVACY_NOTICE.sections.map((section) => (
           <section key={section.heading}>
             <Heading>{section.heading}</Heading>
             {section.paragraphs.map((paragraph) => (
               <p key={paragraph}>{paragraph}</p>
             ))}
           </section>
         ))}
       </div>
     );
   };

   export default PrivacyNoticeText;
   ```

4. **`ui/PrivacyNoticeDialog.tsx`:**

   ```tsx
   import { useEffect, useId, useRef } from 'react';
   import { PRIVACY_NOTICE } from '../config/privacy-notice';
   import PrivacyNoticeText from './PrivacyNoticeText';

   interface PrivacyNoticeDialogProps {
     onClose(): void;
   }

   const PrivacyNoticeDialog = ({ onClose }: PrivacyNoticeDialogProps) => {
     const dialog = useRef<HTMLDialogElement>(null);
     const titleId = useId();
     useEffect(() => {
       const opener = document.activeElement;
       const element = dialog.current;
       if (element !== null && !element.open) element.showModal();
       return () => {
         if (opener instanceof HTMLElement) opener.focus();
       };
     }, []);
     return (
       <dialog ref={dialog} className="privacy-dialog" aria-labelledby={titleId} onClose={onClose}>
         <div className="dialog-content">
           <div className="dialog-top">
             <h2 id={titleId}>{PRIVACY_NOTICE.title}</h2>
             <button type="button" className="close-dialog" aria-label="Cerrar" onClick={() => dialog.current?.close()}>
               ×
             </button>
           </div>
           <PrivacyNoticeText headingLevel={3} />
         </div>
       </dialog>
     );
   };

   export default PrivacyNoticeDialog;
   ```

5. **`ui/privacy-notice.css`:**

   ```css
   .privacy-notice section + section {
     margin-top: 18px;
   }
   .privacy-notice h2,
   .privacy-notice h3 {
     font-size: 17px;
     letter-spacing: -0.3px;
     margin-bottom: 8px;
   }
   @media (max-width: 590px) {
     .privacy-dialog {
       width: 100%;
       max-width: none;
       height: 100%;
       max-height: none;
       margin: 0;
       border-radius: 0;
     }
   }
   ```

6. **`index.ts`:**

   ```ts
   export { PRIVACY_NOTICE } from './config/privacy-notice';
   export type { PrivacyNotice, PrivacyNoticeSection } from './config/privacy-notice';
   export { default as PrivacyNoticeText } from './ui/PrivacyNoticeText';
   export { default as PrivacyNoticeDialog } from './ui/PrivacyNoticeDialog';
   ```

7. **Correr** la spec, en verde, y después `npm run typecheck` y `npm run lint`.
8. **Commit:** `feat(front): el aviso de privacidad del front, con su versión y su diálogo`.

### Tarea 2.4 · Las specs del ingreso y de «Salir», en rojo (T020, A, desde S2)

**Archivos:** en `frontend/src/features/sign-in/`, los stubs de `api/access-endpoints.ts` (`login` y `EndpointResult`), `model/sign-out.ts` y `ui/LoginForm.tsx`, y las specs `api/access-endpoints.spec.ts`, `model/sign-out.spec.ts` y `ui/sign-in-screen.spec.tsx`. En `ui/access-gate.spec.tsx` (T008), el stub de `close` pasa a ser el de la introducción de U2.

**Consume:** de F, `shared/ui/form`; de P, `PrivacyNoticeDialog`; de C y S, lo de U1.

1. **`api/access-endpoints.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { login } from './access-endpoints';

   const ANA = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };

   function clientWith(replies: readonly FakeReply[]) {
     const fake = createFakeFetch(replies);
     return { client: createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' }), calls: fake.calls };
   }

   describe('login', () => {
     it('sends the email, the password and «Recordarme», and returns the published account', async () => {
       const { client, calls } = clientWith([{ status: 200, json: { data: ANA } }]);
       expect(await login(client, { email: 'ana@x.com', password: 'una frase larga', remember: true })).toEqual({
         ok: true,
         value: ANA,
       });
       expect(calls[0]?.path).toBe('/api/auth/login');
       expect(calls[0]?.body).toEqual({ email: 'ana@x.com', password: 'una frase larga', remember: true });
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
     });

     it('treats a 200 without an account as an unexpected answer', async () => {
       const { client } = clientWith([{ status: 200, json: { data: null } }]);
       expect(await login(client, { email: 'ana@x.com', password: 'x', remember: false })).toEqual({
         ok: false,
         failure: { kind: 'unexpected', status: 200 },
       });
     });
   });
   ```

2. **`model/sign-out.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { signOut } from './sign-out';

   function clientWith(replies: readonly (FakeReply | 'network-error')[]) {
     const fake = createFakeFetch(replies);
     return { client: createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' }), calls: fake.calls };
   }

   describe('signOut', () => {
     it('sends the logout with X-Taller-User and is done with a 204', async () => {
       const { client, calls } = clientWith([{ status: 204 }]);
       expect(await signOut({ client, userId: 41 })).toEqual({ kind: 'signed-out' });
       expect(calls[0]?.path).toBe('/api/auth/logout');
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
     });

     it('is done too when there was no session any more', async () => {
       const { client } = clientWith([
         { status: 401, json: { message: 'Iniciá sesión para continuar.', code: 'unauthenticated' } },
       ]);
       expect(await signOut({ client, userId: 41 })).toEqual({ kind: 'signed-out' });
     });

     it('fails with the network and with another account', async () => {
       const mismatch = { message: 'La sesión cambió de cuenta: recargá la página.', code: 'account_mismatch' };
       const { client } = clientWith(['network-error', { status: 409, json: mismatch }]);
       expect(await signOut({ client, userId: 41 })).toEqual({ kind: 'failed', failure: { kind: 'network' } });
       expect(await signOut({ client, userId: 41 })).toMatchObject({
         kind: 'failed',
         failure: { kind: 'response', status: 409, code: 'account_mismatch' },
       });
     });
   });
   ```

3. **`ui/sign-in-screen.spec.tsx`.** El ingreso se prueba a través de la puerta, que es como lo usa la raíz:

   ```tsx
   import { act, render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import { ApiClientContext, createApiClient, type FetchLike } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { createAccessRequests, type SignInOptions } from '../model/access-request';
   import AccessGate from './AccessGate';

   const ANA: PublishedUser = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
   const PASSWORD = 'una frase larga para el taller';

   beforeAll(() => {
     HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
       this.open = true;
     };
     HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
       this.open = false;
       this.dispatchEvent(new Event('close'));
     };
   });

   beforeEach(() => {
     sessionStore.setState({
       status: 'signed-out',
       user: null,
       features: { passwordReset: false, registration: false },
       contentVersion: null,
     });
   });

   function renderAccess(fetch: FetchLike, options: SignInOptions = { presentation: 'page', reason: 'boot' }) {
     const user = userEvent.setup();
     const client = createApiClient({ fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     const requests = createAccessRequests();
     render(
       <ApiClientContext value={client}>
         <AccessGate requests={requests} setShellInert={vi.fn()} reloadDocument={vi.fn()} />
       </ApiClientContext>,
     );
     let signedIn: Promise<PublishedUser> | undefined;
     act(() => {
       signedIn = requests.request(options);
     });
     return { user, signedIn };
   }

   function withReplies(replies: readonly FakeReply[], options?: SignInOptions) {
     const fake = createFakeFetch(replies);
     return { ...renderAccess(fake.fetch, options), calls: fake.calls };
   }

   async function signIn(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
     await user.type(screen.getByLabelText('Email'), email);
     await user.type(screen.getByLabelText('Contraseña'), password);
     await user.click(screen.getByRole('button', { name: 'Ingresar' }));
   }

   describe('signing in', () => {
     it('focuses the email and ends the request with the account in the session', async () => {
       const { user, signedIn, calls } = withReplies([{ status: 200, json: { data: ANA } }]);
       expect(screen.getByLabelText('Email')).toHaveFocus();
       await user.click(screen.getByRole('checkbox', { name: 'Recordarme en este navegador por 30 días' }));
       await signIn(user, 'ana@x.com', PASSWORD);
       await expect(signedIn).resolves.toEqual(ANA);
       expect(calls).toHaveLength(1);
       expect(calls[0]?.body).toEqual({ email: 'ana@x.com', password: PASSWORD, remember: true });
       expect(sessionStore.getState().user).toEqual(ANA);
     });

     it('stops in the browser when a field is empty, and focuses the first one', async () => {
       const { user, calls } = withReplies([]);
       await user.click(screen.getByRole('button', { name: 'Ingresar' }));
       expect(calls).toHaveLength(0);
       expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Completá este campo.');
       expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription('Completá este campo.');
       expect(screen.getByLabelText('Email')).toHaveFocus();
     });

     it('shows wrong credentials in the general error, focuses it and marks no field', async () => {
       const { user } = withReplies([
         { status: 422, json: { message: 'El email o la contraseña no son correctos.', code: 'auth_failed' } },
       ]);
       await signIn(user, 'nadie@x.com', PASSWORD);
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent('El email o la contraseña no son correctos.');
       expect(alert).toHaveFocus();
       expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
       expect(screen.getByLabelText('Contraseña')).not.toHaveAttribute('aria-invalid');
     });

     it('sends a validation error to its field and focuses it', async () => {
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
       await signIn(user, 'ana', PASSWORD);
       const email = screen.getByLabelText('Email');
       expect(await screen.findByText('El campo email debe ser un email válido.')).toBeInTheDocument();
       expect(email).toHaveAttribute('aria-invalid', 'true');
       expect(email).toHaveFocus();
     });

     it('keeps the button busy and says so while the server answers', async () => {
       const pending: FetchLike = () => new Promise<Response>(() => {});
       const { user } = renderAccess(pending);
       await signIn(user, 'ana@x.com', PASSWORD);
       expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled();
     });

     it('keeps the button disabled after a rate limit and says how long to wait', async () => {
       const { user } = withReplies([
         {
           status: 429,
           headers: { 'Retry-After': '120' },
           json: { message: 'Demasiados intentos. Esperá un momento antes de volver a probar.', code: 'too_many_requests' },
         },
       ]);
       await signIn(user, 'ana@x.com', PASSWORD);
       expect(await screen.findByRole('alert')).toHaveTextContent('Podés volver a intentar en 2 minutos.');
       expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled();
     });

     it('shows its own message when the answer is not JSON and keeps what was typed', async () => {
       const { user } = withReplies([{ status: 502, text: '<html>Bad Gateway</html>' }]);
       await signIn(user, 'ana@x.com', PASSWORD);
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'El taller no respondió como esperábamos. Probá de nuevo en un rato.',
       );
       expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
     });

     it('says how to recover the access without mail and offers no link for it', () => {
       withReplies([]);
       expect(
         screen.getByText('¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.'),
       ).toBeInTheDocument();
       expect(screen.queryByRole('link', { name: /olvidaste/ })).toBeNull();
       expect(screen.queryByRole('button', { name: /olvidaste/ })).toBeNull();
     });

     it('leaves «Recordarme» unchecked and warns about shared computers', () => {
       withReplies([]);
       const remember = screen.getByRole('checkbox', { name: 'Recordarme en este navegador por 30 días' });
       expect(remember).not.toBeChecked();
       expect(remember).toHaveAccessibleDescription('No la marques en una computadora compartida.');
     });

     it('tells an expired session to sign in again, in a dialog with a level-two title', () => {
       withReplies([], {});
       expect(screen.getByText('Tu sesión venció. Ingresá de nuevo para seguir.')).toBeInTheDocument();
       expect(screen.getByRole('heading', { level: 2, name: 'Ingresá al taller' })).toBeInTheDocument();
     });
   });
   ```

4. **Correr** `npm run test:unit -- frontend/src/features/sign-in`: las specs nuevas en rojo, y la de la puerta (T008) también, porque su título ya no alcanza sin el formulario.
5. **Commit:** `test(front): specs del ingreso y de «Salir», en rojo`.

### Tarea 2.5 · El ingreso y «Salir» (T021, A)

**Archivos:** `api/access-endpoints.ts`, `model/sign-out.ts`, `ui/LoginForm.tsx`, `ui/AccessScreen.tsx` e `index.ts`, en `frontend/src/features/sign-in/`.

1. **`api/access-endpoints.ts`.** U3 y U4 le suman endpoints:

   ```ts
   import { parsePublishedUser, type PublishedUser } from '../../../entities/session';
   import type { ApiClient, ApiFailure, ApiResult } from '../../../shared/api/http';
   import { isPlainObject } from '../../../shared/lib/is-plain-object';

   export type EndpointResult<T> =
     | { readonly ok: true; readonly value: T }
     | { readonly ok: false; readonly failure: ApiFailure };

   export interface LoginInput {
     readonly email: string;
     readonly password: string;
     readonly remember: boolean;
   }

   function unexpected(status: number): EndpointResult<never> {
     return { ok: false, failure: { kind: 'unexpected', status } };
   }

   async function accountFrom(pending: Promise<ApiResult>): Promise<EndpointResult<PublishedUser>> {
     const result = await pending;
     if (!result.ok) return result;
     const user = isPlainObject(result.body) ? parsePublishedUser(result.body.data) : null;
     return user === null ? unexpected(result.status) : { ok: true, value: user };
   }

   export function login(client: ApiClient, input: LoginInput): Promise<EndpointResult<PublishedUser>> {
     return accountFrom(client.send('POST', '/api/auth/login', input));
   }
   ```

2. **`model/sign-out.ts`:**

   ```ts
   import type { ApiClient, ApiFailure } from '../../../shared/api/http';

   export interface SignOutDependencies {
     readonly client: ApiClient;
     readonly userId: number;
   }

   export type SignOutOutcome =
     | { readonly kind: 'signed-out' }
     | { readonly kind: 'failed'; readonly failure: ApiFailure };

   const UNAUTHENTICATED = 401;

   function alreadySignedOut(failure: ApiFailure): boolean {
     if (failure.kind === 'signed-out') return true;
     return failure.kind === 'response' && failure.status === UNAUTHENTICATED;
   }

   export async function signOut({ client, userId }: SignOutDependencies): Promise<SignOutOutcome> {
     const result = await client.send('POST', '/api/auth/logout', undefined, { asUser: userId });
     if (result.ok || alreadySignedOut(result.failure)) return { kind: 'signed-out' };
     return { kind: 'failed', failure: result.failure };
   }
   ```

3. **`ui/LoginForm.tsx`:**

   ```tsx
   import { useEffect, useId, useState } from 'react';
   import { useForm } from 'react-hook-form';
   import { PrivacyNoticeDialog } from '../../../entities/privacy-notice';
   import type { PublishedUser } from '../../../entities/session';
   import { useApiClient } from '../../../shared/api/http';
   import {
     PasswordField,
     ServerError,
     TextField,
     describeFailure,
     messagesOf,
     showFailure,
     useGuardedSubmit,
     useRetryCountdown,
   } from '../../../shared/ui/form';
   import { login } from '../api/access-endpoints';
   import AccessHeading from './AccessHeading';

   interface LoginValues {
     email: string;
     password: string;
     remember: boolean;
   }

   interface LoginFormProps {
     readonly headingLevel: 1 | 2;
     readonly initialEmail: string;
     readonly notice: string | null;
     readonly passwordResetByMail: boolean;
     onSignedIn(user: PublishedUser): void;
   }

   const VISIBLE_FIELDS = ['email', 'password'] as const;
   const REQUIRED = 'Completá este campo.';

   const LoginForm = ({ headingLevel, initialEmail, notice, passwordResetByMail, onSignedIn }: LoginFormProps) => {
     const client = useApiClient();
     const countdown = useRetryCountdown();
     const rememberId = useId();
     const [privacyOpen, setPrivacyOpen] = useState(false);
     const {
       register,
       handleSubmit,
       setError,
       setFocus,
       formState: { errors, isSubmitting },
     } = useForm<LoginValues>({
       criteriaMode: 'all',
       defaultValues: { email: initialEmail, password: '', remember: false },
     });

     useEffect(() => {
       setFocus(initialEmail === '' ? 'email' : 'password');
     }, [setFocus, initialEmail]);

     const submit = useGuardedSubmit(async (values: LoginValues) => {
       const result = await login(client, values);
       if (result.ok) {
         onSignedIn(result.value);
         return;
       }
       const description = describeFailure(result.failure, VISIBLE_FIELDS);
       showFailure(setError, description, VISIBLE_FIELDS);
       if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
     });

     const fieldHasError = errors.email !== undefined || errors.password !== undefined;
     return (
       <>
         <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
           <AccessHeading level={headingLevel}>Ingresá al taller</AccessHeading>
           <p>Usá el email con el que te invitaron.</p>
           {notice === null ? null : <p className="access-notice">{notice}</p>}
           <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={!fieldHasError} />
           <TextField
             label="Email"
             type="email"
             autoComplete="username"
             registration={register('email', { required: REQUIRED })}
             messages={messagesOf(errors.email)}
           />
           <PasswordField
             label="Contraseña"
             autoComplete="current-password"
             registration={register('password', { required: REQUIRED })}
             messages={messagesOf(errors.password)}
           />
           <div className="form-check">
             <input id={rememberId} type="checkbox" aria-describedby={`${rememberId}-hint`} {...register('remember')} />
             <label htmlFor={rememberId}>Recordarme en este navegador por 30 días</label>
           </div>
           <p id={`${rememberId}-hint`} className="form-hint">
             No la marques en una computadora compartida.
           </p>
           <div className="form-actions">
             <button className="button" type="submit" disabled={isSubmitting || countdown.waiting}>
               {isSubmitting ? 'Ingresando…' : 'Ingresar'}
             </button>
           </div>
           {passwordResetByMail ? null : (
             <p className="form-hint">¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.</p>
           )}
           <button type="button" className="text-button" onClick={() => setPrivacyOpen(true)}>
             Aviso de privacidad
           </button>
         </form>
         {privacyOpen ? <PrivacyNoticeDialog onClose={() => setPrivacyOpen(false)} /> : null}
       </>
     );
   };

   export default LoginForm;
   ```

4. **`ui/AccessScreen.tsx`,** la versión de U2:

   ```tsx
   import { useState } from 'react';
   import { useStore } from 'zustand';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import type { AccessRequest } from '../model/access-request';
   import LoginForm from './LoginForm';

   interface AccessScreenProps {
     readonly request: AccessRequest;
     onFinish(user: PublishedUser): void;
     reloadDocument(): void;
   }

   interface LoginScreen {
     readonly kind: 'login';
     readonly email: string;
     readonly notice: string | null;
   }

   const EXPIRED_NOTICE = 'Tu sesión venció. Ingresá de nuevo para seguir.';

   function initialScreen(request: AccessRequest): LoginScreen {
     return { kind: 'login', email: '', notice: request.reason === 'expired' ? EXPIRED_NOTICE : null };
   }

   const AccessScreen = ({ request, onFinish }: AccessScreenProps) => {
     const [screen] = useState(() => initialScreen(request));
     const passwordResetByMail = useStore(sessionStore, (state) => state.features.passwordReset);
     return (
       <LoginForm
         headingLevel={request.presentation === 'page' ? 1 : 2}
         initialEmail={screen.email}
         notice={screen.notice}
         passwordResetByMail={passwordResetByMail}
         onSignedIn={onFinish}
       />
     );
   };

   export default AccessScreen;
   ```

5. **`index.ts`** suma:

   ```ts
   export { signOut } from './model/sign-out';
   export type { SignOutDependencies, SignOutOutcome } from './model/sign-out';
   ```

6. **Correr** `npm run test:unit -- frontend/src/features/sign-in`, con todo en verde, también la spec de la puerta. Después, `npm run typecheck` y `npm run lint`; ninguna función pasa de 10.
7. **Commit:** `feat(front): el ingreso con React Hook Form y «Salir»`.

### Tarea 2.6 · Las specs de «Tu cuenta», en rojo (T022, M, desde S2)

**Archivos:** en `frontend/src/pages/account/`, los stubs de `ui/AccountMenu.tsx`, `ui/AccountEntry.tsx`, `ui/AccountDialog.tsx` y `ui/SignOutSection.tsx`, y `ui/account-menu.spec.tsx`.

**Consume:** de A, `signOut`; de F, `shared/ui/form`; de P, `PrivacyNoticeDialog`; de S, `sessionStore` y `selectReadyAccount`.

1. **`ui/account-menu.spec.tsx`:**

   ```tsx
   import { act, render, screen, within } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import { ApiClientContext, createApiClient } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import AccountMenu from './AccountMenu';

   const ANA: PublishedUser = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
   const NOTE = 'Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.';

   beforeAll(() => {
     HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
       this.open = true;
     };
     HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
       this.open = false;
       this.dispatchEvent(new Event('close'));
     };
   });

   let entryHost: HTMLElement;

   beforeEach(() => {
     entryHost = document.createElement('div');
     document.body.append(entryHost);
     sessionStore.setState({
       status: 'signed-in',
       user: ANA,
       features: { passwordReset: false, registration: false },
       contentVersion: null,
     });
   });

   afterEach(() => {
     entryHost.remove();
   });

   function renderMenu(replies: readonly FakeReply[] = []) {
     const user = userEvent.setup();
     const fake = createFakeFetch(replies);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     const reloadDocument = vi.fn();
     render(
       <ApiClientContext value={client}>
         <AccountMenu entryHost={entryHost} reloadDocument={reloadDocument} />
       </ApiClientContext>,
     );
     return { user, calls: fake.calls, reloadDocument, entry: () => within(entryHost).getByRole('button', { name: 'Tu cuenta' }) };
   }

   describe('«Tu cuenta»', () => {
     it('puts no entry while the account is missing or has not accepted the notice', () => {
       sessionStore.setState({ user: null, status: 'signed-out' });
       renderMenu();
       expect(entryHost).toBeEmptyDOMElement();
       act(() => {
         sessionStore.setState({ user: { ...ANA, privacyAccepted: false }, status: 'signed-in' });
       });
       expect(entryHost).toBeEmptyDOMElement();
     });

     it('puts the entry in its own element and opens a dialog with the name, the email and the note', async () => {
       const { user, entry } = renderMenu();
       await user.click(entry());
       const dialog = screen.getByRole('dialog', { name: 'Tu cuenta' });
       expect(dialog).toHaveTextContent('Ana Pérez · ana@x.com');
       expect(dialog).toHaveTextContent(NOTE);
       expect(entry()).toHaveAttribute('aria-expanded', 'true');
     });

     it('closes with «Volver al taller» and gives the focus back to the entry', async () => {
       const { user, entry } = renderMenu();
       await user.click(entry());
       await user.click(screen.getByRole('button', { name: 'Volver al taller' }));
       expect(screen.queryByRole('dialog', { name: 'Tu cuenta' })).toBeNull();
       expect(entry()).toHaveFocus();
     });

     it('signs out with X-Taller-User and reloads the document', async () => {
       const { user, entry, calls, reloadDocument } = renderMenu([{ status: 204 }]);
       await user.click(entry());
       await user.click(screen.getByRole('button', { name: 'Salir' }));
       expect(calls[0]?.path).toBe('/api/auth/logout');
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('reloads too when there was no session any more', async () => {
       const { user, entry, reloadDocument } = renderMenu([
         { status: 401, json: { message: 'Iniciá sesión para continuar.', code: 'unauthenticated' } },
       ]);
       await user.click(entry());
       await user.click(screen.getByRole('button', { name: 'Salir' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('keeps the session and offers to retry when the sign-out fails', async () => {
       const { user, entry, reloadDocument } = renderMenu([{ status: 503, text: '<html>' }, { status: 204 }]);
       await user.click(entry());
       await user.click(screen.getByRole('button', { name: 'Salir' }));
       expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cerrar la sesión.');
       expect(reloadDocument).not.toHaveBeenCalled();
       await user.click(screen.getByRole('button', { name: 'Reintentar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('offers to reload when the session belongs to another account', async () => {
       const { user, entry, reloadDocument } = renderMenu([
         { status: 409, json: { message: 'La sesión cambió de cuenta: recargá la página.', code: 'account_mismatch' } },
       ]);
       await user.click(entry());
       await user.click(screen.getByRole('button', { name: 'Salir' }));
       expect(await screen.findByRole('alert')).toHaveTextContent('La sesión cambió de cuenta: recargá la página.');
       await user.click(screen.getByRole('button', { name: 'Recargar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('opens the privacy notice from «Tu cuenta»', async () => {
       const { user, entry } = renderMenu();
       await user.click(entry());
       await user.click(screen.getByRole('button', { name: 'Aviso de privacidad' }));
       expect(screen.getByRole('dialog', { name: 'Aviso de privacidad' })).toBeInTheDocument();
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/account`: en rojo.
3. **Commit:** `test(front): specs de «Tu cuenta», en rojo`.

### Tarea 2.7 · «Tu cuenta» (T023, M)

**Archivos:** los cuatro componentes de 2.6, `ui/account.css` e `index.ts`, en `frontend/src/pages/account/`.

1. **`ui/AccountEntry.tsx`.** React 19 recibe `ref` como prop:

   ```tsx
   import type { Ref } from 'react';

   interface AccountEntryProps {
     readonly ref: Ref<HTMLButtonElement>;
     readonly expanded: boolean;
     onOpen(): void;
   }

   const AccountEntry = ({ ref, expanded, onOpen }: AccountEntryProps) => (
     <button
       ref={ref}
       type="button"
       className="account-entry-button"
       aria-haspopup="dialog"
       aria-expanded={expanded}
       onClick={onOpen}
     >
       Tu cuenta
     </button>
   );

   export default AccountEntry;
   ```

2. **`ui/SignOutSection.tsx`:**

   ```tsx
   import { useState } from 'react';
   import { signOut } from '../../../features/sign-in';
   import { useApiClient } from '../../../shared/api/http';
   import {
     ServerError,
     describeFailure,
     useGuardedSubmit,
     useRetryCountdown,
     type FailureDescription,
   } from '../../../shared/ui/form';

   interface SignOutSectionProps {
     readonly userId: number;
     reloadDocument(): void;
   }

   const NOTE = 'Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.';
   const SIGN_OUT_FAILED = 'No pudimos cerrar la sesión.';

   function messagesFor(failure: FailureDescription | null): readonly string[] {
     if (failure === null) return [];
     if (failure.offerReload || failure.retryAfterSeconds !== null) return failure.generalMessages;
     return [SIGN_OUT_FAILED];
   }

   function buttonLabel(pending: boolean, failure: FailureDescription | null): string {
     if (pending) return 'Saliendo…';
     return failure === null ? 'Salir' : 'Reintentar';
   }

   const SignOutSection = ({ userId, reloadDocument }: SignOutSectionProps) => {
     const client = useApiClient();
     const countdown = useRetryCountdown();
     const [pending, setPending] = useState(false);
     const [failure, setFailure] = useState<FailureDescription | null>(null);
     const leave = useGuardedSubmit(async () => {
       setPending(true);
       setFailure(null);
       const outcome = await signOut({ client, userId });
       if (outcome.kind === 'signed-out') {
         reloadDocument();
         return;
       }
       const description = describeFailure(outcome.failure, []);
       setPending(false);
       setFailure(description);
       if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
     });
     const offerReload = failure?.offerReload === true;
     return (
       <div className="account-sign-out">
         <p className="form-hint">{NOTE}</p>
         <ServerError messages={messagesFor(failure)} takeFocus>
           {offerReload ? (
             <button className="button secondary" type="button" onClick={reloadDocument}>
               Recargar
             </button>
           ) : null}
         </ServerError>
         {offerReload ? null : (
           <button className="button dark" type="button" disabled={pending || countdown.waiting} onClick={() => void leave()}>
             {buttonLabel(pending, failure)}
           </button>
         )}
       </div>
     );
   };

   export default SignOutSection;
   ```

3. **`ui/AccountDialog.tsx`.** El aviso se monta como hermano del diálogo y no adentro: los dos son modales, y el evento `close` no burbujea:

   ```tsx
   import { useEffect, useId, useRef, useState } from 'react';
   import { PrivacyNoticeDialog } from '../../../entities/privacy-notice';
   import type { PublishedUser } from '../../../entities/session';
   import SignOutSection from './SignOutSection';

   interface AccountDialogProps {
     readonly account: PublishedUser;
     onClose(): void;
     reloadDocument(): void;
   }

   const AccountDialog = ({ account, onClose, reloadDocument }: AccountDialogProps) => {
     const dialog = useRef<HTMLDialogElement>(null);
     const titleId = useId();
     const [privacyOpen, setPrivacyOpen] = useState(false);
     useEffect(() => {
       const element = dialog.current;
       if (element !== null && !element.open) element.showModal();
     }, []);
     return (
       <>
         <dialog ref={dialog} className="account-dialog" aria-labelledby={titleId} onClose={onClose}>
           <div className="dialog-content">
             <h2 id={titleId}>Tu cuenta</h2>
             <p className="account-identity">
               {account.name} · {account.email}
             </p>
             <button type="button" className="text-button" onClick={() => setPrivacyOpen(true)}>
               Aviso de privacidad
             </button>
             <SignOutSection userId={account.id} reloadDocument={reloadDocument} />
             <div className="dialog-actions">
               <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>
                 Volver al taller
               </button>
             </div>
           </div>
         </dialog>
         {privacyOpen ? <PrivacyNoticeDialog onClose={() => setPrivacyOpen(false)} /> : null}
       </>
     );
   };

   export default AccountDialog;
   ```

4. **`ui/AccountMenu.tsx`:**

   ```tsx
   import { useRef, useState } from 'react';
   import { createPortal } from 'react-dom';
   import { useStore } from 'zustand';
   import { selectReadyAccount, sessionStore } from '../../../entities/session';
   import AccountDialog from './AccountDialog';
   import AccountEntry from './AccountEntry';

   interface AccountMenuProps {
     readonly entryHost: HTMLElement;
     reloadDocument(): void;
   }

   const AccountMenu = ({ entryHost, reloadDocument }: AccountMenuProps) => {
     const account = useStore(sessionStore, selectReadyAccount);
     const [open, setOpen] = useState(false);
     const entry = useRef<HTMLButtonElement>(null);
     if (account === null) return null;
     const close = (): void => {
       setOpen(false);
       entry.current?.focus();
     };
     return (
       <>
         {createPortal(<AccountEntry ref={entry} expanded={open} onOpen={() => setOpen(true)} />, entryHost)}
         {open ? <AccountDialog account={account} onClose={close} reloadDocument={reloadDocument} /> : null}
       </>
     );
   };

   export default AccountMenu;
   ```

5. **`ui/account.css`:**

   ```css
   .topbar-actions {
     display: flex;
     align-items: center;
     gap: 10px;
   }
   .account-entry:empty {
     display: none;
   }
   .account-entry-button {
     border: 1px solid #cccfc2;
     border-radius: 30px;
     background: transparent;
     padding: 6px 14px;
     font-size: 12px;
     white-space: nowrap;
   }
   .account-identity {
     color: var(--ink);
     font-weight: 550;
   }
   .account-sign-out {
     display: grid;
     gap: 12px;
     margin-top: 24px;
     padding-top: 20px;
     border-top: 1px solid var(--line);
   }
   @media (max-width: 590px) {
     .account-entry-button {
       padding: 4px 10px;
       font-size: 11px;
     }
     .account-dialog {
       width: 100%;
       max-width: none;
       height: 100%;
       max-height: none;
       margin: 0;
       border-radius: 0;
     }
   }
   ```

6. **`index.ts`:** `export { default as AccountMenu } from './ui/AccountMenu';`.
7. **Correr** `npm run test:unit -- frontend/src/pages/account`, en verde, y después `npm run typecheck` y `npm run lint`.
8. **Commit:** `feat(front): «Tu cuenta» en la barra superior, con «Salir»`.

### Tarea 2.8 · Los E2E del ingreso y de «Tu cuenta», en rojo (T024, E)

**Archivos:** `qa/e2e/pages/account.ts`, `qa/e2e/fixtures/index.ts` (suma `account`), `qa/e2e/specs/sign-in.spec.ts` y `qa/e2e/specs/account.spec.ts`.

1. **`qa/e2e/pages/account.ts`:**

   ```ts
   import type { Locator, Page } from '@playwright/test';

   export class AccountPage {
     readonly entry: Locator;
     readonly dialog: Locator;

     constructor(readonly page: Page) {
       this.entry = page.getByRole('button', { name: 'Tu cuenta', exact: true });
       this.dialog = page.getByRole('dialog', { name: 'Tu cuenta' });
     }

     async open(): Promise<void> {
       await this.entry.click();
     }

     button(name: string): Locator {
       return this.dialog.getByRole('button', { name, exact: true });
     }

     async signOut(): Promise<void> {
       await this.button('Salir').click();
     }
   }
   ```

   En `fixtures/index.ts`, `account: AccountPage` se suma a `Fixtures`, con `account: async ({ page }, use) => use(new AccountPage(page))` y su import.
2. **`qa/e2e/specs/sign-in.spec.ts`.** Cubre la historia 2 en sus escenarios 2 a 5, y FR-022, FR-023, FR-030 y FR-048:

   ```ts
   import { expect, test } from '../fixtures';
   import { MESSAGES, STUDENT, errorBody } from '../lib/api-contract';
   import { trackContentRequests } from '../lib/content-requests';
   import { curriculumIds } from '../lib/curriculum';
   import { documentWasReloaded, markDocument } from '../lib/document-marker';
   import { urls } from '../lib/urls';

   const FAILED_RESOURCE = /Failed to load resource/;
   const PASSWORD = 'una frase larga para el taller';

   test.use({ sessionAccount: null });

   test.describe('signing in', () => {
     test('goes on to the requested view without reloading, with the CSRF token and without X-Taller-User', async ({
       access,
       lab,
       api,
       page,
     }) => {
       const contentRequests = trackContentRequests(page);
       const url = urls.exercise('rust-02', 'code');
       await page.goto(url);
       await expect(access.field('Email')).toBeFocused();
       await markDocument(page);
       const xsrf = api.xsrfValue();
       await access.signIn(STUDENT.email, PASSWORD);
       await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
       expect(await documentWasReloaded(page)).toBe(false);
       await expect(page).toHaveURL(url);
       expect(contentRequests).toHaveLength(1);
       expect(api.callsTo('GET /api/session')).toHaveLength(2);
       const [call] = api.callsTo('POST /api/auth/login');
       expect(call?.xsrf).toBe(xsrf);
       expect(call?.user).toBeUndefined();
       expect(call?.body).toEqual({ email: STUDENT.email, password: PASSWORD, remember: false });
       await expect(page.locator('.app-shell')).not.toHaveAttribute('inert', '');
     });

     test('shows the same text for an unknown email and for a wrong password, and marks no field', async ({
       access,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the two 422 of the sign-in');
       api.reply(
         'POST /api/auth/login',
         { status: 422, json: errorBody('auth_failed') },
         { status: 422, json: errorBody('auth_failed') },
       );
       await page.goto(urls.view('recorrido'));
       await access.signIn('nadie@x.com', PASSWORD);
       await expect(access.alert()).toHaveText(MESSAGES.auth_failed);
       const unknownEmail = await access.alert().innerText();
       await access.field('Email').fill(STUDENT.email);
       await access.field('Contraseña').fill('otra frase equivocada del todo');
       await access.button('Ingresar').click();
       await expect.poll(() => api.callsTo('POST /api/auth/login').length).toBe(2);
       await expect(access.alert()).toHaveText(MESSAGES.auth_failed);
       expect(await access.alert().innerText()).toBe(unknownEmail);
       await expect(access.field('Email')).not.toHaveAttribute('aria-invalid', 'true');
       await expect(access.field('Contraseña')).not.toHaveAttribute('aria-invalid', 'true');
     });

     test('waits for Retry-After before letting the button send again', async ({ access, api, pageIssues, page }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 429 of the sign-in');
       await page.clock.install();
       api.reply('POST /api/auth/login', {
         status: 429,
         headers: { 'Retry-After': '120' },
         json: errorBody('too_many_requests'),
       });
       await page.goto(urls.view('recorrido'));
       await access.signIn(STUDENT.email, PASSWORD);
       await expect(access.alert()).toContainText(MESSAGES.too_many_requests);
       await expect(access.alert()).toContainText('Podés volver a intentar en 2 minutos.');
       await expect(access.button('Ingresar')).toBeDisabled();
       await page.clock.fastForward(119_000);
       await expect(access.button('Ingresar')).toBeDisabled();
       await page.clock.fastForward(1_000);
       await expect(access.button('Ingresar')).toBeEnabled();
     });

     test('keeps the button busy while the server answers and sends once', async ({ access, api, shell, page }) => {
       let answer: () => void = () => {};
       const answered = new Promise<void>((resolve) => {
         answer = resolve;
       });
       api.on('POST /api/auth/login', async () => {
         await answered;
         api.account = STUDENT;
         return { status: 200, json: { data: STUDENT } };
       });
       await page.goto(urls.view('recorrido'));
       await access.field('Email').fill(STUDENT.email);
       await access.field('Contraseña').fill(PASSWORD);
       await access.button('Ingresar').dblclick();
       await expect(access.button('Ingresando…')).toBeDisabled();
       answer();
       await expect(shell.heading('recorrido')).toBeVisible();
       expect(api.callsTo('POST /api/auth/login')).toHaveLength(1);
     });

     test('a disabled account sees the message of the server and stays out', async ({ access, api, pageIssues, page }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 403 of the sign-in');
       api.reply('POST /api/auth/login', { status: 403, json: errorBody('account_disabled') });
       await page.goto(urls.view('recorrido'));
       await access.signIn(STUDENT.email, PASSWORD);
       await expect(access.alert()).toHaveText(MESSAGES.account_disabled);
       await expect(access.heading('Ingresá al taller')).toBeVisible();
     });

     test('an answer that is not JSON shows its own message and keeps what was typed', async ({
       access,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 502 of the sign-in');
       api.reply('POST /api/auth/login', { status: 502, body: '<html>Bad Gateway</html>', contentType: 'text/html' });
       await page.goto(urls.view('recorrido'));
       await access.signIn(STUDENT.email, PASSWORD);
       await expect(access.alert()).toHaveText('El taller no respondió como esperábamos. Probá de nuevo en un rato.');
       await expect(access.field('Email')).toHaveValue(STUDENT.email);
     });

     test('reads the privacy notice from the sign-in and comes back to the same place', async ({ access, page }) => {
       await page.goto(urls.view('recorrido'));
       await access.button('Aviso de privacidad').click();
       const notice = page.getByRole('dialog', { name: 'Aviso de privacidad' });
       await expect(notice).toBeVisible();
       await page.keyboard.press('Escape');
       await expect(notice).toBeHidden();
       await expect(access.button('Aviso de privacidad')).toBeFocused();
     });
   });
   ```

3. **`qa/e2e/specs/account.spec.ts`.** Cubre la historia 2 en su escenario 7, la historia 5 en el 4, y FR-012, FR-013, FR-019, FR-048 y FR-050 a FR-052:

   ```ts
   import { expect, test } from '../fixtures';
   import { MESSAGES, STUDENT, errorBody } from '../lib/api-contract';
   import { frozenProgress, type StorageKey } from '../lib/curriculum';
   import { observeReload } from '../lib/document-marker';
   import { urls } from '../lib/urls';

   const FAILED_RESOURCE = /Failed to load resource/;
   const NOTE = 'Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.';

   test.describe('«Tu cuenta»', () => {
     test('opens from the top bar without changing the URL and closes with Esc, giving the focus back', async ({
       account,
       shell,
       page,
     }) => {
       await shell.goto(urls.view('biblioteca'));
       const entryAfterSidebar = await page.evaluate(() => {
         const sidebar = document.querySelector('.sidebar');
         const entry = document.getElementById('account-entry');
         if (sidebar === null || entry === null) return false;
         return (sidebar.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
       });
       expect(entryAfterSidebar).toBe(true);
       await account.open();
       await expect(account.dialog).toContainText(`${STUDENT.name} · ${STUDENT.email}`);
       await expect(account.dialog).toContainText(NOTE);
       await expect(page).toHaveURL(urls.view('biblioteca'));
       await page.keyboard.press('Escape');
       await expect(account.dialog).toBeHidden();
       await expect(account.entry).toBeFocused();
       await expect(shell.heading('biblioteca')).toBeVisible();
     });

     test('signs out with X-Taller-User and reloads, and the progress of the browser stays', async ({
       account,
       shell,
       storage,
       api,
       access,
       page,
     }) => {
       await storage.seed(frozenProgress);
       await shell.goto(urls.view('recorrido'));
       const xsrf = api.xsrfValue();
       await account.open();
       expect(await observeReload(page, () => account.signOut())).toBe(true);
       const [call] = api.callsTo('POST /api/auth/logout');
       expect(call?.user).toBe(String(STUDENT.id));
       expect(call?.xsrf).toBe(xsrf);
       await expect(access.heading('Ingresá al taller')).toBeVisible();
       const stored = await storage.snapshot();
       for (const key of Object.keys(frozenProgress) as StorageKey[]) expect(stored[key]).toBe(frozenProgress[key]);
     });

     test('reloads too when the session had already ended', async ({ account, shell, api, pageIssues, page }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 401 of the sign-out');
       api.reply('POST /api/auth/logout', { status: 401, json: errorBody('unauthenticated') });
       await shell.goto(urls.view('recorrido'));
       await account.open();
       expect(await observeReload(page, () => account.signOut())).toBe(true);
     });

     test('keeps the session and offers to retry when the server fails', async ({
       account,
       shell,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 503 of the sign-out');
       api.reply('POST /api/auth/logout', { status: 503, body: '<html>', contentType: 'text/html' });
       await shell.goto(urls.view('recorrido'));
       await account.open();
       await account.signOut();
       await expect(account.dialog.getByRole('alert')).toHaveText('No pudimos cerrar la sesión.');
       expect(await observeReload(page, () => account.button('Reintentar').click())).toBe(true);
     });

     test('offers to reload when the session belongs to another account', async ({
       account,
       shell,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 409 of the sign-out');
       api.reply('POST /api/auth/logout', { status: 409, json: errorBody('account_mismatch') });
       await shell.goto(urls.view('recorrido'));
       await account.open();
       await account.signOut();
       await expect(account.dialog.getByRole('alert')).toContainText(MESSAGES.account_mismatch);
       expect(await observeReload(page, () => account.button('Recargar').click())).toBe(true);
     });

     test('opens the privacy notice from «Tu cuenta» and goes back to it', async ({ account, shell, page }) => {
       await shell.goto(urls.view('recorrido'));
       await account.open();
       await account.button('Aviso de privacidad').click();
       const notice = page.getByRole('dialog', { name: 'Aviso de privacidad' });
       await expect(notice).toBeVisible();
       await page.keyboard.press('Escape');
       await expect(notice).toBeHidden();
       await expect(account.dialog).toBeVisible();
     });
   });
   ```

4. **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e -- specs/sign-in.spec.ts specs/account.spec.ts`. Fallan por la razón esperada hasta T025: no hay formulario cableado en la raíz, ni entrada.
5. **Commit:** `test(qa): E2E del ingreso y de «Tu cuenta», en rojo`.

### Tarea 2.9 · El cableado y la compuerta de U2 (T025, K)

1. **`frontend/src/app/account/AccountRoot.tsx`** suma «Tu cuenta»:

   ```tsx
   import { AccessGate, accessRequests } from '../../features/sign-in';
   import { AccountMenu } from '../../pages/account';
   import { ApiClientContext, type ApiClient } from '../../shared/api/http';
   import { reloadDocument } from './reload-document';
   import { setShellInert } from './shell-inertness';

   interface AccountRootProps {
     readonly client: ApiClient;
     readonly entryHost: HTMLElement;
   }

   const AccountRoot = ({ client, entryHost }: AccountRootProps) => (
     <ApiClientContext value={client}>
       <AccessGate requests={accessRequests} setShellInert={setShellInert} reloadDocument={reloadDocument} />
       <AccountMenu entryHost={entryHost} reloadDocument={reloadDocument} />
     </ApiClientContext>
   );

   export default AccountRoot;
   ```

2. **`frontend/src/app/main.tsx`:** las hojas quedan en este orden, después de `systems.css`:

   ```tsx
   import '../shared/ui/form/form.css';
   import '../entities/privacy-notice/ui/privacy-notice.css';
   import '../features/sign-in/ui/access.css';
   import '../pages/account/ui/account.css';
   ```

3. **La compuerta de 0.4,** con:
   - `sign-in.spec.ts` y `account.spec.ts` en verde, y los 123 y `session-stage.spec.ts` también, tres veces seguidas (`--repeat-each=3 --retries=0`);
   - `css-contract.spec.ts` en verde: R4 (el primer botón visible sigue siendo el de la barra lateral), R5 (ningún `.sr-only` nuevo) y el contrato de movimiento reducido (ningún `.button` nuevo antes de `#main`);
   - en el navegador, a 1 280 y a 390 px, la barra superior con «Tu cuenta» junto al selector de lenguaje;
   - el PR `feat(front): sign-in, «Tu cuenta» and sign-out (F11a U2)`, contra `f11a/base`.

**Reversión de U2:** se revierten T025, T024, T023, T022, T021, T020, T019, T018 y T017, en ese orden.

## 3. U3 · El alta y el aviso de privacidad (onda 5: A, E y K; onda 6: K)

**Cubre:** FR-005 (el alta con una sesión viva), FR-037 a FR-041 y FR-045 a FR-047; SC-001 (el alta sin recargar); historias 1 y 4.

**Entrega:** la invitación y el alta, la reaceptación del aviso, `PRIVACY_VERSION` hasta la API y sus E2E.

### Tarea 3.1 · Las specs del alta y de la reaceptación, en rojo (T026, A)

**Archivos:**

- en `frontend/src/shared/lib/`, el stub de `format-local-date-time.ts` y `format-local-date-time.spec.ts`;
- en `frontend/src/features/sign-in/`:
  - el stub de `model/invitation-problem.ts` y `model/invitation-problem.spec.ts`;
  - los stubs de `lookupInvitation`, `acceptInvitation` y `acceptPrivacy` en `api/access-endpoints.ts`, con sus casos sumados a `api/access-endpoints.spec.ts`;
  - los stubs de `ui/InvitationScreen.tsx`, `InvitationProblem.tsx`, `InvitationSummary.tsx`, `SignupForm.tsx`, `AcceptPrivacyField.tsx` y `PrivacyReacceptance.tsx`;
  - `ui/invitation-screen.spec.tsx` y `ui/privacy-reacceptance.spec.tsx`.

1. **`format-local-date-time.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { formatLocalDateTime } from './format-local-date-time';

   const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

   describe('formatLocalDateTime', () => {
     it.each([
       ['2026-10-12T15:30:00.000Z', '12 de octubre de 2026 a las 12:30'],
       ['2026-01-05T03:04:00.000Z', '5 de enero de 2026 a las 00:04'],
     ])('says %s in Buenos Aires as «%s»', (iso, text) => {
       expect(formatLocalDateTime(iso, BUENOS_AIRES)).toBe(text);
     });
   });
   ```

2. **`model/invitation-problem.spec.ts`.** Los mensajes salen de `lang/es/api.php`, y lo que sigue a cada uno, de la spec («Invitación y alta»):

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import { invitationProblem } from './invitation-problem';

   function response(status: number, code: string, message: string): ApiFailure {
     return { kind: 'response', status, code, message, fieldErrors: {}, retryAfterSeconds: null };
   }

   describe('invitationProblem', () => {
     it.each([
       [
         response(404, 'invitation_not_found', 'La invitación no existe o ya se usó.'),
         ['La invitación no existe o ya se usó.', 'Si ya creaste tu cuenta, ingresá con tu email.'],
       ],
       [
         response(410, 'invitation_expired', 'La invitación venció. Pedí una nueva a quien te invitó.'),
         ['La invitación venció. Pedí una nueva a quien te invitó.'],
       ],
       [
         response(409, 'email_taken', 'Ya hay una cuenta con ese email.'),
         ['Ya hay una cuenta con ese email.', 'Ingresá con ese email.'],
       ],
     ])('explains %o and what to do', (failure, messages) => {
       expect(invitationProblem(failure)).toEqual(messages);
     });

     it('leaves any other failure to the common messages', () => {
       expect(invitationProblem({ kind: 'network' })).toBeNull();
       expect(invitationProblem(response(422, 'validation_failed', 'Hay datos que corregir.'))).toBeNull();
     });
   });
   ```

3. **Los casos nuevos de `api/access-endpoints.spec.ts`,** con el `clientWith` de T020. El import suma `acceptInvitation`, `acceptPrivacy` y `lookupInvitation`:

   ```ts
   describe('the invitation', () => {
     it('looks up the token and returns the email, the role and the expiry', async () => {
       const { client, calls } = clientWith([
         { status: 200, json: { email: 'bruno@x.com', role: 'student', expiresAt: '2026-10-12T15:30:00.000Z' } },
       ]);
       expect(await lookupInvitation(client, 'k3J8')).toEqual({
         ok: true,
         value: { email: 'bruno@x.com', role: 'student', expiresAt: '2026-10-12T15:30:00.000Z' },
       });
       expect(calls[0]?.path).toBe('/api/auth/invitations/lookup');
       expect(calls[0]?.body).toEqual({ token: 'k3J8' });
     });

     it('accepts it and returns the new account', async () => {
       const bruno = { id: 77, name: 'Bruno Díaz', email: 'bruno@x.com', role: 'student', privacyAccepted: true };
       const { client, calls } = clientWith([{ status: 201, json: { data: bruno } }]);
       const input = {
         token: 'k3J8',
         name: 'Bruno Díaz',
         password: 'una frase larga para el alta',
         password_confirmation: 'una frase larga para el alta',
         privacyVersion: '2026-10-dev',
       };
       expect(await acceptInvitation(client, input)).toEqual({ ok: true, value: bruno });
       expect(calls[0]?.path).toBe('/api/auth/invitations/accept');
       expect(calls[0]?.body).toEqual(input);
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
     });
   });

   describe('acceptPrivacy', () => {
     it('sends the version of the notice for the account', async () => {
       const { client, calls } = clientWith([{ status: 204 }]);
       expect(await acceptPrivacy(client, 41, '2026-10-dev')).toEqual({ ok: true, value: null });
       expect(calls[0]?.path).toBe('/api/me/privacy');
       expect(calls[0]?.body).toEqual({ privacyVersion: '2026-10-dev' });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
     });
   });
   ```

4. **`ui/invitation-screen.spec.tsx`.** Usa el mismo arnés que `sign-in-screen.spec.tsx` (el stub de los diálogos, el `beforeEach` del store, `renderAccess` y `withReplies`), copiado entero en el archivo, con el pedido `{presentation: 'page', reason: 'boot', token: {kind: 'invitation', token: 'k3J8'}}` como valor por omisión de `options`:

   ```tsx
   const LOOKUP: FakeReply = {
     status: 200,
     json: { email: 'bruno@x.com', role: 'student', expiresAt: '2026-10-12T15:30:00.000Z' },
   };
   const BRUNO = { id: 77, name: 'Bruno Díaz', email: 'bruno@x.com', role: 'student' as const, privacyAccepted: true };
   const PASSWORD = 'una frase larga para el alta';

   async function fillSignup(user: ReturnType<typeof userEvent.setup>, password: string, confirmation = password) {
     await user.type(await screen.findByLabelText('Tu nombre'), 'Bruno Díaz');
     await user.type(screen.getByLabelText('Contraseña'), password);
     await user.type(screen.getByLabelText('Repetí la contraseña'), confirmation);
   }

   describe('the invitation', () => {
     it('checks the invitation, then shows its email, its expiry and the warning, and focuses the name', async () => {
       withReplies([LOOKUP]);
       expect(screen.getByRole('status')).toHaveTextContent('Revisando tu invitación…');
       expect(await screen.findByRole('heading', { level: 1, name: 'Creá tu cuenta' })).toBeInTheDocument();
       expect(screen.getByText('Te invitaron con bruno@x.com.')).toBeInTheDocument();
       expect(screen.getByText(/^La invitación vence el 12 de octubre de 2026 a las \d{2}:30\.$/)).toBeInTheDocument();
       expect(screen.getByText('Si recargás esta página, vas a tener que abrir el enlace otra vez.')).toBeInTheDocument();
       expect(screen.queryByText('La cuenta va a tener rol de admin.')).toBeNull();
       expect(screen.getByLabelText('Tu nombre')).toHaveFocus();
     });

     it('says when the account will be an admin', async () => {
       withReplies([{ status: 200, json: { ...(LOOKUP.json as object), role: 'admin' } }]);
       expect(await screen.findByText('La cuenta va a tener rol de admin.')).toBeInTheDocument();
     });

     it('creates the account with the token, the name, both passwords and the version of the notice', async () => {
       const { user, signedIn, calls } = withReplies([LOOKUP, { status: 201, json: { data: BRUNO } }]);
       await fillSignup(user, PASSWORD);
       await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       await expect(signedIn).resolves.toEqual(BRUNO);
       expect(calls[1]?.body).toEqual({
         token: 'k3J8',
         name: 'Bruno Díaz',
         password: PASSWORD,
         password_confirmation: PASSWORD,
         privacyVersion: '2026-10-dev',
       });
     });

     it('stops a 14-character password in the browser and lets a 15-character one with a decomposed «á» go', async () => {
       const { user, calls } = withReplies([LOOKUP, { status: 201, json: { data: BRUNO } }]);
       await fillSignup(user, 'a'.repeat(14));
       await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
         /Tiene que tener al menos 15 caracteres\./,
       );
       expect(calls).toHaveLength(1);
       const decomposed = `${'a'.repeat(14)}á`;
       await user.clear(screen.getByLabelText('Contraseña'));
       await user.clear(screen.getByLabelText('Repetí la contraseña'));
       await user.type(screen.getByLabelText('Contraseña'), decomposed);
       await user.type(screen.getByLabelText('Repetí la contraseña'), decomposed);
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       await vi.waitFor(() => expect(calls).toHaveLength(2));
     });

     it('stops a confirmation that does not match in the browser', async () => {
       const { user, calls } = withReplies([LOOKUP]);
       await fillSignup(user, PASSWORD, 'otra frase larga distinta');
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       expect(screen.getByLabelText('Repetí la contraseña')).toHaveAccessibleDescription(
         'La confirmación de la contraseña no coincide.',
       );
       expect(calls).toHaveLength(1);
     });

     it('asks for the box of the notice, which comes unchecked', async () => {
       const { user, calls } = withReplies([LOOKUP]);
       await fillSignup(user, PASSWORD);
       const box = screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' });
       expect(box).not.toBeChecked();
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       expect(box).toHaveAccessibleDescription('Para crear tu cuenta, aceptá el aviso de privacidad.');
       expect(calls).toHaveLength(1);
     });

     it('shows every reason of the server on the password, marks it and focuses it', async () => {
       const { user } = withReplies([
         LOOKUP,
         {
           status: 422,
           json: {
             message: 'Hay datos que corregir.',
             code: 'validation_failed',
             errors: { password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'] },
           },
         },
       ]);
       await fillSignup(user, PASSWORD);
       await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       const password = screen.getByLabelText('Contraseña');
       expect(await screen.findByText('Es una contraseña muy usada: elegí otra.')).toBeInTheDocument();
       expect(screen.getByText('No puede contener tu nombre.')).toBeInTheDocument();
       expect(password).toHaveAttribute('aria-invalid', 'true');
       expect(password).toHaveFocus();
     });

     it('keeps the button busy while the account is created', async () => {
       let calls = 0;
       const fetch: FetchLike = async (path, init) => {
         calls += 1;
         if (calls === 1) return createFakeFetch([LOOKUP]).fetch(path, init);
         return new Promise<Response>(() => {});
       };
       const { user } = renderAccess(fetch, {
         presentation: 'page',
         reason: 'boot',
         token: { kind: 'invitation', token: 'k3J8' },
       });
       await fillSignup(user, PASSWORD);
       await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       expect(screen.getByRole('button', { name: 'Creando tu cuenta…' })).toBeDisabled();
     });

     it('reads the notice without losing what was typed', async () => {
       const { user } = withReplies([LOOKUP]);
       await user.type(await screen.findByLabelText('Tu nombre'), 'Bruno Díaz');
       await user.click(screen.getByRole('button', { name: 'Leer el aviso' }));
       expect(screen.getByRole('dialog', { name: 'Aviso de privacidad' })).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Cerrar' }));
       expect(screen.getByLabelText('Tu nombre')).toHaveValue('Bruno Díaz');
       expect(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' })).not.toBeChecked();
     });

     it.each([
       [404, 'invitation_not_found', 'La invitación no existe o ya se usó.', 'Si ya creaste tu cuenta, ingresá con tu email.'],
       [410, 'invitation_expired', 'La invitación venció. Pedí una nueva a quien te invitó.', null],
     ])('shows a %i of the lookup without a form and offers the sign-in', async (status, code, message, next) => {
       const { user } = withReplies([{ status, json: { message, code } }]);
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent(message);
       if (next !== null) expect(alert).toHaveTextContent(next);
       expect(screen.queryByLabelText('Tu nombre')).toBeNull();
       await user.click(screen.getByRole('button', { name: 'Ir al ingreso' }));
       expect(screen.getByRole('heading', { name: 'Ingresá al taller' })).toBeInTheDocument();
     });

     it('shows the common message when the lookup meets a server error', async () => {
       withReplies([{ status: 500, json: { message: 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.', code: 'server_error' } }]);
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'Algo salió mal de nuestro lado. Probá de nuevo en un rato.',
       );
     });

     it('offers the sign-in when the email was taken in the meantime', async () => {
       const { user } = withReplies([
         LOOKUP,
         { status: 409, json: { message: 'Ya hay una cuenta con ese email.', code: 'email_taken' } },
       ]);
       await fillSignup(user, PASSWORD);
       await user.click(screen.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }));
       await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent('Ya hay una cuenta con ese email.');
       expect(alert).toHaveTextContent('Ingresá con ese email.');
       expect(screen.getByRole('button', { name: 'Ir al ingreso' })).toBeInTheDocument();
     });
   });
   ```

5. **`ui/privacy-reacceptance.spec.tsx`.** Con el mismo arnés y el pedido `{presentation: 'page', reason: 'boot'}`. El `beforeEach` deja en el store a Ana con `privacyAccepted: false`:

   ```tsx
   const ANA_BEFORE: PublishedUser = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: false };
   const CHANGED = 'El aviso de privacidad cambió desde la última vez que lo aceptaste. Leelo y aceptalo para seguir.';

   beforeEach(() => {
     sessionStore.setState({ status: 'signed-in', user: ANA_BEFORE });
   });

   describe('accepting the notice again', () => {
     it('shows the current notice and accepts it with its version and X-Taller-User', async () => {
       const { user, signedIn, calls } = withReplies([{ status: 204 }]);
       expect(screen.getByRole('heading', { level: 1, name: 'Aviso de privacidad' })).toBeInTheDocument();
       expect(screen.getByText(CHANGED)).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Acepto' }));
       await expect(signedIn).resolves.toEqual({ ...ANA_BEFORE, privacyAccepted: true });
       expect(calls[0]?.path).toBe('/api/me/privacy');
       expect(calls[0]?.body).toEqual({ privacyVersion: '2026-10-dev' });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
     });

     it('asks to reload when the server has another version, and does not retry', async () => {
       const { user, calls, reloadDocument } = withReplies([
         {
           status: 422,
           json: {
             message: 'Hay datos que corregir.',
             code: 'validation_failed',
             errors: { privacyVersion: ['El aviso de privacidad cambió: leelo de nuevo antes de aceptarlo.'] },
           },
         },
       ]);
       await user.click(screen.getByRole('button', { name: 'Acepto' }));
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'El aviso de privacidad cambió: recargá la página para leer el vigente.',
       );
       expect(calls).toHaveLength(1);
       await user.click(screen.getByRole('button', { name: 'Recargar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('goes to the sign-in when the session ended', async () => {
       const { user } = withReplies([
         { status: 401, json: { message: 'Iniciá sesión para continuar.', code: 'unauthenticated' } },
       ]);
       await user.click(screen.getByRole('button', { name: 'Acepto' }));
       expect(await screen.findByRole('heading', { name: 'Ingresá al taller' })).toBeInTheDocument();
       expect(screen.getByText('Tu sesión venció. Ingresá de nuevo para seguir.')).toBeInTheDocument();
     });

     it('signs out and reloads with «Salir»', async () => {
       const { user, calls, reloadDocument } = withReplies([{ status: 204 }]);
       await user.click(screen.getByRole('button', { name: 'Salir' }));
       expect(calls[0]?.path).toBe('/api/auth/logout');
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('asks for the notice after a sign-in whose account has an older one', async () => {
       sessionStore.setState({ status: 'signed-out', user: null });
       const { user, signedIn } = withReplies([{ status: 200, json: { data: ANA_BEFORE } }, { status: 204 }]);
       await user.type(screen.getByLabelText('Email'), 'ana@x.com');
       await user.type(screen.getByLabelText('Contraseña'), 'una frase larga para el taller');
       await user.click(screen.getByRole('button', { name: 'Ingresar' }));
       expect(await screen.findByRole('heading', { name: 'Aviso de privacidad' })).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Acepto' }));
       await expect(signedIn).resolves.toEqual({ ...ANA_BEFORE, privacyAccepted: true });
     });
   });
   ```

   `withReplies` devuelve también `reloadDocument`: en las dos specs nuevas, `renderAccess` guarda el `vi.fn()` que le pasa a `AccessGate` y lo devuelve.
6. **Correr** `npm run test:unit -- frontend/src/features/sign-in frontend/src/shared/lib`: lo nuevo en rojo.
7. **Commit:** `test(front): specs del alta y de la reaceptación del aviso, en rojo`.

### Tarea 3.2 · El alta y la reaceptación (T027, A)

**Archivos:** `frontend/src/shared/lib/format-local-date-time.ts` y, en `frontend/src/features/sign-in/`, `model/invitation-problem.ts`, `api/access-endpoints.ts`, `ui/access-texts.ts` (nuevo), `ui/LoginForm.tsx` (sólo el import de `REQUIRED`) y los seis componentes de 3.1, además de `ui/AccessScreen.tsx`.

1. **`format-local-date-time.ts`.** `formatToParts`, y no `dateStyle`, porque el formato completo cambia entre versiones de ICU (research.md, R18):

   ```ts
   export function formatLocalDateTime(iso: string, timeZone?: string): string {
     const parts = new Intl.DateTimeFormat('es-AR', {
       day: 'numeric',
       month: 'long',
       year: 'numeric',
       hour: '2-digit',
       minute: '2-digit',
       hourCycle: 'h23',
       timeZone,
     }).formatToParts(new Date(iso));
     const part = (type: Intl.DateTimeFormatPartTypes): string =>
       parts.find((item) => item.type === type)?.value ?? '';
     return `${part('day')} de ${part('month')} de ${part('year')} a las ${part('hour')}:${part('minute')}`;
   }
   ```

2. **`model/invitation-problem.ts`:**

   ```ts
   import type { ApiFailure } from '../../../shared/api/http';

   const SIGN_IN_INSTEAD = 'Si ya creaste tu cuenta, ingresá con tu email.';
   const SIGN_IN_WITH_THAT_EMAIL = 'Ingresá con ese email.';

   export function invitationProblem(failure: ApiFailure): readonly string[] | null {
     if (failure.kind !== 'response') return null;
     switch (failure.code) {
       case 'invitation_not_found':
         return [failure.message, SIGN_IN_INSTEAD];
       case 'invitation_expired':
         return [failure.message];
       case 'email_taken':
         return [failure.message, SIGN_IN_WITH_THAT_EMAIL];
       default:
         return null;
     }
   }
   ```

3. **`api/access-endpoints.ts`** suma lo siguiente. El import de `entities/session` suma `type AccountRole`:

   ```ts
   export interface InvitationDetails {
     readonly email: string;
     readonly role: AccountRole;
     readonly expiresAt: string;
   }

   export interface SignupInput {
     readonly token: string;
     readonly name: string;
     readonly password: string;
     readonly password_confirmation: string;
     readonly privacyVersion: string;
   }

   function parseInvitation(body: unknown): InvitationDetails | null {
     if (!isPlainObject(body)) return null;
     const { email, role, expiresAt } = body;
     if (typeof email !== 'string' || typeof expiresAt !== 'string') return null;
     if (role !== 'student' && role !== 'admin') return null;
     return { email, role, expiresAt };
   }

   export async function lookupInvitation(
     client: ApiClient,
     token: string,
   ): Promise<EndpointResult<InvitationDetails>> {
     const result = await client.send('POST', '/api/auth/invitations/lookup', { token });
     if (!result.ok) return result;
     const details = parseInvitation(result.body);
     return details === null ? unexpected(result.status) : { ok: true, value: details };
   }

   export function acceptInvitation(client: ApiClient, input: SignupInput): Promise<EndpointResult<PublishedUser>> {
     return accountFrom(client.send('POST', '/api/auth/invitations/accept', input));
   }

   export async function acceptPrivacy(
     client: ApiClient,
     userId: number,
     privacyVersion: string,
   ): Promise<EndpointResult<null>> {
     const result = await client.send('POST', '/api/me/privacy', { privacyVersion }, { asUser: userId });
     return result.ok ? { ok: true, value: null } : result;
   }
   ```

4. **`ui/access-texts.ts`.** `LoginForm.tsx` borra su `REQUIRED` local y lo importa de acá:

   ```ts
   export const REQUIRED = 'Completá este campo.';
   export const MISMATCH = 'La confirmación de la contraseña no coincide.';
   export const PASSWORD_HINT = 'Entre 15 y 64 caracteres. Puede ser una frase; no hace falta mezclar símbolos.';
   export const EXPIRED_NOTICE = 'Tu sesión venció. Ingresá de nuevo para seguir.';
   ```

5. **`ui/InvitationSummary.tsx`:**

   ```tsx
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import type { InvitationDetails } from '../api/access-endpoints';

   interface InvitationSummaryProps {
     readonly details: InvitationDetails;
   }

   const InvitationSummary = ({ details }: InvitationSummaryProps) => (
     <div className="form-field">
       <p>Te invitaron con {details.email}.</p>
       {details.role === 'admin' ? <p>La cuenta va a tener rol de admin.</p> : null}
       <p>La invitación vence el {formatLocalDateTime(details.expiresAt)}.</p>
       <p>Si recargás esta página, vas a tener que abrir el enlace otra vez.</p>
     </div>
   );

   export default InvitationSummary;
   ```

6. **`ui/InvitationProblem.tsx`:**

   ```tsx
   import { ServerError } from '../../../shared/ui/form';
   import AccessHeading from './AccessHeading';

   interface InvitationProblemProps {
     readonly headingLevel: 1 | 2;
     readonly messages: readonly string[];
     onGoToSignIn(): void;
   }

   const InvitationProblem = ({ headingLevel, messages, onGoToSignIn }: InvitationProblemProps) => (
     <div className="form-stack">
       <AccessHeading level={headingLevel}>Creá tu cuenta</AccessHeading>
       <ServerError messages={messages} takeFocus>
         <button className="button secondary" type="button" onClick={onGoToSignIn}>
           Ir al ingreso
         </button>
       </ServerError>
     </div>
   );

   export default InvitationProblem;
   ```

7. **`ui/AcceptPrivacyField.tsx`:**

   ```tsx
   import { useId } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';

   interface AcceptPrivacyFieldProps {
     readonly registration: UseFormRegisterReturn;
     readonly messages: readonly string[];
     onRead(): void;
   }

   const AcceptPrivacyField = ({ registration, messages, onRead }: AcceptPrivacyFieldProps) => {
     const id = useId();
     const invalid = messages.length > 0;
     return (
       <div className="form-field">
         <div className="form-check">
           <input
             id={id}
             type="checkbox"
             aria-invalid={invalid || undefined}
             aria-describedby={invalid ? `${id}-errors` : undefined}
             {...registration}
           />
           <label htmlFor={id}>Leí y acepto el aviso de privacidad</label>
           <button type="button" className="text-button" onClick={onRead}>
             Leer el aviso
           </button>
         </div>
         {invalid ? (
           <ul id={`${id}-errors`} className="form-errors">
             {messages.map((message) => (
               <li key={message}>{message}</li>
             ))}
           </ul>
         ) : null}
       </div>
     );
   };

   export default AcceptPrivacyField;
   ```

8. **`ui/SignupForm.tsx`:**

   ```tsx
   import { useEffect, useState } from 'react';
   import { useForm } from 'react-hook-form';
   import { PRIVACY_NOTICE, PrivacyNoticeDialog } from '../../../entities/privacy-notice';
   import { checkNewPasswordLength, type PublishedUser } from '../../../entities/session';
   import { useApiClient } from '../../../shared/api/http';
   import {
     PasswordField,
     ServerError,
     TextField,
     describeFailure,
     messagesOf,
     showFailure,
     useGuardedSubmit,
     useRetryCountdown,
   } from '../../../shared/ui/form';
   import { acceptInvitation, type InvitationDetails } from '../api/access-endpoints';
   import { invitationProblem } from '../model/invitation-problem';
   import AcceptPrivacyField from './AcceptPrivacyField';
   import AccessHeading from './AccessHeading';
   import { MISMATCH, PASSWORD_HINT, REQUIRED } from './access-texts';
   import InvitationSummary from './InvitationSummary';

   interface SignupValues {
     name: string;
     password: string;
     password_confirmation: string;
     accepted: boolean;
   }

   interface SignupFormProps {
     readonly token: string;
     readonly details: InvitationDetails;
     readonly headingLevel: 1 | 2;
     onCreated(user: PublishedUser): void;
     onGoToSignIn(): void;
   }

   const VISIBLE_FIELDS = ['name', 'password', 'password_confirmation'] as const;
   const ACCEPT_REQUIRED = 'Para crear tu cuenta, aceptá el aviso de privacidad.';

   const SignupForm = ({ token, details, headingLevel, onCreated, onGoToSignIn }: SignupFormProps) => {
     const client = useApiClient();
     const countdown = useRetryCountdown();
     const [privacyOpen, setPrivacyOpen] = useState(false);
     const [offerSignIn, setOfferSignIn] = useState(false);
     const {
       register,
       handleSubmit,
       setError,
       setFocus,
       formState: { errors, isSubmitting },
     } = useForm<SignupValues>({
       criteriaMode: 'all',
       defaultValues: { name: '', password: '', password_confirmation: '', accepted: false },
     });

     useEffect(() => {
       setFocus('name');
     }, [setFocus]);

     const submit = useGuardedSubmit(async (values: SignupValues) => {
       const result = await acceptInvitation(client, {
         token,
         name: values.name,
         password: values.password,
         password_confirmation: values.password_confirmation,
         privacyVersion: PRIVACY_NOTICE.version,
       });
       if (result.ok) {
         onCreated(result.value);
         return;
       }
       const problem = invitationProblem(result.failure);
       const described = describeFailure(result.failure, VISIBLE_FIELDS);
       const description = problem === null ? described : { ...described, generalMessages: problem };
       showFailure(setError, description, VISIBLE_FIELDS);
       setOfferSignIn(problem !== null);
       if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
     });

     const fieldHasError = VISIBLE_FIELDS.some((field) => errors[field] !== undefined);
     return (
       <>
         <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
           <AccessHeading level={headingLevel}>Creá tu cuenta</AccessHeading>
           <InvitationSummary details={details} />
           <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={!fieldHasError}>
             {offerSignIn ? (
               <button className="button secondary" type="button" onClick={onGoToSignIn}>
                 Ir al ingreso
               </button>
             ) : null}
           </ServerError>
           <TextField
             label="Tu nombre"
             autoComplete="name"
             registration={register('name', { required: REQUIRED })}
             messages={messagesOf(errors.name)}
           />
           <PasswordField
             label="Contraseña"
             autoComplete="new-password"
             hint={PASSWORD_HINT}
             registration={register('password', {
               required: REQUIRED,
               validate: { length: (value) => value === '' || checkNewPasswordLength(value) },
             })}
             messages={messagesOf(errors.password)}
           />
           <PasswordField
             label="Repetí la contraseña"
             autoComplete="new-password"
             registration={register('password_confirmation', {
               required: REQUIRED,
               validate: { same: (value, values) => value === values.password || MISMATCH },
             })}
             messages={messagesOf(errors.password_confirmation)}
           />
           <AcceptPrivacyField
             registration={register('accepted', { required: ACCEPT_REQUIRED })}
             messages={messagesOf(errors.accepted)}
             onRead={() => setPrivacyOpen(true)}
           />
           <div className="form-actions">
             <button className="button" type="submit" disabled={isSubmitting || countdown.waiting}>
               {isSubmitting ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
             </button>
           </div>
         </form>
         {privacyOpen ? <PrivacyNoticeDialog onClose={() => setPrivacyOpen(false)} /> : null}
       </>
     );
   };

   export default SignupForm;
   ```

9. **`ui/InvitationScreen.tsx`.** El efecto sincroniza con la API, que es un sistema externo, y descarta la respuesta si el componente ya no está:

   ```tsx
   import { useEffect, useState } from 'react';
   import type { PublishedUser } from '../../../entities/session';
   import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   import { describeFailure } from '../../../shared/ui/form';
   import { lookupInvitation, type InvitationDetails } from '../api/access-endpoints';
   import { invitationProblem } from '../model/invitation-problem';
   import InvitationProblem from './InvitationProblem';
   import SignupForm from './SignupForm';

   interface InvitationScreenProps {
     readonly token: string;
     readonly headingLevel: 1 | 2;
     onCreated(user: PublishedUser): void;
     onGoToSignIn(): void;
   }

   type Lookup =
     | { readonly state: 'checking' }
     | { readonly state: 'ready'; readonly details: InvitationDetails }
     | { readonly state: 'failed'; readonly messages: readonly string[] };

   function lookupFailureMessages(failure: ApiFailure): readonly string[] {
     return invitationProblem(failure) ?? describeFailure(failure, []).generalMessages;
   }

   const InvitationScreen = ({ token, headingLevel, onCreated, onGoToSignIn }: InvitationScreenProps) => {
     const client = useApiClient();
     const [lookup, setLookup] = useState<Lookup>({ state: 'checking' });
     useEffect(() => {
       let active = true;
       void lookupInvitation(client, token).then((result) => {
         if (!active) return;
         setLookup(
           result.ok
             ? { state: 'ready', details: result.value }
             : { state: 'failed', messages: lookupFailureMessages(result.failure) },
         );
       });
       return () => {
         active = false;
       };
     }, [client, token]);
     if (lookup.state === 'checking') return <p role="status">Revisando tu invitación…</p>;
     if (lookup.state === 'failed') {
       return <InvitationProblem headingLevel={headingLevel} messages={lookup.messages} onGoToSignIn={onGoToSignIn} />;
     }
     return (
       <SignupForm
         token={token}
         details={lookup.details}
         headingLevel={headingLevel}
         onCreated={onCreated}
         onGoToSignIn={onGoToSignIn}
       />
     );
   };

   export default InvitationScreen;
   ```

10. **`ui/PrivacyReacceptance.tsx`:**

    ```tsx
    import { useState } from 'react';
    import { PRIVACY_NOTICE, PrivacyNoticeText } from '../../../entities/privacy-notice';
    import type { PublishedUser } from '../../../entities/session';
    import { useApiClient, type ApiFailure } from '../../../shared/api/http';
    import { ServerError, describeFailure, useGuardedSubmit } from '../../../shared/ui/form';
    import { acceptPrivacy } from '../api/access-endpoints';
    import { signOut } from '../model/sign-out';
    import AccessHeading from './AccessHeading';

    interface PrivacyReacceptanceProps {
      readonly account: PublishedUser;
      readonly headingLevel: 1 | 2;
      onAccepted(user: PublishedUser): void;
      onSessionLost(): void;
      reloadDocument(): void;
    }

    interface Problem {
      readonly messages: readonly string[];
      readonly offerReload: boolean;
    }

    const NOTICE_CHANGED =
      'El aviso de privacidad cambió desde la última vez que lo aceptaste. Leelo y aceptalo para seguir.';
    const VERSION_CHANGED = 'El aviso de privacidad cambió: recargá la página para leer el vigente.';

    function versionChanged(failure: ApiFailure): boolean {
      return failure.kind === 'response' && failure.status === 422 && 'privacyVersion' in failure.fieldErrors;
    }

    function problemOf(failure: ApiFailure): Problem {
      if (versionChanged(failure)) return { messages: [VERSION_CHANGED], offerReload: true };
      const description = describeFailure(failure, []);
      return { messages: description.generalMessages, offerReload: description.offerReload };
    }

    const PrivacyReacceptance = ({
      account,
      headingLevel,
      onAccepted,
      onSessionLost,
      reloadDocument,
    }: PrivacyReacceptanceProps) => {
      const client = useApiClient();
      const [pending, setPending] = useState<'accept' | 'leave' | null>(null);
      const [problem, setProblem] = useState<Problem | null>(null);

      const accept = useGuardedSubmit(async () => {
        setPending('accept');
        setProblem(null);
        const result = await acceptPrivacy(client, account.id, PRIVACY_NOTICE.version);
        if (result.ok) {
          onAccepted({ ...account, privacyAccepted: true });
          return;
        }
        setPending(null);
        if (describeFailure(result.failure, []).signedOut) {
          onSessionLost();
          return;
        }
        setProblem(problemOf(result.failure));
      });

      const leave = useGuardedSubmit(async () => {
        setPending('leave');
        setProblem(null);
        const outcome = await signOut({ client, userId: account.id });
        if (outcome.kind === 'signed-out') {
          reloadDocument();
          return;
        }
        setPending(null);
        setProblem(problemOf(outcome.failure));
      });

      return (
        <div className="form-stack">
          <AccessHeading level={headingLevel}>Aviso de privacidad</AccessHeading>
          <p>{NOTICE_CHANGED}</p>
          <PrivacyNoticeText headingLevel={headingLevel === 1 ? 2 : 3} />
          <ServerError messages={problem?.messages ?? []} takeFocus>
            {problem?.offerReload ? (
              <button className="button secondary" type="button" onClick={reloadDocument}>
                Recargar
              </button>
            ) : null}
          </ServerError>
          <div className="form-actions">
            <button className="button" type="button" disabled={pending !== null} onClick={() => void accept()}>
              {pending === 'accept' ? 'Guardando…' : 'Acepto'}
            </button>
            <button className="button secondary" type="button" disabled={pending !== null} onClick={() => void leave()}>
              {pending === 'leave' ? 'Saliendo…' : 'Salir'}
            </button>
          </div>
        </div>
      );
    };

    export default PrivacyReacceptance;
    ```

11. **`ui/AccessScreen.tsx`,** la versión de U3:

    ```tsx
    import { useState } from 'react';
    import { useStore } from 'zustand';
    import { sessionStore, type PublishedUser } from '../../../entities/session';
    import type { AccessRequest } from '../model/access-request';
    import { EXPIRED_NOTICE } from './access-texts';
    import InvitationScreen from './InvitationScreen';
    import LoginForm from './LoginForm';
    import PrivacyReacceptance from './PrivacyReacceptance';

    interface AccessScreenProps {
      readonly request: AccessRequest;
      onFinish(user: PublishedUser): void;
      reloadDocument(): void;
    }

    type Screen =
      | { readonly kind: 'login'; readonly email: string; readonly notice: string | null }
      | { readonly kind: 'invitation'; readonly token: string }
      | { readonly kind: 'privacy'; readonly account: PublishedUser };

    function loginScreen(notice: string | null, email = ''): Screen {
      return { kind: 'login', email, notice };
    }

    function initialScreen(request: AccessRequest, account: PublishedUser | null): Screen {
      if (request.token?.kind === 'invitation') return { kind: 'invitation', token: request.token.token };
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
        case 'login':
          return (
            <LoginForm
              headingLevel={level}
              initialEmail={screen.email}
              notice={screen.notice}
              passwordResetByMail={passwordResetByMail}
              onSignedIn={signedIn}
            />
          );
      }
    };

    export default AccessScreen;
    ```

12. **Correr** `npm run test:unit -- frontend/src/features/sign-in frontend/src/shared/lib`, en verde, y después `npm run typecheck` y `npm run lint`. `AccessScreen`, `SignupForm` y `PrivacyReacceptance` quedan por debajo de 10; informá los valores en el PR.
13. **Commit:** `feat(front): el alta por invitación y la reaceptación del aviso`.

### Tarea 3.3 · `PRIVACY_VERSION` llega a la API (T028, K)

**Archivos:** `docker/compose.yaml` y `qa/compose-runs-check.ts`.

1. **El escenario en rojo** de `qa/compose-runs-check.ts`, antes de `done()`:

   ```ts
   test('the Laravel services read PRIVACY_VERSION, by default the version of the front notice', () => {
     for (const name of ['php', 'migrate', 'scheduler', 'worker-runs']) {
       assert.equal(
         compose.services[name]?.environment?.PRIVACY_VERSION,
         '${PRIVACY_VERSION:-2026-10-dev}',
         `${name} does not receive PRIVACY_VERSION`,
       );
     }
   });
   ```

   `node qa/compose-runs-check.ts` falla: hoy ningún servicio la recibe (research.md, R13).
2. **`docker/compose.yaml`.** Al final del bloque `x-laravel-env: &laravel-env`, después de `RUNS_QUEUE_RETRY_AFTER`:

   ```yaml
     PRIVACY_VERSION: '${PRIVACY_VERSION:-2026-10-dev}'
   ```

   Va en `x-laravel-env` y no en `x-laravel-base-env`, para que el servicio `test` de Pest no la herede del `.env` del host.
3. **Correr** `node qa/compose-runs-check.ts`, en verde, y `docker compose config | grep PRIVACY_VERSION`: aparece en los cuatro servicios.
4. **Commits:**
   - `test(qa): los servicios de Laravel reciben PRIVACY_VERSION, en rojo`;
   - `fix(docker): PRIVACY_VERSION llega a la API`.

### Tarea 3.4 · Los E2E del alta y del aviso, en rojo (T029, E)

**Archivos:** `qa/e2e/specs/invitation.spec.ts` y `qa/e2e/specs/privacy-notice.spec.ts`.

1. **`invitation.spec.ts`.** Cubre la historia 1, SC-001 y FR-005:

   ```ts
   import { expect, test } from '../fixtures';
   import { INVITATION, MESSAGES, STUDENT, errorBody, FIELD_MESSAGES } from '../lib/api-contract';
   import { documentWasReloaded, markDocument } from '../lib/document-marker';

   const FAILED_RESOURCE = /Failed to load resource/;
   const PASSWORD = 'una frase larga para el alta';
   const LINK = `/#invitacion=${INVITATION.token}`;

   test.describe('a person without an account and an invitation link', () => {
     test.use({ sessionAccount: null });

     test('creates the account and starts the workshop in «Mi recorrido» without reloading', async ({
       access,
       api,
       shell,
       page,
     }) => {
       await page.goto(LINK);
       await expect(page).toHaveURL(/\/$/);
       await expect(access.heading('Creá tu cuenta')).toBeVisible();
       await expect(page.getByText(`Te invitaron con ${INVITATION.email}.`)).toBeVisible();
       await expect(page.getByText('La invitación vence el 12 de octubre de 2026 a las 12:30.')).toBeVisible();
       await markDocument(page);
       const xsrf = api.xsrfValue();
       await access.createAccount('Bruno Díaz', PASSWORD);
       await expect(shell.heading('recorrido')).toBeVisible();
       expect(await documentWasReloaded(page)).toBe(false);
       const [call] = api.callsTo('POST /api/auth/invitations/accept');
       expect(call?.body).toEqual({
         token: INVITATION.token,
         name: 'Bruno Díaz',
         password: PASSWORD,
         password_confirmation: PASSWORD,
         privacyVersion: '2026-10-dev',
       });
       expect(call?.xsrf).toBe(xsrf);
       expect(call?.user).toBeUndefined();
     });

     test('stops a 14-character password and lets a 15-character one with a decomposed «á» go', async ({
       access,
       api,
       page,
     }) => {
       await page.goto(LINK);
       await access.field('Tu nombre').fill('Bruno Díaz');
       await access.field('Contraseña').fill('a'.repeat(14));
       await access.field('Repetí la contraseña').fill('a'.repeat(14));
       await page.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }).check();
       await access.button('Crear mi cuenta').click();
       await expect(page.getByText(FIELD_MESSAGES.tooShort)).toBeVisible();
       expect(api.callsTo('POST /api/auth/invitations/accept')).toHaveLength(0);
       const decomposed = `${'a'.repeat(14)}á`;
       await access.field('Contraseña').fill(decomposed);
       await access.field('Repetí la contraseña').fill(decomposed);
       await access.button('Crear mi cuenta').click();
       await expect.poll(() => api.callsTo('POST /api/auth/invitations/accept').length).toBe(1);
     });

     test('shows both reasons of the server on the password and focuses it', async ({
       access,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 422 of the sign-up');
       api.reply('POST /api/auth/invitations/accept', {
         status: 422,
         json: errorBody('validation_failed', { password: [FIELD_MESSAGES.containsName, FIELD_MESSAGES.blocked] }),
       });
       await page.goto(LINK);
       await access.createAccount('Bruno Díaz', PASSWORD);
       await expect(page.getByText(FIELD_MESSAGES.containsName)).toBeVisible();
       await expect(page.getByText(FIELD_MESSAGES.blocked)).toBeVisible();
       await expect(access.field('Contraseña')).toHaveAttribute('aria-invalid', 'true');
       await expect(access.field('Contraseña')).toBeFocused();
     });

     for (const [status, code] of [
       [404, 'invitation_not_found'],
       [410, 'invitation_expired'],
     ] as const) {
       test(`a link answered with ${status} shows the message of the server and no form`, async ({
         access,
         api,
         pageIssues,
         page,
       }) => {
         pageIssues.expectIssue(FAILED_RESOURCE, `the ${status} of the lookup`);
         api.reply('POST /api/auth/invitations/lookup', { status, json: errorBody(code) });
         await page.goto(LINK);
         await expect(access.alert()).toContainText(MESSAGES[code]);
         await expect(access.field('Tu nombre')).toHaveCount(0);
         await access.button('Ir al ingreso').click();
         await expect(access.heading('Ingresá al taller')).toBeVisible();
       });
     }

     test('an account created in the meantime offers the sign-in', async ({ access, api, pageIssues, page }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 409 of the sign-up');
       api.reply('POST /api/auth/invitations/accept', { status: 409, json: errorBody('email_taken') });
       await page.goto(LINK);
       await access.createAccount('Bruno Díaz', PASSWORD);
       await expect(access.alert()).toContainText(MESSAGES.email_taken);
       await expect(access.alert()).toContainText('Ingresá con ese email.');
       await access.button('Ir al ingreso').click();
       await expect(access.heading('Ingresá al taller')).toBeVisible();
     });

     test('reads the notice without losing what was typed', async ({ access, page }) => {
       await page.goto(LINK);
       await access.field('Tu nombre').fill('Bruno Díaz');
       await access.button('Leer el aviso').click();
       const notice = page.getByRole('dialog', { name: 'Aviso de privacidad' });
       await expect(notice).toBeVisible();
       await page.keyboard.press('Escape');
       await expect(notice).toBeHidden();
       await expect(access.field('Tu nombre')).toHaveValue('Bruno Díaz');
       await expect(page.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' })).not.toBeChecked();
     });
   });

   test.describe('a person with a live session and an invitation link', () => {
     test('still sees the sign-up of the invitation', async ({ access, page }) => {
       await page.goto(LINK);
       await expect(access.heading('Creá tu cuenta')).toBeVisible();
       await expect(page.getByText(`Te invitaron con ${INVITATION.email}.`)).toBeVisible();
       expect(STUDENT.email).not.toBe(INVITATION.email);
     });
   });
   ```

2. **`privacy-notice.spec.ts`.** Cubre la historia 4 y FR-046 a FR-048:

   ```ts
   import { expect, test } from '../fixtures';
   import { STUDENT, errorBody, FIELD_MESSAGES } from '../lib/api-contract';
   import { observeReload } from '../lib/document-marker';
   import { urls } from '../lib/urls';

   const FAILED_RESOURCE = /Failed to load resource/;
   const CHANGED = 'El aviso de privacidad cambió desde la última vez que lo aceptaste. Leelo y aceptalo para seguir.';

   test.describe('an account with an older notice', () => {
     test.use({ sessionAccount: { ...STUDENT, privacyAccepted: false } });

     test('accepts the current one before the workshop starts', async ({ access, account, api, shell, page }) => {
       await page.goto(urls.view('recorrido'));
       await expect(access.heading('Aviso de privacidad')).toBeVisible();
       await expect(page.getByText(CHANGED)).toBeVisible();
       await expect(account.entry).toHaveCount(0);
       await access.button('Acepto').click();
       await expect(shell.heading('recorrido')).toBeVisible();
       const [call] = api.callsTo('POST /api/me/privacy');
       expect(call?.body).toEqual({ privacyVersion: '2026-10-dev' });
       expect(call?.user).toBe(String(STUDENT.id));
       await expect(account.entry).toBeVisible();
     });

     test('asks to reload when the server has another version, and does not retry', async ({
       access,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 422 of the privacy notice');
       api.reply('POST /api/me/privacy', {
         status: 422,
         json: errorBody('validation_failed', { privacyVersion: [FIELD_MESSAGES.privacyChanged] }),
       });
       await page.goto(urls.view('recorrido'));
       await access.button('Acepto').click();
       await expect(access.alert()).toContainText(
         'El aviso de privacidad cambió: recargá la página para leer el vigente.',
       );
       await expect(access.button('Recargar')).toBeVisible();
       expect(api.callsTo('POST /api/me/privacy')).toHaveLength(1);
     });

     test('signs out from the notice and reloads', async ({ access, page }) => {
       await page.goto(urls.view('recorrido'));
       expect(await observeReload(page, () => access.button('Salir').click())).toBe(true);
       await expect(access.heading('Ingresá al taller')).toBeVisible();
     });
   });
   ```

3. **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e -- specs/invitation.spec.ts specs/privacy-notice.spec.ts`. Antes de T027, en rojo por la razón esperada; después de T027, en verde.
4. **Commit:** `test(qa): E2E del alta por invitación y de la reaceptación del aviso`.

### Tarea 3.5 · La compuerta de U3 (T030, K)

La compuerta de 0.4, con:

- los E2E nuevos de U3, con los anteriores, tres veces seguidas;
- en el navegador, el alta completa con la API del stack (`docker compose up`), un enlace de `taller:invite` y la versión `2026-10-dev`. Es la verificación a mano de la cookie real y del CSRF real (spec, «Alternativas consideradas»), y se declara en el PR;
- el PR `feat(front): invitation sign-up and privacy notice acceptance (F11a U3)`, contra `f11a/base`.

**Reversión de U3:** se revierten T029, T028, T027 y T026, en ese orden.

## 4. U4 · El restablecimiento, la higiene, la documentación y el peso (onda 7: A, E y K; onda 8: K)

**Cubre:** FR-042 a FR-044, FR-066 a FR-073 (las comprobaciones transversales) y FR-077; SC-001 (el restablecimiento), SC-005, SC-006 (el restablecimiento), SC-007, SC-008 y SC-011; historia 3.

### Tarea 4.1 · Las specs del restablecimiento, en rojo (T031, A)

**Archivos:** el stub de `resetPassword` en `api/access-endpoints.ts`, con su caso en `api/access-endpoints.spec.ts`; los stubs de `ui/ResetPasswordScreen.tsx` y `ui/ResetPasswordForm.tsx`; y `ui/reset-password-screen.spec.tsx`, en `frontend/src/features/sign-in/`.

1. **El caso de `access-endpoints.spec.ts`:**

   ```ts
   describe('resetPassword', () => {
     it('sends the token, the email and both passwords without opening a session', async () => {
       const { client, calls } = clientWith([{ status: 200, json: {} }]);
       const input = {
         token: '9f2c',
         email: 'ana@x.com',
         password: 'otra frase larga para el cambio',
         password_confirmation: 'otra frase larga para el cambio',
       };
       expect(await resetPassword(client, input)).toEqual({ ok: true, value: null });
       expect(calls[0]?.path).toBe('/api/auth/reset-password');
       expect(calls[0]?.body).toEqual(input);
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
     });
   });
   ```

2. **`ui/reset-password-screen.spec.tsx`.** Usa el arnés de `sign-in-screen.spec.tsx`, copiado entero, con `{presentation: 'page', reason: 'boot', token: {kind: 'reset', token: '9f2c', email: 'ana@x.com'}}` por omisión. `renderAccess` devuelve también `requests`:

   ```tsx
   const NEW_PASSWORD = 'otra frase larga para el cambio';
   const ASK_NEW_LINK = 'Pedile uno nuevo a quien administra el taller.';

   async function chooseNewPassword(user: ReturnType<typeof userEvent.setup>, password: string, confirmation = password) {
     await user.type(screen.getByLabelText('Contraseña nueva'), password);
     await user.type(screen.getByLabelText('Repetí la contraseña nueva'), confirmation);
     await user.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }));
   }

   describe('resetting the password', () => {
     it('shows the email of the link, changes the password and shows the sign-in with the email, without a session', async () => {
       const { user, calls, requests } = withReplies([{ status: 200, json: {} }]);
       expect(screen.getByText('Para ana@x.com.')).toBeInTheDocument();
       expect(screen.getByLabelText('Contraseña nueva')).toHaveFocus();
       await chooseNewPassword(user, NEW_PASSWORD);
       expect(
         await screen.findByText('Listo: tu contraseña cambió y cerramos tus sesiones abiertas. Ingresá con la nueva.'),
       ).toBeInTheDocument();
       expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
       expect(screen.getByLabelText('Contraseña')).toHaveFocus();
       expect(requests.current()).not.toBeNull();
       expect(calls[0]?.body).toEqual({
         token: '9f2c',
         email: 'ana@x.com',
         password: NEW_PASSWORD,
         password_confirmation: NEW_PASSWORD,
       });
     });

     it('shows a rejected link in the general error, with how to ask for another one', async () => {
       const { user } = withReplies([
         {
           status: 422,
           json: {
             message: 'Hay datos que corregir.',
             code: 'validation_failed',
             errors: { token: ['El enlace para restablecer la contraseña no es válido o venció.'] },
           },
         },
       ]);
       await chooseNewPassword(user, NEW_PASSWORD);
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent('El enlace para restablecer la contraseña no es válido o venció.');
       expect(alert).toHaveTextContent(ASK_NEW_LINK);
       expect(alert).toHaveFocus();
       expect(screen.getByLabelText('Contraseña nueva')).not.toHaveAttribute('aria-invalid');
     });

     it('shows a reason of the policy on the new password', async () => {
       const { user } = withReplies([
         {
           status: 422,
           json: {
             message: 'Hay datos que corregir.',
             code: 'validation_failed',
             errors: { password: ['Es una contraseña muy usada: elegí otra.'] },
           },
         },
       ]);
       await chooseNewPassword(user, NEW_PASSWORD);
       expect(await screen.findByText('Es una contraseña muy usada: elegí otra.')).toBeInTheDocument();
       expect(screen.getByLabelText('Contraseña nueva')).toHaveAttribute('aria-invalid', 'true');
     });

     it('stops a confirmation that does not match in the browser', async () => {
       const { user, calls } = withReplies([]);
       await chooseNewPassword(user, NEW_PASSWORD, 'otra frase que no es igual');
       expect(screen.getByLabelText('Repetí la contraseña nueva')).toHaveAccessibleDescription(
         'La confirmación de la contraseña no coincide.',
       );
       expect(calls).toHaveLength(0);
     });

     it('keeps the button busy while the password changes', async () => {
       const { user } = renderAccess(() => new Promise<Response>(() => {}), {
         presentation: 'page',
         reason: 'boot',
         token: { kind: 'reset', token: '9f2c', email: 'ana@x.com' },
       });
       await chooseNewPassword(user, NEW_PASSWORD);
       expect(screen.getByRole('button', { name: 'Cambiando la contraseña…' })).toBeDisabled();
     });

     it('says a link without an email is incomplete, and shows no form', () => {
       withReplies([], { presentation: 'page', reason: 'boot', token: { kind: 'reset', token: '9f2c', email: null } });
       const alert = screen.getByRole('alert');
       expect(alert).toHaveTextContent('El enlace para restablecer la contraseña no está completo.');
       expect(alert).toHaveTextContent(ASK_NEW_LINK);
       expect(screen.queryByLabelText('Contraseña nueva')).toBeNull();
     });
   });
   ```

3. **Correr** las specs: en rojo.
4. **Commit:** `test(front): specs del restablecimiento con el enlace, en rojo`.

### Tarea 4.2 · El restablecimiento (T032, A)

**Archivos:** `api/access-endpoints.ts`, `ui/access-texts.ts`, `ui/ResetPasswordScreen.tsx`, `ui/ResetPasswordForm.tsx` y `ui/AccessScreen.tsx`, en `frontend/src/features/sign-in/`.

1. **`api/access-endpoints.ts`** suma:

   ```ts
   export interface ResetInput {
     readonly token: string;
     readonly email: string;
     readonly password: string;
     readonly password_confirmation: string;
   }

   export async function resetPassword(client: ApiClient, input: ResetInput): Promise<EndpointResult<null>> {
     const result = await client.send('POST', '/api/auth/reset-password', input);
     return result.ok ? { ok: true, value: null } : result;
   }
   ```

2. **`ui/access-texts.ts`** suma:

   ```ts
   export const ASK_NEW_LINK = 'Pedile uno nuevo a quien administra el taller.';
   export const PASSWORD_CHANGED = 'Listo: tu contraseña cambió y cerramos tus sesiones abiertas. Ingresá con la nueva.';
   ```

3. **`ui/ResetPasswordForm.tsx`:**

   ```tsx
   import { useEffect } from 'react';
   import { useForm } from 'react-hook-form';
   import { checkNewPasswordLength } from '../../../entities/session';
   import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   import {
     PasswordField,
     ServerError,
     describeFailure,
     messagesOf,
     showFailure,
     useGuardedSubmit,
     useRetryCountdown,
   } from '../../../shared/ui/form';
   import { resetPassword } from '../api/access-endpoints';
   import AccessHeading from './AccessHeading';
   import { ASK_NEW_LINK, MISMATCH, PASSWORD_HINT, REQUIRED } from './access-texts';

   interface ResetValues {
     password: string;
     password_confirmation: string;
   }

   interface ResetPasswordFormProps {
     readonly token: string;
     readonly email: string;
     readonly headingLevel: 1 | 2;
     onDone(email: string): void;
   }

   const VISIBLE_FIELDS = ['password', 'password_confirmation'] as const;

   function tokenRejected(failure: ApiFailure): boolean {
     return failure.kind === 'response' && 'token' in failure.fieldErrors;
   }

   const ResetPasswordForm = ({ token, email, headingLevel, onDone }: ResetPasswordFormProps) => {
     const client = useApiClient();
     const countdown = useRetryCountdown();
     const {
       register,
       handleSubmit,
       setError,
       setFocus,
       formState: { errors, isSubmitting },
     } = useForm<ResetValues>({ criteriaMode: 'all', defaultValues: { password: '', password_confirmation: '' } });

     useEffect(() => {
       setFocus('password');
     }, [setFocus]);

     const submit = useGuardedSubmit(async (values: ResetValues) => {
       const result = await resetPassword(client, { token, email, ...values });
       if (result.ok) {
         onDone(email);
         return;
       }
       const described = describeFailure(result.failure, VISIBLE_FIELDS);
       const description = tokenRejected(result.failure)
         ? { ...described, generalMessages: [...described.generalMessages, ASK_NEW_LINK] }
         : described;
       showFailure(setError, description, VISIBLE_FIELDS);
       if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
     });

     const fieldHasError = VISIBLE_FIELDS.some((field) => errors[field] !== undefined);
     return (
       <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
         <AccessHeading level={headingLevel}>Elegí una contraseña nueva</AccessHeading>
         <p>Para {email}.</p>
         <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={!fieldHasError} />
         <PasswordField
           label="Contraseña nueva"
           autoComplete="new-password"
           hint={PASSWORD_HINT}
           registration={register('password', {
             required: REQUIRED,
             validate: { length: (value) => value === '' || checkNewPasswordLength(value) },
           })}
           messages={messagesOf(errors.password)}
         />
         <PasswordField
           label="Repetí la contraseña nueva"
           autoComplete="new-password"
           registration={register('password_confirmation', {
             required: REQUIRED,
             validate: { same: (value, values) => value === values.password || MISMATCH },
           })}
           messages={messagesOf(errors.password_confirmation)}
         />
         <div className="form-actions">
           <button className="button" type="submit" disabled={isSubmitting || countdown.waiting}>
             {isSubmitting ? 'Cambiando la contraseña…' : 'Cambiar la contraseña'}
           </button>
         </div>
       </form>
     );
   };

   export default ResetPasswordForm;
   ```

4. **`ui/ResetPasswordScreen.tsx`.** Sin hooks: elige entre el formulario y el aviso del enlace incompleto:

   ```tsx
   import { ServerError } from '../../../shared/ui/form';
   import AccessHeading from './AccessHeading';
   import { ASK_NEW_LINK } from './access-texts';
   import ResetPasswordForm from './ResetPasswordForm';

   interface ResetPasswordScreenProps {
     readonly token: string;
     readonly email: string | null;
     readonly headingLevel: 1 | 2;
     onDone(email: string): void;
   }

   const INCOMPLETE_LINK = 'El enlace para restablecer la contraseña no está completo.';

   const ResetPasswordScreen = ({ token, email, headingLevel, onDone }: ResetPasswordScreenProps) => {
     if (email !== null) {
       return <ResetPasswordForm token={token} email={email} headingLevel={headingLevel} onDone={onDone} />;
     }
     return (
       <div className="form-stack">
         <AccessHeading level={headingLevel}>Elegí una contraseña nueva</AccessHeading>
         <ServerError messages={[INCOMPLETE_LINK, ASK_NEW_LINK]} takeFocus />
       </div>
     );
   };

   export default ResetPasswordScreen;
   ```

5. **`ui/AccessScreen.tsx`.** Ésta es la versión final, y la única diferencia con la de U3 es el restablecimiento:
   - `Screen` suma `| { readonly kind: 'reset'; readonly token: string; readonly email: string | null }`;
   - `initialScreen` suma, después de la línea de la invitación:

     ```ts
     if (request.token?.kind === 'reset') {
       return { kind: 'reset', token: request.token.token, email: request.token.email };
     }
     ```

   - el `switch` suma este caso, con los imports de `ResetPasswordScreen` y de `PASSWORD_CHANGED`:

     ```tsx
     case 'reset':
       return (
         <ResetPasswordScreen
           token={screen.token}
           email={screen.email}
           headingLevel={level}
           onDone={(email) => setScreen(loginScreen(PASSWORD_CHANGED, email))}
         />
       );
     ```

6. **Correr** `npm run test:unit -- frontend/src/features/sign-in`, en verde, y después `npm run typecheck` y `npm run lint`. `initialScreen` queda en 6.
7. **Commit:** `feat(front): restablecer la contraseña con el enlace de la consola`.

### Tarea 4.3 · Los E2E del restablecimiento y de la higiene (T033, E)

**Archivos:** `qa/e2e/specs/reset-password.spec.ts`, `qa/e2e/specs/access-hygiene.spec.ts`, `qa/e2e/pages/access.ts` (suma `layer()`) y `qa/e2e/pages/account.ts` (suma `topbar`).

1. **Los Page Objects.** `AccessPage` suma el método siguiente, y `AccountPage` suma `readonly topbar: Locator`, inicializado con `page.locator('.topbar')`. La barra no tiene nombre accesible, así que el selector vive en el Page Object (`qa/AGENTS.md`):

   ```ts
   layer(): Locator {
     return this.page.locator('.access-page');
   }
   ```

2. **`reset-password.spec.ts`.** Cubre la historia 3 y SC-006:

   ```ts
   import { expect, test } from '../fixtures';
   import { FIELD_MESSAGES, RESET_LINK, errorBody } from '../lib/api-contract';

   const FAILED_RESOURCE = /Failed to load resource/;
   const NEW_PASSWORD = 'otra frase larga para el cambio';
   const LINK = `/#restablecer=${RESET_LINK.token}&email=ana%40x.com`;
   const ASK_NEW_LINK = 'Pedile uno nuevo a quien administra el taller.';

   test.use({ sessionAccount: null });

   test.describe('the reset link', () => {
     test('chooses a new password and then signs in with it, without a session in between', async ({
       access,
       api,
       shell,
       page,
     }) => {
       await page.goto(LINK);
       await expect(page).toHaveURL(/\/$/);
       await expect(page.getByText('Para ana@x.com.')).toBeVisible();
       await access.chooseNewPassword(NEW_PASSWORD);
       await expect(
         page.getByText('Listo: tu contraseña cambió y cerramos tus sesiones abiertas. Ingresá con la nueva.'),
       ).toBeVisible();
       await expect(access.field('Email')).toHaveValue('ana@x.com');
       expect(api.account).toBeNull();
       const [call] = api.callsTo('POST /api/auth/reset-password');
       expect(call?.body).toEqual({
         token: RESET_LINK.token,
         email: 'ana@x.com',
         password: NEW_PASSWORD,
         password_confirmation: NEW_PASSWORD,
       });
       expect(call?.user).toBeUndefined();
       await access.field('Contraseña').fill(NEW_PASSWORD);
       await access.button('Ingresar').click();
       await expect(shell.heading('recorrido')).toBeVisible();
     });

     test('an invalid, an expired and an unknown link show the same text', async ({
       access,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the three 422 of the reset');
       const rejected = { status: 422, json: errorBody('validation_failed', { token: [FIELD_MESSAGES.resetToken] }) };
       api.reply('POST /api/auth/reset-password', rejected, rejected, rejected);
       await page.goto(LINK);
       const texts: string[] = [];
       for (let attempt = 1; attempt <= 3; attempt += 1) {
         await access.chooseNewPassword(NEW_PASSWORD);
         await expect.poll(() => api.callsTo('POST /api/auth/reset-password').length).toBe(attempt);
         await expect(access.alert()).toContainText(ASK_NEW_LINK);
         texts.push(await access.alert().innerText());
       }
       expect(new Set(texts).size).toBe(1);
       await expect(access.alert()).toContainText(FIELD_MESSAGES.resetToken);
     });

     test('a link without a readable email says it is incomplete and shows no form', async ({ access, page }) => {
       await page.goto('/#restablecer=9f2c');
       await expect(access.alert()).toContainText('El enlace para restablecer la contraseña no está completo.');
       await expect(access.field('Contraseña nueva')).toHaveCount(0);
     });
   });
   ```

3. **`access-hygiene.spec.ts`.** Cubre SC-005 y SC-007, y FR-066 a FR-068 y FR-070:

   ```ts
   import { expect, test } from '../fixtures';
   import { INVITATION, RESET_LINK, STUDENT } from '../lib/api-contract';
   import { observeReload } from '../lib/document-marker';
   import { urls } from '../lib/urls';

   const SIGN_UP_PASSWORD = 'una frase larga para el alta';
   const NEW_PASSWORD = 'otra frase larga para el cambio';

   test.describe('nothing secret is left behind', () => {
     test.use({ sessionAccount: null });

     test('after the sign-up, the sign-out, the reset and the sign-in', async ({ access, account, shell, page }) => {
       const consoleTexts: string[] = [];
       page.on('console', (message) => consoleTexts.push(message.text()));
       await page.goto(`/#invitacion=${INVITATION.token}`);
       await access.createAccount('Bruno Díaz', SIGN_UP_PASSWORD);
       await expect(shell.heading('recorrido')).toBeVisible();
       await account.open();
       await observeReload(page, () => account.signOut());
       await page.goto(`/#restablecer=${RESET_LINK.token}&email=ana%40x.com`);
       await access.chooseNewPassword(NEW_PASSWORD);
       await access.field('Contraseña').fill(NEW_PASSWORD);
       await access.button('Ingresar').click();
       await expect(shell.heading('recorrido')).toBeVisible();
       const leftovers = await page.evaluate(() =>
         [
           ...Object.keys(localStorage).map((key) => `${key}=${localStorage.getItem(key) ?? ''}`),
           ...Object.keys(sessionStorage).map((key) => `${key}=${sessionStorage.getItem(key) ?? ''}`),
           document.cookie,
           location.href,
         ].join('\n'),
       );
       const history: string[] = [page.url()];
       for (let step = 0; step < 5; step += 1) {
         const response = await page.goBack({ waitUntil: 'commit' });
         if (response === null) break;
         history.push(page.url());
       }
       for (const secret of [SIGN_UP_PASSWORD, NEW_PASSWORD, INVITATION.token, RESET_LINK.token]) {
         expect(leftovers).not.toContain(secret);
         expect(consoleTexts.join('\n')).not.toContain(secret);
         expect(history.join('\n')).not.toContain(secret);
       }
     });
   });

   test.describe('the keyboard alone', () => {
     test.use({ sessionAccount: null });

     test('signs in, then opens and closes «Tu cuenta»', async ({ access, account, shell, page }) => {
       await page.goto(urls.view('recorrido'));
       await expect(access.field('Email')).toBeFocused();
       await page.keyboard.type(STUDENT.email);
       await page.keyboard.press('Tab');
       await expect(access.field('Contraseña')).toBeFocused();
       await page.keyboard.type('una frase larga para el taller');
       await page.keyboard.press('Enter');
       await expect(shell.heading('recorrido')).toBeVisible();
       await account.entry.focus();
       await page.keyboard.press('Enter');
       await expect(account.dialog).toBeVisible();
       await page.keyboard.press('Escape');
       await expect(account.entry).toBeFocused();
     });
   });

   for (const width of [320, 390]) {
     test.describe(`at ${width} px without an account`, () => {
       test.use({ viewport: { width, height: 760 }, sessionAccount: null });

       test('the access fits without sideways scrolling and its fields have 16 px', async ({ access, page }) => {
         await page.goto(urls.view('recorrido'));
         await expect(access.heading('Ingresá al taller')).toBeVisible();
         expect(await access.layer().evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
         const fontSize = await access.field('Email').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
         expect(fontSize).toBeGreaterThanOrEqual(16);
       });
     });

     test.describe(`at ${width} px with an account`, () => {
       test.use({ viewport: { width, height: 760 } });

       test('the top bar fits with «Tu cuenta», whose dialog takes the whole screen', async ({ account, shell }) => {
         await shell.goto(urls.view('recorrido'));
         expect(await account.topbar.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
         await account.open();
         expect((await account.dialog.boundingBox())?.width).toBe(width);
       });
     });
   }

   test.describe('with reduced motion', () => {
     test.use({ reducedMotion: 'reduce', sessionAccount: null });

     test('the buttons of the access have no transition', async ({ access, page }) => {
       await page.goto(urls.view('recorrido'));
       const transition = await access.button('Ingresar').evaluate((element) => getComputedStyle(element).transitionProperty);
       expect(transition).toBe('none');
     });
   });
   ```

4. **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e`.
   - Antes de T032, `reset-password.spec.ts` está en rojo, y `access-hygiene.spec.ts` también, porque usa el restablecimiento.
   - Después, todo en verde.
   - **Si la barra superior se desborda a 320 px,** la corrección va en `account.css`, achicando `.topbar-actions` o la entrada, y no en las reglas del shell. Se informa en el PR.
5. **Commit:** `test(qa): E2E del restablecimiento y de la higiene del acceso`.

### Tarea 4.4 · La documentación (T034, K)

Cambia en el mismo PR que U4 (FR-077):

- **`docs/architecture.md`:**
  - **el «Mapa de archivos»** suma tres filas: «Cliente de la API y formularios» (`shared/api/http` y `shared/ui/form`), «Sesión, aviso de privacidad y acceso» (`entities/session`, `entities/privacy-notice` y `features/sign-in`) y «Tu cuenta y la raíz de la cuenta» (`pages/account` y `app/account`);
  - **la fila del arranque** nombra las cuatro etapas;
  - **el «Estado actual» de Feature-Sliced Design** suma los slices nuevos.
- **`qa/AGENTS.md`:**
  - **la fila de «Arranque, compuerta…»** suma las etapas de los tokens y de sesión y sus specs, y la de «Empaquetado…» suma `vite-proxy-check`;
  - **una fila nueva, «Acceso, sesión y Tu cuenta»,** con las specs de `features/sign-in`, `pages/account`, `shared/api/http` y `shared/ui/form`, y los siete E2E de F11a;
  - **«Pruebas del front»:**
    - Vitest corre dos proyectos (`node` y `dom`), y una spec `.ts` que necesita DOM usa la directiva `// @vitest-environment jsdom`;
    - el stub mínimo de los `<dialog>`;
    - el doble de la API: la opción `sessionAccount`, `api.on` y `api.reply`, y que una ruta de `/api` sin respuesta hace fallar el test;
    - `boot-check` y `dist-content-check` responden la sesión desde `qa/lib/content-server.ts`, aparte de `requests`.
- **`AGENTS.md`, «Comandos»:**
  - `npm run dev` pasa `/api/` al stack levantado en `TALLER_PORT` (8080 por omisión);
  - la vista previa (8765) necesita el stack levantado, porque se une a su red;
  - desde F11a no se entra sin cuenta, y la sesión de 8080 vale también en 8765 y en 5173, porque las cookies no distinguen puertos;
  - `PRIVACY_VERSION` va en `.env` (opcional; por omisión, `2026-10-dev`) y tiene que coincidir con la versión de `entities/privacy-notice`.
- **`README.md`:** las mismas tres notas, y el paso de despliegue: invitar a cada alumno con `taller:invite` antes de integrar F11a y entregarle el enlace, y `taller:password-reset-link` para quien olvidó la contraseña.

**Comprobar** las rutas, los comandos y los enlaces locales de cada pasaje, y `git diff --check`. Commit: `docs: el acceso de F11a en la arquitectura, qa, AGENTS y README`.

### Tarea 4.5 · El peso, la compuerta final y el PR a `master` (T035, K)

1. **El peso** (SC-008 y FR-073). Con `npm run build`:
   - `html.length` de `dist/index.html`, contra T001;
   - el análisis de esbuild de quickstart.md §3, que separa los bytes de `node_modules/react-hook-form` de los de `frontend/src/` y de los del texto del aviso.

   **La condición de corte:** si la diferencia con T001 pasa de +60 000 caracteres o el total llega a 1 250 000, F11a no cierra. Se informa la medida y decide el usuario entre achicar y subir el tope (spec, riesgo 2).
2. **La compuerta de 0.4,** sobre `f11a/base` con U1 a U4, con:
   - la red completa (los 123 y los 7 de F11a) cinco veces seguidas, con `--repeat-each=5 --retries=0`;
   - `docker compose build taller`, con permiso;
   - la verificación a mano contra el stack (quickstart.md §4).
3. **Lo que tiene que haber hecho el usuario antes del PR a `master`:**
   - el texto del aviso y su versión. Si cambia la versión, `config/privacy-notice.ts` y la `PRIVACY_VERSION` del `.env` cambian juntos, y `privacy-notice.spec.tsx` cambia su valor esperado en el mismo commit;
   - la invitación de cada alumno;
   - la confirmación de la raíz previa al shell (spec, «Acciones del usuario»).
4. **El PR** de `f11a/base` a `master`: `feat(front): mandatory session with sign-in, invitation sign-up and password reset (F11a)`. La descripción en inglés lleva:
   - la reversión por unidad;
   - el peso, con la librería separada del código propio;
   - la verificación a mano contra el stack;
   - lo que queda para F11b, F11c, F11d y A3.

**Reversión de U4:** se revierten T034, T033, T032 y T031.

## 5. Documentación que cambia con cada unidad

| Unidad | Qué cambia |
| --- | --- |
| U0 | research.md, «Línea base de la implementación» (T001); `frontend/THIRD-PARTY-NOTICES.txt` (T002) |
| U1 | Ninguna: la documentación llega con U4, sobre la rama de integración |
| U2 | Ninguna |
| U3 | Ninguna |
| U4 | `docs/architecture.md`, `qa/AGENTS.md`, `AGENTS.md` y `README.md` (T034) |

La documentación va junta en U4 porque F11a llega a `master` en un solo PR. Las unidades intermedias no se integran en `master`, y describirlas por separado sólo produciría texto que la unidad siguiente reescribe.

## Lo que A3, F8, F11b a F11d, F12 y D1c toman de F11a

Está en el [contrato](./contracts/front-interfaces.md): cada interfaz dice qué le suma cada ítem. En resumen:

- **A3** extiende `session-gate.ts` y suma al doble las 17 porciones. Usa `fetchSession`, `sessionStore.getState().contentVersion` y `tokenStage.hadToken`, y llama a `requestSignIn({presentation: 'page', reason: 'expired'})` ante un 401. En `features/sign-in/model/sign-out.ts` suma el borrado de la copia.
- **F8** recibe desde `src/app/` el cliente y `reauthenticate`, y suma al doble `GET /api/progress`, `confirm-password` y el reset.
- **F12a** suma `isAdmin` a `entities/session`, su entrada en `AccountDialog` y su diálogo en `AccountMenu`, y usa `test.use({sessionAccount: ADMIN})` y `api.on('… /api/admin/…')`.
- **F11b** suma sus secciones a `AccountDialog` y, con F12a, mueve a un lugar compartido el pedido de la contraseña ante un 423.
- **F11c** muestra «¿Te olvidaste la contraseña?» con `passwordResetByMail`, que ya llega a `LoginForm`.
- **F11d** suma su sección a `AccountDialog`.
- **D1c** compara la cuenta con `sessionStore`.

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T011, T012 (`runBoot` y la tabla de `load-order-check`) |
| FR-002 | T010, T011, T014 |
| FR-003, FR-004 | T010, T011, T014 |
| FR-005 | T010 (token con sesión viva), T029 |
| FR-006 | T008, T009, T010 (ningún tope durante el ingreso) |
| FR-007 | T010, T024 (la sesión, dos veces y sin recargar) |
| FR-008 | T006, T007, T011 |
| FR-009 | T010, T011, T014 |
| FR-010, FR-011 | T009 (`inert` y la página), T012 (los hosts), T014 |
| FR-012, FR-013 | T022, T023, T024 |
| FR-014 | T014 |
| FR-015 a FR-018 | T004, T005; FR-016 y FR-017 también en T014 (el doble exige el CSRF) y T024 |
| FR-019 | T017, T018 (`offerReload`), T022, T023, T024 |
| FR-020 | T008, T009 (`reauthenticate`). En F11a ninguna pantalla con sesión recibe un 401 que no sea el de «Salir», que recarga (FR-050): la regla queda probada en su spec y la ejercen F11b, F8 y F12 |
| FR-021 | T017, T018, T020, T024, T014 |
| FR-022 | T004, T005, T017, T024 |
| FR-023 | T020, T024 |
| FR-024 | T020, T021 |
| FR-025 a FR-027 | T017, T018, T020, T026 |
| FR-028, FR-029 | T006, T007, T026, T029, T031 |
| FR-030 | T017, T018, T020, T024, T026, T031 |
| FR-031 | T017, T018 |
| FR-032 a FR-035 | T020, T021, T024 |
| FR-036 | T015 |
| FR-037 a FR-041 | T026, T027, T029 |
| FR-042 a FR-044 | T031, T032, T033 |
| FR-045 | T019, T028 |
| FR-046, FR-047 | T026, T027, T029 |
| FR-048 | T019, T024 |
| FR-049 a FR-052 | T020, T021, T022, T023, T024 |
| FR-066 | T020 (el foco inicial), T033 (el teclado) |
| FR-067 | T018 (16 px), T023 (la pantalla entera), T033 (320 y 390 px) |
| FR-068 | T033 |
| FR-069 | Compuerta de 0.4, paso 4, en cada unidad |
| FR-070 | T033 (SC-005); research.md, R4 |
| FR-071 | T020, T024 (el mismo texto en el ingreso), T033 (el restablecimiento) |
| FR-072 | T002 |
| FR-073 | T001, T035 |
| FR-074 | Toda tarea de código (TDD) |
| FR-075 | T014, T024, T029, T033 |
| FR-076 | T012, T013, compuerta de 0.4, paso 3 |
| FR-077 | T034, T035 |
| SC-001 | T014, T029, T033 |
| SC-002 | T014; la red en cada compuerta |
| SC-003 | T010 (el reloj), T014, T024 |
| SC-004 | La tabla siguiente |
| SC-005 | T033 |
| SC-006 | T024 (el ingreso), T033 (el restablecimiento) |
| SC-007 | T024 (el foco de vuelta), T033 |
| SC-008 | T035 |
| SC-011 | La compuerta de cada unidad |
| SC-012 | T015 |

**SC-004: cada estado de «Pantallas, endpoints y estados» de F11a con su prueba** (los cuerpos salen del contrato de C3a):

| Pantalla | Cargando | Error de campo | Error del servidor | Sesión vencida o de otra cuenta | Límite |
| --- | --- | --- | --- | --- | --- |
| Arranque | T010 («Conectando…») | — | T010, T014 (502, sin respuesta) | T014 (`user: null`) | T010, T014 (429) |
| Ingreso | T020, T024 | T020 | T020, T024 (422 `auth_failed`, 403, 502) | T004 (419) | T020, T024 (429) |
| Invitación | T026 («Revisando…») | — | T026, T029 (404, 410, 500) | T004 (419) | T017 (429) |
| Alta | T026 («Creando…») | T026, T029 | T026, T029 (409, 404 y 410 al enviar); T017 (5xx) | T004 (419) | T017 (429) |
| Restablecer | T031 («Cambiando…») | T031 | T031, T033 (`errors.token`); T017 (5xx) | T004 (419) | T017 (429) |
| Aviso | T026 («Guardando…», con el botón deshabilitado) | T026, T029 (`privacyVersion` al general) | T017 (5xx) | T026 (401 al ingreso), T017 (409 `account_mismatch` con «Recargar»), T004 (419) | T017 (429) |
| Tu cuenta | — | — | — | T008 (`reauthenticate`) | — |
| Salir | T023 («Saliendo…») | — | T022, T024 (503) | T020, T022, T024 (401 recarga; 409 «Recargar») | T017 (429) |

## Descargas y permisos

| Qué | Origen | Tamaño | Licencia | Tarea |
| --- | --- | --- | --- | --- |
| `react-hook-form` 7.89.0 | registro de npm | 1 527 796 B desempaquetado, sin dependencias | MIT | T002 |
| `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1 | registro de npm | 56 paquetes, unos 26,3 MB desempaquetados (ADR 0008) | MIT | T003, salvo que F3, F4 o F9 las hayan instalado |
| `fishery` 2.4.0 | registro de npm | 2 paquetes, unos 0,19 MB | MIT | T003 |

Ninguna otra descarga. Docker corre sólo con permiso, en T015, T030 y T035.

## Riesgos y lo que quedó sin verificar

1. **Nada corrió al planificar.** Las firmas de React Hook Form, Vitest, Playwright y Vite salen de su documentación (research.md, «Consultas»). *Mitigación:* cada tarea corre `npm run typecheck` y su spec, y la compuerta corre la red completa varias veces.
2. **El peso.** React Hook Form y el código propio pueden pasar el presupuesto de +60 000 caracteres. *Mitigación:* la condición de corte de T035 y la medida separada.
3. **La red E2E con la etapa nueva.** Un pedido más por arranque puede volver inestable alguna prueba de F1 con reloj simulado. *Mitigación:* el doble responde la sesión sin esperas, la etapa limpia sus timers y cada compuerta corre la red varias veces seguidas.
4. **La barra superior a 320 px** se calculó a mano (research.md). *Mitigación:* el E2E de T033 mide la barra, y la corrección vive en `account.css`.
5. **jsdom no implementa `<dialog>`.** Las specs usan un stub, y el foco y Esc reales los prueban los E2E.
6. **La cookie real, `SameSite` y el CSRF contra el stack** no los prueba la CI. *Mitigación:* la verificación a mano de T030 y T035.
7. **`PRIVACY_VERSION` desfasada** bloquea todas las altas. *Mitigación:* T028, la documentación de T034 y el mensaje que pide recargar (FR-047).
8. **El riesgo 6 de la spec** pedía que la entrada se dibujara en el DOM falso de `boot-check`. No se dibuja, a propósito (research.md, R11): la entrada se prueba con Testing Library y E2E.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| Dos raíces de React hasta F10: la de la cuenta y la de la vista montada | El acceso tiene que dibujarse antes de que existan las vistas, y «Tu cuenta», al costado del shell legacy (spec, «Dónde se dibuja») | Montar la cuenta dentro de `#main`: la compuerta y las vistas lo pisan con `innerHTML`. Esperar a F10: la sesión obligatoria no puede esperar |
| La vista de la sesión con `innerHTML` en `#session-status`, fuera de React | Tiene que funcionar antes de montar la raíz y en el DOM falso de `boot-check`. Repite la forma de la vista de A2, que A3 reutiliza | Dibujarla con React: obliga a montar la raíz para un mensaje de espera, y `boot-check` no la vería |
| El pedido de acceso en curso, en memoria del módulo de `features/sign-in` | «Pedir el ingreso» se espera desde la etapa, desde A3 y desde las pantallas, y dos llamadas comparten una sola promesa | Un store de Zustand: dejaría el token del enlace en el estado global, que FR-070 prohíbe |
