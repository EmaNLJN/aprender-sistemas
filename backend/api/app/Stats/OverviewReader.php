<?php

namespace App\Stats;

use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;

final class OverviewReader
{
    private const ATTEMPTS_SQL = <<<'SQL'
        select `b`.`bucket`, {attempt_counts},
          count(distinct case when `a`.`counted` = 1 then `a`.`user_id` end) as `students`
        from {buckets}
        left join (`attempts` as `a` join `users` as `u` on `u`.`id` = `a`.`user_id` and {population})
          on `a`.`attempted_at` >= `b`.`starts` and `a`.`attempted_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const SOLVES_SQL = <<<'SQL'
        select `b`.`bucket`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `server`,
          coalesce(sum(`p`.`user_id` is not null and `p`.`server_solved_at` is null), 0) as `imported`
        from {buckets}
        left join (`exercise_progress` as `p` join `users` as `u` on `u`.`id` = `p`.`user_id` and {population})
          on `p`.`solved_at` >= `b`.`starts` and `p`.`solved_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const NEW_STUDENTS_SQL = <<<'SQL'
        select `b`.`bucket`, count(`u`.`id`) as `students`
        from {buckets}
        left join `users` as `u` on {population} and `u`.`created_at` >= `b`.`starts` and `u`.`created_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const IMPORTS_SQL = <<<'SQL'
        select `b`.`bucket`, count(`i`.`id`) as `imports`
        from {buckets}
        left join (`progress_imports` as `i` join `users` as `u` on `u`.`id` = `i`.`user_id` and {population})
          on `i`.`imported_at` >= `b`.`starts` and `i`.`imported_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const ACCOUNTS_SQL = 'select `role`, `status`, count(*) as `accounts` from `users` group by `role`, `status`';

    private const ACTIVITY_SQL = <<<'SQL'
        select
          coalesce(sum(`h`.`last_activity_at` >= ?), 0) as `last_day`,
          coalesce(sum(`h`.`last_activity_at` >= ?), 0) as `last_week`,
          coalesce(sum(`h`.`last_activity_at` >= ?), 0) as `last_month`,
          coalesce(sum(`h`.`last_activity_at` is null), 0) as `never`
        from `users` as `u`
        left join `progress_heads` as `h` on `h`.`user_id` = `u`.`id`
        where {population}
        SQL;

    private const INVITATIONS_SQL = <<<'SQL'
        select
          coalesce(sum(`expires_at` > ?), 0) as `pending`,
          coalesce(sum(`expires_at` <= ?), 0) as `expired`,
          coalesce(sum(`role` = 'admin' and `expires_at` > ?), 0) as `pending_admin`
        from `invitations`
        SQL;

    private const RESETS_SQL = <<<'SQL'
        select count(*) as `students`
        from `progress_heads` as `h`
        join `users` as `u` on `u`.`id` = `h`.`user_id` and {population}
        where `h`.`epoch` > 1
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return array<string, mixed> */
    public function read(Period $period, CarbonImmutable $now): array
    {
        $figures = $this->figures($period->bucketsJson());
        $series = [];
        foreach ($period->buckets() as $index => $bucket) {
            $series[] = ['start' => $bucket['start'], ...$figures[$index]];
        }

        return [
            'accounts' => $this->accounts(),
            'activeStudents' => $this->activeStudents($now),
            'invitations' => $this->invitations($now),
            'resetStudents' => $this->rows->one(StatsSql::fill(self::RESETS_SQL), [], 'progress_heads')->int('students'),
            'totals' => $this->figures($period->wholeJson())[0],
            'series' => $series,
        ];
    }

    /** @return list<array<string, mixed>> */
    private function figures(string $bucketsJson): array
    {
        $attempts = $this->rows->select(StatsSql::fill(self::ATTEMPTS_SQL), [$bucketsJson], 'attempts');
        $solves = $this->rows->select(StatsSql::fill(self::SOLVES_SQL), [$bucketsJson], 'exercise_progress');
        $students = $this->rows->select(StatsSql::fill(self::NEW_STUDENTS_SQL), [$bucketsJson], 'users');
        $imports = $this->rows->select(StatsSql::fill(self::IMPORTS_SQL), [$bucketsJson], 'progress_imports');
        $figures = [];
        foreach ($attempts as $index => $row) {
            $figures[] = [
                ...AttemptCounts::from($row),
                'firstSolves' => ['server' => $solves[$index]->int('server'), 'imported' => $solves[$index]->int('imported')],
                'newStudents' => $students[$index]->int('students'),
                'imports' => $imports[$index]->int('imports'),
                'studentsWhoRan' => $row->int('students'),
            ];
        }

        return $figures;
    }

    /** @return list<array{role: string, status: string, count: int}> */
    private function accounts(): array
    {
        $counts = [];
        foreach ($this->rows->select(self::ACCOUNTS_SQL, [], 'users') as $row) {
            $counts[$row->string('role').'|'.$row->string('status')] = $row->int('accounts');
        }
        $accounts = [];
        foreach (Role::cases() as $role) {
            foreach (AccountStatus::cases() as $status) {
                $accounts[] = ['role' => $role->value, 'status' => $status->value, 'count' => $counts[$role->value.'|'.$status->value] ?? 0];
            }
        }

        return $accounts;
    }

    /** @return array{lastDay: int, lastWeek: int, lastMonth: int, never: int} */
    private function activeStudents(CarbonImmutable $now): array
    {
        $row = $this->rows->one(
            StatsSql::fill(self::ACTIVITY_SQL),
            [Instant::format($now->subDay()), Instant::format($now->subDays(7)), Instant::format($now->subDays(30))],
            'progress_heads',
        );

        return ['lastDay' => $row->int('last_day'), 'lastWeek' => $row->int('last_week'), 'lastMonth' => $row->int('last_month'), 'never' => $row->int('never')];
    }

    /** @return array{pending: int, expired: int, pendingAdmin: int} */
    private function invitations(CarbonImmutable $now): array
    {
        $at = Instant::format($now);
        $row = $this->rows->one(self::INVITATIONS_SQL, [$at, $at, $at], 'invitations');

        return ['pending' => $row->int('pending'), 'expired' => $row->int('expired'), 'pendingAdmin' => $row->int('pending_admin')];
    }
}
