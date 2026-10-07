<?php

namespace App\Progress;

use App\Database\WriteTransaction;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class AccountLock
{
    private const FOREIGN_KEY_VIOLATION = 1452;

    /**
     * @template T
     *
     * @param  Closure(ProgressHead): T  $work
     * @return T
     */
    public function within(int $userId, Closure $work): mixed
    {
        return WriteTransaction::run(fn () => $work($this->take($userId)));
    }

    public function advance(ProgressHead $head, CarbonImmutable $at): ProgressHead
    {
        $now = Instant::format($at);
        DB::update(
            'update `progress_heads` set `revision` = `revision` + 1, `last_activity_at` = ?, `updated_at` = ? where `user_id` = ?',
            [$now, $now, $head->userId],
        );

        return new ProgressHead($head->userId, $head->epoch, $head->revision + 1, $head->resetAt, $at);
    }

    public function peek(int $userId): ProgressHead
    {
        $rows = DB::select('select * from `progress_heads` where `user_id` = ?', [$userId]);

        return $rows === [] ? new ProgressHead($userId, 1, 0, null, null) : ProgressHead::fromRow(get_object_vars($rows[0]));
    }

    public function reset(ProgressHead $head, CarbonImmutable $at): ProgressHead
    {
        $now = Instant::format($at);
        DB::update(
            'update `progress_heads` set `epoch` = `epoch` + 1, `revision` = `revision` + 1, `reset_at` = ?, `last_activity_at` = ?, `updated_at` = ? where `user_id` = ?',
            [$now, $now, $now, $head->userId],
        );

        return new ProgressHead($head->userId, $head->epoch + 1, $head->revision + 1, $at, $at);
    }

    private function take(int $userId): ProgressHead
    {
        $now = Instant::format(Instant::now());
        try {
            DB::insert(
                'insert into `progress_heads` (`user_id`, `epoch`, `revision`, `created_at`, `updated_at`) values (?, 1, 0, ?, ?) as `n` on duplicate key update `user_id` = `n`.`user_id`',
                [$userId, $now, $now],
            );
        } catch (QueryException $error) {
            throw ($error->errorInfo[1] ?? null) === self::FOREIGN_KEY_VIOLATION ? new AccountGone($userId) : $error;
        }
        $rows = DB::select('select * from `progress_heads` where `user_id` = ? for update', [$userId]);

        return ProgressHead::fromRow(get_object_vars($rows[0]));
    }
}
