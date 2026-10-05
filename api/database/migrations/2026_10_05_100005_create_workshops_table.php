<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// workshops (ADR 0006 §5.1, C2): un único CREATE TABLE con sus índices, claves foráneas y CHECK en
// línea (D35). Su DDL es el de specs/001-c2-contenido-mysql/data-model.md.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `workshops` (
              `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `domain` ENUM('lowlevel','infra','play','pc') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `position` SMALLINT UNSIGNED NULL,
              `category` ENUM('machine','infra','play') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `model` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `level` ENUM('beginner','medium','advanced','expert') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `minutes` SMALLINT UNSIGNED NOT NULL,
              `title` VARCHAR(255) NOT NULL,
              `subtitle` VARCHAR(255) NOT NULL,
              `story` TEXT NOT NULL,
              `what` TEXT NOT NULL,
              `why` TEXT NOT NULL,
              `limits` TEXT NOT NULL,
              `uses_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
              `prediction_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
              `sources_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
              `bridge_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
              `key_order` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `status` ENUM('active','deprecated') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
              `retired_at` DATETIME(3) NULL,
              `created_at` DATETIME(3) NOT NULL,
              `updated_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`id`),
              KEY `workshops_domain_status_position_index` (`domain`, `status`, `position`),
              CONSTRAINT `workshops_lifecycle_check` CHECK ((`status` = 'active') = (`retired_at` IS NULL)),
              CONSTRAINT `workshops_position_check` CHECK ((`status` = 'active') = (`position` IS NOT NULL)),
              CONSTRAINT `workshops_minutes_check` CHECK (`minutes` >= 1),
              CONSTRAINT `workshops_json_check` CHECK (JSON_VALID(`uses_json`) AND JSON_VALID(`prediction_json`) AND JSON_VALID(`sources_json`) AND JSON_VALID(`bridge_json`) AND JSON_VALID(`key_order`))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('workshops');
    }
};
