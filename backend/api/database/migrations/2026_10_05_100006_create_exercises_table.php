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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('exercises');
    }
};
