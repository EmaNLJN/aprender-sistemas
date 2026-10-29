# Implementation Plan: F13 · La sincronización en la interfaz

> **Estado (2026-10-29): en redacción, interrumpido a pedido del usuario para retomarlo.** Está escrito hasta la sección 0: el encabezado, las restricciones globales, la estructura, la «Review Focus», las unidades y T001 con la compuerta de cada unidad. Faltan las tareas T002 a T030 con su código, `quickstart.md`, `tasks.md`, la tabla de cobertura y el analyze. `research.md`, `data-model.md` y `contracts/sync-surfaces.md` están completos.

**Branch**: `027-f13-sincronizacion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F13, con su clarify del 2026-10-28 (Q1 a Q5, todas A) y las lecturas L1 a L8. Decisiones y consultas: [research.md](./research.md). Lo que se dibuja de cada estado: [data-model.md](./data-model.md). Interfaces públicas: [contracts/sync-surfaces.md](./contracts/sync-surfaces.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md). La interfaz que F13 consume es la de D1c: [contrato del cliente v2](../007-d1-progreso-sincronizacion/contracts/sync-client-d1c.md) y T020 de su plan (PR #93, `plan/d1c-cliente-v2` en `2e743c00`).

**Objetivo.** Que el alumno vea en todo momento si lo que hizo llegó a su cuenta, se entere de cada problema una sola vez y no pierda nada sin que se lo digan antes, sobre la mecánica de D1c.

**Arquitectura.** La capa `ui` de `features/progress-sync` traduce el estado de D1c a textos, avisos y toasts con funciones puras, y dibuja la franja y los dos diálogos que no se cierran. `app/shell` compone esas piezas con «pedir el ingreso» de F11a y con el shell de F10b (la línea en el pie, la franja entre la barra superior y `#main`, los vigías de los toasts y de `beforeunload`), y `pages/account` dibuja «Salir» con el puerto de D1c (la espera, la pregunta y la nota). Nada lee la red ni el almacenamiento: todo sale de `ProgressSync`.

**Stack.** TypeScript como ES modules; React 19.2.8 con `<dialog>` nativo; Zustand 5.0.15 (`useStore` y `zustand/vanilla`); Vitest 5.0.3 en los proyectos `node` y `dom`, con Testing Library 16.3.3, user-event 14.6.7 y fishery 2.4.0; Playwright 1.63.0 con el doble de la API de F11a. Ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», la sección 0 y la sección de tu unidad. `tasks.md` tiene una línea por tarea (T001 a T030) y remite acá.
> - **La base.** F13 se implementa sobre `master` con D1c (U2 a U5), F10b y F11a, más A3 y F8, que D1c ya exige. Cada firma que usa sale del contrato de D1c (PR #93), de los planes de F10b, F11a, A3 y F8 en `master` y del código de `impl-f11a` (`a7b3c71d`). **Nada de F13 corrió al planificar.** T001 contrasta cada firma con la base, y la «regla de adaptación» dice qué hacer si una difiere.
> - **La regla de adaptación.** Si un archivo de la base que F13 modifica (`Sidebar.tsx`, `Shell.tsx`, `AppRoot.tsx`, `start-taller.tsx`, `SignOutSection.tsx`, `api-double.ts`, los Page Objects) difiere del que cita este plan, se conserva el de la base y se le suman sólo las líneas de F13, con el mismo resultado. Cambia la forma, nunca el comportamiento.

## Summary

F13 dibuja lo que pasa en la mecánica de D1c. El enfoque, con sus razones en research.md:

- **Cada pieza en la capa que le toca (R1).** Lo que sólo usa el estado de D1c vive en `features/progress-sync/ui`. Lo que además necesita «pedir el ingreso» o el armado de `app/` vive en `app/shell`. «Salir» vive en `pages/account`, junto a lo que F11a dejó.
- **Funciones puras para todo lo que se decide (R2, R3 y R10).** La línea de cada estado, el orden de la franja, los formatos, la memoria de los toasts y la condición de la confirmación al cerrar son funciones con su spec de Vitest, con los esperados copiados a mano de la spec. Los componentes leen el estado con selectores chicos y derivan al dibujar.
- **Los toasts y `beforeunload` fuera de React (R3 y R4).** Dos vigías se suscriben al almacén de D1c desde `startTaller`: uno llama a `notify` una vez por transición, el otro pone y saca el oyente de `beforeunload` con `lostOnUnload`. Las recargas que el alumno eligió pasan por `reloadDocument()`, que las marca, y la guarda las deja pasar.
- **Diálogos nativos (R5 y R6).** El de cuenta distinta y «Cambiaste de cuenta» son `<dialog>` modales, con `role="alertdialog"`, que no se cierran con Esc y se reabren si algo los cierra. La pregunta al salir es un `<dialog>` dentro de «Tu cuenta» que corta el burbujeo simulado de React para no cerrarla.
- **La franja (R7).** Un contenedor `aria-live="polite"` sin rol, montado siempre y vacío sin ocupar lugar. Los avisos nunca mueven el foco; la confirmación del descarte, que pide el alumno, sí.
- **«Salir» (R9).** El puerto de D1c (`onPhase` y `choose`) da la espera y la pregunta. La nota depende del estado y del modo.
- **E2E con el doble de F11a (R12).** «Sin conexión» es un pedido abortado, el tiempo corre con `page.clock`, el desfase sale del `serverTime` y una fixture nueva comprueba SC-002 sobre toda la red sin editar un escenario.

## Technical Context

**Language/Version**: TypeScript 6.0.2 como ES modules en `frontend/src/` y `qa/`. Node 24, Vite 8.3.2, Vitest 5.0.3 y `@playwright/test` 1.63.0.

**Primary Dependencies**: ninguna nueva. Usa React 19.2.8, Zustand 5.0.15, el cliente y «pedir el ingreso» de F11a, el motor de D1c y el shell de F10b.

**Storage**: ninguno propio. F13 lee el estado de D1c y no escribe `localStorage` (FR-001).

**Testing**: Vitest en el proyecto `node` para las funciones puras (`*.spec.ts`) y en `dom` para los componentes (`*.spec.tsx`), con fishery para el estado de D1c; los E2E de Playwright contra el build servido, con el doble de la API de F11a y las respuestas de D1c. Los valores esperados se copian de las tablas de la spec, nunca del módulo que se prueba.

**Target Platform**: navegador moderno (ES2022), servido por Nginx; Linux y macOS.

**Project Type**: aplicación web, el front del taller. Cambio de comportamiento: superficies nuevas.

**Performance Goals**: ninguna nueva. `dist/index.html` bajo 1 500 000 caracteres, con su tamaño antes y después en el PR.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**: 30 tareas en 7 unidades; unos 30 archivos nuevos (la mitad, specs) y unos 12 modificados.

## Restricciones globales

Valores exactos; ninguna tarea los cambia.

| Qué | Valor | Fuente |
| --- | --- | --- |
| Umbral del aviso del reloj | más de 120 000 ms en valor absoluto; 120 000 justos no avisan | FR-028; D1, FR-078 |
| Minutos del reloj | `Math.round(Math.abs(clockSkewMs) / 60000)`; positivo es «adelantado» | spec, «Los formatos»; contrato de D1c, §2 |
| Orden de la franja | pestaña vieja, sesión vencida, época, rechazos, reloj | spec, «Las superficies» |
| Textos | Los de la spec («Textos que lee el alumno»), con las formas singulares y `{cuándo}` de data-model.md §4 | spec; research, R10 |
| Mensaje de la pestaña vieja | `Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.` | `backend/api/lang/es/api.php:25` |
| La franja | `<div id="sync-notices" class="sync-notices" aria-live="polite">`, sin `role`, entre `#session-status` y `<main>` | FR-012 y FR-013 |
| Diálogos que no se cierran | `<dialog role="alertdialog" class="sync-dialog">` con `showModal()`, `cancel` cancelado y `close` que reabre | FR-019; Q4 |
| Confirmación al cerrar | oyente de `beforeunload` sólo con `lostOnUnload > 0`; nunca ante `reloadWasChosen()` | FR-035 a FR-037; Q3 |
| Estilos | Clases en la hoja del shell (`frontend/src/app/shell/shell.css`) o en `pages/account/ui/account.css`; ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` | FR-042; contrato de F10c |
| Tope de `dist/index.html` | `BOOT_SIZE_LIMIT` de `qa/build-check.ts`: 1 500 000 caracteres | FR-047; PR #76 |
| Red de E2E | La de T001, sin editar ningún escenario salvo el de la decisión 1 (`account.spec.ts`, la nota de F11a) | FR-046; SC-009 |
| Errores esperados en E2E | `pageIssues.expectIssue(/status of NNN/, …)` con el código exacto; un pedido abortado, `/net::ERR_FAILED/`; nunca `/Failed to load resource/` | TR-11; decisión del 2026-10-28 (noche) |
| El doble de la API | El de F11a con lo que suman A3 (`abort`, `contentVersion`) y D1c (`POST /api/sync` y `GET /api/progress` por omisión); F13 no trae `query` ni otro `replyTo` | decisión del 2026-10-28 (noche) |
| Stubs del rojo | `const` tipados; un componente, `FunctionComponent<Props>` que devuelve `null` | TR-2 |
| Comentarios | Sólo una referencia puntual (un FR, una decisión) o una función compleja | `AGENTS.md` |
| Movimiento | Ninguna transición ni animación nueva; ningún indicador que gire | FR-041 |

## Constitution Check

| Principio | Cómo se cumple |
| --- | --- |
| I. `AGENTS.md` es la fuente | El plan sigue `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md`, el ADR 0008 y el contrato de F10c; las guías que cambian van en T029 |
| II. TDD y pruebas útiles | Cada tarea empieza con la spec que falla por el comportamiento; los esperados son literales de la spec; ningún mock confirma cómo está escrito el código (sólo se reemplazan `showModal`, `close`, la descarga y el `fetch`, que jsdom no tiene) |
| III. Código entendible | Funciones chicas con nombres del dominio; ningún componente reúne reglas, efectos y varias regiones: las reglas son puras y los dos vigías viven fuera de React |
| IV. IDs estables | F13 no toca contenido, IDs ni progreso |
| V. Capas y contratos | `ui` del slice de D1c, composición en `app/shell` y en `pages/account`; ningún slice importa otro de su capa; ninguna capa nueva (research, R1) |
| VI. Español y accesibilidad | Textos en español rioplatense; teclado, foco, 320 px y movimiento reducido con su prueba (FR-038 a FR-041) |
| VII. Secretos y salidas | Nada nuevo en Git |
| VIII. Flow-forward | La spec 027 sigue en curso: el plan no la edita; lo que la precisa va en research.md (R10 y R14) y en el informe |

## Decisiones ya tomadas que el plan aplica

| Decisión | Dónde |
| --- | --- |
| Q1-A: la línea en el pie y en «Tu cuenta», el toast y la franja; la barra superior no cambia | T014, T020, T012 |
| Q2-A: `#save-label` conserva sus dos textos; la línea de la cuenta va debajo | T014 |
| Q3-A: `beforeunload` sólo con la cola en memoria y cambios sin enviar | T007, T016 |
| Q4-A: sólo la cuenta distinta es modal; lo demás va en la franja, sin mover el foco | T010, T012 |
| Q5-A: la sesión vencida ofrece «Ingresar» en la franja; el acceso no se abre solo | T012, T015 |
| FR-068 de D1, reparto vigente (2026-10-29): D1c envía y limpia sin pasar `choose` ni `onPhase`; F13 dibuja todo y los pasa | T019, T020 |
| La red E2E con D1c (R19 de D1c): `StorageControl` traduce al espacio de la cuenta | T021, T024 a T027 (usan `seedRaw` y `rawSnapshot`) |
| Una regla nueva del shell va a la hoja del shell (contrato de F10c) | T017 |
| Sin Tailwind; si F13 entra después de F15a, sus briefs pasan a Tailwind | T017, T020 |
| El tope de 1 500 000 | T018, T030 |

## Project Structure

### Documentation (this feature)

```text
specs/027-f13-sincronizacion/
├── spec.md              # con su clarify (no se edita)
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── sync-surfaces.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

**Se crean:**

| Archivo | Responsabilidad | Tarea |
| --- | --- | --- |
| `frontend/src/shared/lib/reload-document.spec.ts` | La marca de la recarga elegida | T002 |
| `frontend/src/features/progress-sync/ui/when-text.ts` (+ spec) | `{cuándo}` de la época | T003 |
| `frontend/src/features/progress-sync/ui/sync-copy.ts` (+ spec) | Todos los textos de F13, con sus plurales y sus modos | T003 |
| `frontend/src/features/progress-sync/ui/account-line.ts` (+ spec) | El texto y la familia de cada estado | T004 |
| `frontend/src/features/progress-sync/ui/sync-state.factory.ts` | El estado de D1c armado con fishery, para las specs | T005 |
| `frontend/src/features/progress-sync/ui/sync-notices.ts` (+ spec) | Los avisos activos, en orden | T005 |
| `frontend/src/features/progress-sync/ui/sync-toasts.ts` (+ spec) | La memoria de los toasts y su vigía | T006 |
| `frontend/src/features/progress-sync/ui/unload-guard.ts` (+ spec) | La guarda de `beforeunload` | T007 |
| `frontend/src/features/progress-sync/ui/unsent-download.ts` | Bajar el archivo de D1c | T008 |
| `frontend/src/features/progress-sync/ui/useSyncSnapshot.ts` (+ spec `.tsx`) | Leer un dato del estado con o sin motor | T008 |
| `frontend/src/features/progress-sync/ui/sync-surfaces.fixture.ts` | El motor falso, los diálogos y la descarga de las specs | T008 |
| `frontend/src/features/progress-sync/ui/BlockingDialog.tsx` | El diálogo modal que no se cierra | T010 |
| `frontend/src/features/progress-sync/ui/AccountMismatchDialog.tsx` (+ spec) | El diálogo de cuenta distinta | T010 |
| `frontend/src/features/progress-sync/ui/AccountChangedDialog.tsx` (+ spec) | «Cambiaste de cuenta» | T010 |
| `frontend/src/features/progress-sync/ui/SyncNoticeItem.tsx` | Un aviso: su texto y sus botones | T011 |
| `frontend/src/features/progress-sync/ui/EpochNotice.tsx` (+ spec) | El aviso de la época, con su confirmación | T011 |
| `frontend/src/features/progress-sync/ui/SyncNoticeStrip.tsx` (+ spec) | La franja | T012 |
| `frontend/src/app/shell/Sidebar.sync.spec.tsx` | La línea de la cuenta en el pie | T014 |
| `frontend/src/app/shell/SyncNotices.tsx` (+ spec) | La franja con «Ingresar» y «Cambiaste de cuenta» | T015 |
| `frontend/src/app/shell/sync-watchers.ts` (+ spec `.tsx`) | Los dos vigías | T016 |
| `frontend/src/pages/account/ui/useSignOutQuestion.ts` | La pregunta como promesa | T019 |
| `frontend/src/pages/account/ui/SignOutQuestion.tsx` (+ spec) | La pregunta al salir | T019 |
| `frontend/src/pages/account/ui/sign-out-section.sync.spec.tsx` | «Salir» con D1c | T020 |
| `qa/e2e/lib/sync-replies.ts` | Las respuestas de la sincronización para los E2E | T021 |
| `qa/e2e/specs/sync-sign-out.spec.ts` | E2E de US2 y de «Tu progreso» | T021 |
| `qa/e2e/lib/unload-dialogs.ts` | Contar los diálogos `beforeunload` | T023 |
| `qa/e2e/specs/sync-status.spec.ts` | E2E de US1, US7 y SC-008 | T024 |
| `qa/e2e/specs/sync-account-mismatch.spec.ts` | E2E de US3 | T025 |
| `qa/e2e/specs/sync-notices.spec.ts` | E2E de US4 y US6 | T026 |
| `qa/e2e/specs/sync-unload.spec.ts` | E2E de US5 | T027 |

**Se modifican:**

| Archivo | Qué cambia | Tarea |
| --- | --- | --- |
| `frontend/src/shared/lib/reload-document.ts` (F11a) | `reloadWasChosen()` y la marca | T002 |
| `frontend/src/features/progress-sync/index.ts` (D1c) | La API de la capa `ui` (contrato, §1) | T008, T010, T012 |
| `frontend/src/app/shell/Sidebar.tsx` (F10b) | La prop `accountLine` y la línea | T014 |
| `frontend/src/app/shell/Shell.tsx` (F10b) | La línea desde el motor y `<SyncNotices>` | T017 |
| `frontend/src/app/root/AppRoot.tsx` (F10b) | Los proveedores, si faltan, y `<AccountMismatchDialog>` | T017 |
| `frontend/src/app/boot/start-taller.tsx` (F10b) | `startSyncWatchers` | T017 |
| `frontend/src/app/shell/shell.css` (F10c) | La línea, la franja y los diálogos de cuenta | T017 |
| `frontend/src/pages/account/ui/SignOutSection.tsx` (F11a, A3 y D1c) | La espera, la pregunta, la nota y «Tu progreso» | T020 |
| `frontend/src/pages/account/ui/account.css` (F11a) | «Tu progreso» y las opciones de la pregunta | T020 |
| `qa/e2e/pages/account.ts` (F11a) | La pregunta y «Tu progreso» | T021 |
| `qa/e2e/specs/account.spec.ts` (F11a) | La constante `NOTE`, con la decisión 1 | T021 |
| `qa/e2e/fixtures/api-double.ts` (F11a, A3 y D1c) | `upToDateSync` delega en `syncReply` | T023 |
| `qa/e2e/pages/shell.ts` y `qa/e2e/pages/access.ts` | La línea, la franja, los diálogos y el ingreso dentro del diálogo | T023 |
| `qa/e2e/fixtures/index.ts` | La opción `syncNotices` y la fixture `quietSync` | T023 |
| `docs/architecture.md` y `qa/AGENTS.md` | La capa `ui` del slice, las superficies, sus specs y la fixture | T029 |

## Review Focus

Cinco entradas o fallas que la spec implica y que ninguna prueba de una tarea ejercitaría sin esta lista. Cada una tiene su prueba, ya agregada a la tarea dueña.

1. **Cerrar la pregunta al salir cierra «Tu cuenta»** (US2, escenario 5: «el diálogo se cierra, el foco vuelve a "Salir"… y la sesión sigue»). La pregunta es un `<dialog>` dentro del de «Tu cuenta», y React junta los `onClose` de los ancestros aunque el evento nativo no burbujee. **Prueba:** «closing the question does not close the dialog around it», en `SignOutQuestion.spec.tsx` (T019).
2. **Esc cierra igual el diálogo de cuenta distinta** cuando Chrome no deja cancelar `cancel` sin una activación del usuario (FR-019). **Pruebas:** «a close from outside opens it again», en `AccountMismatchDialog.spec.tsx` (T010), y el E2E con dos Esc seguidos (T025).
3. **Una recarga elegida pide la confirmación del navegador** con la cola en memoria: «Salir sin enviarlos», «Recargar» del diálogo y «Seguir» de «Cambiaste de cuenta» (FR-037, SC-005). **Pruebas:** «lets a reload the student chose go without asking», en `unload-guard.spec.ts` (T007); los E2E con el almacenamiento bloqueado de T021, T025 y T026, que cuentan 0 diálogos.
4. **El toast de la vuelta se pierde** si el episodio pasa por `pending` (una cola de más de 200 operaciones) o si el cambio se hizo con el estado ya en `offline` desde una cola vacía (FR-010). **Prueba:** «owes the announcement across pending, and for a change made while offline», en `sync-toasts.spec.ts` (T006).
5. **«Hoy» y «ayer» se calculan en UTC** y una época borrada a las 23:30 de Buenos Aires dice «hoy» al día siguiente (spec, «Los formatos»). **Prueba:** «counts days by the local calendar, not by UTC», en `when-text.spec.ts` (T003).

Además, **SC-002 sobre toda la red** (0 avisos y 0 diálogos de F13 en los E2E existentes) no se puede afirmar sin editar escenarios: lo afirma la fixture automática `quietSync` (T023) al terminar cada E2E.

## Unidades, dueños y orden

| Unidad | Tareas | Dueño | Qué entrega | Compuerta |
| --- | --- | --- | --- | --- |
| U0 | T001 | K (coordinador) | La línea base y las detecciones | — |
| U1 | T002 a T009 | M (modelo) | Las funciones puras, la marca de la recarga, el hook y el fixture | T009 |
| U2 | T010 a T013 | C (componentes) | Los dos diálogos, el aviso de la época y la franja | T013 |
| U3 | T014 a T018 | S (shell) y K | La línea en el pie, la franja en el shell, los vigías, el diálogo en la raíz y los estilos | T018 |
| U4 | T019 a T022 | A («Tu cuenta») | «Salir»: la espera, la pregunta, la nota, «Tu progreso» y sus E2E | T022 |
| U5 | T023 a T028 | Q (red) | El doble, los Page Objects, la fixture de SC-002 y los E2E | T028 |
| U6 | T029 y T030 | K | La documentación y el cierre | — |

**El orden.** U1 primero. U2 y U4 pueden correr a la vez después de U1 (archivos disjuntos). U3 espera a U2 y a F10b. U5 espera a U3 y a U4. Un PR por unidad, contra la rama base de F13.

**La entrada en servicio y la nota de FR-052 (research, R13; decisión 2 del informe).**
- **U1 y U4** no dependen de F10b. Van apiladas justo después de la U5 de D1c, en el mismo tren que D1c U3 a U5 y F11d, y se mergean seguidas: ninguna versión publicada tiene la nota de F11a, que desde la U3 de D1c dice algo falso.
- **U2, U3 y U5** esperan a F10b. Si F10b ya está en `master` cuando sale el tren de D1c, F13 entra entera en ese tren.

**Paralelismo.** T003 a T007 tocan archivos disjuntos y pueden ir a la vez. T010, T011 y T019 también. `main.tsx`, `package.json`, las configuraciones y la documentación los integra K; T017, que toca la raíz y el arranque, también es de K.

## Reglas para todos los agentes

- **TDD.** Cada tarea empieza por la spec que falla. Escribí los stubs del rojo como `const` tipados (TR-2): `export const accountLine: (status: SyncStatus | null) => AccountLine | null = () => { throw new Error('not implemented'); };`; un componente, como `const X: FunctionComponent<Props> = () => null;`. Corré la spec, mirá que falle por el comportamiento y no por un import, implementá, corré en verde.
- **Los esperados** son literales copiados de la spec y de data-model.md. Nunca se importa una constante de `sync-copy.ts` en una spec para compararla consigo misma.
- **Comentarios:** sólo los que trae el código de este plan. No sumes otros.
- **Specs:** las funciones puras en `*.spec.ts` (proyecto `node`); los componentes y lo que toca `window`, en `*.spec.tsx` (proyecto `dom`). Importá `describe`, `it`, `expect` y `vi` de `vitest`.
- **Checks por tarea:** `npx vitest run --config frontend/vitest.config.ts <archivos>`, `npx tsc -p frontend/tsconfig.app.json --noEmit`, `npx eslint <archivos>` y `npx prettier --check <archivos>`. Antes de cada commit, `git diff --check`.
- **Commits:** en inglés, con el formato del repositorio (`feat(progress-sync): …`, `test(e2e): …`), y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **E2E:** Page Objects con nombres accesibles; cada error de consola esperado con `expectIssue`. Para detectar recargas, `observeReload` de `qa/e2e/lib/document-marker.ts` (TR-7).
- **No toques** los E2E existentes, salvo la constante de la decisión 1 en su propio commit, ni archivos de D1c fuera de `index.ts` del slice y del método `upToDateSync` del doble.

## 0. Línea base y compuerta de cada unidad (K)

### Tarea T001 · La línea base y las detecciones

**Archivos:** ninguno se modifica. El resultado va a la descripción del PR de U0.

**Pasos:**

1. **La base.** La rama de F13 sale de `master` con D1c (U2 a U5), F10b y F11a; o de la cadena de PR apilados del tren de D1c para U1 y U4 (research, R13).
2. **Las detecciones** (cada una con su comando; si una falla, se detiene la unidad que la necesita y se informa):

| # | Qué | Comando | Si no está |
| --- | --- | --- | --- |
| D1 | D1c U2: el estado y las acciones | `git grep -n "export interface ProgressSyncState\|export interface ProgressSync " -- frontend/src/features/progress-sync/model/types.ts` | F13 espera |
| D2 | D1c U2: el contexto y el índice | `git grep -n "useProgressSync\|ProgressSyncContext" -- frontend/src/features/progress-sync/index.ts` | F13 espera |
| D3 | D1c U3: el motor único | `git grep -n "export function appProgressSync" -- frontend/src/app/progress-sync/app-progress-sync.ts` | U3 y U5 esperan |
| D4 | D1c U4: el puerto de «Salir» | `git grep -n "SignOutPhase\|useSignOutProgress\|ChooseAfterLeftover" -- frontend/src/features/sign-in/index.ts` y `git grep -n "useSignOutProgress" -- frontend/src/pages/account/ui/SignOutSection.tsx` | U4 espera |
| D5 | D1c U5: el doble y la traducción | `git grep -n "upToDateSync\|EMPTY_AREAS" -- qa/e2e/fixtures/api-double.ts qa/e2e/lib/api-contract.ts` y `git grep -n "rawSnapshot\|seedRaw" -- qa/e2e/fixtures/storage-control.ts` | Los E2E de U4 y U5 esperan |
| D6 | Los mensajes de la sincronización en los E2E | `git grep -n "client_outdated\|epoch_mismatch" -- qa/e2e/lib/api-contract.ts` | T021 los suma a `MESSAGES`, copiados de `backend/api/lang/es/api.php:24-25` |
| D7 | F10b: la raíz, el shell, la barra lateral y el arranque | `git grep -n "const AppRoot\|const Shell \|const Sidebar\|export function startTaller" -- frontend/src/app` | U3 espera |
| D8 | El proveedor del motor en la raíz | `git grep -n "ProgressSyncContext\|SignOutProgressContext" -- frontend/src/app/root/AppRoot.tsx` | T017 los suma |
| D9 | F10c: la hoja del shell y los tokens | `ls frontend/src/app/shell/shell.css` y `git grep -n -e "--color-recommended" -e "--spacing-gutter" -- frontend/styles.css` | T017 y T020 usan la tabla de equivalencias |
| D10 | A3: `abort` en el doble | `git grep -n "abort?: boolean" -- qa/e2e/fixtures/api-double.ts` | T021 lo suma con la forma del plan de A3 (`specs/016-a3-contenido-api/plan.md:4505` y `:4540`) |
| D11 | F11a: `reauthenticate`, `requestSignIn` y `reloadDocument` | `git grep -n "reauthenticate\|requestSignIn" -- frontend/src/features/sign-in/index.ts` y `git grep -n "export function reloadDocument" -- frontend/src/shared/lib/reload-document.ts` | F13 espera |
| D12 | F8: «Borrar todo» en el Page Object | `git grep -n "resetEverything" -- qa/e2e/pages/method.ts` | El E2E del borrado propio sale de T026 y lo cubre Vitest (`ownReset`, T005); se anota en el PR |
| D13 | La descarga de `shared/lib` | `git grep -n "export function downloadBlob" -- frontend/src/shared/lib/download-file.ts` | T008 usa el nombre de la base |
| D14 | Nadie en `qa/` ni `tools/` importa el índice del slice | `git grep -n -e "features/progress-sync'" -e "features/progress-sync/index" -- qa tools` | Se detiene: el índice pasa a reexportar componentes `.tsx`, que Node no carga |
| D15 | El E2E de F11a que fija la nota de FR-052 | `git grep -n "queda acá aunque salgas" -- qa/e2e/specs` | Lista para la decisión 1 |
| D16 | El E2E de F11a «the progress of the browser stays» | `git grep -n "the progress of the browser stays" -- qa/e2e/specs/account.spec.ts` | Si sigue y falla con D1c, es del inventario de D1c (su T001 y T024): se informa, F13 no lo edita |
| D17 | F11d | `git grep -n "enterSharedMode" -- frontend/src/pages` | Sin efecto: el modo compartido se prueba con el almacenamiento bloqueado |

3. **Las cuentas:** `npm test` (checks y pruebas de Vitest), `npm run lint` (avisos), `npm run build`, el tamaño de `dist/index.html` contra `BOOT_SIZE_LIMIT` (1 500 000) y `npm run test:e2e` (la cantidad de escenarios). Son los esperados de las compuertas.
4. **El commit:** ninguno. El PR de U0 es `docs(specs): F13 implementation baseline (F13 U0)`, con las cuentas y las detecciones en la descripción.

### La compuerta de cada unidad (T009, T013, T018, T022 y T028)

Cada compuerta corre, en este orden, y anota el resultado en la descripción del PR de la unidad:

```sh
npm run test:unit
npm test
npm run lint
npm run format:check
node qa/seams-guard-check.ts
git diff --check
```

Desde U3 suma `npm run build` y el tamaño de `dist/index.html` (bajo 1 500 000); desde U4, `npm run test:e2e`. La compuerta falla si una cuenta de T001 baja sin una razón escrita en este plan, si aparece un aviso de complejidad nuevo o si un E2E existente cambió.
