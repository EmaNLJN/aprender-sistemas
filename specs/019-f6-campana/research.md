# Research: F6 · Campaña

Decisiones técnicas del [plan](./plan.md), con sus alternativas, las consultas de Context7 y lo que se midió para planificar. La [spec](./spec.md) dice qué y por qué; esto dice cómo y con qué evidencia.

## Cómo se planificó

- **Sobre qué código.** Todo lo que se cita sale de la integración local de F2a, A2 y las cuatro unidades de F2b (`aprender-sistemas-worktrees/f2b-acum`, `2b37caf4`), que es la base real de la implementación. Se leyó sin editar ni correr nada: ni `npm`, ni Docker, ni navegador. Ninguna afirmación de este archivo viene de ejecutar el código; lo que necesita una corrida lo mide T001 o la tarea dueña.
- **Sin descargas.** Los metadatos de las dependencias del arnés salen de `npm view <paquete>@<versión> version dist.unpackedSize license`, que sólo lee el registro.
- **Context7.** El servidor principal (`mcp__context7__*`) devolvió «Monthly quota reached» en la primera consulta. Todas las consultas se hicieron con el segundo servidor de Context7 configurado en la sesión, que expone las mismas dos herramientas. No hizo falta `WebFetch`.

## Línea base de planificación (leída, no medida)

| Qué | Valor | De dónde |
| --- | --- | --- |
| `frontend/campaign.js` | 201 líneas, 16 832 bytes | `f2b-acum` |
| `frontend/campaign.css` | 740 líneas, 13 598 bytes; `.quest-direct-lock` en las líneas 598 a 615 (cuatro reglas) | `f2b-acum` |
| `dist/index.html` | 1 141 337 caracteres; tope de `build-check`, 1 250 000 | spec (medida del coordinador) |
| Avisos de complejidad de `campaign.js` | 2: `missionHTML` (15) y `onClick` (12) | spec |
| E2E | 106 de F1 más 17 de A2 | spec |
| Escenarios de `lab-bridge-check` | 21; los de campaña son 1 a 10 y 20 | `qa/lab-bridge-check.ts` |
| Versiones instaladas | React y React DOM 19.2.8, Zustand 5.0.15, Vitest 5.0.3, `@playwright/test` 1.63.0, Vite 8.3.2, ESLint 10.12.0, esbuild 0.28.2, TypeScript 6.0.2; jsdom, Testing Library y fishery **no** están | `package-lock.json` de `f2b-acum` |

T001 vuelve a medir todo sobre la base de implementación: el HTML, los avisos, la cantidad de escenarios de cada check y la red.

## R1. Unidades, orden y el commit rojo

**Decisión.** Las cinco unidades de FR-001, en ese orden, en un solo PR que se revierte entero:

1. **E2E** contra el legacy, en verde (T003 a T005).
2. **Modelo y CSS:** los selectores, los conteos y las constantes de `entities/campaign` (T006 a T008), y `.quest-direct-lock` al final de `lab.css` (T009). Sin cambio visible.
3. **La página,** su sesión y sus specs, sin montar (T011 a T014).
4. **El corte:**
   - un commit rojo con los E2E del flujo (p) y la spec del adaptador sobre firmas que lanzan `not implemented` (T015);
   - el commit del corte (T016 y T017), que cablea todo y deja el rojo en verde.
5. **La documentación** (T021).

**Por qué el commit rojo va aparte.** La hoja de ruta («E2E primero») y la spec (FR-003) piden que los E2E de X1 fallen contra el legacy y vayan en el commit en rojo del TDD. El corte tiene que ser un solo commit (FR-001), así que el rojo es el commit anterior. Revertir la unidad 4 es revertir los dos commits: primero el corte y después el rojo.

**Alternativa descartada.** Partir F6 en F6a (E2E, modelo y CSS) y F6b (la página y el corte), como deja abierto la spec. Son 22 tareas y 5 unidades, contra las 19 de F2b en cuatro PR. El corte natural ya está en las unidades, y partir cuesta otro ciclo de Spec Kit y dos PR que tocan `qa/e2e/`.

## R2. Quién inicializa el motor

**Decisión.** `startApp()` en `frontend/app.js` reemplaza `window.TallerCampaign?.init()` por la misma llamada que hacía `campaign.js:init`, en el mismo lugar:

```js
const campaignInit = window.TallerCampaignEngine?.init(
  {
    exercises: window.TallerLab.getExercises(),
    worlds: { rust: window.RUST_CAMPAIGN || [], go: window.GO_CAMPAIGN || [] },
  },
  window.TallerLab?.exportState(),
);
```

Es la misma configuración, la misma evidencia del laboratorio, el mismo orden (después de `TallerLab.init()` y del recorrido, antes de `TallerSystems.init()`) y el mismo aviso de carga (`campaignInit?.loadWarning`). La llamada opcional no evalúa sus argumentos si el motor no está, como antes.

**Por qué ahí.**

- **R4 del guard:** sólo `register-campaign-engine.ts` puede importar valores del índice de `entities/campaign` desde `frontend/*.js` y `app/`. `app.js` no puede importar `campaignEngine`.
- **Las dos copias:** si `app.js` importara un módulo de `app/legacy/` que importa el motor, `app-shell-check` (que empaqueta `app.js` solo) tendría un motor propio, y el `window.TallerCampaignEngine` de su arnés quedaría pisado.
- **Lo que ya existe:** `window.TallerCampaignEngine` ya existe y ya lo lee `app.js` (el respaldo). No hace falta un global nuevo (FR-033), y F10 lo retira con `app.js`.

**Consecuencia en los checks, que no se esconde.**

- Lo espiado cambia de nombre: `TallerCampaign.init` pasa a `TallerCampaignEngine.init`.
- Hay tres valores esperados que nombran la llamada y cambian de texto, sin cambiar de orden ni de sentido:
  - el escenario «shell: al cargar se inicializan campaña y Sistemas…» de `app-shell-check` (`'Campaign.init'` pasa a `'CampaignEngine.init'`);
  - el escenario «startApp calls the adapters in order…» de `app-shell-check` (la misma sustitución dentro del arreglo `startup`);
  - el escenario «startApp initializes in order…» de `boot-check` (`INITIALIZERS` y `'TallerCampaign.init'` pasan a `TallerCampaignEngine`).
- Las tres van en la tabla de correspondencia del PR. Es la decisión 1 del informe al usuario.

**Alternativas.**

- **Conservar `TallerCampaign.init` hasta F10:** no cambia ningún texto de los checks, pero contradice la hoja de ruta y la spec (FR-034), que lo retiran en F6.
- **Mover el armado de la configuración a un módulo nuevo de `app/legacy/`:** necesita el motor (R4) o un global nuevo (FR-033).

## R3. Dos módulos de adaptador y un solo objeto

**Decisión.**

- **`frontend/src/app/legacy/campaign-bridges.ts`:**
  - exporta `campaignBridges`, con `refresh`, `sync`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML`, y no publica nada;
  - no importa React, la página ni el índice del slice (R4);
  - captura `window.TallerCampaignEngine` al evaluarse, como `campaign.js`, así que la restricción de orden de `load-order-check` se conserva;
  - lee `window.TallerLab` al llamarse, como hoy.
- **`frontend/src/app/legacy/register-campaign.tsx`:**
  - importa los puentes, la página y `getContent()`;
  - publica una sola vez `window.TallerCampaign = Object.freeze({ mount, unmount, ...campaignBridges })`: siete métodos (FR-033).
- **`lab-bridge-check`** carga los puentes con `runModule` (`qa/lib/sources.ts`), que devuelve las exportaciones del módulo en el contexto VM del check. Es un cambio de «cómo carga» (FR-043): el check sigue sin React y con el motor de `register-campaign-engine.ts` como única instancia.

**Por qué.** `runSource` empaqueta cada fuente por separado. Si el módulo que publica el global importara la página, el contexto del check tendría React y un segundo `campaignEngine` (riesgo 11 de la spec). Los dos módulos se agregan a la lista de «fuentes evaluadas solas» de `boot-check` (FR-036):

- `campaign-bridges.ts` con `runSource`, como las demás;
- `register-campaign.tsx` con `bundleApp`, porque tiene JSX y React, igual que `main.tsx`: `bundleSource` no fija `jsx: 'automatic'` ni `process.env.NODE_ENV`.

**`Object.freeze`.** Es como `register-atlas.tsx` y `register-effects.ts`. Nadie parcha `window.TallerCampaign` después de F6. El único que lo parchaba es `boot-check` (para `init`), y ahora parcha `TallerCampaignEngine.init`, que no se congela. `lab-state-check` asigna su propio objeto falso antes de cargar `lab.js`, sin tocar el real.

## R4. El tipo de misión y las constantes, por la entrada sin estado

**Decisión.**

- **`entities/campaign/bridge.ts` crece:** suma `missionTypeLabel`, `CODE_XP` y `PREDICTION_XP`, que el puente de contexto necesita para su `«<n>/30 XP · <tipo>»` (FR-029 y FR-030).
- **El índice suma lo mismo,** más el resto de los selectores, `PASS_SCORE`, `WORLD_MAX_SCORE` y sus tipos (FR-027).
- **`model/selectors.ts`** importa sólo tipos y nada con estado. Las constantes siguen definidas en `model/rules.ts`, sin moverse (FR-005).

**El respaldo del guard:**

- `bridge.spec.ts` ya prueba que la entrada se importa con los cinco módulos con singleton reemplazados por fábricas que lanzan. Sumar un reexport con estado la rompe; T006 suma la aserción de que la entrada expone las tres cosas nuevas.
- `seams-guard-check` suma tres escenarios con fuentes virtuales en `frontend/src/app/legacy/campaign-bridges.ts` (T008):
  - importar `../../entities/campaign/bridge` da 0 violaciones;
  - importar `../../entities/campaign/model/selectors` da R6;
  - importar el valor `missionTypeLabel` del índice da R4.
- R4 y R6 no se relajan.

**`ChallengeType`.** El selector recibe el `challengeType` de un ejercicio, que es un tipo de `entities/exercise`. Se agrega `export type { ChallengeType } from '../model/types';` a `entities/exercise/@x/campaign.ts`, el canal cruzado que ya usa la campaña para `hasPassingEvidence`. Es un export de tipo y no evalúa nada.

**Alternativas.**

- **Duplicar el tipo de misión en el adaptador:** la spec lo prohíbe («no se duplica»).
- **Un import profundo:** R6 lo prohíbe.
- **Una tercera entrada pública:** no hace falta; `bridge.ts` ya es la entrada sin estado del slice.

## R5. Selectores y conteos

**Decisión.** Un solo módulo puro, `entities/campaign/model/selectors.ts`, con estas funciones (contrato en [contracts/campaign-interfaces.md](./contracts/campaign-interfaces.md)):

- `rankName` y `rankSymbol`: cinco rangos y cuatro símbolos, por mundos completos;
- `worldSymbol`, `worldState`, `worldStateName` y `worldMapStatus`;
- `missionTypeLabel`;
- `MISSION_FILTERS` y `matchesMissionFilter`;
- `campaignCounts`.

`campaignCounts(worlds)` devuelve `{ worlds, missions, newChallenges }`:

- `worlds` es la cantidad de mundos;
- `missions` es la suma de `missionIds`;
- `newChallenges` es la suma de `challengeIds`.

La página no cuenta. El «<n> de <mundos> insignias» usa `counts.worlds`.

**Lo que no se generaliza** (riesgo 8 de la spec; E1 lo decide):

- con un quinto mundo, `rankName(5)` y `worldSymbol(4)` devuelven `undefined`. El legacy escribía el texto «undefined» y React no dibuja nada;
- «MUNDO 0N» sigue con su `0` escrito;
- `WORLD_MAX_SCORE` sigue siendo una constante.

Las specs no afirman nada sobre un quinto símbolo ni un sexto rango.

## R6. Las constantes reemplazadas, sin tocar el motor

**El problema.** `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` viven en `model/rules.ts`, y el motor las usa como enlaces locales del módulo:

- el `maxScore` de cada mundo y del resumen;
- los puntos de cada misión;
- los motivos «Sumá N puntos para llegar a 150/180.».

Un `vi.mock` del índice con `importOriginal` cambia lo que la página importa (20, 10 y 150), pero no el `maxScore` que deriva el motor.

**Decisión** (la del advisor, que respeta FR-005: el modelo no se toca salvo para sumar exports y selectores). `CampaignPage.constants.spec.tsx`:

1. Reemplaza en el índice las cuatro constantes por 7, 4, 77 y 99, con `vi.mock('../../../entities/campaign', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../../entities/campaign')>()), … }))`. La forma con `import()` exige los tipos del módulo, y `CODE_XP` tiene el tipo literal `20`. Los componentes importan las constantes del índice, no de `bridge.ts`, para que el reemplazo les llegue.
2. Envuelve `campaignEngine.getWorlds` y `getSummary` con `vi.spyOn`: llaman al original y devuelven `maxScore` 99 por mundo y 4 × 99 = 396 en el resumen. La misión vale 7 + 4 = 11, que no coincide con ningún literal viejo.
3. Arma el catálogo a mano, con textos sin números (fábricas de fishery), y el progreso en blanco, así que ningún punto derivado coincide con un literal viejo.
4. Afirma cada número de la lista de la spec con su valor nuevo. Después busca `20`, `10`, `30`, `150`, `180` y `720` como palabras en el texto y en los atributos de `#main`, sin los `<li>`.

Los `<li>` son los motivos que escribe el motor, y la guía del contenido. Los motivos conservan las constantes del motor, que F6 no toca, y E1 los cambia en el motor.

**Alternativa descartada.** Mover las cuatro constantes a un módulo hermano (`model/xp.ts`) y mockear ese módulo, para que el motor también las vea. La prueba sería más completa, pero toca `entities/campaign/model` más allá de «sumar exports y selectores puros» (FR-005).

## R7. La coherencia del texto editorial (FR-031)

**Decisión.** `CampaignPage.editorial.spec.tsx`, en jsdom, dibuja la página con el catálogo real (`build/curriculum.json`, como la spec del motor).

**Las cuatro frases y dónde se buscan:**

| Frase | Palabra | Dónde aparece |
| --- | --- | --- |
| «Seis misiones para conectar las piezas.» | `seis` | cuerpo del mundo abierto |
| «verificar sus seis misiones» | `seis` | nota «Una ruta con propósito» |
| «Se abre al verificar las seis misiones» | `seis` | checkpoint cerrado |
| «Completaste los cuatro mundos.» | `cuatro` | aviso al completar el último mundo |

Las tres primeras se ven en un navegador vacío. La cuarta sale de responder bien el checkpoint del mundo 4, con la clave de campaña sembrada (todos los sellos de Rust y los checkpoints 1 a 3 superados).

**Cómo compara.**

1. Lleva una tabla de palabras a números (`seis` → 6, `cuatro` → 4) y cuenta el catálogo real en la spec: misiones por mundo de cada mundo de cada lenguaje, y mundos por lenguaje.
2. Si una frase no se encuentra, falla diciendo cuál falta.
3. Si un conteo no coincide, falla con «La frase «…» dice «seis» y el catálogo tiene N misiones en <mundo>: editala en <archivo>».

**Alternativas.**

- **Leer el código fuente con `?raw`:** Prettier puede partir una frase larga en dos líneas de JSX.
- **Pasar las frases a constantes de un módulo:** la nota tiene `<strong>` y un enlace en el medio y quedaría partida en pedazos.

## R8. La sesión, el montaje y `refresh`

**La sesión** es un objeto de módulo en el adaptador, como la del Atlas, pero una sola (no una por idioma; FR-013): `{ selected: string | null; filter: MissionFilter }`.

**El montaje** repite el orden de `campaign.js:mount`:

1. `campaignBridges.refresh()` absorbe la evidencia del laboratorio en memoria (FR-023).
2. `openCampaignSession(session, language, readLinkQuery(location.search).world)` resuelve el mundo con el motor y la regla de hoy, y el resultado queda en la sesión del módulo antes del primer dibujo.
3. Se crea la raíz y se dibuja la página.

**Por qué el resultado del montaje se guarda.**

- El legacy asigna `selected` en `mount`, y esa asignación se ve: si el alumno supera el checkpoint del mundo 1, va al Atlas y vuelve, sigue en el mundo 1.
- Si la página resolviera el mundo sólo en su estado, al volver caería en el primer mundo abierto sin completar.
- `openCampaignSession` vive en `pages/campaign/model/`, que sí puede importar el motor. El adaptador no puede (R4).

**`refresh` una sola vez.**

- **El legacy:** `render()` llama `refresh()` en cada acción.
- **La página:** lo llama sólo al montar.
- **Por qué es lo mismo:**
  - mientras la campaña está montada, el laboratorio no lo está (el shell monta una vista por vez);
  - ningún almacén escucha el evento `storage`;
  - responder un checkpoint fusiona con la copia guardada sumando sellos (`mergeImportedState`), así que la evidencia derivada sigue ahí.

La llamada de `app.js:render()` antes de cada vista sigue hasta F10 (spec, «Qué se retira»).

**El filtro sobrevive al cambio de idioma.** Es una rareza de lógica del legacy: `mount` no reinicia `filter`. La sesión única la conserva (C2), y la fija el flujo (k).

## R9. Foco, `flushSync`, identidad de los nodos y lo que cambia a propósito

**Cada acción** hace lo mismo que el delegado de hoy, en el mismo orden de efectos:

| Acción | Orden de efectos |
| --- | --- |
| Elegir un mundo | `history.replaceState` con `withWorldQuery`; `flushSync` de la sesión; `scrollIntoView({ block: 'start', behavior: 'instant' })` de `#quest-world`; `focus({ preventScroll: true })` del título |
| Filtrar | `flushSync` de la sesión; `focus({ preventScroll: true })` del botón (`event.currentTarget`, que React conserva) |
| Responder | `before`; `answerCheckpoint` dentro de `flushSync`, porque la revisión de Zustand dispara un render que tiene que estar en el DOM antes del foco; el foco en la opción; `after`, `celebrate` y el aviso |

`useSyncExternalStore` no hace síncrono el render por sí solo. Context7: React, `flushSync` y `useSyncExternalStore`.

**Identidad de los nodos (X1).**

- Las tarjetas de misión llevan `key={mission.id}`, los nodos del mapa `key={world.id}`, las insignias `key={world.id}` y las opciones `key={index}`.
- El cuerpo del mundo (abierto o bloqueado) y el bloque «completado o siguiente movimiento» ocupan siempre la misma posición entre sus hermanos. Así los `<details>` de las reglas y de los requisitos, y la región de la retroalimentación, conservan su nodo, su estado y el foco.

**Pruebas rojas de lo que cambia** (flujo p, T015). Fallan contra el legacy por la razón esperada:

| Qué fija | Cómo |
| --- | --- |
| `<details>` abiertos | se abre el `<details>`, se actúa y se espera `toHaveJSProperty('open', true)`. El legacy lo recrea cerrado |
| Foco que no se pierde | se marca el nodo enfocado con una propiedad (`__f6Marker`), se pulsa Enter y se espera `toBeFocused()` y la marca. El legacy enfoca un nodo nuevo, sin la marca |
| Región montada (X2) | se marca `.checkpoint-feedback`, se responde y se espera la marca con `toHaveJSProperty` |
| Transición de `.world-node` (C2) | bajo `no-preference`, un `page.evaluate` hace `click()` sobre otro nodo y devuelve `getAnimations().length` del nodo que perdió `.selected`: mayor que 0 con React, que lo conserva; 0 con el legacy, que lo desconectó |

## R10. `stop()` siempre al desmontar

**El legacy.** `campaign.js:unmount` llama `TallerEffects.stop()` siempre, y `app.js:render()` llama `TallerCampaign.unmount()` antes de cada vista.

**Decisión.** Es una rareza de lógica (C2 la conserva): el `unmount` del adaptador hace `root?.unmount(); root = null; stop();`, esté montada la página o no. La spec del adaptador (T015) lo fija llamando `unmount()` sin montar.

**Hallazgo para F5.** `systems.js:unmount` también llama `stop()` siempre. Es la misma rareza, y el adaptador de F5 tiene que conservarla. Si uno de los dos la sacara, la celebración del otro dependería de que el `unmount` que queda siga siendo incondicional.

## R11. El CSS

1. **T009** corta las cuatro reglas de `.quest-direct-lock` (`h1`, `h1 em`, `p, li` y `ul`) de `campaign.css` y las pega al final de `lab.css`, sin cambiar una declaración. Quedan antes de `atlas.css` en la cascada, en lugar de después.
   - El barrido de estilo computado sobre las dos páginas del laboratorio que dibujan campaña (el bloqueo y el contexto) prueba que nada de `atlas.css` las pisa.
   - R10 de `css-contract` las mide sin editarse.
2. **El corte** mueve el resto con `git mv frontend/campaign.css frontend/src/pages/campaign/ui/campaign-page.css`, y `main.tsx` cambia su import en la misma línea. El orden de carga es el de hoy: después de `atlas.css`, antes de `quest-explorers.css` y `systems.css`.

**El nombre `campaign-page.css`.** SC-008 pide que `git grep -E 'campaign\.(js|css)'` no encuentre referencias. Una hoja llamada `campaign.css` las seguiría dando en `main.tsx` y en la documentación.

**El orden del `<style>`.** Vite con `vite-plugin-singlefile` concatena las hojas en el orden de los imports de `main.tsx`. Lo midió la unidad 8 de F2b con el mismo barrido, y lo vuelve a medir T018.

## R12. El arnés de componentes, si F6 es el primero

**El predicado comprobable:** `node -e "require.resolve('jsdom')"` falla y `package.json` no nombra `jsdom`. Si el arnés ya está, T002 sólo comprueba que exista lo de abajo y lo usa.

**Las versiones** son las del ADR 0008 y la hoja de ruta. El registro tiene parches más nuevos de dos (hallazgo; decisión 2 del informe):

| Paquete | Versión | Peso desempaquetado | Licencia | Más nueva |
| --- | --- | --- | --- | --- |
| `jsdom` | 30.1.2 | 5 533 799 B | MIT | 30.1.3 |
| `@testing-library/react` | 16.3.3 | 339 581 B | MIT | — |
| `@testing-library/dom` | 10.4.2 | 2 467 302 B | MIT | — |
| `@testing-library/user-event` | 14.6.7 | 437 525 B | MIT | 14.6.8 |
| `@testing-library/jest-dom` | 7.0.1 | 331 873 B | MIT | — |
| `fishery` | 2.4.0 | 135 590 B | MIT | — |

Con sus dependencias, el ADR estimó 56 paquetes y 26,3 MB para jsdom y Testing Library, y 2 paquetes y 0,19 MB para fishery. Todo va en `devDependencies` y nada es alcanzable desde `main.tsx`.

**La configuración:**

- **Vitest 5:** los proyectos en línea heredan la configuración raíz por omisión (`extends: true`), y los arreglos (`include`, `setupFiles`) se concatenan (Context7).
  - Por eso la raíz de `frontend/vitest.config.ts` sólo lleva `projects`, y cada proyecto declara su `include`, su `environment` y su `setupFiles`.
  - Si `include: ['**/*.spec.ts']` quedara en la raíz, el proyecto `jsdom` también correría las specs de `node`. Es un hallazgo para F3 y para la enmienda del ADR 0008.
- **El setup:** `frontend/src/vitest-setup-dom.ts` importa `@testing-library/jest-dom/vitest` y llama `cleanup()` en `afterEach`, porque sin `globals` Testing Library no limpia sola (Context7). Vive en `src/` para que `tsc` vea el aumento de tipos de jest-dom (ADR 0008).
- **La guarda de `useStore`** (FR-026) es `no-restricted-syntax` con `CallExpression[callee.name='useStore'][arguments.length=1]`. Es el ejemplo de la documentación de ESLint con `arguments.length`, ajustado: con un solo argumento, `useStore(store)` suscribe al store entero. Va en `eslint.config.ts`, para `frontend/src/**/*.{ts,tsx}`.

## R13. Lo compartido con F5, con predicados que un subagente puede comprobar

| Tema | Predicado | Si da sí | Si da no |
| --- | --- | --- | --- |
| `register-effects.ts` | `git grep -n "TallerEffects" -- 'frontend/*.js' 'frontend/src' ':!frontend/src/app/legacy/register-effects.ts'` imprime algo después de borrar `campaign.js` | se queda (Sistemas todavía lo lee) | T016 lo borra, saca su línea de `legacy-views.ts` y T021 actualiza la fila «Animaciones» de `docs/architecture.md` |
| `lab-bridge-check`, la mitad de Sistemas | `git grep -n "SYSTEMS_UI_SOURCE = 'frontend/systems.js'" qa/lib/legacy-sources.ts` | F5 no entró: sólo cambia la mitad de campaña | F5 entró: se rebasa sobre su versión y se cambia sólo la mitad de campaña |
| `startApp()` | `git grep -n "TallerSystems?.init()" frontend/app.js` | la línea vecina sigue igual | se rebasa; F6 cambia sólo la línea de campaña |
| El arnés | R12 | se usa | lo trae T002 con permiso |

**La aserción de `lab-bridge-check`** sobre lo que devuelve la inicialización (`{ ready: true, storageAvailable: true, loadWarning: '' }`) pasa a la llamada que inicializa el motor (`context.TallerCampaignEngine.init(…)`), que devuelve lo mismo. La de Sistemas (`TallerSystems.init()`) no cambia: F5 conserva `init` hasta F10.

## R14. Las comparaciones únicas

**El conjunto fijo de estados** (FR-044, 19 estados, más de los 18 mínimos):

| # | Estado |
| --- | --- |
| S01 | Navegador vacío en Rust |
| S02 | Navegador vacío en Go (clic en «Go») |
| S03 | Progreso de master en Rust (las claves de laboratorio, campaña y Sistemas, sin la del recorrido) |
| S04 | Progreso de master en Go (las cuatro claves: el recorrido guardado está en Go) |
| S05 a S08 | S03 con cada uno de los cuatro mundos de Rust elegido |
| S09 a S12 | S03 con el mundo 2 y cada filtro (Entrenamiento, Reparación, Kata, Desafío final) |
| S13 | Sólo la clave del laboratorio de master (el checkpoint del mundo 1 abierto) |
| S14 | S13 después de responder mal (A) |
| S15 | S13 después de responder bien (B) |
| S16 | Todos los sellos de Rust y los checkpoints 1 a 3 superados (el último mundo abierto) |
| S17 | Los cuatro checkpoints superados |
| S18 | El almacenamiento bloqueado |
| S19 | Sólo el sello de pruebas de `rust-02` (el «siguiente movimiento» pide la predicción) |

La misión con práctica con apoyo es `rust-22`, del mundo 1 en S05.

**Qué compara.**

- **El DOM de `#main`:**
  1. Se clona el nodo y se llama `normalize()`, que junta los nodos de texto vecinos; React parte el texto que mezcla literales y expresiones.
  2. Se descartan los nodos de texto que son sólo espacio.
  3. Se ordenan los atributos.
  4. Se quitan `data-quest`, `data-id`, `data-filter` y `data-answer`.
  5. Se compara el resto exacto, incluidos los espacios de más en `class` que el legacy escribe (`world-node available `, `quest-mission   `) y los `class=""`. Por eso la página copia cada expresión de clase del legacy tal cual.
- **El estilo computado** de cada elemento del documento, a los seis anchos y con las dos preferencias de movimiento, como el barrido de la unidad 8 de F2b.
- **El árbol de accesibilidad** de `#main`, con `locator.ariaSnapshot()` de Playwright 1.63.
- **La espera:** los estados que siguen a una acción se miden después de mover el puntero a (0, 0), esperar a que `document.getAnimations()` termine y a que el aviso del shell se oculte.
- **La cuenta:** 19 × 12 = 228 capturas de estilo por build, 19 DOM y 19 árboles. El script está en [quickstart.md](./quickstart.md) §3.

**Lo que no se acepta al final.** Las únicas diferencias aceptadas son las de la spec. Una diferencia que no está en esa lista se corrige en el código, no se agrega a la lista.

**La comparación de los puentes** (FR-035, SC-005) adapta la de la unidad 5 de F2b:

- la base carga `campaign.js` y llama `TallerCampaign.init()`;
- F6 carga los puentes con `runModule` e inicializa el motor con la misma configuración;
- se comparan `exerciseContextHTML`, `lockedExerciseHTML` y `returnURL` para todos los ejercicios, mundos, lenguajes, dos estados del laboratorio y los parámetros presentes, ausentes y vacíos.

## R15. El tamaño

- **Lo que sale:** `campaign.js` (unos 16 800 caracteres antes de minificar).
- **Lo que entra:**
  - la página (nueve componentes, que repiten el mismo marcado);
  - los selectores;
  - los dos adaptadores;
  - la entrada de React de `zustand` (`useStore` sobre `useSyncExternalStore`, unos cientos de caracteres).
- **Estimación:** entre +3 000 y +12 000 caracteres minificados.
- **La compuerta de T020** exige quedar bajo 1 250 000. Si el aumento pasa de 15 000, se para y se avisa al coordinador antes de abrir el PR, porque el margen de unos 108 000 lo comparten F3 a F11 y A3.

## R16. El riesgo de E1, anotado sin cambio

E1 va a romper tres supuestos que F6 no toca (spec, riesgo 8):

- los cinco rangos y los cuatro símbolos;
- «MUNDO 0N», con dos cifras hasta nueve mundos;
- `WORLD_MAX_SCORE` como constante en lugar de seis misiones por treinta puntos.

F6 los deja escritos en `selectors.ts` (`RANKS` y `WORLD_SYMBOLS`) y en la página (`MUNDO 0{n}`), y la spec de coherencia (R7) avisa de las palabras. Ninguna tarea los generaliza.

## R17. Lo que no se hace (YAGNI)

- un store propio de la página;
- memoización;
- un contexto o provider: las acciones bajan como props uno o dos niveles;
- una librería de animación;
- capturas de pantalla;
- reescribir el CSS;
- `type="button"` en los botones (el legacy no lo tiene y la comparación del DOM lo vería);
- un `useEffect` para derivar datos o para la sesión;
- una regla de `selectors.ts` para el rótulo «TU EXPEDICIÓN / MUNDO COMPLETADO / PRÓXIMA FRONTERA», que es texto de la página y se elige con `worldState`.

## Consultas a Context7

| Librería | Versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| React | 19.2.8 (`/websites/react_dev_reference`) | `flushSync` antes de mover el foco | Fuerza el render dentro del callback; en un manejador de eventos es seguro; dentro de un efecto, no | Sí: las tres acciones usan `flushSync` y el foco va después (R9) |
| React | 19.2.8 | `createRoot` con `onUncaughtError`; `root.unmount` | Las opciones van en `createRoot`, no en `render`; después de `unmount` se crea otra raíz | Confirma el adaptador (FR-020) |
| React | 19.2.8 | `useSyncExternalStore` | Re-dibuja cuando cambia la instantánea; no dice que el render sea inmediato | Sí: `answerCheckpoint` va dentro de `flushSync` |
| Zustand | 5.0.15 (consultada la 5.0.12, `/pmndrs/zustand`) | `useStore(store, selector)` con un store de `zustand/vanilla` | `useStore` de `zustand` con selector; sin selector devuelve el estado entero | Confirma FR-022 y la guarda de FR-026 |
| Vitest | 5.0.3 (`/vitest-dev/vitest/v5.0.3`) | `test.projects` en línea | Heredan la raíz (`extends: true` desde la 5.0) y concatenan `include` y `setupFiles` | Sí: la raíz sólo lleva `projects` (R12) |
| Vitest | 5.0.3 | `vi.mock` con `importOriginal` y la forma con `import()` | Reemplaza exportaciones; las funciones originales no ven el reemplazo (sólo el acceso externo) | Sí: R6 suma el `vi.spyOn` del motor |
| Testing Library (React) | 16.3.3 | `cleanup` sin `globals` | Sin `afterEach` global no hay limpieza automática; `cleanup()` desmonta y saca el contenedor | El setup llama `cleanup()` (R12) |
| Testing Library (user-event) | 14.6.7 | `userEvent.setup()`, `click`, `keyboard`, `tab` | Una sesión por `setup()`; cada interacción es asíncrona | Las specs crean la sesión antes de `render` y esperan cada interacción |
| jest-dom | 7.0.1 | Con Vitest | `import '@testing-library/jest-dom/vitest'` en el setup, que va en `setupFiles` | El setup (R12) |
| jsdom | 30.1.2 (la documentación de Context7 es de la 29) | APIs de layout | `scrollIntoView` está comentado en el WebIDL y `matchMedia` figura como no implementado | Las specs doblan `scrollIntoView` y `matchMedia`; el foco real y el desplazamiento se prueban en E2E |
| fishery | 2.4.0 (`/thoughtbot/fishery`) | `Factory.define`, `sequence`, `build`, `buildList`, `transient` | `buildList` incrementa la secuencia; los parámetros transitorios no aparecen en el resultado | Las fábricas de mundos y ejercicios (T013) |
| Playwright | 1.63.0 (`/microsoft/playwright/v1.63.0`) | `reducedMotion` con `test.use`; `toBeFocused`; `toHaveJSProperty`; `locator.evaluate` | Existen y son los que usa `css-contract` | Los flujos (n) y (p) y la comparación |
| Vite | 8.3.2 (consultada la 8.0.10) | El orden del CSS en el build | Una hoja por entrada sin división; el orden es el de los imports | Confirma que la hoja de la página va en la misma línea de `main.tsx` (R11) |
| ESLint | 10.12.0 (consultada la 10.5.0) | `no-restricted-syntax` con `arguments.length` | El ejemplo oficial usa `CallExpression[callee.name='setTimeout'][arguments.length!=2]` | La guarda de `useStore` (R12) |
| nuqs | — | — | No aplica: F6 no lleva el mundo ni el filtro a la URL (spec, «Queda fuera») | — |
| React Hook Form | — | — | No aplica: la campaña no tiene formularios | — |
| Laravel, Pest y PHPStan | — | — | No aplican: F6 no toca el backend | — |
| Docker y gVisor | — | — | No se configura nada; `docker compose build taller` corre una vez, con permiso, para comprobar la imagen web | — |

## Análisis de consistencia (speckit-analyze)

Se pasó el criterio de `/speckit-analyze` sobre la spec, el plan, `tasks.md` y los contratos, el 2026-10-28.

**Cobertura.**

| Qué | Resultado |
| --- | --- |
| Requisitos (FR-001 a FR-048) | 48 de 48 tienen tarea en «Cobertura de requisitos» |
| Criterios (SC-001 a SC-012) | 12 de 12 |
| Contratos de «Qué se conserva» | 14 de 14 tienen prueba (la tabla de SC-009 del plan) |
| Roturas de FR-045 | las 6 de la spec están entre las 14 de T019 |
| Historias | US1 a US6 trazadas en las tareas |
| Tareas | 22, y cada una remite a una sección del plan |

**Hallazgos y cómo quedaron.**

| # | Severidad | Hallazgo | Resolución |
| --- | --- | --- | --- |
| A1 | Alta, resuelta | La spec de las constantes reemplazadas no podía cumplirse con un `vi.mock` del índice: el `maxScore` del motor sale de enlaces locales de `rules.ts` | R6: se envuelven `getWorlds` y `getSummary`, el catálogo es armado y sin números, y el barrido excluye los `<li>` del motor. Mover las constantes quedó descartado por FR-005 |
| A2 | Media, a decidir | FR-043 prohíbe cambiar valores esperados, y retirar `init` (FR-034) cambia el nombre de lo espiado en tres lugares de dos checks | R2 y decisión 1 del informe; la correspondencia de §4.4 lo muestra |
| A3 | Media, resuelta | FR-017 y FR-037 dicen que «la página» detiene la celebración; el legacy lo hace en todo `unmount` | `stop()` va en el `unmount` del adaptador, incondicional (R10); la página usa `celebrate`. Ninguno lee `window.TallerEffects` |
| A4 | Media, resuelta | La comparación del DOM daría diferencias por los espacios de las clases del legacy y por los textos partidos | Las reglas de fidelidad (plan §3.1) y el normalizador de quickstart.md §3.2 |
| A5 | Baja, resuelta | FR-001 pone los adaptadores en el commit del corte, y T015 crea sus firmas en el commit rojo | La unidad 4 son dos commits; el rojo sólo tiene firmas que lanzan, sin cablear (R1) |
| A6 | Baja, resuelta | FR-016 pide refs; el foco de los filtros y de las opciones usa `event.currentTarget` | Es el mismo nodo que React conserva y el foco es explícito; el título del mundo usa un ref |
| A7 | Baja, hallazgo para la spec | SC-003 dice que cambiar de idioma da 0 escrituras, pero `app.js` guarda el idioma en `taller-learning-v1` (lo usa la compatibilidad de `boot-check`) | Los E2E miden 0 escrituras en `taller-campaign-v1` |
| A8 | Baja, hallazgo para la spec | US1-9 dice que el mundo y el filtro se pierden al recargar, pero si la URL tiene `?mundo=` el mundo vuelve por ella | El flujo (l) pasa por el laboratorio, que deja la URL sin query, y fija las dos cosas |
| A9 | Baja | Los nombres de módulos de la spec eran provisionales (`register-campaign.tsx` y el del puente) | El plan los fija: `register-campaign.tsx` y `campaign-bridges.ts`, más la hoja `campaign-page.css` (R11) |

**Contra la constitución.** No hay conflictos. Las cuatro decisiones de Complexity Tracking del plan no contradicen ningún principio.
