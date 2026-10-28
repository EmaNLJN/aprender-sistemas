# Research: F7a · El laboratorio sin vista nueva

**Feature**: [spec.md](./spec.md) (spec 021, la parte F7a de P2) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-28

Este documento junta las decisiones técnicas de F7a con sus alternativas, la tabla de las consultas a Context7 y lo que se midió. El plan remite acá con la sigla de cada decisión (R1 a R12).

## Cómo se verificó

Se planificó sin tocar `f2b-acum` ni el código de `master`, y sin descargar nada. Se armó un prototipo completo en una copia descartable de `f2b-acum@2b37caf4`, fuera del repositorio (`git archive` en el scratchpad de la sesión, con el `node_modules` de otro worktree enlazado y el Chrome Headless Shell que ya estaba en la caché de Playwright):

- **El prototipo es el plan.** Cada archivo nuevo, cada diff y cada spec que trae el plan corrió así como está escrito: el código del plan es el del prototipo, formateado con Prettier.
- **La red contra el legacy.** Los 61 E2E nuevos pasaron contra el `lab.js` de la base, tres veces seguidas (`--repeat-each 3`: 183 de 183), y junto con los 123 de F1 y A2 (184 de 184).
- **El estado intermedio (T013).** `lab.js` con las reglas y los selectores, todavía con `window.TallerRunner`: 184 E2E y `lab-state-check` 37 de 37.
- **El estado final (T015).** `npm test` en verde, con 40 archivos y 843 pruebas de Vitest, `lab-state-check` 39 y `runner-check` 12; `npm run build`; los 184 E2E; `npm run lint` con 0 errores y 32 avisos; `prettier --check` limpio.
- **Las mutaciones**, cada una detectada por la prueba que la vigila:
  - la feature importa el índice de `entities/campaign`: la spec de aislamiento falla;
  - `TallerLab.reset` sin `runner.abort()`: falla el escenario nuevo de `lab-state-check`.

**Lo que no corrió:** Docker, la CI, macOS, la imagen web (`frontend/Dockerfile`) y la comprobación con lector de pantalla (que es de F7b, por X2).

## Línea base de planificación

Medida en la copia de `f2b-acum@2b37caf4`. T001 la vuelve a medir sobre la base real de implementación (`master` con F2a, A2 y F2b).

| Qué | Valor |
| --- | --- |
| `npm run lint` | 0 errores, 35 avisos |
| Avisos de `frontend/lab.js` | 12: `render` 13, `mapHTML` 17, `exerciseHTML` 11, `reviewHTML` 26, la flecha de `testsHTML` 12, `runExercise` 17, `updateRunUI` 15, `reflectHTML` 12, `explorerHTML` 12, `onClick` 59, `onInput` 13 y `onKeydown` 16 |
| E2E | 123 (106 de F1 y 17 de A2) |
| Vitest | 29 archivos y 719 pruebas |
| `lab-state-check` y `runner-check` | 37 y 12 escenarios |
| `load-order-check` | 24 imports |
| `dist/index.html` | 1 143 852 bytes |
| `lab.js` empaquetado solo (IIFE, como `bundleSource`) | 89 349 caracteres; la clave `taller-laboratorio-v1` aparece 1 vez y las de campaña, Sistemas y recorrido, 0 |

**Después del prototipo:**

| Qué | Valor |
| --- | --- |
| `npm run lint` | 0 errores, 32 avisos |
| Avisos de `lab.js` | 9: salen `reviewHTML`, `runExercise` y `reflectHTML`, y ninguna función nueva pasa de 10 |
| E2E | 184: los 123 y 61 nuevos |
| Vitest | 40 archivos y 843 pruebas: 11 archivos y 124 pruebas nuevas |
| `lab-state-check`, `runner-check` y `load-order-check` | 39 escenarios, 12 escenarios y 23 imports |
| `dist/index.html` | 1 147 227 bytes (+3 375); `html.length` da 1 144 712 caracteres, bajo `BOOT_SIZE_LIMIT` (1 250 000) |
| `lab.js` empaquetado solo | 104 393 caracteres (suma el cliente de los Playgrounds, que antes vivía en el paquete de `register-runner.ts`); las claves, 1, 0, 0 y 0 |

## Línea base de la implementación

Medida el 2026-10-28 sobre `9973f5ea` (rama `impl/f7a-laboratorio`, con F2a, A2 y F2b), antes de cualquier cambio. Build, `npm test`, lint, formato y E2E en verde. Coincide con la línea base de planificación en todos los valores.

| Qué | Valor |
| --- | --- |
| `npm run lint` | 0 errores, 35 avisos |
| Avisos de `frontend/lab.js` | 12: `render` 13, `mapHTML` 17, `exerciseHTML` 11, `reviewHTML` 26, la flecha de `testsHTML` 12, `runExercise` 17, `updateRunUI` 15, `reflectHTML` 12, `explorerHTML` 12, `onClick` 59, `onInput` 13 y `onKeydown` 16 |
| E2E | 123 |
| Vitest | 29 archivos y 719 pruebas |
| `lab-state-check` y `runner-check` | 37 y 12 escenarios |
| `load-order-check` | 24 imports |
| `dist/index.html` | 1 143 852 bytes; `html.length` da 1 141 337 caracteres |

## R1. La unión ampliable de los estados (F7-Q2)

**El problema.** El clarify pide «un canal de progreso y la cancelación, con los estados de hoy en una unión ampliable», y que A4 sume los suyos «sin cambiar la feature». Una unión cerrada escrita en un archivo de la feature obliga a A4 a editarla.

**Decisión.** El puerto y el estado son genéricos en el progreso:

- `ExerciseTransport<Progress = never>` recibe `report: (progress: Progress) => void`;
- `RunState<Progress> = IdleRun | ActiveRun<Progress>`, donde `ActiveRun` lleva `exerciseId` y `progress: Progress | null`.

Los estados de hoy son `idle` y `running`. La feature no lee nunca el progreso: lo guarda tal como llega, mientras la ejecución sea la activa. A4 declara su unión (en la fila, esperando turno, con demora) en su adaptador, crea el runner con `createExerciseRunner<ApiRunProgress>(…)` en la raíz de composición y dibuja sus textos en la vista vigente. Ni `create-exercise-runner.ts`, ni `transport.ts`, ni `run-state.ts` cambian.

Lo prueba una spec con un adaptador doble que avisa `{ phase: 'queued', position: 3 }`, un estado que la feature nunca vio: el estado lo expone sin tocarlo.

**Alternativas.**

- **La unión cerrada en `run-state.ts`, que A4 amplía:** es simple, pero A4 edita la feature y contradice el clarify.
- **Un mapa de interfaces con `declare module`:** A4 no edita nada, pero es un truco del sistema de tipos (`AGENTS.md`: preferí lo simple a lo ingenioso).
- **`progress: unknown`:** pierde los tipos en la vista de F7b.

## R2. Un armado y un recorte (F7-S3, FR-046, FR-049 y FR-052)

**El problema.** `interpretRun` lee las marcas, recorta la salida (12 000 y 18 000) y arma el `result` v1 a la vez. El adaptador de A4 va a entregar la salida sin recortar, y la spec pide recortar una sola vez y armar el `result` en un solo lugar, también el de una falla de transporte.

**Decisión.**

- **La lectura de las marcas sale de `interpretRun`** como `readTestMarkers(stdout)`, exportada por `entities/exercise`. `interpretRun` la llama y su comportamiento no cambia, así que `exercise-evidence-check` y `runtime-check` siguen iguales.
- **El adaptador de los Playgrounds** arma el programa con `buildProgram`, ejecuta con `runCode`, lee las marcas con `readTestMarkers` y devuelve un veredicto con la salida cruda. Interpreta con la misma regla de `interpretRun`, pero sin su recorte.
- **La feature arma el `result` en `buildRunResult`:** recorta una vez, pone las claves en el orden que hoy guarda `interpretRun` y copia `attemptId` sólo si el veredicto lo trae.
- **`sanitizeResult` no cambia en F7a.** Sigue siendo el único normalizador, al cargar y al importar. A4 le suma `attemptId` (su FR-040).

Una spec compara `buildRunResult` con `interpretRun` para las respuestas de F1 (aprobado, parcial, error y falla de transporte): los objetos son iguales.

**Alternativas.**

- **El adaptador llama a `interpretRun` con un contexto ficticio y traduce su `result`:** recorta dos veces y deja un contexto falso en el contrato.
- **Armar el `result` con `sanitizeResult`:** mezcla normalizar con armar y descarta el `attemptId` hasta A4. A4 igual tiene que tocar `sanitizeResult`, pero no hace falta acoplarlo a la ejecución.

## R3. La cancelación por identidad, no por el tipo de error (FR-043 y FR-050)

**El hecho.** `runCode` nunca lanza al abortar: resuelve una falla con `errorType: 'aborted'`. Hoy `lab.js` descarta el resultado porque la ejecución ya no es la activa (`activeRun !== run`), no por el tipo de error.

**Decisión.**

- **El descarte es por identidad:** cada `run()` crea su ejecución, y lo que vuelve tarde se ignora si ya no es la activa.
- **`cancel()` aborta la señal, pasa a `idle` en el acto y avisa** «Ejecución cancelada. Tu código sigue guardado.».
- **`abort()` hace lo mismo, en silencio.** Lo usan abrir otro ejercicio, anterior y siguiente (que abren otro), volver al mapa, desmontar y «Borrar todo». Cambiar de fase no llama a nada.
- **`idle` llega al final:** después de guardar, de avisar y de `syncAfterRun`. Es el momento en que hoy el `finally` repinta el bloque de contexto (`bridges`), así que `lab.js` se suscribe y repinta igual.
- **Una ejecución que empieza justo después de cancelar** no se pisa con el resultado tardío de la primera: lo fija una spec.

## R4. El reloj de un cierre

**Hoy** `lab.js` lee `Date.now()` tres veces al terminar: para `time`, para `solvedAt` y para `reviewAt`.

**Decisión.** La feature lee `now()` una vez y usa esa lectura para los tres. Con el reloj fijo de los E2E (`page.clock.setFixedTime`) los bytes son los de hoy. Con un reloj real la diferencia es de milisegundos y no la observa ningún contrato.

## R5. El registro se vuelve a leer después de esperar (FR-019)

Hoy `runExercise` guarda el resultado en el `record` que tomó antes de esperar. Las dos pestañas funcionan porque el almacén fusiona en el lugar (spec de F2, FR-025).

**Decisión.** La feature vuelve a pedir el registro (`ensureRecord(store.getProgress(), id)`) al terminar.

- **Con fusión en el lugar** es el mismo objeto, así que nada cambia.
- **Si el estado se reemplazara durante la espera,** el resultado igual llega al estado vigente. Hoy no pasa: `applyImport` reemplaza el estado, pero importar desmonta el laboratorio y aborta.

Lo fijan una spec («a replaced state keeps it») y el escenario de dos pestañas de `lab-state-check`, que sigue pasando.

## R6. Un adaptador que lanza

**Hoy**, el `catch` de `runExercise` guarda a mano un resultado de transporte con `tests: []`, en otro orden de claves y sin `syncAfterRun`. Con `runCode` esa rama no se alcanza, porque nunca lanza.

**Decisión.** Se conserva lo que hace esa rama: un error que no es `AbortError` guarda un resultado de transporte, con el mensaje del error o «No se pudo conectar al compilador.», y no sincroniza. El resultado sale de `buildRunResult` (FR-052), así que lleva una prueba por id en falso y el orden canónico, el mismo que `sanitizeResult` le daría al recargar.

## R7. De dónde importa la feature

**Decisión.** `features/run-exercise` importa del índice de `entities/exercise`, que crea `labStore` y `exerciseCatalog`, y de ningún índice de motor (FR-043). Lo único que la importa en F7a es `lab.js`, dueño de ese índice (regla R4 del guard), así que en su paquete hay un solo almacén.

Dos pruebas lo vigilan:

- **Una spec de aislamiento de la feature,** con `vi.doMock` sobre el motor de campaña, el de Sistemas y el almacén del recorrido: importar la feature resuelve, e importar el índice de campaña, el control, rechaza.
- **Un escenario nuevo de `lab-state-check`,** que empaqueta `lab.js` solo y cuenta las claves: `taller-laboratorio-v1` una vez y las otras tres, ninguna.

**Alternativa descartada:** una entrada sin estado nueva de `entities/exercise` para lo que usa la feature. Exigía mover `buildProgram`, `interpretRun`, `hasPassingEvidence` y `syncAfterRun` fuera del índice («un símbolo, un camino», R2 de F2b), y eso cambiaba cómo cargan cinco checks que comparten F5 y F6, sin un consumidor que lo pida.

## R8. Las reglas que cambian un registro

**Decisión.** Las reglas son funciones puras que devuelven un parche, y quien llama lo aplica con `Object.assign` sobre el registro del almacén. Así:

- **la identidad del registro se conserva,** que es lo que hace funcionar la fusión entre pestañas;
- **el orden de las claves que se agregan es el de hoy:** `prediction` y después `predictionCorrect`; `confidence`, `reviewedAt` y `reviewAt`; `result`, `solvedAt` y `reviewAt`.

**Alternativa descartada:** reglas que mutan el registro. No son puras, y la spec las pide puras (FR-055).

## R9. Dónde viven los selectores

- **Del registro y del ejercicio** (FR-054), en `entities/exercise/model/selectors.ts`: `levelOf`, `isSolved`, `isDueForReview`, `practicePointsOf`, `draftOf`, `normalizeCustomTest`, `isResultCurrent`, `isReviewComplete` e `isReflectionSolved`.
- **El clasificador del revisor** (FR-029, la mitad de F7a), en `entities/exercise/model/review-state.ts`: `reviewStateOf`.
- **Del mapa** (FR-054), en `pages/lab/model/map-selectors.ts`, con su índice `pages/lab/index.ts`: `matchesMapFilters`, `todayChallenge`, `surprisePool` e `isExtraChallenge`. F7a abre el slice `pages/lab` sólo con `model`, porque la spec los ubica ahí. `lab.js` los importa del índice de la página, y F7b suma la vista al mismo slice.

**`normalizeCustomTest(raw)`** es exactamente `trim()` de JavaScript, como hoy. Lo usan el envío, la vista previa, la copia y la vigencia del resultado. `trim()` quita un superconjunto de lo que recorta el servidor (los espacios, el tabulador, los saltos y también el espacio de no separación), así que sobre ese texto ni el servidor ni el renderizador de A4 recortan nada más (FR-028 de A4).

## R10. El constructor del programa por parámetro (FR-051, F7-S6)

**Decisión.**

- **El tipo** `ProgramBuilder = (exercise, draft, customTest) => string` vive en el contrato de la feature y recibe la prueba propia ya normalizada.
- **El adaptador de los Playgrounds** exporta `buildPlaygroundProgram`, que es `buildProgram`.
- **`lab.js` lo elige una vez** (`const programBuilder = buildPlaygroundProgram`), junto al transporte, y la vista previa y «Copiar programa completo» pasan por `programFor(item)`.

A4 cambia el par (`createPlaygroundTransport` y `buildPlaygroundProgram`) en la raíz de composición.

**Lo que no se adelanta:** si A4 necesita decir que la plantilla no está disponible (su FR-029), amplía el tipo de retorno y la vista vigente. Hoy no hay quien produzca ese caso (hallazgo para A4 en el informe).

## R11. Los E2E contra el legacy (FR-001, FR-060 y FR-061)

- **Un Page Object por vista:** `LabPage` suma los métodos del mapa, del ejercicio y de los exploradores. No hace falta otro Page Object ni tocar `qa/e2e/fixtures/index.ts`, que toca F6.
- **Los dobles se amplían sin cambiar lo que hay.** `CompilerDouble` suma `answerWithCustom`, `answerLater` (que retiene la respuesta y la suelta a pedido) y `bodies`. `compiler-results.ts` suma `RUST_01` y la marca de la prueba propia.
- **Determinismo:**
  - el reloj, con `page.clock.setFixedTime`, que deja correr los temporizadores. La zona horaria ya es `America/Argentina/Buenos_Aires` en la configuración;
  - el azar, con un script de inicio en la spec que fija `Math.random`;
  - el portapapeles, con un doble de `navigator.clipboard` en un script de inicio, que no depende de los permisos del navegador sin cabeza.
- **Lo que cambia X1 no se fija:**
  - el estado de los paneles después de un filtro, una autoevaluación, una ejecución, una confirmación o una pista;
  - el foco después de «Repasar pendientes» y de autoevaluarse;
  - el estado del filtro después de un redibujo con una búsqueda.

  Sí se fija lo de hoy que React conserva: el foco en el botón de nivel, en «Clásicos y sistemas» y en el de pista, en el editor y en «Restaurar inicio».
- **`rust-02` es misión de campaña:** con el progreso que derivan del laboratorio, el aviso de XP pisa al de «¡Experimento resuelto!». Por eso las ejecuciones libres usan `rust-01`, que no es misión ni núcleo.
- **El progreso congelado tiene el recorrido en Go.** Las pruebas del mapa siembran sólo el laboratorio, y así abre en Rust.
- **Una predicción y una ejecución también guardan Sistemas y campaña** (`syncAfterRun`): las pruebas de escrituras fijan la lista completa.
- **El texto que cambia con A4** (FR-038 de A4: oculta el número de intentos) vive en `qa/e2e/lib/lab-copy.ts`, para que A4 lo edite en un solo lugar.
- **«Borrar todo» durante una ejecución no entra al E2E,** porque F8-Q1 cambia ese flujo por el reset del servidor con contraseña. Lo cubren la spec de la feature (`abort`) y un escenario de `lab-state-check` sobre `TallerLab.reset`.

## R12. Los checks

- **`runner-check`:** carga `frontend/src/shared/api/playground/index.ts` con `runModule` en el mismo contexto vm, con `fetch`, `TextEncoder`, `AbortController`, `URLSearchParams` y los temporizadores falsos. Los 12 escenarios no cambian.
- **`lab-state-check`:**
  - el escenario de dos pestañas que ejecutaba con `window.TallerRunner` pasa a un `fetch` que rechaza, con `TextEncoder` y los temporizadores en el contexto. Sus aserciones no cambian, y recorre el camino real (el adaptador, `runCode` y la falla de red);
  - suma «Borrar todo» durante una ejecución;
  - suma el aislamiento de `lab.js`.
- **`boot-check`:** no cambia. Su escenario «cada fuente legacy evaluada sola no toca el almacenamiento» ya cubre la feature empaquetada dentro de `lab.js`.
- **`load-order-check` y `seams-guard-check`:** no cambian. Ninguna restricción nombra a `register-runner.ts`, y R4 y R6 no miran a `pages/` ni a `features/`.

## Las consultas a Context7

El servidor `context7` de la sesión devolvió «Monthly quota reached» en la primera consulta. Las consultas siguientes se hicieron con el segundo servidor de Context7 configurado, que respondió. Las versiones salen de `package-lock.json` de `f2b-acum`.

| Librería | Versión (lockfile) | ID y tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12`: `createStore` de `zustand/vanilla`, `getState`, `setState` y `subscribe` fuera de React | `subscribe(listener)` devuelve la función que desuscribe y llama al listener con `(state, prevState)`; `setState(next, true)` reemplaza el estado. `useStore(store, selector)` conecta el mismo store con React en F7b | Sí: el estado de la ejecución es un store vanilla y `lab.js` se suscribe |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3`: `vi.doMock` con fábrica que lanza, `vi.resetModules` e `import()` dinámico | `doMock` no se eleva y afecta la próxima importación dinámica; `resetModules` limpia la caché de módulos, no la de mocks; `doUnmock` después | No: es el patrón de las entradas sin estado de F2b, y se repite |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0`: `page.clock.setFixedTime` y `install` | `setFixedTime` fija `Date.now` y `new Date()` y deja correr los temporizadores | Sí: los E2E con fechas usan `setFixedTime`, no `install` con `pauseAt` |
| Playwright | 1.63.0 | `addInitScript` para fijar `Math.random` antes de los scripts de la página | Corre después de crear el documento y antes de sus scripts. El orden entre varios scripts de inicio no está definido | Sí: el azar y el portapapeles se fijan con un script de inicio en la spec; ninguno depende del orden con el de `storage` |
| Playwright | 1.63.0 | `toBeFocused`, `toHaveAttribute` y `keyboard.press('ControlOrMeta+Enter')` | Aserciones que reintentan; `ControlOrMeta` es Ctrl en Linux y ⌘ en macOS | No |
| Playwright | 1.63.0 | `route.fulfill`, `route.abort` y un manejador que no responde; `grantPermissions` para el portapapeles | Un manejador que espera una promesa retiene el pedido; `abort('failed')` es el de hoy | Sí: `answerLater` retiene hasta que la spec suelta. El portapapeles va con un doble, no con permisos |
| CodeMirror | `@codemirror/view` 6.43.13 | `/codemirror/view`: `keymap` con `Mod-Enter` y `Escape` | `Mod-` es Cmd en macOS y Ctrl en el resto, y coincide con `ControlOrMeta` de Playwright | No: el editor no cambia en F7a; los E2E fijan su teclado |
| esbuild | 0.28.2 | Sin consulta: `qa/lib/sources.ts` ya lo envuelve (`bundleSource` y `runModule`) | — | No |
| React 19, Vite (configuración), Testing Library, jsdom, fishery, nuqs y React Hook Form | — | No aplica | F7a no tiene vista nueva, ni specs de componente, ni fábricas, ni URL nuevas, ni formularios, y no cambia la configuración de Vite | — |

## Mediciones y hechos que el plan toma

- **El progreso congelado de master** (`qa/fixtures/progress-master-2a278ad-storage.json`):
  - el recorrido está en Go;
  - el laboratorio tiene 11 registros. En Rust hay 8 resueltos (`rust-02`, `06`, `22`, `101`, `102`, `103`, `09` y `137`), con 205 puntos: 8 × 25 y la reflexión de 73 caracteres de `rust-02`;
  - el 2026-10-06 a las 12:00 UTC hay 7 repasos vencidos, porque el de `rust-02` vence el 2026-10-07;
  - `rust-09` tiene `solvedAt` y un último resultado con las tres pruebas en falso (F7-Q1).
- **El catálogo de Rust** (`build/curriculum.json` generado en la copia):
  - 137 ejercicios y 49 temas;
  - por nivel, 29 inicial, 39 intermedio, 40 avanzado y 29 experto;
  - 25 en «Clásicos y sistemas»;
  - el último es `rust-137`, «Núcleo · Una instrucción llega hasta la RAM».
- **Los mundos de Rust:**
  - `rust-world-1`: `rust-02`, `06`, `22`, `101`, `102` y `103`;
  - `rust-world-2`: `rust-18`, `27`, `78`, `104`, `105` y `106`;
  - `rust-world-3`: `rust-34`, `35`, `86`, `107`, `108` y `109`;
  - `rust-world-4`: `rust-24`, `29`, `99`, `110`, `111` y `112`, y `rust-112` es su jefe. Con el progreso congelado, el mundo 4 está bloqueado.
- **Los exploradores elegidos:**
  - robot: `rust-103`;
  - paquete: `rust-106` y `go-106`;
  - canal: `rust-46`;
  - genérico: `rust-36`;
  - puntero: `rust-51`;
  - ownership: `rust-05`, con `visual: memory`;
  - slices: `go-11`, con `visual: memory` en su etapa;
  - recorrido: `rust-01`, con `visual: flow` por omisión.
