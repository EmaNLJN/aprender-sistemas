<?php

namespace App\Progress\Reset;

use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Progress\ProgressTables;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use App\Runs\Execution\ActiveRuns;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Throwable;

final class ProgressReset
{
    public function __construct(private AccountLock $lock, private ActiveRuns $runs) {}

    /**
     * @throws ClientOutdated
     * @throws EpochMismatch
     */
    public function reset(int $userId, ResetRequest $request): ResetOutcome
    {
        if (! in_array($request->format, config()->array('progress.reset.formats'), true)) {
            throw new ClientOutdated;
        }

        $outcome = $this->lock->within($userId, fn (ProgressHead $head) => $this->apply($head, $request));
        $canceledRuns = $this->cancelActiveRuns($userId);
        ResetLog::applied($userId, $outcome, $canceledRuns);

        return $outcome;
    }

    private function apply(ProgressHead $head, ResetRequest $request): ResetOutcome
    {
        if ($head->epoch !== $request->epoch) {
            throw new EpochMismatch($head->epoch, $head->revision);
        }
        $reset = $this->lock->reset($head, Instant::now());
        $deleted = [];
        foreach (array_reverse(ProgressTables::STATE) as $table) {
            $deleted[$table] = DB::delete("delete from `{$table}` where `user_id` = ?", [$head->userId]);
        }

        return new ResetOutcome($reset->epoch, $reset->revision, $deleted);
    }

    private function cancelActiveRuns(int $userId): int
    {
        try {
            return $this->runs->cancelAllOf($userId, null);
        } catch (Throwable $error) {
            ResetLog::cancelFailed($userId, $error);

            return 0;
        }
    }
}
