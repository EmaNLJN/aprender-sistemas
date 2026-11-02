<?php

namespace App\Stats\Content;

use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class RouteStats
{
    private const MARKS_SQL = <<<'SQL'
        select `r`.`kind`, `r`.`item_key`, count(*) as `students`
        from `route_marks` as `r`
        join `users` as `u` on `u`.`id` = `r`.`user_id` and {population}
        where `r`.`marked` = 1
        group by `r`.`kind`, `r`.`item_key`
        order by `r`.`kind`, `r`.`item_key`
        SQL;

    private const QUIZ_SQL = <<<'SQL'
        select `q`.`step_id`, count(*) as `answered`
        from `route_quiz_answers` as `q`
        join `users` as `u` on `u`.`id` = `q`.`user_id` and {population}
        group by `q`.`step_id`
        order by `q`.`step_id`
        SQL;

    private const QUIZ_OPTIONS_SQL = <<<'SQL'
        select `q`.`step_id`, `q`.`answer` as `value`, count(*) as `students`
        from `route_quiz_answers` as `q`
        join `users` as `u` on `u`.`id` = `q`.`user_id` and {population}
        group by `q`.`step_id`, `q`.`answer`
        order by `q`.`step_id`, `q`.`answer`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return array{marks: list<array{kind: string, itemKey: string, students: int}>, quiz: list<array<string, mixed>>} */
    public function read(): array
    {
        $marks = [];
        foreach ($this->rows->select(StatsSql::fill(self::MARKS_SQL), [], 'route_marks') as $row) {
            $marks[] = ['kind' => $row->string('kind'), 'itemKey' => $row->string('item_key'), 'students' => $row->int('students')];
        }
        $options = [];
        foreach ($this->rows->select(StatsSql::fill(self::QUIZ_OPTIONS_SQL), [], 'route_quiz_answers') as $row) {
            $options[$row->string('step_id')][] = ['option' => $row->int('value'), 'students' => $row->int('students')];
        }
        $quiz = [];
        foreach ($this->rows->select(StatsSql::fill(self::QUIZ_SQL), [], 'route_quiz_answers') as $row) {
            $quiz[] = ['stepId' => $row->string('step_id'), 'answered' => $row->int('answered'), 'options' => $options[$row->string('step_id')] ?? []];
        }

        return ['marks' => $marks, 'quiz' => $quiz];
    }
}
