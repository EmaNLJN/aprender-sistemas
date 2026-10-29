# Research: F13 · La sincronización en la interfaz

**Fecha**: 2026-10-29 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Modelo**: [data-model.md](./data-model.md) | **Contrato**: [contracts/sync-surfaces.md](./contracts/sync-surfaces.md)

Cada decisión dice qué se eligió, por qué, qué se descartó y cómo se verifica. Las que completan algo que la spec deja abierto llevan **(propuesta del plan)**. Las fuentes que todavía no están en `master` se citan con su worktree y su commit, todos bajo `/home/emanuel/workflow/aprender-sistemas-worktrees/`:

| Fuente | Dónde | Commit |
| --- | --- | --- |
| El plan de D1c: el contrato del cliente, el puerto de «Salir», los datos y el research | PR #93, `plan/d1c-cliente-v2`, worktree `plan-d1c` | `2e743c00` (la corrección de «Salir» quedó en `7881e720`) |
| F11a implementada hasta T021: el cliente de la API, la sesión, «pedir el ingreso», `reauthenticate`, `signOut`, el doble de la API y sus Page Objects | `impl-f11a` | `a7b3c71d` |
| Los planes de F10a, F10b y F10c (el shell, la raíz única, la hoja del shell y los tokens) | `master` | `6caa00f4` |
| Los planes de F11a («Tu cuenta», T022 a T025), A3 (`abort` en el doble, `forgetContentCopy`) y F8 (`resetEverything`) | `master` | `6caa00f4` |

## R1. Dónde vive cada pieza **(propuesta del plan)**

- **Decisión.**
  - **`features/progress-sync/ui/`**: lo que sólo necesita el estado y las acciones de D1c. Los textos, la línea de la cuenta, el orden de la franja, los formatos, la memoria de los toasts, la guarda de `beforeunload`, la descarga del archivo, el hook `useSyncSnapshot`, la franja y los dos diálogos que no se cierran. Es la capa `ui` del slice que D1c abrió (D1c-R1): D1c no dibuja (FR-077), F13 sí.
  - **`app/shell/`**: lo que compone dos slices o usa el armado de `app/`. La línea en el pie (`Sidebar`, una prop más), la franja con su «Ingresar» (`SyncNotices`, que usa `reauthenticate` de `features/sign-in`) y el arranque de los dos vigías (`startSyncWatchers`). La raíz (`AppRoot`) monta el diálogo de cuenta distinta.
  - **`pages/account/ui/`**: «Salir», con la espera, la pregunta y la nota, y «Tu progreso». La página puede importar `features/sign-in` y `features/progress-sync` a la vez.
- **Por qué.** Feature-Sliced Design (`docs/architecture.md`): dos slices de la misma capa no se importan. La franja necesita «pedir el ingreso» (`features/sign-in`) y el estado de D1c (`features/progress-sync`), así que la franja en sí no importa `features/sign-in`: recibe `onSignIn`, y la compone `app/shell`. La pregunta al salir sólo la usa «Tu cuenta», y D1c ya dejó el puerto de `signOut` estructural para no cruzar slices (D1c-R14).
- **Descartado.**
  - Un slice propio `features/sync-status`: tendría que importar los tipos de `features/progress-sync`, que es cruzar slices.
  - Abrir la capa `widgets`: la arquitectura la reserva para un bloque autónomo que la necesite, y la composición que haría el widget ya la hacen `app/shell` y `pages/account` sin capa nueva.
- **Verificación.** `node qa/seams-guard-check.ts` (R6: los archivos de `app/` importan índices de slice) y la revisión de cada import en las tareas.

## R2. Cómo se lee el estado de D1c

- **Decisión.** Con `useStore(sync.state, selector)` y un selector por dato primitivo o por referencia estable (`state.epochChange` no cambia de identidad hasta que D1c lo cambia). Lo que se deriva (la línea, la lista de avisos) se calcula al dibujar, sin `useEffect`. Donde el motor puede faltar («Tu cuenta» dentro de las specs de F11a, que no tienen proveedor), un hook propio, `useSyncSnapshot(sync, select, fallback)`, usa `useSyncExternalStore` con una suscripción vacía cuando `sync` es `null`.
- **Por qué.** FR-002 y `AGENTS.md`: suscripción y selectores chicos, nada copiado en un estado propio. Zustand 5 exige que el selector devuelva una referencia estable (Context7, migración a v5): un selector que arma un objeto o un arreglo nuevo cae en un bucle.
- **Descartado.** `useShallow` sobre un objeto con varios campos: funciona, pero los selectores primitivos son más simples de leer y no necesitan otra importación.

## R3. Los toasts: una memoria fuera de React **(propuesta del plan)**

- **Decisión.** `watchSyncToasts(store, notify)` se suscribe al almacén de D1c y guarda una memoria chica, `{status, owed}`. Sale un toast cuando:
  - el estado pasa de `synced` o `pending` a `offline` o a `error` (FR-009), con el texto del modo;
  - el estado llega a `synced` después de un episodio con problema (`offline`, `error` o `signed-out`) en el que hubo cambios en la cola (`owed`, FR-010).

  Un `offline` que se repite no cambia el estado, así que no repite el toast. El primer estado (`null` → `offline`, el arranque sin servidor con la copia de A3) no sale, porque no viene de `synced` ni de `pending` (FR-011). `startTaller` lo arranca una vez, antes de las etapas.
- **Por qué.** D1c parchea el estado en varios pasos (primero `unsentCount`, después `status`), y una respuesta con más de 200 operaciones pasa por `pending` antes de `synced`: la memoria de «se debe un aviso de vuelta» tiene que sobrevivir a esos pasos. Calcularlo en un componente con `useEffect` mezclaría un efecto con algo que es una transición del almacén.
- **Descartado.** `navigator.onLine` (L2) y un toast por cada fallo (Riesgo 3).
- **Verificación.** `sync-toasts.spec.ts` (T006), con los casos de la «Review Focus» 4, y los E2E de US1 (T024).

## R4. La confirmación al cerrar: un oyente que va y viene, y las recargas elegidas **(propuesta del plan)**

- **Decisión.**
  - `watchUnloadGuard(store, window, reloadWasChosen)` pone el oyente de `beforeunload` cuando `lostOnUnload` pasa a más de 0 y lo saca cuando vuelve a 0 (FR-035 a FR-037). El oyente llama a `event.preventDefault()`.
  - Las recargas que el alumno eligió pasan todas por `reloadDocument()` de `shared/lib/reload-document.ts` (F11a, TR-9): «Salir», «Recargar» del diálogo y de la franja, la recarga de un cambio de cuenta y la de «Borrar la cuenta» de F11b (que recibe `reloadDocument` como prop). F13 le suma una marca: `reloadDocument()` anota que la recarga fue elegida, y `reloadWasChosen()` la lee. El oyente deja pasar una recarga elegida.
- **Por qué.** `lostOnUnload` ya es «la cola más la copia de la época, sólo si viven en memoria» (contrato de D1c, §2): es exactamente la condición de Q3. Los once enlaces que recargan el documento no pasan por `reloadDocument`, así que en memoria preguntan, como aceptó Q3.
- **Descartado.** Sacar el oyente justo antes de cada recarga elegida: cada llamador tendría que conocer la guarda.
- **Lo que no confirmó Context7.** Que Chromium sólo muestre el diálogo después de una interacción con la página. Los E2E hacen clic antes de cerrar, así que la prueba vale con o sin esa regla. `preventDefault()` alcanza en el Chromium de Playwright 1.63; `returnValue`, que pedían los navegadores viejos, está obsoleto en la librería de tipos y no se usa.
- **Verificación.** `unload-guard.spec.ts` (T007), `reload-document.spec.ts` (T002), `sync-watchers.spec.tsx` (T016) y los E2E de US5 (T027) y de las recargas elegidas (T021 y T025).

## R5. Los diálogos que no se cierran

- **Decisión.** El diálogo de cuenta distinta y «Cambiaste de cuenta» son un `<dialog>` nativo abierto con `showModal()`, con `role="alertdialog"`, un título por `aria-labelledby` y un componente común, `BlockingDialog`:
  - `onCancel` llama a `preventDefault()` (Esc no lo cierra);
  - `onClose` lo vuelve a abrir;
  - al abrir, el foco va al primer botón de sus acciones, que es la opción que no pierde nada (FR-039).
- **Por qué.** `showModal()` deja inerte todo lo de afuera y atrapa el foco sin librería (SC-003; «Sin hacer a propósito»: ninguna librería de diálogos). Chrome no deja cancelar el evento `cancel` si no hubo una activación del usuario desde la última vez (la regla de los *close watchers*), y entonces Esc cierra igual: por eso `onClose` reabre. Es lo que hizo F11a con su diálogo del acceso (`impl-f11a`, `AccessDialog.tsx`, commits `f590e84c` y `8b0504e0`).
- **Verificación.** Las specs de T010 (el `cancel` queda cancelado y un `close` reabre) y el E2E de US3 con dos Esc seguidos (T025, «Review Focus» 2).

## R6. Los diálogos anidados y el burbujeo simulado de React **(propuesta del plan)**

- **El problema.** La pregunta al salir se dibuja dentro de «Tu cuenta», que es otro `<dialog>` con `onClose`. React no delega `cancel` ni `close`, pero igual junta los manejadores de todos los ancestros en el árbol de fibras: el `close` de la pregunta llegaría al `onClose` de «Tu cuenta» y la cerraría. Por eso F11a compara `event.target` con `event.currentTarget` en su diálogo del acceso, y montó el aviso de privacidad como hermano de «Tu cuenta».
- **Decisión.** La pregunta llama a `event.stopPropagation()` en su `onCancel` y en su `onClose`. Lo mismo hace `BlockingDialog`.
- **Verificación.** «closing the question does not close the dialog around it», en la spec de T020 («Review Focus» 1).

## R7. La franja **(propuesta del plan, sobre FR-012 a FR-014)**

- **Decisión.** Un `<div id="sync-notices" class="sync-notices" aria-live="polite">`, sin `role`, montado por el shell desde el primer dibujo. Cada aviso es un `div.sync-notice` con su texto en un solo `<p>` (TR-13) y sus botones. Vacía, `:empty` la oculta y no ocupa lugar. El orden sale de `activeNotices` (pestaña vieja, sesión vencida, época, rechazos y reloj). Dos estados viven en la franja y no en D1c:
  - «Entendido» del reloj, que lo oculta por lo que dura el documento (L5): un `useState` de la franja, que no se recrea;
  - la confirmación de «Descartar la copia» (FR-026): un `useState` del aviso de la época. Al pasar a la confirmación, el foco va a «Cancelar», y al cancelar vuelve a «Descartar la copia». Es un cambio que pidió el alumno: FR-014 habla de los avisos que aparecen solos, que nunca mueven el foco.
- **El id como contrato.** La franja no tiene rol (FR-013), así que los Page Objects la ubican por `#sync-notices`, como ya ubican `#toast` (`qa/e2e/pages/shell.ts`).
- **Descartado.** `role="status"` o `role="alert"` (rompen los E2E que ubican la compuerta y `#toast`, F11 FR-076) y un `aria-label`, que no suma nada a una región sin rol.

## R8. «Ingresar» y «Cambiaste de cuenta» **(propuesta del plan, sobre FR-015 y FR-016)**

- **Decisión.** «Ingresar» llama a `reauthenticate(idDeLaPestaña, {requestSignIn, reloadDocument})` de F11a con una recarga propia: si entró otra cuenta y `lostOnUnload` es mayor que 0, abre «Cambiaste de cuenta»; si no, recarga. Si entró la misma, D1c sigue solo, porque se suscribe a `sessionStore` (D1c, T016) y el aviso se va cuando su estado cambia.
- **El alcance.** «Cambiaste de cuenta» sale del «Ingresar» de la franja, que es el camino de US6. Otras pantallas que llaman a `reauthenticate` ante un 401 (F11b, F12a, F8) recargan con su propio `reloadDocument`, sin la pregunta: es un hallazgo (ver el informe), porque cambiarlas edita ítems ajenos.
- **El id de la pestaña.** Es `sessionStore.getState().user.id` en el momento del clic: un 401 de la sincronización no toca `sessionStore` (el cliente de la API de F11a vive en `shared` y no lo conoce).

## R9. «Salir» **(propuesta del plan, sobre FR-030 a FR-034)**

- **Decisión.**
  - `SignOutSection` pasa a `signOut` el puerto de D1c (`progress`), `onPhase` (la etiqueta del botón: «Enviando tus cambios…» y después «Saliendo…») y `choose`, que abre la pregunta y devuelve una promesa que resuelve la respuesta.
  - **El motivo** de lo que quedó (`LeftReason` de D1c): `offline` es «no hay conexión con el taller»; `signed-out`, «tu sesión venció»; `error` y `outdated`, «el taller no responde», como propone el contrato de D1c (§4). Con `account-changed` y el diálogo de cuenta distinta abierto, `choose` responde `stay` sin preguntar: el diálogo reemplaza a la pregunta y nada se descarta (Edge Cases). Con `account-changed` sin diálogo (un 403 `account_disabled` detiene a D1c sin cambiar el estado), pregunta con «el taller no responde».
  - **«Descargar una copia»** (en memoria) baja el archivo de `downloadUnsent()` y deja la pregunta abierta: después el alumno elige «Salir sin enviarlos» o «Volver al taller». Es lo que hacen el diálogo de cuenta distinta y «Cambiaste de cuenta», y SC-004 cuenta cinco caminos de «Salir» sin uno de «descargar». El contrato de D1c (§5) decía «descarga y responde `discard`»: es una decisión para el usuario (la 3 del informe).
  - **La nota** depende del estado: antes del primer estado de D1c (`status === null`), la de F11a (FR-052), porque el progreso sigue donde estaba; con estado, la del modo (FR-034).
  - **El foco** vuelve a «Salir» cuando la pregunta se cierra sin salir (FR-039): el botón estaba deshabilitado, así que el foco que devuelve el navegador al cerrar el diálogo no alcanza, y `SignOutSection` lo pone después de habilitarlo.

## R10. Los formatos **(propuesta del plan: «El plan fija los formatos con sus pruebas»)**

- **`{fecha}` pasa a `{cuándo}`.** La spec escribe «se borró … el {fecha}» y propone «hoy a las 14:32»: juntos dan «el hoy a las 14:32». El formato incluye el artículo cuando hace falta: «hoy a las 14:32», «ayer a las 9:05», «el 3 de octubre a las 14:32» y, de otro año, «el 31 de diciembre de 2025 a las 20:59». Con `resetAt` en `null`, la frase no lleva momento.
- **Hoy y ayer** se comparan por el día del calendario local, no por UTC: las 23:30 de Buenos Aires del 27 son las 02:30 UTC del 28 («Review Focus» 5).
- **La hora** va sin cero adelante y con «a la» para la una: «a la 1:05», «a las 0:15».
- **Los meses** son una lista propia, no `Intl` con nombres, para que el texto no dependa de los datos de ICU de cada navegador. Los números salen de `Intl.DateTimeFormat#formatToParts` con `hourCycle: 'h23'`.
- **El reloj**: minutos redondeados de `|clockSkewMs| / 60 000`. Como el aviso pide más de 120 000 ms, nunca dice «1 minuto»; 150 000 ms son «3 minutos» (`Math.round(2.5)`). Positivo es «adelantado».
- **Los plurales**: cada texto con `{n}` tiene su forma singular, escrita entera (FR de «Los formatos»). Las etiquetas de los botones («Conservarlos y salir») no llevan `{n}` y quedan como están.

## R11. Los estilos

- **Decisión.** Las reglas de la línea, la franja y los diálogos de cuenta van al final de la hoja del shell (`frontend/src/app/shell/shell.css`, contrato de F10c), con los tokens de F10c: `--color-green` para «al día» (el punto de hoy), `--color-muted` para «en curso» y `--color-recommended` (`#e69a70`) para «problema», que no cambia con el lenguaje. Las de «Tu progreso» y la pregunta van a `pages/account/ui/account.css`, la hoja de «Tu cuenta», que F10c deja en su lugar. Sin F10c en la base, una tabla de equivalencias (plan, T017) dice qué valor escribir en lugar de cada token.
- **Movimiento reducido.** Ninguna regla nueva tiene transición ni animación, y el punto no gira: «Enviando a tu cuenta…» se lee en el texto (FR-041).
- **Si F13 entra después de F15a,** los briefs de T017 y T020 pasan a utilidades de Tailwind (la decisión del usuario del 2026-10-28, Q5-A de F15). El plan no se escribe para Tailwind.

## R12. Las pruebas de punta a punta

- **Sin conexión** es un pedido abortado en el doble (`{status: 0, abort: true}`, el `abort` que suma A3), no `context.setOffline`. Context7 dice que las rutas corren antes de la pila de red y que `route.fulfill` responde sin tocarla: el doble respondería igual con el contexto sin red. La lista blanca del error de consola es `/net::ERR_FAILED/` (TR-11).
- **La respuesta al día** sale de un ayudante nuevo, `syncReply(call, contentVersion, {serverTimeShiftMs, rejected})` en `qa/e2e/lib/sync-replies.ts`. El método privado `upToDateSync` del doble de D1c pasa a delegar en él (T023), así que hay una sola forma de la respuesta.
- **El tiempo.** La espera de 2 s y los reintentos de 5 y 15 s se recorren con `page.clock.install` y `runFor` (Context7). Los E2E del reloj no tocan `page.clock`: el desfase sale del `serverTime` respecto del `sentAt` del lote (Assumptions de la spec).
- **La zona horaria** de los E2E de la época es `America/Argentina/Buenos_Aires` (`test.use({ timezoneId })`), para que «hoy a las 9:00» no dependa de la máquina.
- **`beforeunload`.** `page.close({ runBeforeUnload: true })` corre los manejadores y no espera el cierre. El diálogo se espera con `page.waitForEvent('dialog')` y se comprueba `dialog.type() === 'beforeunload'`. Para afirmar que no hubo diálogo, un contador acepta cualquiera y la prueba espera el evento `close` de la página.
- **SC-002 sobre toda la red.** Una fixture automática nueva, `quietSync`, comprueba al terminar cada E2E que la franja quedó vacía y que no hay un diálogo de cuenta distinta abierto. Las specs de F13 la apagan con `test.use({ syncNotices: 'allowed' })`. Cambia una fixture, no un escenario (FR-046).
- **«Ingresar» dos veces en la página.** Con la sesión vencida, la franja tiene «Ingresar» y el formulario del acceso también. `access.button('Ingresar')` de F11a no está acotado al diálogo, así que F13 suma `access.signInFromDialog(email, password)`, que sí lo está.

## R13. La entrada en servicio y la nota de FR-052

- **El problema.** Desde que la U3 de D1c vincula el espacio, la nota de F11a («Tu progreso se guarda en este navegador, no en tu cuenta…») dice algo falso, y la U4 de D1c ya limpia el espacio al salir.
- **Decisión (propuesta, decisión 2 del informe).** F13 se parte en dos tramos de entrega:
  - **U1 y U4** («Salir», la nota, la pregunta y «Tu progreso») no dependen de F10b: `SignOutSection` vive en `pages/account`, bajo `AccountRoot` o bajo `AppRoot`. Entran apiladas justo después de la U5 de D1c, en el mismo tren que D1c U3 a U5 y F11d, y se mergean seguidas. Ninguna versión publicada tiene la nota falsa.
  - **U2, U3 y U5** esperan a F10b, porque dibujan en el shell de React.
- **Lo que queda entre los dos tramos,** si F10b llega después de D1c: sin toasts, franja, diálogo de cuenta distinta ni confirmación al cerrar. Lo mitigan el envío de D1c al ocultar la pestaña (FR-063) y que el modo compartido recién se elige con F11d.

## R14. Lo que la spec pedía y el plan precisa

- **«Los 5 avisos a la vez»** (US6, escenario 6, y SC-007) no pueden pasar: la pestaña vieja (`outdated`) y la sesión vencida (`signed-out`) son dos valores del mismo `status`. Vitest prueba el orden con cuatro (la pestaña vieja, la época, los rechazos y el reloj) y aparte la sesión vencida en su lugar; el E2E de 320 y 390 px arma tres.
- **La época sin copia en un E2E** (US4, escenario 1) pide una copia local de D1c en una época vieja, y sembrarla exige el formato interno de `taller-v2:<id>:copia`. Vitest cubre FR-024 con el estado de D1c armado; el E2E cubre la época con copia, que es el caso que pierde datos.
- **FR-046 y FR-034 chocan.** El E2E de F11a «opens from the top bar…» (`qa/e2e/specs/account.spec.ts`) afirma la nota de FR-052, que FR-034 reemplaza. Editarlo es el cambio de comportamiento que FR-046 prevé, con TDD, en su propio commit y con la aprobación del usuario (decisión 1 del informe).

## Consultas de Context7 y de documentación oficial

Con el segundo servidor de Context7 (el primero agotó su cuota el 2026-10-28). Las versiones son las de `package-lock.json` en `6caa00f4`.

| Librería | Versión | ID | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Playwright | 1.63.0 | `/microsoft/playwright` | `page.close({ runBeforeUnload })` y el diálogo `beforeunload` | Corre los manejadores sin esperar el cierre; el diálogo se maneja con el evento `dialog` y `dialog.type()` | Sí: los E2E de US5 esperan `dialog` o `close` (T027) |
| Playwright | 1.63.0 | `/microsoft/playwright` | `browserContext.setOffline` y las rutas | Las rutas corren antes de la pila de red y `fulfill` no la toca; el contexto sin red afecta la pila | Sí: «sin conexión» es un `abort` del doble, no `setOffline` (R12) |
| Playwright | 1.63.0 | `/microsoft/playwright` | `page.clock`: `install`, `runFor`, `fastForward` y `setSystemTime` | `runFor` dispara todos los temporizadores del tramo; `install` deja correr el reloj | Sí: la espera y los reintentos con `runFor` |
| Zustand | 5.0.15 (docs de v5.0.12) | `/pmndrs/zustand/v5.0.12` | `subscribe(listener(state, prev))` y `useStore(store, selector)` | El oyente recibe el estado; `useStore` con selector | No |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12` | Selectores que devuelven referencias nuevas en v5 | Un selector con un objeto o un arreglo nuevo cae en un bucle; `useShallow` lo evita | Sí: selectores primitivos (R2) |
| fishery | 2.4.0 | `/thoughtbot/fishery` | `Factory.define` y `build(params)` | `build` mezcla en profundidad; `null` reemplaza, los arreglos se reemplazan | No: `syncStateFactory` (T005) |
| jsdom | 30.1.2 (docs de v29) | `/jsdom/jsdom` | `HTMLDialogElement` y la navegación | `showModal` y `close` no existen; `location.reload` no navega | Sí: las specs reemplazan `showModal` y `close` (`stubDialogs`) y reciben `reloadDocument` |
| React | 19.2.8 | `/reactjs/react.dev` | El contexto como proveedor y `useSyncExternalStore` | `<Context value>` y `useSyncExternalStore(subscribe, getSnapshot)` | Sí: `useSyncSnapshot` (T008) |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | `vi.stubGlobal` y `vi.unstubAllGlobals` | Reemplazan y devuelven un global, también `window` en el proyecto `node` | Sí: `reload-document.spec.ts` (T002) |
| user-event | 14.6.7 | `/testing-library/user-event` | Enter y Espacio sobre un botón; `user.tab()` | Enter hace clic en `keypress`, Espacio en `keyup` | No: las specs de teclado de T012 |

**Lo que Context7 no confirmó:** que Chromium pida una interacción previa para mostrar `beforeunload` (R4) y que el `cancel` de un diálogo no sea cancelable sin activación (R5). Las dos cosas son de la especificación de HTML y del comportamiento de Chrome; el plan no depende de ellas, porque los E2E hacen clic antes y el diálogo reabre en `close`.

## Cómo se verificó al planificar

Se leyó, sin correr nada: la spec de F13 entera, el plan, el contrato, los datos y el research de D1c (PR #93), los planes de F10a, F10b, F10c, F11a, A3 y F8 en `master`, el código de `impl-f11a` (el doble, los Page Objects, `AccessDialog`, `reauthenticate`, `AccountRoot`) y `master` (`styles.css`, `qa/lib/seams-guard.ts`, los E2E de F1). No corrieron `npm`, Vitest, Playwright ni un navegador: T001 toma la línea base y las detecciones, y cada compuerta mide.
