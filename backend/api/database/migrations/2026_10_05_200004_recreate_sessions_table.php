<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One atomic statement per table (ADR 0006 D35). Source of truth: specs/004-c3-identidad-acceso/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('sessions');
        DB::statement(<<<'SQL'
            CREATE TABLE `sessions` (
              `id` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `user_id` BIGINT UNSIGNED NULL,
              `ip_address` VARCHAR(45) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `user_agent` TEXT NULL,
              `payload` LONGTEXT NOT NULL,
              `last_activity` INT UNSIGNED NOT NULL,
              PRIMARY KEY (`id`),
              KEY `sessions_user_id_index` (`user_id`),
              KEY `sessions_last_activity_index` (`last_activity`),
              CONSTRAINT `sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }
};
