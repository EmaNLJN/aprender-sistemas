# Research: A2 · Compuerta de arranque

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

El clarify del 2026-10-05 cerró las cinco preguntas de la spec. Este archivo registra las decisiones de diseño que la spec delegó en el plan, con su motivo y sus alternativas, y cómo se verificó cada cosa al planificar. Lo que mide el spike (T001) se agrega al final, en «Resultados del spike», cuando corra.

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

**Rationale**: la unidad 3 de F2 cambia cómo arranca `app.js`, y la 2 cambia dónde se arma el catálogo que hoy arma `lab.js` al evaluarse. Medir sobre `master` mediría un arranque que ya no va a existir. La sonda del 2026-10-05, que la spec cita, sirve de pista y no obliga: corrió sobre tres módulos triviales. La alternativa (b) es nueva respecto de la spec: sólo existe si F2 deja el arranque explícito, y T001 la audita con `grep` (qué módulos leen `window.GUIDE_DATA` o los catálogos al evaluarse; hoy son `app.js`, `lab.js`, `campaign.js` y `systems.js`).

**Alternatives considered**: correr el spike ahora sobre `master`, descartado por lo anterior; correrlo en el plan sin una tarea propia, descartado porque el coordinador pidió que sea la primera tarea con su regla de parada.

## R2. La técnica, condicionada a P1: `import()` encadenados desde una etapa

**Decision**: `frontend/src/app/boot/legacy-views.ts` declara la cadena de la base como un arreglo de `() => import('…')`, uno por línea y en el mismo orden que la lista de imports de `main.tsx`, sin las hojas de estilo. La etapa `legacyViews` los espera de a uno. Los adaptadores `register-*` siguen siendo módulos con efectos, en su posición de hoy, y leen el contenido con `getContent()` al evaluarse.

**Rationale**: conserva el orden de evaluación sin editar ninguna vista legacy (FR-003 y FR-023) y deja que `load-order-check` siga comprobando posiciones. Un adaptador convertido en función del contenido sacaría diez restricciones de la tabla y las convertiría en una regla entre etapas: relajaría lo que FR-003 manda no relajar. `qa/lib/sources.ts` empaqueta con esbuild en IIFE, que convierte un `import()` de un módulo empaquetado en una promesa que evalúa el módulo al llamarla, así que `boot-check` lo arranca sin cambios en el empaquetado; con la salida de Vite, lo confirma P1.

**Alternatives considered**: top-level await (lo rechaza el arnés); una función de arranque por vista (toca seis archivos legacy); los chunks estándar de Vite (adelantan C4); `Promise.all` en lugar de una espera secuencial (rompe el orden).

## R3. La versión viaja en el nombre del archivo

**Decision**: el build copia `build/curriculum.json` a `dist/content/curriculum.<versión>.json`, donde la versión son los primeros 32 hexadecimales de `documentHash`. Los bytes no cambian: el sha256 de la copia es el `documentHash` completo, y el archivo que genera `tools/content` conserva su nombre en `build/`. La página pide `/content/curriculum.<versión>.json`, con la versión como constante del build (`__CONTENT_VERSION__`).

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
- La spec, en Q1, llama al artefacto «`curriculum.json`». Sus bytes son los del generador; sólo cambia el nombre de la copia servida, y FR-011 dejaba al plan elegir cómo viaja la versión.

**Alternatives considered**: ver la tabla; además, un archivo por porción (17 pedidos para una fuente que A3 retira) y un manifiesto aparte con la versión (un pedido más y el mismo problema de coherencia).

## R4. `dist/` es la raíz web completa y llega entero a Nginx y a la vista previa

**Decision**:
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
- `frontend/src/app/boot/legacy-views.ts`: un `() => import('<ruta>'),` por línea dentro de `LEGACY_MODULES`, que el check lee con `/^\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\),?\s*$/gm` y normaliza como hoy (rutas relativas a la raíz, con las extensiones que resuelve). La tabla actual de restricciones sigue igual sobre esa lista, con «`app.js` último» (último `import()` de la lista; si F2.3 deja una llamada de arranque, va después y la regla sigue leyendo los imports).

**Rationale**: así `load-order-check` sigue comprobando posiciones sin relajar nada (FR-003) y sin ejecutar nada, y el cambio de formato queda en un lugar con nombre.

**Alternatives considered**: ejecutar `main.tsx` para leer el orden real (el check hoy es estático a propósito); poner cada módulo legacy como una etapa (mezcla dos niveles de orden).

## R11. `build-check`

**Decision**:
- **Estructura:** sigue exigiendo un `<script>`, un `<style>`, un solo documento y ningún enlace ni script externo, y las licencias retenidas.
- **Módulo:** parsea el script con `node --check` (R9).
- **Tope:** `html.length < tope`, con `tope = piso(medido × 1,10)` redondeado hacia abajo a la decena de miles, que no pasa del 10 % de la spec (FR-015 y SC-003). `medido` es el `html.length` que mide T001 sobre el prototipo (P3); T010 escribe el valor y la medida que lo respalda en el mensaje de su commit. Hoy es 2.500.000 y el HTML pesa 2.202.074 bytes (cierre de A1); sin los 1,07 MB que estimó el ADR 0004 sería del orden de 1,1 MB.
- **Oráculo de ausencia:** de `build/curriculum.json`, por cada una de las siete familias (`lab`, `quests`, `cores`, `campaign`, `workshops`, `atlas`, `guide`), el `id` y los dos textos más largos de la primera entrada, elegidos entre los que sólo tienen caracteres ASCII imprimibles sin comillas, barras ni saltos (el bundle los escapa y un marcador con comillas daría un falso «ausente»). Se descarta el marcador que aparece en las fuentes de `frontend/`, y quedan al menos dos por familia. Cada marcador tiene que estar en el archivo servido (control positivo: un oráculo que busca texto que no existe pasaría siempre) y no puede estar en el HTML. SC-003 pedía un ID, un título y una pista por familia: se usan los dos textos más largos que sean seguros porque los títulos y las pistas suelen llevar acentos o comillas que el bundle escapa.
- **Artefacto:** `dist/content/curriculum.<versión>.json` existe, tiene el sha256 del `documentHash` del meta, y el HTML contiene la versión.
- **Mutación (T010):** un import estático del JSON, hecho a mano y descartado, tiene que hacer fallar el check por el tope y por los marcadores (US3, escenario 3).

**Alternatives considered**: sólo el tope (un contenido chico, como una porción, se colaría); marcadores con comillas (falsos negativos); un análisis del bundle con esbuild (otro parser).

## R12. `boot-check` y su arnés

**Decision**:
- El arnés (`createBootHarness`, hoy dentro de `boot-check.ts`) pasa a `qa/lib/boot-harness.ts`, para que lo use también el check del bundle construido. Suma al contexto `fetch`, `AbortController`, `CustomEvent` y un `dispatchEvent`, espías de las tres funciones de `localStorage` (cada llamada queda en `storageCalls`) y la captura del evento de publicación, con los globals que existían en ese instante. `bootError` sigue para lo síncrono (la evaluación del grafo estático); una excepción de la cadena es asíncrona y queda en `errors`, porque `main.tsx` la registra con `console.error`.
- `qa/lib/content-server.ts` simula el servidor de contenido: sirve los bytes de `build/curriculum.json` en `/content/curriculum.<versión>.json`, la versión sale de `build/curriculum.meta.json`, cualquier otra ruta da 404 y registra cada pedido. Cada intento sigue un comportamiento de una lista: servir, rechazar, un estado, un texto, un documento alterado o colgarse hasta que aborte la señal.
- Los 10 casos conservan sus valores esperados. Se suman los escenarios de FR-020: ninguna vista ni catálogo antes de la publicación; los siete modos que se ven por el transporte (red, 404 como versión, 500, tope, cuerpo que no es JSON, porción ausente y porción con otra forma), cada uno con las vistas sin evaluar, `storageCalls` vacío, sin claves `:respaldo`, sin aviso, con el mensaje y «Reintentar» y con el foco en el botón; el reintento que arranca; y el pedido único ante dos clics.
- El tope de espera funciona con el arnés tal como está: un `fetch` que se cuelga hasta que aborte la señal, y `flush()` corre el temporizador del tope, que aborta. La lógica fina de los temporizadores (umbral, tope exacto, idempotencia) se prueba con los temporizadores simulados de Vitest.

**Alternatives considered**: darle al arnés un reloj con demora real (cambia lo que hacen los 10 casos que dependen de que `flush()` corra todo); probar la compuerta sólo con Vitest (no ve que ninguna vista se evalúe ni que el almacenamiento quede intacto); duplicar el arnés para el check del bundle.

## R13. Los E2E de A2 en la red de F1

**Decision**: un archivo de specs de A2 en `qa/e2e/`, más lo que necesite del Page Object del shell (la región del error y el botón). Cada escenario produce su falla con `page.route` sobre `**/content/curriculum.*.json`:

| Escenario | Cómo |
| --- | --- |
| Los cinco enlaces profundos y la recarga | Abre cada forma de URL de la User Story 1 y recarga; vista y contexto como hoy; un solo pedido de contenido por carga |
| Sin red | `route.abort()` |
| Contenido roto | `route.fulfill` con un 200 con basura, un 500, un 404 y un documento al que le falta `lab.go` o con `quests.rust = {}` (se arma desde el archivo real con `route.fetch()`) |
| Tope de espera | La ruta no responde y `page.clock.fastForward(20000)` |
| Reintento | El primer pedido falla y el segundo pasa (`route.continue()`); el arranque sigue sin recargar |
| Progreso intacto | Con `qa/fixtures/progress-master-2a278ad-storage.json` sembrado, en cada falla las cuatro claves no cambian, no hay `:respaldo` y un espía de `Storage.prototype` cuenta 0 lecturas y 0 escrituras |
| Teclado | El foco queda en «Reintentar» y Enter lo opera |
| Móvil | `test.use({ viewport: { width: 390, height: 844 } })` |

**Dos puntos que dependen de F1** (la spec de F1 sigue sin clarify): (a) si F1 adopta que un `console.error` hace fallar el test, cada escenario de falla tiene que declarar su entrada en la lista blanca, porque Chromium escribe «Failed to load resource» ante un 404, un 500 o un pedido abortado (no verificado: lo comprueba T011); (b) su configuración es de escritorio (Desktop Chrome), y el móvil se pide por `test.use` en el archivo de A2.

**Rationale**: la verificación en un navegador real es de F1 por decisión del usuario (Q5). El tiempo hasta la primera vista se mide aparte, con un observador de mutaciones inyectado con `addInitScript` que anota `performance.now()` cuando aparece el primer encabezado de `#main`: antes (T001, sobre la base) y después (T013), con y sin caché del navegador. Es un dato, sin umbral.

**Alternatives considered**: una lista manual (la que el usuario reemplazó); Firefox y WebKit (fuera de ADR 0008).

## R14. Lo que A3 retira y lo que cambia C4

**El puente es trabajo que A3 descarta**, y conviene dejarlo contado:
- `createStaticContentSource` y su spec, y el cableado de `content-stage.ts` (A3 lo reemplaza por la fuente de la API).
- Del plugin de `vite.config.ts`, la emisión del archivo de contenido, el middleware de `npm run dev` y `__CONTENT_VERSION__`. Los avisos de licencia se quedan.
- Nada del `Dockerfile` ni de la vista previa: copian y montan `dist/` entero, así que cuando el build deja de emitir `content/`, la imagen y la vista previa también lo pierden. C4 lo vigila (FR-022 de su spec, en la rama `spec/c4-exposicion`): la imagen web no puede tener el documento estático ni `build/curriculum.json` ni su meta, y una prueba pide al Nginx público las rutas conocidas del puente (`/content/` y `/content/curriculum.<versión>.json`) y espera 404.
- De `qa/`, `readBuiltContent` de `qa/lib/built-page.ts`, la exigencia del archivo junto al HTML de `build-check` (que pasa a exigir que `dist/content/` no exista) y la parte de los bytes servidos del check del bundle construido. El oráculo de ausencia y el tope se quedan.

Se quedan: la compuerta, la validación por porción, los estados de espera y de error, el almacén y `getContent()`, el evento, la secuencia de etapas y los oráculos. La hoja de ruta tendría que anotar este retiro en el alcance de A3: la spec lo da por anotado y no está (A2 sólo toca su propia fila y una línea de estado).

**Lo que cambia C4.** Retira `vite-plugin-singlefile` y el `dist/` pasa a varios archivos, con la CSP sin `'unsafe-inline'`. Lo que A2 deja aislado para eso: `qa/lib/built-page.ts`, `assertSinglefileDocument` de `qa/build-check.ts` y el plugin de `frontend/vite.config.ts`. La compuerta no suma scripts ni estilos en línea (el marcado del error no lleva manejadores ni `style=`, y el botón usa `addEventListener`), así que no hay nada que reemplazar en ella.
