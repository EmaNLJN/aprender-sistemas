<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// FR-004: C3b, B2 and D1 add tables; only this list of tables that reference users without a user_id column is edited.
const REFERENCE_USERS_WITHOUT_USER_ID = ['invitations', 'password_reset_tokens', 'account_deletions', 'attempt_tests', 'attempt_payloads'];

// R11: the ledger outlives the account, and the workshop children reach users through workshop_progress.
const USER_ID_WITHOUT_USERS_FOREIGN_KEY = ['account_deletions', 'workshop_observations', 'workshop_step_marks'];

const WORKSHOP_CHILDREN = ['workshop_observations', 'workshop_step_marks'];

it('G: every user_id column is a cascading foreign key to users(id)', function () {
    $userIdTables = collect(DB::select("select table_name as v from information_schema.columns where table_schema = database() and column_name = 'user_id'"))->pluck('v');
    $cascading = collect(DB::select(
        "select k.table_name as v from information_schema.key_column_usage k join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
         where k.table_schema = database() and k.column_name = 'user_id' and k.referenced_table_name = 'users' and k.referenced_column_name = 'id' and r.delete_rule = 'CASCADE'",
    ))->pluck('v');

    expect($userIdTables->all())->toContain('sessions')
        ->and($userIdTables->diff($cascading)->diff(USER_ID_WITHOUT_USERS_FOREIGN_KEY)->values()->all())->toBe([]);
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

it('E: the workshop children, when they exist, cascade through a composite key to workshop_progress, and the ledger has no key', function () {
    $foreignKeysOf = fn (string $table) => collect(DB::select(
        'select k.referenced_table_name as parent, r.delete_rule as delete_rule, count(*) as columns_in_key
         from information_schema.key_column_usage k join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
         where k.table_schema = database() and k.table_name = ? and k.referenced_table_name is not null group by k.constraint_name, k.referenced_table_name, r.delete_rule',
        [$table],
    ));

    $violations = [];
    foreach (WORKSHOP_CHILDREN as $child) {
        $cascadesThroughComposite = $foreignKeysOf($child)->contains(fn (object $key) => $key->parent === 'workshop_progress' && $key->delete_rule === 'CASCADE' && $key->columns_in_key > 1);
        if (Schema::hasTable($child) && ! $cascadesThroughComposite) {
            $violations[] = $child;
        }
    }
    if (Schema::hasTable('account_deletions') && $foreignKeysOf('account_deletions')->isNotEmpty()) {
        $violations[] = 'account_deletions';
    }

    expect($violations)->toBe([]);
});
