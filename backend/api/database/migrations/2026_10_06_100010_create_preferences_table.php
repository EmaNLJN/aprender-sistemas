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
            CREATE TABLE `preferences` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `route_language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NULL,
              `route_language_set_at` DATETIME(3) NULL,
              `focus_minutes` TINYINT UNSIGNED NULL,
              `focus_minutes_set_at` DATETIME(3) NULL,
              `lab_selected_rust` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `lab_selected_go` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `lab_selected_rust_set_at` DATETIME(3) NULL,
              `lab_selected_go_set_at` DATETIME(3) NULL,
              `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`),
              KEY `preferences_lab_selected_rust_index` (`lab_selected_rust`),
              KEY `preferences_lab_selected_go_index` (`lab_selected_go`),
              CONSTRAINT `preferences_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `preferences_lab_selected_rust_foreign` FOREIGN KEY (`lab_selected_rust`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `preferences_lab_selected_go_foreign` FOREIGN KEY (`lab_selected_go`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
              CONSTRAINT `preferences_focus_minutes_check` CHECK (`focus_minutes` IS NULL OR `focus_minutes` IN (15, 25, 45))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('preferences');
    }
};
