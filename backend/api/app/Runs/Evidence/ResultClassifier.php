<?php

namespace App\Runs\Evidence;

use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

final class ResultClassifier
{
    public function __construct(private EvidenceReader $reader, private string $sandboxRuntime) {}

    public function classify(ExecutorResult $result, ExpectedEvidence $expected): Verdict
    {
        $failure = $this->failureBeforeEvidence($result);
        if ($failure !== null) {
            [$status, $reason] = $failure;

            return $this->verdict($result, $status, $reason, [], null);
        }

        $evidence = $this->reader->read($result->stdout, $expected);
        [$status, $reason] = $this->statusFromEvidence($result, $evidence);

        return $this->verdict($result, $status, $reason, $evidence->tests, $evidence->custom);
    }

    /** @return array{RunStatus, ?RunReason}|null */
    private function failureBeforeEvidence(ExecutorResult $result): ?array
    {
        $compiling = $result->phase === ExecutorPhase::Compile;

        return match (true) {
            $result->timedOut => [RunStatus::Timeout, null],
            $result->oomKilled => [$compiling ? RunStatus::CompileError : RunStatus::RuntimeError, RunReason::Oom],
            $compiling && $result->exitCode !== 0 => [RunStatus::CompileError, null],
            ! $compiling && $result->exitCode !== 0 => [RunStatus::RuntimeError, $this->runtimeReason($result->exitCode)],
            default => null,
        };
    }

    private function runtimeReason(int $exitCode): ?RunReason
    {
        return match (true) {
            $exitCode === 137 && $this->sandboxRuntime === 'runsc' => RunReason::PidsLimit,
            $exitCode > 128 => RunReason::Signal,
            default => null,
        };
    }

    /** @return array{RunStatus, ?RunReason} */
    private function statusFromEvidence(ExecutorResult $result, Evidence $evidence): array
    {
        if (! $evidence->complete) {
            return [RunStatus::Failed, $result->truncated ? RunReason::OutputLimit : RunReason::EvidenceInvalid];
        }
        foreach ($evidence->tests as $test) {
            if ($test->outcome !== TestOutcome::Pass) {
                return [RunStatus::Failed, null];
            }
        }

        return [RunStatus::Passed, null];
    }

    /** @param list<TestVerdict> $tests */
    private function verdict(ExecutorResult $result, RunStatus $status, ?RunReason $reason, array $tests, ?TestOutcome $custom): Verdict
    {
        return new Verdict(
            $status, $reason, $result->phase, $result->exitCode, $result->truncated, $result->compileMs, $result->runMs,
            $result->stdout, $result->stderr, $tests, $custom,
        );
    }
}
