<?php

namespace App\Stats\Content;

use App\Content\Record\RowFields;
use App\Stats\AttemptCounts;
use App\Stats\Median;
use App\Stats\Period;
use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class ExerciseStats
{
    private const EXERCISES_SQL = <<<'SQL'
        select `e`.`id`, `e`.`catalog`, `e`.`language`, `e`.`level`, `e`.`status`
        from `exercises` as `e`
        where {filters}
        order by `e`.`catalog`, `e`.`language`, `e`.`stage`, `e`.`id`
        SQL;

    private const PROGRESS_SQL = <<<'SQL'
        select `p`.`exercise_id`,
          count(*) as `started`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `solved_server`,
          coalesce(sum(`p`.`solved_at` is not null and `p`.`server_solved_at` is null), 0) as `solved_imported`,
          coalesce(sum(`p`.`assisted` = 1), 0) as `assisted`,
          coalesce(sum(`p`.`solution_seen` = 1), 0) as `solution_seen`,
          coalesce(sum(`p`.`prediction_answer` is not null or `p`.`prediction_correct` = 1), 0) as `prediction_answered`,
          coalesce(sum(`p`.`prediction_correct` = 1), 0) as `prediction_correct`,
          coalesce(sum(`p`.`confidence` = 'again'), 0) as `again`,
          coalesce(sum(`p`.`confidence` = 'practice'), 0) as `practice`,
          coalesce(sum(`p`.`confidence` = 'confident'), 0) as `confident`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where {filters}
        group by `p`.`exercise_id`
        SQL;

    private const DISTRIBUTION_SQL = <<<'SQL'
        select `p`.`exercise_id`, `p`.{column} as `value`, count(*) as `students`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where {filters} and `p`.{column} is not null
        group by `p`.`exercise_id`, `p`.{column}
        order by `p`.`exercise_id`, `p`.{column}
        SQL;

    private const MEDIANS_SQL = <<<'SQL'
        select `p`.`exercise_id`, `p`.`solved_at` is not null as `solved`, `p`.`attempt_count` as `value`, count(*) as `students`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where {filters}
        group by `p`.`exercise_id`, `solved`, `p`.`attempt_count`
        SQL;

    private const ATTEMPTS_SQL = <<<'SQL'
        select `a`.`exercise_id`, {attempt_counts}
        from `attempts` as `a`
        join `users` as `u` on `u`.`id` = `a`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `a`.`exercise_id`
        where `a`.`attempted_at` >= ? and `a`.`attempted_at` < ? and {filters}
        group by `a`.`exercise_id`
        SQL;

    private const TESTS_SQL = <<<'SQL'
        select `t`.`exercise_id`, `t`.`test_key`, min(`t`.`position`) as `position`,
          count(*) as `verdicts`,
          coalesce(sum(`t`.`outcome` = 'fail'), 0) as `fail`,
          coalesce(sum(`t`.`outcome` = 'missing'), 0) as `missing`
        from `attempt_tests` as `t`
        join `attempts` as `a` on `a`.`id` = `t`.`attempt_id`
        join `users` as `u` on `u`.`id` = `a`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `t`.`exercise_id`
        where `a`.`counted` = 1 and `a`.`attempted_at` >= ? and `a`.`attempted_at` < ? and {filters}
        group by `t`.`exercise_id`, `t`.`test_key`
        order by `t`.`exercise_id`, `position`, `t`.`test_key`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters, Period $period): array
    {
        [$where, $bindings] = $filters->exercises();
        $inPeriod = [$period->startsUtc(), $period->endsUtc(), ...$bindings];
        $progress = $this->keyed($this->rows->select(StatsSql::fill(self::PROGRESS_SQL, ['{filters}' => $where]), $bindings, 'exercise_progress'));
        $attempts = $this->keyed($this->rows->select(StatsSql::fill(self::ATTEMPTS_SQL, ['{filters}' => $where]), $inPeriod, 'attempts'));
        $hints = $this->distribution('`hints_revealed`', $where, $bindings);
        $options = $this->distribution('`prediction_answer`', $where, $bindings);
        $medians = $this->medians($where, $bindings);
        $tests = $this->tests($where, $inPeriod);

        $exercises = [];
        foreach ($this->rows->select(StatsSql::fill(self::EXERCISES_SQL, ['{filters}' => $where]), $bindings, 'exercises') as $exercise) {
            $id = $exercise->string('id');
            $row = $progress[$id] ?? null;
            $exercises[] = [
                'exerciseId' => $id,
                'catalog' => $exercise->string('catalog'),
                'language' => $exercise->string('language'),
                'level' => $exercise->nullableString('level'),
                'retired' => $exercise->string('status') !== 'active',
                'studentsStarted' => $row?->int('started') ?? 0,
                'solved' => ['server' => $row?->int('solved_server') ?? 0, 'imported' => $row?->int('solved_imported') ?? 0],
                ...(isset($attempts[$id]) ? AttemptCounts::from($attempts[$id]) : AttemptCounts::zero()),
                'attemptsMedian' => ['solved' => Median::of($medians[$id][1] ?? []), 'unsolved' => Median::of($medians[$id][0] ?? [])],
                'help' => [
                    'assisted' => $row?->int('assisted') ?? 0,
                    'solutionSeen' => $row?->int('solution_seen') ?? 0,
                    'hintsRevealed' => self::listOf($hints[$id] ?? [], 'hints'),
                ],
                'prediction' => [
                    'answered' => $row?->int('prediction_answered') ?? 0,
                    'correct' => $row?->int('prediction_correct') ?? 0,
                    'options' => self::listOf($options[$id] ?? [], 'option'),
                ],
                'confidence' => ['again' => $row?->int('again') ?? 0, 'practice' => $row?->int('practice') ?? 0, 'confident' => $row?->int('confident') ?? 0],
                'tests' => $tests[$id] ?? [],
            ];
        }

        return $exercises;
    }

    /**
     * @param  list<RowFields>  $rows
     * @return array<string, RowFields>
     */
    private function keyed(array $rows): array
    {
        $keyed = [];
        foreach ($rows as $row) {
            $keyed[$row->string('exercise_id')] = $row;
        }

        return $keyed;
    }

    /**
     * @param  list<string>  $bindings
     * @return array<string, array<int, int>>
     */
    private function distribution(string $column, string $where, array $bindings): array
    {
        $byExercise = [];
        $sql = StatsSql::fill(self::DISTRIBUTION_SQL, ['{filters}' => $where, '{column}' => $column]);
        foreach ($this->rows->select($sql, $bindings, 'exercise_progress') as $row) {
            $byExercise[$row->string('exercise_id')][$row->int('value')] = $row->int('students');
        }

        return $byExercise;
    }

    /**
     * @param  list<string>  $bindings
     * @return array<string, array<int, array<int, int>>> by exercise, then solved (1) or not (0), then students by attempt count
     */
    private function medians(string $where, array $bindings): array
    {
        $byExercise = [];
        foreach ($this->rows->select(StatsSql::fill(self::MEDIANS_SQL, ['{filters}' => $where]), $bindings, 'exercise_progress') as $row) {
            $byExercise[$row->string('exercise_id')][$row->int('solved')][$row->int('value')] = $row->int('students');
        }

        return $byExercise;
    }

    /**
     * @param  list<string>  $bindings
     * @return array<string, list<array{testKey: string, verdicts: int, fail: int, missing: int}>>
     */
    private function tests(string $where, array $bindings): array
    {
        $byExercise = [];
        foreach ($this->rows->select(StatsSql::fill(self::TESTS_SQL, ['{filters}' => $where]), $bindings, 'attempt_tests') as $row) {
            $byExercise[$row->string('exercise_id')][] = [
                'testKey' => $row->string('test_key'),
                'verdicts' => $row->int('verdicts'),
                'fail' => $row->int('fail'),
                'missing' => $row->int('missing'),
            ];
        }

        return $byExercise;
    }

    /**
     * @param  array<int, int>  $counts
     * @return list<array<string, int>>
     */
    private static function listOf(array $counts, string $label): array
    {
        $list = [];
        foreach ($counts as $value => $students) {
            $list[] = [$label => $value, 'students' => $students];
        }

        return $list;
    }
}
