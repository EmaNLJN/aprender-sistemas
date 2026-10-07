# Data Model: D1b · Importación y «Borrar todo»

**Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan-d1b.md](./plan-d1b.md) | **Investigación**: [research-d1b.md](./research-d1b.md) | **Contratos**: [http-d1b.md](./contracts/http-d1b.md) y [import-fixture.md](./contracts/import-fixture.md)

Los tipos de columna salen del [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (§5.3, D24, D26, D29 y D30). El DDL de abajo es **de referencia y no se ejecutó**: el host no tiene MySQL y no se usó Docker. Las migraciones lo escriben con un único `CREATE TABLE` por archivo (D35), y la prueba de esquema lo contrasta con las listas de columnas de la sección 2, que salen del ADR y no del DDL.

D1b crea **dos** tablas de usuario, `progress_imports` y `campaign_seals`, con 17 columnas y 3 claves foráneas. Con ellas quedan las 12 de D1. No altera ninguna tabla de B2 ni de D1a. Escribe filas en las de D1a y en `exercise_progress`, `attempts`, `attempt_tests` y `attempt_payloads` de B2, siempre con sus columnas y su forma de escribir.

## 1. Convenciones que se heredan

- **Las de D1a** ([data-model.md](./data-model.md), sección 1), sin cambios:
  - `DATETIME(3)` en UTC, y cada hora es un binding `Y-m-d H:i:s.v` del reloj de PHP (`Instant::format`);
  - los ids de contenido, los hashes y los conjuntos, en `ascii_bin`;
  - ninguna restricción `CHECK` toca una columna `DATETIME`;
  - `ON DELETE CASCADE` desde `users`, `RESTRICT` hacia el contenido y `ON UPDATE RESTRICT` siempre;
  - los upserts, con alias de fila y sin `VALUES()`;
  - la guarda de la revisión, primero.
- **Migraciones.** Las dos que D1a reservó en su bloque: `2026_10_06_100011_create_progress_imports_table.php` y `2026_10_06_100012_create_campaign_seals_table.php`. Cada `down()` es `Schema::dropIfExists` y sirve sólo en desarrollo (ADR 0006 §10).
- **Instantes del v1.** El v1 guarda milisegundos desde 1970. Un instante entra a una columna sólo si es un entero entre `-30610224000000` (1000-01-01T00:00:00.000Z) y `253402300799999` (9999-12-31T23:59:59.999Z); si no, se omite con informe (R25). La proyección vuelve a dar exactamente esos milisegundos.
- **Las pruebas con `ProgressWorld`.** El mundo de pruebas de D1a siembra `workshop_steps.v1_position` desde 1 (`index + 1`). En el contenido real, `v1_position` es el `v1Index` del meta, que empieza en 0. Las pruebas de D1b que usan `ProgressWorld` escriben las posiciones de esa semilla. Las fixtures reales corren contra el contenido real (T018).

## 2. Las tablas

| Archivo | Tabla | Columnas |
| --- | --- | --- |
| `2026_10_06_100011_create_progress_imports_table.php` | `progress_imports` | 10: `id`, `user_id`, `import_id`, `source`, `raw_payload`, `raw_sha256`, `report`, `epoch`, `revision`, `imported_at` |
| `2026_10_06_100012_create_campaign_seals_table.php` | `campaign_seals` | 7: `user_id`, `exercise_id`, `code`, `prediction`, `assisted`, `imported_at`, `revision` |

### 2.1 `progress_imports`

Una fila por importación aplicada: el crudo, su huella, el informe y la época y la revisión en que quedó (FR-027, FR-028 y FR-034). Una cuenta puede tener varias (Q1).

```sql
CREATE TABLE `progress_imports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `import_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source` ENUM('storage','export') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `raw_payload` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `raw_sha256` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `report` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `epoch` INT UNSIGNED NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL,
  `imported_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `progress_imports_user_id_import_id_unique` (`user_id`, `import_id`),
  KEY `progress_imports_raw_sha256_user_id_index` (`raw_sha256`, `user_id`),
  CONSTRAINT `progress_imports_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `progress_imports_import_id_check` CHECK (REGEXP_LIKE(`import_id`, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'c')),
  CONSTRAINT `progress_imports_report_check` CHECK (JSON_VALID(`report`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

- **`raw_payload`** es el crudo opaco, de hasta 10 MiB, y pasa a NULL a los 90 días (R37). `raw_sha256` es el sha256 hexadecimal de los bytes UTF-8 del crudo tal como llegaron.
- **`report`** es el informe en JSON ([http-d1b.md](./contracts/http-d1b.md), sección 3.5).
- **`epoch` y `revision`** son las de la cuenta al terminar la importación. `revision` no sube si la importación no cambió ninguna fila de estado (FR-010).
- **El índice `(raw_sha256, user_id)`** responde «otra cuenta importó el mismo crudo» y «esta cuenta ya importó este crudo en la época». La UK responde a una `importId` repetida y es el índice de la clave foránea.
- **Los `CHECK` siguen a B2**: el UUID en minúsculas como `runs_client_run_id_check`, y `JSON_VALID` como las tablas de contenido. No hay índice por `imported_at`: la poda recorre la clave primaria (R37).
- **No se escribe con upsert**: es un `INSERT` después de comprobar lo repetido bajo el candado. Por eso la UK no choca con la regla de D09, que pide sólo la clave primaria en las tablas con upsert.

### 2.2 `campaign_seals`

El portador de los sellos de campaña del v1. Sólo lo escribe la importación; en v2, el cliente deriva el sello desde el progreso del ejercicio (FR-035).

```sql
CREATE TABLE `campaign_seals` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `code` TINYINT(1) NOT NULL,
  `prediction` TINYINT(1) NOT NULL,
  `assisted` TINYINT(1) NOT NULL,
  `imported_at` DATETIME(3) NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `exercise_id`),
  KEY `campaign_seals_exercise_id_index` (`exercise_id`),
  CONSTRAINT `campaign_seals_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `campaign_seals_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `campaign_seals_flags_check` CHECK (`code` IN (0, 1) AND `prediction` IN (0, 1) AND `assisted` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

- **Una fila por sello v1**, aunque las tres banderas sean falsas (FR-035 y FR-039). Dos importaciones se combinan con OR (R28).
- **`imported_at`** es el instante de la última importación que cambió la fila, y **`revision`** es la de esa importación, así que el delta la trae (R40).
- **Es una tabla de estado**: entra en `ProgressTables::STATE` y «Borrar todo» la vacía. Tiene a lo sumo 48 filas por cuenta (`world_exercises`), y la foto la lee por el prefijo `user_id` de la clave primaria.

## 3. Lo que garantiza el escritor y no una restricción

Lo comprueban `ProgressInvariants` (D1a, ampliada por D1b) y `RunInvariants` (B2) al final de cada prueba que importa o borra:

| Regla | Tablas | La garantiza |
| --- | --- | --- |
| La `revision` de una fila no es mayor que la de `progress_heads` | `campaign_seals`, más las diez de D1a | El escritor estampa la revisión que va a dejar la transacción, y `AccountLock::advance` la deja en la cabecera. `ProgressInvariants` suma `campaign_seals` a sus claves |
| El grupo de repaso con reloj está completo; un grupo legado (`review_set_at` NULL) puede estar incompleto | `exercise_progress` | `REVIEW_GROUP` pasa a mirar sólo las filas con `review_set_at` no nulo (R41) |
| `proof_at` y `last_attempt_at` son el `attempted_at` del intento al que apuntan | `exercise_progress` | La importación copia la fecha del intento. `POINTER_DATES` de B2 |
| Un puntero apunta a un intento de la misma cuenta y del mismo ejercicio | `exercise_progress` | El candidato se busca filtrado por cuenta y ejercicio, o es el intento recién insertado con la cuenta de la sesión. `CROSSED_POINTERS` de B2 (FR-053) |
| `attempt_count` es la suma de `counted` de la época | `exercise_progress` | Un intento legado no cuenta (`counted` es una columna generada con `legacy = 0`), y la importación no escribe `attempt_count`. `ATTEMPT_COUNT` de B2 |
| La importación no escribe las columnas de B2 que no son suyas | `exercise_progress` | Sus sentencias no nombran `server_solved_at` ni `attempt_count` |
| `legacy_position` sólo lo escribe la importación, y una vez | `workshop_observations`, `workshop_step_marks`, `route_marks` | `COALESCE(legacy_position, ?)` |

## 4. Cómo escribe la importación

### 4.1 El orden dentro del candado

Todo corre en `AccountLock::within` (B2), en READ COMMITTED y con hasta tres intentos por interbloqueo. Lo que se arma adentro se rehace en cada intento, y nada sale de la transacción. El orden:

1. la época;
2. lo repetido y la confirmación (`ImportLedger`);
3. la foto previa para los conflictos (`ChangesReader::areas($userId, null)`);
4. las escrituras de la sección 4.2, área por área y con las padres antes que las hijas;
5. el `INSERT` de `progress_imports`;
6. `AccountLock::advance`, una sola vez y sólo si cambió alguna fila de estado.

Todas las escrituras estampan `revision = cabecera + 1`.

### 4.2 Qué escribe cada dato del v1

`UpsertSql::row` es el de D1a. `FieldWrite(kind, values, at)` usa el tipo de campo de `FieldKinds::definition`, y su `at` es siempre `null`: el reloj nulo es «anterior a todo» (D22). Las sentencias `ImportSql::*` son de D1b (sección 4.3).

| Dato del v1 (normalizado) | Fila | Escritura | Regla |
| --- | --- | --- | --- |
| `route.language` | `preferences` | `preference.routeLanguage` con `[language]` | `lww` |
| `route.minutes` | `preferences` | `preference.focusMinutes` con `[minutes]` | `lww` |
| `lab.selected.rust` y `.go`, si no son null | `preferences` | `preference.labSelectedRust` y `.labSelectedGo` con `[id]` | `lww` |
| `route.completed[i]`, `milestones[i]` y `favorites[i]` | `route_marks`, con `kind` `step`, `milestone` o `favorite` | `route.mark.<kind>` con `[1]`, y después `ImportSql::legacyPosition(i)` | `tombstone` y la primera posición |
| `route.quizAnswers[paso]` | `route_quiz_answers` | `route.quiz` con `[respuesta]` | `lww` |
| `route.notes[lenguaje][campo]`, si no es `''` | `route_notes` | `route.note` con `[texto]` | `lww` |
| `lab.records[id]` | `exercise_progress` | `ImportSql::exerciseLegacy`, siempre (crea la fila aunque el registro esté vacío): `solvedAt`, `attempts` y los punteros del intento de `result`. Después, si hay algo, un `UpsertSql::row` con `exercise.predictionCorrect` `[1]` (si es verdadero), `exercise.assisted` `[1]`, `exercise.solutionSeen` `[1]`, `exercise.prediction.answer` `[p]`, `exercise.hintsRevealed` `[h]`, `exercise.reflection` `[t]`, `exercise.customTest` `[t]` y `exercise.review` `[confidence, reviewedAt, reviewAt]` (si alguno está) | varias |
| `lab.records[id].draft` | `drafts` | `exercise.draft` con `[code, null]` | `lww-group` |
| `lab.records[id].result` | `attempts`, `attempt_tests` y `attempt_payloads` | `LegacyAttempts::record` (sección 4.4) | — |
| `campaign.seals[id]` | `campaign_seals` | `ImportSql::campaignSeal` | OR |
| `campaign.checkpoints[mundo]` | `campaign_checkpoints` | un `UpsertSql::row` con `checkpoint.passed` `[0 o 1]`, siempre (crea la fila), y `checkpoint.lastAnswer` `[a]` si no es null | `dated-flag` y `lww` |
| `systems.records["lenguaje:taller"]` | `workshop_progress` | `ImportSql::workshopSeal`, siempre (crea la fila y combina `code_sealed`); después, si hay algo, un `UpsertSql::row` con `workshop.predictionCorrect` `[1]` (si `predicted`), `workshop.answer` `[a]` (si no es null) y `workshop.note` `[n]` (si no es `''`) | OR, `dated-flag` y `lww` |
| `…observed[i]` | `workshop_observations` | `workshop.objective` con `[]`, y después `ImportSql::legacyPosition(i)` | `observed` y la primera posición |
| `…steps[i]`, traducida a la clave de etapa | `workshop_step_marks` | `workshop.step` con `[1]`, y después `ImportSql::legacyPosition(i)` | `tombstone` y la primera posición |

- **Los valores.** Una bandera es `0` o `1`, y un instante, `Instant::format` de los milisegundos. `exercise.review` lleva sus tres valores en el orden de las columnas (`confidence`, `reviewed_at`, `review_due_at`), con `null` en el que falte. `exercise.draft` lleva `starter_hash` null: es un borrador legado.
- **Una fila por registro v1** (FR-039). La crean `exerciseLegacy`, `workshopSeal` y el `checkpoint.passed` con `0`, que no cambian una fila que ya existe salvo que aporten algo.
- **Lo que no se escribe**:
  - los nulos que significan «no está» (`selected`, `answer`, `lastAnswer`);
  - las notas vacías del recorrido y de los talleres (R29);
  - lo omitido por la decodificación (R25).

### 4.3 Las sentencias propias de la importación

Las cuatro siguen la forma de D1a: alias de fila `n`, bindings posicionales, y primero las asignaciones de `revision` y `updated_at`, protegidas por la condición «cambia» (D09: cada asignación ve las anteriores ya aplicadas). Cada sentencia escribe una sola tabla.

**`exerciseLegacy`**: `solved_at`, `legacy_attempts` y los punteros. `t` es `exercise_progress`.

```sql
INSERT INTO `exercise_progress`
  (`user_id`, `exercise_id`, `solved_at`, `legacy_attempts`, `proof_attempt_id`, `proof_at`, `last_attempt_id`, `last_attempt_at`, `revision`, `created_at`, `updated_at`)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) AS `n`
ON DUPLICATE KEY UPDATE
  `revision` = IF(<cambia>, `n`.`revision`, `exercise_progress`.`revision`),
  `updated_at` = IF(<cambia>, `n`.`updated_at`, `exercise_progress`.`updated_at`),
  `solved_at` = LEAST(COALESCE(`exercise_progress`.`solved_at`, `n`.`solved_at`), COALESCE(`n`.`solved_at`, `exercise_progress`.`solved_at`)),
  `legacy_attempts` = IF(`exercise_progress`.`legacy_attempts` IS NULL OR `n`.`legacy_attempts` > `exercise_progress`.`legacy_attempts`, `n`.`legacy_attempts`, `exercise_progress`.`legacy_attempts`),
  `proof_at` = IF(`exercise_progress`.`proof_attempt_id` IS NULL, `n`.`proof_at`, `exercise_progress`.`proof_at`),
  `proof_attempt_id` = COALESCE(`exercise_progress`.`proof_attempt_id`, `n`.`proof_attempt_id`),
  `last_attempt_at` = IF(`exercise_progress`.`last_attempt_id` IS NULL, `n`.`last_attempt_at`, `exercise_progress`.`last_attempt_at`),
  `last_attempt_id` = COALESCE(`exercise_progress`.`last_attempt_id`, `n`.`last_attempt_id`)
```

La condición `<cambia>` es esta:

```sql
(`n`.`solved_at` IS NOT NULL AND (`exercise_progress`.`solved_at` IS NULL OR `n`.`solved_at` < `exercise_progress`.`solved_at`))
OR (`n`.`legacy_attempts` IS NOT NULL AND (`exercise_progress`.`legacy_attempts` IS NULL OR `n`.`legacy_attempts` > `exercise_progress`.`legacy_attempts`))
OR (`exercise_progress`.`proof_attempt_id` IS NULL AND `n`.`proof_attempt_id` IS NOT NULL)
OR (`exercise_progress`.`last_attempt_id` IS NULL AND `n`.`last_attempt_id` IS NOT NULL)
```

`proof_at` va antes de `proof_attempt_id`, y `last_attempt_at` antes de `last_attempt_id`, porque cada fecha mira el puntero viejo.

**`workshopSeal`**: crea la fila padre y combina `code_sealed`.

```sql
INSERT INTO `workshop_progress` (`user_id`, `workshop_id`, `language`, `code_sealed`, `revision`, `created_at`, `updated_at`)
VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`
ON DUPLICATE KEY UPDATE
  `revision` = IF(`workshop_progress`.`code_sealed` = 0 AND `n`.`code_sealed` = 1, `n`.`revision`, `workshop_progress`.`revision`),
  `updated_at` = IF(`workshop_progress`.`code_sealed` = 0 AND `n`.`code_sealed` = 1, `n`.`updated_at`, `workshop_progress`.`updated_at`),
  `code_sealed` = (`workshop_progress`.`code_sealed` OR `n`.`code_sealed`)
```

**`campaignSeal`**: OR de las tres banderas, y `imported_at` con la revisión.

```sql
INSERT INTO `campaign_seals` (`user_id`, `exercise_id`, `code`, `prediction`, `assisted`, `imported_at`, `revision`)
VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`
ON DUPLICATE KEY UPDATE
  `revision` = IF(<cambia>, `n`.`revision`, `campaign_seals`.`revision`),
  `imported_at` = IF(<cambia>, `n`.`imported_at`, `campaign_seals`.`imported_at`),
  `code` = (`campaign_seals`.`code` OR `n`.`code`),
  `prediction` = (`campaign_seals`.`prediction` OR `n`.`prediction`),
  `assisted` = (`campaign_seals`.`assisted` OR `n`.`assisted`)
```

`<cambia>` vale si alguna de las tres pasa de 0 a 1.

**`legacyPosition`**: un `UPDATE` de una tabla, que se evalúa de izquierda a derecha. En `workshop_observations` no hay `updated_at` ni `marked`.

```sql
UPDATE `route_marks`
SET `revision` = IF(`legacy_position` IS NULL, ?, `revision`),
    `updated_at` = IF(`legacy_position` IS NULL, ?, `updated_at`),
    `legacy_position` = COALESCE(`legacy_position`, ?)
WHERE `user_id` = ? AND `kind` = ? AND `item_key` = ? AND `marked` = 1
```

Sobre una lápida (`marked = 0`, que le ganó a la marca del v1) no escribe nada. Sin `CLIENT_FOUND_ROWS`, las filas afectadas son 1 si cambió y 0 si no (D1a R4).

### 4.4 Los intentos legados

`LegacyAttempts::record` corre una vez por cada `result` válido, antes de `exerciseLegacy` del mismo ejercicio, porque los punteros necesitan el intento:

1. **Un intento que ya lo represente.** Una consulta por cuenta y ejercicio con el índice `(user_id, exercise_id, attempted_at)` de B2, en cualquier época. Se reusa, en este orden:
   - el `attemptId` de A4, si es de la cuenta y del ejercicio;
   - si no, uno no legado con el mismo `code_sha256` y un `attempted_at` a ±10 minutos de `result.time`; si hay varios, el más cercano, y en un empate, el de menor `id`;
   - si no, uno legado con el mismo `attempted_at` y el mismo `code_sha256`.
2. **Si no hay ninguno, se inserta** con `DB::table('attempts')->insertGetId`. Las columnas:

   | Columna | Valor |
   | --- | --- |
   | `user_id` | la cuenta |
   | `exercise_id` | el ejercicio |
   | `epoch` | la época vigente |
   | `legacy` | 1 |
   | `outcome` | `passed`, `legacy_error` o `failed` (R30) |
   | `code_sha256` | `hash('sha256', code)` |
   | `custom_outcome` | `pass` si `customPassed`, si no NULL |
   | `attempted_at` y `finished_at` | `result.time` |
   | `created_at` | ahora |
   | `reason`, `grading_hash`, `executor_phase`, `exit_code`, `compile_ms`, `run_ms` y `started_at` | NULL |
   | `output_truncated` | 0 |

   Después, una fila de `attempt_tests` por prueba (`position` desde 1, `outcome` `pass` o `fail`) y el payload: `code`, `custom_test` tal cual (`''` queda `''`), `stdout`, `stderr` y `created_at` igual a ahora.
3. **Devuelve el candidato** para los punteros: su `id`, su `attempted_at` y si es `passed`.

Una consulta a `attempts` por ejercicio con resultado: con 274 ejercicios, 274 consultas por índice. Es aceptable bajo el candado, y la medición del check con el stack lo confirma o lo corrige.

### 4.5 La revisión y lo que se cuenta

`WrittenRows` lleva, por área, cuántas filas cambiaron. Una fila cuenta una vez aunque la cambien dos sentencias: `exercise_progress` tiene `exerciseLegacy` y el upsert de tipos. Se cuentan también los intentos legados insertados. `changed()` es verdadero si cambió alguna fila de estado; los intentos solos no suben la revisión, porque la foto los lee por los punteros. La revisión que guarda `progress_imports` es la de la cabecera después de `advance`, o la de antes si nada cambió.

## 5. «Borrar todo»

Todo bajo `AccountLock::within`:

1. **La época.** Si el pedido no trae la vigente, `EpochMismatch` (de D1a), sin escribir.
2. **La cabecera**, con `AccountLock::reset($head, $at)`, nuevo:

   ```sql
   UPDATE `progress_heads` SET `epoch` = `epoch` + 1, `revision` = `revision` + 1, `reset_at` = ?, `last_activity_at` = ?, `updated_at` = ? WHERE `user_id` = ?
   ```

3. **Las filas**: `DELETE FROM <tabla> WHERE user_id = ?` por cada tabla de `array_reverse(ProgressTables::STATE)`, es decir, `campaign_seals`, `preferences`, `route_notes`, `route_quiz_answers`, `route_marks`, `workshop_step_marks`, `workshop_observations`, `workshop_progress`, `campaign_checkpoints`, `drafts` y `exercise_progress`. Cada sentencia usa el prefijo `user_id` de la clave primaria, y son a lo sumo unos cientos de filas por cuenta: no hace falta partir en lotes.
4. **Commit.** Después, fuera de la transacción, `ActiveRuns::cancelAllOf($userId, null)` (B2, con el motivo como parámetro nuevo).

La cuenta, la sesión, `sync_operations`, `progress_imports`, `attempts`, `attempt_tests` y `attempt_payloads` no se tocan (FR-042 y FR-045).

## 6. Los tipos de PHP: el contrato entre los dueños

Las firmas son exactas, con los tipos que pide el nivel 9 de PHPStan. Cada una la entrega el dueño que dice [plan-d1b.md](./plan-d1b.md), y los demás la usan sin cambiarla. Lo que viene de otras partes se usa como está:

- de B2: `AccountLock`, `ProgressHead`, `Instant`, `ActiveRuns`;
- de D1a: `UpsertSql`, `FieldWrite`, `FieldKinds`, `SqlStatement`, `ChangesReader`, `ProgressAreas`, `ProgressTables`, `RouteMilestones`, `EpochMismatch`, `ClientOutdated` y `ContentNotImported`;
- de C2: `ContentImports`.

```php
namespace App\Progress\Import\Legacy;              // dueño D: lo que sale de decodificar el normalizado

final readonly class ReportEntry
{
    public function __construct(public string $path, public string $reason) {}
    /** @return array{path: string, reason: string} */
    public function toArray(): array;
}

final readonly class LegacyRoute
{
    /**
     * @param list<string> $completed  ids de paso de la guía, en el orden del v1
     * @param list<string> $milestones claves de hito (`rust-memory`…), en el orden del v1
     * @param list<string> $favorites  ids de recurso, en el orden del v1
     * @param array<string, int> $quizAnswers  paso → respuesta, sólo las que caben en las opciones vigentes
     * @param array{rust: array{learned: string, next: string}, go: array{learned: string, next: string}} $notes
     */
    public function __construct(
        public string $language, public int $minutes, public array $completed, public array $milestones,
        public array $favorites, public array $quizAnswers, public array $notes,
    ) {}
}

final readonly class LegacyResult
{
    /** @param list<array{testKey: string, passed: bool}> $tests en el orden del v1 */
    public function __construct(
        public string $code, public bool $success, public bool $transportError, public string $stdout, public string $stderr,
        public array $tests, public CarbonImmutable $time, public string $customTest, public bool $customPassed, public ?int $attemptId,
    ) {}
}

final readonly class LegacyExercise
{
    public function __construct(
        public string $exerciseId,
        public bool $predictionCorrect, public bool $assisted, public bool $solutionSeen,
        public ?int $prediction, public ?int $hints, public ?string $draft, public ?string $reflection, public ?string $customTest,
        public ?int $attempts, public ?CarbonImmutable $solvedAt, public ?CarbonImmutable $reviewAt, public ?CarbonImmutable $reviewedAt,
        public ?string $confidence, public ?LegacyResult $result,
    ) {}
}

final readonly class LegacySeal { public function __construct(public string $exerciseId, public bool $code, public bool $prediction, public bool $assisted) {} }

final readonly class LegacyCheckpoint { public function __construct(public string $worldId, public bool $passed, public ?int $lastAnswer) {} }

final readonly class LegacyWorkshop
{
    /**
     * @param list<string> $observed  claves de objetivo, en el orden del v1
     * @param list<string> $steps     claves de etapa ya traducidas desde la posición v1, en el orden del v1
     */
    public function __construct(
        public string $workshopId, public string $language, public bool $codeSealed, public bool $predicted,
        public ?int $answer, public array $observed, public array $steps, public string $note,
    ) {}
}

final readonly class LegacyProgress
{
    /**
     * @param list<LegacyExercise> $exercises
     * @param ?array{rust: ?string, go: ?string} $selected  null si el v1 no trae el laboratorio
     * @param list<LegacySeal> $seals
     * @param list<LegacyCheckpoint> $checkpoints
     * @param list<LegacyWorkshop> $workshops
     * @param list<ReportEntry> $omitted   lo que el v1 trae y no se guarda (R25)
     * @param list<ReportEntry> $replaced  los textos con U+FFFD (R26)
     */
    public function __construct(
        public ?LegacyRoute $route, public array $exercises, public ?array $selected, public array $seals,
        public array $checkpoints, public array $workshops, public array $omitted, public array $replaced,
    ) {}
}

final readonly class ContentFacts                  // lo que la decodificación necesita del contenido
{
    /**
     * @param array<string, array{language: string, predictionOptions: int, activeHints: int, testKeys: list<string>}> $exercises
     * @param array<string, int> $checkpointOptions  mundo → cantidad de opciones
     * @param array<string, array{predictionOptions: int, objectives: list<string>, stepsByV1Position: array<int, string>}> $workshops
     * @param array<string, int> $quizOptions  paso de la guía → cantidad de opciones
     * @param list<string> $resources
     */
    public function __construct(
        public array $exercises, public array $checkpointOptions, public array $workshops, public array $quizOptions, public array $resources,
    ) {}
}
```

```php
namespace App\Progress\Import;                      // dueño D: la decodificación y el puerto de escritura

final class ImportContent
{
    /** Una consulta por clase de referencia (`whereIn` con los ids que nombra el normalizado). Lo retirado cuenta como existente.
     *  @param array<array-key, mixed> $normalized */
    public function factsFor(array $normalized): ContentFacts;
}

final class LegacyDecoder
{
    /** Sin base de datos. Los hitos salen de `RouteMilestones::KEYS`.
     *  @param array<array-key, mixed> $normalized
     *  @throws ValidationException 422, con claves `normalized.<ruta>` y los mensajes de `lang/es/import.php` */
    public function decode(array $normalized, ContentFacts $content): LegacyProgress;
}

interface LegacyWriter                              // el puerto entre W e I
{
    /** Dentro de la transacción de la cuenta. No sube la cabecera. $revision es la que va a dejar la transacción. */
    public function write(int $userId, int $epoch, LegacyProgress $progress, int $revision, CarbonImmutable $now): WrittenRows;
}

final readonly class WrittenRows
{
    /** @var list<string> */
    public const AREAS = ['exercises', 'drafts', 'attempts', 'campaignSeals', 'campaignCheckpoints', 'workshops',
        'workshopObjectives', 'workshopSteps', 'routeMarks', 'routeQuiz', 'routeNotes', 'preferences'];
    /** @param array<string, int> $counts una clave por cada una de AREAS */
    public function __construct(public array $counts) {}
    public function changed(): bool;                // alguna área distinta de `attempts` es mayor que 0
}
```

```php
namespace App\Progress\Import;                      // dueño W: la escritura legada

final readonly class AttemptPointer { public function __construct(public int $attemptId, public CarbonImmutable $attemptedAt, public bool $passed) {} }
final readonly class RecordedAttempt { public function __construct(public AttemptPointer $pointer, public bool $inserted) {} }

final class ImportSql
{
    public static function exerciseLegacy(int $userId, string $exerciseId, ?CarbonImmutable $solvedAt, ?int $legacyAttempts, ?AttemptPointer $pointer, int $revision, CarbonImmutable $now): SqlStatement;
    public static function workshopSeal(int $userId, string $workshopId, string $language, bool $codeSealed, int $revision, CarbonImmutable $now): SqlStatement;
    public static function campaignSeal(int $userId, LegacySeal $seal, int $revision, CarbonImmutable $now): SqlStatement;
    /** @param array<string, string> $key las columnas de la clave después de user_id, con sus valores */
    public static function legacyPosition(string $table, int $userId, array $key, int $position, int $revision, CarbonImmutable $now): SqlStatement;
}

final class LegacyAttempts
{
    public function record(int $userId, int $epoch, string $exerciseId, LegacyResult $result, CarbonImmutable $now): RecordedAttempt;
}

final class DatabaseLegacyWriter implements LegacyWriter { /* sección 4.2 */ }
```

```php
namespace App\Progress\Import;                      // dueño I: el servicio y lo que guarda

enum ImportSource: string { case Storage = 'storage'; case Export = 'export'; }

final readonly class ImportRequest
{
    /** @param array<array-key, mixed> $normalized */
    public function __construct(
        public string $importId, public int $epoch, public int $format, public ImportSource $source,
        public string $raw, public array $normalized, public bool $confirm,
    ) {}
}

final readonly class ImportReport
{
    /**
     * @param array<string, int> $written  las claves de WrittenRows::AREAS
     * @param list<ReportEntry> $omitted
     * @param list<ReportEntry> $replaced
     * @param list<ReportEntry> $conflicts
     */
    public function __construct(public array $written, public array $omitted, public array $replaced, public array $conflicts) {}
    /** @return array{written: array<string, int>, omitted: list<array{path: string, reason: string}>, replaced: list<array{path: string, reason: string}>, conflicts: list<array{path: string, reason: string}>} */
    public function toArray(): array;
    public static function fromJson(string $json): self;
}

final readonly class StoredImport
{
    public function __construct(public string $importId, public string $rawSha256, public int $epoch, public int $revision, public CarbonImmutable $importedAt, public ImportReport $report) {}
}

final class ImportLedger                            // lee y escribe progress_imports, siempre dentro del candado
{
    public function byImportId(int $userId, string $importId): ?StoredImport;
    public function byRawInEpoch(int $userId, string $rawSha256, int $epoch): ?StoredImport;
    public function needsConfirmation(ProgressHead $head, string $rawSha256): bool;
    public function record(int $userId, ImportRequest $request, string $rawSha256, ImportReport $report, int $epoch, int $revision, CarbonImmutable $at): StoredImport;
}

final class ImportConflicts
{
    /** Pura: compara lo decodificado con la foto previa de la cuenta. @return list<ReportEntry> */
    public static function between(LegacyProgress $progress, ProgressAreas $current): array;
}

final readonly class ImportOutcome
{
    public function __construct(public bool $repeated, public StoredImport $import) {}
    public function status(): int;                  // 200 si repeated, 201 si no
    /** @return array<string, mixed> el cuerpo de http-d1b.md, sección 3.4 */
    public function toArray(): array;
}

final class ImportNeedsConfirmation extends RuntimeException {}
final class ImportWriteFailed extends RuntimeException { public static function from(QueryException $error): self; }   // sin SQL, sin bindings y sin `previous`

final class ImportService
{
    public function __construct(AccountLock $lock, ImportContent $content, LegacyDecoder $decoder, LegacyWriter $writer, ChangesReader $current, ImportLedger $ledger, ContentImports $imports);
    /** @throws ClientOutdated @throws ContentNotImported @throws EpochMismatch @throws ValidationException @throws ImportNeedsConfirmation @throws ImportWriteFailed */
    public function import(int $userId, ImportRequest $request): ImportOutcome;
}
```

```php
namespace App\Progress\Reset;                       // dueño R

final readonly class ResetRequest { public function __construct(public int $epoch, public int $format) {} }

final readonly class ResetOutcome
{
    /** @param array<string, int> $deleted filas borradas por tabla, para el registro */
    public function __construct(public int $epoch, public int $revision, public array $deleted) {}
    /** @return array{epoch: int, revision: int} */
    public function toArray(): array;
}

final class ProgressReset
{
    public function __construct(AccountLock $lock, ActiveRuns $runs);
    /** @throws ClientOutdated @throws EpochMismatch */
    public function reset(int $userId, ResetRequest $request): ResetOutcome;
}
```

```php
namespace App\Progress;                             // dueño S: lo que D1b suma a B2 y a D1a

final class AccountLock                             // de B2
{
    /** Lee la cabecera sin candado y sin escribir. Sin cabecera: época 1, revisión 0. */
    public function peek(int $userId): ProgressHead;
    /** Dentro de within: época + 1, revisión + 1, reset_at y last_activity_at = $at. */
    public function reset(ProgressHead $head, CarbonImmutable $at): ProgressHead;
}

final class ProgressTables                          // de D1a
{
    public const STATE = [/* las diez de D1a */ 'campaign_seals'];   // al final: el reset las borra en orden inverso
}
```

```php
namespace App\Runs\Execution;                       // de B2, línea de integración del coordinador (T001)

final class ActiveRuns
{
    public function cancelAllOf(int $userId, ?RunReason $reason = RunReason::AccountDisabled): int;
}
```

## 7. Orden de bloqueo y aislamiento (D08)

- **Todo escritor de la cuenta toma primero `progress_heads`**, por `AccountLock::within`, y corre en READ COMMITTED.
- **El orden de la importación**: `progress_heads`, después `progress_imports` (lecturas), después las tablas de estado y las de intentos, con las padres antes que las hijas; después el `INSERT` de `progress_imports`, y al final `progress_heads` otra vez (`advance`).
- **El orden del reset**: `progress_heads` y después las tablas de estado, en orden inverso.

Como el cierre de B2 y la sincronización de D1a también empiezan por la cabecera, dos escritores de una cuenta se serializan, y los de cuentas distintas no se esperan.

- **Fuera del candado**: las lecturas de contenido (`ImportContent`) y el adelanto de la época (`AccountLock::peek`).
- **Lo de otras cuentas**: la consulta de «otra cuenta importó este crudo» lee filas ajenas sin bloquearlas, con una lectura consistente.

## 8. Retención, supresión y exportación

| Dato | Plazo | Quién lo borra |
| --- | --- | --- |
| `progress_imports.raw_payload` | 90 días desde `imported_at`; quedan `raw_sha256` y el informe | `progress:prune-import-payloads`, por lotes de 5.000 y desde el `scheduler` de C3a |
| La fila de `progress_imports` | mientras exista la cuenta | la supresión (C3b), por lotes antes de la transacción final |
| `campaign_seals` | mientras exista la cuenta | «Borrar todo», o la cascada de la supresión |

### Lo que D1b declara para `UserData` de C3b

| Tabla | Es de la cuenta por | Exportación | Supresión |
| --- | --- | --- | --- |
| `progress_imports` | `user_id` | Sí, en la sección `imports`: `{importId, source, rawPayload, rawSha256, report, epoch, revision, importedAt}`, con `rawPayload` null si ya se podó. `ImportsSection` lee de a una fila en transacciones cortas, porque cada crudo puede pesar 10 MiB | Por lotes, por `id` (`batchesBy: 'id'`) |
| `campaign_seals` | `user_id` | Sí, en la sección `progress` de D1a, dentro de la foto (`campaign.seals`) | La cascada de la transacción final |

Si `UserData` ya está integrado cuando se crean las tablas (T003), estas filas, sus filas de `PopulatedAccount` y `ImportsSection` entran en el mismo commit, porque la prueba de cobertura de C3b falla con una tabla sin declarar. Si no está, C3b las toma de acá cuando se integre. Sumar `imports` no cambia el `format` de la exportación (contrato de C3b).
