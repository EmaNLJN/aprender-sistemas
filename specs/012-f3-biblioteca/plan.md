# Implementation Plan: F3 · Biblioteca

**Branch**: `012-f3-biblioteca` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F3, con su clarify del 2026-10-28 (Q1 a Q3).
- **Decisiones y mediciones:** [research.md](./research.md).
- **Validación:** [quickstart.md](./quickstart.md).
- **Contrato de la forma de URL:** [contracts/library-url.md](./contracts/library-url.md).
- **Tareas:** [tasks.md](./tasks.md).
- **Modelos de forma:** el [plan de F2b](../009-f2-seams/plan-f2b.md) y el [de F2a](../009-f2-seams/plan.md).

**Objetivo:** portar la Biblioteca a una página de React montada por `window.TallerLibrary`, con los filtros en la URL por nuqs, el estado de las tarjetas y el foco que React conserva, y su CSS en su propia hoja, sin que el alumno note otro cambio.

**Arquitectura:**
- La página vive en `frontend/src/pages/library/`: un modelo puro (el filtro, las etiquetas y el destino del foco) y cuatro componentes.
- Lee los favoritos del singleton `routeStore`, con `useStore` y un selector chico, y escribe con `toggleItem` y `routeStore.save()`.
- Los filtros son la query de la URL (`useQueryStates`, con las claves de la gramática de F2b).
- Un adaptador de `app/legacy/` le pasa los recursos de `getContent()` y la envuelve en el `NuqsAdapter` compartido. `app.js` la monta y la desmonta como al Atlas.

**Stack:**
- Lo que ya está: React 19.2.8, TypeScript 6.0.2, Vite 8.3.2, zustand 5.0.15, Vitest 5.0.3 y Playwright 1.63.0.
- Lo que se suma: nuqs 2.10.2 (de ejecución), y jsdom 30.1.2, Testing Library y fishery 2.4.0 (de desarrollo).

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Reglas para todos los agentes», la sección 0 y la sección de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T023) y remite acá.
> - **Qué está decidido.** El clarify del 2026-10-28 (spec, `## Clarifications`) y las decisiones de este plan («Decisiones»). D1, la búsqueda de sólo espacios, espera al usuario. El plan sigue con la opción recomendada, y cambiarla toca una línea y dos casos de prueba.
> - **Código verificado.** Se planificó sin correr nada del repositorio y sin descargar paquetes. Lo único que corrió:
>   - `npm view`, pedidos de un byte para medir los tarballs y la documentación con Context7 y `WebFetch`;
>   - dos scripts de lectura en un directorio temporal, que recalcularon los ejemplos resueltos y listaron las reglas de CSS.
>
>   Ninguna prueba, ningún build y ningún tamaño del dist se midió: T001 y T002 los miden antes del primer cambio.

## Summary

F3 reemplaza `renderLibrary` y `renderResourceResults` de `frontend/app.js` por una página de React. Conserva lo que el alumno ve, hace y guarda, salvo los tres cambios del clarify: los filtros en la URL, el detalle abierto que sigue abierto y el foco que no cae al documento. El enfoque:

- **Un solo PR, en seis unidades revertibles** (FR-001):
  1. los E2E de lo que se conserva, en verde contra el legacy;
  2. el arnés de componentes, las piezas que comparten los ports, el modelo y la página sin montar;
  3. el corte, en un solo commit;
  4. los dos cambios a propósito que llegan después del corte: el foco y la URL;
  5. la mudanza del CSS;
  6. el cierre.

  Antes de la unidad 1 va la verificación corta de nuqs (riesgo 14), en una copia descartable.
- **Una sesión transitoria de filtros entre el corte y la URL** (research.md, R1). El corte deja verdes todos los E2E de la unidad 1, y el commit de la URL cambia una sola aserción, la de la recarga, con la aprobación del clarify.
- **La URL:**
  - el lenguaje viaja como `en`, porque `lenguaje` ya es de Sistemas y los enlaces del menú conservan la query (R2);
  - el cambio de idioma estando en la Biblioteca conserva los filtros: `withLanguageQuery` deja las claves de la Biblioteca y borra las ajenas (FR-044);
  - la sincronización con las escrituras ajenas se activa en el montaje, nunca al evaluar (R6).
- **Lo compartido con F4, F5 y F9 lo trae el primero que se integra,** con los mismos archivos y firmas que el plan de F5 (R7). T001 detecta qué hay en la base, y cada tarea condicional dice qué hacer en cada caso.
- **El CSS:** 41 reglas pasan a `pages/library/ui/library.css`, importada en `main.tsx` justo después de `styles.css`. Lo prueban el multiconjunto y el barrido de estilo computado de F2b, con 0 diferencias (R9).

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; JavaScript legacy en `frontend/app.js`. Node 24.21.0.

**Primary Dependencies**:
- de ejecución: React 19.2.8, `react-dom` 19.2.8, zustand 5.0.15 (estrena `useStore`) y **nuqs 2.10.2, nueva** (con `@standard-schema/spec` 1.1.0, sólo tipos);
- de desarrollo nuevas: `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7, `@testing-library/jest-dom` 7.0.1 y `fishery` 2.4.0.

Todas en versión exacta y con permiso (§«Descargas y permisos»).

**Storage**: `taller-learning-v1`, sin cambios de formato (ADR 0003). F3 no abre claves: los filtros viven en la URL.

**Testing**:
- Vitest en dos proyectos: `node` para `*.spec.ts` y `jsdom` para `*.spec.tsx`, con Testing Library y fishery.
- Playwright contra el build servido: la red de F1, los 17 de A2, la spec nueva de la Biblioteca y un caso nuevo en `url-contract`.
- Los checks de `qa/` (`boot-check`, `app-shell-check` y `load-order-check`).
- Tres comparaciones únicas: legacy contra port, el multiconjunto de CSS y el barrido de estilo computado.

**Target Platform**: navegador moderno (ES2020), servido por Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web. Es el port de una vista legacy a React.

**Performance Goals**: ninguna nueva. La búsqueda corre en cada tecla, como hoy, sin debounce ni memoización. Se informan `html.length` y el tiempo de `npm test` y de la red E2E antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**:
- 17 archivos de producción nuevos: la página, con su modelo, sus componentes y su hoja; el adaptador; `url-state.tsx`; `toggle-item.ts`; y el setup de Vitest.
- 12 archivos de prueba nuevos: specs de Vitest, el Page Object, la spec E2E y la factory.
- 13 archivos cambiados: `app.js`, `styles.css`, `main.tsx`, `legacy-views.ts`, `url-grammar.ts`, el índice de `entities/guide`, las configuraciones y los checks de `qa/`.
- 4 documentos.

## Restricciones globales

Valen para toda tarea. Los valores salen de la spec, la constitución 1.4.1, la hoja de ruta y `AGENTS.md`.

- **La red, sin editar:**
  - los 106 E2E de F1 y los 17 de A2 pasan antes de empezar y después de cada unidad;
  - `url-contract.spec.ts` suma **un** `describe` con **un** caso y no cambia los otros;
  - editar otro E2E de la red es un cambio de comportamiento, que va aparte y con la aprobación del usuario (FR-002).
- **Los E2E de F3:**
  - los de lo que se conserva (unidad 1) no se editan después;
  - la única excepción es la aserción de la recarga del flujo (i), en T017, aprobada por el clarify (FR-003).
- **El progreso:**
  - la clave `taller-learning-v1`, `version: 1` y la forma y el orden de `favorites` no cambian;
  - con `qa/fixtures/progress-*.json` el arranque no escribe, no respalda ni avisa;
  - cada clic en una estrella hace **una** escritura;
  - `curriculum-ids-check` sigue en verde (FR-004 y FR-012).
- **Los textos exactos de la página**, copiados de `renderLibrary` y `renderResourceResults`:
  - «RECURSOS CON INTENCIÓN»;
  - «Una biblioteca.» y «Tu propia ruta.» (en `<em>`), con un `<br>` entre los dos;
  - «Todo lo que revisamos, en un lugar. Elegí según lo que necesitás hoy; guardá tus favoritos para volver sin buscar de nuevo.»;
  - el marcador de la búsqueda, «Buscar un recurso, tema o formato…», y su nombre, «Buscar recursos»;
  - el selector de lenguaje, «Filtrar por lenguaje»: «Todos los lenguajes», «Rust» y «Go»;
  - el de acceso, «Filtrar por acceso»: «Cualquier acceso», «Acceso gratuito» y «Gratis + pago»;
  - el grupo «Tipo de recurso»: «Todos», «Ejercicios», «Proyectos», «Lectura» y «Herramientas»;
  - « Solo mis favoritos»;
  - el recuento, «N de M recursos · abrí cada uno a tu ritmo»;
  - el estado vacío: «Ningún recurso con esos filtros.», «Probá otro término o volvé a ver la biblioteca completa.» y «Limpiar filtros»;
  - las píldoras: «Rust», «Go», «Go + Rust», «Gratis», «Gratis + pago» y «Elegido para vos»;
  - las estrellas, «Guardar en favoritos: <título>» o «Quitar de favoritos: <título>», con ☆ y ★;
  - «Para vos:», «Antes de empezar» y «Explorar recurso »;
  - la nota final, «Accesos y modalidades revisados el 2 de octubre de 2026. Los recursos externos necesitan conexión y pueden cambiar. Los precios no se fijan aquí: revisá las condiciones de cada sitio.»
- **Los mensajes nuevos:** `console.error('No se pudo mostrar la Biblioteca.', error)` (FR-029). Ningún otro texto nuevo.
- **El marcado:**
  - las clases, los ids, los roles, los `aria-*` y los atributos de hoy;
  - se retiran sólo `data-action`, `data-id` y `data-category`;
  - el `<span class="sr-only"></span>` vacío de cada enlace se conserva (FR-020, R5 de `css-contract`);
  - exactamente **un** campo de búsqueda (R4 de `css-contract`);
  - ningún `style=`, `setAttribute('style', …)` ni `style.cssText` (FR-023).
- **El dist:**
  - `dist/index.html` queda bajo **1 250 000** caracteres (`BOOT_SIZE_LIMIT`);
  - el aumento sobre T001 no pasa de **30 000** si F3 instala nuqs, ni de **15 000** si ya está;
  - un `<script type="module">`, un `<style>` y el contenido aparte;
  - `frontend/src/index.html`, el marcado del dist con los scripts y el estilo vaciados, `build/curriculum.json`, su copia servida y `dump-globals` dan **0 diferencias** contra T001;
  - el `<style>` cambia sólo de orden: 0 diferencias en el multiconjunto y en el barrido (FR-026 y FR-038).
- **Las dependencias:** sólo nuqs es de ejecución. jsdom, Testing Library y fishery van a `devDependencies` y no son alcanzables desde `main.tsx`. Las versiones son exactas y el lockfile queda sincronizado (FR-033, FR-038 y FR-042).
- **El código:**
  - TypeScript y ES modules;
  - un componente por archivo, con `const`, nombre igual al archivo y `export default` al final; el modelo, con exports nombrados;
  - `interface` para las formas;
  - ninguna función nueva con complejidad mayor que 10;
  - **ningún comentario**, salvo una referencia puntual;
  - nombres y pruebas en inglés, y textos para el alumno en español rioplatense.
- **Las reglas de React:**
  - `useStore` siempre con selector (FR-011);
  - ninguna copia del progreso ni de los filtros en `useState`, `useRef` o un store (FR-010 y FR-021), salvo la sesión transitoria de T011, que T018 borra;
  - `useEffect` sólo para sistemas externos, y la página no usa ninguno (FR-025);
  - `flushSync` sólo en el manejador de la estrella (R8);
  - sin `StrictMode`, memoización, debounce ni librería de animación.
- **Las capas:**
  - la página importa de `entities/guide` (su índice) y de `shared`, nunca de `app/`, de `build/curriculum.json` ni de `window`;
  - el adaptador no importa valores de `entities/guide` (R4 del guard);
  - nada importa `entities/<slice>/model/**` desde `app/` (R6) (FR-007, FR-009 y FR-024).
- **Los comandos de cierre:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, y la imagen web construye (SC-011).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Pasa antes y después del diseño. Complexity Tracking registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, React con Feature-Sliced Design, nuqs con `NuqsAdapter`, parsers y valores por omisión explícitos, y zustand con selectores chicos. Las dependencias entran con su primer caso real y con permiso. `AGENTS.md` no cambia |
| II. TDD y pruebas útiles | Sí | Cada tarea de código abre con su prueba en rojo. Los valores esperados salen de la spec, de los ejemplos recalculados sobre el contenido (research.md, R4) o de las fixtures congeladas, nunca del código ni de una factory. Los E2E de lo que se conserva van primero y en verde contra el legacy; los de los tres cambios, en rojo y antes de cada cambio. Hay una rotura deliberada por protección (quickstart.md §6) |
| III. Código entendible | Sí | El filtro se parte en predicados con nombre (complejidad 9), y los componentes tienen una responsabilidad cada uno. Lo que no se hace, por YAGNI: un hook compartido para leer el recorrido, una memoización, un store de filtros |
| IV. Contenido en Git, IDs estables | Sí | `content/` no cambia. Los ids de recursos indexan `favorites` y no se tocan |
| V. Capas y contratos explícitos | Sí | El contenido llega por el adaptador, el progreso por `routeStore`, la URL por la gramática y nuqs, y el aspecto por la hoja de la página. La forma de URL tiene su contrato |
| VI. Español, accesibilidad y portabilidad | Sí | Se conservan los textos de hoy, los controles nativos, la tabulación, el movimiento reducido y el diseño móvil. El foco ya no cae al documento. Las regiones vivas siguen montadas, y su comprobación manual con lector de pantalla es una acción del usuario |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las comparaciones únicas y la copia descartable de T002 corren fuera del repositorio. No hay salidas nuevas en Git |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit o su PR |

## Decisiones

**Del usuario, en el clarify del 2026-10-28:**

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1:** los filtros en la URL con nuqs | La forma `?buscar=&en=&acceso=&tipo=&favoritos=#biblioteca`, con `history: 'replace'`, los parsers armados con las constantes de la gramática y el caso nuevo de `url-contract` | T015 a T018 |
| **Q2:** el CSS se muda con la página | 41 reglas a `library.css`; los bloques compartidos se parten y lo de otras vistas se queda en `styles.css` | T019 |
| **Q3:** el detalle abierto queda abierto y el foco no se pierde | Llegan con el corte, porque es lo que hace React (FR-022), y con T014, el foco al quitar un favorito con «Solo mis favoritos» | T012 a T014 |

**Las que toma este plan** (la spec se las deja):

| Tema | Decisión | Motivo |
| --- | --- | --- |
| El nombre del lenguaje (FR-043) | `en` | `lenguaje` cambiaría el idioma del taller al pasar por Sistemas (research.md, R2) |
| El cambio de idioma en la Biblioteca (FR-044) | Conserva los filtros y borra las claves ajenas | Es la recomendación de la spec, y C2 de F1 sigue pasando |
| La sesión del corte (FR-001) | Transitoria, en el adaptador; T018 la borra | R1 |
| El destino del foco (FR-019) | El de la spec, sin ajustes | R8 |
| fishery (FR-034) | Entra, con una factory de `GuideResource` en la página | R4 |
| Cuántos PR | Uno, el de la vista, revertible entero | Es la regla de la hoja de ruta («Un PR por vista»). El informe propone un PR previo con lo compartido |
| Los contadores en la suscripción del shell | No: sólo el pie, que tiene prueba en rojo; F9 suma los contadores | R7 |

**Abierta, para el usuario:** **D1**, la búsqueda de sólo espacios (research.md, R3). Este plan sigue con la opción A: el campo la conserva y la URL la lleva (`?buscar=+++`).

## Project Structure

### Documentation (this feature)

```text
specs/012-f3-biblioteca/
├── spec.md                  # la spec con su clarify; F3 no la cambia
├── plan.md                  # este archivo
├── research.md              # decisiones, mediciones y la tabla de Context7
├── quickstart.md            # línea base, compuertas, comparaciones únicas y roturas deliberadas
├── contracts/library-url.md # la forma de URL de la Biblioteca
├── tasks.md                 # una línea por tarea, T001 a T023
└── checklists/requirements.md
```

No hay `data-model.md`: F3 no cambia el formato del progreso. Las interfaces TypeScript entre tareas están en la sección de cada una.

### Source Code (repository root)

```text
frontend/
├── app.js                                    T007 toggleItem · T009 suscripción · T013 corte
├── styles.css                                T019 sale lo de la Biblioteca
├── vitest.config.ts                          T006 dos proyectos
└── src/
    ├── vitest-setup.ts                       T006 NUEVO, si no está
    ├── app/
    │   ├── main.tsx                          T019 importa library.css después de styles.css
    │   ├── boot/legacy-views.ts              T013 suma register-library
    │   └── legacy/
    │       ├── register-library.tsx          T013 NUEVO · T018 sin sesión y con UrlStateProvider
    │       └── url-state.tsx (+ .spec.tsx)    T016 NUEVO, si no está
    ├── entities/guide/
    │   ├── index.ts                          T007 exporta toggleItem
    │   └── model/toggle-item.ts (+ .spec.ts)  T007 NUEVO, si no está
    ├── shared/config/url-grammar.ts (+ spec) T017 y T018 las constantes y withLanguageQuery
    └── pages/library/                        NUEVO
        ├── index.ts                          la API pública: LibraryPage (y, hasta T018, la sesión)
        ├── model/
        │   ├── filter-resources.ts (+ .spec.ts)      T010
        │   ├── resource-labels.ts (+ .spec.ts)       T010
        │   ├── focus-after-removal.ts (+ .spec.ts)   T014
        │   ├── library-query.ts (+ .spec.ts)         T017 y T018
        │   ├── use-library-filters.ts                T011 · T018 pasa a nuqs
        │   └── guide-resource.factory.ts             T010 (sólo specs)
        └── ui/
            ├── LibraryPage.tsx (+ .spec.tsx)         T011 · T014 · T018
            ├── LibraryFiltersBar.tsx                 T011
            ├── ResourceCard.tsx                      T011 · T014
            ├── EmptyLibrary.tsx                      T011 · T014
            └── library.css                           T019
qa/
├── e2e/fixtures/{index,storage-control}.ts   T003
├── e2e/pages/library.ts                      T003 NUEVO
├── e2e/specs/library.spec.ts                 T004 · T012 · T014 · T017 NUEVO
├── e2e/specs/url-contract.spec.ts            T017 un caso nuevo
├── lib/{sources,legacy-sources,app-shell-harness}.ts   T008 y T013
├── lib/app-adapters.ts · load-order-check.ts · boot-check.ts · lib/fake-dom.ts   T013
└── app-shell-check.ts                        T008 y T009
eslint.config.ts                              T006 la guarda de useStore
package.json · package-lock.json · frontend/THIRD-PARTY-NOTICES.txt   T005 y T015
docs/architecture.md · qa/AGENTS.md · docs/agent-skills.md · docs/adr/0008-pruebas-del-front.md   T022
```

**Structure Decision:**
- La página vive en `pages/library`, con los segmentos `model` y `ui`, como el Atlas.
- `toggleItem` baja a `entities/guide`, porque alterna ids del progreso del recorrido y la usan `app.js`, la Biblioteca y después F4 y F9.
- `url-state.tsx` va en `app/legacy/` porque lo usan los adaptadores de las páginas con nuqs, hasta que F10 deje una sola raíz.
- No se crea `features`, `widgets` ni un barrel.

## Review Focus

Lo que el revisor mira primero:

- **El corte, en un solo commit (T013).** No queda ninguna rama `favorite`, `category` ni `clear-filters`, ningún `filter-*` ni `resource-search` en los delegados de `app.js`, y ningún `data-action` en el marcado nuevo. `render()` desmonta la Biblioteca antes de redibujar y la monta sin `?.`. El favorito se alterna una sola vez por clic.
- **Una sola instancia del almacén.** El adaptador no importa `routeStore`: lo importa la página. `boot-check` monta la Biblioteca desde el bundle de `main.tsx` sin el error «Abrí el almacén…», y el escenario de `app-shell-check` usa el `routeStore` del mismo bundle que `app.js`.
- **Ninguna copia del progreso** (FR-010). La revisión se suscribe con `useStore(routeStore.changes, (state) => state.revision)` y los favoritos se leen de `routeStore.getProgress()` en cada render. Un `useState(favorites)`, un `useMemo([favorites])` o un `useStore(store)` sin selector son defectos.
- **El marcado igual al de hoy.**
  - La página dibuja un fragmento con los mismos hermanos que el `innerHTML` de hoy, sin envoltorios. R4 de `css-contract` toma `main div` como primer elemento.
  - Cada texto con un espacio inicial o final va en una sola expresión de cadena (`{' RECURSOS CON INTENCIÓN'}`, `{' Solo mis favoritos'}`, `{'Explorar recurso '}`): así React deja un solo nodo de texto.
  - La comparación única (T020) lo confirma.
- **La URL.**
  - Las claves salen de `LIBRARY_QUERY_KEYS`.
  - `withLanguageQuery` borra las claves ajenas en `#biblioteca` y conserva las de la Biblioteca.
  - `startUrlStateSync()` se llama en `mount`, nunca al evaluar.
  - No queda ningún `useState` de filtros después de T018.
- **La cascada (T019).** `library.css` va justo después de `styles.css`, y el bloque de impresión, entre los dos bloques de 590 px (R9). El barrido da 0 diferencias y su control negativo, más de 0.
- **El tamaño.** El aumento queda dentro del subpresupuesto, con nuqs medido aparte.

**Lo que la spec implica y ninguna prueba de una tarea ejercita**, cada caso con la prueba que lo fija y su tarea dueña:

1. **El cursor en medio de la consulta** (FR-018). El alumno pone el cursor entre dos palabras y escribe, mientras cada tecla reescribe la URL. Ningún E2E de la unidad 1 lo hace: todos escriben al final. **T017** suma al E2E (j) un caso que escribe «tour of», mueve el cursor con `Home` y `ArrowRight` ×5 y escribe «x». El campo tiene que valer «tour xof», con 0 resultados, y la URL, `buscar=tour+xof`.
2. **Un texto con caracteres especiales en la URL** (`&`, `#`, `%`, `+` y una tilde). El contenido no lo pide y los ejemplos no lo cubren. **T017** lo fija en la spec de `library-query.ts` (`a&b #c%+` escribe `?buscar=a%26b+%23c%25%2B`) y en un E2E que escribe `a&b #c%+á`, recarga y encuentra el campo igual.
3. **Un recurso con dos lenguajes explícitos** (`['rust', 'go']`). Hoy ninguno lo tiene. **T010** lo fija en la spec de `resource-labels.ts` («Rust + Go» y «Go + Rust») y en la de `filter-resources.ts` (aparece con Rust y con Go).
4. **Otra pestaña guarda entre dos clics, y `save()` reemplaza el estado.** Ningún E2E abre dos pestañas. **T011** lo fija en la spec de la página: con la página dibujada, la spec reescribe la clave en el almacenamiento en memoria como lo haría otra pestaña y la página guarda con una estrella. La página muestra el estado fusionado (la unión de favoritos de ADR 0003, decisión 9), sin conservar el arreglo viejo.
5. **Un contenido sin recursos** (una versión futura del contenido): «0 de 0 recursos · abrí cada uno a tu ritmo» y el estado vacío. **T011** lo fija en la spec de la página, con `resources={[]}`.

## Unidades, reparto y orden

| Unidad | Tareas | Qué deja | Si se revierte |
| --- | --- | --- | --- |
| 0 · Línea base y verificación | T001 y T002 | Los valores de partida y la confirmación de nuqs | — (sólo documentación) |
| 1 · E2E contra el legacy | T003 y T004 | El Page Object y los flujos de lo que se conserva, en verde contra el legacy | Se pierden las pruebas; nada de producción cambió |
| 2 · Arnés, piezas compartidas, modelo y página sin montar | T005 a T011 | La pila de componentes, la guarda, `toggleItem`, el `routeStore` del arnés de `qa/`, la suscripción del pie, el modelo y la página con sus specs, sin montar | Sin efecto visible: la página no está montada |
| 3 · El corte | T012 y T013 | El adaptador, el montaje, el retiro de las siete ramas y las adaptaciones de `qa/` | Vuelve el legacy |
| 4 · Los cambios a propósito | T014 a T018 | El foco (T014) y los filtros en la URL con nuqs (T015 a T018) | Cada commit devuelve el port anterior |
| 5 · El CSS | T019 | `library.css` y los bloques partidos | Vuelve el CSS a `styles.css` |
| 6 · Cierre | T020 a T023 | La comparación única, las roturas deliberadas, la documentación y el PR | — |

**Dueños:**
- **K, el coordinador:** lo hace el agente principal. Corre la línea base, las descargas con permiso, la configuración (`package.json`, `vitest.config.ts`, `eslint.config.ts` y `main.tsx`), el corte, las compuertas, las comparaciones únicas, la documentación y el PR.
- **E, los E2E;** **S, el shell y `qa/`;** **P, la página;** **H, la hoja de estilos:** son slices para el subagente `implementador`. Se les dan sus archivos, sus interfaces y sus checks, y se les dice que no dejen comentarios.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 y T002 |
| 1 | E, K y S a la vez | **E:** T003 y T004. **K:** T005 y T006. **S:** T007, T008 y T009 |
| 2 | P | T010 y T011 (necesitan T005, T006 y T007) |
| 3 | E y K | **E:** T012. **K:** T013, el corte, con los diffs de S y P integrados |
| 4 | P, E y K | **P y E:** T014. **K:** T015 y T016. **P y E:** T017; **P:** T018 |
| 5 | H y K | **H:** T019, que se prepara desde la onda 4 y se commitea sobre T018 |
| 6 | K | T020 a T023 |

**Puertos:** los E2E de cada dueño usan el suyo (`vite preview` con `--strictPort`): K `E2E_PORT=4173`, E `4191`, S `4192`, P `4193` y H `4194`. Las comparaciones únicas, el 4501 y el 4502.

**Con los otros ports** (F2b ya está en la base). F3, F4 y F9 se integran de a uno, y el que llega después rebasa y repite la compuerta. Con F5 se integra en el tramo 3. Lo que comparten está en research.md, R7, y cada tarea dice qué hacer si su pieza ya está en la base. Las regiones de `app.js` que tocan los tres son:
- **F3:** los imports, `startApp()` (la suscripción), `render()`, `renderLibrary`, `renderResourceResults` y las siete ramas;
- **F4:** `renderProject`, `milestones` y la rama `data-milestone`;
- **F9:** `renderRoute`, el temporizador, la lección y sus ramas.

Los tres tocan `render()` y los delegados en líneas vecinas: el rebase lo resuelve K, con la compuerta otra vez.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, research.md, quickstart.md y tu sección;
  - las skills `tdd`, `clean-code`, `vitest` y `react-testing`, y `playwright-best-practices` si escribís E2E.
- **Base y estado.** Partís del commit de T001. Antes de una tarea condicional, mirá lo que T001 anotó en research.md («Línea base de la implementación») y seguí la rama que corresponde.
- **TDD, siempre.**
  - Un módulo nuevo empieza con sus firmas lanzando `new Error('not implemented')`, para que su spec falle por comportamiento y no por un import.
  - La prueba en rojo y la implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Los valores esperados salen de la spec, de research.md (R4), del contrato de URL o de las fixtures congeladas, nunca del código ni de una factory.
  - Una prueba de la base que falla dice que el error está en el código nuevo: su valor esperado no se toca.
- **Mover no reescribe.**
  - El filtro conserva la búsqueda por subcadena y la lectura de los identificadores de lenguaje, `both` incluido.
  - La `.sr-only` vacía y el `class="pill "` (que pasa a `"pill"`) no se corrigen de paso.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita otro, pedíselo a K.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline` (si intenta descargar algo, pará y pedí permiso);
  - `npm run test:unit -- <ruta>`;
  - `node qa/<check>.ts` (antes, `npm run curriculum`);
  - `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - `npm run build` y después `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Docker lo corre sólo K, con permiso.
- **Estilo:**
  - **sin comentarios,** y los comentarios de los bloques de este plan no se copian;
  - un componente por archivo, con `const` y `export default` al final;
  - el modelo, con exports nombrados;
  - `interface` para las formas.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(e2e): …`, `test(front): …` o `test(qa): …` para la prueba en rojo;
  - `refactor(front): …` para lo que se mueve sin cambiar comportamiento;
  - `feat(front): …` para los cambios a propósito.
- **Al terminar,** informá las tareas cerradas, los comandos con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.
