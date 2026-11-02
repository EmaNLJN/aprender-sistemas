<?php

namespace App\Stats\Content;

use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class CampaignStats
{
    private const WORLDS_SQL = <<<'SQL'
        select `w`.`id`, `w`.`language`, `w`.`level`, `w`.`status`,
          (select count(*) from `world_exercises` as `x` where `x`.`world_id` = `w`.`id` and `x`.`status` = 'active') as `exercises`
        from `worlds` as `w`
        where {filters}
        order by `w`.`language`, `w`.`position` is null, `w`.`position`, `w`.`id`
        SQL;

    private const CHECKPOINTS_SQL = <<<'SQL'
        select `k`.`world_id`,
          coalesce(sum(`k`.`last_answer` is not null or `k`.`passed` = 1), 0) as `answered`,
          coalesce(sum(`k`.`passed` = 1), 0) as `passed`
        from `campaign_checkpoints` as `k`
        join `users` as `u` on `u`.`id` = `k`.`user_id` and {population}
        group by `k`.`world_id`
        SQL;

    private const OPTIONS_SQL = <<<'SQL'
        select `k`.`world_id`, `k`.`last_answer` as `value`, count(*) as `students`
        from `campaign_checkpoints` as `k`
        join `users` as `u` on `u`.`id` = `k`.`user_id` and {population}
        where `k`.`last_answer` is not null
        group by `k`.`world_id`, `k`.`last_answer`
        order by `k`.`world_id`, `k`.`last_answer`
        SQL;

    private const SEALS_SQL = <<<'SQL'
        select `x`.`world_id`, count(distinct `s`.`user_id`) as `students`
        from `campaign_seals` as `s`
        join `users` as `u` on `u`.`id` = `s`.`user_id` and {population}
        join `world_exercises` as `x` on `x`.`exercise_id` = `s`.`exercise_id`
        group by `x`.`world_id`
        SQL;

    private const SOLVED_SQL = <<<'SQL'
        select `x`.`world_id`, count(*) as `solved`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `world_exercises` as `x` on `x`.`exercise_id` = `p`.`exercise_id`
        where `p`.`solved_at` is not null
        group by `x`.`world_id`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters): array
    {
        [$where, $bindings] = $filters->worlds();
        $checkpoints = [];
        foreach ($this->rows->select(StatsSql::fill(self::CHECKPOINTS_SQL), [], 'campaign_checkpoints') as $row) {
            $checkpoints[$row->string('world_id')] = ['answered' => $row->int('answered'), 'passed' => $row->int('passed')];
        }
        $options = [];
        foreach ($this->rows->select(StatsSql::fill(self::OPTIONS_SQL), [], 'campaign_checkpoints') as $row) {
            $options[$row->string('world_id')][] = ['option' => $row->int('value'), 'students' => $row->int('students')];
        }
        $seals = $this->countsBy(self::SEALS_SQL, 'students');
        $solved = $this->countsBy(self::SOLVED_SQL, 'solved');

        $worlds = [];
        foreach ($this->rows->select(StatsSql::fill(self::WORLDS_SQL, ['{filters}' => $where]), $bindings, 'worlds') as $world) {
            $id = $world->string('id');
            $worlds[] = [
                'worldId' => $id,
                'language' => $world->string('language'),
                'level' => $world->string('level'),
                'retired' => $world->string('status') !== 'active',
                'exercises' => $world->int('exercises'),
                'solvedRows' => $solved[$id] ?? 0,
                'studentsWithSeals' => $seals[$id] ?? 0,
                'checkpoint' => [
                    'answered' => $checkpoints[$id]['answered'] ?? 0,
                    'passed' => $checkpoints[$id]['passed'] ?? 0,
                    'options' => $options[$id] ?? [],
                ],
            ];
        }

        return $worlds;
    }

    /** @return array<string, int> */
    private function countsBy(string $sql, string $column): array
    {
        $counts = [];
        foreach ($this->rows->select(StatsSql::fill($sql), [], 'worlds') as $row) {
            $counts[$row->string('world_id')] = $row->int($column);
        }

        return $counts;
    }
}
