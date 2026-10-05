<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// The old table keeps serving the previous php container until the atomic RENAME TABLE swaps it.
// One atomic statement per table (ADR 0006 D35). Source of truth: specs/004-c3-identidad-acceso/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `cache_locks_next` (
              `key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
              `owner` VARCHAR(255) NOT NULL,
              `expiration` BIGINT NOT NULL,
              PRIMARY KEY (`key`),
              KEY `cache_locks_expiration_index` (`expiration`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
        $this->swapIn();
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `cache_locks_next` (
              `key` VARCHAR(255) NOT NULL,
              `owner` VARCHAR(255) NOT NULL,
              `expiration` BIGINT NOT NULL,
              PRIMARY KEY (`key`),
              KEY `cache_locks_expiration_index` (`expiration`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
        $this->swapIn();
    }

    private function swapIn(): void
    {
        DB::statement('RENAME TABLE `cache_locks` TO `cache_locks_previous`, `cache_locks_next` TO `cache_locks`');
        DB::statement('DROP TABLE `cache_locks_previous`');
    }
};
