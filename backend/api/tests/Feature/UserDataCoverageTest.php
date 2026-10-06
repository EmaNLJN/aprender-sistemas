<?php

use App\Accounts\UserData;
use App\Accounts\UserTable;
use Tests\Support\UserDataCoverage;

it('declares every table of the account that the schema has', function () {
    expect(UserDataCoverage::undeclared())->toBe([]);
});

it('gives each declared table that exists its export or its reason, and its purge or its note', function () {
    $offenders = [];
    foreach ((new UserData)->tables() as $table) {
        if (! UserDataCoverage::exists($table->name) || $table->reason !== null) {
            continue;
        }
        $hasExport = $table->export !== null || ($table->excluded !== null && $table->excluded !== '');
        $hasPurge = $table->batchesBy !== null || ($table->note !== null && $table->note !== '');
        if (! $hasExport || ! $hasPurge) {
            $offenders[] = $table->name;
        }
    }

    expect($offenders)->toBe([]);
});

it('knows the account tables that the schema has today', function () {
    expect(UserDataCoverage::accountTables())->toContain('sessions', 'progress_heads', 'runs', 'exercise_progress', 'attempts', 'attempt_tests', 'attempt_payloads', 'account_deletions');
});

it('reports a table that the registry leaves out', function () {
    $withoutAttempts = array_values(array_filter((new UserData)->tables(), fn (UserTable $table) => $table->name !== 'attempts'));

    expect(UserDataCoverage::undeclared(new UserData($withoutAttempts)))->toBe(['attempts']);
});
