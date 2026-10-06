<?php

namespace App\Runs\Admission;

use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class QuotaPolicy
{
    private const SECONDS_PER_MINUTE = 60;

    private const SECONDS_PER_DAY = 86_400;

    private const MILLISECONDS_PER_MINUTE = 60_000;

    private const USAGE_SQL = <<<'SQL'
        select
          coalesce(sum(`status` in ('queued', 'running')), 0) as active,
          coalesce(sum(`status` <> 'infra_error' and `created_at` > ?), 0) as last_minute,
          min(case when `status` <> 'infra_error' and `created_at` > ? then `created_at` end) as oldest_minute,
          coalesce(sum(`status` <> 'infra_error'), 0) as last_day,
          min(case when `status` <> 'infra_error' then `created_at` end) as oldest_day,
          coalesce(sum(case when `status` not in ('queued', 'running', 'infra_error') then coalesce(`compile_ms`, 0) + coalesce(`run_ms`, 0) else 0 end), 0) as sandbox_ms,
          min(case when `status` not in ('queued', 'running', 'infra_error') and coalesce(`compile_ms`, 0) + coalesce(`run_ms`, 0) > 0 then `created_at` end) as oldest_sandbox
        from `runs`
        where `user_id` = ? and `created_at` > ?
        SQL;

    public function usage(int $userId, CarbonImmutable $now): QuotaUsage
    {
        $minute = Instant::format($now->subSeconds(self::SECONDS_PER_MINUTE));
        $day = Instant::format($now->subSeconds(self::SECONDS_PER_DAY));
        $rows = DB::select(self::USAGE_SQL, [$minute, $minute, $userId, $day]);
        $fields = new RowFields(get_object_vars($rows[0]), 'runs');

        return new QuotaUsage(
            $fields->int('active'),
            $fields->int('last_minute'),
            Instant::parseOrNull($fields->nullableString('oldest_minute')),
            $fields->int('last_day'),
            Instant::parseOrNull($fields->nullableString('oldest_day')),
            $fields->int('sandbox_ms'),
            Instant::parseOrNull($fields->nullableString('oldest_sandbox')),
        );
    }

    public function check(QuotaUsage $usage, CarbonImmutable $now): ?Rejection
    {
        if ($usage->active >= config()->integer('runs.quota.active')) {
            return Rejection::quota(QuotaKind::Active, config()->integer('runs.queue.retry_after_active'));
        }
        if ($usage->lastMinute >= config()->integer('runs.quota.per_minute')) {
            return $this->windowQuota(QuotaKind::PerMinute, $now, $usage->oldestInMinute, self::SECONDS_PER_MINUTE);
        }
        if ($usage->lastDay >= config()->integer('runs.quota.per_day')) {
            return $this->windowQuota(QuotaKind::PerDay, $now, $usage->oldestInDay, self::SECONDS_PER_DAY);
        }
        if ($usage->sandboxMs >= config()->integer('runs.quota.sandbox_minutes_per_day') * self::MILLISECONDS_PER_MINUTE) {
            return $this->windowQuota(QuotaKind::SandboxTime, $now, $usage->oldestSandbox, self::SECONDS_PER_DAY);
        }

        return null;
    }

    public function queued(): int
    {
        $count = DB::scalar("select count(*) from `runs` where `status` = 'queued'");

        return is_numeric($count) ? (int) $count : 0;
    }

    public function checkQueue(int $queued): ?Rejection
    {
        if ($queued >= config()->integer('runs.queue.max_waiting')) {
            return Rejection::queueFull(config()->integer('runs.queue.retry_after_full'));
        }

        return null;
    }

    private function windowQuota(QuotaKind $quota, CarbonImmutable $now, ?CarbonImmutable $oldest, int $windowSeconds): Rejection
    {
        $leavesAt = ($oldest ?? $now)->addSeconds($windowSeconds);

        return Rejection::quota($quota, Instant::secondsUntil($now, $leavesAt));
    }
}
