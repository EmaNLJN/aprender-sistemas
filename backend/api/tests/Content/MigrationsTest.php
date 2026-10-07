<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\ContentDatabase;

const IDENTITY_MIGRATED_TABLES = ['users', 'invitations', 'password_reset_tokens', 'sessions', 'cache', 'cache_locks', 'failed_jobs'];

/** @return array<string, string> the CREATE TABLE of each content and identity table, without its AUTO_INCREMENT counter */
function createStatements(): array
{
    $statements = [];
    foreach ([...ContentDatabase::TABLES, ...IDENTITY_MIGRATED_TABLES] as $table) {
        $statement = DB::selectOne("show create table `{$table}`")->{'Create Table'};
        // AUTO_INCREMENT is not schema: a rolled-back import leaves content_imports empty but advanced, and DatabaseTruncation skips empty tables.
        $statements[$table] = preg_replace('/ AUTO_INCREMENT=\d+/', '', $statement);
    }

    return $statements;
}

it('migrate, rollback and migrate leave the same schema (H)', function () {
    $before = createStatements();
    $migrationsAfterC1 = count(glob(database_path('migrations/*.php'))) - 3;

    try {
        expect(Artisan::call('migrate:rollback', ['--step' => $migrationsAfterC1, '--force' => true]))->toBe(0);
        expect(Schema::hasTable('exercises'))->toBeFalse()
            ->and(Schema::hasTable('invitations'))->toBeFalse();
    } finally {
        expect(Artisan::call('migrate', ['--force' => true]))->toBe(0);
    }

    expect(createStatements())->toBe($before);
});

it('down() of a referenced table fails while its children exist (error 3730)', function () {
    $migration = require database_path('migrations/2026_10_05_100006_create_exercises_table.php');

    try {
        $migration->down();
        $this->fail('expected MySQL to refuse dropping the referenced table');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(3730);
    }
    expect(Schema::hasTable('exercises'))->toBeTrue();
});
