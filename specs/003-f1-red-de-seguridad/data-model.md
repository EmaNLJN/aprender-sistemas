# Data Model: F1 · Red de seguridad del port del front

Los contratos de la red: qué expone cada pieza, qué valores esperan las pruebas y de dónde sale cada uno. Son las interfaces entre tareas de [plan.md](./plan.md): B las construye (T003) y U, C, P y S las usan. El código de referencia, verificado, está en el plan.

## Las entidades de la spec y dónde viven

| Entidad (spec) | Dónde vive |
| --- | --- |
| Escenario E2E | una prueba de `qa/e2e/specs/*.spec.ts`, en un contexto de navegador nuevo |
| Page Object | una clase de `qa/e2e/pages/`, entregada por una fixture (§1 y §2) |
| Contrato de URL | `qa/e2e/lib/urls.ts` y la tabla de §3 |
| Fixture de progreso congelada | `qa/fixtures/progress-master-2a278ad-storage.json`, que `qa/e2e/lib/curriculum.ts` sólo lee (§5) |
| Doble del compilador | `qa/e2e/fixtures/compiler-double.ts` y `qa/e2e/lib/compiler-results.ts` (§6) |
| Defecto conocido | una prueba con `KNOWN DEFECT` en el nombre y su referencia (§8) |

## 1. Fixtures

`qa/e2e/fixtures/index.ts` exporta `test` (el de Playwright, extendido) y `expect`. Todas las specs importan de ahí.

| Fixture | Tipo | Automática | Qué hace |
| --- | --- | --- | --- |
| `pageIssues` | `PageIssues` | sí | Registra cada `pageerror` y cada `console.error`. Al terminar el test exige que cada uno coincida con `CONSOLE_ALLOWLIST` o con un `expectIssue(patrón, motivo)` del test, y que cada `expectIssue` haya ocurrido. |
| `strictNetwork` | `StrictNetwork` | sí | Aborta con `blockedbyclient` todo pedido cuyo origen no sea el de `baseURL`, guarda su dirección y falla el test si hubo alguno. Los dobles de `compiler`, que son rutas de la página, tienen prioridad. |
| `compiler` | `CompilerDouble` | no | `answer(exercise, kind)` responde el Playground del lenguaje del ejercicio con uno de los cuatro resultados; `hold(exercise)` deja el pedido sin responder; `requests` lista los pedidos que llegaron. |
| `storage` | `StorageControl` | no | `seed(entries)` siembra `localStorage` antes del primer script de la página, una vez por pestaña; `block()` hace que el acceso a `localStorage` lance; `watchWrites()` cuenta los `setItem` y `removeItem` de la página y `writes()` los lee; `snapshot()` devuelve las claves y los textos guardados. |
| `shell`, `lab`, `campaign`, `systems`, `atlas` | Page Objects | no | Uno por cada uno; ver §2. |

**Reglas.**

- `seed` va antes del primer `goto`; `watchWrites`, después de `seed`, para que la siembra no cuente como escritura.
- `expectIssue` es para lo que la prueba provoca a propósito. Hoy sólo lo usan el error de transporte (el navegador registra el pedido abortado como `Failed to load resource: net::ERR_FAILED`) y la prueba de la guarda de red (`net::ERR_BLOCKED_BY_CLIENT`).
- `CONSOLE_ALLOWLIST` está vacía: las ocho vistas arrancan sin un solo error en el Chrome Headless Shell (verificado). Una entrada es deuda visible y lleva su motivo.
- La guarda sólo mira `pageerror` y `console.error`. Una advertencia (`console.warn`) o un aviso en pantalla no la activan.

## 2. Page Objects

Los localizadores salen del rol, la etiqueta o el texto. Donde un elemento no tiene nombre accesible, el Page Object usa su clase o su id, con un comentario. Las aserciones van en la spec.

**`ShellPage`** (`pages/shell.ts`):

| Miembro | Devuelve o hace | Localizador |
| --- | --- | --- |
| `menu` | el menú | `navigation` «Navegación principal» |
| `languages` | el selector de idioma | `group` «Lenguaje del recorrido» |
| `toast` | el aviso del shell | `#toast` (no tiene nombre y la página tiene otras regiones `status`) |
| `body` | el `<body>` | `body` |
| `goto(url)` | navega | `page.goto` |
| `menuLink(view)` | el enlace de una vista | `link` por el texto de la entrada, dentro de `menu` |
| `openFromMenu(view)` | hace clic en él | |
| `heading(view)` | el título de la vista | `heading` de nivel 1, con una expresión tolerante al `<br>` |
| `languageButton(language)` | el botón «Rust» o «Go» | `button` exacto, dentro de `languages` |
| `switchLanguage(language)` | hace clic en él | |
| `saveStatus(texto)` | el pie «Guardado en este navegador» o «Exportá para conservar tu avance» | `getByText` exacto |

**`LabPage`** (`pages/lab.ts`):

| Miembro | Devuelve o hace | Localizador |
| --- | --- | --- |
| `tab(phase)` | la pestaña de una fase | `tab` «Descubrí», «Experimentá» o «Explicá» |
| `exerciseTitle()` | el título del ejercicio | `heading` de nivel 1 |
| `startButton()` | el botón del mapa que abre el desafío del día | `button` «Entrar al laboratorio» o «Seguir aprendiendo» |
| `editor(language)` | el editor de código | `textbox` «Editor de código Rust» o «Editor de código Go» |
| `writeDraft(language, text)` | reemplaza el borrador | clic, `ControlOrMeta+A` e `insertText` |
| `runButton()` y `runCode()` | el botón y su clic | `button` «▷ Ejecutar y revisar» |
| `review()` y `reviewHeading()` | el panel del revisor y su título | `complementary` «Revisión del ejercicio» y su primer `heading` de nivel 3 |
| `contextBlock()` | el bloque de contexto de campaña o de Sistemas | `.quest-lab-context` (sin rol ni nombre; el contrato de puente lo nombra así) |
| `contextBackLink()` | el enlace de regreso del bloque | `link` que empieza con «←», dentro del bloque |
| `campaignLockHeading()` y `campaignLockMapLink()` | el título del bloqueo y su enlace | `heading` «Primero, las piezas…» y `link` «Ver mi mapa» |
| `position()` | el contador «n / total» de la lista navegable | `getByText` con `^\d+ / \d+$` |
| `nextButton()` y `previousButton()` | los botones de la lista | `button` «Ejercicio siguiente» y «Ejercicio anterior» |
| `backButton()` | el botón de regreso | `button` que empieza con «← Volver al» |

**`CampaignPage`** (`pages/campaign.ts`):

| Miembro | Devuelve | Localizador |
| --- | --- | --- |
| `freeLabLink()` | el enlace del «laboratorio libre» | `link` «laboratorio libre» |
| `world(title)` | la región de un mundo | `region` con el título del mundo |
| `missionCard(title)` | la tarjeta de una misión | `article` con un `heading` de nivel 4 con ese título |
| `missionLink(title)` | el enlace de la tarjeta | `link`, dentro de la tarjeta |
| `checkpoint()` | la región del checkpoint | `region` «El código funciona. ¿Sabés por qué?» o «Una idea que ya podés explicar.» |
| `checkpointOption(letter)` | la opción A, B o C | `button` que empieza con la letra, dentro del checkpoint |

**`SystemsPage`** (`pages/systems.ts`):

| Miembro | Devuelve o hace | Localizador |
| --- | --- | --- |
| `search()` | el buscador del catálogo | `searchbox` «Buscar talleres de sistemas» |
| `emptyCatalog()` | el título del estado vacío | `heading` «No aparece ese taller.» |
| `workshopCard(title)` | la tarjeta de un taller | `article` con un `heading` de nivel 2 con ese título |
| `openWorkshop(title)` | abre el taller | `button` «Explorar →», dentro de la tarjeta |
| `workshopHeading(title)` | el título del taller abierto | `heading` de nivel 1 |
| `part(part)` | la pestaña de una parte | `button` «Manipulá el sistema», «Programá su núcleo» o «Llevátelo a un proyecto» |
| `seals()` | los tres sellos del taller | `getByLabel('Progreso del taller')` |
| `enterIde()` | el enlace al núcleo | `link` «Entrar al IDE» |
| `modelButton(name)` | un botón del modelo («Leer A») | `button` exacto |
| `traceEntries()` | los pasos del modelo | `.sys-trace li` (sin rol ni nombre) |
| `note()` | la nota del taller | `textbox` «Dejá tu próximo experimento por escrito» |

**`AtlasPage`** (`pages/atlas.ts`):

| Miembro | Devuelve | Localizador |
| --- | --- | --- |
| `concept(number)` | el concepto del índice por su número («01», «03»…) | `button` que empieza con el número |
| `labLink()` | el enlace al laboratorio del concepto elegido | `link` «Ir al laboratorio» |

## 3. El contrato de URL

Las escribió a mano `lib/urls.ts` a partir del README y del [mapa](../front-react/legacy-map.md), §4. La vista va en el hash y los parámetros, en la query antes del hash. Las escrituras de la app usan `history.replaceState`.

| Forma | La escribe | Qué pasa al cargarla | Spec |
| --- | --- | --- | --- |
| `#recorrido`, `#biblioteca`, `#proyecto`, `#metodo`, `#atlas`, `#campana`, `#sistemas`, `#laboratorio` | el menú y los enlaces internos | abre la vista y marca su entrada con `aria-current`; un hash desconocido cae en `#recorrido` | `views` |
| `?ejercicio=<id>&paso=<learn\|code\|reflect>#laboratorio` | el laboratorio al abrir un ejercicio, y el Atlas | abre el ejercicio en esa fase y fija el idioma del ejercicio, aunque el progreso guardado diga otro; un ID desconocido abre el mapa y borra la query; una fase desconocida abre `learn` y reescribe la URL | `url-contract` |
| `?campana=<mundo>&ejercicio=<id>&paso=learn#laboratorio` | campaña (`missionURL`) | lista navegable de las seis misiones del mundo, bloque de contexto con el regreso `?mundo=<mundo>#campana`; si la misión no está habilitada, el bloqueo reemplaza al laboratorio | `url-contract`, `bridges` |
| `?sistema=<taller>&ejercicio=<id>&paso=code#laboratorio` | Sistemas (`codeURL`) | lista navegable de las herramientas del taller y su núcleo, y bloque de contexto de Sistemas con el regreso `?taller=<taller>&parte=build&lenguaje=<idioma>#sistemas` | `url-contract`, `bridges` |
| `?mundo=<mundo>#campana` | campaña | abre ese mundo y fija su idioma; un mundo desconocido deja el primero abierto y la URL igual | `url-contract` |
| `?lenguaje=<rust\|go>&taller=<id>&parte=<explore\|build\|ship>#sistemas` | Sistemas y el cambio de idioma | abre ese idioma, taller y parte; un taller desconocido abre el catálogo | `url-contract` |
| `?#laboratorio` | el menú y el «laboratorio libre» | abre el mapa del laboratorio y la query desaparece (queda `/#laboratorio`) | `url-contract` |
| `#invitacion=<token>` | (futuro: C3a y F11) | hoy cae en `#recorrido` y el token queda en la URL | no se prueba |

**El cambio de idioma** (`app.js`): en `#sistemas` suma `lenguaje` a la query y conserva el resto; en las otras siete vistas la vacía. Lo prueba `url-contract`, una vista por prueba, porque el idioma queda guardado y un segundo clic en el mismo botón no hace nada.

**Valores de los escenarios** (los títulos de los ejercicios salen de la fixture `curriculum-ids.json`; los de mundos y talleres, del contenido, y están escritos en las specs):

| Dato | Valor |
| --- | --- |
| Misión habilitada de Rust | `rust-02` «Repará el contador inmutable», en `rust-world-1` «Estación del robot» (seis misiones: `rust-02`, `rust-06`, `rust-22`, `rust-101`, `rust-102`, `rust-103`) |
| Misión sin habilitar | `rust-103` (el jefe de `rust-world-1`), y `rust-18` de `rust-world-2` «Puerto de señales» sin el progreso de master |
| Mundo de Go | `go-world-1` «La estación del rover» |
| Taller y núcleo | `cache` «Una caché que aprende tus visitas»: herramientas `rust-31` y `rust-35`, núcleo `rust-113`; en Go `go-31`, `go-35` y `go-113` (los dos núcleos se llaman «Núcleo · Reproducí una traza LRU») |
| Ejercicio de los dos contextos | `rust-22`: misión de `rust-world-1` y herramienta del taller `transforms` «Coreografía de matrices» (lista de cuatro; está en la posición 2) |
| Conceptos del Atlas | `rust-identity` → `rust-37`, `rust-syntax` → `rust-04` y `go-identity` → `go-01`, según la fixture |

## 4. Los enlaces que cambian la query, y el estado en memoria

El mapa supone, sin haberlo probado, que un enlace que cambia la query recarga el documento. Al planificar se midió con un marcador en `window`: los 11 recargan, y los de sólo hash no. `reload.spec.ts` los fija con esta tabla.

| ID | Enlace | Desde | Llega a | ¿Recarga? |
| --- | --- | --- | --- | --- |
| L1 | menú «Laboratorio» | `/#recorrido` | `/#laboratorio` | sí |
| L2 | menú «Laboratorio», dentro de una misión | `/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio` | `/#laboratorio` | sí |
| L3 | «laboratorio libre» de la campaña | `/#campana` | `/#laboratorio` | sí |
| L4 | «Abrir misión ↗» de «Repará el contador inmutable» | `/#campana` | `/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio` | sí |
| L5 | regreso al mundo, del bloque de contexto | la misión de L2 | `/?mundo=rust-world-1#campana` | sí |
| L6 | «Ver mi mapa →» del bloqueo | `/?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio` | `/?mundo=rust-world-1#campana` | sí |
| L7 | «Entrar al IDE ↗» de Sistemas | `/?lenguaje=rust&taller=cache&parte=build#sistemas` | `/?sistema=cache&ejercicio=rust-113&paso=code#laboratorio` | sí |
| L8 | regreso al taller, del bloque de contexto | el núcleo de L7 | `/?taller=cache&parte=build&lenguaje=rust#sistemas` | sí |
| L9 | «Ir al laboratorio ↗» del Atlas | `/#atlas` | `/?ejercicio=rust-37&paso=learn#laboratorio` | sí |
| L10 | «← Volver al mapa», dentro de una misión | la misión de L2 | `/?mundo=rust-world-1#campana` | sí |
| L11 | «← Volver al taller», dentro de un núcleo | el núcleo de L7 | `/?taller=cache&parte=build&lenguaje=rust#sistemas` | sí |
| C1 | menú «Biblioteca» | `/#recorrido` | `/#biblioteca` | no |
| C2 | cambio de idioma en `#biblioteca` | `/?basura=1#biblioteca` | `/#biblioteca` | no |
| C3 | abrir un ejercicio desde el mapa | `/#laboratorio` | `/?ejercicio=rust-01&paso=learn#laboratorio` | no |

**Cómo se detecta.** `observeReload(page, acción)` pone `window.__e2eMarker = true`, ejecuta la acción, espera el evento `load` y devuelve `true` si el marcador desapareció. Playwright espera a que una navegación que inicia la acción se confirme antes de volver del clic, y `load` deja asentado el documento nuevo. Ninguna prueba espera por tiempo.

**El estado en memoria** (mapa, §5) se conserva en una navegación de hash y se pierde con una recarga:

| Estado | Navegación de hash | Recarga | Cómo se mide |
| --- | --- | --- | --- |
| Temporizador de foco | sigue corriendo: `24:00` y «Pausar» | vuelve a `25:00` y «Iniciar foco» | `page.clock` instalado a las 12:00:00 y pausado a las 12:00:01; clic en «Iniciar foco» y `runFor(60_000)` |
| Sesión del Atlas | el concepto `03` sigue elegido | vuelve al `01` | `aria-current` del concepto |
| Simulación de Sistemas | la traza del modelo sigue | la traza queda vacía | `traceEntries()` tras «Leer A» |

## 5. El progreso sembrado

Las cuatro claves de `localStorage` y la fixture que las siembra: `qa/fixtures/progress-master-2a278ad-storage.json`, progreso real de master. Los valores son los textos exactos que escribió master, y la fixture está congelada: no se edita ni se regenera.

| Clave | Qué trae la fixture |
| --- | --- |
| `taller-learning-v1` | idioma `go`; pasos `rust-first-session` y `rust-ownership`; hito `rust-memory`; favorito `rust-100` |
| `taller-laboratorio-v1` | 11 registros; seleccionados `rust-137` y `go-01`; resueltos las seis misiones de `rust-world-1` (`rust-02`, `rust-06`, `rust-22`, `rust-101`, `rust-102`, `rust-103`), `rust-09`, `rust-137` y `go-01` |
| `taller-campaign-v1` | los sellos de esas misiones y el checkpoint de `rust-world-1` aprobado, así que el mundo 2 está abierto |
| `taller-systems-v1` | el taller `rust:pc` con sus tres sellos |

Qué siembra cada prueba:

| Prueba | Claves | Para qué |
| --- | --- | --- |
| `startup-storage`, arranque | las cuatro | el arranque no escribe, no respalda y no avisa; el texto de las cuatro claves no cambia |
| `startup-storage`, checkpoint | sólo `taller-laboratorio-v1` | las seis misiones resueltas abren el checkpoint del mundo 1; la campaña parte vacía |
| `url-contract`, «el idioma del enlace gana» | sólo `taller-learning-v1` | el progreso guardado dice Go y el ejercicio es de Rust |
| `bridges`, «una misión del mundo 2» | las cuatro | con el mundo 1 completo, las misiones del mundo 2 están abiertas |

**Mecanismo.** `seed` registra un script de inicio del contexto que escribe las claves y marca `sessionStorage` para no repetir la siembra al recargar: la marca sobrevive a una recarga y un contexto nuevo empieza vacío. `watchWrites` registra otro script, después, que envuelve `Storage.prototype.setItem` y `removeItem` y anota las claves de `localStorage` en `window.__e2eStorageWrites`. Una recarga empieza el registro de nuevo, por eso la prueba del arranque recorre las vistas con navegaciones de hash.

**Almacenamiento bloqueado.** `block` define `window.localStorage` con un `get` que lanza una `DOMException`, como un navegador con el almacenamiento deshabilitado (ADR 0003, estado `unavailable`).

## 6. Los ejercicios y los resultados del compilador

Los dos ejercicios tienen tres pruebas, `t1`, `t2` y `t3` (en `content/<lenguaje>/exercises/<id>/exercise.yaml`):

| Ejercicio | Lenguaje | Lo usa | Playground simulado |
| --- | --- | --- | --- |
| `rust-02` | Rust | la misión de campaña de `cycle` y la prueba de la guarda de red y del indicador de ejecución | `POST https://play.rust-lang.org/execute` |
| `go-113` | Go | el núcleo de Sistemas de `cycle` | `POST https://play.golang.org/compile` |

**El marcador.** El laboratorio aprueba con exactamente un marcador `PASS` por cada prueba esperada: una línea `__TALLER_TEST__<id>:<PASS|FAIL>` en la salida estándar (ADR 0003, punto 7, y `qa/exercise-evidence-check.ts`). El ADR 0005, §5, describe otro formato (con nonce) que es el del servidor de A4 y no el que manda hoy el cliente.

**Los cuatro resultados**, armados a mano en `lib/compiler-results.ts`:

| Resultado | Rust (`/execute`) | Go (`/compile`) |
| --- | --- | --- |
| Aprobado | `{ success: true, exitDetail: '', stdout, stderr: '' }`, con `stdout` igual a `__TALLER_TEST__t1:PASS`, `__TALLER_TEST__t2:PASS` y `__TALLER_TEST__t3:PASS`, una por línea | `{ Errors: '', Events: [{ Message: stdout, Kind: 'stdout', Delay: 0 }], Status: 0, IsTest: false, TestsFailed: 0 }`, con el mismo `stdout` |
| Prueba fallida | igual, con `t2` en `FAIL` | igual, con `t2` en `FAIL` |
| Error de compilación | `` { success: false, exitDetail: 'exit status: 101', stdout: '', stderr: 'error[E0384]: cannot assign twice to immutable variable `nivel`' } `` | `{ Errors: 'prog.go:12:2: declared and not used: x', Events: null, Status: 2, IsTest: false, TestsFailed: 0 }` |
| Error de transporte | el pedido se aborta (`route.abort('failed')`) | el pedido se aborta |

El doble responde `PASS` aunque el código inicial no compile: lo que se prueba es qué hace el cliente con la respuesta, no el compilador. Playwright agrega los encabezados CORS cuando responde un pedido de otro origen (verificado: sin ninguno, el pedido se acepta), así que el doble no los pone.

**Lo que ve el alumno**, que `cycle.spec.ts` comprueba:

| Ejercicio | Resultado | Título del revisor | Texto que aparece |
| --- | --- | --- | --- |
| `rust-02` | aprobado | La idea funciona en estos casos. | Ahora la declaración anticipa las modificaciones. |
| `rust-02` | prueba fallida | 2 de 3: encontramos algo para explorar. | Inicializá nivel con inicial. |
| `rust-02` | error de compilación | El programa nos dejó una pista. | Estás intentando modificar un binding o acceder con mutabilidad |
| `go-113` | aprobado | La idea funciona en estos casos. | La traza distingue actualización de recencia, expulsión y capacidad cero. |
| `go-113` | prueba fallida | 2 de 3: encontramos algo para explorar. | Contá los misses incluso si no insertás. |
| `go-113` | error de compilación | El programa nos dejó una pista. | Go detectó una variable local o un import que no se usa. |
| los dos | error de transporte | No pude ejecutar esta vez. | No se pudo conectar al Playground. |

Después del resultado, al volver con el enlace del bloque de contexto: la misión de `rust-02` muestra `20/30 XP` y `✓ Pruebas · 20` si aprobó (y el aviso «+20 XP. Tu progreso de campaña está actualizado.»), o `0/30 XP` y `○ Pruebas · 20` si no; y el sello «Código verificado» del taller `cache` lleva `✓` sólo si el núcleo `go-113` aprobó.

## 7. El contrato de CSS

Los nueve grupos de reglas que el [mapa](../front-react/legacy-map.md) (§7) lista como cruzadas entre hojas y un décimo, R10, que el mapa omite. Los nombres R1 a R10 son de este cuadro y de los tests, no de las secciones de [research.md](./research.md). Los valores son los que dicen las hojas y los que midió el build al planificar. Los anchos son los de las media queries que cambian el diseño. `HEIGHT` es 900 px. F2 mueve las reglas a la hoja de su dueño y los valores no pueden cambiar.

| Grupo | Dónde se mide | Valores computados esperados |
| --- | --- | --- |
| **R1** `.lab-nav-count` (`lab.css`) | el contador de la entrada del menú, en `#recorrido` (no es la actual) y en `#laboratorio` (la actual) | en `#recorrido`: `background-color rgb(172, 72, 41)`, `color rgb(255, 249, 239)`, `border-radius 9px`, `padding 1px 6px`, `opacity 1`. En `#laboratorio`: `background-color rgb(212, 162, 128)` y `color rgb(34, 43, 35)` |
| **R2** `.navigation` (`lab.css` a 850 y 590 px, sobre `styles.css`) | `#laboratorio`, a 981, 850, 650 y 590 px | a 981: `display flex`, `flex-direction column`, `gap 8px`; enlaces `font-size 13px`, `padding 11px 10px`, `gap 12px`, `min-height auto`; `.nav-count` en `block`. A 850 y 650: `flex`, `row`, `3px`; enlaces `10px`, `8px`, `6px`, `auto`; `.nav-count` en `none`. A 590: `display grid`, `row`, `3px` y tres columnas; enlaces `10px`, `8px 5px`, `5px`, `min-height 40px`; `.nav-count` en `none`. El `font-size` de `.nav-symbol` (los dos primeros valores vienen de `styles.css`): `20px` a 981, `16px` a 850 y 650, y `14px` a 590 |
| **R3** `.sidebar` y `.sidebar-bottom` (`lab.css`, desde 981 px) | `#recorrido`, a 981 y 850 px | a 981: `.sidebar` con `overflow-y auto` y `min-height 0px`; `.navigation` con `flex-shrink 0`; `.sidebar-bottom` con `padding-top 30px` y `display block`. A 850: `overflow-y visible`; `.sidebar-bottom` con `padding-top 42px` y `display none` |
| **R4** `touch-action` (`lab.css`, global) | `#biblioteca` | `manipulation` en el primer `button`, el primer `link`, el `searchbox`, el primer `combobox` y el primer `summary`; `auto` en el primer `div` de `main` |
| **R5** `.sr-only` (`lab.css`) | `#biblioteca` | `position absolute`, `width 1px`, `height 1px`, `padding 0px`, `margin -1px`, `overflow hidden`, `clip rect(0px, 0px, 0px, 0px)`, `white-space nowrap`, `border-top-width 0px` |
| **R6** `.quest-banner` (`campaign.css`) | el mapa del laboratorio, a 981 y 650 px | `display flex` a 981 y `block` a 650; siempre `justify-content space-between`, `align-items center`, `gap 20px`, `padding 20px 24px`, `border-radius 6px`, `margin 25px 0px`; su `.button` con `flex-shrink 0` y `margin-top 0px` a 981 y `14px` a 650 |
| **R7** `.quest-lab-context` (`campaign.css`) | la misión `rust-02`, a 981 y 650 px | a 981: `gap 13px`, `font-size 10px`, `line-height 18px`; a 650: `8px`, `9px`, `16.2px`; siempre `display flex`, `flex-wrap wrap`, `justify-content space-between`, `padding 14px 17px`, `border-radius 5px`, `margin 0px 0px 20px`, `background-color rgb(232, 236, 223)`; su enlace con `color rgb(172, 72, 41)` y `font-weight 600` |
| **R8** `.navigation a:last-child` (`campaign.css` a 650 px y `lab.css` a 590 px) | `#recorrido`, a 650 y 590 px | `grid-column-start auto` y `grid-column-end auto`. **Código muerto:** las dos copias repiten el valor inicial y ninguna regla le da otra columna a los enlaces; la prueba sólo falla si cambia el valor de la copia que gana (la de `campaign.css`) |
| **R9** `.lab-empty` (`lab.css`, lo usa Sistemas) | el catálogo de Sistemas con la búsqueda «zzzz», a una sola anchura | `grid-column-start 1`, `grid-column-end -1`, `text-align center`, `padding 40px`, `border-top-style dashed`, `border-top-width 1px`, `border-top-left-radius 5px`; `h2` con `font-size 23px` y `p` con `12px` |
| **R10** `.quest-direct-lock` (`campaign.css`; el mapa no la lista y la dibuja el laboratorio) | `?campana=rust-world-1&ejercicio=rust-103#laboratorio` con el progreso vacío: el mundo está abierto y la misión no, así que el bloqueo reemplaza al laboratorio. Una sola anchura: las reglas no tienen media query y los valores fueron los mismos a 1 280, 981, 850, 650 y 590 px | `h1` con `font-size 40px`, `letter-spacing -1.4px` y `line-height 44px`; `h1 em` con `font-family Georgia, "Times New Roman", serif`, `font-weight 400` y `color rgb(172, 72, 41)`; `p` y `li` con `font-size 13px` y `line-height 24.7px`; `ul` con `margin 25px 0px` |
| **Movimiento reducido** (`styles.css`) | `#campana`, con `reducedMotion` en `reduce` y en `no-preference` | con `reduce`: `html` con `scroll-behavior auto`, `.button` con `transition-property none` y `transition-duration 0s`, y `.world-node` con `transition-property none`. Con `no-preference`: `smooth`, `.button` con `background` y `.world-node` con `transform, box-shadow` |
| **Indicador de ejecución** (`lab.css`) | el laboratorio con el pedido del compilador sin responder (`compiler.hold`) | `.lab-spinner` con `animation-name none` con `reduce` y `lab-spin` con `no-preference` |

**Qué no se mide.** El ancho de las columnas de la navegación a 590 px (sólo que son tres, porque el valor en píxeles depende del ancho) ni la familia tipográfica, salvo la de `h1 em` en R10, porque es lo que esa regla declara: el navegador informa la lista declarada y no la fuente que use el sistema. Las propiedades elegidas no dependen del sistema operativo ni de las fuentes.

## 8. Defectos conocidos

Las pruebas que fijan un comportamiento no deseado, tal como está. Llevan `KNOWN DEFECT` en el nombre y su referencia. Quien lo corrige cambia esa prueba en su commit TDD.

| ID | Prueba | Qué fija | Referencia | Quién la cambia |
| --- | --- | --- | --- | --- |
| KD1 | `route-store-instances.spec.ts` | dos instancias del almacén del recorrido sobre un mismo almacenamiento se comportan como dos pestañas: el favorito que la primera quitó reaparece cuando la segunda guarda | mapa, §5 y §12 (severidad alta, verificado) | F2, unidad 1 (un almacén por clave): la invierte |
| KD2 | `engine-init-order.spec.ts` (campaña) | el motor lanza «Inicializá la campaña antes de usarla.» en `getWorlds`, `refreshFromLab` y `canAttempt` antes de `init` | mapa, §2.3 y §12 (severidad alta, verificado) | F2, unidad 3 (arranque explícito) |
| KD3 | `engine-init-order.spec.ts` (Sistemas) | el motor devuelve `[]` sin error antes de `init` | mapa, §2.3 | F2, unidad 3 |
| KD4 | `bridges.spec.ts` | con `campana` y `sistema` juntos, el bloqueo de campaña va primero y reemplaza al laboratorio cuando el ejercicio no es misión de ese mundo; el mapa (§3.2) describe sólo la prioridad de Sistemas en el bloque de contexto | hallazgo de F1 | F7: el laboratorio decide la prioridad |
| KD5 | `views.spec.ts` | `<body>` lleva `aria-pressed`, porque `app.js` marca todo `[data-language]` y el `body` también lo tiene | hallazgo de F1 | F10 (el shell) |

El CSS muerto de R8 no es una prueba `KNOWN DEFECT`: está anotado en su spec y F2 puede borrar las dos copias sin cambio visible.

## 9. Las guardas

**`pageIssues`.** Escucha `pageerror` y `console` (sólo el tipo `error`) desde que se crea la fixture. Al terminar el test, `assertClean()` filtra lo registrado contra `CONSOLE_ALLOWLIST` y los `expectIssue` del test. Falla si queda algo o si un `expectIssue` no ocurrió.

**`strictNetwork`.** `StrictNetwork.install` registra una ruta de contexto para todo pedido cuyo origen no sea el de `baseURL`. La ruta aborta el pedido y anota su método y su dirección. Al terminar, `assertNothingBlocked()` falla si la lista no está vacía. El mismo origen pasa, así que un archivo aparte de `dist/` (por ejemplo `/content/curriculum.<versión>.json`) no se bloquea.

**La prueba de las guardas.** `guards.spec.ts` provoca cada falla (un `console.error`, una excepción de la página, un pedido a un host público sin doble y un `expectIssue` que nunca ocurre) dentro de `test.fail()`, que exige que el test falle. Si una guarda deja de actuar, su prueba pasa y Playwright informa «Expected to fail, but passed.».

## 10. Las dos specs de Vitest

| Spec | Importa | Contrato que fija |
| --- | --- | --- |
| `frontend/src/entities/guide/model/route-store-instances.spec.ts` | `openVersionedStore` y `StorageLike` de `shared/lib/versioned-storage`, y `mergeRouteProgress` de `./route-progress` | KD1. Dos instancias con la clave `taller-learning-v1` sobre un `StorageLike` en memoria compartido. La primera quita el favorito `rust-100` y completa un paso; la segunda, que no lo sabe, guarda una nota. Resultado: el paso y la nota están, y el favorito volvió. El `parse` es el de la spec y el `merge` copia `mergeStoredRoute` de `app.js`, porque ninguno de los dos se puede importar sin cambiar producción |
| `frontend/src/app/engine-init-order.spec.ts` | `createCampaignEngine` de `entities/campaign` y `createSystemsEngine` de `entities/systems-workshop` | KD2 y KD3. El motor de campaña lanza «Inicializá la campaña antes de usarla.» en `getWorlds('rust')`, `refreshFromLab(null)` y `canAttempt('rust-02', 'rust')`; el de Sistemas devuelve `[]` en `list('rust')` |
