<?php

use Illuminate\Support\Facades\DB;

// FR-004: C3b, B2 and D1 add tables; only this list of tables that reference users without a user_id column is edited.
const REFERENCE_USERS_WITHOUT_USER_ID = ['invitations', 'password_reset_tokens', 'account_deletions', 'attempt_tests', 'attempt_payloads'];

it('G: every user_id column is a cascading foreign key to users(id)', function () {
    $userIdTables = collect(DB::select("select table_name as v from information_schema.columns where table_schema = database() and column_name = 'user_id'"))->pluck('v');
    $cascading = collect(DB::select(
        "select k.table_name as v from information_schema.key_column_usage k join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
         where k.table_schema = database() and k.column_name = 'user_id' and k.referenced_table_name = 'users' and k.referenced_column_name = 'id' and r.delete_rule = 'CASCADE'",
    ))->pluck('v');

    expect($userIdTables->sort()->values()->all())->toBe(['sessions'])
        ->and($userIdTables->diff($cascading)->values()->all())->toBe([]);
});

it('G: a table that references users without a user_id column is on the exception list', function () {
    $referencing = collect(DB::select(
        "select distinct k.table_name as v from information_schema.key_column_usage k
         where k.table_schema = database() and k.referenced_table_name = 'users'
           and k.table_name not in (select table_name from information_schema.columns where table_schema = database() and column_name = 'user_id')",
    ))->pluck('v');

    expect($referencing->all())->toBe(['invitations'])
        ->and($referencing->diff(REFERENCE_USERS_WITHOUT_USER_ID)->values()->all())->toBe([]);
});
