<?php

namespace App\Runs\Evidence;

use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

final readonly class Verdict
{
    /** @param list<TestVerdict> $tests */
    public function __construct(
        public RunStatus $status,
        public ?RunReason $reason,
        public ?ExecutorPhase $phase,
        public ?int $exitCode,
        public ?bool $truncated,
        public ?int $compileMs,
        public ?int $runMs,
        public ?string $stdout,
        public ?string $stderr,
        public array $tests,
        public ?TestOutcome $custom,
    ) {}

    public static function infraError(RunReason $reason): self
    {
        return new self(RunStatus::InfraError, $reason, null, null, null, null, null, null, null, [], null);
    }

    public static function canceled(?RunReason $reason = null): self
    {
        return new self(RunStatus::Canceled, $reason, null, null, null, null, null, null, null, [], null);
    }

    public function asCanceled(): self
    {
        return new self(
            RunStatus::Canceled, null, $this->phase, $this->exitCode, $this->truncated, $this->compileMs, $this->runMs,
            $this->stdout, $this->stderr, [], null,
        );
    }
}
