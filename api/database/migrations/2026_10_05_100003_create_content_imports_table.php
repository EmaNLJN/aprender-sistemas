<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// content_imports (ADR 0006 §5.1, C2): un único CREATE TABLE con sus índices, claves foráneas y CHECK en
// línea (D35). Su DDL es el de specs/001-c2-contenido-mysql/data-model.md.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE `content_imports` (
              `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
              `document_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              `source_commit` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
              `portion_hashes` JSON NOT NULL,
              `counts` JSON NOT NULL,
              `changes` JSON NOT NULL,
              `created_at` DATETIME(3) NOT NULL,
              PRIMARY KEY (`id`),
              CONSTRAINT `content_imports_document_hash_check` CHECK (REGEXP_LIKE(`document_hash`, '^[0-9a-f]{64}$', 'c')),
              CONSTRAINT `content_imports_source_commit_check` CHECK (`source_commit` IS NULL OR (CHAR_LENGTH(`source_commit`) IN (40, 64) AND REGEXP_LIKE(`source_commit`, '^[0-9a-f]+$', 'c')))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('content_imports');
    }
};
