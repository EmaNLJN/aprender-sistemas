<?php

namespace Tests\Support;

use App\Content\Portion;
use Closure;
use Illuminate\Support\Facades\DB;

/** Lo que las pruebas de contenido miran de la base: conteos, checksums y las sentencias que se ejecutan. */
final class ContentDatabase
{
    /** Las 21 tablas de contenido, en el orden de sus migraciones. */
    public const TABLES = [
        'languages', 'catalogs', 'content_imports', 'topics', 'workshops', 'exercises', 'exercise_grading_versions',
        'exercise_tests', 'exercise_hints', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises',
        'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks',
        'guide_modules', 'guide_steps', 'guide_step_resources',
    ];

    /** @return array<string, int> filas por tabla, activas o retiradas */
    public static function counts(): array
    {
        return array_combine(self::TABLES, array_map(fn (string $table) => DB::table($table)->count(), self::TABLES));
    }

    /**
     * El oráculo de «no cambió nada»: CHECKSUM TABLE de cada tabla (MySQL lo calcula sobre sus filas).
     *
     * @return array<string, int>
     */
    public static function checksums(): array
    {
        $rows = DB::select('checksum table '.implode(', ', array_map(fn (string $table) => "`{$table}`", self::TABLES)));

        return array_combine(self::TABLES, array_map(fn (object $row) => (int) $row->Checksum, $rows));
    }

    /**
     * Toda sentencia que ejecuta `$run`.
     *
     * @return list<string>
     */
    public static function queriesDuring(Closure $run): array
    {
        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });
        $run();

        return $queries;
    }

    /**
     * Las sentencias que escriben una tabla de contenido mientras corre `$run`. La caché y las
     * sesiones quedan afuera: el import precalienta la primera aunque no cambie nada.
     *
     * @return list<string>
     */
    public static function contentWritesDuring(Closure $run): array
    {
        $tables = implode('|', self::TABLES);

        return array_values(array_filter(
            self::queriesDuring($run),
            fn (string $sql) => preg_match("/^\\s*(insert\\s+into|update|delete\\s+from|replace\\s+into|truncate(\\s+table)?)\\s+`?({$tables})`?(?:[\\s(]|\$)/i", $sql) === 1,
        ));
    }

    /** La URL del recurso que sirve una porción. */
    public static function url(Portion $portion): string
    {
        return match ($portion->group()) {
            'lab', 'quests' => "/api/exercises?catalog={$portion->group()}&language={$portion->slice()}",
            'cores' => "/api/exercises?catalog=cores&domain={$portion->slice()}",
            'campaign' => "/api/worlds?language={$portion->slice()}",
            'workshops' => "/api/workshops?domain={$portion->slice()}",
            'atlas' => "/api/atlas?language={$portion->slice()}",
            'guide' => '/api/guide',
        };
    }
}
