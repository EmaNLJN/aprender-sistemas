<?php

namespace App\Runs;

use App\Runs\Evidence\Verdict;
use App\Runs\Record\RunRow;
use Illuminate\Support\Facades\Log;
use Throwable;

final class RunLog
{
    private const CLIENT_MISTAKES = [400, 401, 413];

    public static function admitted(RunRow $run): void
    {
        Log::info('run.admitted', [
            'run_id' => $run->id, 'user_id' => $run->userId, 'exercise_id' => $run->exerciseId,
            'language' => $run->language->value, 'epoch' => $run->epoch,
        ]);
    }

    public static function rejected(int $userId, string $exerciseId, string $code): void
    {
        Log::info('run.rejected', ['user_id' => $userId, 'exercise_id' => $exerciseId, 'code' => $code]);
    }

    public static function claimed(RunRow $run): void
    {
        Log::info('run.claimed', ['run_id' => $run->id, 'user_id' => $run->userId, 'exercise_id' => $run->exerciseId]);
    }

    public static function requeued(RunRow $run, int $delaySeconds): void
    {
        Log::info('run.requeued', ['run_id' => $run->id, 'user_id' => $run->userId, 'delay_seconds' => $delaySeconds]);
    }

    public static function closed(RunRow $run, Verdict $verdict): void
    {
        Log::info('run.closed', [
            'run_id' => $run->id, 'user_id' => $run->userId, 'exercise_id' => $run->exerciseId,
            'status' => $verdict->status->value, 'reason' => $verdict->reason?->value, 'phase' => $verdict->phase?->value,
            'exit_code' => $verdict->exitCode, 'compile_ms' => $verdict->compileMs, 'run_ms' => $verdict->runMs,
        ]);
    }

    public static function cancelRequested(RunRow $run): void
    {
        Log::info('run.cancel_requested', ['run_id' => $run->id, 'user_id' => $run->userId]);
    }

    public static function executorFailed(RunRow $run, string $cause, ?int $httpStatus): void
    {
        $context = ['run_id' => $run->id, 'cause' => $cause, 'http_status' => $httpStatus];
        if (in_array($httpStatus, self::CLIENT_MISTAKES, true)) {
            Log::error('run.executor_failed', $context);

            return;
        }
        Log::warning('run.executor_failed', $context);
    }

    public static function jobFailed(string $runId, ?Throwable $error): void
    {
        Log::error('run.job_failed', ['run_id' => $runId, 'exception' => $error === null ? null : $error::class]);
    }

    public static function writeFailed(string $runId, string $sqlState, ?int $driverCode): void
    {
        Log::error('run.write_failed', ['run_id' => $runId, 'sql_state' => $sqlState, 'driver_code' => $driverCode]);
    }

    public static function cancelFailed(int $userId, Throwable $error): void
    {
        Log::error('run.cancel_failed', ['user_id' => $userId, 'exception' => $error::class]);
    }

    public static function swept(int $closed): void
    {
        Log::info('run.swept', ['closed' => $closed]);
    }

    public static function pruned(int $runs, int $payloads): void
    {
        Log::info('run.pruned', ['runs' => $runs, 'payloads' => $payloads]);
    }
}
