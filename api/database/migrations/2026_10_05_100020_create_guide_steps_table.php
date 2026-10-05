<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// guide_steps (ADR 0006 §5.1, C2): un único CREATE TABLE con sus índices, claves foráneas y CHECK en
// línea (D35). Su DDL es el de specs/001-c2-contenido-mysql/data-model.md.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_steps');
    }
};
