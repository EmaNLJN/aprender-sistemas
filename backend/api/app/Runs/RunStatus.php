<?php

namespace App\Runs;

enum RunStatus: string
{
    case Queued = 'queued';
    case Running = 'running';
    case Passed = 'passed';
    case Failed = 'failed';
    case CompileError = 'compile_error';
    case RuntimeError = 'runtime_error';
    case Timeout = 'timeout';
    case InfraError = 'infra_error';
    case Canceled = 'canceled';

    public function isActive(): bool
    {
        return $this === self::Queued || $this === self::Running;
    }

    public function countsAsAttempt(): bool
    {
        return match ($this) {
            self::Passed, self::Failed, self::CompileError, self::RuntimeError, self::Timeout => true,
            self::Queued, self::Running, self::InfraError, self::Canceled => false,
        };
    }
}
