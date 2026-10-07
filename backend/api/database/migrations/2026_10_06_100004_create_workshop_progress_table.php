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
            CREATE TABLE `workshop_progress` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `code_sealed` TINYINT(1) NOT NULL DEFAULT 0,
              `prediction_correct` TINYINT(1) NOT NULL DEFAULT 0,
              `prediction_correct_at` DATETIME(3) NULL,
              `answer` TINYINT UNSIGNED NULL,
              `answer_set_at` DATETIME(3) NULL,
              `note` TEXT NULL,
              `note_set_at` DATETIME(3) NULL,
              `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`, `workshop_id`, `language`),
              KEY `workshop_progress_workshop_id_index` (`workshop_id`),
              CONSTRAINT `workshop_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `workshop_progress_workshop_id_foreign` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `workshop_progress_flags_check` CHECK (`code_sealed` IN (0, 1) AND `prediction_correct` IN (0, 1))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('workshop_progress');
    }
};
