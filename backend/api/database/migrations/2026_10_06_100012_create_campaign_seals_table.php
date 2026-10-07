<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/007-d1-progreso-sincronizacion/data-model-d1b.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `campaign_seals` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `code` TINYINT(1) NOT NULL,
              `prediction` TINYINT(1) NOT NULL,
              `assisted` TINYINT(1) NOT NULL,
              `imported_at` DATETIME(3) NOT NULL,
              `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
              PRIMARY KEY (`user_id`, `exercise_id`),
              KEY `campaign_seals_exercise_id_index` (`exercise_id`),
              CONSTRAINT `campaign_seals_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `campaign_seals_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `campaign_seals_flags_check` CHECK (`code` IN (0, 1) AND `prediction` IN (0, 1) AND `assisted` IN (0, 1))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_seals');
    }
};
