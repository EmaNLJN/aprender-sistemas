<?php

namespace App\Jobs;

use App\Accounts\PurgeLog;
use App\Accounts\UserPurge;
use App\Auth\AccountStatus;
use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Runs\Execution\ActiveRuns;
use App\Runs\Record\Instant;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\Backoff;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Queue\Attributes\UniqueFor;
use Illuminate\Support\Facades\DB;
use Throwable;

#[Tries(8)]
#[Timeout(300)]
#[Backoff(60, 300, 900, 1800, 3600)]
#[UniqueFor(18000)]
final class PurgeUserData implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $userId) {}

    public function uniqueId(): string
    {
        return (string) $this->userId;
    }

    public function handle(UserPurge $purge, ActiveRuns $runs, AccountLock $lock): void
    {
        if (! $this->isDeleting()) {
            return;
        }

        $this->cancelActiveRuns($runs);
        $batchRows = $purge->inBatches($this->userId);

        try {
            $lock->within($this->userId, fn () => $this->deleteAccountAndRecord($batchRows));
        } catch (AccountGone) {
            return;
        }
    }

    public function failed(Throwable $error): void
    {
        PurgeLog::failed($this->userId, $error);
    }

    private function isDeleting(): bool
    {
        $status = DB::table('users')->where('id', $this->userId)->value('status');
        if (! is_string($status)) {
            return false;
        }
        if ($status !== AccountStatus::Deleting->value) {
            PurgeLog::skipped($this->userId, $status);

            return false;
        }

        return true;
    }

    private function cancelActiveRuns(ActiveRuns $runs): void
    {
        try {
            $runs->cancelAllOf($this->userId);
        } catch (Throwable $error) {
            PurgeLog::cancelFailed($this->userId, $error);
        }
    }

    private function deleteAccountAndRecord(int $batchRows): void
    {
        $createdAt = DB::table('users')->where('id', $this->userId)->where('status', AccountStatus::Deleting->value)->lockForUpdate()->value('created_at');
        if (! is_string($createdAt)) {
            return;
        }

        DB::table('account_deletions')->insertOrIgnore([
            'user_id' => $this->userId,
            'user_created_at' => $createdAt,
            'deleted_at' => Instant::format(Instant::now()),
        ]);
        DB::delete('delete from `users` where `id` = ?', [$this->userId]);
        DB::afterCommit(fn () => PurgeLog::done($this->userId, $batchRows + 1));
    }
}
