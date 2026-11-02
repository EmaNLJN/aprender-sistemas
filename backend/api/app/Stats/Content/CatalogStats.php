<?php

namespace App\Stats\Content;

use App\Content\Record\RowFields;
use App\Stats\Median;
use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class CatalogStats
{
    private const CATALOGS_SQL = <<<'SQL'
        select `c`.`code` as `catalog`, `c`.`chain_position`, `e`.`language`, `e`.`level`,
          coalesce(sum(`e`.`status` = 'active'), 0) as `active_exercises`
        from `catalogs` as `c`
        join `exercises` as `e` on `e`.`catalog` = `c`.`code`
        where {filters}
        group by `c`.`code`, `c`.`chain_position`, `e`.`language`, `e`.`level`
        order by `c`.`chain_position` is null, `c`.`chain_position`, `c`.`code`, `e`.`language`, `e`.`level`
        SQL;

    private const STUDENTS_SQL = <<<'SQL'
        select `s`.`catalog`, `s`.`language`, `s`.`level`, `s`.`solved`, count(*) as `students`
        from (
          select `e`.`catalog`, `e`.`language`, `e`.`level`, `p`.`user_id`, sum(`p`.`solved_at` is not null) as `solved`
          from `exercise_progress` as `p`
          join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
          join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
          where {filters}
          group by `e`.`catalog`, `e`.`language`, `e`.`level`, `p`.`user_id`
        ) as `s`
        group by `s`.`catalog`, `s`.`language`, `s`.`level`, `s`.`solved`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters): array
    {
        [$where, $bindings] = $filters->exercises();
        $students = [];
        foreach ($this->rows->select(StatsSql::fill(self::STUDENTS_SQL, ['{filters}' => $where]), $bindings, 'exercise_progress') as $row) {
            $students[self::key($row)][$row->int('solved')] = $row->int('students');
        }
        $catalogs = [];
        foreach ($this->rows->select(StatsSql::fill(self::CATALOGS_SQL, ['{filters}' => $where]), $bindings, 'exercises') as $row) {
            $frequencies = $students[self::key($row)] ?? [];
            $started = 0;
            $solvedSome = 0;
            foreach ($frequencies as $solved => $count) {
                $started += $count;
                if ($solved > 0) {
                    $solvedSome += $count;
                }
            }
            $catalogs[] = [
                'catalog' => $row->string('catalog'),
                'language' => $row->string('language'),
                'level' => $row->nullableString('level'),
                'activeExercises' => $row->int('active_exercises'),
                'studentsStarted' => $started,
                'studentsSolved' => $solvedSome,
                'solvedMedian' => Median::of($frequencies),
            ];
        }

        return $catalogs;
    }

    private static function key(RowFields $row): string
    {
        return $row->string('catalog').'|'.$row->string('language').'|'.($row->nullableString('level') ?? '');
    }
}
