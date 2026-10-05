<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/001-c2-contenido-mysql/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_grading_versions');
    }
};
