# Research: F14a · Las estadísticas del admin, los agregados y la operación

**Spec**: [spec.md](./spec.md) (F14a: FR-001 a FR-024, los transversales FR-038 a FR-063, SC-001 a SC-003, SC-005 a SC-010 y la última oración de SC-004; historias 1, 2, 6 y lo de F14a de las historias 5, 7 y 8) | **Plan**: [plan.md](./plan.md) | **Contrato**: [contracts/usage-section.md](./contracts/usage-section.md) | **Fecha**: 2026-10-28

Las decisiones técnicas de F14a con sus alternativas, la tabla de consultas de documentación, lo que se midió sin tocar el repositorio y los textos que agrega el plan. F14b tiene su propio [research-f14b.md](./research-f14b.md), que no repite lo de acá.

## La base y las fuentes

- **`master` en `bb480677`:** F2a, F2b, A2, el stack de componentes (#67), F4 en React (#77), `BOOT_SIZE_LIMIT` en 1 500 000 (#76) y el `Makefile` (#78). Este plan no corrió nada sobre esa base.
- **Lo que F14a extiende, sin implementar todavía.** Se cita por rama, commit y ruta, sin enlace, porque está fuera de `master`.
  - **F12a**, la administración: el plan enmendado en `plan/amend-a3-f8-f12a`, `02b5a957` (PR #84), en `specs/023-f12-administracion/` (`plan.md`, `contracts/admin-page.md` y `research.md`). La enmienda del grupo «Acciones sobre {nombre}» y de `actions(name)` ya está commiteada en `02b5a957`.
  - **F12b**, el correo: `plan/f12b-admin-correo`, `cf85fea2` (PR #85), `plan-f12b.md`. F14a no lo toca: sólo F14b comparte la tabla de «Cuentas» con él.
  - **F10a y F10b**, el shell y la ruta: `plan-f10ab`, `d2fbeb93` (PR #88), `specs/024-f10-shell/plan-f10b.md`. F10b monta `AdminPage` desde `frontend/src/app/routes/page-entries.tsx` y borra `app/account/AdminDialog.tsx` (§6.2, T030).
- **La API, C5:** la spec, el contrato y el plan en `spec/c5-estadisticas`, `933d9e06` (PR #86), `specs/025-c5-estadisticas/` (`contracts/http.md` y `plan.md`, con los textos de `lang/es/admin.php` y `lang/es/api.php`). C5 no está implementada: su contrato HTTP es la interfaz de F14a.
- **El código de F11a**, en `impl-f11a` (`f11a/base`, `a7b3c71d`): el cliente (`shared/api/http`), `describeFailure`, `showFailure`, `messagesOf`, `useRetryCountdown`, `ServerError`, `TextField`, `formatWait` y el doble de la API de las E2E (`qa/e2e/fixtures/api-double.ts`, con la ruta antes del CSRF y `ApiCall.search`). `formatLocalDateTime` todavía no está en `a7b3c71d`: se toma la firma de su contrato (`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md:124`), `formatLocalDateTime(iso: string, timeZone?: string): string`.
- **Las decisiones:** `.coordinador/clarify-decisiones.md` («El clarify de F14», «Lo que decide el coordinador por Q2-B» y «F12a, por Q1-A de F14»); los hallazgos F14-1 a F14-8 y TR-1 a TR-17 de `.coordinador/hallazgos-para-planes.md`.

## Decisiones

### R1. Los archivos de la carpeta 028

**Decisión.** F14a usa `plan.md`, `research.md`, `quickstart.md` y `tasks.md`. F14b usa `plan-f14b.md`, `research-f14b.md`, `quickstart-f14b.md` y `tasks-f14b.md`, como F2b y F12b. Las interfaces públicas de las dos partes viven en un solo [contracts/usage-section.md](./contracts/usage-section.md), y no hace falta `data-model.md`: F14 no guarda datos, y las formas que lee son las del contrato de C5, copiadas como tipos en el contrato. Las tareas siguen una sola numeración: F14a va de T001 a T028 y F14b, de T029 a T041.

**Motivo.** Lo fija el encargo. Una sola numeración evita que un commit que nombra una tarea sea ambiguo dentro de la carpeta.

### R2. Las vistas que entrega F14a

**Decisión.** F14a dibuja el grupo de vistas con tres botones, «Resumen», «Ejercicios» y «Ejecuciones». F14b suma «Alumnos» en su lugar, el tercero, sin cambiar los otros tres.

**Motivo.** FR-002 lleva la marca *(F14a)* y nombra cuatro vistas, pero la lista de alumnos es de F14b (FR-025 a FR-027). Un botón «Alumnos» sin contenido en F14a sería una pantalla vacía en `master`.

**Alternativa descartada:** el botón en F14a con un aviso «Próximamente». Muestra algo que no funciona y obliga a F14b a reescribir una prueba de F14a.

### R3. uPlot se evalúa en el arranque (Q2-B)

**Lo que se leyó.** El fuente de `uplot@1.6.32`, `dist/uPlot.esm.js`, leído con WebFetch desde jsDelivr (el texto, sin descargar el paquete), ejecuta en el nivel del módulo:

- `const domEnv = typeof window != 'undefined';`, y `doc`, `win` y `nav`;
- `domEnv && setPxRatio();`, que lee `devicePixelRatio`, llama a `matchMedia(…)`, suscribe `change` con `addEventListener` y hace `win.dispatchEvent(new CustomEvent('dppxchange'))`;
- `on(resize, win, invalidateRects)` y `on(scroll, win, invalidateRects, true)`;
- `new Intl.NumberFormat(domEnv ? nav.language : 'en-US')`.

La cabecera del archivo es `/** … */`, no `/*! … */`: el minificador la descarta.

**Consecuencias.**

1. **uPlot no puede cargarse a pedido.** `build-check` exige un solo script y `evaluateBuiltPage` falla ante un `import()` (`qa/lib/built-page.ts`). Entonces se evalúa con el bundle, para todos los alumnos, y escribe tres listeners en `window` y uno en un `MediaQueryList`. No dibuja nada hasta que alguien crea un gráfico.
2. **`boot-check` y `dist-content-check` lo evalúan sobre el contexto de `qa/lib/boot-harness.ts`**, que tiene `window`, `CustomEvent`, `navigator.language`, `addEventListener` y `dispatchEvent`, pero no `devicePixelRatio` ni `matchMedia`. Sin ellos, el bundle tira `ReferenceError` al evaluarse y los dos checks caen.
3. **jsdom 30.1.2 no tiene `matchMedia`** (medido: ver «Mediciones»). La spec de F12a que monta `AdminPage` sin mocks (`admin-page.spec.tsx`, T019 de F12a) carga uPlot en cuanto la página importa la sección.

**Decisión.**

- `qa/lib/boot-harness.ts` suma `devicePixelRatio: 1` y `matchMedia`, que devuelve `{ matches: false, addEventListener, removeEventListener }` vacíos. No cambia ningún escenario de `boot-check` ni de `dist-content-check`: completa el navegador falso que comparten.
- `frontend/src/vitest.setup.ts` suma `matchMedia` en `globalThis` si jsdom no lo trae, con la forma completa de `MediaQueryList`. Va en `globalThis` y no sólo en `window`, porque `setPxRatio` lo llama como global suelto (`matchMedia(…)`), y así alcanza aunque el entorno de Vitest no iguale `window` y `globalThis`. Ninguna spec de F12a se edita.
- Las dos cosas van en T008, antes de que uPlot entre al bundle (T023).

**Alternativas descartadas:**

- **Cargar uPlot con `import()`:** lo prohíben `build-check` y `evaluateBuiltPage`.
- **Un alias de `uplot` a un doble en la configuración de Vitest:** esconde el módulo real a todas las specs, también a las que no lo necesitan, y no resuelve `boot-check`.

**Es la decisión 1 del informe**, porque toca el arnés compartido de dos checks protegidos.

### R4. El módulo que envuelve uPlot y las pruebas por capas (FR-063)

**Decisión.** Tres piezas:

1. **`pages/admin/model/bar-chart.ts`,** puro. El gráfico como datos (`BarChart`: título, etiquetas, series con su color y si se apilan), `stackSeries` y `chartWidth`. La spec de `node` los prueba con valores escritos a mano.
2. **`pages/admin/lib/bar-plot-options.ts`,** puro. Arma las opciones y los datos que recibe uPlot (`barPlotOptions` y `plotData`). Importa de `uplot` sólo tipos (`import type`), así que su spec de `node` no evalúa uPlot.
3. **`pages/admin/lib/plot.ts`,** el único módulo que importa uPlot en tiempo de ejecución. `drawBarChart(host, frame, chart)` lee los colores de los tokens, crea el gráfico con el ancho del marco, observa el marco con `ResizeObserver`, llama a `setSize` cuando cambia y devuelve la función que desconecta el observador y llama a `destroy()`. Trae la licencia como comentario `/*! … */`, como `archive.ts` con fflate.

**Las pruebas por capa:**

| Capa | Dónde corre | Qué prueba |
| --- | --- | --- |
| El gráfico como datos y las opciones de uPlot | Vitest, proyecto `node` | Las series apiladas, el ancho mínimo, que el cursor, la selección y la leyenda de uPlot están apagados, que el eje x no es de tiempo, las etiquetas del eje y el orden de dibujo |
| El componente del gráfico y las vistas | Vitest, proyecto `dom` | La tabla, el resumen en texto y el `BarChart` que recibe `drawBarChart`, con `plot.ts` reemplazado por `vi.mock` y `vi.hoisted`. También que la función que devuelve se llama al desmontar |
| El dibujo | Playwright | Que el canvas tiene píxeles pintados, que a 320 px el gráfico de 366 barras se desplaza en su región y la página no, que el canvas queda dentro de un nodo `aria-hidden`, y que no hay animaciones (`document.getAnimations()` vacío y dos cuadros seguidos iguales) |

**Motivo.** jsdom no dibuja en canvas (sin el paquete `canvas`, `getContext` devuelve `null` y escribe «Not implemented» en la consola virtual) y no tiene `ResizeObserver`. El doble de Vitest reemplaza un solo módulo con un solo export, así que la prueba no depende de cómo está escrito el componente por dentro.

**Alternativas descartadas:**

- **Instalar `canvas` para jsdom:** es una dependencia nativa más, y las imágenes en Node no prueban lo que ve el navegador.
- **Mockear `uplot` directamente:** el componente pasaría a probar llamadas a la API de uPlot en vez del gráfico que pide.

### R5. Las barras

**Decisiones.**

- **El eje x no es de tiempo.** `scales.x.time: false`, con los índices `0…n-1` como valores y las fechas del período como etiquetas del eje. Así uPlot no convierte una fecha local del taller con la zona del navegador (L9; hallazgo del informe de la spec). El rango del eje va de `-0,5` a `n-0,5`, para que la primera y la última barra no queden cortadas.
- **Los pasos del eje son enteros.** `incrs` sólo trae enteros, y la función de `values` devuelve `''` para un valor que no es entero.
- **Los intentos por resultado se apilan sin bandas.** `stackSeries` calcula las sumas acumuladas, y las series se dibujan de la más alta a la más baja. Cada barra opaca tapa a la anterior desde cero, así que el segmento que se ve de cada resultado es el suyo. La leyenda en el HTML va en el orden de la tabla («Aprobado» primero).
- **El ancho:** cada intervalo ocupa como mucho el ancho del marco y nunca menos de 6 px (`MIN_SLOT_PX`), más 60 px del eje y (`Y_AXIS_PX`). La barra ocupa el 70 % del intervalo y como mucho 40 px (`uPlot.paths.bars({ size: [0.7, 40] })`). Con 366 días el gráfico mide 2 256 px y su región se desplaza. La altura es fija, de 220 px.
- **Los colores salen de los tokens** con `getComputedStyle(host).getPropertyValue('--…')`, cada vez que se dibuja: `--green` para «Aprobado», `--accent` para «No pasó las pruebas», `--accent-dark` para «No compiló», `--muted` para «Error al ejecutar», `--ink` para «Se pasó de tiempo» y `--accent` para los alumnos. Los ejes usan `--muted` y la grilla, `--line`. El color de la leyenda del HTML sale de las mismas variables por clases (`.usage-swatch-green` y las demás), y cada resultado lleva su nombre al lado (FR-047).

**Lo que dijo Context7** (tabla de consultas): las barras con `uPlot.paths.bars` y `size: [fracción, máximo]`; las series apiladas no vienen en uPlot (el README las excluye) y los ejemplos las arman con sumas acumuladas; `time: false`; `setSize({ width, height })`; `destroy()`; `cursor: { show: false }`, `select: { show: false }` y `legend: { show: false }`.

**Lo que dice el `.d.ts`** (leído con WebFetch): `export = uPlot` con `export as namespace uPlot`, así que `import uPlot from 'uplot'` funciona con `allowSyntheticDefaultImports`, que `moduleResolution: "Bundler"` activa por omisión. `paths.bars` es opcional (`bars?: BarsPathBuilderFactory`), y `Select` extiende `BBox`, que exige `left`, `top`, `width` y `height`.

### R6. El período compartido (FR-004 a FR-006, L3)

**Decisión.** Un provider chico, `PeriodProvider` (`ui/period-context.tsx`), envuelve las secciones dentro de `AdminPage`. Guarda `PeriodRequest | null`: `null` hasta que el admin aplica un período, y entonces el pedido sale sin `from`, `to` ni `granularity`. `usePeriod()` lo lee.

- **El formulario** se llena con el `meta.period` de la última respuesta de su vista, con la opción `values` de React Hook Form (se resetea sólo si los valores cambian, por comparación profunda).
- **La validación** corre al enviar, antes de pedir, con `checkPeriod`. Las dos fechas tienen que estar, «Desde» no puede ser posterior a «Hasta» y el período inclusivo no puede pasar de 366 días. El error va a su campo con `setError(…, { shouldFocus: true })`.
- **Un 422 del servidor** con `errors.from`, `errors.to` o `errors.granularity` llega al formulario como `failure`, y `showFailure` de F11a pone cada mensaje en su campo y enfoca el primero. La vista no muestra además el aviso de falla para ese caso (`isPeriodRejection`).
- **«Ejercicios» no tiene «Agrupar por»:** conserva la agrupación compartida.

**Motivo.** El detalle de una cuenta que se abre desde «Cuentas» (F14b) comparte el período, y F12a desmonta la sección que se deja. Un estado dentro de «Uso del taller» se perdería al ir a «Cuentas». Un provider en la página es el estado más bajo que tiene a todos sus consumidores, sin Zustand ni nuqs (FR-056), y se descarta al cerrar la administración (FR-004).

**Alternativa descartada:** pasar el período por props desde `AdminPage`. Lo reenviarían «Uso del taller» y «Cuentas», que no lo usan (prop drilling).

### R7. Los títulos del contenido (FR-020, L6)

**El problema.** `AdminPage` recibe dos props y no puede sumar otra (spec, «Dónde vive»). Además, `seams-guard` (R5) prohíbe que una página importe `app/content/content`. El catálogo de ejercicios (`exerciseCatalog` de `entities/exercise`) daría los títulos de los ejercicios, pero no hay una entrada sin estado para los mundos, los talleres, los pasos del recorrido ni sus opciones.

**Decisión.** Un provider de `pages/admin`, `ContentTitlesProvider` (`ui/content-titles-context.tsx`), recibe de `app/` una función que devuelve el contenido: `source={getContent}`. Los títulos se arman la primera vez que una vista pide uno (`lazyTitles`), así que un contenedor que nunca abre la sección no lee el contenido. Eso importa porque la spec de F12a del contenedor (`admin-dialog.spec.tsx`) no publica contenido, y `getContent()` tira sin él. `buildContentTitles` vive en `pages/admin/model/content-titles.ts` y recibe una forma estructural mínima (`TitleSource`) que `Content` cumple sin conversión:

- de los ejercicios, el título, las pruebas y las opciones de la predicción;
- de los mundos, el título y las opciones del checkpoint;
- de los talleres, el título y las opciones de la predicción;
- de los pasos del recorrido, el título y las opciones de la pregunta, y los recursos;
- de los hitos, los títulos de `PROJECT_MILESTONES` de `entities/guide`.

Sin provider, `useContentTitles()` devuelve `ID_TITLES`, que muestra los ids y «Opción {n}». Así la página montada sola (SC-009) funciona igual.

**`content-titles.ts` importa `entities/guide`** (`PROJECT_MILESTONES` y `milestoneId`), y su índice también crea `routeStore`. Corre en el proyecto `node` de Vitest sin problema: `createRouteStore()` no toca el almacenamiento hasta `open()` (`route-store.ts`, `bb480677`), y `route-store.spec.ts` ya importa ese módulo en `node`.

**Dónde se monta.** En el lugar de la base que dibuja `<AdminPage`: `app/account/AdminDialog.tsx` (F12a) o `app/routes/page-entries.tsx` (F10b, U6). T001 lo detecta, y T024 envuelve ese único punto.

**Alternativas descartadas:**

- **Sólo `exerciseCatalog` y los ids para el resto:** incumple FR-020 en los mundos, los talleres y el recorrido.
- **Una tercera prop de `AdminPage`:** la spec fija dos.
- **Leer `readStoredContent()` de `shared/api/content` desde la página:** esquiva la regla R5 de `seams-guard` sin cumplir su intención.

**Es la decisión 3 del informe.**

### R8. Los pedidos (FR-044, FR-049 a FR-051)

**Decisión.** Dos hooks de `pages/admin/lib/`, que F14b también usa:

- **`useStatsRequest(load, ownId)`** hace un pedido por cada `load` distinto (un `useCallback` con los parámetros), lo cancela con `AbortController` al cambiar o al desmontar, descarta la respuesta de un pedido cancelado, conserva los datos anteriores mientras llega el nuevo (`loading` con `data`), resuelve el 401 y el `account_disabled` con `recoverSession` de F12a y arranca la cuenta regresiva de `Retry-After` con `useRetryCountdown` de F11a. Es la misma forma que `usePagedList` de F12a, sin la página.
- **`useRunsPages(load, ownId)`** pagina con el cursor sobre `useStatsRequest`. La posición se guarda junto con el `load` al que pertenece, así que un filtro nuevo vuelve a la primera página sin un efecto.

**Los errores.** `describeStatsFailure` (`model/stats-failure.ts`) usa `reactionTo` de F12a. Ante un 503 `stats_timeout` con `Retry-After`, suma «Podés volver a intentar en {tiempo}.» con `formatWait` de F11a, como ya hace `describeFailure` con el 429. F11a no cambia.

**Alternativa descartada:** `usePagedList` para todo. Su contrato es el de una lista con `page`, `replace` y `remove`, y ni la cola ni el resumen son listas.

### R9. Las tablas, las tasas y las distribuciones (FR-041, FR-042, FR-053)

**Decisiones.**

- **Una tabla genérica, `StatsTable`,** con su título, una nota opcional, la columna de encabezados de fila y las columnas como datos. La región se desplaza con el teclado, con el patrón de F12a (`.admin-table-scroll`, `tabIndex={0}` y el nombre de la tabla). Reemplaza unas diez tablas que repetirían el mismo marcado.
- **`RateCell`** muestra «{numerador} de {n}». Con `n` (o la muestra) en 0 muestra «—» con el nombre accesible «sin datos» (`role="img"`, porque un `span` sin rol no tiene nombre). Con una muestra menor que 5 suma «Muestra chica» y no dibuja el `<meter>`. Si no, dibuja `<meter>` con un nombre que repite la cifra.
- **La parte resuelta de un catálogo** es `solvedMedian / activeExercises`, pero su muestra son los alumnos que empezaron: `RateCell` recibe la muestra aparte.
- **`Distribution`** es una lista dentro de la celda, con el texto de cada opción, su `<meter>` y «{alumnos} de {respuestas}». Con menos de 5 respuestas muestra «{n} respuestas. Menos de 5 respuestas: no mostramos cómo se reparten.».
- **Ningún total de resueltos sin desglose:** la tabla de ejercicios muestra «en el servidor» e «importados» en columnas separadas. El orden «Menos resueltos primero» usa la suma sobre los que empezaron, pero no la muestra (FR-040).

### R10. El contrato de F12a y el principio VIII

**El conflicto.** FR-003 dice que el contrato de F12a (`specs/023-f12-administracion/contracts/admin-page.md`) se actualiza en el mismo commit que suma `'usage'` a `AdminSection`. Pero cuando F14a se implemente, F12a ya estará en `master`, entregada. Por el principio VIII de la constitución, su carpeta queda inmutable.

**Decisión.** La extensión vive en [contracts/usage-section.md](./contracts/usage-section.md), que dice «extiende `specs/023-f12-administracion/contracts/admin-page.md`» y lista lo que cambia: el tercer valor de `AdminSection`, los dos providers, la regla de que `AdminPage` envuelve sus secciones en `PeriodProvider`, la columna «Uso» de F14b y el Page Object nuevo. Ningún archivo de `specs/023` cambia.

**Es la decisión 2 del informe.**

**El Page Object.** F14a no amplía la unión de `openSection` de F12a. Suma su propia clase, `UsagePage` (`qa/e2e/pages/usage.ts`), con el fixture `usage`, que abre la administración sólo por `admin.open()`, el único método de F12a (FR-060).

### R11. La licencia y el peso (FR-056, FR-057)

**La licencia.** Se sigue lo que se hizo con fflate:

1. `lib/plot.ts` empieza con `/*!`, el texto exacto de `node_modules/uplot/LICENSE` y `*/`;
2. `frontend/THIRD-PARTY-NOTICES.txt` suma su bloque, `uPlot — https://github.com/leeoniya/uPlot`, con el mismo texto;
3. `build-check` suma una aserción, «uPlot license retained in standalone HTML», sin cambiar ninguna de las que tiene.

El texto sale del archivo instalado. No se escribe de memoria.

**El peso.** El subpresupuesto de F14 es de +95 000 caracteres sobre la línea base de T001, medido en cada PR y siempre acumulado desde esa misma línea base:

| Parte | Tope | Qué entra |
| --- | --- | --- |
| F14a | +80 000 | uPlot con su CSS (unos 53 000 según los archivos de jsDelivr: `uPlot.iife.min.js` 51 081 bytes y `uPlot.min.css` 1 857) y unos 27 000 de código propio |
| F14b | +15 000 | La lista de alumnos, el detalle, la columna y sus ejecuciones |

- **T002** mide uPlot solo, minificado con el `esbuild` del repo, más su CSS. Si pasa de 60 000, se detiene y decide el usuario.
- **T023** mide `dist/index.html` cuando uPlot entra al bundle. Si F14a pasa de +80 000 sobre T001, se detiene.
- **F14b** mide contra la línea base de T001 de F14a, no contra la suya: F14 entera no puede pasar de +95 000. Si F14a usó menos de 80 000, F14b hereda el resto.

### R12. La fuente de cada cifra (FR-009)

El contrato de C5 nombra cuatro fuentes y la spec, dos textos. Este plan las agrupa así:

| Cifra | Fuente de C5 | Texto |
| --- | --- | --- |
| Las cuentas por rol y estado, las invitaciones, «Hicieron «Borrar todo» alguna vez» | El estado de las tablas | «Estado actual» |
| Los activos en 24 horas, 7 y 30 días y los que nunca tuvieron actividad | actividad (`lastActivityAt`) | «Estado actual» |
| Lo resuelto, las primeras resoluciones y los alumnos nuevos | vigente | «Estado actual» |
| Los intentos por resultado, los de operación, los importados, las pruebas, las importaciones y los alumnos que ejecutaron | historia | «Historia» |
| Lo empezado, las ayudas, la predicción y la autoevaluación de un ejercicio | vigente (`exercise_progress`) | «Estado actual» |
| La cola y las ejecuciones | ejecuciones | Ninguno: «Ejecuciones» no es una vista de agregados del progreso |

Cada bloque y cada tabla dicen su fuente. Una ayuda fija explica la diferencia (spec, «Textos»).

### R13. Las E2E (FR-060, FR-061)

- **El doble de la API** es el de F11a: busca la ruta antes que el CSRF y guarda la query en `ApiCall.search`. Las rutas de C5 se registran en cada escenario. `GET /api/admin/runs` es una sola ruta con o sin filtros, así que el escenario decide por `call.search`.
- **La administración abre en «Cuentas»,** así que cada escenario registra `GET /api/admin/users`. Si no, ese pedido da 404 y queda en `unhandled`.
- **Las fallas esperadas** se declaran con `/status of NNN/` y su código exacto.
- **La zona horaria** es la de `playwright.config.ts`, `America/Argentina/Buenos_Aires`. Una fecha `2026-10-01` convertida con `new Date` daría «30/9/2026» en esa zona: la E2E del resumen espera «Del 1/10/2026 al 7/10/2026», que falla con esa conversión (Review Focus 4).
- **El reloj:** `page.clock.install()` antes de `shell.goto`. `runFor('05:00')` dispara todos los temporizadores del camino, así que un refresco automático saldría (Context7, Playwright 1.63).
- **Los títulos esperados** salen del contrato congelado `qa/fixtures/curriculum-ids.json` (`curriculumIds` de `qa/e2e/lib/curriculum.ts`), nunca del código que se prueba.

## Consultas de documentación

Servidor de Context7 secundario (`mcp__44441c24-…`), el 2026-10-28. Las versiones son las de `package-lock.json` en `bb480677`, salvo uPlot, que todavía no está instalada (la de la spec), y React Hook Form, que instala F11a.

| Librería | Versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| uPlot (`/leeoniya/uplot/1.6.32`) | 1.6.32 | Importar como ES module, `new uPlot(opts, data, target)` y `destroy()` | El constructor recibe opciones, datos y el nodo; `destroy()` libera el gráfico | Sí: `drawBarChart` devuelve la función que lo destruye |
| uPlot | 1.6.32 | Barras con `uPlot.paths.bars`, el eje x sin tiempo y `distr` | `paths.bars({ size: [fracción, máx] })`; `scales.x.time: false`; `distr: 2` aprieta los huecos | Sí: índices con `time: false` y etiquetas propias |
| uPlot | 1.6.32 | `setSize` al ancho del contenedor; apagar el cursor, la selección y la leyenda | `u.setSize({ width, height })` ante un cambio de tamaño; `cursor.show`, `select.show` y `legend.show` en `false` | Sí: `ResizeObserver` dentro de `plot.ts` |
| uPlot | 1.6.32 | Series apiladas, bandas y el orden de dibujo | uPlot no apila: los ejemplos suman y usan `bands` | Sí: suma acumulada y dibujo de mayor a menor, sin bandas |
| uPlot | 1.6.32 | `values`, `incrs`, `space`, `stroke` y `grid` de un eje | `values` puede ser una función `(u, splits) => …`; `incrs` fija los pasos | Sí: pasos enteros y etiquetas por índice |
| uPlot | 1.6.32 | Lo que corre al importar (`domEnv`, `setPxRatio`, `matchMedia`) | Context7 no lo trae: se leyó el fuente con WebFetch (R3) | Sí: el arnés y el setup de Vitest |
| Vitest (`/vitest-dev/vitest/v5.0.3`) | 5.0.3 | `vi.mock` con fábrica y `vi.hoisted` | `vi.mock` se iza al principio del archivo; las variables que usa la fábrica salen de `vi.hoisted` | Sí: las specs de las vistas mockean `lib/plot` |
| Playwright (`/microsoft/playwright/v1.63.0`) | 1.63.0 | `page.clock.install`, `runFor` y `fastForward` | `runFor` dispara todos los temporizadores del camino; `fastForward`, como mucho una vez | Sí: los cinco minutos usan `runFor('05:00')` |
| Playwright | 1.63.0 | `reducedMotion` y el viewport | `test.use({ reducedMotion: 'reduce' })` y `page.setViewportSize` | No |
| React Hook Form (`/react-hook-form/documentation`) | 7.89.0 | `values` contra `reset` en un efecto | `values` resetea el formulario cuando cambia, por comparación profunda | Sí: el período usa `values` |
| jsdom (`/jsdom/jsdom`) | 30.1.2 | El canvas sin el paquete `canvas` y lo que no implementa | El canvas se comporta como un `div` y `getContext` no existe; no hay layout | Sí: R3 y R4 |
| React (`/reactjs/react.dev`) | 19.2.8 | Sincronizar un widget que no es de React con un efecto | Se crea en el efecto, con sus dependencias, y se limpia en el cleanup | Sí: `SeriesChart` dibuja en un efecto que depende del gráfico |
| Vite (`/vitejs/vite/v8.0.10`) | 8.3.2 | Importar un `.css` desde JS o desde un paquete | Un `import 'x.css'` se inyecta en la hoja; con `vite-plugin-singlefile` queda en el único `<style>` | No |
| fishery (`/thoughtbot/fishery`) | 2.4.0 | `Factory.define`, `build` con objetos anidados y listas | Los objetos se fusionan en profundidad y las listas se reemplazan | Sí: las fábricas de C5 pasan listas enteras |
| Testing Library (`/testing-library/testing-library-docs`) | 16.3.3 | `ByRole` con `name`, `within` y lo oculto del árbol de accesibilidad | Lo que está bajo `aria-hidden` no aparece sin `hidden: true` | Sí: la spec del gráfico comprueba que el canvas no aparece |

Zustand y nuqs no se consultaron: F14a no los usa (FR-056). `useStore(sessionStore, selector)` ya lo usa `AdminPage` de F12a.

## Mediciones (de sólo lectura, fuera del repositorio)

| Qué | Cómo | Resultado |
| --- | --- | --- |
| Los metadatos de uPlot | `npm view uplot@1.6.32 version dist.unpackedSize license` | `1.6.32`, 545 468 bytes, MIT, sin dependencias. `main: ./dist/uPlot.cjs.js`, `module: ./dist/uPlot.esm.js`, `typings: ./dist/uPlot.d.ts`, sin `exports`. Publicada el 2025-03-14 |
| jsdom 30.1.2 | Un script en el directorio temporal que importa el jsdom de `impl-f11a/node_modules`, sin escribir ahí | `matchMedia` no existe; `devicePixelRatio` es 1; `CustomEvent` existe; `ResizeObserver` no existe; `getContext('2d')` devuelve `null` y avisa «Not implemented» |
| El arnés de `boot-check` | Lectura de `qa/lib/boot-harness.ts` | Tiene `window`, `CustomEvent`, `navigator.language: 'es'`, `addEventListener` y `dispatchEvent`; no tiene `devicePixelRatio` ni `matchMedia` |
| Los números en `es-AR` | `new Intl.NumberFormat('es-AR')` en Node 24 | `1500` da «1.500»; `1234567.5`, «1.234.567,5»; `0.5`, «0,5». No hace falta `useGrouping: 'always'` |
| Los avisos de terceros | Lectura de `frontend/THIRD-PARTY-NOTICES.txt`, `frontend/vite.config.ts` y `qa/build-check.ts` | El archivo se copia a `dist/`, y `build-check` exige las licencias de React y de fflate dentro del HTML |
| Los códigos de los catálogos | Lectura de `backend/api/app/Content/Portion.php` | `lab`, `quests` y `cores` |

**El tamaño de `dist/index.html` en la base no se midió:** F12a no está implementada. T001 lo mide sobre la base real.

## Textos que agrega el plan

La spec no los trae. Van en español rioplatense, y el usuario puede corregirlos en la revisión.

| Dónde | Texto |
| --- | --- |
| El grupo de las vistas | «Vistas de Uso del taller» |
| El formulario del período | «Período» (su nombre accesible) |
| La frase del período sin serie («Ejercicios») | «Del {d/m/aaaa} al {d/m/aaaa}, en la hora de {zona}.» |
| La zona | El último tramo de la zona de C5, con espacios: «Buenos Aires» |
| La carga | «Cargando el resumen…», «Cargando los ejercicios…», «Cargando la cola…» y «Cargando las ejecuciones…» |
| Una vista que se actualiza con cifras a la vista | «Actualizando…» |
| Las fallas | «No pudimos cargar el resumen.», «No pudimos cargar los ejercicios.», «No pudimos cargar la cola.» y «No pudimos cargar las ejecuciones.» |
| Los títulos de las vistas | «Resumen», «Ejercicios» y «Ejecuciones» (como los botones) |
| La fuente de una tabla | «Fuente: Estado actual.» y «Fuente: Historia.» |
| Los totales | «Resueltos por primera vez, en el servidor», «Resueltos por primera vez, importados», «Alumnos nuevos», «Importaciones» y «Alumnos que ejecutaron (en todo el período: no es la suma de los intervalos)» |
| Los gráficos | «Intentos por resultado» y «Alumnos que ejecutaron» |
| Los resúmenes de un gráfico | «En el período hubo {n} intentos; el día con más fue el {d/m}, con {n}.», con «la semana con más fue la del {d/m}» y «el mes con más fue {mes de aaaa}»; «En el período ejecutaron {n} alumnos; …» y «En el período ejecutó 1 alumno; …»; «En el período no hubo intentos.» y «En el período nadie ejecutó código.» |
| La leyenda de un gráfico | «Leyenda de {título}» (su nombre accesible) |
| La actividad, completando los «…» de la spec | «Activos en los últimos 7 días» y «Activos en los últimos 30 días» |
| Las cuentas por rol y estado | «{Admin|Alumno} · {Activa|Deshabilitada|Borrándose}» |
| Las fuentes de una tabla con varias | «Fuente: Historia, salvo lo resuelto y los alumnos nuevos (Estado actual).» y «Fuente: Estado actual (empezaron, resueltos, ayuda y predicción) e Historia (intentos).» |
| Las listas de opciones | «Opciones elegidas en la predicción de {ejercicio}», «Opciones del checkpoint de {mundo}», «Opciones de la predicción de {taller}» y «Opciones de la pregunta de {paso}» |
| Los nombres de las barras | «{columna} de {catálogo}», «Asistidos en {ejercicio}», «Vieron la solución de {ejercicio}», «Acierto de la predicción de {…}», «Checkpoint aprobado en {mundo}» y «Sellaron el código de {taller}» |
| El formulario de las ejecuciones y su paginación | «Filtrar las ejecuciones» y «Páginas de las ejecuciones» (sus nombres accesibles) |
| Las filas de la serie | «{d/m/aaaa}», «Semana del {d/m/aaaa}» y «{mes} de {aaaa}» |
| Un filtro que no afecta a una tabla | «Los filtros elegidos no cambian esta tabla.» |
| La tabla de las preguntas del recorrido | «Preguntas del recorrido» |
| Las columnas de los ejercicios | «Ejercicio», «Empezaron», «Resueltos en el servidor», «Resueltos importados», «Mediana de intentos (resolvieron · no)», «Asistidos», «Vieron la solución», «Predicción» y «Detalle» |
| Las columnas de los catálogos | «Catálogo», «Ejercicios activos», «Empezaron», «Resolvieron al menos uno», «Mediana de resueltos» y «Parte resuelta» |
| Las columnas de los mundos y los talleres | «Mundo», «Taller», «Lenguaje», «Nivel», «Ejercicios», «Filas resueltas», «Alumnos con sellos», «Checkpoint», «Opciones», «Sellaron el código», «Mediana de etapas» y «Mediana de objetivos» |
| Las columnas del recorrido | «Marca», «Tipo» («Paso», «Hito» y «Favorito»), «Alumnos», «Pregunta» y «Respuestas» |
| El detalle de un ejercicio | «Prueba», «Veredictos», «Acierto», «Autoevaluación» (con la columna «Alumnos») y «Pistas» («{n} pistas») |
| Los motivos de `infra_error` | `oom` «Sin memoria», `signal` «Terminó por una señal», `pids_limit` «Demasiados procesos», `output_limit` «Salida demasiado larga», `evidence_invalid` «Evidencia inválida», `executor_busy` «Sandbox ocupado», `executor_error` «Falla del ejecutor», `job_failed` «Falló el trabajo», `expired` «Venció en la cola» y `account_disabled` «Cuenta deshabilitada». Uno que no está acá se muestra con su código |
| Las fases | `compile` «Compilación» y `run` «Ejecución» |
| Booleanos de una ejecución | «Sí» y «No» |
| Los filtros de las ejecuciones | «Filtrar»; «Ejercicio» es el id, y se aplica al enviar |
| La lista sin ejecuciones | «No hay ejecuciones con esos filtros.» |
| Los lenguajes | «Rust» y «Go» |

## Lo que no se verificó

- **Nada corrió:** ni Vitest, ni `tsc`, ni ESLint, ni Prettier, ni Playwright, ni un build. El código del plan se escribió contra las firmas citadas, y T001 compara las reales de F12a y F11a.
- **El tamaño real de uPlot en el bundle.** Lo mide T002.
- **El texto exacto de la licencia de uPlot.** Sale de `node_modules/uplot/LICENSE` en T002.
- **Que el `.d.ts` de uPlot acepta cada opción tal como la escribe el plan:** `tsc` lo comprueba en T008. Si una firma difiere, se ajusta el tipo sin cambiar el comportamiento, y se avisa.
- **Los listeners que uPlot deja en `window` al arrancar,** en Firefox y WebKit: la red corre sólo en Chromium.
- **La CSP de C4 contra los estilos que uPlot escribe con el CSSOM:** es un hallazgo para C4 (F14-6).
