<?php

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// ADR 0006 §5.1 content schema against information_schema; the expectations come from the ADR, not from the migrations.
const CONTENT_TABLES = [
    'languages' => 2, 'catalogs' => 7, 'content_imports' => 7, 'topics' => 7, 'workshops' => 22, 'exercises' => 33,
    'exercise_grading_versions' => 4, 'exercise_tests' => 12, 'exercise_hints' => 7, 'workshop_objectives' => 10,
    'workshop_steps' => 13, 'workshop_related_exercises' => 7, 'worlds' => 18, 'world_exercises' => 8,
    'atlas_concepts' => 21, 'guide_resources' => 17, 'guide_sources' => 9, 'guide_tracks' => 8, 'guide_modules' => 10,
    'guide_steps' => 14, 'guide_step_resources' => 7,
];

function schemaRows(string $sql, array $bindings = []): Collection
{
    return collect(DB::select($sql, $bindings));
}

it('A: creates the 21 tables in InnoDB with the Spanish collation', function () {
    // MySQL 8+ uppercases information_schema column names unless aliased: without `as engine` there is no `engine` property.
    $tables = schemaRows(
        'select table_name as name, engine as engine, table_collation as collation_name from information_schema.tables where table_schema = database() and table_name in ('.implode(',', array_fill(0, 21, '?')).')',
        array_keys(CONTENT_TABLES),
    );

    expect($tables->pluck('name')->sort()->values()->all())->toBe(collect(array_keys(CONTENT_TABLES))->sort()->values()->all())
        ->and($tables->pluck('engine')->unique()->all())->toBe(['InnoDB'])
        ->and($tables->pluck('collation_name')->unique()->all())->toBe(['utf8mb4_es_0900_ai_ci']);
});

it('B: every table has its columns, with the ADR types for ID, hash, JSON, date and text', function () {
    $columns = schemaRows('select table_name as t, column_name as c, column_type as type, collation_name as collation_name from information_schema.columns where table_schema = database() and table_name in ('.implode(',', array_fill(0, 21, '?')).') order by table_name, ordinal_position', array_keys(CONTENT_TABLES));

    $counts = $columns->countBy('t')->all();
    ksort($counts);
    $expectedCounts = CONTENT_TABLES;
    ksort($expectedCounts);
    expect($counts)->toBe($expectedCounts);

    $mismatches = [];
    foreach ($columns as $column) {
        $expected = match (true) {
            str_ends_with($column->c, '_hash') => ['char(64)', 'ascii_bin'],
            str_ends_with($column->c, '_json') => ['longtext', 'utf8mb4_0900_bin'],
            $column->c === 'key_order' => ['varchar(1024)', 'ascii_bin'],
            in_array($column->c, ['created_at', 'updated_at', 'retired_at'], true) => ['datetime(3)', null],
            in_array($column->c, ['starter', 'solution'], true) => ['mediumtext', 'utf8mb4_0900_bin'],
            $column->c === 'expression', $column->t === 'atlas_concepts' && $column->c === 'code' => ['text', 'utf8mb4_0900_bin'],
            in_array("{$column->t}.{$column->c}", ['exercises.id', 'workshops.id', 'topics.topic_key', 'exercise_tests.test_key', 'workshop_steps.step_key', 'languages.code', 'catalogs.code'], true) => [null, 'ascii_bin'],
            "{$column->t}.{$column->c}" === 'exercises.title' => [null, 'utf8mb4_es_0900_ai_ci'],
            default => null,
        };
        if ($expected !== null) {
            $actual = [$expected[0] === null ? null : $column->type, $expected[1] === null ? null : $column->collation_name];
            if ($actual !== $expected) {
                $mismatches["{$column->t}.{$column->c}"] = $actual;
            }
        }
    }
    expect($mismatches)->toBe([]);
});

it('B: ENUM columns list their values in the ADR order', function () {
    $enums = schemaRows("select concat(table_name, '.', column_name) as path, column_type as type from information_schema.columns where table_schema = database() and data_type = 'enum' and table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES))
        ->pluck('type', 'path')->all();
    $levels = "enum('beginner','medium','advanced','expert')";
    $domains = "enum('lowlevel','infra','play','pc')";
    $lifecycle = "enum('active','deprecated')";
    $expected = [
        'workshops.domain' => $domains, 'workshops.category' => "enum('machine','infra','play')", 'workshops.level' => $levels,
        'exercises.domain' => $domains, 'exercises.level' => $levels, 'exercises.challenge_type' => "enum('repair','kata','boss')",
        'exercises.kind' => "enum('completar','reparar')",
        'exercises.visual' => "enum('flow','memory','ownership','collections','pointers','generics','concurrency')",
        'worlds.level' => $levels, 'atlas_concepts.level' => $levels, 'world_exercises.role' => "enum('training','challenge','boss')",
        'catalogs.slice_by' => "enum('language','domain')",
        'guide_resources.category' => "enum('ejercicios','lectura','proyectos','herramientas')", 'guide_resources.cost' => "enum('gratis','mixto')",
    ];
    foreach (['catalogs', 'topics', 'workshops', 'exercises', 'exercise_tests', 'exercise_hints', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'] as $table) {
        $expected["{$table}.status"] = $lifecycle;
    }

    ksort($expected);
    ksort($enums);
    expect($enums)->toBe($expected);
});

it('C: the primary key is the only unique index, and the indexes are the ADR ones', function () {
    $unique = schemaRows("select table_name as t, index_name as i from information_schema.statistics where table_schema = database() and non_unique = 0 and index_name <> 'PRIMARY' and table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES));
    $indexes = schemaRows("select distinct index_name as i from information_schema.statistics where table_schema = database() and index_name <> 'PRIMARY' and table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES))
        ->pluck('i')->sort()->values()->all();

    expect($unique)->toHaveCount(0)
        ->and($indexes)->toBe(collect([
            'workshops_domain_status_position_index', 'exercises_catalog_language_status_position_index',
            'exercises_catalog_domain_status_position_index', 'exercises_language_topic_key_index', 'exercises_workshop_id_language_index',
            'exercise_grading_versions_first_import_id_index', 'workshop_related_exercises_exercise_id_index',
            'worlds_language_status_position_index', 'world_exercises_exercise_id_index',
            'atlas_concepts_language_status_position_index', 'atlas_concepts_lab_exercise_id_index',
            'guide_resources_status_position_index', 'guide_modules_track_language_status_position_index',
            'guide_steps_module_id_status_position_index', 'guide_step_resources_resource_id_index',
        ])->sort()->values()->all());
});

it('D: the 22 foreign keys point where the ADR says and block deletes and key changes', function () {
    $foreign = schemaRows(
        "select k.constraint_name as name, concat(k.table_name, '(', group_concat(k.column_name order by k.ordinal_position), ') -> ', k.referenced_table_name, '(', group_concat(k.referenced_column_name order by k.ordinal_position), ')') as definition, any_value(r.delete_rule) as on_delete, any_value(r.update_rule) as on_update
         from information_schema.key_column_usage k join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
         where k.table_schema = database() and k.referenced_table_name is not null and k.table_name in (".implode(',', array_fill(0, 21, '?')).')
         group by k.constraint_name, k.table_name, k.referenced_table_name',
        array_keys(CONTENT_TABLES),
    );

    expect($foreign->pluck('definition', 'name')->sortKeys()->all())->toBe(collect([
        'topics_language_foreign' => 'topics(language) -> languages(code)',
        'exercises_catalog_foreign' => 'exercises(catalog) -> catalogs(code)',
        'exercises_language_topic_key_foreign' => 'exercises(language,topic_key) -> topics(language,topic_key)',
        'exercises_workshop_id_foreign' => 'exercises(workshop_id) -> workshops(id)',
        'exercise_grading_versions_exercise_id_foreign' => 'exercise_grading_versions(exercise_id) -> exercises(id)',
        'exercise_grading_versions_first_import_id_foreign' => 'exercise_grading_versions(first_import_id) -> content_imports(id)',
        'exercise_tests_exercise_id_foreign' => 'exercise_tests(exercise_id) -> exercises(id)',
        'exercise_hints_exercise_id_foreign' => 'exercise_hints(exercise_id) -> exercises(id)',
        'workshop_objectives_workshop_id_foreign' => 'workshop_objectives(workshop_id) -> workshops(id)',
        'workshop_steps_workshop_id_foreign' => 'workshop_steps(workshop_id) -> workshops(id)',
        'workshop_related_exercises_workshop_id_foreign' => 'workshop_related_exercises(workshop_id) -> workshops(id)',
        'workshop_related_exercises_exercise_id_foreign' => 'workshop_related_exercises(exercise_id) -> exercises(id)',
        'worlds_language_foreign' => 'worlds(language) -> languages(code)',
        'world_exercises_world_id_foreign' => 'world_exercises(world_id) -> worlds(id)',
        'world_exercises_exercise_id_foreign' => 'world_exercises(exercise_id) -> exercises(id)',
        'atlas_concepts_language_foreign' => 'atlas_concepts(language) -> languages(code)',
        'atlas_concepts_lab_exercise_id_foreign' => 'atlas_concepts(lab_exercise_id) -> exercises(id)',
        'guide_tracks_language_foreign' => 'guide_tracks(language) -> languages(code)',
        'guide_modules_track_language_foreign' => 'guide_modules(track_language) -> guide_tracks(language)',
        'guide_steps_module_id_foreign' => 'guide_steps(module_id) -> guide_modules(id)',
        'guide_step_resources_step_id_foreign' => 'guide_step_resources(step_id) -> guide_steps(id)',
        'guide_step_resources_resource_id_foreign' => 'guide_step_resources(resource_id) -> guide_resources(id)',
    ])->sortKeys()->all())
        ->and($foreign->pluck('on_delete')->unique()->all())->toBe(['RESTRICT'])
        ->and($foreign->pluck('on_update')->unique()->all())->toBe(['RESTRICT']);
});

it('E: CHECK constraints exist by name and are enforced', function () {
    $lifecycle = ['catalogs', 'topics', 'workshops', 'exercises', 'exercise_tests', 'exercise_hints', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'];
    $position = ['workshops', 'exercises', 'exercise_tests', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_modules', 'guide_steps', 'guide_step_resources'];
    $json = ['workshops', 'exercises', 'exercise_tests', 'workshop_objectives', 'workshop_steps', 'worlds', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps'];
    $expected = [
        ...array_map(fn (string $table) => "{$table}_lifecycle_check", $lifecycle),
        ...array_map(fn (string $table) => "{$table}_position_check", $position),
        ...array_map(fn (string $table) => "{$table}_json_check", $json),
        'catalogs_chain_position_check', 'catalogs_chain_lifecycle_check', 'content_imports_document_hash_check',
        'content_imports_source_commit_check', 'workshops_minutes_check', 'exercises_numbers_check', 'exercises_hashes_check',
        'exercise_grading_versions_hash_check', 'guide_resources_featured_check', 'guide_steps_minutes_check',
    ];
    $found = schemaRows("select c.constraint_name as name, c.enforced as enforced from information_schema.table_constraints c where c.table_schema = database() and c.constraint_type = 'CHECK' and c.table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES));

    expect($found->pluck('name')->sort()->values()->all())->toBe(collect($expected)->sort()->values()->all())
        ->and($found->pluck('enforced')->unique()->all())->toBe(['YES']);
});
