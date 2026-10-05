<?php

namespace App\Content;

/**
 * Las tablas de contenido que escribe `content:import` por filas, en orden de dependencias (cada
 * clave foránea apunta a una anterior), con las columnas de su clave primaria. Faltan dos, que el
 * importador escribe aparte: `content_imports` y `exercise_grading_versions`.
 */
final class ContentTables
{
    /** @var array<string, list<string>> */
    public const KEYS = [
        'languages' => ['code'],
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

    /** Sin ciclo de vida: no se retiran (ADR 0006 §5.1). */
    public const WITHOUT_LIFECYCLE = ['languages'];

    /**
     * Las tablas cuya `position` no es parte de la clave: al retirarse una fila, queda en NULL
     * (`<tabla>_position_check`: sólo lo activo tiene posición).
     */
    public const NULL_POSITION_WHEN_RETIRED = [
        'workshops', 'exercises', 'exercise_tests', 'workshop_objectives', 'workshop_steps',
        'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts',
        'guide_resources', 'guide_modules', 'guide_steps', 'guide_step_resources',
    ];

    /** @param array<string, mixed> $row */
    public static function keyOf(string $table, array $row): string
    {
        return implode("\x1f", array_map(fn (string $column) => (string) $row[$column], self::KEYS[$table]));
    }
}
