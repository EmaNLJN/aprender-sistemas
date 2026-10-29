# Implementation Plan: F11b · La cuenta

**Branch**: `015-f11-acceso-cuenta` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F11, en su parte b: FR-053 a FR-059, los transversales FR-066 a FR-077, SC-004, SC-005, SC-007 a SC-009 y SC-011, y las historias 6 y 7. Decisiones y mediciones: [research-f11b.md](./research-f11b.md). Interfaces: [contracts/account-f11b.md](./contracts/account-f11b.md), que extiende [contracts/front-interfaces.md](./contracts/front-interfaces.md). Validación: [quickstart-f11b.md](./quickstart-f11b.md). Tareas: [tasks-f11b.md](./tasks-f11b.md). El [plan de F11a](./plan.md) fija la forma que este plan repite y la base que toma.

**Objetivo:** que un alumno con sesión cambie su contraseña, descargue los datos de su cuenta y la borre desde «Tu cuenta», sin confundir eso con «Exportar mi progreso» ni con «Borrar todo».

**Arquitectura:**

- **«Tu cuenta» suma tres botones antes de «Salir».** Cada uno abre su propio diálogo modal, con un formulario de React Hook Form.
- **La descarga usa un método nuevo del cliente, `download`,** que conserva los bytes y el nombre del adjunto. La confirmación de la contraseña vive en un slice que comparten F11b y F12a, `features/confirm-password`.
- **Las fallas de sesión pasan por `reauthenticate` de F11a,** y la supresión recarga el documento.

**Stack:** TypeScript y React 19.2.8, con React Hook Form 7.89.0 y Zustand 5.0.15, que ya instaló F11a. Las pruebas: Vitest 5.0.3 con jsdom 30.1.2, Testing Library y fishery 2.4.0 (de F11a), y Playwright 1.63.0. Ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», el contrato y la sección de tu tarea. `tasks-f11b.md` tiene una línea por tarea (T036 a T053) y remite acá.
> - **La numeración** sigue la de F11a (T001 a T035, U0 a U4): F11b va de T036 a T053, en las unidades U5 a U7. Así un commit que nombra una tarea no es ambiguo dentro de la carpeta (research-f11b.md, R19).
> - **Cómo se integra.** Las unidades son PR contra `f11b/base`, y F11b llega a `master` en un solo PR, después de F11a (R19; TR-12).
> - **El código verificado.** Ninguno. Se planificó leyendo la base de F11a en `impl-f11a` (`a7b3c71d`, rama `f11a/base`) y el plan de F11a para T022 a T035, que todavía no están implementadas. T036 compara las firmas reales antes de empezar.

## Summary

F11b suma a «Tu cuenta» las tres acciones sobre la cuenta. El enfoque:

- **Tres unidades apiladas, con un solo merge a `master`** (R19):
  - **U5, las piezas compartidas:** `download` en el cliente, `features/confirm-password`, los textos compartidos de los formularios y el modelo de `pages/account`;
  - **U6:** cambiar la contraseña (historia 6);
  - **U7:** descargar los datos y borrar la cuenta (historia 7), con la documentación y el peso.
- **El cliente suma `download`** (R20). Devuelve el `Blob` sin interpretarlo y el nombre de `Content-Disposition`, con los mismos encabezados y el mismo 419 que `send`. Un corte a mitad del cuerpo es una falla de red, sin archivo parcial.
- **La confirmación se comparte con F12a** (R23 y R24): `confirmPassword`, `WRONG_PASSWORD` e `isWrongPassword` viven en `features/confirm-password`. `PasswordStep` se queda en `pages/admin`.
- **Cada acción, en su diálogo** (R26): un portal a `body` que corta la propagación de `close` y `cancel`, para que cerrarlo no cierre «Tu cuenta».
- **Las fallas, en un solo lugar** (R27 y R30): `useAccountFailure` traduce el 422 de la contraseña, el 423, el 401, el 409, el 403 y el 429. `AccountContext` le da la cuenta y la recarga sin reenviarlas.
- **Lo que no se puede deshacer** (R28 y R30): la supresión pide la casilla, no sale si el diálogo se cerró durante la confirmación, y después del 202 recarga con «Entendido» o al cerrar.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0; las versiones de arriba.

**Primary Dependencies**: las de F11a. Ninguna nueva.

**Storage**: ninguno. El archivo descargado va directo al disco con `downloadBlob`, sin pasar por `localStorage`, `sessionStorage` ni IndexedDB (FR-056).

**Testing:**

- **Vitest,** con los proyectos de la base: `node` para `*.spec.ts` y `dom` (jsdom, con `frontend/src/vitest.setup.ts`) para `*.spec.tsx` (TR-6).
- **Los checks de `qa/`,** sin cambios.
- **Playwright,** con Page Objects contra `vite preview` y el doble de la API.

Los valores esperados salen de los contratos de C3a y C3b, de `backend/api/lang/es/` y de la spec, nunca del código que se prueba.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web, con pantallas nuevas dentro del diálogo «Tu cuenta» de F11a.

**Performance Goals**: ninguna de velocidad. El peso tiene presupuesto (R33).

**Scale/Scope:**

- unos 20 archivos de producción nuevos o cambiados en `frontend/src/` y 10 specs;
- 3 E2E nuevos, un archivo de datos de E2E y el Page Object de «Tu cuenta» ampliado;
- `docs/architecture.md`, `qa/AGENTS.md` y `contracts/front-interfaces.md`.

## Restricciones globales

Valen para toda tarea. Los valores están copiados de la spec, de la constitución y de las decisiones del coordinador.

- **La red:**
  - **sin editar:** los E2E de la base de T036 (los 123 de F1 y A2, los de F11a y los de cualquier port que ya esté), y los escenarios de `boot-check`, `dist-content-check` y `load-order-check` (FR-076);
  - **F11b no toca** `qa/boot-check.ts`, `qa/dist-content-check.ts`, `qa/load-order-check.ts`, `qa/lib/content-server.ts` ni `qa/e2e/fixtures/api-double.ts`;
  - **lo que se suma:** tres E2E (`account-password.spec.ts`, `account-data.spec.ts` y `account-hygiene.spec.ts`), `qa/e2e/lib/account-contract.ts` y métodos en `qa/e2e/pages/account.ts`.
- **Las specs de la base:** ninguna se edita, salvo dos casos:
  - **`frontend/src/entities/session/model/fetch-session.spec.ts:8`,** que suma `download` a su cliente armado a mano (R20);
  - **si F12a está en la base,** el bloque `describe('confirmPassword', …)` de `pages/admin/api/admin-endpoints.spec.ts`, que se muda con su función (T041).

  `action-dialog.spec.tsx` de F12a sigue en verde sin editarse.
- **El documento:**
  - mientras F11b no muestra nada, no hay ninguna región `alert` ni `status`: los diálogos existen sólo mientras están abiertos;
  - ningún elemento nuevo lleva la clase `.sr-only`;
  - F11b no toca la barra superior.
- **El estilo:** ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` (FR-069, SC-011). Las reglas nuevas van al final de `frontend/src/pages/account/ui/account.css`.
- **La seguridad:**
  - ninguna contraseña en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial, el store de la sesión, `window` ni la consola (FR-070). Viven en el formulario y se van con él (R29);
  - los formularios se envían sólo por `handleSubmit`, con `noValidate` y sin `action` (FR-024);
  - una contraseña equivocada muestra siempre el mismo texto (FR-071).
- **Los textos:** los de la spec, «Textos que lee el alumno», tal cual, más los de research-f11b.md, «Textos que agrega el plan». Los del servidor se muestran como llegan, salvo el 422 `auth_failed`, que nombra un email (R24).
- **La contraseña nueva:** de 15 a 64 caracteres, contados como puntos de código después de NFC, con los mensajes de `lang/es/password-policy.php` (FR-028 y FR-029).
- **Los límites:** el botón espera lo que diga `Retry-After` (FR-021). F11b no suma topes de tiempo propios.
- **El peso:** `dist/index.html` bajo `BOOT_SIZE_LIMIT`, que es **1 500 000** caracteres (`qa/build-check.ts`), y F11b suma como mucho **+15 000** sobre la medida de T036 (R33).
- **La complejidad:** ninguna función nueva de más de 10 sin justificarla en la revisión. Los avisos de `npm run lint` no suben respecto de T036.
- **La accesibilidad:**
  - todo se completa con el teclado (FR-066);
  - desde 320 px no hay desplazamiento horizontal, los campos tienen 16 px o más, y cada diálogo ocupa la pantalla entera hasta 590 px (FR-067);
  - con movimiento reducido no hay transiciones (FR-068).
- **El backend:** no cambia. Los contratos de C3a y C3b se consumen tal cual.
- **El orden:** F11b se integra después de F11a. C4 espera a F11b (decisión del usuario, 2026-10-28).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md). Resultado antes y después del diseño: pasa. Complexity Tracking registra tres decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, Feature-Sliced Design, `interface` para las formas, un componente o un hook por archivo con `export default`, y un contexto acotado en lugar de prop drilling (R27). Ni nuqs ni MSW |
| II. TDD y pruebas útiles | Sí | Cada tarea de código abre con su spec en rojo, contra stubs `const` tipados que lanzan `not implemented` (TR-2). Los valores esperados salen de los contratos, de `lang/es/` y de la spec. El archivo de la exportación lleva una «é» y espacios, para que la comparación de bytes falle si alguien lo vuelve a serializar |
| III. Código entendible | Sí | El cliente devuelve resultados, sin excepciones. Cada acción tiene su diálogo y su formulario. `useAccountFailure` es la única traducción de una falla en «Tu cuenta» |
| IV. Contenido en Git, IDs estables | Sí | `content/`, el progreso y las URL no cambian. Borrar la cuenta no toca las claves v1 del navegador (FR-058) |
| V. Capas y contratos explícitos | Sí | `features/confirm-password`, con su índice, entre `shared` y `pages`. `pages/account` no exporta nada nuevo, y `pages/admin` no se importa desde ningún otro slice |
| VI. Español, accesibilidad y portabilidad | Sí | Textos en rioplatense; teclado, foco, 320 px y movimiento reducido con E2E; comandos portables |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva. El archivo de la exportación de los E2E vive en la carpeta temporal de Playwright |
| VIII. Flow-forward | Sí | `tasks-f11b.md` tiene una línea por tarea. F11c y F11d tienen sus propios planes |

## Decisiones que aplica este plan

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **P1:** la partición de F11 | Este plan es F11b; usa el diálogo «Tu cuenta» y `reauthenticate` de F11a | Todo el plan |
| **Q3:** «Tu cuenta» es un diálogo modal | Cada acción abre otro diálogo modal desde «Tu cuenta» | T046 y T050 |
| **Q4:** salir y borrar no tocan el progreso local antes de D1c | La supresión recarga sin leer ni escribir el almacenamiento, y su texto lo dice | T050 y T051 |
| **«Pedirla siempre»** (spec, «Alternativas consideradas») | Descargar y borrar confirman la contraseña antes de cada acción | T050 |
| **C4 espera a F11b** (2026-10-28, noche) | F11b llega a `master` entera, en T053 | R19 |
| **El tope del HTML** (2026-10-28, noche) | `BOOT_SIZE_LIMIT` de 1 500 000, con un subpresupuesto de +15 000 | T053 |
| **El doble de la API canónico** (2026-10-28, noche) | Las rutas de F11b se registran con `api.on` en cada escenario, sin otro `replyTo` ni otra propiedad | T047 y T051 |
| **La lista blanca `/status of NNN/`** (2026-10-28, noche) | Cada error esperado se declara con su código exacto | T047 y T051 |
| **Los stubs del rojo como `const` tipados** (TR-2) | Cada spec en rojo corre contra stubs así | Todas las tareas de specs |
| **La «á» descompuesta con el escape** (F11a-5) | Las specs del cambio escriben `` `${'a'.repeat(14)}a\u0301` `` y el caso de 63 más «á», nunca el carácter pegado | T045 |
| **`stubDialogs` con un `showModal` que enfoca** (F11a-7) | Las specs de diálogos importan `stubDialogs` de `features/sign-in/ui/render-access.tsx` | T045 y T049 |
| **La recarga de «Salir» y su prueba** (F11a-2) | La supresión prueba la recarga con un `vi.fn()` y mata el mutante «no recarga» | T049 |
| **F11b-1 a F11b-5** (hallazgos) | El slice compartido; el error de `errors.password`; el texto propio del `auth_failed`, en el campo; las piezas de F11a | R23 a R25 y R31 |

## Project Structure

### Documentation (this feature)

```text
specs/015-f11-acceso-cuenta/
├── spec.md                         # F11 entera, con su clarify
├── plan.md, research.md, quickstart.md, tasks.md   # F11a
├── contracts/front-interfaces.md   # las interfaces de F11a (T037 y T052 lo actualizan)
├── plan-f11b.md                    # este archivo
├── research-f11b.md                # decisiones, consultas y mediciones de F11b
├── quickstart-f11b.md              # cómo se verifica F11b
├── contracts/account-f11b.md       # lo que suma F11b
└── tasks-f11b.md                   # T036 a T053
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
frontend/src/
├── shared/
│   ├── api/http/                               # (C)
│   │   ├── api-failure.ts                      # cambia: ApiDownload
│   │   ├── api-client.ts                       # cambia: download y renewingCsrf
│   │   ├── api-client.spec.ts                  # cambia: suma describe('download')
│   │   ├── attachment-name.ts (+ .spec.ts)     # nuevo: readAttachmentName
│   │   ├── fake-fetch.ts                       # cambia: FakeReply.body y cutBody
│   │   └── index.ts                            # cambia: exporta ApiDownload y readAttachmentName
│   └── ui/form/                                # (W)
│       ├── form-texts.ts                       # nuevo: REQUIRED, MISMATCH y PASSWORD_HINT
│       └── index.ts                            # cambia: los exporta
├── entities/session/model/fetch-session.spec.ts   # cambia una línea (C): download en el cliente a mano
├── features/
│   ├── confirm-password/                       # nuevo (W)
│   │   ├── api/confirm-password.ts (+ .spec.ts)   # confirmPassword
│   │   ├── model/wrong-password.ts             # WRONG_PASSWORD e isWrongPassword (los prueba confirm-password.spec.ts)
│   │   └── index.ts
│   └── sign-in/ui/access-texts.ts              # cambia (W): reexporta los tres textos
├── pages/
│   ├── account/                                # (M)
│   │   ├── model/account-context.ts (+ account-context.spec.tsx)   # nuevo
│   │   ├── model/account-failure.ts (+ .spec.ts)                   # nuevo
│   │   ├── api/account-endpoints.ts (+ .spec.ts)                   # nuevo
│   │   ├── ui/AccountActions.tsx               # nuevo: los tres botones y el diálogo abierto
│   │   ├── ui/AccountSubdialog.tsx             # nuevo: el diálogo de cada acción
│   │   ├── ui/AccountResult.tsx                # nuevo: el resultado con el foco
│   │   ├── ui/AccountFailureNotice.tsx         # nuevo: el error general con «Recargar»
│   │   ├── ui/use-account-failure.ts           # nuevo
│   │   ├── ui/use-still-mounted.ts             # nuevo
│   │   ├── ui/account-texts.ts                 # nuevo
│   │   ├── ui/ChangePasswordDialog.tsx, ChangePasswordForm.tsx       # nuevos (U6)
│   │   ├── ui/DownloadDataDialog.tsx, DownloadDataForm.tsx           # nuevos (U7)
│   │   ├── ui/DeleteAccountDialog.tsx, DeleteAccountForm.tsx, IrreversibleField.tsx   # nuevos (U7)
│   │   ├── ui/render-account.tsx               # nuevo: la ayuda de las specs de F11b
│   │   ├── ui/account-actions.spec.tsx, change-password.spec.tsx, download-data.spec.tsx, delete-account.spec.tsx   # nuevos
│   │   ├── ui/AccountDialog.tsx                # cambia: AccountActions antes de «Salir»
│   │   └── ui/account.css                      # cambia: las reglas de F11b, al final
│   └── admin/                                  # sólo si F12a está en la base (W, T041)
│       ├── api/admin-endpoints.ts (+ .spec.ts) # cambia: sin confirmPassword
│       └── ui/PasswordStep.tsx                 # cambia: importa de features/confirm-password
qa/e2e/
├── lib/account-contract.ts                     # nuevo (E)
├── pages/account.ts                            # cambia (E): actionDialog, openAction, changePassword y confirmWithPassword
└── specs/account-password.spec.ts, account-data.spec.ts y account-hygiene.spec.ts   # nuevos (E)
docs/architecture.md, qa/AGENTS.md              # cambian (K, T052)
specs/015-f11-acceso-cuenta/contracts/front-interfaces.md   # cambia (C en T037; K en T052)
```

**Structure Decision:**

- **`features/confirm-password`** es la única capa nueva. Tiene un caso real en F11b y otro en F12a (R23).
- **`pages/account`** crece por dentro, y su índice no cambia.
- **Ningún slice importa un archivo interno de otro,** salvo las specs, que importan ayudas por ruta directa:
  - `fake-fetch.ts` y `api-error.factory.ts` de `shared/api/http`;
  - `stubDialogs` y `resetSession` de `features/sign-in/ui/render-access.tsx`.

## Review Focus

Lo que el revisor mira primero:

- **La red sin editar.** El diff de `qa/` toca sólo los archivos que nombran las «Restricciones globales».
- **El cliente:**
  - `send` se comporta igual: las specs de F11a pasan sin editarse;
  - `download` nunca devuelve un `Blob` parcial y comparte el 419 con `send`.
- **Lo que no se puede deshacer:**
  - la supresión no sale sin la casilla;
  - no sale si el diálogo se cerró durante la confirmación;
  - después del 202, cualquier cierre recarga.
- **Los diálogos:**
  - cerrar una acción no cierra «Tu cuenta», y el foco vuelve a su botón;
  - el primer campo recibe el foco al abrir.
- **Los textos:** «La contraseña no es correcta.» y «La contraseña actual no es correcta.» en el campo, nunca el texto del servidor que habla de un email.
- **Ningún `style=`,** y el peso con su diferencia contra T036.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **Un cuerpo que se corta a mitad de la descarga** (spec, «Edge Cases»). Un `FakeReply` con `cutBody` entrega una parte del JSON y falla: el cliente devuelve `network`, y el formulario muestra el mensaje de la red sin llamar a `save`. Lo fijan «gives a network failure when the body is cut halfway» (T037) y «saves nothing when the download is cut halfway» (T049).
2. **El diálogo que se cierra mientras se confirma la contraseña** (FR-058, «una confirmación explícita»). Un `fetch` que retiene la confirmación hasta después del cierre exige que no salga `DELETE /api/me` ni `POST /api/me/export`. Lo fijan «does not delete the account when the dialog closed while the password was being confirmed» y su par de la descarga (T049). Sin la guarda `useStillMounted`, los dos fallan.
3. **Cerrar una acción no cierra «Tu cuenta».** React propaga `close` por el árbol de React, también a través del portal. Lo fijan «closing the action keeps «Tu cuenta» and gives the focus back to its button» (T045), que falla sin el `stopPropagation`, y el E2E de Esc en Chromium (T047).
4. **La confirmación que vence entre los dos pedidos** (un 201 y después un 423). Exige que el campo pida otra vez la contraseña y que el envío siguiente vuelva a confirmar: «asks for the password again when the confirmation expired before the export» (T049), con cuatro pedidos en orden.
5. **Los bytes que `JSON.stringify` no conserva** (SC-009, «los mismos bytes»). El archivo lleva una «é», saltos de línea y espacios. Lo fijan la spec del cliente, que compara los `Uint8Array` (T037), y el E2E, que compara el archivo guardado con `Buffer.from(texto, 'utf8')` (T051).

## Reparto en paralelo

Los dueños tienen archivos disjuntos («Project Structure»). Cada uno trabaja en su worktree sobre `f11b/base` y entrega una rama.

- **C, el cliente:** `shared/api/http` y la línea de `fetch-session.spec.ts`.
- **W, las piezas compartidas de los formularios:** `features/confirm-password`, `shared/ui/form/form-texts.ts`, `features/sign-in/ui/access-texts.ts` y, si corresponde, `pages/admin`.
- **M, «Tu cuenta»:** `pages/account`.
- **E, los E2E:** `qa/e2e/lib/account-contract.ts`, `qa/e2e/pages/account.ts` y los tres E2E.
- **K, el coordinador:** el agente principal. Hace T036, las compuertas, la documentación y el PR final, y revisa cada diff.

C, W, M y E son delegables al subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»). Se les dan sus archivos, el contrato, los valores exactos y los checks, y se les dice que no dejen comentarios.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T036, la línea base |
| 1 | C y W | **C:** T037 y T038. **W:** T039, T040 y T041 |
| 2 | M, desde S4 | T042 y T043 |
| 3 | K | T044, la compuerta de U5 |
| 4 | M y E | **M:** T045 y T046. **E:** T047 |
| 5 | K | T048, la compuerta de U6 |
| 6 | M, E y K | **M:** T049 y T050. **E:** T051. **K:** T052 |
| 7 | K | T053: el peso, la compuerta final y el PR a `master` |

**Puntos de sincronización** (siguen la numeración de F11a, que usó S0 a S3):

- **S4:** C y W entregaron T038 y T040. M parte de ahí, porque `exportAccountData` usa `client.download`, y `account-failure.ts`, `isWrongPassword`.
- **S5:** cada compuerta (T044, T048 y T053) integra su unidad en `f11b/base`.

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173`, E `4191` y M `4193`.

**Integración** (R19):

- `f11b/base` sale de `master` si F11a ya está ahí; si no, de `f11a/base` después de T035, y T036 lo anota.
- Cada unidad es un PR contra `f11b/base`, y se revierte sola.
- El PR de `f11b/base` a `master` lo abre K en T053, después del de F11a.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (historias 6 y 7, FR-053 a FR-059 y FR-066 a FR-077), research-f11b.md, los dos contratos y tu tarea;
  - las skills `tdd`, `clean-code`, `vitest` y, si escribís componentes, `react-testing` y las de Vercel;
  - si escribís E2E, `playwright-best-practices`.
- **TDD, siempre.**
  - Cada módulo nuevo empieza con su firma como un stub `const` tipado que lanza `throw new Error('not implemented')` (TR-2): `const f: (a: A) => R = () => { throw new Error('not implemented'); };`. Los componentes van como `FunctionComponent<Props>` sin parámetros sin usar. El prefijo `_` no silencia `no-unused-vars` en este repositorio.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca.
  - Los valores esperados salen de los contratos, de `backend/api/lang/es/`, de la spec o de un ejemplo resuelto a mano, nunca del módulo que se prueba ni de una factory.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Imports:** un slice se importa por su `index.ts`, y dentro de tu slice, por ruta directa. Las ayudas de specs se importan por ruta directa y sólo desde specs.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>`;
  - `npm run typecheck` y `npm run lint`;
  - `npx prettier --write <tus archivos>` antes de cada commit y, después, `npm run format:check`. El código de este plan respeta las reglas, pero no el ancho de línea de Prettier;
  - `npm run build` y, después, `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Las specs de diálogos** usan `stubDialogs()` de `features/sign-in/ui/render-access.tsx`, en un `beforeAll`. Su `showModal` enfoca el primer descendiente enfocable, como Chromium (F11a-7). No escribas otro stub.
- **La «á» descompuesta** se escribe con el escape, `` `${'a'.repeat(14)}a\u0301` ``, nunca pegando el carácter, porque al pegarlo se compone (F11a-5).
- **Los E2E de error** declaran el aviso de la consola con su código exacto: `pageIssues.expectIssue(/status of 422/, '…')`. Nunca `/Failed to load resource/` (TR-11).
- **Estilo.**
  - Código, nombres de test y comentarios en inglés; la interfaz y los mensajes en español rioplatense, con el texto exacto de la spec.
  - **Sin comentarios.** Este plan no pide ninguno.
  - `interface` para las formas de objetos.
  - Un componente o un hook por archivo, declarado como `const` con nombre, con `export default` al final. Las funciones y las constantes van con exports nombrados.
  - Ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText`.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(front): …` o `test(qa): …` para la spec en rojo;
  - `feat(front): …` para lo que cambia a propósito;
  - `refactor(front): …` para la mudanza de textos y de `confirmPassword`;
  - `docs: …` para la documentación.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. La línea base y la compuerta de cada unidad (coordinador K)

### Tarea 0.1 · La línea base (T036)

**Archivos:** `specs/015-f11-acceso-cuenta/research-f11b.md` (suma la sección «Línea base de la implementación»).

1. **La base.** Crear `f11b/base` (R19) y anotar su hash, y si salió de `master` o de `f11a/base`.
2. **Que F11a esté entera.** F11b no empieza sin «Tu cuenta» ni «Salir»:

   ```sh
   ls frontend/src/pages/account/ui/
   grep -n "SignOutSection\|PrivacyNoticeDialog\|onAdminister" frontend/src/pages/account/ui/AccountDialog.tsx
   grep -n "entryHost\|reloadDocument\|administration" frontend/src/pages/account/ui/AccountMenu.tsx
   grep -n "MISMATCH\|PASSWORD_HINT\|REQUIRED" frontend/src/features/sign-in/ui/access-texts.ts
   grep -n "export" frontend/src/features/sign-in/index.ts frontend/src/features/sign-in/ui/render-access.tsx
   ```

   **Lo que se espera:**

   - `AccountMenu.tsx`, `AccountDialog.tsx` y `SignOutSection.tsx` existen;
   - `AccountDialog` monta `<SignOutSection` y recibe `reloadDocument`;
   - `access-texts.ts` define los tres textos;
   - `features/sign-in` exporta `AccessGate`, `accessRequests`, `requestSignIn` y `reauthenticate`;
   - `render-access.tsx` exporta `stubDialogs` y `resetSession`.

   Si falta algo, F11b espera. Si una firma difiere de la del plan de F11a, se anota, y la tarea que la usa sigue la real.
3. **Lo que cambia el plan según la base:**

   ```sh
   test -d frontend/src/pages/admin && grep -rn "confirmPassword\|WRONG_PASSWORD\|isWrongPassword" frontend/src/pages/admin
   grep -n "confirm-password\|me/export\|me/password\|DELETE /api/me" qa/e2e/fixtures/api-double.ts
   git grep -n -E "ApiClient = \{|as ApiClient|satisfies ApiClient" -- frontend/src qa
   ```

   **Se anota:**

   - si F12a está y dónde viven sus copias (decide T041);
   - si F8 sumó `confirm-password` a las rutas por omisión del doble. No cambia nada, porque F11b registra sus rutas, pero se anota;
   - la lista de los clientes armados a mano. La de la planificación es una sola, `fetch-session.spec.ts:8`, y si hay más, T037 las suma.
4. **Las medidas,** con quickstart-f11b.md §1:
   - `html.length`;
   - los checks de `npm test` y las pruebas de Vitest;
   - los avisos de lint;
   - la cantidad de E2E en verde.
5. **Commit:** `docs(specs): línea base de F11b`.

### 0.2 · La compuerta de cada unidad

La corre K sobre la rama de la unidad, con quickstart-f11b.md §2, antes de abrir el PR contra `f11b/base`:

- `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`, en verde;
- los E2E completos, tres veces seguidas (`--repeat-each=3 --retries=0`), y los nuevos de la unidad en verde;
- la lista de archivos de `qa/` que cambiaron, contra la de las «Restricciones globales»;
- el `grep` de estilos en línea, sin salida;
- los avisos de lint, sin subir respecto de T036;
- el tamaño, con su diferencia contra T036, en la descripción del PR.

Cada PR lleva título en inglés, con notación de Angular, y una descripción en inglés con el problema completo (`AGENTS.md`).

## 5. U5 · Las piezas compartidas (onda 1: C y W; onda 2: M; onda 3: K)

**Cubre:** la infraestructura de FR-055 a FR-057 (`download`, la confirmación y los endpoints), FR-054 (los motivos de `errors.password`), FR-025 y FR-074.

### Tarea 5.1 · Las specs de la descarga, en rojo (T037, C)

**Archivos:**

- `frontend/src/shared/api/http/api-failure.ts` (suma `ApiDownload`);
- `frontend/src/shared/api/http/api-client.ts` (la interfaz suma `download`, y el objeto, un stub);
- `frontend/src/shared/api/http/attachment-name.ts` (stub) y `attachment-name.spec.ts`;
- `frontend/src/shared/api/http/api-client.spec.ts` (suma un `describe`);
- `frontend/src/shared/api/http/fake-fetch.ts` (suma `body` y `cutBody`);
- `frontend/src/shared/api/http/index.ts`;
- `frontend/src/entities/session/model/fetch-session.spec.ts` (línea 8);
- `specs/015-f11-acceso-cuenta/contracts/front-interfaces.md` (la sección del cliente).

**Consume:** el cliente de F11a. **Produce:** `ApiDownload`, `ApiClient.download`, `readAttachmentName` y, para las specs, `FakeReply.body` y `cutBody`.

1. **`api-failure.ts`** suma, al final:

   ```ts
   export type ApiDownload =
     | {
         readonly ok: true;
         readonly status: number;
         readonly blob: Blob;
         readonly filename: string | null;
       }
     | { readonly ok: false; readonly failure: ApiFailure };
   ```

2. **`api-client.ts`:**
   - el import de tipos pasa a `import type { ApiDownload, ApiFailure, ApiResult, FieldErrors } from './api-failure';`;
   - la interfaz `ApiClient` suma `download(method: ApiMethod, path: string, options?: ApiRequestOptions): Promise<ApiDownload>;`;
   - el objeto que devuelve `createApiClient` suma el stub `download: () => Promise.reject(new Error('not implemented')),`.
3. **`attachment-name.ts`,** el stub:

   ```ts
   export const readAttachmentName: (header: string | null) => string | null = () => {
     throw new Error('not implemented');
   };
   ```

4. **`fake-fetch.ts`.** `FakeReply` suma `readonly body?: ReadableStream<Uint8Array>;`, después de `text`. `responseOf` lo usa primero, y el archivo suma `cutBody`:

   ```ts
   function responseOf(reply: FakeReply): Response {
     if (reply.body !== undefined) {
       return new Response(reply.body, { status: reply.status, headers: reply.headers });
     }
     const text = reply.text ?? (reply.json === undefined ? '' : JSON.stringify(reply.json));
     return new Response(STATUSES_WITHOUT_BODY.has(reply.status) ? null : text, {
       status: reply.status,
       headers: reply.headers,
     });
   }

   export function cutBody(prefix: string): ReadableStream<Uint8Array> {
     return new ReadableStream<Uint8Array>({
       start(controller) {
         controller.enqueue(new TextEncoder().encode(prefix));
         controller.error(new TypeError('the connection was cut'));
       },
     });
   }
   ```

5. **`index.ts`** suma `export { readAttachmentName } from './attachment-name';` y `ApiDownload` a la lista de `export type { … } from './api-failure';`.
6. **`fetch-session.spec.ts:8`** pasa a:

   ```ts
   const client: ApiClient = {
     get,
     send: vi.fn<ApiClient['send']>(),
     download: vi.fn<ApiClient['download']>(),
   };
   ```

   Si T036 encontró otros clientes armados a mano, suman la misma línea.
7. **`attachment-name.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { readAttachmentName } from './attachment-name';

   describe('readAttachmentName', () => {
     it('reads the quoted name that the export of the API sends', () => {
       expect(readAttachmentName('attachment; filename="taller-41-20261028.json"')).toBe(
         'taller-41-20261028.json',
       );
     });

     it('reads a name without quotes', () => {
       expect(readAttachmentName('attachment; filename=taller-41-20261028.json')).toBe(
         'taller-41-20261028.json',
       );
     });

     it('gives null without a header, without a name or with only the extended form', () => {
       expect(readAttachmentName(null)).toBeNull();
       expect(readAttachmentName('inline')).toBeNull();
       expect(readAttachmentName("attachment; filename*=UTF-8''taller.json")).toBeNull();
     });
   });
   ```

8. **`api-client.spec.ts`.** El import de `./fake-fetch` pasa a `import { createFakeFetch, cutBody, type FakeReply } from './fake-fetch';`, y al final del `describe('the API client', …)` se suma:

   ```ts
   describe('download', () => {
     const FILE = '{\n  "format": "taller-export-2",\n  "account": {"name": "Ana Pérez"}\n}\n';
     const ATTACHMENT = {
       'Content-Type': 'application/json',
       'Content-Disposition': 'attachment; filename="taller-41-20261028.json"',
     };

     it('keeps the bytes of the body and the name of the attachment, with the headers of send', async () => {
       const { client, calls } = clientWith(
         [{ status: 200, text: FILE, headers: ATTACHMENT }],
         'XSRF-TOKEN=abc%3D',
       );
       const result = await client.download('POST', '/api/me/export', { asUser: 41 });
       if (!result.ok) throw new Error('the download failed');
       expect(result.filename).toBe('taller-41-20261028.json');
       expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(
         new TextEncoder().encode(FILE),
       );
       expect(calls[0]).toMatchObject({
         method: 'POST',
         path: '/api/me/export',
         credentials: 'same-origin',
         body: undefined,
       });
       expect(calls[0]?.headers['x-xsrf-token']).toBe('abc=');
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
     });

     it('gives the failure of the API when the answer is an error', async () => {
       const body = apiErrorBodyFactory.build({
         message: 'Confirmá tu contraseña para continuar.',
         code: 'password_confirmation_required',
       });
       const { client } = clientWith([{ status: 423, json: body }]);
       expect(await client.download('POST', '/api/me/export', { asUser: 41 })).toEqual({
         ok: false,
         failure: {
           kind: 'response',
           status: 423,
           code: 'password_confirmation_required',
           message: 'Confirmá tu contraseña para continuar.',
           fieldErrors: {},
           retryAfterSeconds: null,
         },
       });
     });

     it('reads Retry-After of the fourth download of the day', async () => {
       const { client } = clientWith([
         { status: 429, json: TOO_MANY, headers: { 'Retry-After': '30000' } },
       ]);
       const result = await client.download('POST', '/api/me/export', { asUser: 41 });
       expect(result).toMatchObject({ ok: false, failure: { retryAfterSeconds: 30000 } });
     });

     it('gives a network failure when the body is cut halfway', async () => {
       const { client } = clientWith([
         { status: 200, headers: ATTACHMENT, body: cutBody('{\n  "format"') },
       ]);
       expect(await client.download('POST', '/api/me/export', { asUser: 41 })).toEqual({
         ok: false,
         failure: { kind: 'network' },
       });
     });

     it('renews the session after a 419 and downloads once more with the same account', async () => {
       const { client, calls } = clientWith([
         CSRF_EXPIRED,
         sessionOf(41),
         { status: 200, text: FILE, headers: ATTACHMENT },
       ]);
       const result = await client.download('POST', '/api/me/export', { asUser: 41 });
       expect(result.ok).toBe(true);
       expect(calls.map((call) => call.path)).toEqual([
         '/api/me/export',
         '/api/session',
         '/api/me/export',
       ]);
     });

     it('does not download again when the renewed session is another account', async () => {
       const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(7)]);
       expect(await client.download('POST', '/api/me/export', { asUser: 41 })).toEqual({
         ok: false,
         failure: {
           kind: 'account-changed',
           message: 'La página venció: recargala e intentá de nuevo.',
         },
       });
       expect(calls).toHaveLength(2);
     });
   });
   ```

   `clientWith`, `CSRF_EXPIRED`, `TOO_MANY` y `sessionOf` ya están en la spec de F11a.
9. **`front-interfaces.md`,** en la sección del cliente:
   - `ApiClient` suma la línea `download(…)`;
   - `api-failure.ts` suma `ApiDownload`;
   - `read-xsrf-token.ts` va seguido de `attachment-name.ts` con `readAttachmentName`;
   - el párrafo «F11b descarga los datos con `send`…» pasa a «F11b descarga con `download`, que conserva los bytes y lee el nombre del adjunto», con un enlace a `account-f11b.md`, que está en la misma carpeta.
10. **Correr** `npm run typecheck` (en verde, porque los stubs tipan) y `npm run test:unit -- frontend/src/shared/api/http`: en rojo las tres de `readAttachmentName` y las seis de `download`, por `not implemented`. Las de F11a, en verde.
11. **Commit:** `test(front): specs de la descarga del cliente, en rojo`.

### Tarea 5.2 · La descarga (T038, C)

**Archivos:** `frontend/src/shared/api/http/api-client.ts` y `attachment-name.ts`.

1. **`attachment-name.ts`:**

   ```ts
   const QUOTED = /filename="([^"]+)"/i;
   const BARE = /filename=([^;\s"]+)/i;

   export function readAttachmentName(header: string | null): string | null {
     if (header === null) return null;
     const match = QUOTED.exec(header) ?? BARE.exec(header);
     return match?.[1] ?? null;
   }
   ```

2. **`api-client.ts`,** entero. `perform`, `parseBody`, `fieldErrorsOf`, `retryAfterOf`, `failureOf` y `sessionAccountOf` no cambian. La renovación del 419 pasa a `renewingCsrf`, que comparten `send` y `download`:

   ```ts
   import { isPlainObject } from '../../lib/is-plain-object';
   import type { ApiDownload, ApiFailure, ApiResult, FieldErrors } from './api-failure';
   import { readAttachmentName } from './attachment-name';
   import { readXsrfToken } from './read-xsrf-token';

   export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
   export type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

   export interface ApiRequestOptions {
     readonly asUser?: number;
     readonly signal?: AbortSignal;
   }

   export interface ApiClient {
     get(path: string, options?: ApiRequestOptions): Promise<ApiResult>;
     send(
       method: ApiMethod,
       path: string,
       body: unknown,
       options?: ApiRequestOptions,
     ): Promise<ApiResult>;
     download(method: ApiMethod, path: string, options?: ApiRequestOptions): Promise<ApiDownload>;
   }

   export interface ApiClientOptions {
     readonly fetch: FetchLike;
     readonly readCookies: () => string;
   }

   type Failed = { readonly ok: false; readonly failure: ApiFailure };
   type Outcome = { readonly ok: true } | Failed;

   const SESSION_PATH = '/api/session';
   const CSRF_EXPIRED = 419;
   const NOT_JSON = Symbol('not-json');
   const NETWORK: Failed = { ok: false, failure: { kind: 'network' } };

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

   function csrfExpiredMessage(result: Outcome): string | null {
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
     function headersFor(
       method: 'GET' | ApiMethod,
       asUser: number | undefined,
     ): Record<string, string> {
       const headers: Record<string, string> = { Accept: 'application/json' };
       if (method === 'GET') return headers;
       headers['Content-Type'] = 'application/json';
       headers['X-XSRF-TOKEN'] = readXsrfToken(readCookies());
       if (asUser !== undefined) headers['X-Taller-User'] = String(asUser);
       return headers;
     }

     function initFor(
       method: 'GET' | ApiMethod,
       body: unknown,
       options: ApiRequestOptions,
     ): RequestInit {
       return {
         method,
         credentials: 'same-origin',
         headers: headersFor(method, options.asUser),
         body: body === undefined ? undefined : JSON.stringify(body),
         signal: options.signal,
       };
     }

     async function perform(
       method: 'GET' | ApiMethod,
       path: string,
       body: unknown,
       options: ApiRequestOptions,
     ): Promise<ApiResult> {
       const init = initFor(method, body, options);
       let response: Response;
       let text: string;
       try {
         response = await fetch(path, init);
         text = await response.text();
       } catch {
         return NETWORK;
       }
       const parsed = parseBody(text);
       if (!response.ok) return { ok: false, failure: failureOf(response, parsed) };
       if (parsed === NOT_JSON) {
         return { ok: false, failure: { kind: 'unexpected', status: response.status } };
       }
       return { ok: true, status: response.status, body: parsed };
     }

     async function fetchFile(
       method: ApiMethod,
       path: string,
       options: ApiRequestOptions,
     ): Promise<ApiDownload> {
       const init = initFor(method, undefined, options);
       try {
         const response = await fetch(path, init);
         if (!response.ok) {
           return { ok: false, failure: failureOf(response, parseBody(await response.text())) };
         }
         const blob = await response.blob();
         const filename = readAttachmentName(response.headers.get('Content-Disposition'));
         return { ok: true, status: response.status, blob, filename };
       } catch {
         return NETWORK;
       }
     }

     async function renewingCsrf<R extends Outcome>(
       attempt: () => Promise<R>,
       options: ApiRequestOptions,
     ): Promise<R | Failed> {
       const first = await attempt();
       const expiredMessage = csrfExpiredMessage(first);
       if (expiredMessage === null) return first;
       const account = sessionAccountOf(
         await perform('GET', SESSION_PATH, undefined, { signal: options.signal }),
       );
       if (account === undefined) return first;
       if (options.asUser === undefined || account === options.asUser) return attempt();
       if (account === null) return { ok: false, failure: { kind: 'signed-out' } };
       return { ok: false, failure: { kind: 'account-changed', message: expiredMessage } };
     }

     return {
       get: (path, options = {}) => perform('GET', path, undefined, options),
       send: (method, path, body, options = {}) =>
         renewingCsrf(() => perform(method, path, body, options), options),
       download: (method, path, options = {}) =>
         renewingCsrf(() => fetchFile(method, path, options), options),
     };
   }
   ```

3. **Correr** `npm run test:unit -- frontend/src/shared/api/http`: en verde, también todas las de F11a sin editar. Después, `npm run typecheck` y `npm run lint`.
4. **Commit:** `feat(front): el cliente descarga archivos con los bytes y el nombre del servidor`.

### Tarea 5.3 · Las specs de la confirmación compartida, en rojo (T039, W)

**Archivos:** en `frontend/src/features/confirm-password/`, los stubs de `api/confirm-password.ts` y `model/wrong-password.ts`, `index.ts` y `api/confirm-password.spec.ts`.

**Consume:** el cliente. **Produce:** el slice del contrato.

1. **Los stubs:**

   ```ts
   // api/confirm-password.ts
   import type { ApiClient, ApiFailure } from '../../../shared/api/http';

   export type ConfirmPasswordOutcome =
     | { readonly ok: true; readonly value: true }
     | { readonly ok: false; readonly failure: ApiFailure };

   export const confirmPassword: (
     client: ApiClient,
     userId: number,
     password: string,
   ) => Promise<ConfirmPasswordOutcome> = () => Promise.reject(new Error('not implemented'));
   ```

   ```ts
   // model/wrong-password.ts
   import type { ApiFailure } from '../../../shared/api/http';

   export const WRONG_PASSWORD = 'La contraseña no es correcta.';

   export const isWrongPassword: (failure: ApiFailure) => boolean = () => {
     throw new Error('not implemented');
   };
   ```

   ```ts
   // index.ts
   export { confirmPassword } from './api/confirm-password';
   export type { ConfirmPasswordOutcome } from './api/confirm-password';
   export { WRONG_PASSWORD, isWrongPassword } from './model/wrong-password';
   ```

2. **`api/confirm-password.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient, type ApiFailure } from '../../../shared/api/http';
   import { apiErrorBodyFactory } from '../../../shared/api/http/api-error.factory';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { isWrongPassword } from '../model/wrong-password';
   import { confirmPassword } from './confirm-password';

   function clientWith(replies: readonly FakeReply[]) {
     const fake = createFakeFetch(replies);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     return { client, calls: fake.calls };
   }

   function response(status: number, code: string, message: string): ApiFailure {
     return { kind: 'response', status, code, message, fieldErrors: {}, retryAfterSeconds: null };
   }

   describe('confirmPassword', () => {
     it('sends the password with X-Taller-User and the CSRF token, and accepts the 201', async () => {
       const { client, calls } = clientWith([{ status: 201, json: {} }]);
       expect(await confirmPassword(client, 41, 'una frase larga')).toEqual({ ok: true, value: true });
       expect(calls[0]).toMatchObject({
         method: 'POST',
         path: '/api/auth/confirm-password',
         body: { password: 'una frase larga' },
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
       expect(calls[0]?.headers['x-xsrf-token']).toBe('abc');
     });

     it('gives back the failure of a refused password', async () => {
       const body = apiErrorBodyFactory.build({
         message: 'El email o la contraseña no son correctos.',
         code: 'auth_failed',
       });
       const { client } = clientWith([{ status: 422, json: body }]);
       expect(await confirmPassword(client, 41, 'otra')).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 422, code: 'auth_failed' },
       });
     });
   });

   describe('isWrongPassword', () => {
     it('recognizes the 422 auth_failed of a confirmation', () => {
       expect(isWrongPassword(response(422, 'auth_failed', 'El email o la contraseña no son correctos.'))).toBe(true);
     });

     it('does not take any other failure for a wrong password', () => {
       expect(isWrongPassword(response(422, 'validation_failed', 'Hay datos que corregir.'))).toBe(false);
       expect(isWrongPassword(response(423, 'password_confirmation_required', 'Confirmá tu contraseña para continuar.'))).toBe(false);
       expect(isWrongPassword({ kind: 'network' })).toBe(false);
     });
   });
   ```

3. **Correr** `npm run typecheck` y `npm run test:unit -- frontend/src/features/confirm-password`: en rojo, por `not implemented`.
4. **Commit:** `test(front): specs de la confirmación de la contraseña, en rojo`.

### Tarea 5.4 · La confirmación compartida y los textos de los formularios (T040, W)

**Archivos:** `frontend/src/features/confirm-password/api/confirm-password.ts` y `model/wrong-password.ts`; `frontend/src/shared/ui/form/form-texts.ts` (nuevo) e `index.ts`; `frontend/src/features/sign-in/ui/access-texts.ts`.

1. **`api/confirm-password.ts`.** El stub se reemplaza por:

   ```ts
   export async function confirmPassword(
     client: ApiClient,
     userId: number,
     password: string,
   ): Promise<ConfirmPasswordOutcome> {
     const result = await client.send(
       'POST',
       '/api/auth/confirm-password',
       { password },
       { asUser: userId },
     );
     return result.ok ? { ok: true, value: true } : result;
   }
   ```

2. **`model/wrong-password.ts`.** El stub se reemplaza por:

   ```ts
   const AUTH_FAILED = 'auth_failed';

   export function isWrongPassword(failure: ApiFailure): boolean {
     return failure.kind === 'response' && failure.code === AUTH_FAILED;
   }
   ```

3. **Correr** `npm run test:unit -- frontend/src/features/confirm-password`, en verde. Commit: `feat(front): la confirmación de la contraseña, compartida`.
4. **`shared/ui/form/form-texts.ts`** (R31), un refactor en verde:

   ```ts
   export const REQUIRED = 'Completá este campo.';
   export const MISMATCH = 'La confirmación de la contraseña no coincide.';
   export const PASSWORD_HINT =
     'Entre 15 y 64 caracteres. Puede ser una frase; no hace falta mezclar símbolos.';
   ```

   - `shared/ui/form/index.ts` suma `export { MISMATCH, PASSWORD_HINT, REQUIRED } from './form-texts';`.
   - En `features/sign-in/ui/access-texts.ts`, las tres constantes se reemplazan por `export { MISMATCH, PASSWORD_HINT, REQUIRED } from '../../../shared/ui/form';`. Las demás quedan.
5. **Correr** `npm run test:unit -- frontend/src/features/sign-in frontend/src/shared/ui/form` (todo en verde, sin editar ninguna spec), `npm run typecheck` y `npm run lint`.
6. **Commit:** `refactor(front): los textos de los formularios de contraseña, en shared/ui/form`.

### Tarea 5.5 · La mudanza de F12a, si F12a está en la base (T041, W)

**Si T036 anotó que `frontend/src/pages/admin` no existe,** esta tarea no tiene código. Se anota «no aplica: F12a toma `features/confirm-password` al llegar» en la línea base de research-f11b.md, y el hallazgo para F12a queda en el informe.

**Si existe,** los archivos son `frontend/src/pages/admin/api/admin-endpoints.ts`, `admin-endpoints.spec.ts` y `frontend/src/pages/admin/ui/PasswordStep.tsx`. Es un refactor en verde (R23):

1. **`PasswordStep.tsx`:**
   - el import `import { confirmPassword } from '../api/admin-endpoints';` pasa a `import { WRONG_PASSWORD, confirmPassword, isWrongPassword } from '../../../features/confirm-password';`;
   - se borran su `const WRONG_PASSWORD` y su `function isWrongPassword`;
   - del import de `shared/api/http` se quita `type ApiFailure` si ya no se usa.
2. **`admin-endpoints.ts`:** se borra la función `confirmPassword`.
3. **`admin-endpoints.spec.ts`:** se borra el bloque `describe('confirmPassword', …)` y su nombre del import. El mismo caso (`{ok: true, value: true}`, la ruta, el cuerpo y `X-Taller-User`) ya está en `features/confirm-password/api/confirm-password.spec.ts`.
4. **Comprobar** que no queda ninguna copia:

   ```sh
   grep -rn "confirmPassword\|WRONG_PASSWORD\|isWrongPassword" frontend/src/pages/admin
   git diff --stat -- frontend/src/pages/admin/ui/action-dialog.spec.tsx
   ```

   El primero muestra sólo imports de `features/confirm-password` y sus usos. El segundo no muestra nada.
5. **Si el código real de F12a difiere de su plan** (otro texto u otro nombre), la regla es la misma: `features/confirm-password` es la única fuente, y ninguna otra spec de `pages/admin` se edita. La diferencia se anota en el PR. Si el texto de F12a no es «La contraseña no es correcta.», se detiene y se consulta al coordinador.
6. **Correr** `npm run test:unit -- frontend/src/pages/admin frontend/src/features/confirm-password` (en verde), `npm run typecheck` y `npm run lint`.
7. **Commit:** `refactor(front): la administración confirma la contraseña con el slice compartido`.

### Tarea 5.6 · Las specs del modelo de «Tu cuenta», en rojo (T042, M, desde S4)

**Archivos:** en `frontend/src/pages/account/`, los stubs de `model/account-context.ts`, `model/account-failure.ts` y `api/account-endpoints.ts`, y las specs `model/account-context.spec.tsx`, `model/account-failure.spec.ts` y `api/account-endpoints.spec.ts`.

**Consume:** de C, `download` y el cliente; de W, `isWrongPassword`; de F11a, `describeFailure` y `PublishedUser`. **Produce:** `AccountContext`, `useAccountContext`, `describeAccountFailure`, `passwordProblem`, `changePassword`, `exportAccountData` y `deleteAccount`.

1. **Los stubs:**

   ```ts
   // model/account-context.ts
   import { createContext } from 'react';
   import type { PublishedUser } from '../../../entities/session';

   export interface AccountContextValue {
     readonly account: PublishedUser;
     reloadDocument(): void;
   }

   export const AccountContext = createContext<AccountContextValue | null>(null);

   export const useAccountContext: () => AccountContextValue = () => {
     throw new Error('not implemented');
   };
   ```

   ```ts
   // model/account-failure.ts
   import type { ApiFailure } from '../../../shared/api/http';
   import type { FailureDescription } from '../../../shared/ui/form';

   export const describeAccountFailure: (
     failure: ApiFailure,
     visibleFields: readonly string[],
   ) => FailureDescription = () => {
     throw new Error('not implemented');
   };

   export const passwordProblem: (
     failure: ApiFailure,
     wrongPasswordMessage: string,
   ) => string | null = () => {
     throw new Error('not implemented');
   };
   ```

   ```ts
   // api/account-endpoints.ts
   import type { ApiClient, ApiFailure } from '../../../shared/api/http';

   export type AccountOutcome<T> =
     | { readonly ok: true; readonly value: T }
     | { readonly ok: false; readonly failure: ApiFailure };

   export interface PasswordChange {
     readonly current_password: string;
     readonly password: string;
     readonly password_confirmation: string;
   }

   export interface AccountFile {
     readonly blob: Blob;
     readonly filename: string;
   }

   const notImplemented = (): Promise<never> => Promise.reject(new Error('not implemented'));

   export const changePassword: (
     client: ApiClient,
     userId: number,
     change: PasswordChange,
   ) => Promise<AccountOutcome<true>> = notImplemented;

   export const exportAccountData: (
     client: ApiClient,
     userId: number,
   ) => Promise<AccountOutcome<AccountFile>> = notImplemented;

   export const deleteAccount: (
     client: ApiClient,
     userId: number,
   ) => Promise<AccountOutcome<string | null>> = notImplemented;
   ```

2. **`model/account-context.spec.tsx`:**

   ```tsx
   import { render, screen } from '@testing-library/react';
   import { describe, expect, it, vi } from 'vitest';
   import type { PublishedUser } from '../../../entities/session';
   import { AccountContext, useAccountContext } from './account-context';

   const ANA: PublishedUser = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };

   const Probe = () => <p>{useAccountContext().account.email}</p>;

   describe('the account context', () => {
     it('gives the account of «Tu cuenta» to whoever reads it', () => {
       render(
         <AccountContext value={{ account: ANA, reloadDocument: vi.fn() }}>
           <Probe />
         </AccountContext>,
       );
       expect(screen.getByText('ana@x.com')).toBeInTheDocument();
     });

     it('fails loudly without «Tu cuenta» around', () => {
       const silenced = vi.spyOn(console, 'error').mockImplementation(() => {});
       expect(() => render(<Probe />)).toThrow('Falta AccountContext: «Tu cuenta» provee la cuenta.');
       silenced.mockRestore();
     });
   });
   ```

3. **`model/account-failure.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import { describeAccountFailure, passwordProblem } from './account-failure';

   function response(
     status: number,
     code: string,
     message: string,
     fieldErrors: Record<string, string[]> = {},
   ): ApiFailure {
     return { kind: 'response', status, code, message, fieldErrors, retryAfterSeconds: null };
   }

   const DISABLED = 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.';
   const OWN_TEXT = 'La contraseña no es correcta.';

   describe('describeAccountFailure', () => {
     it('shows the message of a disabled account and offers to reload', () => {
       expect(describeAccountFailure(response(403, 'account_disabled', DISABLED), [])).toEqual({
         fieldMessages: {},
         generalMessages: [DISABLED],
         retryAfterSeconds: null,
         offerReload: true,
         signedOut: false,
       });
     });

     it('keeps the reload of a session of another account', () => {
       const mismatch = response(409, 'account_mismatch', 'La sesión cambió de cuenta: recargá la página.');
       expect(describeAccountFailure(mismatch, []).offerReload).toBe(true);
     });

     it('shows the message of the only admin without offering to reload', () => {
       const lastAdmin = response(409, 'last_admin', 'Tiene que quedar al menos un admin activo.');
       expect(describeAccountFailure(lastAdmin, [])).toMatchObject({
         generalMessages: ['Tiene que quedar al menos un admin activo.'],
         offerReload: false,
       });
     });

     it('puts the reasons of a visible field on that field', () => {
       const policy = response(422, 'validation_failed', 'Hay datos que corregir.', {
         password: ['Es una contraseña muy usada: elegí otra.', 'No puede contener tu nombre.'],
       });
       expect(describeAccountFailure(policy, ['password']).fieldMessages).toEqual({
         password: ['Es una contraseña muy usada: elegí otra.', 'No puede contener tu nombre.'],
       });
     });
   });

   describe('passwordProblem', () => {
     it('replaces the text of a refused password, which talks about an email', () => {
       const refused = response(422, 'auth_failed', 'El email o la contraseña no son correctos.');
       expect(passwordProblem(refused, OWN_TEXT)).toBe(OWN_TEXT);
     });

     it('keeps the message of the server when the confirmation expired', () => {
       const expired = response(423, 'password_confirmation_required', 'Confirmá tu contraseña para continuar.');
       expect(passwordProblem(expired, OWN_TEXT)).toBe('Confirmá tu contraseña para continuar.');
     });

     it('leaves every other failure to the general handling', () => {
       expect(passwordProblem(response(422, 'validation_failed', 'Hay datos que corregir.'), OWN_TEXT)).toBeNull();
       expect(
         passwordProblem(
           response(429, 'too_many_requests', 'Demasiados intentos. Esperá un momento antes de volver a probar.'),
           OWN_TEXT,
         ),
       ).toBeNull();
       expect(passwordProblem({ kind: 'network' }, OWN_TEXT)).toBeNull();
       expect(passwordProblem({ kind: 'signed-out' }, OWN_TEXT)).toBeNull();
     });
   });
   ```

4. **`api/account-endpoints.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from '../../../shared/api/http';
   import { apiErrorBodyFactory } from '../../../shared/api/http/api-error.factory';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { changePassword, deleteAccount, exportAccountData } from './account-endpoints';

   const ANA_ID = 41;
   const FILE = '{\n  "format": "taller-export-2",\n  "account": {"name": "Ana Pérez"}\n}\n';
   const CHANGE = {
     current_password: 'una frase larga para el taller',
     password: 'otra frase larga para cambiar',
     password_confirmation: 'otra frase larga para cambiar',
   };

   function clientWith(replies: readonly FakeReply[]) {
     const fake = createFakeFetch(replies);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     return { client, calls: fake.calls };
   }

   describe('changePassword', () => {
     it('sends the three fields with PUT and X-Taller-User, and accepts the 200', async () => {
       const { client, calls } = clientWith([{ status: 200, json: { data: { id: ANA_ID } } }]);
       expect(await changePassword(client, ANA_ID, CHANGE)).toEqual({ ok: true, value: true });
       expect(calls[0]).toMatchObject({ method: 'PUT', path: '/api/me/password', body: CHANGE });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
     });

     it('gives back the failure of a refused current password', async () => {
       const body = apiErrorBodyFactory.build({
         message: 'El email o la contraseña no son correctos.',
         code: 'auth_failed',
       });
       const { client } = clientWith([{ status: 422, json: body }]);
       expect(await changePassword(client, ANA_ID, CHANGE)).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 422, code: 'auth_failed' },
       });
     });
   });

   describe('exportAccountData', () => {
     it('downloads with POST and X-Taller-User, with the name and the bytes of the file', async () => {
       const { client, calls } = clientWith([
         {
           status: 200,
           text: FILE,
           headers: {
             'Content-Type': 'application/json',
             'Content-Disposition': 'attachment; filename="taller-41-20261028.json"',
           },
         },
       ]);
       const result = await exportAccountData(client, ANA_ID);
       if (!result.ok) throw new Error('the export failed');
       expect(result.value.filename).toBe('taller-41-20261028.json');
       expect(new Uint8Array(await result.value.blob.arrayBuffer())).toEqual(
         new TextEncoder().encode(FILE),
       );
       expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/me/export' });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
     });

     it('names the file taller-datos.json when the answer brings no name', async () => {
       const { client } = clientWith([{ status: 200, text: FILE }]);
       const result = await exportAccountData(client, ANA_ID);
       expect(result.ok ? result.value.filename : null).toBe('taller-datos.json');
     });

     it('gives back the failure of an expired confirmation', async () => {
       const { client } = clientWith([
         {
           status: 423,
           json: { message: 'Confirmá tu contraseña para continuar.', code: 'password_confirmation_required' },
         },
       ]);
       expect(await exportAccountData(client, ANA_ID)).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 423 },
       });
     });
   });

   describe('deleteAccount', () => {
     it('deletes with DELETE and X-Taller-User, without a body, and gives the message of the 202', async () => {
       const { client, calls } = clientWith([
         { status: 202, json: { data: { status: 'deleting' }, message: 'Mensaje del servidor.' } },
       ]);
       expect(await deleteAccount(client, ANA_ID)).toEqual({ ok: true, value: 'Mensaje del servidor.' });
       expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/api/me', body: undefined });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
     });

     it('gives null when the 202 brings no message', async () => {
       const { client } = clientWith([{ status: 202, json: { data: { status: 'deleting' } } }]);
       expect(await deleteAccount(client, ANA_ID)).toEqual({ ok: true, value: null });
     });

     it('gives back the failure of the only admin', async () => {
       const { client } = clientWith([
         { status: 409, json: { message: 'Tiene que quedar al menos un admin activo.', code: 'last_admin' } },
       ]);
       expect(await deleteAccount(client, ANA_ID)).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 409, code: 'last_admin' },
       });
     });
   });
   ```

5. **Correr** `npm run typecheck` y `npm run test:unit -- frontend/src/pages/account`: en rojo por `not implemented` las nuevas, y en verde la spec de «Tu cuenta» de F11a.
6. **Commit:** `test(front): specs del modelo de las acciones de «Tu cuenta», en rojo`.

### Tarea 5.7 · El modelo de «Tu cuenta» (T043, M)

**Archivos:** `frontend/src/pages/account/model/account-context.ts`, `model/account-failure.ts` y `api/account-endpoints.ts`.

1. **`model/account-context.ts`.** El stub de `useAccountContext` se reemplaza por:

   ```ts
   export function useAccountContext(): AccountContextValue {
     const value = useContext(AccountContext);
     if (value === null) throw new Error('Falta AccountContext: «Tu cuenta» provee la cuenta.');
     return value;
   }
   ```

   El import pasa a `import { createContext, useContext } from 'react';`.
2. **`model/account-failure.ts`:**

   ```ts
   import { isWrongPassword } from '../../../features/confirm-password';
   import type { ApiFailure } from '../../../shared/api/http';
   import { describeFailure, type FailureDescription } from '../../../shared/ui/form';

   const PASSWORD_REQUIRED = 423;
   const ACCOUNT_DISABLED = 'account_disabled';

   export function describeAccountFailure(
     failure: ApiFailure,
     visibleFields: readonly string[],
   ): FailureDescription {
     const description = describeFailure(failure, visibleFields);
     if (failure.kind === 'response' && failure.code === ACCOUNT_DISABLED) {
       return { ...description, offerReload: true };
     }
     return description;
   }

   export function passwordProblem(failure: ApiFailure, wrongPasswordMessage: string): string | null {
     if (isWrongPassword(failure)) return wrongPasswordMessage;
     if (failure.kind === 'response' && failure.status === PASSWORD_REQUIRED) return failure.message;
     return null;
   }
   ```

3. **`api/account-endpoints.ts`.** Los tipos quedan, y los stubs se reemplazan por:

   ```ts
   import { isPlainObject } from '../../../shared/lib/is-plain-object';

   const NAMELESS_FILE = 'taller-datos.json';

   export async function changePassword(
     client: ApiClient,
     userId: number,
     change: PasswordChange,
   ): Promise<AccountOutcome<true>> {
     const result = await client.send('PUT', '/api/me/password', change, { asUser: userId });
     return result.ok ? { ok: true, value: true } : result;
   }

   export async function exportAccountData(
     client: ApiClient,
     userId: number,
   ): Promise<AccountOutcome<AccountFile>> {
     const result = await client.download('POST', '/api/me/export', { asUser: userId });
     if (!result.ok) return result;
     return { ok: true, value: { blob: result.blob, filename: result.filename ?? NAMELESS_FILE } };
   }

   function messageOf(body: unknown): string | null {
     if (!isPlainObject(body)) return null;
     return typeof body.message === 'string' && body.message !== '' ? body.message : null;
   }

   export async function deleteAccount(
     client: ApiClient,
     userId: number,
   ): Promise<AccountOutcome<string | null>> {
     const result = await client.send('DELETE', '/api/me', undefined, { asUser: userId });
     return result.ok ? { ok: true, value: messageOf(result.body) } : result;
   }
   ```

   El import de `isPlainObject` va con los demás, al principio del archivo.
4. **Correr** `npm run test:unit -- frontend/src/pages/account`, en verde, y después `npm run typecheck` y `npm run lint`.
5. **Commit:** `feat(front): el modelo de las acciones de «Tu cuenta»`.

### Tarea 5.8 · La compuerta de U5 (T044, K)

La compuerta de 0.2, con:

- las specs de `shared/api/http` de F11a en verde sin editar;
- `git diff --stat f11b/base -- frontend/src/pages/admin`: vacío si T041 no aplicó; si aplicó, sólo los tres archivos de la tarea;
- el PR `feat(front): the client downloads files, and the password confirmation becomes shared (F11b U5)`, contra `f11b/base`.

**Reversión de U5:** se revierten T043, T042, T041, T040, T039, T038 y T037, en ese orden.

## 6. U6 · Cambiar la contraseña (onda 4: M y E; onda 5: K)

**Cubre:** FR-053 y FR-054; en el cambio, FR-019 a FR-021, FR-023 y FR-025 a FR-031; FR-066, FR-067 y FR-069; la historia 6.

### Tarea 6.1 · Las specs del cambio, en rojo (T045, M)

**Archivos:** en `frontend/src/pages/account/ui/`:

- la ayuda `render-account.tsx`, completa;
- los stubs de `AccountSubdialog.tsx`, `AccountResult.tsx`, `AccountFailureNotice.tsx`, `use-account-failure.ts`, `ChangePasswordForm.tsx`, `ChangePasswordDialog.tsx` y `AccountActions.tsx`;
- las specs `account-actions.spec.tsx` y `change-password.spec.tsx`.

**Consume:** de U5, el modelo y los endpoints; de F11a, `AccountMenu`, `AccessGate`, `accessRequests`, `reauthenticate`, `requestSignIn`, `shared/ui/form` y, en las specs, `stubDialogs` y `resetSession` de `features/sign-in/ui/render-access.tsx`. **Produce:** las firmas del contrato para estos componentes.

1. **`render-account.tsx`,** la ayuda que importan las specs de F11b. Monta `AccessGate` con el `accessRequests` de la feature, que es el mismo que usa `reauthenticate`, para que un 401 muestre el ingreso de verdad:

   ```tsx
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import type { ReactNode } from 'react';
   import { vi, type Mock } from 'vitest';
   import type { PublishedUser } from '../../../entities/session';
   import { AccessGate, accessRequests } from '../../../features/sign-in';
   import { ApiClientContext, createApiClient, type FetchLike } from '../../../shared/api/http';
   import { apiErrorBodyFactory } from '../../../shared/api/http/api-error.factory';
   import {
     createFakeFetch,
     type FakeReply,
     type RecordedCall,
   } from '../../../shared/api/http/fake-fetch';
   import { AccountContext } from '../model/account-context';

   export type AccountUser = ReturnType<typeof userEvent.setup>;

   export interface RenderedAccount {
     readonly user: AccountUser;
     readonly calls: readonly RecordedCall[];
     readonly reloadDocument: Mock<() => void>;
   }

   export interface HeldFetch {
     readonly fetch: FetchLike;
     readonly calls: readonly RecordedCall[];
     release(): void;
   }

   interface ErrorExtras {
     readonly errors?: Record<string, string[]>;
     readonly headers?: Readonly<Record<string, string>>;
   }

   export const ANA: PublishedUser = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };

   export function renderWithFetch(
     ui: ReactNode,
     fetch: FetchLike,
     calls: readonly RecordedCall[],
   ): RenderedAccount {
     const user = userEvent.setup();
     const client = createApiClient({ fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     const reloadDocument = vi.fn<() => void>();
     render(
       <ApiClientContext value={client}>
         <AccessGate requests={accessRequests} setShellInert={vi.fn()} reloadDocument={reloadDocument} />
         <AccountContext value={{ account: ANA, reloadDocument }}>{ui}</AccountContext>
       </ApiClientContext>,
     );
     return { user, calls, reloadDocument };
   }

   export function renderWithReplies(
     ui: ReactNode,
     replies: readonly (FakeReply | 'network-error')[],
   ): RenderedAccount {
     const fake = createFakeFetch(replies);
     return renderWithFetch(ui, fake.fetch, fake.calls);
   }

   export function holdFirstReply(replies: readonly FakeReply[]): HeldFetch {
     const fake = createFakeFetch(replies);
     let release: () => void = () => {};
     const held = new Promise<void>((resolve) => {
       release = resolve;
     });
     let first = true;
     const fetch: FetchLike = async (path, init) => {
       if (first) {
         first = false;
         await held;
       }
       return fake.fetch(path, init);
     };
     return { fetch, calls: fake.calls, release: () => release() };
   }

   export function errorReply(
     status: number,
     code: string,
     message: string,
     extras: ErrorExtras = {},
   ): FakeReply {
     const body = apiErrorBodyFactory.build({ message, code, errors: extras.errors });
     return { status, json: body, headers: extras.headers };
   }

   export async function typeInto(user: AccountUser, label: string, value: string): Promise<void> {
     await user.click(screen.getByLabelText(label));
     await user.paste(value);
   }

   export async function signInAgain(user: AccountUser, email: string, password: string): Promise<void> {
     await typeInto(user, 'Email', email);
     await typeInto(user, 'Contraseña', password);
     await user.click(screen.getByRole('button', { name: 'Ingresar' }));
   }
   ```

   `holdFirstReply` retiene el primer pedido hasta `release()`, y lo anota recién cuando lo suelta. Lo usan la prueba del doble clic y las de cerrar durante la confirmación.

   `accessRequests` es un singleton del módulo. Cada spec que lleva al ingreso lo termina, para no dejar un pedido abierto en la prueba siguiente.
2. **Los stubs,** con la forma de TR-2. Por ejemplo, `ChangePasswordDialog.tsx`:

   ```tsx
   import type { FunctionComponent } from 'react';

   interface ChangePasswordDialogProps {
     onClose(): void;
   }

   const ChangePasswordDialog: FunctionComponent<ChangePasswordDialogProps> = () => {
     throw new Error('not implemented');
   };

   export default ChangePasswordDialog;
   ```

   Los otros cinco componentes van igual, con las props del contrato. `use-account-failure.ts` es:

   ```ts
   import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
   import type { ApiFailure } from '../../../shared/api/http';

   export interface PasswordRule<T extends FieldValues> {
     readonly field: Path<T>;
     readonly wrongMessage: string;
   }

   export interface AccountFailureHandling {
     handle(failure: ApiFailure): void;
     readonly offerReload: boolean;
     readonly waiting: boolean;
     reloadDocument(): void;
   }

   const useAccountFailure: <T extends FieldValues>(
     setError: UseFormSetError<T>,
     visibleFields: readonly Path<T>[],
     password: PasswordRule<T>,
   ) => AccountFailureHandling = () => {
     throw new Error('not implemented');
   };

   export default useAccountFailure;
   ```

3. **`account-actions.spec.tsx`.** En rojo hasta que `AccountDialog` monte `AccountActions`:

   ```tsx
   import { render, screen, waitFor, within } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { resetSession, stubDialogs } from '../../../features/sign-in/ui/render-access';
   import { ApiClientContext, createApiClient } from '../../../shared/api/http';
   import { createFakeFetch } from '../../../shared/api/http/fake-fetch';
   import AccountMenu from './AccountMenu';
   import { ANA } from './render-account';

   let entryHost: HTMLElement;

   beforeAll(stubDialogs);

   beforeEach(() => {
     entryHost = document.createElement('div');
     document.body.append(entryHost);
     resetSession(ANA);
   });

   afterEach(() => {
     entryHost.remove();
   });

   async function openAccount() {
     const user = userEvent.setup();
     const client = createApiClient({
       fetch: createFakeFetch([]).fetch,
       readCookies: () => 'XSRF-TOKEN=abc',
     });
     render(
       <ApiClientContext value={client}>
         <AccountMenu entryHost={entryHost} reloadDocument={vi.fn()} />
       </ApiClientContext>,
     );
     await user.click(within(entryHost).getByRole('button', { name: 'Tu cuenta' }));
     return { user, account: screen.getByRole('dialog', { name: 'Tu cuenta' }) };
   }

   function buttonNames(container: HTMLElement): string[] {
     return within(container)
       .getAllByRole('button')
       .map((button) => button.textContent ?? '');
   }

   describe('the actions of «Tu cuenta»', () => {
     it('offers to change the password after the privacy notice and before «Salir»', async () => {
       const { account } = await openAccount();
       const names = buttonNames(account);
       expect(names).toContain('Cambiar la contraseña');
       expect(names.indexOf('Aviso de privacidad')).toBeLessThan(names.indexOf('Cambiar la contraseña'));
       expect(names.indexOf('Cambiar la contraseña')).toBeLessThan(names.indexOf('Salir'));
     });

     it('opens its own dialog, outside «Tu cuenta», with the focus on the first field', async () => {
       const { user, account } = await openAccount();
       await user.click(within(account).getByRole('button', { name: 'Cambiar la contraseña' }));
       const action = screen.getByRole('dialog', { name: 'Cambiar la contraseña' });
       await waitFor(() => expect(within(action).getByLabelText('Contraseña actual')).toHaveFocus());
       expect(account).not.toContainElement(action);
     });

     it('closing the action keeps «Tu cuenta» and gives the focus back to its button', async () => {
       const { user, account } = await openAccount();
       const opener = within(account).getByRole('button', { name: 'Cambiar la contraseña' });
       await user.click(opener);
       const action = screen.getByRole('dialog', { name: 'Cambiar la contraseña' });
       await user.click(within(action).getByRole('button', { name: 'Cerrar' }));
       expect(screen.queryByRole('dialog', { name: 'Cambiar la contraseña' })).toBeNull();
       expect(screen.getByRole('dialog', { name: 'Tu cuenta' })).toBeInTheDocument();
       expect(opener).toHaveFocus();
     });
   });
   ```

   **Por qué la tercera prueba importa** (Review Focus 3): sin el `stopPropagation` de `AccountSubdialog`, el `close` del diálogo de la acción llega por el árbol de React al `onClose` de «Tu cuenta», y los dos se cierran.
4. **`change-password.spec.tsx`.** Los valores esperados salen de `lang/es/` y de la spec:

   ```tsx
   import { screen, waitFor } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { resetSession, stubDialogs } from '../../../features/sign-in/ui/render-access';
   import ChangePasswordDialog from './ChangePasswordDialog';
   import {
     ANA,
     errorReply,
     holdFirstReply,
     renderWithFetch,
     renderWithReplies,
     signInAgain,
     typeInto,
     type AccountUser,
   } from './render-account';

   const CURRENT = 'una frase larga para el taller';
   const NEW_PASSWORD = 'otra frase larga para cambiar';
   const CHANGED = 'Tu contraseña cambió. Cerramos tus otras sesiones; esta sigue abierta.';
   const CHANGE_ACCEPTED = { status: 200, json: { data: ANA } };
   const TOO_MANY = 'Demasiados intentos. Esperá un momento antes de volver a probar.';

   beforeAll(stubDialogs);

   beforeEach(() => {
     resetSession(ANA);
   });

   async function fillChange(
     user: AccountUser,
     password = NEW_PASSWORD,
     confirmation = password,
   ): Promise<void> {
     await typeInto(user, 'Contraseña actual', CURRENT);
     await typeInto(user, 'Contraseña nueva', password);
     await typeInto(user, 'Repetí la contraseña nueva', confirmation);
   }

   async function changeTo(user: AccountUser, password = NEW_PASSWORD, confirmation = password): Promise<void> {
     await fillChange(user, password, confirmation);
     await user.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }));
   }

   const dialog = (onClose = vi.fn()) => <ChangePasswordDialog onClose={onClose} />;

   describe('changing the password', () => {
     it('sends the three fields with X-Taller-User and says that this session goes on', async () => {
       const onClose = vi.fn();
       const { user, calls } = renderWithReplies(dialog(onClose), [CHANGE_ACCEPTED]);
       await changeTo(user);
       const result = await screen.findByRole('status');
       expect(result).toHaveTextContent(CHANGED);
       expect(result).toHaveFocus();
       expect(screen.queryByLabelText('Contraseña actual')).toBeNull();
       expect(calls[0]).toMatchObject({
         method: 'PUT',
         path: '/api/me/password',
         body: { current_password: CURRENT, password: NEW_PASSWORD, password_confirmation: NEW_PASSWORD },
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('41');
       await user.click(screen.getByRole('button', { name: 'Listo' }));
       expect(onClose).toHaveBeenCalledOnce();
     });

     it('marks the current password with its own text when the server refuses it', async () => {
       const { user } = renderWithReplies(dialog(), [
         errorReply(422, 'auth_failed', 'El email o la contraseña no son correctos.'),
       ]);
       await changeTo(user);
       const current = screen.getByLabelText('Contraseña actual');
       await waitFor(() => expect(current).toHaveAttribute('aria-invalid', 'true'));
       expect(current).toHaveAccessibleDescription('La contraseña actual no es correcta.');
       expect(current).toHaveFocus();
       expect(screen.queryByText('El email o la contraseña no son correctos.')).toBeNull();
     });

     it('puts on the new password the confirmation that the server refuses', async () => {
       const { user } = renderWithReplies(dialog(), [
         errorReply(422, 'validation_failed', 'Hay datos que corregir.', {
           errors: { password: ['La confirmación de contraseña no coincide.'] },
         }),
       ]);
       await changeTo(user);
       const fresh = screen.getByLabelText('Contraseña nueva');
       await waitFor(() => expect(fresh).toHaveAttribute('aria-invalid', 'true'));
       expect(fresh).toHaveAccessibleDescription(/La confirmación de contraseña no coincide\./);
       expect(screen.getByLabelText('Repetí la contraseña nueva')).not.toHaveAttribute('aria-invalid');
     });

     it('shows every reason of the policy on the new password', async () => {
       const { user } = renderWithReplies(dialog(), [
         errorReply(422, 'validation_failed', 'Hay datos que corregir.', {
           errors: { password: ['Es una contraseña muy usada: elegí otra.', 'No puede contener tu nombre.'] },
         }),
       ]);
       await changeTo(user);
       expect(await screen.findByText('Es una contraseña muy usada: elegí otra.')).toBeInTheDocument();
       expect(screen.getByText('No puede contener tu nombre.')).toBeInTheDocument();
     });

     it('sends nothing with a short new password or a confirmation that does not match', async () => {
       const { user, calls } = renderWithReplies(dialog(), [CHANGE_ACCEPTED]);
       await changeTo(user, 'a'.repeat(14), 'b'.repeat(15));
       expect(await screen.findByText('Tiene que tener al menos 15 caracteres.')).toBeInTheDocument();
       expect(screen.getByText('La confirmación de la contraseña no coincide.')).toBeInTheDocument();
       expect(calls).toHaveLength(0);
     });

     it.each([`${'a'.repeat(14)}a\u0301`, `${'a'.repeat(63)}a\u0301`])(
       'sends %j, which has 15 or 64 characters after NFC',
       async (password) => {
         const { user, calls } = renderWithReplies(dialog(), [CHANGE_ACCEPTED]);
         await changeTo(user, password);
         await screen.findByRole('status');
         expect(calls[0]?.body).toMatchObject({ password, password_confirmation: password });
       },
     );

     it('refuses 65 characters after NFC, which are 66 UTF-16 units', async () => {
       const { user, calls } = renderWithReplies(dialog(), [CHANGE_ACCEPTED]);
       await changeTo(user, `${'a'.repeat(64)}a\u0301`);
       expect(await screen.findByText('Puede tener hasta 64 caracteres.')).toBeInTheDocument();
       expect(calls).toHaveLength(0);
     });

     it('waits for Retry-After before letting the button send again', async () => {
       const { user } = renderWithReplies(dialog(), [
         errorReply(429, 'too_many_requests', TOO_MANY, { headers: { 'Retry-After': '60' } }),
       ]);
       await changeTo(user);
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent(TOO_MANY);
       expect(alert).toHaveTextContent('Podés volver a intentar en 1 minuto.');
       expect(screen.getByRole('button', { name: 'Cambiar la contraseña' })).toBeDisabled();
     });

     it('keeps the button busy while the server answers and sends once', async () => {
       const held = holdFirstReply([CHANGE_ACCEPTED]);
       const { user } = renderWithFetch(dialog(), held.fetch, held.calls);
       await fillChange(user);
       await user.dblClick(screen.getByRole('button', { name: 'Cambiar la contraseña' }));
       expect(await screen.findByRole('button', { name: 'Cambiando la contraseña…' })).toBeDisabled();
       held.release();
       await screen.findByRole('status');
       expect(held.calls).toHaveLength(1);
     });

     it('asks to sign in again after a 401 and keeps what was typed when the same account comes back', async () => {
       const { user, calls, reloadDocument } = renderWithReplies(dialog(), [
         errorReply(401, 'unauthenticated', 'Iniciá sesión para continuar.'),
         { status: 200, json: { data: ANA } },
         CHANGE_ACCEPTED,
       ]);
       await changeTo(user);
       await screen.findByRole('dialog', { name: 'Ingresá al taller' });
       await signInAgain(user, ANA.email, CURRENT);
       await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ingresá al taller' })).toBeNull());
       expect(screen.getByLabelText('Contraseña actual')).toHaveValue(CURRENT);
       await user.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }));
       expect(await screen.findByRole('status')).toHaveTextContent(CHANGED);
       expect(calls.map((call) => call.path)).toEqual([
         '/api/me/password',
         '/api/auth/login',
         '/api/me/password',
       ]);
       expect(reloadDocument).not.toHaveBeenCalled();
     });

     it('reloads the document when another account signs in after a 401', async () => {
       const beto = { ...ANA, id: 7, name: 'Beto Gómez', email: 'beto@x.com' };
       const { user, reloadDocument } = renderWithReplies(dialog(), [
         errorReply(401, 'unauthenticated', 'Iniciá sesión para continuar.'),
         { status: 200, json: { data: beto } },
       ]);
       await changeTo(user);
       await screen.findByRole('dialog', { name: 'Ingresá al taller' });
       await signInAgain(user, beto.email, CURRENT);
       await waitFor(() => expect(reloadDocument).toHaveBeenCalledOnce());
     });

     it.each([
       [409, 'account_mismatch', 'La sesión cambió de cuenta: recargá la página.'],
       [403, 'account_disabled', 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.'],
     ])('shows the message of a %i %s and offers to reload', async (status, code, message) => {
       const { user, reloadDocument } = renderWithReplies(dialog(), [errorReply(status, code, message)]);
       await changeTo(user);
       expect(await screen.findByRole('alert')).toHaveTextContent(message);
       await user.click(screen.getByRole('button', { name: 'Recargar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });
   });
   ```

5. **Correr** `npm run typecheck` y `npm run test:unit -- frontend/src/pages/account`: en rojo las dos specs nuevas, por `not implemented` o porque falta el botón. En verde, `account-menu.spec.tsx` de F11a y las del modelo de U5.
6. **Commit:** `test(front): specs del cambio de contraseña en «Tu cuenta», en rojo`.

### Tarea 6.2 · El cambio de contraseña (T046, M)

**Archivos:** en `frontend/src/pages/account/ui/`, `account-texts.ts` (nuevo), los siete componentes y hooks de 6.1, `AccountDialog.tsx` y `account.css`.

1. **`account-texts.ts`:**

   ```ts
   export const PASSWORD_TITLE = 'Cambiar la contraseña';
   export const PASSWORD_CHANGED = 'Tu contraseña cambió. Cerramos tus otras sesiones; esta sigue abierta.';
   export const CURRENT_PASSWORD_WRONG = 'La contraseña actual no es correcta.';
   ```

2. **`AccountSubdialog.tsx`.** Corta `close` y `cancel`, que React propaga por su árbol también a través del portal (R26). Devuelve el foco con `useLayoutEffect`, como `AccessDialog` de F11a:

   ```tsx
   import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

   interface AccountSubdialogProps {
     readonly title: string;
     readonly children: ReactNode;
     onClose(): void;
   }

   const AccountSubdialog = ({ title, children, onClose }: AccountSubdialogProps) => {
     const dialog = useRef<HTMLDialogElement>(null);
     const titleId = useId();
     useLayoutEffect(() => {
       const element = dialog.current;
       const opener = document.activeElement;
       if (element !== null && !element.open) element.showModal();
       return () => {
         if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
       };
     }, []);
     return (
       <dialog
         ref={dialog}
         className="account-subdialog"
         aria-labelledby={titleId}
         onCancel={(event) => event.stopPropagation()}
         onClose={(event) => {
           event.stopPropagation();
           onClose();
         }}
       >
         <div className="dialog-content">
           <div className="dialog-top">
             <h2 id={titleId}>{title}</h2>
             <button
               type="button"
               className="close-dialog"
               aria-label="Cerrar"
               onClick={() => dialog.current?.close()}
             >
               ×
             </button>
           </div>
           {children}
         </div>
       </dialog>
     );
   };

   export default AccountSubdialog;
   ```

3. **`AccountResult.tsx`.** El mensaje toma el foco, para que se anuncie y deje el botón a un Tab (R29):

   ```tsx
   import { useEffect, useRef } from 'react';

   interface AccountResultProps {
     readonly message: string;
     readonly actionLabel: string;
     onAction(): void;
   }

   const AccountResult = ({ message, actionLabel, onAction }: AccountResultProps) => {
     const notice = useRef<HTMLParagraphElement>(null);
     useEffect(() => {
       notice.current?.focus();
     }, []);
     return (
       <div className="form-stack">
         <p ref={notice} className="account-result" role="status" tabIndex={-1}>
           {message}
         </p>
         <div className="dialog-actions">
           <button type="button" className="button" onClick={onAction}>
             {actionLabel}
           </button>
         </div>
       </div>
     );
   };

   export default AccountResult;
   ```

4. **`AccountFailureNotice.tsx`,** el error general con «Recargar» cuando hace falta:

   ```tsx
   import { ServerError } from '../../../shared/ui/form';

   interface AccountFailureNoticeProps {
     readonly messages: readonly string[];
     readonly takeFocus: boolean;
     readonly offerReload: boolean;
     onReload(): void;
   }

   const AccountFailureNotice = ({ messages, takeFocus, offerReload, onReload }: AccountFailureNoticeProps) => (
     <ServerError messages={messages} takeFocus={takeFocus}>
       {offerReload ? (
         <button className="button secondary" type="button" onClick={onReload}>
           Recargar
         </button>
       ) : null}
     </ServerError>
   );

   export default AccountFailureNotice;
   ```

5. **`use-account-failure.ts`.** Los tipos de 6.1 quedan, y el stub se reemplaza por el hook. Es la única traducción de una falla en las acciones de «Tu cuenta» (R27 y R30):

   ```ts
   import { useState } from 'react';
   import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
   import { reauthenticate, requestSignIn } from '../../../features/sign-in';
   import type { ApiFailure } from '../../../shared/api/http';
   import { showFailure, useRetryCountdown } from '../../../shared/ui/form';
   import { useAccountContext } from '../model/account-context';
   import { describeAccountFailure, passwordProblem } from '../model/account-failure';

   export interface PasswordRule<T extends FieldValues> {
     readonly field: Path<T>;
     readonly wrongMessage: string;
   }

   export interface AccountFailureHandling {
     handle(failure: ApiFailure): void;
     readonly offerReload: boolean;
     readonly waiting: boolean;
     reloadDocument(): void;
   }

   const useAccountFailure = <T extends FieldValues>(
     setError: UseFormSetError<T>,
     visibleFields: readonly Path<T>[],
     password: PasswordRule<T>,
   ): AccountFailureHandling => {
     const { account, reloadDocument } = useAccountContext();
     const countdown = useRetryCountdown();
     const [offerReload, setOfferReload] = useState(false);
     const handle = (failure: ApiFailure): void => {
       const problem = passwordProblem(failure, password.wrongMessage);
       if (problem !== null) {
         setError(password.field, { type: 'server', message: problem }, { shouldFocus: true });
         return;
       }
       const description = describeAccountFailure(failure, visibleFields);
       if (description.signedOut) {
         void reauthenticate(account.id, { requestSignIn, reloadDocument });
         return;
       }
       showFailure(setError, description, visibleFields);
       setOfferReload(description.offerReload);
       if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
     };
     return { handle, offerReload, waiting: countdown.waiting, reloadDocument };
   };

   export default useAccountFailure;
   ```

   `reauthenticate` no se espera: el botón vuelve a quedar libre mientras el ingreso está abierto, y con la misma cuenta el alumno sigue donde estaba, con lo escrito (FR-020).
6. **`ChangePasswordForm.tsx`.** El `auth_failed` marca «Contraseña actual» con su texto (FR-054); la confirmación que el servidor rechaza llega en `errors.password` y va a la contraseña nueva por `showFailure` (F11b-2):

   ```tsx
   import { useEffect } from 'react';
   import { useForm } from 'react-hook-form';
   import { checkNewPasswordLength } from '../../../entities/session';
   import { useApiClient } from '../../../shared/api/http';
   import {
     MISMATCH,
     PASSWORD_HINT,
     PasswordField,
     REQUIRED,
     messagesOf,
     useGuardedSubmit,
   } from '../../../shared/ui/form';
   import { changePassword } from '../api/account-endpoints';
   import { useAccountContext } from '../model/account-context';
   import AccountFailureNotice from './AccountFailureNotice';
   import { CURRENT_PASSWORD_WRONG } from './account-texts';
   import useAccountFailure from './use-account-failure';

   interface ChangePasswordValues {
     current_password: string;
     password: string;
     password_confirmation: string;
   }

   interface ChangePasswordFormProps {
     onChanged(): void;
   }

   const VISIBLE_FIELDS = ['current_password', 'password', 'password_confirmation'] as const;
   const PASSWORD_RULE = { field: 'current_password', wrongMessage: CURRENT_PASSWORD_WRONG } as const;

   const ChangePasswordForm = ({ onChanged }: ChangePasswordFormProps) => {
     const client = useApiClient();
     const { account } = useAccountContext();
     const {
       register,
       handleSubmit,
       setError,
       setFocus,
       formState: { errors, isSubmitting },
     } = useForm<ChangePasswordValues>({
       criteriaMode: 'all',
       defaultValues: { current_password: '', password: '', password_confirmation: '' },
     });
     const failure = useAccountFailure(setError, VISIBLE_FIELDS, PASSWORD_RULE);

     useEffect(() => {
       setFocus('current_password');
     }, [setFocus]);

     const submit = useGuardedSubmit(async (values: ChangePasswordValues) => {
       const result = await changePassword(client, account.id, values);
       if (result.ok) {
         onChanged();
         return;
       }
       failure.handle(result.failure);
     });

     const fieldHasError = VISIBLE_FIELDS.some((field) => errors[field] !== undefined);
     return (
       <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
         <AccountFailureNotice
           messages={messagesOf(errors.root?.serverError)}
           takeFocus={!fieldHasError}
           offerReload={failure.offerReload}
           onReload={failure.reloadDocument}
         />
         <PasswordField
           label="Contraseña actual"
           autoComplete="current-password"
           registration={register('current_password', { required: REQUIRED })}
           messages={messagesOf(errors.current_password)}
         />
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
           <button className="button" type="submit" disabled={isSubmitting || failure.waiting}>
             {isSubmitting ? 'Cambiando la contraseña…' : 'Cambiar la contraseña'}
           </button>
         </div>
       </form>
     );
   };

   export default ChangePasswordForm;
   ```

7. **`ChangePasswordDialog.tsx`.** Con el 200, el formulario se desmonta y queda el resultado (R29):

   ```tsx
   import { useState } from 'react';
   import AccountResult from './AccountResult';
   import AccountSubdialog from './AccountSubdialog';
   import { PASSWORD_CHANGED, PASSWORD_TITLE } from './account-texts';
   import ChangePasswordForm from './ChangePasswordForm';

   interface ChangePasswordDialogProps {
     onClose(): void;
   }

   const ChangePasswordDialog = ({ onClose }: ChangePasswordDialogProps) => {
     const [changed, setChanged] = useState(false);
     return (
       <AccountSubdialog title={PASSWORD_TITLE} onClose={onClose}>
         {changed ? (
           <AccountResult message={PASSWORD_CHANGED} actionLabel="Listo" onAction={onClose} />
         ) : (
           <ChangePasswordForm onChanged={() => setChanged(true)} />
         )}
       </AccountSubdialog>
     );
   };

   export default ChangePasswordDialog;
   ```

8. **`AccountActions.tsx`,** la versión de U6. El diálogo abierto va con un portal a `body` (R26). U7 suma los otros dos botones:

   ```tsx
   import { useState } from 'react';
   import { createPortal } from 'react-dom';
   import ChangePasswordDialog from './ChangePasswordDialog';

   type AccountAction = 'password';

   const AccountActions = () => {
     const [open, setOpen] = useState<AccountAction | null>(null);
     const close = (): void => setOpen(null);
     return (
       <div className="account-actions">
         <button type="button" className="text-button" onClick={() => setOpen('password')}>
           Cambiar la contraseña
         </button>
         {open === 'password' ? createPortal(<ChangePasswordDialog onClose={close} />, document.body) : null}
       </div>
     );
   };

   export default AccountActions;
   ```

9. **`AccountDialog.tsx`.** Suma dos imports y un bloque justo antes de `<SignOutSection` (R26). Con la versión de T023 de F11a queda así. Si la base trae el slot de la administración (F11a-1, `onAdminister`) o cualquier otra diferencia que anotó T036, se conserva tal cual, y el cambio sigue siendo sólo los imports y el bloque:

   ```tsx
   import { useEffect, useId, useRef, useState } from 'react';
   import { PrivacyNoticeDialog } from '../../../entities/privacy-notice';
   import type { PublishedUser } from '../../../entities/session';
   import { AccountContext } from '../model/account-context';
   import AccountActions from './AccountActions';
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
             <AccountContext value={{ account, reloadDocument }}>
               <AccountActions />
             </AccountContext>
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

10. **`account.css`** suma, al final:

    ```css
    .account-actions {
      display: grid;
      justify-items: start;
      gap: 10px;
      margin-top: 20px;
    }
    .account-subdialog {
      width: min(520px, calc(100% - 32px));
    }
    .account-result:focus {
      outline: 3px solid var(--accent);
      outline-offset: 4px;
    }
    @media (max-width: 590px) {
      .account-subdialog {
        width: 100%;
        max-width: none;
        height: 100%;
        max-height: none;
        margin: 0;
        border-radius: 0;
      }
    }
    ```

11. **Correr** `npm run test:unit -- frontend/src/pages/account` (en verde, también `account-menu.spec.tsx` de F11a sin editar), `npm run typecheck` y `npm run lint`. Ninguna función nueva pasa de 10 de complejidad: `handle` tiene 4.
12. **Commit:** `feat(front): cambiar la contraseña desde «Tu cuenta»`.

### Tarea 6.3 · Los E2E del cambio, en rojo (T047, E)

**Archivos:** `qa/e2e/lib/account-contract.ts` (nuevo), `qa/e2e/pages/account.ts` y `qa/e2e/specs/account-password.spec.ts` (nuevo).

**Consume:** el doble de la API y los Page Objects de F11a. **Produce:** el contrato de los E2E de F11b.

1. **`qa/e2e/lib/account-contract.ts`.** Los textos salen de `backend/api/lang/es/`. El archivo de la exportación lleva una «é», saltos de línea y espacios que `JSON.stringify` no conserva (R32):

   ```ts
   export const ACCOUNT_MESSAGES = {
     password_confirmation_required: 'Confirmá tu contraseña para continuar.',
     last_admin: 'Tiene que quedar al menos un admin activo.',
   } as const;

   export const DELETION_MESSAGE =
     'Se está borrando tu cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';

   export const CONFIRMED_MISMATCH = 'La confirmación de contraseña no coincide.';

   export const EXPORT_FILE = {
     name: 'taller-41-20261028.json',
     text: '{\n  "format": "taller-export-2",\n  "exportedAt": "2026-10-28T15:30:00.000Z",\n  "account": {"id": 41, "name": "Ana Pérez", "email": "ana@x.com"},\n  "progress": {"exercises": []},\n  "attempts": [],\n  "imports": []\n}\n',
   } as const;

   export function accountError(code: keyof typeof ACCOUNT_MESSAGES) {
     return { message: ACCOUNT_MESSAGES[code], code };
   }
   ```

2. **`qa/e2e/pages/account.ts`.** Arriba de la clase se suman el tipo y la tabla, y dentro de `AccountPage`, los cuatro métodos. `button(name)` de F11a busca dentro de «Tu cuenta», y como el diálogo de cada acción vive en `body` (R26), encuentra sólo el botón que lo abre:

   ```ts
   export type AccountAction = 'Cambiar la contraseña' | 'Descargar mis datos' | 'Borrar mi cuenta';

   const ACTION_TITLES: Readonly<Record<AccountAction, string>> = {
     'Cambiar la contraseña': 'Cambiar la contraseña',
     'Descargar mis datos': 'Descargá los datos de tu cuenta',
     'Borrar mi cuenta': 'Borrar tu cuenta',
   };
   ```

   ```ts
     actionDialog(action: AccountAction): Locator {
       return this.page.getByRole('dialog', { name: ACTION_TITLES[action], exact: true });
     }

     async openAction(action: AccountAction): Promise<Locator> {
       await this.button(action).click();
       const dialog = this.actionDialog(action);
       await dialog.waitFor();
       return dialog;
     }

     async changePassword(current: string, next: string, confirmation = next): Promise<void> {
       const dialog = this.actionDialog('Cambiar la contraseña');
       await dialog.getByLabel('Contraseña actual', { exact: true }).fill(current);
       await dialog.getByLabel('Contraseña nueva', { exact: true }).fill(next);
       await dialog.getByLabel('Repetí la contraseña nueva', { exact: true }).fill(confirmation);
       await dialog.getByRole('button', { name: 'Cambiar la contraseña', exact: true }).click();
     }

     async confirmWithPassword(
       action: 'Descargar mis datos' | 'Borrar mi cuenta',
       password: string,
     ): Promise<void> {
       const dialog = this.actionDialog(action);
       await dialog.getByLabel('Tu contraseña', { exact: true }).fill(password);
       if (action === 'Borrar mi cuenta') {
         await dialog.getByRole('checkbox', { name: 'Entiendo que no se puede deshacer.' }).check();
       }
       await dialog.getByRole('button', { name: action, exact: true }).click();
     }
   ```

3. **`qa/e2e/specs/account-password.spec.ts`.** Cubre la historia 6 y, en el cambio, FR-019 a FR-021, FR-054 y FR-066:

   ```ts
   import { expect, test } from '../fixtures';
   import { CONFIRMED_MISMATCH } from '../lib/account-contract';
   import { MESSAGES, STUDENT, errorBody } from '../lib/api-contract';
   import { urls } from '../lib/urls';

   const CURRENT = 'una frase larga para el taller';
   const NEW_PASSWORD = 'otra frase larga para cambiar';
   const CHANGED = 'Tu contraseña cambió. Cerramos tus otras sesiones; esta sigue abierta.';

   test.describe('changing the password from «Tu cuenta»', () => {
     test('sends the three fields with X-Taller-User and the CSRF token, and this session goes on', async ({
       account,
       api,
       shell,
     }) => {
       api.on('PUT /api/me/password', () => ({ status: 200, json: { data: STUDENT } }));
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Cambiar la contraseña');
       await expect(dialog.getByLabel('Contraseña actual', { exact: true })).toBeFocused();
       await account.changePassword(CURRENT, NEW_PASSWORD);
       await expect(dialog.getByRole('status')).toHaveText(CHANGED);
       const [call] = api.callsTo('PUT /api/me/password');
       expect(call?.user).toBe(String(STUDENT.id));
       expect(call?.xsrf).toBe(api.xsrfValue());
       expect(call?.body).toEqual({
         current_password: CURRENT,
         password: NEW_PASSWORD,
         password_confirmation: NEW_PASSWORD,
       });
       await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
       await expect(dialog).toBeHidden();
       await expect(account.dialog).toBeVisible();
     });

     test('marks the current password with its own text, never with the one about the email', async ({
       account,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 422/, 'the 422 auth_failed of the password change');
       api.on('PUT /api/me/password', () => ({ status: 422, json: errorBody('auth_failed') }));
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Cambiar la contraseña');
       await account.changePassword('una contraseña que no es', NEW_PASSWORD);
       const current = dialog.getByLabel('Contraseña actual', { exact: true });
       await expect(current).toHaveAttribute('aria-invalid', 'true');
       await expect(current).toBeFocused();
       await expect(dialog.getByText('La contraseña actual no es correcta.')).toBeVisible();
       await expect(dialog.getByText(MESSAGES.auth_failed)).toHaveCount(0);
     });

     test('puts on the new password the confirmation that the server refuses', async ({
       account,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 422/, 'the 422 validation_failed of the password change');
       api.on('PUT /api/me/password', () => ({
         status: 422,
         json: errorBody('validation_failed', { password: [CONFIRMED_MISMATCH] }),
       }));
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Cambiar la contraseña');
       await account.changePassword(CURRENT, NEW_PASSWORD);
       await expect(dialog.getByLabel('Contraseña nueva', { exact: true })).toHaveAttribute(
         'aria-invalid',
         'true',
       );
       await expect(dialog.getByText(CONFIRMED_MISMATCH)).toBeVisible();
     });

     test('signs in again after a 401, and the dialog keeps what was typed', async ({
       access,
       account,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 401/, 'the 401 of the password change');
       api.reply('PUT /api/me/password', { status: 401, json: errorBody('unauthenticated') });
       api.on('PUT /api/me/password', () => ({ status: 200, json: { data: STUDENT } }));
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Cambiar la contraseña');
       await account.changePassword(CURRENT, NEW_PASSWORD);
       await expect(access.heading('Ingresá al taller')).toBeVisible();
       await access.signIn(STUDENT.email, CURRENT);
       await expect(access.heading('Ingresá al taller')).toBeHidden();
       await expect(dialog.getByLabel('Contraseña actual', { exact: true })).toHaveValue(CURRENT);
       await dialog.getByRole('button', { name: 'Cambiar la contraseña', exact: true }).click();
       await expect(dialog.getByRole('status')).toHaveText(CHANGED);
       expect(api.callsTo('PUT /api/me/password')).toHaveLength(2);
       expect(api.callsTo('POST /api/auth/login')).toHaveLength(1);
     });

     test('waits for Retry-After before letting the button send again', async ({
       account,
       api,
       pageIssues,
       shell,
       page,
     }) => {
       pageIssues.expectIssue(/status of 429/, 'the 429 of the password change');
       await page.clock.install();
       api.on('PUT /api/me/password', () => ({
         status: 429,
         headers: { 'Retry-After': '60' },
         json: errorBody('too_many_requests'),
       }));
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Cambiar la contraseña');
       await account.changePassword(CURRENT, NEW_PASSWORD);
       await expect(dialog.getByRole('alert')).toContainText('Podés volver a intentar en 1 minuto.');
       const send = dialog.getByRole('button', { name: 'Cambiar la contraseña', exact: true });
       await expect(send).toBeDisabled();
       await page.clock.fastForward(59_000);
       await expect(send).toBeDisabled();
       await page.clock.fastForward(1_000);
       await expect(send).toBeEnabled();
     });

     test('Esc closes the action and goes back to «Tu cuenta», with the focus on its button', async ({
       account,
       shell,
       page,
     }) => {
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Cambiar la contraseña');
       await page.keyboard.press('Escape');
       await expect(dialog).toBeHidden();
       await expect(account.dialog).toBeVisible();
       await expect(account.button('Cambiar la contraseña')).toBeFocused();
     });
   });
   ```

4. **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e -- specs/account-password.spec.ts`. Antes de T046, falla por la razón esperada: «Tu cuenta» no tiene el botón «Cambiar la contraseña». Después, en verde.
5. **Commit:** `test(qa): E2E del cambio de contraseña, en rojo`.

### Tarea 6.4 · La compuerta de U6 (T048, K)

La compuerta de 0.2, con:

- `account-password.spec.ts` en verde, y la red completa tres veces seguidas;
- en el navegador, a 1 280 y a 390 px, «Tu cuenta» con «Cambiar la contraseña» antes de «Salir», y su diálogo a pantalla entera en el celular;
- el PR `feat(front): change the password from «Tu cuenta» (F11b U6)`, contra `f11b/base`.

**Reversión de U6:** se revierten T047, T046 y T045, en ese orden.

## 7. U7 · Descargar los datos y borrar la cuenta (onda 6: M, E y K; onda 7: K)

**Cubre:** FR-055 a FR-059; en las dos pantallas, FR-019 a FR-021, FR-023, FR-025 a FR-027 y FR-030; los transversales FR-066 a FR-071 con sus E2E, y FR-073, FR-076 y FR-077; SC-004 (las filas de F11b), SC-005, SC-007 a SC-009 y SC-011; la historia 7.

### Tarea 7.1 · Las specs de la descarga y de la supresión, en rojo (T049, M)

**Archivos:** en `frontend/src/pages/account/ui/`:

- los stubs de `use-still-mounted.ts`, `IrreversibleField.tsx`, `DownloadDataForm.tsx`, `DownloadDataDialog.tsx`, `DeleteAccountForm.tsx` y `DeleteAccountDialog.tsx`, con la forma de TR-2 y las props del contrato;
- `download-data.spec.tsx` y `delete-account.spec.tsx`, nuevas;
- `account-actions.spec.tsx`, que suma una prueba.

`use-still-mounted.ts` es, en rojo:

```ts
const useStillMounted: () => () => boolean = () => {
  throw new Error('not implemented');
};

export default useStillMounted;
```

1. **`download-data.spec.tsx`:**

   ```tsx
   import { act, screen, waitFor } from '@testing-library/react';
   import { useState } from 'react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { resetSession, stubDialogs } from '../../../features/sign-in/ui/render-access';
   import { cutBody, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import DownloadDataDialog from './DownloadDataDialog';
   import {
     ANA,
     errorReply,
     holdFirstReply,
     renderWithFetch,
     renderWithReplies,
     typeInto,
     type AccountUser,
   } from './render-account';

   type Save = (blob: Blob, filename: string) => void;

   interface ClosableDownloadProps {
     readonly save: Save;
   }

   const PASSWORD = 'una frase larga para el taller';
   const FILE = '{\n  "format": "taller-export-2",\n  "account": {"name": "Ana Pérez"}\n}\n';
   const ATTACHMENT = {
     'Content-Type': 'application/json',
     'Content-Disposition': 'attachment; filename="taller-41-20261028.json"',
   };
   const CONFIRMED: FakeReply = { status: 201, json: {} };
   const EXPORTED: FakeReply = { status: 200, text: FILE, headers: ATTACHMENT };
   const EXPIRED = errorReply(423, 'password_confirmation_required', 'Confirmá tu contraseña para continuar.');
   const TOO_MANY = 'Demasiados intentos. Esperá un momento antes de volver a probar.';

   const ClosableDownload = ({ save }: ClosableDownloadProps) => {
     const [open, setOpen] = useState(true);
     return open ? <DownloadDataDialog save={save} onClose={() => setOpen(false)} /> : null;
   };

   beforeAll(stubDialogs);

   beforeEach(() => {
     resetSession(ANA);
   });

   function renderDownload(replies: readonly FakeReply[]) {
     const save = vi.fn<Save>();
     const rendered = renderWithReplies(<DownloadDataDialog save={save} onClose={vi.fn()} />, replies);
     return { ...rendered, save };
   }

   async function download(user: AccountUser): Promise<void> {
     await typeInto(user, 'Tu contraseña', PASSWORD);
     await user.click(screen.getByRole('button', { name: 'Descargar mis datos' }));
   }

   describe('downloading the data of the account', () => {
     it('tells it apart from «Exportar mi progreso» and starts on the password', async () => {
       renderDownload([]);
       const dialog = screen.getByRole('dialog', { name: 'Descargá los datos de tu cuenta' });
       expect(dialog).toHaveTextContent(
         'No es el mismo archivo que «Exportar mi progreso» y no se importa en Método.',
       );
       expect(dialog).toHaveTextContent('Podés descargarlo hasta 3 veces por día.');
       await waitFor(() => expect(screen.getByLabelText('Tu contraseña')).toHaveFocus());
     });

     it('confirms the password and then saves the file with the name and the bytes of the server', async () => {
       const { user, calls, save } = renderDownload([CONFIRMED, EXPORTED]);
       await download(user);
       const result = await screen.findByRole('status');
       expect(result).toHaveTextContent('Listo: se descargó taller-41-20261028.json.');
       expect(result).toHaveFocus();
       expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
         'POST /api/auth/confirm-password',
         'POST /api/me/export',
       ]);
       expect(calls[0]?.body).toEqual({ password: PASSWORD });
       expect(calls.map((call) => call.headers['x-taller-user'])).toEqual(['41', '41']);
       expect(save).toHaveBeenCalledOnce();
       const [blob, filename] = save.mock.calls[0]!;
       expect(filename).toBe('taller-41-20261028.json');
       expect(await blob.text()).toBe(FILE);
     });

     it('marks the password with its own text when it is wrong, and asks nothing else', async () => {
       const { user, calls, save } = renderDownload([
         errorReply(422, 'auth_failed', 'El email o la contraseña no son correctos.'),
       ]);
       await download(user);
       const field = screen.getByLabelText('Tu contraseña');
       await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
       expect(field).toHaveAccessibleDescription('La contraseña no es correcta.');
       expect(field).toHaveFocus();
       expect(screen.queryByText('El email o la contraseña no son correctos.')).toBeNull();
       expect(calls).toHaveLength(1);
       expect(save).not.toHaveBeenCalled();
     });

     it('asks for the password again when the confirmation expired before the export', async () => {
       const { user, calls, save } = renderDownload([CONFIRMED, EXPIRED, CONFIRMED, EXPORTED]);
       await download(user);
       const field = screen.getByLabelText('Tu contraseña');
       await waitFor(() =>
         expect(field).toHaveAccessibleDescription('Confirmá tu contraseña para continuar.'),
       );
       expect(field).toHaveFocus();
       expect(save).not.toHaveBeenCalled();
       await user.click(screen.getByRole('button', { name: 'Descargar mis datos' }));
       await screen.findByRole('status');
       expect(calls.map((call) => call.path)).toEqual([
         '/api/auth/confirm-password',
         '/api/me/export',
         '/api/auth/confirm-password',
         '/api/me/export',
       ]);
       expect(save).toHaveBeenCalledOnce();
     });

     it('says in hours and minutes how long to wait after the third download of the day', async () => {
       const { user } = renderDownload([
         CONFIRMED,
         errorReply(429, 'too_many_requests', TOO_MANY, { headers: { 'Retry-After': '30000' } }),
       ]);
       await download(user);
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'Podés volver a intentar en 8 horas y 20 minutos.',
       );
       expect(screen.getByRole('button', { name: 'Descargar mis datos' })).toBeDisabled();
     });

     it('offers to reload when the session belongs to another account', async () => {
       const { user, reloadDocument } = renderDownload([
         CONFIRMED,
         errorReply(409, 'account_mismatch', 'La sesión cambió de cuenta: recargá la página.'),
       ]);
       await download(user);
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'La sesión cambió de cuenta: recargá la página.',
       );
       await user.click(screen.getByRole('button', { name: 'Recargar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('saves nothing when the download is cut halfway', async () => {
       const { user, save } = renderDownload([
         CONFIRMED,
         { status: 200, headers: ATTACHMENT, body: cutBody('{\n  "format"') },
       ]);
       await download(user);
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.',
       );
       expect(save).not.toHaveBeenCalled();
     });

     it('does not export when the dialog closed while the password was being confirmed', async () => {
       const held = holdFirstReply([CONFIRMED, EXPORTED]);
       const save = vi.fn<Save>();
       const { user } = renderWithFetch(<ClosableDownload save={save} />, held.fetch, held.calls);
       await download(user);
       expect(await screen.findByRole('button', { name: 'Preparando el archivo…' })).toBeDisabled();
       await user.click(screen.getByRole('button', { name: 'Cerrar' }));
       expect(screen.queryByRole('dialog', { name: 'Descargá los datos de tu cuenta' })).toBeNull();
       await act(async () => {
         held.release();
         await new Promise((resolve) => setTimeout(resolve, 20));
       });
       expect(held.calls.map((call) => call.path)).toEqual(['/api/auth/confirm-password']);
       expect(save).not.toHaveBeenCalled();
     });
   });
   ```

2. **`delete-account.spec.tsx`.** La prueba de «Entendido» mata el mutante «no recarga» (F11a-2):

   ```tsx
   import { act, screen, waitFor } from '@testing-library/react';
   import { useState } from 'react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { resetSession, stubDialogs } from '../../../features/sign-in/ui/render-access';
   import type { FakeReply } from '../../../shared/api/http/fake-fetch';
   import DeleteAccountDialog from './DeleteAccountDialog';
   import {
     ANA,
     errorReply,
     holdFirstReply,
     renderWithFetch,
     renderWithReplies,
     typeInto,
     type AccountUser,
   } from './render-account';

   const PASSWORD = 'una frase larga para el taller';
   const DELETION =
     'Se está borrando tu cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';
   const CONFIRMED: FakeReply = { status: 201, json: {} };
   const DELETED: FakeReply = { status: 202, json: { data: { status: 'deleting' }, message: DELETION } };
   const TOO_MANY = 'Demasiados intentos. Esperá un momento antes de volver a probar.';

   const ClosableDeletion = () => {
     const [open, setOpen] = useState(true);
     return open ? <DeleteAccountDialog onClose={() => setOpen(false)} /> : null;
   };

   beforeAll(stubDialogs);

   beforeEach(() => {
     resetSession(ANA);
   });

   function renderDeletion(replies: readonly FakeReply[]) {
     return renderWithReplies(<DeleteAccountDialog onClose={vi.fn()} />, replies);
   }

   async function deleteWith(user: AccountUser): Promise<void> {
     await typeInto(user, 'Tu contraseña', PASSWORD);
     await user.click(screen.getByRole('checkbox', { name: 'Entiendo que no se puede deshacer.' }));
     await user.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }));
   }

   describe('deleting the account', () => {
     it('says what is deleted, that it cannot be undone and that it is not «Borrar todo»', () => {
       renderDeletion([]);
       const dialog = screen.getByRole('dialog', { name: 'Borrar tu cuenta' });
       expect(dialog).toHaveTextContent(
         'Se borra tu cuenta con todo lo que guardó en el servidor: el progreso, los intentos, el código y las importaciones. No se puede deshacer.',
       );
       expect(dialog).toHaveTextContent(
         'No es «Borrar todo» de Método, que borra tu progreso en este navegador y en tu cuenta.',
       );
       expect(dialog).toHaveTextContent('El progreso guardado en este navegador no se borra con la cuenta.');
       expect(screen.getByRole('checkbox', { name: 'Entiendo que no se puede deshacer.' })).not.toBeChecked();
     });

     it('sends nothing without the password and the box', async () => {
       const { user, calls } = renderDeletion([CONFIRMED, DELETED]);
       await user.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }));
       expect(await screen.findByText('Completá este campo.')).toBeInTheDocument();
       expect(screen.getByText('Marcá la casilla para confirmar.')).toBeInTheDocument();
       expect(screen.getByRole('checkbox', { name: 'Entiendo que no se puede deshacer.' })).toHaveAttribute(
         'aria-invalid',
         'true',
       );
       expect(calls).toHaveLength(0);
     });

     it('confirms, deletes with X-Taller-User, shows the message of the server, and «Entendido» reloads', async () => {
       const { user, calls, reloadDocument } = renderDeletion([CONFIRMED, DELETED]);
       await deleteWith(user);
       const result = await screen.findByRole('status');
       expect(result).toHaveTextContent(DELETION);
       expect(result).toHaveFocus();
       expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
         'POST /api/auth/confirm-password',
         'DELETE /api/me',
       ]);
       expect(calls[1]?.headers['x-taller-user']).toBe('41');
       expect(reloadDocument).not.toHaveBeenCalled();
       await user.click(screen.getByRole('button', { name: 'Entendido' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('says the same in its own words when the 202 brings no message', async () => {
       const { user } = renderDeletion([CONFIRMED, { status: 202, json: { data: { status: 'deleting' } } }]);
       await deleteWith(user);
       expect(await screen.findByRole('status')).toHaveTextContent(DELETION);
     });

     it('reloads too when the dialog is closed after the deletion', async () => {
       const { user, reloadDocument } = renderDeletion([CONFIRMED, DELETED]);
       await deleteWith(user);
       await screen.findByRole('status');
       await user.click(screen.getByRole('button', { name: 'Cerrar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('keeps the session of the only admin', async () => {
       const { user, reloadDocument } = renderDeletion([
         CONFIRMED,
         errorReply(409, 'last_admin', 'Tiene que quedar al menos un admin activo.'),
       ]);
       await deleteWith(user);
       expect(await screen.findByRole('alert')).toHaveTextContent('Tiene que quedar al menos un admin activo.');
       expect(screen.queryByRole('button', { name: 'Recargar' })).toBeNull();
       expect(screen.getByRole('button', { name: 'Borrar mi cuenta' })).toBeEnabled();
       expect(reloadDocument).not.toHaveBeenCalled();
     });

     it('waits for Retry-After after too many confirmations', async () => {
       const { user, calls } = renderDeletion([
         errorReply(429, 'too_many_requests', TOO_MANY, { headers: { 'Retry-After': '60' } }),
       ]);
       await deleteWith(user);
       expect(await screen.findByRole('alert')).toHaveTextContent('Podés volver a intentar en 1 minuto.');
       expect(screen.getByRole('button', { name: 'Borrar mi cuenta' })).toBeDisabled();
       expect(calls).toHaveLength(1);
     });

     it('asks for the password again when the confirmation expired before the deletion', async () => {
       const { user, calls } = renderDeletion([
         CONFIRMED,
         errorReply(423, 'password_confirmation_required', 'Confirmá tu contraseña para continuar.'),
       ]);
       await deleteWith(user);
       const field = screen.getByLabelText('Tu contraseña');
       await waitFor(() =>
         expect(field).toHaveAccessibleDescription('Confirmá tu contraseña para continuar.'),
       );
       expect(field).toHaveFocus();
       expect(calls).toHaveLength(2);
     });

     it('offers to reload when the page expired and the session is now another account', async () => {
       const { user, calls, reloadDocument } = renderDeletion([
         CONFIRMED,
         errorReply(419, 'csrf_token_mismatch', 'La página venció: recargala e intentá de nuevo.'),
         {
           status: 200,
           json: {
             user: { ...ANA, id: 7 },
             features: { passwordReset: false, registration: false },
             contentVersion: null,
             catalogs: [],
           },
         },
       ]);
       await deleteWith(user);
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'La página venció: recargala e intentá de nuevo.',
       );
       expect(calls.map((call) => call.path)).toEqual([
         '/api/auth/confirm-password',
         '/api/me',
         '/api/session',
       ]);
       await user.click(screen.getByRole('button', { name: 'Recargar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('does not delete the account when the dialog closed while the password was being confirmed', async () => {
       const held = holdFirstReply([CONFIRMED, DELETED]);
       const { user } = renderWithFetch(<ClosableDeletion />, held.fetch, held.calls);
       await deleteWith(user);
       expect(await screen.findByRole('button', { name: 'Borrando…' })).toBeDisabled();
       await user.click(screen.getByRole('button', { name: 'Cerrar' }));
       expect(screen.queryByRole('dialog', { name: 'Borrar tu cuenta' })).toBeNull();
       await act(async () => {
         held.release();
         await new Promise((resolve) => setTimeout(resolve, 20));
       });
       expect(held.calls.map((call) => call.path)).toEqual(['/api/auth/confirm-password']);
     });
   });
   ```

3. **`account-actions.spec.tsx`** suma, dentro de su `describe`:

   ```tsx
   it('offers the three actions in order, after the privacy notice and before «Salir»', async () => {
     const { account } = await openAccount();
     const names = buttonNames(account);
     const positions = [
       'Aviso de privacidad',
       'Cambiar la contraseña',
       'Descargar mis datos',
       'Borrar mi cuenta',
       'Salir',
     ].map((name) => names.indexOf(name));
     expect(positions).not.toContain(-1);
     expect([...positions].sort((left, right) => left - right)).toEqual(positions);
   });
   ```

4. **Correr** `npm run typecheck` y `npm run test:unit -- frontend/src/pages/account`: en rojo las dos specs nuevas y la prueba nueva, y en verde las de U5, U6 y F11a.
5. **Commit:** `test(front): specs de la descarga de los datos y de la supresión, en rojo`.

### Tarea 7.2 · La descarga y la supresión (T050, M)

**Archivos:** en `frontend/src/pages/account/ui/`, `account-texts.ts`, `use-still-mounted.ts`, `IrreversibleField.tsx`, `DownloadDataForm.tsx`, `DownloadDataDialog.tsx`, `DeleteAccountForm.tsx`, `DeleteAccountDialog.tsx` y `AccountActions.tsx`.

1. **`account-texts.ts`,** la versión final:

   ```ts
   export const PASSWORD_TITLE = 'Cambiar la contraseña';
   export const PASSWORD_CHANGED = 'Tu contraseña cambió. Cerramos tus otras sesiones; esta sigue abierta.';
   export const CURRENT_PASSWORD_WRONG = 'La contraseña actual no es correcta.';
   export const DATA_TITLE = 'Descargá los datos de tu cuenta';
   export const DATA_DESCRIPTION =
     'Un archivo JSON con tu cuenta, el progreso guardado en el servidor, tus intentos y tus importaciones. No es el mismo archivo que «Exportar mi progreso» y no se importa en Método. Podés descargarlo hasta 3 veces por día.';
   export const DELETION_TITLE = 'Borrar tu cuenta';
   export const DELETION_WARNING =
     'Se borra tu cuenta con todo lo que guardó en el servidor: el progreso, los intentos, el código y las importaciones. No se puede deshacer. Las copias de seguridad lo conservan un tiempo: el aviso de privacidad dice cuánto.';
   export const DELETION_NOT_RESET =
     'No es «Borrar todo» de Método, que borra tu progreso en este navegador y en tu cuenta. El progreso guardado en este navegador no se borra con la cuenta.';
   export const DELETION_STARTED =
     'Se está borrando tu cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';
   export const UNDERSTOOD_REQUIRED = 'Marcá la casilla para confirmar.';

   export function dataSaved(filename: string): string {
     return `Listo: se descargó ${filename}.`;
   }
   ```

   `dataSaved` arma el texto en un solo nodo (TR-13).
2. **`use-still-mounted.ts`** (R28). El efecto vuelve a marcar el montaje, así el doble efecto del modo estricto no lo deja en falso:

   ```ts
   import { useCallback, useEffect, useRef } from 'react';

   const useStillMounted = () => {
     const mounted = useRef(false);
     useEffect(() => {
       mounted.current = true;
       return () => {
         mounted.current = false;
       };
     }, []);
     return useCallback(() => mounted.current, []);
   };

   export default useStillMounted;
   ```

3. **`IrreversibleField.tsx`:**

   ```tsx
   import { useId } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';

   interface IrreversibleFieldProps {
     readonly registration: UseFormRegisterReturn;
     readonly messages: readonly string[];
   }

   const IrreversibleField = ({ registration, messages }: IrreversibleFieldProps) => {
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
           <label htmlFor={id}>Entiendo que no se puede deshacer.</label>
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

   export default IrreversibleField;
   ```

4. **`DownloadDataForm.tsx`.** Confirma siempre antes de pedir el archivo («Pedirla siempre»), y no lo pide si el diálogo se cerró en el medio (R28):

   ```tsx
   import { useEffect } from 'react';
   import { useForm } from 'react-hook-form';
   import { WRONG_PASSWORD, confirmPassword } from '../../../features/confirm-password';
   import { useApiClient } from '../../../shared/api/http';
   import { PasswordField, REQUIRED, messagesOf, useGuardedSubmit } from '../../../shared/ui/form';
   import { exportAccountData } from '../api/account-endpoints';
   import { useAccountContext } from '../model/account-context';
   import AccountFailureNotice from './AccountFailureNotice';
   import useAccountFailure from './use-account-failure';
   import useStillMounted from './use-still-mounted';

   interface DownloadValues {
     password: string;
   }

   interface DownloadDataFormProps {
     save(blob: Blob, filename: string): void;
     onSaved(filename: string): void;
   }

   const VISIBLE_FIELDS = ['password'] as const;
   const PASSWORD_RULE = { field: 'password', wrongMessage: WRONG_PASSWORD } as const;

   const DownloadDataForm = ({ save, onSaved }: DownloadDataFormProps) => {
     const client = useApiClient();
     const { account } = useAccountContext();
     const stillMounted = useStillMounted();
     const {
       register,
       handleSubmit,
       setError,
       setFocus,
       formState: { errors, isSubmitting },
     } = useForm<DownloadValues>({ criteriaMode: 'all', defaultValues: { password: '' } });
     const failure = useAccountFailure(setError, VISIBLE_FIELDS, PASSWORD_RULE);

     useEffect(() => {
       setFocus('password');
     }, [setFocus]);

     const submit = useGuardedSubmit(async ({ password }: DownloadValues) => {
       const confirmed = await confirmPassword(client, account.id, password);
       if (!confirmed.ok) {
         failure.handle(confirmed.failure);
         return;
       }
       if (!stillMounted()) return;
       const file = await exportAccountData(client, account.id);
       if (!file.ok) {
         failure.handle(file.failure);
         return;
       }
       save(file.value.blob, file.value.filename);
       onSaved(file.value.filename);
     });

     return (
       <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
         <AccountFailureNotice
           messages={messagesOf(errors.root?.serverError)}
           takeFocus={errors.password === undefined}
           offerReload={failure.offerReload}
           onReload={failure.reloadDocument}
         />
         <PasswordField
           label="Tu contraseña"
           autoComplete="current-password"
           registration={register('password', { required: REQUIRED })}
           messages={messagesOf(errors.password)}
         />
         <div className="form-actions">
           <button className="button" type="submit" disabled={isSubmitting || failure.waiting}>
             {isSubmitting ? 'Preparando el archivo…' : 'Descargar mis datos'}
           </button>
         </div>
       </form>
     );
   };

   export default DownloadDataForm;
   ```

5. **`DownloadDataDialog.tsx`:**

   ```tsx
   import { useState } from 'react';
   import AccountResult from './AccountResult';
   import AccountSubdialog from './AccountSubdialog';
   import { DATA_DESCRIPTION, DATA_TITLE, dataSaved } from './account-texts';
   import DownloadDataForm from './DownloadDataForm';

   interface DownloadDataDialogProps {
     save(blob: Blob, filename: string): void;
     onClose(): void;
   }

   const DownloadDataDialog = ({ save, onClose }: DownloadDataDialogProps) => {
     const [savedAs, setSavedAs] = useState<string | null>(null);
     return (
       <AccountSubdialog title={DATA_TITLE} onClose={onClose}>
         {savedAs === null ? (
           <>
             <p>{DATA_DESCRIPTION}</p>
             <DownloadDataForm save={save} onSaved={setSavedAs} />
           </>
         ) : (
           <AccountResult message={dataSaved(savedAs)} actionLabel="Volver" onAction={onClose} />
         )}
       </AccountSubdialog>
     );
   };

   export default DownloadDataDialog;
   ```

6. **`DeleteAccountForm.tsx`.** Pide la contraseña y la casilla antes de cualquier pedido (FR-058):

   ```tsx
   import { useEffect } from 'react';
   import { useForm } from 'react-hook-form';
   import { WRONG_PASSWORD, confirmPassword } from '../../../features/confirm-password';
   import { useApiClient } from '../../../shared/api/http';
   import { PasswordField, REQUIRED, messagesOf, useGuardedSubmit } from '../../../shared/ui/form';
   import { deleteAccount } from '../api/account-endpoints';
   import { useAccountContext } from '../model/account-context';
   import AccountFailureNotice from './AccountFailureNotice';
   import { UNDERSTOOD_REQUIRED } from './account-texts';
   import IrreversibleField from './IrreversibleField';
   import useAccountFailure from './use-account-failure';
   import useStillMounted from './use-still-mounted';

   interface DeleteValues {
     password: string;
     understood: boolean;
   }

   interface DeleteAccountFormProps {
     onDeleted(message: string | null): void;
   }

   const VISIBLE_FIELDS = ['password'] as const;
   const PASSWORD_RULE = { field: 'password', wrongMessage: WRONG_PASSWORD } as const;

   const DeleteAccountForm = ({ onDeleted }: DeleteAccountFormProps) => {
     const client = useApiClient();
     const { account } = useAccountContext();
     const stillMounted = useStillMounted();
     const {
       register,
       handleSubmit,
       setError,
       setFocus,
       formState: { errors, isSubmitting },
     } = useForm<DeleteValues>({
       criteriaMode: 'all',
       defaultValues: { password: '', understood: false },
     });
     const failure = useAccountFailure(setError, VISIBLE_FIELDS, PASSWORD_RULE);

     useEffect(() => {
       setFocus('password');
     }, [setFocus]);

     const submit = useGuardedSubmit(async ({ password }: DeleteValues) => {
       const confirmed = await confirmPassword(client, account.id, password);
       if (!confirmed.ok) {
         failure.handle(confirmed.failure);
         return;
       }
       if (!stillMounted()) return;
       const deleted = await deleteAccount(client, account.id);
       if (!deleted.ok) {
         failure.handle(deleted.failure);
         return;
       }
       onDeleted(deleted.value);
     });

     const fieldHasError = errors.password !== undefined || errors.understood !== undefined;
     return (
       <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
         <AccountFailureNotice
           messages={messagesOf(errors.root?.serverError)}
           takeFocus={!fieldHasError}
           offerReload={failure.offerReload}
           onReload={failure.reloadDocument}
         />
         <PasswordField
           label="Tu contraseña"
           autoComplete="current-password"
           registration={register('password', { required: REQUIRED })}
           messages={messagesOf(errors.password)}
         />
         <IrreversibleField
           registration={register('understood', { required: UNDERSTOOD_REQUIRED })}
           messages={messagesOf(errors.understood)}
         />
         <div className="form-actions">
           <button className="button" type="submit" disabled={isSubmitting || failure.waiting}>
             {isSubmitting ? 'Borrando…' : 'Borrar mi cuenta'}
           </button>
         </div>
       </form>
     );
   };

   export default DeleteAccountForm;
   ```

7. **`DeleteAccountDialog.tsx`.** Después del 202 la sesión ya terminó: «Entendido» recarga, y cerrar el diálogo también (FR-059; R30):

   ```tsx
   import { useState } from 'react';
   import { useAccountContext } from '../model/account-context';
   import AccountResult from './AccountResult';
   import AccountSubdialog from './AccountSubdialog';
   import { DELETION_NOT_RESET, DELETION_STARTED, DELETION_TITLE, DELETION_WARNING } from './account-texts';
   import DeleteAccountForm from './DeleteAccountForm';

   interface DeleteAccountDialogProps {
     onClose(): void;
   }

   const DeleteAccountDialog = ({ onClose }: DeleteAccountDialogProps) => {
     const { reloadDocument } = useAccountContext();
     const [deletedMessage, setDeletedMessage] = useState<string | null>(null);
     if (deletedMessage !== null) {
       return (
         <AccountSubdialog title={DELETION_TITLE} onClose={reloadDocument}>
           <AccountResult message={deletedMessage} actionLabel="Entendido" onAction={reloadDocument} />
         </AccountSubdialog>
       );
     }
     return (
       <AccountSubdialog title={DELETION_TITLE} onClose={onClose}>
         <p>{DELETION_WARNING}</p>
         <p>{DELETION_NOT_RESET}</p>
         <DeleteAccountForm onDeleted={(message) => setDeletedMessage(message ?? DELETION_STARTED)} />
       </AccountSubdialog>
     );
   };

   export default DeleteAccountDialog;
   ```

   Las dos ramas devuelven el mismo componente en la misma posición, así que React conserva el `<dialog>` abierto y sólo cambian su contenido y su `onClose`.
8. **`AccountActions.tsx`,** la versión final. `downloadBlob` se inyecta como `save` (R22):

   ```tsx
   import { useState } from 'react';
   import { createPortal } from 'react-dom';
   import { downloadBlob } from '../../../shared/lib/download-file';
   import ChangePasswordDialog from './ChangePasswordDialog';
   import DeleteAccountDialog from './DeleteAccountDialog';
   import DownloadDataDialog from './DownloadDataDialog';

   type AccountAction = 'password' | 'data' | 'deletion';

   const AccountActions = () => {
     const [open, setOpen] = useState<AccountAction | null>(null);
     const close = (): void => setOpen(null);
     return (
       <div className="account-actions">
         <button type="button" className="text-button" onClick={() => setOpen('password')}>
           Cambiar la contraseña
         </button>
         <button type="button" className="text-button" onClick={() => setOpen('data')}>
           Descargar mis datos
         </button>
         <button type="button" className="text-button" onClick={() => setOpen('deletion')}>
           Borrar mi cuenta
         </button>
         {open === 'password' ? createPortal(<ChangePasswordDialog onClose={close} />, document.body) : null}
         {open === 'data'
           ? createPortal(<DownloadDataDialog save={downloadBlob} onClose={close} />, document.body)
           : null}
         {open === 'deletion' ? createPortal(<DeleteAccountDialog onClose={close} />, document.body) : null}
       </div>
     );
   };

   export default AccountActions;
   ```

9. **Correr** `npm run test:unit -- frontend/src/pages/account` (todo en verde), `npm run typecheck` y `npm run lint`. La complejidad de los dos `submit` es 4.
10. **Commit:** `feat(front): descargar los datos y borrar la cuenta desde «Tu cuenta»`.

### Tarea 7.3 · Los E2E de la descarga, de la supresión y de la higiene (T051, E)

**Archivos:** `qa/e2e/lib/account-contract.ts` (suma tres funciones), `qa/e2e/specs/account-data.spec.ts` y `qa/e2e/specs/account-hygiene.spec.ts` (nuevos).

1. **`account-contract.ts`** suma, con `import type { ApiDouble } from '../fixtures/api-double';` arriba:

   ```ts
   export function answerConfirmation(api: ApiDouble): void {
     api.on('POST /api/auth/confirm-password', () => ({ status: 201, json: {} }));
   }

   export function answerExport(api: ApiDouble): void {
     api.on('POST /api/me/export', () => ({
       status: 200,
       contentType: 'application/json',
       headers: {
         'Content-Disposition': `attachment; filename="${EXPORT_FILE.name}"`,
         'Cache-Control': 'no-store',
       },
       body: EXPORT_FILE.text,
     }));
   }

   export function answerDeletion(api: ApiDouble): void {
     api.on('DELETE /api/me', () => {
       api.account = null;
       return { status: 202, json: { data: { status: 'deleting' }, message: DELETION_MESSAGE } };
     });
   }
   ```

   Son rutas explícitas con `api.on`, sin depender de las que F8 sume por omisión (R32).
2. **`account-data.spec.ts`.** Cubre la historia 7, SC-009 y FR-055 a FR-059:

   ```ts
   import { readFile } from 'node:fs/promises';
   import { expect, test } from '../fixtures';
   import {
     ACCOUNT_MESSAGES,
     DELETION_MESSAGE,
     EXPORT_FILE,
     accountError,
     answerConfirmation,
     answerDeletion,
     answerExport,
   } from '../lib/account-contract';
   import { ADMIN, STUDENT, errorBody } from '../lib/api-contract';
   import { frozenProgress, type StorageKey } from '../lib/curriculum';
   import { observeReload } from '../lib/document-marker';
   import { urls } from '../lib/urls';

   const PASSWORD = 'una frase larga para el taller';

   test.describe('downloading the data of the account', () => {
     test('saves the file of the server with its name and its bytes, and keeps no copy in the browser', async ({
       account,
       api,
       shell,
       page,
     }) => {
       answerConfirmation(api);
       answerExport(api);
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Descargar mis datos');
       const downloading = page.waitForEvent('download');
       await account.confirmWithPassword('Descargar mis datos', PASSWORD);
       const download = await downloading;
       expect(download.suggestedFilename()).toBe(EXPORT_FILE.name);
       expect(await readFile(await download.path())).toEqual(Buffer.from(EXPORT_FILE.text, 'utf8'));
       await expect(dialog.getByRole('status')).toHaveText(`Listo: se descargó ${EXPORT_FILE.name}.`);
       const modifying = api.calls.filter((call) => call.method !== 'GET');
       expect(modifying.map((call) => call.path)).toEqual(['/api/auth/confirm-password', '/api/me/export']);
       expect(modifying[0]?.body).toEqual({ password: PASSWORD });
       expect(modifying.map((call) => call.user)).toEqual([String(STUDENT.id), String(STUDENT.id)]);
       const stored = await page.evaluate(() =>
         [...Object.values(localStorage), ...Object.values(sessionStorage)].join('\n'),
       );
       expect(stored).not.toContain('taller-export-2');
     });

     test('says in hours and minutes when the downloads of the day ran out', async ({
       account,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 429/, 'the 429 of the fourth download of the day');
       answerConfirmation(api);
       api.on('POST /api/me/export', () => ({
         status: 429,
         headers: { 'Retry-After': '30000' },
         json: errorBody('too_many_requests'),
       }));
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Descargar mis datos');
       await account.confirmWithPassword('Descargar mis datos', PASSWORD);
       await expect(dialog.getByRole('alert')).toContainText('Podés volver a intentar en 8 horas y 20 minutos.');
       await expect(dialog.getByRole('button', { name: 'Descargar mis datos', exact: true })).toBeDisabled();
     });

     test('asks for the password again when the confirmation expired before the export', async ({
       account,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 423/, 'the 423 of an expired confirmation');
       answerConfirmation(api);
       api.reply('POST /api/me/export', { status: 423, json: accountError('password_confirmation_required') });
       answerExport(api);
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Descargar mis datos');
       await account.confirmWithPassword('Descargar mis datos', PASSWORD);
       const field = dialog.getByLabel('Tu contraseña', { exact: true });
       await expect(field).toHaveAttribute('aria-invalid', 'true');
       await expect(dialog.getByText(ACCOUNT_MESSAGES.password_confirmation_required)).toBeVisible();
     });
   });

   test.describe('deleting the account', () => {
     test('deletes with X-Taller-User, shows the message of the server and reloads, and the progress of the browser stays', async ({
       access,
       account,
       api,
       shell,
       storage,
       page,
     }) => {
       await storage.seed(frozenProgress);
       answerConfirmation(api);
       answerDeletion(api);
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Borrar mi cuenta');
       await account.confirmWithPassword('Borrar mi cuenta', PASSWORD);
       await expect(dialog.getByRole('status')).toHaveText(DELETION_MESSAGE);
       const [call] = api.callsTo('DELETE /api/me');
       expect(call?.user).toBe(String(STUDENT.id));
       expect(call?.xsrf).toBe(api.xsrfValue());
       expect(
         await observeReload(page, () => dialog.getByRole('button', { name: 'Entendido', exact: true }).click()),
       ).toBe(true);
       await expect(access.heading('Ingresá al taller')).toBeVisible();
       const stored = await storage.snapshot();
       for (const key of Object.keys(frozenProgress) as StorageKey[]) {
         expect(stored[key]).toBe(frozenProgress[key]);
       }
     });

     test.describe('as the only admin', () => {
       test.use({ sessionAccount: ADMIN });

       test('keeps the session and says why', async ({ account, api, pageIssues, shell, page }) => {
         pageIssues.expectIssue(/status of 409/, 'the 409 last_admin of the deletion');
         answerConfirmation(api);
         api.on('DELETE /api/me', () => ({ status: 409, json: accountError('last_admin') }));
         await shell.goto(urls.view('recorrido'));
         await account.open();
         const dialog = await account.openAction('Borrar mi cuenta');
         await account.confirmWithPassword('Borrar mi cuenta', PASSWORD);
         await expect(dialog.getByRole('alert')).toHaveText(ACCOUNT_MESSAGES.last_admin);
         await page.keyboard.press('Escape');
         await expect(dialog).toBeHidden();
         await expect(account.dialog).toContainText(`${ADMIN.name} · ${ADMIN.email}`);
       });
     });
   });
   ```

   El escenario del 423 encola la respuesta con `api.reply` antes del manejador de `answerExport`, que queda para el envío siguiente.
3. **`account-hygiene.spec.ts`.** Cubre SC-005 y SC-007 en las pantallas de F11b, y FR-066 a FR-068 y FR-070:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import {
     DELETION_MESSAGE,
     answerConfirmation,
     answerDeletion,
     answerExport,
   } from '../lib/account-contract';
   import { STUDENT } from '../lib/api-contract';
   import { observeReload } from '../lib/document-marker';
   import { urls } from '../lib/urls';

   const CURRENT = 'una frase larga para el taller';
   const NEW_PASSWORD = 'otra frase larga para cambiar';
   const ACTIONS = ['Cambiar la contraseña', 'Descargar mis datos', 'Borrar mi cuenta'] as const;

   function leftoversOf(page: Page): Promise<string> {
     return page.evaluate(() =>
       [
         ...Object.keys(localStorage).map((key) => `${key}=${localStorage.getItem(key) ?? ''}`),
         ...Object.keys(sessionStorage).map((key) => `${key}=${sessionStorage.getItem(key) ?? ''}`),
         document.cookie,
         location.href,
       ].join('\n'),
     );
   }

   async function tabTo(page: Page, target: Locator): Promise<void> {
     for (let step = 0; step < 12; step += 1) {
       if (await target.evaluate((element) => element === document.activeElement)) return;
       await page.keyboard.press('Tab');
     }
     await expect(target).toBeFocused();
   }

   test.describe('nothing secret is left behind by the account actions', () => {
     test('after changing the password, downloading the data and deleting the account', async ({
       account,
       api,
       shell,
       page,
     }) => {
       const consoleTexts: string[] = [];
       page.on('console', (message) => consoleTexts.push(message.text()));
       api.on('PUT /api/me/password', () => ({ status: 200, json: { data: STUDENT } }));
       answerConfirmation(api);
       answerExport(api);
       answerDeletion(api);
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const change = await account.openAction('Cambiar la contraseña');
       await account.changePassword(CURRENT, NEW_PASSWORD);
       await change.getByRole('button', { name: 'Listo', exact: true }).click();
       const data = await account.openAction('Descargar mis datos');
       const downloading = page.waitForEvent('download');
       await account.confirmWithPassword('Descargar mis datos', NEW_PASSWORD);
       await downloading;
       await data.getByRole('button', { name: 'Volver', exact: true }).click();
       const deletion = await account.openAction('Borrar mi cuenta');
       await account.confirmWithPassword('Borrar mi cuenta', NEW_PASSWORD);
       await expect(deletion.getByRole('status')).toHaveText(DELETION_MESSAGE);
       const beforeReload = await leftoversOf(page);
       await observeReload(page, () => deletion.getByRole('button', { name: 'Entendido', exact: true }).click());
       const afterReload = await leftoversOf(page);
       for (const secret of [CURRENT, NEW_PASSWORD]) {
         expect(beforeReload).not.toContain(secret);
         expect(afterReload).not.toContain(secret);
         expect(consoleTexts.join('\n')).not.toContain(secret);
       }
     });
   });

   test.describe('the keyboard alone', () => {
     test('changes the password and goes back to «Tu cuenta»', async ({ account, api, shell, page }) => {
       api.on('PUT /api/me/password', () => ({ status: 200, json: { data: STUDENT } }));
       await shell.goto(urls.view('recorrido'));
       await account.entry.focus();
       await page.keyboard.press('Enter');
       await expect(account.dialog).toBeVisible();
       const opener = account.button('Cambiar la contraseña');
       await tabTo(page, opener);
       await page.keyboard.press('Enter');
       const dialog = account.actionDialog('Cambiar la contraseña');
       await expect(dialog.getByLabel('Contraseña actual', { exact: true })).toBeFocused();
       await page.keyboard.type(CURRENT);
       await tabTo(page, dialog.getByLabel('Contraseña nueva', { exact: true }));
       await page.keyboard.type(NEW_PASSWORD);
       await tabTo(page, dialog.getByLabel('Repetí la contraseña nueva', { exact: true }));
       await page.keyboard.type(NEW_PASSWORD);
       await page.keyboard.press('Enter');
       await expect(dialog.getByRole('status')).toBeFocused();
       await page.keyboard.press('Escape');
       await expect(dialog).toBeHidden();
       await expect(opener).toBeFocused();
     });
   });

   for (const width of [320, 390]) {
     test.describe(`at ${width} px`, () => {
       test.use({ viewport: { width, height: 760 } });

       test('each action takes the whole screen, without sideways scrolling and with fields of 16 px', async ({
         account,
         shell,
         page,
       }) => {
         await shell.goto(urls.view('recorrido'));
         await account.open();
         for (const action of ACTIONS) {
           const dialog = await account.openAction(action);
           const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
           expect((await dialog.boundingBox())?.width).toBe(viewportWidth);
           expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
           const fontSize = await dialog
             .locator('input')
             .first()
             .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
           expect(fontSize).toBeGreaterThanOrEqual(16);
           await page.keyboard.press('Escape');
           await expect(dialog).toBeHidden();
         }
       });
     });
   }

   test.describe('with reduced motion', () => {
     test.use({ reducedMotion: 'reduce' });

     test('the buttons of the actions have no transition', async ({ account, shell }) => {
       await shell.goto(urls.view('recorrido'));
       await account.open();
       const dialog = await account.openAction('Borrar mi cuenta');
       const transition = await dialog
         .getByRole('button', { name: 'Borrar mi cuenta', exact: true })
         .evaluate((element) => getComputedStyle(element).transitionProperty);
       expect(transition).toBe('none');
     });
   });
   ```

4. **Correr** `npm run build && E2E_PORT=4191 npm run test:e2e -- specs/account-data.spec.ts specs/account-hygiene.spec.ts`. Antes de T050, fallan por la razón esperada: no hay «Descargar mis datos» ni «Borrar mi cuenta». Después, en verde.
   - **Si Chromium no emite `download` para el enlace `blob:`** (research-f11b.md, «Lo que no se verificó»), el E2E lo informa con el error real y se consulta al coordinador. El diseño no cambia.
   - **Si un diálogo se desborda a 320 px,** la corrección va en `account.css` y se informa en el PR.
5. **Commit:** `test(qa): E2E de la descarga, de la supresión y de la higiene de «Tu cuenta»`.

### Tarea 7.4 · La documentación (T052, K)

Cambia en el mismo PR que U7 (FR-077):

- **`docs/architecture.md`:**
  - el «Mapa de archivos» suma la fila «Confirmación de la contraseña» (`features/confirm-password`), y la de «Tu cuenta y la raíz de la cuenta» suma las tres acciones de F11b;
  - el «Estado actual» de Feature-Sliced Design suma `features/confirm-password`, con sus dos consumidores (F11b y F12a).
- **`qa/AGENTS.md`:**
  - la fila «Acceso, sesión y Tu cuenta» suma las specs de `features/confirm-password` y las nuevas de `pages/account`, y los tres E2E de F11b;
  - en «Pruebas del front»:
    - `FakeReply.body` con `cutBody` simula un cuerpo que se corta;
    - `holdFirstReply` (en `pages/account/ui/render-account.tsx`) retiene un pedido;
    - las descargas de los E2E se esperan con `page.waitForEvent('download')`;
    - las rutas de la cuenta se registran con `answerConfirmation`, `answerExport` y `answerDeletion`.
- **`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`,** en «`pages/account`»:
  - «F11b suma sus tres secciones (contraseña, datos y supresión) antes de «Salir».» pasa a remitir a [account-f11b.md](./contracts/account-f11b.md), con el orden de las secciones;
  - la lista de slices suma `features/confirm-password`.

**Comprobar** las rutas, los comandos y los enlaces locales de cada pasaje, y `git diff --check`. Commit: `docs: las acciones de la cuenta de F11b en la arquitectura y en qa`.

### Tarea 7.5 · El peso, la compuerta final y el PR a `master` (T053, K)

1. **El peso** (SC-008 y FR-073). Con `npm run build`, `html.length` de `dist/index.html` contra T036 (quickstart-f11b.md §3).

   **La condición de corte:** si la diferencia pasa de +15 000 caracteres o el total llega a `BOOT_SIZE_LIMIT` (1 500 000), F11b no cierra. Se informa la medida y decide el usuario. F11b no trae librerías, así que no hay nada que separar: toda la diferencia es código propio.
2. **La compuerta de 0.2,** sobre `f11b/base` con U5 a U7, con:
   - la red completa cinco veces seguidas (`--repeat-each=5 --retries=0`);
   - `docker compose build taller`, con permiso;
   - la verificación a mano contra el stack (quickstart-f11b.md §4).
3. **Lo que tiene que haber pasado antes del PR a `master`:** F11a, en `master` (TR-12).
4. **El PR** `feat(front): change the password, download the data and delete the account (F11b)`, de `f11b/base` a `master`. Su descripción, en inglés, cuenta:
   - el problema y lo que cambia;
   - el peso, con la diferencia contra T036;
   - la verificación a mano;
   - que C4 lo esperaba (su compuerta G1);
   - lo que queda: el hallazgo de F8 sobre `WRONG_PASSWORD` y, si F12a no estaba, que F12a toma el slice.

**Reversión de U7:** se revierten T053, T052, T051, T050 y T049, en ese orden.

## 8. Documentación que cambia con cada unidad

| Unidad | Documentación |
| --- | --- |
| U5 | `contracts/front-interfaces.md`: `download`, `ApiDownload` y `readAttachmentName` (T037) |
| U6 | Ninguna fuera del código |
| U7 | `docs/architecture.md`, `qa/AGENTS.md` y `contracts/front-interfaces.md`, «`pages/account`» (T052) |

## Lo que otros ítems toman de F11b

- **F12a:**
  - importa `confirmPassword`, `WRONG_PASSWORD` e `isWrongPassword` de `features/confirm-password`, en lugar de crearlos (si F12a llega antes, T041 los muda);
  - pone «Administrar el taller» justo después del aviso, y no antes de «Salir», para no pisar la inserción de F11b;
  - `PasswordStep` sigue en `pages/admin`.
- **F8:** puede usar `confirmPassword` y mostrar `WRONG_PASSWORD` en el campo, en lugar del texto del servidor, que nombra un email.
- **F11d:** pone «Estoy en una computadora compartida» después de `<SignOutSection`, y puede leer `useAccountContext()`.
- **C4:** la compuerta G1 suma F11b integrada, y el recorrido de la CSP suma los tres diálogos de «Tu cuenta».
- **D1c:** el cliente ya tiene `download`, por si una importación o una copia lo necesitan.

## Cobertura de requisitos

| Requisito | Dónde | Prueba |
| --- | --- | --- |
| FR-053 | T043 y T046 | `account-endpoints.spec.ts`, `change-password.spec.tsx` y `account-password.spec.ts` |
| FR-054 | T042, T043 y T046 | `account-failure.spec.ts`, «marks the current password…» y «puts on the new password…» (Vitest y E2E) |
| FR-055 | T040 y T050 | `confirm-password.spec.ts`; las dos specs de U7 confirman antes de la acción y vuelven a pedir ante un 423; el 423 del E2E |
| FR-056 | T038, T043 y T050 | `api-client.spec.ts` (`download`), `account-endpoints.spec.ts`, `download-data.spec.tsx` y `account-data.spec.ts` |
| FR-057 | T050 | «tells it apart from «Exportar mi progreso»…» |
| FR-058 | T050 | «says what is deleted…», «sends nothing without the password and the box» y las claves v1 del E2E |
| FR-059 | T050 | ««Entendido» reloads», «reloads too when the dialog is closed…», «keeps the session of the only admin» y sus E2E |
| FR-019 a FR-021 y FR-023, en F11b | T046 | Las pruebas del 409, del 403, del 401 con la misma cuenta y con otra, y del 429, en `change-password.spec.tsx`; el 419 con otra cuenta, en `delete-account.spec.tsx` |
| FR-024 a FR-031, en F11b | T046 y T050 | Los formularios con `noValidate` y `handleSubmit`; los motivos de la política; la «á» descompuesta; el doble clic; `autocomplete` y «Mostrar» de `PasswordField` |
| FR-066 | T046, T050 y T051 | El foco en el primer campo (Vitest) y «the keyboard alone» (E2E) |
| FR-067 | T046 y T051 | `account.css` y «at 320 px» y «at 390 px» |
| FR-068 | T051 | «with reduced motion» |
| FR-069 | T044, T048 y T053 | El `grep` de la compuerta |
| FR-070 | T051 | «nothing secret is left behind by the account actions» |
| FR-071 | T046 y T050 | Una contraseña equivocada da siempre el mismo texto propio |
| FR-072 | — | F11b no instala nada |
| FR-073 | T053 | La medida contra T036 |
| FR-074 | Todas las tareas de specs | Rojo, después verde, con valores escritos a mano |
| FR-075 | T047 y T051 | Page Objects con localizadores accesibles y el doble de la API |
| FR-076 | T044, T048 y T053 | La red sin editar y la lista de archivos de `qa/` |
| FR-077 | T052 y T053 | La documentación y la compuerta final |
| SC-004 | T045, T049, T047 y T051 | La tabla de estados de abajo |
| SC-005 | T051 | La higiene |
| SC-007 | T051 | El teclado, los dos anchos y el movimiento reducido |
| SC-008 | T053 | El peso bajo 1 500 000 |
| SC-009 | T037, T050 y T051 | Los bytes y el nombre (Vitest y E2E), ninguna copia en el almacenamiento y las claves v1 después de la recarga |
| SC-011 | T053 | La compuerta final y el `grep` de estilos |

## Los estados de SC-004 (las filas de F11b)

| Pantalla | Estado | Prueba |
| --- | --- | --- |
| Cambiar la contraseña | Cargando | «keeps the button busy while the server answers and sends once» |
| | Error de campo | «marks the current password…», «puts on the new password…», «shows every reason…» y «sends nothing with a short new password…» |
| | Error del servidor | «marks the current password…» (`auth_failed`); un 5xx, por `describeFailure` de F11a, con sus specs |
| | Sesión | 401 con la misma cuenta y con otra; 409 `account_mismatch`; 403 `account_disabled`; el 419 lo resuelve el cliente (sus specs de F11a) |
| | Límite | «waits for Retry-After…» (Vitest y E2E) |
| Descargar mis datos | Cargando | «does not export when the dialog closed…», que espera «Preparando el archivo…» deshabilitado |
| | Error de campo | «marks the password with its own text…» |
| | Error del servidor | 423 («asks for the password again…»), el corte («saves nothing…») y el 422 `auth_failed` |
| | Sesión | «offers to reload when the session belongs to another account»; el 419 de `download`, en `api-client.spec.ts` |
| | Límite | «says in hours and minutes…» (Vitest y E2E) |
| Borrar la cuenta | Cargando | «does not delete the account when the dialog closed…», que espera «Borrando…» deshabilitado |
| | Error de campo | «sends nothing without the password and the box» |
| | Error del servidor | 423, 409 `last_admin` y el 422 `auth_failed` por `useAccountFailure` |
| | Sesión | «offers to reload when the page expired and the session is now another account» |
| | Límite | «waits for Retry-After after too many confirmations» |

Cada estado muestra un mensaje que dice qué hacer: el del servidor, el propio de la contraseña, el de la red de F11a o «Recargar».

## Descargas y permisos

- **Ninguna descarga.** F11b no instala dependencias.
- **Docker,** con permiso, sólo en T053: `docker compose build taller` y el stack de la verificación a mano.

## Riesgos y lo que quedó sin verificar

1. **«Tu cuenta» de F11a todavía no existe** (T022 a T025). *Mitigación:* T036 lo comprueba antes de empezar, y la inserción de F11b es «justo antes de `<SignOutSection`», que sobrevive a diferencias de forma.
2. **El orden con F12a.** *Mitigación:* T041 tiene las dos ramas, y el contrato fija dónde inserta cada uno.
3. **La propagación de `close` a través del portal.** Sale de la documentación de React y del caso de F11a, no de una corrida. *Mitigación:* la spec de T045 falla sin el corte, y el E2E de Esc lo prueba en Chromium.
4. **`download` de Playwright con un enlace `blob:`.** *Mitigación:* el E2E de T051 lo fija; si falla, se informa con el error real.
5. **`ReadableStream` y `TextEncoder` en el proyecto `dom` de Vitest.** `cutBody` los usa, y la spec de la descarga corre en jsdom. Node 24 los define como globales, y Vitest los conserva en su entorno jsdom. *Mitigación:* si faltaran, la prueba del corte queda en `api-client.spec.ts` (proyecto `node`), que ya la tiene, y la de la pantalla se informa.
6. **El singleton `accessRequests` en las specs.** Un ingreso que una prueba deja abierto aparece en la siguiente. *Mitigación:* cada spec que lleva al ingreso lo termina.
7. **El peso.** Es una estimación (R33). *Mitigación:* la condición de corte de T053.
8. **La cookie real, `SameSite` y el CSRF real** de los tres pedidos, y el streaming real de la exportación. *Mitigación:* la verificación a mano de quickstart-f11b.md §4.
9. **«Las dos pantallas lo dicen»** (spec, «Edge Cases»: «Exportar mi progreso» y «Descargar mis datos»). La de «Exportar mi progreso» es de Método, que sigue en `app.js` hasta F8, y F11 no toca `app.js` («Queda fuera»). *Qué hace el plan:* F11b cubre su pantalla (FR-057), y el texto de Método va como hallazgo para F8.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| `download` y `renewingCsrf` en el cliente | SC-009 pide los mismos bytes, y la exportación necesita el 419 y `X-Taller-User` como cualquier pedido que modifica | `send` y volver a serializar: rompe los bytes y pierde el nombre |
| El portal y el corte de `close` y `cancel` en `AccountSubdialog` | React propaga esos eventos por su árbol, y los localizadores necesitan los diálogos fuera de «Tu cuenta» | Montarlos como hermanos, como el aviso: obliga a subir el estado a `AccountDialog` de F11a |
| `useAccountFailure`, un hook genérico | Una sola traducción de las fallas para tres formularios, con la contraseña, la sesión, la recarga y la espera | Una copia en cada formulario: tres versiones del mismo orden de decisiones |
