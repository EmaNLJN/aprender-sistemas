# Implementation Plan: F11d · Lo de D1

**Branch**: `015-f11-acceso-cuenta` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F11, en su parte d:

- **los requisitos propios:** FR-062 a FR-065, y la historia 9;
- **los transversales:** FR-066 a FR-077;
- **los criterios:** SC-004 (las filas «Computadora compartida» y «¿Este progreso es tuyo?»), SC-005, SC-007, SC-008, SC-010 (la parte de F11d) y SC-011.

Las decisiones y las mediciones están en [research-f11d.md](./research-f11d.md); la validación, en [quickstart-f11d.md](./quickstart-f11d.md), y las tareas, en [tasks-f11d.md](./tasks-f11d.md). Las interfaces que suma F11d están en la sección «Interfaces» de este plan, y T076 las pasa a [contracts/front-interfaces.md](./contracts/front-interfaces.md). El [plan de F11a](./plan.md) fija la forma y la base, y los de [F11b](./plan-f11b.md) y [F11c](./plan-f11c.md), la numeración que este sigue. El cliente que F11d consume es el de D1c: PR #93, `plan/d1c-cliente-v2` en `2e743c00`, con su contrato `specs/007-d1-progreso-sincronizacion/contracts/sync-client-d1c.md`, sin enlace hasta que el PR #93 lo lleve a `master`.

**Objetivo:** que un alumno con progreso guardado sin cuenta decida si es suyo antes de que se sume a su cuenta, y que en una computadora compartida pueda borrar lo que su cuenta guardó en el navegador y dejar de guardarlo.

**Arquitectura:**

- **«¿Este progreso es tuyo?»** es un diálogo modal que `AccountRoot` monta junto a «Tu cuenta». Lee la pregunta del motor de D1c con `useStore` y responde con `answerImport`. Al terminar, muestra el informe o el aviso.
- **«Estoy en una computadora compartida»** es una casilla de «Tu cuenta», después de «Salir». Activarla llama a un puerto chico, `SharedComputer`, que `app/` arma con `enterSharedMode()` de D1c y `forgetContentCopy()` de A3.
- **El arranque siguiente:** `afterPublish` lee la elección guardada antes de escribir la copia del contenido.

**Stack:** el de F11a: TypeScript 6.0.2, React 19.2.8 y Zustand 5.0.15. Las pruebas: Vitest 5.0.3 con jsdom 30.1.2 y Testing Library (16.3.3 y user-event 14.6.7), y Playwright 1.63.0. Ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Interfaces», las «Reglas para todos los agentes» y la sección de tu tarea. `tasks-f11d.md` tiene una línea por tarea (T060 a T077) y remite acá.
> - **Cuándo.** F11d sale de la punta de D1c U5 y llega a `master` junto con D1c U3, U4 y U5, como PR apilados que se mergean seguidos (R43). T060 lo comprueba antes de empezar.
> - **La numeración** sigue la de F11c (T054 a T059, U8): F11d son las unidades U9 y U10, con las tareas T060 a T077 (R43). Una tarea de D1c se nombra con el ítem («T020 de D1c»), porque la carpeta 015 también tiene una T020.
> - **El código verificado.** Ninguno: la base todavía no existe en una rama implementada. Se planificó leyendo D1c en su plan (PR #93), F11a en `impl-f11a` (`a7b3c71d`) y en su plan (T022 a T025), y A3 en `master`. T060 compara las firmas reales.

## Summary

- **Dos unidades, con un merge cada una, después de D1c U5** (R43):
  - **U9, «¿Este progreso es tuyo?»:** la pregunta, la repregunta del 409, el informe y la edición aprobada de un E2E de D1c;
  - **U10, «Computadora compartida»:** la opción en «Tu cuenta», el puerto que borra los datos locales de la cuenta y la guarda de `afterPublish`.
- **La pregunta espera al motor** (R47): se ve con `importQuestion` abierta y el arranque de D1c terminado, y mientras espera el sí no ofrece un segundo envío. Esc en la pregunta es «No es mío».
- **La copia de Método** (R48): ante su 409, F11d hace la repregunta con un texto propio, y el resultado lo muestra Método.
- **El final** (R49): el informe del contrato o el aviso de D1c, seguido de «Te lo volvemos a preguntar la próxima vez que abras el taller.». «Entendido» recarga después de un informe (decisión 2).
- **El registro de los datos locales** (R45): no hay registro. `SharedComputer.enter()` llama a los dos dueños en `app/`, y la pantalla no nombra a ninguno. La redacción de la spec va como hallazgo.
- **La copia del contenido no vuelve** (R46): `afterPublish` lee la elección guardada (`chooseMode`), porque corre antes que el motor, y en el modo compartido no escribe y emite `saved: false`.
- **Se puede salir del modo** (R50, decisión 1): desmarcar la casilla llama a `leaveSharedMode()`, y rige desde el próximo documento.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0.

**Primary Dependencies**: las de F11a y D1c. Ninguna nueva (R52).

**Storage:** F11d no escribe ninguna clave. Las claves las escriben sus dueños:

- D1c borra el espacio y guarda la elección, `taller-v2-compartida:<id>`;
- A3 borra su copia de IndexedDB;
- y D1c archiva las claves v1 después del sí.

**Testing:**

- **Vitest,** con los proyectos de la base (TR-6):
  - `node`, para `*.spec.ts`: la vista de la pregunta, los textos y el armado de `app/account/shared-computer.ts`;
  - `dom`, para `*.spec.tsx`, con `frontend/src/vitest.setup.ts`: los componentes.
- **Playwright,** con Page Objects contra `vite preview` y el doble de la API, con las rutas de D1c U5.

Los valores esperados salen de la spec, de http-d1b.md, de sync-client-d1c.md, de `lang/es/api.php` y de los fixtures congelados contados a mano (research-f11d.md, «Mediciones»), nunca del código que se prueba.

**Target Platform**: navegador moderno (ES2022), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web, con un diálogo nuevo en la raíz de la cuenta y una sección nueva en «Tu cuenta».

**Performance Goals**: ninguna de velocidad. El peso tiene presupuesto (R53).

**Scale/Scope:**

- en `pages/account`, 10 archivos de producción nuevos, un fixture de specs y 3 archivos cambiados, con 4 specs;
- en `app/`, 1 archivo nuevo, con su spec, y 3 cambiados;
- 2 E2E nuevos, un Page Object, un archivo de datos de E2E, un método en el Page Object de «Tu cuenta», un fixture y una línea aprobada en un E2E de D1c;
- `docs/architecture.md`, `qa/AGENTS.md` y `contracts/front-interfaces.md`.

## Restricciones globales

Valen para toda tarea. Los valores están copiados de la spec, de la constitución y de las decisiones del coordinador.

- **La red:**
  - **sin editar:** los E2E de la base de T060 (los de F1 y A2, los de F11a, los de cada port que esté y los de D1c U5), y los escenarios de `boot-check`, `dist-content-check` y `load-order-check` (FR-076);
  - **una sola edición, con la aprobación del usuario:** la línea de T067 en `qa/e2e/specs/progress-sync.spec.ts`, de D1c (R54), más lo que T060 inventaríe del mismo tipo y el usuario apruebe;
  - **lo que cambia de `qa/`:** `qa/e2e/fixtures/index.ts` (el fixture `progressQuestion`), `qa/e2e/pages/account.ts` (`sharedComputer()`) y esa línea de D1c;
  - **lo que se suma:** `qa/e2e/pages/progress-question.ts`, `qa/e2e/lib/progress-import.ts`, `qa/e2e/specs/progress-question.spec.ts` y `qa/e2e/specs/shared-computer.spec.ts`.
- **Lo que F11d no toca:**
  - **«Salir»:** `SignOutSection.tsx`, `features/sign-in/model/sign-out.ts` y la nota del FR-052 quedan como los dejan F11a, A3 y D1c. Lo que se ve de «Salir» es de F13 («El FR-068 de D1, reparto vigente», 2026-10-29);
  - **la mecánica de D1c:** el motor, la etapa y la costura, salvo el `export` de `browserEnvironment` (T070);
  - **`qa/boot-check.ts`, `qa/lib/content-server.ts`, `qa/lib/boot-harness.ts` y `qa/e2e/fixtures/api-double.ts`.**
- **Las specs de la base:** ninguna se edita.
- **El documento:**
  - mientras F11d no muestra nada, no hay ninguna región `alert` ni `status`: el diálogo existe sólo mientras se ve, y la sección sólo dibuja una región cuando tiene algo que decir;
  - ningún elemento nuevo lleva la clase `.sr-only`;
  - F11d no toca la barra superior.
- **El estilo:**
  - ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` (FR-069 y SC-011), y ninguna regla `transition` ni `animation` (FR-068);
  - las reglas nuevas van al final de `frontend/src/pages/account/ui/account.css`, con los tokens de F10c (`var(--color-line)`);
  - si T060 anota que F10c no está en la base, se usa `var(--line)`; si F15a ya entró, el coordinador pasa los estilos de la tarea a utilidades de Tailwind en su brief (F15, Q5-A).
- **La seguridad:** F11d no maneja contraseñas ni tokens, y no escribe nada en el almacenamiento (FR-070).
- **Los textos:**
  - los de la spec, «Textos que lee el alumno», «Lo de D1 (F11d)», tal cual;
  - «Sumando tu progreso…», de la tabla de estados;
  - los de research-f11d.md, «Textos que agrega el plan»;
  - los avisos de D1c, como llegan (contrato de D1c, §8).
- **La fecha** del resumen se escribe con `formatLongDate` de A3 (`shared/lib/format-long-date.ts`). Los E2E fijan `timezoneId: 'America/Argentina/Buenos_Aires'`.
- **El peso:** `dist/index.html` bajo `BOOT_SIZE_LIMIT`, que es **1 500 000** caracteres (`qa/build-check.ts`), y F11d suma como mucho **+10 000** sobre la medida de T060 (R53).
- **La complejidad:** ninguna función nueva de más de 10. Los avisos de `npm run lint` no suben respecto de T060.
- **La accesibilidad:**
  - todo se completa con el teclado (FR-066);
  - desde 320 px no hay desplazamiento horizontal, y el diálogo de la pregunta ocupa la pantalla entera hasta 590 px, como «Tu cuenta» (FR-067);
  - ningún estado depende de una animación (FR-068).
- **El backend:** no cambia. El contrato de D1b se consume a través de D1c.
- **El orden:** D1c U3 → D1c U4 → D1c U5 → F11d U9 → F11d U10, mergeados seguidos (R43).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md). Resultado antes y después del diseño: pasa. Complexity Tracking registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, Feature-Sliced Design (`app` → `pages` → `features` → `shared`), `interface` para las formas, un componente o un hook por archivo con `export default`, y un contexto acotado en lugar de prop drilling (R45). Ni nuqs ni dependencias |
| II. TDD y pruebas útiles | Sí | Cada tarea de código abre con su spec en rojo contra stubs `const` tipados (TR-2). Los esperados salen de la spec, de los contratos y de los fixtures congelados contados aparte; los estados HTTP se prueban con el motor real y el cuerpo del contrato (R51) |
| III. Código entendible | Sí | La vista de la pregunta es una función pura (`importViewOf`); el componente sólo dibuja. El puerto de la computadora compartida tiene tres miembros |
| IV. Contenido en Git, IDs estables | Sí | Ninguna URL ni ninguna clave nueva. Las claves v1 se tocan sólo con el sí, y las toca D1c (FR-072 de D1) |
| V. Capas y contratos explícitos | Sí | `pages/account` consume `features/progress-sync` por su índice; `app/account/shared-computer.ts` junta a los dueños. Las interfaces están en este plan y pasan al contrato de F11 en T076 |
| VI. Español, accesibilidad y portabilidad | Sí | Textos en rioplatense; teclado, foco, 320 px y movimiento reducido con E2E; comandos portables |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva |
| VIII. Flow-forward | Sí | `tasks-f11d.md` tiene una línea por tarea. La redacción del FR-062 va como hallazgo, no como edición de la spec |

## Decisiones que aplica este plan

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **P1:** la partición de F11 | Este plan es F11d, que espera a D1c | T060 |
| **Q5:** la computadora compartida se elige en «Tu cuenta» y borra en ese momento | La casilla en «Tu cuenta»; `enter()` borra el espacio y la copia | T069 a T074 |
| **«El FR-068 de D1, reparto vigente»** (2026-10-29) | F11d no toca «Salir»: ni `SignOutSection`, ni `signOut`, ni la nota | Restricciones globales |
| **F11d-1:** la copia de A3 en el modo compartido | `forgetContentCopy()` al activar, y `afterPublish` no escribe con la elección guardada | T070 |
| **F11d-2:** los datos locales sin nombrar sus almacenes | El puerto `SharedComputer`, armado en `app/` (R45) | T069 y T070 |
| **La entrada en servicio de D1c** (su decisión 2) | U9 y U10 se mergean justo después de D1c U3, U4 y U5 | R43 y T077 |
| **La red E2E con D1c** (R19 de D1c) | Los E2E de F11d siembran el v1 real con `seedRaw` y leen con `rawSnapshot` y `rawWrites` | T066 y T074 |
| **El doble de la API canónico** (2026-10-28, noche) | Las rutas de la importación se registran con `api.on` o `api.reply` en cada escenario; ningún `replyTo` ni otra propiedad | T066 |
| **La lista blanca `/status of NNN/`** (2026-10-28, noche) | Cada error esperado se declara con su código exacto | T066 |
| **Los stubs del rojo como `const` tipados** (TR-2) | Cada spec en rojo corre contra stubs así | T061, T063, T069 y T071 |
| **`stubDialogs` con un `showModal` que enfoca** (F11a-7) | Las specs del diálogo lo importan de `features/sign-in/ui/render-access.tsx` | T063 |
| **La guarda de `useStore`** (TR-5) | Cada `useStore` lleva su selector | T064 y T072 |
| **El tope del HTML** (2026-10-28, noche) | `BOOT_SIZE_LIMIT` de 1 500 000, con un subpresupuesto de +10 000 | T077 |
| **Los estilos** (`contracts/stylesheets-f10c.md`; F15, Q5-A) | Las reglas al final de `account.css`, con los tokens de F10c; con F15a, utilidades en el brief | T064 y T072 |

## Project Structure

### Documentation (this feature)

```text
specs/015-f11-acceso-cuenta/
├── spec.md                         # F11 entera, con su clarify
├── plan.md, research.md, quickstart.md, tasks.md   # F11a
├── plan-f11b.md, …                 # F11b
├── plan-f11c.md, …                 # F11c
├── contracts/front-interfaces.md   # las interfaces de F11 (T076 suma las de F11d)
├── plan-f11d.md                    # este archivo
├── research-f11d.md                # decisiones, consultas y mediciones de F11d
├── quickstart-f11d.md              # cómo se verifica F11d
└── tasks-f11d.md                   # T060 a T077
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
frontend/src/
├── pages/account/                                  # (M; A crea el contexto en T069)
│   ├── model/import-question-view.ts (+ .spec.ts)  # nuevo (U9): la vista pura de la pregunta y sus selectores
│   ├── model/shared-computer-context.ts            # nuevo (U10, A): el puerto SharedComputer y su contexto
│   ├── ui/local-progress-texts.ts (+ .spec.ts)     # nuevo (U9; U10 suma los textos de la opción)
│   ├── ui/progress-sync.fixture.ts                 # nuevo (U9): el doble del motor para las specs
│   ├── ui/use-import-question.ts                   # nuevo (U9): el estado de la respuesta
│   ├── ui/ImportQuestionDialog.tsx                 # nuevo (U9): lee el contexto de D1c
│   ├── ui/ImportQuestionFlow.tsx                   # nuevo (U9): el diálogo
│   ├── ui/ImportOutcomeView.tsx                    # nuevo (U9): el informe o el aviso, con «Entendido»
│   ├── ui/ImportReportSummary.tsx                  # nuevo (U9): el informe
│   ├── ui/import-question.spec.tsx                 # nuevo (U9)
│   ├── ui/SharedComputerSection.tsx                # nuevo (U10): lee los dos contextos
│   ├── ui/SharedComputerOption.tsx                 # nuevo (U10): la casilla, la confirmación y la salida
│   ├── ui/shared-computer.spec.tsx                 # nuevo (U10)
│   ├── ui/AccountDialog.tsx                        # cambia (U10): la sección después de «Salir»
│   ├── ui/account.css                              # cambia (U9 y U10): las reglas de F11d, al final
│   └── index.ts                                    # cambia (U9 y U10): ImportQuestionDialog, SharedComputerContext y SharedComputer
└── app/
    ├── account/shared-computer.ts (+ .spec.ts)     # nuevo (U10, A): createSharedComputer, appSharedComputer y keepsNoContentCopy
    ├── account/AccountRoot.tsx                     # cambia (K): el diálogo (U9) y el proveedor (U10)
    ├── boot/content-stage.ts                       # cambia (U10, A): la guarda de afterPublish
    └── progress-sync/app-progress-sync.ts          # cambia (U10, A): exporta browserEnvironment
qa/e2e/                                             # (E)
├── pages/progress-question.ts                      # nuevo (U9)
├── pages/account.ts                                # cambia (U10): sharedComputer()
├── lib/progress-import.ts                          # nuevo (U9): las respuestas de la importación
├── fixtures/index.ts                               # cambia (U9): progressQuestion
├── specs/progress-question.spec.ts                 # nuevo (U9)
├── specs/shared-computer.spec.ts                   # nuevo (U10)
└── specs/progress-sync.spec.ts                     # cambia (U9, T067, con aprobación): «No es mío» antes de «Borrar todo»
docs/architecture.md, qa/AGENTS.md                  # cambian (K, T076)
specs/015-f11-acceso-cuenta/contracts/front-interfaces.md   # cambia (K, T076)
```

**Structure Decision:** todo lo que se ve vive en `pages/account` (R44), y lo que junta a los dueños, en `app/account` (R45). Ninguna capa ni ningún slice nuevos.

## Interfaces

Lo que F11d expone y lo que consume, con firmas exactas. T076 lo pasa a `contracts/front-interfaces.md`.

**Lo que consume de D1c** (`features/progress-sync`, contrato de D1c, §2 y §3):

```ts
import {
  ProgressSyncContext, // provisto por AccountRoot desde T020 de D1c
  useProgressSync, // () => ProgressSync | null
  createMemoryStorage, // sólo en las specs
  type EnumerableStorage,
  type ImportQuestion, // { source: 'storage' | 'export'; summary: V1Summary; stage: 'offer' | 'confirm' }
  type ImportReport, // { written; omitted; replaced; conflicts }
  type ProgressSync, // state, answerImport(yes), enterSharedMode(), leaveSharedMode(), …
  type ProgressSyncState, // status, mode, importQuestion, lastImport, importNotice, busy, …
  type StorageMode, // 'browser' | 'shared' | 'blocked'
  type V1Summary, // { solvedCount: number; lastResultAt: string | null }
} from '../../features/progress-sync';

// app/progress-sync/app-progress-sync.ts (T016 de D1c; T070 exporta browserEnvironment)
export function appProgressSync(): ProgressSyncEngine;
export function chooseMode(local: EnumerableStorage | null, userId: number): StorageMode;
export const browserEnvironment: ProgressEnvironment; // localStorage(): EnumerableStorage | null
```

**Lo que consume de A3:** `forgetContentCopy(): Promise<void>` de `shared/api/content`, `formatLongDate(iso, timeZone?)` de `shared/lib/format-long-date.ts` y `afterPublish` en `app/boot/content-stage.ts`.

**Lo que suma `pages/account`:**

```ts
// Por el índice
export { default as ImportQuestionDialog } from './ui/ImportQuestionDialog'; // ({ reloadDocument(): void })
export { SharedComputerContext } from './model/shared-computer-context';
export type { SharedComputer } from './model/shared-computer-context';

// model/shared-computer-context.ts
export interface SharedComputer {
  enter(): Promise<void>; // borra los datos locales de la cuenta y deja de guardar progreso; rechaza si no pudo
  leave(): void; // el progreso vuelve a guardarse desde el próximo documento
  hasLeft(): boolean; // si este documento ya salió del modo
}
export const SharedComputerContext: React.Context<SharedComputer | null>;
export function useSharedComputer(): SharedComputer | null;
```

**Lo que suma `app/account/shared-computer.ts`:**

```ts
export interface SharedComputerOwners {
  readonly progress: Pick<ProgressSync, 'enterSharedMode' | 'leaveSharedMode'>;
  forgetContentCopy(): Promise<void>;
}
export interface ContentCopyEnvironment {
  userId(): number | null;
  localStorage(): EnumerableStorage | null;
}
export function createSharedComputer(owners: SharedComputerOwners): SharedComputer;
export function appSharedComputer(): SharedComputer; // el de la aplicación: D1c y A3
export function keepsNoContentCopy(environment?: ContentCopyEnvironment): boolean; // la elección guardada de la cuenta de la sesión
```

**Dónde se monta:**

- **`AccountRoot`** dibuja `<ImportQuestionDialog reloadDocument={reloadDocument} />` después de `<AccountMenu … />`, y envuelve `<AccountMenu … />` con `<SharedComputerContext value={appSharedComputer()}>`. Los dos quedan dentro del `ProgressSyncContext` de T020 de D1c.
- **`AccountDialog`** dibuja `<SharedComputerSection />` justo después de `<SignOutSection … />`.

## Review Focus

Lo que el revisor mira primero:

- **La red sin editar.** El diff de `qa/` toca sólo los archivos que nombran las «Restricciones globales», y la línea de T067 tiene su aprobación.
- **Nada se escribe antes del sí.** El E2E siembra el v1 real y observa las escrituras.
- **«Salir» no cambió.**
- **El orden de `enter()`:** el espacio primero, la copia después, y nada a medias si el primero falla.
- **Ningún `style=`,** ninguna transición, y el peso con su diferencia contra T060.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **El arranque que sigue a la activación escribiría la copia de nuevo** (F11d-1; R46). `contentGate` publica antes de que arranque el motor, que todavía dice `mode: 'browser'`. Lo fijan:
   - «keeps no copy when this account chose the shared computer, before the progress engine boots» (T069), que pasa la elección guardada sin ningún motor;
   - el E2E «a reload in shared mode writes no content copy again» (T074), que espera la señal `saved: false` y no encuentra la copia.
2. **Responder durante la espera de la foto** mandaría la época de la copia en blanco (R47). Lo fija «does not ask while the progress engine is still booting» (T063), que abre la pregunta con `status: null` y no ve ningún diálogo hasta que `status` cambia.
3. **Un segundo clic en «Sí, es mío»** mientras corre la importación: el motor no cierra la pregunta `offer` hasta el final, y un segundo `answerImport(true)` terminaría en `BUSY` con un aviso falso. Lo fija «a second click on «Sí, es mío» while the import runs sends nothing more» (T063), que repite el clic sobre el botón viejo.
4. **«No es mío» en la repregunta** tiene que cerrar sin aviso: el motor resuelve la primera promesa con «No se importó la copia.», que es un texto de Método. Lo fijan «closes without a notice when the second answer is no» (T063) y el E2E «closes without importing when the second answer is no» (T066).
5. **«Tu cuenta» con el motor sin arrancar, o un `enter()` que falla:** `enterSharedMode()` lanza sin sesión, y un `setItem` puede dar `QuotaExceededError`. Lo fijan «offers nothing while the progress engine has not booted» y «shows the failure and keeps the option off when the shared mode could not start» (T071).

## Reparto en paralelo

Los dueños tienen archivos disjuntos («Project Structure»). Cada uno trabaja en su worktree y entrega una rama.

- **M, «Tu cuenta»:** `pages/account`, salvo `model/shared-computer-context.ts`.
- **A, el armado:** `app/account/shared-computer.ts` y su spec, `app/boot/content-stage.ts`, el `export` de `app/progress-sync/app-progress-sync.ts`, `pages/account/model/shared-computer-context.ts` y su línea del índice.
- **E, los E2E:** los archivos de `qa/e2e`.
- **K, el coordinador:** el agente principal. Hace T060, `AccountRoot.tsx`, las compuertas, la documentación y los PR, y revisa cada diff.

M, A y E son delegables al subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»). Se les dan sus archivos, las interfaces, los valores exactos y los checks, y se les dice que no dejen comentarios salvo el de referencia que trae el código de T070.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T060, la línea base |
| 1 | M, A y E | **M:** T061 a T064. **A:** T069 y T070 (van en el PR de U10). **E:** T066, en rojo |
| 2 | K y E | **K:** T065. **E:** T067, con la aprobación. **K:** T068, la compuerta de U9 |
| 3 | M y E | **M:** T071 y T072. **E:** T074 |
| 4 | K | T073 y T075, la compuerta de U10 |
| 5 | K | T076 y T077 |

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173`, E `4195` y M `4196`.

**Integración** (R43):

- `f11d/base` sale de la punta de D1c U5, o de `master` si D1c U5 ya entró. T060 anota de dónde salió.
- U9 es un PR contra `f11d/base`, y U10 un PR apilado sobre U9. Cada uno se revierte solo.
- Los dos se mergean a `master` justo después de D1c U5, en ese orden y sin nada en el medio. Si F11d no está lista, D1c U3 no se mergea.

## Reglas para todos los agentes

Las de [plan-f11b.md](./plan-f11b.md), «Reglas para todos los agentes», valen tal cual, con estos cambios:

- **Leé** la historia 9 de la spec, FR-062 a FR-065, las filas de F11d de «Pantallas, endpoints y estados», research-f11d.md, la sección «Interfaces» de este plan, el contrato de D1c (§2 y §3) y tu tarea.
- **Los commits** usan `test(front): …`, `test(qa): …`, `feat(front): …` y `docs: …`, en español, con el trailer `Co-Authored-By` de tu modelo y sin `git push`.
- **Las specs de diálogos** usan `stubDialogs()` de `features/sign-in/ui/render-access.tsx`, en un `beforeAll`.
- **El doble del motor** de las specs es `fakeProgressSync` de `pages/account/ui/progress-sync.fixture.ts`. Las specs simulan lo que el contrato de D1c dice que hace cada acción, cambiando el estado con `store.setState`. No escribas otro doble.
- **Los E2E** siembran el v1 real con `storage.seedRaw(frozenProgress)` y leen lo real con `storage.rawSnapshot()` y `storage.rawWrites()` (D1c T023). Cada error de consola esperado va con `pageIssues.expectIssue(/status of NNN/, '…')`.
- **Sin comentarios.** Este plan pide uno solo, la referencia a F11d-1 en `shared-computer.ts`.

## 0. La línea base y la compuerta de cada unidad (coordinador K)

### Tarea 0.1 · La línea base (T060)

**Archivos:** `specs/015-f11-acceso-cuenta/research-f11d.md` (suma la sección «Línea base de la implementación»).

1. **La base.** Crear `f11d/base` desde la punta de D1c U5, o desde `master` si D1c U5 ya entró, y anotar el hash y de dónde salió.
2. **Las detecciones.** Cada una con su comando, desde la raíz del worktree. Si una que dice «F11d espera» falla, se detiene y se informa:

   | # | Qué | Comando | Si no está |
   | --- | --- | --- | --- |
   | B1 | F11a: «Tu cuenta» con «Salir» | `git grep -n "<SignOutSection" -- frontend/src/pages/account/ui/AccountDialog.tsx` | F11d espera |
   | B2 | D1c U4: `AccountRoot` provee el contexto del motor | `git grep -n "ProgressSyncContext" -- frontend/src/app/account/AccountRoot.tsx` | F11d espera |
   | B3 | D1c U3: el motor único, la elección y el accesor | `git grep -n "export function appProgressSync\|export function chooseMode\|const browserEnvironment" -- frontend/src/app/progress-sync/app-progress-sync.ts` | F11d espera. Si `browserEnvironment` ya se exporta, T070 saltea ese paso |
   | B4 | D1c: las acciones y el estado del contrato | `git grep -n "answerImport\|enterSharedMode\|leaveSharedMode\|importQuestion\|lastImport\|importNotice" -- frontend/src/features/progress-sync/model/types.ts` | F11d espera |
   | B5 | D1c: lo que exporta el índice | `git grep -n "ProgressSyncContext\|useProgressSync\|createMemoryStorage\|ImportQuestion\|ImportReport\|StorageMode\|V1Summary\|EnumerableStorage" -- frontend/src/features/progress-sync/index.ts` | Lo que falte lo suma K al índice, en un commit propio, antes de T061 |
   | B6 | A3 y D1c en `afterPublish` | `git grep -n -A3 "function afterPublish" -- frontend/src/app/boot/content-stage.ts` | F11d espera. Se anota si la primera línea es `rememberPublishedVersion(reading.version);` |
   | B7 | A3: borrar la copia y la fecha larga | `git grep -n "forgetContentCopy" -- frontend/src/shared/api/content/index.ts` y `git grep -n "export function formatLongDate" -- frontend/src/shared/lib/format-long-date.ts` | F11d espera |
   | B8 | D1c U5: la traducción del almacenamiento | `git grep -n "seedRaw\|rawSnapshot\|rawWrites" -- qa/e2e/fixtures/storage-control.ts` | F11d espera. Se anota si `seedRaw` siembra una sola vez por pestaña, como `seed` |
   | B9 | A3: las ayudas de la copia en los E2E | `git grep -n "export async function watchCopySaved\|export async function copySaved\|export async function readStoredCopy" -- qa/e2e/lib/content-copy.ts` | F11d espera |
   | B10 | F8: la importación desde Método en los E2E | `git grep -n "method:" -- qa/e2e/fixtures/index.ts`, `git grep -n "async importFile" -- qa/e2e/pages/method.ts` y `git grep -n "FROZEN_EXPORTS" -- qa/e2e/lib/method-files.ts` | F11d espera (D1c ya espera a F8) |
   | B11 | F10c: los tokens | `git grep -n -e "--color-line:" -- frontend/styles.css` | T064 y T072 usan `var(--line)` |
   | B12 | Quién más insertó en «Tu cuenta» | `git log --oneline -- frontend/src/pages/account/ui/AccountDialog.tsx` y `git grep -n "AccountActions\|onAdminister\|SyncStatus" -- frontend/src/pages/account/ui/AccountDialog.tsx` | Se anota; la inserción sigue siendo «justo después de `<SignOutSection`» |
   | B13 | `boot-check` conoce la raíz de la cuenta | `git grep -n "account-root" -- qa/lib/boot-harness.ts qa/boot-check.ts` | Se anota: sin ella, el diálogo no se dibuja en el DOM falso, y el escenario `rawStorage` de D1c no lo ejercita |
   | B14 | E2E que siembran el v1 real y después hacen clic | `git grep -n "seedRaw(" -- qa/e2e/specs` | La lista va al usuario con T067. La conocida es el escenario de «Borrar todo» de T025 de D1c |
   | B15 | Las ayudas de F11a | `git grep -n "export function stubDialogs" -- frontend/src/features/sign-in/ui/render-access.tsx`, `git grep -n "UNEXPECTED_MESSAGE" -- frontend/src/shared/ui/form/index.ts` y `git grep -n "reloadDocument" -- frontend/src/app/account/AccountRoot.tsx` | F11d espera |
   | B16 | F15a, por si los estilos pasan a utilidades | `git grep -n "tailwindcss" -- package.json` | Se anota; el coordinador ajusta los briefs de T064 y T072 |

3. **Las medidas,** con quickstart-f11d.md §1: `html.length`, los checks de `npm test`, las pruebas de Vitest, los avisos de lint y la cantidad de E2E en verde.
4. **Commit:** `docs(specs): línea base de F11d`.

### 0.2 · La compuerta de cada unidad

La corre K sobre la rama de la unidad, con quickstart-f11d.md §2, antes de abrir el PR:

- `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`, en verde;
- `node qa/boot-check.ts`, con el escenario `rawStorage` de D1c en verde y su `harness.errors` vacío;
- los E2E completos, tres veces seguidas (`--repeat-each=3 --retries=0`), y los nuevos de la unidad en verde;
- la lista de archivos de `qa/` que cambiaron, contra la de las «Restricciones globales»;
- el `grep` de estilos en línea y de transiciones, sin salida;
- los avisos de lint, sin subir respecto de T060;
- el tamaño, con su diferencia contra T060, en la descripción del PR.

Cada PR lleva título en inglés, con notación de Angular, y una descripción en inglés con el problema completo (`AGENTS.md`).

## 9. U9 · «¿Este progreso es tuyo?» (onda 1: M y E; onda 2: K y E)

**Cubre:**

- **los requisitos propios:** FR-064 y FR-065;
- **en la pantalla:** FR-066 a FR-069 y FR-074 a FR-077;
- **los criterios:** SC-004 (la fila «¿Este progreso es tuyo?»), SC-007 y SC-010 (la pregunta no escribe nada antes del sí);
- **la historia 9:** sus escenarios 2 y 3.

### Tarea 9.1 · La vista de la pregunta y los textos, en rojo (T061, M)

**Archivos:** en `frontend/src/pages/account/`:

- `model/import-question-view.ts` (los tipos y los stubs) y `model/import-question-view.spec.ts`;
- `ui/local-progress-texts.ts` (las constantes y los stubs) y `ui/local-progress-texts.spec.ts`;
- `ui/progress-sync.fixture.ts`, entero.

**Consume:** los tipos de `features/progress-sync` («Interfaces»). **Produce:** `ImportPhase`, `ImportView`, `ImportOutcome`, `IDLE`, `selectOpenQuestion`, `importViewOf`, `outcomeOf`, los textos de la pregunta, `questionText`, `writtenText`, `reasonText` y `fakeProgressSync`.

1. **`ui/progress-sync.fixture.ts`,** el doble del motor para las specs. Es infraestructura de pruebas, sin comportamiento propio:

   ```ts
   import { vi } from 'vitest';
   import { createStore } from 'zustand/vanilla';
   import type { ProgressSync, ProgressSyncState } from '../../../features/progress-sync';

   export const BOOTED_STATE: ProgressSyncState = {
     status: 'synced',
     mode: 'browser',
     unsentCount: 0,
     lostOnUnload: 0,
     clockSkewMs: null,
     rejectedCount: 0,
     accountMismatch: null,
     epochChange: null,
     importQuestion: null,
     lastImport: null,
     importNotice: null,
     busy: null,
   };

   export function fakeProgressSync(state: Partial<ProgressSyncState> = {}) {
     const store = createStore<ProgressSyncState>(() => ({ ...BOOTED_STATE, ...state }));
     const answerImport = vi.fn<(yes: boolean) => Promise<void>>(async () => undefined);
     const sync: ProgressSync = {
       state: store,
       flushNow: vi.fn(async () => ({ kind: 'sent' as const })),
       afterSignOut: vi.fn(),
       downloadUnsent: vi.fn(() => null),
       downloadEpochCopy: vi.fn(() => null),
       discardEpochCopy: vi.fn(),
       dismissEpochChange: vi.fn(),
       acknowledgeRejected: vi.fn(),
       answerImport,
       enterSharedMode: vi.fn(async () => undefined),
       leaveSharedMode: vi.fn(),
       exerciseSummary: vi.fn(() => null),
     };
     return { sync, store, answerImport };
   }
   ```

   Si T060 anotó que `ProgressSync` o `ProgressSyncState` tienen otros miembros, el objeto los suma con un `vi.fn()` o con el valor neutro del contrato, y el resto no cambia.

2. **`model/import-question-view.ts`,** con los tipos y la constante enteros, y las funciones como stubs (TR-2):

   ```ts
   import type {
     ImportQuestion,
     ImportReport,
     ProgressSyncState,
   } from '../../../features/progress-sync';

   export type ImportOutcome =
     | { readonly kind: 'report'; readonly report: ImportReport }
     | { readonly kind: 'failure'; readonly notice: string };

   export type ImportPhase =
     | { readonly kind: 'idle' }
     | { readonly kind: 'sending'; readonly declined: boolean }
     | { readonly kind: 'done'; readonly outcome: ImportOutcome };

   export type ImportView =
     | { readonly kind: 'hidden' }
     | { readonly kind: 'question'; readonly question: ImportQuestion }
     | { readonly kind: 'sending' }
     | { readonly kind: 'done'; readonly outcome: ImportOutcome };

   export const IDLE: ImportPhase = { kind: 'idle' };

   export const selectOpenQuestion: (state: ProgressSyncState) => ImportQuestion | null = () => {
     throw new Error('not implemented');
   };

   export const importViewOf: (question: ImportQuestion | null, phase: ImportPhase) => ImportView = () => {
     throw new Error('not implemented');
   };

   export const outcomeOf: (
     before: ImportReport | null,
     after: Pick<ProgressSyncState, 'lastImport' | 'importNotice'>,
     fallback: string,
   ) => ImportOutcome = () => {
     throw new Error('not implemented');
   };
   ```

3. **`model/import-question-view.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ImportQuestion, ImportReport } from '../../../features/progress-sync';
   import { BOOTED_STATE } from '../ui/progress-sync.fixture';
   import { IDLE, importViewOf, outcomeOf, selectOpenQuestion } from './import-question-view';

   const OFFER: ImportQuestion = {
     source: 'storage',
     summary: { solvedCount: 9, lastResultAt: '2026-10-04T00:22:37.290Z' },
     stage: 'offer',
   };
   const CONFIRM: ImportQuestion = { ...OFFER, stage: 'confirm' };
   const REPORT: ImportReport = { written: { exercises: 11 }, omitted: [], replaced: [], conflicts: [] };
   const UNREACHABLE = 'No se pudo importar: el taller no responde. Probá de nuevo más tarde.';

   describe('selectOpenQuestion', () => {
     it('hides the question until the boot of the progress client ends', () => {
       expect(selectOpenQuestion({ ...BOOTED_STATE, status: null, importQuestion: OFFER })).toBeNull();
       expect(selectOpenQuestion({ ...BOOTED_STATE, importQuestion: OFFER })).toBe(OFFER);
     });
   });

   describe('importViewOf', () => {
     it('shows nothing without a question nor an answer', () => {
       expect(importViewOf(null, IDLE)).toEqual({ kind: 'hidden' });
     });

     it('shows the open question', () => {
       expect(importViewOf(OFFER, IDLE)).toEqual({ kind: 'question', question: OFFER });
     });

     it('keeps waiting while the first question is still open after the yes', () => {
       expect(importViewOf(OFFER, { kind: 'sending', declined: false })).toEqual({ kind: 'sending' });
     });

     it('asks again while sending when the server wants a confirmation', () => {
       expect(importViewOf(CONFIRM, { kind: 'sending', declined: false })).toEqual({
         kind: 'question',
         question: CONFIRM,
       });
     });

     it('shows the outcome once the question is closed', () => {
       const outcome = { kind: 'report', report: REPORT } as const;
       expect(importViewOf(null, { kind: 'done', outcome })).toEqual({ kind: 'done', outcome });
     });
   });

   describe('outcomeOf', () => {
     it('is the report when the import left a new one', () => {
       expect(outcomeOf(null, { lastImport: REPORT, importNotice: 'otro' }, 'respaldo')).toEqual({
         kind: 'report',
         report: REPORT,
       });
     });

     it('is the notice when the report is the one from before', () => {
       expect(outcomeOf(REPORT, { lastImport: REPORT, importNotice: UNREACHABLE }, 'respaldo')).toEqual({
         kind: 'failure',
         notice: UNREACHABLE,
       });
     });

     it('falls back when there is no notice', () => {
       expect(outcomeOf(null, { lastImport: null, importNotice: null }, 'respaldo')).toEqual({
         kind: 'failure',
         notice: 'respaldo',
       });
     });
   });
   ```

4. **`ui/local-progress-texts.ts`,** con las constantes enteras y las funciones como stubs:

   ```ts
   import type { ImportQuestion, ImportReport } from '../../../features/progress-sync';

   export const QUESTION_TITLE = '¿Este progreso es tuyo?';
   export const ANSWER_YES = 'Sí, es mío';
   export const ANSWER_NO = 'No es mío';
   export const IMPORTING = 'Sumando tu progreso…';
   export const UNDERSTOOD = 'Entendido';
   export const IMPORT_DONE = 'Listo: sumamos este progreso a tu cuenta.';
   export const NOTHING_WRITTEN = 'Tu cuenta ya tenía todo lo que traía este progreso.';
   export const OMITTED_HEADING = 'No se guardaron estos datos:';
   export const REPLACED_HEADING =
     'Estos textos tenían caracteres que no se podían leer, y los reemplazamos:';
   export const CONFLICTS_HEADING =
     'En estos datos, tu cuenta ya tenía algo más nuevo, y lo conservamos:';
   export const ASKED_AGAIN = 'Te lo volvemos a preguntar la próxima vez que abras el taller.';

   export const questionText: (question: ImportQuestion, timeZone?: string) => string = () => {
     throw new Error('not implemented');
   };

   export const writtenText: (written: ImportReport['written']) => string = () => {
     throw new Error('not implemented');
   };

   export const reasonText: (reason: string) => string = () => {
     throw new Error('not implemented');
   };
   ```

5. **`ui/local-progress-texts.spec.ts`.** Los esperados están escritos a mano: el 9 y la fecha salen del fixture contado aparte (research-f11d.md, «Mediciones»), y lo escrito, de http-d1b.md §3.4:

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ImportQuestion } from '../../../features/progress-sync';
   import { questionText, reasonText, writtenText } from './local-progress-texts';

   const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';
   const FROM_BROWSER: ImportQuestion = {
     source: 'storage',
     summary: { solvedCount: 9, lastResultAt: '2026-10-04T00:22:37.290Z' },
     stage: 'offer',
   };

   describe('questionText', () => {
     it('writes the summary of the browser with the count and the day of the last result', () => {
       expect(questionText(FROM_BROWSER, BUENOS_AIRES)).toBe(
         'Este navegador tiene progreso guardado sin cuenta: 9 ejercicios resueltos, el último el 3 de octubre de 2026. Si es tuyo, lo sumamos a tu cuenta. Si no, queda como está.',
       );
     });

     it('writes one exercise in singular and leaves out the date it does not have', () => {
       const one = { ...FROM_BROWSER, summary: { solvedCount: 1, lastResultAt: null } };
       expect(questionText(one, BUENOS_AIRES)).toBe(
         'Este navegador tiene progreso guardado sin cuenta: 1 ejercicio resuelto. Si es tuyo, lo sumamos a tu cuenta. Si no, queda como está.',
       );
     });

     it('speaks of the chosen copy when the question comes from a file of Método', () => {
       const fromFile: ImportQuestion = { ...FROM_BROWSER, source: 'export', stage: 'confirm' };
       expect(questionText(fromFile, BUENOS_AIRES)).toBe(
         'La copia que elegiste tiene progreso guardado: 9 ejercicios resueltos, el último el 3 de octubre de 2026. Si es tuyo, lo sumamos a tu cuenta. Si no, no se importa.',
       );
     });
   });

   describe('writtenText', () => {
     it('names what was written in each of the twelve areas of the contract', () => {
       expect(
         writtenText({
           exercises: 11,
           drafts: 11,
           attempts: 11,
           campaignSeals: 9,
           campaignCheckpoints: 1,
           workshops: 1,
           workshopObjectives: 3,
           workshopSteps: 1,
           routeMarks: 4,
           routeQuiz: 1,
           routeNotes: 1,
           preferences: 1,
         }),
       ).toBe(
         'Guardamos 11 ejercicios, 11 borradores, 11 intentos, 9 sellos de campaña, 1 punto de control de campaña, 1 taller, 3 objetivos de taller, 1 paso de taller, 4 marcas del recorrido, 1 respuesta del recorrido, 1 nota y 1 preferencia.',
       );
     });

     it('follows the order of the areas and leaves out the zeros', () => {
       expect(writtenText({ routeNotes: 2, drafts: 0, exercises: 1 })).toBe(
         'Guardamos 1 ejercicio y 2 notas.',
       );
     });

     it('says the account already had everything when nothing was written', () => {
       expect(writtenText({ exercises: 0, routeMarks: 0 })).toBe(
         'Tu cuenta ya tenía todo lo que traía este progreso.',
       );
     });
   });

   describe('reasonText', () => {
     it('says each reason of the contract in words', () => {
       expect(
         ['date_out_of_range', 'newer_value_kept', 'replacement_character'].map(reasonText),
       ).toEqual([
         'la fecha está fuera de rango',
         'tu cuenta tenía un valor más nuevo',
         'tenía caracteres que no se podían leer',
       ]);
     });

     it('shows a reason it does not know as it came', () => {
       expect(reasonText('otro_motivo')).toBe('otro_motivo');
     });
   });
   ```

6. **Correr** `npm run test:unit -- frontend/src/pages/account/model frontend/src/pages/account/ui/local-progress-texts.spec.ts`. Fallan con `not implemented`, y las de la base siguen en verde.
7. **Commit:** `test(front): la vista de «¿Este progreso es tuyo?» y sus textos, en rojo`.

### Tarea 9.2 · La vista de la pregunta y los textos (T062, M)

**Archivos:** `frontend/src/pages/account/model/import-question-view.ts` y `frontend/src/pages/account/ui/local-progress-texts.ts`.

1. **`model/import-question-view.ts`.** Los tipos y `IDLE` no cambian; los tres stubs pasan a ser:

   ```ts
   const HIDDEN: ImportView = { kind: 'hidden' };
   const SENDING: ImportView = { kind: 'sending' };

   export function selectOpenQuestion(state: ProgressSyncState): ImportQuestion | null {
     return state.status === null ? null : state.importQuestion;
   }

   export function importViewOf(question: ImportQuestion | null, phase: ImportPhase): ImportView {
     if (phase.kind === 'sending') {
       return question !== null && question.stage === 'confirm' ? { kind: 'question', question } : SENDING;
     }
     if (question !== null) return { kind: 'question', question };
     if (phase.kind === 'done') return { kind: 'done', outcome: phase.outcome };
     return HIDDEN;
   }

   export function outcomeOf(
     before: ImportReport | null,
     after: Pick<ProgressSyncState, 'lastImport' | 'importNotice'>,
     fallback: string,
   ): ImportOutcome {
     if (after.lastImport !== null && after.lastImport !== before) {
       return { kind: 'report', report: after.lastImport };
     }
     return { kind: 'failure', notice: after.importNotice ?? fallback };
   }
   ```

2. **`ui/local-progress-texts.ts`.** Las constantes no cambian. Se suma el import de `formatLongDate` y de `V1Summary`, y los tres stubs pasan a ser:

   ```ts
   import type { ImportQuestion, ImportReport, V1Summary } from '../../../features/progress-sync';
   import { formatLongDate } from '../../../shared/lib/format-long-date';

   type Noun = readonly [singular: string, plural: string];

   const SOLVED: Noun = ['ejercicio resuelto', 'ejercicios resueltos'];

   const AREA_NOUNS: Readonly<Record<string, Noun>> = {
     exercises: ['ejercicio', 'ejercicios'],
     drafts: ['borrador', 'borradores'],
     attempts: ['intento', 'intentos'],
     campaignSeals: ['sello de campaña', 'sellos de campaña'],
     campaignCheckpoints: ['punto de control de campaña', 'puntos de control de campaña'],
     workshops: ['taller', 'talleres'],
     workshopObjectives: ['objetivo de taller', 'objetivos de taller'],
     workshopSteps: ['paso de taller', 'pasos de taller'],
     routeMarks: ['marca del recorrido', 'marcas del recorrido'],
     routeQuiz: ['respuesta del recorrido', 'respuestas del recorrido'],
     routeNotes: ['nota', 'notas'],
     preferences: ['preferencia', 'preferencias'],
   };

   const AREA_ORDER = Object.keys(AREA_NOUNS);

   const REASONS: Readonly<Record<string, string>> = {
     not_an_integer: 'no es un número entero',
     date_out_of_range: 'la fecha está fuera de rango',
     outside_options: 'no es una de las opciones',
     beyond_active_hints: 'pide más pistas de las que hay',
     unknown_step_position: 'el paso ya no existe',
     contradicts_transport_error: 'contradice un error de conexión',
     replacement_character: 'tenía caracteres que no se podían leer',
     newer_value_kept: 'tu cuenta tenía un valor más nuevo',
     server_attempt_kept: 'tu cuenta tenía un intento del servidor',
   };

   const LIST = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });

   function counted(count: number, [singular, plural]: Noun): string {
     return `${count} ${count === 1 ? singular : plural}`;
   }

   function solvedPhrase(summary: V1Summary, timeZone?: string): string {
     const solved = counted(summary.solvedCount, SOLVED);
     if (summary.lastResultAt === null) return solved;
     return `${solved}, el último el ${formatLongDate(summary.lastResultAt, timeZone)}`;
   }

   export function questionText(question: ImportQuestion, timeZone?: string): string {
     const solved = solvedPhrase(question.summary, timeZone);
     if (question.source === 'export') {
       return `La copia que elegiste tiene progreso guardado: ${solved}. Si es tuyo, lo sumamos a tu cuenta. Si no, no se importa.`;
     }
     return `Este navegador tiene progreso guardado sin cuenta: ${solved}. Si es tuyo, lo sumamos a tu cuenta. Si no, queda como está.`;
   }

   export function writtenText(written: ImportReport['written']): string {
     const extra = Object.keys(written).filter((area) => !AREA_ORDER.includes(area));
     const parts = [...AREA_ORDER, ...extra]
       .filter((area) => (written[area] ?? 0) > 0)
       .map((area) => counted(written[area] ?? 0, AREA_NOUNS[area] ?? [area, area]));
     if (parts.length === 0) return NOTHING_WRITTEN;
     return `Guardamos ${LIST.format(parts)}.`;
   }

   export function reasonText(reason: string): string {
     return REASONS[reason] ?? reason;
   }
   ```

3. **Correr** las dos specs de T061, en verde, y después `npm run typecheck` y `npm run lint`.
4. **Commit:** `feat(front): la vista de «¿Este progreso es tuyo?» y sus textos`.

### Tarea 9.3 · Las specs del diálogo, en rojo (T063, M)

**Archivos:** `frontend/src/pages/account/ui/ImportQuestionDialog.tsx` (stub) y `frontend/src/pages/account/ui/import-question.spec.tsx` (nueva).

**Consume:** `fakeProgressSync`, `ProgressSyncContext`, `stubDialogs`. **Produce:** el componente `ImportQuestionDialog: ({ reloadDocument }) => …`.

1. **El stub:**

   ```tsx
   import type { FunctionComponent } from 'react';

   interface ImportQuestionDialogProps {
     reloadDocument(): void;
   }

   const ImportQuestionDialog: FunctionComponent<ImportQuestionDialogProps> = () => {
     throw new Error('not implemented');
   };

   export default ImportQuestionDialog;
   ```

2. **`ui/import-question.spec.tsx`.** La fecha de las specs es mediodía en UTC, que da el mismo día en cualquier zona entre UTC−11 y UTC+11, porque el componente usa la zona del entorno. La zona fija la prueba el E2E:

   ```tsx
   import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { beforeAll, describe, expect, it, vi } from 'vitest';
   import {
     ProgressSyncContext,
     type ImportQuestion,
     type ImportReport,
     type SyncStatus,
   } from '../../../features/progress-sync';
   import { stubDialogs } from '../../../features/sign-in/ui/render-access';
   import ImportQuestionDialog from './ImportQuestionDialog';
   import { fakeProgressSync } from './progress-sync.fixture';

   const TITLE = '¿Este progreso es tuyo?';
   const OFFER: ImportQuestion = {
     source: 'storage',
     summary: { solvedCount: 9, lastResultAt: '2026-10-04T12:00:00.000Z' },
     stage: 'offer',
   };
   const CONFIRM: ImportQuestion = { ...OFFER, stage: 'confirm' };
   const FROM_FILE: ImportQuestion = { ...CONFIRM, source: 'export' };
   const SUMMARY =
     'Este navegador tiene progreso guardado sin cuenta: 9 ejercicios resueltos, el último el 4 de octubre de 2026. Si es tuyo, lo sumamos a tu cuenta. Si no, queda como está.';
   const FILE_SUMMARY =
     'La copia que elegiste tiene progreso guardado: 9 ejercicios resueltos, el último el 4 de octubre de 2026. Si es tuyo, lo sumamos a tu cuenta. Si no, no se importa.';
   const REPORT: ImportReport = {
     written: { exercises: 11, drafts: 0, routeMarks: 4 },
     omitted: [{ path: 'lab.records.rust-02.reviewAt', reason: 'date_out_of_range' }],
     replaced: [],
     conflicts: [{ path: 'lab.records.rust-06.reflection', reason: 'newer_value_kept' }],
   };
   const IMPORTED = 'Copia importada y combinada con el progreso de tu cuenta.';
   const NOT_IMPORTED = 'No se importó la copia.';
   const UNREACHABLE = 'No se pudo importar: el taller no responde. Probá de nuevo más tarde.';
   const ASKED_AGAIN = 'Te lo volvemos a preguntar la próxima vez que abras el taller.';
   const DONE = 'Listo: sumamos este progreso a tu cuenta.';

   function deferred() {
     let resolve: () => void = () => undefined;
     const promise = new Promise<void>((done) => {
       resolve = done;
     });
     return { promise, resolve };
   }

   function renderQuestion(question: ImportQuestion | null, status: SyncStatus | null = 'synced') {
     const fake = fakeProgressSync({ importQuestion: question, status });
     const reloadDocument = vi.fn<() => void>();
     render(
       <ProgressSyncContext value={fake.sync}>
         <ImportQuestionDialog reloadDocument={reloadDocument} />
       </ProgressSyncContext>,
     );
     return { ...fake, reloadDocument, user: userEvent.setup() };
   }

   const yes = () => screen.getByRole('button', { name: 'Sí, es mío' });
   const no = () => screen.getByRole('button', { name: 'No es mío' });

   beforeAll(() => {
     stubDialogs();
   });

   describe('«¿Este progreso es tuyo?»', () => {
     it('shows nothing without the progress client', () => {
       render(<ImportQuestionDialog reloadDocument={vi.fn()} />);
       expect(screen.queryByRole('dialog')).toBeNull();
     });

     it('does not ask while the progress engine is still booting', () => {
       const { store } = renderQuestion(OFFER, null);
       expect(screen.queryByRole('dialog')).toBeNull();
       act(() => {
         store.setState({ status: 'synced' });
       });
       expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument();
     });

     it('asks with the summary and the two answers, with the focus on the title', () => {
       renderQuestion(OFFER);
       expect(screen.getByRole('dialog', { name: TITLE })).toHaveTextContent(SUMMARY);
       expect(screen.getByRole('heading', { name: TITLE })).toHaveFocus();
       expect([yes(), no()]).toHaveLength(2);
     });

     it('«No es mío» answers no and closes', async () => {
       const { store, answerImport, user } = renderQuestion(OFFER);
       answerImport.mockImplementation(async () => {
         store.setState({ importQuestion: null });
       });
       await user.click(no());
       expect(answerImport).toHaveBeenCalledWith(false);
       expect(screen.queryByRole('dialog')).toBeNull();
     });

     it('takes the close of the dialog by Esc as «No es mío»', async () => {
       const { store, answerImport } = renderQuestion(OFFER);
       answerImport.mockImplementation(async () => {
         store.setState({ importQuestion: null });
       });
       const dialog = screen.getByRole('dialog', { name: TITLE }) as HTMLDialogElement;
       await act(async () => {
         dialog.close();
       });
       expect(answerImport).toHaveBeenCalledWith(false);
       expect(screen.queryByRole('dialog')).toBeNull();
     });

     it('«Sí, es mío» waits, shows the report and reloads on «Entendido»', async () => {
       const { store, answerImport, reloadDocument, user } = renderQuestion(OFFER);
       const server = deferred();
       answerImport.mockImplementation(async () => {
         await server.promise;
         store.setState({ importQuestion: null, lastImport: REPORT, importNotice: IMPORTED });
       });
       await user.click(yes());
       expect(screen.getByRole('status')).toHaveTextContent('Sumando tu progreso…');
       expect(screen.getByRole('status')).toHaveFocus();
       await act(async () => {
         server.resolve();
       });
       await screen.findByText(DONE);
       const report = screen.getByRole('status');
       expect(report).toHaveTextContent('Guardamos 11 ejercicios y 4 marcas del recorrido.');
       expect(report).toHaveTextContent('No se guardaron estos datos:');
       expect(report).toHaveTextContent('lab.records.rust-02.reviewAt: la fecha está fuera de rango');
       expect(report).toHaveTextContent('lab.records.rust-06.reflection: tu cuenta tenía un valor más nuevo');
       expect(report).not.toHaveTextContent('Estos textos tenían caracteres');
       expect(report).toHaveFocus();
       await user.click(screen.getByRole('button', { name: 'Entendido' }));
       expect(reloadDocument).toHaveBeenCalledOnce();
     });

     it('a second click on «Sí, es mío» while the import runs sends nothing more', async () => {
       const { answerImport, user } = renderQuestion(OFFER);
       answerImport.mockImplementation(() => new Promise<void>(() => undefined));
       const button = yes();
       await user.click(button);
       fireEvent.click(button);
       expect(answerImport).toHaveBeenCalledOnce();
       expect(screen.queryByRole('button', { name: 'Sí, es mío' })).toBeNull();
     });

     it('asks again without the reason when the server wants a confirmation, and sends the second yes', async () => {
       const { store, answerImport, user } = renderQuestion(OFFER);
       const server = deferred();
       answerImport.mockImplementationOnce(async () => {
         store.setState({ importQuestion: CONFIRM });
         await server.promise;
         store.setState({ importQuestion: null, lastImport: REPORT, importNotice: IMPORTED });
       });
       answerImport.mockImplementationOnce(async () => {
         store.setState({ importQuestion: null });
         server.resolve();
       });
       await user.click(yes());
       expect(await screen.findByRole('button', { name: 'Sí, es mío' })).toBeInTheDocument();
       expect(screen.getByRole('heading', { name: TITLE })).toHaveFocus();
       expect(screen.getByRole('dialog', { name: TITLE })).toHaveTextContent(SUMMARY);
       await user.click(yes());
       expect(await screen.findByText(DONE)).toBeInTheDocument();
       expect(answerImport.mock.calls).toEqual([[true], [true]]);
     });

     it('closes without a notice when the second answer is no', async () => {
       const { store, answerImport, user } = renderQuestion(OFFER);
       const server = deferred();
       answerImport.mockImplementationOnce(async () => {
         store.setState({ importQuestion: CONFIRM });
         await server.promise;
         store.setState({ importQuestion: null, importNotice: NOT_IMPORTED });
       });
       answerImport.mockImplementationOnce(async () => {
         store.setState({ importQuestion: null });
         server.resolve();
       });
       await user.click(yes());
       await user.click(await screen.findByRole('button', { name: 'No es mío' }));
       await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
       expect(screen.queryByRole('alert')).toBeNull();
       expect(answerImport.mock.calls).toEqual([[true], [false]]);
     });

     it('shows the notice of the client and that it asks again next time when the import fails', async () => {
       const { store, answerImport, reloadDocument, user } = renderQuestion(OFFER);
       answerImport.mockImplementation(async () => {
         store.setState({ importQuestion: null, importNotice: UNREACHABLE });
       });
       await user.click(yes());
       const alert = await screen.findByRole('alert');
       expect(alert).toHaveTextContent(UNREACHABLE);
       expect(alert).toHaveTextContent(ASKED_AGAIN);
       expect(alert).toHaveFocus();
       await user.click(screen.getByRole('button', { name: 'Entendido' }));
       expect(screen.queryByRole('dialog')).toBeNull();
       expect(reloadDocument).not.toHaveBeenCalled();
     });

     it('asks about the copy chosen in Método and leaves the result to Método', async () => {
       const { store, answerImport, user } = renderQuestion(FROM_FILE);
       answerImport.mockImplementation(async () => {
         store.setState({ importQuestion: null, busy: 'import' });
       });
       expect(screen.getByRole('dialog', { name: TITLE })).toHaveTextContent(FILE_SUMMARY);
       await user.click(yes());
       expect(answerImport).toHaveBeenCalledWith(true);
       expect(screen.queryByRole('dialog')).toBeNull();
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/account/ui/import-question.spec.tsx`. Todas fallan con `not implemented`, también «shows nothing without the progress client», porque el stub lanza al dibujarse.
4. **Commit:** `test(front): «¿Este progreso es tuyo?», en rojo`.

### Tarea 9.4 · El diálogo (T064, M)

**Archivos:** en `frontend/src/pages/account/`:

- `ui/use-import-question.ts`, `ui/ImportQuestionDialog.tsx`, `ui/ImportQuestionFlow.tsx`, `ui/ImportOutcomeView.tsx` y `ui/ImportReportSummary.tsx`;
- `ui/account.css` y `index.ts`.

**Consume:** T062. **Produce:** `ImportQuestionDialog` en el índice.

1. **`ui/use-import-question.ts`.** El sí de la pregunta `offer` espera la promesa entera, que en el motor resuelve al final, también después de una repregunta (R49). Los demás sí y no sólo responden:

   ```ts
   import { useState } from 'react';
   import { useStore } from 'zustand';
   import type { ProgressSync } from '../../../features/progress-sync';
   import { UNEXPECTED_MESSAGE } from '../../../shared/ui/form';
   import {
     IDLE,
     importViewOf,
     outcomeOf,
     selectOpenQuestion,
     type ImportOutcome,
     type ImportPhase,
     type ImportView,
   } from '../model/import-question-view';

   export interface ImportQuestionControls {
     readonly view: ImportView;
     answer(yes: boolean): Promise<void>;
     finish(): void;
   }

   function declining(current: ImportPhase): ImportPhase {
     return current.kind === 'sending' ? { kind: 'sending', declined: true } : current;
   }

   function afterSending(outcome: ImportOutcome) {
     return (current: ImportPhase): ImportPhase =>
       current.kind === 'sending' && current.declined ? IDLE : { kind: 'done', outcome };
   }

   async function sendOffer(sync: ProgressSync): Promise<ImportOutcome> {
     const before = sync.state.getState().lastImport;
     try {
       await sync.answerImport(true);
       return outcomeOf(before, sync.state.getState(), UNEXPECTED_MESSAGE);
     } catch {
       return { kind: 'failure', notice: UNEXPECTED_MESSAGE };
     }
   }

   const useImportQuestion = (sync: ProgressSync): ImportQuestionControls => {
     const question = useStore(sync.state, selectOpenQuestion);
     const [phase, setPhase] = useState<ImportPhase>(IDLE);
     const view = importViewOf(question, phase);

     const answer = async (yes: boolean): Promise<void> => {
       if (view.kind !== 'question') return;
       const { stage, source } = view.question;
       if (stage === 'confirm' || source === 'export') {
         if (!yes) setPhase(declining);
         await sync.answerImport(yes);
         return;
       }
       if (!yes) {
         await sync.answerImport(false);
         return;
       }
       setPhase({ kind: 'sending', declined: false });
       setPhase(afterSending(await sendOffer(sync)));
     };

     return { view, answer, finish: () => setPhase(IDLE) };
   };

   export default useImportQuestion;
   ```

2. **`ui/ImportQuestionDialog.tsx`,** que reemplaza el stub:

   ```tsx
   import { useProgressSync } from '../../../features/progress-sync';
   import ImportQuestionFlow from './ImportQuestionFlow';

   interface ImportQuestionDialogProps {
     reloadDocument(): void;
   }

   const ImportQuestionDialog = ({ reloadDocument }: ImportQuestionDialogProps) => {
     const sync = useProgressSync();
     if (sync === null) return null;
     return <ImportQuestionFlow sync={sync} reloadDocument={reloadDocument} />;
   };

   export default ImportQuestionDialog;
   ```

3. **`ui/ImportQuestionFlow.tsx`.** El diálogo escucha `onClose` y no `onCancel`, porque Chromium no deja cancelar el `cancel` de un diálogo que se abrió sin una activación del usuario (R47):

   ```tsx
   import { useEffect, useId, useRef } from 'react';
   import type { ProgressSync } from '../../../features/progress-sync';
   import ImportOutcomeView from './ImportOutcomeView';
   import { ANSWER_NO, ANSWER_YES, IMPORTING, QUESTION_TITLE, questionText } from './local-progress-texts';
   import useImportQuestion from './use-import-question';

   interface ImportQuestionFlowProps {
     readonly sync: ProgressSync;
     reloadDocument(): void;
   }

   const ImportQuestionFlow = ({ sync, reloadDocument }: ImportQuestionFlowProps) => {
     const { view, answer, finish } = useImportQuestion(sync);
     const dialog = useRef<HTMLDialogElement>(null);
     const title = useRef<HTMLHeadingElement>(null);
     const message = useRef<HTMLDivElement>(null);
     const titleId = useId();
     const step = view.kind === 'question' ? view.question.stage : view.kind;

     useEffect(() => {
       const element = dialog.current;
       if (element === null) return;
       if (!element.open) element.showModal();
       const asking = step === 'offer' || step === 'confirm';
       (asking ? title : message).current?.focus();
     }, [step]);

     if (view.kind === 'hidden') return null;

     const close = (): void => {
       if (view.kind === 'done' && view.outcome.kind === 'report') {
         reloadDocument();
         return;
       }
       finish();
     };
     const dismiss = (): void => {
       if (view.kind === 'question') {
         void answer(false);
         return;
       }
       if (view.kind === 'sending') {
         dialog.current?.showModal();
         return;
       }
       close();
     };

     return (
       <dialog ref={dialog} className="import-question-dialog" aria-labelledby={titleId} onClose={dismiss}>
         <div className="dialog-content">
           <h2 ref={title} id={titleId} tabIndex={-1}>
             {QUESTION_TITLE}
           </h2>
           {view.kind === 'question' ? (
             <>
               <p>{questionText(view.question)}</p>
               <div className="dialog-actions">
                 <button type="button" className="button dark" onClick={() => void answer(true)}>
                   {ANSWER_YES}
                 </button>
                 <button type="button" className="button secondary" onClick={() => void answer(false)}>
                   {ANSWER_NO}
                 </button>
               </div>
             </>
           ) : null}
           {view.kind === 'sending' ? (
             <div ref={message} role="status" tabIndex={-1}>
               <p>{IMPORTING}</p>
             </div>
           ) : null}
           {view.kind === 'done' ? (
             <ImportOutcomeView outcome={view.outcome} regionRef={message} onDone={close} />
           ) : null}
         </div>
       </dialog>
     );
   };

   export default ImportQuestionFlow;
   ```

4. **`ui/ImportOutcomeView.tsx`:**

   ```tsx
   import type { Ref } from 'react';
   import type { ImportOutcome } from '../model/import-question-view';
   import ImportReportSummary from './ImportReportSummary';
   import { ASKED_AGAIN, UNDERSTOOD } from './local-progress-texts';

   interface ImportOutcomeViewProps {
     readonly outcome: ImportOutcome;
     readonly regionRef: Ref<HTMLDivElement>;
     onDone(): void;
   }

   const ImportOutcomeView = ({ outcome, regionRef, onDone }: ImportOutcomeViewProps) => (
     <>
       {outcome.kind === 'report' ? (
         <div ref={regionRef} className="import-report" role="status" tabIndex={-1}>
           <ImportReportSummary report={outcome.report} />
         </div>
       ) : (
         <div ref={regionRef} className="form-server-error" role="alert" tabIndex={-1}>
           <p>{outcome.notice}</p>
           <p>{ASKED_AGAIN}</p>
         </div>
       )}
       <div className="dialog-actions">
         <button type="button" className="button dark" onClick={onDone}>
           {UNDERSTOOD}
         </button>
       </div>
     </>
   );

   export default ImportOutcomeView;
   ```

5. **`ui/ImportReportSummary.tsx`:**

   ```tsx
   import type { ImportReport } from '../../../features/progress-sync';
   import {
     CONFLICTS_HEADING,
     IMPORT_DONE,
     OMITTED_HEADING,
     REPLACED_HEADING,
     reasonText,
     writtenText,
   } from './local-progress-texts';

   interface ImportReportSummaryProps {
     readonly report: ImportReport;
   }

   const ImportReportSummary = ({ report }: ImportReportSummaryProps) => {
     const sections = [
       { heading: OMITTED_HEADING, entries: report.omitted },
       { heading: REPLACED_HEADING, entries: report.replaced },
       { heading: CONFLICTS_HEADING, entries: report.conflicts },
     ].filter((section) => section.entries.length > 0);
     return (
       <>
         <p>{IMPORT_DONE}</p>
         <p>{writtenText(report.written)}</p>
         {sections.map((section) => (
           <div key={section.heading}>
             <p>{section.heading}</p>
             <ul className="import-report-list">
               {section.entries.map((entry) => (
                 <li key={`${entry.path} ${entry.reason}`}>
                   <code>{entry.path}</code>: {reasonText(entry.reason)}
                 </li>
               ))}
             </ul>
           </div>
         ))}
       </>
     );
   };

   export default ImportReportSummary;
   ```

6. **`ui/account.css`,** al final del archivo. Sin F10c en la base (T060, B11), no cambia nada, porque estas reglas no usan colores:

   ```css
   .import-report {
     display: grid;
     gap: 10px;
   }
   .import-report p {
     margin: 0;
   }
   .import-report-list {
     margin: 0;
     padding-left: 18px;
     font-size: 13px;
     overflow-wrap: anywhere;
   }
   @media (max-width: 590px) {
     .import-question-dialog {
       width: 100%;
       max-width: none;
       height: 100%;
       max-height: none;
       margin: 0;
       border-radius: 0;
     }
   }
   ```

7. **`index.ts`** suma `export { default as ImportQuestionDialog } from './ui/ImportQuestionDialog';`, sin tocar lo que ya exporta.
8. **Correr** `npm run test:unit -- frontend/src/pages/account`, en verde, y después `npm run typecheck`, `npm run lint` (ningún aviso nuevo de `complexity`) y `npx prettier --write` sobre los archivos.
9. **Commit:** `feat(front): «¿Este progreso es tuyo?», con la repregunta y el informe`.

### Tarea 9.5 · El cableado del diálogo (T065, K)

**Archivos:** `frontend/src/app/account/AccountRoot.tsx`.

1. **El cambio,** sobre el archivo de la base (T060, B2 y B15):
   - el import de `../../pages/account` suma `ImportQuestionDialog`;
   - justo después de `<AccountMenu … />` se suma `<ImportQuestionDialog reloadDocument={reloadDocument} />`, dentro del mismo `ProgressSyncContext`.

   Con la forma que deja T020 de D1c sobre el `AccountRoot` de T025 de F11a, el árbol queda así; si la base trae otra forma, se conserva y el cambio sigue siendo sólo el import y la línea:

   ```tsx
   const AccountRoot = ({ client, entryHost }: AccountRootProps) => {
     const progressSync = appProgressSync();
     return (
       <SignOutProgressContext value={progressSync}>
         <ProgressSyncContext value={progressSync}>
           <ApiClientContext value={client}>
             <AccessGate requests={accessRequests} setShellInert={setShellInert} reloadDocument={reloadDocument} />
             <AccountMenu entryHost={entryHost} reloadDocument={reloadDocument} />
             <ImportQuestionDialog reloadDocument={reloadDocument} />
           </ApiClientContext>
         </ProgressSyncContext>
       </SignOutProgressContext>
     );
   };
   ```

2. **Correr** `npm run build`, `node qa/boot-check.ts` (el escenario `rawStorage` de D1c dibuja el diálogo si el harness conoce `#account-root`, y `harness.errors` sigue vacío) y `E2E_PORT=4173 npm run test:e2e -- specs/progress-question.spec.ts`.
3. **Commit:** `feat(front): la raíz de la cuenta pregunta por el progreso v1`.

### Tarea 9.6 · Los E2E de la pregunta, en rojo (T066, E)

**Archivos:** `qa/e2e/pages/progress-question.ts` (nuevo), `qa/e2e/lib/progress-import.ts` (nuevo), `qa/e2e/fixtures/index.ts` (suma `progressQuestion`) y `qa/e2e/specs/progress-question.spec.ts` (nuevo).

**Consume:** el doble de F11a con las rutas de D1c U5, `StorageControl` de D1c (`seedRaw`, `rawSnapshot`, `watchWrites` y `rawWrites`), `frozenProgress`, `observeReload`, `MethodPage` y `FROZEN_EXPORTS` de F8. **Produce:** `ProgressQuestionPage` y el fixture `progressQuestion`.

1. **`qa/e2e/pages/progress-question.ts`:**

   ```ts
   import type { Locator, Page } from '@playwright/test';

   const TITLE = '¿Este progreso es tuyo?';

   export class ProgressQuestionPage {
     readonly dialog: Locator;

     constructor(readonly page: Page) {
       this.dialog = page.getByRole('dialog', { name: TITLE });
     }

     title(): Locator {
       return this.dialog.getByRole('heading', { name: TITLE, exact: true });
     }

     button(name: 'Sí, es mío' | 'No es mío' | 'Entendido'): Locator {
       return this.dialog.getByRole('button', { name, exact: true });
     }

     status(): Locator {
       return this.dialog.getByRole('status');
     }

     alert(): Locator {
       return this.dialog.getByRole('alert');
     }
   }
   ```

   En `fixtures/index.ts`, `progressQuestion: ProgressQuestionPage` se suma a `Fixtures`, con `progressQuestion: async ({ page }, use) => use(new ProgressQuestionPage(page)),` y su import.

2. **`qa/e2e/lib/progress-import.ts`.** Las respuestas son las de http-d1b.md §3.4 y §6:

   ```ts
   import type { ApiReply } from '../fixtures/api-double';

   export const IMPORT_REPORT = {
     written: {
       exercises: 11,
       drafts: 11,
       attempts: 11,
       campaignSeals: 9,
       campaignCheckpoints: 1,
       workshops: 1,
       workshopObjectives: 3,
       workshopSteps: 1,
       routeMarks: 4,
       routeQuiz: 1,
       routeNotes: 1,
       preferences: 1,
     },
     omitted: [{ path: 'lab.records.rust-02.reviewAt', reason: 'date_out_of_range' }],
     replaced: [],
     conflicts: [{ path: 'lab.records.rust-06.reflection', reason: 'newer_value_kept' }],
   };

   export const IMPORTED_REPLY: ApiReply = {
     status: 201,
     json: {
       importId: '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f',
       epoch: 1,
       revision: 7,
       importedAt: '2026-10-06T12:00:00.123Z',
       report: IMPORT_REPORT,
     },
   };

   export const NEEDS_CONFIRMATION_MESSAGE =
     'Confirmá que esta copia es tuya antes de combinarla con el progreso de tu cuenta.';

   export const NEEDS_CONFIRMATION: ApiReply = {
     status: 409,
     json: { message: NEEDS_CONFIRMATION_MESSAGE, code: 'import_needs_confirmation' },
   };
   ```

3. **`qa/e2e/specs/progress-question.spec.ts`.** Cubre los escenarios 2 y 3 de la historia 9, FR-064, FR-065, la parte de F11d de SC-010 y la fila «¿Este progreso es tuyo?» de SC-004. Los textos están escritos a mano; el resumen sale del fixture contado aparte:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import type { ApiReply } from '../fixtures/api-double';
   import { STUDENT, errorBody } from '../lib/api-contract';
   import { frozenProgress } from '../lib/curriculum';
   import { observeReload } from '../lib/document-marker';
   import { FROZEN_EXPORTS } from '../lib/method-files';
   import { IMPORTED_REPLY, NEEDS_CONFIRMATION, NEEDS_CONFIRMATION_MESSAGE } from '../lib/progress-import';
   import { urls } from '../lib/urls';

   const SUMMARY =
     'Este navegador tiene progreso guardado sin cuenta: 9 ejercicios resueltos, el último el 3 de octubre de 2026. Si es tuyo, lo sumamos a tu cuenta. Si no, queda como está.';
   const FILE_SUMMARY =
     'La copia que elegiste tiene progreso guardado: 9 ejercicios resueltos, el último el 3 de octubre de 2026. Si es tuyo, lo sumamos a tu cuenta. Si no, no se importa.';
   const DONE = 'Listo: sumamos este progreso a tu cuenta.';
   const WRITTEN =
     'Guardamos 11 ejercicios, 11 borradores, 11 intentos, 9 sellos de campaña, 1 punto de control de campaña, 1 taller, 3 objetivos de taller, 1 paso de taller, 4 marcas del recorrido, 1 respuesta del recorrido, 1 nota y 1 preferencia.';
   const ASKED_AGAIN = 'Te lo volvemos a preguntar la próxima vez que abras el taller.';
   const IMPORTED = 'Copia importada y combinada con el progreso de tu cuenta.';
   const PASSWORD = 'una frase larga para el taller';
   const V1_KEYS = Object.keys(frozenProgress);
   const ARCHIVE = `taller-v1-importado:${STUDENT.id}`;

   interface ImportBody {
     source: string;
     confirm: boolean;
     epoch: number;
     importId: string;
   }

   interface Failure {
     readonly name: string;
     readonly status: number;
     readonly reply: ApiReply;
     readonly notice: string;
   }

   const FAILURES: readonly Failure[] = [
     {
       name: 'a 422 with paths',
       status: 422,
       reply: {
         status: 422,
         json: errorBody('validation_failed', {
           'normalized.lab.records.rust-02.reviewAt': ['La fecha no es válida.'],
         }),
       },
       notice: 'No se pudo importar: Hay datos que corregir.',
     },
     {
       name: 'the 413 of Nginx, which is not JSON',
       status: 413,
       reply: {
         status: 413,
         contentType: 'text/html',
         body: '<html><body><h1>413 Request Entity Too Large</h1></body></html>',
       },
       notice: 'No se pudo importar: el archivo es demasiado grande para el taller.',
     },
     {
       name: 'a 500',
       status: 500,
       reply: { status: 500, json: errorBody('server_error') },
       notice: 'No se pudo importar: el taller no responde. Probá de nuevo más tarde.',
     },
     {
       name: 'a 401',
       status: 401,
       reply: { status: 401, json: errorBody('unauthenticated') },
       notice: 'Tu sesión venció: ingresá y volvé a importar la copia.',
     },
     {
       name: 'a 409 account_mismatch',
       status: 409,
       reply: { status: 409, json: errorBody('account_mismatch') },
       notice: 'La sesión cambió de cuenta: recargá la página.',
     },
     {
       name: 'a 429',
       status: 429,
       reply: { status: 429, headers: { 'Retry-After': '3600' }, json: errorBody('too_many_requests') },
       notice: 'No se pudo importar: Demasiados intentos. Esperá un momento antes de volver a probar.',
     },
   ];

   function bodies(calls: readonly { body: unknown }[]): ImportBody[] {
     return calls.map((call) => call.body as ImportBody);
   }

   async function tabTo(page: Page, target: Locator): Promise<void> {
     for (let step = 0; step < 6; step += 1) {
       if (await target.evaluate((element) => element === document.activeElement)) return;
       await page.keyboard.press('Tab');
     }
     await expect(target).toBeFocused();
   }

   test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

   test.describe('«¿Este progreso es tuyo?» with the v1 of the browser', () => {
     test.beforeEach(async ({ storage }) => {
       await storage.seedRaw(frozenProgress);
     });

     test('asks with the summary and writes nothing before the answer (FR-064, SC-010)', async ({
       shell,
       progressQuestion,
       storage,
       api,
     }) => {
       await storage.watchWrites();
       await shell.goto(urls.view('proyecto'));
       await expect(progressQuestion.dialog).toContainText(SUMMARY);
       await expect(progressQuestion.title()).toBeFocused();
       expect(await storage.rawWrites()).toEqual([]);
       expect(await storage.rawSnapshot()).toEqual(frozenProgress);
       expect(api.callsTo('POST /api/progress/import')).toEqual([]);
     });

     test('«No es mío» imports nothing, leaves the keys and asks again in the next document', async ({
       shell,
       progressQuestion,
       storage,
       api,
       page,
     }) => {
       await shell.goto(urls.view('proyecto'));
       await progressQuestion.button('No es mío').click();
       await expect(progressQuestion.dialog).toHaveCount(0);
       expect(api.callsTo('POST /api/progress/import')).toEqual([]);
       expect(await storage.rawSnapshot()).toEqual(frozenProgress);
       await page.reload();
       await expect(progressQuestion.dialog).toContainText(SUMMARY);
     });

     test('Esc answers «No es mío»', async ({ shell, progressQuestion, api, page }) => {
       await shell.goto(urls.view('proyecto'));
       await expect(progressQuestion.title()).toBeFocused();
       await page.keyboard.press('Escape');
       await expect(progressQuestion.dialog).toHaveCount(0);
       expect(api.callsTo('POST /api/progress/import')).toEqual([]);
     });

     test('«Sí, es mío» waits, shows the report, archives the v1 keys and reloads on «Entendido» (FR-065)', async ({
       shell,
       progressQuestion,
       storage,
       api,
       page,
     }) => {
       let release: () => void = () => undefined;
       const held = new Promise<void>((resolve) => {
         release = resolve;
       });
       api.on('POST /api/progress/import', async () => {
         await held;
         return IMPORTED_REPLY;
       });
       await shell.goto(urls.view('proyecto'));
       await progressQuestion.button('Sí, es mío').click();
       await expect(progressQuestion.status()).toHaveText('Sumando tu progreso…');
       await expect(progressQuestion.status()).toBeFocused();
       release();
       await expect(progressQuestion.status()).toContainText(DONE);
       await expect(progressQuestion.status()).toContainText(WRITTEN);
       await expect(progressQuestion.status()).toContainText(
         'lab.records.rust-02.reviewAt: la fecha está fuera de rango',
       );
       await expect(progressQuestion.status()).toContainText(
         'lab.records.rust-06.reflection: tu cuenta tenía un valor más nuevo',
       );
       const [call] = api.callsTo('POST /api/progress/import');
       expect(call?.user).toBe(String(STUDENT.id));
       expect(call?.body).toMatchObject({ source: 'storage', confirm: false, epoch: 1 });
       const snapshot = await storage.rawSnapshot();
       expect(V1_KEYS.filter((key) => key in snapshot)).toEqual([]);
       expect(snapshot[ARCHIVE]).toBeDefined();
       expect(await observeReload(page, () => progressQuestion.button('Entendido').click())).toBe(true);
     });

     test('asks again without the reason on import_needs_confirmation and resends with confirm (FR-065)', async ({
       shell,
       progressQuestion,
       api,
       pageIssues,
     }) => {
       pageIssues.expectIssue(/status of 409/, 'the import asks for a confirmation');
       api.reply('POST /api/progress/import', NEEDS_CONFIRMATION, IMPORTED_REPLY);
       await shell.goto(urls.view('proyecto'));
       await progressQuestion.button('Sí, es mío').click();
       await expect(progressQuestion.button('Sí, es mío')).toBeVisible();
       await expect(progressQuestion.title()).toBeFocused();
       await expect(progressQuestion.dialog).toContainText(SUMMARY);
       await expect(progressQuestion.dialog).not.toContainText(NEEDS_CONFIRMATION_MESSAGE);
       await progressQuestion.button('Sí, es mío').click();
       await expect(progressQuestion.status()).toContainText(DONE);
       const sent = bodies(api.callsTo('POST /api/progress/import'));
       expect(sent.map((body) => body.confirm)).toEqual([false, true]);
       expect(sent[1]?.importId).toBe(sent[0]?.importId);
     });

     test('closes without importing when the second answer is no', async ({
       shell,
       progressQuestion,
       storage,
       api,
       pageIssues,
     }) => {
       pageIssues.expectIssue(/status of 409/, 'the import asks for a confirmation');
       api.reply('POST /api/progress/import', NEEDS_CONFIRMATION);
       await shell.goto(urls.view('proyecto'));
       await progressQuestion.button('Sí, es mío').click();
       await progressQuestion.button('No es mío').click();
       await expect(progressQuestion.dialog).toHaveCount(0);
       expect(api.callsTo('POST /api/progress/import')).toHaveLength(1);
       expect(await storage.rawSnapshot()).toEqual(frozenProgress);
     });

     for (const failure of FAILURES) {
       test(`says what to do after ${failure.name}, and keeps the v1 keys`, async ({
         shell,
         progressQuestion,
         storage,
         api,
         pageIssues,
       }) => {
         pageIssues.expectIssue(new RegExp(`status of ${failure.status}`), failure.name);
         api.reply('POST /api/progress/import', failure.reply);
         await shell.goto(urls.view('proyecto'));
         await progressQuestion.button('Sí, es mío').click();
         await expect(progressQuestion.alert()).toContainText(failure.notice);
         await expect(progressQuestion.alert()).toContainText(ASKED_AGAIN);
         await expect(progressQuestion.alert()).toBeFocused();
         expect(await storage.rawSnapshot()).toMatchObject(frozenProgress);
         await progressQuestion.button('Entendido').click();
         await expect(progressQuestion.dialog).toHaveCount(0);
       });
     }

     test('renews the page token on a 419 and imports on the retry', async ({
       shell,
       progressQuestion,
       api,
       pageIssues,
     }) => {
       pageIssues.expectIssue(/status of 419/, 'the page token expired once');
       api.reply('POST /api/progress/import', { status: 419, json: errorBody('csrf_token_mismatch') }, IMPORTED_REPLY);
       await shell.goto(urls.view('proyecto'));
       await progressQuestion.button('Sí, es mío').click();
       await expect(progressQuestion.status()).toContainText(DONE);
       expect(api.callsTo('POST /api/progress/import')).toHaveLength(2);
     });

     test.describe('at 320 px', () => {
       test.use({ viewport: { width: 320, height: 760 } });

       test('answers with the keyboard alone, without sideways scrolling', async ({
         shell,
         progressQuestion,
         api,
         page,
       }) => {
         await shell.goto(urls.view('proyecto'));
         await expect(progressQuestion.title()).toBeFocused();
         expect(
           await progressQuestion.dialog.evaluate((element) => element.scrollWidth - element.clientWidth),
         ).toBeLessThanOrEqual(0);
         await tabTo(page, progressQuestion.button('No es mío'));
         await page.keyboard.press('Enter');
         await expect(progressQuestion.dialog).toHaveCount(0);
         expect(api.callsTo('POST /api/progress/import')).toEqual([]);
       });
     });

     test.describe('after signing in', () => {
       test.use({ sessionAccount: null });

       test('asks once the boot goes on after the sign-in (FR-064)', async ({ access, progressQuestion, page }) => {
         await page.goto(urls.view('proyecto'));
         await access.signIn(STUDENT.email, PASSWORD);
         await expect(progressQuestion.dialog).toContainText(SUMMARY);
       });
     });
   });

   test.describe('a copy imported from Método', () => {
     test('asks again with the chosen copy on import_needs_confirmation, and Método says the result', async ({
       shell,
       method,
       progressQuestion,
       api,
       pageIssues,
     }) => {
       pageIssues.expectIssue(/status of 409/, 'the import asks for a confirmation');
       api.reply('POST /api/progress/import', NEEDS_CONFIRMATION, IMPORTED_REPLY);
       await shell.goto(urls.view('metodo'));
       await method.importFile(FROZEN_EXPORTS.master2a278ad);
       await expect(progressQuestion.dialog).toContainText(FILE_SUMMARY);
       await progressQuestion.button('Sí, es mío').click();
       await expect(progressQuestion.dialog).toHaveCount(0);
       await expect(shell.toast).toHaveText(IMPORTED);
       expect(
         bodies(api.callsTo('POST /api/progress/import')).map(({ source, confirm }) => ({ source, confirm })),
       ).toEqual([
         { source: 'export', confirm: false },
         { source: 'export', confirm: true },
       ]);
     });
   });
   ```

   Si T060 anotó otra firma (`access.signIn`, `method.importFile`, `FROZEN_EXPORTS` o `shell.goto`), el escenario usa la real sin cambiar lo que afirma.

4. **Correr** `npm run build && E2E_PORT=4195 npm run test:e2e -- specs/progress-question.spec.ts`. Antes de T064 y T065 fallan todos por la razón esperada: no aparece ningún diálogo «¿Este progreso es tuyo?». Después, todo en verde.
5. **Commit:** `test(qa): E2E de «¿Este progreso es tuyo?», en rojo`.

### Tarea 9.7 · La edición aprobada del E2E de D1c (T067, E)

**Archivos:** `qa/e2e/specs/progress-sync.spec.ts` (T025 de D1c) y, si T060 inventarió otros, los que el usuario apruebe.

**Antes de empezar:** el usuario aprueba la lista de T060 (B14). Sin la aprobación, la tarea no corre y la compuerta de U9 no pasa.

1. **El cambio.** En el escenario de «Borrar todo» de T025 de D1c (el que siembra `seedRaw(frozenProgress)` y afirma que las claves v1 quedan), se suma `progressQuestion` a los parámetros del escenario y, justo después de la primera navegación que arranca el taller, esta línea:

   ```ts
   await progressQuestion.button('No es mío').click();
   ```

   Nada más cambia: ni lo que siembra, ni lo que hace en Método, ni lo que afirma.
2. **TDD.** Contra la base sin F11d (la punta de D1c U5), el escenario editado falla por la razón esperada: no hay diálogo «¿Este progreso es tuyo?». Con U9, pasa.
3. **Correr** `npm run build && E2E_PORT=4195 npm run test:e2e -- specs/progress-sync.spec.ts`.
4. **Commit,** uno por archivo: `test(qa): progress-sync responde «No es mío» antes de «Borrar todo» (F11d)`. El PR de U9 lo declara con su aprobación.

### Tarea 9.8 · La compuerta de U9 (T068, K)

La de 0.2, con:

- `progress-question.spec.ts` y el `progress-sync.spec.ts` editado, en verde, y la red de la base también, tres veces seguidas;
- en el navegador, a 1 280 y a 390 px, la pregunta con el v1 congelado, el informe con el doble y el cierre con Esc;
- el PR `feat(front): ask whether the browser's v1 progress is yours (F11d U9)`, contra `f11d/base`.

**Reversión de U9:** se revierten T067, T065, T064, T063, T062 y T061, en ese orden. T066 se revierte con ellos.

## 10. U10 · «Computadora compartida» (onda 1: A; onda 3: M y E; onda 4: K)

**Cubre:**

- **los requisitos propios:** FR-062 y FR-063, y F11d-1;
- **en la pantalla:** FR-066 a FR-070 y FR-074 a FR-077;
- **los criterios:** SC-004 (la fila «Computadora compartida») y SC-010 (el espacio y la copia vacíos en el momento, y 0 claves de progreso al cerrar la pestaña);
- **la historia 9:** su escenario 1.

### Tarea 10.1 · El puerto y la guarda, en rojo (T069, A)

**Archivos:**

- `frontend/src/pages/account/model/shared-computer-context.ts` (nuevo, entero) y su línea en `frontend/src/pages/account/index.ts`;
- `frontend/src/app/account/shared-computer.ts` (stubs) y `frontend/src/app/account/shared-computer.spec.ts` (nueva).

**Consume:** `chooseMode` y `browserEnvironment` de D1c (T016), `forgetContentCopy` de A3, `sessionStore`. **Produce:** las interfaces de «Interfaces».

1. **`pages/account/model/shared-computer-context.ts`,** entero, porque es un contrato sin comportamiento:

   ```ts
   import { createContext, useContext } from 'react';

   export interface SharedComputer {
     enter(): Promise<void>;
     leave(): void;
     hasLeft(): boolean;
   }

   export const SharedComputerContext = createContext<SharedComputer | null>(null);

   export function useSharedComputer(): SharedComputer | null {
     return useContext(SharedComputerContext);
   }
   ```

   El índice de `pages/account` suma:

   ```ts
   export { SharedComputerContext } from './model/shared-computer-context';
   export type { SharedComputer } from './model/shared-computer-context';
   ```

2. **`app/account/shared-computer.ts`,** con las interfaces enteras y las funciones como stubs:

   ```ts
   import type { EnumerableStorage, ProgressSync } from '../../features/progress-sync';
   import type { SharedComputer } from '../../pages/account';

   export interface SharedComputerOwners {
     readonly progress: Pick<ProgressSync, 'enterSharedMode' | 'leaveSharedMode'>;
     forgetContentCopy(): Promise<void>;
   }

   export interface ContentCopyEnvironment {
     userId(): number | null;
     localStorage(): EnumerableStorage | null;
   }

   export const createSharedComputer: (owners: SharedComputerOwners) => SharedComputer = () => {
     throw new Error('not implemented');
   };

   export const appSharedComputer: () => SharedComputer = () => {
     throw new Error('not implemented');
   };

   export const keepsNoContentCopy: (environment?: ContentCopyEnvironment) => boolean = () => {
     throw new Error('not implemented');
   };
   ```

3. **`app/account/shared-computer.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createMemoryStorage } from '../../features/progress-sync';
   import { createSharedComputer, keepsNoContentCopy, type SharedComputerOwners } from './shared-computer';

   function recordingOwners(): { events: string[]; owners: SharedComputerOwners } {
     const events: string[] = [];
     return {
       events,
       owners: {
         progress: {
           enterSharedMode: async () => {
             events.push('progress space');
           },
           leaveSharedMode: () => {
             events.push('progress choice');
           },
         },
         forgetContentCopy: async () => {
           events.push('content copy');
         },
       },
     };
   }

   function storageWithChoiceOf(userId: number) {
     const local = createMemoryStorage();
     local.setItem(`taller-v2-compartida:${userId}`, '1');
     return local;
   }

   describe('createSharedComputer', () => {
     it('clears the progress space and then the content copy (FR-062)', async () => {
       const { events, owners } = recordingOwners();
       await createSharedComputer(owners).enter();
       expect(events).toEqual(['progress space', 'content copy']);
     });

     it('keeps the content copy when the progress space could not be cleared', async () => {
       const { events, owners } = recordingOwners();
       const failing: SharedComputerOwners = {
         ...owners,
         progress: {
           ...owners.progress,
           enterSharedMode: async () => {
             throw new Error('QuotaExceededError');
           },
         },
       };
       await expect(createSharedComputer(failing).enter()).rejects.toThrow('QuotaExceededError');
       expect(events).toEqual([]);
     });

     it('remembers that this document left the mode', () => {
       const { events, owners } = recordingOwners();
       const computer = createSharedComputer(owners);
       expect(computer.hasLeft()).toBe(false);
       computer.leave();
       expect([computer.hasLeft(), events]).toEqual([true, ['progress choice']]);
     });
   });

   describe('keepsNoContentCopy (F11d-1)', () => {
     it('keeps no copy when this account chose the shared computer, before the progress engine boots', () => {
       const local = storageWithChoiceOf(41);
       expect(keepsNoContentCopy({ userId: () => 41, localStorage: () => local })).toBe(true);
     });

     it('keeps the copy for another account of the same browser', () => {
       const local = storageWithChoiceOf(41);
       expect(keepsNoContentCopy({ userId: () => 7, localStorage: () => local })).toBe(false);
     });

     it('keeps the copy when the storage is blocked or there is no account', () => {
       expect(keepsNoContentCopy({ userId: () => 41, localStorage: () => null })).toBe(false);
       expect(keepsNoContentCopy({ userId: () => null, localStorage: () => storageWithChoiceOf(41) })).toBe(
         false,
       );
     });
   });
   ```

4. **Correr** `npm run test:unit -- frontend/src/app/account`. Fallan con `not implemented`.
5. **Commit:** `test(front): el puerto de la computadora compartida y la guarda de la copia, en rojo`.

### Tarea 10.2 · El puerto, la guarda y `afterPublish` (T070, A)

**Archivos:** `frontend/src/app/account/shared-computer.ts`, `frontend/src/app/progress-sync/app-progress-sync.ts` y `frontend/src/app/boot/content-stage.ts`.

1. **`app/progress-sync/app-progress-sync.ts`** (salvo que T060, B3, ya lo encontrara exportado): `const browserEnvironment: ProgressEnvironment = {` pasa a `export const browserEnvironment: ProgressEnvironment = {`. Nada más cambia.
2. **`app/account/shared-computer.ts`,** con las interfaces de T069 y estas funciones en lugar de los stubs:

   ```ts
   import { sessionStore } from '../../entities/session';
   import type { EnumerableStorage, ProgressSync } from '../../features/progress-sync';
   import type { SharedComputer } from '../../pages/account';
   import { forgetContentCopy } from '../../shared/api/content';
   import { appProgressSync, browserEnvironment, chooseMode } from '../progress-sync/app-progress-sync';

   export interface SharedComputerOwners {
     readonly progress: Pick<ProgressSync, 'enterSharedMode' | 'leaveSharedMode'>;
     forgetContentCopy(): Promise<void>;
   }

   export interface ContentCopyEnvironment {
     userId(): number | null;
     localStorage(): EnumerableStorage | null;
   }

   export function createSharedComputer(owners: SharedComputerOwners): SharedComputer {
     let left = false;
     return {
       async enter() {
         await owners.progress.enterSharedMode();
         await owners.forgetContentCopy();
       },
       leave() {
         owners.progress.leaveSharedMode();
         left = true;
       },
       hasLeft: () => left,
     };
   }

   let shared: SharedComputer | null = null;

   export function appSharedComputer(): SharedComputer {
     shared ??= createSharedComputer({ progress: appProgressSync(), forgetContentCopy });
     return shared;
   }

   const browserCopyEnvironment: ContentCopyEnvironment = {
     userId: () => sessionStore.getState().user?.id ?? null,
     localStorage: () => browserEnvironment.localStorage(),
   };

   // F11d-1: the content gate publishes before the progress stage boots, so the choice is read from storage.
   export function keepsNoContentCopy(environment: ContentCopyEnvironment = browserCopyEnvironment): boolean {
     const userId = environment.userId();
     if (userId === null) return false;
     return chooseMode(environment.localStorage(), userId) === 'shared';
   }
   ```

3. **`app/boot/content-stage.ts`.** Suma el import `import { keepsNoContentCopy } from '../account/shared-computer';` y, en `afterPublish`, después de la rama de la copia sin servidor, la guarda. Con las líneas de A3 y de D1c (T060, B6), la función queda así:

   ```ts
   function afterPublish(reading: ContentReading): void {
     rememberPublishedVersion(reading.version);
     if (reading.origin === 'offline-copy') {
       showCopyNotice(reading.confirmedAt);
       return;
     }
     if (keepsNoContentCopy()) {
       announceCopySaved(false);
       return;
     }
     void contentCopies.write(copyOf(reading)).then(announceCopySaved);
   }
   ```

   Si la base trae otras líneas en `afterPublish`, se conservan en su orden, y la guarda va justo antes de `contentCopies.write`.
4. **Correr** `npm run test:unit -- frontend/src/app`, en verde, `npm run typecheck`, `npm run lint`, `node qa/seams-guard-check.ts` y `node qa/load-order-check.ts`.
5. **Commit:** `feat(front): la computadora compartida borra los datos locales de la cuenta y la copia no vuelve`.

### Tarea 10.3 · Las specs de la opción, en rojo (T071, M)

**Archivos:** `frontend/src/pages/account/ui/SharedComputerSection.tsx` (stub) y `frontend/src/pages/account/ui/shared-computer.spec.tsx` (nueva).

**Consume:** `fakeProgressSync`, `ProgressSyncContext`, `SharedComputerContext` (T069). **Produce:** el componente `SharedComputerSection`, sin props.

1. **El stub:**

   ```tsx
   import type { FunctionComponent } from 'react';

   const SharedComputerSection: FunctionComponent = () => {
     throw new Error('not implemented');
   };

   export default SharedComputerSection;
   ```

2. **`ui/shared-computer.spec.tsx`:**

   ```tsx
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { describe, expect, it, vi } from 'vitest';
   import { ProgressSyncContext, type ProgressSyncState } from '../../../features/progress-sync';
   import { SharedComputerContext, type SharedComputer } from '../model/shared-computer-context';
   import { fakeProgressSync } from './progress-sync.fixture';
   import SharedComputerSection from './SharedComputerSection';

   const OPTION = 'Estoy en una computadora compartida';
   const HINT =
     'No guardamos tu progreso en este navegador: lo que no llegue al servidor se pierde al cerrar la pestaña.';
   const WARNING =
     'Al activarla, borramos de este navegador lo que guardó tu cuenta, también lo que todavía no llegó al servidor, y la copia del contenido del taller.';
   const BLOCKED =
     'Este navegador no deja guardar datos: el taller funciona como en una computadora compartida.';
   const LEFT =
     'Listo: desde la próxima vez que abras el taller, tu progreso se guarda en este navegador.';
   const FAILED = 'No pudimos activar el modo compartido. Probá de nuevo.';

   function renderSection(state: Partial<ProgressSyncState>, hasLeft = false) {
     const fake = fakeProgressSync(state);
     const computer = {
       enter: vi.fn<() => Promise<void>>(async () => {
         fake.store.setState({ mode: 'shared' });
       }),
       leave: vi.fn<() => void>(),
       hasLeft: vi.fn<() => boolean>(() => hasLeft),
     } satisfies SharedComputer;
     render(
       <ProgressSyncContext value={fake.sync}>
         <SharedComputerContext value={computer}>
           <SharedComputerSection />
         </SharedComputerContext>
       </ProgressSyncContext>,
     );
     return { ...fake, computer, user: userEvent.setup() };
   }

   const option = () => screen.getByRole('checkbox', { name: OPTION });

   describe('«Estoy en una computadora compartida»', () => {
     it('offers nothing while the progress engine has not booted', () => {
       renderSection({ status: null });
       expect(screen.queryByRole('checkbox', { name: OPTION })).toBeNull();
     });

     it('offers nothing without the shared computer port', () => {
       const fake = fakeProgressSync();
       render(
         <ProgressSyncContext value={fake.sync}>
           <SharedComputerSection />
         </ProgressSyncContext>,
       );
       expect(screen.queryByRole('checkbox', { name: OPTION })).toBeNull();
     });

     it('offers the option unchecked, with what it means', () => {
       renderSection({ mode: 'browser' });
       expect(option()).not.toBeChecked();
       expect(option()).toHaveAccessibleDescription(HINT);
     });

     it('says what is lost before activating, and «Cancelar» clears nothing', async () => {
       const { computer, user } = renderSection({ mode: 'browser' });
       await user.click(option());
       expect(screen.getByText(WARNING)).toHaveFocus();
       expect(option()).not.toBeChecked();
       await user.click(screen.getByRole('button', { name: 'Cancelar' }));
       expect(computer.enter).not.toHaveBeenCalled();
       expect(screen.queryByText(WARNING)).toBeNull();
       expect(option()).toHaveFocus();
     });

     it('«Activar y borrar» clears the local data of the account and marks the option', async () => {
       const { computer, user } = renderSection({ mode: 'browser' });
       await user.click(option());
       await user.click(screen.getByRole('button', { name: 'Activar y borrar' }));
       expect(computer.enter).toHaveBeenCalledOnce();
       expect(option()).toBeChecked();
       expect(option()).toHaveFocus();
       expect(screen.queryByText(WARNING)).toBeNull();
     });

     it('shows the failure and keeps the option off when the shared mode could not start', async () => {
       const { computer, user } = renderSection({ mode: 'browser' });
       computer.enter.mockRejectedValueOnce(new Error('QuotaExceededError'));
       await user.click(option());
       await user.click(screen.getByRole('button', { name: 'Activar y borrar' }));
       expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
       expect(option()).not.toBeChecked();
     });

     it('unchecking it leaves the mode from the next document', async () => {
       const { computer, user } = renderSection({ mode: 'shared' });
       expect(option()).toBeChecked();
       await user.click(option());
       expect(computer.leave).toHaveBeenCalledOnce();
       expect(screen.getByRole('status')).toHaveTextContent(LEFT);
       expect(screen.getByRole('status')).toHaveFocus();
       expect(screen.queryByRole('checkbox', { name: OPTION })).toBeNull();
     });

     it('remembers in this document that the account left the mode', () => {
       renderSection({ mode: 'shared' }, true);
       expect(screen.getByRole('status')).toHaveTextContent(LEFT);
       expect(screen.queryByRole('checkbox', { name: OPTION })).toBeNull();
     });

     it('says that the taller works as on a shared computer when the storage is blocked (FR-063)', () => {
       renderSection({ mode: 'blocked' });
       expect(screen.getByText(BLOCKED)).toBeInTheDocument();
       expect(screen.queryByRole('checkbox', { name: OPTION })).toBeNull();
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/account/ui/shared-computer.spec.tsx`. Fallan con `not implemented`.
4. **Commit:** `test(front): la opción «Estoy en una computadora compartida», en rojo`.

### Tarea 10.4 · La opción en «Tu cuenta» (T072, M)

**Archivos:** en `frontend/src/pages/account/ui/`: `SharedComputerSection.tsx`, `SharedComputerOption.tsx` (nuevo), `local-progress-texts.ts`, `AccountDialog.tsx` y `account.css`.

1. **`local-progress-texts.ts`** suma, al final de las constantes:

   ```ts
   export const SHARED_OPTION = 'Estoy en una computadora compartida';
   export const SHARED_HINT =
     'No guardamos tu progreso en este navegador: lo que no llegue al servidor se pierde al cerrar la pestaña.';
   export const SHARED_WARNING =
     'Al activarla, borramos de este navegador lo que guardó tu cuenta, también lo que todavía no llegó al servidor, y la copia del contenido del taller.';
   export const ACTIVATE = 'Activar y borrar';
   export const CANCEL = 'Cancelar';
   export const STORAGE_BLOCKED =
     'Este navegador no deja guardar datos: el taller funciona como en una computadora compartida.';
   export const SHARED_LEFT =
     'Listo: desde la próxima vez que abras el taller, tu progreso se guarda en este navegador.';
   export const SHARED_FAILED = 'No pudimos activar el modo compartido. Probá de nuevo.';
   ```

2. **`SharedComputerSection.tsx`,** que reemplaza el stub:

   ```tsx
   import { useProgressSync } from '../../../features/progress-sync';
   import { useSharedComputer } from '../model/shared-computer-context';
   import SharedComputerOption from './SharedComputerOption';

   const SharedComputerSection = () => {
     const sync = useProgressSync();
     const sharedComputer = useSharedComputer();
     if (sync === null || sharedComputer === null) return null;
     return <SharedComputerOption sync={sync} sharedComputer={sharedComputer} />;
   };

   export default SharedComputerSection;
   ```

3. **`SharedComputerOption.tsx`.** La casilla está controlada por el modo del motor; marcarla en `browser` abre la confirmación, y desmarcarla en `shared` sale del modo (R50):

   ```tsx
   import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
   import { useStore } from 'zustand';
   import type { ProgressSync, ProgressSyncState, StorageMode } from '../../../features/progress-sync';
   import type { SharedComputer } from '../model/shared-computer-context';
   import {
     ACTIVATE,
     CANCEL,
     SHARED_FAILED,
     SHARED_HINT,
     SHARED_LEFT,
     SHARED_OPTION,
     SHARED_WARNING,
     STORAGE_BLOCKED,
   } from './local-progress-texts';

   type Step = 'idle' | 'confirming' | 'entering' | 'failed' | 'left';

   interface SharedComputerOptionProps {
     readonly sync: ProgressSync;
     readonly sharedComputer: SharedComputer;
   }

   const selectBootedMode = (state: ProgressSyncState): StorageMode | null =>
     state.status === null ? null : state.mode;

   const SharedComputerOption = ({ sync, sharedComputer }: SharedComputerOptionProps) => {
     const mode = useStore(sync.state, selectBootedMode);
     const [step, setStep] = useState<Step>('idle');
     const option = useRef<HTMLInputElement>(null);
     const message = useRef<HTMLParagraphElement>(null);
     const id = useId();

     useEffect(() => {
       if (step === 'confirming' || step === 'left') message.current?.focus();
     }, [step]);

     if (mode === null) return null;
     if (mode === 'blocked') {
       return (
         <div className="account-shared-computer">
           <p className="form-hint">{STORAGE_BLOCKED}</p>
         </div>
       );
     }
     if (step === 'left' || (mode === 'shared' && sharedComputer.hasLeft())) {
       return (
         <div className="account-shared-computer">
           <p ref={message} role="status" tabIndex={-1}>
             {SHARED_LEFT}
           </p>
         </div>
       );
     }

     const backToOption = (next: Step): void => {
       setStep(next);
       option.current?.focus();
     };
     const choose = (event: ChangeEvent<HTMLInputElement>): void => {
       if (mode === 'browser' && event.target.checked) setStep('confirming');
       if (mode === 'shared' && !event.target.checked) {
         sharedComputer.leave();
         setStep('left');
       }
     };
     const activate = async (): Promise<void> => {
       setStep('entering');
       try {
         await sharedComputer.enter();
         backToOption('idle');
       } catch {
         backToOption('failed');
       }
     };
     const confirming = step === 'confirming' || step === 'entering';

     return (
       <div className="account-shared-computer">
         <div className="form-check">
           <input
             ref={option}
             id={id}
             type="checkbox"
             checked={mode === 'shared'}
             aria-describedby={`${id}-hint`}
             onChange={choose}
           />
           <label htmlFor={id}>{SHARED_OPTION}</label>
         </div>
         <p id={`${id}-hint`} className="form-hint">
           {SHARED_HINT}
         </p>
         {confirming ? (
           <div className="account-shared-confirm">
             <p ref={message} tabIndex={-1}>
               {SHARED_WARNING}
             </p>
             <div className="form-actions">
               <button
                 type="button"
                 className="button dark"
                 disabled={step === 'entering'}
                 onClick={() => void activate()}
               >
                 {ACTIVATE}
               </button>
               <button
                 type="button"
                 className="button secondary"
                 disabled={step === 'entering'}
                 onClick={() => backToOption('idle')}
               >
                 {CANCEL}
               </button>
             </div>
           </div>
         ) : null}
         {step === 'failed' ? (
           <p className="form-server-error" role="alert">
             {SHARED_FAILED}
           </p>
         ) : null}
       </div>
     );
   };

   export default SharedComputerOption;
   ```

4. **`AccountDialog.tsx`.** Suma `import SharedComputerSection from './SharedComputerSection';` y, justo después de `<SignOutSection … />`, la línea `<SharedComputerSection />`. Con la versión de T023 de F11a, el contenido del diálogo queda así; lo que hayan sumado F11b, F12a o F13 (T060, B12) se conserva tal cual, y el cambio sigue siendo sólo el import y la línea:

   ```tsx
   <div className="dialog-content">
     <h2 id={titleId}>Tu cuenta</h2>
     <p className="account-identity">
       {account.name} · {account.email}
     </p>
     <button type="button" className="text-button" onClick={() => setPrivacyOpen(true)}>
       Aviso de privacidad
     </button>
     <SignOutSection userId={account.id} reloadDocument={reloadDocument} />
     <SharedComputerSection />
     <div className="dialog-actions">
       <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>
         Volver al taller
       </button>
     </div>
   </div>
   ```

5. **`account.css`,** al final del archivo. Sin F10c (T060, B11), `var(--line)`:

   ```css
   .account-shared-computer {
     display: grid;
     gap: 10px;
     margin-top: 24px;
     padding-top: 20px;
     border-top: 1px solid var(--color-line);
   }
   .account-shared-computer p {
     margin: 0;
   }
   .account-shared-confirm {
     display: grid;
     gap: 12px;
   }
   ```

6. **Correr** `npm run test:unit -- frontend/src/pages/account`, en verde (también las specs de «Tu cuenta» de F11a y F11b), y después `npm run typecheck`, `npm run lint` y `npx prettier --write` sobre los archivos.
7. **Commit:** `feat(front): «Estoy en una computadora compartida» en «Tu cuenta»`.

### Tarea 10.5 · El cableado del puerto (T073, K)

**Archivos:** `frontend/src/app/account/AccountRoot.tsx`.

1. **El cambio:**
   - el import de `../../pages/account` suma `SharedComputerContext`;
   - se suma `import { appSharedComputer } from './shared-computer';`;
   - `<AccountMenu … />` queda envuelto en `<SharedComputerContext value={appSharedComputer()}>`.

   Con la forma de T065:

   ```tsx
   <SharedComputerContext value={appSharedComputer()}>
     <AccountMenu entryHost={entryHost} reloadDocument={reloadDocument} />
   </SharedComputerContext>
   <ImportQuestionDialog reloadDocument={reloadDocument} />
   ```

   `appSharedComputer()` devuelve siempre el mismo objeto, así que el valor del contexto no cambia entre renders.
2. **Correr** `npm run build`, `node qa/boot-check.ts` y `E2E_PORT=4173 npm run test:e2e -- specs/shared-computer.spec.ts`.
3. **Commit:** `feat(front): la raíz de la cuenta provee la computadora compartida`.

### Tarea 10.6 · Los E2E de la computadora compartida, en rojo (T074, E)

**Archivos:** `qa/e2e/pages/account.ts` (suma `sharedComputer()`) y `qa/e2e/specs/shared-computer.spec.ts` (nuevo).

**Consume:** `AccountPage` de F11a, `ProjectPage` de F4, `StorageControl` de D1c y las ayudas de la copia de A3. **Produce:** `AccountPage.sharedComputer()`.

1. **`qa/e2e/pages/account.ts`.** `AccountPage` suma:

   ```ts
   sharedComputer(): Locator {
     return this.dialog.getByRole('checkbox', { name: 'Estoy en una computadora compartida', exact: true });
   }
   ```

2. **`qa/e2e/specs/shared-computer.spec.ts`.** Cubre el escenario 1 de la historia 9, FR-062, FR-063, F11d-1, la parte de F11d de SC-010 y la fila «Computadora compartida» de SC-004:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { STUDENT } from '../lib/api-contract';
   import { copySaved, readStoredCopy, watchCopySaved } from '../lib/content-copy';
   import { urls } from '../lib/urls';

   const MILESTONE = 'Un lugar para guardar cosas';
   const CHOICE = `taller-v2-compartida:${STUDENT.id}`;
   const SPACE = `taller-v2:${STUDENT.id}:`;
   const WARNING =
     'Al activarla, borramos de este navegador lo que guardó tu cuenta, también lo que todavía no llegó al servidor, y la copia del contenido del taller.';
   const BLOCKED =
     'Este navegador no deja guardar datos: el taller funciona como en una computadora compartida.';
   const LEFT =
     'Listo: desde la próxima vez que abras el taller, tu progreso se guarda en este navegador.';

   function spaceKeys(snapshot: Record<string, string>): string[] {
     return Object.keys(snapshot).filter((key) => key.startsWith(SPACE));
   }

   async function tabTo(page: Page, target: Locator): Promise<void> {
     for (let step = 0; step < 12; step += 1) {
       if (await target.evaluate((element) => element === document.activeElement)) return;
       await page.keyboard.press('Tab');
     }
     await expect(target).toBeFocused();
   }

   test.describe('the shared computer', () => {
     test('activating it clears the account space and the content copy at once (FR-062, SC-010)', async ({
       shell,
       project,
       account,
       storage,
       context,
       page,
     }) => {
       await watchCopySaved(context);
       await shell.goto(urls.view('proyecto'));
       expect(await copySaved(page)).toBe(true);
       await project.milestone(MILESTONE).click();
       await expect.poll(async () => spaceKeys(await storage.rawSnapshot()).length).toBeGreaterThan(0);
       await account.open();
       await account.sharedComputer().click();
       await expect(account.dialog.getByText(WARNING)).toBeFocused();
       await account.button('Activar y borrar').click();
       await expect(account.sharedComputer()).toBeChecked();
       const snapshot = await storage.rawSnapshot();
       expect(spaceKeys(snapshot)).toEqual([]);
       expect(snapshot[CHOICE]).toBe('1');
       expect(await readStoredCopy(page)).toBeNull();
     });

     test('«Cancelar» keeps everything and gives the focus back to the option', async ({
       shell,
       project,
       account,
       storage,
     }) => {
       await shell.goto(urls.view('proyecto'));
       await project.milestone(MILESTONE).click();
       await account.open();
       await account.sharedComputer().click();
       await account.button('Cancelar').click();
       await expect(account.sharedComputer()).not.toBeChecked();
       await expect(account.sharedComputer()).toBeFocused();
       expect(spaceKeys(await storage.rawSnapshot()).length).toBeGreaterThan(0);
     });

     test('a reload in shared mode writes no content copy again (F11d-1)', async ({
       shell,
       account,
       storage,
       context,
       page,
     }) => {
       await storage.seedRaw({ [CHOICE]: '1' });
       await watchCopySaved(context);
       await shell.goto(urls.view('proyecto'));
       expect(await copySaved(page)).toBe(false);
       expect(await readStoredCopy(page)).toBeNull();
       await account.open();
       await expect(account.sharedComputer()).toBeChecked();
     });

     test('closing the tab leaves no progress keys (SC-010; SC-004 of D1)', async ({
       shell,
       project,
       account,
       context,
       page,
     }) => {
       await shell.goto(urls.view('proyecto'));
       await account.open();
       await account.sharedComputer().click();
       await account.button('Activar y borrar').click();
       await expect(account.sharedComputer()).toBeChecked();
       await account.button('Volver al taller').click();
       await project.milestone(MILESTONE).click();
       await expect(project.milestone(MILESTONE)).toBeChecked();
       const origin = new URL(page.url()).origin;
       await page.close();
       const state = await context.storageState();
       const names = state.origins.find((entry) => entry.origin === origin)?.localStorage.map((item) => item.name) ?? [];
       expect(names.filter((name) => name.startsWith('taller-'))).toEqual([CHOICE]);
     });

     test('unchecking it saves the progress again from the next document', async ({ shell, account, storage }) => {
       await storage.seedRaw({ [CHOICE]: '1' });
       await shell.goto(urls.view('proyecto'));
       await account.open();
       await account.sharedComputer().click();
       await expect(account.dialog.getByRole('status')).toHaveText(LEFT);
       await expect(account.dialog.getByRole('status')).toBeFocused();
       expect((await storage.rawSnapshot())[CHOICE]).toBeUndefined();
     });

     test('a browser that blocks storage says the taller works as on a shared computer (FR-063)', async ({
       shell,
       account,
       storage,
     }) => {
       await storage.block();
       await shell.goto(urls.view('proyecto'));
       await account.open();
       await expect(account.dialog.getByText(BLOCKED)).toBeVisible();
       await expect(account.sharedComputer()).toHaveCount(0);
     });

     test.describe('at 320 px', () => {
       test.use({ viewport: { width: 320, height: 760 } });

       test('activates with the keyboard alone, without sideways scrolling', async ({ shell, account, page }) => {
         await shell.goto(urls.view('proyecto'));
         await account.entry.focus();
         await page.keyboard.press('Enter');
         await tabTo(page, account.sharedComputer());
         await page.keyboard.press('Space');
         await expect(account.dialog.getByText(WARNING)).toBeFocused();
         await page.keyboard.press('Tab');
         await expect(account.button('Activar y borrar')).toBeFocused();
         await page.keyboard.press('Enter');
         await expect(account.sharedComputer()).toBeChecked();
         await expect(account.sharedComputer()).toBeFocused();
         expect(await account.dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
       });
     });
   });
   ```

3. **Correr** `npm run build && E2E_PORT=4195 npm run test:e2e -- specs/shared-computer.spec.ts`. Antes de T070, T072 y T073 fallan por la razón esperada: no hay casilla «Estoy en una computadora compartida», y en el de la recarga la señal dice `true`. Después, todo en verde.
4. **Commit:** `test(qa): E2E de la computadora compartida, en rojo`.

### Tarea 10.7 · La compuerta de U10 (T075, K)

La de 0.2, con:

- `shared-computer.spec.ts` en verde y la red de la base, con U9, también, tres veces seguidas;
- `node qa/seams-guard-check.ts` y `node qa/load-order-check.ts`, en verde;
- en el navegador, a 1 280 y a 390 px:
  - «Tu cuenta» con la opción después de «Salir»;
  - la confirmación, la activación y la salida;
  - el aviso con el almacenamiento bloqueado;
- el PR `feat(front): the shared computer option clears the account's local data (F11d U10)`, apilado sobre el de U9.

**Reversión de U10:** se revierten T073, T072, T071, T070 y T069, en ese orden. T074 se revierte con ellos.

## 11. El cierre (coordinador K)

### Tarea 11.1 · La documentación (T076, K)

- **`docs/architecture.md`:**
  - en el mapa de archivos, la fila de la cuenta suma que `pages/account` dibuja «¿Este progreso es tuyo?» (`ImportQuestionDialog`, montado en `AccountRoot`) y la opción de la computadora compartida;
  - una fila nueva para `app/account/shared-computer.ts`: junta los datos locales de la cuenta (el espacio de D1c y la copia de A3) y decide si `afterPublish` guarda la copia.
- **`qa/AGENTS.md`:** una fila «Lo de D1 en la cuenta (F11d)» en «Elegir comprobaciones», con `npm run test:unit` (las specs de `pages/account` y de `app/account`) y los E2E `progress-question.spec.ts` y `shared-computer.spec.ts`.
- **`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`:**
  - en «`pages/account`», las firmas de «Interfaces» de este plan, y la línea de F11d de «Lo que suman otros ítems» pasa a decir qué se suma y dónde;
  - en «`app/boot`», la guarda de `afterPublish`.
- **Comprobar** rutas, comandos y enlaces locales, y `git diff --check`.
- **Commit:** `docs: «¿Este progreso es tuyo?» y la computadora compartida (F11d)`.

### Tarea 11.2 · El peso, la compuerta final y los PR (T077, K)

1. **El peso:** `html.length` de `dist/index.html` contra T060. La diferencia, como mucho +10 000, va a la descripción del PR de U10. Si se pasa, el plan se detiene y decide el usuario.
2. **La compuerta final,** con quickstart-f11d.md §2 sobre la punta de U10, y la red cinco veces seguidas (`--repeat-each=5 --retries=0`).
3. **La verificación a mano contra el stack,** con quickstart-f11d.md §3 y permiso para Docker. Sin el permiso, el PR lo declara como no verificado.
4. **La entrega:** los PR de U9 y U10 se mergean justo después de D1c U5, en ese orden y sin nada en el medio (R43). La descripción de U10 cuenta:
   - el problema completo;
   - qué superficies de D1 quedan dibujadas;
   - la línea editada del E2E de D1c, con su aprobación;
   - la redacción del FR-062 que propone el informe;
   - lo que queda para F13: «Salir» con la cola y la nota del FR-052, que deja de ser cierta desde D1c U3.

## Documentación que cambia con cada unidad

| Unidad | Documentos |
| --- | --- |
| U9 | Ninguno fuera del código |
| U10 | Ninguno fuera del código |
| Cierre | `docs/architecture.md`, `qa/AGENTS.md` y `contracts/front-interfaces.md` (T076) |

## Lo que otros ítems toman de F11d

- **D1c:** entra en servicio con F11d. Los hallazgos del informe le piden mirar cinco cosas: `enterSharedMode()` después de `leaveSharedMode()` en el mismo documento, otra pestaña en `browser` mientras una activa el modo, los textos que hablan de «la copia» en la importación del navegador, el `Retry-After` del 429 y un resultado propio de cada importación.
- **F13:** dibuja «Salir» con la cola sin enviar (L7). Su línea «Tu progreso» va en el mismo diálogo que la opción de F11d, sin repetir el aviso del almacenamiento bloqueado, que dibuja F11d (spec de F13, «Relación con otros ítems»).
- **F8:** la importación desde Método no muestra el informe; F11d sólo hace la repregunta del 409.
- **F10:** cuando la raíz de la cuenta pase al shell, `ImportQuestionDialog` y `SharedComputerContext` van con ella.
- **F15:** si F11d se implementa después de F15a, los estilos de T064 y T072 pasan a utilidades en sus briefs.

## Cobertura de requisitos

| Requisito | Dónde | Prueba |
| --- | --- | --- |
| FR-062 | T069, T070, T072 a T074 | `shared-computer.spec.ts` («clears the progress space and then the content copy»); `shared-computer.spec.tsx` («says what is lost…» y ««Activar y borrar»…»); E2E «activating it clears the account space and the content copy at once» |
| FR-063 | T072 y T074 | `shared-computer.spec.tsx` («…when the storage is blocked»); E2E «a browser that blocks storage…» |
| FR-064 | T061 a T066 | `import-question-view.spec.ts` («hides the question until the boot…»); `import-question.spec.tsx` («asks with the summary…»); E2E «asks with the summary and writes nothing before the answer» y «after signing in» |
| FR-065 | T061 a T067 | `import-question.spec.tsx` («asks again without the reason…», «closes without a notice…» y ««Sí, es mío» waits, shows the report…»); E2E de la repregunta y del informe |
| F11d-1 | T069, T070 y T074 | `shared-computer.spec.ts` («keeps no copy when this account chose the shared computer, before the progress engine boots»); E2E «a reload in shared mode writes no content copy again» |
| FR-066 | T064, T066, T072 y T074 | E2E a 320 px con el teclado, en los dos archivos; el foco en cada cambio, en las specs de componentes |
| FR-067 | T064, T066, T072 y T074 | E2E a 320 px sin desplazamiento horizontal; la regla de pantalla entera de `.import-question-dialog` |
| FR-068 | T064 y T072 | Ninguna regla `transition` ni `animation` (el `grep` de la compuerta) |
| FR-069 | T064 y T072 | El `grep` de estilos en línea de la compuerta |
| FR-070 | Todo el plan | F11d no maneja secretos ni escribe claves; el E2E de la pregunta compara el almacenamiento entero con el fixture |
| FR-071 | — | No aplica: F11d no consulta cuentas por email |
| FR-072 y FR-073 | R52 y T077 | Ninguna dependencia nueva; el peso medido |
| FR-074 | T061, T063, T066, T069, T071 y T074 | Cada tarea de código abre con su spec en rojo |
| FR-075 | T066 y T074 | Page Objects y el doble de la API |
| FR-076 | T067, T068 y T075 | La red de la base, tres veces seguidas; la única edición, aprobada; `boot-check` con el escenario `rawStorage` |
| FR-077 | T068, T075, T076 y T077 | Las compuertas y la documentación |
| SC-004 | T063, T066, T071 y T074 | La tabla de research-f11d.md, R51 |
| SC-005 | T066 y T074 | F11d no guarda nada propio: el almacenamiento queda igual al fixture antes del sí, y con el modo compartido sólo queda la elección |
| SC-007 | T066 y T074 | Teclado y 320 px en E2E; el foco vuelve a la casilla; ninguna transición |
| SC-008 | T077 | `html.length` contra T060, bajo 1 500 000 |
| SC-010 (F11d) | T066 y T074 | E2E «activating it clears…», «closing the tab leaves no progress keys» y «asks with the summary and writes nothing before the answer» |
| SC-011 | T068, T075 y T077 | Las compuertas |
| Historia 9 | T066 y T074 | Escenario 1: E2E de la activación. Escenario 2: E2E de la pregunta con el fixture congelado. Escenario 3: E2E de la repregunta |

## Descargas y permisos

- **Descargas:** ninguna. F11d no suma paquetes (R52).
- **Permisos:**
  - la aprobación de la línea de T067 (y de lo que T060 inventaríe del mismo tipo);
  - levantar el stack para la verificación a mano de T077 (quickstart-f11d.md §3).

## Riesgos y lo que quedó sin verificar

1. **La base no existe todavía.** D1c (sus unidades U3 a U5), «Tu cuenta» de F11a y F8 son planes o ramas sin mergear. *Mitigación:* T060 detiene la tarea si una firma no coincide, y la tarea que use una firma distinta sigue la real.
2. **La nota de «Salir» deja de ser cierta** («Tu progreso se guarda en este navegador, no en tu cuenta…») desde que D1c U3 vincula el espacio, hasta que F13 la reemplace. F11d no la toca (reparto del FR-068). *Mitigación:* el PR de U10 lo declara, y la hoja de ruta lo anota como hallazgo para F13.
3. **Esc en un diálogo abierto sin activación del usuario.** Se resolvió por la regla de los «close watchers» de HTML, sin probarlo antes. *Mitigación:* `onClose` cubre los dos casos, y el E2E de Esc lo fija en Chromium.
4. **La recarga después del informe** (decisión 2) cuesta un arranque más. *Mitigación:* sólo después de una importación exitosa, una vez por navegador, porque las claves v1 quedan archivadas.
5. **Dos pestañas:** una pestaña en modo `browser` sigue escribiendo el espacio después de que otra activa el modo compartido. Es de D1c. *Mitigación:* va al informe como hallazgo; F11d no lo resuelve.

## Complexity Tracking

| Qué | Por qué hace falta | Lo más simple que se descartó |
| --- | --- | --- |
| Un puerto y un contexto (`SharedComputer`) en lugar de llamar a D1c y a A3 desde la pantalla | La pantalla no nombra a los dueños de los datos (FR-062, «sin nombrar sus almacenes»), y la lista de dueños queda en un solo lugar de `app/` (R45) | Llamar a `enterSharedMode()` y a `forgetContentCopy()` desde el componente: la pantalla conocería a los dos dueños, y probar el borrado de la copia en jsdom no tiene IndexedDB |
| Una vista pura de la pregunta (`importViewOf`) y un hook | El motor no cierra la pregunta `offer` hasta el final, y la repregunta llega mientras el primer sí sigue esperando: el componente tiene que mezclar el estado del motor con el suyo sin superar 10 de complejidad (R47 y R49) | Derivar todo en el componente: pasaba de 10 y escondía el caso del doble clic |
