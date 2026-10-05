# Research: C6 · Registros tipados del contenido

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

La spec no dejó marcadores abiertos: el clarify del 2026-10-05 los cerró (alcance, diferencia del import, nivel 9, JSON anidado y lugar en la hoja de ruta). Este archivo registra las decisiones de diseño del plan y cómo se verificaron.

## Cómo se verificó al planificar

La sesión de planificación no tocó el repositorio. Copió `backend/api/app` y `config` a un directorio temporal y corrió PHP 8.5 y PHPStan 2.2.17 desde la imagen de pruebas `taller-reorg-test` (otro worktree, mismo código). Lo hizo con `docker run --rm --network none --pull never`, con el código montado de sólo lectura y sin tocar ningún proyecto de Compose. Resultados:

- **Línea de base.** En el nivel 6 hay 0 errores, como en la CI; en el 9, 106, y en el 10, 154.
- **Lectores y piloto.** `KeyOrder`, `JsonValue`, `DocumentFields`, `RowFields` y `AtlasConcept`, con el código de referencia de [plan.md](./plan.md), dan 0 errores en los niveles 9 y 10. Contra el `AtlasCodec` de C2, sobre el contenido real, los 32 conceptos dan:
  - la misma fila;
  - los mismos bytes publicados, que también son los del documento, incluso con los enteros como texto;
  - los mismos mensajes en seis casos de error. 30 de los 32 conceptos no tienen `furtherSources`.
- **Bordes.** Las correcciones de la tarea T005, más las de `ContentSource::read`, el PHPDoc de `ContentWriter::upsert` y `config/filesystems.php`, bajan el nivel 9 de 106 a 75 errores: 31 corregidos. Los 75 restantes son exactamente las lecturas de filas, del meta y de los códecs.
- **Diferencia del import.** La plantilla de `rowsByTable` y `RowFields` en `ContentDiff` bajan sus 8 errores a 0. Con esos parches y los de los bordes, la suite `Unit` sigue pasando: 199 pruebas y 358 aserciones.
- **Oráculo de filas.** El oráculo de filas de C2 sale igual en dos corridas y pesa unos 3 KB. Da lo mismo con los enteros como texto y cambia si cambia un solo carácter de un texto JSON. La huella del documento es `ef8f5715…`, la de la línea base de la reorganización.

## R1. El registro es su propio códec

**Decision**: una clase `final readonly` por tipo de registro en `app/Content/Record/`, con `fromDocument`, `fromRow`, `toRow()` y `toPublished()`. Los registros con hijos (`Exercise`, `Workshop`, `World` y la raíz `Guide`) contienen a sus hijos tipados y suman `rowsByTable()`, que devuelve su fila y las de sus hijos por tabla, como devolvía `toRows()` cada códec de C2. Cuando todos los registros están en uso, se borran `Codec/` (los cinco códecs, `FieldMap`, `Field` y `FieldType`).

**Rationale**: el usuario eligió constructores con nombre y salidas explícitas. ADR 0006 D10 pide «un códec por tipo de registro, en las dos direcciones», y la clase lo es. Con `rowsByTable()`, `ContentRows` cambia una llamada por otra y conserva su orden de validación.

**Alternatives considered**: clases mapper aparte, que suman una capa sin quitar ninguna. Mantener `FieldMap` como motor detrás de los registros, que deja el núcleo sin tipos y los valores como `mixed`. `ContentRows` recorriendo a mano los hijos de cada registro, que repite en él la forma de cada agregado.

## R2. Lectores compartidos con los mensajes de C2

**Decision**: `DocumentFields` lee un registro del documento con las reglas y los mensajes de `FieldMap::toColumns`: rechaza una clave desconocida antes de leer, «falta la clave «x»» en la ruta del registro, y texto no vacío, entero o booleano en la ruta del campo. `RowFields` lee una fila como la devuelve el driver: entero como `int` o como texto de dígitos, y bandera 0 o 1. Ante cualquier otra cosa lanza `LogicException`. Cada registro lee sus campos en el orden en que su `FieldMap` de C2 los declaraba.

**Rationale**: FR-007 y FR-008, sin repetir la validación en 19 clases. Con el mismo orden, un documento con un solo error da el mismo mensaje; está verificado en el piloto.

**Alternatives considered**: validar en cada registro sin lectores, con más código repetido. Usar `(int)` y `(string)` como `FieldMap::fromColumn`, que el nivel 9 rechaza sobre `mixed`.

## R3. Los valores JSON anidados se guardan como texto

**Decision**: `JsonValue` guarda el texto que da `PublishedJson::encode` sobre el valor del documento. `toRow()` devuelve ese texto y `toPublished()` lo decodifica con `PublishedJson::decode`, como hace C2 en las dos direcciones.

**Rationale**: el clarify (Q4) los dejó opacos. Guardar el texto deja la columna idéntica a la de C2 por construcción. `{}` sigue siendo `{}`, porque la decodificación da objetos.

**Alternatives considered**: guardar el valor decodificado, igual de correcto pero con un `mixed` más que estrechar; una forma tipada por valor anidado, que el clarify descartó.

## R4. El orden de claves es un valor tipado

**Decision**: `KeyOrder` guarda una lista de claves. Se arma con `KeyOrder::of()` desde el registro del documento, y con `KeyOrder::fromRow()` desde la columna, validada contra las claves del registro; una clave desconocida lanza `LogicException` con el mensaje de C2. `publish()` arma el registro publicado recorriendo ese orden.

**Rationale**: FR-004 y Q4. Hay 7 órdenes de ejercicio y 4 de taller, y ADR 0006 D10 descartó las constantes de orden.

**Alternatives considered**: publicar en el orden de las propiedades, que rompe los bytes; dejar `key_order` como texto, que el clarify descartó.

## R5. La diferencia del import sigue sobre filas

**Decision**: `RowSet`, `ContentDiff`, `ContentPlan` y `ContentWriter` siguen con filas (Q2). `ContentDiff` estrecha con `RowFields` las columnas que lee por su nombre (`id`, `grading_hash`, `exercise_id`, `step_key`, `workshop_id` y `v1_position`). `normalized()` acepta texto, entero o NULL y lanza ante otra cosa. `rowsByTable()` lleva una plantilla (`@template TRow`) para no perder el tipo de las filas.

**Rationale**: la comparación genérica ya tiene sus pruebas (`ContentDiffTest`). Los cambios son sólo de tipos y están verificados.

**Alternatives considered**: la diferencia sobre registros, que el clarify descartó.

## R6. El meta tipado

**Decision**: `ContentMeta` (en `app/Content/`) reemplaza al arreglo `ContentSource::$meta`. Sus partes son registros: `Catalog`, `StepKey` y `ExerciseHashes`, en `Record/`. Las comprobaciones y los mensajes son los de `ContentSource::validateMeta`, en el mismo orden. Para los idiomas, `Language` se arma en `ContentRows` con la posición del meta. `ContentMeta::portionHash(Portion)` reemplaza a `meta['portions'][...]`.

**Rationale**: Q1 incluye el meta. Cinco clases lo leían por clave, y 18 de los 106 errores del nivel 9 vienen de leerlo como arreglo: 12 en `ContentRows`, 3 en `ContentSource` y 3 en `ContentImporter`.

**Alternatives considered**: estrechar el arreglo en cada lectura, que reparte la validación.

## R7. El oráculo de filas

**Decision**: `Tests\Support\RowOracle::digest()` da una huella por tabla de `RowSet::toArray()`. Antes, cada valor pasa a texto o NULL y las columnas y las filas se ordenan por nombre y por clave primaria. `tests/Support/row-oracle.json` guarda la huella por tabla y la huella del documento para el que se calculó. Se genera en la primera tarea (T001), en su propio commit, antes de cualquier cambio en `app/`, con `tests/Support/print-row-oracle.php`. Ese script construye los códecs de C2 por su nombre, así que sólo corre con el código de C2: nadie puede regenerar el oráculo con el código nuevo. `RowOracleTest` lo compara con las filas del código de cada momento. El oráculo se retira al final (T016), después del despliegue sobre una base de C2.

**Rationale**: FR-006 y FR-018. La comparación es la misma que hace la diferencia del import (riesgo 2 de la spec). El oráculo se retira porque, después de C6, cada cambio de `content/` lo invalidaría y ya no habría código de C2 para regenerarlo. Lo que queda vigente es la idempotencia del import, que C2 ya prueba.

**Alternatives considered**: guardar todas las filas, unos 2.500 registros y una foto indiscriminada; o una huella por fila, unos 115 KB de fixture. Mantener el oráculo para siempre, que bloquearía cada cambio de contenido. Calcular el oráculo en cada corrida con el código de C2 copiado en `tests/`, que duplica los códecs.

## R8. Los bordes del nivel 9

**Decision**, verificada al planificar, por cada borde:

- `ContentSnapshot::read()` lleva `@template T`, con `Closure(): T` y `@return T`: corrige los 20 errores de `ContentDelivery`.
- `ImportLock` compara el resultado de `DB::scalar` con `in_array($valor, [1, '1'], true)`.
- `BodyCache` e `ImportContent` usan `config()->integer()` y `config()->string()`, que existen en el Laravel de la imagen.
- `Portion::resolve()` arma la porción con el valor que ya validó.
- `ContentTables::KEYS` pasa a `array<string, non-empty-list<non-empty-string>>`, y `keyOf()` acepta texto o entero y lanza ante otra cosa.
- `ContentImports` estrecha las huellas de `portion_hashes`.
- `ContentSource::read()` estrecha el `false` de `file_get_contents`.
- El PHPDoc de `ContentWriter::upsert()` pide claves no vacías.
- `config/filesystems.php` convierte a texto `env('APP_URL')`.

**Rationale**: FR-012 pide 0 errores sin baseline ni ignores. Son 31 errores con correcciones de una o dos líneas que no cambian el comportamiento.

**Alternatives considered**: un tipo propio para el estado del ejercicio en la entrega. No hace falta, porque el nivel 9 sólo es estricto con el `mixed` explícito y la lectura de una propiedad de `stdClass` no lo es.

## R9. Sin sintaxis posterior a PHP 8.3

**Decision**: los registros usan clases `readonly` (8.2), enums (8.1) y argumentos con nombre (8.0). No usan nada de 8.4 o 8.5. `composer.json` (`php: ^8.3`) y `composer.lock` no cambian.

**Rationale**: el patrón no lo necesita. Si cambiara `composer.json`, la imagen reconstruiría la capa de `vendor` y bajaría paquetes, lo que necesita permiso.

**Alternatives considered**: subir a `^8.5` para usar `clone with` o `array_first`, que estos registros, que se construyen una sola vez, no necesitan.

## R10. Dos desvíos deliberados en casos inalcanzables

**Decision**:

- Si falta la fila del tema de un ejercicio activo, el armado lanza `LogicException`; C2 publicaba el tema vacío y la verificación de la huella respondía 503. La clave foránea y las invariantes del import impiden ese caso.
- Si `file_get_contents` no puede leer un archivo que existe, `ContentSource` dice «no se pudo leer»; C2 terminaba en «no es JSON válido». Dentro de la imagen, el archivo siempre se puede leer.

**Rationale**: el nivel 9 obliga a decidir qué pasa con esos valores. Ningún caso lo cubre la suite, ni se alcanza con datos que el import haya escrito, así que FR-008 y SC-003 no cambian.

**Alternatives considered**: reproducir el comportamiento de C2 con valores inventados (un tema vacío, un texto vacío), que esconde un dato corrupto.

## R11. Los hijos de un taller llegan validados

**Decision**: `ContentRows` sigue validando `code`, `related` y `bridge` de cada taller antes de armar el registro, como en C2. Además se lleva de `WorkshopCodec` la comprobación «se esperaba una lista de ejercicios», y le pasa a `Workshop::fromDocument()` los mapas ya tipados: `array<string, string>` para `code` y `array<string, list<string>>` para `related`.

**Rationale**: la validación de esos mapas cruza el documento entero (núcleos y ejercicios por lenguaje), y ya vive en `ContentRows`. El registro no la repite.

**Alternatives considered**: que el registro relea `code` y `related` y los estreche, con los mismos mensajes repetidos en dos lugares.

## R12. Una sola fábrica para las pruebas

**Decision**: `Tests\Support\ContentPipeline` arma `ContentRows` y `PortionAssembler` para las pruebas de la suite `Unit`. Cuando sus constructores pierden los códecs (T004 y T011), sólo cambia esa clase.

**Rationale**: hoy cuatro archivos de prueba construyen esas clases a mano con los cinco códecs.

**Alternatives considered**: tocar los cuatro archivos en cada paso.

## R13. Nombres

**Decision**: el espacio de nombres es `App\Content\Record`. Las clases toman el nombre de su tabla en singular: `Exercise`, `ExerciseTest`, `ExerciseHint`, `Topic`, `Workshop`, `WorkshopObjective`, `WorkshopStep`, `WorkshopRelatedExercise`, `World`, `WorldExercise`, `AtlasConcept`, `Guide`, `GuideResource`, `GuideSource`, `GuideTrack`, `GuideModule`, `GuideStep`, `GuideStepResource`, `Language` y `Catalog`. Se suman `WorldRole`, `StepKey` y `ExerciseHashes`, más `ContentMeta` en `app/Content/`. Las pruebas de cada familia van en `tests/Unit/Record/<Familia>RecordsTest.php`, así ninguna se llama `ExerciseTestTest`.

**Rationale**: el mismo vocabulario en las tres representaciones; `ExerciseTest` es `exercise_tests` y `tests` en el documento.

**Alternatives considered**: renombrar la prueba de ejercicio como `ExerciseCheck`, que se aparta de la tabla y del documento.

## R14. Las listas tipadas se arman con `foreach`

**Decision**: donde una firma pide `list<…>` (las propiedades de los registros, `rowsByTable()` y los hijos que recibe `fromRow`), la lista se arma con un `foreach` que agrega al final, como en el código verificado de `KeyOrder` y `ContentMeta`. Para el resto de las transformaciones siguen las Collections y `Arr::` de `backend/api/AGENTS.md`.

**Rationale**: Larastan tipa `->values()->all()` como `array<int, T>`, no como `list<T>`. Son 4 de los 11 errores del nivel 8 de hoy (`FieldMap::keysOf` y los tres `*List` de `PortionAssembler`). Un `foreach` no encadena funciones `array_*`, así que respeta la regla.

**Alternatives considered**: bajar los tipos a `array<int, T>`, que pierde la garantía de lista que necesita el codificador; o envolver con `array_values()`, que encadena con `Arr::map`.
