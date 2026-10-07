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
            CREATE TABLE `cache_next` (
              `key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
              `value` MEDIUMTEXT NOT NULL,
              `expiration` BIGINT NOT NULL,
              PRIMARY KEY (`key`),
              KEY `cache_expiration_index` (`expiration`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
        $this->swapIn();
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `cache_next` (
              `key` VARCHAR(255) NOT NULL,
              `value` MEDIUMTEXT NOT NULL,
              `expiration` BIGINT NOT NULL,
              PRIMARY KEY (`key`),
              KEY `cache_expiration_index` (`expiration`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
        $this->swapIn();
    }

    private function swapIn(): void
    {
        DB::statement('RENAME TABLE `cache` TO `cache_previous`, `cache_next` TO `cache`');
        DB::statement('DROP TABLE `cache_previous`');
    }
};
