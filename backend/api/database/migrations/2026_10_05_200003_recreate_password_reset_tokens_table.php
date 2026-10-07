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
        Schema::dropIfExists('password_reset_tokens');
        DB::statement(<<<'SQL'
            CREATE TABLE `password_reset_tokens` (
              `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
              `token` VARCHAR(255) NOT NULL,
              `created_at` DATETIME(3) NULL,
              PRIMARY KEY (`email`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }
};
