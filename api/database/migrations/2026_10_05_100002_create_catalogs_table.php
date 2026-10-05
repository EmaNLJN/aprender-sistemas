<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/001-c2-contenido-mysql/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `catalogs` (
              `code` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `slice_by` ENUM('language','domain') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `chain_position` TINYINT UNSIGNED NULL,
              `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
              `retired_at` DATETIME(3) NULL,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`code`),
              CONSTRAINT `catalogs_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
              CONSTRAINT `catalogs_chain_position_check` CHECK (`chain_position` IS NULL OR `chain_position` >= 1),
              CONSTRAINT `catalogs_chain_lifecycle_check` CHECK (`status` = 'active' OR `chain_position` IS NULL)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('catalogs');
    }
};
