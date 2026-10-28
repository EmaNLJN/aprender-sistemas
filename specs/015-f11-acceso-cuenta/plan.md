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
│       ├── ui/PrivacyNoticeText.tsx, ui/PrivacyNoticeDialog.tsx, ui/privacy-notice.spec.tsx
│       └── index.ts
├── features/sign-in/                           # nuevo (A)
│   ├── model/access-request.ts, reauthenticate.ts, sign-out.ts (+ specs)
│   ├── api/access-endpoints.ts (+ .spec.ts)
│   ├── ui/AccessGate.tsx, AccessPage.tsx, AccessDialog.tsx, AccessScreen.tsx, AccessHeading.tsx
│   ├── ui/LoginForm.tsx, InvitationScreen.tsx, InvitationProblem.tsx, InvitationSummary.tsx, SignupForm.tsx
│   ├── ui/ResetPasswordScreen.tsx, PrivacyReacceptance.tsx
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
