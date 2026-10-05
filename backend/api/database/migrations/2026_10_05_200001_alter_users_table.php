<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// One atomic statement per table (ADR 0006 D35). Source of truth: specs/004-c3-identidad-acceso/data-model.md
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            UPDATE `users`
            SET `created_at` = COALESCE(`created_at`, NOW(3)),
                `updated_at` = COALESCE(`updated_at`, NOW(3)),
                `email_verified_at` = COALESCE(`email_verified_at`, NOW(3))
            SQL);

        DB::statement(<<<'SQL'
            ALTER TABLE `users`
              MODIFY `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
              MODIFY `email_verified_at` DATETIME(3) NULL,
              ADD COLUMN `role` ENUM('admin','student') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'student' AFTER `password`,
              ADD COLUMN `status` ENUM('active','disabled','deleting') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active' AFTER `role`,
              ADD COLUMN `privacy_version` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER `status`,
              ADD COLUMN `privacy_accepted_at` DATETIME(3) NULL AFTER `privacy_version`,
              MODIFY `created_at` DATETIME(3) NOT NULL,
              MODIFY `updated_at` DATETIME(3) NOT NULL,
              ADD INDEX `users_role_status_index` (`role`, `status`),
              ADD CONSTRAINT `users_privacy_check` CHECK ((`privacy_version` IS NULL) = (`privacy_accepted_at` IS NULL))
            SQL);
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE `users`
              DROP CONSTRAINT `users_privacy_check`,
              DROP INDEX `users_role_status_index`,
              DROP COLUMN `role`,
              DROP COLUMN `status`,
              DROP COLUMN `privacy_version`,
              DROP COLUMN `privacy_accepted_at`,
              MODIFY `email` VARCHAR(255) COLLATE utf8mb4_es_0900_ai_ci NOT NULL,
              MODIFY `email_verified_at` TIMESTAMP NULL,
              MODIFY `created_at` TIMESTAMP NULL,
              MODIFY `updated_at` TIMESTAMP NULL
            SQL);
    }
};
