<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

const D32_TABLES = ['d32_parent', 'd32_child'];

const WORKSHOP_LANGUAGE_TABLES = ['workshop_progress', 'workshop_observations', 'workshop_step_marks'];

function dropD32Tables(): void
{
    DB::statement('DROP TABLE IF EXISTS `d32_child`');
    DB::statement('DROP TABLE IF EXISTS `d32_parent`');
}

function createD32Tables(): void
{
    DB::statement(<<<'SQL'
        CREATE TABLE `d32_parent` (
          `user_id` BIGINT UNSIGNED NOT NULL,
          `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
          `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
          PRIMARY KEY (`user_id`, `workshop_id`, `language`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
        SQL);
    DB::statement(<<<'SQL'
        CREATE TABLE `d32_child` (
          `user_id` BIGINT UNSIGNED NOT NULL,
          `workshop_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
          `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
          `objective_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
          PRIMARY KEY (`user_id`, `workshop_id`, `language`, `objective_key`),
          CONSTRAINT `d32_child_progress_foreign` FOREIGN KEY (`user_id`, `workshop_id`, `language`) REFERENCES `d32_parent` (`user_id`, `workshop_id`, `language`) ON DELETE CASCADE ON UPDATE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
        SQL);
    DB::insert("INSERT INTO `d32_parent` VALUES (1, 'w1', 'rust'), (1, 'w1', 'go')");
    DB::insert("INSERT INTO `d32_child` VALUES (1, 'w1', 'rust', 'o1'), (1, 'w1', 'go', 'o1')");
}

function enumLanguageSurvivesInstantAlter(): bool
{
    dropD32Tables();
    try {
        createD32Tables();
        foreach (D32_TABLES as $table) {
            DB::statement("ALTER TABLE `{$table}` MODIFY `language` ENUM('rust','go','zig') CHARACTER SET ascii COLLATE ascii_bin NOT NULL, ALGORITHM=INSTANT");
        }
        DB::insert("INSERT INTO `d32_parent` VALUES (2, 'w1', 'zig')");
        DB::insert("INSERT INTO `d32_child` VALUES (2, 'w1', 'zig', 'o1')");

        $rowsIntact = DB::table('d32_parent')->count() === 3 && DB::table('d32_child')->count() === 3;
        $foreignKeyIntact = DB::selectOne("select count(*) as n from information_schema.referential_constraints where constraint_schema = database() and constraint_name = 'd32_child_progress_foreign' and delete_rule = 'CASCADE'")->n === 1;
        DB::delete('delete from `d32_parent` where user_id = 2');
        $cascades = DB::table('d32_child')->count() === 2;

        return $rowsIntact && $foreignKeyIntact && $cascades;
    } catch (QueryException) {
        return false;
    } finally {
        dropD32Tables();
    }
}

it('J: decides by experiment whether an ENUM language can live in the composite foreign keys', function () {
    $survives = enumLanguageSurvivesInstantAlter();
    fwrite(STDERR, 'D32 decision: language is '.($survives ? "ENUM('rust','go')" : 'VARCHAR(8) with a foreign key to languages').PHP_EOL);

    expect(DB::select("show tables like 'd32\\_%'"))->toBe([]);
});

it('J: language of the three workshop tables is the type that the experiment decided', function () {
    $survives = enumLanguageSurvivesInstantAlter();
    $types = collect(WORKSHOP_LANGUAGE_TABLES)->mapWithKeys(fn (string $table) => [
        $table => DB::selectOne('select column_type as type from information_schema.columns where table_schema = database() and table_name = ? and column_name = ?', [$table, 'language'])?->type,
    ])->all();

    $expected = $survives ? "enum('rust','go')" : 'varchar(8)';
    expect($types)->toBe(array_fill_keys(WORKSHOP_LANGUAGE_TABLES, $expected));
});
