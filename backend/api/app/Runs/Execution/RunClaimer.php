<?php

namespace App\Runs\Execution;

use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\Evidence\Verdict;
use App\Runs\Record\Instant;
use App\Runs\RunLog;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use LogicException;

final class RunClaimer
{
    public function __construct(
        private AccountLock $lock,
        private RunStore $store,
        private RunCloser $closer,
    ) {}

    public function claim(string $runId): Claim
    {
        $userId = $this->store->ownerOf($runId);
        if ($userId === null) {
            return Claim::discard();
        }
        try {
            $claim = $this->lock->within($userId, fn (ProgressHead $head): Claim => $this->claimUnder($head, $userId, $runId));
        } catch (AccountGone) {
            return Claim::discard();
        } catch (QueryException $error) {
            throw RunWriteFailed::reported($runId, $error);
        }
        if ($claim->run !== null && $claim->verdict !== null) {
            RunLog::closed($claim->run, $claim->verdict);
        } elseif ($claim->run !== null) {
            RunLog::claimed($claim->run);
        }

        return $claim;
    }

    private function claimUnder(ProgressHead $head, int $userId, string $runId): Claim
    {
        $status = DB::scalar('select `status` from `users` where `id` = ? for share', [$userId]);
        $run = $this->store->locked($runId);
        if ($run === null || $run->status !== RunStatus::Queued) {
            return Claim::discard();
        }
        $now = Instant::now();
        if ($run->expiresAt !== null && $run->expiresAt->lessThanOrEqualTo($now)) {
            return Claim::closed($run, $this->closer->closeWithin($head, $run, Verdict::infraError(RunReason::Expired)));
        }
        if ($status !== 'active') {
            return Claim::closed($run, $this->closer->closeWithin($head, $run, Verdict::canceled(RunReason::AccountDisabled)));
        }
        DB::update(
            'update `runs` set `status` = ?, `started_at` = ?, `expires_at` = ? where `id` = ? and `status` = ?',
            ['running', Instant::format($now), Instant::format($now->addSeconds(config()->integer('runs.expiry.running_seconds'))), $runId, 'queued'],
        );

        return Claim::ready($this->store->locked($runId) ?? throw new LogicException("La ejecución {$runId} desapareció bajo su candado."));
    }
}
