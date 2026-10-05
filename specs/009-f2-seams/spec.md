# Feature Specification: F2 · Seams sin cambio visible

**Feature Branch**: `009-f2-seams` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Borrador, con cuatro preguntas abiertas para el clarify y una partición propuesta

**Input**: Ítem **F2** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Seams sin cambio visible»: dejar los almacenes, los motores, el catálogo, el arranque, los puentes y el respaldo como módulos importables, para portar cada vista sin tocar a las demás. Pedido del coordinador del 2026-10-05 (ver «Lo que pidió el usuario»). Depende de F1 ([spec](../003-f1-red-de-seguridad/spec.md)). Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), que el usuario dio por aprobado (en esta rama el archivo todavía dice «propuesta»), el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md) (aceptado), el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.0. Las specs de A2, D1 y C4 y el plan de A2 son borradores en otras ramas: lo que se toma de ahí es un supuesto y se cita con su rama y su ruta, sin enlace.

## Intención y alcance

**Lo que entendemos.** Hoy lo que una vista legacy comparte con las otras vive en cierres de archivo y en `window`. El almacén del recorrido está dentro de `app.js`; el del laboratorio y el catálogo de los 274 ejercicios, dentro de `lab.js`; los motores de campaña y de Sistemas existen sólo como `window.X = create…()`; el arranque ocurre al evaluar `app.js`; los puentes entre vistas son HTML y URL armados a mano en cinco archivos; el respaldo del progreso es un bloque de `app.js`; y las reglas de CSS de una vista a veces viven en la hoja de otra. Portar una vista a React sin tocar las demás exige antes que cada una de esas piezas sea un módulo con nombre y contrato, que una página nueva importe sin abrir una segunda copia (el favorito que el alumno quitó vuelve a aparecer) y sin leer `window` antes de tiempo (campaña lanza y Sistemas queda vacío sin error). F2 hace ese trabajo en ocho unidades y no cambia nada de lo que el alumno ve ni de lo que guarda: es un refactor puro. Se demuestra con la red de F1 en verde antes y después de cada unidad, con los bytes del currículo y de sus volcados sin cambio, con las fixtures de progreso congeladas arrancando como hoy y con una comparación única entre el código de antes y el de después. Las unidades 1 a 4 son el camino crítico de A2, que espera un arranque explícito sobre almacenes y catálogo que ya no se evalúan solos: se entregan primero y por separado del resto. Las unidades 5 a 8 las esperan los ports. Es para quien porta una vista (F3 a F10), para A2 y para D1. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con el build de cada unidad servido, la red de F1 pasa completa y sin editarse, salvo las dos specs de Vitest de riesgo, que cada unidad invierte en su commit TDD.
2. `build/curriculum.json`, el volcado de `dump-globals` y el de `dump-dist-globals` tienen los mismos bytes que antes de la unidad.
3. Las tres fixtures congeladas de progreso arrancan sin escribir, sin respaldar y sin avisar, y sus exportaciones se importan sin omisiones.
4. Cada clave de progreso se abre en un solo lugar, y ningún módulo legacy ni singleton toca el almacenamiento ni lee los catálogos de `window` al evaluarse: lo hace `startApp()`.
5. Cada comportamiento que se mueve tiene su spec con valores escritos a mano, y una comparación única contra el código anterior da 0 diferencias.
6. D1c puede reemplazar importar y «Borrar todo» sin tocar a quien los llama.
7. Cada unidad se puede revertir sola (con las que dependen de ella), y las unidades 1 a 4 se integran antes y aparte de las 5 a 8.

**Entra:**

- Las ocho unidades de la hoja de ruta, con su API pública, su prueba y su punto de reversión (ver «Las ocho unidades»).
- Los cambios mínimos en `frontend/app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js`, `quest-explorers.js`, `frontend/src/app/main.tsx` y los adaptadores de `frontend/src/app/legacy/` para que usen esos módulos.
- La adaptación de los checks de `qa/` que cargan esos archivos (cómo los cargan, no qué esperan) y `qa/load-order-check.ts` leyendo el arranque explícito.
- Las specs de Vitest (proyecto `node`) de los módulos nuevos, y la documentación que cambia con ellos (`docs/architecture.md` y `qa/AGENTS.md`).

**Queda fuera:**

- Portar una vista a React, el router y la raíz única (F3 a F10).
- Cambiar `content/` o el generador: ni un byte de `build/curriculum.json`. Un campo de explorador en `content/`, si el usuario lo elige en Q1, es un ítem aparte.
- La compuerta de contenido, el acceso tipado y la carga asíncrona (A2).
- Lo que decide cada port: los textos de los hitos y `renderProject` (F4); el saneo del SVG y la sesión de simulaciones (F5); los selectores del laboratorio, `diagnose`, `liveHint` y los tres exploradores que `lab.js` lleva dentro (F7); la etiqueta de un `solvedAt` importado sin evidencia (F7); los conteos fijos del menú (E1 o el port).
- El HTML de las vistas, que sigue en los adaptadores hasta F7; el cambio de transporte a `/api/runs` (A4); un debounce de la escritura por tecla.
- jsdom, Testing Library y fishery (llegan con F3) y, salvo que Q3 lo elija, Zustand.
- Un E2E de comportamiento por vista: cada port trae los suyos (Q1 de la spec de F1).

**Sin hacer a propósito (YAGNI):** un contenedor de dependencias; barrels; un store genérico más allá de la suscripción de Q3; memoización; retirar un global antes de que su último lector se porte; pasar las 12 misiones de proyecto a `content/`; reescribir la complejidad de las funciones que se mueven (se mueven, no se reescriben); capturas de pantalla.

**Actores:** quien porta una vista (el usuario y los agentes que implementan); quien revisa los PR; el agente principal, que integra `main.tsx`, `package.json`, las configuraciones y la documentación; A2 y D1c, que consumen estas unidades; y el alumno, que no debe notar nada.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta. Las fuentes «Coordinador» son el encargo de esta spec.

| Pedido | Fuente |
| --- | --- |
| Red y seams primero, vistas una por una y el shell al final con una sola raíz; A2 temprano | Usuario, 2026-10-05 |
| Es un port y no un rediseño: se conservan el aspecto, el comportamiento, el progreso, los IDs y las URLs | Usuario, 2026-10-05 (supuesto que no corrigió) |
| F2 deja como módulos importables los almacenes, los motores, el catálogo, el arranque, los puentes y el respaldo, en ocho unidades con su prueba y su punto de reversión; los `window.Taller*` que las vistas legacy leen siguen como adaptadores finos | Hoja de ruta, F2 |
| «Sin cambio visible»: `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después, y los E2E de F1 pasan sin editarse | Hoja de ruta, criterios de aceptación de F2 |
| La red de F1 son los E2E, dos specs de Vitest que caracterizan los riesgos altos en verde (F2 las invierte) y la protección del aspecto por estilo computado a 981, 850, 650 y 590 px | Clarify de F1 (Q1 a Q5, todas A), según el coordinador; la spec de F1 en esta rama todavía los muestra abiertos |
| El progreso guardado es contrato: claves, versiones y fixtures congeladas intactas | ADR 0003 (aceptado); `qa/AGENTS.md` |
| A2 espera las unidades 1 a 4: se entregan primero y por separado del resto | Coordinador, 2026-10-05 |
| Recoger como requisitos los seis contratos de A2 (F2-I1 a F2-I6) | Coordinador, 2026-10-05 (plan de A2, rama `spec/a2-compuerta`, `specs/006-a2-compuerta-arranque/plan.md`) |
| `features/progress-backup` con una interfaz que D1c reemplace sin reescribir las vistas, y almacenes con suscripción para el cliente de D1c | Coordinador, 2026-10-05 (spec de D1, borrador, rama `spec/d1-progreso`, FR-061) |
| No sumar ningún sitio de estilo en línea: C4 cuenta seis (cuatro `style=` y dos `cssText`) | Coordinador, 2026-10-05 (spec de C4, borrador, rama `spec/c4-exposicion`) |
| Un cambio de comportamiento va en su propio commit, con TDD; el código y las pruebas en inglés, la documentación en español | `AGENTS.md`; constitución, principios II y VI |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicarla | Coordinador, 2026-10-05 |

## Las ocho unidades

Los ids son los de la hoja de ruta y no cambian. Esta sección fija, de cada unidad, qué deja, en qué capa y slice de Feature-Sliced Design vive, qué exporta, cómo se prueba y cómo se revierte. Los nombres de módulos y de exports son provisionales y los confirma el plan: la spec fija la capa, la responsabilidad y el contrato.

### Orden de ejecución y entrega

- **Por dependencia, no por número.** La 2 va antes que la 1, porque el almacén del laboratorio lee con el catálogo. La 4 es independiente. La 1, la 2 y la 4 van antes que la 3, que inicializa lo que ellas dejan. La 5 y la 6 van después de la 1 y la 2 (la 6 también después de la 3, donde se arma). La 7 y la 8 no dependen de las demás.
- **Las unidades 1 a 4 se entregan primero y por separado de las 5 a 8.** Son lo que A2 espera: su spike corre sobre la base con ellas integradas, y si falla, A2 se detiene y decide el usuario. Ninguna unidad de la 5 a la 8 comparte cambio con ellas ni demora su integración. Dentro de la 1 a la 4, la 2 y la 4 tocan archivos disjuntos y pueden ir en paralelo; la 1 y la 3 comparten `app.js` y `lab.js` y van una después de la otra.
- **Las unidades 5 a 8 siguen el orden en que las piden los ports:** la 5 y la 8 antes de F5 y F6, la 7 antes de F7 y la 6 antes de F8.

### Unidad 1 · Un almacén por clave y un motor por tipo, con suscripción

- **Qué deja:** los cuatro almacenes de progreso como singletons que se importan, se abren una sola vez en el arranque y avisan de sus cambios. Hoy el del recorrido vive en el cierre de `app.js`, el del laboratorio en el de `lab.js`, y los motores existen sólo como `window.TallerCampaignEngine` y `window.TallerSystemsEngine`.
- **Capa, slice y exports (provisionales):**
  - `entities/guide`: el almacén del recorrido, su lectura (`parseProgress`), el estado por omisión, la fusión entre pestañas y la lista de los 10 ids de hitos. Ya exporta `mergeRouteProgress` y los tipos.
  - `entities/exercise`: el almacén del laboratorio, con su lectura, su fusión en el lugar y el plan y la aplicación de su importación.
  - `entities/campaign` y `entities/systems-workshop`: una instancia de cada motor, además de la fábrica que ya exportan (las specs siguen usando la fábrica).
  - Los cuatro: abrir (una vez, con el contenido que necesitan para leer lo guardado), estado actual, suscripción con baja, y lo que ya tienen (`exportState`, `planImport`, `applyImport`, `backups` y `reset`).
  - `register-campaign-engine.ts` y `register-systems-engine.ts` publican esas mismas instancias; `app.js` y `lab.js` usan sus singletons.
- **Su prueba:** specs de Vitest (node) junto a cada módulo, primero en rojo. Con `qa/fixtures/progress-master-2a278ad-storage.json` en un almacenamiento en memoria, abrir cada uno da `loaded`, sin escribir, sin respaldar y sin aviso. La suscripción avisa tras escribir, importar y borrar, y no al cargar. Abrir dos veces o usar sin abrir falla. El laboratorio conserva la identidad de sus registros. Importar el módulo con un `localStorage` que lanza ante cualquier acceso no lo toca. Acá se invierte la prueba de riesgo 1 de F1 (Q2).
- **Reversión:** devuelve los cierres de `app.js` y `lab.js` y las instancias creadas en `window`. Se revierten antes las unidades 3, 5 y 6 si ya están integradas.
- **Orden:** después de la 2; antes de la 3, la 5 y la 6.

### Unidad 2 · El catálogo y el arnés de pruebas

- **Qué deja:** el catálogo de los 274 ejercicios (`exercises` y `byId`) y `buildProgram`, hoy armados dentro de `lab.js`. El catálogo se arma al evaluarse, con `RUST_LAB`, `RUST_QUESTS`, `GO_LAB`, `GO_QUESTS` y los cuatro `SYSTEMS_*_LABS`.
- **Capa, slice y exports:** `entities/exercise`: el catálogo (una instancia que el arranque inicializa con las listas de ejercicios, en el orden de hoy, y que sirve `exercises` y `byId`; más una fábrica pura para las specs y los checks) y `buildProgram`, junto a `interpretRun`. No importa `build/curriculum.json`, no lee `window` y no importa el acceso al contenido de A2: el adaptador del laboratorio lo inicializa con lo que publican los adaptadores de catálogos (A2, F2-I2).
- **Su prueba:** specs en rojo: el orden de los ocho grupos, 274 ids únicos, `byId` de un id de cada grupo, el fallo de usar el catálogo antes de inicializarlo y dos programas de prueba resueltos a mano (uno de Rust y uno de Go, con y sin caso propio). La comparación única da el mismo programa para los 274. `runtime-check` pasa a importar `buildProgram`, y `systems-check` y `project-kit-check`, la fábrica pura del catálogo.
- **Reversión:** `lab.js` vuelve a armar `exercises` y `byId` y a publicar `buildProgram`.
- **Orden:** primera; no depende de ninguna.

### Unidad 3 · El arranque explícito

- **Qué deja:** lo que hoy ocurre al evaluar `app.js` (abrir el almacén del recorrido, inicializar campaña y Sistemas, juntar los avisos de carga, fijar el idioma que manda la URL, registrar los oyentes y el `setInterval` del temporizador, dibujar la primera vista y mostrar los avisos) y lo que `lab.js` hace al evaluarse (armar el catálogo y abrir su almacén) pasa a funciones que se llaman en orden.
- **Capa, slice y exports:** `frontend/app.js` exporta `startApp()`, sin argumentos, y `frontend/src/app/main.tsx` la llama una vez, después de todos los imports. `window.TallerLab` suma un `init`, como ya tienen `TallerCampaign` y `TallerSystems`. No se crea una carpeta nueva: `startApp` no vive en `app/boot/`, así que no pisa los nombres de A2 (A2, F2-I1).
- **Su prueba:** en `boot-check` y en `app-shell-check`, en rojo primero. Evaluar cada fuente legacy sola, en un contexto sin catálogos ni adaptadores, y el bundle de `main.tsx` sin su llamada final, con un almacenamiento que lanza ante cualquier acceso, no falla ni lo toca. `startApp()` inicializa en orden y dibuja la primera vista. Una segunda llamada falla. `load-order-check` lee los imports con y sin nombre y la llamada, y conserva las 16 restricciones y las dos reglas de los extremos. Acá se invierte la prueba de riesgo 2 de F1 (Q2).
- **Reversión:** vuelve la función que se arranca sola. Con A2 integrada, se revierte antes el corte de A2.
- **Orden:** después de la 1, la 2 y la 4.

### Unidad 4 · El registro de modelos de Sistemas

- **Qué deja:** la unión de los cuatro grupos de modelos (`lowlevel`, `infra`, `play` y `pc`) y su detección de nombres repetidos, hoy en `systems.js:init`.
- **Capa, slice y exports:** `entities/systems-simulation`: un registro que junta los modelos que el slice ya exporta (`lowlevelModels`, `infraModels`, `playModels` y `pcModel`) y se los entrega al motor al inicializarse. Mismo error ante un nombre repetido. Los adaptadores `register-systems-*.ts` y el oráculo no cambian: `window.SYSTEMS_*` conservan su forma y el orden de claves de `models`.
- **Su prueba:** specs en rojo: el registro tiene exactamente los modelos que referencian los 25 talleres, y dos grupos con un nombre repetido lanzan el error de hoy. `systems-check` y los cuatro `systems-<dominio>-check` siguen; `dump-globals` queda idéntico.
- **Reversión:** `systems.js:init` vuelve a unir los modelos.
- **Orden:** independiente; antes de la 3.

### Unidad 5 · Los puentes entre vistas y la gramática de URL

- **Qué deja:** los datos que campaña, Sistemas y el laboratorio se pasan hoy como HTML y como URL armada a mano en `campaign.js`, `systems.js`, `lab.js`, `app.js` y el Atlas: contexto de misión, permiso, regreso y lista de misiones; y las URL de las ocho vistas y de las seis formas con query.
- **Capa, slice y exports:**
  - `shared/config`: la gramática de URL. Las ocho vistas, los parámetros (`ejercicio`, `paso`, `campana`, `sistema`, `mundo`, `lenguaje`, `taller` y `parte`), cómo se leen y cómo se arma cada forma. La usan cuatro vistas y el enlace del Atlas al laboratorio (`ConceptDetail`).
  - `entities/campaign`: datos puros del contexto de una misión (mundo, puntos y sellos), del permiso para intentarla y del regreso a su mundo. `entities/systems-workshop`: la lista de misiones de un taller, el contexto de una misión y el regreso al taller. Sin HTML, sin leer `location` y sin que una entidad importe a otra.
  - La composición (Sistemas antes que campaña, la lista navegable y `finishNavigation`) queda en el laboratorio: hoy `lab.js`, después `pages/lab/model`. `exerciseContextHTML` y `lockedExerciseHTML` siguen en los adaptadores y arman el mismo marcado a partir de esos datos.
- **Su prueba:** specs en rojo de la gramática: cada una de las seis formas se lee y se arma con la cadena escrita a mano desde el README y el mapa (§4), con los ids de `qa/fixtures/curriculum-ids.json` (por ejemplo `rust-world-1`, `cache` y `rust-113`). Specs de los datos con esos ids. `lab-bridge-check` (21 escenarios) sigue en verde sobre los adaptadores. La comparación única compara las URL y los datos con los del código anterior.
- **Reversión:** los archivos legacy vuelven a armar sus URL y su contexto.
- **Orden:** después de la 1 y la 2.

### Unidad 6 · `features/progress-backup`

- **Qué deja:** exportar, importar en dos fases con sus avisos, «Borrar todo» y los respaldos, que hoy son un bloque de `app.js`.
- **Capa, slice y exports:** `features/progress-backup`: exportar (el archivo y su nombre), planificar una importación (puro, sin tocar el estado), aplicarla, borrar todo, y listar y leer respaldos. Recibe las cuatro áreas por parámetro, cada una con los métodos que hoy invoca `app.js`, y no importa vistas ni lee `window`. Importar (aplicar) y «Borrar todo» devuelven una promesa, y «Borrar todo» acepta una confirmación que hoy se ignora (Q4). Exportar y listar respaldos siguen locales y síncronos.
- **Su prueba:** specs en rojo con áreas falsas, que reemplazan los escenarios de dominio de `app-shell-check`: las dos fases, el orden de las secciones y de las áreas en los avisos, que sólo `false` cuenta como «no se guardó», que la sincronización de sellos es independiente por área, el límite de 10 MB y los textos. La forma de la exportación y la importación de las dos exportaciones congeladas sin omisiones. Con un doble asíncrono de las áreas, el flujo de `app.js` termina igual sin cambiar a quien llama.
- **Reversión:** el bloque vuelve a `app.js`.
- **Orden:** después de la 1 y de la 3 (donde se arma).

### Unidad 7 · Los modelos puros de los exploradores

- **Qué deja:** la lógica de los exploradores sin DOM, hoy mezclada con el HTML en `lab-explorers.js` y `quest-explorers.js`: qué explorador corresponde a un ejercicio, el canal productor y consumidor, la tabla de restricciones genéricas, el puntero, el robot y el paquete (con `crc32` y la huella rotativa).
- **Capa, slice y exports:** `entities/exercise`: funciones puras de transición sobre un estado y de decisión del explorador de un ejercicio. Las vistas legacy conservan el HTML, el foco y la región viva, y llaman a los modelos. Qué ejercicios tienen explorador lo decide un dato explícito (Q1). `pages/lab` no se crea: nace con F7.
- **Su prueba:** specs en rojo, que reemplazan los escenarios de dominio de `quest-explorers-check` (47) y fijan el canal, el genérico y el puntero con valores escritos a mano. Una fixture con la clasificación de los 274 ejercicios, sacada de las expresiones regulares en el commit base, y la comparación única contra ella.
- **Reversión:** los dos archivos legacy vuelven a llevar su lógica.
- **Orden:** independiente; antes de F7.

### Unidad 8 · Las reglas de CSS que cruzan hojas

- **Qué deja:** las nueve reglas que el mapa (§7) lista como cruzadas, cada una en la hoja de su dueño. El dueño es la hoja de la vista que dibuja el elemento; lo que usan dos vistas o el shell va a la base, `styles.css`.
- **Capa, slice y exports:** no es código. Las hojas son `styles.css`, `lab.css` y `campaign.css`; el orden de carga (styles, lab, atlas, campaign, quest-explorers, systems) no cambia.
- **Su prueba:** la protección de F1, en verde antes y después y sin editarse: estilo computado a 981, 850, 650 y 590 px y con movimiento reducido. Además, una comparación única: el conjunto de reglas del CSS del dist (contexto de `@media`, selector y declaraciones) es el mismo, en otro orden.
- **Reversión:** un solo revert devuelve las tres hojas.
- **Orden:** independiente; antes de F5 y F6.

| Regla | Hoy | Destino | Por qué |
| --- | --- | --- | --- |
| `.lab-nav-count` y su variante con `aria-current` | `lab.css` | `styles.css` | El contador del menú es del shell: lo lleva el HTML estático. |
| `.navigation`, `.navigation a` y `.nav-count` en 850 y 590 px (de 2 a 3 columnas) | `lab.css` | `styles.css`, después de los bloques de 590 px que hoy pisa | El menú es del shell. `styles.css` ya tiene dos bloques de 590 px y `lab.css` los pisa por orden de carga. |
| `.sidebar`, `.navigation` y `.sidebar-bottom` desde 981 px | `lab.css` | `styles.css`, después de las reglas que pisa | La barra lateral es del shell. |
| `touch-action: manipulation` sobre `button`, `a`, `input`, `select` y `summary` | `lab.css` | `styles.css` | Regla base global. |
| `.sr-only` | `lab.css` | `styles.css` | Clase base: la usan `app.js` y el laboratorio. |
| `.quest-banner` (con su `p`, su `.button` y la variante de 650 px) | `campaign.css` | `lab.css` | Lo dibuja `lab.js:mapHTML`. |
| `.quest-lab-context` (con su `a` y la variante de 650 px) | `campaign.css` | `lab.css` | Campaña y Sistemas lo insertan en el DOM del laboratorio, que lo reemplaza por selector; F5 y F6 borran sus hojas antes que F7. |
| `.navigation a:last-child` en 650 px | `campaign.css` | `styles.css` | El menú es del shell. |
| `.lab-empty` | `lab.css` | `styles.css` | La usan el laboratorio y Sistemas: es una clase base de estado vacío. |

Queda fuera de la unidad `.quest-direct-lock`: campaña lo dibuja dentro del host del laboratorio con `lockedExerciseHTML`, y F6 borra `campaign.css` antes de que F7 retire ese bloque. No está en la lista del mapa ni en la protección de F1; se informa a F6.

### Los adaptadores `window.Taller*` tras F2

Un `window.Taller*` sigue existiendo mientras una vista legacy lo lee, publica sólo los métodos que se leen y delega en los módulos de las unidades. F2 no retira ningún objeto y no publica ninguno nuevo: retira un método (`TallerLab.buildProgram`, que sólo lee `runtime-check`) y suma otro (`TallerLab.init`). El motivo es que los checks empaquetan cada archivo legacy por separado: un singleton con estado que importaran dos archivos existiría dos veces en un mismo contexto, y esa segunda instancia es la que esta feature quiere eliminar. Por eso un singleton con estado lo importa un solo archivo legacy (su dueño) y los demás lo alcanzan por el adaptador que ese dueño publica. La columna «Lo retira» sigue las líneas «Conserva» de la hoja de ruta; la spec de cada port la confirma.

| Global | Lo publica | Tras F2 | Lo leen (legacy) | Lo retira |
| --- | --- | --- | --- | --- |
| `TallerLab` | `lab.js` | `init` (nuevo), `mount`, `unmount`, `getExercises`, `exportState`, `planImport`, `applyImport`, `backups`, `reset` y `loadWarning`; sin `buildProgram` | `app.js`, `campaign.js`, `systems.js` y `register-project-kit.ts` | F2 retira `buildProgram`. F7 borra el global, salvo `mount` y `unmount` (hasta F10) y lo que `app.js` lee para el respaldo (hasta F8): la hoja de ruta no lo aclara y la spec de F7 lo decide |
| `TallerCampaign` | `campaign.js` | `init`, `refresh`, `sync`, `mount`, `unmount`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML` | `app.js` y `lab.js` | F6 retira `init`; F7, los métodos de HTML, `refresh`, `sync` y `returnURL`; F10, `mount` y `unmount` |
| `TallerSystems` | `systems.js` | `init`, `refresh`, `sync`, `mount`, `unmount`, `returnURL`, `missionIDs`, `exerciseContextHTML` y `resetSimulations` | `app.js` y `lab.js` | F5 retira `init`; F7, `refresh`, `sync`, `missionIDs`, `returnURL` y `exerciseContextHTML`; F8, `resetSimulations`; F10, `mount` y `unmount` |
| `TallerCampaignEngine` y `TallerSystemsEngine` | `register-campaign-engine.ts` y `register-systems-engine.ts` | La misma instancia que el singleton | `app.js` (el respaldo), `campaign.js` y `systems.js` (la capturan al evaluarse) y `lab.js` (`getWorlds` y `canAttempt`) | F8, cuando `app.js` deja de leerlos; el último lector de cada uno ya se portó |
| `TallerExplorers` y `TallerQuestExplorers` | `lab-explorers.js` y `quest-explorers.js` | Los mismos métodos, delegando en los modelos | `lab.js` | F7 |
| `TallerAtlas`, `TallerEffects`, `TallerEditor`, `TallerRunner` y `TallerProjectKit` | Los adaptadores de `src/app/legacy/` | Sin cambios | `app.js` y las vistas legacy | Sus ports; F2 no los toca |
| Los globals de datos (`GUIDE_DATA`, `RUST_*`, `GO_*` y `SYSTEMS_*`) | Los adaptadores de catálogos | Sin cambios: mismo contenido, forma y orden de claves | Los adaptadores de arriba y `app.js` | A2 los publica desde el contenido cargado; el port de cada vista deja de leerlos |

### Qué cambia en `dist/index.html` y por qué

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| El marcado de `frontend/src/index.html` (ids del shell, conteos del menú y diálogos) | No | F2 no lo edita. |
| El contenido del currículo | No | `build/curriculum.json` no cambia y los adaptadores de catálogos publican lo mismo (`dump-globals` y `dump-dist-globals`). |
| El script, en bytes | Sí | Cambia el grafo de módulos: aparecen los almacenes, el catálogo, la gramática de URL, el respaldo y los modelos, y sale código de `app.js`, `lab.js`, `campaign.js`, `systems.js` y los exploradores. Sigue siendo un solo `<script type="module">` en línea, sin `import()` ni `import.meta`. |
| El CSS, en orden | Sí | La unidad 8 mueve nueve reglas entre hojas. El conjunto de reglas y de declaraciones es el mismo; el estilo computado lo fija F1. |
| El tamaño | Se informa | Antes y después de cada unidad, bajo el tope de `qa/build-check` (2 500 000 caracteres; tras A1 pesa 2 202 074 bytes). F2 no suma dependencias: el plan fija el aumento aceptable tras medir la base. |

## Partición de F2: propuesta

Esta spec cubre F2 entero. La hoja de ruta ya dice que A2 espera las unidades 1 a 4, y el coordinador pidió entregarlas primero y por separado. Esta sección propone convertir ese orden de entrega en un corte de la spec, como hicieron C3 y D1, y no lo aplica: cada requisito está agrupado por la parte a la que iría, así que cortarla es mover rangos y no reescribirlos. El conteo es de esta spec: una obligación comprobable por requisito.

| Medida | F2 entero | F2a: unidades 1 a 4 | F2b: unidades 5 a 8 |
| --- | --- | --- | --- |
| Requisitos | 60 | 42 (FR-001 a FR-042) | 37 (FR-001 a FR-019 y FR-043 a FR-060) |
| Qué deja | Los seams de los cuatro almacenes, el catálogo, el arranque, los modelos, los puentes, el respaldo, los exploradores y el CSS | Estado y arranque: almacenes y motores, catálogo, arranque explícito, registro de modelos | Contratos entre vistas: URL y puentes, respaldo, modelos de exploradores y CSS |
| Slices que toca | `guide`, `exercise`, `campaign`, `systems-workshop`, `systems-simulation`, `shared/config` y `features/progress-backup` | `guide`, `exercise`, `campaign`, `systems-workshop` y `systems-simulation` | `exercise`, `campaign`, `systems-workshop`, `shared/config` y `features/progress-backup`, más tres hojas de CSS |
| Archivos legacy que toca | `app.js`, `lab.js`, `campaign.js`, `systems.js`, los dos exploradores, `main.tsx` y `ConceptDetail.tsx` | `app.js`, `lab.js`, `systems.js` (el registro) y `main.tsx` | `app.js`, `lab.js`, `campaign.js`, `systems.js`, los dos exploradores y `ConceptDetail.tsx` |
| Checks de `qa/` que adapta | Nueve | Siete: `load-order`, `boot`, `app-shell`, `lab-state`, `systems`, `project-kit` y `runtime` | Tres: `lab-bridge`, `quest-explorers` y el dominio del respaldo de `app-shell` |
| Depende de | F1 | F1 | F1 y F2a (sobre todo las unidades 1 y 2) |
| Lo esperan | A2, F3 a F10 y D1c | A2 (unidades 1 a 4); F3, F4 y F9 (sólo la 1) | F5, F6, F7 y F8, y D1c (unidad 6) |

Referencia: C3a tuvo 52 requisitos, la mayor spec del épico hasta ahora; D1 midió 88 y propuso partirse; C2 tuvo 48 y B2, 49.

**Recomendación: partir en dos, con este corte.**

1. **Caminos críticos distintos.** A2 espera las unidades 1 a 4; detrás de A2 espera A3 y, detrás de A3, A4, C4 y D1c. F3, F4 y F9 sólo necesitan el almacén del recorrido (unidad 1). Sólo F5 a F8 necesitan las unidades 5 a 8. En una sola spec, A2 esperaría el plan, las tareas y el análisis de 60 requisitos, y F3 y F4 esperarían el CSS y los exploradores que no usan.
2. **Un foco de revisión por parte.** F2a: que el progreso no se pierda ni se duplique y que el orden de evaluación se conserve. F2b: que ningún enlace, ningún aviso y ninguna regla de estilo cambien.
3. **El riesgo de A2 queda aparte.** Si el spike de A2 falla, el usuario decide con F2a ya entregada; lo que cambie ahí no arrastra a F2b.
4. **Tamaño, con una salvedad.** Quedan 42 y 37 requisitos contra 60 y contra los 52 de C3a. Por sí solo, el tamaño no justificaría partir; el camino crítico, sí.

**Lo que cuesta partir:** dos ciclos de Spec Kit (plan, tareas y análisis por parte); las 19 reglas de toda unidad se repiten en cada parte; `app.js`, `lab.js`, `main.tsx` y `qa/lib/legacy-sources.ts` los tocan las dos partes y A2, y se integran de a uno; F2b compite con F3 y F4 por `app.js`, y F5 no puede empezar antes que F2b; D1c espera a las dos partes (unidades 1 y 6), lo que no está en el camino crítico porque va en la ola 4. En la hoja de ruta, que integra el coordinador: sumar F2a y F2b, como ya hizo con F7a y F7b; A2, F3, F4 y F9 dependen de F2a, y F5 a F8, de F2a y F2b.

**Alternativas:** *no partir*, con 60 requisitos en un plan: A2 espera «las unidades 1 a 4» como ya dice la hoja de ruta, pero F3 esperaría F2 entero, salvo que su dependencia también se escriba por unidad. *Partir en tres* (unidades 1 y 2, 3 y 4, 5 a 8): suma un ciclo y la unidad 3 no se puede probar sin la 1, la 2 y la 4.

## Preguntas abiertas para el clarify

Son cuatro, cada una con sus opciones y una recomendada. Se cierran en `/speckit-clarify` y la respuesta pasa a una sección Clarifications. Cada pregunta deja un marcador de aclaración en el requisito que afecta (FR-055, FR-030, FR-023 y FR-052), y esos cuatro son los únicos; el límite de tres de la plantilla se amplió a cinco por pedido del coordinador, y queda uno de margen. La partición no es una pregunta: está en su sección, con su recomendación, y el usuario la acepta o la cambia al responder. Hasta entonces, los requisitos que señalan una pregunta usan la opción recomendada como borrador.

### Q1. Cómo se decide qué explorador tiene cada ejercicio

**Contexto:** `lab-explorers.js:kind` elige entre canal, genérico y puntero con tres expresiones regulares sobre el tema, el título y `visual` de cada ejercicio, y `quest-explorers.js:descriptor` elige robot o paquete con una expresión regular sobre el id (`rust|go-101` a `106`). F2 saca esa decisión de la vista para que el modelo sea una función pura (unidad 7), y la hoja de ruta dejó abierto si el dato vive en `content/` o en el front. Medido sobre el `build/curriculum.json` de la copia principal (generado el 2026-10-04, que se vuelve a medir al implementar), las expresiones de `kind` dan explorador a 61 de los 274 ejercicios: 21 de canal, 20 genéricos y 20 de puntero. Son 12 temas completos de 5 ejercicios más `go-112`, el único de su tema (`go-resilience-quests`, de 3) que entra. Seis de los 61 (`go-61` a `go-65` y `go-112`) entran por `visual: concurrency` y no por el texto del tema: un mapa por tema no reproduce la clasificación, hace falta una entrada por id. La regla de `descriptor` alcanza a 12 ejercicios. (FR-055)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Un mapa explícito por id en el front, en `entities/exercise`, con las 61 entradas de `kind` y los 12 ids de robot y paquete, y una fixture congelada con la clasificación de hoy (sacada de las expresiones regulares en el commit base). `content/` no cambia. | Cumple el criterio de bytes de F2: `curriculum.json` y `dump-globals` no cambian. Un ejercicio nuevo (E1) no tiene explorador hasta que alguien lo agregue al mapa, en lugar de heredar uno por una palabra de su título. Costo: el mapa duplica un dato que pertenece al contenido; pasarlo a `content/` queda para un ítem aparte. |
| B | Un campo de explorador en `content/` y en `curriculum.json`, en un commit aparte y con el oráculo. | El dato queda en la fuente de verdad y lo publica la API. Costo: cambia los bytes publicados, `dump-globals`, las huellas de las porciones y la versión del contenido de C2, y los validadores de C2 y C6; se coordina con el backend. Rompe el criterio de bytes de F2, así que sería un ítem propio, como ya lo deja la hoja de ruta. |
| C | Conservar las expresiones regulares como una función pura (`kind` y `descriptor` tal cual). | El cambio más chico, y la clasificación de hoy queda idéntica por construcción. Costo: sigue acoplada al texto en español de los títulos y a `visual` (un cambio de título cambia el explorador sin que falle nada), y F7 la hereda. |
| Otra | Decir cuál. | |

### Q2. Cómo se invierten las dos pruebas de riesgo de F1

**Contexto:** F1 las deja en verde caracterizando el defecto (su Q5, opción A) y F2 las invierte en el commit TDD de su unidad, pero «invertir» no es obvio. La prueba 1 abre dos instancias crudas de `openVersionedStore` sobre el mismo almacenamiento y ve reaparecer el favorito: es la regla de dos pestañas del ADR 0003 (decisión 9), que sigue siendo cierta para quien llame a esa biblioteca. Lo que F2 puede cambiar es que el código de producción no pueda abrir la segunda instancia en el mismo documento. La prueba 2 dice que el motor de campaña sin `init` lanza y el de Sistemas devuelve `[]` sin error: hay que elegir a cuál de los dos se alinea el otro. (FR-030, FR-029 y FR-040)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Un guard automático (una regla de lint por ruta o un check de `qa/`) impide abrir las cuatro claves fuera de los singletons, y la prueba 1 se reemplaza por la del singleton: dos consumidores comparten el estado y lo quitado no reaparece. La regla de dos pestañas queda documentada en `versioned-storage-check`. El motor de Sistemas, sin `init`, lanza como el de campaña, y una prueba del arranque fija que `init` va antes de la primera vista. | Costo: una regla de lint (la configuración la integra el agente principal) y un cambio de comportamiento en `entities/systems-workshop` que sólo se nota si algo lo usa antes de `init`, cosa que hoy nada hace. Es coherente con «no ocultes fallos con defaults que simulen éxito» de `docs/architecture.md`. |
| B | La biblioteca rechaza la segunda apertura de la misma clave en un documento (`openVersionedStore` lanza) y la prueba 1 pasa a afirmar ese rechazo. El motor, como en A. | Es un guard de ejecución, que un import no esquiva. Costo: toca `shared/lib/versioned-storage.ts` (ADR 0003), y `versioned-storage-check` y `lab-state-check` tendrían que simular «otra pestaña» sin abrir una segunda instancia: hace falta una forma de distinguir pestañas en los checks. |
| C | Sin guard: el singleton y su prueba de comportamiento, nada más. El motor de Sistemas conserva `[]` y se suma sólo la prueba del orden del arranque. | Lo mínimo. Costo: nada impide que un port abra una segunda instancia, así que el riesgo alto del mapa queda abierto, y el defecto silencioso de Sistemas sigue. |
| Otra | Decir cuál. | |

### Q3. Con qué se construye la suscripción de los almacenes

**Contexto:** la hoja de ruta pide almacenes «con suscripción» y D1c (borrador) se monta sobre la de los cuatro. `AGENTS.md` pide Zustand para el estado de cliente complejo o compartido entre funcionalidades, y sólo con el primer caso real: éste podría ser ese caso. Cada almacén ya persiste, fusiona entre pestañas y respalda (ADR 0003). Lo que falta es leer el estado y enterarse de los cambios, que es lo que `useSyncExternalStore` de React 19 consume sin dependencias. (FR-023)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Una suscripción propia y mínima (estado actual, y alta y baja de oyentes) sobre el almacén versionado que ya persiste y fusiona. Si hace falta, Zustand entra en F10 con su spike. | Sin dependencia nueva ni peso. El estado conserva su semántica: la fusión en el lugar del laboratorio y el reemplazo del recorrido. Costo: unas decenas de líneas y sus specs, y una desviación de la regla de `AGENTS.md` que esta spec declara; si F10 adopta Zustand, los singletons se envuelven sin cambiar su API. |
| B | Zustand ahora: un store por clave, con acciones y selectores, que delega la persistencia en el almacén versionado. | Cumple la regla al pie de la letra y da selectores. Costo: una dependencia nueva (permiso del usuario y peso medido antes contra el tope de `build-check`), un segundo contenedor sobre el mismo texto guardado (dos fuentes de verdad que sincronizar), y el estado inmutable de Zustand choca con la mutación en el lugar del laboratorio (ADR 0003, decisión 9). La hoja de ruta ubica el permiso de Zustand en F10, no en F2. |
| C | Sin suscripción en F2: los singletons sólo exponen el estado, y la suma el primer port que la necesite (F3). | Lo mínimo (YAGNI estricto). Costo: F3 y D1c dependen de una API que F2 no fijó, y la hoja de ruta dice «con suscripción». |
| Otra | Decir cuál. | |

### Q4. Si la interfaz de `features/progress-backup` nace asíncrona

**Contexto:** hoy importar y «Borrar todo» son síncronos y locales. Con D1 (borrador), importar pasa a ser `POST /api/progress/import`, con una pregunta de confirmación, y «Borrar todo» pasa a pedir la contraseña. El coordinador pidió que F2 deje la interfaz de modo que D1c la reemplace sin reescribir las vistas. Hacerla asíncrona anticipa un consumidor cuya spec todavía es un borrador, y la constitución pide no sumar nada por anticipado. (FR-052)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Importar (aplicar) y «Borrar todo» devuelven una promesa desde F2, y «Borrar todo» acepta una confirmación que localmente se ignora. Exportar y listar respaldos son síncronos y locales. | D1c cambia la implementación (el POST de importación, el reinicio con contraseña) sin tocar a quien llama. Costo: dos funciones asíncronas hoy sin necesidad, un estado «pendiente» en el shell que nunca se ve en local, y una interfaz que anticipa un consumidor en borrador (si D1 cambia, se ajusta). |
| B | Todo síncrono ahora; D1c cambia la interfaz cuando llegue. | Nada anticipado. Costo: F8 (Método) ya habrá portado la página contra la interfaz síncrona, así que D1c reescribe esos manejadores: justo lo que el coordinador pidió evitar. |
| C | La feature expone sólo las piezas puras (el plan, el formato y los avisos) y cada llamador aplica y borra. | La interfaz más chica. Costo: la orquestación (las dos fases, el orden de las áreas, «sólo `false` cuenta») vuelve a repartirse entre los llamadores, y la regla que fijó el ADR 0003 queda sin dueño. |
| Otra | Decir cuál. | |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno no nota ningún cambio (Priority: P1)

Un alumno con progreso guardado abre el taller después de cada unidad y encuentra lo mismo: las mismas vistas, los mismos textos, los mismos enlaces y todo su avance. Quien revisa cada PR lo comprueba sin abrir un navegador a mano.

**Why this priority**: es el criterio de F2 y la condición para portar: si una unidad cambia algo visible, deja de ser un seam y pasa a ser un port.

**Independent Test**: construir el build de la unidad, correr la red de F1, comparar los tres oráculos contra la línea base y arrancar con las tres fixtures de progreso.

**Acceptance Scenarios**:

1. **Dado** el build de una unidad servido, **cuando** corre la red de F1, **entonces** pasa completa y sin editarse (salvo las dos specs de riesgo, en la unidad que las invierte).
2. **Dadas** la línea base y el build de la unidad, **cuando** se corren `dump-globals` y `dump-dist-globals` y se compara `build/curriculum.json`, **entonces** los bytes son los mismos.
3. **Dadas** las tres fixtures de progreso, **cuando** arranca el taller, **entonces** no escribe, no respalda ni avisa; y las dos exportaciones se importan sin omisiones.
4. **Dado** el `dist/index.html` de la unidad, **cuando** se inspecciona, **entonces** es un solo documento con un script y un estilo en línea, bajo el tope de `qa/build-check`, con su tamaño informado.

*Cubre: FR-002 a FR-009; SC-001 a SC-003 y SC-011.*

---

### User Story 2 - Quien porta importa lo compartido en lugar de abrir una copia (Priority: P1)

Quien porta una vista necesita el estado del recorrido, el del laboratorio, el de campaña o el de Sistemas, y el catálogo de ejercicios. Los importa, se suscribe a los cambios y no abre una segunda copia ni lee `window`.

**Why this priority**: son los dos hallazgos de severidad alta del mapa (§12): una página React que abre su propia instancia hace reaparecer un favorito que el alumno quitó, y un estado leído antes de abrirse deja a campaña lanzando y a Sistemas vacío.

**Independent Test**: correr las specs de los almacenes, de los motores y del catálogo con las fixtures y un almacenamiento en memoria, y el guard contra un módulo que abra una clave por su cuenta.

**Acceptance Scenarios**:

1. **Dado** el almacén del recorrido, **cuando** dos consumidores lo usan, uno quita un favorito y el otro guarda otro cambio, **entonces** el favorito no reaparece.
2. **Dado** un documento donde una clave ya tiene su singleton, **cuando** un módulo de producción intenta abrirla por su cuenta, **entonces** el guard falla (con la forma que fije Q2).
3. **Dado** el almacén del laboratorio, **cuando** un manejador guarda una referencia a un registro y se escribe, **entonces** el registro sigue siendo el mismo objeto.
4. **Dado** el catálogo inicializado con los ocho grupos, **cuando** se lee, **entonces** `exercises` tiene los 274 ids únicos en el orden de hoy, `byId` encuentra cada uno y `buildProgram` da el programa de hoy para los 274.
5. **Dado** cualquiera de ellos sin abrir, **cuando** se usa, **entonces** falla con un mensaje claro en español.

*Cubre: FR-020 a FR-034; SC-004, SC-006 y SC-008.*

---

### User Story 3 - El arranque es una función que se llama en orden (Priority: P1)

Quien mantiene el front, y A2 en particular, puede evaluar los módulos sin que nada arranque y llamar `startApp()` cuando el contenido esté. El orden en que se abren y se inicializan los almacenes queda escrito en código y probado.

**Why this priority**: A2 pone una compuerta de contenido antes de las vistas y espera esta función (F2-I1); y un `init` movido a un effect de React rompe campaña y Sistemas sin que nada lo avise.

**Independent Test**: evaluar cada fuente legacy sola, en un contexto sin catálogos ni adaptadores y con un almacenamiento que lanza ante cualquier acceso; empaquetar `main.tsx` como lo hace `boot-check` y evaluarlo sin la llamada final; y después llamar `startApp()`.

**Acceptance Scenarios**:

1. **Dada** cada fuente legacy y el bundle de `main.tsx` sin su llamada final, **cuando** se evalúan con un almacenamiento que lanza ante cualquier acceso (las fuentes, solas y en un contexto sin catálogos ni adaptadores), **entonces** no fallan y no lo tocan.
2. **Dada** la llamada a `startApp()`, **cuando** corre, **entonces** inicializa el laboratorio y el catálogo, abre el recorrido, inicializa campaña y Sistemas, arma los avisos y dibuja la primera vista, en ese orden.
3. **Dada** `startApp()` ya llamada, **cuando** se llama otra vez, **entonces** falla y no duplica oyentes, intervalo ni almacenes.
4. **Dado** un motor sin `init`, **cuando** se usa, **entonces** el de campaña y el de Sistemas fallan igual.
5. **Dado** `load-order-check`, **cuando** lee el `main.tsx` nuevo, **entonces** conserva las 16 restricciones y las dos reglas de los extremos.

*Cubre: FR-035 a FR-040; SC-005 y SC-006.*

---

### User Story 4 - Los puentes, las URL y los modelos de Sistemas son datos que se importan (Priority: P2)

Quien porta campaña, Sistemas o el laboratorio importa la gramática de URL, los datos de contexto, permiso, regreso y lista de misiones, y el registro de modelos, y no los reconstruye leyendo el HTML ni `location` de otra vista.

**Why this priority**: rompe el ciclo vista a vista del mapa (§3.2 y §10) y deja a cada port tocar sólo lo suyo. Es P2 porque no bloquea a A2.

**Independent Test**: correr las specs de la gramática y de los datos con los ids congelados y comparar el HTML de los adaptadores contra el de hoy.

**Acceptance Scenarios**:

1. **Dada** cada una de las seis formas de URL, **cuando** se lee y se arma, **entonces** la cadena es la de hoy, con su orden de parámetros.
2. **Dados** una misión de campaña y un taller de Sistemas, **cuando** se piden su contexto, su permiso, su regreso y su lista, **entonces** son datos sin HTML ni `location`, y los adaptadores arman con ellos el mismo marcado.
3. **Dados** los cuatro grupos de modelos de Sistemas, **cuando** se juntan, **entonces** el registro tiene los modelos que referencian los 25 talleres, y un nombre repetido lanza el error de hoy.

*Cubre: FR-041 a FR-047; SC-008 y SC-009.*

---

### User Story 5 - D1c reemplaza importar y borrar sin tocar a quien llama (Priority: P2)

Quien implemente el cliente de D1 cambia cómo se importa y cómo se borra todo (un POST y una contraseña) sin reescribir las vistas que hoy los usan.

**Why this priority**: D1 (borrador) reemplaza esta feature y F8 va a portar la página de Método contra ella. Es P2 porque D1c es posterior.

**Independent Test**: correr las specs de la feature con áreas falsas, con las dos exportaciones congeladas y con un doble asíncrono.

**Acceptance Scenarios**:

1. **Dada** una exportación de master, **cuando** se planifica y se aplica, **entonces** los avisos y el estado resultante son los de hoy.
2. **Dada** una sección inválida, **cuando** se planifica, **entonces** no se aplica nada.
3. **Dado** «Borrar todo» y una clave que no se pudo borrar, **cuando** termina, **entonces** el aviso es el de hoy.
4. **Dado** un doble asíncrono de las áreas, **cuando** el flujo de importar o de borrar corre, **entonces** termina igual sin cambiar el código que llama.

*Cubre: FR-048 a FR-053; SC-010.*

---

### User Story 6 - Un explorador es un modelo puro y su selección es explícita (Priority: P2)

Quien porta el laboratorio recibe los exploradores como funciones sin DOM, con la lista de qué ejercicios tienen cuál escrita como dato.

**Why this priority**: los exploradores migran con el laboratorio (F7) y hoy su lógica está mezclada con el HTML y con una expresión regular sobre el texto de los títulos. Es P2 porque F7 es de los últimos ports.

**Independent Test**: correr las specs de los modelos y comparar la clasificación de los 274 ejercicios con la fixture.

**Acceptance Scenarios**:

1. **Dados** los 274 ejercicios, **cuando** se decide su explorador, **entonces** la clasificación es la de hoy: 61 con canal, genérico o puntero y los 12 de robot y paquete.
2. **Dados** el robot, el paquete, el canal, el genérico y el puntero, **cuando** se aplican las operaciones del contrato, **entonces** el estado resultante es el escrito a mano, sin DOM.

*Cubre: FR-054 a FR-057; SC-008.*

---

### User Story 7 - El aspecto que pasa de una hoja a otra queda igual (Priority: P2)

Quien porta campaña o Sistemas puede borrar su hoja de estilo sin cambiar el menú, la barra lateral ni los bloques de contexto del laboratorio.

**Why this priority**: es el único riesgo de F2 que ninguna prueba funcional detecta (mapa, §7 y §12). Es P2 porque su protección es la de F1.

**Independent Test**: correr la protección de estilo computado de F1 antes y después, y comparar el conjunto de reglas del CSS del dist.

**Acceptance Scenarios**:

1. **Dadas** las nueve reglas, **cuando** se revisa cada hoja, **entonces** cada regla está en la hoja de su dueño.
2. **Dada** la protección de F1 a 981, 850, 650 y 590 px y con movimiento reducido, **cuando** corre, **entonces** pasa sin editarse.
3. **Dado** el CSS del dist, **cuando** se compara con el de antes, **entonces** tiene el mismo conjunto de reglas y de declaraciones.

*Cubre: FR-058 a FR-060 y FR-008; SC-007.*

---

### Edge Cases

- **Almacenamiento bloqueado:** cada almacén se abre igual con `status: unavailable`, no escribe, y el taller muestra el aviso de hoy («No se pudo leer o guardar el avance. Podés exportarlo al terminar.») y el pie «Exportá para conservar tu avance».
- **Datos guardados con ids que el catálogo no tiene:** el almacén los descarta, respalda y avisa como hoy; por eso se abre con el catálogo ya inicializado.
- **Otra pestaña guarda entre dos escrituras:** la fusión es la de hoy. El recorrido reemplaza su estado; el laboratorio lo muta en el lugar.
- **`startApp` llamada dos veces:** falla en lugar de duplicar oyentes, el intervalo del temporizador o los almacenes.
- **Evaluar los módulos sin llamar `startApp`:** no pasa nada. Es lo que A2 necesita para diferir la cadena.
- **Un motor usado antes de `init`:** falla con un mensaje claro, igual en campaña y en Sistemas.
- **«Borrar todo» con una clave que no se pudo borrar:** el aviso de hoy («No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.»).
- **Importar un archivo con una sección inválida o con un almacén que no escribe:** nada se aplica, o el aviso nombra las áreas sin guardar, como hoy.
- **Un `solvedAt` importado sin evidencia:** se conserva el comportamiento actual; lo decide F7.
- **Un ejercicio nuevo (E1) sin entrada en el mapa de exploradores:** no tiene explorador, con la opción A de Q1.
- **Un hash o una query desconocidos, como `#invitacion=<token>`:** el contrato de URL no cambia; es de F11.

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de toda unidad** *(las repite cada parte si se parte F2)*

- **FR-001**: Cada unidad DEBE entregarse como una unidad de trabajo revertible: su spec primero, en rojo y por la razón esperada; después la implementación mínima; y en el mismo cambio su documentación (`docs/architecture.md` y, si cambia el arnés, `qa/AGENTS.md`) y su verificación. El valor esperado de cada spec sale del contrato, de las fixtures congeladas o de un ejemplo resuelto aparte, nunca del módulo que se prueba. Revertirla, junto con las unidades que dependen de ella y en orden inverso, devuelve el estado anterior con la red de F1 en verde. El plan decide cuántos PR hay: uno por unidad, salvo que dos dependan tanto una de otra que ninguna pase sola. *(Hoja de ruta, F2; constitución, principio II)*
- **FR-002**: La red de F1 DEBE pasar antes de empezar cada unidad y después de terminarla, contra el build de esa unidad y sin editar ninguno de sus escenarios. Si una unidad obliga a editar uno, es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. Las únicas excepciones previstas son las dos specs de Vitest de riesgo de F1 (FR-030 y FR-040). *(Hoja de ruta, criterio de F2)*
- **FR-003**: Después de cada unidad, `build/curriculum.json`, el volcado de `npm run curriculum && node tools/content/dump-globals.ts .` y el de `node tools/content/dump-dist-globals.ts dist/index.html` DEBEN tener los mismos bytes que antes. *(Hoja de ruta, criterio de F2; `qa/AGENTS.md`; A2, F2-I5)*
- **FR-004**: La línea base de FR-003 DEBE tomarse sobre el commit base de la rama de implementación, antes del primer cambio de código, y registrarse con el hash de cada salida, para que no salga del código que se prueba. Los cinco adaptadores de catálogos (`register-catalogs.ts` y los cuatro `register-systems-*.ts`) y `pages/atlas/model/atlas-catalog.ts` DEBEN conservar su ruta, porque el oráculo los carga por ruta fija también sobre la raíz de un commit anterior.
- **FR-005**: El progreso guardado DEBE quedar intacto (ADR 0003): las cuatro claves, el campo `version: 1`, las ranuras de respaldo (`<clave>:respaldo` y `:respaldo-2` a `:respaldo-5`) y la forma de la exportación (el recorrido en la raíz, más `lab`, `campaign`, `systems` y `exportedAt`) no cambian. Con las tres fixtures congeladas de `qa/fixtures/progress-*.json`, el arranque no escribe, no respalda ni avisa, antes y después de cada unidad.
- **FR-006**: Las dos exportaciones congeladas DEBEN importarse sin omisiones, y lo que escriba el código nuevo DEBE volver a cargarse sin pérdida, antes y después de cada unidad. Las fixtures no se editan ni se regeneran.
- **FR-007**: El alumno NO DEBE ver nada distinto: los textos, las clases, los atributos y los ids del DOM de las vistas y de `frontend/src/index.html` no cambian, y los avisos y los toasts conservan su texto, su orden y su condición.
- **FR-008**: F2 NO DEBE sumar ningún estilo en línea (`style=`, `setAttribute('style', …)` ni asignación a `style.cssText`) ni mover o quitar los seis sitios que C4 cuenta. *(C4, borrador)*
- **FR-009**: `dist/index.html` DEBE seguir construyéndose como un solo documento, con un `<script type="module">` y un `<style>` en línea, sin `import()` dinámicos ni `import.meta`, y bajo el tope de `qa/build-check` (menos de 2 500 000 caracteres). Su tamaño se informa antes y después de cada unidad.
- **FR-010**: F2 NO DEBE agregar ninguna dependencia a `package.json`, salvo la que elija el usuario en Q3, con su permiso y con su peso medido antes.
- **FR-011**: Para toda lógica pura que se mueve de un archivo legacy a un módulo, el PR de la unidad DEBE informar una comparación única entre el commit base y el de la unidad, con sus cantidades (por ejemplo, el programa de prueba de cada uno de los 274 ejercicios, la lectura de las tres fixtures, las URL de las seis formas y la clasificación de explorador de los 274). No queda como check permanente: las specs permanentes son las de cada unidad. *(Precedente: P8 de `docs/refactor-roadmap.md`)*
- **FR-012**: Las specs nuevas DEBEN ser de Vitest, en el proyecto `node` de `npm test` (`*.spec.ts` junto al módulo, con nombres y código en inglés), sobre la configuración que deja F1. F2 NO DEBE agregar jsdom ni Testing Library, que llegan con F3. *(ADR 0008)*
- **FR-013**: Cada check de `qa/` que F2 modifique (`load-order-check`, `boot-check`, `app-shell-check`, `lab-bridge-check`, `lab-state-check`, `quest-explorers-check`, `systems-check`, `project-kit-check` y `runtime-check`) DEBE cambiar sólo cómo carga el código, no sus valores esperados. El PR de cada unidad DEBE listar la correspondencia de cada escenario de esos checks (cubierto por una spec o por un E2E, o descartado con su motivo escrito), y ningún check se retira por adelantado. *(ADR 0008, §5)*
- **FR-014**: Los módulos nuevos DEBEN respetar Feature-Sliced Design (`docs/architecture.md`): cada uno vive en la capa y el slice de «Las ocho unidades», expone una API pública pequeña, importa sólo de capas inferiores, no atraviesa los internals de otro slice (entre entidades, sólo por `@x`) y no suma barrels, capas ni carpetas por anticipado.
- **FR-015**: Nada por debajo de `app` DEBE importar el acceso al contenido que construye A2 (`getContent()`): lo que una entidad, una feature o `shared` necesita del contenido le llega por parámetro, desde una función que `app` llama después de la compuerta, o por los globals que publican los adaptadores de catálogos. *(A2, F2-I6; vale también para las specs de F3 a F9)*
- **FR-016**: Mover NO DEBE reescribir: el código movido conserva su comportamiento y no suma funciones de complejidad ciclomática mayor que 10 sin justificarlo en la revisión. Los avisos de complejidad de las funciones que se mueven se informan antes y después.
- **FR-017**: Un `window.Taller*` DEBE seguir existiendo sólo mientras una vista legacy lo lee, con sólo los métodos que se leen y delegando en los módulos de las unidades. Los `register-*` siguen siendo módulos con efectos que publican `window.*` (A2, F2-I4). F2 NO DEBE publicar ningún global nuevo: retira `TallerLab.buildProgram` y suma `TallerLab.init`. La tabla de «Los adaptadores `window.Taller*` tras F2» fija el resto.
- **FR-018**: En los checks, un singleton con estado NO DEBE existir dos veces en un mismo contexto. Como cada archivo legacy se empaqueta por separado, un singleton con estado lo importa un solo archivo legacy (su dueño) y los demás lo alcanzan por el adaptador que ese dueño publica; los módulos sin estado (la gramática de URL, los datos de los puentes, el respaldo y los modelos) los puede importar cualquiera. Si el plan prefiere que el arnés empaquete las fuentes juntas, lo propone con su costo.
- **FR-019**: Las unidades 1 a 4 DEBEN entregarse primero y en cambios separados de los de las unidades 5 a 8: ninguna de la 5 a la 8 va en el mismo PR ni demora su integración. *(Coordinador, 2026-10-05; A2)*

**Unidades 1 a 4** *(parte a)*

- **FR-020**: Cada clave de progreso DEBE tener un único almacén por documento, importable como singleton: el recorrido en `entities/guide` y el laboratorio en `entities/exercise`; y cada tipo de motor, uno solo: campaña en `entities/campaign` y Sistemas en `entities/systems-workshop`. Las fábricas siguen exportadas para las specs. `window.TallerCampaignEngine` y `window.TallerSystemsEngine` publican esas mismas instancias.
- **FR-021**: Importar un almacén, un motor o el catálogo NO DEBE abrir una clave, leer `localStorage` ni leer contenido. Cada uno se abre una sola vez, en el arranque explícito, con el contenido que necesita para leer lo guardado, que recibe por parámetro. La instancia, vacía y sin efectos, se crea cuando la cadena legacy importa su módulo (un adaptador `register-*`, `app.js` o `lab.js`) o al llamar al arranque, y ningún módulo que A2 deja en el grafo estático la crea ni la abre. *(A2, F2-I3)*
- **FR-022**: Usar un almacén, un motor o el catálogo antes de abrirlo, o abrirlo por segunda vez, DEBE fallar con un mensaje claro en español, igual en los cuatro.
- **FR-023**: Los cuatro DEBEN exponer su estado actual y una suscripción con baja, que avisa después de cada escritura, importación, borrado y fusión con lo que guardó otra pestaña, y no al cargar. **[NEEDS CLARIFICATION: Q3, con qué se construye la suscripción: propia, Zustand o ninguna]**
- **FR-024**: La suscripción NO DEBE cambiar la semántica del ADR 0003: la carga no escribe; se persiste sólo por acciones del alumno; se fusiona sólo si otra pestaña cambió la clave; se respalda antes de perder datos; y `writable` se conserva.
- **FR-025**: El almacén del laboratorio DEBE conservar la identidad del estado y la de sus registros a través de cada escritura (fusión en el lugar, ADR 0003, decisión 9), porque los manejadores guardan una referencia a un registro antes de guardar y siguen escribiéndolo después.
- **FR-026**: Un solo dueño del estado: `app.js` y `lab.js` DEBEN leer y escribir el estado del recorrido y del laboratorio por sus singletons y NO DEBEN conservar una copia propia que pueda divergir. La escritura sigue siendo en cada tecla del editor, de las notas y de la reflexión, sin debounce.
- **FR-027**: El recorrido DEBE pasar a `entities/guide` con su lectura (`parseProgress`), su estado por omisión y su fusión entre pestañas, y los 10 ids de hitos persistidos (`rust-memory` a `go-network`) DEBEN vivir en ese slice, fijados por una spec con valores escritos a mano. Los textos de los hitos y `renderProject` quedan en `app.js` hasta F4, que hereda esa spec.
- **FR-028**: La lectura, el estado por omisión, la fusión, el plan y la aplicación de la importación del laboratorio (hoy `blank`, `sanitize*`, `parseSaved`, `absorbStored`, `planImport` y `applyImport` de `lab.js`) DEBEN pasar a `entities/exercise` y leer los ids válidos del catálogo de la unidad 2, no de un `byId` propio.
- **FR-029**: Un guard automático DEBE impedir que un módulo de producción distinto de los cuatro singletons abra una de las claves de progreso; su mecanismo depende de Q2.
- **FR-030**: La prueba de riesgo 1 de F1 (dos instancias del almacén del recorrido: el favorito quitado reaparece) DEBE invertirse en el commit TDD de la unidad 1, con la forma que fije Q2. **[NEEDS CLARIFICATION: Q2, cómo se invierten las dos pruebas de riesgo y cómo se impide la segunda instancia]**
- **FR-031**: Cada almacén y cada motor DEBE tener su spec, en rojo antes de la implementación: con `qa/fixtures/progress-master-2a278ad-storage.json`, abrirlo da `loaded` sin escribir, sin respaldar y sin aviso; la suscripción avisa y no al cargar; abrir dos veces o usar sin abrir falla; el laboratorio conserva la identidad; e importar el módulo con un `localStorage` que lanza ante cualquier acceso no lo toca.
- **FR-032**: El catálogo de los 274 ejercicios (`exercises` y `byId`) DEBE ser un módulo de `entities/exercise` que el arranque inicializa con las listas de ejercicios en el orden de hoy (`RUST_LAB`, `RUST_QUESTS`, `GO_LAB`, `GO_QUESTS` y los cuatro `SYSTEMS_*_LABS`), con una fábrica pura para las specs y los checks. NO DEBE importar `build/curriculum.json` ni otro contenido en estático, ni leer `window`: lo inicializa el adaptador del laboratorio con lo que publican los adaptadores de catálogos. *(A2, F2-I2)*
- **FR-033**: `buildProgram` DEBE vivir en `entities/exercise`, junto a `interpretRun`, y devolver para cada uno de los 274 ejercicios el mismo programa que hoy, con y sin caso propio. `TallerLab.buildProgram` se retira de la API global y `runtime-check` lo importa del módulo.
- **FR-034**: El catálogo y `buildProgram` DEBEN tener su spec, en rojo antes de la implementación: el orden de los ocho grupos, 274 ids únicos, `byId` de un id de cada grupo, el fallo de usar el catálogo antes de inicializarlo y dos programas de prueba resueltos a mano (uno de Rust y uno de Go, con y sin caso propio).
- **FR-035**: Evaluar `app.js`, `lab.js` o cualquier módulo de la cadena NO DEBE arrancar la app: ni abrir almacenes ni inicializar motores, ni calcular el aviso de carga, ni leer el almacenamiento o la URL, ni registrar oyentes o el `setInterval`, ni dibujar. `app.js` DEBE exportar una función `startApp()` y `frontend/src/app/main.tsx` DEBE llamarla una sola vez, después de todos los imports; `window.TallerLab` suma `init`. `startApp` vive en `frontend/app.js`, así que no pisa los nombres de `app/boot/` de A2. Publicar los `window.*` de los adaptadores sí sigue ocurriendo al evaluarse (FR-017). *(A2, F2-I1)*
- **FR-036**: `startApp` DEBE ejecutar, en orden: `TallerLab.init` (el catálogo y el almacén del laboratorio) antes que campaña y Sistemas; la apertura del almacén del recorrido; `TallerCampaign.init` y `TallerSystems.init`; los avisos de carga en el orden de hoy (recorrido, campaña, Sistemas y laboratorio); el idioma que manda la URL; y, al final, los oyentes, el temporizador, el primer render y el aviso. El plan fija el orden exacto; se conserva el de hoy donde importa.
- **FR-037**: Una segunda llamada a `startApp` DEBE fallar con un mensaje claro y NO DEBE duplicar oyentes, el intervalo del temporizador ni los almacenes.
- **FR-038**: `qa/load-order-check.ts` DEBE leer el `main.tsx` nuevo (los imports con y sin nombre y la llamada a `startApp`) y conservar las 16 restricciones de orden de hoy y las reglas «`app.js` último» y «`styles.css` primera hoja», sin relajar ninguna; suma que `startApp` se llama después del último import. Cada cambio de la lista y de la tabla se hace sobre la forma vigente de `main.tsx`. *(A2, F2-I4)*
- **FR-039**: Los checks que arrancan la app (`boot-check` y `app-shell-check`) DEBEN llamar `startApp()` y conservar sus escenarios con los mismos valores esperados. `boot-check` suma que evaluar cada fuente legacy sola, en un contexto sin catálogos ni adaptadores, y el bundle de `main.tsx` sin su llamada final, con un almacenamiento que lanza ante cualquier acceso, no falla ni lo toca, y que `startApp()` inicializa en orden y dibuja la primera vista.
- **FR-040**: La prueba de riesgo 2 de F1 (el motor de campaña sin `init` lanza y el de Sistemas devuelve `[]` sin error) DEBE invertirse en el commit TDD de la unidad 3: tras `startApp()` los dos motores están inicializados antes de la primera vista, y sin `init` fallan igual los dos. La forma exacta la fija Q2.
- **FR-041**: El registro de modelos de Sistemas DEBE vivir en `entities/systems-simulation`: junta los cuatro grupos de modelos que el slice ya exporta, lanza el error de hoy ante un nombre repetido («Modelo de Sistemas repetido: …») y se lo entrega al motor al inicializarse. `window.SYSTEMS_*` conservan su forma y el orden de claves de `models`.
- **FR-042**: El registro DEBE tener su spec, en rojo antes de la implementación: tiene exactamente los modelos que referencian los 25 talleres, y dos grupos con un nombre repetido lanzan el error de hoy.

**Unidades 5 a 8** *(parte b)*

- **FR-043**: La gramática de URL DEBE vivir en `shared/config`: las ocho vistas, los parámetros (`ejercicio`, `paso`, `campana`, `sistema`, `mundo`, `lenguaje`, `taller` y `parte`), cómo se leen y cómo se arma cada una de las seis formas con query. `app.js` (el idioma que manda la URL), `lab.js`, `campaign.js`, `systems.js` y el enlace del Atlas al laboratorio la usan en lugar de sus literales.
- **FR-044**: Cada URL que el código arma o escribe DEBE salir carácter por carácter igual que hoy, incluido el orden de los parámetros (que no es el mismo en el regreso de Sistemas, `?taller&parte=build&lenguaje`, que en su selección, `?lenguaje&taller&parte`), y las escrituras siguen usando `history.replaceState`.
- **FR-045**: El contexto de una misión de campaña, el permiso para intentarla, el regreso a su mundo y a su taller, y la lista de misiones de un taller DEBEN ser datos puros que cada entidad exporta (`entities/campaign` y `entities/systems-workshop`): sin HTML, sin leer `location` y sin que una entidad importe a otra.
- **FR-046**: `exerciseContextHTML` y `lockedExerciseHTML` DEBEN seguir armando, en los adaptadores y a partir de esos datos, el mismo marcado y las mismas clases (`.quest-lab-context` y `.quest-direct-lock`). La composición (Sistemas antes que campaña, la lista navegable y el regreso) queda en el laboratorio.
- **FR-047**: La gramática y los datos DEBEN tener sus specs, en rojo antes de la implementación, con cadenas escritas a mano desde el README y el mapa (§4) y con los ids de `qa/fixtures/curriculum-ids.json` (por ejemplo `rust-world-1`, `cache` y `rust-113`). `lab-bridge-check` (21 escenarios) sigue en verde sobre los adaptadores y su correspondencia se lista (FR-013).
- **FR-048**: `features/progress-backup` DEBE ofrecer exportar (el archivo y su nombre), planificar una importación (puro, sin tocar el estado), aplicarla, «Borrar todo», y listar y leer los respaldos, con la lógica que hoy está en `app.js` (`exportProgress`, `planRouteImport`, `planSectionImports`, `importNotice`, `syncDerivedSeals`, `collectBackups`, `downloadBackup`, `IMPORT_SECTIONS`, `NOTICE_AREAS` y el manejador de `#confirm-reset`). La lectura del archivo, el toast, el redibujo y el temporizador siguen en `app.js` hasta F8.
- **FR-049**: La importación DEBE conservar sus dos fases (primero se planifican todas las secciones sin aplicar nada, y una sección inválida aborta antes; después se aplican las secciones y, por último, el recorrido), el orden de hoy de las secciones (campaña, laboratorio y Sistemas) y el de las áreas en el aviso (recorrido, laboratorio, campaña y Sistemas).
- **FR-050**: La importación y «Borrar todo» DEBEN conservar las reglas de hoy: sólo `false` cuenta como «no se guardó»; la sincronización de los sellos derivados es independiente por área y un fallo sólo se registra; el límite de 10 MB; y los textos de los avisos, con el mismo orden y la misma condición.
- **FR-051**: La feature DEBE recibir las cuatro áreas por parámetro, cada una con los métodos que hoy invoca `app.js`, y NO DEBE importar vistas ni leer `window`; `app.js` la arma con las áreas que lee de sus adaptadores. Lo que no es almacenamiento (la sesión de simulaciones de Sistemas y el temporizador del recorrido) se reinicia en pasos que registra quien lo posee.
- **FR-052**: La interfaz DEBE poder reemplazarla D1c sin tocar a quien la llama: importar (aplicar) y «Borrar todo» devuelven una promesa, «Borrar todo» acepta una confirmación que hoy se ignora, y exportar y listar respaldos siguen locales y síncronos. **[NEEDS CLARIFICATION: Q4, si la interfaz nace asíncrona]**
- **FR-053**: La feature DEBE tener sus specs, en rojo antes de la implementación, con áreas falsas, que reemplazan los escenarios de dominio de `app-shell-check` (la correspondencia se lista, FR-013); la forma de la exportación y la importación de las dos exportaciones congeladas sin omisiones; y, con un doble asíncrono de las áreas, el flujo de `app.js` termina igual sin cambiar a quien llama.
- **FR-054**: Los modelos de los exploradores DEBEN ser funciones puras sin DOM, en `entities/exercise`: qué explorador corresponde a un ejercicio, el canal productor y consumidor, la tabla de restricciones genéricas, el puntero, el robot y el paquete (con `crc32` y la huella rotativa). `lab-explorers.js` y `quest-explorers.js` conservan el HTML, el foco y la región viva, y llaman a los modelos.
- **FR-055**: Qué ejercicios tienen explorador, y de qué tipo, DEBE decidirlo un dato explícito y no una expresión regular sobre el texto, y DEBE dar la clasificación de hoy: 61 ejercicios con explorador de canal, genérico o puntero y los 12 de robot y paquete (`rust|go-101` a `106`). **[NEEDS CLARIFICATION: Q1, de dónde sale ese dato: un mapa en el front, un campo de `content/` o las expresiones de hoy]**
- **FR-056**: Las 12 misiones de proyecto de `lab-explorers.js` (`missions`) DEBEN conservarse con el mismo texto, como datos de la vista: pasarlas a `content/` es de otro ítem.
- **FR-057**: Los modelos DEBEN tener sus specs, en rojo antes de la implementación, que reemplazan los escenarios de dominio de `quest-explorers-check` (47) y fijan el canal, el genérico y el puntero con valores escritos a mano (la correspondencia se lista, FR-013); y una fixture con la clasificación de los 274 ejercicios, sacada de las expresiones regulares en el commit base, contra la que se compara la nueva.
- **FR-058**: Las nueve reglas de CSS que cruzan hojas (la tabla de la unidad 8) DEBEN pasar a la hoja de su dueño, cada una entera y sin cambiar sus declaraciones.
- **FR-059**: La cascada DEBE quedar igual: las reglas que pasan a `styles.css` se colocan después de las que hoy pisan por orden de carga (hay dos bloques de menú de 590 px en `styles.css` que `lab.css` pisa), y el orden de carga de las hojas no cambia.
- **FR-060**: La protección de F1 (estilo computado a 981, 850, 650 y 590 px y con movimiento reducido) DEBE pasar sin editarse, y el CSS del dist DEBE tener el mismo conjunto de reglas (contexto de `@media`, selector y declaraciones), en otro orden, según una comparación única.

### Key Entities *(include if feature involves data)*

- **Almacén singleton:** el único lector y escritor de una clave de progreso en un documento. Se abre una vez en el arranque, expone su estado actual y una suscripción.
- **Motor singleton:** el de campaña o el de Sistemas, una instancia por documento, con la misma regla.
- **Catálogo:** los 274 ejercicios en el orden de hoy, con `exercises` y `byId`.
- **Arranque explícito (`startApp`):** la función que hace, en orden, lo que hoy hace evaluar `app.js`.
- **Adaptador fino:** un `window.Taller*` que delega en los módulos y publica sólo los métodos que una vista legacy lee.
- **Puente como dato:** lo que una vista le pasa a otra (contexto de misión, permiso, regreso y lista de misiones), sin HTML ni `location`.
- **Gramática de URL:** las ocho vistas y las seis formas con query, con sus parámetros.
- **Área:** cada una de las cuatro partes del progreso (recorrido, laboratorio, campaña y Sistemas) como la ve el respaldo.
- **Respaldo (`features/progress-backup`):** exportar, importar en dos fases, «Borrar todo» y los respaldos de las cuatro áreas.
- **Modelo de explorador:** el estado y las transiciones de un explorador, sin DOM.
- **Comparación única:** la corrida, una vez por unidad, que compara el código anterior con el nuevo sobre las mismas entradas y se informa en el PR.
- **Línea base:** las salidas de los tres oráculos sobre el commit base, con su hash.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con cada una de las 8 unidades integradas, la red de F1 pasa completa: 0 escenarios editados (fuera de las 2 specs de riesgo) y 0 fallas.
- **SC-002**: Después de cada unidad, `build/curriculum.json`, `dump-globals` y `dump-dist-globals` tienen los mismos bytes que la línea base: 3 de 3 salidas, 0 diferencias.
- **SC-003**: Las 3 fixtures de progreso arrancan con 0 escrituras, 0 claves `:respaldo` y 0 avisos, y las 2 exportaciones se importan con 0 omisiones.
- **SC-004**: Cada una de las 4 claves de progreso se abre en 1 lugar: 0 aperturas en módulos de producción distintos de sus singletons.
- **SC-005**: Al evaluar el bundle de `main.tsx` hay 0 accesos al almacenamiento y 0 lecturas de catálogos: todo ocurre en `startApp()`.
- **SC-006**: Las 2 specs de riesgo de F1 quedan invertidas, cada una en el commit TDD de su unidad, y cada una falla antes de la implementación por la razón esperada: 2 de 2.
- **SC-007**: Las 9 reglas de CSS están en la hoja de su dueño, la protección de F1 pasa 9 de 9 sin editarse y el CSS del dist no pierde ni duplica reglas: 0 diferencias.
- **SC-008**: La comparación única de cada unidad da 0 diferencias en lo que mueve: los 274 programas de prueba, la lectura del recorrido y del laboratorio con las 3 fixtures, las 274 clasificaciones de explorador y las 6 formas de URL.
- **SC-009**: Para cada uno de los 9 checks que F2 adapta, el 100 % de sus escenarios figura en la tabla de correspondencia, cubierto o descartado con su motivo.
- **SC-010**: Con un doble asíncrono de las 4 áreas, el flujo de importar y el de «Borrar todo» de `app.js` terminan igual con 0 cambios en el código que llama.
- **SC-011**: `dist/index.html` queda bajo el tope de `qa/build-check` tras cada unidad, y su tamaño antes y después queda informado.
- **SC-012**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan tras cada unidad, y la imagen web sigue construyendo.
- **SC-013**: Las unidades 1 a 4 se integran antes que cualquiera de las 5 a 8 y en cambios aparte: 0 unidades de la 5 a la 8 en los PR de la 1 a la 4.

## Riesgos

1. **Dos copias del mismo estado en la transición.** Mientras `app.js` y `lab.js` sigan siendo dueños de la interfaz y una página nueva (de F3 en adelante) use el singleton, dos copias divergen y se pierden borrados. *Mitigación:* un solo dueño del estado (FR-026), el guard (FR-029) y la spec del singleton con dos consumidores (FR-030).
2. **La segunda instancia en los checks.** El arnés de `qa/` empaqueta cada fuente legacy por separado: un singleton que dos archivos importaran existiría dos veces en un contexto y reintroduciría el defecto en `lab-bridge-check`, `lab-state-check`, `systems-check`, `project-kit-check` y `campaign-check`. *Mitigación:* FR-018 y el adaptador como único camino entre archivos legacy.
3. **`load-order-check` pierde `app.js`.** Sólo lee los `import '…'` desnudos: pasar `app.js` a un import con nombre lo saca de la lista y falla «`app.js` último». Además, el paquete IIFE del arnés no alcanza un export con nombre (`app-shell-check`). *Mitigación:* FR-038 y FR-039.
4. **El orden del arranque cambia sin que nadie lo vea.** Hoy el laboratorio carga al evaluar `lab.js`, antes que `app.js`; con `startApp` el orden es explícito, y una inversión rompe campaña (lanza) y Sistemas (queda vacío). *Mitigación:* FR-036, FR-040 y la prueba de orden de `boot-check`.
5. **La cascada de CSS.** `lab.css` pisa a `styles.css` por orden de carga (el menú móvil pasa de 2 a 3 columnas): una regla movida a otra posición cambia el aspecto sin que falle una prueba funcional. *Mitigación:* FR-059, la protección de F1 y la comparación del conjunto de reglas.
6. **La suscripción y la mutación en el lugar.** El laboratorio muta su estado en el lugar y el recorrido lo reemplaza al fusionar con otra pestaña: una suscripción que sólo compare identidades no avisaría del primero, y una que clone el estado en cada cambio rompería las referencias del segundo. *Mitigación:* FR-025; el plan fija qué entrega a un consumidor de React y la spec lo prueba con los dos.
7. **Los 10 ids de hitos.** El almacén del recorrido los necesita para leer lo guardado, y la hoja de ruta los asigna a F4. *Mitigación:* FR-027 los mueve y los fija ahora; se informa a F4.
8. **Texto exacto.** Los avisos, los toasts, las URL (con su orden de parámetros) y el programa de prueba de cada ejercicio son texto que ningún E2E compara entero. *Mitigación:* FR-044, FR-050 y la comparación única (FR-011).
9. **El tipo de explorador como campo de `content/`** (Q1, opción B) rompería el criterio de bytes de F2 y los validadores de C2 y C6. *Mitigación:* sería un ítem aparte; la opción recomendada no toca `content/`.
10. **El tamaño de F2.** Son 60 requisitos en ocho unidades, contra 52 de C3a. *Mitigación:* la partición propuesta.
11. **Choques de integración.** `app.js`, `lab.js`, `main.tsx` y `qa/lib/legacy-sources.ts` los tocan las unidades 1, 2, 3, 5, 6 y 7, A2 y cada port. *Mitigación:* los integra el agente principal de a uno, en el orden de «Las ocho unidades».
12. **F1 y las specs hermanas no están entregadas.** F2 describe `master` y lo que F1 promete; A2, D1 y C4 son borradores. *Mitigación:* el plan contrasta con la base antes de implementar, y lo tomado de los borradores es un supuesto.
13. **Nada se ejecutó al especificar.** Sin npm, Docker ni navegador: las cuentas (61 exploradores, nueve reglas de CSS, 16 restricciones de orden) salen de leer el código y de un currículo generado el 2026-10-04. *Mitigación:* el plan las vuelve a medir sobre la base.
14. **ADR 0008 en «propuesta».** Si el usuario lo enmienda (por ejemplo, los proyectos de Vitest), cambia FR-012.

## Relación con otros ítems

- **F1.** F2 arranca con la red de F1 en verde y la usa sin editarla (FR-002). Dos discrepancias para el coordinador: la spec de F1 en esta rama todavía muestra Q1 a Q5 abiertas, y su historia de usuario 6 mide el CSS a 1 200 px donde su Q2 y el pedido dicen 981; esta spec toma 981 px, que es el corte de `lab.css`.
- **A2** (plan en `spec/a2-compuerta`, «Interfaces y contratos que A2 fija para F2 y el épico»). Los seis contratos están recogidos:

  | Contrato de A2 | Dónde está en esta spec |
  | --- | --- |
  | F2-I1: evaluar no arranca la app; una función exportada, que no pisa `app/boot/` | FR-035 y FR-036 |
  | F2-I2: el catálogo no importa el JSON y se arma después de la compuerta | FR-032 |
  | F2-I3: el grafo estático no abre almacenes ni crea motores | FR-021 |
  | F2-I4: los `register-*` siguen siendo módulos con efectos, y los cambios se hacen sobre la forma vigente | FR-017 y FR-038 |
  | F2-I5: `dump-globals` da los mismos bytes tras cada unidad | FR-003 y FR-004 |
  | F2-I6: nada por debajo de `app` importa `getContent()` | FR-015 |

  Si el spike de A2 falla, una de sus alternativas es importar todo en estático y llamar al arranque explícito después de la compuerta: F2 la deja viva porque ningún módulo legacy lee contenido ni abre almacenamiento al evaluarse (FR-035) y el catálogo recibe sus datos por parámetro (FR-032). `load-order-check` y `qa/lib/legacy-sources.ts` los edita primero F2 y después A2 (T005 y T007).
- **D1** (spec en `spec/d1-progreso`, borrador). D1c espera las unidades 1 y 6. El FR-061 de D1 pide el cliente sobre los almacenes con suscripción de los cuatro (FR-023 de esta spec); los FR-072 a FR-074 de D1 mueven importar y «Borrar todo» al servidor (FR-052 de esta spec). Si D1 cambia, esta spec recorta la suscripción de los motores o la forma de la interfaz.
- **C4** (spec en `spec/c4-exposicion`, borrador). F2 no suma ningún sitio de estilo en línea ni mueve los seis que C4 cuenta (FR-008).
- **F3 a F10.** Cada port recibe lo que necesita así:

  | Ítem | Qué toma de F2 | Unidades |
  | --- | --- | --- |
  | F3 Biblioteca, F4 Proyecto y F9 Recorrido | El almacén del recorrido con suscripción; F4, además, los 10 ids de hitos fijados | 1 |
  | F5 Sistemas | El motor de Sistemas, el catálogo, el registro de modelos, los puentes y la URL, y `.lab-empty` en la base | 1, 2, 4, 5 y 8 |
  | F6 Campaña | El motor de campaña, el catálogo, los puentes y la URL, y las reglas de CSS del banner, del contexto y del menú | 1, 2, 5 y 8 |
  | F7 Laboratorio | El almacén del laboratorio, el catálogo y `buildProgram`, los puentes, la URL, los modelos de exploradores y el CSS | 1, 2, 5, 7 y 8 |
  | F8 Método | `features/progress-backup` | 1 y 6 |
  | F10 Shell y router | El arranque explícito y la gramática de URL | 3 y 5 |

  Las specs de F3 a F9 tienen que decir lo mismo que FR-015: la página recibe su porción del contenido por props desde su adaptador de `frontend/src/app/legacy/`, como el Atlas.
- **E1.** Los conteos fijos del menú salen del catálogo (F6 y F10) o se actualizan a mano con E1; F2 no los toca.
- **Hoja de ruta (enmiendas que integra el coordinador).** F2 pasa de «Pendiente» a «En especificación», con el enlace a esta spec; F2a y F2b, si el usuario acepta la partición; la decisión abierta de F4 sobre el fixture de los 10 ids queda cerrada por FR-027; y, si Q3 elige Zustand, una fila nueva en «Acciones del usuario».

## Assumptions

- F1 está entregada antes de implementar F2. Esta spec describe `master` y lo que F1 promete: la red E2E, las dos specs de riesgo en verde, la configuración de Vitest en `node` y la protección de estilo computado. Las rutas de las dos specs de riesgo las fija el plan de F1.
- El ADR 0008 se aprueba antes de implementar; esta spec lo usa como base y lo dice. El ADR 0003 está aceptado.
- Los contratos de A2 salen de su plan (borrador, rama `spec/a2-compuerta`); la suscripción de los cuatro y la interfaz de respaldo salen de la spec de D1 (borrador, rama `spec/d1-progreso`); los seis sitios de estilo, de la spec de C4 (borrador, rama `spec/c4-exposicion`). Si alguno cambia, esta spec se ajusta.
- La suscripción de los motores (FR-023) no figura en la hoja de ruta, que sólo la nombra para los dos almacenes: la suma esta spec porque D1c la necesita y el costo es chico.
- `startApp` vive en `frontend/app.js` hasta que F10 retire el archivo, y el modelo de exploradores en `entities/exercise` porque `pages/lab` nace con F7 y la regla es no crear capas por anticipado. Son nombres y ubicaciones provisionales que el plan confirma.
- Las cuentas de Q1 (61 y 12) salen de leer `build/curriculum.json` de la copia principal con `node`, en modo de sólo lectura. El resto de las cuentas (16 restricciones de orden, 9 reglas de CSS, 21, 37, 47 y 51 escenarios de los checks) salen de leer el código y el mapa; nada se ejecutó.
- Esta spec se escribió sin `npm`, sin Docker, sin navegador y sin descargas. Los tamaños de `dist/index.html` son los de A1 en la hoja de ruta del backend; no se reconstruyó.
- Con las opciones recomendadas de Q1 a Q4 como borrador: mapa por id en el front, guard automático y Sistemas que lanza, suscripción propia mínima e interfaz de respaldo asíncrona.
- Los mensajes de error de los módulos, que lee quien opera el taller, van en español rioplatense, como los de los motores de hoy. El código y las pruebas, en inglés.
- La referencia de 52 requisitos es la de C3a, la mayor spec del épico según la tabla de D1.
- Dependencias de la hoja de ruta: F1. A2 depende de las unidades 1 a 4; F3 a F10 y D1c dependen de F2 según la tabla de «Relación con otros ítems».

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q4 y la partición llevan las suyas arriba.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cuántos globals se retiran en F2 | Retirar todo lo que una vista lee y que lea los módulos; conservar lo que una vista legacy lee, delegando | Conservarlo: los checks empaquetan cada archivo legacy por separado, así que un singleton importado por dos archivos existiría dos veces en un contexto; y la hoja de ruta ya fija qué ítem retira cada método |
| Dónde vive el arranque | Una función exportada por `app.js`; un módulo nuevo en `src/app/boot/` que orqueste | `app.js`: hoy es dueño de lo que arranca; un módulo nuevo sumaría una capa que A2 ya construye (`runBoot`) y que F10 reemplaza |
| En qué orden se hacen las unidades | Por número; por dependencia | Por dependencia (la 2 antes que la 1, la 4 antes que la 3), con los números como ids estables |
| Qué se mueve a `entities/exercise` y qué a una página | Los modelos de exploradores en `entities/exercise`; en un `pages/lab` anticipado | `entities/exercise`: `pages/lab` nace con F7 y la regla es no crear capas por anticipado |
| Cuándo se mueven los ids de hitos | Todos los datos de hitos en F4; sólo los ids en F2 | Sólo los ids en F2: el almacén del recorrido los necesita para leer lo guardado; los textos esperan a F4 |
| Cómo se prueba que lo movido no cambió | Sólo las specs nuevas; sólo la red E2E; ambas más una comparación diferencial única | Las tres: la red mira lo visible, las specs fijan el contrato con valores a mano, y la comparación única detecta lo que ninguna mira (el texto exacto de un programa de prueba o de una URL) |
| El CSS: mover las reglas o acotar las hojas | Acotar cada hoja a su vista; mover entera cada regla a su dueño | Mover: acotar una hoja cambia el menú móvil, el banner y el bloque de contexto, que hoy dependen de que otra hoja los cubra |
| Dónde se prueba el arranque | Sólo en `boot-check`; además en `app-shell-check` y en una spec | En los dos checks que ya arrancan la app, con los mismos valores esperados: no se agrega otro arnés |
