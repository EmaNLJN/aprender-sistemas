# Implementation Plan: F4 · Proyecto, el port de la página y de sus hitos

**Branch**: `013-f4-proyecto` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F4, clarificada el 2026-10-28 (Q1 a Q4). Decisiones y mediciones: [research.md](./research.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md).

**Objetivo:** llevar la página de Proyecto de `frontend/app.js` a una página de React en `frontend/src/pages/project/`, con sus hitos leídos y escritos por `routeStore` y sus diez IDs fijados, sin que el alumno note el cambio, salvo los dos que aprobó el usuario.

**Arquitectura:**

- **El catálogo:** los cinco hitos pasan a ser una configuración de TypeScript en `entities/guide`, de la que se deriva `MILESTONE_IDS`.
- **El almacén:** gana una operación que alterna una marca y guarda una vez.
- **La página:** lee el progreso en cada render, con una suscripción chica a la revisión, y la monta `render()` de `app.js` por un adaptador `window.TallerProjectPage` con `mount` y `unmount`, como el Atlas.
- **El retiro:** `app.js` pierde la página, el arreglo y la rama del delegado en el mismo commit. Las reglas de CSS de Proyecto se mudan a la hoja de la página.

**Stack:**

- **Base:** React 19.2.8, Zustand 5.0.15 (`useStore`), Vite 8.3.2, TypeScript 6.0.2, Node 24.
- **Pruebas:** Vitest 5.0.3 con jsdom 30.1.2 y Testing Library, y Playwright 1.63.0.
- **Checks:** los de `qa/` con `node:assert`.

> **Para quien lo implementa.**
>
> - **Qué leer:** completas las «Reglas para todos los agentes», la sección 0 y la sección de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T011) y remite acá.
> - **La base:** `master` con F2a, A2 y F2b integradas (la planificación leyó `f2b-acum`, `2b37caf4`). Si F3, F9 o F11a entraron antes, mirá primero «Lo compartido con F3 y F9» y «Puntos de integración».
> - **Decisiones del usuario:** Q1 a Q4 del clarify del 2026-10-28 (spec, `## Clarifications`), aplicadas en «Decisiones del usuario».
> - **El texto de la pista de Go (T008)** necesita la aprobación del usuario antes de su commit (research.md, R14).
> - **Código verificado:** nada. Se planificó leyendo el código, sin `npm`, build, checks, E2E, Docker ni descargas. Lo que el plan dice del comportamiento del legacy lo confirman los E2E de T002, que son lo primero que corre.

## Summary

F4 porta la última página de `app.js` que sólo escribe hitos.

- **Los cambios aprobados:** ninguno de comportamiento salvo los dos del clarify. Las pistas abiertas siguen abiertas al marcar un hito (Q3) y la pista del primer hito en Go deja de nombrar a Rust (Q4).
- **Siete commits, en este orden:**
  1. los E2E contra el legacy;
  2. el CSS a la hoja de la página;
  3. la pila de DOM, sólo si nadie la instaló;
  4. las specs en rojo, el único commit rojo;
  5. el port;
  6. la pista de Go;
  7. la documentación.
- **Cómo se prueba que nada cambió:** con la red de F1 y A2 sin editar (123 E2E), 18 E2E nuevos de Proyecto, specs de Vitest del almacén, del catálogo, del modelo y de la página, y una comparación única de DOM y estilo computado en 7 estados por 7 capturas.
- **Lo que comparte con F3 y F9:** la suscripción del shell al pie, la operación de alternar, la pila de DOM, la partición del CSS y el modo «lee y no escribe» del almacenamiento de los E2E. Para cada pieza, el plan dice qué hace F4 si entra primero y qué hace si entra después.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; JavaScript legacy en `frontend/app.js`. Node 24.21.0.

**Primary Dependencies**:

- **Ninguna de runtime nueva.** `react`, `react-dom` y `zustand` ya están en el lockfile; el binding `useStore` de `zustand` entra al script del dist por primera vez si F3 no lo trajo antes.
- **De desarrollo, sólo si F3 no las instaló** (T004, con permiso): `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1.
- **fishery no entra** (research.md, R10).

**Storage**: las cuatro claves de `localStorage` y sus ranuras de respaldo, sin cambios de formato (ADR 0003). La página escribe sólo `milestones` de `taller-learning-v1`, por `routeStore`.

**Testing**:

- **Vitest:** el proyecto `node` para el almacén, el catálogo y el modelo; el proyecto `jsdom` para la página.
- **Playwright:** contra el `dist/index.html` servido: los 123 E2E de la red y los 18 de Proyecto.
- **Los checks de `qa/`.**
- **La comparación única** de quickstart §3.

**Target Platform**: navegador moderno, Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web; es el port de una vista legacy.

**Performance Goals**: ninguna. Se informan el tamaño del HTML y los avisos de complejidad antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**:

- **Archivos de producción:** 8 nuevos (la página, la tarjeta, el modelo, el índice, la hoja, el catálogo, el adaptador y el setup de jsdom, si toca); cambian 6 (`app.js`, `styles.css`, `main.tsx`, `legacy-views.ts`, `route-store.ts`, `milestone-ids.ts`) más el índice de `entities/guide`.
- **Specs de Vitest:** 4 archivos (`project-milestones.spec.ts`, `project-progress.spec.ts`, `ProjectPage.spec.tsx` y la ampliación de `route-store.spec.ts`).
- **E2E:** 1 spec y 1 Page Object.
- **`qa/`:** cambian 7 archivos.
- **Documentos:** cambian 3, más el ADR 0008 si toca.

## Restricciones globales

Valores exactos; valen para toda tarea.

- **La red:**
  - los 123 E2E que deja F2a (106 de F1 y 17 de A2) pasan antes y después, **sin editar ninguno** (FR-002, SC-001);
  - los E2E nuevos de Proyecto se escriben contra el legacy y pasan sin editarse después del port;
  - las dos excepciones son el E2E 8, que nace en el commit rojo, y el E2E 15, que se invierte una vez en T008 (FR-001, SC-002).
- **Los diez IDs:** `rust-memory`, `rust-commands`, `rust-files`, `rust-measure`, `rust-network`, `go-memory`, `go-commands`, `go-files`, `go-measure` y `go-network`, en ese orden (FR-016).
  - `qa/fixtures/shared/route-milestones.json` conserva su sha256, `f955c92bc3138f895ea27233bb9e1030c0266b7e2a08783f18d1c1feda8d1054`.
  - `milestone-ids.spec.ts` no se edita.
  - `git diff --stat <base> -- backend/` queda vacío (FR-019, FR-020, SC-003).
- **Los textos:** los de `renderProject` y del arreglo `milestones` de `app.js`, carácter por carácter (FR-015), salvo la pista del primer hito en Go en T008. Las únicas diferencias de DOM admitidas son `data-milestone` y `data-project-library` (FR-004).
- **El progreso:**
  - las fixtures congeladas arrancan con 0 escrituras, 0 respaldos y 0 avisos con la página abierta (FR-003, SC-005);
  - cada alternancia hace 1 escritura de `taller-learning-v1` y 1 revisión (FR-009, SC-006).
- **Los bytes** (FR-032, SC-009):
  - **no cambian:** `build/curriculum.json`, `dist/content/curriculum.<versión>.json`, `node tools/content/dump-globals.ts .`, el marcado del dist (con scripts y estilo vaciados), `frontend/src/index.html` y `node qa/dist-content-check.ts`;
  - **el script** sigue siendo uno, sin sumar `import(` ni `import.meta`;
  - **el `<style>`** conserva el multiconjunto de reglas.
- **El tamaño:** `html.length` ≤ la base de T001 + 10 000 y < 1 250 000 (FR-033, SC-011).
- **Lo que no se suma** (FR-005):
  - ningún `style=`, `setAttribute('style', …)`, `.cssText` ni `dangerouslySetInnerHTML`;
  - ninguna dependencia de runtime;
  - ningún global además de `window.TallerProjectPage` (SC-008).
- **La complejidad:** `npm run lint` da la misma cantidad de avisos que la base. `render()` de `app.js` sube exactamente 1 respecto de T001 (de 11 a 12, según la lectura de research.md, R7), justificado en el PR.
- **Lo intocable:**
  - `features/download-project-kit/**` y `register-project-kit.ts` (FR-026);
  - `content/` y `build/`;
  - la hoja de ruta;
  - `milestone-ids.spec.ts`.
- **El orden de los commits:** el de «Commits, dueños y ondas». El commit de las specs es el único que deja la suite en rojo.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra una justificación.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules; FSD con `pages/project` (`ui`, `model`) y la configuración en `entities/guide`. Un `const` con `export default` por componente; `interface` para props y contratos; Zustand con un selector chico; ninguna dependencia de runtime ni global de más. `AGENTS.md` no cambia |
| II. TDD y pruebas útiles | Sí | Los E2E se escriben contra el legacy y pasan antes del port. Las specs nuevas fallan contra firmas que lanzan `not implemented`, en el único commit rojo. La pista de Go se cambia con su prueba primero. Los valores esperados salen de los textos de hoy, del fixture compartido y de las fixtures congeladas. Cada protección tiene una rotura deliberada (T009) |
| III. Código entendible | Sí | La página dibuja; el modelo deriva; el almacén escribe. `render()` sube a 12 con un `if` igual a los de las otras vistas (Complexity Tracking) |
| IV. Contenido en Git, IDs estables | Sí | Los diez IDs no cambian y los fijan tres fuentes y un E2E. `content/` no cambia (Q1) |
| V. Capas y contratos explícitos | Sí | `pages/project` importa sólo `entities/guide` y `shared`; el adaptador importa sólo el índice de la página. Ninguna capa ni slice nuevo además de la página; ningún barrel |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de la interfaz son los de hoy; la casilla y el resumen son nativos, con el mismo orden de tabulación; la impresión y el diseño móvil se comparan; los scripts usan `node` |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las comparaciones corren fuera del repositorio; ninguna salida nueva entra en Git |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1, A:** los textos de los hitos, configuración de TypeScript en `entities/guide`, junto a `MILESTONE_IDS` | `entities/guide/model/project-milestones.ts`, del que se deriva `MILESTONE_IDS` (research.md, R1) | T005, T006 |
| **Q2 (X3), A:** el CSS se muda con la página | `pages/project/ui/project.css`, importada en `main.tsx` después de `styles.css`, en su propio commit; el bloque de 590 px y la regla de impresión se parten (research.md, R8) | T003 |
| **Q3 (X1 con C2):** las pistas abiertas siguen abiertas | Es el comportamiento natural de React, con la casilla siempre montada. El E2E 8 y la spec de la página lo fijan, y el E2E 8 entra en el commit rojo | T005, T006 |
| **Q4:** una pista por idioma para el primer hito, en un commit propio con TDD | El catálogo admite una pista por idioma desde el port, con el texto de hoy en las dos. T008 cambia sólo el de Go, con el texto aprobado (research.md, R2 y R14) | T006, T008 |

## Project Structure

### Documentation (this feature)

```text
specs/013-f4-proyecto/
├── spec.md                 # la spec, clarificada
├── plan.md                 # este archivo
├── research.md             # decisiones, Context7 y mediciones
├── quickstart.md           # línea base, compuertas, comparación única y roturas
├── tasks.md                # una línea por tarea, T001 a T011
└── checklists/requirements.md
```

No hay `data-model.md` ni `contracts/`:

- **El dato persistido** es el de hoy (`RouteProgressV1`).
- **Las interfaces entre tareas** están en §4.1.

### Source Code (repository root)

```text
frontend/
├── app.js                                    T006: sin renderProject, sin el arreglo, sin la rama; monta la página
├── styles.css                                T003: sin las reglas de Proyecto
├── vitest.config.ts                          T004 (si toca): dos proyectos
└── src/
    ├── vitest-setup-dom.ts                   T004 (si toca): cleanup y jest-dom
    ├── app/
    │   ├── main.tsx                          T003: importa project.css (K)
    │   ├── boot/legacy-views.ts              T006: el adaptador antes de app.js
    │   └── legacy/register-project-page.tsx  T006: window.TallerProjectPage
    ├── entities/guide/
    │   ├── index.ts                          T006: exporta el catálogo y RouteMarkCollection
    │   └── model/
    │       ├── project-milestones.ts (+spec)     T005 stub y spec, T006 datos, T008 pista de Go
    │       ├── milestone-ids.ts                  T006: derivada del catálogo
    │       └── route-store.ts (+spec)            T005 stub y spec, T006 toggleMark
    └── pages/project/
        ├── index.ts                          T006
        ├── model/project-progress.ts (+spec) T005 stub y spec, T006
        └── ui/
            ├── ProjectPage.tsx (+spec.tsx)   T005 stub y spec, T006
            ├── MilestoneCard.tsx             T006
            └── project.css                   T003
qa/
├── route-milestones-check.ts                 T006: importa la definición real
├── app-shell-check.ts                        T006: sin los dos «g) hitos»
├── boot-check.ts                             T006: proyecto como vista de React
├── load-order-check.ts                       T006: la restricción del adaptador
├── lib/app-adapters.ts, lib/app-shell-harness.ts   T006: TallerProjectPage
└── e2e/
    ├── specs/project.spec.ts                 T002 (17 pruebas), T005 (la 8), T008 (invierte la 15)
    ├── pages/project.ts                      T002
    ├── fixtures/index.ts, fixtures/storage-control.ts, lib/curriculum.ts   T002
docs/architecture.md, docs/refactor-roadmap.md, qa/AGENTS.md (y docs/adr/0008 si corrió T004)   T010
package.json, package-lock.json               T004 (si toca), K
```

**Mapa de archivos:**

| Archivo | Crea o cambia | Se encarga de |
| --- | --- | --- |
| `frontend/src/entities/guide/model/project-milestones.ts` | Crea | El catálogo de los cinco hitos (sufijo, título, tarea, criterio y pista), los dos idiomas, la clave `<idioma>-<sufijo>` y la pista del idioma |
| `frontend/src/entities/guide/model/milestone-ids.ts` | Cambia | `MILESTONE_IDS` derivada del catálogo; su spec de F2a no cambia |
| `frontend/src/entities/guide/model/route-store.ts` | Cambia | `toggleMark`: alterna una marca y guarda una vez |
| `frontend/src/entities/guide/index.ts` | Cambia | La API pública suma el catálogo y `RouteMarkCollection` |
| `frontend/src/pages/project/model/project-progress.ts` | Crea | Lo que la página muestra para un idioma: los cinco hitos con ID, encabezado, textos, pista y marca, y la cuenta |
| `frontend/src/pages/project/ui/ProjectPage.tsx` | Crea | La página: lee el almacén, se suscribe a la revisión y alterna por `toggleMark` |
| `frontend/src/pages/project/ui/MilestoneCard.tsx` | Crea | Un hito: casilla, tarea, criterio y pista |
| `frontend/src/pages/project/ui/project.css` | Crea | Las reglas que sólo usa Proyecto |
| `frontend/src/pages/project/index.ts` | Crea | La API pública: `ProjectPage` |
| `frontend/src/app/legacy/register-project-page.tsx` | Crea | `window.TallerProjectPage` con `mount` y `unmount`, hasta F10 |
| `frontend/src/app/boot/legacy-views.ts` | Cambia | El adaptador entra en la cadena antes de `app.js` |
| `frontend/src/app/main.tsx` | Cambia (K) | Importa `project.css` después de `styles.css` |
| `frontend/app.js` | Cambia | Pierde la página, el arreglo y la rama; monta y desmonta la página; el shell se suscribe a la revisión para el pie |
| `frontend/styles.css` | Cambia | Pierde las reglas de Proyecto; el bloque de 590 px y la regla de impresión quedan partidos |
| `frontend/vitest.config.ts`, `frontend/src/vitest-setup-dom.ts`, `package.json`, `package-lock.json` | Cambian o se crean (K, sólo si F3 no lo hizo) | La pila de DOM de Vitest |
| `qa/route-milestones-check.ts` | Cambia | Importa el catálogo y `MILESTONE_IDS` en lugar de leer `app.js` |
| `qa/app-shell-check.ts` | Cambia | Retira los dos «g) hitos» |
| `qa/lib/app-adapters.ts`, `qa/lib/app-shell-harness.ts` | Cambian | El global nuevo y su entrada de comportamientos |
| `qa/boot-check.ts` | Cambia | `proyecto` se comprueba por nodos montados, con su encabezado |
| `qa/load-order-check.ts` | Cambia | El adaptador antes de `app.js` |
| `qa/e2e/specs/project.spec.ts`, `qa/e2e/pages/project.ts` | Crean | Los E2E de Proyecto y su Page Object |
| `qa/e2e/fixtures/index.ts`, `qa/e2e/fixtures/storage-control.ts`, `qa/e2e/lib/curriculum.ts` | Cambian | El fixture `project`, el modo «lee y no escribe» y el fixture compartido de hitos |
| `docs/architecture.md`, `docs/refactor-roadmap.md`, `qa/AGENTS.md`, `docs/adr/0008-pruebas-del-front.md` | Cambian (K) | La documentación del port |

## Review Focus

Lo que el revisor mira primero:

- **Una sola alternancia por clic.** La rama `data-milestone` salió del delegado de **`change`** de `app.js` en el mismo commit que la página entró. La página no lleva `data-milestone`. El E2E 3 cuenta una escritura y el 5 recarga.
- **Un solo almacén.**
  - La página importa el singleton `routeStore`, nunca `createRouteStore` (R3 del guard).
  - El adaptador no importa valores de `entities/guide` (R4).
  - El E2E 14 desmarca, cambia de idioma con el botón del shell y vuelve.
- **La lectura sin copia.** `useStore(routeStore.changes, selectRevision)` como sentencia y `routeStore.getProgress()` en cada render; ningún `useState` con el progreso. La spec de la página lo prueba con un `applyImport` y un `reset` hechos por fuera.
- **El pie.** `routeStore.changes.subscribe(updateSaveLabel)` en `startApp()`, justo después de `routeStore.open(data)`; el E2E 12b lo prueba con un `setItem` que falla a mitad de sesión.
- **El texto exacto.**
  - La terminal se arma con cadenas con `\n`.
  - El contador, los encabezados numerados y la introducción son una sola expresión cada uno.
  - La comparación única da 0 diferencias de árbol salvo los dos atributos admitidos.
- **La cascada.** `project.css` va después de `styles.css` y antes de `lab.css`; sus reglas conservan su orden relativo. El barrido da 0 diferencias en 49 capturas, y su control negativo las encuentra.
- **Los diez IDs.**
  - `MILESTONE_IDS` se deriva del catálogo; su spec de F2a, con los literales a mano, no cambió.
  - `route-milestones-check` importa los módulos.
  - El E2E 11 lee el fixture compartido.
- **`render()` sube 1** (de 11 a 12 por lectura), con `window.TallerProjectPage.unmount()` sin `?.` y la restricción de `load-order-check` que lo justifica.
- **Lo que no se tocó:** el backend, los kits ZIP, `content/` y `milestone-ids.spec.ts`.

**Lo que la spec implica y ninguna prueba de las tareas de arriba ejercita**, cada caso con la prueba que lo fija y la tarea que la suma:

1. **Dos clics seguidos sobre la misma casilla** (spec, casos borde): dos alternancias, dos escrituras y el estado final de hoy. Lo fija «toggles twice and writes twice on two quick clicks» en `ProjectPage.spec.tsx` (T005).
2. **Otra pestaña guardó entre dos escrituras** (spec, casos borde; ADR 0003, decisión 9): la fusión une los conjuntos y un hito desmarcado acá puede volver. Lo fija «unmarking while another tab kept the mark brings it back» en `route-store.spec.ts` (T005).
3. **El orden de tabulación** (FR-012): la casilla, el resumen de su pista y después el siguiente control. Lo fija el E2E 6, que tabula desde la última casilla hasta el enlace a la biblioteca (T002).
4. **Volver con Atrás a `#proyecto`** (spec, casos borde): la página se monta de nuevo desde el almacén, con las pistas cerradas. Lo fija el E2E 16 (T002).
5. **Un ID guardado que el catálogo no tiene** (US3, escenario 6): la carga lo descarta con su respaldo y su aviso, y la página no lo cuenta. Lo fijan el E2E 17 (T002) y «ignores a mark that the catalog does not have» en `project-progress.spec.ts` (T005).

## Lo compartido con F3 y F9

FR-035 y FR-036 piden que el primero que se integre cree lo común y los demás lo reusen. Antes de T002, quien implementa mira `master` y elige la columna que corresponde.

| Pieza | Si F4 entra primero | Si F4 entra después |
| --- | --- | --- |
| **Suscripción del pie** (`#save-label`) | T006 suma `routeStore.changes.subscribe(updateSaveLabel);` en `startApp()`, después de `routeStore.open(data);` | Si `app.js` ya tiene `routeStore.changes.subscribe(`, F4 no suma nada, sea `updateSaveLabel` o, si F9 la amplió, `syncShell` |
| **`toggleMark`** | T005 y T006 lo suman al almacén con su spec | Si `RouteStore` ya tiene una operación que alterna un ID de `completed`, `milestones` o `favorites` y guarda una vez, la página usa esa, se saltan los pasos de `toggleMark` de T005 y T006, y la rotura 5 apunta a esa operación |
| **`toggleItem` de `app.js`** | Queda: la usan la lección, los favoritos y los pasos (FR-023) | Si después de quitar la rama `data-milestone` `toggleItem` no tiene otra llamada en `app.js`, se borra en T006 (lo pediría `no-unused-vars`) |
| **El bloque de 590 px y la regla de impresión** | T003 saca de ahí las reglas de Proyecto y deja en `styles.css` el resto de cada bloque | T003 saca sólo `.project-hero`, `.project-hero h2`, `.terminal`, `.milestone` y `.milestone-head h2` del bloque que abre con `body { font-size: 14px; }`, y `.milestone` de la regla `break-inside: avoid` del `@media print`; si esa regla queda sin selectores, se borra entera |
| **La línea de `main.tsx`** | `import '../pages/project/ui/project.css';` inmediatamente después de `import '../../styles.css';` | La misma línea, después de `styles.css` y de las hojas de página que ya estén ahí, antes de `lab.css` |
| **La pila de DOM** | T004, con permiso | Se salta T004; T005 usa el proyecto `jsdom` y el setup que dejó F3, cualquiera sea su ruta |
| **El modo «lee y no escribe»** de `StorageControl` | T002 suma `blockWrites()` | Si `StorageControl` ya tiene un método que hace lanzar a `localStorage.setItem` sin tocar las lecturas, el E2E 12b usa ese y T002 no suma otro |
| **`qa/e2e/fixtures/index.ts`, `app-adapters.ts`, `app-shell-harness.ts`, `load-order-check.ts`, `legacy-views.ts`** | Una entrada por archivo | Se rebasa: las entradas son vecinas de las de F3 y F9, y el conflicto es de texto |
| **`boot-check`** | `view === 'atlas' \|\| view === 'proyecto'` | Si F3 ya convirtió la condición en un conjunto de vistas de React, se suma `'proyecto'` a ese conjunto con el mismo `mountedText` |
| **fishery** | No entra | No entra |

**Quién edita la región de `app.js`:** la rama de F4 vive en el delegado de `change`, al lado de la de `stepCheck` (F9) y las de los filtros (F3). Quien integra resuelve el conflicto de texto sin cambiar lo que hace el delegado para las otras páginas (FR-035).

## Commits, dueños y ondas

**Dueños.**

- **E, P y H:** E (los E2E), P (el port) y H (las hojas) son slices para el subagente `implementador`. Se les dan sus archivos, sus interfaces y sus checks, y se les dice que no dejen comentarios.
- **K:** es el agente principal. Hace la línea base, la pila de DOM, la línea de `main.tsx`, las comparaciones, las roturas, la documentación y el PR, y revisa cada diff.

| Orden en el PR | Commit | Tarea | Dueño | Estado de la suite |
| --- | --- | --- | --- | --- |
| — | (sin commit) la línea base | T001 | K | verde |
| 1 | `test(e2e): los E2E de Proyecto contra el legacy` | T002 | E | verde (17 nuevas, la 15 como `KNOWN DEFECT`) |
| 2 | `refactor(front): las reglas de Proyecto pasan a la hoja de su página` | T003 | H y K | verde |
| 3 | `chore(front): la pila de DOM de Vitest` (sólo si nadie la instaló) | T004 | K | verde |
| 4 | `test(front): specs de Proyecto y el E2E de las pistas abiertas (rojas)` | T005 | P | **rojo**, el único |
| 5 | `refactor(front): Proyecto pasa a una página de React y sale de app.js` | T006 | P | verde |
| — | (sin commit) la comparación única y los bytes | T007 | K | — |
| 6 | `feat(front): la pista del primer hito en Go deja de nombrar a Rust` | T008 | P, con el texto aprobado | verde |
| — | (sin commit) las roturas deliberadas | T009 | K | — |
| 7 | `docs: Proyecto en el mapa del front y en qa` | T010 | K | verde |
| — | la compuerta final y el PR | T011 | K | verde |

**Ondas.**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 y, en paralelo, el pedido de permiso de T004 (si toca) y la aprobación del texto de Go (T008) |
| 1 | E, H y K a la vez | **E:** T002. **H:** el corte de T003. **K:** T004 |
| 2 | K | Integra en la rama `f4/proyecto`, en orden: T002, T003 (con su línea de `main.tsx` y su barrido) y T004 |
| 3 | P | T005 y T006, sobre la rama integrada |
| 4 | K y P | **K:** T007. **P:** T008, cuando el usuario aprobó el texto |
| 5 | K | T009, T010 y T011 |

**Puertos de los E2E:** K `4190`, E `4191`, H `4192` y P `4193`. La comparación usa `4601` y `4602`.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, research.md, quickstart.md y tu sección;
  - las skills `tdd`, `clean-code`, `vitest`, `react-testing` y `playwright-best-practices`.
- **TDD.**
  - Cada módulo nuevo empieza con su firma lanzando `not implemented` (los parámetros sin uso se marcan con `void`), para que su spec falle por comportamiento y no por un import.
  - Los valores esperados salen de los textos de hoy, del fixture compartido o de las fixtures congeladas; nunca del módulo que probás.
  - Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca.
- **Mover no reescribe.**
  - Los textos se copian de `app.js` carácter por carácter.
  - Las reglas de CSS se cortan y se pegan sin tocar una declaración.
  - `toggleMark` repite el algoritmo de `toggleItem`.
- **Archivos que no son tuyos no se tocan;** si los necesitás, pedíselo a K. `main.tsx`, `package.json`, las configuraciones y la documentación son de K.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>`;
  - `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - `npm run build` y `E2E_PORT=<tu puerto> npm run test:e2e`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo.**
  - Código, nombres de prueba e identificadores en inglés; los textos que lee el alumno, en español y con el texto exacto de hoy.
  - **Sin comentarios** nuevos. Un comentario existente que cambia de sentido se actualiza.
  - En los componentes, `const` con nombre y `export default` al final; en los módulos, exports nombrados; `interface` para props y contratos.
  - Ningún `style=`, `setAttribute('style', …)`, `.cssText` ni `dangerouslySetInnerHTML`.
- **Commits:**
  - chicos, en español, con el prefijo de la tabla de arriba y el trailer `Co-Authored-By` de tu modelo;
  - sin `git push`, sin rebase y sin reset.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base y compuerta (K)

**Cubre:** FR-002, FR-003, FR-032 y FR-033; SC-001, SC-009, SC-011 y SC-012.

### Tarea 0.1 · La línea base (T001)

- **Cuándo:** sobre la base de implementación (`master` con F2a, A2 y F2b), antes de cualquier cambio.
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4190 npm run test:e2e`: todo en verde (123 E2E). Si algo falla, F4 no empieza.
  2. Registrar lo de quickstart §1 en `$TMPDIR/f4-baseline.txt`, fuera del repositorio:
     - los oráculos de bytes y las partes del dist, con su hash;
     - `html.length`;
     - el multiconjunto del CSS;
     - los avisos de complejidad y el valor de `render()`;
     - los escenarios de `app-shell-check` y `boot-check`;
     - las restricciones de `load-order-check`;
     - las pruebas y los archivos de Vitest por proyecto.
  3. Mirar qué de «Lo compartido con F3 y F9» ya está en `master`, y anotarlo en el mismo archivo.
- **Entrega:** el archivo y un resumen a P, E y H. Los valores entran a research.md en T010; el PR abre con los E2E (hoja de ruta, «Convenciones»).

### 0.2 · La compuerta de cada commit y del PR

Cada dueño la corre en lo que toca; K, completa, antes de integrar cada commit y antes del PR.

1. **Comandos:**
   - `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`;
   - `E2E_PORT=<puerto> npm run test:e2e`;
   - en el PR, con permiso, `docker compose build taller`.
2. **El estado esperado de la suite** es el de la tabla de commits. El commit 4 falla sólo en sus specs nuevas y en el E2E 8, cada una por `not implemented` o por la pista cerrada.
3. **Los bytes** contra T001 (quickstart §2):

   | Salida | Después del commit 2 (CSS) | Después de los commits 5 y 6 |
   | --- | --- | --- |
   | `build/curriculum.json`, `dist/content/curriculum.<versión>.json`, `dump-globals` y `dist-content-check` | iguales | iguales |
   | Script del dist | igual | cambia |
   | `<style>` del dist | cambia; el multiconjunto sin diferencias | igual al del commit 2 |
   | Marcado del dist y `frontend/src/index.html` | iguales | iguales |
   | `import(` e `import.meta` | los de la base | los de la base |
   | `html.length` | ≤ base + 200 | ≤ base + 10 000 y < 1 250 000 |

4. **Lo que no se suma:**
   - `git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText|dangerouslySetInnerHTML)'` no imprime nada;
   - `git diff <base> --stat -- backend/ content/ frontend/src/features/download-project-kit/ frontend/src/app/legacy/register-project-kit.ts frontend/src/entities/guide/model/milestone-ids.spec.ts` no imprime nada.
5. **Complejidad:** `npm run lint 2>&1 | grep -c complexity` igual a T001. Después del commit 5, el valor de `render()` es el de T001 más 1. Se mide con `npx eslint frontend/app.js --rule '{"complexity":["warn",{"max":1,"variant":"classic"}]}' 2>&1 | grep "Function 'render'"`, que lo informa aunque no pase de 10.

## 1. Los E2E contra el legacy (T002, dueño E, commit 1)

**Cubre:** FR-001 (1), FR-003, FR-012, FR-021 y FR-027 (escenarios 1 a 7 y 9 a 15, más el 16 y el 17 de «Review Focus»); US1, US2, US3, US4 y US6; SC-002, SC-003, SC-005 y SC-006.

**Entrega:**

- 18 pruebas en `qa/e2e/specs/project.spec.ts`, de las que este commit trae 17 (todas menos la 8), en verde contra el legacy;
- el Page Object;
- el fixture `project`;
- `StorageControl.blockWrites()`;
- el fixture compartido de hitos para los E2E.

### 1.1 Contratos

- **Consume:**
  - de F1, `ShellPage` (`goto`, `heading`, `switchLanguage`, `saveStatus` y `toast`), `StorageControl` (`seed`, `block`, `watchWrites`, `writes` y `snapshot`), `observeReload`, `urls.view` y `frozenProgress`;
  - de `qa/fixtures/shared/route-milestones.json`, los diez IDs.
- **Produce:**

  ```ts
  // qa/e2e/pages/project.ts
  export class ProjectPage {
    readonly intro: Locator;
    readonly counter: Locator;
    readonly terminal: Locator;
    readonly milestoneHeadings: Locator;
    readonly libraryLink: Locator;
    milestone(title: string): Locator;
    hintToggle(title: string): Locator;
    hint(title: string): Locator;
    hintText(title: string): Locator;
  }
  // qa/e2e/fixtures/storage-control.ts
  blockWrites(): Promise<void>;
  // qa/e2e/lib/curriculum.ts
  export const routeMilestoneIds: string[];
  ```

### Tarea 1.2 · Escribir y correr los E2E contra el legacy (T002)

- **Cambia:** `qa/e2e/fixtures/storage-control.ts`, `qa/e2e/lib/curriculum.ts` y `qa/e2e/fixtures/index.ts`.
- **Crea:** `qa/e2e/pages/project.ts` y `qa/e2e/specs/project.spec.ts`.
- **Pasos:**
  1. **Sumá a `StorageControl`,** después de `block()` y salvo que ya exista un método equivalente («Lo compartido»):

     ```ts
       async blockWrites(): Promise<void> {
         await this.context.addInitScript(() => {
           const setItem = Storage.prototype.setItem;
           Storage.prototype.setItem = function (key: string, value: string) {
             if (this === window.localStorage)
               throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
             return setItem.call(this, key, value);
           };
         });
       }
     ```

     Las pruebas lo llaman después de `seed()`: los init scripts corren en el orden en que se registran.

  2. **Sumá a `qa/e2e/lib/curriculum.ts,`** al final, debajo de `frozenProgress`:

     ```ts
     export const routeMilestoneIds = readFixture<string[]>('qa/fixtures/shared/route-milestones.json');
     ```

  3. **Creá `qa/e2e/pages/project.ts`:**

     ```ts
     import type { Locator, Page } from '@playwright/test';

     export class ProjectPage {
       readonly intro: Locator;
       readonly counter: Locator;
       readonly terminal: Locator;
       readonly milestoneHeadings: Locator;
       readonly libraryLink: Locator;

       constructor(readonly page: Page) {
         this.intro = page.getByText(/^Un pequeño almacén clave-valor en /);
         this.counter = page.getByText(/^PROYECTO PERSONAL · \d \/ 5 HITOS$/);
         this.terminal = page.locator('#main pre.terminal');
         this.milestoneHeadings = page.getByRole('article').getByRole('heading', { level: 2 });
         this.libraryLink = page.getByRole('link', { name: 'Encontralos en la biblioteca' });
       }

       milestone(title: string): Locator {
         return this.page.getByRole('checkbox', { name: `Completar hito: ${title}`, exact: true });
       }

       hintToggle(title: string): Locator {
         return this.card(title).getByText('Necesito una pista', { exact: true });
       }

       hint(title: string): Locator {
         return this.card(title).locator('details');
       }

       hintText(title: string): Locator {
         return this.card(title).locator('details > p');
       }

       private card(title: string): Locator {
         return this.page.getByRole('article').filter({ has: this.milestone(title) });
       }
     }
     ```

  4. **En `qa/e2e/fixtures/index.ts`:**
     - sumá `import { ProjectPage } from '../pages/project';` en orden alfabético;
     - sumá `project: ProjectPage;` a `Fixtures`, después de `atlas`;
     - sumá `project: async ({ page }, use) => use(new ProjectPage(page)),` después del de `atlas`.
  5. **Creá `qa/e2e/specs/project.spec.ts`:**

     ```ts
     import type { Page } from '@playwright/test';
     import { expect, test } from '../fixtures';
     import { frozenProgress, routeMilestoneIds, type StorageKey } from '../lib/curriculum';
     import { observeReload } from '../lib/document-marker';
     import { urls } from '../lib/urls';

     const ROUTE_KEY = 'taller-learning-v1' satisfies StorageKey;
     const OTHER_KEYS: StorageKey[] = [
       'taller-laboratorio-v1',
       'taller-campaign-v1',
       'taller-systems-v1',
     ];
     const TITLES = [
       'Un lugar para guardar cosas',
       'Tu programa entiende comandos',
       'Los datos sobreviven al reinicio',
       'Medir antes de optimizar',
       'Una conversación por TCP',
     ];
     const HEADINGS = [
       '01. Un lugar para guardar cosas',
       '02. Tu programa entiende comandos',
       '03. Los datos sobreviven al reinicio',
       '04. Medir antes de optimizar',
       '05. Una conversación por TCP',
     ];
     const TERMINAL = '> SET curiosidad encendida\nOK\n> GET curiosidad\nencendida\n> _';
     const FIRST_HINT_RUST =
       'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.';
     const DROPPED_NOTICE =
       'Se descartó 1 registro del recorrido que esta versión no reconoce; se conservó una copia en taller-learning-v1:respaldo.';

     function counterText(done: number): string {
       return `PROYECTO PERSONAL · ${done} / 5 HITOS`;
     }

     function routeProgress(language: 'rust' | 'go', milestones: string[]): string {
       return JSON.stringify({
         version: 1,
         language,
         completed: [],
         milestones,
         favorites: [],
         quizAnswers: {},
         notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
         minutes: 25,
       });
     }

     async function storedMilestones(page: Page): Promise<string[]> {
       return page.evaluate((key) => {
         const text = localStorage.getItem(key);
         return text === null ? [] : (JSON.parse(text) as { milestones: string[] }).milestones;
       }, ROUTE_KEY);
     }

     test.describe('the milestones of the project', () => {
       test('lists the five milestones of Rust in order, with the counter at zero', async ({
         shell,
         project,
       }) => {
         await shell.goto(urls.view('proyecto'));

         await expect(project.intro).toHaveText(/^Un pequeño almacén clave-valor en Rust\. /);
         await expect(project.milestoneHeadings).toHaveText(HEADINGS);
         await expect(project.counter).toHaveText(counterText(0));
         await expect(project.terminal).toHaveJSProperty('textContent', TERMINAL);
         for (const title of TITLES) await expect(project.milestone(title)).not.toBeChecked();
       });

       test('lists the same five milestones in Go, with its introduction', async ({
         shell,
         project,
       }) => {
         await shell.goto(urls.view('proyecto'));
         await shell.switchLanguage('go');

         await expect(project.intro).toHaveText(/^Un pequeño almacén clave-valor en Go\. /);
         await expect(project.milestoneHeadings).toHaveText(HEADINGS);
         await expect(project.counter).toHaveText(counterText(0));
       });

       test('checking a milestone saves its id with one write and raises the counter', async ({
         shell,
         project,
         storage,
         page,
       }) => {
         await storage.watchWrites();
         await shell.goto(urls.view('proyecto'));
         expect(await storage.writes()).toEqual([]);

         await project.milestone(TITLES[0]).click();

         await expect(project.milestone(TITLES[0])).toBeChecked();
         await expect(project.counter).toHaveText(counterText(1));
         expect(await storage.writes()).toEqual([`set ${ROUTE_KEY}`]);
         expect(await storedMilestones(page)).toEqual(['rust-memory']);
       });

       test('unchecking a milestone removes its id and lowers the counter', async ({
         shell,
         project,
         storage,
         page,
       }) => {
         await storage.seed({ [ROUTE_KEY]: routeProgress('rust', ['rust-memory', 'rust-files']) });
         await shell.goto(urls.view('proyecto'));
         await expect(project.counter).toHaveText(counterText(2));

         await project.milestone(TITLES[0]).click();

         await expect(project.milestone(TITLES[0])).not.toBeChecked();
         await expect(project.counter).toHaveText(counterText(1));
         expect(await storedMilestones(page)).toEqual(['rust-files']);
       });

       test('a checked milestone stays checked after a reload', async ({ shell, project, page }) => {
         await shell.goto(urls.view('proyecto'));
         await project.milestone(TITLES[2]).click();
         await expect(project.milestone(TITLES[2])).toBeChecked();

         await page.reload();

         await expect(project.milestone(TITLES[2])).toBeChecked();
         await expect(project.counter).toHaveText(counterText(1));
         expect(await storedMilestones(page)).toEqual(['rust-files']);
       });
     });

     test.describe('the keyboard', () => {
       test('Space toggles the checkbox, keeps the focus and the scroll, and Tab goes to its hint', async ({
         shell,
         project,
         page,
       }) => {
         await shell.goto(urls.view('proyecto'));
         const last = project.milestone(TITLES[4]);
         await last.focus();
         const scroll = await page.evaluate(() => window.scrollY);

         await page.keyboard.press('Space');

         await expect(last).toBeChecked();
         await expect(last).toBeFocused();
         expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
         await page.keyboard.press('Tab');
         await expect(project.hintToggle(TITLES[4])).toBeFocused();
         await page.keyboard.press('Tab');
         await expect(project.libraryLink).toBeFocused();
       });

       test('Enter opens and closes «Necesito una pista»', async ({ shell, project, page }) => {
         await shell.goto(urls.view('proyecto'));
         await project.hintToggle(TITLES[1]).focus();

         await page.keyboard.press('Enter');
         await expect(project.hint(TITLES[1])).toHaveJSProperty('open', true);
         await expect(project.hintText(TITLES[1])).toBeVisible();

         await page.keyboard.press('Enter');
         await expect(project.hint(TITLES[1])).toHaveJSProperty('open', false);
         await expect(project.hintText(TITLES[1])).toBeHidden();
       });
     });

     test.describe('the languages and the saved progress', () => {
       test('Rust and Go keep separate progress', async ({ shell, project, page }) => {
         await shell.goto(urls.view('proyecto'));
         await project.milestone(TITLES[0]).click();
         await expect(project.counter).toHaveText(counterText(1));

         await shell.switchLanguage('go');
         await expect(project.counter).toHaveText(counterText(0));
         await expect(project.milestone(TITLES[0])).not.toBeChecked();
         await project.milestone(TITLES[0]).click();
         await expect(project.milestone(TITLES[0])).toBeChecked();
         expect(await storedMilestones(page)).toEqual(['rust-memory', 'go-memory']);

         await shell.switchLanguage('rust');
         await expect(project.counter).toHaveText(counterText(1));
       });

       test('the frozen progress of master opens without writing: 0 / 5 in Go and 1 / 5 in Rust', async ({
         shell,
         project,
         storage,
       }) => {
         await storage.seed(frozenProgress);
         await storage.watchWrites();
         await shell.goto(urls.view('proyecto'));

         await expect(project.counter).toHaveText(counterText(0));
         for (const title of TITLES) await expect(project.milestone(title)).not.toBeChecked();
         expect(await storage.writes()).toEqual([]);
         const stored = await storage.snapshot();
         expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
         await expect(shell.toast).toHaveText('');

         await shell.switchLanguage('rust');
         await expect(project.counter).toHaveText(counterText(1));
         await expect(project.milestone(TITLES[0])).toBeChecked();
       });

       test('each of the ten milestones saves exactly the id of the shared fixture', async ({
         shell,
         project,
         storage,
         page,
       }) => {
         await storage.seed({
           'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'],
           'taller-campaign-v1': frozenProgress['taller-campaign-v1'],
           'taller-systems-v1': frozenProgress['taller-systems-v1'],
         });
         await shell.goto(urls.view('proyecto'));

         for (const [index, title] of TITLES.entries()) {
           await project.milestone(title).click();
           await expect(project.milestone(title)).toBeChecked();
           expect(await storedMilestones(page)).toEqual(routeMilestoneIds.slice(0, index + 1));
         }
         await shell.switchLanguage('go');
         for (const [index, title] of TITLES.entries()) {
           await project.milestone(title).click();
           await expect(project.milestone(title)).toBeChecked();
           expect(await storedMilestones(page)).toEqual(routeMilestoneIds.slice(0, 6 + index));
         }

         const stored = await storage.snapshot();
         for (const key of OTHER_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
       });

       test('a milestone unchecked in Rust stays unchecked after switching to Go and back', async ({
         shell,
         project,
         storage,
         page,
       }) => {
         await storage.seed(frozenProgress);
         await shell.goto(urls.view('proyecto'));
         await shell.switchLanguage('rust');
         await expect(project.milestone(TITLES[0])).toBeChecked();

         await project.milestone(TITLES[0]).click();
         await expect(project.milestone(TITLES[0])).not.toBeChecked();
         await shell.switchLanguage('go');
         await expect(project.counter).toHaveText(counterText(0));
         await shell.switchLanguage('rust');

         await expect(project.milestone(TITLES[0])).not.toBeChecked();
         await expect(project.counter).toHaveText(counterText(0));
         expect(await storedMilestones(page)).toEqual([]);
       });

       test('a saved id that the catalog does not know is dropped at load and not counted', async ({
         shell,
         project,
         storage,
       }) => {
         await storage.seed({ [ROUTE_KEY]: routeProgress('go', ['go-memory', 'go-inexistente']) });
         await shell.goto(urls.view('proyecto'));

         await expect(project.counter).toHaveText(counterText(1));
         await expect(project.milestone(TITLES[0])).toBeChecked();
         await expect(shell.toast).toHaveText(DROPPED_NOTICE);
         expect(Object.keys(await storage.snapshot())).toContain(`${ROUTE_KEY}:respaldo`);
       });
     });

     test.describe('the storage that fails', () => {
       test('with the storage blocked, a milestone toggles in memory and the footer asks to export', async ({
         shell,
         project,
         storage,
       }) => {
         await storage.block();
         await shell.goto(urls.view('proyecto'));
         await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();

         await project.milestone(TITLES[1]).click();

         await expect(project.milestone(TITLES[1])).toBeChecked();
         await expect(project.counter).toHaveText(counterText(1));
         await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
       });

       test('when setItem fails mid-session, the footer changes on the first save', async ({
         shell,
         project,
         storage,
         page,
       }) => {
         await storage.blockWrites();
         await shell.goto(urls.view('proyecto'));
         await expect(shell.saveStatus('Guardado en este navegador')).toBeVisible();

         await project.milestone(TITLES[3]).click();

         await expect(project.milestone(TITLES[3])).toBeChecked();
         await expect(project.counter).toHaveText(counterText(1));
         await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
         expect(await storedMilestones(page)).toEqual([]);
       });
     });

     test.describe('the links and the history', () => {
       test('the link to the library opens it without reloading the document', async ({
         shell,
         project,
         page,
       }) => {
         await shell.goto(urls.view('proyecto'));

         const reloaded = await observeReload(page, () => project.libraryLink.click());

         expect(reloaded).toBe(false);
         await expect(shell.heading('biblioteca')).toBeVisible();
         await expect(page).toHaveURL(/#biblioteca$/);
       });

       test('going back to the project mounts it again from the saved progress, with its hints closed', async ({
         shell,
         project,
         page,
       }) => {
         await shell.goto(urls.view('proyecto'));
         await project.milestone(TITLES[0]).click();
         await expect(project.milestone(TITLES[0])).toBeChecked();
         await project.hintToggle(TITLES[2]).click();
         await expect(project.hint(TITLES[2])).toHaveJSProperty('open', true);

         await project.libraryLink.click();
         await expect(shell.heading('biblioteca')).toBeVisible();
         await page.goBack();

         await expect(shell.heading('proyecto')).toBeVisible();
         await expect(project.milestone(TITLES[0])).toBeChecked();
         await expect(project.hint(TITLES[2])).toHaveJSProperty('open', false);
       });
     });

     test.describe('the hints', () => {
       test('KNOWN DEFECT (spec 013, FR-015): the hint of the first milestone in Go names Rust', async ({
         shell,
         project,
       }) => {
         await shell.goto(urls.view('proyecto'));
         await project.hintToggle(TITLES[0]).click();
         await expect(project.hintText(TITLES[0])).toHaveText(FIRST_HINT_RUST);

         await shell.switchLanguage('go');
         await project.hintToggle(TITLES[0]).click();

         await expect(project.hintText(TITLES[0])).toHaveText(FIRST_HINT_RUST);
       });
     });
     ```

  6. **`npx prettier --write qa/e2e/specs/project.spec.ts qa/e2e/pages/project.ts`**, después `npm run typecheck` y `npm run lint`.
  7. **Correlos contra el legacy:** `npm run build` y `E2E_PORT=4191 npm run test:e2e -- specs/project.spec.ts`. Esperado: **17 de 17**.
     - **Si una falla, no edites el valor esperado.** La prueba describe el comportamiento de la spec. Escribí qué hace el legacy y avisale a K, que decide con el usuario si la spec leyó mal el código (riesgo 13).
     - **La excepción es una falla de localizador** (un nombre accesible distinto del que se leyó en el código): se corrige el Page Object, y K lo revisa.
  8. **La red entera:** `E2E_PORT=4191 npm run test:e2e`, con 140 de 140 (123 y 17), y `npm run test:e2e -- specs/project.spec.ts --repeat-each=3` sin fallas, para descartar pruebas inestables.
  9. **Un commit:** `test(e2e): los E2E de Proyecto contra el legacy`.
- **Compuerta:** los pasos 7 y 8.
- **Vuelta atrás:** revertí el commit; nada depende de él hasta T005.

## 2. El CSS a la hoja de la página (T003, H y K, commit 2)

**Cubre:** FR-013, FR-030 (para el CSS), FR-032 y FR-034; US4, escenario 2; SC-004 y SC-009.

**Entrega:** las 14 reglas base, las 5 del bloque de 590 px y `.milestone` de impresión, en `frontend/src/pages/project/ui/project.css` y en su orden; `styles.css` sin ellas; `main.tsx` importa la hoja.

### Tarea 2.1 · Cortar y pegar las reglas (H)

- **Cambia:** `frontend/styles.css`. **Crea:** `frontend/src/pages/project/ui/project.css`.
- **Pasos:**
  1. **Ubicá las reglas por su texto, no por número.** En `2b37caf4` van de la línea 887 a la 959 (desde `.project-hero {` hasta `.milestone details p { margin-left: 0; }`), entre `.empty-state p` y `.method-grid`. Cortalas enteras.
  2. **En el primer bloque `@media (max-width: 590px)`,** el que abre con `body { font-size: 14px; }`, cortá estas cinco reglas, que van entre `.resource-fit` y `.notes-grid`: `.project-hero`, `.project-hero h2`, `.terminal`, `.milestone` y `.milestone-head h2`. El resto del bloque no se toca.
  3. **En el bloque `@media print`,** en la regla `.resource-card, .module, .milestone { break-inside: avoid; }`, quitá `.milestone` de la lista de selectores. Si queda sin selectores, porque F3 y F9 ya entraron, borrá la regla entera.
  4. **Creá `frontend/src/pages/project/ui/project.css`** con este texto exacto, que es el que cortaste en el mismo orden, más los dos bloques `@media` nuevos:

     ```css
     .project-hero {
       background: var(--ink);
       color: var(--surface);
       border-radius: 7px;
       padding: 30px;
       display: grid;
       grid-template-columns: 1fr 1fr;
       gap: 30px;
       margin-bottom: 30px;
     }
     .project-hero p {
       font-size: 13px;
       color: #c2cabc;
     }
     .project-hero h2 {
       font-size: 28px;
       margin-bottom: 14px;
     }
     .project-hero .small-label {
       color: #c2cabc;
       margin-bottom: 15px;
       display: block;
     }
     .terminal {
       font-family: var(--mono);
       font-size: 12px;
       background: #1d241f;
       padding: 20px;
       border-radius: 5px;
       color: #c9d5c0;
       line-height: 2;
       white-space: pre-wrap;
       margin: 0;
       align-self: center;
     }
     .terminal .prompt {
       color: #e5b07d;
     }
     .milestones {
       display: grid;
       gap: 12px;
     }
     .milestone {
       background: var(--surface);
       border: 1px solid var(--line);
       border-radius: 6px;
       padding: 22px;
     }
     .milestone-head {
       display: flex;
       align-items: center;
       gap: 14px;
     }
     .milestone-head h2 {
       font-size: 19px;
       letter-spacing: -0.5px;
       margin: 0;
     }
     .milestone p {
       font-size: 12px;
       margin: 10px 0 0 32px;
     }
     .milestone details {
       margin: 12px 0 0 32px;
       font-size: 12px;
     }
     .milestone summary {
       cursor: pointer;
       color: var(--accent);
     }
     .milestone details p {
       margin-left: 0;
     }
     @media (max-width: 590px) {
       .project-hero {
         grid-template-columns: 1fr;
         gap: 5px;
         padding: 24px;
       }
       .project-hero h2 {
         font-size: 25px;
       }
       .terminal {
         font-size: 11px;
       }
       .milestone {
         padding: 19px;
       }
       .milestone-head h2 {
         font-size: 17px;
       }
     }
     @media print {
       .milestone {
         break-inside: avoid;
       }
     }
     ```

     Si lo que cortaste difiere en algún carácter de este bloque, el que vale es lo que cortaste: avisale a K.
  5. `npx prettier --check frontend/styles.css frontend/src/pages/project/ui/project.css`.
  6. Entregá el diff a K, sin commit.

### Tarea 2.2 · La línea de `main.tsx`, el barrido y el commit (K)

1. **En `frontend/src/app/main.tsx`,** inmediatamente después de `import '../../styles.css';` (y de las hojas de página que ya estén ahí, antes de `lab.css`), sumá:

   ```ts
   import '../pages/project/ui/project.css';
   ```

2. `node qa/load-order-check.ts`: `styles.css` sigue siendo la primera hoja.
3. `npm run build` y la compuerta §0.2 (columna del commit 2): el script, el marcado y los oráculos idénticos a T001.
4. **Las tres pruebas del CSS** (quickstart §3.1):
   - el multiconjunto, sin diferencias;
   - la comparación de quickstart §3.2 entre la base y este commit: 7 árboles y 49 capturas, 0 diferencias;
   - su control negativo: el bloque de 590 px al principio de `project.css`, en una copia descartable, da diferencias a 590 px.
5. `E2E_PORT=4192 npm run test:e2e`: 140 de 140, con `css-contract` entero.
6. **Un commit:** `refactor(front): las reglas de Proyecto pasan a la hoja de su página`.

- **Compuerta:** los pasos 3 a 5.
- **Vuelta atrás:** revertí el commit; devuelve las dos hojas y `main.tsx`.

## 3. La pila de DOM (T004, K, commit 3, sólo si nadie la instaló)

**Cubre:** FR-028 y FR-036 (la pila); research.md, R10.

- **Condición:** `package.json` no tiene `jsdom` ni `@testing-library/react`. Si F3 ya los trajo, la tarea se salta y `tasks.md` lo anota.
- **Permiso:** antes de bajar nada, pedí al usuario la descarga de `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1.
  - **Origen:** el registro de npm.
  - **Peso:** 56 paquetes con sus dependencias, unos 26,3 MB desempaquetados y 5,0 MB comprimidos, según la estimación del ADR 0008.
  - **Licencia:** MIT las cinco.
  - **Dónde van:** sólo a `devDependencies`. Las imágenes que corren `npm ci` también las instalan.
- **Pasos:**
  1. `npm install --save-dev --save-exact jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 @testing-library/jest-dom@7.0.1`; `git diff package.json` muestra sólo esas cinco líneas, en orden alfabético.
  2. **Reemplazá `frontend/vitest.config.ts`:**

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
             { test: { name: 'node', environment: 'node', include: ['**/*.spec.ts'] } },
             {
               test: {
                 name: 'jsdom',
                 environment: 'jsdom',
                 include: ['**/*.spec.tsx'],
                 setupFiles: [resolve(import.meta.dirname, 'src/vitest-setup-dom.ts')],
               },
             },
           ],
         },
       }),
     );
     ```

     **Por qué así:** la raíz no lleva `include` ni `environment`, porque en Vitest 5 los proyectos en línea heredan la raíz y concatenan sus arreglos.
  3. **Creá `frontend/src/vitest-setup-dom.ts`:**

     ```ts
     import '@testing-library/jest-dom/vitest';
     import { cleanup } from '@testing-library/react';
     import { afterEach } from 'vitest';

     afterEach(() => {
       cleanup();
     });
     ```

  4. **Comprobá:**
     - `npx vitest list --config frontend/vitest.config.ts --project node --filesOnly | wc -l` da los archivos de T001;
     - `npm run test:unit` da las pruebas de T001;
     - `npm run typecheck`, `npm run lint`, `npm run format:check` y `node qa/seams-guard-check.ts` en verde;
     - `npm run build` y el script del dist idéntico al del commit 2. Nada de esto es alcanzable desde `main.tsx`.
  5. **Un commit:** `chore(front): la pila de DOM de Vitest (jsdom y Testing Library)`.
- **Vuelta atrás:** revertí el commit y corré `npm ci`.

## 4. Las specs en rojo (T005, dueño P, commit 4)

**Cubre:** FR-001 (2), FR-009, FR-010, FR-014, FR-017, FR-018, FR-028 y FR-036 (la operación); US1 a US4 y US6; SC-002 y SC-006.

### 4.1 Contratos (los produce esta tarea como firmas; T006 los implementa)

```ts
// frontend/src/entities/guide/model/route-store.ts
export type RouteMarkCollection = 'completed' | 'milestones' | 'favorites';
export interface RouteStore {
  // …the members of today, unchanged…
  toggleMark(collection: RouteMarkCollection, id: string): boolean; // one write and one revision; false if it did not save
}

// frontend/src/entities/guide/model/project-milestones.ts
export type MilestoneHint = string | Readonly<Record<GuideLanguage, string>>;
export interface ProjectMilestone {
  suffix: string;
  title: string;
  task: string;
  doneWhen: string;
  hint: MilestoneHint;
}
export const MILESTONE_LANGUAGES: readonly GuideLanguage[]; // ['rust', 'go']
export const PROJECT_MILESTONES: readonly ProjectMilestone[];
export function milestoneId(language: GuideLanguage, milestone: ProjectMilestone): string; // `${language}-${suffix}`
export function milestoneHint(milestone: ProjectMilestone, language: GuideLanguage): string;

// frontend/src/pages/project/model/project-progress.ts
export interface MilestoneView {
  id: string;
  heading: string; // '01. Un lugar para guardar cosas'
  title: string;
  task: string;
  doneWhen: string;
  hint: string;
  completed: boolean;
}
export interface ProjectProgress {
  milestones: MilestoneView[];
  completedCount: number;
}
export function projectProgress(marked: readonly string[], language: GuideLanguage): ProjectProgress;

// frontend/src/pages/project/ui/ProjectPage.tsx
interface ProjectPageProps {
  language: GuideLanguage;
}
const ProjectPage: (props: ProjectPageProps) => JSX.Element; // export default

// frontend/src/app/legacy/register-project-page.tsx (T006)
window.TallerProjectPage: Readonly<{
  mount(host: HTMLElement | null, requestedLanguage?: string): void;
  unmount(): void;
}>;
```

### Tarea 4.2 · Las firmas, las specs y el E2E 8 (T005)

- **Requiere:** T002 integrada y el proyecto `jsdom` de Vitest (T004 o F3).
- **Cambia:** `route-store.ts` y `route-store.spec.ts` (en `frontend/src/entities/guide/model/`), y `qa/e2e/specs/project.spec.ts`.
- **Crea:**
  - `project-milestones.ts` y su spec, en `frontend/src/entities/guide/model/`;
  - en `frontend/src/pages/project/`, `model/project-progress.ts` con su spec, y `ui/ProjectPage.tsx` con su spec `.tsx`.
- **Pasos:**
  1. **`route-store.ts`:**
     - arriba de `export interface RouteStore`, sumá `export type RouteMarkCollection = 'completed' | 'milestones' | 'favorites';`;
     - en la interfaz, después de `save(): boolean;`, sumá `toggleMark(collection: RouteMarkCollection, id: string): boolean;`;
     - en el objeto que devuelve `createRouteStore`, después de `save() { … },`, sumá:

     ```ts
         toggleMark(collection, id) {
           void collection;
           void id;
           throw new Error('not implemented');
         },
     ```

  2. **Al final de `route-store.spec.ts`,** sumá (usa los ayudantes que ya tiene el archivo: `memoryStorage`, `savedRoute`, `openStore`, `storedRoute` y `KEY`):

     ```ts
     describe('toggling a mark of the route', () => {
       it('appends an absent id at the end and saves once with one revision', () => {
         const storage = memoryStorage({ [KEY]: savedRoute({ milestones: ['go-files'] }) });
         const store = openStore(storage);

         expect(store.toggleMark('milestones', 'rust-memory')).toBe(true);

         expect(storage.writes).toEqual([KEY]);
         expect(store.changes.getState().revision).toBe(1);
         expect(storedRoute(storage).milestones).toEqual(['go-files', 'rust-memory']);
       });

       it('removes a present id and changes no other field', () => {
         const before = {
           language: 'go' as const,
           completed: ['rust-ownership'],
           favorites: ['rust-100'],
           minutes: 45,
         };
         const storage = memoryStorage({
           [KEY]: savedRoute({ ...before, milestones: ['rust-memory', 'go-files'] }),
         });
         const store = openStore(storage);

         store.toggleMark('milestones', 'rust-memory');

         expect(storedRoute(storage)).toEqual(
           JSON.parse(savedRoute({ ...before, milestones: ['go-files'] })),
         );
       });

       it('toggles favorites and completed steps in their own collection', () => {
         const storage = memoryStorage();
         const store = openStore(storage);

         store.toggleMark('favorites', 'go-tour');
         store.toggleMark('completed', 'rust-ownership');

         expect(storedRoute(storage).favorites).toEqual(['go-tour']);
         expect(storedRoute(storage).completed).toEqual(['rust-ownership']);
         expect(storedRoute(storage).milestones).toEqual([]);
         expect(store.changes.getState().revision).toBe(2);
       });

       it('keeps the toggled state in memory when the write fails', () => {
         const storage = memoryStorage();
         const store = openStore(storage);
         storage.setItem = () => {
           throw new Error('quota');
         };

         expect(store.toggleMark('milestones', 'go-memory')).toBe(false);

         expect(store.getProgress().milestones).toEqual(['go-memory']);
         expect(store.storageAvailable()).toBe(false);
         expect(store.changes.getState().revision).toBe(1);
         expect(storage.items.has(KEY)).toBe(false);
       });

       it('unmarking while another tab kept the mark brings it back (ADR 0003, decision 9)', () => {
         const storage = memoryStorage({ [KEY]: savedRoute({ milestones: ['rust-memory'] }) });
         const store = openStore(storage);
         storage.items.set(KEY, savedRoute({ milestones: ['rust-memory', 'go-files'] }));

         store.toggleMark('milestones', 'rust-memory');

         expect(storedRoute(storage).milestones).toEqual(['rust-memory', 'go-files']);
       });
     });
     ```

  3. **Creá `frontend/src/entities/guide/model/project-milestones.ts` con la firma:**

     ```ts
     import type { GuideLanguage } from './types';

     export type MilestoneHint = string | Readonly<Record<GuideLanguage, string>>;

     export interface ProjectMilestone {
       suffix: string;
       title: string;
       task: string;
       doneWhen: string;
       hint: MilestoneHint;
     }

     export const MILESTONE_LANGUAGES: readonly GuideLanguage[] = ['rust', 'go'];

     export const PROJECT_MILESTONES: readonly ProjectMilestone[] = [];

     export function milestoneId(language: GuideLanguage, milestone: ProjectMilestone): string {
       void language;
       void milestone;
       throw new Error('not implemented');
     }

     export function milestoneHint(milestone: ProjectMilestone, language: GuideLanguage): string {
       void milestone;
       void language;
       throw new Error('not implemented');
     }
     ```

  4. **Creá `frontend/src/entities/guide/model/project-milestones.spec.ts`:**

     ```ts
     import { describe, expect, it } from 'vitest';
     import {
       MILESTONE_LANGUAGES,
       PROJECT_MILESTONES,
       milestoneHint,
       milestoneId,
     } from './project-milestones';

     const TITLES = [
       'Un lugar para guardar cosas',
       'Tu programa entiende comandos',
       'Los datos sobreviven al reinicio',
       'Medir antes de optimizar',
       'Una conversación por TCP',
     ];
     const TEN_IDS = [
       'rust-memory',
       'rust-commands',
       'rust-files',
       'rust-measure',
       'rust-network',
       'go-memory',
       'go-commands',
       'go-files',
       'go-measure',
       'go-network',
     ];
     const FIRST_HINT_TODAY =
       'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.';
     const LAST_HINT =
       'TCP transporta un flujo de bytes: cada lectura no equivale a un comando completo. Acumulá bytes hasta el delimitador. Después podés investigar varios clientes y acceso compartido a los datos.';

     describe('the catalog of project milestones', () => {
       it('has five milestones, in the order and with the titles of the page', () => {
         expect(PROJECT_MILESTONES.map((milestone) => milestone.title)).toEqual(TITLES);
       });

       it('builds the ten persisted ids, Rust first and then Go', () => {
         expect(
           MILESTONE_LANGUAGES.flatMap((language) =>
             PROJECT_MILESTONES.map((milestone) => milestoneId(language, milestone)),
           ),
         ).toEqual(TEN_IDS);
       });

       it('shares the hint of the last four milestones between the two languages', () => {
         const rest = PROJECT_MILESTONES.slice(1);
         expect(rest).toHaveLength(4);
         expect(rest.map((milestone) => milestoneHint(milestone, 'go'))).toEqual(
           rest.map((milestone) => milestoneHint(milestone, 'rust')),
         );
         expect(milestoneHint(PROJECT_MILESTONES[4], 'go')).toBe(LAST_HINT);
       });

       it('KNOWN DEFECT (spec 013, FR-015): the first milestone gives Go the hint that names Rust', () => {
         expect(milestoneHint(PROJECT_MILESTONES[0], 'rust')).toBe(FIRST_HINT_TODAY);
         expect(milestoneHint(PROJECT_MILESTONES[0], 'go')).toBe(FIRST_HINT_TODAY);
       });
     });
     ```

  5. **Creá `frontend/src/pages/project/model/project-progress.ts` con la firma:**

     ```ts
     import type { GuideLanguage } from '../../../entities/guide';

     export interface MilestoneView {
       id: string;
       heading: string;
       title: string;
       task: string;
       doneWhen: string;
       hint: string;
       completed: boolean;
     }

     export interface ProjectProgress {
       milestones: MilestoneView[];
       completedCount: number;
     }

     export function projectProgress(
       marked: readonly string[],
       language: GuideLanguage,
     ): ProjectProgress {
       void marked;
       void language;
       throw new Error('not implemented');
     }
     ```

  6. **Creá `frontend/src/pages/project/model/project-progress.spec.ts`:**

     ```ts
     import { describe, expect, it } from 'vitest';
     import { projectProgress } from './project-progress';

     const HEADINGS = [
       '01. Un lugar para guardar cosas',
       '02. Tu programa entiende comandos',
       '03. Los datos sobreviven al reinicio',
       '04. Medir antes de optimizar',
       '05. Una conversación por TCP',
     ];
     const FIRST_HINT_TODAY =
       'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.';

     describe('the progress shown by the project page', () => {
       it('lists the five milestones of Rust with their numbered headings and their ids', () => {
         const { milestones } = projectProgress([], 'rust');
         expect(milestones.map((milestone) => milestone.heading)).toEqual(HEADINGS);
         expect(milestones.map((milestone) => milestone.id)).toEqual([
           'rust-memory',
           'rust-commands',
           'rust-files',
           'rust-measure',
           'rust-network',
         ]);
       });

       it('uses the same headings and the Go ids on the Go page', () => {
         const { milestones } = projectProgress([], 'go');
         expect(milestones.map((milestone) => milestone.heading)).toEqual(HEADINGS);
         expect(milestones.map((milestone) => milestone.id)).toEqual([
           'go-memory',
           'go-commands',
           'go-files',
           'go-measure',
           'go-network',
         ]);
       });

       it('counts only the marks of the active language', () => {
         const progress = projectProgress(['rust-memory', 'go-files', 'go-network'], 'go');
         expect(progress.completedCount).toBe(2);
         expect(
           progress.milestones.filter((milestone) => milestone.completed).map((milestone) => milestone.id),
         ).toEqual(['go-files', 'go-network']);
       });

       it('counts 0 in Go and 1 in Rust with the marks of the frozen master progress', () => {
         expect(projectProgress(['rust-memory'], 'go').completedCount).toBe(0);
         expect(projectProgress(['rust-memory'], 'rust').completedCount).toBe(1);
       });

       it('ignores a mark that the catalog does not have', () => {
         expect(projectProgress(['go-inexistente'], 'go').completedCount).toBe(0);
       });

       it('keeps the task and the done criteria of the second milestone', () => {
         const second = projectProgress([], 'rust').milestones[1];
         expect(second.task).toBe(
           'Leé comandos desde la entrada estándar. Separá el texto recibido de la operación que ejecuta el almacén y devolvé errores claros.',
         );
         expect(second.doneWhen).toBe(
           'SET nombre Ana y GET nombre funcionan. Un comando desconocido o incompleto muestra un error sin terminar el programa.',
         );
       });

       it('KNOWN DEFECT (spec 013, FR-015): the hint of the first milestone in Go names Rust', () => {
         expect(projectProgress([], 'rust').milestones[0].hint).toBe(FIRST_HINT_TODAY);
         expect(projectProgress([], 'go').milestones[0].hint).toBe(FIRST_HINT_TODAY);
       });
     });
     ```

  7. **Creá `frontend/src/pages/project/ui/ProjectPage.tsx` con la firma:**

     ```tsx
     import type { GuideLanguage } from '../../../entities/guide';

     interface ProjectPageProps {
       language: GuideLanguage;
     }

     const ProjectPage = ({ language }: ProjectPageProps) => {
       void language;
       throw new Error('not implemented');
     };

     export default ProjectPage;
     ```

  8. **Creá `frontend/src/pages/project/ui/ProjectPage.spec.tsx`:**

     ```tsx
     import { act, render, screen, within } from '@testing-library/react';
     import { userEvent } from '@testing-library/user-event';
     import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
     import {
       blankRouteProgress,
       routeStore,
       type GuideData,
       type RouteProgressV1,
     } from '../../../entities/guide';
     import type { StorageLike } from '../../../shared/lib/versioned-storage';
     import ProjectPage from './ProjectPage';

     const KEY = 'taller-learning-v1';
     const HEADINGS = [
       '01. Un lugar para guardar cosas',
       '02. Tu programa entiende comandos',
       '03. Los datos sobreviven al reinicio',
       '04. Medir antes de optimizar',
       '05. Una conversación por TCP',
     ];
     const TERMINAL = '> SET curiosidad encendida\nOK\n> GET curiosidad\nencendida\n> _';
     const RUST_INTRO =
       'Un pequeño almacén clave-valor en Rust. Cada capacidad te da una razón para aprender el siguiente concepto. El proyecto tiene su propio avance: los ejercicios del recorrido lo preparan.';

     const guide: GuideData = {
       resources: [],
       tracks: {
         rust: { title: 'Rust', description: '', modules: [] },
         go: { title: 'Go', description: '', modules: [] },
       },
       sources: [],
     };

     interface SpecStorage extends StorageLike {
       items: Map<string, string>;
       writes: string[];
       failWrites: boolean;
     }

     const storage: SpecStorage = {
       items: new Map(),
       writes: [],
       failWrites: false,
       getItem: (key) => storage.items.get(key) ?? null,
       setItem: (key, value) => {
         if (storage.failWrites) throw new Error('quota');
         storage.writes.push(key);
         storage.items.set(key, value);
       },
       removeItem: (key) => void storage.items.delete(key),
     };

     function progress(overrides: Partial<RouteProgressV1>): RouteProgressV1 {
       return { ...blankRouteProgress(), ...overrides };
     }

     function seed(overrides: Partial<RouteProgressV1>): void {
       routeStore.applyImport({ state: progress(overrides), lossy: false });
       storage.writes.length = 0;
     }

     function storedMilestones(): string[] {
       const text = storage.items.get(KEY);
       return text === undefined ? [] : (JSON.parse(text) as RouteProgressV1).milestones;
     }

     function milestone(title: string): HTMLElement {
       return screen.getByRole('checkbox', { name: `Completar hito: ${title}` });
     }

     beforeAll(() => {
       routeStore.open(guide, { storage });
     });

     beforeEach(() => {
       storage.failWrites = false;
       routeStore.reset();
       storage.items.clear();
       storage.writes.length = 0;
     });

     afterEach(() => {
       vi.restoreAllMocks();
     });

     describe('the project page', () => {
       it('shows the five milestones of Rust in order, its introduction and the counter at zero', () => {
         render(<ProjectPage language="rust" />);

         const headings = screen
           .getAllByRole('article')
           .map((article) => within(article).getByRole('heading', { level: 2 }).textContent);
         expect(headings).toEqual(HEADINGS);
         expect(screen.getByText('PROYECTO PERSONAL · 0 / 5 HITOS')).toBeInTheDocument();
         expect(screen.getByText(RUST_INTRO)).toBeInTheDocument();
       });

       it('counts only the marks of the active language', () => {
         seed({ milestones: ['rust-memory', 'go-files'] });

         render(<ProjectPage language="go" />);

         expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
         expect(milestone('Los datos sobreviven al reinicio')).toBeChecked();
         expect(milestone('Un lugar para guardar cosas')).not.toBeChecked();
         expect(screen.getByText(/^Un pequeño almacén clave-valor en Go\. /)).toBeInTheDocument();
       });

       it('saves the id of a checked milestone with one write and raises the counter', async () => {
         const user = userEvent.setup();
         render(<ProjectPage language="go" />);

         await user.click(milestone('Un lugar para guardar cosas'));

         expect(milestone('Un lugar para guardar cosas')).toBeChecked();
         expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
         expect(storage.writes).toEqual([KEY]);
         expect(storedMilestones()).toEqual(['go-memory']);
       });

       it('removes the id of an unchecked milestone', async () => {
         seed({ milestones: ['rust-memory', 'rust-files'] });
         const user = userEvent.setup();
         render(<ProjectPage language="rust" />);

         await user.click(milestone('Un lugar para guardar cosas'));

         expect(milestone('Un lugar para guardar cosas')).not.toBeChecked();
         expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
         expect(storedMilestones()).toEqual(['rust-files']);
       });

       it('toggles twice and writes twice on two quick clicks, and ends unchecked', async () => {
         const user = userEvent.setup();
         render(<ProjectPage language="rust" />);

         await user.dblClick(milestone('Tu programa entiende comandos'));

         expect(milestone('Tu programa entiende comandos')).not.toBeChecked();
         expect(storage.writes).toEqual([KEY, KEY]);
         expect(storedMilestones()).toEqual([]);
       });

       it('keeps the same checkbox focused and an open hint open after toggling (clarify Q3, X1)', async () => {
         const user = userEvent.setup();
         render(<ProjectPage language="rust" />);
         const hint = within(screen.getAllByRole('article')[1])
           .getByText('Necesito una pista')
           .closest('details');
         if (hint === null) throw new Error('the second milestone has no hint');
         hint.setAttribute('open', '');
         const checkbox = milestone('Un lugar para guardar cosas');

         await user.click(checkbox);

         expect(milestone('Un lugar para guardar cosas')).toBe(checkbox);
         expect(checkbox).toHaveFocus();
         expect(hint).toHaveAttribute('open');
       });

       it('shows a change made by another way and the blank progress after a reset', () => {
         render(<ProjectPage language="rust" />);

         act(() => {
           routeStore.applyImport({
             state: progress({ milestones: ['rust-memory', 'rust-files'] }),
             lossy: false,
           });
         });
         expect(screen.getByText('PROYECTO PERSONAL · 2 / 5 HITOS')).toBeInTheDocument();
         expect(milestone('Los datos sobreviven al reinicio')).toBeChecked();

         act(() => {
           routeStore.reset();
         });
         expect(screen.getByText('PROYECTO PERSONAL · 0 / 5 HITOS')).toBeInTheDocument();
         expect(milestone('Los datos sobreviven al reinicio')).not.toBeChecked();
       });

       it('keeps the toggled milestone in memory when the write fails', async () => {
         storage.failWrites = true;
         const user = userEvent.setup();
         render(<ProjectPage language="rust" />);

         await user.click(milestone('Medir antes de optimizar'));

         expect(milestone('Medir antes de optimizar')).toBeChecked();
         expect(screen.getByText('PROYECTO PERSONAL · 1 / 5 HITOS')).toBeInTheDocument();
         expect(storage.items.has(KEY)).toBe(false);
       });

       it('releases its subscription to the revision when it unmounts', () => {
         const subscribe = routeStore.changes.subscribe;
         let active = 0;
         vi.spyOn(routeStore.changes, 'subscribe').mockImplementation((listener) => {
           active += 1;
           const unsubscribe = subscribe(listener);
           return () => {
             active -= 1;
             unsubscribe();
           };
         });

         const { unmount } = render(<ProjectPage language="rust" />);
         expect(active).toBe(1);

         unmount();
         expect(active).toBe(0);
       });

       it('writes the example terminal with its line breaks and spaces', () => {
         const { container } = render(<ProjectPage language="rust" />);

         expect(container.querySelector('pre.terminal')?.textContent).toBe(TERMINAL);
       });

       it('links to the library by its hash', () => {
         render(<ProjectPage language="go" />);

         expect(screen.getByRole('link', { name: 'Encontralos en la biblioteca' })).toHaveAttribute(
           'href',
           '#biblioteca',
         );
       });
     });
     ```

  9. **El E2E de las pistas abiertas:** en `qa/e2e/specs/project.spec.ts`, dentro de `test.describe('the hints', …)` y antes de la prueba `KNOWN DEFECT`, sumá:

     ```ts
       test('an open hint stays open and the focus stays on the checkbox when a milestone is checked (clarify Q3, X1)', async ({
         shell,
         project,
       }) => {
         await shell.goto(urls.view('proyecto'));
         await project.hintToggle(TITLES[1]).click();
         await expect(project.hint(TITLES[1])).toHaveJSProperty('open', true);

         await project.milestone(TITLES[0]).click();

         await expect(project.milestone(TITLES[0])).toBeChecked();
         await expect(project.milestone(TITLES[0])).toBeFocused();
         await expect(project.hint(TITLES[1])).toHaveJSProperty('open', true);
       });
     ```

  10. **Formateá con Prettier** (`npx prettier --write` sobre los archivos nuevos y cambiados) y corré `npm run typecheck` y `npm run lint`. Los dos tienen que pasar: las firmas tipan y no hay variables sin uso.
  11. **Ver el rojo:**
      - `npm run test:unit` falla sólo en las specs nuevas. Las cinco de `toggleMark`, las cuatro del catálogo y las siete del modelo fallan por `not implemented` o por la lista vacía. Las once de la página fallan por `not implemented`.
      - `npm run build` y `E2E_PORT=4193 npm run test:e2e -- specs/project.spec.ts -g "stays open"`: falla en la última aserción (`open` es `false`), porque el legacy rehace `#main`.
      - Las demás 140 pruebas E2E siguen en verde.
  12. **Un commit:** `test(front): specs de Proyecto y el E2E de las pistas abiertas (rojas)`.

- **Compuerta:** el paso 11 con exactamente esas fallas. Una falla por otra razón (un import, un localizador) se corrige antes del commit.
- **Vuelta atrás:** revertí el commit.

## 5. El port (T006, dueño P, commit 5)

**Cubre:** FR-001 (3), FR-004 a FR-013, FR-016 a FR-026, FR-029, FR-034 (la página) y FR-036; US1 a US6; SC-001 a SC-003, SC-005, SC-006, SC-008 y SC-010.

**Entrega:** la operación, el catálogo, el modelo, la página, el adaptador, `app.js` sin la página y los checks de `qa/` adaptados, en un solo commit que deja la suite en verde.

### Tarea 5.1 · El dominio y el modelo

1. **`route-store.ts`:** reemplazá el cuerpo de `toggleMark` por:

   ```ts
       toggleMark(collection, id) {
         const current = opened();
         const marks = current.state[collection];
         const index = marks.indexOf(id);
         if (index === -1) marks.push(id);
         else marks.splice(index, 1);
         const saved = write(current);
         notify();
         return saved;
       },
   ```

2. **`project-milestones.ts`:** reemplazá `PROJECT_MILESTONES`, `milestoneId` y `milestoneHint` por:

   ```ts
   export const PROJECT_MILESTONES: readonly ProjectMilestone[] = [
     {
       suffix: 'memory',
       title: 'Un lugar para guardar cosas',
       task: 'Implementá SET, GET y DELETE sobre un almacén en memoria. Empezá llamando funciones desde un test; todavía no necesitás una terminal interactiva.',
       doneWhen:
         'Podés guardar una clave, leerla, reemplazar su valor y borrarla. Un test comprueba qué ocurre si la clave no existe.',
       hint: {
         rust: 'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.',
         go: 'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.',
       },
     },
     {
       suffix: 'commands',
       title: 'Tu programa entiende comandos',
       task: 'Leé comandos desde la entrada estándar. Separá el texto recibido de la operación que ejecuta el almacén y devolvé errores claros.',
       doneWhen:
         'SET nombre Ana y GET nombre funcionan. Un comando desconocido o incompleto muestra un error sin terminar el programa.',
       hint: 'Convertí el texto en una operación antes de cambiar datos. Definí una gramática pequeña: por ejemplo, claves sin espacios y el resto de la línea como valor. Probá líneas vacías y argumentos faltantes.',
     },
     {
       suffix: 'files',
       title: 'Los datos sobreviven al reinicio',
       task: 'Agregá una forma de guardar y cargar el contenido en un archivo. Decidí un formato sencillo y explicá sus límites.',
       doneWhen:
         'Cerrás el proceso, lo volvés a abrir y recuperás los datos. Tenés tests para un archivo vacío y uno inválido.',
       hint: 'Primero separá serializar de escribir un archivo. Probá el recorrido guardar → cargar con datos conocidos. Para este prototipo, documentá qué pasaría si el proceso se corta durante la escritura.',
     },
     {
       suffix: 'measure',
       title: 'Medir antes de optimizar',
       task: 'Elegí una operación, un conjunto fijo de datos y una pregunta. Medí una versión de referencia y después una modificación pequeña.',
       doneWhen:
         'Anotaste entorno, tamaño de entrada y varias mediciones comparables. Podés explicar si la modificación ayudó y por qué.',
       hint: 'Verificá primero que ambas versiones devuelven el mismo resultado. Evitá mezclar el tiempo de imprimir o generar datos con la operación que querés comparar. Una sola medición no alcanza.',
     },
     {
       suffix: 'network',
       title: 'Una conversación por TCP',
       task: 'Cuando la base esté clara, aceptá los mismos comandos desde una conexión TCP. Empezá con un cliente y mensajes delimitados por salto de línea.',
       doneWhen:
         'Un cliente guarda y consulta un valor. El servidor responde bien aunque un comando llegue en varios fragmentos.',
       hint: 'TCP transporta un flujo de bytes: cada lectura no equivale a un comando completo. Acumulá bytes hasta el delimitador. Después podés investigar varios clientes y acceso compartido a los datos.',
     },
   ];

   export function milestoneId(language: GuideLanguage, milestone: ProjectMilestone): string {
     return `${language}-${milestone.suffix}`;
   }

   export function milestoneHint(milestone: ProjectMilestone, language: GuideLanguage): string {
     return typeof milestone.hint === 'string' ? milestone.hint : milestone.hint[language];
   }
   ```

   **Los textos se copian de `app.js` (líneas 27 a 63 en `2b37caf4`), no de este plan.** Si difieren en un carácter, vale `app.js` y se avisa a K. La pista de Go del primer hito es, a propósito, la de hoy, hasta T008.
3. **`milestone-ids.ts`:** reemplazá el archivo entero por:

   ```ts
   import { MILESTONE_LANGUAGES, PROJECT_MILESTONES, milestoneId } from './project-milestones';

   export const MILESTONE_IDS: readonly string[] = MILESTONE_LANGUAGES.flatMap((language) =>
     PROJECT_MILESTONES.map((milestone) => milestoneId(language, milestone)),
   );
   ```

4. **`frontend/src/entities/guide/index.ts`:**
   - sumá, después de la línea de `MILESTONE_IDS`:

     ```ts
     export {
       MILESTONE_LANGUAGES,
       PROJECT_MILESTONES,
       milestoneHint,
       milestoneId,
     } from './model/project-milestones';
     export type { MilestoneHint, ProjectMilestone } from './model/project-milestones';
     ```

   - y cambiá la última línea a `export type { RouteImportPlan, RouteMarkCollection, RouteStore } from './model/route-store';`.
5. **`frontend/src/pages/project/model/project-progress.ts`:** reemplazá el import y la función por:

   ```ts
   import {
     PROJECT_MILESTONES,
     milestoneHint,
     milestoneId,
     type GuideLanguage,
   } from '../../../entities/guide';
   ```

   ```ts
   export function projectProgress(
     marked: readonly string[],
     language: GuideLanguage,
   ): ProjectProgress {
     const milestones = PROJECT_MILESTONES.map((milestone, index) => {
       const id = milestoneId(language, milestone);
       return {
         id,
         heading: `${String(index + 1).padStart(2, '0')}. ${milestone.title}`,
         title: milestone.title,
         task: milestone.task,
         doneWhen: milestone.doneWhen,
         hint: milestoneHint(milestone, language),
         completed: marked.includes(id),
       };
     });
     return {
       milestones,
       completedCount: milestones.filter((milestone) => milestone.completed).length,
     };
   }
   ```

6. **Corré** `npm run test:unit -- frontend/src/entities/guide frontend/src/pages/project/model`: en verde la de `toggleMark`, la del catálogo, la del modelo y `milestone-ids.spec.ts` sin tocar.

### Tarea 5.2 · La página y el adaptador

1. **Reemplazá `frontend/src/pages/project/ui/ProjectPage.tsx`:**

   ```tsx
   import { useStore } from 'zustand';
   import { routeStore, type GuideLanguage } from '../../../entities/guide';
   import { projectProgress } from '../model/project-progress';
   import MilestoneCard from './MilestoneCard';

   interface ProjectPageProps {
     language: GuideLanguage;
   }

   const selectRevision = (state: { revision: number }) => state.revision;

   const ProjectPage = ({ language }: ProjectPageProps) => {
     useStore(routeStore.changes, selectRevision);
     const { milestones, completedCount } = projectProgress(
       routeStore.getProgress().milestones,
       language,
     );
     const languageName = language === 'go' ? 'Go' : 'Rust';

     return (
       <>
         <div className="page-heading">
           <div className="eyebrow">
             <span className="eyebrow-line"></span>
             {' UNA IDEA QUE CRECE CON VOS'}
           </div>
           <h1>
             {'De una función'}
             <br />
             {'a '}
             <em>tu propio sistema.</em>
           </h1>
           <p>
             {`Un pequeño almacén clave-valor en ${languageName}. Cada capacidad te da una razón para aprender el siguiente concepto. El proyecto tiene su propio avance: los ejercicios del recorrido lo preparan.`}
           </p>
         </div>
         <div className="project-hero">
           <div>
             <span className="small-label">
               {`PROYECTO PERSONAL · ${completedCount} / ${milestones.length} HITOS`}
             </span>
             <h2>Tu primer taller de datos.</h2>
             <p>
               {
                 'Empezá en memoria. Sumá comandos, archivos, mediciones y, cuando estés listo, una conexión por red.'
               }
             </p>
           </div>
           <pre className="terminal">
             <span className="prompt">&gt;</span>
             {' SET curiosidad encendida\nOK\n'}
             <span className="prompt">&gt;</span>
             {' GET curiosidad\nencendida\n'}
             <span className="prompt">&gt;</span>
             {' _'}
           </pre>
         </div>
         <div className="milestones">
           {milestones.map((milestone) => (
             <MilestoneCard
               key={milestone.id}
               milestone={milestone}
               onToggle={() => routeStore.toggleMark('milestones', milestone.id)}
             />
           ))}
         </div>
         <div className="recommendation-strip">
           <span className="strip-icon" aria-hidden="true">
             ↗
           </span>
           <p>
             <strong>¿Preferís un reto con tests externos?</strong>
             <br />
             {
               'CodeCrafters propone construir una shell o un servidor HTTP. Protohackers prueba tus servidores de protocolos. '
             }
             <a href="#biblioteca">Encontralos en la biblioteca</a>
             {'.'}
           </p>
         </div>
       </>
     );
   };

   export default ProjectPage;
   ```

   **Reglas de texto (FR-004):**
   - cada texto que en `renderProject` es un solo nodo sale de una sola cadena o plantilla;
   - las líneas que contienen sólo elementos no dejan espacios: JSX los descarta;
   - la terminal lleva sus `\n` dentro de las cadenas.

   Si Prettier mueve una cadena, no cambia su contenido. Los textos se copian de `renderProject` (`app.js`, línea 281 en `2b37caf4`).
2. **Creá `frontend/src/pages/project/ui/MilestoneCard.tsx`:**

   ```tsx
   import type { MilestoneView } from '../model/project-progress';

   interface MilestoneCardProps {
     milestone: MilestoneView;
     onToggle: () => void;
   }

   const MilestoneCard = ({ milestone, onToggle }: MilestoneCardProps) => (
     <article className="milestone">
       <div className="milestone-head">
         <input
           className="step-check"
           type="checkbox"
           aria-label={`Completar hito: ${milestone.title}`}
           checked={milestone.completed}
           onChange={onToggle}
         />
         <h2>{milestone.heading}</h2>
       </div>
       <p>{milestone.task}</p>
       <p>
         <strong>Está listo cuando:</strong>
         {` ${milestone.doneWhen}`}
       </p>
       <details>
         <summary>Necesito una pista</summary>
         <p>{milestone.hint}</p>
       </details>
     </article>
   );

   export default MilestoneCard;
   ```

3. **Creá `frontend/src/pages/project/index.ts`:**

   ```ts
   export { default as ProjectPage } from './ui/ProjectPage';
   ```

4. **Creá `frontend/src/app/legacy/register-project-page.tsx`:**

   ```tsx
   import { createRoot, type Root } from 'react-dom/client';
   import { ProjectPage } from '../../pages/project';

   declare global {
     interface Window {
       TallerProjectPage: Readonly<{ mount: typeof mount; unmount: typeof unmount }>;
     }
   }

   let root: Root | null = null;

   function unmount(): void {
     root?.unmount();
     root = null;
   }

   function mount(host: HTMLElement | null, requestedLanguage: string = 'rust'): void {
     unmount();
     if (!host) return;

     const language = requestedLanguage === 'go' ? 'go' : 'rust';
     root = createRoot(host, {
       onUncaughtError(error) {
         console.error('No se pudo mostrar el proyecto.', error);
       },
     });
     root.render(<ProjectPage language={language} />);
   }

   window.TallerProjectPage = Object.freeze({ mount, unmount });
   ```

5. **En `frontend/src/app/boot/legacy-views.ts`,** después de `() => import('../legacy/register-atlas'),`, sumá:

   ```ts
     () => import('../legacy/register-project-page'),
   ```

6. **Corré** `npm run test:unit -- frontend/src/pages/project`: las once de la página en verde.

### Tarea 5.3 · `app.js` sin la página

En `frontend/app.js`, por texto (los números son de `2b37caf4`):

1. **Borrá el arreglo entero** `const milestones = [ … ];` (líneas 27 a 63).
2. **Después de `routeStore.open(data);`** sumá, salvo que `app.js` ya tenga `routeStore.changes.subscribe(` («Lo compartido»):

   ```js
     routeStore.changes.subscribe(updateSaveLabel);
   ```

3. **En `render()`:**
   - después de `window.TallerSystems?.unmount();` sumá `window.TallerProjectPage.unmount();`;
   - cambiá `proyecto: renderProject,` por `proyecto: () => '',`;
   - después de `if (currentView === 'atlas') window.TallerAtlas.mount($('#main'), routeState().language);` sumá:

     ```js
         if (currentView === 'proyecto')
           window.TallerProjectPage.mount($('#main'), routeState().language);
     ```

4. **Borrá la función** `function renderProject() { … }` entera.
5. **En el delegado `$('#main').addEventListener('change', …)`,** borrá la rama entera:

   ```js
       if (target.dataset.milestone) {
         toggleItem(routeState().milestones, target.dataset.milestone);
         save();
         render();
         $(`[data-milestone="${target.dataset.milestone}"]`)?.focus({ preventScroll: true });
       }
   ```

6. **Si `toggleItem` quedó sin llamadas** en `app.js` (`grep -n "toggleItem(" frontend/app.js` sólo muestra la declaración), borrá la función. Si tiene otras llamadas, queda.
7. **Comprobá:** `grep -nE "renderProject|const milestones|data-milestone" frontend/app.js` no imprime nada (SC-008).

### Tarea 5.4 · Los checks de `qa/`

1. **`qa/route-milestones-check.ts`:** reemplazalo entero por:

   ```ts
   import assert from 'node:assert/strict';
   import { readFileSync } from 'node:fs';
   import { join } from 'node:path';
   import { importModule } from './lib/sources.ts';

   interface MilestoneCatalog {
     MILESTONE_LANGUAGES: readonly string[];
     PROJECT_MILESTONES: readonly { suffix: string }[];
   }

   const root = join(import.meta.dirname, '..');
   const catalog = await importModule<MilestoneCatalog>(
     'frontend/src/entities/guide/model/project-milestones.ts',
   );
   const { MILESTONE_IDS } = await importModule<{ MILESTONE_IDS: readonly string[] }>(
     'frontend/src/entities/guide/model/milestone-ids.ts',
   );

   const fromCatalog = catalog.MILESTONE_LANGUAGES.flatMap((language) =>
     catalog.PROJECT_MILESTONES.map((milestone) => `${language}-${milestone.suffix}`),
   );
   const shared = JSON.parse(
     readFileSync(join(root, 'qa', 'fixtures', 'shared', 'route-milestones.json'), 'utf8'),
   ) as string[];

   assert.deepEqual(
     shared,
     fromCatalog,
     'route-milestones.json no coincide con el catálogo de hitos de entities/guide',
   );
   assert.deepEqual(
     shared,
     [...MILESTONE_IDS],
     'route-milestones.json no coincide con MILESTONE_IDS de entities/guide',
   );
   console.log(`route-milestones-check: ${shared.length} hitos PASS.`);
   ```

2. **`qa/lib/app-adapters.ts`:** después de `TallerAtlas: ['mount', 'unmount'],` sumá `TallerProjectPage: ['mount', 'unmount'],`.
3. **`qa/lib/app-shell-harness.ts`:** en `behaviors`, después de `TallerAtlas: {},` sumá `TallerProjectPage: {},`.
4. **`qa/app-shell-check.ts`:** borrá desde `const milestoneSuffixes = ['memory', 'commands', 'files', 'measure', 'network'];` hasta el final del segundo `await test('g) hitos: …')`, con `renderedMilestones` incluido. La correspondencia va en el PR (FR-029, SC-010):

   | Escenario retirado | Lo cubren |
   | --- | --- |
   | g) hitos: `#proyecto` muestra los 5 hitos del lenguaje activo (rust), con «PROYECTO PERSONAL · 0 / 5 HITOS» y «Un pequeño almacén clave-valor en Rust.» | `ProjectPage.spec.tsx` («shows the five milestones of Rust…»), `project-progress.spec.ts` («lists the five milestones of Rust…») y el E2E 1 |
   | g) hitos: con Go activo aparecen `go-*`; con `go-memory` y `rust-files` marcados, el contador dice 1 / 5, `go-memory` está marcado y `go-files` no | `project-progress.spec.ts` («counts only the marks of the active language»), `ProjectPage.spec.tsx` («counts only the marks…») y los E2E 2, 9 y 10 |

5. **`qa/boot-check.ts`:**
   - cambiá `import type { FakeElement } from './lib/fake-dom.ts';` por `import { FakeText, type FakeElement, type FakeNode } from './lib/fake-dom.ts';`;
   - arriba de `const VIEW_HEADINGS`, sumá:

   ```ts
   function mountedText(node: FakeNode): string {
     if (node instanceof FakeText) return node.nodeValue;
     return node.textContent + node.childNodes.map(mountedText).join('');
   }
   ```

   - en la prueba «navegación: cada vista se renderiza por hash sin lanzar», reemplazá el bloque `if (view === 'atlas') { … }` por:

   ```ts
       if (view === 'atlas' || view === 'proyecto') {
         // El Atlas y Proyecto son React: montan nodos reales en #main en lugar de escribir innerHTML.
         assert.ok(main.childNodes.length > 0, `#${view} no montó nodos en #main`);
         assert.ok(mountedText(main).includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
       }
   ```

   El `else` y `VIEW_HEADINGS` no cambian (FR-029).
6. **`qa/load-order-check.ts`:**
   - después de `const ATLAS = …;`, sumá `const PROJECT_PAGE = 'frontend/src/app/legacy/register-project-page.tsx';`;
   - en `BEFORE_APP_REASONS`, después de la entrada `[ATLAS]`, sumá:

   ```ts
     [PROJECT_PAGE]:
       'render() de app.js llama a window.TallerProjectPage.unmount() y mount() sin guarda opcional',
   ```

7. **Corré:**
   - `node qa/route-milestones-check.ts` («10 hitos PASS»);
   - `node qa/app-shell-check.ts` (los de T001 menos 2);
   - `node qa/boot-check.ts` (los de T001);
   - `node qa/load-order-check.ts` (una restricción más que en T001);
   - `node qa/seams-guard-check.ts`.

### Tarea 5.5 · Compuerta y commit (T006)

1. **La suite:**
   - `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`;
   - `npm run lint 2>&1 | grep -c complexity` igual a T001;
   - el valor de `render()`, medido como en §0.2, paso 5, es el de T001 más 1.
2. **Los E2E:** `E2E_PORT=4193 npm run test:e2e`: **141 de 141** (123 de la red y 18 de Proyecto, el 8 incluido).
3. **La compuerta §0.2** (columna de los commits 5 y 6).
4. **Un commit:** `refactor(front): Proyecto pasa a una página de React y sale de app.js`.

- **Compuerta:** los pasos 1 a 3.
- **Vuelta atrás:** revertí el commit. El PR entero se revierte con los commits 5, 4, 3, 2 y 1, en ese orden, y devuelve la página legacy.

## 6. La comparación única y los bytes (T007, K, sin commit)

**Cubre:** FR-004, FR-030, FR-032 y FR-033; US4, escenarios 1 a 3; SC-004, SC-009 y SC-011.

Sobre el commit 5, **antes de T008**, con un worktree del commit base:

1. **El script de quickstart §3.2:** 7 árboles con 0 diferencias, salvo `data-milestone` y `data-project-library`, que el script ignora. También 49 capturas con 0 diferencias de estilo computado, y los 20 textos de los hitos idénticos en los 7 estados.
2. **El multiconjunto** de quickstart §3.1 contra la base: 0 perdidas y 0 duplicadas.
3. **Los oráculos y las partes del dist** de quickstart §2: los valores de la compuerta §0.2; `html.length` antes y después.
4. **Las cantidades** van a la descripción del PR. Si algo da distinto de cero, no se integra: se busca la causa con las muestras que imprime el script, sin editar la comparación.

## 7. La pista de Go (T008, dueño P, commit 6)

**Cubre:** FR-001 (4), FR-015 y FR-018; US4, escenario 6; SC-002.

- **Requiere:** T007 hecha y el texto de Go **aprobado por el usuario**. El propuesto está en research.md, R14; si el usuario lo cambia, vale el suyo, carácter por carácter.
- **Pasos (TDD en un commit):**
  1. **La prueba cambia primero.** En `qa/e2e/specs/project.spec.ts`:
     - después de `FIRST_HINT_RUST`, sumá:

     ```ts
     const FIRST_HINT_GO =
       'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Go podés empezar con un map[string]string creado con make; leé con valor, ok := datos[clave] para distinguir una clave que no existe de un valor vacío.';
     ```

     - y reemplazá la prueba `KNOWN DEFECT` por:

     ```ts
       test('the hint of the first milestone is one per language, and the one of Go does not name Rust', async ({
         shell,
         project,
       }) => {
         await shell.goto(urls.view('proyecto'));
         await project.hintToggle(TITLES[0]).click();
         await expect(project.hintText(TITLES[0])).toHaveText(FIRST_HINT_RUST);

         await shell.switchLanguage('go');
         await project.hintToggle(TITLES[0]).click();

         await expect(project.hintText(TITLES[0])).toHaveText(FIRST_HINT_GO);
         await expect(project.hintText(TITLES[0])).not.toContainText('Rust');
       });
     ```

  2. **En `project-milestones.spec.ts`,** reemplazá la prueba `KNOWN DEFECT` por:

     ```ts
       it('gives the first milestone one hint per language, and the one of Go does not name Rust', () => {
         expect(milestoneHint(PROJECT_MILESTONES[0], 'rust')).toBe(FIRST_HINT_TODAY);
         expect(milestoneHint(PROJECT_MILESTONES[0], 'go')).toBe(FIRST_HINT_GO);
         expect(milestoneHint(PROJECT_MILESTONES[0], 'go')).not.toContain('Rust');
       });
     ```

     y sumá la constante `FIRST_HINT_GO`, con el mismo texto, después de `FIRST_HINT_TODAY`. En `project-progress.spec.ts`, el mismo cambio en su prueba `KNOWN DEFECT`, que pasa a llamarse `'shows the hint of the active language, and the one of Go does not name Rust'`, con `milestones[0].hint` igual a `FIRST_HINT_GO` en Go.
  3. **Ver el rojo:** `npm run test:unit` falla en esas dos specs, porque Go todavía da el texto de Rust. Con `npm run build` y `E2E_PORT=4193 npm run test:e2e -- specs/project.spec.ts -g "one per language"`, falla en `toHaveText(FIRST_HINT_GO)`. Guardá la salida para el PR.
  4. **El cambio:** en `project-milestones.ts`, reemplazá sólo la cadena `go` de la pista del primer hito por el texto aprobado.
  5. **El verde:**
     - `npm run test:unit`;
     - `npm run build`;
     - `E2E_PORT=4193 npm run test:e2e`: 141 de 141;
     - `npm test`, `npm run lint` y `npm run format:check`.
  6. **Un commit:** `feat(front): la pista del primer hito en Go deja de nombrar a Rust`.
- **Vuelta atrás:** revertí el commit; vuelve el texto de hoy con su `KNOWN DEFECT`.

## 8. Las roturas deliberadas (T009, K, sin commit)

**Cubre:** FR-031 y SC-007.

- **Dónde:** cada rotura se aplica en una copia descartable del árbol integrado (con T008), sin commit.
- **Qué se corre:** la prueba prevista (quickstart §4) y, si es un E2E, también `npm run build`.
- **Qué se informa:** 11 de 11, con la prueba que falló en cada una.
- **Si una rotura no la detecta su prueba:** la prueba se refuerza en un commit `test(…)` antes de T010, y la rotura se repite.

## 9. Documentación y PR (T010 y T011, K)

### Tarea 9.1 · La documentación (T010, commit 7)

**Cubre:** FR-037.

1. **`docs/architecture.md`:**
   - en la fila «Almacenes del progreso y motores, con suscripción (F2, unidad 1)», después de `…sube una vez por operación, después de escribir;`, sumá: `` `routeStore.toggleMark(collection, id)` alterna un paso, un hito o un favorito y guarda una vez (F4);``;
   - en la fila «Navegación, recorrido y progreso general», al final de la segunda celda, sumá: `` La página de Proyecto, su CSS y sus hitos ya no están ahí (F4).``;
   - en la fila «Contenido del recorrido y biblioteca», cambiá `tipos y progreso en` por `tipos, progreso y el catálogo de hitos del proyecto (del que sale `MILESTONE_IDS`) en`;
   - después de la fila «Atlas migrado a React/TypeScript», sumá: `| Proyecto migrado a React/TypeScript (F4) | `frontend/src/pages/project/` (`ui`, con `project.css`, y `model`) y adaptador `frontend/src/app/legacy/register-project-page.tsx` (`window.TallerProjectPage`, con `mount` y `unmount` hasta F10); el catálogo de hitos en `frontend/src/entities/guide/model/project-milestones.ts` |`;
   - en «Feature-Sliced Design incremental», cambiá `` `frontend/src/pages/atlas` (primera página migrada)`` por `` `frontend/src/pages/atlas` y `frontend/src/pages/project` (las páginas migradas)``.
2. **`docs/refactor-roadmap.md`:** en la lista de restos, borrá `` `data-project-library`, `` (ya no existe).
3. **`qa/AGENTS.md`:**
   - en la fila «Fusión del progreso o hitos del recorrido (D1a)», cambiá `` y `node qa/route-milestones-check.ts`; `` por `` y `node qa/route-milestones-check.ts` (el fixture `qa/fixtures/shared/route-milestones.json` contra el catálogo de hitos de `entities/guide` y `MILESTONE_IDS`, importados); ``;
   - **si corrió T004,** en «Pruebas del front», cambiá la oración `La pila de DOM (`jsdom` y Testing Library) llega con la primera spec de componente.` por `` Los `*.spec.tsx` corren en el proyecto `jsdom`, con Testing Library y el setup `frontend/src/vitest-setup-dom.ts`.``.
4. **Si corrió T004, `docs/adr/0008-pruebas-del-front.md`:** al final, sumá:

   ```markdown
   ## Enmienda (2026-10, F4)

   La primera spec de componente llegó con F4 (`specs/013-f4-proyecto/`), no con F3. `frontend/vitest.config.ts`
   tiene dos proyectos en línea, `node` (`**/*.spec.ts`) y `jsdom` (`**/*.spec.tsx`), y la raíz sólo lleva
   `projects`: en Vitest 5 los proyectos heredan la raíz y concatenan sus arreglos. El setup del proyecto `jsdom`
   es `frontend/src/vitest-setup-dom.ts` (`cleanup()` después de cada prueba y los matchers de jest-dom). Las
   versiones son las de este ADR: `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2,
   `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1. fishery sigue sin instalarse.
   ```

5. **`specs/013-f4-proyecto/`:**
   - completá «Línea base de la implementación» de research.md con lo de T001;
   - marcá en `tasks.md` cada tarea cerrada, con su commit.
6. `AGENTS.md` no cambia: sus frases sobre el Atlas siguen siendo ciertas. La hoja de ruta la edita el coordinador.
7. Verificá las rutas y los enlaces de lo que cambiaste, y `git diff --check`.
8. **Un commit:** `docs: Proyecto en el mapa del front y en qa`.

### Tarea 9.2 · La compuerta final y el PR (T011)

1. **Rebase:** sobre `master` si entró otro ítem («Lo compartido»), y la compuerta §0.2 entera, con `docker compose build taller` con permiso.
2. **El PR,** con título `refactor(front): port the Project page to React` y descripción en inglés, con:
   - **el contexto:** qué era la página y qué la ataba a `app.js` y a D1;
   - **qué cambia:** la página, el catálogo, `toggleMark`, la suscripción del pie, el adaptador, el CSS y los checks;
   - **los dos cambios aprobados:** Q3 y Q4, con el texto de Go;
   - **la evidencia:**
     - los E2E 17 de 17 contra el legacy;
     - el rojo del commit 4 y el de T008;
     - 141 de 141 al final;
     - la comparación única con sus cantidades;
     - el multiconjunto;
     - los bytes;
     - `html.length` antes y después;
     - los avisos de complejidad y el valor de `render()` antes y después (+1), con su justificación;
     - las 11 roturas;
   - **la correspondencia** de `app-shell-check` (§5.4) y el cambio de `boot-check`;
   - **qué queda pendiente:**
     - `toggleItem` (si quedó) para F3 o F9;
     - el adaptador, para F10;
     - el texto de los hitos, candidato a contenido (E1).

## Cobertura de la spec

| Requisito | Tareas |
| --- | --- |
| FR-001 | T002, T005, T006, T008, T010 (el orden de los commits) |
| FR-002 | T001, T002, T003, T006, T008, T011 |
| FR-003 | T002 (E2E 10, 13 y 17), T006 |
| FR-004 | T006 (los textos), T007 |
| FR-005 | T006 (§0.2, pasos 4 y 5), T011 |
| FR-006 | T006 (el adaptador no lee `getContent()`; la página no importa `app/`) |
| FR-007 | T005, T006 |
| FR-008 | T002 (E2E 2, 9 y 10), T005 y T006 (modelo y página) |
| FR-009 | T005, T006 (`toggleMark`), T002 (E2E 3) |
| FR-010 | T005, T006 (spec de la página: cambio por otra vía y suscripción) |
| FR-011 | T006 (la suscripción), T002 (E2E 12b) |
| FR-012 | T002 (E2E 6 y 7), T005 (foco) |
| FR-013 | T003, T007 (590 px e impresión); la página no suma regiones vivas ni roles |
| FR-014 | T005 (E2E 8 y la spec de la página), T006 |
| FR-015 | T002 (E2E 15), T006, T008 |
| FR-016 | T002 (E2E 11), T005, T006 |
| FR-017 | T005, T006 (`MILESTONE_IDS` derivada; `milestone-ids.spec.ts` sin tocar) |
| FR-018 | T005, T006, T008 |
| FR-019 | T006 (`route-milestones-check`) |
| FR-020 | T001 y T011 (el backend sin diff) |
| FR-021 | T002 (E2E 11) |
| FR-022 | T006 (§5.3) |
| FR-023 | T006 (§5.3, `toggleItem` y `escapeHtml`) |
| FR-024 | T006 (el adaptador) |
| FR-025 | T006 (`legacy-views`, `load-order-check`, `app-adapters` y el arnés) |
| FR-026 | §0.2, paso 4 |
| FR-027 | T002, T005 |
| FR-028 | T004, T005 |
| FR-029 | T006 (§5.4) |
| FR-030 | T003, T007 |
| FR-031 | T009 |
| FR-032 | T003, T007, §0.2 |
| FR-033 | T001, T007, T011 |
| FR-034 | T003 |
| FR-035 | «Lo compartido con F3 y F9», T011 |
| FR-036 | «Lo compartido con F3 y F9», T004, T005, T006 |
| FR-037 | T010, T011 |

| Criterio | Tareas |
| --- | --- |
| SC-001 | T001, T006, T008, T011 |
| SC-002 | T002, T005, T006, T008 |
| SC-003 | T002, T005, T006, §0.2 |
| SC-004 | T003, T007 |
| SC-005 | T002 (E2E 10) |
| SC-006 | T002 (E2E 3, 5 y 12b), T005 |
| SC-007 | T009 |
| SC-008 | T006 (§5.3, paso 7), §0.2 |
| SC-009 | T003, T007 |
| SC-010 | T006 (§5.4) |
| SC-011 | T001, T007, T011 |
| SC-012 | §0.2, T011 |

## Complexity Tracking

| Señal | Por qué se acepta | Alternativa más simple descartada |
| --- | --- | --- |
| `render()` de `app.js` sube 1, de 11 a 12 por lectura (variante `classic`; T001 mide el valor real) | Suma un `if` de montaje igual a los de las otras vistas, y su `unmount` va sin `?.` porque `load-order-check` garantiza el adaptador. F10 retira `render()` con el router. La cuenta de avisos no sube | Una tabla de montaje o extraer `unmountViews()` reescribe las líneas de las vistas de F3, F5 a F9, que no son de F4; con `?.` daría 13 |

## Puntos de integración y riesgos residuales

- **F2a y F2b en `master`** antes de T001. Si F2b cambió algo de lo que este plan cita (las líneas de `styles.css` o la forma de `app.js`), T001 lo anota y los dueños ubican todo por texto.
- **F3, F9 y F11a** pueden entrar antes:
  - **F3 y F9:** «Lo compartido con F3 y F9».
  - **F11a:** suma un doble de la API con sesión simulada como fixture automático de los E2E. Los de Proyecto no lo usan explícitamente y deberían pasar sin cambios; si `ShellPage.goto` cambia, se rebasa.
- **Riesgo 13 de la spec:** el comportamiento del legacy salió de leer el código. T002 lo confirma; si una prueba no pasa contra el legacy, K decide con el usuario antes de seguir.
- **El texto de la pista de Go:** hasta que el usuario lo apruebe, T008 no entra, y la página de Go sigue nombrando a Rust con su `KNOWN DEFECT`.
- **D1c:** se monta sobre `routeStore` y se entera de cada alternancia por la revisión. F4 no toca el backend ni `features/progress-sync`.
