<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

const IDENTITY_TABLES = [
    'users' => 12, 'invitations' => 11, 'password_reset_tokens' => 3, 'sessions' => 6,
    'cache' => 3, 'cache_locks' => 3, 'failed_jobs' => 7,
];

// ADR 0006 §5.2 and §5.5 identity schema against information_schema; the expectations come from the ADR, not from the migrations.
function identityColumns(string $table): array
{
    $rows = DB::select('select column_name as c, column_type as type, collation_name as collation_name, is_nullable as nullable from information_schema.columns where table_schema = database() and table_name = ? order by ordinal_position', [$table]);

    return collect($rows)->mapWithKeys(fn (object $row) => [$row->c => [$row->type, $row->collation_name, $row->nullable]])->all();
}

function identityScalars(string $sql, array $bindings = []): array
{
    return collect(DB::select($sql, $bindings))->pluck('v')->sort()->values()->all();
}

it('A: creates the seven tables in InnoDB and no column is a TIMESTAMP', function () {
    $names = array_keys(IDENTITY_TABLES);
    $placeholders = implode(',', array_fill(0, count($names), '?'));
    $tables = collect(DB::select("select table_name as name, engine as engine from information_schema.tables where table_schema = database() and table_name in ({$placeholders})", $names));
    $timestamps = collect(DB::select("select concat(table_name, '.', column_name) as v from information_schema.columns where table_schema = database() and data_type = 'timestamp' and table_name in ({$placeholders})", $names));

    expect($tables->pluck('name')->sort()->values()->all())->toBe(collect($names)->sort()->values()->all())
        ->and($tables->pluck('engine')->unique()->all())->toBe(['InnoDB'])
        ->and($timestamps->all())->toBe([]);
});

it('B: every table has the ADR column count', function () {
    foreach (IDENTITY_TABLES as $table => $count) {
        expect(identityColumns($table))->toHaveCount($count, $table);
    }
});

it('B: users has its columns in order, with the ADR types and collations', function () {
    $enumAscii = fn (string $values) => ["enum({$values})", 'ascii_bin', 'NO'];

    expect(identityColumns('users'))->toBe([
        'id' => ['bigint unsigned', null, 'NO'],
        'name' => ['varchar(255)', 'utf8mb4_es_0900_ai_ci', 'NO'],
        'email' => ['varchar(255)', 'utf8mb4_0900_as_ci', 'NO'],
        'email_verified_at' => ['datetime(3)', null, 'YES'],
        'password' => ['varchar(255)', 'utf8mb4_es_0900_ai_ci', 'NO'],
        'role' => $enumAscii("'admin','student'"),
        'status' => $enumAscii("'active','disabled','deleting'"),
        'privacy_version' => ['varchar(32)', 'ascii_bin', 'YES'],
        'privacy_accepted_at' => ['datetime(3)', null, 'YES'],
        'remember_token' => ['varchar(100)', 'utf8mb4_es_0900_ai_ci', 'YES'],
        'created_at' => ['datetime(3)', null, 'NO'],
        'updated_at' => ['datetime(3)', null, 'NO'],
    ]);
});

it('B: invitations has its columns with the ADR types and collations', function () {
    expect(identityColumns('invitations'))->toBe([
        'id' => ['bigint unsigned', null, 'NO'],
        'email' => ['varchar(255)', 'utf8mb4_0900_as_ci', 'NO'],
        'role' => ["enum('admin','student')", 'ascii_bin', 'NO'],
        'delivery' => ["enum('email','link')", 'ascii_bin', 'NO'],
        'token_hash' => ['char(64)', 'ascii_bin', 'NO'],
        'invited_by' => ['bigint unsigned', null, 'YES'],
        'expires_at' => ['datetime(3)', null, 'NO'],
        'sent_at' => ['datetime(3)', null, 'YES'],
        'send_failed_at' => ['datetime(3)', null, 'YES'],
        'created_at' => ['datetime(3)', null, 'NO'],
        'updated_at' => ['datetime(3)', null, 'NO'],
    ]);
});

it('B: the broker, session, cache and failed-job tables have the ADR types and collations', function () {
    expect(identityColumns('password_reset_tokens'))->toBe([
        'email' => ['varchar(255)', 'utf8mb4_0900_as_ci', 'NO'],
        'token' => ['varchar(255)', 'utf8mb4_es_0900_ai_ci', 'NO'],
        'created_at' => ['datetime(3)', null, 'YES'],
    ])->and(identityColumns('sessions'))->toBe([
        'id' => ['varchar(255)', 'ascii_bin', 'NO'],
        'user_id' => ['bigint unsigned', null, 'YES'],
        'ip_address' => ['varchar(45)', 'ascii_bin', 'YES'],
        'user_agent' => ['text', 'utf8mb4_es_0900_ai_ci', 'YES'],
        'payload' => ['longtext', 'utf8mb4_es_0900_ai_ci', 'NO'],
        'last_activity' => ['int unsigned', null, 'NO'],
    ])->and(identityColumns('cache'))->toBe([
        'key' => ['varchar(255)', 'utf8mb4_0900_bin', 'NO'],
        'value' => ['mediumtext', 'utf8mb4_es_0900_ai_ci', 'NO'],
        'expiration' => ['bigint', null, 'NO'],
    ])->and(identityColumns('cache_locks'))->toBe([
        'key' => ['varchar(255)', 'utf8mb4_0900_bin', 'NO'],
        'owner' => ['varchar(255)', 'utf8mb4_es_0900_ai_ci', 'NO'],
        'expiration' => ['bigint', null, 'NO'],
    ])->and(array_keys(identityColumns('failed_jobs')))->toBe(['id', 'uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at'])
        ->and(identityColumns('failed_jobs')['failed_at'])->toBe(['datetime(3)', null, 'NO']);
});

it('B: failed_jobs.failed_at defaults to the current instant', function () {
    $default = DB::selectOne("select column_default as d from information_schema.columns where table_schema = database() and table_name = 'failed_jobs' and column_name = 'failed_at'");

    expect(strtolower((string) $default->d))->toBe('current_timestamp(3)');
});

it('B: the role and status columns default to student and active', function () {
    $defaults = collect(DB::select("select column_name as c, column_default as d from information_schema.columns where table_schema = database() and table_name = 'users' and column_name in ('role', 'status')"))->pluck('d', 'c');

    expect($defaults->all())->toBe(['role' => 'student', 'status' => 'active']);
});

it('C: unique keys and indexes carry the ADR names', function () {
    $indexes = fn (string $table, int $nonUnique) => identityScalars("select distinct index_name as v from information_schema.statistics where table_schema = database() and table_name = ? and non_unique = {$nonUnique} and index_name <> 'PRIMARY'", [$table]);

    expect($indexes('users', 0))->toBe(['users_email_unique'])
        ->and($indexes('users', 1))->toBe(['users_role_status_index'])
        ->and($indexes('invitations', 0))->toBe(['invitations_email_unique', 'invitations_token_hash_unique'])
        ->and($indexes('invitations', 1))->toBe(['invitations_expires_at_index', 'invitations_invited_by_index'])
        ->and($indexes('password_reset_tokens', 1))->toBe([])
        ->and($indexes('sessions', 1))->toBe(['sessions_last_activity_index', 'sessions_user_id_index'])
        ->and($indexes('cache', 1))->toBe(['cache_expiration_index'])
        ->and($indexes('cache_locks', 1))->toBe(['cache_locks_expiration_index']);
});

it('C: the primary keys are email, id or key as the ADR says', function () {
    $primary = fn (string $table) => identityScalars("select column_name as v from information_schema.statistics where table_schema = database() and table_name = ? and index_name = 'PRIMARY'", [$table]);

    expect($primary('password_reset_tokens'))->toBe(['email'])
        ->and($primary('sessions'))->toBe(['id'])
        ->and($primary('cache'))->toBe(['key'])
        ->and($primary('cache_locks'))->toBe(['key']);
});

it('D: sessions cascade on user delete and invitations null the inviter, both restricting key changes', function () {
    $rules = collect(DB::select(
        "select constraint_name as name, delete_rule as on_delete, update_rule as on_update from information_schema.referential_constraints where constraint_schema = database() and table_name in ('sessions', 'invitations')",
    ))->mapWithKeys(fn (object $row) => [$row->name => [$row->on_delete, $row->on_update]])->sortKeys()->all();

    expect($rules)->toBe([
        'invitations_invited_by_foreign' => ['SET NULL', 'RESTRICT'],
        'sessions_user_id_foreign' => ['CASCADE', 'RESTRICT'],
    ]);
});

it('E: the three CHECK constraints exist by name and are enforced', function () {
    $found = collect(DB::select("select constraint_name as name, enforced as enforced from information_schema.table_constraints where table_schema = database() and constraint_type = 'CHECK' and table_name in ('users', 'invitations')"));

    expect($found->pluck('name')->sort()->values()->all())->toBe(['invitations_expiry_check', 'invitations_token_hash_check', 'users_privacy_check'])
        ->and($found->pluck('enforced')->unique()->all())->toBe(['YES']);
});

function insertInvitation(array $overrides = []): void
{
    DB::table('invitations')->insert($overrides + [
        'email' => 'ana@example.com', 'role' => 'student', 'delivery' => 'link', 'token_hash' => str_repeat('a', 64),
        'expires_at' => '2026-10-12 00:00:00.000', 'created_at' => '2026-10-05 00:00:00.000', 'updated_at' => '2026-10-05 00:00:00.000',
    ]);
}

it('E: CHECK constraints reject a row that breaks their rule (error 3819)', function (Closure $insert) {
    try {
        $insert();
        $this->fail('expected the CHECK to reject the row');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(3819);
    }
})->with([
    'privacy version without its date' => [fn () => DB::table('users')->insert(['name' => 'Ana', 'email' => 'ana@example.com', 'password' => 'x', 'privacy_version' => 'v1', 'created_at' => '2026-10-05 00:00:00.000', 'updated_at' => '2026-10-05 00:00:00.000'])],
    'privacy date without its version' => [fn () => DB::table('users')->insert(['name' => 'Ana', 'email' => 'ana@example.com', 'password' => 'x', 'privacy_accepted_at' => '2026-10-05 00:00:00.000', 'created_at' => '2026-10-05 00:00:00.000', 'updated_at' => '2026-10-05 00:00:00.000'])],
    'uppercase token hash' => [fn () => insertInvitation(['token_hash' => str_repeat('A', 64)])],
    'non-hexadecimal token hash' => [fn () => insertInvitation(['token_hash' => str_repeat('g', 64)])],
    'expiry equal to creation' => [fn () => insertInvitation(['expires_at' => '2026-10-05 00:00:00.000'])],
]);

it('E: an invitation that satisfies every rule is accepted', function () {
    insertInvitation();

    expect(DB::table('invitations')->count())->toBe(1);
});

it('B: the email of an invitation ignores case but keeps accents apart', function () {
    insertInvitation(['email' => 'josé@example.com', 'token_hash' => str_repeat('b', 64)]);
    insertInvitation(['email' => 'jose@example.com', 'token_hash' => str_repeat('c', 64)]);

    try {
        insertInvitation(['email' => 'JOSÉ@example.com', 'token_hash' => str_repeat('d', 64)]);
        $this->fail('expected the unique email key to reject a case-only difference');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(1062);
    }
    expect(DB::table('invitations')->count())->toBe(2);
});

it('D: deleting a user deletes its sessions and nulls the inviter of its invitations', function () {
    $userId = DB::table('users')->insertGetId(['name' => 'Ana', 'email' => 'ana@example.com', 'password' => 'x', 'created_at' => '2026-10-05 00:00:00.000', 'updated_at' => '2026-10-05 00:00:00.000']);
    DB::table('sessions')->insert(['id' => 's1', 'user_id' => $userId, 'payload' => 'p', 'last_activity' => 1]);
    insertInvitation(['invited_by' => $userId]);

    DB::table('users')->where('id', $userId)->delete();

    expect(DB::table('sessions')->count())->toBe(0)
        ->and(DB::table('invitations')->value('invited_by'))->toBeNull();
});

it('B: cache keys compare in binary, so an accent or a capital makes a different key', function () {
    foreach (['a', 'á', 'A'] as $key) {
        DB::table('cache')->insert(['key' => $key, 'value' => 'v', 'expiration' => 1]);
    }

    expect(DB::table('cache')->count())->toBe(3);
});
