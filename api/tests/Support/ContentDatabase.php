<?php

namespace Tests\Support;

use App\Content\Portion;
use Closure;
use Illuminate\Support\Facades\DB;

final class ContentDatabase
{
    /** The 21 content tables, in migration order (parents before children). */
    public const TABLES = [
        'languages', 'catalogs', 'content_imports', 'topics', 'workshops', 'exercises', 'exercise_grading_versions',
        'exercise_tests', 'exercise_hints', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises',
        'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks',
        'guide_modules', 'guide_steps', 'guide_step_resources',
    ];

    /** @return array<string, int> rows per table, active or retired */
    public static function counts(): array
    {
        return array_combine(self::TABLES, array_map(fn (string $table) => DB::table($table)->count(), self::TABLES));
    }

    /**
     * CHECKSUM TABLE of every content table: the "nothing changed" oracle.
     *
     * @return array<string, int>
     */
    public static function checksums(): array
    {
        $rows = DB::select('checksum table '.implode(', ', array_map(fn (string $table) => "`{$table}`", self::TABLES)));

        return array_combine(self::TABLES, array_map(fn (object $row) => (int) $row->Checksum, $rows));
    }

    /** @return list<string> */
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
     * Statements that write a content table while `$run` runs. The cache and sessions are excluded:
     * the import warms the cache even when nothing changes.
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
