<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/005-b2-api-ejecuciones/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `exercise_progress` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `solved_at` DATETIME(3) NULL,
              `server_solved_at` DATETIME(3) NULL,
              `proof_attempt_id` BIGINT UNSIGNED NULL,
              `proof_at` DATETIME(3) NULL,
              `last_attempt_id` BIGINT UNSIGNED NULL,
              `last_attempt_at` DATETIME(3) NULL,
              `attempt_count` INT UNSIGNED NOT NULL DEFAULT 0,
              `prediction_answer` TINYINT UNSIGNED NULL,
              `prediction_answer_set_at` DATETIME(3) NULL,
              `prediction_correct` TINYINT(1) NOT NULL DEFAULT 0,
              `prediction_correct_at` DATETIME(3) NULL,
              `assisted` TINYINT(1) NOT NULL DEFAULT 0,
              `solution_seen` TINYINT(1) NOT NULL DEFAULT 0,
              `hints_revealed` TINYINT UNSIGNED NULL,
              `legacy_attempts` BIGINT UNSIGNED NULL,
              `reflection` TEXT NULL,
              `reflection_set_at` DATETIME(3) NULL,
              `custom_test` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
              `custom_test_set_at` DATETIME(3) NULL,
              `confidence` ENUM('again','practice','confident') CHARACTER SET ascii COLLATE ascii_bin NULL,
              `reviewed_at` DATETIME(3) NULL,
              `review_due_at` DATETIME(3) NULL,
              `review_set_at` DATETIME(3) NULL,
              `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`, `exercise_id`),
              KEY `exercise_progress_exercise_id_solved_at_index` (`exercise_id`, `solved_at`),
              KEY `exercise_progress_user_id_revision_index` (`user_id`, `revision`),
              CONSTRAINT `exercise_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `exercise_progress_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `exercise_progress_flags_check` CHECK (`prediction_correct` IN (0, 1) AND `assisted` IN (0, 1) AND `solution_seen` IN (0, 1))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_progress');
    }
};
