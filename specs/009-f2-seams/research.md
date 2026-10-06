# Research: F2a · Seams sin cambio visible, unidades 1 a 4

Las decisiones de diseño del [plan](./plan.md), con su motivo, sus alternativas y lo que se midió. Las decisiones del usuario (clarify del 2026-10-06) están en «Decisiones del usuario» del plan; acá están sus pruebas y sus mediciones.

## Cómo se verificó

Se planificó sin tocar el código de producción del repositorio y sin instalar nada. Lo único que se bajó fue el código publicado de Zustand 5.0.15, a un directorio temporal fuera del repositorio, para leerlo y medirlo (punto 3).

1. **Este worktree** (`spec/f2-seams`, `master` en `0df5b07` más los documentos de `spec/front-react`; `frontend/`, `qa/`, `tools/` y `content/` son los de `master`). `npm ci --offline --no-audit --no-fund` (193 paquetes, 5 s), `npm run build`, `npm test`, `npm run lint` y `npm run format:check`; los hashes, los tamaños y los conteos de «Línea base»; las lecturas de almacenamiento del arranque (un `getItem` registrado por clave, con la fixture de master); la evaluación de cada fuente legacy sola con un almacenamiento que cuenta los accesos; y el punto donde se detiene `dump-dist-globals`.
2. **Una copia de `feat/f1-red-de-seguridad` (`8932fa6`)** con `git archive`, en el directorio temporal y fuera del repositorio, con el `node_modules` del worktree de F1 enlazado (trae Vitest y Playwright) y el Chrome Headless Shell de la caché de Playwright. Ahí corrieron los experimentos que pedían la red de F1 y Vitest:
   - **Base:** `npm run build` y los 106 E2E en verde (11,7 s).
   - **R2, Sistemas lanza sin `init`:** un parche de cinco líneas en `create-systems-engine.ts`; `npm test` da los 30 checks en verde y falla sólo la prueba `KNOWN DEFECT` de Sistemas de Vitest (1 de 3); el build y los 106 E2E, en verde.
   - **R6, `startApp`:** `app.js` convertido en `export function startApp()` con la guarda, y `main.tsx` con el import con nombre y la llamada. El build da `dump-globals`, `dump-dist-globals`, `<style>` y marcado con los mismos hashes; `boot-check` 10 de 10; los 106 E2E en verde. `load-order-check` falla (no ve el import con nombre) y `app-shell-check` da 4 de 51 (`app.js` ya no arranca solo), como predice la unidad 3.
   - **R7, los arneses:** `runModule` con esbuild `globalName` envuelto en una IIFE devuelve `startApp` y vuelve `app-shell-check` a 51 de 51; `tsc -p tsconfig.qa.json` en verde. Con `app.js` convertido y `main.tsx` con su llamada, el bundle sin la llamada, armado con una entrada `stdin` de esbuild, se evalúa sin errores y deja `#main` vacío; sobre la base, el bundle de `main.tsx` evaluado con un almacenamiento que lanza hace 4 accesos (laboratorio, recorrido, campaña y Sistemas) y dibuja.
   - **R4 y R9, los módulos:** `exercise-catalog` (con su contenedor), `build-program`, `model-registry` y `route-store` con sus specs, este con una señal propia (`change-signal`) que Q3 descartó, y la interfaz de `lab-store`. 17 pruebas de Vitest en 6 archivos (3 de F1 más 14 nuevas, con las de esa señal) en verde; `npm run typecheck` y `eslint` sin avisos nuevos. `systems.js` con `mergeModelGroups`: `lab-bridge-check` 21 de 21 en 0,61 s, `systems-check` 46 de 46 y el HTML con 46 caracteres más. Lo de la señal propia y del almacén que la usaba se rehace con Zustand (R3): no vale tal cual.
3. **Zustand 5.0.15, el 2026-10-06 y sin instalarlo en el repositorio** (R3 y R13). Context7 no estaba disponible: se leyó la documentación oficial ([`createStore`](https://zustand.docs.pmnd.rs/reference/apis/create-store), [`useStore`](https://zustand.docs.pmnd.rs/reference/hooks/use-store) y [estado inmutable y fusión](https://zustand.docs.pmnd.rs/learn/guides/immutable-state-and-merging)), el registro de npm (`npm view zustand version dist.unpackedSize`, con `dist.fileCount`, `dist.integrity`, `engines`, `peerDependencies` y `license`) y el código publicado, que se bajó de unpkg al directorio temporal sin instalar nada: `esm/vanilla.mjs`, `esm/vanilla.d.mts`, `esm/react.mjs`, `esm/react.d.mts`, `esm/index.*`, `package.json` y `LICENSE`. Sobre esos archivos corrieron scripts descartables:
   - **La semántica de `createStore`**, con Node, sobre `esm/vanilla.mjs`: el estado inicial, `getInitialState`, los argumentos del oyente, la baja repetida, una misma función suscripta dos veces, `setState` con el mismo objeto, y un oyente que lanza.
   - **El empaquetado**, con el esbuild del repositorio y las opciones de `bundleSource` (IIFE, navegador, es2020, evaluado en un contexto de `vm`) y de `importModule` (ESM, Node, es2022, cargado desde una URL `data:`), sobre una copia mínima del paquete: `zustand/vanilla` se resuelve por el mapa `exports`.
   - **El tipado**, con el TypeScript del repositorio en modo estricto y resolución `Bundler`: un singleton con `readonly changes: StoreApi<{ revision: number }>`, un consumidor con `useStore(store, selector)` y uno de vanilla con `subscribe`. El control negativo: `useStore(store)` sin selector también compila.
   - **El peso**, con el esbuild del repositorio: 354 caracteres minificados; 425 con un store y su `setState`; 476 con cuatro; 499 con una fábrica de ejemplo y su `save`.
4. **Lo que no corrió:** Zustand dentro del repositorio (la instalación, Vite, Vitest y los arneses completos de `qa/`), el almacén del laboratorio (sólo su interfaz compila), los avisos de los motores, el guard, los arneses completos de la unidad 3, el job de la CI, la imagen web de Docker, macOS, Firefox y WebKit.

## Línea base

Medida en este worktree el 2026-10-06. T001 la vuelve a tomar sobre la base de implementación y agrega a este archivo la sección «Línea base de la implementación».

| Qué | Valor |
| --- | --- |
| Node y npm | 24.21.0 y 11.19.0 |
| `build/curriculum.json` | 1 357 065 bytes; sha256 `ef8f57154734653554d40a43934c97f34ed550aad54867e31b197365355803d4`, igual al `documentHash` de `build/curriculum.meta.json` (87 611 bytes) |
| `node tools/content/dump-globals.ts .` (stdout) | 1 153 582 bytes; sha256 `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745` |
| `node tools/content/dump-dist-globals.ts dist/index.html` (stdout) | 1 022 787 bytes; sha256 `daf2bc7108033cf02a855562e391d7360f618abb7327a7c0cac2d27865a464bc`. Su stderr dice «La evaluación se detuvo en: URLSearchParams is not defined» y el código de salida es 0 |
| `dist/index.html` | 2 186 460 caracteres y 2 202 074 bytes; sha256 `5f3f0c567a04b8788b4a7209281f27c2f2b8c41831f84e543afacb2c43be2b66`. El build es determinista: dos builds seguidos dan el mismo hash, también sobre la copia de F1 |
| Script del dist | 2 079 845 caracteres; un solo `<script type="module">`; `import(` 0 e `import.meta` 0 |
| `<style>` del dist | 102 229 caracteres; sha256 `850ef8219cf8a73e79b5edaf888d591051ec933b78ab2e09a175d1aa66623be1` |
| Marcado del dist (con los scripts y el estilo vaciados) | 4 331 caracteres; sha256 `562c5364481ca6138bc41a18c3c5318083bdca479e087ac32461755081ac81d0` |
| `frontend/src/index.html` | sha256 `6c3b7e6a81500f0067fa6932b841027773f8603ed7ea2bd363edf03e57a82179` |
| Tope de `qa/build-check` | `html.length < 2 500 000` caracteres: margen de 313 540. Las cifras de la spec y de la hoja de ruta («2 202 074») son bytes, no caracteres: el tope se mide en caracteres |
| `npm run lint` | 0 errores y 35 avisos de complejidad: 29 en las seis vistas legacy (`app.js` 6, `lab.js` 13, `campaign.js` 2, `systems.js` 2, `lab-explorers.js` 2 y `quest-explorers.js` 4) y 6 en `qa/` |
| Funciones que F2a mueve con más de 10 | `app.js:parseProgress` (22) y `lab.js:sanitizeRecord` (14) |
| `npm run format:check` | en verde |
| Tiempos | `npm run build` 13 s (con el currículo y `typecheck`); `npm test` 13 s (30 checks); `npm run lint` 3 s |
| Escenarios por check | `boot-check` 10; `app-shell-check` 51; `lab-state-check` 37; `lab-bridge-check` 21; `systems-check` 46; `project-kit-check` 11; `campaign-check` 34; `versioned-storage-check` 33; `quest-explorers-check` 47 aserciones; `load-order-check` 24 imports y 16 restricciones |
| Tiempos de los checks que tocan las unidades | `lab-bridge-check` 0,63 s; `boot-check` 0,42 s; `app-shell-check` 0,26 s; `lab-state-check` 0,47 s; `systems-check` 0,39 s; `project-kit-check` 0,44 s |
| Lecturas de almacenamiento del arranque, con la fixture de master | cuatro `getItem` y ninguna escritura, en este orden: `taller-laboratorio-v1`, `taller-learning-v1`, `taller-campaign-v1`, `taller-systems-v1` |
| Las seis fuentes legacy evaluadas solas (sin catálogos ni adaptadores; el almacenamiento lanza y cuenta los accesos) | `app.js` lanza («Cannot read properties of undefined (reading 'tracks')», porque lee `window.GUIDE_DATA`); `lab.js` toca el almacenamiento una vez; `campaign.js`, `systems.js`, `lab-explorers.js` y `quest-explorers.js` no lanzan y no lo tocan |
| Los E2E de F1 (copia de `8932fa6`) | 106 pruebas en 8 specs, 11,7 s |
| Vitest de F1 | 2 archivos y 3 pruebas |

## R1. Dónde viven el plan y las tareas de F2a

**Decisión.** En `specs/009-f2-seams/`, con el título «F2a». La spec sigue entera (F2): el usuario aceptó la partición el 2026-10-06 y la spec la registra, pero no se parte en dos archivos todavía. F2a queda en esta carpeta y F2b recibirá una carpeta nueva, con FR-043 a FR-060 y las 18 reglas de toda unidad, cuando se planifique, como C3a (`004`) y C3b (`010`).

**Motivo.** La spec dice que cortarla es mover rangos, no reescribirlos, y el coordinador pidió planificar F2a ya. `.specify/feature.json` apunta a esa carpeta.

**Alternativa.** Crear la carpeta de F2b ahora: nadie lo pidió y todavía no hay un plan de F2b que guardar en ella.

## R2. Sistemas lanza sin `init` en la unidad 1

**Decisión.** El cambio del motor de Sistemas y la inversión de la prueba de riesgo 2 de F1 van en la unidad 1 (T010); la unidad 3 sólo prueba que `startApp()` inicializa los dos motores antes de la primera vista (T016).

**Evidencia.**

- Con el parche de cinco líneas en `create-systems-engine.ts` (`requireStore()` en `requireWorkshop`, `refreshFromLab`, `planImport`, `list` y `exportState`), los 30 checks pasan y los 106 E2E también; sólo falla la prueba de Vitest que fija el defecto, porque `list` ahora lanza. Ningún check y ningún E2E usa el motor antes de `init`.
- `lab.js` llama a `TallerSystems?.refresh()`, que usa `engine.refreshFromLab`, sólo con la vista montada, y `app.js` inicializa antes de dibujar.

**Motivo.** La spec exigía en FR-022 (unidad 1) que un motor sin abrir falle «igual en los cuatro» y, en FR-040, que se invierta esa prueba en la unidad 3. El clarify del 2026-10-06 (Q2, opción A) corrigió FR-040 y asignó las dos inversiones a la unidad 1: el cambio es de `entities/systems-workshop`, y la 1 integrada sin invertir la prueba rompería `npm test`. Dejarlo en la 3 haría, además, que cambiar Q2 tocara dos unidades.

**Alternativas.** Dejarlo en la 3, como decía la spec antes del clarify: Q2, B o C cambiaría dos unidades. Que la unidad 1 deje la prueba de Sistemas como está y la 3 la invierta: `npm test` queda en rojo en la 1 si Sistemas ya lanza, y en verde sólo si el cambio de comportamiento también espera a la 3.

## R3. La suscripción: un store de Zustand con la revisión

**Decisión.** Cada almacén y cada motor expone `changes`: el `StoreApi` de un store creado con `createStore` de `zustand/vanilla`, dentro de su fábrica, cuyo estado es `{ revision: number }` y nada más. La revisión sube en uno por operación pública, después de escribir. El progreso se lee aparte: con `getProgress()` (el recorrido y el laboratorio) o con `exportState()` (los motores). Un componente usa `useStore(store.changes, (state) => state.revision)`; el código que no es de React, `changes.subscribe` y `changes.getState()`. (Q3, decidida por el usuario.)

**Motivo.**

- El usuario eligió Zustand: prefiere librerías conocidas antes que código propio, y `AGENTS.md` lo pide para el estado de cliente compartido, con acciones explícitas y selectores chicos, sin suscribir al store completo y sin guardar valores derivados.
- El progreso no entra al store. El laboratorio muta su estado y sus registros en el lugar en cada escritura (`absorbStored` devuelve el mismo objeto; ADR 0003, decisión 9; FR-025), y `app.js` muta el del recorrido entre dos fusiones y lo reemplaza al fusionar con otra pestaña, al importar y al borrar. Zustand actualiza de forma inmutable y avisa sólo si el estado cambió de identidad (`Object.is`): un selector sobre el progreso no avisaría de lo que cambia en el lugar, y una copia en el store dejaría dos fuentes de verdad (FR-026). La revisión es un entero que `notify` renueva en cada operación, así que cambia de identidad siempre: es la única selección fiable. Los motores, cuyo `exportState()` clona en cada llamada, tampoco servirían de instantánea.
- La revisión sube una sola vez por operación y después de escribir: un oyente ya ve lo escrito, y `applyImport` y `reset` del laboratorio, que pasan por `save()`, no suman un segundo aviso. `persist()` de los motores no avisa. (La versión anterior de este plan dejaba la unidad ambigua: avisar al final de `persist()` y otra vez al final de `applyImport` habría sumado dos avisos.)
- En Zustand `getState` es la lectura del store, así que el estado vivo del recorrido y del laboratorio pasa a llamarse `getProgress()`: un singleton con dos `getState` se confundiría. Nadie tomaba todavía el nombre anterior fuera del plan.
- Cada fábrica crea su store, así cada spec que usa una fábrica tiene el suyo, en 0.

**Lo que se verificó**, con Node, sobre `esm/vanilla.mjs` 5.0.15 (punto 3 de «Cómo se verificó»):

| Comportamiento | Resultado |
| --- | --- |
| Estado inicial y `getInitialState()` | `{ revision: 0 }`, y sigue siendo el mismo objeto tras los cambios |
| `setState((state) => ({ revision: state.revision + 1 }))` | reemplaza el objeto y sube en uno; el oyente recibe `(estado, estadoAnterior)`: `[1, 0]` y `[2, 1]` |
| `setState` con el mismo objeto | no avisa: por eso `notify` devuelve siempre un objeto nuevo |
| La baja | la segunda llamada no lanza; el oyente no se vuelve a llamar |
| La misma función suscripta dos veces | se registra una vez (es un `Set`) |
| Un oyente que lanza | la excepción llega a quien llamó a `setState`, los oyentes siguientes no se llaman y el estado ya cambió |
| Un oyente que se da de baja a sí mismo | se llama una vez |
| La API del store | `getInitialState`, `getState`, `setState` y `subscribe`: `setState` es público, y sólo el dueño lo llama |

**Qué avisa.** Después de cada operación que persiste o reemplaza el estado: `save()` aunque no pueda guardar (el estado en memoria cambió y `storageAvailable()` puede haber cambiado), `applyImport` siempre y `reset`. `refreshFromLab` no avisa: deriva sellos en memoria sin guardar, y el cambio llega con el `syncLab` que los persiste. No se escucha el evento `storage`: la fusión con otra pestaña ocurre dentro de `write`, cuando la clave cambió desde la última lectura (ADR 0003, decisión 9); escuchar el evento sería un comportamiento nuevo (FR-024).

**Alternativas.**

- **La suscripción propia** (una señal con `subscribe`, `notify` y `getRevision`, de unas 30 líneas y sin dependencia; la opción A que recomendaba la spec en Q3): el usuario eligió Zustand. Aislaba los oyentes que lanzan (`console.error` y seguir); con Zustand ese aislamiento no existe (riesgo 11 del plan).
- **El progreso dentro del store de Zustand**, el uso idiomático: obliga a copiar el progreso o a reescribir la fusión en el lugar, cambia FR-025 y FR-026 y deja dos fuentes de verdad mientras `app.js` y `lab.js` mutan el suyo. Si el usuario lo quisiera, es una decisión nueva y la unidad 1 cambiaría entera.
- **Un envoltorio compartido** en `shared/lib` (una función `createRevisionStore`, el tipo del estado y un selector `selectRevision`): evita repetir `createStore` y el incremento en cuatro fábricas y fija el contrato en un solo lugar. Se descartó: son dos líneas de la librería, cada fábrica se lee mejor con la API conocida y no queda una abstracción propia que mantener. Si aparece un consumidor que lo pida, se agrega.
- **Un aislamiento propio de los oyentes que lanzan**, envolviendo `subscribe`: reescribe lo que la librería hace distinto y cambia la forma de `api.subscribe` que espera `useStore`. F2a no tiene oyentes que lancen.
- **Una vista de sólo lectura del store**, `Pick<StoreApi<…>, 'getState' | 'getInitialState' | 'subscribe'>`, que `useStore` acepta: evitaría que alguien llame `setState`, pero suma un tipo propio por un riesgo que hoy no existe, porque los consumidores son de confianza. La convención (sólo el dueño) y la revisión alcanzan.
- Una instantánea clonada y cacheada por revisión (`getSnapshot`): copia el estado del laboratorio (cientos de KB) en cada cambio observado. Se puede sumar encima de la revisión cuando un consumidor la pida.
- Comparar la identidad del estado: no funciona para el laboratorio.
- Un oyente del evento `storage`: comportamiento nuevo, fuera de F2.

## R4. La comparación única de la unidad 2

**Decisión.** Compara, sobre los 274 ejercicios, `TallerLab.buildProgram` del `lab.js` base con `buildProgram` del módulo, con tres entradas por ejercicio (el borrador inicial, la solución y la solución con una prueba propia): 822 programas.

**Evidencia.** Corrió sobre la copia de F1 con `buildProgram` movido a TypeScript sin cambiar un carácter de las plantillas: 274 ejercicios, 822 programas comparados, 0 diferencias. El script evalúa `lab.js` con `runSource` y los catálogos con `loadLabCatalogs` (como los checks) e importa el módulo con `importModule`; está en [quickstart.md](./quickstart.md), §3.

**Motivo.** Ningún E2E compara el texto de un programa (la red de F1 arma sus resultados a mano y no pasa por `buildProgram`), y los checks sólo ven el programa de unos pocos ejercicios. Es la forma de la comparación diferencial que usó el refactor P8 (`docs/refactor-roadmap.md`).

## R5. Cuándo abre cada pieza, unidad por unidad

**Decisión.** Las unidades 2 y 1 mueven el catálogo y los almacenes a módulos, pero `lab.js` y `app.js` los siguen abriendo al evaluarse, ahora por los singletons. Recién la unidad 3 mueve esas llamadas a `TallerLab.init` y `startApp()` (tabla de §3.0 del plan).

**Motivo.** Cada unidad es revertible sola, con las que dependen de ella en orden inverso (FR-001). Si la unidad 1 ya moviera las aperturas a `startApp`, revertir la 3 dejaría una app que no abre nada. Así también cada unidad queda probada con la red de F1 sin cambiar el orden de los efectos, que es lo único que la unidad 3 cambia, a propósito y con su prueba.

**Alternativa.** Hacer el arranque explícito en la unidad 1: mezcla dos cambios de comportamiento en un PR y obliga a que la 2 espere a la 1.

## R6. La forma de `startApp` y por qué los oráculos no cambian

**Decisión.** El cuerpo de la IIFE de `app.js` pasa a `export function startApp()`, con una guarda de segunda llamada y `TallerLab.init()` como primera instrucción; `main.tsx` usa un import con nombre y llama a `startApp()` después del último import.

**Evidencia** (copia de F1, con la conversión mínima y el laboratorio todavía abierto al evaluarse): el build da el mismo hash en `dump-globals` y en `dump-dist-globals`, el mismo `<style>` y el mismo marcado; el HTML crece 100 caracteres; `boot-check` da 10 de 10 y los 106 E2E pasan.

**Por qué `dump-dist-globals` no cambia.** Vuelca sólo los globals de datos (`GUIDE_DATA`, `RUST_*`, `GO_*` y `SYSTEMS_*`) de `window` después de evaluar el script del dist en un contexto mínimo. Los publican `register-catalogs` y los cuatro `register-systems-*`, que corren antes de `lab.js` y de `app.js`. Hoy la evaluación se detiene dentro de `app.js`, en `syncLinkedLanguage()` (`new URLSearchParams(location.search)`, que el contexto no define), después de publicarlos todos y de correr los `init` de campaña y Sistemas (se vio en el texto del script en el punto del error). Con `startApp()` llamado al final del bundle se detiene en la misma instrucción, dentro de la función. Por eso la línea de stderr es informativa: el criterio es el stdout.

**Alternativas.** Un módulo `app/boot/start-app.ts` que orqueste: suma una capa que A2 ya construye (`runBoot`) y que F10 reemplaza (la spec lo descarta). Que `main.tsx` llame a una función por vista: toca más archivos. `startApp` en `main.tsx`: `main.tsx` no puede importar las variables de cierre de `app.js` sin moverlas.

## R7. Los arneses de la unidad 3

**Decisión.** `runModule` (esbuild `format: 'iife'` con `globalName`, envuelto en una IIFE para que el nombre no quede en el contexto) devuelve las exportaciones de una fuente evaluada en un contexto de `vm`; `bundleApp(entry, { withoutStartCall: true })` saca la llamada de `main.tsx` con una entrada `stdin` de esbuild que conserva la carpeta; `loadLab` evalúa `lab.js` y llama `TallerLab.init()`.

**Evidencia.** `runModule` + `loadAppShell(context).startApp()` dan 51 de 51 en `app-shell-check`; con `app.js` convertido, el bundle de `main.tsx` sin su llamada se evalúa sin errores con un almacenamiento que lanza, y mide un acceso (el de `lab.js`, que la unidad 3 quita). `tsc -p tsconfig.qa.json` pasa con la sintaxis borrable de `qa/`.

**Motivo.** `bundleSource` produce IIFE sin nombre global: un `export` no se alcanza (riesgo 3 de la spec). Los dos mecanismos son independientes de lo que agrega A2 (`withContent` usa también una entrada `stdin`, pero otra opción).

**Alternativas.** `importModule` (ESM por `data:`): corre en el contexto principal de Node y no en el contexto de `vm` con el DOM falso que necesitan los checks. `vm.SourceTextModule`: pide `--experimental-vm-modules`, que A2 sólo adopta para su check del bundle. Empaquetar las fuentes juntas: cambia cómo se evalúa cada una y rompe FR-018 al revés (un solo contexto con todo).

## R8. La correspondencia de los checks (FR-013)

Para F2a ningún escenario se retira ni cambia su valor esperado: los siete checks que adapta sólo cambian cómo cargan el código. Los escenarios nuevos son adicionales.

| Check | Hoy | Unidad | Qué cambia |
| --- | --- | --- | --- |
| `runtime-check` (fuera de `npm test`) | `buildProgram` y los ejercicios salen de `lab.js` | 2 | importa `buildProgram` y arma la lista con la fábrica pura; `--audit-record` da lo mismo que antes (`0/137`, código 1, sin registros previos) |
| `systems-check` | 46; el escenario del catálogo real evalúa `lab.js` | 2 | ese escenario toma los ejercicios de la fábrica pura; los 46, con sus valores |
| `project-kit-check` | 11; el catálogo real evalúa `lab.js` | 2 | usa la fábrica pura y un `TallerLab` mínimo; los 11, con sus valores |
| `versioned-storage-check` | 33 | 1 | suma uno (la regla de dos pestañas); no es uno de los siete que se adaptan |
| `load-order-check` | 24 imports y 16 restricciones | 3 | lee imports con y sin nombre y la llamada; las 16 y las dos reglas de los extremos intactas; suma que `startApp()` va después del último import |
| `boot-check` | 10 | 3 | los 10 con el bundle con su llamada y sus valores; suma 4 escenarios y el de los adaptadores exige `TallerLab.init` |
| `app-shell-check` | 51 | 3 | los 51 con `buildHarness` llamando `startApp()`; suma 2 escenarios |
| `lab-state-check` | 37 | 3 | sólo `loadLab` (evalúa e inicializa); los 37, con sus valores |

`campaign-check` (34), `campaign-content-check` y los `systems-<dominio>-check` también ejercen los motores y pasan sin cambios, incluido el `init` repetido de un motor (FR-022). `lab-bridge-check` (21) pasa sin cambios con `systems.js` usando `mergeModelGroups`.

## R9. El registro de modelos se alimenta de los globals, y el costo en los checks

**Decisión.** `systems.js:init` llama `mergeModelGroups(packages().map((source) => source.models))`: los mismos `models` de `window.SYSTEMS_PC`, `SYSTEMS_LOWLEVEL`, `SYSTEMS_INFRA` y `SYSTEMS_PLAY`, en ese orden, que alimentan hoy su bucle.

**Motivo.** Si el registro se armara con los modelos que el slice exporta, la fuente de datos cambiaría para cualquier check que modifique esos globals (`lab-bridge-check` cambia títulos de talleres en `SYSTEMS_LOWLEVEL.workshops`; no los modelos, pero el contrato es que `systems.js` use lo que publican los adaptadores). La spec del registro, en cambio, sí usa los modelos del slice y la fixture `qa/fixtures/curriculum-ids.json`: verifica que lo que el slice exporta cubre exactamente los 25 talleres.

**Evidencia.** El orden de claves de la unión es `pc`, las ocho de `lowlevel`, las ocho de `infra` y las ocho de `play`; `mergeModelGroups` con esos cuatro grupos da las 25 que referencian los talleres. En una copia, `systems.js` con la función: `lab-bridge-check` 21 de 21 en 0,61 s (base: 0,63 s), `systems-check` 46 de 46, el HTML +46 caracteres. `mergeModelGroups` toma `readonly object[]` y no `Record<string, unknown>[]` porque `LowlevelModels` es una `interface` y no es asignable a un tipo con firma de índice (el verificador de tipos lo mostró).

**Alternativa.** Una constante del slice con los cuatro grupos ya unidos: `systems.js` no leería más `window.SYSTEMS_*[].models` y el motor recibiría otros objetos si un check los reemplaza.

## R10. El guard y el tope de tamaño

**El guard.**

**Decisión.** Un check de `qa/` (`seams-guard-check.ts`, con la lógica pura en `qa/lib/seams-guard.ts`) con cinco reglas: R1, un literal de clave en un solo archivo; R2, `openVersionedStore` sólo en los cuatro archivos de los singletons; R3, ninguna fábrica importada; R4, un singleton sólo en su dueño legacy; R5, `entities`, `features` y `shared` sin importar el JSON del currículo.

**Motivo.** Una regla de lint por ruta cuida los imports, no las claves (una página podría leer `localStorage.getItem('taller-learning-v1')`), y su configuración la integra el agente principal en un archivo compartido; el check mira las dos cosas, se prueba con fuentes virtuales (TDD) y se registra en una línea de `run-checks.ts`. Corre dentro de `npm test`, así que también corre en la imagen web y en la CI. R4 hace cumplir FR-018 y R5 cuida F2-I2 y F2-I6 de A2.

**Qué no ve.** Un literal armado por concatenación y un `import()` dinámico. Es un guard de revisión asistida, no un candado de ejecución: el candado es la opción B de Q2.

**Alternativas.** `no-restricted-imports` por ruta en `eslint.config.ts`: cubre los imports y se ve en el editor, pero no las claves y toca una configuración compartida. Que `openVersionedStore` rechace la segunda apertura de una clave (Q2, B): es un candado de ejecución, pero toca la biblioteca del ADR 0003 y obliga a los checks a simular «otra pestaña» sin una segunda instancia. Ningún guard (Q2, C): el riesgo alto del mapa queda abierto.

**El tope de tamaño.**

**Decisión.** El HTML puede crecer hasta 12 000 caracteres en toda F2a (hasta `2 198 460`), y cada PR informa su medida.

**Evidencia.** Medido en copias: `startApp` suma 100 caracteres y `mergeModelGroups`, 46. Minificados sin empaquetar, los módulos nuevos pesan 354 (`zustand/vanilla`, que reemplaza a la señal propia de 233 que Q3 descartó), 665 (el catálogo con su contenedor), 189 (el registro) y 1 264 (el almacén del recorrido, medido con la señal propia); `buildProgram` (945) y `parseRouteProgress` (1 544) se mueven y no suman. El almacén del laboratorio y los avisos de los motores se estiman en unos 2 600 más. Total estimado: unos 5 700 (1,8 % del margen de 313 540).

**Motivo.** La spec deja el número al plan y limita las dependencias a Zustand (FR-010). Un tope de más del doble de lo estimado deja lugar a lo que no se pudo medir sin dejar pasar un crecimiento que nadie vea. A2 baja el tope de `build-check` a un valor medido.

## R11. `app.js` lee el recorrido por una función

**Decisión.** `const routeState = () => routeStore.getProgress();` y cada `state.` de `app.js` pasa a `routeState().`; las tres reasignaciones de `state` (`save`, «Borrar todo» e importar) pasan a métodos del almacén y su declaración inicial desaparece.

**Motivo.** El almacén del recorrido reemplaza su estado al fusionar con otra pestaña (`mergeRouteProgress` devuelve un objeto nuevo). Una copia local en `app.js` quedaría huérfana cuando otro consumidor (una página React, desde F3) guarda y fusiona, y sus ediciones no llegarían al almacén: es la pérdida que FR-026 prohíbe. El reemplazo es mecánico, de 80 apariciones en 59 líneas (muchas dentro de plantillas de texto), y lo protegen los 51 escenarios de `app-shell-check`, `boot-check` y los E2E.

**Alternativas.** Un alias `let state` que se vuelve a leer después de cada `save()`: sirve mientras `app.js` sea el único que guarda, y deja de servir con la primera página portada. Un estado de identidad estable que se asigne en el lugar al fusionar: cambia la semántica del recorrido, que FR-024 manda conservar.

## R12. Lo que no se hace (YAGNI)

- **Un store genérico** (`createProgressStore`) más allá de la revisión de Zustand: la spec lo descarta; el almacén del recorrido y el del laboratorio repiten unas 20 líneas.
- **El progreso dentro del store de Zustand, un oyente del evento `storage`, una instantánea clonada, los selectores sobre el progreso, un aislamiento propio de los oyentes que lanzan, un envoltorio compartido de la revisión y el debounce de la escritura por tecla.**
- **Mover los textos de los hitos, `renderProject` o el idioma que manda la URL:** son de F4 y del router de F10.
- **Arreglar el defecto del `<body>` con `aria-pressed`** o el bloqueo de campaña que va primero: F1 los fija como `KNOWN DEFECT`.
- **Un módulo de arranque en `app/boot/`:** `startApp` vive en `app.js` hasta que F10 lo retire.
- **Barrels, carpetas vacías y capas por anticipado.**

## R13. La dependencia: Zustand 5.0.15

**Decisión.** `zustand` 5.0.15, en `dependencies` y en versión exacta como el resto, instalada por K en T008 (la tarea del coordinador, que integra `package.json` y el lockfile), y sólo `zustand/vanilla` en F2a. El usuario autorizó la descarga el 2026-10-06.

**Lo medido** el 2026-10-06, sin instalar, con el registro de npm (`npm view`) y los archivos publicados:

| Qué | Valor |
| --- | --- |
| Versión | 5.0.15, la última (`latest`), publicada el 2026-08-13 y sin marca de obsoleta |
| Peso del paquete | 95 173 bytes desempaquetados (`dist.unpackedSize`), en 52 archivos: todas las formas (cjs, esm, umd, systemjs, tipos y middleware). No es lo que suma al dist |
| Lo que entra al script del dist | sólo `zustand/vanilla`: `esm/vanilla.mjs` tiene 1 001 caracteres y 354 minificados con el esbuild del repositorio. Empaquetado y minificado, 425 con un store y su `setState`, 476 con cuatro creaciones y 499 con una fábrica de ejemplo y su `save` |
| Licencia | MIT, «Copyright (c) 2019 Paul Henschel» (`LICENSE`, 1 070 bytes). El código publicado no lleva un comentario de licencia: el aviso va en `frontend/THIRD-PARTY-NOTICES.txt` |
| Dependencias de ejecución | ninguna |
| Peers | `react` ≥ 18, `@types/react` ≥ 18, `immer` ≥ 9.0.6 y `use-sync-external-store` ≥ 1.2.0, los cuatro opcionales (`peerDependenciesMeta`); el repositorio ya trae React 19.2.8 y `@types/react` 19.3.0 |
| Node | `engines`: ≥ 12.20.0 |
| Integridad | `sha512-MpSEjRiBkA9crSYeOUH32rJC7SVqAbm0Fqcqge/bUi2PPoLcBWKOsG+C8mevmpr8TwXHBVkChbbJiyvkE+i/3A==`; `shasum` `42bddf35647cb80a818a8943a69f6618c126fcfe` |
| Resolución | `zustand/vanilla` pasa por `exports["./*"]`, condición `import`: `./esm/vanilla.mjs` y `./esm/vanilla.d.mts`; `sideEffects: false` |
| Forma del dist (FR-009) | `esm/vanilla.mjs` no usa `import.meta`, `import()` ni `process.env` |

**Qué cambia en el repositorio.** `package.json` (una línea, con `--save-exact`: no hay un `.npmrc` que lo haga), `package-lock.json` (un paquete) y `frontend/THIRD-PARTY-NOTICES.txt` (el aviso, que `frontend/Dockerfile` copia al servido, como los de React, fflate y canvas-confetti). `AGENTS.md` no cambia: ya pide instalar Zustand con el primer caso real, que es esta unidad 1, y sincronizar el lockfile.

**Alternativas.** Una versión con `^`: el repositorio fija todas las suyas. Importar `zustand`, el binding de React, en F2a: arrastraría `react` a las entidades y a los checks, y no hay un consumidor de React hasta F3. La versión 4: sin motivo, porque la 5 es la última y usa el `useSyncExternalStore` de React, que el repositorio ya trae.

## Línea base de la implementación

Tomada el 2026-10-06 por el coordinador (T001) sobre `f2a/base` (`d3b701e`): `feat/f1-red-de-seguridad` (F1, todavía en revisión en el PR #23) más esta spec y su plan, como prevé el plan si F1 no está en `master`. La limpieza al inglés ya está en `master` (PR #14, squash), así que no hay ramas pendientes que integrar antes.

| Medida | Valor | Coincide con la planificación |
| --- | --- | --- |
| `npm ci --offline`, `build`, `npm test` (30 checks y Vitest 3), `lint` (0 errores, 35 avisos de complejidad), `format:check` | en verde | sí |
| E2E de F1 (`E2E_PORT=4173`) | 106 de 106 | sí |
| `build/curriculum.json` y `documentHash` | `ef8f5715…` | sí |
| `dump-globals` | `cd1f9e62…` | sí |
| `dump-dist-globals` (stdout) | `daf2bc71…` | sí |
| `frontend/src/index.html` | `6c3b7e6a…` | sí |
| `dist/index.html` | 2 186 460 caracteres, 2 202 074 bytes; estilo `850ef821…`; marcado `562c5364…`; 0 `import(` y 0 `import.meta` | sí |
| Escenarios `PASS` por check | boot 10, app-shell 51, lab-state 37, lab-bridge 21, systems 46, project-kit 11, campaign 34, versioned-storage 33 | — |
