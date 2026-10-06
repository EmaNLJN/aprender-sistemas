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
            CREATE TABLE `attempts` (
              `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
              `user_id` BIGINT UNSIGNED NOT NULL,
              `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `epoch` INT UNSIGNED NOT NULL,
              `legacy` TINYINT(1) NOT NULL DEFAULT 0,
              `outcome` ENUM('passed','failed','compile_error','runtime_error','timeout','infra_error','canceled','legacy_error') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `reason` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `grading_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `code_sha256` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `custom_outcome` ENUM('pass','fail','missing') CHARACTER SET ascii COLLATE ascii_bin NULL,
              `output_truncated` TINYINT(1) NOT NULL DEFAULT 0,
              `executor_phase` ENUM('compile','run') CHARACTER SET ascii COLLATE ascii_bin NULL,
              `exit_code` SMALLINT NULL,
              `compile_ms` INT UNSIGNED NULL,
              `run_ms` INT UNSIGNED NULL,
              `attempted_at` DATETIME(3) NOT NULL,
              `started_at` DATETIME(3) NULL,
              `finished_at` DATETIME(3) NOT NULL,
              `counted` TINYINT(1) GENERATED ALWAYS AS (`legacy` = 0 AND `outcome` IN ('passed','failed','compile_error','runtime_error','timeout')) VIRTUAL,
              `created_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`id`),
              KEY `attempts_user_id_exercise_id_attempted_at_index` (`user_id`, `exercise_id`, `attempted_at`),
              KEY `attempts_exercise_id_attempted_at_outcome_index` (`exercise_id`, `attempted_at`, `outcome`),
              CONSTRAINT `attempts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `attempts_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `attempts_grading_hash_check` CHECK (`legacy` = 1 OR `grading_hash` IS NOT NULL),
              CONSTRAINT `attempts_code_sha256_check` CHECK (REGEXP_LIKE(`code_sha256`, '^[0-9a-f]{64}$', 'c'))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('attempts');
    }
};
