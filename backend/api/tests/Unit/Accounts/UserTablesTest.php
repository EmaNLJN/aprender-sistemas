<?php

use App\Accounts\Ownership;
use App\Accounts\UserData;
use App\Accounts\UserTable;
use App\Accounts\UserTables;

/** @return list<string> */
function declaredNames(): array
{
    return array_map(fn (UserTable $table) => $table->name, UserTables::all());
}

function declared(string $name): UserTable
{
    foreach (UserTables::all() as $table) {
        if ($table->name === $name) {
            return $table;
        }
    }
    throw new RuntimeException("{$name} is not declared");
}

it('declares the 22 tables of data-model section 2, without repeats', function () {
    expect(declaredNames())->toBe([
        'sessions', 'invitations', 'password_reset_tokens', 'account_deletions',
        'progress_heads', 'runs', 'exercise_progress', 'attempts', 'attempt_tests', 'attempt_payloads', 'sync_operations', 'progress_imports',
        'drafts', 'campaign_checkpoints', 'workshop_progress', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences',
        'workshop_observations', 'workshop_step_marks', 'campaign_seals',
    ]);
});

it('gives each of the four exceptions its reason', function (string $name, Ownership $ownership) {
    $table = declared($name);

    expect($table->ownership)->toBe($ownership)
        ->and($table->reason)->not->toBeEmpty();
})->with([
    ['sessions', Ownership::UserId],
    ['invitations', Ownership::ByEmail],
    ['password_reset_tokens', Ownership::ByEmail],
    ['account_deletions', Ownership::Ledger],
]);

it('purges in batches runs, exercise_progress, attempts, sync_operations and progress_imports, in that order and by their key', function () {
    $batches = array_map(fn (UserTable $table) => [$table->name, $table->batchesBy], (new UserData)->batchTables());

    expect($batches)->toBe([['runs', 'id'], ['exercise_progress', 'exercise_id'], ['attempts', 'id'], ['sync_operations', 'operation_id'], ['progress_imports', 'id']]);
});

it('names a declared parent for every child', function (string $child, string $parent) {
    expect(declared($child)->ownership)->toBe(Ownership::Child)
        ->and(declared($child)->parent)->toBe($parent)
        ->and(declaredNames())->toContain($parent);
})->with([
    ['attempt_tests', 'attempts'],
    ['attempt_payloads', 'attempts'],
    ['workshop_observations', 'workshop_progress'],
    ['workshop_step_marks', 'workshop_progress'],
]);

it('exports with a section key or explains why it does not, never both and never neither', function () {
    $offenders = [];
    foreach (UserTables::all() as $table) {
        $isException = $table->reason !== null;
        if (! $isException && (($table->export === null) === ($table->excluded === null))) {
            $offenders[] = $table->name;
        }
    }

    expect($offenders)->toBe([]);
});

it('purges every non-exception table in a batch or explains how it goes', function () {
    $offenders = [];
    foreach (UserTables::all() as $table) {
        $isException = $table->reason !== null;
        if (! $isException && $table->batchesBy === null && ($table->note === null || $table->note === '')) {
            $offenders[] = $table->name;
        }
    }

    expect($offenders)->toBe([]);
});

it('lists the export vocabulary once', function () {
    expect((new UserData)->exportKeys())->toBe(['account', 'attempts', 'progress', 'imports']);
});

it('uses the registry by default and the tables it is given otherwise', function () {
    $own = [UserTable::exception('zz_only', Ownership::Ledger, 'a reason')];

    expect((new UserData)->tables())->toEqual(UserTables::all())
        ->and((new UserData($own))->tables())->toBe($own);
});
