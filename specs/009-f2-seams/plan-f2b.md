# Implementation Plan: F2b · Seams sin cambio visible, unidades 5 a 8

**Branch**: `009-f2-seams` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F2, en su parte b: las unidades 5 a 8 (FR-001 a FR-018 y FR-043 a FR-060). Decisiones y mediciones: [research-f2b.md](./research-f2b.md). Validación: [quickstart-f2b.md](./quickstart-f2b.md). Tareas: [tasks-f2b.md](./tasks-f2b.md). El [plan de F2a](./plan.md) fija la forma que este plan repite y lo que F2b toma como base.

> **Para quien lo implementa.**
>
> - **Qué leer.** El trabajo se reparte entre dueños con archivos disjuntos («Reparto en paralelo»). Leé completas las «Reglas para todos los agentes», la sección 0 («Línea base y compuerta de cada unidad») y la sección de tu dueño. `tasks-f2b.md` tiene una línea por tarea (T020 a T038) y remite acá.
> - **Dónde están los archivos.** El coordinador pidió los archivos de F2b dentro de `specs/009-f2-seams/`, con sufijo `-f2b`, sin tocar los de F2a. Los scripts de Spec Kit buscan `plan.md` y `tasks.md` por nombre, así que cada comando de Spec Kit de F2b tiene que recibir los archivos `-f2b` (research-f2b.md, R1).
> - **Decisiones del usuario.** El clarify de F2 se respondió el 2026-10-06 (spec, `## Clarifications`). Este plan aplica:
>   - **la partición:** este plan es F2b;
>   - **Q1:** el mapa explícito por id, con su fixture congelada, sin tocar `content/`;
>   - **Q4:** importar y «Borrar todo» devuelven una promesa, y «Borrar todo» acepta una confirmación.
>
>   Q2 y Q3 ya los aplicó F2a, y F2b no cambia ni el guard que decidió Q2 ni los stores de Zustand de Q3.
>
> **Código verificado.** Se planificó sin tocar el código de producción del repositorio y sin descargar nada. Lo que corrió, en copias descartables de `c5d497d` (`f2a/u3-arranque`, con F1 y las cuatro unidades de F2a), está en research-f2b.md («Cómo se verificó»):
>
> - **La base:** `npm test` (31 checks y 186 pruebas de Vitest), `npm run lint` (35 avisos), el build, los hashes de los oráculos y la red de F1 (106 de 106).
> - **Un prototipo de cada unidad, con el diseño de este plan:**
>   - **unidad 8:** 106 de 106 E2E, el script del dist idéntico, el multiconjunto de declaraciones sin diferencias y un barrido de estilo computado con 0 diferencias en 22 millones de valores. Su control negativo detectó 702 diferencias que el multiconjunto no ve;
>   - **unidad 5:** 2 569 URL y 55 880 respuestas de los adaptadores iguales a las de hoy, y `lab-bridge-check` 21 de 21 sin tocarlo;
>   - **unidad 7:** 2 214 comparaciones de HTML iguales y `quest-explorers-check` 47 de 47 sin tocarlo;
>   - **unidad 6:** `app-shell-check` 53 de 53 con un solo `void` cambiado por `await`, cuatro gemelos asíncronos en verde y `boot-check` 14 de 14.
> - **Las unidades 5, 6 y 7 juntas:** `npm test`, 35 avisos, 106 de 106 E2E y los tres oráculos del currículo con los mismos bytes.
>
> No corrieron: la comparación única de la unidad 6, la regla R6 del guard, las specs nuevas (salvo la del aislamiento de las entradas), Docker, la CI y macOS.

## Summary

F2b deja como módulos importables lo que las vistas legacy se pasan por HTML y por URL, el respaldo del progreso, los modelos de los exploradores y el aspecto que hoy vive en la hoja de otra vista, sin cambiar nada de lo que el alumno ve ni de lo que guarda. El enfoque:

- **Cuatro unidades, cuatro PR, en este orden: 8, 5, 7 y 6** (FR-001; la 5 y la 8 las piden F5 y F6, la 7 la pide F7 y la 6, F8). Las cuatro empiezan a la vez desde la base, porque tocan archivos disjuntos. La única excepción es `frontend/app.js`, que tocan la 5 (la URL) y la 6 (el respaldo): la 6 lo cablea después de que la 5 está en `master`.
- **La red de F1 es el juez de cada unidad,** con los 106 E2E sin editar, y cada unidad suma una comparación única contra el commit base (FR-011). Ningún escenario de un check se retira: las specs nuevas pasan a ser las dueñas del contrato, y los checks siguen como pruebas de integración hasta que el port de cada vista borre su archivo (research-f2b.md, R8).
- **Una entrada pública sin estado por slice con singleton:** `entities/campaign/bridge.ts`, `entities/systems-workshop/bridge.ts` y `entities/exercise/explorers.ts`. Así las vistas legacy usan funciones puras sin evaluar el índice que crea el motor o el almacén (FR-018). Una regla nueva del guard, R6, cierra el hueco que R4 deja a los imports profundos (research-f2b.md, R2).
- **La gramática de URL tiene dos familias que no se mezclan:** los enlaces nuevos, con `encodeURIComponent` y un orden fijo, y las reescrituras de la URL actual, con `URLSearchParams`. Cada URL sale carácter por carácter igual que hoy (FR-044; research-f2b.md, R3).
- **`features/progress-backup` nace asíncrona (Q4):** `applyImport` y `resetAll` devuelven una promesa, las áreas se resuelven al llamar y lo que no es almacenamiento se reinicia en pasos que registra su dueño. En `app-shell-check` cambia una sola línea: un `void` pasa a `await` (research-f2b.md, R5).
- **Los exploradores se eligen con un mapa explícito por id (Q1),** comparado contra una fixture congelada de la clasificación de hoy, y sus transiciones pasan a modelos puros (research-f2b.md, R6).
- **Las 26 reglas de CSS de las nueve filas de la spec** se agregan al final de la hoja de su dueño, en el orden de hoy. La comparación decisiva es un barrido de estilo computado, porque la del conjunto de reglas no ve la cascada (research-f2b.md, R7).
- **F2b no toca `main.tsx` ni la cadena de A2,** y no suma dependencias. Si el corte de A2 llega en el medio, sólo cambian el oráculo del dist y el tope de la compuerta (§0.2).

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`, y JavaScript legacy en `frontend/*.js`. Node 24.21.0, Vite 8.3.2, esbuild 0.28.2, Vitest 5.0.3 y `@playwright/test` 1.63.0, como dejaron F1 y F2a.

**Primary Dependencies**: ninguna nueva (FR-010). Las comparaciones únicas usan, desde scripts descartables, `postcss` 8.5.28, que ya está en `node_modules` como dependencia de Vite; no entra en `package.json`.

**Storage**: las cuatro claves de `localStorage` y sus ranuras de respaldo, sin cambios de formato (ADR 0003). F2b no escribe ni lee nada que hoy no se lea.

**Testing**: Vitest en el proyecto `node` (specs junto al módulo), los checks de `qa/*-check.ts`, los 106 E2E de F1 contra el build servido y una comparación única por unidad. Los valores esperados salen del contrato (el mapa §4, la spec, las fixtures congeladas y las reglas de codificación de URL), nunca del módulo que se prueba.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript con vistas legacy). Es un refactor.

**Performance Goals**: ninguna. Se informan el tamaño del HTML y el tiempo de `npm test` antes y después de cada unidad.

**Constraints** (valen para toda tarea):

- **Los bytes:**
  - `build/curriculum.json`, `dump-globals` y los catálogos del dist con los mismos bytes después de cada unidad (FR-003): `dump-dist-globals` antes del corte de A2 y el check del bundle de A2 después;
  - el marcado del dist idéntico en las cuatro unidades;
  - el `<style>`, idéntico en las unidades 5, 6 y 7;
  - el script, idéntico en la unidad 8.
- **El tamaño:** el HTML crece como máximo 8 000 caracteres en toda F2b (se midieron 4 266) y queda bajo el tope vigente de `qa/build-check`.
- **Lo que no se suma:** ningún `style=`, `setAttribute('style', …)` ni `style.cssText` nuevo (FR-008), ninguna dependencia y ningún global (FR-010 y FR-017).
- **Las rutas y el código intocables:** los cinco adaptadores de catálogos, `atlas-catalog.ts`, `main.tsx` y `frontend/src/app/boot/**` no cambian (FR-004 y A2).
- **La red:** los 106 E2E y los 31 checks en verde antes y después de cada unidad.
- **La complejidad:** 35 avisos antes y después. Una función movida de más de 10 conserva o baja su valor, y se informa.

**Scale/Scope**: 12 archivos de producción nuevos (la gramática, 5 módulos de entidades, las 3 entradas sin estado y los 3 de la feature) y 10 specs nuevas, 1 fixture congelada; cambian 10 archivos de producción (6 vistas legacy, 3 hojas y `ConceptDetail.tsx`), 3 de QA (`app-shell-check`, el guard y su check) y 2 documentos.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra dos decisiones de diseño.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, Feature-Sliced Design, Vitest para la lógica, ningún global ni dependencia nueva, código en inglés y mensajes en español. `AGENTS.md` no cambia. |
| II. TDD y pruebas útiles | Sí | Cada tarea de código abre con su spec en rojo contra firmas que lanzan `not implemented`. La unidad 8 no tiene comportamiento nuevo: su prueba es la protección de F1, en verde antes y después, como fija la spec. Los valores esperados salen del contrato o de las fixtures, y cada tarea tiene una mutación que su prueba detecta (quickstart-f2b.md, §4). |
| III. Código entendible | Sí | Lo que se mueve no se reescribe. Los modelos de los exploradores devuelven un estado nuevo en lugar de mutar, y dos ramas del canal pasan a funciones con nombre para que ninguna función nueva pase de 10 sin justificación. El total queda en 35 avisos. |
| IV. Contenido en Git, IDs estables | Sí | `content/` y el generador no cambian (Q1, A). El mapa usa los ids de hoy y una fixture congelada fija la clasificación. |
| V. Capas y contratos explícitos | Sí | La gramática en `shared/config`, los puentes en sus entidades, los modelos en `entities/exercise` y el respaldo en `features/progress-backup`. Ninguna entidad importa a otra. La segunda entrada pública de tres slices está en Complexity Tracking, y el guard la vigila. |
| VI. Español, accesibilidad y portabilidad | Sí | No cambia ningún texto, atributo, foco ni región viva. Los scripts de las comparaciones usan `node`. |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las comparaciones y el barrido corren fuera del repositorio. La única salida nueva en Git es la fixture congelada, que es un contrato y no un resultado regenerable. |
| VIII. Flow-forward | Sí | `tasks-f2b.md` tiene una línea por tarea y, como mucho, su commit. |

## Decisiones del usuario (clarify del 2026-10-06)

Están registradas en `## Clarifications` de la [spec](./spec.md). Una línea por decisión, con la sección de este plan que la aplica.

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Partición** | Este plan es F2b: las unidades 5 a 8 (FR-001 a FR-018 y FR-043 a FR-060), entregadas después de las 1 a 4 (FR-019, SC-013) | Todo el plan |
| **Q1, A:** mapa explícito por id en el front, con su fixture congelada | Dos `Map` escritos a mano en `entities/exercise/model/explorer-kinds.ts` (61 entradas de laboratorio y 12 de misión) y `qa/fixtures/explorer-kinds-<base>.json`, sacada de las expresiones regulares en el commit base; `content/` no cambia | §3 (T028 a T032) |
| **Q4, A:** promesas en importar y «Borrar todo», y una confirmación que en local se ignora | `ProgressBackup.applyImport` y `resetAll(confirmation?)` devuelven una promesa; exportar y listar o leer respaldos son síncronos | §4 (T033 a T037) |
| **Q2 y Q3** | Ya aplicadas en F2a. F2b no abre claves, no crea motores ni stores y no cambia el guard de aperturas: le suma R6 | — |

## Project Structure

### Documentation (this feature)

```text
specs/009-f2-seams/
├── spec.md              # F2 entero; F2b no lo cambia
├── plan.md, research.md, quickstart.md, tasks.md   # F2a; F2b no los toca
├── plan-f2b.md          # este archivo
├── research-f2b.md      # decisiones, línea base y mediciones de F2b
├── quickstart-f2b.md    # validación: compuertas, comparaciones únicas y mutaciones
├── tasks-f2b.md         # una línea por tarea, T020 a T038
└── checklists/requirements.md
```

No hay `data-model.md` ni `contracts/`: F2b no expone ninguna interfaz externa. Las interfaces TypeScript entre tareas están en la sección de cada unidad.

### Source Code (repository root)

```text
frontend/
├── styles.css, lab.css, campaign.css          (U8 H)  las 26 reglas, cada una en su hoja
├── app.js                                     (U5 U: la URL; U6 B: el respaldo, después de S1)
├── lab.js                                     (U5 U)  lee y escribe la URL con la gramática
├── campaign.js, systems.js                    (U5 U)  arman su HTML y sus URL con los datos y la gramática
├── lab-explorers.js, quest-explorers.js       (U7 X)  dibujan los modelos
└── src/
    ├── shared/config/url-grammar.ts + spec    (U5 U)
    ├── pages/atlas/ui/ConceptDetail.tsx       (U5 U)  exerciseHref
    ├── entities/
    │   ├── campaign/bridge.ts + spec; model/mission-bridge.ts + spec            (U5 U)
    │   ├── systems-workshop/bridge.ts + spec; model/workshop-bridge.ts + spec   (U5 U)
    │   └── exercise/explorers.ts + spec; model/explorer-kinds.ts, lab-explorer.ts,
    │       quest-explorer.ts, cada uno con su spec                               (U7 X)
    └── features/progress-backup/index.ts; model/types.ts, create-progress-backup.ts + spec (U6 B)
qa/
├── lib/seams-guard.ts, seams-guard-check.ts   (U5 S)  regla R6
├── app-shell-check.ts                         (U6 B)  un await y la opción asyncAdapters
└── fixtures/explorer-kinds-<base>.json        (U7 X)  congelada
docs/architecture.md   qa/AGENTS.md                (cada unidad, K)
```

**Structure Decision:** cada módulo vive en la capa y el slice de la spec («Las ocho unidades»), con su spec al lado. Tres slices con singleton suman una segunda API pública sin estado (research-f2b.md, R2), y su índice no cambia. No se crea ninguna capa ni carpeta vacía: `features/progress-backup` es la segunda feature del repositorio, después de `download-project-kit`.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **Mismos bytes por unidad.** En la 8, el script y el marcado del dist idénticos y el `<style>` distinto. En la 5, la 6 y la 7, el `<style>` y el marcado idénticos. En las cuatro, los tres oráculos del currículo y `frontend/src/index.html` sin diff.
- **La cascada (unidad 8).** Cada regla al final de su hoja y en el orden de hoy. El barrido de estilo computado, con 0 diferencias, es la prueba; el multiconjunto sólo dice que nada se perdió ni se duplicó. Las dos copias muertas de `.navigation a:last-child` se mueven como están.
- **Las dos familias de URL (unidad 5).** Un enlace nuevo usa `encodeURIComponent` (`%20`) y una reescritura usa `URLSearchParams` (`+`). El regreso de Sistemas lleva `?taller&parte=build&lenguaje` y su selección, `?lenguaje&taller&parte`. Un `?sistema=` vacío sigue contando como presente para el rótulo y como falso para la lista.
- **El orden de los efectos en los puentes (unidad 5).** En el contexto de campaña, el `refresh()` va antes de `getWorlds` y sólo si hay mundo en el enlace; el bloqueo no lo llama. En el de Sistemas, la pertenencia se comprueba antes del `refresh()` y del `engine.get()`. La composición de `lab.js` sigue igual, con el bloqueo de campaña primero (`KNOWN DEFECT` de F1).
- **Las entradas sin estado y R6.** Ningún archivo de `frontend/*.js` ni de `frontend/src/app/` importa `entities/<slice>/model/**`. Las tres entradas no evalúan ningún módulo con singleton: lo prueba su spec, que tiene una mutación.
- **«Borrar todo» asíncrono (unidad 6).** Las áreas se resuelven al llamar. Cada resultado se espera en orden, sin `Promise.all`. El reinicio de las simulaciones y del temporizador va después de los cuatro almacenes, y el `save()`, el cierre del diálogo, el redibujo y el aviso van después del `await`. En `app-shell-check` cambia una línea, sin tocar un valor esperado.
- **El defecto latente que no se arregla:** el `applyImport` de los motores nunca devuelve `false` (research-f2b.md, R5).
- **El mapa contra la fixture (unidad 7).** 73 entradas, con los conteos 21, 20, 20, 6 y 6. La fixture la genera un script desde las expresiones regulares en el commit base, y nunca el mapa.
- **Complejidad:** 35 avisos antes y después de cada unidad, con la redistribución de §3.0.
- **Tamaño:** hasta +8 000 caracteres de `html.length` en toda F2b.

**Lo que la spec implica y ninguna prueba de hoy ejercita**, cada caso con la tarea que suma su prueba:

1. **Un id con espacios, barras o `!'()*~` en una URL:** el contenido de hoy no tiene ninguno, y la red de F1 sólo usa ids simples. Lo fija la spec de la gramática (T024), con las dos familias.
2. **Un parámetro presente y vacío** (`?sistema=` o `?campana=`): el rótulo «Volver al taller» lo cuenta y la lista no. Lo fijan la spec de la gramática (T024) y las dos comparaciones de la unidad (T026), que recorren `?sistema=` y `?campana=` vacíos.
3. **Un id que es una clave del prototipo de `Object`** (`constructor`, `__proto__`): con un objeto literal daría un explorador. Lo fija la spec del mapa (T029).
4. **Un adaptador que devuelve una promesa** (el cliente de D1c): hoy nada lo prueba. Lo fijan los gemelos `asyncAdapters` (T035) y la spec de la feature (T033).
5. **Un ancho fuera de los cuatro de F1** (1 280 y 375 px): ningún E2E lo mide. Lo cubre el barrido de la unidad 8 (T021), que es una comparación única y no queda como prueba.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de la línea base que integró el coordinador y entrega una rama que se integra sin conflictos.

- **Dueños delegables:** H, S, U, X y B son slices para el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»): se le dan sus archivos, sus interfaces y sus checks, y se le dice que no deje comentarios.
- **K, el coordinador:** lo hace el agente principal, que además revisa cada diff y corre las compuertas.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T020: la línea base, sobre la base de implementación (`master` con F2a entera) |
| 1 | H, S, U, X y B a la vez | **H:** T021 (unidad 8). **S:** T023 (R6). **U:** T024 a T026 (unidad 5, también la parte de la URL de `app.js`). **X:** T028 a T031 (unidad 7). **B:** T033 a T035 (la feature, sus specs y el arnés de `app-shell-check`, sin tocar `app.js`) |
| 2 | K y B | **K:** T022, T027 y T032, las compuertas y los PR de las unidades 8, 5 y 7, en ese orden, apenas sus dueños entregan. **B:** T036 (el cableado de `app.js`), desde S1 |
| 3 | K | T037 (compuerta y PR de la unidad 6) y T038 (cierre) |

**Dueños, archivos e interfaces:**

| Dueño | Unidad | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- | --- |
| K · Coordinador | todas | `docs/architecture.md`, `qa/AGENTS.md`, `specs/**`; abre los PR y corre las compuertas | todo | la línea base, las compuertas, la integración y el cierre |
| H · Hojas | 8 | `frontend/styles.css`, `frontend/lab.css` y `frontend/campaign.css` | — | las 26 reglas en la hoja de su dueño |
| S · Guard | 5 | `qa/lib/seams-guard.ts` y `qa/seams-guard-check.ts` | — | la regla R6 (§2.1) |
| U · URL y puentes | 5 | `frontend/src/shared/config/url-grammar*`; en `frontend/src/entities/campaign/`, `bridge*` y `model/mission-bridge*`; en `frontend/src/entities/systems-workshop/`, `bridge*` y `model/workshop-bridge*`; `frontend/campaign.js`, `frontend/systems.js`, `frontend/lab.js`, `frontend/src/pages/atlas/ui/ConceptDetail.tsx` y, en `frontend/app.js`, sólo la URL (§2.0) | — | la gramática, los datos de los puentes y su cableado |
| X · Exploradores | 7 | en `frontend/src/entities/exercise/`, `explorers*` y `model/explorer-kinds*`, `model/lab-explorer*` y `model/quest-explorer*`; `frontend/lab-explorers.js`, `frontend/quest-explorers.js` y `qa/fixtures/explorer-kinds-<base>.json` | — | el mapa, la fixture, los modelos y su cableado |
| B · Respaldo | 6 | `frontend/src/features/progress-backup/**`, `qa/app-shell-check.ts` y, desde S1, en `frontend/app.js`, sólo el respaldo (§4.0) | de U: `app.js` con la URL integrada (S1) | `createProgressBackup` y su cableado |

**Quién edita `app.js`.** U primero, en el PR de la unidad 5: los imports de la gramática, la lista de vistas, `syncLinkedLanguage`, las dos lecturas de la vista y el cambio de idioma. B después, desde S1: el import de la feature, `createProgressBackup`, `backupsPanel`, `downloadBackup`, `exportProgress` y los manejadores de `#confirm-reset` y de `#import-file`. Las regiones son distintas, pero los dos tocan el bloque de imports: por eso se serializan.

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T020 hecha. Todos parten de ahí.
- **S1:** el PR de la unidad 5 integrado en `master`. B rebasa su rama sobre `master` y hace T036.
- **S2:** los cuatro PR integrados. K cierra (T038).

**Puertos.** Cada dueño corre los E2E con el suyo (`vite preview` usa `--strictPort`): K `E2E_PORT=4173`, H `4182`, S `4183`, U `4184`, X `4185` y B `4186`. El barrido de estilo usa 4501 y 4502.

**Líneas de integración.** K integra la documentación de cada unidad en su PR (§5). F2b no agrega checks a `qa/run-checks.ts` (R6 vive en `seams-guard-check`, que ya está registrado) ni cambia `package.json`, el lockfile, las configuraciones o `main.tsx`.

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **F2a tiene que estar en `master`** antes de T020: sus PR #27, #32 y #33 seguían abiertos el 2026-10-06. Si no, se parte de `f2a/u3-arranque` y T020 lo anota.
- **A2:** F2b no toca `main.tsx`, `frontend/src/app/boot/**`, los adaptadores de catálogos ni `atlas-catalog.ts`. Si el corte de A2 llega antes de una unidad de F2b, su compuerta cambia el oráculo del dist y el tope (§0.2). Lo que midió el spike de A2 (`92d2730`, sin integrar): después del corte el HTML pesa 1 136 706 caracteres y el tope propuesto es 1 250 000; `dump-dist-globals` deja de publicar los catálogos (lo reemplaza el check del bundle de A2); y la red de F1 necesita que `ShellPage.goto` espere la primera vista, un cambio que trae A2 con su corte, así que la red «sin editar» de F2b es la que deja A2. La unidad 5 edita `ConceptDetail.tsx`, que A2 no toca según su plan; si eso cambia, se resuelve un conflicto de una línea.
- **F3, F4 y F9** sacan ramas de los delegados de `app.js`, y F2b edita otras regiones del mismo archivo. Se integran de a uno: el que llega después rebasa.
- **D1c** reimplementa `ProgressBackup` (§4.0). La spec de D1 está en borrador.
- **C4:** F2b no suma ni mueve ningún sitio de estilo en línea (FR-008). En el prototipo, ninguna línea con `style=` cambió.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec (las unidades 5 a 8 y FR-001 a FR-018 y FR-043 a FR-060), [research-f2b.md](./research-f2b.md), [quickstart-f2b.md](./quickstart-f2b.md) y tu sección;
  - las skills `tdd`, `clean-code`, `codebase-design` y `vitest`.
- **TDD, siempre.**
  - Cada módulo nuevo empieza con su firma lanzando `not implemented`, para que su spec falle por comportamiento y no por un import.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca. La única línea de un check existente que cambia es la de T035, y sólo cambia cómo espera.
  - Los valores esperados salen del contrato, de las fixtures congeladas o de un ejemplo resuelto a mano, nunca del módulo que probás.
- **Mover no reescribe.** El código movido conserva su comportamiento, sus textos, su orden de efectos y su complejidad. No corrijas nada de paso:
  - el `applyImport` de los motores;
  - el bloqueo de campaña que va primero;
  - el `<body>` con `aria-pressed`;
  - el CSS muerto de `.navigation a:last-child`;
  - la complejidad de `syncLinkedLanguage`.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Ninguna fuente legacy ni archivo de `app/` importa `entities/<slice>/model/**`:** usá el índice si sos su dueño, o la entrada sin estado (R6).
- **Comandos,** desde la raíz de tu worktree: `npm ci --offline`, `npm run test:unit -- <ruta>`, `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`), `npm run typecheck`, `npm run lint`, `npm run format:check`, y `npm run build` con `E2E_PORT=<tu puerto> npm run test:e2e`. Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo.**
  - Código, nombres de test y comentarios en inglés; los mensajes que lee el alumno, en español rioplatense con voseo y con el texto exacto de hoy.
  - **Sin comentarios.** Los comentarios de los bloques de este plan no se copian. Un comentario existente que se mueve con su código se conserva.
  - `interface` para formas de objetos; exports nombrados; ningún `export default`.
  - Ningún `style=`, `setAttribute('style', …)` ni `style.cssText` nuevo (FR-008).
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(front): …` o `test(qa): …` para la spec en rojo;
  - `refactor(front): …` para el movimiento;
  - `feat(front): …` para lo que cambia a propósito.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base y compuerta de cada unidad (coordinador K, onda 0)

**Cubre:** FR-002 a FR-009 y FR-016; SC-001, SC-002, SC-003, SC-011 y SC-012.

### Tarea 0.1 · La línea base (T020)

- **Quién y cuándo:** K, sobre la base de implementación (`master` con F2a entera) y antes de cualquier cambio de código.
- **Entrega:** un commit de documentación que agrega a [research-f2b.md](./research-f2b.md) la sección «Línea base de la implementación», con el hash de la base, las versiones, los valores de quickstart-f2b.md §1 y la fecha.
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde. Si algo falla, F2b no empieza.
  2. Registrar lo de quickstart-f2b.md §1: los oráculos, el script, el estilo y el marcado del dist con su hash, `html.length`, el multiconjunto del CSS, los 35 avisos con su función y los escenarios de cada check.
  3. Comparar con la «Línea base de planificación» de research-f2b.md. Si el script o el estilo cambiaron desde `c5d497d` (por ejemplo, porque A2 ya cortó o porque entró otro PR), se anota y se usa lo medido: la línea base sale siempre del commit base, nunca de una unidad.
  4. Con permiso, `docker compose build taller`: informar el resultado.
- **Compuerta:** los pasos 1 y 2, con los valores anotados.
- **Vuelta atrás:** revertí el commit; nada depende de él.

### 0.2 · La compuerta de cada unidad

La corre K antes de abrir el PR de cada unidad (T022, T027, T032 y T037). Cada dueño la corre en lo que toca, sin Docker. La unidad no se integra con una sola casilla en rojo.

1. **Antes de empezar,** sobre su base: `npm test` y los 106 E2E en verde.
2. **Comandos:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `E2E_PORT=<puerto> npm run test:e2e` y, con permiso, `docker compose build taller`.
3. **Los bytes,** contra T020 (quickstart-f2b.md §2):

   | Salida | U8 | U5 | U7 | U6 |
   | --- | --- | --- | --- | --- |
   | `build/curriculum.json`, `dump-globals` | igual | igual | igual | igual |
   | Catálogos del dist: `dump-dist-globals` (stdout) antes del corte de A2; el check del bundle de A2 después | igual | igual | igual | igual |
   | Script del dist (sha256) | **igual** | cambia | cambia | cambia |
   | `<style>` del dist (sha256) | cambia, con el multiconjunto igual | **igual** | **igual** | **igual** |
   | Marcado del dist con scripts y estilo vaciados | igual | igual | igual | igual |
   | `frontend/src/index.html` | sin diff | sin diff | sin diff | sin diff |
   | `html.length` | acumulado ≤ base de T020 + 8 000, y bajo el tope vigente de `build-check` (2 500 000 antes del corte de A2; el de A2 después) | ← | ← | ← |
   | `import(` e `import.meta` | 0 y 0 antes del corte de A2; la forma de A2 después | ← | ← | ← |

   La línea de stderr de `dump-dist-globals` («La evaluación se detuvo en: URLSearchParams is not defined») es informativa. Con la unidad 5 la evaluación se sigue deteniendo en el mismo punto, dentro de `syncLinkedLanguage`: se comprobó en el prototipo, con el mismo stdout.
4. **Rutas intactas:** `git diff --name-only <base> | grep -E 'register-(catalogs|systems-(lowlevel|infra|play|pc))\.ts|atlas-catalog\.ts|src/app/main\.tsx|src/app/boot/'` no imprime nada.
5. **Sin estilos en línea nuevos:** `git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'` no imprime nada.
6. **Complejidad:** `npm run lint` da 0 errores y 35 avisos; cada función de más de 10 que la unidad mueve o parte se informa antes y después (§3.0 para la 7).
7. **La comparación única de la unidad** (§0.3), con sus cantidades en la descripción del PR.
8. **La correspondencia de los checks** que la unidad adapta (§2.6, §3.6 y §4.6), copiada en la descripción del PR (FR-013, SC-009).
9. **Documentación** de la unidad, en el mismo cambio (§5).
10. **PR** con título y descripción en inglés: el contexto, qué faltaba y por qué, qué cambia, cómo se verificó (los comandos y las medidas de arriba), la correspondencia y qué queda pendiente.

### 0.3 · Las comparaciones únicas

FR-011 pide comparar el código del commit base con el de la unidad, sobre las mismas entradas, una vez. Los scripts corren fuera del repositorio, sobre dos raíces: un worktree del commit base y la de la unidad (quickstart-f2b.md §3). Las cantidades van en la descripción del PR. Las de las unidades 8, 5 y 7 corrieron al planificar, sobre prototipos.

| Unidad | Qué compara | Esperado |
| --- | --- | --- |
| 8 | (a) el multiconjunto de declaraciones del CSS del dist (contexto `@media`, cada selector por separado, propiedad, valor e `!important`); (b) el estilo computado de cada elemento de 14 páginas a 1 280, 981, 850, 650, 590 y 375 px, con y sin movimiento reducido | (a) 4 319 contra 4 319, 0 diferencias; (b) 168 capturas, 0 diferencias. Medido al planificar |
| 5 | (a) las URL que arman y reescriben la gramática y el código de hoy, con 15 ids (también hostiles), 9 URL actuales, 12 queries (con `?sistema=` y `?campana=` vacíos) y 13 hashes; (b) `exerciseContextHTML`, `lockedExerciseHTML`, `missionIDs` y `returnURL` de los adaptadores en las dos raíces, con dos estados del laboratorio, todos los mundos, talleres y ejercicios, los parámetros presentes y vacíos, y los dos lenguajes | (a) 2 569, 0 diferencias; (b) 55 880, 0 diferencias. Medido al planificar |
| 7 | los dos exploradores dibujados para los 274 ejercicios y, en los 73 que tienen uno, una traza de operaciones con el HTML, la región viva y el foco; y la clasificación del mapa contra la fixture | 2 214, 0 diferencias; 274 de 274 clasificaciones iguales. Medido al planificar, salvo la fixture, que genera T028 |
| 6 | con los adaptadores reales y `bundleApp('frontend/src/app/main.tsx')`, en 4 casos (el almacenamiento de master, el vacío y el vacío con cada una de las dos exportaciones importadas): el JSON de «Exportar progreso» sin `exportedAt`, el almacenamiento y el aviso; y, después de «Borrar todo», el almacenamiento, el aviso y el orden de los reinicios | 4 × 6 = 24 pares iguales. No corrió al planificar |

### 0.4 · Qué E2E de F1 cubre cada unidad

La red de F1 son 106 pruebas en 8 specs, y cada unidad las corre completas y sin editarlas.

| Unidad | Specs de F1 que la ejercen | Lo que la red no ve |
| --- | --- | --- |
| 8 · CSS | `css-contract` (15: R1 a R10, el movimiento reducido y el indicador de ejecución), y además `views`, `startup-storage` y `bridges` como regresión | El estado vacío del mapa del laboratorio (R9 mide sólo el de Sistemas), los anchos de 1 280 y 375 px, y cualquier propiedad que `css-contract` no nombra: los cubre el barrido |
| 5 · URL y puentes | `url-contract` (16: las seis formas, el Atlas y el cambio de idioma), `reload` (L1 a L11 con la URL exacta de llegada, C2 y C3), `views` (abrir un ejercicio reescribe la query) y `bridges` (9) | Los ids con caracteres para codificar (el contenido no tiene ninguno), los parámetros presentes y vacíos y los enlaces que ningún E2E sigue (las herramientas previas de un taller, el «Siguiente mundo»): los cubren las specs y las comparaciones |
| 7 · Exploradores | ninguna: ningún E2E abre un ejercicio con explorador | Todo: lo cubren `quest-explorers-check` (47), las specs nuevas y la comparación |
| 6 · Respaldo | ninguna: ningún E2E exporta, importa ni borra | Todo: lo cubren `app-shell-check` (53 más 4), `boot-check` («borrar todo» y las dos importaciones congeladas), la spec de la feature y la comparación. F8 trae los E2E con la descarga y la carga de archivo |

## 1. Unidad 8 · Las reglas de CSS que cruzan hojas (dueño H, onda 1)

**Cubre:** FR-058 a FR-060, FR-008 y FR-059; US7 y SC-007.

**Entrega:** las 26 reglas de las nueve filas de la spec, cada una en la hoja de su dueño, sin cambiar sus declaraciones ni el orden de carga de las hojas.

### 1.1 Las 26 reglas y su destino

Las líneas son las de `c5d497d`; H las vuelve a ubicar por texto, no por número.

| Fila de la spec | Reglas (selector) | Hoy | Destino |
| --- | --- | --- | --- |
| 1 · `.lab-nav-count` | `.lab-nav-count`; `.navigation a[aria-current='page'] .lab-nav-count` | `lab.css` 1 a 11 | final de `styles.css` |
| 9 · `.lab-empty` | `.lab-empty`; `.lab-empty h2`; `.lab-empty p` | `lab.css` 1007 a 1019 | final de `styles.css` |
| 2 · el menú a 850 px | `.navigation`; `.navigation a`; `.navigation .nav-count` | `lab.css` 1099 a 1107, dentro de su bloque de 850 px | un bloque `@media (max-width: 850px)` nuevo, al final de `styles.css` |
| 2 · el menú a 590 px | `.navigation`; `.navigation a`; `.navigation a:last-child`; `.navigation .nav-symbol` | `lab.css` 1144 a 1158, dentro de su bloque de 590 px | un bloque `@media (max-width: 590px)` nuevo, al final de `styles.css` |
| 5 · `.sr-only` | `.sr-only` | `lab.css` 1337 a 1347 (el comentario de sección de arriba se queda: es de lo que sigue) | final de `styles.css` |
| 4 · `touch-action` | `button, a, input, select, summary` | `lab.css` 1761 a 1767 | final de `styles.css` |
| 3 · la barra lateral desde 981 px | el bloque `@media (min-width: 981px)` entero: `.sidebar`; `.navigation`; `.sidebar-bottom` | `lab.css` 1969 a 1980 (el final de la hoja) | final de `styles.css` |
| 8 · `.navigation a:last-child` a 650 px | `.navigation a:last-child` | `campaign.css` 775 a 777, dentro de su bloque de 650 px | un bloque `@media (max-width: 650px)` nuevo, al final de `styles.css` |
| 7 · `.quest-lab-context` | `.quest-lab-context`; `.quest-lab-context a` | `campaign.css` 598 a 613 | final de `lab.css` |
| 6 · `.quest-banner` | `.quest-banner`; `.quest-banner p`; `.quest-banner .button` | `campaign.css` 632 a 650 | final de `lab.css` |
| 7 y 6 a 650 px | `.quest-lab-context`; `.quest-banner`; `.quest-banner .button` | `campaign.css` 765 a 774, dentro de su bloque de 650 px | un bloque `@media (max-width: 650px)` nuevo, al final de `lab.css`, después de las de arriba |

**El orden exacto al final de cada hoja:** en `styles.css`, filas 1, 9, 2 (850), 2 (590), 5, 4, 3 y 8; en `lab.css`, filas 7, 6 y su bloque de 650 px. Es el orden en que aparecen hoy, así que ninguna regla movida cambia de lugar respecto de otra movida. Al quedar después de todo `styles.css`, cada una sigue pisando lo que pisaba, incluidos los dos bloques de 590 px y el de `min-width: 1550px` (FR-059). `.quest-direct-lock` se queda en `campaign.css` (lo informa la spec a F6).

### Tarea 1.2 · Mover las reglas (T021, H)

- **Cambia:** `frontend/styles.css`, `frontend/lab.css` y `frontend/campaign.css`.
- **Pasos:**
  1. Antes de tocar nada: `npm run build` y guardar `dist/index.html` de la base (o un worktree del commit base, como dice quickstart-f2b.md §3).
  2. Cortar cada bloque de §1.1 con su texto exacto y pegarlo al final de su hoja de destino, en el orden de arriba; los bloques que estaban dentro de un `@media` van dentro de un `@media` nuevo con la misma condición. Ninguna declaración cambia, ni el orden de las declaraciones dentro de una regla.
  3. `npx prettier --check frontend/styles.css frontend/lab.css frontend/campaign.css`, `npm run build` y el paso 3 de §0.2: el script y el marcado del dist idénticos a los de T020.
  4. Las dos comparaciones de §0.3 (quickstart-f2b.md §3.1): el multiconjunto con 0 diferencias y el barrido con 0 diferencias. Si el barrido da diferencias, la regla está en otra posición de la cascada: se busca cuál con las propiedades que cambiaron, nunca se edita una declaración.
  5. `E2E_PORT=4182 npm run test:e2e`: 106 de 106, con las 15 de `css-contract`.
  6. **La prueba de que la prueba detecta algo:** en una copia descartable, poner las reglas al principio de `styles.css` en lugar del final. El barrido tiene que dar diferencias (al planificar dio 702 en 12 capturas) y el multiconjunto, ninguna.
  7. Un commit: `refactor(front): cada regla de CSS que cruzaba hojas vive en la hoja de su dueño`.
- **Compuerta:** los pasos 3 a 6.
- **Vuelta atrás:** revertí el commit: un solo revert devuelve las tres hojas.
- **Verificado al planificar:** todo lo de arriba sobre `c5d497d`. El `<style>` del dist pasó a `ae2971b0…` (+104 caracteres), el script quedó en `d4051c59…`, 106 de 106 E2E, el multiconjunto 4 319 contra 4 319 y el barrido sin diferencias. El texto de los bloques que se movieron está en el script del prototipo, quickstart-f2b.md §3.1.

### Tarea 1.3 · Compuerta y PR de la unidad 8 (T022, K)

La compuerta de §0.2, las dos comparaciones de §0.3, la documentación (§5) y el PR `refactor(front): move the CSS rules that cross sheets to their owner sheet`. Cubre FR-001, FR-002, FR-007 a FR-009 y FR-058 a FR-060; SC-001, SC-002, SC-007, SC-011 y SC-012. La descripción del PR dice que `.quest-direct-lock` sigue en `campaign.css` para F6, y que las dos copias de `.navigation a:last-child` son CSS muerto (F1) que se movió sin tocar.

**Reversión de la unidad 8:** el revert de T021. No depende de ninguna otra unidad.

## 2. Unidad 5 · Los puentes entre vistas y la gramática de URL (dueños S y U, onda 1)

**Cubre:** FR-043 a FR-047, FR-014, FR-017 y FR-018; US4 (escenarios 1 y 2), SC-008 (las seis formas) y SC-009 (`lab-bridge-check`).

**Entrega:** la gramática de URL en `shared/config`; los datos de los puentes de campaña y de Sistemas, en sus entidades, detrás de una entrada sin estado; las cinco fuentes que hoy arman o leen URL usándolas; y la regla R6 del guard.

### 2.0 Contratos de la unidad 5

**La gramática** (verificada: compila, pasa ESLint y da 2 569 URL iguales a las de hoy):

```ts
// frontend/src/shared/config/url-grammar.ts
export const VIEWS = ['recorrido', 'campana', 'sistemas', 'atlas', 'laboratorio', 'biblioteca', 'proyecto', 'metodo'] as const;
export type View = (typeof VIEWS)[number];
export type ExercisePhase = 'learn' | 'code' | 'reflect';
export type WorkshopPart = 'explore' | 'build' | 'ship';
export type LinkLanguage = 'rust' | 'go';
export const FREE_LAB_HREF = '?#laboratorio';

export interface LinkQuery {
  exercise: string | null; // ejercicio
  phase: string | null; // paso
  missionWorld: string | null; // campana
  missionWorkshop: string | null; // sistema
  world: string | null; // mundo
  language: string | null; // lenguaje
  workshop: string | null; // taller
  part: string | null; // parte
}

export function viewFromHash(hash: string): View; // today's views.includes(hash.slice(1)) ? … : 'recorrido'
export function readLinkQuery(search: string): LinkQuery; // URLSearchParams#get for the eight parameters
export function exercisePhaseOr(value: string | null, fallback: ExercisePhase): ExercisePhase;
export function workshopPartOr(value: string | null, fallback: WorkshopPart): WorkshopPart;
export function isLinkLanguage(value: string | null): value is LinkLanguage;

// Fresh links: a template, encodeURIComponent and a fixed parameter order.
export function exerciseHref(exerciseId: string, phase: ExercisePhase): string;
export function campaignMissionHref(worldId: string, exerciseId: string): string;
export function workshopExerciseHref(workshopId: string, exerciseId: string): string;
export function worldHref(worldId: string): string;
export interface WorkshopLocation { workshopId: string; part: WorkshopPart; language: LinkLanguage }
export function workshopReturnHref(location: WorkshopLocation): string; // ?taller=&parte=&lenguaje=#sistemas, in that order

// Rewrites of the current URL: a copy of it, URLSearchParams (form encoding), unknown parameters kept.
export function withLabQuery(current: URL, mode: 'map' | 'exercise', exerciseId: string, phase: ExercisePhase): URL;
export function withWorldQuery(current: URL, worldId: string): URL;
export function withWorkshopQuery(current: URL, language: string, workshopId: string | null, part: WorkshopPart): URL;
export function withLanguageQuery(current: URL, view: View, language: string): URL;
```

Cada función contiene, sin cambiar un carácter, el fragmento de hoy que reemplaza (tabla de abajo). Las listas de fases, partes y lenguajes válidos son constantes del módulo y no se exportan.

**Los puentes** (verificados: compilan, sin imports de valor y con 55 880 respuestas de los adaptadores iguales a las de hoy):

```ts
// frontend/src/entities/campaign/model/mission-bridge.ts (only `import type` from ./types)
export interface BridgeMission { id: string; points: number; code: boolean; prediction: boolean }
export interface BridgeWorld { id: string; title: string; missions: readonly BridgeMission[] }
export interface CampaignMissionContext { worldId: string; worldTitle: string; points: number; code: boolean; prediction: boolean }
export interface CampaignLinkAccess { allowed: boolean; reasons: readonly string[]; worldId: string | null }
// null when the linked world does not exist or the exercise is not one of its missions
export function campaignMissionContext(worlds: readonly BridgeWorld[], linkedWorldId: string, exerciseId: string): CampaignMissionContext | null;
// allowed = world && mission && permission.allowed && permission.worldId === linkedWorldId;
// reasons = mission ? permission.reasons : ['El enlace no corresponde a una misión de este mundo.'];
// worldId = the linked world when it exists, else null (the way back is then '#campana')
export function campaignLinkAccess(
  worlds: readonly BridgeWorld[],
  linkedWorldId: string,
  exerciseId: string,
  permission: Pick<AttemptPermission, 'allowed' | 'reasons' | 'worldId'>,
): CampaignLinkAccess;

// frontend/src/entities/campaign/bridge.ts: the stateless public entry
export { campaignLinkAccess, campaignMissionContext } from './model/mission-bridge';
export type { BridgeMission, BridgeWorld, CampaignLinkAccess, CampaignMissionContext } from './model/mission-bridge';

// frontend/src/entities/systems-workshop/model/workshop-bridge.ts (only `import type { WorkshopLocation }` from shared/config/url-grammar)
export interface BridgeWorkshop { code: Readonly<Record<string, string>>; related?: Readonly<Record<string, readonly string[]>> }
export type WorkshopExerciseRole = 'core' | 'tool';
export function workshopMissionIds(workshop: BridgeWorkshop | undefined, language: string): string[]; // [...new Set([...(related?.[language] || []), code[language]])], or []
export function workshopExerciseRole(workshop: BridgeWorkshop | undefined, exerciseId: string, language: string): WorkshopExerciseRole | null;
// The way back to a workshop: its build part, in the link's language ('go', or 'rust' for anything else)
export function workshopReturnTarget(workshopId: string, language: string): WorkshopLocation;

// frontend/src/entities/systems-workshop/bridge.ts
export { workshopExerciseRole, workshopMissionIds, workshopReturnTarget } from './model/workshop-bridge';
export type { BridgeWorkshop, WorkshopExerciseRole } from './model/workshop-bridge';
```

`DerivedWorld` y `AttemptPermission` del motor cumplen estas formas sin adaptarlas. Los índices de los dos slices no cambian: las entradas `bridge.ts` son la única puerta de estas funciones (research-f2b.md, R2). El regreso es un dato de la entidad que la gramática serializa: el de campaña es el `worldId` del contexto o del permiso (`worldHref`), y el de Sistemas, `workshopReturnTarget` (`workshopReturnHref`), que decide la parte `build` y normaliza el lenguaje.

**Cada lugar que hoy arma o lee una URL, y qué pasa a usar** (U lo cablea en T026):

| Archivo y función de hoy | Pasa a |
| --- | --- |
| `app.js`: la lista `views` y las dos lecturas `views.includes(location.hash.slice(1)) ? … : 'recorrido'` | `viewFromHash(location.hash)`; la lista se borra |
| `app.js:syncLinkedLanguage`: `params.get('lenguaje' \| 'mundo' \| 'ejercicio')`, `['rust', 'go'].includes(…)` y las tres comparaciones de `location.hash` | `readLinkQuery(location.search)`, `isLinkLanguage` y `viewFromHash(location.hash) === 'sistemas' \| 'campana' \| 'laboratorio'`; el resto de la función, igual |
| `app.js`, el clic de `[data-language]`: `new URL(location.href)` con `set('lenguaje')` o `search = ''` | `history.replaceState(null, '', withLanguageQuery(new URL(location.href), currentView, routeState().language))` |
| `lab.js:navigationList` y `finishNavigation`: `get('sistema')` y `get('campana')` | `readLinkQuery(location.search).missionWorkshop` y `.missionWorld`; la composición, igual |
| `lab.js:mount`: `get('ejercicio')` y la validación de `paso` | `readLinkQuery(…).exercise` y `exercisePhaseOr(link.phase, 'learn')` |
| `lab.js:syncLocation` | `const url = withLabQuery(new URL(location.href), mode, selectedId, phase);` fuera del `try`, y `history.replaceState(null, '', url)` dentro, como hoy |
| `lab.js:exerciseHTML` y el pie de `reflectHTML`: `new URLSearchParams(location.search).has('sistema')` | `readLinkQuery(location.search).missionWorkshop !== null` |
| `campaign.js:mount`: `get('mundo')` | `readLinkQuery(location.search).world` |
| `campaign.js`: `worldURL`, `missionURL` y `returnURL` | se borran; `worldHref` y `campaignMissionHref` en sus usos, y `returnURL: worldHref` en `window.TallerCampaign` |
| `campaign.js:render`: `href="?#laboratorio"` | `href="${FREE_LAB_HREF}"` |
| `campaign.js:onClick`, el mundo: `url.search = ''` y `set('mundo')` | `history.replaceState(null, '', withWorldQuery(new URL(location.href), selected))` |
| `campaign.js:exerciseContextHTML` | `readLinkQuery(…).missionWorld`; si no hay, `''`; `refresh()`; `campaignMissionContext(engine.getWorlds(lang), worldId, id)`; si es `null`, `''`; el mismo marcado con `worldHref(context.worldId)`, `context.worldTitle`, `context.points`, el `missionType(itemFor(id))` de hoy y los dos sellos |
| `campaign.js:lockedExerciseHTML` | `readLinkQuery(…).missionWorld`; si no hay, `''`; `campaignLinkAccess(engine.getWorlds(lang), worldId, id, engine.canAttempt(id, lang))`, en ese orden de llamadas; si `allowed`, `''`; el mismo marcado con `access.reasons` y `access.worldId ? worldHref(access.worldId) : '#campana'` |
| `systems.js:mount`: `get('taller')` y la validación de `parte` | `readLinkQuery(…).workshop` y `workshopPartOr(link.part, 'explore')` |
| `systems.js:returnURL(id, lang = language)` | conserva su firma y devuelve `workshopReturnHref(workshopReturnTarget(id, lang))` |
| `systems.js:missionIDs(id, lang)` | `workshopMissionIds(workshops().find((item) => item.id === id), lang)` |
| `systems.js:codeURL` | se borra; `workshopExerciseHref(workshop.id, id)` en sus dos usos |
| `systems.js:locationForSelection` | `history.replaceState(null, '', withWorkshopQuery(new URL(location.href), language, selected, phase))` |
| `systems.js:exerciseContextHTML` | `readLinkQuery(…).missionWorkshop`; el taller de `workshops()`; `workshopExerciseRole(w, id, lang)`; si es `null`, `''`; recién entonces `refresh()` y `engine.get(parent, lang)`; el mismo marcado con `workshopReturnHref(workshopReturnTarget(parent, lang))`, `w.title` y el rótulo según `role` |
| `pages/atlas/ui/ConceptDetail.tsx`: `labLink` | `exerciseHref(entry.labId, 'learn')` |

Las anclas que sólo llevan hash (`href="#campana"` del banner, `#proyecto`, `#biblioteca` y el `'#campana'` del bloqueo) se quedan como están (research-f2b.md, R3).

### Tarea 2.1 · La regla R6 del guard (T023, S)

- **Cambia:** `qa/lib/seams-guard.ts` y `qa/seams-guard-check.ts`.
- **La regla:** entre `frontend/*.js` y `frontend/src/app/**`, todo import (de valor o de tipo) cuyo especificador apunte dentro de `entities/<slice>/` tiene que ser el índice del slice (R4 decide quién puede importar valores de él) o una de las entradas sin estado declaradas: `entities/campaign/bridge`, `entities/systems-workshop/bridge` y `entities/exercise/explorers`. Cualquier otro camino (`model/**`, `lib/**`, `@x/**`) es una violación: `R6 <archivo>: imports <especificador>; outside a slice, import its index or a declared stateless entry`.
- **Interfaz:** no cambia `findViolations(sources)`; suma una función privada, como `indexViolations`, y la lista `STATELESS_ENTRIES`.
- **Qué prueba el check** (escenarios con fuentes virtuales, primero en rojo):
  - `frontend/campaign.js` que importa `./src/entities/campaign/model/mission-bridge` da R6, y sólo R6;
  - `frontend/src/app/legacy/register-x.ts` que importa `../../entities/exercise/model/lab-store` da R6;
  - `frontend/lab-explorers.js` que importa `./src/entities/exercise/@x/campaign` da R6;
  - por contraste, sin violaciones: `frontend/campaign.js` que importa `./src/entities/campaign/bridge`, `frontend/quest-explorers.js` que importa `./src/entities/exercise/explorers`, y la propia entrada `frontend/src/entities/campaign/bridge.ts`, que importa `./model/mission-bridge` (R6 no mira los archivos de un slice: su alcance son las fuentes legacy y `app/`);
  - el escenario del árbol real sigue sin violaciones.
- **Pasos:** los escenarios virtuales fallan contra el guard de hoy, que no tiene R6; se implementa la regla; `node qa/seams-guard-check.ts` pasa. Dos commits: `test(qa): R6, imports profundos de un slice desde las fuentes legacy (rojo)` y `test(qa): el guard admite fuera de un slice sólo su índice o una entrada sin estado`.
- **Compuerta:** `seams-guard-check` en verde (18 escenarios más los nuevos), `npm run typecheck` y `npm run lint` (sólo sintaxis TypeScript borrable, `tsconfig.qa.json`).
- **Vuelta atrás:** revertí los dos commits.
- **Compatible con A2:** su plan importa en `app/` sólo tipos, y desde los índices (`'../../entities/campaign'` y los otros tres), y sus worktrees no tienen imports profundos. Si un port necesitara un tipo de `model/**` desde `app/`, lo pide al índice del slice.
- **Verificado al planificar:** que R4 no ve un import profundo (`SLICE_INDEX_SPECIFIER` sólo acepta el índice) y que el árbol del prototipo de la unidad 5 da 0 violaciones con R4. R6 no corrió.

### Tarea 2.2 · Las specs de la gramática y de los puentes, en rojo (T024, U)

- **Crea:** los cinco módulos de §2.0 con sus firmas lanzando `not implemented`, y sus specs:
  - `frontend/src/shared/config/url-grammar.spec.ts`;
  - en `frontend/src/entities/campaign/`, `model/mission-bridge.spec.ts` y `bridge.spec.ts`;
  - en `frontend/src/entities/systems-workshop/`, `model/workshop-bridge.spec.ts` y `bridge.spec.ts`.
- **Qué prueban** (valores escritos a mano desde el mapa §4, las reglas de codificación y los ids de `qa/fixtures/curriculum-ids.json`):
  - **Las vistas:** `VIEWS` son las ocho, en este orden: `recorrido`, `campana`, `sistemas`, `atlas`, `laboratorio`, `biblioteca`, `proyecto` y `metodo`. `viewFromHash` da `atlas` para `#atlas`, y `recorrido` para `''`, `#`, `#Laboratorio`, `#invitacion=abc` y `#laboratorio?x`.
  - **Los enlaces nuevos:**
    - `exerciseHref('rust-02', 'code')` es `?ejercicio=rust-02&paso=code#laboratorio`;
    - `campaignMissionHref('rust-world-1', 'rust-02')` es `?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio`;
    - `workshopExerciseHref('cache', 'rust-113')` es `?sistema=cache&ejercicio=rust-113&paso=code#laboratorio`;
    - `worldHref('rust-world-1')` es `?mundo=rust-world-1#campana`;
    - `workshopReturnHref({ workshopId: 'cache', part: 'build', language: 'go' })` es `?taller=cache&parte=build&lenguaje=go#sistemas`;
    - `FREE_LAB_HREF` es `?#laboratorio`.
  - **Las reescrituras,** con `new URL(…)` sobre `http://taller.test/`:
    - `withWorkshopQuery` desde `?basura=1#sistemas`, con `go`, `cache` y `ship`, da `?lenguaje=go&taller=cache&parte=ship#sistemas`, y con `null` en el taller, `?lenguaje=go#sistemas`;
    - `withLanguageQuery` desde `?basura=1#sistemas` y la vista `sistemas` da `?basura=1&lenguaje=go#sistemas` (lo que fija F1), y desde `?basura=1#proyecto` con la vista `proyecto`, `#proyecto` sin query;
    - `withLabQuery` desde `?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio`, en modo `exercise` con `rust-06` y `code`, da `?campana=rust-world-1&ejercicio=rust-06&paso=code#laboratorio`, y en modo `map`, `#laboratorio` sin query (también desde `?#laboratorio`);
    - `withWorldQuery` desde `?campana=x&ejercicio=y#campana` da `?mundo=rust-world-2#campana`;
    - ninguna de las cuatro modifica el `URL` que recibe.
  - **La codificación de cada familia:**
    - `worldHref('mundo raro/1')` es `?mundo=mundo%20raro%2F1#campana`, y `withWorldQuery(…, 'mundo raro/1')` escribe `?mundo=mundo+raro%2F1`;
    - `workshopReturnHref({ workshopId: "!'()*~", part: 'build', language: 'go' })` es `?taller=!'()*~&parte=build&lenguaje=go#sistemas`, y `withWorkshopQuery(…, 'go', "!'()*~", 'ship')` escribe `taller=%21%27%28%29*%7E`.
  - **Los lectores:**
    - `readLinkQuery('?campana=rust-world-1&ejercicio=rust-02&paso=learn')` da esos tres valores y `null` en los otros cinco;
    - `readLinkQuery('?sistema=')` da `missionWorkshop: ''`, presente y vacío;
    - `exercisePhaseOr` da `learn` para `CODE`, `''` y `null`, y conserva `reflect`;
    - `workshopPartOr` da `explore` para `x` y conserva `ship`;
    - `isLinkLanguage` acepta sólo `rust` y `go`.
  - **El contexto de campaña,** con mundos armados a mano, por ejemplo `rust-world-1` con el título «Estación del robot» y las misiones `rust-02` (0 puntos, sin sellos) y `rust-103`, y `go-world-1`:
    - `rust-02` da `{ worldId: 'rust-world-1', worldTitle: 'Estación del robot', points: 0, code: false, prediction: false }`;
    - con los dos sellos, `points: 30`;
    - `rust-01`, que no es misión de ese mundo, da `null`, y un mundo inexistente también;
    - un mundo de Go da su título.
  - **El permiso de campaña:**
    - un permiso `{ allowed: false, reasons: ['Verificá …'], worldId: 'rust-world-1' }` sobre `rust-103` da `allowed: false`, esos motivos y `worldId: 'rust-world-1'`;
    - `allowed: true` en el mismo mundo da `allowed: true`;
    - `allowed: true` con `worldId: 'rust-world-2'` da `allowed: false` con los motivos del permiso;
    - `rust-01` da los motivos `['El enlace no corresponde a una misión de este mundo.']`, y un mundo inexistente da lo mismo con `worldId: null`.
  - **Los puentes de Sistemas,** con talleres armados a mano y el regreso:
    - `{ code: { rust: 'rust-113' }, related: { rust: ['rust-31', 'rust-35'] } }` da `['rust-31', 'rust-35', 'rust-113']`;
    - un `related` que repite el núcleo no lo repite: `['a', 'x']` con `code: 'x'` da `['a', 'x']`;
    - `undefined` da `[]`, y un lenguaje sin `related` da sólo el núcleo;
    - el rol es `core` para el núcleo, `tool` para `rust-31`, y `null` para `rust-01`, para el núcleo de Go pedido en Rust y para un taller `undefined`;
    - `workshopReturnTarget('cache', 'go')` es `{ workshopId: 'cache', part: 'build', language: 'go' }`, y con `'otro'` o `'rust'` el lenguaje es `rust`.
  - **El aislamiento de cada entrada** (`bridge.spec.ts`): con `vi.resetModules()` y `vi.doMock` sobre los cinco módulos con singleton (`entities/guide/model/route-store`, `entities/exercise/model/lab-store`, `entities/exercise/model/exercise-catalog`, `entities/campaign/model/create-campaign-engine` y `entities/systems-workshop/model/create-systems-engine`), cada mock con una fábrica que lanza, importar la entrada resuelve. Como control, importar el índice del mismo slice rechaza con «error when mocking», que es como Vitest envuelve el error de la fábrica.
- **Pasos:** las firmas y las specs; `npm run test:unit -- shared/config entities/campaign entities/systems-workshop`, que falla con `not implemented`. Las dos specs de aislamiento pasan desde el principio, porque las entradas reexportan firmas sin estado: son las que vigilan T025. Un commit: `test(front): specs de la gramática de URL y de los datos de los puentes (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 2.3 · La gramática y los puentes (T025, U)

- **Cambia:** los cinco módulos de T024 (se implementan) y las dos entradas `bridge.ts`. No cambia ningún índice ni ninguna fuente legacy.
- **Pasos:** implementar copiando el fragmento de hoy de cada función (tabla de §2.0) hasta que las specs de T024 pasen; `npm run typecheck` y `npm run lint` sin avisos nuevos. Un commit: `refactor(front): la gramática de URL vive en shared/config y los puentes son datos de sus entidades`.
- **Vuelta atrás:** revertí el commit; nadie usa todavía los módulos.

### Tarea 2.4 · Las vistas legacy y el Atlas usan la gramática y los puentes (T026, U)

- **Cambia:** `frontend/campaign.js`, `frontend/systems.js`, `frontend/lab.js`, `frontend/src/pages/atlas/ui/ConceptDetail.tsx` y, en `frontend/app.js`, sólo lo de la URL (tabla de §2.0).
- **Imports:**
  - `campaign.js` importa de `./src/shared/config/url-grammar` y de `./src/entities/campaign/bridge`;
  - `systems.js`, de la gramática y de `./src/entities/systems-workshop/bridge`;
  - `lab.js` y `app.js`, de la gramática;
  - `ConceptDetail.tsx`, de `../../../shared/config/url-grammar`.

  Ninguno importa un índice ajeno (R4) ni un `model/**` (R6).
- **Pasos:**
  1. Cablear archivo por archivo, siguiendo la tabla de §2.0; los métodos de `window.TallerCampaign` y de `window.TallerSystems` no cambian de nombre ni de firma.
  2. `node qa/lab-bridge-check.ts` (21), `node qa/boot-check.ts` (14), `node qa/app-shell-check.ts` (53), `node qa/atlas-check.ts`, `node qa/seams-guard-check.ts` y `npm test`, sin cambiar un valor esperado.
  3. Las dos comparaciones de §0.3 (quickstart-f2b.md §3.2): 2 569 URL y 55 880 respuestas, 0 diferencias.
  4. `npm run build`, el paso 3 de §0.2 (el `<style>` y el marcado idénticos) y `E2E_PORT=4184 npm run test:e2e` (106).
  5. Un commit: `refactor(front): las vistas legacy y el Atlas arman y leen las URL con la gramática`.
- **Compuerta:** los pasos 2 a 4; `npm run lint` con 35 avisos (`syncLinkedLanguage` sigue en 11); el diff no toca una línea con `style=`.
- **Vuelta atrás:** revertí el commit: las cinco fuentes vuelven a armar sus URL y su contexto.
- **Verificado al planificar:** todo lo de arriba, sobre un prototipo con las unidades 5, 6 y 7 juntas: `lab-bridge-check` 21, `boot-check` 14, `app-shell-check` 57 (con los gemelos de la 6), `seams-guard-check` 18, `npm test` en verde, 106 E2E, las dos comparaciones sin diferencias y los tres oráculos del currículo con los mismos bytes. La unidad 5 suma 770 caracteres al HTML. Después del último cambio de diseño (`workshopReturnTarget`, que trajo el análisis) se volvieron a correr el build, los oráculos, `npm test`, las dos comparaciones y los 106 E2E.

### Tarea 2.5 · Compuerta y PR de la unidad 5 (T027, K)

La compuerta de §0.2 con las dos comparaciones, la correspondencia de §2.6, la documentación (§5) y el PR `refactor(front): add the URL grammar and pass the view bridges as data`, con T023 (S) y T024 a T026 (U). Cubre FR-001, FR-002, FR-007 a FR-009, FR-011, FR-013, FR-014, FR-017, FR-018 y FR-043 a FR-047; SC-001, SC-002, SC-008, SC-009, SC-011 y SC-012. Su integración en `master` es S1.

**Reversión de la unidad 5:** se revierten T026, T025, T024 y T023, en ese orden. Se revierte antes la unidad 6 si ya está integrada, porque las dos tocan el bloque de imports de `app.js`.

### 2.6 La correspondencia de `lab-bridge-check` (21)

Ningún escenario se retira: el check sigue cargando `campaign.js` y `systems.js` reales y no cambia una línea. La columna dice qué spec nueva fija el contrato de dominio de cada uno.

| # | Escenario | Contrato fijado también en |
| --- | --- | --- |
| 1 | campaña: `returnURL` conserva `?mundo=<id>#campana` (también con `mundo raro/1`) | `url-grammar.spec`: `worldHref`, normal y codificado |
| 2 | campaña: una misión de entrenamiento muestra mundo, XP y tipo | `mission-bridge.spec`: el contexto (el rótulo del tipo, sólo en el check) |
| 3 | campaña: el tipo distingue reparación, kata y desafío final | sólo el check: `missionType` se queda en el adaptador hasta F6 |
| 4 | campaña: el contexto de Go usa el mundo de Go | `mission-bridge.spec` |
| 5 | campaña: un ejercicio fuera de campaña devuelve `''` | `mission-bridge.spec` (`null`) y `url-grammar.spec` (sin `campana`) |
| 6 | campaña: el contexto refleja las pruebas y la predicción | `mission-bridge.spec` (sellos y puntos) |
| 7 | campaña: un jefe bloqueado muestra los motivos y el regreso | `mission-bridge.spec`: el permiso |
| 8 | campaña: una misión permitida o sin enlace no se bloquea | `mission-bridge.spec` (`allowed`) y `url-grammar.spec` |
| 9 | campaña: el jefe se habilita al verificar y sincronizar | sólo el check (motor real) |
| 10 | campaña: un enlace que no pertenece al mundo explica el problema | `mission-bridge.spec` (el motivo y `worldId: null`) |
| 11 | sistemas: el catálogo expone los 25 talleres | sólo el check (catálogo) |
| 12 | sistemas: `missionIDs` termina en el núcleo (50 núcleos) | `workshop-bridge.spec` (el núcleo al final) |
| 13 | sistemas: primero las herramientas previas y después el núcleo | `workshop-bridge.spec` (orden y sin repetir) |
| 14 | sistemas: `missionIDs` vacío sin taller o con uno desconocido | `workshop-bridge.spec` (`undefined`) |
| 15 | sistemas: `returnURL` conserva `?taller=&parte=build&lenguaje=#sistemas` | `workshop-bridge.spec`: `workshopReturnTarget`; `url-grammar.spec`: `workshopReturnHref` |
| 16 | sistemas: el núcleo muestra el título del taller y el regreso | `workshop-bridge.spec` (`core`) |
| 17 | sistemas: una herramienta previa se rotula como tal | `workshop-bridge.spec` (`tool`) |
| 18 | sistemas: ni núcleo ni previo devuelve `''` | `workshop-bridge.spec` (`null`) |
| 19 | sistemas: el contexto marca el núcleo verificado | sólo el check (motor real) |
| 20 | escape: el título de un mundo, escapado | sólo el check (el HTML sigue en el adaptador) |
| 21 | escape: el título de un taller, escapado | sólo el check |

## 3. Unidad 7 · Los modelos puros de los exploradores (dueño X, onda 1)

**Cubre:** FR-054 a FR-057, FR-014 y FR-018; US6 y SC-008 (las 274 clasificaciones).

**Entrega:** el mapa explícito de qué ejercicio tiene qué explorador, la fixture congelada de la clasificación de hoy, los modelos puros de los dos exploradores detrás de la entrada `entities/exercise/explorers.ts`, y `lab-explorers.js` y `quest-explorers.js` dibujándolos.

### 3.0 Contratos de la unidad 7

Verificados: compilan, dan 2 214 comparaciones iguales a las de hoy y `quest-explorers-check` 47 de 47.

```ts
// frontend/src/entities/exercise/model/explorer-kinds.ts (no imports)
export type LabExplorerKind = 'channel' | 'generic' | 'pointer';
export type QuestExplorerMode = 'robot' | 'packet';
export type ExplorerKind = LabExplorerKind | QuestExplorerMode;
export type QuestLanguage = 'rust' | 'go';
export interface QuestExplorerInfo { language: QuestLanguage; mode: QuestExplorerMode }
// Two module-private ReadonlyMap literals: 61 lab entries ('rust-36' → 'generic', …) and 12 quest entries
// ('rust-101' → { language: 'rust', mode: 'robot' }, …, 'go-106' → { language: 'go', mode: 'packet' }).
export function labExplorerKindOf(exerciseId: string): LabExplorerKind | null;
export function questExplorerOf(exerciseId: string): QuestExplorerInfo | null;
export function explorerKindOf(exerciseId: string): ExplorerKind | null; // quest first, then lab

// frontend/src/entities/exercise/model/lab-explorer.ts (no imports)
export interface LabExplorerState {
  value: number; copy: number; capacity: number; queue: number[]; sender: boolean; receiver: boolean;
  delivered: number; notice: string; type: string; constraint: string;
}
export interface GenericContract { valid: boolean; constraintName: string }
export const FIRST_STEP_NOTICE = 'Elegí qué participante da el primer paso.';
export function initialLabExplorerState(): LabExplorerState; // today's reset()
export function applyLabExplorerOperation(state: LabExplorerState, operation: string): LabExplorerState; // the state part of act; send and receive become two private functions
export function chooseLabExplorerOption(state: LabExplorerState, field: 'constraint' | 'type', value: string): LabExplorerState;
export function genericContract(constraint: string, type: string, language: string): GenericContract; // `valid` and `constraintName` of body()

// frontend/src/entities/exercise/model/quest-explorer.ts (only `import type` from ./explorer-kinds)
export interface RobotLogEntry { step: number; summary: string; why: string }
export interface RobotState { x: number; y: number; energy: number; initialEnergy: number; attempts: number; moves: number; logs: RobotLogEntry[]; prediction: number | null; notice: string }
export interface PacketState { control: number; size: number; corrupt: boolean; badLength: boolean; reversed: boolean; prediction: number | null; notice: string }
export type QuestState = RobotState | PacketState;
export type PacketFailure = 'version' | 'largo' | 'checksum' | null;
export interface PacketData { original: number[]; received: number[]; lengthBytes: number[]; declared: number; sent: number; computed: number; failure: PacketFailure }
export function hex(value: number, digits?: number): string;
export function initialQuestState(info: QuestExplorerInfo, energy?: number): QuestState; // today's fresh
export function crc32(bytes: readonly number[]): number;
export function rotateChecksum(bytes: readonly number[]): number;
export function packetData(state: PacketState, info: QuestExplorerInfo): PacketData;
// The state part of today's act: a new state, or null where act returns without drawing.
export function applyQuestOperation(state: QuestState, info: QuestExplorerInfo, operation: string): QuestState | null;

// frontend/src/entities/exercise/explorers.ts: the stateless public entry, with every function and type above.
```

**Qué se queda en las vistas legacy:**

- En `lab-explorers.js`: `model` (ahora `let model = initialLabExplorerState()`), `reset`, `kind` (ahora `labExplorerKindOf(item.id) ?? ''`), `button`, `render`, `body` (que usa `genericContract` y `FIRST_STEP_NOTICE`), el foco de `act` y `change`, `missions` y `curriculumHTML`.
- En `quest-explorers.js`: `states`, `descriptor` (ahora `questExplorerOf(item?.id || '')`), `stateFor`, `button`, `prediction`, `robotBody`, `bytesPreview`, `packetBody`, `body`, `render` y, en `act`, la búsqueda del panel, `states.set`, el dibujo, la región viva y el foco.
- El comentario de la primera línea de `quest-explorers.js` se conserva.

**Complejidad** (medida en el prototipo con `npm run lint`):

| Antes | Después |
| --- | --- |
| `lab-explorers.js:body` 34, `act` 18 | `body` 26; `act` baja de 10 |
| `quest-explorers.js:act` 38, `packetBody` 22, `robotBody` 16, `packetData` 14 | `act` 19 (sólo DOM), `packetBody` 22, `robotBody` 16 |
| — | `quest-explorer.ts:packetData` 14 (movida), `applyPacketOperation` 15 (la rama del paquete de `act`, movida) |
| 6 avisos | 6 avisos; el total sigue en 35 |

### Tarea 3.1 · La fixture congelada de la clasificación (T028, X)

- **Crea:** `qa/fixtures/explorer-kinds-<base>.json`, donde `<base>` es el hash corto del commit base de T020.
- **Forma:** `{ "commit": "<hash completo>", "kinds": { "<id>": "channel" | "generic" | "pointer" | "robot" | "packet" | null } }`, con los 274 ids en el orden del catálogo (los ocho grupos de `exerciseCatalog`).
- **Pasos:** correr el script de quickstart-f2b.md §3.3, que aplica las dos expresiones regulares de hoy (`lab-explorers.js:kind` y `quest-explorers.js:descriptor`, copiadas del commit base) a `build/curriculum.json` de ese commit. Comprobar los conteos: 21, 20, 20, 6, 6 y 201 `null`, y ningún id con dos exploradores. Un commit: `test(front): fixture congelada de la clasificación de exploradores en <base>`.
- **Regla:** está congelada. Nunca se regenera para que una prueba pase, y nunca sale del mapa.
- **Vuelta atrás:** revertí el commit (después de T029 a T031, que la usan).

### Tarea 3.2 · Las specs del mapa y de los modelos, en rojo (T029, X)

- **Crea:** los tres módulos de §3.0 con sus firmas lanzando `not implemented`, `explorers.ts`, y sus specs:
  - en `frontend/src/entities/exercise/model/`, `explorer-kinds.spec.ts`, `lab-explorer.spec.ts` y `quest-explorer.spec.ts`;
  - `frontend/src/entities/exercise/explorers.spec.ts`.
- **Qué prueban:**
  - **El mapa contra la fixture:** para cada uno de los 274 ids de la fixture, `explorerKindOf(id)` es su valor. Los conteos escritos a mano son 21, 20, 20, 6, 6 y 201.
  - **Puntos escritos a mano:**
    - `go-61` y `go-112` son `channel` (entran sólo por `visual`), `rust-36` es `generic` y `go-21` es `pointer`;
    - `questExplorerOf('rust-101')` es `{ language: 'rust', mode: 'robot' }` y `questExplorerOf('go-106')`, `{ language: 'go', mode: 'packet' }`;
    - dan `null`: `go-100`, `rust-107`, `go-110`, `evil-101`, `go-101x`, `<script>`, `constructor`, `__proto__`, `toString` y `''`.
  - **El explorador de laboratorio,** con notas escritas a mano:
    - el estado inicial;
    - **canal sin buffer:** el envío deja al productor esperando, con la nota de hoy; la recepción siguiente lo libera y entrega 1;
    - **canal con buffer de 2:** dos envíos llenan la cola y el tercero espera; una recepción entrega 1, mantiene la cola en 2 y libera al productor, con «La recepción liberó un lugar…»;
    - una recepción sin mensajes deja al consumidor esperando, y el envío siguiente entrega;
    - **puntero:** copiar sube `copy` a 11 sin tocar `value`, y la referencia sube `value` a 11;
    - `reset` y `capacity-N` vuelven al estado inicial (el segundo con la capacidad);
    - `chooseLabExplorerOption` cambia sólo su campo;
    - ninguna función muta el estado que recibe.
  - **La tabla genérica:** en Rust, `ordered` con `record` es inválido con el nombre `Ord`, `comparable` con `record` es inválido con `Eq` y `display` con `string` es válido con `Display`. En Go, `comparable` con `record` es válido con `comparable`, `ordered` con `record` es inválido con `~int | ~string` y `display` con `int` es válido con `~int | ~string`.
  - **El explorador de misión:** los contratos de dominio de las 47 aserciones de `quest-explorers-check` (§3.6), con sus valores verificados aparte. El CRC-32 IEEE de Python `zlib.crc32` da `0x14381A7F` para el SOS de Go, `0x00000000` vacío y `0x15FA7048` con el bit alterado. La huella de Rust, resuelta a mano (`13 → 25 → 19 → 7D → A9`), da `0xA9`, y `0xAD` con el bit alterado. Además:
    - con `size-260`, `lengthBytes` es `[0x01, 0x04]`, y invertido declara 1 025; con `bad-length` después, 1 024;
    - en Rust, `bad-length` declara 2 con el fallo `largo`, y `bit-5` y `bit-4` dan `0x23` con el fallo `version`;
    - los 14 intentos dejan 6 entradas numeradas de 9 a 14;
    - las operaciones que hoy no dibujan dan `null`: `size-260` y `reverse-endian` en Rust, `corrupt` con tamaño 0 y `nope`.
  - **El aislamiento de la entrada** (`explorers.spec.ts`): lo mismo que en §2.2, con el índice de `entities/exercise` como control.
- **Pasos:** las specs fallan con `not implemented`, salvo la de aislamiento. Un commit: `test(front): specs del mapa y de los modelos de los exploradores (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 3.3 · El mapa y los modelos (T030, X)

- **Cambia:** los tres módulos de T029 (se implementan) y `explorers.ts`. El índice de `entities/exercise` no cambia.
- **Pasos:**
  - escribir los dos `Map` entrada por entrada, desde la fixture y no desde las expresiones regulares;
  - mover el código de transición tal cual: devolver un estado nuevo en lugar de mutar es el único cambio, y `send` y `receive` pasan a dos funciones privadas;
  - las specs de T029 pasan; `npm run typecheck` y `npm run lint`, con los avisos de §3.0 en los módulos.
- **Un commit:** `refactor(front): el mapa explícito y los modelos de los exploradores viven en entities/exercise`.
- **Vuelta atrás:** revertí el commit.

### Tarea 3.4 · Los exploradores dibujan los modelos (T031, X)

- **Cambia:** `frontend/lab-explorers.js` y `frontend/quest-explorers.js`, que importan sólo de `./src/entities/exercise/explorers`.
- **Pasos:**
  1. Cablear como dice §3.0; `render`, `act`, `change`, `reset` y `curriculumHTML` conservan su firma y su global.
  2. `node qa/quest-explorers-check.ts` (47, sin cambiar una línea), `node qa/boot-check.ts` (14, que evalúa cada fuente sola sin tocar el almacenamiento), `node qa/seams-guard-check.ts` y `npm test`.
  3. La comparación de §0.3 (quickstart-f2b.md §3.3): 2 214 comparaciones, 0 diferencias, y las 274 clasificaciones iguales a la fixture.
  4. `npm run build`, el paso 3 de §0.2 y `E2E_PORT=4185 npm run test:e2e` (106).
  5. Un commit: `refactor(front): lab-explorers.js y quest-explorers.js dibujan los modelos de entities/exercise`.
- **Compuerta:** los pasos 2 a 4, y 35 avisos con la redistribución de §3.0.
- **Vuelta atrás:** revertí el commit.
- **Verificado al planificar:** el prototipo dio todo lo de arriba, con +2 023 caracteres en el HTML.

### Tarea 3.5 · Compuerta y PR de la unidad 7 (T032, K)

La compuerta de §0.2 con la comparación, la correspondencia de §3.6, la documentación (§5) y el PR `refactor(front): extract the explorer models and choose explorers from an explicit map`. Cubre FR-001, FR-002, FR-007 a FR-009, FR-011, FR-013, FR-014, FR-016, FR-018 y FR-054 a FR-057; SC-001, SC-002, SC-008, SC-009, SC-011 y SC-012.

**Reversión de la unidad 7:** se revierten T031, T030, T029 y T028. No depende de otra unidad: R6 nombra la entrada `explorers`, y que esa entrada no exista no es una violación.

### 3.6 La correspondencia de `quest-explorers-check` (47 aserciones)

Ninguna aserción se retira: el check sigue cargando `quest-explorers.js` por ruta y no cambia una línea. El foco, el dibujo y el reinicio global (`states.clear()`) quedan sólo en el check, porque son del adaptador.

| Aserciones | Cuántas | Contrato fijado también en |
| --- | --- | --- |
| «Supported exercise: rust-101 … go-106» | 12 | `explorer-kinds.spec`: `questExplorerOf` de los 12, con lenguaje y modo |
| «Unsupported ID returns null» (`go-100`, `rust-107`, `go-110`, `evil-101`, `go-101x`, `<script>`) | 6 | `explorer-kinds.spec`: `null` |
| Robot: el choque conserva posición y batería; el rechazo no suma un paso; cuatro pasos llegan con la batería vacía; la llegada muestra los cuatro pasos y el mensaje; sin batería no se mueve; el rechazo lo explica; 14 intentos muestran los últimos 6, del 9 al 14; la región viva retiene «Intento 14.»; la batería 2 empieza de nuevo; la predicción correcta | 10 | `quest-explorer.spec` (estado, `logs` y `notice`) |
| Robot: mover actualiza la vista y la región viva y devuelve el foco al mismo control | 1 | `quest-explorer.spec` (posición y nota); el foco, sólo en el check |
| Go-106: el paquete inicial pasa; CRC del SOS; CRC vacío; la alteración cambia el CRC calculado; se rechaza el alterado; 260 se codifica 01 04; invertir da 1 025; la longitud alterada después da 1 024 | 8 | `quest-explorer.spec` (`packetData` y `applyQuestOperation`) |
| Go-106: el tamaño limpia las alteraciones y retiene el foco; restaurar deja un paquete válido y retiene el foco | 2 | `quest-explorer.spec` (el estado); el foco, sólo en el check |
| Rust-106: la huella cubre cabecera, longitud y payload; el paquete pasa; la alteración cambia la huella; se rechaza; la longitud se valida antes que la huella; la versión antes que la longitud | 6 | `quest-explorer.spec` |
| El reinicio global limpia el robot y el paquete | 2 | `quest-explorer.spec` (`initialQuestState`); `states.clear()`, sólo en el check |

## 4. Unidad 6 · `features/progress-backup` (dueño B, ondas 1 y 2)

**Cubre:** FR-048 a FR-053, FR-005, FR-006, FR-014 y FR-015; US5, SC-003 (las exportaciones), SC-009 (`app-shell-check`) y SC-010.

**Entrega:** exportar, importar en dos fases, «Borrar todo» y los respaldos como `features/progress-backup`, con una interfaz que D1c reemplaza sin tocar a quien llama (Q4), y `app.js` armándola con sus adaptadores.

### 4.0 Contratos de la unidad 6

Verificados: compilan, pasan ESLint, `app-shell-check` da 57 de 57 y `boot-check`, 14 de 14.

```ts
// frontend/src/features/progress-backup/model/types.ts
import type { GuideData, RouteImportPlan, RouteProgressV1 } from '../../../entities/guide';
import type { BackupEntry } from '../../../shared/lib/versioned-storage';

export type AreaName = 'recorrido' | 'laboratorio' | 'campaña' | 'Sistemas';
export type MaybePromise<T> = T | Promise<T>;
export interface SectionPlan { lossy: boolean }

export interface RouteArea { // routeStore already is one
  getProgress(): RouteProgressV1;
  applyImport(plan: RouteImportPlan): MaybePromise<boolean>; // falsy counts as «not saved», as today
  reset(): MaybePromise<boolean>; // only false counts as a failed removal
  backups(): BackupEntry[];
}
export interface SectionArea {
  exportState(): unknown; // undefined leaves the section out of the export
  planImport(raw: unknown): SectionPlan; // throws on an invalid section
  applyImport(plan: SectionPlan): MaybePromise<unknown>; // only false counts as «not saved»
  reset(): MaybePromise<boolean | undefined>; // only false counts; undefined is an absent adapter
  backups(): BackupEntry[];
}
export interface SealedArea extends SectionArea { syncDerivedSeals(): void }
export interface ProgressAreas { route: RouteArea; lab: SectionArea; campaign: SealedArea; systems: SealedArea }

export interface ProgressBackupOptions {
  guide: GuideData; // content by parameter (FR-015)
  areas: ProgressAreas;
  sessionResets: readonly (() => void)[]; // what is not storage, registered by its owner (FR-051)
}

export interface ProgressFile { fileName: string; text: string }
export interface BackupListing extends BackupEntry { area: AreaName }
export interface PlannedSection { area: AreaName; source: SectionArea; plan: SectionPlan }
export interface ProgressImportPlan { route: RouteImportPlan; sections: readonly PlannedSection[] }
export interface ProgressNotice { notice: string }
export interface ResetConfirmation { password: string } // D1c asks for it; ignored locally

export interface ProgressBackup {
  exportProgress(): ProgressFile;
  listBackups(): BackupListing[];
  readBackup(key: string): ProgressFile | undefined; // reads the slot again on every call
  planImport(text: string): ProgressImportPlan; // phase 1: parses and plans everything, applies nothing
  applyImport(plan: ProgressImportPlan): Promise<ProgressNotice>; // phase 2, then the derived seals
  resetAll(confirmation?: ResetConfirmation): Promise<ProgressNotice>;
}

// frontend/src/features/progress-backup/model/create-progress-backup.ts
export function createProgressBackup(options: ProgressBackupOptions): ProgressBackup;
export function assertImportSize(size: number): void; // throws 'El archivo supera el tamaño permitido (10 MB).' above 10 * 1024 * 1024
export function importFailureNotice(error: unknown): string; // 'No se pudo importar: ' + the SyntaxError text or the message

// frontend/src/features/progress-backup/index.ts exports the three functions and every type above
// except MaybePromise and PlannedSection.
```

**Qué hace cada método, con el código de hoy de `app.js`:**

- **`exportProgress`:** es `exportProgress` sin la descarga ni el toast. El texto es `JSON.stringify({ ...route.getProgress(), lab, campaign, systems, exportedAt }, null, 2)`, y el nombre, `taller-progreso-<AAAA-MM-DD>.json`. Conserva los dos `new Date()`: primero `exportedAt` y después el nombre.
- **`listBackups` y `readBackup`:** son `collectBackups` y `downloadBackup` sin la descarga. El orden de áreas es recorrido, laboratorio, campaña y Sistemas; el nombre del archivo reemplaza lo que no sea `[a-z0-9-]` por `-` y agrega `.json`.
- **`planImport`:**
  - lee el JSON, sin atrapar el `SyntaxError`;
  - planifica el recorrido con `planRouteImport` (`isPlainObject`, `ROUTE_FORMAT_ERROR`, `parseRouteProgress` con `guide`, `NON_ROUTE_KEYS` e `isLosslessNormalization`), fusionando con `route.getProgress()`;
  - planifica cada sección presente en el orden campaña, laboratorio y Sistemas;
  - si cualquiera lanza, no se aplica nada.
- **`applyImport`:**
  - aplica las secciones en el orden del plan y espera cada una;
  - una sección que resuelve `false` es «no se guardó»; después aplica el recorrido, y si resuelve algo falsy, también;
  - sincroniza los sellos, primero Sistemas y después campaña, cada uno con su `try`; un fallo se registra con `console.error`;
  - resuelve el aviso de `importNotice`, con sus textos y su orden de áreas;
  - una sección que lanza al aplicar rechaza la promesa y deja el recorrido sin aplicar.
- **`resetAll`:**
  - espera, en orden, el `reset` del recorrido, del laboratorio, de campaña y de Sistemas;
  - corre los `sessionResets` en el orden en que se registraron;
  - resuelve «Progreso reiniciado. Un nuevo comienzo.», o el aviso de fallo si algún resultado fue `false`;
  - la confirmación no se usa.

**El cableado en `app.js`** (B, T036), dentro de `startApp()` y antes de la primera llamada a `backupsPanel`:

```js
const progressBackup = createProgressBackup({
  guide: data,
  areas: {
    route: routeStore,
    lab: {
      exportState: () => window.TallerLab?.exportState(),
      planImport: (raw) => window.TallerLab.planImport(raw),
      applyImport: (plan) => window.TallerLab.applyImport(plan),
      reset: () => window.TallerLab?.reset(),
      backups: () => window.TallerLab?.backups?.() ?? [],
    },
    campaign: {
      exportState: () => window.TallerCampaignEngine?.exportState(),
      planImport: (raw) => window.TallerCampaignEngine.planImport(raw),
      applyImport: (plan) => window.TallerCampaignEngine.applyImport(plan),
      reset: async () => (await window.TallerCampaignEngine?.reset())?.removed,
      backups: () => window.TallerCampaignEngine?.backups?.() ?? [],
      syncDerivedSeals: () => window.TallerCampaign?.sync(),
    },
    systems: {
      exportState: () => window.TallerSystemsEngine?.exportState(),
      planImport: (raw) => window.TallerSystemsEngine.planImport(raw),
      applyImport: (plan) => window.TallerSystemsEngine.applyImport(plan),
      reset: async () => (await window.TallerSystemsEngine?.reset())?.removed,
      backups: () => window.TallerSystemsEngine?.backups?.() ?? [],
      syncDerivedSeals: () => window.TallerSystems?.sync(),
    },
  },
  sessionResets: [
    () => window.TallerSystems?.resetSimulations(),
    () => {
      timer.running = false;
      timer.remaining = routeState().minutes * 60;
    },
  ],
});
```

Cada función lee `window.Taller*` al llamarse, con los mismos `?.` de hoy. La feature importa valores del índice de `entities/guide` (`parseRouteProgress`, `mergeRouteProgress` y `ROUTE_FORMAT_ERROR`): evaluarlo crea `routeStore`, y como la única fuente legacy que importa la feature es `app.js`, dueño de ese índice, ningún check lo duplica (FR-018). R4 no ve un import de la feature desde otra fuente legacy: si F2b o un port lo necesitara, va a la revisión. El `planImport` de una sección no lleva `?.`, como hoy: con el adaptador ausente lanza el mismo `TypeError`, y el aviso lo muestra.

| Hoy en `app.js` | Pasa a |
| --- | --- |
| `collectBackups` y la lectura de `backupsPanel` | `progressBackup.listBackups()` |
| `downloadBackup(key)` | `readBackup(key)`; si no hay, nada; `downloadBlob(new Blob([file.text], { type: 'application/json' }), file.fileName)` y el toast «Respaldo descargado.» |
| `exportProgress` | `exportProgress()`, la misma descarga y el toast «Copia de progreso exportada.» |
| El manejador de `#confirm-reset` | `async`: `const { notice } = await progressBackup.resetAll();`, después `save()`, el cierre del diálogo, `render()` y `toast(notice)` |
| El manejador de `#import-file` | `assertImportSize(file.size)`; `planImport(await file.text())`; `await applyImport(plan)`; `updateSaveLabel()`, `render()` y el toast del aviso; en el `catch`, `toast(importFailureNotice(error))`; al final, `event.target.value = ''` |
| `NON_ROUTE_KEYS`, `IMPORT_SECTIONS`, `NOTICE_AREAS`, `planRouteImport`, `planSectionImports`, `importNotice` y `syncDerivedSeals` | se borran; los imports de `ROUTE_FORMAT_ERROR`, `mergeRouteProgress`, `parseRouteProgress`, `isLosslessNormalization` e `isPlainObject` también |

**El orden de los efectos.** Al borrar: los cuatro `reset` en el orden de hoy, el de las simulaciones, el del temporizador y, después del `await`, `save()`, el cierre del diálogo, el redibujo y el aviso. Es el orden que fija `boot-check`. Al importar: las secciones, el recorrido, los sellos y, después del `await`, la etiqueta, el redibujo y el aviso. La etiqueta pasa a actualizarse después de los sellos; no depende de ellos (research-f2b.md, R5).

### Tarea 4.1 · Las specs de la feature, en rojo (T033, B)

- **Crea:** los tres archivos de §4.0, con `createProgressBackup`, `assertImportSize` e `importFailureNotice` lanzando `not implemented`, y `frontend/src/features/progress-backup/model/create-progress-backup.spec.ts`.
- **Áreas falsas:**
  - `route` es un objeto con un estado en memoria y `applyImport` y `reset` configurables;
  - cada sección registra sus llamadas y devuelve lo que fije el caso;
  - `guide` es la de `build/curriculum.json`, que la spec puede importar.
- **Qué prueban** (FR-049, FR-050, FR-052 y FR-053; los textos, escritos a mano):
  - **Exportar,** con `vi.useFakeTimers()` y `vi.setSystemTime('2026-03-04T05:06:07.000Z')`:
    - el texto parseado tiene las claves `version`, `language`, `completed`, `milestones`, `favorites`, `quizAnswers`, `notes`, `minutes`, `lab`, `campaign`, `systems` y `exportedAt`, en ese orden, y está indentado con dos espacios;
    - el nombre es `taller-progreso-2026-03-04.json`;
    - una sección cuyo `exportState` devuelve `undefined` no aparece.
  - **Respaldos:**
    - el orden de áreas es recorrido, laboratorio, campaña y Sistemas, con `{ area, key, text }`;
    - `readBackup` vuelve a leer, y si la ranura cambió después de listar, da el texto nuevo;
    - el nombre de `taller-laboratorio-v1:respaldo` es `taller-laboratorio-v1-respaldo.json`;
    - una clave desconocida da `undefined`.
  - **Planificar:**
    - un JSON roto lanza `SyntaxError`;
    - `null`, `[]`, `5` y una copia con `version: 2` lanzan «Formato de progreso no compatible.»;
    - una sección que lanza hace lanzar `planImport` sin llamar a ningún `applyImport`;
    - sólo se planifican las secciones presentes, en el orden campaña, laboratorio y Sistemas;
    - el recorrido se fusiona con el actual: los conjuntos se unen, el idioma y los minutos son los locales y una nota no vacía pisa la local mientras que una vacía no;
    - `lab`, `campaign`, `systems` y `exportedAt` no cuentan como pérdida del recorrido, y un paso desconocido sí.
  - **Aplicar:**
    - las secciones se aplican en el orden del plan y después el recorrido;
    - el aviso de éxito;
    - un laboratorio que devuelve `false` se nombra;
    - un recorrido que no guarda va primero, y la cola de omisiones se conserva («recorrido, campaña, Sistemas» con el laboratorio con pérdida);
    - el orden del aviso de omisiones;
    - los sellos se sincronizan después de aplicar, primero Sistemas y después campaña; si uno lanza, se registra (con un espía de `console.error`), el otro igual se llama y el aviso es el de éxito;
    - una sección que lanza al aplicar rechaza la promesa y el recorrido no se aplica.
  - **Borrar todo:**
    - el orden de los `reset` es recorrido, laboratorio, campaña y Sistemas, y después los `sessionResets`, en su orden;
    - el aviso de éxito;
    - cualquier `false` da «No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.»;
    - `undefined` no cuenta como fallo;
    - con `{ password: 'x' }` el resultado es el mismo.
  - **Áreas asíncronas:** con `applyImport` y `reset` devolviendo promesas, los mismos avisos y el mismo orden, también con un laboratorio que resuelve `false` y un `reset` que resuelve `false` (SC-010). Cada `reset` y cada `applyImport` empieza recién cuando el anterior resolvió: las áreas registran su inicio y su fin, y el registro es `route:start`, `route:end`, `lab:start`, `lab:end` y así (con `Promise.all` los inicios irían juntos).
  - **Las dos exportaciones congeladas** (`qa/fixtures/progress-master-2a278ad-export.json` y `progress-d0e1b49-export.json`), con secciones falsas que planifican `{ state: raw, lossy: false }`: el aviso es «Copia importada y combinada con tu avance actual.», sin omisiones, y el recorrido aplicado contiene los pasos completados de la exportación (FR-006).
  - **Los ayudantes:**
    - `assertImportSize(10 * 1024 * 1024)` no lanza, y con un byte más lanza el texto de hoy;
    - `importFailureNotice` de un `SyntaxError` da «No se pudo importar: el archivo no contiene JSON válido.», y de `new Error('x')`, «No se pudo importar: x».
- **Pasos:** las specs fallan con `not implemented`. Un commit: `test(front): specs de features/progress-backup (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 4.2 · La feature (T034, B)

- **Cambia:** `create-progress-backup.ts` (se implementa moviendo el código de `app.js` que lista §4.0), `types.ts` e `index.ts`. `app.js` no cambia todavía.
- **Pasos:** las specs de T033 pasan; `npm run typecheck` y `npm run lint`, sin avisos en la feature. Un commit: `refactor(front): exportar, importar, «Borrar todo» y los respaldos viven en features/progress-backup`.
- **Vuelta atrás:** revertí el commit; nadie la usa todavía.

### Tarea 4.3 · `app-shell-check` espera «Borrar todo» y prueba áreas asíncronas (T035, B)

- **Cambia:** `qa/app-shell-check.ts`. Los valores esperados no cambian.
- **Qué cambia:**
  1. El escenario «h) borrar todo: elimina el respaldo del recorrido y reinicia a los motores» pasa su callback a `async` y despacha el clic con `await` en lugar de `void`. Es el único escenario que afirma de forma síncrona después del clic (research-f2b.md, R5). Con el `app.js` de hoy pasa igual.
  2. `HarnessOptions` suma `asyncAdapters?: boolean`. Con la opción, el `applyImport` y el `reset` de los adaptadores falsos devuelven `Promise.resolve(<el valor de hoy>)`, y los demás métodos no cambian.
  3. Cuatro escenarios gemelos, en inglés:
     - «async areas: importing ends with the same notice and route»;
     - «async areas: a lab that resolves false is named as not saved»;
     - «async areas: resetting everything ends with the same notice and a blank route»;
     - «async areas: an engine that resolves { removed: false } gives the failure notice».

     Tienen los valores esperados de sus gemelos síncronos.
- **Pasos:** correr el check: con el `app.js` de hoy fallan el segundo y el cuarto gemelo, porque `app.js` no espera a los adaptadores; los otros 55 pasan. Un commit: `test(qa): app-shell-check espera «Borrar todo» y prueba áreas asíncronas (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 4.4 · `app.js` arma `progress-backup` y espera importar y «Borrar todo» (T036, B, desde S1)

- **Parte de:** S1. B rebasa su rama sobre `master` con la unidad 5.
- **Cambia:** `frontend/app.js`, sólo lo de §4.0.
- **Pasos:**
  1. El cableado y la tabla de §4.0.
  2. `node qa/app-shell-check.ts` (57), `node qa/boot-check.ts` (14: el orden de los reinicios y las dos importaciones congeladas) y `npm test`.
  3. La comparación de §0.3 (quickstart-f2b.md §3.4): 24 pares iguales.
  4. `npm run build`, el paso 3 de §0.2 y `E2E_PORT=4186 npm run test:e2e` (106).
  5. **Mutaciones descartadas:** escribir el `reset` de un motor sin `async` y `await` (`() => window.TallerCampaignEngine?.reset()?.removed`) hace fallar el cuarto gemelo; correr los `sessionResets` antes de los `reset` de las áreas hace fallar `boot-check` («borrar todo» exige `TallerSystems.resetSimulations` después de los motores).
  6. Un commit: `feat(front): importar y «Borrar todo» esperan a progress-backup, que devuelve promesas (Q4)`.
- **Compuerta:** los pasos 2 a 5; 35 avisos.
- **Vuelta atrás:** revertí el commit: el bloque vuelve a `app.js` y los manejadores vuelven a ser síncronos.
- **Verificado al planificar:** el prototipo dio `app-shell-check` 57 de 57, `boot-check` 14, `npm test`, 106 E2E y +1 369 caracteres en el HTML. La comparación de 24 pares no corrió.

### Tarea 4.5 · Compuerta y PR de la unidad 6 (T037, K)

La compuerta de §0.2 con la comparación, la correspondencia de §4.6, la documentación (§5) y el PR `refactor(front): move the progress backup into features/progress-backup with promises for D1c`, con T033 a T036. Cubre FR-001, FR-002, FR-005 a FR-009, FR-011, FR-013 a FR-015 y FR-048 a FR-053; SC-001 a SC-003, SC-009 a SC-012. La descripción del PR cuenta el defecto latente del `applyImport` de los motores, para F8 y D1c.

**Reversión de la unidad 6:** se revierten T036, T035, T034 y T033.

### 4.6 La correspondencia de `app-shell-check` (53)

Ningún escenario se retira: el check sigue cargando el `app.js` real con adaptadores falsos, ahora a través de la feature. 35 son del dominio del respaldo, y la spec de la feature fija su contrato. Los otros 18 no los toca F2b.

| Grupo | Escenarios | Contrato fijado también en `create-progress-backup.spec` |
| --- | --- | --- |
| a) exportar | 2: el Blob JSON con el recorrido en la raíz y las secciones; la descarga `taller-progreso-AAAA-MM-DD.json` y el aviso | exportar (el texto, el orden de claves y el nombre); la descarga y el aviso, sólo en el check |
| b) importar | 10: combina el recorrido y llama a cada adaptador; una nota no vacía pisa y una vacía no; se conservan los minutos y el idioma; planifica las tres y después aplica; sincroniza Sistemas y campaña y después dibuja; si la de Sistemas lanza, la de campaña igual se llama; el laboratorio que no guardó se nombra; el recorrido que no escribe va primero y conserva la cola; si `sync` lanza, se registra y la copia quedó importada; sin secciones no llama a ningún adaptador | planificar y aplicar (cada caso); el redibujo, sólo en el check |
| c) formato | 2: la versión 2 no aplica nada; una entrada que no es objeto da el error de formato | planificar |
| d) archivo | 2: JSON roto; más de 10 MB, rechazado antes de leer | los ayudantes y planificar; que no se lea el archivo, sólo en el check |
| e) atomicidad y omisiones | 6: el plan de Sistemas lanza y no se aplica nada; el `applyImport` de Sistemas lanza a mitad; un plan con pérdida avisa; un paso desconocido suma el recorrido primero; el orden del aviso; las claves de las secciones no cuentan como pérdida | planificar y aplicar |
| h) borrar todo | 6: elimina el respaldo y reinicia a los motores (el que cambia `void` por `await`); un motor con `{ removed: false }`; el laboratorio que devuelve `false`; el recorrido que no pudo borrar; un adaptador ausente no cuenta; sin acceso al almacenamiento avisa éxito | borrar todo; el `.removed` de los motores y la lectura en cada llamada, sólo en el check |
| respaldos | 5: el panel lista área y clave antes de «Tu progreso te pertenece»; sin ranuras no hay panel; el clic descarga el texto exacto y avisa; el clic vuelve a leer la ranura; la ranura del recorrido sale del almacenamiento | respaldos (orden, nombre y relectura); el panel, sólo en el check |
| seguridad y almacenamiento sin escritura | 2: una nota importada con HTML se escapa en `#metodo`; importar sin escritura funciona en memoria y pide exportar | aplicar (el recorrido que no guarda); el escape, sólo en el check |
| **Sin cambios por F2b** | 18: los 7 de f) (carga), los 2 de avisos, los 3 de almacén, accesibilidad, los 2 de g) hitos, shell y los 2 de `startApp` | — (son de F2a, F4 y F9) |
| **Nuevos** | 4 gemelos `asyncAdapters` | áreas asíncronas |

## 5. Cierre (coordinador K)

### Documentación que cambia con cada unidad

La integra K en el PR de la unidad; el dueño avisa el texto que hace falta. Ninguna regla de `AGENTS.md` cambia.

| Unidad | `docs/architecture.md` | `qa/AGENTS.md` |
| --- | --- | --- |
| 8 | las filas del mapa de `styles.css` (shell, clases base, `.sr-only`, `.lab-empty` y `touch-action`) y de `lab.css` (el banner y el bloque de contexto) | — |
| 5 | una fila para la gramática de URL (`shared/config/url-grammar.ts`) y otra para los puentes como datos (`bridge.ts` de campaña y de Sistemas); la regla: fuera de un slice, una fuente legacy o de `app/` importa su índice (si es su dueño) o su entrada sin estado; el «Estado actual» de Feature-Sliced Design | la fila del guard suma R6; la de «Contexto de campaña o Sistemas» nombra las specs de los puentes y de la gramática |
| 7 | la fila del laboratorio suma el mapa y los modelos de los exploradores (`entities/exercise/explorers.ts`); la de los exploradores de campaña también | la fila de los exploradores nombra sus specs; «Red de seguridad» suma la fixture congelada `explorer-kinds-<base>.json` |
| 6 | una fila para `features/progress-backup` (la interfaz con promesas de Q4, las áreas que arma `app.js` y lo que sigue en `app.js` hasta F8); el «Estado actual» | la fila «Recorrido, biblioteca o respaldo global» nombra la spec de la feature y la opción `asyncAdapters` de `app-shell-check` |

### Tarea 5.1 · El cierre (T038, K)

- **Pasos:**
  1. Con las cuatro unidades en `master`: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `E2E_PORT=4173 npm run test:e2e`, `git diff --check`, los bytes de §0.2 contra T020 (acumulados) y la medida final del HTML.
  2. La tabla de «Lo que F5 a F8, F10, A2 y D1c toman de F2b», con la evidencia de cada fila, en el mensaje del commit.
  3. Informar al coordinador lo que le toca: F2b a «Entregado» con los cuatro PR, los hallazgos de «Riesgos» que afectan a la hoja de ruta y a las specs de F6, F8 y D1, y las enmiendas a la spec de F2 (research-f2b.md). La hoja de ruta la edita el coordinador.
  4. Con permiso, `docker compose build taller` sobre `master`.
- **Compuerta:** el paso 1 en verde y la tabla completa.
- **Vuelta atrás:** no aplica: no cambia archivos de producción.

## Lo que F5 a F8, F10, A2 y D1c toman de F2b

| Ítem | Qué toma | De dónde |
| --- | --- | --- |
| F5 Sistemas | `readLinkQuery`, `workshopPartOr`, `withWorkshopQuery`, `workshopExerciseHref` y `workshopReturnHref`; `workshopMissionIds`, `workshopExerciseRole` y `workshopReturnTarget`; `.lab-empty` en `styles.css` | `shared/config/url-grammar`, `entities/systems-workshop/bridge` y la unidad 8 |
| F6 Campaña | `readLinkQuery`, `worldHref`, `campaignMissionHref`, `withWorldQuery` y `FREE_LAB_HREF`; `campaignMissionContext` y `campaignLinkAccess`; el banner y el bloque de contexto en `lab.css`, y el menú en `styles.css` | la gramática, `entities/campaign/bridge` y la unidad 8. **F6 tiene que mover `.quest-direct-lock`** a `lab.css` antes de borrar `campaign.css` (lo protege R10 de `css-contract`) |
| F7 Laboratorio | `readLinkQuery`, `exercisePhaseOr` y `withLabQuery`; los dos puentes, para componer en `pages/lab/model`; el mapa y los modelos de los exploradores | la gramática, las dos entradas `bridge` y `entities/exercise/explorers`. F7 retira `quest-explorers-check` cuando borra `quest-explorers.js`, con la correspondencia de §3.6 |
| F8 Método | `ProgressBackup` (exportar, listar y leer respaldos, planificar, aplicar y borrar todo), `assertImportSize` e `importFailureNotice` | `features/progress-backup`. La página usa la misma instancia que arma el shell; los pasos de sesión ya están registrados |
| F10 Shell y router | `VIEWS`, `viewFromHash`, `readLinkQuery`, `isLinkLanguage` y `withLanguageQuery`; `syncLinkedLanguage` sigue en `app.js` hasta el router | la gramática |
| A2 | nada nuevo: F2b no toca `main.tsx`, `boot/`, los catálogos ni `atlas-catalog.ts`, y `dump-dist-globals` da los mismos bytes | — |
| D1c | reimplementa `ProgressBackup` (el POST de importación y el reset con contraseña de su FR-074) sin tocar a quien llama; `planImport` recibe el texto crudo que D1 manda tal cual. Tiene que saber: el `applyImport` de los motores nunca devuelve `false` (R5); con la red, dos clics seguidos en «Borrar todo» o en importar pueden solaparse, cosa que en local no pasa (las esperas son microtareas que no cruzan un evento), así que su implementación o F8 tienen que impedirlo | `features/progress-backup` |

## Cobertura de requisitos

| Requisito | Tareas | Notas |
| --- | --- | --- |
| FR-001 | T021 a T037 | cada unidad: spec en rojo (la 8, la protección de F1), implementación mínima, documentación y compuerta en su PR; la reversión, en su sección |
| FR-002 | T020, T022, T027, T032, T037 | los 106 E2E sin editar, antes y después de cada unidad |
| FR-003, FR-004 | T020 y §0.2 | tres oráculos, el script o el estilo según la unidad, el marcado y las rutas intactas |
| FR-005, FR-006 | T033, T036, T037 | las dos exportaciones congeladas en la spec de la feature, en `boot-check` y en la comparación de la unidad 6 |
| FR-007, FR-008, FR-009 | §0.2 | los E2E, el grep de estilos en línea, el marcado idéntico y la forma y el tope del dist |
| FR-010 | §0.2, T038 | ninguna dependencia: `package.json` y el lockfile sin diff |
| FR-011 | T021, T026, T031, T036 | las cuatro comparaciones de §0.3 |
| FR-012 | T024, T029, T033 | specs de Vitest en el proyecto `node`, sin jsdom |
| FR-013 | T026, T031, T035, §2.6, §3.6, §4.6 | tres checks, sólo cómo esperan; la correspondencia escenario por escenario |
| FR-014 | T023 a T025, T029, T030, T033, T034 | capas y slices; las entradas sin estado y R6 |
| FR-015 | T033, T034 | la guía le llega a la feature por parámetro; R5 del guard sigue vigilando el JSON |
| FR-016 | §0.2, §3.0 | 35 avisos antes y después; la redistribución de la unidad 7 |
| FR-017 | T026, T031, T036 | ningún global nuevo ni método retirado: los `window.Taller*` delegan |
| FR-018 | T023, T024, T029 | las entradas sin estado, su spec de aislamiento y R6 |
| FR-043, FR-044 | T024 a T026 | la gramática y las dos familias; 2 569 URL iguales |
| FR-045, FR-046 | T024 a T026 | los datos de los puentes y el mismo marcado; 55 880 respuestas iguales |
| FR-047 | T024, T026, §2.6 | specs con ids del fixture; `lab-bridge-check` 21 de 21 |
| FR-048 a FR-053 | T033 a T036, §4.6 | la feature, sus dos fases, sus reglas, sus áreas, la interfaz asíncrona y sus specs |
| FR-054 a FR-057 | T028 a T031, §3.6 | los modelos, el mapa con la fixture, las misiones conservadas y las specs |
| FR-058 a FR-060 | T021, T022 | las 26 reglas, la cascada y la protección de F1 con el barrido |
| SC-001, SC-002, SC-011, SC-012 | §0.2 | por unidad |
| SC-003 | T033, T036, T037 | arrancar con las fixtures no escribe; las dos exportaciones, sin omisiones |
| SC-007 | T021, T022 | las nueve filas (26 reglas), `css-contract` y las comparaciones |
| SC-008 | T026, T031 | las 6 formas de URL y las 274 clasificaciones (los 274 programas y la lectura de las fixtures son de F2a) |
| SC-009 | §2.6, §3.6, §4.6 | tres de los nueve checks; los otros seis son de F2a |
| SC-010 | T033, T035, T036 | los dobles asíncronos en la spec y en `app-shell-check` |
| SC-013 | §0.1 | F2b parte de F2a integrada |
| SC-004, SC-005 y SC-006 | — | son de F2a |

Historias: US1 en T020, las compuertas y T038; US4 (escenarios 1 y 2) en T023 a T027; US5 en T033 a T037; US6 en T028 a T032; US7 en T021 y T022. US2, US3 y el escenario 3 de US4 son de F2a.

## Descargas y permisos

Ninguna. F2b no suma dependencias, y `postcss` (para la comparación del CSS) y el navegador de Playwright (para el barrido) ya están en la máquina. Si un comando intenta descargar algo, se pide permiso. Docker lo corre sólo K, con permiso, y sólo para construir la imagen web.

## Riesgos y lo que quedó sin verificar

1. **F2a no está en `master`.** Sus PR #27, #32 y #33 seguían abiertos. La línea base se tomó sobre `c5d497d`; T020 la vuelve a medir sobre la base real.
2. **La comparación de la unidad 6 no corrió,** y tampoco las specs nuevas (salvo la de aislamiento) ni R6. El diseño de la feature corrió entero contra `app-shell-check` y `boot-check`, pero la igualdad del almacenamiento con los adaptadores reales y las fixtures es de T036.
3. **El barrido no ve el `:hover`, el `:focus` ni las animaciones.** Ninguna de las 26 reglas tiene un estado así. Además, la red de F1 mide `css-contract` a 981, 850, 650 y 590 px.
4. **`lightningcss` podría juntar reglas distinto en otra versión.** El multiconjunto separa cada selector para no depender de eso, y el barrido mide el resultado. Si una actualización de Vite cambia el minificado en el medio, la línea base se vuelve a tomar.
5. **`app.js` lo tocan U, B, F3, F4 y F9.** Se integran de a uno, en el orden de las ondas; el que llega después rebasa.
6. **«Borrar todo» asíncrono:** en local nada cambia para el alumno (las esperas son microtareas). Con D1c, la red abre la ventana de un doble clic; es de D1c y de F8.
7. **El defecto latente del `applyImport` de los motores** se conserva a propósito (R5). Si el usuario lo quiere corregido, es un cambio de comportamiento con su propio commit TDD y su ítem.
8. **El orden de la etiqueta de guardado** pasa a después de los sellos. Se razonó que no se ve (R5), y lo cubre `app-shell-check`; si un revisor lo prefiere idéntico, se agrega un método aparte para los sellos, con el costo de R5.
9. **La imagen web y la CI no corrieron.** La imagen la construye K con permiso, y la CI corre al abrir cada PR.
10. **La spec de F2 tiene cuentas viejas:** `app-shell-check` tiene 53 escenarios, no 51; Q1 dice que seis ejercicios «entran por visual», y es así, pero dos de ellos (go-64 y go-65) también entran por el título. Lo informa T038 como enmienda; el plan usa lo medido.

## Complexity Tracking

Ninguna de las dos decisiones contradice la constitución ni `AGENTS.md`; se registran porque un revisor las preguntaría. El usuario aceptó la segunda API pública el 2026-10-06, y confirmó que ningún check se retira.

| Decisión | Por qué hace falta | Alternativa más simple que se descartó y por qué |
| --- | --- | --- |
| Una segunda API pública, sin estado, en tres slices (`bridge.ts` y `explorers.ts`), contra «un índice por slice» de Feature-Sliced Design | Los checks empaquetan cada fuente legacy por separado, y evaluar el índice de esos slices crea su singleton: una vista legacy que lo importara duplicaría el motor o el almacén en el contexto del check (FR-018, R4). Las funciones puras tienen que poder importarse sin esa evaluación. Se mide: 629 caracteres y 0 rastros del motor contra 28 668 con el índice (research-f2b.md, R2) | Un import profundo desde la vista legacy: rompe la API pública del slice y deja abierto que se importe el módulo del motor. Sacar el singleton del índice: reabre la unidad 1 de F2a. Métodos nuevos en los motores: cambian sus interfaces y no cubren los exploradores |
| R6 en el guard | Sin R6, el hueco que R4 deja (sólo mira el índice) permite justo la segunda instancia que FR-018 prohíbe, por un import profundo | Confiar en la revisión: es la clase de error que nadie ve hasta que dos instancias divergen |
