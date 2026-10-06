# Mapa de migración del front legacy a React (`master` 8f1bdbc, 2026-10-05)

> Fuente técnica del épico [Port del front legacy a React](roadmap.md). Es una foto del código de `master` en `8f1bdbc`. El 2026-10-05 se comprobó que 21 de los identificadores que cita (funciones de `app.js`, `lab.js`, `campaign.js`, `systems.js` y `quest-explorers.js`) siguen existiendo en `ca9e619`, y que los conteos de líneas de las seis vistas coinciden. No se edita: si el código cambia, la spec del ítem que lo cambia lo registra (constitución, principio VIII).

Lo hizo el agente revisor (Opus) leyendo el código completo. Las referencias tienen la forma `archivo:función`. Las rutas de las vistas, las hojas y `src/…` son relativas a `frontend/`. Las de `qa/`, `docs/`, `docker/`, `tools/` y `specs/` son relativas a la raíz.

**Decisión del usuario (2026-10-05).** Se eligió el camino «red y seams primero, vistas una por una (las hojas primero, cada una con su raíz dentro del shell legacy) y el shell con el router al final, con una sola raíz». A2 va temprano. Descartados: el shell y el router primero, y la reescritura en paralelo.

**Lo que asume el usuario y no corrigió:**
- Es un port, no un rediseño: se conservan el aspecto, el comportamiento, el progreso, los IDs y las URLs.
- Cada vista va en un PR que borra su JS, su CSS y su global.
- Antes de portar hay E2E con Playwright y Page Objects contra la versión actual. Las piezas nuevas llevan Vitest y Testing Library.
- El trabajo corre en paralelo con el backend, C3 y C6.

## Resumen

El acoplamiento real está en tres puntos:
1. **`app.js`** es el router y el dueño del idioma global y del almacén del recorrido, y orquesta el respaldo de los cuatro almacenes. Sus cuatro páginas viven en su cierre. Sus delegados sobre `#main` y su temporizador actúan sobre todo el documento.
2. **`lab.js`** es dueño del almacén que campaña, Sistemas y los kits leen por `window.TallerLab`. A la vez consume HTML y URLs de campaña y de Sistemas, así que hay un ciclo entre vistas a través de `window`.
3. **El orden de evaluación es contrato.** Está verificado: el motor de campaña lanza si se usa antes de `init`, y el de Sistemas devuelve `[]` sin error.

A2 es el pivote del tamaño. Antes de A2 quedan unos 300 KB de margen; después, el tamaño deja de restringir.

## 1. Responsabilidades por vista

### `app.js`

- **Dibuja el shell** (`syncShell`): sidebar, `aria-current`, idioma y `body[data-language]`.
- **Dibuja cuatro páginas:**
  - `#recorrido`: `renderRoute` y `timerMarkup`;
  - `#biblioteca`: `renderLibrary` y `renderResourceResults`;
  - `#proyecto`: `renderProject`;
  - `#metodo`: `renderMethod` y `backupsPanel`.

  Las otras cuatro vistas las delega con `mount`.
- **Eventos:**
  - tres delegados sobre `#main`: click, change e input;
  - `#lesson-dialog`, `[data-language]` y `.skip-link`;
  - `hashchange` y `popstate`;
  - `#export-progress`, `#cancel-reset`, `#confirm-reset` e `#import-file`.
- **Router:** es el router (`navigateFromLocation`).
  - `render` desmonta las cuatro vistas, llama a `TallerCampaign.refresh()` y monta la actual.
  - `syncLinkedLanguage` fija el idioma desde la URL.
  - Al cambiar de idioma, escribe `lenguaje` o vacía la query.
- **Almacenamiento:** es dueño de `taller-learning-v1` y orquesta exportar, importar, borrar y los respaldos de los cuatro almacenes.
- **Diálogos:**
  - `#lesson-dialog`, que devuelve el foco a quien lo abrió;
  - `#confirm-dialog`;
  - `#import-file`.
- **Efectos:**
  - `setInterval(updateTimer, 500)`, sin `clear`;
  - un toast de 4,5 s;
  - descargas;
  - portapapeles con `execCommand` y la selección como respaldo;
  - `scrollTo` y foco en `#main` al navegar.

### `lab.js`

- **Dibuja `#laboratorio`:** el mapa (`mapHTML`), el ejercicio en tres fases (`learnHTML`, `codeHTML` y `reflectHTML`) o el bloqueo de campaña, que reemplaza todo el host.
- **Eventos, sobre el host:**
  - click: `onClick`, con 27 acciones `data-lab-action`;
  - input;
  - change, para los exploradores;
  - keydown: Ctrl o ⌘ + Enter, Esc, Tab y las flechas de las pestañas;
  - scroll, en captura.
- **URL:**
  - lee `ejercicio`, `paso`, `sistema` y `campana`;
  - `syncLocation` escribe `ejercicio` y `paso`, y en el mapa borra `campana` y `sistema`;
  - `finishNavigation` hace `location.href = returnURL`.
- **Almacenamiento:** es dueño de `taller-laboratorio-v1`. Llama a `save()` en cada tecla del editor, de la prueba propia y de la reflexión.
- **Diálogo:** `#lab-confirm-dialog`, que se crea en `body` y nunca se quita.
- **Efectos:**
  - un AbortController por ejecución;
  - CodeMirror se crea y se destruye en cada `render`;
  - 13 movimientos de foco.

### `campaign.js`

- **Dibuja `#campana`:** héroe y rango, mapa de mundos, el mundo (misiones filtrables y checkpoint), la vitrina y las reglas.
- **Eventos:** click sobre `data-quest`, con las acciones world, filter y checkpoint.
- **URL:**
  - lee `mundo` al montar;
  - escribe `?mundo=` y vacía el resto;
  - arma `missionURL` y `worldURL`.
- **Almacenamiento:** sólo a través del motor. `answerCheckpoint` escribe; `refresh` deriva en memoria.
- **Efectos:** `TallerEffects.celebrate` al completar un mundo, y `stop` al desmontar.

### `systems.js`

- **Dibuja `#sistemas`:** el catálogo (`overview` y `cards`) y el taller (`detail`, con `explore`, `build` y `ship`).
- **Eventos:**
  - click sobre `data-sys`, con 9 acciones;
  - input en `#sys-search` y `#sys-note`;
  - change sobre `data-sys-step`.
- **URL:**
  - lee `taller` y `parte` al montar;
  - `locationForSelection` escribe `?lenguaje=&taller=&parte=`;
  - arma `codeURL`.
- **Almacenamiento:**
  - a través del motor: `observe`, `answer`, `setNote` (en cada tecla) y `setStep`;
  - `simulations` vive en memoria, por `lenguaje:taller`.
- **Efectos:** `celebrate` y `stop`, más el kit ZIP con `TallerProjectKit`.

### `lab-explorers.js`

- **Dibuja** fragmentos para el lab: minilabs de puntero, canal y genéricos (`render` y `body`) y misiones de proyecto (`curriculumHTML`).
- **Eventos:** ninguno propio. `act` y `change` los llama el lab.
- **Estado:** `model` es global del módulo y se reinicia en `lab.js:openExercise`.
- **Efectos:** foco después de redibujar.

### `quest-explorers.js`

- **Dibuja** los exploradores robot y paquete para `rust|go-101…106`.
- **Eventos:** ninguno propio. `act` lo llama `lab.js:onClick`.
- **Estado:** `states`, por id, que se vacía en `openExercise`.
- **Efectos:** la región viva `[data-q-status]` y el foco.

### El Atlas, como referencia

El Atlas ya es React (`src/app/legacy/register-atlas.tsx`). Crea la raíz sobre `#main` en cada `mount` y guarda la sesión de cada idioma en el módulo.

## 2. Globals y orden de carga

### 2.1 Publicados por las vistas legacy

`app.js` no publica ninguno.

| Global | Métodos | Consumidores |
|---|---|---|
| `TallerLab` (`lab.js`) | mount, unmount, buildProgram, loadWarning, getExercises, exportState, planImport, applyImport, backups, reset | `app.js`, todos salvo `buildProgram`. `campaign.js` y `systems.js`: `getExercises` y `exportState`. `register-project-kit.ts`: los mismos, al llamar. En QA: `runtime-check` (`buildProgram`), `project-kit-check`, `systems-check` y `lab-state-check` |
| `TallerCampaign` (`campaign.js`) | init, refresh, sync, mount, unmount, returnURL, exerciseContextHTML, lockedExerciseHTML | `app.js`: init, refresh, sync, mount y unmount. `lab.js`: refresh, `sync` (a través de `syncAfterRun`), returnURL, exerciseContextHTML y lockedExerciseHTML |
| `TallerSystems` (`systems.js`) | init, refresh, sync, mount, unmount, returnURL, missionIDs, exerciseContextHTML, resetSimulations | `app.js`: init, sync, mount, unmount y resetSimulations. `lab.js`: refresh, sync, missionIDs, returnURL y exerciseContextHTML |
| `TallerExplorers` (`lab-explorers.js`) | reset, render, act, change, curriculumHTML | `lab.js` |
| `TallerQuestExplorers` (`quest-explorers.js`) | render, act, reset | `lab.js` |

### 2.2 Consumidos de los adaptadores

| Global | Lo leen |
|---|---|
| `GUIDE_DATA` | `app.js`, al evaluarse |
| `RUST/GO_LAB`, `RUST/GO_QUESTS` y `SYSTEMS_*_LABS` | `lab.js`, al evaluarse (`exercises` y `byId`) |
| `RUST/GO_CAMPAIGN` | `campaign.js:init` y `app.js:syncLinkedLanguage` |
| `SYSTEMS_{PC,LOWLEVEL,INFRA,PLAY}` | `systems.js:init` y `workshops` |
| `TallerRunner` y `TallerEditor` | `lab.js`, al llamar |
| `TallerAtlas` | `app.js:render` |
| `TallerCampaignEngine` | `campaign.js`, que lo captura al evaluarse. `lab.js`: `getWorlds` y `canAttempt`. `app.js`: `exportState`, `planImport`, `applyImport`, `reset` y `backups` |
| `TallerSystemsEngine` | `systems.js`, que lo captura al evaluarse, y `app.js`, con los mismos cinco métodos |
| `TallerEffects` | `campaign.js` y `systems.js` |
| `TallerProjectKit` | `systems.js` |

### 2.3 Dependencias de orden de `main.tsx`

- **Duras.** Se leen al evaluarse y las fija `qa/load-order-check.ts`:
  - los catálogos y los `register-systems-*` van antes de `lab.js`;
  - los motores, antes de `campaign.js` y `systems.js`;
  - `lab.js`, `campaign.js`, `systems.js`, los catálogos y el Atlas, antes de `app.js`;
  - `app.js` va último, y `styles.css` es la primera hoja.
- **Lo que hace `app.js` al evaluarse,** en orden:
  1. `TallerCampaign.init()`, que recibe `TallerLab.exportState()`;
  2. `TallerSystems.init()`, que lee `TallerLab.getExercises()` sin `?.`;
  3. `TallerLab.loadWarning()`;
  4. el render.
- **Motores usados antes de `init`** (verificado):
  - el de campaña lanza «Inicializá la campaña antes de usarla» en `getWorlds`, `refreshFromLab` y `canAttempt`;
  - el de Sistemas devuelve `[]` sin error.
- **Blandas.** Se leen al llamar:
  - el editor, los efectos y los exploradores se usan con `?.`;
  - el runner y los kits están dentro de un `try`: si faltan, el resultado queda como `transportError` o como aviso, y nunca aprueba;
  - `window.TallerCampaign?.exerciseContextHTML(...)` lanza si el objeto existe pero no tiene ese método.
- **Al portar,** cada lectura de `window` pasa a ser un import de un singleton. Hoy los motores existen sólo como `window.X = create…()`, y dos instancias divergirían (ver §5).

## 3. Contrato de DOM

### 3.1 `src/index.html`

| Elemento | Dueño | Nota |
|---|---|---|
| `#main` (tabindex -1) | `app.js`: render, foco y delegados | Host de todas las vistas. La raíz React del Atlas se crea sobre él |
| `.skip-link`, los 8 `[data-view]` y los 2 `[data-language]` | `app.js` | Llevan `aria-current` y `aria-pressed` |
| `#sidebar-language`, `#sidebar-completed`, `#sidebar-percent`, `#sidebar-progress`, `#resource-count` y `#save-label` | `app.js:syncShell` y `updateSaveLabel` | |
| `.nav-count` (4 y 25) y `.lab-nav-count` (274) | Estáticos | Duplican el currículo: 4 mundos, 25 talleres y 274 ejercicios, 137 por lenguaje. El nav dice 274 y el lab muestra 137 |
| `#export-progress`, `#confirm-dialog`, `#cancel-reset`, `#confirm-reset` e `#import-file` | `app.js` | |
| `#lesson-dialog` y `#lesson-content` | `app.js:openLesson` | `aria-labelledby="lesson-title"` apunta a contenido que se genera después |
| `#toast` (role=status, aria-live polite) | `app.js:toast` | Es el único `notify` de lab, campaña y Sistemas |
| `body[data-language]` | `app.js:syncShell` | Tematiza `--accent*` en `styles.css` |

**Contrato oculto con efectos.** Los tres delegados de `app.js` sobre `#main` y el intervalo resuelven selectores contra todo el documento, y siguen activos con cualquier vista montada. Hoy no hay colisiones. Pero una página que se porte en su lugar conservando atributos y clases sufre doble manejo:
- el `input` de `resource-search`, el `change` de `filter-*` y los clics `favorite` y `category` llaman a `renderResourceResults`, que pisa el `#resource-grid` y el `#resource-results-label` de React;
- `clear-filters` llama a `render()` y remonta la página;
- `data-milestone` hace un segundo toggle, así que el clic se anula;
- `updateTimer` escribe en `.timer-digits` y `.timer-toggle` cada 500 ms.

**Corrección:** cada port saca sus ramas de los delegados de `app.js` en el mismo commit.

### 3.2 Puentes entre vistas

| Puente | Productor → consumidor | Forma y acoplamiento |
|---|---|---|
| `exerciseContextHTML(id, lang)` | `campaign.js` y `systems.js` → `lab.js:exerciseHTML`, `updateRunUI` y la predicción de `onClick` | Devuelve `<div class="quest-lab-context">`, y Sistemas tiene prioridad (`\|\|`). El lab encuentra el bloque por `.quest-lab-context` y lo reemplaza en el lugar. Los dos productores leen `location.search` |
| `lockedExerciseHTML(id, lang)` | `campaign.js` → `lab.js:render` y `runExercise` | Devuelve un `<section class="quest-direct-lock">` que reemplaza el host. El permiso lo deciden `canAttempt` y el mundo del enlace |
| `returnURL`, `missionIDs` y `getWorlds` | Sistemas, campaña y el motor de campaña → `lab.js:navigationList` y `finishNavigation` | El lab consulta directamente al motor de campaña, pero a la vista de Sistemas |
| `refresh()` y `sync()` | Los llaman `lab.js:render`, `syncAfterRun`, `app.js:render` y la importación | Campaña y Sistemas derivan su estado de `TallerLab.exportState()`: es un ciclo |
| `render(item)` y `curriculumHTML(lang)` | Exploradores → `lab.js:learnHTML`, `explorerHTML` y `mapHTML` | HTML con `data-lab-action="explore"` o `"quest-explore"`: el vocabulario del lab vive dentro de los exploradores. `act(button, item, host)` busca `#lab-special-explorer`, `[data-quest-explorer]`, `[data-q-view]` y `[data-q-status]` |
| `mount(host, lang, toast)` | `app.js` → lab, campaña y Sistemas | El idioma entra sólo al montar. El Atlas no recibe `toast` |
| Kit ZIP | `systems.js` → `TallerProjectKit.download` → `TallerLab.exportState().records[id].draft` | Sistemas depende del borrador que guarda el lab |
| Enlaces con query | `campaign.js:missionURL`, `systems.js:codeURL` y `ConceptDetail` del Atlas (`labLink`) → lab | Ver §4 |

## 4. Contrato de URL

La vista va en el hash, y los parámetros van en la query, antes del hash. Todas las escrituras usan `history.replaceState`.

Todas estas URLs tienen que seguir estables. El README documenta `#sistemas`, `#campana`, `#laboratorio` y `#atlas`.

| URL | La escribe | La lee |
|---|---|---|
| `#recorrido` … `#metodo` (8) | El nav y los enlaces internos | `app.js` |
| `?#laboratorio` | El nav y el «laboratorio libre» de `campaign.js:render` | Nadie: vacía la query |
| `?ejercicio=<id>&paso=learn\|code\|reflect#laboratorio` | `lab.js:syncLocation` y el Atlas | `lab.js:mount` y `app.js:syncLinkedLanguage`, que fija el idioma. Se comparte |
| `?campana=<mundo>&ejercicio=<id>&paso=learn#laboratorio` | `campaign.js:missionURL` | `lab.js:navigationList` y `finishNavigation`; `campaign.js:exerciseContextHTML` y `lockedExerciseHTML` |
| `?sistema=<taller>&ejercicio=<id>&paso=code#laboratorio` | `systems.js:codeURL` | `lab.js:navigationList`, `finishNavigation` y `exerciseHTML`; `systems.js:exerciseContextHTML` |
| `?mundo=<mundo>#campana` | `campaign.js:worldURL`, `returnURL` y `onClick` | `campaign.js:mount` y `app.js:syncLinkedLanguage` |
| `?lenguaje=rust\|go[&taller=<id>&parte=explore\|build\|ship]#sistemas` | `systems.js:locationForSelection` y `returnURL`, y `app.js` al cambiar de idioma | `systems.js:mount` y `app.js:syncLinkedLanguage` |
| `#invitacion=<token>` | Lo define el ADR 0006 §4.1, para C3 | Nadie. Hoy cae en `#recorrido`, y el token queda en la URL. Es contrato futuro |

**Recarga completa.** Esto se infiere del estándar y no se probó en un navegador.
- Un enlace que cambia la query no es una navegación de fragmento, así que `?#laboratorio` casi siempre recarga el documento.
- Hoy ése es el mecanismo que saca al alumno del contexto de campaña o de Sistemas, y de paso descarta el temporizador, las sesiones del Atlas y las simulaciones.
- Un router que intercepte esos enlaces cambia el comportamiento: lab, campaña y Sistemas tendrían que reaccionar a los cambios de query sin remontarse, y hoy la leen sólo en `mount`.

**Servidor.** `docker/nginx/nginx.conf` sirve todo con `try_files $uri $uri/ =404`, así que una ruta por path daría 404 al recargar. Una ruta por path tampoco encaja con el contrato.

## 5. Persistencia

| Clave | Dueño | ¿Usa `openVersionedStore`? | Fusión entre pestañas |
|---|---|---|---|
| `taller-learning-v1` | `app.js`: `parseProgress`, `defaults` y `mergeStoredRoute` | Sí | `mergeRouteProgress`: une los conjuntos; el idioma y los minutos quedan los locales |
| `taller-laboratorio-v1` | `lab.js`: `parseSaved` y `absorbStored` | Sí | `mergeRecord`, en el lugar |
| `taller-campaign-v1` | `entities/campaign` | Sí | La del motor |
| `taller-systems-v1` | `entities/systems-workshop` | Sí | La del motor |
| `<clave>:respaldo` y `:respaldo-2…5` | `shared/lib/versioned-storage.ts` | — | — |

**Estado en memoria del módulo** (se pierde al recargar):
- el shell: el idioma entre guardados, los filtros de la biblioteca y el temporizador;
- el lab: `selectedId`, `mode`, `phase`, `query`, `level`, `dueOnly`, `extraOnly` y `simulation`;
- campaña: `selected` y `filter`;
- Sistemas: `category`, `query` y `simulations`;
- los exploradores: `model` y `states`;
- el Atlas: `sessions`.

Una raíz React que se crea en cada `mount` necesita una sesión de módulo. Además, `simulations` tiene que seguir alcanzable para el `resetSimulations` de «Borrar todo».

**Una sola instancia por clave** (verificado). Dos `openVersionedStore('taller-learning-v1')` en el mismo documento se comportan como dos pestañas, porque cada una compara contra su propio `lastText`:
1. La página quita un favorito.
2. El shell guarda otro cambio.
3. La fusión une los conjuntos y el favorito vuelve.

Esto vale para los cuatro almacenes.

## 6. Lógica de dominio embebida y adónde va

| Archivo:función | Qué decide | Destino | Cuándo |
|---|---|---|---|
| `app.js:parseProgress`, `defaults` y `mergeStoredRoute` | Normalización y fusión del recorrido | `entities/guide`, como almacén singleton con suscripción | Antes de cualquier página que guarde |
| `app.js:milestones` y `milestoneIds` | Catálogo de hitos y sus 10 IDs persistidos (`rust-memory`…) | `content/guide` o la configuración de `entities/guide`, con los 10 IDs fijados en un fixture | Antes de Proyecto |
| `app.js`: `planRouteImport`, `planSectionImports`, `importNotice`, `IMPORT_SECTIONS`, `NOTICE_AREAS`, `syncDerivedSeals`, `collectBackups`, `downloadBackup`, `exportProgress` y el handler de `#confirm-reset` | Formato de exportación, importación en dos fases, avisos y «Borrar todo» | `features/progress-backup` | Antes de Método |
| `app.js:syncLinkedLanguage` | El idioma a partir de la URL | El router de `src/app` | Con el shell |
| `app.js`: el predicado de `renderResourceResults`, `completedCount`, `stepsFor`, `tutorPrompt` y `updateTimer` | Filtro, selectores, texto y temporizador | El modelo de la página o un hook | Durante el port |
| `lab.js`: `blank`, `sanitizeResult`, `sanitizeRecord`, `assertBackupShape`, `sanitizeSelected`, `sanitize`, `parseSaved`, `absorbStored`, `planImport` y `applyImport` | Almacén del lab | `entities/exercise` (ya tiene `mergeRecord`), como singleton, igual que los motores | Antes de portar campaña, Sistemas o el lab |
| `lab.js`: `exercises` y `byId` | Catálogo de los 274 ejercicios | Un módulo de catálogo, que A2 vuelve asíncrono | Antes |
| `lab.js:buildProgram` | Arnés de pruebas `__TALLER_TEST__` | `entities/exercise`, junto a `interpretRun` | Antes. `runtime-check` lo usa, y A4 lo cambia por la plantilla del servidor |
| `lab.js`: `isSolved`, `isDue`, `achievementStats`, `levelFor`, `levels` (duplica `LEVEL_LABELS`), `matches` (Clásicos = etapas 16 a 20) y `resultMatches`; el `solved` de `reflectHTML` y el `complete` de `reviewHTML` | Resuelto, repaso, puntos, nivel, filtros y vigencia del resultado | Selectores puros del lab | Antes o durante |
| `lab.js:runExercise`, y en `onClick`: confidence (1, 3 o 7 días), hint (tope de 3), reveal-solution y load-solution | Orquestación de la ejecución y agenda de repaso | `features/run-exercise`, sin atarse al transporte: A4 lo cambia por `/api/runs`, asíncrono | Con el lab |
| `lab.js:diagnose` (16 reglas) y `liveHint` | Diagnóstico de la salida del compilador | `entities/exercise/lib` | Durante |
| `campaign.js`: `worldURL`, `missionURL`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML`; `systems.js`: `missionIDs`, `returnURL`, `codeURL` y `exerciseContextHTML`; `lab.js`: `navigationList` y `finishNavigation` | Contexto de misión, permiso, regreso y lista navegable | Ver la nota debajo de la tabla | Antes de portar campaña, Sistemas o el lab |
| `campaign.js`: `missionType`, `ranks` e `icons`, la siguiente misión en `worldBody`, y los literales 150, 180, 30, 20 y 10 XP y «4 mundos · 24 misiones · 12 desafíos» | Etiquetas, rango y reglas | Selectores de `entities/campaign`. Hay que exportar `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` y contar desde el catálogo | Durante |
| `systems.js:init`, que une los 4 registros de modelos y detecta duplicados | Registro de modelos | `entities/systems-simulation` | Antes, por A2 |
| `systems.js:scene` | Saneo del SVG: números finitos y colores en lista blanca | `entities/systems-simulation/lib` | Durante |
| `systems.js`: `filtered`, `stateFor` y `simulations` | Búsqueda y sesión de simulación | Un modelo puro y una sesión de módulo | Durante |
| `lab-explorers.js:kind` | Elige el explorador con una regex sobre tema, título y `visual` | Un campo explícito en `content/`, en un commit aparte y con el oráculo | Antes del lab |
| `lab-explorers.js`: `act` (canal), `body` (tabla de restricciones) y `missions` | Modelos y contenido | Un modelo puro, y `missions` a `content/` | En cualquier momento |
| `quest-explorers.js`: `descriptor` (regex `^(rust\|go)-(10[1-6])$`), `move`, `fresh`, `packetData`, `crc32`, `rotateChecksum` y `act` | Qué ejercicios tienen explorador y cómo cambian | Un mapa explícito por ID y un modelo puro | En cualquier momento |

**Adónde va cada parte de los puentes** (la fila de contexto, permiso y navegación):
- Los datos de un solo dominio van a su entidad.
- La gramática de URL va a `shared/config`, porque la usan cuatro vistas, el Atlas incluido.
- La composición (Sistemas antes que campaña, y la lista navegable) queda en el lab: hoy en `lab.js` y después en `pages/lab/model`.
- Ninguna entidad importa a otra.
- El HTML queda en los adaptadores mientras el lab siga siendo legacy.

**Decisión pendiente: `solvedAt`** (verificado). Un import con `{solvedAt}` y sin `result` no se marca como pérdida (`lossy: false`). El mapa lo muestra como `is-complete` («Resuelto con pruebas») y suma 20 puntos, aunque `hasPassingEvidence` da `false`. Los sellos siguen pasando por la regla única, así que esto no aprueba código. Pero el port tiene que decidir qué selector respalda esa etiqueta.

## 7. CSS

| Hoja | KB / reglas / clases | Prefijos | La usan |
|---|---|---|---|
| `styles.css` | 29,9 / 336 / 118 | Sin prefijo: shell, páginas y clases base (`.button`, `.eyebrow`, `.pill`, `dialog` y `#toast`) | `app.js`, y todas como base |
| `lab.css` | 35,8 / 386 / 154 | `lab-` y muchas sin prefijo | `lab.js`, `lab-explorers.js`, el shell y `systems.js` |
| `campaign.css` | 14,5 / 152 / 57 | `quest-`, `world-` y `mission-` | `campaign.js`, `lab.js` y `systems.js` |
| `quest-explorers.css` | 9,8 / 111 / 52 | `qx-` | `quest-explorers.js` |
| `systems.css` | 19,5 / 204 / 66 | `sys-` | `systems.js` |
| `atlas.css` | 18,9 / 208 / 59 | `atlas-` | El Atlas |

**Tokens.** Sólo `styles.css` define custom properties: 13, en `:root`. `body[data-language='go']` pisa `--accent`, `--accent-dark` y `--accent-soft`.

**Dependencias cruzadas,** que ningún check cubre:
- `lab.css` es dueña de partes del shell:
  - `.lab-nav-count`;
  - `.navigation` en ≤850 y ≤590 px, donde pasa de 2 a 3 columnas;
  - `.sidebar` y `.sidebar-bottom` en ≥981 px;
  - un `touch-action: manipulation` global;
  - `.sr-only`.
- `campaign.css` le da estilo a HTML que dibujan otras vistas: `.quest-banner` (de `lab.js:mapHTML`), `.quest-lab-context` (que campaña y Sistemas insertan en el lab) y `.navigation a:last-child` en ≤650 px.
- `systems.js` usa `.lab-empty`, que está en `lab.css`.

**Orden de carga:** styles → lab → atlas → campaign → quest-explorers → systems.

**Movimiento reducido:**
- la regla global `*` de `styles.css` apaga las transiciones de todas las hojas;
- `lab.css` apaga `.lab-spinner`, y `atlas.css` tiene su propia regla;
- los `transform` de hover están bajo `no-preference`;
- `celebration.ts:celebrate` consulta `matchMedia` en cada llamada.

## 8. Cobertura de QA

| Check | Qué carga | Tipo | Qué pasa al portar |
|---|---|---|---|
| `load-order-check` | El texto de `main.tsx`, «`app.js` último» y «`styles.css` primera» | Estático | Cada port cambia la tabla. El shell React elimina «`app.js` último», y A2 lo vuelve orden de ejecución |
| `boot-check` (10) | `main.tsx` empaquetado sobre `fake-dom`. Navega sólo por hash, con la query vacía | Integración | Pasa, vista por vista, de `innerHTML` a texto de nodos. **Hueco:** nunca dibuja el lab en modo ejercicio ni con `?campana` o `?sistema` |
| `app-shell-check` (51) | `app.js` real con adaptadores falsos (`APP_ADAPTER_METHODS`) | Mixto | Cada página portada pierde sus escenarios. El dominio pasa a `features/progress-backup` y `entities/guide`. Su escenario «g) hitos» es lo único que fija los 10 IDs de hitos |
| `lab-bridge-check` (21) | `campaign.js` y `systems.js` reales, con un `TallerLab` falso | Contrato de HTML y URL | Apuntarlo a las funciones de dominio y a los adaptadores |
| `lab-state-check` (37) | `lab.js` real y el motor | Dominio y UI | El dominio va al almacén, y `openTab` a pruebas de componente o de hook |
| `quest-explorers-check` (47) | `frontend/quest-explorers.js`, por ruta fija | Sobre todo dominio | Pasa al modelo |
| `systems-check`, `project-kit-check` | `lab.js`, por `getExercises` | Dominio | Tienen que usar el catálogo y el almacén importables |
| `runtime-check` (fuera de `npm test`) | `frontend/lab.js` → `buildProgram` | Evidencia real | `buildProgram` tiene que poder importarse |
| `tools/content/dump-globals.ts` | Los adaptadores de catálogos y `atlas-catalog`, en el orden de `main.tsx` | Oráculo | Portar vistas no lo afecta; A2 sí |
| `tools/content/dump-dist-globals.ts` | El dist, por `window.*` | Oráculo | Si se retiran los globals de catálogos, hace falta otro oráculo |
| `campaign`, `systems-*`, `content-*`, `curriculum-*`, `exercise-evidence`, `route-progress`, `versioned-storage`, `shared-lib`, `runner` y `atlas` | Módulos TS | Dominio | Portar vistas no los rompe |

Las vistas legacy no pasan por el verificador de tipos: `frontend/tsconfig.app.json` sólo incluye `src`, y `checkJs` está en false. Portarlas a TSX les da por primera vez tipos estrictos.

## 9. Puntos calientes

Hay 29 avisos de complejidad (regla `complexity`, más de 10), todos en las seis vistas:

| Archivo | Líneas | Avisos | Funciones |
|---|---|---|---|
| `lab.js` | 1 227 | 13 | `onClick` 59 (213 líneas), `reviewHTML` 26, `mapHTML` 17, `runExercise` 17, `onKeydown` 16, `updateRunUI` 15, `sanitizeRecord` 14, `render` 13, `onInput` 13, `testsHTML` 12, `reflectHTML` 12, `explorerHTML` 12 y `exerciseHTML` 11 |
| `app.js` | 750 | 6 | `parseProgress` 22, el delegado de click 17, `renderRoute` 12, `syncLinkedLanguage` 11, `render` 11 y el predicado de `renderResourceResults` 11 |
| `quest-explorers.js` | 296 | 4 | `act` 38, `packetBody` 22, `robotBody` 16 y `packetData` 14 |
| `lab-explorers.js` | 255 | 2 | `body` 34 y `act` 18 |
| `systems.js` | 376 | 2 | `onClick` 30 y `modelView` 11 |
| `campaign.js` | 203 | 2 | `missionHTML` 15 y `onClick` 12 |

**Escritura en cada tecla.** `lab.js:onInput`, `systems.js:onInput` y las notas de `app.js` llaman a `store.write`. Un port con estado controlado tiene que conservar ese comportamiento. Agregar un debounce es un cambio aparte, y antes hay que medir.

## 10. Grafo y orden

| Primero | Después | Por qué |
|---|---|---|
| Extraer el almacén del lab | Campaña, Sistemas y kits | Leen `TallerLab.exportState` y `getExercises` |
| Los puentes como datos puros | Lab, campaña y Sistemas | Rompen el ciclo vista↔vista |
| Los exploradores | — | Migran junto con el lab, porque una raíz React anidada en el `innerHTML` del lab se pierde en cada render. Sus modelos se pueden extraer antes |
| El almacén del recorrido como singleton | Biblioteca, Proyecto, Método y Recorrido | Hoy vive en el cierre de `app.js`, y dos instancias pierden los borrados |
| `features/progress-backup` | Método y el shell | Método es la UI del respaldo de los cuatro almacenes |
| Los motores como singletons importables | Cualquier adaptador nuevo | Dos instancias divergen |

**Pasos acordados:**
0. **Red y seams, sin cambio visible.**
   - E2E con Playwright y POM contra el legacy, que cubra los enlaces `?campana`, `?sistema` y `?ejercicio` y las recargas de los enlaces que cambian la query.
   - Vitest para los dos riesgos altos: la segunda instancia de un almacén y el uso de un motor antes de `init`.
   - Los seams: singletons de motores y almacenes con suscripción, catálogo, `buildProgram`, puentes como datos, gramática de URL, `features/progress-backup`, registro de modelos y modelos de los exploradores.
   - Las dependencias cruzadas del CSS se mueven a la hoja de su dueño.
1. **Biblioteca y Proyecto.** Cada port saca sus ramas de los delegados de `app.js` en el mismo commit.
2. **Sistemas.**
3. **Campaña.** Conserva los métodos que usa `lab.js` hasta que se porte el lab.
4. **Laboratorio con los exploradores,** un hook del editor y `features/run-exercise`, coordinado con A4.
5. **Método, Recorrido y el shell,** con una sola raíz y el router.
   - El router se decide con un spike en este paso.
   - El contrato de hash y query, y `#invitacion=` en el hash, descartan el router por path.
   - Recorrido saca sus clases del `updateTimer` global.

**En paralelo:** A2 temprano, en un boot de `src/app` que después aloja el shell. Las pantallas de login e invitación (A3 y C3):
- o esperan al paso 5;
- o entran como una raíz previa al shell, que borra `#invitacion=` con `replaceState` antes de importar `app.js`.

## 11. Riesgos transversales

- **Orden de evaluación:**
  - `lab.js` arma `byId` y carga su almacén al evaluarse, y `app.js` inicializa los motores y renderiza al evaluarse. A2 tiene que diferir toda esa cadena.
  - Con `target: 'es2020'`, esbuild rechaza el top-level await, así que hacen falta `import()` dinámicos o un boot explícito.
  - No está verificado si un `import()` genera un chunk que `vite-plugin-singlefile` no inlinea. Si pasa, `build-check` falla.
- **IDs y formato:**
  - los 10 IDs de hitos;
  - los exploradores de misión dependen de los números 101 a 106;
  - las URL guardadas llevan IDs;
  - la exportación pone el recorrido en la raíz, más `lab`, `campaign`, `systems` y `exportedAt`, y D1 tiene que importarla sin pérdida.
- **Contratos de HTML:**
  - los de §3.2;
  - `.quest-lab-context` usado como selector;
  - `data-lab-action` dentro de los exploradores;
  - los delegados de `app.js`;
  - el intervalo del temporizador;
  - los conteos fijos del nav.
- **Tamaño:**
  - `build-check` compara `html.length` contra 2 500 000.
  - Después de A1 el HTML pesa unos 2,2 MB, y quedan unos 300 KB de margen. Cualquier dependencia nueva (router, nuqs, Zustand o librerías de test que entren al bundle) hay que medirla antes de A2.
  - La cifra de 2,04 MB de `docs/refactor-roadmap.md` quedó desactualizada.
- **Accesibilidad:**
  - foco explícito después de cada redibujo (13 en el lab, 7 en `app.js` y 6 en Sistemas), que en React necesita refs y `flushSync`;
  - el diálogo de lección devuelve el foco a quien lo abrió;
  - hay regiones vivas que se recrean, y en React conviene mantenerlas montadas;
  - las fases usan dos patrones: tablist con tabindex itinerante en el lab y `aria-pressed` en Sistemas.
- **Movimiento reducido:** depende de la regla global de `styles.css`. No conviene sumar librerías de animación.
- **C4:** la CSP sin `'unsafe-inline'` bloquearía los cuatro `style=` de las plantillas. La prop `style` de React no tiene ese problema.

## 12. Hallazgos por severidad

| Severidad | Dónde | Escenario | Corrección |
|---|---|---|---|
| Alta | `openVersionedStore` en `app.js`, `lab.js` y los motores | Una página React abre su propia instancia, y un favorito que el alumno quitó vuelve a aparecer (verificado) | Un singleton por clave, con suscripción |
| Alta | `app.js`, al evaluarse, llama a los `init` de campaña y Sistemas | Si se mueven a un effect, campaña lanza y Sistemas queda vacío sin error (verificado) | El boot fuera de React o detrás de una compuerta, más un test que monte una vista antes de `init` |
| Media | Los delegados de `app.js` sobre `#main` y `updateTimer` | Doble manejo de eventos en las páginas portadas (inferido) | Sacar sus ramas en el mismo commit, y un caso E2E por página portada |
| Media | `qa/boot-check.ts` | Nunca recorre `?campana`, `?sistema` ni `?ejercicio`, así que un adaptador sin `exerciseContextHTML` rompe el lab sin que falle ningún check | Lo cubren los E2E del paso 0 |
| Media (decisión) | `lab.js`: `isSolved` y `achievementStats` | Un `solvedAt` importado sin evidencia muestra «Resuelto con pruebas» y suma 20 puntos (verificado) | Decidirlo en el clarify |
| Baja | `lab.css` y `campaign.css` | Acotar una hoja cambia la navegación móvil del shell, `.quest-banner` o `.quest-lab-context` | Mover esas reglas a la hoja de su dueño en el paso 0 |
| Baja | `.nav-count` de `index.html` y `campaign.js:render` | Con E1 quedan desactualizados el 4, el 25, el 274, «24 misiones» y «/180» | Derivarlos del catálogo |
| Baja | `app.js:milestones` | Si se retira «g) hitos», 9 de los 10 IDs quedan sin fijar | Un fixture con los 10 IDs |

## 13. No verificado

- La recarga completa en un navegador real.
- Si el `onChange` de React se dispara con los eventos `input` que el editor emite por código. Conviene que el editor exponga un callback.
- El top-level await con rolldown, y los `import()` dinámicos con `vite-plugin-singlefile`.
- Routers y nuqs: no hay ninguno instalado. Context7 dice que el adaptador de nuqs para React Router v6 no soporta HashRouter. El adaptador SPA (`nuqs/adapters/react`) lee `location.search`, que es compatible con «query antes del hash».
- Si se anuncian las regiones vivas que se recrean.
- El tamaño real del build de Vite.
