# Data Model: D1a · Sincronización del servidor

**Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Investigación**: [research.md](./research.md) | **Contratos**: [http.md](./contracts/http.md) y [merge-rules.md](./contracts/merge-rules.md)

Los tipos de columna salen del [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (§5.3 y D07, D08, D09, D22, D28, D29 y D32). El DDL de abajo es el **de referencia, sin ejecutar**: el host no tiene MySQL y no se usó Docker al planificar. Las migraciones lo escriben con un único `CREATE TABLE` por archivo (D35) y la prueba de esquema lo contrasta con las listas de columnas de la sección 2, que salen del ADR y no del DDL.

D1a crea **diez** tablas de usuario (91 columnas, 18 claves foráneas con el `ENUM` de D32) y **no altera** `progress_heads` ni `exercise_progress`, que crea B2 completas (D28). Las dos tablas que faltan de las 12 de D1 (`progress_imports` y `campaign_seals`) son de D1b. Cada una nace completa: se migra sólo hacia adelante y un `down()` destruiría progreso (ADR 0006 §10).

## 1. Convenciones que se heredan

- **Tiempo:** `DATETIME(3)` en UTC. PHP manda cada hora como binding `Y-m-d H:i:s.v`, tomada del reloj del servidor (`Instant::format`, de B2); nunca `NOW()` de MySQL.
- **Claves y colaciones:** los ids de contenido, los hashes y los conjuntos cerrados, en `ascii_bin`; la prosa (`reflection`, `note`, `body`), con la colación de la conexión (`utf8mb4_es_0900_ai_ci`); el código y la prueba propia, en `utf8mb4_0900_bin`.
- **Comparar texto en SQL** con la colación de la conexión iguala `Casa` y `casa` y `cafe` y `café`: para decidir si un valor cambió, el escritor compara con `CAST(… AS BINARY)` (el operador `BINARY` está deprecado en MySQL 9.7: el manual avisa que se va a quitar; D03: «los cambios se detectan en PHP, nunca comparando textos en SQL»; acá, cuando se compara, es en binario).
- **Conjuntos:** `ENUM` para los cerrados (lenguaje, tipo de marca, campo de nota); los valores nuevos van siempre al final (D05).
- **Sin `CHECK` que toque una columna `DATETIME`** en ninguna de las diez tablas (FR-052, más estricto que D07, que sólo lo pide en las tablas que crecen): C2 midió en 9.7.2 que ampliar un `ENUM` con un `CHECK` sobre `DATETIME` en la tabla da el error 1845. Esas reglas de fila están en la sección 3. Los `CHECK` que no tocan fechas sí van en la tabla, con el nombre `<tabla>_<regla>_check`.
- **Restricción referencial:** `ON DELETE CASCADE` desde `users` (o desde la fila padre del taller), `RESTRICT` hacia el contenido, que nunca se borra, y `ON UPDATE RESTRICT` siempre. Una operación sobre contenido retirado se aplica: la fila de contenido sigue existiendo.
- **Sin `UNIQUE` aparte de la clave primaria** en las tablas que se escriben con upsert (D09), y sin `Model::upsert`: el SQL es explícito.
- **Revisión y fechas:** cada tabla de estado lleva `revision` (la de la cuenta que cambió la fila por última vez) y `created_at` (y `updated_at`, donde el ADR lo lista).

Migraciones: bloque **`2026_10_06_100001` a `100099`** (la 100001 a la 100010 son de D1a, y la 100011 y la 100012 están reservadas para `progress_imports` y `campaign_seals` de D1b). Se ordenan después de todas las de C2 (`2026_10_05_1000NN`), C3a (`2000NN`) y B2 (`3000NN`), así que sus claves foráneas existen cuando corren. C3b y los demás toman un bloque `2026_10_05_4xxxxx` o posterior, cualquiera que no sea éste; una migración que altere una tabla de D1a tiene que ordenarse después de la suya (C5, por ejemplo, con `2026_10_06_2xxxxx`).

## 2. Las tablas

Las listas de columnas son las del ADR §5.3, en este orden. Cuántas: `sync_operations` 7, `drafts` 8, `campaign_checkpoints` 9, `workshop_progress` 13, `workshop_observations` 8, `workshop_step_marks` 10, `route_marks` 9, `route_quiz_answers` 7, `route_notes` 8 y `preferences` 12 (91).

| Archivo | Tabla |
| --- | --- |
| `2026_10_06_100001_create_sync_operations_table.php` | `sync_operations` |
| `2026_10_06_100002_create_drafts_table.php` | `drafts` |
| `2026_10_06_100003_create_campaign_checkpoints_table.php` | `campaign_checkpoints` |
| `2026_10_06_100004_create_workshop_progress_table.php` | `workshop_progress` |
| `2026_10_06_100005_create_workshop_observations_table.php` | `workshop_observations` |
| `2026_10_06_100006_create_workshop_step_marks_table.php` | `workshop_step_marks` |
| `2026_10_06_100007_create_route_marks_table.php` | `route_marks` |
| `2026_10_06_100008_create_route_quiz_answers_table.php` | `route_quiz_answers` |
| `2026_10_06_100009_create_route_notes_table.php` | `route_notes` |
| `2026_10_06_100010_create_preferences_table.php` | `preferences` |

### 2.1 `sync_operations`

El registro de las operaciones recibidas: la idempotencia (FR-014). Es la tabla de volumen de D1a; se poda a los 14 días.

```sql
CREATE TABLE `sync_operations` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `operation_id` BINARY(16) NOT NULL,
  `payload_sha256` BINARY(32) NOT NULL,
  `status` ENUM('applied','rejected') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `clock_offset_ms` INT NOT NULL,
  `received_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `operation_id`),
  KEY `sync_operations_received_at_index` (`received_at`),
  CONSTRAINT `sync_operations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `sync_operations_status_check` CHECK (`status` = 'applied' OR `reason` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`operation_id` es el UUID v4 sin guiones, en binario; `payload_sha256`, el sha256 del contenido de la operación (el hash crudo, 32 bytes). `reason` es `unknown_reference`, `invalid` o `out_of_range` en una rechazada, y `stale_content` en una aplicada sin su bandera. `clock_offset_ms` es `ahora − sentAt` del lote, acotado al rango de `INT`. El `CHECK` no toca una fecha.

### 2.2 `drafts`

```sql
CREATE TABLE `drafts` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `code` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `starter_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `set_at` DATETIME(3) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `exercise_id`),
  KEY `drafts_user_id_revision_index` (`user_id`, `revision`),
  KEY `drafts_exercise_id_index` (`exercise_id`),
  CONSTRAINT `drafts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `drafts_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`code` `NULL` es la lápida de «restaurar inicio»; `starter_hash` `NULL`, un borrador legado. La regla `code IS NOT NULL OR set_at IS NOT NULL` está en el escritor (sección 3).

### 2.3 `campaign_checkpoints`

```sql
CREATE TABLE `campaign_checkpoints` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `world_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `passed` TINYINT(1) NOT NULL DEFAULT 0,
  `passed_at` DATETIME(3) NULL,
  `last_answer` TINYINT UNSIGNED NULL,
  `last_answer_set_at` DATETIME(3) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `world_id`),
  KEY `campaign_checkpoints_world_id_passed_index` (`world_id`, `passed`),
  CONSTRAINT `campaign_checkpoints_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `campaign_checkpoints_world_id_foreign` FOREIGN KEY (`world_id`) REFERENCES `worlds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `campaign_checkpoints_passed_check` CHECK (`passed` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

Como mucho 8 filas por cuenta. `passed = 1 OR passed_at IS NULL` está en el escritor.

### 2.4 `workshop_progress`

```sql
CREATE TABLE `workshop_progress` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `code_sealed` TINYINT(1) NOT NULL DEFAULT 0,
  `prediction_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `prediction_correct_at` DATETIME(3) NULL,
  `answer` TINYINT UNSIGNED NULL,
  `answer_set_at` DATETIME(3) NULL,
  `note` TEXT NULL,
  `note_set_at` DATETIME(3) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `workshop_id`, `language`),
  KEY `workshop_progress_workshop_id_index` (`workshop_id`),
  CONSTRAINT `workshop_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `workshop_progress_workshop_id_foreign` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `workshop_progress_flags_check` CHECK (`code_sealed` IN (0, 1) AND `prediction_correct` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`code_sealed` es portador de v1: sólo lo escribe la importación (el cliente deriva el sello; spec, Assumptions). Es la fila padre de las dos tablas siguientes. Las reglas `prediction_correct = 1 OR prediction_correct_at IS NULL`, `answer_set_at IS NULL OR answer IS NOT NULL` y `note_set_at IS NULL OR note IS NOT NULL` están en el escritor.

### 2.5 `workshop_observations`

```sql
CREATE TABLE `workshop_observations` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `objective_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `observed_at` DATETIME(3) NULL,
  `legacy_position` SMALLINT UNSIGNED NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `workshop_id`, `language`, `objective_key`),
  KEY `workshop_observations_workshop_id_objective_key_index` (`workshop_id`, `objective_key`),
  CONSTRAINT `workshop_observations_progress_foreign` FOREIGN KEY (`user_id`, `workshop_id`, `language`) REFERENCES `workshop_progress` (`user_id`, `workshop_id`, `language`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `workshop_observations_objective_foreign` FOREIGN KEY (`workshop_id`, `objective_key`) REFERENCES `workshop_objectives` (`workshop_id`, `objective_key`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`observed_at` `NULL` es un dato legado. `legacy_position` es la posición en `observed` de v1: sólo lo escribe la importación. Una operación que observa un objetivo crea antes la fila padre de `workshop_progress` si no existe.

### 2.6 `workshop_step_marks`

```sql
CREATE TABLE `workshop_step_marks` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `step_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `marked` TINYINT(1) NOT NULL,
  `set_at` DATETIME(3) NULL,
  `legacy_position` SMALLINT UNSIGNED NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `workshop_id`, `language`, `step_key`),
  KEY `workshop_step_marks_workshop_id_step_key_index` (`workshop_id`, `step_key`),
  CONSTRAINT `workshop_step_marks_progress_foreign` FOREIGN KEY (`user_id`, `workshop_id`, `language`) REFERENCES `workshop_progress` (`user_id`, `workshop_id`, `language`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `workshop_step_marks_step_foreign` FOREIGN KEY (`workshop_id`, `step_key`) REFERENCES `workshop_steps` (`workshop_id`, `step_key`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `workshop_step_marks_marked_check` CHECK (`marked` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`marked = 0` es la lápida. `marked = 1 OR set_at IS NOT NULL` está en el escritor. El cliente manda la clave de la etapa (`e1`…); la posición v1 sólo se traduce al importar (`legacy_position`).

### 2.7 `route_marks`

```sql
CREATE TABLE `route_marks` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `kind` ENUM('step','milestone','favorite') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `item_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `marked` TINYINT(1) NOT NULL,
  `set_at` DATETIME(3) NULL,
  `legacy_position` SMALLINT UNSIGNED NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `kind`, `item_key`),
  CONSTRAINT `route_marks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `route_marks_marked_check` CHECK (`marked` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`item_key` es polimórfica y no tiene clave foránea: un paso de la guía, un hito o un recurso, según `kind`. El servidor la valida contra el contenido (pasos y recursos) y contra `RouteMilestones` (hitos), antes de escribir.

### 2.8 `route_quiz_answers`

```sql
CREATE TABLE `route_quiz_answers` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `step_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `answer` TINYINT UNSIGNED NOT NULL,
  `set_at` DATETIME(3) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `step_id`),
  KEY `route_quiz_answers_step_id_index` (`step_id`),
  CONSTRAINT `route_quiz_answers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `route_quiz_answers_step_id_foreign` FOREIGN KEY (`step_id`) REFERENCES `guide_steps` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

### 2.9 `route_notes`

```sql
CREATE TABLE `route_notes` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `field` ENUM('learned','next') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `set_at` DATETIME(3) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `language`, `field`),
  CONSTRAINT `route_notes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`body` es hasta 20.000 caracteres; `''` es un valor y gana por su reloj.

### 2.10 `preferences`

```sql
CREATE TABLE `preferences` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `route_language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `route_language_set_at` DATETIME(3) NULL,
  `focus_minutes` TINYINT UNSIGNED NULL,
  `focus_minutes_set_at` DATETIME(3) NULL,
  `lab_selected_rust` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lab_selected_go` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lab_selected_rust_set_at` DATETIME(3) NULL,
  `lab_selected_go_set_at` DATETIME(3) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`),
  KEY `preferences_lab_selected_rust_index` (`lab_selected_rust`),
  KEY `preferences_lab_selected_go_index` (`lab_selected_go`),
  CONSTRAINT `preferences_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `preferences_lab_selected_rust_foreign` FOREIGN KEY (`lab_selected_rust`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `preferences_lab_selected_go_foreign` FOREIGN KEY (`lab_selected_go`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `preferences_focus_minutes_check` CHECK (`focus_minutes` IS NULL OR `focus_minutes` IN (15, 25, 45))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`route_language` `NULL` equivale a `rust` y `focus_minutes` `NULL`, a 25: lo resuelve el cliente. Cada preferencia tiene su propio reloj, así que dos dispositivos que cambian preferencias distintas conviven.

### 2.11 `language` y la prueba de D32

`language` forma parte de claves foráneas compuestas en `workshop_progress`, `workshop_observations` y `workshop_step_marks`. D32 decide con una prueba, **antes de crear las tres tablas**, si es un `ENUM('rust','go')` (el DDL de arriba) o un `VARCHAR(8)`:

1. **La prueba** (`ProgressEnumFkTest`, suite `Content`, porque el DDL confirma sus propias transacciones) crea dos tablas de prueba con la misma forma (un padre y un hijo con la clave compuesta sobre un `ENUM('rust','go')`), intenta `ALTER TABLE … MODIFY language ENUM('rust','go','zig'), ALGORITHM=INSTANT, LOCK=NONE` sobre el padre y sobre el hijo, y comprueba que las filas y la clave siguen intactas. Las borra al terminar.
2. **Si los dos `ALTER` funcionan**, las migraciones usan el `ENUM` del DDL de arriba.
3. **Si alguno falla o rompe la clave**, las tres tablas usan `` `language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL `` y cada una suma `CONSTRAINT <tabla>_language_foreign FOREIGN KEY (`language`) REFERENCES `languages` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT`. Las columnas son las mismas (91) y las claves foráneas pasan de 18 a 21.
4. **La prueba de esquema** (`SchemaTest`) lee el tipo de `language` de las tres tablas y exige que sea el que decidió el experimento, así una migración no puede ir por un lado y el experimento por el otro. Lo que decidió se escribe en el mensaje del commit de la migración.

`route_notes.language` y `preferences.route_language` no participan de ninguna clave foránea y quedan como `ENUM`.

## 3. Lo que no va en una restricción de la tabla y quién lo garantiza

Son las reglas de fila que antes eran `CHECK` sobre fechas (FR-052). Las garantiza el escritor, y `ProgressInvariants` (una consulta por regla, en `tests/Support/`) corre al final de cada prueba que escribe progreso:

| Regla | Tablas | La garantiza |
| --- | --- | --- |
| `marked = 1 OR set_at IS NOT NULL` (una lápida lleva su reloj) | `workshop_step_marks`, `route_marks` | `OperationWriter`: las operaciones de `/api/sync` siempre traen reloj |
| `code IS NOT NULL OR set_at IS NOT NULL` | `drafts` | ídem |
| `prediction_correct = 1 OR prediction_correct_at IS NULL` | `exercise_progress`, `workshop_progress` | el escritor sólo escribe la fecha junto con la bandera en 1 |
| `passed = 1 OR passed_at IS NULL` | `campaign_checkpoints` | ídem |
| `<reloj> IS NULL OR <valor> IS NOT NULL` | `prediction_answer`, `reflection` y `custom_test` de `exercise_progress`; `answer` y `note` de `workshop_progress`; `last_answer` de `campaign_checkpoints` | el escritor escribe el valor y su reloj en el mismo grupo |
| `confidence`, `reviewed_at` y `review_due_at` se escriben juntos, con `review_set_at` | `exercise_progress` | el grupo de repaso es una sola asignación |
| `revision` de una fila no es mayor que la de `progress_heads` | las diez de estado | el escritor estampa la revisión que dejará la transacción; `AccountLock::advance` la deja en la cabecera |
| Las columnas de B2 (`solved_at`, `server_solved_at`, `proof_*`, `last_*`, `attempt_count`) y las de la importación no cambian por una operación de D1a | `exercise_progress` | las listas de columnas de los `INSERT … ON DUPLICATE KEY UPDATE` no las nombran; una prueba compara la fila antes y después de cada tipo de operación |

Las demás reglas (los `CHECK` que no tocan fechas) están en el DDL y las lee `SchemaTest` por nombre.

## 4. La revisión, la época y la forma de las escrituras

**La cabecera.** `progress_heads` (la crea B2) es el candado de la cuenta y guarda `epoch`, `revision`, `reset_at` y `last_activity_at`. Tomarla o crearla es **un solo código**, `App\Progress\AccountLock` de B2: `within($userId, $work)` abre una transacción corta en READ COMMITTED (por `WriteTransaction` de C3a, que fija el nivel en cada intento), toma la cabecera con `INSERT … AS n ON DUPLICATE KEY UPDATE` y después `SELECT … FOR UPDATE`, y corre `$work`, que **puede repetirse hasta tres veces** si hay un interbloqueo: lo que arme `$work` (resultados, filas leídas) se rehace en cada intento y no deja efectos afuera. `advance($head, $at)` sube la revisión en uno y fija la última actividad.

**Una revisión por transacción que cambia algo** (FR-010). Cada operación escribe la fila con la revisión que dejará la transacción, `$head->revision + 1`, **sólo si cambia algo**. Después de aplicar el lote, si alguna escritura cambió una fila, se llama a `advance` **una vez**; si ninguna cambió, no se llama y la cabecera queda igual. Así el delta (`revision` mayor que la conocida) ve todas las filas que cambió el lote, y un lote sin efecto no las mueve.

**Cómo se sabe que una escritura cambió algo.** Cada escritura es un `INSERT … AS n ON DUPLICATE KEY UPDATE`. Las dos primeras asignaciones son `revision` y `updated_at`, **protegidas por la condición «esto cambia la fila»**; después van los valores y, **al final**, los relojes (D09: cada asignación ve las anteriores ya aplicadas, así que las guardas, que comparan con lo viejo, van primero). MySQL responde 1 fila afectada si insertó, 2 si cambió una existente y 0 si todo quedó igual: eso es lo que `OperationWriter` lee de la sentencia. `PDO::MYSQL_ATTR_FOUND_ROWS` no está activo (ni en `config/database.php` ni en los valores por omisión de Laravel 13.x, que se leyeron en su código al planificar), así que el 0 es posible; `AffectedRowsTest` lo prueba contra MySQL 9.7 antes de que nada dependa de eso.

**Las formas** (el reloj de un grupo `c`; sus valores `v`; `t` es la fila existente y `n`, la que llega):

| Regla | `ganan` (la entrante gana) | `cambia` (la guarda de la revisión) |
| --- | --- | --- |
| `lww`, `lww-group`, `tombstone` | `t.c IS NULL OR (n.c IS NOT NULL AND n.c >= t.c)` | `ganan AND NOT (CAST(t.v AS BINARY) <=> CAST(n.v AS BINARY) AND t.c <=> n.c)`, con `CAST(… AS BINARY)` en las columnas de texto y la comparación nula-segura (`<=>`) en todas |
| `flag-or` | siempre | `t.v = 0` (la entrante es 1) |
| `max` | `t.v IS NULL OR n.v > t.v` | lo mismo |
| `dated-flag` | la entrante es 1 | `t.v = 0 OR (t.at IS NULL AND n.at IS NOT NULL) OR (n.at IS NOT NULL AND n.at < t.at)` |
| `observed` | siempre | `(t.at IS NULL AND n.at IS NOT NULL) OR n.at < t.at`, o la fila no existía |

Ejemplo, `exercise.reflection` (un grupo `lww`):

```sql
INSERT INTO `exercise_progress`
  (`user_id`, `exercise_id`, `reflection`, `reflection_set_at`, `revision`, `created_at`, `updated_at`)
VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`
ON DUPLICATE KEY UPDATE
  `revision` = IF(<cambia>, `n`.`revision`, `exercise_progress`.`revision`),
  `updated_at` = IF(<cambia>, `n`.`updated_at`, `exercise_progress`.`updated_at`),
  `reflection` = IF(<ganan>, `n`.`reflection`, `exercise_progress`.`reflection`),
  `reflection_set_at` = IF(<ganan>, `n`.`reflection_set_at`, `exercise_progress`.`reflection_set_at`)
```

- `exercise.prediction`, `checkpoint.answer` y `workshop.prediction` escriben dos grupos en la misma sentencia (la respuesta, `lww`, y la bandera con su fecha, `dated-flag`). La guarda de la revisión es la `O` de las dos, y el grupo de la bandera **no entra** en la sentencia si la operación no la otorga (`correct` falso o `stale_content`). La fecha es `LEAST(COALESCE(t.at, n.at), COALESCE(n.at, t.at))`, y la bandera se asigna después de su fecha (D09).
- `workshop.objective` y `workshop.step` necesitan la fila padre de `workshop_progress`: se hace antes un `INSERT … AS n ON DUPLICATE KEY UPDATE user_id = user_id` (con la revisión nueva si la inserta) y después la sentencia del hijo.
- Los bindings son posicionales y las horas, `Y-m-d H:i:s.v` del reloj de PHP. Ninguna sentencia usa `VALUES()`, que está deprecado (el alias de fila es `n`).
- **Una operación que se rechaza no escribe**, y las referencias y los rangos se comprueban **antes** de la transacción de escritura: una clave foránea no puede fallar por contenido que falta (el contenido nunca se borra, así que lo que existe al comprobar existe al escribir).

`exercise_progress` lo escriben dos dueños, cada uno con su lista de columnas (D28). D1a escribe, por operación y sólo las que ésta nombra: `prediction_answer`, `prediction_answer_set_at`, `prediction_correct`, `prediction_correct_at`, `assisted`, `solution_seen`, `hints_revealed`, `reflection`, `reflection_set_at`, `custom_test`, `custom_test_set_at`, `confidence`, `reviewed_at`, `review_due_at` y `review_set_at`, más `revision`, `updated_at` y, al insertar, `created_at`. Nunca `solved_at`, `server_solved_at`, `proof_attempt_id`, `proof_at`, `last_attempt_id`, `last_attempt_at` ni `attempt_count` (B2), ni `legacy_attempts` (la importación).

## 5. Los tipos de PHP: el contrato entre los dueños

Firmas exactas, con los tipos que pide el nivel 9 de PHPStan. Cada una la entrega el dueño que dice [plan.md](./plan.md) y la usan los demás sin cambiarla. Lo que viene de B2 (`ProgressHead`, `AccountLock`, `AccountGone`, `Instant`) y de C3a (`WriteTransaction`, `ApiError`, `ApiCode`) se usa como está.

```php
namespace App\Progress;

/** El 503 de «todavía no hay contenido importado», el mismo de C2; lo lanzan el lector y el servicio. Dueño S. */
final class ContentNotImported extends HttpResponseException {}

final readonly class ProgressAreas               // dueño S: lo que comparten L, Y y C3b; las filas ya vienen con la forma JSON de http.md, sección 5
{
    /**
     * @param list<array<string, mixed>> $exercises
     * @param list<array<string, mixed>> $drafts
     * @param list<array<string, mixed>> $campaignSeals      [] hasta D1b
     * @param list<array<string, mixed>> $campaignCheckpoints
     * @param list<array<string, mixed>> $workshopProgress
     * @param list<array<string, mixed>> $workshopObjectives
     * @param list<array<string, mixed>> $workshopSteps
     * @param list<array<string, mixed>> $routeMarks
     * @param list<array<string, mixed>> $routeQuiz
     * @param list<array<string, mixed>> $routeNotes
     * @param ?array<string, mixed> $preferences
     */
    public function __construct(
        public array $exercises = [], public array $drafts = [], public array $campaignSeals = [], public array $campaignCheckpoints = [],
        public array $workshopProgress = [], public array $workshopObjectives = [], public array $workshopSteps = [],
        public array $routeMarks = [], public array $routeQuiz = [], public array $routeNotes = [], public ?array $preferences = null,
    ) {}

    /** @return array<string, mixed> `full` y las áreas con las claves de http.md, sección 5 (`campaign`, `workshops` y `route` agrupados) */
    public function toArray(bool $full): array;
}

interface ChangesReader                          // dueño S: el puerto entre L e Y
{
    /** No abre una transacción: corre dentro de la de quien llama. null es la foto completa; un número, lo que cambió desde esa revisión. */
    public function areas(int $userId, ?int $sinceRevision): ProgressAreas;
}

final class ProgressTables                      // dueño S
{
    /** Las tablas de estado de una cuenta, con las padres antes que las hijas (D1b suma `campaign_seals`). */
    public const STATE = ['exercise_progress', 'drafts', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations', 'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences'];
    /** Las diez que crea D1a, con `sync_operations`, y sin `exercise_progress`, que es de B2. */
    public const CREATED = ['sync_operations', 'drafts', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations', 'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences'];
}
```

```php
namespace App\Progress\Operations;               // dueño M

enum Rule: string { case Lww = 'lww'; case LwwGroup = 'lww-group'; case Tombstone = 'tombstone'; case FlagOr = 'flag-or'; case Max = 'max'; case DatedFlag = 'dated-flag'; case Observed = 'observed'; }

enum OperationType: string   // los dieciséis `type` de http.md, sección 3.2
{
    case ExercisePrediction = 'exercise.prediction';
    case ExerciseAssist = 'exercise.assist';
    case ExerciseHints = 'exercise.hints';
    case ExerciseReflection = 'exercise.reflection';
    case ExerciseCustomTest = 'exercise.customTest';
    case ExerciseReview = 'exercise.review';
    case ExerciseDraft = 'exercise.draft';
    case CheckpointAnswer = 'checkpoint.answer';
    case WorkshopPrediction = 'workshop.prediction';
    case WorkshopNote = 'workshop.note';
    case WorkshopObjective = 'workshop.objective';
    case WorkshopStep = 'workshop.step';
    case RouteMark = 'route.mark';
    case RouteQuiz = 'route.quiz';
    case RouteNote = 'route.note';
    case PreferenceSet = 'preference.set';
}

enum RejectionReason: string { case UnknownReference = 'unknown_reference'; case Invalid = 'invalid'; case OutOfRange = 'out_of_range'; }

final class FieldKinds                           // el registro que la prueba compara con `kinds` del fixture
{
    /** @return array<string, Rule> los 25 tipos de campo, por su identificador de merge-rules.md */
    public static function all(): array;
}

final class RouteMilestones
{
    /** @var list<string> */
    public const KEYS = [
        'rust-memory', 'rust-commands', 'rust-files', 'rust-measure', 'rust-network',
        'go-memory', 'go-commands', 'go-files', 'go-measure', 'go-network',
    ];
}

final class OperationHash { public static function of(array $raw): string; }   // sha256 hexadecimal de la forma canónica sin `id`

final readonly class Operation
{
    /** @param array<string, string|int|bool|null> $values los campos validados, por su nombre del cable, sin id, type ni at */
    public function __construct(
        public string $id,                       // UUID v4 en minúsculas
        public OperationType $type,
        public CarbonImmutable $at,              // el instante del dispositivo, sin corregir
        public array $values,
        public string $hash,                     // OperationHash::of de lo recibido
        public ?string $contentVersion,          // sólo las que responden una pregunta
    ) {}
}

final readonly class Decoded                     // lo que sale de decodificar una operación cruda
{
    public static function valid(Operation $operation): self;
    public static function rejected(string $id, string $hash, RejectionReason $reason): self;
    public string $id; public string $hash; public ?Operation $operation; public ?RejectionReason $reason;
}

final readonly class Checked                     // lo que sale de comprobarla contra el contenido
{
    public static function ready(Operation $operation, bool $stale): self;
    public static function rejected(string $id, string $hash, RejectionReason $reason): self;
    public string $id; public string $hash; public ?Operation $operation; public ?RejectionReason $reason; public bool $stale;
}

final readonly class Applied { public function __construct(public bool $changed) {} }

interface OperationProcessor                     // el puerto entre M e Y
{
    /** Forma, tipos, rangos y longitudes; sin base de datos. Una por cada cruda, en el mismo orden.
     *  @param list<array<string, mixed>> $raw cada una con un id UUID v4, un type de texto y un at válidos
     *  @return list<Decoded> */
    public function decode(array $raw): array;

    /** Referencias al contenido y rangos que dependen de él, y si cada respuesta se dio con la versión vigente.
     *  Lee tablas de contenido, fuera del candado de la cuenta.
     *  @param list<Decoded> $decoded
     *  @return list<Checked> */
    public function check(array $decoded, string $currentContentVersion): array;

    /** Escribe una operación comprobada con las reglas de sus campos, dentro de la transacción de la cuenta.
     *  $effectiveAt es el reloj corregido (null en una importación sin reloj); $revision, la que dejará la transacción. */
    public function apply(Checked $operation, ?CarbonImmutable $effectiveAt, int $revision, CarbonImmutable $now): Applied;
}
```

```php
namespace App\Progress\Snapshot;                 // dueño L

enum ProofState: string { case Current = 'current'; case Changed = 'changed'; case Legacy = 'legacy'; }

final class ProgressEtag { public static function of(int $userId, int $epoch, int $revision, string $contentVersion): string; }   // W/"u7.e1.r42.c…"

final readonly class Snapshot { public function __construct(public int $userId, public int $epoch, public int $revision, public ?CarbonImmutable $resetAt, public string $contentVersion, public ProgressAreas $areas) {} }
final readonly class NotModified { public function __construct(public string $etag) {} }

final class ProgressSnapshotReader implements ChangesReader
{
    public function areas(int $userId, ?int $sinceRevision): ProgressAreas;

    /** Abre su propia transacción de sólo lectura en REPEATABLE READ: lee la cabecera, calcula el validador, responde NotModified si
     *  $matches lo acepta, y si no lee todas las áreas del mismo snapshot. Nunca escribe.
     *  @param Closure(string): bool $matches */
    public function read(int $userId, string $contentVersion, Closure $matches): Snapshot|NotModified;
}
```

```php
namespace App\Progress\Sync;                     // dueño Y

final readonly class SyncRequest
{
    /** @param list<array<string, mixed>> $operations cada una con un id UUID v4, un type de texto y un at válidos */
    public function __construct(public int $epoch, public CarbonImmutable $sentAt, public int $knownRevision, public ?string $knownContentVersion, public int $format, public array $operations) {}
}

enum ResultStatus: string { case Applied = 'applied'; case Rejected = 'rejected'; case Duplicate = 'duplicate'; case UuidReused = 'uuid_reused'; case StaleContent = 'stale_content'; }
final readonly class OperationResult { public function __construct(public string $id, public ResultStatus $status, public ?string $reason = null) {} }

final readonly class SyncOutcome
{
    /** @param list<OperationResult> $results */
    public function __construct(public int $epoch, public int $revision, public CarbonImmutable $serverTime, public string $contentVersion, public array $results, public ProgressAreas $changes, public bool $full) {}
    /** @return array<string, mixed> el cuerpo de http.md, sección 3.4 */
    public function toArray(): array;
}

final class EpochMismatch extends RuntimeException { public function __construct(public readonly int $epoch, public readonly int $revision) {} }
final class ClientOutdated extends RuntimeException {}
final class SyncWriteFailed extends RuntimeException { public static function from(QueryException $error): self; }   // sin SQL, sin valores y sin `previous`

final class ClockCorrection
{
    public static function effective(CarbonImmutable $at, CarbonImmutable $sentAt, CarbonImmutable $now): CarbonImmutable;   // min(at + (now − sentAt), now)
    public static function offsetMs(CarbonImmutable $sentAt, CarbonImmutable $now): int;                                    // now − sentAt, acotado a INT
}

final class SyncService
{
    public function __construct(AccountLock $lock, OperationProcessor $processor, ChangesReader $changes, OperationRegistry $registry, ContentImports $content);
    /** @throws ClientOutdated @throws ContentNotImported (de App\Progress) @throws EpochMismatch @throws SyncWriteFailed */
    public function sync(int $userId, SyncRequest $request): SyncOutcome;
}
```

`OperationRegistry` (lee y escribe `sync_operations`) y la clase `ProgressConfig` que lee `config/progress.php` con accesores tipados las completa Y en su tarea; no las usan los demás dueños.

## 6. Orden de bloqueo y aislamiento (D08)

Todo escritor de la cuenta toma `progress_heads` primero (por `AccountLock::within`) y corre en READ COMMITTED. `/api/sync` no toma `users` (el estado de la cuenta lo decide el middleware de C3a), así que su orden es: `progress_heads` → `sync_operations` → las tablas de estado, con las padres antes que las hijas. El cierre de B2 también empieza por la cabecera, de modo que dos escritores de **una** cuenta se serializan y de **cuentas distintas** no se esperan (las claves empiezan por `user_id`). Las lecturas de contenido van antes de abrir la transacción; la foto de `GET /api/progress` se lee en una transacción de sólo lectura en REPEATABLE READ, sin candado.

La foto y el delta se leen por `user_id`, con el índice `(user_id, revision)` de `exercise_progress` y `drafts` y con el prefijo `user_id` de la clave primaria en las demás, que tienen a lo sumo unas decenas de filas por cuenta. No hace falta ningún índice más.

## 7. Retención y borrado

| Dato | Plazo | Quién lo borra |
| --- | --- | --- |
| `sync_operations` | 14 días desde `received_at`; después, reenviar un UUID viejo no pisa nada más nuevo (lo decide el reloj) | `progress:prune-sync-operations`, por lotes de 5.000 y desde el `scheduler` de C3a |
| Las nueve tablas de estado | mientras exista la cuenta | la supresión de la cuenta (C3b), por la cascada de la última transacción; sólo «Borrar todo» (D1b) las vacía antes |

La poda de `raw_payload` (90 días) es de `progress_imports`, que crea D1b.

### Lo que D1a declara para `UserData` de C3b

C3b lleva un registro único de lo que el taller guarda de una cuenta (`UserData`): cada dueño declara sus tablas y una prueba de cobertura contra `information_schema` exige que toda tabla con `user_id`, o hija de una, figure en la exportación y en la supresión o en una lista de excepciones con su motivo. D1a no crea `UserData`; esta es su declaración, con las diez tablas que crea:

| Tabla | Es de la cuenta por | Exportación | Supresión |
| --- | --- | --- | --- |
| `sync_operations` | `user_id` | No, con motivo: es operativa (dura 14 días) y sólo guarda UUID y huellas, nada que el titular haya escrito | Por lotes, antes de la transacción final (D06) |
| `drafts`, `campaign_checkpoints`, `workshop_progress`, `route_marks`, `route_quiz_answers`, `route_notes`, `preferences` | `user_id` | Sí, por la foto de progreso (`ProgressSnapshotReader::areas(userId, null)`), el mismo lector de `GET /api/progress` (FR-023) | Cascada de la transacción final |
| `workshop_observations`, `workshop_step_marks` | hijas de `workshop_progress` | Sí, con su taller, por la misma foto | Cascada, por `workshop_progress` |

La foto incluye también las filas de `exercise_progress` (declaradas por B2). Si `UserData` ya existe cuando se implementa D1a, el coordinador suma estas diez filas en el archivo de C3b; si no, C3b las toma de acá cuando llegue, y su prueba de cobertura es la que lo exige.
