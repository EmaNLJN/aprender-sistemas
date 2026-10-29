# Research: E1 · La sesión Esenciales

Decisiones técnicas del plan, con sus alternativas, la tabla de Context7 y lo que se midió en sólo lectura. Base: `master` en `431c9d90` (F2a, F2b, A2, F4 y el tope del HTML en 1 500 000), con F7a leída de `impl-f7a` (`fc88d450`), B3 de `impl-b3` (`72574433`) y el plan de F7b (`specs/021-f7-laboratorio/plan-f7b.md`). Spec: [spec.md](./spec.md), con el clarify del 2026-10-28 (Q1 a Q5, opción A).

## R1. Esenciales vive como una sección de cada manifiesto

**Decisión.** `content/<lenguaje>/manifest.yaml` suma una clave `essentials:` al final, después de `systems:`, con la forma de una etapa de `lab` sin `level`. Los ejercicios van en `content/<lenguaje>/exercises/<id>/`, como todos.

**Por qué.** `loadLanguage` (`tools/content/exercises.ts`) numera las etapas por secciones, en el orden de `sectionsOf`: `lab`, `quests` y los cuatro dominios. Una sección agregada al final empieza en la etapa 50 y deja intactos los 274 `stage` (D13, «Trampa de E1»). Reutiliza la validación de archivos, de pruebas, de pistas y del encabezado de Go.

**Alternativas.** Una carpeta `content/essentials/`: pide un cargador nuevo, y `expectOnlyEntries` y `qa/content-tools-check.ts` la rechazan hoy. Las primeras etapas de `lab`: corren las 274 etapas y cambian sus `content_hash`.

**La consecuencia, más adelante.** Una etapa nueva en `lab`, `quests` o `systems` correría las de Esenciales, que cambiarían su `stage` y su `content_hash`, pero no su ID, su `grading_hash` ni lo que ve el alumno. El ADR 0009 fija la regla: una etapa nueva va al final de su sección, y sumarla fuera de `essentials` es un ítem propio (plan, T018).

## R2. El nivel lo fija la sección, y sólo los ejercicios lo tienen

**Decisión.**
- `frontend/src/shared/config/levels.ts` suma `ESSENTIALS_LEVEL`, `EXERCISE_LEVEL_IDS` (`essentials` y los cuatro de siempre) y `EXERCISE_LEVEL_LABELS`. `LEVEL_IDS` y `LEVEL_LABELS` no cambian.
- El generador deriva `level: essentials` en cada ejercicio de la sección, como deriva `challengeType` en los desafíos. Lo rechaza en `exercise.yaml`, en la etapa y en cualquier otra sección.
- La base amplía sólo `exercises.level`. `workshops.level`, `worlds.level` y `atlas_concepts.level` no cambian.

**Por qué.** `LEVEL_IDS` lo usan el Atlas (`AtlasFilters` y `LevelMeter`, que dibuja una marca por nivel), el validador de la campaña y los validadores del generador para el Atlas, la campaña y los talleres. Crecerlo cambiaría el Atlas a la vista (contra FR-033) y haría que el generador acepte un nivel que la base no tiene (contra FR-012). Con una lista aparte para los ejercicios, esas vistas y esas columnas no se tocan.

**Alternativa descartada.** Una sola lista de cinco y filtros en cada vista para esconder Esenciales: más código en el Atlas, tres migraciones más y una regla repetida.

## R3. El orden: Esenciales primero en el catálogo de ejercicios

**Decisión.** `createExerciseCatalog` (`frontend/src/entities/exercise/model/exercise-catalog.ts`) pone primero `rustEssentials` y `goEssentials`. Como la lista del laboratorio es ese catálogo filtrado por lenguaje, el mapa, el recorrido libre y la posición «X / Y» lo siguen (FR-028).

**Por qué.** Hay un solo orden. `rust-137` y `go-137` siguen siendo los últimos, así que la E2E de F7a «the last exercise of the language goes back to the map» no cambia.

## R4. «Un desafío para hoy» deja afuera a Esenciales para quien ya avanzó

**Decisión.** `todayChallenge` (`frontend/src/pages/lab/model/map-selectors.ts`, de F7a) arma sus candidatos como hoy. Si el filtro es «Todos los niveles» y el alumno resolvió algún ejercicio del lenguaje que no es de Esenciales, saca a Esenciales de los candidatos.

**Por qué.** Antes de E1 los candidatos no tenían Esenciales. Sacarlos reproduce exactamente la sugerencia de antes para quien ya avanzó (FR-028), y con el progreso vacío la primera candidata es `rust-138`.

## R5. El número de la tarjeta sale de un selector

**Decisión.** `topicNumber(first, exercises)` en `map-selectors.ts`. Para un tema de Esenciales devuelve su posición entre los temas de Esenciales del lenguaje (1, 2…); para los demás, `first.stage`. `TopicGrid` lo dibuja con dos cifras.

**Por qué.** La etapa publicada es 50 (R1) y no se cambia. El número que ve el alumno es una regla de la página, y se prueba con Vitest.

## R6. Las porciones: dos nuevas, después de `guide`

**Decisión.**
- El generador publica `curriculum.essentials` como la última clave del documento.
- `portionsOf` suma `essentials.rust` y `essentials.go` después de `guide`.
- `Portion` de la API suma `EssentialsRust` y `EssentialsGo` entre `Guide` y `Harness`.

**Por qué.** `ContentMeta` exige que las claves de `portions` del meta sean exactamente `Portion::cases()`, en orden. Sumar al final conserva el prefijo de las 17 y los nombres que ya guardaron las copias.

## R7. La sección es obligatoria en los dos lenguajes, y lo controla el documento

**Decisión.** `expectEssentials(exercises, language)` en `tools/content/exercises.ts` falla si un lenguaje no trae ejercicios de Esenciales, y `loadCurriculumSource` la llama para los dos. `MANIFEST_OPTIONAL` deja `essentials` opcional en el manifiesto, así que las pruebas con manifiestos parciales siguen valiendo.

**Por qué.** `findPortionProblem` rechaza una porción vacía, y el ADR 0006 §10 no prevé un catálogo vacío.

## R8. Sin globales: el laboratorio lee Esenciales con `getContent()`

**Decisión.** `exerciseCatalog.init` suma los dos grupos con `getContent().essentials`, en el archivo de `app/` que lo llama cuando E1 entra: `frontend/src/app/legacy/lab-api.ts` (F7b) o la raíz de F10 (FR-051 de la spec 024). No hay `window.RUST_ESSENTIALS`.

**Por qué.** El hallazgo E1-7 y F10-Q3. La regla R5 de `seams-guard` deja leer `getContent()` sólo en `app/`, y los dos lugares están ahí.

## R9. La migración del nivel: sin forzar el algoritmo

**Decisión.** `ALTER TABLE exercises MODIFY level ENUM(... ,'essentials') ... NULL`, sin `ALGORITHM`. Va sola en su migración, con el `down()` que vuelve a la lista de cuatro.

**Por qué.**
- El manual de MySQL dice que sumar un miembro al final de un ENUM es instantáneo si no cambia el tamaño de almacenamiento (de 4 a 5 miembros sigue en 1 byte).
- `OnlineDdlTest` midió en `mysql:9.7` que, con un CHECK sobre un DATETIME en la tabla, el ENUM no se amplía con `ALGORITHM=INSTANT` (error 1845, bug #121124). `exercises` tiene uno: `exercises_lifecycle_check` mira `retired_at`.
- Por eso MySQL elige otro algoritmo. Con unos 300 registros, el COPY dura milisegundos, y `docker/migrate.sh` acota la espera de bloqueos (D35).

**Vuelta atrás.** El `down()` falla si hay una fila con `essentials`, a propósito: el ADR 0006 §10 dice que E1 se vuelve atrás hacia adelante, retirando el catálogo.

## R10. La línea base congelada

**Decisión.** T001 escribe `qa/fixtures/content-baseline-e1.json` desde el `build/` de la base: las huellas de las 17 porciones, y la etapa y las tres huellas de los 274 ejercicios. `qa/content-baseline-check.ts` lo compara en dos niveles (FR-039): dentro de `npm test`, que los 274 siguen y conservan su etapa; con `--full`, como compuerta de E1 (T016 y T019), los bytes y las huellas de todo (SC-001).

**Por qué.** SC-001 pide 0 diferencias contra la base, y el contrato tiene que estar escrito, no recalculado. Pero la comparación completa en `npm test` congelaría el mantenimiento del contenido: corregir un texto, una pista o los bugs de `rust-63` y `rust-71` cambia huellas a propósito. La etapa sí es un invariante permanente (D13).

## R11. La auditoría ordena Esenciales primero

**Decisión.** En `backend/api/app/Audit/AuditCatalogReader.php` (B3), el orden pasa a ser `field(catalog, 'essentials', 'lab', 'quests', 'cores')`, con su caso en `AuditCatalogReaderTest`.

**Por qué.** El hallazgo E1-1: hoy un catálogo que no está en la lista da 0 en `FIELD()` y queda primero por accidente. Nombrarlo lo vuelve una regla (FR-022).

## R12. Lo que no cambia, verificado en el código

- **La admisión de `/api/runs`** lee el ejercicio activo por ID (`ExerciseReader`), sin mirar el catálogo (FR-017).
- **El validador de la campaña** exige `^(rust|go)-\d+$`: `rust-138` lo cumple (FR-021).
- **`isExtraChallenge`** mira las etapas 16 a 20, y la 50 queda afuera (FR-030).
- **El mapa de exploradores** es explícito por ID, y Esenciales no tiene entrada (FR-034).
- **La forma de ID de la API** (`ExerciseId`) acepta `rust-138`.
- **`ContentRows`** recorre `Portion::CATALOGS`, así que basta con sumar el código ahí. Los `match` de `ContentReader::rows` y `PortionAssembler::assemble` nombran los grupos y necesitan el brazo nuevo.

## Context7 (segundo servidor, 2026-10-28)

| Librería | Versión del lockfile | Tema consultado | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Laravel (`/laravel/docs`, 13.x) | `laravel/framework` 13.34.0 | `DB::statement` para DDL en una migración, `up` y `down` | Es el método para sentencias sin resultado. Coincide con las migraciones de C3 (`alter_users_table`, `alter_failed_jobs_table`) | No |
| MySQL (`/websites/dev_mysql_doc`) | imagen `mysql:9.7` | Ampliar un ENUM al final, `ALGORITHM=INSTANT` y tamaño de almacenamiento | Es instantáneo si no cambia el tamaño, y agregar en el medio renumera y copia. El D07 medido en el proyecto manda: con un CHECK sobre un DATETIME, INSTANT da 1845 | Sí: R9 no fuerza `ALGORITHM` |
| Pest (`/pestphp/docs`, 5.x) | `pestphp/pest` 5.3.0 | `->with([...])` con datasets con nombre, `toBe` y `toHaveCount` | Los datasets con claves de texto nombran cada caso, como en `PortionTest` | No |
| Vitest (`/vitest-dev/vitest/v5.0.3`) | 5.0.3 | `test.each` con objetos y `$propiedad` en el título; `toEqual` | `it.each` es alias de `test.each`; los títulos admiten `$campo` | No |
| Testing Library (`/testing-library/testing-library-docs`) | `@testing-library/react` 16.3.3 | `getAllByRole('button', { name })` y la opción `pressed` | `getByRole` filtra por nombre accesible y por `pressed`; el orden de los botones se lee con `getAllByRole` dentro del grupo | No |
| Playwright (`/microsoft/playwright/v1.63.0`) | `@playwright/test` 1.63.0 | `expect(page).toHaveURL(regex)` y `toBeEnabled` | `toHaveURL` acepta una expresión regular y reintenta hasta el plazo | No |
| React (`/websites/react_dev`) | 19.2.8 | Listas con `map` y `key` estable | La `key` sale del dato (`id` o `topicId`), nunca del índice: `LevelTabs` usa el id del nivel y `TopicGrid` el `topicId`, como en F7b | No |

PHPStan (Larastan 3, nivel 9) no se consultó: E1 no cambia su configuración, y cada tarea de PHP cierra con `npm run api:analyse`.

## Mediciones de sólo lectura

Sin Docker, sin `npm` y sin descargas, sobre `master` (`431c9d90`) y los worktrees de implementación:
- cada manifiesto tiene 49 etapas: 20 de `lab`, 4 de `quests` y 25 de `systems`;
- `ContentMeta::portions` compara `array_keys` con `Arr::pluck(Portion::cases(), 'value')`, así que el orden importa;
- `ActiveCatalogs` ordena por `chain_position IS NULL`, por la posición y por el código, así que `GET /api/session` da `essentials`, `cores`, `lab` y `quests`;
- `ContentFixture::withoutExercise` y `fromImage` recorren `['lab', 'quests', 'cores']` (`tests/Support/ContentFixture.php:57` y `:180`), igual que `ExerciseRecordsTest:17` y `WorkshopRecordsTest:78`;
- las E2E que esperan `rust-01` al pulsar «Entrar al laboratorio» son `qa/e2e/specs/views.spec.ts:82` y `reload.spec.ts:152`;
- `lab-map.spec.ts` de F7a fija `137`, `8/137 resueltos`, `49 temas` y `137 desafíos visibles.`;
- los checks de `qa/` con totales fijos son `systems-check` (274, 137 y 113 a 137), `campaign-content-check` (274), `project-kit-check` (274), `api-sync-check` y `api-import-check` (274 sembrados), `curriculum-meta-check` (17) y `dist-content-check` (17). `content-check` fija la estructura por lenguaje.
