# Research: F2b · Seams sin cambio visible, unidades 5 a 8

Las decisiones de diseño del [plan de F2b](./plan-f2b.md), con su motivo, sus alternativas y lo que se midió. Las decisiones del usuario (clarify del 2026-10-06) están en «Decisiones del usuario» del plan; acá están sus pruebas. Lo de F2a está en [research.md](./research.md) y no se repite.

## Cómo se verificó

Se planificó sin tocar el código de producción del repositorio y sin descargar nada. Todo corrió en copias descartables del commit `c5d497d` (`f2a/u3-arranque`: F1 y las cuatro unidades de F2a), armadas con `git archive` en el directorio temporal. Cada copia enlazó el `node_modules` del worktree de la unidad 3 de F2a: trae Zustand, Vitest, Playwright y, como dependencias de Vite, `postcss` 8.5.28 y `lightningcss` 1.33.0. El navegador fue el Chrome Headless Shell de la caché de Playwright.

1. **La base, sin cambios:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, la red de F1 completa, los hashes de los oráculos y el conteo de escenarios de cada check («Línea base de planificación»).
2. **Prototipos de las cuatro unidades,** con el diseño de este plan:
   - **Unidad 8:** las 26 reglas movidas, el build, la red de F1, el multiconjunto de declaraciones del CSS del dist y un barrido de estilo computado, con su control negativo (R7).
   - **Unidad 5:** la gramática de URL, los datos de los puentes y su cableado en `app.js`, `lab.js`, `campaign.js`, `systems.js` y `ConceptDetail.tsx`. Se compararon contra el código de hoy: 2 569 URL y 55 880 respuestas de los adaptadores (R3 y R4).
   - **Unidad 7:** el mapa explícito, los dos modelos y el cableado de los dos exploradores, con 2 214 comparaciones de HTML (R6).
   - **Unidad 6:** la feature con promesas y su cableado en `app.js`, con `app-shell-check` y `boot-check` y cuatro gemelos asíncronos (R5).
   - **Las entradas sin estado:** empaquetadas con las opciones de `bundleSource` y probadas con `vi.doMock`, también con una mutación (R2).
   - **Las unidades 5, 6 y 7 juntas:** `npm test` (31 checks y 190 pruebas de Vitest, con las cuatro de aislamiento), 35 avisos de complejidad, la red de F1 (106 de 106) y los tres oráculos del currículo con los mismos bytes.
3. **Lo que no corrió:**
   - la comparación única de la unidad 6, de la que sólo corrieron `app-shell-check` y `boot-check` con los valores de hoy;
   - la regla R6 del guard, de la que existe sólo el diseño;
   - las specs nuevas, salvo la del aislamiento de las entradas;
   - la imagen web de Docker, la CI, macOS, Firefox y WebKit.

## Línea base de planificación

Medida el 2026-10-06 sobre una copia de `c5d497d` (Node 24.21.0, npm 11.19.0). T020 la vuelve a tomar sobre la base de implementación, que es `master` con las cuatro unidades de F2a integradas, y agrega a este archivo la sección «Línea base de la implementación».

| Qué | Valor |
| --- | --- |
| Estado de F2a | F1 en `master` (#23); la unidad 2, en `master` (#26); las unidades 4, 1 y 3, en PR abiertos (#27, #32 y #33). `c5d497d` es la punta de la unidad 3, con las cuatro |
| `build/curriculum.json` | sha256 `ef8f57154734653554d40a43934c97f34ed550aad54867e31b197365355803d4`, igual al `documentHash` del meta |
| `dump-globals` (stdout) | `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745` |
| `dump-dist-globals` (stdout) | `daf2bc7108033cf02a855562e391d7360f618abb7327a7c0cac2d27865a464bc`; el stderr dice «La evaluación se detuvo en: URLSearchParams is not defined» |
| `frontend/src/index.html` | `6c3b7e6a81500f0067fa6932b841027773f8603ed7ea2bd363edf03e57a82179` |
| `dist/index.html` | 2 190 106 caracteres y 2 205 733 bytes (F2a sumó 3 646 a los 2 186 460 de su base); 0 `import(` y 0 `import.meta` |
| Script del dist | 2 083 491 caracteres; sha256 `d4051c59e0f487a69ab33dd627dd118abc7c2ce6eced591c405f15fe727df150` |
| `<style>` del dist | 102 229 caracteres; sha256 `850ef8219cf8a73e79b5edaf888d591051ec933b78ab2e09a175d1aa66623be1` |
| Marcado del dist | 4 331 caracteres; sha256 `562c5364481ca6138bc41a18c3c5318083bdca479e087ac32461755081ac81d0` |
| CSS del dist, parseado con `postcss` | 1 399 reglas; 4 319 declaraciones al separar cada lista de selectores (4 315 distintas: el multiconjunto tiene 4 duplicadas) |
| `npm test` | 31 checks y Vitest con 12 archivos y 186 pruebas, en 16,5 s |
| `npm run lint` | 0 errores y 35 avisos de complejidad. En las vistas legacy son 27: `app.js` 5 (con `syncLinkedLanguage` en 11), `lab.js` 12, `campaign.js` 2, `systems.js` 2, `lab-explorers.js` 2 (`body` 34 y `act` 18) y `quest-explorers.js` 4 (`act` 38, `packetBody` 22, `robotBody` 16 y `packetData` 14). Hay 2 en módulos de F2a y 6 en `qa/` |
| Escenarios `PASS` | `app-shell` 53, `boot` 14, `lab-bridge` 21, `lab-state` 37, `systems` 46, `project-kit` 11, `campaign` 34, `versioned-storage` 34, `seams-guard` 18; `quest-explorers` 47 aserciones; `load-order` 24 imports y 16 restricciones |
| Red de F1 | 106 de 106 en 8 specs (20,9 s la primera corrida y unos 11 s las siguientes); `css-contract` son 15 pruebas |
| Clasificación de exploradores, con las dos expresiones regulares | 21 de canal, 20 genéricos, 20 de puntero, 6 de robot, 6 de paquete y 201 sin explorador; ninguno con los dos |

La spec de F2 cuenta 51 escenarios en `app-shell-check`: F2a le sumó 2. Los 53 son los de la tabla de R8.

## R1. Dónde viven el plan y las tareas de F2b

**Decisión.** En la misma carpeta de la spec, con archivos propios: `plan-f2b.md`, `research-f2b.md`, `quickstart-f2b.md` y `tasks-f2b.md`. Los de F2a (`plan.md`, `research.md`, `quickstart.md` y `tasks.md`) no se tocan. Las tareas siguen la numeración de F2a, de T020 a T038, para que un commit que nombra una tarea no sea ambiguo dentro de la carpeta.

**Motivo.** Lo pidió el coordinador. La spec cubre F2 entero y la partición agrupa los requisitos sin cortar el archivo.

**Consecuencia.** Los scripts de Spec Kit (`setup-plan.sh`, `setup-tasks.sh` y `check-prerequisites.sh`) resuelven nombres fijos: `plan.md`, `tasks.md`, `research.md` y `quickstart.md`. Un `/speckit-implement` o un `/speckit-analyze` de F2b tiene que recibir los archivos `-f2b` por nombre, porque por omisión leería los de F2a. Este análisis se hizo a mano sobre los `-f2b` (al final de este archivo).

**Alternativa.** Una carpeta propia con una spec que remita a la 009, que es lo que preveía R1 de F2a. Se descartó por el pedido del coordinador, y porque copiar los rangos de la spec dejaría dos fuentes.

## R2. Las entradas públicas sin estado

**El problema.** La unidad 5 pone datos puros en `entities/campaign` y `entities/systems-workshop`, y la 7 pone modelos puros en `entities/exercise`. Los consumen fuentes legacy que no son dueñas de esos índices: `campaign.js`, `systems.js`, `lab-explorers.js` y `quest-explorers.js`. Los checks empaquetan cada fuente legacy por separado, y evaluar el índice de uno de esos slices crea su singleton (`campaignEngine`, `systemsEngine`, `labStore` o `exerciseCatalog`). Importar del índice crearía una segunda instancia en el contexto del check, que es lo que prohíben FR-018 y la regla R4 del guard. La spec da por hecho que «los módulos sin estado (…) los puede importar cualquiera»; con los singletons en los índices (decisión de F2a), eso deja de ser cierto si no hay otra puerta.

**Decisión.** Cada slice con singleton suma una segunda API pública, sin estado, que reexporta sólo funciones puras y tipos:

- `entities/campaign/bridge.ts`;
- `entities/systems-workshop/bridge.ts`;
- `entities/exercise/explorers.ts`.

El índice sigue siendo la única puerta del singleton y no reexporta lo de esas entradas: cada símbolo tiene un solo camino. Entre las fuentes legacy y `app/`, una regla nueva del guard (R6) admite sólo el índice (para su dueño, R4) o una de esas tres entradas, nunca `model/**` ni `@x/**`. Cada entrada tiene una spec que prueba que importarla no evalúa ningún módulo con singleton.

**Evidencia.**

| Prueba | Resultado |
| --- | --- |
| Un `campaign.js` de prueba que importa `entities/campaign/bridge`, empaquetado con las opciones de `bundleSource` (IIFE, navegador, es2020) | 629 caracteres y 3 módulos; 0 apariciones de `createCampaignEngine`, `createStore`, `openVersionedStore` y `campaignEngine` |
| El mismo stub importando el índice | 28 668 caracteres y 14 módulos: arrastra el motor, Zustand y el almacenamiento versionado |
| Un stub que importa `entities/exercise/explorers` | 342 caracteres y 3 módulos; 0 apariciones de `createLabStore`, `createExerciseCatalogHolder`, `createStore`, `labStore` y `exerciseCatalog` |
| Una spec de Vitest con `vi.doMock` sobre los cinco módulos con singleton (cada fábrica lanza si se evalúa): importar las tres entradas | 3 de 3 en verde |
| Control: importar el índice de `entities/campaign` con los mismos mocks | rechaza: Vitest envuelve el error de la fábrica («There was an error when mocking a module»), así que la aserción mira ese texto y no el del `throw` |
| Mutación: `bridge.ts` reexporta `campaignEngine` | la spec de la entrada de campaña falla |
| R4 sobre el árbol del prototipo | `seams-guard-check` 18 de 18: R4 sólo mira el índice (`SLICE_INDEX_SPECIFIER`), por eso un import profundo pasa sin aviso y hace falta R6 |

**Alternativas.**

- **Un import profundo** (`./src/entities/campaign/model/mission-bridge`): pasa R4, pero rompe la API pública del slice (FR-014 y `docs/architecture.md`) y deja que mañana alguien importe `model/create-campaign-engine` desde una vista legacy sin que nada lo vea.
- **Sacar el singleton del índice** a otra entrada: reabre la unidad 1 de F2a, que A2 y D1 ya toman con `campaignEngine` en el índice.
- **`@x`:** Feature-Sliced Design reserva esa notación para cruces entre entidades («only use this notation on the Entities layer», según la documentación oficial que devolvió Context7). Una vista legacy no es una entidad.
- **Que el índice también reexporte las entradas,** para que las páginas usen siempre el índice: el mismo símbolo tendría dos caminos y el índice crecería unos 30 nombres sin consumidor. Las páginas de F5 a F7 importan la entrada sin estado igual que el índice: las dos son API pública.
- **Empaquetar las fuentes legacy juntas en los checks** (la salida que deja FR-018): cambia cómo se evalúa cada check y la descartó F2a (R7).
- **Métodos nuevos en los motores** (por ejemplo `campaignEngine.missionContext`): cambia las interfaces que F2a acaba de fijar y no cubre los exploradores.

## R3. La gramática de URL: dos familias que no se mezclan

**Decisión.** `frontend/src/shared/config/url-grammar.ts` tiene las ocho vistas, los ocho parámetros, un lector y dos familias de escritura, que el plan especifica por separado:

- **Enlaces nuevos** (`exerciseHref`, `campaignMissionHref`, `workshopExerciseHref`, `worldHref` y `workshopReturnHref`). Se arman con una plantilla, `encodeURIComponent` y un orden fijo de parámetros: son los de `campaign.js:worldURL`, `missionURL` y `returnURL`, `systems.js:codeURL` y `returnURL`, y el `labLink` del Atlas.
- **Reescrituras de la URL actual** (`withLabQuery`, `withWorldQuery`, `withWorkshopQuery` y `withLanguageQuery`). Parten de un `URL`, cambian `searchParams` y conservan lo que no tocan: son `lab.js:syncLocation`, el clic de un mundo en `campaign.js`, `systems.js:locationForSelection` y el cambio de idioma de `app.js`. `URLSearchParams` codifica como formulario.

Las dos familias codifican distinto. Unificarlas cambiaría caracteres, y FR-044 lo prohíbe. Los enlaces que sólo llevan hash (`#campana`, `#proyecto`, `#biblioteca` y el resto de las anclas `href="#vista"` de las plantillas) siguen como marcado: no llevan query, no se arman en código y la red de F1 los fija (`views`). La única excepción es `?#laboratorio` (`FREE_LAB_HREF`), porque es una de las seis formas con query.

**Evidencia.** Un script descartable comparó el prototipo con los fragmentos de hoy, copiados textualmente de `c5d497d`. Probó 15 ids (normales, `'mundo raro/1'`, `'a b'`, `"!'()*~"`, `'ñandú'`, `'%41'`, `'&x=1'`, `'#frag'`, `'+'` y vacío), 9 URL actuales con parámetros ajenos, 12 queries (de fase, de parte y con `?sistema=` y `?campana=` presentes y vacíos) y 13 hashes, y también los ocho lectores contra `URLSearchParams`. Resultado: **2 569 comparaciones y 0 diferencias.** Ejemplos que fijan las specs, resueltos con las reglas de cada codificación:

| Llamada | Resultado |
| --- | --- |
| `worldHref('mundo raro/1')` | `?mundo=mundo%20raro%2F1#campana` |
| `withWorldQuery(new URL('http://t/#campana'), 'mundo raro/1').href` | `http://t/?mundo=mundo+raro%2F1#campana` |
| `workshopReturnHref({ workshopId: "!'()*~", part: 'build', language: 'go' })` | `?taller=!'()*~&parte=build&lenguaje=go#sistemas` (`encodeURIComponent` deja `!'()*~`) |
| `withWorkshopQuery(new URL('http://t/?basura=1#sistemas'), 'go', "!'()*~", 'ship').href` | `http://t/?lenguaje=go&taller=%21%27%28%29*%7E&parte=ship#sistemas` (el formulario deja sólo `*`) |
| `withLabQuery(new URL('http://t/?#laboratorio'), 'map', 'x', 'learn').href` | `http://t/#laboratorio`: la query vacía se va |
| `withLabQuery(new URL('http://t/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio'), 'exercise', 'rust-06', 'code').href` | `http://t/?campana=rust-world-1&ejercicio=rust-06&paso=code#laboratorio`: `set` reemplaza en el lugar |
| `withLanguageQuery(new URL('http://t/?taller=cache&parte=build&lenguaje=rust#sistemas'), 'sistemas', 'go').href` | `http://t/?taller=cache&parte=build&lenguaje=go#sistemas` |

**Lectores.** `readLinkQuery(search)` devuelve los ocho parámetros tal como los da `URLSearchParams.get` (`string | null`), para que `.has('sistema')` se lea como `missionWorkshop !== null` sin cambiar nada (un `?sistema=` vacío sigue contando como presente y como falso). La validación de cada lector de hoy pasa a tres ayudantes con el mismo resultado: `exercisePhaseOr` (`learn` por omisión), `workshopPartOr` (`explore`) e `isLinkLanguage`. `viewFromHash` reemplaza las dos copias de `views.includes(location.hash.slice(1)) ? … : 'recorrido'` de `app.js`.

**Alternativas.** Una sola familia con `URLSearchParams`: cambia `%20` por `+` y deja de codificar `!'()~` en los enlaces nuevos. Un lector por vista: suma funciones sin bajar el acoplamiento. nuqs: es de F10 y de su spike.

## R4. Los datos de los puentes

**Decisión.**

- **Campaña,** en `entities/campaign/model/mission-bridge.ts`:
  - `campaignMissionContext(worlds, linkedWorldId, exerciseId)` devuelve el mundo, su título, los puntos y los dos sellos, o `null` si el ejercicio no es una misión de ese mundo;
  - `campaignLinkAccess(worlds, linkedWorldId, exerciseId, permission)` devuelve si el enlace deja entrar, los motivos y el mundo al que se vuelve (`null` si el mundo del enlace no existe, y entonces el regreso es `#campana`).

  Las dos reciben lo que hoy lee el adaptador (`engine.getWorlds(lang)` y `engine.canAttempt(id, lang)`), no leen `location` ni el motor, y no importan otra entidad.
- **Sistemas,** en `entities/systems-workshop/model/workshop-bridge.ts`:
  - `workshopMissionIds(workshop, language)`, que es la lista de hoy (las herramientas previas y el núcleo, sin repetir);
  - `workshopExerciseRole(workshop, exerciseId, language)`, que es `core`, `tool` o `null`;
  - `workshopReturnTarget(workshopId, language)`, el regreso al taller: su parte `build`, con `go` o, para cualquier otro valor, `rust`.
- **El regreso es un dato de la entidad que la gramática serializa** (FR-045). El de campaña es el `worldId` del contexto o del permiso, y `worldHref` lo escribe. El de Sistemas es `workshopReturnTarget`, y `workshopReturnHref` lo escribe. Así la gramática no decide a qué parte se vuelve ni normaliza el lenguaje: sólo arma la forma `?taller&parte&lenguaje`. La primera versión de este plan dejaba esas dos decisiones en la gramática, y el análisis de consistencia lo marcó.
- **Lo que no es dato del puente se queda en el adaptador:** el rótulo del tipo de misión (`missionType`, un selector que es de F6), los textos de los rótulos y el HTML.

**Se conserva el orden de los efectos.** En el contexto de campaña, el `refresh()` va antes de `getWorlds`, y sólo si hay mundo en el enlace. El bloqueo no llama `refresh()`, como hoy. En el contexto de Sistemas se comprueba la pertenencia antes del `refresh()` y del `engine.get()`. Por eso el rol es una función aparte, que el adaptador llama antes de esos dos. La composición del laboratorio (Sistemas antes que campaña, la lista navegable, `finishNavigation` y el bloqueo de campaña primero, que F1 marca como `KNOWN DEFECT`) no cambia: `lab.js` sólo pasa a leer la URL con la gramática.

**Evidencia.** Un script descartable cargó, en dos raíces (la base y el prototipo), `campaign.js` y `systems.js` con sus motores reales y un `TallerLab` falso, como `lab-bridge-check`. Recorrió dos estados del laboratorio (vacío y el de `progress-master-2a278ad-storage.json`), los 8 mundos, un mundo inexistente, `?campana=` vacío y la query sin parámetros, los 25 talleres, uno inexistente, `?sistema=` vacío y la query sin parámetros, los 274 ejercicios más uno inexistente y los dos lenguajes. Comparó `exerciseContextHTML`, `lockedExerciseHTML`, `missionIDs` y `returnURL`, también con ids hostiles: **55 880 comparaciones y 0 diferencias** (3,3 s). `lab-bridge-check` (21) pasa sin cambiar una línea.

**Alternativas.** Que la entidad devuelva el HTML: lo prohíbe FR-045. Que el adaptador siga leyendo `location` dentro de las funciones nuevas: lo prohíbe la misma regla.

## R5. `features/progress-backup`

**Decisión.**

- **La interfaz.** `createProgressBackup({ guide, areas, sessionResets })` devuelve un `ProgressBackup`, la interfaz que D1c vuelve a implementar sin tocar a quien llama:
  - `exportProgress()`, `listBackups()` y `readBackup(key)` son síncronos (Q4);
  - `planImport(text)` es síncrono y puro: lee el JSON, planifica el recorrido y cada sección presente, y lanza ante cualquier sección inválida sin aplicar nada;
  - `applyImport(plan)` y `resetAll(confirmation?)` devuelven una promesa (Q4); la confirmación es `{ password }` y en local se ignora.
- **Ayudantes puros que exporta la feature.** `assertImportSize(size)` hace el control de 10 MB, que va antes de leer el archivo, e `importFailureNotice(error)` arma el aviso de error de hoy.
- **Lo que sigue en `app.js`:** leer el archivo, el toast, el redibujo, la etiqueta de guardado, el diálogo y el temporizador (FR-048).
- **Las áreas.** `app.js` las arma con funciones que leen `window.Taller*` en cada llamada, nunca al arrancar: dos escenarios de `app-shell-check` borran o cambian adaptadores después de `startApp()`. El recorrido es `routeStore`, que ya cumple la interfaz.
- **Las secciones de un motor** tienen un `reset` asíncrono, `async () => (await engine?.reset())?.removed`, así que un motor que devuelva una promesa también funciona.
- **Las esperas.** La feature espera cada resultado en orden, con `await` uno por uno y sin `Promise.all`. Al borrar, el orden es recorrido, laboratorio, campaña y Sistemas, y después los pasos de sesión. Al aplicar una importación, el orden es campaña, laboratorio, Sistemas y, por último, el recorrido.
- **Lo que no es almacenamiento** se reinicia en `sessionResets`, que registra quien lo posee (FR-051). `app.js` registra `TallerSystems.resetSimulations()` y el temporizador, y la página de Método de F8 no los tiene que conocer.
- **Los sellos derivados** se sincronizan dentro de `applyImport`, después de aplicar y antes de resolver (primero Sistemas y después campaña, cada uno con su `try`).

**Se mueve sin reescribir.** Quedan igual:

- las reglas «sólo `false` cuenta» en las secciones y «falsy» en el recorrido;
- el orden de las secciones (campaña, laboratorio y Sistemas) y el de las áreas en el aviso (recorrido, laboratorio, campaña y Sistemas);
- los textos, el límite de 10 MB y `NON_ROUTE_KEYS`;
- los dos `new Date()` de la exportación.

Cambian dos órdenes sin efecto visible:

- La etiqueta de guardado pasa a actualizarse después de sincronizar los sellos y no antes. La etiqueta depende sólo de `routeStore.storageAvailable()`, que sincronizar no toca.
- El `save()` del recorrido en blanco, el cierre del diálogo, el redibujo y el aviso de «Borrar todo» corren después del `await`.

**Evidencia** (prototipo sobre `c5d497d`):

| Prueba | Resultado |
| --- | --- |
| Hacer asíncrono «Borrar todo» en `app.js` y correr `app-shell-check` | 52 de 53: falla sólo «h) borrar todo: elimina el respaldo del recorrido y reinicia a los motores», que despacha el clic con `void` y afirma enseguida |
| El mismo escenario con `await` en lugar de `void`, sin cambiar un valor esperado | 53 de 53 |
| `boot-check` con «Borrar todo» asíncrono | 14 de 14: su escenario ya espera el clic y `flush()`, y fija el orden `TallerLab.reset`, los dos motores y `TallerSystems.resetSimulations` |
| La feature completa y `app.js` cableado | `app-shell-check` 53 de 53 y `boot-check` 14 de 14; `tsc` y ESLint sin avisos en la feature |
| Opción `asyncAdapters` del arnés: `applyImport` y `reset` de los adaptadores falsos devuelven promesas | 4 gemelos nuevos en verde (57 de 57): importar bien, un laboratorio que resuelve `false`, borrar bien y un motor que resuelve `{ removed: false }`. Con el `app.js` de hoy, el segundo y el cuarto fallan, porque `app.js` no espera a los adaptadores |
| La red de F1 con las unidades 5, 6 y 7 | 106 de 106; ningún E2E importa, exporta ni borra |

**Un defecto latente que se conserva.** El `applyImport` de los dos motores devuelve `{ changed, storageAvailable }`, nunca `false`. Así que el aviso «no se pudo guardar» no nombra nunca a campaña ni a Sistemas, aunque su almacenamiento no escriba. Los adaptadores falsos de `app-shell-check` devuelven `false` y prueban un caso que producción no genera. Corregirlo, por ejemplo leyendo `storageAvailable`, es un cambio de comportamiento que F2 no hace: se informa a F8 y a D1c.

**Alternativas.**

- **Todo síncrono (Q4, B)** y **sólo las piezas puras (Q4, C):** las descartó el usuario.
- **Que la feature lea el archivo:** FR-048 deja la lectura en `app.js`.
- **`planImport` con el objeto ya parseado:** el texto le sirve más a D1c, que manda el crudo v1 tal cual (FR-024 de D1), y deja en la feature el aviso de JSON inválido.
- **Esperar sólo lo que sea una promesa,** para que el flujo local siga en un solo tick: es más código, y lo que se espera son microtareas que no cruzan ningún evento.
- **Sincronizar los sellos fuera de `applyImport`:** D1c tendría que repetir ese paso en su implementación, y quien llama, saber que existe.

## R6. Los exploradores: el mapa, la fixture y los modelos

**Decisión.**

- **El mapa.** `entities/exercise/model/explorer-kinds.ts` tiene dos `Map` escritos a mano:
  - el de laboratorio, con 61 entradas `id → 'channel' | 'generic' | 'pointer'`;
  - el de misión, con 12 entradas `id → { language, mode: 'robot' | 'packet' }`.

  Se buscan con `labExplorerKindOf`, `questExplorerOf` y `explorerKindOf`. Un `Map` y no un objeto, para que ids como `constructor` o `__proto__` den `null`.
- **La fixture** `qa/fixtures/explorer-kinds-<base>.json` es la clasificación de los 274 ejercicios con las dos expresiones regulares en el commit base. Queda congelada y no se regenera.
- **Los modelos** (`model/lab-explorer.ts` y `model/quest-explorer.ts`) son el código de transición de `act` y `change`, más `fresh`, `packetData`, `crc32`, `rotateChecksum` y `hex`, movidos sin reescribir y devolviendo un estado nuevo en lugar de mutar.
- **Lo que se queda en las vistas legacy:** el HTML, el foco, la región viva, el mapa de estados por ejercicio (`states`) y las 12 misiones de proyecto (FR-056).
- **Lo que no cambia:** los exploradores visuales propios de `lab.js` (`ownership`, `slice` y `flow`), que son de F7.

**Evidencia.**

- **La clasificación** de las dos expresiones regulares sobre los 274: 21 de canal, 20 genéricos, 20 de puntero, 6 de robot, 6 de paquete y 201 sin explorador, sin superposición.
- **Q1 se confirma.** Ninguno de los seis ejercicios que nombra (go-61 a go-65 y go-112) entra por el texto de su tema, y los seis entran por `visual: concurrency`. Go-64 y go-65 entran además por el título; go-61, go-62, go-63 y go-112, sólo por `visual`. Un mapa por tema no alcanzaría.
- **El prototipo** (el mapa, los dos modelos y los dos exploradores cableados):
  - `quest-explorers-check` da 47 de 47 sin cambiar una línea;
  - `npm test` y la red de F1 pasan;
  - el HTML suma 2 023 caracteres, casi todos del mapa.
- **La comparación** dibujó los dos exploradores para los 274 ejercicios y, en los 73 que tienen uno, aplicó una traza de operaciones: 16 pasos y 6 elecciones en cada uno de laboratorio, y 27 pasos en cada uno de misión. Comparó el HTML, la región viva y el foco después de cada paso: **2 214 comparaciones y 0 diferencias.**
- **La complejidad** queda en 35 avisos. Antes, los dos exploradores tenían 6: `body` 34, `act` 18, `act` 38, `packetBody` 22, `robotBody` 16 y `packetData` 14. Después son 6: `body` 26, el `act` de misión 19 (sólo DOM), `packetBody` 22, `robotBody` 16, `packetData` 14 (movida) y `applyPacketOperation` 15. El `act` de laboratorio baja de 10 porque las ramas `send` y `receive` pasan a dos funciones del modelo con nombre.

**Ningún E2E de F1 dibuja un explorador.** Abren rust-02, rust-04, rust-18, rust-31, rust-113 y go-113; rust-103, sólo bloqueado. La cobertura es la de `quest-explorers-check`, las specs nuevas y la comparación.

**Alternativas.** Un campo en `content/` (Q1, B) y conservar las expresiones regulares (Q1, C): las descartó el usuario. Un objeto literal: con `in` o con indexado, un id como `constructor` daría un valor del prototipo. Generar el mapa desde la fixture al construir: el mapa tiene que ser un dato legible del front (Q1), no un derivado.

## R7. Las reglas de CSS: dónde van y cómo se prueba que no cambió nada

**Decisión.** Las nueve filas de la tabla de la unidad 8 son 26 reglas de CSS. Cada una se mueve entera, sin cambiar sus declaraciones, y se agrega **al final** de la hoja de destino en el orden en que aparece hoy:

- en `styles.css`: las 2 de la fila 1, las 3 de la 9, un bloque de 850 px con 3 reglas de la 2, uno de 590 px con 4, la 5, la 4, el bloque de 981 px de la 3 y un bloque de 650 px con la 8;
- en `lab.css`: las 2 de la fila 7, las 3 de la 6 y un bloque de 650 px con sus 3 variantes.

Al final de su hoja, cada regla queda después de todas las que hoy pisa por orden de carga, incluidos los dos bloques de 590 px de `styles.css` (FR-059). El orden de carga de las hojas no cambia.

**Evidencia** (prototipo de la unidad 8 sobre `c5d497d`):

| Prueba | Resultado |
| --- | --- |
| Prettier sobre las tres hojas | en verde |
| Script y marcado del dist | los mismos sha256 de la base (`d4051c59…` y `562c5364…`) |
| `<style>` del dist | sha256 `ae2971b0…`; 102 333 caracteres (+104, los cuatro envoltorios `@media` nuevos) |
| Multiconjunto de declaraciones (contexto `@media`, cada selector por separado, propiedad, valor e `!important`) | 4 319 contra 4 319; 0 diferencias. `lightningcss` reordena declaraciones dentro de una regla y escribe `[aria-current=page]` sin comillas, igual en las dos; no juntó ninguna regla de más |
| Red de F1 | 106 de 106, con las 15 de `css-contract` |
| Barrido de estilo computado: cada propiedad de cada elemento de 14 páginas (las 8 vistas, una misión, el bloqueo, un núcleo, un taller y los estados vacíos del laboratorio y de Sistemas), a 1 280, 981, 850, 650, 590 y 375 px, con y sin movimiento reducido | 168 capturas, 45 012 elementos y 22 055 880 valores; 0 diferencias; unos 6 minutos |
| Control negativo: las mismas reglas al **principio** de `styles.css` | multiconjunto: 0 diferencias. Barrido de 3 páginas a 590 y 981 px: **702 diferencias** (la barra lateral a 590 px pasa de 204 a 250 px de alto) |

**La consecuencia que cambia el plan.** La comparación que pide la spec, el conjunto de reglas en otro orden, es necesaria pero no ve la cascada: con las reglas en el lugar equivocado da igual. La comparación decisiva de la unidad 8 es el barrido de estilo computado, y la del multiconjunto queda como prueba de que nada se perdió ni se duplicó.

**La primera corrida del control salió mal, y quedó una regla para el script.** El barrido lanzaba `vite preview` con `npx`, y matar a `npx` dejaba vivos los servidores, así que el control comparó contra la copia buena. El script lanza ahora `node_modules/.bin/vite` directamente, y antes de cada corrida se comprueba que los puertos estén libres.

**Lo que el barrido no ve:** el `:hover`, el `:focus` y las animaciones en curso. Ninguna de las 26 reglas tiene un estado así; el foco visible es de `styles.css` y no se mueve.

**`.quest-direct-lock`** queda en `campaign.css`, como dice la spec: lo dibuja el laboratorio, F1 lo protege (R10 de `css-contract`) y F6 tiene que moverlo antes de borrar la hoja.

**Alternativas.** Insertar cada regla justo después de la que pisa: hay que ubicar cada vez, y el resultado es el mismo que agregar al final, porque nada de lo que queda después de la posición nueva compite con ellas. Acotar cada hoja a su vista: lo descarta la spec.

## R8. La correspondencia de los checks (FR-013)

Ningún escenario se retira en F2b. Las specs nuevas pasan a ser las dueñas del contrato de dominio, que sobrevive a los ports. Los checks siguen como pruebas de integración de los adaptadores legacy hasta que el port de cada vista borre el archivo que cargan (F7 y F8). Eso es «ningún check se retira por adelantado».

| Check | Hoy | Unidad | Qué cambia en el código del check |
| --- | --- | --- | --- |
| `lab-bridge-check` | 21 | 5 | nada: carga `campaign.js` y `systems.js` por ruta, y esbuild empaqueta los imports nuevos (prototipo: 21 de 21) |
| `quest-explorers-check` | 47 aserciones | 7 | nada (prototipo: 47 de 47) |
| `app-shell-check` | 53 | 6 | el escenario «h) borrar todo: elimina el respaldo…» espera el clic (`await` en lugar de `void`; el callback pasa a `async`); suma la opción `asyncAdapters` y 4 escenarios gemelos. Los valores esperados no cambian |
| `seams-guard-check` | 18 | 5 | suma los escenarios de R6. No es uno de los nueve que adapta F2 (FR-013): crece con la regla nueva |

Las tablas de escenario por escenario están en el plan: §2.6 para `lab-bridge-check`, §3.6 para `quest-explorers-check` y §4.6 para `app-shell-check`.

## R9. El tope de tamaño

**Decisión.** En toda F2b, el HTML crece como máximo **8 000 caracteres** sobre la línea base de T020, y cada PR informa su medida. Antes del corte de A2 sigue además bajo el tope de `build-check` (2 500 000). Si el corte de A2 llega en el medio, K vuelve a medir la base sobre `master` con A2, cuenta lo que ya sumaron las unidades integradas y el tope absoluto pasa a ser el de A2.

**Evidencia.** Medido en los prototipos: la unidad 8 suma 104 caracteres, la 5 suma 678, la 6 suma 1 369 y la 7 suma 2 023. El total es 4 174, algo más de la mitad del tope.

## R10. Lo que no se hace (YAGNI)

- Reemplazar las anclas `href="#vista"` de las plantillas por llamadas a la gramática.
- Reexportar las entradas sin estado desde los índices.
- Arreglar el defecto del `applyImport` de los motores (R5), el bloqueo de campaña que va primero, el `<body>` con `aria-pressed` o el CSS muerto de `.navigation a:last-child` (las dos copias se mueven tal cual).
- Bajar la complejidad de `syncLinkedLanguage` (11), que es del router de F10.
- Pasar las 12 misiones de proyecto a `content/` o tocar los exploradores visuales de `lab.js`.
- Un oyente del evento `storage`, un debounce de la escritura por tecla y cualquier dependencia nueva.
- Volver permanente cualquiera de las comparaciones únicas. Las permanentes son las specs.

## Análisis de consistencia (speckit-analyze)

Corrió a mano el 2026-10-06 sobre `spec.md` (FR-001 a FR-018 y FR-043 a FR-060), `plan-f2b.md`, este archivo, `quickstart-f2b.md` y `tasks-f2b.md`, porque los scripts de Spec Kit apuntan a los archivos de F2a (R1). Es de sólo lectura, salvo las correcciones que se listan abajo, que se aplicaron después en sus propios commits.

**Chequeos mecánicos:**

- Los 36 requisitos de F2b y los 10 criterios que le tocan (SC-001 a SC-003 y SC-007 a SC-013) tienen al menos una tarea; ninguna tarea cita un requisito de F2a.
- Hay 19 tareas, de T020 a T038, secuenciales.
- Cada referencia «plan N.M» y «quickstart-f2b §N» tiene su sección, y cada «§N.M» del plan también.
- No hay enlaces relativos rotos ni marcadores pendientes. `<base>`, en el nombre de la fixture, es el hash del commit base: lo fija T020.
- Las cifras (2 569, 55 880, 2 214, 4 319, 106, 53, 57, 35 avisos y +8 000) coinciden entre los cuatro documentos.
- **Constitución:** sin conflictos.

**Hallazgos corregidos:**

| ID | Severidad | Hallazgo | Corrección |
| --- | --- | --- | --- |
| C1 | MEDIA | FR-045 pide que `entities/systems-workshop` exporte «el regreso al taller» como dato, y el plan lo dejaba entero en la gramática, que además decidía la parte `build` y normalizaba el lenguaje | `workshopReturnTarget` en la entidad y `workshopReturnHref(location)` en la gramática (R4). Se volvió a verificar en el prototipo: tipos, ESLint, `lab-bridge-check` 21, `npm test` (31 checks y 190 pruebas), 35 avisos, 2 569 URL y 55 880 respuestas iguales |
| C2 | MEDIA | Dos mutaciones de quickstart §4 no las detectaba ninguna prueba: el `refresh()` adelantado en el contexto de Sistemas (no cambia el HTML) y el orden entre los dos pasos de sesión (el temporizador no se registra) | La primera sale de la tabla y queda en el Review Focus. La segunda pasa a ser «correr los pasos de sesión antes de los `reset` de las áreas», que sí detectan la spec de la feature y `boot-check` |
| C3 | MEDIA | La mutación `Promise.all` en `resetAll` no la detectaba la spec tal como estaba escrita: con `Promise.all` las llamadas igual salen en orden | La spec de T033 registra el inicio y el fin de cada área asíncrona y exige que cada una empiece cuando la anterior resolvió |
| C4 | BAJA | El Review Focus decía que la comparación de los puentes recorría un parámetro presente y vacío, y el script no lo hacía | Las dos comparaciones suman `?sistema=` y `?campana=` vacíos y los ocho lectores contra `URLSearchParams`; se volvieron a correr: 2 569 y 55 880, sin diferencias |
| C5 | BAJA | El plan saltaba de §2.5 a §2.7 | Pasa a §2.6, también en este archivo y en las tareas |
| C6 | BAJA | El cableado de `app.js` dejaba el área de Sistemas como un comentario («the same with…») | Se escribe entera |
| C7 | BAJA | Faltaba decir por qué la feature puede importar el índice de `entities/guide` sin duplicar `routeStore` en los checks | Una nota en §4.0 del plan (FR-018) |

**Hallazgos que se aceptan, con su motivo:**

| ID | Severidad | Hallazgo | Por qué queda así |
| --- | --- | --- | --- |
| A1 | BAJA | La unidad 8 no abre con una prueba en rojo (FR-001) | La spec define su prueba como la protección de F1, en verde antes y después, más la comparación única; mover CSS no es un cambio de comportamiento |
| A2 | BAJA | FR-048 cuenta `exportProgress` y `downloadBackup` entre lo que se mueve, y la descarga sigue en `app.js` | La feature arma el archivo y su nombre, y la descarga es DOM: FR-051 le prohíbe leer `window` |
| A3 | BAJA | El «contexto de una misión» de Sistemas, como dato, es el rol | El título viene del contenido y el sello, del motor, y los dos se leen después de comprobar el rol, para conservar el orden de los efectos (R4) |
| A4 | BAJA | `seams-guard-check` no está entre los nueve checks de FR-013 y cambia | Crece con R6, que es una regla nueva (FR-014 y FR-018), no una adaptación de cómo carga el código |
| A5 | BAJA | La spec dice 51 escenarios en `app-shell-check` y que seis ejercicios «entran por visual» | Lo medido son 53 escenarios, y los seis entran por `visual`, pero dos también entran por el título. El plan usa lo medido, y las enmiendas las informa T038 |
