<?php

namespace App\Runs\Execution;

use App\Auth\Events\AccountRestricted;
use App\Runs\RunLog;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;
use Illuminate\Support\Facades\DB;
use Throwable;

final class CancelRunsOfRestrictedAccount implements ShouldHandleEventsAfterCommit
{
    public function __construct(private ActiveRuns $runs) {}

    public function handle(AccountRestricted $event): void
    {
        $status = DB::scalar('select `status` from `users` where `id` = ?', [$event->userId]);
        if (! in_array($status, ['disabled', 'deleting'], true)) {
            return;
        }
        try {
            $this->runs->cancelAllOf($event->userId);
        } catch (Throwable $error) {
            RunLog::cancelFailed($event->userId, $error);
        }
    }
}
