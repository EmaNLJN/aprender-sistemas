# Implementation Plan: F12a · La administración, sin correo

**Branch**: `023-f12-administracion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F12, en su parte a: FR-001 a FR-043, FR-062 y FR-063, los transversales FR-050 a FR-061, SC-001 a SC-007, SC-009 y SC-010, y las historias 1 a 6. Decisiones, consultas y mediciones: [research.md](./research.md). Interfaces públicas: [contracts/admin-page.md](./contracts/admin-page.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md). F12b tendrá `plan-f12b.md`.

**Objetivo:** que quien administra invite, liste y mantenga las invitaciones por enlace, y gestione las cuentas, desde un diálogo a pantalla entera que se abre desde «Tu cuenta», sin que un alumno vea nada y sin que el resto del taller cambie.

**Arquitectura:**

- **Una página nueva, `pages/admin`,** separada de lo que la contiene (FR-062):
  - recibe la sección inicial y el cierre;
  - lee el cliente y la sesión de F11a;
  - abre como mucho un diálogo de acción a la vez, que resuelve la confirmación, la contraseña a pedido (F12-Q3) y los enlaces.
- **El contenedor de hoy,** `app/account/AdminDialog.tsx`, es un `<dialog>` a pantalla entera. `AccountMenu` de F11a lo recibe por una prop y lo monta desde «Tu cuenta», sólo para admins (F12-Q1).
- **F10 cambia sólo el contenedor y su entrada** («El compromiso con F10»).

**Stack:** TypeScript y React 19.2.8, con lo que ya está instalado: Zustand 5.0.15, React Hook Form 7.89.0 (F11a), Vitest 5.0.3 con jsdom 30.1.2, Testing Library, fishery 2.4.0 y Playwright 1.63.0. Ninguna dependencia nueva (FR-056).

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales», las «Reglas para todos los agentes», el contrato y la sección de tu tarea, enteras. `tasks.md` tiene una línea por tarea (T001 a T026) y remite acá.
> - **La base.** La rama `f12a/base` sale de `f11a/base` con F11a completa (T001 a T035 de F11a), o de `master` si F11a ya llegó ahí. F12a usa piezas de U2 de F11a (`pages/account` y `qa/e2e/pages/account.ts`) y de U3 (`formatLocalDateTime`), así que no empieza sobre una `f11a/base` a medias: T001 lo comprueba. Las unidades U0 a U4 son PR contra `f12a/base`, y F12a llega a `master` en un solo PR, en T026, después del PR de F11a (research.md, R1).
> - **El código verificado.** El código de este plan corrió fuera del repositorio:
>   - las 86 specs de Vitest, en verde, con `tsc`, ESLint y Prettier del repo, sobre el código de F11a de su plan y de `impl-f11a`;
>   - un arnés en Chromium, para el foco, los 320 px y Esc.
>
>   Los E2E tipan pero no corrieron, porque necesitan F11a cableada (research.md, «Mediciones» y «Lo que no se verificó»).
>
>   **Lo que enmendó la revisión del 2026-10-28 no corrió:** los stubs del rojo como `const` tipados, las listas blancas `/status of NNN/` de los E2E, las ramas de T001 y lo que cambió en T002, T007 a T009 y T023 para partir del código real de F11a (`impl-f11a`, a7b3c71d).
>
>   **Lo que enmendó la decisión de F14 (Q1-A, 2026-10-28) tampoco corrió:** el grupo «Acciones sobre {nombre}» en `AccountsTable`, las specs de T015 que cuentan dentro de él y el método `actions(name)` del Page Object con los conteos de T022.
>
>   El tipado pasó con `messagesOf(error: FieldError | GlobalError | undefined)`. F11a la implementó así (`impl-f11a`, `frontend/src/shared/ui/form/show-failure.ts:8`, T017), por el hallazgo 1 de F12a, y T012 y T018 la usan tal cual.

## Summary

F12a trae las pantallas que la consola no tiene: las cuentas y las invitaciones por enlace. El enfoque:

- **Cinco unidades apiladas, con un solo merge a `master`** (R1):
  - **U0:** la línea base y la verificación de lo que F11a ya dejó (`reloadDocument` en `shared/lib`);
  - **U1:** el modelo, los endpoints, la entrada en «Tu cuenta» y lo que el doble de la API necesita;
  - **U2:** la página, con sus listas, sus formularios y su diálogo de acción;
  - **U3:** los E2E y el cableado;
  - **U4:** la documentación, el peso y el PR.
- **La página no conoce su contenedor** (R3). Recibe `initialSection` y `onClose`, y el Page Object la abre desde un solo método (FR-063).
- **Un solo diálogo de acción** (R4 y R5):
  - confirma, pide la contraseña ante un 423, repite la acción una sola vez y muestra los enlaces con la pregunta antes de cerrar;
  - compara `event.target` con `event.currentTarget`, porque en React los eventos de `<dialog>` burbujean;
  - devuelve el foco al control que lo abrió con `flushSync`.
- **Las listas no desmontan las filas al volver a pedir la página** (R7). El botón que abrió un diálogo sigue ahí después de un 409, y las acciones de una fila tienen lugares fijos.
- **`reactionTo` traduce cada falla** a pedir el ingreso, recargar o mostrar el mensaje (R6), sobre `describeFailure` de F11a.
- **Ningún `style=`, ningún `.sr-only` y ninguna dependencia.** El peso estimado es de unos 32 000 caracteres (R12), y es la decisión 1 del informe.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0; las versiones de arriba.

**Primary Dependencies**: las de F11a. Ninguna nueva.

**Storage**: ninguno. Nombres, emails y enlaces viven en el estado de los componentes y se descartan al cerrar (FR-008).

**Testing**:

- **Vitest,** en los dos proyectos de `frontend/vitest.config.ts`, en `master` desde #67: `node` para `*.spec.ts` y `dom` para `*.spec.tsx`, con el setup `frontend/src/vitest.setup.ts`.
- **Playwright,** con el Page Object de la administración sobre el doble de la API de F11a, con `sessionAccount: ADMIN`.

Los valores esperados salen del contrato de C3b, de `backend/api/lang/es/` y de la spec, nunca del código que se prueba ni de una factory.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript con vistas legacy); pantallas nuevas.

**Performance Goals**: ninguna de velocidad. El peso de `dist/index.html` tiene una condición de corte (R12 y T026).

**Scale/Scope**:

- **Lo nuevo:** unos 30 archivos de producción en `frontend/src/pages/admin/`, uno en `app/account/` y uno en `entities/session/`; 14 specs de Vitest; 4 E2E con un Page Object.
- **Lo que cambia:**
  - `AccountMenu.tsx`, `AccountDialog.tsx` y el índice de `pages/account`;
  - `AccountRoot.tsx` y `main.tsx`;
  - los fixtures de `qa/e2e` (el doble de la API no cambia: F11a ya guarda `search`);
  - `docs/architecture.md` y `qa/AGENTS.md`.

## Restricciones globales

Valen para toda tarea. Los valores están copiados de la spec, de la constitución y de las reglas que deja F11a.

- **La red, sin editar** (FR-060):
  - los E2E de `qa/e2e/specs/` que existen en la base (los de F1, A2, F4 y F11a, y los de cualquier ítem que haya entrado antes: la cuenta es la de T001, no un número de este plan);
  - los escenarios de `boot-check`, `dist-content-check` y `load-order-check`.
- **Lo que sí cambia en `qa/e2e/`:**
  - ningún cambio en `fixtures/api-double.ts`: `ApiCall.search` ya está (`impl-f11a`, `qa/e2e/fixtures/api-double.ts:11` y `:41`);
  - `fixtures/index.ts`, que suma el fixture `admin`;
  - `pages/admin.ts` y `lib/admin-contract.ts`, nuevos;
  - los cuatro E2E nuevos, `specs/admin-*.spec.ts`.
- **El documento con la administración cerrada** (FR-007):
  - nada nuevo en el shell, y ninguna región `alert` o `status` de más;
  - `#account-root` queda como lo deja F11a;
  - ningún elemento nuevo con `.sr-only` (R5 de `css-contract`, modo estricto) y ningún `.button` antes de `#main`.
- **El estilo:** ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` (FR-054). Las reglas nuevas van en `frontend/src/pages/admin/ui/admin.css`.
- **La seguridad** (FR-008): ningún nombre, email ni enlace en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial, un store compartido ni la consola.
- **Los formularios** se envían sólo por `handleSubmit`, con `noValidate` y sin `action` (FR-055).
- **Los textos:** los de la spec, «Textos que lee quien administra», tal cual. Los del servidor se muestran como llegan. Los que agrega el plan están en research.md, «Textos que agrega el plan».
- **El contrato de C3b,** sin cambios:
  - las listas piden de a 25 (`perPage=25`);
  - la búsqueda, de hasta 80 caracteres, sale sólo al enviarla;
  - invitar va siempre con `delivery: "link"`, y reenviar, con `{delivery: "link"}`;
  - todo lo que modifica lleva `X-Taller-User` con el id de la cuenta en memoria.
- **La contraseña** (F12-Q3):
  - se pide sólo ante un 423;
  - la acción se repite una sola vez después del 201;
  - el front no lleva una lista de qué la pide.
- **El peso:**
  - `dist/index.html` queda bajo `BOOT_SIZE_LIMIT` de `qa/build-check.ts`: 1 500 000 caracteres en `master` desde #76. T001 anota el valor de la base;
  - F12a suma como mucho +35 000 sobre la línea base de T001;
  - si se pasa, T026 se detiene y decide el usuario (R12).
- **La complejidad:** ninguna función nueva pasa de 10. Los avisos de `npm run lint` no suben respecto de T001.
- **La accesibilidad:**
  - todo se hace con el teclado, y el foco inicial va al título (FR-050);
  - cada tabla tiene título y encabezados, y los botones de cada fila nombran a la persona o el email (FR-051);
  - los botones de una fila de «Cuentas» van en un grupo «Acciones sobre {nombre}», para que la columna «Uso» de F14 no cambie los conteos (decisión del usuario, 2026-10-28, Q1-A de F14);
  - desde 320 px no hay desplazamiento horizontal: la tabla se desplaza en su región, y los campos miden 16 px (FR-052);
  - con movimiento reducido no hay transiciones (FR-053).
- **El backend:** no cambia.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, Feature-Sliced Design (`pages/admin` no importa otra página; `app/` compone), `interface` para las formas, un componente o hook por archivo con `export default`, estado local y nada de Zustand nuevo ni nuqs |
| II. TDD y pruebas útiles | Sí | Cada par de tareas abre con su spec en rojo contra firmas que lanzan `not implemented`. Los valores esperados salen del contrato de C3b, de `lang/es/` y de la spec; fishery arma las entradas |
| III. Código entendible | Sí | Un diálogo de acción con pasos con nombre; `reactionTo` es la única traducción de una falla de la administración; ninguna función pasa de 10 |
| IV. Contenido en Git, IDs estables | Sí | No toca `content/`, el progreso ni las URL |
| V. Capas y contratos explícitos | Sí | `pages/admin` con su índice; `isAdmin` en `entities/session`; el contenedor en `app/account`; el contrato en `contracts/admin-page.md` |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de la spec; teclado, foco, 320 px y movimiento reducido con E2E; comandos portables |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva. Los enlaces no se guardan |
| VIII. Flow-forward | Sí | `tasks.md` con una línea por tarea; F12b tendrá `plan-f12b.md` |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **F12-Q1:** un diálogo a pantalla entera desde «Tu cuenta», sólo para admins, y la ruta en F10 | `AdminDialog` en `app/account`, montado por `AccountMenu` con la prop `administration`. `AdminPage` sólo recibe la sección y el cierre, y el Page Object la abre desde `open()` | T007, T008, T019, T020, T022 y T023; contrato |
| **F12-Q2:** C4 espera a F12a | F12a cierra con un solo PR a `master` (R1), que es lo que integra la compuerta G1 de C4 | T026 |
| **F12-Q3:** la contraseña a pedido | `ActionDialog` pasa al paso de la contraseña ante un 423 y repite `send()` una vez | T011 y T012 |
| **P3:** la partición | Este plan cubre los 57 requisitos de F12a. FR-044 a FR-049 quedan para `plan-f12b.md`, y `features.passwordReset` no cambia nada en F12a (FR-035) | Todo el plan |

## Project Structure

### Documentation (this feature)

```text
specs/023-f12-administracion/
├── spec.md                      # F12 entera, con su clarify
├── research.md                  # decisiones, consultas y mediciones de F12a
├── plan.md                      # este archivo (F12a); F12b irá a plan-f12b.md
├── quickstart.md                # cómo se verifica F12a
├── contracts/admin-page.md      # la página, su contenedor y lo que toman F10, F12b y F11b
└── tasks.md                     # T001 a T026
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
frontend/src/
├── app/
│   ├── main.tsx                                 # cambia (K): importa pages/admin/ui/admin.css
│   └── account/
│       ├── AccountRoot.tsx                      # cambia (K): administration={AdminDialog}
│       └── AdminDialog.tsx (+ admin-dialog.spec.tsx)   # nuevo (K): el contenedor de hoy
├── shared/lib/reload-document.ts                # no cambia: ya está ahí desde F11a (T012); T002 lo verifica
├── entities/session/
│   ├── model/is-admin.ts (+ .spec.ts)           # nuevo (A)
│   └── index.ts                                 # cambia (A): exporta isAdmin
├── pages/account/
│   ├── ui/AccountMenu.tsx                       # cambia (A): el panel y la prop administration
│   ├── ui/AccountDialog.tsx                     # cambia (A): «Administrar el taller»
│   ├── ui/admin-entry.spec.tsx                  # nuevo (A)
│   └── index.ts                                 # cambia (A): exporta AdministrationProps
└── pages/admin/                                 # nuevo
    ├── index.ts                                 # (P) AdminPage y AdminSection
    ├── model/                                   # (M)
    │   ├── types.ts, labels.ts, invitation-texts.ts
    │   ├── parse-admin.ts, emails.ts, user-actions.ts, link-texts.ts, react-to-failure.ts (+ .spec.ts cada una)
    │   └── admin.factory.ts                     # fishery: cuerpos con la forma del contrato de C3b
    ├── api/admin-endpoints.ts (+ .spec.ts)      # (M) los ocho pedidos
    ├── lib/
    │   ├── copy-text.ts, recover-session.ts     # (D)
    │   └── use-paged-list.ts                    # (L)
    └── ui/
        ├── render-admin.tsx                     # (D) la ayuda de las specs
        ├── ActionDialog.tsx, ConfirmStep.tsx, PasswordStep.tsx, LinksStep.tsx, LinkResult.tsx,
        │   FailureNotice.tsx, use-action-dialog.ts, action-dialog.spec.tsx            # (D)
        ├── ListView.tsx, Pagination.tsx, FilterSelect.tsx, paged-list.spec.tsx      # (L)
        ├── AccountsSection.tsx, AccountsTable.tsx, accounts-section.spec.tsx        # (L)
        ├── InvitationsSection.tsx, InvitationsTable.tsx, InviteForm.tsx, EmailsField.tsx,
        │   invitations-section.spec.tsx                                             # (I)
        ├── AdminPage.tsx, admin-page.spec.tsx   # (P)
        └── admin.css                            # (P)
qa/e2e/
├── fixtures/api-double.ts                       # no cambia: ApiCall.search ya está (F11a)
├── fixtures/index.ts                            # cambia (E): el fixture admin
├── lib/admin-contract.ts                        # nuevo (E)
├── pages/admin.ts                               # nuevo (E)
└── specs/admin-entry, admin-accounts, admin-invitations y admin-layout (.spec.ts)   # nuevos (E)
docs/architecture.md, qa/AGENTS.md               # cambian (K, T025)
```

**Structure Decision:** la página vive en `pages/admin`, con `model`, `api`, `lib` y `ui`. `app/account` compone las dos páginas: `pages/account` no importa `pages/admin` (research.md, R2). Ningún slice importa un archivo interno de otro: se importa su `index.ts`, salvo las ayudas de las specs (`fake-fetch.ts` y las `*.factory.ts`), que se importan por ruta directa sólo desde specs.

## Review Focus

Lo que el revisor mira primero:

- **La página no conoce su contenedor.** `pages/admin` no importa `pages/account`, `app/` ni nada de un `<dialog>` contenedor, y `AdminPage` tiene dos props.
- **Los diálogos.**
  - Cada `onCancel` y `onClose` compara `event.target` con `event.currentTarget`.
  - Hay un solo diálogo abierto sobre la administración.
  - El 401 cierra el diálogo antes de pedir el ingreso.
  - El foco vuelve al control que abrió el diálogo o al título de su tabla.
- **La contraseña.** La acción se repite exactamente una vez, y nada sale después de cancelar.
- **La red.** El diff de `qa/e2e/specs/` toca sólo archivos `admin-*.spec.ts` nuevos. `boot-check`, `dist-content-check` y `load-order-check` no cambian. Cada falla esperada se declara con `/status of NNN/` y su código exacto, o con `/net::ERR_FAILED/` para el pedido abortado; nunca con `/Failed to load resource/`.
- **El peso y los estilos.** La medida contra T001, ningún `style=` y ningún `.sr-only`.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **Una confirmación que se cierra dentro de la administración.** En React, `close` y `cancel` de un `<dialog>` burbujean por el árbol. Sin comparar el `target`, cerrar una confirmación cerraría la administración entera. Lo fija «stays open when a confirmation inside it closes» en `app/account/admin-dialog.spec.tsx` (T023), y se comprobó que falla sin la comparación.
2. **Cancelar mientras se confirma la contraseña.** La respuesta del `confirm-password` llega a un diálogo ya cerrado y no tiene que disparar la acción. Lo fija «does not send the action when the dialog closed while the password was being confirmed» (T011), que falla sin la guarda `finished`.
3. **Un segundo 423 después de confirmar.** La acción se repite una sola vez y el segundo 423 se muestra, sin pedir la contraseña de nuevo ni entrar en un ciclo. Lo fija «shows the message of a second 423 instead of asking again» (T011).
4. **El foco después de que la lista se vuelve a pedir.** Después de un 409 `last_admin`, la página se vuelve a pedir con el diálogo abierto. Al cancelar, el foco tiene que volver a «Quitar admin a Beto Gómez», que debe seguir siendo el mismo botón. Lo fija «explains the last admin, keeps the row and asks for the page again» en `admin-accounts.spec.ts` (T022).
5. **El foco al abrir dentro del diálogo.** Si el contenedor abre con `showModal()` en un `useEffect`, el navegador mueve el foco al primer botón después de que la página enfocó su título. jsdom no lo ve. Lo fija `await expect(admin.title).toBeFocused()` en «opens the administration on «Cuentas»…» de `admin-entry.spec.ts` (T022), y se comprobó en Chromium (research.md, «Mediciones»).

## Reparto en paralelo

Los dueños tienen archivos disjuntos («Project Structure»). Cada uno trabaja en su worktree sobre `f12a/base` y entrega una rama.

- **Delegables al subagente `implementador`:** M, A, E, D, L, I y P (`AGENTS.md`, «Trabajo con subagentes»). Se les dan sus archivos, el contrato, los valores exactos y los checks, y se les dice que no dejen comentarios.
- **K, el coordinador,** es el agente principal:
  - hace U0, el contenedor, `AccountRoot.tsx`, `main.tsx`, la documentación, las compuertas y el PR;
  - revisa cada diff.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 y T002 (U0) |
| 1 | M, A y E a la vez | **M:** T003 a T006. **A:** T007 y T008. **E:** T009 |
| 1b | K | T010 (compuerta de U1) |
| 2 | D, L y E a la vez | **D:** T011 y T012. **L:** T013 y T014. **E:** T022 (los E2E, en rojo) |
| 3 | L e I, desde S2 | **L:** T015 y T016. **I:** T017 y T018 |
| 4 | P, desde S3 | T019 y T020 |
| 4b | K | T021 (compuerta de U2) |
| 5 | K | T023 (el contenedor y el cableado) y T024 (compuerta de U3) |
| 6 | K | T025 (documentación) y T026 (peso, compuerta final y PR a `master`) |

**Puntos de sincronización:**

- **S1:** M entregó T006 y K cerró T010. D y L usan el modelo y los endpoints.
- **S2:** D entregó T012 y L entregó T014. Las secciones usan el diálogo de acción y la lista paginada.
- **S3:** L entregó T016 e I entregó T018. `AdminPage` dibuja las dos secciones.
- **S4:** cada compuerta (T010, T021, T024 y T026) integra su unidad en `f12a/base`.

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173` y E `4194`.

**Integración** (research.md, R1):

- Las unidades son PR contra `f12a/base`, que sale de `f11a/base` con F11a completa (T001 a T035 de F11a), o de `master` si F11a ya llegó ahí. Cada PR se revierte solo en `f12a/base`.
- El PR final de `f12a/base` a `master` lo abre K en T026, después de que el PR de F11a llegue a `master` y con `f12a/base` rebasada sobre ese `master`.
- **Si la base no tiene F11a completa** (falta `pages/account`, `qa/e2e/pages/account.ts` o `shared/lib/format-local-date-time.ts`), F12a no empieza: T001 lo comprueba («Ramas»).
- **Si F10 llegara antes,** la administración nace como ruta, y el plan se consulta con el usuario (spec, Assumptions).

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (historias 1 a 6, FR-001 a FR-043, FR-050 a FR-063), research.md, el contrato y tu tarea;
  - el contrato de F11a (`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`);
  - las skills `tdd`, `clean-code`, `vitest`, `react-testing` y las de Vercel;
  - si escribís E2E, `playwright-best-practices`.
- **TDD, siempre.**
  - Cada módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, para que su spec falle por comportamiento y no por un import. El stub se escribe como `const` tipado, sin parámetros, porque el prefijo `_` no silencia `no-unused-vars` en este repositorio:
    - una función: `export const isAdmin: (user: PublishedUser | null) => boolean = () => { throw new Error('not implemented'); };`;
    - un componente: `const ActionDialog: FunctionComponent<ActionDialogProps> = () => { throw new Error('not implemented'); };`, con `export default ActionDialog;` al final;
    - un hook: `const usePagedList: <Q extends Paged, T extends Identified>(load: LoadPage<Q, T>, initialQuery: Q, ownId: number) => PagedList<Q, T> = () => { throw new Error('not implemented'); };`, con su `export default`.

    La implementación de la tarea verde reemplaza el stub por la declaración que escribe este plan.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Los valores esperados salen del contrato de C3b (`specs/010-c3b-admin-ciclo-de-vida/contracts/http.md`), de `backend/api/lang/es/`, de la spec o de un ejemplo resuelto a mano, nunca del módulo que se prueba ni de una factory.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Imports:**
  - un slice se importa por su `index.ts`;
  - dentro de `pages/admin`, por ruta directa;
  - `shared/lib/*` y `shared/ui/form`, como los deja F11a;
  - las ayudas de specs (`shared/api/http/fake-fetch.ts`, `pages/admin/model/admin.factory.ts` y `pages/admin/ui/render-admin.tsx`), por ruta directa y sólo desde specs.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>`, `npm run typecheck` y `npm run lint`;
  - `npx prettier --write <tus archivos>` antes de cada commit y, después, `npm run format:check`;
  - `npm run build` y, después, `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo.**
  - Código, nombres de test y comentarios en inglés; la interfaz en español rioplatense, con el texto exacto de la spec.
  - **Sin comentarios.** Este plan no escribe ninguno.
  - `interface` para las formas de objetos.
  - Un componente o un hook por archivo, declarado como `const` con nombre, con `export default` al final. Las funciones y las constantes van con exports nombrados.
  - Ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText`.
  - `useStore` siempre con selector. F12a no suma ninguna guarda de ESLint: si la base ya trae la de F5 o F6 (`no-restricted-syntax` con `CallExpression[callee.name='useStore'][arguments.length=1]` en `eslint.config.ts`), la cumple; si no, la trae el primero de F5 y F6 que entre.
- **Si F11a cambió una firma de su contrato al implementarse** (T001 las anota en su paso 4; `messagesOf`, por ejemplo, ya acepta el `GlobalError` de React Hook Form), usá la firma de la base y avisá al coordinador. No cambies código de F11a fuera de los archivos de tu tarea.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(front): …` o `test(qa): …` para la spec en rojo;
  - `feat(front): …` para lo nuevo;
  - `refactor(front): …` sólo para lo que no cambia comportamiento;
  - `docs: …` para la documentación.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## Ramas: lo que T001 detecta en la base

F12a se escribió contra el plan de F11a y se revisó contra `impl-f11a` (a7b3c71d, hasta T021 de F11a). T001 corre cada detección sobre `f12a/base`, anota el resultado en research.md y aplica la rama que toca. Ninguna cambia el número ni el orden de las tareas.

| Rama | Cómo se detecta | Sin la rama | Con la rama |
| --- | --- | --- | --- |
| **B1.** F11a completa | `ls frontend/src/pages/account/ui/AccountMenu.tsx qa/e2e/pages/account.ts frontend/src/shared/lib/format-local-date-time.ts` y `git grep -n "account: async" -- qa/e2e/fixtures/index.ts` | Falta algo: F12a no empieza. `impl-f11a` a7b3c71d todavía no tiene ninguno de los cuatro (T022 a T027 de F11a) | Sigue |
| **B2.** El lugar de la administración en «Tu cuenta» (F11a-1) | `git grep -n "administration?: ComponentType<AdministrationProps>" -- frontend/src/pages/account/ui/AccountMenu.tsx` y `git grep -n "onAdminister" -- frontend/src/pages/account/ui/AccountDialog.tsx` | No imprimen nada: T007 suma la interfaz y la prop, y T008 hace `AccountMenu.tsx` y `AccountDialog.tsx` como dice el plan | Los dos imprimen: T007 no toca `AccountMenu.tsx` (sólo suma el export de `AdministrationProps` en `pages/account/index.ts` si falta). T008 suma sólo `isAdmin`, el panel `'administration'` con la condición `isAdmin(account)` y el botón «Administrar el taller», sobre los archivos de la base y sin reescribirlos |
| **B3.** F8 entró antes (F12a-9) | `git grep -n "'POST /api/auth/confirm-password'" -- qa/e2e/fixtures/api-double.ts` | `confirm-password` no tiene respuesta por omisión: un pedido sin `api.on` da 404 y queda en `unhandled` | `installDefaults` ya la responde con 201, junto con `GET /api/progress` y el reset de F8. Los `api.on('POST /api/auth/confirm-password', …)` de T022 la reemplazan, porque `on` hace `Map.set` (`impl-f11a`, `qa/e2e/fixtures/api-double.ts:87-89`) |
| **B4.** A3 entró antes | `git grep -n "ifNoneMatch" -- qa/e2e/fixtures/api-double.ts` | Nada cambia | El doble busca la ruta con la query y después sin ella, siempre antes del CSRF: las rutas de F12a, registradas sin query, se encuentran igual. A3 cambia `SignOutSection.tsx` (`forgetContentCopy`) y el montaje de «Tu cuenta»: T008 y T023 suman lo suyo sobre los archivos de la base y no deshacen eso |
| **B5.** El tope del HTML | `grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts` | — | 1 500 000 desde #76. Si la base todavía dice 1 250 000, `f11a/base` no se rebasó sobre #76: se anota, y T026, que corre sobre `f12a/base` rebasada sobre `master`, usa 1 500 000 |
| **B6.** La guarda de `useStore` (F5 o F6) | `git grep -n "arguments.length=1" -- eslint.config.ts` | F12a no la suma | La cumple: sus dos `useStore` llevan selector |

En las dos situaciones de B3, cada escenario de T022 que llega a `confirm-password` registra su respuesta con `api.on`, y ninguno supone que la ruta no responde.

## 0. U0 · La base (coordinador K, onda 0)

**Cubre:** FR-057 (la medida inicial) y FR-060 (la red de partida).

### Tarea 0.1 · La línea base (T001)

- **Quién y cuándo:** K, sobre `f12a/base` recién creada (`f11a/base` con F11a completa, o `master` si F11a ya llegó; «Reparto en paralelo», «Integración») y antes de cualquier cambio.
- **Comprobar primero:** las ramas B1 a B6 («Ramas: lo que T001 detecta en la base»). Si B1 falla, F12a no empieza.
- **Entrega:** un commit de documentación que suma a research.md la sección «Línea base de la implementación», con:
  - el hash de la base y la fecha;
  - `html.length` de `dist/index.html` y el valor de `BOOT_SIZE_LIMIT` (B5);
  - la cantidad de checks de `npm test` y de pruebas de Vitest;
  - los avisos de `npm run lint`;
  - la cantidad de E2E, que es la que usan las compuertas (no un número de este plan);
  - el resultado de cada rama, B1 a B6;
  - las firmas de F11a del paso 4, y las que difieran de lo que usa este plan.
- **Pasos:**
  1. Correr, todo en verde: `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`. Si algo falla, F12a no empieza.
  2. Medir `node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"` y contar los avisos (`npm run lint 2>&1 | grep -c warning`).
  3. Correr las detecciones de B1 a B6 y anotar qué rama aplica.
  4. **Comparar las firmas reales de F11a** en la base con las que usa este plan. En `impl-f11a` (a7b3c71d) son estas; si la base difiere, se anota y la tarea que la usa sigue la de la base:
     - **el doble,** `qa/e2e/fixtures/api-double.ts`: `` type ApiRoute = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /api/${string}` `` (`:6`); `ApiCall` con `method`, `path`, `search`, `xsrf`, `user` y `body` (`:8-15`); `ApiReply` con `status`, `json?`, `body?`, `contentType?` y `headers?` (`:17-23`); en `ApiDouble`, `account` y `signInAccount` (`:54-55`), `calls` (`:56`), `on(route: ApiRoute, handler: ApiHandler): void` (`:87`), `reply(route: ApiRoute, ...replies: ApiReply[]): void` (`:91`), `callsTo(route: ApiRoute): ApiCall[]` (`:95`) y `assertAllHandled(): void` (`:100`). `replyTo` busca la ruta antes de mirar el CSRF (`:127-139`): una ruta sin registrar da 404 y queda en `unhandled`;
     - **`messagesOf(error: FieldError | GlobalError | undefined): string[]`,** en `frontend/src/shared/ui/form/show-failure.ts:8`;
     - **`reloadDocument(): void`,** en `frontend/src/shared/lib/reload-document.ts:1`;
     - **`reauthenticate(expectedUserId: number, dependencies: { readonly requestSignIn: RequestSignIn; readonly reloadDocument: () => void }): Promise<ReauthenticationOutcome>`,** en `frontend/src/features/sign-in/model/reauthenticate.ts:5-8`;
     - **`AccountMenu` y `AccountDialog`** (B2) y el fixture `account` con su `AccountPage` (B1), que en a7b3c71d todavía no existen: se anotan sus props y sus métodos tal como están en la base (`entryHost`, `reloadDocument`, `open()`, `button()`, `dialog` y `entry`, que usan T007, T009 y T022).
  5. Registrar los valores. El presupuesto de F12a (+35 000) se cuenta desde lo medido acá.
- **Commit:** `docs(specs): línea base de la implementación de F12a`.

### Tarea 0.2 · `reloadDocument` ya está en `shared/lib` (T002)

- **Quién:** K. F11a lo dejó en `frontend/src/shared/lib/reload-document.ts` desde su T012 (ledger de F11a, `:52` y `:55`), por el hallazgo 3 de F12a: T002 ya no muda nada y queda como una verificación de la compuerta de U0. La página de la administración lo necesita, y `pages` no puede importar `app` (research.md, R2).
- **Pasos:**
  1. Comprobar el archivo y su contenido, que tiene que ser este (`impl-f11a`, `frontend/src/shared/lib/reload-document.ts:1-3`):

     ```ts
     export function reloadDocument(): void {
       window.location.reload();
     }
     ```

  2. Comprobar que `frontend/src/app/account/reload-document.ts` no existe y que `git grep -n "reload-document" -- frontend/src` lista sólo imports de `shared/lib/reload-document` (en a7b3c71d, `frontend/src/app/account/AccountRoot.tsx:3`).
  3. Si algo difiere, F12a no sigue: se anota en research.md y se avisa al coordinador.
- **Commit:** ninguno. El resultado va en el commit de T001.
- **Compuerta de U0:** los pasos de 0.3 sobre T001 y T002, y el PR `docs(specs): F12a implementation baseline (F12a U0)` contra `f12a/base`.

### 0.3 · La compuerta de cada unidad

K la corre antes de integrar cada unidad en `f12a/base` (T010, T021, T024 y T026). Cada dueño corre en lo suyo los pasos 2 y 3, sin Docker. La unidad no se integra con una sola casilla en rojo.

1. **Antes de empezar:** sobre su base, `npm test` y la red E2E, en verde.
2. **Los comandos:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`.
3. **La red sin editar:**
   - `git diff --name-only f12a/base -- qa/e2e/specs qa/boot-check.ts qa/dist-content-check.ts qa/load-order-check.ts` lista sólo archivos `qa/e2e/specs/admin-*.spec.ts`;
   - `git diff --diff-filter=M --name-only f12a/base -- qa/e2e/specs` no lista nada;
   - `git diff --name-only f12a/base -- qa/e2e/fixtures/api-double.ts` no lista nada: el doble no cambia;
   - `git grep -n "Failed to load resource/" -- 'qa/e2e/specs/admin-*.spec.ts'` no imprime nada: las fallas se declaran con `/status of NNN/` o `/net::ERR_FAILED/`.
4. **Sin estilos en línea:** `git diff f12a/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText|sr-only)'` no imprime nada.
5. **Complejidad:** `npm run lint` da 0 errores y, como mucho, los avisos de T001.
6. **Peso:** `html.length` de `dist/index.html`, anotado en la descripción del PR con la diferencia contra T001.
7. **El PR,** contra `f12a/base`, con título y descripción en inglés. La descripción cuenta el contexto, qué faltaba, qué cambia, cómo se verificó (con los comandos y las medidas de arriba) y qué queda pendiente.

## 1. U1 · El modelo, los endpoints, la entrada y el doble (onda 1: M, A y E; onda 1b: K)

**Cubre:**

- **El modelo y los endpoints:** FR-009, FR-012, FR-015, FR-016, FR-018 a FR-022, FR-024 a FR-028, FR-032, FR-033, FR-036, FR-039 a FR-041 y FR-058;
- **la entrada y el lugar del contenedor:** FR-001 y FR-004;
- **la base de los E2E:** FR-059 y FR-063.

**Entrega:**

- el modelo de `pages/admin`: los tipos, los parsers, los emails, las acciones de una fila, los textos de los enlaces y las reacciones a una falla;
- los ocho pedidos a la API;
- `isAdmin`;
- la entrada «Administrar el taller», con el lugar del contenedor en `AccountMenu`;
- el fixture `admin`, los datos del contrato y el Page Object (el doble ya guarda `search` desde F11a).

Ningún alumno ve nada todavía: `AccountRoot` no pasa `administration` hasta T023.

### Tarea 1.1 · Las specs del modelo, en rojo (T003, M)

**Archivos:** en `frontend/src/pages/admin/model/`:

- `types.ts`, entero;
- `admin.factory.ts`;
- los stubs de `parse-admin.ts`, `emails.ts`, `user-actions.ts`, `link-texts.ts` y `react-to-failure.ts`;
- una spec por módulo.

**Consume:** de F11a, `AccountRole`, `ApiFailure`, `FieldErrors`, `describeFailure`, `formatLocalDateTime` e `isPlainObject`. **Produce:** los tipos del modelo, que usan T005 a T020.

1. **`types.ts`,** entero:

   ```ts
   import type { AccountRole } from '../../../entities/session';
   import type { ApiFailure } from '../../../shared/api/http';

   export type AdminSection = 'accounts' | 'invitations';
   export type AccountStatus = 'active' | 'disabled' | 'deleting';
   export type InviteResult = 'created' | 'renewed' | 'user_exists' | 'invitation_pending';
   export type EntryResult = InviteResult | 'resent';
   export type InvitationState = 'pending' | 'expired';

   export interface AdminUser {
     readonly id: number;
     readonly name: string;
     readonly email: string;
     readonly role: AccountRole;
     readonly status: AccountStatus;
     readonly emailVerified: boolean;
     readonly createdAt: string;
   }

   export interface AdminInvitation {
     readonly id: number;
     readonly email: string;
     readonly role: AccountRole;
     readonly expiresAt: string;
     readonly expired: boolean;
     readonly invitedBy: string | null;
     readonly createdAt: string;
   }

   export interface PageMeta {
     readonly page: number;
     readonly lastPage: number;
     readonly total: number;
   }

   export interface ListPage<T> {
     readonly items: readonly T[];
     readonly meta: PageMeta;
   }

   export interface IssuedLink {
     readonly email: string;
     readonly url: string;
     readonly expiresAt: string;
   }

   export interface InviteEntry {
     readonly email: string;
     readonly result: EntryResult;
     readonly link: IssuedLink | null;
   }

   export interface Deletion {
     readonly status: AccountStatus;
     readonly message: string;
   }

   export interface UserQuery {
     readonly page: number;
     readonly q: string;
     readonly role: AccountRole | '';
     readonly status: AccountStatus | '';
   }

   export interface InvitationQuery {
     readonly page: number;
     readonly role: AccountRole | '';
     readonly state: InvitationState | '';
   }

   export type UserChange =
     { readonly status: 'active' | 'disabled' } | { readonly role: AccountRole };

   export type AdminOutcome<T> =
     { readonly ok: true; readonly value: T } | { readonly ok: false; readonly failure: ApiFailure };

   export interface Confirmation {
     readonly body: readonly string[];
     readonly confirmLabel: string;
     readonly pendingLabel: string;
     readonly acknowledgement?: string;
   }

   export type DialogStart =
     | { readonly kind: 'confirm'; readonly title: string; readonly confirmation: Confirmation }
     | { readonly kind: 'password'; readonly title: string }
     | { readonly kind: 'links'; readonly title: string; readonly entries: readonly InviteEntry[] };

   export type ActionResult =
     | { readonly kind: 'done' }
     | { readonly kind: 'links'; readonly entries: readonly InviteEntry[] }
     | { readonly kind: 'failed'; readonly failure: ApiFailure };

   export type DialogEnd = 'done' | 'cancelled' | 'unchanged' | 'signed-out';
   ```

2. **`admin.factory.ts`.** Los cuerpos tienen la forma del contrato de C3b, con los campos que la página descarta:

   ```ts
   import { Factory } from 'fishery';

   export interface AdminUserBody {
     id: number;
     name: string;
     email: string;
     role: 'admin' | 'student';
     status: 'active' | 'disabled' | 'deleting';
     emailVerified: boolean;
     privacyVersion: string | null;
     createdAt: string;
     updatedAt: string;
   }

   export interface AdminInvitationBody {
     id: number;
     email: string;
     role: 'admin' | 'student';
     delivery: 'link' | 'email';
     expiresAt: string;
     expired: boolean;
     sentAt: string | null;
     sendFailedAt: string | null;
     invitedBy: { id: number; name: string } | null;
     createdAt: string;
   }

   export interface PageBody<T> {
     data: T[];
     meta: { page: number; perPage: number; total: number; lastPage: number };
   }

   export const adminUserBodyFactory = Factory.define<AdminUserBody>(({ sequence }) => ({
     id: 100 + sequence,
     name: `Persona ${sequence}`,
     email: `persona${sequence}@x.com`,
     role: 'student',
     status: 'active',
     emailVerified: true,
     privacyVersion: '2026-10-dev',
     createdAt: '2026-10-05T12:00:00.000Z',
     updatedAt: '2026-10-05T12:00:00.000Z',
   }));

   export const adminInvitationBodyFactory = Factory.define<AdminInvitationBody>(({ sequence }) => ({
     id: 500 + sequence,
     email: `invitada${sequence}@x.com`,
     role: 'student',
     delivery: 'link',
     expiresAt: '2026-10-12T12:00:00.000Z',
     expired: false,
     sentAt: null,
     sendFailedAt: null,
     invitedBy: { id: 1, name: 'Olga Ruiz' },
     createdAt: '2026-10-05T12:00:00.000Z',
   }));

   export function pageBody<T>(data: T[], page = 1, lastPage = 1, total = data.length): PageBody<T> {
     return { data, meta: { page, perPage: 25, total, lastPage } };
   }
   ```

3. **Los stubs.** Cada uno exporta sus constantes con el valor de la tarea 1.2 y sus funciones como `const` tipados que lanzan `not implemented` («Reglas», TDD), por ejemplo `export const splitEmails: (text: string) => string[] = () => { throw new Error('not implemented'); };`. Los tipos (`UserAction`, `UserActionTexts` y `FailureReaction`) van completos, como en la tarea 1.2:
   - `parse-admin.ts`: `parseAdminUser`, `parseAdminInvitation`, `parsePage`, `parseIssuedLink`, `parseInviteEntries` y `parseDeletion`;
   - `emails.ts`: `MAX_EMAILS`, `NO_EMAILS`, `TOO_MANY_EMAILS`, `splitEmails`, `checkEmailCount`, `isEmailsField` y `emailMessages`;
   - `user-actions.ts`: `UserAction`, `UserActionTexts`, `ACTION_SLOTS`, `DELETE_ACKNOWLEDGEMENT`, `actionsFor`, `changeFor` y `userActionTexts`;
   - `link-texts.ts`: `RESULT_TITLE`, `LINKS_WARNING`, `entryText`, `linksOf` y `copyAllText`;
   - `react-to-failure.ts`: `FORBIDDEN_HINT`, `ACCOUNT_GONE`, `INVITATION_GONE`, `UNCHANGED`, `FailureReaction`, `needsPassword`, `staleList` y `reactionTo`.
4. **`parse-admin.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { adminInvitationBodyFactory, adminUserBodyFactory, pageBody } from './admin.factory';
   import {
     parseAdminInvitation,
     parseAdminUser,
     parseDeletion,
     parseInviteEntries,
     parsePage,
   } from './parse-admin';

   describe('parseAdminUser', () => {
     it('keeps what the table shows and drops the rest of the published account', () => {
       const body = adminUserBodyFactory.build({
         id: 12,
         name: 'Ana Pérez',
         email: 'ana@x.com',
         emailVerified: false,
       });
       expect(parseAdminUser(body)).toEqual({
         id: 12,
         name: 'Ana Pérez',
         email: 'ana@x.com',
         role: 'student',
         status: 'active',
         emailVerified: false,
         createdAt: '2026-10-05T12:00:00.000Z',
       });
     });

     it('rejects a status or a role outside the contract', () => {
       expect(parseAdminUser({ ...adminUserBodyFactory.build(), status: 'banned' })).toBeNull();
       expect(parseAdminUser({ ...adminUserBodyFactory.build(), role: 'teacher' })).toBeNull();
     });
   });

   describe('parseAdminInvitation', () => {
     it('keeps the name of whoever invited, or null for the console', () => {
       const fromConsole = adminInvitationBodyFactory.build({ id: 7, invitedBy: null, expired: true });
       expect(parseAdminInvitation(fromConsole)).toMatchObject({
         id: 7,
         invitedBy: null,
         expired: true,
       });
       const fromOlga = adminInvitationBodyFactory.build({ invitedBy: { id: 1, name: 'Olga Ruiz' } });
       expect(parseAdminInvitation(fromOlga)?.invitedBy).toBe('Olga Ruiz');
     });

     it('rejects an inviter without a name', () => {
       const body = { ...adminInvitationBodyFactory.build(), invitedBy: { id: 1 } };
       expect(parseAdminInvitation(body)).toBeNull();
     });
   });

   describe('parsePage', () => {
     it('reads the items and the meta of the page', () => {
       const body = pageBody(adminUserBodyFactory.buildList(2), 2, 3, 52);
       expect(parsePage(body, parseAdminUser)?.meta).toEqual({ page: 2, lastPage: 3, total: 52 });
       expect(parsePage(body, parseAdminUser)?.items).toHaveLength(2);
     });

     it('rejects the whole page when one item is not an account', () => {
       const body = pageBody([adminUserBodyFactory.build(), { id: 'x' }]);
       expect(parsePage(body, parseAdminUser)).toBeNull();
     });
   });

   describe('parseInviteEntries', () => {
     it('keeps one entry per email, with the link only where the server sent it', () => {
       const body = {
         data: [
           { email: 'ana@x.com', result: 'user_exists' },
           {
             email: 'beto@x.com',
             result: 'created',
             expiresAt: '2026-10-12T12:00:00.000Z',
             url: 'http://localhost:8080/#invitacion=abc',
           },
         ],
       };
       expect(parseInviteEntries(body)).toEqual([
         { email: 'ana@x.com', result: 'user_exists', link: null },
         {
           email: 'beto@x.com',
           result: 'created',
           link: {
             email: 'beto@x.com',
             url: 'http://localhost:8080/#invitacion=abc',
             expiresAt: '2026-10-12T12:00:00.000Z',
           },
         },
       ]);
     });

     it('rejects a result that the contract does not have', () => {
       expect(parseInviteEntries({ data: [{ email: 'ana@x.com', result: 'sent' }] })).toBeNull();
     });
   });

   describe('parseDeletion', () => {
     it('reads the status and the message of the 202', () => {
       const message =
         'Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';
       expect(parseDeletion({ data: { id: 12, status: 'deleting' }, message })).toEqual({
         status: 'deleting',
         message,
       });
     });
   });
   ```

5. **`emails.spec.ts`.** Los textos son los de `lang/es/invitations.php`, y el caso del email repetido es el de `InvitationsEndpointTest.php`:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { checkEmailCount, emailMessages, isEmailsField, splitEmails } from './emails';

   describe('splitEmails', () => {
     it('splits on new lines, commas and spaces, in the written order', () => {
       expect(splitEmails('ana@x.com\nbeto@x.com, carla@x.com  dani@x.com\n\n')).toEqual([
         'ana@x.com',
         'beto@x.com',
         'carla@x.com',
         'dani@x.com',
       ]);
     });

     it('keeps what looks repeated, because the server canonicalizes', () => {
       expect(splitEmails('Ana@X.com\nana@x.com')).toEqual(['Ana@X.com', 'ana@x.com']);
     });
   });

   describe('checkEmailCount', () => {
     it('asks for one email at least and accepts up to a hundred', () => {
       expect(checkEmailCount(' \n ')).toBe('Indicá al menos un email para invitar.');
       const hundred = Array.from({ length: 100 }, (_, index) => `u${index}@x.com`).join('\n');
       expect(checkEmailCount(hundred)).toBe(true);
       expect(checkEmailCount(`${hundred}\nuno-mas@x.com`)).toBe(
         'Se pueden invitar hasta 100 emails por pedido.',
       );
     });
   });

   describe('emailMessages', () => {
     it('puts before each message the email sent in its position, counted from zero', () => {
       const errors = {
         emails: ['Se pueden invitar hasta 100 emails por pedido.'],
         'emails.1': ['Este email está repetido en el pedido.'],
         role: ['El rol tiene que ser admin o student.'],
       };
       expect(emailMessages(errors, ['Ana@X.com', 'ana@x.com'])).toEqual([
         'Se pueden invitar hasta 100 emails por pedido.',
         'ana@x.com: Este email está repetido en el pedido.',
       ]);
     });

     it('knows which fields belong to the emails', () => {
       expect(
         ['emails', 'emails.0', 'emails.12', 'role', 'delivery', 'emailsx'].filter(isEmailsField),
       ).toEqual(['emails', 'emails.0', 'emails.12']);
     });
   });
   ```

6. **`user-actions.spec.ts`.** La tabla «Qué acciones ofrece cada fila» y los textos de la spec:

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { AdminUser } from './types';
   import { actionsFor, changeFor, userActionTexts } from './user-actions';

   const ANA: AdminUser = {
     id: 12,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     status: 'active',
     emailVerified: true,
     createdAt: '2026-10-05T12:00:00.000Z',
   };
   const OWN_ID = 1;

   describe('actionsFor', () => {
     it('offers nothing on the own account or on one being deleted', () => {
       expect(actionsFor({ ...ANA, id: OWN_ID, role: 'admin' }, OWN_ID)).toEqual([]);
       expect(actionsFor({ ...ANA, status: 'deleting' }, OWN_ID)).toEqual([]);
     });

     it('offers the status, the role and the deletion, in that order', () => {
       expect(actionsFor(ANA, OWN_ID)).toEqual(['disable', 'promote', 'delete']);
       expect(actionsFor({ ...ANA, role: 'admin', status: 'disabled' }, OWN_ID)).toEqual([
         'enable',
         'demote',
         'delete',
       ]);
     });
   });

   describe('changeFor', () => {
     it('sends one field of the contract per action', () => {
       expect(changeFor('disable')).toEqual({ status: 'disabled' });
       expect(changeFor('enable')).toEqual({ status: 'active' });
       expect(changeFor('promote')).toEqual({ role: 'admin' });
       expect(changeFor('demote')).toEqual({ role: 'student' });
     });
   });

   describe('userActionTexts', () => {
     it('names the person in the button, the title and the result', () => {
       expect(userActionTexts('disable', ANA)).toMatchObject({
         button: 'Deshabilitar a Ana Pérez',
         title: '¿Deshabilitar la cuenta de Ana Pérez?',
         confirm: 'Deshabilitar',
         pending: 'Deshabilitando…',
         done: 'La cuenta de Ana Pérez quedó deshabilitada.',
       });
       expect(userActionTexts('delete', ANA).button).toBe('Borrar la cuenta de Ana Pérez');
     });

     it('warns that disabling an admin drops the invitations they created', () => {
       expect(userActionTexts('disable', ANA).body).toHaveLength(1);
       expect(userActionTexts('disable', { ...ANA, role: 'admin' }).body[1]).toBe(
         'Las invitaciones pendientes que creó se borran.',
       );
     });
   });
   ```

7. **`react-to-failure.spec.ts`.** Los mensajes salen de `lang/es/api.php`:

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import {
     ACCOUNT_GONE,
     FORBIDDEN_HINT,
     needsPassword,
     reactionTo,
     staleList,
   } from './react-to-failure';

   function response(status: number, code: string, message: string): ApiFailure {
     return { kind: 'response', status, code, message, fieldErrors: {}, retryAfterSeconds: null };
   }

   const FORBIDDEN = response(403, 'forbidden', 'No tenés permiso para hacer esto.');
   const LAST_ADMIN = response(409, 'last_admin', 'Tiene que quedar al menos un admin activo.');

   describe('reactionTo', () => {
     it('asks to sign in again on a 401 and on a renewed session without an account', () => {
       expect(
         reactionTo(response(401, 'unauthenticated', 'Iniciá sesión para continuar.'), ''),
       ).toEqual({
         kind: 'sign-in',
       });
       expect(reactionTo({ kind: 'signed-out' }, '')).toEqual({ kind: 'sign-in' });
     });

     it('goes back to the access when the own account was disabled', () => {
       const disabled = response(
         403,
         'account_disabled',
         'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
       );
       expect(reactionTo(disabled, '')).toEqual({ kind: 'reload' });
     });

     it('explains a lost role and offers to reload', () => {
       expect(reactionTo(FORBIDDEN, '')).toMatchObject({
         kind: 'show',
         description: {
           generalMessages: ['No tenés permiso para hacer esto.', FORBIDDEN_HINT],
           offerReload: true,
         },
       });
     });

     it('says that the target is gone on a 404', () => {
       const gone = response(404, 'not_found', 'No existe lo que pedís.');
       expect(reactionTo(gone, ACCOUNT_GONE)).toMatchObject({
         description: { generalMessages: ['Esa cuenta ya no existe.'] },
       });
     });

     it('shows the message of the server for the last admin', () => {
       expect(reactionTo(LAST_ADMIN, '')).toMatchObject({
         description: { generalMessages: ['Tiene que quedar al menos un admin activo.'] },
       });
     });
   });

   describe('needsPassword and staleList', () => {
     it('recognizes the 423 of the reconfirmed password', () => {
       const locked = response(
         423,
         'password_confirmation_required',
         'Confirmá tu contraseña para continuar.',
       );
       expect(needsPassword(locked)).toBe(true);
       expect(needsPassword(FORBIDDEN)).toBe(false);
     });

     it('asks for the page again after a 404, a 422 or the last admin, and not after a 429', () => {
       expect(staleList(LAST_ADMIN)).toBe(true);
       expect(staleList(response(404, 'not_found', ''))).toBe(true);
       expect(staleList(response(422, 'validation_failed', ''))).toBe(true);
       expect(staleList(response(429, 'too_many_requests', ''))).toBe(false);
       expect(staleList({ kind: 'network' })).toBe(false);
     });
   });
   ```

8. **`link-texts.spec.ts`.** La fecha depende de la zona del proceso, así que la spec fija la forma; la fecha exacta la fija el E2E, con la zona de Buenos Aires:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { copyAllText, entryText, linksOf } from './link-texts';
   import type { InviteEntry } from './types';

   const CREATED: InviteEntry = {
     email: 'beto@x.com',
     result: 'created',
     link: {
       email: 'beto@x.com',
       url: 'http://localhost:8080/#invitacion=b',
       expiresAt: '2026-10-12T12:00:00.000Z',
     },
   };
   const RENEWED: InviteEntry = {
     email: 'carla@x.com',
     result: 'renewed',
     link: {
       email: 'carla@x.com',
       url: 'http://localhost:8080/#invitacion=c',
       expiresAt: '2026-10-12T12:00:00.000Z',
     },
   };

   describe('entryText', () => {
     it('says what happened with each email and, with a link, when it expires', () => {
       expect(entryText({ email: 'ana@x.com', result: 'user_exists', link: null })).toBe(
         'Ya tiene una cuenta.',
       );
       expect(entryText({ email: 'ana@x.com', result: 'invitation_pending', link: null })).toBe(
         'Ya tiene una invitación vigente. Si perdió el enlace, generá otro con «Reenviar».',
       );
       expect(entryText(CREATED)).toMatch(
         /^Invitación creada\. Vence el .+ de octubre de 2026 a las .+\.$/,
       );
       expect(entryText(RENEWED)).toMatch(/^Tenía una invitación vencida: la renovamos\. Vence el /);
     });
   });

   describe('copyAllText', () => {
     it('writes one line per invitation, with the email and the link', () => {
       const entries = [
         CREATED,
         { email: 'ana@x.com', result: 'user_exists', link: null } as const,
         RENEWED,
       ];
       expect(copyAllText(linksOf(entries))).toBe(
         'beto@x.com\thttp://localhost:8080/#invitacion=b\ncarla@x.com\thttp://localhost:8080/#invitacion=c',
       );
     });
   });
   ```

9. **Correr** `npm run test:unit -- frontend/src/pages/admin/model`: en rojo, por `not implemented`.
10. **Commit:** `test(front): specs del modelo de la administración, en rojo`.

### Tarea 1.2 · El modelo (T004, M)

**Archivos:** en `frontend/src/pages/admin/model/`, `parse-admin.ts`, `emails.ts`, `user-actions.ts`, `link-texts.ts`, `react-to-failure.ts`, `labels.ts` e `invitation-texts.ts`.

1. **`parse-admin.ts`.** Cada parser devuelve sólo lo que la página muestra y rechaza un valor fuera del contrato:

   ```ts
   import { isPlainObject } from '../../../shared/lib/is-plain-object';
   import type {
     AccountStatus,
     AdminInvitation,
     AdminUser,
     Deletion,
     InviteEntry,
     InviteResult,
     IssuedLink,
     ListPage,
   } from './types';

   const ROLES = ['admin', 'student'] as const;
   const STATUSES: readonly AccountStatus[] = ['active', 'disabled', 'deleting'];
   const RESULTS: readonly InviteResult[] = [
     'created',
     'renewed',
     'user_exists',
     'invitation_pending',
   ];

   function oneOf<T extends string>(options: readonly T[], value: unknown): value is T {
     return options.some((option) => option === value);
   }

   function inviterName(value: unknown): string | null | undefined {
     if (value === null) return null;
     return isPlainObject(value) && typeof value.name === 'string' ? value.name : undefined;
   }

   export function parseAdminUser(value: unknown): AdminUser | null {
     if (!isPlainObject(value)) return null;
     const { id, name, email, role, status, emailVerified, createdAt } = value;
     if (typeof id !== 'number' || typeof name !== 'string' || typeof email !== 'string') return null;
     if (!oneOf(ROLES, role) || !oneOf(STATUSES, status)) return null;
     if (typeof emailVerified !== 'boolean' || typeof createdAt !== 'string') return null;
     return { id, name, email, role, status, emailVerified, createdAt };
   }

   export function parseAdminInvitation(value: unknown): AdminInvitation | null {
     if (!isPlainObject(value)) return null;
     const { id, email, role, expiresAt, expired, createdAt } = value;
     const invitedBy = inviterName(value.invitedBy);
     if (typeof id !== 'number' || typeof email !== 'string' || !oneOf(ROLES, role)) return null;
     if (
       typeof expiresAt !== 'string' ||
       typeof expired !== 'boolean' ||
       typeof createdAt !== 'string'
     )
       return null;
     if (invitedBy === undefined) return null;
     return { id, email, role, expiresAt, expired, invitedBy, createdAt };
   }

   export function parsePage<T>(
     body: unknown,
     parseItem: (value: unknown) => T | null,
   ): ListPage<T> | null {
     if (!isPlainObject(body) || !Array.isArray(body.data) || !isPlainObject(body.meta)) return null;
     const { page, lastPage, total } = body.meta;
     if (typeof page !== 'number' || typeof lastPage !== 'number' || typeof total !== 'number')
       return null;
     const items: T[] = [];
     for (const entry of body.data) {
       const item = parseItem(entry);
       if (item === null) return null;
       items.push(item);
     }
     return { items, meta: { page, lastPage, total } };
   }

   export function parseIssuedLink(value: unknown): IssuedLink | null {
     if (!isPlainObject(value)) return null;
     const { email, url, expiresAt } = value;
     if (typeof email !== 'string' || typeof url !== 'string' || typeof expiresAt !== 'string')
       return null;
     return { email, url, expiresAt };
   }

   function parseInviteEntry(value: unknown): InviteEntry | null {
     if (!isPlainObject(value) || typeof value.email !== 'string' || !oneOf(RESULTS, value.result))
       return null;
     return { email: value.email, result: value.result, link: parseIssuedLink(value) };
   }

   export function parseInviteEntries(body: unknown): readonly InviteEntry[] | null {
     if (!isPlainObject(body) || !Array.isArray(body.data)) return null;
     const entries = body.data.map(parseInviteEntry);
     return entries.every((entry) => entry !== null) ? entries : null;
   }

   export function parseDeletion(body: unknown): Deletion | null {
     if (!isPlainObject(body) || !isPlainObject(body.data) || typeof body.message !== 'string')
       return null;
     const { status } = body.data;
     return oneOf(STATUSES, status) ? { status, message: body.message } : null;
   }
   ```

2. **`emails.ts`:**

   ```ts
   import type { FieldErrors } from '../../../shared/api/http';

   export const MAX_EMAILS = 100;
   export const NO_EMAILS = 'Indicá al menos un email para invitar.';
   export const TOO_MANY_EMAILS = 'Se pueden invitar hasta 100 emails por pedido.';

   const POSITIONED = /^emails\.(\d+)$/;

   export function splitEmails(text: string): string[] {
     return text.split(/[\s,]+/).filter((email) => email !== '');
   }

   export function checkEmailCount(text: string): true | string {
     const count = splitEmails(text).length;
     if (count === 0) return NO_EMAILS;
     return count > MAX_EMAILS ? TOO_MANY_EMAILS : true;
   }

   export function isEmailsField(field: string): boolean {
     return field === 'emails' || POSITIONED.test(field);
   }

   export function emailMessages(fieldErrors: FieldErrors, sent: readonly string[]): string[] {
     const messages: string[] = [];
     for (const [field, fieldMessages] of Object.entries(fieldErrors)) {
       const position = POSITIONED.exec(field)?.[1];
       if (field === 'emails') messages.push(...fieldMessages);
       if (position === undefined) continue;
       const email = sent[Number(position)] ?? '';
       messages.push(...fieldMessages.map((message) => `${email}: ${message}`));
     }
     return messages;
   }
   ```

3. **`user-actions.ts`.** `ACTION_SLOTS` son los lugares fijos de los botones de una fila (research.md, R4):

   ```ts
   import type { AdminUser, UserChange } from './types';

   export type UserAction = 'disable' | 'enable' | 'promote' | 'demote' | 'delete';

   export interface UserActionTexts {
     readonly button: string;
     readonly title: string;
     readonly body: readonly string[];
     readonly confirm: string;
     readonly pending: string;
     readonly done: string;
   }

   export const ACTION_SLOTS = ['status', 'role', 'delete'] as const;
   export const DELETE_ACKNOWLEDGEMENT = 'Entiendo que no se puede deshacer.';

   const DISABLE_BODY =
     'No va a poder entrar, y su sesión abierta deja de funcionar en el próximo pedido. Sus ejecuciones en curso se cancelan, y su enlace de recuperación, si tenía uno, deja de valer. La podés rehabilitar cuando quieras.';
   const DROPS_INVITATIONS = 'Las invitaciones pendientes que creó se borran.';
   const DELETE_BODY =
     'Se borra la cuenta con todo lo que guardó en el servidor: el progreso, los intentos, el código y las importaciones. No se puede deshacer, y las copias de seguridad lo conservan un tiempo (el aviso de privacidad dice cuánto). Si la persona quiere sus datos, que los descargue antes desde «Tu cuenta».';

   export function actionsFor(user: AdminUser, ownId: number): readonly UserAction[] {
     if (user.id === ownId || user.status === 'deleting') return [];
     const statusAction = user.status === 'active' ? 'disable' : 'enable';
     const roleAction = user.role === 'admin' ? 'demote' : 'promote';
     return [statusAction, roleAction, 'delete'];
   }

   export function changeFor(action: Exclude<UserAction, 'delete'>): UserChange {
     switch (action) {
       case 'disable':
         return { status: 'disabled' };
       case 'enable':
         return { status: 'active' };
       case 'promote':
         return { role: 'admin' };
       case 'demote':
         return { role: 'student' };
     }
   }

   export function userActionTexts(action: UserAction, { name, role }: AdminUser): UserActionTexts {
     switch (action) {
       case 'disable':
         return {
           button: `Deshabilitar a ${name}`,
           title: `¿Deshabilitar la cuenta de ${name}?`,
           body: role === 'admin' ? [DISABLE_BODY, DROPS_INVITATIONS] : [DISABLE_BODY],
           confirm: 'Deshabilitar',
           pending: 'Deshabilitando…',
           done: `La cuenta de ${name} quedó deshabilitada.`,
         };
       case 'enable':
         return {
           button: `Rehabilitar a ${name}`,
           title: `¿Rehabilitar la cuenta de ${name}?`,
           body: ['Vuelve a poder entrar con su contraseña.'],
           confirm: 'Rehabilitar',
           pending: 'Rehabilitando…',
           done: `La cuenta de ${name} está activa otra vez.`,
         };
       case 'promote':
         return {
           button: `Hacer admin a ${name}`,
           title: `¿Darle el rol de admin a ${name}?`,
           body: ['Va a poder administrar las cuentas y las invitaciones del taller, como vos.'],
           confirm: 'Hacer admin',
           pending: 'Guardando…',
           done: `${name} ahora es admin.`,
         };
       case 'demote':
         return {
           button: `Quitar admin a ${name}`,
           title: `¿Quitarle el rol de admin a ${name}?`,
           body: [`Deja de poder administrar el taller. ${DROPS_INVITATIONS}`],
           confirm: 'Quitar admin',
           pending: 'Guardando…',
           done: `${name} ya no es admin.`,
         };
       case 'delete':
         return {
           button: `Borrar la cuenta de ${name}`,
           title: `¿Borrar la cuenta de ${name}?`,
           body: [DELETE_BODY],
           confirm: 'Borrar la cuenta',
           pending: 'Borrando…',
           done: '',
         };
     }
   }
   ```

4. **`link-texts.ts`:**

   ```ts
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import type { EntryResult, InviteEntry, IssuedLink } from './types';

   export const RESULT_TITLE = 'Resultado';
   export const LINKS_WARNING =
     'Copiá los enlaces ahora: no se vuelven a mostrar. Si perdés uno, generá otro con «Reenviar»; el anterior deja de valer.';

   const RESULT_TEXTS: Readonly<Record<EntryResult, string>> = {
     created: 'Invitación creada.',
     renewed: 'Tenía una invitación vencida: la renovamos.',
     resent: 'Enlace nuevo.',
     user_exists: 'Ya tiene una cuenta.',
     invitation_pending:
       'Ya tiene una invitación vigente. Si perdió el enlace, generá otro con «Reenviar».',
   };

   export function entryText({ result, link }: InviteEntry): string {
     const text = RESULT_TEXTS[result];
     return link === null ? text : `${text} Vence el ${formatLocalDateTime(link.expiresAt)}.`;
   }

   export function linksOf(entries: readonly InviteEntry[]): IssuedLink[] {
     return entries.flatMap(({ link }) => (link === null ? [] : [link]));
   }

   export function copyAllText(links: readonly IssuedLink[]): string {
     return links.map(({ email, url }) => `${email}\t${url}`).join('\n');
   }
   ```

5. **`react-to-failure.ts`** (research.md, R6):

   ```ts
   import type { ApiFailure } from '../../../shared/api/http';
   import { describeFailure, type FailureDescription } from '../../../shared/ui/form';

   export const FORBIDDEN_HINT = 'Puede que tu cuenta ya no tenga el rol de admin. Recargá la página.';
   export const ACCOUNT_GONE = 'Esa cuenta ya no existe.';
   export const INVITATION_GONE =
     'Esa invitación ya no existe: puede que la hayan aceptado o revocado.';
   export const UNCHANGED = 'No se hizo ningún cambio.';

   export type FailureReaction =
     | { readonly kind: 'sign-in' }
     | { readonly kind: 'reload' }
     | { readonly kind: 'show'; readonly description: FailureDescription };

   const NOT_FOUND = 404;
   const UNPROCESSABLE = 422;
   const PASSWORD_REQUIRED = 423;

   export function needsPassword(failure: ApiFailure): boolean {
     return failure.kind === 'response' && failure.status === PASSWORD_REQUIRED;
   }

   export function staleList(failure: ApiFailure): boolean {
     if (failure.kind !== 'response') return false;
     return (
       failure.status === NOT_FOUND ||
       failure.status === UNPROCESSABLE ||
       failure.code === 'last_admin'
     );
   }

   export function reactionTo(
     failure: ApiFailure,
     notFoundMessage: string,
     visibleFields: readonly string[] = [],
   ): FailureReaction {
     const description = describeFailure(failure, visibleFields);
     if (description.signedOut) return { kind: 'sign-in' };
     if (failure.kind !== 'response') return { kind: 'show', description };
     if (failure.code === 'account_disabled') return { kind: 'reload' };
     if (failure.status === NOT_FOUND) {
       return { kind: 'show', description: { ...description, generalMessages: [notFoundMessage] } };
     }
     if (failure.code === 'forbidden') {
       const generalMessages = [failure.message, FORBIDDEN_HINT];
       return { kind: 'show', description: { ...description, generalMessages, offerReload: true } };
     }
     return { kind: 'show', description };
   }
   ```

6. **`labels.ts`,** las etiquetas y las opciones de los filtros:

   ```ts
   import type { AccountRole } from '../../../entities/session';
   import type { AccountStatus, InvitationState } from './types';

   export const ROLE_LABELS: Readonly<Record<AccountRole, string>> = {
     admin: 'Admin',
     student: 'Alumno',
   };

   export const STATUS_LABELS: Readonly<Record<AccountStatus, string>> = {
     active: 'Activa',
     disabled: 'Deshabilitada',
     deleting: 'Borrándose',
   };

   export const ROLE_FILTER = [
     { value: '', label: 'Todos' },
     { value: 'admin', label: 'Admin' },
     { value: 'student', label: 'Alumno' },
   ] as const satisfies readonly { readonly value: AccountRole | ''; readonly label: string }[];

   export const STATUS_FILTER = [
     { value: '', label: 'Todos' },
     { value: 'active', label: 'Activa' },
     { value: 'disabled', label: 'Deshabilitada' },
     { value: 'deleting', label: 'Borrándose' },
   ] as const satisfies readonly { readonly value: AccountStatus | ''; readonly label: string }[];

   export const STATE_FILTER = [
     { value: '', label: 'Todas' },
     { value: 'pending', label: 'Vigentes' },
     { value: 'expired', label: 'Vencidas' },
   ] as const satisfies readonly { readonly value: InvitationState | ''; readonly label: string }[];
   ```

7. **`invitation-texts.ts`,** los textos de la spec para reenviar y revocar:

   ```ts
   export interface InvitationActionTexts {
     readonly title: string;
     readonly body: string;
     readonly confirm: string;
     readonly pending: string;
   }

   export function invitationTexts(action: 'resend' | 'revoke', email: string): InvitationActionTexts {
     if (action === 'resend') {
       return {
         title: `¿Generar un enlace nuevo para ${email}?`,
         body: 'El enlace anterior deja de valer. El nuevo vence en 7 días, o en 48 horas si la invitación es de admin.',
         confirm: 'Generar el enlace',
         pending: 'Generando…',
       };
     }
     return {
       title: `¿Revocar la invitación de ${email}?`,
       body: 'El enlace deja de valer, y nadie puede crear la cuenta con él.',
       confirm: 'Revocar',
       pending: 'Revocando…',
     };
   }
   ```

8. **Correr** `npm run test:unit -- frontend/src/pages/admin/model`, en verde, y después `npm run typecheck` y `npm run lint`.
9. **Commit:** `feat(front): el modelo de la administración`.

### Tarea 1.3 · Las specs de los endpoints, en rojo (T005, M)

**Archivos:** el stub de `frontend/src/pages/admin/api/admin-endpoints.ts` (las ocho funciones, con sus firmas de la tarea 1.4, como `const` tipados que lanzan `not implemented`; «Reglas», TDD) y `admin-endpoints.spec.ts`.

1. **`admin-endpoints.spec.ts`.** Los métodos, las rutas, los cuerpos y los encabezados son los del contrato HTTP de C3b:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { adminInvitationBodyFactory, adminUserBodyFactory, pageBody } from '../model/admin.factory';
   import {
     changeUser,
     confirmPassword,
     deleteUser,
     invite,
     listInvitations,
     listUsers,
     resendInvitation,
     revokeInvitation,
   } from './admin-endpoints';

   const OLGA_ID = 1;
   const NEVER = new AbortController().signal;

   function clientWith(replies: readonly (FakeReply | 'network-error')[]) {
     const fake = createFakeFetch(replies);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     return { client, calls: fake.calls };
   }

   describe('the lists', () => {
     it('asks for the accounts with the page, 25 per page and only the filters in use', async () => {
       const { client, calls } = clientWith([{ status: 200, json: pageBody([]) }]);
       await listUsers(client, { page: 1, q: '  ana ', role: '', status: 'disabled' }, NEVER);
       const url = new URL(calls[0]?.path ?? '', 'http://taller');
       expect(url.pathname).toBe('/api/admin/users');
       expect(Object.fromEntries(url.searchParams)).toEqual({
         page: '1',
         perPage: '25',
         q: 'ana',
         status: 'disabled',
       });
       expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
     });

     it('asks for the invitations with their own filters', async () => {
       const body = pageBody(adminInvitationBodyFactory.buildList(1));
       const { client, calls } = clientWith([{ status: 200, json: body }]);
       const outcome = await listInvitations(
         client,
         { page: 2, role: 'admin', state: 'pending' },
         NEVER,
       );
       const url = new URL(calls[0]?.path ?? '', 'http://taller');
       expect(Object.fromEntries(url.searchParams)).toEqual({
         page: '2',
         perPage: '25',
         role: 'admin',
         state: 'pending',
       });
       expect(outcome.ok && outcome.value.items).toHaveLength(1);
     });

     it('turns a page without the shape of the contract into an unexpected answer', async () => {
       const { client } = clientWith([{ status: 200, json: { data: 'x' } }]);
       expect(await listUsers(client, { page: 1, q: '', role: '', status: '' }, NEVER)).toEqual({
         ok: false,
         failure: { kind: 'unexpected', status: 200 },
       });
     });
   });

   describe('the actions on an account', () => {
     it('changes one field with PATCH and X-Taller-User, and returns the account of the server', async () => {
       const changed = adminUserBodyFactory.build({ id: 12, status: 'disabled' });
       const { client, calls } = clientWith([{ status: 200, json: { data: changed } }]);
       const outcome = await changeUser(client, OLGA_ID, 12, { status: 'disabled' });
       expect(calls[0]).toMatchObject({
         method: 'PATCH',
         path: '/api/admin/users/12',
         body: { status: 'disabled' },
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('1');
       expect(outcome.ok && outcome.value.status).toBe('disabled');
     });

     it('deletes with DELETE and reads the 202', async () => {
       const message =
         'Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';
       const { client, calls } = clientWith([
         { status: 202, json: { data: { id: 12, status: 'deleting' }, message } },
       ]);
       expect(await deleteUser(client, OLGA_ID, 12)).toEqual({
         ok: true,
         value: { status: 'deleting', message },
       });
       expect(calls[0]).toMatchObject({
         method: 'DELETE',
         path: '/api/admin/users/12',
         body: undefined,
       });
     });

     it('passes the 409 of the last admin to whoever asked', async () => {
       const lastAdmin = { message: 'Tiene que quedar al menos un admin activo.', code: 'last_admin' };
       const { client } = clientWith([{ status: 409, json: lastAdmin }]);
       expect(await changeUser(client, OLGA_ID, 2, { role: 'student' })).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 409, code: 'last_admin' },
       });
     });
   });

   describe('the invitations', () => {
     it('invites the emails in the written order, by link', async () => {
       const { client, calls } = clientWith([{ status: 200, json: { data: [] } }]);
       await invite(client, OLGA_ID, ['b@x.com', 'a@x.com'], 'admin');
       expect(calls[0]).toMatchObject({
         method: 'POST',
         path: '/api/admin/invitations',
         body: { emails: ['b@x.com', 'a@x.com'], role: 'admin', delivery: 'link' },
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('1');
     });

     it('resends by link and returns the new link', async () => {
       const data = {
         id: 5,
         email: 'beto@x.com',
         role: 'student',
         delivery: 'link',
         expiresAt: '2026-10-12T12:00:00.000Z',
         url: 'http://localhost:8080/#invitacion=nuevo',
       };
       const { client, calls } = clientWith([{ status: 200, json: { data } }]);
       expect(await resendInvitation(client, OLGA_ID, 5)).toEqual({
         ok: true,
         value: {
           email: 'beto@x.com',
           url: 'http://localhost:8080/#invitacion=nuevo',
           expiresAt: '2026-10-12T12:00:00.000Z',
         },
       });
       expect(calls[0]).toMatchObject({
         path: '/api/admin/invitations/5/resend',
         body: { delivery: 'link' },
       });
     });

     it('revokes with DELETE and accepts the 204', async () => {
       const { client, calls } = clientWith([{ status: 204 }]);
       expect(await revokeInvitation(client, OLGA_ID, 5)).toEqual({ ok: true, value: true });
       expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/api/admin/invitations/5' });
     });
   });

   describe('confirmPassword', () => {
     it('sends the password with X-Taller-User and accepts the 201', async () => {
       const { client, calls } = clientWith([{ status: 201, json: {} }]);
       expect(await confirmPassword(client, OLGA_ID, 'una frase larga')).toEqual({
         ok: true,
         value: true,
       });
       expect(calls[0]).toMatchObject({
         method: 'POST',
         path: '/api/auth/confirm-password',
         body: { password: 'una frase larga' },
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('1');
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/api`: en rojo.
3. **Commit:** `test(front): specs de los pedidos de la administración, en rojo`.

### Tarea 1.4 · Los endpoints (T006, M)

**Archivos:** `frontend/src/pages/admin/api/admin-endpoints.ts`.

1. **`admin-endpoints.ts`.** Todo lo que modifica lleva `asUser`, y las listas no lo llevan. `confirmPassword` vive acá hasta que F11b lo mude (contrato):

   ```ts
   import type { AccountRole } from '../../../entities/session';
   import type { ApiClient, ApiResult } from '../../../shared/api/http';
   import { isPlainObject } from '../../../shared/lib/is-plain-object';
   import {
     parseAdminInvitation,
     parseAdminUser,
     parseDeletion,
     parseInviteEntries,
     parseIssuedLink,
     parsePage,
   } from '../model/parse-admin';
   import type {
     AdminInvitation,
     AdminOutcome,
     AdminUser,
     Deletion,
     InvitationQuery,
     InviteEntry,
     IssuedLink,
     ListPage,
     UserChange,
     UserQuery,
   } from '../model/types';

   const PER_PAGE = 25;

   function decode<T>(result: ApiResult, parse: (body: unknown) => T | null): AdminOutcome<T> {
     if (!result.ok) return result;
     const value = parse(result.body);
     if (value === null) return { ok: false, failure: { kind: 'unexpected', status: result.status } };
     return { ok: true, value };
   }

   function dataOf<T>(parse: (value: unknown) => T | null): (body: unknown) => T | null {
     return (body) => (isPlainObject(body) ? parse(body.data) : null);
   }

   function accepted(): true {
     return true;
   }

   function queryString(params: Readonly<Record<string, string | number>>): string {
     const query = new URLSearchParams();
     for (const [key, value] of Object.entries(params)) {
       if (value !== '') query.set(key, String(value));
     }
     return query.toString();
   }

   export async function listUsers(
     client: ApiClient,
     query: UserQuery,
     signal: AbortSignal,
   ): Promise<AdminOutcome<ListPage<AdminUser>>> {
     const params = queryString({
       page: query.page,
       perPage: PER_PAGE,
       q: query.q.trim(),
       role: query.role,
       status: query.status,
     });
     const result = await client.get(`/api/admin/users?${params}`, { signal });
     return decode(result, (body) => parsePage(body, parseAdminUser));
   }

   export async function changeUser(
     client: ApiClient,
     adminId: number,
     userId: number,
     change: UserChange,
   ): Promise<AdminOutcome<AdminUser>> {
     const result = await client.send('PATCH', `/api/admin/users/${userId}`, change, {
       asUser: adminId,
     });
     return decode(result, dataOf(parseAdminUser));
   }

   export async function deleteUser(
     client: ApiClient,
     adminId: number,
     userId: number,
   ): Promise<AdminOutcome<Deletion>> {
     const result = await client.send('DELETE', `/api/admin/users/${userId}`, undefined, {
       asUser: adminId,
     });
     return decode(result, parseDeletion);
   }

   export async function listInvitations(
     client: ApiClient,
     query: InvitationQuery,
     signal: AbortSignal,
   ): Promise<AdminOutcome<ListPage<AdminInvitation>>> {
     const params = queryString({
       page: query.page,
       perPage: PER_PAGE,
       role: query.role,
       state: query.state,
     });
     const result = await client.get(`/api/admin/invitations?${params}`, { signal });
     return decode(result, (body) => parsePage(body, parseAdminInvitation));
   }

   export async function invite(
     client: ApiClient,
     adminId: number,
     emails: readonly string[],
     role: AccountRole,
   ): Promise<AdminOutcome<readonly InviteEntry[]>> {
     const body = { emails, role, delivery: 'link' };
     const result = await client.send('POST', '/api/admin/invitations', body, { asUser: adminId });
     return decode(result, parseInviteEntries);
   }

   export async function resendInvitation(
     client: ApiClient,
     adminId: number,
     invitationId: number,
   ): Promise<AdminOutcome<IssuedLink>> {
     const path = `/api/admin/invitations/${invitationId}/resend`;
     const result = await client.send('POST', path, { delivery: 'link' }, { asUser: adminId });
     return decode(result, dataOf(parseIssuedLink));
   }

   export async function revokeInvitation(
     client: ApiClient,
     adminId: number,
     invitationId: number,
   ): Promise<AdminOutcome<true>> {
     const path = `/api/admin/invitations/${invitationId}`;
     const result = await client.send('DELETE', path, undefined, { asUser: adminId });
     return decode(result, accepted);
   }

   export async function confirmPassword(
     client: ApiClient,
     adminId: number,
     password: string,
   ): Promise<AdminOutcome<true>> {
     const result = await client.send(
       'POST',
       '/api/auth/confirm-password',
       { password },
       { asUser: adminId },
     );
     return decode(result, accepted);
   }
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde, y después `npm run typecheck` y `npm run lint`.
3. **Commit:** `feat(front): los pedidos de la administración a /api/admin`.

### Tarea 1.5 · Las specs de la condición de admin y de la entrada, en rojo (T007, A)

**Archivos:**

- `frontend/src/entities/session/model/is-admin.ts` (stub) e `is-admin.spec.ts`;
- `frontend/src/pages/account/ui/admin-entry.spec.tsx`;
- en `frontend/src/pages/account/ui/AccountMenu.tsx`, sólo la interfaz nueva.

**Consume:** `AccountMenu`, `AccountDialog` y `sessionStore` de F11a. **Produce:** el contrato «`pages/account`: la entrada y el lugar del contenedor».

1. **El stub** `is-admin.ts`, como `const` tipado:

   ```ts
   import type { PublishedUser } from './types';

   export const isAdmin: (user: PublishedUser | null) => boolean = () => {
     throw new Error('not implemented');
   };
   ```

2. **En `AccountMenu.tsx`,** con la rama B2 sin el lugar de la administración (si la base ya lo tiene, este paso no toca `AccountMenu.tsx` y sólo comprueba el export del índice), se agregan sin usarse:
   - la interfaz `export interface AdministrationProps { onClose(): void; }`;
   - la prop `readonly administration?: ComponentType<AdministrationProps>;` en `AccountMenuProps`.

   En `pages/account/index.ts` se agrega `export type { AdministrationProps } from './ui/AccountMenu';`.
3. **`is-admin.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { isAdmin } from './is-admin';
   import type { PublishedUser } from './types';

   const OLGA: PublishedUser = {
     id: 1,
     name: 'Olga Ruiz',
     email: 'olga@x.com',
     role: 'admin',
     privacyAccepted: true,
   };

   describe('isAdmin', () => {
     it('is true only for the admin role', () => {
       expect(isAdmin(OLGA)).toBe(true);
       expect(isAdmin({ ...OLGA, role: 'student' })).toBe(false);
     });

     it('is false without an account', () => {
       expect(isAdmin(null)).toBe(false);
     });
   });
   ```

4. **`admin-entry.spec.tsx`.** Usa una administración de prueba, porque `pages/account` no conoce la verdadera:

   ```tsx
   import { render, screen, within } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import { ApiClientContext, createApiClient } from '../../../shared/api/http';
   import { createFakeFetch } from '../../../shared/api/http/fake-fetch';
   import AccountMenu, { type AdministrationProps } from './AccountMenu';

   const OLGA: PublishedUser = {
     id: 1,
     name: 'Olga Ruiz',
     email: 'olga@x.com',
     role: 'admin',
     privacyAccepted: true,
   };
   const ANA: PublishedUser = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };

   const FakeAdministration = ({ onClose }: AdministrationProps) => (
     <button type="button" onClick={onClose}>
       Cerrar la administración de prueba
     </button>
   );

   let entryHost: HTMLElement;

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
     entryHost = document.createElement('div');
     document.body.append(entryHost);
   });

   afterEach(() => {
     entryHost.remove();
   });

   function renderMenu(account: PublishedUser, withAdministration = true) {
     sessionStore.setState({
       status: 'signed-in',
       user: account,
       features: { passwordReset: false, registration: false },
       contentVersion: null,
     });
     const client = createApiClient({ fetch: createFakeFetch([]).fetch, readCookies: () => '' });
     render(
       <ApiClientContext value={client}>
         <AccountMenu
           entryHost={entryHost}
           administration={withAdministration ? FakeAdministration : undefined}
           reloadDocument={vi.fn()}
         />
       </ApiClientContext>,
     );
     return {
       user: userEvent.setup(),
       entry: within(entryHost).getByRole('button', { name: 'Tu cuenta' }),
     };
   }

   describe('the entry to the administration', () => {
     it('does not exist for a student', async () => {
       const { user, entry } = renderMenu(ANA);
       await user.click(entry);
       expect(screen.getByRole('dialog', { name: 'Tu cuenta' })).toBeInTheDocument();
       expect(screen.queryByRole('button', { name: 'Administrar el taller' })).toBeNull();
     });

     it('does not exist when nobody mounts the administration', async () => {
       const { user, entry } = renderMenu(OLGA, false);
       await user.click(entry);
       expect(screen.queryByRole('button', { name: 'Administrar el taller' })).toBeNull();
     });

     it('closes «Tu cuenta», opens the administration and gives the focus back to the entry on close', async () => {
       const { user, entry } = renderMenu(OLGA);
       await user.click(entry);
       await user.click(screen.getByRole('button', { name: 'Administrar el taller' }));
       expect(screen.queryByRole('dialog', { name: 'Tu cuenta' })).toBeNull();
       await user.click(screen.getByRole('button', { name: 'Cerrar la administración de prueba' }));
       expect(screen.queryByRole('button', { name: 'Cerrar la administración de prueba' })).toBeNull();
       expect(entry).toHaveFocus();
     });
   });
   ```

5. **Correr** `npm run test:unit -- frontend/src/entities/session frontend/src/pages/account`: en rojo `isAdmin` y los dos escenarios que esperan la entrada; en verde «does not exist for a student» y las specs de F11a. Con la rama B2 con el lugar ya puesto, «does not exist for a student» también puede quedar en rojo si la base ofrece la entrada sin mirar el rol: es un rojo esperado, y T008 lo pone en verde.
6. **Commit:** `test(front): specs de isAdmin y de la entrada a la administración, en rojo`.

### Tarea 1.6 · La condición de admin y la entrada en «Tu cuenta» (T008, A)

**Archivos:** `frontend/src/entities/session/model/is-admin.ts`, `frontend/src/entities/session/index.ts`, `frontend/src/pages/account/ui/AccountMenu.tsx`, `frontend/src/pages/account/ui/AccountDialog.tsx` y `frontend/src/pages/account/index.ts`.

**La rama B2** (el lugar de la administración en «Tu cuenta», F11a-1). En `impl-f11a` (a7b3c71d) `pages/account` todavía no existe, y el lugar quedó pendiente para T022 y T023 de F11a. T001 anota qué encontró:

- **sin el lugar,** los pasos 2 a 4 van como están: `AccountMenu.tsx` entero sobre el de F11a, y los tres cambios de `AccountDialog.tsx`;
- **con el lugar** (la prop `administration` y `onAdminister?()` ya están), los pasos 2 a 4 no reescriben nada: sobre los archivos de la base se suman sólo la condición `isAdmin(account)` para pasar `onAdminister`, el panel `'administration'` que monta `Administration` con `onClose`, el botón «Administrar el taller» entre «Aviso de privacidad» y `<SignOutSection … />` si la base no lo dibuja, y el export de `AdministrationProps` si el índice no lo tiene. El resultado tiene que cumplir el mismo contrato (`contracts/admin-page.md`, «`pages/account`») y las mismas specs de T007.

Con A3 en la base (B4), `AccountMenu.tsx` y `AccountDialog.tsx` conservan lo que A3 les haya cambiado.

1. **`is-admin.ts`** (reemplaza el stub de T007):

   ```ts
   import type { PublishedUser } from './types';

   export function isAdmin(user: PublishedUser | null): boolean {
     return user?.role === 'admin';
   }
   ```

   En `entities/session/index.ts`, al final: `export { isAdmin } from './model/is-admin';`.
2. **`AccountMenu.tsx`,** entero (sin el lugar de B2):
   - el estado pasa de `open` a un panel (`'account' | 'administration' | null`);
   - el contenedor llega por la prop `administration`, porque `pages/account` no puede importar `pages/admin` (research.md, R2).

   ```tsx
   import { useRef, useState, type ComponentType } from 'react';
   import { createPortal } from 'react-dom';
   import { useStore } from 'zustand';
   import { isAdmin, selectReadyAccount, sessionStore } from '../../../entities/session';
   import AccountDialog from './AccountDialog';
   import AccountEntry from './AccountEntry';

   export interface AdministrationProps {
     onClose(): void;
   }

   type Panel = 'account' | 'administration' | null;

   interface AccountMenuProps {
     readonly entryHost: HTMLElement;
     readonly administration?: ComponentType<AdministrationProps>;
     reloadDocument(): void;
   }

   const AccountMenu = ({
     entryHost,
     administration: Administration,
     reloadDocument,
   }: AccountMenuProps) => {
     const account = useStore(sessionStore, selectReadyAccount);
     const [panel, setPanel] = useState<Panel>(null);
     const entry = useRef<HTMLButtonElement>(null);
     if (account === null) return null;
     const close = (): void => {
       setPanel(null);
       entry.current?.focus();
     };
     const administer =
       Administration !== undefined && isAdmin(account) ? () => setPanel('administration') : undefined;
     return (
       <>
         {createPortal(
           <AccountEntry ref={entry} expanded={panel !== null} onOpen={() => setPanel('account')} />,
           entryHost,
         )}
         {panel === 'account' ? (
           <AccountDialog
             account={account}
             onClose={close}
             onAdminister={administer}
             reloadDocument={reloadDocument}
           />
         ) : null}
         {panel === 'administration' && Administration !== undefined ? (
           <Administration onClose={close} />
         ) : null}
       </>
     );
   };

   export default AccountMenu;
   ```

3. **`AccountDialog.tsx`,** tres cambios sobre el de F11a (con el lugar de B2, sólo los que falten):
   - la interfaz suma `onAdminister?(): void;` después de `onClose(): void;`;
   - la desestructuración pasa a `({ account, onClose, onAdminister, reloadDocument }: AccountDialogProps)`;
   - entre el botón «Aviso de privacidad» y `<SignOutSection … />` se agrega:

   ```tsx
   {onAdminister === undefined ? null : (
     <button type="button" className="text-button" onClick={onAdminister}>
       Administrar el taller
     </button>
   )}
   ```

4. **`pages/account/index.ts`:**

   ```ts
   export { default as AccountMenu } from './ui/AccountMenu';
   export type { AdministrationProps } from './ui/AccountMenu';
   ```

5. **Correr** `npm run test:unit -- frontend/src/entities/session frontend/src/pages/account`, en verde: las specs de F11a (`account-menu.spec.tsx`) también, sin editarse. Después, `npm run typecheck` y `npm run lint`.
6. **Commit:** `feat(front): «Administrar el taller» en «Tu cuenta», sólo para admins`.

### Tarea 1.7 · El fixture, los datos del contrato y el Page Object (T009, E)

**Archivos:** `qa/e2e/fixtures/index.ts`, `qa/e2e/lib/admin-contract.ts` y `qa/e2e/pages/admin.ts`. `qa/e2e/fixtures/api-double.ts` no cambia.

**Produce:** «`qa/e2e`» del contrato.

1. **`api-double.ts`, sin cambios.** F11a ya guarda la query de cada pedido en `ApiCall.search` (`impl-f11a`, `qa/e2e/fixtures/api-double.ts:11`, y `callOf`, `:41`), por el hallazgo 4 de F12a. Las rutas se comparan por `METHOD path`, sin la query, y `replyTo` busca la ruta antes de mirar el CSRF (`:127-139`). T009 no suma `search`, `query`, otro `replyTo` ni ningún campo: lo comprueba `git diff f12a/base -- qa/e2e/fixtures/api-double.ts`, que no imprime nada. Con A3 en la base (B4), el doble ya trae lo de A3 y tampoco se toca.
2. **`fixtures/index.ts`,** tres cambios, sobre el fixture `account` que deja F11a (B1; en a7b3c71d todavía no existe):
   - `import { AdminPage } from '../pages/admin';`;
   - `admin: AdminPage;` en `Fixtures`;
   - `admin: async ({ page, account }, use) => use(new AdminPage(page, account)),` después de `account`.
3. **`lib/admin-contract.ts`.** Las formas y los mensajes salen del contrato de C3b y de `lang/es/` (`api.php` y `account.php`):

   ```ts
   import { ADMIN } from './api-contract';

   export interface AdminUserJson {
     id: number;
     name: string;
     email: string;
     role: 'admin' | 'student';
     status: 'active' | 'disabled' | 'deleting';
     emailVerified: boolean;
     privacyVersion: string | null;
     createdAt: string;
     updatedAt: string;
   }

   export interface AdminInvitationJson {
     id: number;
     email: string;
     role: 'admin' | 'student';
     delivery: 'link' | 'email';
     expiresAt: string;
     expired: boolean;
     sentAt: string | null;
     sendFailedAt: string | null;
     invitedBy: { id: number; name: string } | null;
     createdAt: string;
   }

   export interface PageJson<T> {
     data: T[];
     meta: { page: number; perPage: number; total: number; lastPage: number };
   }

   export const ADMIN_MESSAGES = {
     forbidden: 'No tenés permiso para hacer esto.',
     last_admin: 'Tiene que quedar al menos un admin activo.',
     password_confirmation_required: 'Confirmá tu contraseña para continuar.',
     too_many_requests: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
     unauthenticated: 'Iniciá sesión para continuar.',
     not_found: 'No existe lo que pedís.',
   } as const;

   export const DELETION_MESSAGE =
     'Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';

   export function adminError(code: keyof typeof ADMIN_MESSAGES) {
     return { message: ADMIN_MESSAGES[code], code };
   }

   export function adminUser(
     fields: Pick<AdminUserJson, 'id' | 'name' | 'email'> & Partial<AdminUserJson>,
   ): AdminUserJson {
     return {
       role: 'student',
       status: 'active',
       emailVerified: true,
       privacyVersion: '2026-10-dev',
       createdAt: '2026-10-05T12:00:00.000Z',
       updatedAt: '2026-10-05T12:00:00.000Z',
       ...fields,
     };
   }

   export function invitation(
     fields: Pick<AdminInvitationJson, 'id' | 'email'> & Partial<AdminInvitationJson>,
   ): AdminInvitationJson {
     return {
       role: 'student',
       delivery: 'link',
       expiresAt: '2026-10-12T15:30:00.000Z',
       expired: false,
       sentAt: null,
       sendFailedAt: null,
       invitedBy: { id: ADMIN.id, name: ADMIN.name },
       createdAt: '2026-10-05T12:00:00.000Z',
       ...fields,
     };
   }

   export function pageOf<T>(data: T[], page = 1, lastPage = 1, total = data.length): PageJson<T> {
     return { data, meta: { page, perPage: 25, total, lastPage } };
   }

   export function linkFor(email: string): string {
     return `http://127.0.0.1/#invitacion=${email
       .replace(/[^a-z0-9]/g, '')
       .padEnd(43, 'x')
       .slice(0, 43)}`;
   }

   export const OWN_ROW = adminUser({
     id: ADMIN.id,
     name: ADMIN.name,
     email: ADMIN.email,
     role: 'admin',
   });
   export const ANA_ROW = adminUser({ id: 12, name: 'Ana Pérez', email: 'ana@x.com' });
   export const BETO_ROW = adminUser({
     id: 13,
     name: 'Beto Gómez',
     email: 'beto@x.com',
     role: 'admin',
   });
   export const LEAVING_ROW = adminUser({
     id: 14,
     name: 'Carla Díaz',
     email: 'carla@x.com',
     status: 'deleting',
   });
   ```

4. **`pages/admin.ts`.** `open()` es el único método que sabe cómo se abre la administración (FR-063). El resto ubica la página por su región y sus roles:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import type { AccountPage } from './account';

   export class AdminPage {
     readonly region: Locator;
     readonly title: Locator;

     constructor(
       readonly page: Page,
       private readonly account: AccountPage,
     ) {
       this.region = page.getByRole('region', { name: 'Administración' });
       this.title = this.region.getByRole('heading', { name: 'Administración', exact: true });
     }

     async open(): Promise<void> {
       await this.account.open();
       await this.account.button('Administrar el taller').click();
     }

     button(name: string): Locator {
       return this.region.getByRole('button', { name, exact: true });
     }

     field(label: string): Locator {
       return this.region.getByLabel(label, { exact: true });
     }

     inviteForm(): Locator {
       return this.region.getByRole('form', { name: 'Invitar' });
     }

     table(name: string): Locator {
       return this.region.getByRole('table', { name });
     }

     row(name: RegExp): Locator {
       return this.region.getByRole('row', { name });
     }

     actions(name: RegExp): Locator {
       return this.row(name).getByRole('group', { name: /^Acciones sobre/ });
     }

     notice(text: string): Locator {
       return this.region.getByRole('status').filter({ hasText: text });
     }

     dialog(name: string): Locator {
       return this.page.getByRole('dialog', { name });
     }

     async openSection(name: 'Cuentas' | 'Invitaciones'): Promise<void> {
       await this.button(name).click();
     }

     async invite(emails: readonly string[], role: 'Alumno' | 'Admin' = 'Alumno'): Promise<void> {
       await this.openSection('Invitaciones');
       await this.inviteForm().getByLabel('Emails', { exact: true }).fill(emails.join('\n'));
       await this.inviteForm().getByLabel('Rol', { exact: true }).selectOption({ label: role });
       await this.inviteForm().getByRole('button', { name: 'Crear las invitaciones' }).click();
     }

     async confirmPassword(password: string): Promise<void> {
       const dialog = this.dialog('Confirmá tu contraseña para seguir');
       await dialog.getByLabel('Tu contraseña', { exact: true }).fill(password);
       await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
     }
   }
   ```

5. **Correr** `npm run typecheck` y `npm run build && E2E_PORT=4194 npm run test:e2e`: toda la red, en verde y sin cambios.
6. **Commit:** `test(qa): el fixture, los datos de la administración y su Page Object`.

### Tarea 1.8 · La compuerta de U1 (T010, K)

- **Desde S1:** M, A y E entregaron.
- **La compuerta de 0.3,** con `npm run test:unit` en verde (las specs del modelo, de los endpoints, de `isAdmin` y de la entrada).
- **El PR:** `feat(front): administration model, endpoints and the entry in «Tu cuenta» (F12a U1)`, contra `f12a/base`.

**Reversión de U1:** se revierten T009, T008, T007, T006, T005, T004 y T003, en ese orden.

## 2. U2 · La página (onda 2: D, L y E; onda 3: L e I; onda 4: P; onda 4b: K)

**Cubre:**

- **los diálogos y la contraseña:** FR-005, FR-006, FR-029 a FR-031, FR-036 a FR-038 y FR-043;
- **las listas:** FR-009 a FR-015, FR-021 a FR-023 y FR-042;
- **las acciones:** FR-016 a FR-020, FR-024 a FR-028, FR-032 a FR-035, FR-040 y FR-041;
- **la página:** FR-050 a FR-055 y FR-062;
- **los criterios:** SC-004, SC-005 y SC-010;
- **las historias:** la 1, en sus escenarios 1 a 5 y 7, y las historias 2, 3, 4 y 6; la historia 5, en su escenario 6.

**Entrega:** `pages/admin` entera, con su índice y sus estilos, montable sola. Todavía nadie la monta en el taller: lo hace T023.

### Tarea 2.1 · Las specs del diálogo de acción, en rojo (T011, D, desde S1)

**Archivos:**

- en `frontend/src/pages/admin/ui/`, la ayuda `render-admin.tsx`, `action-dialog.spec.tsx` y los stubs de `ActionDialog.tsx`, `ConfirmStep.tsx`, `PasswordStep.tsx`, `LinksStep.tsx`, `LinkResult.tsx`, `FailureNotice.tsx` y `use-action-dialog.ts`;
- en `frontend/src/pages/admin/lib/`, los stubs de `copy-text.ts` y `recover-session.ts`.

Todos los stubs son `const` tipados que lanzan `not implemented` («Reglas», TDD): los componentes, como `const ActionDialog: FunctionComponent<ActionDialogProps> = () => { throw new Error('not implemented'); };` con su interfaz de props ya declarada; el hook y las funciones, con su firma de la tarea 2.2 como tipo.

**Consume:** de M, `types.ts`, `react-to-failure.ts`, `link-texts.ts` y `confirmPassword`; de F11a, `shared/ui/form`, `shared/api/http` y `features/sign-in`. **Produce:** `ActionDialog` (`{ adminId, start, notFoundMessage, send, onFinish }`), `useActionDialog(ownId, fallback, announce)` y `FailureNotice`.

1. **`render-admin.tsx`,** la ayuda que comparten las specs de la página. No es una spec: Vitest no la corre, y ningún módulo de producción la importa:

   ```tsx
   import { render } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import type { ReactElement } from 'react';
   import { sessionStore, type PublishedUser } from '../../../entities/session';
   import { ApiClientContext, createApiClient, type FetchLike } from '../../../shared/api/http';
   import {
     createFakeFetch,
     type FakeReply,
     type RecordedCall,
   } from '../../../shared/api/http/fake-fetch';

   export const OLGA: PublishedUser = {
     id: 1,
     name: 'Olga Ruiz',
     email: 'olga@x.com',
     role: 'admin',
     privacyAccepted: true,
   };

   export type AdminUserEvent = ReturnType<typeof userEvent.setup>;

   export interface RenderedAdmin {
     readonly user: AdminUserEvent;
     readonly calls: readonly RecordedCall[];
   }

   export function stubDialogs(): void {
     HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
       this.open = true;
     };
     HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
       this.open = false;
       this.dispatchEvent(new Event('close'));
     };
   }

   export function signInAs(user: PublishedUser = OLGA): void {
     sessionStore.setState({
       status: 'signed-in',
       user,
       features: { passwordReset: false, registration: false },
       contentVersion: null,
     });
   }

   export function renderWithFetch(element: ReactElement, fetch: FetchLike): AdminUserEvent {
     const user = userEvent.setup();
     const client = createApiClient({ fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     render(<ApiClientContext value={client}>{element}</ApiClientContext>);
     return user;
   }

   export function renderAdmin(
     element: ReactElement,
     replies: readonly (FakeReply | 'network-error')[],
   ): RenderedAdmin {
     const fake = createFakeFetch(replies);
     return { user: renderWithFetch(element, fake.fetch), calls: fake.calls };
   }

   export function pathsOf(calls: readonly RecordedCall[]): string[] {
     return calls.map((call) => `${call.method} ${call.path}`);
   }
   ```

2. **`action-dialog.spec.tsx`.** Cubre la historia 6, el resultado de la historia 1 (escenarios 2, 3 y 6) y las Review Focus 2 y 3:

   ```tsx
   import { fireEvent, screen } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import type { FetchLike } from '../../../shared/api/http';
   import type { ActionResult, DialogStart, InviteEntry } from '../model/types';
   import ActionDialog from './ActionDialog';
   import { OLGA, renderAdmin, renderWithFetch, signInAs, stubDialogs } from './render-admin';

   const LOCKED = {
     kind: 'failed',
     failure: {
       kind: 'response',
       status: 423,
       code: 'password_confirmation_required',
       message: 'Confirmá tu contraseña para continuar.',
       fieldErrors: {},
       retryAfterSeconds: null,
     },
   } as const satisfies ActionResult;
   const CONFIRM: DialogStart = {
     kind: 'confirm',
     title: '¿Deshabilitar la cuenta de Ana Pérez?',
     confirmation: {
       body: ['No va a poder entrar.'],
       confirmLabel: 'Deshabilitar',
       pendingLabel: 'Deshabilitando…',
     },
   };
   const BETO: InviteEntry = {
     email: 'beto@x.com',
     result: 'created',
     link: {
       email: 'beto@x.com',
       url: 'http://localhost:8080/#invitacion=b',
       expiresAt: '2026-10-12T12:00:00.000Z',
     },
   };
   const CARLA: InviteEntry = {
     email: 'carla@x.com',
     result: 'renewed',
     link: {
       email: 'carla@x.com',
       url: 'http://localhost:8080/#invitacion=c',
       expiresAt: '2026-10-12T12:00:00.000Z',
     },
   };
   const PASSWORD = 'una frase larga para el taller';

   function dialogWith(start: DialogStart, send: () => Promise<ActionResult>, onFinish = vi.fn()) {
     return (
       <ActionDialog
         adminId={OLGA.id}
         start={start}
         notFoundMessage="Esa cuenta ya no existe."
         send={send}
         onFinish={onFinish}
       />
     );
   }

   beforeAll(stubDialogs);
   beforeEach(() => signInAs());

   describe('the reconfirmed password', () => {
     it('asks for it on a 423 in the same dialog and repeats the action exactly once', async () => {
       const send = vi
         .fn<() => Promise<ActionResult>>()
         .mockResolvedValueOnce(LOCKED)
         .mockResolvedValueOnce({ kind: 'done' });
       const onFinish = vi.fn();
       const { user, calls } = renderAdmin(dialogWith(CONFIRM, send, onFinish), [
         { status: 201, json: {} },
       ]);
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       expect(
         screen.getByRole('dialog', { name: 'Confirmá tu contraseña para seguir' }),
       ).toBeInTheDocument();
       await user.type(screen.getByLabelText('Tu contraseña'), PASSWORD);
       await user.click(screen.getByRole('button', { name: 'Confirmar' }));
       expect(calls[0]).toMatchObject({
         path: '/api/auth/confirm-password',
         body: { password: PASSWORD },
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('1');
       expect(send).toHaveBeenCalledTimes(2);
       expect(onFinish).toHaveBeenCalledWith('done');
     });

     it('marks the field when the password is wrong and does not repeat the action', async () => {
       const send = vi.fn<() => Promise<ActionResult>>().mockResolvedValue(LOCKED);
       const { user } = renderAdmin(dialogWith(CONFIRM, send), [
         {
           status: 422,
           json: { message: 'El email o la contraseña no son correctos.', code: 'auth_failed' },
         },
       ]);
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       await user.type(screen.getByLabelText('Tu contraseña'), 'otra');
       await user.click(screen.getByRole('button', { name: 'Confirmar' }));
       expect(screen.getByLabelText('Tu contraseña')).toHaveAttribute('aria-invalid', 'true');
       expect(screen.getByText('La contraseña no es correcta.')).toBeInTheDocument();
       expect(send).toHaveBeenCalledOnce();
     });

     it('makes no change when the password is cancelled', async () => {
       const send = vi.fn<() => Promise<ActionResult>>().mockResolvedValue(LOCKED);
       const onFinish = vi.fn();
       const { user } = renderAdmin(dialogWith(CONFIRM, send, onFinish), []);
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       await user.click(screen.getByRole('button', { name: 'Cancelar' }));
       expect(onFinish).toHaveBeenCalledWith('unchanged');
       expect(send).toHaveBeenCalledOnce();
     });

     it('does not send the action when the dialog closed while the password was being confirmed', async () => {
       const pending: { answer?: (response: Response) => void } = {};
       const fetch: FetchLike = () =>
         new Promise((resolve) => {
           pending.answer = resolve;
         });
       const send = vi.fn<() => Promise<ActionResult>>().mockResolvedValue(LOCKED);
       const onFinish = vi.fn();
       const user = renderWithFetch(dialogWith(CONFIRM, send, onFinish), fetch);
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       await user.type(screen.getByLabelText('Tu contraseña'), PASSWORD);
       await user.click(screen.getByRole('button', { name: 'Confirmar' }));
       await vi.waitFor(() => expect(pending.answer).toBeDefined());
       fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
       expect(onFinish).toHaveBeenCalledWith('unchanged');
       pending.answer?.(new Response('{}', { status: 201 }));
       await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled());
       expect(send).toHaveBeenCalledOnce();
     });

     it('shows the message of a second 423 instead of asking again', async () => {
       const send = vi.fn<() => Promise<ActionResult>>().mockResolvedValue(LOCKED);
       const { user } = renderAdmin(dialogWith(CONFIRM, send), [{ status: 201, json: {} }]);
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       await user.type(screen.getByLabelText('Tu contraseña'), PASSWORD);
       await user.click(screen.getByRole('button', { name: 'Confirmar' }));
       expect(screen.getByRole('alert')).toHaveTextContent('Confirmá tu contraseña para continuar.');
       expect(screen.queryByLabelText('Tu contraseña')).toBeNull();
       expect(send).toHaveBeenCalledTimes(2);
     });
   });

   describe('while the action is on its way', () => {
     it('keeps the button busy and sends once on a double click', async () => {
       const pending: { answer?: (result: ActionResult) => void } = {};
       const send = vi.fn<() => Promise<ActionResult>>(
         () =>
           new Promise((resolve) => {
             pending.answer = resolve;
           }),
       );
       const onFinish = vi.fn();
       const { user } = renderAdmin(dialogWith(CONFIRM, send, onFinish), []);
       await user.dblClick(screen.getByRole('button', { name: 'Deshabilitar' }));
       expect(screen.getByRole('button', { name: 'Deshabilitando…' })).toBeDisabled();
       expect(send).toHaveBeenCalledOnce();
       pending.answer?.({ kind: 'done' });
       await vi.waitFor(() => expect(onFinish).toHaveBeenCalledWith('done'));
     });

     it('waits for Retry-After before letting the password be sent again', async () => {
       const send = vi.fn<() => Promise<ActionResult>>().mockResolvedValue(LOCKED);
       const { user } = renderAdmin(dialogWith(CONFIRM, send), [
         {
           status: 429,
           headers: { 'Retry-After': '120' },
           json: {
             message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
             code: 'too_many_requests',
           },
         },
       ]);
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       await user.type(screen.getByLabelText('Tu contraseña'), PASSWORD);
       await user.click(screen.getByRole('button', { name: 'Confirmar' }));
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'Podés volver a intentar en 2 minutos.',
       );
       expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
       expect(send).toHaveBeenCalledOnce();
     });
   });

   describe('the links', () => {
     const links: DialogStart = {
       kind: 'links',
       title: 'Crear las invitaciones',
       entries: [BETO, CARLA],
     };
     const done = () => Promise.resolve<ActionResult>({ kind: 'done' });

     it('asks before closing while links are on screen, with Esc and with «Listo»', async () => {
       const onFinish = vi.fn();
       const { user } = renderAdmin(dialogWith(links, done, onFinish), []);
       fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
       expect(screen.getByText('¿Cerrar? Los enlaces no se vuelven a mostrar.')).toBeInTheDocument();
       await user.click(screen.getByRole('button', { name: 'Volver' }));
       await user.click(screen.getByRole('button', { name: 'Listo' }));
       expect(onFinish).not.toHaveBeenCalled();
       await user.click(screen.getByRole('button', { name: 'Cerrar igual' }));
       expect(onFinish).toHaveBeenCalledWith('done');
     });

     it('closes at once when there is no link to lose', async () => {
       const onFinish = vi.fn();
       const start: DialogStart = {
         kind: 'links',
         title: 'Crear las invitaciones',
         entries: [{ email: 'ana@x.com', result: 'user_exists', link: null }],
       };
       const { user } = renderAdmin(dialogWith(start, done, onFinish), []);
       await user.click(screen.getByRole('button', { name: 'Listo' }));
       expect(onFinish).toHaveBeenCalledWith('done');
     });

     it('copies one link and all of them, one line per invitation', async () => {
       const { user } = renderAdmin(dialogWith(links, done), []);
       await user.click(screen.getByRole('button', { name: 'Copiar el enlace de beto@x.com' }));
       expect(await navigator.clipboard.readText()).toBe('http://localhost:8080/#invitacion=b');
       expect(screen.getByRole('status')).toHaveTextContent('Copiado.');
       await user.click(screen.getByRole('button', { name: 'Copiar todos los enlaces' }));
       expect(await navigator.clipboard.readText()).toBe(
         'beto@x.com\thttp://localhost:8080/#invitacion=b\ncarla@x.com\thttp://localhost:8080/#invitacion=c',
       );
     });

     it('leaves the link selected and says how to copy it when there is no clipboard', async () => {
       const { user } = renderAdmin(dialogWith(links, done), []);
       Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
       await user.click(screen.getByRole('button', { name: 'Copiar el enlace de beto@x.com' }));
       expect(screen.getByRole('status')).toHaveTextContent(
         'No pudimos copiar: seleccioná el enlace y copialo a mano.',
       );
       const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'Enlace de beto@x.com' });
       expect(field).toHaveFocus();
       expect([field.selectionStart, field.selectionEnd]).toEqual([0, field.value.length]);
     });

     it('counts a close forced by the browser as «Cerrar igual»', () => {
       const onFinish = vi.fn();
       renderAdmin(dialogWith(links, done, onFinish), []);
       fireEvent(screen.getByRole('dialog'), new Event('close'));
       expect(onFinish).toHaveBeenCalledWith('done');
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/action-dialog.spec.tsx`: en rojo, por `not implemented`.
4. **Commit:** `test(front): specs del diálogo de acción de la administración, en rojo`.

### Tarea 2.2 · El diálogo de acción (T012, D)

**Archivos:** los nueve de 2.1.

1. **`lib/copy-text.ts`.** Sin portapapeles, o si lo rechaza, devuelve `false`:

   ```ts
   export async function copyText(text: string): Promise<boolean> {
     try {
       await navigator.clipboard.writeText(text);
       return true;
     } catch {
       return false;
     }
   }
   ```

2. **`lib/recover-session.ts`.** Ante un 401 pide el ingreso, y ante `account_disabled` recarga (research.md, R6):

   ```ts
   import {
     reauthenticate,
     requestSignIn,
     type ReauthenticationOutcome,
   } from '../../../features/sign-in';
   import type { ApiFailure } from '../../../shared/api/http';
   import { reloadDocument } from '../../../shared/lib/reload-document';
   import { reactionTo } from '../model/react-to-failure';

   export function signInAgain(ownId: number): Promise<ReauthenticationOutcome> {
     return reauthenticate(ownId, { requestSignIn, reloadDocument });
   }

   export function recoverSession(failure: ApiFailure, ownId: number): boolean {
     const reaction = reactionTo(failure, '');
     if (reaction.kind === 'reload') reloadDocument();
     if (reaction.kind === 'sign-in') void signInAgain(ownId);
     return reaction.kind !== 'show';
   }
   ```

3. **`ui/FailureNotice.tsx`.** El error general con «Recargar» cuando hace falta, o con lo que reciba como hijos:

   ```tsx
   import type { ReactNode } from 'react';
   import { reloadDocument } from '../../../shared/lib/reload-document';
   import { ServerError, type FailureDescription } from '../../../shared/ui/form';

   interface FailureNoticeProps {
     readonly failure: FailureDescription | null;
     readonly lead?: string;
     readonly takeFocus?: boolean;
     readonly children?: ReactNode;
   }

   const FailureNotice = ({ failure, lead, takeFocus = true, children }: FailureNoticeProps) => {
     const messages = [...(lead === undefined ? [] : [lead]), ...(failure?.generalMessages ?? [])];
     return (
       <ServerError messages={messages} takeFocus={takeFocus}>
         {failure?.offerReload === true ? (
           <button type="button" className="button secondary" onClick={reloadDocument}>
             Recargar
           </button>
         ) : (
           children
         )}
       </ServerError>
     );
   };

   export default FailureNotice;
   ```

4. **`ui/ConfirmStep.tsx`.** La casilla de borrar habilita el botón (FR-017):

   ```tsx
   import { useState } from 'react';
   import type { FailureDescription } from '../../../shared/ui/form';
   import type { Confirmation } from '../model/types';
   import FailureNotice from './FailureNotice';

   interface ConfirmStepProps {
     readonly confirmation: Confirmation;
     readonly failure: FailureDescription | null;
     readonly pending: boolean;
     readonly waiting: boolean;
     onConfirm(): void;
     onCancel(): void;
   }

   const ConfirmStep = ({
     confirmation,
     failure,
     pending,
     waiting,
     onConfirm,
     onCancel,
   }: ConfirmStepProps) => {
     const { body, confirmLabel, pendingLabel, acknowledgement } = confirmation;
     const [acknowledged, setAcknowledged] = useState(acknowledgement === undefined);
     return (
       <>
         {body.map((paragraph) => (
           <p key={paragraph}>{paragraph}</p>
         ))}
         {acknowledgement === undefined ? null : (
           <label className="form-check">
             <input
               type="checkbox"
               checked={acknowledged}
               onChange={(event) => setAcknowledged(event.target.checked)}
             />
             {acknowledgement}
           </label>
         )}
         <FailureNotice failure={failure} />
         <div className="dialog-actions">
           <button type="button" className="button secondary" disabled={pending} onClick={onCancel}>
             Cancelar
           </button>
           {failure?.offerReload === true ? null : (
             <button
               type="button"
               className="button"
               disabled={pending || waiting || !acknowledged}
               onClick={onConfirm}
             >
               {pending ? pendingLabel : confirmLabel}
             </button>
           )}
         </div>
       </>
     );
   };

   export default ConfirmStep;
   ```

5. **`ui/PasswordStep.tsx`.** El 422 `auth_failed` marca el campo con un texto propio, porque el del servidor habla de un email (hallazgo 3 de F11):

   ```tsx
   import { useForm } from 'react-hook-form';
   import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   import { reloadDocument } from '../../../shared/lib/reload-document';
   import {
     PasswordField,
     ServerError,
     messagesOf,
     showFailure,
     useGuardedSubmit,
     useRetryCountdown,
   } from '../../../shared/ui/form';
   import { confirmPassword } from '../api/admin-endpoints';
   import { reactionTo } from '../model/react-to-failure';

   interface PasswordValues {
     password: string;
   }

   interface PasswordStepProps {
     readonly adminId: number;
     onConfirmed(): Promise<void>;
     onCancel(): void;
     onSignedOut(): void;
   }

   const WRONG_PASSWORD = 'La contraseña no es correcta.';
   const REQUIRED = 'Completá este campo.';

   function isWrongPassword(failure: ApiFailure): boolean {
     return failure.kind === 'response' && failure.code === 'auth_failed';
   }

   const PasswordStep = ({ adminId, onConfirmed, onCancel, onSignedOut }: PasswordStepProps) => {
     const client = useApiClient();
     const countdown = useRetryCountdown();
     const {
       register,
       handleSubmit,
       setError,
       formState: { errors, isSubmitting },
     } = useForm<PasswordValues>({ criteriaMode: 'all', defaultValues: { password: '' } });

     const submit = useGuardedSubmit(async ({ password }: PasswordValues) => {
       const outcome = await confirmPassword(client, adminId, password);
       if (outcome.ok) {
         await onConfirmed();
         return;
       }
       if (isWrongPassword(outcome.failure)) {
         setError('password', { type: 'server', message: WRONG_PASSWORD }, { shouldFocus: true });
         return;
       }
       const reaction = reactionTo(outcome.failure, '');
       if (reaction.kind === 'sign-in') return onSignedOut();
       if (reaction.kind === 'reload') return reloadDocument();
       showFailure(setError, reaction.description, []);
       if (reaction.description.retryAfterSeconds !== null)
         countdown.start(reaction.description.retryAfterSeconds);
     });

     return (
       <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
         <ServerError
           messages={messagesOf(errors.root?.serverError)}
           takeFocus={errors.password === undefined}
         />
         <PasswordField
           label="Tu contraseña"
           autoComplete="current-password"
           hint="Durante 15 minutos no te la vamos a volver a pedir."
           registration={register('password', { required: REQUIRED })}
           messages={messagesOf(errors.password)}
         />
         <div className="dialog-actions">
           <button
             type="button"
             className="button secondary"
             disabled={isSubmitting}
             onClick={onCancel}
           >
             Cancelar
           </button>
           <button type="submit" className="button" disabled={isSubmitting || countdown.waiting}>
             {isSubmitting ? 'Confirmando…' : 'Confirmar'}
           </button>
         </div>
       </form>
     );
   };

   export default PasswordStep;
   ```

6. **`ui/LinkResult.tsx`.** Si no se puede copiar, el campo recibe el foco y queda seleccionado (FR-030):

   ```tsx
   import { useRef } from 'react';
   import { copyText } from '../lib/copy-text';
   import { entryText } from '../model/link-texts';
   import type { InviteEntry } from '../model/types';

   interface LinkResultProps {
     readonly entry: InviteEntry;
     onCopied(copied: boolean): void;
   }

   const LinkResult = ({ entry, onCopied }: LinkResultProps) => {
     const field = useRef<HTMLInputElement>(null);
     const { email, link } = entry;
     const copy = async (url: string): Promise<void> => {
       const copied = await copyText(url);
       if (!copied) {
         field.current?.focus();
         field.current?.select();
       }
       onCopied(copied);
     };
     return (
       <li>
         <p>
           <strong>{email}</strong> · {entryText(entry)}
         </p>
         {link === null ? null : (
           <div className="form-control">
             <input
               ref={field}
               className="form-input"
               readOnly
               value={link.url}
               aria-label={`Enlace de ${email}`}
             />
             <button
               type="button"
               className="button secondary small"
               aria-label={`Copiar el enlace de ${email}`}
               onClick={() => void copy(link.url)}
             >
               Copiar
             </button>
           </div>
         )}
       </li>
     );
   };

   export default LinkResult;
   ```

7. **`ui/LinksStep.tsx`:**

   ```tsx
   import { useState } from 'react';
   import { copyText } from '../lib/copy-text';
   import { LINKS_WARNING, copyAllText, linksOf } from '../model/link-texts';
   import type { InviteEntry } from '../model/types';
   import LinkResult from './LinkResult';

   interface LinksStepProps {
     readonly entries: readonly InviteEntry[];
     readonly leaving: boolean;
     onDone(): void;
     onStay(): void;
     onLeave(): void;
   }

   const COPIED = 'Copiado.';
   const NOT_COPIED = 'No pudimos copiar: seleccioná el enlace y copialo a mano.';

   const LinksStep = ({ entries, leaving, onDone, onStay, onLeave }: LinksStepProps) => {
     const [copyNotice, setCopyNotice] = useState('');
     const links = linksOf(entries);
     const announce = (copied: boolean): void => setCopyNotice(copied ? COPIED : NOT_COPIED);
     return (
       <>
         {links.length === 0 ? null : <p className="admin-warning">{LINKS_WARNING}</p>}
         <ul className="admin-results">
           {entries.map((entry) => (
             <LinkResult key={entry.email} entry={entry} onCopied={announce} />
           ))}
         </ul>
         <p className="admin-notice" role="status">
           {copyNotice}
         </p>
         {leaving ? (
           <div className="admin-leave">
             <p>¿Cerrar? Los enlaces no se vuelven a mostrar.</p>
             <div className="dialog-actions">
               <button type="button" className="button secondary" autoFocus onClick={onStay}>
                 Volver
               </button>
               <button type="button" className="button" onClick={onLeave}>
                 Cerrar igual
               </button>
             </div>
           </div>
         ) : (
           <div className="dialog-actions">
             {links.length > 1 ? (
               <button
                 type="button"
                 className="button secondary"
                 onClick={() => void copyText(copyAllText(links)).then(announce)}
               >
                 Copiar todos los enlaces
               </button>
             ) : null}
             <button type="button" className="button" onClick={onDone}>
               Listo
             </button>
           </div>
         )}
       </>
     );
   };

   export default LinksStep;
   ```

8. **`ui/ActionDialog.tsx`** (research.md, R4 y R5):
   - `isOwn` ignora los eventos de los diálogos de adentro;
   - `confirmed` asegura un solo reintento;
   - `finished` impide que una respuesta tardía actúe después de cerrar;
   - `onClose` atiende el cierre forzado del navegador.

   ```tsx
   import { useEffect, useId, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
   import { reloadDocument } from '../../../shared/lib/reload-document';
   import {
     useGuardedSubmit,
     useRetryCountdown,
     type FailureDescription,
   } from '../../../shared/ui/form';
   import { RESULT_TITLE, linksOf } from '../model/link-texts';
   import { needsPassword, reactionTo } from '../model/react-to-failure';
   import type { ActionResult, DialogEnd, DialogStart, InviteEntry } from '../model/types';
   import ConfirmStep from './ConfirmStep';
   import FailureNotice from './FailureNotice';
   import LinksStep from './LinksStep';
   import PasswordStep from './PasswordStep';

   type Step =
     | { readonly kind: 'confirm' | 'password' | 'failed' }
     | { readonly kind: 'links' | 'leaving'; readonly entries: readonly InviteEntry[] };

   interface ActionDialogProps {
     readonly adminId: number;
     readonly start: DialogStart;
     readonly notFoundMessage: string;
     send(): Promise<ActionResult>;
     onFinish(end: DialogEnd): void;
   }

   const PASSWORD_TITLE = 'Confirmá tu contraseña para seguir';

   function firstStep(start: DialogStart): Step {
     return start.kind === 'links' ? { kind: 'links', entries: start.entries } : { kind: start.kind };
   }

   function titleOf(step: Step, title: string): string {
     if (step.kind === 'password') return PASSWORD_TITLE;
     return step.kind === 'links' || step.kind === 'leaving' ? RESULT_TITLE : title;
   }

   function endOf(step: Step): DialogEnd {
     if (step.kind === 'password') return 'unchanged';
     return step.kind === 'links' || step.kind === 'leaving' ? 'done' : 'cancelled';
   }

   function isOwn(event: SyntheticEvent<HTMLDialogElement>): boolean {
     return event.target === event.currentTarget;
   }

   const ActionDialog = ({ adminId, start, notFoundMessage, send, onFinish }: ActionDialogProps) => {
     const dialog = useRef<HTMLDialogElement>(null);
     const heading = useRef<HTMLHeadingElement>(null);
     const finished = useRef(false);
     const confirmed = useRef(false);
     const titleId = useId();
     const [step, setStep] = useState<Step>(() => firstStep(start));
     const [pending, setPending] = useState(false);
     const [failure, setFailure] = useState<FailureDescription | null>(null);
     const countdown = useRetryCountdown();

     useEffect(() => {
       const element = dialog.current;
       if (element !== null && !element.open) element.showModal();
       if (step.kind !== 'leaving') heading.current?.focus();
     }, [step.kind]);

     const finish = (end: DialogEnd): void => {
       if (finished.current) return;
       finished.current = true;
       onFinish(end);
     };

     const fail = (result: Extract<ActionResult, { kind: 'failed' }>): void => {
       if (needsPassword(result.failure) && !confirmed.current) {
         setStep({ kind: 'password' });
         return;
       }
       const reaction = reactionTo(result.failure, notFoundMessage);
       if (reaction.kind === 'sign-in') return finish('signed-out');
       if (reaction.kind === 'reload') return reloadDocument();
       setFailure(reaction.description);
       if (reaction.description.retryAfterSeconds !== null)
         countdown.start(reaction.description.retryAfterSeconds);
       if (confirmed.current) setStep({ kind: 'failed' });
     };

     const run = useGuardedSubmit(async () => {
       if (finished.current) return;
       setPending(true);
       setFailure(null);
       const result = await send();
       setPending(false);
       if (result.kind === 'done') finish('done');
       else if (result.kind === 'links') setStep({ kind: 'links', entries: result.entries });
       else fail(result);
     });

     const confirmAndRetry = async (): Promise<void> => {
       confirmed.current = true;
       await run();
     };

     const dismiss = (): void => {
       if (step.kind === 'links' && linksOf(step.entries).length > 0)
         setStep({ ...step, kind: 'leaving' });
       else if (step.kind === 'leaving') setStep({ ...step, kind: 'links' });
       else finish(endOf(step));
     };

     const onCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
       if (!isOwn(event)) return;
       event.preventDefault();
       if (!pending) dismiss();
     };

     const onClose = (event: SyntheticEvent<HTMLDialogElement>): void => {
       if (!isOwn(event)) return;
       if (pending) dialog.current?.showModal();
       else finish(endOf(step));
     };

     const body = (): ReactNode => {
       switch (step.kind) {
         case 'confirm':
           return start.kind === 'confirm' ? (
             <ConfirmStep
               confirmation={start.confirmation}
               failure={failure}
               pending={pending}
               waiting={countdown.waiting}
               onConfirm={() => void run()}
               onCancel={() => finish('cancelled')}
             />
           ) : null;
         case 'password':
           return (
             <PasswordStep
               adminId={adminId}
               onConfirmed={confirmAndRetry}
               onCancel={() => finish('unchanged')}
               onSignedOut={() => finish('signed-out')}
             />
           );
         case 'failed':
           return (
             <>
               <FailureNotice failure={failure} />
               <div className="dialog-actions">
                 <button
                   type="button"
                   className="button secondary"
                   onClick={() => finish('cancelled')}
                 >
                   Cerrar
                 </button>
               </div>
             </>
           );
         case 'links':
         case 'leaving':
           return (
             <LinksStep
               entries={step.entries}
               leaving={step.kind === 'leaving'}
               onDone={dismiss}
               onStay={() => setStep({ ...step, kind: 'links' })}
               onLeave={() => finish('done')}
             />
           );
       }
     };

     return (
       <dialog
         ref={dialog}
         className="admin-action"
         aria-labelledby={titleId}
         onCancel={onCancel}
         onClose={onClose}
       >
         <div className="dialog-content">
           <h2 id={titleId} ref={heading} tabIndex={-1}>
             {titleOf(step, start.title)}
           </h2>
           {body()}
         </div>
       </dialog>
     );
   };

   export default ActionDialog;
   ```

9. **`ui/use-action-dialog.ts`.** Guarda el control que abrió el diálogo, cierra con `flushSync` y devuelve el foco a ese control o al título de la tabla (FR-006). Ante un 401 pide el ingreso después de cerrar (FR-005):

   ```ts
   import { useState, type RefObject } from 'react';
   import { flushSync } from 'react-dom';
   import { signInAgain } from '../lib/recover-session';
   import { UNCHANGED } from '../model/react-to-failure';
   import type { ActionResult, DialogEnd, DialogStart } from '../model/types';

   export interface DialogRequest {
     readonly start: DialogStart;
     readonly notFoundMessage: string;
     send(): Promise<ActionResult>;
   }

   export interface OpenDialog extends DialogRequest {
     readonly opener: HTMLElement | null;
   }

   const useActionDialog = (
     ownId: number,
     fallback: RefObject<HTMLElement | null>,
     announce: (message: string) => void,
   ) => {
     const [dialog, setDialog] = useState<OpenDialog | null>(null);

     const open = (request: DialogRequest, opener: HTMLElement | null): void => {
       setDialog({ ...request, opener });
     };

     const finish = (end: DialogEnd): void => {
       const opener = dialog?.opener ?? null;
       flushSync(() => {
         setDialog(null);
         if (end === 'unchanged' || end === 'signed-out') announce(UNCHANGED);
       });
       const target = opener?.isConnected === true ? opener : fallback.current;
       target?.focus();
       if (end !== 'signed-out') return;
       void signInAgain(ownId).then((outcome) => {
         if (outcome === 'same-account') target?.focus();
       });
     };

     return { dialog, open, finish };
   };

   export default useActionDialog;
   ```

10. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/action-dialog.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint`.
11. **Commit:** `feat(front): el diálogo de acción, con la contraseña a pedido y los enlaces`.

### Tarea 2.3 · Las specs de la lista paginada, en rojo (T013, L, desde S1)

**Archivos:** en `frontend/src/pages/admin/`, los stubs de `lib/use-paged-list.ts` (`LoadPage`, `PagedList` y el hook) y de `ui/ListView.tsx`, y `ui/paged-list.spec.tsx`. Los stubs son `const` tipados («Reglas», TDD): el hook, como en el ejemplo de las reglas, y `ListView`, que es genérico, como `const ListView: <Q extends { readonly page: number }, T>(props: ListViewProps<Q, T>) => ReactNode = () => { throw new Error('not implemented'); };`.

**Produce:** `usePagedList(load, initialQuery, ownId)` y `ListView` (`{ list, texts, onClear, children(items) }`).

1. **`ui/paged-list.spec.tsx`.** Cubre FR-012 a FR-014, FR-041 y FR-042 sobre un arnés mínimo:

   ```tsx
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { afterEach, describe, expect, it, vi } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import { reloadDocument } from '../../../shared/lib/reload-document';
   import usePagedList, { type LoadPage } from '../lib/use-paged-list';
   import type { AdminOutcome, ListPage } from '../model/types';
   import ListView from './ListView';

   vi.mock('../../../shared/lib/reload-document', () => ({ reloadDocument: vi.fn() }));

   interface Query {
     readonly page: number;
   }

   interface Item {
     readonly id: number;
     readonly name: string;
   }

   const TEXTS = {
     loading: 'Cargando las cuentas…',
     failed: 'No pudimos cargar las cuentas.',
     empty: 'No hay cuentas con esa búsqueda o esos filtros.',
     noun: 'cuentas',
   };
   const FIRST: Query = { page: 1 };

   function pageOf(
     items: Item[],
     page: number,
     lastPage: number,
     total: number,
   ): AdminOutcome<ListPage<Item>> {
     return { ok: true, value: { items, meta: { page, lastPage, total } } };
   }

   function failed(failure: ApiFailure): AdminOutcome<ListPage<Item>> {
     return { ok: false, failure };
   }

   const Harness = ({ load }: { readonly load: LoadPage<Query, Item> }) => {
     const list = usePagedList(load, FIRST, 1);
     return (
       <ListView list={list} texts={TEXTS} onClear={() => list.search(FIRST)}>
         {(items) => (
           <ul>
             {items.map((item) => (
               <li key={item.id}>{item.name}</li>
             ))}
           </ul>
         )}
       </ListView>
     );
   };

   function renderList(...outcomes: AdminOutcome<ListPage<Item>>[]) {
     const load = vi.fn<LoadPage<Query, Item>>();
     for (const outcome of outcomes) load.mockResolvedValueOnce(outcome);
     render(<Harness load={load} />);
     return { load, user: userEvent.setup() };
   }

   afterEach(() => vi.mocked(reloadDocument).mockClear());

   describe('a paged list', () => {
     it('says that it loads, then shows the page and where it is', async () => {
       renderList(pageOf([{ id: 1, name: 'Ana Pérez' }], 1, 3, 52));
       expect(screen.getByText('Cargando las cuentas…')).toBeInTheDocument();
       expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
       expect(screen.getByText('Página 1 de 3 · 52 cuentas')).toBeInTheDocument();
       expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
     });

     it('asks once for the last page when a later page comes back empty', async () => {
       const { load, user } = renderList(
         pageOf([{ id: 1, name: 'Ana Pérez' }], 1, 2, 26),
         pageOf([], 2, 1, 25),
         pageOf([{ id: 1, name: 'Ana Pérez' }], 1, 1, 25),
       );
       await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
       expect(await screen.findByText('Página 1 de 1 · 25 cuentas')).toBeInTheDocument();
       expect(load.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 1]);
     });

     it('offers to clear when the first page is empty', async () => {
       const { load, user } = renderList(
         pageOf([], 1, 1, 0),
         pageOf([{ id: 1, name: 'Ana Pérez' }], 1, 1, 1),
       );
       await user.click(await screen.findByRole('button', { name: 'Limpiar los filtros' }));
       expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
       expect(load).toHaveBeenCalledTimes(2);
     });

     it('says that it did not load, with the common message, and retries the same query', async () => {
       const { load, user } = renderList(
         failed({ kind: 'network' }),
         pageOf([{ id: 1, name: 'Ana Pérez' }], 1, 1, 1),
       );
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent('No pudimos cargar las cuentas.');
       expect(alert).toHaveTextContent(
         'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.',
       );
       await user.click(screen.getByRole('button', { name: 'Reintentar' }));
       expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
       expect(load.mock.calls.map(([query]) => query)).toEqual([FIRST, FIRST]);
     });

     it('does not let retry before Retry-After', async () => {
       renderList(
         failed({
           kind: 'response',
           status: 429,
           code: 'too_many_requests',
           message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
           fieldErrors: {},
           retryAfterSeconds: 30,
         }),
       );
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'Podés volver a intentar en 30 segundos.',
       );
       expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
     });

     it('offers to reload instead of retrying when the role was lost', async () => {
       const { user } = renderList(
         failed({
           kind: 'response',
           status: 403,
           code: 'forbidden',
           message: 'No tenés permiso para hacer esto.',
           fieldErrors: {},
           retryAfterSeconds: null,
         }),
       );
       await user.click(await screen.findByRole('button', { name: 'Recargar' }));
       expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
       expect(reloadDocument).toHaveBeenCalledOnce();
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/paged-list.spec.tsx`: en rojo.
3. **Commit:** `test(front): specs de la lista paginada de la administración, en rojo`.

### Tarea 2.4 · La lista paginada (T014, L)

**Archivos:** `lib/use-paged-list.ts`, `ui/ListView.tsx`, `ui/Pagination.tsx` y `ui/FilterSelect.tsx`, en `frontend/src/pages/admin/`.

1. **`lib/use-paged-list.ts`** (research.md, R7):
   - mientras llega la página nueva, `page` sigue siendo la anterior, así que las filas no se desmontan;
   - cada `search` usa un objeto nuevo, para que siempre pida.

   ```ts
   import { useCallback, useEffect, useState } from 'react';
   import type { ApiFailure } from '../../../shared/api/http';
   import { useRetryCountdown } from '../../../shared/ui/form';
   import type { AdminOutcome, ListPage } from '../model/types';
   import { recoverSession } from './recover-session';

   export type LoadPage<Q, T> = (query: Q, signal: AbortSignal) => Promise<AdminOutcome<ListPage<T>>>;

   export interface PagedList<Q, T> {
     readonly query: Q;
     readonly page: ListPage<T> | null;
     readonly failure: ApiFailure | null;
     readonly loading: boolean;
     readonly waiting: boolean;
     search(query: Q): void;
     reload(): void;
     replace(item: T): void;
     remove(id: number): void;
   }

   interface Settled<Q, T> {
     readonly query: Q;
     readonly attempt: number;
     readonly outcome: AdminOutcome<ListPage<T>>;
   }

   interface Paged {
     readonly page: number;
   }

   interface Identified {
     readonly id: number;
   }

   function pastTheEnd(page: ListPage<unknown>, requested: number): boolean {
     return page.items.length === 0 && requested > 1 && page.meta.lastPage < requested;
   }

   function withItems<Q, T>(
     settled: Settled<Q, T> | null,
     change: (items: readonly T[]) => readonly T[],
   ) {
     if (settled === null || !settled.outcome.ok) return settled;
     const page = settled.outcome.value;
     return {
       ...settled,
       outcome: { ok: true as const, value: { ...page, items: change(page.items) } },
     };
   }

   const usePagedList = <Q extends Paged, T extends Identified>(
     load: LoadPage<Q, T>,
     initialQuery: Q,
     ownId: number,
   ): PagedList<Q, T> => {
     const [query, setQuery] = useState(initialQuery);
     const [attempt, setAttempt] = useState(0);
     const [settled, setSettled] = useState<Settled<Q, T> | null>(null);
     const { waiting, start } = useRetryCountdown();

     useEffect(() => {
       const controller = new AbortController();
       void load(query, controller.signal).then((outcome) => {
         if (controller.signal.aborted) return;
         if (outcome.ok && pastTheEnd(outcome.value, query.page)) {
           setQuery({ ...query, page: outcome.value.meta.lastPage });
           return;
         }
         setSettled({ query, attempt, outcome });
         if (outcome.ok || recoverSession(outcome.failure, ownId)) return;
         const { failure } = outcome;
         if (failure.kind === 'response' && failure.retryAfterSeconds !== null)
           start(failure.retryAfterSeconds);
       });
       return () => controller.abort();
     }, [load, query, attempt, ownId, start]);

     const replace = useCallback((item: T) => {
       setSettled((current) =>
         withItems(current, (items) => items.map((each) => (each.id === item.id ? item : each))),
       );
     }, []);
     const remove = useCallback((id: number) => {
       setSettled((current) => withItems(current, (items) => items.filter((each) => each.id !== id)));
     }, []);

     const current = settled !== null && settled.query === query && settled.attempt === attempt;
     const outcome = settled?.outcome ?? null;
     return {
       query,
       page: outcome !== null && outcome.ok ? outcome.value : null,
       failure: current && outcome !== null && !outcome.ok ? outcome.failure : null,
       loading: !current,
       waiting,
       search: (next) => setQuery({ ...next }),
       reload: () => setAttempt((count) => count + 1),
       replace,
       remove,
     };
   };

   export default usePagedList;
   ```

2. **`ui/ListView.tsx`:**

   ```tsx
   import type { ReactNode } from 'react';
   import type { PagedList } from '../lib/use-paged-list';
   import { reactionTo } from '../model/react-to-failure';
   import FailureNotice from './FailureNotice';
   import Pagination from './Pagination';

   export interface ListTexts {
     readonly loading: string;
     readonly failed: string;
     readonly empty: string;
     readonly noun: string;
   }

   interface ListViewProps<Q extends { readonly page: number }, T> {
     readonly list: PagedList<Q, T>;
     readonly texts: ListTexts;
     onClear(): void;
     children(items: readonly T[]): ReactNode;
   }

   const ListView = <Q extends { readonly page: number }, T>({
     list,
     texts,
     onClear,
     children,
   }: ListViewProps<Q, T>) => {
     if (list.failure !== null) {
       const reaction = reactionTo(list.failure, texts.failed);
       return (
         <FailureNotice
           failure={reaction.kind === 'show' ? reaction.description : null}
           lead={texts.failed}
           takeFocus={false}
         >
           <button
             type="button"
             className="button secondary"
             disabled={list.waiting}
             onClick={list.reload}
           >
             Reintentar
           </button>
         </FailureNotice>
       );
     }
     if (list.page === null) return <p>{texts.loading}</p>;
     if (list.page.items.length === 0) {
       return (
         <div className="admin-empty">
           <p>{texts.empty}</p>
           <button type="button" className="button secondary" onClick={onClear}>
             Limpiar los filtros
           </button>
         </div>
       );
     }
     return (
       <>
         {children(list.page.items)}
         <Pagination
           meta={list.page.meta}
           noun={texts.noun}
           onPage={(page) => list.search({ ...list.query, page })}
         />
       </>
     );
   };

   export default ListView;
   ```

3. **`ui/Pagination.tsx`:**

   ```tsx
   import type { PageMeta } from '../model/types';

   interface PaginationProps {
     readonly meta: PageMeta;
     readonly noun: string;
     onPage(page: number): void;
   }

   const Pagination = ({ meta, noun, onPage }: PaginationProps) => (
     <nav className="admin-pagination" aria-label={`Páginas de ${noun}`}>
       <button
         type="button"
         className="button secondary small"
         disabled={meta.page <= 1}
         onClick={() => onPage(meta.page - 1)}
       >
         Anterior
       </button>
       <span>
         Página {meta.page} de {meta.lastPage} · {meta.total} {noun}
       </span>
       <button
         type="button"
         className="button secondary small"
         disabled={meta.page >= meta.lastPage}
         onClick={() => onPage(meta.page + 1)}
       >
         Siguiente
       </button>
     </nav>
   );

   export default Pagination;
   ```

4. **`ui/FilterSelect.tsx`.** El valor elegido se busca entre las opciones, sin `as`:

   ```tsx
   import { useId } from 'react';

   export interface FilterOption<V extends string> {
     readonly value: V;
     readonly label: string;
   }

   interface FilterSelectProps<V extends string> {
     readonly label: string;
     readonly value: V;
     readonly options: readonly FilterOption<V>[];
     onChange(value: V): void;
   }

   const FilterSelect = <V extends string>({
     label,
     value,
     options,
     onChange,
   }: FilterSelectProps<V>) => {
     const id = useId();
     const choose = (chosen: string): void => {
       const option = options.find((candidate) => candidate.value === chosen);
       if (option !== undefined) onChange(option.value);
     };
     return (
       <div className="form-field">
         <label className="field-label" htmlFor={id}>
           {label}
         </label>
         <select
           id={id}
           className="form-input"
           value={value}
           onChange={(event) => choose(event.target.value)}
         >
           {options.map((option) => (
             <option key={option.value} value={option.value}>
               {option.label}
             </option>
           ))}
         </select>
       </div>
     );
   };

   export default FilterSelect;
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/paged-list.spec.tsx`, en verde, y después `npm run typecheck` y `npm run lint` (`usePagedList` queda en 10 de complejidad).
6. **Commit:** `feat(front): la lista paginada de la administración`.

### Tarea 2.5 · Las specs de «Cuentas», en rojo (T015, L, desde S2)

**Archivos:** el stub de `frontend/src/pages/admin/ui/AccountsSection.tsx` (`const AccountsSection: FunctionComponent<AccountsSectionProps> = () => { throw new Error('not implemented'); };`, con `AccountsSectionProps` = `{ ownId }`) y `accounts-section.spec.tsx`.

1. **`accounts-section.spec.tsx`.** Cubre las historias 3 y 4 y la historia 5 en sus escenarios 4 y 5:

   ```tsx
   import { act, screen, within } from '@testing-library/react';
   import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { accessRequests } from '../../../features/sign-in';
   import { reloadDocument } from '../../../shared/lib/reload-document';
   import { adminUserBodyFactory, pageBody } from '../model/admin.factory';
   import AccountsSection from './AccountsSection';
   import { OLGA, renderAdmin, signInAs, stubDialogs } from './render-admin';

   vi.mock('../../../shared/lib/reload-document', () => ({ reloadDocument: vi.fn() }));

   const ANA = adminUserBodyFactory.build({ id: 12, name: 'Ana Pérez', email: 'ana@x.com' });
   const BETO = adminUserBodyFactory.build({ id: 13, name: 'Beto Gómez', role: 'admin' });
   const OWN = adminUserBodyFactory.build({
     id: OLGA.id,
     name: OLGA.name,
     email: OLGA.email,
     role: 'admin',
   });
   const LEAVING = adminUserBodyFactory.build({ id: 14, name: 'Carla Díaz', status: 'deleting' });
   const UNVERIFIED = adminUserBodyFactory.build({ id: 15, name: 'Dani Paz', emailVerified: false });
   const LAST_ADMIN = { message: 'Tiene que quedar al menos un admin activo.', code: 'last_admin' };
   const NOT_JSON = { status: 502, text: '<html>Bad Gateway</html>' } as const;

   function queryOf(path: string | undefined): Record<string, string> {
     return Object.fromEntries(new URL(path ?? '', 'http://taller').searchParams);
   }

   function renderSection(replies: Parameters<typeof renderAdmin>[1]) {
     return renderAdmin(<AccountsSection ownId={OLGA.id} />, replies);
   }

   beforeAll(stubDialogs);
   beforeEach(() => signInAs());
   afterEach(() => {
     vi.mocked(reloadDocument).mockClear();
     act(() => accessRequests.finish(OLGA));
   });

   describe('the list of accounts', () => {
     it('marks the own account and offers nothing on it nor on one being deleted', async () => {
       renderSection([{ status: 200, json: pageBody([OWN, ANA, LEAVING, UNVERIFIED]) }]);
       const table = await screen.findByRole('table', { name: 'Cuentas del taller, por nombre' });
       const own = within(table).getByRole('row', { name: /Olga Ruiz \(vos\)/ });
       expect(within(own).queryByRole('group', { name: /^Acciones sobre/ })).toBeNull();
       const leaving = within(table).getByRole('row', { name: /Carla Díaz/ });
       expect(leaving).toHaveTextContent('Borrándose');
       expect(within(leaving).queryByRole('group', { name: /^Acciones sobre/ })).toBeNull();
       expect(within(table).getByRole('row', { name: /Dani Paz/ })).toHaveTextContent('Sin verificar');
       const ana = within(table).getByRole('row', { name: /Ana Pérez/ });
       expect(
         within(within(ana).getByRole('group', { name: 'Acciones sobre Ana Pérez' }))
           .getAllByRole('button')
           .map((button) => button.textContent),
       ).toEqual([
         'Deshabilitar a Ana Pérez',
         'Hacer admin a Ana Pérez',
         'Borrar la cuenta de Ana Pérez',
       ]);
     });

     it('asks nothing while typing and asks once when the search is sent', async () => {
       const { user, calls } = renderSection([{ status: 200, json: pageBody([ANA]) }]);
       await screen.findByRole('table');
       await user.type(screen.getByLabelText('Buscar por nombre o email'), 'ana');
       expect(calls).toHaveLength(1);
       await user.click(screen.getByRole('button', { name: 'Buscar' }));
       await vi.waitFor(() => expect(calls).toHaveLength(2));
       expect(queryOf(calls[1]?.path)).toEqual({ page: '1', perPage: '25', q: 'ana' });
     });

     it('goes back to the first page when a filter changes', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA], 1, 2, 30) },
         { status: 200, json: pageBody([BETO], 2, 2, 30) },
         { status: 200, json: pageBody([BETO]) },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
       await screen.findByText('Página 2 de 2 · 30 cuentas');
       await user.selectOptions(screen.getByLabelText('Rol'), 'admin');
       await vi.waitFor(() => expect(calls).toHaveLength(3));
       expect(queryOf(calls[2]?.path)).toEqual({ page: '1', perPage: '25', role: 'admin' });
     });

     it('says when nothing matches and clears the search and the filters', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         { status: 200, json: pageBody([]) },
         { status: 200, json: pageBody([ANA]) },
       ]);
       await screen.findByRole('table');
       await user.type(screen.getByLabelText('Buscar por nombre o email'), 'zzz');
       await user.click(screen.getByRole('button', { name: 'Buscar' }));
       await user.click(await screen.findByRole('button', { name: 'Limpiar los filtros' }));
       await screen.findByRole('table');
       expect(screen.getByLabelText('Buscar por nombre o email')).toHaveValue('');
       expect(queryOf(calls[2]?.path)).toEqual({ page: '1', perPage: '25' });
     });

     it('keeps the search when the list does not load and asks again with it', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         NOT_JSON,
         { status: 200, json: pageBody([ANA]) },
       ]);
       await screen.findByRole('table');
       await user.type(screen.getByLabelText('Buscar por nombre o email'), 'ana');
       await user.click(screen.getByRole('button', { name: 'Buscar' }));
       expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las cuentas.');
       expect(screen.getByRole('alert')).toHaveTextContent(
         'El taller no respondió como esperábamos. Probá de nuevo en un rato.',
       );
       await user.click(screen.getByRole('button', { name: 'Reintentar' }));
       await screen.findByRole('table');
       expect(queryOf(calls[2]?.path).q).toBe('ana');
       expect(screen.getByLabelText('Buscar por nombre o email')).toHaveValue('ana');
     });
   });

   describe('the actions on an account', () => {
     it('disables after the confirmation, updates the row, announces it and gives the focus back', async () => {
       const disabled = { ...ANA, status: 'disabled' };
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         { status: 200, json: { data: disabled } },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Deshabilitar a Ana Pérez' }));
       const dialog = screen.getByRole('dialog', { name: '¿Deshabilitar la cuenta de Ana Pérez?' });
       expect(calls).toHaveLength(1);
       await user.click(within(dialog).getByRole('button', { name: 'Deshabilitar' }));
       expect(calls[1]).toMatchObject({
         method: 'PATCH',
         path: '/api/admin/users/12',
         body: { status: 'disabled' },
       });
       expect(calls[1]?.headers['x-taller-user']).toBe('1');
       expect(screen.queryByRole('dialog')).toBeNull();
       expect(screen.getByRole('row', { name: /Ana Pérez/ })).toHaveTextContent('Deshabilitada');
       expect(screen.getByRole('status')).toHaveTextContent(
         'La cuenta de Ana Pérez quedó deshabilitada.',
       );
       expect(screen.getByRole('button', { name: 'Rehabilitar a Ana Pérez' })).toHaveFocus();
     });

     it('keeps the row and asks for the page again when the server protects the last admin', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([BETO]) },
         { status: 409, json: LAST_ADMIN },
         { status: 200, json: pageBody([BETO]) },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Quitar admin a Beto Gómez' }));
       await user.click(screen.getByRole('button', { name: 'Quitar admin' }));
       const dialog = screen.getByRole('dialog', { name: '¿Quitarle el rol de admin a Beto Gómez?' });
       expect(within(dialog).getByRole('alert')).toHaveTextContent(LAST_ADMIN.message);
       await vi.waitFor(() => expect(calls).toHaveLength(3));
       expect(calls[2]?.method).toBe('GET');
       expect(screen.getByRole('row', { name: /Beto Gómez/ })).toHaveTextContent('Admin');
     });

     it('deletes only after the box is checked and leaves the row in «Borrándose» without actions', async () => {
       const message =
         'Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         { status: 202, json: { data: { id: 12, status: 'deleting' }, message } },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Borrar la cuenta de Ana Pérez' }));
       const confirm = screen.getByRole('button', { name: 'Borrar la cuenta' });
       expect(confirm).toBeDisabled();
       await user.click(screen.getByRole('checkbox', { name: 'Entiendo que no se puede deshacer.' }));
       await user.click(confirm);
       expect(calls[1]).toMatchObject({ method: 'DELETE', path: '/api/admin/users/12' });
       const row = screen.getByRole('row', { name: /Ana Pérez/ });
       expect(row).toHaveTextContent('Borrándose');
       expect(within(row).queryByRole('group', { name: /^Acciones sobre/ })).toBeNull();
       expect(screen.getByRole('status')).toHaveTextContent(message);
       expect(screen.getByRole('heading', { name: 'Cuentas del taller, por nombre' })).toHaveFocus();
     });

     it('closes the confirmation without changes and asks to sign in again on a 401', async () => {
       const { user } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         { status: 401, json: { message: 'Iniciá sesión para continuar.', code: 'unauthenticated' } },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Deshabilitar a Ana Pérez' }));
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       expect(screen.queryByRole('dialog')).toBeNull();
       expect(screen.getByRole('status')).toHaveTextContent('No se hizo ningún cambio.');
       expect(accessRequests.current()).toMatchObject({ presentation: 'dialog', reason: 'expired' });
       await act(async () => accessRequests.finish(OLGA));
       expect(reloadDocument).not.toHaveBeenCalled();
       expect(screen.getByRole('button', { name: 'Deshabilitar a Ana Pérez' })).toHaveFocus();
     });

     it('explains a lost role, offers to reload and does not retry', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         { status: 403, json: { message: 'No tenés permiso para hacer esto.', code: 'forbidden' } },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Deshabilitar a Ana Pérez' }));
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       const alert = screen.getByRole('alert');
       expect(alert).toHaveTextContent('No tenés permiso para hacer esto.');
       expect(alert).toHaveTextContent(
         'Puede que tu cuenta ya no tenga el rol de admin. Recargá la página.',
       );
       expect(screen.queryByRole('button', { name: 'Deshabilitar' })).toBeNull();
       await user.click(within(alert).getByRole('button', { name: 'Recargar' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
       expect(calls).toHaveLength(2);
     });

     it('waits for Retry-After before letting the action be sent again', async () => {
       const { user } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         {
           status: 429,
           headers: { 'Retry-After': '30' },
           json: {
             message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
             code: 'too_many_requests',
           },
         },
       ]);
       await user.click(await screen.findByRole('button', { name: 'Deshabilitar a Ana Pérez' }));
       await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
       expect(screen.getByRole('alert')).toHaveTextContent('Podés volver a intentar en 30 segundos.');
       expect(screen.getByRole('button', { name: 'Deshabilitar' })).toBeDisabled();
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/accounts-section.spec.tsx`: en rojo.
3. **Commit:** `test(front): specs de las cuentas de la administración, en rojo`.

### Tarea 2.6 · «Cuentas» (T016, L)

**Archivos:** `ui/AccountsTable.tsx` y `ui/AccountsSection.tsx`, en `frontend/src/pages/admin/`.

1. **`ui/AccountsTable.tsx`.** La región se desplaza con el teclado (`tabIndex={0}`), los botones tienen lugares fijos (`ACTION_SLOTS`) y van en un grupo «Acciones sobre {nombre}» que se dibuja sólo si la fila tiene acciones:

   ```tsx
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import { ROLE_LABELS, STATUS_LABELS } from '../model/labels';
   import type { AdminUser } from '../model/types';
   import { ACTION_SLOTS, actionsFor, userActionTexts, type UserAction } from '../model/user-actions';

   interface AccountsTableProps {
     readonly titleId: string;
     readonly users: readonly AdminUser[];
     readonly ownId: number;
     readonly busy: boolean;
     onAction(action: UserAction, user: AdminUser, opener: HTMLButtonElement): void;
   }

   const AccountsTable = ({ titleId, users, ownId, busy, onAction }: AccountsTableProps) => (
     <div
       className="admin-table-scroll"
       role="region"
       tabIndex={0}
       aria-labelledby={titleId}
       aria-busy={busy}
     >
       <table aria-labelledby={titleId}>
         <thead>
           <tr>
             <th scope="col">Nombre</th>
             <th scope="col">Email</th>
             <th scope="col">Rol</th>
             <th scope="col">Estado</th>
             <th scope="col">Alta</th>
             <th scope="col">Acciones</th>
           </tr>
         </thead>
         <tbody>
           {users.map((user) => {
             const actions = actionsFor(user, ownId);
             return (
               <tr key={user.id}>
                 <th scope="row">
                   {user.name}
                   {user.id === ownId ? ' (vos)' : null}
                 </th>
                 <td>
                   {user.email}
                   {user.emailVerified ? null : <span className="admin-mark">Sin verificar</span>}
                 </td>
                 <td>{ROLE_LABELS[user.role]}</td>
                 <td>{STATUS_LABELS[user.status]}</td>
                 <td>{formatLocalDateTime(user.createdAt)}</td>
                 <td>
                   {actions.length === 0 ? null : (
                     <div
                       className="admin-row-actions"
                       role="group"
                       aria-label={`Acciones sobre ${user.name}`}
                     >
                       {actions.map((action, index) => (
                         <button
                           key={ACTION_SLOTS[index]}
                           type="button"
                           className="button secondary small"
                           onClick={(event) => onAction(action, user, event.currentTarget)}
                         >
                           {userActionTexts(action, user).button}
                         </button>
                       ))}
                     </div>
                   )}
                 </td>
               </tr>
             );
           })}
         </tbody>
       </table>
     </div>
   );

   export default AccountsTable;
   ```

2. **`ui/AccountsSection.tsx`.** La búsqueda sale sólo al enviarla (FR-010), y los filtros, al cambiar (FR-011):

   ```tsx
   import { useCallback, useId, useRef, useState } from 'react';
   import { useForm } from 'react-hook-form';
   import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   import { TextField, messagesOf } from '../../../shared/ui/form';
   import { changeUser, deleteUser, listUsers } from '../api/admin-endpoints';
   import usePagedList from '../lib/use-paged-list';
   import { ROLE_FILTER, STATUS_FILTER } from '../model/labels';
   import { ACCOUNT_GONE, staleList } from '../model/react-to-failure';
   import type { ActionResult, AdminUser, UserQuery } from '../model/types';
   import {
     DELETE_ACKNOWLEDGEMENT,
     changeFor,
     userActionTexts,
     type UserAction,
   } from '../model/user-actions';
   import AccountsTable from './AccountsTable';
   import ActionDialog from './ActionDialog';
   import FilterSelect from './FilterSelect';
   import ListView, { type ListTexts } from './ListView';
   import useActionDialog from './use-action-dialog';

   interface AccountsSectionProps {
     readonly ownId: number;
   }

   interface SearchValues {
     q: string;
   }

   const EVERY_ACCOUNT: UserQuery = { page: 1, q: '', role: '', status: '' };
   const SEARCH_TOO_LONG = 'La búsqueda puede tener hasta 80 caracteres.';
   const DONE: ActionResult = { kind: 'done' };
   const TEXTS: ListTexts = {
     loading: 'Cargando las cuentas…',
     failed: 'No pudimos cargar las cuentas.',
     empty: 'No hay cuentas con esa búsqueda o esos filtros.',
     noun: 'cuentas',
   };

   const AccountsSection = ({ ownId }: AccountsSectionProps) => {
     const client = useApiClient();
     const titleId = useId();
     const title = useRef<HTMLHeadingElement>(null);
     const [notice, setNotice] = useState('');
     const load = useCallback(
       (query: UserQuery, signal: AbortSignal) => listUsers(client, query, signal),
       [client],
     );
     const list = usePagedList(load, EVERY_ACCOUNT, ownId);
     const actions = useActionDialog(ownId, title, setNotice);
     const {
       register,
       handleSubmit,
       reset,
       formState: { errors },
     } = useForm<SearchValues>({ defaultValues: { q: '' } });

     const failed = (failure: ApiFailure): ActionResult => {
       if (staleList(failure)) list.reload();
       return { kind: 'failed', failure };
     };

     const perform = async (
       action: UserAction,
       user: AdminUser,
       done: string,
     ): Promise<ActionResult> => {
       if (action === 'delete') {
         const outcome = await deleteUser(client, ownId, user.id);
         if (!outcome.ok) return failed(outcome.failure);
         list.replace({ ...user, status: outcome.value.status });
         setNotice(outcome.value.message);
         return DONE;
       }
       const outcome = await changeUser(client, ownId, user.id, changeFor(action));
       if (!outcome.ok) return failed(outcome.failure);
       list.replace(outcome.value);
       setNotice(done);
       return DONE;
     };

     const confirm = (action: UserAction, user: AdminUser, opener: HTMLButtonElement): void => {
       const texts = userActionTexts(action, user);
       const acknowledgement = action === 'delete' ? DELETE_ACKNOWLEDGEMENT : undefined;
       const confirmation = {
         body: texts.body,
         confirmLabel: texts.confirm,
         pendingLabel: texts.pending,
         acknowledgement,
       };
       actions.open(
         {
           start: { kind: 'confirm', title: texts.title, confirmation },
           notFoundMessage: ACCOUNT_GONE,
           send: () => perform(action, user, texts.done),
         },
         opener,
       );
     };

     const clear = (): void => {
       reset();
       list.search(EVERY_ACCOUNT);
     };

     return (
       <div className="admin-section">
         <form
           className="admin-filters"
           role="search"
           noValidate
           onSubmit={handleSubmit(({ q }) => list.search({ ...list.query, q, page: 1 }))}
         >
           <TextField
             label="Buscar por nombre o email"
             autoComplete="off"
             registration={register('q', { maxLength: { value: 80, message: SEARCH_TOO_LONG } })}
             messages={messagesOf(errors.q)}
           />
           <button type="submit" className="button secondary">
             Buscar
           </button>
         </form>
         <div className="admin-filters">
           <FilterSelect
             label="Rol"
             value={list.query.role}
             options={ROLE_FILTER}
             onChange={(role) => list.search({ ...list.query, role, page: 1 })}
           />
           <FilterSelect
             label="Estado"
             value={list.query.status}
             options={STATUS_FILTER}
             onChange={(status) => list.search({ ...list.query, status, page: 1 })}
           />
         </div>
         <p className="admin-notice" role="status">
           {notice}
         </p>
         <h3 id={titleId} ref={title} tabIndex={-1}>
           Cuentas del taller, por nombre
         </h3>
         <ListView list={list} texts={TEXTS} onClear={clear}>
           {(users) => (
             <AccountsTable
               titleId={titleId}
               users={users}
               ownId={ownId}
               busy={list.loading}
               onAction={confirm}
             />
           )}
         </ListView>
         {actions.dialog === null ? null : (
           <ActionDialog
             adminId={ownId}
             start={actions.dialog.start}
             notFoundMessage={actions.dialog.notFoundMessage}
             send={actions.dialog.send}
             onFinish={actions.finish}
           />
         )}
       </div>
     );
   };

   export default AccountsSection;
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde, y después `npm run typecheck` y `npm run lint`.
4. **Commit:** `feat(front): las cuentas de la administración, con sus acciones`.

### Tarea 2.7 · Las specs de «Invitaciones», en rojo (T017, I, desde S2)

**Archivos:** el stub de `frontend/src/pages/admin/ui/InvitationsSection.tsx` (`const InvitationsSection: FunctionComponent<InvitationsSectionProps> = () => { throw new Error('not implemented'); };`, con `InvitationsSectionProps` = `{ ownId }`) e `invitations-section.spec.tsx`.

1. **`invitations-section.spec.tsx`.** Cubre las historias 1 (escenarios 1, 2, 4, 5 y 7) y 2:

   ```tsx
   import { screen, within } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { adminInvitationBodyFactory, pageBody } from '../model/admin.factory';
   import InvitationsSection from './InvitationsSection';
   import { OLGA, pathsOf, renderAdmin, signInAs, stubDialogs } from './render-admin';

   const PENDING_ADMIN = adminInvitationBodyFactory.build({
     id: 7,
     email: 'root@x.com',
     role: 'admin',
   });
   const FROM_CONSOLE = adminInvitationBodyFactory.build({
     id: 8,
     email: 'beto@x.com',
     invitedBy: null,
   });
   const EXPIRED = adminInvitationBodyFactory.build({ id: 9, email: 'carla@x.com', expired: true });
   const LOCKED = {
     message: 'Confirmá tu contraseña para continuar.',
     code: 'password_confirmation_required',
   };
   const CREATED = {
     email: 'beto@x.com',
     result: 'created',
     expiresAt: '2026-10-12T12:00:00.000Z',
     url: 'http://localhost:8080/#invitacion=b',
   };

   function inviteForm() {
     return within(screen.getByRole('form', { name: 'Invitar' }));
   }

   function renderSection(replies: Parameters<typeof renderAdmin>[1]) {
     return renderAdmin(<InvitationsSection ownId={OLGA.id} />, replies);
   }

   beforeAll(stubDialogs);
   beforeEach(() => signInAs());

   describe('the list of invitations', () => {
     it('marks a pending admin invitation in text, an expired one and one from the console', async () => {
       renderSection([{ status: 200, json: pageBody([PENDING_ADMIN, FROM_CONSOLE, EXPIRED]) }]);
       const table = await screen.findByRole('table', { name: 'Invitaciones' });
       expect(within(table).getByRole('row', { name: /root@x\.com/ })).toHaveTextContent(
         'Admin pendiente',
       );
       expect(within(table).getByRole('row', { name: /beto@x\.com/ })).toHaveTextContent(
         'Consola o cuenta borrada',
       );
       expect(within(table).getByRole('row', { name: /carla@x\.com/ })).toHaveTextContent('Vencida');
     });

     it('revokes after the confirmation, drops the row and puts the focus on the title of the table', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([FROM_CONSOLE]) },
         { status: 204 },
         { status: 200, json: pageBody([]) },
       ]);
       await user.click(
         await screen.findByRole('button', { name: 'Revocar la invitación de beto@x.com' }),
       );
       await user.click(screen.getByRole('button', { name: 'Revocar' }));
       expect(calls[1]).toMatchObject({ method: 'DELETE', path: '/api/admin/invitations/8' });
       expect(screen.queryByRole('row', { name: /beto@x\.com/ })).toBeNull();
       expect(screen.getByRole('heading', { name: 'Invitaciones' })).toHaveFocus();
       expect(screen.getByRole('status')).toHaveTextContent('Revocamos la invitación de beto@x.com.');
       await vi.waitFor(() => expect(calls).toHaveLength(3));
     });

     it('says that an invitation is gone and asks for the list again on a 404', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([FROM_CONSOLE]) },
         { status: 404, json: { message: 'No existe lo que pedís.', code: 'not_found' } },
         { status: 200, json: pageBody([]) },
       ]);
       await user.click(
         await screen.findByRole('button', { name: 'Reenviar la invitación de beto@x.com' }),
       );
       await user.click(screen.getByRole('button', { name: 'Generar el enlace' }));
       expect(screen.getByRole('alert')).toHaveTextContent(
         'Esa invitación ya no existe: puede que la hayan aceptado o revocado.',
       );
       await vi.waitFor(() => expect(pathsOf(calls)[2]).toMatch(/^GET \/api\/admin\/invitations\?/));
     });

     it('shows the new link once after resending and asks for the list again', async () => {
       const data = {
         id: 8,
         email: 'beto@x.com',
         role: 'student',
         delivery: 'link',
         expiresAt: CREATED.expiresAt,
         url: CREATED.url,
       };
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([FROM_CONSOLE]) },
         { status: 200, json: { data } },
         { status: 200, json: pageBody([FROM_CONSOLE]) },
       ]);
       await user.click(
         await screen.findByRole('button', { name: 'Reenviar la invitación de beto@x.com' }),
       );
       await user.click(screen.getByRole('button', { name: 'Generar el enlace' }));
       expect(calls[1]).toMatchObject({
         path: '/api/admin/invitations/8/resend',
         body: { delivery: 'link' },
       });
       expect(screen.getByRole('dialog', { name: 'Resultado' })).toHaveTextContent(
         'Enlace nuevo. Vence el',
       );
       expect(screen.getByRole('textbox', { name: 'Enlace de beto@x.com' })).toHaveValue(CREATED.url);
       await vi.waitFor(() => expect(calls).toHaveLength(3));
     });
   });

   describe('inviting', () => {
     it('says that there is no mail yet and how to recover an account, and offers no mail delivery', async () => {
       renderSection([{ status: 200, json: pageBody([]) }]);
       expect(
         screen.getByText(
           'El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.',
         ),
       ).toBeInTheDocument();
       expect(
         screen.getByText(
           'Para recuperar el acceso de alguien, generá el enlace con la consola del taller (taller:password-reset-link).',
         ),
       ).toBeInTheDocument();
       expect(screen.queryByText('Por correo')).toBeNull();
     });

     it('sends nothing without emails or with more than a hundred', async () => {
       const { user, calls } = renderSection([{ status: 200, json: pageBody([]) }]);
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       expect(screen.getByText('Indicá al menos un email para invitar.')).toBeInTheDocument();
       const field = screen.getByLabelText('Emails');
       await user.click(field);
       await user.paste(Array.from({ length: 101 }, (_, index) => `u${index}@x.com`).join('\n'));
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       expect(screen.getByText('Se pueden invitar hasta 100 emails por pedido.')).toBeInTheDocument();
       expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0);
     });

     it('puts the message of a repeated email after the email sent in its position', async () => {
       const { user } = renderSection([
         { status: 200, json: pageBody([]) },
         {
           status: 422,
           json: {
             message: 'Hay datos que corregir.',
             code: 'validation_failed',
             errors: { 'emails.1': ['Este email está repetido en el pedido.'] },
           },
         },
       ]);
       await user.type(screen.getByLabelText('Emails'), 'Ana@X.com{Enter}ana@x.com');
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       const field = screen.getByLabelText('Emails');
       expect(
         await screen.findByText('ana@x.com: Este email está repetido en el pedido.'),
       ).toBeInTheDocument();
       expect(field).toHaveAttribute('aria-invalid', 'true');
       expect(field).toHaveFocus();
     });

     it('sends the emails in order with the role and shows one result per email', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([]) },
         { status: 200, json: { data: [{ email: 'ana@x.com', result: 'user_exists' }, CREATED] } },
         { status: 200, json: pageBody([]) },
       ]);
       await user.type(screen.getByLabelText('Emails'), 'ana@x.com, beto@x.com');
       await user.selectOptions(inviteForm().getByLabelText('Rol'), 'admin');
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       expect(calls[1]).toMatchObject({
         method: 'POST',
         path: '/api/admin/invitations',
         body: { emails: ['ana@x.com', 'beto@x.com'], role: 'admin', delivery: 'link' },
       });
       const result = screen.getByRole('dialog', { name: 'Resultado' });
       expect(result).toHaveTextContent('ana@x.com · Ya tiene una cuenta.');
       expect(result).toHaveTextContent('beto@x.com · Invitación creada. Vence el');
       expect(result).toHaveTextContent('Copiá los enlaces ahora: no se vuelven a mostrar.');
     });

     it('asks for the password on a 423 and sends the batch again exactly once', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([]) },
         { status: 423, json: LOCKED },
         { status: 201, json: {} },
         { status: 200, json: { data: [CREATED] } },
         { status: 200, json: pageBody([]) },
       ]);
       await user.type(screen.getByLabelText('Emails'), 'beto@x.com');
       await user.selectOptions(inviteForm().getByLabelText('Rol'), 'admin');
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       await user.type(screen.getByLabelText('Tu contraseña'), 'una frase larga para el taller');
       await user.click(screen.getByRole('button', { name: 'Confirmar' }));
       expect(await screen.findByRole('dialog', { name: 'Resultado' })).toBeInTheDocument();
       expect(pathsOf(calls).filter((call) => call === 'POST /api/admin/invitations')).toHaveLength(2);
     });

     it('keeps the emails and shows the common message when the network fails', async () => {
       const { user } = renderSection([{ status: 200, json: pageBody([]) }, 'network-error']);
       await user.type(screen.getByLabelText('Emails'), 'beto@x.com');
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.',
       );
       expect(screen.getByLabelText('Emails')).toHaveValue('beto@x.com');
       expect(screen.getByRole('button', { name: 'Crear las invitaciones' })).toBeEnabled();
     });
   });
   ```

2. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/invitations-section.spec.tsx`: en rojo.
3. **Commit:** `test(front): specs de las invitaciones de la administración, en rojo`.

### Tarea 2.8 · «Invitaciones» (T018, I)

**Archivos:** `ui/EmailsField.tsx`, `ui/InviteForm.tsx`, `ui/InvitationsTable.tsx` y `ui/InvitationsSection.tsx`, en `frontend/src/pages/admin/`.

1. **`ui/EmailsField.tsx`.** `TextField` de F11a dibuja sólo un `<input>`, y los emails necesitan un `<textarea>` de 16 px:

   ```tsx
   import { useId } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';

   interface EmailsFieldProps {
     readonly registration: UseFormRegisterReturn;
     readonly messages: readonly string[];
   }

   const EmailsField = ({ registration, messages }: EmailsFieldProps) => {
     const id = useId();
     const invalid = messages.length > 0;
     return (
       <div className="form-field">
         <label className="field-label" htmlFor={id}>
           Emails
         </label>
         <textarea
           id={id}
           className="form-input admin-emails"
           rows={6}
           aria-invalid={invalid || undefined}
           aria-describedby={invalid ? `${id}-hint ${id}-errors` : `${id}-hint`}
           {...registration}
         />
         <p id={`${id}-hint`} className="form-hint">
           Uno por línea. Hasta 100 por vez.
         </p>
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

   export default EmailsField;
   ```

2. **`ui/InviteForm.tsx`.** Los errores de `emails` y `emails.<n>` van al campo, cada uno con el email enviado en su posición (FR-027):

   ```tsx
   import { useId, useRef } from 'react';
   import { useForm } from 'react-hook-form';
   import type { AccountRole } from '../../../entities/session';
   import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   import { reloadDocument } from '../../../shared/lib/reload-document';
   import {
     ServerError,
     messagesOf,
     showFailure,
     useGuardedSubmit,
     useRetryCountdown,
   } from '../../../shared/ui/form';
   import { invite } from '../api/admin-endpoints';
   import { checkEmailCount, emailMessages, isEmailsField, splitEmails } from '../model/emails';
   import { needsPassword, reactionTo } from '../model/react-to-failure';
   import type { AdminOutcome, InviteEntry } from '../model/types';
   import EmailsField from './EmailsField';

   interface InviteValues {
     emails: string;
     role: AccountRole;
   }

   export type SendInvitations = () => Promise<AdminOutcome<readonly InviteEntry[]>>;

   interface InviteFormProps {
     readonly adminId: number;
     onInvited(entries: readonly InviteEntry[], opener: HTMLElement | null): void;
     onPasswordRequired(retry: SendInvitations, opener: HTMLElement | null): void;
     onSignedOut(): void;
   }

   const VISIBLE_FIELDS = ['emails'] as const;

   function emailFieldsOf(failure: ApiFailure): string[] {
     return failure.kind === 'response' ? Object.keys(failure.fieldErrors).filter(isEmailsField) : [];
   }

   const InviteForm = ({ adminId, onInvited, onPasswordRequired, onSignedOut }: InviteFormProps) => {
     const client = useApiClient();
     const countdown = useRetryCountdown();
     const headingId = useId();
     const roleId = useId();
     const submitButton = useRef<HTMLButtonElement>(null);
     const {
       register,
       handleSubmit,
       setError,
       formState: { errors, isSubmitting },
     } = useForm<InviteValues>({
       criteriaMode: 'all',
       defaultValues: { emails: '', role: 'student' },
     });

     const submit = useGuardedSubmit(async ({ emails, role }: InviteValues) => {
       const sent = splitEmails(emails);
       const send: SendInvitations = () => invite(client, adminId, sent, role);
       const outcome = await send();
       if (outcome.ok) return onInvited(outcome.value, submitButton.current);
       if (needsPassword(outcome.failure)) return onPasswordRequired(send, submitButton.current);
       const reaction = reactionTo(outcome.failure, '', emailFieldsOf(outcome.failure));
       if (reaction.kind === 'sign-in') return onSignedOut();
       if (reaction.kind === 'reload') return reloadDocument();
       const { description } = reaction;
       const fieldMessages = { emails: emailMessages(description.fieldMessages, sent) };
       showFailure(setError, { ...description, fieldMessages }, VISIBLE_FIELDS);
       if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
     });

     return (
       <form
         className="form-stack"
         aria-labelledby={headingId}
         noValidate
         onSubmit={handleSubmit(submit)}
       >
         <h3 id={headingId}>Invitar</h3>
         <p className="form-hint">
           El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.
         </p>
         <ServerError
           messages={messagesOf(errors.root?.serverError)}
           takeFocus={errors.emails === undefined}
         />
         <EmailsField
           registration={register('emails', { validate: checkEmailCount })}
           messages={messagesOf(errors.emails)}
         />
         <div className="form-field">
           <label className="field-label" htmlFor={roleId}>
             Rol
           </label>
           <select
             id={roleId}
             className="form-input"
             aria-describedby={`${roleId}-hint`}
             {...register('role')}
           >
             <option value="student">Alumno</option>
             <option value="admin">Admin</option>
           </select>
           <p id={`${roleId}-hint`} className="form-hint">
             Una invitación de admin vence a las 48 horas; la de un alumno, a los 7 días.
           </p>
         </div>
         <div className="form-actions">
           <button
             ref={submitButton}
             type="submit"
             className="button"
             disabled={isSubmitting || countdown.waiting}
           >
             {isSubmitting ? 'Creando…' : 'Crear las invitaciones'}
           </button>
         </div>
       </form>
     );
   };

   export default InviteForm;
   ```

3. **`ui/InvitationsTable.tsx`.** «Admin pendiente» va en texto, no sólo en color (FR-022):

   ```tsx
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import { ROLE_LABELS } from '../model/labels';
   import type { AdminInvitation } from '../model/types';

   export type InvitationAction = 'resend' | 'revoke';

   interface InvitationsTableProps {
     readonly titleId: string;
     readonly invitations: readonly AdminInvitation[];
     readonly busy: boolean;
     onAction(action: InvitationAction, invitation: AdminInvitation, opener: HTMLButtonElement): void;
   }

   function expiry({ expired, expiresAt }: AdminInvitation): string {
     return expired ? 'Vencida' : formatLocalDateTime(expiresAt);
   }

   const InvitationsTable = ({ titleId, invitations, busy, onAction }: InvitationsTableProps) => (
     <div
       className="admin-table-scroll"
       role="region"
       tabIndex={0}
       aria-labelledby={titleId}
       aria-busy={busy}
     >
       <table aria-labelledby={titleId}>
         <thead>
           <tr>
             <th scope="col">Email</th>
             <th scope="col">Rol</th>
             <th scope="col">Vence</th>
             <th scope="col">Creada por</th>
             <th scope="col">Acciones</th>
           </tr>
         </thead>
         <tbody>
           {invitations.map((invitation) => (
             <tr key={invitation.id}>
               <th scope="row">{invitation.email}</th>
               <td>
                 {ROLE_LABELS[invitation.role]}
                 {invitation.role === 'admin' && !invitation.expired ? (
                   <span className="admin-mark">Admin pendiente</span>
                 ) : null}
               </td>
               <td>{expiry(invitation)}</td>
               <td>
                 {invitation.invitedBy ?? 'Consola o cuenta borrada'} ·{' '}
                 {formatLocalDateTime(invitation.createdAt)}
               </td>
               <td>
                 <div className="admin-row-actions">
                   <button
                     type="button"
                     className="button secondary small"
                     onClick={(event) => onAction('resend', invitation, event.currentTarget)}
                   >
                     Reenviar la invitación de {invitation.email}
                   </button>
                   <button
                     type="button"
                     className="button secondary small"
                     onClick={(event) => onAction('revoke', invitation, event.currentTarget)}
                   >
                     Revocar la invitación de {invitation.email}
                   </button>
                 </div>
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   );

   export default InvitationsTable;
   ```

4. **`ui/InvitationsSection.tsx`.** Revocar saca la fila antes de volver a pedir la lista, para que el foco vaya al título (historia 2, escenario 3):

   ```tsx
   import { useCallback, useId, useRef, useState } from 'react';
   import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   import { invitationTexts } from '../model/invitation-texts';
   import { resendInvitation, listInvitations, revokeInvitation } from '../api/admin-endpoints';
   import { signInAgain } from '../lib/recover-session';
   import usePagedList from '../lib/use-paged-list';
   import { ROLE_FILTER, STATE_FILTER } from '../model/labels';
   import { INVITATION_GONE, staleList } from '../model/react-to-failure';
   import type { ActionResult, AdminInvitation, InvitationQuery, InviteEntry } from '../model/types';
   import ActionDialog from './ActionDialog';
   import FilterSelect from './FilterSelect';
   import InvitationsTable, { type InvitationAction } from './InvitationsTable';
   import InviteForm, { type SendInvitations } from './InviteForm';
   import ListView, { type ListTexts } from './ListView';
   import useActionDialog from './use-action-dialog';

   interface InvitationsSectionProps {
     readonly ownId: number;
   }

   const EVERY_INVITATION: InvitationQuery = { page: 1, role: '', state: '' };
   const INVITE_TITLE = 'Crear las invitaciones';
   const RECOVERY_HINT =
     'Para recuperar el acceso de alguien, generá el enlace con la consola del taller (taller:password-reset-link).';
   const TEXTS: ListTexts = {
     loading: 'Cargando las invitaciones…',
     failed: 'No pudimos cargar las invitaciones.',
     empty: 'No hay invitaciones con esos filtros.',
     noun: 'invitaciones',
   };

   const InvitationsSection = ({ ownId }: InvitationsSectionProps) => {
     const client = useApiClient();
     const titleId = useId();
     const title = useRef<HTMLHeadingElement>(null);
     const [notice, setNotice] = useState('');
     const load = useCallback(
       (query: InvitationQuery, signal: AbortSignal) => listInvitations(client, query, signal),
       [client],
     );
     const list = usePagedList(load, EVERY_INVITATION, ownId);
     const actions = useActionDialog(ownId, title, setNotice);

     const failed = (failure: ApiFailure): ActionResult => {
       if (staleList(failure)) list.reload();
       return { kind: 'failed', failure };
     };

     const resend = async (invitation: AdminInvitation): Promise<ActionResult> => {
       const outcome = await resendInvitation(client, ownId, invitation.id);
       if (!outcome.ok) return failed(outcome.failure);
       list.reload();
       return {
         kind: 'links',
         entries: [{ email: outcome.value.email, result: 'resent', link: outcome.value }],
       };
     };

     const revoke = async (invitation: AdminInvitation): Promise<ActionResult> => {
       const outcome = await revokeInvitation(client, ownId, invitation.id);
       if (!outcome.ok) return failed(outcome.failure);
       list.remove(invitation.id);
       list.reload();
       setNotice(`Revocamos la invitación de ${invitation.email}.`);
       return { kind: 'done' };
     };

     const confirm = (
       action: InvitationAction,
       invitation: AdminInvitation,
       opener: HTMLButtonElement,
     ): void => {
       const texts = invitationTexts(action, invitation.email);
       const confirmation = {
         body: [texts.body],
         confirmLabel: texts.confirm,
         pendingLabel: texts.pending,
       };
       actions.open(
         {
           start: { kind: 'confirm', title: texts.title, confirmation },
           notFoundMessage: INVITATION_GONE,
           send: () => (action === 'resend' ? resend(invitation) : revoke(invitation)),
         },
         opener,
       );
     };

     const showEntries = (entries: readonly InviteEntry[], opener: HTMLElement | null): void => {
       list.reload();
       const start = { kind: 'links', title: INVITE_TITLE, entries } as const;
       actions.open(
         { start, notFoundMessage: '', send: () => Promise.resolve({ kind: 'done' }) },
         opener,
       );
     };

     const askPassword = (retry: SendInvitations, opener: HTMLElement | null): void => {
       const send = async (): Promise<ActionResult> => {
         const outcome = await retry();
         if (!outcome.ok) return { kind: 'failed', failure: outcome.failure };
         list.reload();
         return { kind: 'links', entries: outcome.value };
       };
       actions.open(
         { start: { kind: 'password', title: INVITE_TITLE }, notFoundMessage: '', send },
         opener,
       );
     };

     return (
       <div className="admin-section">
         <InviteForm
           adminId={ownId}
           onInvited={showEntries}
           onPasswordRequired={askPassword}
           onSignedOut={() => void signInAgain(ownId)}
         />
         <p className="form-hint">{RECOVERY_HINT}</p>
         <p className="admin-notice" role="status">
           {notice}
         </p>
         <h3 id={titleId} ref={title} tabIndex={-1}>
           Invitaciones
         </h3>
         <div className="admin-filters">
           <FilterSelect
             label="Rol"
             value={list.query.role}
             options={ROLE_FILTER}
             onChange={(role) => list.search({ ...list.query, role, page: 1 })}
           />
           <FilterSelect
             label="Estado"
             value={list.query.state}
             options={STATE_FILTER}
             onChange={(state) => list.search({ ...list.query, state, page: 1 })}
           />
         </div>
         <ListView list={list} texts={TEXTS} onClear={() => list.search(EVERY_INVITATION)}>
           {(invitations) => (
             <InvitationsTable
               titleId={titleId}
               invitations={invitations}
               busy={list.loading}
               onAction={confirm}
             />
           )}
         </ListView>
         {actions.dialog === null ? null : (
           <ActionDialog
             adminId={ownId}
             start={actions.dialog.start}
             notFoundMessage={actions.dialog.notFoundMessage}
             send={actions.dialog.send}
             onFinish={actions.finish}
           />
         )}
       </div>
     );
   };

   export default InvitationsSection;
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde, y después `npm run typecheck` y `npm run lint`.
6. **Commit:** `feat(front): las invitaciones por enlace de la administración`.

### Tarea 2.9 · Las specs de la página, en rojo (T019, P, desde S3)

**Archivos:** el stub de `frontend/src/pages/admin/ui/AdminPage.tsx` (`const AdminPage: FunctionComponent<AdminPageProps> = () => { throw new Error('not implemented'); };`, con `AdminPageProps` = `{ initialSection, onClose }`), `frontend/src/pages/admin/index.ts` y `ui/admin-page.spec.tsx`.

1. **`index.ts`,** la API pública del slice:

   ```ts
   export { default as AdminPage } from './ui/AdminPage';
   export type { AdminSection } from './model/types';
   ```

2. **`ui/admin-page.spec.tsx`.** Cubre SC-010 y la historia 5 en su escenario 6. Monta la página sola, sin `<dialog>` ni «Tu cuenta»:

   ```tsx
   import { screen } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { pageBody } from '../model/admin.factory';
   import AdminPage from './AdminPage';
   import { renderAdmin, signInAs, stubDialogs } from './render-admin';

   beforeAll(stubDialogs);
   beforeEach(() => signInAs());

   describe('the administration page', () => {
     it('mounts alone with the section it receives, focuses its title and closes through its action', async () => {
       const onClose = vi.fn();
       const { user, calls } = renderAdmin(
         <AdminPage initialSection="invitations" onClose={onClose} />,
         [{ status: 200, json: pageBody([]) }],
       );
       expect(screen.getByRole('heading', { name: 'Administración' })).toHaveFocus();
       expect(screen.getByRole('button', { name: 'Invitaciones' })).toHaveAttribute(
         'aria-pressed',
         'true',
       );
       expect(await screen.findByText('No hay invitaciones con esos filtros.')).toBeInTheDocument();
       expect(calls[0]?.path).toMatch(/^\/api\/admin\/invitations\?/);
       await user.click(screen.getByRole('button', { name: 'Cerrar' }));
       expect(onClose).toHaveBeenCalledOnce();
       expect(document.querySelectorAll('dialog')).toHaveLength(0);
     });

     it('switches between the two sections with the keyboard', async () => {
       const { user } = renderAdmin(<AdminPage initialSection="accounts" onClose={vi.fn()} />, [
         { status: 200, json: pageBody([]) },
       ]);
       expect(
         await screen.findByText('No hay cuentas con esa búsqueda o esos filtros.'),
       ).toBeInTheDocument();
       await user.tab();
       await user.tab();
       await user.tab();
       expect(screen.getByRole('button', { name: 'Invitaciones' })).toHaveFocus();
       await user.keyboard('{Enter}');
       expect(screen.getByRole('button', { name: 'Invitaciones' })).toHaveAttribute(
         'aria-pressed',
         'true',
       );
       expect(screen.getByRole('heading', { name: 'Invitar' })).toBeInTheDocument();
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/admin-page.spec.tsx`: en rojo.
4. **Commit:** `test(front): specs de la página de la administración montada sola, en rojo`.

### Tarea 2.10 · La página y sus estilos (T020, P)

**Archivos:** `ui/AdminPage.tsx` y `ui/admin.css`, en `frontend/src/pages/admin/`.

1. **`ui/AdminPage.tsx`.** La raíz es una región con nombre, para que el Page Object la ubique sin conocer su contenedor (FR-063):

   ```tsx
   import { useEffect, useId, useRef, useState } from 'react';
   import { useStore } from 'zustand';
   import { sessionStore } from '../../../entities/session';
   import type { AdminSection } from '../model/types';
   import AccountsSection from './AccountsSection';
   import InvitationsSection from './InvitationsSection';

   interface AdminPageProps {
     readonly initialSection: AdminSection;
     onClose(): void;
   }

   const SECTIONS: readonly { readonly id: AdminSection; readonly label: string }[] = [
     { id: 'accounts', label: 'Cuentas' },
     { id: 'invitations', label: 'Invitaciones' },
   ];

   const AdminPage = ({ initialSection, onClose }: AdminPageProps) => {
     const ownId = useStore(sessionStore, (state) => state.user?.id ?? null);
     const titleId = useId();
     const title = useRef<HTMLHeadingElement>(null);
     const [section, setSection] = useState(initialSection);

     useEffect(() => {
       title.current?.focus();
     }, []);

     if (ownId === null) return null;
     return (
       <section className="admin-page" aria-labelledby={titleId}>
         <div className="admin-top">
           <h2 id={titleId} ref={title} tabIndex={-1}>
             Administración
           </h2>
           <button type="button" className="button secondary" onClick={onClose}>
             Cerrar
           </button>
         </div>
         <div className="admin-sections" role="group" aria-label="Secciones de la administración">
           {SECTIONS.map(({ id, label }) => (
             <button
               key={id}
               type="button"
               className="admin-section-button"
               aria-pressed={section === id}
               onClick={() => setSection(id)}
             >
               {label}
             </button>
           ))}
         </div>
         {section === 'accounts' ? (
           <AccountsSection ownId={ownId} />
         ) : (
           <InvitationsSection ownId={ownId} />
         )}
       </section>
     );
   };

   export default AdminPage;
   ```

2. **`ui/admin.css`.** Lo que hace cada regla:
   - `.admin-dialog` es la regla del contenedor de hoy, y F10 la borra con él;
   - `.admin-table-scroll` copia el patrón de `.sys-table-scroll` con una clase propia, y la tabla tiene `min-width: 720px` (research.md, R11);
   - los campos usan `.form-input` de F11a, con 16 px.

   ```css
   .admin-dialog {
     width: 100%;
     max-width: none;
     height: 100%;
     max-height: none;
     margin: 0;
     border: 0;
     border-radius: 0;
   }
   .admin-page {
     max-width: 1180px;
     margin: 0 auto;
     padding: 32px;
   }
   .admin-top {
     display: flex;
     justify-content: space-between;
     align-items: center;
     gap: 16px;
   }
   .admin-top h2 {
     font-size: 30px;
     letter-spacing: -1px;
   }
   .admin-sections {
     display: flex;
     gap: 18px;
     margin: 20px 0 24px;
     border-bottom: 1px solid var(--line);
   }
   .admin-section-button {
     border: 0;
     border-bottom: 3px solid transparent;
     background: transparent;
     padding: 10px 2px;
     font-size: 14px;
   }
   .admin-section-button[aria-pressed='true'] {
     border-bottom-color: var(--accent);
     font-weight: 550;
   }
   .admin-section {
     display: grid;
     gap: 16px;
   }
   .admin-filters {
     display: flex;
     flex-wrap: wrap;
     gap: 12px;
     align-items: flex-end;
   }
   .admin-notice {
     margin: 0;
     color: var(--green);
   }
   .admin-table-scroll {
     max-width: 100%;
     overflow: auto;
   }
   .admin-table-scroll table {
     width: 100%;
     min-width: 720px;
     border-collapse: collapse;
     font-size: 13px;
   }
   .admin-table-scroll th,
   .admin-table-scroll td {
     padding: 8px;
     border: 1px solid var(--line);
     text-align: left;
     vertical-align: top;
     overflow-wrap: anywhere;
   }
   .admin-row-actions,
   .admin-pagination {
     display: flex;
     flex-wrap: wrap;
     gap: 8px;
     align-items: center;
   }
   .admin-mark {
     display: block;
     color: var(--accent-dark);
     font-size: 11px;
     font-weight: 550;
   }
   .admin-emails {
     min-height: 140px;
     resize: vertical;
   }
   .admin-results {
     display: grid;
     gap: 14px;
     padding: 0;
     list-style: none;
   }
   .admin-warning {
     padding: 12px 14px;
     border: 1px solid var(--accent);
     border-radius: 4px;
     background: var(--accent-soft);
   }
   @media (max-width: 590px) {
     .admin-page {
       padding: 20px 16px;
     }
     .admin-top h2 {
       font-size: 26px;
     }
   }
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde, y después `npm run typecheck`, `npm run lint` y `npm run format:check`.
4. **Commit:** `feat(front): la página de la administración, con «Cuentas» e «Invitaciones»`.

### Tarea 2.11 · La compuerta de U2 (T021, K)

- **Desde S3:** P entregó.
- **La compuerta de 0.3,** con `npm run test:unit` en verde y estas comprobaciones:
  - `grep -rn "pages/account\|app/\|<dialog" frontend/src/pages/admin --include=*.tsx --include=*.ts | grep -v spec` imprime sólo los `<dialog` de `ActionDialog.tsx`, ninguno del contenedor (FR-062);
  - `npm run build` no cambia el tamaño: nadie importa la página todavía.
- **El PR:** `feat(front): the administration page, mountable on its own (F12a U2)`, contra `f12a/base`.

**Reversión de U2:** se revierten T020 a T011, en orden inverso.

## 3. U3 · Los E2E y el cableado (onda 2: E; onda 5: K)

**Cubre:**

- **los requisitos:** FR-001 a FR-008, FR-050 a FR-053, FR-059, FR-060 y FR-063;
- **los criterios:** SC-001 a SC-007 y SC-010;
- **las historias:** de la 1 a la 6, de punta a punta.

**Entrega:** la administración cableada en el taller, con sus cuatro E2E en verde y la red intacta.

### Tarea 3.1 · Los E2E de la administración, en rojo (T022, E, desde T010)

**Archivos:** `qa/e2e/specs/admin-entry.spec.ts`, `admin-accounts.spec.ts`, `admin-invitations.spec.ts` y `admin-layout.spec.ts`.

**Consume:** de T009, `AdminPage` (el Page Object) y `admin-contract.ts`; de F11a, `ApiCall.search`, `ADMIN`, `STUDENT`, `errorBody`, `api.on`, `api.reply`, `api.callsTo`, `api.signInAccount`, `access.signIn` y el fixture `account` (las firmas de T001, paso 4).

**Reglas de estos E2E** (research.md, R10):

- cada escenario con una respuesta que no es 2xx declara esa respuesta con la lista blanca angosta, `pageIssues.expectIssue(/status of NNN/, …)` con el código exacto, una vez por código (así quedó en `impl-f11a`, `qa/e2e/specs/session-stage.spec.ts:104` y `:133`). El pedido abortado no tiene código: se declara con `/net::ERR_FAILED/`, como `qa/e2e/specs/cycle.spec.ts:71` de `master`. Nunca `/Failed to load resource/`, que esconde cualquier otro error de red;
- las rutas con id se registran una por una (`'PATCH /api/admin/users/12'`). El doble busca la ruta antes de mirar el CSRF (`impl-f11a`, `qa/e2e/fixtures/api-double.ts:127-139`): una ruta sin registrar da 404 y queda en `unhandled`, y `assertAllHandled()` la reporta al final del escenario. Ningún E2E de F12a espera un 419;
- cada escenario que llega a `POST /api/auth/confirm-password` registra su respuesta con `api.on`, aunque la base ya la responda por omisión (B3);
- todo pedido que modifica se comprueba con `call.user === String(ADMIN.id)`;
- las fechas se comparan en la zona de `playwright.config.ts` (America/Argentina/Buenos_Aires): `2026-10-12T15:30:00.000Z` se ve como «12 de octubre de 2026 a las 12:30».

1. **`admin-entry.spec.ts`.** Cubre la historia 5 (escenarios 1 a 5), FR-004, FR-007 y SC-002, y la Review Focus 5:

   ```ts
   import { expect, test } from '../fixtures';
   import { ADMIN, STUDENT, errorBody } from '../lib/api-contract';
   import { ANA_ROW, OWN_ROW, adminError, pageOf } from '../lib/admin-contract';
   import { observeReload } from '../lib/document-marker';
   import { urls } from '../lib/urls';

   const PASSWORD = 'una frase larga para el taller';

   test.describe('a student', () => {
     test.use({ sessionAccount: STUDENT });

     test('has no entry to the administration and asks nothing of /api/admin', async ({
       account,
       api,
       shell,
     }) => {
       await shell.goto(urls.view('recorrido'));
       await account.open();
       await expect(account.dialog).toBeVisible();
       await expect(account.button('Administrar el taller')).toHaveCount(0);
       expect(api.calls.filter((call) => call.path.startsWith('/api/admin'))).toEqual([]);
     });
   });

   test.describe('an admin', () => {
     test.use({ sessionAccount: ADMIN });

     test.beforeEach(({ api }) => {
       api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW, ANA_ROW]) }));
     });

     test('opens the administration on «Cuentas» without changing the URL or the history', async ({
       account,
       admin,
       context,
       shell,
       page,
     }) => {
       await context.addInitScript(() => {
         const pushes: string[] = [];
         (window as unknown as { __e2ePushes: string[] }).__e2ePushes = pushes;
         const pushState = history.pushState.bind(history);
         history.pushState = (data, unused, url) => {
           pushes.push(String(url));
           pushState(data, unused, url);
         };
       });
       await shell.goto(urls.view('biblioteca'));
       await admin.open();
       await expect(account.dialog).toBeHidden();
       await expect(admin.title).toBeFocused();
       await expect(admin.button('Cuentas')).toHaveAttribute('aria-pressed', 'true');
       await expect(admin.row(/Ana Pérez/)).toBeVisible();
       await expect(page).toHaveURL(urls.view('biblioteca'));
       expect(
         await page.evaluate(() => (window as unknown as { __e2ePushes: string[] }).__e2ePushes),
       ).toEqual([]);
     });

     test('closes with Esc, gives the focus back to «Tu cuenta» and leaves nothing behind', async ({
       account,
       admin,
       shell,
       page,
     }) => {
       await shell.goto(urls.view('biblioteca'));
       const alertsBefore = await page.getByRole('alert').count();
       const statusesBefore = await page.getByRole('status').count();
       await admin.open();
       await expect(admin.title).toBeFocused();
       await page.keyboard.press('Escape');
       await expect(admin.region).toBeHidden();
       await expect(account.entry).toBeFocused();
       await expect(shell.heading('biblioteca')).toBeVisible();
       expect(await page.getByRole('alert').count()).toBe(alertsBefore);
       expect(await page.getByRole('status').count()).toBe(statusesBefore);
     });

     test('closes with «Cerrar» too', async ({ account, admin, shell }) => {
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Cerrar').click();
       await expect(admin.region).toBeHidden();
       await expect(account.entry).toBeFocused();
     });

     test('explains a lost role, offers to reload and does not retry', async ({
       admin,
       api,
       pageIssues,
       shell,
       page,
     }) => {
       pageIssues.expectIssue(/status of 403/, 'the 403 of a role that was lost');
       api.reply('PATCH /api/admin/users/12', { status: 403, json: adminError('forbidden') });
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Deshabilitar a Ana Pérez').click();
       const dialog = admin.dialog('¿Deshabilitar la cuenta de Ana Pérez?');
       await dialog.getByRole('button', { name: 'Deshabilitar', exact: true }).click();
       const alert = dialog.getByRole('alert');
       await expect(alert).toContainText('No tenés permiso para hacer esto.');
       await expect(alert).toContainText(
         'Puede que tu cuenta ya no tenga el rol de admin. Recargá la página.',
       );
       await expect(dialog.getByRole('button', { name: 'Deshabilitar', exact: true })).toHaveCount(0);
       expect(api.callsTo('PATCH /api/admin/users/12')).toHaveLength(1);
       expect(
         await observeReload(page, () => alert.getByRole('button', { name: 'Recargar' }).click()),
       ).toBe(true);
     });

     test('closes the confirmation on a 401, asks to sign in and stays where it was with the same account', async ({
       access,
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 401/, 'the 401 of an expired session');
       api.signInAccount = ADMIN;
       api.reply('PATCH /api/admin/users/12', { status: 401, json: errorBody('unauthenticated') });
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Deshabilitar a Ana Pérez').click();
       await admin
         .dialog('¿Deshabilitar la cuenta de Ana Pérez?')
         .getByRole('button', { name: 'Deshabilitar', exact: true })
         .click();
       await expect(admin.dialog('¿Deshabilitar la cuenta de Ana Pérez?')).toBeHidden();
       await expect(admin.notice('No se hizo ningún cambio.')).toBeVisible();
       await access.signIn(ADMIN.email, PASSWORD);
       await expect(access.heading('Ingresá al taller')).toBeHidden();
       await expect(admin.title).toBeVisible();
       await expect(admin.button('Deshabilitar a Ana Pérez')).toBeFocused();
       expect(api.callsTo('PATCH /api/admin/users/12')).toHaveLength(1);
     });
   });
   ```

2. **`admin-accounts.spec.ts`.** Cubre las historias 3, 4 y 6 contra la API, SC-004, SC-005 y la Review Focus 4:

   ```ts
   import type { ApiCall } from '../fixtures/api-double';
   import { expect, test } from '../fixtures';
   import { ADMIN } from '../lib/api-contract';
   import {
     ANA_ROW,
     BETO_ROW,
     DELETION_MESSAGE,
     LEAVING_ROW,
     OWN_ROW,
     adminError,
     pageOf,
   } from '../lib/admin-contract';
   import { urls } from '../lib/urls';

   const PASSWORD = 'una frase larga para el taller';
   const ACCOUNTS = 'Cuentas del taller, por nombre';

   function queryOf(call: ApiCall | undefined): Record<string, string> {
     return Object.fromEntries(new URLSearchParams(call?.search ?? ''));
   }

   test.use({ sessionAccount: ADMIN });

   test.describe('the list of accounts', () => {
     test('makes no request for ten typed letters and searches when the search is sent', async ({
       admin,
       api,
       shell,
     }) => {
       api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW, ANA_ROW]) }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await expect(admin.table(ACCOUNTS)).toBeVisible();
       await admin.field('Buscar por nombre o email').pressSequentially('margaritas');
       expect(api.callsTo('GET /api/admin/users')).toHaveLength(1);
       await admin.button('Buscar').click();
       await expect.poll(() => api.callsTo('GET /api/admin/users').length).toBe(2);
       expect(queryOf(api.callsTo('GET /api/admin/users')[1])).toEqual({
         page: '1',
         perPage: '25',
         q: 'margaritas',
       });
     });

     test('offers nothing on the own account nor on one being deleted', async ({
       admin,
       api,
       shell,
     }) => {
       api.on('GET /api/admin/users', () => ({
         status: 200,
         json: pageOf([OWN_ROW, ANA_ROW, LEAVING_ROW]),
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await expect(admin.actions(/Olga Ruiz \(vos\)/).getByRole('button')).toHaveCount(0);
       await expect(admin.actions(/Carla Díaz/).getByRole('button')).toHaveCount(0);
       await expect(admin.actions(/Ana Pérez/).getByRole('button')).toHaveCount(3);
     });
   });

   test.describe('the actions', () => {
     test.beforeEach(({ api }) => {
       api.on('GET /api/admin/users', () => ({
         status: 200,
         json: pageOf([OWN_ROW, ANA_ROW, BETO_ROW]),
       }));
     });

     test('asks for the password once on a 423 and repeats the change exactly once', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 423/, 'the 423 of the first sensitive action');
       api.reply('PATCH /api/admin/users/12', {
         status: 423,
         json: adminError('password_confirmation_required'),
       });
       api.on('PATCH /api/admin/users/12', () => ({
         status: 200,
         json: { data: { ...ANA_ROW, status: 'disabled' } },
       }));
       api.on('POST /api/auth/confirm-password', () => ({ status: 201, json: {} }));
       api.on('PATCH /api/admin/users/13', () => ({
         status: 200,
         json: { data: { ...BETO_ROW, role: 'student' } },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Deshabilitar a Ana Pérez').click();
       await admin
         .dialog('¿Deshabilitar la cuenta de Ana Pérez?')
         .getByRole('button', { name: 'Deshabilitar', exact: true })
         .click();
       await admin.confirmPassword(PASSWORD);
       await expect(admin.row(/Ana Pérez/)).toContainText('Deshabilitada');
       await expect(admin.button('Rehabilitar a Ana Pérez')).toBeFocused();
       await expect(admin.notice('La cuenta de Ana Pérez quedó deshabilitada.')).toBeVisible();
       const changes = api.callsTo('PATCH /api/admin/users/12');
       expect(changes).toHaveLength(2);
       expect(changes.map((call) => call.body)).toEqual([
         { status: 'disabled' },
         { status: 'disabled' },
       ]);
       expect(changes.every((call) => call.user === String(ADMIN.id))).toBe(true);
       const [confirmation] = api.callsTo('POST /api/auth/confirm-password');
       expect(confirmation?.body).toEqual({ password: PASSWORD });
       expect(confirmation?.user).toBe(String(ADMIN.id));

       await admin.button('Quitar admin a Beto Gómez').click();
       await admin
         .dialog('¿Quitarle el rol de admin a Beto Gómez?')
         .getByRole('button', { name: 'Quitar admin', exact: true })
         .click();
       await expect(admin.notice('Beto Gómez ya no es admin.')).toBeVisible();
       expect(api.callsTo('POST /api/auth/confirm-password')).toHaveLength(1);
     });

     test('says that the password is wrong and changes nothing, and cancelling changes nothing either', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 423/, 'the 423 of the action');
       pageIssues.expectIssue(/status of 422/, 'the 422 of a wrong password');
       api.on('PATCH /api/admin/users/12', () => ({
         status: 423,
         json: adminError('password_confirmation_required'),
       }));
       api.on('POST /api/auth/confirm-password', () => ({
         status: 422,
         json: { message: 'El email o la contraseña no son correctos.', code: 'auth_failed' },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Deshabilitar a Ana Pérez').click();
       await admin
         .dialog('¿Deshabilitar la cuenta de Ana Pérez?')
         .getByRole('button', { name: 'Deshabilitar', exact: true })
         .click();
       await admin.confirmPassword('otra frase que no es');
       const password = admin.dialog('Confirmá tu contraseña para seguir');
       await expect(password.getByLabel('Tu contraseña', { exact: true })).toHaveAttribute(
         'aria-invalid',
         'true',
       );
       await expect(password).toContainText('La contraseña no es correcta.');
       await password.getByRole('button', { name: 'Cancelar' }).click();
       await expect(password).toBeHidden();
       await expect(admin.notice('No se hizo ningún cambio.')).toBeVisible();
       await expect(admin.button('Deshabilitar a Ana Pérez')).toBeFocused();
       expect(api.callsTo('PATCH /api/admin/users/12')).toHaveLength(1);
     });

     test('explains the last admin, keeps the row and asks for the page again', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 409/, 'the 409 of the last admin');
       api.on('PATCH /api/admin/users/13', () => ({ status: 409, json: adminError('last_admin') }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Quitar admin a Beto Gómez').click();
       const dialog = admin.dialog('¿Quitarle el rol de admin a Beto Gómez?');
       await dialog.getByRole('button', { name: 'Quitar admin', exact: true }).click();
       await expect(dialog.getByRole('alert')).toHaveText(
         'Tiene que quedar al menos un admin activo.',
       );
       await expect.poll(() => api.callsTo('GET /api/admin/users').length).toBe(2);
       await dialog.getByRole('button', { name: 'Cancelar' }).click();
       await expect(admin.row(/Beto Gómez/)).toContainText('Admin');
       await expect(admin.button('Quitar admin a Beto Gómez')).toBeFocused();
     });

     test('deletes only after the box is checked, and the row stays in «Borrándose»', async ({
       admin,
       api,
       shell,
     }) => {
       api.on('DELETE /api/admin/users/12', () => ({
         status: 202,
         json: { data: { id: 12, status: 'deleting' }, message: DELETION_MESSAGE },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Borrar la cuenta de Ana Pérez').click();
       const dialog = admin.dialog('¿Borrar la cuenta de Ana Pérez?');
       const confirm = dialog.getByRole('button', { name: 'Borrar la cuenta', exact: true });
       await expect(confirm).toBeDisabled();
       await dialog.getByRole('checkbox', { name: 'Entiendo que no se puede deshacer.' }).check();
       await confirm.click();
       await expect(admin.row(/Ana Pérez/)).toContainText('Borrándose');
       await expect(admin.actions(/Ana Pérez/).getByRole('button')).toHaveCount(0);
       await expect(admin.notice(DELETION_MESSAGE)).toBeVisible();
       await expect(admin.region.getByRole('heading', { name: ACCOUNTS })).toBeFocused();
       expect(api.callsTo('DELETE /api/admin/users/12')[0]?.user).toBe(String(ADMIN.id));
     });

     test('waits for Retry-After before letting the action be sent again', async ({
       admin,
       api,
       pageIssues,
       shell,
       page,
     }) => {
       pageIssues.expectIssue(/status of 429/, 'the 429 of the administration limit');
       await page.clock.install();
       api.reply('PATCH /api/admin/users/12', {
         status: 429,
         headers: { 'Retry-After': '30' },
         json: adminError('too_many_requests'),
       });
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button('Deshabilitar a Ana Pérez').click();
       const dialog = admin.dialog('¿Deshabilitar la cuenta de Ana Pérez?');
       await dialog.getByRole('button', { name: 'Deshabilitar', exact: true }).click();
       await expect(dialog.getByRole('alert')).toContainText(
         'Podés volver a intentar en 30 segundos.',
       );
       const again = dialog.getByRole('button', { name: 'Deshabilitar', exact: true });
       await expect(again).toBeDisabled();
       await page.clock.fastForward(29_000);
       await expect(again).toBeDisabled();
       await page.clock.fastForward(1_000);
       await expect(again).toBeEnabled();
     });
   });
   ```

3. **`admin-invitations.spec.ts`.** Cubre las historias 1 y 2, con el portapapeles real de Chromium:

   ```ts
   import { expect, test } from '../fixtures';
   import { ADMIN, errorBody } from '../lib/api-contract';
   import { OWN_ROW, adminError, invitation, linkFor, pageOf } from '../lib/admin-contract';
   import { urls } from '../lib/urls';

   const PASSWORD = 'una frase larga para el taller';
   const CLASSROOM = Array.from({ length: 40 }, (_, index) => `alumno${index + 1}@x.com`);
   const PENDING_ADMIN = invitation({ id: 7, email: 'root@x.com', role: 'admin' });
   const FROM_CONSOLE = invitation({ id: 8, email: 'beto@x.com', invitedBy: null });
   const EXPIRED = invitation({ id: 9, email: 'carla@x.com', expired: true });

   interface InviteBody {
     emails: string[];
   }

   function created(email: string) {
     return { email, result: 'created', expiresAt: '2026-10-12T15:30:00.000Z', url: linkFor(email) };
   }

   test.use({ sessionAccount: ADMIN, permissions: ['clipboard-read', 'clipboard-write'] });

   test.beforeEach(({ api }) => {
     api.on('GET /api/admin/users', () => ({ status: 200, json: pageOf([OWN_ROW]) }));
     api.on('GET /api/admin/invitations', () => ({
       status: 200,
       json: pageOf([PENDING_ADMIN, FROM_CONSOLE, EXPIRED]),
     }));
   });

   test.describe('inviting a group', () => {
     test('sends 40 emails in one request, shows 40 results and copies the links', async ({
       admin,
       api,
       shell,
       page,
     }) => {
       api.on('POST /api/admin/invitations', (call) => ({
         status: 200,
         json: { data: (call.body as InviteBody).emails.map(created) },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.invite(CLASSROOM);
       const result = admin.dialog('Resultado');
       await expect(result.getByRole('listitem')).toHaveCount(40);
       const [call] = api.callsTo('POST /api/admin/invitations');
       expect(api.callsTo('POST /api/admin/invitations')).toHaveLength(1);
       expect(call?.body).toEqual({ emails: CLASSROOM, role: 'student', delivery: 'link' });
       expect(call?.user).toBe(String(ADMIN.id));
       await expect(result.getByRole('listitem').first()).toContainText(
         'alumno1@x.com · Invitación creada. Vence el 12 de octubre de 2026 a las 12:30.',
       );
       await result.getByRole('button', { name: 'Copiar el enlace de alumno2@x.com' }).click();
       await expect(result.getByRole('status')).toHaveText('Copiado.');
       expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
         linkFor('alumno2@x.com'),
       );
       await result.getByRole('button', { name: 'Copiar todos los enlaces' }).click();
       const lines = (await page.evaluate(() => navigator.clipboard.readText())).split('\n');
       expect(lines).toHaveLength(40);
       expect(lines[0]).toBe(`alumno1@x.com\t${linkFor('alumno1@x.com')}`);
     });

     test('says what happened with each email', async ({ admin, api, shell }) => {
       api.on('POST /api/admin/invitations', () => ({
         status: 200,
         json: {
           data: [
             created('nueva@x.com'),
             { ...created('vencida@x.com'), result: 'renewed' },
             { email: 'ana@x.com', result: 'user_exists' },
             { email: 'vigente@x.com', result: 'invitation_pending' },
           ],
         },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.invite(['nueva@x.com', 'vencida@x.com', 'ana@x.com', 'vigente@x.com']);
       const items = admin.dialog('Resultado').getByRole('listitem');
       await expect(items.nth(1)).toContainText(
         'Tenía una invitación vencida: la renovamos. Vence el',
       );
       await expect(items.nth(2)).toHaveText('ana@x.com · Ya tiene una cuenta.');
       await expect(items.nth(3)).toHaveText(
         'vigente@x.com · Ya tiene una invitación vigente. Si perdió el enlace, generá otro con «Reenviar».',
       );
       await expect(items.nth(2).getByRole('textbox')).toHaveCount(0);
     });

     test('puts the message of a repeated email after the email sent in its position', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 422/, 'the 422 of a repeated email');
       api.on('POST /api/admin/invitations', () => ({
         status: 422,
         json: errorBody('validation_failed', {
           'emails.1': ['Este email está repetido en el pedido.'],
         }),
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.invite(['Ana@X.com', 'ana@x.com']);
       const field = admin.inviteForm().getByLabel('Emails', { exact: true });
       await expect(admin.inviteForm()).toContainText(
         'ana@x.com: Este email está repetido en el pedido.',
       );
       await expect(field).toHaveAttribute('aria-invalid', 'true');
       await expect(field).toBeFocused();
     });

     test('asks for the password for an admin batch and sends it again exactly once', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 423/, 'the 423 of an admin batch');
       api.reply('POST /api/admin/invitations', {
         status: 423,
         json: adminError('password_confirmation_required'),
       });
       api.on('POST /api/admin/invitations', () => ({
         status: 200,
         json: { data: [created('root2@x.com')] },
       }));
       api.on('POST /api/auth/confirm-password', () => ({ status: 201, json: {} }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.invite(['root2@x.com'], 'Admin');
       await admin.confirmPassword(PASSWORD);
       await expect(admin.dialog('Resultado')).toBeVisible();
       const batches = api.callsTo('POST /api/admin/invitations');
       expect(batches.map((call) => call.body)).toEqual([
         { emails: ['root2@x.com'], role: 'admin', delivery: 'link' },
         { emails: ['root2@x.com'], role: 'admin', delivery: 'link' },
       ]);
     });

     test('asks before closing while the links are on screen and gives the focus back', async ({
       admin,
       api,
       shell,
       page,
     }) => {
       api.on('POST /api/admin/invitations', () => ({
         status: 200,
         json: { data: [created('beto2@x.com')] },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.invite(['beto2@x.com']);
       const result = admin.dialog('Resultado');
       await expect(result.getByRole('heading', { name: 'Resultado' })).toBeFocused();
       await page.keyboard.press('Escape');
       await expect(result).toContainText('¿Cerrar? Los enlaces no se vuelven a mostrar.');
       await result.getByRole('button', { name: 'Volver' }).click();
       await result.getByRole('button', { name: 'Listo' }).click();
       await result.getByRole('button', { name: 'Cerrar igual' }).click();
       await expect(result).toBeHidden();
       await expect(
         admin.inviteForm().getByRole('button', { name: 'Crear las invitaciones' }),
       ).toBeFocused();
     });

     test('keeps the emails and shows the common message when the network fails', async ({
       admin,
       pageIssues,
       shell,
       page,
     }) => {
       pageIssues.expectIssue(/net::ERR_FAILED/, 'the aborted request of the batch');
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await page.route('**/api/admin/invitations', (route) =>
         route.request().method() === 'POST' ? route.abort() : route.fallback(),
       );
       await admin.invite(['beto2@x.com']);
       await expect(admin.inviteForm().getByRole('alert')).toHaveText(
         'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.',
       );
       await expect(admin.inviteForm().getByLabel('Emails', { exact: true })).toHaveValue(
         'beto2@x.com',
       );
       await expect(
         admin.inviteForm().getByRole('button', { name: 'Crear las invitaciones' }),
       ).toBeEnabled();
     });
   });

   test.describe('the list of invitations', () => {
     test('shows the pending admin invitation in text, the expired one and the one from the console', async ({
       admin,
       shell,
     }) => {
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.openSection('Invitaciones');
       const table = admin.table('Invitaciones');
       await expect(table.getByRole('row').nth(1)).toContainText('root@x.com');
       await expect(admin.row(/root@x\.com/)).toContainText('Admin pendiente');
       await expect(admin.row(/beto@x\.com/)).toContainText('Consola o cuenta borrada');
       await expect(admin.row(/carla@x\.com/)).toContainText('Vencida');
     });

     test('resends by link, shows the new link and asks for the list again', async ({
       admin,
       api,
       shell,
     }) => {
       api.on('POST /api/admin/invitations/8/resend', () => ({
         status: 200,
         json: {
           data: {
             id: 8,
             email: 'beto@x.com',
             role: 'student',
             delivery: 'link',
             expiresAt: '2026-10-12T15:30:00.000Z',
             url: linkFor('beto-nuevo'),
           },
         },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.openSection('Invitaciones');
       await admin.button('Reenviar la invitación de beto@x.com').click();
       await admin
         .dialog('¿Generar un enlace nuevo para beto@x.com?')
         .getByRole('button', { name: 'Generar el enlace' })
         .click();
       const result = admin.dialog('Resultado');
       await expect(result.getByRole('textbox', { name: 'Enlace de beto@x.com' })).toHaveValue(
         linkFor('beto-nuevo'),
       );
       expect(api.callsTo('POST /api/admin/invitations/8/resend')[0]?.body).toEqual({
         delivery: 'link',
       });
       await expect.poll(() => api.callsTo('GET /api/admin/invitations').length).toBe(2);
     });

     test('revokes, drops the row and puts the focus on the title of the table', async ({
       admin,
       api,
       shell,
     }) => {
       api.on('DELETE /api/admin/invitations/8', () => ({ status: 204 }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.openSection('Invitaciones');
       await admin.button('Revocar la invitación de beto@x.com').click();
       await admin
         .dialog('¿Revocar la invitación de beto@x.com?')
         .getByRole('button', { name: 'Revocar', exact: true })
         .click();
       await expect(
         admin.region.getByRole('heading', { name: 'Invitaciones', exact: true }),
       ).toBeFocused();
       await expect(admin.notice('Revocamos la invitación de beto@x.com.')).toBeVisible();
       expect(api.callsTo('DELETE /api/admin/invitations/8')[0]?.user).toBe(String(ADMIN.id));
     });

     test('says that an invitation is gone on a 404 and asks for the list again', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 404/, 'the 404 of an invitation accepted meanwhile');
       api.on('DELETE /api/admin/invitations/8', () => ({
         status: 404,
         json: adminError('not_found'),
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.openSection('Invitaciones');
       await admin.button('Revocar la invitación de beto@x.com').click();
       const dialog = admin.dialog('¿Revocar la invitación de beto@x.com?');
       await dialog.getByRole('button', { name: 'Revocar', exact: true }).click();
       await expect(dialog.getByRole('alert')).toHaveText(
         'Esa invitación ya no existe: puede que la hayan aceptado o revocado.',
       );
       await expect.poll(() => api.callsTo('GET /api/admin/invitations').length).toBe(2);
     });
   });
   ```

4. **`admin-layout.spec.ts`.** Cubre FR-008, FR-050, FR-052 y FR-053, SC-001 y SC-006:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { ADMIN } from '../lib/api-contract';
   import { ANA_ROW, OWN_ROW, adminUser, linkFor, pageOf } from '../lib/admin-contract';
   import { urls } from '../lib/urls';

   const CLASSROOM = Array.from({ length: 40 }, (_, index) => `alumno${index + 1}@x.com`);
   const LONG_NAME = adminUser({
     id: 20,
     name: 'María de los Ángeles Fernández Etcheverry',
     email: 'maria.de.los.angeles.fernandez.etcheverry@universidad.example',
   });

   async function tabTo(page: Page, target: Locator): Promise<void> {
     for (let presses = 0; presses < 60; presses += 1) {
       if (await target.evaluate((element) => element === document.activeElement)) return;
       await page.keyboard.press('Tab');
     }
   }

   test.use({ sessionAccount: ADMIN });

   test.beforeEach(({ api }) => {
     api.on('GET /api/admin/users', () => ({
       status: 200,
       json: pageOf([OWN_ROW, ANA_ROW, LONG_NAME]),
     }));
     api.on('GET /api/admin/invitations', () => ({ status: 200, json: pageOf([]) }));
   });

   for (const width of [320, 390]) {
     test(`does not scroll sideways at ${width} px and the table scrolls inside its own region`, async ({
       admin,
       shell,
       page,
     }) => {
       await page.setViewportSize({ width, height: 800 });
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await expect(admin.table('Cuentas del taller, por nombre')).toBeVisible();
       expect(
         await admin.region.evaluate((element) => element.scrollWidth <= element.clientWidth),
       ).toBe(true);
       const scroller = admin.region.getByRole('region', { name: 'Cuentas del taller, por nombre' });
       await expect(scroller).toHaveAttribute('tabindex', '0');
       expect(await scroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
         true,
       );
       const fontSize = await admin
         .field('Buscar por nombre o email')
         .evaluate((element) => getComputedStyle(element).fontSize);
       expect(fontSize).toBe('16px');
     });
   }

   test.describe('with reduced motion', () => {
     test.use({ reducedMotion: 'reduce' });

     test('has no transitions', async ({ admin, shell }) => {
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       const durations = await admin.region
         .getByRole('button')
         .evaluateAll((buttons) =>
           buttons.map((button) => getComputedStyle(button).transitionDuration),
         );
       expect(durations.length).toBeGreaterThan(0);
       expect(durations.every((duration) => duration === '0s')).toBe(true);
     });
   });

   test('disables an account with the keyboard only and the focus comes back to the row', async ({
     admin,
     account,
     api,
     shell,
     page,
   }) => {
     api.on('PATCH /api/admin/users/12', () => ({
       status: 200,
       json: { data: { ...ANA_ROW, status: 'disabled' } },
     }));
     await shell.goto(urls.view('recorrido'));
     await tabTo(page, account.entry);
     await expect(account.entry).toBeFocused();
     await page.keyboard.press('Enter');
     await tabTo(page, account.button('Administrar el taller'));
     await page.keyboard.press('Enter');
     await expect(admin.title).toBeFocused();
     const target = admin.button('Deshabilitar a Ana Pérez');
     await tabTo(page, target);
     await expect(target).toBeFocused();
     await page.keyboard.press('Enter');
     const dialog = admin.dialog('¿Deshabilitar la cuenta de Ana Pérez?');
     await expect(dialog.getByRole('heading')).toBeFocused();
     await page.keyboard.press('Tab');
     await page.keyboard.press('Tab');
     await expect(dialog.getByRole('button', { name: 'Deshabilitar', exact: true })).toBeFocused();
     await page.keyboard.press('Enter');
     await expect(admin.button('Rehabilitar a Ana Pérez')).toBeFocused();
   });

   test('keeps no name, email or link in the browser after inviting', async ({
     admin,
     api,
     shell,
     page,
   }) => {
     const logged: string[] = [];
     page.on('console', (message) => logged.push(message.text()));
     api.on('POST /api/admin/invitations', () => ({
       status: 200,
       json: {
         data: CLASSROOM.map((email) => ({
           email,
           result: 'created',
           expiresAt: '2026-10-12T15:30:00.000Z',
           url: linkFor(email),
         })),
       },
     }));
     await shell.goto(urls.view('recorrido'));
     const historyBefore = await page.evaluate(() => history.length);
     await admin.open();
     await admin.invite(CLASSROOM);
     const result = admin.dialog('Resultado');
     await result.getByRole('button', { name: 'Listo' }).click();
     await result.getByRole('button', { name: 'Cerrar igual' }).click();
     await admin.button('Cerrar').click();
     const traces = await page.evaluate(() =>
       JSON.stringify({
         local: { ...localStorage },
         session: { ...sessionStorage },
         cookie: document.cookie,
         url: location.href,
         state: history.state as unknown,
       }),
     );
     for (const email of [...CLASSROOM, ANA_ROW.name, ANA_ROW.email])
       expect(traces).not.toContain(email);
     expect(traces).not.toContain('invitacion=');
     expect(logged.filter((text) => text.includes('invitacion=') || text.includes('@x.com'))).toEqual(
       [],
     );
     expect(await page.evaluate(() => history.length)).toBe(historyBefore);
   });
   ```

5. **Correr** `npm run typecheck` y `npm run build && E2E_PORT=4194 npm run test:e2e -- specs/admin-entry.spec.ts specs/admin-accounts.spec.ts specs/admin-invitations.spec.ts specs/admin-layout.spec.ts`. El resultado esperado:
   - el escenario del alumno, en verde;
   - el resto, en rojo por la razón esperada: no existe «Administrar el taller», porque `AccountRoot` todavía no pasa `administration`.

   La red de la base sigue en verde.
6. **Commit:** `test(qa): E2E de la administración, en rojo`.

### Tarea 3.2 · El contenedor y el cableado (T023, K, desde la compuerta de U2)

**Archivos:** `frontend/src/app/account/AdminDialog.tsx`, `frontend/src/app/account/admin-dialog.spec.tsx`, `frontend/src/app/account/AccountRoot.tsx` y `frontend/src/app/main.tsx`.

1. **La spec en rojo,** `app/account/admin-dialog.spec.tsx`, contra un stub de `AdminDialog` como `const` tipado (`const AdminDialog: FunctionComponent<AdministrationProps> = () => { throw new Error('not implemented'); };`, con `export default AdminDialog;`). Fija la Review Focus 1:

   ```tsx
   import { fireEvent, render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { sessionStore } from '../../entities/session';
   import { ApiClientContext, createApiClient } from '../../shared/api/http';
   import { createFakeFetch } from '../../shared/api/http/fake-fetch';
   import AdminDialog from './AdminDialog';

   const ANA = {
     id: 12,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     status: 'active',
     emailVerified: true,
     privacyVersion: '2026-10-dev',
     createdAt: '2026-10-05T12:00:00.000Z',
     updatedAt: '2026-10-05T12:00:00.000Z',
   };
   const PAGE = { data: [ANA], meta: { page: 1, perPage: 25, total: 1, lastPage: 1 } };

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
       status: 'signed-in',
       user: { id: 1, name: 'Olga Ruiz', email: 'olga@x.com', role: 'admin', privacyAccepted: true },
       features: { passwordReset: false, registration: false },
       contentVersion: null,
     });
   });

   function renderDialog() {
     const onClose = vi.fn();
     const fake = createFakeFetch([{ status: 200, json: PAGE }]);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     render(
       <ApiClientContext value={client}>
         <AdminDialog onClose={onClose} />
       </ApiClientContext>,
     );
     return { onClose, user: userEvent.setup() };
   }

   describe('the dialog that holds the administration', () => {
     it('opens as a modal on «Cuentas» and closes with «Cerrar»', async () => {
       const { onClose, user } = renderDialog();
       const dialog = screen.getByRole('dialog', { name: 'Administración' });
       expect(dialog).toHaveAttribute('open');
       expect(screen.getByRole('button', { name: 'Cuentas' })).toHaveAttribute('aria-pressed', 'true');
       await user.click(screen.getByRole('button', { name: 'Cerrar' }));
       expect(onClose).toHaveBeenCalledOnce();
     });

     it('stays open when a confirmation inside it closes', async () => {
       const { onClose, user } = renderDialog();
       await user.click(await screen.findByRole('button', { name: 'Deshabilitar a Ana Pérez' }));
       const confirmation = screen.getByRole('dialog', {
         name: '¿Deshabilitar la cuenta de Ana Pérez?',
       });
       fireEvent(confirmation, new Event('close'));
       expect(
         screen.queryByRole('dialog', { name: '¿Deshabilitar la cuenta de Ana Pérez?' }),
       ).toBeNull();
       expect(onClose).not.toHaveBeenCalled();
       expect(screen.getByRole('dialog', { name: 'Administración' })).toHaveAttribute('open');
     });
   });
   ```

   Correrla (`npm run test:unit -- frontend/src/app/account`): en rojo. Commit: `test(front): specs del contenedor de la administración, en rojo`.
2. **`AdminDialog.tsx`** (contrato, «`app/account`»): `showModal()` en `useLayoutEffect` (research.md, R3), y el `close` de los diálogos de adentro se ignora:

   ```tsx
   import { useLayoutEffect, useRef } from 'react';
   import type { AdministrationProps } from '../../pages/account';
   import { AdminPage } from '../../pages/admin';

   const AdminDialog = ({ onClose }: AdministrationProps) => {
     const dialog = useRef<HTMLDialogElement>(null);

     useLayoutEffect(() => {
       const element = dialog.current;
       if (element !== null && !element.open) element.showModal();
     }, []);

     return (
       <dialog
         ref={dialog}
         className="admin-dialog"
         aria-label="Administración"
         onClose={(event) => {
           if (event.target === event.currentTarget) onClose();
         }}
       >
         <AdminPage initialSection="accounts" onClose={() => dialog.current?.close()} />
       </dialog>
     );
   };

   export default AdminDialog;
   ```

3. **`AccountRoot.tsx`.** Este es el resultado esperado sobre el `AccountRoot` del plan de F11a (T025 de F11a), que ya importa `reloadDocument` de `shared/lib` (`impl-f11a`, `frontend/src/app/account/AccountRoot.tsx:3`). Si el de la base difiere (por ejemplo, con A3, B4), se suman sólo el import de `AdminDialog` y la prop `administration={AdminDialog}` en `<AccountMenu … />`, sin reescribir el archivo:

   ```tsx
   import { AccessGate, accessRequests } from '../../features/sign-in';
   import { AccountMenu } from '../../pages/account';
   import { ApiClientContext, type ApiClient } from '../../shared/api/http';
   import { reloadDocument } from '../../shared/lib/reload-document';
   import AdminDialog from './AdminDialog';
   import { setShellInert } from './shell-inertness';

   interface AccountRootProps {
     readonly client: ApiClient;
     readonly entryHost: HTMLElement;
   }

   const AccountRoot = ({ client, entryHost }: AccountRootProps) => (
     <ApiClientContext value={client}>
       <AccessGate
         requests={accessRequests}
         setShellInert={setShellInert}
         reloadDocument={reloadDocument}
       />
       <AccountMenu
         entryHost={entryHost}
         administration={AdminDialog}
         reloadDocument={reloadDocument}
       />
     </ApiClientContext>
   );

   export default AccountRoot;
   ```

4. **`main.tsx`:** después de `import '../pages/account/ui/account.css';` se agrega `import '../pages/admin/ui/admin.css';`. No cambia nada más; la llamada a `runBoot` queda igual.
5. **Correr:**
   - `npm run test:unit -- frontend/src/app/account`, en verde;
   - `npm test` y `npm run lint`;
   - `node qa/boot-check.ts`, `node qa/load-order-check.ts` y `npm run build && node qa/dist-content-check.ts`, sin cambios;
   - `E2E_PORT=4173 npm run test:e2e`: la red de la base y los cuatro E2E de la administración, en verde.
6. **Commit:** `feat(front): la administración en el taller, desde «Tu cuenta»`.

### Tarea 3.3 · La compuerta de U3 (T024, K)

- **La compuerta de 0.3,** con:
  - la red completa tres veces seguidas: `E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0`;
  - `css-contract.spec.ts` en verde: R4, R5 (ningún `.sr-only` nuevo) y el movimiento reducido (ningún `.button` nuevo antes de `#main`).
- **En el navegador,** con `npm run build && npm run preview` y una cuenta admin del doble, o con el stack (quickstart §4):
  - a 1 280, a 390 y a 320 px;
  - la entrada en «Tu cuenta»;
  - la administración a pantalla entera;
  - el teclado, de punta a punta.
- **El PR:** `feat(front): administration screens wired from «Tu cuenta», with E2E (F12a U3)`, contra `f12a/base`.

**Reversión de U3:** se revierten T023 y T022.

## 4. U4 · La documentación, el peso y el PR (onda 6: K)

**Cubre:** FR-057 y FR-061; SC-007 y SC-009.

### Tarea 4.1 · La documentación (T025, K)

Cambia en el mismo PR que U4 (FR-061):

- **`docs/architecture.md`:**
  - **el «Mapa de archivos»** suma la fila «Administración (F12a)»: `frontend/src/pages/admin/` (la página: las listas, el diálogo de acción y la contraseña a pedido, sobre `/api/admin` de C3b), `frontend/src/app/account/AdminDialog.tsx` (el contenedor de hoy, que F10 reemplaza por una ruta) y la entrada en `pages/account`;
  - **la fila de «Tu cuenta y la raíz de la cuenta»** de F11a dice que `AccountRoot` le pasa el contenedor a `AccountMenu` con la prop `administration`;
  - **el «Estado actual» de Feature-Sliced Design** suma `pages/admin`.
- **`qa/AGENTS.md`:**
  - **una fila nueva en «Elegir comprobaciones»,** «Administración», con las specs de `pages/admin`, `pages/account/ui/admin-entry.spec.tsx` y `app/account/admin-dialog.spec.tsx`, y los cuatro E2E `admin-*.spec.ts`;
  - **«Pruebas del front»:**
    - `ApiCall.search` lleva la query de cada pedido;
    - una ruta con id se registra con su propio `api.on`;
    - `AdminPage.open()` es el único método que sabe cómo se abre la administración (FR-063);
    - el portapapeles de Chromium se usa con `permissions: ['clipboard-read', 'clipboard-write']`.

**Comprobar** las rutas, los comandos y los enlaces locales de cada pasaje, y `git diff --check`. Commit: `docs: la administración de F12a en la arquitectura y en qa`.

### Tarea 4.2 · El peso, la compuerta final y el PR a `master` (T026, K)

1. **El peso** (FR-057 y SC-007). Con `npm run build`, sobre la base del paso 2 (rebasada sobre `master` si salió de `f11a/base`):
   - `html.length` de `dist/index.html`, contra T001;
   - el análisis de esbuild de quickstart.md §3, que separa los bytes de `pages/admin` y del contenedor de los del resto.

   **La condición de corte:** si la diferencia con T001 pasa de +35 000 caracteres o el total llega a `BOOT_SIZE_LIMIT` de `qa/build-check.ts` (1 500 000 desde #76), F12a no cierra. Se informa la medida y decide el usuario: achicar, subir el tope o esperar a C4 (spec, riesgo 1; research.md, R12).
2. **La compuerta de 0.3,** sobre `f12a/base` con U1 a U4, rebasada sobre `master` después de que el PR de F11a llegue ahí (si `f12a/base` salió de `f11a/base`), con:
   - la red completa cinco veces seguidas (`--repeat-each=5 --retries=0`);
   - `docker compose build taller`, con permiso;
   - la verificación a mano contra el stack (quickstart.md §4).
3. **Lo que tiene que haber hecho el usuario antes del PR a `master`:** nada nuevo; F12a no baja paquetes. Para la verificación a mano, crear el primer admin por consola (`taller:invite --role=admin`) y aceptar la invitación.
4. **El PR** de `f12a/base` a `master`: `feat(front): administration screens for accounts and link invitations (F12a)`. La descripción en inglés lleva:
   - la reversión por unidad;
   - el peso, contra T001;
   - la verificación a mano contra el stack;
   - lo que queda para F12b (el correo), F10 (la ruta) y F11b (el pedido compartido de la contraseña).

   El PR es lo que la compuerta G1 de C4 espera (F12-Q2).

**Reversión de U4:** se revierten T026 y T025.

## 5. Documentación que cambia con cada unidad

| Unidad | Qué cambia |
| --- | --- |
| U0 | research.md, «Línea base de la implementación» (T001) |
| U1, U2 y U3 | Ninguna: la documentación llega con U4, sobre la rama de integración |
| U4 | `docs/architecture.md` y `qa/AGENTS.md` (T025) |

La documentación va junta en U4 porque F12a llega a `master` en un solo PR.

## Lo que F10, F12b y F11b toman de F12a

Está en el [contrato](./contracts/admin-page.md), «Lo que hace cada ítem que sigue». En resumen:

- **F10** reemplaza `app/account/AdminDialog.tsx`, la prop `administration`, la entrada de `AccountDialog` y `AdminPage.open()` por la ruta y su enlace. Reescribe con TDD los dos escenarios de `admin-entry.spec.ts` que abren y cierran el diálogo. `pages/admin` no cambia.
- **F12b** suma la entrega por correo, `rate_limited`, `sentAt` y `sendFailedAt`, «Reenviar por correo» y «Pasar a enlace», la recuperación de un tercero y el 503 `mail_unavailable`, sobre `ActionDialog`, `reactionTo` y las listas.
- **F11b**, si llega segunda, muda `confirmPassword` y `PasswordStep` a un slice compartido, sin editar `action-dialog.spec.tsx`.

## Cobertura de requisitos

| Requisito | Tareas (la prueba que lo fija) |
| --- | --- |
| FR-001 | T007 y T008 (`admin-entry.spec.tsx`: un alumno, y un admin sin contenedor); T022 («a student has no entry…») |
| FR-002 | T003 (`reactionTo`, «explains a lost role»); T013 («offers to reload instead of retrying…»); T015 (la acción con 403); T022 (`admin-entry.spec.ts`, 403) |
| FR-003 | T020 (`.admin-dialog`); T023 (`AdminDialog` y su spec); T022 (la URL y el historial sin cambios) |
| FR-004 | T007 y T008 (el foco vuelve a la entrada); T022 (Esc y «Cerrar») |
| FR-005 | T011 (la contraseña en el mismo diálogo); T015 (el 401 cierra con «No se hizo ningún cambio.»); T022 (el 401 y el ingreso con la misma cuenta) |
| FR-006 | T012 (`useActionDialog`); T015 (el foco al botón de la fila y al título después de borrar); T017 (al título después de revocar); T022 |
| FR-007 | T022 (las regiones `alert` y `status` antes y después) |
| FR-008 | T022 (`admin-layout.spec.ts`, «keeps no name, email or link…»); research.md, R3 |
| FR-009 | T003 (`parseAdminUser`); T005 (`listUsers`); T015 («marks the own account…») |
| FR-010 | T015 («asks nothing while typing…»); T022 (diez letras, cero pedidos) |
| FR-011 | T005 (la query); T015 («goes back to the first page when a filter changes») |
| FR-012 | T013 y T014 (la página pasada del final, una vez) |
| FR-013 | T013 y T015 (vacía y «Limpiar los filtros») |
| FR-014 | T013 (la carga y «Reintentar»); T015 (conserva la búsqueda) |
| FR-015 | T003 (`actionsFor`); T015; T022 |
| FR-016 | T003 (`changeFor` y los textos); T015 (la confirmación y el PATCH); T022 |
| FR-017 | T015 y T022 (la casilla) |
| FR-018 | T015 y T022 (la fila con la cuenta del servidor y el anuncio) |
| FR-019 | T003 (`parseDeletion`); T015 y T022 (el 202 y «Borrándose») |
| FR-020 | T003 (`staleList`); T015 y T022 (el 409 `last_admin`) |
| FR-021 | T003 (`parseAdminInvitation`); T017; T022 |
| FR-022 | T017 y T022 («Admin pendiente») |
| FR-023 | T005 (`role` y `state` en la query); T013 (la paginación); `FilterSelect`, probado en T015 |
| FR-024 | T003 (`splitEmails`); T017 (comas y espacios) |
| FR-025 | T003 (`checkEmailCount`); T017 (0 y 101, sin pedido) |
| FR-026 | T005; T017; T022 (los 40, en orden) |
| FR-027 | T003 (`emailMessages`); T017 y T022 (`emails.1`) |
| FR-028 | T003 (`entryText`); T017; T022 (los cuatro resultados) |
| FR-029 | T011 (copiar uno y todos); T022 (el portapapeles real) |
| FR-030 | T011 (sin portapapeles) |
| FR-031 | T011 (la pregunta con Esc y con «Listo»); T022 |
| FR-032 | T017 y T022 (reenviar) |
| FR-033 | T017 y T022 (revocar) |
| FR-034 | T017 y T022 (la lista se vuelve a pedir) |
| FR-035 | T017 («says that there is no mail yet…») |
| FR-036 | T011 (exactamente un reintento; el segundo 423); T017 y T022 (el lote de admin) |
| FR-037 | T011 (`auth_failed` y el 429 de la confirmación); T022 |
| FR-038 | T011 (cancelar); T022 |
| FR-039 | T005 (todo por el cliente de F11a); research.md, R6 |
| FR-040 | T003; T017 y T022 (el 404 de una invitación) |
| FR-041 | T013 (la lista con 429); T015 (la acción con 429); T022 (`page.clock`) |
| FR-042 | T013 (la red en la lista); T015 (el 502 en la lista); T017 y T022 (la red al invitar) |
| FR-043 | T011 (un doble clic, un pedido); T017 («Creando…») |
| FR-050 | T019 (las secciones con el teclado); T022 (deshabilitar sólo con el teclado) |
| FR-051 | T015, T017 y T022 (los títulos de las tablas y los nombres de los botones) |
| FR-052 | T020 (`admin.css`); T022 (320 y 390 px y 16 px) |
| FR-053 | T022 (movimiento reducido) |
| FR-054 | Compuerta de 0.3, paso 4, en cada unidad |
| FR-055 | T016 (la búsqueda), T018 (invitar) y T012 (la contraseña), con React Hook Form |
| FR-056 | T026 (`git diff master -- package.json package-lock.json` vacío) |
| FR-057 | T001 y T026 |
| FR-058 | Toda tarea de código (TDD); T003 (fishery) |
| FR-059 | T009 y T022 |
| FR-060 | Compuerta de 0.3, paso 3, en cada unidad |
| FR-061 | T025 y T026 |
| FR-062 | T019 (la página sola, sin `<dialog>`); T021 (`grep`); T023 |
| FR-063 | T009 (`AdminPage.open()`); T022 |

| Criterio | Tareas |
| --- | --- |
| SC-001 | T022 (40 emails, un pedido, 40 resultados, copiar uno y todos; nada en el almacenamiento, la cookie, la URL, el historial ni la consola) |
| SC-002 | T022 (un alumno: 0 entradas y 0 pedidos; las regiones sin cambios) |
| SC-003 | La tabla siguiente |
| SC-004 | T011 (una contraseña, un reintento, cancelar sin pedido); T022 (la segunda acción no pide la contraseña) |
| SC-005 | T003 y T015 (0 acciones en la propia y en la que se borra); T015 y T022 (el 409 vuelve a pedir la página una vez); T022 (10 letras, 0 pedidos) |
| SC-006 | En parte. T022 recorre sólo con el teclado un flujo entero: de la entrada «Tu cuenta» a deshabilitar una cuenta. También cubre el foco de vuelta en cada diálogo, 320 y 390 px y el movimiento reducido. Las demás historias usan los mismos controles nativos (botones, campos, `<select>` y `<dialog>`), pero no se recorren enteras con el teclado |
| SC-007 | Compuerta de 0.3; T026 (el peso y `package.json`) |
| SC-009 | T026 |
| SC-010 | T019 (la página sola); T009 (un solo método de apertura) |

**SC-003: cada estado de «Acciones, endpoints y estados» de F12a con su prueba.** Los cuerpos salen del contrato de C3b y de `lang/es/`.

| Acción | Mientras espera | Éxito | Errores propios | Comunes (401, 403, 429, red) |
| --- | --- | --- | --- | --- |
| Ver las cuentas | T013 («Cargando…») | T013, T015 | — (el 422 de un parámetro no lo produce la interfaz) | T013 (red, 429 y 403), T015 (502) |
| Deshabilitar | T011 («Deshabilitando…») | T015, T022 | T015 y T022 (409, por el rol); T003 (`staleList`, 422 y 404) | T015 (401, 403 y 429), T022 (401, 403 y 429) |
| Rehabilitar | `ConfirmStep`, T011 | T015 (el botón pasa a «Rehabilitar»); T003 (`changeFor`) | T003 (422 y 404 con `staleList`) | Los de deshabilitar: la misma ruta y el mismo diálogo |
| Hacer admin y quitar admin | `ConfirmStep` («Guardando…») | T022 (quitar admin) | T015 y T022 (409 `last_admin`) | Los de deshabilitar |
| Borrar la cuenta | `ConfirmStep` («Borrando…») | T015 y T022 (202) | T003 (`staleList`, 409 y 404) | Los de deshabilitar |
| Ver las invitaciones | T013 | T017, T022 | — | T013 |
| Invitar | T017 («Creando…») | T017 y T022 | T017 y T022 (422 `emails.1`); T017 (0 y 101) | T017 y T022 (red); T011 (429 de la contraseña) |
| Reenviar | `ConfirmStep` («Generando…») | T017 y T022 | T017 (404) | Los de deshabilitar |
| Revocar | `ConfirmStep` («Revocando…») | T017 y T022 (204) | T022 (404) | Los de deshabilitar |
| Confirmar la contraseña | T011 («Confirmando…») | T011 y T022 (201 y un reintento) | T011 y T022 (422 `auth_failed`); T011 (429) | T011 (el 401 cierra) |

## Descargas y permisos

Ninguna. F12a no suma paquetes ni navegadores (FR-056). Docker corre sólo con permiso, en T026 (`docker compose build taller` y la verificación a mano).

## Riesgos y lo que quedó sin verificar

1. **El peso** (spec, riesgo 1). F12a se estima en unos 32 000 caracteres. Con el tope en 1 500 000 (#76), el margen creció en 250 000 sobre el que se midió al planificar (research.md, «Mediciones»). *Mitigación:* la condición de corte de T026.
2. **F11a puede llegar distinta de su plan.** *Mitigación:*
   - T001 compara las firmas reales de F11a (paso 4) y detecta las ramas B1 a B6. `messagesOf` ya acepta el error general de React Hook Form (`impl-f11a`, `show-failure.ts:8`);
   - las reglas piden usar las de la base;
   - el contrato de F12a dice qué espera de cada pieza de F11a.
3. **Los E2E no corrieron al planificar.** Necesitan F11a cableada. *Mitigación:*
   - tipan contra el doble del plan de F11a, y se revisaron contra el de `impl-f11a` (a7b3c71d), que tiene lo que usan: `search`, `on`, `reply`, `callsTo` y `signInAccount`;
   - el comportamiento de fondo se verificó en Vitest y en Chromium (research.md);
   - T024 corre la red tres veces, y T026, cinco.
4. **El cierre forzado de un `<dialog>`** (dos o tres Esc seguidos) depende del navegador. *Mitigación:* el diálogo de acción lo trata como cancelar o «Cerrar igual», y lo reabre si hay un pedido en curso (research.md, R4). Se observó en Chromium.
5. **jsdom no implementa `<dialog>` ni el foco del navegador.** *Mitigación:* el stub de las specs, y el foco y Esc en E2E (Review Focus 5).
6. **La cookie real y `confirm-password` contra el stack.** La CI no los prueba. *Mitigación:* la verificación a mano de T026 (quickstart §4).

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| Un diálogo de acción con cinco pasos (confirmar, la contraseña, el error final, los enlaces y la pregunta) | FR-005 exige que el 423 se resuelva en el mismo diálogo de la confirmación, y FR-031, que los enlaces no se cierren sin preguntar. Las dos reglas, más el 401, comparten el cierre y el foco | Un diálogo por paso: abriría dos diálogos a la vez o perdería el foco entre uno y otro, y FR-005 limita a uno |
| El contenedor como prop de `AccountMenu`, armado en `app/account` | `pages/account` no puede importar `pages/admin` (Feature-Sliced Design), y F12-Q1 pide que la entrada viva en «Tu cuenta» | Que `AccountMenu` importe `AdminPage`, como decía el contrato de F11a: rompe la regla de dependencias, y F10 tendría que desarmarlo dentro de `pages/account` |
