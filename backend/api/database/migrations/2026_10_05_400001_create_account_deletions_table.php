<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/010-c3b-admin-ciclo-de-vida/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `account_deletions` (
              `user_id` BIGINT UNSIGNED NOT NULL,
              `user_created_at` DATETIME(3) NOT NULL,
              `deleted_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`user_id`),
              KEY `account_deletions_deleted_at_index` (`deleted_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('account_deletions');
    }
};
