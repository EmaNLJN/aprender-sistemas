<?php

namespace App\Runs\Execution;

use App\Runs\CancelOutcome;
use App\Runs\RunReason;
use Illuminate\Support\Facades\DB;

final class ActiveRuns
{
    public function __construct(private RunCanceller $canceller) {}

    public function cancelAllOf(int $userId, ?RunReason $reason = RunReason::AccountDisabled): int
    {
        $canceled = 0;
        foreach (DB::select("select `id` from `runs` where `user_id` = ? and `status` in ('queued', 'running')", [$userId]) as $row) {
            $outcome = $this->canceller->cancel($userId, (string) $row->id, $reason);
            if ($outcome === CancelOutcome::Canceled || $outcome === CancelOutcome::Requested) {
                $canceled++;
            }
        }

        return $canceled;
    }
}
