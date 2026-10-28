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

## 0. Línea base y verificación (K, onda 0)

**Cubre:** FR-002, FR-004, FR-038, FR-039 y FR-042; SC-001, SC-006, SC-009 y SC-011; riesgos 13 y 14.

### Tarea 0.1 · La línea base y el estado de la base (T001, K)

- **Cuándo:** sobre la base de implementación (`master` con F2a, A2 y F2b), antes de cualquier cambio. Si F4, F5 o F9 se integraron antes, también los incluye.
- **Entrega:** un commit de documentación que suma a research.md la sección «Línea base de la implementación», con el hash de la base, los valores de quickstart.md §1 y la tabla «Qué ya está en la base».
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde. Si algo falla, F3 no empieza.
  2. Anotar los valores de quickstart.md §1:
     - los hashes del script, del `<style>` y del marcado del dist;
     - `html.length` y el conteo de `import(` y `import.meta`;
     - el multiconjunto del CSS;
     - los avisos de complejidad, con la función de 11 de `renderResourceResults`;
     - la cantidad de pruebas de cada check y de Vitest;
     - `npx playwright test --config qa/e2e/playwright.config.ts --list | tail -1`.
  3. Correr las detecciones de quickstart.md §1.3 y anotar cada pieza compartida como «está» o «falta». Las tareas condicionales (T005, T006, T007, T008, T009, T013, T015, T016 y T019) siguen esa tabla.
- **Compuerta:** los pasos 1 a 3, con los valores anotados.

### Tarea 0.2 · La verificación corta de nuqs (T002, K; riesgo 14)

- **Cuándo:** después de T001 y antes de la unidad 1, con el permiso de la descarga (§«Descargas y permisos», P1). Si T001 encontró nuqs instalado, el paso 2 se salta y todo lo demás corre sobre la base.
- **Dónde:** en una copia descartable de la base (`git worktree add --detach ../f3-nuqs-probe <hash de T001>`), nunca en la rama. Se borra al terminar (`git worktree remove ../f3-nuqs-probe`).
- **Pasos:**
  1. **Los metadatos:** `npm view nuqs@2.10.2 version license dist.unpackedSize`. Tiene que dar 2.10.2, MIT y 480 252.
  2. **La instalación en la copia:**
     ```sh
     npm install --save-exact nuqs@2.10.2
     npm install --save-exact --save-dev jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 @testing-library/jest-dom@7.0.1
     ```
     La segunda línea sólo si T001 encontró la pila de DOM ausente.
  3. **Los exports:** `node --input-type=module -e "import('nuqs/adapters/react').then((m) => console.log(Object.keys(m).sort().join(',')))"`. Se espera `NuqsAdapter,enableHistorySync`.
  4. **El peso, como cota superior.** Al final de `frontend/src/app/main.tsx` de la copia va el código de abajo. Después, `npm run build`, y el `html.length` menos el de T001 es lo que suma nuqs. Si pasa de 25 000, se detiene y decide el coordinador.
     ```ts
     import { NuqsAdapter, enableHistorySync } from 'nuqs/adapters/react';
     import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
     Object.assign(window, {
       __nuqsProbe: { NuqsAdapter, enableHistorySync, parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates },
     });
     ```
  5. **El comportamiento en jsdom.** En `frontend/vitest.config.ts` de la copia va un proyecto `jsdom` con la configuración de T006, y en `frontend/src/nuqs-probe.spec.tsx`, el código de quickstart.md §2. Corre con `npx vitest run --config frontend/vitest.config.ts --project jsdom src/nuqs-probe.spec.tsx`. Se esperan los siete casos en verde:
     1. reemplaza la URL, conserva el hash y las claves ajenas, y no suma historial;
     2. la búsqueda de sólo espacios con `parseAsString`: el campo la conserva y la URL la lleva (`?buscar=+++`);
     3. la búsqueda de sólo espacios con un `eq` recortado: el campo se vacía (la opción B de D1);
     4. con una clave repetida, manda la primera;
     5. el setter con `null` borra las claves del hook y deja las ajenas;
     6. con `enableHistorySync()`, un `history.replaceState` ajeno llega al hook;
     7. `history.replaceState` actualiza `location` en jsdom.
  6. **Anotar en research.md** («Verificación de nuqs») los exports, el peso y el resultado de cada caso. Si el caso 6 falla, la sincronización no existe en la versión: es un hallazgo que detiene la unidad 4 hasta que decida el coordinador.
- **Compuerta:** los pasos 3 a 6.

## 1. Unidad 1 · Los E2E de lo que se conserva, contra el legacy (E, onda 1)

**Cubre:** FR-003, FR-005, FR-012, FR-013, FR-016 a FR-018, FR-020 y FR-031; SC-002, SC-003 y SC-007; US1, US2 y US3.

### Tarea 1.1 · El Page Object, su fixture y el almacenamiento que lee y no escribe (T003, E)

- **Archivos:**
  - `qa/e2e/pages/library.ts`, nuevo;
  - `qa/e2e/fixtures/index.ts`: suma la fixture `library`;
  - `qa/e2e/fixtures/storage-control.ts`: suma `blockWrites()`.
- **Produce:**

```ts
// qa/e2e/pages/library.ts
import type { Locator, Page } from '@playwright/test';

export type LibraryCategoryName = 'Todos' | 'Ejercicios' | 'Proyectos' | 'Lectura' | 'Herramientas';
export type LibraryLanguageLabel = 'Todos los lenguajes' | 'Rust' | 'Go';
export type LibraryCostLabel = 'Cualquier acceso' | 'Acceso gratuito' | 'Gratis + pago';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class LibraryPage {
  readonly search: Locator;
  readonly languageFilter: Locator;
  readonly costFilter: Locator;
  readonly categories: Locator;
  readonly favoritesOnly: Locator;
  readonly results: Locator;
  readonly cards: Locator;
  readonly cardTitles: Locator;
  readonly emptyHeading: Locator;
  readonly clearFilters: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByRole('searchbox', { name: 'Buscar recursos' });
    this.languageFilter = page.getByRole('combobox', { name: 'Filtrar por lenguaje' });
    this.costFilter = page.getByRole('combobox', { name: 'Filtrar por acceso' });
    this.categories = page.getByRole('group', { name: 'Tipo de recurso' });
    this.favoritesOnly = page.getByRole('checkbox', { name: 'Solo mis favoritos' });
    this.results = page
      .getByRole('status')
      .filter({ hasText: 'recursos · abrí cada uno a tu ritmo' });
    this.cards = page.getByRole('main').getByRole('article');
    this.cardTitles = this.cards.getByRole('heading', { level: 2 });
    this.emptyHeading = page.getByRole('heading', {
      level: 2,
      name: 'Ningún recurso con esos filtros.',
    });
    this.clearFilters = page.getByRole('button', { name: 'Limpiar filtros' });
  }

  category(name: LibraryCategoryName): Locator {
    return this.categories.getByRole('button', { name, exact: true });
  }

  card(title: string): Locator {
    return this.cards.filter({
      has: this.page.getByRole('heading', { level: 2, name: title, exact: true }),
    });
  }

  favoriteButton(title: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^(Guardar en|Quitar de) favoritos: ${escapeRegExp(title)}$`),
    });
  }

  detail(title: string): Locator {
    return this.card(title).locator('details');
  }

  detailSummary(title: string): Locator {
    return this.card(title).getByText('Antes de empezar', { exact: true });
  }

  link(title: string): Locator {
    return this.card(title).getByRole('link', { name: 'Explorar recurso' });
  }

  async searchFor(text: string): Promise<void> {
    await this.search.clear();
    await this.search.pressSequentially(text);
  }

  async chooseLanguage(label: LibraryLanguageLabel): Promise<void> {
    await this.languageFilter.selectOption({ label });
  }

  async chooseCost(label: LibraryCostLabel): Promise<void> {
    await this.costFilter.selectOption({ label });
  }

  async chooseCategory(name: LibraryCategoryName): Promise<void> {
    await this.category(name).click();
  }

  async toggleFavorite(title: string): Promise<void> {
    await this.favoriteButton(title).click();
  }
}
```

```ts
// qa/e2e/fixtures/storage-control.ts, a new method of StorageControl
  async blockWrites(): Promise<void> {
    await this.context.addInitScript(() => {
      const setItem = Storage.prototype.setItem;
      const removeItem = Storage.prototype.removeItem;
      const quota = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      Storage.prototype.setItem = function (key: string, value: string) {
        if (this === window.localStorage) throw quota();
        return setItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key: string) {
        if (this === window.localStorage) throw quota();
        return removeItem.call(this, key);
      };
    });
  }
```

- **La fixture:** en `qa/e2e/fixtures/index.ts`, `import { LibraryPage } from '../pages/library';`, `library: LibraryPage;` en `Fixtures` y `library: async ({ page }, use) => use(new LibraryPage(page)),` después de `atlas`.
- **Pasos:** `npm run typecheck` (incluye `qa/e2e/tsconfig.json`) y `npm run lint`. Las pruebas de estas piezas son las de T004. Commit: `test(e2e): el Page Object de la Biblioteca y el almacenamiento que lee y no escribe`.

### Tarea 1.2 · Los flujos de la Biblioteca, en verde contra el legacy (T004, E)

- **Archivo:** `qa/e2e/specs/library.spec.ts`, nuevo.
- **De dónde salen los valores:** de la spec («Qué se conserva») y de research.md (R4), escritos a mano. Los títulos son los de `content/guide/` en el orden de su manifiesto, y el progreso, el de las fixtures congeladas o el de un literal en el formato v1 guardado.
- **El código:**

```ts
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

const TITLE = {
  'rust-100': '100 Exercises to Learn Rust',
  'rust-rover': '100 Exercises en RustRover',
  rustlings: 'Rustlings',
  'rust-brown': 'Rust Book interactivo de Brown',
  'rust-google': 'Comprehensive Rust en español',
  codecrafters: 'CodeCrafters',
  protohackers: 'Protohackers',
  'go-tour': 'A Tour of Go',
  'go-tests': 'Learn Go with Tests',
  'go-exercism': 'Exercism · Go',
  gophercises: 'Gophercises',
  'boot-dev': 'Boot.dev · Go',
  context7: 'Context7',
  'rust-examples': 'Rust by Example',
  'go-examples': 'Go by Example',
} as const;
type ResourceId = keyof typeof TITLE;

const ALL: ResourceId[] = [
  'rust-100', 'rust-rover', 'rustlings', 'rust-brown', 'rust-google', 'codecrafters', 'protohackers',
  'go-tour', 'go-tests', 'go-exercism', 'gophercises', 'boot-dev', 'context7', 'rust-examples', 'go-examples',
];
const RUST: ResourceId[] = ['rust-100', 'rust-rover', 'rustlings', 'rust-brown', 'rust-google', 'codecrafters', 'protohackers', 'context7', 'rust-examples'];
const GO: ResourceId[] = ['codecrafters', 'protohackers', 'go-tour', 'go-tests', 'go-exercism', 'gophercises', 'boot-dev', 'context7', 'go-examples'];
const FREE: ResourceId[] = ['rust-100', 'rustlings', 'rust-brown', 'rust-google', 'protohackers', 'go-tour', 'go-tests', 'go-exercism', 'gophercises', 'rust-examples', 'go-examples'];
const MIXED: ResourceId[] = ['rust-rover', 'codecrafters', 'boot-dev', 'context7'];
const BY_CATEGORY = {
  Ejercicios: ['rust-100', 'rust-rover', 'rustlings', 'go-tour', 'go-exercism', 'boot-dev'],
  Proyectos: ['codecrafters', 'protohackers', 'gophercises'],
  Lectura: ['rust-brown', 'rust-google', 'go-tests', 'rust-examples', 'go-examples'],
  Herramientas: ['context7'],
} as const satisfies Record<string, readonly ResourceId[]>;
const EXERCISES_QUERY: ResourceId[] = ['rust-100', 'rust-rover', 'rustlings', 'rust-google', 'go-tour', 'go-exercism', 'gophercises'];
const BOTH: ResourceId[] = ['codecrafters', 'protohackers', 'context7'];

const titlesOf = (ids: readonly ResourceId[]) => ids.map((id) => TITLE[id]);
const countLabel = (shown: number) => `${shown} de 15 recursos · abrí cada uno a tu ritmo`;

function savedRoute(favorites: ResourceId[]): string {
  return JSON.stringify({
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites,
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
  });
}

test.describe('(a) opening the library', () => {
  test('shows the fifteen resources in content order and the controls at rest', async ({ shell, library, page }) => {
    await shell.goto(urls.view('biblioteca'));

    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(page.getByText('RECURSOS CON INTENCIÓN')).toBeVisible();
    await expect(
      page.getByText('Todo lo que revisamos, en un lugar. Elegí según lo que necesitás hoy; guardá tus favoritos para volver sin buscar de nuevo.'),
    ).toBeVisible();
    await expect(
      page.getByText('Accesos y modalidades revisados el 2 de octubre de 2026. Los recursos externos necesitan conexión y pueden cambiar. Los precios no se fijan aquí: revisá las condiciones de cada sitio.'),
    ).toBeVisible();
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
    await expect(library.results).toHaveText(countLabel(15));
    await expect(library.search).toHaveValue('');
    await expect(library.search).toHaveAttribute('placeholder', 'Buscar un recurso, tema o formato…');
    await expect(library.languageFilter).toHaveValue('all');
    await expect(library.costFilter).toHaveValue('all');
    await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['Ejercicios', 'Proyectos', 'Lectura', 'Herramientas'] as const) {
      await expect(library.category(name)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(library.favoritesOnly).not.toBeChecked();
  });
});

test.describe('(b) the search', () => {
  test('matches the whole query as a substring, not word by word', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('tour of');
    await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
    await expect(library.results).toHaveText(countLabel(1));

    await library.searchFor('of tour');
    await expect(library.cardTitles).toHaveCount(0);
    await expect(library.emptyHeading).toBeVisible();
    await expect(library.results).toHaveText(countLabel(0));
  });

  test('ignores accents and case', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('EJÉRCICIOS');
    await expect(library.cardTitles).toHaveText(titlesOf(EXERCISES_QUERY));
    await library.searchFor('ejercicios');
    await expect(library.cardTitles).toHaveText(titlesOf(EXERCISES_QUERY));
  });

  test('also matches the language ids and never the access', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('both');
    await expect(library.cardTitles).toHaveText(titlesOf(BOTH));
    await library.searchFor('gratis');
    await expect(library.cardTitles).toHaveCount(0);
    await library.searchFor('mixto');
    await expect(library.cardTitles).toHaveCount(0);
  });

  test('a query of only spaces does not filter and the field keeps it', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('   ');
    await expect(library.search).toHaveValue('   ');
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  });
});

test.describe('(c) language, access and type', () => {
  test('each filter alone', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.chooseLanguage('Rust');
    await expect(library.cardTitles).toHaveText(titlesOf(RUST));
    await library.chooseLanguage('Go');
    await expect(library.cardTitles).toHaveText(titlesOf(GO));
    await library.chooseLanguage('Todos los lenguajes');

    await library.chooseCost('Acceso gratuito');
    await expect(library.cardTitles).toHaveText(titlesOf(FREE));
    await library.chooseCost('Gratis + pago');
    await expect(library.cardTitles).toHaveText(titlesOf(MIXED));
    await library.chooseCost('Cualquier acceso');

    for (const [name, ids] of Object.entries(BY_CATEGORY) as [keyof typeof BY_CATEGORY, readonly ResourceId[]][]) {
      await library.chooseCategory(name);
      await expect(library.category(name)).toHaveAttribute('aria-pressed', 'true');
      await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'false');
      await expect(library.cardTitles).toHaveText(titlesOf(ids));
    }
  });

  test('the filters combine with and', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.chooseLanguage('Go');
    await library.chooseCost('Gratis + pago');
    await expect(library.cardTitles).toHaveText(titlesOf(['codecrafters', 'boot-dev', 'context7']));

    await library.chooseCost('Acceso gratuito');
    await library.searchFor('tour of');
    await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
  });

  test('the language of the menu does not filter the library', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await shell.switchLanguage('go');

    await expect(library.languageFilter).toHaveValue('all');
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  });
});

test('(d) Limpiar filtros resets the five criteria and leaves the focus on the search', async ({ shell, library, page }) => {
  await shell.goto(urls.view('biblioteca'));
  await library.chooseLanguage('Go');
  await library.chooseCost('Gratis + pago');
  await library.chooseCategory('Lectura');
  await library.favoritesOnly.check();
  await library.searchFor('zzz');
  await expect(library.emptyHeading).toBeVisible();
  await expect(page.getByText('Probá otro término o volvé a ver la biblioteca completa.')).toBeVisible();

  await library.clearFilters.click();

  await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  await expect(library.search).toHaveValue('');
  await expect(library.languageFilter).toHaveValue('all');
  await expect(library.costFilter).toHaveValue('all');
  await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'true');
  await expect(library.favoritesOnly).not.toBeChecked();
  await expect(library.search).toBeFocused();
});

test.describe('(e) a favorite', () => {
  test('one click saves once, changes the star and keeps the focus, and a reload keeps it', async ({ shell, library, storage, page }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('biblioteca'));
    const star = library.favoriteButton(TITLE['go-tour']);
    await expect(star).toHaveAccessibleName('Guardar en favoritos: A Tour of Go');
    await expect(star).toHaveAttribute('aria-pressed', 'false');
    await expect(star).toHaveText('☆');

    await star.click();

    await expect(star).toHaveAccessibleName('Quitar de favoritos: A Tour of Go');
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await expect(star).toHaveText('★');
    await expect(star).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    await page.reload();
    await expect(library.favoriteButton(TITLE['go-tour'])).toHaveAttribute('aria-pressed', 'true');
  });

  test('the id goes to the end of the saved favorites and a second click removes it', async ({ shell, library, storage }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));

    await library.toggleFavorite(TITLE['go-tour']);
    let saved = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}') as { favorites: string[] };
    expect(saved.favorites).toEqual(['rust-100', 'go-tour']);

    await library.toggleFavorite(TITLE['go-tour']);
    saved = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}') as { favorites: string[] };
    expect(saved.favorites).toEqual(['rust-100']);
  });
});

test.describe('(f) Solo mis favoritos', () => {
  test('shows the favorite of the frozen progress', async ({ shell, library, storage }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));

    await library.favoritesOnly.check();

    await expect(library.cardTitles).toHaveText([TITLE['rust-100']]);
    await expect(library.results).toHaveText(countLabel(1));
  });

  test('without favorites shows the empty state', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.favoritesOnly.check();

    await expect(library.cardTitles).toHaveCount(0);
    await expect(library.emptyHeading).toBeVisible();
  });

  test('a favorite that a filter hides stays saved and comes back', async ({ shell, library, storage }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));

    await library.chooseLanguage('Go');
    await expect(library.card(TITLE['rust-100'])).toHaveCount(0);
    await library.chooseLanguage('Todos los lenguajes');

    await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute('aria-pressed', 'true');
  });
});

test('(g) a favorite removed in the library stays removed after another part saves and a reload', async ({ shell, library, storage, page }) => {
  await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
  await shell.goto(urls.view('biblioteca'));
  await library.toggleFavorite(TITLE['rust-100']);
  await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute('aria-pressed', 'false');

  await shell.openFromMenu('recorrido');
  await page.getByRole('checkbox', { name: /^Marcar como completado/ }).first().click();
  await page.reload();
  await shell.openFromMenu('biblioteca');

  await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute('aria-pressed', 'false');
});

test('(h) with a storage that reads and does not write, the star changes in memory and the footer warns', async ({ shell, library, storage }) => {
  await storage.blockWrites();
  await shell.goto(urls.view('biblioteca'));
  await expect(shell.saveStatus('Guardado en este navegador')).toBeVisible();

  await library.toggleFavorite(TITLE['go-tour']);

  await expect(library.favoriteButton(TITLE['go-tour'])).toHaveAttribute('aria-pressed', 'true');
  await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
});

test.describe('(i) where the filters live', () => {
  test('the menu keeps the filters and a reload drops them', async ({ shell, library, page }) => {
    await shell.goto(urls.view('biblioteca'));
    await library.chooseLanguage('Go');
    await library.chooseCategory('Lectura');
    await expect(library.cardTitles).toHaveText(titlesOf(['go-tests', 'go-examples']));

    await shell.openFromMenu('recorrido');
    await shell.openFromMenu('biblioteca');
    await expect(library.languageFilter).toHaveValue('go');
    await expect(library.category('Lectura')).toHaveAttribute('aria-pressed', 'true');
    await expect(library.cardTitles).toHaveText(titlesOf(['go-tests', 'go-examples']));

    await page.reload();
    await expect(library.languageFilter).toHaveValue('all');
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  });

  test('«Borrar todo» keeps the filters and the library shows the blank progress', async ({ shell, library, storage, page }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));
    await library.chooseLanguage('Rust');

    await shell.openFromMenu('metodo');
    await page.getByRole('button', { name: 'Borrar mi progreso' }).click();
    await page.getByRole('button', { name: 'Borrar todo' }).click();
    await shell.openFromMenu('biblioteca');

    await expect(library.languageFilter).toHaveValue('rust');
    await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('(j) the keyboard', () => {
  test('Tab goes through the controls in order and reaches the first star', async ({ shell, library, page }) => {
    await shell.goto(urls.view('biblioteca'));
    await library.search.focus();

    const order = [
      library.languageFilter,
      library.costFilter,
      library.category('Todos'),
      library.category('Ejercicios'),
      library.category('Proyectos'),
      library.category('Lectura'),
      library.category('Herramientas'),
      library.favoritesOnly,
      library.favoriteButton(TITLE['rust-100']),
    ];
    for (const control of order) {
      await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
    }
  });

  test('Enter and Space activate the chips, the checkbox and the stars, and the focus stays', async ({ shell, library, page }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.category('Lectura').focus();
    await page.keyboard.press('Enter');
    await expect(library.category('Lectura')).toHaveAttribute('aria-pressed', 'true');
    await expect(library.category('Lectura')).toBeFocused();

    await library.category('Todos').focus();
    await page.keyboard.press('Space');
    await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'true');

    const star = library.favoriteButton(TITLE['go-tour']);
    await star.focus();
    await page.keyboard.press('Enter');
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await expect(star).toBeFocused();

    await library.favoritesOnly.focus();
    await page.keyboard.press('Space');
    await expect(library.favoritesOnly).toBeChecked();
    await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
  });
});

test('(k) a card shows its content and its link opens the resource in a new tab', async ({ shell, library }) => {
  await shell.goto(urls.view('biblioteca'));
  const card = library.card(TITLE['go-tour']);

  await expect(card.getByText('Go', { exact: true })).toBeVisible();
  await expect(card.getByText('Gratis', { exact: true })).toBeVisible();
  await expect(card.getByText('Elegido para vos', { exact: true })).toBeVisible();
  await expect(card.getByText('Lecciones ejecutables en el navegador · Inglés')).toBeVisible();
  await expect(card.getByText('Para vos:')).toBeVisible();
  await expect(library.detailSummary(TITLE['go-tour'])).toBeVisible();
  await expect(library.card(TITLE['context7']).getByText('Go + Rust', { exact: true })).toBeVisible();
  await expect(library.card(TITLE['context7']).getByText('Gratis + pago', { exact: true })).toBeVisible();
  await expect(library.link(TITLE['go-tour'])).toHaveAttribute('href', 'https://go.dev/tour/');
  await expect(library.link(TITLE['go-tour'])).toHaveAttribute('target', '_blank');
  await expect(library.link(TITLE['go-tour'])).toHaveAttribute('rel', 'noopener noreferrer');
});

test('(l) switching the language on the library keeps the filters', async ({ shell, library }) => {
  await shell.goto(urls.view('biblioteca'));
  await library.searchFor('tour of');
  await library.chooseLanguage('Go');

  await shell.switchLanguage('go');

  await expect(library.search).toHaveValue('tour of');
  await expect(library.languageFilter).toHaveValue('go');
  await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
});
```

- **Pasos:**
  1. Escribir la spec y correrla contra el build del legacy: `npm run build` y `E2E_PORT=4191 npm run test:e2e -- specs/library.spec.ts`. Todo tiene que pasar.
  2. Correrla tres veces seguidas (`--repeat-each=3 --retries=0`) para descartar pruebas inestables.
  3. `npx prettier --write qa/e2e/specs/library.spec.ts`, `npm run typecheck`, `npm run lint` y la red completa (`E2E_PORT=4191 npm run test:e2e`).
  4. Commit: `test(e2e): la Biblioteca de hoy: búsqueda, filtros, favoritos, teclado, tarjeta e idioma`.
- **Compuerta:** los 22 casos de la spec en verde contra el legacy, tres veces, y la red completa sin cambios.
- **Si una prueba falla contra el legacy:** el valor esperado está mal escrito o el legacy hace otra cosa. Se compara con `renderResourceResults` y con la spec, y se informa a K; no se cambia la expectativa para que pase.

## 2. Unidad 2 · El arnés, lo compartido, el modelo y la página sin montar (K, S y P; ondas 1 y 2)

**Cubre:** FR-007 a FR-012, FR-014, FR-015, FR-016, FR-017, FR-018, FR-022, FR-023, FR-024, FR-025, FR-030, FR-032 a FR-035; SC-010 y SC-012; US5.

### Tarea 2.1 · La pila de componentes y fishery (T005, K)

- **Si T001 encontró la pila de DOM y fishery instaladas:** no se hace nada.
- **Si falta alguna:** con el permiso P2 (§«Descargas y permisos»), se instala sólo lo que falta:
  ```sh
  npm install --save-exact --save-dev jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 @testing-library/jest-dom@7.0.1 fishery@2.4.0
  ```
- **Comprobaciones:**
  - `git diff package.json` muestra sólo `devDependencies`, con versiones sin `^`;
  - `npm ci --offline` reproduce el árbol;
  - `npm run build` deja el script del dist con el mismo sha256 que en T001: nada de esto es alcanzable desde `main.tsx`.
- **Commit:** `build(front): jsdom, Testing Library y fishery para las specs de componentes`.

### Tarea 2.2 · Los dos proyectos de Vitest, el setup y la guarda de `useStore` (T006, K)

- **Si T001 encontró `frontend/src/vitest-setup.ts`, los `projects` y la guarda:** no se cambia ningún archivo. Sólo se corre la prueba de la guarda del paso 4. Si no rechaza el temporal, es un hallazgo y K suma el bloque de ESLint de abajo.
- **Archivos:** `frontend/vitest.config.ts`, `frontend/src/vitest-setup.ts` (nuevo) y `eslint.config.ts`. Su contenido es el mismo que el del plan de F5 (§2.1), para que el segundo en llegar no tenga nada que resolver.

```ts
// frontend/vitest.config.ts
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Vite's root is frontend/src: without this the cache would land in frontend/src/node_modules.
    cacheDir: resolve(import.meta.dirname, '../node_modules/.vite'),
    test: {
      projects: [
        {
          extends: true,
          test: { name: 'node', environment: 'node', include: ['**/*.spec.ts'] },
        },
        {
          extends: true,
          test: {
            name: 'jsdom',
            environment: 'jsdom',
            include: ['**/*.spec.tsx'],
            setupFiles: [resolve(import.meta.dirname, 'src/vitest-setup.ts')],
          },
        },
      ],
    },
  }),
);
```

La raíz sólo lleva `projects`. En Vitest 5, los proyectos en línea heredan la raíz y concatenan sus arreglos, así que un `include` en la raíz se sumaría al de `jsdom` (research.md, tabla). El comentario del `cacheDir` ya existe y se conserva.

```ts
// frontend/src/vitest-setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

El bloque nuevo de `eslint.config.ts`, después del de `frontend/src/**/*.{js,jsx,ts,tsx}`:

```ts
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='useStore'][arguments.length<2]",
          message: 'useStore needs a small selector: never subscribe to the whole store (F2a, Q3).',
        },
      ],
    },
  },
```

- **Pasos:**
  1. **La prueba del proyecto, en rojo.** `frontend/src/vitest-setup.probe.spec.tsx`, descartable:
     ```tsx
     import { render, screen } from '@testing-library/react';
     import { expect, it } from 'vitest';

     it('renders in jsdom', () => {
       render(<p>hola</p>);
       expect(screen.getByText('hola')).toBeInTheDocument();
     });
     ```
     `npm run test:unit -- src/vitest-setup.probe.spec.tsx` falla: el proyecto de hoy no toma `*.spec.tsx`.
  2. Escribir la configuración y el setup. La prueba pasa en el proyecto `jsdom`, y `npm run test:unit` corre en `node` la misma cantidad de pruebas que T001.
  3. Se borra la prueba descartable.
  4. **La guarda, en rojo y después en verde.** `frontend/src/app/use-store-probe.tsx`, descartable:
     ```tsx
     import { useStore } from 'zustand';
     import { createStore } from 'zustand/vanilla';

     const probeStore = createStore(() => ({ revision: 0 }));

     const UseStoreProbe = () => {
       const state = useStore(probeStore);
       return <p>{state.revision}</p>;
     };

     export default UseStoreProbe;
     ```
     - Sin el bloque, `npx eslint frontend/src/app/use-store-probe.tsx` pasa: ése es el rojo.
     - Con el bloque, falla con el mensaje de arriba.
     - `useStore(probeStore, (state) => state.revision)` pasa.
     - Se borra el temporal.
  5. `npm run typecheck`, `npm run lint` y `npm run format:check`.
- **Commit:** `test(front): el arnés de componentes de Vitest con jsdom y la guarda de useStore`.
- **Compuerta:** los pasos 2 y 4, y SC-012: `grep -n library frontend/vitest.config.ts frontend/src/vitest-setup.ts eslint.config.ts` no imprime nada.

### Tarea 2.3 · `toggleItem` baja a `entities/guide` (T007, S)

- **Si T001 la encontró exportada por `entities/guide`:** no se hace nada.
- **Archivos:**
  - `frontend/src/entities/guide/model/toggle-item.ts` y `toggle-item.spec.ts`, nuevos;
  - `frontend/src/entities/guide/index.ts`;
  - `frontend/app.js`.
- **Produce:** `export function toggleItem(collection: string[], id: string): void;`. Agrega `id` al final si falta, o lo quita, y **muta** el arreglo que recibe: el progreso se muta en el lugar antes de `routeStore.save()`.

```ts
// frontend/src/entities/guide/model/toggle-item.spec.ts
import { describe, expect, it } from 'vitest';
import { toggleItem } from './toggle-item';

describe('toggleItem', () => {
  it('adds a missing id at the end of the same array', () => {
    const favorites = ['rust-100'];

    toggleItem(favorites, 'go-tour');

    expect(favorites).toEqual(['rust-100', 'go-tour']);
  });

  it('removes an id that is there and keeps the order of the rest', () => {
    const favorites = ['rust-100', 'go-tour', 'context7'];

    toggleItem(favorites, 'go-tour');

    expect(favorites).toEqual(['rust-100', 'context7']);
  });

  it('returns to the start when it toggles twice', () => {
    const completed = ['rust-ownership'];

    toggleItem(completed, 'rust-first-session');
    toggleItem(completed, 'rust-first-session');

    expect(completed).toEqual(['rust-ownership']);
  });
});
```

```ts
// frontend/src/entities/guide/model/toggle-item.ts
export function toggleItem(collection: string[], id: string): void {
  const index = collection.indexOf(id);
  if (index === -1) collection.push(id);
  else collection.splice(index, 1);
}
```

- **Pasos:**
  1. La spec, con `toggleItem` lanzando `not implemented`. `npm run test:unit -- src/entities/guide/model/toggle-item.spec.ts` falla. Commit: `test(front): toggleItem alterna un id del progreso del recorrido (rojo)`.
  2. La implementación, y `export { toggleItem } from './model/toggle-item';` en el índice.
  3. En `frontend/app.js`:
     - el primer import pasa a `import { routeStore, toggleItem } from './src/entities/guide';`;
     - se borra la función local `toggleItem`, sin tocar ninguna llamada.
  4. `node qa/app-shell-check.ts` (los pasos, los hitos y los favoritos la usan), `node qa/boot-check.ts`, `node qa/seams-guard-check.ts`, `npm test` y `npm run lint`.
  5. Commit: `refactor(front): toggleItem vive en entities/guide y app.js la importa`.
- **Compuerta:** el paso 4, sin cambiar un valor esperado.

### Tarea 2.4 · El almacén del bundle de `app.js` en `app-shell-check` y los dos escenarios de `favorite` (T008, S)

- **Cuándo:** después de T007.
- **Si T001 encontró el `routeStore` del arnés:** se usa el que está y se hace sólo el paso 4, con el ayudante equivalente.
- **Archivos:** `qa/lib/sources.ts`, `qa/lib/legacy-sources.ts`, `qa/lib/app-shell-harness.ts` y `qa/app-shell-check.ts`.
- **Produce:**

```ts
// qa/lib/sources.ts: a new export next to runModule
export function runModuleEntry<T>(context: vm.Context, name: string, contents: string): T {
  const key = `entry:${name}|${contents}`;
  let wrapped = moduleCache.get(key);
  if (wrapped === undefined) {
    const bundle = build(name, {
      stdin: { contents, resolveDir: repoRoot, loader: 'js', sourcefile: name },
      format: 'iife',
      globalName: MODULE_GLOBAL_NAME,
      platform: 'browser',
      target: 'es2020',
      legalComments: 'inline',
    });
    wrapped = `(function () {\n${bundle}\nreturn ${MODULE_GLOBAL_NAME};\n})()`;
    moduleCache.set(key, wrapped);
  }
  return vm.runInContext(wrapped, context, { filename: name }) as T;
}
```

```ts
// qa/lib/legacy-sources.ts
const APP_SHELL_ENTRY = [
  `export { startApp } from './${APP_SHELL_SOURCE}';`,
  "export { routeStore, toggleItem } from './frontend/src/entities/guide';",
].join('\n');

export interface AppShellRouteStore {
  getProgress(): { favorites: string[]; completed: string[] };
  save(): boolean;
}

export interface AppShellModule {
  startApp(): void;
  routeStore: AppShellRouteStore;
  toggleItem(collection: string[], id: string): void;
}

export function loadAppShell(context: vm.Context): AppShellModule {
  return runModuleEntry<AppShellModule>(context, 'app-shell-entry.js', APP_SHELL_ENTRY);
}
```

Así `startApp`, `routeStore` y `toggleItem` salen del mismo bundle: el almacén que abre `app.js` es el que usa la prueba, como pasa en el navegador con la página. `boot-check` también llama a `loadAppShell`, sólo para `startApp`, y no cambia.

```ts
// qa/lib/app-shell-harness.ts
export interface LoadedHarness extends Harness {
  routeStore: AppShellRouteStore;
  // The library page saves this way: toggle the id in the shared progress, then save.
  toggleFavorite(id: string): void;
}

export function buildHarness(options: HarnessOptions = {}): LoadedHarness {
  const harness = createHarness(options);
  const shell = loadAppShell(harness.context);
  shell.startApp();
  return {
    ...harness,
    routeStore: shell.routeStore,
    toggleFavorite(id) {
      shell.toggleItem(shell.routeStore.getProgress().favorites, id);
      shell.routeStore.save();
    },
  };
}
```

El comentario de `toggleFavorite` es la referencia puntual que permite `AGENTS.md`: dice qué consumidor simula. Los imports de `app-shell-harness.ts` suman `type AppShellRouteStore` de `./legacy-sources.ts`.

- **Los dos escenarios** (`qa/app-shell-check.ts`), con los mismos valores esperados:
  - «almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar»: `await clickAction(harness, { action: 'favorite', id: 'rustlings' });` pasa a `harness.toggleFavorite('rustlings');`;
  - «almacén: un cambio de otra pestaña se fusiona y gana el idioma y los minutos de esta»: `await clickAction(harness, { action: 'favorite', id: 'go-tour' });` pasa a `harness.toggleFavorite('go-tour');`.
- **Pasos:**
  1. Los tres cambios de `qa/lib/`. `node qa/app-shell-check.ts` sigue en verde, con la misma cantidad de escenarios.
  2. Los dos reemplazos. Los dos escenarios pasan **contra el legacy** con sus aserciones intactas: el `save()` de la página y el de `app.js` son el mismo almacén.
  3. `node qa/boot-check.ts`, `npm run typecheck` y `npm run lint`.
  4. Commit: `test(qa): app-shell-check guarda los favoritos por el camino de la página`.
- **Compuerta:** el paso 2, y `git diff qa/app-shell-check.ts` cambia sólo esas dos líneas.

### Tarea 2.5 · El pie de guardado sigue a la revisión del recorrido (T009, S)

- **Cuándo:** después de T008.
- **Si T001 encontró la suscripción:** se corre el escenario de abajo. Si pasa, no se cambia nada. Si falla porque el oyente no actualiza el pie, se suma `updateSaveLabel()` al oyente que está.
- **Archivos:** `qa/app-shell-check.ts` (un escenario nuevo, después de «almacenamiento sin escritura…») y `frontend/app.js`.
- **La prueba en rojo:**

```ts
await test('almacén: un guardado de otro consumidor actualiza el pie', () => {
  const harness = buildHarness({ stored: localProgress, writesBlocked: true });
  assert.equal(harness.elements['save-label']?.textContent, 'Guardado en este navegador');

  harness.toggleFavorite('go-tour');

  assert.equal(harness.elements['save-label']?.textContent, 'Exportá para conservar tu avance');
});
```

Falla hoy: el `save()` de la página no pasa por el de `app.js`, que es el que actualiza el pie.

- **La implementación:** en `frontend/app.js`, inmediatamente después de `routeStore.open(data);`, va `routeStore.changes.subscribe(updateSaveLabel);`. `updateSaveLabel` es una declaración de función de `startApp`, así que ya está definida. El `save()` de `app.js` sigue llamándola: el pie se escribe dos veces con el mismo texto, como hoy.
- **Lo que no entra:** los contadores de la barra lateral. Nada de la Biblioteca los cambia y no habría una prueba en rojo. F9 suma su línea al oyente, con su escenario (research.md, R7).
- **Pasos:**
  1. El escenario en rojo. Commit: `test(qa): un guardado de otro consumidor actualiza el pie (rojo)`.
  2. La línea de `app.js`. `node qa/app-shell-check.ts` (todos), `node qa/boot-check.ts` (los oyentes del DOM no cambian), `npm test` y la red E2E.
  3. Commit: `feat(front): el pie de guardado sigue a la revisión del recorrido`.
- **Compuerta:** el paso 2.

### Tarea 2.6 · El modelo de la Biblioteca y su factory (T010, P)

- **Cuándo:** después de T005 y T006.
- **Archivos nuevos** en `frontend/src/pages/library/model/`:
  - `filter-resources.ts` y `filter-resources.spec.ts`;
  - `resource-labels.ts` y `resource-labels.spec.ts`;
  - `guide-resource.factory.ts`.
- **También cambia** `frontend/src/shared/config/url-grammar.ts`: sólo suma los tres tipos y las tres listas de valores de la Biblioteca. La clave de la URL y `withLanguageQuery` llegan en T017 y T018.

```ts
// frontend/src/shared/config/url-grammar.ts, additions after LINK_LANGUAGES
export const LIBRARY_LANGUAGES = ['all', 'rust', 'go'] as const;
export const LIBRARY_COSTS = ['all', 'gratis', 'mixto'] as const;
export const LIBRARY_CATEGORIES = ['all', 'ejercicios', 'proyectos', 'lectura', 'herramientas'] as const;
export type LibraryLanguage = (typeof LIBRARY_LANGUAGES)[number];
export type LibraryCost = (typeof LIBRARY_COSTS)[number];
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];
```

```ts
// frontend/src/pages/library/model/guide-resource.factory.ts
import { Factory } from 'fishery';
import type { GuideResource } from '../../../entities/guide';

export const guideResourceFactory = Factory.define<GuideResource>(({ sequence }) => ({
  id: `resource-${sequence}`,
  title: `Recurso ${sequence}`,
  url: `https://example.test/${sequence}`,
  languages: ['rust'],
  category: 'lectura',
  cost: 'gratis',
  format: 'Formato de prueba',
  description: 'Texto de prueba.',
  why: 'Motivo de prueba.',
  caveat: 'Advertencia de prueba.',
  featured: false,
}));
```

Los textos por omisión no contienen ninguna de las consultas de las specs. Los arreglos (`languages`) se pasan siempre enteros: fishery los reemplaza, no los mezcla.

```ts
// frontend/src/pages/library/model/filter-resources.ts
import type { GuideResource } from '../../../entities/guide';
import type {
  LibraryCategory,
  LibraryCost,
  LibraryLanguage,
} from '../../../shared/config/url-grammar';
import { normalizeSearchText } from '../../../shared/lib/normalize-search-text';

export interface LibraryFilters {
  query: string;
  language: LibraryLanguage;
  cost: LibraryCost;
  category: LibraryCategory;
  favoritesOnly: boolean;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  query: '',
  language: 'all',
  cost: 'all',
  category: 'all',
  favoritesOnly: false,
};

function searchableText(resource: GuideResource): string {
  return normalizeSearchText(
    [resource.title, resource.description, resource.why, resource.format, ...resource.languages].join(' '),
  );
}

function matchesLanguage(resource: GuideResource, language: LibraryLanguage): boolean {
  return (
    language === 'all' ||
    resource.languages.includes(language) ||
    resource.languages.includes('both')
  );
}

export function filterResources(
  resources: readonly GuideResource[],
  filters: LibraryFilters,
  favorites: readonly string[],
): GuideResource[] {
  const needle = normalizeSearchText(filters.query.trim());
  return resources.filter(
    (resource) =>
      (needle === '' || searchableText(resource).includes(needle)) &&
      matchesLanguage(resource, filters.language) &&
      (filters.category === 'all' || resource.category === filters.category) &&
      (filters.cost === 'all' || resource.cost === filters.cost) &&
      (!filters.favoritesOnly || favorites.includes(resource.id)),
  );
}
```

La función flecha de `filter` suma 9 de complejidad y `matchesLanguage`, 3. El predicado de `renderResourceResults` (11) sale en T013.

```ts
// frontend/src/pages/library/model/resource-labels.ts
import type { GuideResource } from '../../../entities/guide';

export function languageLabel(languages: GuideResource['languages']): string {
  if (languages.includes('both')) return 'Go + Rust';
  return languages.map((language) => (language === 'rust' ? 'Rust' : 'Go')).join(' + ');
}

export function costLabel(cost: GuideResource['cost']): string {
  return cost === 'gratis' ? 'Gratis' : 'Gratis + pago';
}

export function favoriteLabel(title: string, isFavorite: boolean): string {
  return `${isFavorite ? 'Quitar de' : 'Guardar en'} favoritos: ${title}`;
}

export function resultsLabel(shown: number, total: number): string {
  return `${shown} de ${total} recursos · abrí cada uno a tu ritmo`;
}
```

**Las specs.** Los valores esperados se escriben a mano, a partir de las reglas de la spec y de research.md (R4):

```ts
// frontend/src/pages/library/model/filter-resources.spec.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIBRARY_FILTERS, filterResources, type LibraryFilters } from './filter-resources';
import { guideResourceFactory } from './guide-resource.factory';

const rustExercises = guideResourceFactory.build({
  id: 'rust-100',
  title: '100 Exercises to Learn Rust',
  languages: ['rust'],
  category: 'ejercicios',
  format: 'Ejercicios con pruebas · Inglés',
});
const rustRover = guideResourceFactory.build({
  id: 'rust-rover',
  languages: ['rust'],
  category: 'ejercicios',
  cost: 'mixto',
  description: 'Los mismos ejercicios dentro del IDE.',
});
const context7 = guideResourceFactory.build({
  id: 'context7',
  title: 'Context7',
  languages: ['both'],
  category: 'herramientas',
  cost: 'mixto',
});
const tourOfGo = guideResourceFactory.build({
  id: 'go-tour',
  title: 'A Tour of Go',
  languages: ['go'],
  category: 'ejercicios',
  format: 'Lecciones ejecutables en el navegador · Inglés',
  caveat: 'No hace falta completar todo de una vez.',
});
const goTests = guideResourceFactory.build({
  id: 'go-tests',
  languages: ['go'],
  category: 'lectura',
  why: 'Escribí la prueba antes que el código.',
});
const twoLanguages = guideResourceFactory.build({
  id: 'pair',
  languages: ['rust', 'go'],
  category: 'proyectos',
});
const CATALOG = [rustExercises, rustRover, context7, tourOfGo, goTests, twoLanguages];
const EVERY_ID = ['rust-100', 'rust-rover', 'context7', 'go-tour', 'go-tests', 'pair'];

const idsFor = (filters: Partial<LibraryFilters>, favorites: string[] = []) =>
  filterResources(CATALOG, { ...DEFAULT_LIBRARY_FILTERS, ...filters }, favorites).map(
    (resource) => resource.id,
  );

describe('the search', () => {
  it('without filters keeps every resource in the received order', () => {
    expect(idsFor({})).toEqual(EVERY_ID);
  });

  it('matches the whole query as a substring, not word by word', () => {
    expect(idsFor({ query: 'tour of' })).toEqual(['go-tour']);
    expect(idsFor({ query: 'of tour' })).toEqual([]);
  });

  it('ignores accents and case and trims the query', () => {
    expect(idsFor({ query: 'EJÉRCICIOS' })).toEqual(['rust-100', 'rust-rover']);
    expect(idsFor({ query: '  ejercicios ' })).toEqual(['rust-100', 'rust-rover']);
  });

  it('does not filter with an empty query or one of only spaces', () => {
    expect(idsFor({ query: '' })).toEqual(EVERY_ID);
    expect(idsFor({ query: '   ' })).toEqual(EVERY_ID);
  });

  it('looks at the title, the description, the why, the format and the language ids', () => {
    expect(idsFor({ query: 'tour' })).toEqual(['go-tour']);
    expect(idsFor({ query: 'mismos ejercicios' })).toEqual(['rust-rover']);
    expect(idsFor({ query: 'prueba antes' })).toEqual(['go-tests']);
    expect(idsFor({ query: 'navegador' })).toEqual(['go-tour']);
    expect(idsFor({ query: 'both' })).toEqual(['context7']);
  });

  it('does not look at the access, the type, the caveat, the url or the id', () => {
    expect(idsFor({ query: 'gratis' })).toEqual([]);
    expect(idsFor({ query: 'mixto' })).toEqual([]);
    expect(idsFor({ query: 'herramientas' })).toEqual([]);
    expect(idsFor({ query: 'completar' })).toEqual([]);
    expect(idsFor({ query: 'example.test' })).toEqual([]);
    expect(idsFor({ query: 'rust-rover' })).toEqual([]);
  });
});

describe('language, access and type', () => {
  it('lets a language through the resources that list it or list both', () => {
    expect(idsFor({ language: 'rust' })).toEqual(['rust-100', 'rust-rover', 'context7', 'pair']);
    expect(idsFor({ language: 'go' })).toEqual(['context7', 'go-tour', 'go-tests', 'pair']);
  });

  it('compares the access and the type by equality', () => {
    expect(idsFor({ cost: 'mixto' })).toEqual(['rust-rover', 'context7']);
    expect(idsFor({ category: 'lectura' })).toEqual(['go-tests']);
  });

  it('combines the five criteria with and', () => {
    expect(idsFor({ language: 'go', cost: 'mixto' })).toEqual(['context7']);
    expect(idsFor({ query: 'tour of', language: 'go', cost: 'gratis' })).toEqual(['go-tour']);
    expect(idsFor({ language: 'rust', category: 'ejercicios', cost: 'gratis' })).toEqual(['rust-100']);
  });
});

describe('favorites only', () => {
  it('keeps the saved ids in the order of the resources', () => {
    expect(idsFor({ favoritesOnly: true }, ['go-tour', 'rust-100'])).toEqual(['rust-100', 'go-tour']);
    expect(idsFor({ favoritesOnly: true }, [])).toEqual([]);
  });

  it('ignores the favorites when the criterion is off', () => {
    expect(idsFor({ favoritesOnly: false }, ['go-tour'])).toEqual(EVERY_ID);
  });
});
```

```ts
// frontend/src/pages/library/model/resource-labels.spec.ts
import { describe, expect, it } from 'vitest';
import type { GuideResource } from '../../../entities/guide';
import { costLabel, favoriteLabel, languageLabel, resultsLabel } from './resource-labels';

describe('languageLabel', () => {
  it.each<[GuideResource['languages'], string]>([
    [['rust'], 'Rust'],
    [['go'], 'Go'],
    [['both'], 'Go + Rust'],
    [['rust', 'go'], 'Rust + Go'],
    [['go', 'rust'], 'Go + Rust'],
  ])('labels %j as %s', (languages, label) => {
    expect(languageLabel(languages)).toBe(label);
  });
});

describe('the other labels', () => {
  it('names the access', () => {
    expect(costLabel('gratis')).toBe('Gratis');
    expect(costLabel('mixto')).toBe('Gratis + pago');
  });

  it('names the star after what it will do', () => {
    expect(favoriteLabel('A Tour of Go', false)).toBe('Guardar en favoritos: A Tour of Go');
    expect(favoriteLabel('A Tour of Go', true)).toBe('Quitar de favoritos: A Tour of Go');
  });

  it('counts the shown resources over the received list', () => {
    expect(resultsLabel(1, 15)).toBe('1 de 15 recursos · abrí cada uno a tu ritmo');
    expect(resultsLabel(0, 0)).toBe('0 de 0 recursos · abrí cada uno a tu ritmo');
  });
});
```

- **Pasos:**
  1. Los dos módulos, con sus firmas lanzando `not implemented`, la factory y las specs. `npm run test:unit -- src/pages/library/model` falla por comportamiento. Commit: `test(front): el filtro y las etiquetas de la Biblioteca (rojo)`.
  2. La implementación. Las specs pasan, y `npm run typecheck`, `npm run lint` y `npm run format:check` pasan.
  3. Commit: `feat(front): el modelo de la Biblioteca`.
- **Compuerta:** el paso 2 y `npm run lint` sin avisos nuevos.

### Tarea 2.7 · La página, sin montar, y su spec (T011, P)

- **Cuándo:** después de T007 y T010.
- **Archivos nuevos:**
  - en `frontend/src/pages/library/`: `index.ts`, `model/use-library-filters.ts` y, en `ui/`, `LibraryPage.tsx` (con `LibraryPage.spec.tsx`), `LibraryFiltersBar.tsx`, `ResourceCard.tsx` y `EmptyLibrary.tsx`;
  - todavía no hay `library.css`: las reglas siguen en `styles.css` hasta T019.
- **Produce** (la API pública del slice hasta T018):

```ts
// frontend/src/pages/library/index.ts
export { default as LibraryPage } from './ui/LibraryPage';
export { DEFAULT_LIBRARY_FILTERS, type LibraryFilters } from './model/filter-resources';
```

```ts
// frontend/src/pages/library/model/use-library-filters.ts
import { useState } from 'react';
import { DEFAULT_LIBRARY_FILTERS, type LibraryFilters } from './filter-resources';

export type LibraryFiltersChange = Partial<LibraryFilters> | null;

const useLibraryFilters = (
  initialFilters: LibraryFilters,
  onFiltersChange: (filters: LibraryFilters) => void,
): [LibraryFilters, (change: LibraryFiltersChange) => void] => {
  const [filters, setFilters] = useState(initialFilters);
  const changeFilters = (change: LibraryFiltersChange) => {
    const next = change === null ? DEFAULT_LIBRARY_FILTERS : { ...filters, ...change };
    setFilters(next);
    onFiltersChange(next);
  };
  return [filters, changeFilters];
};

export default useLibraryFilters;
```

Es la sesión transitoria de research.md (R1): el adaptador guarda el último conjunto y la página lo recibe al montar. T018 cambia el cuerpo por `useQueryStates` y borra los dos parámetros. `changeFilters(null)` limpia, como el setter de nuqs.

```tsx
// frontend/src/pages/library/ui/LibraryFiltersBar.tsx
import type { RefObject } from 'react';
import {
  LIBRARY_COSTS,
  LIBRARY_LANGUAGES,
  type LibraryCategory,
} from '../../../shared/config/url-grammar';
import type { LibraryFilters } from '../model/filter-resources';

interface LibraryFiltersBarProps {
  filters: LibraryFilters;
  searchRef: RefObject<HTMLInputElement | null>;
  onChange: (change: Partial<LibraryFilters>) => void;
}

const CATEGORY_CHIPS: ReadonlyArray<{ value: LibraryCategory; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'ejercicios', label: 'Ejercicios' },
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'lectura', label: 'Lectura' },
  { value: 'herramientas', label: 'Herramientas' },
];

const LibraryFiltersBar = ({ filters, searchRef, onChange }: LibraryFiltersBarProps) => (
  <>
    <div className="filter-bar">
      <label className="search-wrap">
        <span aria-hidden="true">⌕</span>
        <input
          ref={searchRef}
          id="resource-search"
          type="search"
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder="Buscar un recurso, tema o formato…"
          aria-label="Buscar recursos"
        />
      </label>
      <select
        id="filter-language"
        aria-label="Filtrar por lenguaje"
        value={filters.language}
        onChange={(event) =>
          onChange({
            language: LIBRARY_LANGUAGES.find((value) => value === event.target.value) ?? 'all',
          })
        }
      >
        <option value="all">Todos los lenguajes</option>
        <option value="rust">Rust</option>
        <option value="go">Go</option>
      </select>
      <select
        id="filter-cost"
        aria-label="Filtrar por acceso"
        value={filters.cost}
        onChange={(event) =>
          onChange({ cost: LIBRARY_COSTS.find((value) => value === event.target.value) ?? 'all' })
        }
      >
        <option value="all">Cualquier acceso</option>
        <option value="gratis">Acceso gratuito</option>
        <option value="mixto">Gratis + pago</option>
      </select>
    </div>
    <div className="filter-secondary">
      <div className="filter-chips" role="group" aria-label="Tipo de recurso">
        {CATEGORY_CHIPS.map(({ value, label }) => (
          <button
            className="filter-chip"
            aria-pressed={filters.category === value}
            onClick={() => onChange({ category: value })}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="favorite-filter">
        <input
          id="filter-favorites"
          type="checkbox"
          checked={filters.favoritesOnly}
          onChange={(event) => onChange({ favoritesOnly: event.target.checked })}
        />
        {' Solo mis favoritos'}
      </label>
    </div>
  </>
);

export default LibraryFiltersBar;
```

Los botones no llevan `type`, como los de hoy: la comparación del DOM los compara. El texto « Solo mis favoritos» es una sola expresión, para que React deje un solo nodo de texto con su espacio inicial.

```tsx
// frontend/src/pages/library/ui/ResourceCard.tsx
import type { GuideResource } from '../../../entities/guide';
import { costLabel, favoriteLabel, languageLabel } from '../model/resource-labels';

interface ResourceCardProps {
  resource: GuideResource;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const ResourceCard = ({ resource, isFavorite, onToggleFavorite }: ResourceCardProps) => (
  <article className="resource-card">
    <div className="resource-top">
      <div className="resource-tags">
        <span className={resource.featured ? 'pill accent' : 'pill'}>
          {languageLabel(resource.languages)}
        </span>
        <span className="pill">{costLabel(resource.cost)}</span>
        {resource.featured && <span className="pill accent">Elegido para vos</span>}
      </div>
      <button
        className="favorite-button"
        aria-label={favoriteLabel(resource.title, isFavorite)}
        aria-pressed={isFavorite}
        onClick={() => onToggleFavorite(resource.id)}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
    <h2>{resource.title}</h2>
    <div className="resource-format">{resource.format}</div>
    <p>{resource.description}</p>
    <p className="resource-fit">
      <strong>Para vos:</strong>
      {` ${resource.why}`}
    </p>
    <details>
      <summary>Antes de empezar</summary>
      <p>{resource.caveat}</p>
    </details>
    <a className="resource-link" href={resource.url} target="_blank" rel="noopener noreferrer">
      {'Explorar recurso '}
      <span aria-hidden="true">↗</span>
      <span className="sr-only" />
    </a>
  </article>
);

export default ResourceCard;
```

```tsx
// frontend/src/pages/library/ui/EmptyLibrary.tsx
interface EmptyLibraryProps {
  onClear: () => void;
}

const EmptyLibrary = ({ onClear }: EmptyLibraryProps) => (
  <div className="empty-state">
    <h2>Ningún recurso con esos filtros.</h2>
    <p>Probá otro término o volvé a ver la biblioteca completa.</p>
    <button className="button secondary" onClick={onClear}>
      Limpiar filtros
    </button>
  </div>
);

export default EmptyLibrary;
```

```tsx
// frontend/src/pages/library/ui/LibraryPage.tsx
import { useRef } from 'react';
import { useStore } from 'zustand';
import { routeStore, toggleItem, type GuideResource } from '../../../entities/guide';
import { filterResources, type LibraryFilters } from '../model/filter-resources';
import { resultsLabel } from '../model/resource-labels';
import useLibraryFilters from '../model/use-library-filters';
import EmptyLibrary from './EmptyLibrary';
import LibraryFiltersBar from './LibraryFiltersBar';
import ResourceCard from './ResourceCard';

interface LibraryPageProps {
  resources: GuideResource[];
  initialFilters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
}

const LibraryPage = ({ resources, initialFilters, onFiltersChange }: LibraryPageProps) => {
  useStore(routeStore.changes, (state) => state.revision);
  const [filters, changeFilters] = useLibraryFilters(initialFilters, onFiltersChange);
  const searchRef = useRef<HTMLInputElement>(null);
  const favorites = routeStore.getProgress().favorites;
  const visible = filterResources(resources, filters, favorites);

  const toggleFavorite = (id: string) => {
    toggleItem(routeStore.getProgress().favorites, id);
    routeStore.save();
  };

  const clearFilters = () => {
    changeFilters(null);
    searchRef.current?.focus();
  };

  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          {' RECURSOS CON INTENCIÓN'}
        </div>
        <h1>
          Una biblioteca.
          <br />
          <em>Tu propia ruta.</em>
        </h1>
        <p>
          Todo lo que revisamos, en un lugar. Elegí según lo que necesitás hoy; guardá tus favoritos
          para volver sin buscar de nuevo.
        </p>
      </div>
      <LibraryFiltersBar filters={filters} searchRef={searchRef} onChange={changeFilters} />
      <p id="resource-results-label" className="resource-results-label" role="status" aria-live="polite">
        {resultsLabel(visible.length, resources.length)}
      </p>
      <div id="resource-grid" className="resource-grid">
        {visible.length > 0 ? (
          visible.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isFavorite={favorites.includes(resource.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))
        ) : (
          <EmptyLibrary onClear={clearFilters} />
        )}
      </div>
      <p className="resource-notice">
        Accesos y modalidades revisados el 2 de octubre de 2026. Los recursos externos necesitan
        conexión y pueden cambiar. Los precios no se fijan aquí: revisá las condiciones de cada sitio.
      </p>
    </>
  );
};

export default LibraryPage;
```

- **Notas para quien implementa:**
  - `useStore(routeStore.changes, (state) => state.revision)` va como sentencia. Suscribe la página a la revisión, y el progreso se vuelve a leer en cada render (FR-010). No se guarda en ninguna variable ni se memoiza nada.
  - Los textos largos de los párrafos pueden partirse en varias líneas de JSX, como arriba. JSX une las líneas de texto con un espacio, y el texto renderizado tiene que ser el de «Restricciones globales». Si Prettier los parte distinto, lo comprueba la spec.
  - `react-hooks/refs` permite leer `searchRef.current` dentro del manejador.

**La spec de la página.** Es la primera spec de componente del repositorio. Las cinco entradas de «Review Focus» que le tocan están marcadas.

```tsx
// frontend/src/pages/library/ui/LibraryPage.spec.tsx
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GuideData, GuideResource, RouteProgressV1 } from '../../../entities/guide';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { DEFAULT_LIBRARY_FILTERS, type LibraryFilters } from '../model/filter-resources';
import { guideResourceFactory } from '../model/guide-resource.factory';

const KEY = 'taller-learning-v1';
const RUST_EXERCISES = guideResourceFactory.build({
  id: 'rust-100',
  title: '100 Exercises to Learn Rust',
  languages: ['rust'],
  category: 'ejercicios',
  featured: true,
});
const TOUR_OF_GO = guideResourceFactory.build({
  id: 'go-tour',
  title: 'A Tour of Go',
  languages: ['go'],
  category: 'ejercicios',
});
const CONTEXT7 = guideResourceFactory.build({
  id: 'context7',
  title: 'Context7',
  languages: ['both'],
  category: 'herramientas',
  cost: 'mixto',
});
const RESOURCES = [RUST_EXERCISES, TOUR_OF_GO, CONTEXT7];

interface RecordingStorage extends StorageLike {
  items: Map<string, string>;
  writes: string[];
}

function memoryStorage(initial: Record<string, string>): RecordingStorage {
  const items = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    items,
    writes,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key);
      items.set(key, value);
    },
    removeItem: (key) => void items.delete(key),
  };
}

function savedRoute(favorites: string[]): string {
  return JSON.stringify({
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites,
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
  });
}

function guideWith(resources: GuideResource[]): GuideData {
  return {
    resources,
    tracks: {
      rust: { title: 'Rust', description: '', modules: [] },
      go: { title: 'Go', description: '', modules: [] },
    },
    sources: [],
  };
}

interface RenderOptions {
  favorites?: string[];
  filters?: Partial<LibraryFilters>;
  resources?: GuideResource[];
}

async function renderLibrary({ favorites = [], filters = {}, resources = RESOURCES }: RenderOptions = {}) {
  vi.resetModules();
  const { routeStore } = await import('../../../entities/guide');
  const { default: LibraryPage } = await import('./LibraryPage');
  const storage = memoryStorage({ [KEY]: savedRoute(favorites) });
  routeStore.open(guideWith(resources), { storage });
  const onFiltersChange = vi.fn<(filters: LibraryFilters) => void>();
  const user = userEvent.setup();
  render(
    <LibraryPage
      resources={resources}
      initialFilters={{ ...DEFAULT_LIBRARY_FILTERS, ...filters }}
      onFiltersChange={onFiltersChange}
    />,
  );
  return { user, routeStore, storage, onFiltersChange };
}

const search = () => screen.getByRole('searchbox', { name: 'Buscar recursos' });
const titles = () =>
  screen
    .queryAllByRole('article')
    .map((article) => within(article).getByRole('heading', { level: 2 }).textContent);

describe('what the library shows', () => {
  it('lists the resources in the received order and counts them', async () => {
    await renderLibrary();

    expect(titles()).toEqual(['100 Exercises to Learn Rust', 'A Tour of Go', 'Context7']);
    expect(screen.getByRole('status')).toHaveTextContent('3 de 3 recursos · abrí cada uno a tu ritmo');
  });

  it('shows 0 de 0 and the empty state without resources', async () => {
    await renderLibrary({ resources: [] });

    expect(screen.getByRole('status')).toHaveTextContent('0 de 0 recursos · abrí cada uno a tu ritmo');
    expect(screen.getByRole('heading', { level: 2, name: 'Ningún recurso con esos filtros.' })).toBeInTheDocument();
  });

  it('draws the pills, the star and the link of a card', async () => {
    await renderLibrary();
    const card = screen.getAllByRole('article')[0];

    expect(within(card).getByText('Rust')).toHaveClass('pill', 'accent');
    expect(within(card).getByText('Gratis')).toHaveClass('pill');
    expect(within(card).getByText('Elegido para vos')).toHaveClass('pill', 'accent');
    expect(within(card).getByRole('button', { name: 'Guardar en favoritos: 100 Exercises to Learn Rust' })).toHaveAttribute('aria-pressed', 'false');
    const link = within(card).getByRole('link', { name: 'Explorar recurso' });
    expect(link).toHaveAttribute('href', RUST_EXERCISES.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(screen.getAllByRole('article')[2]).getByText('Go + Rust')).toHaveClass('pill');
  });
});

describe('the filters', () => {
  it('filter while typing and keep what was typed', async () => {
    const { user } = await renderLibrary();

    await user.type(search(), 'tour of');

    expect(search()).toHaveValue('tour of');
    expect(titles()).toEqual(['A Tour of Go']);
    expect(screen.getByRole('status')).toHaveTextContent('1 de 3 recursos · abrí cada uno a tu ritmo');
  });

  it('filter by language, access, type and favorites', async () => {
    const { user } = await renderLibrary({ favorites: ['context7'] });
    const language = screen.getByRole('combobox', { name: 'Filtrar por lenguaje' });
    const cost = screen.getByRole('combobox', { name: 'Filtrar por acceso' });

    await user.selectOptions(language, 'go');
    expect(titles()).toEqual(['A Tour of Go', 'Context7']);
    await user.selectOptions(cost, 'mixto');
    expect(titles()).toEqual(['Context7']);
    await user.selectOptions(language, 'all');
    await user.selectOptions(cost, 'all');

    await user.click(screen.getByRole('button', { name: 'Ejercicios' }));
    expect(screen.getByRole('button', { name: 'Ejercicios' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false');
    expect(titles()).toEqual(['100 Exercises to Learn Rust', 'A Tour of Go']);
    await user.click(screen.getByRole('button', { name: 'Todos' }));

    await user.click(screen.getByRole('checkbox', { name: 'Solo mis favoritos' }));
    expect(titles()).toEqual(['Context7']);
  });

  it('hand each change to the session of the adapter', async () => {
    const { user, onFiltersChange } = await renderLibrary();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por lenguaje' }), 'go');

    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...DEFAULT_LIBRARY_FILTERS, language: 'go' });
  });

  it('Limpiar filtros resets the five criteria and leaves the focus on the search', async () => {
    const { user } = await renderLibrary({
      filters: { query: 'zzz', language: 'go', cost: 'mixto', category: 'lectura', favoritesOnly: true },
    });

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(titles()).toHaveLength(3);
    expect(search()).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Filtrar por lenguaje' })).toHaveValue('all');
    expect(screen.getByRole('combobox', { name: 'Filtrar por acceso' })).toHaveValue('all');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: 'Solo mis favoritos' })).not.toBeChecked();
    expect(search()).toHaveFocus();
  });

  it('keep the same status node while filtering and clearing', async () => {
    const { user } = await renderLibrary();
    const status = screen.getByRole('status');

    await user.type(search(), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('keep an open detail open while its card stays visible', async () => {
    const { user } = await renderLibrary();
    const card = screen.getAllByRole('article')[1];
    const details = within(card).getByText('Antes de empezar').closest('details');
    expect(details).not.toBeNull();
    details!.open = true;

    await user.type(search(), 'go');
    await user.click(within(card).getByRole('button', { name: 'Guardar en favoritos: A Tour of Go' }));

    expect(details!.open).toBe(true);
    expect(details!.isConnected).toBe(true);
  });
});

describe('the favorites', () => {
  it('a star saves once and changes its name, its state and its glyph', async () => {
    const { user, storage, routeStore } = await renderLibrary({ favorites: ['rust-100'] });

    await user.click(screen.getByRole('button', { name: 'Guardar en favoritos: A Tour of Go' }));

    const star = screen.getByRole('button', { name: 'Quitar de favoritos: A Tour of Go' });
    expect(star).toHaveAttribute('aria-pressed', 'true');
    expect(star).toHaveTextContent('★');
    expect(storage.writes).toEqual([KEY]);
    expect(routeStore.getProgress().favorites).toEqual(['rust-100', 'go-tour']);
  });

  it('shows what another consumer saves, a reset and an import, without a copy', async () => {
    const { routeStore } = await renderLibrary();

    act(() => {
      routeStore.getProgress().favorites.push('context7');
      routeStore.save();
    });
    expect(screen.getByRole('button', { name: 'Quitar de favoritos: Context7' })).toBeInTheDocument();

    act(() => {
      routeStore.reset();
    });
    expect(screen.getByRole('button', { name: 'Guardar en favoritos: Context7' })).toBeInTheDocument();

    act(() => {
      routeStore.applyImport({ state: JSON.parse(savedRoute(['go-tour'])) as RouteProgressV1, lossy: false });
    });
    expect(screen.getByRole('button', { name: 'Quitar de favoritos: A Tour of Go' })).toBeInTheDocument();
  });

  it('shows the merged favorites when another tab saved in between', async () => {
    const { user, storage } = await renderLibrary({ favorites: ['rust-100'] });
    storage.items.set(KEY, savedRoute(['rust-100', 'context7']));

    await user.click(screen.getByRole('button', { name: 'Guardar en favoritos: A Tour of Go' }));

    expect(screen.getByRole('button', { name: 'Quitar de favoritos: 100 Exercises to Learn Rust' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar de favoritos: A Tour of Go' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar de favoritos: Context7' })).toBeInTheDocument();
  });

  it('a change of the progress does not reset the filters', async () => {
    const { user, routeStore } = await renderLibrary();
    await user.type(search(), 'go');

    act(() => {
      routeStore.getProgress().favorites.push('context7');
      routeStore.save();
    });

    expect(search()).toHaveValue('go');
  });
});
```

- **De dónde salen los valores:** los textos, de la spec; la fusión de la otra pestaña, de ADR 0003 (decisión 9, la unión de favoritos); la cuenta, de los tres recursos de la spec.
- **Pasos:**
  1. Los componentes y el hook con sus firmas, cada componente devolviendo `null`, y la spec. `npm run test:unit -- src/pages/library/ui` falla por comportamiento. Commit: `test(front): la página de la Biblioteca, sin montar (rojo)`.
  2. La implementación de arriba. La spec pasa, y `npm run test:unit` corre los dos proyectos en verde.
  3. `npm run typecheck`, `npm run lint` (sin avisos nuevos y sin `no-restricted-syntax`), `npm run format:check`, `node qa/seams-guard-check.ts` y `npm test`.
  4. `npm run build` deja el script del dist con el mismo sha256 que antes de la tarea: la página no es alcanzable desde `main.tsx`.
  5. Commit: `feat(front): la página de la Biblioteca en React, todavía sin montar`.
- **Compuerta:** los pasos 2 a 4.
