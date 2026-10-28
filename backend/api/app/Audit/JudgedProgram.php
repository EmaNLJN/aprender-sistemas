<?php

namespace App\Audit;

use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\ExecutorReply;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

final readonly class JudgedProgram
{
    /** @param  list<TestVerdict>  $tests */
    private function __construct(
        public AuditProgram $program,
        public AuditVerdict $audit,
        public ?FindingKind $finding,
        public ?RunStatus $status,
        public ?RunReason $reason,
        public ?ExecutorPhase $phase,
        public ?int $exitCode,
        public array $tests,
        public ?TestOutcome $custom,
        public ?PhaseTiming $compile,
        public ?PhaseTiming $run,
        public ?bool $truncated,
        public ?bool $oomKilled,
        public bool $warning,
        public ?string $noVerdictCause,
        public ?string $diagnostic,
    ) {}

    public static function judged(
        AuditProgram $program,
        Verdict $verdict,
        AuditVerdict $audit,
        ?FindingKind $finding,
        PhaseTiming $compile,
        ?PhaseTiming $run,
        bool $oomKilled,
        bool $warning,
    ): self {
        return new self(
            $program, $audit, $finding, $verdict->status, $verdict->reason, $verdict->phase, $verdict->exitCode,
            $verdict->tests, $verdict->custom, $compile, $run, $verdict->truncated, $oomKilled, $warning, null,
            $finding === null ? null : Diagnostic::excerpt($verdict->stderr, $verdict->stdout),
        );
    }

    public static function noVerdict(AuditProgram $program, ExecutorReply $reply): self
    {
        $cause = $reply->httpStatus === null ? $reply->cause : "{$reply->cause}:{$reply->httpStatus}";

        return new self($program, AuditVerdict::NoVerdict, null, null, null, null, null, [], null, null, null, null, null, false, $cause, null);
    }
}
