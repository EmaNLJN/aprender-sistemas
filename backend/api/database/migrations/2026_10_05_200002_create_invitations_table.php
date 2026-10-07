<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One atomic statement per table (ADR 0006 D35). Source of truth: specs/004-c3-identidad-acceso/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `invitations` (
              `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
              `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
              `role` ENUM('admin','student') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'student',
              `delivery` ENUM('email','link') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `invited_by` BIGINT UNSIGNED NULL,
              `expires_at` DATETIME(3) NOT NULL,
              `sent_at` DATETIME(3) NULL,
              `send_failed_at` DATETIME(3) NULL,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`id`),
              UNIQUE KEY `invitations_email_unique` (`email`),
              UNIQUE KEY `invitations_token_hash_unique` (`token_hash`),
              KEY `invitations_invited_by_index` (`invited_by`),
              KEY `invitations_expires_at_index` (`expires_at`),
              CONSTRAINT `invitations_invited_by_foreign` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
              CONSTRAINT `invitations_token_hash_check` CHECK (REGEXP_LIKE(`token_hash`, '^[0-9a-f]{64}$', 'c')),
              CONSTRAINT `invitations_expiry_check` CHECK (`expires_at` > `created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
