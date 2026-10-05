# Data Model: C2 · Contenido en MySQL

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fuente**: ADR 0006 §5.1, D02 a D07, D09 a D15 y D35, con las enmiendas del 2026-10-05

Este archivo es el contrato del esquema de C2: las 21 tablas con su DDL exacto, las reglas entre filas que ninguna restricción puede expresar, las reglas de escritura del import y de lectura de la API, y los criterios con que se verifica. El generador de los 21 archivos de migración está en el [plan](./plan.md) (tarea T009). Si el DDL de acá y una migración difieren, vale este archivo.

## Convenciones del esquema

- **Motor y colación explícitos** en cada tabla: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci`. Los textos que ve el alumno se comparan con esa colación (sin acentos ni mayúsculas); por eso la diferencia del import nunca se calcula con `=` de MySQL sino en PHP, con igualdad estricta.
- **IDs, claves y hashes:** `ascii_bin` por columna (se comparan byte a byte, `RUST-01` no es `rust-01`). Los hashes son `CHAR(64)` con `CHECK (REGEXP_LIKE(col, '^[0-9a-f]{64}$', 'c'))`: la `'c'` hace que el CHECK distinga mayúsculas.
- **Texto que importa byte a byte** (código inicial y solución, texto JSON anidado): `utf8mb4_0900_bin`. El texto JSON va en `LONGTEXT` con `JSON_VALID` y se decodifica como objetos; las únicas columnas JSON nativas son las de `content_imports`, donde el orden de claves no importa.
- **Instantes:** `DATETIME(3)`, en UTC (la conexión fija `timezone '+00:00'`).
- **Nombres:** tablas en inglés y plural; restricciones `<tabla>_<columnas>_index`, `_foreign` y `_check`, escritas a mano.
- **Claves foráneas:** las 22 son `ON DELETE RESTRICT ON UPDATE RESTRICT` y están escritas en el DDL. El contenido nunca se borra, así que nada de usuarios puede quedar apuntando a una fila que desaparece.
- **Únicos:** sólo la `PRIMARY KEY`. Las tablas que se escriben con upsert no tienen ningún `UNIQUE` (cualquier índice único dispararía el `ON DUPLICATE KEY`), y las reglas de unicidad entre filas son los invariantes de más abajo.
- **CHECK:** sólo de una fila. Los hay de ciclo de vida (`(status = 'active') = (retired_at IS NULL)`), de posición (`(status = 'active') = (position IS NOT NULL)`), de JSON válido, de hash y específicos de cada tabla.
- **Ciclo de vida:** todas las tablas, salvo `languages`, `content_imports` y `exercise_grading_versions`, tienen `status` (`active` o `deprecated`), `retired_at`, `created_at` y `updated_at`. Un registro retirado sigue en la tabla.
- **Una tabla por migración,** con un único `CREATE TABLE` por `DB::statement`: es un DDL atómico y toma los bloqueos de metadatos una sola vez. `down()` es `Schema::dropIfExists`, sin desactivar claves foráneas.
- **Sin índices nuevos** más allá de los del DDL. Las lecturas más grandes son de 274 filas, así que no se agrega un umbral de `EXPLAIN`.

## Las 21 tablas

La cantidad es la del contenido al 2026-10-04; las pruebas comparan contra el documento, no contra estos números.

| # | Tabla | Qué guarda | Filas hoy |
| --- | --- | --- | --- |
| 01 | `languages` | Rust y Go; fija el orden de los mapas por lenguaje | 2 |
| 02 | `catalogs` | `lab`, `quests` y `cores`, con el parámetro por el que se cortan y su posición en la cadena (hoy ninguna) | 3 |
| 03 | `content_imports` | Un registro por import que cambió algo: huellas del documento y de cada porción, commit de origen, conteos e informe | uno por import |
| 04 | `topics` | Los temas de ejercicios, por lenguaje | 98 |
| 05 | `workshops` | Las fichas de talleres de Sistemas, con sus textos y su JSON anidado | 25 |
| 06 | `exercises` | Los ejercicios, con sus textos, código inicial y solución, orden de claves y tres huellas | 274 |
| 07 | `exercise_grading_versions` | Cada `grading_hash` que rigió para un ejercicio, con el import que lo trajo; sólo crece | 274 al inicio |
| 08 | `exercise_tests` | Las pruebas de cada ejercicio (`test_key` estable) | 822 |
| 09 | `exercise_hints` | Las pistas de cada ejercicio | 822 |
| 10 | `workshop_objectives` | Los objetivos de cada taller | 75 |
| 11 | `workshop_steps` | Las etapas de cada taller, con su clave estable (`step_key`) y su índice v1 congelado (`v1_position`) | 100 |
| 12 | `workshop_related_exercises` | Los ejercicios relacionados de cada taller, por lenguaje | 118 |
| 13 | `worlds` | Los mundos de campaña | 8 |
| 14 | `world_exercises` | Los ejercicios de cada mundo, con su rol (entrenamiento, desafío o jefe) | 48 |
| 15 | `atlas_concepts` | Los conceptos del Atlas, con su ejercicio de laboratorio | 32 |
| 16 | `guide_resources` | Los recursos de la guía | 15 |
| 17 | `guide_sources` | Las fuentes de la guía | 9 |
| 18 | `guide_tracks` | Los recorridos de la guía, uno por lenguaje | 2 |
| 19 | `guide_modules` | Los módulos de cada recorrido | 8 |
| 20 | `guide_steps` | Los pasos de cada módulo | 24 |
| 21 | `guide_step_resources` | Los recursos de cada paso | 56 |

## DDL

El orden de las migraciones es el de las secciones: cada clave foránea apunta a una tabla anterior. Cada sección es el `CREATE TABLE` de una migración; el generador del plan (T009) lee exactamente estos bloques, así que no se les agregan comentarios ni otras sentencias.

### Migración 01 · `languages`

```sql
CREATE TABLE `languages` (
  `code` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 02 · `catalogs`

```sql
CREATE TABLE `catalogs` (
  `code` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `slice_by` ENUM('language','domain') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `chain_position` TINYINT UNSIGNED NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`code`),
  CONSTRAINT `catalogs_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `catalogs_chain_position_check` CHECK (`chain_position` IS NULL OR `chain_position` >= 1),
  CONSTRAINT `catalogs_chain_lifecycle_check` CHECK (`status` = 'active' OR `chain_position` IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 03 · `content_imports`

```sql
CREATE TABLE `content_imports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `document_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_commit` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `portion_hashes` JSON NOT NULL,
  `counts` JSON NOT NULL,
  `changes` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `content_imports_document_hash_check` CHECK (REGEXP_LIKE(`document_hash`, '^[0-9a-f]{64}$', 'c')),
  CONSTRAINT `content_imports_source_commit_check` CHECK (`source_commit` IS NULL OR (CHAR_LENGTH(`source_commit`) IN (40, 64) AND REGEXP_LIKE(`source_commit`, '^[0-9a-f]+$', 'c')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 04 · `topics`

```sql
CREATE TABLE `topics` (
  `language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `topic_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`language`, `topic_key`),
  CONSTRAINT `topics_language_foreign` FOREIGN KEY (`language`) REFERENCES `languages` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `topics_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 05 · `workshops`

```sql
CREATE TABLE `workshops` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `domain` ENUM('lowlevel','infra','play','pc') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` SMALLINT UNSIGNED NULL,
  `category` ENUM('machine','infra','play') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `model` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `level` ENUM('beginner','medium','advanced','expert') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `minutes` SMALLINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL,
  `story` TEXT NOT NULL,
  `what` TEXT NOT NULL,
  `why` TEXT NOT NULL,
  `limits` TEXT NOT NULL,
  `uses_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `prediction_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `sources_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `bridge_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `workshops_domain_status_position_index` (`domain`, `status`, `position`),
  CONSTRAINT `workshops_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `workshops_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `workshops_minutes_check` CHECK (`minutes` >= 1),
  CONSTRAINT `workshops_json_check` CHECK (JSON_VALID(`uses_json`) AND JSON_VALID(`prediction_json`) AND JSON_VALID(`sources_json`) AND JSON_VALID(`bridge_json`) AND JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 06 · `exercises`

```sql
CREATE TABLE `exercises` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `catalog` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `domain` ENUM('lowlevel','infra','play','pc') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` SMALLINT UNSIGNED NULL,
  `topic_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `stage` SMALLINT UNSIGNED NOT NULL,
  `level` ENUM('beginner','medium','advanced','expert') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `challenge_type` ENUM('repair','kata','boss') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `kind` ENUM('completar','reparar') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `minutes` SMALLINT UNSIGNED NOT NULL,
  `visual` ENUM('flow','memory','ownership','collections','pointers','generics','concurrency') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `intro` TEXT NOT NULL,
  `why` TEXT NOT NULL,
  `objective` TEXT NOT NULL,
  `transfer` TEXT NOT NULL,
  `starter` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `solution` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `imports_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `sources_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `instructions_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `review_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `prediction_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `content_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `grading_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `starter_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `exercises_catalog_language_status_position_index` (`catalog`, `language`, `status`, `position`),
  KEY `exercises_catalog_domain_status_position_index` (`catalog`, `domain`, `status`, `position`),
  KEY `exercises_language_topic_key_index` (`language`, `topic_key`),
  KEY `exercises_workshop_id_language_index` (`workshop_id`, `language`),
  CONSTRAINT `exercises_catalog_foreign` FOREIGN KEY (`catalog`) REFERENCES `catalogs` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercises_language_topic_key_foreign` FOREIGN KEY (`language`, `topic_key`) REFERENCES `topics` (`language`, `topic_key`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercises_workshop_id_foreign` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercises_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `exercises_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `exercises_json_check` CHECK (JSON_VALID(`imports_json`) AND JSON_VALID(`sources_json`) AND JSON_VALID(`instructions_json`) AND JSON_VALID(`review_json`) AND JSON_VALID(`prediction_json`) AND JSON_VALID(`key_order`)),
  CONSTRAINT `exercises_numbers_check` CHECK (`stage` >= 1 AND `minutes` >= 1),
  CONSTRAINT `exercises_hashes_check` CHECK (REGEXP_LIKE(`content_hash`, '^[0-9a-f]{64}$', 'c') AND REGEXP_LIKE(`grading_hash`, '^[0-9a-f]{64}$', 'c') AND REGEXP_LIKE(`starter_hash`, '^[0-9a-f]{64}$', 'c'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 07 · `exercise_grading_versions`

```sql
CREATE TABLE `exercise_grading_versions` (
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `grading_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `first_import_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`exercise_id`, `grading_hash`),
  KEY `exercise_grading_versions_first_import_id_index` (`first_import_id`),
  CONSTRAINT `exercise_grading_versions_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercise_grading_versions_first_import_id_foreign` FOREIGN KEY (`first_import_id`) REFERENCES `content_imports` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercise_grading_versions_hash_check` CHECK (REGEXP_LIKE(`grading_hash`, '^[0-9a-f]{64}$', 'c'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 08 · `exercise_tests`

```sql
CREATE TABLE `exercise_tests` (
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `test_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `label` VARCHAR(255) NOT NULL,
  `expression` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `why` TEXT NOT NULL,
  `failure` TEXT NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`exercise_id`, `test_key`),
  CONSTRAINT `exercise_tests_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercise_tests_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `exercise_tests_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `exercise_tests_json_check` CHECK (JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 09 · `exercise_hints`

```sql
CREATE TABLE `exercise_hints` (
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NOT NULL,
  `text` TEXT NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`exercise_id`, `position`),
  CONSTRAINT `exercise_hints_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercise_hints_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 10 · `workshop_objectives`

```sql
CREATE TABLE `workshop_objectives` (
  `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `objective_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `label` VARCHAR(255) NOT NULL,
  `why` TEXT NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`workshop_id`, `objective_key`),
  CONSTRAINT `workshop_objectives_workshop_id_foreign` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `workshop_objectives_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `workshop_objectives_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `workshop_objectives_json_check` CHECK (JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 11 · `workshop_steps`

```sql
CREATE TABLE `workshop_steps` (
  `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `step_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `v1_position` TINYINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `task` TEXT NOT NULL,
  `why` TEXT NOT NULL,
  `done` TEXT NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`workshop_id`, `step_key`),
  CONSTRAINT `workshop_steps_workshop_id_foreign` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `workshop_steps_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `workshop_steps_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `workshop_steps_json_check` CHECK (JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 12 · `workshop_related_exercises`

```sql
CREATE TABLE `workshop_related_exercises` (
  `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`workshop_id`, `exercise_id`),
  KEY `workshop_related_exercises_exercise_id_index` (`exercise_id`),
  CONSTRAINT `workshop_related_exercises_workshop_id_foreign` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `workshop_related_exercises_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `workshop_related_exercises_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `workshop_related_exercises_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 13 · `worlds`

```sql
CREATE TABLE `worlds` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` SMALLINT UNSIGNED NULL,
  `level` ENUM('beginner','medium','advanced','expert') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL,
  `badge` VARCHAR(255) NOT NULL,
  `story` TEXT NOT NULL,
  `why` TEXT NOT NULL,
  `concepts_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `guide_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `checkpoint_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `sources_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `worlds_language_status_position_index` (`language`, `status`, `position`),
  CONSTRAINT `worlds_language_foreign` FOREIGN KEY (`language`) REFERENCES `languages` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `worlds_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `worlds_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `worlds_json_check` CHECK (JSON_VALID(`concepts_json`) AND JSON_VALID(`guide_json`) AND JSON_VALID(`checkpoint_json`) AND JSON_VALID(`sources_json`) AND JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 14 · `world_exercises`

```sql
CREATE TABLE `world_exercises` (
  `world_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `role` ENUM('training','challenge','boss') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`world_id`, `exercise_id`),
  KEY `world_exercises_exercise_id_index` (`exercise_id`),
  CONSTRAINT `world_exercises_world_id_foreign` FOREIGN KEY (`world_id`) REFERENCES `worlds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `world_exercises_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `world_exercises_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `world_exercises_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 15 · `atlas_concepts`

```sql
CREATE TABLE `atlas_concepts` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` SMALLINT UNSIGNED NULL,
  `level` ENUM('beginner','medium','advanced','expert') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `summary` TEXT NOT NULL,
  `why` TEXT NOT NULL,
  `explanation` TEXT NOT NULL,
  `comparison` TEXT NOT NULL,
  `pitfall` TEXT NOT NULL,
  `code` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `quiz_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `source_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `further_sources_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `lab_exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `atlas_concepts_language_status_position_index` (`language`, `status`, `position`),
  KEY `atlas_concepts_lab_exercise_id_index` (`lab_exercise_id`),
  CONSTRAINT `atlas_concepts_language_foreign` FOREIGN KEY (`language`) REFERENCES `languages` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `atlas_concepts_lab_exercise_id_foreign` FOREIGN KEY (`lab_exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `atlas_concepts_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `atlas_concepts_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `atlas_concepts_json_check` CHECK (JSON_VALID(`quiz_json`) AND JSON_VALID(`source_json`) AND (`further_sources_json` IS NULL OR JSON_VALID(`further_sources_json`)) AND JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 16 · `guide_resources`

```sql
CREATE TABLE `guide_resources` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` SMALLINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `url` VARCHAR(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `languages_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `category` ENUM('ejercicios','lectura','proyectos','herramientas') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `cost` ENUM('gratis','mixto') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `format` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `why` TEXT NOT NULL,
  `caveat` TEXT NOT NULL,
  `featured` TINYINT(1) NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `guide_resources_status_position_index` (`status`, `position`),
  CONSTRAINT `guide_resources_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `guide_resources_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `guide_resources_featured_check` CHECK (`featured` IN (0, 1)),
  CONSTRAINT `guide_resources_json_check` CHECK (JSON_VALID(`languages_json`) AND JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 17 · `guide_sources`

```sql
CREATE TABLE `guide_sources` (
  `position` SMALLINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `url` VARCHAR(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `note` TEXT NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`position`),
  CONSTRAINT `guide_sources_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `guide_sources_json_check` CHECK (JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 18 · `guide_tracks`

```sql
CREATE TABLE `guide_tracks` (
  `language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`language`),
  CONSTRAINT `guide_tracks_language_foreign` FOREIGN KEY (`language`) REFERENCES `languages` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `guide_tracks_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `guide_tracks_json_check` CHECK (JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 19 · `guide_modules`

```sql
CREATE TABLE `guide_modules` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `track_language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `guide_modules_track_language_status_position_index` (`track_language`, `status`, `position`),
  CONSTRAINT `guide_modules_track_language_foreign` FOREIGN KEY (`track_language`) REFERENCES `guide_tracks` (`language`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `guide_modules_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `guide_modules_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `guide_modules_json_check` CHECK (JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 20 · `guide_steps`

```sql
CREATE TABLE `guide_steps` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `module_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `minutes` SMALLINT UNSIGNED NOT NULL,
  `objective` TEXT NOT NULL,
  `task` TEXT NOT NULL,
  `done_when` TEXT NOT NULL,
  `quiz_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `guide_steps_module_id_status_position_index` (`module_id`, `status`, `position`),
  CONSTRAINT `guide_steps_module_id_foreign` FOREIGN KEY (`module_id`) REFERENCES `guide_modules` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `guide_steps_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `guide_steps_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
  CONSTRAINT `guide_steps_minutes_check` CHECK (`minutes` >= 1),
  CONSTRAINT `guide_steps_json_check` CHECK (JSON_VALID(`quiz_json`) AND JSON_VALID(`key_order`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

### Migración 21 · `guide_step_resources`

```sql
CREATE TABLE `guide_step_resources` (
  `step_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `resource_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NULL,
  `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  `retired_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`step_id`, `resource_id`),
  KEY `guide_step_resources_resource_id_index` (`resource_id`),
  CONSTRAINT `guide_step_resources_step_id_foreign` FOREIGN KEY (`step_id`) REFERENCES `guide_steps` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `guide_step_resources_resource_id_foreign` FOREIGN KEY (`resource_id`) REFERENCES `guide_resources` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `guide_step_resources_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
  CONSTRAINT `guide_step_resources_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci;
```

## Reglas entre filas

Ningún CHECK las expresa (D07: sólo hay restricciones de una fila y sólo la clave primaria es única), así que las comprueba `ContentInvariants` con consultas dentro de la transacción del import, antes del auto-chequeo. Cada consulta devuelve una fila si la regla se rompe y el import no confirma:

- **Posiciones activas únicas:** dentro de su grupo, dos filas activas no repiten `position`. Los grupos son `(catalog, domain o language)` en `exercises`; `exercise_id` en `exercise_tests`; `domain` en `workshops`; `workshop_id` en `workshop_objectives` y `workshop_steps`; `language` en `worlds` y `atlas_concepts`; `track_language` en `guide_modules`; `module_id` en `guide_steps`; `step_id` en `guide_step_resources`; y toda la tabla en `guide_resources`. En `workshop_related_exercises` el grupo es `(workshop_id, lenguaje del ejercicio)`, y en `world_exercises`, `(world_id, entrenamiento o desafío y jefe)`.
- **Ningún hijo activo bajo un padre retirado:** `exercises` con `topics`, `catalogs` y `workshops`; `exercise_tests` y `exercise_hints` con su ejercicio; los objetivos, las etapas y los ejercicios relacionados con su taller (y con su ejercicio); los ejercicios de un mundo con su mundo y su ejercicio; el concepto del Atlas con su ejercicio; y las tres tablas hijas de la guía con sus padres.
- **Un jefe por mundo:** todo mundo activo tiene exactamente un ejercicio `boss`, y es el último de sus desafíos.
- **La corrección vigente está registrada:** el `grading_hash` de cada ejercicio activo figura en `exercise_grading_versions`.
- **Cadena de catálogos única y contigua:** las posiciones activas de `catalogs` son únicas, empiezan en 1 y no tienen huecos (hoy no hay ninguna).

Además, `ContentDiff` rechaza antes de abrir la transacción: un índice v1 de etapa cambiado (`v1_position` congelado), un `test_key` retirado que reaparece por su cuenta y un par documento y meta que no corresponde; `ContentRows` rechaza las referencias a registros inexistentes y los IDs repetidos.

## Reglas de escritura (import)

- **Diferencia en PHP**, fuera de la transacción, fila por fila con igualdad estricta de cadenas y con `key_order` incluido. Los hashes sólo clasifican el informe (nuevo, cambio de corrección, cambio de texto, retirado, reactivado).
- **Upsert** con el query builder (`use_upsert_alias`): `created_at` y `updated_at` explícitos; la lista de actualización es explícita, con `updated_at` y sin `created_at` ni la clave. Una fila que vuelve actualiza también `status`, `retired_at`, `position` y `chain_position`.
- **Retiro** como `UPDATE … WHERE status = 'active' AND <clave>`: `status = 'deprecated'`, `retired_at` y `updated_at`; la `position` de las tablas que la tienen pasa a `NULL` (y `chain_position` en `catalogs`). Nunca `DELETE`, `TRUNCATE` ni `INSERT IGNORE`.
- **Reactivación:** un ejercicio retirado que vuelve al documento con el mismo ID se reactiva. Una prueba retirada por su cuenta no vuelve: su `test_key` no se reutiliza y el import lo rechaza. Una prueba sólo se reactiva junto con su ejercicio, si se retiró con él (mismo `retired_at`).
- **Versiones de corrección:** `INSERT` simple (nunca `IGNORE`) del `grading_hash` nuevo de cada ejercicio, con el `first_import_id` del import que lo trae. A, B, A suma sólo una versión nueva.
- **Registro del import:** una fila de `content_imports` si cambia alguna tabla, el `document_hash` o la huella de alguna porción respecto del último registro. Un `source_commit` distinto no cuenta. La fila guarda las 17 huellas de porción tal como las trae el meta, los conteos de filas activas y el informe.
- **Transacción:** una sola, en `READ COMMITTED` (un `SET TRANSACTION` justo antes de abrirla) y con `attempts: 1`. Orden: registro del import, filas por tabla en orden de dependencias (las versiones de corrección, después de los ejercicios), retiros, invariantes y auto-chequeo de las 17 porciones.
- **Exclusión:** `GET_LOCK(CONCAT(DATABASE(), ':content-import'), 0)` en la conexión del comando; antes de abrir la transacción se verifica `IS_USED_LOCK(...) = CONNECTION_ID()`.
- **Después del COMMIT:** el import guarda en la caché de cuerpos (`Cache::store('database')`, clave `content-body:<porción>:<sha256>`, 30 días) los 17 cuerpos que armó para el auto-chequeo y borra las claves de los hashes que reemplazó.

## Reglas de lectura (API)

- **Qué entra en una porción:** sólo filas activas, ordenadas por `position` y, para desempatar, por la clave primaria binaria. Los textos JSON se decodifican como objetos y las claves se emiten en el orden de `key_order`; una clave ausente no se emite.
- **Qué derivan los códecs de otras tablas:** `topic` (de `topics`), `workshopId` del ejercicio, `tests`, `hints`, `objectives`, `steps`, `code` y `related` del taller, `trainingIds`, `challengeIds` y `bossId` del mundo, y los `modules`, `steps` y `resourceIds` de la guía. La clave y el índice v1 de las etapas no se publican hasta D1.
- **Foto consistente:** cuando falta el cuerpo en la caché, se arma dentro de `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY` y la primera lectura es el último `content_imports`. La escritura en la caché va después de cerrar la transacción.
- **Un 304 lee sólo el último `content_imports`** (el de un ejercicio, además su fila por clave primaria): no toca ninguna otra tabla de contenido.
- **Retirado:** un ejercicio retirado responde 410 con `{id, title, retiredAt}` y, antes que un 304, aunque el validador coincida.

## Criterios de verificación

Los criterios A a I son del DBA para C2; la J (privilegios con un usuario restringido) pasa a C3 con `db-grants`. Las pruebas que dan un DDL confirman la transacción, así que G, H y los de conexión no corren bajo `RefreshDatabase`. El import y la entrega se prueban con `DatabaseTruncation`.

| Criterio | Qué comprueba | Prueba (plan) |
| --- | --- | --- |
| A | Las 21 tablas en InnoDB y con la colación `utf8mb4_es_0900_ai_ci` | `ContentSchemaTest` (T008) |
| B | Cada tabla tiene sus columnas, con los tipos de ID, hash, JSON, fecha y texto de este archivo, y los ENUM con sus valores en orden | `ContentSchemaTest` (T008) |
| C | La clave primaria es el único índice único y los índices son los del DDL (`NON_UNIQUE = 0` sólo en `PRIMARY`) | `ContentSchemaTest` (T008) |
| D | Las 22 claves foráneas, por nombre, con `RESTRICT`, y no dejan borrar ni cambiar | `ContentSchemaTest` y `SchemaBehaviorTest` (T008) |
| E | Los CHECK por nombre, `ENFORCED`, y su comportamiento (error 3819) | `ContentSchemaTest` y `SchemaBehaviorTest` (T008) |
| F | El import, con `CHECKSUM TABLE` de las 21 tablas como oráculo de «no cambió nada» (SC-002, SC-003, SC-005) y las consultas de invariantes rotas a mano | `ImportContentTest` (T020) |
| G | Los cuatro casos de D07 contra el digest de `mysql:9.7`, medidos y fijados | `OnlineDdlTest` (T010) |
| H | `migrate`, `rollback` y `migrate` dejan el mismo `SHOW CREATE TABLE`; el `down()` de una tabla referenciada falla con el error 3730 | `MigrationsTest` (T008) |
| I | La conexión de `php` trabaja en UTC, usa alias en los upserts y no acota la espera de bloqueos; la de `migrate` la acota a 5 s | `ConnectionTest` (T005) y `LockWaitTest` (T008) |
| J | Privilegios con un usuario restringido | C3 (`db-grants`) |
