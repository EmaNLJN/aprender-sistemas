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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_resources');
    }
};
