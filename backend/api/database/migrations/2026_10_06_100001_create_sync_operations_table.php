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
            CREATE TABLE `sync_operations` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `operation_id` BINARY(16) NOT NULL,
              `payload_sha256` BINARY(32) NOT NULL,
              `status` ENUM('applied','rejected') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `reason` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `clock_offset_ms` INT NOT NULL,
              `received_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`, `operation_id`),
              KEY `sync_operations_received_at_index` (`received_at`),
              CONSTRAINT `sync_operations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
              CONSTRAINT `sync_operations_status_check` CHECK (`status` = 'applied' OR `reason` IS NOT NULL)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_operations');
    }
};
