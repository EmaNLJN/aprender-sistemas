<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/007-d1-progreso-sincronizacion/data-model-d1b.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
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
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('progress_imports');
    }
};
