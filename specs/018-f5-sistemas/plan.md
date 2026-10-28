# Implementation Plan: F5 · Port de Sistemas

**Branch**: `018-f5-sistemas` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F5, clarificada el 2026-10-28 (Q1 a Q3 y el ruling C2). Decisiones, consultas y mediciones: [research.md](./research.md). Validación y comparaciones únicas: [quickstart.md](./quickstart.md). Interfaces públicas: [contracts/taller-systems.md](./contracts/taller-systems.md). Tareas: [tasks.md](./tasks.md).

**Objetivo.** Reemplazar `frontend/systems.js` por una página de React en `pages/systems` que el alumno no distinga de la vista legacy, con la selección en la URL por nuqs y un adaptador mínimo que conserva los nueve métodos de `window.TallerSystems`.

**Arquitectura.**

- **La página** monta su raíz sobre `#main` desde `frontend/src/app/legacy/register-systems.tsx`, como el Atlas.
- **Lo que lee:** el motor, con `useStore` y un selector chico; la selección, con un hook de nuqs; el resto se lo inyecta el adaptador (los modelos, los ejercicios, el aviso, la descarga del kit y el desplazamiento de `#main`).
- **La sesión de las simulaciones** es un módulo de la página.
- **La escena** pasa por una función pura de `entities/systems-simulation` antes de dibujarse con elementos de React.
- **Los checks atados al legacy** cambian cómo cargan, no lo que esperan.

**Stack.** TypeScript y React 19.2.8 sobre Vite 8.3.2. Una dependencia de ejecución nueva: nuqs 2.10.2, si F3 no la instaló antes. Zustand 5.0.15 (`useStore`). Vitest 5.0.3 con jsdom 30.1.2, Testing Library y fishery 2.4.0, si F3 no los instaló antes. Playwright 1.63.0.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Reglas para todos los agentes», la sección 0 y la de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T026) y remite acá.
> - **Decisiones que esperan al usuario** (informe del plan): **D1**, si se aceptan las tres diferencias de nuqs con la URL de hoy (research.md, R2), que decide si corre T006; y **D2**, si F5 retira `register-effects.ts` cuando entra después de F6 (R13).
> - **Lo que se verificó al planificar:** sólo lectura de código, documentación oficial y metadatos del registro. No corrió ningún comando del repositorio (research.md, «Lo que no se verificó»).

## Summary

- **El orden** es el de la spec: los E2E primero, en verde contra el legacy; después las piezas sin montar con sus specs; después un corte de un solo commit; y al final las compuertas y las comparaciones únicas (FR-038, FR-042).
- **Un solo PR, revertible entero** (FR-047). Se integra de a uno con F3, F4, F6 y F9 (FR-048): T001 detecta qué entró antes, y cada tarea condicional dice qué hace en cada caso (research.md, R13).
- **Las tres verificaciones que deciden el diseño van primero** (T003):
  - V6: el adaptador real de nuqs en jsdom escribe las URL esperadas;
  - V1: el peso de nuqs y de `useStore`;
  - V3: un solo motor en `lab-bridge-check`, que también prueba T009.
- **Lo que no cambia:** `frontend/app.js` (FR-049), `content/`, los modelos y el kit.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`. Node 24.21.0.

**Primary Dependencies**:

- `react` 19.2.8, `react-dom` 19.2.8 y `zustand` 5.0.15, ya instaladas;
- `nuqs` 2.10.2, nueva y de ejecución (FR-046);
- en desarrollo, si F3 no llegó antes: `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7, `@testing-library/jest-dom` 7.0.1 y `fishery` 2.4.0.

**Storage**: `taller-systems-v1`, formato v1, sin cambios (FR-013). Ningún otro almacenamiento: la sesión vive en memoria y la selección, en la URL.

**Testing**:

- **Vitest:** el proyecto `node` para `*.spec.ts` y el `jsdom` para `*.spec.tsx`, con Testing Library y fishery;
- **Playwright:** la red de F1 y A2 sin editar, más los E2E nuevos de Sistemas;
- **los checks de `qa/`;**
- **las comparaciones únicas** del quickstart (el DOM, las escenas, el barrido de estilo y la CSP).

**Target Platform**: navegador moderno (ES2020), servido por Nginx; Linux y macOS.

**Project Type**: aplicación web; port de una vista legacy a React.

**Performance Goals**: ninguno nuevo. Se informan el tamaño del HTML y el tiempo de los E2E.

**Constraints**: ver «Restricciones globales».

**Scale/Scope**:

- **Archivos de producción nuevos (23):**
  - los 20 de la página: el índice, 5 de `model` y 14 de `ui`;
  - el adaptador, `url-state.tsx` y el saneo;
  - aparte, la fábrica de prueba.
- **Specs (13) y archivos de E2E nuevos (5):** tres specs, `pages/method.ts` y `lib/systems-progress.ts`.
- **Cambian:**
  - 9 archivos de QA;
  - 2 de arranque (`legacy-views.ts` y `main.tsx`) y 1 índice de entidad;
  - si F5 trae nuqs y el arnés, 5 de configuración: `package.json`, el lockfile, `eslint.config.ts`, `frontend/vitest.config.ts` y `THIRD-PARTY-NOTICES.txt`.
- **Se borran:** `frontend/systems.js` y, si entra D2, `register-effects.ts`.
- **Se muda:** `frontend/systems.css`.

## Restricciones globales

Copiadas de la spec, la constitución y la hoja de ruta. Valen para todas las tareas.

- **La red, sin editar:**
  - los 106 E2E de F1 y los 17 de A2 (`content-gate.spec.ts`); el diff de las specs que ya están en `qa/e2e/specs/` tiene que ser vacío (FR-039, SC-001);
  - `SystemsPage` sólo suma métodos;
  - los fixtures de `qa/e2e/fixtures/` sólo suman métodos y una fixture `method`.
- **Los valores esperados que no cambian** (FR-040, SC-004):
  - `curriculum-ids-check`, `systems-check`, los cuatro `systems-<dominio>-check`, `lab-bridge-check` (21 de 21), `project-kit-check`, `campaign-check`, `versioned-storage-check`, `app-shell-check` y `boot-check`;
  - `build/curriculum.json` y `node tools/content/dump-globals.ts .` dan los mismos bytes.
- **El progreso** (FR-013 y FR-014):
  - `taller-systems-v1`, con un registro `<lenguaje>:<taller>` que lleva `observed`, `code`, `predicted`, `answer`, `steps` y `note`;
  - arrancar y navegar no escriben, no respaldan ni avisan con `progress-master-2a278ad-storage.json`, `progress-master-2a278ad-export.json` ni `progress-d0e1b49-export.json`;
  - la nota escribe en cada tecla y las casillas, al marcarse.
- **Los textos, letra por letra** (FR-003 y FR-016):
  - «Nueva situación comprendida: …»;
  - «Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.»;
  - «Checkpoint razonado. Contrastá la explicación con tu experimento.»;
  - «Revisá el porqué y probá otra explicación.»;
  - «Kit descargado con tu borrador y sus pruebas.»;
  - «No se pudo preparar el kit: …»;
  - «No se pudo guardar el progreso. Exportá una copia antes de cerrar.»;
  - «No se pudo guardar: exportá tu avance antes de cerrar.»;
  - «Nota guardada. Dejá un test concreto para volver.»;
  - «N talleres para explorar», sin plural.
- **El saneo** (FR-023):
  - la `viewBox` vale al menos 1, y 400 × 260 por omisión; el trazo, 1 por omisión;
  - el texto lleva 12 de tamaño y `#252c27` de relleno por omisión;
  - el fondo por omisión es `#eeeae1`;
  - los colores pasan si son `/^(#[0-9a-f]{3,8}|none|currentColor|transparent)$/i`;
  - se dibujan como mucho las primeras 2 500 formas.
- **El modelo** dibuja las últimas 8 líneas de la traza, y la nota tiene `maxlength` 10 000.
- **Sin estilos en línea ni HTML armado** (FR-024, FR-025 y SC-005):
  - en el código de producción de `pages/systems`: 0 `innerHTML`, 0 `dangerouslySetInnerHTML` y 0 `style="`;
  - exactamente un `style={`, en `SceneView.tsx`.
- **El peso** (FR-045 y SC-007): `dist/index.html` queda bajo **1 250 000** caracteres (`BOOT_SIZE_LIMIT`). El subpresupuesto de F5 es de +40 000 caracteres si F5 instala nuqs, o +25 000 si ya lo instaló F3 (research.md, R12).
- **La complejidad** (FR-045 y SC-007): `npm run lint` da 0 errores y los avisos de la línea base menos dos (35 − 2 = 33 sobre la de F2b): se van `onClick` (30) y `modelView` (11) de `systems.js`. Ninguna función nueva pasa de 10.
- **Las dependencias:** versiones exactas y lockfile sincronizado (FR-046). nuqs, con su aviso en `frontend/THIRD-PARTY-NOTICES.txt` y el permiso del usuario (nombre, origen, tamaño y licencia). Ninguna otra dependencia de ejecución.
- **El estilo del código** (`AGENTS.md`, FR-047):
  - el código y los nombres de prueba, en inglés; la interfaz, en español;
  - sin comentarios, salvo los que ya existen y se mueven, y los que este plan pide para un elemento sin nombre accesible en un Page Object;
  - `interface` para las formas;
  - `export default` al final en los archivos de componentes y hooks; exports nombrados en los módulos de varias capacidades.
- **Los archivos:**
  - `frontend/app.js` no se edita (FR-049);
  - en `legacy-views.ts` y `main.tsx` sólo cambian las líneas de Sistemas (FR-036), y las de `register-effects` si entra D2.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript, ES modules, FSD (`pages/systems` con `ui` y `model`; el saneo en su entidad). Zustand con un selector chico. nuqs con `NuqsAdapter`, parsers y valores por omisión explícitos. Ningún `useEffect` para derivar datos: los dos efectos que hay sincronizan el foco tras un montaje. `AGENTS.md` cambia sólo en la documentación que integra el coordinador (T026) |
| II. TDD y pruebas útiles | Sí | Los E2E se escriben primero contra el legacy. Cada módulo y componente abre con su spec en rojo, en un commit aparte. Los valores esperados salen del contenido, de las fixtures o de ejemplos resueltos a mano. Las mutaciones que cada prueba detecta están en quickstart.md, §4 |
| III. Código entendible | Sí | Los dos avisos de `systems.js` desaparecen. `ModelPanel` se parte en `ModelTable` y `ModelTrace` para no pasar de 10. Ninguna abstracción por anticipado: sin contexto ni store para la sesión |
| IV. Contenido en Git, IDs estables | Sí | No cambia ningún ID, índice de etapa ni respuesta. `content/` no se toca |
| V. Capas y contratos explícitos | Sí | La página importa los singletons; el adaptador, sólo `window` y entradas sin estado (R4 y R6 sin relajarse). La API pública de la página es chica (contrato) |
| VI. Español, accesibilidad y portabilidad | Sí | Los mismos textos, foco y regiones vivas, con los cambios de C2 y X2 listados. Movimiento reducido por `matchMedia` en cada llamada. Comandos portables |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las comparaciones y el spike corren fuera del repositorio. Ninguna salida nueva en Git |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su evidencia |

## Decisiones del clarify (2026-10-28) y reglas que el plan aplica

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1:** la sesión de las simulaciones, en un módulo de la página | `pages/systems/model/systems-session.ts`, con `resetSimulations` en la API pública y publicado por el adaptador | T015, T024 |
| **Q2:** la propiedad `style` de React con el color saneado | `sanitizeScene` en `entities/systems-simulation` y `style={{ background }}` en `SceneView.tsx`, el único `style={` | T011, T012, T017 |
| **Q3:** nuqs para `taller` y `parte` | `useWorkshopSelection` con `lenguaje`, `taller` y `parte`, `history: 'replace'` y `clearOnDefault: false` en `parte`; `UrlStateProvider` y `startUrlStateSync` en `app/legacy/url-state.tsx` | T003, T008, T016, T024 |
| **C2:** lo que existe sólo por `innerHTML` adopta el comportamiento de React | La traza, la tabla de estado, el aviso de almacenamiento y el foco al volver (research.md, R6), con sus E2E en rojo contra el legacy | T005, T018, T022, T023 |
| **F8-Q2:** `resetSimulations` lo retira el último de F5 y F8 que entre | Si F8 no entró: el adaptador lo publica. Si entró: el armado de F8 lo importa de `pages/systems/session.ts` y el método sale del adaptador | T024 (rama F8) |

## Project Structure

### Documentation (this feature)

```text
specs/018-f5-sistemas/
├── spec.md                     # clarificada el 2026-10-28
├── research.md                 # decisiones R1 a R14, documentación consultada y mediciones
├── plan.md                     # este archivo
├── quickstart.md               # compuerta, spike V6 y V1, comparaciones únicas y mutaciones
├── contracts/taller-systems.md # window.TallerSystems, la API pública de la página y sanitizeScene
├── tasks.md                    # una línea por tarea, T001 a T026
└── checklists/requirements.md
```

No hay `data-model.md`: F5 no cambia ningún formato (FR-013). Los tipos que se leen del contenido están en T013.

### Source Code (repository root)

```text
frontend/
├── systems.js                                        BORRA (T024)
├── systems.css → src/pages/systems/ui/systems.css    MUDA sin editar (T024)
├── vitest.config.ts                                  dos proyectos, si F3 no los trajo (T007)
├── THIRD-PARTY-NOTICES.txt                           aviso de nuqs, si F3 no lo trajo (T008)
└── src/
    ├── vitest-setup.ts                               NUEVO si F3 no lo trajo (T007)
    ├── app/
    │   ├── main.tsx                                  una línea: la hoja de Sistemas (T024)
    │   ├── boot/legacy-views.ts                      una línea: el adaptador (y register-effects si entra D2) (T024)
    │   └── legacy/
    │       ├── register-systems.tsx                  NUEVO: window.TallerSystems y el montaje (T024)
    │       ├── url-state.tsx (+ .spec.tsx)           NUEVO si F3 no lo trajo: UrlStateProvider y startUrlStateSync (T008)
    │       └── register-effects.ts                   BORRA sólo si F6 entró antes y el usuario acepta D2 (T024)
    ├── entities/systems-simulation/
    │   ├── index.ts                                  exporta sanitizeScene y sus tipos (T012)
    │   └── lib/sanitize-scene.ts (+ .spec.ts)        NUEVO (T011, T012)
    └── pages/systems/
        ├── index.ts                                  API pública (T023)
        ├── session.ts                                entrada sin motor, sólo en la rama F8 (T024)
        ├── model/
        │   ├── types.ts                              tipos de la página (T013)
        │   ├── workshop-views.ts                     el motor con los tipos del contenido (T013)
        │   ├── systems-page.factory.ts               fábricas y modelo de prueba, sólo para specs (T013)
        │   ├── catalog-filter.ts (+ .spec.ts)        familias, símbolos y filtro (T014)
        │   ├── systems-session.ts (+ .spec.ts)       simulaciones y filtro de la sesión (T015)
        │   └── useWorkshopSelection.ts (+ .spec.tsx) taller y parte en la URL (T016)
        └── ui/
            ├── SceneView.tsx (+ .spec.tsx)           (T017)
            ├── ModelPanel.tsx, ModelTable.tsx, ModelTrace.tsx (+ ModelPanel.spec.tsx)   (T018)
            ├── Checkpoint.tsx (+ .spec.tsx)          (T019)
            ├── ExplorePart.tsx (+ .spec.tsx), WorkshopSources.tsx                       (T020)
            ├── BuildPart.tsx (+ .spec.tsx), ShipPart.tsx (+ .spec.tsx)                  (T021)
            ├── SystemsCatalog.tsx (+ .spec.tsx), WorkshopCard.tsx, ExternalTools.tsx    (T022)
            ├── WorkshopDetail.tsx, SystemsPage.tsx (+ SystemsPage.spec.tsx)             (T023)
            └── systems.css                           mudado (T024)
qa/
├── lib/sources.ts                                    runSourceGroup (T009)
├── lib/legacy-sources.ts                             loadSystemsUi en un bundle; la ruta del adaptador (T009, T024)
├── lab-bridge-check.ts                               systemsBridge sin loadSystemsEngine (T009); mensaje (T024)
├── boot-check.ts                                     REACT_VIEWS y mountedText (T010); sistemas y LEGACY_SOURCES (T024)
├── load-order-check.ts                               las dos restricciones al adaptador (T024)
├── content-records-check.ts                          el nombre de una prueba (T024)
└── e2e/
    ├── pages/systems.ts                              suma métodos (T004)
    ├── pages/method.ts                               NUEVO (T004)
    ├── fixtures/index.ts                             fixture method (T004)
    ├── fixtures/storage-control.ts                   failWrites() (T005)
    ├── lib/systems-progress.ts                       NUEVO (T004)
    └── specs/systems.spec.ts, systems-react.spec.ts, systems-url.spec.ts   NUEVOS (T004, T005, T006)
eslint.config.ts                                      la guarda de useStore, si F3 no la trajo (T007)
package.json, package-lock.json                       nuqs y la pila de pruebas, si F3 no las trajo (T002)
```

**Structure Decision.** La página vive en `pages/systems` con dos segmentos, `model` y `ui`, como el Atlas. El saneo, que es una regla de la escena y no de la página, va en `entities/systems-simulation/lib`. `url-state.tsx` va en `app/legacy/` porque lo usan los adaptadores de las páginas con nuqs (F3 y F5) hasta que F10 deje una sola raíz. No se crea `features` ni `widgets`.

## Review Focus

**Lo que el revisor mira primero:**

- **Los mismos bytes.**
  - El `<style>` del dist sale con el mismo sha256 que la línea base: la hoja se mudó sin editarse y sigue última (FR-002 y FR-035).
  - El marcado del dist con los scripts y el estilo vaciados es idéntico.
  - `build/curriculum.json` y `dump-globals` dan los mismos bytes.
- **Un solo motor y un adaptador que no arranca nada.**
  - `lab-bridge-check` carga el motor y el adaptador en un bundle (R1).
  - El adaptador no se congela (R8) y al evaluarse no lee `getContent()`, `window.TallerLab` ni `window.SYSTEMS_*`.
  - `enableHistorySync()` corre sólo en `mount`. Nadie importa `nuqs/debug`.
- **nuqs.** Tres detalles cambian la URL si se olvidan:
  - `clearOnDefault: false` en `parte`;
  - `lenguaje` va en cada escritura;
  - el orden del objeto es `{ lenguaje, taller, parte }`.
- **C2 y X2.** Los cuatro comportamientos que adopta React (R6) y las cuatro regiones vivas que pasan a quedar montadas, listados en el PR.
- **La escena.** Hay un solo `style={` en producción (`SceneView.tsx`) y las 9 escenas reales dan 0 diferencias.
- **La complejidad y el peso:** los avisos de la línea base menos dos, y el aumento dentro del subpresupuesto.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba** (cada caso ya tiene su prueba en la tarea dueña):

1. **Volver al catálogo cuando la familia o la búsqueda de la sesión ocultan el taller que se deja.** El foco tiene que ir al buscador y no caer al documento. La prueba es «back falls back to the search box when the session filter hides the workshop», en `SystemsPage.spec.tsx` (T023).
2. **Un control del modelo sin `value`.** `act` tiene que recibir `''`, como `button.dataset.value` con `data-value=""`, y no `undefined`. La prueba es «a control without a value reaches the model as an empty string», en `ExplorePart.spec.tsx` (T020), con el modelo de prueba que muestra `[]`.
3. **Dos montajes seguidos con la celebración en pantalla** (cambiar de idioma justo después del tercer sello). El desmontaje tiene que quitar el lienzo. La prueba es el E2E «switching the language removes the celebration», en `systems.spec.ts` (T004).
4. **Montar con una `parte` inválida o sin `parte`.** La página no reescribe la URL: hoy `mount` sólo lee. La prueba es «writes nothing on mount, even with an unknown part», en `useWorkshopSelection.spec.tsx` (T016).
5. **Una búsqueda con espacios al principio o al final.** No se recorta: «cache » no encuentra un taller cuyo texto termina en «cache». La prueba es «does not trim the query», en `catalog-filter.spec.ts` (T014).

## Reparto y orden

Un solo PR, con commits en este orden. Los dueños delegables (E, Q, S, M, U y H) son slices para el subagente `implementador`, que recibe su sección, sus archivos y sus checks, con la instrucción de no dejar comentarios. K es el agente principal: hace la línea base, las descargas con permiso, el spike, el corte, las compuertas, las comparaciones, la documentación y el PR, y revisa cada diff.

| Onda | Quién | Tareas | Condición |
| --- | --- | --- | --- |
| 0 | K | T001 la línea base; T002 los permisos y las descargas; T003 el spike de V6 y V1 | — |
| 1 | E, Q, S y H a la vez | **E:** T004, T005 y, si el usuario acepta D1, T006. **Q:** T009 y T010. **S:** T011 y T012. **H:** T007, si F3 no trajo el arnés | T001; para H, T002 |
| 2 | M y K | **K:** T008, si F3 no trajo nuqs. **M:** T013 a T016 | T007 o el arnés de F3; T012 para el índice de la entidad |
| 3 | U | T017 a T023, en ese orden | T013 a T016 y T008 |
| 4 | K | T024 el corte; T025 la compuerta y las comparaciones; T026 la documentación y el PR | Todo lo anterior |

**Puertos de E2E** (`E2E_PORT`): K 4173, E 4191 y U 4192. Las comparaciones usan 4501 y 4502.

**Quién toca qué archivo compartido.** `main.tsx`, `legacy-views.ts`, `package.json`, el lockfile, `eslint.config.ts`, `frontend/vitest.config.ts`, `THIRD-PARTY-NOTICES.txt` y la documentación los toca sólo K, o H con K integrando (`AGENTS.md`, «Trabajo con subagentes»).

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y el ADR 0008;
  - la spec, research.md, este plan (estas reglas, la sección 0 y tu tarea) y el contrato;
  - las skills `tdd`, `react-testing`, `vitest` y, para E2E, `playwright-best-practices`.
- **TDD.**
  - Cada módulo o componente nuevo empieza con un archivo cuya firma lanza `new Error('not implemented')`, para que la spec falle por comportamiento y no por un import.
  - La spec en rojo y la implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
- **Los valores esperados** salen de este plan, del contenido (`content/workshops/*.yaml`), de `qa/fixtures/` o de un ejemplo resuelto a mano. Nunca del código que se porta ni del módulo que probás.
- **Nada de corregir de paso.** El contador sin plural, la búsqueda sin recortar y el `font-size` sin límite se conservan.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo a K.
- **R1 del guard:** ningún archivo de producción salvo el motor contiene `taller-systems-v1`. Las specs y los E2E sí pueden: `*.spec.ts(x)` no cuenta, y `qa/e2e` no se revisa. `systems-page.factory.ts` no es una spec: no puede nombrar la clave ni importar `createSystemsEngine` (R3).
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`, `npm run test:unit -- <ruta>`, `node qa/<check>.ts` (antes, `npm run curriculum`), `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - para E2E, `npm run build` y `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`;
  - si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Commits:**
  - chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`;
  - `test(e2e): …`, `test(front): …` o `test(qa): …` para lo que falla primero; `feat(front): …` para lo nuevo; `refactor(qa): …` para cambiar cómo carga un check.
- **Al terminar,** informá las tareas cerradas, los comandos con su resultado real, lo que no pudiste verificar y cualquier desvío.

## 0. Línea base, permisos y verificaciones previas (K)

**Cubre:** FR-045, FR-046 y SC-007; V1, V5 y V6.

### Tarea 0.1 · La línea base (T001)

- **Cuándo:** sobre la base de implementación, rebasada sobre `master` con F2b entera, antes de cualquier cambio de código.
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde. Si algo falla, F5 no empieza.
  2. **Registrar lo de quickstart.md §1:**
     - `html.length`;
     - los sha256 del script, del `<style>` y del marcado del dist;
     - los sha256 de `build/curriculum.json` y de la salida de `dump-globals`;
     - los avisos de complejidad con su función;
     - los escenarios de `boot-check`, `lab-bridge-check`, `app-shell-check` y `systems-check`;
     - el tiempo de `npm run test:e2e` con `--workers=1`.
  3. **Detectar qué entró antes** con los comandos de quickstart.md §1.2 y anotar cada respuesta:
     - nuqs, el arnés, fishery y `url-state.tsx`;
     - `campaign.js` (F6) y `runSourceGroup`;
     - `REACT_VIEWS` en `boot-check`;
     - el armado de `progress-backup` fuera de `app.js` (F8).
  4. Un commit de documentación que agrega a research.md la sección «Línea base de la implementación», con el hash de la base, la fecha y los valores.
- **Compuerta:** los pasos 1 a 3, con los valores anotados.

### Tarea 0.2 · Permisos y descargas (T002)

- **Cuándo:** después de T001; sólo lo que T001 encontró ausente.
- **Qué se pide**, en un solo mensaje al usuario con nombre, versión, origen (registro de npm), tamaño y licencia:

  | Si falta | Paquetes | Tamaño (`npm view … dist.unpackedSize`) | Licencia |
  | --- | --- | --- | --- |
  | nuqs | `nuqs` 2.10.2 y su dependencia `@standard-schema/spec` 1.1.0 (sólo tipos: su `dist/index.js` mide 0 bytes) | 480 252 y 22 634 bytes desempaquetados | MIT y MIT |
  | El arnés | `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1 | 56 paquetes, unos 26,3 MB desempaquetados y 5,0 MB comprimidos (estimación del ADR 0008) | MIT |
  | fishery | `fishery` 2.4.0 | 2 paquetes, unos 0,19 MB | MIT |
  | Al verificar | `docker compose build taller` | — | — |

- **Pasos, con el permiso:**
  1. `npm install --save-exact nuqs@2.10.2`.
  2. `npm install --save-dev --save-exact jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 @testing-library/jest-dom@7.0.1 fishery@2.4.0`, sólo los que falten.
  3. `git diff package.json`: sólo las líneas nuevas, con versión exacta.
  4. `npm ci --offline` en limpio.
- **Commit:** `build(deps): nuqs 2.10.2 y la pila de pruebas de componentes, con permiso del usuario`, el que corresponda. Si el usuario niega fishery, se sigue sin ella (research.md, R10).

### Tarea 0.3 · El spike de V6 y V1 (T003)

- **Cuándo:** después de T002, antes de T004. Corre en una copia descartable (`git worktree add "$TMPDIR/f5-spike" HEAD`) y no se commitea nada del spike. Sólo el resultado va a research.md.
- **V6:** la spec descartable de quickstart.md §2.1 monta el `NuqsAdapter` real en jsdom con los parsers de T016 y comprueba siete cosas:
  1. que jsdom actualiza `location` con `replaceState`;
  2. abrir desde `/#sistemas` escribe `?lenguaje=rust&taller=cache&parte=explore` y conserva `#sistemas`;
  3. no suma una entrada al historial;
  4. cerrar deja `?lenguaje=rust`;
  5. un parámetro ajeno se conserva;
  6. el orden de las claves que ya están no cambia;
  7. con `enableHistorySync()`, un `replaceState` ajeno llega al hook.
- **V1:** el script de quickstart.md §2.2 empaqueta con esbuild, minificado, una entrada que usa `useQueryStates`, `parseAsString`, `parseAsStringLiteral`, `NuqsAdapter` y `useStore`, y anota cuántos bytes aporta `node_modules/nuqs` y cuántos `zustand`.
- **Decisión:**
  - **Si las siete salen como dice research.md (R2):** el resultado va a research.md y se sigue.
  - **Si una sale distinta** (por ejemplo, que nuqs pierda el hash, sume entradas al historial o no escriba `lenguaje` en el orden pedido): K se detiene y le lleva la diferencia al usuario, con lo medido. No se escribe código de la página hasta que decida.
  - **Si el peso de V1 pasa de 25 000 caracteres:** también se le informa antes de seguir.
- **Commit:** `docs(specs): resultados de V6 y V1 de F5`.

## 1. Los E2E de comportamiento, contra el legacy (E)

**Cubre:** FR-038, FR-039, FR-050 y FR-051; SC-001 y SC-009; US1 a US7.

### Tarea 1.1 · El Page Object, las ayudas y los E2E que pasan contra el legacy (T004)

- **Archivos:**
  - `qa/e2e/pages/systems.ts` (sólo suma métodos);
  - `qa/e2e/pages/method.ts` (nuevo);
  - `qa/e2e/fixtures/index.ts` (suma `method`);
  - `qa/e2e/lib/systems-progress.ts` (nuevo);
  - `qa/e2e/specs/systems.spec.ts` (nuevo).
- **Consume:** `urls`, `curriculumIds` y `frozenProgress` de `qa/e2e/lib/`, `computedStyle` de `qa/e2e/lib/computed-style.ts`, y los fixtures `shell`, `systems` y `storage`.
- **Produce:** `MethodPage`, `systemsProgress(records)` y los métodos nuevos de `SystemsPage`.

**Métodos que se suman al final de `class SystemsPage`** (`qa/e2e/pages/systems.ts`). Los existentes no cambian:

```ts
  familyFilter(name: string): Locator {
    return this.page
      .getByRole('group', { name: 'Familia de talleres' })
      .getByRole('button', { name, exact: true });
  }

  resultCount(): Locator {
    return this.page.getByText(/^\d+ talleres para explorar$/);
  }

  // The overview counter has no role or name: the class is its locator.
  overviewCount(): Locator {
    return this.page.locator('.sys-overview-progress strong');
  }

  overviewProgress(): Locator {
    return this.page.getByRole('progressbar', {
      name: 'Talleres con modelo, código y checkpoint completados',
    });
  }

  workshopCards(): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('button', { name: 'Explorar →' }) });
  }

  cardSeals(title: string): Locator {
    return this.workshopCard(title).getByText(/sellos|Tres sellos conseguidos/);
  }

  openButton(title: string): Locator {
    return this.workshopCard(title).getByRole('button', { name: 'Explorar →' });
  }

  clearFilters(): Locator {
    return this.page.getByRole('button', { name: 'Ver todos los talleres' });
  }

  backToCatalog(): Locator {
    return this.page.getByRole('button', { name: '← Todos los talleres' });
  }

  anyWorkshopHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  partTabs(): Locator {
    return this.page.getByRole('group', { name: 'Etapas del taller' });
  }

  nextPart(name: 'Programar el núcleo →' | 'Armar mi proyecto →'): Locator {
    return this.page.getByRole('button', { name });
  }

  seal(label: 'Modelo explorado' | 'Código verificado' | 'Checkpoint razonado'): Locator {
    return this.seals().locator('span', { hasText: label });
  }

  // Objective rows have no role or name: the class is their locator.
  objective(label: string): Locator {
    return this.page.locator('.sys-goal', { hasText: label });
  }

  resetModel(): Locator {
    return this.page.getByRole('button', { name: 'Reiniciar modelo ↺' });
  }

  modelControls(): Locator {
    return this.page.getByRole('group', { name: 'Acciones del modelo' }).getByRole('button');
  }

  // The live model text shares role="status" with other regions and has no name.
  modelLive(): Locator {
    return this.page.locator('#sys-model-live');
  }

  // The trace is a details element without an accessible name.
  trace(): Locator {
    return this.page.locator('details.sys-trace');
  }

  traceSummary(): Locator {
    return this.page.getByText('Qué cambió y por qué · últimos pasos');
  }

  stateTable(): Locator {
    return this.page.getByRole('region', { name: 'Estado del modelo' });
  }

  scene(): Locator {
    return this.page.locator('#sys-model-view').getByRole('img');
  }

  // The answers container has no role or name.
  checkpointOption(text: string): Locator {
    return this.page.locator('.sys-answers').getByRole('button').filter({ hasText: text });
  }

  // The checkpoint feedback shares role="status" with other regions and has no name.
  checkpointFeedback(): Locator {
    return this.page.locator('.sys-feedback');
  }

  storageWarning(): Locator {
    return this.page.getByText('No se pudo guardar el progreso. Exportá una copia antes de cerrar.');
  }

  coreTitle(title: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: title });
  }

  realTests(): Locator {
    return this.page.getByText(/^\d+ pruebas reales$/);
  }

  relatedLink(exerciseId: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(`^${exerciseId}\\D`) });
  }

  codePassed(): Locator {
    return this.page.getByText(/^✓ Este núcleo tiene una ejecución registrada/);
  }

  downloadKit(language: 'Rust' | 'Go'): Locator {
    return this.page.getByRole('button', { name: `Descargar kit ${language} ↓` });
  }

  stepCheckbox(index: number): Locator {
    return this.page
      .getByRole('checkbox', { name: 'Lo comprobé en mi proyecto · registro manual' })
      .nth(index);
  }

  // The note status has no role or name.
  noteStatus(): Locator {
    return this.page.locator('#sys-note-status');
  }

  // The confetti canvas is aria-hidden and has no name.
  celebration(): Locator {
    return this.page.locator('canvas.quest-celebration');
  }

  async mainTop(): Promise<number> {
    return this.page
      .locator('#main')
      .evaluate((element) => Math.round(element.getBoundingClientRect().top));
  }

  async partTabsTop(): Promise<number> {
    return this.partTabs().evaluate((element) => Math.round(element.getBoundingClientRect().top));
  }
```

**`qa/e2e/pages/method.ts`:**

```ts
import type { Locator, Page } from '@playwright/test';

export class MethodPage {
  constructor(readonly page: Page) {}

  resetProgress(): Locator {
    return this.page.getByRole('button', { name: 'Borrar mi progreso' });
  }

  confirmReset(): Locator {
    return this.page
      .getByRole('dialog', { name: '¿Borrar tu progreso?' })
      .getByRole('button', { name: 'Borrar todo' });
  }
}
```

**`qa/e2e/fixtures/index.ts`:** se suma `import { MethodPage } from '../pages/method';`, la línea `method: MethodPage;` en `interface Fixtures` y, después de `atlas`, la fixture `method: async ({ page }, use) => use(new MethodPage(page)),`.

**`qa/e2e/lib/systems-progress.ts`** (se tipa por el formato v1 guardado, no por los tipos del código; ADR 0008, §2):

```ts
export interface WorkshopRecordV1 {
  observed: string[];
  code: boolean;
  predicted: boolean;
  answer: number | null;
  steps: number[];
  note: string;
}

const EMPTY_RECORD: WorkshopRecordV1 = {
  observed: [],
  code: false,
  predicted: false,
  answer: null,
  steps: [],
  note: '',
};

export function systemsProgress(records: Record<string, Partial<WorkshopRecordV1>>): string {
  const full = Object.fromEntries(
    Object.entries(records).map(([key, record]) => [key, { ...EMPTY_RECORD, ...record }]),
  );
  return JSON.stringify({ version: 1, records: full });
}
```

**`qa/e2e/specs/systems.spec.ts`.** Los valores salen de `content/workshops/*.yaml`, de `qa/fixtures/curriculum-ids.json`, de `progress-master-2a278ad-storage.json` (`rust:pc` con los tres sellos; su `taller-learning-v1` está en Go, por eso cada URL lleva `lenguaje`) y del README:

```ts
import { expect, test } from '../fixtures';
import { computedStyle } from '../lib/computed-style';
import { curriculumIds, frozenProgress } from '../lib/curriculum';
import { systemsProgress } from '../lib/systems-progress';
import { urls } from '../lib/urls';

const CACHE = 'Una caché que aprende tus visitas';
const PC = 'Construí una PC de bolsillo';
const WORKSHOP_IDS = Object.keys(curriculumIds.workshops);

test.describe('the catalog', () => {
  test('the frozen progress shows one workshop with its three seals in Rust and none in Go', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await shell.goto(urls.workshop('rust'));

    await expect(systems.overviewCount()).toHaveText('1 / 25');
    await expect(systems.overviewProgress()).toHaveAttribute('value', '1');
    await expect(systems.cardSeals(PC)).toHaveText('✓ Tres sellos conseguidos');
    await expect(systems.workshopCards().filter({ hasText: '0/3 sellos' })).toHaveCount(24);

    await shell.switchLanguage('go');
    await expect(systems.overviewCount()).toHaveText('0 / 25');
  });

  test('the four families filter the cards and keep the focus on the chosen button', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));
    const families: [string, number][] = [
      ['Dentro de la máquina', 9],
      ['Datos e infraestructura', 8],
      ['Gráficos, álgebra y juegos', 8],
      ['Todo el taller', 25],
    ];
    for (const [family, count] of families) {
      await systems.familyFilter(family).click();

      await expect(systems.familyFilter(family)).toHaveAttribute('aria-pressed', 'true');
      await expect(systems.familyFilter(family)).toBeFocused();
      await expect(systems.workshopCards()).toHaveCount(count);
      await expect(systems.resultCount()).toHaveText(`${count} talleres para explorar`);
    }
  });

  test('the search ignores accents and case and reads the title, the subtitle and the id', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));

    await systems.search().fill('LRU');
    await expect(systems.workshopCards()).toHaveCount(1);
    await expect(systems.workshopCard(CACHE)).toBeVisible();
    await expect(systems.resultCount()).toHaveText('1 talleres para explorar');
    await expect(systems.search()).toBeFocused();

    await systems.search().fill('CACHÉ');
    await expect(systems.workshopCards()).toHaveCount(2);

    await systems.search().fill('raycast');
    await expect(systems.workshopCards()).toHaveCount(1);
  });

  test('the empty state clears the family and the search and focuses the search box', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.familyFilter('Datos e infraestructura').click();
    await systems.search().fill('zzzz');
    await expect(systems.emptyCatalog()).toBeVisible();
    await expect(systems.resultCount()).toHaveText('0 talleres para explorar');

    await systems.clearFilters().click();

    await expect(systems.search()).toHaveValue('');
    await expect(systems.search()).toBeFocused();
    await expect(systems.familyFilter('Todo el taller')).toHaveAttribute('aria-pressed', 'true');
    await expect(systems.workshopCards()).toHaveCount(25);
  });

  test('the family and the search survive a hash navigation and are lost on a reload', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.familyFilter('Dentro de la máquina').click();
    await systems.search().fill('memoria');

    await shell.openFromMenu('proyecto');
    await shell.openFromMenu('sistemas');
    await expect(systems.familyFilter('Dentro de la máquina')).toHaveAttribute('aria-pressed', 'true');
    await expect(systems.search()).toHaveValue('memoria');

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('sistemas');
    await expect(systems.familyFilter('Todo el taller')).toHaveAttribute('aria-pressed', 'true');
    await expect(systems.search()).toHaveValue('');
  });
});

test.describe('open and go back', () => {
  test('«Explorar →» opens the workshop, focuses its title, scrolls #main to the top and replaces the query', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust'));
    const entries = await page.evaluate(() => history.length);

    await systems.openWorkshop(CACHE);

    await expect(systems.workshopHeading(CACHE)).toBeFocused();
    await expect(page).toHaveURL(urls.workshop('rust', 'cache', 'explore'));
    expect(await page.evaluate(() => history.length)).toBe(entries);
    await expect.poll(() => systems.mainTop()).toBe(0);
  });

  test('«← Todos los talleres» goes back to the catalog URL', async ({ shell, systems, page }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.backToCatalog().click();

    await expect(shell.heading('sistemas')).toBeVisible();
    await expect(page).toHaveURL(urls.workshop('rust'));
  });

  test('the language switch keeps the workshop and the part open, with the seals of the other language', async ({
    shell,
    systems,
    storage,
    page,
  }) => {
    await storage.seed({ 'taller-systems-v1': frozenProgress['taller-systems-v1'] });
    await shell.goto(urls.workshop('rust', 'pc', 'build'));
    await expect(systems.seal('Código verificado')).toHaveClass(/earned/);

    await shell.switchLanguage('go');

    await expect(page).toHaveURL(urls.workshop('go', 'pc', 'build'));
    await expect(systems.workshopHeading(PC)).toBeVisible();
    await expect(systems.part('build')).toHaveAttribute('aria-pressed', 'true');
    await expect(systems.seal('Código verificado')).not.toHaveClass(/earned/);
  });

  test('opening a workshop and changing the part keep #sistemas in the address', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust'));

    await systems.openWorkshop(CACHE);
    await expect(page).toHaveURL(/#sistemas$/);

    await systems.part('ship').click();
    await expect(page).toHaveURL(urls.workshop('rust', 'cache', 'ship'));
  });
});

test.describe('the three parts', () => {
  test('each part presses its button, keeps the focus on it, writes the query and scrolls the tabs to the top', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    for (const part of ['build', 'ship', 'explore'] as const) {
      await systems.part(part).click();

      await expect(systems.part(part)).toHaveAttribute('aria-pressed', 'true');
      await expect(systems.part(part)).toBeFocused();
      await expect(page).toHaveURL(urls.workshop('rust', 'cache', part));
      await expect.poll(() => systems.partTabsTop()).toBe(0);
    }
  });

  test('the footer buttons move to the next part and focus its tab', async ({ shell, systems }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.nextPart('Programar el núcleo →').click();
    await expect(systems.part('build')).toBeFocused();

    await systems.nextPart('Armar mi proyecto →').click();
    await expect(systems.part('ship')).toBeFocused();
  });

  test('an unknown part opens Explorar and a part without a workshop opens the catalog', async ({
    shell,
    systems,
  }) => {
    await shell.goto('/?lenguaje=rust&taller=cache&parte=inventada#sistemas');
    await expect(systems.part('explore')).toHaveAttribute('aria-pressed', 'true');

    await shell.goto('/?lenguaje=rust&parte=build#sistemas');
    await expect(shell.heading('sistemas')).toBeVisible();
  });
});

test.describe('Explorar', () => {
  test('a model action traces, marks the objective, announces it, saves once and keeps the focus; repeating a situation adds nothing', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await expect(systems.modelLive()).toHaveText(/^Probá A → B → C → A → D\./);

    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).toHaveCount(1);
    await expect(systems.objective('Provocá una carga por miss')).toHaveClass(/earned/);
    await expect(shell.toast).toHaveText('Nueva situación comprendida: Provocá una carga por miss');
    await expect(systems.modelButton('Leer A')).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-systems-v1']);

    await systems.modelButton('Leer A').click();
    await expect(systems.objective('Reutilizá una clave con hit')).toHaveClass(/earned/);
    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).toHaveCount(3);
    expect(await storage.writes()).toEqual(['set taller-systems-v1', 'set taller-systems-v1']);
    await expect(systems.modelLive()).toHaveText(/^Probá A → B → C → A → D\./);
  });

  test('the third objective earns the first seal', async ({ shell, systems, storage }) => {
    await storage.seed({
      'taller-systems-v1': systemsProgress({ 'rust:cache': { observed: ['hit', 'evict'] } }),
    });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await expect(systems.seal('Modelo explorado')).not.toHaveClass(/earned/);

    await systems.modelButton('Leer A').click();

    await expect(systems.seal('Modelo explorado')).toHaveClass(/earned/);
  });

  test('«Reiniciar modelo ↺» empties the trace and keeps the objectives and the seals', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).toHaveCount(1);

    await systems.resetModel().click();

    await expect(systems.traceEntries()).toHaveCount(0);
    await expect(systems.objective('Provocá una carga por miss')).toHaveClass(/earned/);
  });
});

test.describe('the checkpoint', () => {
  test('a wrong answer explains, a right one earns the seal, the focus stays and the answer survives a reload', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'heap', 'explore'));

    await systems.checkpointOption('Sí: hay 12 libres').click();
    await expect(systems.checkpointFeedback()).toHaveText(
      'Revisemos esa decisión. La suma no vuelve contiguos los intervalos.',
    );
    await expect(shell.toast).toHaveText('Revisá el porqué y probá otra explicación.');
    await expect(systems.checkpointOption('Sí: hay 12 libres')).toBeFocused();

    await systems.checkpointOption('No: ningún hueco tiene 8').click();
    await expect(systems.checkpointFeedback()).toHaveText(
      'Esa es la idea. La suma no vuelve contiguos los intervalos.',
    );
    await expect(shell.toast).toHaveText(
      'Checkpoint razonado. Contrastá la explicación con tu experimento.',
    );
    await expect(systems.seal('Checkpoint razonado')).toHaveClass(/earned/);
    await expect(systems.checkpointOption('No: ningún hueco tiene 8')).toBeFocused();

    await shell.openFromMenu('laboratorio');
    await shell.goto(urls.workshop('rust', 'heap', 'explore'));
    await expect(systems.checkpointOption('No: ningún hueco tiene 8')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('the third seal', () => {
  const twoSeals = systemsProgress({
    'rust:cache': { observed: ['hit', 'evict'], code: true, predicted: true, answer: 1 },
  });

  test('announces it and draws the celebration, which leaving the view removes', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.seed({ 'taller-systems-v1': twoSeals });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.modelButton('Leer A').click();

    await expect(shell.toast).toHaveText('Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.');
    await expect(systems.celebration()).toHaveCount(1);
    await shell.openFromMenu('proyecto');
    await expect(systems.celebration()).toHaveCount(0);
  });

  test('with reduced motion it does not draw the celebration', async ({
    shell,
    systems,
    storage,
    page,
  }) => {
    await storage.seed({ 'taller-systems-v1': twoSeals });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.modelButton('Leer A').click();

    await expect(shell.toast).toHaveText('Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.');
    await expect(systems.celebration()).toHaveCount(0);
  });

  test('switching the language removes the celebration', async ({ shell, systems, storage }) => {
    await storage.seed({ 'taller-systems-v1': twoSeals });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.celebration()).toHaveCount(1);

    await shell.switchLanguage('go');

    await expect(systems.celebration()).toHaveCount(0);
  });
});

test.describe('Construir', () => {
  test('shows the core of the language, its IDE link and the previous tools', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'build'));

    await expect(systems.coreTitle(curriculumIds.exercises['rust-113'].title)).toBeVisible();
    await expect(systems.realTests()).toHaveText('3 pruebas reales');
    await expect(systems.enterIde()).toHaveAttribute(
      'href',
      '?sistema=cache&ejercicio=rust-113&paso=code#laboratorio',
    );
    await expect(systems.relatedLink('rust-31')).toHaveAttribute(
      'href',
      '?sistema=cache&ejercicio=rust-31&paso=code#laboratorio',
    );
    await expect(systems.relatedLink('rust-35')).toHaveAttribute(
      'href',
      '?sistema=cache&ejercicio=rust-35&paso=code#laboratorio',
    );
    await expect(systems.codePassed()).toHaveCount(0);
  });

  test('the verified-code notice appears only with the code seal', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.seed({ 'taller-systems-v1': frozenProgress['taller-systems-v1'] });
    await shell.goto(urls.workshop('rust', 'pc', 'build'));

    await expect(systems.codePassed()).toBeVisible();
  });
});

test.describe('Entregar', () => {
  test('the kit downloads as a zip named after the kit and is announced', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));
    const download = page.waitForEvent('download');

    await systems.downloadKit('Rust').click();

    expect((await download).suggestedFilename()).toBe('taller-cache-rust.zip');
    await expect(shell.toast).toHaveText('Kit descargado con tu borrador y sus pruebas.');
  });

  test('the stages save their index and come back after a reload', async ({
    shell,
    systems,
    storage,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));

    await systems.stepCheckbox(0).check();
    await systems.stepCheckbox(2).check();

    const saved = JSON.parse((await storage.snapshot())['taller-systems-v1'] ?? '{}');
    expect(saved.records['rust:cache'].steps).toEqual([0, 2]);
    await shell.openFromMenu('laboratorio');
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));
    await expect(systems.stepCheckbox(0)).toBeChecked();
    await expect(systems.stepCheckbox(1)).not.toBeChecked();
    await expect(systems.stepCheckbox(2)).toBeChecked();
  });

  test('the note saves on every key without moving the caret', async ({
    shell,
    systems,
    storage,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));
    await systems.note().fill('abcdef');
    await systems.note().evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(3, 3));

    await systems.note().pressSequentially('XY');

    await expect(systems.note()).toHaveValue('abcXYdef');
    expect(
      await systems.note().evaluate((element: HTMLTextAreaElement) => element.selectionStart),
    ).toBe(5);
    await expect(systems.noteStatus()).toHaveText('Nota guardada. Dejá un test concreto para volver.');
    const saved = JSON.parse((await storage.snapshot())['taller-systems-v1'] ?? '{}');
    expect(saved.records['rust:cache'].note).toBe('abcXYdef');
  });

  test('with the storage blocked, the workshop and the note show their warnings', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.block();
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));

    await expect(systems.storageWarning()).toBeVisible();
    await systems.note().fill('x');
    await expect(systems.noteStatus()).toHaveText(
      'No se pudo guardar: exportá tu avance antes de cerrar.',
    );
  });
});

test('a workshop with a scene draws a labelled svg image with the #14271f background', async ({
  shell,
  systems,
}) => {
  await shell.goto(urls.workshop('rust', 'raster', 'explore'));

  await expect(systems.scene()).toHaveAttribute('aria-label', /.+/);
  expect(await computedStyle(systems.scene(), ['background-color'])).toEqual({
    'background-color': 'rgb(20, 39, 31)',
  });
});

test.describe('the 25 workshops', () => {
  for (const id of WORKSHOP_IDS) {
    test(`${id} opens at Explorar with its heading and its model`, async ({ shell, systems }) => {
      await shell.goto(urls.workshop('rust', id, 'explore'));

      await expect(systems.anyWorkshopHeading()).toBeVisible();
      await expect(systems.part('explore')).toHaveAttribute('aria-pressed', 'true');
      await expect(systems.modelControls().first()).toBeVisible();
    });
  }

  for (const id of ['cache', 'pc', 'raster']) {
    test(`${id} walks Construir and Entregar`, async ({ shell, systems }) => {
      await shell.goto(urls.workshop('go', id, 'explore'));

      await systems.part('build').click();
      await expect(systems.enterIde()).toBeVisible();
      await systems.part('ship').click();
      await expect(systems.downloadKit('Go')).toBeVisible();
    });
  }
});

test('«Borrar todo» resets the simulations and the seals and keeps the family and the search', async ({
  shell,
  systems,
  method,
}) => {
  await shell.goto(urls.workshop('rust'));
  await systems.familyFilter('Dentro de la máquina').click();
  await systems.search().fill('caché');
  await systems.openWorkshop(CACHE);
  await systems.modelButton('Leer A').click();
  await expect(systems.traceEntries()).toHaveCount(1);

  await shell.openFromMenu('metodo');
  await method.resetProgress().click();
  await method.confirmReset().click();
  await expect(shell.toast).toHaveText('Progreso reiniciado. Un nuevo comienzo.');

  await shell.openFromMenu('sistemas');
  await expect(systems.traceEntries()).toHaveCount(0);
  await expect(systems.objective('Provocá una carga por miss')).not.toHaveClass(/earned/);
  await systems.backToCatalog().click();
  await expect(systems.familyFilter('Dentro de la máquina')).toHaveAttribute('aria-pressed', 'true');
  await expect(systems.search()).toHaveValue('caché');
});
```

- **Pasos:**
  1. Escribir los archivos de arriba. `npm run typecheck` en verde.
  2. `npm run build && E2E_PORT=4191 npm run test:e2e -- specs/systems.spec.ts`: todo en verde contra el legacy.
  3. **Si una prueba falla contra el legacy,** se lee la diferencia.
     - **Si el valor esperado está mal copiado del contenido o del README:** se corrige ese valor.
     - **Si el legacy hace otra cosa que lo que la spec describe:** se anota como hallazgo, se fija el comportamiento del legacy y K lo informa. Ya pasó una vez: «cache» encuentra dos talleres (`cache` y `tlb`), por eso la prueba busca «LRU».
     - **Ninguna prueba se debilita.**
  4. `E2E_PORT=4191 npm run test:e2e -- --repeat-each=3 specs/systems.spec.ts`: estable.
  5. `npm run test:e2e` completo: 106 + 17 + los nuevos, sin tocar ninguna spec existente (`git diff --stat qa/e2e/specs/` sólo muestra el archivo nuevo).
  6. `npm run lint`, `npm run format:check` y `git diff --check`.
  7. **Commit:** `test(e2e): comportamiento de Sistemas contra la vista legacy`.
- **Compuerta:** los pasos 2, 4 y 5.

### Tarea 1.2 · Los E2E de C2, en rojo contra el legacy (T005)

- **Archivos:** `qa/e2e/fixtures/storage-control.ts` (suma `failWrites()`) y `qa/e2e/specs/systems-react.spec.ts` (nuevo).
- **Método nuevo al final de `class StorageControl`:**

```ts
  async failWrites(): Promise<void> {
    await this.page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };
    });
  }
```

**`qa/e2e/specs/systems-react.spec.ts`:**

```ts
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

const CACHE = 'Una caché que aprende tus visitas';
const TABLE_WORKSHOPS = ['pc', 'scheduler', 'clocks', 'sharding', 'stack', 'raycast', 'algebra', 'transforms'];

test.describe('what React keeps that innerHTML rebuilt (C2)', () => {
  test('the trace the student closed stays closed after another action', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.trace()).toHaveAttribute('open', '');

    await systems.traceSummary().click();
    await expect(systems.trace()).not.toHaveAttribute('open');
    await systems.modelButton('Leer B').click();

    await expect(systems.traceEntries()).toHaveCount(2);
    await expect(systems.trace()).not.toHaveAttribute('open');
  });

  test('the state table keeps its scroll after an action', async ({ shell, systems, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    let overflowing = '';
    for (const id of TABLE_WORKSHOPS) {
      await shell.goto(urls.workshop('rust', id, 'explore'));
      const scrollable = await systems
        .stateTable()
        .evaluate((element) => element.scrollWidth > element.clientWidth);
      if (scrollable) {
        overflowing = id;
        break;
      }
    }
    expect(overflowing, 'no workshop table overflows at 375 px').not.toBe('');
    await systems.stateTable().evaluate((element) => {
      element.scrollLeft = 40;
    });

    await systems.modelControls().first().click();

    expect(await systems.stateTable().evaluate((element) => element.scrollLeft)).toBe(40);
  });

  test('the storage warning appears as soon as the engine reports it', async ({
    shell,
    systems,
    storage,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await expect(systems.storageWarning()).toHaveCount(0);
    await storage.failWrites();

    await systems.modelButton('Leer A').click();

    await expect(systems.storageWarning()).toBeVisible();
  });

  test('going back to the catalog focuses the workshop just left', async ({ shell, systems }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.openWorkshop(CACHE);

    await systems.backToCatalog().click();

    await expect(systems.openButton(CACHE)).toBeFocused();
  });
});
```

- **Pasos:**
  1. Escribir los dos archivos. `npm run typecheck` en verde.
  2. `npm run build && E2E_PORT=4191 npm run test:e2e -- specs/systems-react.spec.ts`: las cuatro **fallan contra el legacy, por la razón esperada**:
     - la traza aparece abierta;
     - `scrollLeft` vuelve a 0;
     - el aviso no aparece;
     - el foco está en `body`.

     Si alguna falla por otra razón (un localizador, un taller sin tabla que desborde), se corrige la prueba hasta que falle por la esperada. El mensaje de cada falla se copia en el informe de la tarea.
  3. **Si `failWrites` produce un `console.error`** del motor, la prueba lo declara con `pageIssues.expectIssue(/QuotaExceededError/, 'the test makes the storage fail on purpose')`. No se toca la lista blanca.
  4. **Commit:** `test(e2e): lo que React conserva y innerHTML rehacía en Sistemas (C2, en rojo)`.
- **Compuerta:** el paso 2, con los cuatro mensajes de falla.

### Tarea 1.3 · Los E2E de las diferencias de nuqs, si el usuario acepta D1 (T006)

- **Cuándo:** después de T003 (que confirma las diferencias) y de la respuesta del usuario a D1. Si el usuario no las acepta, esta tarea no corre y F5 se detiene en T008 hasta que decida otra cosa.
- **Archivo:** `qa/e2e/specs/systems-url.spec.ts` (nuevo).

```ts
import { expect, test } from '../fixtures';

const CACHE = 'Una caché que aprende tus visitas';

test.describe('nuqs owns only its three keys (D1)', () => {
  test('a foreign parameter survives opening a workshop', async ({ shell, systems, page }) => {
    await shell.goto('/?basura=1&lenguaje=rust#sistemas');

    await systems.openWorkshop(CACHE);

    await expect(page).toHaveURL('/?basura=1&lenguaje=rust&taller=cache&parte=explore#sistemas');
  });

  test('a part change keeps the key order of the lab return link', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto('/?taller=cache&parte=build&lenguaje=rust#sistemas');

    await systems.part('ship').click();

    await expect(page).toHaveURL('/?taller=cache&parte=ship&lenguaje=rust#sistemas');
  });
});
```

- **Pasos:**
  1. Correrla contra el legacy: las dos fallan. Hoy se escribe `/?lenguaje=rust&taller=cache&parte=explore#sistemas` y `/?lenguaje=rust&taller=cache&parte=ship#sistemas`.
  2. **Commit:** `test(e2e): las claves ajenas y el orden que conserva nuqs en Sistemas (D1, en rojo)`.
- **Compuerta:** las dos fallan por la razón esperada.

## 2. La infraestructura compartida

**Cubre:** FR-011, FR-021, FR-041, FR-046 y SC-010; V3.

### Tarea 2.1 · El arnés de componentes, si F3 no lo trajo (T007, H con K)

- **Cuándo:** si T001 encontró `"jsdom"` ausente de `package.json` y T002 lo instaló.
- **Archivos:**
  - `frontend/vitest.config.ts`, `frontend/src/vitest-setup.ts` (nuevo) y `eslint.config.ts`, que integra K;
  - la enmienda del ADR 0008 (los proyectos y el setup que F1 dejó para F3), que es documentación de K en T026.
- **`frontend/vitest.config.ts`:**

```ts
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Vite's root is frontend/src: without this the cache would land in frontend/src/node_modules.
    cacheDir: resolve(import.meta.dirname, '../node_modules/.vite'),
    test: {
      projects: [
        {
          extends: true,
          test: { name: 'node', environment: 'node', include: ['**/*.spec.ts'] },
        },
        {
          extends: true,
          test: {
            name: 'jsdom',
            environment: 'jsdom',
            include: ['**/*.spec.tsx'],
            setupFiles: [resolve(import.meta.dirname, 'src/vitest-setup.ts')],
          },
        },
      ],
    },
  }),
);
```

- **`frontend/src/vitest-setup.ts`:**

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- **`eslint.config.ts`:** un bloque nuevo, después del de `frontend/src/**/*.{js,jsx,ts,tsx}`:

```ts
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='useStore'][arguments.length<2]",
          message: 'useStore needs a small selector: never subscribe to the whole store (F2a, Q3).',
        },
      ],
    },
  },
```

- **Pasos:**
  1. **La prueba que falla:** `frontend/src/vitest-setup.probe.spec.tsx`, descartable, con `it('renders in jsdom', () => { render(<p>hola</p>); expect(screen.getByText('hola')).toBeInTheDocument(); })`. Sin el proyecto `jsdom` falla: Vitest no lo encuentra, o `document` no existe.
  2. Escribir los tres archivos. La spec pasa y `npm run test:unit` corre las del proyecto `node` como antes, con la misma cantidad.
  3. **La guarda:** un `useStore(systemsEngine.changes)` temporal da error de lint. Se borra el temporal y la spec de prueba.
  4. `npm run typecheck`, `npm run lint` y `npm run format:check`.
  5. **Commit:** `test(front): el arnés de componentes de Vitest con jsdom y la guarda de useStore`.
- **Si F3 ya lo trajo:** no se hace nada. T013 a T023 usan su configuración, y la guarda de F3 tiene que rechazar el mismo temporal; si no, K lo informa como hallazgo.

### Tarea 2.2 · nuqs en la raíz, si F3 no lo trajo (T008, K)

- **Cuándo:** después de T002 y T003. Si F3 ya creó un módulo equivalente, F5 lo usa y sólo comprueba que active la sincronización en el montaje y no al evaluar: `boot-check` «main.tsx without its call…» lo exige.
- **Archivos:**
  - `frontend/src/app/legacy/url-state.tsx` y `url-state.spec.tsx` (nuevos);
  - `frontend/THIRD-PARTY-NOTICES.txt`: el aviso MIT de nuqs, copiado de `node_modules/nuqs/LICENSE`, con el encabezado `nuqs — https://github.com/47ng/nuqs`, después del de Zustand y con el mismo formato.
- **Produce:**

```ts
export const UrlStateProvider: (props: { children: ReactNode }) => JSX.Element;
export function startUrlStateSync(): void;
```

- **La spec en rojo,** `frontend/src/app/legacy/url-state.spec.tsx`, contra un `url-state.tsx` cuyas dos exportaciones lanzan `not implemented`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseAsString, useQueryStates } from 'nuqs';
import { beforeEach, describe, expect, it } from 'vitest';
import { UrlStateProvider, startUrlStateSync } from './url-state';

const Probe = () => {
  const [query, setQuery] = useQueryStates({ taller: parseAsString }, { history: 'replace' });
  return (
    <>
      <p>taller: {query.taller ?? 'none'}</p>
      <button onClick={() => setQuery({ taller: 'heap' })}>open heap</button>
    </>
  );
};

describe('url state', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/?lenguaje=rust#sistemas');
  });

  it('writes with replace, keeps the other keys and keeps the hash', async () => {
    const user = userEvent.setup();
    const entries = history.length;
    render(
      <UrlStateProvider>
        <Probe />
      </UrlStateProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'open heap' }));

    await waitFor(() => expect(location.search).toBe('?lenguaje=rust&taller=heap'));
    expect(location.hash).toBe('#sistemas');
    expect(history.length).toBe(entries);
  });

  it('shows a foreign replaceState while mounted once the sync started', async () => {
    startUrlStateSync();
    startUrlStateSync();
    render(
      <UrlStateProvider>
        <Probe />
      </UrlStateProvider>,
    );
    expect(screen.getByText('taller: none')).toBeInTheDocument();

    history.replaceState(null, '', '/?lenguaje=go&taller=wal#sistemas');

    expect(await screen.findByText('taller: wal')).toBeInTheDocument();
  });
});
```

- **La implementación:**

```tsx
import type { ReactNode } from 'react';
import { NuqsAdapter, enableHistorySync } from 'nuqs/adapters/react';

interface UrlStateProviderProps {
  children: ReactNode;
}

export const UrlStateProvider = ({ children }: UrlStateProviderProps) => (
  <NuqsAdapter defaultOptions={{ history: 'replace' }}>{children}</NuqsAdapter>
);

export function startUrlStateSync(): void {
  enableHistorySync();
}
```

  Si el tipo de `defaultOptions` de nuqs 2.10.2 no admite `history`, se quita la prop: `replace` es el valor por omisión, y la primera spec lo sigue fijando.

- **Pasos:**
  1. La spec en rojo y su commit: `test(front): la raíz de nuqs escribe con replace y ve las escrituras ajenas`.
  2. La implementación. `npm run test:unit -- src/app/legacy/url-state.spec.tsx` en verde.
  3. La mutación: comentar `enableHistorySync()` hace fallar el segundo caso.
  4. `npm run typecheck`, `npm run lint` y `npm run format:check`.
  5. `grep -rn "nuqs/debug" frontend/src` no imprime nada.
  6. **Commit:** `feat(front): la raíz compartida de nuqs para las páginas con estado en la URL`.
- **Compuerta:** los pasos 2, 3 y 5.

### Tarea 2.3 · Un solo motor en `lab-bridge-check` (T009, Q)

- **Cuándo:** onda 1, sobre el legacy: se prueba con `frontend/systems.js` y no depende del port.
- **Si F6 entró antes y ya agregó un ayudante equivalente,** se usa el suyo y sólo se cambia `loadSystemsUi`.
- **Archivos:** `qa/lib/sources.ts`, `qa/lib/legacy-sources.ts` y `qa/lab-bridge-check.ts`.
- **Produce:**

```ts
// qa/lib/sources.ts
export function bundleSourceGroup(relativePaths: readonly string[]): string;
export function runSourceGroup(
  context: vm.Context,
  relativePaths: readonly string[],
  options?: RunOptions,
): void;
```

- **En `qa/lib/sources.ts`,** después de `bundleSource`:

```ts
const groupCache = new Map<string, string>();

function groupEntry(relativePaths: readonly string[]): esbuild.BuildOptions {
  return {
    stdin: {
      contents: relativePaths
        .map((file) => `import ${JSON.stringify(path.join(repoRoot, file))};`)
        .join('\n'),
      resolveDir: repoRoot,
      loader: 'js',
      sourcefile: `group:${relativePaths.join('+')}`,
    },
  };
}

export function bundleSourceGroup(relativePaths: readonly string[]): string {
  const key = relativePaths.join('|');
  const cached = groupCache.get(key);
  if (cached !== undefined) return cached;
  const text = build(key, {
    ...groupEntry(relativePaths),
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  groupCache.set(key, text);
  return text;
}

export function runSourceGroup(
  context: vm.Context,
  relativePaths: readonly string[],
  options: RunOptions = {},
): void {
  vm.runInContext(bundleSourceGroup(relativePaths), context, {
    filename: relativePaths.join('+'),
    timeout: options.timeout,
  });
}
```

- **En `qa/lib/legacy-sources.ts`:** se agrega `runSourceGroup` al import de `./sources.ts` y cambia sólo `loadSystemsUi`:

```ts
export function loadSystemsUi(context: vm.Context): void {
  runSourceGroup(context, [SYSTEMS_ENGINE_SOURCE, SYSTEMS_UI_SOURCE]);
}
```

- **En `qa/lab-bridge-check.ts`:** `systemsBridge` deja de llamar a `loadSystemsEngine(context);`, porque `loadSystemsUi` lo carga en el mismo bundle, y `loadSystemsEngine` sale del import si ya no se usa ahí. Ningún valor esperado cambia.
- **Pasos:**
  1. **V3, antes del cambio:** el script de quickstart.md §2.3 cuenta cuántas veces entra `create-systems-engine.ts` en los bundles de `loadSystemsEngine` y `loadSystemsUi` cargados por separado. Hoy `systems.js` no lo importa: 1 en total. Se anota.
  2. El cambio. `node qa/lab-bridge-check.ts`: 21 de 21.
  3. **V3, después:** el mismo script sobre el bundle del grupo. 1 entrada de `create-systems-engine.ts`.
  4. La mutación: volver a cargar `loadSystemsEngine` además del grupo deja dos motores en el contexto (`window.TallerSystemsEngine` es otro objeto). El script de §2.3 lo detecta. Sin cambiar la prueba, `lab-bridge-check` sigue en verde: por eso V3 se mide con el script.
  5. `npm test`, `npm run typecheck`, `npm run lint` y `npm run format:check`.
  6. **Commit:** `refactor(qa): lab-bridge-check carga el motor y la interfaz de Sistemas en un solo bundle`.
- **Correspondencia:** ningún escenario cambia. Cambia cómo carga la mitad de Sistemas (FR-041).

### Tarea 2.4 · Las vistas de React de `boot-check` (T010, Q)

- **Cuándo:** onda 1, con el Atlas como única vista de React.
- **Si F3, F4, F6 o F9 ya generalizaron el caso,** se salta y T024 sólo suma `'sistemas'`.
- **Archivo:** `qa/boot-check.ts`.
- **Cambios:**
  - el import de `FakeElement` pasa a ser de valor: `import { FakeElement, type FakeNode } from './lib/fake-dom.ts';`;
  - antes del escenario de navegación se agregan:

```ts
const REACT_VIEWS: ReadonlySet<string> = new Set(['atlas']);

function mountedText(node: FakeNode): string {
  if (node instanceof FakeElement) return node.childNodes.map(mountedText).join('');
  return node.nodeValue;
}
```

  - en el escenario de navegación, la rama `if (view === 'atlas')` pasa a ser:

```ts
    if (REACT_VIEWS.has(view)) {
      assert.ok(main.childNodes.length > 0, `#${view} no montó nodos en #main`);
      assert.ok(mountedText(main).includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
    } else {
      assert.ok(main.innerHTML.includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
    }
```

- **Pasos:**
  1. El cambio. `node qa/boot-check.ts`: la misma cantidad de escenarios en verde.
  2. **La mutación:** con `'sistemas'` en `REACT_VIEWS` antes del corte, el escenario falla («#sistemas no montó nodos»), porque el legacy escribe `innerHTML`. Eso prueba que la rama nueva mira los nodos. Se deshace.
  3. `npm run typecheck`, `npm run lint` y `npm run format:check`.
  4. **Commit:** `refactor(qa): boot-check verifica las vistas de React por sus nodos montados`.

## 3. La escena (S)

**Cubre:** FR-023, FR-026 y SC-005; US4.

### Tarea 3.1 · La spec del saneo, en rojo (T011)

- **Archivos:** `frontend/src/entities/systems-simulation/lib/sanitize-scene.ts`, con las firmas y `sanitizeScene` lanzando `not implemented`, y `sanitize-scene.spec.ts`.
- **Produce** (contrato):

```ts
export interface UntrustedScene {
  width?: unknown;
  height?: unknown;
  background?: unknown;
  alt?: unknown;
  shapes?: unknown;
}

interface ShapePaint {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type SafeSceneShape =
  | ({ type: 'rect'; x: number; y: number; width: number; height: number } & ShapePaint)
  | ({ type: 'circle'; cx: number; cy: number; r: number } & ShapePaint)
  | ({ type: 'line'; x1: number; y1: number; x2: number; y2: number } & ShapePaint)
  | ({ type: 'polygon'; points: string } & ShapePaint)
  | { type: 'text'; x: number; y: number; fill: string; fontSize: number; text: string };

export interface SafeScene {
  viewBox: string;
  background: string;
  alt: string;
  shapes: SafeSceneShape[];
}

export function sanitizeScene(scene: UntrustedScene): SafeScene;
```

- **La spec.** Los doce casos de FR-026, con los valores escritos a mano:

```ts
import { describe, expect, it } from 'vitest';
import { sanitizeScene } from './sanitize-scene';

const DEFAULT_PAINT = { fill: 'none', stroke: 'none', strokeWidth: 1 };

describe('sanitizeScene', () => {
  it('uses the fallback for NaN, Infinity and undefined numbers', () => {
    const scene = sanitizeScene({
      width: Number.NaN,
      height: Number.POSITIVE_INFINITY,
      shapes: [{ type: 'rect', x: undefined, y: Number.NaN, width: Number.POSITIVE_INFINITY, height: 5 }],
    });

    expect(scene.viewBox).toBe('0 0 400 260');
    expect(scene.shapes).toEqual([{ type: 'rect', x: 0, y: 0, width: 0, height: 5, ...DEFAULT_PAINT }]);
  });

  it('turns null into zero, as Number does', () => {
    const scene = sanitizeScene({
      width: null,
      shapes: [{ type: 'circle', x: null, y: 4, r: null }],
    });

    expect(scene.viewBox).toBe('0 0 1 260');
    expect(scene.shapes).toEqual([{ type: 'circle', cx: 0, cy: 4, r: 0, ...DEFAULT_PAINT }]);
  });

  it('never lets sizes, radii or stroke widths go below zero', () => {
    const scene = sanitizeScene({
      shapes: [
        { type: 'rect', x: -5, y: -6, width: -10, height: -1, strokeWidth: -2 },
        { type: 'circle', x: 1, y: 2, r: -3 },
      ],
    });

    expect(scene.shapes).toEqual([
      { type: 'rect', x: -5, y: -6, width: 0, height: 0, fill: 'none', stroke: 'none', strokeWidth: 0 },
      { type: 'circle', cx: 1, cy: 2, r: 0, ...DEFAULT_PAINT },
    ]);
  });

  it('keeps the viewBox at one or more when it is zero', () => {
    expect(sanitizeScene({ width: 0, height: 0 }).viewBox).toBe('0 0 1 1');
  });

  it('lets through only hex colors, none, currentColor and transparent, in any case', () => {
    const scene = sanitizeScene({
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: '#ABCDEF', stroke: 'CurrentColor' },
        { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: 'TRANSPARENT', stroke: '#fff' },
      ],
    });

    expect(scene.shapes.map((shape) => [shape.fill, 'stroke' in shape ? shape.stroke : ''])).toEqual([
      ['#ABCDEF', 'CurrentColor'],
      ['TRANSPARENT', '#fff'],
    ]);
  });

  it('replaces red, url(…) and an injected declaration with the fallback colors', () => {
    const scene = sanitizeScene({
      background: '#fff;position:fixed',
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: 'red', stroke: 'url(#evil)' },
        { type: 'text', x: 0, y: 0, text: 'a', fill: 'url(https://example.org/x)' },
      ],
    });

    expect(scene.background).toBe('#eeeae1');
    expect(scene.shapes).toEqual([
      { type: 'rect', x: 0, y: 0, width: 1, height: 1, ...DEFAULT_PAINT },
      { type: 'text', x: 0, y: 0, fill: '#252c27', fontSize: 12, text: 'a' },
    ]);
  });

  it('keeps a text with < and " as plain text', () => {
    const [shape] = sanitizeScene({ shapes: [{ type: 'text', x: 1, y: 2, text: '<b>"x"</b>' }] }).shapes;

    expect(shape).toEqual({ type: 'text', x: 1, y: 2, fill: '#252c27', fontSize: 12, text: '<b>"x"</b>' });
  });

  it('draws only the first 2 500 shapes', () => {
    const shapes = Array.from({ length: 2501 }, (_, index) => ({ type: 'line', x1: index, y1: 0, x2: 0, y2: 0 }));

    const scene = sanitizeScene({ shapes });

    expect(scene.shapes).toHaveLength(2500);
    expect(scene.shapes.at(-1)).toEqual({ type: 'line', x1: 2499, y1: 0, x2: 0, y2: 0, ...DEFAULT_PAINT });
  });

  it('cuts at 2 500 before dropping the shapes of an unknown type', () => {
    const shapes = [
      ...Array.from({ length: 2500 }, () => ({ type: 'ellipse' })),
      { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
    ];

    expect(sanitizeScene({ shapes }).shapes).toEqual([]);
  });

  it('drops a shape of an unknown type', () => {
    const scene = sanitizeScene({ shapes: [{ type: 'ellipse', x: 1 }, { type: 'circle', x: 1, y: 1, r: 1 }] });

    expect(scene.shapes).toEqual([{ type: 'circle', cx: 1, cy: 1, r: 1, ...DEFAULT_PAINT }]);
  });

  it('fills the text defaults and keeps a negative font size, as the template did', () => {
    const scene = sanitizeScene({ shapes: [{ type: 'text' }, { type: 'text', fontSize: -4, text: 7 }] });

    expect(scene.shapes).toEqual([
      { type: 'text', x: 0, y: 0, fill: '#252c27', fontSize: 12, text: '' },
      { type: 'text', x: 0, y: 0, fill: '#252c27', fontSize: -4, text: '7' },
    ]);
  });

  it('writes the polygon points as x,y pairs and an undefined alt as an empty label', () => {
    const scene = sanitizeScene({ shapes: [{ type: 'polygon', points: [[1, 2], [Number.NaN, '3']] }] });

    expect(scene.alt).toBe('');
    expect(scene.shapes).toEqual([{ type: 'polygon', points: '1,2 0,3', ...DEFAULT_PAINT }]);
  });
});
```

- **Pasos:**
  1. `npm run test:unit -- src/entities/systems-simulation/lib/sanitize-scene.spec.ts`: los doce fallan con `not implemented`.
  2. **Commit:** `test(front): el saneo de la escena de Sistemas, con escenas hostiles (en rojo)`.

### Tarea 3.2 · El saneo (T012)

- **Archivos:** `sanitize-scene.ts` y `frontend/src/entities/systems-simulation/index.ts`, que suma `export { sanitizeScene } from './lib/sanitize-scene';` y `export type { SafeScene, SafeSceneShape, UntrustedScene } from './lib/sanitize-scene';`.
- **La implementación**, debajo de los tipos de T011:

```ts
const MAX_SHAPES = 2500;
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|none|currentColor|transparent)$/i;

function finiteOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value: unknown, fallback: number): number {
  return Math.max(0, finiteOr(value, fallback));
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && SAFE_COLOR.test(value) ? value : fallback;
}

function paintOf(shape: Record<string, unknown>): ShapePaint {
  return {
    fill: safeColor(shape.fill, 'none'),
    stroke: safeColor(shape.stroke, 'none'),
    strokeWidth: nonNegative(shape.strokeWidth, 1),
  };
}

function pointsOf(points: unknown): string {
  if (!Array.isArray(points)) return '';
  return points
    .map((pair: unknown) => {
      const [x, y] = Array.isArray(pair) ? pair : [];
      return `${finiteOr(x, 0)},${finiteOr(y, 0)}`;
    })
    .join(' ');
}

function sanitizeShape(shape: unknown): SafeSceneShape | null {
  if (typeof shape !== 'object' || shape === null) return null;
  const raw = shape as Record<string, unknown>;
  switch (raw.type) {
    case 'rect':
      return {
        type: 'rect',
        x: finiteOr(raw.x, 0),
        y: finiteOr(raw.y, 0),
        width: nonNegative(raw.width, 0),
        height: nonNegative(raw.height, 0),
        ...paintOf(raw),
      };
    case 'circle':
      return {
        type: 'circle',
        cx: finiteOr(raw.x, 0),
        cy: finiteOr(raw.y, 0),
        r: nonNegative(raw.r, 0),
        ...paintOf(raw),
      };
    case 'line':
      return {
        type: 'line',
        x1: finiteOr(raw.x1, 0),
        y1: finiteOr(raw.y1, 0),
        x2: finiteOr(raw.x2, 0),
        y2: finiteOr(raw.y2, 0),
        ...paintOf(raw),
      };
    case 'polygon':
      return { type: 'polygon', points: pointsOf(raw.points), ...paintOf(raw) };
    case 'text':
      return {
        type: 'text',
        x: finiteOr(raw.x, 0),
        y: finiteOr(raw.y, 0),
        fill: safeColor(raw.fill, '#252c27'),
        fontSize: finiteOr(raw.fontSize, 12),
        text: String(raw.text ?? ''),
      };
    default:
      return null;
  }
}

export function sanitizeScene(scene: UntrustedScene): SafeScene {
  const width = Math.max(1, finiteOr(scene.width, 400));
  const height = Math.max(1, finiteOr(scene.height, 260));
  const shapes = Array.isArray(scene.shapes) ? scene.shapes.slice(0, MAX_SHAPES) : [];
  return {
    viewBox: `0 0 ${width} ${height}`,
    background: safeColor(scene.background, '#eeeae1'),
    alt: String(scene.alt ?? ''),
    shapes: shapes
      .map(sanitizeShape)
      .filter((shape): shape is SafeSceneShape => shape !== null),
  };
}
```

- **Pasos:**
  1. La implementación. La spec en verde, doce de doce.
  2. **Las mutaciones** (quickstart.md §4): cortar después de filtrar hace fallar «cuts at 2 500 before dropping»; quitar `typeof value === 'string'` no hace fallar ninguna, porque es un cambio sólo hostil (research.md, R5); quitar el `/i` hace fallar «in any case».
  3. `npm run typecheck`, `npm run lint` (`sanitizeShape` en 7) y `npm run format:check`.
  4. **Commit:** `feat(front): sanitizeScene sanea la escena de Sistemas con las reglas de la plantilla`.

## 4. El modelo de la página (M)

**Cubre:** FR-004, FR-011, FR-017, FR-018 y FR-020; US2 y US3.

### Tarea 4.1 · Los tipos, la lectura del motor y las fábricas (T013)

- **Archivos (nuevos):** `frontend/src/pages/systems/model/types.ts`, `workshop-views.ts` y `systems-page.factory.ts`.
- **Produce:** los tipos de abajo, `workshopViews` y `workshopView`; y, sólo para specs, `workshopFactory`, `exerciseFactory`, `probeModel`, `probeModels`, `passingLabState` e `initProbeEngine`.

**`types.ts`:**

```ts
import type { SystemsModel } from '../../../entities/systems-simulation';
import type { SystemsLanguage, SystemsWorkshop, WorkshopRecord } from '../../../entities/systems-workshop';
import type { LevelId } from '../../../shared/config/levels';

export type { SystemsLanguage };
export type WorkshopCategory = 'machine' | 'infra' | 'play';
export type WorkshopFamily = 'all' | WorkshopCategory;

type WorkshopObjectiveBase = SystemsWorkshop['objectives'][number];
type WorkshopPredictionBase = SystemsWorkshop['prediction'];

export interface WorkshopGoal extends WorkshopObjectiveBase {
  label: string;
  why: string;
}

export interface WorkshopCheckpoint extends WorkshopPredictionBase {
  question: string;
}

export interface WorkshopStep {
  title: string;
  task: string;
  why: string;
  done: string;
}

export interface WorkshopSource {
  title: string;
  url: string;
}

export interface WorkshopContent extends SystemsWorkshop {
  title: string;
  subtitle: string;
  story: string;
  what: string;
  why: string;
  limits: string;
  category: WorkshopCategory;
  level: LevelId;
  minutes: number;
  objectives: WorkshopGoal[];
  prediction: WorkshopCheckpoint;
  steps: WorkshopStep[];
  uses: string[];
  sources: WorkshopSource[];
  bridge: Record<SystemsLanguage, string>;
  related?: Partial<Record<SystemsLanguage, string[]>>;
}

export interface SystemsWorkshopView extends WorkshopContent {
  progress: WorkshopRecord;
  modelDone: boolean;
  completed: boolean;
  seals: number;
  storageAvailable: boolean;
}

export interface CatalogFilter {
  family: WorkshopFamily;
  query: string;
}

export interface SystemsPageExercise {
  id: string;
  title: string;
  objective: string;
  tests: readonly { label: string; why: string }[];
}

export type SystemsPageModel = SystemsModel<unknown>;
export type SystemsModelRegistry = Readonly<Record<string, SystemsPageModel>>;

export interface SystemsPageProps {
  language: SystemsLanguage;
  models: SystemsModelRegistry;
  exercises: readonly SystemsPageExercise[];
  notify: (message: string) => void;
  downloadKit: (workshop: SystemsWorkshopView) => void;
  scrollToTop: () => void;
}
```

**`workshop-views.ts`.** El único lugar que da a los resultados del motor los tipos del contenido, validado por `tools/content/`:

```ts
import { systemsEngine } from '../../../entities/systems-workshop';
import type { SystemsLanguage, SystemsWorkshopView } from './types';

export function workshopViews(language: SystemsLanguage): SystemsWorkshopView[] {
  return systemsEngine.list(language) as SystemsWorkshopView[];
}

export function workshopView(id: string, language: SystemsLanguage): SystemsWorkshopView {
  return systemsEngine.get(id, language) as SystemsWorkshopView;
}
```

**`systems-page.factory.ts`.** Sólo lo importan specs. No nombra la clave del almacén ni importa una fábrica del motor (reglas R1 y R3):

```ts
import { Factory } from 'fishery';
import { button, cell, defineModel, metric, type SimulationState } from '../../../entities/systems-simulation';
import { systemsEngine } from '../../../entities/systems-workshop';
import type { SystemsLanguage, SystemsModelRegistry, SystemsPageExercise, WorkshopContent } from './types';

export interface ProbeExercise extends SystemsPageExercise {
  language: SystemsLanguage;
  tests: { id: string; label: string; why: string }[];
}

export const workshopFactory = Factory.define<WorkshopContent>(() => ({
  id: 'probe',
  model: 'probe',
  title: 'Una sonda de prueba',
  subtitle: 'Registra cada toque.',
  story: 'Una sonda escucha lo que mandan los controles.',
  what: 'Un registro del último valor recibido.',
  why: 'Para ver qué valor llega de cada control.',
  limits: 'Sólo guarda el último valor.',
  category: 'machine',
  level: 'beginner',
  minutes: 20,
  objectives: [
    { id: 'touched-a', label: 'Tocá A', why: 'El primer valor.' },
    { id: 'touched-b', label: 'Tocá B', why: 'El segundo valor.' },
    { id: 'touched-empty', label: 'Tocá sin valor', why: 'Un control sin valor.' },
  ],
  prediction: {
    question: '¿Qué llega de un control sin valor?',
    options: ['Nada', 'Una cadena vacía'],
    answer: 1,
    explanation: 'El control sin valor manda una cadena vacía.',
  },
  steps: [
    { title: 'Etapa uno', task: 'Hacé la uno.', why: 'Por la uno.', done: 'La uno está.' },
    { title: 'Etapa dos', task: 'Hacé la dos.', why: 'Por la dos.', done: 'La dos está.' },
    { title: 'Etapa tres', task: 'Hacé la tres.', why: 'Por la tres.', done: 'La tres está.' },
    { title: 'Etapa cuatro', task: 'Hacé la cuatro.', why: 'Por la cuatro.', done: 'La cuatro está.' },
  ],
  uses: ['Registros', 'Sondas'],
  sources: [{ title: 'Fuente de la sonda', url: 'https://example.org/sonda' }],
  bridge: { rust: 'Llevá la sonda a Cargo.', go: 'Llevá la sonda a un módulo Go.' },
  related: { rust: ['rust-tool'], go: [] },
  code: { rust: 'rust-probe', go: 'go-probe' },
}));

export const exerciseFactory = Factory.define<ProbeExercise>(() => ({
  id: 'rust-probe',
  language: 'rust',
  title: 'El núcleo de la sonda',
  objective: 'Guardá el último valor.',
  tests: [
    { id: 'first', label: 'Primer caso', why: 'Cubre A.' },
    { id: 'second', label: 'Segundo caso', why: 'Cubre B.' },
    { id: 'third', label: 'Tercer caso', why: 'Cubre el vacío.' },
  ],
}));

interface ProbeState extends SimulationState {
  last: string;
}

export const probeModel = defineModel<ProbeState, 'touch' | 'reset'>({
  logLimit: 12,
  initial: () => ({ last: 'ninguno', log: [] }),
  actions: {
    touch(draft, { value, log }) {
      draft.last = `[${value}]`;
      log(draft, `Llegó ${draft.last}.`);
    },
    reset(_draft, { initial }) {
      return initial();
    },
  },
  view: (state) => ({
    title: 'Una sonda',
    summary: 'Muestra el último valor.',
    explanation: `Último valor: ${state.last}`,
    metrics: [metric('Último valor', state.last)],
    cells: [cell('Estado', state.last, state.last === 'ninguno' ? 'muted' : 'active')],
    controls: [button('touch', 'Tocar A', 'a'), button('touch', 'Tocar B', 'b'), button('touch', 'Tocar sin valor')],
    log: state.log,
  }),
  achieved: (state) => {
    if (state.last === '[a]') return ['touched-a'];
    if (state.last === '[b]') return ['touched-b'];
    if (state.last === '[]') return ['touched-empty'];
    return [];
  },
});

export const probeModels: SystemsModelRegistry = { probe: probeModel };

export function passingLabState(exerciseId = 'rust-probe') {
  const tests = ['first', 'second', 'third'].map((id) => ({ id, passed: true }));
  return { records: { [exerciseId]: { result: { success: true, code: 'fn probe() {}', tests } } } };
}

export function initProbeEngine(workshops: WorkshopContent[] = [workshopFactory.build()]): ProbeExercise[] {
  const exercises = [
    exerciseFactory.build(),
    exerciseFactory.build({ id: 'go-probe', language: 'go', title: 'El núcleo de la sonda en Go' }),
    exerciseFactory.build({ id: 'rust-tool', title: 'Una herramienta previa' }),
  ];
  systemsEngine.init({ workshops, models: probeModels, exercises });
  return exercises;
}
```

- **Pasos:**
  1. Escribir los tres archivos. Sin spec propia: `types.ts` no tiene comportamiento, `workshop-views.ts` es un cast que prueban las specs de componentes, y la fábrica es de prueba.
  2. `npm run typecheck`. Si `tsc` rechaza el cast de `workshop-views.ts`, el problema está en `WorkshopContent`, que tiene que ser un subtipo de `SystemsWorkshop`: se corrige ahí, nunca con `as unknown as`.
  3. `npm run lint`, `npm run format:check` y `node qa/seams-guard-check.ts`: 0 violaciones.
  4. **Commit:** `feat(front): los tipos de la página de Sistemas y sus fábricas de prueba`.
- **Sin fishery** (si el usuario no la autorizó): las dos constantes son objetos con `build(params?: Partial<…>)`, que devuelven `{ ...defaults, ...params }` con una copia nueva de cada array. Sus usos no cambian.

### Tarea 4.2 · Las familias y el filtro (T014)

- **Archivos:** `frontend/src/pages/systems/model/catalog-filter.ts` y `catalog-filter.spec.ts`.
- **Produce:**

```ts
export const FAMILY_LABELS: Readonly<Record<WorkshopFamily, string>>;
export const FAMILY_SYMBOLS: Readonly<Record<WorkshopCategory, string>>;
export const EMPTY_CATALOG_FILTER: CatalogFilter;
export interface SearchableWorkshop {
  id: string;
  title: string;
  subtitle: string;
  what: string;
  why: string;
  category: WorkshopCategory;
}
export function filterWorkshops<Workshop extends SearchableWorkshop>(
  workshops: readonly Workshop[],
  filter: CatalogFilter,
): Workshop[];
```

- **La spec en rojo,** con talleres literales mínimos y los resultados resueltos a mano:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_CATALOG_FILTER, FAMILY_LABELS, filterWorkshops, type SearchableWorkshop } from './catalog-filter';

const workshop = (overrides: Partial<SearchableWorkshop>): SearchableWorkshop => ({
  id: 'alfa',
  title: 'Alfa',
  subtitle: 'Beta',
  what: 'Gamma',
  why: 'Delta',
  category: 'machine',
  ...overrides,
});

const ids = (list: readonly SearchableWorkshop[]) => list.map((item) => item.id);

describe('filterWorkshops', () => {
  const catalog = [
    workshop({ id: 'cache', title: 'Una caché', category: 'machine' }),
    workshop({ id: 'wal', subtitle: 'Un registro previo', category: 'infra' }),
    workshop({ id: 'raster', what: 'Píxeles en fila', category: 'play' }),
    workshop({ id: 'quorum', why: 'Mayorías que se cruzan', category: 'infra' }),
  ];

  it('keeps every workshop with the empty filter, in order', () => {
    expect(ids(filterWorkshops(catalog, EMPTY_CATALOG_FILTER))).toEqual(['cache', 'wal', 'raster', 'quorum']);
  });

  it('keeps only the chosen family', () => {
    expect(ids(filterWorkshops(catalog, { family: 'infra', query: '' }))).toEqual(['wal', 'quorum']);
  });

  it('ignores accents and case', () => {
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'CACHE' }))).toEqual(['cache']);
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'pixeles' }))).toEqual(['raster']);
  });

  it('searches the subtitle, the why and the id', () => {
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'registro previo' }))).toEqual(['wal']);
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'mayorias' }))).toEqual(['quorum']);
    expect(ids(filterWorkshops(catalog, { family: 'all', query: 'quorum' }))).toEqual(['quorum']);
  });

  it('combines the family and the query', () => {
    expect(ids(filterWorkshops(catalog, { family: 'machine', query: 'registro' }))).toEqual([]);
  });

  it('does not trim the query', () => {
    const only = [workshop({ id: 'cache', title: 'Alfa', subtitle: 'Beta', what: 'Gamma', why: 'Delta' })];

    expect(ids(filterWorkshops(only, { family: 'all', query: ' cache' }))).toEqual(['cache']);
    expect(ids(filterWorkshops(only, { family: 'all', query: 'cache ' }))).toEqual([]);
  });
});

describe('FAMILY_LABELS', () => {
  it('lists the four families in the order of the filter buttons', () => {
    expect(Object.values(FAMILY_LABELS)).toEqual([
      'Todo el taller',
      'Dentro de la máquina',
      'Datos e infraestructura',
      'Gráficos, álgebra y juegos',
    ]);
  });
});
```

  El caso «does not trim» se resuelve a mano: el texto unido es `alfa beta gamma delta cache`. « cache» aparece (lo precede un espacio) y «cache » no (es el final).

- **La implementación:**

```ts
import { normalizeSearchText } from '../../../shared/lib/normalize-search-text';
import type { CatalogFilter, WorkshopCategory, WorkshopFamily } from './types';

export interface SearchableWorkshop {
  id: string;
  title: string;
  subtitle: string;
  what: string;
  why: string;
  category: WorkshopCategory;
}

export const FAMILY_LABELS: Readonly<Record<WorkshopFamily, string>> = {
  all: 'Todo el taller',
  machine: 'Dentro de la máquina',
  infra: 'Datos e infraestructura',
  play: 'Gráficos, álgebra y juegos',
};

export const FAMILY_SYMBOLS: Readonly<Record<WorkshopCategory, string>> = {
  machine: '▧',
  infra: '⌘',
  play: '◈',
};

export const EMPTY_CATALOG_FILTER: CatalogFilter = { family: 'all', query: '' };

export function filterWorkshops<Workshop extends SearchableWorkshop>(
  workshops: readonly Workshop[],
  filter: CatalogFilter,
): Workshop[] {
  const query = normalizeSearchText(filter.query);
  return workshops.filter(
    (workshop) =>
      (filter.family === 'all' || workshop.category === filter.family) &&
      normalizeSearchText(
        [workshop.title, workshop.subtitle, workshop.what, workshop.why, workshop.id].join(' '),
      ).includes(query),
  );
}
```

- **Pasos:** el rojo, con su commit `test(front): el filtro del catálogo de Sistemas (en rojo)`. Después el verde, el typecheck, el lint, el formato y el commit `feat(front): el filtro y las familias del catálogo de Sistemas`. **La mutación:** agregar `.trim()` a la query hace fallar «does not trim the query».

### Tarea 4.3 · La sesión (T015)

- **Archivos:** `frontend/src/pages/systems/model/systems-session.ts` y `systems-session.spec.ts`.
- **Produce:**

```ts
export function simulationKey(language: SystemsLanguage, workshopId: string): string;
export function readSimulation(key: string): unknown;
export function saveSimulation(key: string, state: unknown): void;
export function resetSimulations(): void;
export function readCatalogFilter(): CatalogFilter;
export function saveCatalogFilter(filter: CatalogFilter): void;
```

- **La spec en rojo:**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  readCatalogFilter,
  readSimulation,
  resetSimulations,
  saveCatalogFilter,
  saveSimulation,
  simulationKey,
} from './systems-session';

describe('the Systems session', () => {
  beforeEach(() => {
    resetSimulations();
    saveCatalogFilter({ family: 'all', query: '' });
  });

  it('keys a simulation by language and workshop, as the legacy view did', () => {
    expect(simulationKey('rust', 'cache')).toBe('rust:cache');
  });

  it('keeps each simulation apart by language', () => {
    saveSimulation('rust:cache', { hits: 1 });

    expect(readSimulation('rust:cache')).toEqual({ hits: 1 });
    expect(readSimulation('go:cache')).toBeUndefined();
  });

  it('starts with every family and no search, and returns the saved filter', () => {
    expect(readCatalogFilter()).toEqual({ family: 'all', query: '' });

    saveCatalogFilter({ family: 'infra', query: 'wal' });

    expect(readCatalogFilter()).toEqual({ family: 'infra', query: 'wal' });
  });

  it('resets the simulations and keeps the family and the search', () => {
    saveSimulation('rust:cache', { hits: 1 });
    saveCatalogFilter({ family: 'play', query: 'rayos' });

    resetSimulations();

    expect(readSimulation('rust:cache')).toBeUndefined();
    expect(readCatalogFilter()).toEqual({ family: 'play', query: 'rayos' });
  });
});
```

- **La implementación:**

```ts
import type { CatalogFilter, SystemsLanguage } from './types';

const simulations = new Map<string, unknown>();
let catalogFilter: CatalogFilter = { family: 'all', query: '' };

export function simulationKey(language: SystemsLanguage, workshopId: string): string {
  return `${language}:${workshopId}`;
}

export function readSimulation(key: string): unknown {
  return simulations.get(key);
}

export function saveSimulation(key: string, state: unknown): void {
  simulations.set(key, state);
}

export function resetSimulations(): void {
  simulations.clear();
}

export function readCatalogFilter(): CatalogFilter {
  return catalogFilter;
}

export function saveCatalogFilter(filter: CatalogFilter): void {
  catalogFilter = filter;
}
```

- **Pasos:** el rojo, con su commit `test(front): la sesión de las simulaciones de Sistemas (en rojo)`; el verde; los checks; y el commit `feat(front): la sesión de las simulaciones de Sistemas`. **La mutación:** que `resetSimulations` también vacíe el filtro hace fallar el último caso.

### Tarea 4.4 · La selección en la URL (T016)

- **Archivos:** `frontend/src/pages/systems/model/useWorkshopSelection.ts` y `useWorkshopSelection.spec.tsx`.
- **Produce:**

```ts
export interface WorkshopSelection {
  workshopId: string | null;
  part: WorkshopPart;
  open(workshopId: string): void;
  close(): void;
  changePart(workshopId: string, part: WorkshopPart): void;
}
declare const useWorkshopSelection: (language: SystemsLanguage) => WorkshopSelection;
export default useWorkshopSelection;
```

- **La spec en rojo.** `renderHook` con `withNuqsTestingAdapter`, que no limita la frecuencia en las pruebas:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { withNuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';
import useWorkshopSelection from './useWorkshopSelection';

function renderSelection(searchParams: string) {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const view = renderHook(() => useWorkshopSelection('rust'), {
    wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate, hasMemory: true }),
  });
  return { ...view, onUrlUpdate };
}

describe('useWorkshopSelection', () => {
  it('reads the workshop and the part from the query', () => {
    const { result } = renderSelection('?lenguaje=go&taller=cache&parte=ship');

    expect(result.current.workshopId).toBe('cache');
    expect(result.current.part).toBe('ship');
  });

  it('falls back to explore when the part is missing or unknown', () => {
    expect(renderSelection('?taller=cache').result.current.part).toBe('explore');
    expect(renderSelection('?taller=cache&parte=inventada').result.current.part).toBe('explore');
  });

  it('writes nothing on mount, even with an unknown part', () => {
    const { onUrlUpdate } = renderSelection('?taller=cache&parte=inventada');

    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it('opening writes the language, the workshop and parte=explore, replacing the entry', async () => {
    const { result, onUrlUpdate } = renderSelection('');

    act(() => result.current.open('cache'));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    const [event] = onUrlUpdate.mock.calls[0];
    expect(event.queryString).toBe('?lenguaje=rust&taller=cache&parte=explore');
    expect(event.options.history).toBe('replace');
    expect(result.current.workshopId).toBe('cache');
  });

  it('closing leaves only the language', async () => {
    const { result, onUrlUpdate } = renderSelection('?lenguaje=rust&taller=cache&parte=build');

    act(() => result.current.close());

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(onUrlUpdate.mock.calls[0][0].queryString).toBe('?lenguaje=rust');
  });

  it('changing the part writes the three keys', async () => {
    const { result, onUrlUpdate } = renderSelection('?lenguaje=rust&taller=cache&parte=explore');

    act(() => result.current.changePart('cache', 'ship'));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(onUrlUpdate.mock.calls[0][0].queryString).toBe('?lenguaje=rust&taller=cache&parte=ship');
    expect(result.current.part).toBe('ship');
  });
});
```

- **La implementación:**

```ts
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import type { SystemsLanguage } from './types';

const selectionParsers = {
  lenguaje: parseAsStringLiteral(['rust', 'go'] as const),
  taller: parseAsString,
  parte: parseAsStringLiteral(['explore', 'build', 'ship'] as const)
    .withDefault('explore')
    .withOptions({ clearOnDefault: false }),
};

export interface WorkshopSelection {
  workshopId: string | null;
  part: WorkshopPart;
  open(workshopId: string): void;
  close(): void;
  changePart(workshopId: string, part: WorkshopPart): void;
}

const useWorkshopSelection = (language: SystemsLanguage): WorkshopSelection => {
  const [query, setQuery] = useQueryStates(selectionParsers, { history: 'replace' });
  return {
    workshopId: query.taller,
    part: query.parte,
    open(workshopId) {
      setQuery({ lenguaje: language, taller: workshopId, parte: 'explore' });
    },
    close() {
      setQuery({ lenguaje: language, taller: null, parte: null });
    },
    changePart(workshopId, part) {
      setQuery({ lenguaje: language, taller: workshopId, parte: part });
    },
  };
};

export default useWorkshopSelection;
```

- **Pasos:**
  1. El rojo, con su commit `test(front): la selección del taller y la parte en la URL (en rojo)`.
  2. El verde y los checks.
  3. **Las mutaciones:** sin `clearOnDefault: false`, «opening writes…» falla (`?lenguaje=rust&taller=cache`). Con `{ taller, parte, lenguaje }`, falla por el orden. Sin `lenguaje`, falla por la clave que falta.
  4. **Commit:** `feat(front): la selección de Sistemas vive en la URL con nuqs`.

## 5. Los componentes (U)

**Cubre:** FR-001, FR-003 a FR-010, FR-012, FR-015, FR-016, FR-018, FR-019, FR-024, FR-025 y FR-051; US1, US4 y US7.

**Reglas comunes de las specs de componentes:**

- `userEvent.setup()` antes de cada `render` y `await` en cada interacción;
- las consultas, por rol y nombre accesible. Una clase o un id sólo para un elemento sin nombre, como en los Page Objects;
- el motor de verdad, inicializado con `initProbeEngine()` sobre un `localStorage` limpio (`beforeEach(() => localStorage.clear())`);
- las specs que necesitan re-dibujar con el motor envuelven el componente en un arnés local que se suscribe igual que la página: `useStore(systemsEngine.changes, (state) => state.revision)`;
- `Element.prototype.scrollIntoView` y `window.matchMedia` se definen con `vi.fn()` sólo en las specs que los usan;
- `celebrate` se reemplaza con `vi.mock('../../../shared/lib/celebration', () => ({ celebrate: vi.fn(), stop: vi.fn() }))` en las specs que comprueban que va antes del aviso.

### Tarea 5.1 · La escena dibujada (T017)

- **Archivos:** `frontend/src/pages/systems/ui/SceneView.tsx` y `SceneView.spec.tsx`.
- **Consume:** `sanitizeScene` y `Scene` de `entities/systems-simulation`.
- **Produce:** `SceneView({ scene }: { scene: Scene })`.
- **La spec en rojo:**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Scene } from '../../../entities/systems-simulation';
import SceneView from './SceneView';

const scene = (overrides: Partial<Scene>): Scene => ({
  width: 100,
  height: 50,
  background: '#14271f',
  alt: 'Una escena de prueba',
  shapes: [],
  ...overrides,
});

describe('SceneView', () => {
  it('draws a labelled image with its viewBox and its background', () => {
    render(<SceneView scene={scene({})} />);

    const svg = screen.getByRole('img', { name: 'Una escena de prueba' });
    expect(svg).toHaveAttribute('viewBox', '0 0 100 50');
    expect(svg).toHaveClass('sys-scene');
    expect(svg).toHaveStyle('background-color: #14271f');
  });

  it('uses the fallback background for an injected declaration and adds no other style', () => {
    render(<SceneView scene={scene({ background: '#fff;position:fixed' })} />);

    const svg = screen.getByRole('img');
    expect(svg).toHaveStyle('background-color: #eeeae1');
    expect(svg.style.position).toBe('');
  });

  it('writes a hostile text as text', () => {
    const { container } = render(
      <SceneView scene={scene({ shapes: [{ type: 'text', x: 1, y: 2, text: '<b>"x"</b>' }] })} />,
    );

    expect(screen.getByText('<b>"x"</b>').tagName).toBe('text');
    expect(container.querySelector('b')).toBeNull();
  });

  it('draws each shape with its attributes', () => {
    const { container } = render(
      <SceneView
        scene={scene({
          shapes: [
            { type: 'rect', x: 1, y: 2, width: 3, height: 4, fill: '#111', stroke: '#222', strokeWidth: 2 },
            { type: 'circle', x: 5, y: 6, r: 7 },
            { type: 'line', x1: 0, y1: 1, x2: 2, y2: 3 },
            { type: 'polygon', points: [[0, 0], [1, 1]] },
            { type: 'text', x: 8, y: 9, text: 'hola', fontSize: 10 },
          ],
        })}
      />,
    );

    const attributes = (selector: string, names: string[]) =>
      names.map((name) => container.querySelector(selector)?.getAttribute(name));
    expect(attributes('rect', ['x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width'])).toEqual(
      ['1', '2', '3', '4', '#111', '#222', '2'],
    );
    expect(attributes('circle', ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width'])).toEqual(
      ['5', '6', '7', 'none', 'none', '1'],
    );
    expect(attributes('line', ['x1', 'y1', 'x2', 'y2'])).toEqual(['0', '1', '2', '3']);
    expect(attributes('polygon', ['points'])).toEqual(['0,0 1,1']);
    expect(attributes('text', ['x', 'y', 'fill', 'font-size', 'font-family'])).toEqual(
      ['8', '9', '#252c27', '10', 'monospace'],
    );
  });
});
```

- **La implementación:**

```tsx
import { sanitizeScene, type SafeSceneShape, type Scene } from '../../../entities/systems-simulation';

interface SceneViewProps {
  scene: Scene;
}

function renderShape(shape: SafeSceneShape, key: number) {
  switch (shape.type) {
    case 'rect':
      return (
        <rect key={key} x={shape.x} y={shape.y} width={shape.width} height={shape.height}
          fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
      );
    case 'circle':
      return (
        <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r}
          fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
      );
    case 'line':
      return (
        <line key={key} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2}
          fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
      );
    case 'polygon':
      return (
        <polygon key={key} points={shape.points}
          fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
      );
    case 'text':
      return (
        <text key={key} x={shape.x} y={shape.y} fill={shape.fill} fontSize={shape.fontSize} fontFamily="monospace">
          {shape.text}
        </text>
      );
  }
}

const SceneView = ({ scene }: SceneViewProps) => {
  const safe = sanitizeScene(scene);
  return (
    <svg className="sys-scene" viewBox={safe.viewBox} role="img" aria-label={safe.alt}
      style={{ background: safe.background }}>
      {safe.shapes.map(renderShape)}
    </svg>
  );
};

export default SceneView;
```

  `renderShape` es una función y no un componente, para que el archivo tenga una sola abstracción principal. Prettier formatea los atributos.

- **Pasos:** el rojo, con `test(front): la escena de Sistemas con elementos de React (en rojo)`; el verde y los checks; y el commit `feat(front): la escena de Sistemas sin HTML armado ni style en la plantilla`.

### Tarea 5.2 · El modelo dibujado (T018)

- **Archivos:** `frontend/src/pages/systems/ui/ModelPanel.tsx`, `ModelTable.tsx`, `ModelTrace.tsx` y `ModelPanel.spec.tsx`.
- **Produce:**
  - `ModelPanel({ view, onAction }: { view: ModelView; onAction: (control: ViewControl) => void })`;
  - `ModelTable({ columns, rows }: { columns?: readonly string[]; rows?: readonly (readonly string[])[] })`;
  - `ModelTrace({ log }: { log: readonly string[] })`.
- **La spec en rojo:**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ModelView } from '../../../entities/systems-simulation';
import ModelPanel from './ModelPanel';

const view = (overrides: Partial<ModelView>): ModelView => ({
  title: 'Una estantería',
  summary: 'Izquierda: menos reciente.',
  explanation: 'Probá A.',
  metrics: [{ label: 'Hits', value: '2' }],
  cells: [
    { label: 'Lugar 1', value: 'A', tone: 'active' },
    { label: 'Lugar 2', value: 'Vacío', tone: 'muted' },
  ],
  controls: [
    { action: 'read', label: 'Leer A', value: 'A' },
    { action: 'reset', label: 'Reiniciar simulación' },
  ],
  log: [],
  ...overrides,
});

describe('ModelPanel', () => {
  it('draws the title, the metrics, the cells with their tone and the controls group', () => {
    const { container } = render(<ModelPanel view={view({})} onAction={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Una estantería' })).toBeInTheDocument();
    expect(screen.getByText('Hits').nextSibling).toHaveTextContent('2');
    expect([...container.querySelectorAll('.sys-cell')].map((cell) => cell.className)).toEqual([
      'sys-cell active',
      'sys-cell muted',
    ]);
    expect(
      screen.getByRole('group', { name: 'Acciones del modelo' }).querySelectorAll('button'),
    ).toHaveLength(2);
  });

  it('drops an unknown tone from the cell class', () => {
    const { container } = render(
      <ModelPanel
        view={view({ cells: [{ label: 'X', value: '1', tone: 'loud' as never }] })}
        onAction={vi.fn()}
      />,
    );

    expect(container.querySelector('.sys-cell')?.className.trim()).toBe('sys-cell');
  });

  it('calls back with the control the student pressed', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<ModelPanel view={view({})} onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Leer A' }));

    expect(onAction).toHaveBeenCalledWith({ action: 'read', label: 'Leer A', value: 'A' });
  });

  it('shows the last 8 lines of the trace, open, and no trace without lines', () => {
    const lines = Array.from({ length: 10 }, (_, index) => `Paso ${index + 1}`);
    const { container, rerender } = render(<ModelPanel view={view({ log: lines })} onAction={vi.fn()} />);

    expect(container.querySelector('details.sys-trace')).toHaveAttribute('open');
    expect([...container.querySelectorAll('.sys-trace li')].map((item) => item.textContent)).toEqual(
      lines.slice(2),
    );

    rerender(<ModelPanel view={view({ log: [] })} onAction={vi.fn()} />);
    expect(container.querySelector('details.sys-trace')).toBeNull();
  });

  it('leaves the trace closed when the student closed it and the log grows (C2)', () => {
    const { container, rerender } = render(<ModelPanel view={view({ log: ['Uno'] })} onAction={vi.fn()} />);
    const trace = container.querySelector('details') as HTMLDetailsElement;
    trace.open = false;

    rerender(<ModelPanel view={view({ log: ['Uno', 'Dos'] })} onAction={vi.fn()} />);

    expect(container.querySelector('details')).toBe(trace);
    expect(trace.open).toBe(false);
  });

  it('draws the state table as a focusable region and keeps the same node when the rows change (C2)', () => {
    const { rerender } = render(
      <ModelPanel view={view({ columns: ['Tarea', 'Estado'], rows: [['A', 'lista']] })} onAction={vi.fn()} />,
    );
    const region = screen.getByRole('region', { name: 'Estado del modelo' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Tarea', 'Estado']);

    rerender(
      <ModelPanel view={view({ columns: ['Tarea', 'Estado'], rows: [['A', 'hecha']] })} onAction={vi.fn()} />,
    );

    expect(screen.getByRole('region', { name: 'Estado del modelo' })).toBe(region);
  });
});
```

- **`ModelTrace.tsx`:**

```tsx
interface ModelTraceProps {
  log: readonly string[];
}

const TRACE_LINES = 8;

const ModelTrace = ({ log }: ModelTraceProps) => {
  if (!log.length) return null;
  return (
    <details className="sys-trace" open>
      <summary>Qué cambió y por qué · últimos pasos</summary>
      <ol>
        {log.slice(-TRACE_LINES).map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </details>
  );
};

export default ModelTrace;
```

- **`ModelTable.tsx`:**

```tsx
interface ModelTableProps {
  columns?: readonly string[];
  rows?: readonly (readonly string[])[];
}

const ModelTable = ({ columns, rows }: ModelTableProps) => {
  if (!columns?.length) return null;
  return (
    <div className="sys-table-scroll" tabIndex={0} role="region" aria-label="Estado del modelo">
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} scope="col">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, cellIndex) => (
                <td key={cellIndex}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ModelTable;
```

- **`ModelPanel.tsx`:**

```tsx
import type { ModelView, ViewControl } from '../../../entities/systems-simulation';
import ModelTable from './ModelTable';
import ModelTrace from './ModelTrace';
import SceneView from './SceneView';

const CELL_TONES: readonly string[] = ['active', 'good', 'bad', 'muted'];

interface ModelPanelProps {
  view: ModelView;
  onAction: (control: ViewControl) => void;
}

const ModelPanel = ({ view, onAction }: ModelPanelProps) => (
  <>
    <h2>{view.title}</h2>
    <p className="sys-model-summary">{view.summary}</p>
    <div className="sys-metrics">
      {view.metrics.map((metric, index) => (
        <div key={index}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
    {view.scene ? <SceneView scene={view.scene} /> : null}
    {view.cells.length ? (
      <div className="sys-cells">
        {view.cells.map((cell, index) => (
          <div key={index} className={`sys-cell ${CELL_TONES.includes(cell.tone) ? cell.tone : ''}`}>
            <span>{cell.label}</span>
            <strong>{cell.value}</strong>
          </div>
        ))}
      </div>
    ) : null}
    <ModelTable columns={view.columns} rows={view.rows} />
    <div className="sys-controls" role="group" aria-label="Acciones del modelo">
      {view.controls.map((control) => (
        <button key={`${control.action}:${control.value ?? ''}`} onClick={() => onAction(control)}>
          {control.label}
        </button>
      ))}
    </div>
    <ModelTrace log={view.log} />
  </>
);

export default ModelPanel;
```

- **Pasos:**
  1. El rojo, con `test(front): el modelo de Sistemas dibujado con React (en rojo)`.
  2. El verde.
  3. `npm run lint`: ninguna función pasa de 10. `ModelPanel` queda en 3; la plantilla vieja estaba en 11.
  4. **Commit:** `feat(front): el modelo de Sistemas con su tabla y su traza montadas`.

### Tarea 5.3 · El checkpoint (T019)

- **Archivos:** `frontend/src/pages/systems/ui/Checkpoint.tsx` y `Checkpoint.spec.tsx`.
- **Produce:** `Checkpoint({ workshop, language, notify }: { workshop: SystemsWorkshopView; language: SystemsLanguage; notify: (message: string) => void })`.
- **La spec en rojo:**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { celebrate } from '../../../shared/lib/celebration';
import { initProbeEngine, passingLabState } from '../model/systems-page.factory';
import { workshopView } from '../model/workshop-views';
import Checkpoint from './Checkpoint';

vi.mock('../../../shared/lib/celebration', () => ({ celebrate: vi.fn(), stop: vi.fn() }));

const Subscribed = ({ notify }: { notify: (message: string) => void }) => {
  useStore(systemsEngine.changes, (state) => state.revision);
  return <Checkpoint workshop={workshopView('probe', 'rust')} language="rust" notify={notify} />;
};

describe('Checkpoint', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(celebrate).mockClear();
  });

  it('invites to answer before any answer', () => {
    initProbeEngine();
    render(<Subscribed notify={vi.fn()} />);

    expect(screen.getByText('Probá una explicación. Después contrastala con el porqué.')).toBeInTheDocument();
  });

  it('a wrong answer explains, keeps the focus and announces the retry, in the same feedback node', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    initProbeEngine();
    const { container } = render(<Subscribed notify={notify} />);
    const feedback = container.querySelector('.sys-feedback');

    await user.click(screen.getByRole('button', { name: 'ANada' }));

    expect(container.querySelector('.sys-feedback')).toBe(feedback);
    expect(feedback).toHaveTextContent('Revisemos esa decisión. El control sin valor manda una cadena vacía.');
    expect(screen.getByRole('button', { name: 'ANada' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'ANada' })).toHaveClass('incorrect');
    expect(screen.getByRole('button', { name: 'ANada' })).toHaveFocus();
    expect(notify).toHaveBeenCalledWith('Revisá el porqué y probá otra explicación.');
  });

  it('the right answer earns the prediction seal and announces it', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    initProbeEngine();
    render(<Subscribed notify={notify} />);

    await user.click(screen.getByRole('button', { name: 'BUna cadena vacía' }));

    expect(screen.getByText('Esa es la idea.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BUna cadena vacía' })).toHaveClass('correct');
    expect(workshopView('probe', 'rust').progress.predicted).toBe(true);
    expect(notify).toHaveBeenCalledWith('Checkpoint razonado. Contrastá la explicación con tu experimento.');
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('celebrates before the announcement when the answer earns the third seal', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.mocked(celebrate).mockImplementation(() => calls.push('celebrate'));
    initProbeEngine();
    systemsEngine.observe('probe', 'rust', ['touched-a', 'touched-b', 'touched-empty']);
    systemsEngine.syncLab(passingLabState());
    render(<Subscribed notify={(message) => calls.push(message)} />);

    await user.click(screen.getByRole('button', { name: 'BUna cadena vacía' }));

    expect(calls).toEqual(['celebrate', 'Checkpoint razonado. Contrastá la explicación con tu experimento.']);
  });
});
```

  `passingLabState()` cumple `hasPassingEvidence` (`entities/exercise/model/passing-evidence.ts`): `success: true`, un `code` que no está vacío y las tres pruebas del núcleo aprobadas. Si el nombre accesible de una opción sale con un espacio («A Nada»), la spec usa ese nombre, porque es el que lee un lector de pantalla.

- **La implementación:**

```tsx
import { systemsEngine } from '../../../entities/systems-workshop';
import { celebrate } from '../../../shared/lib/celebration';
import type { SystemsLanguage, SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';

interface CheckpointProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  notify: (message: string) => void;
}

function answerClass(answer: number | null, index: number, correct: number): string {
  if (answer !== index) return '';
  return index === correct ? 'correct' : 'incorrect';
}

const Checkpoint = ({ workshop, language, notify }: CheckpointProps) => {
  const { prediction } = workshop;
  const answer = workshop.progress.answer;

  const choose = (index: number) => {
    const before = workshopView(workshop.id, language);
    const result = systemsEngine.answer(workshop.id, language, index);
    if (!before.completed && result.completed) celebrate();
    notify(
      result.correct
        ? 'Checkpoint razonado. Contrastá la explicación con tu experimento.'
        : 'Revisá el porqué y probá otra explicación.',
    );
  };

  return (
    <section className="sys-checkpoint">
      <div className="small-label">CHECKPOINT · EXPLICÁ LA DECISIÓN</div>
      <h2>{prediction.question}</h2>
      <div className="sys-answers">
        {prediction.options.map((option, index) => (
          <button key={index} aria-pressed={answer === index}
            className={answerClass(answer, index, prediction.answer)} onClick={() => choose(index)}>
            <span>{String.fromCharCode(65 + index)}</span>
            {option}
          </button>
        ))}
      </div>
      <div className="sys-feedback" role="status">
        {answer === null ? (
          'Probá una explicación. Después contrastala con el porqué.'
        ) : (
          <>
            <strong>{answer === prediction.answer ? 'Esa es la idea.' : 'Revisemos esa decisión.'}</strong>{' '}
            {prediction.explanation}
          </>
        )}
      </div>
    </section>
  );
};

export default Checkpoint;
```

- **Pasos:** el rojo, con `test(front): el checkpoint de Sistemas (en rojo)`; el verde y los checks; y el commit `feat(front): el checkpoint de Sistemas con su retroalimentación montada`.

### Tarea 5.4 · Explorar (T020)

- **Archivos:** `frontend/src/pages/systems/ui/ExplorePart.tsx`, `WorkshopSources.tsx` y `ExplorePart.spec.tsx`.
- **Produce:**
  - `ExplorePart({ workshop, language, model, notify, onPartChange })`, con `model: SystemsPageModel` y `onPartChange: (part: WorkshopPart) => void`;
  - `WorkshopSources({ sources }: { sources: readonly WorkshopSource[] })`.
- **`WorkshopSources.tsx`:**

```tsx
import type { WorkshopSource } from '../model/types';

interface WorkshopSourcesProps {
  sources: readonly WorkshopSource[];
}

const WorkshopSources = ({ sources }: WorkshopSourcesProps) => (
  <section className="sys-sources">
    <h2>Seguí con quienes construyeron estas ideas.</h2>
    <div>
      {sources.map((source, index) => (
        <a key={index} href={source.url} target="_blank" rel="noopener noreferrer">
          {source.title} ↗
        </a>
      ))}
    </div>
  </section>
);

export default WorkshopSources;
```

- **La spec en rojo.** El arnés `Subscribed` hace lo que hace la página: se suscribe y le pasa a `ExplorePart` la vista recién leída.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { celebrate } from '../../../shared/lib/celebration';
import { readSimulation, resetSimulations } from '../model/systems-session';
import { initProbeEngine, passingLabState, probeModel } from '../model/systems-page.factory';
import { workshopView } from '../model/workshop-views';
import ExplorePart from './ExplorePart';

vi.mock('../../../shared/lib/celebration', () => ({ celebrate: vi.fn(), stop: vi.fn() }));

const Subscribed = ({ notify = vi.fn() }: { notify?: (message: string) => void }) => {
  useStore(systemsEngine.changes, (state) => state.revision);
  return (
    <ExplorePart workshop={workshopView('probe', 'rust')} language="rust" model={probeModel}
      notify={notify} onPartChange={vi.fn()} />
  );
};

const traceLines = (container: HTMLElement) => container.querySelectorAll('.sys-trace li');

describe('ExplorePart', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSimulations();
    initProbeEngine();
  });

  it('an action traces, marks the objective, announces it and keeps the focus on the control', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const { container } = render(<Subscribed notify={notify} />);

    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    expect(traceLines(container)).toHaveLength(1);
    expect(container.querySelector('.sys-goal.earned')).toHaveTextContent('Tocá A');
    expect(notify).toHaveBeenCalledWith('Nueva situación comprendida: Tocá A');
    expect(screen.getByRole('button', { name: 'Tocar A' })).toHaveFocus();
  });

  it('repeating a situation grows the trace without a new objective, announcement or write (FR-019)', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const { container } = render(<Subscribed notify={notify} />);
    await user.click(screen.getByRole('button', { name: 'Tocar A' }));
    const revision = systemsEngine.changes.getState().revision;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    expect(traceLines(container)).toHaveLength(2);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(setItem).not.toHaveBeenCalled();
    expect(systemsEngine.changes.getState().revision).toBe(revision);
    setItem.mockRestore();
  });

  it('a control without a value reaches the model as an empty string', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);

    await user.click(screen.getByRole('button', { name: 'Tocar sin valor' }));

    expect(screen.getByText('Último valor').nextSibling).toHaveTextContent('[]');
  });

  it('updates the live text in place', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    const live = screen.getByText('Último valor: ninguno');

    await user.click(screen.getByRole('button', { name: 'Tocar B' }));

    expect(live).toHaveTextContent('Último valor: [b]');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('«Reiniciar modelo ↺» empties the trace and keeps the objectives', async () => {
    const user = userEvent.setup();
    const { container } = render(<Subscribed />);
    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    await user.click(screen.getByRole('button', { name: 'Reiniciar modelo ↺' }));

    expect(traceLines(container)).toHaveLength(0);
    expect(container.querySelector('.sys-goal.earned')).toHaveTextContent('Tocá A');
  });

  it('keeps the simulation across mounts and loses it after resetSimulations', async () => {
    const user = userEvent.setup();
    const first = render(<Subscribed />);
    await user.click(screen.getByRole('button', { name: 'Tocar A' }));
    first.unmount();

    const second = render(<Subscribed />);
    expect(traceLines(second.container)).toHaveLength(1);
    second.unmount();

    resetSimulations();
    expect(readSimulation('rust:probe')).toBeUndefined();
    const third = render(<Subscribed />);
    expect(traceLines(third.container)).toHaveLength(0);
  });

  it('celebrates before announcing the third seal', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.mocked(celebrate).mockImplementation(() => calls.push('celebrate'));
    systemsEngine.observe('probe', 'rust', ['touched-b', 'touched-empty']);
    systemsEngine.answer('probe', 'rust', 1);
    systemsEngine.syncLab(passingLabState());
    render(<Subscribed notify={(message) => calls.push(message)} />);

    await user.click(screen.getByRole('button', { name: 'Tocar A' }));

    expect(calls).toEqual([
      'Nueva situación comprendida: Tocá A',
      'celebrate',
      'Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.',
    ]);
  });
});
```

- **La implementación:**

```tsx
import { useState } from 'react';
import type { ViewControl } from '../../../entities/systems-simulation';
import { systemsEngine, type ObserveResult } from '../../../entities/systems-workshop';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import { celebrate } from '../../../shared/lib/celebration';
import { readSimulation, saveSimulation, simulationKey } from '../model/systems-session';
import type { SystemsLanguage, SystemsPageModel, SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';
import Checkpoint from './Checkpoint';
import ModelPanel from './ModelPanel';
import WorkshopSources from './WorkshopSources';

interface ExplorePartProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  model: SystemsPageModel;
  notify: (message: string) => void;
  onPartChange: (part: WorkshopPart) => void;
}

function announceObservation(
  before: SystemsWorkshopView,
  result: ObserveResult,
  notify: (message: string) => void,
): void {
  if (result.added.length)
    notify(
      'Nueva situación comprendida: ' +
        result.added.map((id) => before.objectives.find((goal) => goal.id === id)?.label).join(' · '),
    );
  if (!before.completed && result.completed) {
    celebrate();
    notify('Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.');
  }
}

const ExplorePart = ({ workshop, language, model, notify, onPartChange }: ExplorePartProps) => {
  const key = simulationKey(language, workshop.id);
  const [simulation, setSimulation] = useState<unknown>(
    () => readSimulation(key) ?? model.initial(workshop),
  );
  const view = model.view(simulation, workshop);

  const runModel = (control: ViewControl | null) => {
    const before = workshopView(workshop.id, language);
    const next =
      control === null
        ? model.initial(before)
        : model.act(simulation, control.action, control.value ?? '', before);
    saveSimulation(key, next);
    setSimulation(next);
    announceObservation(
      before,
      systemsEngine.observe(workshop.id, language, model.achieved(next, before)),
      notify,
    );
  };

  return (
    <>
      <div className="sys-concept">
        <section>
          <h2>¿Qué estás construyendo?</h2>
          <p>{workshop.what}</p>
        </section>
        <section>
          <h2>¿Por qué existe?</h2>
          <p>{workshop.why}</p>
        </section>
      </div>
      <div className="sys-model-layout">
        <section className="sys-sandbox" aria-label={`Modelo interactivo de ${workshop.title}`}>
          <div className="sys-model-top">
            <span className="small-label">MODELO CONCEPTUAL · PASO A PASO</span>
            <button className="text-button" onClick={() => runModel(null)}>Reiniciar modelo ↺</button>
          </div>
          <div id="sys-model-view">
            <ModelPanel view={view} onAction={runModel} />
          </div>
          <p id="sys-model-live" className="sys-model-live" role="status" aria-live="polite">
            {view.explanation}
          </p>
        </section>
        <aside className="sys-objectives">
          <span className="eyebrow">TU INVESTIGACIÓN</span>
          <h2>Tres cosas para descubrir.</h2>
          <div id="sys-objective-list">
            {workshop.objectives.map((goal) => {
              const earned = workshop.progress.observed.includes(goal.id);
              return (
                <div key={goal.id} className={`sys-goal ${earned ? 'earned' : ''}`}>
                  <span aria-hidden="true">{earned ? '✓' : '○'}</span>
                  <div>
                    <strong>{goal.label}</strong>
                    <p>{goal.why}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p>Los sellos se conservan al reiniciar el modelo. Experimentar acá no ejecuta ni aprueba el código del editor.</p>
        </aside>
      </div>
      <div className="sys-limit">
        <strong>Hasta dónde llega este modelo</strong>
        <p>{workshop.limits}</p>
      </div>
      <Checkpoint workshop={workshop} language={language} notify={notify} />
      <div className="sys-footer">
        <p>Convertí las reglas que observaste en una función que puedas probar.</p>
        <button className="button" onClick={() => onPartChange('build')}>Programar el núcleo →</button>
      </div>
      <WorkshopSources sources={workshop.sources} />
    </>
  );
};

export default ExplorePart;
```

- **Pasos:**
  1. El rojo, con `test(front): Explorar de Sistemas (en rojo)`.
  2. El verde y los checks.
  3. **Las mutaciones:** `control.value` sin `?? ''` hace fallar «a control without a value…» (muestra `[undefined]`); invertir `celebrate()` y el aviso hace fallar «celebrates before…».
  4. **Commit:** `feat(front): Explorar de Sistemas con la sesión de las simulaciones`.

### Tarea 5.5 · Construir y Entregar (T021)

- **Archivos:** `frontend/src/pages/systems/ui/BuildPart.tsx`, `ShipPart.tsx`, `BuildPart.spec.tsx` y `ShipPart.spec.tsx`.
- **Produce:**
  - `BuildPart({ workshop, language, exercises, onPartChange })`;
  - `ShipPart({ workshop, language, notify, downloadKit })`.
- **La spec de Construir, en rojo:**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { initProbeEngine, passingLabState } from '../model/systems-page.factory';
import { workshopView } from '../model/workshop-views';
import BuildPart from './BuildPart';

describe('BuildPart', () => {
  beforeEach(() => localStorage.clear());

  it('shows the core of the language with its tests and its IDE link', () => {
    const exercises = initProbeEngine();
    render(<BuildPart workshop={workshopView('probe', 'rust')} language="rust" exercises={exercises} onPartChange={vi.fn()} />);

    expect(screen.getByText('NÚCLEO EJECUTABLE · RUST')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'El núcleo de la sonda' })).toBeInTheDocument();
    expect(screen.getByText('3 pruebas reales')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar al IDE ↗' })).toHaveAttribute(
      'href',
      '?sistema=probe&ejercicio=rust-probe&paso=code#laboratorio',
    );
    expect(screen.getByText('Llevá la sonda a Cargo.')).toBeInTheDocument();
  });

  it('links the known previous tools and skips the unknown ones', () => {
    const exercises = initProbeEngine();
    render(
      <BuildPart workshop={{ ...workshopView('probe', 'rust'), related: { rust: ['rust-tool', 'rust-gone'] } }}
        language="rust" exercises={exercises} onPartChange={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: /^rust-tool/ })).toHaveAttribute(
      'href',
      '?sistema=probe&ejercicio=rust-tool&paso=code#laboratorio',
    );
    expect(screen.queryByText('rust-gone')).toBeNull();
  });

  it('shows the verified-code notice only with the code seal', () => {
    const exercises = initProbeEngine();
    const { rerender } = render(
      <BuildPart workshop={workshopView('probe', 'rust')} language="rust" exercises={exercises} onPartChange={vi.fn()} />,
    );
    expect(screen.queryByRole('status')).toBeNull();

    systemsEngine.syncLab(passingLabState());
    rerender(<BuildPart workshop={workshopView('probe', 'rust')} language="rust" exercises={exercises} onPartChange={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent(/^✓ Este núcleo tiene una ejecución registrada/);
  });

  it('the footer button asks for the ship part', async () => {
    const user = userEvent.setup();
    const onPartChange = vi.fn();
    const exercises = initProbeEngine();
    render(<BuildPart workshop={workshopView('probe', 'rust')} language="rust" exercises={exercises} onPartChange={onPartChange} />);

    await user.click(screen.getByRole('button', { name: 'Armar mi proyecto →' }));

    expect(onPartChange).toHaveBeenCalledWith('ship');
  });
});
```

- **`BuildPart.tsx`:**

```tsx
import { workshopExerciseHref, type WorkshopPart } from '../../../shared/config/url-grammar';
import type { SystemsLanguage, SystemsPageExercise, SystemsWorkshopView } from '../model/types';
import WorkshopSources from './WorkshopSources';

interface BuildPartProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  exercises: readonly SystemsPageExercise[];
  onPartChange: (part: WorkshopPart) => void;
}

const BuildPart = ({ workshop, language, exercises, onPartChange }: BuildPartProps) => {
  const core = exercises.find((exercise) => exercise.id === workshop.code[language]);
  if (!core) throw new Error(`Falta el núcleo ${workshop.code[language]} del taller ${workshop.id}.`);
  const tools = (workshop.related?.[language] ?? []).flatMap((id) => {
    const exercise = exercises.find((item) => item.id === id);
    return exercise ? [exercise] : [];
  });

  return (
    <>
      <div className="sys-build-callout">
        <div>
          <span className="small-label">NÚCLEO EJECUTABLE · {language.toUpperCase()}</span>
          <h2>{core.title}</h2>
          <p>{core.objective}</p>
          <div className="sys-pills">
            <span>{core.tests.length} pruebas reales</span>
            <span>Pistas progresivas</span>
            <span>Tu propio caso extra</span>
          </div>
        </div>
        <a className="button" href={workshopExerciseHref(workshop.id, core.id)}>Entrar al IDE ↗</a>
      </div>
      <div className="sys-concept">
        <section>
          <h2>Del dibujo al código.</h2>
          <p>{workshop.bridge[language]}</p>
        </section>
        <section>
          <h2>Lo que vas a verificar.</h2>
          <ul>
            {core.tests.map((test, index) => (
              <li key={index}>
                <strong>{test.label}</strong>
                <br />
                {test.why}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {workshop.progress.code ? (
        <p className="sys-code-passed" role="status">
          ✓ Este núcleo tiene una ejecución registrada con sus tres casos aprobados. Cambiarlo no borra el sello: ejecutá otra vez para verificar el código nuevo.
        </p>
      ) : null}
      <div className="sys-related">
        <h2>Herramientas que preparan esta idea.</h2>
        <p>Estos ejercicios existentes se reutilizan como práctica previa. Podés ir directamente al núcleo si ya entendés el concepto.</p>
        <div>
          {tools.map((tool) => (
            <a key={tool.id} href={workshopExerciseHref(workshop.id, tool.id)}>
              <span>{tool.id}</span>
              {tool.title} ↗
            </a>
          ))}
        </div>
      </div>
      <div className="sys-footer">
        <p>El navegador comprueba el núcleo acotado. El próximo paso convierte esa pieza en un proyecto.</p>
        <button className="button" onClick={() => onPartChange('ship')}>Armar mi proyecto →</button>
      </div>
      <WorkshopSources sources={workshop.sources} />
    </>
  );
};

export default BuildPart;
```

- **La spec de Entregar, en rojo:**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { initProbeEngine } from '../model/systems-page.factory';
import type { SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';
import ShipPart from './ShipPart';

interface HarnessProps {
  notify?: (message: string) => void;
  downloadKit?: (workshop: SystemsWorkshopView) => void;
}

const Subscribed = ({ notify = vi.fn(), downloadKit = vi.fn() }: HarnessProps) => {
  useStore(systemsEngine.changes, (state) => state.revision);
  return <ShipPart workshop={workshopView('probe', 'rust')} language="rust" notify={notify} downloadKit={downloadKit} />;
};

describe('ShipPart', () => {
  beforeEach(() => {
    localStorage.clear();
    initProbeEngine();
  });

  it('downloads the kit of the fresh workshop and announces it', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const downloadKit = vi.fn();
    render(<Subscribed notify={notify} downloadKit={downloadKit} />);

    await user.click(screen.getByRole('button', { name: 'Descargar kit Rust ↓' }));

    expect(downloadKit).toHaveBeenCalledWith(expect.objectContaining({ id: 'probe', storageAvailable: true }));
    expect(notify).toHaveBeenCalledWith('Kit descargado con tu borrador y sus pruebas.');
  });

  it('announces why the kit could not be prepared', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    render(<Subscribed notify={notify} downloadKit={() => { throw new Error('sin núcleo'); }} />);

    await user.click(screen.getByRole('button', { name: 'Descargar kit Rust ↓' }));

    expect(notify).toHaveBeenCalledWith('No se pudo preparar el kit: sin núcleo');
  });

  it('a stage saves its index and stays checked', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    const boxes = screen.getAllByRole('checkbox', { name: 'Lo comprobé en mi proyecto · registro manual' });

    await user.click(boxes[2]);

    expect(workshopView('probe', 'rust').progress.steps).toEqual([2]);
    expect(boxes[2]).toBeChecked();
    expect(boxes[0]).not.toBeChecked();
  });

  it('the note saves on every key and says so', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    const note = screen.getByRole('textbox', { name: 'Dejá tu próximo experimento por escrito' });
    expect(screen.getByText('La nota y las etapas se guardan con tu progreso. Las casillas son tu registro, no una evaluación automática.')).toBeInTheDocument();

    await user.type(note, 'hola');

    expect(workshopView('probe', 'rust').progress.note).toBe('hola');
    expect(screen.getByText('Nota guardada. Dejá un test concreto para volver.')).toBeInTheDocument();
    expect(note).toHaveAttribute('maxlength', '10000');
  });

  it('says the note could not be saved when the storage fails', async () => {
    const user = userEvent.setup();
    render(<Subscribed />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    await user.type(screen.getByRole('textbox', { name: 'Dejá tu próximo experimento por escrito' }), 'x');

    expect(screen.getByText('No se pudo guardar: exportá tu avance antes de cerrar.')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
```

- **`ShipPart.tsx`:**

```tsx
import { useState } from 'react';
import { systemsEngine } from '../../../entities/systems-workshop';
import type { SystemsLanguage, SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';
import Checkpoint from './Checkpoint';
import WorkshopSources from './WorkshopSources';

interface ShipPartProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  notify: (message: string) => void;
  downloadKit: (workshop: SystemsWorkshopView) => void;
}

const NOTE_HINT =
  'La nota y las etapas se guardan con tu progreso. Las casillas son tu registro, no una evaluación automática.';

const ShipPart = ({ workshop, language, notify, downloadKit }: ShipPartProps) => {
  const [noteStatus, setNoteStatus] = useState(NOTE_HINT);
  const languageName = language === 'rust' ? 'Rust' : 'Go';

  const download = () => {
    try {
      downloadKit(workshopView(workshop.id, language));
      notify('Kit descargado con tu borrador y sus pruebas.');
    } catch (error) {
      notify('No se pudo preparar el kit: ' + (error as Error).message);
    }
  };

  const saveNote = (note: string) => {
    const result = systemsEngine.setNote(workshop.id, language, note);
    setNoteStatus(
      result.storageAvailable
        ? 'Nota guardada. Dejá un test concreto para volver.'
        : 'No se pudo guardar: exportá tu avance antes de cerrar.',
    );
  };

  return (
    <>
      <section className="sys-project-intro">
        <div>
          <span className="eyebrow">UNA PIEZA QUE PODÉS LLEVARTE</span>
          <h2>Del experimento al proyecto.</h2>
          <p>
            Descargá un kit con tu borrador actual, tres tests, una solución separada para consultar y esta hoja de ruta.{' '}
            {language === 'rust' ? 'Incluye Cargo.toml y pruebas de Rust.' : 'Incluye go.mod y pruebas de Go.'} El kit
            implementa el núcleo del ejercicio; estas cuatro etapas guían la ampliación.
          </p>
        </div>
        <button className="button" onClick={download}>Descargar kit {languageName} ↓</button>
      </section>
      <div className="sys-real-uses">
        <h3>Dónde aparece esta idea</h3>
        {workshop.uses.map((use, index) => (
          <span key={index}>{use}</span>
        ))}
      </div>
      <div className="sys-project-steps">
        {workshop.steps.map((step, index) => (
          <article key={index}>
            <div className="sys-step-index">0{index + 1}</div>
            <div>
              <h3>{step.title}</h3>
              <p>{step.task}</p>
              <p>
                <strong>Por qué:</strong> {step.why}
              </p>
              <div className="sys-acceptance">
                <strong>Lo podés comprobar así</strong>
                <p>{step.done}</p>
              </div>
              <label>
                <input type="checkbox" checked={workshop.progress.steps.includes(index)}
                  onChange={(event) => systemsEngine.setStep(workshop.id, language, index, event.target.checked)} />{' '}
                Lo comprobé en mi proyecto · registro manual
              </label>
            </div>
          </article>
        ))}
      </div>
      <div className="sys-limit">
        <strong>Límite y siguiente herramienta</strong>
        <p>{workshop.limits}</p>
        <p>{workshop.bridge[language]}</p>
      </div>
      <label className="sys-note">
        <span>Dejá tu próximo experimento por escrito</span>
        <textarea id="sys-note" maxLength={10000} placeholder="Observé que… Mi próximo test va a demostrar…"
          defaultValue={workshop.progress.note} onChange={(event) => saveNote(event.target.value)} />
      </label>
      <p id="sys-note-status" className="note-state">{noteStatus}</p>
      <Checkpoint workshop={workshop} language={language} notify={notify} />
      <WorkshopSources sources={workshop.sources} />
    </>
  );
};

export default ShipPart;
```

- **Pasos:**
  1. Los dos rojos, con `test(front): Construir y Entregar de Sistemas (en rojo)`.
  2. Los verdes y los checks.
  3. **Las mutaciones:** controlar la nota con `value` en vez de `defaultValue` no rompe las specs, pero el E2E del cursor (T004) sí lo detectaría si React lo moviera; se anota en el informe de la tarea. Quitar `{' '}` antes de «Lo comprobé…» no rompe ninguna spec y sí la comparación del DOM (T025).
  4. **Commit:** `feat(front): Construir y Entregar de Sistemas`.

  La cadena del párrafo del kit va exactamente como en la plantilla: «… y esta hoja de ruta. Incluye Cargo.toml y pruebas de Rust. El kit implementa…». La comparación del DOM de T025 fija los espacios.

### Tarea 5.6 · El catálogo (T022)

- **Archivos:** `frontend/src/pages/systems/ui/SystemsCatalog.tsx`, `WorkshopCard.tsx`, `ExternalTools.tsx` y `SystemsCatalog.spec.tsx`.
- **Produce:**
  - `SystemsCatalog({ language, workshops, returnFocusTo, onOpen })`, con `returnFocusTo: string | null` y `onOpen: (workshopId: string) => void`;
  - `WorkshopCard({ workshop, openRef, onOpen })`, con `openRef: RefCallback<HTMLButtonElement>`;
  - `ExternalTools()`.
- **La spec en rojo.** Los talleres salen de `workshopFactory` y del motor de verdad:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveCatalogFilter } from '../model/systems-session';
import { initProbeEngine, workshopFactory } from '../model/systems-page.factory';
import { workshopViews } from '../model/workshop-views';
import SystemsCatalog from './SystemsCatalog';

function seedCatalog() {
  initProbeEngine([
    workshopFactory.build({ id: 'probe', title: 'Una sonda de prueba', category: 'machine' }),
    workshopFactory.build({ id: 'wal', title: 'Un registro previo', category: 'infra' }),
  ]);
  return workshopViews('rust');
}

describe('SystemsCatalog', () => {
  beforeEach(() => {
    localStorage.clear();
    saveCatalogFilter({ family: 'all', query: '' });
  });

  it('counts the workshops, the cores and the completed ones', () => {
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);

    expect(screen.getByText('2 talleres')).toBeInTheDocument();
    expect(screen.getByText('4 núcleos programables')).toBeInTheDocument();
    expect(screen.getByText('0 / 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Talleres con modelo, código y checkpoint completados' })).toHaveAttribute('max', '2');
  });

  it('filters by family with aria-pressed, keeps the focus and keeps the counter node', async () => {
    const user = userEvent.setup();
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);
    const counter = screen.getByText('2 talleres para explorar');

    await user.click(screen.getByRole('button', { name: 'Datos e infraestructura' }));

    expect(screen.getByRole('button', { name: 'Datos e infraestructura' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Datos e infraestructura' })).toHaveFocus();
    expect(counter).toHaveTextContent('1 talleres para explorar');
    expect(screen.getAllByRole('button', { name: 'Explorar →' })).toHaveLength(1);
  });

  it('shows the empty state and «Ver todos los talleres» clears the filter and focuses the search box', async () => {
    const user = userEvent.setup();
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' }), 'zzzz');
    expect(screen.getByRole('heading', { name: 'No aparece ese taller.' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver todos los talleres' }));

    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveValue('');
    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveFocus();
    expect(screen.getAllByRole('button', { name: 'Explorar →' })).toHaveLength(2);
  });

  it('keeps the family and the search across mounts', async () => {
    const user = userEvent.setup();
    const first = render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Datos e infraestructura' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' }), 'registro');
    first.unmount();

    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Datos e infraestructura' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveValue('registro');
  });

  it('opens a workshop by its id', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo={null} onOpen={onOpen} />);

    await user.click(screen.getAllByRole('button', { name: 'Explorar →' })[1]);

    expect(onOpen).toHaveBeenCalledWith('wal');
  });

  it('focuses «Explorar →» of the workshop it returns from', () => {
    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo="wal" onOpen={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: 'Explorar →' })[1]).toHaveFocus();
  });

  it('focuses the search box when the session filter hides the workshop it returns from', () => {
    saveCatalogFilter({ family: 'machine', query: '' });

    render(<SystemsCatalog language="rust" workshops={seedCatalog()} returnFocusTo="wal" onOpen={vi.fn()} />);

    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveFocus();
  });
});
```

- **`WorkshopCard.tsx`:**

```tsx
import type { RefCallback } from 'react';
import { LEVEL_LABELS } from '../../../shared/config/levels';
import { FAMILY_LABELS, FAMILY_SYMBOLS } from '../model/catalog-filter';
import type { SystemsWorkshopView } from '../model/types';

interface WorkshopCardProps {
  workshop: SystemsWorkshopView;
  openRef: RefCallback<HTMLButtonElement>;
  onOpen: (workshopId: string) => void;
}

const WorkshopCard = ({ workshop, openRef, onOpen }: WorkshopCardProps) => (
  <article className="sys-card">
    <div className="sys-card-top">
      <span className="sys-card-symbol" aria-hidden="true">{FAMILY_SYMBOLS[workshop.category]}</span>
      <span>{LEVEL_LABELS[workshop.level]} · {workshop.minutes} min orientativos</span>
    </div>
    <span className="small-label">{FAMILY_LABELS[workshop.category]}</span>
    <h2>{workshop.title}</h2>
    <p>{workshop.subtitle}</p>
    <div className="sys-card-bottom">
      <span>{workshop.completed ? '✓ Tres sellos conseguidos' : `${workshop.seals}/3 sellos`}</span>
      <button className="button small secondary" ref={openRef} onClick={() => onOpen(workshop.id)}>
        Explorar →
      </button>
    </div>
  </article>
);

export default WorkshopCard;
```

- **`ExternalTools.tsx`.** El texto es el de la plantilla, carácter por carácter (en «RISC‑V», el guion es U+2011):

```tsx
const ExternalTools = () => (
  <section className="sys-external">
    <div className="eyebrow">TU PRÓXIMO BANCO DE PRUEBAS</div>
    <h2>Seguí construyendo con herramientas reales.</h2>
    <p>Estos proyectos documentados complementan los modelos del taller. Se abren en sus propios sitios; tu avance acá se conserva.</p>
    <div className="sys-external-grid">
      <article>
        <span className="small-label">DE COMPUERTAS A PROGRAMAS</span>
        <h3>Nand2Tetris</h3>
        <p>Construí RAM y una CPU Hack con HDL, probalas y observá programas en sus emuladores.</p>
        <strong>Experimento: cambiá una celda de RAM y seguí qué instrucción la lee.</strong>
        <a href="https://nand2tetris.github.io/web-ide/" target="_blank" rel="noopener noreferrer">Abrir el IDE web ↗</a>
        <a href="https://www.nand2tetris.org/project03" target="_blank" rel="noopener noreferrer">Guía oficial de memoria ↗</a>
      </article>
      <article>
        <span className="small-label">ARQUITECTURA A LA VISTA</span>
        <h3>Ripes</h3>
        <p>Explorá instrucciones RISC‑V, procesadores, cachés y dispositivos mapeados en memoria. Su versión web es experimental.</p>
        <strong>Experimento: repetí un acceso y compará dos configuraciones de caché.</strong>
        <a href="https://ripes.dk/" target="_blank" rel="noopener noreferrer">Abrir Ripes ↗</a>
        <a href="https://github.com/mortbopet/Ripes" target="_blank" rel="noopener noreferrer">Documentación y versión de escritorio ↗</a>
      </article>
      <article>
        <span className="small-label">MEMORIA VIRTUAL Y SISTEMA OPERATIVO</span>
        <h3>OSTEP</h3>
        <p>Usá los simuladores de los autores para practicar traducción, paginación, heap y planificación con nuevos escenarios.</p>
        <strong>Experimento: calculá una dirección física antes de pedir la solución al simulador.</strong>
        <a href="https://github.com/remzi-arpacidusseau/ostep-homework" target="_blank" rel="noopener noreferrer">Ejercicios y simuladores ↗</a>
        <a href="https://pages.cs.wisc.edu/~remzi/OSTEP/" target="_blank" rel="noopener noreferrer">Leer el libro gratuito ↗</a>
      </article>
    </div>
  </section>
);

export default ExternalTools;
```

- **`SystemsCatalog.tsx`:**

```tsx
import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { EMPTY_CATALOG_FILTER, FAMILY_LABELS, filterWorkshops } from '../model/catalog-filter';
import { readCatalogFilter, saveCatalogFilter } from '../model/systems-session';
import type { CatalogFilter, SystemsLanguage, SystemsWorkshopView, WorkshopFamily } from '../model/types';
import ExternalTools from './ExternalTools';
import WorkshopCard from './WorkshopCard';

interface SystemsCatalogProps {
  language: SystemsLanguage;
  workshops: readonly SystemsWorkshopView[];
  returnFocusTo: string | null;
  onOpen: (workshopId: string) => void;
}

const FAMILIES = Object.entries(FAMILY_LABELS) as [WorkshopFamily, string][];

const SystemsCatalog = ({ language, workshops, returnFocusTo, onOpen }: SystemsCatalogProps) => {
  const [filter, setFilter] = useState<CatalogFilter>(readCatalogFilter);
  const searchRef = useRef<HTMLInputElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const languageName = language === 'rust' ? 'Rust' : 'Go';
  const done = workshops.filter((workshop) => workshop.completed).length;
  const visible = filterWorkshops(workshops, filter);

  useLayoutEffect(() => {
    if (returnFocusTo === null) return;
    const target = openButtons.current.get(returnFocusTo) ?? searchRef.current;
    target?.focus({ preventScroll: true });
  }, [returnFocusTo]);

  const updateFilter = (next: CatalogFilter) => {
    setFilter(next);
    saveCatalogFilter(next);
  };

  const clearFilter = () => {
    flushSync(() => updateFilter(EMPTY_CATALOG_FILTER));
    searchRef.current?.focus();
  };

  const registerOpenButton = (workshopId: string) => (node: HTMLButtonElement) => {
    openButtons.current.set(workshopId, node);
    return () => {
      openButtons.current.delete(workshopId);
    };
  };

  return (
    <>
      <section className="sys-hero">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line"></span> SISTEMAS · APRENDER DESARMANDO
          </div>
          <h1>
            Abrí la caja.
            <br />
            <em>Construí lo que hay adentro.</em>
          </h1>
          <p>
            Memoria que se fragmenta. Bases de datos que sobreviven a un corte. Rayos que dibujan un mundo. Hacé visible
            una idea, provocá un fallo y construí su núcleo en {languageName}.
          </p>
          <div className="sys-pills">
            <span>{workshops.length} talleres</span>
            <span>{workshops.length * 2} núcleos programables</span>
            <span>Modelos paso a paso</span>
          </div>
        </div>
        <div className="sys-hero-board" aria-hidden="true">
          <div className="sys-board-row"><span>01</span><b>ESTADO</b><i>▧</i></div>
          <div className="sys-board-path">↓ proponer · observar · explicar</div>
          <div className="sys-board-row"><span>10</span><b>REGLA</b><i>⌘</i></div>
          <div className="sys-board-path">↓ escribir · comprobar · cambiar</div>
          <div className="sys-board-row last"><span>11</span><b>PROYECTO</b><i>◈</i></div>
        </div>
      </section>
      <div className="sys-overview-progress">
        <div>
          <strong>{done} / {workshops.length}</strong>
          <span>talleres con sus tres sellos en {languageName}</span>
        </div>
        <progress value={done} max={workshops.length} aria-label="Talleres con modelo, código y checkpoint completados"></progress>
      </div>
      <section className="sys-start">
        <h2>Elegí una curiosidad. Seguí sus consecuencias.</h2>
        <p>En cada taller: explorás tres situaciones, verificás un núcleo con pruebas reales y razonás un checkpoint. Después podés descargar tu proyecto y ampliarlo. El proyecto completo tiene criterios manuales; los sellos registran el trabajo del taller.</p>
      </section>
      <div className="sys-toolbar">
        <div className="sys-filters" role="group" aria-label="Familia de talleres">
          {FAMILIES.map(([family, label]) => (
            <button key={family} aria-pressed={filter.family === family} onClick={() => updateFilter({ ...filter, family })}>
              {label}
            </button>
          ))}
        </div>
        <label className="sys-search">
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} id="sys-search" type="search" autoComplete="off" placeholder="Caché, rayos, kernel, colisiones…"
            aria-label="Buscar talleres de sistemas" value={filter.query}
            onChange={(event) => updateFilter({ ...filter, query: event.target.value })} />
        </label>
      </div>
      <p id="sys-count" className="sys-result-count" role="status">{visible.length} talleres para explorar</p>
      <div id="sys-catalog" className="sys-catalog">
        {visible.length ? (
          visible.map((workshop) => (
            <WorkshopCard key={workshop.id} workshop={workshop} openRef={registerOpenButton(workshop.id)} onOpen={onOpen} />
          ))
        ) : (
          <div className="lab-empty">
            <h2>No aparece ese taller.</h2>
            <p>Probá otra idea o quitá los filtros.</p>
            <button className="button secondary" onClick={clearFilter}>Ver todos los talleres</button>
          </div>
        )}
      </div>
      <ExternalTools />
      <details className="sys-boundaries">
        <summary>Del modelo a una implementación real</summary>
        <p>Los modelos corren localmente y explican sus reglas. Tu código se compila con el runner de Rust o Go. Un MMU de papel no programa la MMU física; una cola visual no simula el scheduler completo del sistema operativo. Cada taller delimita qué enseña, enlaza fuentes y propone pasos concretos para seguir fuera del navegador.</p>
        <p>
          Los proyectos reutilizan el IDE, el runner y un formato común de modelos, objetivos y pruebas. Las descargas ZIP usan{' '}
          <a href="https://github.com/101arrowz/fflate" target="_blank" rel="noopener noreferrer">fflate</a>. Tu avance sigue
          siendo local y se incluye al exportar la guía.
        </p>
      </details>
    </>
  );
};

export default SystemsCatalog;
```

- **Pasos:**
  1. El rojo, con `test(front): el catálogo de Sistemas (en rojo)`.
  2. El verde y los checks.
  3. `node quickstart-texts.mjs` (quickstart.md §4.1): cada texto fijo de `SystemsCatalog.tsx`, `ExternalTools.tsx`, `WorkshopCard.tsx` y los componentes de T017 a T021 aparece en `frontend/systems.js`.
  4. **Commit:** `feat(front): el catálogo de Sistemas con su filtro de sesión`.

### Tarea 5.7 · El detalle, la página y su API pública (T023)

- **Archivos:** `frontend/src/pages/systems/ui/WorkshopDetail.tsx`, `SystemsPage.tsx`, `SystemsPage.spec.tsx` e `index.ts`.
- **Produce:**
  - `WorkshopDetail({ workshop, language, part, headingRef, tabsRef, onBack, onPartChange, children })`;
  - `SystemsPage(props: SystemsPageProps)`;
  - la API pública: `SystemsPage`, `resetSimulations` y los tipos `SystemsPageProps`, `SystemsPageExercise`, `SystemsModelRegistry` y `SystemsWorkshopView`.
- **`WorkshopDetail.tsx`:**

```tsx
import type { ReactNode, Ref } from 'react';
import { LEVEL_LABELS } from '../../../shared/config/levels';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import { FAMILY_LABELS, FAMILY_SYMBOLS } from '../model/catalog-filter';
import type { SystemsLanguage, SystemsWorkshopView } from '../model/types';

const PART_TABS: readonly (readonly [WorkshopPart, string])[] = [
  ['explore', 'Manipulá el sistema'],
  ['build', 'Programá su núcleo'],
  ['ship', 'Llevátelo a un proyecto'],
];

interface WorkshopDetailProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  part: WorkshopPart;
  headingRef: Ref<HTMLHeadingElement>;
  tabsRef: Ref<HTMLDivElement>;
  onBack: () => void;
  onPartChange: (part: WorkshopPart) => void;
  children: ReactNode;
}

const WorkshopDetail = ({ workshop, language, part, headingRef, tabsRef, onBack, onPartChange, children }: WorkshopDetailProps) => {
  const seals: readonly (readonly [boolean, string, string])[] = [
    [workshop.modelDone, '01', 'Modelo explorado'],
    [workshop.progress.code, '02', 'Código verificado'],
    [workshop.progress.predicted, '03', 'Checkpoint razonado'],
  ];
  return (
    <>
      <div className="sys-breadcrumb">
        <button onClick={onBack}>← Todos los talleres</button>
        <span>{FAMILY_LABELS[workshop.category]} / {LEVEL_LABELS[workshop.level]}</span>
      </div>
      <header className="sys-detail-heading">
        <div className="eyebrow">
          {FAMILY_SYMBOLS[workshop.category]} {language.toUpperCase()} · {workshop.minutes} MIN ORIENTATIVOS
        </div>
        <h1 tabIndex={-1} ref={headingRef}>{workshop.title}</h1>
        <p>{workshop.story}</p>
      </header>
      <div className="sys-seals" aria-label="Progreso del taller">
        {seals.map(([done, number, label]) => (
          <span key={number} className={done ? 'earned' : ''}>
            <b>{done ? '✓' : number}</b>
            {label}
          </span>
        ))}
      </div>
      {workshop.storageAvailable ? null : (
        <p className="sys-storage" role="status">No se pudo guardar el progreso. Exportá una copia antes de cerrar.</p>
      )}
      <div className="sys-tabs" role="group" aria-label="Etapas del taller" ref={tabsRef}>
        {PART_TABS.map(([id, label], index) => (
          <button key={id} aria-pressed={part === id} onClick={() => onPartChange(id)}>
            <span>0{index + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="sys-phase">{children}</div>
    </>
  );
};

export default WorkshopDetail;
```

- **`SystemsPage.tsx`:**

```tsx
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useStore } from 'zustand';
import { systemsEngine } from '../../../entities/systems-workshop';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import type { SystemsPageProps } from '../model/types';
import useWorkshopSelection from '../model/useWorkshopSelection';
import { workshopViews } from '../model/workshop-views';
import BuildPart from './BuildPart';
import ExplorePart from './ExplorePart';
import ShipPart from './ShipPart';
import SystemsCatalog from './SystemsCatalog';
import WorkshopDetail from './WorkshopDetail';

const selectRevision = (state: { revision: number }) => state.revision;

const SystemsPage = ({ language, models, exercises, notify, downloadKit, scrollToTop }: SystemsPageProps) => {
  useStore(systemsEngine.changes, selectRevision);
  const selection = useWorkshopSelection(language);
  const [returnFocusTo, setReturnFocusTo] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const workshops = workshopViews(language);
  const workshop = workshops.find((item) => item.id === selection.workshopId);

  const openWorkshop = (workshopId: string) => {
    flushSync(() => selection.open(workshopId));
    headingRef.current?.focus();
    scrollToTop();
  };

  if (!workshop)
    return <SystemsCatalog language={language} workshops={workshops} returnFocusTo={returnFocusTo} onOpen={openWorkshop} />;

  const backToCatalog = () => {
    flushSync(() => {
      setReturnFocusTo(workshop.id);
      selection.close();
    });
    scrollToTop();
  };

  const changePart = (part: WorkshopPart) => {
    flushSync(() => selection.changePart(workshop.id, part));
    tabsRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    tabsRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <WorkshopDetail workshop={workshop} language={language} part={selection.part} headingRef={headingRef}
      tabsRef={tabsRef} onBack={backToCatalog} onPartChange={changePart}>
      {selection.part === 'explore' ? (
        <ExplorePart workshop={workshop} language={language} model={models[workshop.model]} notify={notify} onPartChange={changePart} />
      ) : null}
      {selection.part === 'build' ? (
        <BuildPart workshop={workshop} language={language} exercises={exercises} onPartChange={changePart} />
      ) : null}
      {selection.part === 'ship' ? (
        <ShipPart workshop={workshop} language={language} notify={notify} downloadKit={downloadKit} />
      ) : null}
    </WorkshopDetail>
  );
};

export default SystemsPage;
```

- **`index.ts`:**

```ts
export { default as SystemsPage } from './ui/SystemsPage';
export { resetSimulations } from './model/systems-session';
export type {
  SystemsModelRegistry,
  SystemsPageExercise,
  SystemsPageProps,
  SystemsWorkshopView,
} from './model/types';
```

- **La spec en rojo,** `SystemsPage.spec.tsx`. Con `NuqsTestingAdapter`, el motor de verdad y los dobles de `scrollIntoView`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemsEngine } from '../../../entities/systems-workshop';
import { resetSimulations, saveCatalogFilter } from '../model/systems-session';
import { initProbeEngine, probeModels, workshopFactory } from '../model/systems-page.factory';
import SystemsPage from './SystemsPage';

function renderPage(searchParams: string) {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const scrollToTop = vi.fn();
  const exercises = initProbeEngine([
    workshopFactory.build(),
    workshopFactory.build({ id: 'wal', title: 'Un registro previo', category: 'infra' }),
  ]);
  render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
      <SystemsPage language="rust" models={probeModels} exercises={exercises} notify={vi.fn()} downloadKit={vi.fn()} scrollToTop={scrollToTop} />
    </NuqsTestingAdapter>,
  );
  return { onUrlUpdate, scrollToTop };
}

describe('SystemsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSimulations();
    saveCatalogFilter({ family: 'all', query: '' });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('opens the catalog for an unknown workshop', () => {
    renderPage('?taller=inexistente');

    expect(screen.getByRole('heading', { level: 1, name: /Abrí la caja\./ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '← Todos los talleres' })).toBeNull();
  });

  it('opens the workshop of the query at the part of the query, and Explorar for an unknown part', () => {
    renderPage('?lenguaje=rust&taller=probe&parte=inventada');

    expect(screen.getByRole('heading', { level: 1, name: 'Una sonda de prueba' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manipulá el sistema/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('«Explorar →» writes the query, focuses the title and scrolls #main to the top', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, scrollToTop } = renderPage('?lenguaje=rust');

    await user.click(screen.getAllByRole('button', { name: 'Explorar →' })[0]);

    expect(screen.getByRole('heading', { level: 1, name: 'Una sonda de prueba' })).toHaveFocus();
    expect(scrollToTop).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?lenguaje=rust&taller=probe&parte=explore'),
    );
  });

  it('going back writes the catalog query and focuses «Explorar →» of the workshop it leaves', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, scrollToTop } = renderPage('?lenguaje=rust&taller=wal&parte=explore');

    await user.click(screen.getByRole('button', { name: '← Todos los talleres' }));

    expect(screen.getAllByRole('button', { name: 'Explorar →' })[1]).toHaveFocus();
    expect(scrollToTop).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?lenguaje=rust'));
  });

  it('back falls back to the search box when the session filter hides the workshop', async () => {
    const user = userEvent.setup();
    saveCatalogFilter({ family: 'machine', query: '' });
    renderPage('?lenguaje=rust&taller=wal&parte=explore');

    await user.click(screen.getByRole('button', { name: '← Todos los talleres' }));

    expect(screen.getByRole('searchbox', { name: 'Buscar talleres de sistemas' })).toHaveFocus();
  });

  it('a part change writes the query, focuses its tab and scrolls the tabs to the top', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderPage('?lenguaje=rust&taller=probe&parte=explore');

    await user.click(screen.getByRole('button', { name: 'Programar el núcleo →' }));

    expect(screen.getByRole('button', { name: /Programá su núcleo/ })).toHaveFocus();
    expect(screen.getByRole('button', { name: /Programá su núcleo/ })).toHaveAttribute('aria-pressed', 'true');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?lenguaje=rust&taller=probe&parte=build'),
    );
  });

  it('shows a write made outside the page (FR-018)', async () => {
    renderPage('?lenguaje=rust');
    expect(screen.getByText('0 / 2')).toBeInTheDocument();

    systemsEngine.observe('probe', 'rust', ['touched-a', 'touched-b', 'touched-empty']);
    systemsEngine.answer('probe', 'rust', 1);

    await waitFor(() => expect(screen.getAllByText('2/3 sellos')).toHaveLength(1));
  });
});
```

  Sin `act`: las escrituras de fuera llegan por `useStore` y `waitFor` espera el redibujo.

- **Pasos:**
  1. El rojo, con `test(front): la página de Sistemas, la URL y el foco (en rojo)`.
  2. El verde y los checks.
  3. **Las mutaciones:**
     - sin `flushSync` en `openWorkshop`, «focuses the title» falla, porque la ref sigue en `null`;
     - sin el `useLayoutEffect` del catálogo, falla «going back… focuses»;
     - con `useStore(systemsEngine.changes)`, sin selector, la guarda de ESLint lo rechaza.
  4. `npm run test:unit` entero, `npm run typecheck`, `npm run lint` (ningún aviso en `pages/systems`) y `npm run format:check`.
  5. `node qa/seams-guard-check.ts`: 0 violaciones.
  6. **Commit:** `feat(front): la página de Sistemas con la selección en la URL`.

## 6. El corte (K)

**Cubre:** FR-001, FR-002, FR-017, FR-020 a FR-022, FR-028 a FR-037, FR-041, FR-049 y FR-050; SC-006 y SC-008.

### Tarea 6.1 · El corte, en un solo commit (T024)

- **Cuándo:** con T004 a T023 en la rama y la red en verde.
- **Archivos:**
  - `frontend/src/app/legacy/register-systems.tsx` (nuevo);
  - `frontend/src/app/boot/legacy-views.ts` y `frontend/src/app/main.tsx`;
  - `frontend/systems.js` (se borra) y `frontend/systems.css` (`git mv` a `frontend/src/pages/systems/ui/systems.css`);
  - en `qa/`: `lib/legacy-sources.ts`, `lab-bridge-check.ts`, `boot-check.ts`, `load-order-check.ts` y `content-records-check.ts`;
  - las ramas condicionales (D2 y F8) cuando correspondan.
- **`register-systems.tsx`** (contrato: [contracts/taller-systems.md](./contracts/taller-systems.md)):

```tsx
import { createRoot, type Root } from 'react-dom/client';
import type { Exercise } from '../../entities/exercise';
import { mergeModelGroups } from '../../entities/systems-simulation';
import type { SystemsInitResult, SystemsSyncResult, SystemsWorkshop } from '../../entities/systems-workshop';
import {
  workshopExerciseRole,
  workshopMissionIds,
  workshopReturnTarget,
} from '../../entities/systems-workshop/bridge';
import {
  SystemsPage,
  resetSimulations,
  type SystemsModelRegistry,
  type SystemsWorkshopView,
} from '../../pages/systems';
import { readLinkQuery, workshopReturnHref } from '../../shared/config/url-grammar';
import { stop } from '../../shared/lib/celebration';
import { escapeHtml } from '../../shared/lib/escape-html';
import { UrlStateProvider, startUrlStateSync } from './url-state';

interface SystemsLab {
  getExercises(): Exercise[];
  exportState(): unknown;
}

interface BridgedWorkshop extends SystemsWorkshop {
  title: string;
  related?: Readonly<Record<string, readonly string[]>>;
}

interface SystemsPackage {
  workshops: SystemsWorkshop[];
  models: object;
}

type Toast = (message: string) => void;

interface TallerSystemsAdapter {
  init(): SystemsInitResult;
  refresh(): SystemsSyncResult;
  sync(): SystemsSyncResult;
  mount(host: HTMLElement | null, lang: string, toast: Toast): void;
  unmount(): void;
  returnURL(id: string, lang?: string): string;
  missionIDs(id: string, lang: string): string[];
  exerciseContextHTML(id: string, lang: string): string;
  resetSimulations(): void;
}

declare global {
  interface Window {
    TallerSystems: TallerSystemsAdapter;
  }
}

const engine = window.TallerSystemsEngine;
let models: SystemsModelRegistry = {};
let mountedLanguage = 'rust';
let root: Root | null = null;

function lab(): SystemsLab {
  return window.TallerLab as unknown as SystemsLab;
}

function packages(): SystemsPackage[] {
  const sources: SystemsPackage[] = [
    window.SYSTEMS_PC,
    window.SYSTEMS_LOWLEVEL,
    window.SYSTEMS_INFRA,
    window.SYSTEMS_PLAY,
  ];
  return sources.filter(Boolean);
}

function workshops(): BridgedWorkshop[] {
  return packages().flatMap((source) => source.workshops) as BridgedWorkshop[];
}

function refresh(): SystemsSyncResult {
  return engine.refreshFromLab(lab().exportState());
}

function sync(): SystemsSyncResult {
  return engine.syncLab(lab().exportState());
}

function init(): SystemsInitResult {
  models = mergeModelGroups(packages().map((source) => source.models)) as SystemsModelRegistry;
  return engine.init({ workshops: workshops(), models, exercises: lab().getExercises() });
}

function unmount(): void {
  root?.unmount();
  root = null;
  stop();
}

function mount(host: HTMLElement | null, lang: string, toast: Toast): void {
  unmount();
  if (!host) return;
  const language = lang === 'go' ? 'go' : 'rust';
  mountedLanguage = language;
  startUrlStateSync();
  refresh();
  root = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar Sistemas.', error);
    },
  });
  root.render(
    <UrlStateProvider>
      <SystemsPage
        language={language}
        models={models}
        exercises={lab().getExercises()}
        notify={toast}
        downloadKit={(workshop: SystemsWorkshopView) => window.TallerProjectKit.download(workshop, language)}
        scrollToTop={() => host.scrollIntoView({ block: 'start' })}
      />
    </UrlStateProvider>,
  );
}

function returnURL(id: string, lang: string = mountedLanguage): string {
  return workshopReturnHref(workshopReturnTarget(id, lang));
}

function missionIDs(id: string, lang: string): string[] {
  return workshopMissionIds(
    workshops().find((item) => item.id === id),
    lang,
  );
}

function exerciseContextHTML(id: string, lang: string): string {
  const parent = readLinkQuery(location.search).missionWorkshop;
  const workshop = workshops().find((item) => item.id === parent);
  const role = workshopExerciseRole(workshop, id, lang);
  if (!role || !workshop || parent === null) return '';
  refresh();
  const progress = engine.get(parent, lang);
  return `<div class="quest-lab-context"><a href="${workshopReturnHref(workshopReturnTarget(parent, lang))}">← ${escapeHtml(workshop.title)}</a><span>${role === 'core' ? 'Núcleo del taller' : 'Herramienta previa'}</span><span>${progress.progress.code ? '✓ Núcleo verificado' : 'Tres pruebas para verificar el núcleo'}</span></div>`;
}

window.TallerSystems = {
  init,
  refresh,
  sync,
  mount,
  unmount,
  returnURL,
  missionIDs,
  exerciseContextHTML,
  resetSimulations,
};
```

  `exerciseContextHTML` es la única función que arma HTML, y es igual a la de `systems.js`, porque es el contrato de `lab.js` hasta F7 (FR-031). No se congela `window.TallerSystems` (R8).

- **Los cambios de una línea:**
  - `legacy-views.ts`: `() => import('../../../systems.js'),` pasa a `() => import('../legacy/register-systems'),`, en el mismo lugar.
  - `main.tsx`: `import '../../systems.css';` pasa a `import '../pages/systems/ui/systems.css';`, en el mismo lugar (la última hoja).
  - `git rm frontend/systems.js` y `git mv frontend/systems.css frontend/src/pages/systems/ui/systems.css`.
  - `qa/lib/legacy-sources.ts`: `SYSTEMS_UI_SOURCE = 'frontend/src/app/legacy/register-systems.tsx'`.
  - `qa/lab-bridge-check.ts`: el mensaje `'systems.js no publicó TallerSystems'` pasa a `'el adaptador de Sistemas no publicó TallerSystems'`.
  - `qa/boot-check.ts`: `REACT_VIEWS` suma `'sistemas'`; `LEGACY_SOURCES` pierde `'frontend/systems.js'`.
  - `qa/content-records-check.ts`: `'workshops: category is one that systems.js knows'` pasa a `'workshops: category is one that the Systems page knows'`.
  - `qa/load-order-check.ts`: se agrega `const SYSTEMS_UI = 'frontend/src/app/legacy/register-systems.tsx';`. En `BEFORE_APP_REASONS`, la clave `'frontend/systems.js'` pasa a `[SYSTEMS_UI]`, con la misma razón. La restricción `[SYSTEMS_ENGINE, 'frontend/systems.js', 'systems.js captura …']` pasa a `[SYSTEMS_ENGINE, SYSTEMS_UI, 'el adaptador de Sistemas captura window.TallerSystemsEngine en const engine al evaluarse']`.
- **La rama D2** (si F6 entró antes, `frontend/campaign.js` ya no existe y el usuario aceptó D2):
  - `git rm frontend/src/app/legacy/register-effects.ts`;
  - `legacy-views.ts` pierde `() => import('../legacy/register-effects'),`;
  - `git grep -n "TallerEffects\|register-effects" -- frontend qa tools` no imprime nada.

  `window.TallerEffects` no está en `app-adapters.ts` ni en `dump-globals`, así que ningún check cambia.
- **La rama F8** (si F8 entró antes y el armado de `progress-backup` ya no está en `app.js`):
  - se crea `frontend/src/pages/systems/session.ts` con `export { resetSimulations } from './model/systems-session';`;
  - el paso de sesión del armado de F8 importa `resetSimulations` de `../../pages/systems/session` (desde `frontend/src/app/…`) donde hoy llama a `window.TallerSystems?.resetSimulations()`;
  - `resetSimulations` sale de `window.TallerSystems`, de `APP_ADAPTER_METHODS.TallerSystems` en `qa/lib/app-adapters.ts` y de `RESET_METHODS` en `qa/boot-check.ts`.

  **La correspondencia:** el reinicio lo cubren `systems-session.spec.ts` («resets the simulations and keeps the family and the search») y el E2E de «Borrar todo» de `systems.spec.ts`. La entrada `session.ts` no importa nada con motor, así que un check que empaquete el armado no suma un motor (FR-021).

- **Pasos:**
  1. `git grep -n "data-sys\|sys-" frontend/app.js` no imprime nada (FR-049).
  2. Escribir el adaptador y hacer los cambios de una línea, las ramas que correspondan y un solo commit: `feat(front): Sistemas en React con su adaptador window.TallerSystems`.
  3. `npm run build`, `npm test`, `npm run lint` y `npm run format:check`.
  4. `E2E_PORT=4173 npm run test:e2e`:
     - los 106 de F1 y los 17 de A2;
     - `systems.spec.ts` en verde, sin editar;
     - `systems-react.spec.ts` pasa de rojo a verde;
     - `systems-url.spec.ts`, si existe, también pasa de rojo a verde.
  5. `git diff <base> --stat -- qa/e2e/specs/` muestra sólo los tres archivos nuevos.
  6. Los checks de la compuerta (T025).
- **Vuelta atrás:** `git revert` del commit del corte devuelve la vista legacy. Las piezas de T008 a T023 quedan sin montar y sin efecto.

## 7. La compuerta, las comparaciones y el cierre (K)

**Cubre:** FR-027, FR-033, FR-037, FR-040 a FR-045 y FR-047; SC-001 a SC-010; V1, V2, V4 y V5.

### Tarea 7.1 · La compuerta y las comparaciones únicas (T025)

- **Pasos:**
  1. **La compuerta** de quickstart.md §3.1, contra la línea base de T001:
     - mismos bytes en `build/curriculum.json`, `dump-globals`, el `<style>` y el marcado del dist;
     - `html.length` dentro del subpresupuesto y bajo 1 250 000;
     - los avisos de complejidad de la línea base menos dos;
     - los escenarios de cada check, iguales;
     - los greps de estilos en línea, de `innerHTML` y de `systems.js`.
  2. **El DOM** (V4, FR-043, SC-002; quickstart.md §3.2): 187 estados con 0 diferencias. Las 9 escenas reales con 0 diferencias de atributos (FR-027).
  3. **El barrido de estilo computado ampliado** (FR-044, SC-003; quickstart.md §3.3): 23 páginas a 6 anchos, con y sin movimiento reducido. 276 capturas con 0 diferencias.
  4. **V2, la CSP** (quickstart.md §3.4): en la rama, 0 violaciones con muestra `14271f` y el fondo calculado en `rgb(20, 39, 31)`. En la base, 1 o más violaciones: es el control negativo.
  5. **V5:** el tiempo de `npm run test:e2e -- --workers=1` antes (T001) y después.
  6. **Las mutaciones** de quickstart.md §4: cada una hace fallar la prueba que la nombra.
  7. Con permiso, `docker compose build taller`.
  8. Un commit de documentación que agrega a research.md la sección «Resultados de la compuerta», con las cantidades.
- **Compuerta:** cada número de los pasos 1 a 5. Con una sola casilla en rojo no se abre el PR.

### Tarea 7.2 · La documentación y el PR (T026)

- **La documentación,** en el mismo PR (FR-037):
  - `AGENTS.md`: la lista de vistas legacy pierde `systems.js`; Sistemas es la segunda vista migrada;
  - `README.md`: el párrafo de Sistemas nombra `pages/systems` y su adaptador;
  - `docs/architecture.md`, en el mapa de archivos:
    - la fila «Interfaz de Sistemas» pasa a `frontend/src/pages/systems/` (`ui` y `model`), con el adaptador `frontend/src/app/legacy/register-systems.tsx` y la hoja `pages/systems/ui/systems.css`;
    - la fila de la gramática deja de nombrar `systems.js`;
    - el estado de FSD suma `pages/systems`;
    - se agrega `url-state.tsx` si lo trajo F5;
  - `qa/AGENTS.md`:
    - la fila «Catálogo, sellos o progreso de Sistemas» suma las specs de la página y los E2E de Sistemas;
    - `runSourceGroup` entra en la descripción de `qa/lib/sources.ts`;
    - la pila de componentes, si la trajo F5;
  - la enmienda del ADR 0008 (los dos proyectos y el setup), si F5 trajo el arnés.
- **El PR:**
  - **Título:** `feat(systems): port the Systems view to React`.
  - **Descripción,** en inglés:
    - el contexto;
    - qué cambia y por qué;
    - la tabla de los nueve métodos de `window.TallerSystems`, con quién los llama y qué ítem los retira (contrato; FR-033), verificada contra el código de ese momento;
    - la correspondencia de los checks (research.md, R9; FR-041);
    - el único `style={` (`SceneView.tsx`), declarado ante el grep de estilos en línea (FR-025);
    - las cuatro conductas de C2 y las cuatro regiones vivas de X2;
    - las diferencias de nuqs aceptadas en D1;
    - las medidas: tamaño, nuqs y `useStore`, avisos, tiempo de los E2E, el DOM, las escenas, el barrido y la CSP;
    - lo que queda pendiente: la comprobación con lector de pantalla de X2 y los retiros de F7, F8 y F10.
  - **El cierre:** el trailer de Claude Code que fija la conversación.

## Integración con F3, F6 y F8

Cada fila es una rama de una tarea: T001 detecta el caso y la tarea dueña hace lo suyo (research.md, R13).

| Pieza | F5 entra antes | F5 entra después | Tarea |
| --- | --- | --- | --- |
| nuqs, su aviso y `url-state.tsx` (F3) | Los instala y los crea | Los reusa. Si el módulo de F3 activa la sincronización al evaluar, `boot-check` falla y K se lo informa a F3 | T002, T008 |
| El arnés de componentes y fishery | Los instala | Los reusa | T002, T007 |
| `runSourceGroup` (F6) | La agrega y F6 la reusa para campaña | Usa la de F6 si existe; si no, la agrega | T009 |
| `REACT_VIEWS` de `boot-check` (F3, F4, F6 y F9) | Lo crea | Suma `'sistemas'` | T010, T024 |
| `register-effects.ts` (F6) | Se queda: `campaign.js` lo lee | Lo retira si el usuario acepta D2 | T024 |
| `startApp()` y el `INITIALIZERS` de `boot-check` (F6) | Sin cambios | Sin cambios: `TallerSystems.init` sigue después de lo que inicialice campaña | T024 (verificación) |
| `qa/lib/app-adapters.ts` (F6 y F8) | Sin cambios | Sin cambios, salvo la rama F8 | T024 |
| `resetSimulations` (F8) | Lo publica el adaptador | Rama F8 de T024 | T024 |
| `lab-bridge-check` y `legacy-sources.ts` (F6) | Cambia la mitad de Sistemas | Rebasa sobre los cambios de F6 en la mitad de campaña | T009, T024 |

## Complexity Tracking

| Decisión | Por qué hace falta | Alternativa más simple descartada |
| --- | --- | --- |
| `runSourceGroup` en `qa/lib/sources.ts` | `lab-bridge-check` terminaría con dos motores si cargara el motor y el adaptador por separado (FR-021); además, `bundleSource` no empaqueta TSX con React | Partir el adaptador o relajar R4 (research.md, R1) |
| `ModelTable` y `ModelTrace` como componentes aparte | La plantilla del modelo daba 11 de complejidad; junta da 11 otra vez; separada, cada parte queda en 3 o menos y cada una lleva una conducta de C2 | Dejarla junta con una justificación en la revisión |
