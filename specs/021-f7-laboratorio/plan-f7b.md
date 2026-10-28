# Implementation Plan: F7b · La vista del laboratorio

**Branch**: `021-f7-laboratorio` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F7, en su parte b (P2): los 52 requisitos con la marca *(F7b)*, *(F7a y F7b)* o partidos. Decisiones y mediciones: [research-f7b.md](./research-f7b.md). Interfaces públicas: [contracts/lab-page.md](./contracts/lab-page.md). Validación: [quickstart-f7b.md](./quickstart-f7b.md). Tareas: [tasks-f7b.md](./tasks-f7b.md). F7a va en `plan.md` y su puerto en `contracts/run-exercise.md`, que este plan no toca.

**Objetivo.** Reemplazar `lab.js`, `lab-explorers.js` y `quest-explorers.js` por una página de React en `pages/lab` que el alumno no distinga de hoy, salvo lo que decidió X1, y retirar con ellos sus hojas, sus globals y el HTML que los adaptadores de campaña y de Sistemas armaban para el laboratorio.

**Arquitectura.**

- **La raíz de composición se parte en dos módulos** (research-f7b.md, R1):
  - `app/legacy/lab-api.ts`, sin React: el almacén, el runner de F7a y la sesión entre montajes;
  - `app/legacy/register-lab.tsx`: monta la página.
- **La página** compone los puentes de F2b con los motores que importa de sus slices, y recibe por props el catálogo, los talleres, el runner, el constructor del programa y el aviso.
- **Lo que guarda** lo escribe en los manejadores, nunca al dibujar.
- **El editor** es un hook sobre CodeMirror 6, con un callback de cambio.

**Stack.** TypeScript y React 19.2.8 sobre Vite 8.3.2, Zustand 5.0.15 (`useStore`), CodeMirror 6 (`@codemirror/view` 6.43.13 y `@codemirror/state` 6.7.6), Vitest 5.0.3 con los proyectos `node` y `jsdom` y Testing Library (el arnés que traen F3, F5 o F6), y `@playwright/test` 1.63.0. Ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Reglas para todos los agentes», la sección 0 («Línea base y compuerta») y la sección de tu dueño. `tasks-f7b.md` tiene una línea por tarea (T018 a T030) y remite acá. La numeración sigue la de F7a (T001 a T017).
> - **El código del plan corrió.** Todo lo que trae este plan corrió en un prototipo (research-f7b.md, «Cómo se verificó»): la página, el adaptador, los checks, los 193 E2E (los 184 de hoy sin editar y 9 nuevos), las comparaciones únicas y `npm test`. **No corrieron** las specs de componente (el arnés no estaba instalado), los diffs sobre los archivos de F5 y F6 (no existen todavía) ni la rama B de C4.
> - **Los valores esperados salen del contrato:** los textos de hoy, el contenido de `content/` y las fixtures congeladas. Si un E2E de hoy falla con la página, el error está en la página: no se edita el E2E.
> - **La base de implementación** es `master` con F7a, F5 y F6 integradas. Si algún número de esta sección difiere en la base, T018 lo vuelve a medir y manda lo medido.

## Summary

F7b es la segunda parte de F7 (P2): la vista. Porta a React el mapa, el ejercicio en sus tres fases, el bloqueo de campaña, los nueve exploradores y el editor, sobre lo que dejó F7a (`features/run-exercise`, las reglas de `entities/exercise` y los selectores del mapa). Después borra el legacy del laboratorio.

El enfoque:

- **Un PR, cuatro unidades con su compuerta, en este orden:**
  - **U1, la red que falta:** dos E2E del foco de los exploradores que sólo veía `quest-explorers-check`, en verde contra el legacy, y dos métodos del Page Object;
  - **U2, las piezas sin montar:** el modelo de la página, el hook del editor y los componentes, cada uno con sus specs, sin que nadie los importe todavía;
  - **U3, el corte:** los 7 E2E de X1 en un commit en rojo y después un solo commit que monta la página y borra el legacy;
  - **U4, las comparaciones únicas y el cierre:** el DOM, las trazas de los exploradores, el barrido de estilo computado, el peso, la documentación y el PR.

  U1 y U2 corren a la vez. U3 espera a las dos, y U4 a U3.
- **X1 sale por construcción** (R6): React conserva los nodos que no cambian, así que los paneles quedan como los dejó el alumno y el foco se queda en el botón pulsado. La página no reproduce ningún redibujo completo.
- **Un nodo de texto donde hoy hay uno** (R7): JSX parte el texto en cada expresión y el navegador pierde el kerning entre los nodos. La página arma plantillas, y el barrido lo vigila.
- **El laboratorio no lee `window`** salvo en su raíz. Los adaptadores de campaña y de Sistemas dejan de armar HTML para él: `campaign-bridges.ts` se retira y `window.TallerSystems` queda con cinco métodos (R11).
- **Lo que no cambia:** ningún texto, ningún ID, ninguna URL, ninguna escritura (cuántas y qué) y ningún estilo computado. Los 184 E2E de hoy pasan sin editarse.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`. Node 24.21.0, Vite 8.3.2, React 19.2.8, Zustand 5.0.15, Vitest 5.0.3 y `@playwright/test` 1.63.0.

**Primary Dependencies**: ninguna nueva (FR-003). Las specs de componente usan el arnés que trae el primero de F3, F5 o F6 en llegar (jsdom 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1, según el plan de F6, T002). Si no está, F7b pide el permiso con esa misma tabla (T018).

**Storage**: `taller-laboratorio-v1`, sin cambios de formato. Cada acción escribe lo mismo y la misma cantidad de veces que hoy (FR-016).

**Testing**:

- **Vitest, proyecto `node`:** las specs del modelo de la página (sesión, puentes, estado del filtro, entrada al laboratorio y el `<pre>`);
- **Vitest, proyecto `jsdom`:** las specs de componente con Testing Library (las regiones vivas, el diálogo, los escenarios que salen de `lab-state-check` y el escape);
- **Playwright:** los 184 E2E de hoy sin editar y 9 nuevos;
- **los checks de `qa/`;**
- **las comparaciones únicas** de quickstart-f7b.md §3.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web; port de una vista legacy a React.

**Performance Goals**: ninguno. Se informan el tamaño del HTML y el tiempo de los E2E.

**Constraints**: ver «Restricciones globales».

**Scale/Scope**:

- **Archivos de producción nuevos, 46:**
  - 12 de modelo y librería en `pages/lab`, con `composition.ts`;
  - 29 componentes y una hoja en `pages/lab/ui`;
  - 2 del editor (`create-code-editor.ts` y `use-code-editor.ts`);
  - 2 del adaptador (`lab-api.ts` y `register-lab.tsx`).
- **Specs nuevas, 14:** 5 de modelo y 9 de componente.
- **E2E:** 2 archivos nuevos.
- **Se mudan:** `lab.css` y `quest-explorers.css`.
- **Se borran, 8:** `lab.js`, `lab-explorers.js`, `quest-explorers.js`, `register-editor.ts`, `mount-code-editor.ts`, `campaign-bridges.ts` (F6), `lab-bridge-check.ts` y `quest-explorers-check.ts`.
- **Cambian:**
  - 7 de producción: `legacy-views.ts`, `main.tsx`, `register-project-kit.ts`, el índice de `pages/lab`, el de `shared/ui/code-editor`, `register-systems.tsx` (F5) y `register-campaign.tsx` (F6);
  - 7 de `qa/` y el Page Object, más los archivos de F5 y F6 que arrastra el retiro (T027).

### Restricciones globales

Valores exactos, de la spec, de la constitución y de la base:

- **La red sin editar:**
  - los 106 E2E de F1 y los 17 de A2 (FR-002);
  - los 61 de F7a (FR-001): `git diff <base> -- qa/e2e/specs/` sólo muestra los dos archivos nuevos;
  - el Page Object y los dobles sólo suman métodos, y `.quest-lab-context` sigue siendo la clase del bloque de contexto.
- **Las clases y los ids que usan esos E2E** se conservan: `.lab-metrics`, `.lab-stamp`, `.lab-intro .eyebrow`, `.lab-continue`, `#lab-filter-status`, `.challenge-node`, `.lab-empty h2`, `.lab-storage-warning`, `#lab-prediction-feedback`, `#lab-editor-status`, `#lab-live-hint`, `.hint-item`, `.test-case summary`, `#lab-reflect-status`, `#lab-reflection-status`, `.lab-explorer`, `details.qx-history`, `.qx-verdict`, `.quest-lab-context`, `.quest-direct-lock`, `.lab-spinner`, `.quest-banner` y `#lab-confirm-dialog`. Los nombres accesibles también: «Editor de código Rust» y «Go», «Revisión del ejercicio» y «Explorador conceptual interactivo».
- **El HTML:** `dist/index.html` queda bajo `BOOT_SIZE_LIMIT` de `qa/build-check`, **1 250 000 caracteres**, con la forma de A2. El aumento sobre T018 no pasa de **+17 000** (el prototipo midió +15 581). El tamaño antes y después va en el PR (FR-004, R12).
- **Nada nuevo:**
  - ninguna dependencia de ejecución;
  - ningún `style=`, `setAttribute('style', …)`, `style.cssText` ni prop `style` en `pages/lab`, `features/run-exercise` ni el adaptador (FR-003, SC-011);
  - ningún global nuevo.
- **Los estilos en línea que salen:** los dos `style=` de la reflexión y el `cssText` de la copia pasan a tres reglas de `pages/lab/ui/lab-page.css`, con el mismo estilo computado.
- **La complejidad:** el total de `npm run lint` no sube. Salen los 13 avisos de los tres archivos legacy (32 a 19 en el prototipo) y ninguna función nueva pasa de 10 (FR-005).
- **El formato guardado no cambia:** la clave, `version: 1`, los nombres y los topes (30 000, 10 000 y 3 000; 12 000 y 18 000). Las tres fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar (FR-018).
- **Los textos visibles** son los de hoy, carácter por carácter, y **un nodo de texto donde hoy hay uno** (R7).
- **Lo que no se toca:**
  - `frontend/app.js` y `frontend/src/index.html`;
  - `content/` y las entidades y la feature de F7a, salvo lo que dice cada tarea;
  - `package.json` y el lockfile;
  - los 61 E2E de F7a.
- **El código y las pruebas, en inglés; los textos, en español,** y sin comentarios: sólo los de referencia puntual que trae el plan.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules. Feature-Sliced Design: `pages/lab` suma `ui` y `lib`, y una segunda entrada sin vista (`composition.ts`). Zustand con `useStore` y selectores chicos. Un archivo por componente principal, con `export default` al final. `useEffect` sólo para la URL y `useLayoutEffect` para el editor y el diálogo, que son sincronización externa |
| II. TDD y pruebas útiles | Sí | El modelo y los componentes abren con su spec en rojo. Los E2E de X1 entran en rojo contra el legacy antes del corte. Los demás E2E son la red, en verde antes y después. Los valores esperados salen de los textos de hoy y del contenido |
| III. Código entendible | Sí | Ninguna función nueva pasa de 10. La página se parte por región (mapa, ejercicio, fases y exploradores), y las reglas de la sesión y de los puentes son funciones puras con nombre |
| IV. Contenido en Git, IDs estables | Sí | `content/` no cambia. Las misiones de proyecto y los recursos de práctica pasan a constantes del slice, con los mismos textos (D6) |
| V. Capas y contratos explícitos | Sí | La vista no importa ningún adaptador ni lee `window`. La raíz de composición vive en `app/legacy`, y el índice de `entities/exercise` tiene un solo dueño. Ninguna entidad importa a otra. No se crean capas ni stores por anticipado |
| VI. Español, accesibilidad y portabilidad | Sí | Los mismos textos, teclado, foco y regiones vivas, con los cambios de X1 y X2. Movimiento reducido por las hojas de hoy, sin animaciones nuevas |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las comparaciones corren fuera del repositorio. Ninguna salida nueva en Git |
| VIII. Flow-forward | Sí | `tasks-f7b.md` tiene una línea por tarea y, como mucho, su evidencia. Ni `plan.md`, ni `tasks.md`, ni el contrato de F7a cambian |

## Decisiones del usuario (clarify del 2026-10-28) y de la spec

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **P2:** F7 se parte en F7a y F7b | Este plan es F7b: 52 requisitos | Todo el plan |
| **F7-Q1:** se conserva `solvedAt` | La página usa `isSolved` de F7a. Lo fijan los E2E de F7a sobre `rust-09` | T024 |
| **Q3 (X1 con C2):** el comportamiento de React | Los paneles quedan como los dejó el alumno, «Otra pista» no cierra la solución, el foco queda en el botón pulsado y el estado del filtro dice «para tu búsqueda» siempre que hay una búsqueda. Las rarezas de lógica se conservan | T024 y T026 (R6) |
| **X2:** regiones vivas montadas | `#lab-review`, `#lab-prediction-feedback`, `#lab-filter-status`, `#lab-reflect-status`, `.explorer-explanation` y la región del explorador de misión conservan su nodo. Lo fijan las specs de componente, y el usuario lo comprueba con lector de pantalla | T023, T024 y T030 |
| **F9-Q4 (D3):** el diálogo con un portal a `<body>` que se cierra al navegar | `ConfirmDialog`, dentro de `CodePhase` | T024 (R8) |
| **Ruling C4:** si A4 entró antes, F7b porta lo que A4 dibujó en `lab.js` | Dos ramas: la A sin A4 y la B con A4 (T025). T018 decide con un predicado | T018 y T025 (R13) |
| **D1:** el registro vacío al mostrar un ejercicio | Se crea en `enterLab` y en `openExercise`, después de guardar y sólo sin bloqueo | T021 y T024 (R5) |
| **D2 y D5:** se retiran el `textarea` de respaldo y `TallerEditor` | `useCodeEditor` reemplaza a `mountCodeEditor`; salen `register-editor.ts` y `mount-code-editor.ts` | T022 y T027 (R4) |
| **D4:** las hojas sin editar en `pages/lab/ui/` | `git mv` y las mismas líneas de `main.tsx`; las tres reglas nuevas van en `lab-page.css` | T024 y T027 (R9) |
| **D6:** las misiones de proyecto y los recursos como constantes | `pages/lab/model/practice-content.ts` | T021 |

## Project Structure

### Documentation (this feature)

```text
specs/021-f7-laboratorio/
├── spec.md                       # F7 entera; F7b no la cambia
├── plan.md, research.md, quickstart.md, tasks.md, contracts/run-exercise.md   # F7a; no se tocan
├── plan-f7b.md                   # este archivo
├── research-f7b.md               # decisiones R1 a R16, Context7 y mediciones
├── quickstart-f7b.md             # cómo se verifica F7b y las comparaciones únicas
├── contracts/lab-page.md         # TallerLab después de F7b, la página, la sesión y el hook
└── tasks-f7b.md                  # T018 a T030
```

### Source Code (repository root)

```text
frontend/
├── lab.js, lab-explorers.js, quest-explorers.js        (W) se borran
├── lab.css, quest-explorers.css                         (W) git mv a src/pages/lab/ui/
└── src/
    ├── app/
    │   ├── main.tsx                                     (W) las hojas del laboratorio, en su lugar
    │   ├── boot/legacy-views.ts                         (W) register-lab en el lugar de lab.js
    │   └── legacy/
    │       ├── lab-api.ts                               (W) nuevo: almacén, runner, sesión y los 8 métodos
    │       ├── register-lab.tsx                         (W) nuevo: mount, unmount y window.TallerLab
    │       ├── register-editor.ts                       (W) se borra
    │       ├── register-project-kit.ts                  (W) getExercises() devuelve readonly
    │       ├── register-systems.tsx                     (W) F5: salen 4 métodos
    │       ├── register-campaign.tsx                    (W) F6: suma refresh y sync
    │       └── campaign-bridges.ts                      (W) F6: se borra
    ├── shared/ui/code-editor/
    │   ├── create-code-editor.ts                        (C) nuevo: createCodeEditor y replaceText anotado
    │   ├── use-code-editor.ts                           (C) nuevo: el hook
    │   ├── index.ts                                     (C, W) exporta el hook
    │   └── mount-code-editor.ts                         (W) se borra
    └── pages/lab/
        ├── index.ts                                     (P) LabPage, enterLab y LabWorkshop
        ├── composition.ts                               (M) nuevo: la entrada sin vista para lab-api.ts
        ├── lib/browser.ts + spec, lib/copy-text.ts      (M)
        ├── model/                                       (M) types, lab-session + spec, mission-bridges + spec,
        │                                                    mission-engines, enter-lab + spec, lab-url,
        │                                                    map-stats + spec, record-view, practice-content
        └── ui/                                          (P) LabPage, CampaignLock, map/, exercise/, explorers/,
                                                             lab-page.css y 9 specs de componente
qa/
├── e2e/pages/lab.ts                                     (E) suma panel() y panelToggle()
├── e2e/specs/lab-explorer-focus.spec.ts                 (E) nuevo: 2 E2E
├── e2e/specs/lab-react.spec.ts                          (E) nuevo: 7 E2E de X1
├── lab-state-check.ts                                   (W) sin DOM falso: 39 → 33
├── lab-bridge-check.ts, quest-explorers-check.ts        (W) se retiran
├── boot-check.ts, load-order-check.ts, run-checks.ts    (W)
└── lib/legacy-sources.ts, lib/seams-guard.ts, seams-guard-check.ts   (W)
docs/architecture.md, qa/AGENTS.md, AGENTS.md            (K)
```

**Structure Decision:**

- **La página vive en `pages/lab`,** con `model`, `lib` y `ui`. `ui` se parte en `map/`, `exercise/` y `explorers/` porque son tres regiones con muchos componentes; no hay barrels.
- **`composition.ts` es una segunda entrada del slice,** sin vista y sin motores, como `bridge.ts` en las entidades de F2b y el `session.ts` que prevé F5 para Sistemas. La usa sólo `lab-api.ts`.
- **No se crean `features` ni `widgets`:** la sesión, el diálogo y los exploradores son de una sola página.

## Review Focus

Lo que el revisor mira primero:

- **Los 184 E2E de hoy, sin editar.** `git diff <base> -- qa/e2e/specs qa/e2e/fixtures qa/e2e/lib` sólo agrega dos archivos, y `qa/e2e/pages/lab.ts` sólo suma dos métodos.
- **Las escrituras:** ninguna en el dibujo. El registro vacío sale de `enterLab` y de `openExercise`, después del guardado de la selección. `replaceText` no escribe. `refreshFromLab` nunca escribe.
- **X1 sin redibujos:** ningún `key` que cambie sin motivo. `open` sólo en el caso propio (una vez) y en los casos de prueba. `flushSync` antes de mover el foco.
- **Los nodos de texto:** cada texto que hoy es un nodo es una plantilla, sin `{' '}` partiendo una frase (R7).
- **La raíz partida:** `lab-api.ts` no importa React, la página ni un índice de motor. `register-lab.tsx` es el único que importa `pages/lab`. `window.TallerLab` no se congela, porque `boot-check` espía `init`.
- **Lo retirado:** `grep` en 0 para los tres archivos, las dos hojas en `frontend/`, los cuatro globals y los métodos de HTML de los adaptadores (quickstart-f7b.md §2).
- **Complejidad y tamaño:** el total de avisos no sube, y el HTML crece hasta +17 000 y queda bajo 1 250 000.

**Lo que la spec implica y ninguna prueba de hoy ejercita**, cada caso con la tarea que suma su prueba:

1. **Un texto partido en varios nodos** cambia el ancho en fracciones de píxel, porque el navegador no aplica el kerning entre nodos (FR-064 y FR-065). Ningún E2E mide anchos. Lo fija el barrido de estilo computado (T028), con 784 diferencias en el control negativo del prototipo, y la regla de T024.
2. **Una salida del compilador con el error vacío** empieza con un salto de línea: hoy el analizador de HTML lo descarta, y React no (FR-029). Lo fijan la spec de `preformatted` (T020) y el barrido en el estado `code-passed` (T028).
3. **El reemplazo del texto del editor** por «Restaurar inicio» o «Cargarla y experimentar» dispararía `onChange` y guardaría dos veces (FR-016 y FR-041). Lo fijan la spec de `CodePhase` (T023: `save` una vez y `replaceText` llamado) y los E2E de F7a que cuentan las escrituras.
4. **Evaluar el adaptador solo** junto con `register-campaign-engine.ts` traería un segundo motor o un segundo almacén (FR-014, riesgo 12). Lo fijan `lab-state-check` («lab-api.ts bundles the lab store once and no engine or route store») y `boot-check`, que evalúa `lab-api.ts` y `register-lab.tsx` solos (T027).
5. **«Siguiente» hasta una misión bloqueada** dentro de la lista de un mundo no debe crear el registro vacío, porque hoy el bloqueo no dibuja el ejercicio (D1 y FR-017). Lo fija `enter-lab.spec.ts` («creates no record on the map nor behind a campaign lock», T020).

## Reparto en paralelo

- **Los dueños E, M, C, P y W** son slices para el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»): se les dan sus archivos, el código de este plan y sus checks, y se les dice que no dejen comentarios.
- **K, el coordinador,** es el agente principal: hace la línea base, las comparaciones, la documentación y la compuerta, y revisa cada diff.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T018: la línea base y los predicados |
| 1 | E, M y C a la vez | **E:** T019 (la red que falta). **M:** T020 y T021 (el modelo). **C:** T022 (el editor) |
| 2 | P | T023 y T024 (los componentes), sobre la rama con T021 y T022 integradas; T025 sólo en la rama B |
| 3 | E y W | **E:** T026 (los E2E de X1, en rojo). **W:** T027 (el corte) |
| 4 | K | T028 (las comparaciones), T029 (la documentación) y T030 (la compuerta y el PR) |

**Dueños, archivos e interfaces:**

| Dueño | Unidad | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- | --- |
| K · Coordinador | todas | `docs/architecture.md`, `qa/AGENTS.md`, `AGENTS.md` y `specs/**`; abre el PR y corre las compuertas | todo | la línea base, las comparaciones y el cierre |
| E · Red | U1 y U3 | `qa/e2e/pages/lab.ts`, `qa/e2e/specs/lab-explorer-focus.spec.ts` y `qa/e2e/specs/lab-react.spec.ts` | el build del legacy | 9 E2E |
| M · Modelo | U2 | `frontend/src/pages/lab/composition.ts`, `pages/lab/lib/**` y `pages/lab/model/**`, salvo `map-selectors*` (F7a) | F7a: `map-selectors`, `entities/exercise`; F2b: los puentes y la gramática | las funciones de §2.0 |
| C · Editor | U2 | `frontend/src/shared/ui/code-editor/create-code-editor.ts`, `use-code-editor.ts` e `index.ts` | — | `useCodeEditor` y `createCodeEditor` |
| P · Página | U2 | `frontend/src/pages/lab/ui/**` e `index.ts` | de M y de C, todo; de F7a, `features/run-exercise` | `LabPage` |
| W · Corte | U3 | `frontend/src/app/**` (salvo lo de otros), los legacy que se borran, las hojas, los adaptadores de F5 y F6 y `qa/` (salvo `qa/e2e`) | todo lo anterior | la página montada y el legacy retirado |

**Puertos de los E2E:** K `E2E_PORT=4173`, E `4281` y W `4284`. Las comparaciones usan 4501 y 4502.

### Lo que F7b comparte con F8, F10 y A4

| Archivo | F7b | Los otros | Conflicto esperado |
| --- | --- | --- | --- |
| `frontend/src/app/boot/legacy-views.ts` | Borra tres líneas y cambia la de `lab.js` | F8 y F10 cambian las suyas | Líneas distintas: se resuelve a mano |
| `frontend/src/app/main.tsx` | Cambia las dos hojas del laboratorio y suma `lab-page.css` | F10 lo reescribe | El que llega después rebasa |
| `frontend/app.js` | No lo toca | F8 y F10 lo editan | Ninguno |
| `lab-api.ts` | Lo crea, con las dos líneas del transporte | A4 cambia esas dos líneas si entra después de F7b | Ninguno: el archivo es el lugar previsto |
| `qa/lab-state-check.ts` y `qa/lib/legacy-sources.ts` | Los edita | F8 puede tocar los escenarios de «Borrar todo» | El que llega después rebasa |

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (los requisitos *(F7b)* y «El laboratorio de hoy»), [research-f7b.md](./research-f7b.md), [contracts/lab-page.md](./contracts/lab-page.md) y tu sección;
  - el contrato de F7a, `contracts/run-exercise.md`;
  - las skills `tdd`, `clean-code`, `vercel-react-best-practices`, `react-testing` y, para E, `playwright-best-practices`.
- **TDD, siempre:**
  - cada módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, y cada componente con un stub que lanza, para que su spec falle por comportamiento y no por un import;
  - la spec en rojo y la implementación van en commits separados; el commit rojo no pasa `npm test`, y el PR entero sí;
  - los E2E de U1 pasan contra el legacy desde el primer intento: son red. Los de X1 (T026) entran en rojo contra el legacy, y cada uno falla por la razón de X1, nunca por un localizador.
- **Portar no reescribe:**
  - los textos, las clases, los ids, los `aria-*` y el orden de los elementos son los de `lab.js`, `lab-explorers.js` y `quest-explorers.js` en la base;
  - las rarezas de lógica se conservan (la spec, «Rarezas que el port conserva»);
  - salen sólo los atributos `data-*` de delegación, que ninguna hoja ni ningún E2E usa.
- **Un nodo de texto donde hoy hay uno.** Si el legacy escribe `${a}/${b} pistas` dentro de un elemento, la página escribe `` {`${a}/${b} pistas`} ``. Nunca `{a}/{b}`, ni una frase partida con `{' '}`. Un `{' '}` solo entre dos elementos está bien, porque hoy también es un nodo.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo a K.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>` y `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - `npm run build` y `E2E_PORT=<tu puerto> npm run test:e2e -- <archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo:**
  - el código, los nombres de test y los comentarios, en inglés; los textos que lee el alumno, en español y con el texto exacto de hoy;
  - **sin comentarios,** salvo los de referencia puntual que trae el código del plan;
  - `interface` para las formas de objetos; en los archivos de componentes y hooks, `const Nombre = …` y `export default Nombre` al final; exports nombrados en los módulos de varias funciones;
  - ningún `style=`, `setAttribute('style', …)`, `style.cssText` ni prop `style`.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(e2e): …` para la red y para los E2E de X1;
  - `test(front): …` para una spec en rojo;
  - `feat(front): …` para la página y el corte;
  - `test(qa): …` y `refactor(qa): …` para los checks.
- **Al terminar,** informá las tareas cerradas, los comandos con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base y compuerta (coordinador K)

**Cubre:** FR-002, FR-004, FR-005 y FR-006; SC-001, SC-008 y SC-009.

### Tarea 0.1 · La línea base y los predicados (T018)

- **Quién y cuándo:** K, sobre la base de implementación (`master` con F7a, F5 y F6), antes de cualquier cambio.
- **Entrega:** un commit de documentación que agrega a [research-f7b.md](./research-f7b.md) la sección «Línea base de la implementación», con el hash, la fecha, los valores de [quickstart-f7b.md](./quickstart-f7b.md) §1 y el resultado de los predicados.
- **Pasos:**
  1. **El orden de integración.** `git log --oneline` muestra F7a, F5 y F6 en `master`. Si falta alguno, F7b no empieza.
  2. **El arnés de componentes.** `node -e "require.resolve('jsdom')"` resuelve, `frontend/vitest.config.ts` tiene los proyectos `node` (`*.spec.ts`) y `jsdom` (`*.spec.tsx`) y existe el setup con jest-dom y `cleanup`. Si falta, K pide el permiso al usuario con la tabla del plan de F6 (T002: nombre, versión, origen, peso y licencia de cada paquete) y lo instala en un commit propio antes de T023.
  3. **La rama de C4.** `grep -c "createPlaygroundTransport\|buildPlaygroundProgram" frontend/lab.js` da 2 en la rama A. Si da 0, A4 ya cambió la raíz y es la rama B: corre T025, y T027 toma las dos líneas de A4.
  4. **Lo que dejaron F5 y F6.**
     - `frontend/src/app/legacy/register-systems.tsx` publica nueve métodos;
     - `frontend/src/app/legacy/campaign-bridges.ts` existe;
     - `window.TallerCampaign` tiene siete métodos (el escenario de `boot-check` que suma F6).

     Si alguno difiere, se anota y T027 aplica la misma intención sobre lo que haya.
  5. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde. Si algo falla, F7b no empieza.
  6. Anotar lo de quickstart-f7b.md §1:
     - los avisos (total y los de los tres archivos);
     - los E2E (184, o lo que haya si entró algo más);
     - los checks y las pruebas de Vitest;
     - los escenarios de `lab-state-check`;
     - `html.length` del dist.
- **Compuerta:** los pasos 1 a 6, con los valores anotados.
- **Vuelta atrás:** revertí el commit.

### 0.2 · La compuerta de cada unidad

La corre el dueño al cerrar su última tarea, y K antes del PR (T030). Una unidad no se integra con una casilla en rojo.

| Comprobación | U1 | U2 | U3 | U4 |
| --- | --- | --- | --- | --- |
| `npm run typecheck`, `npm run lint` (sin errores, total ≤ base) y `npm run format:check` | sí | sí | sí | sí |
| `npm run test:unit` | — | sí | sí | sí |
| `npm test` | sí | sí | sí | sí |
| `npm run build` y los E2E de hoy (184) | sí | sí | sí | sí |
| Los E2E nuevos | sí: los 2 de T019 contra el legacy | — | sí: los 7 de T026 en rojo contra el legacy y en verde después del corte | sí |
| `git diff --check` | sí | sí | sí | sí |
| `git diff <base> --stat -- frontend/lab.js` | vacío | vacío | borrado | borrado |

## 1. Unidad 1 · La red que falta (dueño E, onda 1)

**Cubre:** la parte de F7b de FR-001, FR-060, FR-061 y FR-063 (las cinco aserciones que sólo veía `quest-explorers-check`); SC-010 (el destino del foco de los exploradores de misión).

**Entrega:** dos métodos del Page Object y dos E2E, en verde contra el legacy. La página los tiene que pasar sin editarlos.

### Tarea 1.1 · El Page Object y el foco del paquete (T019, E)

- **Cambia:** `qa/e2e/pages/lab.ts`, que suma `panel(summary)` y `panelToggle(summary)`. Un `details` no tiene nombre accesible, así que su `summary` es su contrato (ADR 0008); el panel del razonamiento de «Explicá» hoy no tiene clase.

```diff
diff --git a/qa/e2e/pages/lab.ts b/qa/e2e/pages/lab.ts
index b5e6962..cbddbe7 100644
--- a/qa/e2e/pages/lab.ts
+++ b/qa/e2e/pages/lab.ts
@@ -307,4 +307,16 @@ export class LabPage {
   explorerSelect(label: string): Locator {
     return this.page.getByRole('combobox', { name: startsWith(label) });
   }
+
+  // A folding panel has no accessible name: its summary text is its contract (ADR 0008).
+  panel(summary: string): Locator {
+    return this.page
+      .locator('details')
+      .filter({ has: this.page.getByText(summary, { exact: true }) })
+      .last();
+  }
+
+  panelToggle(summary: string): Locator {
+    return this.page.getByText(summary, { exact: true });
+  }
 }
```

- **Crea:** `qa/e2e/specs/lab-explorer-focus.spec.ts`. Son las aserciones de foco del paquete de Go que sólo veía `quest-explorers-check` («Size control resets corruptions and retains focus» y «Packet reset restores an accepted packet»). La del robot ya la cubre un E2E de F7a.

`qa/e2e/specs/lab-explorer-focus.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

// The focus of the packet controls that only quest-explorers-check saw (spec 021, FR-063).
test.describe('the packet explorer (go-106)', () => {
  test('a payload size clears the alterations and keeps the focus on its button', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('go-106', 'learn'));
    await lab.explorerButton('Alternar b0 del primer byte').click();

    await lab.explorerButton('260 bytes').click();

    await expect(lab.packetVerdict()).toContainText(
      'Pasa las comprobaciones representadas en este modelo.',
    );
    await expect(lab.questExplorer()).toContainText('01 04');
    await expect(lab.explorerButton('260 bytes')).toBeFocused();
  });

  test('«Restaurar paquete» leaves a valid packet and keeps the focus on its button', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('go-106', 'learn'));
    await lab.explorerButton('Alternar b0 de la longitud').click();

    await lab.explorerButton('Restaurar paquete').click();

    await expect(lab.packetVerdict()).toContainText(
      'Pasa las comprobaciones representadas en este modelo.',
    );
    await expect(lab.explorerButton('Restaurar paquete')).toBeFocused();
  });
});
```

- **Pasos:**
  1. Escribí los dos archivos.
  2. `npm run build` y `E2E_PORT=4281 npm run test:e2e -- lab-explorer-focus.spec.ts --repeat-each 3`: 6 de 6, contra el legacy.
  3. `E2E_PORT=4281 npm run test:e2e`: los 184 de hoy y los 2 nuevos.
  4. `npm run typecheck`, `npm run lint` y `npm run format:check`.
  5. Commit: `test(e2e): el foco del paquete de Go que sólo veía quest-explorers-check`.
- **Compuerta:** el paso 2 y el paso 3.
- **Vuelta atrás:** revertí el commit.

## 2. Unidad 2 · Las piezas sin montar (dueños M, C y P, ondas 1 y 2)

**Cubre:** FR-007, FR-009, FR-017, FR-020, FR-022 a FR-042, FR-051 (la vista), FR-056 a FR-059 y FR-062; la vista de FR-029; US1, US2, US3 y US5.

**Entrega:** el modelo de la página, el hook del editor y los componentes, con sus specs, sin que la cadena de arranque los importe todavía. Al cerrar U2, el legacy sigue montado y los 186 E2E de U1 pasan.

### 2.0 Contratos de la unidad 2

Son las firmas exactas. Los cuerpos están en T021, T022 y T024, y el contrato público en [contracts/lab-page.md](./contracts/lab-page.md).

```ts
// pages/lab/model/types.ts
export interface LabWorkshop { id: string; title: string; code: Readonly<Record<ExerciseLanguage, string>>; related?: Readonly<Record<string, readonly string[]>> }
export interface MissionLink { readonly world: string | null; readonly workshop: string | null }

// pages/lab/model/lab-session.ts
export type LabMode = 'map' | 'exercise';
export type OwnershipOperation = 'create' | 'move' | 'borrow' | 'clone';
export interface VisualModels { ownership; sliceCopied; sliceOriginal; sliceView; flow }
export interface LabSession { selectedId; mode; phase; filters: MapFilters; link: MissionLink; visual: VisualModels; labExplorer: LabExplorerState; questExplorers: ReadonlyMap<string, QuestState> }
export interface SessionCatalog { exercises: readonly { id; language }[]; byId: ReadonlyMap<string, { id; language }> }
export type SessionChange = (change: (session: LabSession) => LabSession) => void;
export const NO_LINK: MissionLink;
export function createLabSession(): LabSession;
export function openLabSession(session, language: string, link: LinkQuery, catalog: SessionCatalog, savedSelection: string | null | undefined): LabSession;
export function openExerciseSession(session, id: string): LabSession;
export function showMap(session): LabSession;
export function choosePhase(session, phase: ExercisePhase): LabSession;
export function clearSelection(session): LabSession;
export function searchFor(session, query: string): LabSession;
export function chooseLevel(session, level: LevelFilter): LabSession;
export function toggleDueOnly(session): LabSession;
export function toggleExtraOnly(session): LabSession;
export function clearFilters(session): LabSession;
export function chooseOwnership(session, ownership: OwnershipOperation): LabSession;
export function toggleSliceCopy(session): LabSession;
export function changeSliceView(session): LabSession;
export function resetSlices(session): LabSession;
export function advanceFlow(session): LabSession;
export function withLabExplorer(session, labExplorer: LabExplorerState): LabSession;
export function withQuestExplorer(session, exerciseId: string, state: QuestState): LabSession;

// pages/lab/model/mission-bridges.ts (funciones puras: los motores llegan por parámetro)
export interface CampaignWorlds { getWorlds(language: string): readonly DerivedWorld[]; canAttempt(id: string, language: string): AttemptPermission }
export interface WorkshopProgress { get(id: string, language: string): { progress: { code: boolean } } }
export type MissionContextView = CampaignContextView | WorkshopContextView;
export function campaignLock(campaign: CampaignWorlds, link: MissionLink, exercise: { id; language }): CampaignLinkAccess | null;
export function navigationList(exercises, byId, sources: { workshops; campaign }, link, language, selectedId): Exercise[];
export function finishHref(link: MissionLink, language: ExerciseLanguage): string | null;
export function backLabel(link: MissionLink): 'Volver al taller' | 'Volver al mapa';
export function missionContext(sources: { workshops; progress; campaign }, link, exercise): MissionContextView | null;

// pages/lab/model/mission-engines.ts (con los singletons)
export function refreshMissionEngines(): void;
export function saveLab(): boolean;
export function syncAfterPrediction(exercise: { id; language }, notify: (message: string) => void): void;

// pages/lab/model/enter-lab.ts
export function showExercise(exercise: { id; language }, link: MissionLink): void;
export function enterLab(session, language: ExerciseLanguage, link: LinkQuery, catalog: ExerciseCatalog): LabSession;

// pages/lab/model/map-stats.ts, lab-url.ts y record-view.ts
export function mapStats(exercises, records, filters, now): MapStats;
export function filterStatus(count: number, filters: MapFilters): string;
export function replaceLabUrl(mode: LabMode, exerciseId: string | null, phase: ExercisePhase): void;
export function viewOf(record: LabRecord): RecordView;

// pages/lab/lib/browser.ts y copy-text.ts
export function currentTime(): number;
export function pickAtRandom<T>(items: readonly T[]): T;
export function navigateTo(href: string): void;
export function preformatted(text: string): string;
export async function copyText(text: string, notify: (message: string) => void): Promise<void>;

// shared/ui/code-editor
export function createCodeEditor(parent: HTMLElement, options: CodeEditorOptions): CodeEditorController;
const useCodeEditor: (options: UseCodeEditorOptions) => CodeEditorBinding;
```

**De dónde sale cada una** (en la base, después de F7a):

| Función nueva | Hoy |
| --- | --- |
| `openLabSession` | `mount` de `lab.js` (el cambio de idioma y el enlace) |
| `openExerciseSession` y `showMap` | `openExercise` y `finishNavigation` |
| las funciones de los filtros y de los modelos visuales | las ramas `due`, `level`, `extras`, `clear-search`, `ownership`, `slice-*` y `flow` de `onClick` |
| `clearSelection` | `TallerLab.reset` |
| `campaignLock` | `lockedExerciseHTML` de los adaptadores de F6, sin el HTML |
| `navigationList`, `finishHref` y `backLabel` | `navigationList`, `finishNavigation` y el rótulo de `exerciseHTML` |
| `missionContext` | los dos `exerciseContextHTML`, sin el HTML |
| `refreshMissionEngines` y `saveLab` | los `refresh()` de `render()` y los `save()` de los manejadores |
| `syncAfterPrediction` | el `syncAfterRun` de la rama `predict` |
| `enterLab` y `showExercise` | `mount` y el `recordFor` de `exerciseHTML` |
| `mapStats` y `filterStatus` | `achievementStats` y los textos del estado del filtro |
| `replaceLabUrl` | `syncLocation` |
| `copyText` | `copyText`, con una clase en lugar de `cssText` |
| `PRACTICE_SOURCES` y `PROJECT_MISSIONS` | `practiceSourcesHTML` de `lab.js` y `missions` de `lab-explorers.js` |

### Tarea 2.1 · Las specs del modelo, en rojo (T020, M)

- **Crea los stubs** de `pages/lab/model/lab-session.ts`, `mission-bridges.ts`, `enter-lab.ts`, `map-stats.ts`, `mission-engines.ts`, `types.ts` y `pages/lab/lib/browser.ts`, con las firmas de §2.0 y cuerpos que lanzan `new Error('not implemented')`.
- **Crea las cinco specs.** Los valores esperados salen de los textos de hoy, de la gramática de F2b y de ejemplos resueltos a mano:

`frontend/src/pages/lab/model/lab-session.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { LinkQuery } from '../../../shared/config/url-grammar';
import {
  advanceFlow,
  changeSliceView,
  clearFilters,
  clearSelection,
  createLabSession,
  openExerciseSession,
  openLabSession,
  searchFor,
  showMap,
  toggleDueOnly,
  toggleExtraOnly,
  toggleSliceCopy,
  withQuestExplorer,
  chooseLevel,
  type LabSession,
} from './lab-session';

const catalog = {
  exercises: [
    { id: 'rust-01', language: 'rust' },
    { id: 'rust-02', language: 'rust' },
    { id: 'go-01', language: 'go' },
  ],
  byId: new Map([
    ['rust-01', { id: 'rust-01', language: 'rust' }],
    ['rust-02', { id: 'rust-02', language: 'rust' }],
    ['go-01', { id: 'go-01', language: 'go' }],
  ]),
};

function link(values: Partial<LinkQuery> = {}): LinkQuery {
  return {
    exercise: null,
    phase: null,
    missionWorld: null,
    missionWorkshop: null,
    world: null,
    language: null,
    workshop: null,
    part: null,
    ...values,
  };
}

function exploring(): LabSession {
  const session = openExerciseSession(createLabSession(), 'rust-02');
  return {
    ...session,
    phase: 'code',
    filters: { query: 'memoria', dueOnly: true, extraOnly: true, level: 'medium' },
  };
}

describe('openLabSession', () => {
  it('opens the map on the saved selection of the language the first time', () => {
    const session = openLabSession(createLabSession(), 'rust', link(), catalog, 'rust-02');

    expect(session).toMatchObject({ selectedId: 'rust-02', mode: 'map', phase: 'learn' });
  });

  it('falls back to the first exercise of the language without a saved selection', () => {
    expect(openLabSession(createLabSession(), 'go', link(), catalog, null).selectedId).toBe(
      'go-01',
    );
  });

  it('keeps the exercise, the phase and every filter when the language does not change', () => {
    const session = openLabSession(exploring(), 'rust', link(), catalog, 'rust-01');

    expect(session).toMatchObject({
      selectedId: 'rust-02',
      mode: 'exercise',
      phase: 'code',
      filters: { query: 'memoria', dueOnly: true, extraOnly: true, level: 'medium' },
    });
  });

  it('KNOWN DEFECT (spec 021, quirk 1): a language switch clears the search and the due filter, not the level nor the extras', () => {
    const session = openLabSession(exploring(), 'go', link(), catalog, null);

    expect(session).toMatchObject({
      selectedId: 'go-01',
      mode: 'map',
      phase: 'learn',
      filters: { query: '', dueOnly: false, extraOnly: true, level: 'medium' },
    });
  });

  it('a linked exercise of the language opens at its phase and keeps the mission link', () => {
    const session = openLabSession(
      createLabSession(),
      'rust',
      link({
        exercise: 'rust-01',
        phase: 'reflect',
        missionWorld: 'rust-world-1',
        missionWorkshop: '',
      }),
      catalog,
      null,
    );

    expect(session).toMatchObject({
      selectedId: 'rust-01',
      mode: 'exercise',
      phase: 'reflect',
      link: { world: 'rust-world-1', workshop: '' },
    });
  });

  it('an unknown phase opens at learn, and a link of another language is ignored', () => {
    expect(
      openLabSession(
        createLabSession(),
        'rust',
        link({ exercise: 'rust-01', phase: 'x' }),
        catalog,
        null,
      ).phase,
    ).toBe('learn');
    expect(
      openLabSession(createLabSession(), 'rust', link({ exercise: 'go-01' }), catalog, null).mode,
    ).toBe('map');
  });

  it('the map drops the mission link', () => {
    const session = openLabSession(
      createLabSession(),
      'rust',
      link({ missionWorld: 'rust-world-1', missionWorkshop: 'cache' }),
      catalog,
      null,
    );

    expect(session.link).toEqual({ world: null, workshop: null });
  });

  it('KNOWN DEFECT (spec 021, quirk 2): entering by URL keeps the explorers and the visual models', () => {
    const before = withQuestExplorer(advanceFlow(createLabSession()), 'rust-103', {
      notice: 'x',
    } as never);

    const session = openLabSession(before, 'rust', link({ exercise: 'rust-01' }), catalog, null);

    expect(session.visual.flow).toBe(1);
    expect(session.questExplorers.get('rust-103')).toEqual({ notice: 'x' });
  });
});

describe('opening an exercise and going back', () => {
  it('opens at learn and restarts the visual models, the lab explorer and every mission explorer', () => {
    const before = withQuestExplorer(
      changeSliceView(toggleSliceCopy(advanceFlow(exploring()))),
      'rust-103',
      { notice: 'x' } as never,
    );

    const session = openExerciseSession(before, 'rust-01');

    expect(session).toMatchObject({ selectedId: 'rust-01', mode: 'exercise', phase: 'learn' });
    expect(session.visual).toEqual({
      ownership: 'create',
      sliceCopied: false,
      sliceOriginal: 20,
      sliceView: 20,
      flow: 0,
    });
    expect(session.labExplorer.notice).toBe('Elegí qué participante da el primer paso.');
    expect(session.questExplorers.size).toBe(0);
  });

  it('the map keeps the filters and drops the mission link', () => {
    const session = showMap({ ...exploring(), link: { world: 'rust-world-1', workshop: null } });

    expect(session.mode).toBe('map');
    expect(session.link).toEqual({ world: null, workshop: null });
    expect(session.filters.query).toBe('memoria');
  });

  it('«Borrar todo» leaves the map at learn without a selection and keeps the filters', () => {
    const session = clearSelection(exploring());

    expect(session).toMatchObject({ selectedId: null, mode: 'map', phase: 'learn' });
    expect(session.filters.level).toBe('medium');
  });
});

describe('the map filters', () => {
  it('search, level, due and extras change only their own field', () => {
    let session = createLabSession();
    session = searchFor(session, 'slices');
    session = chooseLevel(session, 'expert');
    session = toggleDueOnly(session);
    session = toggleExtraOnly(session);

    expect(session.filters).toEqual({
      query: 'slices',
      level: 'expert',
      dueOnly: true,
      extraOnly: true,
    });
  });

  it('«Ver todos los desafíos» clears the four', () => {
    expect(clearFilters(exploring()).filters).toEqual({
      query: '',
      dueOnly: false,
      extraOnly: false,
      level: 'all',
    });
  });
});

describe('the visual models', () => {
  it('a shared slice moves the original with the view; a copied one does not', () => {
    const shared = changeSliceView(createLabSession()).visual;
    const copied = changeSliceView(toggleSliceCopy(createLabSession())).visual;

    expect([shared.sliceOriginal, shared.sliceView]).toEqual([21, 21]);
    expect([copied.sliceOriginal, copied.sliceView]).toEqual([20, 21]);
  });

  it('the flow goes around three steps', () => {
    const third = advanceFlow(advanceFlow(createLabSession()));

    expect(third.visual.flow).toBe(2);
    expect(advanceFlow(third).visual.flow).toBe(0);
  });
});
```

`frontend/src/pages/lab/model/mission-bridges.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { AttemptPermission, DerivedWorld } from '../../../entities/campaign';
import type { Exercise } from '../../../entities/exercise';
import {
  backLabel,
  campaignLock,
  finishHref,
  missionContext,
  navigationList,
  type CampaignWorlds,
} from './mission-bridges';
import type { LabWorkshop } from './types';

const NO_LINK = { world: null, workshop: null };
const exercise = (id: string, language: 'rust' | 'go' = 'rust') => ({ id, language }) as Exercise;
const exercises = ['rust-01', 'rust-02', 'rust-31', 'rust-35', 'rust-103', 'rust-113'].map((id) =>
  exercise(id),
);
const byId = new Map(exercises.map((item) => [item.id, item]));

const robotStation = {
  id: 'rust-world-1',
  title: 'Estación del robot',
  missionIds: ['rust-02', 'rust-103'],
  missions: [
    { id: 'rust-02', points: 10, code: false, prediction: true },
    { id: 'rust-103', points: 0, code: false, prediction: false },
  ],
} as unknown as DerivedWorld;

function campaign(permission: Partial<AttemptPermission> = {}): CampaignWorlds {
  return {
    getWorlds: (language) => (language === 'rust' ? [robotStation] : []),
    canAttempt: () => ({
      allowed: true,
      reasons: [],
      worldId: 'rust-world-1',
      isBoss: false,
      ...permission,
    }),
  };
}

const cache: LabWorkshop = {
  id: 'cache',
  title: 'Una caché que aprende tus visitas',
  code: { rust: 'rust-113', go: 'go-137' },
  related: { rust: ['rust-31', 'rust-35'] },
};
const progress = (code: boolean) => ({ get: () => ({ progress: { code } }) });

describe('campaignLock', () => {
  it('does not lock without a campaign link, or for an allowed mission of the linked world', () => {
    expect(campaignLock(campaign(), NO_LINK, exercise('rust-103'))).toBeNull();
    expect(
      campaignLock(campaign(), { world: 'rust-world-1', workshop: null }, exercise('rust-02')),
    ).toBeNull();
  });

  it('locks a mission the campaign does not allow yet, with its reasons and its world', () => {
    const lock = campaignLock(
      campaign({ allowed: false, reasons: ['Completá las cinco misiones previas.'] }),
      { world: 'rust-world-1', workshop: 'cache' },
      exercise('rust-103'),
    );

    expect(lock).toEqual({
      allowed: false,
      reasons: ['Completá las cinco misiones previas.'],
      worldId: 'rust-world-1',
    });
  });

  it('explains a link that is not a mission of the world, and an unknown world', () => {
    const outside = campaignLock(
      campaign(),
      { world: 'rust-world-1', workshop: null },
      exercise('rust-01'),
    );
    const unknown = campaignLock(
      campaign(),
      { world: 'no-existe', workshop: null },
      exercise('rust-02'),
    );

    expect(outside?.reasons).toEqual(['El enlace no corresponde a una misión de este mundo.']);
    expect(outside?.worldId).toBe('rust-world-1');
    expect(unknown?.worldId).toBeNull();
  });
});

describe('navigationList', () => {
  const sources = { workshops: [cache], campaign: campaign() };

  it('walks the tools and then the core of the linked workshop', () => {
    const ids = navigationList(
      exercises,
      byId,
      sources,
      { world: null, workshop: 'cache' },
      'rust',
      'rust-35',
    ).map((item) => item.id);

    expect(ids).toEqual(['rust-31', 'rust-35', 'rust-113']);
  });

  it('walks the missions of the linked world when the exercise is not of the workshop', () => {
    const ids = navigationList(
      exercises,
      byId,
      sources,
      { world: 'rust-world-1', workshop: 'cache' },
      'rust',
      'rust-02',
    ).map((item) => item.id);

    expect(ids).toEqual(['rust-02', 'rust-103']);
  });

  it('walks every exercise of the language without a link, or with ?sistema= empty', () => {
    expect(navigationList(exercises, byId, sources, NO_LINK, 'rust', 'rust-02')).toHaveLength(6);
    expect(
      navigationList(exercises, byId, sources, { world: null, workshop: '' }, 'rust', 'rust-113'),
    ).toHaveLength(6);
  });
});

describe('the way back', () => {
  it('goes to the build part of the workshop, then to the world, then to the map', () => {
    expect(finishHref({ world: 'rust-world-1', workshop: 'cache' }, 'go')).toBe(
      '?taller=cache&parte=build&lenguaje=go#sistemas',
    );
    expect(finishHref({ world: 'rust-world-1', workshop: null }, 'rust')).toBe(
      '?mundo=rust-world-1#campana',
    );
    expect(finishHref(NO_LINK, 'rust')).toBeNull();
  });

  it('KNOWN DEFECT (spec 021, quirk 4): says «Volver al mapa» inside a campaign mission', () => {
    expect(backLabel({ world: 'rust-world-1', workshop: null })).toBe('Volver al mapa');
    expect(backLabel({ world: null, workshop: '' })).toBe('Volver al taller');
  });
});

describe('missionContext', () => {
  const sources = { workshops: [cache], progress: progress(false), campaign: campaign() };

  it('names the core and the previous tools of the linked workshop', () => {
    const core = missionContext(sources, { world: null, workshop: 'cache' }, exercise('rust-113'));
    const tool = missionContext(sources, { world: null, workshop: 'cache' }, exercise('rust-31'));

    expect(core).toEqual({
      kind: 'workshop',
      href: '?taller=cache&parte=build&lenguaje=rust#sistemas',
      title: 'Una caché que aprende tus visitas',
      role: 'core',
      verified: false,
    });
    expect(tool).toMatchObject({ role: 'tool' });
  });

  it('marks the core verified with the code seal of the workshop', () => {
    const context = missionContext(
      { ...sources, progress: progress(true) },
      { world: null, workshop: 'cache' },
      exercise('rust-113'),
    );

    expect(context).toMatchObject({ verified: true });
  });

  it('prefers the workshop to the campaign, and falls back to the campaign mission', () => {
    const both = missionContext(
      sources,
      { world: 'rust-world-1', workshop: 'cache' },
      exercise('rust-113'),
    );
    const mission = missionContext(
      sources,
      { world: 'rust-world-1', workshop: 'cache' },
      exercise('rust-02'),
    );

    expect(both?.kind).toBe('workshop');
    expect(mission).toEqual({
      kind: 'campaign',
      href: '?mundo=rust-world-1#campana',
      title: 'Estación del robot',
      points: 10,
      code: false,
      prediction: true,
    });
  });

  it('is empty outside a mission, for another language and with an unknown workshop', () => {
    expect(missionContext(sources, NO_LINK, exercise('rust-02'))).toBeNull();
    expect(
      missionContext(sources, { world: null, workshop: 'cache' }, exercise('rust-01')),
    ).toBeNull();
    expect(
      missionContext(sources, { world: null, workshop: 'cache' }, exercise('rust-113', 'go')),
    ).toBeNull();
    expect(
      missionContext(sources, { world: null, workshop: 'no-existe' }, exercise('rust-113')),
    ).toBeNull();
  });
});
```

`frontend/src/pages/lab/model/enter-lab.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const engines = vi.hoisted(() => ({
  campaign: {
    refreshFromLab: vi.fn(),
    getWorlds: vi.fn(() => []),
    canAttempt: vi.fn(() => ({
      allowed: false,
      reasons: ['Todavía no.'],
      worldId: null,
      isBoss: false,
    })),
  },
  systems: { refreshFromLab: vi.fn() },
  progress: { records: {} as Record<string, object>, selected: { rust: 'rust-02', go: null } },
}));

vi.mock('../../../entities/campaign', () => ({ campaignEngine: engines.campaign }));
vi.mock('../../../entities/systems-workshop', () => ({ systemsEngine: engines.systems }));
vi.mock('../../../entities/exercise', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  labStore: {
    getProgress: () => engines.progress,
    exportState: () => ({ records: { ...engines.progress.records } }),
  },
}));

const { enterLab } = await import('./enter-lab');
const { createLabSession } = await import('./lab-session');

const catalog = {
  exercises: [
    { id: 'rust-01', language: 'rust' },
    { id: 'rust-02', language: 'rust' },
  ],
  byId: new Map([
    ['rust-01', { id: 'rust-01', language: 'rust' }],
    ['rust-02', { id: 'rust-02', language: 'rust' }],
  ]),
} as never;

const link = (values: object) => ({
  exercise: null,
  phase: null,
  missionWorld: null,
  missionWorkshop: null,
  world: null,
  language: null,
  workshop: null,
  part: null,
  ...values,
});

describe('enterLab', () => {
  beforeEach(() => {
    engines.progress.records = {};
    vi.clearAllMocks();
  });

  it('refreshes both engines with the lab evidence, without syncing', () => {
    enterLab(createLabSession(), 'rust', link({}), catalog);

    expect(engines.campaign.refreshFromLab).toHaveBeenCalledTimes(1);
    expect(engines.systems.refreshFromLab).toHaveBeenCalledTimes(1);
  });

  it('leaves the empty record of the exercise it shows, in memory (D1, FR-017)', () => {
    const session = enterLab(createLabSession(), 'rust', link({ exercise: 'rust-01' }), catalog);

    expect(session.mode).toBe('exercise');
    expect(engines.progress.records).toEqual({ 'rust-01': {} });
  });

  it('creates no record on the map nor behind a campaign lock', () => {
    enterLab(createLabSession(), 'rust', link({}), catalog);
    enterLab(
      createLabSession(),
      'rust',
      link({ exercise: 'rust-01', missionWorld: 'rust-world-1' }),
      catalog,
    );

    expect(engines.progress.records).toEqual({});
  });
});
```

`frontend/src/pages/lab/model/map-stats.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filterStatus } from './map-stats';

const filters = { query: '', dueOnly: false, extraOnly: false, level: 'all' as const };

describe('filterStatus', () => {
  it('counts the visible challenges', () => {
    expect(filterStatus(137, filters)).toBe('137 desafíos visibles.');
  });

  it('names the search whenever there is one (X1)', () => {
    expect(filterStatus(4, { ...filters, query: 'memoria' })).toBe(
      '4 desafíos visibles para tu búsqueda.',
    );
  });

  it('names the extras after the search', () => {
    expect(filterStatus(2, { ...filters, query: 'x', extraOnly: true })).toBe(
      '2 desafíos visibles para tu búsqueda · ampliación Clásicos y sistemas.',
    );
  });
});
```

`frontend/src/pages/lab/lib/browser.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { preformatted } from './browser';

describe('preformatted', () => {
  it('drops one leading line feed, as the HTML parser does after <pre>', () => {
    expect(preformatted('\nsalida')).toBe('salida');
    expect(preformatted('\n\nsalida')).toBe('\nsalida');
  });

  it('leaves any other text as is', () => {
    expect(preformatted('error\n')).toBe('error\n');
  });
});
```

- **Pasos:**
  1. Los stubs y las specs.
  2. `npm run test:unit -- src/pages/lab`: las cinco specs fallan por `not implemented`, y la de `map-selectors` (F7a) sigue en verde.
  3. `npm run typecheck`, `npm run lint` y `npm run format:check`.
  4. Commit: `test(front): las specs de la sesión, los puentes y la entrada del laboratorio, en rojo`.
- **Compuerta:** el paso 2, con cada falla por `not implemented`.

### Tarea 2.2 · El modelo (T021, M)

- **Escribe** los cuerpos de los stubs y los módulos que no tienen spec propia (`lab-url.ts`, `record-view.ts`, `practice-content.ts`, `lib/copy-text.ts` y `composition.ts`), que prueban las specs de componente y los E2E.

`frontend/src/pages/lab/model/types.ts`:

```ts
import type { ExerciseLanguage } from '../../../entities/exercise';

export interface LabWorkshop {
  id: string;
  title: string;
  code: Readonly<Record<ExerciseLanguage, string>>;
  related?: Readonly<Record<string, readonly string[]>>;
}

export interface MissionLink {
  readonly world: string | null;
  readonly workshop: string | null;
}
```

`frontend/src/pages/lab/model/lab-session.ts`:

```ts
import {
  initialLabExplorerState,
  type LabExplorerState,
  type QuestState,
} from '../../../entities/exercise/explorers';
import {
  exercisePhaseOr,
  type ExercisePhase,
  type LinkQuery,
} from '../../../shared/config/url-grammar';
import type { LevelFilter, MapFilters } from './map-selectors';
import type { MissionLink } from './types';

export type LabMode = 'map' | 'exercise';
export type OwnershipOperation = 'create' | 'move' | 'borrow' | 'clone';

export interface VisualModels {
  readonly ownership: OwnershipOperation;
  readonly sliceCopied: boolean;
  readonly sliceOriginal: number;
  readonly sliceView: number;
  readonly flow: number;
}

export interface LabSession {
  readonly selectedId: string | null;
  readonly mode: LabMode;
  readonly phase: ExercisePhase;
  readonly filters: MapFilters;
  readonly link: MissionLink;
  readonly visual: VisualModels;
  readonly labExplorer: LabExplorerState;
  readonly questExplorers: ReadonlyMap<string, QuestState>;
}

interface CatalogEntry {
  readonly id: string;
  readonly language: string;
}

export interface SessionCatalog {
  readonly exercises: readonly CatalogEntry[];
  readonly byId: ReadonlyMap<string, CatalogEntry>;
}

export const NO_LINK: MissionLink = Object.freeze({ world: null, workshop: null });

const INITIAL_VISUALS: VisualModels = Object.freeze({
  ownership: 'create',
  sliceCopied: false,
  sliceOriginal: 20,
  sliceView: 20,
  flow: 0,
});

export function createLabSession(): LabSession {
  return {
    selectedId: null,
    mode: 'map',
    phase: 'learn',
    filters: { query: '', dueOnly: false, extraOnly: false, level: 'all' },
    link: NO_LINK,
    visual: INITIAL_VISUALS,
    labExplorer: initialLabExplorerState(),
    questExplorers: new Map(),
  };
}

function firstIdOf(catalog: SessionCatalog, language: string): string | null {
  return catalog.exercises.find((exercise) => exercise.language === language)?.id ?? null;
}

export function openLabSession(
  session: LabSession,
  language: string,
  link: LinkQuery,
  catalog: SessionCatalog,
  savedSelection: string | null | undefined,
): LabSession {
  let next = session;
  const current = session.selectedId ? catalog.byId.get(session.selectedId) : undefined;
  if (!session.selectedId || current?.language !== language) {
    next = {
      ...next,
      selectedId: savedSelection || firstIdOf(catalog, language),
      mode: 'map',
      phase: 'learn',
      filters: { ...next.filters, query: '', dueOnly: false },
    };
  }
  const linked = link.exercise === null ? undefined : catalog.byId.get(link.exercise);
  if (linked?.language === language) {
    next = {
      ...next,
      selectedId: linked.id,
      mode: 'exercise',
      phase: exercisePhaseOr(link.phase, 'learn'),
    };
  }
  return {
    ...next,
    link:
      next.mode === 'exercise'
        ? { world: link.missionWorld, workshop: link.missionWorkshop }
        : NO_LINK,
  };
}

export function openExerciseSession(session: LabSession, id: string): LabSession {
  return {
    ...session,
    selectedId: id,
    mode: 'exercise',
    phase: 'learn',
    visual: INITIAL_VISUALS,
    labExplorer: initialLabExplorerState(),
    questExplorers: new Map(),
  };
}

export function showMap(session: LabSession): LabSession {
  return { ...session, mode: 'map', link: NO_LINK };
}

export function choosePhase(session: LabSession, phase: ExercisePhase): LabSession {
  return { ...session, phase };
}

export function clearSelection(session: LabSession): LabSession {
  return { ...session, selectedId: null, mode: 'map', phase: 'learn', link: NO_LINK };
}

export function searchFor(session: LabSession, query: string): LabSession {
  return { ...session, filters: { ...session.filters, query } };
}

export function chooseLevel(session: LabSession, level: LevelFilter): LabSession {
  return { ...session, filters: { ...session.filters, level } };
}

export function toggleDueOnly(session: LabSession): LabSession {
  return { ...session, filters: { ...session.filters, dueOnly: !session.filters.dueOnly } };
}

export function toggleExtraOnly(session: LabSession): LabSession {
  return { ...session, filters: { ...session.filters, extraOnly: !session.filters.extraOnly } };
}

export function clearFilters(session: LabSession): LabSession {
  return {
    ...session,
    filters: { query: '', dueOnly: false, extraOnly: false, level: 'all' },
  };
}

export function chooseOwnership(session: LabSession, ownership: OwnershipOperation): LabSession {
  return { ...session, visual: { ...session.visual, ownership } };
}

export function toggleSliceCopy(session: LabSession): LabSession {
  const { visual } = session;
  return {
    ...session,
    visual: { ...visual, sliceCopied: !visual.sliceCopied, sliceView: visual.sliceOriginal },
  };
}

export function changeSliceView(session: LabSession): LabSession {
  const { visual } = session;
  const sliceView = visual.sliceView + 1;
  const sliceOriginal = visual.sliceCopied ? visual.sliceOriginal : sliceView;
  return { ...session, visual: { ...visual, sliceView, sliceOriginal } };
}

export function resetSlices(session: LabSession): LabSession {
  return {
    ...session,
    visual: { ...session.visual, sliceCopied: false, sliceOriginal: 20, sliceView: 20 },
  };
}

export function advanceFlow(session: LabSession): LabSession {
  return { ...session, visual: { ...session.visual, flow: (session.visual.flow + 1) % 3 } };
}

export function withLabExplorer(session: LabSession, labExplorer: LabExplorerState): LabSession {
  return { ...session, labExplorer };
}

export function withQuestExplorer(
  session: LabSession,
  exerciseId: string,
  state: QuestState,
): LabSession {
  const questExplorers = new Map(session.questExplorers);
  questExplorers.set(exerciseId, state);
  return { ...session, questExplorers };
}

export type SessionChange = (change: (session: LabSession) => LabSession) => void;
```

`frontend/src/pages/lab/model/mission-bridges.ts`:

```ts
import {
  campaignLinkAccess,
  campaignMissionContext,
  type CampaignLinkAccess,
} from '../../../entities/campaign/bridge';
import type { AttemptPermission, DerivedWorld } from '../../../entities/campaign';
import type { Exercise, ExerciseLanguage } from '../../../entities/exercise';
import {
  workshopExerciseRole,
  workshopMissionIds,
  workshopReturnTarget,
  type WorkshopExerciseRole,
} from '../../../entities/systems-workshop/bridge';
import { workshopReturnHref, worldHref } from '../../../shared/config/url-grammar';
import type { LabWorkshop, MissionLink } from './types';

export interface CampaignWorlds {
  getWorlds(language: string): readonly DerivedWorld[];
  canAttempt(id: string, language: string): AttemptPermission;
}

export interface WorkshopProgress {
  get(id: string, language: string): { progress: { code: boolean } };
}

export interface CampaignContextView {
  kind: 'campaign';
  href: string;
  title: string;
  points: number;
  code: boolean;
  prediction: boolean;
}

export interface WorkshopContextView {
  kind: 'workshop';
  href: string;
  title: string;
  role: WorkshopExerciseRole;
  verified: boolean;
}

export type MissionContextView = CampaignContextView | WorkshopContextView;

interface ExerciseRef {
  id: string;
  language: string;
}

export function campaignLock(
  campaign: CampaignWorlds,
  link: MissionLink,
  exercise: ExerciseRef,
): CampaignLinkAccess | null {
  if (!link.world) return null;
  const access = campaignLinkAccess(
    campaign.getWorlds(exercise.language),
    link.world,
    exercise.id,
    campaign.canAttempt(exercise.id, exercise.language),
  );
  return access.allowed ? null : access;
}

function workshopOf(workshops: readonly LabWorkshop[], id: string | null): LabWorkshop | undefined {
  return workshops.find((workshop) => workshop.id === id);
}

export function navigationList(
  exercises: readonly Exercise[],
  byId: ReadonlyMap<string, Exercise>,
  sources: { workshops: readonly LabWorkshop[]; campaign: CampaignWorlds },
  link: MissionLink,
  language: ExerciseLanguage,
  selectedId: string,
): Exercise[] {
  const toExercises = (ids: readonly string[]) =>
    ids.map((id) => byId.get(id)).filter((exercise) => exercise !== undefined);
  const workshopIds = link.workshop
    ? workshopMissionIds(workshopOf(sources.workshops, link.workshop), language)
    : [];
  if (workshopIds.includes(selectedId)) return toExercises(workshopIds);
  const world = link.world
    ? sources.campaign.getWorlds(language).find((candidate) => candidate.id === link.world)
    : undefined;
  if (world) return toExercises(world.missionIds);
  return exercises.filter((exercise) => exercise.language === language);
}

export function finishHref(link: MissionLink, language: ExerciseLanguage): string | null {
  if (link.workshop) return workshopReturnHref(workshopReturnTarget(link.workshop, language));
  if (link.world) return worldHref(link.world);
  return null;
}

export function backLabel(link: MissionLink): 'Volver al taller' | 'Volver al mapa' {
  return link.workshop !== null ? 'Volver al taller' : 'Volver al mapa';
}

export function missionContext(
  sources: {
    workshops: readonly LabWorkshop[];
    progress: WorkshopProgress;
    campaign: CampaignWorlds;
  },
  link: MissionLink,
  exercise: ExerciseRef,
): MissionContextView | null {
  const workshop = workshopOf(sources.workshops, link.workshop);
  const role = workshopExerciseRole(workshop, exercise.id, exercise.language);
  if (role && workshop && link.workshop !== null) {
    return {
      kind: 'workshop',
      href: workshopReturnHref(workshopReturnTarget(link.workshop, exercise.language)),
      title: workshop.title,
      role,
      verified: sources.progress.get(link.workshop, exercise.language).progress.code,
    };
  }
  if (!link.world) return null;
  const context = campaignMissionContext(
    sources.campaign.getWorlds(exercise.language),
    link.world,
    exercise.id,
  );
  if (!context) return null;
  return {
    kind: 'campaign',
    href: worldHref(context.worldId),
    title: context.worldTitle,
    points: context.points,
    code: context.code,
    prediction: context.prediction,
  };
}
```

`frontend/src/pages/lab/model/mission-engines.ts`:

```ts
import { campaignEngine } from '../../../entities/campaign';
import { labStore, syncAfterRun } from '../../../entities/exercise';
import { systemsEngine } from '../../../entities/systems-workshop';

export function refreshMissionEngines(): void {
  campaignEngine.refreshFromLab(labStore.exportState());
  systemsEngine.refreshFromLab(labStore.exportState());
}

export function saveLab(): boolean {
  const saved = labStore.save();
  refreshMissionEngines();
  return saved;
}

export function syncAfterPrediction(
  exercise: { id: string; language: string },
  notify: (message: string) => void,
): void {
  syncAfterRun({
    syncSystems: () => systemsEngine.syncLab(labStore.exportState()),
    syncCampaign: () => campaignEngine.syncLab(labStore.exportState()),
    isCampaignMission: () =>
      Boolean(campaignEngine.canAttempt(exercise.id, exercise.language).worldId),
    notify,
    logError: (error) => console.error(error),
    formatXp: (xp) => `+${xp} XP por razonar tu predicción.`,
  });
}
```

`frontend/src/pages/lab/model/enter-lab.ts`:

```ts
import { campaignEngine } from '../../../entities/campaign';
import {
  ensureRecord,
  labStore,
  type ExerciseCatalog,
  type ExerciseLanguage,
} from '../../../entities/exercise';
import type { LinkQuery } from '../../../shared/config/url-grammar';
import { openLabSession, type LabSession } from './lab-session';
import { campaignLock } from './mission-bridges';
import { refreshMissionEngines } from './mission-engines';
import type { MissionLink } from './types';

export function showExercise(exercise: { id: string; language: string }, link: MissionLink): void {
  if (!campaignLock(campaignEngine, link, exercise)) {
    ensureRecord(labStore.getProgress(), exercise.id);
  }
}

export function enterLab(
  session: LabSession,
  language: ExerciseLanguage,
  link: LinkQuery,
  catalog: ExerciseCatalog,
): LabSession {
  const saved = labStore.getProgress().selected[language];
  const opened = openLabSession(session, language, link, catalog, saved);
  refreshMissionEngines();
  const exercise =
    opened.mode === 'exercise' && opened.selectedId
      ? catalog.byId.get(opened.selectedId)
      : undefined;
  if (exercise) showExercise(exercise, opened.link);
  return opened;
}
```

`frontend/src/pages/lab/model/map-stats.ts`:

```ts
import {
  isDueForReview,
  isSolved,
  practicePointsOf,
  type Exercise,
} from '../../../entities/exercise';
import {
  isExtraChallenge,
  matchesMapFilters,
  todayChallenge,
  type LabRecords,
  type MapFilters,
} from './map-selectors';

export interface MapStats {
  solved: number;
  due: number;
  points: number;
  topics: number;
  extras: number;
  visible: Exercise[];
  next: Exercise | undefined;
}

export function mapStats(
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: MapFilters,
  now: number,
): MapStats {
  return {
    solved: exercises.filter((exercise) => isSolved(records[exercise.id])).length,
    due: exercises.filter((exercise) => isDueForReview(records[exercise.id], now)).length,
    points: exercises.reduce((sum, exercise) => sum + practicePointsOf(records[exercise.id]), 0),
    topics: new Set(exercises.map((exercise) => exercise.topicId)).size,
    extras: exercises.filter(isExtraChallenge).length,
    visible: exercises.filter((exercise) => matchesMapFilters(exercise, records, filters, now)),
    next: todayChallenge(exercises, records, filters, now),
  };
}

export function filterStatus(count: number, filters: MapFilters): string {
  const search = filters.query ? ' para tu búsqueda' : '';
  const extras = filters.extraOnly ? ' · ampliación Clásicos y sistemas' : '';
  return `${count} desafíos visibles${search}${extras}.`;
}
```

`frontend/src/pages/lab/model/lab-url.ts`:

```ts
import { withLabQuery, type ExercisePhase } from '../../../shared/config/url-grammar';
import type { LabMode } from './lab-session';

export function replaceLabUrl(
  mode: LabMode,
  exerciseId: string | null,
  phase: ExercisePhase,
): void {
  const url = withLabQuery(new URL(location.href), mode, exerciseId ?? '', phase);
  try {
    history.replaceState(null, '', url);
  } catch (error) {
    void error; /* File previews may not expose the History API. */
  }
}
```

`frontend/src/pages/lab/model/record-view.ts`:

```ts
import type { LabRecord } from '../../../entities/exercise';

export interface RecordView {
  hints: number;
  attempts: number;
  customTest: string;
  reflection: string;
  reviewAt: number;
  prediction: number | undefined;
  confidence: string | undefined;
  assisted: boolean;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function textOr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function viewOf(record: LabRecord): RecordView {
  return {
    hints: numberOr(record.hints, 0),
    attempts: numberOr(record.attempts, 0),
    customTest: textOr(record.customTest),
    reflection: textOr(record.reflection),
    reviewAt: numberOr(record.reviewAt, 0),
    prediction: typeof record.prediction === 'number' ? record.prediction : undefined,
    confidence: typeof record.confidence === 'string' ? record.confidence : undefined,
    assisted: record.assisted === true,
  };
}
```

- **`practice-content.ts`** lleva las constantes de D6. Los textos son los de `practiceSourcesHTML` (`lab.js`) y `missions` (`lab-explorers.js`), carácter por carácter y en el mismo orden:

`frontend/src/pages/lab/model/practice-content.ts`:

```ts
import type { ExerciseLanguage } from '../../../entities/exercise';

export interface PracticeSource {
  purpose: string;
  title: string;
  description: string;
  url: string;
}

export interface ProjectMission {
  level: string;
  title: string;
  topics: string;
  why: string;
  check: string;
  url: string;
  label: string;
}

export const PRACTICE_SOURCES: Readonly<Record<ExerciseLanguage, readonly PracticeSource[]>> = {
  rust: [
    {
      purpose: 'Repará una idea por vez',
      title: 'Rustlings',
      description: 'Pequeños programas y errores que te enseñan a leer al compilador.',
      url: 'https://rustlings.rust-lang.org/usage/',
    },
    {
      purpose: 'Seguí una progresión',
      title: '100 Exercises to Learn Rust',
      description:
        'Conceptos breves acompañados de ejercicios y pruebas. Pensado para quienes ya programan.',
      url: 'https://rust-exercises.com/100-exercises/',
    },
    {
      purpose: 'Compará distintas soluciones',
      title: 'Exercism · Rust',
      description:
        'Más problemas para practicar y contrastar enfoques. La mentoría depende de voluntarios.',
      url: 'https://exercism.org/tracks/rust',
    },
  ],
  go: [
    {
      purpose: 'Aprendé escribiendo pruebas',
      title: 'Learn Go with Tests',
      description:
        'Explorá el lenguaje, escribí expectativas y mejorá el código manteniendo los casos en verde.',
      url: 'https://quii.gitbook.io/learn-go-with-tests',
    },
    {
      purpose: 'Construí algo pequeño',
      title: 'Gophercises',
      description:
        'Miniaplicaciones y herramientas para conectar funciones, interfaces y concurrencia. Acceso gratuito con correo.',
      url: 'https://gophercises.com/',
    },
    {
      purpose: 'Practicá un concepto',
      title: 'Exercism · Go',
      description:
        'Problemas por conceptos, análisis automático y mentoría voluntaria, sin promesa de respuesta inmediata.',
      url: 'https://exercism.org/tracks/go',
    },
  ],
};

export const PROJECT_MISSIONS: Readonly<Record<ExerciseLanguage, readonly ProjectMission[]>> = {
  rust: [
    {
      level: 'Inicial',
      title: 'Tu primera crate',
      topics: 'Cargo, módulos, dependencias y documentación',
      why: 'Creá una CLI que convierta unidades y separá cálculo de entrada/salida. Una crate es una unidad de compilación; un módulo organiza nombres y privacidad.',
      check:
        'Probá inputs válidos e inválidos. Revisá qué exporta tu biblioteca y qué queda privado. Conservá Cargo.lock para reproducir la aplicación.',
      url: 'https://doc.rust-lang.org/cargo/guide/',
      label: 'Cargo Guide',
    },
    {
      level: 'Intermedio',
      title: 'Una red de seguridad',
      topics: 'Unit tests, integración, doctests y manejo de errores',
      why: 'Extraé el parser del laboratorio a una biblioteca. Agregá tests públicos y ejemplos en la documentación: cada prueba comprueba un contrato distinto.',
      check:
        'Incluí un caso vacío, Unicode y entrada malformada; verificá que un cambio incorrecto haga fallar una prueba.',
      url: 'https://doc.rust-lang.org/book/ch11-00-testing.html',
      label: 'The Book · Testing',
    },
    {
      level: 'Avanzado',
      title: 'Archivos que sobreviven',
      topics: 'I/O, serialización, CLI y recuperación de errores',
      why: 'Guardá el KV en disco, recargalo y definí qué pasa si el archivo está incompleto. Los errores de I/O deben conservar contexto útil.',
      check:
        'Simulá permisos insuficientes o contenido truncado. Documentá qué durabilidad prometés. Para formatos JSON, investigá Serde y sus derives.',
      url: 'https://doc.rust-lang.org/book/ch12-00-an-io-project.html',
      label: 'The Book · I/O project',
    },
    {
      level: 'Avanzado',
      title: 'Servicio que sabe detenerse',
      topics: 'async/await, ejecutores, cancelación y backpressure',
      why: 'Convertí el KV en un servicio. Un Future describe trabajo que progresa al ser sondeado; un runtime coordina la ejecución y el I/O.',
      check:
        'Elegí un runtime y justificá límites de concurrencia. Cancelá una operación, apagá el servicio y comprobá que no perdés tareas críticas.',
      url: 'https://rust-lang.github.io/async-book/',
      label: 'Async Book',
    },
    {
      level: 'Experto',
      title: 'Medí antes de optimizar',
      topics: 'Cargo profiles, benchmarks, asignaciones y profiling',
      why: 'Compará dos representaciones del KV con datos realistas y builds optimizados. Una medición aislada puede reflejar ruido, calentamiento o trabajo eliminado.',
      check:
        'Registrá tamaños, distribución de entradas y entorno. Repetí mediciones y verificá que ambas implementaciones hacen el mismo trabajo.',
      url: 'https://doc.rust-lang.org/cargo/reference/profiles.html',
      label: 'Cargo · Profiles',
    },
    {
      level: 'Experto',
      title: 'La frontera de confianza',
      topics: 'unsafe, FFI, invariantes y Miri',
      why: 'Diseñá un wrapper seguro alrededor de una operación de bajo nivel. Explicá qué condiciones hacen válido cada acceso antes de escribir unsafe.',
      check:
        'Auditá alineación, inicialización, aliasing, lifetimes y liberación. Usá Miri en los casos compatibles; pasar pruebas no demuestra soundness.',
      url: 'https://doc.rust-lang.org/nomicon/',
      label: 'The Rustonomicon',
    },
  ],
  go: [
    {
      level: 'Inicial',
      title: 'Un módulo que podés compartir',
      topics: 'go.mod, paquetes, visibilidad y documentación',
      why: 'Convertí tres funciones del laboratorio en una biblioteca y consumila desde una CLI. Elegí una API pequeña y nombres exportados con intención.',
      check:
        'Separá lógica de entrada/salida, documentá contratos y agregá una prueba por comportamiento público.',
      url: 'https://go.dev/doc/tutorial/create-module',
      label: 'Go · Create a module',
    },
    {
      level: 'Intermedio',
      title: 'Pruebas que buscan sorpresas',
      topics: 'testing, tablas, subtests, ejemplos y fuzzing',
      why: 'Probá el parser con tablas y definí una propiedad para un fuzz test: por ejemplo que serializar y parsear preserve un valor válido.',
      check:
        'Incluí entradas vacías y malformadas; guardá un caso encontrado por el fuzzer como regresión.',
      url: 'https://go.dev/doc/tutorial/fuzz',
      label: 'Go · Fuzzing',
    },
    {
      level: 'Avanzado',
      title: 'HTTP con límites',
      topics: 'net/http, context, JSON, timeouts y pruebas de handlers',
      why: 'Construí una API para el KV. Acotá cuerpos, validá inputs y propagá cancelación a operaciones que puedan bloquear.',
      check:
        'Probá códigos de estado con httptest. Cancelá una solicitud y comprobá qué recursos deben liberarse.',
      url: 'https://pkg.go.dev/net/http',
      label: 'Go · net/http',
    },
    {
      level: 'Avanzado',
      title: 'Trabajadores que terminan',
      topics: 'Goroutines, select, canales, Mutex y cierre ordenado',
      why: 'Construí un pool con un número fijo de trabajadores y una cola acotada. Especificá quién cierra cada canal y quién espera a cada tarea.',
      check:
        'Ejecutá la suite con detección de carreras. Forzá cancelación con la cola llena y verificá que todos los trabajadores salgan.',
      url: 'https://go.dev/doc/articles/race_detector',
      label: 'Go · Race detector',
    },
    {
      level: 'Experto',
      title: 'Rendimiento con evidencia',
      topics: 'Benchmarks, perfiles de CPU/memoria, GC y escapes',
      why: 'Medí el KV y observá asignaciones. Un puntero no garantiza heap; el análisis de escapes y la vida del dato influyen.',
      check:
        'Compará trabajo equivalente y tamaños diferentes. Identificá un costo con un perfil y recién después medí una optimización.',
      url: 'https://go.dev/doc/diagnostics',
      label: 'Go · Diagnostics',
    },
    {
      level: 'Experto',
      title: 'Persistencia y límites del proceso',
      topics: 'database/sql, transacciones, recursos y recuperación',
      why: 'Agregá almacenamiento persistente y definí una operación atómica. Cancelación, cierre de recursos y límites del pool forman parte del diseño.',
      check:
        'Probá rollback y errores a mitad de operación. Documentá qué fallos podés recuperar y cuándo devolver el error al llamador.',
      url: 'https://go.dev/doc/database/execute-transactions',
      label: 'Go · Transactions',
    },
  ],
};
```

`frontend/src/pages/lab/lib/browser.ts`:

```ts
export function currentTime(): number {
  return Date.now();
}

export function pickAtRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function navigateTo(href: string): void {
  location.href = href;
}

// The HTML parser drops one line feed right after <pre>: the legacy lab wrote its <pre> with
// innerHTML, and React sets the text as is.
export function preformatted(text: string): string {
  return text.startsWith('\n') ? text.slice(1) : text;
}
```

`frontend/src/pages/lab/lib/copy-text.ts`:

```ts
export async function copyText(text: string, notify: (message: string) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    notify('Código copiado. Incluye las pruebas.');
  } catch {
    const buffer = document.createElement('textarea');
    buffer.value = text;
    buffer.className = 'lab-copy-buffer';
    document.body.appendChild(buffer);
    buffer.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (error) {
      void error; /* Selection fallback remains available below. */
    }
    buffer.remove();
    notify(
      success
        ? 'Código copiado.'
        : 'No se pudo copiar automáticamente. Probá seleccionar el texto.',
    );
  }
}
```

`frontend/src/pages/lab/composition.ts`:

```ts
export { clearSelection, createLabSession } from './model/lab-session';
export type { LabSession } from './model/lab-session';
export { campaignLock } from './model/mission-bridges';
```

- **Pasos:**
  1. Los cuerpos.
  2. `npm run test:unit -- src/pages/lab`: las seis specs en verde (47 pruebas en el prototipo).
  3. **Las mutaciones,** cada una detectada:
     - en `showExercise`, crear el registro aunque haya bloqueo: falla «creates no record on the map nor behind a campaign lock»;
     - en `openLabSession`, reiniciar `level` al cambiar de idioma: falla la rareza 1;
     - en `filterStatus`, omitir la búsqueda cuando hay `extraOnly`: falla «names the extras after the search».
  4. `npm run typecheck`, `npm run lint` (ninguna función nueva pasa de 10) y `npm run format:check`.
  5. Commit: `feat(front): el modelo de la página del laboratorio, sin montar`.
- **Compuerta:** los pasos 2 y 3.

### Tarea 2.3 · El hook del editor (T022, C)

- **Crea** `frontend/src/shared/ui/code-editor/create-code-editor.ts`. Copia de `mount-code-editor.ts`, sin cambios, la cabecera de licencia, `keywords`, `snippets`, `completions`, `theme` y `highlighting`. Cambian las opciones (el texto inicial, el tope y el nombre llegan por parámetro), `createExtensions` y el constructor, y se suma la anotación de `replaceText`. `mount-code-editor.ts` queda hasta el corte, porque `lab.js` todavía lo usa; T027 lo borra.

`frontend/src/shared/ui/code-editor/create-code-editor.ts`:

```ts
/*!
 * CodeMirror 6, its Rust/Go modes, Lezer, style-mod, w3c-keyname, find-cluster-break.
 * MIT License
 * Copyright (C) 2016 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2020 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2024 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * crelt: Copyright (C) 2020 by Marijn Haverbeke <marijn@haverbeke.berlin>
 * find-cluster-break: Copyright (C) 2024 by Marijn Haverbeke <marijn@haverbeke.berlin>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import { basicSetup } from 'codemirror';
import { Annotation, EditorState, Prec, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import type { CompletionSource } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import {
  autocompletion,
  completeFromList,
  snippetCompletion,
  closeCompletion,
  hasNextSnippetField,
  nextSnippetField,
  hasPrevSnippetField,
  prevSnippetField,
} from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting, indentUnit } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';

export type EditorLanguage = 'rust' | 'go';

export interface CodeEditorOptions {
  language: EditorLanguage;
  doc: string;
  maxLength: number;
  label: string;
  onChange: (text: string) => void;
  onRun: () => void;
  onEscape: () => void;
}

export interface CodeEditorController {
  focus(): void;
  replaceText(text: string): void;
  destroy(): void;
}

type SnippetEntry = readonly [label: string, template: string, detail: string];

const programmaticReplacement = Annotation.define<boolean>();
const keywords: Record<EditorLanguage, string[]> = {
  rust: 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while'.split(
    ' ',
  ),
  go: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil'.split(
    ' ',
  ),
};
const snippets: Record<EditorLanguage, SnippetEntry[]> = {
  rust: [
    ['fn', 'fn ${nombre}(${argumentos}) -> ${tipo} \\{\n\t${todo!()}\n\\}', 'declarar una función'],
    ['if', 'if ${condicion} \\{\n\t${}\n\\}', 'bifurcación'],
    ['for', 'for ${elemento} in ${coleccion} \\{\n\t${}\n\\}', 'recorrer una colección'],
    [
      'match',
      'match ${valor} \\{\n\t${patron} => ${resultado},\n\t_ => ${alternativa},\n\\}',
      'patrones exhaustivos',
    ],
    ['println!', 'println!("${mensaje}");', 'mostrar una línea'],
    ['assert_eq!', 'assert_eq!(${actual}, ${esperado});', 'comparar dos valores'],
    ['struct', 'struct ${Nombre} \\{\n\t${campo}: ${tipo},\n\\}', 'datos con campos'],
    ['impl', 'impl ${Tipo} \\{\n\t${}\n\\}', 'métodos de un tipo'],
  ],
  go: [
    ['func', 'func ${Nombre}(${argumentos}) ${tipo} \\{\n\t${}\n\\}', 'declarar una función'],
    ['if', 'if ${condicion} \\{\n\t${}\n\\}', 'bifurcación'],
    ['for', 'for ${i} := 0; ${i} < ${limite}; ${i}++ \\{\n\t${}\n\\}', 'bucle contado'],
    [
      'range',
      'for ${indice}, ${valor} := range ${coleccion} \\{\n\t${}\n\\}',
      'recorrer una colección',
    ],
    ['iferr', 'if err != nil \\{\n\treturn ${err}\n\\}', 'atender un error'],
    ['goroutine', 'go func() \\{\n\t${}\n\\}()', 'iniciar trabajo concurrente'],
    ['struct', 'type ${Nombre} struct \\{\n\t${Campo} ${Tipo}\n\\}', 'datos con campos'],
    ['select', 'select \\{\ncase ${valor} := <-${canal}:\n\t${}\n\\}', 'operaciones sobre canales'],
  ],
};
function completions(language: EditorLanguage): CompletionSource {
  return completeFromList([
    ...keywords[language].map((label) => ({
      label,
      type: 'keyword',
      detail: 'palabra del lenguaje',
    })),
    ...snippets[language].map(([label, template, detail]) =>
      snippetCompletion(template, { label, type: 'text', detail, boost: 2 }),
    ),
  ]);
}

const theme = EditorView.theme(
  {
    '&': {
      color: '#e9e9d6',
      backgroundColor: '#202a22',
      fontSize: '14px',
      width: '100%',
      minWidth: '0',
      height: '390px',
    },
    '.cm-scroller': {
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      lineHeight: '1.7',
      overflow: 'auto',
    },
    '.cm-content': { padding: '19px 0', caretColor: '#f3a166' },
    '.cm-line': { padding: '0 18px 0 12px' },
    '.cm-gutters': {
      backgroundColor: '#202a22',
      color: '#71816e',
      borderRight: '1px solid #ffffff12',
    },
    '.cm-gutterElement': { padding: '0 8px 0 12px' },
    '.cm-activeLineGutter': { backgroundColor: '#ffffff07', color: '#e0c69a' },
    '.cm-activeLine': { backgroundColor: '#ffffff04' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#f3a166' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: '#66795b66',
    },
    '.cm-matchingBracket': {
      backgroundColor: '#7f99654a',
      outline: '1px solid #a7bc77',
      color: '#faf9df',
    },
    '.cm-nonmatchingBracket': { color: '#ff9a8c', backgroundColor: '#983c3644' },
    '.cm-tooltip': {
      backgroundColor: '#2d382e',
      color: '#e9e9d6',
      border: '1px solid #58634e',
      borderRadius: '7px',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: '#46553b',
      color: '#fff4d9',
    },
    '.cm-completionLabel': { fontFamily: 'inherit' },
    '.cm-completionDetail': {
      color: '#c5c9b0',
      fontStyle: 'normal',
      marginLeft: '12px',
      fontSize: '11px',
    },
    '.cm-panels': { backgroundColor: '#2a342a', color: '#e9e9d6' },
    '.cm-panels.cm-panels-top': { borderBottom: '1px solid #58634e' },
    '.cm-panels.cm-panels-bottom': { borderTop: '1px solid #58634e' },
    '.cm-search': { padding: '10px', fontFamily: 'system-ui,sans-serif', fontSize: '12px' },
    '.cm-textfield': {
      backgroundColor: '#202a22',
      color: '#e9e9d6',
      border: '1px solid #728066',
      borderRadius: '4px',
      padding: '5px',
    },
    '.cm-button': {
      backgroundImage: 'none',
      backgroundColor: '#3a4935',
      color: '#e9e9d6',
      border: '1px solid #728066',
      borderRadius: '4px',
      padding: '4px 8px',
    },
    '.cm-searchMatch': { backgroundColor: '#ba8c414a', outline: '1px solid #ddab66' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#cb954d7a' },
    '.cm-foldPlaceholder': {
      backgroundColor: '#34402f',
      border: '1px solid #68745d',
      color: '#d8dabb',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: '"SFMono-Regular", Consolas, monospace',
    },
    '@media (max-width: 620px)': { '&': { height: '345px', fontSize: '13px' } },
  },
  { dark: true },
);
const highlighting = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: '#eaaa76' },
  { tag: [tags.string, tags.special(tags.string)], color: '#c8d994' },
  { tag: [tags.number, tags.bool, tags.null], color: '#c2a8df' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: '#e7d39b' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#a3cecb' },
  { tag: [tags.comment], color: '#9cac8d', fontStyle: 'italic' },
  { tag: [tags.operator, tags.punctuation], color: '#c1c8b1' },
  { tag: [tags.invalid], color: '#ffb2a4', textDecoration: 'underline' },
]);

function createExtensions(options: CodeEditorOptions): Extension[] {
  const { language, maxLength, label, onChange, onRun, onEscape } = options;
  return [
    Prec.highest(
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRun();
            return true;
          },
          preventDefault: true,
        },
        {
          key: 'Escape',
          run: (editor: EditorView) => {
            closeCompletion(editor);
            onEscape();
            return true;
          },
          preventDefault: true,
        },
        {
          key: 'Tab',
          run: (editor: EditorView) =>
            hasNextSnippetField(editor.state)
              ? nextSnippetField(editor)
              : (indentWithTab.run?.(editor) ?? false),
        },
        {
          key: 'Shift-Tab',
          run: (editor: EditorView) =>
            hasPrevSnippetField(editor.state)
              ? prevSnippetField(editor)
              : (indentWithTab.shift?.(editor) ?? false),
        },
      ]),
    ),
    basicSetup,
    language === 'go' ? go() : rust(),
    autocompletion({
      override: [completions(language)],
      activateOnTyping: true,
      maxRenderedOptions: 12,
    }),
    indentUnit.of(language === 'go' ? '\t' : '    '),
    EditorState.tabSize.of(4),
    EditorState.changeFilter.of(
      (transaction) => !transaction.docChanged || transaction.newDoc.length <= maxLength,
    ),
    EditorView.contentAttributes.of({
      'aria-label': label,
      'aria-multiline': 'true',
      'data-gramm': 'false',
      spellcheck: 'false',
      autocapitalize: 'off',
    }),
    EditorView.updateListener.of((update) => {
      const replaced = update.transactions.some((transaction) =>
        transaction.annotation(programmaticReplacement),
      );
      if (update.docChanged && !replaced) onChange(update.state.doc.toString());
    }),
    theme,
    syntaxHighlighting(highlighting),
  ];
}

export function createCodeEditor(
  parent: HTMLElement,
  options: CodeEditorOptions,
): CodeEditorController {
  const view = new EditorView({ parent, doc: options.doc, extensions: createExtensions(options) });
  return {
    focus: () => view.focus(),
    replaceText(text) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        annotations: programmaticReplacement.of(true),
      });
    },
    destroy: () => view.destroy(),
  };
}
```

- **Crea** `use-code-editor.ts`:

`frontend/src/shared/ui/code-editor/use-code-editor.ts`:

```ts
import { useEffectEvent, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
  createCodeEditor,
  type CodeEditorController,
  type EditorLanguage,
} from './create-code-editor';

export interface CodeEditorHandle {
  focus(): void;
  replaceText(text: string): void;
}

export interface UseCodeEditorOptions {
  language: EditorLanguage;
  initialText: string;
  maxLength: number;
  label: string;
  onChange: (text: string) => void;
  onRun: () => void;
  onEscape: () => void;
}

export interface CodeEditorBinding {
  hostRef: RefObject<HTMLDivElement | null>;
  editor: CodeEditorHandle;
}

const useCodeEditor = ({
  language,
  initialText,
  maxLength,
  label,
  onChange,
  onRun,
  onEscape,
}: UseCodeEditorOptions): CodeEditorBinding => {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<CodeEditorController | null>(null);
  const [doc] = useState(initialText);
  const changed = useEffectEvent((text: string) => onChange(text));
  const ran = useEffectEvent(() => onRun());
  const escaped = useEffectEvent(() => onEscape());

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let controller: CodeEditorController;
    try {
      controller = createCodeEditor(host, {
        language,
        doc,
        maxLength,
        label,
        onChange: (text) => changed(text),
        onRun: () => ran(),
        onEscape: () => escaped(),
      });
    } catch (error) {
      console.error('No se pudo mostrar el editor de código.', error);
      return;
    }
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [language, doc, maxLength, label]);

  const [editor] = useState<CodeEditorHandle>(() => ({
    focus: () => controllerRef.current?.focus(),
    replaceText: (text) => controllerRef.current?.replaceText(text),
  }));

  return { hostRef, editor };
};

export default useCodeEditor;
```

- **Cambia** `index.ts`. Hasta el corte exporta lo de hoy y suma el hook; T027 deja sólo el hook:

```ts
export { mountCodeEditor } from './mount-code-editor';
export type { CodeEditorController, CodeEditorOptions, EditorLanguage } from './mount-code-editor';
export { default as useCodeEditor } from './use-code-editor';
export type { CodeEditorBinding, CodeEditorHandle, UseCodeEditorOptions } from './use-code-editor';
```

- **Sin spec de jsdom** (research-f7b.md, R4): lo fijan los E2E de F7a que cuentan las escrituras y prueban el teclado, y la spec de `CodePhase`, que reemplaza el hook.
- **Pasos:**
  1. Los tres archivos.
  2. `npm run typecheck`, `npm run lint` y `npm run format:check`.
  3. `npm run build` y los 184 E2E de hoy, en verde. El script del dist puede crecer: el índice del editor exporta el hook, y las llamadas del tema de `create-code-editor.ts` no se eliminan como código muerto. T027 borra la copia vieja.
  4. Commit: `feat(front): el hook del editor con un callback de cambio y el reemplazo sin escritura`.
- **Compuerta:** el paso 2 y el paso 3.

### Tarea 2.4 · Las specs de componente, en rojo (T023, P)

- **Cuándo:** con T021 y T022 integradas y el arnés de T018.
- **Crea los stubs** de los componentes que prueban las specs, cada uno con su firma de props y un cuerpo que lanza `new Error('not implemented')`: `exercise/CodePhase.tsx`, `ReflectPhase.tsx`, `PredictionCard.tsx`, `HintsPanel.tsx`, `MissionContext.tsx`, `explorers/LabExplorer.tsx`, `QuestExplorer.tsx` y `map/LabMap.tsx`. Las props son las de T024.
- **Crea las nueve specs.** Reemplazan los motores, el almacén y el hook del editor por dobles con `vi.mock`, y `HTMLDialogElement.prototype.showModal` y `close`, que jsdom no trae. Seis escenarios vienen de `lab-state-check` y dos de `lab-bridge-check` (§5).

`frontend/src/pages/lab/ui/exercise/CodePhase.spec.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, LabRecord } from '../../../../entities/exercise';
import type { ExerciseRunner } from '../../../../features/run-exercise';
import type { UseCodeEditorOptions } from '../../../../shared/ui/code-editor';

const fakes = vi.hoisted(() => ({
  records: {} as Record<string, LabRecord>,
  save: vi.fn(() => true),
  editor: { focus: vi.fn(), replaceText: vi.fn() },
  options: null as UseCodeEditorOptions | null,
}));

vi.mock('../../model/mission-engines', () => ({ saveLab: fakes.save }));
vi.mock('../../../../shared/ui/code-editor', () => ({
  useCodeEditor: (options: UseCodeEditorOptions) => {
    fakes.options = options;
    return { hostRef: { current: null }, editor: fakes.editor };
  },
}));
vi.mock('../../../../entities/exercise', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  labStore: {
    getProgress: () => ({ records: fakes.records }),
    storageAvailable: () => true,
  },
}));

const { default: CodePhase } = await import('./CodePhase');

const exercise = {
  id: 'rust-01',
  language: 'rust',
  starter: 'fn inicio() {}',
  solution: 'fn solucion() {}',
  instructions: ['Hacelo.'],
  hints: ['Una.'],
  tests: [
    {
      id: 't1',
      label: 'Caso uno',
      expression: 'true',
      why: 'Porque.',
      failure: 'Falla.',
    },
  ],
  review: { success: 'Bien.', pitfall: 'Cuidado.' },
  transfer: 'Otra vuelta.',
} as unknown as Exercise;
const runner = {
  run: vi.fn(),
  cancel: vi.fn(),
  abort: vi.fn(),
} as unknown as ExerciseRunner;

function renderPhase(running = false) {
  fakes.records['rust-01'] ??= {};
  const props = {
    exercise,
    runner,
    running,
    runningHere: running,
    programBuilder: (_: unknown, draft: string, custom: string) => `${draft}|${custom}`,
    notify: vi.fn(),
    onPhase: vi.fn(),
  };
  const view = render(<CodePhase {...props} record={fakes.records['rust-01']} />);
  return {
    ...view,
    rerenderWith: (next: { running: boolean; record: LabRecord }) =>
      view.rerender(
        <CodePhase
          {...props}
          running={next.running}
          runningHere={next.running}
          record={next.record}
        />,
      ),
  };
}

describe('CodePhase', () => {
  beforeEach(() => {
    fakes.records = {};
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('gives the editor its language, its limit and its accessible name', () => {
    renderPhase();

    expect(fakes.options).toMatchObject({
      language: 'rust',
      initialText: 'fn inicio() {}',
      maxLength: 30000,
      label: 'Editor de código Rust',
    });
  });

  it('writes each change of the editor, also an emptied draft (lab-state-check)', () => {
    renderPhase();

    fakes.options!.onChange('');

    expect(fakes.records['rust-01'].draft).toBe('');
    expect(fakes.save).toHaveBeenCalledTimes(1);
  });

  it('keeps the review region when a run ends (X2)', () => {
    const view = renderPhase(true);
    const region = document.getElementById('lab-review');
    expect(within(region!).getByRole('button', { name: 'Cancelar ejecución' })).toBeInTheDocument();

    view.rerenderWith({
      running: false,
      record: {
        draft: 'fn inicio() {}',
        attempts: 1,
        result: {
          code: 'fn inicio() {}',
          customTest: '',
          success: true,
          stdout: '',
          stderr: '',
          tests: [{ id: 't1', passed: true }],
        },
      },
    });

    expect(document.getElementById('lab-review')).toBe(region);
    expect(region).toHaveTextContent('La idea funciona en estos casos.');
  });

  it('confirms «Restaurar inicio» in a dialog under <body>, writes once and gives the focus to the editor', async () => {
    const user = userEvent.setup();
    renderPhase();
    fakes.records['rust-01'].draft = 'mi borrador';

    await user.click(screen.getByRole('button', { name: 'Restaurar inicio ↺' }));
    const dialog = document.getElementById('lab-confirm-dialog');
    expect(dialog?.parentElement).toBe(document.body);
    await user.click(within(dialog!).getByRole('button', { name: 'Continuar' }));

    expect(fakes.records['rust-01'].draft).toBe('fn inicio() {}');
    expect(fakes.save).toHaveBeenCalledTimes(1);
    expect(fakes.editor.replaceText).toHaveBeenCalledWith('fn inicio() {}');
    expect(fakes.editor.focus).toHaveBeenCalledTimes(1);
    expect(document.getElementById('lab-confirm-dialog')).toBeNull();
  });

  it('«Conservar mi código» writes nothing and returns the focus to the button that opened it', async () => {
    const user = userEvent.setup();
    renderPhase();
    const restore = screen.getByRole('button', { name: 'Restaurar inicio ↺' });

    await user.click(restore);
    await user.click(screen.getByRole('button', { name: 'Conservar mi código' }));

    expect(fakes.save).not.toHaveBeenCalled();
    expect(restore).toHaveFocus();
  });
});
```

`frontend/src/pages/lab/ui/exercise/ReflectPhase.spec.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, LabRecord } from '../../../../entities/exercise';

const fakes = vi.hoisted(() => ({
  records: {} as Record<string, LabRecord>,
  available: true,
  save: vi.fn(() => true),
}));

vi.mock('../../model/mission-engines', () => ({ saveLab: fakes.save }));
vi.mock('../../../../entities/exercise', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  labStore: {
    getProgress: () => ({ records: fakes.records }),
    storageAvailable: () => fakes.available,
  },
}));

const { default: ReflectPhase } = await import('./ReflectPhase');

const exercise = {
  id: 'rust-01',
  language: 'rust',
  starter: 'fn main() {}',
  tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
  review: { success: 'Bien.', pitfall: 'Cuidado.' },
  transfer: 'Cambiá una condición.',
  sources: [],
} as unknown as Exercise;

function renderPhase(record: LabRecord) {
  fakes.records['rust-01'] = record;
  const props = {
    exercise,
    isLast: false,
    lastLabel: 'Volver al mapa',
    notify: vi.fn(),
    onPhase: vi.fn(),
    onNext: vi.fn(),
  };
  const view = render(<ReflectPhase {...props} record={record} />);
  return {
    ...view,
    rerenderWith: (next: LabRecord) => view.rerender(<ReflectPhase {...props} record={next} />),
  };
}

describe('ReflectPhase', () => {
  beforeEach(() => {
    fakes.records = {};
    fakes.available = true;
    vi.clearAllMocks();
  });

  it('KNOWN DEFECT (spec 021, quirk 3): shows one text drawn with 40 characters or more and another while typing', () => {
    renderPhase({ reflection: 'x'.repeat(40) });
    expect(document.getElementById('lab-reflection-status')).toHaveTextContent(
      'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.',
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Tu explicación, en tus palabras' }), {
      target: { value: 'corta' },
    });

    expect(document.getElementById('lab-reflection-status')).toHaveTextContent(
      'Tu explicación está guardada. Contrastala con el razonamiento del revisor.',
    );
  });

  it('writes an emptied reflection as an empty text (lab-state-check)', () => {
    renderPhase({ reflection: 'mi explicación' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Tu explicación, en tus palabras' }), {
      target: { value: '' },
    });

    expect(fakes.records['rust-01'].reflection).toBe('');
    expect(fakes.save).toHaveBeenCalledTimes(1);
  });

  it('says that nothing is saved when the storage is not available (lab-state-check)', () => {
    fakes.available = false;
    renderPhase({});

    fireEvent.change(screen.getByRole('textbox', { name: 'Tu explicación, en tus palabras' }), {
      target: { value: 'no se puede guardar' },
    });

    expect(document.getElementById('lab-reflection-status')).toHaveTextContent(
      'El guardado no está disponible: exportá tu avance.',
    );
  });

  it('keeps the status region and the reasoning panel when a run solves the exercise (X1, X2)', () => {
    const view = renderPhase({});
    const region = document.getElementById('lab-reflect-status');
    const reasoning = screen
      .getByText('Contrastar con el razonamiento del revisor')
      .closest('details');
    reasoning!.open = true;

    view.rerenderWith({
      draft: 'fn main() {}',
      result: {
        success: true,
        code: 'fn main() {}',
        customTest: '',
        tests: ['t1', 't2', 't3'].map((id) => ({ id, passed: true })),
      },
    });

    expect(document.getElementById('lab-reflect-status')).toBe(region);
    expect(region).toHaveTextContent('Lo hiciste funcionar. Ahora hacelo tuyo.');
    expect(reasoning!.open).toBe(true);
  });

  it('a self-assessment saves once, announces it and keeps the focus on the chosen button (X1)', async () => {
    const user = userEvent.setup();
    renderPhase({});
    const button = screen.getByRole('button', {
      name: /^Puedo explicarlo sin mirar/,
    });

    await user.click(button);

    expect(fakes.records['rust-01']).toMatchObject({ confidence: 'confident' });
    expect(fakes.save).toHaveBeenCalledTimes(1);
    expect(button).toHaveFocus();
  });
});
```

`frontend/src/pages/lab/ui/exercise/PredictionCard.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, LabRecord } from '../../../../entities/exercise';

const fakes = vi.hoisted(() => ({
  records: {} as Record<string, LabRecord>,
  save: vi.fn(() => true),
  campaignSync: vi.fn((): { xpGained?: number } => ({})),
  systemsSync: vi.fn(),
}));

vi.mock('../../../../entities/exercise', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  labStore: {
    getProgress: () => ({
      records: fakes.records,
      selected: { rust: null, go: null },
    }),
    exportState: () => ({ records: fakes.records }),
    save: fakes.save,
  },
}));
vi.mock('../../../../entities/campaign', () => ({
  campaignEngine: {
    refreshFromLab: vi.fn(),
    syncLab: fakes.campaignSync,
    canAttempt: () => ({ worldId: 'rust-world-1' }),
  },
}));
vi.mock('../../../../entities/systems-workshop', () => ({
  systemsEngine: { refreshFromLab: vi.fn(), syncLab: fakes.systemsSync },
}));

const { default: PredictionCard } = await import('./PredictionCard');

const exercise = {
  id: 'rust-02',
  language: 'rust',
  prediction: {
    question: '¿Qué imprime?',
    options: ['Uno', 'Dos'],
    answer: 1,
    explanation: 'Porque sí.',
  },
} as unknown as Exercise;

function renderCard(notify = vi.fn()) {
  fakes.records['rust-02'] ??= {};
  const view = render(
    <PredictionCard exercise={exercise} record={fakes.records['rust-02']} notify={notify} />,
  );
  return { notify, view };
}

describe('PredictionCard', () => {
  beforeEach(() => {
    fakes.records = {};
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('saves the right answer once and explains it in the same live region', async () => {
    const user = userEvent.setup();
    const { view } = renderCard();
    const region = document.getElementById('lab-prediction-feedback');

    await user.click(screen.getByRole('button', { name: 'Dos' }));
    view.rerender(
      <PredictionCard exercise={exercise} record={fakes.records['rust-02']} notify={vi.fn()} />,
    );

    expect(fakes.save).toHaveBeenCalledTimes(1);
    expect(fakes.records['rust-02']).toEqual({
      prediction: 1,
      predictionCorrect: true,
    });
    expect(screen.getByRole('button', { name: 'Dos' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.getElementById('lab-prediction-feedback')).toBe(region);
    expect(region).toHaveTextContent('Esa es la idea.Porque sí.');
  });

  it('reports a failing campaign sync once and does not throw (lab-state-check)', async () => {
    const user = userEvent.setup();
    fakes.campaignSync.mockImplementation(() => {
      throw new Error('campaña caída');
    });
    const { notify } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Dos' }));

    expect(notify.mock.calls).toEqual([
      ['No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.'],
    ]);
  });

  it('announces the XP that a prediction earns in a mission (lab-state-check)', async () => {
    const user = userEvent.setup();
    fakes.campaignSync.mockReturnValue({ xpGained: 15 });
    const { notify } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Dos' }));

    expect(notify.mock.calls).toEqual([['+15 XP por razonar tu predicción.']]);
  });
});
```

`frontend/src/pages/lab/ui/exercise/MissionContext.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MissionContext from './MissionContext';

const hostileTitle = 'Caché <b>"rápida"</b> & cía';

describe('MissionContext (the escape scenarios of lab-bridge-check)', () => {
  it('shows a hostile workshop title as text, never as markup', () => {
    const { container } = render(
      <MissionContext
        typeLabel="Entrenamiento"
        context={{
          kind: 'workshop',
          href: '?taller=cache&parte=build&lenguaje=rust#sistemas',
          title: hostileTitle,
          role: 'core',
          verified: false,
        }}
      />,
    );

    expect(screen.getByRole('link')).toHaveTextContent(`← ${hostileTitle}`);
    expect(container.querySelector('b')).toBeNull();
  });

  it('shows the campaign points, the type and the two seals', () => {
    const { container } = render(
      <MissionContext
        typeLabel="Entrenamiento"
        context={{
          kind: 'campaign',
          href: '?mundo=rust-world-1#campana',
          title: hostileTitle,
          points: 0,
          code: false,
          prediction: false,
        }}
      />,
    );

    expect(container.querySelector('.quest-lab-context')).toHaveTextContent(
      `← ${hostileTitle}0/30 XP · Entrenamiento○ Pruebas ○ Predicción`,
    );
    expect(container.querySelector('b')).toBeNull();
  });
});
```

`frontend/src/pages/lab/ui/explorers/LabExplorer.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { createLabSession, type LabSession } from '../../model/lab-session';
import LabExplorer from './LabExplorer';

const Harness = ({ kind }: { kind: 'channel' | 'generic' }) => {
  const [session, setSession] = useState<LabSession>(createLabSession());
  return (
    <LabExplorer
      kind={kind}
      language="rust"
      state={session.labExplorer}
      onSessionChange={(change) => setSession(change)}
    />
  );
};

describe('LabExplorer', () => {
  it('channel: a producer without buffer waits, the focus moves to the consumer and the region stays (X2)', async () => {
    const user = userEvent.setup();
    render(<Harness kind="channel" />);
    const region = screen.getByRole('status');

    await user.click(screen.getByRole('button', { name: 'Paso del productor →' }));

    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(
      'El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.0 mensajes entregados.',
    );
    expect(screen.getByRole('button', { name: 'Paso del productor →' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Paso del consumidor →' })).toHaveFocus();
  });

  it('generic: choosing a type keeps the focus on its select', async () => {
    const user = userEvent.setup();
    render(<Harness kind="generic" />);
    const select = screen.getByRole('combobox', { name: /^Le pasás/ });

    await user.selectOptions(select, 'record');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Un struct no implementa automáticamente Ord, Eq o Display.',
    );
    expect(select).toHaveFocus();
  });
});
```

`frontend/src/pages/lab/ui/explorers/QuestExplorer.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../../../../entities/exercise';
import { createLabSession, type LabSession } from '../../model/lab-session';
import QuestExplorer from './QuestExplorer';

const Harness = () => {
  const [session, setSession] = useState<LabSession>(createLabSession());
  return (
    <QuestExplorer
      exercise={{ id: 'rust-103' } as Exercise}
      info={{ language: 'rust', mode: 'robot' }}
      state={session.questExplorers.get('rust-103')}
      onSessionChange={(change) => setSession(change)}
    />
  );
};

describe('QuestExplorer', () => {
  it('a move into the wall keeps its region, the focus and a closed trace (X2)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const region = screen.getByRole('status');
    const trace = screen.getByText('Traza de decisiones · últimos 6 intentos').closest('details')!;
    trace.open = false;

    await user.click(screen.getByRole('button', { name: 'Ir al oeste: restar uno a x' }));

    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(
      'Intento 1. O → choque; seguís en (0,0), batería 4. La propuesta (-1,0) cruza el borde. Se rechaza antes de gastar: el estado se conserva.',
    );
    expect(screen.getByRole('button', { name: 'Ir al oeste: restar uno a x' })).toHaveFocus();
    expect(trace.open).toBe(false);
  });
});
```

`frontend/src/pages/lab/ui/map/LabMap.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../../../entities/exercise';
import { createLabSession, type LabSession } from '../../model/lab-session';

const fakes = vi.hoisted(() => ({ available: true }));
vi.mock('../../../../entities/exercise', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  labStore: {
    getProgress: () => ({ records: {}, selected: { rust: null, go: null } }),
    storageAvailable: () => fakes.available,
    loadWarning: () => '',
  },
}));

const { default: LabMap } = await import('./LabMap');

const catalog = [
  {
    id: 'rust-01',
    language: 'rust',
    topicId: 'a',
    topic: 'Memoria',
    stage: 1,
    title: 'Uno',
    intro: 'memoria',
    why: '',
    objective: '',
  },
  {
    id: 'rust-02',
    language: 'rust',
    topicId: 'b',
    topic: 'Errores',
    stage: 5,
    title: 'Dos',
    intro: '',
    why: '',
    objective: '',
  },
] as unknown as Exercise[];

const Harness = () => {
  const [session, setSession] = useState<LabSession>(createLabSession());
  return (
    <LabMap
      language="rust"
      catalog={catalog}
      filters={session.filters}
      selectedId={null}
      notify={vi.fn()}
      onSessionChange={(change) => setSession(change)}
      onOpen={vi.fn()}
    />
  );
};

describe('LabMap', () => {
  it('names the search in the same status region after a level (X1, X2)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const status = document.getElementById('lab-filter-status');

    await user.type(screen.getByRole('searchbox', { name: 'Buscar ejercicios' }), 'memoria');
    await user.click(screen.getByRole('button', { name: /^Inicial/ }));

    expect(document.getElementById('lab-filter-status')).toBe(status);
    expect(status).toHaveTextContent('1 desafíos visibles para tu búsqueda.');
    expect(screen.getByRole('button', { name: /^Inicial/ })).toHaveFocus();
  });

  it('warns when the storage is not available (lab-state-check)', () => {
    fakes.available = false;
    render(<Harness />);

    expect(
      screen.getByText(
        'El guardado local no está disponible. Exportá tu progreso desde Método y notas antes de cerrar.',
      ),
    ).toBeInTheDocument();
  });
});
```

`frontend/src/pages/lab/ui/lab-two-tabs.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../../entities/exercise';

const KEY = 'taller-laboratorio-v1';
const tabs = vi.hoisted(() => ({
  saved: new Map<string, string>(),
  current: null as unknown,
}));

vi.mock('../model/mission-engines', async () => ({
  saveLab: () => (tabs.current as { save(): boolean }).save(),
  syncAfterPrediction: vi.fn(),
}));
vi.mock('../../../entities/exercise', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../entities/exercise')>();
  return {
    ...original,
    get labStore() {
      return tabs.current;
    },
  };
});

const { createLabStore } = await import('../../../entities/exercise');
const { default: HintsPanel } = await import('./exercise/HintsPanel');
const { default: PredictionCard } = await import('./exercise/PredictionCard');

const exercise = (id: string) =>
  ({
    id,
    language: 'rust',
    tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
    hints: ['Primera.', 'Segunda.', 'Tercera.'],
    solution: 'fn main() {}',
    review: { success: 'Bien.', pitfall: 'Cuidado.' },
    prediction: {
      question: '¿Qué pasa?',
      options: ['Una', 'Otra'],
      answer: 1,
      explanation: 'Por eso.',
    },
  }) as unknown as Exercise;
const catalog = {
  byId: new Map(['rust-01', 'rust-02', 'rust-06'].map((id) => [id, exercise(id)])),
};
const storage = {
  getItem: (key: string) => tabs.saved.get(key) ?? null,
  setItem: (key: string, value: string) => void tabs.saved.set(key, value),
  removeItem: (key: string) => void tabs.saved.delete(key),
};
const proof = {
  solvedAt: 100,
  result: {
    code: 'solución de A',
    success: true,
    stdout: '',
    stderr: '',
    transportError: false,
    customTest: '',
    customPassed: false,
    time: 1,
    tests: ['t1', 't2', 't3'].map((id) => ({ id, passed: true })),
  },
};

function openTab() {
  const store = createLabStore();
  store.open(catalog, { storage });
  return store;
}
const stored = () => JSON.parse(tabs.saved.get(KEY) ?? '{}');

function showRust02(store: ReturnType<typeof openTab>) {
  tabs.current = store;
  const record = (store.getProgress().records['rust-02'] ??= {});
  render(
    <>
      <PredictionCard exercise={exercise('rust-02')} record={record} notify={() => undefined} />
      <HintsPanel exercise={exercise('rust-02')} record={record} onLoadSolution={() => undefined} />
    </>,
  );
}

describe('two tabs over the same storage (lab-state-check scenarios of spec 021, FR-019)', () => {
  beforeEach(() => tabs.saved.clear());

  it('a stale tab keeps the other tab progress and its own consecutive saves', async () => {
    const user = userEvent.setup();
    const tabA = openTab();
    const tabB = openTab();
    tabA.applyImport(tabA.planImport({ version: 1, records: { 'rust-01': proof } }));
    showRust02(tabB);

    await user.click(screen.getByRole('button', { name: 'Otra' }));
    await user.click(screen.getByRole('button', { name: 'Dame una pista' }));

    expect(stored().records['rust-01'].solvedAt).toBe(100);
    expect(stored().records['rust-02']).toMatchObject({
      prediction: 1,
      hints: 1,
    });
  });

  it('a lossy text from the other tab keeps the known solved exercise and leaves a backup', async () => {
    const user = userEvent.setup();
    const tab = openTab();
    const otherTabText = JSON.stringify({
      version: 1,
      records: {
        'rust-06': proof,
        'rust-999': { draft: 'ejercicio desconocido' },
      },
      selected: {},
    });
    tabs.saved.set(KEY, otherTabText);
    showRust02(tab);

    await user.click(screen.getByRole('button', { name: 'Dame una pista' }));

    expect(stored().records['rust-06'].solvedAt).toBe(100);
    expect('rust-999' in stored().records).toBe(false);
    expect(tabs.saved.get(`${KEY}:respaldo`)).toBe(otherTabText);
  });

  it('the merge happens in place, so a record held across the merging save keeps mutating', async () => {
    const user = userEvent.setup();
    const tabA = openTab();
    const tabB = openTab();
    showRust02(tabB);
    tabA.applyImport(tabA.planImport({ version: 1, records: { 'rust-01': proof } }));

    await user.click(screen.getByRole('button', { name: 'Otra' }));
    await user.click(screen.getByRole('button', { name: 'Dame una pista' }));
    await user.click(screen.getByRole('button', { name: 'Otra pista' }));

    expect(stored().records['rust-01'].solvedAt).toBe(100);
    expect(stored().records['rust-02']).toMatchObject({
      prediction: 1,
      hints: 2,
    });
  });
});
```

- **La novena spec** es `HintsPanel.spec.tsx`, chica: «Otra pista» guarda una vez, devuelve el foco al botón y deja la solución abierta (X1); con tres pistas el botón queda deshabilitado; abrir la solución escribe cada vez que se abre (rareza 6), y cerrarla no escribe. Usa los mismos dobles que `ReflectPhase.spec.tsx`.
- **Pasos:**
  1. Los stubs y las specs.
  2. `npm run test:unit -- src/pages/lab`: cada spec de componente falla por `not implemented`.
  3. `npm run typecheck`, `npm run lint` y `npm run format:check`.
  4. Commit: `test(front): las specs de componente del laboratorio, en rojo`.
- **Compuerta:** el paso 2.
- **No corrieron al planificar** (research-f7b.md, R16): si una falla en T024 por el arnés y no por la página (por ejemplo, un método que jsdom no trae), se corrige la spec, nunca el componente.

### Tarea 2.5 · La página (T024, P)

- **Escribe** los componentes, la hoja nueva y el índice del slice. El DOM es el de las funciones de `lab.js`, `lab-explorers.js` y `quest-explorers.js` en la base:
  - las mismas clases (con el mismo texto del `className` cuando hoy se arma con plantilla), los mismos ids y los mismos `aria-*`;
  - sin los `data-*` de delegación;
  - sin `type` en los botones que hoy no lo tienen (los del explorador de misión sí lo llevan);
  - con un nodo de texto donde hoy hay uno.
- **La raíz:**

`frontend/src/pages/lab/ui/LabPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useStore } from 'zustand';
import { campaignEngine, missionTypeLabel } from '../../../entities/campaign';
import {
  labStore,
  type Exercise,
  type ExerciseCatalog,
  type ExerciseLanguage,
} from '../../../entities/exercise';
import { systemsEngine } from '../../../entities/systems-workshop';
import type { ExerciseRunner, ProgramBuilder, RunState } from '../../../features/run-exercise';
import type { ExercisePhase } from '../../../shared/config/url-grammar';
import { navigateTo } from '../lib/browser';
import { showExercise } from '../model/enter-lab';
import { choosePhase, openExerciseSession, showMap, type LabSession } from '../model/lab-session';
import { replaceLabUrl } from '../model/lab-url';
import {
  backLabel,
  campaignLock,
  finishHref,
  missionContext,
  navigationList,
} from '../model/mission-bridges';
import { saveLab } from '../model/mission-engines';
import type { LabWorkshop } from '../model/types';
import CampaignLock from './CampaignLock';
import CodePhase from './exercise/CodePhase';
import ExerciseView from './exercise/ExerciseView';
import LearnPhase from './exercise/LearnPhase';
import ReflectPhase from './exercise/ReflectPhase';
import LabMap from './map/LabMap';

export interface LabPageProps {
  language: ExerciseLanguage;
  catalog: ExerciseCatalog;
  workshops: readonly LabWorkshop[];
  runner: ExerciseRunner;
  programBuilder: ProgramBuilder;
  initialSession: LabSession;
  notify: (message: string) => void;
  scrollToTop: () => void;
  onSessionChange: (session: LabSession) => void;
}

const selectRevision = (state: { revision: number }) => state.revision;
const selectRunningId = (state: RunState) => (state.status === 'running' ? state.exerciseId : null);
const EMPTY_RECORD = Object.freeze({});

const LabPage = ({
  language,
  catalog,
  workshops,
  runner,
  programBuilder,
  initialSession,
  notify,
  scrollToTop,
  onSessionChange,
}: LabPageProps) => {
  const [session, setSession] = useState(initialSession);
  const latestSession = useRef(initialSession);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Partial<Record<ExercisePhase, HTMLButtonElement | null>>>({});
  useStore(labStore.changes, selectRevision);
  useStore(campaignEngine.changes, selectRevision);
  useStore(systemsEngine.changes, selectRevision);
  const runningId = useStore(runner.state, selectRunningId);

  useEffect(() => {
    replaceLabUrl(session.mode, session.selectedId, session.phase);
  }, [session.mode, session.selectedId, session.phase]);

  const update = (change: (current: LabSession) => LabSession) => {
    const next = change(latestSession.current);
    latestSession.current = next;
    onSessionChange(next);
    setSession(next);
  };

  const exercise: Exercise | undefined =
    session.mode === 'exercise' && session.selectedId
      ? catalog.byId.get(session.selectedId)
      : undefined;

  const openExercise = (id: string) => {
    const target = catalog.byId.get(id);
    if (!target || target.language !== language) return;
    runner.abort();
    labStore.getProgress().selected[language] = id;
    saveLab();
    showExercise(target, latestSession.current.link);
    flushSync(() => update((current) => openExerciseSession(current, id)));
    scrollToTop();
    headingRef.current?.focus();
  };

  const finishNavigation = () => {
    const href = finishHref(latestSession.current.link, language);
    if (href) {
      navigateTo(href);
      return;
    }
    flushSync(() => update(showMap));
  };

  const changePhase = (phase: ExercisePhase) => {
    flushSync(() => update((current) => choosePhase(current, phase)));
    tabRefs.current[phase]?.focus({ preventScroll: true });
  };

  if (!exercise) {
    return (
      <LabMap
        language={language}
        catalog={catalog.exercises}
        filters={session.filters}
        selectedId={session.selectedId}
        notify={notify}
        onSessionChange={update}
        onOpen={openExercise}
      />
    );
  }

  const lock = campaignLock(campaignEngine, session.link, exercise);
  if (lock) return <CampaignLock access={lock} />;

  const record = labStore.getProgress().records[exercise.id] ?? EMPTY_RECORD;
  const items = navigationList(
    catalog.exercises,
    catalog.byId,
    { workshops, campaign: campaignEngine },
    session.link,
    language,
    exercise.id,
  );
  const index = items.findIndex((item) => item.id === exercise.id);
  const step = (offset: 1 | -1) => {
    const target = items[index + offset];
    if (target) openExercise(target.id);
    else finishNavigation();
  };

  return (
    <ExerciseView
      key={exercise.id}
      exercise={exercise}
      context={missionContext(
        { workshops, progress: systemsEngine, campaign: campaignEngine },
        session.link,
        exercise,
      )}
      typeLabel={missionTypeLabel(exercise.challengeType)}
      backLabel={backLabel(session.link)}
      position={index + 1}
      total={items.length}
      phase={session.phase}
      headingRef={headingRef}
      tabRefs={tabRefs}
      onBack={() => {
        runner.abort();
        finishNavigation();
        scrollToTop();
      }}
      onStep={step}
      onPhase={changePhase}
    >
      {session.phase === 'learn' && (
        <LearnPhase
          exercise={exercise}
          record={record}
          session={session}
          notify={notify}
          onSessionChange={update}
          onPhase={changePhase}
        />
      )}
      {session.phase === 'code' && (
        <CodePhase
          exercise={exercise}
          record={record}
          runner={runner}
          running={runningId !== null}
          runningHere={runningId === exercise.id}
          programBuilder={programBuilder}
          notify={notify}
          onPhase={changePhase}
        />
      )}
      {session.phase === 'reflect' && (
        <ReflectPhase
          exercise={exercise}
          record={record}
          isLast={index === items.length - 1}
          lastLabel={backLabel(session.link)}
          notify={notify}
          onPhase={changePhase}
          onNext={() => step(1)}
        />
      )}
    </ExerciseView>
  );
};

export default LabPage;
```

`frontend/src/pages/lab/ui/CampaignLock.tsx`:

```tsx
import type { CampaignLinkAccess } from '../../../entities/campaign/bridge';
import { worldHref } from '../../../shared/config/url-grammar';

const CampaignLock = ({ access }: { access: CampaignLinkAccess }) => (
  <section className="quest-direct-lock">
    <div className="eyebrow">CAMPAÑA · ACCESO A LA MISIÓN</div>
    <h1>
      Primero, las piezas
      <br />
      <em>que te preparan.</em>
    </h1>
    <p>Esta misión todavía no está disponible en tu campaña.</p>
    <ul>
      {access.reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
    <a className="button" href={access.worldId ? worldHref(access.worldId) : '#campana'}>
      Ver mi mapa →
    </a>
  </section>
);

export default CampaignLock;
```

- **El mapa** (`mapHTML`, `levelTabsHTML`, `topicsHTML`, `practiceSourcesHTML` y `curriculumHTML`):

`frontend/src/pages/lab/ui/map/LabMap.tsx`:

```tsx
import { labStore, type Exercise, type ExerciseLanguage } from '../../../../entities/exercise';
import { currentTime, pickAtRandom } from '../../lib/browser';
import {
  clearFilters,
  chooseLevel,
  searchFor,
  toggleDueOnly,
  toggleExtraOnly,
  type LabSession,
} from '../../model/lab-session';
import { surprisePool, type MapFilters } from '../../model/map-selectors';
import { filterStatus, mapStats } from '../../model/map-stats';
import LevelTabs from './LevelTabs';
import MapHeader from './MapHeader';
import PracticeSources from './PracticeSources';
import ProjectPath from './ProjectPath';
import TopicGrid from './TopicGrid';

interface LabMapProps {
  language: ExerciseLanguage;
  catalog: readonly Exercise[];
  filters: MapFilters;
  selectedId: string | null;
  notify: (message: string) => void;
  onSessionChange: (change: (session: LabSession) => LabSession) => void;
  onOpen: (id: string) => void;
}

function backupNote(catalog: readonly Exercise[]): string {
  const count = (language: ExerciseLanguage) =>
    catalog.filter((exercise) => exercise.language === language).length;
  return `${catalog.length} desafíos originales: ${count('rust')} de Rust y ${count('go')} de Go. Cada uno enlaza sus fuentes. Los puntos reconocen práctica; no certifican dominio. Todo tu avance se incluye al exportar la guía.`;
}

const LabMap = ({
  language,
  catalog,
  filters,
  selectedId,
  notify,
  onSessionChange,
  onOpen,
}: LabMapProps) => {
  const exercises = catalog.filter((exercise) => exercise.language === language);
  const records = labStore.getProgress().records;
  const now = currentTime();
  const stats = mapStats(exercises, records, filters, now);

  const surprise = () => {
    const choices = surprisePool(exercises, labStore.getProgress().records, filters, currentTime());
    if (!choices.length) {
      notify('No hay desafíos con estos filtros. Probá ampliar la búsqueda.');
      return;
    }
    onOpen(pickAtRandom(choices).id);
    notify('Un desafío elegido para tu próxima idea.');
  };

  return (
    <>
      <MapHeader
        language={language}
        total={exercises.length}
        stats={stats}
        loadWarning={labStore.loadWarning()}
        storageAvailable={labStore.storageAvailable()}
        onOpen={onOpen}
      />
      <div className="quest-banner">
        <p>
          <strong>¿Preferís aprender como una expedición?</strong>
          <br />
          Campaña suma mundos, katas, reparaciones y desafíos finales con desbloqueos.
        </p>
        <a className="button secondary" href="#campana">
          Jugar la campaña ↗
        </a>
      </div>
      <LevelTabs
        exercises={exercises}
        level={filters.level}
        onLevel={(level) => onSessionChange((session) => chooseLevel(session, level))}
      />
      <div className="lab-toolbar">
        <label className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            id="lab-search"
            name="buscar-desafio"
            autoComplete="off"
            type="search"
            value={filters.query}
            placeholder="Buscá un tema o desafío…"
            aria-label="Buscar ejercicios"
            onChange={(event) => {
              const query = event.target.value;
              onSessionChange((session) => searchFor(session, query));
            }}
          />
        </label>
        <div className="lab-toolbar-actions">
          <button
            className="button small secondary"
            aria-pressed={filters.extraOnly}
            onClick={() => onSessionChange(toggleExtraOnly)}
          >
            {`Clásicos y sistemas · ${stats.extras}`}
          </button>
          <button className="button small secondary" onClick={surprise}>
            Sorprendeme ↗
          </button>
          <button
            className="button small secondary"
            aria-pressed={filters.dueOnly}
            onClick={() => onSessionChange(toggleDueOnly)}
          >
            {`${filters.dueOnly ? 'Ver todos' : 'Repasar pendientes'}${stats.due ? ` · ${stats.due}` : ''}`}
          </button>
        </div>
      </div>
      <p id="lab-filter-status" className="lab-filter-status" role="status">
        {filterStatus(stats.visible.length, filters)}
      </p>
      <div id="lab-topic-grid" className="topic-grid">
        <TopicGrid
          exercises={exercises}
          visible={stats.visible}
          records={records}
          now={now}
          selectedId={selectedId}
          dueOnly={filters.dueOnly}
          onOpen={onOpen}
          onClear={() => onSessionChange(clearFilters)}
        />
      </div>
      <div className="lab-map-caption">
        <span>
          <i className="legend-dot" /> Resuelto con pruebas
        </span>
        <span>
          <i className="legend-dot pending" /> Repaso sugerido
        </span>
        <span>Podés explorar cualquier tema, sin bloqueos.</span>
      </div>
      <div className="lab-learning-loop">
        <div>
          <strong>01. Hacé una predicción.</strong>
          <p>Conectá la idea nueva con lo que ya sabés.</p>
        </div>
        <div>
          <strong>02. Probala en código real.</strong>
          <p>El compilador y los casos de prueba aportan evidencia.</p>
        </div>
        <div>
          <strong>03. Explicá el porqué.</strong>
          <p>Una variante y un repaso ayudan a que la idea se quede.</p>
        </div>
      </div>
      <p className="lab-backup-note">{backupNote(catalog)}</p>
      <PracticeSources language={language} />
      <ProjectPath language={language} />
    </>
  );
};

export default LabMap;
```

`frontend/src/pages/lab/ui/map/MapHeader.tsx`:

```tsx
import type { ExerciseLanguage } from '../../../../entities/exercise';
import type { MapStats } from '../../model/map-stats';

interface MapHeaderProps {
  language: ExerciseLanguage;
  total: number;
  stats: MapStats;
  loadWarning: string;
  storageAvailable: boolean;
  onOpen: (id: string) => void;
}

const MapHeader = ({
  language,
  total,
  stats,
  loadWarning,
  storageAvailable,
  onOpen,
}: MapHeaderProps) => {
  const languageName = language === 'rust' ? 'Rust' : 'Go';
  return (
    <>
      <section className="lab-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {` LABORATORIO · ${languageName.toUpperCase()}`}
          </div>
          <h1>
            Aprendé tocando.
            <br />
            <em>Entendé probando.</em>
          </h1>
          <p>
            El código lo escribís vos. Un revisor te acompaña con pruebas, pistas y el porqué de
            cada resultado. Equivocarte también hace avanzar el experimento.
          </p>
        </div>
        <div className="lab-stamp" aria-label={`${total} desafíos en ${languageName}`}>
          <span>HECHO PARA EXPLORAR</span>
          <strong>{total}</strong>
          <span>{`DESAFÍOS EN ${languageName.toUpperCase()}`}</span>
        </div>
      </section>
      <div className="lab-metrics">
        <span>
          <strong>{`${stats.solved}/${total}`}</strong>
          {' resueltos'}
        </span>
        <span>
          <strong>{stats.topics}</strong> temas
        </span>
        <span>
          <strong>{stats.points}</strong> puntos de práctica
        </span>
        <span>
          <strong>{stats.due}</strong> para repasar
        </span>
      </div>
      {!storageAvailable && (
        <div className="lab-storage-warning">
          El guardado local no está disponible. Exportá tu progreso desde Método y notas antes de
          cerrar.
        </div>
      )}
      {loadWarning && (
        <div className="lab-storage-warning">
          {`${loadWarning} Exportá tu progreso desde Método y notas para conservar lo que sigue.`}
        </div>
      )}
      <div className="lab-continue">
        <div>
          <span className="small-label">UN DESAFÍO PARA HOY</span>
          <h2>{stats.next?.title || 'Tu próximo experimento'}</h2>
          <p>{stats.next?.objective || ''}</p>
        </div>
        <button className="button" onClick={() => stats.next && onOpen(stats.next.id)}>
          {`${stats.solved ? 'Seguir aprendiendo' : 'Entrar al laboratorio'} ↗`}
        </button>
      </div>
    </>
  );
};

export default MapHeader;
```

`frontend/src/pages/lab/ui/map/LevelTabs.tsx`:

```tsx
import { levelOf, type Exercise } from '../../../../entities/exercise';
import type { LevelId } from '../../../../shared/config/levels';
import type { LevelFilter } from '../../model/map-selectors';

const LEVELS: readonly (readonly [LevelId, string, string])[] = [
  ['beginner', 'Inicial', 'Entendé las piezas'],
  ['medium', 'Intermedio', 'Conectá las ideas'],
  ['advanced', 'Avanzado', 'Elegí con criterio'],
  ['expert', 'Experto', 'Razoná sobre los límites'],
];

interface LevelTabsProps {
  exercises: readonly Exercise[];
  level: LevelFilter;
  onLevel: (level: LevelFilter) => void;
}

const LevelTabs = ({ exercises, level, onLevel }: LevelTabsProps) => (
  <>
    <div className="lab-levels" role="group" aria-label="Nivel de aprendizaje">
      <button aria-pressed={level === 'all'} onClick={() => onLevel('all')}>
        <strong>Todos los niveles</strong>
        <span>{`${exercises.length} desafíos · a tu ritmo`}</span>
      </button>
      {LEVELS.map(([id, title, subtitle]) => (
        <button key={id} aria-pressed={level === id} onClick={() => onLevel(id)}>
          <strong>
            {title}
            <small>{exercises.filter((exercise) => levelOf(exercise) === id).length}</small>
          </strong>
          <span>{subtitle}</span>
        </button>
      ))}
    </div>
    <p className="lab-level-note">
      Los niveles describen la complejidad de los desafíos. Podés saltar, volver y mezclar temas;
      completar una etapa no certifica experiencia profesional.
    </p>
  </>
);

export default LevelTabs;
```

`frontend/src/pages/lab/ui/map/TopicGrid.tsx`:

```tsx
import { isDueForReview, isSolved, levelOf, type Exercise } from '../../../../entities/exercise';
import { LEVEL_LABELS } from '../../../../shared/config/levels';
import type { LabRecords } from '../../model/map-selectors';

interface TopicGridProps {
  exercises: readonly Exercise[];
  visible: readonly Exercise[];
  records: LabRecords;
  now: number;
  selectedId: string | null;
  dueOnly: boolean;
  onOpen: (id: string) => void;
  onClear: () => void;
}

interface TopicNodeProps {
  exercise: Exercise;
  solved: boolean;
  due: boolean;
  current: boolean;
  onOpen: (id: string) => void;
}

const TopicNode = ({ exercise, solved, due, current, onOpen }: TopicNodeProps) => (
  <button
    className={`challenge-node ${solved ? 'is-complete' : ''} ${due ? 'is-due' : ''} ${current ? 'is-current' : ''}`}
    title={exercise.title}
    aria-label={`${solved ? 'Resuelto. ' : ''}${exercise.title}`}
    onClick={() => onOpen(exercise.id)}
  >
    {solved ? '✓' : exercise.id.split('-').pop()}
  </button>
);

const TopicGrid = ({
  exercises,
  visible,
  records,
  now,
  selectedId,
  dueOnly,
  onOpen,
  onClear,
}: TopicGridProps) => {
  const topics = [...new Set(visible.map((exercise) => exercise.topicId))];
  if (!topics.length) {
    return (
      <div className="lab-empty">
        <h2>{dueOnly ? 'Hoy no tenés repasos vencidos.' : 'No encontré ese desafío.'}</h2>
        <p>
          {dueOnly
            ? 'Podés avanzar, repetir uno resuelto o elegir un experimento al azar.'
            : 'Probá buscar “errores”, “slices”, “memoria” o un título.'}
        </p>
        <button className="button secondary" onClick={onClear}>
          Ver todos los desafíos
        </button>
      </div>
    );
  }
  return topics.map((topic) => {
    const group = visible.filter((exercise) => exercise.topicId === topic);
    const first = group[0];
    const total = exercises.filter((exercise) => exercise.topicId === topic);
    const solvedTotal = total.filter((exercise) => isSolved(records[exercise.id])).length;
    return (
      <article className="topic-card" key={topic}>
        <span className="topic-level">{LEVEL_LABELS[levelOf(first)]}</span>
        <div className="topic-head">
          <span className="topic-index">{String(first.stage).padStart(2, '0')}</span>
          <h2>{first.topic}</h2>
          <span className="topic-fraction">{`${solvedTotal}/${total.length}`}</span>
        </div>
        <div className="challenge-nodes">
          {group.map((exercise) => (
            <TopicNode
              key={exercise.id}
              exercise={exercise}
              solved={isSolved(records[exercise.id])}
              due={isDueForReview(records[exercise.id], now)}
              current={exercise.id === selectedId}
              onOpen={onOpen}
            />
          ))}
        </div>
        <p className="topic-note">{group.map((exercise) => exercise.title).join(' · ')}</p>
      </article>
    );
  });
};

export default TopicGrid;
```

`frontend/src/pages/lab/ui/map/PracticeSources.tsx`:

```tsx
import type { ExerciseLanguage } from '../../../../entities/exercise';
import { PRACTICE_SOURCES } from '../../model/practice-content';

const COMMUNITY_LINK = { target: '_blank', rel: 'noopener noreferrer' } as const;

const CommunityExperience = ({ language }: { language: ExerciseLanguage }) =>
  language === 'rust' ? (
    <>
      {'En '}
      <a
        href="https://www.reddit.com/r/learnrust/comments/1tknvle/where_should_i_learn_rust/"
        {...COMMUNITY_LINK}
      >
        esta conversación de r/learnrust (mayo de 2026)
      </a>
      , algunas personas recomiendan acompañar las lecturas con Rustlings y proyectos pequeños.
    </>
  ) : (
    <>
      {'La '}
      <a href="https://go.dev/wiki/Learn" {...COMMUNITY_LINK}>
        Go Wiki
      </a>
      {' incluye estos recursos de la comunidad. En el '}
      <a href="https://forum.exercism.org/t/tdd-and-the-golang-track/11535" {...COMMUNITY_LINK}>
        foro de Exercism
      </a>
      {' se discute la diferencia entre resolver pruebas dadas y aprender a escribir las propias.'}
    </>
  );

const PracticeSources = ({ language }: { language: ExerciseLanguage }) => (
  <section className="lab-practice-sources">
    <div className="eyebrow">MÁS PRÁCTICA, CON UN PROPÓSITO</div>
    <h2>Del ejercicio a tu propia idea.</h2>
    <p>
      Alterná un desafío corto con una variante tuya. Cuando puedas explicar por qué funciona, llevá
      esa misma idea a un proyecto pequeño.
    </p>
    <div className="practice-source-grid">
      {PRACTICE_SOURCES[language].map((source) => (
        <article key={source.url}>
          <span className="small-label">{source.purpose}</span>
          <h3>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {`${source.title} ↗`}
            </a>
          </h3>
          <p>{source.description}</p>
        </article>
      ))}
    </div>
    <details className="lab-community-notes">
      <summary>Qué tomamos de estos recorridos y de la comunidad</summary>
      <p>
        Los desafíos de este taller son originales. Combinan conceptos, reparaciones, problemas
        clásicos y mini sistemas: inspirados en los formatos de práctica de estos recursos, con
        documentación oficial en cada ejercicio.
      </p>
      <p>
        <CommunityExperience language={language} />
        {
          ' Son referencias y experiencias, no un ranking ni una garantía de resultados. Por eso podés crear tus propios casos y elegir qué dificultad practicar.'
        }
      </p>
    </details>
  </section>
);

export default PracticeSources;
```

`frontend/src/pages/lab/ui/map/ProjectPath.tsx`:

```tsx
import type { ExerciseLanguage } from '../../../../entities/exercise';
import { PROJECT_MISSIONS } from '../../model/practice-content';

const INSPIRATION_SOURCES: readonly (readonly [string, string])[] = [
  [
    'https://contribute.freecodecamp.org/how-to-work-on-coding-challenges/',
    'freeCodeCamp · organización de desafíos ↗',
  ],
  [
    'https://support.leetcode.com/hc/en-us/articles/32442719377939-How-to-create-test-cases-on-LeetCode',
    'LeetCode · casos propios ↗',
  ],
  [
    'https://help.codecademy.com/hc/en-us/articles/23400751016859-AI-Features-available-on-Codecademy',
    'Codecademy · acompañamiento y pistas ↗',
  ],
  [
    'https://www.educative.io/courses/rust-programming-language',
    'Educative · curso interactivo de Rust ↗',
  ],
  [
    'https://learn.replit.com/docs/ai-foundations/lesson-4',
    'Replit · construir y probar en el navegador ↗',
  ],
];

const ProjectPath = ({ language }: { language: ExerciseLanguage }) => (
  <section className="lab-project-path">
    <div className="eyebrow">DEL EXPERIMENTO AL SISTEMA REAL</div>
    <h2>El mapa sigue fuera del navegador.</h2>
    <p>
      Los desafíos cubren conceptos del lenguaje con código ejecutable. Herramientas, dependencias,
      red, archivos y rendimiento necesitan además proyectos en tu entorno. Estas misiones completan
      ese recorrido; su evaluación es manual.
    </p>
    <div className="mission-grid">
      {PROJECT_MISSIONS[language].map((mission) => (
        <details className="mission-card" key={mission.title}>
          <summary>
            <span className="topic-level">{mission.level}</span>
            <strong>{mission.title}</strong>
            <small>{mission.topics}</small>
          </summary>
          <p>{mission.why}</p>
          <p>
            <strong>Cómo comprobarlo:</strong>
            {` ${mission.check}`}
          </p>
          <a href={mission.url} target="_blank" rel="noopener noreferrer">
            {`${mission.label} ↗`}
          </a>
        </details>
      ))}
    </div>
    <details className="lab-inspiration">
      <summary>Cómo está diseñado este taller y de dónde salen las ideas</summary>
      <p>
        Contenido y ejercicios originales, con fuentes oficiales en cada desafío. Tomamos como
        referencia el ciclo de consigna, código, pruebas y explicación; las soluciones se ejecutan
        con compiladores reales.
      </p>
      <div className="concept-sources">
        {INSPIRATION_SOURCES.map(([href, label]) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ))}
      </div>
      <p>
        Este revisor usa diagnósticos del compilador, pruebas y explicaciones preparadas. No incluye
        un servicio de IA conversacional ni evalúa automáticamente tus reflexiones.
      </p>
    </details>
  </section>
);

export default ProjectPath;
```

- **El ejercicio** (`exerciseHTML`, `learnHTML`, `codeHTML`, `reviewHTML`, `testsHTML`, `reflectHTML` y `askConfirmation`):

`frontend/src/pages/lab/ui/exercise/ExerciseView.tsx`:

```tsx
import type { ReactNode, RefObject } from 'react';
import { levelOf, type Exercise } from '../../../../entities/exercise';
import { LEVEL_LABELS } from '../../../../shared/config/levels';
import type { ExercisePhase } from '../../../../shared/config/url-grammar';
import type { MissionContextView } from '../../model/mission-bridges';
import MissionContext from './MissionContext';
import PhaseTabs, { type TabRefs } from './PhaseTabs';

interface ExerciseViewProps {
  exercise: Exercise;
  context: MissionContextView | null;
  typeLabel: string;
  backLabel: string;
  position: number;
  total: number;
  phase: ExercisePhase;
  headingRef: RefObject<HTMLHeadingElement | null>;
  tabRefs: TabRefs;
  onBack: () => void;
  onStep: (offset: 1 | -1) => void;
  onPhase: (phase: ExercisePhase) => void;
  children: ReactNode;
}

const ExerciseView = ({
  exercise,
  context,
  typeLabel,
  backLabel,
  position,
  total,
  phase,
  headingRef,
  tabRefs,
  onBack,
  onStep,
  onPhase,
  children,
}: ExerciseViewProps) => (
  <>
    {context && <MissionContext context={context} typeLabel={typeLabel} />}
    <div className="lab-breadcrumb">
      <button className="lab-back" onClick={onBack}>
        {`← ${backLabel}`}
      </button>
      <div className="lab-next-controls">
        <span className="small-label">{`${position} / ${total}`}</span>
        <button
          aria-label="Ejercicio anterior"
          disabled={position === 1}
          onClick={() => onStep(-1)}
        >
          ←
        </button>
        <button
          aria-label="Ejercicio siguiente"
          disabled={position === total}
          onClick={() => onStep(1)}
        >
          →
        </button>
      </div>
    </div>
    <header className="lab-exercise-heading">
      <div className="eyebrow">
        {[
          exercise.language === 'rust' ? 'RUST' : 'GO',
          LEVEL_LABELS[levelOf(exercise)],
          exercise.topic,
          exercise.kind === 'reparar' ? 'REPARÁ EL CÓDIGO' : 'CONSTRUÍ UNA SOLUCIÓN',
        ].join(' / ')}
      </div>
      <h1 tabIndex={-1} ref={headingRef}>
        {exercise.title}
      </h1>
      <p>{exercise.objective}</p>
    </header>
    <PhaseTabs phase={phase} tabRefs={tabRefs} onPhase={onPhase} />
    <div id="lab-phase-panel" role="tabpanel" aria-labelledby={`lab-tab-${phase}`}>
      {children}
    </div>
  </>
);

export default ExerciseView;
```

`frontend/src/pages/lab/ui/exercise/MissionContext.tsx`:

```tsx
import type { MissionContextView } from '../../model/mission-bridges';

interface MissionContextProps {
  context: MissionContextView;
  typeLabel: string;
}

const MissionContext = ({ context, typeLabel }: MissionContextProps) => (
  <div className="quest-lab-context">
    <a href={context.href}>{`← ${context.title}`}</a>
    {context.kind === 'workshop' ? (
      <>
        <span>{context.role === 'core' ? 'Núcleo del taller' : 'Herramienta previa'}</span>
        <span>
          {context.verified ? '✓ Núcleo verificado' : 'Tres pruebas para verificar el núcleo'}
        </span>
      </>
    ) : (
      <>
        <span>{`${context.points}/30 XP · ${typeLabel}`}</span>
        <span>
          {`${context.code ? '✓' : '○'} Pruebas ${context.prediction ? '✓' : '○'} Predicción`}
        </span>
      </>
    )}
  </div>
);

export default MissionContext;
```

`frontend/src/pages/lab/ui/exercise/PhaseTabs.tsx`:

```tsx
import type { KeyboardEvent, RefObject } from 'react';
import type { ExercisePhase } from '../../../../shared/config/url-grammar';

const PHASES: readonly (readonly [ExercisePhase, string])[] = [
  ['learn', 'Descubrí'],
  ['code', 'Experimentá'],
  ['reflect', 'Explicá'],
];
const PHASE_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

export type TabRefs = RefObject<Partial<Record<ExercisePhase, HTMLButtonElement | null>>>;

interface PhaseTabsProps {
  phase: ExercisePhase;
  tabRefs: TabRefs;
  onPhase: (phase: ExercisePhase) => void;
}

function phaseAfterKey(phase: ExercisePhase, key: string): ExercisePhase {
  const index = PHASES.findIndex(([id]) => id === phase);
  if (key === 'Home') return PHASES[0][0];
  if (key === 'End') return PHASES[2][0];
  return PHASES[(index + (key === 'ArrowRight' ? 1 : 2)) % 3][0];
}

const PhaseTabs = ({ phase, tabRefs, onPhase }: PhaseTabsProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!PHASE_KEYS.includes(event.key)) return;
    event.preventDefault();
    onPhase(phaseAfterKey(phase, event.key));
  };

  return (
    <div className="lab-tabs" role="tablist" aria-label="Pasos del desafío">
      {PHASES.map(([id, title], index) => (
        <button
          key={id}
          id={`lab-tab-${id}`}
          className="lab-tab"
          role="tab"
          aria-selected={phase === id}
          aria-controls="lab-phase-panel"
          tabIndex={phase === id ? 0 : -1}
          ref={(node) => {
            tabRefs.current[id] = node;
          }}
          onClick={() => onPhase(id)}
          onKeyDown={onKeyDown}
        >
          <span>{`0${index + 1}`}</span>
          {` ${title}`}
        </button>
      ))}
    </div>
  );
};

export default PhaseTabs;
```

`frontend/src/pages/lab/ui/exercise/LearnPhase.tsx`:

```tsx
import type { Exercise, LabRecord } from '../../../../entities/exercise';
import { questExplorerOf } from '../../../../entities/exercise/explorers';
import type { ExercisePhase } from '../../../../shared/config/url-grammar';
import type { LabSession, SessionChange } from '../../model/lab-session';
import LabExplorerSlot from '../explorers/LabExplorerSlot';
import QuestExplorer from '../explorers/QuestExplorer';
import ConceptSources from './ConceptSources';
import PredictionCard from './PredictionCard';

interface LearnPhaseProps {
  exercise: Exercise;
  record: LabRecord;
  session: LabSession;
  notify: (message: string) => void;
  onSessionChange: SessionChange;
  onPhase: (phase: ExercisePhase) => void;
}

const LearnPhase = ({
  exercise,
  record,
  session,
  notify,
  onSessionChange,
  onPhase,
}: LearnPhaseProps) => {
  const quest = questExplorerOf(exercise.id);
  return (
    <>
      <div className="lab-concept-layout">
        <article className="concept-article">
          <h2>La idea que vas a probar.</h2>
          <p>{exercise.intro}</p>
          <div className="concept-why">
            <h3>¿Por qué funciona así?</h3>
            <p>{exercise.why}</p>
          </div>
          <ConceptSources sources={exercise.sources} />
          {!quest && (
            <LabExplorerSlot
              exercise={exercise}
              session={session}
              onSessionChange={onSessionChange}
            />
          )}
        </article>
        <PredictionCard exercise={exercise} record={record} notify={notify} />
      </div>
      {quest && (
        <QuestExplorer
          exercise={exercise}
          info={quest}
          state={session.questExplorers.get(exercise.id)}
          onSessionChange={onSessionChange}
        />
      )}
      <div className="lab-phase-footer">
        <p>
          Podés volver a esta explicación mientras programás. Acertar a la primera no es el
          objetivo.
        </p>
        <button className="button" onClick={() => onPhase('code')}>
          Probarlo en código →
        </button>
      </div>
    </>
  );
};

export default LearnPhase;
```

`frontend/src/pages/lab/ui/exercise/ConceptSources.tsx`:

```tsx
import type { ExerciseSource } from '../../../../entities/exercise';

const ConceptSources = ({ sources }: { sources: readonly ExerciseSource[] }) => (
  <div className="concept-sources">
    <span className="small-label">PARA SEGUIR EL HILO</span>
    {sources.map((source) => (
      <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
        {`${source.title} ↗`}
      </a>
    ))}
  </div>
);

export default ConceptSources;
```

`frontend/src/pages/lab/ui/exercise/PredictionCard.tsx`:

```tsx
import {
  ensureRecord,
  labStore,
  predictionPatch,
  type Exercise,
  type LabRecord,
} from '../../../../entities/exercise';
import { saveLab, syncAfterPrediction } from '../../model/mission-engines';
import { viewOf } from '../../model/record-view';

interface PredictionCardProps {
  exercise: Exercise;
  record: LabRecord;
  notify: (message: string) => void;
}

const PredictionFeedback = ({ exercise, record }: Omit<PredictionCardProps, 'notify'>) => {
  const { prediction } = viewOf(record);
  if (prediction === undefined) return null;
  const correct = prediction === exercise.prediction.answer;
  return (
    <div className={`prediction-response ${correct ? 'is-right' : ''}`}>
      <strong>{correct ? 'Esa es la idea.' : 'Veamos qué cambia.'}</strong>
      <br />
      {exercise.prediction.explanation}
    </div>
  );
};

const PredictionCard = ({ exercise, record, notify }: PredictionCardProps) => {
  const { prediction } = viewOf(record);
  const predict = (answer: number) => {
    const current = ensureRecord(labStore.getProgress(), exercise.id);
    Object.assign(current, predictionPatch(exercise, answer));
    saveLab();
    syncAfterPrediction(exercise, notify);
  };

  return (
    <section className="prediction-card">
      <span className="small-label">PRIMERO, TU HIPÓTESIS</span>
      <h2>Antes de tocar el código…</h2>
      <p className="prediction-question">{exercise.prediction.question}</p>
      <div className="lab-predictions">
        {exercise.prediction.options.map((option, index) => (
          <button
            key={index}
            className={`lab-prediction ${prediction === index && index === exercise.prediction.answer ? 'is-right' : ''}`}
            aria-pressed={prediction === index}
            onClick={() => predict(index)}
          >
            {option}
          </button>
        ))}
      </div>
      <div id="lab-prediction-feedback" aria-live="polite">
        <PredictionFeedback exercise={exercise} record={record} />
      </div>
    </section>
  );
};

export default PredictionCard;
```

`frontend/src/pages/lab/ui/exercise/CodePhase.tsx`:

```tsx
import { useRef, useState } from 'react';
import {
  draftOf,
  ensureRecord,
  labStore,
  loadSolutionPatch,
  normalizeCustomTest,
  restoreStarterPatch,
  type Exercise,
  type LabRecord,
} from '../../../../entities/exercise';
import type { ExerciseRunner, ProgramBuilder } from '../../../../features/run-exercise';
import type { ExercisePhase } from '../../../../shared/config/url-grammar';
import { useCodeEditor } from '../../../../shared/ui/code-editor';
import { preformatted } from '../../lib/browser';
import { copyText } from '../../lib/copy-text';
import { saveLab } from '../../model/mission-engines';
import { viewOf } from '../../model/record-view';
import ConfirmDialog, { type Confirmation } from './ConfirmDialog';
import CustomTestPanel from './CustomTestPanel';
import ExecutionGuide from './ExecutionGuide';
import HintsPanel from './HintsPanel';
import Review from './Review';

const DRAFT_LIMIT = 30000;
const RESTORE_COPY = {
  title: '¿Volver al código inicial?',
  message:
    'Se reemplazará el borrador de este ejercicio. Tus resultados anteriores y notas se conservan.',
};
const LOAD_SOLUTION_COPY = {
  title: '¿Cargar la solución de apoyo?',
  message:
    'Reemplazará tu borrador. Probá ejecutarla y cambiar una condición para comprobar que entendiste la idea.',
};

interface CodePhaseProps {
  exercise: Exercise;
  record: LabRecord;
  runner: ExerciseRunner;
  running: boolean;
  runningHere: boolean;
  programBuilder: ProgramBuilder;
  notify: (message: string) => void;
  onPhase: (phase: ExercisePhase) => void;
}

const CodePhase = ({
  exercise,
  record,
  runner,
  running,
  runningHere,
  programBuilder,
  notify,
  onPhase,
}: CodePhaseProps) => {
  const languageName = exercise.language === 'rust' ? 'Rust' : 'Go';
  const runButtonRef = useRef<HTMLButtonElement>(null);
  const customPanelRef = useRef<HTMLDetailsElement>(null);
  const customInputRef = useRef<HTMLTextAreaElement>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const program = programBuilder(
    exercise,
    draftOf(exercise, record),
    normalizeCustomTest(record.customTest),
  );

  const run = () => void runner.run(exercise);

  const writeField = (field: 'draft' | 'customTest', value: string) => {
    ensureRecord(labStore.getProgress(), exercise.id)[field] = value;
    saveLab();
  };

  const { hostRef, editor } = useCodeEditor({
    language: exercise.language,
    initialText: draftOf(exercise, record),
    maxLength: DRAFT_LIMIT,
    label: `Editor de código ${languageName}`,
    onChange: (text) => writeField('draft', text),
    onRun: () => run(),
    onEscape: () => runButtonRef.current?.focus(),
  });

  const replaceDraft = (patch: { draft: string }) => {
    Object.assign(ensureRecord(labStore.getProgress(), exercise.id), patch);
    saveLab();
    editor.replaceText(patch.draft);
    editor.focus();
  };

  const confirm = (copy: { title: string; message: string }, onConfirm: () => void) =>
    setConfirmation({
      ...copy,
      returnFocus: document.activeElement as HTMLElement | null,
      onConfirm,
    });

  const inventVariant = (testId: string) => {
    const test = exercise.tests.find((candidate) => candidate.id === testId);
    const input = customInputRef.current;
    if (!test || !input) return;
    const current = viewOf(ensureRecord(labStore.getProgress(), exercise.id));
    const hasCustom = Boolean(current.customTest.trim());
    if (!hasCustom) {
      input.value = test.expression;
      writeField('customTest', test.expression);
    }
    if (customPanelRef.current) customPanelRef.current.open = true;
    input.focus();
    input.select();
    input.scrollIntoView({ block: 'center' });
    notify(
      hasCustom
        ? 'Conservé tu caso extra. Podés editarlo o borrarlo para partir de otra prueba.'
        : 'Cambiá una entrada o expectativa y ejecutá. Tu caso extra se revisa por separado.',
    );
  };

  return (
    <>
      <ExecutionGuide />
      <div className="lab-workbench">
        <div>
          <section className="lab-task">
            <h2>Tu misión.</h2>
            <ol>
              {exercise.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </section>
          <div className="editor-shell">
            <div className="editor-toolbar">
              <span className="editor-file">
                {exercise.language === 'rust' ? 'experimento.rs' : 'experimento.go'}
              </span>
              <button
                onClick={() =>
                  confirm(RESTORE_COPY, () => replaceDraft(restoreStarterPatch(exercise)))
                }
              >
                Restaurar inicio ↺
              </button>
            </div>
            <div className="editor-wrapper cm-enhanced" ref={hostRef} />
            <div className="editor-footer">
              <span>Tab: sangría · Ctrl/⌘ + Enter: revisar · Esc: salir del editor</span>
              <span id="lab-editor-status">
                {labStore.storageAvailable() ? 'Borrador guardado' : 'Exportá para conservar'}
              </span>
            </div>
          </div>
          <div className="lab-run-bar">
            <button
              id="lab-run"
              className="button"
              disabled={running}
              ref={runButtonRef}
              onClick={run}
            >
              {running ? (
                <>
                  <span className="lab-spinner" aria-hidden="true" /> Revisando…
                </>
              ) : (
                '▷ Ejecutar y revisar'
              )}
            </button>
            <button className="text-button" onClick={() => void copyText(program, notify)}>
              Copiar programa completo ↗
            </button>
          </div>
          <p className="lab-run-disclosure">
            {'Al ejecutar, se envía este código al '}
            <a
              href={
                exercise.language === 'rust'
                  ? 'https://play.rust-lang.org/'
                  : 'https://go.dev/play/'
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {`Playground oficial de ${languageName}`}
            </a>
            . Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las
            funciones del ejercicio.
          </p>
          <details className="lab-program-preview">
            <summary>Ver el programa completo y sus pruebas</summary>
            <p>
              Este es el código que se enviará al ejecutar. Incluye tu borrador, la entrada del
              programa y las comprobaciones. Los números de línea del compilador corresponden a este
              programa completo. Podés copiarlo y explorar cómo cada condición produce un resultado.
            </p>
            <pre
              id="lab-program-source"
              tabIndex={0}
              aria-label="Programa completo con pruebas"
              translate="no"
            >
              {preformatted(program)}
            </pre>
          </details>
          <CustomTestPanel
            exercise={exercise}
            initialValue={viewOf(record).customTest}
            languageName={languageName}
            panelRef={customPanelRef}
            inputRef={customInputRef}
            onChange={(value) => writeField('customTest', value)}
          />
          <HintsPanel
            exercise={exercise}
            record={record}
            onLoadSolution={() =>
              confirm(LOAD_SOLUTION_COPY, () => replaceDraft(loadSolutionPatch(exercise)))
            }
          />
        </div>
        <aside className="lab-coach" aria-label="Revisión del ejercicio">
          <div className="coach-heading">
            <div className="coach-avatar" aria-hidden="true">
              [?]
            </div>
            <div>
              <h2>Tu revisor didáctico</h2>
              <span>COMPILADOR + CASOS EXPLICADOS</span>
            </div>
          </div>
          <div className="coach-content" id="lab-review" aria-live="polite">
            <Review
              exercise={exercise}
              record={record}
              running={runningHere}
              onCancel={() => runner.cancel()}
              onVariant={inventVariant}
              onPhase={onPhase}
            />
          </div>
        </aside>
      </div>
      <div className="lab-phase-footer">
        <p>
          Que compile es el primer paso. Abrí cada prueba para entender qué comprueba y qué deja
          afuera.
        </p>
        <button className="button secondary" onClick={() => onPhase('reflect')}>
          Ponerlo en palabras →
        </button>
      </div>
      {confirmation && (
        <ConfirmDialog confirmation={confirmation} onDone={() => setConfirmation(null)} />
      )}
    </>
  );
};

export default CodePhase;
```

`frontend/src/pages/lab/ui/exercise/ExecutionGuide.tsx`:

```tsx
const ExecutionGuide = () => (
  <details className="lab-execution-guide">
    <summary>
      <span className="execution-dot" aria-hidden="true" />
      {' Pruebas reales al ejecutar '}
      <span className="execution-guide-label">¿Cómo funciona?</span>
    </summary>
    <div className="execution-steps">
      <div>
        <strong>01 · Escribí una hipótesis</strong>
        <p>
          {'El editor guarda tu borrador y ofrece ayuda de sintaxis. Las pruebas se lanzan con '}
          <b>Ejecutar y revisar</b> o Ctrl/⌘ + Enter; no con cada tecla.
        </p>
      </div>
      <div>
        <strong>02 · Compilá y comprobá</strong>
        <p>
          El Playground oficial compila tu programa y ejecuta los tres casos. Cada expresión debe
          dar <code>true</code>. Podés abrir las pruebas antes de resolverlas y agregar un caso
          propio.
        </p>
      </div>
      <div>
        <strong>03 · Entendé y volvé a probar</strong>
        <p>
          Si no compila, leé el diagnóstico. Si un caso falla, contrastá su condición y su porqué.
          Cuando pasan, simplificá tu solución y ejecutá otra vez.
        </p>
      </div>
    </div>
    <p className="execution-scope">
      Son comprobaciones de comportamiento dentro de un programa generado por el taller. No se
      ejecuta un proyecto completo con cargo test o go test. El revisor usa explicaciones
      preparadas; los modelos visuales son simulaciones del concepto.
    </p>
  </details>
);

export default ExecutionGuide;
```

`frontend/src/pages/lab/ui/exercise/CustomTestPanel.tsx`:

```tsx
import { useState, type RefObject } from 'react';
import type { Exercise } from '../../../../entities/exercise';

interface CustomTestPanelProps {
  exercise: Exercise;
  initialValue: string;
  languageName: string;
  panelRef: RefObject<HTMLDetailsElement | null>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
}

const CustomTestPanel = ({
  exercise,
  initialValue,
  languageName,
  panelRef,
  inputRef,
  onChange,
}: CustomTestPanelProps) => {
  const [initiallyOpen] = useState(Boolean(initialValue));
  return (
    <details className="custom-test-panel" open={initiallyOpen} ref={panelRef}>
      <summary>＋ Inventá tu propio caso</summary>
      <p>
        Elegí un límite, un valor vacío o una hipótesis distinta. Escribí una expresión que devuelva
        true si tu expectativa se cumple; se ejecuta junto a las pruebas.
      </p>
      <label htmlFor="lab-custom-test">{`Tu hipótesis en ${languageName}`}</label>
      <textarea
        id="lab-custom-test"
        name="caso-propio"
        autoComplete="off"
        translate="no"
        maxLength={3000}
        spellCheck={false}
        placeholder={exercise.tests[0].expression}
        defaultValue={initialValue}
        ref={inputRef}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>
        Podés adaptar el ejemplo de arriba. Usá las funciones del ejercicio y sus imports
        disponibles. Borrá este campo para desactivar el caso.
      </small>
    </details>
  );
};

export default CustomTestPanel;
```

`frontend/src/pages/lab/ui/exercise/HintsPanel.tsx`:

```tsx
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  HINT_LIMIT,
  ensureRecord,
  hintPatch,
  labStore,
  revealSolutionPatch,
  type Exercise,
  type LabRecord,
} from '../../../../entities/exercise';
import { preformatted } from '../../lib/browser';
import { saveLab } from '../../model/mission-engines';
import { viewOf } from '../../model/record-view';

interface HintsPanelProps {
  exercise: Exercise;
  record: LabRecord;
  onLoadSolution: () => void;
}

const HintsPanel = ({ exercise, record, onLoadSolution }: HintsPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const hintButtonRef = useRef<HTMLButtonElement>(null);
  const solutionRef = useRef<HTMLDetailsElement>(null);
  const { hints } = viewOf(record);

  const askHint = () => {
    flushSync(() => {
      const current = ensureRecord(labStore.getProgress(), exercise.id);
      Object.assign(current, hintPatch(current));
      saveLab();
    });
    hintButtonRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({ block: 'nearest' });
  };

  const revealSolution = () => {
    if (solutionRef.current?.open) return;
    Object.assign(ensureRecord(labStore.getProgress(), exercise.id), revealSolutionPatch());
    saveLab();
  };

  return (
    <div className="lab-hints" ref={panelRef}>
      <div className="hints-top">
        <h3>Un empujón, si lo necesitás.</h3>
        <span>{`${hints}/3 pistas`}</span>
      </div>
      {exercise.hints.slice(0, hints).map((hint, index) => (
        <div className="hint-item" key={index}>
          <strong>{`PISTA ${index + 1}`}</strong>
          {hint}
        </div>
      ))}
      <button
        className="button small secondary"
        disabled={hints >= HINT_LIMIT}
        ref={hintButtonRef}
        onClick={askHint}
      >
        {hints ? 'Otra pista' : 'Dame una pista'}
      </button>
      <details className="solution-panel" id="lab-solution" ref={solutionRef}>
        <summary onClick={revealSolution}>Ver una solución razonada</summary>
        <p>
          Usarla como apoyo es válido. Después cerrala y reconstruí la idea. Este intento quedará
          identificado como práctica con solución.
        </p>
        <pre className="solution-code" translate="no">
          {preformatted(exercise.solution)}
        </pre>
        <p>{exercise.review.success}</p>
        <button className="button small secondary" onClick={onLoadSolution}>
          Cargarla y experimentar
        </button>
      </details>
    </div>
  );
};

export default HintsPanel;
```

`frontend/src/pages/lab/ui/exercise/ConfirmDialog.tsx`:

```tsx
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface Confirmation {
  title: string;
  message: string;
  returnFocus: HTMLElement | null;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  confirmation: Confirmation;
  onDone: () => void;
}

const ConfirmDialog = ({ confirmation, onDone }: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const keep = () => {
    dialogRef.current?.close();
    onDone();
    confirmation.returnFocus?.focus();
  };

  const proceed = () => {
    dialogRef.current?.close();
    onDone();
    confirmation.onConfirm();
  };

  return createPortal(
    <dialog
      id="lab-confirm-dialog"
      className="lab-modal"
      aria-labelledby="lab-confirm-title"
      ref={dialogRef}
      onClose={onDone}
    >
      <div className="dialog-content">
        <h2 id="lab-confirm-title">{confirmation.title}</h2>
        <p>{confirmation.message}</p>
        <div className="dialog-actions">
          <button className="button secondary" onClick={keep}>
            Conservar mi código
          </button>
          <button className="button" onClick={proceed}>
            Continuar
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};

export default ConfirmDialog;
```

`frontend/src/pages/lab/ui/exercise/Review.tsx`:

```tsx
import {
  draftOf,
  liveHint,
  reviewStateOf,
  type Exercise,
  type LabRecord,
  type LabResultV1,
  type ReviewState,
} from '../../../../entities/exercise';
import type { ExercisePhase } from '../../../../shared/config/url-grammar';
import { preformatted } from '../../lib/browser';
import { viewOf } from '../../model/record-view';
import TestList from './TestList';

interface ReviewProps {
  exercise: Exercise;
  record: LabRecord;
  running: boolean;
  onCancel: () => void;
  onVariant: (testId: string) => void;
  onPhase: (phase: ExercisePhase) => void;
}

type FinishedState = Extract<ReviewState, { kind: 'passed' | 'partial' | 'error' }>;

function finishedCopy(exercise: Exercise, review: FinishedState) {
  if (review.kind === 'passed')
    return { heading: 'La idea funciona en estos casos.', detail: exercise.review.success };
  if (review.kind === 'partial')
    return {
      heading: `${review.passedCount} de ${exercise.tests.length}: encontramos algo para explorar.`,
      detail: review.failure,
    };
  return { heading: 'El programa nos dejó una pista.', detail: review.diagnosis.explanation };
}

const RunningReview = ({ onCancel }: { onCancel: () => void }) => (
  <>
    <h3>Probemos tu hipótesis.</h3>
    <p>
      El compilador está revisando el programa. Después ejecutamos los casos del ejercicio y
      conectamos cada resultado con el concepto.
    </p>
    <p className="runner-status busy">
      <span className="lab-spinner" aria-hidden="true" /> Ejecutando código real…
    </p>
    <button className="text-button" onClick={onCancel}>
      Cancelar ejecución
    </button>
  </>
);

const PendingReview = ({
  exercise,
  record,
  stale,
  onVariant,
}: Pick<ReviewProps, 'exercise' | 'record' | 'onVariant'> & { stale: boolean }) => (
  <>
    <h3>{stale ? 'El código cambió. Revisémoslo.' : '¿Qué queremos comprobar?'}</h3>
    <p>
      {stale
        ? 'Los resultados anteriores corresponden a otra versión. Ejecutá de nuevo para comprobar estos cambios.'
        : exercise.review.pitfall}
    </p>
    <TestList exercise={exercise} result={null} onVariant={onVariant} />
    <div className="coach-callout">
      <strong>Mientras escribís:</strong>{' '}
      <span id="lab-live-hint">{liveHint(draftOf(exercise, record), exercise)}</span>
    </div>
    <p className="coach-scope">
      La revisión combina diagnósticos reales y explicaciones preparadas para este desafío. Las
      pruebas cubren estos casos; no garantizan todo comportamiento posible.
    </p>
  </>
);

const TransportReview = ({
  exercise,
  message,
  onVariant,
}: Pick<ReviewProps, 'exercise' | 'onVariant'> & { message: string }) => (
  <>
    <h3 className="coach-warning">No pude ejecutar esta vez.</h3>
    <p>
      {message || 'No llegó una respuesta del compilador. Revisá la conexión y probá de nuevo.'}
    </p>
    <div className="coach-callout">
      Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés
      seguir con las pistas o copiar el programa para probarlo en el Playground.
    </div>
    <TestList exercise={exercise} result={null} onVariant={onVariant} />
  </>
);

function customStatus(result: LabResultV1): string {
  if (!result.success) return 'sin ejecutar';
  return result.customPassed ? 'superado ✓' : 'encontró una diferencia ×';
}

const CustomResult = ({ result }: { result: LabResultV1 }) =>
  result.customTest ? (
    <div className="coach-callout">
      <strong>{`Tu caso extra: ${customStatus(result)}`}</strong>
      <code className="custom-expression">{result.customTest}</code>
      <p>
        Este experimento es independiente de los tres casos del taller. Un caso extra fallido es
        información nueva: revisá tanto tu expectativa como la implementación.
      </p>
    </div>
  ) : null;

const FinishedReview = ({
  exercise,
  record,
  review,
  onVariant,
  onPhase,
}: Pick<ReviewProps, 'exercise' | 'record' | 'onVariant' | 'onPhase'> & {
  review: FinishedState;
}) => {
  const result = record.result as LabResultV1;
  const { assisted, attempts } = viewOf(record);
  const complete = review.kind === 'passed';
  const { heading, detail } = finishedCopy(exercise, review);
  return (
    <>
      <h3 className={complete ? 'coach-success' : 'coach-warning'}>{heading}</h3>
      <p>{detail}</p>
      {review.kind === 'error' && (
        <div className="coach-callout">
          <strong>Probá esto:</strong>
          {` ${review.diagnosis.action}`}
        </div>
      )}
      <TestList exercise={exercise} result={result} onVariant={onVariant} />
      <CustomResult result={result} />
      {complete && (
        <>
          <div className="coach-callout">
            <strong>Una pregunta más:</strong>
            {` ${exercise.transfer}`}
          </div>
          <button className="button small secondary" onClick={() => onPhase('reflect')}>
            Explicar lo que aprendí →
          </button>
        </>
      )}
      <details className="compiler-output">
        <summary>Ver la salida del compilador y del programa</summary>
        <pre>{preformatted((result.stderr || '') + '\n' + (result.stdout || ''))}</pre>
      </details>
      <p className="coach-scope">
        {`${assisted ? 'Práctica con solución de apoyo. ' : ''}${attempts} intento${attempts === 1 ? '' : 's'}. Revisar es parte de aprender. La aprobación corresponde a estos ${exercise.tests.length} casos, no a una revisión completa de diseño.`}
      </p>
    </>
  );
};

const Review = ({ exercise, record, running, onCancel, onVariant, onPhase }: ReviewProps) => {
  const review = reviewStateOf(exercise, record, running);
  if (review.kind === 'running') return <RunningReview onCancel={onCancel} />;
  if (review.kind === 'unrun' || review.kind === 'stale')
    return (
      <PendingReview
        exercise={exercise}
        record={record}
        stale={review.kind === 'stale'}
        onVariant={onVariant}
      />
    );
  if (review.kind === 'transport-failure')
    return <TransportReview exercise={exercise} message={review.message} onVariant={onVariant} />;
  return (
    <FinishedReview
      exercise={exercise}
      record={record}
      review={review}
      onVariant={onVariant}
      onPhase={onPhase}
    />
  );
};

export default Review;
```

`frontend/src/pages/lab/ui/exercise/TestList.tsx`:

```tsx
import type { Exercise, LabResultV1 } from '../../../../entities/exercise';

type TestStatus = 'pending' | 'passed' | 'failed';

const INDICATORS: Readonly<Record<TestStatus, string>> = { passed: '✓', failed: '×', pending: '○' };
const SPOKEN: Readonly<Record<TestStatus, string>> = {
  passed: 'superado',
  failed: 'falló',
  pending: 'sin resultado',
};

function statusOf(testId: string, result: LabResultV1 | null): TestStatus {
  if (!result || !result.success) return 'pending';
  return result.tests.find((outcome) => outcome.id === testId)?.passed ? 'passed' : 'failed';
}

interface TestListProps {
  exercise: Exercise;
  result: LabResultV1 | null;
  onVariant: (testId: string) => void;
}

const TestList = ({ exercise, result, onVariant }: TestListProps) => (
  <>
    <p className="test-suite-label">
      {`${exercise.tests.length} casos · abrí cada uno para ver su condición`}
    </p>
    <div className="test-list">
      {exercise.tests.map((test) => {
        const status = statusOf(test.id, result);
        return (
          <details key={test.id} className={`test-case ${status}`} open={status === 'failed'}>
            <summary>
              <span className="test-indicator" aria-hidden="true">
                {INDICATORS[status]}
              </span>
              <span>
                {test.label}
                <span className="sr-only">{` — ${SPOKEN[status]}`}</span>
              </span>
            </summary>
            <div className="test-explanation">
              <strong>Por qué lo probamos:</strong>
              {` ${test.why}`}
              <span className="test-condition-label">Debe evaluar a true:</span>
              <code>{test.expression}</code>
              {status === 'failed' && (
                <>
                  <strong>Pista:</strong>
                  {` ${test.failure}`}
                </>
              )}
              <button className="text-button test-variant" onClick={() => onVariant(test.id)}>
                Inventar una variante ↗
              </button>
            </div>
          </details>
        );
      })}
    </div>
  </>
);

export default TestList;
```

`frontend/src/pages/lab/ui/exercise/ReflectPhase.tsx`:

```tsx
import { useState } from 'react';
import {
  ensureRecord,
  isReflectionSolved,
  labStore,
  selfAssessmentPatch,
  type Confidence,
  type Exercise,
  type LabRecord,
} from '../../../../entities/exercise';
import type { ExercisePhase } from '../../../../shared/config/url-grammar';
import { currentTime } from '../../lib/browser';
import { saveLab } from '../../model/mission-engines';
import { viewOf } from '../../model/record-view';
import ConceptSources from './ConceptSources';

const CONFIDENCE_OPTIONS: readonly (readonly [Confidence, string, string])[] = [
  ['again', 'Todavía me cuesta', 'Revisarlo mañana'],
  ['practice', 'Lo entiendo, quiero otra vuelta', 'Volver en 3 días'],
  ['confident', 'Puedo explicarlo sin mirar', 'Volver en una semana'],
];
const REFLECTION_MIN_LENGTH = 40;

interface ReflectPhaseProps {
  exercise: Exercise;
  record: LabRecord;
  isLast: boolean;
  lastLabel: string;
  notify: (message: string) => void;
  onPhase: (phase: ExercisePhase) => void;
  onNext: () => void;
}

const ReflectStatus = ({ exercise, record }: Pick<ReflectPhaseProps, 'exercise' | 'record'>) => (
  <div id="lab-reflect-status" role="status">
    {isReflectionSolved(exercise, record) ? (
      <div className="lab-achievement">
        <span className="achievement-icon" aria-hidden="true">
          ✳
        </span>
        <div>
          <strong>
            {record.assisted === true
              ? 'Lo exploraste con una solución de apoyo.'
              : 'Lo hiciste funcionar. Ahora hacelo tuyo.'}
          </strong>
          <p>
            {`Los ${exercise.tests.length} casos pasaron. La comprensión se afianza cuando podés explicarlo y resolver una variante.`}
          </p>
        </div>
      </div>
    ) : (
      <div className="coach-callout">
        Podés reflexionar en cualquier momento. Para verificar este código, volvé a Experimentá y
        ejecutá las pruebas.
      </div>
    )}
  </div>
);

function drawnReflectionStatus(record: LabRecord): string {
  return viewOf(record).reflection.trim().length >= REFLECTION_MIN_LENGTH
    ? 'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.'
    : 'Escribir tu razonamiento suma una oportunidad de recordar. Se guarda automáticamente.';
}

const ReflectPhase = ({
  exercise,
  record,
  isLast,
  lastLabel,
  notify,
  onPhase,
  onNext,
}: ReflectPhaseProps) => {
  const [typedStatus, setTypedStatus] = useState<string | null>(null);
  const view = viewOf(record);

  const writeReflection = (value: string) => {
    ensureRecord(labStore.getProgress(), exercise.id).reflection = value;
    saveLab();
    setTypedStatus(
      labStore.storageAvailable()
        ? 'Tu explicación está guardada. Contrastala con el razonamiento del revisor.'
        : 'El guardado no está disponible: exportá tu avance.',
    );
  };

  const assess = (confidence: Confidence) => {
    Object.assign(
      ensureRecord(labStore.getProgress(), exercise.id),
      selfAssessmentPatch(confidence, currentTime()),
    );
    saveLab();
    notify('Repaso agendado en tu mapa de aprendizaje.');
  };

  return (
    <>
      <ReflectStatus exercise={exercise} record={record} />
      <div className="reflect-layout">
        <section className="reflect-panel">
          <h2>¿Cómo se lo explicarías a alguien?</h2>
          <p>
            Contá qué cambiaste, por qué funciona y qué caso podría romper una solución ingenua.
            Podés usar un ejemplo propio.
          </p>
          <label>
            <span className="field-label">Tu explicación, en tus palabras</span>
            <textarea
              className="reflection-input"
              id="lab-reflection"
              name="reflexion"
              autoComplete="off"
              maxLength={10000}
              placeholder="Mi primera idea era… Ahora entiendo que… Un caso que tengo que cuidar es…"
              defaultValue={view.reflection}
              onChange={(event) => writeReflection(event.target.value)}
            />
          </label>
          <p id="lab-reflection-status" className="note-state">
            {typedStatus ?? drawnReflectionStatus(record)}
          </p>
          <details className="lab-reasoning">
            <summary>Contrastar con el razonamiento del revisor</summary>
            <p>{exercise.review.success}</p>
            <p>
              <strong>Cuidado con esta idea:</strong> {exercise.review.pitfall}
            </p>
          </details>
          <div className="transfer-card">
            <h3>Ahora cambiá una condición.</h3>
            <p>{exercise.transfer}</p>
            <button className="button small secondary" onClick={() => onPhase('code')}>
              Volver al editor ↗
            </button>
          </div>
        </section>
        <section className="reflect-panel">
          <h2>¿Cuándo querés volver a esto?</h2>
          <p>
            Esta es tu autoevaluación. Elegí con honestidad: pedir más práctica también es avanzar.
          </p>
          <div className="confidence-options">
            {CONFIDENCE_OPTIONS.map(([id, title, description]) => (
              <button key={id} aria-pressed={view.confidence === id} onClick={() => assess(id)}>
                {title}
                <small>{description}</small>
              </button>
            ))}
          </div>
          {view.reviewAt ? (
            <p className="note-state">
              {`Próximo repaso: ${new Date(view.reviewAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}. No enviamos notificaciones.`}
            </p>
          ) : null}
          <ConceptSources sources={exercise.sources} />
        </section>
      </div>
      <div className="lab-phase-footer">
        <p>Podés volver a cualquier ejercicio. Las soluciones y las notas quedan guardadas.</p>
        <button className="button" onClick={onNext}>
          {`${isLast ? lastLabel : 'Siguiente experimento'} →`}
        </button>
      </div>
    </>
  );
};

export default ReflectPhase;
```

- **Los exploradores** (`explorerHTML` y los tres modelos visuales de `lab.js`, `lab-explorers.js` y `quest-explorers.js`):

`frontend/src/pages/lab/ui/explorers/LabExplorerSlot.tsx`:

```tsx
import type { Exercise } from '../../../../entities/exercise';
import { labExplorerKindOf } from '../../../../entities/exercise/explorers';
import type { LabSession, SessionChange } from '../../model/lab-session';
import LabExplorer from './LabExplorer';
import { FlowModel, OwnershipModel, SliceModel } from './VisualModels';

interface LabExplorerSlotProps {
  exercise: Exercise;
  session: LabSession;
  onSessionChange: SessionChange;
}

const RUST_MEMORY_VISUALS = ['ownership', 'memory'];
const GO_SLICE_VISUALS = ['memory', 'collections', 'ownership'];

const LabExplorerSlot = ({ exercise, session, onSessionChange }: LabExplorerSlotProps) => {
  const kind = labExplorerKindOf(exercise.id);
  if (kind) {
    return (
      <LabExplorer
        kind={kind}
        language={exercise.language}
        state={session.labExplorer}
        onSessionChange={onSessionChange}
      />
    );
  }
  const visual: string = exercise.visual;
  if (visual === 'none') return null;
  if (exercise.language === 'rust' && RUST_MEMORY_VISUALS.includes(visual)) {
    return <OwnershipModel visual={session.visual} onSessionChange={onSessionChange} />;
  }
  if (exercise.language === 'go' && GO_SLICE_VISUALS.includes(visual)) {
    return <SliceModel visual={session.visual} onSessionChange={onSessionChange} />;
  }
  return (
    <FlowModel exercise={exercise} visual={session.visual} onSessionChange={onSessionChange} />
  );
};

export default LabExplorerSlot;
```

`frontend/src/pages/lab/ui/explorers/LabExplorer.tsx`:

```tsx
import { useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  FIRST_STEP_NOTICE,
  applyLabExplorerOperation,
  chooseLabExplorerOption,
  genericContract,
  type LabExplorerKind,
  type LabExplorerState,
} from '../../../../entities/exercise/explorers';
import { withLabExplorer, type SessionChange } from '../../model/lab-session';

interface LabExplorerProps {
  kind: LabExplorerKind;
  language: string;
  state: LabExplorerState;
  onSessionChange: SessionChange;
}

interface ModeProps {
  rust: boolean;
  state: LabExplorerState;
  button: (operation: string, label: ReactNode, disabled?: boolean, pressed?: boolean) => ReactNode;
}

const POINTER_CAVEATS = {
  rust: 'Este dibujo usa i32, que es Copy, y préstamos sucesivos. Un raw pointer no obtiene estas garantías: dereferenciarlo exige un bloque unsafe y demostrar validez, alineación y reglas de aliasing. Box posee; Rc comparte propiedad; RefCell comprueba préstamos en ejecución.',
  go: 'Go pasa argumentos por valor, incluso los punteros: se copia la dirección, no el objeto apuntado. El recolector evita liberar objetos todavía alcanzables; no evita carreras entre goroutines.',
};
const GENERIC_CAVEATS = {
  rust: 'Este ejemplo usa enteros y String; no generaliza Ord a todos los números: f64 no implementa Ord. Los traits expresan comportamientos y sus leyes también importan.',
  go: 'El ~ incluye tipos cuyo tipo subyacente coincide. Slices y maps no cumplen comparable. Un conjunto de tipos restringe qué argumentos acepta la función; no convierte sus valores.',
};

const PointerMode = ({ rust, state, button }: ModeProps) => (
  <>
    <span className="small-label">MINILAB · ALIAS O COPIA</span>
    <h3>Dos nombres. ¿Un mismo lugar?</h3>
    <p>
      {`Modelo de un entero: copiá el valor o accedé al original a través de ${rust ? 'una referencia mutable' : 'un puntero'}. Cada botón incrementa en uno.`}
    </p>
    <div className="pointer-board">
      <div className="pointer-box">
        <span>original</span>
        <strong>{state.value}</strong>
        <small>celda A</small>
      </div>
      <div className="pointer-route">
        <code>{rust ? '&mut original' : '&original'}</code>
        <span>→ celda A</span>
      </div>
      <div className="pointer-box independent">
        <span>copia</span>
        <strong>{state.copy}</strong>
        <small>celda B</small>
      </div>
    </div>
    <div className="explorer-actions">
      {button('pointer-copy', 'Modificar copia +1')}
      {button('pointer-ref', rust ? 'Modificar por &mut +1' : 'Modificar por *p +1')}
      {button('reset', 'Reiniciar ↺')}
    </div>
    <div className="explorer-explanation" role="status">
      {state.notice === FIRST_STEP_NOTICE
        ? 'Una copia de este entero es independiente. Un acceso indirecto permite modificar el mismo dato original.'
        : state.notice}
    </div>
    <p className="model-caveat">
      {`${rust ? POINTER_CAVEATS.rust : POINTER_CAVEATS.go} Es un modelo conceptual, no una inspección de memoria real.`}
    </p>
  </>
);

const ChannelSlots = ({ state }: { state: LabExplorerState }) =>
  state.capacity ? (
    Array.from({ length: state.capacity }, (_, index) => (
      <i key={index} className={`channel-slot ${index < state.queue.length ? 'filled' : ''}`}>
        {index < state.queue.length ? '●' : '·'}
      </i>
    ))
  ) : (
    <span className="rendezvous">encuentro</span>
  );

const ChannelMode = ({ rust, state, button }: ModeProps) => (
  <>
    <span className="small-label">MINILAB · COORDINÁ DOS PARTICIPANTES</span>
    <h3>¿Quién está esperando a quién?</h3>
    <p>
      {`Probá enviar antes de recibir y después invertí el orden. Modelamos ${rust ? 'sync_channel' : 'un channel de Go'} con capacidad 0 o 2; no modelamos el planificador completo.`}
    </p>
    <div className="explorer-actions" role="group" aria-label="Capacidad del canal">
      {button('capacity-0', 'Sin buffer', false, state.capacity === 0)}
      {button('capacity-2', 'Buffer de 2', false, state.capacity === 2)}
    </div>
    <div className="channel-board">
      <div className={`actor ${state.sender ? 'blocked' : ''}`}>
        <strong>Productor</strong>
        <span>{state.sender ? 'esperando envío' : 'listo para enviar'}</span>
      </div>
      <div className="channel-pipe">
        <span aria-hidden="true">→</span>
        <div>
          <ChannelSlots state={state} />
        </div>
        <span aria-hidden="true">→</span>
      </div>
      <div className={`actor ${state.receiver ? 'blocked' : ''}`}>
        <strong>Consumidor</strong>
        <span>{state.receiver ? 'esperando recepción' : 'listo para recibir'}</span>
      </div>
    </div>
    <div className="explorer-actions">
      {button('send', 'Paso del productor →', state.sender)}
      {button('receive', 'Paso del consumidor →', state.receiver)}
      {button('reset', 'Reiniciar ↺')}
    </div>
    <div className="explorer-explanation" role="status">
      {state.notice}
      <br />
      <strong>{`${state.delivered} mensajes entregados.`}</strong>
    </div>
    <p className="model-caveat">
      Un buffer permite desacoplar algunos envíos, pero también puede llenarse. Concurrencia no
      implica paralelismo. Este modelo explica espera y coordinación; un test que pasa no demuestra
      ausencia de carreras o deadlocks.
    </p>
  </>
);

interface GenericModeProps {
  rust: boolean;
  language: string;
  state: LabExplorerState;
  onChoose: (field: 'constraint' | 'type', select: HTMLSelectElement) => void;
}

const GenericMode = ({ rust, language, state, onChoose }: GenericModeProps) => {
  const { valid, constraintName } = genericContract(state.constraint, state.type, language);
  return (
    <>
      <span className="small-label">MINILAB · EL CONTRATO DEL TIPO</span>
      <h3>¿Este tipo puede entrar?</h3>
      <p>
        Una función genérica promete usar ciertas operaciones. Elegí una necesidad y un tipo: la
        restricción se verifica antes de ejecutar.
      </p>
      <div className="generic-controls">
        <label>
          La función necesita
          <select
            value={state.constraint}
            onChange={(event) => onChoose('constraint', event.currentTarget)}
          >
            <option value="ordered">Comparar orden</option>
            <option value="comparable">Comparar igualdad</option>
            {rust && <option value="display">Mostrar con Display</option>}
          </select>
        </label>
        <label>
          Le pasás
          <select value={state.type} onChange={(event) => onChoose('type', event.currentTarget)}>
            <option value="int">Entero</option>
            <option value="string">Texto</option>
            <option value="record">{rust ? 'Struct sin derives' : 'Struct { ID int }'}</option>
          </select>
        </label>
      </div>
      <div className={`generic-gate ${valid ? 'accepted' : 'rejected'}`}>
        <code>{constraintName}</code>
        <span aria-hidden="true">→</span>
        <strong>{valid ? 'El contrato se cumple ✓' : 'Falta cumplir el contrato ×'}</strong>
      </div>
      <div className="explorer-explanation" role="status">
        {valid
          ? 'Este tipo admite las operaciones que esta restricción permite. La función puede usarlas sin conocer un valor específico.'
          : rust
            ? 'Un struct no implementa automáticamente Ord, Eq o Display. Necesitás implementar el trait o derivarlo si ese trait lo admite y sus campos cumplen las restricciones.'
            : 'Un struct con un campo int es comparable, pero no pertenece al conjunto ~int | ~string. La igualdad no implica que exista un orden con <.'}
      </div>
      <p className="model-caveat">
        {`${rust ? GENERIC_CAVEATS.rust : GENERIC_CAVEATS.go} Cambiá después el código real para observar el diagnóstico del compilador.`}
      </p>
    </>
  );
};

const LabExplorer = ({ kind, language, state, onSessionChange }: LabExplorerProps) => {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const rust = language === 'rust';

  const act = (operation: string) => {
    flushSync(() =>
      onSessionChange((session) =>
        withLabExplorer(session, applyLabExplorerOperation(session.labExplorer, operation)),
      ),
    );
    const same = buttons.current.get(operation);
    const next =
      same && !same.disabled
        ? same
        : buttons.current.get(operation === 'send' ? 'receive' : 'send');
    next?.focus({ preventScroll: true });
  };

  const choose = (field: 'constraint' | 'type', select: HTMLSelectElement) => {
    const value = select.value;
    flushSync(() =>
      onSessionChange((session) =>
        withLabExplorer(session, chooseLabExplorerOption(session.labExplorer, field, value)),
      ),
    );
    select.focus();
  };

  const button = (operation: string, label: ReactNode, disabled = false, pressed?: boolean) => (
    <button
      key={operation}
      disabled={disabled}
      aria-pressed={pressed}
      ref={(node) => {
        if (node) buttons.current.set(operation, node);
        else buttons.current.delete(operation);
      }}
      onClick={() => act(operation)}
    >
      {label}
    </button>
  );

  return (
    <section id="lab-special-explorer" className="lab-explorer special-explorer">
      {kind === 'pointer' && <PointerMode rust={rust} state={state} button={button} />}
      {kind === 'channel' && <ChannelMode rust={rust} state={state} button={button} />}
      {kind === 'generic' && (
        <GenericMode rust={rust} language={language} state={state} onChoose={choose} />
      )}
    </section>
  );
};

export default LabExplorer;
```

`frontend/src/pages/lab/ui/explorers/VisualModels.tsx`:

```tsx
import type { Exercise } from '../../../../entities/exercise';
import {
  advanceFlow,
  changeSliceView,
  chooseOwnership,
  resetSlices,
  toggleSliceCopy,
  type OwnershipOperation,
  type SessionChange,
  type VisualModels,
} from '../../model/lab-session';

const OWNERSHIP_OPERATIONS: readonly (readonly [OwnershipOperation, string])[] = [
  ['create', 'Crear'],
  ['move', 'Mover'],
  ['borrow', 'Prestar'],
  ['clone', 'Clonar'],
];

const OWNERSHIP_EXPLANATIONS: Readonly<Record<OwnershipOperation, string>> = {
  create:
    'origen posee el String. Cuando su dueño termina, se liberan sus recursos, salvo que la propiedad se haya transferido.',
  move: 'destino pasa a poseer el String. origen ya no puede usarse. Se transfiere la propiedad; no se duplica el contenido del String.',
  borrow:
    'referencia lee el String sin tomar su propiedad. origen sigue siendo el dueño. Mientras ese préstamo compartido siga en uso, no puede haber un préstamo mutable incompatible.',
  clone:
    'destino posee un String independiente. Los dos dueños pueden usarse; clonar String copia su contenido y tiene un costo.',
};

interface ModelProps {
  visual: VisualModels;
  onSessionChange: SessionChange;
}

export const OwnershipModel = ({ visual, onSessionChange }: ModelProps) => {
  const operation = visual.ownership;
  return (
    <section className="lab-explorer">
      <h3>Mové la idea, no solo el código.</h3>
      <p>
        Modelo conceptual: un String llamado origen. Probá cada operación y mirá quién puede usar
        sus datos.
      </p>
      <div className="explorer-actions" role="group" aria-label="Operación de ownership">
        {OWNERSHIP_OPERATIONS.map(([id, label]) => (
          <button
            key={id}
            aria-pressed={operation === id}
            onClick={() => onSessionChange((session) => chooseOwnership(session, id))}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="lab-memory-visual">
        <div className="memory-diagram">
          <div>
            <div className={`memory-binding ${operation === 'move' ? 'moved' : ''}`}>
              origen<span>{operation === 'move' ? 'ya movido' : 'dueño'}</span>
            </div>
            {operation !== 'create' && (
              <div className="memory-binding memory-copy">
                {operation === 'borrow' ? 'referencia' : 'destino'}
                <span>{operation === 'borrow' ? '&String · lectura' : 'dueño'}</span>
              </div>
            )}
          </div>
          <div className="memory-arrow" aria-hidden="true">
            →
          </div>
          <div>
            <div className="memory-value">"hola"</div>
            {operation === 'clone' && (
              <div className="memory-value memory-copy">"hola" · copia</div>
            )}
          </div>
        </div>
        <div className="explorer-explanation" role="status">
          {OWNERSHIP_EXPLANATIONS[operation]}
        </div>
      </div>
    </section>
  );
};

export const SliceModel = ({ visual, onSessionChange }: ModelProps) => {
  const original = [10, visual.sliceOriginal, 30];
  const view = [visual.sliceView, 30];
  return (
    <section className="lab-explorer">
      <h3>Dos slices, ¿los mismos datos?</h3>
      <p>
        Modelo conceptual: vista := original[1:]. Cambiá un valor o hacé una copia independiente
        antes de modificarlo.
      </p>
      <div className="explorer-actions">
        <button aria-pressed={visual.sliceCopied} onClick={() => onSessionChange(toggleSliceCopy)}>
          {visual.sliceCopied ? 'Volver a compartir' : 'Copia independiente'}
        </button>
        <button onClick={() => onSessionChange(changeSliceView)}>vista[0] += 1</button>
        <button onClick={() => onSessionChange(resetSlices)}>Reiniciar ↺</button>
      </div>
      <div id="lab-slice-visual">
        <div className="slice-row">
          <span className="slice-label">original</span>
          {original.map((value, index) => (
            <span
              key={index}
              className={`slice-cell ${index > 0 && !visual.sliceCopied ? 'shared' : ''}`}
            >
              {value}
            </span>
          ))}
        </div>
        <div className="slice-row">
          <span className="slice-label">vista</span>
          {view.map((value, index) => (
            <span
              key={index}
              className={`slice-cell ${visual.sliceCopied ? 'independent' : 'shared'}`}
            >
              {value}
            </span>
          ))}
        </div>
        <div className="explorer-explanation" role="status">
          {visual.sliceCopied
            ? 'La copia tiene su propio arreglo de respaldo. Cambiar un elemento de vista ya no cambia original. El slice y los datos que referencia son cosas distintas.'
            : 'Los dos slices comparten parte del arreglo de respaldo. Modificar vista[0] cambia el mismo elemento que original[1]. Crear otro slice no copió los elementos.'}
        </div>
      </div>
    </section>
  );
};

export const FlowModel = ({
  exercise,
  visual,
  onSessionChange,
}: ModelProps & { exercise: Exercise }) => {
  const steps: readonly (readonly [string, string])[] = [
    ['Entrada', '¿Qué recibe esta función? Incluí un caso vacío o límite.'],
    ['Decisión', exercise.why],
    ['Resultado', exercise.tests[0].why],
  ];
  return (
    <section className="lab-explorer">
      <h3>Seguí el razonamiento.</h3>
      <p>
        Usá este pequeño recorrido para conectar una entrada con la decisión que toma tu programa.
      </p>
      <div id="lab-flow">
        <div className="flow-steps">
          {steps.map(([label, text], index) => (
            <div key={label} className={`flow-step ${visual.flow === index ? 'active' : ''}`}>
              <span>{`0${index + 1}`}</span>
              <div>
                <strong>{label}</strong>
                {visual.flow === index && (
                  <>
                    <br />
                    {text}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="explorer-actions">
        <button onClick={() => onSessionChange(advanceFlow)}>
          {visual.flow < 2 ? 'Siguiente paso →' : 'Volver al inicio ↺'}
        </button>
      </div>
    </section>
  );
};
```

`frontend/src/pages/lab/ui/explorers/QuestExplorer.tsx`:

```tsx
import { useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  applyQuestOperation,
  initialQuestState,
  type PacketState,
  type QuestExplorerInfo,
  type QuestState,
  type RobotState,
} from '../../../../entities/exercise/explorers';
import type { Exercise } from '../../../../entities/exercise';
import { withQuestExplorer, type SessionChange } from '../../model/lab-session';
import PacketView from './PacketView';
import type { QuestButtonOptions } from './QuestControls';
import RobotView from './RobotView';

interface QuestExplorerProps {
  exercise: Exercise;
  info: QuestExplorerInfo;
  state: QuestState | undefined;
  onSessionChange: SessionChange;
}

function focusAfter(same: HTMLButtonElement | undefined, panel: HTMLElement | null): void {
  const firstEnabled = [...(panel?.querySelectorAll('button') ?? [])].find(
    (control) => !control.disabled,
  );
  const replacement = same && !same.disabled ? same : firstEnabled;
  replacement?.focus({ preventScroll: true });
}

const QuestExplorer = ({ exercise, info, state, onSessionChange }: QuestExplorerProps) => {
  const panelRef = useRef<HTMLElement>(null);
  const controls = useRef(new Map<string, HTMLButtonElement>());
  const current = state ?? initialQuestState(info);

  const act = (operation: string) => {
    const next = applyQuestOperation(current, info, operation);
    if (!next) return;
    flushSync(() => onSessionChange((session) => withQuestExplorer(session, exercise.id, next)));
    focusAfter(controls.current.get(operation), panelRef.current);
  };

  const button = (operation: string, label: ReactNode, options: QuestButtonOptions = {}) => (
    <button
      key={operation}
      type="button"
      className={options.className}
      aria-label={options.ariaLabel}
      aria-pressed={options.pressed}
      disabled={options.disabled}
      ref={(node) => {
        if (node) controls.current.set(operation, node);
        else controls.current.delete(operation);
      }}
      onClick={() => act(operation)}
    >
      {label}
    </button>
  );

  return (
    <section
      className="quest-explorer"
      aria-label="Explorador conceptual interactivo"
      ref={panelRef}
    >
      <p className="qx-model-label">
        Modelo conceptual · No ejecuta el código del editor ni acredita la misión.
      </p>
      <div>
        {info.mode === 'robot' ? (
          <RobotView state={current as RobotState} info={info} button={button} />
        ) : (
          <PacketView state={current as PacketState} info={info} button={button} />
        )}
      </div>
      <p className="qx-live" role="status" aria-live="polite" aria-atomic="true">
        {current.notice}
      </p>
    </section>
  );
};

export default QuestExplorer;
```

`frontend/src/pages/lab/ui/explorers/QuestControls.tsx`:

```tsx
import type { ReactNode } from 'react';

export interface QuestButtonOptions {
  className?: string;
  ariaLabel?: string;
  pressed?: boolean;
  disabled?: boolean;
}

export type QuestButton = (
  operation: string,
  label: ReactNode,
  options?: QuestButtonOptions,
) => ReactNode;

interface QuestPredictionProps {
  prediction: number | null;
  question: string;
  options: readonly string[];
  answer: number;
  explanation: string;
  button: QuestButton;
}

export const QuestPrediction = ({
  prediction,
  question,
  options,
  answer,
  explanation,
  button,
}: QuestPredictionProps) => (
  <fieldset className="qx-prediction">
    <legend>{`Antes de ejecutar: ${question}`}</legend>
    <div className="qx-options">
      {options.map((label, index) =>
        button(`predict-${index}`, label, { pressed: prediction === index }),
      )}
    </div>
    {prediction === null ? (
      <p>Elegí una respuesta para revelar el porqué. No suma puntos a la misión.</p>
    ) : (
      <p className={`qx-answer ${prediction === answer ? 'qx-good' : ''}`}>
        <strong>{prediction === answer ? 'Sí.' : 'Revisemos la regla.'}</strong>
        {` ${explanation}`}
      </p>
    )}
  </fieldset>
);
```

`frontend/src/pages/lab/ui/explorers/RobotView.tsx`:

```tsx
import type { QuestExplorerInfo, RobotState } from '../../../../entities/exercise/explorers';
import { QuestPrediction, type QuestButton } from './QuestControls';

const RobotIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path
      d="M24 6v6M19 6h10M11 18h26v23H11zM6 24h5m26 0h5"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <circle cx="19" cy="26" r="2.5" fill="currentColor" />
    <circle cx="29" cy="26" r="2.5" fill="currentColor" />
    <path d="M18 34h12" stroke="currentColor" strokeWidth="3" />
  </svg>
);

const CELLS = [2, 1, 0].flatMap((y) => [0, 1, 2].map((x) => ({ x, y })));

const RobotCell = ({ state, x, y }: { state: RobotState; x: number; y: number }) => {
  const here = state.x === x && state.y === y;
  const goal = x === 2 && y === 2;
  return (
    <div className={`qx-cell ${here ? 'qx-here' : ''} ${goal ? 'qx-goal' : ''}`}>
      <span className="qx-coordinate">{`${x},${y}`}</span>
      {here ? (
        <RobotIcon />
      ) : goal ? (
        <span className="qx-beacon">✦</span>
      ) : (
        <span className="qx-dot">·</span>
      )}
      {here && goal && <span className="qx-arrival">Llegaste</span>}
    </div>
  );
};

const RobotLog = ({ state }: { state: RobotState }) =>
  state.logs.length ? (
    <ol className="qx-log" start={state.logs[0].step}>
      {state.logs.map((entry) => (
        <li key={entry.step}>
          <strong>{entry.summary}</strong>
          <span>{entry.why}</span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="qx-empty-log">
      El registro va a mostrar primero la propuesta y después por qué se acepta o rechaza.
    </p>
  );

const RobotGoal = ({ state }: { state: RobotState }) => {
  if (state.x === 2 && state.y === 2) {
    return <p className="qx-goal-message">✦ Baliza alcanzada. La traza explica cómo llegaste.</p>;
  }
  if (state.energy === 0) {
    return (
      <p className="qx-goal-message">
        Batería agotada. Podés probar otra orden para observar que el estado se conserva.
      </p>
    );
  }
  return null;
};

interface RobotViewProps {
  state: RobotState;
  info: QuestExplorerInfo;
  button: QuestButton;
}

const RobotView = ({ state, info, button }: RobotViewProps) => (
  <>
    <div className="qx-heading">
      <span className="small-label">EXPLORADOR · ESTADOS Y DECISIONES</span>
      <h3>Un paso. Una decisión.</h3>
      <p>
        Llegá a la baliza con cuatro movimientos. Los bordes son paredes: chocar no cambia la
        posición ni consume batería.
      </p>
    </div>
    <div className="qx-robot-layout">
      <div>
        <div
          className="qx-grid"
          role="img"
          aria-label={`Hangar de 3 por 3. Robot en x ${state.x}, y ${state.y}. Baliza en x 2, y 2. Norte aumenta y; este aumenta x.`}
        >
          <div className="qx-cells" aria-hidden="true">
            {CELLS.map(({ x, y }) => (
              <RobotCell key={`${x},${y}`} state={state} x={x} y={y} />
            ))}
          </div>
        </div>
        <p className="qx-grid-caption">Norte ↑ · Este → · Coordenadas (x,y)</p>
        <div className="qx-direction-pad" role="group" aria-label="Mover el robot un paso">
          {button('move-N', '↑ N', {
            className: 'qx-north',
            ariaLabel: 'Ir al norte: sumar uno a y',
          })}
          {button('move-O', '← O', {
            className: 'qx-west',
            ariaLabel: 'Ir al oeste: restar uno a x',
          })}
          {button('move-S', '↓ S', {
            className: 'qx-south',
            ariaLabel: 'Ir al sur: restar uno a y',
          })}
          {button('move-E', 'E →', {
            className: 'qx-east',
            ariaLabel: 'Ir al este: sumar uno a x',
          })}
        </div>
      </div>
      <div>
        <dl className="qx-stats">
          <div>
            <dt>Posición</dt>
            <dd>{`(${state.x},${state.y})`}</dd>
          </div>
          <div>
            <dt>Batería</dt>
            <dd>{`${state.energy}/${state.initialEnergy}`}</dd>
          </div>
          <div>
            <dt>Pasos aceptados</dt>
            <dd>{state.moves}</dd>
          </div>
        </dl>
        <meter
          className="qx-battery"
          min={0}
          max={state.initialEnergy}
          value={state.energy}
          aria-label={`Batería restante: ${state.energy} de ${state.initialEnergy}`}
        >
          {state.energy}
        </meter>
        <div className="qx-rule">
          <strong>Proponer → validar → confirmar</strong>
          <p>Solo si 0 ≤ x,y ≤ 2 y batería &gt; 0, se actualizan juntas posición y energía.</p>
        </div>
        <div
          className="qx-actions"
          role="group"
          aria-label="Reiniciar el tablero con una batería inicial"
        >
          {[2, 4, 6].map((energy) =>
            button(`battery-${energy}`, `Reiniciar · ${energy} de batería`, {
              pressed: state.initialEnergy === energy,
            }),
          )}
        </div>
        <RobotGoal state={state} />
      </div>
    </div>
    <details className="qx-history" open>
      <summary>Traza de decisiones · últimos 6 intentos</summary>
      <RobotLog state={state} />
    </details>
    <QuestPrediction
      prediction={state.prediction}
      question="en (0,0), con batería 4, intentás O. ¿Qué queda?"
      options={['(0,0), batería 4', '(0,0), batería 3', '(-1,0), batería 3']}
      answer={0}
      explanation="La posición candidata es (-1,0), fuera del hangar. Se rechaza antes de modificar posición o energía."
      button={button}
    />
    <p className="qx-scope">
      {info.language === 'go'
        ? 'Variante visual compartida: usa N/S/E/O y bordes. El jefe Go-103 usa F/R en un espacio sin estos bordes, y se detiene ante F sin energía. El contrato del editor manda.'
        : 'La grilla y batería corresponden al modelo de Rust-103. Rust-101 solo transforma coordenadas y Rust-102 valida un inventario: comparten la idea de decidir antes de modificar el estado.'}
    </p>
  </>
);

export default RobotView;
```

`frontend/src/pages/lab/ui/explorers/PacketView.tsx`:

```tsx
import {
  hex,
  packetData,
  type PacketData,
  type PacketState,
  type QuestExplorerInfo,
} from '../../../../entities/exercise/explorers';
import { QuestPrediction, type QuestButton } from './QuestControls';

function bytesPreview(bytes: readonly number[]): string {
  if (!bytes.length) return '∅';
  const beginning = bytes
    .slice(0, 6)
    .map((byte) => hex(byte))
    .join(' ');
  return bytes.length > 6 ? `${beginning} … (${bytes.length} bytes)` : beginning;
}

function verdictOf(data: PacketData, state: PacketState): string {
  if (data.failure === 'version') return 'Rechazado: versión distinta de 1.';
  if (data.failure === 'largo')
    return `Rechazado: declara ${data.declared} bytes, pero llegaron ${state.size}.`;
  if (data.failure === 'checksum')
    return 'Rechazado: la comprobación recibida no coincide con la calculada.';
  return 'Pasa las comprobaciones representadas en este modelo.';
}

interface ControlByteProps {
  state: PacketState;
  rust: boolean;
  button: QuestButton;
}

const ControlByte = ({ state, rust, button }: ControlByteProps) => {
  const lowBits = rust ? 4 : 5;
  const type = state.control >>> lowBits;
  const low = state.control & ((1 << lowBits) - 1);
  return (
    <div className="qx-control-byte">
      <div className="qx-byte-summary">
        <strong>Byte de control · misión 104</strong>
        <code>{`0x${hex(state.control)} = ${state.control}`}</code>
      </div>
      <div
        className="qx-bit-grid"
        role="group"
        aria-label="Ocho bits del byte de control; cada botón alterna un bit"
      >
        {Array.from({ length: 8 }, (_, index) => {
          const bit = 7 - index;
          const active = Boolean(state.control & (1 << bit));
          const typeField = bit >= lowBits;
          const field = typeField ? 'tipo' : rust ? 'banderas' : 'prioridad';
          return button(
            `bit-${bit}`,
            <>
              <small>{`b${bit} · ${typeField ? 'T' : rust ? 'B' : 'P'}`}</small>
              <strong>{active ? 1 : 0}</strong>
              <span>{1 << bit}</span>
            </>,
            {
              className: `qx-bit ${typeField ? 'qx-type-bit' : 'qx-low-bit'}`,
              pressed: active,
              ariaLabel: `Alternar bit ${bit}, peso ${1 << bit}, campo ${field}, valor actual ${active ? 1 : 0}`,
            },
          );
        })}
      </div>
      <div className="qx-fields">
        <span className="qx-field-type">
          Tipo: <strong>{type}</strong>
          {` · ${8 - lowBits} bits altos`}
        </span>
        <span className="qx-field-low">
          {`${rust ? 'Banderas' : 'Prioridad'}: `}
          <strong>{low}</strong>
          {` · ${lowBits} bits bajos`}
        </span>
      </div>
      <p className="qx-equation">
        <code>{`(${type} << ${lowBits}) | ${low} = ${state.control}`}</code>
      </p>
      <p className="qx-scope">
        {rust
          ? 'En la misión 104 se admiten tipos 0…15. El paquete de la misión 106 exige versión 1: cambiar los bits altos puede hacerlo inválido.'
          : 'Este control de 3+5 bits pertenece a Go-104. La trama de Go-106 usa otra cabecera: una marca fija 0x47. Cambiar este control no modifica esa trama.'}
      </p>
    </div>
  );
};

interface PacketPartProps {
  state: PacketState;
  data: PacketData;
  rust: boolean;
}

const PacketWire = ({ state, data, rust }: PacketPartProps) => (
  <>
    <div className="qx-wire" aria-label="Campos del paquete recibido">
      <div>
        <small>{rust ? 'Cabecera' : 'Marca fija'}</small>
        <code>{rust ? hex(state.control) : '47'}</code>
      </div>
      <div>
        <small>Longitud</small>
        <code>{data.lengthBytes.map((byte) => hex(byte)).join(' ')}</code>
      </div>
      <div className="qx-payload">
        <small>Payload recibido</small>
        <code>{bytesPreview(data.received)}</code>
      </div>
      <div>
        <small>{`${rust ? 'rotl8 + XOR' : 'CRC-32 IEEE'} enviado`}</small>
        <code>{(hex(data.sent, rust ? 2 : 8).match(/.{1,2}/g) ?? []).join(' ')}</code>
      </div>
    </div>
    <p className="qx-length-explanation">
      {rust
        ? `Un byte de longitud: 0x${hex(data.lengthBytes[0])} = ${data.declared}. No hay orden entre varios bytes que elegir.`
        : `Big-endian: 0x${hex(data.lengthBytes[0])} × 256 + 0x${hex(data.lengthBytes[1])} = ${data.declared}. El byte de mayor peso va primero.`}
    </p>
  </>
);

const PacketFaults = ({
  state,
  rust,
  button,
}: Omit<PacketPartProps, 'data'> & { button: QuestButton }) => (
  <div
    className="qx-actions qx-fault-controls"
    role="group"
    aria-label="Simular alteraciones durante la transmisión"
  >
    {button('corrupt', 'Alternar b0 del primer byte', {
      pressed: state.corrupt,
      disabled: state.size === 0,
    })}
    {button('bad-length', 'Alternar b0 de la longitud', { pressed: state.badLength })}
    {!rust && button('reverse-endian', 'Invertir bytes de longitud', { pressed: state.reversed })}
    {button('packet-reset', 'Restaurar paquete')}
  </div>
);

const PacketChecks = ({ state, data, rust }: PacketPartProps) => {
  const digits = rust ? 2 : 8;
  return (
    <>
      <div className="qx-checksum">
        <div>
          <span>Enviado</span>
          <code>{`0x${hex(data.sent, digits)}`}</code>
        </div>
        <span aria-hidden="true">{data.sent === data.computed ? '=' : '≠'}</span>
        <div>
          <span>Calculado</span>
          <code>{`0x${hex(data.computed, digits)}`}</code>
        </div>
      </div>
      <p className="qx-checksum-explanation">
        {rust
          ? `Se calcula a = rotl8(a,1) XOR byte, desde a=0. En Rust-105 entran solo sus datos; en el paquete Rust-106 entran cabecera, longitud y payload. Con este paquete: 0x${hex(data.computed)}.`
          : 'Go-105 y Go-106 usan hash/crc32.ChecksumIEEE sobre el payload. En Go-106 la marca y la longitud se validan por separado; el CRC no las incluye.'}
      </p>
      <div className={`qx-verdict ${data.failure ? 'qx-rejected' : 'qx-accepted'}`}>
        <strong>{verdictOf(data, state)}</strong>
        <span>
          {rust
            ? 'Orden de validación: mínimo → versión → largo exacto → checksum.'
            : 'Orden de validación: mínimo → marca → largo exacto → CRC.'}
        </span>
      </div>
    </>
  );
};

const PACKET_PREDICTIONS = {
  rust: {
    question: '¿qué guarda 0x13 en un formato de 4+4 bits?',
    options: ['Tipo 3, banderas 1', 'Tipo 1, banderas 3', 'Tipo 19, sin banderas'],
    explanation: '0x13 es 0001 0011: el nibble alto vale 1 y el bajo vale 3.',
  },
  go: {
    question: '00 03 leído como uint16 big-endian, ¿cuánto vale?',
    options: ['768', '3', '300'],
    explanation: 'El primer byte pesa 256: 0×256 + 3 = 3. Invertidos, 03 00 representan 768.',
  },
} as const;

interface PacketViewProps {
  state: PacketState;
  info: QuestExplorerInfo;
  button: QuestButton;
}

const PacketView = ({ state, info, button }: PacketViewProps) => {
  const rust = info.language === 'rust';
  const data = packetData(state, info);
  const prediction = PACKET_PREDICTIONS[info.language];
  return (
    <>
      <div className="qx-heading">
        <span className="small-label">EXPLORADOR · BITS Y PROTOCOLOS</span>
        <h3>Desarmá un mensaje.</h3>
        <p>
          Tocá un bit: cada posición pesa el doble de la anterior. Después alterá la longitud o un
          byte recibido y seguí las comprobaciones del receptor.
        </p>
      </div>
      <ControlByte state={state} rust={rust} button={button} />
      <div className="qx-packet-heading">
        <strong>Paquete completo · misión 106</strong>
        <span>{`${state.size + (rust ? 3 : 7)} bytes totales`}</span>
      </div>
      <div className="qx-actions" role="group" aria-label="Elegir tamaño real del payload">
        {(rust ? [0, 3, 6] : [0, 3, 6, 260]).map((size) =>
          button(`size-${size}`, `${size} bytes`, { pressed: state.size === size }),
        )}
      </div>
      <PacketWire state={state} data={data} rust={rust} />
      <PacketFaults state={state} rust={rust} button={button} />
      <PacketChecks state={state} data={data} rust={rust} />
      <QuestPrediction
        prediction={state.prediction}
        question={prediction.question}
        options={prediction.options}
        answer={1}
        explanation={prediction.explanation}
        button={button}
      />
      <p className="qx-scope">
        {`${rust ? 'Esta huella educativa de 8 bits y el CRC-32 IEEE de Go son algoritmos diferentes: no son intercambiables.' : 'CRC-32 IEEE no es la huella de rotación + XOR usada en las misiones Rust.'} Ninguna de estas comprobaciones autentica al emisor. El inspector muestra casos concretos, no demuestra ausencia de colisiones.`}
      </p>
    </>
  );
};

export default PacketView;
```

- **La hoja nueva** (R9), que todavía no importa nadie:

`frontend/src/pages/lab/ui/lab-page.css`:

```css
.lab-reasoning {
  margin-top: 20px;
}
.lab-reasoning > summary {
  font-size: 12px;
  cursor: pointer;
}
.lab-copy-buffer {
  position: fixed;
  left: -9999px;
}
```

- **El índice del slice.** Reemplaza al de F7a: los selectores del mapa ya no tienen lectores fuera de la página.

`frontend/src/pages/lab/index.ts`:

```ts
export { default as LabPage } from './ui/LabPage';
export type { LabPageProps } from './ui/LabPage';
export { enterLab } from './model/enter-lab';
export type { LabWorkshop } from './model/types';
```

- **Pasos:**
  1. Los componentes, la hoja y el índice.
  2. `npm run test:unit -- src/pages/lab`: las 15 specs del slice en verde.
  3. **Las mutaciones** (no corrieron al planificar), cada una detectada:
     - en `CodePhase`, `writeField` sin `saveLab()`: falla «writes each change of the editor, also an emptied draft»;
     - en `ReflectPhase`, el estado sin `typedStatus`: falla la rareza 3;
     - en `PredictionCard`, sin `syncAfterPrediction`: falla «announces the XP that a prediction earns…».

     Las mutaciones del foco no sirven en jsdom: `user-event` enfoca el control al pulsarlo. Esas las fijan los E2E (T027).
  4. `npm run typecheck`, `npm run lint` (ninguna función nueva pasa de 10) y `npm run format:check`.
  5. `grep -rnE "style=|setAttribute\(.style.|\.cssText|style=\{" frontend/src/pages/lab` no imprime nada.
  6. `npm run build`: el dist es el de la base, porque nadie importa la página.
  7. Commit: `feat(front): la página del laboratorio en React, sin montar`.
- **Compuerta:** los pasos 2, 5 y 6.

### Tarea 2.6 · Lo que dibujó A4, si entró antes (T025, P; sólo en la rama B)

- **Cuándo:** si T018 dio la rama B (A4 cambió la raíz en `lab.js`).
- **Qué porta** (research-f7b.md, R13), del `lab.js` de la base, sin inventar nada que no esté ahí:
  - los textos de A4 que nombraban el Playground: la guía de ejecución, el aviso bajo «Ejecutar y revisar», la vista previa y el aviso de fallo, en `ExecutionGuide`, `CodePhase` y `Review`;
  - la línea de intentos sin el número (su FR-038), en `FinishedReview`;
  - la espera: la rama `running` de `reviewHTML` pasa a `RunningReview`, que recibe el progreso con `useStore(runner.state, (state) => (state.status === 'running' ? state.progress : null))` y dibuja la línea de estado con la función de A4 que hoy la arma. «Cancelar ejecución» está en todos los estados y conserva su nodo;
  - el tipo: `LabPageProps.runner` y `CodePhaseProps.runner` pasan a `ExerciseRunner<ApiRunProgress>`, con el tipo que exporte A4.
- **La spec,** en `CodePhase.spec.tsx`: «keeps the cancel button when the queue position changes». Un runner doble cuyo `state` es un store de `zustand/vanilla`; se pasa de `{ status: 'running', exerciseId, progress: <el primer progreso de A4> }` al segundo, y el botón «Cancelar ejecución» es el mismo nodo y conserva el foco.
- **La red:** los E2E de A4 (los de F1 pasados al doble de `/api/runs` y los suyos) pasan sin editarse con la página.
- **Commit:** `feat(front): la página dibuja los estados de la espera de A4`.

## 3. Unidad 3 · El corte (dueños E y W, onda 3)

**Cubre:** FR-001, FR-002, FR-008, FR-010 a FR-016, FR-018, FR-019, FR-021, FR-036, FR-063 y FR-066 (la parte de código); US4 y US7; SC-001, SC-002, SC-003, SC-007, SC-011 y SC-012.

**Entrega:** dos commits.

1. **El rojo:** los 7 E2E de X1, contra el legacy.
2. **El corte:** la página montada, el legacy borrado y los checks ajustados, en un solo commit.

Revertir los dos, primero el corte, devuelve el laboratorio de F7a.

### Tarea 3.1 · Los E2E de X1, en rojo (T026, E)

- **Crea** `qa/e2e/specs/lab-react.spec.ts`. Cada prueba fija un cambio de «Lo que el port cambia a propósito», sin `KNOWN DEFECT`, y entra con la aprobación del clarify (FR-036):

`qa/e2e/specs/lab-react.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

// What the port changes on purpose (spec 021, «Lo que el port cambia a propósito», X1 and C2):
// the folding panels stay as the student left them, «Otra pista» does not close the solution,
// the focus stays on the pressed button and the filter status names the search.
const COMMUNITY_NOTES = 'Qué tomamos de estos recorridos y de la comunidad';
const FIRST_MISSION = 'Tu primera crate';
const PREVIEW = 'Ver el programa completo y sus pruebas';
const SOLUTION = 'Ver una solución razonada';
const CUSTOM_CASE = '＋ Inventá tu propio caso';
const REASONING = 'Contrastar con el razonamiento del revisor';
const RUST_01 = 'rust-01';

test.describe('the map after a filter', () => {
  test('the notes and the project missions stay open after a level and «Clásicos y sistemas»', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.panelToggle(COMMUNITY_NOTES).click();
    await lab.panelToggle(FIRST_MISSION).click();

    await lab.levelButton('Intermedio').click();
    await lab.extrasButton().click();

    await expect(lab.panel(COMMUNITY_NOTES)).toHaveAttribute('open', '');
    await expect(lab.panel(FIRST_MISSION)).toHaveAttribute('open', '');
  });

  test('«Repasar pendientes» keeps the notes open and the focus on its button', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.panelToggle(COMMUNITY_NOTES).click();

    await lab.dueButton().click();

    await expect(lab.dueButton()).toHaveText('Ver todos');
    await expect(lab.dueButton()).toBeFocused();
    await expect(lab.panel(COMMUNITY_NOTES)).toHaveAttribute('open', '');
  });

  test('the filter status names the search after a level and «Clásicos y sistemas»', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.searchBox().fill('memoria');
    await expect(lab.filterStatus()).toContainText('para tu búsqueda');

    await lab.levelButton('Todos los niveles').click();
    await expect(lab.filterStatus()).toContainText('para tu búsqueda');

    await lab.extrasButton().click();
    await expect(lab.filterStatus()).toHaveText(
      /^\d+ desafíos visibles para tu búsqueda · ampliación Clásicos y sistemas\.$/,
    );
  });
});

test.describe('the exercise after an action', () => {
  test('«Otra pista» does not close the solution', async ({ shell, lab }) => {
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.hintButton().click();
    await lab.panelToggle(SOLUTION).click();

    await lab.hintButton().click();

    await expect(lab.hints()).toHaveCount(2);
    await expect(lab.panel(SOLUTION)).toHaveAttribute('open', '');
  });

  test('confirming «Restaurar inicio» keeps the preview, the solution and your own case open', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.panelToggle(PREVIEW).click();
    await lab.panelToggle(SOLUTION).click();
    await lab.panelToggle(CUSTOM_CASE).click();

    await lab.restoreStarterButton().click();
    await lab.continueButton().click();

    await expect(lab.editor('rust')).toBeFocused();
    await expect(lab.panel(PREVIEW)).toHaveAttribute('open', '');
    await expect(lab.panel(SOLUTION)).toHaveAttribute('open', '');
    await expect(lab.panel(CUSTOM_CASE)).toHaveAttribute('open', '');
  });

  test('confirming «Cargarla y experimentar» keeps the preview and the solution open', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.panelToggle(PREVIEW).click();
    await lab.panelToggle(SOLUTION).click();

    await lab.loadSolutionButton().click();
    await lab.continueButton().click();

    await expect(lab.editor('rust')).toBeFocused();
    await expect(lab.panel(PREVIEW)).toHaveAttribute('open', '');
    await expect(lab.panel(SOLUTION)).toHaveAttribute('open', '');
  });

  test('a self-assessment keeps the reasoning open and the focus on the chosen button', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise(RUST_01, 'reflect'));
    await lab.panelToggle(REASONING).click();

    await lab.confidenceButton('Puedo explicarlo sin mirar').click();

    await expect(lab.nextReview()).toBeVisible();
    await expect(lab.confidenceButton('Puedo explicarlo sin mirar')).toBeFocused();
    await expect(lab.panel(REASONING)).toHaveAttribute('open', '');
  });
});
```

- **Pasos:**
  1. `npm run build` sobre la rama con U1 y U2 (el legacy sigue montado).
  2. `E2E_PORT=4281 npm run test:e2e -- lab-react.spec.ts`: **7 en rojo**, cada uno por la razón de X1, no por un localizador:

     | Prueba | Falla en el legacy porque |
     | --- | --- |
     | las notas y las misiones de proyecto abiertas | el redibujo del mapa cierra `details` (`toHaveAttribute('open', '')`) |
     | «Repasar pendientes» | el foco se pierde (`toBeFocused`) |
     | el estado del filtro con la búsqueda | el redibujo dice «6 desafíos visibles.» (`toContainText`) |
     | «Otra pista» | el reemplazo de `.lab-hints` cierra la solución |
     | «Restaurar inicio» | `render()` cierra la vista previa, la solución y el caso propio |
     | «Cargarla y experimentar» | ídem |
     | la autoevaluación | el foco se pierde |
  3. Commit: `test(e2e): lo que el port del laboratorio cambia a propósito (X1), en rojo`.
- **Compuerta:** el paso 2, con la razón de cada falla anotada en el mensaje del commit.

### Tarea 3.2 · El corte (T027, W)

- **Cuándo:** con T019 a T026 integradas.
- **Un solo commit,** en este orden de trabajo.

**1. El adaptador.** Crea los dos módulos (R1):

`frontend/src/app/legacy/lab-api.ts`:

```ts
import {
  exerciseCatalog,
  labStore,
  type Exercise,
  type ExerciseCatalog,
  type LabImportPlan,
} from '../../entities/exercise';
import {
  buildPlaygroundProgram,
  createExerciseRunner,
  createPlaygroundTransport,
} from '../../features/run-exercise';
import {
  campaignLock,
  clearSelection,
  createLabSession,
  type LabSession,
} from '../../pages/lab/composition';
import { readLinkQuery } from '../../shared/config/url-grammar';

let session: LabSession = createLabSession();
let notifyShell: (message: string) => void = () => {};

function linkedMission(exercise: Exercise): boolean {
  const link = readLinkQuery(location.search);
  const lock = campaignLock(
    window.TallerCampaignEngine,
    { world: link.missionWorld, workshop: link.missionWorkshop },
    exercise,
  );
  return lock !== null;
}

export const labRunner = createExerciseRunner({
  store: labStore,
  transport: createPlaygroundTransport(),
  now: () => Date.now(),
  notify: (message) => notifyShell(message),
  isLocked: linkedMission,
  isCampaignMission: (exercise) =>
    Boolean(window.TallerCampaignEngine.canAttempt(exercise.id, exercise.language).worldId),
  syncSystems: () => window.TallerSystemsEngine.syncLab(labStore.exportState()),
  syncCampaign: () => window.TallerCampaignEngine.syncLab(labStore.exportState()),
  logError: (error) => console.error(error),
});

export const programBuilder = buildPlaygroundProgram;
export const labCatalog: ExerciseCatalog = exerciseCatalog;

export function currentLabSession(): LabSession {
  return session;
}

export function keepLabSession(next: LabSession): void {
  session = next;
}

export function announceWith(notify: (message: string) => void): void {
  notifyShell = notify;
}

function init(): void {
  exerciseCatalog.init({
    rustLab: window.RUST_LAB || [],
    rustQuests: window.RUST_QUESTS || [],
    goLab: window.GO_LAB || [],
    goQuests: window.GO_QUESTS || [],
    systemsLowlevel: window.SYSTEMS_LOWLEVEL_LABS || [],
    systemsInfra: window.SYSTEMS_INFRA_LABS || [],
    systemsPlay: window.SYSTEMS_PLAY_LABS || [],
    systemsPc: window.SYSTEMS_PC_LABS || [],
  });
  // Nunca escribe al cargar: la primera escritura es una acción del alumno.
  labStore.open(exerciseCatalog);
}

function reset(): boolean {
  const removed = labStore.reset();
  session = clearSelection(session);
  labRunner.abort();
  return removed;
}

export const labApi = {
  init,
  loadWarning: () => labStore.loadWarning(),
  getExercises: (): readonly Exercise[] => exerciseCatalog.exercises,
  exportState: () => labStore.exportState(),
  planImport: (raw: unknown) => labStore.planImport(raw),
  applyImport: (plan: LabImportPlan) => labStore.applyImport(plan),
  backups: () => labStore.backups(),
  reset,
};
```

`frontend/src/app/legacy/register-lab.tsx`:

```tsx
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { LabPage, enterLab, type LabWorkshop } from '../../pages/lab';
import { readLinkQuery } from '../../shared/config/url-grammar';
import { getContent } from '../content/content';
import {
  announceWith,
  currentLabSession,
  keepLabSession,
  labApi,
  labCatalog,
  labRunner,
  programBuilder,
} from './lab-api';

let root: Root | null = null;

function workshops(): LabWorkshop[] {
  const { pc, lowlevel, infra, play } = getContent().workshops;
  return [...pc, ...lowlevel, ...infra, ...play] as unknown as LabWorkshop[];
}

function unmount(): void {
  root?.unmount();
  root = null;
  labRunner.abort();
}

function mount(
  host: HTMLElement | null,
  requestedLanguage: string,
  toast: (message: string) => void,
): void {
  unmount();
  if (!host) return;
  const language = requestedLanguage === 'go' ? 'go' : 'rust';
  announceWith(toast);
  const session = enterLab(
    currentLabSession(),
    language,
    readLinkQuery(location.search),
    labCatalog,
  );
  keepLabSession(session);
  const labRoot = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar el laboratorio.', error);
    },
  });
  root = labRoot;
  flushSync(() =>
    labRoot.render(
      <LabPage
        language={language}
        catalog={labCatalog}
        workshops={workshops()}
        runner={labRunner}
        programBuilder={programBuilder}
        initialSession={session}
        notify={toast}
        scrollToTop={() => host.scrollIntoView({ block: 'start' })}
        onSessionChange={keepLabSession}
      />,
    ),
  );
}

const adapter = { ...labApi, mount, unmount };
window.TallerLab = adapter;
```

En la rama B, las dos líneas del transporte y del constructor de `lab-api.ts` son las de A4 que T018 encontró en `lab.js`, y `createExerciseRunner` lleva el tipo de su progreso.

**2. La cadena y las hojas.**

```diff
diff --git a/frontend/src/app/boot/legacy-views.ts b/frontend/src/app/boot/legacy-views.ts
index 790e43f..b2f42b9 100644
--- a/frontend/src/app/boot/legacy-views.ts
+++ b/frontend/src/app/boot/legacy-views.ts
@@ -3,14 +3,11 @@ import type { BootStage } from './run-boot';
 // qa/load-order-check.ts reads this list: one `() => import('…'),` per line, in evaluation order.
 const LEGACY_MODULES: readonly (() => Promise<unknown>)[] = [
   () => import('../legacy/register-catalogs'),
-  () => import('../legacy/register-editor'),
-  () => import('../../../lab-explorers.js'),
-  () => import('../../../quest-explorers.js'),
   () => import('../legacy/register-systems-lowlevel'),
   () => import('../legacy/register-systems-infra'),
   () => import('../legacy/register-systems-play'),
   () => import('../legacy/register-systems-pc'),
-  () => import('../../../lab.js'),
+  () => import('../legacy/register-lab'),
   () => import('../legacy/register-atlas'),
   () => import('../legacy/register-campaign-engine'),
   () => import('../legacy/register-effects'),
```

```diff
diff --git a/frontend/src/app/main.tsx b/frontend/src/app/main.tsx
index 7734688..65c8220 100644
--- a/frontend/src/app/main.tsx
+++ b/frontend/src/app/main.tsx
@@ -1,8 +1,9 @@
 import '../../styles.css';
-import '../../lab.css';
+import '../pages/lab/ui/lab.css';
+import '../pages/lab/ui/lab-page.css';
 import '../pages/atlas/ui/atlas.css';
 import '../../campaign.css';
-import '../../quest-explorers.css';
+import '../pages/lab/ui/quest-explorers.css';
 import '../../systems.css';

 import { contentGate } from './boot/content-stage';
```

- `git mv frontend/lab.css frontend/src/pages/lab/ui/lab.css` y `git mv frontend/quest-explorers.css frontend/src/pages/lab/ui/quest-explorers.css`, sin editarlas (D4). Sobre la base con F5 y F6, las líneas de `campaign.css` y `systems.css` ya son las de sus páginas: cambian sólo las dos del laboratorio, en su lugar, y `lab-page.css` va justo después de `lab.css`.

**3. Los borrados.**

- `git rm frontend/lab.js frontend/lab-explorers.js frontend/quest-explorers.js`;
- `git rm frontend/src/app/legacy/register-editor.ts frontend/src/shared/ui/code-editor/mount-code-editor.ts`;
- en `frontend/src/shared/ui/code-editor/index.ts` salen las dos líneas de `mount-code-editor` (T022), y queda así:

`frontend/src/shared/ui/code-editor/index.ts`:

```ts
export { default as useCodeEditor } from './use-code-editor';
export type { CodeEditorBinding, CodeEditorHandle, UseCodeEditorOptions } from './use-code-editor';
export type { EditorLanguage } from './create-code-editor';
```

- `register-project-kit.ts`: `getExercises()` devuelve un arreglo de sólo lectura, el de `labApi`:

```diff
diff --git a/frontend/src/app/legacy/register-project-kit.ts b/frontend/src/app/legacy/register-project-kit.ts
index 6721950..2129bc0 100644
--- a/frontend/src/app/legacy/register-project-kit.ts
+++ b/frontend/src/app/legacy/register-project-kit.ts
@@ -13,7 +13,7 @@ import {
 import { downloadBlob } from '../../shared/lib/download-file';

 interface LabBridge {
-  getExercises(): KitExercise[];
+  getExercises(): readonly KitExercise[];
   exportState(): { records: Record<string, KitDraftRecord | undefined> };
 }
```

**4. Los adaptadores de F5 y F6** (R11). Se escribieron contra el código de sus planes y **no corrieron**. Si la versión integrada difiere, se aplica la misma intención y K revisa.

- **`frontend/src/app/legacy/register-systems.tsx` (F5).** Salen del objeto publicado `refresh`, `returnURL`, `missionIDs` y `exerciseContextHTML`. Salen también de la interfaz `TallerSystemsAdapter`, junto con las funciones `returnURL`, `missionIDs` y `exerciseContextHTML`, la variable `mountedLanguage` y su asignación en `mount`, y los imports que quedan sin uso: `workshopExerciseRole`, `workshopMissionIds` y `workshopReturnTarget` de `entities/systems-workshop/bridge`, `readLinkQuery` y `workshopReturnHref` de la gramática, y `escapeHtml`. `refresh()` queda como función interna, porque `mount` la llama. `BridgedWorkshop` sale y `workshops()` devuelve `SystemsWorkshop[]`. El objeto queda así:

  ```tsx
  interface TallerSystemsAdapter {
    init(): SystemsInitResult;
    sync(): SystemsSyncResult;
    mount(host: HTMLElement | null, lang: string, toast: Toast): void;
    unmount(): void;
    resetSimulations(): void;
  }

  function workshops(): SystemsWorkshop[] {
    return packages().flatMap((source) => source.workshops);
  }

  window.TallerSystems = {
    init,
    sync,
    mount,
    unmount,
    resetSimulations,
  };
  ```

- **`frontend/src/app/legacy/campaign-bridges.ts` (F6) se borra,** y `register-campaign.tsx` toma `refresh` y `sync`, con la misma captura del motor al evaluarse:

  ```tsx
  import { createRoot, type Root } from 'react-dom/client';
  import type {
    CampaignLabState,
    CampaignLanguage,
    RefreshResult,
    SyncLabResult,
  } from '../../entities/campaign';
  import {
    CampaignPage,
    createCampaignSession,
    openCampaignSession,
    type CampaignSession,
    type MissionContent,
  } from '../../pages/campaign';
  import { readLinkQuery } from '../../shared/config/url-grammar';
  import { stop } from '../../shared/lib/celebration';
  import { getContent, type Content } from '../content/content';

  declare global {
    interface Window {
      TallerCampaign: Readonly<{
        mount: typeof mount;
        unmount: typeof unmount;
        refresh: typeof refresh;
        sync: typeof sync;
      }>;
    }
  }

  const engine = window.TallerCampaignEngine;
  const lab = () => window.TallerLab as unknown as { exportState(): CampaignLabState };

  let session: CampaignSession = createCampaignSession();
  let root: Root | null = null;

  function refresh(): RefreshResult {
    return engine.refreshFromLab(lab().exportState());
  }

  function sync(): SyncLabResult {
    return engine.syncLab(lab().exportState());
  }
  ```

  `missionContentFor`, `unmount` y `mount` quedan como en F6; en `mount`, `campaignBridges.refresh()` pasa a `refresh()`. La última línea es:

  ```tsx
  window.TallerCampaign = Object.freeze({ mount, unmount, refresh, sync });
  ```

- **Lo que arrastra el retiro en los archivos de F5 y F6:**
  - **`register-campaign.spec.tsx` (F6):** la lista de claves pasa a `['mount', 'refresh', 'sync', 'unmount']`, y los casos de `exerciseContextHTML`, `lockedExerciseHTML` y `returnURL` salen. Sus contratos ya los fijan `mission-bridges.spec.ts`, `MissionContext.spec.tsx` y la gramática.
  - **`qa/boot-check.ts` (F6):** sale `'frontend/src/app/legacy/campaign-bridges.ts'` de `LEGACY_SOURCES`, y el escenario «TallerCampaign publishes exactly the seven methods…» pasa a llamarse «…exactly the four methods that app.js uses» y a esperar `['mount', 'refresh', 'sync', 'unmount']`.
  - **`qa/load-order-check.ts` (F6):** la razón de la restricción de la captura pasa a `'register-campaign.tsx captura window.TallerCampaignEngine en const engine al evaluarse'`.
  - **`qa/lib/legacy-sources.ts` (F5 y F6):** salen `CAMPAIGN_BRIDGES_SOURCE` y `loadCampaignBridges`, y `SYSTEMS_UI_SOURCE` y `loadSystemsUi` si `git grep` no les encuentra otro lector. Si `runSourceGroup` y `bundleSourceGroup` (F5, en `qa/lib/sources.ts`) quedan sin lector, salen también.
  - **`seams-guard-check.ts` (F6):** sus fixtures con la ruta `frontend/src/app/legacy/campaign-bridges.ts` pasan a `frontend/src/app/legacy/register-campaign.tsx`. Son textos que prueban R4 y R6, no archivos que se leen, y el resultado esperado no cambia.

**5. Los checks** (R10 y §5). Cambian cómo cargan o qué observan, nunca un valor esperado:

```diff
diff --git a/qa/lib/legacy-sources.ts b/qa/lib/legacy-sources.ts
index 826c4df..3765761 100644
--- a/qa/lib/legacy-sources.ts
+++ b/qa/lib/legacy-sources.ts
@@ -10,11 +10,9 @@ export type Language = 'rust' | 'go';
 // Contenido del recorrido, ejercicios, desafíos y mundos: un adaptador publica los 7 globals.
 export const CATALOGS_SOURCE = 'frontend/src/app/legacy/register-catalogs.ts';
 export const APP_SHELL_SOURCE = 'frontend/app.js';
-export const LAB_SOURCE = 'frontend/lab.js';
+export const LAB_SOURCE = 'frontend/src/app/legacy/lab-api.ts';
 export const CAMPAIGN_ENGINE_SOURCE = 'frontend/src/app/legacy/register-campaign-engine.ts';
-export const CAMPAIGN_UI_SOURCE = 'frontend/campaign.js';
 export const SYSTEMS_ENGINE_SOURCE = 'frontend/src/app/legacy/register-systems-engine.ts';
-export const SYSTEMS_UI_SOURCE = 'frontend/systems.js';

 // Ejercicios del recorrido y desafíos de campaña.
 export const LAB_EXERCISE_SOURCES: readonly string[] = [CATALOGS_SOURCE];
@@ -61,7 +59,7 @@ export function loadSystemsCatalogs(context: vm.Context): void {
   for (const domain of SYSTEMS_DOMAINS) loadSystemsDomain(context, domain);
 }

-// Todo lo que lab.js lee al evaluarse: ejercicios, desafíos y núcleos de Sistemas.
+// Todo lo que TallerLab.init() lee: ejercicios, desafíos y núcleos de Sistemas.
 export function loadLabCatalogs(context: vm.Context): void {
   loadLabExercises(context);
   loadSystemsCatalogs(context);
@@ -71,23 +69,26 @@ export function loadCampaignWorlds(context: vm.Context): void {
   runAdapter(context, CATALOGS_SOURCE);
 }

-export function loadLab(context: vm.Context): void {
-  runSource(context, LAB_SOURCE);
-  (context.window as { TallerLab: { init(): void } }).TallerLab.init();
+export interface LabModule {
+  labApi: { init(): void };
+  labRunner: { run(exercise: unknown): Promise<void> };
+  labCatalog: { byId: ReadonlyMap<string, unknown> };
+  announceWith(notify: (message: string) => void): void;
 }

-export function loadCampaignEngine(context: vm.Context): void {
-  runSource(context, CAMPAIGN_ENGINE_SOURCE);
+// lab-api.ts is the part of window.TallerLab that does not draw: the check publishes it
+// as app.js finds it, without the page, and starts it like startApp().
+export function loadLab(context: vm.Context): LabModule {
+  const module = runModule<LabModule>(context, LAB_SOURCE);
+  (context.window as { TallerLab?: unknown }).TallerLab = module.labApi;
+  module.labApi.init();
+  return module;
 }

-export function loadCampaignUi(context: vm.Context): void {
-  runSource(context, CAMPAIGN_UI_SOURCE);
+export function loadCampaignEngine(context: vm.Context): void {
+  runSource(context, CAMPAIGN_ENGINE_SOURCE);
 }

 export function loadSystemsEngine(context: vm.Context): void {
   runSource(context, SYSTEMS_ENGINE_SOURCE);
 }
-
-export function loadSystemsUi(context: vm.Context): void {
-  runSource(context, SYSTEMS_UI_SOURCE);
-}
```

```diff
diff --git a/qa/lab-state-check.ts b/qa/lab-state-check.ts
index 1a8cb3e..5bcb973 100644
--- a/qa/lab-state-check.ts
+++ b/qa/lab-state-check.ts
@@ -36,7 +36,6 @@ interface TallerLabApi {
   applyImport: (plan: { state: LabState; lossy: boolean }) => boolean;
   backups: () => { key: string; text: string }[];
   getExercises: () => { id: string; tests: { id: string }[] }[];
-  mount: (host: unknown, language: string, notify: (message: string) => void) => void;
 }
 interface CampaignApi {
   init: (config: { exercises: unknown[]; worlds: Record<string, unknown[]> }) => void;
@@ -450,92 +449,35 @@ async function testAsync(name: string, run: () => Promise<void>): Promise<void>
   }
 }

-// --- Pestañas con el catálogo real y un DOM mínimo para disparar los handlers de lab.js ---
+// --- Tabs with the real catalog: the lab adapter without the page, as app.js and the runner use it ---

 const SLOT_KEYS = [LAB_BACKUP_KEY, ...[2, 3, 4, 5].map((number) => `${LAB_BACKUP_KEY}-${number}`)];
-const SYNC_FAILURE_NOTICE = 'No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.';
-
-interface StubElement {
-  innerHTML: string;
-  textContent: string;
-  open: boolean;
-  value: string;
-  classList: { toggle(): void; add(): void };
-  setAttribute(): void;
-  replaceWith(): void;
-  focus(): void;
-  select(): void;
-  scrollIntoView(): void;
-  content: { querySelector(): StubElement; firstElementChild: StubElement };
-}
+
 interface TabOptions {
   failRemove?: boolean;
-  campaignSync?: () => { xpGained?: number } | undefined;
   fetch?: () => Promise<unknown>;
 }
 interface Tab {
   lab: TallerLabApi;
   notices: string[];
-  errors: unknown[];
-  host: StubElement;
-  click(action: string, data?: Record<string, string>): void;
-  type(id: string, value: string): StubElement;
-  element(selector: string): StubElement;
-}
-
-function stubElement(): StubElement {
-  const element: StubElement = {
-    innerHTML: '',
-    textContent: '',
-    open: false,
-    value: '',
-    classList: { toggle: () => undefined, add: () => undefined },
-    setAttribute: () => undefined,
-    replaceWith: () => undefined,
-    focus: () => undefined,
-    select: () => undefined,
-    scrollIntoView: () => undefined,
-    content: {
-      querySelector: () => element,
-      get firstElementChild() {
-        return element;
-      },
-    },
-  };
-  return element;
+  run(id: string): Promise<void>;
 }

-// Una pestaña del navegador sobre el almacenamiento compartido `saved`. El host acepta los
-// listeners que registra mount y devuelve el mismo elemento falso por selector, salvo el
-// contexto de campaña, que sólo existe si el check lo agrega.
+// A browser tab over the shared storage `saved`. The engines are stubs: a run syncs them
+// through window, as lab-api.ts does.
 function openTab(saved: Map<string, string>, options: TabOptions = {}): Tab {
-  const listeners = new Map<string, (event: unknown) => void>();
-  const elements = new Map<string, StubElement>();
-  const element = (selector: string): StubElement => {
-    if (!elements.has(selector)) elements.set(selector, stubElement());
-    return elements.get(selector) as StubElement;
-  };
-  const host = {
-    ...stubElement(),
-    addEventListener: (type: string, listener: (event: unknown) => void) =>
-      void listeners.set(type, listener),
-    removeEventListener: () => undefined,
-    querySelector: (selector: string) =>
-      selector === '.quest-lab-context' ? null : element(selector),
-    querySelectorAll: () => [],
-  };
   const notices: string[] = [];
-  const errors: unknown[] = [];
-  const window: Record<string, unknown> = {};
+  const window: Record<string, unknown> = {
+    TallerCampaignEngine: { syncLab: () => ({}), canAttempt: () => ({ worldId: null }) },
+    TallerSystemsEngine: { syncLab: () => ({}) },
+  };
   const context = vm.createContext({
     window,
     URL,
     URLSearchParams,
     AbortController,
     location: { search: '', hash: '', href: 'http://taller.test/' },
-    history: { replaceState: () => undefined },
-    document: { createElement: stubElement, activeElement: null },
-    console: { error: (error: unknown) => errors.push(error) },
+    console: { error: () => undefined },
     fetch: options.fetch,
     TextEncoder,
     setTimeout,
@@ -550,37 +492,12 @@ function openTab(saved: Map<string, string>, options: TabOptions = {}): Tab {
     },
   });
   loadLabCatalogs(context);
-  if (options.campaignSync) {
-    window.TallerCampaign = {
-      sync: options.campaignSync,
-      refresh: () => undefined,
-      exerciseContextHTML: () => '',
-      lockedExerciseHTML: () => '',
-    };
-    window.TallerCampaignEngine = { canAttempt: () => ({ worldId: 'mundo-1' }) };
-  }
-  loadLab(context);
-  const lab = window.TallerLab as TallerLabApi;
-  lab.mount(host, 'rust', (message) => notices.push(message));
-  const dispatch = (type: string, event: object): void => {
-    (listeners.get(type) as (event: unknown) => void)(event);
-  };
+  const module = loadLab(context);
+  module.announceWith((message) => notices.push(message));
   return {
-    lab,
+    lab: window.TallerLab as TallerLabApi,
     notices,
-    errors,
-    host,
-    element,
-    click(action, data = {}) {
-      const target = { dataset: { labAction: action, ...data }, closest: () => target };
-      dispatch('click', { target });
-    },
-    type(id, value) {
-      const target = element('#' + id);
-      Object.assign(target, { id, value });
-      dispatch('input', { target });
-      return element('#' + id + '-status');
-    },
+    run: (id) => module.labRunner.run(module.labCatalog.byId.get(id)),
   };
 }

@@ -598,80 +515,19 @@ function storedRecords(saved: Map<string, string>): Record<string, LabRecord> {
   return JSON.parse(saved.get(LAB_KEY) ?? '{}').records;
 }

-test('Two tabs: a stale tab keeps the other tab progress and its own consecutive saves', () => {
-  const saved = new Map<string, string>();
-  const tabA = openTab(saved),
-    tabB = openTab(saved);
-  const { lab } = tabA;
-  const proof = fullProof(lab, 'rust-01');
-  assert.equal(
-    lab.applyImport(lab.planImport({ version: 1, records: { 'rust-01': proof } })),
-    true,
-  );
-  tabB.click('open', { id: 'rust-02' });
-  tabB.click('predict', { answer: '1' });
-  tabB.click('hint');
-  const records = storedRecords(saved);
-  assert.equal(records['rust-01'].solvedAt, 100);
-  assert.equal(records['rust-01'].result?.success, true);
-  assert.equal((records['rust-02'] as { prediction?: number }).prediction, 1);
-  assert.equal(records['rust-02'].hints, 1);
-  assert.equal(JSON.parse(saved.get(LAB_KEY) ?? '{}').selected.rust, 'rust-02');
-});
-
-test('Two tabs: a lossy text from the other tab keeps the known solved exercise and leaves a backup', () => {
-  const saved = new Map<string, string>();
-  const tab = openTab(saved);
-  const proof = fullProof(tab.lab, 'rust-06');
-  // Otra pestaña (versión que conoce `rust-999`) guarda un texto con un ID que ésta no reconoce.
-  const otherTabText = JSON.stringify({
-    version: 1,
-    records: { 'rust-06': proof, 'rust-999': { draft: 'ejercicio desconocido' } },
-    selected: {},
-  });
-  saved.set(LAB_KEY, otherTabText);
-  tab.click('open', { id: 'rust-02' });
-  const records = storedRecords(saved);
-  assert.equal(records['rust-06'].solvedAt, 100);
-  assert.equal(records['rust-06'].result?.success, true);
-  assert.equal('rust-999' in records, false);
-  assert.equal(saved.get(LAB_BACKUP_KEY), otherTabText);
-});
-
-test('Two tabs: the merge happens in place, so a record held across the merging save keeps mutating', () => {
-  const saved = new Map<string, string>();
-  const tabA = openTab(saved),
-    tabB = openTab(saved);
-  tabB.click('open', { id: 'rust-02' }); // crea el registro vacío de rust-02 al renderizar
-  const { lab } = tabA;
-  lab.applyImport(
-    lab.planImport({ version: 1, records: { 'rust-01': fullProof(lab, 'rust-01') } }),
-  );
-  tabB.click('predict', { answer: '1' }); // este guardado fusiona lo de A
-  tabB.click('hint');
-  tabB.click('hint');
-  const records = storedRecords(saved);
-  assert.equal(records['rust-01'].solvedAt, 100);
-  assert.equal((records['rust-02'] as { prediction?: number }).prediction, 1);
-  assert.equal(records['rust-02'].hints, 2);
-});
-
-// Un solo handler guarda dos veces sobre el mismo `record`: la ejecución suma el intento
-// (primer guardado, que fusiona lo de A) y, al volver del compilador, escribe el resultado
-// sobre la referencia que ya tenía.
+// The run holds its record across two saves: the attempt (which merges what tab A saved)
+// and, back from the compiler, the result.
 await testAsync(
   'Two tabs: a run keeps writing its held record after the save that merged the other tab',
   async () => {
     const saved = new Map<string, string>();
     const tabA = openTab(saved);
     const tabB = openTab(saved, { fetch: () => Promise.reject(new TypeError('sin red')) });
-    tabB.click('open', { id: 'rust-02' });
     const { lab } = tabA;
     lab.applyImport(
       lab.planImport({ version: 1, records: { 'rust-01': fullProof(lab, 'rust-01') } }),
     );
-    tabB.click('run');
-    await new Promise((resolve) => setTimeout(resolve, 0));
+    await tabB.run('rust-02');
     const records = storedRecords(saved);
     assert.equal(records['rust-01'].solvedAt, 100);
     assert.equal(records['rust-02'].attempts, 1);
@@ -690,31 +546,17 @@ await testAsync('Reset during a run aborts it and the late answer writes nothing
         answer = resolve;
       }),
   });
-  tab.click('open', { id: 'rust-02' });
-  tab.click('run');
+  const running = tab.run('rust-02');
   assert.equal(storedRecords(saved)['rust-02'].attempts, 1);

   assert.equal(tab.lab.reset(), true);
   answer({ ok: true, status: 200, json: async () => ({ success: true, stdout: '', stderr: '' }) });
-  await new Promise((resolve) => setTimeout(resolve, 0));
+  await running;

   assert.deepEqual(storedRecords(saved), {});
   assert.deepEqual(tab.notices, []);
 });

-test('One tab: emptied draft and reflection reload empty, without merging anything', () => {
-  const saved = new Map<string, string>();
-  const first = openTab(saved);
-  first.click('open', { id: 'rust-02' });
-  first.type('lab-reflection', 'mi explicación');
-  first.type('lab-code', 'fn main() {}');
-  first.type('lab-reflection', '');
-  first.type('lab-code', '');
-  const reloaded = openTab(saved).lab.exportState();
-  assert.equal(reloaded.records['rust-02'].reflection, '');
-  assert.equal(reloaded.records['rust-02'].draft, '');
-});
-
 test('planImport is pure and applyImport persists the planned state', () => {
   const saved = new Map<string, string>();
   const { lab } = openTab(saved);
@@ -747,27 +589,6 @@ test('planImport reports a lossy import for unknown ids and a lossless one for r
   }
 });

-function predictionTab(campaignSync: TabOptions['campaignSync']): Tab {
-  const tab = openTab(new Map(), { campaignSync });
-  tab.click('open', { id: 'rust-02' });
-  return tab;
-}
-
-test('A failing campaign sync after a prediction is not propagated and is reported once', () => {
-  const tab = predictionTab(() => {
-    throw new Error('campaña caída');
-  });
-  assert.doesNotThrow(() => tab.click('predict', { answer: '1' }));
-  assert.deepEqual(tab.notices, [SYNC_FAILURE_NOTICE]);
-  assert.equal(tab.errors.length, 1);
-});
-
-test('A prediction that earns campaign XP announces them', () => {
-  const tab = predictionTab(() => ({ xpGained: 15 }));
-  tab.click('predict', { answer: '1' });
-  assert.deepEqual(tab.notices, ['+15 XP por razonar tu predicción.']);
-});
-
 test('Reset reports success and clears the backup slots; a failing removal reports false', () => {
   const saved = new Map<string, string>([[LAB_KEY, '{roto']]);
   const { lab } = openTab(saved);
@@ -783,23 +604,19 @@ test('backups lists the slot created by a degraded load', () => {
   assert.deepEqual(plain(lab.backups()), [{ key: LAB_BACKUP_KEY, text: '{roto' }]);
 });

-test('A degraded load without a secured copy never touches the key and never says saved', () => {
+test('A degraded load without a secured copy never touches the key', () => {
   const saved = new Map<string, string>([[LAB_KEY, '{roto']]);
   SLOT_KEYS.forEach((slot, index) => saved.set(slot, `otro texto ${index}`));
   const before = [...saved.entries()];
   const tab = openTab(saved);
-  assert.ok(tab.host.innerHTML.includes('El guardado local no está disponible'));
-  tab.click('open', { id: 'rust-02' });
-  const status = tab.type('lab-reflection', 'no se puede guardar');
-  assert.equal(status.textContent, 'El guardado no está disponible: exportá tu avance.');
   assert.equal(tab.lab.applyImport(tab.lab.planImport({ version: 1, records: {} })), false);
   assert.deepEqual([...saved.entries()], before);
 });

-// lab.js is bundled alone and loaded beside register-campaign-engine.ts: it must carry the lab
-// store once and no engine (spec 021, FR-015).
-test('lab.js bundles the lab store once and no engine or route store', () => {
-  const bundle = bundleSource('frontend/lab.js');
+// lab-api.ts is bundled alone and loaded beside register-campaign-engine.ts: it must carry the
+// lab store once and no engine (spec 021, FR-014 and FR-015).
+test('lab-api.ts bundles the lab store once and no engine or route store', () => {
+  const bundle = bundleSource('frontend/src/app/legacy/lab-api.ts');
   const occurrences = (key: string) => bundle.split(key).length - 1;
   assert.equal(occurrences('taller-laboratorio-v1'), 1);
   assert.equal(occurrences('taller-campaign-v1'), 0);
```

```diff
diff --git a/qa/boot-check.ts b/qa/boot-check.ts
index 99f4ffa..e7be022 100644
--- a/qa/boot-check.ts
+++ b/qa/boot-check.ts
@@ -88,7 +88,7 @@ const VIEW_HEADINGS: Record<(typeof VIEWS)[number], string> = {
   campana: 'CAMPAÑA · RUST',
   sistemas: 'SISTEMAS · APRENDER DESARMANDO',
   atlas: '',
-  laboratorio: 'LABORATORIO · RUST',
+  laboratorio: '',
   biblioteca: 'RECURSOS CON INTENCIÓN',
   proyecto: 'UNA IDEA QUE CRECE CON VOS',
   metodo: 'HACER ESPACIO PARA APRENDER',
@@ -103,9 +103,9 @@ await test('navegación: cada vista se renderiza por hash sin lanzar', async ()
     harness.navigate(view);
     await harness.flush();
     assert.deepEqual(harness.errors, [], `errores al navegar a #${view}`);
-    if (view === 'atlas') {
-      // El Atlas es React: monta nodos reales en #main en lugar de escribir innerHTML.
-      assert.ok(main.childNodes.length > 0, 'el Atlas no montó nodos en #main');
+    if (view === 'atlas' || view === 'laboratorio') {
+      // El Atlas y el laboratorio son React: montan nodos reales en #main en lugar de escribir innerHTML.
+      assert.ok(main.childNodes.length > 0, `#${view} no montó nodos en #main`);
     } else {
       assert.ok(main.innerHTML.includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
     }
@@ -263,19 +263,26 @@ for (const file of FROZEN_EXPORTS) {

 const LEGACY_SOURCES = [
   'frontend/app.js',
-  'frontend/lab.js',
+  'frontend/src/app/legacy/lab-api.ts',
   'frontend/campaign.js',
   'frontend/systems.js',
-  'frontend/lab-explorers.js',
-  'frontend/quest-explorers.js',
 ];
+const REACT_ADAPTERS = ['frontend/src/app/legacy/register-lab.tsx'];

-await test('each legacy source evaluated alone neither throws nor touches the storage', () => {
+async function evaluateAlone(context: vm.Context, source: string): Promise<void> {
+  if (REACT_ADAPTERS.includes(source)) {
+    vm.runInContext(await bundleApp(source), context, { filename: source });
+  } else {
+    runSource(context, source);
+  }
+}
+
+await test('each legacy source evaluated alone neither throws nor touches the storage', async () => {
   const problems: string[] = [];
-  for (const source of LEGACY_SOURCES) {
+  for (const source of [...LEGACY_SOURCES, ...REACT_ADAPTERS]) {
     const harness = createBootHarness({ blockStorage: true });
     try {
-      runSource(harness.context, source);
+      await evaluateAlone(harness.context, source);
     } catch (error) {
       problems.push(`${source} threw: ${(error as Error).message}`);
       continue;
```

```diff
diff --git a/qa/load-order-check.ts b/qa/load-order-check.ts
index e0c026d..8e43169 100644
--- a/qa/load-order-check.ts
+++ b/qa/load-order-check.ts
@@ -19,7 +19,7 @@ import { repoRoot } from './lib/sources.ts';
 type Constraint = [before: string, after: string, reason: string];

 const APP = 'frontend/app.js';
-const LAB = 'frontend/lab.js';
+const LAB = 'frontend/src/app/legacy/register-lab.tsx';
 const STYLES = 'frontend/styles.css';
 const ATLAS = 'frontend/src/app/legacy/register-atlas.tsx';
 const CAMPAIGN_ENGINE = 'frontend/src/app/legacy/register-campaign-engine.ts';
@@ -48,7 +48,7 @@ const CONSTRAINTS: Constraint[] = [
   ...BEFORE_LAB.map((catalog): Constraint => [
     catalog,
     LAB,
-    'lab.js arma la lista exercises/byId con window.RUST_LAB, GO_LAB, *_QUESTS y SYSTEMS_*_LABS al evaluarse; sanitize() descarta el progreso de IDs ausentes en byId',
+    'TallerLab.init() de lab-api.ts arma la lista exercises/byId con window.RUST_LAB, GO_LAB, *_QUESTS y SYSTEMS_*_LABS; sanitize() descarta el progreso de IDs ausentes en byId',
   ]),
   ...SYSTEMS_CATALOGS.map((catalog): Constraint => [
     catalog,
```

```diff
diff --git a/qa/lib/seams-guard.ts b/qa/lib/seams-guard.ts
index 52c5dff..d15c874 100644
--- a/qa/lib/seams-guard.ts
+++ b/qa/lib/seams-guard.ts
@@ -18,7 +18,7 @@ const FACTORIES: readonly string[] = [

 const INDEX_OWNERS: Readonly<Record<string, string>> = {
   guide: 'frontend/app.js',
-  exercise: 'frontend/lab.js',
+  exercise: 'frontend/src/app/legacy/lab-api.ts',
   campaign: 'frontend/src/app/legacy/register-campaign-engine.ts',
   'systems-workshop': 'frontend/src/app/legacy/register-systems-engine.ts',
 };
```

```diff
diff --git a/qa/seams-guard-check.ts b/qa/seams-guard-check.ts
index 4c9b999..32eddb8 100644
--- a/qa/seams-guard-check.ts
+++ b/qa/seams-guard-check.ts
@@ -25,7 +25,7 @@ const STORE_FILES: Record<string, string> = {
 };

 const LEGACY_OWNERS: Record<string, string> = {
-  'frontend/lab.js': `import { labStore, exerciseCatalog } from './src/entities/exercise';`,
+  'frontend/src/app/legacy/lab-api.ts': `import { labStore, exerciseCatalog } from '../../entities/exercise';`,
   'frontend/app.js': `import {\n  mergeRouteProgress,\n  routeStore,\n} from './src/entities/guide';`,
   'frontend/src/app/legacy/register-campaign-engine.ts': `import { campaignEngine, type CampaignEngine } from '../../entities/campaign';`,
   'frontend/src/app/legacy/register-systems-engine.ts': `import { systemsEngine, type SystemsEngine } from '../../entities/systems-workshop';`,
@@ -238,7 +238,7 @@ test('R6: an adapter under app/legacy that imports a type from a slice model is

 test('R6: an @x entry of a slice imported from a legacy source is reported', () => {
   const violations = findViolations({
-    'frontend/lab-explorers.js': `import { hasPassingEvidence } from './src/entities/exercise/@x/campaign';`,
+    'frontend/app.js': `import { hasPassingEvidence } from './src/entities/exercise/@x/campaign';`,
   });
   assert.deepEqual(rulesOf(violations), ['R6']);
 });
@@ -248,7 +248,7 @@ test('R6: the declared stateless entries and the slice entries themselves are no
     findViolations({
       'frontend/campaign.js': `import { campaignLinkAccess } from './src/entities/campaign/bridge';`,
       'frontend/systems.js': `import { workshopMissionIds } from './src/entities/systems-workshop/bridge';`,
-      'frontend/quest-explorers.js': `import { renderExplorer } from './src/entities/exercise/explorers';`,
+      'frontend/src/app/legacy/lab-api.ts': `import { initialLabExplorerState } from '../../entities/exercise/explorers';`,
       'frontend/src/entities/campaign/bridge.ts': `export { campaignLinkAccess } from './model/mission-bridge';
 import { campaignLinkAccess } from './model/mission-bridge';`,
     }),
```

```diff
diff --git a/qa/run-checks.ts b/qa/run-checks.ts
index 75cf5d3..3f4f501 100644
--- a/qa/run-checks.ts
+++ b/qa/run-checks.ts
@@ -22,10 +22,8 @@ const webChecks = [
   'lab-state-check.ts',
   'app-shell-check.ts',
   'boot-check.ts',
-  'lab-bridge-check.ts',
   'campaign-check.ts',
   'campaign-content-check.ts',
-  'quest-explorers-check.ts',
   'systems-check.ts',
   'systems-lowlevel-check.ts',
   'systems-infra-check.ts',
```

- `git rm qa/lab-bridge-check.ts qa/quest-explorers-check.ts` (la correspondencia, en §5).
- Sobre la base con F5 y F6, `boot-check` ya tiene la lista de vistas de React (`'atlas'`, `'campana'` y `'sistemas'`). F7b le suma `'laboratorio'`, con el encabezado vacío, y suma `register-lab.tsx` a la lista de adaptadores de React que se evalúan solos con `bundleApp`. El diff de arriba es contra la base de F7a.

**6. Pasos:**

1. Todo lo anterior.
2. `npm run build`, `npm test` (37 checks en el prototipo, más los que hayan sumado F5 y F6) y `npm run test:unit`.
3. `E2E_PORT=4284 npm run test:e2e`: **todos en verde**. Son los 184 de hoy, los 2 de T019 y los 7 de T026 (193 en el prototipo), más los de F5 y F6.
4. `node qa/lab-state-check.ts` da 33; `node qa/boot-check.ts`, `node qa/load-order-check.ts` y `node qa/seams-guard-check.ts`, en verde.
5. **Las mutaciones,** cada una detectada:
   - `reset` de `lab-api.ts` sin `labRunner.abort()`: falla «Reset during a run aborts it and the late answer writes nothing»;
   - `lab-api.ts` importa `campaignEngine` del índice de `entities/campaign`: fallan el aislamiento de `lab-state-check` y `seams-guard-check` (R4);
   - `register-lab.tsx` congela `window.TallerLab`: fallan dos escenarios de `boot-check` («borrar todo…» y «startApp initializes in order…»), que espían sus métodos;
   - `replaceText` sin la anotación: fallan dos E2E de F7a, «loading the solution asks first, saves once…» y «restoring the starter saves it once…»;
   - el `select` del explorador genérico sin `select.focus()`: falla el E2E de F7a «generic (rust-36)…», porque Playwright no enfoca al elegir una opción.
6. `npm run lint`: 0 errores y el total de T018 menos 13.
7. `npm run format:check` y `git diff --check`.
8. Los `grep` de quickstart-f7b.md §2, en 0.
9. **Un solo commit:** `feat(front): el laboratorio es una página de React y se retiran lab.js, sus exploradores y sus globals`.

- **Compuerta:** los pasos 2 a 8.
- **Vuelta atrás:** revertí el corte y después el rojo de T026. Vuelven `lab.js`, los exploradores, las hojas, los globals, los métodos de los adaptadores y los checks.

## 4. Unidad 4 · Las comparaciones únicas y el cierre (coordinador K, onda 4)

### Tarea 4.1 · Las comparaciones únicas (T028, K)

**Cubre:** FR-064, FR-065, FR-016 y FR-018 (la parte de la página); SC-003, SC-004 y SC-005.

Corren fuera del repositorio, con el script de quickstart-f7b.md §3, sobre dos raíces: un worktree de la base (el legacy de F7a) y la rama de F7b, cada una con su `npm run build`.

| Comparación | Qué mira | Esperado (medido en el prototipo) |
| --- | --- | --- |
| **El DOM** (`dom`) | `#main` y el diálogo abierto en 32 estados: el mapa (vacío, con el progreso congelado, sin resultados, con búsqueda, con «Repasar pendientes» y en Go), cada fase, los estados del revisor, el bloqueo, los dos contextos, las pistas, el diálogo y los nueve exploradores | 32 estados, **0 diferencias** fuera de la lista |
| **Las trazas de los exploradores** (`explorers`) | En los 73 ejercicios con explorador, hasta 12 botones de cada uno: el texto dibujado, la región viva y el foco después de cada operación | 73 trazas y 177 pasos, **0 diferencias** |
| **El barrido de estilo computado** (`style`) | Las mismas 32 situaciones a 1200, 981, 850, 700, 650 y 590 px, con y sin movimiento reducido: cada propiedad computada de cada elemento y su caja | 384 capturas, **0 diferencias** |
| **Lo que se escribe** | Los E2E de F7a con `storage.watchWrites()` y la exportación de cada fixture congelada (SC-012) | Las tres fixtures con 0 escrituras; las secuencias, iguales |

**La lista de diferencias admitidas** (FR-064), que va en el PR:

- los atributos `data-*` de delegación de los tres archivos (`data-lab-action`, `data-id`, `data-level`, `data-phase`, `data-answer`, `data-operation`, `data-confidence`, `data-days`, `data-test-id`, `data-quest-op`, `data-quest-explorer`, `data-q-view`, `data-q-status`, `data-explorer` y `data-confirm`);
- el `pre#lab-line-numbers` y el `textarea#lab-code`, ocultos, que se van con el editor de respaldo (D2);
- el `<dialog id="lab-confirm-dialog">` cerrado, que hoy queda en `<body>` y con la página no existe (R8);
- la clase `lab-reasoning`, que reemplaza a los dos `style=` (R9);
- lo que React escribe como propiedad y no como atributo (`value` de la búsqueda y `selected` de las opciones del explorador genérico);
- los nodos de texto que sólo tienen espacios entre elementos, que el HTML de hoy trae por los saltos de línea de sus plantillas y que no se dibujan;
- el texto de «Copia independiente», que hoy vuelve a ese texto en cada redibujo aunque la copia siga activa y con la página sigue al estado (C2).

- **Pasos:**
  1. Las cuatro comparaciones, con los puertos libres (`ss -ltn | grep -E ':450[12]\b'` no imprime nada).
  2. **El control negativo** (en una copia descartable, una vez): en `TopicGrid.tsx`, `` {`${solvedTotal}/${total.length}`} `` pasa a `{solvedTotal}/{total.length}`. Esperado: el barrido da diferencias de ancho en las tarjetas de temas (784 a 1200 px, con y sin movimiento reducido, en el prototipo) y el DOM, ninguna.
  3. Las cantidades, en la descripción del PR.
- **Compuerta:** las cuatro en 0 fuera de la lista, y el control negativo detectado.

### Tarea 4.2 · La documentación (T029, K)

**Cubre:** FR-066 (la parte de F7b).

| Archivo | Cambio |
| --- | --- |
| `docs/architecture.md`, mapa de archivos | La fila «Laboratorio, revisión y modelos educativos» pasa a `frontend/src/pages/lab/` (el modelo, la página y la hoja), con el adaptador `frontend/src/app/legacy/lab-api.ts` y `register-lab.tsx`. La de «Editor CodeMirror 6» pasa a `shared/ui/code-editor/` con `useCodeEditor`, sin adaptador. La de «Interfaz y exploradores de campaña» deja de nombrar `quest-explorers.js` y su hoja: los exploradores viven en `pages/lab/ui/explorers/`. Las filas de la gramática y del shell dejan de nombrar `lab.js` y `lab.css`. La fila de la campaña y la de Sistemas dicen que sus adaptadores ya no arman HTML para el laboratorio |
| `docs/architecture.md`, «Estado actual» de Feature-Sliced Design | `pages/lab` suma `ui` y `lib` y la entrada `composition.ts` |
| `qa/AGENTS.md` | La línea de `loadLab` dice que evalúa `lab-api.ts` y publica `labApi`. Salen las filas de `lab-bridge-check` y `quest-explorers-check`: el contexto y los exploradores se prueban con `npm run test:unit -- src/pages/lab` y los E2E `lab-*.spec.ts`. El párrafo de los checks que caracterizan el comportamiento deja de nombrar `lab-bridge-check` |
| `AGENTS.md` | La lista de vistas legacy de `frontend/` queda en `app.js` (con F5 y F6 ya integradas). La frase «Atlas es la primera vista migrada; el resto conserva adaptadores legacy temporales» nombra también el laboratorio |
| `docs/adr/0008-pruebas-del-front.md` | No cambia: el arnés lo registró quien lo trajo |

- **Pasos:**
  1. Verificá las rutas y los enlaces.
  2. Corré `git diff --check`.
  3. Commit: `docs: el laboratorio como página de React, sin lab.js ni sus exploradores legacy`.

### Tarea 4.3 · Compuerta final y PR (T030, K)

- **La compuerta final de §0.2:** el tamaño (`html.length` bajo 1 250 000 y hasta +17 000 sobre T018), los `grep` en 0, ningún estilo en línea nuevo y la correspondencia de §5.
- **Con permiso del usuario:** `docker compose build taller`.
- **La comprobación con lector de pantalla** (X2, riesgo 5) es del usuario: con NVDA u Orca, lo que anuncian `#lab-review` al terminar una ejecución, `#lab-filter-status` al buscar, la región del robot al moverlo y `.explorer-explanation` del canal. Se registra en la revisión del PR.
- **La descripción del PR**, en inglés:
  - el contexto (P2, X1 con C2, X2, F9-Q4 y C4);
  - qué faltaba y por qué;
  - qué cambia;
  - cómo se verificó: los comandos, los números (el antes y el después del HTML, de los avisos y de los E2E) y las comparaciones de T028 con la lista de diferencias admitidas;
  - la correspondencia de §5;
  - quién lee cada método de `window.TallerLab` y qué ítem lo retira (§6, FR-014);
  - lo pendiente: los hallazgos del informe.
- **El título:** `feat(lab): port the lab view to React and retire lab.js, its explorers and their globals (F7b)`.
- **El PR cubre** los 52 requisitos de F7b (§7) y SC-001 a SC-012 en su parte.
- **Reversión de F7b:** se revierten T030 a T019 en orden inverso, y el laboratorio vuelve al de F7a.

## 5. La correspondencia de los checks (FR-063, la parte de F7b)

**`lab-state-check` (39 en la base, 33 después):**

| Escenarios | Qué les pasa |
| --- | --- |
| Los 24 de almacén, importación y carga | Sin cambios: `loadLab` carga `lab-api.ts` y publica `labApi` |
| «planImport is pure…», «planImport rejects…», «planImport reports a lossy import…», «Reset reports success…» y «backups lists the slot…» | Sin cambios: la pestaña se abre sin DOM |
| «Two tabs: a run keeps writing its held record…» | Ejecuta con `labRunner.run` de `lab-api.ts` en lugar del clic; las tres aserciones son las mismas |
| «Reset during a run aborts it…» | Ídem; `reset` aborta sin la página |
| «A degraded load without a secured copy never touches the key and never says saved» | Se queda la parte del almacén («…never touches the key»). El texto de la reflexión pasa a `ReflectPhase.spec.tsx` («says that nothing is saved…») y el aviso del mapa, a `LabMap.spec.tsx` («warns when the storage is not available») |
| «lab.js bundles the lab store once…» | Pasa a `lab-api.ts`, con las mismas cuatro aserciones |
| «Two tabs: a stale tab keeps the other tab progress…» | Pasa a `lab-two-tabs.spec.tsx` |
| «Two tabs: a lossy text from the other tab…» | Pasa a `lab-two-tabs.spec.tsx` |
| «Two tabs: the merge happens in place…» | Pasa a `lab-two-tabs.spec.tsx` |
| «One tab: emptied draft and reflection reload empty…» | Pasa a `CodePhase.spec.tsx` («writes each change of the editor, also an emptied draft») y `ReflectPhase.spec.tsx` («writes an emptied reflection as an empty text»); la relectura la fija `lab-store.spec.ts` (F2a) |
| «A failing campaign sync after a prediction…» | Pasa a `PredictionCard.spec.tsx` |
| «A prediction that earns campaign XP announces them» | Pasa a `PredictionCard.spec.tsx` |

**`quest-explorers-check` (47 aserciones) se retira.** La tabla de la unidad 7 de F2b ya les dio dueño en `explorer-kinds.spec`, `quest-explorer.spec` y `lab-explorer.spec`. Las cinco que sólo veía el check:

| Aserción | Pasa a |
| --- | --- |
| El robot devuelve el foco al mismo control | E2E de F7a «robot (rust-103)…» y `QuestExplorer.spec.tsx` |
| El tamaño del paquete retiene el foco | E2E «a payload size clears the alterations and keeps the focus…» (T019) |
| «Restaurar paquete» retiene el foco | E2E ««Restaurar paquete» leaves a valid packet…» (T019) |
| El reinicio global limpia el robot | `lab-session.spec.ts` («restarts … every mission explorer») y E2E de F7a «opening another exercise empties the state of every mission explorer» |
| El reinicio global limpia el paquete | Ídem |

**`lab-bridge-check` (21) se retira:**

| Escenarios | Pasa a |
| --- | --- |
| Campaña: `returnURL` conserva `?mundo=<id>#campana` | `mission-bridges.spec.ts` («goes to the build part of the workshop, then to the world…») y `url-grammar.spec.ts` (F2b) |
| Campaña: el contexto de entrenamiento, el de Go, fuera de campaña y con las pruebas y la predicción del laboratorio (4) | `mission-bridges.spec.ts` («missionContext»), `mission-bridge.spec.ts` (F2b) y E2E de F1 (`bridges.spec.ts`) |
| Campaña: el tipo de misión | `selectors.spec.ts` de F6 (`missionTypeLabel`) |
| Campaña: el jefe bloqueado, la misión permitida, el jefe que se habilita y el enlace ajeno al mundo (4) | `mission-bridges.spec.ts` («campaignLock») y E2E de F1 y de F7a (el bloqueo) |
| Sistemas: el catálogo expone 25 talleres | `systems-check` («Complete release catalog contains 25 workshops…») |
| Sistemas: `missionIDs` (3) | `mission-bridges.spec.ts` («navigationList»), `workshop-bridge.spec.ts` (F2b) y `systems-check` (los 50 núcleos) |
| Sistemas: `returnURL` | `mission-bridges.spec.ts` y `url-grammar.spec.ts` |
| Sistemas: el núcleo, la herramienta previa, el que no es del taller y el núcleo verificado (4) | `mission-bridges.spec.ts` («missionContext») y E2E de F1 |
| Escape: los dos títulos hostiles | `MissionContext.spec.tsx`: React escribe texto, nunca marcado |

**Sin cambios:** `exercise-evidence-check`, `runtime-check`, `runner-check`, `curriculum-ids-check`, `versioned-storage-check`, `app-shell-check` y `import-cases-check`.

## 6. Lo que queda en `window.*` (FR-014 y SC-002)

| Global y métodos | Quién los lee después de F7b | Se retiran con |
| --- | --- | --- |
| `TallerLab.mount` y `unmount` | `app.js:render` | F10 |
| `TallerLab.init`, `loadWarning` y `getExercises` | `app.js` (`startApp`, los avisos y `syncLinkedLanguage`) | F10 |
| `TallerLab.exportState`, `planImport`, `applyImport`, `backups` y `reset` | El área `lab` de `features/progress-backup`, que arma `app.js` | F10, o F8 si saca el armado |
| `TallerLab.getExercises` y `exportState` | Los adaptadores de Sistemas (F5) y de campaña (F6), y `register-project-kit.ts` | F10 |
| `TallerCampaign.mount`, `unmount`, `refresh` y `sync` | `app.js` (`render` y `syncDerivedSeals`) | F10, o F8 para `sync` |
| `TallerSystems.init`, `sync`, `mount`, `unmount` y `resetSimulations` | `app.js` | F10, y F8 para `resetSimulations` |
| `TallerCampaignEngine` y `TallerSystemsEngine` | `progress-backup` y el runner de `lab-api.ts` | F10 |
| `TallerExplorers`, `TallerQuestExplorers` y `TallerEditor` | Nadie | **F7b** |
| `TallerCampaign.exerciseContextHTML`, `lockedExerciseHTML` y `returnURL`; `TallerSystems.exerciseContextHTML`, `missionIDs`, `returnURL` y `refresh` | Nadie | **F7b** |

## 7. Cobertura de requisitos (F7b)

| Requisito | Tareas | Cómo |
| --- | --- | --- |
| FR-001 | T019, T026, T027 | Los 61 de F7a sin editar; los 7 de X1 en rojo y después en verde |
| FR-002 | T019, T027 | Los 123 de F1 y A2 sin editar; el Page Object sólo suma |
| FR-003 | T024, T027, T030 | Sin dependencias ni estilos en línea; `lab-page.css` |
| FR-004 | T018, T030 | `html.length` antes y después |
| FR-005 | T018, T024, T027 | Salen 13 avisos; ninguna función nueva pasa de 10 |
| FR-006 | todas | Cada commit revertible; TDD en U2; el rojo de X1 |
| FR-007 | T024, T028 | El DOM de hoy; la comparación del DOM |
| FR-008 | T027 | `register-lab.tsx`: `createRoot` sobre `#main`, `flushSync` y el `console.error` en español |
| FR-009 | T024, T027 | Las props de `LabPage`; la vista no lee `window` |
| FR-010 | T027 | Los tres borrados y sus entradas |
| FR-011 | T024, T027 | `git mv` y `main.tsx` en su lugar |
| FR-012 (F7b) | T022, T027 | Salen `TallerExplorers`, `TallerQuestExplorers`, `TallerEditor` y `register-editor.ts` |
| FR-013 | T027 | Los adaptadores de F5 y F6 (R11) |
| FR-014 | T027 | `lab-api.ts` sin la vista: diez métodos con `mount` y `unmount`; el aislamiento |
| FR-015 | T027 | `load-order`, `boot-check`, `seams-guard`, `legacy-sources` y el aislamiento |
| FR-016 | T024, T027, T028 | Las escrituras de los manejadores; los E2E de F7a |
| FR-017 | T020, T021 | `enterLab` y `showExercise` |
| FR-018 | T027, T028 | Las fixtures sin escrituras; la exportación igual |
| FR-019 | T023, T024 | `labStore.getProgress()` en cada manejador; `useStore` con la revisión; `lab-two-tabs.spec.tsx` |
| FR-020 | T020, T021 | La sesión entre montajes, en `lab-api.ts` |
| FR-021 | T027 | `reset` aborta y limpia la selección; el escenario de `lab-state-check` |
| FR-022 a FR-025 | T021, T024 | El mapa, los filtros, «Sorprendeme» con `Math.random` controlable y los temas; los E2E de F7a |
| FR-026 y FR-027 | T024 | El encabezado, las pestañas y «Descubrí» |
| FR-028 | T024, T026 | «Experimentá»; la solución abierta (X1) |
| FR-029 (vista) | T024 | `Review` sobre `reviewStateOf` |
| FR-030 | T024 | «Inventar una variante» |
| FR-031 | T023, T024 | `ConfirmDialog` con portal |
| FR-032 | T021, T024 | `copyText` con `lab-copy-buffer` |
| FR-033 | T023, T024, T026 | «Explicá» con la clase `lab-reasoning`; el foco (X1) |
| FR-034 | T021, T024 | `navigationList` y `finishHref` |
| FR-035 | T021 | `replaceLabUrl` con `withLabQuery` (R3) |
| FR-036 | T026 | Los 7 E2E de X1 |
| FR-037 a FR-039 | T020, T021, T024 | Los puentes como datos, el bloqueo y el contexto |
| FR-040 a FR-042 | T022, T024, T027 | El hook, el DOM sin reconciliar y el retiro del respaldo |
| FR-051 (vista) | T024 | La vista previa y la copia con `programBuilder` |
| FR-056 a FR-059 | T023, T024, T019 | Los exploradores, su foco, sus regiones y los modelos visuales |
| FR-062 | T020, T023 | 5 specs de modelo y 9 de componente |
| FR-063 | T027 | §5 |
| FR-064 | T028 | La comparación del DOM y las trazas |
| FR-065 | T028 | El barrido |
| FR-066 | T029 | La documentación |

| Criterio de éxito | Tareas |
| --- | --- |
| SC-001 | T019, T026, T027 |
| SC-002 | T027 (`grep`) y §6 |
| SC-003 | T027, T028 |
| SC-004 y SC-005 | T028 |
| SC-007 | T027 (`npm test` y §5) |
| SC-008 | T030 |
| SC-009 | T024, T027 |
| SC-010 | T019, T023, T026 y la comprobación de T030 |
| SC-011 | T024, T030 |
| SC-012 | T027, T028 |

SC-006 es de F7a.

## Descargas y permisos

Ninguna descarga. El arnés de componentes lo trae F3, F5 o F6. Si al llegar F7b todavía no está, T018 pide el permiso con la tabla del plan de F6 (T002), en un commit propio.

## Riesgos y lo que quedó sin verificar

1. **Las specs de componente no corrieron** (R15). *Mitigación:* los E2E cubren los mismos comportamientos en el navegador, y T024 las corre en verde antes del corte.
2. **Los archivos de F5 y F6** pueden diferir de sus planes. *Mitigación:* T018 los inspecciona, y T027 aplica la intención con la revisión de K.
3. **El margen del peso** (R12): con los subpresupuestos de los otros planes, F7b deja 707 caracteres para F9 a F12 y A3. *Mitigación:* el tope de +17 000 en la compuerta, y el hallazgo para el coordinador.
4. **Lo que anuncia un lector de pantalla** con las regiones vivas montadas (X2). *Mitigación:* la comprobación del usuario en T030.
5. **El barrido no ve `:hover`, `:focus` ni las animaciones.** *Mitigación:* las hojas se mueven sin editarse, y las tres reglas nuevas no tienen esos estados.
6. **La rama B de C4** depende de lo que A4 deje en `lab.js`. *Mitigación:* T025 sólo porta lo que está ahí, y los E2E de A4 lo vigilan.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| Dos módulos para un global (`lab-api.ts` y `register-lab.tsx`) y una segunda entrada del slice (`composition.ts`) | Los checks evalúan `TallerLab` junto con los motores, y `reset` tiene que abortar sin la página (FR-014 y FR-021) | Un solo módulo: arrastra React, la página y dos motores a cada check (riesgo 12) |
| Plantillas de texto en lugar de JSX mezclado | El kerning cambia el ancho cuando el texto se parte en nodos (R7) | JSX mezclado: más legible, pero el barrido da diferencias de fracción de píxel en 157 tarjetas |
