<?php

namespace App\Runs\Execution;

use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\CancelOutcome;
use App\Runs\Evidence\Verdict;
use App\Runs\Record\Instant;
use App\Runs\RunLog;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class RunCanceller
{
    public function __construct(
        private AccountLock $lock,
        private RunStore $store,
        private RunCloser $closer,
    ) {}

    public function cancel(int $userId, string $runId, ?RunReason $reason = null): CancelOutcome
    {
        if ($this->store->ownerOf($runId) !== $userId) {
            return CancelOutcome::NotFound;
        }
        try {
            $outcome = $this->lock->within($userId, fn (ProgressHead $head): CancelOutcome => $this->cancelUnder($head, $runId, $reason));
        } catch (AccountGone) {
            return CancelOutcome::NotFound;
        } catch (QueryException $error) {
            throw RunWriteFailed::reported($runId, $error);
        }

        return $outcome;
    }

    private function cancelUnder(ProgressHead $head, string $runId, ?RunReason $reason): CancelOutcome
    {
        $run = $this->store->locked($runId);
        if ($run === null) {
            return CancelOutcome::NotFound;
        }
        if ($run->status === RunStatus::Queued) {
            $verdict = $this->closer->closeWithin($head, $run, Verdict::canceled($reason));
            DB::afterCommit(fn () => RunLog::closed($run, $verdict));

            return CancelOutcome::Canceled;
        }
        if ($run->status !== RunStatus::Running) {
            return CancelOutcome::Unchanged;
        }
        $asked = DB::update(
            'update `runs` set `cancel_requested_at` = ? where `id` = ? and `cancel_requested_at` is null',
            [Instant::format(Instant::now()), $runId],
        );
        if ($asked === 1) {
            DB::afterCommit(fn () => RunLog::cancelRequested($run));
        }

        return CancelOutcome::Requested;
    }
}
