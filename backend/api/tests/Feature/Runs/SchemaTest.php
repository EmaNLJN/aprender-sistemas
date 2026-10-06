<?php

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\AssertionFailedError;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

// ADR 0006 §5.3 and §5.4 against information_schema; the expectations come from data-model.md section 6, not from the migrations.
const RUN_TABLES = [
    'harness_templates' => ['language', 'template'],
    'progress_heads' => ['user_id', 'epoch', 'revision', 'reset_at', 'last_activity_at', 'created_at', 'updated_at'],
    'attempts' => [
        'id', 'user_id', 'exercise_id', 'epoch', 'legacy', 'outcome', 'reason', 'grading_hash', 'code_sha256', 'custom_outcome',
        'output_truncated', 'executor_phase', 'exit_code', 'compile_ms', 'run_ms', 'attempted_at', 'started_at', 'finished_at',
        'counted', 'created_at',
    ],
    'attempt_tests' => ['attempt_id', 'test_key', 'exercise_id', 'position', 'outcome'],
    'attempt_payloads' => ['attempt_id', 'code', 'custom_test', 'stdout', 'stderr', 'created_at'],
    'runs' => [
        'id', 'user_id', 'client_run_id', 'exercise_id', 'language', 'epoch', 'grading_hash', 'expected_tests', 'nonce', 'code',
        'custom_test', 'program', 'status', 'reason', 'executor_phase', 'exit_code', 'truncated', 'compile_ms', 'run_ms', 'stdout',
        'stderr', 'attempt_id', 'cancel_requested_at', 'created_at', 'started_at', 'finished_at', 'expires_at',
    ],
    'exercise_progress' => [
        'user_id', 'exercise_id', 'solved_at', 'server_solved_at', 'proof_attempt_id', 'proof_at', 'last_attempt_id', 'last_attempt_at',
        'attempt_count', 'prediction_answer', 'prediction_answer_set_at', 'prediction_correct', 'prediction_correct_at', 'assisted',
        'solution_seen', 'hints_revealed', 'legacy_attempts', 'reflection', 'reflection_set_at', 'custom_test', 'custom_test_set_at',
        'confidence', 'reviewed_at', 'review_due_at', 'review_set_at', 'revision', 'created_at', 'updated_at',
    ],
];

/** Runs a query over the run tables: `{tables}` stands for their `?` placeholders, bound to their names. */
function runSchemaRows(string $sql): Collection
{
    $tables = array_keys(RUN_TABLES);
    $placeholders = implode(',', array_fill(0, count($tables), '?'));

    return collect(DB::select(str_replace('{tables}', $placeholders, $sql), $tables));
}

function runColumn(string $table, string $column): object
{
    return DB::selectOne(
        'select column_type as type, collation_name as collation_name, extra as extra, column_default as column_default, generation_expression as generation_expression from information_schema.columns where table_schema = database() and table_name = ? and column_name = ?',
        [$table, $column],
    );
}

it('A: creates the seven tables in InnoDB with the Spanish collation', function () {
    $tables = runSchemaRows('select table_name as name, engine as engine, table_collation as collation_name from information_schema.tables where table_schema = database() and table_name in ({tables})');

    expect($tables->pluck('name')->sort()->values()->all())->toBe(collect(RUN_TABLES)->keys()->sort()->values()->all())
        ->and($tables->pluck('engine')->unique()->all())->toBe(['InnoDB'])
        ->and($tables->pluck('collation_name')->unique()->all())->toBe(['utf8mb4_es_0900_ai_ci']);
});

it('B: every table has its columns in the ADR order, 95 in total', function () {
    $columns = runSchemaRows('select table_name as t, column_name as c from information_schema.columns where table_schema = database() and table_name in ({tables}) order by table_name, ordinal_position')
        ->groupBy('t')
        ->map(fn (Collection $rows) => $rows->pluck('c')->all());

    expect($columns->only(array_keys(RUN_TABLES))->sortKeys()->all())->toBe(collect(RUN_TABLES)->sortKeys()->all())
        ->and($columns->flatten()->count())->toBe(95)
        ->and(collect(RUN_TABLES)->map(fn (array $columns) => count($columns))->all())->toBe([
            'harness_templates' => 2, 'progress_heads' => 7, 'attempts' => 20, 'attempt_tests' => 5, 'attempt_payloads' => 6, 'runs' => 27, 'exercise_progress' => 28,
        ]);
});

it('C: the types and collations that matter', function () {
    $expected = [
        'runs.id' => ['char(36)', 'ascii_bin'],
        'runs.code' => ['mediumtext', 'utf8mb4_0900_bin'],
        'runs.stdout' => ['mediumtext', 'utf8mb4_0900_bin'],
        'runs.stderr' => ['mediumtext', 'utf8mb4_0900_bin'],
        'runs.program' => ['mediumtext', 'utf8mb4_0900_bin'],
        'attempt_payloads.code' => ['mediumtext', 'utf8mb4_0900_bin'],
        'attempt_payloads.stdout' => ['text', 'utf8mb4_0900_bin'],
    ];
    $actual = [];
    foreach (array_keys($expected) as $path) {
        [$table, $column] = explode('.', $path);
        $info = runColumn($table, $column);
        $actual[$path] = [$info->type, $info->collation_name];
    }

    expect($actual)->toBe($expected);
});

it('C: runs.status lists the nine states in the ADR order and defaults to queued', function () {
    $status = runColumn('runs', 'status');

    expect($status->type)->toBe("enum('queued','running','passed','failed','compile_error','runtime_error','timeout','infra_error','canceled')")
        ->and($status->column_default)->toBe('queued');
});

it('C: attempts.outcome has eight values with legacy_error last', function () {
    expect(runColumn('attempts', 'outcome')->type)
        ->toBe("enum('passed','failed','compile_error','runtime_error','timeout','infra_error','canceled','legacy_error')");
});

it('C: attempts.counted is a virtual column over legacy and the five outcomes that count', function () {
    $counted = runColumn('attempts', 'counted');

    expect($counted->extra)->toBe('VIRTUAL GENERATED');
    foreach (['legacy', 'passed', 'failed', 'compile_error', 'runtime_error', 'timeout'] as $name) {
        expect($counted->generation_expression)->toContain($name);
    }
    foreach (['infra_error', 'canceled', 'legacy_error'] as $name) {
        expect($counted->generation_expression)->not->toContain($name);
    }
});

it('C: every instant column is datetime(3)', function () {
    $instants = runSchemaRows("select table_name as t, column_name as c, column_type as type from information_schema.columns where table_schema = database() and table_name in ({tables}) and column_name like '%\\_at'");

    expect($instants->count())->toBe(27)
        ->and($instants->pluck('type')->unique()->all())->toBe(['datetime(3)']);
});

it('D: primary keys and indexes by name and columns', function () {
    $indexes = runSchemaRows('select table_name as t, index_name as i, non_unique as non_unique, group_concat(column_name order by seq_in_index) as cols from information_schema.statistics where table_schema = database() and table_name in ({tables}) group by table_name, index_name, non_unique')
        ->mapWithKeys(fn (object $row) => ["{$row->t}.{$row->i}" => [(int) $row->non_unique, $row->cols]])
        ->sortKeys()
        ->all();

    $primary = fn (string $columns) => [0, $columns];
    $expected = [
        'harness_templates.PRIMARY' => $primary('language'),
        'progress_heads.PRIMARY' => $primary('user_id'),
        'attempts.PRIMARY' => $primary('id'),
        'attempt_tests.PRIMARY' => $primary('attempt_id,test_key'),
        'attempt_payloads.PRIMARY' => $primary('attempt_id'),
        'runs.PRIMARY' => $primary('id'),
        'exercise_progress.PRIMARY' => $primary('user_id,exercise_id'),
        'runs.runs_user_id_client_run_id_unique' => [0, 'user_id,client_run_id'],
        'runs.runs_attempt_id_unique' => [0, 'attempt_id'],
        'runs.runs_user_id_created_at_index' => [1, 'user_id,created_at'],
        'runs.runs_status_created_at_index' => [1, 'status,created_at'],
        'runs.runs_exercise_id_index' => [1, 'exercise_id'],
        'attempts.attempts_user_id_exercise_id_attempted_at_index' => [1, 'user_id,exercise_id,attempted_at'],
        'attempts.attempts_exercise_id_attempted_at_outcome_index' => [1, 'exercise_id,attempted_at,outcome'],
        'attempt_tests.attempt_tests_exercise_id_test_key_outcome_index' => [1, 'exercise_id,test_key,outcome'],
        'attempt_payloads.attempt_payloads_created_at_index' => [1, 'created_at'],
        'exercise_progress.exercise_progress_exercise_id_solved_at_index' => [1, 'exercise_id,solved_at'],
        'exercise_progress.exercise_progress_user_id_revision_index' => [1, 'user_id,revision'],
    ];
    ksort($expected);

    // InnoDB adds an index for each foreign key whose columns no other index starts with; those are not part of the contract.
    $named = array_filter($indexes, fn (string $key) => in_array($key, array_keys($expected), true), ARRAY_FILTER_USE_KEY);
    expect($named)->toBe($expected);
});

it('E: foreign keys, their delete rule and the absence of pointer foreign keys', function () {
    $foreignKeys = runSchemaRows(
        'select k.table_name as t, k.constraint_name as name, r.delete_rule as delete_rule, r.update_rule as update_rule, k.referenced_table_name as ref,
                group_concat(k.column_name order by k.ordinal_position) as cols, group_concat(k.referenced_column_name order by k.ordinal_position) as ref_cols
         from information_schema.key_column_usage k
         join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name and r.table_name = k.table_name
         where k.table_schema = database() and k.table_name in ({tables}) and k.referenced_table_name is not null
         group by k.table_name, k.constraint_name, r.delete_rule, r.update_rule, k.referenced_table_name',
    );

    $actual = $foreignKeys->map(fn (object $fk) => "{$fk->t}({$fk->cols}) -> {$fk->ref}({$fk->ref_cols}) {$fk->delete_rule}/{$fk->update_rule}")->sort()->values()->all();
    $expected = [
        'progress_heads(user_id) -> users(id) CASCADE/RESTRICT',
        'exercise_progress(user_id) -> users(id) CASCADE/RESTRICT',
        'attempts(user_id) -> users(id) CASCADE/RESTRICT',
        'runs(user_id) -> users(id) CASCADE/RESTRICT',
        'exercise_progress(exercise_id) -> exercises(id) RESTRICT/RESTRICT',
        'attempts(exercise_id) -> exercises(id) RESTRICT/RESTRICT',
        'runs(exercise_id) -> exercises(id) RESTRICT/RESTRICT',
        'runs(attempt_id) -> attempts(id) CASCADE/RESTRICT',
        'attempt_tests(attempt_id) -> attempts(id) CASCADE/RESTRICT',
        'attempt_payloads(attempt_id) -> attempts(id) CASCADE/RESTRICT',
        'attempt_tests(exercise_id,test_key) -> exercise_tests(exercise_id,test_key) RESTRICT/RESTRICT',
        'harness_templates(language) -> languages(code) RESTRICT/RESTRICT',
    ];
    sort($expected);

    expect($actual)->toBe($expected);
});

it('F: the CHECK constraints of each table, none of them over a DATETIME column', function () {
    $checks = runSchemaRows(
        'select t.table_name as t, t.constraint_name as name, c.check_clause as clause from information_schema.table_constraints t
         join information_schema.check_constraints c on c.constraint_schema = t.constraint_schema and c.constraint_name = t.constraint_name
         where t.table_schema = database() and t.constraint_type = \'CHECK\' and t.table_name in ({tables})',
    );

    expect($checks->pluck('name')->sort()->values()->all())->toBe([
        'attempts_code_sha256_check', 'attempts_grading_hash_check', 'exercise_progress_flags_check', 'runs_client_run_id_check',
    ]);

    $datetimeColumns = runSchemaRows("select column_name as c from information_schema.columns where table_schema = database() and table_name in ({tables}) and data_type = 'datetime'")
        ->pluck('c')->unique();
    foreach ($checks as $check) {
        foreach ($datetimeColumns as $column) {
            expect($check->clause)->not->toContain("`{$column}`");
        }
    }
});

function plantAttempt(User $user, string $exerciseId = 'rust-01', array $overrides = []): int
{
    return DB::table('attempts')->insertGetId([
        'user_id' => $user->id, 'exercise_id' => $exerciseId, 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed',
        'grading_hash' => str_repeat('a', 64), 'code_sha256' => str_repeat('b', 64), 'output_truncated' => 0,
        'attempted_at' => '2026-10-05 12:00:00.000', 'finished_at' => '2026-10-05 12:00:01.000', 'created_at' => '2026-10-05 12:00:01.000',
        ...$overrides,
    ]);
}

function plantProgress(User $user, string $exerciseId = 'rust-01', array $overrides = []): void
{
    DB::table('exercise_progress')->insert([
        'user_id' => $user->id, 'exercise_id' => $exerciseId, 'created_at' => '2026-10-05 12:00:01.000', 'updated_at' => '2026-10-05 12:00:01.000',
        ...$overrides,
    ]);
}

function plantHead(User $user, array $overrides = []): void
{
    DB::table('progress_heads')->insert(['user_id' => $user->id, 'created_at' => '2026-10-05 12:00:00.000', 'updated_at' => '2026-10-05 12:00:00.000', ...$overrides]);
}

it('G: deleting a user with the six tables populated leaves no rows and does not fail (FR-043)', function () {
    RunWorld::exercise();
    $user = RunWorld::user();
    $other = RunWorld::user();
    plantHead($user);
    plantHead($other);
    $attemptId = plantAttempt($user);
    plantAttempt($other);
    DB::table('attempt_tests')->insert(['attempt_id' => $attemptId, 'test_key' => 't1', 'exercise_id' => 'rust-01', 'position' => 1, 'outcome' => 'pass']);
    DB::table('attempt_payloads')->insert(['attempt_id' => $attemptId, 'code' => 'fn main() {}', 'stdout' => '', 'stderr' => '', 'created_at' => '2026-10-05 12:00:01.000']);
    plantProgress($user, 'rust-01', ['proof_attempt_id' => $attemptId]);
    RunWorld::run($user, ['status' => 'passed', 'attempt_id' => $attemptId, 'finished_at' => '2026-10-05 12:00:01.000', 'expires_at' => null]);

    DB::delete('delete from users where id = ?', [$user->id]);

    $leftBehind = [
        'progress_heads' => DB::table('progress_heads')->where('user_id', $user->id)->count(),
        'exercise_progress' => DB::table('exercise_progress')->where('user_id', $user->id)->count(),
        'attempts' => DB::table('attempts')->where('user_id', $user->id)->count(),
        'attempt_tests' => DB::table('attempt_tests')->where('attempt_id', $attemptId)->count(),
        'attempt_payloads' => DB::table('attempt_payloads')->where('attempt_id', $attemptId)->count(),
        'runs' => DB::table('runs')->where('user_id', $user->id)->count(),
    ];

    expect($leftBehind)->toBe(['progress_heads' => 0, 'exercise_progress' => 0, 'attempts' => 0, 'attempt_tests' => 0, 'attempt_payloads' => 0, 'runs' => 0])
        ->and(DB::table('progress_heads')->where('user_id', $other->id)->count())->toBe(1)
        ->and(DB::table('attempts')->where('user_id', $other->id)->count())->toBe(1);
});

it('H: crossedPointers finds a pointer to an attempt of another account or of another exercise, and nothing in clean data', function () {
    RunWorld::exercise('rust-01');
    RunWorld::exercise('rust-02');
    $owner = RunWorld::user();
    $stranger = RunWorld::user();
    $own = plantAttempt($owner, 'rust-01');
    plantProgress($owner, 'rust-01', ['proof_attempt_id' => $own, 'last_attempt_id' => $own]);

    expect(RunInvariants::crossedPointers())->toHaveCount(0);

    $foreign = plantAttempt($stranger, 'rust-01');
    DB::update('update exercise_progress set proof_attempt_id = ? where user_id = ?', [$foreign, $owner->id]);
    expect(RunInvariants::crossedPointers())->toHaveCount(1);

    DB::update('update exercise_progress set proof_attempt_id = ?, last_attempt_id = ? where user_id = ?', [$own, plantAttempt($owner, 'rust-02'), $owner->id]);
    expect(RunInvariants::crossedPointers())->toHaveCount(1);
});

it('RunInvariants passes on a clean world', function () {
    RunWorld::exercise();
    $user = RunWorld::user();
    plantHead($user);
    RunWorld::run($user);

    RunInvariants::assertClean();
    expect(RunInvariants::violations())->toBe([]);
});

it('RunInvariants names the rule that a planted violation breaks', function (Closure $plant, string $rule) {
    RunWorld::exercise();
    $user = RunWorld::user();
    plantHead($user, ['epoch' => 1, 'revision' => 5]);
    $plant($user);

    expect(array_keys(RunInvariants::violations()))->toBe([$rule]);
    expect(fn () => RunInvariants::assertClean())->toThrow(AssertionFailedError::class, $rule);
})->with([
    'an active run that already finished' => [
        fn (User $user) => RunWorld::run($user, ['finished_at' => '2026-10-05 12:00:01.000']),
        RunInvariants::ACTIVE_RUN_TIMES,
    ],
    'a finished run that still expires' => [
        fn (User $user) => RunWorld::run($user, ['status' => 'canceled', 'finished_at' => '2026-10-05 12:00:01.000', 'expires_at' => '2026-10-05 12:10:00.000', 'attempt_id' => plantAttempt($user, 'rust-01', ['outcome' => 'canceled'])]),
        RunInvariants::ACTIVE_RUN_TIMES,
    ],
    'a running run without started_at' => [
        fn (User $user) => RunWorld::run($user, ['status' => 'running']),
        RunInvariants::RUNNING_STARTED,
    ],
    'a terminal run that kept its program' => [
        fn (User $user) => RunWorld::run($user, ['status' => 'passed', 'finished_at' => '2026-10-05 12:00:01.000', 'expires_at' => null, 'program' => 'fn main() {}', 'attempt_id' => plantAttempt($user)]),
        RunInvariants::TERMINAL_RUN_CLOSED,
    ],
    'a terminal run without an attempt' => [
        fn (User $user) => RunWorld::run($user, ['status' => 'timeout', 'finished_at' => '2026-10-05 12:00:01.000', 'expires_at' => null]),
        RunInvariants::TERMINAL_RUN_CLOSED,
    ],
    'an active run with an attempt' => [
        fn (User $user) => RunWorld::run($user, ['attempt_id' => plantAttempt($user)]),
        RunInvariants::ACTIVE_RUN_HAS_NO_ATTEMPT,
    ],
    'an attempt_count that does not match the counted attempts of the epoch' => [
        function (User $user) {
            plantAttempt($user);
            plantAttempt($user, 'rust-01', ['outcome' => 'infra_error']);
            plantAttempt($user, 'rust-01', ['epoch' => 0]);
            plantProgress($user, 'rust-01', ['attempt_count' => 2, 'revision' => 5]);
        },
        RunInvariants::ATTEMPT_COUNT,
    ],
    'a progress row newer than the head of its account' => [
        fn (User $user) => plantProgress($user, 'rust-01', ['revision' => 6]),
        RunInvariants::PROGRESS_REVISION,
    ],
    'a progress row with attempts and revision 0' => [
        function (User $user) {
            plantAttempt($user);
            plantProgress($user, 'rust-01', ['attempt_count' => 1, 'revision' => 0]);
        },
        RunInvariants::PROGRESS_REVISION,
    ],
    'a proof_at that is not the attempted_at of its attempt' => [
        function (User $user) {
            $attemptId = plantAttempt($user);
            plantProgress($user, 'rust-01', ['proof_attempt_id' => $attemptId, 'proof_at' => '2026-10-05 13:00:00.000', 'attempt_count' => 1, 'revision' => 1]);
        },
        RunInvariants::POINTER_DATES,
    ],
    'a pointer that crosses accounts' => [
        function (User $user) {
            $stranger = RunWorld::user();
            plantProgress($user, 'rust-01', ['proof_attempt_id' => plantAttempt($stranger), 'proof_at' => '2026-10-05 12:00:00.000', 'attempt_count' => 0, 'revision' => 1]);
        },
        RunInvariants::CROSSED_POINTERS,
    ],
]);
