<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/007-d1-progreso-sincronizacion/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `workshop_observations` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `objective_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `observed_at` DATETIME(3) NULL,
              `legacy_position` SMALLINT UNSIGNED NULL,
              `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
              `created_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`, `workshop_id`, `language`, `objective_key`),
              KEY `workshop_observations_workshop_id_objective_key_index` (`workshop_id`, `objective_key`),
              CONSTRAINT `workshop_observations_progress_foreign` FOREIGN KEY (`user_id`, `workshop_id`, `language`) REFERENCES `workshop_progress` (`user_id`, `workshop_id`, `language`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `workshop_observations_objective_foreign` FOREIGN KEY (`workshop_id`, `objective_key`) REFERENCES `workshop_objectives` (`workshop_id`, `objective_key`) ON DELETE RESTRICT ON UPDATE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('workshop_observations');
    }
};
