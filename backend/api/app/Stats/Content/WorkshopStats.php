<?php

namespace App\Stats\Content;

use App\Runs\RunLanguage;
use App\Stats\Median;
use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class WorkshopStats
{
    private const WORKSHOPS_SQL = <<<'SQL'
        select `ws`.`id`, `ws`.`level`, `ws`.`status`
        from `workshops` as `ws`
        where {filters}
        order by `ws`.`domain`, `ws`.`position` is null, `ws`.`position`, `ws`.`id`
        SQL;

    private const PROGRESS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, count(*) as `started`,
          coalesce(sum(`w`.`code_sealed` = 1), 0) as `sealed`,
          coalesce(sum(`w`.`answer` is not null or `w`.`prediction_correct` = 1), 0) as `answered`,
          coalesce(sum(`w`.`prediction_correct` = 1), 0) as `correct`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        group by `w`.`workshop_id`, `w`.`language`
        SQL;

    private const OPTIONS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, `w`.`answer` as `value`, count(*) as `students`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        where `w`.`answer` is not null
        group by `w`.`workshop_id`, `w`.`language`, `w`.`answer`
        order by `w`.`workshop_id`, `w`.`language`, `w`.`answer`
        SQL;

    private const STEPS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, coalesce(`m`.`marks`, 0) as `value`, count(*) as `students`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        left join (
          select `user_id`, `workshop_id`, `language`, count(*) as `marks`
          from `workshop_step_marks`
          where `marked` = 1
          group by `user_id`, `workshop_id`, `language`
        ) as `m` on `m`.`user_id` = `w`.`user_id` and `m`.`workshop_id` = `w`.`workshop_id` and `m`.`language` = `w`.`language`
        group by `w`.`workshop_id`, `w`.`language`, `value`
        SQL;

    private const OBJECTIVES_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, coalesce(`o`.`observed`, 0) as `value`, count(*) as `students`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        left join (
          select `user_id`, `workshop_id`, `language`, count(*) as `observed`
          from `workshop_observations`
          where `observed_at` is not null
          group by `user_id`, `workshop_id`, `language`
        ) as `o` on `o`.`user_id` = `w`.`user_id` and `o`.`workshop_id` = `w`.`workshop_id` and `o`.`language` = `w`.`language`
        group by `w`.`workshop_id`, `w`.`language`, `value`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters): array
    {
        [$where, $bindings] = $filters->workshops();
        $progress = [];
        foreach ($this->rows->select(StatsSql::fill(self::PROGRESS_SQL), [], 'workshop_progress') as $row) {
            $progress[$row->string('workshop_id').'|'.$row->string('language')] = $row;
        }
        $options = [];
        foreach ($this->rows->select(StatsSql::fill(self::OPTIONS_SQL), [], 'workshop_progress') as $row) {
            $options[$row->string('workshop_id').'|'.$row->string('language')][] = ['option' => $row->int('value'), 'students' => $row->int('students')];
        }
        $steps = $this->frequencies(self::STEPS_SQL);
        $objectives = $this->frequencies(self::OBJECTIVES_SQL);

        $workshops = [];
        foreach ($this->rows->select(StatsSql::fill(self::WORKSHOPS_SQL, ['{filters}' => $where]), $bindings, 'workshops') as $workshop) {
            foreach (RunLanguage::cases() as $language) {
                if ($filters->language !== null && $filters->language !== $language->value) {
                    continue;
                }
                $key = $workshop->string('id').'|'.$language->value;
                $row = $progress[$key] ?? null;
                $workshops[] = [
                    'workshopId' => $workshop->string('id'),
                    'language' => $language->value,
                    'level' => $workshop->string('level'),
                    'retired' => $workshop->string('status') !== 'active',
                    'studentsStarted' => $row?->int('started') ?? 0,
                    'codeSealed' => $row?->int('sealed') ?? 0,
                    'prediction' => ['answered' => $row?->int('answered') ?? 0, 'correct' => $row?->int('correct') ?? 0, 'options' => $options[$key] ?? []],
                    'stepsMarkedMedian' => Median::of($steps[$key] ?? []),
                    'objectivesObservedMedian' => Median::of($objectives[$key] ?? []),
                ];
            }
        }

        return $workshops;
    }

    /** @return array<string, array<int, int>> */
    private function frequencies(string $sql): array
    {
        $byWorkshop = [];
        foreach ($this->rows->select(StatsSql::fill($sql), [], 'workshop_progress') as $row) {
            $byWorkshop[$row->string('workshop_id').'|'.$row->string('language')][$row->int('value')] = $row->int('students');
        }

        return $byWorkshop;
    }
}
