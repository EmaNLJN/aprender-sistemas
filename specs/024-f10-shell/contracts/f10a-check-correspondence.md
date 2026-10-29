# Contrato F10a · La correspondencia de `boot-check`, `app-shell-check` y `load-order-check`

**Para qué sirve.** F10b retira los tres checks y sus arneses (FR-052). Antes, F10a deja escrito dónde queda cubierto cada escenario, o por qué se descarta (SC-007). F10b copia la tabla en la descripción de su PR.

**De dónde salen las filas.** Están los escenarios de `master` (`431c9d90`) y los que suman los planes de F3, F6, F7b, F8, F9 y F11a. T013 (plan.md, §4) la reconcilia con la base real de F10a:
- agrega cada escenario que falte, con un `grep` de los nombres;
- marca los que ya no existan;
- verifica que cada prueba citada exista con ese nombre exacto.

Una fila sin cobertura ni motivo bloquea F10a.

**Las tres salidas:**
- **E2E:** el archivo de `qa/e2e/specs/` y el nombre del `test`;
- **Vitest:** el archivo y el nombre del `it`;
- **Descartado:** el motivo, que tiene que valer después de F10b.

Las E2E nuevas de F10a están en `shell-navigation`, `shell-mounts`, `shell-language`, `shell-sidebar` y `boot-order` (plan.md, §3). Las specs de Vitest nuevas de F10b están en `contracts/f10b-shell-router.md`, §7.

## 1. `qa/boot-check.ts`

| Escenario | Origen | Cobertura después de F10b |
| --- | --- | --- |
| arranque: main.tsx se evalúa sin excepciones y #main queda con contenido | `master` | E2E `views.spec.ts` «#recorrido opens from an empty browser», con el fixture automático `pageIssues`, que falla ante cualquier error de consola |
| adaptadores: cada window.Taller* real publica los métodos que consume app.js | `master` | **Descartado:** F10b retira todos los `window.Taller*`. El contrato de cada página son sus props, que comprueba `tsc`, y SC-003 busca `window.Taller` con 0 resultados |
| navegación: cada vista se renderiza por hash sin lanzar | `master` | E2E `views.spec.ts` «the menu moves through the seven hash links without replacing the document» y los ocho «#… opens from an empty browser» |
| borrar todo: confirm-reset reinicia cada adaptador y deja el recorrido en blanco | `master`, reescrito por F8 | E2E de F8 en `method-reset.spec.ts`; Vitest `create-progress-backup.spec.ts` «resets route, laboratory, campaign and Sistemas one after the other, then the session» |
| compatibilidad: arrancar con el progreso de master no escribe, no respalda ni avisa | `master` | E2E `startup-storage.spec.ts` «writes nothing, makes no backup and shows no notice in the eight views» |
| compatibilidad: lo que escribe esta versión se relee sin respaldos ni avisos | `master` | E2E `boot-order.spec.ts` «what this version writes is read again without backups or notices» |
| integridad: una copia de campaña ilegible sobrevive al arranque y a la navegación | `master` | E2E `boot-order.spec.ts` «an unreadable campaign copy survives the start and the navigation» |
| integridad: con la clave de campaña ausente, arrancar y navegar no la crean | `master` | E2E `boot-order.spec.ts` «an absent campaign key is not created by the start nor by the navigation» |
| importación: qa/fixtures/progress-master-2a278ad-export.json se combina sin omisiones con los adaptadores reales | `master`, reescrito por F8 | La E2E de F8 en `method-files.spec.ts` que importa esa exportación congelada. Si la base no la tiene, T013 la suma a `boot-order.spec.ts` como «the frozen export of master imports without omissions», con `MethodPage.importFile` |
| importación: qa/fixtures/progress-d0e1b49-export.json se combina sin omisiones con los adaptadores reales | `master`, reescrito por F8 | La misma regla, con «the frozen export of d0e1b49 imports without omissions» |
| each legacy source evaluated alone neither throws nor touches the storage | `master`, ampliado por F6 y F7b | **Descartado:** después de F10b no quedan fuentes legacy. La intención (evaluar un módulo no toca el almacenamiento) la fijan Vitest `singletons-import.spec.ts` «does not touch localStorage or read window» y la spec de F10b «evaluating the boot modules touches no storage, adds no listener and starts no timer» |
| main.tsx without its call evaluates quietly and leaves #main empty | `master` | Vitest de F10b: «evaluating the boot modules touches no storage, adds no listener and starts no timer» |
| startApp initializes in order and draws the first view | `master` | E2E `boot-order.spec.ts` «opens the lab, the route, the campaign and Sistemas, in that order»; Vitest de F10b: «the shell stage opens the stores in the order of startApp» |
| a second startApp call fails | `master` | Vitest de F10b: «the shell stage runs once» |
| the gate publishes before any view or catalog exists | `master` | E2E `content-gate.spec.ts` «shows the error and leaves the progress untouched when …»; Vitest de F10b: «the stages run as tokens, session, content and shell» |
| the happy path never shows the loading state and asks for the content once | `master` | E2E `content-gate.spec.ts` «… opens and reloads with one content request per load»; Vitest `content-gate.spec.ts` «never shows the loading state when the content arrives fast» |
| a failed content request (rejected) leaves the views unevaluated and offers a retry | `master` | E2E `content-gate.spec.ts` «shows the error and leaves the progress untouched when …» y `boot-order.spec.ts` «behind the access no page is drawn»; Vitest `content-gate.spec.ts` |
| a failed content request (version) leaves the views unevaluated and offers a retry | `master` | Las mismas; Vitest `content-gate.spec.ts` «fails with version and publishes nothing when the source answers another version» |
| a failed content request (shape) leaves the views unevaluated and offers a retry | `master` | Las mismas; Vitest `content-gate.spec.ts` «fails with shape when a portion has another form» |
| a retry that succeeds starts the views without a second boot | `master` | E2E `content-gate.spec.ts` «recovers the start on the second request without reloading the page» |
| two consecutive clicks on retry make a single request | `master` | Vitest `content-gate.spec.ts` «retries with the loading state at once, ignores a second click and resumes the boot» |
| the session is asked once, before the content | F11a | E2E de F11a `session-stage.spec.ts`; Vitest de F10b «the stages run as tokens, session, content and shell» |
| TallerCampaign publishes exactly the seven methods that app.js and lab.js use (F7b: «… the four methods that app.js uses») | F6 y F7b | **Descartado:** F10b retira `window.TallerCampaign`. Lo que hacía `refresh` antes de cada vista lo fija `cycle.spec.ts` de F1, sin editar (FR-031) |
| startApp registers no interval | F9 | Vitest de F10b «evaluating the boot modules touches no storage, adds no listener and starts no timer»; Vitest de F9 sobre `focusTimer` |
| borrar todo: los tres pedidos del servidor van antes del primer reinicio local | F8 | E2E de F8 en `method-reset-server.spec.ts`, con su nombre exacto en la base |
| Cualquier otro escenario que T013 encuentre en la base | — | T013 lo agrega con una de las tres salidas |

## 2. `qa/app-shell-check.ts`

**Los 38 escenarios que retira F8** (los de b, c, d y e, los de h, los de «async areas», «seguridad», «almacenamiento sin escritura» y los de «respaldos») tienen su cobertura en el plan de F8, §3.9. F10b la copia de ahí. La tabla sigue con los que quedan:

| Escenario | Origen | Cobertura después de F10b |
| --- | --- | --- |
| a) exportar: Blob JSON con el recorrido en la raíz y los adaptadores | `master` | E2E `shell-sidebar.spec.ts` ««Exportar mi progreso» downloads the copy of today from every view and announces it»; Vitest `create-progress-backup.spec.ts` «writes the route at the root, then the sections, then the export instant» |
| a) exportar: descarga taller-progreso-AAAA-MM-DD.json y avisa | `master` | La misma E2E; Vitest `create-progress-backup.spec.ts` «names the file after the export date» |
| f) cargar no escribe taller-learning-v1, ni siquiera con datos que se descartan | `master` | E2E `startup-storage.spec.ts` «writes nothing, makes no backup and shows no notice in the eight views»; Vitest `route-store.spec.ts` «opens the master fixture without writing and with the saved progress» |
| f) con descartes: respaldo con el texto original, aviso y estado podado en memoria | `master` | Vitest `route-store.spec.ts` «warns about the data it dropped and keeps a backup»; E2E `boot-order.spec.ts` «four unreadable copies give one toast in the order route, campaign, Sistemas and lab» |
| f) la primera acción del alumno guarda el estado podado y conserva el respaldo | `master` | Vitest `route-store.spec.ts` «rises by one per save, even when the storage cannot write» y «warns about the data it dropped and keeps a backup»; `qa/versioned-storage-check.ts` |
| f) un respaldo previo no se pisa al cargar datos con descartes | `master` | `qa/versioned-storage-check.ts`, que sigue en `npm test`, con el escenario de la ranura histórica ocupada |
| f) JSON ilegible: respaldo, aviso y la clave queda intacta | `master` | E2E `boot-order.spec.ts` «four unreadable copies give one toast in the order route, campaign, Sistemas and lab» |
| f) una copia de otra forma o versión avisa y arranca con valores por defecto | `master` | Vitest `parse-route-progress.spec.ts`; E2E `boot-order.spec.ts` «an unreadable campaign copy survives the start and the navigation» |
| f) con el almacenamiento bloqueado: aviso de no disponible y la app funciona | `master` | E2E `startup-storage.spec.ts` «starts and shows the notice and the footer of today»; `shell-sidebar.spec.ts` «with the storage blocked, marking a step keeps the footer and the start notice» |
| avisos: los de campaña y laboratorio se muestran juntos en un único toast | `master` | E2E `boot-order.spec.ts` «four unreadable copies give one toast in the order route, campaign, Sistemas and lab» |
| avisos: recorrido, campaña, Sistemas y laboratorio se acumulan sin perder ninguno | `master` | La misma E2E; Vitest de F10b «joins the load notices in the order route, campaign, Sistemas and lab» |
| almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar | `master`; F9 y F3 lo recortan | Las E2E de F9 (`route-steps.spec.ts`), F3 (`library.spec.ts`) y F8 (`method-journal.spec.ts`) que recargan después de cada acción, con sus nombres exactos en la base |
| almacén: un cambio de otra pestaña se fusiona y gana el idioma y los minutos de esta | `master` | Vitest `route-store.spec.ts` «keeps the local language and minutes, adds what the other tab saved and notifies once» |
| almacén: sin ranuras libres y con la clave ilegible, guardar no escribe y la etiqueta avisa | `master` | `qa/versioned-storage-check.ts` (guardar sin ranura); el pie lo fija Vitest de F10b «the footer reads storageAvailable after every revision» |
| almacén: un guardado de otro consumidor actualiza el pie | F3 o F8 | Vitest de F10b «the footer reads storageAvailable after every revision»; E2E `shell-sidebar.spec.ts` «marking the first step updates the route progress without reloading» |
| accesibilidad: aria-pressed marca el idioma activo y aria-current la vista activa | `master` | E2E `url-contract.spec.ts` «the language switch writes the query / from #…» (`aria-pressed`) y `views.spec.ts` «#… opens from an empty browser» (`aria-current`) |
| shell: al cargar se inicializan campaña y Sistemas y se sincroniza la barra lateral | `master` | E2E `boot-order.spec.ts` «opens the lab, the route, the campaign and Sistemas, in that order» y `shell-sidebar.spec.ts` «the menu shows the counts of today» |
| startApp calls the adapters in order and then renders | `master` | Las mismas; Vitest de F10b «the shell stage opens the stores in the order of startApp» |
| a second startApp call fails and adds no timer or listener | `master` | Vitest de F10b «the shell stage runs once» y «evaluating the boot modules touches no storage, adds no listener and starts no timer» |

## 3. `qa/load-order-check.ts`

No tiene escenarios con nombre: comprueba restricciones. Cada una tiene su salida.

| Restricción | Origen | Cobertura después de F10b |
| --- | --- | --- |
| Las etapas en orden: `tokenStage → sessionStage → contentGate → legacyViews` | A2 y F11a | Vitest de F10b «the stages run as tokens, session, content and shell», sobre la lista exportada de `frontend/src/app/boot/boot-stages.ts` (FR-052) |
| `styles.css` es la primera hoja | A2 | Vitest de F10b «main.tsx imports styles.css first and the sheets in the order of the base» (FR-052) |
| El orden de las hojas de página que fijaron F8 y F9 (`styles.css`, después `route.css` y `method.css`, y después `lab.css`) | F8 y F9 | La misma spec, que fija el orden completo de los imports de hojas de la base. El barrido de estilo computado de F10c lo vuelve a medir |
| Los catálogos antes de `lab.js` (o de `lab-api.ts`, desde F7b) | `master` y F7b | **Descartado:** F10b retira los globals de catálogos (F10-Q3). `lab-api.ts` recibe los ejercicios de `getContent()` en la etapa del shell, después de la compuerta |
| Los catálogos de Sistemas antes de `app.js` | `master` | **Descartado:** lo mismo; `systems.init` recibe los talleres de `getContent()` |
| Los motores antes de los adaptadores que los capturan (`campaign.js`, `systems.js` y sus sucesores) | `master`, F5, F6 y F7b | **Descartado:** F10b importa los motores por su índice; no queda ninguna captura de `window` al evaluar |
| Cada adaptador antes de `app.js`, que es el último import | `master` y cada port | **Descartado:** F10b retira `app.js` y la cadena. Que la raíz se monte una sola vez lo comprueba SC-003 (`createRoot` aparece una vez) |
| `startApp()` se llama una vez, después del último `import()` | A2 y F8 | Vitest de F10b «the shell stage runs once». **Descartada la forma:** no queda `startApp` (SC-003) |
| Ningún import duplicado en la cadena | A2 | **Descartado:** no queda cadena. Un import estático duplicado no cambia el orden de evaluación |

## 4. Los arneses de `qa/lib`

`app-adapters.ts`, `boot-harness.ts`, `app-shell-harness.ts` y `fake-dom.ts` existen sólo para los tres checks, y salen con ellos. `legacy-sources.ts` sale por F10-Q3, y sus consumidores pasan a leer el módulo de contenido (research-f10b.md, R9). Ninguno tiene escenarios propios.
