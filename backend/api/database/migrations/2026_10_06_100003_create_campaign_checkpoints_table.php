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
            CREATE TABLE `campaign_checkpoints` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `world_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `passed` TINYINT(1) NOT NULL DEFAULT 0,
              `passed_at` DATETIME(3) NULL,
              `last_answer` TINYINT UNSIGNED NULL,
              `last_answer_set_at` DATETIME(3) NULL,
              `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`, `world_id`),
              KEY `campaign_checkpoints_world_id_passed_index` (`world_id`, `passed`),
              CONSTRAINT `campaign_checkpoints_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `campaign_checkpoints_world_id_foreign` FOREIGN KEY (`world_id`) REFERENCES `worlds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `campaign_checkpoints_passed_check` CHECK (`passed` IN (0, 1))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_checkpoints');
    }
};
