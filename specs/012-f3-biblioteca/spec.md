# Feature Specification: F3 · Biblioteca

**Feature Branch**: `012-f3-biblioteca` (nombre de la feature; el proyecto no crea una rama por feature. Esta spec vive en la rama `spec/f3-biblioteca`)

**Created**: 2026-10-07

**Status**: Borrador con tres preguntas abiertas para el clarify (Q1 a Q3). Sin plan ni tareas.

**Input**: Ítem **F3** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Biblioteca»: portar la página de Biblioteca (búsqueda, filtros, favoritos y categorías) a React sin que el alumno note el cambio. Pedido del coordinador del 2026-10-07 (ver «Lo que pidió el usuario»). Depende de F2a (la [spec de F2](../009-f2-seams/spec.md) y su [plan](../009-f2-seams/plan.md)), implementada en el PR #40, rama `f2a/base`, que lleva también a A2; y de F1 ([spec](../003-f1-red-de-seguridad/spec.md)). Usa el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1. Lo que existe sólo en `f2a/base` (`routeStore`, `startApp()`, `getContent()` y la compuerta de A2) y lo que deja F2b (rama `f2b/base`) no está en `master` (`e87772d`): se cita como código, sin enlace, y se toma como supuesto.

## Intención y alcance

**Lo que entendemos.** La Biblioteca es una de las cuatro páginas que `frontend/app.js` dibuja con plantillas de texto. Muestra los 15 recursos de `content/guide/` en un orden fijo: el alumno busca por texto, filtra por lenguaje, acceso y tipo, y marca favoritos. Los favoritos son una lista de ids dentro del progreso del recorrido (`taller-learning-v1`), que comparten los pasos, los hitos y las notas. Los filtros viven sólo en la memoria del documento: sobreviven al cambio de vista y de idioma y se pierden al recargar. El Atlas ya es React y monta su raíz sobre `#main` desde un adaptador. F3 hace lo mismo con la Biblioteca y no cambia lo que el alumno ve, hace ni guarda: mismo aspecto, textos, orden de los recursos y filtros; misma búsqueda, mismo foco y mismo teclado; mismas URL; mismo progreso. Es el primer port de las hojas y estrena tres cosas que F4 y F9 heredan: una página de React que escribe el progreso del recorrido por `routeStore`, el arnés de pruebas de componentes (la primera spec con jsdom y Testing Library) y el recorte de las ramas de los tres delegados de `app.js`. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con el build portado, la red de F1 (106 E2E) y los 17 de A2 pasan sin editarse.
2. Los E2E de la Biblioteca, escritos contra el legacy y en verde antes del corte, pasan sin editarse después.
3. Una comparación única entre el legacy y el port, sobre un conjunto fijo de estados y a cuatro anchos, da 0 diferencias en el DOM normalizado, el estilo computado y el árbol de accesibilidad, salvo las diferencias aceptadas (FR-036).
4. El progreso queda intacto: las fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar; cada clic en una estrella escribe una vez y en el mismo formato; el favorito que se quitó no reaparece cuando otra parte de la app guarda.
5. `app.js` ya no dibuja la Biblioteca ni maneja sus eventos: sólo la monta y la desmonta por `window.TallerLibrary`.
6. Los bytes del dist que no deben cambiar no cambian, y el tamaño queda bajo el tope vigente (ver «Qué cambia en `dist/index.html` y por qué»).
7. Cada contrato de «Qué se conserva» tiene una spec o un E2E que falla si se rompe.

**Entra:**

- La página en `frontend/src/pages/library/` (nombre provisional), con su modelo puro (el filtro, los favoritos y la sesión de filtros) y su interfaz.
- El adaptador `window.TallerLibrary`, con `mount` y `unmount`, en `frontend/src/app/legacy/`, y la sesión de filtros en memoria.
- Lo que se retira de `app.js` (ver «Qué se retira del legacy y qué adaptador queda»).
- Las specs: Vitest en `node` para el modelo; Vitest en `jsdom` con Testing Library para la página; y E2E con un Page Object de la Biblioteca.
- El arnés de componentes de la primera spec de componente (jsdom, Testing Library, el proyecto `jsdom` de Vitest y su setup), y fishery si una factory gana su lugar.
- Una guarda contra `useStore` sin selector.
- La adaptación de los checks de `qa/` que tocan la Biblioteca, con su correspondencia, y la documentación que cambia.

**Queda fuera:**

- Llevar los filtros a la URL o al almacenamiento (Q1): cambia el contrato de URL o el formato del progreso.
- Cambiar la búsqueda (por ejemplo, a la búsqueda por palabras del Atlas), el orden, los textos o el aspecto.
- Corregir lo que el port descubre y no cambia a propósito: la `.sr-only` vacía de cada enlace, el foco que se pierde al quitar un favorito con «Solo mis favoritos», la búsqueda que también mira `both`. Son hallazgos: cada uno, si el usuario lo pide, va en su propio commit con TDD.
- Mover las reglas de CSS de la Biblioteca (Q2).
- El shell, el router y el contador del menú (`#resource-count`), que retira F10 (o actualiza E1); y Recorrido, Proyecto y Método, aunque compartan archivo (F9, F4 y F8).
- `content/`: los 15 recursos, sus textos y su orden.
- Un slice `features/favorites` o `entities/resource`, y una librería de animación: sin segundo consumidor, no.

**Sin hacer a propósito (YAGNI):** un hook compartido para leer el recorrido (si F4 y F9 repiten las dos líneas, lo extraen ellos); un store de Zustand para los filtros; memoización; `StrictMode`; debounce de la búsqueda (el filtro sigue corriendo por cada tecla, como hoy); virtualización de 15 tarjetas; nuqs; barrels.

**Actores:** el alumno, que no debe notar nada; quien porta (el usuario y los agentes que implementan); quien revisa; el agente principal, que integra `package.json`, las configuraciones, la documentación y los archivos que comparten los ports; y quien porta F4 y F9 después.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta del clarify. Las fuentes «Coordinador» son el encargo de esta spec.

| Pedido | Fuente |
| --- | --- |
| Red y seams primero, vistas una por una con una raíz de React dentro del shell legacy, y el shell con el router al final | Usuario, 2026-10-05 |
| Es un port y no un rediseño: se conservan el aspecto, el comportamiento, el progreso, los IDs y las URL | Usuario, 2026-10-05 (supuesto que no corrigió) |
| El PR de un port abre con los E2E de comportamiento de su vista, escritos contra el legacy y en verde, y pasan sin editarse después | Usuario, clarify de F1 (Q1), 2026-10-05 |
| F3 entra con la página en `pages/` con el filtro y los favoritos como modelo puro y los E2E; borra `renderLibrary`, `renderResourceResults` y sus ramas en los tres delegados; conserva un `mount` y un `unmount` como los del Atlas hasta F10; deja fuera llevar los filtros a la URL | Hoja de ruta, «Alcance por ítem» |
| Decidir si los filtros siguen en memoria, como hoy (se recomienda que sí) | Hoja de ruta, «Decisiones abiertas» |
| F3 a F9 no se esperan por datos y se integran de a uno, porque cada una toca `app.js` | Hoja de ruta, «Orden y paralelismo» |
| Zustand ya entra con F2a, y un componente lee el almacén con un selector chico y nunca con el store completo | Usuario, 2026-10-06; `AGENTS.md`; plan de F2a, riesgo 12 |
| Librerías conocidas antes que código propio | Usuario, clarify de F2 (Q3) |
| El contenido de la biblioteca sale de `getContent()`, que sólo `app/` puede importar (F2-I6); la página lo recibe por su adaptador, como el Atlas | Coordinador, 2026-10-07 |
| Los favoritos se leen y se escriben por `routeStore`, sin otra instancia ni otra clave | Coordinador, 2026-10-07 |
| Se conservan el aspecto, los textos, el orden de los recursos y los filtros; la búsqueda, el foco y el teclado; las URL (sin filtros en la URL, y nuqs sólo con un caso real); el progreso guardado | Coordinador, 2026-10-07 |
| Los 106 E2E de F1 y los 17 de A2 pasan sin editar; Vitest con Testing Library, fishery si hay factories y E2E con Page Object | Coordinador, 2026-10-07; ADR 0008 |
| Permiso para jsdom y Testing Library con la primera spec de componente (F3) y para fishery con la primera factory | Hoja de ruta, «Acciones del usuario» |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicarla si pasa de 52 requisitos | Coordinador, 2026-10-07 |

## Preguntas abiertas para el clarify

Son tres, y las tres tienen una opción recomendada. Cada una tiene su marcador de Spec Kit en el requisito que cambia.

### Q1 · ¿Dónde viven los filtros? (FR-021)

Hoy la búsqueda, el lenguaje, el acceso, el tipo y «Solo mis favoritos» viven en la memoria del documento. Sobreviven al cambio de vista y de idioma y se pierden al recargar; la URL de la Biblioteca es sólo `#biblioteca`.

| Opción | Respuesta | Qué implica |
| --- | --- | --- |
| **A (recomendada)** | Siguen en memoria, en una sesión de módulo fuera de la raíz de React, como la sesión del Atlas | El contrato de URL, el progreso y la red de F1 quedan intactos y no hay dependencias nuevas. Costo: no se puede enlazar ni recargar con filtros, como hoy |
| B | Van a la URL con nuqs | Los filtros serían enlazables, pero cambia el contrato de URL (una séptima forma con query que F10 tendría que leer), obliga a decidir qué hace la recarga completa de los enlaces que cambian la query (hoy descarta el estado), suma una dependencia con su permiso y su peso medido y rompe «el alumno no nota el cambio». Sería un ítem propio |

**Por qué A:** es lo que pide la hoja de ruta, y nuqs entra sólo con un caso real (`AGENTS.md`): acá no hay uno, porque hoy nadie comparte ni recarga un filtro. Persistir los filtros en `localStorage` está descartado en «Alternativas consideradas».

### Q2 · ¿Qué pasa con las reglas de CSS que sólo usa la Biblioteca? (FR-026)

`frontend/styles.css` tiene unas 45 reglas con las clases de la página (`.filter-bar`, `.filter-chip`, `.resource-*`, `.favorite-button`): 30 al nivel de la hoja y las demás dentro de los `@media` de 1150, 850 y 590 px y del de impresión, mezcladas con reglas de otras páginas (la cuenta sale de leer el archivo; el plan la repite). La convención de la hoja de ruta dice que un port de `app.js` borra «las reglas que ninguna otra vista usa», pero la línea de F3 no las nombra. Tres cosas del bloque no son sólo de la Biblioteca: `.search-wrap` (la usa el laboratorio y `lab.css` la pisa), `input[type='checkbox']:not(.step-check)` (global) y `.empty-state` (la usa la compuerta de contenido de A2).

| Opción | Respuesta | Qué implica |
| --- | --- | --- |
| **A (recomendada)** | Quedan en `styles.css` hasta F10, que las mueve o borra de una vez con una sola comparación | El `<style>` del dist queda idéntico: la prueba más barata de que el aspecto no cambió, y F3 no choca con F2b (que agrega bloques al final de `styles.css`) ni con F4 y F9, que editarían los mismos `@media`. Costo: hasta F10, `styles.css` sigue teniendo reglas de una página ya portada, y F3 no cumple la letra de la convención |
| B | Pasan a una hoja de la página (`pages/library/ui/library.css`), como `atlas.css` | La página trae su estilo. Costo: hay que partir los `@media` donde las reglas están mezcladas con las compartidas; el `<style>` del dist cambia (el mismo conjunto de reglas en otro orden, que se demuestra con un barrido de estilo computado a cuatro anchos); y F3, F4 y F9 editan los mismos bloques de `styles.css` |

**Por qué A:** F3 es un port, y A convierte «el aspecto no cambió» en un criterio gratis (un hash). Si el usuario elige B, la hoja de ruta tiene que decir que F4 y F9 hacen lo mismo y qué ítem retira lo que queda.

### Q3 · ¿Se acepta que el detalle abierto de una tarjeta siga abierto? (FR-022)

Hoy cada búsqueda, filtro o favorito reconstruye todas las tarjetas con `innerHTML`, así que una tarjeta con «Antes de empezar» abierto se cierra. Con React y una `key` por recurso, las tarjetas que siguen visibles conservan su estado y el detalle abierto queda abierto. Es la única diferencia de comportamiento que el port introduce a propósito.

| Opción | Respuesta | Qué implica |
| --- | --- | --- |
| **A (recomendada)** | Se acepta: las tarjetas con `key` conservan su estado. Ningún E2E fija que el detalle se cierre | Código natural de React. Costo: un alumno puede notar que el detalle ya no se cierra solo |
| B | Se conserva el cierre: se reconstruyen las tarjetas en cada cambio (cambiando su `key` a propósito) y un E2E `KNOWN DEFECT` lo fija | Fidelidad literal. Costo: código que existe sólo para reproducir un accidente, que F10 tendría que deshacer |

**Lo que no cambia aunque parezca un defecto.** Al quitar un favorito con «Solo mis favoritos» activado, la tarjeta desaparece y el foco cae al documento, porque no hay nada que enfocar. Es comportamiento de hoy y el port lo conserva (FR-019); si un E2E lo fija, la prueba lleva `KNOWN DEFECT` en el nombre (`qa/AGENTS.md`) y quien lo corrija la cambia en su commit con TDD. Las otras diferencias de la lista (los `data-*` del delegado que se retiran, el recuento que queda montado en lugar de recrearse y el primer dibujo un turno de React después) siguen las reglas de la hoja de ruta y no se preguntan.

**Lo que no es una pregunta.** Los permisos de descarga son una acción del usuario (ver «Acciones del usuario y descargas»). La guarda de `useStore` (ESLint o revisión), si fishery entra con una factory y cuántos PR son los decide el plan. El ADR 0008 ya fija la pila de pruebas, y F2a, la suscripción.

## Qué se conserva

El contrato de hoy sale de `renderLibrary` y `renderResourceResults` en `frontend/app.js`, en la base. Los valores esperados de cada prueba salen de esta tabla y de los ejemplos resueltos de abajo, que se calcularon corriendo el predicado legacy sobre los 15 recursos de `content/guide/` (nunca del código del port). La tercera columna dice quién lo prueba.

| Qué | Contrato de hoy | Quién lo prueba |
| --- | --- | --- |
| Recursos y orden | Los de `GUIDE_DATA.resources`, en el orden de `content/guide/manifest.yaml`; la página no ordena. El total es la lista completa | E2E (orden de los títulos); spec de la página |
| Textos fijos | La etiqueta «RECURSOS CON INTENCIÓN» y el título «Una biblioteca. Tu propia ruta.»; la introducción «Todo lo que revisamos, en un lugar. Elegí según lo que necesitás hoy; guardá tus favoritos para volver sin buscar de nuevo.»; la nota «Accesos y modalidades revisados el 2 de octubre de 2026. Los recursos externos necesitan conexión y pueden cambiar. Los precios no se fijan aquí: revisá las condiciones de cada sitio.» | E2E por rol y nombre; spec |
| Controles | Búsqueda `type=search` («Buscar recursos», con la ayuda «Buscar un recurso, tema o formato…»); lenguaje («Filtrar por lenguaje»: «Todos los lenguajes», «Rust», «Go»); acceso («Filtrar por acceso»: «Cualquier acceso», «Acceso gratuito», «Gratis + pago»); grupo «Tipo de recurso» con cinco botones con `aria-pressed`, en el orden Todos, Ejercicios, Proyectos, Lectura y Herramientas; casilla «Solo mis favoritos». El lenguaje del menú no filtra la Biblioteca: son controles independientes | E2E; spec |
| Búsqueda | La consulta entera, recortada y sin tildes ni mayúsculas, es **una subcadena** del título, la descripción, el «para vos», el formato y los identificadores de lenguaje (`rust`, `go`, `both`) del recurso. No mira el tipo, el acceso, «Antes de empezar», la URL ni el id. Vacía (o sólo espacios) no filtra, y el campo conserva lo escrito | Spec del modelo con casos a mano; E2E |
| Lenguaje, acceso y tipo | `all` deja pasar todo. El lenguaje deja pasar al recurso que lo lista o que lista `both`. El acceso y el tipo son igualdad. Los cinco criterios se combinan con «y» | Spec del modelo; E2E |
| Solo favoritos | Deja pasar sólo los ids que están en `favorites` | Spec; E2E |
| Recuento | «N de M recursos · abrí cada uno a tu ritmo», en un párrafo `role=status` con `aria-live=polite`; M es el total de la lista | E2E; spec |
| Vacío | Título «Ningún recurso con esos filtros.», el texto «Probá otro término o volvé a ver la biblioteca completa.» y el botón «Limpiar filtros», que restablece los cinco criterios y deja el foco en la búsqueda | E2E; spec |
| Tarjeta | Píldora de lenguaje («Rust», «Go» o «Go + Rust» si es `both`), de acceso («Gratis» o «Gratis + pago») y, si es destacado, «Elegido para vos»; estrella con `aria-pressed` y nombre «Guardar en favoritos: título» o «Quitar de favoritos: título» (☆ o ★); título en `h2`; formato; descripción; «Para vos:» más el motivo; «Antes de empezar» con la advertencia; enlace «Explorar recurso ↗» con la URL del recurso, `target="_blank"` y `rel="noopener noreferrer"`, y un `<span class="sr-only">` vacío | E2E; spec; comparación única |
| Favoritos | Un clic agrega el id al final de `favorites` o lo quita, y guarda en el acto, sin debounce: una escritura por clic en `taller-learning-v1`. El pie del menú se actualiza como hoy | E2E (`watchWrites`, recarga, escritura bloqueada); spec con un almacén en memoria |
| Memoria | Un solo conjunto de filtros (no uno por idioma): sobrevive a la navegación por hash, al cambio de idioma y a la importación y «Borrar todo», que hoy no lo reinician; se pierde al recargar | E2E; spec |
| Foco y teclado | Controles nativos, sin manejadores de teclado ni `tabindex`. Después de alternar un favorito, el foco sigue en esa estrella si su tarjeta sigue visible, sin desplazar la página; después de «Limpiar filtros», va a la búsqueda | E2E; spec |
| Aspecto | Las mismas clases (`filter-bar`, `search-wrap`, `filter-secondary`, `filter-chips`, `filter-chip`, `favorite-filter`, `resource-results-label`, `resource-grid`, `resource-card`, `resource-top`, `resource-tags`, `pill`, `favorite-button`, `resource-format`, `resource-fit`, `resource-link`, `resource-notice`, `empty-state`, `page-heading`) y los mismos ids (`resource-search`, `filter-language`, `filter-cost`, `filter-favorites`, `resource-results-label`, `resource-grid`); sin `style=` | Comparación única; la protección de F1 |
| URL | `#biblioteca` y nada más: la página no lee ni escribe la URL | La red de F1 |
| Progreso guardado | La clave `taller-learning-v1`, `version: 1`, la forma y el orden de `favorites`, las ranuras de respaldo y la exportación | Fixtures congeladas; E2E; specs |

**Ejemplos resueltos** (de los 15 recursos de hoy; son los valores a mano de las specs):

- Sin filtros: 15 de 15.
- «tour of»: 1 (A Tour of Go). «of tour»: 0. No se busca por palabras.
- «EJÉRCICIOS» y «ejercicios»: los mismos 7 (`rust-100`, `rust-rover`, `rustlings`, `rust-google`, `go-tour`, `go-exercism` y `gophercises`).
- «both»: 3 (`codecrafters`, `protohackers` y `context7`), porque la búsqueda mira también los identificadores de lenguaje. «gratis» y «mixto»: 0, porque no mira el acceso.
- Lenguaje Rust: 9 (6 de Rust y los 3 de `both`). Go: 9. Acceso «Acceso gratuito»: 11. «Gratis + pago»: 4.
- Tipo Ejercicios: 6. Proyectos: 3. Lectura: 5. Herramientas: 1.
- Go y «Gratis + pago»: 3 (`codecrafters`, `boot-dev` y `context7`).
- Solo favoritos con `rust-100` guardado: 1; sin favoritos: 0.

## Qué se retira del legacy y qué adaptador queda

Las rutas de `frontend/app.js` y de `frontend/src/app/` son las de `f2a/base`.

| Pieza | Hoy | Tras F3 | La retira |
| --- | --- | --- | --- |
| `renderLibrary`, `renderResourceResults` y `filters` | `app.js` | Se borran | F3 |
| Las siete ramas de los tres delegados de `#main`: `favorite`, `category` y `clear-filters` (click); `filter-language`, `filter-cost` y `filter-favorites` (change); `resource-search` (input) | `app.js` | Se borran en el mismo commit que monta la página, para no manejar un evento dos veces | F3 |
| `biblioteca: renderLibrary` en `renderers` y la llamada a `renderResourceResults()` en `render()` | `app.js` | `render()` desmonta la página antes de redibujar y la monta si la vista es la Biblioteca, como el Atlas | F3; F10 retira las llamadas |
| El import de `normalizeSearchText` | `app.js` | Se borra (sólo lo usaba el filtro); la función compartida sigue en `shared/lib` para el Atlas, el laboratorio y Sistemas | F3 |
| `data-action`, `data-id` y `data-category` de la página | Los usan sólo esas ramas | No se llevan al marcado nuevo | F3 |
| `window.TallerLibrary` con `mount` y `unmount` | No existe | **El adaptador mínimo.** Lo publica `frontend/src/app/legacy/register-library.tsx` (nombre provisional), con la sesión de filtros en memoria; se evalúa antes de `app.js` | F10 |
| `data.resources` en `syncShell` (el contador `#resource-count`) y en la lección (los enlaces de cada paso) | `app.js` | Queda: las usan el menú y la lección, no la Biblioteca | F10 (el menú) y F9 (la lección) |
| `[data-view="biblioteca"]`, `#resource-count` y los enlaces `#biblioteca` de Recorrido y de Proyecto | `index.html` y las otras páginas | Quedan | F10, F9 y F4 |
| Las reglas de CSS de la página | `styles.css` | Quedan (Q2, opción A) | F10 |
| En `qa/`: los dos ids del arnés de `app-shell-check` (`resource-results-label` y `resource-grid`), los dos escenarios que usan la acción `favorite`, la entrada de la Biblioteca en el recorrido de `boot-check` y las listas de `app-adapters` y de `load-order-check` | Atan a `qa/` al legacy | Se adaptan, con su correspondencia (FR-035) | F3 |

## Cómo se demuestra que nada cambió

| Capa | Qué fija | Cuándo | Cambia con el port |
| --- | --- | --- | --- |
| La red de F1 y los 17 E2E de A2 | La Biblioteca ya está en `views`, `reload`, `url-contract` y `startup-storage` y, con R4 y R5, en `css-contract` | Antes y después | No se edita |
| E2E de la Biblioteca, con su Page Object | Los 11 flujos de FR-031 | Contra el legacy antes del corte y contra el port después | No se editan |
| Specs de Vitest en `node` | El filtro, los favoritos y la sesión | Con el port | Nuevas |
| Specs de Vitest en `jsdom` con Testing Library | La página: lo que se ve, lo que se escribe en el almacén y el foco | Con el port | Nuevas |
| Comparación única, legacy contra port | El DOM de `#main` normalizado, el estilo computado a 981, 850, 650 y 590 px y el árbol de accesibilidad, sobre un conjunto fijo de estados | Una vez, en el PR | No queda como check |
| Roturas deliberadas | Que cada protección nueva falle en la spec prevista | Una vez, en el PR | No quedan |
| Los checks de `qa/` | Los escenarios de `boot-check` y `app-shell-check` que tocan la Biblioteca, con su correspondencia | `npm test` | Se adaptan |
| El dist | Los bytes de la tabla siguiente | En la compuerta | Ver la tabla |

## Qué cambia en `dist/index.html` y por qué

La base es la de F2b después de A2: el contenido viaja en su archivo, el HTML lleva un `<script type="module">` y un `<style>` en línea, y `qa/build-check.ts` fija el tope del HTML. La hoja de ruta todavía dice 2 500 000 caracteres: A2 lo bajó a 1 250 000 (`BOOT_SIZE_LIMIT`, en `f2a/base`). Los hashes de la línea base se toman sobre la base de F3 antes del primer cambio; esta spec no los fija.

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| `frontend/src/index.html` y el marcado del dist con los scripts y el estilo vaciados | No | F3 no edita el shell: el menú, `#resource-count` y los diálogos quedan |
| `build/curriculum.json`, su copia servida en `dist/content/` y el volcado de `dump-globals` | No | F3 no toca `content/` ni el generador, y los adaptadores de catálogos y `atlas-catalog.ts` conservan su ruta |
| `dist-content-check` (los catálogos del dist contra `dump-globals`) | No | `GUIDE_DATA` sigue publicado: `app.js` lo lee |
| `<style>` del dist | No, con Q2 = A. Con B, el mismo conjunto de reglas en otro orden | A conserva `styles.css`; B las mueve |
| Script del dist | Sí | Sale `renderLibrary`, `renderResourceResults` y siete ramas; entran la página, su modelo, el adaptador y `useStore` (la parte de React de `zustand`, que ya es dependencia). Se informa la medida antes y después |
| Forma del dist | No | Un solo documento, un `<script type="module">`, un `<style>` y el contenido aparte, sin chunks externos. La lista de `legacy-views.ts` suma una entrada; la cantidad de `import()` e `import.meta` se mide y se informa, no se fija |
| Tamaño | Se informa | Bajo el tope vigente de `build-check`. Con F2b suma a lo sumo 8 000 caracteres |
| `package.json` y el lockfile | Sí | Sólo `devDependencies` (jsdom, Testing Library y, si entra, fishery): ninguna es alcanzable desde `main.tsx` |

## Integración con F2b y con los otros ports

F3, F4 y F9 salen de la misma base (`master` con F2a y A2) y se integran de a uno, en el orden en que quedan listos: el que llega después rebasa y repite la compuerta. F3 no depende de F2b: si F2b llega antes, F3 rebasa; si llega después, F2b rebasa. F2b edita otras regiones de `app.js`.

| Archivo | Quién más lo toca | Qué hace F3 | Cómo se resuelve |
| --- | --- | --- | --- |
| `frontend/app.js` | F2b, según su plan (la unidad 5 usa la gramática de URL; la 6, el bloque de respaldo, exportar, importar y «Borrar todo»); F4 (`renderProject`, `milestones` y la rama `data-milestone`); F9 (`renderRoute`, el temporizador, la lección y sus ramas) | Quita lo de la tabla anterior; en `render()` suma el desmontaje y el montaje | Los hunks son disjuntos salvo `render()` y los tres delegados, donde los tres ports tocan líneas vecinas: rebase y compuerta de nuevo |
| `frontend/src/app/boot/legacy-views.ts` (la lista de módulos, en `f2a/base`) | F4, F9 | Suma el adaptador antes de `app.js` | Una línea por port |
| `qa/load-order-check.ts` y `qa/lib/app-adapters.ts` | F4, F9 | Una fila para la Biblioteca | Líneas vecinas |
| `qa/lib/app-shell-harness.ts` y `qa/app-shell-check.ts` | F2b (unidad 6, dueño B: `asyncAdapters` y la correspondencia de sus escenarios); F4, F9 | Quita los dos ids y reorienta dos escenarios | El que llega después rebasa; F2b ya está en curso y es probable que llegue antes |
| `qa/boot-check.ts` | F4, F9 | La Biblioteca pasa a la rama de las vistas de React | Líneas vecinas |
| `qa/e2e/fixtures/index.ts` y `qa/e2e/pages/` | F4, F9 y los ports siguientes | Suma el Page Object y su fixture | Una entrada por port |
| `package.json`, el lockfile, `frontend/vitest.config.ts` y `eslint.config.ts` | F4 y F9, si traen specs de componentes | jsdom, Testing Library, (fishery), los dos proyectos, el setup y la guarda de `useStore` | Los integra el agente principal. F3 es el dueño del arnés: el primer port que se integra lo trae, y los otros lo toman |
| `frontend/styles.css` | F2b (unidad 8, al final del archivo); F4, F9 | Nada, con Q2 = A | Sin conflicto |
| `docs/architecture.md`, `qa/AGENTS.md`, `docs/agent-skills.md` y el ADR 0008 (una enmienda) | Todos los ports | Lo de FR-040 | Los integra el agente principal |

**El pie de guardado es de todos los ports.** Hoy `save()` de `app.js` guarda y actualiza el pie del menú. Una página React que guarda por `routeStore.save()` no pasa por ahí, así que cada port que escriba el recorrido (F3, F4, F8 y F9) tiene el mismo problema. FR-014 lo resuelve una vez, en F3 o en el primer port que se integre, y los demás lo heredan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La alumna busca y filtra recursos como siempre (Priority: P1)

Una alumna abre la Biblioteca, escribe «tour of», elige Go y «Acceso gratuito», toca el tipo «Ejercicios» y la lista se acorta como hoy. El recuento lo dice y, si no queda nada, un botón le devuelve todo.

**Why this priority**: es la razón de la página y lo que más se usa. Si cambia, el alumno lo nota.

**Independent Test**: correr los E2E de búsqueda y de filtros contra el build portado y las specs del modelo con los ejemplos resueltos de arriba.

**Acceptance Scenarios**:

1. **Given** la Biblioteca recién abierta, **When** la alumna la mira, **Then** ve los 15 recursos en el orden del contenido (de «100 Exercises to Learn Rust» a «Go by Example»), «15 de 15 recursos · abrí cada uno a tu ritmo», «Todos» presionado, «Todos los lenguajes», «Cualquier acceso» y «Solo mis favoritos» sin marcar.
2. **Given** la Biblioteca abierta, **When** escribe «tour of», **Then** queda 1 recurso y el recuento dice «1 de 15 recursos · abrí cada uno a tu ritmo»; con «of tour» no queda ninguno y aparece «Ningún recurso con esos filtros.».
3. **Given** la Biblioteca abierta, **When** escribe «EJÉRCICIOS», **Then** quedan los mismos 7 recursos que con «ejercicios».
4. **Given** la Biblioteca abierta, **When** elige Rust, **Then** quedan 9 (los 6 de Rust y los 3 que sirven para los dos), y con Go también 9.
5. **Given** la Biblioteca abierta, **When** busca «both», **Then** quedan 3, porque la búsqueda mira también los identificadores de lenguaje (comportamiento de hoy, que se conserva); y con «gratis» no queda ninguno, porque no mira el acceso.
6. **Given** una combinación sin resultados (por ejemplo, el texto «zzz»), **When** activa «Limpiar filtros», **Then** vuelven los 15, los cinco criterios quedan en su estado inicial y el foco queda en la búsqueda.

### User Story 2 - Guarda favoritos y los encuentra al volver (Priority: P1)

La alumna marca la estrella de un recurso y lo encuentra marcado cuando vuelve, aunque recargue o pase por otras vistas. Lo que marca en la Biblioteca y lo que guarda en el resto del taller es un solo progreso.

**Why this priority**: el favorito es lo único que la Biblioteca escribe, y es el riesgo alto del mapa (§12): una segunda copia del progreso hace reaparecer lo que el alumno quitó.

**Independent Test**: sembrar las fixtures congeladas, alternar favoritos, guardar desde otra vista y recargar, con `watchWrites`; y las specs de la página sobre un almacén abierto en memoria.

**Acceptance Scenarios**:

1. **Given** la Biblioteca sin favoritos, **When** toca la estrella de «A Tour of Go», **Then** la estrella pasa a ★ con el nombre «Quitar de favoritos: A Tour of Go» y `aria-pressed` verdadero, el foco sigue en esa estrella, y `go-tour` queda al final de `favorites` en `taller-learning-v1` con una sola escritura.
2. **Given** un favorito guardado, **When** recarga o va a otra vista y vuelve, **Then** sigue marcado; con «Solo mis favoritos» ve sólo sus favoritos.
3. **Given** «Solo mis favoritos» activado y un favorito marcado, **When** lo quita, **Then** su tarjeta desaparece, el recuento baja y el foco cae al documento, como hoy.
4. **Given** que quitó un favorito, **When** marca un paso en «Mi recorrido» y recarga, **Then** el favorito sigue quitado.
5. **Given** un almacenamiento que lee pero no escribe, **When** toca una estrella, **Then** la estrella cambia en memoria y el pie del menú pasa a «Exportá para conservar tu avance».

### User Story 3 - Nada cambia fuera de la página (Priority: P1)

Un alumno con progreso guardado recorre el taller después del port y encuentra lo mismo: las ocho vistas, los enlaces, las recargas, su avance y el aspecto de siempre.

**Why this priority**: es el criterio de todo port (hoja de ruta, «Criterios de aceptación globales»).

**Independent Test**: construir el build portado, correr la red de F1 y los 17 de A2, la comparación única y los hashes del dist.

**Acceptance Scenarios**:

1. **Given** las fixtures congeladas, **When** abre las ocho vistas, la Biblioteca incluida, **Then** hay 0 escrituras, 0 respaldos y 0 avisos, y el pie dice «Guardado en este navegador».
2. **Given** `/?basura=1#biblioteca`, **When** cambia el idioma, **Then** la query se borra en el lugar, sin recargar, y la Biblioteca sigue ahí.
3. **Given** el build portado, **When** corre la red de F1 y los 17 de A2, **Then** pasan sin editarse, incluidas las pruebas de `css-contract` que miran la Biblioteca (R4 y R5).
4. **Given** el legacy y el port, **When** se comparan sobre el mismo conjunto de estados y a los cuatro anchos, **Then** no hay diferencias fuera de la lista aceptada.

### User Story 4 - Los filtros se quedan mientras recorre el taller y se van al recargar (Priority: P2)

La alumna filtra, pasa por otra vista o cambia de idioma, vuelve y encuentra sus filtros como los dejó. Si recarga, empieza de cero.

**Why this priority**: la raíz de React se destruye y se vuelve a crear en cada redibujo de `app.js`, así que sin una sesión fuera de la raíz el port perdería los filtros: es una diferencia visible. Es P2 porque no toca el progreso.

**Independent Test**: un E2E de navegación y de cambio de idioma con filtros puestos, y la spec del adaptador con dos montajes.

**Acceptance Scenarios**:

1. **Given** filtros elegidos, **When** va a otra vista por el menú y vuelve, **Then** los filtros siguen como los dejó.
2. **Given** filtros elegidos, **When** cambia el idioma estando en la Biblioteca, **Then** la página se vuelve a dibujar con los mismos filtros y los mismos favoritos.
3. **Given** un progreso reiniciado desde Método, **When** vuelve a la Biblioteca, **Then** no hay favoritos y los filtros siguen como estaban.
4. **Given** filtros elegidos, **When** recarga la página, **Then** los filtros vuelven a su estado inicial, y la URL fue `#biblioteca` todo el tiempo.

### User Story 5 - Quien porta F4 y F9 hereda un patrón probado (Priority: P2)

Quien porta Proyecto o Recorrido encuentra un arnés de componentes que corre, un adaptador para copiar, una forma probada de leer y escribir el recorrido desde React y una guarda que le impide el error que compila.

**Why this priority**: F3 abre el camino de los demás ports. Es P2 porque no cambia lo que ve el alumno.

**Independent Test**: correr `npm run test:unit` y el lint con la regla nueva, y un componente descartable con `useStore(store)` sin selector.

**Acceptance Scenarios**:

1. **Given** F3 integrada, **When** otro port suma una spec de componente, **Then** usa el proyecto `jsdom`, el setup y las consultas de Testing Library sin tocar archivos de la Biblioteca.
2. **Given** un componente que llama `useStore(store)` sin selector, **When** corre la guarda, **Then** falla.
3. **Given** una página que abre `taller-learning-v1` por su cuenta, **When** corre `seams-guard-check`, **Then** falla (lo hace F2a; F3 no lo relaja).

### Edge Cases

- **Consulta de sólo espacios:** no filtra, y el campo conserva los espacios.
- **Un recurso con más de un lenguaje explícito** (`rust` y `go`): la píldora los une con « + » en el orden del contenido. Hoy ninguno lo tiene.
- **Favoritos con ids que el contenido no tiene:** el almacén los descarta, respalda y avisa como hoy; la página sólo ve ids válidos.
- **Un favorito que el filtro oculta:** sigue guardado y reaparece al quitar el filtro.
- **Otra pestaña guarda entre dos clics:** la fusión es la de hoy (ADR 0003, decisión 9): une los conjuntos, así que un favorito que esta pestaña quitó vuelve si la otra lo tiene. La página lee de nuevo el estado después de cada guardado, porque `save()` puede reemplazarlo.
- **Almacenamiento bloqueado desde el inicio:** el aviso y el pie de hoy; los favoritos funcionan en memoria hasta recargar.
- **Cambio de idioma estando en la Biblioteca:** `render()` la desmonta y la monta; los filtros y los favoritos siguen.
- **«Borrar todo» o importar desde Método:** al volver, la Biblioteca muestra el progreso nuevo; los filtros no se reinician, como hoy.
- **Contenido sin recursos** (una versión futura del contenido): «0 de 0 recursos · abrí cada uno a tu ritmo» y el estado vacío, como hoy.
- **Un error al dibujar la página:** se informa por `console.error` con un mensaje en español y el resto de la app sigue, como el Atlas.
- **Movimiento reducido, diseño móvil, impresión y teclado:** no cambian: las reglas de CSS no se tocan (Q2) y los controles son nativos.
- **El contenido llega de otro lado** (A3, las 17 porciones): la página no se entera, porque recibe la lista por props.

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de todo port** *(de la hoja de ruta; las repiten F4 y F9)*

- **FR-001**: El port DEBE entregarse como un cambio revertible entero que devuelve la Biblioteca legacy, en este orden de unidades: (1) el Page Object y los E2E, en verde contra el legacy; (2) el arnés de componentes, el modelo y la página con sus specs, sin montar; (3) el corte, en un solo commit: el adaptador, el montaje desde `app.js`, el retiro de las siete ramas de los delegados y las adaptaciones de `qa/`; (4) la documentación. Revertir la (3) devuelve el legacy con la (1) y la (2) sin efecto. El plan decide cuántos PR son y si el arnés va en el suyo para que F4 y F9 lo tomen. Cada comportamiento empieza con una spec que falla por la razón esperada, y se implementa lo mínimo. *(Hoja de ruta, «Convenciones»; constitución, principio II)*
- **FR-002**: La red de F1 (106 E2E) y los 17 de A2 DEBEN pasar antes de empezar y después del corte, contra el build de cada momento y sin editar ninguno. Editar uno es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. *(Hoja de ruta, criterios globales)*
- **FR-003**: Los E2E de la Biblioteca DEBEN escribirse contra el build del legacy, estar en verde antes del corte y pasar sin editarse después. No fijan ninguna diferencia aceptada (FR-022 y FR-036). *(Clarify de F1, Q1; ADR 0008)*
- **FR-004**: El progreso guardado DEBE quedar intacto (ADR 0003): la clave `taller-learning-v1`, `version: 1`, la forma y el orden de `favorites`, las ranuras de respaldo y la exportación no cambian, y F3 no abre otra clave. Con las tres fixtures congeladas de `qa/fixtures/progress-*.json`, el arranque no escribe, no respalda ni avisa, y abrir la Biblioteca tampoco; `curriculum-ids-check` sigue en verde.

**La página y su contenido**

- **FR-005**: El alumno NO DEBE ver nada distinto: la página DEBE conservar todo lo de «Qué se conserva», con los textos, el orden y las condiciones de hoy. Las únicas diferencias son las aceptadas (FR-022 y la lista de FR-036).
- **FR-006**: La página NO DEBE leer ni escribir la URL: `#biblioteca` sigue siendo su única forma, sin query ni estado propio. Las ocho vistas por hash y las seis formas con query llevan adonde llevaban.
- **FR-007**: La página DEBE recibir la lista de recursos por props desde su adaptador, que la lee de `getContent().guide.resources` al montar. La página, su modelo y sus specs NO DEBEN importar `getContent()` ni `app/content`, ni `build/curriculum.json`, ni leer `window.GUIDE_DATA`. *(A2, F2-I6; la regla R5 del guard de F2b lo vigila)*
- **FR-008**: La página DEBE mostrar los recursos en el orden recibido y contar el total sobre la lista recibida: ningún 15 ni orden propio en el código.

**Favoritos y almacén**

- **FR-009**: La página DEBE leer y escribir los favoritos por el singleton `routeStore` de `entities/guide`, sin abrir otra instancia ni otra clave ni tocar `localStorage`. El adaptador NO DEBE importarlo (R4 de `seams-guard-check` lo prohíbe entre `frontend/*.js` y `frontend/src/app/`): lo importa la página, y el guard (R1 a R4) sigue en verde. Además, un singleton con estado NO DEBE existir dos veces en un mismo contexto (FR-018 de F2): `app.js` ya lo importa y la página lo suma por otro camino, así que todo check que evalúe `app.js` y el adaptador a la vez ve una sola instancia. R4 mira texto y no lo prueba: lo prueba montar la Biblioteca en `boot-check` (el bundle de `main.tsx`) sin el error «Abrí el almacén del recorrido antes de usarlo.», que una segunda instancia sin abrir lanzaría, y lo mismo en cualquier otro check que evalúe el script del dist.
- **FR-010**: La página DEBE leer la revisión con `useStore(routeStore.changes, (state) => state.revision)` y los favoritos con `routeStore.getProgress().favorites` en cada render. NO DEBE guardar una copia (ni en `useState` ni en un `useRef`), ni memoizar con el arreglo vivo como clave, ni pasárselo a un componente memoizado: lo derivado se calcula en el render o se memoiza con la revisión como clave, de modo que la revisión se usa y no sólo se lee. El motivo es que el recorrido se muta en el lugar y `save()` puede reemplazarlo al fusionarse con otra pestaña. *(F2a, «Qué entrega a un consumidor»)*
- **FR-011**: Ningún componente DEBE llamar `useStore(store)` sin selector: suscribe al store completo, la documentación de Zustand declara el selector como opcional y por eso compila. Una guarda automática lo impide: una regla de `no-restricted-syntax` de ESLint sobre `useStore` con menos de dos argumentos o, si el plan la descarta, una spec y la revisión explícita. F3 es la primera en importar `useStore` y fija la regla para F4 y F9. *(F2a, riesgo 12; `AGENTS.md`)*
- **FR-012**: Alternar un favorito DEBE agregar el id al final de `favorites` o quitarlo, y guardar en el acto con `routeStore.save()`: una escritura por clic, sin debounce y en el mismo formato. La estrella cambia su `aria-pressed`, su nombre accesible y su glifo una sola vez por clic.
- **FR-013**: Un clic NO DEBE alternar dos veces: no puede quedar ninguna rama de los delegados de `app.js` ni ningún `data-action` de la página (mapa, §3.1, «doble manejo»). Un favorito quitado en la Biblioteca DEBE seguir quitado después de que otra parte de la app guarde (marcar un paso) y de recargar, porque la página y el shell comparten una sola instancia (mapa, §12).
- **FR-014**: Después de cada guardado hecho desde la página, el pie del menú (`#save-label`) DEBE mostrar «Guardado en este navegador» o «Exportá para conservar tu avance» según `routeStore.storageAvailable()`, como hoy. Hoy lo actualiza `save()` de `app.js`, que el guardado de la página no pasa: el shell se suscribe a la revisión del recorrido (`routeStore.changes.subscribe`, la API de vanilla) y actualiza el pie. F4, F8 y F9 heredan esa suscripción. Con un almacenamiento que lee pero no escribe, la estrella cambia en memoria y el pie avisa; con el almacenamiento bloqueado, los favoritos viven en memoria hasta recargar.

**Búsqueda y filtros**

- **FR-015**: El filtro DEBE ser una función pura de los recursos, de los cinco criterios y de los favoritos, en `pages/library/model`, con las reglas de «Qué se conserva» y las de los ejemplos resueltos. NO DEBE reutilizar `filterConcepts` del Atlas, que parte la consulta en palabras: la de la Biblioteca es la consulta entera como subcadena, y la búsqueda sigue mirando los identificadores de lenguaje (`both` incluido), conocido y conservado. Usa `normalizeSearchText` de `shared/lib`.
- **FR-016**: El recuento DEBE ser un párrafo `role=status` con `aria-live=polite` que sigue montado mientras cambian los filtros, con el texto «N de M recursos · abrí cada uno a tu ritmo».
- **FR-017**: El estado vacío y «Limpiar filtros» DEBEN conservar sus textos; el botón restablece los cinco criterios y deja el foco en la búsqueda.
- **FR-018**: Los controles DEBEN seguir siendo nativos (búsqueda, dos selectores, cinco botones con `aria-pressed`, una casilla y las estrellas): sin `tabindex`, sin manejadores de teclado nuevos y con la tabulación de hoy. La búsqueda y el filtro corren por cada tecla, sin debounce, y la página tiene exactamente un campo de búsqueda.
- **FR-019**: Después de alternar un favorito, el foco DEBE quedar en la estrella de esa tarjeta si sigue visible, sin desplazar la página; si desaparece (con «Solo mis favoritos»), el foco cae como hoy. Ningún otro cambio programático de foco.
- **FR-020**: Cada enlace «Explorar recurso» DEBE conservar su `<span class="sr-only">` vacío: la prueba R5 de `css-contract` de F1 lo toma como el único `.sr-only` de la vista, y R4 usa el campo de búsqueda, un selector y un `summary` de la Biblioteca. Vaciarlo o llenarlo es otro cambio, con su propio commit y la aprobación del usuario; el hallazgo se informa a F4, F9 y F10, que heredan R5.
- **FR-021**: Los filtros DEBEN vivir en una sesión de módulo fuera de la raíz de React, un solo conjunto (no uno por idioma): sobrevive a la navegación por hash, al cambio de idioma y a «Borrar todo» e importar, y se pierde al recargar. NO DEBEN escribirse en la URL ni en el almacenamiento. [NEEDS CLARIFICATION: Q1, ¿en memoria, como hoy, o en la URL con nuqs?]
- **FR-022**: Las tarjetas que siguen visibles después de un cambio de filtros o de favoritos DEBEN conservar su estado (el detalle «Antes de empezar» abierto sigue abierto). [NEEDS CLARIFICATION: Q3, ¿se acepta que el detalle abierto siga abierto, o se reconstruyen las tarjetas como hoy?]

**Marcado y aspecto**

- **FR-023**: El marcado DEBE conservar los elementos, ids, clases, textos, roles, nombres accesibles y estados de «Qué se conserva». Se retiran sólo `data-action`, `data-id` y `data-category`, que existían para el delegado. La página NO DEBE sumar ningún estilo en línea (`style=`, `setAttribute('style', …)` ni `style.cssText`: C4 cuenta seis).
- **FR-024**: Cada componente DEBE tener una responsabilidad y respetar Feature-Sliced Design: la página en `pages/library` con una API pública pequeña (la página y la creación de la sesión), que sólo importa de capas inferiores (`entities/guide` y `shared`), sin barrels ni capas por anticipado. Un componente por archivo, con `export default` al final; el modelo, con exports nombrados. *(`AGENTS.md`; `docs/architecture.md`)*
- **FR-025**: `useEffect` NO DEBE usarse para derivar datos ni para copiar el estado del almacén: se reserva para sincronizar con sistemas externos, con su limpieza. El foco se maneja con refs; `flushSync` sólo si el plan demuestra que hace falta. *(Hoja de ruta, reglas de todo port)*
- **FR-026**: Las reglas de CSS de la Biblioteca DEBEN quedar donde están y el `<style>` del dist idéntico. [NEEDS CLARIFICATION: Q2, ¿quedan en `styles.css` hasta F10 o pasan a una hoja de la página?] La protección de F1 (estilo computado a 981, 850, 650 y 590 px, `touch-action` y `.sr-only`) pasa sin editarse; el diseño móvil y el movimiento reducido siguen siendo los de las reglas globales de `styles.css`, sin una librería de animación.

**Retiro del legacy y adaptador**

- **FR-027**: En el mismo commit que monta la página, `app.js` DEBE perder `filters`, `renderLibrary`, `renderResourceResults`, la entrada `biblioteca` de `renderers`, la llamada de `render()`, las siete ramas de los tres delegados (los tres clics, los tres `change` y el `input` de «Qué se retira del legacy») y el import de `normalizeSearchText`. NO DEBE quitar lo que otras páginas usan (`data.resources` del contador del menú y de la lección, los enlaces `#biblioteca`).
- **FR-028**: `window.TallerLibrary` DEBE publicar sólo `mount` y `unmount`, congelados, desde `frontend/src/app/legacy/`: `render()` los llama como al Atlas (desmonta antes de redibujar y monta si la vista es la Biblioteca). `legacy-views.ts` lo evalúa antes de `app.js`, `qa/lib/app-adapters.ts` lo exige y `load-order-check` suma su restricción. El adaptador guarda la sesión de filtros y se la pasa a la página, sin importar valores de `entities/guide`. F10 lo retira junto con los demás.
- **FR-029**: Un error al dibujar la página DEBE informarse por `console.error` con un mensaje en español y no dejar la app inutilizable (`onUncaughtError`, como el Atlas).

**Pruebas**

- **FR-030**: El modelo DEBE tener su spec de Vitest en `node`, con los valores de los ejemplos resueltos escritos a mano: cada criterio solo y combinado (con el lenguaje `both`), la búsqueda por subcadena entera («tour of» sí, «of tour» no), sin tildes ni mayúsculas, recortada y de sólo espacios, que mira los identificadores de lenguaje y no mira el acceso, el tipo ni la advertencia, que alternar agrega al final o quita, y las operaciones de la sesión (incluido restablecerla). El valor esperado nunca sale del modelo ni de una factory.
- **FR-031**: Los E2E de la Biblioteca DEBEN ser un Page Object (`LibraryPage`, con su fixture), una spec y estos 11 flujos, con localizadores por rol y nombre accesible y las aserciones en la spec: (a) la apertura, con los 15 en orden y los controles en su estado inicial; (b) la búsqueda con los ejemplos resueltos; (c) lenguaje, acceso y tipo, solos y combinados; (d) el vacío y «Limpiar filtros» con el foco; (e) un favorito: estrella, `aria-pressed`, nombre, una escritura por clic y recarga; (f) «Solo mis favoritos», los favoritos de las fixtures congeladas y el foco que cae al documento cuando la tarjeta desaparece (una prueba `KNOWN DEFECT`); (g) el favorito quitado que no reaparece cuando otra parte guarda y tras recargar; (h) el almacenamiento que lee y no escribe, y el pie; (i) la memoria: los filtros sobreviven al menú y al cambio de idioma y se pierden al recargar; (j) el teclado: tabulación y activación de chips, estrellas y casilla; (k) la tarjeta: «Antes de empezar» y el enlace (`href`, `target`, `rel`). El Page Object nuevo y el modo «lee y no escribe» de `StorageControl` van con los de F1. Los datos se siembran con las fixtures congeladas o con factories tipadas por el formato v1 guardado, no por los tipos del código.
- **FR-032**: La página DEBE tener su spec de Vitest en `jsdom` con Testing Library, con consultas por rol y nombre, `userEvent.setup()` antes de cada `render` y `await` en cada interacción, y el almacén abierto sobre un `StorageLike` en memoria (la spec nunca toca el `localStorage` de jsdom). Cubre: la lista y el total; escribir, elegir y activar; alternar un favorito (una escritura, `aria-pressed`, nombre); que la página muestra lo que guarda otro consumidor y lo que dejan `reset()` o una importación, sin conservar una copia; que los filtros no se reinician cuando cambia el progreso; que el recuento sigue siendo el mismo nodo; el foco tras «Limpiar filtros»; y que la sesión se entrega a quien monta y se retoma con ella. Lo que jsdom no cubre (foco real de teclado, el desplegable y el diseño) lo cubre el E2E. Los stubs se escriben cuando una spec los necesita.
- **FR-033**: El arnés de componentes DEBE ser el del ADR 0008: dos proyectos de Vitest (`*.spec.ts` en `node`, `*.spec.tsx` en `jsdom`), un setup dentro de `frontend/src/` que llama `cleanup()` después de cada test y suma los matchers de jest-dom, sin `globals`. Las versiones son exactas y el lockfile queda sincronizado; todo va en `devDependencies` y nada es alcanzable desde `main.tsx`. Los pasos de instalación y la enmienda del ADR 0008 (los `projects` y el setup que F1 dejó para F3) los hace el plan.
- **FR-034**: fishery DEBE entrar sólo si el plan encuentra que una factory de `GuideResource` gana su lugar (la usarían la spec del modelo y la de la página); si entra, la factory vive junto a lo que modela, como `*.factory.ts`, y no se exporta por la API pública del slice. Si no entra, los recursos de las specs son literales mínimos y fishery espera a otro port. *(ADR 0008, §2; Assumptions)*
- **FR-035**: Cada check de `qa/` que F3 adapta (`boot-check`, `app-shell-check` y `load-order-check`, más la lista de `qa/lib/app-adapters.ts`) DEBE cambiar sólo cómo carga el código o qué lista, no sus valores esperados. La Biblioteca pasa en `boot-check` de `innerHTML` a nodos de React, con el mismo texto esperado («RECURSOS CON INTENCIÓN»), si el DOM falso alcanza para montarla (ya soporta `select`, `checked` y `focus`); si no, sale de ese recorrido con su motivo escrito, porque `views.spec` la cubre. Esa salida no se puede usar para esconder una falla de FR-009 (una segunda instancia del almacén). Los dos escenarios de `app-shell-check` que usan la acción `favorite` («almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar» y «almacén: un cambio de otra pestaña se fusiona…») DEBEN reorientarse a otra acción o pasar a una spec del almacén, con los mismos valores esperados. El PR lista la correspondencia de cada escenario (cubierto por una spec o un E2E, o descartado con su motivo) y no retira ningún check por adelantado. *(ADR 0008, §5)*
- **FR-036**: Una comparación única entre el build del legacy (el commit base) y el del port DEBE cubrir un conjunto fijo de estados (el inicial; una búsqueda; con lenguaje, con acceso y con cada tipo; «Solo mis favoritos» con y sin favoritos; un vacío; un favorito marcado) a 981, 850, 650 y 590 px. Compara el DOM de `#main` normalizado (etiqueta, tokens de clase, texto, `aria-*`, `role`, `href`, `target`, `rel`, `placeholder`, y `checked` y `selected` como propiedades; espacios colapsados; los ids se comparan, los `data-*` retirados no), el estilo computado y el árbol de accesibilidad. Informa estados, elementos y propiedades comparados. Las diferencias aceptadas son: los `data-action`, `data-id` y `data-category` retirados; el espacio final de `class="pill "`; lo de Q3; el recuento montado en lugar de recreado; y el primer dibujo un turno de React después. No queda como check permanente. *(Precedente: FR-011 de F2)*
- **FR-037**: Cada protección nueva DEBE tener una rotura deliberada, en una copia descartable y sin commitear, que falle en la spec prevista: volver a una rama de un delegado (el favorito se alterna dos veces), abrir `taller-learning-v1` desde la página, llamar `useStore` sin selector, guardar una copia de los favoritos, reemplazar la búsqueda por la del Atlas, perder la sesión de filtros, no actualizar el pie, y quitar la `.sr-only` o duplicar el campo de búsqueda. Se informan cuántas se probaron y que fallaron donde debían.

**Dist, calidad e integración**

- **FR-038**: `dist/index.html` DEBE conservar la forma de A2 y quedar bajo el tope vigente de `qa/build-check.ts`; los bytes de «Qué cambia en `dist/index.html` y por qué» que no cambian DEBEN tener el mismo hash que en la línea base de F3, tomada antes del primer cambio. F3 NO DEBE agregar ninguna dependencia de ejecución: lo único nuevo en el modo de carga es la entrada del adaptador en la lista de `legacy-views.ts`, que sigue la forma de A2.
- **FR-039**: El código nuevo NO DEBE sumar funciones de complejidad ciclomática mayor que 10 sin justificarlo en la revisión. El aviso del predicado de `renderResourceResults` (11) desaparece con él y los de `app.js` no suben; la medición, antes y después, va en el PR.
- **FR-040**: La documentación DEBE cambiar en el mismo cambio: `docs/architecture.md` (la fila de la Biblioteca y el «Estado actual» de Feature-Sliced Design), `qa/AGENTS.md` (la pila de DOM deja de «llegar con la primera spec de componente», los dos proyectos y la fila de «Recorrido, biblioteca o respaldo global»), `docs/agent-skills.md` (su «Alcance») y una enmienda del ADR 0008 con lo que F3 mida. La hoja de ruta la integra el coordinador.
- **FR-041**: El shell y los archivos compartidos DEBEN integrarse como dice «Integración con F2b y con los otros ports»: de a uno, el que llega después rebasa y repite la compuerta, y el agente principal integra `package.json`, las configuraciones, `eslint.config.ts` y la documentación.

### Key Entities *(include if feature involves data)*

- **Recurso:** una entrada de la biblioteca, de `content/guide/`. Tiene `id` (inmutable: indexa los favoritos), `title`, `url`, `languages` (`rust`, `go` o `both`), `category` (lo que la interfaz llama «tipo»: ejercicios, lectura, proyectos o herramientas), `cost` (lo que la interfaz llama «acceso»: `gratis` o `mixto`), `format`, `description`, `why` («Para vos»), `caveat` («Antes de empezar») y `featured` («Elegido para vos»).
- **Favorito:** un id de recurso dentro de `favorites`, en el progreso del recorrido (`taller-learning-v1`). Es global: no depende del idioma del menú.
- **Filtros:** la búsqueda, el lenguaje, el acceso, el tipo y «Solo mis favoritos». No se guardan.
- **Sesión de filtros:** los filtros de un documento, en memoria de módulo y fuera de la raíz de React, que el adaptador le pasa a la página en cada montaje.
- **Revisión del recorrido:** el contador local de cambios del almacén que expone `routeStore.changes`; sólo dice que algo cambió. No es el campo `version: 1` del formato guardado ni la revisión de la cuenta de D1.
- **Página de la Biblioteca:** el componente de `pages/library` que recibe los recursos y la sesión, y lee y escribe los favoritos por `routeStore`.
- **Adaptador de la Biblioteca (`window.TallerLibrary`):** `mount` y `unmount`, hasta F10.
- **Arnés de componentes:** jsdom, Testing Library, los dos proyectos de Vitest y su setup.
- **Comparación única:** la corrida, una vez, que compara el legacy con el port sobre los mismos estados.
- **Diferencias aceptadas:** la lista cerrada de FR-036; cualquier otra diferencia es un defecto del port.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el build portado, la red de F1 y los 17 E2E de A2 pasan 123 de 123, con 0 escenarios editados.
- **SC-002**: Los 11 flujos de FR-031 tienen cada uno al menos una prueba, y todas pasan contra el legacy antes del corte y contra el port después, con 0 editadas: 100 % en las dos corridas.
- **SC-003**: Las 3 fixtures de progreso arrancan con 0 escrituras, 0 claves `:respaldo` y 0 avisos con la Biblioteca abierta; cada clic en una estrella da 1 escritura en `taller-learning-v1`, y 0 favoritos quitados reaparecen tras guardar desde otra parte.
- **SC-004**: La comparación única da 0 diferencias fuera de la lista de FR-036, en al menos 12 estados a 4 anchos, y se informa cuántos estados, elementos y propiedades se compararon.
- **SC-005**: En `app.js` quedan 0 de las 2 funciones de la Biblioteca (`renderLibrary` y `renderResourceResults`), 0 de las 7 ramas de los delegados, 0 usos de `filters` y 0 ids de la Biblioteca fuera de la página.
- **SC-006**: `frontend/src/index.html`, el marcado del dist con los scripts y el estilo vaciados, `build/curriculum.json` con su copia servida y el volcado de `dump-globals` tienen 0 diferencias, y el `<style>` del dist también si Q2 es A; el HTML queda bajo el tope vigente de `build-check`, con su tamaño antes y después informado.
- **SC-007**: Cada uno de los 15 contratos de «Qué se conserva» tiene al menos una spec o un E2E que lo prueba, y cada rotura deliberada de FR-037 falla en la spec prevista: N de N.
- **SC-008**: El 100 % de los escenarios de `boot-check` y de `app-shell-check` que tocan la Biblioteca (3 al especificar) figura en la tabla de correspondencia, cubierto o descartado con su motivo.
- **SC-009**: 0 funciones nuevas con complejidad mayor que 10, y los avisos de `app.js` no suben.
- **SC-010**: 0 llamadas a `useStore` sin selector y 0 aperturas de `taller-learning-v1` fuera de `route-store.ts`, comprobadas por la guarda y por `seams-guard-check`.
- **SC-011**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, y la imagen web sigue construyendo.
- **SC-012**: El arnés de componentes (los dos proyectos de Vitest, el setup y la guarda de `useStore`) no vive en `pages/library/`: 0 archivos de la Biblioteca en `frontend/vitest.config.ts`, en el setup y en `eslint.config.ts`, para que F4 y F9 lo reutilicen sin tocar la página.

## Riesgos

1. **Doble manejo de eventos.** Si queda una rama de un delegado, o un `data-action` en el marcado, el favorito se alterna dos veces (el clic se anula) o `renderResourceResults()` pisa el DOM de React. *Mitigación:* FR-013, el corte en un solo commit (FR-001), el E2E de una escritura por clic y su rotura deliberada.
2. **Una segunda copia del progreso.** Una página que abre su propio almacén hace reaparecer el favorito que el alumno quitó (mapa, §12). *Mitigación:* FR-009 y el guard de F2a; el E2E del favorito que no reaparece.
3. **Lectura obsoleta.** El recorrido se muta en el lugar y `save()` puede reemplazar el estado al fusionarse con otra pestaña: una copia o un `useMemo` sobre el arreglo vivo muestran lo que ya no es. *Mitigación:* FR-010 y la spec que guarda desde otro consumidor.
4. **`useStore` sin selector** compila y suscribe al store completo. *Mitigación:* FR-011.
5. **El pie de guardado queda desactualizado.** Es un hallazgo de esta spec: ningún port anterior pasaba por `routeStore.save()` fuera de `app.js`. *Mitigación:* FR-014; se informa a F4, F8 y F9.
6. **La sesión se pierde al remontar.** La raíz se destruye en cada `render()` de `app.js`. *Mitigación:* FR-021 y el E2E de memoria.
7. **Copiar el filtro del Atlas.** Parte la consulta en palabras y cambiaría los resultados. *Mitigación:* FR-015 y los ejemplos «tour of» y «of tour».
8. **La red de F1 depende de la Biblioteca sin decirlo.** R4 usa su campo de búsqueda (en modo estricto, exactamente uno) y R5, su `.sr-only` vacío. *Mitigación:* FR-018, FR-020 y FR-002.
9. **`boot-check` sobre el DOM falso.** Un nodo de React no pasa por `innerHTML`, y el DOM falso puede no alcanzar. *Mitigación:* FR-035 con su salida.
10. **Los límites de jsdom** (ADR 0008): el foco real del teclado, el desplegable y el diseño no se prueban ahí. *Mitigación:* FR-032, que los reparte al E2E.
11. **Choques de integración** con F2b, F4 y F9 en `app.js` y en los archivos de `qa/`. *Mitigación:* «Integración con F2b y con los otros ports» y FR-041.
12. **El tamaño.** La página suma React, `useStore` y el modelo, y el legacy resta lo suyo. *Mitigación:* FR-038: se mide antes y después.
13. **Nada se ejecutó al especificar.** Sin npm, Docker ni navegador: los conteos (15 recursos, 123 E2E, 3 escenarios de `qa/`, las 7 ramas, unas 45 reglas de CSS) salen de leer el código y de correr el predicado legacy sobre `build/curriculum.json` de la copia principal, en modo de sólo lectura. *Mitigación:* el plan los vuelve a medir sobre la base.
14. **F10 y la sesión de módulo.** La sesión vive en el adaptador, que F10 retira. *Mitigación:* la página recibe la sesión por props, así que F10 decide dónde vive sin tocarla.

## Relación con otros ítems

| Ítem | Relación |
| --- | --- |
| F1 | Su red es la que protege este port: la Biblioteca está en `views`, `reload`, `url-contract`, `startup-storage` y `css-contract` (R4 y R5). F3 no la edita. Hallazgo para F1: R5 usa como único `.sr-only` el span vacío de la Biblioteca |
| F2a y A2 | Toma de F2a `routeStore` (la revisión con `useStore` y un selector chico, y el progreso con `getProgress()`) y los contratos de A2: `getContent()` sólo desde `app/` (F2-I6) y el arranque con `startApp()` (el almacén está abierto cuando se monta la página). Hereda el riesgo 12 de F2a |
| F2b | No es requisito. Edita otras regiones de `app.js`; su regla R5 vigila `getContent()` desde `pages/`; su unidad 8 no toca las reglas de la Biblioteca; la unidad 6 comparte `qa/lib/app-shell-harness.ts` y `app-shell-check.ts` |
| F4 y F9 | Heredan el arnés, el adaptador, la lectura con `useStore`, la guarda y la suscripción del pie, y sus PR no deberían tocar `pages/library/`. Comparten los archivos de «Integración». R5 de `css-contract` seguirá apoyándose en la Biblioteca |
| F8 | Hereda el pie de guardado. «Borrar todo» y la importación llaman a `routeStore` (F2a) y la Biblioteca los refleja por la revisión |
| F10 | Retira `window.TallerLibrary`, las llamadas de `render()`, el contador del menú y, según Q2, las reglas de CSS; decide dónde vive la sesión de filtros |
| A3 y A4 | A3 cambia de dónde viene el contenido: la página recibe la lista por props y no se entera. Ninguno toca la página |
| D1 | El cliente de D1c se monta sobre `routeStore.changes`: un favorito guardado desde la Biblioteca cambia la revisión como cualquier otro guardado. La Biblioteca no necesita cambios |
| C4 | F3 no suma ningún estilo en línea (FR-023) |
| E1 | Sumar recursos no cambia la página: el total sale de la lista. Los 15 literales del contador del menú son de E1 o de F10 |
| **Hoja de ruta (enmiendas que integra el coordinador)** | F3 pasa de «Pendiente» a «En especificación», con el enlace a esta spec. La decisión abierta de F3 se amplía de una pregunta a tres (Q1 a Q3). El criterio global del tamaño dice 2 500 000 caracteres: A2 lo dejó en 1 250 000. Si el usuario elige Q2 = A, la convención de «Qué borra un port» tiene que decir que los ports de `app.js` conservan sus reglas de CSS y que F10 las mueve |

## Assumptions

- F2a y A2 están en `master` antes de implementar F3 (PR #40). Esta spec describe el código de `f2a/base`, donde `app.js` es `startApp()`, `routeStore` es un singleton con `changes` y `getContent()` lee el contenido ya cargado. F2b no es requisito: si llega antes que F3, éste rebasa.
- Los 15 recursos y su orden son los de `content/guide/manifest.yaml`; los ejemplos resueltos salen de correr el predicado legacy sobre `build/curriculum.json` de la copia principal (del 2026-10-04) en modo de sólo lectura. Si el contenido cambia (E1), los valores de las specs cambian con él.
- Los 123 E2E son los 106 de F1 y los 17 de A2 que cuenta el coordinador. La Biblioteca es, hasta F10, una página que `app.js` monta por `window.TallerLibrary`.
- `useStore` es la de Zustand 5.0.15, que ya es dependencia: su selector es opcional y sin él suscribe al estado completo (documentación oficial de Zustand, consultada el 2026-10-07; Context7 no estaba disponible).
- Q3: con la opción A, el detalle abierto que sigue abierto es la única diferencia de comportamiento que el usuario acepta. El resto de la lista de FR-036 (los `data-*`, el recuento montado y el primer dibujo un turno después) sigue las reglas de la hoja de ruta, y la pérdida de foco al quitar un favorito con «Solo mis favoritos» es comportamiento de hoy que se conserva.
- fishery entra con una factory de `GuideResource` si el plan la encuentra útil, y el permiso sale de «Acciones del usuario». Si el usuario prefiere no estrenarla en F3, FR-034 ya lo prevé.
- El orden de las unidades de FR-001 es una propuesta: el plan lo confirma y decide cuántos PR hay.
- F3 no necesita un ADR nuevo: el ADR 0008 ya fija la pila de pruebas y F2a, la suscripción. Lo que F3 mida de la pila va en una enmienda del ADR 0008 (FR-040).
- Los nombres de módulos (`pages/library`, `register-library.tsx`, `LibraryPage`) son provisionales; la spec fija la capa, la responsabilidad y el contrato.
- Los mensajes que lee el alumno, y el nuevo `console.error`, van en español rioplatense con el voseo de hoy. El código y las pruebas, en inglés.
- Esta spec se escribió sin `npm`, sin Docker, sin navegador y sin descargas. Los tamaños y los conteos de rendimiento los mide el plan.
- La referencia de 52 requisitos es la de C3a, la mayor spec del épico. Ésta tiene 41 (FR-001 a FR-041), así que no se propone un corte; si el plan la crece, el corte natural es el de FR-001: (1) la red y el arnés, y (2) la página y el corte.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q3 están en sus preguntas.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde viven los filtros | En la URL con nuqs (Q1, B); en `localStorage` con una clave nueva o dentro del formato v1 | En memoria de módulo. `localStorage` cambia el contrato de progreso (ADR 0003) para algo que hoy se pierde a propósito y exige fusionarlo entre pestañas; la URL es la Q1 |
| Cómo llega el contenido a la página | La página llama `getContent()`; la página lee `window.GUIDE_DATA`; props desde el adaptador | Props desde el adaptador: F2-I6 prohíbe lo primero por debajo de `app`, y lo segundo ata la página a un global que A2 retira |
| Cómo llega el almacén a la página | El adaptador se lo pasa; la página importa el singleton | La página importa el singleton: R4 le prohíbe al adaptador importar valores de `entities/guide`, y la hoja de ruta dice que las páginas de F3 a F9 lo importan |
| Dónde vive la sesión | Un store de Zustand en la página; un contexto; la memoria del adaptador | La memoria del adaptador, como el Atlas: son cinco campos, no hay otro consumidor y F10 la mueve. Un store sería una dependencia más sobre un estado que no se comparte |
| Quién actualiza el pie de guardado | Un callback del adaptador hacia `app.js`; que la página escriba el DOM del shell; una suscripción del shell a la revisión | La suscripción del shell: usa lo que F2a dejó, no ata la página al shell y la heredan F4, F8 y F9 |
| La búsqueda | Por palabras, como el Atlas; la de hoy | La de hoy: es un port. Unificarlas es un cambio de comportamiento, con su propio commit y TDD si el usuario lo pide |
| Un hook compartido para leer el recorrido | Un `useRouteProgress` en `entities/guide`; dos líneas en cada página | Dos líneas: el hook sumaría React a la API pública de un slice que `app.js` y los checks de `qa/` importan, y hay un solo consumidor. F4 y F9 lo extraen si lo repiten |
| Un slice `features/favorites` | Favoritos como feature; dentro de la página | Dentro de la página: un solo consumidor y ninguna responsabilidad estable y reutilizada (`AGENTS.md`) |
| Las tarjetas | Reconstruidas en cada cambio, como hoy (Q3, B); con `key` por recurso | Con `key` (Q3, A) |
| Cuántos PR | Uno; una pila: la red del legacy, el arnés con la página sin montar y el corte | Lo decide el plan, con el corte como una sola unidad revertible (FR-001). Un PR propio para el arnés ayuda a F4 y F9 a empezar sin esperar a F3 |
| fishery o literales | fishery con una factory de `GuideResource`; recursos literales en cada spec | fishery si el plan la encuentra útil (FR-034): el ADR 0008 la eligió para las factories y F3 es el primer port con datos de contenido; es la decisión más reversible |
| Cómo se prueba que nada cambió | Sólo las specs y los E2E; además una comparación única | Las dos: los E2E y las specs fijan el contrato con valores a mano, y la comparación detecta lo que ninguna mira (una clase o un atributo de más o de menos, y el estilo computado) |

## Acciones del usuario y descargas

Las descargas las autoriza el usuario con nombre, origen y tamaño antes de bajarse. Las medidas son las del ADR 0008 (2026-10-05, por `npm view`, sin instalar); el plan las vuelve a medir.

| Acción | Cuándo | Detalle |
| --- | --- | --- |
| Responder Q1, Q2 y Q3 | Antes del plan | Cada una tiene una opción recomendada |
| Autorizar jsdom y Testing Library (la primera spec de componente es la de F3) | Antes de la tarea del arnés | `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1, del registro de npm: 56 paquetes, unos 26,3 MB desempaquetados y 5,0 MB comprimidos (estimación). Sólo `devDependencies`; las imágenes de Docker que corren `npm ci` también las instalan |
| Autorizar fishery, si el plan la usa | Antes de la tarea de la factory | `fishery` 2.4.0, del registro de npm: 2 paquetes, unos 0,19 MB desempaquetados y 0,04 MB comprimidos |
| Cualquier otra descarga | Siempre | Pide permiso con nombre, origen y tamaño |
