# Research: F7b · La vista del laboratorio

**Feature**: [spec.md](./spec.md) (spec 021, la parte F7b de P2) | **Plan**: [plan-f7b.md](./plan-f7b.md) | **Fecha**: 2026-10-28

Este documento junta las decisiones técnicas de F7b con sus alternativas, la tabla de las consultas a Context7 y lo que se midió. El plan remite acá con la sigla de cada decisión (R1 a R16).

F7b se apoya en tres planes que todavía no están en `master`; se citan sin enlace:

- **F7a:** `specs/021-f7-laboratorio/plan.md` y `contracts/run-exercise.md` de la rama `plan/f7a-laboratorio`;
- **F5:** `specs/018-f5-sistemas/plan.md` y `contracts/taller-systems.md` de la rama de su plan;
- **F6:** `specs/019-f6-campana/plan.md` y `contracts/campaign-interfaces.md` de la rama de su plan.

## Cómo se verificó

Se planificó sin tocar el código de `master` y sin descargar nada. El prototipo se armó en una copia descartable, fuera del repositorio, con el `node_modules` de otro worktree enlazado y el Chrome Headless Shell que ya estaba en la caché de Playwright:

- **La base del prototipo** es la copia en la que el plan de F7a corrió entero (`master` con F2a, A2 y F2b, más todo F7a), con su propio `git init`. Contra esa base corrieron los 184 E2E de F1, A2 y F7a antes de tocar nada.
- **F5 y F6 no existen como código.** El prototipo los simula en dos commits aparte, que no son parte del plan:
  - `missionTypeLabel` en `entities/campaign`, con el texto que fija el contrato de F6 (su §1);
  - los métodos que sólo leía el laboratorio salen de `frontend/campaign.js` y `frontend/systems.js`, que hacen de los adaptadores de F5 y F6.

  Los diffs de T027 sobre `register-systems.tsx`, `campaign-bridges.ts` y `register-campaign.tsx` se escribieron contra el código que traen los planes de F5 y F6, y **no corrieron**.
- **El prototipo es el plan.** Cada archivo nuevo y cada diff de F7b que trae el plan corrió así como está escrito, formateado con Prettier.
- **Lo que corrió sobre el estado final:**
  - `npm test` en verde: 37 checks; 45 archivos y 878 pruebas de Vitest (5 archivos y 35 pruebas nuevas, todas de modelo);
  - `npm run typecheck`, `npm run lint` (0 errores, 19 avisos) y `prettier --check`;
  - `npm run build`;
  - los E2E: **193 de 193** (los 123 de F1 y A2, los 61 de F7a sin editar y 9 nuevos);
  - los 7 E2E de X1 contra el legacy de F7a: **7 en rojo, cada uno por la razón de X1** (el foco que se pierde, el panel que se cierra o el estado del filtro sin la búsqueda);
  - las cinco comparaciones únicas de quickstart-f7b.md §3, todas con 0 diferencias fuera de la lista:
    - el DOM, en 39 estados, con los seis del revisor;
    - las trazas de los exploradores, en los 274 ejercicios (720 pasos);
    - el barrido de estilo computado, en 468 capturas;
    - las escrituras de 22 secuencias, con 51 `set taller-laboratorio-v1` iguales byte a byte (SC-003);
    - la exportación de las tres fixtures congeladas después de recorrerlas, sin escrituras (SC-012);
  - los 11 diffs del plan, que se aplican con `git apply`, en orden, sobre la base de F7a;
  - el control negativo del barrido: un texto partido en `.topic-fraction` da 784 diferencias a 1200 px, y el DOM ninguna;
  - las mutaciones, cada una detectada por la prueba que la vigila:
    - `replaceText` sin la anotación: fallan dos E2E de F7a que cuentan las escrituras;
    - el `select` del explorador genérico sin el foco explícito: falla su E2E de F7a;
    - `window.TallerLab` congelado: fallan dos escenarios de `boot-check`, que espía `init`;
    - `lab-api.ts` con el índice de `entities/campaign`: fallan el aislamiento de `lab-state-check` y R4 de `seams-guard-check`;
    - el registro vacío creado aunque haya bloqueo, el nivel reiniciado al cambiar de idioma y el estado del filtro sin la búsqueda: falla, en cada caso, su spec de modelo.
- **Lo que no corrió:**
  - las specs de componente (jsdom y Testing Library no están instalados y no se descarga nada: R15);
  - los diffs sobre los archivos de F5 y F6;
  - la rama B de C4 (A4 no tiene plan);
  - Docker, la CI, macOS y la comprobación con lector de pantalla (X2), que es del usuario.

## Línea base de planificación

Medida en la copia con F7a. T018 la vuelve a medir sobre la base real (`master` con F7a, F5 y F6).

| Qué | Valor |
| --- | --- |
| `npm run lint` | 0 errores, 32 avisos |
| Avisos de los tres archivos legacy | 13: en `lab.js`, `render` 13, `mapHTML` 14, `exerciseHTML` 11 y los demás que dejó F7a; en `lab-explorers.js`, `body` 26; en `quest-explorers.js`, `robotBody` 16, `packetBody` 22 y `act` 19 |
| E2E | 184: 106 de F1, 17 de A2 y 61 de F7a |
| `npm test` | 39 checks; 40 archivos y 843 pruebas de Vitest |
| `lab-state-check` | 39 escenarios |
| `dist/index.html` | `html.length` 1 144 712 |
| Aporte al paquete de `main.tsx` (esbuild minificado, `metafile`) | `lab.js`, `lab-explorers.js`, `quest-explorers.js` y `register-editor.ts`: 66 773 bytes |

**Después del prototipo:**

| Qué | Valor |
| --- | --- |
| `npm run lint` | 0 errores, 19 avisos: salen los 13 de los tres archivos y no entra ninguno |
| E2E | 193: los 184 y 9 nuevos (`lab-react.spec.ts` 7 y `lab-explorer-focus.spec.ts` 2) |
| `npm test` | 37 checks (salen `lab-bridge-check` y `quest-explorers-check`); 45 archivos y 878 pruebas de Vitest |
| `lab-state-check` | 33 escenarios (R10) |
| `load-order-check` | 21 imports, 16 restricciones de orden y 1 de etapas |
| `dist/index.html` | `html.length` 1 160 293 (+15 581) |
| Aporte al paquete | `pages/lab` 82 539 bytes y el adaptador 1 971: +17 737 sobre los 66 773 que se van (R12) |

## R1. La raíz de composición, partida en dos módulos (FR-009, FR-014, FR-044 y riesgo 12)

**El problema.** La raíz que hoy es `lab.js` hace dos cosas: publica los ocho métodos que no dibujan (`init`, `loadWarning`, `getExercises`, `exportState`, `planImport`, `applyImport`, `backups` y `reset`) y dibuja. Los checks evalúan la primera parte junto con `register-campaign-engine.ts` y `register-systems-engine.ts` (`qa/lib/import-cases.ts`, `lab-state-check`). Si el adaptador empaquetara la página, que importa los índices de los motores, el contexto del check terminaría con dos motores (spec de F2, FR-018).

**Decisión.** Dos módulos, el patrón de F6 (`campaign-bridges.ts` y `register-campaign.tsx`):

- **`frontend/src/app/legacy/lab-api.ts`**, sin React:
  - es el dueño del índice de `entities/exercise` (`INDEX_OWNERS.exercise` pasa de `lab.js` a este archivo);
  - crea el runner de F7a con el adaptador de los Playgrounds y `buildPlaygroundProgram`: son las dos líneas que cambia A4;
  - guarda la sesión del laboratorio entre montajes;
  - exporta `labApi`, con los ocho métodos.

  `reset` borra el almacén, deja la sesión en el mapa y aborta la ejecución sin evaluar la vista ni un motor (FR-014 y FR-021).
- **`frontend/src/app/legacy/register-lab.tsx`** monta la página y publica `window.TallerLab = { ...labApi, mount, unmount }`. Es el único que importa `pages/lab`.

**Las dependencias del runner llegan por `window`.** El runner necesita el bloqueo, si el ejercicio es una misión y las dos sincronizaciones. `lab-api.ts` está en `app/`, así que R4 no lo deja importar el índice de un motor: los lee de `window.TallerCampaignEngine` y `window.TallerSystemsEngine`, que quedan hasta F10, al llamar y nunca al evaluarse. `syncSystems` y `syncCampaign` son `engine.syncLab(labStore.exportState())`, lo mismo que hacen hoy `TallerSystems.sync()` y `TallerCampaign.sync()`. El bloqueo usa `campaignLock` de la página, una función pura que recibe el motor por parámetro y llega por `pages/lab/composition.ts`, una entrada sin vista ni motor.

**La lectura de FR-009.** La spec pide que la página reciba «el puerto de transporte» por props. La página recibe el runner que la raíz armó con ese puerto. El contrato de F7a ya lo dejaba así (§6: «En F7b la raíz pasa al adaptador de `app/legacy/` y llega a la página por props»), y es lo que permite que `reset` aborte sin la página. La vista sigue sin importar ningún adaptador.

**Alternativas descartadas:**

- **Un solo módulo:** arrastra React, la página y los dos motores a cada check que carga `TallerLab`.
- **El runner dentro de la página**, con un registro de la ejecución activa en la sesión para que `reset` la aborte: suma un canal entre módulos sólo para un caso que la interfaz no alcanza (con «Borrar todo» en Método, el laboratorio ya está desmontado y la ejecución abortada).

## R2. La sesión del laboratorio (FR-020)

**Decisión.** Es un valor inmutable con funciones puras (`pages/lab/model/lab-session.ts`): el ejercicio elegido, el modo, la fase, los filtros del mapa, el enlace de la misión, los modelos visuales, el explorador de laboratorio y los de misión. La guarda `lab-api.ts` entre montajes; la página la recibe como `initialSession`, la lleva en `useState` y avisa cada cambio con `onSessionChange`, como el Atlas.

- **Las reglas de hoy** son funciones con nombre y spec:
  - `openLabSession` es el `mount` de `lab.js`: el cambio de idioma reinicia el ejercicio, el modo, la fase, la búsqueda y «Repasar pendientes», no el nivel ni «Clásicos y sistemas» (rareza 1), y un enlace no reinicia los exploradores (rareza 2);
  - `openExerciseSession` reinicia los modelos visuales y los exploradores;
  - `clearSelection` es el `reset` de hoy.
- **El enlace de la misión** (`?campana` y `?sistema`) se lee al montar y vive en la sesión mientras se está en un ejercicio; el mapa lo borra. Hoy se relee de `location.search` en cada redibujo, y la URL lo pierde al pasar al mapa: guardarlo en la sesión da lo mismo sin leer una URL que la página escribe después del dibujo.

**Por qué no Zustand.** `AGENTS.md` lo reserva para estado complejo o compartido entre funcionalidades. La sesión tiene un solo dueño, la página, y un solo lector fuera de ella, el adaptador, que sólo la guarda. El Atlas resolvió lo mismo con `useState` y `onSessionChange`.

## R3. La URL sin nuqs (FR-035)

**Decisión.** La página escribe con `withLabQuery` y `history.replaceState` en un efecto atado al modo, el ejercicio y la fase. No usa nuqs, aunque F5 o F3 lo instalen. Es la decisión 1 del informe.

**Por qué.**

- **La fuente de verdad es la sesión, no la URL** (FR-020). La URL se lee al montar y después sólo se escribe. Si el alumno vuelve al laboratorio desde el menú (`?#laboratorio`, sin query), hoy reabre el ejercicio que tenía, y la URL vuelve a tenerlo. Con nuqs la query sería la fuente de verdad y ese caso abriría el mapa.
- **La URL tiene que salir carácter por carácter igual.** `withLabQuery` borra `campana` y `sistema` en el mapa, claves que la página no maneja como estado. F5 midió tres diferencias de nuqs con la URL de hoy (su R2): conserva las claves ajenas, conserva su orden y no codifica `/`, `:`, `,` ni lo que no es ASCII.

**Alternativa descartada.** nuqs para `ejercicio` y `paso`, con la sesión como respaldo: dos escritores de la misma query.

## R4. El hook del editor (FR-040 a FR-042, D2 y D5)

**La API de CodeMirror 6** que fija el lockfile (`@codemirror/view` 6.43.13 y `@codemirror/state` 6.7.6), consultada con Context7:

- `new EditorView({ parent, doc, extensions })` agrega su DOM al final de `parent`;
- `EditorView.updateListener` recibe cada `ViewUpdate`, con `docChanged` y sus `transactions`;
- `Annotation.define<boolean>()` marca una transacción, y `transaction.annotation(tipo)` la lee;
- `view.dispatch({ changes, annotations })` reemplaza el texto, y `view.destroy()` lo desmonta.

**Decisión.**

- **`createCodeEditor(parent, options)`** (`shared/ui/code-editor/create-code-editor.ts`) reemplaza a `mountCodeEditor(textarea)`. Conserva el tema, el resaltado, el autocompletado, los snippets, Tab y Mayús+Tab, Ctrl/⌘ + Enter, Esc, el tope y el nombre accesible.
- **`replaceText`** marca su transacción con una anotación, y el `updateListener` no llama a `onChange` para ella. Sin eso, «Restaurar inicio» guardaría dos veces: la del manejador y la del cambio del editor.
- **`useCodeEditor(options)`** crea el editor en un `useLayoutEffect` sobre un `div` que React dibuja sin hijos, así que React nunca reconcilia el DOM de CodeMirror (FR-041). Los callbacks pasan por `useEffectEvent` (React 19.2): el editor ve siempre el último `onChange` sin recrearse en cada tecla. El texto inicial se toma una vez (`useState`). El editor se destruye al desmontar, y `CodePhase` se desmonta al cambiar de fase o de ejercicio.
- **D2 y D5:** sale el `textarea` de respaldo con su numeración y su Tab de cuatro espacios, `register-editor.ts` y `window.TallerEditor`. El `div.editor-wrapper` lleva `cm-enhanced` desde el dibujo, así que el estilo computado es el de hoy con el editor montado; el `pre#lab-line-numbers` y el `textarea#lab-code`, ocultos, son diferencias listadas del DOM (FR-064).

**Si CodeMirror lanza al montarse** (no se observó nunca), el hook lo registra con `console.error('No se pudo mostrar el editor de código.', error)` y la fase queda sin editor, como pide la spec en sus casos borde. El resto de la página sigue dibujada.

**Sin spec de jsdom.** CodeMirror en jsdom no está verificado (riesgo 3) y jsdom no está instalado. Lo fijan los E2E de F7a, que cuentan las escrituras: «each key saves…», «restoring the starter saves it once…» y «loading the solution asks first, saves once…», más el teclado (Ctrl/⌘ + Enter dos veces, Esc). La spec de `CodePhase` reemplaza el hook por su interfaz.

**Alternativas descartadas:** el `onChange` de React sobre el `textarea` oculto (la spec lo descarta) y recrear el editor con cada `onChange` nuevo (lo destruye en cada tecla).

## R5. Los motores y los puentes como datos (FR-037 a FR-039)

**Decisión.**

- **Se refrescan en memoria** (`refreshFromLab`) al montar, dentro de `enterLab`, y después de cada escritura de un manejador de la página (`saveLab`), nunca al dibujar ni con `syncLab`. `refreshFromLab` no escribe ni sube la revisión, y sólo crea registros con evidencia que aprueba, así que refrescar más seguido que hoy (hoy, en cada redibujo) no cambia nada que se guarde.
- **Se sincronizan** después de una ejecución (el runner) y de una predicción (`syncAfterPrediction`), con los textos de hoy.
- **La página lee los motores** desde los índices de sus slices y se suscribe a sus revisiones con `useStore` y un selector chico.
- **Los talleres llegan por props, desde el contenido.** El supuesto F5-S2 no alcanza: `systemsEngine.list()` y `get()` crean en memoria el registro de cada taller que tocan (`record()` en `create-systems-engine.ts`). Con `list()` en el dibujo, la sincronización siguiente guardaría 25 registros vacíos en `taller-systems-v1`, y los E2E de F7a que cuentan las escrituras de una predicción fallarían. El adaptador arma la lista desde `getContent().workshops` (`pc`, `lowlevel`, `infra` y `play`). El contexto de un núcleo llama a `systemsEngine.get(taller, lenguaje)` sólo para el taller del enlace, como hoy.
- **El registro vacío (D1, FR-017)** se crea en `enterLab` al montar y en `openExercise`, después de guardar la selección y sólo si no hay bloqueo, como hoy: con bloqueo, `lab.js` no dibuja el ejercicio y no crea el registro.

## R6. Lo que cambia X1, por construcción (FR-023, FR-028, FR-031, FR-033 y FR-036)

React conserva los nodos que no cambian. Con eso, X1 sale solo:

- **Los paneles plegables** no reciben `open` salvo dos:
  - el caso propio, que lo toma una vez al montarse (`useState`) y no lo vuelve a tocar;
  - cada caso de prueba (`open={status === 'failed'}`), que React sólo reescribe cuando el estado cambia: se abre al pasar a fallar, se cierra al dejar de fallar y, si no cambia, queda como lo dejó el alumno.
- **«Otra pista»** no reemplaza el bloque de las pistas, así que la solución queda abierta.
- **El foco** queda en el botón pulsado («Repasar pendientes», la autoevaluación) porque el nodo no se recrea. Donde hoy el código lo mueve (la pista, las pestañas, abrir un ejercicio, los exploradores, el `select` genérico), la página hace lo mismo después de `flushSync`.
- **El estado del filtro** se deriva en el dibujo y dice «para tu búsqueda» siempre que hay búsqueda.

Los 7 E2E de `lab-react.spec.ts` lo fijan: en rojo contra el legacy de F7a y en verde con la página.

## R7. Un nodo de texto donde hoy hay uno (FR-064 y FR-065)

**El problema.** JSX parte el texto en un nodo por cada expresión: `{a}/{b}` son tres nodos. El navegador no aplica el kerning entre nodos, así que el ancho cambia en fracciones de píxel (`0/5` en `.topic-fraction`: 18,0156 px hoy y 18,0469 px partido). El barrido lo vio en 157 tarjetas de temas, en las pestañas, en el botón del desafío de hoy y en varios rótulos. Prettier hace lo mismo cuando corta una línea de JSX con `{' '}`.

**Decisión.** Donde hoy hay un solo nodo de texto, la página arma una plantilla (`` {`${a}/${b}`} ``). Es una regla del plan (T024) y la fija el barrido.

**El `<pre>`.** El analizador de HTML descarta el salto de línea que sigue a `<pre>`, y hoy esos tres bloques se escriben con `innerHTML`. Con la salida de error vacía, la del compilador empieza con un salto: hoy mide 82 px y con React, 100. `preformatted` descarta ese salto, con su spec.

**Lo que no se replica:** el mismo descarte en un `textarea`. Hoy, un borrador que empieza con una línea vacía la pierde al dibujarse, y la tecla siguiente guarda el texto sin ella. Es un defecto que existe sólo porque `innerHTML` rehace la vista (C2): la página conserva el texto guardado.

## R8. El diálogo de confirmación (FR-031, D3 y F9-Q4)

**Decisión.**

- `ConfirmDialog` vive dentro de `CodePhase` y cuelga de `<body>` con `createPortal`.
- Se crea al pedir la confirmación y se desmonta al cerrarse, al cambiar de fase o de ejercicio y al salir del laboratorio.
- Abre con `showModal()` en un `useLayoutEffect`, y la limpieza lo cierra.
- «Conservar mi código» cierra y devuelve el foco a quien lo tenía (`document.activeElement` al abrir). «Continuar» cierra y ejecuta la acción, que le da el foco al editor. Esc lo cierra el navegador.

**La diferencia con hoy:** `lab.js` crea el `<dialog>` la primera vez y lo deja cerrado en `<body>` para siempre. Con la página, cerrado no existe. Es una diferencia listada del DOM (FR-064).

**jsdom no implementa `showModal()` ni `close()`.** Context7 no lo confirma en la documentación de jsdom 29; la spec de `CodePhase` los reemplaza en `HTMLDialogElement.prototype`.

## R9. Las hojas (FR-011 y D4)

- **`git mv` sin editar:** `frontend/lab.css` pasa a `frontend/src/pages/lab/ui/lab.css` y `frontend/quest-explorers.css`, a `frontend/src/pages/lab/ui/quest-explorers.css`. Las dos líneas de `main.tsx` cambian en su lugar.
- **Una hoja nueva, `pages/lab/ui/lab-page.css`,** con las tres reglas que reemplazan los estilos en línea:
  - `.lab-reasoning { margin-top: 20px }`;
  - `.lab-reasoning > summary { font-size: 12px; cursor: pointer }`;
  - `.lab-copy-buffer { position: fixed; left: -9999px }`.

  Va aparte para que D4 («sin editar») siga siendo cierto, y se importa justo después de `lab.css`.
- **El estilo en línea ganaba a toda regla.** Ninguna regla de las hojas le pone `margin-top` a ese `details` ni `font-size` o `cursor` a su `summary`. El barrido lo confirma en «Explicá» con la sección abierta y cerrada.
- **El buffer de la copia** cuelga de `<body>`, fuera de la raíz. La regla es global, como todas las de las hojas.

## R10. Los checks (FR-015 y FR-063)

| Check | Qué cambia |
| --- | --- |
| `lab-state-check` | `loadLab` carga `lab-api.ts` con `runModule`, publica `labApi` en `window.TallerLab` y llama a `init()`. Los 24 de almacén no cambian. Los de pestañas pasan a usar el runner de `lab-api.ts` en lugar del DOM falso. Seis escenarios de vista pasan a specs. Queda en 33 (la tabla está en el plan, §6) |
| `quest-explorers-check` | Se retira: sus 47 aserciones ya tienen dueño (la tabla de la unidad 7 de F2b), salvo cinco que pasan a E2E y a la spec de la sesión |
| `lab-bridge-check` | Se retira: sus 21 escenarios leían HTML o métodos de los adaptadores que F7b retira. Pasan a `mission-bridges.spec.ts`, a `MissionContext.spec.tsx`, a las specs de F2b y a `systems-check` |
| `boot-check` | El laboratorio es una vista de React (como el Atlas). Las fuentes evaluadas solas son `lab-api.ts` y `register-lab.tsx`, con las mismas dos condiciones: no lanzan y no tocan el almacenamiento |
| `load-order-check` | El laboratorio de la cadena pasa a ser `register-lab.tsx`. Las restricciones son las mismas, sólo cambia la ruta |
| `seams-guard` | El dueño del índice de `exercise` pasa a `lab-api.ts`. Las fixtures que citaban `lab-explorers.js` y `quest-explorers.js` pasan a `app.js` y a `lab-api.ts`, con el mismo resultado esperado |
| `legacy-sources` | `LAB_SOURCE` apunta a `lab-api.ts`. Salen los cargadores de las interfaces de campaña y de Sistemas que sólo usaba `lab-bridge-check` |
| `app-adapters` | Sin cambios: `TallerLab` sigue con sus diez métodos |

**La comprobación de aislamiento** de F7a («lab.js bundles the lab store once…») pasa a `lab-api.ts`: la clave del laboratorio aparece una vez y las de campaña, Sistemas y recorrido, ninguna.

## R11. Los adaptadores de F5 y F6 (FR-013)

- **`register-systems.tsx` (F5)** deja de publicar `returnURL`, `missionIDs`, `exerciseContextHTML` y `refresh`. `refresh` sigue como función interna, porque la usa `mount`. Con eso salen sus imports del puente, de la gramática y del escape, y `mountedLanguage`. Quedan cinco métodos: `init`, `sync`, `mount`, `unmount` y `resetSimulations`.
- **`campaign-bridges.ts` (F6) se retira entero.** Existía para que `lab-bridge-check` pudiera cargar los puentes sin la página, y ese check se va. `refresh` y `sync` pasan a `register-campaign.tsx`, que sigue capturando `window.TallerCampaignEngine` al evaluarse. `window.TallerCampaign` queda con cuatro métodos (`mount`, `unmount`, `refresh` y `sync`), y el escenario de `boot-check` que F6 suma («…exactly the seven methods…») pasa a esos cuatro.
- **Lo que no se toca:** `TallerCampaign.refresh` y `sync` y `TallerSystems.sync`, porque los lee `app.js` (la spec, «Qué queda en `window.*`»).

## R12. El peso (FR-004 y SC-008)

| Medida | Valor |
| --- | --- |
| `html.length` con F7a | 1 144 712 |
| `html.length` con F7b | 1 160 293 (+15 581) |
| Lo que resta borrar el legacy (esbuild, minificado) | −66 773 bytes: `lab.js`, `lab-explorers.js`, `quest-explorers.js` y `register-editor.ts` |
| Lo que suma la página | +82 539 bytes de `pages/lab` y +1 971 del adaptador |
| Lo que resta sacar los métodos de HTML de `campaign.js` y `systems.js` | −1 506 bytes |

JSX pesa más que las plantillas de texto: cada elemento es una llamada con sus props. Quitar todo el legacy sin la página no es una medida útil: el árbol que sólo alcanzaba `lab.js` (CodeMirror, la feature y los modelos) cae con él, y el HTML queda en 510 815.

**El margen.** Los subpresupuestos de los otros planes, sobre la base de F7a, son: F3 +30 000 (con nuqs) o +15 000; F4 +10 000; F5 +40 000 (con nuqs) o +25 000; F6 hasta +15 000; F8 hasta +9 000. En el peor caso (nuqs una sola vez) suman 1 144 712 + 30 000 + 10 000 + 25 000 + 15 000 + 9 000 = 1 233 712, y con F7b, 1 249 293: deja 707 caracteres para F9 a F12 y A3. Es un hallazgo para el coordinador. **El tope de F7b:** +17 000 sobre la base de T018. La pieza más grande del paquete es CodeMirror (535 kB), y su `basicSetup` es la palanca si hace falta; cambiarla no es de un port.

## R13. La rama de C4: A4 entra antes que F7b

**El predicado (T018):** `grep -c "createPlaygroundTransport\|buildPlaygroundProgram" frontend/lab.js` da 2 en la rama A (sin A4) y 0 si A4 ya cambió la raíz. Si da 0, es la rama B.

**En la rama B**, F7b porta como comportamiento vigente lo que A4 dibujó en `lab.js` (la spec, FR-007 y criterio C4):

- **la raíz:** las dos líneas de A4 (su transporte y su constructor del programa) pasan de `lab.js` a `lab-api.ts` tal como están, y el runner se crea con el tipo de progreso de A4;
- **los textos:** los de «Textos que cambian» de la spec de A4 que ya estén en `lab.js` (los cuatro lugares que nombran el Playground y la línea de intentos sin el número) se copian a los componentes;
- **la espera:** la rama `running` de `reviewHTML` con los estados de A4 pasa a `RunningReview`. La línea de estado sale de la función de A4 que hoy la arma. «Cancelar ejecución» conserva su nodo en cada aviso de progreso, sin repintar la revisión (FR-039 de A4 y la nota del contrato de F7a, §2);
- **la red:** los E2E de A4 (los de F1 pasados al doble de `/api/runs` y los suyos) pasan sin editarse.

El plan no inventa el código de A4: sus textos y sus nombres salen de `lab.js` en la base. Lo fija una spec de componente («Cancelar ejecución» es el mismo nodo antes y después de un aviso). T025 sólo corre en la rama B.

## R14. Los E2E nuevos (FR-001, FR-036, FR-060, FR-061 y SC-010)

- **`lab-react.spec.ts`, 7 E2E de X1.** Cubren los cuatro cambios y los dos destinos del foco:
  - las notas y las misiones de proyecto, abiertas después del nivel y de «Clásicos y sistemas»;
  - «Repasar pendientes», con el foco en el botón y las notas abiertas;
  - el estado del filtro con la búsqueda después de un nivel y de «Clásicos y sistemas»;
  - «Otra pista» con la solución abierta;
  - «Restaurar inicio» con la vista previa, la solución y el caso propio abiertos;
  - «Cargarla y experimentar» con la vista previa y la solución abiertas;
  - la autoevaluación, con el foco en el botón y el razonamiento abierto.

  Entran en un commit en rojo antes del corte (FR-036). Corrieron contra el legacy de F7a y fallaron los 7 por la razón esperada.
- **`lab-explorer-focus.spec.ts`, 2 E2E.** El foco del tamaño y de «Restaurar paquete» en `go-106`, que sólo veía `quest-explorers-check`. Pasan contra el legacy y contra la página.
- **El Page Object** suma `panel(summary)` y `panelToggle(summary)`. Un `details` no tiene nombre accesible, así que su `summary` es el contrato (ADR 0008). El razonamiento de «Explicá» hoy no tiene clase.

## R15. Las specs de componente (FR-062 y SC-010)

- **El arnés lo traen F3, F5 o F6** (jsdom 30.1.2, Testing Library y el proyecto `jsdom` de Vitest, según sus planes). T018 lo comprueba: `node -e "require.resolve('jsdom')"` y el proyecto `jsdom` en `frontend/vitest.config.ts`. Si no está, F7b pide el permiso (FR-003) con la tabla de F6, T002.
- **Fishery no hace falta:** las entradas de las specs se escriben a mano.
- **Las specs** (T023) cubren:
  - las regiones vivas que conservan su nodo (X2);
  - los escenarios de vista que salen de `lab-state-check`;
  - el diálogo en `<body>`;
  - el escape de los títulos, que antes veía `lab-bridge-check`.

  Reemplazan en jsdom lo que no existe: `HTMLDialogElement.prototype.showModal` y `close`.
- **No corrieron al planificar** (R16).

## R16. Lo que no se verificó

1. **Las specs de componente:** el arnés no está instalado. Se escribieron contra el código del prototipo. T024 las corre en verde, y si una falla por el arnés (no por el código), se corrige la spec, nunca el componente.
2. **Los diffs de F5 y F6:** se escribieron contra el código de sus planes. Si la versión integrada difiere, se aplica la misma intención y K revisa.
3. **La rama B de C4:** depende de lo que A4 deje en `lab.js`.
4. **La comprobación con lector de pantalla (X2):** la hace el usuario en la revisión del PR.
5. **El barrido de estilo no ve `:hover`, `:focus` ni las animaciones** (riesgo 6): las hojas se mueven sin editarse.

## Las consultas a Context7

Se usó el segundo servidor (`mcp__44441c24-…`), porque el primero agotó la cuota del mes.

| Librería | Versión (lockfile o plan) | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| `@codemirror/view` (`/codemirror/view`) | 6.43.13 | `EditorView` con `parent`, `updateListener`, `destroy` | `parent` agrega el DOM al final del contenedor; `updateListener` da `docChanged` y las transacciones | Sí: el hook crea el editor sobre un `div` sin hijos (R4) |
| `@codemirror/state` (`/codemirror/state`) | 6.7.6 | `Annotation.define`, `transaction.annotation` y `userEvent` | Una anotación propia marca la transacción de `replaceText` | Sí: `replaceText` no llama a `onChange` (R4) |
| React (`/websites/react_dev_reference`) | 19.2.8 | `createPortal`, `flushSync`, la limpieza de un ref callback y `useEffectEvent` | El portal conserva el árbol de eventos de React; `flushSync` deja el DOM al día antes de mover el foco; `useEffectEvent` lee el último valor sin re-sincronizar el efecto | Sí: el diálogo (R8), el foco (R6) y los callbacks del editor (R4) |
| Zustand (`/pmndrs/zustand`) | 5.0.15 | `useStore(storeApi, selector)` con un store de `zustand/vanilla` | Un selector chico por suscripción | No: la página se suscribe a las revisiones y al estado del runner |
| Vitest (`/vitest-dev/vitest`) | 5.0.3 | `test.projects` en línea, `vi.mock` con `importOriginal` y `vi.hoisted` | Los proyectos en línea heredan la raíz; `vi.hoisted` comparte variables con la fábrica | No: las specs de modelo mockean los motores así |
| Testing Library (`/testing-library/react-testing-library` y `/testing-library/user-event`) | 16.3.3 y 14.6.7 (plan de F6) | `render`, `screen.getByRole` con nombre, `userEvent.setup`, `click`, `type` y `selectOptions` | Consultas por rol y nombre accesible | No |
| jsdom (`/jsdom/jsdom`) | 30.1.2 (plan de F6) | `HTMLDialogElement.showModal` | La documentación no lo cubre | Sí: la spec reemplaza `showModal` y `close` (R8) |
| Playwright (`/microsoft/playwright`) | 1.63.0 | `toHaveAttribute` de un atributo booleano, `toBeFocused` y `page.clock` | `toHaveAttribute('open', '')` exige que el atributo exista | No |
| Vite (`/vitejs/vite`) | 8.3.2 | El orden de las hojas importadas desde JavaScript | Con un solo documento, el CSS sigue el orden de los imports | No: las líneas de `main.tsx` cambian en su lugar (R9) |
| nuqs (`/47ng/nuqs`) | 2.10.2 (plan de F5) | `useQueryStates`, el orden de las claves y `null` | Escribe sólo sus claves y conserva las ajenas | Sí: la página no lo usa (R3) |
| fishery | 2.4.0 (plan de F6) | — | No aplica: no hay fábricas | No |
| React Hook Form | — | — | No aplica: la página no tiene formularios con validación | No |
