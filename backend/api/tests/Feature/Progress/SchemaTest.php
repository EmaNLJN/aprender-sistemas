<?php

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// ADR 0006 §5.3 against information_schema; the expectations come from data-model.md section 2, not from the migrations.
const PROGRESS_TABLES = [
    'sync_operations' => ['user_id', 'operation_id', 'payload_sha256', 'status', 'reason', 'clock_offset_ms', 'received_at'],
    'drafts' => ['user_id', 'exercise_id', 'code', 'starter_hash', 'set_at', 'revision', 'created_at', 'updated_at'],
    'campaign_checkpoints' => ['user_id', 'world_id', 'passed', 'passed_at', 'last_answer', 'last_answer_set_at', 'revision', 'created_at', 'updated_at'],
    'workshop_progress' => [
        'user_id', 'workshop_id', 'language', 'code_sealed', 'prediction_correct', 'prediction_correct_at', 'answer', 'answer_set_at',
        'note', 'note_set_at', 'revision', 'created_at', 'updated_at',
    ],
    'workshop_observations' => ['user_id', 'workshop_id', 'language', 'objective_key', 'observed_at', 'legacy_position', 'revision', 'created_at'],
    'workshop_step_marks' => ['user_id', 'workshop_id', 'language', 'step_key', 'marked', 'set_at', 'legacy_position', 'revision', 'created_at', 'updated_at'],
    'route_marks' => ['user_id', 'kind', 'item_key', 'marked', 'set_at', 'legacy_position', 'revision', 'created_at', 'updated_at'],
    'route_quiz_answers' => ['user_id', 'step_id', 'answer', 'set_at', 'revision', 'created_at', 'updated_at'],
    'route_notes' => ['user_id', 'language', 'field', 'body', 'set_at', 'revision', 'created_at', 'updated_at'],
    'preferences' => [
        'user_id', 'route_language', 'route_language_set_at', 'focus_minutes', 'focus_minutes_set_at', 'lab_selected_rust', 'lab_selected_go',
        'lab_selected_rust_set_at', 'lab_selected_go_set_at', 'revision', 'created_at', 'updated_at',
    ],
];

/** Runs a query over the ten tables: `{tables}` stands for their `?` placeholders, bound to their names. */
function progressSchemaRows(string $sql): Collection
{
    $tables = array_keys(PROGRESS_TABLES);
    $placeholders = implode(',', array_fill(0, count($tables), '?'));

    return collect(DB::select(str_replace('{tables}', $placeholders, $sql), $tables));
}

function progressColumn(string $table, string $column): object
{
    return DB::selectOne(
        'select column_type as type, collation_name as collation_name from information_schema.columns where table_schema = database() and table_name = ? and column_name = ?',
        [$table, $column],
    );
}

it('A: creates the ten tables in InnoDB with the Spanish collation', function () {
    $tables = progressSchemaRows('select table_name as name, engine as engine, table_collation as collation_name from information_schema.tables where table_schema = database() and table_name in ({tables})');

    expect($tables->pluck('name')->sort()->values()->all())->toBe(collect(PROGRESS_TABLES)->keys()->sort()->values()->all())
        ->and($tables->pluck('engine')->unique()->all())->toBe(['InnoDB'])
        ->and($tables->pluck('collation_name')->unique()->all())->toBe(['utf8mb4_es_0900_ai_ci']);
});

it('B: every table has its columns in the ADR order, 91 in total', function () {
    $columns = progressSchemaRows('select table_name as t, column_name as c from information_schema.columns where table_schema = database() and table_name in ({tables}) order by table_name, ordinal_position')
        ->groupBy('t')
        ->map(fn (Collection $rows) => $rows->pluck('c')->all());

    expect($columns->only(array_keys(PROGRESS_TABLES))->sortKeys()->all())->toBe(collect(PROGRESS_TABLES)->sortKeys()->all())
        ->and($columns->flatten()->count())->toBe(91)
        ->and(collect(PROGRESS_TABLES)->map(fn (array $columns) => count($columns))->all())->toBe([
            'sync_operations' => 7, 'drafts' => 8, 'campaign_checkpoints' => 9, 'workshop_progress' => 13, 'workshop_observations' => 8,
            'workshop_step_marks' => 10, 'route_marks' => 9, 'route_quiz_answers' => 7, 'route_notes' => 8, 'preferences' => 12,
        ]);
});

it('C: the types and collations that matter', function () {
    $expected = [
        'sync_operations.operation_id' => ['binary(16)', null],
        'sync_operations.payload_sha256' => ['binary(32)', null],
        'sync_operations.status' => ["enum('applied','rejected')", 'ascii_bin'],
        'sync_operations.reason' => ['varchar(32)', 'ascii_bin'],
        'drafts.code' => ['mediumtext', 'utf8mb4_0900_bin'],
        'drafts.exercise_id' => ['varchar(64)', 'ascii_bin'],
        'drafts.starter_hash' => ['char(64)', 'ascii_bin'],
        'campaign_checkpoints.world_id' => ['varchar(64)', 'ascii_bin'],
        'workshop_progress.workshop_id' => ['varchar(64)', 'ascii_bin'],
        'workshop_progress.note' => ['text', 'utf8mb4_es_0900_ai_ci'],
        'workshop_observations.objective_key' => ['varchar(64)', 'ascii_bin'],
        'workshop_step_marks.step_key' => ['varchar(64)', 'ascii_bin'],
        'route_marks.kind' => ["enum('step','milestone','favorite')", 'ascii_bin'],
        'route_marks.item_key' => ['varchar(64)', 'ascii_bin'],
        'route_quiz_answers.step_id' => ['varchar(64)', 'ascii_bin'],
        'route_notes.language' => ["enum('rust','go')", 'ascii_bin'],
        'route_notes.field' => ["enum('learned','next')", 'ascii_bin'],
        'route_notes.body' => ['mediumtext', 'utf8mb4_es_0900_ai_ci'],
        'preferences.route_language' => ["enum('rust','go')", 'ascii_bin'],
        'preferences.lab_selected_rust' => ['varchar(64)', 'ascii_bin'],
        'preferences.lab_selected_go' => ['varchar(64)', 'ascii_bin'],
    ];
    $actual = [];
    foreach (array_keys($expected) as $path) {
        [$table, $column] = explode('.', $path);
        $info = progressColumn($table, $column);
        $actual[$path] = [$info->type, $info->collation_name];
    }

    expect($actual)->toBe($expected);
});

it('C: every instant column is datetime(3), 33 in all', function () {
    $instants = progressSchemaRows("select column_name as c, column_type as type from information_schema.columns where table_schema = database() and table_name in ({tables}) and column_name like '%\\_at'");

    expect($instants->count())->toBe(33)
        ->and($instants->pluck('type')->unique()->all())->toBe(['datetime(3)']);
});

it('D: primary keys and indexes by name and columns, and no UNIQUE besides the primary keys', function () {
    $indexes = progressSchemaRows('select table_name as t, index_name as i, non_unique as non_unique, group_concat(column_name order by seq_in_index) as cols from information_schema.statistics where table_schema = database() and table_name in ({tables}) group by table_name, index_name, non_unique')
        ->mapWithKeys(fn (object $row) => ["{$row->t}.{$row->i}" => [(int) $row->non_unique, $row->cols]])
        ->sortKeys()
        ->all();

    $primary = fn (string $columns) => [0, $columns];
    $expected = [
        'sync_operations.PRIMARY' => $primary('user_id,operation_id'),
        'drafts.PRIMARY' => $primary('user_id,exercise_id'),
        'campaign_checkpoints.PRIMARY' => $primary('user_id,world_id'),
        'workshop_progress.PRIMARY' => $primary('user_id,workshop_id,language'),
        'workshop_observations.PRIMARY' => $primary('user_id,workshop_id,language,objective_key'),
        'workshop_step_marks.PRIMARY' => $primary('user_id,workshop_id,language,step_key'),
        'route_marks.PRIMARY' => $primary('user_id,kind,item_key'),
        'route_quiz_answers.PRIMARY' => $primary('user_id,step_id'),
        'route_notes.PRIMARY' => $primary('user_id,language,field'),
        'preferences.PRIMARY' => $primary('user_id'),
        'sync_operations.sync_operations_received_at_index' => [1, 'received_at'],
        'drafts.drafts_user_id_revision_index' => [1, 'user_id,revision'],
        'drafts.drafts_exercise_id_index' => [1, 'exercise_id'],
        'campaign_checkpoints.campaign_checkpoints_world_id_passed_index' => [1, 'world_id,passed'],
        'workshop_progress.workshop_progress_workshop_id_index' => [1, 'workshop_id'],
        'workshop_observations.workshop_observations_workshop_id_objective_key_index' => [1, 'workshop_id,objective_key'],
        'workshop_step_marks.workshop_step_marks_workshop_id_step_key_index' => [1, 'workshop_id,step_key'],
        'route_quiz_answers.route_quiz_answers_step_id_index' => [1, 'step_id'],
        'preferences.preferences_lab_selected_rust_index' => [1, 'lab_selected_rust'],
        'preferences.preferences_lab_selected_go_index' => [1, 'lab_selected_go'],
    ];
    ksort($expected);

    // InnoDB adds an index for each foreign key whose columns no other index starts with; those are not part of the contract.
    $named = array_filter($indexes, fn (string $key) => in_array($key, array_keys($expected), true), ARRAY_FILTER_USE_KEY);
    $unique = array_keys(array_filter($indexes, fn (array $index, string $key) => $index[0] === 0 && ! str_ends_with($key, '.PRIMARY'), ARRAY_FILTER_USE_BOTH));

    expect($named)->toBe($expected)
        ->and($unique)->toBe([]);
});

it('E: the 18 foreign keys, their delete rule and ON UPDATE RESTRICT', function () {
    $foreignKeys = progressSchemaRows(
        'select k.table_name as t, k.constraint_name as name, r.delete_rule as delete_rule, r.update_rule as update_rule, k.referenced_table_name as ref,
                group_concat(k.column_name order by k.ordinal_position) as cols, group_concat(k.referenced_column_name order by k.ordinal_position) as ref_cols
         from information_schema.key_column_usage k
         join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name and r.table_name = k.table_name
         where k.table_schema = database() and k.table_name in ({tables}) and k.referenced_table_name is not null
         group by k.table_name, k.constraint_name, r.delete_rule, r.update_rule, k.referenced_table_name',
    );

    $actual = $foreignKeys->map(fn (object $fk) => "{$fk->t}({$fk->cols}) -> {$fk->ref}({$fk->ref_cols}) {$fk->delete_rule}/{$fk->update_rule}")->sort()->values()->all();
    $expected = [
        'sync_operations(user_id) -> users(id) CASCADE/RESTRICT',
        'drafts(user_id) -> users(id) CASCADE/RESTRICT',
        'campaign_checkpoints(user_id) -> users(id) CASCADE/RESTRICT',
        'workshop_progress(user_id) -> users(id) CASCADE/RESTRICT',
        'route_marks(user_id) -> users(id) CASCADE/RESTRICT',
        'route_quiz_answers(user_id) -> users(id) CASCADE/RESTRICT',
        'route_notes(user_id) -> users(id) CASCADE/RESTRICT',
        'preferences(user_id) -> users(id) CASCADE/RESTRICT',
        'workshop_observations(user_id,workshop_id,language) -> workshop_progress(user_id,workshop_id,language) CASCADE/RESTRICT',
        'workshop_step_marks(user_id,workshop_id,language) -> workshop_progress(user_id,workshop_id,language) CASCADE/RESTRICT',
        'drafts(exercise_id) -> exercises(id) RESTRICT/RESTRICT',
        'campaign_checkpoints(world_id) -> worlds(id) RESTRICT/RESTRICT',
        'workshop_progress(workshop_id) -> workshops(id) RESTRICT/RESTRICT',
        'workshop_observations(workshop_id,objective_key) -> workshop_objectives(workshop_id,objective_key) RESTRICT/RESTRICT',
        'workshop_step_marks(workshop_id,step_key) -> workshop_steps(workshop_id,step_key) RESTRICT/RESTRICT',
        'route_quiz_answers(step_id) -> guide_steps(id) RESTRICT/RESTRICT',
        'preferences(lab_selected_rust) -> exercises(id) RESTRICT/RESTRICT',
        'preferences(lab_selected_go) -> exercises(id) RESTRICT/RESTRICT',
    ];
    sort($expected);

    expect($actual)->toBe($expected);
});

it('F: exactly six CHECK constraints, none of them over a DATETIME column', function () {
    $checks = progressSchemaRows(
        'select t.table_name as t, t.constraint_name as name, c.check_clause as clause from information_schema.table_constraints t
         join information_schema.check_constraints c on c.constraint_schema = t.constraint_schema and c.constraint_name = t.constraint_name
         where t.table_schema = database() and t.constraint_type = \'CHECK\' and t.table_name in ({tables})',
    );

    expect($checks->pluck('name')->sort()->values()->all())->toBe([
        'campaign_checkpoints_passed_check', 'preferences_focus_minutes_check', 'route_marks_marked_check',
        'sync_operations_status_check', 'workshop_progress_flags_check', 'workshop_step_marks_marked_check',
    ]);

    $datetimeColumns = progressSchemaRows("select column_name as c from information_schema.columns where table_schema = database() and table_name in ({tables}) and data_type = 'datetime'")
        ->pluck('c')->unique();
    expect($datetimeColumns->isNotEmpty())->toBeTrue();
    foreach ($checks as $check) {
        foreach ($datetimeColumns as $column) {
            expect($check->clause)->not->toContain("`{$column}`");
        }
    }
});
