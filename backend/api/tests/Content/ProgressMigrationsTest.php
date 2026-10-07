<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

const PROGRESS_MIGRATION_TABLES = [
    'sync_operations', 'drafts', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations',
    'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences',
];

const UNTOUCHED_TABLES = ['users', 'exercises', 'progress_heads', 'exercise_progress'];

/**
 * @param  list<string>  $tables
 * @return array<string, string> the CREATE TABLE of each table, without its AUTO_INCREMENT counter
 */
function progressCreateStatements(array $tables): array
{
    $statements = [];
    foreach ($tables as $table) {
        $statement = DB::selectOne("show create table `{$table}`")->{'Create Table'};
        $statements[$table] = preg_replace('/ AUTO_INCREMENT=\d+/', '', $statement);
    }

    return $statements;
}

it('I: rolling back ten steps drops the ten tables and migrating again recreates them identically', function () {
    foreach (PROGRESS_MIGRATION_TABLES as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }
    $before = progressCreateStatements([...PROGRESS_MIGRATION_TABLES, ...UNTOUCHED_TABLES]);

    try {
        Artisan::call('migrate:rollback', ['--step' => 10, '--force' => true]);
        foreach (PROGRESS_MIGRATION_TABLES as $table) {
            expect(Schema::hasTable($table))->toBeFalse();
        }
        expect(progressCreateStatements(UNTOUCHED_TABLES))->toBe(array_intersect_key($before, array_flip(UNTOUCHED_TABLES)));
    } finally {
        Artisan::call('migrate', ['--force' => true]);
    }

    expect(progressCreateStatements([...PROGRESS_MIGRATION_TABLES, ...UNTOUCHED_TABLES]))->toBe($before);
});
