# Research: A2 · Compuerta de arranque

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

El clarify del 2026-10-05 cerró las cinco preguntas de la spec. Este archivo registra las decisiones de diseño que la spec delegó en el plan, con su motivo y sus alternativas, y cómo se verificó cada cosa al planificar. Lo que mide el spike (T001) se agrega al final, en «Resultados del spike», cuando corra.

El 2026-10-06 el usuario aceptó R3, R4 y R11 con la opción que traían (spec, «Clarifications», Q6 a Q8). R1 quedó abierta a propósito en su regla de decisión, y no hubo nada que decidir: P1 pasó en T001 («Resultados del spike»).

## Cómo se verificó al planificar

La sesión de planificación no corrió `npm run build`, Docker, Playwright ni descargas, y no tocó el repositorio fuera de `specs/`. Lo que sí hizo:

- **Lectura.** El código de `master` (`main.tsx`, los adaptadores, `qa/lib/`, `build-check`, `load-order-check`, `boot-check`, `dump-globals`, `dump-dist-globals`, `vite.config.ts`, el `Dockerfile`, Nginx y los dos compose), la hoja de ruta, la spec y el ADR 0008 del épico del front, y el mapa del front legacy, que están en la rama del PR #16.
- **Cuenta de los casos de `boot-check`.** Hay 8 llamadas `await test(...)` y un bucle sobre dos exportaciones congeladas: 10 casos. El ADR 0008 y el mapa también dicen 10. La spec decía 8.
- **Node 24.21.0**, con comandos sueltos:
  - `vm.SourceTextModule` es `undefined` sin banderas y es una función con `--experimental-vm-modules`.
  - Un script clásico (`new vm.Script`) rechaza `import.meta` con «Cannot use 'import.meta' outside a module».
  - `node --check archivo.mjs` parsea un módulo con `import.meta` y rechaza un error de sintaxis.
  - Un módulo con `import.meta` se evalúa en un contexto vm con globals falsos, con una cadena de promesas y un `CustomEvent`, si el proceso se relanza a sí mismo con `--experimental-vm-modules --disable-warning=ExperimentalWarning`. Salió `{"marks":["http://taller.test/","after-microtask"],...}`.
- **El código de referencia de este plan, en un directorio temporal.** Se empaquetó con el esbuild del checkout principal (sólo lectura) y corrió con `node --test` y temporizadores simulados (`mock.timers`): `portions`, la fuente estática, la compuerta y su entrega suman 12 casos, todos verdes. Se hizo una mutación a propósito: sin la guarda `if (!settled)` del umbral de carga, el caso de los temporizadores tardíos falla. Los datos de prueba fueron un `curriculum.json` del 2026-10-04 de 1.357.065 bytes. No es el actual: es anterior a C2 y no tiene meta, pero sirve para la forma.
- **Tamaños.** Ese mismo archivo da 391.166 bytes con `gzip -1` (el nivel por omisión de Nginx), 308.559 con `-6` y 305.736 con `-9`.
- **Documentación de Vite y Rollup/Rolldown**, por sus sitios oficiales (Context7 no estaba disponible): `emitFile({ type: 'asset', fileName, source })` acepta `source: string | Uint8Array` y usa `fileName` sin cambios; los ganchos `config` y `configureServer` son los de la guía de plugins de Vite.

**Sin verificar** (lo hace T001, T008 y T013): el build de Vite con `import()` y `vite-plugin-singlefile` sobre el código de la base, el plugin de `vite.config.ts`, `frontend/Dockerfile` y la vista previa, `boot-check` sobre el arranque nuevo, el check del bundle construido, los E2E y el tamaño real del HTML y del contenido.

## R1. El spike corre sobre la base con F1 y F2, y su regla se vuelve a plantear

**Decision**: T001, la primera tarea, mide P1 a P4 sobre la base de la implementación (con F1 y las unidades 1 a 4 de F2 integradas), no sobre `master`. Deja sus respuestas en el mensaje de su commit y en este archivo («Resultados del spike»). P5 pasa a los E2E de A2 (T011). La regla de decisión:

- Si P1 pasa, sigue el plan, con `import()` encadenados y `vite-plugin-singlefile` hasta C4.
- Si P1 falla, el plan se detiene y el usuario decide. El coordinador le lleva tres alternativas, contra la base con F2: (a) la salida estándar de Vite en chunks, que adelanta parte de C4; (b) con F2.2 y F2.3 integradas, importar todo en estático y llamar al arranque explícito después de la compuerta, sólo si ningún módulo legacy lee contenido al evaluarse; (c) una función de arranque exportada por cada vista legacy, que toca archivos legacy.
- El top-level await queda descartado en los dos casos: el esbuild en IIFE de `qa/lib/sources.ts` lo rechaza.

**Rationale**: la unidad 3 de F2 cambia cómo arranca `app.js`, y la 2 cambia dónde se arma el catálogo que hoy arma `lab.js` al evaluarse. Medir sobre `master` mediría un arranque que ya no va a existir. La sonda del 2026-10-05, que la spec cita, sirve de pista y no obliga: corrió sobre tres módulos triviales. La alternativa (b) es nueva respecto de la spec: sólo existe si F2 deja el arranque explícito, y T001 la audita con `grep` (qué módulos leen `window.GUIDE_DATA` o los catálogos al evaluarse; al planificar, sobre `master`, eran `app.js`, `lab.js`, `campaign.js` y `systems.js`). En la base, con la unidad 3 de F2a, ninguna vista legacy lee contenido al evaluarse: sólo lo hacen los adaptadores («Resultados del spike»).

**Alternatives considered**: correr el spike ahora sobre `master`, descartado por lo anterior; correrlo en el plan sin una tarea propia, descartado porque el coordinador pidió que sea la primera tarea con su regla de parada.

## R2. La técnica, condicionada a P1: `import()` encadenados desde una etapa

**Decision**: `frontend/src/app/boot/legacy-views.ts` declara la cadena de la base como un arreglo de `() => import('…')`, uno por línea y en el mismo orden que la lista de imports de `main.tsx`, sin las hojas de estilo. La etapa `legacyViews` los espera de a uno y después llama `startApp()`, el arranque explícito que exporta `app.js` desde la unidad 3 de F2a. Los adaptadores `register-*` siguen siendo módulos con efectos, en su posición de hoy, y leen el contenido con `getContent()` al evaluarse.

**Rationale**: conserva el orden de evaluación sin editar ninguna vista legacy (FR-003 y FR-023) y deja que `load-order-check` siga comprobando posiciones. Un adaptador convertido en función del contenido sacaría diez restricciones de la tabla y las convertiría en una regla entre etapas: relajaría lo que FR-003 manda no relajar. `qa/lib/sources.ts` empaqueta con esbuild en IIFE, que convierte un `import()` de un módulo empaquetado en una promesa que evalúa el módulo al llamarla, así que `boot-check` lo arranca sin cambios en el empaquetado, salvo la opción `withoutStartCall`, que T007 tiene que llevar a `legacy-views.ts` (R12); con la salida de Vite, lo confirmó P1.

**Alternatives considered**: top-level await (lo rechaza el arnés); una función de arranque por vista (toca seis archivos legacy); los chunks estándar de Vite (adelantan C4); `Promise.all` en lugar de una espera secuencial (rompe el orden).

## R3. La versión viaja en el nombre del archivo

**Decision** *(decidida por el usuario el 2026-10-06, Q6)*: el build copia `build/curriculum.json` a `dist/content/curriculum.<versión>.json`, donde la versión son los primeros 32 hexadecimales de `documentHash`. Los bytes no cambian: el sha256 de la copia es el `documentHash` completo, y el archivo que genera `tools/content` conserva su nombre en `build/`. La página pide `/content/curriculum.<versión>.json`, con la versión como constante del build (`__CONTENT_VERSION__`).

| Opción | ¿Puede la compuerta observar la versión de los bytes que recibió? |
| --- | --- |
| Sólo una constante del build | No. El documento no lleva su propia huella, y la constante dice lo que la página espera, no lo que llegó |
| Una query (`?v=`) | No. `try_files` la ignora: una página vieja con la caché vacía recibe los bytes nuevos |
| Un encabezado de Nginx | No sin tocar `nginx.conf`. Un estático no trae un encabezado derivado del contenido, y un `add_header` en un `location` repite los del servidor, CSP incluida |
| El hash en el navegador | Sólo en contextos seguros (`crypto.subtle`), y la spec lo dejó fuera por YAGNI |
| **El nombre del archivo** | **Sí, por construcción: una página de otro build pide un nombre que el servidor no tiene y recibe un 404** |

**Rationale**: el nombre direcciona el contenido, como los chunks con hash de Vite. Una combinación de HTML nuevo con contenido viejo (el caso que arriesga el progreso: IDs nuevos que el almacén descartaría) no puede ocurrir, porque un nombre nuevo nunca está en la caché. La combinación inversa se vuelve un 404 visible. Eso resuelve el riesgo 6 de la spec sin sumar `Cache-Control` a Nginx, que no lo fija.

**Consecuencias:**
- En la fuente estática, 404 y «otra versión» son el mismo hecho, y la compuerta lo muestra con el mensaje que sugiere recargar (FR-011). El modo «versión distinta» de SC-004 se prueba además en la compuerta, con una fuente de prueba que devuelve otra versión: es lo que va a hacer la API de A3 con `Content-Version`.
- `vite preview`, que usa los E2E de F1, responde con `index.html` ante un archivo que no existe (cae a la página). Un nombre equivocado da ahí `body`, no `version`. Sólo Nginx da 404: lo verifica T013 con Docker.
- La spec, en Q1, llama al artefacto «`curriculum.json`». Sus bytes son los del generador; sólo cambia el nombre de la copia servida, y FR-011 dejaba al plan elegir cómo viaja la versión. El usuario aceptó la elección el 2026-10-06 (Q6, que precisa a Q1).

**Alternatives considered**: ver la tabla; además, un archivo por porción (17 pedidos para una fuente que A3 retira) y un manifiesto aparte con la versión (un pedido más y el mismo problema de coherencia).

## R4. `dist/` es la raíz web completa y llega entero a Nginx y a la vista previa

**Decision** *(decidida por el usuario el 2026-10-06, Q7)*:
- **El plugin** de `frontend/vite.config.ts` (unas 45 líneas, sin dependencias nuevas) arma lo que hoy hace a mano el `Dockerfile` y suma el contenido:
  - define `__CONTENT_VERSION__` leyendo `build/curriculum.meta.json`;
  - en `generateBundle` emite con `this.emitFile` el contenido en `content/curriculum.<versión>.json` (la clave `fileName` se usa sin cambios y `source` acepta bytes) y los dos avisos de licencia, `EDITOR-LICENSES.txt` y `THIRD-PARTY-NOTICES.txt`, que hoy copia el `Dockerfile` desde `frontend/`;
  - verifica que `sha256(build/curriculum.json)` sea el `documentHash` del meta y, si no, falla el build con un mensaje que manda a correr `npm run curriculum`;
  - sirve el archivo de contenido en `npm run dev` con un middleware de `configureServer`. En `vite preview` y en los E2E de F1 no hace falta nada: sirven `dist/`.
- **Nginx:** `frontend/Dockerfile` copia `dist/` entero a `/usr/share/nginx/html/` con una sola línea, en lugar de las tres de hoy. `nginx.conf` no cambia: `try_files` sirve el archivo, `mime.types` lo marca `application/json`, `gzip_types` lo comprime y `connect-src 'self'` de la CSP ya cubre el pedido.
- **Vista previa:** `docker/compose.preview.yaml` monta `../dist` entero, como pide FR-016.

**Rationale**: con los avisos de licencia en `dist/`, copiar y montar el directorio entero no oculta nada, y `dist/` es la raíz web completa. Dos consecuencias valen más que el costo:
- la imagen no puede conservar el puente cuando A3 lo retire: si el build deja de emitir `content/`, la imagen deja de tenerlo sin editar el `Dockerfile` (lo vigila C4, FR-022 de su spec);
- C4, que retira `vite-plugin-singlefile`, parte de un `Dockerfile` y una vista previa que ya copian y montan todo `dist/`, que es lo que su FR-020 supone.

Los avisos se sirven en las mismas URL que hoy.

**Alternatives considered**:
- Dos montajes en la vista previa (`index.html` y `content/`), con el `Dockerfile` copiando `content/` aparte: no toca la entrega de las licencias, pero deja una línea del `Dockerfile` y un montaje que A3 tiene que acordarse de borrar, y C4 tiene que reescribir los dos.
- Montar todo `dist/` sin emitir las licencias: las dos URL de avisos dejarían de servirse en la vista previa.
- `publicDir`: copiaría `curriculum.meta.json` y no le pone la versión al nombre.
- Un paso de copia después de `vite build`: `vite build` solo ya no dejaría un `dist/` completo.
- Meter el JSON como activo (`?url`): `vite-plugin-singlefile` lo incrustaría como `data:` y volvería a embeber el contenido.

## R5. Dónde vive el acceso tipado al contenido (FSD)

**Decision**: dos piezas.
- `frontend/src/shared/api/content/content-holder.ts`, sin imports: guarda el contenido publicado (`storeContent`, `readStoredContent`) y falla si se lee antes o se publica dos veces.
- `frontend/src/app/content/content.ts`: la interfaz `Content` (con los tipos de las entidades) y `getContent(): Content`, que lee del almacén. Lo leen los adaptadores de `frontend/src/app/legacy/` y, después, la raíz única del shell (F10).

Una página portada no importa `getContent`: recibe su porción por props desde su adaptador, como hace el Atlas con `entries`.

**Rationale**: la regla de dependencias es `app → pages → … → shared` (`docs/architecture.md`). Un acceso con los tipos de las entidades no cabe en `shared` (no puede importarlas) y una página no puede importar de `app`. Tampoco cabe en una entidad: los tipos del Atlas viven en una página (`pages/atlas/model/types.ts`), y `@x` sólo existe entre entidades. El almacén sin imports además permite que un archivo de `qa/` lo importe sin que `tsconfig.qa.json` (NodeNext, que exige extensiones) siga los imports de `frontend/src`. Por eso FR-006 dice que una página recibe su porción por props desde su adaptador y no que la importa.

**Alternatives considered**:
- Un `Content` tipado en `shared`: invierte la dirección de dependencias.
- Una entidad `curriculum` con archivos `@x` en cuatro entidades: pide además mover los tipos del Atlas hacia abajo.
- Un lector tipado en cada dueño: cinco `as` repartidos, que es lo que hoy hacen los adaptadores.

**Lo que toca a F2.2.** El catálogo `exercises`/`byId` de F2 es un módulo de `entities/exercise`: no puede importar de `app`. Se evalúa dentro de la cadena diferida, así que lee los globals que publican los adaptadores (nada que cambiar) o recibe las porciones de ejercicio desde `app` (el plan de F2.2 lo decide). Si F2.2 entrega un import estático de `build/curriculum.json`, FR-005 obliga a A2 a reemplazarlo: T008 lo cambia y T001 anota el archivo.

## R6. La compuerta: estados, números y accesibilidad

**Decision**:
- **Una etapa** (`createContentGate`) pide las 17 porciones a una fuente, comprueba que estén todas con la versión esperada y con su forma, las arma (`assembleContent`), las guarda y avisa. No publica nada si falla algo (FR-001).
- **Tope de espera (FR-007): 20 s.** El documento pesa unos 391 KB con el gzip de Nginx; a 50 KB/s (un 3G lento) tarda unos 8 s y 20 s deja 2,5 veces de margen sin dejar al alumno frente a una espera más larga. El tope cubre el pedido y la lectura del cuerpo (la señal aborta las dos).
- **Umbral del estado de carga (FR-010): 400 ms.** El documento sale del mismo origen y en un enlace local o de red doméstica llega en decenas de milisegundos: una pausa menor que 0,4 s no se percibe y el estado sólo parpadearía. El tiempo hasta la primera vista que informa FR-024 sirve para ajustarlo. «Reintentar» muestra la carga al instante, porque es la respuesta a un clic.
- **Un pedido por vez** (FR-009): un segundo clic mientras espera no abre otro.
- **Los temporizadores son idempotentes:** una vez que el intento terminó, el del umbral y el del tope no hacen nada. El arnés de `boot-check` encola cada `setTimeout`, los corre todos en `flush()` sin mirar la demora y no cancela ninguno; la compuerta tiene que ser inmune a un temporizador tardío, y el spec de Vitest lo prueba con un `clearTimeout` que no hace nada.
- **Sin escritura y sin lectura de almacenamiento ni de la URL** (FR-008): la vista sólo escribe `#main`.
- **El error se explica, no se vuelca:** el DOM lleva `data-failure="<tipo>"` (un valor de una lista cerrada, seguro en un atributo) y el detalle técnico no se muestra. La compuerta no escribe en la consola.

**Accesibilidad** (principio VI): usa `.empty-state` y `.button` de `styles.css`, que ya tienen foco visible y no animan (la regla global de movimiento reducido apaga la transición del botón). El estado de carga es `role="status"` y el de error es `role="alert"`, con el foco en «Reintentar». Si el botón tenía el foco cuando el alumno lo pulsó, el foco pasa a `#main`, para no perder la posición del teclado.

**Textos** (español rioplatense):
- Carga: «Cargando el contenido del taller…».
- Error: título «No se pudo cargar el contenido» y «El contenido del taller no se pudo cargar. Tu progreso sigue guardado en este navegador. Revisá tu conexión y probá de nuevo.».
- Versión: «El contenido del taller no se pudo cargar: puede que haya una versión nueva. Tu progreso sigue guardado en este navegador. Recargá la página y, si sigue igual, probá de nuevo.».
- Botón: «Reintentar».

**Alternatives considered**: reintentos con espera creciente (Q2, descartado por el usuario); `AbortSignal.timeout`, que no se puede cancelar ni deshacer en el arnés; mostrar el estado de carga siempre, que parpadea en las recargas de `?#laboratorio`.

## R7. La señal de que el contenido está publicado

**Decision**: tras guardar el contenido, la compuerta despacha `window.dispatchEvent(new CustomEvent('taller:content-published', { detail: content }))`. Es la señal de arranque (FR-025) que observan los tres usos de A2:
- la marca «contenido publicado» del spike (P1);
- el check del bundle construido, que sólo puede ver por esa vía lo que publicó la compuerta, incluidos los dos catálogos del Atlas, que no son globals;
- `boot-check`, que toma en ese instante qué globals existen para probar que ninguna vista ni catálogo existe antes.

**Rationale**: el bundle de `dist/` es un script cerrado: sus módulos no se pueden importar desde afuera. Un evento no es un global ni un contrato de las vistas, y no cuesta nada en producción.

**Alternatives considered**: un global de depuración en `window` (un contrato nuevo que el épico quiere retirar); una segunda entrada en el empaquetado de `boot-check` (no existe para `dist/`); `performance.mark` con `detail` (clona 1,3 MB de contenido).

## R8. Cómo publican contenido los checks que evalúan adaptadores

**Decision**: `runSource` suma la opción `withContent`. Empaqueta una entrada en memoria que importa primero `qa/lib/publish-content-fixture.ts` y después el adaptador, y deja el texto de `build/curriculum.json` en `context.__TALLER_QA_CONTENT__`. El fixture hace `storeContent(JSON.parse(...))` con el almacén de `shared/api/content/`. El orden de evaluación de los imports estáticos garantiza que el contenido está antes del adaptador, y las dos piezas comparten el módulo del almacén dentro de un mismo empaquetado. `qa/lib/legacy-sources.ts` sigue siendo el único lugar que sabe cargar los adaptadores, y `runtime-check` (fuera de `npm test`), que hoy los evalúa directamente, pasa a usar sus funciones. Los checks que importaban `atlasByLanguage` (`atlas-check`, `curriculum-ids-check` y el fixture `atlas-page-render.tsx`) leen el Atlas del documento generado por `qa/lib/curriculum-document.ts`: el fixture recibe las entradas por parámetro, como la página.

`tools/content/dump-globals.ts` detecta el diseño de la raíz que recibe. Si `register-catalogs.ts` todavía importa `curriculum.json`, usa el camino de hoy sin cambios (también para la raíz de un commit anterior a A2). Si no, empaqueta una entrada temporal que publica el `curriculum.json` de esa raíz, evalúa los cinco adaptadores y lee el Atlas con `getContent()` del mismo empaquetado, y vuelca lo mismo. La línea base se toma antes de cambiar nada (T002) y el volcado tiene que dar los mismos bytes después (SC-001).

**Rationale**: `tsconfig.qa.json` usa NodeNext y exige extensiones en cada import relativo, incluso de tipos. Un archivo de `qa/` que importe un módulo de `frontend/src` con imports sin extensión rompería `npm run typecheck`; por eso el fixture importa el almacén sin imports.

**Alternatives considered**: convertir los adaptadores en funciones del contenido (cambia el contrato de orden, ver R2); un respaldo del contenido en `window` que lea `getContent()` (un seam de pruebas en producción); un plugin de esbuild (no existe en la API síncrona que usa `qa/lib/sources.ts`).

## R9. Cómo corre el bundle construido (P2)

**Decision**: `qa/dist-content-check.ts` extrae el único `<script type="module">` de `dist/index.html` y lo evalúa con `vm.SourceTextModule` en el contexto que arma el arnés de `boot-check`. Como `run-checks.ts` lanza cada check sin banderas, el check se relanza a sí mismo con `--experimental-vm-modules --disable-warning=ExperimentalWarning` si `vm.SourceTextModule` no existe (verificado en Node 24.21.0). Si T001 muestra que `SourceTextModule` no evalúa la salida de Vite, el desvío es transformar el script a IIFE con esbuild (`import.meta` queda vacío) y evaluarlo como un script clásico; se documenta como desvío, porque ya no es el artefacto exacto.

`build-check` parsea el script como módulo con `node --check` sobre un `.mjs` temporal: usa el motor real y no necesita banderas.

**Un solo lugar que sabe cómo arranca la página construida.** `qa/lib/built-page.ts` expone `readBuiltPage()` (el HTML, sus scripts de arranque en orden, el texto donde se busca el currículo y las licencias, y el tamaño que mide el tope), `readBuiltContent()` (el puente de A2, que A3 retira) y `evaluateBuiltPage()` (lo evalúa en un contexto vm). `build-check` y `dist-content-check` no parsean `dist/index.html` por su cuenta. C4 retira `vite-plugin-singlefile` y el `dist/` pasa a varios archivos: cambian `readBuiltPage`, `evaluateBuiltPage` y la función de `build-check` que agrupa las aserciones de singlefile (`assertSinglefileDocument`), y ningún check más.

**Alternatives considered**: la bandera dentro de `run-checks.ts` (lista de nombres que integra el coordinador, y la imagen web corre `npm test`: el relanzamiento no cambia nada afuera); evaluar el script como clásico (falla, verificado); un proceso hijo que importe un `data:` con los globals en `globalThis` (funciona sin banderas, verificado, pero obliga a un segundo arnés con globals del anfitrión); parsear con esbuild (otro parser que el del motor).

## R10. La forma textual que lee `load-order-check`

**Decision**: dos formas, que cada port edita en su PR y que el check documenta en su cabecera.
- `main.tsx`: las hojas de estilo siguen como `import '…css';`, una por línea y antes de lo demás; la primera es `styles.css`. La secuencia es una sola llamada, `runBoot([contentGate, legacyViews])`, que el check lee con `/runBoot\(\s*\[([^\]]*)\]/` y exige en el orden de su tabla de etapas (`contentGate` antes de `legacyViews`). F11 y A3 suman etapas previas y F10, una posterior, con una restricción nueva cada una.
- `frontend/src/app/boot/legacy-views.ts`: un `() => import('<ruta>'),` por línea dentro de `LEGACY_MODULES`, que el check lee con `/^\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\),?\s*$/gm` y normaliza como hoy (rutas relativas a la raíz, con las extensiones que resuelve). La tabla actual de restricciones (16) sigue igual sobre esa lista, con las tres reglas de la base: «`app.js` último» (el último `import()` de la lista), «`styles.css` primera» (en `main.tsx`) y «`startApp()` exactamente una vez, después del último import». La de `startApp()` lee hoy `main.tsx`; después del corte lee `legacy-views.ts` y se ancla al último `() => import(…)` de la cadena. La línea que trae `startApp` no tiene esa forma, así que no suma `app.js` a la lista.

**Rationale**: así `load-order-check` sigue comprobando posiciones sin relajar nada (FR-003) y sin ejecutar nada, y el cambio de formato queda en un lugar con nombre.

**Alternatives considered**: ejecutar `main.tsx` para leer el orden real (el check hoy es estático a propósito); poner cada módulo legacy como una etapa (mezcla dos niveles de orden).

## R11. `build-check`

**Decision** *(los marcadores, decididos por el usuario el 2026-10-06, Q8)*:
- **Estructura:** sigue exigiendo un `<script>`, un `<style>`, un solo documento y ningún enlace ni script externo, y las licencias retenidas.
- **Módulo:** parsea el script con `node --check` (R9).
- **Tope:** `html.length < tope`, con `tope = piso(medido × 1,10)` redondeado hacia abajo a la decena de miles, que no pasa del 10 % de la spec (FR-015 y SC-003). `medido` es el `html.length` que midió T001 sobre el prototipo, sin las marcas del spike: 1.136.706 (P3). El tope pasa de 2.500.000 a 1.250.000; T010 lo vuelve a medir sobre el build de T008 con la misma fórmula y escribe el valor y la medida que lo respalda en el mensaje de su commit.
- **Oráculo de ausencia:** los marcadores salen de `curriculumMarkers()` de `qa/lib/content-document.ts`, que C4 reutiliza para escanear la imagen web (su FR-022). Por cada una de las siete familias (`lab`, `quests`, `cores`, `campaign`, `workshops`, `atlas`, `guide`): los dos textos más largos de la primera entrada que los tenga, de al menos 24 caracteres, con sólo caracteres ASCII imprimibles, sin comillas ni barras ni saltos (el bundle los escapa y un marcador con comillas daría un falso «ausente») y sin enlaces; más su `id` si es igual de plano. Se descartan los que aparecen en las fuentes de `frontend/`, porque un marcador que el código también contiene no prueba nada (un ID como «cache», de un taller, es común en el código). Si una familia no tiene una entrada así, el helper falla. Cada marcador tiene que estar en el archivo servido (control positivo: un oráculo que busca texto que no existe pasaría siempre) y no puede estar en el HTML. SC-003 pedía un ID, un título y una pista por familia: se cambió por esta regla porque los títulos y las pistas suelen llevar acentos o comillas, y los IDs de los talleres son palabras comunes. Medido sobre un `curriculum.json` del 2026-10-04, las siete familias dan al menos dos marcadores y todos están en el documento.
- **Artefacto:** `dist/content/curriculum.<versión>.json` existe, tiene el sha256 del `documentHash` del meta, y el HTML contiene la versión.
- **Mutación (T010):** un import estático del JSON, hecho a mano y descartado, tiene que hacer fallar el check por el tope y por los marcadores (US3, escenario 3).

**Alternatives considered**: sólo el tope (un contenido chico, como una porción, se colaría); marcadores con comillas (falsos negativos); un análisis del bundle con esbuild (otro parser).

## R12. `boot-check` y su arnés

**Decision**:
- El arnés (`createBootHarness`, hoy dentro de `boot-check.ts`) pasa a `qa/lib/boot-harness.ts`, para que lo use también el check del bundle construido. Suma al contexto `fetch`, `AbortController`, `Event`, `CustomEvent`, un `dispatchEvent` y un stub de `MutationObserver`, espías de las tres funciones de `localStorage` (cada llamada queda en `storageCalls`) y la captura del evento de publicación, con los globals que existían en ese instante. `Event` y el stub los pide la salida de Vite que evalúa el check del bundle construido, no el IIFE de `boot-check` (T001, P2): el polyfill de precarga corre al principio del script y, sin `MutationObserver` (alcanza un stub con `observe` y `disconnect`), el módulo lanza `ReferenceError`; el ayudante de precarga despacha `vite:preloadError` con `Event` y `dispatchEvent` si un módulo de la cadena lanza. Si falta `fetch`, la compuerta no lanza: falla con `network`, así que un arnés incompleto se ve como un error de contenido y no como uno del arnés. `bootError` sigue para lo síncrono (la evaluación del grafo estático); una excepción de la cadena es asíncrona y queda en `errors`, porque `main.tsx` la registra con `console.error`.
- `qa/lib/content-server.ts` simula el servidor de contenido: sirve los bytes de `build/curriculum.json` en `/content/curriculum.<versión>.json`, la versión sale de `build/curriculum.meta.json`, cualquier otra ruta da 404 y registra cada pedido. Cada intento sigue un comportamiento de una lista: servir, rechazar, un estado, un texto, un documento alterado o colgarse hasta que aborte la señal.
- Los 14 casos de la base (los 10 del 2026-10-05 y 4 de la unidad 3 de F2a) conservan sus valores esperados. Tres de los de F2a sacan la llamada a `startApp()` con `bundleApp(ENTRY, { withoutStartCall: true })`, que la quita sólo de la entrada (el `stdin` de esbuild). Con la llamada en `legacy-views.ts`, uno pasaría en vacío y dos fallarían con un `TypeError`. Por eso la opción la saca donde esté (de `main.tsx` hasta el corte y de `legacy-views.ts` después; cómo, lo decide T007, porque la API síncrona de esbuild no tiene plugins), y los tres hacen `flush()` antes de `startApp()`. El spike lo midió después del corte: con eso pasan con sus mismos valores esperados. Se suman los escenarios de FR-020: ninguna vista ni catálogo antes de la publicación; los siete modos que se ven por el transporte (red, 404 como versión, 500, tope, cuerpo que no es JSON, porción ausente y porción con otra forma), cada uno con las vistas sin evaluar, `storageCalls` vacío, sin claves `:respaldo`, sin aviso, con el mensaje y «Reintentar» y con el foco en el botón; el reintento que arranca; y el pedido único ante dos clics.
- El tope de espera funciona con el arnés tal como está: un `fetch` que se cuelga hasta que aborte la señal, y `flush()` corre el temporizador del tope, que aborta. La lógica fina de los temporizadores (umbral, tope exacto, idempotencia) se prueba con los temporizadores simulados de Vitest.

- **El camino feliz se asienta antes de la primera ronda de `flush()`.** La compuerta encola sus dos temporizadores antes de que el pedido simulado se asiente, y `flush()` corre uno por ronda. Si `json()` de un `Response` de Node tardara más de una ronda, el del tope abortaría el camino feliz, y la guarda de idempotencia no ayuda: sólo cubre a los que corren después de asentarse. Por eso el servidor simulado responde con un objeto mínimo cuyo `json()` se resuelve con microtareas, y `boot-check` comprueba con `mainWrites` que la carga nunca se mostró en el camino feliz. P4 lo mide sobre la base.

**Alternatives considered**: darle al arnés un reloj con demora real (cambia lo que hacen los casos de la base que dependen de que `flush()` corra todo); probar la compuerta sólo con Vitest (no ve que ninguna vista se evalúe ni que el almacenamiento quede intacto); duplicar el arnés para el check del bundle.

## R13. Los E2E de A2 en la red de F1

**Decision**: un archivo de specs de A2 en `qa/e2e/`, más lo que necesite del Page Object del shell (la región del error y el botón). La espera de `ShellPage.goto` no es de T011: la cambia el corte (T008), porque sin ella la red de F1 se vuelve intermitente desde ese commit («Resultados del spike»). Cada escenario produce su falla con `page.route` sobre `**/content/curriculum.*.json`:

| Escenario | Cómo |
| --- | --- |
| Los cinco enlaces profundos y la recarga | Abre cada forma de URL de la User Story 1 y recarga; vista y contexto como hoy; un solo pedido de contenido por carga |
| Sin red | `route.abort()` |
| Contenido roto | `route.fulfill` con un 200 con basura, un 500, un 404 y un documento al que le falta `lab.go` o con `quests.rust = {}` (se arma desde el archivo real con `route.fetch()`) |
| Tope de espera | La ruta no responde y `page.clock.fastForward(20000)`; navega con `page.goto`, porque `shell.goto` esperaría un error que recién aparece al adelantar el reloj |
| Reintento | El primer pedido falla y el segundo pasa (`route.continue()`); el arranque sigue sin recargar |
| Progreso intacto | Con `qa/fixtures/progress-master-2a278ad-storage.json` sembrado, en cada falla las cuatro claves no cambian, no hay `:respaldo` y un espía de `Storage.prototype` cuenta 0 lecturas y 0 escrituras |
| Teclado | El foco queda en «Reintentar» y Enter lo opera |
| Móvil | `test.use({ viewport: { width: 390, height: 844 } })` |

**Dos puntos que dependen de F1** (la spec de F1 sigue sin clarify): (a) si F1 adopta que un `console.error` hace fallar el test, cada escenario de falla tiene que declarar su entrada en la lista blanca, porque Chromium escribe «Failed to load resource» ante un 404, un 500 o un pedido abortado (no verificado: lo comprueba T011); (b) su configuración es de escritorio (Desktop Chrome), y el móvil se pide por `test.use` en el archivo de A2.

**Rationale**: la verificación en un navegador real es de F1 por decisión del usuario (Q5). El tiempo hasta la primera vista se mide aparte, con un observador de mutaciones inyectado con `addInitScript` que anota `performance.now()` cuando aparece el primer encabezado de `#main`, con y sin caché del navegador. T013 mide el build de A2 intercalado con uno de la base (`c5d497d`): las cifras de T001 sirven de orden de magnitud, porque se superpusieron con las pruebas de otro agente. Es un dato, sin umbral.

**Alternatives considered**: una lista manual (la que el usuario reemplazó); Firefox y WebKit (fuera de ADR 0008).

## R14. Lo que A3 retira y lo que cambia C4

**El puente es trabajo que A3 descarta**, y conviene dejarlo contado:
- `createStaticContentSource` y su spec, y el cableado de `content-stage.ts` (A3 lo reemplaza por la fuente de la API).
- Del plugin de `vite.config.ts`, la emisión del archivo de contenido, el middleware de `npm run dev` y `__CONTENT_VERSION__`. Los avisos de licencia se quedan.
- Nada del `Dockerfile` ni de la vista previa: copian y montan `dist/` entero, así que cuando el build deja de emitir `content/`, la imagen y la vista previa también lo pierden. C4 lo vigila (FR-022 de su spec, en la rama `spec/c4-exposicion`): la imagen web no puede tener el documento estático ni `build/curriculum.json` ni su meta, y una prueba pide al Nginx público las rutas conocidas del puente (`/content/` y `/content/curriculum.<versión>.json`) y espera 404.
- De `qa/`, `readBuiltContent` de `qa/lib/built-page.ts`, la exigencia del archivo junto al HTML de `build-check` (que pasa a exigir que `dist/content/` no exista) y la parte de los bytes servidos del check del bundle construido. El oráculo de ausencia y el tope se quedan.

Se quedan: la compuerta, la validación por porción, los estados de espera y de error, el almacén y `getContent()`, el evento, la secuencia de etapas y los oráculos. La hoja de ruta tendría que anotar este retiro en el alcance de A3: la spec lo da por anotado y no está (A2 sólo toca su propia fila y una línea de estado).

**Lo que cambia C4.** Retira `vite-plugin-singlefile` y el `dist/` pasa a varios archivos, con la CSP sin `'unsafe-inline'`. Lo que A2 deja aislado para eso: `qa/lib/built-page.ts`, `assertSinglefileDocument` de `qa/build-check.ts` y el plugin de `frontend/vite.config.ts`. La compuerta no suma scripts ni estilos en línea (el marcado del error no lleva manejadores ni `style=`, y el botón usa `addEventListener`), así que no hay nada que reemplazar en ella.

## Resultados del spike

**Fecha**: 2026-10-06 | **Decisión: sigue, con el plan corregido antes de T002.** P1 pasa: T002 en adelante usan `import()` encadenados con `vite-plugin-singlefile`. T009 evalúa el script con `vm.SourceTextModule`, sin el desvío del IIFE (P2). Lo que difiere de lo que el plan supone de F1 y F2 cambia tres tareas (T007, T008 y T011) y está al final, en «Lo que el plan corrige antes de T002».

**Cómo se midió.**
- **Base:** `c5d497d` (`f2a/u3-arranque`, con F1, las unidades 1 a 4 de F2a y `master` en `2426bae`), Node 24.21.0. En el lockfile y en `node_modules`: Vite 8.3.2 (Rolldown 1.2.12), `vite-plugin-singlefile` 2.3.3, esbuild 0.28.2, `@vitejs/plugin-react` 6.0.1, Vitest 5.0.3 y Playwright 1.63.0, con el Chrome Headless Shell 1243 que ya estaba instalado. Sin descargas, sin paquetes nuevos y sin Docker.
- **Prototipo:** la rama descartable `a2/spike`, commit `3baadc2`, que no se integra. Tiene el código de referencia del plan tal cual (transporte, almacén, contenido tipado, compuerta, vista, `runBoot`, `legacy-views.ts` y el plugin de `vite.config.ts`), salvo `startApp()` después del último `import()`. Los seis importadores del JSON leen `getContent()`, y cada módulo de la cadena deja una marca como primera sentencia después de sus imports (`(window.__marks ??= []).push(ruta)`). El arnés de `boot-check` pasó a `qa/lib/spike-boot-harness.ts`, con `fetch`, `AbortController`, `Event`, `CustomEvent`, `dispatchEvent`, un stub de `MutationObserver` y una secuencia de marcas, publicaciones (los `window.*` de contenido y los `Taller*`), llamadas al almacenamiento y eventos. `npm run build` corre entero, con el chequeo de tipos.
- **Documento:** `documentHash` `ef8f5715…`, versión `ef8f57154734653554d40a43934c97f3`, 1.357.065 bytes.

### Lo que A2 supone de F1 y F2, contra la base

| Supuesto del plan | En la base | ¿Cambia un contrato de A2? |
| --- | --- | --- |
| F1: `npm test` corre Vitest; existen `test:unit` y `test:e2e`; Playwright contra `vite preview`, que sirve `dist/` entero; Page Objects en `qa/e2e/pages/`; sólo Chromium | Igual. `npm test` es `node qa/run-checks.ts && vitest run --config frontend/vitest.config.ts`; las specs están en `qa/e2e/specs/`; un proyecto, Desktop Chrome. `vite preview` sirvió `dist/content/` del prototipo sin configurar nada | Sí, en un punto: «El arranque asíncrono y los E2E de F1», abajo |
| F1: un `console.error` hace fallar el test, salvo la lista blanca | Igual: el fixture automático `pageIssues`, con `CONSOLE_ALLOWLIST` vacía y `expectIssue(patrón, motivo)`. Además, `strictNetwork` aborta todo pedido a otro origen y hace fallar el test | No |
| F1: configuración de escritorio | Igual | No |
| F2.1: almacenes y motores singleton; los `register-*`, adaptadores finos | Igual, con Zustand 5.0.15. Ni en el vm ni en Chromium el grafo estático del prototipo toca el almacenamiento | No |
| F2.2: el catálogo no importa el JSON y se arma dentro de la cadena | `exerciseCatalog`, en `frontend/src/entities/exercise/model/exercise-catalog.ts` y exportado por `entities/exercise`, no importa el JSON ni lee `window`. Lo inicializa `TallerLab.init()` (el `init()` de `lab.js`), al que llama `startApp()`, y no `lab.js` al evaluarse, como dice «Estado al 2026-10-06» | No: T008 no le cambia la fuente |
| F2.3: el arranque de `app.js` es una función que se llama en orden | `export function startApp()` en `frontend/app.js`, sin argumentos. `main.tsx` la llama una vez, después del último import, y `TallerLab.init` existe | Sí: dónde se llama, y dos piezas de F2a que dependen de eso (abajo) |
| F2.4: el registro de modelos de Sistemas está en `entities/systems-simulation` | En `model/model-registry.ts`; los `register-systems-*` siguen publicando `SYSTEMS_*` | No |
| FR-005: seis importadores estáticos del JSON | Los mismos seis. F2a sumó cuatro specs de Vitest que importan el JSON (`exercise-catalog`, `lab-store`, `create-campaign-engine.subscription` y `create-systems-engine.subscription`), que no entran al bundle | No |

**La cadena** es la del plan: los 18 módulos de `legacy-views.ts`, en el orden de los imports de `main.tsx` en la base.

**Quién lee contenido al evaluarse** (P1, paso 5, y R1). Se buscó con `grep` y se confirmó ejecutando, porque `grep` no distingue la evaluación de una llamada posterior. Cada uno de los 18 módulos se evaluó solo y después en cadena, sobre la base, en un contexto con los 15 globals de contenido como propiedades que registran lecturas y escrituras y con el almacenamiento bloqueado (`qa/spike-eval-audit.ts`):
- ningún módulo lee un global de contenido al evaluarse, y ninguno toca el almacenamiento;
- `register-catalogs.ts` y los cuatro `register-systems-*.ts` escriben sus globals desde el import del JSON, y `register-atlas.tsx` lo lee a través de `pages/atlas` y `atlas-catalog.ts`;
- las seis vistas leen el contenido recién cuando se las llama: `lab.js` en `init()` (las ocho listas), `campaign.js` en `init()` (`RUST_CAMPAIGN` y `GO_CAMPAIGN`), `systems.js` en `init()` (`SYSTEMS_*`) y `app.js` en `startApp()` (`GUIDE_DATA`, y las campañas en `syncLinkedLanguage()`). `lab-explorers.js` y `quest-explorers.js` no lo leen nunca.

Lo que R1 decía al planificar («hoy son `app.js`, `lab.js`, `campaign.js` y `systems.js`») dejó de valer con la unidad 3 de F2a. Para la alternativa (b), que no hace falta, los que leen al evaluarse serían los adaptadores.

### Recuentos de la base

Reemplazan a los de la spec en las comprobaciones de T013:
- `qa/run-checks.ts`: **31 checks**, los 30 del 2026-10-05 más `seams-guard-check`.
- Vitest: **12 specs, con 186 pruebas**.
- `load-order-check`: **16 restricciones** sobre 24 imports, más tres reglas: «`app.js` último», «`styles.css` primera» y, desde F2a, «`startApp()` exactamente una vez, después del último import».
- `boot-check`: **14 casos**, los 10 del plan y 4 de la unidad 3 de F2a («each legacy source evaluated alone…», «main.tsx without its call…», «startApp initializes in order…» y «a second startApp call fails»).
- `npm test` pasa en la base.

### P1 · Un documento y el orden de evaluación: pasa

- **Un documento.** Con `npm run build` sobre el prototipo, `dist/index.html` queda con un `<script type="module" crossorigin>` y un `<style>`, sin `src=`, `rel="stylesheet"` ni `modulepreload`, y sin más enlaces que las anclas. `dist/` trae además dos cosas:
  - `content/curriculum.ef8f57154734653554d40a43934c97f3.json`, con los bytes de `build/curriculum.json` y el sha256 del `documentHash`;
  - los dos avisos de licencia, iguales a los de `frontend/`, que emite el plugin del plan.

  `vite-plugin-singlefile` deja los tres activos emitidos como archivos («asset not inlined»). El documento no pide nada más que el contenido.
- **Cómo difiere Rolldown.** Con `codeSplitting: false`, cada `import()` queda como `__vitePreload(() => Promise.resolve().then(() => (init_x(), x_exports)), void 0, import.meta.url)`: el módulo va en línea, dentro de una función de inicio que corre recién cuando se la llama. En el script no queda ningún `import(` real.
- **El orden, en el vm** (`qa/spike-dist-vm.ts`, que evalúa el script del dist con `vm.SourceTextModule` y un `fetch` simulado):
  - la secuencia empieza por el evento `taller:content-published`;
  - siguen las 18 marcas, en el orden exacto de la base, cada una con sus publicaciones;
  - las lecturas de almacenamiento empiezan después de la marca de `app.js` (las cuatro claves, en el orden de `boot-check`), y no hay escrituras.

  Hay un solo pedido, a `/content/curriculum.<versión>.json`. `#main` muestra el recorrido y la consola queda vacía. El script arma un volcado con los globals, los modelos y el Atlas publicados, con las reglas de `dump-globals`, y da `cd1f9e62…`: el mismo hash que `node tools/content/dump-globals.ts .` sobre la base con este documento. La línea base la registra T002.
- **El orden, en Chromium** (`qa/e2e/specs/spike-p1.spec.ts`, con el runner y los fixtures de F1 y `E2E_PORT=4190`): la misma secuencia para `/` y para `/?#laboratorio`, con un espía de `Storage.prototype` y de los globals instalado en `addInitScript`. Hay un pedido de contenido por carga, sin errores de consola ni pedidos bloqueados.
- **La medición detecta una evaluación anticipada.** En una mutación descartada, con `import './legacy/register-runner'` en estático en `main.tsx`, la marca y la publicación de ese módulo aparecen antes del evento.
- **La red de F1 sobre el prototipo:** 103 de 106 en la primera corrida, y 106 de 106 con el cambio de la sección siguiente (109 de 109 con las tres specs del spike). Sobre la base, 106 de 106.
- **El resto de `npm test` sobre el prototipo**, como referencia para T005 y T007. Las 12 specs de Vitest pasan. Fallan 17 de los 31 checks:
  - 14 con «El contenido todavía no se publicó», porque evalúan los adaptadores sin la compuerta: `curriculum-ids`, `guide-content`, `content`, `lab-state`, `app-shell`, `lab-bridge`, `campaign`, `campaign-content`, `systems`, los cuatro `systems-<dominio>` y `project-kit`;
  - `build-check` (P2);
  - `load-order-check` (T007);
  - `boot-check`, por dos casos de F2a (P4).

### El arranque asíncrono y los E2E de F1

Tres pruebas de F1 fallaron sobre el prototipo y pasan sobre la base: `css-contract` («R1 · .lab-nav-count › the counter of the current entry») y dos de `url-contract` («the language switch writes the query», desde `#biblioteca` y desde `#proyecto`). Con `--repeat-each 5` fallaron 5 de 45, en vistas distintas cada vez: es una carrera.

`ShellPage.goto(url)` espera el evento `load`, y la prueba actúa enseguida: pulsa el idioma o lee un estilo. En la base, la app ya arrancó en `load`, porque arranca al evaluarse el módulo. Con la compuerta arranca cuando llega el contenido, y hasta entonces el menú y los botones de idioma no hacen nada, como dice la spec. Con un `goto` que espera la primera vista o el error en `#main`, y no el estado de carga (`page.locator('#main > :not([data-content-gate="loading"])').first().waitFor()`), las tres pasan 45 de 45 y la red completa también. La exclusión importa: con el contenido demorado 1,2 s por `page.route` (`qa/e2e/specs/spike-goto-slow.spec.ts`), esperar cualquier hijo de `#main` (`#main > *`) resuelve sobre el estado de carga y la prueba falla 3 de 3, y el localizador de arriba pasa 3 de 3. Ese cambio va en un archivo de F1 y tiene que entrar con el corte.

### P2 · El cambio mínimo de `build-check` y del check del bundle

- **`node --check`** sobre el script copiado a un `.mjs` parsea (sale 0).
- **`build-check`.** El de la base, sobre el prototipo, falla sólo en `new vm.Script(...)`: «SyntaxError: Cannot use 'import.meta' outside a module». El `import.meta.url` está en cada llamada al ayudante de precarga, una por `import()`. Si esa línea pasa a `node --check` sobre un `.mjs` temporal, el resto de `build-check` pasa sobre el prototipo: un script, un estilo, un doctype, nada externo, las licencias y el tope de hoy. El script de la base también parsea como módulo, así que el cambio vale antes y después del corte.
- **`dump-dist-globals`** sobre el prototipo se detiene con «Cannot use 'import.meta' outside a module» y no publica nada (sale 1). T009 lo retira, como estaba planeado.
- **`vm.SourceTextModule`** evalúa la salida real. Usa el relanzamiento de R9 (`--experimental-vm-modules --disable-warning=ExperimentalWarning`), `initializeImportMeta` con `meta.url` y un `link()` sin imports, y `importModuleDynamically` no se llama nunca. No hace falta el desvío del IIFE.
- **Lo que necesita el contexto**, para T007 y T009. Se comprobó sacando cada pieza:
  - `MutationObserver` (alcanza un stub) o un `relList.supports('modulepreload')` en el `<link>` falso. El polyfill de precarga de Vite corre al principio del script, después del runtime de Rolldown, como vio la sonda, y sin eso el módulo lanza `ReferenceError`. La base ya lo traía, pero nada evaluaba el dist con el DOM falso.
  - `AbortController` y `CustomEvent`: sin ellos, `ReferenceError`.
  - `fetch`: sin él la compuerta no lanza, sino que falla con `network`, así que un arnés al que le falte muestra el error de contenido en lugar de un error del arnés.
  - `Event` y `dispatchEvent` en `window`: el ayudante de precarga despacha `vite:preloadError` cuando un módulo de la cadena lanza. El camino feliz no los usa.
- **`load-order-check`.** Sobre los archivos del prototipo, las dos expresiones de R10 leen `contentGate` y `legacyViews`, en ese orden, las 6 hojas de estilo y las 18 entradas. Las 16 restricciones y las dos reglas de los extremos se cumplen sin cambiar la tabla (`qa/spike-load-order-stages.ts`). La regla de `startApp()` tiene que pasar a `legacy-views.ts`.

### P3 · Tamaños y tope

| | `html.length` | Bytes | `gzip -1` | `gzip -6` | `gzip -9` |
| --- | --- | --- | --- | --- | --- |
| `dist/index.html`, base | 2.190.106 | 2.205.733 | 764.247 | 657.992 | 656.638 |
| `dist/index.html`, prototipo | 1.138.292 | 1.140.808 | 425.030 | 372.528 | 371.802 |
| El mismo, sin las 18 marcas del spike | 1.136.706 | 1.139.222 | | | |
| `content/curriculum.<versión>.json` | | 1.357.065 | 375.519 | 308.588 | 305.878 |

- **El tope de `build-check`:** `piso(1.136.706 × 1,10)` da 1.250.376 y, redondeado hacia abajo a la decena de miles, **1.250.000**. Con las marcas da lo mismo (1.252.121, que queda en 1.250.000). Hoy es 2.500.000. El prototipo ya lleva la compuerta; T010 vuelve a medir sobre el build de T008 y aplica la misma fórmula.
- **El oráculo de ausencia.** La regla de `curriculumMarkers()` (R11) da, sobre este documento, 16 marcadores en las siete familias: dos textos en `lab`, `quests`, `cores`, `campaign` y `workshops`, y dos textos más el `id` en `atlas` y en `guide`. Los 16 están en el archivo de contenido y en el HTML de la base, que es el control positivo, y ninguno en el del prototipo (`qa/spike-markers.ts`).
- El HTML del prototipo contiene la versión, en la URL y como versión esperada.
- `grep -o '<script' dist/index.html | wc -l`, el comando del quickstart (§3), da 2 en la base y en el prototipo, porque React DOM lleva `<script><\/script>` en una cadena. El conteo que vale es el de la expresión de `build-check`, que da 1.

### P4 · El arnés de los checks con un `fetch` simulado

- **Los casos.** `boot-check` corrió sobre `bundleApp` del prototipo (esbuild en IIFE, con `__CONTENT_VERSION__` sumado al `define`), con el arnés extendido y, como `fetch`, el servidor simulado de T007, cuyo `json()` se resuelve con microtareas. Los 10 casos del plan pasan sin cambiar sus valores esperados, y también «each legacy source evaluated alone…», de F2a. Los otros tres casos de F2a dependen de dónde se llama `startApp()`; ver «Lo que el plan corrige antes de T002».
- **El camino feliz se asienta antes de la primera ronda de `flush()`**, con la respuesta mínima y también con un `Response` de Node (1,36 MB, Node 24.21): el pedido, la publicación, los 18 módulos y `startApp()` corren con microtareas, y la carga no se escribe nunca en `#main`. Los dos temporizadores de la compuerta (400 ms y 20 s) corren en las rondas 1 y 2 y no hacen nada, y `flush()` termina en la ronda 3.
- **Con un `fetch` que no responde**, `flush()` corre los temporizadores en el orden en que se encolaron, uno por ronda y sin mirar la demora:
  - ronda 1: el umbral de 400 ms, que muestra la carga;
  - ronda 2: el tope de 20 s, que aborta, y la compuerta muestra `timeout`;
  - ronda 3: termina.

  Ningún módulo de la cadena se evalúa, el almacenamiento no recibe ninguna llamada y no hay errores. Un `fetch` que rechaza da `network`, y un 404, `version`. Con el script del dist en el vm pasa lo mismo (`qa/spike-p4-timers.ts` y `qa/spike-dist-vm.ts`).

### Tiempo hasta la primera vista, antes (R13)

Chrome Headless Shell 1243 (Playwright 1.63.0) contra `vite preview` en `127.0.0.1:4190`, con el observador de `#main h1` del quickstart (§9). Cada medición carga la página en un contexto nuevo (sin caché) y vuelve a navegar a la misma URL en el mismo contexto (con caché). Se hicieron cinco series de 20, tres de ellas intercaladas con el prototipo, en una máquina con otros procesos:

| Build | Sin caché: mediana (p10–p90; mínimo–máximo) | Con caché: ídem | Transferido sin caché | Transferido con caché |
| --- | --- | --- | --- | --- |
| Base | 166 ms (147–204; 134–279) | 70 ms (59–82; 53–111) | HTML: 658.292 B | HTML: 300 B (304) |
| Prototipo, sólo como referencia | 185 ms (155–327; 142–448) | 76 ms (64–133; 59–169) | HTML: 372.828 B; contenido: 308.888 B | 300 B cada uno (304) |

`vite preview` comprime y revalida: en la segunda carga, el HTML y el contenido vuelven con un 304. Las medianas por serie van de 152 a 178 ms en la base, y de 157 a 196 ms en el prototipo, salvo una serie con ruido de 293 ms. Mientras se medía corrían las pruebas de otro agente, así que estas cifras sirven de orden de magnitud. Para comparar, T013 conviene que mida el «después» intercalado con un build de `c5d497d`, con `spike-first-view.spec.ts` de `a2/spike`.

### Lo que el plan corrige antes de T002

Por la regla de «Lo que A2 supone de F1 y F2», se corrige en un commit propio:
1. **`startApp()` se llama en `legacy-views.ts`**, después del último `import()` (`const { startApp } = await import('../../../app.js'); startApp();`). El código de referencia de T008 no la llama.
2. **T007 cubre 14 casos de `boot-check`, no 10.**
   - La regla de `startApp()` de `load-order-check` pasa a `legacy-views.ts`.
   - Los tres casos de F2a que usan `bundleApp(ENTRY, { withoutStartCall: true })` dejan de quitar la llamada, porque esa opción aplica una expresión sólo a la entrada, por el `stdin` de esbuild. «main.tsx without its call…» pasa en vacío, y los otros dos fallan con un `TypeError`, porque `window.TallerLab` todavía no existe.
   - Con la llamada fuera de `legacy-views.ts` y un `flush()` antes de `startApp()`, los tres pasan con sus mismos valores esperados (`qa/spike-startapp-cases.ts`).
   - Cómo llega `withoutStartCall` a `legacy-views.ts` lo decide T007: la API síncrona de esbuild no tiene plugins.
3. **`ShellPage.goto` espera la primera vista o el error, no el estado de carga, y el cambio entra con el corte (T008), no con T011.** Sin él, la red de F1 se vuelve intermitente desde T008. Además, `goto` recibe la URL: el ejemplo de T011 la omite.
4. **El arnés de T007 y T009** suma `MutationObserver` (o `relList.supports`), `Event` y `dispatchEvent`, además de lo que ya lista R12.
5. **El quickstart** cuenta los `<script>` con la expresión de `build-check`, no con `grep`.
6. **«Estado al 2026-10-06»:** el catálogo lo inicializa `TallerLab.init()`, dentro de `startApp()`. No cambia ninguna tarea.

### Cómo se reproduce

En `a2/spike` (`3baadc2`), después de `npm run build`:
- P1 y P2 en el vm: `node qa/spike-dist-vm.ts [serve|hang|reject|status404]`.
- P1 en Chromium: `E2E_PORT=4190 npx playwright test --config qa/e2e/playwright.config.ts specs/spike-p1.spec.ts`. La primera vista, con `specs/spike-first-view.spec.ts` y `SPIKE_RUNS=20`; la espera de `goto`, con `specs/spike-goto-slow.spec.ts`.
- P4: `node qa/boot-check.ts`, `node qa/spike-p4-timers.ts` y `node qa/spike-startapp-cases.ts`; el último, con la llamada quitada de `legacy-views.ts`.
- P2 y P3: `node qa/spike-build-check-module.ts` (`build-check` con `node --check`), `node qa/spike-load-order-stages.ts` (R10) y `node qa/spike-markers.ts . <html>…` (los marcadores).
- La auditoría de quién lee contenido al evaluarse: `node qa/spike-eval-audit.ts` con el `frontend/` de la base (`git checkout c5d497d -- frontend` antes y `git checkout HEAD -- frontend` después).
