<?php

namespace App\Runs\Execution;

use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\Evidence\Verdict;
use App\Runs\Record\Instant;
use App\Runs\RunLog;
use App\Runs\RunReason;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class RunExpiry
{
    public function __construct(
        private AccountLock $lock,
        private RunStore $store,
        private RunCloser $closer,
    ) {}

    public function expire(string $runId): bool
    {
        $userId = $this->store->ownerOf($runId);
        if ($userId === null) {
            return false;
        }
        try {
            $closed = $this->lock->within($userId, fn (ProgressHead $head): bool => $this->expireUnder($head, $runId));
        } catch (AccountGone) {
            return false;
        } catch (QueryException $error) {
            throw RunWriteFailed::reported($runId, $error);
        }

        return $closed;
    }

    public function sweep(int $limit): int
    {
        $due = DB::select(
            "select `id` from `runs` where `status` in ('queued', 'running') and `expires_at` < ? order by `expires_at` limit ?",
            [Instant::format(Instant::now()), $limit],
        );
        $closed = 0;
        foreach ($due as $row) {
            if ($this->expire((string) $row->id)) {
                $closed++;
            }
        }

        return $closed;
    }

    private function expireUnder(ProgressHead $head, string $runId): bool
    {
        $run = $this->store->locked($runId);
        if ($run === null || ! $run->status->isActive() || $run->expiresAt === null || $run->expiresAt->greaterThan(Instant::now())) {
            return false;
        }
        $verdict = $this->closer->closeWithin($head, $run, Verdict::infraError(RunReason::Expired));
        DB::afterCommit(fn () => RunLog::closed($run, $verdict));

        return true;
    }
}
