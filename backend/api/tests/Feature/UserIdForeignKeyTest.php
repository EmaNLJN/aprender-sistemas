<?php

use Illuminate\Support\Facades\DB;

// FR-004: C3b, B2 and D1 add tables; only this list of tables that reference users without a user_id column is edited.
const REFERENCE_USERS_WITHOUT_USER_ID = ['invitations', 'password_reset_tokens', 'account_deletions', 'attempt_tests', 'attempt_payloads'];

// R11 of the C3b plan: these user_id columns cascade through a composite key to their parent, not to users.
const USER_ID_WITHOUT_USERS_FOREIGN_KEY = [
    'workshop_observations' => 'workshop_progress',
    'workshop_step_marks' => 'workshop_progress',
];

it('G: every user_id column is a cascading foreign key to users(id)', function () {
    $userIdTables = collect(DB::select("select table_name as v from information_schema.columns where table_schema = database() and column_name = 'user_id'"))->pluck('v');
    $cascading = collect(DB::select(
        "select k.table_name as v from information_schema.key_column_usage k join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
         where k.table_schema = database() and k.column_name = 'user_id' and k.referenced_table_name = 'users' and k.referenced_column_name = 'id' and r.delete_rule = 'CASCADE'",
    ))->pluck('v');

    expect($userIdTables->all())->toContain('sessions')
        ->and($userIdTables->diff($cascading)->diff(array_keys(USER_ID_WITHOUT_USERS_FOREIGN_KEY))->values()->all())->toBe([]);
});

it('G: a user_id without a key to users cascades through a composite key to its parent', function (string $table, string $parent) {
    $cascades = DB::scalar(
        "select count(*) from information_schema.key_column_usage k join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
         where k.table_schema = database() and k.table_name = ? and k.column_name = 'user_id' and k.referenced_table_name = ? and r.delete_rule = 'CASCADE'",
        [$table, $parent],
    );

    expect($cascades)->toEqual(1);
})->with(fn () => collect(USER_ID_WITHOUT_USERS_FOREIGN_KEY)->map(fn (string $parent, string $table) => [$table, $parent])->values()->all());

it('G: a table that references users without a user_id column is on the exception list', function () {
    $referencing = collect(DB::select(
        "select distinct k.table_name as v from information_schema.key_column_usage k
         where k.table_schema = database() and k.referenced_table_name = 'users'
           and k.table_name not in (select table_name from information_schema.columns where table_schema = database() and column_name = 'user_id')",
    ))->pluck('v');

    expect($referencing->all())->toContain('invitations')
        ->and($referencing->diff(REFERENCE_USERS_WITHOUT_USER_ID)->values()->all())->toBe([]);
});
