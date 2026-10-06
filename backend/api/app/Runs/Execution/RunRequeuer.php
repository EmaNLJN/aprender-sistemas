<?php

namespace App\Runs\Execution;

use App\Jobs\ExecuteRun;
use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\Evidence\Verdict;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunLog;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class RunRequeuer
{
    public const MIN_DELAY = 1;

    public const MAX_DELAY = 30;

    public function __construct(
        private AccountLock $lock,
        private RunStore $store,
        private RunCloser $closer,
    ) {}

    public function requeue(RunRow $run, int $delaySeconds): RequeueOutcome
    {
        $delay = max(self::MIN_DELAY, min(self::MAX_DELAY, $delaySeconds));
        try {
            $outcome = $this->lock->within($run->userId, function (ProgressHead $head) use ($run, $delay): array {
                $locked = $this->store->locked($run->id);
                if ($locked === null || $locked->status !== RunStatus::Running) {
                    return [RequeueOutcome::Gone, null];
                }
                $verdict = $this->verdictToStop($locked);
                if ($verdict !== null) {
                    return [RequeueOutcome::Closed, $this->closer->closeWithin($head, $locked, $verdict)];
                }
                $this->putBackInQueue($locked, $delay);

                return [RequeueOutcome::Requeued, null];
            });
        } catch (AccountGone) {
            return RequeueOutcome::Gone;
        } catch (QueryException $error) {
            throw RunWriteFailed::reported($run->id, $error);
        }
        [$result, $closedWith] = $outcome;
        match ($result) {
            RequeueOutcome::Requeued => RunLog::requeued($run, $delay),
            RequeueOutcome::Closed => $closedWith === null ? null : RunLog::closed($run, $closedWith),
            RequeueOutcome::Gone => null,
        };

        return $result;
    }

    private function verdictToStop(RunRow $run): ?Verdict
    {
        if ($run->cancelRequestedAt !== null) {
            return Verdict::canceled();
        }
        if ($this->acceptedDeadline($run)->lessThanOrEqualTo(Instant::now())) {
            return Verdict::infraError(RunReason::ExecutorBusy);
        }

        return null;
    }

    private function putBackInQueue(RunRow $run, int $delay): void
    {
        DB::update(
            'update `runs` set `status` = ?, `started_at` = null, `expires_at` = ? where `id` = ? and `status` = ?',
            ['queued', Instant::format($this->acceptedDeadline($run)), $run->id, 'running'],
        );
        ExecuteRun::dispatch($run->id)->delay($delay);
    }

    private function acceptedDeadline(RunRow $run): CarbonImmutable
    {
        return $run->createdAt->addSeconds(config()->integer('runs.expiry.queued_seconds'));
    }
}
