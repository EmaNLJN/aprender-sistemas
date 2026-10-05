# Data Model: C6 · Registros tipados del contenido

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Decisiones**: [research.md](./research.md)

C6 no cambia el esquema: las 21 tablas son las de [`specs/001-c2-contenido-mysql/data-model.md`](../001-c2-contenido-mysql/data-model.md). Este archivo fija la forma de cada registro tipado: sus propiedades, de qué clave del documento y de qué columna sale cada una, y las firmas exactas que se reparten las tareas. Los campos, columnas y mensajes salen del código de C2 (`app/Content/Codec/` y `ContentSource::validateMeta`), que los registros reemplazan.

## Reglas comunes

- **Ubicación.** `backend/api/app/Content/Record/`, espacio de nombres `App\Content\Record`. Cada clase es `final readonly`, con constructor público y propiedades promovidas, en el orden de las tablas de abajo. `ContentMeta` vive en `app/Content/`.
- **Conversiones** (FR-002):
  - `fromDocument(...)` lee con `DocumentFields`, en el orden de la tabla, que es el del `FieldMap` de C2. Un documento con un solo error da el mismo mensaje (FR-008).
  - `fromRow(array $row, ...)` lee con `RowFields`. Los hijos llegan ya construidos y en el orden de `position`.
  - `toRow()` devuelve `array<string, int|string|null>`, con las mismas columnas que la fila de C2: ni una más ni una menos. Una bandera se guarda como `0` o `1`. El orden de las columnas no importa, porque el query builder ordena cada fila.
  - `toPublished()` devuelve `stdClass` y publica con `KeyOrder::publish()`, en el orden de `key_order`. `KEYS`, la constante pública de cada registro, lista sus claves publicadas, derivadas incluidas, en el orden de C2. Se usa para rechazar claves desconocidas y para validar `key_order`.
  - Los registros con hijos suman `rowsByTable(): array<string, list<array<string, int|string|null>>>`: su fila y las de sus hijos, por tabla, en el orden en que las devolvía su códec.
- **Ausente no es nulo** (FR-004). Una propiedad `?` vale `null` cuando su clave falta en el documento, y sólo se publica si está en `key_order`.
- **Rutas.** El argumento `$path` es la ruta JSON del registro en el documento, como en C2: `lab.rust[3]`, `workshops.infra[0].steps[2]`, `guide.tracks.go.modules[1]`. Los mensajes son `InvalidContent::at(archivo, ruta, problema)`.
- **Filas imposibles.** Una fila que `RowFields` no puede leer lanza `LogicException`: falta una columna, trae otro tipo o tiene una clave de `key_order` desconocida. Esas filas no las escribe el import.

## Lectores compartidos

| Clase | Qué hace | Firmas |
| --- | --- | --- |
| `KeyOrder` | El orden de claves publicadas (`key_order`) | `public array $keys` (`list<string>`); `static of(stdClass $record): self`; `static fromRow(string $json, list<string> $known): self`; `has(string $key): bool`; `toRow(): string`; `publish(array<string, mixed> $values): stdClass` |
| `JsonValue` | Un valor JSON anidado, opaco | `public string $json`; `static fromDocument(mixed $value): self`; `static fromRow(string $json): self`; `toRow(): string`; `toPublished(): mixed` |
| `DocumentFields` | Lee un registro del documento con los mensajes de C2 | `static of(stdClass $record, string $path, list<string> $known): self`; `text`, `optionalText`, `number`, `flag`, `json` y `optionalJson` (cada uno recibe `string $key`); `keyOrder(): KeyOrder` |
| `RowFields` | Lee una fila como la devuelve el driver | `__construct(array<string, mixed> $row, string $table)`; `string`, `nullableString`, `int`, `nullableInt`, `flag`, `json` y `nullableJson` (cada uno recibe `string $column`); `keyOrder(list<string> $known): KeyOrder` |

Los mensajes de `DocumentFields` son los de `FieldMap::toColumns`:

- `«{ruta}.{clave}: clave desconocida»`, antes de leer cualquier campo;
- `«{ruta}: falta la clave «{clave}»»`;
- `«{ruta}.{clave}: se esperaba un texto no vacío»`;
- `«… se esperaba un entero»`;
- `«… se esperaba true o false»`.

`json` acepta cualquier valor, `null` incluido, como el `FieldType::Json` de C2.

Hay algo que `RowFields` acepta y que C2 también aceptaba: un entero como `int` o como texto de dígitos, y una bandera como `0`, `1`, `'0'` o `'1'`. Del resto, `string` exige texto, `nullable*` acepta `NULL`, y `keyOrder` lee la columna `key_order`.

## Ejercicios

**`Exercise`**: `lab.<lenguaje>[i]`, `quests.<lenguaje>[i]` o `cores.<dominio>[i]` ↔ `exercises`.

`KEYS` tiene 25 claves en este orden:

- las 21 propias: `id`, `language`, `topicId`, `stage`, `level`, `challengeType`, `kind`, `minutes`, `visual`, `title`, `intro`, `why`, `objective`, `transfer`, `starter`, `solution`, `imports`, `sources`, `instructions`, `review` y `prediction`;
- las 4 derivadas: `topic`, `workshopId`, `tests` y `hints`.

| Propiedad | Tipo | Documento | Columna |
| --- | --- | --- | --- |
| `id` | `string` | `id` | `id` |
| `catalog` | `string` | (contexto) | `catalog` |
| `domain` | `?string` | (contexto: sólo `cores`) | `domain` |
| `position` | `int` | (índice en su lista) | `position` |
| `language` | `string` | `language` | `language` |
| `topic` | `Topic` | `topicId` y `topic` | `topic_key` (la etiqueta va en `topics`) |
| `stage` | `int` | `stage` | `stage` |
| `level` | `?string` | `level` (opcional) | `level` |
| `challengeType` | `?string` | `challengeType` (opcional) | `challenge_type` |
| `kind`, `visual`, `title`, `intro`, `why`, `objective`, `transfer`, `starter` y `solution` | `string` | la clave del mismo nombre | la columna del mismo nombre |
| `minutes` | `int` | `minutes` | `minutes` |
| `imports`, `sources`, `instructions`, `review` y `prediction` | `JsonValue` | la clave del mismo nombre | `<clave>_json` |
| `workshopId` | `?string` | (contexto: el taller que lo lista en `code`) | `workshop_id` |
| `hashes` | `ExerciseHashes` | (meta) | `content_hash`, `grading_hash` y `starter_hash` |
| `keyOrder` | `KeyOrder` | (las claves del registro) | `key_order` |
| `tests` | `list<ExerciseTest>` | `tests` | (`exercise_tests`) |
| `hints` | `list<ExerciseHint>` | `hints` | (`exercise_hints`) |

**Firmas**:

- `static fromDocument(stdClass $exercise, string $catalog, ?string $domain, int $position, ExerciseHashes $hashes, ?string $workshopId, string $path): self`
- `static fromRow(array $row, list<ExerciseTest> $tests, list<ExerciseHint> $hints, Topic $topic): self`
- `toRow()`, `toPublished()` y `rowsByTable()`, que devuelve `exercises`, `topics`, `exercise_tests` y `exercise_hints`.

**Validación al leer el documento**, en el orden de `ExerciseCodec::toRows`:

1. `topic`: un texto no vacío en `{ruta}.topic`.
2. Los campos de la tabla.
3. `tests`: una lista no vacía, con un objeto en cada `{ruta}.tests[i]`.
4. `hints`: una lista no vacía. Sus mensajes son «se esperaba una lista no vacía» y «se esperaba un objeto».

**Lo que publica**:

- `topicId` es `topic->topicKey` y `topic` es `topic->label`;
- `workshopId` es la propiedad, y sólo aparece si está en `key_order` (16 núcleos);
- `tests` son los publicados de cada prueba, y `hints`, los textos.

**`ExerciseTest`**: `tests[i]` ↔ `exercise_tests`. `KEYS`: `id`, `label`, `expression`, `why` y `failure`.

- **Propiedades:**
  - `exerciseId` es `string`, de la columna `exercise_id`;
  - `testKey` es `string`, de la clave `id` y la columna `test_key`;
  - `position` es `int`;
  - `label`, `expression`, `why` y `failure` son `string`;
  - `keyOrder`.
- **Firmas:** `static fromDocument(stdClass $test, string $exerciseId, int $position, string $path)` y `static fromRow(array $row)`.
- **Fila:** `exercise_id`, `test_key`, `label`, `expression`, `why`, `failure`, `position` y `key_order`.

**`ExerciseHint`** *(fila auxiliar)*: `hints[i]` ↔ `exercise_hints`.

- **Propiedades:** `exerciseId`, `position` (`int`) y `text`.
- **Firmas:** `static fromDocument(mixed $hint, string $exerciseId, int $position, string $path)`, que exige un texto no vacío en `$path`, y `static fromRow(array $row)`.
- **Fila:** `exercise_id`, `position` y `text`. Lo publica el padre, como texto.

**`Topic`** *(fila auxiliar)*: ↔ `topics`.

- **Propiedades:** `language`, `topicKey` y `label`. Lo construye `Exercise::fromDocument` con `new Topic(...)`.
- **Firma:** `static fromRow(array $row)`.
- **Fila:** `language`, `topic_key` y `label`. `ContentRows` lo agrega una vez por `language` y `topic_key`, y rechaza dos etiquetas distintas como en C2.

**`ExerciseHashes`** (parte del meta):

- **Propiedades:** `contentHash`, `gradingHash` y `starterHash`.
- **Firma:** `static fromDocument(mixed $hashes, string $exerciseId)`. Exige un sha256 en hexadecimal en cada clave, en ese orden; si no lo hay, lanza «`curriculum.meta.json: exercises.{id}.{clave}: se esperaba un sha256 en hexadecimal`».

## Talleres

**`Workshop`**: `workshops.<dominio>[i]` ↔ `workshops`.

`KEYS` tiene 19 claves en este orden:

- las 15 propias: `id`, `category`, `model`, `level`, `minutes`, `title`, `subtitle`, `story`, `what`, `why`, `limits`, `uses`, `prediction`, `sources` y `bridge`;
- las 4 derivadas: `objectives`, `steps`, `code` y `related`.

| Propiedad | Tipo | Documento | Columna |
| --- | --- | --- | --- |
| `id`, `category`, `model`, `level`, `title`, `subtitle`, `story`, `what`, `why` y `limits` | `string` | la clave del mismo nombre | la columna del mismo nombre |
| `domain` | `string` | (contexto) | `domain` |
| `position` | `int` | (índice) | `position` |
| `minutes` | `int` | `minutes` | `minutes` |
| `uses`, `prediction`, `sources` y `bridge` | `JsonValue` | la clave | `<clave>_json` |
| `keyOrder` | `KeyOrder` | | `key_order` |
| `objectives` | `list<WorkshopObjective>` | `objectives` | (`workshop_objectives`) |
| `steps` | `list<WorkshopStep>` | `steps` | (`workshop_steps`) |
| `related` | `array<string, list<WorkshopRelatedExercise>>` | `related`, por lenguaje | (`workshop_related_exercises`) |
| `code` | `array<string, string>` | `code`, por lenguaje | (sale de `exercises.workshop_id`) |
| `languages` | `list<string>` | (contexto: el orden de `languages`) | — |

**Firmas**:

- `static fromDocument(stdClass $workshop, string $domain, int $position, list<StepKey> $stepKeys, list<string> $languages, array<string, string> $code, array<string, list<string>> $related, string $path): self`. `ContentRows` valida `code` y `related` antes y los pasa ya tipados (research.md, R11).
- `static fromRow(array $row, list<WorkshopObjective> $objectives, list<WorkshopStep> $steps, array<string, list<WorkshopRelatedExercise>> $related, array<string, string> $code, list<string> $languages): self`
- `toRow()`, `toPublished()` y `rowsByTable()`, que devuelve `workshops`, `workshop_objectives`, `workshop_steps` y `workshop_related_exercises`.

**Validación al leer el documento**, en el orden de `WorkshopCodec::toRows`:

1. Los campos de la tabla.
2. `objectives`: una lista no vacía de objetos.
3. `steps`: una lista no vacía de objetos.
4. Tantas claves de etapa como etapas. Si no coinciden, lanza «`curriculum.meta.json: workshopSteps.{id}: {n} claves para {m} etapas: regenerá los dos archivos juntos`».

Un ejercicio relacionado toma como `position` su índice dentro de la lista de su lenguaje.

**Lo que publica**:

- `objectives` y `steps` son sus publicados;
- `code` y `related` son objetos con un valor por lenguaje, en el orden de `languages`, y `null` si falta uno;
- `related` lista los `exerciseId` en el orden de `position`.

**`WorkshopObjective`**: `objectives[i]` ↔ `workshop_objectives`. `KEYS`: `id`, `label` y `why`.

- **Propiedades:** `workshopId`; `objectiveKey`, de la clave `id` y la columna `objective_key`; `position`; `label`; `why`; `keyOrder`.
- **Firmas:** `static fromDocument(stdClass $objective, string $workshopId, int $position, string $path)` y `static fromRow(array $row)`.
- **Fila:** `workshop_id`, `objective_key`, `label`, `why`, `position` y `key_order`.

**`WorkshopStep`**: `steps[i]` ↔ `workshop_steps`. `KEYS`: `title`, `task`, `why` y `done`.

- **Propiedades:** `workshopId`, `stepKey`, `position`, `v1Position` (`?int`), `title`, `task`, `why`, `done` y `keyOrder`.
- **Firmas:** `static fromDocument(stdClass $step, string $workshopId, int $position, StepKey $key, string $path)` y `static fromRow(array $row)`.
- **Fila:** `workshop_id`, `step_key`, `title`, `task`, `why`, `done`, `position`, `v1_position` y `key_order`. La clave y el índice v1 no se publican (C2 FR-030).

**`WorkshopRelatedExercise`** *(fila auxiliar)*: ↔ `workshop_related_exercises`.

- **Propiedades:** `workshopId`, `exerciseId` y `position`.
- **Firma:** `static fromRow(array $row)`.
- **Fila:** `workshop_id`, `exercise_id` y `position`.

**`StepKey`** (parte del meta):

- **Propiedades:** `id` y `v1Index` (`?int`).
- **Firma:** `static fromDocument(mixed $key, string $path)`. Si la clave no es `{id: texto, v1Index: null o entero ≥ 0}`, lanza «`curriculum.meta.json: workshopSteps.{taller}[i]: se esperaba {id, v1Index}`».

## Mundos

**`World`**: `campaign.<lenguaje>[i]` ↔ `worlds`.

`KEYS` tiene 14 claves en este orden:

- las 11 propias: `id`, `level`, `title`, `subtitle`, `story`, `why`, `badge`, `concepts`, `guide`, `checkpoint` y `sources`;
- las 3 derivadas: `trainingIds`, `challengeIds` y `bossId`.

| Propiedad | Tipo | Documento | Columna |
| --- | --- | --- | --- |
| `id`, `level`, `title`, `subtitle`, `story`, `why` y `badge` | `string` | la clave | la columna |
| `language` | `string` | (contexto) | `language` |
| `position` | `int` | (índice) | `position` |
| `concepts`, `guide`, `checkpoint` y `sources` | `JsonValue` | la clave | `<clave>_json` |
| `keyOrder` | `KeyOrder` | | `key_order` |
| `members` | `list<WorldExercise>` | `trainingIds`, `challengeIds` y `bossId` | (`world_exercises`) |

**Firmas**:

- `static fromDocument(stdClass $world, string $language, int $position, string $path): self`
- `static fromRow(array $row, list<WorldExercise> $members): self`
- `toRow()`, `toPublished()` y `rowsByTable()`, que devuelve `worlds` y `world_exercises`.

**Validación al leer el documento**, en el orden de `WorldCodec::toRows`:

1. Los campos de la tabla.
2. `trainingIds` y `challengeIds`: cada una, una lista no vacía de textos. Si no, lanza «`{ruta}.{clave}: se esperaba una lista de IDs`».
3. `bossId` tiene que ser el último de `challengeIds`. Si no, lanza «`{ruta}.bossId: el jefe tiene que ser el último de challengeIds`».

**Miembros**:

- cada entrenamiento es `Training`, con su índice como posición;
- cada desafío es `Challenge`, o `Boss` si es el jefe, con su índice en `challengeIds`.

**Lo que publica**:

- `trainingIds` son los `Training`, en el orden de `position`;
- `challengeIds` son los `Challenge` y el `Boss`, en el orden de `position`;
- `bossId` es el del `Boss`, o `null`.

**`WorldExercise`** *(fila auxiliar)*: ↔ `world_exercises`.

- **Propiedades:** `worldId`, `exerciseId`, `role` (`WorldRole`) y `position`.
- **Firma:** `static fromRow(array $row)`. Un rol desconocido lanza `LogicException`.
- **Fila:** `world_id`, `exercise_id`, `role` (el valor del enum) y `position`.

**`WorldRole`**: enum de texto con `Training = 'training'`, `Challenge = 'challenge'` y `Boss = 'boss'`. Lo deriva PHP, no viene del documento, así que no agrega rechazos (FR-008).

## Atlas

**`AtlasConcept`**: `atlas.<lenguaje>[i]` ↔ `atlas_concepts`. Es el piloto (T004), y su código de referencia está verificado en [plan.md](./plan.md).

`KEYS`: `id`, `level`, `category`, `title`, `summary`, `why`, `code`, `explanation`, `comparison`, `pitfall`, `quiz`, `labId`, `source` y `furtherSources`.

- **Propiedades:**
  - `id`, `language`, `position`, `level`, `category`, `title`, `summary`, `why`, `code`, `explanation`, `comparison` y `pitfall`;
  - `quiz` (`JsonValue`);
  - `labExerciseId`, de la clave `labId` y la columna `lab_exercise_id`;
  - `source` (`JsonValue`);
  - `furtherSources` (`?JsonValue`, opcional: sólo 2 de los 32 conceptos lo tienen);
  - `keyOrder`.
- **Firmas:** `static fromDocument(stdClass $concept, string $language, int $position, string $path)` y `static fromRow(array $row)`.
- **Fila:** la de C2. Las columnas JSON son `quiz_json`, `source_json` y `further_sources_json`.

## Guía

**`Guide`** (raíz, sin fila):

- **Propiedades:** `resources` (`list<GuideResource>`), `tracks` (`array<string, GuideTrack>`, por lenguaje y en el orden de `languages`) y `sources` (`list<GuideSource>`).
- **Firmas:**
  - `static fromDocument(stdClass $guide, list<string> $languages, string $path)`;
  - `PortionAssembler` la construye con `new Guide(...)`;
  - `toPublished()` publica `resources`, `tracks` y `sources` en ese orden fijo, el único orden fijo, como en C2;
  - `rowsByTable()` devuelve las seis tablas en el orden de `GuideCodec`: `guide_resources`, `guide_sources`, `guide_tracks`, `guide_modules`, `guide_steps` y `guide_step_resources`.
- **Validación al leer el documento**, en el orden de `GuideCodec::toRows`:
  1. Las claves de la raíz.
  2. `resources` y `sources`: listas no vacías de objetos.
  3. `tracks`: un objeto con los lenguajes en el orden de `languages`. Si no lo es, lanza «`{ruta}.tracks: un recorrido por lenguaje, en el orden de languages: rust, go`».
  4. Cada recorrido.

**`GuideResource`**: `resources[i]` ↔ `guide_resources`. `KEYS`: `id`, `title`, `url`, `languages`, `category`, `cost`, `format`, `description`, `why`, `caveat` y `featured`.

- **Propiedades:** las del mismo nombre; `languages` es `JsonValue` (columna `languages_json`) y `featured` es `bool` (columna `featured`, 0 o 1). Suma `position` y `keyOrder`.
- **Firmas:** `fromDocument(stdClass $resource, int $position, string $path)` y `fromRow(array $row)`.

**`GuideSource`**: `sources[i]` ↔ `guide_sources`, cuya clave primaria es `position`. `KEYS`: `title`, `url` y `note`.

- **Propiedades:** `position`, `title`, `url`, `note` y `keyOrder`.
- **Firmas:** `fromDocument(stdClass $source, int $position, string $path)` y `fromRow(array $row)`.

**`GuideTrack`**: `tracks.<lenguaje>` ↔ `guide_tracks`. `KEYS`: `title`, `description` y `modules`.

- **Propiedades:** `language`, `title`, `description`, `keyOrder` y `modules` (`list<GuideModule>`).
- **Firmas:** `fromDocument(stdClass $track, string $language, string $path)` y `fromRow(array $row, list<GuideModule> $modules)`.
- **Fila:** `language`, `title`, `description` y `key_order`.

**`GuideModule`**: `modules[i]` ↔ `guide_modules`. `KEYS`: `id`, `title`, `subtitle` y `steps`.

- **Propiedades:** `id`, `trackLanguage`, `position`, `title`, `subtitle`, `keyOrder` y `steps` (`list<GuideStep>`).
- **Firmas:** `fromDocument(stdClass $module, string $trackLanguage, int $position, string $path)` y `fromRow(array $row, list<GuideStep> $steps)`.
- **Fila:** `id`, `title`, `subtitle`, `track_language`, `position` y `key_order`.

**`GuideStep`**: `steps[i]` ↔ `guide_steps`. `KEYS`: `id`, `title`, `minutes`, `objective`, `task`, `doneWhen`, `quiz` y `resourceIds`.

- **Propiedades:** `id`, `moduleId`, `position`, `title`, `minutes` (`int`), `objective`, `task`, `doneWhen` (columna `done_when`), `quiz` (`JsonValue`, columna `quiz_json`), `keyOrder` y `resources` (`list<GuideStepResource>`).
- **Firmas:** `fromDocument(stdClass $step, string $moduleId, int $position, string $path)` y `fromRow(array $row, list<GuideStepResource> $resources)`.
- **Validación:**
  - `resourceIds` tiene que ser una lista no vacía. Si no, lanza «`{ruta}.resourceIds: se esperaba una lista de recursos`».
  - Un elemento que no es texto lanza el mensaje que C2 daba después, en `ContentRows`: «`curriculum.json: guide.steps.{id}.resourceIds: «{valor}» no es un recurso de guide.resources`». El valor va tal cual si es texto, o en JSON si no.
- **Lo que publica:** `resourceIds` son los `resourceId` en el orden de `position`.

**`GuideStepResource`** *(fila auxiliar)*: ↔ `guide_step_resources`.

- **Propiedades:** `stepId`, `resourceId` y `position`.
- **Firma:** `fromRow(array $row)`.
- **Fila:** `step_id`, `resource_id` y `position`.

## Idiomas, catálogos y meta

**`Language`** *(fila auxiliar)*: ↔ `languages`.

- **Propiedades:** `code` y `position` (`int`). `ContentRows` lo construye con la posición del meta, más uno.
- **Firma:** `fromRow(array $row)`, que usa `ContentReader::languages()`.
- **Fila:** `code` y `position`.

**`Catalog`** *(fila auxiliar)*: una entrada de `catalogs` del meta ↔ `catalogs`.

- **Propiedades:** `code`, `sliceBy` y `chainPosition` (`?int`).
- **Firma:** `static fromDocument(mixed $entry, string $path)`. Una entrada que no es `{code, sliceBy: language|domain, chainPosition: null o entero ≥ 1}` lanza «`curriculum.meta.json: catalogs[i]: se esperaba {code, sliceBy, chainPosition}`».
- **Fila:** `code`, `slice_by` y `chain_position`. No tiene `fromRow` hasta que alguien lea la tabla (C3).

**`ContentMeta`** (`app/Content/ContentMeta.php`): `curriculum.meta.json`.

- **Propiedades:**
  - `documentHash`;
  - `sourceCommit` (`?string`);
  - `languages` (`list<string>`);
  - `catalogs` (`list<Catalog>`);
  - `portionHashes` (`array<string, string>`, las 17, en el orden de la API);
  - `exerciseHashes` (`array<string, ExerciseHashes>`, por ID);
  - `workshopSteps` (`array<string, list<StepKey>>`, por ID de taller).
- **Firmas:**
  - `static fromDocument(array $meta): self`, con las comprobaciones y los mensajes de `ContentSource::validateMeta`, en su orden: `sourceCommit`, `languages`, `catalogs`, `portions`, `exercises` y `workshopSteps`;
  - `portionHash(Portion $portion): string`.

**`ContentSource`** guarda `public ContentMeta $meta` en lugar del arreglo, y conserva `documentHash()`, `sourceCommit()`, `languages()` y `part()`. La comparación de la huella del documento con su sha256 sigue antes de construir el meta.

## Fuera de los registros

- **`RowSet`, `ContentDiff`, `ContentPlan` y `ContentWriter`** siguen con filas (Q2). `ContentDiff` estrecha con `RowFields` las columnas que lee por su nombre.
- **`LatestImport` y `ContentReport`** ya eran objetos inmutables y no cambian.
- **`PortionAssembler::exercise(array $exercise, list<array<string, mixed>> $tests, list<array<string, mixed>> $hints, ?array $topic): Exercise`** es, con `ContentMeta`, la única interfaz pública nueva fuera de `Record/`. La usan `exerciseList` y `PortionRenderer::renderExercise()`. Un tema que falta lanza `LogicException` (research.md, R10).
- **`ContentReader::exercise()`** devuelve la fila del tema (`?array`) en lugar de su etiqueta.
- **El oráculo de filas** (`tests/Support/RowOracle.php` y `row-oracle.json`) sólo vive mientras dura C6. Guarda `documentHash` y, por tabla, `rows` y `sha256` (research.md, R7).
