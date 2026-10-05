# Implementation Plan: C6 · Registros tipados del contenido

**Branch**: `002-c6-registros-tipados` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-c6-registros-tipados/spec.md`. Decisiones: [research.md](./research.md). Registros y firmas: [data-model.md](./data-model.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completa la sección de tu dueño y las «Reglas para todos los agentes». `tasks.md` tiene una línea por tarea (T001…) y remite acá.
>
> **Código verificado.** Se planificó sin tocar el repositorio, con PHP 8.5 y PHPStan 2.2.17 de la imagen de pruebas y el código montado de sólo lectura ([research.md](./research.md), «Cómo se verificó»). Corrió de verdad:
>
> - el código de referencia de T001 (el oráculo), de T002 (los lectores), del meta de T003, de T004 (el piloto) y de T005 (los bordes);
> - los cambios de `ContentDiff` de T010.
>
> Con el piloto integrado, la suite completa de la API pasa (332 pruebas, 978 aserciones) y el nivel 9 baja de 106 a 65 errores.
>
> **Código sin escribir.** Las otras cuatro familias de registros y la integración de T010 y T011 no se escribieron. El plan da sus firmas exactas ([data-model.md](./data-model.md)), los mensajes que conservan y los pasos. Las pruebas son el contrato.

## Summary

C6 cambia la representación de los registros del contenido dentro de `backend/api/app/Content/`. Donde C2 usaba arreglos asociativos y objetos sin forma, ahora hay registros `readonly` con constructores con nombre (`fromDocument`, `fromRow`) y salidas explícitas (`toRow()`, `toPublished()`). Después, el análisis estático sube al nivel 9. Nada cambia por fuera: ni los bytes, ni las filas, ni los mensajes, ni el HTTP (spec, Intención y alcance). El enfoque:

- **Un registro por tipo, que es su propio códec.** Son 19 tipos de fila y el meta, en `app/Content/Record/`. Leen con dos lectores compartidos que conservan los mensajes y las conversiones de C2. Los agregados (`Exercise`, `Workshop`, `World` y `Guide`) llevan a sus hijos y suman `rowsByTable()`. Al final se borra `Codec/`.
- **Los bordes no cambian.** El query builder y el codificador siguen recibiendo arreglos y `stdClass`. La diferencia del import, su plan y la escritura siguen sobre filas (Q2). Los valores JSON anidados quedan opacos, guardados como texto, y `key_order` pasa a ser un `KeyOrder` tipado (Q4).
- **Tres oráculos independientes:**
  - las huellas del generador, para los bytes;
  - un oráculo de filas, tomado del código de C2 antes del primer cambio (T001), para las filas;
  - los mensajes literales de las pruebas de C2, para los rechazos.

  Al final, un despliegue sobre una base que importó el código de C2 tiene que no escribir nada (T015).
- **El nivel 9 llega al final** (T012), con los 106 errores de hoy corregidos uno por uno (sección «Los 106 errores del nivel 9»), sin baseline ni ignores.

## Technical Context

**Language/Version**: PHP 8.5 (FPM) y Laravel 13.34 en `backend/api/`, sin sintaxis posterior a PHP 8.3: `composer.json` no cambia (research.md, R9).

**Primary Dependencies**: ninguna nueva. Se usan Larastan 3.12.3 y PHPStan 2.2.17, ya instalados, y Pest 5.3.

**Storage**: MySQL 9.7, con las 21 tablas de C2 sin cambios. No hay migraciones.

**Testing**: Pest contra MySQL real (`npm run api:test`), con las suites `Unit`, `Feature` y `Content`. Mientras `phpstan.neon` siga en el nivel 6, el nivel 9 se pide por archivo: `npm run api:analyse -- --level 9 <rutas>`. Contra el stack levantado corren `npm run api:content:check` y `deploy-check.sh`.

**Target Platform**: Docker Compose en un servidor, Linux o macOS. Cada dueño usa su propio `COMPOSE_PROJECT_NAME`.

**Project Type**: servicio web (API Laravel).

**Performance Goals**: sin metas nuevas. Crear unos miles de objetos por import o por armado no se mide (spec, riesgo 8): la entrega sirve los cuerpos desde la caché.

**Constraints**:

- los mismos bytes en las 17 porciones y en cada ejercicio;
- las mismas filas, que el oráculo verifica;
- los mismos mensajes del import;
- arreglos en los bordes;
- sin descargas, sin `declare(strict_types=1)` y sin `@phpstan-ignore`.

**Scale/Scope**: 19 tipos de fila (2.541 filas del contenido vigente) y el meta. En `app/` se crean 28 archivos, cambian 16 y se borran los 8 de `Codec/`. Hay 106 errores del nivel 9 que corregir.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.3.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `backend/api/AGENTS.md`: Collections y `Arr::`, con la excepción de las listas tipadas (research.md, R14); Pest contra MySQL real y sus tres suites. T013 actualiza la documentación que cita el nivel, `backend/api/AGENTS.md` y `docs/agent-skills.md`, en el mismo cambio que sube el nivel. |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con su prueba, que falla por la razón que dice el paso. En una tarea sólo de tipos, la prueba que falla es `api:analyse --level 9` con los errores del mapa, y la red es la suite en verde antes y después. Los valores esperados salen de afuera del código probado: el documento y el meta como archivos (FR-016), el oráculo de filas tomado del código de C2 y los mensajes literales de C2. |
| III. Código entendible | Sí, con revisión | Los registros son clases planas, sin motor genérico: cada uno lee y escribe sus campos a la vista. Para revisar por cohesión: `Exercise` (29 columnas), `ContentRows` y `PortionAssembler`. |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | No cambian IDs, claves, filas ni el ciclo de vida; el import sigue retirando en lugar de borrar. |
| V. Capas y contratos explícitos | Sí | Los registros viven en `app/Content/Record/`, con interfaces fijadas en `data-model.md`. Los bordes siguen con arreglos. No hay frameworks ni dependencias nuevas. No hace falta un ADR: ADR 0006 D10 se cumple igual (research.md, R1). |
| VI. Español, accesibilidad y portabilidad | Sí | Código y pruebas en inglés; mensajes al operador en español, los de C2 tal cual; no hay interfaz. Los comandos son portables. |
| VII. Secretos y salidas generadas fuera de Git | Sí | `row-oracle.json` es un fixture de prueba: valores esperados, como los de `qa/fixtures`. Se versiona a propósito y se retira en T016. No hay secretos ni dependencias. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. Lo que falte lo agrega `/speckit-converge` al final; al entregar, el directorio queda inmutable. |

## Project Structure

### Documentation (this feature)

```text
specs/002-c6-registros-tipados/
├── spec.md              # qué y por qué, con el clarify del 2026-10-05
├── research.md          # decisiones de diseño y cómo se verificaron
├── data-model.md        # los registros: propiedades, columnas, claves y firmas
├── quickstart.md        # escenarios de validación con sus comandos
├── plan.md              # este archivo: cómo, repartido en dueños
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

No hay `contracts/`: C6 no cambia ninguna interfaz externa. El contrato HTTP de C2 sigue igual.

### Source Code (repository root)

```text
backend/api/
├── app/Content/
│   ├── Record/          (nuevo) KeyOrder, JsonValue, DocumentFields, RowFields;
│   │                    AtlasConcept; World, WorldExercise, WorldRole; Exercise, ExerciseTest,
│   │                    ExerciseHint, Topic, ExerciseHashes; Workshop, WorkshopObjective,
│   │                    WorkshopStep, WorkshopRelatedExercise, StepKey; Guide, GuideResource,
│   │                    GuideSource, GuideTrack, GuideModule, GuideStep, GuideStepResource;
│   │                    Language, Catalog
│   ├── ContentMeta.php  (nuevo)
│   ├── Codec/           (se borra en T004 y T011)
│   ├── ContentSource, ContentRows, ContentDiff, ContentWriter, ContentImporter,
│   │   PortionAssembler, PortionRenderer, ContentReader, JsonDiff            (cambian)
│   └── ContentSnapshot, ImportLock, BodyCache, Portion, ContentTables,
│       ContentImports                                                       (sólo tipos)
├── app/Console/Commands/ImportContent.php                                   (sólo tipos)
├── config/filesystems.php                                                   (una línea)
├── phpstan.neon                                                             (nivel 9)
└── tests/
    ├── Support/         ContentPipeline (nuevo); RowOracle, print-row-oracle.php y
    │                    row-oracle.json (nuevos; se retiran en T016)
    └── Unit/            RowOracleTest (se retira en T016); Record/*Test.php (nuevos);
                         ContentRowsTest, ContentDiffTest, ContentRoundTripTest,
                         ContentSourceTest, ContentFixtureTest (cambia cómo arman la entrada)
backend/api/AGENTS.md  docs/agent-skills.md  docs/architecture.md                (T013)
```

**Structure Decision:** lo nuevo vive en `app/Content/Record/`, una carpeta por responsabilidad como `Codec/`, que reemplaza. Sin barrels ni capas nuevas.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **Bytes.**
  - `toPublished()` tiene que recorrer `key_order`, nunca el orden de las propiedades.
  - Una clave opcional ausente no puede aparecer como `null`.
  - `JsonValue` guarda el texto y decodifica a objetos, así `{}` no pasa a `[]`.
  - Los derivados (tema, `workshopId`, `code`, `related`, IDs de un mundo y `resourceIds`) tienen que salir en el orden de `position`.
- **Filas.**
  - `toRow()` lleva exactamente las columnas de C2, con banderas en `0`/`1` y el texto de `key_order` y de los JSON idéntico.
  - El oráculo tiene que haberse tomado en un commit propio antes de tocar `app/`.
  - No se regenera con el código nuevo: `print-row-oracle.php` construye los códecs de C2.
- **Mensajes.** Cada `fromDocument` lee en el orden del `FieldMap` de C2. Las comprobaciones que se mudaron (la lista de `related` a `ContentRows`, el texto de `resourceIds` a `GuideStep`) dan el mismo texto que antes.
- **Bordes.**
  - Ningún registro llega al query builder ni al codificador: no hay `JsonSerializable` ni se pasa un registro a `PublishedJson::encode`.
  - `RowSet`, `ContentDiff` y `ContentWriter` siguen con filas.
- **Pruebas.**
  - El diff de `tests/` no cambia ningún valor esperado de C2, sólo cómo se arma la entrada.
  - Las pruebas nuevas toman sus esperados del documento, del meta como archivo o de C2.
- **Nivel 9.** No hay baseline, `ignoreErrors`, `@phpstan-ignore` ni casts de `mixed`. Los dos desvíos de research.md (R10) están en casos inalcanzables y documentados.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez: por ejemplo, B y después W.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | B | T001: el oráculo de filas, solo y primero, sobre el código de C2 |
| 1 | B y E, a la vez | **B**: T002 a T004, los lectores, el meta y el piloto del Atlas, en ese orden. **E**: T005, los bordes del nivel 9 |
| 2 | R1, R2, R3 y R4, a la vez | T006 a T009: mundos, ejercicios, talleres y guía, sólo en `Record/` y sus pruebas |
| 3 | W | T010, el import arma registros, y después T011, la entrega arma registros y se borra `Codec/` |
| 4 | Coordinador | T012 a T016: nivel 9, documentación, mutaciones, despliegue sobre C2, compuerta y retiro del oráculo |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| B · Base | `tests/Support/{RowOracle,ContentPipeline}.php`, `print-row-oracle.php`, `row-oracle.json`; `tests/Unit/RowOracleTest.php`; `Record/{KeyOrder,JsonValue,DocumentFields,RowFields,Catalog,StepKey,ExerciseHashes,Language,AtlasConcept}.php` y sus pruebas en `tests/Unit/Record/`; `ContentMeta.php`; hasta T004, `ContentSource`, `ContentRows`, `ContentImporter`, `ContentWriter`, `ContentDiff`, `PortionAssembler`, `Codec/AtlasCodec.php` y las pruebas `ContentSourceTest`, `ContentFixtureTest`, `ContentDiffTest`, `ContentRowsTest` y `ContentRoundTripTest` | — | los lectores, el meta tipado, el patrón probado de punta a punta y `ContentPipeline` |
| R1 · Mundos | `Record/{World,WorldExercise,WorldRole}.php`, `tests/Unit/Record/WorldRecordsTest.php` | de B, los lectores | los registros de mundo |
| R2 · Ejercicios | `Record/{Exercise,ExerciseTest,ExerciseHint,Topic}.php`, `tests/Unit/Record/ExerciseRecordsTest.php` | de B, los lectores y `ExerciseHashes` | los registros de ejercicio |
| R3 · Talleres | `Record/{Workshop,WorkshopObjective,WorkshopStep,WorkshopRelatedExercise}.php`, `tests/Unit/Record/WorkshopRecordsTest.php` | de B, los lectores y `StepKey` | los registros de taller |
| R4 · Guía | `Record/{Guide,GuideResource,GuideSource,GuideTrack,GuideModule,GuideStep,GuideStepResource}.php`, `tests/Unit/Record/GuideRecordsTest.php` | de B, los lectores | los registros de guía |
| E · Bordes | `ContentSnapshot`, `ImportLock`, `BodyCache`, `Portion`, `ContentTables`, `ContentImports` y `app/Console/Commands/ImportContent.php` | — | los bordes sin errores en el nivel 9 |
| W · Integración | desde T010: `ContentRows`, `ContentDiff`, `ContentWriter`, `ContentImporter`, `PortionAssembler`, `PortionRenderer`, `ContentReader`, `JsonDiff`, `Codec/*`, `tests/Support/ContentPipeline.php`, `ContentRowsTest`, `ContentDiffTest` y `ContentRoundTripTest`; y los registros de R1 a R4 si el oráculo pide corregirlos | de B, R1 a R4 y E, todo integrado | el import y la entrega sobre registros, sin `Codec/` |
| Coordinador | `phpstan.neon`, `config/filesystems.php`, `backend/api/AGENTS.md`, `docs/agent-skills.md`, `docs/architecture.md`; el retiro del oráculo en T016 | todo | el nivel 9, la documentación y la evidencia de cierre |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 integrado. B y E parten de ahí.
- **S1:** T004 integrado: el patrón está probado de punta a punta. R1 a R4 parten de ahí.
- **S2:** T005 a T009 integrados. W parte de ahí.
- **S3:** T011 integrado. El coordinador cierra.

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **C3 corre en paralelo** (clarify, Q5) y toca `composer.json`, `phpstan.neon`, `routes/`, `bootstrap/app.php` y `config/`.
  - C6 no toca `composer.json`, `routes/` ni `bootstrap/app.php`.
  - De `config/`, C6 sólo cambia una línea de `config/filesystems.php`.
  - El choque real es `phpstan.neon`. Si C3 se integra antes que T012, la subida al nivel 9 tiene que dejar también su código sin errores. Si se integra después, C3 tiene que pasar el nivel 9; por eso conviene que lo apunte desde el principio.
  - `backend/api/AGENTS.md` lo editan los dos: lo integra el coordinador.
- **La limpieza al inglés corre en paralelo** y no toca `backend/api/app/Content/`. Puede tocar `app/Console/Commands/ImportContent.php` (T005) y `config/filesystems.php` (T012): si los toca, el coordinador integra las dos versiones.
- **B2 espera a C6**: cambia las pruebas de ejercicio y el generador, y por eso depende de C6 (hoja de ruta).

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md` y la constitución;
  - la spec, [data-model.md](./data-model.md), [research.md](./research.md) y tu sección;
  - las skills `tdd`, `laravel-tdd`, `php-pro` y `codebase-design`. De `php-pro` se toman los patrones, no su regla general; el nivel 9 de C6 es una decisión propia.
- **TDD, siempre.**
  - Escribí la prueba de tu paso y comprobá que falla por la razón que dice el plan. Recién entonces implementá.
  - En las tareas sólo de tipos, la prueba que falla es `npm run api:analyse -- --level 9 <archivos>` con los errores del mapa, y la red es la suite en verde antes y después.
  - Si una prueba de C2 falla, el error está en el código nuevo. Su valor esperado no se toca.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos.** En cada terminal: `export COMPOSE_PROJECT_NAME=taller-c6-<dueño>`, y un `.env` con `sh backend/api/scripts/init-env.sh`. Después:
  - `npm run api:test -- --filter=<Prueba>`;
  - `npm run api:test -- --testsuite=Unit`;
  - `npm run api:analyse -- --level 9 <rutas>`;
  - `npm run api:format:check`;
  - `npm run api:test:down`.

  Nadie levanta el stack (`docker compose up`) salvo el coordinador. Las imágenes y la caché están en la máquina: si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo.**
  - Código y pruebas en inglés. Los mensajes al operador van en español, y los de C2 se copian tal cual.
  - Comentarios sólo en lo complejo o para una referencia.
  - Una `list<…>` tipada se arma con `foreach` (research.md, R14).
  - Sin `declare(strict_types=1)`, sin sintaxis posterior a PHP 8.3, sin `@phpstan-ignore` ni baseline.
  - Formato con Pint.
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva la prueba con lo que verifica. La evidencia de una tarea es su commit, y lo que midas va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 1. Base (dueño B, ondas 0 y 1)

**Cubre:**

- el oráculo de filas: FR-006, FR-016 y FR-018;
- los lectores compartidos y el meta tipado: FR-001, FR-003, FR-004, FR-007 y FR-008;
- el piloto: FR-002, FR-005 y FR-017.

**Entrega:** el patrón probado de punta a punta con un registro real, antes de que arranquen R1 a R4 (S1).

### Tarea 1.1 · El oráculo de filas, antes de tocar `app/` (T001)

- **Crea:** en `backend/api/tests/Support/`, `RowOracle.php`, `ContentPipeline.php`, `print-row-oracle.php` y `row-oracle.json`, que se genera; y `backend/api/tests/Unit/RowOracleTest.php`.
- **Entrega:**
  - `RowOracle::digest(array<string, list<array<string, int|string|null>>> $tables): array<string, array{rows: int, sha256: string}>` y `RowOracle::read()`;
  - `ContentPipeline::rows(): ContentRows` y `ContentPipeline::assembler(): PortionAssembler`.

**Pasos:**

1. Escribí `RowOracle`, `ContentPipeline` y `RowOracleTest` (código abajo).
2. `npm run api:test -- --filter=RowOracleTest` falla con «Falta tests/Support/row-oracle.json…», que es la razón esperada.
3. Escribí `print-row-oracle.php` y generá el oráculo con el comando del escenario 1 de [quickstart.md](./quickstart.md).
4. Corré otra vez la prueba: pasa, con 1 prueba y 2 aserciones. El JSON trae 19 tablas y 2.541 filas, y la huella del documento es la del `curriculum.meta.json` de la imagen; al planificar fue `ef8f5715…`.
5. Hacé un commit sólo con esos cinco archivos: `test(api): oráculo de filas de C2 antes de tipar los registros`.

**Compuerta:** `git diff --stat <base>..HEAD -- backend/api/app` sale vacío, y `npm run api:test -- --testsuite=Unit` está en verde.

**Vuelta atrás:** revertí el commit; nada depende todavía de él.

**Verificado al planificar:** sobre el código de C2, la prueba falló por la razón esperada, el oráculo salió igual en dos corridas y la prueba pasó con él.

`backend/api/tests/Support/RowOracle.php`:

```php
<?php

namespace Tests\Support;

use App\Content\ContentTables;
use App\Content\PublishedJson;
use LogicException;

/**
 * The row oracle of C6 (specs/002-c6-registros-tipados, FR-006): a digest per table of the rows the
 * import builds for a document. Values are compared as the import's difference compares them
 * (text, NULL apart), and rows and columns are sorted, so only what MySQL would store counts. It
 * lives while C6 does: after C6 there is no C2 code left to regenerate it.
 */
final class RowOracle
{
    /**
     * @param  array<string, list<array<string, int|string|null>>>  $tables  RowSet::toArray()
     * @return array<string, array{rows: int, sha256: string}>
     */
    public static function digest(array $tables): array
    {
        $digest = [];
        foreach ($tables as $table => $rows) {
            $normalized = [];
            foreach ($rows as $row) {
                ksort($row, SORT_STRING);
                $normalized[ContentTables::keyOf($table, $row)] = array_map(
                    fn (int|string|null $value): ?string => $value === null ? null : (string) $value,
                    $row,
                );
            }
            ksort($normalized, SORT_STRING);
            $digest[$table] = [
                'rows' => count($normalized),
                'sha256' => hash('sha256', PublishedJson::encode(array_values($normalized))),
            ];
        }
        ksort($digest, SORT_STRING);

        return $digest;
    }

    /** @return array{documentHash: string, tables: array<string, array{rows: int, sha256: string}>} */
    public static function read(): array
    {
        $path = __DIR__.'/row-oracle.json';
        if (! is_file($path)) {
            throw new LogicException('Falta tests/Support/row-oracle.json: generalo con print-row-oracle.php sobre el código de C2 (specs/002-c6-registros-tipados/quickstart.md, escenario 1).');
        }

        return json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    }
}
```

`backend/api/tests/Support/ContentPipeline.php`, en su versión de T001; T004 y T011 le quitan los códecs:

```php
<?php

namespace Tests\Support;

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\PortionAssembler;

/** The document → rows → bytes pipeline as the import and the delivery build it, for the pure tests. */
final class ContentPipeline
{
    public static function rows(): ContentRows
    {
        return new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec);
    }

    public static function assembler(): PortionAssembler
    {
        return new PortionAssembler(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec);
    }
}
```

`backend/api/tests/Support/print-row-oracle.php`:

```php
<?php

// Prints the row oracle of C6 (specs/002-c6-registros-tipados/research.md, R7). It builds C2's
// codecs by name, so it only runs on the C2 code at the base of the branch: the oracle is never
// regenerated with the code under test.
require __DIR__.'/../../vendor/autoload.php';

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\ContentSource;
use Tests\Support\ContentFixture;
use Tests\Support\RowOracle;

$directory = ContentFixture::imagePath();
$meta = json_decode((string) file_get_contents("{$directory}/curriculum.meta.json"), true, 512, JSON_THROW_ON_ERROR);
$rows = (new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec))
    ->fromSource(ContentSource::fromDirectory($directory))
    ->toArray();

echo json_encode(
    ['documentHash' => $meta['documentHash'], 'tables' => RowOracle::digest($rows)],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
)."\n";
```

`backend/api/tests/Unit/RowOracleTest.php`:

```php
<?php

use App\Content\ContentSource;
use Tests\Support\ContentFixture;
use Tests\Support\ContentPipeline;
use Tests\Support\RowOracle;

// C6 FR-006 and FR-018. The expected digests are the rows the C2 code built for this document,
// taken at the base of the branch before the first change to app/: not the code under test.
it('builds the rows the C2 code built for the same document', function () {
    $oracle = RowOracle::read();
    $meta = json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true, 512, JSON_THROW_ON_ERROR);

    expect($oracle['documentHash'])->toBe($meta['documentHash'], 'El oráculo de filas es de otro documento: regeneralo en la base de la rama (quickstart.md, escenario 1).');

    $rows = ContentPipeline::rows()->fromSource(ContentSource::fromDirectory(ContentFixture::imagePath()));

    expect(RowOracle::digest($rows->toArray()))->toBe($oracle['tables']);
});
```

### Tarea 1.2 · Los lectores compartidos (T002)

- **Crea:**
  - en `backend/api/app/Content/Record/`: `KeyOrder.php`, `JsonValue.php`, `DocumentFields.php` y `RowFields.php`;
  - en `backend/api/tests/Unit/Record/`: `KeyOrderTest.php`, `JsonValueTest.php`, `DocumentFieldsTest.php` y `RowFieldsTest.php`.
- **Entrega:** las firmas de [data-model.md](./data-model.md), «Lectores compartidos».

**Pruebas.** Los valores esperados están escritos a mano.

- **`KeyOrderTest`:**
  - `of((object) ['b' => 1, 'a' => 2])->keys` es `['b', 'a']`;
  - el `toRow()` de las claves `['id', 'title']` es `'["id","title"]'`;
  - `fromRow('["title","id"]', ['id', 'title'])->keys` es `['title', 'id']`;
  - `fromRow('["id","extra"]', ['id'])` lanza `LogicException` con «La clave «extra» no tiene regla en su códec.»;
  - con el orden `['title', 'id']`, `publish(['id' => 'a', 'title' => 'b', 'level' => null])` se codifica como `{"title":"b","id":"a"}`;
  - con el orden `['id', 'title']`, `publish(['id' => 'a'])` lanza `LogicException`.
- **`JsonValueTest`:**
  - `fromDocument(new stdClass)->toRow()` es `'{}'`, y su `toPublished()` vuelve a codificarse como `{}`;
  - `fromDocument(null)->toRow()` es `'null'`;
  - `fromDocument((object) ['b' => [], 'a' => 'ñ/'])->toRow()` es `'{"b":[],"a":"ñ/"}'`;
  - `fromRow('{"x":1}')->toPublished()` es un `stdClass` con `x` igual a `1`.
- **`DocumentFieldsTest`**, sobre `(object) ['title' => 'T', 'stage' => 1, 'featured' => true, 'quiz' => null]` con la ruta `lab.rust[0]`:
  - una clave que no está en `$known` da «curriculum.json: lab.rust[0].extra: clave desconocida»;
  - `text('missing')`, con `missing` en `$known`, da «curriculum.json: lab.rust[0]: falta la clave «missing»»;
  - un título `''` o `'  '` da «curriculum.json: lab.rust[0].title: se esperaba un texto no vacío»;
  - `stage` igual a `'1'` da «se esperaba un entero», y `featured` igual a `'yes'`, «se esperaba true o false»;
  - `optionalText` y `optionalJson` de una clave ausente devuelven `null`, y `json('quiz')->toRow()` es `'null'`.
- **`RowFieldsTest`:**
  - `int` acepta `7`, `'7'` y `'-3'`, y rechaza `'7.5'`, `null` y `true`;
  - `flag` acepta `0`, `1`, `'0'` y `'1'`, y rechaza `2`;
  - `string` rechaza `7`;
  - `nullableString` y `nullableInt` devuelven `null`;
  - una columna que falta lanza `LogicException` con la tabla y la columna.

**Pasos:**

1. Las pruebas fallan porque las clases no existen.
2. Escribí el código de referencia.
3. Las pruebas pasan.
4. `npm run api:analyse -- --level 9 app/Content/Record` da 0 errores.

**Verificado al planificar:** 0 errores en los niveles 9 y 10. El piloto de T004 los usa sobre el contenido real.

```php
<?php

namespace App\Content\Record;

use App\Content\PublishedJson;
use Illuminate\Support\Arr;
use LogicException;
use stdClass;

/**
 * The published keys of a record, in their order, stored with its row as `key_order` (ADR 0006
 * D10). The published record follows this order, never the order of the properties.
 */
final readonly class KeyOrder
{
    /** @param list<string> $keys */
    private function __construct(public array $keys) {}

    /** The keys of a document record, in document order. */
    public static function of(stdClass $record): self
    {
        $keys = [];
        foreach (get_object_vars($record) as $key => $value) {
            $keys[] = (string) $key;
        }

        return new self($keys);
    }

    /**
     * The order stored in a row. A key the record does not know means the row was not written by
     * this code: the read fails instead of publishing an incomplete record.
     *
     * @param  list<string>  $known  the published keys of the record
     */
    public static function fromRow(string $json, array $known): self
    {
        $decoded = PublishedJson::decode($json);
        if (! is_array($decoded) || ! Arr::isList($decoded)) {
            throw new LogicException("key_order no es una lista de claves: {$json}");
        }
        $keys = [];
        foreach ($decoded as $key) {
            if (! is_string($key) || ! in_array($key, $known, true)) {
                throw new LogicException('La clave «'.(is_string($key) ? $key : PublishedJson::encode($key)).'» no tiene regla en su códec.');
            }
            $keys[] = $key;
        }

        return new self($keys);
    }

    public function has(string $key): bool
    {
        return in_array($key, $this->keys, true);
    }

    public function toRow(): string
    {
        return PublishedJson::encode($this->keys);
    }

    /**
     * The published record: the keys of this order, each with its value.
     *
     * @param  array<string, mixed>  $values  published key → value
     */
    public function publish(array $values): stdClass
    {
        $record = new stdClass;
        foreach ($this->keys as $key) {
            if (! array_key_exists($key, $values)) {
                throw new LogicException("La clave «{$key}» no tiene regla en su códec.");
            }
            $record->{$key} = $values[$key];
        }

        return $record;
    }
}
```

```php
<?php

namespace App\Content\Record;

use App\Content\PublishedJson;

/**
 * A nested JSON value of a record (a quiz, the sources…), kept as the text the generator's encoding
 * gives it: what C2 stores in its `*_json` column and decodes when it publishes.
 */
final readonly class JsonValue
{
    private function __construct(public string $json) {}

    public static function fromDocument(mixed $value): self
    {
        return new self(PublishedJson::encode($value));
    }

    public static function fromRow(string $json): self
    {
        return new self($json);
    }

    public function toRow(): string
    {
        return $this->json;
    }

    public function toPublished(): mixed
    {
        return PublishedJson::decode($this->json);
    }
}
```

```php
<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use stdClass;

/**
 * Reads the fields of a document record with C2's rules and messages (`Codec/FieldMap`): each
 * error names the field of curriculum.json. A record reads its fields in the order C2 declared
 * them, so a document with one error gets the same message.
 */
final readonly class DocumentFields
{
    private const FILE = 'curriculum.json';

    private function __construct(private stdClass $record, private string $path) {}

    /**
     * Rejects a key the record does not know before reading any field.
     *
     * @param  list<string>  $known  the published keys of the record, derived ones included
     */
    public static function of(stdClass $record, string $path, array $known): self
    {
        foreach (KeyOrder::of($record)->keys as $key) {
            if (! in_array($key, $known, true)) {
                throw InvalidContent::at(self::FILE, "{$path}.{$key}", 'clave desconocida');
            }
        }

        return new self($record, $path);
    }

    public function text(string $key): string
    {
        $value = $this->required($key);
        if (! is_string($value) || trim($value) === '') {
            throw InvalidContent::at(self::FILE, "{$this->path}.{$key}", 'se esperaba un texto no vacío');
        }

        return $value;
    }

    public function optionalText(string $key): ?string
    {
        return $this->has($key) ? $this->text($key) : null;
    }

    public function number(string $key): int
    {
        $value = $this->required($key);
        if (! is_int($value)) {
            throw InvalidContent::at(self::FILE, "{$this->path}.{$key}", 'se esperaba un entero');
        }

        return $value;
    }

    public function flag(string $key): bool
    {
        $value = $this->required($key);
        if (! is_bool($value)) {
            throw InvalidContent::at(self::FILE, "{$this->path}.{$key}", 'se esperaba true o false');
        }

        return $value;
    }

    public function json(string $key): JsonValue
    {
        return JsonValue::fromDocument($this->required($key));
    }

    public function optionalJson(string $key): ?JsonValue
    {
        return $this->has($key) ? $this->json($key) : null;
    }

    public function keyOrder(): KeyOrder
    {
        return KeyOrder::of($this->record);
    }

    private function has(string $key): bool
    {
        return property_exists($this->record, $key);
    }

    private function required(string $key): mixed
    {
        if (! $this->has($key)) {
            throw InvalidContent::at(self::FILE, $this->path, "falta la clave «{$key}»");
        }

        return $this->record->{$key};
    }
}
```

```php
<?php

namespace App\Content\Record;

use LogicException;

/**
 * Reads the columns of a row as the database driver returns them. Depending on its options, the
 * driver gives integers as int or as text; anything else in a column means the row was not written
 * by the import, and the read fails instead of publishing it.
 */
final readonly class RowFields
{
    /** @param array<string, mixed> $row */
    public function __construct(private array $row, private string $table) {}

    public function string(string $column): string
    {
        $value = $this->value($column);
        if (! is_string($value)) {
            throw $this->unexpected($column, 'un texto', $value);
        }

        return $value;
    }

    public function nullableString(string $column): ?string
    {
        return $this->value($column) === null ? null : $this->string($column);
    }

    public function int(string $column): int
    {
        $value = $this->value($column);
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && preg_match('/\A-?\d+\z/', $value) === 1) {
            return (int) $value;
        }
        throw $this->unexpected($column, 'un entero', $value);
    }

    public function nullableInt(string $column): ?int
    {
        return $this->value($column) === null ? null : $this->int($column);
    }

    public function flag(string $column): bool
    {
        return match ($this->int($column)) {
            0 => false,
            1 => true,
            default => throw $this->unexpected($column, '0 o 1', $this->value($column)),
        };
    }

    public function json(string $column): JsonValue
    {
        return JsonValue::fromRow($this->string($column));
    }

    public function nullableJson(string $column): ?JsonValue
    {
        return $this->value($column) === null ? null : $this->json($column);
    }

    /** @param list<string> $known the published keys of the record */
    public function keyOrder(array $known): KeyOrder
    {
        return KeyOrder::fromRow($this->string('key_order'), $known);
    }

    private function value(string $column): mixed
    {
        if (! array_key_exists($column, $this->row)) {
            throw new LogicException("{$this->table}: a la fila le falta la columna {$column}");
        }

        return $this->row[$column];
    }

    private function unexpected(string $column, string $expected, mixed $value): LogicException
    {
        return new LogicException("{$this->table}.{$column}: se esperaba {$expected} y la fila trae ".get_debug_type($value));
    }
}
```

### Tarea 1.3 · El meta tipado (T003)

- **Crea:**
  - `backend/api/app/Content/ContentMeta.php`;
  - en `app/Content/Record/`: `Catalog.php`, `StepKey.php`, `ExerciseHashes.php` y `Language.php`;
  - `tests/Unit/Record/ContentMetaTest.php`.
- **Cambia:**
  - en `app/Content/`: `ContentSource`, `ContentRows`, `ContentImporter`, `ContentWriter` y `ContentDiff`;
  - en `tests/Unit/`: `ContentSourceTest`, `ContentFixtureTest`, `ContentDiffTest` y `ContentRoundTripTest`.
- **Entrega:** `ContentMeta`, y `ContentSource::$meta` tipado (data-model.md).

**Pruebas** (`ContentMetaTest`):

- **Los valores tipados**, contra el meta como archivo (`ContentFixture::fromImage()->meta`, que lo decodifica tal cual):
  - `portionHash(Portion::LabRust)` y las 17 huellas;
  - las 274 huellas de ejercicio;
  - las claves de etapa de los 25 talleres, con su `id` y su `v1Index`;
  - `catalogs`, con `lab`, `quests` y `cores` y `chainPosition` nulo en los tres;
  - `languages`, que es `['rust', 'go']`.
- **Las filas de C2:** `Language` da `['code' => 'rust', 'position' => 1]`, y `Catalog`, `['code' => 'lab', 'slice_by' => 'language', 'chain_position' => null]`.
- **Un dataset con los 22 rechazos** que se verificaron al planificar, cada uno con su mensaje literal de C2:
  - commit: `master`, abreviado, en mayúsculas o con salto de línea;
  - lenguajes: vacíos, uno que no es texto, o que no son una lista;
  - catálogos: vacíos, sin `sliceBy`, cadena en 0, cadena en texto, o una entrada que no es un objeto;
  - porciones: una menos, en otro orden, o una huella inválida;
  - ejercicios: no son un objeto, un `gradingHash` inválido, o huellas que no son un objeto;
  - etapas: no son un objeto, no son una lista, sin `id`, o con `v1Index` negativo.

**Pasos:**

1. La prueba falla porque `ContentMeta` no existe.
2. Escribí `ContentMeta`, `Catalog`, `StepKey`, `ExerciseHashes` y `Language` (código abajo).
3. **`ContentSource`** guarda `public ContentMeta $meta`. `fromDirectory()` construye `ContentMeta::fromDocument($meta)` después de comparar la huella del documento. Se van `validateMeta()`, `SHA256` y `COMMIT`. `documentHash()`, `sourceCommit()` y `languages()` leen del meta, y `read()` estrecha `file_get_contents` (diff abajo).
4. **Los consumidores:**
   - `ContentRows::languagesAndCatalogs()` agrega `(new Language($code, $position + 1))->toRow()`, recorre `$source->meta->catalogs` con `$catalog->toRow()` y arma la cadena con `$catalog->chainPosition`.
   - `ContentRows::indexExercises()` y `addWorkshops()` pasan a `requireInDocument()` `$source->meta->exerciseHashes` y `$source->meta->workshopSteps`.
   - `ContentRows::addExercises()` lee `$source->meta->exerciseHashes[$id] ?? throw …`, con el mismo mensaje. Hasta T010, al códec le pasa `['contentHash' => $hashes->contentHash, 'gradingHash' => $hashes->gradingHash, 'starterHash' => $hashes->starterHash]`.
   - `ContentRows::addWorkshops()` lee `$source->meta->workshopSteps[$id] ?? throw …`. Hasta T010, al códec le pasa `Arr::map($stepKeys, fn (StepKey $key) => ['id' => $key->id, 'v1Index' => $key->v1Index])`.
   - `ContentImporter` usa `$source->meta->portionHash($portion)` en `verified()` y en `warm()`, y `plan()` pasa `$source->meta`.
   - `ContentWriter::recordImport()` codifica `$source->meta->portionHashes`, con el mismo texto que C2: las 17, en el orden de la API.
   - `ContentDiff::between()` y `mustRecord()` reciben `ContentMeta $meta` y leen `$meta->documentHash` y `$meta->portionHashes`.
5. **Las pruebas que leían `$source->meta[...]`** (FR-016):
   - `ContentSourceTest` afirma sobre el meta tipado: 17 en `$source->meta->portionHashes`, 274 en `exerciseHashes` y 25 en `workshopSteps`.
   - `ContentFixtureTest` lee el meta escrito como archivo, con `json_decode`.
   - `ContentDiffTest` arma `LatestImport` con `$source->meta->portionHashes`, pasa `$source->meta` y toma el 274 esperado de `ContentFixture::fromImage()->meta['exercises']`.
   - `ContentRoundTripTest` toma las huellas esperadas de `ContentFixture::fromImage()->meta`.
6. **Cierre.** `npm run api:test` está en verde, con `RowOracleTest`. `npm run api:analyse -- --level 9 app/Content/ContentMeta.php app/Content/Record app/Content/ContentSource.php app/Content/ContentRows.php app/Content/ContentImporter.php` da 0 errores: desaparecen los 18 del meta y el de `read()`.

**Verificado al planificar:** `ContentMeta`, contra el `validateMeta` de C2, dio el mismo resultado en 23 casos: el válido y los 22 rechazos. Las cinco clases tienen 0 errores en el nivel 9. Los pasos 3 a 5 no se corrieron.

```php
<?php

namespace App\Content;

use App\Content\Record\Catalog;
use App\Content\Record\ExerciseHashes;
use App\Content\Record\StepKey;
use Illuminate\Support\Arr;

/**
 * curriculum.meta.json, read and verified: the hashes and keys the generator computed, which PHP
 * stores and compares but never recomputes (ADR 0006 D10 to D14).
 */
final readonly class ContentMeta
{
    public const SHA256 = '/\A[0-9a-f]{64}\z/';

    private const COMMIT = '/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/';

    private const FILE = 'curriculum.meta.json';

    /**
     * @param  list<string>  $languages  in the order of `languages.position`
     * @param  list<Catalog>  $catalogs
     * @param  array<string, string>  $portionHashes  sha256 of each portion, by name, in the API order
     * @param  array<string, ExerciseHashes>  $exerciseHashes  by exercise ID
     * @param  array<string, list<StepKey>>  $workshopSteps  by workshop ID, one per published step
     */
    public function __construct(
        public string $documentHash,
        public ?string $sourceCommit,
        public array $languages,
        public array $catalogs,
        public array $portionHashes,
        public array $exerciseHashes,
        public array $workshopSteps,
    ) {}

    /** @param array<mixed> $meta the decoded file, whose documentHash ContentSource already compared with the document */
    public static function fromDocument(array $meta): self
    {
        $documentHash = $meta['documentHash'] ?? null;
        if (! is_string($documentHash) || preg_match(self::SHA256, $documentHash) !== 1) {
            throw InvalidContent::at(self::FILE, 'documentHash', 'se esperaba un sha256 en hexadecimal');
        }
        $commit = $meta['sourceCommit'] ?? null;
        if ($commit !== null && (! is_string($commit) || preg_match(self::COMMIT, $commit) !== 1)) {
            throw InvalidContent::at(self::FILE, 'sourceCommit', 'se esperaba null o el hash completo de un commit');
        }

        return new self(
            $documentHash,
            $commit,
            self::languages($meta['languages'] ?? null),
            self::catalogs($meta['catalogs'] ?? null),
            self::portionHashes($meta['portions'] ?? null),
            self::exerciseHashes($meta['exercises'] ?? null),
            self::workshopSteps($meta['workshopSteps'] ?? null),
        );
    }

    public function portionHash(Portion $portion): string
    {
        return $this->portionHashes[$portion->value];
    }

    /** @return list<string> */
    private static function languages(mixed $value): array
    {
        if (! is_array($value) || $value === [] || ! Arr::isList($value)) {
            throw InvalidContent::at(self::FILE, 'languages', 'se esperaba la lista de lenguajes');
        }
        $languages = [];
        foreach ($value as $language) {
            if (! is_string($language)) {
                throw InvalidContent::at(self::FILE, 'languages', 'se esperaba la lista de lenguajes');
            }
            $languages[] = $language;
        }

        return $languages;
    }

    /** @return list<Catalog> */
    private static function catalogs(mixed $value): array
    {
        if (! is_array($value) || $value === [] || ! Arr::isList($value)) {
            throw InvalidContent::at(self::FILE, 'catalogs', 'se esperaba la lista de catálogos');
        }
        $catalogs = [];
        foreach ($value as $index => $entry) {
            $catalogs[] = Catalog::fromDocument($entry, "catalogs[{$index}]");
        }

        return $catalogs;
    }

    /** @return array<string, string> */
    private static function portionHashes(mixed $value): array
    {
        if (! is_array($value) || array_keys($value) !== Arr::pluck(Portion::cases(), 'value')) {
            throw InvalidContent::at(self::FILE, 'portions', 'se esperaban las 17 porciones, en el orden de la API');
        }
        $hashes = [];
        foreach ($value as $name => $hash) {
            if (! is_string($hash) || preg_match(self::SHA256, $hash) !== 1) {
                throw InvalidContent::at(self::FILE, "portions.{$name}", 'se esperaba un sha256 en hexadecimal');
            }
            $hashes[(string) $name] = $hash;
        }

        return $hashes;
    }

    /** @return array<string, ExerciseHashes> */
    private static function exerciseHashes(mixed $value): array
    {
        if (! is_array($value)) {
            throw InvalidContent::at(self::FILE, 'exercises', 'se esperaba un objeto con las huellas de cada ejercicio');
        }
        $hashes = [];
        foreach ($value as $id => $entry) {
            $hashes[(string) $id] = ExerciseHashes::fromDocument($entry, (string) $id);
        }

        return $hashes;
    }

    /** @return array<string, list<StepKey>> */
    private static function workshopSteps(mixed $value): array
    {
        if (! is_array($value)) {
            throw InvalidContent::at(self::FILE, 'workshopSteps', 'se esperaba un objeto con las claves de etapa de cada taller');
        }
        $steps = [];
        foreach ($value as $workshop => $keys) {
            if (! is_array($keys) || ! Arr::isList($keys)) {
                throw InvalidContent::at(self::FILE, "workshopSteps.{$workshop}", 'se esperaba una lista de claves de etapa');
            }
            $list = [];
            foreach ($keys as $index => $key) {
                $list[] = StepKey::fromDocument($key, "workshopSteps.{$workshop}[{$index}]");
            }
            $steps[(string) $workshop] = $list;
        }

        return $steps;
    }
}
```

```php
<?php

namespace App\Content\Record;

use App\Content\InvalidContent;

/** A catalog of the meta (`catalogs[i]`) ↔ a `catalogs` row. */
final readonly class Catalog
{
    public function __construct(
        public string $code,
        public string $sliceBy,
        public ?int $chainPosition,
    ) {}

    public static function fromDocument(mixed $entry, string $path): self
    {
        $code = is_array($entry) ? ($entry['code'] ?? null) : null;
        $sliceBy = is_array($entry) ? ($entry['sliceBy'] ?? null) : null;
        $chainPosition = is_array($entry) ? ($entry['chainPosition'] ?? null) : null;
        if (! is_string($code) || ! in_array($sliceBy, ['language', 'domain'], true)
            || ($chainPosition !== null && (! is_int($chainPosition) || $chainPosition < 1))) {
            throw InvalidContent::at('curriculum.meta.json', $path, 'se esperaba {code, sliceBy, chainPosition}');
        }

        return new self($code, $sliceBy, $chainPosition);
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return ['code' => $this->code, 'slice_by' => $this->sliceBy, 'chain_position' => $this->chainPosition];
    }
}
```

```php
<?php

namespace App\Content\Record;

use App\Content\InvalidContent;

/** The stable key of a workshop step and its frozen v1 index, from the meta (ADR 0006 D14). */
final readonly class StepKey
{
    public function __construct(
        public string $id,
        public ?int $v1Index,
    ) {}

    public static function fromDocument(mixed $key, string $path): self
    {
        $id = is_array($key) ? ($key['id'] ?? null) : null;
        $v1Index = is_array($key) ? ($key['v1Index'] ?? null) : null;
        if (! is_string($id) || ($v1Index !== null && (! is_int($v1Index) || $v1Index < 0))) {
            throw InvalidContent::at('curriculum.meta.json', $path, 'se esperaba {id, v1Index}');
        }

        return new self($id, $v1Index);
    }
}
```

```php
<?php

namespace App\Content\Record;

use App\Content\ContentMeta;
use App\Content\InvalidContent;

/** The three hashes the generator computed for an exercise; PHP stores them and never recomputes them. */
final readonly class ExerciseHashes
{
    public function __construct(
        public string $contentHash,
        public string $gradingHash,
        public string $starterHash,
    ) {}

    public static function fromDocument(mixed $hashes, string $exerciseId): self
    {
        $read = function (string $key) use ($hashes, $exerciseId): string {
            $value = is_array($hashes) ? ($hashes[$key] ?? null) : null;
            if (! is_string($value) || preg_match(ContentMeta::SHA256, $value) !== 1) {
                throw InvalidContent::at('curriculum.meta.json', "exercises.{$exerciseId}.{$key}", 'se esperaba un sha256 en hexadecimal');
            }

            return $value;
        };

        return new self($read('contentHash'), $read('gradingHash'), $read('starterHash'));
    }
}
```

```php
<?php

namespace App\Content\Record;

/** A language of the curriculum, which fixes the order of every per-language map ↔ a `languages` row. */
final readonly class Language
{
    public function __construct(
        public string $code,
        public int $position,
    ) {}

    /** @param array<string, mixed> $row a `languages` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'languages');

        return new self($fields->string('code'), $fields->int('position'));
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return ['code' => $this->code, 'position' => $this->position];
    }
}
```

`ContentSource::read()`:

```diff
--- a/backend/api/app/Content/ContentSource.php
+++ b/backend/api/app/Content/ContentSource.php
@@ -71,7 +71,12 @@
             throw new InvalidContent("{$file}: no existe en {$path}");
         }

-        return file_get_contents($full);
+        $text = file_get_contents($full);
+        if ($text === false) {
+            throw new InvalidContent("{$file}: no se pudo leer en {$path}");
+        }
+
+        return $text;
     }

     private static function decode(string $text, string $file, bool $associative): mixed
```

### Tarea 1.4 · El piloto: el concepto del Atlas (T004)

- **Crea:** `app/Content/Record/AtlasConcept.php` y `tests/Unit/Record/AtlasRecordsTest.php`.
- **Cambia:**
  - `ContentRows` y `PortionAssembler`: sus constructores pierden `AtlasCodec`, y `addAtlas()` y la rama `atlas` usan el registro;
  - `tests/Support/ContentPipeline.php`, que pierde `AtlasCodec` en sus dos fábricas;
  - `ContentRowsTest`, `ContentDiffTest` y `ContentRoundTripTest`, que pasan a construir con `ContentPipeline::rows()` y `ContentPipeline::assembler()`.
- **Borra:** `app/Content/Codec/AtlasCodec.php`.

**Pruebas** (`AtlasRecordsTest`, sobre el documento de la imagen):

- **Ida y vuelta de los 32 conceptos:** `fromDocument`, `toRow()`, `fromRow` y `toPublished()`, codificado, es el `PublishedJson::encode($concept)` del documento.
- **Lo mismo con los enteros de la fila como texto.**
- **Los 30 conceptos sin `furtherSources`:** dejan `further_sources_json` en `null` y no publican la clave.
- **Mensajes**, con `atlas.rust[0]` editado:
  - un título vacío da «….title: se esperaba un texto no vacío»;
  - una clave `foo` da «….foo: clave desconocida»;
  - si falta `why` o `quiz`, da «atlas.rust[0]: falta la clave «…»»;
  - un `labId` igual a `7` da «….labId: se esperaba un texto no vacío»;
  - `furtherSources: null` se acepta.

**Pasos:**

1. La prueba falla porque la clase no existe.
2. Escribí el código de referencia.
3. La prueba pasa.
4. Aplicá los cambios de abajo y borrá `AtlasCodec`.
5. `npm run api:test` está en verde, con `RowOracleTest` (la tabla `atlas_concepts` del oráculo no cambia) y `ContentContractTest`. `npm run api:analyse -- --level 9 app/Content/Record` da 0 errores.

**Verificado al planificar:**

- los 32 conceptos dan la misma fila y los mismos bytes que `AtlasCodec`, también con los enteros como texto;
- los seis mensajes son iguales;
- con estos cambios integrados, la suite completa pasa (332 pruebas, 978 aserciones) y el nivel 9 baja a 65 errores.

**Vuelta atrás:** revertí el commit, que restaura `AtlasCodec`.

```php
<?php

namespace App\Content\Record;

use stdClass;

/** A concept of the Atlas: `atlas.<language>[i]` of the document ↔ an `atlas_concepts` row. */
final readonly class AtlasConcept
{
    /** The published keys, in the order C2's AtlasCodec declared them. */
    public const KEYS = ['id', 'level', 'category', 'title', 'summary', 'why', 'code', 'explanation', 'comparison', 'pitfall', 'quiz', 'labId', 'source', 'furtherSources'];

    public function __construct(
        public string $id,
        public string $language,
        public int $position,
        public string $level,
        public string $category,
        public string $title,
        public string $summary,
        public string $why,
        public string $code,
        public string $explanation,
        public string $comparison,
        public string $pitfall,
        public JsonValue $quiz,
        public string $labExerciseId,
        public JsonValue $source,
        public ?JsonValue $furtherSources,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $concept, string $language, int $position, string $path): self
    {
        $fields = DocumentFields::of($concept, $path, self::KEYS);

        return new self(
            id: $fields->text('id'),
            language: $language,
            position: $position,
            level: $fields->text('level'),
            category: $fields->text('category'),
            title: $fields->text('title'),
            summary: $fields->text('summary'),
            why: $fields->text('why'),
            code: $fields->text('code'),
            explanation: $fields->text('explanation'),
            comparison: $fields->text('comparison'),
            pitfall: $fields->text('pitfall'),
            quiz: $fields->json('quiz'),
            labExerciseId: $fields->text('labId'),
            source: $fields->json('source'),
            furtherSources: $fields->optionalJson('furtherSources'),
            keyOrder: $fields->keyOrder(),
        );
    }

    /** @param array<string, mixed> $row an `atlas_concepts` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'atlas_concepts');

        return new self(
            id: $fields->string('id'),
            language: $fields->string('language'),
            position: $fields->int('position'),
            level: $fields->string('level'),
            category: $fields->string('category'),
            title: $fields->string('title'),
            summary: $fields->string('summary'),
            why: $fields->string('why'),
            code: $fields->string('code'),
            explanation: $fields->string('explanation'),
            comparison: $fields->string('comparison'),
            pitfall: $fields->string('pitfall'),
            quiz: $fields->json('quiz_json'),
            labExerciseId: $fields->string('lab_exercise_id'),
            source: $fields->json('source_json'),
            furtherSources: $fields->nullableJson('further_sources_json'),
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'level' => $this->level,
            'category' => $this->category,
            'title' => $this->title,
            'summary' => $this->summary,
            'why' => $this->why,
            'code' => $this->code,
            'explanation' => $this->explanation,
            'comparison' => $this->comparison,
            'pitfall' => $this->pitfall,
            'quiz_json' => $this->quiz->toRow(),
            'lab_exercise_id' => $this->labExerciseId,
            'source_json' => $this->source->toRow(),
            'further_sources_json' => $this->furtherSources?->toRow(),
            'language' => $this->language,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'id' => $this->id,
            'level' => $this->level,
            'category' => $this->category,
            'title' => $this->title,
            'summary' => $this->summary,
            'why' => $this->why,
            'code' => $this->code,
            'explanation' => $this->explanation,
            'comparison' => $this->comparison,
            'pitfall' => $this->pitfall,
            'quiz' => $this->quiz->toPublished(),
            'labId' => $this->labExerciseId,
            'source' => $this->source->toPublished(),
            'furtherSources' => $this->furtherSources?->toPublished(),
        ]);
    }
}
```

```diff
--- a/backend/api/app/Content/ContentRows.php
+++ b/backend/api/app/Content/ContentRows.php
@@ -2,12 +2,12 @@

 namespace App\Content;

-use App\Content\Codec\AtlasCodec;
 use App\Content\Codec\ExerciseCodec;
 use App\Content\Codec\FieldMap;
 use App\Content\Codec\GuideCodec;
 use App\Content\Codec\WorkshopCodec;
 use App\Content\Codec\WorldCodec;
+use App\Content\Record\AtlasConcept;
 use Illuminate\Support\Arr;
 use stdClass;

@@ -24,7 +24,6 @@
         private ExerciseCodec $exercises,
         private WorkshopCodec $workshops,
         private WorldCodec $worlds,
-        private AtlasCodec $atlas,
         private GuideCodec $guide,
     ) {}

@@ -206,7 +205,7 @@
                 if ($known === null || $known['catalog'] !== 'lab' || $known['language'] !== $language) {
                     throw InvalidContent::at(self::FILE, "{$path}.labId", "se esperaba un ejercicio de lab en {$language}");
                 }
-                $rows->addAll($this->atlas->toRows($concept, $language, $position, $path));
+                $rows->add('atlas_concepts', AtlasConcept::fromDocument($concept, $language, $position, $path)->toRow());
             }
         }
     }
```

```diff
--- a/backend/api/app/Content/PortionAssembler.php
+++ b/backend/api/app/Content/PortionAssembler.php
@@ -2,11 +2,11 @@

 namespace App\Content;

-use App\Content\Codec\AtlasCodec;
 use App\Content\Codec\ExerciseCodec;
 use App\Content\Codec\GuideCodec;
 use App\Content\Codec\WorkshopCodec;
 use App\Content\Codec\WorldCodec;
+use App\Content\Record\AtlasConcept;
 use Illuminate\Support\Collection;
 use LogicException;
 use stdClass;
@@ -23,7 +23,6 @@
         private ExerciseCodec $exercises,
         private WorkshopCodec $workshops,
         private WorldCodec $worlds,
-        private AtlasCodec $atlas,
         private GuideCodec $guide,
     ) {}

@@ -38,7 +37,7 @@
             'workshops' => $this->workshopList($portion, $rows, $languages),
             'campaign' => $this->worldList($portion, $rows),
             'atlas' => $this->inPortion($rows['atlas_concepts'], 'language', $portion->slice())
-                ->map(fn (array $row) => $this->atlas->toRecord($row))
+                ->map(fn (array $row) => AtlasConcept::fromRow($row)->toPublished())
                 ->all(),
             'guide' => $this->guide->toRecord($rows, $languages),
             default => throw new LogicException("Grupo de porción desconocido: {$portion->group()}"),
```

## 2. Bordes del nivel 9 (dueño E, onda 1)

### Tarea 2.1 · Bordes (T005)

- **Cubre:** FR-012, sin cambios de comportamiento (FR-009 y FR-011).
- **Cambia:** en `app/Content/`, `ContentSnapshot`, `ImportLock`, `BodyCache`, `Portion`, `ContentTables` y `ContentImports`; y `app/Console/Commands/ImportContent.php`.

**Pasos:**

1. **La prueba que falla.** `npm run api:analyse -- --level 9 app/Content/ContentDelivery.php app/Content/ImportLock.php app/Content/BodyCache.php app/Console/Commands/ImportContent.php app/Content/Portion.php app/Content/ContentTables.php app/Content/ContentImports.php` da 28 errores: 20 de `ContentDelivery`, 2 de `ImportLock`, 2 de `BodyCache` y 1 de cada uno de los otros cuatro.
2. **La red.** `npm run api:test` está en verde antes de tocar nada.
3. Aplicá los cambios de abajo. `ContentDelivery` no cambia: la plantilla de `ContentSnapshot::read()` le da el tipo.
4. El mismo análisis da 0 errores, y `npm run api:test` sigue en verde.

**Verificado al planificar:** con estos cambios, más el de `ContentSource::read()` (T003), el PHPDoc de `ContentWriter` (T010) y `config/filesystems.php` (T012), el nivel 9 baja de 106 a 75 errores. La suite completa pasa igual que sin ellos: 331 pruebas y 976 aserciones.

```diff
--- a/backend/api/app/Content/ContentSnapshot.php
+++ b/backend/api/app/Content/ContentSnapshot.php
@@ -13,6 +13,12 @@
  */
 final class ContentSnapshot
 {
+    /**
+     * @template T
+     *
+     * @param  Closure(): T  $callback
+     * @return T
+     */
     public static function read(Closure $callback): mixed
     {
         // Inside an open transaction (tests under RefreshDatabase) the read happens in that one.
```

```diff
--- a/backend/api/app/Content/ImportLock.php
+++ b/backend/api/app/Content/ImportLock.php
@@ -18,13 +18,13 @@

     public function acquire(): bool
     {
-        return (int) DB::scalar('select get_lock('.self::NAME.', 0)') === 1;
+        return in_array(DB::scalar('select get_lock('.self::NAME.', 0)'), [1, '1'], true);
     }

     /** Whether the lock still belongs to this connection. */
     public function stillHeld(): bool
     {
-        return (int) DB::scalar('select is_used_lock('.self::NAME.') = connection_id()') === 1;
+        return in_array(DB::scalar('select is_used_lock('.self::NAME.') = connection_id()'), [1, '1'], true);
     }

     public function release(): void
```

```diff
--- a/backend/api/app/Content/BodyCache.php
+++ b/backend/api/app/Content/BodyCache.php
@@ -33,7 +33,7 @@
         if (hash('sha256', $body) !== $hash) {
             throw new LogicException("El cuerpo de {$portion->value} no tiene el hash {$hash}: no se guarda.");
         }
-        $this->store()->put($this->key($portion, $hash), $body, now()->addDays((int) config('content.cache_days')));
+        $this->store()->put($this->key($portion, $hash), $body, now()->addDays(config()->integer('content.cache_days')));
     }

     public function forget(Portion $portion, string $hash): void
@@ -53,6 +53,6 @@

     private function store(): Repository
     {
-        return Cache::store(config('content.cache_store'));
+        return Cache::store(config()->string('content.cache_store'));
     }
 }
```

```diff
--- a/backend/api/app/Console/Commands/ImportContent.php
+++ b/backend/api/app/Console/Commands/ImportContent.php
@@ -42,7 +42,7 @@

     private function runImport(ContentImporter $importer, ImportLock $lock): int
     {
-        $source = ContentSource::fromDirectory(config('content.path'));
+        $source = ContentSource::fromDirectory(config()->string('content.path'));
         if ($source->sourceCommit() === null) {
             $this->warn('El contenido no trae commit de origen (CONTENT_SOURCE_COMMIT): content_imports lo registra como nulo.');
         }
```

```diff
--- a/backend/api/app/Content/Portion.php
+++ b/backend/api/app/Content/Portion.php
@@ -80,6 +80,7 @@

         $allowed = ['language' => self::LANGUAGES, 'domain' => self::DOMAINS];
         $errors = [];
+        $slice = '';
         foreach ($allowed as $param => $values) {
             if ($param !== $sliceBy) {
                 if (array_key_exists($param, $query)) {
@@ -94,13 +95,15 @@
                 $errors[$param] = ["Falta el parámetro {$param}: usá {$options}."];
             } elseif (! is_string($value) || ! in_array($value, $values, true)) {
                 $errors[$param] = ["El valor de {$param} no es válido: usá {$options}."];
+            } else {
+                $slice = $value;
             }
         }
         if ($errors !== []) {
             throw new InvalidPortionRequest($errors);
         }

-        return self::from("{$group}.{$query[$sliceBy]}");
+        return self::from("{$group}.{$slice}");
     }

     /** @param array<string, mixed> $query */
```

```diff
--- a/backend/api/app/Content/ContentTables.php
+++ b/backend/api/app/Content/ContentTables.php
@@ -2,6 +2,8 @@

 namespace App\Content;

+use LogicException;
+
 /**
  * The content tables that `content:import` writes row by row, in dependency order (each foreign
  * key points to an earlier one), with the columns of their primary key. Two are written
@@ -9,7 +11,7 @@
  */
 final class ContentTables
 {
-    /** @var array<string, list<string>> */
+    /** @var array<string, non-empty-list<non-empty-string>> */
     public const KEYS = [
         'languages' => ['code'],
         'catalogs' => ['code'],
@@ -48,6 +50,13 @@
     /** @param array<string, mixed> $row */
     public static function keyOf(string $table, array $row): string
     {
-        return collect(self::KEYS[$table])->map(fn (string $column) => (string) $row[$column])->implode("\x1f");
+        return collect(self::KEYS[$table])->map(function (string $column) use ($table, $row): string {
+            $value = $row[$column] ?? null;
+            if (! is_int($value) && ! is_string($value)) {
+                throw new LogicException("{$table}: la columna {$column} de la clave no es un texto ni un entero");
+            }
+
+            return (string) $value;
+        })->implode("\x1f");
     }
 }
```

```diff
--- a/backend/api/app/Content/ContentImports.php
+++ b/backend/api/app/Content/ContentImports.php
@@ -3,6 +3,7 @@
 namespace App\Content;

 use Illuminate\Support\Facades\DB;
+use LogicException;

 /** Reads the latest import: one row by primary key. */
 final class ContentImports
@@ -13,6 +14,24 @@

         return $row === null
             ? null
-            : new LatestImport((int) $row->id, $row->document_hash, $row->source_commit, json_decode($row->portion_hashes, true, 512, JSON_THROW_ON_ERROR));
+            : new LatestImport((int) $row->id, $row->document_hash, $row->source_commit, $this->portionHashes($row->portion_hashes));
+    }
+
+    /** @return array<string, string> */
+    private function portionHashes(string $json): array
+    {
+        $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
+        if (! is_array($decoded)) {
+            throw new LogicException('content_imports.portion_hashes no es un objeto');
+        }
+        $hashes = [];
+        foreach ($decoded as $portion => $hash) {
+            if (! is_string($portion) || ! is_string($hash)) {
+                throw new LogicException('content_imports.portion_hashes tiene una huella que no es texto');
+            }
+            $hashes[$portion] = $hash;
+        }
+
+        return $hashes;
     }
 }
```

## 3. Familias de registros (dueños R1 a R4, onda 2)

Las cuatro familias corren a la vez desde S1, cada una con sus archivos. Todas siguen los mismos pasos:

1. **La prueba.** Escribí `tests/Unit/Record/<Familia>RecordsTest.php`, con cuatro partes:
   - la ida y vuelta de cada registro de la familia que trae el documento de la imagen, contra el `PublishedJson::encode()` del registro del documento;
   - la misma ida y vuelta con los enteros de las filas como texto;
   - los casos propios de la familia;
   - los mensajes de su lista, literales de C2.

   El contexto que necesite (posiciones, huellas, claves de etapa) sale del documento y del meta como archivos (FR-016).
2. **Falla**, porque las clases no existen.
3. **Implementá** según [data-model.md](./data-model.md), con `AtlasConcept` como modelo:
   - `KEYS`, en el orden de C2;
   - `fromDocument`, que lee con `DocumentFields` en ese orden y valida como su códec de C2, en el orden que dice data-model.md;
   - `fromRow`, con `RowFields` y los hijos ya construidos;
   - `toRow()`, con las columnas de C2;
   - `toPublished()`, con `KeyOrder::publish()`;
   - `rowsByTable()` en los agregados, con las listas armadas con `foreach` (research.md, R14).
4. **Pasa**, y `npm run api:analyse -- --level 9 app/Content/Record` da 0 errores.
5. **Commit.** No se tocan `ContentRows`, `PortionAssembler` ni `Codec/`: los integra W en T010 y T011, con el oráculo de filas como juez.

### Tarea 3.1 · Mundos (T006, R1)

- **Crea:** en `Record/`, `World.php`, `WorldExercise.php` y `WorldRole.php`; y `tests/Unit/Record/WorldRecordsTest.php`.
- **Casos:**
  - la ida y vuelta de los 8 mundos;
  - los miembros de cada mundo: `training`, con las posiciones 0…n, `challenge`, y un solo `boss`, que es el último de `challengeIds`;
  - `trainingIds`, `challengeIds` y `bossId` publicados en el orden de `position`;
  - `WorldExercise::fromRow` con `role: 'mentor'` lanza `LogicException`.
- **Mensajes** (los de `WorldCodec`):
  - `trainingIds[0] = 7` da «curriculum.json: campaign.rust[0].trainingIds: se esperaba una lista de IDs»;
  - `challengeIds = []` da «….challengeIds: se esperaba una lista de IDs»;
  - `bossId` igual a `trainingIds[0]` da «curriculum.json: campaign.go[0].bossId: el jefe tiene que ser el último de challengeIds»;
  - una clave `extra` da «….extra: clave desconocida».

### Tarea 3.2 · Ejercicios (T007, R2)

- **Crea:** en `Record/`, `Exercise.php`, `ExerciseTest.php`, `ExerciseHint.php` y `Topic.php`; y `tests/Unit/Record/ExerciseRecordsTest.php`.
- **Casos:**
  - **la ida y vuelta de los 274 ejercicios.** La prueba arma el contexto desde el documento y el meta como archivo: el catálogo, el dominio de los `cores`, la posición, `ExerciseHashes::fromDocument` de `meta['exercises'][$id]`, y el taller dueño de cada núcleo, que sale de los mapas `code` de `workshops`. Los hijos se reconstruyen con sus `fromRow`;
  - los 16 núcleos que publican `workshopId` lo publican; el resto de los núcleos guarda `workshop_id` sin publicarlo;
  - `level` y `challengeType` ausentes no se publican;
  - `rowsByTable()` da `exercises`, `topics`, `exercise_tests` y `exercise_hints`, con el `test_key` y las posiciones de C2.
- **Mensajes** (los de `ExerciseCodec` y `ContentRowsTest`), sobre `lab.rust[0]`:
  - un título vacío da «….title: se esperaba un texto no vacío»;
  - `stage = '1'` da «….stage: se esperaba un entero»;
  - `topic = ''` da «….topic: se esperaba un texto no vacío»;
  - `tests = []` da «….tests: se esperaba una lista no vacía»;
  - `tests[0] = 'x'` da «….tests[0]: se esperaba un objeto»;
  - `hints[0] = '  '` da «….hints[0]: se esperaba un texto no vacío»;
  - una clave `extra` da «….extra: clave desconocida»;
  - sin `minutes`, da «curriculum.json: lab.rust[0]: falta la clave «minutes»».

### Tarea 3.3 · Talleres (T008, R3)

- **Crea:** en `Record/`, `Workshop.php`, `WorkshopObjective.php`, `WorkshopStep.php` y `WorkshopRelatedExercise.php`; y `tests/Unit/Record/WorkshopRecordsTest.php`.
- **Casos:**
  - **la ida y vuelta de los 25 talleres.** `stepKeys` se arma con `StepKey::fromDocument` del meta como archivo, `languages` es `['rust', 'go']`, y la prueba arma `code` y `related` desde el documento. `fromRow` recibe los hijos reconstruidos y `related` agrupado por el lenguaje de cada ejercicio, que la prueba saca del documento;
  - la clave y el índice v1 de cada etapa van en la fila y no se publican;
  - las posiciones de `related` son por lenguaje;
  - `code` y `related` se publican en el orden de `languages`.
- **Mensajes**, sobre `workshops.lowlevel[0]`:
  - `objectives = []` da «….objectives: se esperaba una lista no vacía»;
  - `steps[0] = 'x'` da «….steps[0]: se esperaba un objeto»;
  - una clave de etapa de menos da «curriculum.meta.json: workshopSteps.{id}: N claves para M etapas: regenerá los dos archivos juntos»;
  - `minutes = '30'` da «….minutes: se esperaba un entero»;
  - una clave `extra` da «….extra: clave desconocida».

### Tarea 3.4 · Guía (T009, R4)

- **Crea:** en `Record/`, `Guide.php`, `GuideResource.php`, `GuideSource.php`, `GuideTrack.php`, `GuideModule.php`, `GuideStep.php` y `GuideStepResource.php`; y `tests/Unit/Record/GuideRecordsTest.php`.
- **Casos:**
  - **la ida y vuelta de la guía entera:** `Guide::fromDocument($document->guide, ['rust', 'go'], 'guide')`, las filas de las seis tablas, la reconstrucción desde las filas con `new Guide(...)` y los bytes, que tienen que ser los de `PublishedJson::encode($document->guide)`;
  - `featured` sale como `0` o `1` en la fila y como booleano en lo publicado;
  - los `resourceIds` salen en el orden de `position`;
  - la raíz publica `resources`, `tracks` y `sources`, en ese orden.
- **Mensajes:**
  - `resources[0].featured = 'yes'` da «curriculum.json: guide.resources[0].featured: se esperaba true o false»;
  - la raíz en otro orden da «curriculum.json: guide: las claves de la guía tienen que ser resources, tracks y sources, en ese orden»;
  - los recorridos en otro orden dan «curriculum.json: guide.tracks: un recorrido por lenguaje, en el orden de languages: rust, go»;
  - `resourceIds = []` da «….resourceIds: se esperaba una lista de recursos»;
  - un `resourceIds` con `5` da «curriculum.json: guide.steps.{id}.resourceIds: «5» no es un recurso de guide.resources».

## 4. Integración (dueño W, onda 3)

### Tarea 4.1 · El import arma registros (T010)

- **Cubre:** FR-006, FR-008, FR-009, FR-010, FR-012 y FR-018.
- **Cambia:** en `app/Content/`, `ContentRows.php`, `ContentDiff.php` y `ContentWriter.php`; y `tests/Support/ContentPipeline.php`.

**Pasos:**

1. **La red.** Con R1 a R4 integrados (S2), `npm run api:test` está en verde, con `RowOracleTest` como juez de las filas.
2. **`ContentRows`:**
   - `addExercises()` llama a `Exercise::fromDocument($exercise, $catalog, $domain, $position, $hashes, $owners[$id] ?? null, $at)->rowsByTable()`. Los temas se agregan una sola vez, como en C2, con la misma comprobación de etiqueta sobre `$fragment['topics']`, y el resto entra con `$rows->addAll()`. Se va el arreglo temporal de T003.
   - `addWorkshops()`, después de comprobar `bridge`, arma `$related` (`array<string, list<string>>`). Por lenguaje, si no hay una lista no vacía, falla con «se esperaba una lista de ejercicios», el mensaje que daba `WorkshopCodec`; después hace la comprobación de C2 de cada ejercicio. Arma `$code` (`array<string, string>`) con el mapa `code` que ya validó `workshopOwners()`. Por último llama a `Workshop::fromDocument($workshop, $domain, $position, $stepKeys, $source->languages(), $code, $related, $path)->rowsByTable()`, sin el arreglo temporal de T003.
   - `addWorlds()` llama a `World::fromDocument($world, $language, $position, $path)->rowsByTable()`.
   - `addGuide()` llama a `Guide::fromDocument($source->decoded->guide, $source->languages(), 'guide')->rowsByTable()` y, después, hace la comprobación de recursos de C2.
   - El constructor queda sin dependencias, y `ContentPipeline::rows()` pasa a `new ContentRows`.
3. **El juez.** `RowOracleTest`, `ContentRowsTest`, `ContentDiffTest` e `ImportContentTest` tienen que estar en verde. Si el oráculo difiere en una tabla, el que está mal es el registro de esa tabla: corregí el registro, que desde S2 es de W, y nunca el oráculo.
4. **Los tipos de la diferencia.** Aplicá los cambios de `ContentDiff` y del PHPDoc de `ContentWriter::upsert()` (diffs abajo). `npm run api:analyse -- --level 9 app/Content/ContentRows.php app/Content/ContentDiff.php app/Content/ContentWriter.php` da 0 errores.
5. `npm run api:test` está en verde.

**Verificado al planificar:** los cambios de `ContentDiff`, que bajan sus errores de 8 a 0, y el de `ContentWriter`, de 1 a 0, con la suite completa en verde. Lo de `ContentRows` no se escribió.

```diff
--- a/backend/api/app/Content/ContentDiff.php
+++ b/backend/api/app/Content/ContentDiff.php
@@ -2,8 +2,10 @@

 namespace App\Content;

+use App\Content\Record\RowFields;
 use Closure;
 use Illuminate\Support\Arr;
+use LogicException;

 /**
  * The difference between the document (RowSet) and the tables, computed in PHP with strict
@@ -38,8 +40,10 @@
     /**
      * What `$rowsOf` returns for each table, in dependency order, leaving out the tables where it returns nothing.
      *
-     * @param  Closure(string): list<array<string, mixed>>  $rowsOf
-     * @return array<string, list<array<string, mixed>>>
+     * @template TRow of array<string, mixed>
+     *
+     * @param  Closure(string): list<TRow>  $rowsOf
+     * @return array<string, list<TRow>>
      */
     private function rowsByTable(Closure $rowsOf): array
     {
@@ -103,8 +107,11 @@
     {
         $versions = [];
         foreach ($desired->rows('exercises') as $exercise) {
-            if (! isset($knownVersions["{$exercise['id']}\x1f{$exercise['grading_hash']}"])) {
-                $versions[] = ['exercise_id' => $exercise['id'], 'grading_hash' => $exercise['grading_hash']];
+            $fields = new RowFields($exercise, 'exercises');
+            $id = $fields->string('id');
+            $gradingHash = $fields->string('grading_hash');
+            if (! isset($knownVersions["{$id}\x1f{$gradingHash}"])) {
+                $versions[] = ['exercise_id' => $id, 'grading_hash' => $gradingHash];
             }
         }

@@ -144,7 +151,7 @@
         if ($table !== 'exercise_tests') {
             return;
         }
-        $exercise = $stored['exercises'][$row['exercise_id']] ?? null;
+        $exercise = $stored['exercises'][(new RowFields($row, 'exercise_tests'))->string('exercise_id')] ?? null;
         $retiredTogether = $exercise !== null && $exercise['status'] !== 'active' && $exercise['retired_at'] === $current['retired_at'];
         if (! $retiredTogether) {
             throw InvalidContent::at('curriculum.json', "exercise_tests.{$row['exercise_id']}.{$row['test_key']}", 'el test_key se retiró y no se reutiliza: esa prueba no puede volver hasta que B2 quite la regla t{i+1} del generador');
@@ -165,7 +172,7 @@
         $keptByLeavers = collect($storedSteps)
             ->diffKeys($steps)
             ->filter(fn (array $leaver) => $leaver['v1_position'] !== null)
-            ->mapWithKeys(fn (array $leaver) => [$this->v1Slot($leaver) => $leaver['step_key']])
+            ->mapWithKeys(fn (array $leaver) => [$this->v1Slot($leaver) => (new RowFields($leaver, 'workshop_steps'))->string('step_key')])
             ->all();
         $owners = [];
         foreach ($steps as $step) {
@@ -187,7 +194,9 @@
     /** @param array<string, mixed> $step */
     private function v1Slot(array $step): string
     {
-        return "{$step['workshop_id']}\x1f{$step['v1_position']}";
+        $fields = new RowFields($step, 'workshop_steps');
+
+        return $fields->string('workshop_id')."\x1f".$fields->int('v1_position');
     }

     /**
@@ -226,7 +235,13 @@
     /** MySQL gives back integers or strings depending on the driver; the comparison is on text. */
     private function normalized(mixed $value): ?string
     {
-        return $value === null ? null : (string) $value;
+        if ($value === null) {
+            return null;
+        }
+        if (is_int($value) || is_string($value)) {
+            return (string) $value;
+        }
+        throw new LogicException('Una columna de contenido trae '.get_debug_type($value).': se esperaba un texto, un entero o NULL.');
     }

     /**
```

```diff
--- a/backend/api/app/Content/ContentWriter.php
+++ b/backend/api/app/Content/ContentWriter.php
@@ -41,7 +41,7 @@
     }

     /**
-     * @param  list<string>  $keys
+     * @param  non-empty-list<non-empty-string>  $keys
      * @param  list<array<string, int|string|null>>  $rows
      */
     private function upsert(string $table, array $keys, array $rows, string $now): void
```

### Tarea 4.2 · La entrega arma registros y se borra `Codec/` (T011)

- **Cubre:** FR-005, FR-011, FR-012 y FR-015.
- **Cambia:**
  - en `app/Content/`: `PortionAssembler`, `PortionRenderer`, `ContentReader` y `JsonDiff`;
  - `tests/Support/ContentPipeline.php`;
  - en `tests/Unit/`: `ContentRowsTest` y `ContentRoundTripTest`.
- **Borra:** en `app/Content/Codec/`, `ExerciseCodec`, `WorkshopCodec`, `WorldCodec`, `GuideCodec`, `FieldMap`, `Field` y `FieldType`. La carpeta queda vacía y se borra.
- **Entrega:** `PortionAssembler::exercise(array $exercise, list<array<string, mixed>> $tests, list<array<string, mixed>> $hints, ?array $topic): Exercise`.

**Pasos:**

1. **La prueba que falla y la red.** `npm run api:analyse -- --level 9 app/Content/PortionAssembler.php app/Content/ContentReader.php` da 26 errores, 23 y 3. `npm run api:test` está en verde.
2. **`PortionAssembler`:**
   - Cada rama arma sus registros con su `fromRow`.
   - Los hijos se agrupan por el ID del padre, en el orden de `position`; las filas se ordenan antes de convertirlas.
   - Filtra por porción con las propiedades (`catalog`, `domain` y `language`), ordena por `position` y publica con `toPublished()`.
   - En `workshops`, lee con `RowFields` las filas parciales de `exercises` (`id`, `language` y `workshop_id`). De ahí saca el lenguaje de cada ejercicio relacionado y el núcleo de cada taller.
   - La guía se arma con `new Guide(...)` desde sus seis tablas. Si falta un recorrido, lanza el `InvalidContent` de C2: «guide_tracks: no hay una fila activa con language = …».
   - `exercise()` arma un ejercicio con su tema, sus pruebas y sus pistas. Si falta el tema, lanza `LogicException`. Por omisión, ese error y los de `RowFields` llegan como 500 (research.md, R10, opción a). Si el usuario elige la opción b, `ContentDelivery` atrapa la falla del armado, la registra y responde con `maintenance()`, y `ContentEndpointTest` suma un caso que retira a mano el tema de un ejercicio activo.
   - El constructor queda sin dependencias.
3. **`PortionRenderer`** pierde `ExerciseCodec`; `renderExercise()` publica `$this->assembler->exercise(...)->toPublished()`.
4. **`ContentReader`:**
   - `languages()` usa `Language::fromRow`;
   - `exercise()` devuelve la fila del tema (`'topic' => ?array`);
   - `get()` arma cada fila con `get_object_vars()` y devuelve una lista (research.md, R14).
5. **`JsonDiff`** usa `KeyOrder::of($value)->keys` en lugar de `FieldMap::keysOf()`.
6. **Borrá `Codec/`.**
   - `ContentRowsTest` llama a `World::fromDocument(…)` donde llamaba a `WorldCodec`, con el mismo mensaje esperado.
   - `ContentRoundTripTest` usa `ContentPipeline::assembler()->exercise(…)` donde usaba `ExerciseCodec::toRecord()`.
   - `ContentPipeline::assembler()` pasa a `new PortionAssembler`.
7. **Cierre.** `npm run api:test` está en verde, con `ContentRoundTripTest` (las 17 porciones y los 274 ejercicios con las huellas del meta) y `ContentContractTest`. En `npm run api:analyse -- --level 9` sólo queda `config/filesystems.php`, que corrige T012.

**Sin verificar al planificar:** esta tarea no se escribió.

## 5. Cierre (coordinador, onda 4)

### Tarea 5.1 · El nivel 9 (T012)

- **Cubre:** FR-012, FR-014 y SC-004.
- **Cambia:** `config/filesystems.php` (diff abajo) y `phpstan.neon` (`level: 9`).
- **Pasos:**
  1. Con S3, `npm run api:analyse` da 0 errores, sin baseline ni `ignoreErrors`.
  2. `git diff --stat <base>..HEAD -- backend/api/composer.json backend/api/composer.lock` sale vacío.
  3. Si C3 se integró antes, su código también pasa.
  4. Commit: `build(api): PHPStan sube al nivel 9 con los registros tipados`.
- **Verificado al planificar:** el cambio de `config/filesystems.php` corrige su error del nivel 9.

```diff
--- a/backend/api/config/filesystems.php
+++ b/backend/api/config/filesystems.php
@@ -42,7 +42,7 @@
         'public' => [
             'driver' => 'local',
             'root' => storage_path('app/public'),
-            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
+            'url' => rtrim((string) env('APP_URL', 'http://localhost'), '/').'/storage',
             'visibility' => 'public',
             'throw' => false,
             'report' => false,
```

### Tarea 5.2 · Documentación (T013)

- **Cubre:** FR-013.
- **Cambia:**
  - **`backend/api/AGENTS.md`:** «nivel 6» pasa a «nivel 9». En «Contenido (C2)» se suma una línea: los registros tipados viven en `app/Content/Record/`, con `fromDocument`, `fromRow`, `toRow()` y `toPublished()`, y en los bordes siguen los arreglos.
  - **`docs/agent-skills.md`:** el proyecto tiene PHPStan, en el nivel 9 desde C6 y por decisión propia; `strict_types` y la cobertura del 80 % siguen fuera.
  - **`docs/architecture.md`:** la fila del contenido nombra `Record/`.
- **Comprobación:** las rutas y los enlaces locales, y `git diff --check`.

### Tarea 5.3 · Mutaciones (T014)

- **Cubre:** SC-005, con el escenario 3 de [quickstart.md](./quickstart.md).
- **Resultado esperado:** 5 de 5 mutaciones detectadas. La evidencia va en el mensaje del commit de cierre.

### Tarea 5.4 · Despliegue sobre C2 y compuerta final (T015)

- **Cubre:** FR-003, FR-019, SC-001, SC-002, SC-003, SC-006 y SC-007, con los escenarios 4 y 5 de [quickstart.md](./quickstart.md).
- **Resultado esperado:**
  - el import no escribe nada sobre la base de C2;
  - las 17 porciones responden 304, con el mismo `Content-Version`;
  - la compuerta está entera en verde.

### Tarea 5.5 · Retiro del oráculo (T016)

- **Cubre:** el ciclo de vida del oráculo (research.md, R7).
- **Borra:** `tests/Support/RowOracle.php`, `tests/Support/print-row-oracle.php`, `tests/Support/row-oracle.json` y `tests/Unit/RowOracleTest.php`. `ContentPipeline` se queda.
- **Pasos:** `npm run api:test -- --testsuite=Unit` está en verde, y el commit lleva en el mensaje la evidencia de T015.

## Los 106 errores del nivel 9

Medidos el 2026-10-05 sobre esta rama, con PHPStan 2.2.17 y la configuración de hoy cambiando sólo el nivel. Cada fila dice qué los corrige. «Verificado» quiere decir que la planificación aplicó el cambio y los vio desaparecer.

| Archivo | Errores (líneas) | Causa | Lo corrige |
| --- | --- | --- | --- |
| `Codec/FieldMap.php` | 6 (27, 94, 96, 108, 109, 111) | castea valores sin tipo del documento y de la fila | T011 lo borra; la lectura tipada vive en `DocumentFields` y `RowFields` (T002) |
| `Codec/AtlasCodec.php` | 2 (45 ×2) | `key_order` sin tipo | T004 lo borra (verificado) |
| `Codec/ExerciseCodec.php` | 4 (111 ×2, 115 ×2) | `key_order` sin tipo | T011 lo borra |
| `Codec/GuideCodec.php` | 3 (146, 154, 155) | `key_order` y el ID del padre sin tipo | T011 lo borra |
| `Codec/WorkshopCodec.php` | 6 (133 ×2, 135 ×2, 139 ×2) | `key_order` sin tipo | T011 lo borra |
| `Codec/WorldCodec.php` | 2 (79 ×2) | `key_order` sin tipo | T011 lo borra |
| `ContentRows.php` | 12 (52, 53, 54, 55, 56, 58, 89, 132, 138, 171, 173, 176) | el meta leído como arreglo | T003: `ContentMeta` y sus partes |
| `ContentSource.php` | 4 (46, 51, 57, 74) | el meta como arreglo; el `false` de `file_get_contents` | T003 (el 74, verificado) |
| `ContentImporter.php` | 3 (84, 108, 109) | `meta['portions']` | T003: `portionHash()` |
| `ContentDiff.php` | 8 (30, 34, 111, 147, 181, 190 ×2, 229) | columnas leídas por su nombre; `rowsByTable()` sin plantilla | T010: plantilla y `RowFields` (verificado) |
| `ContentWriter.php` | 1 (59) | claves de `upsert` que pueden venir vacías | T005 (`ContentTables::KEYS`) y T010 (PHPDoc), verificado |
| `ContentReader.php` | 3 (26, 60, 127) | `pluck` sin tipo, la etiqueta del tema y `(array)` de una fila | T011: `Language::fromRow`, la fila del tema y `get_object_vars()` |
| `PortionAssembler.php` | 23 (59–140) | filas leídas por su nombre | T011: los registros con `fromRow` |
| `ContentDelivery.php` | 20 (52–63, 87–106) | `ContentSnapshot::read()` devuelve `mixed` | T005: plantilla en `ContentSnapshot` (verificado) |
| `ImportLock.php` | 2 (21, 27) | cast de `DB::scalar()` | T005: `in_array(…, [1, '1'], true)` (verificado) |
| `BodyCache.php` | 2 (36, 56) | `config()` sin tipo | T005: `config()->integer()` y `config()->string()` (verificado) |
| `Console/Commands/ImportContent.php` | 1 (45) | `config()` sin tipo | T005: `config()->string()` (verificado) |
| `Portion.php` | 1 (103) | un parámetro del pedido sin tipo | T005: la porción sale del valor validado (verificado) |
| `ContentTables.php` | 1 (51) | cast de un valor sin tipo | T005 (verificado) |
| `ContentImports.php` | 1 (16) | `json_decode` sin tipo | T005 (verificado) |
| `config/filesystems.php` | 1 (45) | `env()` da `bool\|string` | T012 (verificado) |

Total: 106 = 23 de `Codec/` + 18 del meta + 1 de `read()` + 8 de la diferencia + 1 de la escritura + 26 de la lectura y el armado + 28 de los bordes + 1 de la configuración.

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T003 (meta), T004 y T006 a T009 (registros) |
| FR-002 | T004 y T006 a T009 |
| FR-003 | T002, T010, T011 y T015 (la compuerta busca `JsonSerializable`; Review Focus) |
| FR-004 | T002 (`KeyOrder`, `JsonValue`) y T004 y T006 a T009 |
| FR-005 | T004, T011 (`ContentRoundTripTest`, `ContentContractTest`) y T015 |
| FR-006 | T001, T010 y T015 |
| FR-007 | T002 y T004 y T006 a T009 (enteros como texto) |
| FR-008 | T002, T003, T004 y T006 a T009 y T010 (`ContentRowsTest`) |
| FR-009 | T010 y T015 |
| FR-010 | T010 |
| FR-011 | T011 y T015 |
| FR-012 | T003, T005, T010, T011 y T012 |
| FR-013 | T012 (la CI lee `phpstan.neon`) y T013 |
| FR-014 | T012 (`composer.json` sin cambios) y T015 |
| FR-015 | T003, T004, T010 y T011 (sólo la entrada), y T015 (el diff de `tests/`) |
| FR-016 | T001 y T003 |
| FR-017 | T004 y T006 a T009 |
| FR-018 | T001 y T010 |
| FR-019 | T015 |
| SC-001 | T011 y T015 |
| SC-002 | T015 |
| SC-003 | T010 y T015 |
| SC-004 | T012 |
| SC-005 | T014 |
| SC-006 | T012 y T015 |
| SC-007 | T015 |

## Descargas y permisos

No hay ninguna prevista:

- C6 no cambia `composer.json`, `composer.lock` ni `package-lock.json`;
- las imágenes base (`php:8.5-fpm-alpine`, `composer:2.10`, `node:24-alpine` y `mysql:9.7`) ya están en la máquina;
- la caché de BuildKit tiene las capas de `composer install` y `npm ci`.

Si la caché no estuviera, la primera construcción de la imagen de pruebas bajaría paquetes, y eso necesita permiso del usuario. Ningún comando de este plan usa `docker pull`, y los de Compose a mano llevan `--pull never`.

## Riesgos y lo que quedó sin verificar

- **Verificado al planificar:**
  - T001, completo;
  - los lectores de T002;
  - `ContentMeta` y sus partes (T003);
  - el piloto de T004, integrado;
  - los bordes de T005;
  - los cambios de `ContentDiff` y `ContentWriter` de T010;
  - `config/filesystems.php` (T012).

  Con todo eso aplicado, la suite completa pasa con 332 pruebas.
- **Sin verificar:**
  - los consumidores del meta (T003, pasos 3 a 5);
  - las familias R1 a R4;
  - `ContentRows` en T010;
  - T011 entero;
  - el despliegue sobre una base de C2 (T015), que necesita el stack.

  Las pruebas, el oráculo y la compuerta son la red de todo eso.
- **El oráculo y el contenido.** Si `content/` cambia en `master` mientras dura C6, `RowOracleTest` falla con un mensaje que lo dice. Se regenera en la base de la rama, nunca con el código nuevo (quickstart.md, escenario 1).
- **Compose compartido.** Sin `COMPOSE_PROJECT_NAME`, los comandos tocan el stack `taller-rust-go` del checkout principal (spec, riesgo 7).
- **C3 en paralelo.** El nivel 9 rige para el código de C3 desde T012 (sección «Puntos de integración»).
- **El costo de crear objetos** no se mide (spec, riesgo 8).

## Complexity Tracking

Sin violaciones de la constitución: no hay nada que justificar.
