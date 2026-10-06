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
            CREATE TABLE `attempt_tests` (
              `attempt_id` BIGINT UNSIGNED NOT NULL,
              `test_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `position` TINYINT UNSIGNED NOT NULL,
              `outcome` ENUM('pass','fail','missing') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              PRIMARY KEY (`attempt_id`, `test_key`),
              KEY `attempt_tests_exercise_id_test_key_outcome_index` (`exercise_id`, `test_key`, `outcome`),
              CONSTRAINT `attempt_tests_attempt_id_foreign` FOREIGN KEY (`attempt_id`) REFERENCES `attempts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `attempt_tests_exercise_id_test_key_foreign` FOREIGN KEY (`exercise_id`, `test_key`) REFERENCES `exercise_tests` (`exercise_id`, `test_key`) ON DELETE RESTRICT ON UPDATE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('attempt_tests');
    }
};
