<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Tests\Support\ProgressWorld;
use Tests\Support\RunInvariants;

const IMPORT_TABLES = [
    'progress_imports' => ['id', 'user_id', 'import_id', 'source', 'raw_payload', 'raw_sha256', 'report', 'epoch', 'revision', 'imported_at'],
    'campaign_seals' => ['user_id', 'exercise_id', 'code', 'prediction', 'assisted', 'imported_at', 'revision'],
];

const IMPORT_USER_TABLES = [
    'sync_operations', 'exercise_progress', 'drafts', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations',
    'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences', 'progress_imports', 'campaign_seals',
    'progress_heads', 'attempts',
];

/** Runs a query over the two tables: `{tables}` stands for their `?` placeholders, bound to their names. */
function importSchemaRows(string $sql): Collection
{
    $tables = array_keys(IMPORT_TABLES);
    $placeholders = implode(',', array_fill(0, count($tables), '?'));

    return collect(DB::select(str_replace('{tables}', $placeholders, $sql), $tables));
}

function importColumn(string $table, string $column): object
{
    return DB::selectOne(
        'select column_type as type, collation_name as collation_name, is_nullable as nullable from information_schema.columns where table_schema = database() and table_name = ? and column_name = ?',
        [$table, $column],
    );
}

it('A: creates the two tables in InnoDB with the Spanish collation', function () {
    $tables = importSchemaRows('select table_name as name, engine as engine, table_collation as collation_name from information_schema.tables where table_schema = database() and table_name in ({tables})');

    expect($tables->pluck('name')->sort()->values()->all())->toBe(['campaign_seals', 'progress_imports'])
        ->and($tables->pluck('engine')->unique()->all())->toBe(['InnoDB'])
        ->and($tables->pluck('collation_name')->unique()->all())->toBe(['utf8mb4_es_0900_ai_ci']);
});

it('B: every table has its columns in the ADR order, 17 in total', function () {
    $columns = importSchemaRows('select table_name as t, column_name as c from information_schema.columns where table_schema = database() and table_name in ({tables}) order by table_name, ordinal_position')
        ->groupBy('t')
        ->map(fn (Collection $rows) => $rows->pluck('c')->all());

    expect($columns->sortKeys()->all())->toBe(collect(IMPORT_TABLES)->sortKeys()->all())
        ->and($columns->flatten()->count())->toBe(17)
        ->and(count(IMPORT_TABLES['progress_imports']))->toBe(10)
        ->and(count(IMPORT_TABLES['campaign_seals']))->toBe(7);
});

it('C: the types, collations and nullability that matter', function () {
    $expected = [
        'progress_imports.import_id' => ['char(36)', 'ascii_bin', 'NO'],
        'progress_imports.source' => ["enum('storage','export')", 'ascii_bin', 'NO'],
        'progress_imports.raw_payload' => ['mediumtext', 'utf8mb4_0900_bin', 'YES'],
        'progress_imports.raw_sha256' => ['char(64)', 'ascii_bin', 'NO'],
        'progress_imports.report' => ['mediumtext', 'utf8mb4_0900_bin', 'NO'],
        'progress_imports.epoch' => ['int unsigned', null, 'NO'],
        'progress_imports.revision' => ['bigint unsigned', null, 'NO'],
        'progress_imports.imported_at' => ['datetime(3)', null, 'NO'],
        'campaign_seals.exercise_id' => ['varchar(64)', 'ascii_bin', 'NO'],
        'campaign_seals.code' => ['tinyint(1)', null, 'NO'],
        'campaign_seals.prediction' => ['tinyint(1)', null, 'NO'],
        'campaign_seals.assisted' => ['tinyint(1)', null, 'NO'],
        'campaign_seals.imported_at' => ['datetime(3)', null, 'NO'],
        'campaign_seals.revision' => ['bigint unsigned', null, 'NO'],
    ];
    $actual = [];
    foreach (array_keys($expected) as $path) {
        [$table, $column] = explode('.', $path);
        $info = importColumn($table, $column);
        $actual[$path] = [$info->type, $info->collation_name, $info->nullable];
    }

    expect($actual)->toBe($expected);
});

it('D: primary keys and indexes by name and columns, and one UNIQUE besides the primary keys', function () {
    $indexes = importSchemaRows('select table_name as t, index_name as i, non_unique as non_unique, group_concat(column_name order by seq_in_index) as cols from information_schema.statistics where table_schema = database() and table_name in ({tables}) group by table_name, index_name, non_unique')
        ->mapWithKeys(fn (object $row) => ["{$row->t}.{$row->i}" => [(int) $row->non_unique, $row->cols]])
        ->sortKeys()
        ->all();

    $expected = [
        'progress_imports.PRIMARY' => [0, 'id'],
        'campaign_seals.PRIMARY' => [0, 'user_id,exercise_id'],
        'progress_imports.progress_imports_user_id_import_id_unique' => [0, 'user_id,import_id'],
        'progress_imports.progress_imports_raw_sha256_user_id_index' => [1, 'raw_sha256,user_id'],
        'campaign_seals.campaign_seals_exercise_id_index' => [1, 'exercise_id'],
    ];
    ksort($expected);
    $unique = array_keys(array_filter($indexes, fn (array $index, string $key) => $index[0] === 0 && ! str_ends_with($key, '.PRIMARY'), ARRAY_FILTER_USE_BOTH));

    expect($indexes)->toBe($expected)
        ->and($unique)->toBe(['progress_imports.progress_imports_user_id_import_id_unique']);
});

it('E: the three foreign keys, their delete rule and ON UPDATE RESTRICT', function () {
    $foreignKeys = importSchemaRows(
        'select k.table_name as t, r.delete_rule as delete_rule, r.update_rule as update_rule, k.referenced_table_name as ref,
                group_concat(k.column_name order by k.ordinal_position) as cols, group_concat(k.referenced_column_name order by k.ordinal_position) as ref_cols
         from information_schema.key_column_usage k
         join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name and r.table_name = k.table_name
         where k.table_schema = database() and k.table_name in ({tables}) and k.referenced_table_name is not null
         group by k.table_name, k.constraint_name, r.delete_rule, r.update_rule, k.referenced_table_name',
    );

    $actual = $foreignKeys->map(fn (object $fk) => "{$fk->t}({$fk->cols}) -> {$fk->ref}({$fk->ref_cols}) {$fk->delete_rule}/{$fk->update_rule}")->sort()->values()->all();
    $expected = [
        'progress_imports(user_id) -> users(id) CASCADE/RESTRICT',
        'campaign_seals(user_id) -> users(id) CASCADE/RESTRICT',
        'campaign_seals(exercise_id) -> exercises(id) RESTRICT/RESTRICT',
    ];
    sort($expected);

    expect($actual)->toBe($expected);
});

it('F: exactly three CHECK constraints, none of them over a DATETIME column, and they reject bad rows', function () {
    $checks = importSchemaRows(
        'select t.constraint_name as name, c.check_clause as clause from information_schema.table_constraints t
         join information_schema.check_constraints c on c.constraint_schema = t.constraint_schema and c.constraint_name = t.constraint_name
         where t.table_schema = database() and t.constraint_type = \'CHECK\' and t.table_name in ({tables})',
    );

    expect($checks->pluck('name')->sort()->values()->all())->toBe([
        'campaign_seals_flags_check', 'progress_imports_import_id_check', 'progress_imports_report_check',
    ]);

    $datetimeColumns = importSchemaRows("select column_name as c from information_schema.columns where table_schema = database() and table_name in ({tables}) and data_type = 'datetime'")
        ->pluck('c')->unique();
    expect($datetimeColumns->all())->toBe(['imported_at']);
    foreach ($checks as $check) {
        expect($check->clause)->not->toContain('`imported_at`');
    }

    ProgressWorld::seed(importReferenceWorld());
    $user = ProgressWorld::user();
    $import = fn (string $importId, string $report) => fn () => DB::table('progress_imports')->insert(importRow($user->id, ['import_id' => $importId, 'report' => $report]));

    expect($import('0123456789ab-cdef-0123-4567-89abcdef0123', '{}'))->toThrow(QueryException::class)
        ->and($import('01234567-89AB-CDEF-0123-456789ABCDEF', '{}'))->toThrow(QueryException::class)
        ->and($import('01234567-89ab-cdef-0123-456789abcdef', 'not json'))->toThrow(QueryException::class)
        ->and(fn () => DB::table('campaign_seals')->insert(['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'code' => 2, 'prediction' => 0, 'assisted' => 0, 'imported_at' => '2026-10-06 12:00:00.000']))
        ->toThrow(QueryException::class)
        ->and($import('01234567-89ab-cdef-0123-456789abcdef', '{"written":{}}'))->not->toThrow(QueryException::class);
});

function importReferenceWorld(): array
{
    return [
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'exercises' => [
            ['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3],
            ['id' => 'fx-go-01', 'language' => 'go', 'hints' => 3, 'predictionOptions' => 3],
        ],
        'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
        'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1'], 'steps' => ['e1']]],
        'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => []],
    ];
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function importRow(int $userId, array $overrides = []): array
{
    return [
        'user_id' => $userId, 'import_id' => '01234567-89ab-cdef-0123-456789abcdef', 'source' => 'storage', 'raw_payload' => '{"v":1}',
        'raw_sha256' => hash('sha256', '{"v":1}'), 'report' => '{"written":{}}', 'epoch' => 1, 'revision' => 1, 'imported_at' => '2026-10-06 12:00:00.000',
        ...$overrides,
    ];
}

/** @return list<int> the id of the legacy attempt that the account's progress points at */
function plantImportAccount(int $userId): array
{
    $at = ['revision' => 1, 'created_at' => '2026-10-06 12:00:00.000', 'updated_at' => '2026-10-06 12:00:00.000'];
    $attemptId = DB::table('attempts')->insertGetId([
        'user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'epoch' => 1, 'legacy' => 1, 'outcome' => 'legacy_error', 'code_sha256' => hash('sha256', 'fn main() {}'),
        'attempted_at' => '2026-10-06 12:00:00.000', 'finished_at' => '2026-10-06 12:00:00.000', 'created_at' => '2026-10-06 12:00:00.000',
    ]);
    DB::table('attempt_tests')->insert(['attempt_id' => $attemptId, 'test_key' => 't1', 'exercise_id' => 'fx-rust-01', 'position' => 1, 'outcome' => 'pass']);
    DB::table('attempt_payloads')->insert(['attempt_id' => $attemptId, 'code' => 'fn main() {}', 'stdout' => '', 'stderr' => '', 'created_at' => '2026-10-06 12:00:00.000']);
    DB::table('sync_operations')->insert(['user_id' => $userId, 'operation_id' => random_bytes(16), 'payload_sha256' => random_bytes(32), 'status' => 'applied', 'clock_offset_ms' => 0, 'received_at' => '2026-10-06 12:00:00.000']);
    DB::table('exercise_progress')->insert([
        'user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'proof_attempt_id' => $attemptId, 'proof_at' => '2026-10-06 12:00:00.000',
        'last_attempt_id' => $attemptId, 'last_attempt_at' => '2026-10-06 12:00:00.000', ...$at,
    ]);
    DB::table('drafts')->insert(['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'code' => 'fn main() {}', ...$at]);
    DB::table('campaign_checkpoints')->insert(['user_id' => $userId, 'world_id' => 'fx-world-1', ...$at]);
    DB::table('workshop_progress')->insert(['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', ...$at]);
    DB::table('workshop_observations')->insert(['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'objective_key' => 'fx-obj-1', 'revision' => 1, 'created_at' => $at['created_at']]);
    DB::table('workshop_step_marks')->insert(['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 1, ...$at]);
    DB::table('route_marks')->insert(['user_id' => $userId, 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, ...$at]);
    DB::table('route_quiz_answers')->insert(['user_id' => $userId, 'step_id' => 'fx-step-1', 'answer' => 1, ...$at]);
    DB::table('route_notes')->insert(['user_id' => $userId, 'language' => 'rust', 'field' => 'learned', 'body' => 'Aprendí', ...$at]);
    DB::table('preferences')->insert(['user_id' => $userId, 'lab_selected_rust' => 'fx-rust-01', 'lab_selected_go' => 'fx-go-01', ...$at]);
    DB::table('progress_imports')->insert(importRow($userId));
    DB::table('campaign_seals')->insert(['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'code' => 1, 'prediction' => 0, 'assisted' => 1, 'imported_at' => '2026-10-06 12:00:00.000', 'revision' => 1]);

    return [$attemptId];
}

it('G: deleting a user with the twelve tables of D1, the two of B2 and the attempts populated leaves no rows and does not fail (SC-009)', function () {
    ProgressWorld::seed(importReferenceWorld());
    $user = ProgressWorld::user();
    $other = ProgressWorld::user();
    $attempts = [];
    foreach ([$user, $other] as $account) {
        ProgressWorld::head($account, revision: 1);
        $attempts[$account->id] = plantImportAccount($account->id)[0];
    }

    DB::delete('delete from users where id = ?', [$user->id]);

    $countOf = fn (int $userId) => collect(IMPORT_USER_TABLES)->mapWithKeys(fn (string $table) => [$table => DB::table($table)->where('user_id', $userId)->count()])
        ->merge(collect(['attempt_tests', 'attempt_payloads'])->mapWithKeys(fn (string $table) => [$table => DB::table($table)->where('attempt_id', $attempts[$userId])->count()]))
        ->all();
    $tables = [...IMPORT_USER_TABLES, 'attempt_tests', 'attempt_payloads'];

    expect($countOf($user->id))->toBe(array_fill_keys($tables, 0))
        ->and($countOf($other->id))->toBe(array_fill_keys($tables, 1));
});

it('H: the pointers of exercise_progress do not cross with a legacy attempt and the new tables populated (FR-053)', function () {
    ProgressWorld::seed(importReferenceWorld());
    $user = ProgressWorld::user();
    ProgressWorld::head($user, revision: 1);
    plantImportAccount($user->id);

    expect(RunInvariants::crossedPointers())->toHaveCount(0);
});
