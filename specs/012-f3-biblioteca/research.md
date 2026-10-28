# Research: F3 · Biblioteca

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Validación**: [quickstart.md](./quickstart.md) · **Contrato de URL**: [contracts/library-url.md](./contracts/library-url.md)

## Cómo se investigó

- **La base.** El código se leyó en `f2b-acum` (`2b37caf4`): es `master` con F2a, A2 y las cuatro unidades de F2b, la base real sobre la que se implementa F3. Las rutas y las líneas citadas son de ahí.
- **Lo que se corrió:** nada del repositorio.
  - Se usaron `npm view` y pedidos de un byte con `Range` (metadatos y tamaños comprimidos del registro).
  - Un script de Python, en el directorio temporal del agente, leyó `content/guide/` para recalcular los ejemplos resueltos de la spec con el predicado legacy.
  - Otro script listó las reglas de `frontend/styles.css` que sólo usa la Biblioteca.
  - Ningún build, ninguna prueba y ninguna descarga: **todos los tamaños de este documento son estimaciones** hasta que T002 los mida.
- **Context7.** El primer servidor (`mcp__context7__*`) agotó la cuota mensual el 2026-10-28 («Monthly quota reached»). Las consultas se hicieron en el segundo servidor de Context7, que indicó el coordinador. Algunas se completaron con la documentación oficial o con el código publicado de la versión, leídos con `WebFetch`. La tabla del final dice la fuente de cada fila.
- **El plan de F5, en curso.** Se leyó `specs/018-f5-sistemas/research.md` y `plan.md` del worktree `plan-f5`: el primero está commiteado y el segundo, todavía no. F3 usa los mismos archivos y las mismas firmas para lo que comparten (R7). Las diferencias van al informe como hallazgos.

## R1 · Dónde viven los filtros entre el corte y la URL

**Decisión.** El corte lleva una **sesión transitoria de filtros**, con el mismo patrón que el Atlas:

- el adaptador guarda en una variable de módulo el último conjunto de filtros;
- la página lo recibe como `initialFilters` y avisa cada cambio con `onFiltersChange`.

El commit de la URL borra las dos props y la variable, y la página pasa a leer y escribir la query con nuqs.

La costura es el par `[filters, changeFilters]`, con `changeFilters(cambio parcial | null)`, la misma forma que el setter de `useQueryStates`:
- en el corte, lo devuelve el hook `useLibraryFilters`, que envuelve un `useState`;
- en T018, la página llama directamente a `useQueryStates` y el hook se borra, porque sin la sesión sería un envoltorio trivial.

Los componentes hijos no cambian entre los dos commits.

**Por qué.**

- Los E2E de lo que se conserva se escriben contra el legacy, y uno de ellos dice que los filtros sobreviven al menú y al cambio de idioma.
  - Con `useState` solo, se perderían en cada `render()` de `app.js`, que desmonta y vuelve a montar la página.
  - Con nuqs desde el corte, la parte «se pierden al recargar» fallaría en el commit del corte. Habría que editar un E2E en el corte, mezclando el port con un cambio de comportamiento.
- Con la sesión, el corte deja verdes todos los E2E de la unidad 1. El commit de la URL edita una sola aserción, la de la recarga, que el clarify aprobó (FR-003).

**Alternativas.**

- *Filtros en la URL desde el corte:* se descarta por lo de arriba. Además ataría la instalación de nuqs al corte.
- *Una sesión de módulo dentro del hook* (`let session` en `use-library-filters.ts`): se descarta. Las reglas de React Compiler de `eslint-plugin-react-hooks` 7 pueden marcar la reasignación de una variable de módulo desde una función creada en el render de un hook. El adaptador no es un componente, y el Atlas ya hace lo mismo sin avisos.

## R2 · El nombre del parámetro del lenguaje (FR-043, riesgo 15)

**Decisión:** el filtro de lenguaje viaja como **`en`** (`?en=go#biblioteca`). Los otros cuatro conservan los nombres provisionales: `buscar`, `acceso`, `tipo` y `favoritos`.

**Por qué `lenguaje` no puede ser.** Los enlaces del menú son sólo de hash (`<a href="#biblioteca" data-view="biblioteca">` en `frontend/src/index.html`), así que conservan la query de la URL actual. Los dos sentidos rompen algo:

1. **De la Biblioteca a Sistemas.** Con `/?lenguaje=go#biblioteca`, el menú «Sistemas» lleva a `/?lenguaje=go#sistemas`. `navigateFromLocation` llama a `syncLinkedLanguage`, que en `#sistemas` lee `lenguaje` y fija `routeState().language = 'go'`: el filtro de una página cambia el idioma de todo el taller. Hoy no pasa, porque los filtros viven en memoria.
2. **De Sistemas a la Biblioteca.** Sistemas escribe `?lenguaje=rust&taller=cache&parte=explore#sistemas` (F2b, `withWorkshopQuery`, y el plan de F5 lo conserva con nuqs). Con `lenguaje`, el menú «Biblioteca» abriría la Biblioteca filtrada por Rust sin que el alumno lo pidiera.

**Por qué `en`.** No coincide con ninguna clave de la gramática (`ejercicio`, `paso`, `campana`, `sistema`, `mundo`, `lenguaje`, `taller`, `parte`) ni con las de F5. Se lee como el resto de la URL: `?buscar=tour+of&en=go&acceso=gratis#biblioteca` («buscar tour of, en Go, acceso gratis»). Además, un `lenguaje=go` escrito a mano se ignora, porque es una clave ajena, y no filtra a medias.

**Alternativa considerada:** `lenguajes`. Se descarta porque se confunde con `lenguaje` en un enlace escrito a mano, y ese error no se ve: la clave ajena se ignora en silencio.

**Costo de cambiarlo después:** una constante (`LIBRARY_QUERY_KEYS.language`) y las cadenas escritas a mano de las specs y de los E2E.

## R3 · La consulta de sólo espacios (spec, «Edge Cases»), una contradicción

La spec pide dos cosas a la vez sobre la consulta de sólo espacios: «el campo conserva los espacios mientras se escribe» y «en la URL no figura». Con la URL como única fuente de verdad, nuqs 2.10.2 no puede cumplir las dos:

- **Con `parseAsString.withDefault('')`:** el campo conserva `'   '` (el estado del hook es el valor escrito) y la URL lleva `?buscar=+++`.
- **Con un parser propio cuyo `eq` compara recortado (`a.trim() === b.trim()`):** `clearOnDefault` borra la clave de la URL. Pero `useQueryStates` también **pone el estado en `null`**, que vuelve al valor por omisión, así que el campo se vacía. Lo dice el código de `useQueryStates.ts` en `v2.10.2`: cuando `clearOnDefault` aplica y `eq` coincide, el valor pasa a `null` antes de emitirlo. El alumno no podría empezar una búsqueda con un espacio.
- **Copiar la consulta en un `useState`:** lo prohíben FR-021 y `AGENTS.md`.

**Decisión provisional del plan:** `parseAsString.withDefault('')` (opción A). Conserva el contrato de la tabla de la spec, que es lo que ve el alumno («el campo conserva lo escrito»), y la URL lleva el texto tal cual mientras sea sólo espacios: un `?buscar=+` no filtra y no rompe nada. Es la **decisión D1 para el usuario** (informe): si prefiere la URL limpia, la opción B cambia una línea de `library-query.ts` y dos casos de las specs. T002 confirma los dos comportamientos con el adaptador real antes de portar.

## R4 · Los ejemplos resueltos y la spec del modelo (FR-030 contra FR-007)

FR-030 pide los valores de los ejemplos resueltos, que salen de los 15 recursos reales, y FR-007 prohíbe que las specs importen `build/curriculum.json` o `getContent()`.

**Decisión.**

- **La spec del modelo** (`filter-resources.spec.ts`, en `node`) prueba **cada regla** con recursos literales cuyos campos la reproducen:
  - un recurso titulado «A Tour of Go», para «tour of» sí y «of tour» no;
  - un formato con «Ejercicios», para «EJÉRCICIOS» igual a «ejercicios»;
  - un recurso `both`, para el lenguaje y para la búsqueda «both»;
  - el acceso, el tipo, la advertencia, la URL y el id, que no se buscan;
  - la consulta recortada y la de sólo espacios.
- **Los conteos sobre los 15 reales** (15, 1, 0, 7, 3, 0, 9, 9, 11, 4, 6, 3, 5, 1 y 3) se fijan en el **E2E**, que corre contra el build con el contenido real. El valor esperado se escribe a mano en la spec del E2E, nunca se calcula.
- Los ejemplos se volvieron a calcular al planificar, con el predicado legacy sobre `content/guide/` de la base, y coinciden con los de la spec:

| Caso | Recursos |
| --- | --- |
| Sin filtros | 15, en el orden del manifiesto |
| «tour of» | 1: `go-tour` |
| «of tour» | 0 |
| «EJÉRCICIOS» y «ejercicios» | 7: `rust-100`, `rust-rover`, `rustlings`, `rust-google`, `go-tour`, `go-exercism`, `gophercises` |
| «both» | 3: `codecrafters`, `protohackers`, `context7` |
| «gratis» y «mixto» | 0 |
| Lenguaje Rust | 9: los 6 de Rust (`rust-100`, `rust-rover`, `rustlings`, `rust-brown`, `rust-google`, `rust-examples`) y los 3 `both` |
| Lenguaje Go | 9: los 6 de Go (`go-tour`, `go-tests`, `go-exercism`, `gophercises`, `boot-dev`, `go-examples`) y los 3 `both` |
| Acceso gratuito | 11 |
| Gratis + pago | 4: `rust-rover`, `codecrafters`, `boot-dev`, `context7` |
| Tipo Ejercicios | 6: `rust-100`, `rust-rover`, `rustlings`, `go-tour`, `go-exercism`, `boot-dev` |
| Tipo Proyectos | 3: `codecrafters`, `protohackers`, `gophercises` |
| Tipo Lectura | 5: `rust-brown`, `rust-google`, `go-tests`, `rust-examples`, `go-examples` |
| Tipo Herramientas | 1: `context7` |
| Go y «Gratis + pago» | 3: `codecrafters`, `boot-dev`, `context7` |
| «tour of», Go y Acceso gratuito | 1: `go-tour` |
| Solo favoritos con `rust-100` | 1 |
| «   » (sólo espacios) y «zzz» | 15 y 0 |

**fishery se gana su lugar** (FR-034). Las dos specs de F3 arman recursos con variantes: la del modelo usa unas diez y la de la página, tres. Cada `GuideResource` tiene once campos obligatorios, y una factory con `sequence` deja en cada caso sólo los campos que importan. Otros ports la reusan: F5 también la propone (`plan-f5`, R10).

- La factory vive en `pages/library/model/guide-resource.factory.ts`, junto a la página que consume los recursos.
- No se exporta por la API pública del slice.
- Las specs de la página la importan dentro del slice.

Si el usuario no autoriza fishery, ese archivo exporta una función `build(params)` escrita a mano con la misma firma, y ninguna spec cambia.

## R5 · El almacén en la spec de la página

**Decisión:** cada prueba usa `vi.resetModules()` y después importa, con `import()` dinámico, la página y `routeStore`. Es el mismo patrón que la prueba «two consumers» de `route-store.spec.ts`. El almacén se abre sobre un `StorageLike` en memoria que registra las escrituras, con una guía cuyos `resources` son los que la página dibuja: `parseRouteProgress` descarta los favoritos que la guía no tiene.

**Por qué:**

- La página importa el singleton (FR-009), y `open()` lanza si se abre dos veces.
- Vitest 5 no vuelve a evaluar las dependencias externalizadas de `node_modules` con `vi.resetModules()` (Context7, `vi.resetModules` y `server.deps.external`). React, `react-dom`, zustand y nuqs siguen siendo la misma instancia que usa Testing Library. Sólo se renuevan los módulos del proyecto.
- La spec nunca toca el `localStorage` de jsdom.

**La URL en la spec de la página:**

- **En el corte**, la página recibe `initialFilters`.
- **Desde el commit de la URL**, se envuelve con `withNuqsTestingAdapter({ searchParams, onUrlUpdate, hasMemory: true })`. La limitación de frecuencia de nuqs está apagada en las pruebas (Context7, `withNuqsTestingAdapter`).
- La página **nunca** contiene `NuqsAdapter`: lo pone el adaptador (`UrlStateProvider`).

## R6 · nuqs con una app por hash (riesgo 14)

**Lo que dice nuqs 2.10.2** (Context7 `/47ng/nuqs` y el código de `v2.10.2` en GitHub):

- **`enableHistorySync()` existe y se exporta** desde `nuqs/adapters/react`, junto con `NuqsAdapter`. Llama a `patchHistory(emitter, 'react')`, que:
  - envuelve `history.pushState` y `history.replaceState`;
  - avisa a los hooks de cada escritura ajena: compara la query nueva con la última que vio, y la escritura propia de nuqs lleva la marca `'__nuqs__'` y se salta;
  - agrega a `window` un oyente de `popstate` **que nunca se quita**;
  - se protege de un segundo parche del mismo adaptador con `history.nuqs.adapters`.
- **El hash se conserva.** `updateUrl` arma la URL con `new URL(location.href)` y sólo cambia `search`. Con `history: 'replace'`, escribe con `history.replaceState(history.state, '__nuqs__', url)`.
- **La limitación de escrituras.** El estado del hook se actualiza en el acto; la URL, como mucho cada 50 ms, con la primera escritura enseguida. Los valores menores que 50 ms se ignoran (documentación de opciones).
- **La codificación** (`renderQueryString`):
  - el espacio va como `+`;
  - codifica `%`, `+`, `#`, `&`, `"`, `'`, `` ` ``, `<`, `>` y los caracteres de control;
  - deja sin codificar `/`, `:`, `=`, `?` y lo que no es ASCII, como `á`;
  - una query vacía devuelve `''`, así que sin filtros la URL queda `/#biblioteca`.
- **Los parsers:**
  - `parseAsStringLiteral` devuelve `null` ante un valor desconocido, y `withDefault` lo cambia por el valor por omisión;
  - `parseAsBoolean` da `true` sólo para `true`, sin distinguir mayúsculas, y `false` para cualquier otro texto, `1` incluido;
  - `clearOnDefault` vale `true` desde 2.0;
  - para una clave repetida se usa `get`, así que manda la primera.
- **Las claves ajenas.** `useQueryStates` sólo toca sus claves: las ajenas se conservan. Un setter con `null` borra todas las claves del hook y deja las demás.

**Decisión.**

- **`startUrlStateSync()`, que llama a `enableHistorySync()`, se activa en `mount` del adaptador y nunca al evaluar un módulo.** Llamarlo en `main.tsx` o al evaluar `url-state.tsx` agrega el oyente de `popstate` y rompe el escenario de `boot-check` «main.tsx without its call evaluates quietly», que exige 0 oyentes. También rompe el principio de F2a de que evaluar no arranca nada. F5 llegó a lo mismo (`plan-f5`, R2).
- **«Una sola vez en la raíz»** se cumple con un solo lugar del código que la activa: `frontend/src/app/legacy/url-state.tsx`. El parche de nuqs, además, no se aplica dos veces.
- **Qué cambia la sincronización en F3:** nada observable en los flujos del alumno. Cada escritura de `app.js` (el idioma) va seguida de `render()`, que desmonta la Biblioteca y monta una raíz nueva, y esa raíz lee `location.search` al montar.
  - La activación la pide la hoja de ruta, y la fija un E2E que no depende de `render()`: con la Biblioteca montada, un `history.replaceState` ajeno llega a los filtros. Sin la sincronización, ese E2E falla.
  - Es la rotura deliberada 9 de quickstart.md §6.
- **T002 lo confirma antes de portar,** en una copia descartable y con permiso: los exports, el hash, el reemplazo, la consulta de sólo espacios (R3), la primera clave repetida y el peso.

## R7 · Lo que F3 comparte con F4, F5 y F9

Cada pieza tiene un dueño único y la trae **el primero que se integre**. T001 detecta, con comandos, qué está en la base. Cada tarea condicional dice qué hacer en cada caso.

| Pieza | Si F3 la trae | Si ya está en la base |
| --- | --- | --- |
| La pila de componentes: jsdom, Testing Library, los dos proyectos de Vitest, `frontend/src/vitest-setup.ts` y la enmienda del ADR 0008 | T005 y T006, con el mismo contenido que el plan de F5 (§2.1) | Se usa tal cual. La spec de la página tiene que correr en el proyecto `jsdom` sin tocar la configuración |
| fishery | T005, con la factory de F3 | Se usa |
| La guarda de `useStore` sin selector (`no-restricted-syntax`) | T006 | La guarda tiene que rechazar un `useStore(routeStore.changes)` temporal. Si no lo rechaza, es un hallazgo |
| `toggleItem` en `entities/guide` | T007 lo mueve desde `app.js` | La página lo importa del índice de `entities/guide` |
| `harness.routeStore` en `app-shell-check` (otro consumidor del singleton, en el mismo bundle que `app.js`) | T008 | Se usa para reorientar los dos escenarios de `favorite` |
| Los dos escenarios de `app-shell-check` que guardan con `favorite` | T008 los reorienta al camino de la página (`toggleItem` y `routeStore.save()`), con los mismos valores esperados | No aplica: son de F3 |
| La suscripción del shell a `routeStore.changes` | T009: el pie (`#save-label`), con su escenario en rojo | Si F9 o F4 ya la trajeron, F3 comprueba que el pie se actualice y, si falta, suma el pie al oyente |
| Los contadores de la barra lateral en esa suscripción | No los trae: nada de la Biblioteca los cambia y no habría prueba en rojo. El oyente es una sola función que F9 extiende con su escenario | — |
| nuqs, `url-state.tsx` y el aviso de licencia | T015 (permiso, instalación y aviso) y T016 (`UrlStateProvider` y `startUrlStateSync`, como F5 §2.2) | Se usan. F3 comprueba que la sincronización se active en `mount` |
| `REACT_VIEWS` y el texto profundo en `boot-check` | T013 generaliza el caso del Atlas | F3 suma `'biblioteca'` al conjunto |
| La partición de los bloques de CSS compartidos | T019 parte los `@media` y la impresión, y saca sólo lo suyo | F3 rebasa sobre los bloques ya partidos, saca sólo lo suyo y repite el barrido |
| R5 de `css-contract` (la `.sr-only` vacía de la Biblioteca) | La conserva, en cualquier orden | Igual: F4 y F9 no la tocan |

**Por qué el pie sí y los contadores no:** la tarea del coordinador pide la suscripción «para `#save-label` y los contadores». Los contadores (`#sidebar-completed`, `#sidebar-percent` y `#sidebar-progress`) cambian sólo cuando cambia `completed`, y eso lo hace Recorrido (F9). Un código sin prueba que falle contradice el principio II. Se informa como hallazgo.

## R8 · La página, el foco y los nodos que no se recrean

- **El foco tras quitar un favorito con «Solo mis favoritos»:**
  - la página calcula el destino **antes** de alternar, con `focusAfterRemoval(visibles, id)`, una función pura;
  - alterna y guarda dentro de `flushSync`;
  - mueve el foco con `focus({ preventScroll: true })`, por un mapa de refs de las estrellas o por la ref de «Limpiar filtros».

  `flushSync` hace falta porque «Limpiar filtros» no existe hasta que React confirma el estado vacío, y el manejador lo tiene que enfocar en el mismo evento. React lo documenta como seguro en manejadores, y el Atlas ya lo usa. La rotura deliberada 5 lo demuestra: sin `flushSync`, la prueba «last favorite → Limpiar filtros» falla.
- **El destino.** Es el de la spec (FR-019), y el plan no lo ajusta: la tarjeta que ocupa el lugar, la anterior si era la última y, si no queda ninguna, «Limpiar filtros».
- **La estrella que sigue visible:** React conserva el nodo, así que el foco queda donde estaba, sin código extra ni desplazamiento.
- **El recuento y los detalles.** El párrafo `role=status` y las tarjetas con `key={resource.id}` no se recrean. La página nunca pasa `open` al `<details>`, así que React no lo toca y un detalle abierto queda abierto (FR-022).
- **El progreso en el render:**
  - la página se suscribe con `useStore(routeStore.changes, (state) => state.revision)` y lee `routeStore.getProgress().favorites` en cada render, sin copia (FR-010);
  - la revisión no se guarda en una variable: la llamada sólo suscribe, y lo derivado se calcula en el render, sin memoización (la spec la deja fuera, YAGNI).

## R9 · La mudanza del CSS (FR-026)

**Lo que se mueve:** 41 reglas, con 43 selectores, en las posiciones de `frontend/styles.css` de la base:

| Dónde | Selectores |
| --- | --- |
| Base (líneas 715 a 874 y 1281) | `.filter-bar`, `.filter-bar select`, `.filter-secondary`, `.filter-chips`, `.filter-chip`, `.filter-chip[aria-pressed='true']`, `.favorite-filter`, `.resource-results-label`, `.resource-grid`, `.resource-card`, `.resource-top`, `.resource-tags`, `.resource-card h2`, `.resource-format`, `.resource-card p`, `.favorite-button`, `.favorite-button[aria-pressed='true']`, `.resource-fit`, `.resource-card details`, `.resource-card details summary`, `.resource-card details p`, `.resource-link`, `.resource-link:hover` y `.resource-notice` (24) |
| `@media (max-width: 1150px)` | `.filter-bar` |
| `@media (max-width: 850px)` | `.resource-grid` y `.resource-card` |
| `@media (max-width: 590px)`, el primero | `.resource-grid`, `.resource-card`, `.resource-card h2`, `.filter-bar`, `.filter-bar select`, `.filter-secondary`, `.filter-chip`, `.resource-fit`, `.resource-link` y `.favorite-button` (10) |
| `@media (max-width: 590px)`, el segundo | `.favorite-button` |
| `@media print` | `.filter-bar`, `.filter-secondary` y `.favorite-button`, de la lista mezclada con `.sidebar`, `.topbar`, `.focus-timer`, `.data-actions`, `.main-footer` y `#toast`; `.resource-grid`; y `.resource-card`, de la lista con `.module` y `.milestone` |

**Lo que se queda en `styles.css`:**

| Regla | Quién más la usa |
| --- | --- |
| `.page-heading` y sus hijas | Proyecto y Método |
| `.pill` y `.pill.accent` | Recorrido, campaña y Sistemas |
| `.search-wrap` y sus hijas, también en el bloque de 1 150 px | El laboratorio |
| `.empty-state` y sus hijas | La compuerta de A2 (`gate-view.ts`) |
| La regla global de casillas (`input[type='checkbox']:not(.step-check)`) | Todas las vistas |
| `.sr-only` y el `touch-action` de los controles | El shell, desde la unidad 8 de F2b |

**La cascada.** `library.css` se importa en `main.tsx` **inmediatamente después de `styles.css`**, con el precedente del Atlas (`atlas.css`), y no desde el módulo de la página. Vite extrae a un archivo aparte el CSS de un chunk asíncrono (Context7, `build.cssCodeSplit`), y el dist de A2 exige un solo `<style>`. Así, las reglas movidas siguen antes de `lab.css`, `atlas.css` y las demás hojas.

Se buscaron reglas de `styles.css` posteriores a cada regla movida que apliquen a los mismos elementos con igual o mayor especificidad:

- `summary`, `main`, `a` en impresión y `*` en movimiento reducido. Ninguna compite: las de elemento tienen menos especificidad y la de `*` usa `!important`.
- El barrido de estilo computado es la prueba decisiva (T019).

**El orden dentro de `library.css`** es el de hoy, con una excepción: el bloque de impresión va **entre** los dos bloques de 590 px.

- **Por qué:** lightningcss fusiona reglas al minificar (F2b, research-f2b R7). Dos `@media (max-width: 590px)` contiguos podrían fusionarse, y dentro del bloque fusionado se juntarían `.favorite-button { min-width: 36px; … }` y `.favorite-button { min-width: 44px; … }`. Las declaraciones de 36 px desaparecerían del multiconjunto aunque el estilo computado no cambie.
- **Por qué la cascada no cambia:** el segundo bloque de 590 px sólo fija `min-width` y `min-height` de `.favorite-button`, y el de impresión nunca los fija.

**La rotura deliberada de la cascada.** Pensada para que el barrido falle y el multiconjunto no: invertir dentro de `library.css` el bloque de 850 px y el primero de 590 px. A 590 px, `.resource-card` pasa de 22 px a 20 px de `padding` y `.resource-grid` toma `gap: 13px`. Mover las reglas antes de `styles.css` no serviría de control: ninguna regla de `styles.css` compite con ellas.

## R10 · El adaptador, el corte y los checks de `qa/` (FR-028, FR-035)

- **`register-library.tsx`:**
  - publica `window.TallerLibrary = Object.freeze({ mount, unmount })`;
  - `mount(host)` lee `getContent().guide.resources` y dibuja la página;
  - un error de React va a `console.error('No se pudo mostrar la Biblioteca.', error)` por `onUncaughtError`.
- **`legacy-views.ts`** lo evalúa después de `register-atlas`, antes de `app.js`.
- **`app.js`** lo monta en `render()` sin guarda opcional, como al Atlas, y `load-order-check` suma la restricción.
- **`boot-check`.** `FakeElement.textContent` devuelve sólo el texto propio del elemento, y React reparte el texto en nodos hijos. La Biblioteca pasa al conjunto `REACT_VIEWS`, con una lectura recursiva del texto (`renderedText`) y el mismo valor esperado, «RECURSOS CON INTENCIÓN».
  - El DOM falso alcanza para montarla: ya monta el Atlas, con búsqueda y selector, y tiene `location`, `history.replaceState` y `addEventListener`.
  - No tiene `history.pushState`. El parche de nuqs lo guarda igual y sólo fallaría si alguien lo llamara, y nadie lo llama: es un riesgo anotado.
  - Montar la Biblioteca desde el bundle de `main.tsx` sin el error «Abrí el almacén del recorrido antes de usarlo.» es la prueba de FR-009: una sola instancia del almacén.
- **`app-shell-check`:**
  - `loadAppShell` pasa a empaquetar una entrada virtual que exporta `startApp` y, del mismo bundle, `routeStore` y `toggleItem`;
  - `buildHarness` deja el almacén en `harness.routeStore`, y `harness.toggleFavorite(id)` hace lo mismo que la página;
  - los dos escenarios que usaban la acción `favorite` pasan a ese camino con los mismos valores esperados;
  - el escenario nuevo del pie (T009) usa el mismo camino.

  `boot-check` también llama a `loadAppShell` (para `startApp` sin arrancar) y no usa lo nuevo.

**La correspondencia de los escenarios de `qa/`** (FR-035, SC-008):

| Escenario | Qué pasa | Cubierto por |
| --- | --- | --- |
| `boot-check` «navegación: cada vista se renderiza por hash sin lanzar», la parte de `#biblioteca` | Pasa de `innerHTML` a nodos de React, con el mismo texto esperado | El mismo escenario (T013) |
| `app-shell-check` «almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar» | El favorito se quita por `harness.toggleFavorite('rustlings')` en lugar del delegado; `exported.favorites` sigue siendo `[]` | El mismo escenario (T008), el E2E (e) y la spec de la página |
| `app-shell-check` «almacén: un cambio de otra pestaña se fusiona y gana el idioma y los minutos de esta» | El guardado sale de `harness.toggleFavorite('go-tour')`; `favorites` sigue siendo `['rustlings', 'go-tour']`, con el mismo idioma y los mismos minutos | El mismo escenario (T008) |

## R11 · El peso

**Estimación antes de instalar** (T002 la mide):

| Pieza | Peso estimado | Fuente |
| --- | --- | --- |
| nuqs 2.10.2 | Entre 12 000 y 20 000 caracteres minificados | Lo que alcanzan `nuqs/adapters/react` y el índice: 54 242 bytes sin minificar, según el plan de F5, R12 |
| `@standard-schema/spec` 1.1.0 | 0 | Sólo trae tipos: no llega al bundle |
| `useStore` de zustand | Menos de 1 000 caracteres | Envuelve a `useSyncExternalStore` |
| La página contra lo que sale | Entre +2 000 y +6 000 | Sale `renderLibrary`, `renderResourceResults`, `filters` y siete ramas de los delegados, unos 4 500 caracteres de plantillas y lógica. Entran la página, cuatro componentes y el modelo en JSX compilado |

**Subpresupuesto de F3.** El aumento de `html.length` sobre la línea base de T001 no pasa de **30 000 caracteres si F3 instala nuqs**, ni de **15 000 si ya lo instaló F5**, y el HTML queda bajo 1 250 000. Si la medida lo supera, la compuerta se detiene y decide el coordinador.

**Hallazgo para la hoja de ruta.** Con F2b, el HTML mide unos 1 141 337 caracteres y quedan unos 108 000 de margen:

- F5 pide hasta 40 000 (25 000 si F3 trae nuqs) y F3, hasta 30 000 (15 000 si F5 trae nuqs). nuqs se paga una sola vez.
- React Hook Form, de F11a, pesa unos 43 KB.
- Faltan F4, F6, F7b, F8, F9, F11 y A3.

El margen no alcanza para todos. Es una decisión del coordinador, que excede a F3.

## R12 · Las dependencias y su peso en disco

Medidas el 2026-10-28 con `npm view` y pedidos de un byte con `Range` (1 MB = 10^6 bytes):

| Paquete | Versión | Licencia | Desempaquetado | Comprimido | Para qué | Quién lo trae |
| --- | --- | --- | --- | --- | --- | --- |
| `nuqs` | 2.10.2 (`latest`, publicada el 2026-10-08) | MIT | 480 252 B | 126 928 B | Ejecución | El primero de F3 y F5 |
| `@standard-schema/spec` | 1.1.0 (dependencia de nuqs) | MIT | 22 634 B | 4 178 B | Sólo tipos | Con nuqs |
| `jsdom` | 30.1.2 (la de la spec; ya existe 30.1.3) | MIT | 5 533 799 B | — | Desarrollo | El primer port con specs de componentes |
| `@testing-library/react` | 16.3.3 | MIT | 339 581 B | — | Desarrollo | Ídem |
| `@testing-library/dom` | 10.4.2 | MIT | 2 467 302 B | — | Desarrollo | Ídem |
| `@testing-library/user-event` | 14.6.7 (la de la spec; ya existe 14.6.8) | MIT | 437 525 B | — | Desarrollo | Ídem |
| `@testing-library/jest-dom` | 7.0.1 | MIT | 331 873 B | — | Desarrollo | Ídem |
| La pila de DOM entera, con sus dependencias | — | — | unos 26,27 MB, 56 paquetes | unos 5,03 MB | Desarrollo | Estimación del ADR 0008 |
| `fishery` | 2.4.0 | MIT | 135 590 B | 29 557 B | Desarrollo | El primero con una factory |
| `lodash.mergewith` | 4.6.2 (dependencia de fishery) | MIT | 54 199 B | 13 060 B | Desarrollo | Con fishery |

- **Las versiones** son las de la spec y la hoja de ruta. Las dos versiones de parche más nuevas (jsdom 30.1.3 y user-event 14.6.8) no se adoptan sin permiso: es un hallazgo.
- **Node.** `jsdom` 30.1.2 pide Node `^22.22.2 || ^24.15.0 || >=26.0.0`, y la imagen web usa `node:24.21.0-alpine`.
- **La licencia de nuqs.** El aviso va a `frontend/THIRD-PARTY-NOTICES.txt`, después del de Zustand y con su formato: `nuqs — https://github.com/47ng/nuqs` y el texto MIT de `node_modules/nuqs/LICENSE`. `@standard-schema/spec` no llega al bundle y no lleva aviso.

## R13 · La forma de las pruebas

- **E2E.**
  - Hay un Page Object nuevo, `qa/e2e/pages/library.ts`, con su fixture `library`, y una spec nueva, `qa/e2e/specs/library.spec.ts`, con los 12 flujos de FR-031.
  - `StorageControl` suma `blockWrites()`: `setItem` y `removeItem` de `localStorage` lanzan `QuotaExceededError` y la lectura sigue funcionando.
  - `url-contract.spec.ts` suma un `describe` con un caso, y no edita nada más.
- **El historial.** «Sin sumar entradas» se mide **relativo**: `history.length` antes y después de filtrar, como el escenario de F1 «opening an exercise rewrites the query and adds no entry». Además, Atrás vuelve a la vista anterior.
  - El plan de F11a (`349646d6`) dejó de usar `history.length` absoluto porque, después de `page.goto`, la pestaña ya tiene una entrada previa.
  - La medida relativa no depende de eso.
- **Tipeo.** La búsqueda se escribe con `pressSequentially`, tecla por tecla, para ejercer una escritura de la URL por tecla. El tipeo lo prueba el valor final del campo. El cursor en medio de la consulta no lo prueba ninguna tarea: es una entrada de «Review Focus».

## Tabla de consultas

| Librería | Versión | Fuente | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| nuqs | 2.10.2 | Context7 `/47ng/nuqs` (segundo servidor) | `enableHistorySync` y `patchHistory` | Parchea `pushState` y `replaceState`, se salta las escrituras con la marca `__nuqs__`, agrega un oyente de `popstate` que no se quita y no se aplica dos veces por adaptador | Sí: se activa en `mount` (R6) |
| nuqs | 2.10.2 | Context7 `/47ng/nuqs` | `withNuqsTestingAdapter` | `searchParams`, `onUrlUpdate` (`{ searchParams, queryString, options }`) y `hasMemory`; limitación apagada en las pruebas | Sí: la spec de la página desde el commit de la URL (R5) |
| nuqs | 2.10.2 | Context7 `/47ng/nuqs` | `createParser` con `eq`; `createSerializer` | `eq` sirve para `clearOnDefault`; el serializador no escribe los valores por omisión ni los `null` | Sí: la spec de `library-query.ts` usa `createSerializer` y `createLoader` |
| nuqs | 2.10.2 | `WebFetch` de `nuqs.dev/docs/options` | `history`, `limitUrlUpdates`, `clearOnDefault`, `defaultOptions` | `replace` por omisión; 50 ms como mínimo y la primera escritura enseguida; `clearOnDefault: true`; `defaultOptions` en el adaptador desde 2.5.0 | Sí: `history: 'replace'` explícito |
| nuqs | 2.10.2 | `WebFetch` del código de `v2.10.2` en GitHub: `adapters/react.ts`, `adapters/lib/patch-history.ts`, `lib/url-encoding.ts`, `parsers.ts`, `serializer.ts`, `index.ts` y `useQueryStates.ts` | La escritura, la codificación, los parsers y el estado con `clearOnDefault` | Conserva el hash; la codificación de R6; un valor igual al de omisión según `eq` pasa el estado a `null` | Sí: la contradicción de R3 y la decisión D1 |
| nuqs | 2.10.2 | `npm view` | Versión, exports, licencia y peso | `latest` 2.10.2 (2026-10-08), MIT, `./adapters/react` y `./adapters/testing`, `sideEffects` sólo en `debug.js`, 480 252 B y 101 archivos | Sí: R11 y R12 |
| Vitest | 5.0.3 | Context7 `/vitest-dev/vitest/v5.0.3` (y el coordinador) | `test.projects` en línea | Heredan la raíz por omisión (`extends: true`) y concatenan los arreglos, como `include` y `setupFiles`; `name` no se hereda | Sí: la raíz sólo lleva `projects` y el `include` de hoy pasa al proyecto `node` (T006) |
| Vitest | 5.0.3 | Context7 `/vitest-dev/vitest/v5.0.3` | `vi.resetModules` y las dependencias externas | Vuelve a evaluar los módulos del proyecto al importarlos de nuevo; las dependencias de `node_modules` se importan de forma nativa y no se vuelven a evaluar | Sí: R5 |
| Testing Library | `@testing-library/react` 16.3.3, `jest-dom` 7.0.1 | Context7 `/testing-library/testing-library-docs` | Vitest sin `globals` | `cleanup()` en un `afterEach` del setup; `import '@testing-library/jest-dom/vitest'` | Sí: `vitest-setup.ts` (T006) |
| user-event | 14.6.7 | Context7 `/testing-library/user-event` | `setup()`, `type`, `selectOptions`, `click` | Una instancia por prueba, antes del `render`, y `await` en cada interacción | No |
| jsdom | 30.1.2 | Context7 `/jsdom/jsdom` | Navegación e historial | No implementa la navegación (`location.href = …`) ni el layout. El README no dice nada de `history.replaceState`, que la spec de `url-state.tsx` usa | Sí: T002 lo comprueba en la copia descartable |
| fishery | 2.4.0 | Context7 `/thoughtbot/fishery` | `Factory.define`, `build` y `sequence` | `sequence` empieza en 1; los params se mezclan en profundidad y los arreglos se reemplazan enteros | Sí: R4 (los `languages` se pasan enteros) |
| Zustand | 5.0.15 (Context7 tiene 5.0.12) | Context7 `/pmndrs/zustand/v5.0.12` | `useStore(store, selector?)` con un store de `createStore` | El selector es opcional en la firma y sin él devuelve el estado entero: compila | Sí: la guarda de ESLint (T006) |
| React | 19.2.8 | Context7 `/websites/react_dev_reference` | `flushSync` en manejadores; refs de callback con limpieza | `flushSync` es seguro en manejadores y no se puede llamar al dibujar; en React 19, una ref de callback puede devolver su limpieza | Sí: R8 |
| React | 19.2.8 | `WebFetch` de `react.dev/reference/react-dom/client/createRoot` | `onUncaughtError`, `render` y `unmount` | `render` no es síncrono; no se puede volver a dibujar sobre una raíz desmontada, pero sí crear otra en el mismo nodo | No: el patrón del Atlas ya lo cumple |
| Playwright | 1.63.0 | Context7 `/microsoft/playwright/v1.63.0` | `toHaveURL` con predicado; `pressSequentially` | Reintenta solo; el predicado recibe un `URL`; `pressSequentially` manda un `input` por carácter | Sí: los E2E de la URL leen `searchParams` con un predicado |
| Playwright | 1.63.0 | `WebFetch` de `playwright.dev/docs/api/class-locatorassertions` | `toBeFocused`, `toHaveText` con arreglo, `toHaveJSProperty` | El arreglo exige la misma cantidad y el mismo orden; `toHaveJSProperty` lee `open` de `<details>` | Sí: el orden de los títulos y el detalle abierto |
| ESLint | 10.12.0 (Context7 tiene 10.5.0) | Context7 `/eslint/eslint/v10.5.0` | Selectores de `no-restricted-syntax` | Los selectores aceptan atributos con condiciones (`[arguments.length<2]`) | Sí: la guarda (T006), igual a la de F5 |
| Vite | 8.3.2 | Context7 `/vitejs/vite` y `WebFetch` de `vite.dev/guide/features` | El orden del CSS importado y `cssCodeSplit` | El CSS de un chunk asíncrono se extrae aparte; el de la entrada sigue el orden de los imports; lightningcss minifica | Sí: `library.css` se importa en `main.tsx` y el orden de R9 |
