<?php

use App\Accounts\Export\UserExport;
use App\Accounts\UserData;
use App\Accounts\UserTable;
use Tests\Support\PopulatedAccount;
use Tests\Support\UserDataCoverage;

function exportCoverageOffenders(UserData $data): array
{
    $keys = app(UserExport::class)->sectionKeys();
    $offenders = [];
    foreach ($data->tables() as $table) {
        if ($table->export !== null && UserDataCoverage::exists($table->name) && ! in_array($table->export, $keys, true)) {
            $offenders[] = $table->name;
        }
    }

    return $offenders;
}

it('has a registered section for every declared table that exists', function () {
    expect(exportCoverageOffenders(new UserData))->toBe([]);
});

it('names a table that exists and declares imports without a registered section', function () {
    $tables = [
        UserTable::owned('exercise_progress', 'progress', null, 'exercise_id', null),
        UserTable::owned('attempts', 'imports', null, 'id', null),
        UserTable::owned('drafts', 'imports', null, null, 'Cascade.'),
    ];

    expect(exportCoverageOffenders(new UserData($tables)))->toBe(['attempts', 'drafts']);
});

it('exports rows for each declared table that exists with an export key, using a populated account', function () {
    $user = PopulatedAccount::create();
    $document = exportedDocument($user->id);

    foreach ((new UserData)->tables() as $table) {
        if ($table->export === null || ! UserDataCoverage::exists($table->name)) {
            continue;
        }
        expect(UserDataCoverage::rowsOf($table, $user->id))->toBeGreaterThan(0, $table->name)
            ->and(iterator_to_array(new ArrayIterator((array) $document[$table->export]), false))->not->toBe([], $table->name);
    }
});
