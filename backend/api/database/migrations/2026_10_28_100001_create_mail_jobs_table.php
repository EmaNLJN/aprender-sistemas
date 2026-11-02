<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/011-c3c-correo/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `mail_jobs` (
              `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
              `queue` VARCHAR(255) NOT NULL,
              `payload` LONGTEXT NOT NULL,
              `attempts` SMALLINT UNSIGNED NOT NULL,
              `reserved_at` INT UNSIGNED NULL,
              `available_at` INT UNSIGNED NOT NULL,
              `created_at` INT UNSIGNED NOT NULL,
              PRIMARY KEY (`id`),
              KEY `mail_jobs_queue_index` (`queue`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_jobs');
    }
};
