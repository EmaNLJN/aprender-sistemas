# Implementation Plan: E1 · La sesión Esenciales

**Branch**: `026-e1-esenciales` (nombre de la feature; la implementación va en la rama de integración `e1/base`) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de E1 con su clarify del 2026-10-28 (Q1 a Q5, opción A), `research.md`, `data-model.md` y `contracts/essentials.md` de esta carpeta, y los hallazgos E1 y «Transversal» de `.coordinador/hallazgos-para-planes.md`.

## Summary

**Objetivo:** sumar Esenciales al taller como el catálogo `essentials`, primero de la cadena, con su primera etapa real de cinco ejercicios por lenguaje, sin cambiar un byte de las 17 porciones ni de los 274 ejercicios de hoy.

**Arquitectura:**
- **El contenido y el generador.** El contenido vive en una sección nueva al final de cada manifiesto. El generador numera sus etapas desde la 50, le fija el nivel `essentials` y lo publica como dos porciones más.
- **La API.** Sirve esas porciones con las reglas de C2, la sesión pone el catálogo primero, y la base sólo amplía `exercises.level`.
- **El front.** Lee las porciones como obligatorias y pone Esenciales primero en el catálogo de ejercicios. La página del laboratorio de F7b suma el nivel, el número de las tarjetas y la regla de «Un desafío para hoy».

**Stack:**
- TypeScript 6 en Node 24 (`tools/content`, `qa/`) y React 19.2.8 con Vite (el front);
- Laravel 13.34 y PHP 8.5 sobre MySQL 9.7 (la API);
- Vitest 5.0.3 con Testing Library 16.3.3, Playwright 1.63.0 y Pest 5.3.0.

## Technical Context

**Language/Version**: TypeScript 6.0.2 (Node 24.21); PHP 8.5 con Laravel 13.34.0.
**Primary Dependencies**: las de hoy. E1 no suma ninguna (ver «Descargas y permisos»).
**Storage**: MySQL 9.7: una columna ampliada (`exercises.level`), sin tablas nuevas. El navegador sigue con el progreso v1 en `localStorage` y, si A3 entró, con la copia del contenido en IndexedDB.
**Testing**:
- `npm test`: los checks de `qa/` y Vitest en los proyectos `node` y `dom` (TR-6);
- `npm run test:e2e`, con la red de F1, A2 y F7a;
- `npm run api:test`, `api:analyse` y `api:format:check`;
- `npm run api:content:check`;
- la auditoría de B3.

**Target Platform**: el stack de Docker de `docker/compose.yaml` y el `dist/` servido por Nginx.
**Project Type**: aplicación web, con el front en `frontend/` y la API en `backend/api/`.
**Performance Goals**: sin objetivo nuevo. SC-009 mide el tamaño de las porciones y del documento.
**Constraints**: ver «Restricciones globales».
**Scale/Scope**:
- 10 ejercicios nuevos, 2 temas, 1 catálogo y 2 porciones;
- unos 25 archivos de código y pruebas;
- 19 tareas en cuatro ondas.

### Restricciones globales

- **Nada de lo existente cambia** (FR-009, SC-001):
  - las 17 porciones de hoy conservan sus bytes y sus huellas;
  - los 274 ejercicios conservan su `stage`, su `content_hash`, su `grading_hash` y su `starter_hash`;
  - `qa/fixtures/curriculum-ids.json` sólo crece;
  - `qa/fixtures/workshop-steps-v1.json` no cambia.

  Lo comprueba `qa/content-baseline-check.ts` contra `qa/fixtures/content-baseline-e1.json`, que escribe T001 y nunca se regenera. En `npm test` corre la parte permanente (los 274 siguen y conservan su etapa); la comparación completa (`--full`) es la compuerta de E1, en T016 y T019 (FR-039).
- **Los valores fijos:**
  - el código `essentials`, para el catálogo y para el nivel;
  - la etiqueta «Esenciales» y el subtítulo «Tus primeros pasos»;
  - la posición 1 en la cadena;
  - los IDs `rust-138` a `rust-142` y `go-138` a `go-142`, con la etapa 50.
- **El orden de las porciones:** las 17 de hoy, `essentials.rust`, `essentials.go` y `harness` (`ContentMeta` exige ese orden).
- **La red E2E:** pasa sin editarse, salvo dos cambios.
  - `qa/e2e/specs/views.spec.ts:82` y `reload.spec.ts:152` pasan de `rust-01` a `rust-138`, en un commit propio y en rojo primero. El usuario lo aprobó en el clarify (Q3).
  - Las aserciones de conteo de `lab-map.spec.ts` de F7a cambian por FR-036.
  - Las 17 de A2 (`content-gate.spec.ts`) no se editan.
- **Ningún global de catálogo nuevo** (hallazgo E1-7). `getContent()` se lee sólo en `app/` (regla R5 de `seams-guard`).
- **El Atlas, la campaña, Sistemas, la Biblioteca y el Recorrido no cambian:** sus specs y sus E2E no se editan (FR-033 y SC-006).
- **El tope del HTML:** `BOOT_SIZE_LIMIT` de `qa/build-check.ts`, 1 500 000 en `master` (TR-8). E1 suma unos cientos de caracteres de código; el contenido viaja aparte.
- **Los esperados de las pruebas:** salen de la base de T001 más los deltas de `data-model.md` §3, nunca de un número copiado de este plan (TR-15).
- **Los stubs del rojo:** van como `const` tipados (TR-2).
- **Los comentarios:** el código no lleva comentarios, salvo una referencia puntual (`AGENTS.md`). Cada tarea se lo dice al implementador.
- **El contenido:** lo redacta un agente y lo aprueba el usuario (Q5). Este plan no trae texto pedagógico, sólo las reglas y las compuertas. Todo PR que toque `content/rust`, `content/go` o `tools/content/exercises.ts` lleva el resumen de B3 (hallazgo E1-3).

## Constitution Check

| Principio | Cómo lo cumple | Estado |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Las reglas de ESM, de `interface` y `type`, de FSD y de los subagentes salen de `AGENTS.md`; el plan no las reescribe | Cumple |
| II. TDD y pruebas útiles | Cada tarea de código abre con su prueba en rojo. Los esperados salen del contrato, de la base de T001 o de un ejemplo armado a mano, nunca del algoritmo. Las dos E2E de F1 se editan en rojo antes del cambio | Cumple |
| III. Código entendible | Dos selectores chicos (`topicNumber` y la regla de `todayChallenge`), una lista de niveles aparte y un brazo más en dos `match`. Sin capas nuevas | Cumple |
| IV. Contenido en Git, IDs estables | IDs nuevos correlativos, nunca reutilizados; la línea base congelada; el contenido se edita en `content/`; se vuelve atrás retirando el catálogo | Cumple |
| V. Capas y contratos | El contrato en `contracts/essentials.md`; `getContent()` sólo en `app/`; sin globales; `pages/lab` usa la API pública de `entities/exercise` | Cumple |
| VI. Español, accesibilidad, portabilidad | Los textos nuevos van en castellano. La pestaña nueva es un botón más del grupo, con `aria-pressed` | Cumple |
| VII. Secretos y salidas fuera de Git | `build/` sigue fuera de Git; el fixture de la base es un contrato, no una salida | Cumple |
| VIII. Flow-forward | E1 no edita specs entregadas: actualiza en su PR las pruebas que cuentan. E2 es un ítem nuevo | Cumple |

## Project Structure

### Documentation (this feature)

```text
specs/026-e1-esenciales/
├── spec.md                  # con el clarify del 2026-10-28
├── plan.md                  # este archivo
├── research.md              # R1 a R12, Context7 y mediciones
├── data-model.md            # la columna, la fila, las filas piloto, el documento y la base congelada
├── quickstart.md            # cómo se verifica la entrega
├── contracts/essentials.md  # la sección, las porciones, la sesión y las interfaces del front
├── checklists/requirements.md
└── tasks.md                 # T001 a T019
```

### Source Code (repository root)

```text
tools/content/
├── catalogs.ts                      (G) CATALOGS con essentials; Catalog; orden de claves de essentials
├── exercises.ts                     (G) la sección, el nivel derivado y expectEssentials
├── load-curriculum.ts               (G) Curriculum.essentials y la sección obligatoria
└── meta.ts                          (G) las dos porciones y las huellas de los ejercicios nuevos
frontend/src/
├── shared/config/levels.ts          (G) ESSENTIALS_LEVEL, EXERCISE_LEVEL_IDS y EXERCISE_LEVEL_LABELS
├── shared/api/content/portions.ts   (F) PORTION_NAMES con las dos porciones
├── shared/api/content/portion-resources.ts, content-copy.ts   (F, sólo si A3 entró)
├── app/content/content.ts, assemble-content.ts                (F) Content.essentials
├── app/legacy/lab-api.ts            (F) init con los grupos de Esenciales (o la raíz de F10)
├── entities/exercise/model/types.ts, selectors.ts, exercise-catalog.ts   (F)
├── pages/lab/model/map-selectors.ts (F) LevelFilter, todayChallenge y topicNumber
├── pages/lab/ui/map/LevelTabs.tsx, TopicGrid.tsx              (F)
├── pages/lab/ui/exercise/ExerciseView.tsx                     (F) la etiqueta del nivel
└── index.html                       (F, sólo si F10 no entró) el 274 del menú
content/{rust,go}/manifest.yaml, content/{rust,go}/exercises/{lenguaje}-138…142/   (C)
backend/api/
├── app/Content/Portion.php, ContentReader.php, PortionAssembler.php   (A)
├── app/Audit/AuditCatalogReader.php (A, sólo si B3 entró)
├── database/migrations/<fecha>_100001_add_essentials_to_exercises_level.php   (A)
└── tests/                           (A) PortionTest, SessionEndpointTest, EssentialsContentTest, EssentialsLevelTest y los conteos
qa/
├── fixtures/content-baseline-e1.json (K, T001) la base congelada
├── content-baseline-check.ts        (G) nuevo
├── content-exercises-check.ts, curriculum-meta-check.ts   (G)
├── lib/content-document.ts, content-check.ts, curriculum-ids-check.ts, fixtures/curriculum-ids.json   (Q)
├── systems-check.ts, campaign-content-check.ts, project-kit-check.ts, api-sync-check.ts, api-import-check.ts   (Q)
├── dist-content-check.ts            (F)
├── run-checks.ts                    (K) suma content-baseline-check
└── e2e/specs/views.spec.ts, reload.spec.ts, lab-essentials.spec.ts, lab-map.spec.ts   (E)
README.md, backend/api/AGENTS.md, docs/adr/0009-esenciales-ids-y-etapas.md   (K)
```

**Structure Decision:** ningún slice nuevo. El nivel vive en `shared/config` junto a los de hoy; las reglas del mapa, en `pages/lab/model`, donde F7a las dejó; el catálogo, en `entities/exercise`.

## Review Focus

Lo que el revisor mira primero:
- `git diff <base> -- qa/fixtures/content-baseline-e1.json` está vacío después de T001;
- `git diff <base> -- qa/e2e` toca sólo las dos líneas de F1, `lab-map.spec.ts` y el archivo nuevo;
- ningún `window.` nuevo;
- `LEVEL_IDS` sin cambios;
- el orden de `Portion::cases()`.

**Lo que la spec implica y ninguna prueba de hoy ejercita**, cada caso con la tarea que suma su prueba:

1. **Un `level: essentials` en `lab`** pasaría sin la lista de cuatro, y un nivel en una etapa de Esenciales lo pisaría el derivado sin avisar (FR-004 y FR-012). Lo fijan dos casos de `content-exercises-check.ts` (T002): `essentials` en `lab` falla con «se esperaba uno de: beginner, medium, advanced, expert», y `level` en una etapa de Esenciales falla con «clave desconocida».
2. **Un alumno con progreso fuera de Esenciales que ya resolvió `rust-01`** recibiría como sugerencia `rust-138` (FR-028). Lo fija `map-selectors.spec.ts` (T010): «the suggestion leaves Essentials out for whoever solved something else». El esperado es el ejercicio que sugería antes de E1, armado a mano.
3. **`workshops.level` aceptando `essentials`** después de la migración (FR-012). Lo fija `EssentialsLevelTest` (T006): actualizar un taller a `essentials` falla con el error 1265 de MySQL.
4. **El catálogo nuevo en el informe de B3, ordenado por accidente** (hallazgo E1-1). Lo fija el caso nuevo de `AuditCatalogReaderTest` (T008): `rust-138` va antes de `rust-01`, porque el orden lo nombra.
5. **Una copia de A3 de antes de E1** se usaría con 17 porciones si `COPY_FORMAT` no sube (FR-024). Si A3 entró, lo fija `content-copy.spec.ts` (T010): una copia con `format: 1` no es usable.

## Reparto en paralelo

**Dueños.** G, C, A, Q, F y E son slices para el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»): se les dan sus archivos, el código de este plan y sus checks, y se les dice que no dejen comentarios. C es el agente que redacta el contenido. U es el usuario. K, el coordinador, es el agente principal: hace la base, integra, corre las compuertas, escribe la documentación y revisa cada diff.

| Onda | Quién | Qué | Compuerta al cerrar |
| --- | --- | --- | --- |
| 0 | K | T001: precondiciones, rama `e1/base` y base congelada | `npm test` verde en la base |
| 1 | G y después C; U en paralelo desde T004 | T002 y T003 (el generador); T004 (la etapa piloto); T005 (la revisión, compuerta antes del PR) | Parcial: los checks de G con fixtures. Después de T004, `npm run curriculum`, `content-baseline-check` y `curriculum-meta-check`. El resto de `npm test` queda en rojo a propósito hasta S2, como en B2 (sus T005 a T009): `e1/base` no va sola a `master` |
| 2 | A, Q, F y E a la vez (S1 = T004 integrada) | A: T006 a T008. Q: T009. F: T010 a T013. E: T014 y T015 | Cada tarea, sus checks |
| S2 | K | T016: integración y compuerta completa | Todo verde (quickstart, §1 a §4) |
| 3 | K y U | T017 (B3), T018 (documentación y ADR) y T019 (cierre y PR, después de T005) | Final |

**Archivos e interfaces por dueño:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| K | `qa/fixtures/content-baseline-e1.json`, `qa/run-checks.ts`, `README.md`, `backend/api/AGENTS.md`, `docs/adr/0009-*.md` y `specs/**` | todo | la base, las compuertas, la documentación y el PR |
| G | `tools/content/**`, `frontend/src/shared/config/levels.ts`, `qa/content-baseline-check.ts`, `qa/content-exercises-check.ts` y `qa/curriculum-meta-check.ts` | la base de T001 | `loadLanguage(...).essentials`, `expectEssentials`, `Curriculum.essentials`, `ESSENTIALS_LEVEL` y `EXERCISE_LEVEL_IDS` |
| C | `content/rust/manifest.yaml`, `content/go/manifest.yaml` y `content/{rust,go}/exercises/{lenguaje}-138…142/` | el generador de T003 | la etapa piloto |
| A | `backend/api/app/**`, `backend/api/database/migrations/**` y `backend/api/tests/**` | el `build/` con la etapa piloto | las porciones, la sesión y la migración |
| Q | `qa/lib/content-document.ts`, `qa/content-check.ts`, `qa/curriculum-ids-check.ts`, `qa/fixtures/curriculum-ids.json`, `qa/systems-check.ts`, `qa/campaign-content-check.ts`, `qa/project-kit-check.ts`, `qa/api-sync-check.ts` y `qa/api-import-check.ts` | el `build/` con la etapa piloto | los contratos de conteo |
| F | `frontend/src/**` (salvo `levels.ts`), `frontend/src/index.html`, `qa/dist-content-check.ts` y, si A3 entró, `qa/lib/content-server.ts` y `qa/e2e/lib/content-portions.ts` | G y el `build/` con la etapa piloto | el front |
| E | `qa/e2e/specs/views.spec.ts`, `reload.spec.ts`, `lab-essentials.spec.ts` y `lab-map.spec.ts` | el build de F | la red E2E |

**Puertos de los E2E:** K usa `E2E_PORT=4173` y E usa `4286`.

## Reglas para todos los agentes

- **Rama y worktree.** Cada dueño trabaja en su worktree, sobre `e1/base` en el estado de su onda. Sin rebase de `e1/base`; K integra.
- **TDD.** La prueba primero: correla y ver el fallo esperado; la implementación mínima; correla en verde; los checks de la tarea; el commit.
- **Commits.** En inglés para el código (Angular: `feat(content):`, `test(api):`…), con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sin comentarios en el código.
- **Docker.** Cada comando lleva `COMPOSE_PROJECT_NAME=e1-<dueño>` en la misma línea (`backend/api/AGENTS.md`).
- **Sin descargas.** Si un comando pide bajar algo, se para y avisa a K.

---

## 0. Onda 0 · La base (K)

### Tarea 0.1 · Precondiciones, rama y base congelada (T001)

**Archivos:** `qa/fixtures/content-baseline-e1.json` (nuevo) y `specs/026-e1-esenciales/tasks.md` (la evidencia).

1. **Las precondiciones,** sobre `master`. Si una falla, se para y se avisa al coordinador:

   ```sh
   test -f frontend/src/pages/lab/ui/map/TopicGrid.tsx && test ! -f frontend/lab.js && echo "F7b: ok"
   test -f frontend/src/pages/lab/model/map-selectors.ts && echo "F7a: ok"
   test -f backend/api/app/Audit/AuditCatalogReader.php && echo "B3: ok"
   ```

   F7b es precondición (FR-035). B3 también: T008 y T017 la necesitan.
2. **Las variantes,** que se anotan en `tasks.md`, en la línea de T001:
   - **A3:** está si existe `frontend/src/shared/api/content/portion-resources.ts`. Define la variante de T011.
   - **F10:** está si `frontend/src/app/legacy/register-catalogs.ts` no existe y `git grep -n "RUST_LAB" frontend/src` da 0. Define la variante de T013 y si `index.html` todavía tiene el 274.
3. **La rama:** `git switch -c e1/base master`.
4. **La base,** con el contenido de `master`:

   ```sh
   npm ci && npm run curriculum
   node --input-type=module -e '
   import { readFileSync, writeFileSync } from "node:fs";
   const doc = JSON.parse(readFileSync("build/curriculum.json", "utf8"));
   const meta = JSON.parse(readFileSync("build/curriculum.meta.json", "utf8"));
   const portions = Object.fromEntries(Object.entries(meta.portions).filter(([name]) => name !== "harness"));
   const lists = [...Object.values(doc.lab), ...Object.values(doc.quests), ...Object.values(doc.cores)].flat();
   const exercises = Object.fromEntries(lists.map((e) => [e.id, { stage: e.stage, ...meta.exercises[e.id] }]));
   if (Object.keys(portions).length !== 17 || Object.keys(exercises).length !== 274) throw new Error("base inesperada");
   writeFileSync("qa/fixtures/content-baseline-e1.json", JSON.stringify({ portions, exercises }, null, 2) + "\n");
   '
   npx prettier --write qa/fixtures/content-baseline-e1.json
   ```

5. **Los conteos de la base** (TR-15), en `tasks.md`:
   - la última línea de `npm test` y de `npm run test:unit`;
   - la cantidad de E2E (`npx playwright test --list | tail -1`);
   - `html.length` de `dist/index.html` después de `npm run build`.
6. **La compuerta:** `npm test` en verde.
7. **El commit:** `test(qa): freeze the content baseline before Essentials`.

---

## 1. Onda 1 · El generador y la etapa piloto (G, C y U)

### Tarea 1.1 · Las pruebas del generador, en rojo (T002, G)

**Archivos:** `qa/content-exercises-check.ts`, `qa/curriculum-meta-check.ts` y `qa/content-baseline-check.ts` (nuevo).

**Consume:** `loadLanguage`, `expectDistinctIds` y, nueva, `expectEssentials` de `tools/content/exercises.ts`. Como todavía no existe, el rojo es la falta del export: se agrega como stub (TR-2) en el mismo commit:

```ts
export const expectEssentials: (exercises: LanguageExercises, language: Language) => void = () => {
  throw new Error('not implemented');
};
```

1. **En `qa/content-exercises-check.ts`, los ayudantes,** después de `rustLab`:

   ```ts
   function essentialsStage(topicId: string, ids: string[], extra = ''): string {
     return `  - topicId: ${topicId}
       topic: Tema ${topicId}
       minutes: 6
   ${extra}    exercises:
   ${ids.map((id) => `      - ${id}`).join('\n')}
   `;
   }

   function rustWithEssentials(
     essentialsYaml = EXERCISE,
     stageExtra = '',
     extra: Record<string, string> = {},
   ): string {
     return fixture({
       'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01'])}essentials:\n${essentialsStage('rust-e', ['rust-138', 'rust-139'], stageExtra)}`,
       ...exerciseFiles('rust', 'rust-01'),
       ...exerciseFiles('rust', 'rust-138', essentialsYaml),
       ...exerciseFiles('rust', 'rust-139'),
       ...extra,
     });
   }
   ```

   La sangría de las plantillas es la del YAML: `essentialsStage` produce las mismas columnas que `labStage`.
2. **Los casos,** antes de `done()`:

   ```ts
   test('essentials: after the last section, with the stage that follows and its level fixed', () => {
     const { lab, essentials } = loadLanguage(rustWithEssentials(), 'rust');
     assert.deepEqual(
       lab.map(({ id, stage }) => ({ id, stage })),
       [{ id: 'rust-01', stage: 1 }],
     );
     assert.deepEqual(
       essentials.map(({ id, stage, level }) => ({ id, stage, level })),
       [
         { id: 'rust-138', stage: 2, level: 'essentials' },
         { id: 'rust-139', stage: 2, level: 'essentials' },
       ],
     );
     assert.deepEqual(Object.keys(essentials[0]), [
       'id',
       'language',
       'topicId',
       'topic',
       'stage',
       'kind',
       'minutes',
       'imports',
       'visual',
       'sources',
       'level',
       'title',
       'intro',
       'why',
       'objective',
       'instructions',
       'starter',
       'solution',
       'tests',
       'hints',
       'review',
       'transfer',
       'prediction',
     ]);
   });

   test('essentials: the level does not go in exercise.yaml', () => {
     throwsContent(
       () => loadLanguage(rustWithEssentials(`level: beginner\n${EXERCISE}`), 'rust'),
       'content/rust/exercises/rust-138/exercise.yaml: level: no va en exercise.yaml: lo fija la sección essentials',
     );
   });

   test('essentials: a stage of the section does not declare a level', () => {
     throwsContent(
       () => loadLanguage(rustWithEssentials(EXERCISE, '    level: medium\n'), 'rust'),
       'content/rust/manifest.yaml: essentials[0].level: clave desconocida',
     );
   });

   test('essentials: the level is not accepted outside its section', () => {
     const root = fixture({
       'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01'])}`,
       ...exerciseFiles('rust', 'rust-01', `level: essentials\n${EXERCISE}`),
     });
     throwsContent(
       () => loadLanguage(root, 'rust'),
       'content/rust/exercises/rust-01/exercise.yaml: level: se esperaba uno de: beginner, medium, advanced, expert',
     );
   });

   test('essentials: each language needs at least one exercise of the section', () => {
     expectEssentials(loadLanguage(rustWithEssentials(), 'rust'), 'rust');
     throwsContent(
       () => expectEssentials(loadLanguage(rustLab(), 'rust'), 'rust'),
       'content/rust/manifest.yaml: falta la sección essentials: Esenciales necesita al menos una etapa en cada lenguaje',
     );
   });

   test('essentials: an ID of the section cannot repeat one of the other language', () => {
     const rust = loadLanguage(rustWithEssentials(), 'rust');
     const go = loadLanguage(
       fixture({
         'content/go/manifest.yaml': `${DEFAULTS}lab:\n${labStage('go-a', ['go-01'])}essentials:\n${essentialsStage('go-e', ['rust-138'])}`,
         ...exerciseFiles('go', 'go-01'),
         ...exerciseFiles('go', 'rust-138'),
       }),
       'go',
     );
     throwsContent(
       () => expectDistinctIds(rust, go),
       'content/go/manifest.yaml: el ID rust-138 también está en content/rust/',
     );
   });
   ```

   El esperado de la etapa (2) sale del manifiesto armado: una etapa en `lab` y la de Esenciales después. El de `level` es el código del contrato.
3. **En `qa/curriculum-meta-check.ts`:**
   - `Curriculum` suma `essentials: Record<string, Part>;`;
   - la lista `parts` suma, después de `['guide', curriculum.guide]`:

     ```ts
     ...languages.map((l): [string, unknown] => [`essentials.${l}`, curriculum.essentials[l]]),
     ```

   - `assert.equal(parts.length, 17)` pasa a `19`, y el mensaje, a `'the 19 portions and then the harness, in order'`;
   - `exercises` suma `...languages.flatMap((l) => curriculum.essentials[l]),`;
   - un caso nuevo, después del bloque de `exercises`:

     ```ts
     assert.deepEqual(
       meta.catalogs,
       [
         { code: 'essentials', sliceBy: 'language', chainPosition: 1 },
         { code: 'lab', sliceBy: 'language', chainPosition: null },
         { code: 'quests', sliceBy: 'language', chainPosition: null },
         { code: 'cores', sliceBy: 'domain', chainPosition: null },
       ],
       'Esenciales is the only catalog in the chain, first (ADR 0006 D13)',
     );
     ```

   Este archivo lee el `build/` real: queda en rojo hasta T004.
4. **`qa/content-baseline-check.ts`,** entero (FR-039). Es una guarda en dos niveles: siempre comprueba que los 274 siguen con su etapa, y con `--full` compara además los bytes de las 17 porciones y las tres huellas de los 274. Pasa en la base en los dos niveles:

   ```ts
   import assert from 'node:assert/strict';
   import { readFileSync } from 'node:fs';
   import { join } from 'node:path';
   import { curriculumMeta, curriculumDocument } from './lib/content-document.ts';

   interface Baseline {
     portions: Record<string, string>;
     exercises: Record<
       string,
       { stage: number; contentHash: string; gradingHash: string; starterHash: string }
     >;
   }
   interface PublishedExercise {
     id: string;
     stage: number;
   }
   interface ExerciseMeta {
     exercises: Record<string, { contentHash: string; gradingHash: string; starterHash: string }>;
   }

   const baseline = JSON.parse(
     readFileSync(join(import.meta.dirname, 'fixtures', 'content-baseline-e1.json'), 'utf8'),
   ) as Baseline;
   const meta = curriculumMeta() as ReturnType<typeof curriculumMeta> & ExerciseMeta;
   const document = curriculumDocument<Record<string, Record<string, PublishedExercise[]>>>();
   const stages = new Map(
     ['lab', 'quests', 'cores']
       .flatMap((catalog) => Object.values(document[catalog]).flat())
       .map((exercise) => [exercise.id, exercise.stage]),
   );

   const full = process.argv.includes('--full');

   for (const [id, frozen] of Object.entries(baseline.exercises)) {
     assert.equal(stages.get(id), frozen.stage, `${id}: missing or its stage changed (ADR 0006 D13)`);
     if (full) {
       const hashes = {
         contentHash: frozen.contentHash,
         gradingHash: frozen.gradingHash,
         starterHash: frozen.starterHash,
       };
       assert.deepEqual(meta.exercises[id], hashes, `${id}: fingerprints changed (SC-001)`);
     }
   }
   if (full) {
     for (const [name, hash] of Object.entries(baseline.portions)) {
       assert.equal(meta.portions[name], hash, `portion ${name} changed (SC-001)`);
     }
   }
   console.log(
     full
       ? `${Object.keys(baseline.portions).length} portions and ${Object.keys(baseline.exercises).length} exercises equal the frozen baseline PASS.`
       : `${Object.keys(baseline.exercises).length} exercises keep their stage PASS (run with --full for SC-001).`,
   );
   ```

5. **Correr y ver los fallos esperados:**
   - `node qa/content-exercises-check.ts` falla en los casos nuevos (sin `essentials` en el resultado; `expectEssentials` lanza `not implemented`);
   - `node qa/content-baseline-check.ts` y `node qa/content-baseline-check.ts --full` pasan en la base: lo que prueban es que T003 y T004 no rompen nada.
6. **El commit:** `test(content): red specs for the Essentials section and the frozen baseline`.

### Tarea 1.2 · El generador (T003, G)

**Archivos:** `tools/content/catalogs.ts`, `exercises.ts`, `load-curriculum.ts` y `meta.ts`, y `frontend/src/shared/config/levels.ts`.

**Produce:** las interfaces de `contracts/essentials.md` §1 y §3 (la parte de `levels.ts`).

1. **`frontend/src/shared/config/levels.ts`,** al final (`contracts/essentials.md` §3):

   ```ts
   export const ESSENTIALS_LEVEL = 'essentials' as const;

   export const EXERCISE_LEVEL_IDS = [ESSENTIALS_LEVEL, ...LEVEL_IDS] as const;

   export type ExerciseLevelId = (typeof EXERCISE_LEVEL_IDS)[number];

   export const EXERCISE_LEVEL_LABELS: Record<ExerciseLevelId, string> = {
     essentials: 'Esenciales',
     ...LEVEL_LABELS,
   };
   ```

2. **`tools/content/catalogs.ts`:**
   - `CATALOGS` empieza con `{ code: 'essentials', sliceBy: 'language', chainPosition: 1 },` y el comentario de FR-032 se borra;
   - `export type Catalog = 'lab' | 'quests' | 'essentials' | SystemsDomain;`;
   - `EXERCISE_KEY_ORDER` suma `essentials`, una copia de la lista de `lab` (el mismo orden, con `level`);
   - `OPTIONAL_EXERCISE_KEYS` suma `essentials: [],`.
3. **`tools/content/exercises.ts`:**
   - el import suma `ESSENTIALS_LEVEL` desde `levels.ts`;
   - `LanguageExercises` suma `essentials: JsonRecord[];`;
   - después de `QUEST_DERIVED_KEYS`:

     ```ts
     const ESSENTIALS_DERIVED_KEYS: Record<string, string> = {
       level: 'lo fija la sección essentials',
     };
     const ESSENTIALS_STAGE_SPEC: Record<string, Check> = Object.fromEntries(
       Object.entries(STAGE_SPEC).filter(([key]) => key !== 'level'),
     );
     const ESSENTIALS_STAGE_OPTIONAL = DEFAULT_KEYS.filter((key) => key !== 'level');
     const ESSENTIALS_CHECKS: Record<ExerciseKey, Check> = {
       ...EXERCISE_CHECKS,
       level: oneOf([ESSENTIALS_LEVEL]),
     };
     ```

     El bloque va después de `EXERCISE_CHECKS` y de `STAGE_SPEC`, porque los usa;
   - `MANIFEST_SPEC` suma `essentials: stageList(ESSENTIALS_STAGE_SPEC, ESSENTIALS_STAGE_OPTIONAL),`, y `MANIFEST_OPTIONAL` pasa a `['quests', 'systems', 'essentials']`;
   - `sectionsOf` suma al final `{ catalog: 'essentials', stages: (manifest.essentials ?? []) as JsonRecord[] },`;
   - `orderExercise` elige sus chequeos:

     ```ts
     const checks = catalog === 'essentials' ? ESSENTIALS_CHECKS : EXERCISE_CHECKS;
     ```

     y usa `checks[key](fields[key], child(place, key));` en lugar de `EXERCISE_CHECKS[key](…)`;
   - `buildExercise`:
     - `derived` pasa a `slot.catalog === 'quests' ? { ...DERIVED_KEYS, ...QUEST_DERIVED_KEYS } : slot.catalog === 'essentials' ? { ...DERIVED_KEYS, ...ESSENTIALS_DERIVED_KEYS } : DERIVED_KEYS`. Si el ternario anidado supera la complejidad de la regla de ESLint, va en una función `derivedKeysOf(catalog: Catalog)` con un `switch`;
     - `fields` suma, después de `...own,`: `...(slot.catalog === 'essentials' ? { level: ESSENTIALS_LEVEL } : {}),`;
   - `loadLanguage`:
     - `result` arranca con `essentials: []`;
     - `target` pasa a `catalog === 'lab' || catalog === 'quests' || catalog === 'essentials' ? result[catalog] : result.cores[catalog]`;
   - `allExercises` suma `...exercises.essentials`;
   - el stub de T002 se reemplaza por:

     ```ts
     export function expectEssentials(exercises: LanguageExercises, language: Language): void {
       if (exercises.essentials.length === 0) {
         fail(
           filePlace(`content/${language}/manifest.yaml`),
           'falta la sección essentials: Esenciales necesita al menos una etapa en cada lenguaje',
         );
       }
     }
     ```

4. **`tools/content/load-curriculum.ts`:**
   - el import suma `expectEssentials`;
   - `Curriculum` suma, al final, `essentials: Record<Language, JsonRecord[]>;`;
   - después de `expectDistinctIds(rust, go);`, `expectEssentials(rust, 'rust');` y `expectEssentials(go, 'go');`;
   - el objeto `curriculum` suma, al final, `essentials: { rust: rust.essentials, go: go.essentials },`.
5. **`tools/content/meta.ts`:**
   - `portionsOf` suma, después de `portions.guide = curriculum.guide;`:

     ```ts
     for (const language of LANGUAGES) {
       portions[`essentials.${language}`] = curriculum.essentials[language];
     }
     ```

   - en `curriculumMeta`, `catalogs` suma `...Object.values(curriculum.essentials),`.
6. **Correr:**
   - `node qa/content-exercises-check.ts` y `node qa/content-tools-check.ts` en verde;
   - `npx tsc -p tsconfig.json --noEmit` (o el `typecheck` del proyecto sin `curriculum`) sin errores;
   - `npm run curriculum` falla, como se espera, con «content/rust/manifest.yaml: falta la sección essentials: …». Queda así hasta T004.
7. **Los checks:** `npx eslint tools/content qa/content-exercises-check.ts qa/content-baseline-check.ts frontend/src/shared/config/levels.ts` y `npx prettier --check` sobre los mismos archivos.
8. **El commit:** `feat(content): generate the Essentials section as the first catalog of the chain`.

### Tarea 1.3 · La etapa piloto (T004, C)

**Archivos:** `content/rust/manifest.yaml`, `content/go/manifest.yaml` y diez carpetas nuevas: `content/rust/exercises/rust-138` a `rust-142` y `content/go/exercises/go-138` a `go-142`.

**Quién:** un agente redactor (C), con `README.md`, «Contenido del currículo», y la spec, «Qué es Esenciales para el alumno». El plan no trae el texto: lo escribe C y lo aprueba el usuario en T005.

1. **La sección**, en cada manifiesto, después de `systems:`:
   - una sola etapa: la 1 de la tabla de la spec, «Leer un ejercicio»;
   - `topicId` nuevo y único en el lenguaje (por ejemplo `rust-essentials-reading` y `go-essentials-reading`);
   - `topic` en castellano, `minutes` y las `sources` de la etapa;
   - los cinco IDs en orden.
2. **Cada ejercicio** cumple las reglas del README y estas de la spec:
   - un concepto por ejercicio;
   - la firma siempre dada en el inicial;
   - la consigna explica el porqué de cada línea;
   - las pruebas son expresiones booleanas sobre funciones: nada se corrige por lo que imprime;
   - tres pruebas con las claves `t1`, `t2` y `t3`, tres pistas, revisión, transferencia y predicción;
   - uno o dos de los cinco son `kind: reparar`, cuyo inicial no compila por el error que enseñan (Rust: tipos que no coinciden o una variable inmutable; Go: una variable sin usar o tipos mezclados);
   - los de `completar` tienen un inicial que compila y falla por sus pruebas (B3-Q1);
   - `sources` enlaza documentación oficial: The Rust Book, Rust by Example o la referencia de `std`; A Tour of Go, Effective Go, la especificación o la documentación del paquete;
   - sin `level` ni `challengeType`: los fija la sección;
   - los `.go` empiezan con `package main` y una línea en blanco; finales de línea LF.
3. **Correr:**
   - `npm run curriculum` en verde;
   - `node qa/content-baseline-check.ts --full` y `node qa/curriculum-meta-check.ts` en verde;
   - `node qa/content-exercises-check.ts` en verde.
4. **La prueba previa en el host,** si tiene `rustc` y `go` (como midió B3; no reemplaza la auditoría de T017): armar con la plantilla de `content/harness/` el programa de cada solución y de cada inicial y comprobar que las diez soluciones aprueban y los diez iniciales fallan como corresponde. Lo que no se pueda correr en el host, se dice en el informe de la tarea.
5. **El commit:** `feat(content): add the first Essentials stage for Rust and Go`, sólo con `content/`.

### Tarea 1.4 · La revisión pedagógica (T005, U)

El usuario lee los diez ejercicios:
- título, intro, porqué, objetivo e instrucciones;
- pruebas, pistas, revisión, transferencia y predicción;
- inicial y solución.

Para cada uno, aprueba o pide cambios. Un cambio vuelve a T004 (C corrige, corre sus checks y hace un commit `fix(content): …`), y si toca código o pruebas, T017 se repite. Es la compuerta antes de T019: el PR no se abre sin la aprobación de los diez. Puede correr a la vez que la onda 2, porque las tareas de la onda 2 dependen de la forma del contenido y no de su texto. Si cambia un título, cambia la entrada de `curriculum-ids.json` (T009) en el mismo commit de `fix(content)`.

---

## 2. Onda 2 · La API, los contratos, el front y la red (A, Q, F y E)

S1: `e1/base` con T001 a T004 integradas. `npm run curriculum` en verde.

### Tarea 2.1 · Las pruebas de la API, en rojo (T006, A)

**Archivos:** `backend/api/tests/Unit/PortionTest.php`, `tests/Content/SessionEndpointTest.php`, `tests/Unit/Record/ContentMetaTest.php`, `tests/Content/EssentialsContentTest.php` (nuevo), `tests/Content/EssentialsLevelTest.php` (nuevo) y las pruebas que cuentan (paso 5).

1. **`PortionTest.php`:**
   - el primer caso pasa a `'has 20 portions, in the order the generator publishes them'`, con `'guide', 'essentials.rust', 'essentials.go', 'harness'` al final de la lista;
   - el dataset de grupos suma `'Rust essentials' => [Portion::EssentialsRust, 'essentials', 'rust', true],`;
   - el de `sliceBy` suma `'essentials' => ['essentials', 'language'],`;
   - el de `resolve` suma `'essentials exercises' => ['exercises', ['catalog' => 'essentials', 'language' => 'go'], Portion::EssentialsGo],`;
   - si el archivo tiene un dataset de 422 por parámetros, suma `'essentials by domain' => ['exercises', ['catalog' => 'essentials', 'domain' => 'pc']]` con el mensaje «Sobra el parámetro domain: este recurso se corta por language.».
2. **`SessionEndpointTest.php`,** el primer caso:
   - el nombre pasa a `'publishes the version of the latest import and the catalogs of the generator meta, Essentials first with position 1'`;
   - el esperado pasa a `[$metaCatalogs['essentials'], $metaCatalogs['cores'], $metaCatalogs['lab'], $metaCatalogs['quests']]`;
   - una aserción más: `->assertJsonPath('catalogs.0', ['code' => 'essentials', 'sliceBy' => 'language', 'chainPosition' => 1])`.
3. **`ContentMetaTest.php`,** el caso de los catálogos:
   - el nombre pasa a `'reads the catalogs with Essentials alone in the chain, and the languages'`;
   - los códigos, `['essentials', 'lab', 'quests', 'cores']`;
   - las posiciones, `[1, null, null, null]`.
4. **`EssentialsContentTest.php`,** nuevo:

   ```php
   <?php

   use App\Models\User;
   use Illuminate\Support\Facades\Artisan;
   use Tests\Support\Browser;
   use Tests\Support\ContentFixture;

   beforeEach(function () {
       Artisan::call('content:import');
       $this->browser = Browser::for($this)->useDatabaseDrivers();
       $this->browser->signIn(User::factory()->create());
   });

   afterEach(fn () => ContentFixture::cleanup());

   it('serves each Essentials portion with the bytes of the generator', function (string $language) {
       $meta = ContentFixture::fromImage()->meta;

       $response = $this->browser->get("/api/exercises?catalog=essentials&language={$language}");

       $response->assertOk()->assertHeader('ETag', '"'.substr($meta['portions']["essentials.{$language}"], 0, 32).'"');
       expect(hash('sha256', $response->getContent()))->toBe($meta['portions']["essentials.{$language}"]);
   })->with(['rust', 'go']);

   it('answers 304 to the Essentials portion with its weak validator', function () {
       $meta = ContentFixture::fromImage()->meta;
       $etag = 'W/"'.substr($meta['portions']['essentials.rust'], 0, 32).'"';

       $this->browser->withHeader('If-None-Match', $etag)->get('/api/exercises?catalog=essentials&language=rust')->assertStatus(304);
   });

   it('rejects Essentials sliced by domain or without a language', function (array $query) {
       $this->browser->get('/api/exercises?'.http_build_query($query))->assertStatus(422)->assertJsonPath('code', 'validation_failed');
   })->with([
       'by domain' => [['catalog' => 'essentials', 'domain' => 'pc']],
       'without a language' => [['catalog' => 'essentials']],
   ]);

   it('serves the first Essentials exercise by its ID with the bytes of its contentHash', function () {
       $meta = ContentFixture::fromImage()->meta;

       $response = $this->browser->get('/api/exercises/rust-138');

       $response->assertOk();
       expect(hash('sha256', $response->getContent()))->toBe($meta['exercises']['rust-138']['contentHash']);
   });
   ```

   La sesión y las cabeceras siguen la forma de `tests/Content/ContentAccessTest.php` (`signIn` y `withHeader` de `tests/Support/Browser.php`). Ese archivo ya recorre `Portion::cases()` en «serves each portion…», así que las dos porciones nuevas entran ahí sin editarlo: este archivo suma lo propio de Esenciales.
5. **`EssentialsLevelTest.php`,** nuevo (FR-012):

   ```php
   <?php

   use Illuminate\Database\QueryException;
   use Illuminate\Support\Facades\Artisan;
   use Illuminate\Support\Facades\DB;

   it('stores the Essentials level on the exercises of its catalog', function () {
       Artisan::call('content:import');

       expect(DB::table('exercises')->where('catalog', 'essentials')->pluck('level')->unique()->values()->all())->toBe(['essentials'])
           ->and(DB::table('exercises')->where('catalog', '!=', 'essentials')->where('level', 'essentials')->count())->toBe(0);
   });

   it('keeps the Essentials level out of the workshops', function () {
       Artisan::call('content:import');

       expect(fn () => DB::table('workshops')->limit(1)->update(['level' => 'essentials']))
           ->toThrow(fn (QueryException $error) => expect($error->errorInfo[1])->toBe(1265));
   });
   ```

6. **Las pruebas que cuentan,** con los esperados de la base de T001 más los deltas de `data-model.md` §3:
   - `ImportContentTest.php` (líneas 54, 55, 64 y 181): `catalogs` 4, `topics` 100, `exercises` 284, `exercise_grading_versions` 284, `exercise_tests` 852 y `exercise_hints` 852;
   - `ContentRoundTripTest.php:55`: ídem;
   - `ContentSourceTest.php:19`, `ContentMetaTest.php:27-31`, `ExerciseRecordsTest.php:88-91` y `ContentAccessTest.php:76-87`: 274 pasa a 284, también en el nombre del caso;
   - los recorridos `['lab', 'quests', 'cores']` de `tests/Support/ContentFixture.php` (`:57` y `:180`), `ExerciseRecordsTest.php:17` y `WorkshopRecordsTest.php:78` suman `'essentials'`.

   - `tests/Feature/ContentSchemaTest.php` («B: ENUM columns list their values in the ADR order»): `'exercises.level'` pasa a `"enum('beginner','medium','advanced','expert','essentials')"`. `workshops.level`, `worlds.level` y `atlas_concepts.level` siguen con `$levels`: es la prueba de FR-012 sobre el esquema;
   - el barrido: `git grep -n "'beginner','medium','advanced','expert'" backend/api/tests`, y cada aparición que fije la columna de los ejercicios cambia en este commit.

   El 274 de `tests/Feature/Progress/Import/ImportContentTest.php:140` no cuenta el contenido: es la cantidad de nombres sintéticos de esa prueba, y no se toca.
7. **Correr y ver el rojo:**

   ```sh
   COMPOSE_PROJECT_NAME=e1-a npm run api:test -- --filter='PortionTest|SessionEndpointTest|ContentMetaTest|EssentialsContentTest|EssentialsLevelTest|ImportContentTest'
   ```

   Antes de T007, el import falla con el mensaje de `ContentMeta` sobre las claves de `portions`: el meta tiene 20 y `Portion` 18.
8. **El commit:** `test(api): red specs for the Essentials catalog`.

### Tarea 2.2 · La API (T007, A)

**Archivos:** `backend/api/app/Content/Portion.php`, `ContentReader.php`, `PortionAssembler.php` y `database/migrations/<fecha>_100001_add_essentials_to_exercises_level.php` (nuevo, con la fecha del día y después de la última migración de `master`).

1. **`Portion.php`:**
   - después de `case Guide = 'guide';`:

     ```php
     case EssentialsRust = 'essentials.rust';
     case EssentialsGo = 'essentials.go';
     ```

   - `CATALOGS` pasa a `['lab', 'quests', 'cores', 'essentials']`;
   - en `sliceBy`: `'lab', 'quests', 'essentials', 'campaign', 'atlas' => 'language',`;
   - el docblock dice «the 17 of curriculum.json, the 2 of Essentials and, last, the harness template».
2. **`ContentReader::rows`** y **`PortionAssembler::assemble`:** el brazo `'lab', 'quests', 'cores' =>` pasa a `'lab', 'quests', 'cores', 'essentials' =>`. `exerciseRows` y `exerciseList` ya cortan por `language` todo lo que no es `cores`.
3. **La migración:**

   ```php
   <?php

   use Illuminate\Database\Migrations\Migration;
   use Illuminate\Support\Facades\DB;

   // ADR 0006 §10 (E1): the Essentials level, appended at the end of the exercises ENUM only. Source of truth: specs/026-e1-esenciales/data-model.md
   return new class extends Migration
   {
       public function up(): void
       {
           DB::statement("ALTER TABLE `exercises` MODIFY `level` ENUM('beginner','medium','advanced','expert','essentials') CHARACTER SET ascii COLLATE ascii_bin NULL");
       }

       public function down(): void
       {
           DB::statement("ALTER TABLE `exercises` MODIFY `level` ENUM('beginner','medium','advanced','expert') CHARACTER SET ascii COLLATE ascii_bin NULL");
       }
   };
   ```

   Sin `ALGORITHM`: con `exercises_lifecycle_check` sobre `retired_at`, INSTANT da 1845 en `mysql:9.7` (`OnlineDdlTest`; research.md, R9).
4. **`MigrationsTest`** («migrate, rollback and migrate leave the same schema») tiene que seguir en verde. Si su base de prueba tiene filas de Esenciales cuando corre el `rollback`, el `down()` falla con 1265, como corresponde: el caso se ajusta para correr sobre las tablas vacías, como corre hoy, sin cambiar el `down()`.
5. **Correr:** el filtro de T006 en verde; después, `COMPOSE_PROJECT_NAME=e1-a npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.
6. **El commit:** `feat(api): serve the Essentials catalog and widen the exercise level`.

### Tarea 2.3 · El orden de la auditoría (T008, A)

**Archivos:** `backend/api/app/Audit/AuditCatalogReader.php` y `backend/api/tests/Feature/Audit/AuditCatalogReaderTest.php`.

1. **La prueba,** después de «orders the exercises by language, catalog, domain, position and id»:

   ```php
   it('reads Essentials first in each language, as in the chain', function () {
       AuditWorld::curriculum();
       DB::table('catalogs')->insertOrIgnore(['code' => 'essentials', 'slice_by' => 'language', 'chain_position' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
       RunWorld::exercise('rust-138', 'rust');
       DB::table('exercises')->where('id', 'rust-138')->update(['catalog' => 'essentials', 'level' => 'essentials', 'position' => 0]);

       $catalog = app(AuditCatalogReader::class)->read();

       expect(array_map(fn (AuditedExercise $exercise) => $exercise->id(), $catalog->exercises))->toBe(['rust-138', 'rust-01', 'rust-02', 'go-01', 'go-02']);
   });
   ```

   El esperado sale de `AuditWorld::ACTIVE` del mismo archivo, con `rust-138` al principio. Si `ACTIVE` difiere, A copia su lista y pone `rust-138` primero.
2. **Correr:** pasa también antes del cambio, porque `FIELD()` da 0 para un catálogo que no nombra (hallazgo E1-1). La prueba fija la regla, y el cambio la vuelve explícita.
3. **El cambio:** `field(\`catalog\`, 'essentials', 'lab', 'quests', 'cores')`.
4. **Correr:** `COMPOSE_PROJECT_NAME=e1-a npm run api:test -- --filter=AuditCatalogReaderTest`, y PHPStan y Pint.
5. **El commit:** `feat(api): audit Essentials first, as in the chain`.

### Tarea 2.4 · Los contratos de conteo de `qa/` (T009, Q)

**Archivos:** los de Q en «Reparto en paralelo». Los conteos nuevos salen del `build/` con la etapa piloto y de la base de T001: 284 ejercicios, 142 por lenguaje y 5 de Esenciales por lenguaje.

1. **`qa/lib/content-document.ts`:** `FAMILIES` suma `'essentials'` al final.
2. **`qa/content-check.ts`:**
   - el cuerpo del `for` que revisa un ejercicio (campos de texto, pruebas, pistas, revisión, predicción, fuentes, inicial distinto de la solución) pasa a una función `checkExercise(ex: Exercise): void`, sin cambiar sus aserciones;
   - el archivo suma `import { curriculumDocument } from './lib/content-document.ts';`;
   - después del bucle de cada lenguaje, Esenciales se lee del documento (no hay global):

     ```ts
     const { essentials } = curriculumDocument<{ essentials: Record<Language, Exercise[]> }>();
     for (const language of ['rust', 'go'] as const) {
       const list = essentials[language];
       assert.ok(list.length > 0 && list.length % 5 === 0, `${language}: Essentials comes in stages of five`);
       list.forEach((ex, index) => {
         assert.equal(ex.id, `${language}-${138 + index}`, 'Essentials IDs follow the last one (Q4)');
         assert.equal(ex.language, language);
         assert.equal(ex.stage, 50 + Math.floor(index / 5), `${ex.id}: Essentials stages follow the last one`);
         assert.equal(ex.level, 'essentials', `${ex.id}: the level is fixed by the section`);
         assert.ok(!ids.has(ex.id), ex.id + ' unique');
         ids.add(ex.id);
         checkExercise(ex);
       });
     }
     ```

   - `validLevels` no cambia: el bucle de `lab`, `quests` y núcleos sigue sin aceptar `essentials`.
3. **`qa/curriculum-ids-check.ts`:** `collectExercises` suma, después del bucle de `EXERCISE_CATALOGS`, los de `curriculumDocument<{ essentials: Record<Language, ExerciseSource[]> }>().essentials` de los dos lenguajes. `qa/fixtures/curriculum-ids.json` suma las diez entradas al final de `exercises`, con `language` y el `title` del `exercise.yaml` de T004. Ninguna entrada existente cambia.
4. **Los totales:**
   - `qa/systems-check.ts`:
     - `exerciseGroups(w)` suma `rustEssentials` y `goEssentials` leídos con `curriculumDocument()`;
     - el caso pasa a «… and 284 unique exercises»: 274 → 284 dos veces, y 137 → 142;
     - el bucle de los núcleos (113 a 137) no cambia;
   - `qa/campaign-content-check.ts`: 274 → 284 en la aserción y en el mensaje, con los grupos de Esenciales si arma el catálogo;
   - `qa/project-kit-check.ts`: `exerciseGroups(w)` suma los dos grupos, y 274 → 284;
   - `qa/api-sync-check.ts` y `qa/api-import-check.ts`: `SEEDED_EXERCISES` 274 → 284. El nombre `synthetic-274-drafts` no cuenta el contenido y no cambia.

   Si F10 ya entró y estos checks leen el módulo de contenido en lugar de los globales, el cambio es el mismo: sumar los grupos de Esenciales.
5. **Si `qa/runtime-check.ts` todavía existe** (lo retira A4), su `createExerciseCatalog` suma los dos grupos, para que no se rompa al sumarse los campos a `ExerciseGroups` en T011.
6. **El barrido:** `git grep -nE "\b(274|137)\b" qa/*.ts qa/lib`. Cada aparición que cuente el contenido cambia con su delta, en este commit.
7. **Correr:** `node qa/content-check.ts`, `node qa/curriculum-ids-check.ts`, `node qa/systems-check.ts`, `node qa/campaign-content-check.ts` y `node qa/project-kit-check.ts`. `systems-check` y `project-kit-check` necesitan `ExerciseGroups` de T011: si F no integró todavía, quedan para S2.
8. **El commit:** `test(qa): count the Essentials stage in the curriculum contracts`.

### Tarea 2.5 · Las specs del modelo del front, en rojo (T010, F)

**Archivos:**
- `frontend/src/shared/config/levels.spec.ts` (nuevo);
- `frontend/src/entities/exercise/model/selectors.spec.ts` (el de F7a);
- `frontend/src/entities/exercise/model/exercise-catalog.spec.ts`;
- `frontend/src/pages/lab/model/map-selectors.spec.ts`;
- `frontend/src/app/content/assemble-content.spec.ts`;
- `frontend/src/shared/api/content/portions.spec.ts` (si no existe, se crea);
- `frontend/src/entities/exercise/model/lab-store.spec.ts`;
- si A3 entró, `content-copy.spec.ts`.

1. **`levels.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { EXERCISE_LEVEL_IDS, EXERCISE_LEVEL_LABELS, LEVEL_IDS } from './levels';

   describe('levels', () => {
     it('puts Essentials first in the exercise chain and leaves the shared list alone', () => {
       expect(EXERCISE_LEVEL_IDS).toEqual(['essentials', 'beginner', 'medium', 'advanced', 'expert']);
       expect(LEVEL_IDS).toEqual(['beginner', 'medium', 'advanced', 'expert']);
       expect(EXERCISE_LEVEL_LABELS.essentials).toBe('Esenciales');
     });
   });
   ```

2. **`selectors.spec.ts`,** un caso de `levelOf`:

   ```ts
   it('reads Essentials from the exercise, never from its stage', () => {
     expect(levelOf({ level: 'essentials', stage: 50 })).toBe('essentials');
     expect(levelOf({ level: undefined, stage: 50 })).toBe('expert');
   });
   ```

   El segundo esperado es la regla de hoy: un ejercicio sin nivel desde la etapa 13 es Experto. Por eso FR-004 obliga a publicar el nivel.
3. **`exercise-catalog.spec.ts`:**
   - `smallGroups()` suma `rustEssentials: stubs('z1')` y `goEssentials: stubs('y1')`;
   - el primer caso pasa a «joins the ten groups: the Essentials of Rust and Go, then the order of today», con el esperado `['z1', 'y1', 'a1', 'a2', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1']`;
   - `realGroups()` suma `curriculum.essentials.rust` y `.go`;
   - el caso que compara con el fixture de IDs sigue: el fixture ya tiene las diez entradas de T009.
4. **`map-selectors.spec.ts`:**

   ```ts
   const ESSENTIAL = exercise('r-0', 50, 'Leer un ejercicio', 'essentials');
   const ESSENTIAL_NEXT = exercise('r-00', 50, 'Devolver un valor', 'essentials');
   const WITH_ESSENTIALS = [ESSENTIAL, ESSENTIAL_NEXT, ...EXERCISES];

   describe('todayChallenge with Essentials', () => {
     it('suggests the first Essentials exercise to whoever solved nothing', () => {
       expect(todayChallenge(WITH_ESSENTIALS, {}, NO_FILTERS, NOW)?.id).toBe('r-0');
     });

     it('the suggestion leaves Essentials out for whoever solved something else', () => {
       const before = todayChallenge(EXERCISES, RECORDS, NO_FILTERS, NOW)?.id;
       expect(todayChallenge(WITH_ESSENTIALS, RECORDS, NO_FILTERS, NOW)?.id).toBe(before);
       expect(before).toBe('r-4');
     });

     it('with the Essentials level chosen, suggests within Essentials', () => {
       const records = { 'r-1': { solvedAt: 10 } };
       expect(
         todayChallenge(WITH_ESSENTIALS, records, { ...NO_FILTERS, level: 'essentials' }, NOW)?.id,
       ).toBe('r-0');
     });
   });

   describe('topicNumber', () => {
     it('numbers the Essentials topics from one and keeps the stage of the others', () => {
       const second = { ...ESSENTIAL_NEXT, id: 'r-01', topicId: 'otro' } as Exercise;
       const list = [ESSENTIAL, second, FIRST, DUE];
       expect(list.map((item) => topicNumber(item, list))).toEqual([1, 2, 1, 9]);
     });
   });

   describe('isExtraChallenge with Essentials', () => {
     it('leaves Essentials out of «Clásicos y sistemas»', () => {
       expect(isExtraChallenge(ESSENTIAL)).toBe(false);
     });
   });
   ```

   El ayudante `exercise()` del archivo no pone `topicId`: `ESSENTIAL` y `ESSENTIAL_NEXT` comparten un tema sin id, y `second` lleva `'otro'`, así que son dos temas de Esenciales. Los esperados salen de los datos armados: `r-4` es el primero sin resolver de `EXERCISES` con `RECORDS` (r-1, r-2 y r-3 tienen `solvedAt`).
5. **`assemble-content.spec.ts`:** el armado de portions suma `essentials.rust` y `essentials.go`, y el caso espera `content.essentials` con los dos arreglos, idénticos a los que entraron.
6. **`portions.spec.ts`:**
   - `PORTION_NAMES` termina con `'guide', 'essentials.rust', 'essentials.go'`;
   - `findPortionProblem('essentials.rust', [])` da `'shape'`;
   - `findPortionProblem('essentials.rust', [{ id: 'rust-138' }])` da `null`.
7. **`lab-store.spec.ts`:**
   - el `createExerciseCatalog` de «opening with the master fixture» suma `rustEssentials: curriculum.essentials.rust as Exercise[]` y `goEssentials: curriculum.essentials.go as Exercise[]`;
   - un caso nuevo en ese `describe` (FR-020 y SC-004, la parte de exportar e importar):

     ```ts
     it('keeps the record of an Essentials exercise on import', () => {
       const { store } = openFixture();
       const plan = store.planImport({
         version: 1,
         records: { 'rust-138': { draft: 'mío', solvedAt: 7 } },
       });

       store.applyImport(plan);

       expect(store.getProgress().records['rust-138']).toMatchObject({ draft: 'mío', solvedAt: 7 });
     });
     ```

     Hoy falla porque `rust-138` no está en el catálogo, y `sanitizeImport` descarta un ID desconocido (ADR 0003).
8. **Si A3 entró, `content-copy.spec.ts`:** «a copy of the previous format is not usable». Una copia completa con `format: 1` da `usableCopy(...) === null`, y `COPY_FORMAT` es 2.
9. **Correr:** `npx vitest run --project node` sobre esos archivos y ver los fallos:
   - `EXERCISE_LEVEL_IDS` existe desde T003, así que `levels.spec.ts` pasa: es la prueba de contrato de T003;
   - fallan `todayChallenge`, `topicNumber` (que no existe: stub de TR-2), el orden del catálogo, `content.essentials`, `PORTION_NAMES` y la importación de `rust-138`.
10. **El commit:** `test(front): red specs for Essentials in the catalog, the map and the content`.

### Tarea 2.6 · El modelo del front (T011, F)

**Archivos:**
- `frontend/src/entities/exercise/model/types.ts`, `selectors.ts` y `exercise-catalog.ts`;
- `frontend/src/pages/lab/model/map-selectors.ts`;
- `frontend/src/app/content/content.ts` y `assemble-content.ts`;
- `frontend/src/shared/api/content/portions.ts`;
- si A3 entró, `portion-resources.ts`, `content-copy.ts`, `qa/lib/content-server.ts` y `qa/e2e/lib/content-portions.ts`.

1. **`types.ts`:** `level?: ExerciseLevelId;`, con el import de `levels`.
2. **`selectors.ts` (F7a):**

   ```ts
   export function levelOf(exercise: Pick<Exercise, 'level' | 'stage'>): ExerciseLevelId {
     if (exercise.level !== undefined && EXERCISE_LEVEL_IDS.includes(exercise.level)) return exercise.level;
     if (exercise.stage <= 4) return 'beginner';
     if (exercise.stage <= 8) return 'medium';
     if (exercise.stage <= 12) return 'advanced';
     return 'expert';
   }
   ```

3. **`exercise-catalog.ts`:** `ExerciseGroups` suma `rustEssentials` y `goEssentials` al principio, y `createExerciseCatalog` los pone primero:

   ```ts
   const exercises = [
     ...groups.rustEssentials,
     ...groups.goEssentials,
     ...groups.rustLab,
     ...groups.rustQuests,
     ...groups.goLab,
     ...groups.goQuests,
     ...groups.systemsLowlevel,
     ...groups.systemsInfra,
     ...groups.systemsPlay,
     ...groups.systemsPc,
   ];
   ```

4. **`map-selectors.ts`:**

   ```ts
   import { ESSENTIALS_LEVEL, type ExerciseLevelId } from '../../../shared/config/levels';

   export type LevelFilter = ExerciseLevelId | 'all';

   function isEssential(exercise: Exercise): boolean {
     return levelOf(exercise) === ESSENTIALS_LEVEL;
   }

   function hasSolvedBeyondEssentials(exercises: readonly Exercise[], records: LabRecords): boolean {
     return exercises.some((exercise) => !isEssential(exercise) && isSolved(records[exercise.id]));
   }

   export function todayChallenge(
     exercises: readonly Exercise[],
     records: LabRecords,
     filters: Pick<MapFilters, 'level' | 'extraOnly'>,
     now: number,
   ): Exercise | undefined {
     const matching = exercises.filter((exercise) => matchesLevelAndExtras(exercise, filters));
     const candidates =
       filters.level === 'all' && hasSolvedBeyondEssentials(exercises, records)
         ? matching.filter((exercise) => !isEssential(exercise))
         : matching;
     return (
       candidates.find((exercise) => !isSolved(records[exercise.id])) ||
       candidates.find((exercise) => isDueForReview(records[exercise.id], now)) ||
       candidates[0] ||
       exercises[0]
     );
   }

   export function topicNumber(first: Exercise, exercises: readonly Exercise[]): number {
     if (!isEssential(first)) return first.stage;
     const topics = [
       ...new Set(exercises.filter(isEssential).map((exercise) => exercise.topicId)),
     ];
     return topics.indexOf(first.topicId) + 1;
   }
   ```

   `matchesLevelAndExtras` no cambia: compara `levelOf` con el nivel elegido, y ahora también con `essentials`.
5. **`content.ts`:** `Content` suma `essentials: Record<Language, Exercise[]>;`. En **`assemble-content.ts`** se suma `essentials: { rust: get('essentials.rust'), go: get('essentials.go') },`.
6. **`portions.ts`:** `PORTION_NAMES` suma `'essentials.rust'` y `'essentials.go'` después de `'guide'`.
7. **Si A3 entró:**
   - `PORTION_RESOURCES` suma:

     ```ts
     'essentials.rust': '/api/exercises?catalog=essentials&language=rust',
     'essentials.go': '/api/exercises?catalog=essentials&language=go',
     ```

   - `COPY_FORMAT = 2`;
   - en `qa/lib/content-server.ts` y en `qa/e2e/lib/content-portions.ts`, las tablas de rutas de cada porción (`PORTION_URLS` y `PORTION_PATHS`, o el nombre que tengan en `master`) suman las mismas dos entradas;
   - si alguna prueba de A3 cuenta 17 porciones o 18 pedidos por ronda, pasa a 19 y 20 en este commit.
8. **Los usos de `levelOf`, de `LEVEL_LABELS` y de `LevelId` con un ejercicio:** `git grep -n "levelOf\|LEVEL_LABELS\|LevelId" frontend/src qa`, sobre todo el front y los checks, no sólo el laboratorio. Cada uno que reciba el nivel de un ejercicio pasa a `EXERCISE_LEVEL_LABELS` o a `ExerciseLevelId`. Los que reciben el de un mundo, un taller o un concepto del Atlas (por ejemplo `CampaignWorldDefinition.level` en `entities/campaign/model/types.ts`) se quedan con `LevelId`. El motor de la campaña recibe todos los ejercicios: si `CampaignExercise` tipa `level`, pasa a `ExerciseLevelId`; `npm run typecheck` lo dice. Los de los componentes son de T013.
9. **Correr:** las specs de T010 en verde, `npm run typecheck` y `npx eslint` sobre los archivos.
10. **El commit:** `feat(front): read Essentials first in the exercise catalog and the content`.

### Tarea 2.7 · Las specs de los componentes, en rojo (T012, F)

**Archivos:** `frontend/src/pages/lab/ui/map/LevelTabs.spec.tsx` y `TopicGrid.spec.tsx` (nuevos), en el proyecto `dom` (TR-6).

1. **`LevelTabs.spec.tsx`:**

   ```tsx
   import { render, screen, within } from '@testing-library/react';
   import { describe, expect, it, vi } from 'vitest';
   import type { Exercise } from '../../../../entities/exercise';
   import LevelTabs from './LevelTabs';

   const exercises = [
     { id: 'rust-138', stage: 50, level: 'essentials' },
     { id: 'rust-139', stage: 50, level: 'essentials' },
     { id: 'rust-01', stage: 1 },
   ] as unknown as Exercise[];

   describe('LevelTabs', () => {
     it('offers Essentials first, before Inicial, with its count and its subtitle', () => {
       render(<LevelTabs exercises={exercises} level="all" onLevel={vi.fn()} />);
       const group = screen.getByRole('group', { name: 'Nivel de aprendizaje' });
       const names = within(group)
         .getAllByRole('button')
         .map((button) => button.querySelector('strong')?.firstChild?.textContent);

       expect(names).toEqual(['Todos los niveles', 'Esenciales', 'Inicial', 'Intermedio', 'Avanzado', 'Experto']);
       const essentials = within(group).getByRole('button', { name: /^Esenciales/ });
       expect(essentials).toHaveTextContent('Esenciales2Tus primeros pasos');
       expect(essentials).toHaveAttribute('aria-pressed', 'false');
     });
   });
   ```

2. **`TopicGrid.spec.tsx`:**

   ```tsx
   import { render, screen } from '@testing-library/react';
   import { describe, expect, it, vi } from 'vitest';
   import type { Exercise } from '../../../../entities/exercise';
   import TopicGrid from './TopicGrid';

   const exercises = [
     { id: 'rust-138', topicId: 'e', topic: 'Leer un ejercicio', stage: 50, level: 'essentials', title: 'Uno' },
     { id: 'rust-01', topicId: 'b', topic: 'Expresiones', stage: 1, title: 'Dos' },
   ] as unknown as Exercise[];

   describe('TopicGrid', () => {
     it('numbers the Essentials topic 01 with its level, and keeps the stage of the others', () => {
       render(
         <TopicGrid
           exercises={exercises}
           visible={exercises}
           records={{}}
           now={0}
           selectedId={null}
           dueOnly={false}
           onOpen={vi.fn()}
           onClear={vi.fn()}
         />,
       );
       const cards = screen.getAllByRole('article');

       expect(cards[0].querySelector('.topic-index')).toHaveTextContent('01');
       expect(cards[0].querySelector('.topic-level')).toHaveTextContent('Esenciales');
       expect(cards[1].querySelector('.topic-index')).toHaveTextContent('01');
       expect(cards[1].querySelector('.topic-level')).toHaveTextContent('Inicial');
       expect(screen.getByRole('button', { name: 'Uno' })).toHaveTextContent('138');
     });
   });
   ```

   Si F7b dejó otras props en `TopicGrid` o en `LevelTabs`, F copia las de `LabMap.tsx` en `master`: el caso no cambia.
3. **Correr:** `npx vitest run --project dom` sobre los dos archivos. Fallan la pestaña de Esenciales, el «01» de la primera tarjeta (hoy dice «50») y la etiqueta del nivel (hoy `LEVEL_LABELS` no tiene `essentials`).
4. **El commit:** `test(front): red specs for the Essentials level tab and topic number`.

### Tarea 2.8 · Los componentes, la lectura del catálogo y el menú (T013, F)

**Archivos:**
- `frontend/src/pages/lab/ui/map/LevelTabs.tsx` y `TopicGrid.tsx`;
- `frontend/src/pages/lab/ui/exercise/ExerciseView.tsx`;
- `frontend/src/app/legacy/lab-api.ts` (o la raíz de F10);
- `qa/dist-content-check.ts`;
- si F10 no entró, `frontend/src/index.html`.

1. **`LevelTabs.tsx`:**
   - `LEVELS` pasa a `readonly (readonly [ExerciseLevelId, string, string])[]` y empieza con `['essentials', 'Esenciales', 'Tus primeros pasos'],`;
   - el import de `LevelId` pasa a `ExerciseLevelId`.
2. **`TopicGrid.tsx`:**
   - `LEVEL_LABELS[levelOf(first)]` pasa a `EXERCISE_LEVEL_LABELS[levelOf(first)]`;
   - el número pasa a `{String(topicNumber(first, exercises)).padStart(2, '0')}`, con `topicNumber` importado de `../../model/map-selectors`.
3. **`ExerciseView.tsx`:** `LEVEL_LABELS[levelOf(exercise)]` pasa a `EXERCISE_LEVEL_LABELS[levelOf(exercise)]`.
4. **La lectura del catálogo:**
   - en `lab-api.ts`, `init()` suma, antes de `rustLab`:

     ```ts
     rustEssentials: getContent().essentials.rust,
     goEssentials: getContent().essentials.go,
     ```

     con `import { getContent } from '../content/content';` si el archivo no lo importa;
   - si F10 entró, el mismo par va en el lugar donde la raíz arma `exerciseCatalog.init` desde `getContent()` (FR-051 de la spec 024).

   No se agrega ningún `window.*`.
5. **`qa/dist-content-check.ts`:** el caso pasa a «the published content has the 19 portions of the generator», y 17 pasa a 19. El cálculo de `actual` ya recorre `portionsOf`.
6. **El menú:** si F10 no entró, `frontend/src/index.html:21` pasa de `274` a `284`. Si F10 entró, se deriva solo.
7. **Correr:**
   - las specs de T012 en verde, y `npm run test:unit` entero;
   - `npm run build` y `node qa/dist-content-check.ts`;
   - `node qa/seams-guard-check.ts`: `getContent()` sigue sólo en `app/`;
   - `node qa/boot-check.ts` y `node qa/lab-state-check.ts`.
8. **El commit:** `feat(lab): show Essentials as the first level, numbered from one`.

### Tarea 2.9 · Las dos E2E de F1, en rojo (T014, E)

**Archivos:** `qa/e2e/specs/views.spec.ts` y `qa/e2e/specs/reload.spec.ts`. Aprobado por el usuario en el clarify (Q3); van en un commit propio.

1. **El cambio.** Las dos pruebas arrancan con el almacenamiento vacío (ninguna llama a `storage.seed`, y el fixture `storage` no siembra), así que con la regla de R4 el botón abre el primer ejercicio de Esenciales. `views.spec.ts:82` y `reload.spec.ts:152` pasan de `/\?ejercicio=rust-01&paso=learn#laboratorio$/` a `/\?ejercicio=rust-138&paso=learn#laboratorio$/`. Los nombres de las pruebas no cambian.
2. **Correr contra el build sin T011 y T013** (la etapa piloto ya está): `npm run build && E2E_PORT=4286 npx playwright test views.spec.ts reload.spec.ts`. Las dos fallan: el botón abre `rust-01`.
3. **El commit:** `test(e2e): the lab starts at the first Essentials exercise`. El cuerpo nombra la aprobación del clarify (Q3).
4. **Después de T011 y T013:** las dos en verde, sin otra edición.

### Tarea 2.10 · Las E2E de Esenciales y los conteos de F7a (T015, E)

**Archivos:** `qa/e2e/specs/lab-essentials.spec.ts` (nuevo) y `qa/e2e/specs/lab-map.spec.ts` (F7a).

1. **`lab-essentials.spec.ts`:**

   ```ts
   import { expect, test } from '../fixtures';
   import type { ExerciseUnderTest } from '../lib/compiler-results';
   import { curriculumIds } from '../lib/curriculum';
   import { LAB_KEY } from '../lib/lab-storage';
   import { urls } from '../lib/urls';

   const RUST_138: ExerciseUnderTest = { id: 'rust-138', language: 'rust', testIds: ['t1', 't2', 't3'] };
   const GO_138: ExerciseUnderTest = { id: 'go-138', language: 'go', testIds: ['t1', 't2', 't3'] };
   const title = (id: string) => curriculumIds.exercises[id].title;

   test.describe('Essentials in the lab', () => {
     test('Essentials is a level of its own and its first topic is numbered 01', async ({
       shell,
       lab,
       page,
     }) => {
       await shell.goto(urls.view('laboratorio'));

       await lab.levelButton('Esenciales').click();
       await expect(lab.levelButton('Esenciales')).toHaveAttribute('aria-pressed', 'true');
       await expect(lab.filterStatus()).toHaveText('5 desafíos visibles.');
       await expect(lab.exerciseNodes()).toHaveCount(5);
       await expect(page.locator('.topic-index').first()).toHaveText('01');
     });

     test('the start opens the first Essentials exercise, which is solved and shows ✓ after a reload', async ({
       shell,
       lab,
       compiler,
       page,
     }) => {
       await compiler.answer(RUST_138, 'passed');
       await shell.goto(urls.view('laboratorio'));
       await lab.startButton().click();
       await expect(lab.exerciseTitle()).toHaveText(title('rust-138'));

       await lab.tab('code').click();
       await lab.runCode();
       await expect(lab.reviewHeading()).toHaveText('La idea funciona en estos casos.');

       await page.reload();
       await shell.goto(urls.view('laboratorio'));
       await expect(lab.exerciseNode(`Resuelto. ${title('rust-138')}`)).toHaveText('✓');
     });

     for (const exercise of [RUST_138, GO_138]) {
       test(`${exercise.id} keeps its solved record after a reload`, async ({
         shell,
         lab,
         compiler,
         page,
         storage,
       }) => {
         await compiler.answer(exercise, 'passed');
         await shell.goto(urls.exercise(exercise.id, 'code'));
         await lab.runCode();
         await expect(lab.reviewHeading()).toHaveText('La idea funciona en estos casos.');

         await page.reload();

         const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
         expect(stored.records[exercise.id].solvedAt).toEqual(expect.any(Number));
       });
     }

     test('rust-01 now has a previous exercise, the last Essentials one', async ({ shell, lab }) => {
       await shell.goto(urls.exercise('rust-01', 'learn'));

       await expect(lab.previousButton()).toBeEnabled();
       await lab.previousButton().click();
       await expect(lab.exerciseTitle()).toHaveText(title('rust-142'));
     });
   });
   ```

   La forma de esperar la revisión aprobada es la de `lab-run.spec.ts` («passed»), y el orden de la pestaña lo fija `LevelTabs.spec.tsx` (T012). Los esperados salen del contrato: cinco ejercicios por lenguaje (Q5), `rust-142` es el último de Esenciales (Q4) y `curriculum-ids.json` tiene los títulos.
2. **`lab-map.spec.ts` (F7a),** las aserciones que cuentan el catálogo real, con los deltas de T001:
   - «137» → «142»;
   - «8/137 resueltos» → «8/142 resueltos»;
   - «49 temas» → «50 temas»;
   - «137 desafíos visibles.» → «142 desafíos visibles.».

   «29 desafíos visibles.» de Inicial y «La energía del reactor» como desafío del día no cambian: la prueba siembra progreso fuera de Esenciales (R4). Si F7b ya hizo que esas E2E lean el catálogo, no se edita nada.
3. **Correr:** contra el build con T011 y T013, `E2E_PORT=4286 npx playwright test lab-essentials.spec.ts lab-map.spec.ts`, y antes contra el build sin ellas, para ver el rojo de los casos nuevos (sin T011, `go-138` y `rust-138` no están en el catálogo del front y la vista no los abre).
4. **El commit:** `test(e2e): cover Essentials in the lab and its counts`.

---

## 3. S2 · Integración y compuerta (K)

### Tarea 3.1 · La compuerta completa (T016, K)

1. Integrar en `e1/base`, en este orden: A (T006 a T008), Q (T009), F (T010 a T013) y E (T014 y T015). Cada merge es `--no-ff`, con su diff revisado.
2. Correr §1 a §4 de [quickstart.md](./quickstart.md):
   - `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `npm run test:e2e`;
   - Pest, PHPStan y Pint;
   - el stack con `npm run api:content:check` (las 19 porciones, con y sin compresión).
3. Comparar con los conteos de T001:
   - los checks de `npm test` suben en uno, `content-baseline-check` (la parte permanente);
   - `node qa/content-baseline-check.ts --full` en verde: SC-001;
   - Vitest suma los casos de T010 y T012;
   - la red E2E suma los cinco de `lab-essentials.spec.ts`;
   - `html.length` crece unos cientos de caracteres y queda bajo `BOOT_SIZE_LIMIT`.
4. **El barrido de conteos:** `git grep -nE "\b(274|137|17 porciones|18 porciones)\b" -- README.md AGENTS.md docs backend/api/AGENTS.md qa frontend/src backend/api/tests`. Lo que cuente el contenido es de T018 (la documentación) o vuelve a su dueño.
5. **La evidencia,** en `tasks.md`: el commit de la integración y una línea por compuerta.

---

## 4. Onda 3 · La auditoría, la documentación y el cierre (K y U)

### Tarea 4.1 · La auditoría de B3 (T017, K)

1. **Levantar la instancia de auditoría** como dice `specs/020-b3-auditoria-curriculo/quickstart.md`, sobre el último commit de `e1/base` con el árbol limpio, con runsc.
2. **Correr la auditoría completa:**
   - 284 soluciones aprueban y 284 iniciales fallan como corresponde;
   - 0 programas sin veredicto (SC-003);
   - el informe pone Esenciales primero en cada lenguaje (FR-022).
3. **Un hallazgo en un ejercicio piloto** vuelve a T004: C corrige, T005 revisa y la auditoría se repite.
4. **El resumen** de la corrida va en la descripción del PR (B3-Q3 y FR-038 de la spec 020).

### Tarea 4.2 · La documentación y el ADR (T018, K)

1. **`README.md`:**
   - el encabezado: 284 ejercicios, 142 de Rust y 142 de Go;
   - «Aprender en el taller»: el laboratorio deja explorar Esenciales, Inicial, Intermedio, Avanzado y Experto;
   - «Cobertura»: una fila «Esenciales», con los temas de la etapa piloto;
   - «Campaña»: «forman parte de los 284 ejercicios»;
   - «Desarrollo»: 142 ejercicios por lenguaje (5 de Esenciales, 100 del recorrido, 12 de campaña y 25 de Sistemas);
   - «Contenido del currículo»:
     - la sección `essentials`, que el nivel lo fija la sección y que la etapa sigue a la última;
     - las 20 porciones del meta;
     - que `qa/fixtures/content-baseline-e1.json` congela lo anterior a E1.
2. **`backend/api/AGENTS.md`:** «arma las 18 porciones» pasa a «arma las 20 porciones (las 17 del contenido, las 2 de Esenciales y la plantilla)».
3. **`docs/adr/0009-esenciales-ids-y-etapas.md`** (FR-010), con la estructura de los ADR del repositorio (contexto, decisión, alternativas y consecuencias). Las decisiones que registra:
   - el código `essentials`, para el catálogo y para el nivel, sólo de los ejercicios;
   - la etapa al final (desde la 50) y el número de la tarjeta dentro de Esenciales;
   - los IDs correlativos (`rust-138`…), con su costo: el ID no dice el catálogo;
   - las porciones después de `guide`;
   - sin globales;
   - Esenciales primero en el catálogo de ejercicios y en la auditoría;
   - volver atrás retirando el catálogo.

   El usuario lo aprueba (spec, «Acciones del usuario»).
4. **Correr:** `npx prettier --check` sobre los archivos que formatea, `git diff --check` y los enlaces relativos.
5. **El commit:** `docs: document Essentials, its IDs and its stages (ADR 0009)`.

### Tarea 4.3 · El cierre y el PR (T019, K)

1. **T005 aprobada:** los diez ejercicios, con la evidencia en `tasks.md`.
2. **La compuerta completa otra vez,** si algo cambió después de T016, con `node qa/content-baseline-check.ts --full`.
3. **El PR,** de `e1/base` a `master`:
   - el título: `feat(content): add Essentials as the first catalog of the chain`;
   - la descripción, en inglés:
     - el problema;
     - las decisiones del clarify;
     - qué cambia en cada capa;
     - la verificación (quickstart y T017, con el resumen de B3);
     - lo pendiente (E2 y la aprobación del ADR 0009);
   - termina con la línea de atribución de Claude Code.
4. **`tasks.md`:** cada tarea con su commit.

---

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T002, T003 (`CATALOGS`), T006 y T007 (la sesión) |
| FR-002 | T003 y T004 |
| FR-003 | T002 (la etapa 2 en el fixture), T003, T009 (la etapa 50) |
| FR-004 | T002, T003, T010 (`levelOf`) |
| FR-005 | T004, T009 (`content-check` y `curriculum-ids`) |
| FR-006 | T002, T003, T004 |
| FR-007 | T002 (el orden de claves), T003 |
| FR-008 | T002 y T003 (`curriculum-meta-check`) |
| FR-009 | T001 (la base), T002 (`content-baseline-check`) |
| FR-010 | T018 (ADR 0009) |
| FR-011 | T006 (`ImportContentTest`), T007 |
| FR-012 | T006 (`EssentialsLevelTest`), T007 (la migración), T002 (`essentials` fuera de su sección) |
| FR-013 | T006 (`EssentialsContentTest`), T007, T016 (`api:content:check`) |
| FR-014 | T006, T007 |
| FR-015 | T006 y T007 (el import se auto-chequea con las 20 claves de `portions`) |
| FR-016 | T006 (`SessionEndpointTest`), T007 |
| FR-017 | T017 (B3 ejecuta los programas de Esenciales con el armado de B2); la admisión no cambia (research.md, R12) |
| FR-018 | T007 (el `down()` y la migración hacia adelante), T018 (ADR) |
| FR-019 | T015 (resolver, guardar y recargar, en los dos lenguajes) |
| FR-020 | T010 (importar un registro de Esenciales), T016 (`boot-check` y `startup-storage.spec.ts` con las fixtures congeladas, sin editar) |
| FR-021 | T016 (`campaign-check` y la red de la campaña sin editar) |
| FR-022 | T008, T017 |
| FR-023 | T017, T019 (el resumen en el PR) |
| FR-024 | T010 y T011 (`PORTION_NAMES` y, si A3 entró, `COPY_FORMAT`), T013 (`dist-content-check`) |
| FR-025 | T013 (`lab-api.ts` o la raíz), T016 (`seams-guard-check`) |
| FR-026 | T012, T013, T015 |
| FR-027 | T015 (resolver y revisar), T016 (`project-kit-check` con 284) |
| FR-028 | T010, T011, T014, T015 (el anterior de `rust-01`) |
| FR-029 | T010 (`topicNumber`), T012, T013, T015 |
| FR-030 | T010 (`isExtraChallenge`), T015 («Clásicos y sistemas · 25» en `lab-map.spec.ts`, sin editar) |
| FR-031 | T015 (`lab-map.spec.ts`), T013 |
| FR-032 | T013 (el menú), T016 |
| FR-033 | T003 (`LEVEL_IDS` sin cambios), T010 (`levels.spec.ts`), T016 (las specs del Atlas sin editar) |
| FR-034 | T016 (`explorer-kinds.spec.ts` sin editar) |
| FR-035 | T001 (la precondición de F7b) |
| FR-036 | T006 (paso 6), T009, T015, T018 |
| FR-037 | T016 (la spec de coherencia de F6 sin editar) |
| FR-038 | T006, T007, T008 |
| FR-039 | T001, T002 (los dos niveles), T016 y T019 (`--full`) |
| FR-040 | T014, T015 |
| FR-041 | T016 |
| FR-042 | T016, T019 |
| FR-043 | T003 (`expectEssentials`), T004 |
| FR-044 | T004, T005, T017 |
| SC-001 | T002 (`content-baseline-check --full`), T016 y T019 |
| SC-002 | T006, T016 (`api:content:check`) |
| SC-003 | T017 |
| SC-004 | T015 (la sugerencia, resolver y recargar en Rust y en Go), T010 (exportar e importar: `planImport` y `applyImport`) |
| SC-005 | T016 |
| SC-006 | T014 (sólo dos ediciones de F1), T016 |
| SC-007 | T006 |
| SC-008 | T009, T013, T015, T018 |
| SC-009 | T016 (la medición, en `tasks.md`) |

## Descargas y permisos

Ninguna descarga. E1 no suma dependencias de npm ni de Composer. La auditoría (T017) usa las imágenes del sandbox que ya construyó B2, y el stack (T016), las de `docker compose`. Si alguna falta en el daemon, K pide permiso con nombre, origen y tamaño antes de construirla.

## Riesgos y lo que quedó sin verificar

- **Nada de este plan se ejecutó.**
  - El TypeScript de `tools/content` y de `qa/` sale de leer `master` (`431c9d90`).
  - El de la página, del plan de F7b y de `impl-f7a` (`fc88d450`).
  - El PHP, de `master` y de `impl-b3` (`72574433`).
  - Los ayudantes de Pest (`Browser`, `signIn`, `withHeader`) y de las E2E (`compiler.answer`, `levelButton`, `reviewHeading`) se leyeron en `master` y en `impl-f7a`; si F7b los cambia, la tarea usa los de `master`.
- **F7b y F10 pueden cambiar archivos que este plan nombra.** T001 fija la variante, y cada tarea dice qué hacer si el archivo difiere.
- **El `down()` de la migración** falla con filas de Esenciales: es la vuelta atrás hacia adelante del ADR. Se aceptó.
- **Entre T003 y S2, `npm test` de `e1/base` está en rojo a propósito.** `e1/base` no va sola a `master`, como en B2.
- **El texto de la etapa piloto** es de C y de U. Si la revisión se demora, el PR espera (T019), pero la onda 2 no.

## Complexity Tracking

Sin violaciones de la constitución. La única complejidad agregada es `derivedKeysOf` en el generador, si el ternario de T003 supera el aviso de complejidad.
