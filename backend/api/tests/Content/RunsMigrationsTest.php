<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

const RUN_MIGRATIONS = [
    'harness_templates' => '2026_10_05_300001_create_harness_templates_table.php',
    'progress_heads' => '2026_10_05_300002_create_progress_heads_table.php',
    'attempts' => '2026_10_05_300003_create_attempts_table.php',
    'attempt_tests' => '2026_10_05_300004_create_attempt_tests_table.php',
    'attempt_payloads' => '2026_10_05_300005_create_attempt_payloads_table.php',
    'runs' => '2026_10_05_300006_create_runs_table.php',
    'exercise_progress' => '2026_10_05_300007_create_exercise_progress_table.php',
];

/** @return array<string, string> the CREATE TABLE of each run table, without its AUTO_INCREMENT counter */
function runCreateStatements(): array
{
    $statements = [];
    foreach (array_keys(RUN_MIGRATIONS) as $table) {
        $statement = DB::selectOne("show create table `{$table}`")->{'Create Table'};
        $statements[$table] = preg_replace('/ AUTO_INCREMENT=\d+/', '', $statement);
    }

    return $statements;
}

it('I: down() in reverse order drops the seven tables and up() in order recreates them identically', function () {
    $before = runCreateStatements();
    $migrations = array_map(fn (string $file) => require database_path("migrations/{$file}"), RUN_MIGRATIONS);

    try {
        foreach (array_reverse($migrations) as $migration) {
            $migration->down();
        }
        foreach (array_keys(RUN_MIGRATIONS) as $table) {
            expect(Schema::hasTable($table))->toBeFalse();
        }
        expect(Schema::hasTable('exercises'))->toBeTrue();
    } finally {
        foreach ($migrations as $migration) {
            if (! Schema::hasTable(array_search($migration, $migrations, true))) {
                $migration->up();
            }
        }
    }

    expect(runCreateStatements())->toBe($before);
});
