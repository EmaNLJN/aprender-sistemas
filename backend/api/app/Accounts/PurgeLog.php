<?php

namespace App\Accounts;

use Illuminate\Support\Facades\Log;
use Throwable;

final class PurgeLog
{
    public static function skipped(int $userId, string $status): void
    {
        Log::warning('purge.skipped', ['user_id' => $userId, 'status' => $status]);
    }

    public static function cancelFailed(int $userId, Throwable $error): void
    {
        Log::error('purge.cancel_failed', ['user_id' => $userId, 'exception' => $error::class]);
    }

    public static function done(int $userId, int $rows): void
    {
        Log::info('purge.done', ['user_id' => $userId, 'rows' => $rows]);
    }

    public static function failed(int $userId, Throwable $error): void
    {
        Log::error('purge.failed', ['user_id' => $userId, 'exception' => $error::class]);
    }
}
