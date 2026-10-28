# Research: F8 · El port de Método

**Plan:** [plan.md](./plan.md) · **Spec:** [spec.md](./spec.md) · **Contrato:** [contracts/method-interfaces.md](./contracts/method-interfaces.md)

**La base leída.** `master` en `a24154d4`, con F2a, A2 y las cuatro unidades de F2b. Todas las citas de código salen de ahí, salvo las de F11a, que salen de su plan sin mergear (`plan-f11a`, rama `plan/f11a-acceso`, `b1f2e4c5`): `specs/015-f11-acceso-cuenta/plan.md` y `contracts/front-interfaces.md`. Se usan sus firmas tal cual. El backend es el de `master`.

**Lo que no se hizo.** No se corrió `npm`, Docker ni un navegador, ni se descargó nada: el worktree no tiene `node_modules`. Las medidas que hacen falta las toma T001 sobre la base de implementación.

## R1. Un PR, seis unidades y el orden de los commits

- **Decisión:** F8 es un solo PR (FR-006), pero se implementa en seis unidades, cada una con su compuerta:
  - **U0:** la línea base y la detección de lo que ya trajeron otros ítems (T001).
  - **U1:** los E2E contra el legacy, primero en verde y después los tres de React en rojo (T002 a T004).
  - **U2:** el CSS sobre el DOM legacy (T005).
  - **U3:** el port con el «Borrar todo» local de hoy (T006 a T013).
  - **U4:** «Borrar todo» con el servidor, primero en rojo (T014 a T020).
  - **U5:** las comparaciones únicas, la documentación, el peso y el PR (T021 a T023).
- **Por qué este orden:**
  - FR-001 pide los E2E contra el legacy primero, y los de X1 y Q4 en el commit en rojo.
  - El CSS se muda antes de montar la página, como en F9 (su research, R10). Así el barrido compara el mismo DOM y cualquier diferencia es de cascada, también con la confirmación abierta, que en U4 cambia de forma a propósito.
  - FR-001 pone el cambio de Q1 «en su propio commit, después del port». U4 parte del port con el borrado local, de modo que el rojo de Q1 falla contra la página nueva y no contra el legacy.
- **Alternativa descartada:** la partición F8a y F8b de la spec («Partición»). La spec no la aplica, y F8 se implementa después de F11a, así que la espera que la justificaba ya no existe. Si F11a se demora, U0 a U3 igual se pueden implementar y revisar: U4 es la única que necesita F11a.

## R2. L10: R4 se amplía, para un solo archivo

**El guard real.** `qa/lib/seams-guard.ts` (`indexViolations`) mira sólo `frontend/*.js` y `frontend/src/app/**`. Ahí, ningún archivo puede importar un valor del índice de `entities/guide`, `exercise`, `campaign` o `systems-workshop`, salvo su dueño:

| Slice | Dueño hoy |
| --- | --- |
| `guide` | `frontend/app.js` |
| `exercise` | `frontend/lab.js` |
| `campaign` | `frontend/src/app/legacy/register-campaign-engine.ts` |
| `systems-workshop` | `frontend/src/app/legacy/register-systems-engine.ts` |

El motivo está en el comentario de la regla: los checks empaquetan cada fuente legacy por separado, y un segundo importador del índice dejaría un segundo almacén o motor en el contexto del check.

**Las tres salidas de la spec, contra ese guard:**

- **(a) El armado pasa a ser el dueño de esos índices.** No sirve:
  - `app.js` sigue importando `routeStore`, y F9 le suma `trackSteps` y `toggleRouteItem` (su contrato, §3);
  - los dos `register-*-engine.ts` siguen publicando los motores en `window` mientras `campaign.js`, `systems.js` y `lab.js` los lean.

  Cambiar el dueño rompe a los dueños de hoy.
- **(b) El armado los recibe de sus dueños.** Para los motores, sería leer `window.TallerCampaignEngine` y `window.TallerSystemsEngine`, como hoy. Para `routeStore`, el único dueño es `app.js`, que no lo publica y que recibe la instancia ya armada (Q2): sería circular.
- **(c) R4 se amplía con su motivo.** Es la elegida, acotada a un solo archivo: `frontend/src/app/progress-backup/app-progress-backup.ts` puede importar valores de `guide`, `campaign` y `systems-workshop`.
  - **El motivo, escrito en el guard:** ese archivo sólo se evalúa dentro del grafo de `main.tsx`, donde también están los dueños. Lo importa `legacy-views.ts` con un `import()` dinámico, después de la compuerta, y ningún check lo empaqueta solo.
  - **Lo que lo garantiza en `qa/`:** `app-shell-check` arma su propia instancia con `createProgressBackup` y áreas falsas, en el mismo bundle que `app.js` (R10). `boot-check` lo toma del mismo bundle que `main.tsx`.

**Cómo se prueba:**

- `seams-guard-check` suma dos escenarios, primero en rojo:
  - el armado puede importar los tres índices;
  - otro archivo de `app/` al lado del armado sigue reportado por lo mismo, para mostrar que la ampliación es angosta.
- `singletons-import.spec.ts` suma un caso: importar el armado no toca `localStorage` ni lee `window`.
- «the real tree has no violations» sigue en verde.

**Por qué importar los motores y no leer `window`:**

- Es lo que propone la spec (tabla «Qué queda en `window.Taller*`»).
- Cuando el último lector legacy de `window.TallerCampaignEngine` se porte, el global se puede retirar sin tocar el armado.
- Los motores son los mismos objetos que publican los adaptadores: espiar `window.TallerCampaignEngine.reset` en `boot-check` sigue viendo la llamada del armado.

## R3. El armado en `src/app/`: tres módulos y una sola instancia

**La decisión** (contrato, §2): el armado son tres módulos en `frontend/src/app/progress-backup/`.

| Módulo | Qué hace | Cómo se prueba |
| --- | --- | --- |
| `progress-areas.ts` | `createProgressAreas(sources)`, puro: traduce el recorrido, los dos motores y lo que todavía vive en `window` a las `ProgressAreas` de la feature, con las mismas lecturas de hoy (`?.removed`, el adaptador ausente que da `undefined` y `backups?.() ?? []`) | `progress-areas.spec.ts`. Hoy sólo lo cubren los escenarios h) de `app-shell-check`, que se van |
| `server-reset.ts` | El paso del servidor de Q1 (R5) | `server-reset.spec.ts`, con el cliente real de F11a y su `fetch` falso |
| `app-progress-backup.ts` | `appProgressBackup()`, que crea la instancia en la primera llamada y después devuelve siempre la misma | Por `boot-check` y por los E2E, porque necesita el contenido publicado |

**Las reglas del armado:**

- **Una sola instancia.** `appProgressBackup()` la crea perezosamente y la recuerda (FR-015: «nadie DEBE crear otra»).
  - La llama `legacy-views.ts`, en su propia línea, antes de `startApp(progressBackup);`. Así, aunque el plugin `withoutStartCall` borre esa llamada, la instancia se arma igual y en silencio: sin almacenamiento, sin oyentes ni intervalos.
  - `boot-check` la lee del mismo bundle (R10).
- **El temporizador.** El tipo `AppProgressBackup` agrega `registerSessionReset(reset)` a `ProgressBackup`.
  - Va en el envoltorio del armado y no en la feature, porque D1c reimplementa la feature.
  - El armado arranca con `[simulaciones]`, y `startApp()` registra el cierre del temporizador. El orden de hoy, primero las simulaciones y después el temporizador, queda por construcción.
  - Si F9 ya entró (R12), el armado registra `focusTimer.reset` y `registerSessionReset` no se escribe.
- **El contrato de `startApp()`.** Pasa a ser `startApp(progressBackup)`. La usan «Exportar mi progreso» y el registro del temporizador, y `render()` se la pasa a `window.TallerMethod.mount`.
- **Cómo llega la instancia a la página.** `app.js` se la pasa a `TallerMethod.mount` en `render()`, la misma que recibió. El adaptador no importa el armado ni ningún singleton.
- **Lo que comparten la barra lateral y la página** (FR-013). `shared/lib/download-file.ts` suma `downloadJsonFile(file)`, el único lugar que convierte un `ProgressFile` en una descarga `application/json`.
  - `app.js` y la página llaman a `exportProgress()` de la misma instancia y después a `downloadJsonFile`.
  - Los respaldos usan `readBackup` y `downloadJsonFile`.
  - El nombre y el texto los arma la feature, una sola vez.
- **Alternativas:**
  - **Pasarle la instancia al adaptador importando el armado:** el adaptador arrastraría los singletons a su grafo.
  - **Un `export` de la instancia ya creada:** obligaría a evaluar `getContent()` al importar, y `singletons-import.spec.ts` no podría importarlo.
  - **Exportar el armado entero como fábrica y que cada uno cree la suya:** contradice FR-015.

## R4. La feature: un paso del servidor optativo y un resultado que también rechaza

**La decisión** (contrato, §1):

- **`ProgressBackupOptions` suma `serverReset?: ServerReset`.**
- **`resetAll(confirmation?)` pasa a resolver `ResetOutcome`:**
  - **el éxito**, `ProgressNotice` (`{notice}`), exactamente como hoy;
  - **el rechazo**, `{refusal}`.
- **Con el paso:**
  - `resetAll` lo llama primero;
  - si el servidor no confirmó, devuelve el rechazo sin tocar ningún área;
  - si confirmó, corre el borrado local de hoy.
- **Sin el paso**, es el borrado local de hoy.

**Por qué así:**

- **`create-progress-backup.spec.ts` no se edita:**
  - construye la feature sin el paso y espera `toEqual({ notice: … })`;
  - un campo `kind` en el éxito lo rompería;
  - «ignores the confirmation» sigue valiendo, porque sin el paso la confirmación no se usa.
- **La lógica local no cambia un byte.** La función `resetAll(areas, sessionResets)` queda igual, y un envoltorio nuevo, `resetWithServer`, decide si la llama.
- **La feature no importa el cliente ni F11** (FR-015). `ResetRefusal` es una forma propia, con los mensajes ya decididos, y el armado la produce (R5).
- **Las pruebas nuevas** van en un archivo nuevo, `reset-with-server.spec.ts`, para que el viejo quede idéntico:
  - el orden: el servidor antes del primer `reset`;
  - con un rechazo, ningún evento local;
  - sin confirmación, una contraseña vacía.

**El riesgo y su resguardo.** Un armado que se olvide del paso borraría sólo lo local. Lo cubren tres cosas:

- el armado lo pasa siempre, con su tipo;
- `boot-check` suma «los tres pedidos van antes del primer reset local» con los adaptadores reales;
- el E2E de Q1 cuenta los tres pedidos.

## R5. El paso del servidor y cada respuesta

**El flujo** (FR-022 y FR-024), en `createServerReset(dependencies)`:

1. **La cuenta.** `accountId()` lee `sessionStore.getState().user?.id`. Sin cuenta, el paso no pide nada y rechaza con «La sesión cambió de cuenta: recargá la página.» y «Recargar». Con la sesión obligatoria de F11a no debería pasar.
2. **La contraseña.** `client.send('POST', '/api/auth/confirm-password', {password}, {asUser})`. El `asUser` hace falta: la ruta está en el grupo `account`, que incluye `account.expected` (`routes/api/account.php`), así que sin `X-Taller-User` el servidor responde siempre 409 `account_mismatch`.
3. **La época.** `client.get('/api/progress')`. Se lee `body.epoch`, que tiene que ser un entero de 1 o más; si no, el paso lo trata como «el taller no responde».
4. **El reset.** `client.send('POST', '/api/progress/reset', {format: 2, epoch}, {asUser})`.
5. **El final.** Con el 200, resuelve `{confirmed: true}`. Con cualquier otra cosa, rechaza según la tabla.

**El 401 y la sesión que se fue.** Un `signed-out` del cliente, o un 401, llaman a `reauthenticate(accountId)` de F11a:

- con la misma cuenta, el rechazo pide vaciar el campo (`clearPassword`), sin mensaje y sin reintentar (L3);
- con otra cuenta, `reauthenticate` ya recargó el documento, y el rechazo viene vacío.

**La traducción.** `refusalFor(failure)` es pura y tiene su tabla en la spec:

| Falla | Rechazo |
| --- | --- |
| `network`, `unexpected`, o una respuesta 5xx (incluidos el 502 y el 504 de Nginx y el 503 `content_not_imported`) | General: «No pudimos borrar tu progreso: el taller no responde. No se borró nada; probá de nuevo más tarde.» (L6) |
| 409 `epoch_mismatch` | General: el texto de L5 |
| 422 `auth_failed` y 423 `password_confirmation_required` | En el campo: el mensaje del servidor (L2; ver la decisión 1 del informe) |
| 409 `client_outdated` y 403 `account_disabled` | General, con «Recargar» |
| `account-changed` (un 419 que volvió con otra cuenta) | General, con «Recargar» |
| El resto (429, 409 `account_mismatch`, 403 `email_unverified`, otros 4xx, un 422 con `errors.password`) | `describeFailure(failure, ['password'])` de F11a: el campo, el general, `Retry-After` y «Recargar» para `account_mismatch` |

- **`describeFailure` sola no alcanza:**
  - pone `auth_failed` en el general;
  - el 5xx con JSON lo muestra con el mensaje del servidor;
  - no ofrece recargar ante `client_outdated`.

  `refusalFor` resuelve esos casos antes y le deja el resto, para que el 429 diga lo mismo que en el resto de F11a (L4).
- **El 403 `account_disabled`:** F11 FR-023 pide volver al acceso. Con la confirmación abierta, eso se lee como el mensaje del servidor con «Recargar». La recarga arranca la etapa de sesión, que muestra el acceso.
- **La complejidad:** `refusalFor` se parte en `refusalFor` y `refusalForResponse`, cada una por debajo de 6.

## R6. La página

**Las piezas** (contrato, §4): `pages/method` con `MethodPage` y siete componentes:

- `MethodIntro`: el encabezado y la grilla, estáticos;
- `JournalPanel`: la bitácora y `#note-state`;
- `TutorPanel`: el pedido y la copia;
- `SourcesPanel`;
- `BackupsPanel`;
- `ProgressPanel`: exportar, importar y «Borrar mi progreso»;
- `ResetDialog`.

El modelo puro, en `model/method-texts.ts`, tiene `tutorPrompt`, los dos textos de `#note-state` y `backupSizeLabel`.

**Las decisiones:**

- **El progreso, en cada render.** `useStore(store.changes, (state) => state.revision)` suscribe, y cada componente lee `store.getProgress()` al dibujar y en cada manejador (FR-031).
  - `store` llega por prop, con `routeStore` por omisión, como en F9 (su research, R5): las specs abren su propio `createRouteStore()`.
  - El idioma sale de `store.getProgress().language` en cada render, nunca de una prop de `mount`, porque «Borrar todo» lo vuelve a Rust sin remontar.
- **La bitácora controlada.** Cada `textarea` lleva `value` de `routeStore` y un `onChange` que asigna `notes[idioma][campo]` y llama una vez a `store.save()`.
  - React vuelve a dibujar en el mismo evento, porque `useStore` se apoya en `useSyncExternalStore`, así que el cursor no salta (documentación de `<textarea>` de React).
  - Después de importar, el campo muestra la nota nueva sin remontar (riesgo 3 de la spec).
  - La alternativa, sin controlar y con una `key` que lo remonte, perdería el foco y el cursor de quien escribe.
- **`#note-state`.** Es un `useState` de `JournalPanel`: arranca con el texto de montar (según `storageAvailable()`) y cambia después de cada tecla.
  - Importar y «Borrar todo» no lo tocan (Q4).
  - El shell remonta la página al navegar o al cambiar de idioma, y el texto vuelve al inicial.
- **La copia del pedido.** `lib/copy-with-fallback.ts` intenta, en orden:
  1. `navigator.clipboard.writeText`;
  2. el campo temporal con `execCommand('copy')`;
  3. la selección del `blockquote`.

  Conserva las dos propiedades CSSOM de hoy en el campo temporal (`style.position` y `style.top`): FR-036 deja elegir, y una clase sería una segunda regla nueva, que SC-005 no admite.
- **El campo de archivo.** Va dentro de la página, después de `.data-explainer`, con `hidden`, el mismo `accept` y el mismo `aria-label`.
  - Un `ref` lo abre desde «Importar una copia».
  - `hidden` lo saca del flujo con `[hidden] { display: none !important; }` de `styles.css`, así que no cambia la grilla de `.data-actions`.
  - FR-035 admite su lugar distinto.
- **El foco después de importar.** Nadie lo mueve: el botón sigue en el documento (X1).
- **El panel de respaldos.** Vuelve a leer `listBackups()` en cada render. Cualquier cambio que importe para el panel pasa por un `notify` del recorrido: el `applyImport` del recorrido es el último paso de la importación, y el `save()` va después de «Borrar todo».

## R7. La confirmación

**La decisión.** `ResetDialog` se monta sólo mientras está abierta, con un portal a `document.body` desde la raíz de la página (F9-Q4). Así funciona:

- **Al abrir.** Un efecto llama a `showModal()`. El navegador enfoca el primer elemento enfocable: «Conservar mi avance» antes de Q1 y el campo de la contraseña después (L12, sin `autoFocus`).
- **Al cerrar.**
  - El evento nativo `close` sincroniza el estado de React con `onClose` (FR-021). Cubre «Conservar mi avance», Esc y el cierre después del éxito.
  - Al desmontarse, el efecto llama a `close()`, también cuando el alumno navega con la confirmación abierta.
- **El éxito.**
  1. `resetAll` resuelve el aviso.
  2. `ProgressPanel` llama a `store.save()`.
  3. El diálogo se cierra con `close()`, que devuelve el foco a quien lo abrió.
  4. `ProgressPanel` enfoca «Borrar mi progreso» y avisa.

  El foco explícito hace que el resultado no dependa del navegador (FR-023).
- **La espera (L9).**
  - Mientras el envío está en curso, «Conservar mi avance» queda deshabilitado, el campo pasa a `readOnly` y «Borrar todo» dice «Borrando…» y queda deshabilitado.
  - Esc se frena dos veces: `onCancel` con `preventDefault()` y `onKeyDown` con `preventDefault()` para `Escape`. El `cancel` de un diálogo se puede cancelar una sola vez sin una activación del usuario de por medio (el modelo de *close watchers* del estándar HTML). Prevenir el `keydown` corta el pedido de cierre en su origen.
  - Un E2E aprieta Esc dos veces con el pedido retenido. Es la entrada 2 de la «Review Focus».
- **El formulario.** Lo arma React Hook Form, como en F11a: `criteriaMode: 'all'`, `noValidate`, `handleSubmit` y `useGuardedSubmit`, con `PasswordField`, `ServerError` y `useRetryCountdown` de `shared/ui/form`.
  - Los botones van dentro del `<form>`, en su `.dialog-actions` de siempre, y fuera de `.form-stack`, para que su ancho no los limite a 440 px.
  - El campo y el error usan las reglas de `form.css` de F11a: ninguna regla nueva.
- **La diferencia de DOM.** Con la confirmación cerrada, `#confirm-dialog` no está en el documento, cuando hoy está siempre en `index.html`. FR-035 admite el lugar distinto, y esta ausencia va en la lista de diferencias de la comparación única.
- **Alternativas:**
  - **El `<dialog>` siempre montado y oculto:** deja React Hook Form en el DOM falso de `boot-check` y obliga a sincronizar el estado con el diálogo nativo.
  - **Un `onClose` que vuelva a abrir el diálogo si se cerró durante la espera:** reabre con el foco perdido.

## R8. El shell se entera de cada escritura

- **Decisión:** `startApp()` se suscribe con `routeStore.changes.subscribe(() => syncShell());`, justo después de `routeStore.open(data);`. Es la forma de F9 (su research, R4).
  - `syncShell` cubre `#save-label`, «N de 12», el porcentaje, la barra y el idioma (`body[data-language]`, `aria-pressed` y `#sidebar-language`), que «Borrar todo» devuelve a Rust (FR-033).
  - Todo lo que escribe es idempotente.
- **Lo compartido** (R12):
  - si la base ya tiene la suscripción con `syncShell`, F8 no suma nada;
  - si la tiene con `updateSaveLabel` (F3 o F4), F8 la cambia por `syncShell`, con un escenario en rojo de `app-shell-check`;
  - si no la tiene, la crea.
- **Por qué no `render()`:** remontaría la página y perdería el foco (X1).

## R9. El CSS

**Las reglas que se mudan:** 24, la cuenta de FR-037 más la clase que reemplaza al `style=`. Todas salen de `frontend/styles.css` de la base y van a `frontend/src/pages/method/ui/method.css`, enteras y en el orden de hoy:

| Dónde | Reglas |
| --- | --- |
| Base | `.button.danger`, `.method-grid`, `.method-panel`, `.method-panel h2`, `.method-panel p, .method-panel li`, `.routine`, `.routine li`, `.routine-time`, `.routine strong`, `.notes-panel`, `.notes-grid`, `.notes-grid textarea`, `.tutor-prompt`, `.source-list`, `.source-list li`, `.source-list a`, `.source-list p`, `.data-actions` y `.data-explainer` (19) |
| `@media (max-width: 1150px)` | `.method-grid` |
| `@media (max-width: 590px)`, el primero | `.notes-grid`, `.method-panel` y `.method-grid` |
| `@media print` | `.data-actions`, que sale de la lista mezclada con `.sidebar`, `.topbar`, `.focus-timer`, `.filter-bar`, `.filter-secondary`, `.favorite-button`, `.main-footer` y `#toast` |
| Nueva | `.routine-note { margin: 22px 0 0; }`, en lugar del `style=` de «¿Día complicado?…», después de `.routine strong` |

**Lo que se queda en `styles.css`**, porque lo usan otras vistas (se buscó cada clase en `frontend/`):

- `.page-heading`: Proyecto;
- `.field-label`: el laboratorio y el Atlas;
- `.note-state`: el laboratorio y Sistemas;
- `.text-button`;
- `.button` y sus variantes compartidas;
- `dialog`, `.dialog-content` y `.dialog-actions`: la lección y la confirmación del laboratorio.

**Verificaciones:**

- **`.button.danger`:** sólo lo usa la confirmación, según la búsqueda en `frontend/` y en los planes de F3 a F7a, F9 y F11a.
- **La cascada:**
  - `method.css` se importa en `main.tsx` justo después de `styles.css`, como el `atlas.css` de hoy y las hojas de F3 y F9. Vite separa el CSS de un chunk asíncrono (`build.cssCodeSplit`), así que importarlo desde la página lo sacaría del `<style>` único.
  - Dentro de la hoja, las reglas de los `@media` van después de las base y la de impresión al final. Así la base mudada no le gana a `display: none`, que es el riesgo que F9 encontró con sus reglas de impresión.
- **Los cruces revisados a mano:**
  - `.button:hover` (0,2,0) va antes que `.button.danger` (0,2,0), y sigue antes.
  - `.method-panel p` (0,1,1) le gana a `.note-state` (0,1,0) por especificidad, en cualquier orden.
  - `textarea:focus-visible` y `.notes-grid textarea` no comparten propiedades.
  - `.routine-note` (0,1,0) le gana a `p { margin-top: 0 }`, y ninguna otra regla fija `margin` en ese párrafo.

  El barrido es la prueba.
- **El orden del commit:**
  - El CSS va en un commit propio sobre el DOM legacy (T005), con el `style=` de `renderMethod` cambiado por `class="routine-note"`.
  - El barrido compara el legacy de la base con ese commit: el mismo DOM, salvo el atributo.
  - El multiconjunto da `onlyBase` 0 y `onlyUnit` 1, que es la regla nueva (SC-005).
- **Los bloques compartidos se parten por texto.**
  - En el de 1 150 px se borra la regla `.method-grid`.
  - En el primero de 590 px, las tres reglas de Método.
  - En impresión, la línea `  .data-actions,`.

  Si F3, F4 o F9 ya los tocaron, F8 rebasa y borra lo suyo de lo que quede.
- **`load-order-check`** suma dos restricciones: `styles.css` antes que `method.css`, y `method.css` antes que `lab.css`.

## R10. Los checks de `qa/`

**Las entradas virtuales.** Las dos resuelven la trampa de los singletons.

- **`app-shell-check`.** `loadAppShell` empaqueta una entrada virtual que exporta, del mismo bundle:
  - `startApp`;
  - `routeStore`;
  - `createProgressBackup`;
  - `createProgressAreas`, que es puro.

  `buildHarness` arma la instancia con las áreas de `createProgressAreas` sobre los adaptadores falsos de `window`, como hacía `app.js`, y se la pasa a `startApp`. Por eso los escenarios que quedan conservan sus valores.

  F3 planea la misma entrada, con `toggleItem` (su research, R10). El primero que entre la crea y el otro la amplía.
- **`boot-check`.** `bundleApp(entrada, { expose })` empaqueta `main.tsx` y además deja en `__QA_EXPOSED__` las exportaciones de los módulos que se le piden, del mismo bundle:
  - **«main.tsx without its call»** expone `app.js` y el armado, y los escenarios de `startApp` llaman a `startApp(appProgressBackup())`. Así deja de haber un segundo `app.js` empaquetado aparte, que hoy ya tiene su propio `routeStore`.
  - **«borrar todo» y las dos «importación: <fixture>»** exponen el armado y llaman a la instancia real.

**Las expresiones del arranque.** `START_CALL_STATEMENT` (`qa/lib/sources.ts`) y `START_CALL` (`qa/load-order-check.ts`) pasan de `startApp\(\);?` a `startApp\([^)]*\);?`, para que el plugin `withoutStartCall` y el check sigan viendo la llamada con su argumento. Cambia cómo cargan, no qué esperan (FR-041).

**El DOM falso:**

- `boot-harness.ts` pierde los cuatro ids estáticos de la confirmación y del campo de archivo, y suma `cookie: ''` al documento, porque el `send()` de F11a lee `document.cookie`.
- `app-shell-harness.ts` pierde esos cuatro y también `note-state` y `tutor-prompt`, que eran de la bitácora.

**La correspondencia de los 38 escenarios de `app-shell-check` y de los 3 de `boot-check`** está en el plan, §3.7. Los 20 que quedan en `app-shell-check` conservan sus valores. El de «almacén» que vaciaba una nota por el delegado pasa a `harness.writeNote`, que hace lo mismo que la página: asigna la nota y llama a `routeStore.save()` del mismo bundle.

## R11. Los E2E

**Los archivos:**

- `qa/e2e/pages/method.ts` (`MethodPage`);
- la fixture `method`;
- `qa/e2e/lib/method-files.ts`: la lectura de una descarga, las exportaciones congeladas y los archivos inválidos;
- cinco specs:
  - `method-journal.spec.ts`: US1, US5-2 y US5-3;
  - `method-files.spec.ts`: US2, US4 y US5-1;
  - `method-reset.spec.ts`: US3 con el borrado local de hoy;
  - `method-kept-state.spec.ts`: los tres de React, en rojo;
  - `method-reset-server.spec.ts`: Q1, en rojo.

**Las técnicas,** de la documentación de Playwright 1.63:

- **la descarga:** `page.waitForEvent('download')` antes del clic, y `download.path()` para leer los bytes;
- **la carga:** `page.waitForEvent('filechooser')` y `setFiles` con una ruta o un `{name, mimeType, buffer}`. No depende de dónde está el campo (spec, «Alternativas»);
- **la fecha del archivo:** `page.clock.setFixedTime('2026-03-04T05:06:07Z')`, que fija `Date` sin detener los temporizadores;
- **el portapapeles:** `context.grantPermissions(['clipboard-read', 'clipboard-write'])` y `navigator.clipboard.readText()` desde la página.

**El doble de la API** (U4, contrato de F11a, «Lo que suman otros ítems»):

- `api-contract.ts` suma a `MESSAGES` los códigos que F8 usa, copiados de `lang/es/api.php` y de `ContentNotImported`;
- `api-double.ts` suma tres rutas por omisión que responden bien: `confirm-password` 201, `GET /api/progress` 200 con `{userId, epoch: 1, revision: 0, …}` y el reset 200 `{epoch: 2, revision: 1}`.

  Con eso, los E2E de «Borrar todo» de F5 y F9 sólo necesitan escribir la contraseña. Cada falla se encola con `api.reply`, y la falta de red, con un `page.route(...).abort()` registrado después del doble, que Playwright prueba primero.

**Los errores de la consola.** Cada respuesta de error deja «Failed to load resource». Las pruebas lo declaran con `pageIssues.expectIssue`, como `session-stage.spec.ts` de F11a.

**`KNOWN DEFECT`** va en el nombre de las cuatro rarezas de «Método de hoy»:

- el recorrido en blanco que se vuelve a escribir;
- el idioma que vuelve a Rust;
- el éxito sin almacenamiento;
- el tamaño en caracteres.

## R12. Lo compartido con otros ítems, si F8 entra primero y si entra después

T001 detecta con comandos qué hay en la base. Cada tarea condicional dice qué hacer en cada caso.

| Pieza | Quién más la trae | Si no está en la base | Si ya está |
| --- | --- | --- | --- |
| La suscripción del shell | F3, F4 y F9 | T013 la crea con `syncShell` | Si llama a `updateSaveLabel`, T013 la cambia por `syncShell`; si llama a `syncShell`, nada |
| La entrada virtual de `app-shell-check` | F3 | T012 la crea | T012 le suma `createProgressBackup` y `createProgressAreas` |
| `harness.routeStore` | F3 | T012 lo suma | Se usa |
| `REACT_VIEWS` y la lectura del texto de React en `boot-check` | F3 (`renderedText`) y F9 (`drawnText` en `fake-dom.ts`) | T013 crea `REACT_VIEWS` y `renderedText` | T013 suma `'metodo'` al conjunto y usa la ayuda que haya |
| `qa/e2e/pages/method.ts` | F5 y F9 (`resetProgress()` y `confirmReset()`) | T002 la crea | T002 la amplía y conserva esos dos métodos |
| `resetSimulations` | F5 | El armado lee `window.TallerSystems?.resetSimulations()` | T009 importa `resetSimulations` de `pages/systems/session.ts` (la crea si F5 no lo hizo) y T013 lo retira del adaptador, de `APP_ADAPTER_METHODS` y de `RESET_METHODS` |
| El temporizador | F9 | `startApp()` lo registra con `registerSessionReset` | T009 registra `() => focusTimer.reset()` del índice de `pages/route` después de las simulaciones; T013 retira `resetTimer` del adaptador y su cierre de `app.js`; `registerSessionReset` no se escribe |
| Los bloques compartidos de CSS | F3, F4 y F9 | T005 los parte | T005 rebasa y borra lo suyo por texto |
| La pila de DOM de Vitest | F11a (o F3, F5 o F9 antes) | No puede faltar: F8 entra después de F11a | Los `*.spec.tsx` corren en el proyecto de DOM que haya (`dom` en F11a) |
| `toggleItem` y `escapeHtml` en `app.js` | F3, F4 y F9 | F8 no los toca | Igual |

**L11, aplicada:**

- Con los motores importados, el armado ya no lee `TallerCampaignEngine` ni `TallerSystemsEngine`. Los retira el último lector legacy, o F10.
- `TallerLab.planImport`, `applyImport`, `backups` y `reset` siguen en `window`, porque el laboratorio es legacy hasta F7b. Los retira el último de F7 y F8.
- `TallerCampaign.sync` y `TallerSystems.sync` siguen, porque `lab.js` los llama hasta F7.
- `resetSimulations` sigue la regla de orden de Q2.

## R13. El peso

- **La línea base:** T001 mide `dist/index.html` con F11a adentro. La hoja de ruta dice 1 141 337 con F2b; F11a se presupuesta +60 000.
- **Lo que sale de `app.js`:** unos 6 900 caracteres de fuente. `renderMethod` sola tiene 4 315, más `backupsPanel`, `tutorPrompt`, `copyPrompt`, los manejadores y el armado.
- **Lo que entra:**
  - la página con sus siete componentes;
  - el modelo;
  - el adaptador;
  - el armado con el paso del servidor.

  React Hook Form, `shared/ui/form`, el cliente y Zustand ya están en el bundle desde F11a y F2a. JSX compilado pesa más que una plantilla: se estima +6 000 a +8 000 neto.
- **La condición de corte:** si el HTML crece más de 9 000 caracteres respecto de T001, o pasa de 1 250 000, T023 para y avisa con la medida separada por módulo (el `metafile` de esbuild, como en el quickstart de F11a).

## R14. Las lecturas L1 a L12

Se toman todas con su recomendación. Las notas técnicas que agrega el plan:

| Lectura | Cómo la aplica el plan | Nota |
| --- | --- | --- |
| L1, la época con el `GET` | Paso 3 de R5 | — |
| L2, la contraseña siempre y primero | Pasos 1 y 2 de R5; el 422 y el 423 en el campo | F11 FR-025 manda un 422 `auth_failed` al error general, como en el ingreso, porque ahí no se sabe si falló el email o la contraseña. En la confirmación hay un solo campo. El plan sigue a F8 (FR-047) y lo pone en el campo, con `aria-invalid`: es la decisión 1 del informe |
| L3, el 401 sin reintentar | R5, `reauthenticate` | — |
| L4, el 429 con el tiempo | `describeFailure` de F11a | — |
| L5, `epoch_mismatch` | El texto de la spec, en `server-reset.ts` | — |
| L6, sin servidor | El texto de la spec; el botón nunca se deshabilita por adelantado | — |
| L7 | Confirmada por el usuario | — |
| L8, los textos | Los de la spec, tal cual | — |
| L9, la espera | R7 | Esc se frena en `keydown` y en `cancel`, por el límite de los *close watchers* |
| L10 | R2 | — |
| L11 | R12 | — |
| L12, el campo antes de los botones | R7 | `PasswordField` suma «Mostrar» después del campo, así que el orden de tabulación es: el campo, «Mostrar», «Conservar mi avance» y «Borrar todo» |

## Consultas de documentación

El servidor `mcp__context7__*` agotó la cuota del mes (2026-10-28). Todas las consultas salieron del segundo servidor, `mcp__44441c24-…`. Cuando Context7 no tenía el dato, se dice.

| Librería | Versión (lockfile o hoja de ruta) | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| React | 19.2.8 | `/websites/react_dev_reference` | `createPortal` a `document.body` | Lo del portal se comporta como hijo en el árbol de React: los eventos suben por React, no por el DOM | Sí: ningún ancestro de la página tiene `onClick` ni `onKeyDown` que la confirmación active sin querer |
| React | 19.2.8 | `/websites/react_dev_reference` | `flushSync` y `root.render` | `root.render` no es síncrono; `flushSync` hace el primer render antes de volver | Sí: el adaptador monta dentro de `flushSync` (FR-008) |
| React | 19.2.8 | `/websites/react_dev_reference` | `<textarea>` controlado | El estado se actualiza en el mismo `onChange` con `e.target.value`; si no, el cursor salta | Sí: la bitácora asigna el valor y guarda en el manejador (R6) |
| React | 19.2.8 | `/websites/react_dev_reference` | Eventos de `<dialog>` | React expone `onCancel` y `onClose`, que en React burbujean | Sí: el estado se sincroniza con `onClose`, y `onCancel` frena Esc en la espera (R7) |
| React Hook Form | 7.89.0 (la que instala F11a) | `/react-hook-form/documentation` | `isSubmitting` y `setError('root.serverError')` | `isSubmitting` vale `true` hasta que se resuelve la promesa del `onSubmit`; `handleSubmit` no se traga las excepciones | Sí: la espera de FR-025 sale de `isSubmitting`, y el envío nunca lanza: el paso devuelve resultados |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12` (la última con versión en Context7) | `useStore(store, selector)` con un store de `zustand/vanilla` | Suscribe a la parte que devuelve el selector | No: confirma el patrón de F2a |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | Proyectos en línea y `mockResolvedValueOnce` | Los proyectos en línea heredan la raíz y concatenan los arreglos | No: F8 no toca la configuración; sus specs `.tsx` corren en el proyecto de DOM de F11a |
| Testing Library (user-event) | 14.6.7 | `/testing-library/user-event` | `user.type`, `user.click` y `user.upload` | `upload` respeta `accept` y dispara `input` y `change` en el campo de archivo | Sí: la spec de `ProgressPanel` importa con `user.upload` sobre el campo oculto |
| jsdom | 30.1.2 | `/jsdom/jsdom/v29.0.1` (Context7 no tiene la 30) | `HTMLDialogElement` | Context7 no trae el dato. El ADR 0008 (§1) verificó que `showModal()` y `close()` no existen | Sí: las specs del diálogo definen un stub, y el foco y Esc van en E2E |
| fishery | 2.4.0 | — | — | F8 no define factories propias: usa `apiErrorBodyFactory` de F11a en `server-reset.spec.ts`, que arma cuerpos de error, nunca valores esperados | No |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `Download` (`waitForEvent`, `path`) | Se espera el evento antes del clic; `path()` espera la descarga y da el archivo | Sí: `downloadedText` en `method-files.ts` |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `FileChooser.setFiles` | Acepta rutas o `{name, mimeType, buffer}` | Sí: el archivo de más de 10 MB es un `buffer` |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `clock.setFixedTime` | Fija `Date.now` y `new Date()` y deja correr los temporizadores | Sí: la exportación usa `setFixedTime`, no `install` |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | Permisos del portapapeles | `grantPermissions(['clipboard-read'])` y `navigator.clipboard.readText()` | Sí: el E2E de la copia lee el portapapeles real |
| Vite | 8.3.2 | `/vitejs/vite/v8.0.10` (la más cercana) | `build.cssCodeSplit` | El CSS de un chunk asíncrono se separa en otro archivo | Sí: `method.css` se importa en `main.tsx` |
| Laravel | 13.34.0 (`composer.lock`) | `/laravel/docs/__branch__13.x` | `session()->regenerate()` y el token CSRF | Regenerar el id de sesión no cambia el token; eso lo hace `regenerateToken()` | No: igual, el cliente de F11a lee la cookie en cada pedido, así que el reset después de `confirm-password` lleva el token vigente |
| Pest y PHPStan | — | — | — | No aplica: F8 no cambia el backend | No |
| nuqs | — | — | — | No aplica: Método no tiene estado en la URL | No |
| HTML (MDN, con `WebFetch`) | — | `developer.mozilla.org`, evento `cancel` | Si `preventDefault()` en `cancel` impide siempre el cierre | MDN dice que puede impedirlo, sin garantizarlo para un segundo Esc; el modelo de *close watchers* del estándar lo limita a una vez sin activación | Sí: R7 y la entrada 2 de la «Review Focus» |

## Lo que leyó el plan y no pudo correr

- **El foco:**
  - al abrir y al cerrar la confirmación;
  - después de importar;
  - que el navegador enfoque el primer elemento del diálogo modal.

  Los fija el E2E contra el legacy (T003). Si el legacy lo contradice, T003 deja escrito lo que hace el navegador, y FR-021 y FR-023 lo admiten.
- **Que Tab no salga del diálogo modal en Chromium sin interfaz:** se espera que vuelva al principio del diálogo. Lo fija el E2E contra el legacy. Si sale del documento, T003 lo anota como hallazgo y el escenario se reduce a «el foco nunca cae fuera del diálogo dentro del documento».
- **Que exportar la fixture sembrada dé lo guardado sin normalizar.** Hay que confirmar que la exportación de `progress-master-2a278ad-storage.json` coincide clave por clave con su contenido. T003 lo corre contra el legacy.
  - Si no coincide, el valor esperado pasa a `progress-master-2a278ad-export.json` sin `exportedAt`, que es la exportación congelada de ese mismo estado.
  - Si tampoco coincide, T003 para y avisa al coordinador.
- **Esc dos veces con el pedido retenido:** que `preventDefault()` en `keydown` corte el pedido de cierre en Chromium 1.63. Lo fija el E2E de T014.
- **El peso,** las cuentas de avisos de ESLint y los conteos de la red: los mide T001.
- **Que React monte Método en el DOM falso de `boot-check`.** Monta el Atlas, con formularios y `<select>`. Método suma `textarea` controlados y `blockquote`, que el DOM falso ya admite (`value`, `childNodes`, `textContent`).
