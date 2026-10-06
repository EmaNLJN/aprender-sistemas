# Research: F2a · Seams sin cambio visible, unidades 1 a 4

Las decisiones de diseño del [plan](./plan.md), con su motivo, sus alternativas y lo que se midió. Las respuestas provisionales de Q2, Q3 y la partición están en «Supuestos provisionales» del plan; acá están sus pruebas.

## Cómo se verificó

Se planificó sin tocar el código de producción del repositorio y sin descargar nada.

1. **Este worktree** (`spec/f2-seams`, `master` en `0df5b07` más los documentos de `spec/front-react`; `frontend/`, `qa/`, `tools/` y `content/` son los de `master`). `npm ci --offline --no-audit --no-fund` (193 paquetes, 5 s), `npm run build`, `npm test`, `npm run lint` y `npm run format:check`; los hashes, los tamaños y los conteos de «Línea base»; las lecturas de almacenamiento del arranque (un `getItem` registrado por clave, con la fixture de master); la evaluación de cada fuente legacy sola con un almacenamiento que cuenta los accesos; y el punto donde se detiene `dump-dist-globals`.
2. **Una copia de `feat/f1-red-de-seguridad` (`8932fa6`)** con `git archive`, en el directorio temporal y fuera del repositorio, con el `node_modules` del worktree de F1 enlazado (trae Vitest y Playwright) y el Chrome Headless Shell de la caché de Playwright. Ahí corrieron los experimentos que pedían la red de F1 y Vitest:
   - **Base:** `npm run build` y los 106 E2E en verde (11,7 s).
   - **R2, Sistemas lanza sin `init`:** un parche de cinco líneas en `create-systems-engine.ts`; `npm test` da los 30 checks en verde y falla sólo la prueba `KNOWN DEFECT` de Sistemas de Vitest (1 de 3); el build y los 106 E2E, en verde.
   - **R6, `startApp`:** `app.js` convertido en `export function startApp()` con la guarda, y `main.tsx` con el import con nombre y la llamada. El build da `dump-globals`, `dump-dist-globals`, `<style>` y marcado con los mismos hashes; `boot-check` 10 de 10; los 106 E2E en verde. `load-order-check` falla (no ve el import con nombre) y `app-shell-check` da 4 de 51 (`app.js` ya no arranca solo), como predice la unidad 3.
   - **R7, los arneses:** `runModule` con esbuild `globalName` envuelto en una IIFE devuelve `startApp` y vuelve `app-shell-check` a 51 de 51; `tsc -p tsconfig.qa.json` en verde. Con `app.js` convertido y `main.tsx` con su llamada, el bundle sin la llamada, armado con una entrada `stdin` de esbuild, se evalúa sin errores y deja `#main` vacío; sobre la base, el bundle de `main.tsx` evaluado con un almacenamiento que lanza hace 4 accesos (laboratorio, recorrido, campaña y Sistemas) y dibuja.
   - **R4, R3 y R9, los módulos:** `change-signal`, `exercise-catalog` (con su contenedor), `build-program`, `model-registry` y `route-store` con sus specs, y la interfaz de `lab-store`. 17 pruebas de Vitest en 6 archivos (3 de F1 más 14 nuevas) en verde; `npm run typecheck` y `eslint` sin avisos nuevos. `systems.js` con `mergeModelGroups`: `lab-bridge-check` 21 de 21 en 0,61 s, `systems-check` 46 de 46 y el HTML con 46 caracteres más.
3. **Lo que no corrió:** el almacén del laboratorio (sólo su interfaz compila), la suscripción de los motores, el guard, los arneses completos de la unidad 3, el job de la CI, la imagen web de Docker, macOS, Firefox y WebKit.

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

**Decisión.** En `specs/009-f2-seams/`, con el título «F2a». La spec sigue entera (F2) y la partición no se aplica: eso es del usuario. Si la acepta, F2a queda en esta carpeta y F2b recibe una carpeta nueva con FR-043 a FR-060 y las 18 reglas de toda unidad, como C3a (`004`) y C3b (`010`).

**Motivo.** La spec dice que cortarla es mover rangos, no reescribirlos, y el coordinador pidió planificar F2a ya. `.specify/feature.json` apunta a esa carpeta.

**Alternativa.** Crear la carpeta de F2b ahora: aplicaría una partición que el usuario no aceptó.

## R2. Sistemas lanza sin `init` en la unidad 1

**Decisión.** El cambio del motor de Sistemas y la inversión de la prueba de riesgo 2 de F1 van en la unidad 1 (T010); la unidad 3 sólo prueba que `startApp()` inicializa los dos motores antes de la primera vista (T016).

**Evidencia.**

- Con el parche de cinco líneas en `create-systems-engine.ts` (`requireStore()` en `requireWorkshop`, `refreshFromLab`, `planImport`, `list` y `exportState`), los 30 checks pasan y los 106 E2E también; sólo falla la prueba de Vitest que fija el defecto, porque `list` ahora lanza. Ningún check y ningún E2E usa el motor antes de `init`.
- `lab.js` llama a `TallerSystems?.refresh()`, que usa `engine.refreshFromLab`, sólo con la vista montada, y `app.js` inicializa antes de dibujar.

**Motivo.** La spec exige en FR-022 (unidad 1) que un motor sin abrir falle «igual en los cuatro» y en FR-040 (unidad 3) que se invierta esa prueba. Con Q2, opción A, el cambio es de `entities/systems-workshop`; dejarlo en la 3 haría que cambiar Q2 tocara dos unidades, y la 1 integrada sin invertir la prueba rompería `npm test`. El coordinador pidió las dos cosas a la vez (cada prueba en su unidad y Q2 sólo en la unidad 1): el plan las reconcilia así y lo declara.

**Alternativas.** Dejarlo en la 3, como dice la spec: Q2, B o C cambiaría dos unidades. Que la unidad 1 deje la prueba de Sistemas como está y la 3 la invierta: `npm test` queda en rojo en la 1 si Sistemas ya lanza, y en verde sólo si el cambio de comportamiento también espera a la 3.

## R3. La suscripción: una revisión entera

**Decisión.** Cada almacén y cada motor expone `subscribe(listener)` (devuelve la baja) y `getRevision()` (un entero que sube en cada aviso). La instantánea de `useSyncExternalStore` es la revisión; el estado se lee después con `getState()` o `exportState()`.

**Motivo.** `useSyncExternalStore` necesita una instantánea que cambie de identidad cuando algo cambió. El estado vivo no sirve: el laboratorio muta en el lugar en cada escritura (`absorbStored` devuelve el mismo objeto) y lo reemplaza sólo al importar y al borrar; el recorrido lo reemplaza al fusionar con otra pestaña. Un entero sirve para los dos y para los motores, cuyo `exportState()` clona en cada llamada (no sirve de instantánea: React se quedaría sin parar). Es lo que la spec pide al plan (riesgo 6).

**Qué avisa.** Después de cada operación que persiste o reemplaza el estado: `save()` aunque no pueda guardar (el estado en memoria cambió y `storageAvailable()` puede haber cambiado), `applyImport` siempre y `reset`. `refreshFromLab` no avisa: deriva sellos en memoria sin guardar, y el cambio llega con el `syncLab` que los persiste. No se escucha el evento `storage`: la fusión con otra pestaña ocurre dentro de `write`, cuando la clave cambió desde la última lectura (ADR 0003, decisión 9); escuchar el evento sería un comportamiento nuevo (FR-024).

**Alternativas.**

- Una instantánea clonada y cacheada por revisión (`getSnapshot`): copia el estado del laboratorio (cientos de KB) en cada cambio observado. Se puede sumar encima de la revisión cuando un consumidor la pida.
- Comparar la identidad: no funciona para el laboratorio.
- Suscripción por campo o con selectores: es lo que da Zustand, y es la opción B de Q3.
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

**Evidencia.** Medido en copias: `startApp` suma 100 caracteres y `mergeModelGroups`, 46. Minificados sin empaquetar, los módulos nuevos pesan 233 (la señal), 665 (el catálogo con su contenedor), 189 (el registro) y 1 264 (el almacén del recorrido); `buildProgram` (945) y `parseRouteProgress` (1 544) se mueven y no suman. El almacén del laboratorio y la suscripción de los motores se estiman en unos 2 600 más. Total estimado: unos 5 500 (1,8 % del margen de 313 540).

**Motivo.** La spec deja el número al plan y dice que F2 no suma dependencias. Un tope de más del doble de lo estimado deja lugar a lo que no se pudo medir sin dejar pasar un crecimiento que nadie vea. A2 baja el tope de `build-check` a un valor medido.

## R11. `app.js` lee el recorrido por una función

**Decisión.** `const routeState = () => routeStore.getState();` y cada `state.` de `app.js` pasa a `routeState().`; las tres reasignaciones de `state` (`save`, «Borrar todo» e importar) pasan a métodos del almacén y su declaración inicial desaparece.

**Motivo.** El almacén del recorrido reemplaza su estado al fusionar con otra pestaña (`mergeRouteProgress` devuelve un objeto nuevo). Una copia local en `app.js` quedaría huérfana cuando otro consumidor (una página React, desde F3) guarda y fusiona, y sus ediciones no llegarían al almacén: es la pérdida que FR-026 prohíbe. El reemplazo es mecánico, de 80 apariciones en 59 líneas (muchas dentro de plantillas de texto), y lo protegen los 51 escenarios de `app-shell-check`, `boot-check` y los E2E.

**Alternativas.** Un alias `let state` que se vuelve a leer después de cada `save()`: sirve mientras `app.js` sea el único que guarda, y deja de servir con la primera página portada. Un estado de identidad estable que se asigne en el lugar al fusionar: cambia la semántica del recorrido, que FR-024 manda conservar.

## R12. Lo que no se hace (YAGNI)

- **Un store genérico** (`createProgressStore`) más allá de la suscripción: la spec lo descarta; el almacén del recorrido y el del laboratorio repiten unas 20 líneas.
- **Zustand, un oyente del evento `storage`, una instantánea clonada, la suscripción por campo y el debounce de la escritura por tecla.**
- **Mover los textos de los hitos, `renderProject` o el idioma que manda la URL:** son de F4 y del router de F10.
- **Arreglar el defecto del `<body>` con `aria-pressed`** o el bloqueo de campaña que va primero: F1 los fija como `KNOWN DEFECT`.
- **Un módulo de arranque en `app/boot/`:** `startApp` vive en `app.js` hasta que F10 lo retire.
- **Barrels, carpetas vacías y capas por anticipado.**
