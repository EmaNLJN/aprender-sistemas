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
| **«Pedirla siempre»** (spec, «Alternativas consideradas») | Descargar y borrar confirman la contraseña antes de cada acción | T043 y T050 |
| **C4 espera a F11b** (2026-10-28, noche) | F11b llega a `master` entera, en T053 | R19 |
| **El tope del HTML** (2026-10-28, noche) | `BOOT_SIZE_LIMIT` de 1 500 000, con un subpresupuesto de +15 000 | T053 |
| **El doble de la API canónico** (2026-10-28, noche) | Las rutas de F11b se registran con `api.on` en cada escenario, sin otro `replyTo` ni otra propiedad | T047 y T051 |
| **La lista blanca `/status of NNN/`** (2026-10-28, noche) | Cada error esperado se declara con su código exacto | T047 y T051 |
| **Los stubs del rojo como `const` tipados** (TR-2) | Cada spec en rojo corre contra stubs así | Todas las tareas de specs |
| **La «á» descompuesta con el escape** (F11a-5) | Las specs del cambio escriben `` `${'a'.repeat(14)}á` `` y el caso de 63 más «á», nunca el carácter pegado | T045 |
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
- **La «á» descompuesta** se escribe con el escape, `` `${'a'.repeat(14)}á` ``, nunca pegando el carácter, porque al pegarlo se compone (F11a-5).
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
   - el párrafo «F11b descarga los datos con `send`…» pasa a «F11b descarga con `download`, que conserva los bytes y lee el nombre del adjunto ([account-f11b.md](./account-f11b.md))».
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

3. **Correr** `npm run test:unit -- frontend/src/shared/api/http`: en verde, también las 33 de F11a sin editar. Después, `npm run typecheck` y `npm run lint`.
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
