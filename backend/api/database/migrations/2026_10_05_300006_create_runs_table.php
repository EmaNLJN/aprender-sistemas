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
            CREATE TABLE `runs` (
              `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `user_id` BIGINT UNSIGNED NOT NULL,
              `client_run_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `epoch` INT UNSIGNED NOT NULL,
              `grading_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `expected_tests` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `nonce` CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `code` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
              `custom_test` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
              `program` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
              `status` ENUM('queued','running','passed','failed','compile_error','runtime_error','timeout','infra_error','canceled') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'queued',
              `reason` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `executor_phase` ENUM('compile','run') CHARACTER SET ascii COLLATE ascii_bin NULL,
              `exit_code` SMALLINT NULL,
              `truncated` TINYINT(1) NULL,
              `compile_ms` INT UNSIGNED NULL,
              `run_ms` INT UNSIGNED NULL,
              `stdout` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
              `stderr` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
              `attempt_id` BIGINT UNSIGNED NULL,
              `cancel_requested_at` DATETIME(3) NULL,
              `created_at` DATETIME(3) NOT NULL,
              `started_at` DATETIME(3) NULL,
              `finished_at` DATETIME(3) NULL,
              `expires_at` DATETIME(3) NULL,
              PRIMARY KEY (`id`),
              UNIQUE KEY `runs_user_id_client_run_id_unique` (`user_id`, `client_run_id`),
              UNIQUE KEY `runs_attempt_id_unique` (`attempt_id`),
              KEY `runs_user_id_created_at_index` (`user_id`, `created_at`),
              KEY `runs_status_created_at_index` (`status`, `created_at`),
              KEY `runs_exercise_id_index` (`exercise_id`),
              CONSTRAINT `runs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `runs_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `runs_attempt_id_foreign` FOREIGN KEY (`attempt_id`) REFERENCES `attempts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `runs_client_run_id_check` CHECK (REGEXP_LIKE(`client_run_id`, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'c'))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('runs');
    }
};
