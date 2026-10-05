<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// world_exercises (ADR 0006 §5.1, C2): un único CREATE TABLE con sus índices, claves foráneas y CHECK en
// línea (D35). Su DDL es el de specs/001-c2-contenido-mysql/data-model.md.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('world_exercises');
    }
};
