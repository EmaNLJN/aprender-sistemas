# Implementation Plan: F2a · Seams sin cambio visible, unidades 1 a 4

**Branch**: `009-f2-seams` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-f2-seams/spec.md`, en su parte a: las unidades 1 a 4 (FR-001 a FR-042). Decisiones y mediciones: [research.md](./research.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completas las «Reglas para todos los agentes», «Línea base y compuerta de cada unidad», «Contratos comunes de la unidad 1» y la sección de tu dueño. `tasks.md` tiene una línea por tarea (T001…) y remite acá.
>
> **Decisiones del usuario.** El clarify de F2 se respondió el 2026-10-06 y está en `## Clarifications` de la spec. Este plan aplica la partición en F2a y F2b, Q2 (guard automático, prueba por el singleton y Sistemas que lanza sin `init`) y Q3 (Zustand para la suscripción); Q1 y Q4 sólo afectan a F2b y no se planifican acá. «Decisiones del usuario (clarify del 2026-10-06)» dice dónde se aplica cada una. La unidad 1 se rehízo con Zustand; las unidades 2 y 4 no cambian: el catálogo y el registro de modelos no son almacenes ni motores.
>
> **Código verificado.** Se planificó sin tocar el código de producción del repositorio y sin instalar nada. Lo que corrió de verdad:
>
> - **En este worktree** (`master` más los documentos de `spec/front-react`, `0df5b07`): `npm ci --offline --no-audit --no-fund` (193 paquetes, 5 s), `npm run build` (13 s), `npm test` (30 checks, 13 s), `npm run lint` (0 errores y 35 avisos de complejidad), `npm run format:check`, los hashes y tamaños de [research.md](./research.md) («Línea base») y el conteo de escenarios de cada check.
> - **En una copia de `feat/f1-red-de-seguridad` (`8932fa6`), fuera del repositorio,** con el `node_modules` del worktree de F1 y el navegador de la caché de Playwright:
>   - la red de F1 completa en verde sobre la base (106 de 106);
>   - con el motor de Sistemas lanzando antes de `init`: los 30 checks y los 106 E2E en verde, y falla sólo la prueba `KNOWN DEFECT` de Sistemas de Vitest (1 de 3), que la unidad 1 invierte;
>   - con `app.js` exportando `startApp()` y `main.tsx` llamándolo: el build con los mismos hashes de `dump-globals` y de `dump-dist-globals`, y el mismo `<style>` y el mismo marcado; `boot-check` 10 de 10 y los 106 E2E en verde; en rojo, `load-order-check` y 47 de los 51 escenarios de `app-shell-check`, que es lo que predice la unidad 3;
>   - con `runModule` (esbuild con `globalName`), `app-shell-check` vuelve a 51 de 51; el bundle de `main.tsx` sin su llamada se evalúa sin errores y deja `#main` vacío;
>   - prototipos que compilan y pasan: el catálogo con su contenedor, `buildProgram` movido (822 programas iguales a los de `lab.js` sobre los 274 ejercicios), `mergeModelGroups` (25 modelos y su orden) y el almacén del recorrido con la fixture de master, hecho con la señal propia que Q3 descartó (17 pruebas de Vitest en 6 archivos, con las de esa señal); `npm run typecheck` en verde y `eslint` sin avisos nuevos.
> - **Zustand 5.0.15, sin instalarlo en el repositorio.** El usuario autorizó la descarga, pero la instala T008. Se leyó la documentación oficial ([`createStore`](https://zustand.docs.pmnd.rs/reference/apis/create-store), [`useStore`](https://zustand.docs.pmnd.rs/reference/hooks/use-store) y [estado inmutable](https://zustand.docs.pmnd.rs/learn/guides/immutable-state-and-merging); Context7 no estaba disponible) y el código publicado, `esm/vanilla.mjs`, que se bajó de unpkg al directorio temporal. Sobre ese archivo corrieron scripts descartables, fuera del repositorio:
>   - la semántica del store (oyentes, `Object.is`, baja repetida y un oyente que lanza);
>   - su empaquetado con las opciones de `bundleSource` y de `importModule` de `qa/lib/sources.ts`, sobre una copia mínima del paquete;
>   - el tipado estricto de un singleton y de un consumidor de React, con la versión de TypeScript del repositorio;
>   - su peso minificado: 354 caracteres con el esbuild del repositorio.
> - **Qué no corrió:** Zustand dentro del repositorio (la instalación, Vite, Vitest y los arneses completos de `qa/`), el almacén del laboratorio (sólo sus firmas compilan, y con la señal propia), la suscripción de los motores, el guard, los arneses completos de la unidad 3, la imagen web de Docker, la CI y macOS. Vitest no está en el lockfile de esta rama: las pruebas de Vitest corrieron sólo en la copia de F1.

## Summary

F2a deja, antes de portar la primera vista y antes de que A2 difiera la cadena, los almacenes, los motores, el catálogo, el arranque y el registro de modelos de Sistemas como módulos con nombre y contrato. No cambia nada de lo que el alumno ve ni de lo que guarda. El enfoque:

- **Cuatro unidades, cuatro PR, en este orden: 2, 4, 1 y 3** (FR-001 y FR-019). La 2 y la 4 salen primero y a la vez, porque tocan archivos disjuntos; la 1 espera a la 2 sólo en lo que toca `lab.js`; la 3 espera a las tres. A2 empieza cuando las cuatro están integradas.
- **La red de F1 es el juez de cada unidad.** Los 106 E2E pasan antes y después de cada una, sin editarse. Las dos specs de Vitest de riesgo de F1 se invierten en la unidad 1 (Clarifications, Q2).
- **Hasta la unidad 3, todo se abre cuando se abre hoy.** Las unidades 2 y 1 mueven el catálogo y los almacenes a módulos, pero `lab.js` y `app.js` siguen llamándolos al evaluarse; recién la 3 mueve esas llamadas a `TallerLab.init` y `startApp()`. Así cada reversión devuelve un estado que funcionaba.
- **La suscripción es de Zustand, y su único estado es una revisión.** Cada almacén y cada motor expone `changes`, un store de `zustand/vanilla` cuya revisión sube en uno por operación. El progreso no se copia al store: el laboratorio lo muta en el lugar, y la revisión es lo único que un componente puede seleccionar con seguridad. La dependencia (`zustand` 5.0.15, exacta, con su aviso de licencia) la instala K en T008, el primer commit de la unidad 1.
- **Un guard automático como check de `qa/`,** que impide abrir una clave de progreso, crear un segundo motor o importar un singleton desde un archivo legacy que no es su dueño, y que cuida que `entities`, `features` y `shared` no importen el currículo.
- **«Mismos bytes» se prueba con cinco hashes y un tope de tamaño** (sección «Línea base y compuerta de cada unidad»): `build/curriculum.json`, `dump-globals`, `dump-dist-globals`, `<style>` y marcado del dist, más `frontend/src/index.html`. Cada unidad suma además una comparación única contra el commit base.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`, y JavaScript legacy en `frontend/*.js` (sin tipos: `checkJs` está en `false`). Node 24.21.0, Vite 8.3.2, esbuild 0.28.2, Vitest 5.0.3 y `@playwright/test` 1.63.0 (los instala F1).

**Primary Dependencies**: una nueva (FR-010): `zustand` 5.0.15, en versión exacta como el resto, y sólo `zustand/vanilla` (Q3). Sin dependencias de ejecución; pesa 95 173 bytes desempaquetada y suma 354 caracteres minificados al script del dist (unos 480 con cuatro stores) (research.md, R13). El usuario autorizó la descarga el 2026-10-06.

**Storage**: las cuatro claves de `localStorage` y sus ranuras de respaldo, sin cambios de formato (ADR 0003). F2a no escribe ni lee nada que hoy no se lea.

**Testing**: Vitest en el proyecto `node` (specs junto al módulo), los checks de `qa/*-check.ts`, los 106 E2E de F1 contra el build servido y una comparación única por unidad. Los valores esperados salen de las fixtures congeladas, de la spec y de ejemplos resueltos a mano, nunca de los módulos que se prueban.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS (los hashes usan `node`, no `sha256sum`).

**Project Type**: aplicación web (front React/TypeScript con vistas legacy). Es un refactor.

**Performance Goals**: ninguna. Se informa el tamaño del HTML y el tiempo de `npm test` antes y después de cada unidad.

**Constraints**:

- los tres oráculos, `<style>` y marcado con los mismos bytes después de cada unidad;
- el HTML crece como máximo 12 000 caracteres en toda F2a (tope de `qa/build-check`: 2 500 000; base: 2 186 460; lo nuevo se estima en unos 5 700, ver research.md, R10);
- ningún `style=` nuevo (FR-008), ninguna dependencia fuera de `zustand` y ningún global nuevo (FR-010 y FR-017);
- los 106 E2E de F1 y los 30 checks en verde antes y después de cada unidad;
- los cinco adaptadores de catálogos y `pages/atlas/model/atlas-catalog.ts` conservan su ruta (FR-004).

**Scale/Scope**: unos 8 módulos y unas 11 specs nuevas, 2 archivos de QA nuevos (el guard y su biblioteca); cambian unos 16 archivos de producción, 11 de QA, 3 de dependencias y avisos (`package.json`, `package-lock.json` y `frontend/THIRD-PARTY-NOTICES.txt`) y 2 documentos. Las seis vistas legacy tienen 29 avisos de complejidad (de 35 en total) y F2a no suma ninguno.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa, sin desvíos de la constitución; Complexity Tracking registra una decisión de diseño.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `AGENTS.md`: TypeScript y ES modules, Feature-Sliced Design, Vitest para la lógica, sin globals nuevos y Zustand para el estado de cliente compartido, con selectores chicos, sin componentes suscriptos al store completo ni valores derivados guardados, e instalado con su primer caso real, que es esta unidad 1 (Q3). La regla no necesita una excepción: `AGENTS.md` no cambia. |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con una spec que falla por comportamiento: los módulos nuevos nacen como firmas que lanzan «not implemented», así que la falla nunca es un import roto. Los valores esperados salen de las fixtures congeladas (`qa/fixtures/`), de la spec o de un ejemplo escrito a mano. El guard se prueba con una violación deliberada. |
| III. Código entendible | Sí | Lo que se mueve no se reescribe: `startApp` es el cuerpo de la IIFE de hoy y las funciones de lectura se copian con sus tipos. Las dos que pasan de 10 de complejidad (`parseProgress`, 22, y `sanitizeRecord`, 14) conservan su valor al moverse; el total de avisos queda en 35. |
| IV. Contenido en Git, IDs estables | Sí | `content/` y el generador no cambian. Los 10 IDs de hitos persistidos quedan fijados por una spec con valores escritos a mano (FR-027). |
| V. Capas y contratos explícitos | Sí | Cada módulo vive en la capa y el slice de la spec; el guard vigila los límites. La suscripción nace con su primer caso real: la hoja de ruta la pide para los almacenes, y el usuario la extendió a los motores en Q3 («cada almacén y cada motor») para el cliente de D1c (FR-061 de su spec). Cada store de Zustand es de una sola pieza y lleva sólo la revisión: no hay un store genérico ni un adaptador preventivo. |
| VI. Español, accesibilidad y portabilidad | Sí | Los mensajes de error, en español rioplatense con voseo; el código y las pruebas, en inglés. No cambia ningún texto, atributo ni foco que vea el alumno. Los hashes se calculan con `node`, portable entre Linux y macOS. |
| VII. Secretos y salidas generadas fuera de Git | Sí | No hay salidas nuevas: las comparaciones únicas corren en un worktree o en el directorio temporal, y no se commitean. La dependencia entra con `package.json` y `package-lock.json` sincronizados y con su aviso de licencia (T008). |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. Al entregar la feature, el directorio queda inmutable. |

## Decisiones del usuario (clarify del 2026-10-06)

Están registradas en `## Clarifications` de la [spec](./spec.md). Una línea por decisión, con la sección de este plan que la aplica. Cambiar una toca sólo la unidad 1 (sección 3, tareas T008 a T015), salvo la partición.

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Partición: se parte** | F2a son las unidades 1 a 4 (FR-001 a FR-042) y esta carpeta es su plan. F2b, las unidades 5 a 8 (FR-001 a FR-018 y FR-043 a FR-060), tendrá su plan y su carpeta cuando se planifique. | Título, «Summary» y reparto de PR |
| **Q2, A:** guard automático, prueba por el singleton y Sistemas que lanza sin `init` | El guard es un check de `qa/` (T014); la prueba 1 de F1 se reemplaza por la del singleton (T009); el motor de Sistemas falla como el de campaña y la prueba 2 de F1 se invierte (T010). Las dos inversiones son de la unidad 1, como ya dice la spec (FR-040); la unidad 3 sólo prueba que `startApp()` inicializa los dos motores antes de la primera vista (T016). | §3.2, §3.3 y §3.7; §4 |
| **Q3: Zustand** | Cada almacén y cada motor expone `changes`, un store de `zustand/vanilla` que lleva la revisión. La dependencia la instala K en T008, con su aviso de licencia. Lectura que la spec declara y el usuario puede corregir: el store lleva la revisión y no el progreso. | §3.0 y §3.1 |
| **Q1, A, y Q4, A** | Sólo afectan a F2b (FR-055 y FR-052): un mapa explícito por id para los exploradores y una interfaz de respaldo asíncrona. No se planifican acá. | — |

La precondición de integración que tenía la unidad 1, no integrarla sin la respuesta del usuario a Q3, está cumplida.

## Project Structure

### Documentation (this feature)

```text
specs/009-f2-seams/
├── spec.md              # F2 entero, sin cambios en este plan
├── plan.md              # este archivo: F2a, repartido en dueños
├── research.md          # decisiones, línea base y mediciones
├── quickstart.md        # validación: comandos, hashes y comparaciones únicas
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

No hay `data-model.md` ni `contracts/`: F2a no expone ninguna interfaz externa. Las interfaces TypeScript entre tareas están en las secciones de cada unidad.

### Source Code (repository root)

```text
package.json, package-lock.json                (U1 K, T008)  suman zustand 5.0.15, exacta
frontend/
├── THIRD-PARTY-NOTICES.txt                    (U1 K, T008)  el aviso de licencia de Zustand
├── app.js                                     (U1 G, U3 A)  el almacén del recorrido; startApp
├── lab.js                                     (U2 C, U1 L, U3 A)  catálogo, buildProgram, almacén; init
├── systems.js                                 (U4 M)  init usa mergeModelGroups
└── src/
    ├── app/
    │   ├── main.tsx                           (U3 K)  startApp() después del último import
    │   ├── engine-init-order.spec.ts          (U1 E)  de F1: se reescribe, los dos motores lanzan
    │   ├── singletons-import.spec.ts          (U1 S)  nuevo: importar no toca el almacenamiento
    │   └── legacy/register-{campaign,systems}-engine.ts   (U1 E)  publican el singleton
    └── entities/
        ├── exercise/
        │   ├── index.ts                       (U2 C, U1 L)
        │   └── model/  exercise-catalog.ts, build-program.ts (U2);  lab-state.ts, lab-store.ts (U1)
        ├── guide/
        │   ├── index.ts
        │   └── model/  milestone-ids.ts, parse-route-progress.ts, route-store.ts (U1);
        │               route-store-instances.spec.ts de F1: se reemplaza por route-store.spec.ts
        ├── campaign/model/        create-campaign-engine.ts, types.ts (U1)
        ├── systems-workshop/model/ create-systems-engine.ts, types.ts (U1)
        └── systems-simulation/  index.ts, model/model-registry.ts (U4)
qa/
├── lib/  sources.ts, legacy-sources.ts, app-adapters.ts (U3);  seams-guard.ts (U1, nuevo)
├── boot-check.ts, app-shell-check.ts, load-order-check.ts   (U3)
├── runtime-check.ts, systems-check.ts, project-kit-check.ts (U2)
├── versioned-storage-check.ts (U1),  seams-guard-check.ts (U1, nuevo),  run-checks.ts (alta)
docs/architecture.md   qa/AGENTS.md                           (cada unidad, K)
```

**Structure Decision:** cada módulo vive en la capa y el slice que fija la spec (sección «Las ocho unidades»), con su spec al lado. No hay código compartido nuevo: cada fábrica crea su store de Zustand y no se suma ningún archivo a `shared`. No se crea ninguna capa ni carpeta vacía.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **Mismos bytes.** Los cinco hashes de la compuerta iguales a los de T001 después de cada unidad, `frontend/src/index.html` sin diff y los cinco adaptadores de catálogos en su ruta.
- **El orden de los efectos al arrancar.** Las lecturas de almacenamiento son, hoy y después de la unidad 3, `taller-laboratorio-v1`, `taller-learning-v1`, `taller-campaign-v1` y `taller-systems-v1`, en ese orden, y ninguna escritura con la fixture de master (medido sobre la base). La comparación única de la unidad 3 las registra.
- **Nada al evaluar.** Tras la unidad 3, las seis fuentes legacy evaluadas solas (sin catálogos ni adaptadores) y el bundle de `main.tsx` sin su llamada no fallan, no tocan el almacenamiento, no registran oyentes ni intervalo y no dibujan.
- **`app.js`.** Es la IIFE de hoy convertida en `startApp`, más una guarda de segunda llamada. En la unidad 1, el reemplazo de `state` por `routeState()` es mecánico y grande (80 apariciones en 59 líneas): revisalo con `git diff --word-diff`, no con los ojos.
- **Semántica de los almacenes.** El laboratorio conserva la identidad de su estado y de sus registros en cada escritura; el recorrido reemplaza su estado al fusionar con otra pestaña; ninguno escucha el evento `storage`; la tabla de avisos de §3.0 es exactamente la que prueban las specs, y la revisión sube una sola vez por operación, después de escribir.
- **Zustand.** Sólo `zustand/vanilla` (ni `zustand` ni `useStore` en F2a); un store por pieza, creado dentro de su fábrica, con el estado `{ revision }` y nada más; `setState` lo llama sólo su dueño, desde `notify`. La versión es exacta en `package.json`, el lockfile suma un solo paquete y el aviso MIT está en `frontend/THIRD-PARTY-NOTICES.txt`.
- **Sistemas lanza sin `init`.** Se probó en una copia: los 30 checks y los 106 E2E lo toleran. Si algo lo usara antes, el arranque de la unidad 3 lo mostraría.
- **El guard.** Sus cinco reglas (R1 a R5) y las violaciones deliberadas que lo prueban.
- **Los arneses.** `runModule`, `loadLab` (que evalúa e inicializa) y `bundleApp` sin la llamada final: A2 los edita después, así que sus nombres y su forma quedan fijados en §4.0.
- **Los defectos conocidos de F1 que siguen verdes.** `views.spec.ts` fija que `<body>` recibe `aria-pressed` (porque `[data-language]` también lo alcanza) y `bridges.spec.ts` que el bloqueo de campaña va primero: ningún cambio de F2a los arregla.
- **Complejidad.** 35 avisos antes y 35 después; `parseRouteProgress` y `sanitizeRecord` conservan su valor.
- **Tamaño.** Hasta +12 000 caracteres de `html.length` en toda F2a; cada PR informa su medida.
- **Un solo dueño legacy por singleton** (tabla de §3.0).

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez. G, L, E, C, M, S, Q y A son slices delegables en el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»): se le dan sus archivos, sus interfaces y sus checks, y se le dice que no deje comentarios. K lo hace el agente principal, que además revisa cada diff y corre las compuertas.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001: la línea base, sobre la base de implementación con F1 integrada |
| 1 | C, M y K a la vez; G, E y L desde que T008 está integrada | **C:** T002 a T004 (unidad 2). **M:** T006 (unidad 4). **K:** T008 (la dependencia de Zustand), el primer commit de la rama de la unidad 1. **G:** T009 (módulos del recorrido). **E:** T010 (motores). **L:** T011 (módulos y specs del almacén del laboratorio, sin tocar `lab.js` ni `index.ts`). G, E y L pueden escribir antes sus specs en rojo, contra las firmas de §3.0. **Q** puede adelantar el primer commit de T016 (los arneses, en verde: sólo archivos de `qa/` que nadie más toca) |
| 2 | K, G, L y S | **K:** T005 y T007, las compuertas y los PR de las unidades 2 y 4, apenas C y M entregan. **G:** T012. **L:** T013, desde que la unidad 2 está en `master`. **S:** T014, desde que T012 y T013 están |
| 3 | K | T015: la compuerta y el PR de la unidad 1 |
| 4 | Q y A, a la vez | **Q:** el segundo commit de T016 (las pruebas rojas; A suma antes la firma de `startApp` en `app.js`). **A:** el diff de T017. K integra T017 con `main.tsx` |
| 5 | K | T018 (compuerta y PR de la unidad 3) y T019 (cierre y entrega a A2) |

**Dueños, archivos e interfaces:**

| Dueño | Unidad | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- | --- |
| K · Coordinador | todas | `frontend/src/app/main.tsx`, `qa/run-checks.ts`, `docs/architecture.md`, `qa/AGENTS.md`, `package.json` y `package-lock.json` (sólo T008: suman `zustand`), `frontend/THIRD-PARTY-NOTICES.txt` (sólo T008) y las configuraciones (sin cambios), `specs/**`; abre los PR y corre las compuertas | todo | la línea base, la dependencia de Zustand, las compuertas, la integración y el cierre |
| C · Catálogo | 2 | en `frontend/src/entities/exercise/`: `index.ts`, `model/exercise-catalog*` y `model/build-program*`; `frontend/lab.js` (catálogo y `buildProgram`); `qa/runtime-check.ts`, `qa/systems-check.ts` y `qa/project-kit-check.ts` | — | el catálogo, `buildProgram` y los checks que los importan |
| M · Modelos | 4 | `frontend/src/entities/systems-simulation/index.ts`, `…/model/model-registry*` y `frontend/systems.js` | — | `mergeModelGroups` y `systems.js:init` |
| S · Guard | 1 | `frontend/src/app/singletons-import.spec.ts`, `qa/seams-guard-check.ts`, `qa/lib/seams-guard.ts` y `qa/versioned-storage-check.ts` | los singletons de G, E y L | el guard (§3.7) |
| G · Recorrido | 1 | `frontend/src/entities/guide/**` (incluido el spec de F1 `route-store-instances.spec.ts`, que se reemplaza) y `frontend/app.js` (el almacén) | de K: `zustand` instalado (T008) | `routeStore` |
| E · Motores | 1 | `frontend/src/entities/campaign/**`, `frontend/src/entities/systems-workshop/**`, `frontend/src/app/legacy/register-{campaign,systems}-engine.ts` y `frontend/src/app/engine-init-order.spec.ts` | de K: `zustand` instalado (T008) | `campaignEngine` y `systemsEngine` |
| L · Laboratorio | 1 | `frontend/src/entities/exercise/model/lab-state*` y `lab-store*` y, desde T013, `frontend/lab.js` (el almacén) y `frontend/src/entities/exercise/index.ts` | de K: `zustand` instalado (T008); de C: `exerciseCatalog` | `labStore` |
| Q · Arneses | 3 | `qa/lib/sources.ts`, `qa/lib/legacy-sources.ts`, `qa/lib/app-adapters.ts`, `qa/boot-check.ts`, `qa/app-shell-check.ts` y `qa/load-order-check.ts` | — | los arneses, las pruebas rojas de la unidad 3 y los dos cambios de QA del corte (T017) |
| A · Arranque | 3 | `frontend/app.js` (el arranque) y `frontend/lab.js` (`init`) | de G y L: los singletons; de Q: las pruebas | `startApp` y `TallerLab.init` |

**Quién edita `app.js` y `lab.js`, y en qué orden.** Los toca más de una unidad y se serializan:

| Archivo | Primero | Segundo | Tercero |
| --- | --- | --- | --- |
| `frontend/lab.js` | C, unidad 2: catálogo y `buildProgram` | L, unidad 1: el almacén | A, unidad 3: `init` |
| `frontend/app.js` | G, unidad 1: el almacén del recorrido | A, unidad 3: `startApp` | — |
| `frontend/src/entities/exercise/index.ts` | C, unidad 2 | L, unidad 1 | — |
| `frontend/systems.js` | M, unidad 4 | — | — |
| `frontend/src/app/main.tsx` | K, unidad 3 | — | — |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 hecha. Todos parten de ahí.
- **S1:** T008 (la dependencia de Zustand) integrada en la rama de la unidad 1: es su primer commit. G, E y L parten de ahí, para tener `zustand` en su `node_modules` (`npm ci --offline`); pueden escribir sus specs antes, contra las firmas de §3.0.
- **S2:** el PR de la unidad 2 integrado en `master`. L cablea `lab.js` (T013) y rebasa sobre eso.
- **S3:** los PR de las unidades 4 y 1 integrados. Q y A parten de ahí.
- **S4:** el PR de la unidad 3 integrado. K cierra.

**Puertos.** Cada dueño corre los E2E con su propio puerto, porque `vite preview` usa `--strictPort` (F1): K `E2E_PORT=4173`, C `4174`, M `4175`, S `4176`, G `4177`, L `4178`, E `4179`, Q `4180` y A `4181`.

**Líneas de integración** (las pone K; ningún dueño toca esos archivos):

| Cuándo | Archivo | Línea |
| --- | --- | --- |
| T008 | `package.json` y `package-lock.json` | `npm install --save-exact zustand@5.0.15`: una línea en `dependencies` y un paquete en el lockfile |
| T008 | `frontend/THIRD-PARTY-NOTICES.txt` | el aviso de licencia MIT de Zustand, con el texto de `node_modules/zustand/LICENSE` |
| T014 | `qa/run-checks.ts` | `'seams-guard-check.ts',` después de `'load-order-check.ts',` |
| T017 | `frontend/src/app/main.tsx` | `import { startApp } from '../../app.js';` en lugar de `import '../../app.js';`, y `startApp();` después, a continuación de una línea en blanco |
| cada compuerta | `docs/architecture.md` y `qa/AGENTS.md` | lo que dice «Documentación que cambia con cada unidad» |

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **F1 tiene que estar integrada** antes de T001 (su PR en `master`): F2a corre con su red y sus dos specs de Vitest, y toca `qa/AGENTS.md`, que F1 también cambia. Si no, se parte de `feat/f1-red-de-seguridad` y T001 lo anota.
- **La limpieza al inglés** (`chore/en-front` y `chore/en-qa-tools`, ya con commits y sin PR) cambia comentarios, nombres de pruebas y mensajes de los mismos archivos: `entities/campaign` y `entities/systems-workshop` (fábricas y tipos), `qa/lib/sources.ts`, `qa/systems-check.ts`, `qa/project-kit-check.ts`, `qa/runtime-check.ts`, `qa/versioned-storage-check.ts` y `qa/run-checks.ts`, entre otros. Conviene integrarla antes de T001, para que la línea base se tome sobre la base final; si no, los dueños rebasan y el coordinador resuelve los conflictos de texto.
- **Zustand en `master`:** la dependencia viaja en el PR de la unidad 1 (T008, su primer commit). Las unidades 2 y 4 no la usan y se integran antes, sin ella.
- **`package.json`, el lockfile, `.github/workflows/ci.yml` y `eslint.config.ts`:** F2a sólo cambia `package.json` y el lockfile, y sólo en T008, para sumar `zustand`; el CI y `eslint.config.ts` no (el guard es un check de `qa/`, y los checks entran por `qa/run-checks.ts`). Los frentes del backend (C3a, C6) tocan el CI sin cruzarse.
- **A2** parte de la base con las cuatro unidades. Lo que A2 toma y las formas que F2a le deja están en «Lo que A2, D1 y F3 a F9 toman de F2a».
- **D1:** su FR-061 pide el cliente sobre los cuatro almacenes con suscripción; «Lo que A2, D1 y F3 a F9 toman de F2a» es lo que recibe.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec (las unidades 1 a 4 y FR-001 a FR-042), [research.md](./research.md), [quickstart.md](./quickstart.md) y tu sección;
  - las skills `tdd`, `clean-code`, `codebase-design` y `vitest`.
- **TDD, siempre.**
  - Escribí la spec de tu paso y comprobá que falla por la razón que dice el plan; recién entonces implementá. Un módulo nuevo empieza con su firma lanzando `not implemented`, para que la prueba falle por comportamiento y no por un import.
  - Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca. Las únicas dos que cambian son las specs de Vitest de riesgo de F1 (T009 y T010).
  - Los valores esperados salen de las fixtures congeladas, de la spec o de un ejemplo escrito a mano; nunca del módulo que probás.
- **Mover no reescribe.** El código movido conserva su comportamiento, sus textos y su complejidad. No corrijas nada de paso: ni el `<body>` con `aria-pressed`, ni el orden de los avisos, ni un nombre.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador. `main.tsx`, `package.json`, las configuraciones y la documentación los integra K.
- **Comandos,** desde la raíz de tu worktree: `npm ci --offline` (usa la caché de npm; si falla por falta de caché, pará y pedí permiso), `npm run test:unit -- <ruta>`, `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`), `npm run typecheck`, `npm run lint` y `npm run format:check`. `npm run build` y `E2E_PORT=<tu puerto> npm run test:e2e` los corrés cuando tu tarea los pide. Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo.**
  - Código, nombres de test y comentarios en inglés; los mensajes que lee quien usa el taller, en español rioplatense con voseo.
  - **Sin comentarios por defecto.** Sólo uno que explique una restricción que el código no muestra o que deje una referencia puntual (un bug, una RFC o un ADR). Los comentarios de los bloques de este plan no se copian.
  - `interface` para formas de objetos y exports nombrados; `export default` sólo en componentes, hooks y contextos con una abstracción principal.
  - Una función de más de 10 de complejidad se revisa y se justifica. En `qa/`, sólo sintaxis TypeScript borrable (`tsconfig.qa.json`): sin `enum` ni propiedades de parámetro.
  - Ningún `style=`, `setAttribute('style', …)` ni `style.cssText` nuevos (FR-008).
- **Zustand.** Importá sólo `zustand/vanilla`. Cada fábrica crea su store con `createStore` y el estado `{ revision: number }`, y lo sube con `setState` desde un `notify` propio, una vez por operación y después de escribir. No guardes el progreso ni valores derivados en el store, no llames `setState` desde afuera y, en un componente, nunca `useStore(store)` sin selector.
- **Commits.** Chicos, en español, con prefijo Angular (`test(front): …` para la spec en rojo, `refactor(front): …` para el movimiento, `feat(front): …` para lo nuevo) y el trailer `Co-Authored-By` de tu modelo, sin `git push`. La spec en rojo y su implementación van en commits separados; el commit de una spec en rojo no pasa `npm test` y el PR entero sí. La evidencia de una tarea es su commit.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base y compuerta de cada unidad (coordinador K, onda 0)

**Cubre:** FR-002 a FR-004, FR-009 y FR-016; SC-001, SC-002, SC-011 y SC-012.

**Entrega:** los valores esperados de cada compuerta, medidos sobre la base de implementación y registrados en [research.md](./research.md), y el procedimiento de la compuerta, que usa cada unidad.

### Tarea 0.1 · La línea base (T001)

- **Quién y cuándo:** K, sobre la base de implementación (`master` con F1 integrada y, si se integra, la limpieza al inglés) y antes de cualquier cambio de código.
- **Entrega:** un commit de documentación que agrega a [research.md](./research.md) la sección «Línea base de la implementación», con el hash de la base, las versiones, los valores de abajo y la fecha. El mensaje del commit lleva lo mismo.
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde. Si algo falla, F2a no empieza.
  2. Registrar lo de [quickstart.md](./quickstart.md), §1: los cinco hashes, el tamaño del HTML en caracteres y en bytes, el tamaño del script y del estilo, la cantidad de `import(` e `import.meta` (cero), los 35 avisos de complejidad con su función, y los escenarios de cada check.
  3. Comparar con los valores medidos al planificar (tabla de «Línea base» en research.md). Si el `documentHash` de `build/curriculum.meta.json` sigue empezando con `ef8f5715…`, el volcado de `dump-globals` tiene que empezar con `cd1f9e62…`, `dump-dist-globals` con `daf2bc71…`, el estilo con `850ef821…` y el marcado con `562c5364…`. Si no coinciden, F2a se detiene y el coordinador decide: el contenido o el generador cambiaron, y la línea base se vuelve a tomar con el código de la base, nunca con el de una unidad.
  4. Con permiso (las imágenes ya están en la máquina), `docker compose build taller`: informar el resultado.
- **Compuerta:** los pasos 1 y 2, con los valores anotados.
- **Vuelta atrás:** revertí el commit; nada depende de él.

### 0.2 · La compuerta de cada unidad

La corre K antes de abrir el PR de cada unidad (T005, T007, T015 y T018) y cada dueño la corre en lo que toca (sin Docker). La unidad no se integra con una sola casilla en rojo.

1. **Antes de empezar la unidad,** sobre su base: `npm test` y los 106 E2E en verde. Si no, se arregla o se informa antes de seguir.
2. **Comandos:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `E2E_PORT=<puerto> npm run test:e2e` y, con permiso, `docker compose build taller`.
3. **Los cinco hashes y el tope** ([quickstart.md](./quickstart.md), §2):

   | Salida | Esperado después de la unidad |
   | --- | --- |
   | `build/curriculum.json` (sha256) | igual a T001 (`ef8f5715…`) |
   | `node tools/content/dump-globals.ts .` (stdout) | igual a T001 (`cd1f9e62…`) |
   | `node tools/content/dump-dist-globals.ts dist/index.html` (stdout) | igual a T001 (`daf2bc71…`); la línea de stderr «La evaluación se detuvo en: URLSearchParams is not defined» es informativa, no un criterio |
   | `<style>` del dist (sha256) | igual a T001 (`850ef821…`) |
   | el marcado del dist con los scripts y el estilo vaciados (sha256) | igual a T001 (`562c5364…`) |
   | `frontend/src/index.html` | sin diff contra la base |
   | `html.length` del dist | `≤ 2 198 460` en toda F2a (base: 2 186 460; tope de `build-check`: 2 500 000); se informa la medida antes y después de la unidad |
   | `import(` e `import.meta` en el script | 0 y 0; sigue siendo un solo `<script type="module">` y un solo `<style>` (lo exige `build-check`) |

   `dump-dist-globals` se mantiene igual porque todos los globals de datos (`GUIDE_DATA`, `RUST_*`, `GO_*` y `SYSTEMS_*`) los publican `register-catalogs` y los cuatro `register-systems-*`, que corren antes de `lab.js` y de `app.js`; hoy la evaluación se detiene dentro de `app.js`, en `syncLinkedLanguage()`, después de publicarlos todos y de correr los `init`. Con la unidad 3 se detiene en la misma llamada, dentro de `startApp()`. Se verificó con `app.js` convertido en `startApp()` (research.md, R6).
4. **Rutas intactas:** `git diff --name-only <base> | grep -E 'register-(catalogs|systems-(lowlevel|infra|play|pc))\.ts|atlas-catalog\.ts'` no imprime nada (FR-004).
5. **Sin estilos en línea nuevos:** `git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'` no imprime nada (FR-008).
6. **Complejidad:** `npm run lint` da 0 errores y 35 avisos en total; si la unidad mueve una función de más de 10 (`parseProgress`, `sanitizeRecord`), el aviso se informa antes y después con su valor.
7. **La comparación única de la unidad** (§0.3), con sus cantidades en la descripción del PR.
8. **Documentación** de la unidad actualizada en el mismo cambio (§5).
9. **PR** con título y descripción en inglés; la descripción cuenta el problema completo: el contexto, qué faltaba o fallaba y por qué, qué cambia, cómo se verificó (los comandos de arriba, las medidas y la comparación única), la correspondencia de los checks que la unidad adapta (research.md, R8; FR-013) y qué queda pendiente.

### 0.3 · Las comparaciones únicas

FR-011 pide una comparación entre el commit base y el de la unidad, por cada lógica pura que se mueve. No es un check permanente: se corre con un script descartable fuera del repositorio, sobre un worktree del commit base (`git worktree add <dir> <base>`, `ln -s "$PWD/node_modules" <dir>/node_modules` y `npm run curriculum` adentro) y la raíz de la unidad. Las cantidades van en la descripción del PR.

| Unidad | Qué compara | Cantidad esperada |
| --- | --- | --- |
| 2 | `TallerLab.buildProgram` del `lab.js` base contra `buildProgram` del módulo, con el borrador inicial, la solución y la solución más una prueba propia, sobre los 274 ejercicios; y el orden de los ids de `getExercises()` | 822 programas iguales y 274 ids en el mismo orden; 0 diferencias |
| 4 | las claves y la identidad de los modelos que el `systems.js` base y el de la unidad le pasan a `TallerSystemsEngine.init` (un motor falso que guarda la configuración) | 25 claves en el orden `pc`, `lowlevel`, `infra`, `play`, y cada modelo es el mismo objeto; 0 diferencias |
| 1 | para cada una de las tres fixtures de progreso (las cuatro claves de master y las dos exportaciones importadas), la app base y la de la unidad arrancan, y se comparan el almacenamiento resultante, el JSON que exporta «Exportar progreso» (sin `exportedAt`) y el aviso | 5 pares de JSON y de avisos iguales; 0 escrituras en el arranque |
| 3 | la secuencia ordenada de lecturas y escrituras de almacenamiento durante el arranque, con las tres fixtures y con el almacenamiento vacío | 4 secuencias iguales; las lecturas en el orden de arriba |

Cómo se arma cada una está en [quickstart.md](./quickstart.md), §3. La de la unidad 2 corrió al planificar (research.md, R4).

### 0.4 · Qué E2E de F1 cubre cada unidad

La red de F1 son 106 pruebas en 8 specs, y cada unidad las corre completas y sin editarlas. No todas miran lo mismo, y donde la cobertura es fina lo dice la última columna:

| Unidad | Specs de F1 que la ejercen | Lo que la red no ve |
| --- | --- | --- |
| 2 · catálogo y `buildProgram` | `url-contract` (abrir un ejercicio por id, un id desconocido, el idioma del enlace), `bridges` (las misiones salen del catálogo), `views` (`#laboratorio` se dibuja con él) y `cycle` (ejecutar corre `buildProgram`) | El texto del programa: el compilador simulado responde con resultados escritos a mano y no compara el pedido. Por eso existe la comparación única de los 822 programas |
| 4 · registro de modelos | `url-contract` (`?lenguaje=&taller=&parte=`), `views` (`#sistemas`), `startup-storage` y `reload` (el modelo de «cache» responde a un clic y se pierde al recargar), `cycle` y `bridges` (el taller de Sistemas) | Un nombre de modelo repetido: sólo lo ve la spec del registro |
| 1 · almacenes y motores | `startup-storage` (arranque con el progreso de master sin escribir, con el almacenamiento bloqueado y una acción de cada almacén que sobrevive a la recarga), `cycle` (ejecutar guarda en el laboratorio y sincroniza campaña o Sistemas), `bridges` (permiso y lista de misiones por los motores y el almacén), `url-contract` (el idioma del enlace gana al guardado) | La fusión entre pestañas, importar, «Borrar todo», los respaldos y las notas, los favoritos y los hitos de las páginas de `app.js`: los cubren `app-shell-check`, `boot-check` y las specs de cada almacén. Ningún E2E se suscribe |
| 3 · arranque explícito | las ocho vistas por hash y las seis formas de URL (`views`, `url-contract`), `startup-storage` (con y sin almacenamiento), `reload` (un arranque nuevo en cada recarga), `cycle` y `bridges` | El orden exacto de los `init` y la segunda llamada: sólo se ven por sus efectos y los fija `boot-check`. La guarda de errores de la red sí hace fallar un arranque que lance una excepción o un `console.error` |

## 1. Unidad 2 · El catálogo y el arnés de pruebas (dueño C, onda 1)

**Cubre:** FR-032 a FR-034; la parte de FR-013 de `runtime-check`, `systems-check` y `project-kit-check`; US2 (escenario 4) y SC-008 (los 274 programas).

**Entrega:** el catálogo de los 274 ejercicios y `buildProgram` como módulos de `entities/exercise`, sin leer `window` ni el JSON; `lab.js` los usa; `TallerLab.buildProgram` deja de existir.

### Tarea 1.1 · Las specs del catálogo y de `buildProgram`, en rojo (T002)

- **Crea:** `frontend/src/entities/exercise/model/exercise-catalog.ts` y `build-program.ts` (firmas que lanzan `not implemented`) y sus specs `exercise-catalog.spec.ts` y `build-program.spec.ts`.
- **Interfaz** (verificada: compila):

```ts
// model/exercise-catalog.ts
export interface ExerciseGroups {
  rustLab: readonly Exercise[];
  rustQuests: readonly Exercise[];
  goLab: readonly Exercise[];
  goQuests: readonly Exercise[];
  systemsLowlevel: readonly Exercise[];
  systemsInfra: readonly Exercise[];
  systemsPlay: readonly Exercise[];
  systemsPc: readonly Exercise[];
}

export interface ExerciseCatalog {
  readonly exercises: readonly Exercise[];
  readonly byId: ReadonlyMap<string, Exercise>;
}

// Pure: the eight groups in the order of today. The specs and the checks use it.
export function createExerciseCatalog(groups: ExerciseGroups): ExerciseCatalog;

// A holder that throws before `init` and on a second `init`.
export interface ExerciseCatalogHolder extends ExerciseCatalog {
  init(groups: ExerciseGroups): void;
}
export function createExerciseCatalogHolder(): ExerciseCatalogHolder;
export const exerciseCatalog: ExerciseCatalogHolder;

// model/build-program.ts: moved from lab.js without changing a character of the programs.
export interface BuildableExercise {
  language: ExerciseLanguage;
  tests: readonly { id: string; expression: string }[];
  imports?: readonly string[];
}
export function buildProgram(item: BuildableExercise, code: string, customTest?: string): string;
```

- **Qué prueban las specs** (valores escritos a mano o de las fixtures congeladas):
  - el orden de los ocho grupos, con ocho grupos chicos de ids inventados;
  - con los datos reales de `build/curriculum.json`: 274 ids, únicos, iguales al conjunto de `qa/fixtures/curriculum-ids.json` (`exercises`), con los límites de los grupos escritos a mano (100, 12, 100, 12, 16, 16, 16 y 2: los índices 0, 100, 112, 212, 224, 240, 256 y 272 son `rust-01`, `rust-101`, `go-01`, `go-101`, `rust-113`, `rust-121`, `rust-129` y `rust-137`, y el último es `go-137`), y `byId` de un id de cada grupo;
  - el contenedor lanza «Inicializá el catálogo de ejercicios antes de usarlo.» antes de `init` y «El catálogo de ejercicios ya está inicializado.» en la segunda llamada;
  - dos programas resueltos a mano (uno de Rust y uno de Go), cada uno con y sin prueba propia, con el formato del marcador `__TALLER_TEST__<id>:PASS|FAIL` del ADR 0003 (punto 7).
- **Pasos:** escribir las specs y comprobar que fallan con `not implemented` (`npm run test:unit -- entities/exercise`). Un commit: `test(front): specs del catálogo de ejercicios y de buildProgram (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.2 · Catálogo y `buildProgram` en `entities/exercise`; `lab.js` los usa (T003)

- **Cambia:** `exercise-catalog.ts` y `build-program.ts` (se implementan), `frontend/src/entities/exercise/index.ts` (exporta `buildProgram`, `createExerciseCatalog`, `createExerciseCatalogHolder`, `exerciseCatalog` y los tipos `ExerciseCatalog`, `ExerciseGroups` y `ExerciseCatalogHolder`) y `frontend/lab.js`.
- **`lab.js`:**
  - importa `buildProgram` y `exerciseCatalog` del slice y quita la definición de `buildProgram` y los dos `const` (`exercises` y `byId`);
  - al evaluarse (el mismo momento de hoy) llama `exerciseCatalog.init({ rustLab: window.RUST_LAB || [], rustQuests: window.RUST_QUESTS || [], goLab: window.GO_LAB || [], goQuests: window.GO_QUESTS || [], systemsLowlevel: window.SYSTEMS_LOWLEVEL_LABS || [], systemsInfra: window.SYSTEMS_INFRA_LABS || [], systemsPlay: window.SYSTEMS_PLAY_LABS || [], systemsPc: window.SYSTEMS_PC_LABS || [] })`;
  - lee `exerciseCatalog.exercises` y `exerciseCatalog.byId` donde hoy lee `exercises` y `byId` (unas 15 apariciones), sin alias locales: así la unidad 3 sólo mueve la llamada a `init`;
  - `window.TallerLab` pierde `buildProgram` y su `getExercises` devuelve `exerciseCatalog.exercises`.
- **Cuándo abre:** igual que hoy, al evaluarse `lab.js`.
- **Pasos:** implementar hasta que las specs de T002 pasen; cablear `lab.js`; `npm run typecheck`, `npm test` y `npm run lint`. Los checks que usan `TallerLab.buildProgram` y `getExercises` sobre el `lab.js` real (`runtime-check`, `systems-check` y `project-kit-check`) siguen funcionando con `getExercises`; sólo `runtime-check` pierde `buildProgram` y corre aparte de `npm test` (T004 lo adapta). Un commit: `refactor(front): el catálogo de ejercicios y buildProgram viven en entities/exercise`.
- **Vuelta atrás:** revertí el commit: `lab.js` vuelve a armar `exercises` y `byId` y a publicar `buildProgram`.

### Tarea 1.3 · Los checks cargan la fábrica pura y la comparación única (T004)

- **Cambia:** `qa/runtime-check.ts`, `qa/systems-check.ts` y `qa/project-kit-check.ts` (cómo cargan, no qué esperan; FR-013).
- **Qué cambia en cada uno:**
  - `runtime-check` importa `buildProgram` con `importModule('frontend/src/entities/exercise/index.ts')` y arma la lista de ejercicios con `createExerciseCatalog` a partir de los globals que publican los adaptadores de catálogos; ya no evalúa `lab.js`;
  - `systems-check` toma `exercises` de la fábrica pura en el escenario del catálogo real y deja de cargar `lab.js` ahí;
  - `project-kit-check` toma los ejercicios de la fábrica pura y le da a `register-project-kit` un `TallerLab` mínimo (`getExercises` y un `exportState` sin registros) donde antes cargaba `lab.js`.
- **Pasos:** correr `node qa/systems-check.ts` (46) y `node qa/project-kit-check.ts` (11) con sus escenarios y valores esperados intactos, y `node qa/runtime-check.ts rust --audit-record` y `go --audit-record`, que corren sin red y sin escribir: en un clon limpio dan `0/137` y salen con código 1 (no hay registros previos), igual que antes del cambio; lo que se verifica es que arrancan con el catálogo y `buildProgram` nuevos y listan los mismos 137 ids. Después, la comparación única de la unidad 2 (§0.3). Un commit: `test(qa): los checks de Sistemas, de kits y de runtime cargan el catálogo puro`.
- **Compuerta:** 46 de 46 y 11 de 11; la salida de `--audit-record` igual a la de la base; la comparación en 822 programas iguales y 274 ids en el mismo orden. `runtime-check` no se corre contra los Playgrounds públicos.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.4 · Compuerta y PR de la unidad 2 (T005, K)

La compuerta de §0, el PR (`refactor(front): move the exercise catalog and buildProgram into entities/exercise`) y la documentación de la unidad 2 (§5). Cubre FR-001, FR-002 y FR-009.

**Reversión de la unidad 2:** `lab.js` vuelve a armar `exercises` y `byId` al evaluarse y a publicar `buildProgram`, y los tres checks vuelven a evaluar `lab.js`. Se revierten antes las unidades 1 y 3 si ya están integradas.

**Verificado al planificar:** `createExerciseCatalog` y el contenedor compilan; `buildProgram` movido da los mismos 822 programas que `lab.js`; la spec del catálogo con los datos reales y los límites de arriba pasa en Vitest.

## 2. Unidad 4 · El registro de modelos de Sistemas (dueño M, onda 1)

**Cubre:** FR-041 y FR-042; el escenario 3 de la historia 4 de la spec.

**Entrega:** `mergeModelGroups` en `entities/systems-simulation`, que `systems.js:init` usa en lugar de su bucle.

### Tarea 2.1 · El registro, con su spec en rojo primero (T006)

- **Crea:** `frontend/src/entities/systems-simulation/model/model-registry.ts` y `model-registry.spec.ts`. **Cambia:** `frontend/src/entities/systems-simulation/index.ts` (exporta `mergeModelGroups`) y `frontend/systems.js`.
- **Interfaz** (verificada: compila; el parámetro es `readonly object[]` porque `LowlevelModels` es una `interface` sin firma de índice y no es asignable a `Record<string, unknown>`):

```ts
// model/model-registry.ts
// Joins the groups in order and throws 'Modelo de Sistemas repetido: <name>' on a repeated name.
export function mergeModelGroups(groups: readonly object[]): Record<string, unknown>;
```

- **Qué prueba la spec:** (1) el orden de los grupos y de las claves, con grupos chicos escritos a mano; (2) un nombre repetido entre dos grupos lanza «Modelo de Sistemas repetido: cache»; (3) con `{ pc: pcModel }`, `lowlevelModels`, `infraModels` y `playModels`, las claves son exactamente las 25 que referencian los talleres de `qa/fixtures/curriculum-ids.json` y están, en ese orden, `pc`, `cache`, `heap`, `mmu`, `tlb`, `vm`, `stack`, `scheduler`, `interrupts`, `wal`, `lsm`, `quorum`, `clocks`, `network`, `backpressure`, `balancing`, `sharding`, `transforms`, `raster`, `raycast`, `pathfinding`, `physics`, `life`, `algebra` y `minimax`.
- **`systems.js:init`:** alimenta la función con lo que hoy alimenta el bucle: `models = mergeModelGroups(packages().map((source) => source.models))`, es decir, los `models` de `window.SYSTEMS_PC`, `SYSTEMS_LOWLEVEL`, `SYSTEMS_INFRA` y `SYSTEMS_PLAY` en ese orden. No lee los modelos del slice directamente: los checks que tocan esos globals (`lab-bridge-check`) siguen alimentando al motor con lo que publican. Con un nombre repetido, `models` queda como estaba en lugar de a medio llenar; el arranque se detiene igual con el mismo mensaje.
- **Cuándo abre:** sin cambios: `init` lo llama `app.js` al arrancar.
- **Pasos:**
  1. Crear el módulo con la firma que lanza `not implemented` y la spec: falla por comportamiento.
  2. Implementar y cablear `systems.js`. `npm run test:unit -- systems-simulation`, `node qa/lab-bridge-check.ts` (21), `node qa/systems-check.ts` (46) y los cuatro `systems-<dominio>-check`, sin cambios en sus valores.
  3. Medir el tiempo de `node qa/lab-bridge-check.ts` antes y después: el bundle de `systems.js` ahora arrastra los modelos del slice (research.md, R9). En una copia dio 0,61 s contra 0,63 s en la base; si pasa de 2 s, se informa y se decide.
  4. La comparación única de la unidad 4 (§0.3).
  5. Dos commits: `test(front): spec del registro de modelos de Sistemas (roja)` y `refactor(front): systems.js une los modelos con mergeModelGroups`.
- **Compuerta:** los pasos 2 a 4 y los hashes de §0; `dump-globals` queda idéntico porque los adaptadores `register-systems-*` no cambian.
- **Vuelta atrás:** `systems.js:init` vuelve a unir los modelos con su bucle.

### Tarea 2.2 · Compuerta y PR de la unidad 4 (T007, K)

La compuerta de §0, el PR (`refactor(front): merge the Systems models in a tested registry`) y la documentación (§5). Cubre FR-001, FR-002 y FR-009.

## 3. Unidad 1 · Un almacén por clave y un motor por tipo, con suscripción (dueños K, G, E, L y S, ondas 1 y 2)

**Cubre:** FR-010, FR-018 y FR-020 a FR-031; FR-032 en lo que vigila el guard; US2, SC-004 y SC-006.

**Entrega:** `routeStore`, `labStore`, `campaignEngine` y `systemsEngine` como singletons que se importan, no abren nada al evaluarse, fallan si se usan sin abrir y exponen un store de Zustand con la revisión de sus cambios; la dependencia de Zustand (`zustand` 5.0.15, exacta, con su aviso de licencia); el guard que impide abrir una clave por otro camino; las dos specs de riesgo de F1 invertidas.

### 3.0 Contratos comunes de la unidad 1

**La suscripción, con Zustand.** Cada singleton expone `changes`, el store de `zustand/vanilla` de esa pieza. Se crea dentro de la fábrica (`createRouteStore`, `createLabStore`, `createCampaignEngine` y `createSystemsEngine`) y no a nivel de módulo: así cada spec que usa una fábrica tiene el suyo, en revisión 0. Su estado es `{ revision: number }` y nada más. La forma, que compiló en un directorio temporal con una copia mínima del paquete y no dentro del repositorio:

```ts
import { createStore, type StoreApi } from 'zustand/vanilla';

// In each factory, next to its other closure variables:
const changes = createStore<{ revision: number }>(() => ({ revision: 0 }));
const notify = (): void => changes.setState((state) => ({ revision: state.revision + 1 }));

// Each public interface (RouteStore, LabStore, CampaignEngine and SystemsEngine) gains:
readonly changes: StoreApi<{ revision: number }>;
```

`notify` es lo único que llama a `setState`, y siempre sube la revisión en uno: el actualizador devuelve un objeto nuevo, y Zustand sólo avisa si el estado cambió de identidad (`Object.is`). Las «acciones explícitas» que pide `AGENTS.md` son los métodos de cada singleton (`save`, `applyImport`, `reset` y los de cada motor), que persisten y recién después suben la revisión; el store no tiene acciones propias y ningún consumidor llama a `changes.setState`. Las specs no importan Zustand: usan `changes.subscribe` y `changes.getState()`.

**Qué guarda el store y qué no.** Guarda la revisión y nada más: no copia el progreso ni guarda valores derivados de él. El progreso sigue en su almacén versionado y se lee con `getProgress()` (el recorrido y el laboratorio) o con `exportState()` (los motores, que clonan). El laboratorio muta su estado y sus registros en el lugar en cada escritura (ADR 0003, decisión 9; FR-025), y `app.js` muta el del recorrido entre dos fusiones y lo reemplaza al fusionar con otra pestaña, al importar y al borrar. Zustand pide actualizar el estado de forma inmutable ([guía oficial](https://zustand.docs.pmnd.rs/learn/guides/immutable-state-and-merging)): un selector sobre el progreso no avisaría de lo que cambia en el lugar, y copiarlo al store dejaría dos fuentes de verdad (FR-026). La revisión es la única selección segura hasta que un port vuelva inmutable el estado que porta. Es la lectura de Q3 que declara la spec, y el usuario la puede corregir.

Por la misma razón, el estado vivo del recorrido y del laboratorio ya no se llama `getState`: en Zustand `getState` lee el store, y dos `getState` en un mismo singleton se confundirían. El estado vivo es `getProgress()` y la revisión, `changes.getState().revision`. Nadie usaba todavía el nombre anterior fuera de este plan.

**Qué entrega a un consumidor.** Un componente de React lee la revisión con `useStore` de `zustand`, con un selector chico, y vuelve a leer el progreso cuando cambia. Nunca `useStore(store)` sin selector: suscribe al store completo y `AGENTS.md` lo prohíbe; el compilador no lo impide (se verificó que compila), así que se cuida en la revisión y en la spec de cada port. El código que no es de React, el cliente de D1c y las vistas legacy, usa la API de vanilla. F2a sólo importa `zustand/vanilla`: `useStore` lo estrena el primer port, F3, que además trae jsdom.

```ts
import { useStore } from 'zustand';
const revision = useStore(routeStore.changes, (state) => state.revision);
const route = routeStore.getProgress(); // read it again whenever `revision` changes

// Outside React:
const stop = routeStore.changes.subscribe((state, previous) => {
  /* the listener receives the new and the previous state; `stop()` unsubscribes */
});
routeStore.changes.getState().revision;
```

**Qué avisa y qué no.** La suscripción no escucha el evento `storage`: la fusión con lo que guardó otra pestaña ocurre dentro de `write`, cuando la clave cambió desde la última lectura (ADR 0003), y por eso queda cubierta por el aviso de la escritura. La revisión sube **una sola vez por operación pública**, después de que la operación escribió, reasignó el estado y actualizó `storageAvailable`: un oyente ya ve lo escrito. `persist()` de los motores no avisa, y `applyImport` y `reset` del laboratorio pasan por `save()` y no suman un segundo aviso.

| Pieza | Sube la revisión (una vez por operación) | No la sube |
| --- | --- | --- |
| `routeStore` y `labStore` | `save()`, aunque no pueda guardar (el estado en memoria cambió y `storageAvailable()` puede haber cambiado); `applyImport` y, en el laboratorio, `reset`, que pasan por `save()`; `reset` del recorrido, que no guarda | `open`, `getProgress`, las lecturas |
| `campaignEngine` | `answerCheckpoint` aceptada, `syncLab` cuando persiste, `applyImport` (siempre) y `reset` | `init`, `refreshFromLab` (deriva sellos en memoria sin guardar), `getWorlds`, `getSummary`, `canAttempt` |
| `systemsEngine` | `observe` cuando agrega, `answer`, `setStep` y `setNote`, `syncLab` cuando persiste, `applyImport` (siempre) y `reset` | `init`, `refreshFromLab`, `get`, `list` |

**Un oyente que lanza.** Es el comportamiento de Zustand: `setState` recorre los oyentes con `forEach`, así que la excepción llega a quien llamó a la operación y los oyentes siguientes no se llaman (se verificó con `esm/vanilla.mjs` 5.0.15, research.md, R3). La escritura ya ocurrió, porque se avisa después, y eso es lo que prueban las specs. F2a no suma aislamiento propio: no tiene oyentes que lancen, el que registra `useStore` es de React, y el cliente de D1c tiene que capturar los suyos.

**Abrir y usar sin abrir** (FR-021 y FR-022; los textos son los de hoy donde existen):

| Pieza | Se abre con | Antes de abrir | Abrir dos veces |
| --- | --- | --- | --- |
| `routeStore` | `open(guide)` | lanza «Abrí el almacén del recorrido antes de usarlo.» | lanza «El almacén del recorrido ya está abierto.» |
| `labStore` | `open(catalog)` | lanza «Abrí el almacén del laboratorio antes de usarlo.» | lanza «El almacén del laboratorio ya está abierto.» |
| `exerciseCatalog` (unidad 2) | `init(groups)` | lanza «Inicializá el catálogo de ejercicios antes de usarlo.» | lanza «El catálogo de ejercicios ya está inicializado.» |
| `campaignEngine` | `init(config, labState?)` | lanza «Inicializá la campaña antes de usarla.» | vuelve a validar y a leer, como hoy |
| `systemsEngine` | `init(config)` | lanza «Inicializá Sistemas antes de usarlo.» (cambia: hoy `list` devuelve `[]`) | vuelve a validar y a leer, como hoy |

**Cuándo ocurre cada apertura, unidad por unidad.** Es lo que hace que cada reversión devuelva un estado que funciona:

| Pieza | Hoy | Tras la unidad 2 | Tras la unidad 1 | Tras la unidad 3 |
| --- | --- | --- | --- | --- |
| catálogo | al evaluarse `lab.js` | al evaluarse `lab.js`, con `exerciseCatalog.init` | igual | `TallerLab.init()`, que llama `startApp()` |
| almacén del laboratorio | al evaluarse `lab.js` | igual | al evaluarse `lab.js`, con `labStore.open` | `TallerLab.init()` |
| almacén del recorrido | al evaluarse `app.js` | igual | al evaluarse `app.js`, con `routeStore.open` | `startApp()` |
| campaña y Sistemas | `app.js` los inicializa al evaluarse | igual | igual, con los singletons | `startApp()` |
| avisos, idioma, oyentes, intervalo y primer render | `app.js` al evaluarse | igual | igual | `startApp()` |

**Un singleton con estado, un dueño legacy** (FR-018). Los checks empaquetan cada archivo legacy por separado: un singleton que dos archivos importaran existiría dos veces en un contexto, y esa segunda instancia es la que esta unidad elimina. Hoy el único módulo que importa `entities/exercise` en tiempo de ejecución es `lab.js` (los adaptadores de catálogos lo importan con `import type`, que se borra), y los motores alcanzan `hasPassingEvidence` por `@x`, que no importa el índice: por eso ningún bundle de check duplica un singleton. El código de Zustand sí se repite en cada bundle, y no importa: no tiene estado, el estado es de cada store.

| Singleton | Slice | Lo importa (dueño) | Cómo lo alcanzan los demás |
| --- | --- | --- | --- |
| `exerciseCatalog` y `labStore` | `entities/exercise` | `frontend/lab.js` | `TallerLab.getExercises()`, `exportState()`, `planImport()`, `applyImport()`, `backups()`, `reset()` y `loadWarning()` (campaña, Sistemas, el kit y `app.js`) |
| `routeStore` | `entities/guide` | `frontend/app.js` | las páginas React portadas (F3 a F9) lo importan; no es una vista legacy más |
| `campaignEngine` | `entities/campaign` | `register-campaign-engine.ts` | `window.TallerCampaignEngine` (`campaign.js`, `lab.js` y `app.js`) |
| `systemsEngine` | `entities/systems-workshop` | `register-systems-engine.ts` | `window.TallerSystemsEngine` (`systems.js` y `app.js`) |

El singleton se crea en el mismo archivo que su fábrica (`export const routeStore: RouteStore = createRouteStore();`): el módulo, vacío y sin efectos, se evalúa cuando su dueño importa el índice del slice. Crear el store de Zustand de cada uno no abre ninguna clave ni lee `window`. Las fábricas siguen exportadas para las specs.

### Tarea 3.1 · La dependencia de Zustand (T008, K)

- **Quién y cuándo:** K, primero en la rama de la unidad 1 (sincronización S1): G, E y L parten de este commit. Es una tarea del coordinador porque `package.json`, el lockfile y los avisos de licencia los integra K (`AGENTS.md`, «Trabajo con subagentes»). El usuario autorizó la descarga el 2026-10-06. No lleva código ni spec: nada importa Zustand todavía.
- **Cambia:** `package.json`, `package-lock.json` y `frontend/THIRD-PARTY-NOTICES.txt`.
- **Lo medido antes de instalar** (2026-10-06, con el registro de npm y el archivo publicado; detalle en research.md, R13):

  | Qué | Valor |
  | --- | --- |
  | Versión | 5.0.15 (la última del registro, `latest`) |
  | Peso del paquete | 95 173 bytes desempaquetados (`npm view zustand version dist.unpackedSize`), en 52 archivos: todas las formas del paquete (cjs, esm, umd, systemjs, tipos y middleware) |
  | Lo que entra al script del dist | sólo `zustand/vanilla`: 1 001 caracteres publicados y 354 minificados con el esbuild del repositorio; 425 con un store y su `setState`, y 476 con cuatro |
  | Licencia | MIT, «Copyright (c) 2019 Paul Henschel» |
  | Dependencias de ejecución | ninguna; los peers (`react` ≥ 18, `@types/react`, `immer` y `use-sync-external-store`) son opcionales y el repositorio ya trae React 19.2.8 |
  | Forma del dist (FR-009) | `esm/vanilla.mjs` no usa `import.meta`, `import()` ni `process.env` |
  | Integridad | `sha512-MpSEjRiBkA9crSYeOUH32rJC7SVqAbm0Fqcqge/bUi2PPoLcBWKOsG+C8mevmpr8TwXHBVkChbbJiyvkE+i/3A==` (`npm view zustand@5.0.15 dist.integrity`) |

- **Pasos:**
  1. `npm install --save-exact zustand@5.0.15`. El `--save-exact` hace falta: el repositorio fija todas sus versiones sin `^` y no tiene un `.npmrc` que lo haga. `package.json` suma una línea en `dependencies`, en orden alfabético, y `package-lock.json` suma un solo paquete, `node_modules/zustand`, con el `integrity` del registro.
  2. Copiar el texto de `node_modules/zustand/LICENSE` a `frontend/THIRD-PARTY-NOTICES.txt`, con el formato de React, fflate y canvas-confetti: ese archivo se copia al servido (`frontend/Dockerfile`) y el código publicado de Zustand no lleva un comentario de licencia.
  3. `npm ci --offline --no-audit --no-fund` en otro worktree (comprueba que el lockfile coincide y que la caché de npm sirve el paquete a los dueños) y, después, `npm run build`, `npm test`, `npm run lint` y `npm run format:check`: todo en verde.
  4. Comprobar que `zustand/vanilla` se resuelve y se empaqueta donde se va a usar, antes de que un módulo lo importe: Vite y Vitest (una spec descartable que importe `createStore` y lo use) y los arneses de `qa/` (`bundleSource` e `importModule` de `qa/lib/sources.ts`, con un módulo descartable de `entities/`). Al planificar se hizo en un directorio temporal, con una copia mínima del paquete y esbuild con esas opciones; acá se repite con el paquete instalado, y la prueba descartable no se commitea.
  5. Un commit: `build(front): suma zustand 5.0.15 para la suscripción de los almacenes`.
- **Compuerta:** los pasos 3 y 4, y `git diff <base> -- package.json package-lock.json frontend/THIRD-PARTY-NOTICES.txt` con exactamente una dependencia, un paquete en el lockfile y un aviso. Como nada importa Zustand todavía, se espera que `dist/index.html` quede idéntico al de la base (el mismo sha256 y los mismos 2 186 460 caracteres) y que los cinco hashes no cambien.
- **Vuelta atrás:** revertí el commit después de los de G, E y L, que importan Zustand: es parte de la reversión de la unidad 1.
- **Verificado al planificar:** la versión, el peso, la licencia y la integridad salen del registro. En scripts descartables, fuera del repositorio y sobre el `esm/vanilla.mjs` que se bajó de unpkg al directorio temporal (no se instaló nada): la semántica del store, el empaquetado con las opciones de `qa/lib/sources.ts` (en un contexto de `vm` y desde una URL `data:`), el tipado estricto con la versión de TypeScript del repositorio y el peso. No corrió: la instalación, Vite, Vitest ni el lockfile.

### Tarea 3.2 · El almacén del recorrido (T009, dueño G; los módulos)

- **Crea** en `frontend/src/entities/guide/model/`: `milestone-ids.ts`, `parse-route-progress.ts` y `route-store.ts`, con sus specs `milestone-ids.spec.ts`, `parse-route-progress.spec.ts` y `route-store.spec.ts`. **Cambia:** `frontend/src/entities/guide/index.ts`. **Borra:** `route-store-instances.spec.ts` (de F1), que `route-store.spec.ts` reemplaza.
- **Interfaz** (lo de `milestone-ids.ts` y `parse-route-progress.ts` compiló y pasó en el prototipo; `RouteStore` es nueva y su `changes` es de Zustand):

```ts
// model/milestone-ids.ts: the ten ids persisted in `milestones` (the texts stay in app.js until F4).
export const MILESTONE_IDS: readonly string[];

// model/parse-route-progress.ts: `parseProgress` and `defaults` of app.js, moved without changes.
export const ROUTE_FORMAT_ERROR = 'Formato de progreso no compatible.';
export function blankRouteProgress(): RouteProgressV1;
export function parseRouteProgress(raw: unknown, guide: GuideData): ParsedState<RouteProgressV1>;

// model/route-store.ts
import type { StoreApi } from 'zustand/vanilla';
export interface RouteImportPlan { state: RouteProgressV1; lossy: boolean }
export interface RouteStore {
  open(guide: GuideData, options?: { storage?: StorageLike }): void;
  getProgress(): RouteProgressV1;              // live: read it again, never keep a copy
  save(): boolean;                              // writes, replaces the state after a merge and raises the revision
  applyImport(plan: RouteImportPlan): boolean;  // state = plan.state, then save(): one revision
  reset(): boolean;                             // blank state, removes the keys and raises the revision; it does not save
  backups(): BackupEntry[];
  loadWarning(): string;                        // the load notice of the route, empty after reset
  storageAvailable(): boolean;                  // the result of the last load or write
  readonly changes: StoreApi<{ revision: number }>;
}
export function createRouteStore(): RouteStore;
export const routeStore: RouteStore;
```

  `open` recibe el contenido por parámetro y no lee `window`; el almacenamiento opcional es para las specs. `ROUTE_FORMAT_ERROR` lo importa `app.js` mientras `planRouteImport` siga ahí (hasta la unidad 6, de F2b). `index.ts` exporta todo lo de arriba más el tipo `RouteStore`.
- **Qué prueban las specs** (los esperados salen de `qa/fixtures/progress-master-2a278ad-storage.json` y de ejemplos escritos a mano):
  - **Los 10 ids:** `rust-memory`, `rust-commands`, `rust-files`, `rust-measure`, `rust-network`, `go-memory`, `go-commands`, `go-files`, `go-measure` y `go-network`, escritos a mano (FR-027).
  - **La lectura** (`parse-route-progress`): los casos que cubre hoy `app-shell-check` para `parseProgress` (ids desconocidos descartados y contados, versión distinta lanza `ROUTE_FORMAT_ERROR`, minutos fuera de 15, 25 y 45, notas truncadas a 20 000, respuestas fuera de rango).
  - **El almacén:** usar sin abrir lanza y abrir dos veces lanza; abrir la fixture de master da `loadWarning() === ''`, `storageAvailable() === true`, ninguna escritura, ninguna clave `:respaldo` y el estado que dice la fixture (`completed` con `rust-first-session` y `rust-ownership`, `favorites` con `rust-100`).
  - **La revisión:** `changes.getState()` es `{ revision: 0 }` al crear y al abrir, sin ningún aviso. Tras `save`, `applyImport` y `reset` sube en uno por operación, y el oyente suscripto recibe el estado nuevo y el anterior. El oyente, al llamarse, ya ve lo escrito (lee el almacenamiento en memoria). Con un oyente que lanza, el almacenamiento ya tiene la escritura. Después de la baja no se llama más. Dos fábricas no comparten revisión.
  - **La prueba 1 de F1, invertida:** dos consumidores de `routeStore` comparten el estado; uno quita el favorito `rust-100` y completa un paso, el otro guarda una nota, y el favorito quitado no reaparece (esperado a mano: `favorites == ['go-tour']`).
  - **La fusión:** si otra pestaña cambió la clave entre dos escrituras, `save()` fusiona (gana el idioma y los minutos locales), `getProgress()` devuelve otro objeto y la revisión sube una vez.
- **Pasos:**
  1. Los tres módulos con firmas que lanzan `not implemented`, las specs y el reemplazo de `route-store-instances.spec.ts`: fallan por comportamiento.
  2. Implementar moviendo el código de `app.js` (`parseProgress`, `defaults`, `loadNoticeFor`, `mergeStoredRoute` y la apertura de `openVersionedStore`); correr las specs. `save`, `applyImport` y `reset` llaman `notify()` como dice §3.0, después de escribir.
  3. Dos commits: `test(front): specs del almacén del recorrido; invierte la prueba de riesgo 1 de F1 (rojas)` y `refactor(front): el almacén del recorrido es un singleton en entities/guide`.
- **Compuerta:** las specs en verde, `npm run typecheck` y `npm run lint` (el aviso de complejidad de `parseRouteProgress`, 22, es el mismo que tenía `parseProgress`).
- **Vuelta atrás:** revertí los commits; `app.js` todavía conserva su cierre hasta T012.
- **Verificado al planificar:** el módulo, con la señal propia que Q3 descartó, y una spec equivalente pasaron en Vitest (17 pruebas en 6 archivos junto con las de otras tareas), y el aviso de complejidad queda en 22. La versión con Zustand no corrió dentro del repositorio.

### Tarea 3.3 · Los motores (T010, dueño E)

- **Cambia** en `entities/campaign/model/`: `create-campaign-engine.ts` y `types.ts`; en `entities/systems-workshop/model/`: `create-systems-engine.ts` y `types.ts`; los dos `index.ts`; `frontend/src/app/legacy/register-campaign-engine.ts` y `register-systems-engine.ts`; y reescribe `frontend/src/app/engine-init-order.spec.ts`. **Crea:** `create-campaign-engine.subscription.spec.ts` y `create-systems-engine.subscription.spec.ts`.
- **Interfaz:**

```ts
// types.ts of each engine: CampaignEngine and SystemsEngine gain
import type { StoreApi } from 'zustand/vanilla';
readonly changes: StoreApi<{ revision: number }>;

// create-campaign-engine.ts and create-systems-engine.ts: at the end of each file
export const campaignEngine: CampaignEngine = createCampaignEngine();
export const systemsEngine: SystemsEngine = createSystemsEngine();
```

  Cada fábrica crea su store y su `notify` como dice §3.0, y los `index.ts` exportan `campaignEngine` y `systemsEngine` junto a las fábricas. `persist()` no avisa: cada operación pública llama `notify()` una sola vez, después de persistir, como en la tabla (así `applyImport` no suma dos avisos). `init` no avisa.

  | Motor | Llama `notify()` |
  | --- | --- |
  | Campaña | en `answerCheckpoint` (la respuesta aceptada, tras `persist()`); en `syncLab` sólo si persiste; en `applyImport` siempre, una vez al final (si persiste, después de `persist()`); en `reset` |
  | Sistemas | en `observe` sólo si agrega (tras `persist()`); en `answer`, `setStep` y `setNote` (tras `persist()`); en `syncLab` sólo si persiste; en `applyImport` siempre; en `reset` |

- **El motor de Sistemas lanza sin `init`.** Un `assertReady()` al principio de cada método salvo `init` y `changes`, con el mensaje de hoy de `requireStore` («Inicializá Sistemas antes de usarlo.»). `list`, `refreshFromLab`, `planImport`, `exportState` y `get` (por `requireWorkshop`) son los que hoy no fallaban. Probado en una copia: los 30 checks y los 106 E2E lo toleran.
- **Los adaptadores** publican el singleton: `window.TallerCampaignEngine = campaignEngine;` y `window.TallerSystemsEngine = systemsEngine;`. Ya no importan las fábricas. Los globals no suman nada: los métodos que las vistas legacy leen son los de hoy.
- **Qué prueban las specs:**
  - **`engine-init-order.spec.ts` reescrito** (la prueba de riesgo 2 de F1): ni la campaña ni Sistemas dejan usarse antes de `init`; los dos lanzan su mensaje en `getWorlds`, `refreshFromLab` y `canAttempt` (campaña) y en `list`, `refreshFromLab` y `exportState` (Sistemas), sin la marca `KNOWN DEFECT`. Se prueban las fábricas y los singletons.
  - **La revisión** (una spec por motor, con un `StorageLike` en memoria puesto como `localStorage` con `vi.stubGlobal`): la revisión sube en uno en cada fila de la tabla de §3.0 y no en las de «No la sube»; incluida `applyImport` con un plan sin cambios, que no persiste y igual avisa; el oyente, al llamarse, ya ve lo escrito; con un oyente que lanza, el almacenamiento ya tiene la escritura; la baja corta; dos fábricas no comparten revisión; un `init` repetido sigue funcionando y no avisa.
  - **Apertura quieta:** `init` con la fixture de master (la clave de cada motor) y el catálogo real de `build/curriculum.json` no escribe, no respalda y no avisa.
- **Pasos:**
  1. Reescribir `engine-init-order.spec.ts` y escribir las dos specs de la revisión. Para que fallen porque la revisión no sube y no porque falte `changes`, cada fábrica gana primero su store, sin ninguna llamada a `notify`. La de Sistemas falla además porque hoy `list` devuelve `[]`.
  2. Implementar los avisos y los `assertReady` de Sistemas, y publicar los singletons.
  3. `npm test` completo: los 30 checks sin cambios de valor (en especial `campaign-check`, 34, y `systems-check`, 46, con su `init` repetido) y Vitest en verde.
  4. Dos commits: `test(front): specs de los motores; invierte la prueba de riesgo 2 de F1 (rojas)` y `refactor(front): campaña y Sistemas son singletons con un store de Zustand`.
- **Compuerta:** el paso 3 y los 106 E2E (`bridges`, `cycle` y `startup-storage` ejercen a los dos motores).
- **Vuelta atrás:** revertí los commits: los adaptadores vuelven a crear las instancias y los motores pierden su store y su espera de `init`.
- **Verificado al planificar:** el cambio de Sistemas (que lance sin `init`) se probó en una copia contra los 30 checks y los 106 E2E. Los avisos con Zustand no corrieron dentro del repositorio.

### Tarea 3.4 · Los módulos del almacén del laboratorio (T011, dueño L)

- **Crea** en `frontend/src/entities/exercise/model/`: `lab-state.ts` y `lab-store.ts`, con `lab-state.spec.ts` y `lab-store.spec.ts`. No toca `lab.js` ni `index.ts` hasta T013.
- **Interfaz** (las firmas de `lab-state.ts` compilaron en el prototipo; `LabStore` es nueva y su `changes` es de Zustand):

```ts
// model/lab-state.ts: blank, sanitizeResult, sanitizeRecord, assertBackupShape, sanitizeSelected,
// sanitize (import), parseSaved (load) and absorbStored (merge in place) of lab.js, moved without
// changes and reading the valid ids from the catalog they receive instead of a local `byId`.
export interface LabStateV1 {
  version: 1;
  records: Record<string, LabRecord>;
  selected: Record<ExerciseLanguage, string | null>;
}
export function blankLabState(): LabStateV1;

// model/lab-store.ts
import type { StoreApi } from 'zustand/vanilla';
export interface LabCatalogLookup { byId: ReadonlyMap<string, Exercise> }
export interface LabImportPlan { state: LabStateV1; lossy: boolean }
export interface LabStore {
  open(catalog: LabCatalogLookup, options?: { storage?: StorageLike }): void;
  getProgress(): LabStateV1;                  // live, mutated in place by lab.js
  save(): boolean;                            // writes (merge in place), updates storageAvailable and raises the revision
  exportState(): LabStateV1;                  // cloneJson(state)
  planImport(raw: unknown): LabImportPlan;
  applyImport(plan: LabImportPlan): boolean;  // state = clone of the plan, then save(): one revision
  backups(): BackupEntry[];
  reset(): boolean;                           // blank state, removes the keys, then save(): one revision; clears the notice
  loadWarning(): string;
  storageAvailable(): boolean;
  readonly changes: StoreApi<{ revision: number }>;
}
export function createLabStore(): LabStore;
export const labStore: LabStore;
```

- **Qué prueban las specs** (esperados de la fixture de master, de `qa/fixtures/curriculum-ids.json` y escritos a mano):
  - **La lectura:** los casos que hoy cubre `lab-state-check` para el saneo y la importación (registros de ids desconocidos descartados y contados, límites de texto y de números, `selected` inválido ignorado sin contarse), con un `byId` mínimo.
  - **El almacén:** usar sin abrir lanza y abrir dos veces lanza; abrir la fixture de master (la clave del laboratorio, con el catálogo real) no escribe, no respalda y no avisa; `changes.getState()` es `{ revision: 0 }` al abrir.
  - **La identidad (FR-025):** un registro guardado antes de `save()` sigue siendo el mismo objeto después de una escritura que fusiona lo que guardó otra pestaña (`toBe`), y el estado también; en cambio `applyImport` y `reset` reemplazan el estado.
  - **La revisión con mutación en el lugar:** tras mutar un registro y llamar `save()`, la revisión sube en uno y el oyente se llama aunque `getProgress()` devuelva el mismo objeto. `applyImport` y `reset` suben una sola vez, aunque pasen por `save()`. El oyente ya ve lo escrito, y con un oyente que lanza el almacenamiento ya tiene la escritura. Dos fábricas no comparten revisión.
- **Pasos:** firmas que lanzan `not implemented`, specs en rojo, implementación moviendo el código de `lab.js` (`planImport` y `applyImport` usan el estado del almacén), specs en verde. Dos commits: `test(front): specs del almacén del laboratorio (rojas)` y `refactor(front): el almacén del laboratorio es un singleton en entities/exercise`.
- **Compuerta:** specs en verde, `npm run typecheck` y `npm run lint` (el aviso de `sanitizeRecord`, 14, se conserva).
- **Vuelta atrás:** revertí los commits; `lab.js` conserva su cierre hasta T013.
- **Verificado al planificar:** las firmas de `lab-state.ts` compilan; el resto no corrió.

### Tarea 3.5 · `app.js` usa `routeStore` (T012, dueño G)

- **Cambia:** `frontend/app.js`.
- **Qué cambia:**
  - se quitan `KEY`, `milestoneIds`, `defaults`, `FORMAT_ERROR`, `isObjectLike`, `parseProgress`, `loadNoticeFor`, `mergeStoredRoute`, `store`, `loaded`, `state` y `storageAvailable`; los hitos (`milestones`, con sus textos) se quedan;
  - se importan `routeStore`, `parseRouteProgress` y `ROUTE_FORMAT_ERROR`;
  - en el mismo lugar de hoy, al evaluarse, `routeStore.open(data)`;
  - `const routeState = () => routeStore.getProgress();` y cada `state.` pasa a `routeState().`: ninguna copia local que pueda divergir (FR-026), porque otro consumidor puede hacer que el almacén reemplace su estado al fusionar con otra pestaña. Las asignaciones `state = …` pasan al almacén: `confirm-reset` usa `routeStore.reset()` y después `save()`, y la importación usa `routeStore.applyImport(routePlan)`;
  - `save()` queda como un envoltorio: `routeStore.save()` y `updateSaveLabel()`; `storageAvailable` pasa a `routeStore.storageAvailable()`; el primer aviso de `loadNotices` sale de `routeStore.loadWarning()`;
  - `planRouteImport` llama `parseRouteProgress(rawImport, data)` y compara con `routeState()`; `collectBackups` usa `routeStore.backups()`.
- **Cuándo abre:** al evaluarse `app.js`, como hoy; la unidad 3 lo mueve.
- **Pasos:** correr `node qa/app-shell-check.ts` (51), `node qa/boot-check.ts` (10) y `npm test` con sus valores sin cambios; revisar el diff con `git diff --word-diff`; un commit `refactor(front): app.js lee y escribe el recorrido por routeStore`.
- **Compuerta:** los 51 y los 10 escenarios, los 106 E2E (`startup-storage` y `reload`) y los hashes de §0.
- **Vuelta atrás:** revertí el commit: `app.js` vuelve a abrir su propio almacén.

### Tarea 3.6 · `lab.js` usa `labStore` (T013, dueño L; desde S2)

- **Cambia:** `frontend/lab.js` y `frontend/src/entities/exercise/index.ts` (exporta `labStore`, `createLabStore`, `blankLabState` y los tipos `LabStore`, `LabStateV1`, `LabImportPlan` y `LabRecord`).
- **Qué cambia en `lab.js`:**
  - se quitan `KEY`, `blank`, `state`, `saveAvailable`, `loadWarning`, `store`, `loaded`, el saneo y la lectura (`sanitizeResult`, `sanitizeRecord`, `assertBackupShape`, `sanitizeSelected`, `isRecordObject`, `sanitize`, `parseSaved`, `loadWarningFor`, `absorbStored`) y los cuerpos de `planImport` y `applyImport`;
  - al evaluarse, `labStore.open(exerciseCatalog)`, a continuación del `exerciseCatalog.init` de T003;
  - `recordFor`, `isSolved`, `isDue`, `achievementStats`, `mount` y `openExercise` leen `labStore.getProgress()`; `save()` queda como `labStore.save()`; `saveAvailable` pasa a `labStore.storageAvailable()` y `loadWarning` a `labStore.loadWarning()`;
  - `window.TallerLab` delega: `exportState`, `planImport`, `applyImport`, `backups`, `loadWarning` y `reset` (que además reinicia lo de la vista: selección, modo, fase y la ejecución activa).
- **Cuándo abre:** al evaluarse `lab.js`, como hoy.
- **Pasos:** `node qa/lab-state-check.ts` (37), `node qa/boot-check.ts`, `node qa/systems-check.ts` y `npm test`; los 106 E2E. Un commit: `refactor(front): lab.js lee y escribe el laboratorio por labStore`.
- **Compuerta:** los escenarios con sus valores sin cambios y los hashes de §0.
- **Vuelta atrás:** revertí el commit: `lab.js` vuelve a abrir su propio almacén.

### Tarea 3.7 · El guard de aperturas y la spec de importación (T014, dueño S; K registra el check)

- **Crea:** `qa/lib/seams-guard.ts`, `qa/seams-guard-check.ts` y `frontend/src/app/singletons-import.spec.ts`. **Cambia:** `qa/versioned-storage-check.ts` (suma un escenario) y, K, `qa/run-checks.ts`.
- **Interfaz:** `findViolations(sources: Readonly<Record<string, string>>): string[]`, pura: recibe el texto de cada archivo de producción por su ruta relativa a la raíz y devuelve un mensaje por violación, con el nombre de su regla («R1 …»). Un check con sintaxis borrable (`tsconfig.qa.json`).
- **Qué mira el guard** (texto de los archivos de producción: `frontend/*.js` y `frontend/src/**/*.{ts,tsx}` menos los `*.spec.ts(x)`):

| Regla | Qué exige | Quién queda permitido |
| --- | --- | --- |
| R1 | cada literal de clave (`taller-learning-v1`, `taller-laboratorio-v1`, `taller-campaign-v1`, `taller-systems-v1`) aparece en un solo archivo | `route-store.ts`, `lab-store.ts`, `create-campaign-engine.ts` y `create-systems-engine.ts`, cada uno con la suya |
| R2 | `openVersionedStore` sólo se importa en esos cuatro archivos | los mismos cuatro; la biblioteca la define |
| R3 | ningún archivo importa una fábrica (`createRouteStore`, `createLabStore`, `createCampaignEngine`, `createSystemsEngine`) | nadie: los índices de los slices las reexportan con `export … from`, que no es un import |
| R4 | un singleton lo importa sólo su dueño legacy (tabla de §3.0), entre `frontend/*.js` y `frontend/src/app/legacy/` | `lab.js`: `labStore` y `exerciseCatalog`; `app.js`: `routeStore`; `register-campaign-engine.ts`: `campaignEngine`; `register-systems-engine.ts`: `systemsEngine` |
| R5 | `entities/**`, `features/**` y `shared/**` no importan `build/curriculum.json` (FR-032, FR-015 y F2-I2 y F2-I6 de A2) | nadie |

- **Qué prueba el check:** primero, escenarios con fuentes virtuales escritas a mano: una página que abre una clave, una que importa `openVersionedStore`, una que importa una fábrica, una vista legacy que importa un singleton ajeno, un módulo de `shared` que importa el JSON y, por contraste, los cuatro dueños, un spec y un archivo limpio, que no dan violaciones; después, la lectura del árbol real (que da cuatro claves en un lugar cada una).
- **La spec de importación** (`singletons-import.spec.ts`, FR-031): con un `localStorage` que lanza ante cualquier acceso y cuenta cada uno, importar los cuatro singletons y el catálogo (con `vi.resetModules()` y una importación dinámica de cada slice) no lo toca y no lee `window`. Cada singleton crea su store de Zustand al evaluarse, vacío y sin efectos: la spec lo cubre sin una línea más.
- **El escenario de `versioned-storage-check`:** dos instancias crudas sobre el mismo almacenamiento se comportan como dos pestañas: el elemento que una quitó vuelve al guardar la otra (ADR 0003, decisión 9). Es la regla de dos pestañas que la prueba 1 de F1 caracterizaba, documentada donde corresponde a la biblioteca.
- **Pasos:**
  1. `findViolations` lanzando `not implemented` y los escenarios virtuales: fallan. La spec de importación se escribe contra los singletons que dejaron T009 a T011.
  2. Implementar las cinco reglas; con T012 y T013 integrados, el árbol real da 0 violaciones. Con el árbol anterior (después de T009 a T011 y antes de T012 y T013) el check da exactamente las de `app.js` y `lab.js`: R1 y R2.
  3. **Las violaciones deliberadas, en una copia de trabajo y sin commitear:** abrir `taller-learning-v1` con `openVersionedStore` en un archivo de `pages/` y comprobar que R1 y R2 fallan; importar `createCampaignEngine` en un adaptador y comprobar R3; importar `routeStore` desde `campaign.js` y comprobar R4; importar el JSON desde `entities/` y comprobar R5. Se deshace con `git checkout -- <archivo>`.
  4. Dos commits: `test(qa): guard de aperturas y de singletons (rojo)` y `test(qa): el guard lee el árbol real y documenta la regla de dos pestañas`.
- **Compuerta:** `node qa/seams-guard-check.ts` en verde, `node qa/versioned-storage-check.ts` (34), las cuatro violaciones deliberadas detectadas y `npm test` con el check registrado.
- **Vuelta atrás:** revertí los commits y quitá la línea de `qa/run-checks.ts`.

### Tarea 3.8 · Compuerta y PR de la unidad 1 (T015, K)

La compuerta de §0, la comparación única de la unidad 1, el PR (`refactor(front): one store per progress key and one engine per kind, with a Zustand subscription`) y la documentación (§5). El PR sólo se abre con la unidad 2 en `master` (S2). Cubre FR-001, FR-002, FR-005, FR-006, FR-009 y FR-010, y SC-003 y SC-004.

- **La dependencia:** `git diff <base> -- package.json package-lock.json frontend/THIRD-PARTY-NOTICES.txt` sigue mostrando una dependencia, un paquete y un aviso. La descripción del PR cuenta la versión (5.0.15, exacta), su peso (95 173 bytes desempaquetados; 354 caracteres minificados en el script) y su licencia (MIT, con su aviso).
- **El tamaño:** el HTML ya incluye `zustand/vanilla`. Se informa `html.length` antes y después y se confirma que sigue bajo `2 198 460` (base: `2 186 460`) y que el script no gana `import(` ni `import.meta`.
- **Q3 está respondida:** el usuario eligió Zustand el 2026-10-06, así que el PR ya no espera una respuesta y `AGENTS.md` no cambia: su regla se cumple.

**Reversión de la unidad 1:** devuelve los cierres de `app.js` y `lab.js` y las instancias creadas en los adaptadores, los motores vuelven a no esperar a `init` y se quitan la dependencia de Zustand y su aviso de licencia. Se revierte antes la unidad 3 si ya está integrada.

## 4. Unidad 3 · El arranque explícito (dueños Q y A, onda 4)

**Cubre:** FR-035 a FR-040 (de FR-040, que `startApp()` inicializa los dos motores antes de la primera vista: la inversión de la prueba de riesgo 2 es de la unidad 1); US3 y SC-005.

**Entrega:** `app.js` exporta `startApp()`, que `main.tsx` llama una vez después de todos los imports; `window.TallerLab` suma `init`; evaluar cualquier fuente legacy no arranca nada; los arneses y `load-order-check` leen la forma nueva.

### 4.0 La forma que deja la unidad 3

**`startApp`.** El cuerpo de la IIFE de `app.js` pasa a una función exportada, sin otro cambio que las llamadas nuevas del principio:

```js
let started = false;
export function startApp() {
  if (started) throw new Error('startApp ya se llamó: el arranque corre una sola vez.');
  started = true;
  window.TallerLab.init(); // the catalog and the lab store
  const data = window.GUIDE_DATA;
  // …the rest of today's IIFE, in the same order:
  routeStore.open(data); // the route store
  // TallerCampaign.init and TallerSystems.init; the load notices (route, campaign, Systems and lab);
  // syncLinkedLanguage; setInterval and the listeners; render(); and the load notice toast
}
```

El orden de las lecturas de almacenamiento no cambia: hoy el laboratorio se abre al evaluarse `lab.js`, antes que `app.js`; en `startApp()` es lo primero. La guarda de segunda llamada corre antes de cualquier apertura, así que una segunda llamada no duplica oyentes, intervalo ni almacenes. Si `startApp` lanza a medias, no se puede volver a llamar.

**`TallerLab.init`.** En `lab.js`, las dos llamadas que hoy están al evaluarse pasan a una función: `exerciseCatalog.init({ … })` y `labStore.open(exerciseCatalog)`. `window.TallerLab` suma `init` (no devuelve nada; `loadWarning()` sigue como está). Sin `init`, `getExercises`, `exportState` y `mount` lanzan por el catálogo y el almacén. Dentro de `lab.js`, nada más cambia.

**`main.tsx`.** La forma que deja F2a, que A2 edita después:

```ts
import '../../styles.css'; // …the six stylesheets, as today
// …the 17 imports of adapters and legacy views, as today, up to
import '../../systems.js';
import { startApp } from '../../app.js';

startApp();
```

`app.js` sigue siendo el último import y `startApp()` va después. Cambia a un import con nombre porque es el único modo de llamar a la función; por eso `load-order-check` tiene que leer imports con y sin nombre.

**Los arneses.** Los nombres y la forma que A2 va a encontrar:

```ts
// qa/lib/sources.ts
// Evaluates a source as a module and returns its named exports. The bundle is an IIFE with a global
// name, wrapped so that name stays out of the context.
export function runModule<T>(context: vm.Context, relativePath: string, options?: RunOptions): T;
// `bundleApp` gains an option that bundles main.tsx without its startApp() statement, when it has one,
// through an esbuild stdin entry that keeps the directory of main.tsx. That the call exists exactly
// once is load-order-check's job.
export function bundleApp(relativePath: string, options?: { withoutStartCall?: boolean }): string;

// qa/lib/legacy-sources.ts
export interface AppShellModule { startApp(): void }
export function loadAppShell(context: vm.Context): AppShellModule; // returns the exports, does not start
export function loadLab(context: vm.Context): void;                // evaluates lab.js and calls TallerLab.init()

// qa/lib/app-adapters.ts: TallerLab gains 'init'.
// qa/boot-check.ts: createBootHarness({ blockStorage }) exposes
//   storageCalls: string[]    every getItem/setItem/removeItem with its key, in order
//   storageAccesses: number   how many times the `localStorage` property was read (with blockStorage it throws)
//   listenerCount(): number   the listeners of the window and of every element of the fake DOM
//   intervals: number         the calls to setInterval
```

`storageCalls` es el nombre que usa el plan de A2 para el mismo registro: así su arnés lo reutiliza.

### Tarea 4.1 · Los arneses y las pruebas del arranque, en rojo (T016, dueño Q; A suma la firma)

- **Cambia, en dos commits:**
  - **Verde** (se puede adelantar a la onda 1 o 2): `qa/lib/sources.ts` (`runModule` y la opción de `bundleApp`), `qa/lib/legacy-sources.ts` (`loadAppShell` devuelve las exportaciones, que `app-shell-check` todavía ignora) y `qa/load-order-check.ts` (lee imports con y sin nombre; con el `main.tsx` de hoy da lo mismo). Nada de esto cambia el resultado de un escenario.
  - **Rojo:** `qa/lib/app-adapters.ts` (`TallerLab` suma `init`), los escenarios nuevos de `qa/boot-check.ts`, de `qa/app-shell-check.ts` y de `qa/load-order-check.ts` (la llamada después del último import) y, de **A**, la firma `export function startApp() { throw new Error('not implemented'); }` en `frontend/app.js`, junto a la IIFE (que todavía arranca sola), para que las pruebas fallen por comportamiento.
- **Qué no cambia todavía** (cambia en T017, junto con el corte, porque depende del comportamiento nuevo): el `buildHarness` de `app-shell-check` (todavía no llama `startApp()`) y `loadLab` (todavía sólo evalúa).
- **Qué cambia en los checks que ya existen** (sólo cómo cargan; FR-013): `load-order-check` lee los imports con y sin nombre (`^\s*import\s+(?:[^'"]*?\sfrom\s+)?['"]…['"]`) y conserva las 16 restricciones y las dos reglas de los extremos (commit verde); `boot-check` conserva sus 10 escenarios con `bundleApp` (el bundle con su llamada).
- **Escenarios nuevos** (nombres y código en inglés), que fallan con el código de hoy:
  - **boot-check, «each legacy source evaluated alone»:** las seis (`app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js` y `quest-explorers.js`), en un contexto sin catálogos ni adaptadores y con `blockStorage`, no lanzan y `storageAccesses` es 0. Hoy `app.js` lanza («Cannot read properties of undefined (reading 'tracks')», porque lee `window.GUIDE_DATA` al evaluarse) y `lab.js` toca el almacenamiento una vez; las otras cuatro pasan.
  - **boot-check, «main.tsx without its call»:** el bundle se evalúa con `blockStorage`; no lanza, `storageAccesses` es 0, no se registra ningún oyente ni intervalo y `#main` queda vacío. Hoy falla porque `main.tsx` todavía no tiene la llamada que quitar y la app arranca sola al evaluarse: 4 accesos al almacenamiento (laboratorio, recorrido, campaña y Sistemas) y `#main` dibujado (medido sobre la base).
  - **boot-check, «startApp initializes in order and draws the first view»:** a continuación de lo anterior, `startApp()` lee el almacenamiento en el orden laboratorio, recorrido, campaña, Sistemas (`storageCalls`), llama `TallerLab.init`, `TallerCampaign.init` y `TallerSystems.init` en ese orden y recién después escribe `#main`. Falla hoy con `not implemented`.
  - **boot-check, «a second startApp call fails»:** la segunda llamada lanza «startApp ya se llamó: el arranque corre una sola vez.» y `listenerCount()` e `intervals` no cambian.
  - **boot-check, el escenario de los adaptadores** (existente): falla por `TallerLab.init`, que la lista de `app-adapters.ts` ahora exige y `lab.js` todavía no publica; es la «prueba que falla» de ese método.
  - **app-shell-check, «startApp calls the adapters in order»:** `Lab.init`, `Campaign.init`, `Systems.init`, `Lab.loadWarning`, y después el render; y **«a second startApp call fails and adds no timer or listener»**. Usan `loadAppShell(context).startApp`.
  - **load-order-check:** `startApp()` aparece una vez y después del último import (hoy no hay llamada).
- **Pasos:** correr cada check: los nuevos fallan por la razón de arriba y los existentes siguen en verde (10 de boot salvo el de los adaptadores, 51 de app-shell, y las 16 restricciones). Dos commits: `test(qa): arneses para evaluar y arrancar las fuentes por separado` (verde; se puede adelantar a la onda 1 o 2) y `test(qa): pruebas del arranque explícito (rojas)`.
- **Compuerta:** los escenarios nuevos fallan por lo dicho, los existentes pasan, `npm run typecheck` y `npm run lint`.
- **Vuelta atrás:** revertí los commits.
- **Verificado al planificar:** `runModule` y `loadAppShell(context).startApp()` dan 51 de 51 con `app.js` convertido; con `app.js` convertido y `main.tsx` con la llamada, el bundle sin la llamada se evalúa sin errores, deja `#main` vacío y lee el almacenamiento una vez (el de `lab.js`, todavía abierto al evaluarse); sobre la base, el bundle de `main.tsx` con un almacenamiento que lanza hace 4 accesos y dibuja; las seis fuentes evaluadas solas dan los resultados de arriba.

### Tarea 4.2 · El corte (T017, dueño A con K)

- **Cambia:** `frontend/app.js` y `frontend/lab.js` (A), `frontend/src/app/main.tsx` (K), `qa/lib/legacy-sources.ts` (`loadLab` evalúa e inicializa) y `qa/app-shell-check.ts` (su `buildHarness` llama `loadAppShell(context).startApp()`), estos dos de Q. K integra los tres diffs en un solo commit.
- **Pasos:**
  1. Partir de S3 con T016 en rojo.
  2. `lab.js`: las dos llamadas de apertura pasan a `init`, publicado en `window.TallerLab`; `exerciseCatalog.exercises` y `byId` ya se leen sin alias (T003).
  3. `app.js`: la IIFE pasa a `startApp()` con la guarda y la llamada a `TallerLab.init` al principio (§4.0); la firma que lanza `not implemented` desaparece. Es el cambio más chico posible: nada más se mueve.
  4. K: `main.tsx` con el import con nombre y la llamada, **en el mismo commit**: si `app.js` deja de arrancarse solo y `main.tsx` no lo llama, la app no arranca. Es el único commit de F2a que mezcla `main.tsx`, `app.js` y `lab.js`; revertirlo devuelve la función que se arranca sola.
  5. `npm run build` y `npm test`: los escenarios de T016 pasan; los demás no cambian sus valores (con `loadLab` inicializando, `lab-state-check`, `systems-check` y `project-kit-check` no cambian sus escenarios). Los 106 E2E.
  6. **Mutaciones, descartadas:** invertir el orden de `TallerLab.init` y `routeStore.open` hace fallar «startApp initializes in order»; sacar la guarda hace fallar «a second startApp call fails»; quitar `startApp();` de `main.tsx` hace fallar `load-order-check` y `boot-check`.
- **Un commit:** `refactor(front): la app arranca con una startApp() explícita`.
- **Compuerta:** el paso 5 y los hashes de §0 (en especial `dump-dist-globals`, que se detiene en `startApp()` y no cambia).
- **Vuelta atrás:** revertí el commit. Con A2 integrada, se revierte antes el corte de A2.

### Tarea 4.3 · Compuerta y PR de la unidad 3 (T018, K)

La compuerta de §0 y la comparación única de la unidad 3, el PR (`refactor(front): start the app from an explicit startApp()`) y la documentación (§5). Cubre FR-001, FR-002, FR-009, FR-017 y FR-038, y SC-005. K confirma además que `git diff --stat <base>` no deja ningún `register-*` de catálogos tocado.

## 5. Cierre (coordinador K, onda 5)

### Documentación que cambia con cada unidad

La integra K en el PR de la unidad; el dueño avisa el texto que hace falta. Nada cambia una regla de `AGENTS.md` (constitución, principio I).

| Unidad | `docs/architecture.md` | `qa/AGENTS.md` |
| --- | --- | --- |
| 2 | el catálogo y `buildProgram` en `entities/exercise` (fila del laboratorio del mapa de archivos) | `runtime-check` importa `buildProgram`; `systems-check` y `project-kit-check` usan la fábrica pura |
| 4 | el registro de modelos en la fila de las simulaciones de Sistemas | — |
| 1 | un almacén por clave y un motor por tipo, cada uno con su store de Zustand (`changes`, que lleva sólo la revisión) y cómo se consume (`useStore` con un selector chico); la regla «un singleton con estado, un dueño legacy» | el guard (`seams-guard-check`) en la tabla de «Elegir comprobaciones» y la regla de dos pestañas de `versioned-storage-check` |
| 3 | el párrafo de `main.tsx` y de `load-order-check`: evaluar no arranca y `startApp()` va después del último import | `runModule`, `loadLab` (evalúa e inicializa), `bundleApp` sin la llamada y `TallerLab.init` en `app-adapters` |

### Tarea 5.1 · El cierre y la entrega a A2 (T019, K)

- **Pasos:**
  1. Con las cuatro unidades en `master`: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `E2E_PORT=4173 npm run test:e2e`, `git diff --check`, y los hashes de §0 contra los de T001 (acumulados) y la medida final del HTML. Una sola dependencia nueva: `git diff <base> -- package.json package-lock.json` muestra `zustand` 5.0.15, exacta, y un solo paquete en el lockfile (FR-010).
  2. La tabla de F2-I1 a F2-I6 de «Lo que A2, D1 y F3 a F9 toman de F2a», con la evidencia de cada fila, en el mensaje del commit.
  3. Informar al coordinador lo que le toca: F2a a «Entregado» con los PR y la evidencia, y los hallazgos de «Riesgos» que afectan a la hoja de ruta. La hoja de ruta la edita el coordinador, no F2a.
  4. Con permiso, `docker compose build taller` sobre `master`.
- **Compuerta:** el paso 1 en verde y la tabla completa.
- **Vuelta atrás:** no aplica: no cambia archivos de producción.

## Lo que A2, D1 y F3 a F9 toman de F2a

**A2** (plan en `spec/a2-compuerta`, «Interfaces y contratos que A2 fija para F2 y el épico»). Su T001 lo contrasta con la base:

| Contrato | Qué deja F2a y cómo se verifica |
| --- | --- |
| F2-I1: evaluar no arranca; una función exportada que no pisa `app/boot/` | `startApp()` en `frontend/app.js` (no está en `app/boot/`); `boot-check` evalúa las seis fuentes y el bundle de `main.tsx` sin su llamada sin tocar el almacenamiento |
| F2-I2: el catálogo no importa el JSON y se arma después de la compuerta | `exerciseCatalog` no importa JSON ni lee `window`; lo inicializa `TallerLab.init()` con los globals que publican los adaptadores; la regla R5 del guard lo vigila |
| F2-I3: el grafo estático no abre almacenes ni crea motores | los singletons se crean vacíos al importarlos sus dueños (`app.js`, `lab.js` y los `register-*-engine`), cada uno con su store de Zustand vacío y sin efectos, y se abren en `startApp()`; `singletons-import.spec.ts` prueba que importarlos no toca el almacenamiento |
| F2-I4: los `register-*` siguen siendo módulos con efectos, y los cambios van sobre la forma vigente | los `register-*` no cambian salvo los de los motores, que publican el singleton; la forma de `main.tsx` y de los arneses es la de §4.0 |
| F2-I5: `dump-globals` da los mismos bytes | los cinco hashes de §0 después de cada unidad |
| F2-I6: nada por debajo de `app` importa `getContent()` | la regla R5 (`entities`, `features` y `shared` no importan contenido estático); se extiende a `getContent()` cuando A2 lo cree |

Lo que A2 tiene que hacer con esto, que no es de F2a: `legacy-views.ts` lista `app.js` como `() => import('../../../app.js')`, pero tiene que quedarse con el espacio de nombres de ese último módulo para llamar `startApp()` después del último `import()`; `load-order-check` lee entonces esa llamada en `legacy-views.ts` en lugar de `main.tsx`; `bundleApp` sin la llamada final pasa a sacar la llamada de donde A2 la ponga; `createBootHarness` se mueve a `qa/lib/boot-harness.ts` con `storageCalls`, `storageAccesses`, `listenerCount` e `intervals`; y `withContent` convive con `runModule` porque los dos usan opciones de esbuild independientes. El `html.length` base es 2 186 460 y el tope de F2a, 2 198 460: A2 fija el suyo.

**Qué cambia Zustand para A2.** Ninguna de las seis filas, y el catálogo (F2-I2) no es un store. `zustand/vanilla` no lee `window` ni el almacenamiento al evaluarse y no usa `import.meta`, `import()` ni `process.env`: el dist conserva su forma (FR-009), y el script se evaluó en un contexto de `vm` vacío sin fallar. El script crece 354 caracteres minificados, unos 480 con los cuatro stores, que el tope de F2a ya cuenta; A2 fija su propio tope con ellos adentro. Los dueños legacy de los singletons arrastran el código de Zustand al bundle de cada check, y no duplica nada (FR-018): la librería no tiene estado, el estado es de cada store.

**D1** (FR-061 de su spec, borrador). El cliente de D1c se monta sobre `routeStore`, `labStore`, `campaignEngine` y `systemsEngine` y no abre otra instancia (el guard lo impide). De cada uno toma `changes`, el store de Zustand con la revisión: `changes.subscribe(oyente)` avisa de cada cambio con `(estado, estadoAnterior)` y `changes.getState().revision` es el contador. La revisión sólo dice que algo cambió; para calcular qué, compara `exportState()` (que clona) con su última foto, o `getProgress()` en el recorrido y el laboratorio. Lo que tiene que saber:

- La revisión es un contador local y en memoria de los cambios de ese almacén, y vuelve a 0 al recargar. No es la revisión de la cuenta que D1 lleva en el servidor (`progress_heads.revision`) ni el campo `version: 1` del formato guardado: el cliente tiene que llamarlas distinto.
- El oyente corre después de escribir, dentro de la operación que lo avisa. Si lanza, la excepción llega a quien llamó (por ejemplo, al manejador de una tecla) y los demás oyentes no se llaman: el cliente captura los suyos.
- Un oyente no puede llamar a la operación que lo dispara: `save()` desde un oyente del mismo almacén vuelve a avisar sin fin.
- `refreshFromLab` no avisa: los sellos derivados llegan con el aviso del `syncLab` que los persiste.
- Importar y «Borrar todo» siguen locales hasta la unidad 6 (F2b).

**F3, F4 y F9** (la unidad 1). Usan `routeStore`: la revisión con `useStore(routeStore.changes, (state) => state.revision)` (de `zustand`, con un selector chico y nunca con el store completo) y el progreso con `routeStore.getProgress()` en el render. F3 es la primera en importar `useStore`, y que no se suscriba al store completo no lo impide el compilador: su spec hereda la regla. F4 hereda la spec de los 10 IDs de hitos.

## Cobertura de requisitos

| Requisito | Tareas | Notas |
| --- | --- | --- |
| FR-001 | T002 a T018 | cada unidad: spec en rojo, implementación mínima, documentación y compuerta en su PR; su reversión está en su sección |
| FR-002 | T001, T005, T007, T015, T018 | la red de F1 en verde antes y después, sin editarse; las dos specs de Vitest se invierten en T009 y T010 |
| FR-003, FR-004 | T001 y la compuerta de §0 | tres oráculos, `<style>` y marcado; la línea base se toma sobre la base, antes de cambiar código; las rutas de los adaptadores se comprueban |
| FR-005, FR-006 | T009 a T011, T015, T018 | las tres fixtures y las dos exportaciones: `boot-check`, `startup-storage` y las specs de cada almacén |
| FR-007, FR-008, FR-009 | la compuerta de §0 | los E2E, el grep de estilos en línea y el tope y la forma del dist |
| FR-010 | T008, T015, T019 | una sola dependencia, `zustand` 5.0.15 exacta, con el lockfile sincronizado, su aviso de licencia y su peso medido (Q3); el `git diff` de `package.json` y del lockfile en T015 y en T019 |
| FR-011 | T004, T006, T015, T018 | las cuatro comparaciones únicas de §0 |
| FR-012 | T002, T006, T009 a T011, T014 | specs de Vitest en el proyecto `node`, sin jsdom |
| FR-013 | T004, T016, T017 | siete checks, sólo cómo cargan; la correspondencia está en research.md (R8) |
| FR-014 | T003, T006, T009 a T011, T014 | capas y slices; R3 y R4 vigilan los límites |
| FR-015 | T014 | R5: nada por debajo de `app` importa contenido estático |
| FR-016 | T001 y la compuerta de §0 | 35 avisos de complejidad antes y después |
| FR-017 | T003, T017 | `TallerLab.buildProgram` se retira y `TallerLab.init` se suma; ningún global nuevo |
| FR-018 | §3.0, T014 | tabla de dueños y regla R4 |
| FR-019 | el orden de los PR | la 2, la 4, la 1 y la 3, aparte de F2b |
| FR-020 a FR-022 | T009 a T011, T012, T013, T017 | singletons, apertura y uso sin abrir; la apertura se mueve en T017 |
| FR-023, FR-024 | T008 a T011 | la dependencia (T008), el store de cada pieza con su revisión y la tabla de avisos (T009 a T011), y que la semántica del ADR 0003 no cambia |
| FR-025 | T011 | la identidad del estado y de sus registros |
| FR-026 | T012, T013 | ninguna copia local del estado |
| FR-027 | T009 | los 10 ids, escritos a mano |
| FR-028 | T011 | la lectura y la importación del laboratorio leen el catálogo |
| FR-029, FR-030 | T014, T009 | el guard y la prueba 1 de F1 invertida |
| FR-031 | T009 a T011, T014 | la fixture de master abre sin escribir; la revisión; la identidad; importar el módulo no toca el almacenamiento (`singletons-import.spec.ts`) |
| FR-032 a FR-034 | T002 a T004, T014 | catálogo, `buildProgram` y la regla R5 |
| FR-035 a FR-039 | T016, T017 | `startApp`, su orden, la segunda llamada y los arneses |
| FR-040 | T010, T016 | la inversión de la prueba 2 en la unidad 1 (con FR-022) y la prueba de orden de `startApp()` en la 3 |
| FR-041, FR-042 | T006 | el registro y su spec |
| SC-001, SC-002, SC-011, SC-012 | la compuerta de §0 | por unidad |
| SC-003, SC-004 | T009 a T011, T014, T015 | tres fixtures sin escribir; cuatro claves en un solo lugar |
| SC-005 | T016, T017 | cero accesos al evaluar |
| SC-006 | T009, T010 | las dos specs de riesgo invertidas, ambas en la unidad 1 |
| SC-008 | T004, T015 | los 274 programas y la lectura con las tres fixtures (los 274 ejercicios de explorador y las seis URL son de F2b) |
| SC-009 | T004, T016 | siete de los nueve checks; el resto es de F2b |
| SC-013 | el orden de los PR | ninguna unidad de la 5 a la 8 en estos PR |
| SC-007 y SC-010 | — | son de F2b: las reglas de CSS y el respaldo asíncrono |

Historias: US1 en T001 y las compuertas; US2 en T002 a T005 y T008 a T015; US3 en T016 a T018; US4, sólo su escenario 3 (el registro), en T006 y T007.

## Descargas y permisos

Una: **Zustand 5.0.15** (T008). El usuario autorizó la descarga el 2026-10-06 y su peso se midió antes, con `npm view zustand version dist.unpackedSize`: 95 173 bytes desempaquetados y 354 caracteres minificados en el script del dist (unos 480 con cuatro stores), contra el tope de `build-check` y el de F2a. K la instala con `npm install --save-exact` y deja el paquete en la caché de npm, de donde los dueños la toman con `npm ci --offline`. El navegador de los E2E ya está en la caché de Playwright de la máquina. Si cualquier otro comando intenta descargar algo, se pide permiso. Docker lo corre sólo K, con permiso, y sólo para construir la imagen web (las imágenes ya están en la máquina).

## Riesgos y lo que quedó sin verificar

1. **F1 no está integrada.** La línea base y los E2E se midieron sobre una copia de `feat/f1-red-de-seguridad`, que no cambia producción; T001 los vuelve a medir sobre la base real. Con la limpieza al inglés sin integrar, los dueños rebasan y se resuelven conflictos de texto.
2. **Una lectura de Q3 que el usuario puede corregir.** El store de Zustand lleva la revisión y no el progreso (§3.0). Si el usuario esperaba el progreso dentro del store, es una decisión nueva: toca FR-025 y FR-026 de la spec, la mutación en el lugar del laboratorio y la fusión del recorrido, y cambia la unidad 1 entera. Las demás decisiones (partición, Q2) ya están aplicadas, y Q1 y Q4 no son de F2a.
3. **El diseño no está implementado.** Corrieron los prototipos del catálogo, `buildProgram`, el registro y el almacén del recorrido (este con la señal propia que Q3 descartó), y los cambios mínimos de Sistemas y de `startApp` contra la red de F1. Zustand corrió sólo en scripts descartables sobre `esm/vanilla.mjs` (semántica, empaquetado, tipos y peso): no corrieron con él la instalación, Vite ni Vitest, el almacén del laboratorio, los avisos de los motores (sólo sus firmas compilan), el guard ni los arneses completos de la unidad 3. Las firmas de este plan pueden pedir ajustes al implementar; cada ajuste se anota en el commit de su tarea. T008 verifica lo de Zustand que acá no se pudo.
4. **El reemplazo de `state` en `app.js`** es mecánico pero grande (80 apariciones). Lo protegen los 51 escenarios de `app-shell-check`, `boot-check` y los E2E; no se puede garantizar que cubran toda rama de renderizado: por eso el diff se revisa con `--word-diff`.
5. **El bundle de `systems.js` en los checks crece** con los modelos que importa el slice. En una copia, `lab-bridge-check` dio 0,61 s contra 0,63 s en la base y el HTML creció 46 caracteres; T006 lo vuelve a medir.
6. **El tope de tamaño (+12 000 caracteres) es una estimación.** Medido en una copia: `startApp` suma 100 caracteres y el registro, 46; `zustand/vanilla` suma 354 minificados; el resto del código nuevo (catálogo, almacenes y avisos de los motores) se estima en unos 5 300, unos 5 700 en total. Cada PR informa su medida y explica si se acerca al tope.
7. **La imagen web y la CI no corrieron.** La imagen la construye K con permiso (T001, T005, T007, T015, T018); la CI corre al abrir cada PR.
8. **Vitest.** No está instalado en el lockfile de esta rama: las pruebas de Vitest del plan corrieron sólo en la copia de F1. Cualquier afirmación sobre una spec que no se nombra como ejecutada es de diseño.
9. **Los borradores de A2, D1 y C4** pueden cambiar: el plan toma de ellos lo que dice «Lo que A2, D1 y F3 a F9 toman de F2a» y se ajusta.
10. **`<body>` con `aria-pressed`** (defecto que F1 fija): `startApp` lo conserva porque `syncShell` sigue llamando a `$$('[data-language]')`. Quien lo arregle lo hace en su port, en su commit con TDD.
11. **Un oyente que lanza.** Con Zustand, la excepción de un oyente llega a quien llamó a la operación (por ejemplo, al manejador de una tecla) y los demás oyentes no se llaman. F2a no tiene oyentes propios y no suma aislamiento; el cliente de D1c captura los suyos. Si hiciera falta aislarlos, se agrega entonces, dentro de la fábrica de cada pieza.
12. **`useStore(store)` sin selector compila.** Que un componente no se suscriba al store completo (`AGENTS.md`) no lo impide el compilador. F2a no tiene consumidores de React: la spec de F3 hereda la regla y, con su primer componente, conviene una regla de lint o una revisión explícita.
13. **La instalación puede mostrar más de lo previsto.** Si el lockfile suma más de un paquete o el dist cambia sin que nadie importe Zustand, T008 se detiene y se informa; el aviso de licencia y el peso están en su compuerta.

## Complexity Tracking

Ninguna de las dos decisiones contradice la constitución ni `AGENTS.md`; se registran porque un revisor las preguntaría.

| Decisión | Por qué hace falta | Alternativa más simple que se descartó y por qué |
| --- | --- | --- |
| Zustand lleva la revisión y no el progreso (uso parcial de la librería) | El laboratorio muta su estado y sus registros en el lugar (ADR 0003, decisión 9; FR-025) y el recorrido, entre dos fusiones, mientras Zustand pide actualizar el estado de forma inmutable. Con el progreso fuera del store hay una sola fuente de verdad y un selector seguro, la revisión. | El progreso dentro del store, que es el uso idiomático: obliga a copiarlo o a reescribir la fusión en el lugar, cambia FR-025 y FR-026 y deja dos fuentes de verdad mientras `app.js` y `lab.js` mutan el suyo. Un envoltorio compartido de la revisión en `shared/lib`: son dos líneas de la librería y cada fábrica se lee mejor con la API conocida, sin una abstracción propia (research.md, R3). |
| Suscripción de los motores (principio V: nada por anticipado) | La pidió el usuario en Q3 («cada almacén y cada motor») para el cliente de D1c (FR-061 de su spec); cuesta un store y unas líneas por motor. | Dejarla para D1c: D1c tendría que tocar los dos motores y sus specs, justo lo que F2 evita. |
