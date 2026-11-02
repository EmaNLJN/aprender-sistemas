<?php

namespace App\Stats\Accounts;

use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use App\Stats\Moment;
use App\Stats\StatsRows;
use App\Stats\StatsSql;
use Carbon\CarbonImmutable;
use Illuminate\Pagination\LengthAwarePaginator;

final class StudentDirectory
{
    public const SORTS = [
        'name' => '`u`.`name` asc, `u`.`id` asc',
        '-name' => '`u`.`name` desc, `u`.`id` asc',
        'createdAt' => '`u`.`created_at` asc, `u`.`id` asc',
        '-createdAt' => '`u`.`created_at` desc, `u`.`id` asc',
        'lastActivity' => '`h`.`last_activity_at` is not null, `h`.`last_activity_at` asc, `u`.`id` asc',
        '-lastActivity' => '`h`.`last_activity_at` is null, `h`.`last_activity_at` desc, `u`.`id` asc',
    ];

    private const COUNT_SQL = <<<'SQL'
        select count(*) as `students`
        from `users` as `u`
        left join `progress_heads` as `h` on `h`.`user_id` = `u`.`id`
        where {population} and {filters}
        SQL;

    private const PAGE_SQL = <<<'SQL'
        select `u`.`id`, `u`.`name`, `u`.`email`, `u`.`role`, `u`.`status`, `h`.`last_activity_at`
        from `users` as `u`
        left join `progress_heads` as `h` on `h`.`user_id` = `u`.`id`
        where {population} and {filters}
        order by {sort}
        limit ? offset ?
        SQL;

    private const SOLVED_SQL = <<<'SQL'
        select `p`.`user_id`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `server`,
          coalesce(sum(`p`.`solved_at` is not null and `p`.`server_solved_at` is null), 0) as `imported`
        from `exercise_progress` as `p`
        where `p`.`user_id` in ({ids})
        group by `p`.`user_id`
        SQL;

    private const ATTEMPTS_SQL = <<<'SQL'
        select `a`.`user_id`,
          coalesce(sum(`a`.`counted` = 1 and `a`.`attempted_at` >= ?), 0) as `last_week`,
          coalesce(sum(`a`.`counted` = 1 and `a`.`attempted_at` >= ?), 0) as `last_month`,
          max(case when `a`.`legacy` = 0 then `a`.`attempted_at` end) as `last_attempt_at`
        from `attempts` as `a`
        where `a`.`user_id` in ({ids})
        group by `a`.`user_id`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return LengthAwarePaginator<int, array<string, mixed>> */
    public function page(StudentFilters $filters, CarbonImmutable $now): LengthAwarePaginator
    {
        [$where, $bindings] = $this->conditions($filters);
        $total = $this->rows->one(StatsSql::fill(self::COUNT_SQL, ['{filters}' => $where]), $bindings, 'users')->int('students');
        $rows = $this->rows->select(
            StatsSql::fill(self::PAGE_SQL, ['{filters}' => $where, '{sort}' => self::SORTS[$filters->sort]]),
            [...$bindings, $filters->perPage, ($filters->page - 1) * $filters->perPage],
            'users',
        );
        $ids = [];
        foreach ($rows as $row) {
            $ids[] = $row->int('id');
        }
        $solved = $ids === [] ? [] : $this->byUser(self::SOLVED_SQL, $ids, []);
        $attempts = $ids === [] ? [] : $this->byUser(self::ATTEMPTS_SQL, $ids, [Instant::format($now->subDays(7)), Instant::format($now->subDays(30))]);

        /** @var list<array<string, mixed>> $items */
        $items = [];
        foreach ($rows as $row) {
            $id = $row->int('id');
            $solvedRow = $solved[$id] ?? null;
            $attemptsRow = $attempts[$id] ?? null;
            $items[] = [
                'id' => $id,
                'name' => $row->string('name'),
                'email' => $row->string('email'),
                'role' => $row->string('role'),
                'status' => $row->string('status'),
                'lastActivityAt' => Moment::iso($row->nullableString('last_activity_at')),
                'solved' => ['server' => $solvedRow?->int('server') ?? 0, 'imported' => $solvedRow?->int('imported') ?? 0],
                'attempts' => ['lastWeek' => $attemptsRow?->int('last_week') ?? 0, 'lastMonth' => $attemptsRow?->int('last_month') ?? 0],
                'lastAttemptAt' => Moment::iso($attemptsRow?->nullableString('last_attempt_at')),
            ];
        }

        return new LengthAwarePaginator($items, $total, $filters->perPage, $filters->page);
    }

    /** @return array{string, list<string>} */
    private function conditions(StudentFilters $filters): array
    {
        $clauses = ['1 = 1'];
        $bindings = [];
        if ($filters->q !== null) {
            $pattern = '%'.addcslashes($filters->q, '\\%_').'%';
            $clauses[] = '(`u`.`name` like ? or `u`.`email` like ?)';
            $bindings[] = $pattern;
            $bindings[] = $pattern;
        }
        if ($filters->inactiveSince !== null) {
            $clauses[] = '(`h`.`last_activity_at` is null or `h`.`last_activity_at` < ?)';
            $bindings[] = Instant::format($filters->inactiveSince);
        }

        return [implode(' and ', $clauses), $bindings];
    }

    /**
     * @param  list<int>  $ids
     * @param  list<string>  $leading  the bindings that go before the ids
     * @return array<int, RowFields>
     */
    private function byUser(string $sql, array $ids, array $leading): array
    {
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $byUser = [];
        foreach ($this->rows->select(StatsSql::fill($sql, ['{ids}' => $placeholders]), [...$leading, ...$ids], 'users') as $row) {
            $byUser[$row->int('user_id')] = $row;
        }

        return $byUser;
    }
}
