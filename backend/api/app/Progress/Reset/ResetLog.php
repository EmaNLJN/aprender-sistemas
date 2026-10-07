<?php

namespace App\Progress\Reset;

use Illuminate\Support\Facades\Log;
use Throwable;

final class ResetLog
{
    public static function applied(int $userId, ResetOutcome $outcome, int $canceledRuns): void
    {
        Log::info('progress.reset', [
            'user_id' => $userId, 'epoch' => $outcome->epoch, 'revision' => $outcome->revision,
            'deleted' => $outcome->deleted, 'canceled_runs' => $canceledRuns,
        ]);
    }

    public static function cancelFailed(int $userId, Throwable $error): void
    {
        Log::error('progress.reset.cancel_failed', ['user_id' => $userId, 'exception' => $error::class]);
    }
}
