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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_hints');
    }
};
