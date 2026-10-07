<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

const IMPORT_MIGRATION_TABLES = ['progress_imports', 'campaign_seals'];

const IMPORT_UNTOUCHED_TABLES = [
    'users', 'exercises', 'progress_heads', 'exercise_progress', 'sync_operations', 'drafts', 'campaign_checkpoints', 'workshop_progress',
    'workshop_observations', 'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences',
];

/**
 * @param  list<string>  $tables
 * @return array<string, string> the CREATE TABLE of each table, without its AUTO_INCREMENT counter
 */
function importCreateStatements(array $tables): array
{
    $statements = [];
    foreach ($tables as $table) {
        $statement = DB::selectOne("show create table `{$table}`")->{'Create Table'};
        $statements[$table] = preg_replace('/ AUTO_INCREMENT=\d+/', '', $statement);
    }

    return $statements;
}

it('migrates, rolls back two steps and migrates again leaving the same tables and touching no other', function () {
    foreach (IMPORT_MIGRATION_TABLES as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }
    $before = importCreateStatements([...IMPORT_MIGRATION_TABLES, ...IMPORT_UNTOUCHED_TABLES]);

    try {
        Artisan::call('migrate:rollback', ['--step' => 2, '--force' => true]);
        foreach (IMPORT_MIGRATION_TABLES as $table) {
            expect(Schema::hasTable($table))->toBeFalse();
        }
        expect(importCreateStatements(IMPORT_UNTOUCHED_TABLES))->toBe(array_intersect_key($before, array_flip(IMPORT_UNTOUCHED_TABLES)));
    } finally {
        Artisan::call('migrate', ['--force' => true]);
    }

    expect(importCreateStatements([...IMPORT_MIGRATION_TABLES, ...IMPORT_UNTOUCHED_TABLES]))->toBe($before);
});
