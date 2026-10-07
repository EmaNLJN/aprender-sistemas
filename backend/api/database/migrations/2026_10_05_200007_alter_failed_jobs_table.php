<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// One atomic statement per table (ADR 0006 D35). Source of truth: specs/004-c3-identidad-acceso/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE `failed_jobs` MODIFY `failed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE `failed_jobs` MODIFY `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    }
};
