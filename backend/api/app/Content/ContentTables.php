<?php

namespace App\Content;

use LogicException;

/**
 * The content tables that `content:import` writes row by row, in dependency order (each foreign
 * key points to an earlier one), with the columns of their primary key. Two are written
 * separately by the importer: `content_imports` and `exercise_grading_versions`.
 */
final class ContentTables
{
    /** @var array<string, non-empty-list<non-empty-string>> */
    public const KEYS = [
        'languages' => ['code'],
        'harness_templates' => ['language'],
        'catalogs' => ['code'],
        'topics' => ['language', 'topic_key'],
        'workshops' => ['id'],
        'exercises' => ['id'],
        'exercise_tests' => ['exercise_id', 'test_key'],
        'exercise_hints' => ['exercise_id', 'position'],
        'workshop_objectives' => ['workshop_id', 'objective_key'],
        'workshop_steps' => ['workshop_id', 'step_key'],
        'workshop_related_exercises' => ['workshop_id', 'exercise_id'],
        'worlds' => ['id'],
        'world_exercises' => ['world_id', 'exercise_id'],
        'atlas_concepts' => ['id'],
        'guide_resources' => ['id'],
        'guide_sources' => ['position'],
        'guide_tracks' => ['language'],
        'guide_modules' => ['id'],
        'guide_steps' => ['id'],
        'guide_step_resources' => ['step_id', 'resource_id'],
    ];

    /** Never retired: no lifecycle (ADR 0006 §5.1). */
    public const WITHOUT_LIFECYCLE = ['languages', 'harness_templates'];

    /**
     * Tables whose `position` is not part of the key: a retired row has it NULL
     * (`<table>_position_check`: only active rows have a position).
     */
    public const NULL_POSITION_WHEN_RETIRED = [
        'workshops', 'exercises', 'exercise_tests', 'workshop_objectives', 'workshop_steps',
        'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts',
        'guide_resources', 'guide_modules', 'guide_steps', 'guide_step_resources',
    ];

    /** @param array<string, mixed> $row */
    public static function keyOf(string $table, array $row): string
    {
        return collect(self::KEYS[$table])->map(function (string $column) use ($table, $row): string {
            $value = $row[$column] ?? null;
            if (! is_int($value) && ! is_string($value)) {
                throw new LogicException("{$table}: la columna {$column} de la clave no es un texto ni un entero");
            }

            return (string) $value;
        })->implode("\x1f");
    }
}
