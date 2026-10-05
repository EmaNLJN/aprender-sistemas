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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('atlas_concepts');
    }
};
