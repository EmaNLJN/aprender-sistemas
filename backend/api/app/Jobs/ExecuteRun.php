<?php

namespace App\Jobs;

use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\Execution\RunProcessor;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\RunLog;
use App\Runs\RunReason;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\FailOnTimeout;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Throwable;

#[Tries(1)]
#[Timeout(ExecuteRun::TIMEOUT)]
#[FailOnTimeout]
final class ExecuteRun implements ShouldQueue
{
    use Queueable;

    public const TIMEOUT = 120;

    public function __construct(public readonly string $runId)
    {
        $this->onConnection('runs');
        $this->onQueue('runs');
    }

    public function handle(RunProcessor $processor): void
    {
        $processor->process($this->runId);
    }

    public function failed(?Throwable $exception): void
    {
        RunLog::jobFailed($this->runId, $exception);
        try {
            app(RunCloser::class)->close($this->runId, Verdict::infraError(RunReason::JobFailed));
        } catch (RunWriteFailed) {
        }
    }
}
