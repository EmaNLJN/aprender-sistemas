<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Assert;
use stdClass;

final class RunInvariants
{
    public const ACTIVE_RUN_TIMES = 'a run is queued or running exactly when it has no finished_at, and then it has expires_at';

    public const RUNNING_STARTED = 'a running run has started_at';

    public const TERMINAL_RUN_CLOSED = 'a finished run has no program and has an attempt';

    public const ACTIVE_RUN_HAS_NO_ATTEMPT = 'an active run has no attempt';

    public const ATTEMPT_COUNT = 'attempt_count equals the counted attempts of the epoch of the account';

    public const PROGRESS_REVISION = 'a progress row has a revision, and none is newer than the head of its account';

    public const POINTER_DATES = 'proof_at and last_attempt_at are the attempted_at of the attempt they point to';

    public const CROSSED_POINTERS = 'the pointers of exercise_progress point to attempts of the same account and exercise';

    /** @return array<string, list<string>> the rule that is broken and the rows that break it */
    public static function violations(): array
    {
        $rules = [
            self::ACTIVE_RUN_TIMES => self::runIds(
                "(status in ('queued', 'running')) <> (finished_at is null) or (finished_at is null) <> (expires_at is not null)",
            ),
            self::RUNNING_STARTED => self::runIds("status = 'running' and started_at is null"),
            self::TERMINAL_RUN_CLOSED => self::runIds("status not in ('queued', 'running') and (program is not null or attempt_id is null)"),
            self::ACTIVE_RUN_HAS_NO_ATTEMPT => self::runIds("status in ('queued', 'running') and attempt_id is not null"),
            self::ATTEMPT_COUNT => self::progressRows(
                'select p.user_id, p.exercise_id from exercise_progress p join progress_heads h on h.user_id = p.user_id
                 where p.attempt_count <> (select coalesce(sum(a.counted), 0) from attempts a where a.user_id = p.user_id and a.exercise_id = p.exercise_id and a.epoch = h.epoch)',
            ),
            self::PROGRESS_REVISION => self::progressRows(
                'select p.user_id, p.exercise_id from exercise_progress p join progress_heads h on h.user_id = p.user_id
                 where p.revision > h.revision or (p.attempt_count > 0 and p.revision = 0)',
            ),
            self::POINTER_DATES => self::progressRows(
                'select p.user_id, p.exercise_id from exercise_progress p
                 left join attempts proof on proof.id = p.proof_attempt_id
                 left join attempts latest on latest.id = p.last_attempt_id
                 where (proof.id is not null and not (p.proof_at <=> proof.attempted_at))
                    or (latest.id is not null and not (p.last_attempt_at <=> latest.attempted_at))',
            ),
            self::CROSSED_POINTERS => array_map(
                fn (stdClass $row) => "{$row->user_id}/{$row->exercise_id}",
                self::crossedPointers(),
            ),
        ];

        return array_filter($rules, fn (array $rows) => $rows !== []);
    }

    public static function assertClean(): void
    {
        foreach (self::violations() as $rule => $rows) {
            Assert::fail("{$rule}: ".implode(', ', $rows));
        }
    }

    /** @return list<stdClass> the rows of exercise_progress whose pointers lead to an attempt of another account or exercise */
    public static function crossedPointers(): array
    {
        return array_values(DB::select(
            'select p.user_id, p.exercise_id from exercise_progress p
             left join attempts proof on proof.id = p.proof_attempt_id
             left join attempts latest on latest.id = p.last_attempt_id
             where (p.proof_attempt_id is not null and (proof.id is null or proof.user_id <> p.user_id or proof.exercise_id <> p.exercise_id))
                or (p.last_attempt_id is not null and (latest.id is null or latest.user_id <> p.user_id or latest.exercise_id <> p.exercise_id))',
        ));
    }

    /** @return list<string> */
    private static function runIds(string $condition): array
    {
        return array_values(array_map(fn (stdClass $row) => $row->id, DB::select("select id from runs where {$condition}")));
    }

    /** @return list<string> */
    private static function progressRows(string $sql): array
    {
        return array_values(array_map(fn (stdClass $row) => "{$row->user_id}/{$row->exercise_id}", DB::select($sql)));
    }
}
