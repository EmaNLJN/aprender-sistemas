# Implementation Plan: F7a · El laboratorio sin vista nueva

**Branch**: `021-f7-laboratorio` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F7, en su parte a (P2): los 30 requisitos con la marca *(F7a)* o *(F7a y F7b)*. Decisiones y mediciones: [research.md](./research.md). Contrato público: [contracts/run-exercise.md](./contracts/run-exercise.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md). F7b va en `plan-f7b.md`.

**Objetivo.** Sacar de `frontend/lab.js` la ejecución, el diagnóstico, los selectores y las reglas del registro a módulos con contrato, fijados antes por E2E contra el legacy, sin que el alumno note nada y dejando a A4 un puerto de transporte que cambia sin tocar la orquestación.

**Arquitectura.**

- **`features/run-exercise`** orquesta una ejecución con todas sus dependencias inyectadas. Recibe el transporte como un puerto (`ExerciseTransport`) y expone el estado en un store de `zustand/vanilla`, genérico en el progreso del adaptador.
- **`entities/exercise`** suma las reglas puras: `diagnose`, `liveHint`, los selectores del registro, los parches que cambian un registro y el clasificador del revisor. **`pages/lab/model`** suma los selectores del mapa.
- **`lab.js`** sigue dibujando todo y pasa a ser la raíz de composición del laboratorio: crea el runner con el adaptador de los Playgrounds, se suscribe a su estado y usa las reglas. Con eso se retiran `window.TallerRunner` y `register-runner.ts`.

**Stack.** TypeScript (ES modules) en `frontend/src/` y `qa/`, y JavaScript legacy en `frontend/lab.js`. Node 24.21.0, Vite 8.3.2, esbuild 0.28.2, Zustand 5.0.15, Vitest 5.0.3 (proyecto `node`) y `@playwright/test` 1.63.0. Ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Reglas para todos los agentes», la sección 0 («Línea base y compuerta») y la sección de tu dueño. `tasks.md` tiene una línea por tarea (T001 a T017) y remite acá.
> - **El código del plan corrió.** Todo lo que este plan trae (archivos nuevos, diffs y specs) corrió en un prototipo, en una copia descartable de `f2b-acum@2b37caf4` (research.md, «Cómo se verificó»): 184 de 184 E2E, `npm test` en verde, 32 avisos de lint y las dos mutaciones detectadas.
> - **Los valores esperados salen del contrato:** el contenido de `content/`, las fixtures congeladas y los textos de hoy de `lab.js`. Si una prueba nueva falla contra el legacy, el valor del plan está mal: pará y avisale al coordinador, y no toques `lab.js` para que pase.
> - **La base de implementación** es `master` con F2a, A2 y F2b integradas. Si algún número de esta sección difiere en la base, T001 lo vuelve a medir y manda lo medido.

## Summary

F7a es la primera parte de F7 (P2): no hay vista nueva. Entrega los E2E del laboratorio y de los exploradores, escritos contra el legacy; las reglas del ejercicio en `entities/exercise`; los selectores del mapa en `pages/lab/model`; y `features/run-exercise`, con el adaptador de los Playgrounds. `lab.js` usa todo eso y deja de leer `window.TallerRunner`, que se retira con `register-runner.ts`.

El enfoque:

- **Un PR, cuatro unidades con su compuerta, en este orden:**
  - **U1, la red:** 61 E2E nuevos, en verde contra el legacy antes de cualquier cambio de `lab.js` (FR-001);
  - **U2, las reglas:** `entities/exercise` y `pages/lab/model`, con TDD;
  - **U3, la feature:** con TDD y una spec de aislamiento;
  - **U4, el cableado:** `lab.js` usa las reglas y después la feature; se retiran el adaptador y el global, y se ajustan los checks.

  U1 y U2 corren a la vez. U3 espera a U2, y U4 espera a las tres.
- **El puerto es genérico en el progreso** (`ExerciseTransport<Progress>` y `RunState<Progress>`): A4 suma sus estados de espera sin editar la feature (F7-Q2; research.md, R1).
- **Un solo lugar arma y recorta el `result`** (`buildRunResult`). El adaptador lee las marcas con `readTestMarkers`, que sale de `interpretRun` sin cambiar su comportamiento (R2).
- **La cancelación se decide por identidad, y `idle` llega al final,** después de guardar, avisar y sincronizar, que es cuando hoy se repinta el contexto (R3).
- **Las reglas que cambian un registro devuelven parches,** que `lab.js` aplica con `Object.assign`: se conservan la identidad del registro y el orden de las claves guardadas (R8).
- **Nada visible cambia:** ningún texto, ninguna clase, ningún foco, ninguna escritura y ninguna URL. Los 123 E2E de F1 y A2 pasan sin editarse.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`, y JavaScript legacy en `frontend/lab.js`. Node 24.21.0, Vite 8.3.2, esbuild 0.28.2, Zustand 5.0.15, Vitest 5.0.3 y `@playwright/test` 1.63.0, como dejaron F1, F2a y F2b.

**Primary Dependencies**: ninguna nueva (FR-003). F7a no tiene specs de componente, así que no necesita `jsdom` ni Testing Library, ni `fishery`, porque las entradas de las specs se escriben a mano.

**Storage**: `taller-laboratorio-v1`, sin cambios de formato (FR-018, ADR 0003). Cada acción escribe lo mismo y la misma cantidad de veces que hoy (FR-016).

**Testing**:

- **Vitest, proyecto `node`:** las specs de modelo de las reglas, de los selectores, de la feature y del adaptador;
- **Playwright:** 61 E2E nuevos contra el build servido, con el doble de los Playgrounds;
- **los checks de `qa/`:** `runner-check` re-apuntado y `lab-state-check` ampliado.

Los valores esperados salen del contenido, de las fixtures congeladas y de los textos de hoy.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript con vistas legacy). Es un refactor con contratos nuevos, sin cambio visible.

**Performance Goals**: ninguna. Se informan el tamaño del HTML y el total de avisos antes y después.

**Constraints**: ver «Restricciones globales».

**Scale/Scope**:

- **Archivos de producción nuevos, 14:** 6 en `entities/exercise/model`, 2 en `pages/lab` y 6 en `features/run-exercise`;
- **specs de Vitest nuevas, 11, con 124 pruebas;**
- **en `qa/e2e`, 6 archivos nuevos:** 5 specs y `lib/lab-copy.ts`;
- **cambian:** 4 archivos de producción (`lab.js`, `legacy-views.ts`, `run-outcome.ts` y el índice de `entities/exercise`) y 5 de QA (`runner-check`, `lab-state-check`, el Page Object y los dos archivos del doble);
- **se borra:** `register-runner.ts`.

### Restricciones globales

Valores exactos, de la spec, de la constitución y de la base:

- **La red de F1 y A2 sin editar:** 123 E2E (106 de F1 y 17 de A2). Los Page Objects y los dobles sólo suman métodos, y sus localizadores de hoy no cambian (FR-002).
- **Los E2E nuevos:** pasan contra el legacy antes de tocar `lab.js` y siguen pasando sin editarse después de cada tarea de U4. No fijan nada de lo que cambia X1 (FR-001, research.md R11).
- **El HTML:** `dist/index.html` queda bajo `BOOT_SIZE_LIMIT` de `qa/build-check`, que es de **1 250 000 caracteres**, con la forma de A2 (un script y un estilo en línea, y el contenido aparte). El tamaño antes y después va en el PR (FR-004). El prototipo midió +3 375 bytes.
- **Nada nuevo:** ninguna dependencia de ejecución, ningún `style=`, `setAttribute('style', …)`, `style.cssText` ni prop `style` en `features/run-exercise`, `pages/lab` ni `entities/exercise` (FR-003, SC-011), y ningún global nuevo.
- **La complejidad:** el total de `npm run lint` no sube (35 en la base). `runExercise`, `reviewHTML` y `reflectHTML` salen de los avisos de `lab.js`, y ninguna función nueva pasa de 10. El prototipo dio 32 (FR-005, SC-009).
- **El formato guardado no cambia:** la clave, `version: 1`, los nombres y los topes (30 000, 10 000 y 3 000; 12 000 y 18 000). Las tres fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar (FR-018).
- **Los textos visibles:** los de hoy, carácter por carácter. Los avisos de la ejecución pasan a ser constantes de la feature con el mismo texto.
- **Lo que no se toca:**
  - `main.tsx`, `qa/run-checks.ts`, `qa/e2e/fixtures/index.ts`, `package.json` y el lockfile;
  - los adaptadores de campaña y de Sistemas, los puentes, `lab-explorers.js` y `quest-explorers.js`;
  - las hojas de estilo y `frontend/src/index.html`.
- **El código y las pruebas, en inglés; los textos, en español,** y sin comentarios: sólo los de referencia puntual que trae el plan.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra una decisión.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, Feature-Sliced Design incremental (`pages/lab` abre sólo con `model`, porque la spec ubica ahí los selectores del mapa), Zustand con un store y selectores chicos, código en inglés y textos en español. `AGENTS.md` no cambia |
| II. TDD y pruebas útiles | Sí | Cada módulo nuevo abre con su spec en rojo contra firmas que lanzan `not implemented`. Los E2E son la red del refactor: verdes contra el legacy y sin editar después. Los valores esperados salen del contenido, de las fixtures y de los textos de hoy, y dos mutaciones prueban que las guardas detectan lo que vigilan |
| III. Código entendible | Sí | `lab.js` pierde tres funciones de más de 10 y no gana ninguna. Las reglas son funciones chicas y puras, y la orquestación está partida en pasos con nombre (`execute`, `saveResult`, `syncDerivedProgress` y `finish`) |
| IV. Contenido en Git, IDs estables | Sí | `content/` y el generador no cambian; los IDs y la forma v1, tampoco |
| V. Capas y contratos explícitos | Sí | El transporte detrás de un puerto, la persistencia por el almacén inyectado y la interfaz en `lab.js`. Ninguna entidad importa a otra. La feature no importa un motor (lo vigila una spec). No hay capa, store ni dependencia por anticipado: el estado genérico es lo que pide el clarify (F7-Q2) |
| VI. Español, accesibilidad y portabilidad | Sí | No cambia ningún texto, atributo, foco ni región viva. Los E2E fijan el teclado y los destinos del foco de hoy |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva en Git. Los resultados de Playwright y la copia del prototipo quedan fuera |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **P2:** F7 se parte en F7a y F7b | Este plan es F7a: 30 requisitos, sin vista nueva. F7b va en `plan-f7b.md` | Todo el plan |
| **F7-Q1:** se conserva `solvedAt` | `isSolved(record)` mira sólo `solvedAt`, y `passedRunPatch` no lo borra. Lo fijan una spec con el registro de `rust-09` de la fixture, un E2E del mapa y otro de almacenamiento | T008, T009, T003 y T006 |
| **F7-Q2:** un canal de progreso y la cancelación, con los estados de hoy en una unión ampliable | `RunState<Progress>` con `idle` y `running`, `report` en el puerto y `cancel()`. A4 amplía `Progress` sin editar la feature (research.md, R1) | T011 y T012 |
| **X1 con C2:** el comportamiento de React | F7a no lo fija: sus E2E evitan los paneles, el foco y el texto del filtro que cambian. Los E2E de X1 son de F7b | T003 a T007 |
| **X2:** regiones vivas montadas | No aplica a F7a, porque `lab.js` las sigue dibujando como hoy. La comprobación con lector de pantalla es de F7b | — |
| **Ruling C4:** A4 espera a F7a y a B3, y si entra antes que F7b dibuja sus estados en `lab.js` | `lab.js` se suscribe al estado de la feature (`runner.state.subscribe`) y lee el progreso de `ActiveRun`. A4 suma sus textos en `reviewHTML` | T014 |

## Project Structure

### Documentation (this feature)

```text
specs/021-f7-laboratorio/
├── spec.md                   # F7 entera; F7a no la cambia
├── plan.md                   # este archivo (F7a)
├── research.md               # decisiones R1 a R12, Context7 y mediciones
├── quickstart.md             # cómo se verifica F7a
├── contracts/run-exercise.md # el puerto que consume A4
├── tasks.md                  # T001 a T017
└── checklists/requirements.md
```

No hay `data-model.md`: F7a no cambia ninguna forma de datos. El registro v1 y su `result` están en la spec («Key Entities») y en `LabResultV1`.

### Source Code (repository root)

```text
frontend/
├── lab.js                                         (W) usa las reglas, los selectores y la feature
└── src/
    ├── app/boot/legacy-views.ts                   (W) sale register-runner (compartido con F5 y F6)
    ├── app/legacy/register-runner.ts              (W) se borra
    ├── entities/exercise/
    │   ├── index.ts                               (R) exporta lo nuevo
    │   └── model/
    │       ├── diagnose.ts + spec                 (R) nuevo: las 16 reglas y la de omisión, movidas de lab.js
    │       ├── live-hint.ts + spec                (R) nuevo: los 4 casos, movidos de lab.js
    │       ├── selectors.ts + spec                (R) nuevo: nivel, resuelto, repaso, puntos, borrador, vigencia…
    │       ├── record-rules.ts + spec             (R) nuevo: los parches del registro
    │       ├── review-state.ts + spec             (R) nuevo: el clasificador del revisor
    │       ├── lab-result.ts                      (R) nuevo: el tipo del result v1
    │       └── run-outcome.ts + spec nueva        (R) exporta readTestMarkers
    ├── pages/lab/
    │   ├── index.ts                               (R) nuevo
    │   └── model/map-selectors.ts + spec          (R) nuevo: filtro, desafío de hoy y «Sorprendeme»
    └── features/run-exercise/
        ├── index.ts + index.spec.ts               (F) nuevo: la API pública y su aislamiento
        ├── model/transport.ts                     (F) el puerto
        ├── model/run-state.ts                     (F) el estado
        ├── model/build-run-result.ts + spec       (F) el único armado del result
        ├── model/create-exercise-runner.ts + spec (F) la orquestación
        └── api/playground-transport.ts + spec     (F) el adaptador de hoy
qa/
├── runner-check.ts                                (W) carga shared/api/playground
├── lab-state-check.ts                             (W) fetch en lugar de TallerRunner; +2 escenarios
└── e2e/
    ├── pages/lab.ts                               (E) suma métodos
    ├── fixtures/compiler-double.ts                (E) suma answerWithCustom, answerLater y bodies
    ├── lib/compiler-results.ts                    (E) suma RUST_01 y la marca custom
    ├── lib/lab-copy.ts                            (E) nuevo: el texto que cambia con A4
    └── specs/lab-{map,exercise,run,storage,explorers}.spec.ts   (E) nuevos: 61 E2E
docs/architecture.md, qa/AGENTS.md                 (K)
```

**Structure Decision:**

- **Cada módulo vive donde lo ubica la spec:** las reglas en `entities/exercise`, los selectores del mapa en `pages/lab/model` y la ejecución en `features/run-exercise`, con segmentos `model` y `api`.
- **`pages/lab` abre sólo con `model`,** porque FR-054 pone ahí los selectores del mapa; F7b le suma `ui`.
- **No hay entrada sin estado nueva:** la feature importa el índice de `entities/exercise`, cuyo dueño es `lab.js` (research.md, R7).

## Review Focus

Lo que el revisor mira primero:

- **Los E2E nuevos fijan sólo lo de hoy que React conserva.** No hay aserciones sobre paneles después de un redibujo, ni sobre el foco después de «Repasar pendientes» o de autoevaluarse, ni sobre el texto del filtro después de un redibujo con búsqueda (X1).
- **El orden de la ejecución:** `save` del intento → `running` → transporte → aviso → `save` del resultado → Sistemas → campaña → `idle`. `lab.js` repinta en el `idle`.
- **La cancelación por identidad:** un resultado que llega tarde no escribe, y `cancel()` avisa mientras que `abort()` no.
- **Los parches y el orden de claves:** `prediction` antes que `predictionCorrect`; `confidence`, `reviewedAt` y `reviewAt`; `result`, `solvedAt` y `reviewAt`.
- **El `trim()` único de la prueba propia** en el envío, en la vista previa, en la copia y en la vigencia.
- **El aislamiento:** la feature no carga motores, y `lab.js` empaquetado solo tiene una vez la clave del laboratorio y ninguna otra.
- **Lo retirado:** `grep -rn "TallerRunner\|register-runner" frontend qa` da 0. Las únicas apariciones que quedan están en `docs/`, y T016 las actualiza.
- **Complejidad y tamaño:** el total de avisos no sube y el HTML queda bajo 1 250 000.

**Lo que la spec implica y ninguna prueba de hoy ejercita**, cada caso con la tarea que suma su prueba:

1. **Cancelar y volver a ejecutar enseguida:** el resultado tardío de la primera ejecución no pisa a la segunda, que sigue `running` y guarda lo suyo con dos intentos (FR-043, FR-050). Lo fija la spec del runner, «a run started right after a cancel is not overwritten by the late first result» (T011).
2. **Un adaptador que lanza un error que no es de aborto:** guarda un resultado de transporte con su mensaje, o «No se pudo conectar al compilador.» si no tiene, y no sincroniza, como el `catch` de hoy (FR-052, research.md R6). Lo fijan tres pruebas de la spec del runner (T011).
3. **«Borrar todo» durante una ejecución:** `TallerLab.reset` aborta, y la respuesta tardía no escribe en el almacén en blanco ni avisa (FR-050, US4-5). El E2E no entra porque F8-Q1 cambia ese flujo. Lo fija un escenario nuevo de `lab-state-check`, con su mutación (T014).
4. **Una prueba propia de sólo espacios, tabuladores o espacios de no separación:** no viaja, porque `normalizeCustomTest` la deja en `''`, y la copia es exactamente el programa de la vista previa (FR-045, FR-051; FR-028 de A4). Lo fijan la spec del runner, la spec de los selectores, el E2E «copies the program of the preview» y el E2E «your own case is sent trimmed» (T011, T008, T004 y T005).
5. **`idle` llega después de guardar, avisar y sincronizar:** si llegara antes, `lab.js` repintaría el contexto sin los sellos nuevos (FR-043; el repintado que fija `bridges`). Lo fija la spec del runner, «goes running and back to idle after saving, notifying and syncing» (T011).

## Reparto en paralelo

- **Los dueños E, R, F y W** son slices para el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»): se les dan sus archivos, el código de este plan y sus checks, y se les dice que no dejen comentarios.
- **K, el coordinador,** es el agente principal: hace la línea base, la documentación y la compuerta, y revisa cada diff.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001: la línea base |
| 1 | E y R a la vez | **E:** T002 a T007 (la red, contra el legacy). **R:** T008 a T010 (las reglas y los selectores) |
| 2 | F | T011 y T012 (la feature), sobre la rama con T009 integrada |
| 3 | W | T013 (después de T007 y T010), T014 (después de T012) y T015 |
| 4 | K | T016 (documentación) y T017 (compuerta y PR) |

**Dueños, archivos e interfaces:**

| Dueño | Unidad | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- | --- |
| K · Coordinador | todas | `docs/architecture.md`, `qa/AGENTS.md` y `specs/**`; abre el PR y corre la compuerta | todo | la línea base, la integración y el cierre |
| E · Red | U1 | `qa/e2e/pages/lab.ts`, `qa/e2e/fixtures/compiler-double.ts`, `qa/e2e/lib/compiler-results.ts`, `qa/e2e/lib/lab-copy.ts` y `qa/e2e/specs/lab-*.spec.ts` | el build del legacy | 61 E2E verdes contra el legacy |
| R · Reglas | U2 | `frontend/src/entities/exercise/index.ts` y `model/{diagnose,live-hint,selectors,record-rules,review-state,lab-result,run-outcome}*`, y `frontend/src/pages/lab/**` | — | las funciones de §2.0 |
| F · Feature | U3 | `frontend/src/features/run-exercise/**` | de R: `ensureRecord`, `draftOf`, `normalizeCustomTest`, `attemptPatch`, `passedRunPatch`, `readTestMarkers` y `LabResultV1` | el contrato de [contracts/run-exercise.md](./contracts/run-exercise.md) |
| W · Cableado | U4 | `frontend/lab.js`, `frontend/src/app/boot/legacy-views.ts`, `frontend/src/app/legacy/register-runner.ts`, `qa/runner-check.ts` y `qa/lab-state-check.ts` | todo lo anterior | `lab.js` como raíz de composición |

**Puertos de los E2E:** K `E2E_PORT=4173`, E `4271`, W `4274`.

### Lo que F7a comparte con F5 y F6

F7a corre en paralelo con F5 y F6 (hoja de ruta, «Orden y paralelismo»), y los tres se integran de a uno: el que llega después rebasa. Los archivos:

| Archivo | F7a | F5 y F6 (según sus specs 018 y 019) | Conflicto esperado |
| --- | --- | --- | --- |
| `frontend/src/app/boot/legacy-views.ts` | Borra la línea de `register-runner` | Cada uno reemplaza su línea (`systems.js` y `campaign.js`) por su adaptador | Líneas distintas de la misma lista: se resuelve a mano en segundos |
| `docs/architecture.md` y `qa/AGENTS.md` | Filas del transporte, de la feature y del laboratorio | Sus filas | Los integra K |
| `frontend/lab.js` | Lo edita (T013 y T014) | No lo tocan: siguen leyendo `window.TallerLab`, y `lab.js` sigue leyendo sus adaptadores | Ninguno |
| `frontend/src/entities/exercise/index.ts` | Suma exports | No lo tocan (F6 toca `entities/campaign` y F5 `entities/systems-workshop`) | Ninguno |
| `qa/lab-state-check.ts` y `qa/runner-check.ts` | Los edita | Sus specs no los nombran | Ninguno; si sus planes los tocan, rebasa el segundo |
| `qa/e2e/pages/lab.ts`, `qa/e2e/fixtures/compiler-double.ts` y `qa/e2e/lib/compiler-results.ts` | Suma métodos | Sus specs no los nombran (F6 toca `pages/campaign.ts` y `fixtures/index.ts`) | Ninguno |
| `qa/e2e/fixtures/index.ts`, `qa/run-checks.ts`, `qa/lib/legacy-sources.ts`, `qa/load-order-check.ts`, `qa/boot-check.ts`, `qa/lib/app-adapters.ts` y el guard | **No los toca** | F5 y F6 sí | Ninguno |

**El orden recomendado:** F7a primero si está lista, porque está en el camino crítico de A4 y D1c. Si entra después de F5 o F6, sólo rebasa `legacy-views.ts` y la documentación.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec (los requisitos *(F7a)*), [research.md](./research.md), [contracts/run-exercise.md](./contracts/run-exercise.md) y tu sección;
  - las skills `tdd`, `clean-code`, `vitest` y, para E, `playwright-best-practices`.
- **TDD, siempre:**
  - cada módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, para que su spec falle por comportamiento y no por un import;
  - la spec en rojo y la implementación van en commits separados; el commit rojo no pasa `npm test`, y el PR entero sí;
  - los E2E de U1 no tienen rojo: son la red del refactor y pasan contra el legacy desde el primer intento. **Si uno falla contra el legacy, el valor del plan está mal: pará y avisale a K. Nunca toques `lab.js` para que pase.**
- **Mover no reescribe:**
  - `diagnose` y `liveHint` se mueven sin cambiar un carácter de sus textos ni de sus expresiones;
  - los textos de `lab.js` que quedan, quedan iguales;
  - no corrijas ninguna rareza de la spec («Rarezas que el port conserva»).
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo a K.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>` y `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - `npm run build` y `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo:**
  - el código, los nombres de test y los comentarios, en inglés; los textos que lee el alumno, en español y con el texto exacto de hoy;
  - **sin comentarios,** salvo los de referencia puntual que trae el código del plan;
  - `interface` para las formas de objetos, exports nombrados y ningún `export default`;
  - ningún `style=`, `setAttribute('style', …)` ni `style.cssText`.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(e2e): …` para la red;
  - `test(front): …` para una spec en rojo;
  - `refactor(front): …` para mover o cablear;
  - `test(qa): …` para los checks.
- **Al terminar,** informá:
  - las tareas cerradas;
  - los comandos con su resultado real;
  - lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base y compuerta (coordinador K)

**Cubre:** FR-002, FR-004, FR-005 y FR-006; SC-001, SC-008 y SC-009.

### Tarea 0.1 · La línea base (T001)

- **Quién y cuándo:** K, sobre la base de implementación (`master` con F2a, A2 y F2b), antes de cualquier cambio.
- **Entrega:** un commit de documentación que agrega a [research.md](./research.md) la sección «Línea base de la implementación», con el hash, la fecha y los valores de [quickstart.md](./quickstart.md) §1.
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde. Si algo falla, F7a no empieza.
  2. Anotar:
     - el total de avisos y los de `lab.js`, con su función;
     - los E2E (123);
     - los archivos y las pruebas de Vitest;
     - los escenarios de `lab-state-check` y `runner-check`;
     - los imports de `load-order-check`;
     - `html.length` del dist (`node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"`).
  3. Compararlos con la «Línea base de planificación» de research.md. Si difieren (por ejemplo, porque F5 o F6 entraron antes), se anota la diferencia y mandan los valores medidos.
- **Compuerta:** los pasos 1 y 2, con los valores anotados.
- **Vuelta atrás:** revertí el commit.

### 0.2 · La compuerta de cada unidad

La corre el dueño al cerrar su última tarea, y K antes del PR (T017). Una unidad no se integra con una casilla en rojo.

| Comprobación | U1 | U2 | U3 | U4 |
| --- | --- | --- | --- | --- |
| `npm run typecheck`, `npm run lint` (sin errores, total ≤ base) y `npm run format:check` | sí | sí | sí | sí |
| `npm run test:unit` | — | sí | sí | sí |
| `npm test` | sí | sí | sí | sí |
| `npm run build` y los 123 E2E de F1 y A2 | sí | — | — | sí |
| Los 61 E2E nuevos | sí, contra el legacy, con `--repeat-each 3` | — | — | sí, sin editar |
| `git diff --check` | sí | sí | sí | sí |
| `git diff <base> --stat -- frontend/lab.js` | vacío | vacío | vacío | cambia |

**La compuerta final (T017)** suma:

- el tamaño (`html.length` < 1 250 000, antes y después);
- `grep -rn "TallerRunner\|register-runner" frontend qa` en 0;
- ningún estilo en línea nuevo: `git diff <base> -- frontend/src | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'` no imprime nada;
- la correspondencia de los checks (§6) y la documentación (T016).

## 1. Unidad 1 · La red contra el legacy (dueño E, onda 1)

**Cubre:** FR-001, FR-002, FR-060 y FR-061, y la parte de F7a de FR-016, FR-018 y FR-019 (las escrituras), de FR-062 y de FR-063; US1 a US5; SC-001, SC-003 (las tres fixtures en 0 escrituras) y SC-010 (los 13 destinos del foco de hoy).

**Entrega:** 61 E2E en 5 specs, con el Page Object ampliado y los dobles ampliados. Pasan contra el `lab.js` de hoy antes de cualquier cambio y no se editan después.

**Lo que cubre cada spec:**

| Spec | Pruebas | Cubre |
| --- | --- | --- |
| `lab-map.spec.ts` | 10 | US1: las métricas del progreso congelado, el nivel con su foco, «Clásicos y sistemas» con su foco, la búsqueda vacía y «Ver todos los desafíos», «Repasar pendientes», abrir desde un nodo (una escritura, la URL y el foco en el título), «Sorprendeme» con y sin candidatos, y las rarezas 7 y 1 |
| `lab-exercise.spec.ts` | 20 | US2: las pestañas por teclado, la predicción (con sus escrituras de laboratorio, Sistemas y campaña), el editor (una escritura por tecla, el estado, la vista previa y los cuatro textos de la pista en vivo), Esc, las pistas, la rareza 6, el diálogo y sus dos caminos de foco, «Restaurar inicio», «Inventar una variante», la copia con y sin portapapeles, la rareza 3, la reflexión por tecla, la autoevaluación, el estado de «Explicá» y el pie con sus tres destinos |
| `lab-run.spec.ts` | 13 | US2 y US6: los cuatro resultados en un ejercicio libre, la primera aprobación (las escrituras, el `result`, `solvedAt` y `reviewAt`) y la segunda, Ctrl/⌘ + Enter dos veces con un solo pedido, la cancelación, cambiar de fase sin cancelar, abrir otro ejercicio y salir del laboratorio cancelando, la vigencia, la prueba propia recortada y la rareza 8 |
| `lab-storage.spec.ts` | 6 | US4: las tres fixtures congeladas sin escrituras en el mapa, las tres fases y el bloqueo; `rust-09` resuelto (F7-Q1); recorrer, filtrar, buscar, cambiar de fase, usar un explorador y volver, con una sola escritura; y el almacenamiento bloqueado |
| `lab-explorers.spec.ts` | 12 | US5 y FR-061: robot, paquete de Rust, paquete de Go, canal, genérico, puntero, ownership, slices y recorrido, cada uno con su operación, su región viva y su foco; el reinicio de los de misión al abrir otro ejercicio; el reinicio del de laboratorio y la fase que lo conserva; y la rareza 2 |

**Las rarezas 4 y 5** ya las fija F1 en `bridges.spec.ts` y no se repiten. Las ocho quedan así:

| Rareza | Prueba |
| --- | --- |
| 1 | `lab-map.spec.ts` |
| 2 | `lab-explorers.spec.ts` |
| 3 y 6 | `lab-exercise.spec.ts` |
| 4 y 5 | `bridges.spec.ts` (F1) |
| 7 | `lab-map.spec.ts` |
| 8 | `lab-run.spec.ts` |

**Los 13 destinos del foco de hoy** (SC-010):

| Destino | Prueba |
| --- | --- |
| Abrir un ejercicio | `lab-map`, abrir desde un nodo |
| Cambiar de fase | `lab-exercise`, las pestañas |
| El nivel | `lab-map` |
| «Clásicos y sistemas» | `lab-map` |
| Pedir una pista | `lab-exercise` |
| «Inventar una variante» | `lab-exercise` |
| Confirmar «Restaurar inicio» | `lab-exercise` |
| Confirmar «Cargarla y experimentar» | `lab-exercise` |
| «Conservar mi código» | `lab-exercise` |
| Esc en el editor | `lab-exercise` |
| Actuar en un explorador de laboratorio | `lab-explorers`, canal, puntero, ownership, slices y recorrido |
| Cambiar un `select` del genérico | `lab-explorers` |
| Actuar en un explorador de misión | `lab-explorers`, robot y paquetes |

### Tarea 1.1 · El Page Object y los dobles (T002, E)

- **Cambia:**
  - `qa/e2e/pages/lab.ts`, que suma el helper `startsWith` y los métodos del diff, sin cambiar ninguno de los de hoy;
  - `qa/e2e/fixtures/compiler-double.ts`, que suma `bodies`, `answerWithCustom`, `answerLater` y el privado `fulfillWith`;
  - `qa/e2e/lib/compiler-results.ts`, que suma `RUST_01`, el tipo `CustomOutcome` y el parámetro opcional `custom` de `compilerReply` y de `markers`.
- **Crea:** `qa/e2e/lib/lab-copy.ts`.
- **Interfaces que produce:**
  - `LabPage`: los métodos del diff;
  - `CompilerDouble`: `answerWithCustom(exercise, kind, custom: CustomOutcome): Promise<void>`, `answerLater(exercise, kind): Promise<() => void>`, que devuelve la función que suelta la respuesta, y `readonly bodies: string[]`, con los cuerpos que vio `answerWithCustom`;
  - `compilerReply(exercise, kind, custom?: CustomOutcome): CompilerReply`;
  - `attemptsLine(count: number): string`.

```diff
--- a/qa/e2e/pages/lab.ts
+++ b/qa/e2e/pages/lab.ts
@@ -9,6 +9,10 @@
 };
 const LANGUAGE_NAME: Record<Language, string> = { rust: 'Rust', go: 'Go' };

+function startsWith(text: string): RegExp {
+  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
+}
+
 export class LabPage {
   constructor(readonly page: Page) {}

@@ -82,4 +86,225 @@
   backButton(): Locator {
     return this.page.getByRole('button', { name: /^← Volver al/ });
   }
+
+  // Elements without an accessible name: the class or the id is their contract (ADR 0008).
+  mapEyebrow(): Locator {
+    return this.page.locator('.lab-intro .eyebrow');
+  }
+
+  mapStamp(): Locator {
+    return this.page.locator('.lab-stamp');
+  }
+
+  mapMetrics(): Locator {
+    return this.page.locator('.lab-metrics');
+  }
+
+  todayChallenge(): Locator {
+    return this.page.locator('.lab-continue');
+  }
+
+  levelButton(label: string): Locator {
+    return this.page
+      .getByRole('group', { name: 'Nivel de aprendizaje' })
+      .getByRole('button', { name: startsWith(label) });
+  }
+
+  extrasButton(): Locator {
+    return this.page.getByRole('button', { name: /^Clásicos y sistemas · \d+$/ });
+  }
+
+  dueButton(): Locator {
+    return this.page.getByRole('button', { name: /^(Repasar pendientes|Ver todos)( · \d+)?$/ });
+  }
+
+  surpriseButton(): Locator {
+    return this.page.getByRole('button', { name: 'Sorprendeme ↗' });
+  }
+
+  searchBox(): Locator {
+    return this.page.getByRole('searchbox', { name: 'Buscar ejercicios' });
+  }
+
+  filterStatus(): Locator {
+    return this.page.locator('#lab-filter-status');
+  }
+
+  exerciseNode(name: string): Locator {
+    return this.page.getByRole('button', { name, exact: true });
+  }
+
+  exerciseNodes(): Locator {
+    return this.page.locator('.challenge-node');
+  }
+
+  emptyMapHeading(): Locator {
+    return this.page.locator('.lab-empty h2');
+  }
+
+  showAllButton(): Locator {
+    return this.page.getByRole('button', { name: 'Ver todos los desafíos' });
+  }
+
+  storageWarning(): Locator {
+    return this.page.locator('.lab-storage-warning');
+  }
+
+  predictionOption(text: string): Locator {
+    return this.page.getByRole('button', { name: text, exact: true });
+  }
+
+  predictionFeedback(): Locator {
+    return this.page.locator('#lab-prediction-feedback');
+  }
+
+  editorStatus(): Locator {
+    return this.page.locator('#lab-editor-status');
+  }
+
+  liveHint(): Locator {
+    return this.page.locator('#lab-live-hint');
+  }
+
+  programPreviewToggle(): Locator {
+    return this.page.getByText('Ver el programa completo y sus pruebas', { exact: true });
+  }
+
+  programPreview(): Locator {
+    return this.page.getByLabel('Programa completo con pruebas');
+  }
+
+  copyProgramButton(): Locator {
+    return this.page.getByRole('button', { name: 'Copiar programa completo ↗' });
+  }
+
+  restoreStarterButton(): Locator {
+    return this.page.getByRole('button', { name: 'Restaurar inicio ↺' });
+  }
+
+  hintButton(): Locator {
+    return this.page.getByRole('button', { name: /^(Dame una pista|Otra pista)$/ });
+  }
+
+  hintCounter(): Locator {
+    return this.page.getByText(/^\d\/3 pistas$/);
+  }
+
+  hints(): Locator {
+    return this.page.locator('.hint-item');
+  }
+
+  solutionToggle(): Locator {
+    return this.page.getByText('Ver una solución razonada', { exact: true });
+  }
+
+  loadSolutionButton(): Locator {
+    return this.page.getByRole('button', { name: 'Cargarla y experimentar' });
+  }
+
+  confirmDialog(): Locator {
+    return this.page.getByRole('dialog');
+  }
+
+  keepCodeButton(): Locator {
+    return this.confirmDialog().getByRole('button', { name: 'Conservar mi código' });
+  }
+
+  continueButton(): Locator {
+    return this.confirmDialog().getByRole('button', { name: 'Continuar' });
+  }
+
+  testCaseToggle(label: string): Locator {
+    return this.page.locator('.test-case summary', { hasText: label });
+  }
+
+  inventVariantButton(label: string): Locator {
+    return this.page
+      .locator('.test-case', { hasText: label })
+      .getByRole('button', { name: 'Inventar una variante ↗' });
+  }
+
+  customTestToggle(): Locator {
+    return this.page.getByText('＋ Inventá tu propio caso', { exact: true });
+  }
+
+  customTestBox(language: Language): Locator {
+    return this.page.getByRole('textbox', { name: `Tu hipótesis en ${LANGUAGE_NAME[language]}` });
+  }
+
+  runningButton(): Locator {
+    return this.page.getByRole('button', { name: 'Revisando…' });
+  }
+
+  cancelRunButton(): Locator {
+    return this.page.getByRole('button', { name: 'Cancelar ejecución' });
+  }
+
+  explainButton(): Locator {
+    return this.page.getByRole('button', { name: 'Explicar lo que aprendí →' });
+  }
+
+  reflectStatus(): Locator {
+    return this.page.locator('#lab-reflect-status');
+  }
+
+  reflectionBox(): Locator {
+    return this.page.getByRole('textbox', { name: 'Tu explicación, en tus palabras' });
+  }
+
+  reflectionStatus(): Locator {
+    return this.page.locator('#lab-reflection-status');
+  }
+
+  confidenceButton(title: string): Locator {
+    return this.page.getByRole('button', { name: startsWith(title) });
+  }
+
+  nextReview(): Locator {
+    return this.page.getByText(/^Próximo repaso: /);
+  }
+
+  footerButton(): Locator {
+    return this.page.getByRole('button', {
+      name: /^(Siguiente experimento|Volver al taller|Volver al mapa) →$/,
+    });
+  }
+
+  labExplorer(): Locator {
+    return this.page.locator('.lab-explorer');
+  }
+
+  labExplorerStatus(): Locator {
+    return this.labExplorer().getByRole('status');
+  }
+
+  questExplorer(): Locator {
+    return this.page.getByRole('region', { name: 'Explorador conceptual interactivo' });
+  }
+
+  questStatus(): Locator {
+    return this.questExplorer().getByRole('status');
+  }
+
+  robotHistory(): Locator {
+    return this.questExplorer().locator('details.qx-history');
+  }
+
+  robotHistoryToggle(): Locator {
+    return this.questExplorer().getByText('Traza de decisiones · últimos 6 intentos', {
+      exact: true,
+    });
+  }
+
+  packetVerdict(): Locator {
+    return this.questExplorer().locator('.qx-verdict');
+  }
+
+  explorerButton(name: string): Locator {
+    return this.page.getByRole('button', { name, exact: true });
+  }
+
+  explorerSelect(label: string): Locator {
+    return this.page.getByRole('combobox', { name: startsWith(label) });
+  }
 }
```

```diff
--- a/qa/e2e/fixtures/compiler-double.ts
+++ b/qa/e2e/fixtures/compiler-double.ts
@@ -3,11 +3,14 @@
   PLAYGROUND_ENDPOINT,
   compilerReply,
   type CompilerKind,
+  type CompilerReply,
+  type CustomOutcome,
   type ExerciseUnderTest,
 } from '../lib/compiler-results';

 export class CompilerDouble {
   readonly requests: string[] = [];
+  readonly bodies: string[] = [];

   constructor(private readonly page: Page) {}

@@ -25,4 +28,36 @@
       this.requests.push(`held ${exercise.language}`);
     });
   }
+
+  async answerWithCustom(
+    exercise: ExerciseUnderTest,
+    kind: CompilerKind,
+    custom: CustomOutcome,
+  ): Promise<void> {
+    await this.fulfillWith(exercise, compilerReply(exercise, kind, custom));
+  }
+
+  async answerLater(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<() => void> {
+    const reply = compilerReply(exercise, kind);
+    let release: () => void = () => undefined;
+    const released = new Promise<void>((resolve) => {
+      release = resolve;
+    });
+    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], async (route) => {
+      this.requests.push(`held ${exercise.language}`);
+      await released;
+      if (reply.kind === 'abort') await route.abort('failed');
+      else await route.fulfill({ status: 200, contentType: 'application/json', json: reply.body });
+    });
+    return release;
+  }
+
+  private async fulfillWith(exercise: ExerciseUnderTest, reply: CompilerReply): Promise<void> {
+    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], async (route) => {
+      this.requests.push(`${route.request().method()} ${route.request().url()}`);
+      this.bodies.push(route.request().postData() ?? '');
+      if (reply.kind === 'abort') await route.abort('failed');
+      else await route.fulfill({ status: 200, contentType: 'application/json', json: reply.body });
+    });
+  }
 }
```

```diff
--- a/qa/e2e/lib/compiler-results.ts
+++ b/qa/e2e/lib/compiler-results.ts
@@ -6,6 +6,11 @@
   testIds: readonly string[];
 }

+export const RUST_01: ExerciseUnderTest = {
+  id: 'rust-01',
+  language: 'rust',
+  testIds: ['t1', 't2', 't3'],
+};
 export const RUST_02: ExerciseUnderTest = {
   id: 'rust-02',
   language: 'rust',
@@ -21,11 +26,18 @@

 export type CompilerReply = { kind: 'json'; body: unknown } | { kind: 'abort' };

+export type CustomOutcome = 'PASS' | 'FAIL';
+
 // Marker format of ADR 0003, point 7.
-function markers(exercise: ExerciseUnderTest, failing: readonly string[]): string {
-  return exercise.testIds
+function markers(
+  exercise: ExerciseUnderTest,
+  failing: readonly string[],
+  custom?: CustomOutcome,
+): string {
+  const expected = exercise.testIds
     .map((id) => `__TALLER_TEST__${id}:${failing.includes(id) ? 'FAIL' : 'PASS'}\n`)
     .join('');
+  return custom ? `${expected}__TALLER_TEST__custom:${custom}\n` : expected;
 }

 function rustReply(success: boolean, stdout: string, stderr: string): CompilerReply {
@@ -53,15 +65,19 @@
   go: 'prog.go:12:2: declared and not used: x\n',
 };

-export function compilerReply(exercise: ExerciseUnderTest, kind: CompilerKind): CompilerReply {
+export function compilerReply(
+  exercise: ExerciseUnderTest,
+  kind: CompilerKind,
+  custom?: CustomOutcome,
+): CompilerReply {
   if (kind === 'transportError') return { kind: 'abort' };
   const failing = kind === 'failedTest' ? ['t2'] : [];
   if (exercise.language === 'rust') {
     if (kind === 'compileError') return rustReply(false, '', COMPILE_ERROR.rust);
-    return rustReply(true, markers(exercise, failing), '');
+    return rustReply(true, markers(exercise, failing, custom), '');
   }
   if (kind === 'compileError') return goReply(COMPILE_ERROR.go, '', 2);
-  return goReply('', markers(exercise, failing), 0);
+  return goReply('', markers(exercise, failing, custom), 0);
 }

 export const PLAYGROUND_ENDPOINT: Record<Language, string> = {
```

`qa/e2e/lib/lab-copy.ts`:

```ts
// The texts of the lab review that A4 changes (A4 FR-038 hides the number of attempts): one place to edit.
export function attemptsLine(count: number): string {
  return `${count} intento${count === 1 ? '' : 's'}. Revisar es parte de aprender.`;
}
```

- **Pasos:**
  1. Aplicá los cuatro cambios.
  2. Corré `npm run typecheck` y `npx eslint qa/e2e`.
  3. Corré `npm run build` y `E2E_PORT=4271 npm run test:e2e`: los 123 de hoy, sin editar, siguen en verde.
  4. Commit: `test(e2e): el Page Object del laboratorio y el doble del compilador suman lo que piden los E2E de F7a`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.2 · El mapa (T003, E)

- **Crea:** `qa/e2e/specs/lab-map.spec.ts`.
- **Valores del contrato:**
  - la fixture `progress-master-2a278ad-storage.json`, sembrando sólo su laboratorio, porque su recorrido está en Go;
  - el catálogo: 137 de Rust, 49 temas, 29 inicial y 25 en «Clásicos y sistemas»;
  - el reloj, el 2026-10-06 a las 12:00 UTC, entre los repasos de la fixture (research.md, «Mediciones»).

`qa/e2e/specs/lab-map.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

// Between the review dates of the frozen progress: seven are due, rust-02 is not (reviewAt 2026-10-07).
const BETWEEN_REVIEWS = new Date('2026-10-06T12:00:00Z');
// The frozen route progress is in Go: the map tests seed only the lab, so the lab opens in Rust.
const FROZEN_LAB = { 'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'] };

test.describe('the lab map', () => {
  test('with the real progress of master shows the counts of the fixture', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await page.clock.setFixedTime(BETWEEN_REVIEWS);
    await storage.seed(FROZEN_LAB);

    await shell.goto(urls.view('laboratorio'));

    await expect(lab.mapEyebrow()).toHaveText('LABORATORIO · RUST');
    await expect(lab.mapStamp()).toContainText('137');
    await expect(lab.mapMetrics()).toContainText('8/137 resueltos');
    await expect(lab.mapMetrics()).toContainText('49 temas');
    await expect(lab.mapMetrics()).toContainText('205 puntos de práctica');
    await expect(lab.mapMetrics()).toContainText('7 para repasar');
    await expect(lab.exerciseNode('Resuelto. Repará el contador inmutable')).toHaveText('✓');
    await expect(lab.exerciseNode('Resuelto. Salir de loop con una respuesta')).toHaveText('✓');
    await expect(lab.exerciseNode('La energía del reactor')).toHaveText('01');
    await expect(lab.todayChallenge()).toContainText('La energía del reactor');
    await expect(lab.startButton()).toHaveText('Seguir aprendiendo ↗');
    await expect(lab.dueButton()).toHaveText('Repasar pendientes · 7');
  });

  test('a level filters the grid and keeps the focus on its button', async ({ shell, lab }) => {
    await shell.goto(urls.view('laboratorio'));

    await lab.levelButton('Inicial').click();

    await expect(lab.levelButton('Inicial')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.levelButton('Todos los niveles')).toHaveAttribute('aria-pressed', 'false');
    await expect(lab.filterStatus()).toHaveText('29 desafíos visibles.');
    await expect(lab.exerciseNodes()).toHaveCount(29);
    await expect(lab.levelButton('Inicial')).toBeFocused();
  });

  test('«Clásicos y sistemas» filters the grid and keeps the focus on its button', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));

    await lab.extrasButton().click();

    await expect(lab.extrasButton()).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.filterStatus()).toHaveText(
      '25 desafíos visibles · ampliación Clásicos y sistemas.',
    );
    await expect(lab.extrasButton()).toBeFocused();
  });

  test('a search without results and «Ver todos los desafíos» clear the four filters', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.levelButton('Avanzado').click();
    await lab.extrasButton().click();

    await lab.searchBox().fill('zzz');

    await expect(lab.filterStatus()).toHaveText(
      '0 desafíos visibles para tu búsqueda · ampliación Clásicos y sistemas.',
    );
    await expect(lab.emptyMapHeading()).toHaveText('No encontré ese desafío.');

    await lab.showAllButton().click();

    await expect(lab.searchBox()).toHaveValue('');
    await expect(lab.filterStatus()).toHaveText('137 desafíos visibles.');
    await expect(lab.levelButton('Todos los niveles')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.extrasButton()).toHaveAttribute('aria-pressed', 'false');
    await expect(lab.dueButton()).toHaveAttribute('aria-pressed', 'false');
  });

  test('«Repasar pendientes» shows only what is due', async ({ shell, lab, storage, page }) => {
    await page.clock.setFixedTime(BETWEEN_REVIEWS);
    await storage.seed(FROZEN_LAB);
    await shell.goto(urls.view('laboratorio'));

    await lab.dueButton().click();

    await expect(lab.dueButton()).toHaveText('Ver todos · 7');
    await expect(lab.dueButton()).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.filterStatus()).toHaveText('7 desafíos visibles.');
    await expect(lab.exerciseNodes()).toHaveCount(7);
    await expect(lab.exerciseNode('Resuelto. Repará el contador inmutable')).toHaveCount(0);
  });

  test('opening an exercise from a node saves once, rewrites the URL and focuses the title', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('laboratorio'));

    await lab.exerciseNode('Repará el contador inmutable').click();

    await expect(lab.exerciseTitle()).toHaveText('Repará el contador inmutable');
    await expect(lab.exerciseTitle()).toBeFocused();
    await expect(page).toHaveURL(/\?ejercicio=rust-02&paso=learn#laboratorio$/);
    expect(await storage.writes()).toEqual(['set taller-laboratorio-v1']);
  });

  test('«Sorprendeme» opens a challenge from the filtered pool', async ({ shell, lab, page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.999;
    });
    await shell.goto(urls.view('laboratorio'));

    await lab.surpriseButton().click();

    await expect(page).toHaveURL(/\?ejercicio=rust-137&paso=learn#laboratorio$/);
    await expect(lab.exerciseTitle()).toHaveText('Núcleo · Una instrucción llega hasta la RAM');
    await expect(shell.toast).toHaveText('Un desafío elegido para tu próxima idea.');
  });

  test('«Sorprendeme» without candidates opens nothing and says so', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.searchBox().fill('zzz');

    await lab.surpriseButton().click();

    await expect(shell.toast).toHaveText(
      'No hay desafíos con estos filtros. Probá ampliar la búsqueda.',
    );
    await expect(shell.heading('laboratorio')).toBeVisible();
    await expect(page).not.toHaveURL(/ejercicio=/);
  });

  test('KNOWN DEFECT (spec 021, quirk 7): «Sorprendeme» can pick the exercise that was already open', async ({
    shell,
    lab,
    page,
  }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await shell.goto(urls.exercise('rust-01', 'learn'));
    await lab.backButton().click();

    await lab.surpriseButton().click();

    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=learn#laboratorio$/);
    await expect(shell.toast).toHaveText('Un desafío elegido para tu próxima idea.');
  });

  test('KNOWN DEFECT (spec 021, quirk 1): switching the language clears the search but keeps the level and «Clásicos y sistemas»', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.levelButton('Avanzado').click();
    await lab.extrasButton().click();
    await lab.searchBox().fill('memoria');

    await shell.switchLanguage('go');

    await expect(lab.mapEyebrow()).toHaveText('LABORATORIO · GO');
    await expect(lab.searchBox()).toHaveValue('');
    await expect(lab.levelButton('Avanzado')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.extrasButton()).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- **Pasos:**
  1. Creá el archivo.
  2. Corré `npm run build` y `E2E_PORT=4271 npm run test:e2e -- specs/lab-map.spec.ts`: 10 de 10 contra el legacy. Si alguna falla, pará y avisá (ver «Reglas»).
  3. Corré lo mismo con `--repeat-each 3`: 30 de 30.
  4. Commit: `test(e2e): el mapa del laboratorio contra el legacy (F7a, US1)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.3 · Las tres fases (T004, E)

- **Crea:** `qa/e2e/specs/lab-exercise.spec.ts`.
- **Valores del contrato:** `content/rust/exercises/rust-01/exercise.yaml` (la predicción, las pistas, la prueba «Tres celdas», el inicio y la solución) y los textos de hoy de `lab.js`.
- **Por qué `rust-01`:** `rust-01` no es misión de campaña ni núcleo, así que no aparece ningún aviso de XP ni bloque de contexto.

`qa/e2e/specs/lab-exercise.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { observeReload } from '../lib/document-marker';
import { urls } from '../lib/urls';

const LAB_KEY = 'taller-laboratorio-v1';
const WRITE = `set ${LAB_KEY}`;
// After a prediction or a run, the lab syncs Systems and the campaign, which save their own keys.
const SYNC_WRITES = ['set taller-systems-v1', 'set taller-campaign-v1'];

// rust-01 is not a campaign mission nor a Systems core: no context block and no XP notice.
const RUST_01 = 'rust-01';

interface CopiedWindow {
  __e2eCopied?: string[];
}

test.describe('the three phases', () => {
  test('the tabs move with the arrows, Home and End, without writing', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'learn'));
    await lab.tab('learn').focus();

    await page.keyboard.press('ArrowRight');
    await expect(lab.tab('code')).toBeFocused();
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=code#laboratorio$/);

    await page.keyboard.press('End');
    await expect(lab.tab('reflect')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(lab.tab('learn')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(lab.tab('reflect')).toBeFocused();
    await expect(lab.tab('reflect')).toHaveAttribute('tabindex', '0');
    await expect(lab.tab('learn')).toHaveAttribute('tabindex', '-1');
    expect(await storage.writes()).toEqual([]);
  });

  test('the right prediction is pressed, explained and saved once', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'learn'));

    await lab.predictionOption('La función deja de devolver i32 y no compila').click();

    await expect(
      lab.predictionOption('La función deja de devolver i32 y no compila'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.predictionFeedback()).toContainText('Esa es la idea.');
    await expect(lab.predictionFeedback()).toContainText(
      'El punto y coma convierte esa expresión en sentencia. El bloque queda con valor (), incompatible con -> i32.',
    );
    expect(await storage.writes()).toEqual([WRITE, ...SYNC_WRITES]);
  });

  test('a wrong prediction is explained too', async ({ shell, lab }) => {
    await shell.goto(urls.exercise(RUST_01, 'learn'));

    await lab.predictionOption('Devuelve 21 siempre').click();

    await expect(lab.predictionFeedback()).toContainText('Veamos qué cambia.');
  });
});

test.describe('the editor', () => {
  test('each key saves, and the status, the preview and the live hint follow the draft', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await expect(lab.liveHint()).toHaveText(
      'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.',
    );

    await lab.writeDraft('rust', 'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}');
    await page.keyboard.type('//');

    expect(await storage.writes()).toEqual([WRITE, WRITE, WRITE]);
    await expect(lab.editorStatus()).toHaveText('Borrador guardado');
    await expect(lab.liveHint()).toHaveText(
      'No hace falta adivinar: proponé un cambio pequeño y comprobalo. println! muestra texto y devuelve (). Mostrar 21 no equivale a devolver 21.',
    );
    await lab.programPreviewToggle().click();
    await expect(lab.programPreview()).toContainText('celdas * 7\n}//');
    await expect(lab.programPreview()).toContainText('__TALLER_TEST__t1');

    await lab.editor('rust').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await expect(lab.liveHint()).toHaveText(
      'Volvé al código inicial para conservar las firmas que usan las pruebas.',
    );
    await lab.writeDraft('rust', 'fn main() {}');
    await expect(lab.liveHint()).toHaveText(
      'El taller ya agrega main. Mantené acá las funciones de la consigna.',
    );
  });

  test('Esc leaves the editor on «Ejecutar y revisar»', async ({ shell, lab, page }) => {
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.editor('rust').click();

    await page.keyboard.press('Escape');

    await expect(lab.runButton()).toBeFocused();
  });
});

test.describe('hints and the solution', () => {
  test('each hint saves once, shows in order and keeps the focus on the button, up to three', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));

    await lab.hintButton().click();
    await expect(lab.hints()).toHaveText(['PISTA 1El operador de multiplicación es *.']);
    await expect(lab.hintCounter()).toHaveText('1/3 pistas');
    await expect(lab.hintButton()).toHaveText('Otra pista');
    await expect(lab.hintButton()).toBeFocused();

    await lab.hintButton().click();
    await lab.hintButton().click();

    await expect(lab.hints()).toHaveCount(3);
    await expect(lab.hintCounter()).toHaveText('3/3 pistas');
    await expect(lab.hintButton()).toBeDisabled();
    expect(await storage.writes()).toEqual([WRITE, WRITE, WRITE]);
  });

  test('KNOWN DEFECT (spec 021, quirk 6): opening the solution writes every time', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));

    await lab.solutionToggle().click();
    await lab.solutionToggle().click();
    await lab.solutionToggle().click();

    expect(await storage.writes()).toEqual([WRITE, WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({ solutionSeen: true, assisted: true });
  });

  test('loading the solution asks first, saves once and gives the focus to the editor', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.solutionToggle().click();
    await lab.loadSolutionButton().click();

    await expect(lab.confirmDialog()).toHaveAccessibleName('¿Cargar la solución de apoyo?');
    await expect(lab.confirmDialog()).toContainText(
      'Reemplazará tu borrador. Probá ejecutarla y cambiar una condición para comprobar que entendiste la idea.',
    );
    await lab.continueButton().click();

    await expect(lab.confirmDialog()).toBeHidden();
    await expect(lab.editor('rust')).toBeFocused();
    await expect(lab.editor('rust')).toContainText('celdas * 7');
    expect(await storage.writes()).toEqual([WRITE, WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({
      draft: 'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}',
      assisted: true,
    });
  });

  test('«Conservar mi código» writes nothing and returns the focus to «Restaurar inicio»', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));

    await lab.restoreStarterButton().click();
    await expect(lab.confirmDialog()).toHaveAccessibleName('¿Volver al código inicial?');
    await lab.keepCodeButton().click();

    await expect(lab.confirmDialog()).toBeHidden();
    await expect(lab.restoreStarterButton()).toBeFocused();
    expect(await storage.writes()).toEqual([]);
  });

  test('restoring the starter saves it once and gives the focus to the editor', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.writeDraft('rust', 'borrador');

    await lab.restoreStarterButton().click();
    await expect(lab.confirmDialog()).toContainText(
      'Se reemplazará el borrador de este ejercicio. Tus resultados anteriores y notas se conservan.',
    );
    await lab.continueButton().click();

    await expect(lab.editor('rust')).toBeFocused();
    await expect(lab.editor('rust')).toContainText('todo!("calcular energía")');
    expect(await storage.writes()).toEqual([WRITE, WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01].draft).toBe(
      'fn energia(celdas: i32) -> i32 {\n    todo!("calcular energía")\n}',
    );
  });
});

test.describe('your own case', () => {
  test('«Inventar una variante» copies the test only once, focuses the field and says why', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.testCaseToggle('Tres celdas').click();

    await lab.inventVariantButton('Tres celdas').click();

    await expect(lab.customTestBox('rust')).toHaveValue('energia(3) == 21');
    await expect(lab.customTestBox('rust')).toBeFocused();
    await expect(shell.toast).toHaveText(
      'Cambiá una entrada o expectativa y ejecutá. Tu caso extra se revisa por separado.',
    );
    expect(await storage.writes()).toEqual([WRITE]);

    await lab.testCaseToggle('Reactor vacío').click();
    await lab.inventVariantButton('Reactor vacío').click();

    await expect(lab.customTestBox('rust')).toHaveValue('energia(3) == 21');
    await expect(shell.toast).toHaveText(
      'Conservé tu caso extra. Podés editarlo o borrarlo para partir de otra prueba.',
    );
    expect(await storage.writes()).toEqual([WRITE]);
  });
});

test.describe('copying the program', () => {
  test('copies the program of the preview, with its tests', async ({ shell, lab, page }) => {
    await page.addInitScript(() => {
      const copied: string[] = [];
      (window as CopiedWindow).__e2eCopied = copied;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text: string) => void copied.push(text) },
      });
    });
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.programPreviewToggle().click();
    const preview = await lab.programPreview().textContent();

    await lab.copyProgramButton().click();

    await expect(shell.toast).toHaveText('Código copiado. Incluye las pruebas.');
    const copied = await page.evaluate(() => (window as CopiedWindow).__e2eCopied);
    expect(copied).toEqual([preview]);
  });

  test('without the clipboard, copies with the selection and says so', async ({
    shell,
    lab,
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => Promise.reject(new Error('denied')) },
      });
      document.execCommand = () => true;
    });
    await shell.goto(urls.exercise(RUST_01, 'code'));

    await lab.copyProgramButton().click();

    await expect(shell.toast).toHaveText('Código copiado.');
  });
});

test.describe('explaining', () => {
  test('KNOWN DEFECT (spec 021, quirk 3): the reflection has three status texts', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.seed({ [LAB_KEY]: frozenProgress[LAB_KEY] });
    await shell.goto(urls.exercise('rust-02', 'reflect'));
    await expect(lab.reflectionStatus()).toHaveText(
      'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.',
    );

    await shell.goto(urls.exercise(RUST_01, 'reflect'));
    await expect(lab.reflectionStatus()).toHaveText(
      'Escribir tu razonamiento suma una oportunidad de recordar. Se guarda automáticamente.',
    );

    await lab.reflectionBox().fill('Mi primera idea');
    await expect(lab.reflectionStatus()).toHaveText(
      'Tu explicación está guardada. Contrastala con el razonamiento del revisor.',
    );
  });

  test('each key of the reflection saves', async ({ shell, lab, storage }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'reflect'));

    await lab.reflectionBox().pressSequentially('abc');

    expect(await storage.writes()).toEqual([WRITE, WRITE, WRITE]);
  });

  test('a self-assessment schedules the review, saves once and announces it', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-06T12:00:00Z'));
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'reflect'));

    await lab.confidenceButton('Lo entiendo, quiero otra vuelta').click();

    await expect(lab.confidenceButton('Lo entiendo, quiero otra vuelta')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(lab.nextReview()).toHaveText(
      'Próximo repaso: 9 de octubre. No enviamos notificaciones.',
    );
    await expect(shell.toast).toHaveText('Repaso agendado en tu mapa de aprendizaje.');
    expect(await storage.writes()).toEqual([WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({
      confidence: 'practice',
      reviewedAt: Date.parse('2026-10-06T12:00:00Z'),
      reviewAt: Date.parse('2026-10-09T12:00:00Z'),
    });
  });

  test('without a passing result, «Explicá» invites to run the tests', async ({ shell, lab }) => {
    await shell.goto(urls.exercise(RUST_01, 'reflect'));

    await expect(lab.reflectStatus()).toHaveText(
      'Podés reflexionar en cualquier momento. Para verificar este código, volvé a Experimentá y ejecutá las pruebas.',
    );
  });
});

test.describe('the footer and the way back', () => {
  test('«Siguiente experimento →» opens the next exercise and saves it as selected', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'reflect'));

    await lab.footerButton().click();

    await expect(lab.exerciseTitle()).toHaveText('Repará el contador inmutable');
    await expect(page).toHaveURL(/\?ejercicio=rust-02&paso=learn#laboratorio$/);
    expect(await storage.writes()).toEqual([WRITE]);
  });

  test('the last exercise of the language goes back to the map', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-137', 'reflect'));
    await expect(lab.footerButton()).toHaveText('Volver al mapa →');

    await lab.footerButton().click();

    await expect(shell.heading('laboratorio')).toBeVisible();
  });

  test('the core of a workshop goes back to the workshop with a full navigation', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto('/?sistema=cache&ejercicio=rust-113&paso=reflect#laboratorio');
    await expect(lab.footerButton()).toHaveText('Volver al taller →');

    const reloaded = await observeReload(page, () => lab.footerButton().click());

    expect(reloaded).toBe(true);
    await expect(page).toHaveURL(/\?taller=cache&parte=build&lenguaje=rust#sistemas$/);
  });
});
```

- **Pasos:**
  1. Creá el archivo.
  2. Corré `npm run build` y `E2E_PORT=4271 npm run test:e2e -- specs/lab-exercise.spec.ts`: 20 de 20.
  3. Corré lo mismo con `--repeat-each 3`: 60 de 60.
  4. Commit: `test(e2e): las tres fases, el editor, las pistas y el diálogo contra el legacy (F7a, US2)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.4 · La ejecución (T005, E)

- **Crea:** `qa/e2e/specs/lab-run.spec.ts`.
- **Valores del contrato:** las respuestas armadas a mano de `compiler-results.ts` (el error E0384 de Rust), `rust-01` y los textos de hoy de `reviewHTML` y de `diagnose`.
- **Lo que cambia con A4:** el texto de los intentos sale de `attemptsLine`, que A4 edita una vez.

`qa/e2e/specs/lab-run.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { RUST_01, type CompilerKind } from '../lib/compiler-results';
import { attemptsLine } from '../lib/lab-copy';
import { urls } from '../lib/urls';

const LAB_KEY = 'taller-laboratorio-v1';
const WRITE = `set ${LAB_KEY}`;
const SYNC_WRITES = ['set taller-systems-v1', 'set taller-campaign-v1'];
const SOLUTION = 'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}';

interface Review {
  heading: string;
  detail: string;
}

// The texts of lab.js (reviewHTML and diagnose) and of content/rust/exercises/rust-01/exercise.yaml.
const REVIEW: Record<Exclude<CompilerKind, 'transportError'>, Review> = {
  passed: {
    heading: 'La idea funciona en estos casos.',
    detail: 'La firma funciona como un contrato.',
  },
  failedTest: {
    heading: '2 de 3: encontramos algo para explorar.',
    detail: 'No agregues una energía fija al resultado.',
  },
  compileError: {
    heading: 'El programa nos dejó una pista.',
    detail:
      'Probá esto: Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
  },
};

async function storedRecord(storage: { snapshot(): Promise<Record<string, string>> }) {
  return JSON.parse((await storage.snapshot())[LAB_KEY]).records[RUST_01.id];
}

test.describe('a free exercise with the Rust Playground simulated', () => {
  for (const kind of ['passed', 'failedTest', 'compileError'] as const) {
    test(`${kind}: the review explains it and counts one attempt`, async ({
      shell,
      lab,
      compiler,
    }) => {
      await compiler.answer(RUST_01, kind);
      await shell.goto(urls.exercise(RUST_01.id, 'code'));

      await lab.runCode();

      await expect(lab.reviewHeading()).toHaveText(REVIEW[kind].heading);
      await expect(lab.review()).toContainText(REVIEW[kind].detail);
      await expect(lab.review()).toContainText(attemptsLine(1));
      expect(compiler.requests).toHaveLength(1);
    });
  }

  test('transportError: nothing is approved nor failed', async ({
    shell,
    lab,
    compiler,
    pageIssues,
  }) => {
    pageIssues.expectIssue(
      /Failed to load resource: net::ERR_FAILED/,
      'el doble aborta el pedido a propósito',
    );
    await compiler.answer(RUST_01, 'transportError');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText('No pude ejecutar esta vez.');
    await expect(lab.review()).toContainText(
      'Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas.',
    );
  });

  test('the first approval saves before and after, marks the review and is announced', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-06T12:00:00Z'));
    await storage.watchWrites();
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.writeDraft('rust', SOLUTION);

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
    await expect(shell.toast).toHaveText(
      '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.',
    );
    await expect(lab.explainButton()).toBeVisible();
    expect(await storage.writes()).toEqual([WRITE, WRITE, WRITE, ...SYNC_WRITES]);
    expect(await storedRecord(storage)).toMatchObject({
      draft: SOLUTION,
      attempts: 1,
      solvedAt: Date.parse('2026-10-06T12:00:00Z'),
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
      result: {
        code: SOLUTION,
        success: true,
        transportError: false,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: true },
          { id: 't3', passed: true },
        ],
        customTest: '',
        customPassed: false,
      },
    });

    await lab.runCode();
    await expect(shell.toast).toHaveText('Estos casos siguen funcionando. Probá una variante.');
    await expect(lab.review()).toContainText(attemptsLine(2));
  });

  test('Ctrl/⌘ + Enter in the editor runs, and twice sends one request', async ({
    shell,
    lab,
    compiler,
    page,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.editor('rust').click();

    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.press('ControlOrMeta+Enter');

    await expect(lab.runningButton()).toBeDisabled();
    await expect(lab.review()).toContainText('Ejecutando código real…');
    expect(compiler.requests).toHaveLength(1);
  });

  test('cancelling keeps the attempt, saves no result and says so', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await storage.watchWrites();
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await lab.cancelRunButton().click();

    await expect(shell.toast).toHaveText('Ejecución cancelada. Tu código sigue guardado.');
    await expect(lab.runButton()).toBeEnabled();
    await expect(lab.runButton()).toHaveText('▷ Ejecutar y revisar');
    expect(await storage.writes()).toEqual([WRITE]);
    const record = await storedRecord(storage);
    expect(record.attempts).toBe(1);
    expect(record.result).toBeUndefined();
  });

  test('changing the phase does not cancel: the result arrives in «Explicá» and in the review', async ({
    shell,
    lab,
    compiler,
  }) => {
    const release = await compiler.answerLater(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await lab.tab('reflect').click();
    release();

    await expect(lab.reflectStatus()).toContainText('Lo hiciste funcionar. Ahora hacelo tuyo.');
    await lab.tab('code').click();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
  });

  test('opening another exercise cancels the run and saves no result', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await lab.nextButton().click();
    await lab.previousButton().click();
    await lab.tab('code').click();

    await expect(lab.runButton()).toBeEnabled();
    await expect(lab.reviewHeading()).toHaveText('¿Qué queremos comprobar?');
    expect((await storedRecord(storage)).result).toBeUndefined();
  });

  test('leaving the lab cancels the run and saves no result', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await shell.openFromMenu('atlas');
    await page.goBack();

    await expect(lab.runButton()).toBeEnabled();
    expect((await storedRecord(storage)).result).toBeUndefined();
  });

  test('a result goes stale when the code changes', async ({ shell, lab, compiler }) => {
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);

    await lab.writeDraft('rust', SOLUTION + '\n');

    await expect(lab.reviewHeading()).toHaveText('El código cambió. Revisémoslo.');
  });

  test('your own case is sent trimmed and reviewed apart', async ({ shell, lab, compiler }) => {
    await compiler.answerWithCustom(RUST_01, 'passed', 'FAIL');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.customTestToggle().click();
    await lab.customTestBox('rust').fill('  energia(1) == 8  ');

    await lab.runCode();

    await expect(lab.review()).toContainText('Tu caso extra: encontró una diferencia ×');
    expect(JSON.parse(compiler.bodies[0]).code).toContain(
      'std::panic::catch_unwind(|| { energia(1) == 8 })',
    );
  });

  test('KNOWN DEFECT (spec 021, quirk 8): the attempts count cancelled runs and transport failures', async ({
    shell,
    lab,
    compiler,
    pageIssues,
  }) => {
    pageIssues.expectIssue(
      /Failed to load resource: net::ERR_FAILED/,
      'el doble aborta el pedido a propósito',
    );
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await lab.cancelRunButton().click();
    await compiler.answer(RUST_01, 'transportError');
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText('No pude ejecutar esta vez.');
    await compiler.answer(RUST_01, 'failedTest');

    await lab.runCode();

    await expect(lab.review()).toContainText(attemptsLine(3));
  });
});
```

- **Pasos:**
  1. Creá el archivo.
  2. Corré `npm run build` y `E2E_PORT=4271 npm run test:e2e -- specs/lab-run.spec.ts`: 13 de 13.
  3. Corré lo mismo con `--repeat-each 3`: 39 de 39.
  4. Commit: `test(e2e): la ejecución con el compilador simulado contra el legacy (F7a, US2 y US6)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.5 · Lo guardado (T006, E)

- **Crea:** `qa/e2e/specs/lab-storage.spec.ts`.
- **Valores del contrato:**
  - las tres fixtures congeladas, sembrando su laboratorio: el texto del almacenamiento, o el `lab` de cada exportación serializado con `JSON.stringify`;
  - `rust-09`, el caso de F7-Q1;
  - `rust-112`, el jefe de `rust-world-4`, que está bloqueado con cualquiera de las tres.

`qa/e2e/specs/lab-storage.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

const LAB_KEY = 'taller-laboratorio-v1';
const WRITE = `set ${LAB_KEY}`;

function exportedLab(name: string): string {
  const path = resolve(import.meta.dirname, '../../fixtures', name);
  return JSON.stringify(JSON.parse(readFileSync(path, 'utf8')).lab);
}

// Frozen contracts (qa/AGENTS.md): read only.
const FROZEN_LABS: Record<string, string> = {
  'progress-master-2a278ad-storage.json': frozenProgress[LAB_KEY],
  'progress-master-2a278ad-export.json': exportedLab('progress-master-2a278ad-export.json'),
  'progress-d0e1b49-export.json': exportedLab('progress-d0e1b49-export.json'),
};

// rust-09 was solved and then failed with a variant (F7-Q1); rust-112 is the boss of a locked world.
const VISITS = [
  urls.view('laboratorio'),
  urls.exercise('rust-09', 'learn'),
  urls.exercise('rust-09', 'code'),
  urls.exercise('rust-09', 'reflect'),
  urls.campaignMission('rust-world-4', 'rust-112'),
];

test.describe('the frozen progress', () => {
  for (const [name, text] of Object.entries(FROZEN_LABS)) {
    test(`${name}: the map, the three phases and the lock write nothing and warn nothing`, async ({
      shell,
      lab,
      storage,
    }) => {
      await storage.seed({ [LAB_KEY]: text });
      await storage.watchWrites();

      for (const url of VISITS) {
        await shell.goto(url);
        expect(await storage.writes(), url).toEqual([]);
      }
      await expect(lab.campaignLockHeading()).toBeVisible();

      const stored = await storage.snapshot();
      expect(stored[LAB_KEY]).toBe(text);
      expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
      await expect(shell.toast).toHaveText('');
    });
  }

  test('rust-09, solved and then failed, still shows as solved (F7-Q1)', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.seed({ [LAB_KEY]: frozenProgress[LAB_KEY] });

    await shell.goto(urls.view('laboratorio'));

    await expect(lab.exerciseNode('Resuelto. Salir de loop con una respuesta')).toHaveText('✓');
  });
});

test.describe('what the lab saves', () => {
  test('browsing, filtering, searching, changing the phase, an explorer and the way back save only the opening', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('laboratorio'));
    await lab.levelButton('Inicial').click();
    await lab.extrasButton().click();
    await lab.extrasButton().click();
    await lab.searchBox().fill('reactor');

    await lab.exerciseNode('La energía del reactor').click();
    await lab.explorerButton('Siguiente paso →').click();
    await lab.tab('code').click();
    await lab.tab('reflect').click();
    await lab.backButton().click();

    expect(await storage.writes()).toEqual([WRITE]);
  });
});

test.describe('with the storage blocked', () => {
  test('the map warns and the editor and the reflection say that nothing is saved', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.block();
    await shell.goto(urls.view('laboratorio'));
    await expect(lab.storageWarning()).toContainText(
      'El guardado local no está disponible. Exportá tu progreso desde Método y notas antes de cerrar.',
    );

    await shell.goto(urls.exercise('rust-01', 'code'));
    await lab.writeDraft('rust', 'fn energia');
    await expect(lab.editorStatus()).toHaveText('Exportá para conservar');

    await shell.goto(urls.exercise('rust-01', 'reflect'));
    await lab.reflectionBox().fill('no se puede guardar');
    await expect(lab.reflectionStatus()).toHaveText(
      'El guardado no está disponible: exportá tu avance.',
    );
  });
});
```

- **Pasos:**
  1. Creá el archivo.
  2. Corré `npm run build` y `E2E_PORT=4271 npm run test:e2e -- specs/lab-storage.spec.ts`: 6 de 6.
  3. Corré lo mismo con `--repeat-each 3`: 18 de 18.
  4. Commit: `test(e2e): lo que guarda el laboratorio y las fixtures congeladas contra el legacy (F7a, US4)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.6 · Los exploradores (T007, E)

- **Crea:** `qa/e2e/specs/lab-explorers.spec.ts`.
- **Valores del contrato:**
  - la clasificación de `qa/fixtures/explorer-kinds-a179d03.json`;
  - el `visual` de `content/` (`rust-05` y la etapa de `go-11`);
  - los textos de hoy de `lab-explorers.js`, `quest-explorers.js` y los modelos de `entities/exercise/model/{lab,quest}-explorer.ts`.

`qa/e2e/specs/lab-explorers.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

// One exercise per explorer kind (qa/fixtures/explorer-kinds-a179d03.json and the `visual` of content/).
test.describe('the mission explorers', () => {
  test('robot (rust-103): a move into the wall keeps the state, explains why and keeps the focus', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-103', 'learn'));
    await expect(lab.questExplorer()).toContainText(
      'Modelo conceptual · No ejecuta el código del editor ni acredita la misión.',
    );
    await lab.robotHistoryToggle().click();

    await lab.explorerButton('Ir al oeste: restar uno a x').click();

    await expect(lab.questStatus()).toHaveText(
      'Intento 1. O → choque; seguís en (0,0), batería 4. La propuesta (-1,0) cruza el borde. Se rechaza antes de gastar: el estado se conserva.',
    );
    await expect(lab.questExplorer().getByRole('meter')).toHaveAccessibleName(
      'Batería restante: 4 de 4',
    );
    await expect(lab.explorerButton('Ir al oeste: restar uno a x')).toBeFocused();
    await expect(lab.robotHistory()).not.toHaveAttribute('open');
  });

  test('packet (rust-106): a wrong length is rejected', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-106', 'learn'));

    await lab.explorerButton('Alternar b0 de la longitud').click();

    await expect(lab.packetVerdict()).toContainText('Rechazado: declara 2 bytes, pero llegaron 3.');
    await expect(lab.questStatus()).toHaveText(
      'Se alternó el bit de menor peso de la longitud declarada. La cantidad real de payload no cambió; el receptor compara ambas.',
    );
    await expect(lab.explorerButton('Alternar b0 de la longitud')).toBeFocused();
  });

  test('packet (go-106): an altered byte is rejected by the CRC', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('go-106', 'learn'));

    await lab.explorerButton('Alternar b0 del primer byte').click();

    await expect(lab.packetVerdict()).toContainText(
      'Rechazado: la comprobación recibida no coincide con la calculada.',
    );
    await expect(lab.questStatus()).toHaveText(
      'Se alternó el bit 0 del primer byte recibido. La comprobación enviada se conserva: ahora el receptor puede detectar esa alteración.',
    );
    await expect(lab.explorerButton('Alternar b0 del primer byte')).toBeFocused();
  });

  test('opening another exercise empties the state of every mission explorer', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-103', 'learn'));
    await lab.explorerButton('Ir al oeste: restar uno a x').click();

    await lab.previousButton().click();
    await lab.nextButton().click();

    await expect(lab.questStatus()).toHaveText(
      'Partís de (0,0). Probá O para observar un choque; después buscá la baliza (2,2).',
    );
  });
});

test.describe('the lab explorers', () => {
  test('channel (rust-46): the producer waits without a buffer and the focus moves to the consumer', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-46', 'learn'));

    await lab.explorerButton('Paso del productor →').click();

    await expect(lab.labExplorerStatus()).toHaveText(
      'El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.0 mensajes entregados.',
    );
    await expect(lab.explorerButton('Paso del productor →')).toBeDisabled();
    await expect(lab.explorerButton('Paso del consumidor →')).toBeFocused();
  });

  test('generic (rust-36): a struct without derives does not meet the contract', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-36', 'learn'));

    await lab.explorerSelect('Le pasás').selectOption('record');

    await expect(lab.labExplorer()).toContainText('Falta cumplir el contrato ×');
    await expect(lab.labExplorerStatus()).toHaveText(
      'Un struct no implementa automáticamente Ord, Eq o Display. Necesitás implementar el trait o derivarlo si ese trait lo admite y sus campos cumplen las restricciones.',
    );
    await expect(lab.explorerSelect('Le pasás')).toBeFocused();
  });

  test('pointer (rust-51): changing the copy leaves the original', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-51', 'learn'));
    await expect(lab.labExplorer()).toContainText(
      'Es un modelo conceptual, no una inspección de memoria real.',
    );

    await lab.explorerButton('Modificar copia +1').click();

    await expect(lab.labExplorerStatus()).toHaveText(
      'Cambió la celda B. El original conserva su valor porque copiar un entero crea otro valor independiente.',
    );
    await expect(lab.explorerButton('Modificar copia +1')).toBeFocused();
  });

  test('ownership (rust-05): moving leaves the origin unusable', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-05', 'learn'));
    await expect(lab.labExplorer()).toContainText('Modelo conceptual: un String llamado origen.');

    await lab.explorerButton('Mover').click();

    await expect(lab.explorerButton('Mover')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.labExplorerStatus()).toHaveText(
      'destino pasa a poseer el String. origen ya no puede usarse. Se transfiere la propiedad; no se duplica el contenido del String.',
    );
    await expect(lab.explorerButton('Mover')).toBeFocused();
  });

  test('slices (go-11): an independent copy stops sharing the array', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('go-11', 'learn'));
    await expect(lab.labExplorer()).toContainText('Modelo conceptual: vista := original[1:].');

    await lab.explorerButton('Copia independiente').click();

    await expect(lab.explorerButton('Volver a compartir')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.labExplorerStatus()).toHaveText(
      'La copia tiene su propio arreglo de respaldo. Cambiar un elemento de vista ya no cambia original. El slice y los datos que referencia son cosas distintas.',
    );
    await expect(lab.explorerButton('Volver a compartir')).toBeFocused();
  });

  test('flow (rust-01): each step shows its reason and the button starts over at the end', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-01', 'learn'));

    await lab.explorerButton('Siguiente paso →').click();
    await expect(lab.labExplorer()).toContainText(
      'Rust distingue las expresiones, que producen un valor, de las sentencias.',
    );
    await expect(lab.explorerButton('Siguiente paso →')).toBeFocused();

    await lab.explorerButton('Siguiente paso →').click();

    await expect(lab.labExplorer()).toContainText('La salida depende del argumento.');
    await expect(lab.explorerButton('Volver al inicio ↺')).toBeFocused();
  });

  test('opening another exercise restarts the explorer; changing the phase keeps it', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-46', 'learn'));
    await lab.explorerButton('Paso del productor →').click();

    await lab.tab('code').click();
    await lab.tab('learn').click();
    await expect(lab.labExplorerStatus()).toContainText('El productor espera');

    await lab.nextButton().click();

    await expect(lab.exerciseTitle()).not.toHaveText('Un trabajo que viaja a otro thread');
    await expect(lab.labExplorerStatus()).toHaveText(
      'Elegí qué participante da el primer paso.0 mensajes entregados.',
    );
  });

  test('KNOWN DEFECT (spec 021, quirk 2): coming back to an exercise through the URL does not restart its explorer', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.searchBox().fill('Un trabajo que viaja a otro thread');
    await lab.exerciseNode('Un trabajo que viaja a otro thread').click();
    await lab.explorerButton('Paso del productor →').click();

    await shell.openFromMenu('atlas');
    await page.goBack();

    await expect(lab.labExplorerStatus()).toContainText('El productor espera');
  });
});
```

- **Pasos:**
  1. Creá el archivo.
  2. Corré `npm run build` y `E2E_PORT=4271 npm run test:e2e -- specs/lab-explorers.spec.ts`: 12 de 12.
  3. Corré lo mismo con `--repeat-each 3`: 36 de 36.
  4. Corré la red entera: `E2E_PORT=4271 npm run test:e2e` da 184 de 184.
  5. Commit: `test(e2e): un E2E por tipo de explorador contra el legacy (F7a, US5)`.
- **Compuerta de U1:** §0.2. `frontend/lab.js` sin diff.
- **Vuelta atrás:** revertí el commit.

## 2. Unidad 2 · Las reglas y los selectores (dueño R, onda 1)

**Cubre:** FR-053, FR-054, FR-055, la lógica de FR-029, FR-052 (`readTestMarkers`) y la parte de modelo de FR-062.

**Entrega:** las reglas puras en `entities/exercise` y los selectores del mapa en `pages/lab/model`, cada una con su spec, sin que `lab.js` las use todavía.

### 2.0 Contratos de la unidad 2

Son las firmas exactas: los cuerpos están en T009 y T010.

```ts
// entities/exercise/model/diagnose.ts
export interface Diagnosis { explanation: string; action: string }
export function diagnose(stderr: string, language: ExerciseLanguage): Diagnosis;

// entities/exercise/model/live-hint.ts
export function liveHint(code: string, exercise: Pick<Exercise, 'review'>): string;

// entities/exercise/model/lab-result.ts
export interface LabTestOutcome { id: string; passed: boolean }
export interface LabResultV1 {
  code: string; success: boolean; stdout: string; stderr: string; transportError: boolean;
  tests: LabTestOutcome[]; time: number; customTest: string; customPassed: boolean; attemptId?: number;
}

// entities/exercise/model/selectors.ts
export function levelOf(exercise: Pick<Exercise, 'level' | 'stage'>): LevelId;
export function isSolved(record: LabRecord | undefined): boolean;
export function isDueForReview(record: LabRecord | undefined, now: number): boolean;
export function practicePointsOf(record: LabRecord | undefined): number;
export function draftOf(exercise: Pick<Exercise, 'starter'>, record: LabRecord): string;
export function normalizeCustomTest(raw: unknown): string;
export function isResultCurrent(exercise: Pick<Exercise, 'starter'>, record: LabRecord): boolean;
export function isReviewComplete(exercise: { tests: readonly { id: string }[] },
  result: { success: boolean; tests: readonly LabTestOutcome[] }): boolean;
export function isReflectionSolved(exercise: { tests: readonly { id: string }[] } & Pick<Exercise, 'starter'>,
  record: LabRecord): boolean;

// entities/exercise/model/record-rules.ts
export const HINT_LIMIT = 3;
export const DAY_MS = 86400000;
export type Confidence = 'again' | 'practice' | 'confident';
export const CONFIDENCE_DAYS: Readonly<Record<Confidence, number>>; // 1, 3 y 7
export function ensureRecord(progress: LabStateV1, id: string): LabRecord;
export function hintPatch(record: LabRecord): { hints: number };
export function predictionPatch(exercise: Pick<Exercise, 'prediction'>, answer: number):
  { prediction: number; predictionCorrect?: true };
export function revealSolutionPatch(): { solutionSeen: true; assisted: true };
export function loadSolutionPatch(exercise: Pick<Exercise, 'solution'>): { draft: string; assisted: true };
export function restoreStarterPatch(exercise: Pick<Exercise, 'starter'>): { draft: string };
export function selfAssessmentPatch(confidence: Confidence, now: number):
  { confidence: Confidence; reviewedAt: number; reviewAt: number };
export function attemptPatch(record: LabRecord): { attempts: number };
export function passedRunPatch(record: LabRecord, now: number): { solvedAt: number; reviewAt?: number };

// entities/exercise/model/review-state.ts
export type ReviewState =
  | { kind: 'running' } | { kind: 'unrun' } | { kind: 'stale' }
  | { kind: 'transport-failure'; message: string }
  | { kind: 'passed'; passedCount: number }
  | { kind: 'partial'; passedCount: number; failure: string }
  | { kind: 'error'; diagnosis: Diagnosis };
export function reviewStateOf(exercise: Pick<Exercise, 'language' | 'starter' | 'tests' | 'review'>,
  record: LabRecord, running: boolean): ReviewState;

// entities/exercise/model/run-outcome.ts (se exporta lo que hoy es privado)
export function readTestMarkers(stdout: string): ReadonlyMap<string, boolean>;

// pages/lab/model/map-selectors.ts
export type LevelFilter = LevelId | 'all';
export interface MapFilters { query: string; dueOnly: boolean; extraOnly: boolean; level: LevelFilter }
export type LabRecords = Readonly<Record<string, LabRecord>>;
export function isExtraChallenge(exercise: Pick<Exercise, 'stage'>): boolean;
export function matchesMapFilters(exercise: Exercise, records: LabRecords, filters: MapFilters, now: number): boolean;
export function todayChallenge(exercises: readonly Exercise[], records: LabRecords,
  filters: Pick<MapFilters, 'level' | 'extraOnly'>, now: number): Exercise | undefined;
export function surprisePool(exercises: readonly Exercise[], records: LabRecords, filters: MapFilters, now: number): Exercise[];
```

**De dónde sale cada una** (`frontend/lab.js` de la base), para que el movimiento sea fiel:

| Función nueva | Hoy |
| --- | --- |
| `diagnose` | `diagnose(stderr, lang)`: los dos arreglos de reglas y la explicación por omisión, carácter por carácter |
| `liveHint` | `liveHint(code, item)` |
| `levelOf` | `levelFor` |
| `isSolved` e `isDueForReview` | `isSolved` e `isDue`, con la hora explícita |
| `practicePointsOf` | el `reduce` de `achievementStats` |
| `draftOf` | `draftFor`, que usa `??` |
| `normalizeCustomTest` | `(record.customTest \|\| '').trim()` |
| `isResultCurrent` | `resultMatches` |
| `isReviewComplete` | `complete` de `reviewHTML` |
| `isReflectionSolved` | `solved` de `reflectHTML` |
| `reviewStateOf` | las ramas de `reviewHTML`: `activeRun`, sin resultado o vencido, transporte, completo, parcial y error |
| Los parches | los manejadores de `predict`, `hint`, `reveal-solution`, `load-solution`, `reset-code` y `confidence`, y lo que `runExercise` suma al registro |
| Los selectores del mapa | `matches`, el `next` de `mapHTML` y la rama `surprise` de `onClick` |

### Tarea 2.1 · Las specs de las reglas, en rojo (T008, R)

- **Crea:** los seis módulos de §2.0 con sus firmas y cuerpos `throw new Error('not implemented')`. Las constantes, los tipos y `ensureRecord` van completos. También crea sus specs:
  - `frontend/src/entities/exercise/model/diagnose.spec.ts`;
  - `live-hint.spec.ts`;
  - `selectors.spec.ts`;
  - `record-rules.spec.ts`;
  - `review-state.spec.ts`;
  - `run-outcome.spec.ts`.
- **Cambia:**
  - `frontend/src/entities/exercise/index.ts`, con el diff de T009;
  - `frontend/src/entities/exercise/model/run-outcome.ts`, con el diff de T009: `readMarkers` pasa a ser la exportada `readTestMarkers`, con el mismo cuerpo.

`frontend/src/entities/exercise/model/diagnose.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnose';

const FALLBACK = {
  explanation:
    'La ejecución no terminó correctamente. La salida original, abajo, muestra el diagnóstico que necesitamos interpretar.',
  action:
    'Empezá por el primer error y comparalo con la firma y el comportamiento pedidos. Pedí una pista si todavía no encontrás la causa.',
};

// One compiler message per rule; the expected explanation starts as lab.js wrote it.
const RUST: [stderr: string, explanationStart: string][] = [
  ['error[E0382]: borrow of moved value: `s`', 'Ese valor ya se movió.'],
  ['error[E0502]: cannot borrow `v` as mutable', 'Los préstamos que se superponen'],
  [
    'error[E0384]: cannot assign twice to immutable variable `nivel`',
    'Estás intentando modificar un binding',
  ],
  ['error[E0308]: mismatched types', 'La expresión devuelve un tipo distinto'],
  ['error[E0597]: `x` does not live long enough', 'Una referencia necesita apuntar'],
  [
    'error[E0277]: the trait bound `T: Ord` is not satisfied',
    'La operación necesita un comportamiento',
  ],
  [
    'error[E0428]: the name `main` is defined multiple times',
    'Hay dos definiciones con el mismo nombre.',
  ],
  ['error: unexpected closing delimiter: `}`', 'La estructura del código no coincide'],
];
const GO: [stderr: string, explanationStart: string][] = [
  ['./prog.go:12:2: declared and not used: x', 'Go detectó una variable local'],
  [
    './prog.go:8:9: cannot use s (variable of type string) as int value',
    'Los tipos de esta operación',
  ],
  ['./prog.go:5:2: undefined: total', 'El compilador no encuentra ese nombre'],
  ['./prog.go:6:4: no new variables on left side of :=', 'El operador := declara variables nuevas'],
  ['fatal error: all goroutines are asleep - deadlock!', 'Las goroutines quedaron esperando'],
  [
    'panic: runtime error: index out of range [3] with length 3',
    'Se intentó acceder fuera de los límites',
  ],
  [
    './prog.go:20:6: main redeclared in this block',
    'Hay más de una declaración con el mismo nombre.',
  ],
  ['./prog.go:3:1: syntax error: unexpected }', 'El compilador no pudo interpretar'],
];

describe('diagnose', () => {
  it.each(RUST)('Rust: %s', (stderr, explanationStart) => {
    expect(diagnose(stderr, 'rust').explanation.startsWith(explanationStart)).toBe(true);
  });

  it.each(GO)('Go: %s', (stderr, explanationStart) => {
    expect(diagnose(stderr, 'go').explanation.startsWith(explanationStart)).toBe(true);
  });

  it('gives the explanation and the action of the mutability rule word for word', () => {
    expect(diagnose('error[E0384]: cannot assign twice', 'rust')).toEqual({
      explanation:
        'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
      action:
        'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
    });
  });

  it('the first matching rule wins: a moved value that is also unexpected is about ownership', () => {
    expect(diagnose('error[E0382]: use of moved value; expected `;`', 'rust').explanation).toMatch(
      /^Ese valor ya se movió\./,
    );
  });

  it('the rules belong to their language: a Rust code means nothing to Go', () => {
    expect(diagnose('error[E0382]', 'go')).toEqual(FALLBACK);
  });

  it('an unknown message and an empty one get the fallback', () => {
    expect(diagnose('Killed', 'rust')).toEqual(FALLBACK);
    expect(diagnose('', 'go')).toEqual(FALLBACK);
  });
});
```

`frontend/src/entities/exercise/model/live-hint.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { liveHint } from './live-hint';

const EXERCISE = {
  review: { success: '', pitfall: 'println! muestra texto y devuelve ().' },
};

describe('liveHint', () => {
  it.each(['todo!("calcular")', '// TODO', 'IMPLEMENTAR acá', 'panic("pendiente")'])(
    'a part left to complete: %s',
    (code) => {
      expect(liveHint(code, EXERCISE)).toBe(
        'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.',
      );
    },
  );

  it('an empty editor asks to restore the starter', () => {
    expect(liveHint(' \n ', EXERCISE)).toBe(
      'Volvé al código inicial para conservar las firmas que usan las pruebas.',
    );
  });

  it.each(['fn main() {}', 'func main() {}'])('a main of your own: %s', (code) => {
    expect(liveHint(code, EXERCISE)).toBe(
      'El taller ya agrega main. Mantené acá las funciones de la consigna.',
    );
  });

  it('otherwise, it invites a small change and adds the pitfall', () => {
    expect(liveHint('fn energia() -> i32 { 1 }', EXERCISE)).toBe(
      'No hace falta adivinar: proponé un cambio pequeño y comprobalo. println! muestra texto y devuelve ().',
    );
  });

  it('a pending part wins over an empty-looking main', () => {
    expect(liveHint('fn main() { todo!() }', EXERCISE)).toMatch(/^Todavía hay una parte/);
  });
});
```

`frontend/src/entities/exercise/model/selectors.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  draftOf,
  isDueForReview,
  isReflectionSolved,
  isResultCurrent,
  isReviewComplete,
  isSolved,
  levelOf,
  normalizeCustomTest,
  practicePointsOf,
} from './selectors';

const EXERCISE = {
  starter: 'fn inicio() {}',
  tests: [{ id: 't1' }, { id: 't2' }],
};

const passing = (code: string, customTest = '') => ({
  code,
  success: true,
  customTest,
  tests: [
    { id: 't1', passed: true },
    { id: 't2', passed: true },
  ],
});

describe('levelOf', () => {
  it('uses the level of the exercise when it has one', () => {
    expect(levelOf({ level: 'expert', stage: 1 })).toBe('expert');
  });

  it.each([
    [1, 'beginner'],
    [4, 'beginner'],
    [5, 'medium'],
    [8, 'medium'],
    [9, 'advanced'],
    [12, 'advanced'],
    [13, 'expert'],
    [20, 'expert'],
  ] as const)('stage %i without a level is %s', (stage, level) => {
    expect(levelOf({ stage })).toBe(level);
  });
});

describe('isSolved', () => {
  it('rust-09 of the frozen progress: solved, then failed with a variant, is still solved (F7-Q1)', () => {
    const rust09 = {
      solvedAt: 1791073357282,
      reviewAt: 1791159757282,
      attempts: 2,
      result: {
        code: 'variante',
        success: true,
        tests: [
          { id: 't1', passed: false },
          { id: 't2', passed: false },
          { id: 't3', passed: false },
        ],
      },
    };
    expect(isSolved(rust09)).toBe(true);
  });

  it('a passing result without solvedAt is not solved, and neither is no record', () => {
    expect(isSolved({ result: passing('x') })).toBe(false);
    expect(isSolved(undefined)).toBe(false);
  });
});

describe('isDueForReview', () => {
  it('is due from its date on, and never without one', () => {
    expect(isDueForReview({ reviewAt: 1000 }, 999)).toBe(false);
    expect(isDueForReview({ reviewAt: 1000 }, 1000)).toBe(true);
    expect(isDueForReview({ reviewAt: 0 }, 5000)).toBe(false);
    expect(isDueForReview({}, 5000)).toBe(false);
    expect(isDueForReview(undefined, 5000)).toBe(false);
  });
});

describe('practicePointsOf', () => {
  it('a solved record with the right prediction and a long reflection earns 20 + 5 + 5', () => {
    expect(
      practicePointsOf({
        solvedAt: 1,
        predictionCorrect: true,
        reflection: 'Con mut el compilador sabe que el valor cambia y me deja sumarle dos veces.',
      }),
    ).toBe(30);
  });

  it('a reflection counts from 40 characters without the spaces of its ends', () => {
    expect(practicePointsOf({ reflection: `  ${'a'.repeat(39)}  ` })).toBe(0);
    expect(practicePointsOf({ reflection: 'a'.repeat(40) })).toBe(5);
  });

  it('no record earns nothing', () => {
    expect(practicePointsOf(undefined)).toBe(0);
  });
});

describe('draftOf and normalizeCustomTest', () => {
  it('the draft is the saved one, even empty, or else the starter', () => {
    expect(draftOf(EXERCISE, { draft: 'mío' })).toBe('mío');
    expect(draftOf(EXERCISE, { draft: '' })).toBe('');
    expect(draftOf(EXERCISE, {})).toBe('fn inicio() {}');
  });

  it('the custom test loses the spaces of its ends, a no-break space included', () => {
    expect(normalizeCustomTest('  energia(1) == 7\n')).toBe('energia(1) == 7');
    expect(normalizeCustomTest(' \t  ')).toBe('');
    expect(normalizeCustomTest(undefined)).toBe('');
  });
});

describe('isResultCurrent', () => {
  it('is current while the draft and the trimmed custom test are the ones that ran', () => {
    expect(
      isResultCurrent(EXERCISE, { draft: 'a', customTest: ' x ', result: passing('a', 'x') }),
    ).toBe(true);
  });

  it('goes stale when the draft or the custom test change', () => {
    expect(isResultCurrent(EXERCISE, { draft: 'b', result: passing('a') })).toBe(false);
    expect(isResultCurrent(EXERCISE, { draft: 'a', customTest: 'y', result: passing('a') })).toBe(
      false,
    );
  });

  it('a result of the starter is current while there is no draft', () => {
    expect(isResultCurrent(EXERCISE, { result: passing('fn inicio() {}') })).toBe(true);
  });

  it('without a result there is nothing current', () => {
    expect(isResultCurrent(EXERCISE, {})).toBe(false);
  });
});

describe('isReviewComplete and isReflectionSolved', () => {
  it('the review is complete when every test passed and the run succeeded', () => {
    expect(isReviewComplete(EXERCISE, passing('a'))).toBe(true);
    expect(isReviewComplete(EXERCISE, { ...passing('a'), success: false })).toBe(false);
    expect(
      isReviewComplete(EXERCISE, {
        success: true,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: false },
        ],
      }),
    ).toBe(false);
  });

  it('«Explicá» counts as solved only with a current, successful result that passes each test', () => {
    expect(isReflectionSolved(EXERCISE, { draft: 'a', result: passing('a') })).toBe(true);
    expect(isReflectionSolved(EXERCISE, { draft: 'b', result: passing('a') })).toBe(false);
    expect(
      isReflectionSolved(EXERCISE, { draft: 'a', result: { ...passing('a'), success: false } }),
    ).toBe(false);
  });
});
```

`frontend/src/entities/exercise/model/record-rules.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { LabStateV1 } from './lab-state';
import {
  attemptPatch,
  ensureRecord,
  hintPatch,
  loadSolutionPatch,
  passedRunPatch,
  predictionPatch,
  restoreStarterPatch,
  revealSolutionPatch,
  selfAssessmentPatch,
} from './record-rules';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const EXERCISE = {
  starter: 'fn inicio() {}',
  solution: 'fn resuelto() {}',
  prediction: { question: '', options: ['a', 'b', 'c'], answer: 1, explanation: '' },
};

describe('ensureRecord', () => {
  it('returns the record in place, creating an empty one when it is missing', () => {
    const progress: LabStateV1 = {
      version: 1,
      records: { a: { hints: 1 } },
      selected: { rust: null, go: null },
    };
    expect(ensureRecord(progress, 'a')).toBe(progress.records.a);
    const created = ensureRecord(progress, 'b');
    expect(created).toEqual({});
    expect(progress.records.b).toBe(created);
  });
});

describe('the rules that change a record', () => {
  it('a hint adds one, up to three', () => {
    expect(hintPatch({})).toEqual({ hints: 1 });
    expect(hintPatch({ hints: 2 })).toEqual({ hints: 3 });
    expect(hintPatch({ hints: 3 })).toEqual({ hints: 3 });
  });

  it('the right prediction marks predictionCorrect; a wrong one only records the answer', () => {
    expect(predictionPatch(EXERCISE, 1)).toEqual({ prediction: 1, predictionCorrect: true });
    expect(predictionPatch(EXERCISE, 2)).toEqual({ prediction: 2 });
  });

  it('a wrong prediction after the right one does not clear it once applied', () => {
    const record = { prediction: 1, predictionCorrect: true };
    Object.assign(record, predictionPatch(EXERCISE, 0));
    expect(record).toEqual({ prediction: 0, predictionCorrect: true });
  });

  it('opening the solution marks it seen and assisted', () => {
    expect(revealSolutionPatch()).toEqual({ solutionSeen: true, assisted: true });
  });

  it('loading the solution replaces the draft and marks it assisted', () => {
    expect(loadSolutionPatch(EXERCISE)).toEqual({ draft: 'fn resuelto() {}', assisted: true });
  });

  it('restoring the starter replaces only the draft', () => {
    expect(restoreStarterPatch(EXERCISE)).toEqual({ draft: 'fn inicio() {}' });
  });

  it.each([
    ['again', '2026-10-07T12:00:00Z'],
    ['practice', '2026-10-09T12:00:00Z'],
    ['confident', '2026-10-13T12:00:00Z'],
  ] as const)('a self-assessment «%s» schedules the review on %s', (confidence, reviewAt) => {
    expect(selfAssessmentPatch(confidence, NOW)).toEqual({
      confidence,
      reviewedAt: NOW,
      reviewAt: Date.parse(reviewAt),
    });
  });

  it('a self-assessment keeps the order of the fields it writes', () => {
    expect(Object.keys(selfAssessmentPatch('again', NOW))).toEqual([
      'confidence',
      'reviewedAt',
      'reviewAt',
    ]);
  });

  it('an attempt adds one', () => {
    expect(attemptPatch({})).toEqual({ attempts: 1 });
    expect(attemptPatch({ attempts: 4 })).toEqual({ attempts: 5 });
  });

  it('a first approval sets solvedAt and a review in a day', () => {
    expect(passedRunPatch({}, NOW)).toEqual({
      solvedAt: NOW,
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
    });
  });

  it('a later approval keeps solvedAt and an existing review', () => {
    expect(passedRunPatch({ solvedAt: 100, reviewAt: 200 }, NOW)).toEqual({ solvedAt: 100 });
    expect(passedRunPatch({ solvedAt: 100 }, NOW)).toEqual({
      solvedAt: 100,
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
    });
  });
});
```

`frontend/src/entities/exercise/model/review-state.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reviewStateOf } from './review-state';

const EXERCISE = {
  language: 'rust' as const,
  starter: 'fn inicio() {}',
  tests: [
    { id: 't1', label: '', expression: '', why: '', failure: 'Falla del primero.' },
    { id: 't2', label: '', expression: '', why: '', failure: 'Falla del segundo.' },
  ],
  review: { success: 'Bien.', pitfall: 'Cuidado.' },
};

function result(overrides: Record<string, unknown>) {
  return {
    code: 'a',
    success: true,
    stdout: '',
    stderr: '',
    transportError: false,
    tests: [
      { id: 't1', passed: true },
      { id: 't2', passed: true },
    ],
    time: 1,
    customTest: '',
    customPassed: false,
    ...overrides,
  };
}

describe('reviewStateOf', () => {
  it('a run of this exercise in progress is running, whatever was saved', () => {
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: result({}) }, true)).toEqual({
      kind: 'running',
    });
  });

  it('without a result there is nothing to review yet', () => {
    expect(reviewStateOf(EXERCISE, {}, false)).toEqual({ kind: 'unrun' });
  });

  it('a result of another version of the code is stale', () => {
    expect(reviewStateOf(EXERCISE, { draft: 'b', result: result({}) }, false)).toEqual({
      kind: 'stale',
    });
  });

  it('a transport failure carries its message', () => {
    expect(
      reviewStateOf(
        EXERCISE,
        {
          draft: 'a',
          result: result({ success: false, transportError: true, stderr: 'Sin red.', tests: [] }),
        },
        false,
      ),
    ).toEqual({ kind: 'transport-failure', message: 'Sin red.' });
  });

  it('every test passed and the run succeeded: passed', () => {
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: result({}) }, false)).toEqual({
      kind: 'passed',
      passedCount: 2,
    });
  });

  it('a successful run with a failing test is partial, with the why of the first failure', () => {
    const partial = result({
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
      ],
    });
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: partial }, false)).toEqual({
      kind: 'partial',
      passedCount: 1,
      failure: 'Falla del segundo.',
    });
  });

  it('a run that did not succeed is an error, diagnosed from its output', () => {
    const failed = result({
      success: false,
      stderr: 'error[E0384]: cannot assign twice',
      tests: [],
    });
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: failed }, false)).toEqual({
      kind: 'error',
      diagnosis: {
        explanation:
          'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
        action:
          'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
      },
    });
  });
});
```

`frontend/src/entities/exercise/model/run-outcome.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readTestMarkers } from './run-outcome';

describe('readTestMarkers', () => {
  it('reads one verdict per marker line, the custom test included', () => {
    expect(
      readTestMarkers(
        'hola\n__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:FAIL\n__TALLER_TEST__custom:PASS\n',
      ),
    ).toEqual(
      new Map([
        ['t1', true],
        ['t2', false],
        ['custom', true],
      ]),
    );
  });

  it('a repeated id never passes, even if both lines say PASS', () => {
    expect(readTestMarkers('__TALLER_TEST__t1:PASS\n__TALLER_TEST__t1:PASS\n').get('t1')).toBe(
      false,
    );
  });

  it('a marker inside a line or with a nonce is not a marker', () => {
    expect(readTestMarkers('x __TALLER_TEST__t1:PASS\n__TALLER_TEST__abc:t1:PASS\n').size).toBe(0);
  });
});
```

- **Pasos:**
  1. Creá los stubs y las specs.
  2. Corré `npm run test:unit -- entities/exercise`: fallan con `not implemented` todas las pruebas nuevas salvo la de `ensureRecord` y las tres de `readTestMarkers`, que caracterizan la regla de hoy y pasan desde el principio. Las specs de la base siguen en verde.
  3. Corré `npm run typecheck`.
  4. Commit: `test(front): specs del diagnóstico, la pista en vivo, los selectores, los parches y el revisor (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 2.2 · Las reglas (T009, R)

- **Cambia:** los seis módulos y el índice, con este código.
- **El movimiento de `diagnose`:** los arreglos `RUST_RULES` y `GO_RULES` son los dos arreglos de `diagnose` de `frontend/lab.js`, copiados sin cambiar un carácter. Compará con `git diff --no-index` contra el bloque de `lab.js` antes de cerrar.

`frontend/src/entities/exercise/model/diagnose.ts`:

```ts
import type { ExerciseLanguage } from './types';

export interface Diagnosis {
  explanation: string;
  action: string;
}

type DiagnosisRule = readonly [pattern: RegExp, explanation: string, action: string];

const RUST_RULES: readonly DiagnosisRule[] = [
  [
    /E0382|use of moved value|borrow of moved value/,
    'Ese valor ya se movió. Para tipos como String, asignar o pasar por valor puede transferir ownership; el nombre anterior deja de poder usarlo.',
    'Identificá dónde se consume el valor. Si solo necesitás leerlo, considerá un préstamo; si necesitás dos valores independientes, razoná sobre una copia explícita.',
  ],
  [
    /E0502|E0499|cannot borrow.*mutable.*immutable|more than once/,
    'Los préstamos que se superponen permiten accesos incompatibles. Rust evita que una modificación conviva con lecturas o escrituras que podrían invalidarse.',
    'Buscá el último uso de cada referencia y reducí el alcance del préstamo antes de pedir otro incompatible.',
  ],
  [
    /E0596|E0384|cannot assign twice|cannot assign to/,
    'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
    'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
  ],
  [
    /E0308|mismatched types/,
    'La expresión devuelve un tipo distinto del que promete su contexto. Un punto y coma también puede convertir el resultado de un bloque en ().',
    'Compará los tipos “expected” y “found”. Revisá la última expresión, los brazos de match y los valores devueltos.',
  ],
  [
    /E0106|E0597|does not live long enough|missing lifetime/,
    'Una referencia necesita apuntar a un valor que siga vivo durante su uso. Una anotación de lifetime describe relaciones; no alarga la vida de los datos.',
    'Comprobá quién posee el valor referenciado y si devolvés una referencia a un dato local. Considerá devolver datos propios o relacionar la salida con una entrada.',
  ],
  [
    /E0277|trait bound/,
    'La operación necesita un comportamiento expresado por un trait que el tipo actual no cumple.',
    'Leé el trait que aparece en el diagnóstico y revisá el tipo o la restricción genérica requerida por la consigna.',
  ],
  [
    /E0428|defined multiple times/,
    'Hay dos definiciones con el mismo nombre. El taller agrega main y el código de pruebas.',
    'Editá las funciones iniciales, sin agregar otra función main ni pegar el programa completo de las pruebas.',
  ],
  [
    /expected|unexpected|unclosed delimiter/,
    'La estructura del código no coincide con la sintaxis que espera Rust.',
    'Empezá por el primer diagnóstico: revisá delimitadores, comas, operadores y el lugar señalado. Un error temprano puede producir varios mensajes.',
  ],
];

const GO_RULES: readonly DiagnosisRule[] = [
  [
    /declared and not used|imported and not used/,
    'Go detectó una variable local o un import que no se usa. Eso suele indicar trabajo incompleto o código que ya no hace falta.',
    'Usá el valor que necesitás para resolver la consigna o quitá la declaración sobrante. Revisá también los imports que utiliza el ejercicio.',
  ],
  [
    /cannot use|mismatched types|invalid operation/,
    'Los tipos de esta operación no son compatibles. Go no convierte automáticamente todos los tipos aunque sus representaciones se parezcan.',
    'Compará el tipo recibido con el que espera la función u operador. Convertí explícitamente solo si preserva el significado.',
  ],
  [
    /undefined:/,
    'El compilador no encuentra ese nombre en su alcance.',
    'Buscá una diferencia de escritura, una variable declarada dentro de otro bloque o una función que cambiaste de nombre y que todavía usa una prueba.',
  ],
  [
    /no new variables on left side/,
    'El operador := declara variables nuevas en ese bloque. Acá no está introduciendo ninguna.',
    'Si querés actualizar una variable existente, usá =. Si estás declarando otra, revisá el alcance y el nombre.',
  ],
  [
    /deadlock|all goroutines are asleep/,
    'Las goroutines quedaron esperando sin una operación que pueda destrabarlas. Un canal sin buffer requiere que envío y recepción se encuentren.',
    'Dibujá quién envía, quién recibe y quién cierra. Asegurate de que la operación complementaria pueda ejecutarse.',
  ],
  [
    /index out of range|slice bounds/,
    'Se intentó acceder fuera de los límites de un slice o arreglo.',
    'Revisá el caso vacío y recordá que el último índice válido es len-1. Separá capacidad de longitud.',
  ],
  [
    /redeclared|main redeclared/,
    'Hay más de una declaración con el mismo nombre. El taller prepara package, imports y main.',
    'Mantené en el editor las funciones indicadas, sin agregar package, imports ni main.',
  ],
  [
    /syntax error|expected|unexpected/,
    'El compilador no pudo interpretar esta parte del programa.',
    'Revisá el primer mensaje y su línea. Comprobá llaves, comas, paréntesis y la firma de la función.',
  ],
];

const FALLBACK: Diagnosis = {
  explanation:
    'La ejecución no terminó correctamente. La salida original, abajo, muestra el diagnóstico que necesitamos interpretar.',
  action:
    'Empezá por el primer error y comparalo con la firma y el comportamiento pedidos. Pedí una pista si todavía no encontrás la causa.',
};

export function diagnose(stderr: string, language: ExerciseLanguage): Diagnosis {
  const rules = language === 'rust' ? RUST_RULES : GO_RULES;
  for (const [pattern, explanation, action] of rules)
    if (pattern.test(stderr)) return { explanation, action };
  return { ...FALLBACK };
}
```

`frontend/src/entities/exercise/model/live-hint.ts`:

```ts
import type { Exercise } from './types';

export function liveHint(code: string, exercise: Pick<Exercise, 'review'>): string {
  if (/todo!\s*\(|TODO|IMPLEMENTAR|panic\("pendiente/i.test(code))
    return 'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.';
  if (!code.trim())
    return 'Volvé al código inicial para conservar las firmas que usan las pruebas.';
  if (/\b(?:fn|func)\s+main\s*\(/.test(code))
    return 'El taller ya agrega main. Mantené acá las funciones de la consigna.';
  return (
    'No hace falta adivinar: proponé un cambio pequeño y comprobalo. ' + exercise.review.pitfall
  );
}
```

`frontend/src/entities/exercise/model/lab-result.ts`:

```ts
export interface LabTestOutcome {
  id: string;
  passed: boolean;
}

export interface LabResultV1 {
  code: string;
  success: boolean;
  stdout: string;
  stderr: string;
  transportError: boolean;
  tests: LabTestOutcome[];
  time: number;
  customTest: string;
  customPassed: boolean;
  attemptId?: number;
}
```

`frontend/src/entities/exercise/model/selectors.ts`:

```ts
import { LEVEL_IDS, type LevelId } from '../../../shared/config/levels';
import type { LabTestOutcome } from './lab-result';
import type { LabRecord } from './merge-record';
import type { Exercise } from './types';

const SOLVED_POINTS = 20;
const PREDICTION_POINTS = 5;
const REFLECTION_POINTS = 5;
const REFLECTION_MINIMUM = 40;

interface ExpectedTests {
  tests: readonly { id: string }[];
}

interface StoredResult {
  code?: unknown;
  success?: unknown;
  customTest?: unknown;
  tests?: readonly LabTestOutcome[];
}

export function levelOf(exercise: Pick<Exercise, 'level' | 'stage'>): LevelId {
  if (exercise.level !== undefined && LEVEL_IDS.includes(exercise.level)) return exercise.level;
  if (exercise.stage <= 4) return 'beginner';
  if (exercise.stage <= 8) return 'medium';
  if (exercise.stage <= 12) return 'advanced';
  return 'expert';
}

export function isSolved(record: LabRecord | undefined): boolean {
  return Boolean(record?.solvedAt);
}

export function isDueForReview(record: LabRecord | undefined, now: number): boolean {
  const reviewAt = record?.reviewAt as number | undefined;
  return Boolean(reviewAt) && (reviewAt as number) <= now;
}

export function practicePointsOf(record: LabRecord | undefined): number {
  if (!record) return 0;
  const reflection = typeof record.reflection === 'string' ? record.reflection.trim() : '';
  return (
    (record.solvedAt ? SOLVED_POINTS : 0) +
    (record.predictionCorrect ? PREDICTION_POINTS : 0) +
    (reflection.length >= REFLECTION_MINIMUM ? REFLECTION_POINTS : 0)
  );
}

export function draftOf(exercise: Pick<Exercise, 'starter'>, record: LabRecord): string {
  return record.draft ?? exercise.starter;
}

export function normalizeCustomTest(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

export function isResultCurrent(exercise: Pick<Exercise, 'starter'>, record: LabRecord): boolean {
  const result = record.result as StoredResult | undefined;
  if (!result) return false;
  return (
    result.code === draftOf(exercise, record) &&
    (result.customTest || '') === normalizeCustomTest(record.customTest)
  );
}

export function isReviewComplete(
  exercise: ExpectedTests,
  result: { success: boolean; tests: readonly LabTestOutcome[] },
): boolean {
  const passed = result.tests.filter((test) => test.passed).length;
  return passed === exercise.tests.length && result.success;
}

export function isReflectionSolved(
  exercise: ExpectedTests & Pick<Exercise, 'starter'>,
  record: LabRecord,
): boolean {
  const result = record.result as StoredResult | undefined;
  if (!result?.success || !isResultCurrent(exercise, record)) return false;
  const outcomes = result.tests ?? [];
  return exercise.tests.every((test) =>
    outcomes.some((outcome) => outcome.id === test.id && outcome.passed),
  );
}
```

`frontend/src/entities/exercise/model/record-rules.ts`:

```ts
import type { LabStateV1 } from './lab-state';
import type { LabRecord } from './merge-record';
import type { Exercise } from './types';

export const HINT_LIMIT = 3;
export const DAY_MS = 86400000;

export type Confidence = 'again' | 'practice' | 'confident';

export const CONFIDENCE_DAYS: Readonly<Record<Confidence, number>> = {
  again: 1,
  practice: 3,
  confident: 7,
};

export function ensureRecord(progress: LabStateV1, id: string): LabRecord {
  return progress.records[id] || (progress.records[id] = {});
}

export function hintPatch(record: LabRecord): { hints: number } {
  const taken = typeof record.hints === 'number' ? record.hints : 0;
  return { hints: Math.min(HINT_LIMIT, taken + 1) };
}

export function predictionPatch(
  exercise: Pick<Exercise, 'prediction'>,
  answer: number,
): { prediction: number; predictionCorrect?: true } {
  return answer === exercise.prediction.answer
    ? { prediction: answer, predictionCorrect: true }
    : { prediction: answer };
}

export function revealSolutionPatch(): { solutionSeen: true; assisted: true } {
  return { solutionSeen: true, assisted: true };
}

export function loadSolutionPatch(exercise: Pick<Exercise, 'solution'>): {
  draft: string;
  assisted: true;
} {
  return { draft: exercise.solution, assisted: true };
}

export function restoreStarterPatch(exercise: Pick<Exercise, 'starter'>): { draft: string } {
  return { draft: exercise.starter };
}

export function selfAssessmentPatch(
  confidence: Confidence,
  now: number,
): { confidence: Confidence; reviewedAt: number; reviewAt: number } {
  return { confidence, reviewedAt: now, reviewAt: now + CONFIDENCE_DAYS[confidence] * DAY_MS };
}

export function attemptPatch(record: LabRecord): { attempts: number } {
  const attempts = typeof record.attempts === 'number' ? record.attempts : 0;
  return { attempts: attempts + 1 };
}

export function passedRunPatch(
  record: LabRecord,
  now: number,
): { solvedAt: number; reviewAt?: number } {
  const solvedAt = (record.solvedAt as number | undefined) || now;
  return record.reviewAt ? { solvedAt } : { solvedAt, reviewAt: now + DAY_MS };
}
```

`frontend/src/entities/exercise/model/review-state.ts`:

```ts
import { diagnose, type Diagnosis } from './diagnose';
import type { LabResultV1 } from './lab-result';
import type { LabRecord } from './merge-record';
import { isResultCurrent, isReviewComplete } from './selectors';
import type { Exercise } from './types';

export type ReviewState =
  | { kind: 'running' }
  | { kind: 'unrun' }
  | { kind: 'stale' }
  | { kind: 'transport-failure'; message: string }
  | { kind: 'passed'; passedCount: number }
  | { kind: 'partial'; passedCount: number; failure: string }
  | { kind: 'error'; diagnosis: Diagnosis };

type ReviewedExercise = Pick<Exercise, 'language' | 'starter' | 'tests' | 'review'>;

function firstFailure(exercise: ReviewedExercise, result: LabResultV1): string {
  const failing = exercise.tests.find(
    (test) => !result.tests.find((outcome) => outcome.id === test.id)?.passed,
  );
  return failing?.failure || exercise.review.pitfall;
}

function finishedState(exercise: ReviewedExercise, result: LabResultV1): ReviewState {
  const passedCount = result.tests.filter((test) => test.passed).length;
  if (isReviewComplete(exercise, result)) return { kind: 'passed', passedCount };
  if (result.success)
    return { kind: 'partial', passedCount, failure: firstFailure(exercise, result) };
  return { kind: 'error', diagnosis: diagnose(result.stderr, exercise.language) };
}

export function reviewStateOf(
  exercise: ReviewedExercise,
  record: LabRecord,
  running: boolean,
): ReviewState {
  if (running) return { kind: 'running' };
  const result = record.result as LabResultV1 | undefined;
  if (!result) return { kind: 'unrun' };
  if (!isResultCurrent(exercise, record)) return { kind: 'stale' };
  if (result.transportError) return { kind: 'transport-failure', message: result.stderr };
  return finishedState(exercise, result);
}
```

```diff
--- a/frontend/src/entities/exercise/model/run-outcome.ts
+++ b/frontend/src/entities/exercise/model/run-outcome.ts
@@ -34,7 +34,7 @@

 const MARKER_PATTERN = /^__TALLER_TEST__(\w+):(PASS|FAIL)\s*$/gm;

-function readMarkers(stdout: string): Map<string, boolean> {
+export function readTestMarkers(stdout: string): ReadonlyMap<string, boolean> {
   const markers = new Map<string, boolean>();
   for (const match of stdout.matchAll(MARKER_PATTERN)) {
     const [, id, outcome] = match;
@@ -48,7 +48,7 @@
   runnerResult: RunnerResult,
   { code, customTest, now }: RunContext,
 ): RunOutcome {
-  const markers = readMarkers(String(runnerResult.stdout || ''));
+  const markers = readTestMarkers(String(runnerResult.stdout || ''));
   const tests = exercise.tests.map((test) => ({
     id: test.id,
     passed: markers.get(test.id) === true,
```

```diff
--- a/frontend/src/entities/exercise/index.ts
+++ b/frontend/src/entities/exercise/index.ts
@@ -1,5 +1,37 @@
 export { hasPassingEvidence, testPassed } from './model/passing-evidence';
-export { interpretRun } from './model/run-outcome';
+export { interpretRun, readTestMarkers } from './model/run-outcome';
+export { diagnose } from './model/diagnose';
+export type { Diagnosis } from './model/diagnose';
+export { liveHint } from './model/live-hint';
+export {
+  draftOf,
+  isDueForReview,
+  isReflectionSolved,
+  isResultCurrent,
+  isReviewComplete,
+  isSolved,
+  levelOf,
+  normalizeCustomTest,
+  practicePointsOf,
+} from './model/selectors';
+export {
+  CONFIDENCE_DAYS,
+  DAY_MS,
+  HINT_LIMIT,
+  attemptPatch,
+  ensureRecord,
+  hintPatch,
+  loadSolutionPatch,
+  passedRunPatch,
+  predictionPatch,
+  restoreStarterPatch,
+  revealSolutionPatch,
+  selfAssessmentPatch,
+} from './model/record-rules';
+export type { Confidence } from './model/record-rules';
+export { reviewStateOf } from './model/review-state';
+export type { ReviewState } from './model/review-state';
+export type { LabResultV1, LabTestOutcome } from './model/lab-result';
 export { syncAfterRun } from './model/sync-after-run';
 export { mergeRecord } from './model/merge-record';
 export { buildProgram } from './model/build-program';
```

- **Pasos:**
  1. Implementá.
  2. Corré `npm run test:unit -- entities/exercise`: todo en verde.
  3. Corré `node qa/exercise-evidence-check.ts`: igual que en la base, porque `interpretRun` no cambia.
  4. Corré `npm run typecheck`, `npm run lint` (ningún aviso nuevo) y `npm run format:check`.
  5. Commit: `refactor(front): el diagnóstico, la pista en vivo, los selectores, los parches y el revisor viven en entities/exercise`.
- **Vuelta atrás:** revertí el commit; nadie las usa todavía.

### Tarea 2.3 · Los selectores del mapa (T010, R)

- **Crea:** `frontend/src/pages/lab/model/map-selectors.ts`, su spec y `frontend/src/pages/lab/index.ts`.
- **Dos commits:**
  1. el stub (las cuatro funciones lanzando `not implemented`), el índice y la spec, que falla: `test(front): specs de los selectores del mapa del laboratorio (rojas)`;
  2. la implementación, con la spec en verde: `refactor(front): los selectores del mapa viven en pages/lab/model`.

`frontend/src/pages/lab/model/map-selectors.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../../../entities/exercise';
import {
  isExtraChallenge,
  matchesMapFilters,
  surprisePool,
  todayChallenge,
  type MapFilters,
} from './map-selectors';

const NOW = 5000;

function exercise(id: string, stage: number, title = id, level?: Exercise['level']): Exercise {
  return { id, stage, level, title, topic: 'Tema', intro: '', why: '' } as unknown as Exercise;
}

const FIRST = exercise('r-1', 1, 'Energía del reactor');
const SOLVED = exercise('r-2', 2, 'Contador inmutable');
const DUE = exercise('r-3', 9, 'Préstamos');
const EXTRA = exercise('r-4', 16, 'Un clásico');
const EXERCISES = [FIRST, SOLVED, DUE, EXTRA];
const RECORDS = {
  'r-1': { solvedAt: 10, reviewAt: 9000 },
  'r-2': { solvedAt: 10, reviewAt: 9000 },
  'r-3': { solvedAt: 10, reviewAt: 4000 },
};
const NO_FILTERS: MapFilters = { query: '', dueOnly: false, extraOnly: false, level: 'all' };

describe('isExtraChallenge', () => {
  it('«Clásicos y sistemas» are the stages 16 to 20', () => {
    expect([15, 16, 20, 21].map((stage) => isExtraChallenge({ stage }))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});

describe('matchesMapFilters', () => {
  const visible = (filters: Partial<MapFilters>) =>
    EXERCISES.filter((item) =>
      matchesMapFilters(item, RECORDS, { ...NO_FILTERS, ...filters }, NOW),
    ).map((item) => item.id);

  it('without filters, everything is visible', () => {
    expect(visible({})).toEqual(['r-1', 'r-2', 'r-3', 'r-4']);
  });

  it('«Repasar pendientes» keeps what is due', () => {
    expect(visible({ dueOnly: true })).toEqual(['r-3']);
  });

  it('a level keeps its stages, or the level of the exercise', () => {
    expect(visible({ level: 'beginner' })).toEqual(['r-1', 'r-2']);
    expect(visible({ level: 'advanced' })).toEqual(['r-3']);
  });

  it('the search ignores case and accents', () => {
    expect(visible({ query: 'ENERGIA' })).toEqual(['r-1']);
    expect(visible({ query: 'prestamos' })).toEqual(['r-3']);
  });

  it('«Clásicos y sistemas» keeps the stages 16 to 20', () => {
    expect(visible({ extraOnly: true })).toEqual(['r-4']);
  });
});

describe('todayChallenge', () => {
  it('is the first unsolved one of the level and «Clásicos y sistemas», ignoring the search', () => {
    expect(todayChallenge(EXERCISES, RECORDS, NO_FILTERS, NOW)?.id).toBe('r-4');
  });

  it('when everything is solved, it is the first due one, and else the first one', () => {
    const allSolved = { ...RECORDS, 'r-4': { solvedAt: 10, reviewAt: 9000 } };
    expect(todayChallenge(EXERCISES, allSolved, NO_FILTERS, NOW)?.id).toBe('r-3');
    const nothingDue = { ...allSolved, 'r-3': { solvedAt: 10, reviewAt: 9000 } };
    expect(todayChallenge(EXERCISES, nothingDue, NO_FILTERS, NOW)?.id).toBe('r-1');
  });

  it('with no candidate in the filters, it is the first exercise of the language', () => {
    expect(
      todayChallenge([FIRST, SOLVED], RECORDS, { level: 'expert', extraOnly: false }, NOW)?.id,
    ).toBe('r-1');
  });
});

describe('surprisePool', () => {
  it('prefers the due and the unsolved ones among the filtered', () => {
    expect(surprisePool(EXERCISES, RECORDS, NO_FILTERS, NOW).map((item) => item.id)).toEqual([
      'r-3',
      'r-4',
    ]);
  });

  it('falls back to every filtered one when none is pending', () => {
    expect(
      surprisePool(EXERCISES, RECORDS, { ...NO_FILTERS, level: 'beginner' }, NOW).map(
        (item) => item.id,
      ),
    ).toEqual(['r-1', 'r-2']);
  });

  it('is empty when the filters leave nothing', () => {
    expect(surprisePool(EXERCISES, RECORDS, { ...NO_FILTERS, query: 'zzz' }, NOW)).toEqual([]);
  });
});
```

`frontend/src/pages/lab/model/map-selectors.ts`:

```ts
import {
  isDueForReview,
  isSolved,
  levelOf,
  type Exercise,
  type LabRecord,
} from '../../../entities/exercise';
import type { LevelId } from '../../../shared/config/levels';
import { normalizeSearchText } from '../../../shared/lib/normalize-search-text';

export type LevelFilter = LevelId | 'all';

export interface MapFilters {
  query: string;
  dueOnly: boolean;
  extraOnly: boolean;
  level: LevelFilter;
}

export type LabRecords = Readonly<Record<string, LabRecord>>;

const EXTRA_FIRST_STAGE = 16;
const EXTRA_LAST_STAGE = 20;

export function isExtraChallenge(exercise: Pick<Exercise, 'stage'>): boolean {
  return exercise.stage >= EXTRA_FIRST_STAGE && exercise.stage <= EXTRA_LAST_STAGE;
}

function matchesLevelAndExtras(
  exercise: Exercise,
  filters: Pick<MapFilters, 'level' | 'extraOnly'>,
): boolean {
  if (filters.extraOnly && !isExtraChallenge(exercise)) return false;
  return filters.level === 'all' || levelOf(exercise) === filters.level;
}

function matchesQuery(exercise: Exercise, query: string): boolean {
  if (!query) return true;
  const text = [exercise.title, exercise.topic, exercise.intro, exercise.why].join(' ');
  return normalizeSearchText(text).includes(normalizeSearchText(query));
}

export function matchesMapFilters(
  exercise: Exercise,
  records: LabRecords,
  filters: MapFilters,
  now: number,
): boolean {
  if (filters.dueOnly && !isDueForReview(records[exercise.id], now)) return false;
  return matchesLevelAndExtras(exercise, filters) && matchesQuery(exercise, filters.query);
}

export function todayChallenge(
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: Pick<MapFilters, 'level' | 'extraOnly'>,
  now: number,
): Exercise | undefined {
  const candidates = exercises.filter((exercise) => matchesLevelAndExtras(exercise, filters));
  return (
    candidates.find((exercise) => !isSolved(records[exercise.id])) ||
    candidates.find((exercise) => isDueForReview(records[exercise.id], now)) ||
    candidates[0] ||
    exercises[0]
  );
}

export function surprisePool(
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: MapFilters,
  now: number,
): Exercise[] {
  const candidates = exercises.filter((exercise) =>
    matchesMapFilters(exercise, records, filters, now),
  );
  const pending = candidates.filter(
    (exercise) => isDueForReview(records[exercise.id], now) || !isSolved(records[exercise.id]),
  );
  return pending.length ? pending : candidates;
}
```

`frontend/src/pages/lab/index.ts`:

```ts
export {
  isExtraChallenge,
  matchesMapFilters,
  surprisePool,
  todayChallenge,
} from './model/map-selectors';
export type { LabRecords, LevelFilter, MapFilters } from './model/map-selectors';
```

- **Pasos:**
  1. Corré `npm run test:unit -- pages/lab`: con el stub fallan las 12 con `not implemented`; con la implementación pasan las 12.
  2. Corré `npm run typecheck` y `npm run lint`.
  3. Si `npm run lint` avisa por la API pública sin consumidor, no aplica: `lab.js` la consume en T013.
- **Compuerta de U2:** §0.2.
- **Vuelta atrás:** revertí los dos commits.

## 3. Unidad 3 · `features/run-exercise` (dueño F, onda 2)

**Cubre:** FR-043 a FR-052, la parte de modelo de FR-062 y la de la feature de FR-015 (su aislamiento); US6; SC-006.

**Entrega:** la feature con su puerto, su estado, su orquestación, el armado del `result` y el adaptador de los Playgrounds, con el contrato de [contracts/run-exercise.md](./contracts/run-exercise.md). `lab.js` todavía no la usa.

### Tarea 3.1 · El contrato y las specs, en rojo (T011, F)

- **Parte de:** la rama con T009.
- **Crea:**
  - `model/transport.ts` y `model/run-state.ts`, completos (son tipos y una constante);
  - `model/build-run-result.ts`, `model/create-exercise-runner.ts` y `api/playground-transport.ts`, con sus firmas y cuerpos `throw new Error('not implemented')`. En `create-exercise-runner.ts` las constantes de los avisos van completas;
  - `index.ts`, completo;
  - las cuatro specs: la del runner, la del armado, la del adaptador y `index.spec.ts`.

  Todo bajo `frontend/src/features/run-exercise/`.

`frontend/src/features/run-exercise/model/transport.ts`:

```ts
import type { ExerciseLanguage } from '../../../entities/exercise';

export interface RunnableExercise {
  readonly id: string;
  readonly language: ExerciseLanguage;
  readonly tests: readonly { readonly id: string; readonly expression: string }[];
  readonly imports?: readonly string[];
}

export interface RunRequest {
  readonly exercise: RunnableExercise;
  readonly draft: string;
  readonly customTest: string;
  readonly signal: AbortSignal;
}

export interface ExecutedVerdict {
  readonly kind: 'executed';
  readonly success: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly tests: ReadonlyMap<string, boolean>;
  readonly customPassed: boolean;
  readonly attemptId?: number;
}

export interface TransportFailureVerdict {
  readonly kind: 'transport-failure';
  readonly message: string;
  readonly attemptId?: number;
}

export type RunVerdict = ExecutedVerdict | TransportFailureVerdict;

export type ReportProgress<Progress> = (progress: Progress) => void;

export interface ExerciseTransport<Progress = never> {
  readonly countsLocalAttempts: boolean;
  run(request: RunRequest, report: ReportProgress<Progress>): Promise<RunVerdict>;
}

export type ProgramBuilder = (
  exercise: RunnableExercise,
  draft: string,
  customTest: string,
) => string;
```

`frontend/src/features/run-exercise/model/run-state.ts`:

```ts
export interface IdleRun {
  readonly status: 'idle';
}

export interface ActiveRun<Progress> {
  readonly status: 'running';
  readonly exerciseId: string;
  readonly progress: Progress | null;
}

export type RunState<Progress = never> = IdleRun | ActiveRun<Progress>;

export const IDLE_RUN: IdleRun = Object.freeze({ status: 'idle' });
```

`frontend/src/features/run-exercise/index.ts`:

```ts
export { createPlaygroundTransport, buildPlaygroundProgram } from './api/playground-transport';
export type { RunCode } from './api/playground-transport';
export { buildRunResult } from './model/build-run-result';
export { createExerciseRunner } from './model/create-exercise-runner';
export type {
  ExerciseRunner,
  ExerciseRunnerDependencies,
  RunnerStore,
} from './model/create-exercise-runner';
export { IDLE_RUN } from './model/run-state';
export type { ActiveRun, IdleRun, RunState } from './model/run-state';
export type {
  ExecutedVerdict,
  ExerciseTransport,
  ProgramBuilder,
  ReportProgress,
  RunnableExercise,
  RunRequest,
  RunVerdict,
  TransportFailureVerdict,
} from './model/transport';
```

`frontend/src/features/run-exercise/model/create-exercise-runner.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Exercise, LabResultV1, LabStateV1 } from '../../../entities/exercise';
import { createExerciseRunner, type ExerciseRunnerDependencies } from './create-exercise-runner';
import type { ExerciseTransport, RunRequest, RunVerdict } from './transport';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const DAY = 86400000;

const EXERCISE = {
  id: 'rust-01',
  language: 'rust',
  starter: 'fn energia(celdas: i32) -> i32 {\n    todo!()\n}',
  tests: [
    { id: 't1', expression: 'energia(3) == 21' },
    { id: 't2', expression: 'energia(0) == 0' },
  ],
  imports: [],
} as unknown as Exercise;

const PASSED: RunVerdict = {
  kind: 'executed',
  success: true,
  stdout: '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:PASS\n',
  stderr: '',
  tests: new Map([
    ['t1', true],
    ['t2', true],
  ]),
  customPassed: false,
};

const FAILED: RunVerdict = {
  kind: 'executed',
  success: true,
  stdout: '',
  stderr: '',
  tests: new Map([
    ['t1', true],
    ['t2', false],
  ]),
  customPassed: false,
};

const COMPILE_ERROR: RunVerdict = {
  kind: 'executed',
  success: false,
  stdout: '',
  stderr: 'error[E0384]: cannot assign twice to immutable variable',
  tests: new Map(),
  customPassed: false,
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

interface Harness {
  progress: LabStateV1;
  saved: string[];
  notices: string[];
  errors: unknown[];
  requests: RunRequest[];
  events: string[];
  dependencies: ExerciseRunnerDependencies<unknown>;
}

function harness(
  transport: (request: RunRequest, report: (progress: unknown) => void) => Promise<RunVerdict>,
  overrides: Partial<ExerciseRunnerDependencies<unknown>> & { countsLocalAttempts?: boolean } = {},
): Harness {
  const progress: LabStateV1 = { version: 1, records: {}, selected: { rust: null, go: null } };
  const result: Harness = {
    progress,
    saved: [],
    notices: [],
    errors: [],
    requests: [],
    events: [],
    dependencies: undefined as unknown as ExerciseRunnerDependencies<unknown>,
  };
  const port: ExerciseTransport<unknown> = {
    countsLocalAttempts: overrides.countsLocalAttempts ?? true,
    run(request, report) {
      result.requests.push(request);
      result.events.push('transport');
      return transport(request, report);
    },
  };
  result.dependencies = {
    store: {
      getProgress: () => progress,
      save: () => {
        result.saved.push(JSON.stringify(progress.records));
        result.events.push('save');
        return true;
      },
    },
    transport: port,
    now: () => NOW,
    notify: (message) => {
      result.notices.push(message);
      result.events.push(`notify ${message}`);
    },
    isLocked: () => false,
    isCampaignMission: () => false,
    syncSystems: () => void result.events.push('sync systems'),
    syncCampaign: () => {
      result.events.push('sync campaign');
      return undefined;
    },
    logError: (error) => void result.errors.push(error),
    ...overrides,
  };
  return result;
}

describe('createExerciseRunner: what it refuses', () => {
  it('refuses a locked mission with its notice, without saving nor sending', async () => {
    const test = harness(async () => PASSED, { isLocked: () => true });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices).toEqual(['Completá los requisitos de esta misión en tu campaña.']);
    expect(test.saved).toEqual([]);
    expect(test.requests).toEqual([]);
  });

  it('refuses a blank draft without counting an attempt', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = { draft: ' \n\t ' };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices).toEqual(['Escribí una solución o restaurá el inicio.']);
    expect(test.progress.records['rust-01']).toEqual({ draft: ' \n\t ' });
    expect(test.requests).toEqual([]);
  });

  it('refuses a second run while one is active: one request', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const first = runner.run(EXERCISE);
    await runner.run(EXERCISE);
    pending.resolve(PASSED);
    await first;
    expect(test.requests).toHaveLength(1);
  });
});

describe('createExerciseRunner: the port', () => {
  it('sends the exercise, the draft as is, the trimmed custom test and a signal, never a program', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = {
      draft: '  fn x() {}  ',
      customTest: '  energia(1) == 7\n',
    };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    const [request] = test.requests;
    expect(Object.keys(request).sort()).toEqual(['customTest', 'draft', 'exercise', 'signal']);
    expect(request.exercise).toBe(EXERCISE);
    expect(request.draft).toBe('  fn x() {}  ');
    expect(request.customTest).toBe('energia(1) == 7');
    expect(request.signal.aborted).toBe(false);
  });

  it('sends no custom test when the field holds only spaces, a tab or a no-break space', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = { customTest: ' \t  ' };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.requests[0].customTest).toBe('');
  });

  it('counts and saves the attempt before sending, when the adapter says so', async () => {
    const test = harness(async () => PASSED);
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.events.slice(0, 2)).toEqual(['save', 'transport']);
    expect(JSON.parse(test.saved[0])['rust-01']).toEqual({ attempts: 1 });
  });

  it('leaves attempts alone when the adapter does not count them', async () => {
    const test = harness(async () => ({ ...PASSED, attemptId: 41 }), {
      countsLocalAttempts: false,
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].attempts).toBeUndefined();
    expect(test.events[0]).toBe('transport');
  });
});

describe('createExerciseRunner: an adapter that builds no program and counts no attempt', () => {
  it('runs the whole cycle: approved, partial, error and transport failure', async () => {
    const verdicts: RunVerdict[] = [
      PASSED,
      FAILED,
      COMPILE_ERROR,
      { kind: 'transport-failure', message: 'Sin red.' },
    ];
    const test = harness(async () => verdicts.shift()!, { countsLocalAttempts: false });
    const runner = createExerciseRunner(test.dependencies);
    const outcomes: unknown[] = [];
    for (let run = 0; run < 4; run++) {
      await runner.run(EXERCISE);
      const result = test.progress.records['rust-01'].result as LabResultV1;
      outcomes.push([result.success, result.transportError, result.tests.map((t) => t.passed)]);
    }
    expect(outcomes).toEqual([
      [true, false, [true, true]],
      [true, false, [true, false]],
      [false, false, [false, false]],
      [false, true, [false, false]],
    ]);
    expect(test.progress.records['rust-01']).toMatchObject({ solvedAt: NOW, reviewAt: NOW + DAY });
    expect(test.progress.records['rust-01'].attempts).toBeUndefined();
    expect(test.requests.every((request) => !('program' in request))).toBe(true);
  });
});

describe('createExerciseRunner: the result', () => {
  it('a first approval saves the result, solvedAt, the review in a day and announces it', async () => {
    const test = harness(async () => PASSED);
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01']).toEqual({
      attempts: 1,
      result: {
        code: 'fn energia(celdas: i32) -> i32 {\n    todo!()\n}',
        success: true,
        stdout: '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:PASS\n',
        stderr: '',
        transportError: false,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: true },
        ],
        time: NOW,
        customTest: '',
        customPassed: false,
      },
      solvedAt: NOW,
      reviewAt: NOW + DAY,
    });
    expect(test.notices).toEqual([
      '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.',
    ]);
  });

  it('an approval after the first keeps solvedAt and reviewAt and says it still works', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = { solvedAt: 100, reviewAt: 200 };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01']).toMatchObject({ solvedAt: 100, reviewAt: 200 });
    expect(test.notices).toEqual(['Estos casos siguen funcionando. Probá una variante.']);
  });

  it('a failing result after an approval does not erase it (F7-Q1)', async () => {
    const test = harness(async () => FAILED);
    test.progress.records['rust-01'] = { solvedAt: 100, reviewAt: 200 };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01']).toMatchObject({ solvedAt: 100, reviewAt: 200 });
    expect(test.notices).toEqual([]);
  });

  it('a transport failure saves a result that neither approves nor fails, and syncs', async () => {
    const test = harness(async () => ({ kind: 'transport-failure', message: 'Sin red.' }));
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toMatchObject({
      success: false,
      stdout: '',
      stderr: 'Sin red.',
      transportError: true,
      tests: [
        { id: 't1', passed: false },
        { id: 't2', passed: false },
      ],
    });
    expect(test.events).toContain('sync systems');
  });

  it('an adapter that throws saves a transport result with its message, without syncing', async () => {
    const test = harness(async () => {
      throw new Error('falló el adaptador');
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toMatchObject({
      stderr: 'falló el adaptador',
      transportError: true,
    });
    expect(test.events).not.toContain('sync systems');
  });

  it('an adapter that throws without a message saves the fallback text', async () => {
    const test = harness(() => Promise.reject(new Error('')));
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toMatchObject({
      stderr: 'No se pudo conectar al compilador.',
    });
  });

  it('an AbortError from the adapter saves nothing', async () => {
    const test = harness(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toBeUndefined();
  });

  it('keeps the attempt id of the verdict only when there is one', async () => {
    const withId = harness(async () => ({ ...PASSED, attemptId: 41 }));
    await createExerciseRunner(withId.dependencies).run(EXERCISE);
    expect(withId.progress.records['rust-01'].result).toMatchObject({ attemptId: 41 });
    const without = harness(async () => PASSED);
    await createExerciseRunner(without.dependencies).run(EXERCISE);
    expect(without.progress.records['rust-01'].result).not.toHaveProperty('attemptId');
  });

  it('writes the result on the record it reads after waiting, so a replaced state keeps it', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    test.progress.records = { 'rust-02': { solvedAt: 5 } };
    pending.resolve(PASSED);
    await running;
    expect(Object.keys(test.progress.records)).toEqual(['rust-02', 'rust-01']);
    expect(test.progress.records['rust-01'].solvedAt).toBe(NOW);
  });
});

describe('createExerciseRunner: campaign and Systems', () => {
  it('syncs Systems and then the campaign after saving, and announces XP in a mission', async () => {
    const test = harness(async () => PASSED, {
      isCampaignMission: (exercise) => exercise.id === 'rust-01',
      syncCampaign: () => ({ xpGained: 20 }),
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices.at(-1)).toBe('+20 XP. Tu progreso de campaña está actualizado.');
    expect(test.events.indexOf('sync systems')).toBeGreaterThan(test.events.lastIndexOf('save'));
  });

  it('a failing sync is reported once and the result stays saved', async () => {
    const test = harness(async () => PASSED, {
      syncCampaign: () => {
        throw new Error('campaña caída');
      },
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices.at(-1)).toBe(
      'No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.',
    );
    expect(test.errors).toHaveLength(1);
    expect(test.progress.records['rust-01'].result).toBeDefined();
  });
});

describe('createExerciseRunner: the state and the cancellation', () => {
  it('goes running and back to idle after saving, notifying and syncing', async () => {
    const test = harness(async () => PASSED);
    const runner = createExerciseRunner(test.dependencies);
    runner.state.subscribe((state) => test.events.push(`state ${state.status}`));
    await runner.run(EXERCISE);
    expect(test.events).toEqual([
      'save',
      'state running',
      'transport',
      'notify ¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.',
      'save',
      'sync systems',
      'sync campaign',
      'state idle',
    ]);
  });

  it('exposes what the adapter reports without reading it', async () => {
    const pending = deferred<RunVerdict>();
    let report: (progress: unknown) => void = () => undefined;
    const test = harness((_request, reportProgress) => {
      report = reportProgress;
      return pending.promise;
    });
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    expect(runner.state.getState()).toEqual({
      status: 'running',
      exerciseId: 'rust-01',
      progress: null,
    });
    report({ phase: 'queued', position: 3 });
    expect(runner.state.getState()).toEqual({
      status: 'running',
      exerciseId: 'rust-01',
      progress: { phase: 'queued', position: 3 },
    });
    pending.resolve(PASSED);
    await running;
    expect(runner.state.getState()).toEqual({ status: 'idle' });
  });

  it('cancel aborts the signal, goes idle at once, says so and discards the late result', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    runner.cancel();
    expect(test.requests[0].signal.aborted).toBe(true);
    expect(runner.state.getState()).toEqual({ status: 'idle' });
    expect(test.notices).toEqual(['Ejecución cancelada. Tu código sigue guardado.']);
    pending.resolve(PASSED);
    await running;
    expect(test.progress.records['rust-01']).toEqual({ attempts: 1 });
  });

  it('abort is silent and discards the late result too', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    runner.abort();
    pending.resolve(PASSED);
    await running;
    expect(test.notices).toEqual([]);
    expect(test.progress.records['rust-01'].result).toBeUndefined();
  });

  it('a run started right after a cancel is not overwritten by the late first result', async () => {
    const first = deferred<RunVerdict>();
    const second = deferred<RunVerdict>();
    const replies = [first.promise, second.promise];
    const test = harness(() => replies.shift()!);
    const runner = createExerciseRunner(test.dependencies);
    const firstRun = runner.run(EXERCISE);
    runner.cancel();
    const secondRun = runner.run(EXERCISE);
    first.resolve(PASSED);
    await firstRun;
    expect(runner.state.getState().status).toBe('running');
    expect(test.progress.records['rust-01'].result).toBeUndefined();
    second.resolve(FAILED);
    await secondRun;
    expect(test.progress.records['rust-01'].result).toMatchObject({
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
      ],
    });
    expect(test.progress.records['rust-01'].attempts).toBe(2);
  });
});
```

`frontend/src/features/run-exercise/model/build-run-result.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { interpretRun } from '../../../entities/exercise';
import { buildRunResult } from './build-run-result';
import type { RunVerdict } from './transport';

const EXERCISE = { tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] };
const CONTEXT = { code: 'fn energia() {}', customTest: 'energia(1) == 7', now: 1700 };

describe('buildRunResult', () => {
  it('builds the v1 result of an executed run, in the stored key order', () => {
    const verdict: RunVerdict = {
      kind: 'executed',
      success: true,
      stdout: 'out',
      stderr: 'err',
      tests: new Map([
        ['t1', true],
        ['t3', true],
        ['extra', true],
      ]),
      customPassed: true,
    };
    const result = buildRunResult(EXERCISE, verdict, CONTEXT);
    expect(Object.keys(result)).toEqual([
      'code',
      'success',
      'stdout',
      'stderr',
      'transportError',
      'tests',
      'time',
      'customTest',
      'customPassed',
    ]);
    expect(result).toEqual({
      code: 'fn energia() {}',
      success: true,
      stdout: 'out',
      stderr: 'err',
      transportError: false,
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
        { id: 't3', passed: true },
      ],
      time: 1700,
      customTest: 'energia(1) == 7',
      customPassed: true,
    });
  });

  it('trims the output once, to 12 000 and 18 000 characters', () => {
    const verdict: RunVerdict = {
      kind: 'executed',
      success: false,
      stdout: 'a'.repeat(12001),
      stderr: 'b'.repeat(18001),
      tests: new Map(),
      customPassed: false,
    };
    const result = buildRunResult(EXERCISE, verdict, CONTEXT);
    expect(result.stdout).toHaveLength(12000);
    expect(result.stderr).toHaveLength(18000);
  });

  it('builds a transport failure that neither approves nor fails a test', () => {
    const verdict: RunVerdict = { kind: 'transport-failure', message: 'Sin red.', attemptId: 9 };
    expect(buildRunResult(EXERCISE, verdict, CONTEXT)).toEqual({
      code: 'fn energia() {}',
      success: false,
      stdout: '',
      stderr: 'Sin red.',
      transportError: true,
      tests: [
        { id: 't1', passed: false },
        { id: 't2', passed: false },
        { id: 't3', passed: false },
      ],
      time: 1700,
      customTest: 'energia(1) == 7',
      customPassed: false,
      attemptId: 9,
    });
  });

  it('gives, for the four results of F1, the same result as interpretRun did', () => {
    const markers = '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:FAIL\n__TALLER_TEST__t3:PASS\n';
    const cases: { runner: Record<string, unknown>; verdict: RunVerdict }[] = [
      {
        runner: { success: true, stdout: markers, stderr: '' },
        verdict: {
          kind: 'executed',
          success: true,
          stdout: markers,
          stderr: '',
          tests: new Map([
            ['t1', true],
            ['t2', false],
            ['t3', true],
          ]),
          customPassed: false,
        },
      },
      {
        runner: { success: false, stdout: '', stderr: 'error[E0384]' },
        verdict: {
          kind: 'executed',
          success: false,
          stdout: '',
          stderr: 'error[E0384]',
          tests: new Map(),
          customPassed: false,
        },
      },
      {
        runner: { success: false, stdout: '', stderr: '', error: 'Sin red.' },
        verdict: { kind: 'transport-failure', message: 'Sin red.' },
      },
    ];
    for (const { runner, verdict } of cases)
      expect(buildRunResult(EXERCISE, verdict, CONTEXT)).toEqual(
        interpretRun(EXERCISE, runner, CONTEXT).result,
      );
  });
});
```

`frontend/src/features/run-exercise/api/playground-transport.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RunInput, RunResult } from '../../../shared/api/playground';
import type { RunnableExercise } from '../model/transport';
import { buildPlaygroundProgram, createPlaygroundTransport } from './playground-transport';

const EXERCISE: RunnableExercise = {
  id: 'rust-01',
  language: 'rust',
  tests: [
    { id: 't1', expression: 'energia(3) == 21' },
    { id: 't2', expression: 'energia(0) == 0' },
  ],
  imports: [],
};

function transportReplying(result: RunResult) {
  const inputs: RunInput[] = [];
  const transport = createPlaygroundTransport(async (input) => {
    inputs.push(input);
    return result;
  });
  return { transport, inputs };
}

const signal = new AbortController().signal;
const ignoreProgress = () => undefined;

describe('createPlaygroundTransport', () => {
  it('counts local attempts, as the lab always did', () => {
    expect(
      createPlaygroundTransport(async () => ({ success: true }) as RunResult).countsLocalAttempts,
    ).toBe(true);
  });

  it('sends the program built with the custom test, in the language of the exercise, with the signal', async () => {
    const { transport, inputs } = transportReplying({
      success: true,
      stdout: '',
      stderr: '',
      exitDetail: '',
      service: 'Rust Playground',
    });
    await transport.run(
      { exercise: EXERCISE, draft: 'fn energia() {}', customTest: 'energia(1) == 7', signal },
      ignoreProgress,
    );
    expect(inputs).toEqual([
      {
        language: 'rust',
        code: buildPlaygroundProgram(EXERCISE, 'fn energia() {}', 'energia(1) == 7'),
        signal,
      },
    ]);
    expect(inputs[0].code).toContain(
      'std::panic::catch_unwind(|| { energia(1) == 7 }).unwrap_or(false);',
    );
    expect(inputs[0].code).toContain('println!("__TALLER_TEST__custom:{}"');
  });

  it('reads the markers into a verdict, without trimming the output', async () => {
    const stdout = '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:FAIL\n__TALLER_TEST__custom:PASS\n';
    const { transport } = transportReplying({
      success: true,
      stdout: stdout + 'x'.repeat(13000),
      stderr: 'warning',
      exitDetail: '',
      service: 'Rust Playground',
    });
    const verdict = await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      ignoreProgress,
    );
    expect(verdict).toEqual({
      kind: 'executed',
      success: true,
      stdout: stdout + 'x'.repeat(13000),
      stderr: 'warning',
      tests: new Map([
        ['t1', true],
        ['t2', false],
      ]),
      customPassed: true,
    });
  });

  it('a repeated marker does not pass, as interpretRun decides', async () => {
    const { transport } = transportReplying({
      success: true,
      stdout: '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:PASS\n',
      stderr: '',
      exitDetail: '',
      service: 'Rust Playground',
    });
    const verdict = await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      ignoreProgress,
    );
    expect(verdict.kind === 'executed' && [...verdict.tests]).toEqual([
      ['t1', false],
      ['t2', true],
    ]);
  });

  it('a Playground failure is a transport failure with its message', async () => {
    const { transport } = transportReplying({
      success: false,
      stdout: '',
      stderr: '',
      error: 'No se pudo conectar al Playground.',
      errorType: 'network',
    });
    const verdict = await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      ignoreProgress,
    );
    expect(verdict).toEqual({
      kind: 'transport-failure',
      message: 'No se pudo conectar al Playground.',
    });
  });

  it('never reports progress', async () => {
    const reported: unknown[] = [];
    const { transport } = transportReplying({
      success: true,
      stdout: '',
      stderr: '',
      exitDetail: '',
      service: 'Rust Playground',
    });
    await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      (progress) => void reported.push(progress),
    );
    expect(reported).toEqual([]);
  });
});
```

`frontend/src/features/run-exercise/index.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const ENGINE_MODULES = [
  '../../entities/guide/model/route-store',
  '../../entities/campaign/model/create-campaign-engine',
  '../../entities/systems-workshop/model/create-systems-engine',
];

function failWhenAnEngineLoads(): void {
  vi.resetModules();
  for (const path of ENGINE_MODULES) {
    vi.doMock(path, () => {
      throw new Error(`${path} must not load`);
    });
  }
}

describe('the run-exercise feature', () => {
  afterEach(() => {
    for (const path of ENGINE_MODULES) vi.doUnmock(path);
    vi.resetModules();
  });

  it('loads without the campaign engine, the Systems engine or the route store', async () => {
    failWhenAnEngineLoads();

    await expect(import('.')).resolves.toHaveProperty('createExerciseRunner');
  });

  it('is isolated on purpose: the campaign index does load its engine', async () => {
    failWhenAnEngineLoads();

    await expect(import('../../entities/campaign')).rejects.toThrow('error when mocking');
  });
});
```

- **Pasos:**
  1. Corré `npm run test:unit -- features/run-exercise`: fallan con `not implemented` las del runner, del armado y del adaptador. Las dos de `index.spec.ts` pasan desde el principio, porque la feature ya no importa ningún motor: son las que la vigilan.
  2. Corré `npm run typecheck`.
  3. Commit: `test(front): specs de features/run-exercise con un transporte doble (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 3.2 · La feature (T012, F)

- **Cambia:** los tres módulos con stub.

`frontend/src/features/run-exercise/model/build-run-result.ts`:

```ts
import type { LabResultV1 } from '../../../entities/exercise';
import type { RunVerdict } from './transport';

const STDOUT_LIMIT = 12000;
const STDERR_LIMIT = 18000;

export interface RunContext {
  code: string;
  customTest: string;
  now: number;
}

export function buildRunResult(
  exercise: { readonly tests: readonly { readonly id: string }[] },
  verdict: RunVerdict,
  context: RunContext,
): LabResultV1 {
  const executed = verdict.kind === 'executed';
  const result: LabResultV1 = {
    code: context.code,
    success: executed && verdict.success,
    stdout: executed ? verdict.stdout.slice(0, STDOUT_LIMIT) : '',
    stderr: (executed ? verdict.stderr : verdict.message).slice(0, STDERR_LIMIT),
    transportError: !executed,
    tests: exercise.tests.map((test) => ({
      id: test.id,
      passed: executed && verdict.tests.get(test.id) === true,
    })),
    time: context.now,
    customTest: context.customTest,
    customPassed: executed && verdict.customPassed,
  };
  if (verdict.attemptId !== undefined) result.attemptId = verdict.attemptId;
  return result;
}
```

`frontend/src/features/run-exercise/model/create-exercise-runner.ts`:

```ts
import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  attemptPatch,
  draftOf,
  ensureRecord,
  hasPassingEvidence,
  normalizeCustomTest,
  passedRunPatch,
  syncAfterRun,
  type Exercise,
  type LabResultV1,
  type LabStateV1,
} from '../../../entities/exercise';
import { buildRunResult } from './build-run-result';
import { IDLE_RUN, type RunState } from './run-state';
import type { ExerciseTransport, RunVerdict } from './transport';

export const LOCKED_NOTICE = 'Completá los requisitos de esta misión en tu campaña.';
export const EMPTY_DRAFT_NOTICE = 'Escribí una solución o restaurá el inicio.';
export const CANCELLED_NOTICE = 'Ejecución cancelada. Tu código sigue guardado.';
export const FIRST_SOLVE_NOTICE =
  '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.';
export const SOLVED_AGAIN_NOTICE = 'Estos casos siguen funcionando. Probá una variante.';
export const TRANSPORT_FALLBACK = 'No se pudo conectar al compilador.';

export interface RunnerStore {
  getProgress(): LabStateV1;
  save(): boolean;
}

export interface ExerciseRunnerDependencies<Progress = never> {
  store: RunnerStore;
  transport: ExerciseTransport<Progress>;
  now: () => number;
  notify: (message: string) => void;
  isLocked: (exercise: Exercise) => boolean;
  isCampaignMission: (exercise: Exercise) => boolean;
  syncSystems: () => void;
  syncCampaign: () => { xpGained?: number } | undefined;
  logError: (error: unknown) => void;
}

export interface ExerciseRunner<Progress = never> {
  readonly state: StoreApi<RunState<Progress>>;
  run(exercise: Exercise): Promise<void>;
  cancel(): void;
  abort(): void;
}

interface ActiveExecution {
  readonly controller: AbortController;
}

function isAbortError(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'AbortError';
}

function thrownMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message !== '' ? message : TRANSPORT_FALLBACK;
}

export function createExerciseRunner<Progress = never>(
  dependencies: ExerciseRunnerDependencies<Progress>,
): ExerciseRunner<Progress> {
  const state = createStore<RunState<Progress>>(() => IDLE_RUN);
  let active: ActiveExecution | null = null;

  function becomeIdle(): void {
    if (state.getState() !== IDLE_RUN) state.setState(IDLE_RUN, true);
  }

  function stop(): void {
    active?.controller.abort();
    active = null;
    becomeIdle();
  }

  function finish(execution: ActiveExecution): void {
    if (active !== execution) return;
    active = null;
    becomeIdle();
  }

  function saveResult(exercise: Exercise, result: LabResultV1): boolean {
    const record = ensureRecord(dependencies.store.getProgress(), exercise.id);
    record.result = result;
    const solved = hasPassingEvidence(result, exercise.tests);
    if (solved) {
      const first = !record.solvedAt;
      Object.assign(record, passedRunPatch(record, result.time));
      dependencies.notify(first ? FIRST_SOLVE_NOTICE : SOLVED_AGAIN_NOTICE);
    }
    dependencies.store.save();
    return solved;
  }

  function syncDerivedProgress(exercise: Exercise): void {
    syncAfterRun({
      syncSystems: dependencies.syncSystems,
      syncCampaign: dependencies.syncCampaign,
      isCampaignMission: () => dependencies.isCampaignMission(exercise),
      notify: dependencies.notify,
      logError: dependencies.logError,
    });
  }

  async function execute(
    exercise: Exercise,
    draft: string,
    customTest: string,
    execution: ActiveExecution,
  ): Promise<void> {
    let verdict: RunVerdict;
    try {
      verdict = await dependencies.transport.run(
        { exercise, draft, customTest, signal: execution.controller.signal },
        (progress) => {
          if (active !== execution) return;
          state.setState({ status: 'running', exerciseId: exercise.id, progress }, true);
        },
      );
    } catch (error) {
      if (active !== execution || isAbortError(error)) return;
      const failure: RunVerdict = { kind: 'transport-failure', message: thrownMessage(error) };
      saveResult(
        exercise,
        buildRunResult(exercise, failure, { code: draft, customTest, now: dependencies.now() }),
      );
      return;
    }
    if (active !== execution) return;
    saveResult(
      exercise,
      buildRunResult(exercise, verdict, { code: draft, customTest, now: dependencies.now() }),
    );
    syncDerivedProgress(exercise);
  }

  async function run(exercise: Exercise): Promise<void> {
    if (active) return;
    if (dependencies.isLocked(exercise)) {
      dependencies.notify(LOCKED_NOTICE);
      return;
    }
    const record = ensureRecord(dependencies.store.getProgress(), exercise.id);
    const draft = draftOf(exercise, record);
    const customTest = normalizeCustomTest(record.customTest);
    if (!draft.trim()) {
      dependencies.notify(EMPTY_DRAFT_NOTICE);
      return;
    }
    if (dependencies.transport.countsLocalAttempts) {
      Object.assign(record, attemptPatch(record));
      dependencies.store.save();
    }
    const execution: ActiveExecution = { controller: new AbortController() };
    active = execution;
    state.setState({ status: 'running', exerciseId: exercise.id, progress: null }, true);
    try {
      await execute(exercise, draft, customTest, execution);
    } finally {
      finish(execution);
    }
  }

  function cancel(): void {
    stop();
    dependencies.notify(CANCELLED_NOTICE);
  }

  return { state, run, cancel, abort: stop };
}
```

`frontend/src/features/run-exercise/api/playground-transport.ts`:

```ts
import { buildProgram, readTestMarkers } from '../../../entities/exercise';
import {
  runCode as playgroundRunCode,
  type RunInput,
  type RunResult,
} from '../../../shared/api/playground';
import type { ExerciseTransport, ProgramBuilder, RunRequest, RunVerdict } from '../model/transport';

export type RunCode = (input: RunInput) => Promise<RunResult>;

export const buildPlaygroundProgram: ProgramBuilder = (exercise, draft, customTest) =>
  buildProgram(exercise, draft, customTest);

function verdictOf(request: RunRequest, result: RunResult): RunVerdict {
  if ('error' in result) return { kind: 'transport-failure', message: result.error };
  const markers = readTestMarkers(result.stdout);
  return {
    kind: 'executed',
    success: result.success,
    stdout: result.stdout,
    stderr: result.stderr,
    tests: new Map(request.exercise.tests.map((test) => [test.id, markers.get(test.id) === true])),
    customPassed: markers.get('custom') === true,
  };
}

export function createPlaygroundTransport(runCode: RunCode = playgroundRunCode): ExerciseTransport {
  return {
    countsLocalAttempts: true,
    async run(request) {
      const result = await runCode({
        language: request.exercise.language,
        code: buildPlaygroundProgram(request.exercise, request.draft, request.customTest),
        signal: request.signal,
      });
      return verdictOf(request, result);
    },
  };
}
```

- **Pasos:**
  1. Implementá.
  2. Corré `npm run test:unit -- features/run-exercise`: 36 de 36.
  3. **Mutación de aislamiento,** descartada después de verla: agregá `import '../../../entities/campaign';` al principio de `create-exercise-runner.ts`. `index.spec.ts` falla en «loads without the campaign engine…». Sacala.
  4. Corré `npm run typecheck`, `npm run lint` (ningún aviso en la feature) y `npm run format:check`.
  5. Commit: `feat(front): features/run-exercise orquesta la ejecución con el transporte como puerto`.
- **Compuerta de U3:** §0.2.
- **Vuelta atrás:** revertí el commit; nadie la usa todavía.

## 4. Unidad 4 · `lab.js` como raíz de composición (dueño W, onda 3)

**Cubre:** FR-012 (la parte de F7a), FR-015 (la parte de F7a), FR-016, FR-018, FR-019, FR-044, FR-050, FR-051 (el parámetro) y FR-063 (la parte de F7a); US4 y US7 (sólo el retiro de `TallerRunner`); SC-002 (la parte de `TallerRunner`), SC-007 (la parte de F7a), SC-009 y SC-012.

**Entrega:** `lab.js` usa las reglas, los selectores y la feature; `window.TallerRunner` y `register-runner.ts` se retiran; y los checks miran lo nuevo. Los 184 E2E pasan sin editar después de cada tarea.

### Tarea 4.1 · `lab.js` usa las reglas y los selectores (T013, W)

- **Parte de:** T007 y T010 integradas.
- **Cambia:** `frontend/lab.js`, con este diff:
  - los imports;
  - `records`, `filters`, `matches`, `recordFor`, `draftFor`, `solved`, `due`, `levelLabel` y `programFor`;
  - `achievementStats`, `mapHTML`, `levelTabsHTML` y `topicsHTML`;
  - `exerciseHTML` y `programPreviewHTML`;
  - `reviewHTML`, partida en `pendingReviewHTML`, `finishedCopy` y `finishedReviewHTML` sobre `reviewStateOf`;
  - se borran `liveHint` y `diagnose`;
  - `runExercise` usa `normalizeCustomTest`, y `reflectHTML`, `onClick` y `onInput` usan los parches y los selectores.

  `activeRun`, `activeController` y `window.TallerRunner` siguen como hoy.

```diff
--- a/frontend/lab.js
+++ b/frontend/lab.js
@@ -1,13 +1,31 @@
 import {
   buildProgram,
+  draftOf,
+  ensureRecord,
   exerciseCatalog,
+  hintPatch,
   interpretRun,
+  isDueForReview,
+  isReflectionSolved,
+  isResultCurrent,
+  isSolved,
   labStore,
+  levelOf,
+  liveHint,
+  loadSolutionPatch,
+  normalizeCustomTest,
+  practicePointsOf,
+  predictionPatch,
+  restoreStarterPatch,
+  revealSolutionPatch,
+  reviewStateOf,
+  selfAssessmentPatch,
   syncAfterRun,
 } from './src/entities/exercise';
+import { isExtraChallenge, matchesMapFilters, surprisePool, todayChallenge } from './src/pages/lab';
+import { LEVEL_LABELS } from './src/shared/config/levels';
 import { exercisePhaseOr, readLinkQuery, withLabQuery } from './src/shared/config/url-grammar';
 import { escapeHtml } from './src/shared/lib/escape-html';
-import { normalizeSearchText } from './src/shared/lib/normalize-search-text';
 (() => {
   'use strict';
   function init() {
@@ -42,24 +60,9 @@
     ['advanced', 'Avanzado', 'Elegí con criterio'],
     ['expert', 'Experto', 'Razoná sobre los límites'],
   ];
-  const levelFor = (item) =>
-    levels.some(([id]) => id === item.level)
-      ? item.level
-      : item.stage <= 4
-        ? 'beginner'
-        : item.stage <= 8
-          ? 'medium'
-          : item.stage <= 12
-            ? 'advanced'
-            : 'expert';
-  const matches = (item) =>
-    (!dueOnly || isDue(item)) &&
-    (!extraOnly || (item.stage > 15 && item.stage <= 20)) &&
-    (level === 'all' || levelFor(item) === level) &&
-    (!query ||
-      normalizeSearchText([item.title, item.topic, item.intro, item.why].join(' ')).includes(
-        normalizeSearchText(query),
-      ));
+  const records = () => labStore.getProgress().records;
+  const filters = () => ({ query, dueOnly, extraOnly, level });
+  const matches = (item) => matchesMapFilters(item, records(), filters(), Date.now());
   let activeRun = null,
     activeController = null,
     lastFocus = null;
@@ -75,8 +78,7 @@
   function save() {
     return labStore.save();
   }
-  const recordFor = (id) =>
-    labStore.getProgress().records[id] || (labStore.getProgress().records[id] = {});
+  const recordFor = (id) => ensureRecord(labStore.getProgress(), id);
   const list = () => exerciseCatalog.exercises.filter((exercise) => exercise.language === language);
   const current = () => exerciseCatalog.byId.get(selectedId);
   function navigationList() {
@@ -107,31 +109,19 @@
     mode = 'map';
     render();
   }
-  const draftFor = (exercise) => recordFor(exercise.id).draft ?? exercise.starter;
-  const resultMatches = (item, record) =>
-    record.result?.code === draftFor(item) &&
-    (record.result.customTest || '') === (record.customTest || '').trim();
-  const isSolved = (exercise) => Boolean(labStore.getProgress().records[exercise.id]?.solvedAt);
-  const isDue = (exercise) =>
-    Boolean(
-      labStore.getProgress().records[exercise.id]?.reviewAt &&
-      labStore.getProgress().records[exercise.id].reviewAt <= Date.now(),
-    );
+  const draftFor = (exercise) => draftOf(exercise, recordFor(exercise.id));
+  const solved = (exercise) => isSolved(records()[exercise.id]);
+  const due = (exercise) => isDueForReview(records()[exercise.id], Date.now());
+  const levelLabel = (exercise) => LEVEL_LABELS[levelOf(exercise)];
+  const programFor = (item) =>
+    buildProgram(item, draftFor(item), normalizeCustomTest(recordFor(item.id).customTest));
   const langName = () => (language === 'rust' ? 'Rust' : 'Go');
   function achievementStats() {
     const items = list();
     return {
-      solved: items.filter(isSolved).length,
-      due: items.filter(isDue).length,
-      points: items.reduce((sum, item) => {
-        const r = labStore.getProgress().records[item.id] || {};
-        return (
-          sum +
-          (r.solvedAt ? 20 : 0) +
-          (r.predictionCorrect ? 5 : 0) +
-          (r.reflection?.trim().length >= 40 ? 5 : 0)
-        );
-      }, 0),
+      solved: items.filter(solved).length,
+      due: items.filter(due).length,
+      points: items.reduce((sum, item) => sum + practicePointsOf(records()[item.id]), 0),
       topics: [...new Set(items.map((item) => item.topicId))],
     };
   }
@@ -210,27 +200,18 @@
   }
   function mapHTML() {
     const stats = achievementStats();
-    const candidates = list().filter(
-      (item) =>
-        (level === 'all' || levelFor(item) === level) &&
-        (!extraOnly || (item.stage > 15 && item.stage <= 20)),
-    );
-    const next =
-      candidates.find((item) => !isSolved(item)) ||
-      candidates.find(isDue) ||
-      candidates[0] ||
-      list()[0];
+    const next = todayChallenge(list(), records(), { level, extraOnly }, Date.now());
     return `<section class="lab-intro"><div><div class="eyebrow"><span class="eyebrow-line"></span> LABORATORIO · ${langName().toUpperCase()}</div><h1>Aprendé tocando.<br><em>Entendé probando.</em></h1><p>El código lo escribís vos. Un revisor te acompaña con pruebas, pistas y el porqué de cada resultado. Equivocarte también hace avanzar el experimento.</p></div><div class="lab-stamp" aria-label="${list().length} desafíos en ${langName()}"><span>HECHO PARA EXPLORAR</span><strong>${list().length}</strong><span>DESAFÍOS EN ${langName().toUpperCase()}</span></div></section>
     <div class="lab-metrics"><span><strong>${stats.solved}/${list().length}</strong> resueltos</span><span><strong>${stats.topics.length}</strong> temas</span><span><strong>${stats.points}</strong> puntos de práctica</span><span><strong>${stats.due}</strong> para repasar</span></div>
     ${!labStore.storageAvailable() ? '<div class="lab-storage-warning">El guardado local no está disponible. Exportá tu progreso desde Método y notas antes de cerrar.</div>' : ''}
     ${labStore.loadWarning() ? `<div class="lab-storage-warning">${escapeHtml(labStore.loadWarning())} Exportá tu progreso desde Método y notas para conservar lo que sigue.</div>` : ''}
     <div class="lab-continue"><div><span class="small-label">UN DESAFÍO PARA HOY</span><h2>${escapeHtml(next?.title || 'Tu próximo experimento')}</h2><p>${escapeHtml(next?.objective || '')}</p></div><button class="button" data-lab-action="open" data-id="${escapeHtml(next?.id)}">${stats.solved ? 'Seguir aprendiendo' : 'Entrar al laboratorio'} ↗</button></div>
-    <div class="quest-banner"><p><strong>¿Preferís aprender como una expedición?</strong><br>Campaña suma mundos, katas, reparaciones y desafíos finales con desbloqueos.</p><a class="button secondary" href="#campana">Jugar la campaña ↗</a></div>${levelTabsHTML()}<div class="lab-toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="lab-search" name="buscar-desafio" autocomplete="off" type="search" value="${escapeHtml(query)}" placeholder="Buscá un tema o desafío…" aria-label="Buscar ejercicios"></label><div class="lab-toolbar-actions"><button class="button small secondary" data-lab-action="extras" aria-pressed="${extraOnly}">Clásicos y sistemas · ${list().filter((item) => item.stage > 15 && item.stage <= 20).length}</button><button class="button small secondary" data-lab-action="surprise">Sorprendeme ↗</button><button class="button small secondary" data-lab-action="due" aria-pressed="${dueOnly}">${dueOnly ? 'Ver todos' : 'Repasar pendientes'}${stats.due ? ' · ' + stats.due : ''}</button></div></div><p id="lab-filter-status" class="lab-filter-status" role="status">${list().filter(matches).length} desafíos visibles${extraOnly ? ' · ampliación Clásicos y sistemas' : ''}.</p><div id="lab-topic-grid" class="topic-grid">${topicsHTML()}</div>
+    <div class="quest-banner"><p><strong>¿Preferís aprender como una expedición?</strong><br>Campaña suma mundos, katas, reparaciones y desafíos finales con desbloqueos.</p><a class="button secondary" href="#campana">Jugar la campaña ↗</a></div>${levelTabsHTML()}<div class="lab-toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="lab-search" name="buscar-desafio" autocomplete="off" type="search" value="${escapeHtml(query)}" placeholder="Buscá un tema o desafío…" aria-label="Buscar ejercicios"></label><div class="lab-toolbar-actions"><button class="button small secondary" data-lab-action="extras" aria-pressed="${extraOnly}">Clásicos y sistemas · ${list().filter(isExtraChallenge).length}</button><button class="button small secondary" data-lab-action="surprise">Sorprendeme ↗</button><button class="button small secondary" data-lab-action="due" aria-pressed="${dueOnly}">${dueOnly ? 'Ver todos' : 'Repasar pendientes'}${stats.due ? ' · ' + stats.due : ''}</button></div></div><p id="lab-filter-status" class="lab-filter-status" role="status">${list().filter(matches).length} desafíos visibles${extraOnly ? ' · ampliación Clásicos y sistemas' : ''}.</p><div id="lab-topic-grid" class="topic-grid">${topicsHTML()}</div>
     <div class="lab-map-caption"><span><i class="legend-dot"></i> Resuelto con pruebas</span><span><i class="legend-dot pending"></i> Repaso sugerido</span><span>Podés explorar cualquier tema, sin bloqueos.</span></div>
     <div class="lab-learning-loop"><div><strong>01. Hacé una predicción.</strong><p>Conectá la idea nueva con lo que ya sabés.</p></div><div><strong>02. Probala en código real.</strong><p>El compilador y los casos de prueba aportan evidencia.</p></div><div><strong>03. Explicá el porqué.</strong><p>Una variante y un repaso ayudan a que la idea se quede.</p></div></div><p class="lab-backup-note">${exerciseCatalog.exercises.length} desafíos originales: ${exerciseCatalog.exercises.filter((item) => item.language === 'rust').length} de Rust y ${exerciseCatalog.exercises.filter((item) => item.language === 'go').length} de Go. Cada uno enlaza sus fuentes. Los puntos reconocen práctica; no certifican dominio. Todo tu avance se incluye al exportar la guía.</p>${practiceSourcesHTML()}${window.TallerExplorers?.curriculumHTML(language) || ''}`;
   }
   function levelTabsHTML() {
-    return `<div class="lab-levels" role="group" aria-label="Nivel de aprendizaje"><button data-lab-action="level" data-level="all" aria-pressed="${level === 'all'}"><strong>Todos los niveles</strong><span>${list().length} desafíos · a tu ritmo</span></button>${levels.map(([id, title, subtitle]) => `<button data-lab-action="level" data-level="${id}" aria-pressed="${level === id}"><strong>${title}<small>${list().filter((item) => levelFor(item) === id).length}</small></strong><span>${subtitle}</span></button>`).join('')}</div><p class="lab-level-note">Los niveles describen la complejidad de los desafíos. Podés saltar, volver y mezclar temas; completar una etapa no certifica experiencia profesional.</p>`;
+    return `<div class="lab-levels" role="group" aria-label="Nivel de aprendizaje"><button data-lab-action="level" data-level="all" aria-pressed="${level === 'all'}"><strong>Todos los niveles</strong><span>${list().length} desafíos · a tu ritmo</span></button>${levels.map(([id, title, subtitle]) => `<button data-lab-action="level" data-level="${id}" aria-pressed="${level === id}"><strong>${title}<small>${list().filter((item) => levelOf(item) === id).length}</small></strong><span>${subtitle}</span></button>`).join('')}</div><p class="lab-level-note">Los niveles describen la complejidad de los desafíos. Podés saltar, volver y mezclar temas; completar una etapa no certifica experiencia profesional.</p>`;
   }
   function practiceSourcesHTML() {
     const resources =
@@ -287,7 +268,7 @@
         const group = items.filter((item) => item.topicId === topic),
           first = group[0];
         const total = list().filter((item) => item.topicId === topic);
-        return `<article class="topic-card"><span class="topic-level">${levels.find((entry) => entry[0] === levelFor(first))[1]}</span><div class="topic-head"><span class="topic-index">${String(first.stage).padStart(2, '0')}</span><h2>${escapeHtml(first.topic)}</h2><span class="topic-fraction">${total.filter(isSolved).length}/${total.length}</span></div><div class="challenge-nodes">${group.map((item) => `<button class="challenge-node ${isSolved(item) ? 'is-complete' : ''} ${isDue(item) ? 'is-due' : ''} ${item.id === selectedId ? 'is-current' : ''}" data-lab-action="open" data-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}" aria-label="${isSolved(item) ? 'Resuelto. ' : ''}${escapeHtml(item.title)}">${isSolved(item) ? '✓' : item.id.split('-').pop()}</button>`).join('')}</div><p class="topic-note">${group.map((item) => escapeHtml(item.title)).join(' · ')}</p></article>`;
+        return `<article class="topic-card"><span class="topic-level">${levelLabel(first)}</span><div class="topic-head"><span class="topic-index">${String(first.stage).padStart(2, '0')}</span><h2>${escapeHtml(first.topic)}</h2><span class="topic-fraction">${total.filter(solved).length}/${total.length}</span></div><div class="challenge-nodes">${group.map((item) => `<button class="challenge-node ${solved(item) ? 'is-complete' : ''} ${due(item) ? 'is-due' : ''} ${item.id === selectedId ? 'is-current' : ''}" data-lab-action="open" data-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}" aria-label="${solved(item) ? 'Resuelto. ' : ''}${escapeHtml(item.title)}">${solved(item) ? '✓' : item.id.split('-').pop()}</button>`).join('')}</div><p class="topic-note">${group.map((item) => escapeHtml(item.title)).join(' · ')}</p></article>`;
       })
       .join('');
   }
@@ -319,7 +300,7 @@
       record = recordFor(item.id),
       items = navigationList(),
       index = items.findIndex((exercise) => exercise.id === item.id);
-    return `${window.TallerSystems?.exerciseContextHTML(item.id, language) || window.TallerCampaign?.exerciseContextHTML(item.id, language) || ''}<div class="lab-breadcrumb"><button class="lab-back" data-lab-action="map">← ${readLinkQuery(location.search).missionWorkshop !== null ? 'Volver al taller' : 'Volver al mapa'}</button><div class="lab-next-controls"><span class="small-label">${index + 1} / ${items.length}</span><button data-lab-action="previous" aria-label="Ejercicio anterior" ${index === 0 ? 'disabled' : ''}>←</button><button data-lab-action="next" aria-label="Ejercicio siguiente" ${index === items.length - 1 ? 'disabled' : ''}>→</button></div></div><header class="lab-exercise-heading"><div class="eyebrow">${langName().toUpperCase()} / ${escapeHtml(levels.find((entry) => entry[0] === levelFor(item))[1])} / ${escapeHtml(item.topic)} / ${item.kind === 'reparar' ? 'REPARÁ EL CÓDIGO' : 'CONSTRUÍ UNA SOLUCIÓN'}</div><h1 tabindex="-1">${escapeHtml(item.title)}</h1><p>${escapeHtml(item.objective)}</p></header><div class="lab-tabs" role="tablist" aria-label="Pasos del desafío">${[
+    return `${window.TallerSystems?.exerciseContextHTML(item.id, language) || window.TallerCampaign?.exerciseContextHTML(item.id, language) || ''}<div class="lab-breadcrumb"><button class="lab-back" data-lab-action="map">← ${readLinkQuery(location.search).missionWorkshop !== null ? 'Volver al taller' : 'Volver al mapa'}</button><div class="lab-next-controls"><span class="small-label">${index + 1} / ${items.length}</span><button data-lab-action="previous" aria-label="Ejercicio anterior" ${index === 0 ? 'disabled' : ''}>←</button><button data-lab-action="next" aria-label="Ejercicio siguiente" ${index === items.length - 1 ? 'disabled' : ''}>→</button></div></div><header class="lab-exercise-heading"><div class="eyebrow">${langName().toUpperCase()} / ${escapeHtml(levelLabel(item))} / ${escapeHtml(item.topic)} / ${item.kind === 'reparar' ? 'REPARÁ EL CÓDIGO' : 'CONSTRUÍ UNA SOLUCIÓN'}</div><h1 tabindex="-1">${escapeHtml(item.title)}</h1><p>${escapeHtml(item.objective)}</p></header><div class="lab-tabs" role="tablist" aria-label="Pasos del desafío">${[
       ['learn', 'Descubrí'],
       ['code', 'Experimentá'],
       ['reflect', 'Explicá'],
@@ -347,20 +328,15 @@
   function executionGuideHTML() {
     return `<details class="lab-execution-guide"><summary><span class="execution-dot" aria-hidden="true"></span> Pruebas reales al ejecutar <span class="execution-guide-label">¿Cómo funciona?</span></summary><div class="execution-steps"><div><strong>01 · Escribí una hipótesis</strong><p>El editor guarda tu borrador y ofrece ayuda de sintaxis. Las pruebas se lanzan con <b>Ejecutar y revisar</b> o Ctrl/⌘ + Enter; no con cada tecla.</p></div><div><strong>02 · Compilá y comprobá</strong><p>El Playground oficial compila tu programa y ejecuta los tres casos. Cada expresión debe dar <code>true</code>. Podés abrir las pruebas antes de resolverlas y agregar un caso propio.</p></div><div><strong>03 · Entendé y volvé a probar</strong><p>Si no compila, leé el diagnóstico. Si un caso falla, contrastá su condición y su porqué. Cuando pasan, simplificá tu solución y ejecutá otra vez.</p></div></div><p class="execution-scope">Son comprobaciones de comportamiento dentro de un programa generado por el taller. No se ejecuta un proyecto completo con cargo test o go test. El revisor usa explicaciones preparadas; los modelos visuales son simulaciones del concepto.</p></details>`;
   }
-  function programPreviewHTML(item, record) {
-    return `<details class="lab-program-preview"><summary>Ver el programa completo y sus pruebas</summary><p>Este es el código que se enviará al ejecutar. Incluye tu borrador, la entrada del programa y las comprobaciones. Los números de línea del compilador corresponden a este programa completo. Podés copiarlo y explorar cómo cada condición produce un resultado.</p><pre id="lab-program-source" tabindex="0" aria-label="Programa completo con pruebas" translate="no">${escapeHtml(buildProgram(item, draftFor(item), record.customTest || ''))}</pre></details>`;
+  function programPreviewHTML(item) {
+    return `<details class="lab-program-preview"><summary>Ver el programa completo y sus pruebas</summary><p>Este es el código que se enviará al ejecutar. Incluye tu borrador, la entrada del programa y las comprobaciones. Los números de línea del compilador corresponden a este programa completo. Podés copiarlo y explorar cómo cada condición produce un resultado.</p><pre id="lab-program-source" tabindex="0" aria-label="Programa completo con pruebas" translate="no">${escapeHtml(programFor(item))}</pre></details>`;
   }
   function updateProgramPreview() {
     const preview = $('#lab-program-source');
-    if (preview)
-      preview.textContent = buildProgram(
-        current(),
-        draftFor(current()),
-        recordFor(selectedId).customTest || '',
-      );
+    if (preview) preview.textContent = programFor(current());
   }
   function codeHTML(item, record) {
-    return `${executionGuideHTML()}<div class="lab-workbench"><div><section class="lab-task"><h2>Tu misión.</h2><ol>${item.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}</ol></section><div class="editor-shell"><div class="editor-toolbar"><span class="editor-file">${language === 'rust' ? 'experimento.rs' : 'experimento.go'}</span><button data-lab-action="reset-code">Restaurar inicio ↺</button></div><div class="editor-wrapper"><pre id="lab-line-numbers" class="editor-lines" aria-hidden="true">1</pre><textarea id="lab-code" name="codigo" translate="no" class="code-input" aria-label="Editor de código ${langName()}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" maxlength="30000" wrap="off">${escapeHtml(draftFor(item))}</textarea></div><div class="editor-footer"><span>Tab: sangría · Ctrl/⌘ + Enter: revisar · Esc: salir del editor</span><span id="lab-editor-status">Borrador guardado</span></div></div><div class="lab-run-bar"><button id="lab-run" class="button" data-lab-action="run" ${activeRun ? 'disabled' : ''}>${activeRun ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…' : '▷ Ejecutar y revisar'}</button><button class="text-button" data-lab-action="copy-code">Copiar programa completo ↗</button></div><p class="lab-run-disclosure">Al ejecutar, se envía este código al <a href="${language === 'rust' ? 'https://play.rust-lang.org/' : 'https://go.dev/play/'}" target="_blank" rel="noopener noreferrer">Playground oficial de ${langName()}</a>. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.</p>${programPreviewHTML(item, record)}${customEditorHTML(item, record)}<div class="lab-hints"><div class="hints-top"><h3>Un empujón, si lo necesitás.</h3><span>${record.hints || 0}/3 pistas</span></div>${item.hints
+    return `${executionGuideHTML()}<div class="lab-workbench"><div><section class="lab-task"><h2>Tu misión.</h2><ol>${item.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}</ol></section><div class="editor-shell"><div class="editor-toolbar"><span class="editor-file">${language === 'rust' ? 'experimento.rs' : 'experimento.go'}</span><button data-lab-action="reset-code">Restaurar inicio ↺</button></div><div class="editor-wrapper"><pre id="lab-line-numbers" class="editor-lines" aria-hidden="true">1</pre><textarea id="lab-code" name="codigo" translate="no" class="code-input" aria-label="Editor de código ${langName()}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" maxlength="30000" wrap="off">${escapeHtml(draftFor(item))}</textarea></div><div class="editor-footer"><span>Tab: sangría · Ctrl/⌘ + Enter: revisar · Esc: salir del editor</span><span id="lab-editor-status">Borrador guardado</span></div></div><div class="lab-run-bar"><button id="lab-run" class="button" data-lab-action="run" ${activeRun ? 'disabled' : ''}>${activeRun ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…' : '▷ Ejecutar y revisar'}</button><button class="text-button" data-lab-action="copy-code">Copiar programa completo ↗</button></div><p class="lab-run-disclosure">Al ejecutar, se envía este código al <a href="${language === 'rust' ? 'https://play.rust-lang.org/' : 'https://go.dev/play/'}" target="_blank" rel="noopener noreferrer">Playground oficial de ${langName()}</a>. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.</p>${programPreviewHTML(item)}${customEditorHTML(item, record)}<div class="lab-hints"><div class="hints-top"><h3>Un empujón, si lo necesitás.</h3><span>${record.hints || 0}/3 pistas</span></div>${item.hints
       .slice(0, record.hints || 0)
       .map(
         (hint, index) =>
@@ -371,18 +347,33 @@
       )}<button class="button small secondary" data-lab-action="hint" ${(record.hints || 0) >= 3 ? 'disabled' : ''}>${record.hints ? 'Otra pista' : 'Dame una pista'}</button><details class="solution-panel" id="lab-solution"><summary data-lab-action="reveal-solution">Ver una solución razonada</summary><p>Usarla como apoyo es válido. Después cerrala y reconstruí la idea. Este intento quedará identificado como práctica con solución.</p><pre class="solution-code" translate="no">${escapeHtml(item.solution)}</pre><p>${escapeHtml(item.review.success)}</p><button class="button small secondary" data-lab-action="load-solution">Cargarla y experimentar</button></details></div></div><aside class="lab-coach" aria-label="Revisión del ejercicio"><div class="coach-heading"><div class="coach-avatar" aria-hidden="true">[?]</div><div><h2>Tu revisor didáctico</h2><span>COMPILADOR + CASOS EXPLICADOS</span></div></div><div class="coach-content" id="lab-review" aria-live="polite">${reviewHTML(item, record)}</div></aside></div><div class="lab-phase-footer"><p>Que compile es el primer paso. Abrí cada prueba para entender qué comprueba y qué deja afuera.</p><button class="button secondary" data-lab-action="phase" data-phase="reflect">Ponerlo en palabras →</button></div>`;
   }
   function reviewHTML(item, record) {
-    if (activeRun?.id === item.id)
+    const review = reviewStateOf(item, record, activeRun?.id === item.id);
+    if (review.kind === 'running')
       return '<h3>Probemos tu hipótesis.</h3><p>El compilador está revisando el programa. Después ejecutamos los casos del ejercicio y conectamos cada resultado con el concepto.</p><p class="runner-status busy"><span class="lab-spinner" aria-hidden="true"></span> Ejecutando código real…</p><button class="text-button" data-lab-action="cancel-run">Cancelar ejecución</button>';
+    if (review.kind === 'unrun' || review.kind === 'stale')
+      return pendingReviewHTML(item, review.kind === 'stale');
+    if (review.kind === 'transport-failure')
+      return `<h3 class="coach-warning">No pude ejecutar esta vez.</h3><p>${escapeHtml(review.message || 'No llegó una respuesta del compilador. Revisá la conexión y probá de nuevo.')}</p><div class="coach-callout">Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas o copiar el programa para probarlo en el Playground.</div>${testsHTML(item, null)}`;
+    return finishedReviewHTML(item, record, review);
+  }
+  function pendingReviewHTML(item, stale) {
+    return `<h3>${stale ? 'El código cambió. Revisémoslo.' : '¿Qué queremos comprobar?'}</h3><p>${stale ? 'Los resultados anteriores corresponden a otra versión. Ejecutá de nuevo para comprobar estos cambios.' : escapeHtml(item.review.pitfall)}</p>${testsHTML(item, null)}<div class="coach-callout"><strong>Mientras escribís:</strong> <span id="lab-live-hint">${escapeHtml(liveHint(draftFor(item), item))}</span></div><p class="coach-scope">La revisión combina diagnósticos reales y explicaciones preparadas para este desafío. Las pruebas cubren estos casos; no garantizan todo comportamiento posible.</p>`;
+  }
+  function finishedCopy(item, review) {
+    if (review.kind === 'passed')
+      return { heading: 'La idea funciona en estos casos.', detail: item.review.success };
+    if (review.kind === 'partial')
+      return {
+        heading: `${review.passedCount} de ${item.tests.length}: encontramos algo para explorar.`,
+        detail: review.failure,
+      };
+    return { heading: 'El programa nos dejó una pista.', detail: review.diagnosis.explanation };
+  }
+  function finishedReviewHTML(item, record, review) {
     const result = record.result;
-    const stale = result && !resultMatches(item, record);
-    if (!result || stale)
-      return `<h3>${stale ? 'El código cambió. Revisémoslo.' : '¿Qué queremos comprobar?'}</h3><p>${stale ? 'Los resultados anteriores corresponden a otra versión. Ejecutá de nuevo para comprobar estos cambios.' : escapeHtml(item.review.pitfall)}</p>${testsHTML(item, null)}<div class="coach-callout"><strong>Mientras escribís:</strong> <span id="lab-live-hint">${escapeHtml(liveHint(draftFor(item), item))}</span></div><p class="coach-scope">La revisión combina diagnósticos reales y explicaciones preparadas para este desafío. Las pruebas cubren estos casos; no garantizan todo comportamiento posible.</p>`;
-    if (result.transportError)
-      return `<h3 class="coach-warning">No pude ejecutar esta vez.</h3><p>${escapeHtml(result.stderr || 'No llegó una respuesta del compilador. Revisá la conexión y probá de nuevo.')}</p><div class="coach-callout">Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas o copiar el programa para probarlo en el Playground.</div>${testsHTML(item, null)}`;
-    const passed = result.tests.filter((test) => test.passed).length;
-    const complete = passed === item.tests.length && result.success;
-    const diagnosis = diagnose(result.stderr, language);
-    return `<h3 class="${complete ? 'coach-success' : 'coach-warning'}">${complete ? 'La idea funciona en estos casos.' : result.success ? `${passed} de ${item.tests.length}: encontramos algo para explorar.` : 'El programa nos dejó una pista.'}</h3><p>${escapeHtml(complete ? item.review.success : result.success ? item.tests.find((test) => !result.tests.find((t) => t.id === test.id)?.passed)?.failure || item.review.pitfall : diagnosis.explanation)}</p>${!complete && !result.success ? `<div class="coach-callout"><strong>Probá esto:</strong> ${escapeHtml(diagnosis.action)}</div>` : ''}${testsHTML(item, result)}${customResultHTML(record, result)}${complete ? `<div class="coach-callout"><strong>Una pregunta más:</strong> ${escapeHtml(item.transfer)}</div><button class="button small secondary" data-lab-action="phase" data-phase="reflect">Explicar lo que aprendí →</button>` : ''}<details class="compiler-output"><summary>Ver la salida del compilador y del programa</summary><pre>${escapeHtml((result.stderr || '') + '\n' + (result.stdout || ''))}</pre></details><p class="coach-scope">${record.assisted ? 'Práctica con solución de apoyo. ' : ''}${record.attempts || 0} intento${record.attempts === 1 ? '' : 's'}. Revisar es parte de aprender. La aprobación corresponde a estos ${item.tests.length} casos, no a una revisión completa de diseño.</p>`;
+    const complete = review.kind === 'passed';
+    const { heading, detail } = finishedCopy(item, review);
+    return `<h3 class="${complete ? 'coach-success' : 'coach-warning'}">${heading}</h3><p>${escapeHtml(detail)}</p>${review.kind === 'error' ? `<div class="coach-callout"><strong>Probá esto:</strong> ${escapeHtml(review.diagnosis.action)}</div>` : ''}${testsHTML(item, result)}${customResultHTML(record, result)}${complete ? `<div class="coach-callout"><strong>Una pregunta más:</strong> ${escapeHtml(item.transfer)}</div><button class="button small secondary" data-lab-action="phase" data-phase="reflect">Explicar lo que aprendí →</button>` : ''}<details class="compiler-output"><summary>Ver la salida del compilador y del programa</summary><pre>${escapeHtml((result.stderr || '') + '\n' + (result.stdout || ''))}</pre></details><p class="coach-scope">${record.assisted ? 'Práctica con solución de apoyo. ' : ''}${record.attempts || 0} intento${record.attempts === 1 ? '' : 's'}. Revisar es parte de aprender. La aprobación corresponde a estos ${item.tests.length} casos, no a una revisión completa de diseño.</p>`;
   }
   function customResultHTML(record, result) {
     if (!result.customTest) return '';
@@ -401,111 +392,6 @@
       })
       .join('')}</div>`;
   }
-  function liveHint(code, item) {
-    if (/todo!\s*\(|TODO|IMPLEMENTAR|panic\("pendiente/i.test(code))
-      return 'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.';
-    if (!code.trim())
-      return 'Volvé al código inicial para conservar las firmas que usan las pruebas.';
-    if (/\b(?:fn|func)\s+main\s*\(/.test(code))
-      return 'El taller ya agrega main. Mantené acá las funciones de la consigna.';
-    return 'No hace falta adivinar: proponé un cambio pequeño y comprobalo. ' + item.review.pitfall;
-  }
-  function diagnose(stderr, lang) {
-    const rules =
-      lang === 'rust'
-        ? [
-            [
-              /E0382|use of moved value|borrow of moved value/,
-              'Ese valor ya se movió. Para tipos como String, asignar o pasar por valor puede transferir ownership; el nombre anterior deja de poder usarlo.',
-              'Identificá dónde se consume el valor. Si solo necesitás leerlo, considerá un préstamo; si necesitás dos valores independientes, razoná sobre una copia explícita.',
-            ],
-            [
-              /E0502|E0499|cannot borrow.*mutable.*immutable|more than once/,
-              'Los préstamos que se superponen permiten accesos incompatibles. Rust evita que una modificación conviva con lecturas o escrituras que podrían invalidarse.',
-              'Buscá el último uso de cada referencia y reducí el alcance del préstamo antes de pedir otro incompatible.',
-            ],
-            [
-              /E0596|E0384|cannot assign twice|cannot assign to/,
-              'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
-              'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
-            ],
-            [
-              /E0308|mismatched types/,
-              'La expresión devuelve un tipo distinto del que promete su contexto. Un punto y coma también puede convertir el resultado de un bloque en ().',
-              'Compará los tipos “expected” y “found”. Revisá la última expresión, los brazos de match y los valores devueltos.',
-            ],
-            [
-              /E0106|E0597|does not live long enough|missing lifetime/,
-              'Una referencia necesita apuntar a un valor que siga vivo durante su uso. Una anotación de lifetime describe relaciones; no alarga la vida de los datos.',
-              'Comprobá quién posee el valor referenciado y si devolvés una referencia a un dato local. Considerá devolver datos propios o relacionar la salida con una entrada.',
-            ],
-            [
-              /E0277|trait bound/,
-              'La operación necesita un comportamiento expresado por un trait que el tipo actual no cumple.',
-              'Leé el trait que aparece en el diagnóstico y revisá el tipo o la restricción genérica requerida por la consigna.',
-            ],
-            [
-              /E0428|defined multiple times/,
-              'Hay dos definiciones con el mismo nombre. El taller agrega main y el código de pruebas.',
-              'Editá las funciones iniciales, sin agregar otra función main ni pegar el programa completo de las pruebas.',
-            ],
-            [
-              /expected|unexpected|unclosed delimiter/,
-              'La estructura del código no coincide con la sintaxis que espera Rust.',
-              'Empezá por el primer diagnóstico: revisá delimitadores, comas, operadores y el lugar señalado. Un error temprano puede producir varios mensajes.',
-            ],
-          ]
-        : [
-            [
-              /declared and not used|imported and not used/,
-              'Go detectó una variable local o un import que no se usa. Eso suele indicar trabajo incompleto o código que ya no hace falta.',
-              'Usá el valor que necesitás para resolver la consigna o quitá la declaración sobrante. Revisá también los imports que utiliza el ejercicio.',
-            ],
-            [
-              /cannot use|mismatched types|invalid operation/,
-              'Los tipos de esta operación no son compatibles. Go no convierte automáticamente todos los tipos aunque sus representaciones se parezcan.',
-              'Compará el tipo recibido con el que espera la función u operador. Convertí explícitamente solo si preserva el significado.',
-            ],
-            [
-              /undefined:/,
-              'El compilador no encuentra ese nombre en su alcance.',
-              'Buscá una diferencia de escritura, una variable declarada dentro de otro bloque o una función que cambiaste de nombre y que todavía usa una prueba.',
-            ],
-            [
-              /no new variables on left side/,
-              'El operador := declara variables nuevas en ese bloque. Acá no está introduciendo ninguna.',
-              'Si querés actualizar una variable existente, usá =. Si estás declarando otra, revisá el alcance y el nombre.',
-            ],
-            [
-              /deadlock|all goroutines are asleep/,
-              'Las goroutines quedaron esperando sin una operación que pueda destrabarlas. Un canal sin buffer requiere que envío y recepción se encuentren.',
-              'Dibujá quién envía, quién recibe y quién cierra. Asegurate de que la operación complementaria pueda ejecutarse.',
-            ],
-            [
-              /index out of range|slice bounds/,
-              'Se intentó acceder fuera de los límites de un slice o arreglo.',
-              'Revisá el caso vacío y recordá que el último índice válido es len-1. Separá capacidad de longitud.',
-            ],
-            [
-              /redeclared|main redeclared/,
-              'Hay más de una declaración con el mismo nombre. El taller prepara package, imports y main.',
-              'Mantené en el editor las funciones indicadas, sin agregar package, imports ni main.',
-            ],
-            [
-              /syntax error|expected|unexpected/,
-              'El compilador no pudo interpretar esta parte del programa.',
-              'Revisá el primer mensaje y su línea. Comprobá llaves, comas, paréntesis y la firma de la función.',
-            ],
-          ];
-    for (const [pattern, explanation, action] of rules)
-      if (pattern.test(stderr)) return { explanation, action };
-    return {
-      explanation:
-        'La ejecución no terminó correctamente. La salida original, abajo, muestra el diagnóstico que necesitamos interpretar.',
-      action:
-        'Empezá por el primer error y comparalo con la firma y el comportamiento pedidos. Pedí una pista si todavía no encontrás la causa.',
-    };
-  }
   async function runExercise() {
     const item = current();
     if (activeRun) return;
@@ -515,7 +401,7 @@
     }
     const record = recordFor(item.id),
       code = draftFor(item),
-      customTest = (record.customTest || '').trim();
+      customTest = normalizeCustomTest(record.customTest);
     if (!code.trim()) {
       notify('Escribí una solución o restaurá el inicio.');
       return;
@@ -612,14 +498,7 @@
     if (review) review.innerHTML = reviewHTML(current(), recordFor(selectedId));
   }
   function reflectHTML(item, record) {
-    const result = record.result;
-    const solved =
-      result?.success &&
-      resultMatches(item, record) &&
-      item.tests.every((test) =>
-        result.tests.some((outcome) => outcome.id === test.id && outcome.passed),
-      );
-    return `<div id="lab-reflect-status" role="status">${solved ? `<div class="lab-achievement"><span class="achievement-icon" aria-hidden="true">✳</span><div><strong>${record.assisted ? 'Lo exploraste con una solución de apoyo.' : 'Lo hiciste funcionar. Ahora hacelo tuyo.'}</strong><p>Los ${item.tests.length} casos pasaron. La comprensión se afianza cuando podés explicarlo y resolver una variante.</p></div></div>` : '<div class="coach-callout">Podés reflexionar en cualquier momento. Para verificar este código, volvé a Experimentá y ejecutá las pruebas.</div>'}</div><div class="reflect-layout"><section class="reflect-panel"><h2>¿Cómo se lo explicarías a alguien?</h2><p>Contá qué cambiaste, por qué funciona y qué caso podría romper una solución ingenua. Podés usar un ejemplo propio.</p><label><span class="field-label">Tu explicación, en tus palabras</span><textarea class="reflection-input" id="lab-reflection" name="reflexion" autocomplete="off" maxlength="10000" placeholder="Mi primera idea era… Ahora entiendo que… Un caso que tengo que cuidar es…">${escapeHtml(record.reflection || '')}</textarea></label><p id="lab-reflection-status" class="note-state">${record.reflection?.trim().length >= 40 ? 'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.' : 'Escribir tu razonamiento suma una oportunidad de recordar. Se guarda automáticamente.'}</p><details style="margin-top:20px"><summary style="font-size:12px;cursor:pointer">Contrastar con el razonamiento del revisor</summary><p>${escapeHtml(item.review.success)}</p><p><strong>Cuidado con esta idea:</strong> ${escapeHtml(item.review.pitfall)}</p></details><div class="transfer-card"><h3>Ahora cambiá una condición.</h3><p>${escapeHtml(item.transfer)}</p><button class="button small secondary" data-lab-action="phase" data-phase="code">Volver al editor ↗</button></div></section><section class="reflect-panel"><h2>¿Cuándo querés volver a esto?</h2><p>Esta es tu autoevaluación. Elegí con honestidad: pedir más práctica también es avanzar.</p><div class="confidence-options">${[
+    return `<div id="lab-reflect-status" role="status">${isReflectionSolved(item, record) ? `<div class="lab-achievement"><span class="achievement-icon" aria-hidden="true">✳</span><div><strong>${record.assisted ? 'Lo exploraste con una solución de apoyo.' : 'Lo hiciste funcionar. Ahora hacelo tuyo.'}</strong><p>Los ${item.tests.length} casos pasaron. La comprensión se afianza cuando podés explicarlo y resolver una variante.</p></div></div>` : '<div class="coach-callout">Podés reflexionar en cualquier momento. Para verificar este código, volvé a Experimentá y ejecutá las pruebas.</div>'}</div><div class="reflect-layout"><section class="reflect-panel"><h2>¿Cómo se lo explicarías a alguien?</h2><p>Contá qué cambiaste, por qué funciona y qué caso podría romper una solución ingenua. Podés usar un ejemplo propio.</p><label><span class="field-label">Tu explicación, en tus palabras</span><textarea class="reflection-input" id="lab-reflection" name="reflexion" autocomplete="off" maxlength="10000" placeholder="Mi primera idea era… Ahora entiendo que… Un caso que tengo que cuidar es…">${escapeHtml(record.reflection || '')}</textarea></label><p id="lab-reflection-status" class="note-state">${record.reflection?.trim().length >= 40 ? 'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.' : 'Escribir tu razonamiento suma una oportunidad de recordar. Se guarda automáticamente.'}</p><details style="margin-top:20px"><summary style="font-size:12px;cursor:pointer">Contrastar con el razonamiento del revisor</summary><p>${escapeHtml(item.review.success)}</p><p><strong>Cuidado con esta idea:</strong> ${escapeHtml(item.review.pitfall)}</p></details><div class="transfer-card"><h3>Ahora cambiá una condición.</h3><p>${escapeHtml(item.transfer)}</p><button class="button small secondary" data-lab-action="phase" data-phase="code">Volver al editor ↗</button></div></section><section class="reflect-panel"><h2>¿Cuándo querés volver a esto?</h2><p>Esta es tu autoevaluación. Elegí con honestidad: pedir más práctica también es avanzar.</p><div class="confidence-options">${[
       ['again', 'Todavía me cuesta', 'Revisarlo mañana', 1],
       ['practice', 'Lo entiendo, quiero otra vuelta', 'Volver en 3 días', 3],
       ['confident', 'Puedo explicarlo sin mirar', 'Volver en una semana', 7],
@@ -786,9 +665,7 @@
       else finishNavigation();
     }
     if (action === 'surprise') {
-      const candidates = list().filter(matches);
-      const pool = candidates.filter((item) => isDue(item) || !isSolved(item));
-      const choices = pool.length ? pool : candidates;
+      const choices = surprisePool(list(), records(), filters(), Date.now());
       if (!choices.length) {
         notify('No hay desafíos con estos filtros. Probá ampliar la búsqueda.');
         return;
@@ -820,8 +697,7 @@
     if (action === 'predict') {
       const item = current(),
         record = recordFor(item.id);
-      record.prediction = Number(button.dataset.answer);
-      if (record.prediction === item.prediction.answer) record.predictionCorrect = true;
+      Object.assign(record, predictionPatch(item, Number(button.dataset.answer)));
       save();
       $$('.lab-prediction').forEach((option, index) => {
         option.setAttribute('aria-pressed', String(index === record.prediction));
@@ -883,7 +759,7 @@
     }
     if (action === 'hint') {
       const record = recordFor(selectedId);
-      record.hints = Math.min(3, (record.hints || 0) + 1);
+      Object.assign(record, hintPatch(record));
       save();
       const content = document.createElement('template');
       content.innerHTML = codeHTML(current(), record);
@@ -892,9 +768,7 @@
       $('.lab-hints')?.scrollIntoView({ block: 'nearest' });
     }
     if (action === 'reveal-solution' && !$('#lab-solution').open) {
-      const record = recordFor(selectedId);
-      record.solutionSeen = true;
-      record.assisted = true;
+      Object.assign(recordFor(selectedId), revealSolutionPatch());
       save();
     }
     if (action === 'reset-code')
@@ -902,7 +776,7 @@
         '¿Volver al código inicial?',
         'Se reemplazará el borrador de este ejercicio. Tus resultados anteriores y notas se conservan.',
         () => {
-          recordFor(selectedId).draft = current().starter;
+          Object.assign(recordFor(selectedId), restoreStarterPatch(current()));
           save();
           render();
           if (codeEditor) codeEditor.focus();
@@ -914,24 +788,17 @@
         '¿Cargar la solución de apoyo?',
         'Reemplazará tu borrador. Probá ejecutarla y cambiar una condición para comprobar que entendiste la idea.',
         () => {
-          const record = recordFor(selectedId);
-          record.draft = current().solution;
-          record.assisted = true;
+          Object.assign(recordFor(selectedId), loadSolutionPatch(current()));
           save();
           render();
           if (codeEditor) codeEditor.focus();
           else $('#lab-code')?.focus();
         },
       );
-    if (action === 'copy-code')
-      copyText(
-        buildProgram(current(), draftFor(current()), recordFor(selectedId).customTest || ''),
-      );
+    if (action === 'copy-code') copyText(programFor(current()));
     if (action === 'confidence') {
       const record = recordFor(selectedId);
-      record.confidence = button.dataset.confidence;
-      record.reviewedAt = Date.now();
-      record.reviewAt = Date.now() + Number(button.dataset.days) * 86400000;
+      Object.assign(record, selfAssessmentPatch(button.dataset.confidence, Date.now()));
       save();
       render();
       notify('Repaso agendado en tu mapa de aprendizaje.');
@@ -983,13 +850,13 @@
     }
     if (target.id === 'lab-code' || target.id === 'lab-custom-test') {
       const record = recordFor(selectedId),
-        wasCurrent = resultMatches(current(), record);
+        wasCurrent = isResultCurrent(current(), record);
       record[target.id === 'lab-code' ? 'draft' : 'customTest'] = target.value;
       save();
       updateGutter();
       updateEditorStatus();
       updateProgramPreview();
-      if (!activeRun && (wasCurrent || resultMatches(current(), record))) {
+      if (!activeRun && (wasCurrent || isResultCurrent(current(), record))) {
         $('#lab-review').innerHTML = reviewHTML(current(), record);
       }
       const hint = $('#lab-live-hint');
```

- **Pasos:**
  1. Aplicá el diff.
  2. Corré `node qa/lab-state-check.ts` (37), `node qa/boot-check.ts` y `npm test`.
  3. Corré `npm run build` y `E2E_PORT=4274 npm run test:e2e`: 184 de 184.
  4. Corré `npm run lint`: los avisos de `lab.js` bajan de 12 a 10. Salen `reviewHTML` (26) y `reflectHTML` (12); `finishedReviewHTML` y `finishedCopy` quedan en 10 o menos.
  5. Commit: `refactor(front): lab.js usa el diagnóstico, los selectores y los parches de entities/exercise y de pages/lab`.
- **Vuelta atrás:** revertí el commit.

### Tarea 4.2 · `lab.js` compone la ejecución (T014, W)

- **Parte de:** T012 y T013.
- **Cambia:**
  - **`frontend/lab.js`, con este diff:**
    - los imports de la feature;
    - el `runner` con sus dependencias, `programBuilder`, `isRunning`, `isRunningExercise` y la suscripción;
    - `runExercise` delega en `runner.run`;
    - `runner.abort()` en `unmount` (después de `host = null`, para que el repintado no corra sobre una vista que se va), en `openExercise`, en `map` y en `reset`;
    - `runner.cancel()` en `cancel-run`;
    - `updateRunUI`, `codeHTML` y `onInput` leen `isRunning()`;
    - se van `activeRun`, `activeController`, `buildProgram`, `interpretRun` y `window.TallerRunner`.
  - **`qa/lab-state-check.ts`, con este diff:**
    - el escenario de dos pestañas que ejecutaba con `window.TallerRunner` ejecuta con un `fetch` que rechaza, y el contexto suma `fetch`, `TextEncoder`, `setTimeout` y `clearTimeout`. Sus aserciones no cambian;
    - suma «Reset during a run aborts it and the late answer writes nothing» (Review Focus 3).

```diff
--- a/frontend/lab.js
+++ b/frontend/lab.js
@@ -1,10 +1,8 @@
 import {
-  buildProgram,
   draftOf,
   ensureRecord,
   exerciseCatalog,
   hintPatch,
-  interpretRun,
   isDueForReview,
   isReflectionSolved,
   isResultCurrent,
@@ -22,6 +20,11 @@
   selfAssessmentPatch,
   syncAfterRun,
 } from './src/entities/exercise';
+import {
+  buildPlaygroundProgram,
+  createExerciseRunner,
+  createPlaygroundTransport,
+} from './src/features/run-exercise';
 import { isExtraChallenge, matchesMapFilters, surprisePool, todayChallenge } from './src/pages/lab';
 import { LEVEL_LABELS } from './src/shared/config/levels';
 import { exercisePhaseOr, readLinkQuery, withLabQuery } from './src/shared/config/url-grammar';
@@ -63,9 +66,7 @@
   const records = () => labStore.getProgress().records;
   const filters = () => ({ query, dueOnly, extraOnly, level });
   const matches = (item) => matchesMapFilters(item, records(), filters(), Date.now());
-  let activeRun = null,
-    activeController = null,
-    lastFocus = null;
+  let lastFocus = null;
   let codeEditor = null;
   let simulation = {
     ownership: 'create',
@@ -113,8 +114,28 @@
   const solved = (exercise) => isSolved(records()[exercise.id]);
   const due = (exercise) => isDueForReview(records()[exercise.id], Date.now());
   const levelLabel = (exercise) => LEVEL_LABELS[levelOf(exercise)];
+  const runner = createExerciseRunner({
+    store: labStore,
+    transport: createPlaygroundTransport(),
+    now: () => Date.now(),
+    notify: (message) => notify(message),
+    isLocked: (exercise) =>
+      Boolean(window.TallerCampaign?.lockedExerciseHTML(exercise.id, exercise.language)),
+    isCampaignMission: (exercise) =>
+      Boolean(window.TallerCampaignEngine.canAttempt(exercise.id, exercise.language).worldId),
+    syncSystems: () => window.TallerSystems?.sync(),
+    syncCampaign: () => window.TallerCampaign?.sync(),
+    logError: (error) => console.error(error),
+  });
+  const programBuilder = buildPlaygroundProgram;
+  const isRunning = () => runner.state.getState().status === 'running';
+  const isRunningExercise = (id) => {
+    const run = runner.state.getState();
+    return run.status === 'running' && run.exerciseId === id;
+  };
   const programFor = (item) =>
-    buildProgram(item, draftFor(item), normalizeCustomTest(recordFor(item.id).customTest));
+    programBuilder(item, draftFor(item), normalizeCustomTest(recordFor(item.id).customTest));
+  runner.state.subscribe(() => updateRunUI());
   const langName = () => (language === 'rust' ? 'Rust' : 'Go');
   function achievementStats() {
     const items = list();
@@ -160,10 +181,8 @@
       host.removeEventListener('keydown', onKeydown);
       host.removeEventListener('scroll', onScroll, true);
     }
-    activeController?.abort();
-    activeController = null;
-    activeRun = null;
     host = null;
+    runner.abort();
   }
   function render() {
     if (!host) return;
@@ -274,9 +293,7 @@
   }
   function openExercise(id) {
     if (!exerciseCatalog.byId.has(id) || exerciseCatalog.byId.get(id).language !== language) return;
-    activeController?.abort();
-    activeRun = null;
-    activeController = null;
+    runner.abort();
     selectedId = id;
     labStore.getProgress().selected[language] = id;
     phase = 'learn';
@@ -336,7 +353,7 @@
     if (preview) preview.textContent = programFor(current());
   }
   function codeHTML(item, record) {
-    return `${executionGuideHTML()}<div class="lab-workbench"><div><section class="lab-task"><h2>Tu misión.</h2><ol>${item.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}</ol></section><div class="editor-shell"><div class="editor-toolbar"><span class="editor-file">${language === 'rust' ? 'experimento.rs' : 'experimento.go'}</span><button data-lab-action="reset-code">Restaurar inicio ↺</button></div><div class="editor-wrapper"><pre id="lab-line-numbers" class="editor-lines" aria-hidden="true">1</pre><textarea id="lab-code" name="codigo" translate="no" class="code-input" aria-label="Editor de código ${langName()}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" maxlength="30000" wrap="off">${escapeHtml(draftFor(item))}</textarea></div><div class="editor-footer"><span>Tab: sangría · Ctrl/⌘ + Enter: revisar · Esc: salir del editor</span><span id="lab-editor-status">Borrador guardado</span></div></div><div class="lab-run-bar"><button id="lab-run" class="button" data-lab-action="run" ${activeRun ? 'disabled' : ''}>${activeRun ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…' : '▷ Ejecutar y revisar'}</button><button class="text-button" data-lab-action="copy-code">Copiar programa completo ↗</button></div><p class="lab-run-disclosure">Al ejecutar, se envía este código al <a href="${language === 'rust' ? 'https://play.rust-lang.org/' : 'https://go.dev/play/'}" target="_blank" rel="noopener noreferrer">Playground oficial de ${langName()}</a>. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.</p>${programPreviewHTML(item)}${customEditorHTML(item, record)}<div class="lab-hints"><div class="hints-top"><h3>Un empujón, si lo necesitás.</h3><span>${record.hints || 0}/3 pistas</span></div>${item.hints
+    return `${executionGuideHTML()}<div class="lab-workbench"><div><section class="lab-task"><h2>Tu misión.</h2><ol>${item.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}</ol></section><div class="editor-shell"><div class="editor-toolbar"><span class="editor-file">${language === 'rust' ? 'experimento.rs' : 'experimento.go'}</span><button data-lab-action="reset-code">Restaurar inicio ↺</button></div><div class="editor-wrapper"><pre id="lab-line-numbers" class="editor-lines" aria-hidden="true">1</pre><textarea id="lab-code" name="codigo" translate="no" class="code-input" aria-label="Editor de código ${langName()}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" maxlength="30000" wrap="off">${escapeHtml(draftFor(item))}</textarea></div><div class="editor-footer"><span>Tab: sangría · Ctrl/⌘ + Enter: revisar · Esc: salir del editor</span><span id="lab-editor-status">Borrador guardado</span></div></div><div class="lab-run-bar"><button id="lab-run" class="button" data-lab-action="run" ${isRunning() ? 'disabled' : ''}>${isRunning() ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…' : '▷ Ejecutar y revisar'}</button><button class="text-button" data-lab-action="copy-code">Copiar programa completo ↗</button></div><p class="lab-run-disclosure">Al ejecutar, se envía este código al <a href="${language === 'rust' ? 'https://play.rust-lang.org/' : 'https://go.dev/play/'}" target="_blank" rel="noopener noreferrer">Playground oficial de ${langName()}</a>. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.</p>${programPreviewHTML(item)}${customEditorHTML(item, record)}<div class="lab-hints"><div class="hints-top"><h3>Un empujón, si lo necesitás.</h3><span>${record.hints || 0}/3 pistas</span></div>${item.hints
       .slice(0, record.hints || 0)
       .map(
         (hint, index) =>
@@ -347,7 +364,7 @@
       )}<button class="button small secondary" data-lab-action="hint" ${(record.hints || 0) >= 3 ? 'disabled' : ''}>${record.hints ? 'Otra pista' : 'Dame una pista'}</button><details class="solution-panel" id="lab-solution"><summary data-lab-action="reveal-solution">Ver una solución razonada</summary><p>Usarla como apoyo es válido. Después cerrala y reconstruí la idea. Este intento quedará identificado como práctica con solución.</p><pre class="solution-code" translate="no">${escapeHtml(item.solution)}</pre><p>${escapeHtml(item.review.success)}</p><button class="button small secondary" data-lab-action="load-solution">Cargarla y experimentar</button></details></div></div><aside class="lab-coach" aria-label="Revisión del ejercicio"><div class="coach-heading"><div class="coach-avatar" aria-hidden="true">[?]</div><div><h2>Tu revisor didáctico</h2><span>COMPILADOR + CASOS EXPLICADOS</span></div></div><div class="coach-content" id="lab-review" aria-live="polite">${reviewHTML(item, record)}</div></aside></div><div class="lab-phase-footer"><p>Que compile es el primer paso. Abrí cada prueba para entender qué comprueba y qué deja afuera.</p><button class="button secondary" data-lab-action="phase" data-phase="reflect">Ponerlo en palabras →</button></div>`;
   }
   function reviewHTML(item, record) {
-    const review = reviewStateOf(item, record, activeRun?.id === item.id);
+    const review = reviewStateOf(item, record, isRunningExercise(item.id));
     if (review.kind === 'running')
       return '<h3>Probemos tu hipótesis.</h3><p>El compilador está revisando el programa. Después ejecutamos los casos del ejercicio y conectamos cada resultado con el concepto.</p><p class="runner-status busy"><span class="lab-spinner" aria-hidden="true"></span> Ejecutando código real…</p><button class="text-button" data-lab-action="cancel-run">Cancelar ejecución</button>';
     if (review.kind === 'unrun' || review.kind === 'stale')
@@ -392,83 +409,8 @@
       })
       .join('')}</div>`;
   }
-  async function runExercise() {
-    const item = current();
-    if (activeRun) return;
-    if (window.TallerCampaign?.lockedExerciseHTML(item.id, language)) {
-      notify('Completá los requisitos de esta misión en tu campaña.');
-      return;
-    }
-    const record = recordFor(item.id),
-      code = draftFor(item),
-      customTest = normalizeCustomTest(record.customTest);
-    if (!code.trim()) {
-      notify('Escribí una solución o restaurá el inicio.');
-      return;
-    }
-    record.attempts = (record.attempts || 0) + 1;
-    save();
-    const run = { id: item.id, code };
-    activeRun = run;
-    activeController = new AbortController();
-    updateRunUI();
-    try {
-      let runnerResult;
-      try {
-        runnerResult = await window.TallerRunner.run({
-          language: item.language,
-          code: buildProgram(item, code, customTest),
-          signal: activeController.signal,
-        });
-      } catch (error) {
-        if (activeRun !== run || error.name === 'AbortError') return;
-        record.result = {
-          code,
-          customTest,
-          customPassed: false,
-          success: false,
-          stdout: '',
-          stderr: error.message || 'No se pudo conectar al compilador.',
-          transportError: true,
-          tests: [],
-          time: Date.now(),
-        };
-        save();
-        return;
-      }
-      if (activeRun !== run) return;
-      const { result, solved } = interpretRun(item, runnerResult, {
-        code,
-        customTest,
-        now: Date.now(),
-      });
-      record.result = result;
-      if (solved) {
-        const first = !record.solvedAt;
-        record.solvedAt = record.solvedAt || Date.now();
-        if (!record.reviewAt) record.reviewAt = Date.now() + 86400000;
-        notify(
-          first
-            ? '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.'
-            : 'Estos casos siguen funcionando. Probá una variante.',
-        );
-      }
-      save();
-      syncAfterRun({
-        syncSystems: () => window.TallerSystems?.sync(),
-        syncCampaign: () => window.TallerCampaign?.sync(),
-        isCampaignMission: () =>
-          Boolean(window.TallerCampaignEngine.canAttempt(item.id, language).worldId),
-        notify,
-        logError: (error) => console.error(error),
-      });
-    } finally {
-      if (activeRun === run) {
-        activeRun = null;
-        activeController = null;
-        updateRunUI();
-      }
-    }
+  function runExercise() {
+    return runner.run(current());
   }
   function updateRunUI() {
     if (!host || mode !== 'exercise') return;
@@ -489,8 +431,8 @@
     if (phase !== 'code') return;
     const button = $('#lab-run');
     if (button) {
-      button.disabled = Boolean(activeRun);
-      button.innerHTML = activeRun
+      button.disabled = isRunning();
+      button.innerHTML = isRunning()
         ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…'
         : '▷ Ejecutar y revisar';
     }
@@ -652,8 +594,7 @@
     }
     if (action === 'open') openExercise(button.dataset.id);
     if (action === 'map') {
-      activeController?.abort();
-      activeRun = null;
+      runner.abort();
       finishNavigation();
       host?.scrollIntoView({ block: 'start' });
     }
@@ -737,7 +678,7 @@
         input.value = test.expression;
         save();
         updateProgramPreview();
-        if (!activeRun) updateRunUI();
+        if (!isRunning()) updateRunUI();
       }
       $('.custom-test-panel').open = true;
       input.focus();
@@ -750,13 +691,7 @@
       );
     }
     if (action === 'run') runExercise();
-    if (action === 'cancel-run') {
-      activeController?.abort();
-      activeRun = null;
-      activeController = null;
-      updateRunUI();
-      notify('Ejecución cancelada. Tu código sigue guardado.');
-    }
+    if (action === 'cancel-run') runner.cancel();
     if (action === 'hint') {
       const record = recordFor(selectedId);
       Object.assign(record, hintPatch(record));
@@ -856,7 +791,7 @@
       updateGutter();
       updateEditorStatus();
       updateProgramPreview();
-      if (!activeRun && (wasCurrent || isResultCurrent(current(), record))) {
+      if (!isRunning() && (wasCurrent || isResultCurrent(current(), record))) {
         $('#lab-review').innerHTML = reviewHTML(current(), record);
       }
       const hint = $('#lab-live-hint');
@@ -934,8 +869,7 @@
       selectedId = null;
       mode = 'map';
       phase = 'learn';
-      activeController?.abort();
-      activeRun = null;
+      runner.abort();
       return removed;
     },
   };
```

```diff
--- a/qa/lab-state-check.ts
+++ b/qa/lab-state-check.ts
@@ -471,7 +471,7 @@
 interface TabOptions {
   failRemove?: boolean;
   campaignSync?: () => { xpGained?: number } | undefined;
-  runner?: () => Promise<unknown>;
+  fetch?: () => Promise<unknown>;
 }
 interface Tab {
   lab: TallerLabApi;
@@ -536,6 +536,10 @@
     history: { replaceState: () => undefined },
     document: { createElement: stubElement, activeElement: null },
     console: { error: (error: unknown) => errors.push(error) },
+    fetch: options.fetch,
+    TextEncoder,
+    setTimeout,
+    clearTimeout,
     localStorage: {
       getItem: (key: string) => saved.get(key) ?? null,
       setItem: (key: string, value: string) => void saved.set(key, value),
@@ -555,7 +559,6 @@
     };
     window.TallerCampaignEngine = { canAttempt: () => ({ worldId: 'mundo-1' }) };
   }
-  if (options.runner) window.TallerRunner = { run: options.runner };
   loadLab(context);
   const lab = window.TallerLab as TallerLabApi;
   lab.mount(host, 'rust', (message) => notices.push(message));
@@ -661,7 +664,7 @@
   async () => {
     const saved = new Map<string, string>();
     const tabA = openTab(saved);
-    const tabB = openTab(saved, { runner: () => Promise.reject(new Error('sin red')) });
+    const tabB = openTab(saved, { fetch: () => Promise.reject(new TypeError('sin red')) });
     tabB.click('open', { id: 'rust-02' });
     const { lab } = tabA;
     lab.applyImport(
@@ -676,6 +679,29 @@
   },
 );

+// «Borrar todo» while a run waits: TallerLab.reset aborts it, and the late answer writes nothing
+// (spec 021, FR-050). The fetch answers only after the reset.
+await testAsync('Reset during a run aborts it and the late answer writes nothing', async () => {
+  const saved = new Map<string, string>();
+  let answer: (value: unknown) => void = () => undefined;
+  const tab = openTab(saved, {
+    fetch: () =>
+      new Promise((resolve) => {
+        answer = resolve;
+      }),
+  });
+  tab.click('open', { id: 'rust-02' });
+  tab.click('run');
+  assert.equal(storedRecords(saved)['rust-02'].attempts, 1);
+
+  assert.equal(tab.lab.reset(), true);
+  answer({ ok: true, status: 200, json: async () => ({ success: true, stdout: '', stderr: '' }) });
+  await new Promise((resolve) => setTimeout(resolve, 0));
+
+  assert.deepEqual(storedRecords(saved), {});
+  assert.deepEqual(tab.notices, []);
+});
+
 test('One tab: emptied draft and reflection reload empty, without merging anything', () => {
   const saved = new Map<string, string>();
   const first = openTab(saved);
```

- **Pasos:**
  1. Aplicá los dos diffs.
  2. Corré `node qa/lab-state-check.ts`: 38 de 38.
  3. **Mutación,** descartada después: borrá `runner.abort();` de `reset()` en `lab.js`. «Reset during a run…» falla. Volvé a ponerla.
  4. Corré `grep -n "TallerRunner\|activeRun\|activeController\|buildProgram\|interpretRun" frontend/lab.js`: nada.
  5. Corré `npm test`, `npm run build` y `E2E_PORT=4274 npm run test:e2e`: 184 de 184.
  6. Corré `npm run lint`: los avisos de `lab.js` bajan a 9, porque sale `runExercise` (17).
  7. Commit: `refactor(front): lab.js compone features/run-exercise con el adaptador de los Playgrounds y deja de leer TallerRunner`.
- **Vuelta atrás:** revertí el commit.

### Tarea 4.3 · Se retira `TallerRunner` (T015, W)

- **Cambia:**
  - `frontend/src/app/boot/legacy-views.ts`: sale una línea (compartido con F5 y F6);
  - `qa/runner-check.ts`: carga `shared/api/playground` con `runModule`, y sus 12 escenarios no cambian;
  - `qa/lab-state-check.ts`: suma el aislamiento de `lab.js` (FR-015).
- **Borra:** `frontend/src/app/legacy/register-runner.ts`.

```diff
--- a/frontend/src/app/boot/legacy-views.ts
+++ b/frontend/src/app/boot/legacy-views.ts
@@ -3,7 +3,6 @@
 // qa/load-order-check.ts reads this list: one `() => import('…'),` per line, in evaluation order.
 const LEGACY_MODULES: readonly (() => Promise<unknown>)[] = [
   () => import('../legacy/register-catalogs'),
-  () => import('../legacy/register-runner'),
   () => import('../legacy/register-editor'),
   () => import('../../../lab-explorers.js'),
   () => import('../../../quest-explorers.js'),
```

```diff
--- a/qa/runner-check.ts
+++ b/qa/runner-check.ts
@@ -1,6 +1,6 @@
 import assert from 'node:assert/strict';
 import vm from 'node:vm';
-import { runSource } from './lib/sources.ts';
+import { runModule } from './lib/sources.ts';

 interface FakeResponse {
   ok: boolean;
@@ -28,14 +28,12 @@
 interface Runner {
   run: (input: RunInput) => Promise<RunResult>;
 }
-interface RunnerWindow {
-  TallerRunner: Runner;
+interface PlaygroundModule {
+  runCode: (input: RunInput) => Promise<RunResult>;
 }

 function setup(fetchFn: FetchFn, quick = false): Runner {
-  const window = {} as RunnerWindow;
   const context = vm.createContext({
-    window,
     fetch: fetchFn,
     TextEncoder,
     AbortController,
@@ -43,8 +41,11 @@
     setTimeout: quick ? (fn: () => void) => setTimeout(fn, 5) : setTimeout,
     clearTimeout,
   });
-  runSource(context, 'frontend/src/app/legacy/register-runner.ts');
-  return window.TallerRunner;
+  const { runCode } = runModule<PlaygroundModule>(
+    context,
+    'frontend/src/shared/api/playground/index.ts',
+  );
+  return { run: runCode };
 }
 const response = (data: unknown, status = 200): FakeResponse => ({
   ok: status >= 200 && status < 300,
```

```diff
--- a/qa/lab-state-check.ts
+++ b/qa/lab-state-check.ts
@@ -5,7 +5,7 @@
 import vm from 'node:vm';
 import { loadCampaignEngine, loadLab, loadLabCatalogs } from './lib/legacy-sources.ts';
 import { plainJson as plain } from './lib/plain-json.ts';
-import { importModule, repoRoot } from './lib/sources.ts';
+import { bundleSource, importModule, repoRoot } from './lib/sources.ts';

 interface Evidence {
   id: string;
@@ -796,5 +796,16 @@
   assert.deepEqual([...saved.entries()], before);
 });

+// lab.js is bundled alone and loaded beside register-campaign-engine.ts: it must carry the lab
+// store once and no engine (spec 021, FR-015).
+test('lab.js bundles the lab store once and no engine or route store', () => {
+  const bundle = bundleSource('frontend/lab.js');
+  const occurrences = (key: string) => bundle.split(key).length - 1;
+  assert.equal(occurrences('taller-laboratorio-v1'), 1);
+  assert.equal(occurrences('taller-campaign-v1'), 0);
+  assert.equal(occurrences('taller-systems-v1'), 0);
+  assert.equal(occurrences('taller-learning-v1'), 0);
+});
+
 console.log(passed + ' lab state scenarios passed; ' + failed + ' failed.');
 if (failed) process.exitCode = 1;
```

- **Pasos:**
  1. Re-apuntá `runner-check` primero y corré `node qa/runner-check.ts`: 12 de 12, todavía con el archivo viejo.
  2. Borrá `register-runner.ts` y su línea de `legacy-views.ts`.
  3. Corré `node qa/load-order-check.ts` (23 imports), `node qa/runner-check.ts` (12), `node qa/lab-state-check.ts` (39) y `node qa/boot-check.ts`.
  4. **Mutación,** descartada después: agregá `import './src/entities/campaign';` al principio de `lab.js`. «lab.js bundles the lab store once…» falla con 1 en `taller-campaign-v1`. Sacala.
  5. Corré `grep -rn "TallerRunner\|register-runner" frontend qa`: nada.
  6. Corré `npm test`, `npm run build` y `E2E_PORT=4274 npm run test:e2e`: 184.
  7. Commit: `refactor(front): retira window.TallerRunner y register-runner.ts; runner-check carga el cliente de los Playgrounds`.
- **Compuerta de U4:** §0.2.
- **Vuelta atrás:** revertí el commit; el adaptador y el global vuelven.

## 5. Cierre (coordinador K)

### Tarea 5.1 · La documentación (T016, K)

**Cubre:** FR-066 (la parte de F7a).

| Archivo | Cambio |
| --- | --- |
| `docs/architecture.md`, mapa de archivos | La fila «Transporte a los Playgrounds oficiales» pasa a `frontend/src/shared/api/playground/`, con el adaptador `features/run-exercise/api/playground-transport.ts`, y sin `register-runner.ts`. Fila nueva: «Ejecución de un ejercicio (F7a)» → `frontend/src/features/run-exercise/` (puerto, estado y orquestación; contrato en `specs/021-f7-laboratorio/contracts/run-exercise.md`). La fila «Evidencia de aprobación…» suma el diagnóstico, la pista en vivo, los selectores, los parches y el clasificador del revisor. La de «Laboratorio, revisión y modelos educativos» suma `frontend/src/pages/lab/model` (los selectores del mapa) |
| `docs/architecture.md`, «Estado actual» de Feature-Sliced Design | Suma `pages/lab` (sólo `model`, hasta F7b) y `features/run-exercise` |
| `qa/AGENTS.md`, tabla «Elegir comprobaciones» | La fila «Ejercicios o contratos de revisión» suma `npm run test:unit -- features/run-exercise entities/exercise`. La fila de E2E nombra las specs `lab-*.spec.ts` |
| `AGENTS.md` | No cambia: la lista de vistas legacy es la misma |

- **Pasos:**
  1. Verificá las rutas y los enlaces.
  2. Corré `git diff --check`.
  3. Commit: `docs: el transporte como puerto de features/run-exercise y las reglas del laboratorio en entities/exercise`.

### Tarea 5.2 · Compuerta y PR (T017, K)

- **La compuerta final de §0.2:** el tamaño, el `grep` en 0, ningún estilo en línea y la correspondencia (§6).
- **La descripción del PR**, en inglés:
  - el contexto (P2, F7-Q1, F7-Q2 y C4);
  - qué faltaba y por qué: el seam de A4;
  - qué cambia;
  - cómo se verificó: los comandos y los números (antes y después, el HTML, los avisos y los E2E);
  - la correspondencia de §6;
  - lo que A4 y F7b toman (§7);
  - lo pendiente: los hallazgos del informe.
- **El título:** `refactor(lab): move the run, the diagnosis and the record rules out of lab.js behind a transport port (F7a)`.
- **El PR cubre:** FR-001 a FR-006, FR-012, FR-015, FR-016, FR-018, FR-019, FR-029, FR-043 a FR-055, FR-060 a FR-063 y FR-066 (las partes de F7a); SC-001, SC-002 (`TallerRunner`), SC-003 (las fixtures), SC-006 a SC-012 (las partes de F7a).
- **Reversión de F7a:** se revierten T015 a T002 en orden inverso. Cada commit deja la red en verde (FR-006).

## 6. La correspondencia de los checks (FR-063, la parte de F7a)

**`runner-check` (12 escenarios):** los 12 siguen iguales; sólo cambia cómo carga el módulo (`runModule` sobre `frontend/src/shared/api/playground/index.ts`, en lugar de `runSource` sobre `register-runner.ts`). Lo retira A4 con el cliente.

**`lab-state-check` (37 en la base, 39 después):**

| Escenarios | Qué les pasa en F7a |
| --- | --- |
| Los 24 de almacén, importación y carga | Sin cambios |
| «Two tabs: a run keeps writing its held record after the save that merged the other tab» | Cambia la inyección (un `fetch` que rechaza en lugar de `window.TallerRunner`); las tres aserciones son las mismas y recorre el adaptador, `runCode` y la falla de red |
| Los otros 12 con el DOM falso: dos pestañas, la planificación de la importación, la predicción y su XP, la reflexión, el guardado degradado y el reset | Sin cambios; pasan por las reglas nuevas a través de `lab.js` |
| Nuevo: «Reset during a run aborts it and the late answer writes nothing» | FR-050 y US4-5 sin E2E (F8-Q1) |
| Nuevo: «lab.js bundles the lab store once and no engine or route store» | FR-015, el aislamiento de `lab.js` |

F7b lleva los escenarios de vista a specs de componente o a E2E (su parte de FR-063).

**Sin cambios:** `exercise-evidence-check`, `runtime-check`, `boot-check`, `load-order-check` (pasa de 24 a 23 imports, sin cambiar sus restricciones), `seams-guard-check`, `lab-bridge-check` y `quest-explorers-check`.

## 7. Lo que A4 y F7b toman de F7a

| Quién | Toma | Dónde |
| --- | --- | --- |
| A4 | El puerto, el estado genérico, la orquestación, `buildRunResult` y la raíz donde cambia el par transporte y constructor | [contracts/run-exercise.md](./contracts/run-exercise.md) §1 a §6 |
| A4 | Los E2E que usan el doble de los Playgrounds: los 11 de F1 y los 13 de `lab-run.spec.ts`; y el texto de los intentos en `qa/e2e/lib/lab-copy.ts` | §1, T005 |
| A4 | `reviewStateOf` y `diagnose` en `entities/exercise`, donde su FR-018 hace ganar la explicación del servidor | §2, T009 |
| F7b | Los 61 E2E sin editar, `LabPage`, las reglas, los selectores del mapa, el `runner` (que pasa de `lab.js` al adaptador de `app/legacy/`) y `programBuilder` por props | §1 a §4 |
| F7b | Si A4 entró antes, los estados de A4 que `lab.js` dibuja en `reviewHTML`, que F7b porta como comportamiento vigente | Ruling C4 |

## 8. Cobertura de requisitos (F7a)

| Requisito | Tareas | Cómo |
| --- | --- | --- |
| FR-001 | T002 a T007, T013 a T015 | 61 E2E contra el legacy, sin editar después; ninguno fija X1 |
| FR-002 | T002, todas las de U4 | Los 123 de F1 y A2 sin editar; el Page Object y los dobles sólo suman |
| FR-003 | T009, T012, T017 | Sin dependencias ni estilos en línea; `grep` en la compuerta |
| FR-004 | T001, T017 | `html.length` antes y después, bajo 1 250 000 |
| FR-005 | T001, T013, T014, T017 | Los avisos de `lab.js` bajan de 12 a 9, el total de 35 a 32 y ninguna función nueva pasa de 10 |
| FR-006 | todas | Cada commit revertible y la red en verde; TDD en U2 y U3 |
| FR-012 (F7a) | T015 | Sale `TallerRunner` con `register-runner.ts`; `runner-check` re-apuntado |
| FR-015 (F7a) | T012, T015 | La spec de aislamiento de la feature; la cadena sin `register-runner`; el aislamiento de `lab.js` |
| FR-016 | T003 a T006, T013, T014 | `storage.watchWrites()` en cada fila de «Lo que guarda y cuándo» que toca F7a; los parches |
| FR-018 | T006, T009 | Las tres fixtures sin escrituras; ninguna forma nueva |
| FR-019 | T011, T014 | La relectura después de esperar; el escenario de dos pestañas |
| FR-029 (lógica) | T008, T009, T013 | `reviewStateOf` da los seis estados de la spec (con «sin resultado» y «vencido» por separado); `reviewHTML` lo usa |
| FR-043 | T011, T012 | `createExerciseRunner`, con las dependencias inyectadas |
| FR-044 | T014 | `lab.js` como raíz; nadie lee `window.TallerRunner` |
| FR-045 a FR-048 | T011, T012 | `RunRequest`, `RunVerdict`, `countsLocalAttempts` y `RunState<Progress>` |
| FR-049 | T012 | `createPlaygroundTransport` con `buildProgram`, `runCode` y `readTestMarkers` |
| FR-050 | T011, T014, T005 | `cancel()` y `abort()`; los E2E de cancelar, abrir otro ejercicio y salir; el reset en `lab-state-check` |
| FR-051 (el parámetro) | T011, T013, T014 | `ProgramBuilder`, `buildPlaygroundProgram` y `programFor` |
| FR-052 | T009, T012 | `buildRunResult` único; `readTestMarkers`; `sanitizeResult` sin cambios |
| FR-053 | T008, T009 | `diagnose` y `liveHint` movidos, con specs a mano |
| FR-054 | T008 a T010 | Los selectores del registro y del mapa |
| FR-055 | T008, T009 | Los parches |
| FR-060 | T002 a T006 | US1 a US4 con Page Objects |
| FR-061 | T007 | Los nueve tipos de explorador |
| FR-062 (modelo) | T008, T010, T011 | 11 specs de Vitest en `node` |
| FR-063 (F7a) | T014, T015 | La correspondencia de §6 |
| FR-066 (F7a) | T016 | `docs/architecture.md` y `qa/AGENTS.md` |

| Criterio de éxito | Tareas |
| --- | --- |
| SC-001 | T007, T013 a T015 (184 E2E) |
| SC-002 (`TallerRunner`) | T015 |
| SC-003 (las fixtures en 0 escrituras; la comparación byte a byte es de F7b) | T006 |
| SC-006 | T011, T012 |
| SC-007 (F7a) | T015 (`npm test` y §6) |
| SC-008 | T017 |
| SC-009 | T013, T014, T017 |
| SC-010 (los 13 destinos de hoy) | T003 a T007 |
| SC-011 (F7a) | T012, T017 |
| SC-012 | T006, T015 (`curriculum-ids-check` y `lab-state-check` en verde; `exportState` no cambia porque F7a no toca el almacén) |

## Descargas y permisos

Ninguna. F7a no suma dependencias. El navegador de Playwright ya lo bajó F1.

## Riesgos y lo que quedó sin verificar

1. **La base real puede diferir de `f2b-acum`.** Si F5 o F6 entran antes, cambian `legacy-views.ts` y los números de la línea base. *Mitigación:* T001 mide; el código de F7a no toca lo de ellos.
2. **Los E2E dependen de textos y clases de hoy que F7b tiene que conservar** (FR-007): `.lab-metrics`, `#lab-filter-status`, `.challenge-node`, `.hint-item`, `#lab-reflect-status`, `.lab-explorer` y `details.qx-history`, entre otros. *Mitigación:* son el DOM que la spec obliga a conservar, y entran por el Page Object.
3. **`rust-02` es misión de campaña.** Con el progreso que derivan del laboratorio, su aprobación muestra el aviso de XP. *Mitigación:* las ejecuciones libres usan `rust-01` (research.md, R11).
4. **El reloj de un cierre** (R4): con el reloj real, `time`, `solvedAt` y `reviewAt` pueden diferir de hoy en milisegundos. Ningún contrato lo observa.
5. **No corrieron:** Docker (`docker compose build taller`, que lo corre K con permiso en T017), la CI, macOS y la imagen web.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| El puerto y el estado genéricos en el progreso (`ExerciseTransport<Progress>` y `RunState<Progress>`) | El clarify pide que A4 sume sus estados sin cambiar la feature (F7-Q2) | Una unión cerrada en la feature: obliga a A4 a editarla. Un mapa de interfaces con `declare module`: es más ingenioso que simple (research.md, R1) |
