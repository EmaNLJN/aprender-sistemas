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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('worlds');
    }
};
