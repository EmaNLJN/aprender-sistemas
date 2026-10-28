# Research: F5 · Port de Sistemas

**Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md) · **Validación**: [quickstart.md](./quickstart.md) · **Contratos**: [contracts/taller-systems.md](./contracts/taller-systems.md)

Este documento junta las decisiones técnicas del plan con sus alternativas, las consultas de documentación y las mediciones de sólo lectura. Se planificó el 2026-10-28 leyendo el código, sin correr `npm`, Docker ni el navegador, y sin descargar ningún paquete.

## Cómo se planificó

- **La base que se leyó:** el ensayo local `2b37caf4` (worktree `f2b-acum`): `master` con F2a, A2 y las cuatro unidades de F2b integradas. Es la base sobre la que se implementa F5, porque F2b (PR #41 a #44) entra a `master` antes. Las rutas que se citan son de ahí.
- **La rama de la planificación:** `plan/f5-sistemas`, que sale de `master` en `dd870a9c`. Sólo cambia `specs/018-f5-sistemas/`.
- **Lo que se corrió:** nada del repositorio. Sólo `npm view` (metadatos del registro), la lectura de los archivos publicados de nuqs 2.10.2 en jsDelivr y la documentación oficial.
- **Context7:** el primer servidor resolvió nuqs y respondió dos consultas antes de agotar su cuota mensual. El segundo servidor, que indicó el coordinador, cubrió el resto de las librerías. Lo que Context7 no traía (el código publicado de nuqs y una página de opciones) se leyó en la fuente oficial con `WebFetch`. La tabla de «Documentación consultada» lo dice fila por fila.

## Línea base de planificación

Valores que el plan usa como referencia. La implementación los vuelve a medir sobre la base real (T001) y, si difieren, manda lo medido.

| Qué | Valor | Fuente |
| --- | --- | --- |
| `dist/index.html` | 1 141 337 caracteres; tope 1 250 000 (`BOOT_SIZE_LIMIT` de `qa/build-check.ts`) | Hoja de ruta, «Criterios de aceptación globales» (medida del coordinador con F2b) |
| `frontend/systems.js` | 379 líneas, 26 938 bytes | `wc` sobre `2b37caf4` |
| `frontend/systems.css` | 1 068 líneas, 19 468 bytes | `wc` sobre `2b37caf4` |
| Avisos de complejidad | 35 en total; en `systems.js`, `onClick` (30) y `modelView` (11) | quickstart de F2b, §1; spec, FR-045 |
| Red de E2E | 106 de F1 y 17 de A2 (`content-gate.spec.ts`) | spec, «Cómo sabremos que salió bien» |
| `lab-bridge-check` | 21 escenarios, 10 de Sistemas | `qa/lab-bridge-check.ts` |
| `boot-check` | 14 escenarios | quickstart de F2b, §1 |
| Lectores de `data-sys*` fuera de `systems.js` | 0 (`git grep` en `frontend`, `qa` y `tools`) | `2b37caf4` |
| Ramas de Sistemas en los delegados de `app.js` | 0 (`git grep -n "sys-\|data-sys" frontend/app.js` no devuelve nada) | `2b37caf4`; confirma FR-049 |
| Modelos con azar o reloj | 0 (`Math.random`, `Date`, `performance.now` y `crypto` no aparecen en `entities/systems-simulation`) | `2b37caf4`; sostiene R3 |

## Decisiones

### R1 · Un solo motor por contexto: la página importa el singleton y el adaptador lee `window` (V3)

**Decisión.**

- La página importa `systemsEngine` del índice de `entities/systems-workshop`. El guard lo permite: R4 sólo rige para las fuentes legacy y `app/`, y su comentario dice que las páginas consumen los singletons desde F3.
- El adaptador `frontend/src/app/legacy/register-systems.tsx` no importa ese índice, porque R4 sólo se lo permite a su dueño, `register-systems-engine.ts`. Captura `window.TallerSystemsEngine` al evaluarse, como hacía `systems.js`, y lo usa en `init`, `refresh`, `sync` y `exerciseContextHTML`. En el bundle de Vite es el mismo objeto que importa la página.
- `qa/lib/sources.ts` suma `runSourceGroup`, que empaqueta varias fuentes en una sola entrada de esbuild. `loadSystemsUi` de `qa/lib/legacy-sources.ts` la usa para cargar juntos `register-systems-engine.ts` y la interfaz de Sistemas. Así `lab-bridge-check` termina con un solo motor: el del bundle del adaptador, que es también el de `window`.

**Por qué.** Cada `runSource` es un bundle aparte. Si `lab-bridge-check` cargara el motor y el adaptador por separado, el bundle del adaptador traería otra copia de `create-systems-engine.ts` (la página la importa): dos motores en el mismo contexto, que FR-021 prohíbe. Con una sola entrada, esbuild evalúa el módulo una vez. El cambio sólo toca cómo carga el check, no lo que espera.

**Lo que también resuelve.** `bundleSource` no fija `jsx: 'automatic'` ni define `process.env.NODE_ENV`, así que no puede empaquetar un `.tsx` con React. `runSourceGroup` usa las mismas opciones que `bundleApp`.

**Alternativas.**

- *(b) Partir el adaptador* en una parte sin React y otra de montaje. `window.TallerSystems` tiene que seguir siendo un objeto con los nueve métodos, así que haría falta un segundo global o un registro intermedio. Se descarta.
- *(c) Hacer al adaptador un segundo dueño del índice en R4.* Relaja el guard: dos fuentes de `app/` evaluarían el índice, y cualquier check que las cargue por separado volvería a tener dos motores. Se descarta.
- *(d) Inyectar el motor en la página por props o contexto.* La página dejaría de importar el singleton, contra FR-018 y FR-021 y contra la forma de F6 (su spec, «Cómo lee el motor la página»). Se descarta.

**Para F6.** Su `lab-bridge-check` tiene el mismo problema con `register-campaign-engine.ts`. `runSourceGroup` le sirve igual: el primero de los dos que entre la agrega y el otro la reusa (hallazgo del informe).

### R2 · La selección en la URL con nuqs (Q3, V6)

**Decisión.**

- **El hook.** `useWorkshopSelection(language)`, en `pages/systems/model/`, lee y escribe tres claves con `useQueryStates`, cada una con su parser:
  - `lenguaje`: `parseAsStringLiteral(['rust', 'go'])`. Sólo se escribe: el idioma lo sigue fijando el shell.
  - `taller`: `parseAsString`.
  - `parte`: `parseAsStringLiteral(['explore', 'build', 'ship']).withDefault('explore').withOptions({ clearOnDefault: false })`.
- **Las escrituras.** Cada una escribe las tres claves en ese orden, `{ lenguaje, taller, parte }`, con `history: 'replace'`. Cerrar escribe `taller` y `parte` en `null`.
- **Qué ve la página.** No copia la selección en ningún estado. Valida `taller` contra el catálogo al dibujar: un taller desconocido abre el catálogo. Una `parte` inválida o ausente vale `explore`.
- **La raíz.** La pone el adaptador: `UrlStateProvider` envuelve la página con el `NuqsAdapter` de `nuqs/adapters/react`.
- **La sincronización del historial.** `startUrlStateSync()` llama a `enableHistorySync()` desde `mount`, nunca al evaluar un módulo. Los dos viven en `frontend/src/app/legacy/url-state.tsx` para que F3 los reuse.

**Lo que ya se sabe antes de instalar** (código publicado de nuqs 2.10.2, leído en jsDelivr):

- **El hash.** `updateUrl` arma la URL con `new URL(location.href)` y sólo cambia `url.search`, así que `#sistemas` se conserva.
- **El historial.** Escribe con `history.replaceState(history.state, '__nuqs__', url)` cuando la opción es `replace`, y no dispara `popstate`. `navigateFromLocation` de `app.js` no se entera, igual que hoy con `locationForSelection`.
- **Las claves.** Las escribe en el orden del objeto que recibe el setter (`Object.entries(newState)`), y el setter devuelve una promesa.
- **El estado del hook** se actualiza en el acto: un `emitter.emit` síncrono llega a un `setState` de React. La URL se escribe después: la limitación por omisión es de 50 ms, y la primera escritura sale enseguida y las demás se agrupan (documentación de opciones). Por eso `flushSync(() => setter(...))` deja el DOM al día antes de mover el foco.
- **Las escrituras ajenas.** `enableHistorySync()` existe y se exporta en 2.10.2 (`export { NuqsAdapter, enableHistorySync }` en `dist/adapters/react.js`). Parchea `pushState` y `replaceState` una sola vez por adaptador: la marca es `history.nuqs.adapters`. Agrega un oyente de `popstate` que nunca se quita y no toca `localStorage`.
- **Lo que pasa al importar.** `nuqs/adapters/react` y sus fragmentos (`context`, `debug`, `patch-history`, `reset` y `key-isolation`) no agregan oyentes ni tocan `localStorage`. El único efecto es escribir `window.__NuqsAdapterContext`, que no cae en el filtro de globals de `boot-check` ni en el de `dist-content-check`.
- **El modo de depuración.** Es opcional: sólo `nuqs/debug` llama a `isDebugFlagSet()`, que prueba `localStorage`. El plan nunca importa `nuqs/debug`.
- **`clearOnDefault`** vale `true` desde nuqs 2.0. Sin `clearOnDefault: false`, escribir `parte=explore` la sacaría de la URL y rompería `?lenguaje=…&taller=…&parte=explore`.
- **La codificación.** `renderQueryString` vuelve a codificar toda la query, también los parámetros ajenos. Codifica `%`, `+`, `#`, `&`, `"`, `'`, `` ` ``, `<`, `>` y los caracteres de control, y el espacio va como `+`. Deja sin codificar `/`, `:`, `@`, `,`, `;`, `=`, `?` y lo que no es ASCII, que `URLSearchParams` sí codifica. Los ids del currículo (`[a-z0-9-]`) salen iguales.

**Dónde difiere de hoy** (la decisión D1 del informe; los E2E de la tarea T006 la fijan si el usuario la acepta):

1. **Los parámetros ajenos se conservan.** Hoy `withWorkshopQuery` vacía la query al abrir, cerrar o cambiar de parte; nuqs sólo toca sus tres claves. Ejemplo: abrir `cache` desde `/?basura=1&lenguaje=rust#sistemas` da hoy `/?lenguaje=rust&taller=cache&parte=explore#sistemas`, y con nuqs, `/?basura=1&lenguaje=rust&taller=cache&parte=explore#sistemas`.
2. **El orden de las claves que ya están se conserva.** Hoy cada escritura las reordena como `lenguaje, taller, parte`. Con nuqs, un cambio de parte desde el regreso del laboratorio (`?taller=cache&parte=build&lenguaje=rust#sistemas`) deja `?taller=cache&parte=ship&lenguaje=rust#sistemas`.
3. **Un parámetro ajeno con `/`, `:`, `,` o un carácter no ASCII** se vuelve a escribir sin codificar.

Ningún E2E de F1 depende de esas tres diferencias: los `toHaveURL` de F1 sobre Sistemas parten de un enlace del laboratorio (L7, L8 y L11 de `reload.spec.ts`) o del cambio de idioma de `app.js` (`url-contract.spec.ts`), y ninguno sigue a una escritura de la página. `url-contract`, `reload` y `views` no tendrían que cambiar. Lo confirma T003 con el adaptador real.

**Alternativas.**

- *Normalizar la URL después de cada escritura de nuqs* con un `replaceState` propio. Habría dos escritores de la misma query, contra «la query es la fuente de verdad» (`AGENTS.md`), y una carrera con la escritura limitada de nuqs. Se descarta.
- *Dejar `lenguaje` fuera de nuqs.* Al abrir un taller desde `/#sistemas` (el menú) la URL quedaría `?taller=cache&parte=explore`, sin `lenguaje`, contra FR-011 y el E2E «Abrir y volver». Se descarta.
- *Llamar a `enableHistorySync()` al evaluar `url-state.tsx` o en `main.tsx`.* Agrega un oyente de `popstate` que no se quita, y rompe el escenario de `boot-check` «main.tsx without its call evaluates quietly» (0 oyentes) y el principio de F2a de que evaluar no arranca nada. Se descarta: se activa en el primer montaje.

**Qué cambia la sincronización en F5.** Nada observable. Cada escritura ajena de `app.js` (el idioma, en el clic de `[data-language]`) va seguida de `render()`, que desmonta la vista y monta una raíz nueva. El adaptador de nuqs lee `location.search` en cada instantánea de `useSyncExternalStore`, así que la raíz nueva ve la URL nueva con o sin el parche. Se activa igual, porque lo pide la hoja de ruta para F3. Ninguna prueba de F5 puede distinguir si está activa: lo fija la spec de `url-state.tsx` (T008).

### R3 · La sesión de las simulaciones (Q1)

**Decisión.** `pages/systems/model/systems-session.ts` es un módulo con estado de la página. Lleva un `Map` de simulaciones por `lenguaje:taller` y el filtro del catálogo (la familia y la búsqueda), y expone `readSimulation`, `saveSimulation`, `resetSimulations`, `readCatalogFilter`, `saveCatalogFilter` y `simulationKey`. La API pública de la página reexporta `resetSimulations`, y el adaptador lo publica como `window.TallerSystems.resetSimulations` (FR-017).

**La diferencia interna con el legacy, sin efecto visible.** `stateFor` guardaba el estado inicial al leerlo; acá el estado se guarda sólo al actuar, y al dibujar se usa `readSimulation(key) ?? model.initial(workshop)`. Así el dibujo queda sin efectos (`docs/architecture.md`). Es equivalente porque ningún modelo usa azar ni reloj (línea base), así que `initial()` da siempre lo mismo.

**Alternativas.** Las de Q1 (spec, «Alternativas consideradas»). Además: un store de Zustand para la sesión (YAGNI: un solo consumidor y nada que suscribir, porque la página no está montada cuando «Borrar todo» la reinicia), o guardar al leer como hacía el legacy (pone un efecto en el dibujo).

### R4 · Foco y desplazamiento (FR-008, C2)

**Decisión.** Las escrituras que cambian de pantalla van dentro de `flushSync` y, después, el foco va a un nodo tomado con una ref. El desplazamiento de `#main` lo hace `scrollToTop`, que inyecta el adaptador (`host.scrollIntoView({ block: 'start' })`), porque la página no tiene contenedor propio (FR-001) y no lee `window`.

| Acción | Hoy | En el port |
| --- | --- | --- |
| «Explorar →» | foco al `h1`; `#main` arriba | `flushSync(open)`, `headingRef.current.focus()` y `scrollToTop()` |
| «← Todos los talleres» | el foco cae al documento; `#main` arriba | **C2:** `flushSync` monta el catálogo, que en su `useLayoutEffect` lleva el foco a «Explorar →» del taller que se dejó, con `preventScroll`; si la familia o la búsqueda de la sesión lo ocultan, al buscador. Después, `scrollToTop()` |
| Una parte (pestaña o pie) | foco al botón de la parte, con `preventScroll`; la tira de pestañas arriba | `flushSync(changePart)`; el botón de la parte dentro de `tabsRef`, con `preventScroll`; `tabsRef.current.scrollIntoView({ block: 'start' })` |
| Una familia | el foco queda en su botón | el botón no se desmonta: no hace falta código |
| «Ver todos los talleres» | foco al buscador | `flushSync` del filtro y `searchRef.current.focus()` |
| Una acción del modelo | foco al control con la misma acción y valor | el botón sigue montado (su `key` es `acción:valor`) |
| Una opción del checkpoint | foco a la opción | el botón sigue montado |

**Por qué «Explorar →» del taller que se deja.** Le devuelve al alumno el lugar de la lista desde donde abrió el taller. La alternativa (siempre el buscador) es más simple, pero lo manda al principio del catálogo. El `preventScroll` conserva el desplazamiento de hoy, que deja `#main` arriba.

### R5 · La escena SVG (Q2)

**Decisión.**

- **El saneo.** `sanitizeScene(scene: UntrustedScene): SafeScene` es una función pura en `entities/systems-simulation/lib/sanitize-scene.ts`, exportada por el índice del slice. Devuelve la `viewBox` como texto, el fondo y el `alt` saneados y las formas ya normalizadas. Copia las reglas de `scene()` (FR-023):
  - `Number` para los números, con un valor de respaldo si el resultado no es finito; `null` da 0;
  - `Math.max(0, …)` en anchos, altos, radios y trazo;
  - la `viewBox` vale al menos 1, y 400 × 260 por omisión;
  - el trazo vale 1 por omisión; el texto, 12 de tamaño y `#252c27` de relleno;
  - la lista blanca de colores, sin distinguir mayúsculas;
  - se cortan las primeras 2 500 formas antes de descartar las de tipo desconocido.
- **El dibujo.** `pages/systems/ui/SceneView.tsx` dibuja con elementos de React. El texto es un nodo de texto, el `alt` va en `aria-label` con `role="img"`, y el fondo, en `style={{ background }}` sobre el `<svg>`.

**Lo que no cambia y lo que sí.**

- **No cambia:** el tamaño del texto (`font-size`) no se limita a valores positivos, porque `scene()` tampoco lo hacía.
- **Cambia, sólo con entradas hostiles que ningún modelo produce:**
  - un color que no es texto (`['#fff']`) toma el respaldo, cuando `scene()` lo dejaba pasar porque `RegExp.test` lo convertía a texto;
  - `shapes` que no es un array cuenta como vacío, donde `scene()` lanzaba;
  - una forma que no es objeto se descarta.

  Las 9 escenas reales tienen que dar 0 diferencias (FR-027, comparación del quickstart §3.2).

**Por qué la propiedad `style` pasa una CSP sin `style-src-attr` (V2).** React aplica `style` en el cliente asignando las propiedades del `CSSStyleDeclaration` (CSSOM), no escribiendo el atributo. La CSP no bloquea las asignaciones por CSSOM. La documentación de React no describe ese detalle, así que lo comprueba la verificación V2 (quickstart §3.4) con una política estricta inyectada con `page.route`. El control negativo es el legacy, cuyo atributo `style="background:…"` sí produce la violación.

### R6 · Lo que adopta el comportamiento de React (C2, FR-051)

| Hoy, por `innerHTML` | En el port | E2E en rojo contra el legacy (T005) |
| --- | --- | --- |
| La traza «Qué cambió y por qué» se vuelve a abrir tras cada acción | `<details open>` se monta abierto. React no vuelve a fijar `open` mientras la prop no cambie, así que si el alumno la cierra queda cerrada | `the trace the student closed stays closed after another action` |
| La tabla de estado vuelve a su desplazamiento inicial | `.sys-table-scroll` sigue montada y conserva `scrollLeft` | `the state table keeps its scroll after an action` |
| El aviso de almacenamiento aparece en el próximo redibujo completo | aparece cuando el motor sube la revisión tras la escritura fallida | `the storage warning appears as soon as the engine reports it` |
| Al volver al catálogo el foco cae al documento | va a «Explorar →» del taller que se dejó (R4) | `going back to the catalog focuses the workshop just left` |

**Las regiones vivas que pasan a quedar montadas** (X2; el PR las lista y el usuario hace la prueba con lector de pantalla):

- `#sys-count`, al elegir una familia;
- `.sys-feedback`, al contestar;
- `#sys-model-live`, en los redibujos completos (abrir, contestar o cambiar de parte);
- `.sys-storage`.

**Las rarezas de lógica que se conservan:**

- «1 talleres para explorar», sin plural;
- la búsqueda sin recortar;
- el `font-size` sin límite;
- el sello de código calculado en memoria al montar.

### R7 · Paridad del DOM

**Decisión.** Cada componente reproduce el árbol de la plantilla de hoy (FR-001). Los puntos donde React podría apartarse, con su regla:

- **`class`.** La plantilla escribe `class=""` (sellos, metas, celdas, respuestas) y React escribe lo mismo con `className=""`. La comparación compara las clases como conjunto y trata `class=""` como ausente.
- **Las casillas de las etapas** son controladas (`checked` sale de `progress.steps`). React deja el atributo `checked` según el valor inicial y después cambia sólo la propiedad. La comparación compara la propiedad.
- **La nota** no es controlada (`defaultValue`). La plantilla de hoy nunca vuelve a escribir el `textarea` mientras se tipea, así que el cursor no se mueve y la nota se guarda en cada tecla sin depender de cómo React reconcilia un campo controlado.
- **El buscador** es controlado (`value`). React mantiene sincronizado el atributo `value`, y la comparación compara la propiedad.
- **El valor de un control del modelo** sin `value` llega a `act` como `''`, igual que `button.dataset.value` cuando el atributo era `data-value=""`. Es la entrada 2 de «Review Focus».
- **Los `data-sys*`, `data-model-action`, `data-value`, `data-index`, `data-id` y `data-sys-step`** desaparecen. Ninguna hoja, check ni herramienta los lee (línea base).
- **Los nodos de texto de sólo espacios.** Los únicos que tiene la plantilla son hijos directos de `#main` (los saltos de línea entre los bloques de `overview()` y de `detail()`). La comparación los ignora sólo ahí, y en el resto colapsa los espacios sin borrarlos, para que un `{' '}` perdido se detecte.

### R8 · El adaptador `window.TallerSystems`

**Decisión.** `register-systems.tsx` publica los nueve métodos con los nombres, las firmas y el orden de claves de hoy (contrato: [contracts/taller-systems.md](./contracts/taller-systems.md)). Tres detalles que una prueba de hoy ya fija:

- **El objeto no se congela.** `boot-check` reemplaza `init` y `resetSimulations` para espiarlos («startApp initializes in order», «borrar todo»). Con `Object.freeze`, como en el Atlas, esas asignaciones lanzarían en modo estricto.
- **Al evaluarse no lee el contenido, `window.TallerLab` ni `window.SYSTEMS_*`.** Sólo captura `window.TallerSystemsEngine`, igual que `systems.js`, y deja intacta la restricción de `load-order-check`. El resto se lee en `init`, `mount` y los métodos del laboratorio. El escenario de `lab-bridge-check` que pone un título hostil en `window.SYSTEMS_LOWLEVEL` antes de cargar el motor exige que los talleres se lean de `window.SYSTEMS_*` y no de `getContent()`.
- **`window.TallerLab`** está declarado en `register-project-kit.ts` con otro tipo. El adaptador no lo vuelve a declarar: lo lee con una interfaz local (`getExercises(): Exercise[]` y `exportState(): unknown`) y un cast desde `unknown`.

### R9 · Los checks atados al legacy

| Check | Qué cambia | Correspondencia (ADR 0008, §5) |
| --- | --- | --- |
| `boot-check` | `#sistemas` se verifica por nodos montados: un conjunto `REACT_VIEWS` reemplaza el caso del Atlas, y un ayudante `mountedText` junta el texto de los nodos de React. `LEGACY_SOURCES` pierde `frontend/systems.js` | «Cada vista se renderiza por hash» sigue con el mismo texto esperado («SISTEMAS · APRENDER DESARMANDO»). «Cada fuente legacy evaluada sola no lanza ni toca el almacenamiento», para Sistemas, queda cubierto por «main.tsx without its call evaluates quietly», que evalúa la cadena entera con el adaptador (0 accesos al almacenamiento y 0 oyentes) |
| `lab-bridge-check` | `systemsBridge` deja de llamar a `loadSystemsEngine` y `loadSystemsUi` carga el motor y la interfaz en un solo bundle; el mensaje de `assert.ok` nombra al adaptador | Sus 10 escenarios de Sistemas siguen siendo el contrato de HTML y URL hasta F7, sin cambiar un valor esperado |
| `load-order-check` | Las dos restricciones de `frontend/systems.js` pasan a `frontend/src/app/legacy/register-systems.tsx`, con la misma razón | Sin escenarios: es una tabla |
| `qa/lib/legacy-sources.ts` | `SYSTEMS_UI_SOURCE` apunta al adaptador y `loadSystemsUi` usa `runSourceGroup` | — |
| `qa/content-records-check.ts` | El nombre de una prueba («category is one that systems.js knows») pasa a «… that the Systems page knows» | El valor esperado no cambia |
| `qa/seams-guard-check.ts` | Nada: sus dos fuentes virtuales llamadas `frontend/systems.js` siguen siendo válidas como texto | — |

### R10 · El arnés de componentes y las fábricas

**Decisión.** F5 usa la pila del ADR 0008. Si llega antes que F3, la instala él:

- dos proyectos de Vitest (`node` para `*.spec.ts` y `jsdom` para `*.spec.tsx`);
- el setup `frontend/src/vitest-setup.ts`, con `cleanup()` y los matchers de jest-dom;
- la guarda de ESLint contra `useStore` sin selector;
- las versiones exactas de la hoja de ruta.

Si F3 ya entró, F5 la usa tal cual.

**fishery.** Se gana su lugar en F5: un taller válido para el motor necesita tres objetivos, cuatro etapas, un checkpoint y núcleos en los dos lenguajes con pruebas (`validate-catalog.ts`). Seis specs de componente lo arman con variantes. Las fábricas viven en `pages/systems/model/systems-page.factory.ts`, se tipan por los tipos del port y producen sólo entradas: los valores esperados se escriben a mano en cada spec. Si el usuario no autoriza fishery, ese archivo exporta funciones `build…` escritas a mano con la misma firma (`build(params)`), y ninguna spec cambia.

**Los dobles de jsdom.**

- `scrollIntoView` y `matchMedia` no existen en jsdom (ADR 0008).
- Las specs que los necesitan los definen con `vi.fn()` en su `beforeEach`, no en el setup global.
- `celebrate` se reemplaza con `vi.mock('../../../shared/lib/celebration')` en las specs que comprueban que la celebración va antes del aviso (FR-016). Es un comportamiento de la spec, no un detalle de implementación.

### R11 · La mudanza del CSS

**Decisión.** `git mv frontend/systems.css frontend/src/pages/systems/ui/systems.css`, sin editar una línea. `main.tsx` cambia una sola línea, la del `import`, que sigue siendo la última hoja. El `<style>` del dist tiene que salir con el mismo sha256 que en la línea base: es la prueba más fuerte de que ni el contenido ni el orden cambiaron. El barrido de estilo computado, ampliado (quickstart §3.3), protege lo que ese hash no ve: la cascada sobre el DOM de React.

### R12 · El peso

**Estimación antes de instalar** (sin medir; T003 lo mide):

- **nuqs 2.10.2.** Los archivos `.js` que alcanza `nuqs/adapters/react` más el índice suman 54 242 bytes sin minificar: `index.js` 26 939, `debounce` 13 435, `context` 4 804, `adapters/react.js` 3 460, `patch-history` 2 347, `debug` 929, `key-isolation` 922, `reset` 814 y `compare` 592. Con tree-shaking y minificado se espera entre 12 000 y 20 000 caracteres.
- **`@standard-schema/spec` 1.1.0.** Su `dist/index.js` mide 0 bytes: es sólo de tipos y no llega al bundle. No necesita aviso de licencia en el dist. Igual entra al lockfile, y el permiso lo nombra.
- **La entrada de React de `zustand`** (`useStore`) es una envoltura de `useSyncExternalStore`: menos de 1 000 caracteres.
- **La página contra `systems.js`.** El JSX compilado es más largo que las plantillas: se espera entre 0 y +15 000.

**Subpresupuesto de F5.** El aumento de `html.length` no pasa de **40 000 caracteres** si F5 instala nuqs, ni de **25 000** si ya lo instaló F3. Quedan unos 108 000 para F3 a F11 y A3. Si la medida lo supera, la compuerta se detiene y el coordinador decide.

### R13 · La integración con F3, F6 y F8

**Las reglas:**

- **Se integran de a uno** (FR-048): el que llega después rebasa y repite su compuerta.
- **El estado de la base se detecta en T001** con comandos, no se supone. Cada tarea condicional dice qué hace en cada caso.

| Pieza | Si F5 entra antes | Si F5 entra después |
| --- | --- | --- |
| nuqs y `url-state.tsx` (con F3) | F5 pide el permiso, instala nuqs y su aviso, y crea `frontend/src/app/legacy/url-state.tsx` | F5 usa el `UrlStateProvider` y la activación de F3, que activa la sincronización en el montaje, no al evaluar. Si F3 la activara al evaluar, `boot-check` ya le habría fallado |
| La pila de componentes (con F3, F4, F9, F6 y otros) | F5 la instala (T007) | F5 la usa |
| `runSourceGroup` y `loadSystemsUi` (con F6) | F5 agrega `runSourceGroup` y F6 la reusa para campaña | Si F6 ya agregó un ayudante equivalente, F5 lo usa. Si no, lo agrega |
| `boot-check`: `REACT_VIEWS` (con F3, F4, F6 y F9) | F5 generaliza el caso del Atlas | F5 suma `'sistemas'` al conjunto que dejó el primero |
| `register-effects.ts` y `window.TallerEffects` (con F6) | Se queda: `campaign.js` lo sigue leyendo | El global se queda sin lectores. Por la regla de F6 (su spec: «el último de F5 y F6 que se integre retira `register-effects.ts`»), F5 lo retira en el corte. La spec de F5 lo pone en «Queda fuera»: es la decisión D2 |
| `startApp()` (con F6) | `app.js` no cambia (FR-049) | Igual. F6 cambia la inicialización de campaña en `startApp()`; `TallerSystems.init` sigue después, y el `INITIALIZERS` de `boot-check` que deje F6 lo tiene que mostrar |
| `qa/lib/app-adapters.ts` (con F6 y F8) | Sin cambios para `TallerSystems` | Sin cambios, salvo que F8 haya entrado (fila siguiente) |
| `resetSimulations` (con F8, regla F8-Q2) | El adaptador lo publica y F8 lo retira al entrar | F8 ya sacó de `app.js` el armado de `progress-backup`. F5 lo retira: el armado de F8 importa `resetSimulations` de una entrada sin motor (`pages/systems/session.ts`), y el método sale del adaptador, de `app-adapters.ts` y de `RESET_METHODS` de `boot-check` |

### R14 · Los E2E

**Decisión.** Los E2E se reparten en tres archivos nuevos, más el Page Object y las ayudas, sin editar ninguna spec existente:

- **`qa/e2e/specs/systems.spec.ts`:** los de comportamiento, que pasan contra el legacy (FR-038).
- **`qa/e2e/specs/systems-react.spec.ts`:** los cuatro de C2, en rojo contra el legacy.
- **`qa/e2e/specs/systems-url.spec.ts`:** los dos de nuqs, sólo si el usuario acepta D1, también en rojo contra el legacy.
- **Lo que se agrega sin cambiar lo que hay:**
  - `SystemsPage` suma métodos;
  - `MethodPage`, nuevo, es el Page Object mínimo de Método;
  - `StorageControl` suma `failWrites()`;
  - `qa/e2e/lib/systems-progress.ts` arma el progreso v1 que se siembra.

**Los valores esperados** salen de las fuentes que permite la spec:

- `content/workshops/*.yaml` (títulos, objetivos, checkpoint y fuentes);
- `qa/fixtures/curriculum-ids.json` (ids, núcleos y objetivos);
- la fixture congelada `progress-master-2a278ad-storage.json` (`rust:pc` con los tres sellos);
- el README (reglas de los sellos).

Ninguno sale del código que se porta.

**Tiempo** (V5, estimación): unos 63 E2E nuevos (≈ 30 de comportamiento, 25 talleres, 4 de C2, 2 de nuqs y 2 de «Borrar todo» y escena). La red de F1 tardó unos 35 s con un worker (106 pruebas, ≈ 0,33 s cada una), así que se esperan entre 20 y 30 s más en el job `front`. T026 lo mide.

## Documentación consultada

**Cómo se consultó.**

- **El primer servidor de Context7** (`mcp__context7__*`) resolvió nuqs (`/47ng/nuqs`, Source Reputation High) y respondió dos consultas. Después agotó su cuota mensual («Monthly quota reached», 2026-10-28).
- **Por indicación del coordinador**, se usó el segundo servidor de Context7, que repitió las consultas por librería; la tabla lo dice fila por fila.
- **Lo que Context7 no traía** (el código publicado de nuqs 2.10.2 y la documentación de opciones de `nuqs.dev`) se leyó con `WebFetch` en la fuente oficial, y la fila lo aclara.
- **Las versiones** son las de `package-lock.json` en `2b37caf4`, o las que proponen la hoja de ruta y el ADR 0008 para lo que no está instalado.

| Librería | Versión | Fuente | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| nuqs | 2.10.2 (última, publicada el 2026-10-08) | Context7 `/47ng/nuqs` (primer servidor) | `enableHistorySync` y `patchHistory` | Parchea `pushState` y `replaceState`, ignora las escrituras con la marca `__nuqs__` y agrega un oyente de `popstate` | Sí: se activa en `mount`, no al evaluar (R2) |
| nuqs | 2.10.2 | Context7 `/47ng/nuqs` (primer servidor) | La opción `history` | `replace` por omisión; se puede fijar por hook y por llamada | No |
| nuqs | 2.10.2 | Context7 `/47ng/nuqs` (segundo servidor) | `defaultOptions` del adaptador y la limitación de escrituras | `defaultOptions` (desde 2.5.0) admite `history`, `shallow`, `scroll`, `clearOnDefault` y `limitUrlUpdates`. La URL se escribe en cola, limitada a 50 ms (120 ms en Safari); los valores menores se ignoran; el estado del hook se actualiza en el acto; la limitación emite la primera escritura enseguida | Sí: `UrlStateProvider` fija `history: 'replace'`; ningún límite propio |
| nuqs | 2.10.2 | Context7 `/47ng/nuqs` (segundo servidor) | `withNuqsTestingAdapter` y `NuqsTestingAdapter` | Props `searchParams`, `onUrlUpdate` (`{ searchParams, queryString, options }`, con el tipo `OnUrlUpdateFunction`) y `hasMemory`; sin limitación en las pruebas por omisión; `resetUrlUpdateQueueOnMount` aísla las pruebas | Sí: las specs de la selección y de la página lo usan, con `vi.fn<OnUrlUpdateFunction>()` |
| nuqs | 2.10.2 | `nuqs.dev/docs/options` con `WebFetch` (Context7 no traía `clearOnDefault`) | `clearOnDefault` | `true` desde 2.0 | Sí: `clearOnDefault: false` en `parte` |
| nuqs | 2.10.2 | `github.com/47ng/nuqs` en `v2.10.2` con `WebFetch` (código, no en Context7): `adapters/react.ts`, `useQueryStates.ts`, `lib/debug.ts`, `debug.ts` y `adapters/lib/patch-history.ts` | Cómo escribe y cuándo | `new URL(location.href)` conserva el hash; escribe las claves en el orden del objeto; el setter devuelve una promesa; `emitter.emit` síncrono; la depuración es opcional (`nuqs/debug`) | Sí: `flushSync` alrededor del setter (R4); nunca importar `nuqs/debug` |
| nuqs | 2.10.2 | `cdn.jsdelivr.net/npm/nuqs@2.10.2/dist/…` con `WebFetch` (archivos publicados) | Efectos al importar; `renderQueryString`; tamaños | Sin oyentes ni `localStorage` al importar; la codificación de R2; los tamaños de R12 | Sí: R2, R12 y la entrada «un adaptador que no arranca nada» de «Review Focus» |
| React | 19.2.8 | Context7 `/reactjs/react.dev` (segundo servidor) | `flushSync` antes de mover el foco o desplazar a un nodo nuevo | Envolver el cambio de estado en `flushSync` deja el DOM al día antes de usar la ref; es el patrón de «Manipulating the DOM with refs». La referencia (react.dev, con `WebFetch`) agrega que es seguro en manejadores de eventos y que no se llama al dibujar ni en efectos | Sí: abrir, volver, cambiar de parte y limpiar filtros (R4) |
| React | 19.2.8 | Context7 `/reactjs/react.dev` (segundo servidor) | `createRoot(…, { onUncaughtError })` y la prop `style` | Las opciones van en `createRoot`, no en `render`; `style` es un objeto en camelCase. Ninguna de las dos fuentes dice si `style` usa el CSSOM | Sí: el adaptador registra los errores como el Atlas; V2 comprueba el CSSOM en el navegador (R5) |
| Zustand | 5.0.15 | Context7 `/pmndrs/zustand` (segundo servidor) | `useStore` con un store de `createStore` | Firma `useStore(store, selectorFn?)`, importada de `zustand`, sobre un store de `zustand/vanilla` | No: la regla del selector chico es de F2a, y la guarda de ESLint la hace cumplir |
| Vitest | 5.0.3 | Context7 `/vitest-dev/vitest/v5.0.3` (segundo servidor) | `test.projects` en línea | Desde 5.0, los proyectos en línea heredan la raíz (`extends: true` por omisión), incluidos los plugins de Vite; los arreglos como `include` y `setupFiles` se concatenan; `name` y `projects` no se heredan | Sí: la raíz de T007 sólo lleva `cacheDir` y `projects`, y cada proyecto declara su `include` |
| Testing Library | `@testing-library/jest-dom` 7.0.1 | Context7 `/testing-library/jest-dom` (segundo servidor) | jest-dom con Vitest | `import '@testing-library/jest-dom/vitest'` en un archivo de `setupFiles`; los tipos salen de `types/vitest.d.ts` si el setup está en el `include` de TypeScript | Sí: el setup vive en `frontend/src/`, dentro de `tsconfig.app.json` |
| Testing Library | `@testing-library/user-event` 14.6.7 y `@testing-library/react` 16.3.3 | Context7 `/testing-library/user-event` (segundo servidor) | `userEvent.setup()` | Una sesión por prueba, con `await` en cada interacción; `type` acepta una selección inicial | Sí: las specs de componentes; el cursor en el medio de la nota lo prueba el E2E |
| jsdom | 30.1.2 | Context7 `/jsdom/jsdom` (segundo servidor, rama `main`) | `history.replaceState` y lo que no implementa | `replaceState` y `pushState` pasan sus pruebas de WPT; `scrollIntoView`, `scroll` y `scrollTo` están comentados en `Element.webidl`; `matchMedia` no está implementado; sin layout ni navegación | Sí: dobles por spec (R10); el caso 1 del spike de V6 confirma `replaceState` |
| fishery | 2.4.0 | Context7 `/thoughtbot/fishery` (segundo servidor) | `Factory.define` y `build(params)` | Los objetos anidados se mezclan en profundidad; **los arreglos se reemplazan**; un `undefined` explícito borra el valor por omisión | Sí: las fábricas pasan los arreglos completos cuando los cambian |
| Playwright | 1.63.0 | Context7 `/microsoft/playwright/v1.63.0` (segundo servidor) | `route.fetch` y `route.fulfill` con cabeceras; `emulateMedia({ reducedMotion })`; `waitForEvent('download')` | `fulfill({ response, body, headers })` modifica la respuesta; `reducedMotion` acepta `'reduce'` y `'no-preference'`; la espera de la descarga empieza antes del clic y `suggestedFilename()` da el nombre | Sí: el script de V2 (quickstart §3.4) y los E2E del tercer sello y del kit |
| Vite | 8.3.2 | — | — | No se consultó: el plan no cambia su configuración ni su uso. La hoja se importa desde `main.tsx` como `atlas.css` | — |

## Mediciones de sólo lectura

- `npm view nuqs`: `latest` 2.10.2 (2026-10-08), licencia MIT, `dist.unpackedSize` 480 252 bytes y 101 archivos.
  - Dependencias: `@standard-schema/spec` 1.1.0, MIT y 22 634 bytes desempaquetados.
  - `peerDependencies`: `react >=18.2.0 || ^19.0.0-0`. Los routers son opcionales (`peerDependenciesMeta`).
  - Exporta `./adapters/react` y `./adapters/testing`.
- `npm view jsdom@30.1.2 engines`: Node `^22.22.2 || ^24.15.0 || >=26.0.0`. La imagen es `node:24.21.0`.
- `npm view @testing-library/react@16.3.3 peerDependencies`: React 18 o 19 y `@testing-library/dom ^10`.
- `npm view fishery@2.4.0`: MIT.
- `zustand` 5.0.15: `exports["."]` (`esm/index.mjs`) trae `useStore` junto con la API de `vanilla`.

## Lo que no se verificó

- **Ningún comando del repositorio.** Las medidas de la línea base, el tamaño real, el tiempo de los E2E y los avisos de complejidad los toma T001 y los compara T025.
- **Que el adaptador real de nuqs en jsdom escriba las URL de R2.** Lo hace T003 antes de portar. Si jsdom no actualiza `location` con `replaceState`, T003 lo dice y V6 pasa a correr con los E2E «Abrir y volver» después del corte, antes de abrir el PR.
- **Que React y nuqs se evalúen en el contexto pobre de `lab-bridge-check`** (sin `document`, `console` ni `setTimeout`). Lo prueba T009. Si falta un global, se agrega al `createContext` del check, que es infraestructura, sin cambiar un valor esperado.
- **V2 (la CSP), V4 (el DOM) y la comparación de las 9 escenas** corren en T025.
- **La comprobación con lector de pantalla de X2** es del usuario.
- **macOS, Docker y la CI.**

## Línea base de la implementación

Medida por T001 el 2026-10-28 sobre `24ba9d3d` (rama `impl/f5-sistemas`; el código es el de `master` en `dd870a9c`, con F2a, A2 y F2b, y encima sólo commits de `specs/`). `npm ci --offline`, `npm run build`, `npm test` (719 pruebas de Vitest), `npm run lint` (0 errores), `npm run format:check` y los E2E (123 de 123) dieron verde.

| Qué | Valor |
| --- | --- |
| `dist/index.html` | 1 141 337 caracteres (tope vigente 1 250 000) |
| sha256 del script | `a0d182f082b6a0b9af30ab39a821a171001badabac4fba0e9c66f231c0d9be94` |
| sha256 del `<style>` | `ae2971b09f63ae91d69f77007777d555159b8be1df652feb145535a963327b79` |
| sha256 del marcado | `8e060fe765d256c22639d3b31c98a3a60160eb4263d3d0396714022c562892d8` |
| sha256 de `build/curriculum.json` | `4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6` |
| sha256 de `dump-globals` | `859771e276be9dc757c25388fd617df7d8667ffab176992e82d79cf6e1dd6fa1` |
| Avisos de complejidad | 35; en `systems.js`, `onClick` (30) y `modelView` (11) |
| `boot-check` | 25 `PASS` |
| `lab-bridge-check` | 21 `PASS` |
| `app-shell-check` | 58 `PASS` |
| `systems-check` | 46 `PASS` |
| `npm run test:e2e` con `--workers=1` | 123 pasan en 45,6 s |

Qué entró antes (quickstart §1.2):

| Pregunta | Respuesta |
| --- | --- |
| nuqs | Ausente: T002 lo pide |
| Pila de componentes (`jsdom`, Testing Library) | Presente (jsdom 30.1.2, `@testing-library/react` 16.3.3): T007 no corre |
| fishery | Presente (2.4.0): T002 no la pide |
| Raíz de nuqs (`enableHistorySync`) | Ninguna; tampoco hay `url-state.tsx` |
| F6 | No entró: `frontend/campaign.js` existe |
| Ayudante de grupos (`runSourceGroup`, `bundleSourceGroup`) | Ninguno en `qa/` |
| `REACT_VIEWS` en `boot-check` | Ausente: T010 corre |
| F8 | No entró: `createProgressBackup` sigue en `frontend/app.js` |

## Resultado del spike de V6 y V1 (T003)

Corrido el 2026-10-28 sobre una copia descartable de `impl/f5-sistemas`, con el adaptador real de nuqs 2.10.2 en jsdom (6 tests; los casos 2 y 3 son uno solo). No cambia el plan.

| # | Comprobación | Resultado |
| --- | --- | --- |
| 1 | jsdom actualiza `location` con `replaceState` | OK |
| 2 | abrir desde `/#sistemas` escribe `?lenguaje=rust&taller=cache&parte=explore` y conserva `#sistemas` | OK |
| 3 | no suma entrada al historial | OK |
| 4 | cerrar deja `?lenguaje=rust` | OK |
| 5 | un parámetro ajeno se conserva (`?basura=1&lenguaje=rust&taller=cache&parte=explore`) | OK |
| 6 | las claves que ya estaban conservan su orden (`?taller=cache&parte=ship&lenguaje=rust`) | OK |
| 7 | con `enableHistorySync()`, un `replaceState` ajeno llega al hook | OK |

- **`enableHistorySync`** se exporta en `nuqs/dist/adapters/react.js` de la 2.10.2.
- **`localStorage`** también aparece en `nuqs/dist/server.js`, que es el entry `nuqs/server`. El plan no lo importa.
- **V1, el peso estimado con esbuild:** nuqs suma 17 451 bytes, bajo el umbral de 25 000; zustand suma 245 y `@standard-schema/spec`, 0. La medida real es la diferencia de `html.length` en T025.
- **El filtro del quickstart §2.1:** `npm run test:unit -- src/pages/...` no encuentra el archivo, porque el filtro es relativo a `frontend/src`. Funciona con el nombre del archivo.

## Resultados de la compuerta (T025)

Medidos el 2026-10-28 sobre `ef5b640f` (el corte), contra la línea base `24ba9d3d`, con los scripts de `quickstart.md` §3 (puertos 4571 y 4572 en lugar de 4501 y 4502; E2E en el 4185). Los números salen tal cual; las casillas rojas quedan abiertas.

| Casilla | Esperado | Medido | Estado |
| --- | --- | --- | --- |
| `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` | verde, 0 errores de lint | verde; 801 pruebas de Vitest (719 en la base); 0 errores | verde |
| `build/curriculum.json` y `dump-globals` | iguales a la base | iguales (`4555e850…` y `859771e2…`) | verde |
| sha256 del `<style>` y del marcado | iguales a la base | iguales (`ae2971b0…` y `8e060fe7…`) | verde |
| sha256 del script | cambia | `a68ae21c…` (la base, `a0d182f0…`) | verde |
| `dist/index.html` | bajo 1 250 000 y con el aumento dentro de +40 000 | 1 166 985 caracteres; +25 648 sobre 1 141 337 | verde |
| Avisos de complejidad | 35 − 2 = 33 | 33; se van `onClick` (30) y `modelView` (11) de `systems.js` y no entra ninguno | verde |
| Escenarios de `boot`, `lab-bridge`, `app-shell` y `systems` | 25, 21, 58 y 46 | 25, 21, 58 y 46 | verde |
| `seams-guard`, `dist-content` y `build` | verde | 25 escenarios; sin violaciones; 5 de 5 | verde |
| Diferencia de `frontend/app.js` | vacía | vacía | verde |
| Diferencia de `qa/e2e/specs/` | sólo `systems.spec.ts`, `systems-react.spec.ts` y `systems-url.spec.ts` | esos tres archivos, 630 líneas sumadas y ninguna borrada | verde |
| `style="`, `innerHTML` y `dangerouslySetInnerHTML` en `pages/systems` | 0 | 0 | verde |
| `style={` en `pages/systems` | una, en `SceneView.tsx` | una: `SceneView.tsx:85` | verde |
| `nuqs/debug`; `window.`, `getContent` y `localStorage` en `pages/systems` | 0 | 0 y 0 | verde |
| `systems.js` o `systems.css` en producción y configuraciones | nada | `frontend/src/app/main.tsx:6` importa `../pages/systems/ui/systems.css` (la hoja nueva); `frontend/systems.js` y `frontend/systems.css` ya no existen | verde, con la hoja nueva como único acierto |
| Textos de la plantilla (§4.1) | `missing: 0` | 79 fragmentos, 0 faltantes | verde |
| E2E | 184 pasan | 184 en la primera corrida (2,2 min con `--workers=1`); en las dos siguientes, 183 y `startup-storage.spec.ts › route, lab and Systems, from an empty browser` falla; con `--repeat-each=20` pasa 4 veces (la base: 10 de 10) | rojo |
| DOM (V4): estados y diferencias | 187 y 0 | 187 y 0 | verde |
| DOM: escenas | 9 | 19 en el contador del script, que suma el estado inicial, la acción y el pc con sellos de cada escena; los ids distintos son 9, con 0 diferencias | verde, con el esperado del quickstart corregido |
| Barrido de estilo computado (V3 ampliado) | 276 capturas y 0 diferencias | 276 capturas y 2 584 diferencias (2 586 en otra corrida); la base contra sí misma da 0 | rojo |
| CSP (V2) en la rama | `rgb(20, 39, 31)` y 0 violaciones de `14271f` | `rgb(20, 39, 31)` y 0 (0 violaciones en total) | verde |
| CSP en la base (control negativo) | 1 o más | 1 | verde |
| V5: `npm run test:e2e -- --workers=1` | informar | base: 123 pruebas en 45,6 s; rama: 184 pruebas en 2,2 min (primera corrida) y 1,1 min (las otras dos, con un fallo de 5 s) | informado |
| Mutaciones (§4) | cada una hace fallar su prueba | 15 de 16 la hacen fallar; la de T009 sólo se comprobó por el script de `engines` (detalle abajo) | verde, con T009 por el script |
| Revert (SC-008) | la vista legacy vuelve y pasa su red | `npm run build` y `npm test` verdes (719 pruebas, como la base); `systems.spec.ts` pasa 55 de 55 sobre `systems.js` | verde |
| `docker compose build taller` | con permiso | no se corrió | pendiente |

### Las dos casillas rojas

- **E2E.** `startup-storage.spec.ts` escribe la nota en «Llevátelo a un proyecto» y recarga enseguida; en la rama la recarga cae a veces en «Manipulá el sistema» y no encuentra el campo de la nota (16 fallos de 20 corridas contra 0 de 10 en la base). Una sonda con Playwright, corrida contra cada raíz, lee `location.search` justo después del clic en la pestaña: la base ya trae `parte=ship` en las 6 corridas; la rama trae `parte=explore` en 5 de 6. La escritura de la URL de nuqs queda diferida y la vista legacy la hacía en el acto. Con `await page.waitForURL(/parte=ship/)` antes de `page.reload()` la prueba pasa 20 de 20 (cambio descartado, la spec no se edita).
- **Barrido.** Las diferencias son de dos clases. Casi todas son de menos de 0,5 px en `width`, `inline-size`, `transform-origin` y `perspective-origin`: los `.sys-pills span` tienen 2, 2 y 1 nodos hijos en la rama (`{workshops.length} talleres`) y 1, 1 y 1 en la base. 60 son de color de borde y fondo del botón del modelo tras una acción (`sys-pc-action`): React conserva el botón con el puntero encima y `innerHTML` lo recreaba sin `:hover`; con el puntero fuera de la página sólo quedan 2, de un `transform` de la animación del aviso.
- **Los controles negativos del barrido**, contra la rama (así las diferencias vienen sólo de la mutación):
  - la hoja de Sistemas antes de `atlas.css`: el sha256 del `<style>` cambia a `bacb17c4…`, pero el barrido da 0 diferencias en `sys-pc-seals-explore` y `sys-cache-ship` y, en las 23 páginas a 375 y 1280, sólo 4 del aviso animado;
  - mover la última regla de `systems.css` (el `@media (max-width: 1000px)` de `.sys-external-grid`) al principio: el `<style>` cambia a `3ca31f47…`, el barrido sobre las dos páginas del quickstart da 0 y sobre las 23 páginas a 375 y 590 da 1 828 diferencias (1 646 de bloque y filas) en `sistemas`, `sys-empty` y `sys-family`, que son las páginas con las herramientas externas.

### Las mutaciones

| Tarea | Mutación | Falla |
| --- | --- | --- |
| T008 | Sin `enableHistorySync()` | «shows a foreign replaceState…» |
| T009 | `separate` en lugar de `group` (no se aplicó la mutación: cargar el motor aparte pasa `lab-bridge-check`, 21 de 21) | el script de §2.3 da `engines: 2` |
| T010 | `mount` sin montar nada | `boot-check`: «#sistemas no montó nodos en #main» |
| T012 | Cortar tras filtrar | «cuts at 2 500 before dropping…» |
| T012 | `SAFE_COLOR` sin `/i` | «… in any case» |
| T014 | `.trim()` en la query | «does not trim the query» |
| T015 | `resetSimulations` vacía el filtro | «resets the simulations and keeps the family and the search» |
| T016 | Sin `clearOnDefault: false` | «opening writes…» |
| T016 | `{ taller, parte, lenguaje }` | «opening writes…» |
| T018 | `open={log.length > 0}` con `key` | «leaves the trace closed when the student closed it…» |
| T020 | `control.value` sin `?? ''` | «a control without a value reaches the model as an empty string» |
| T020 | `celebrate()` después del aviso | «celebrates before announcing the third seal» |
| T022 | Sin el foco al volver | «going back writes the catalog query and focuses «Explorar →»…» y «back falls back to the search box…» |
| T023 | Sin `flushSync` en `openWorkshop` | «…writes the query, focuses the title…» |
| T024 | `Object.freeze(window.TallerSystems)` | `boot-check`: «startApp initializes in order…» |
| T025 | Hoja de Sistemas antes de `atlas.css` | el sha256 del `<style>` cambia (el barrido no la ve) |
