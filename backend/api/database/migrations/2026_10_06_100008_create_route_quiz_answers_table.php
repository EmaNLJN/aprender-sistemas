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
            CREATE TABLE `route_quiz_answers` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `step_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `answer` TINYINT UNSIGNED NOT NULL,
              `set_at` DATETIME(3) NULL,
              `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`, `step_id`),
              KEY `route_quiz_answers_step_id_index` (`step_id`),
              CONSTRAINT `route_quiz_answers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `route_quiz_answers_step_id_foreign` FOREIGN KEY (`step_id`) REFERENCES `guide_steps` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('route_quiz_answers');
    }
};
