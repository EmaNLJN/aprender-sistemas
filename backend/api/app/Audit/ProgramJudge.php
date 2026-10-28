<?php

namespace App\Audit;

use App\Runs\Evidence\ExecutorResult;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;

final class ProgramJudge
{
    public function __construct(private AuditLimits $limits) {}

    public function judge(AuditProgram $program, ExecutorResult $result, Verdict $verdict): JudgedProgram
    {
        $finding = $this->finding($program, $verdict);
        $audit = match (true) {
            $finding !== null => AuditVerdict::Finding,
            $program->role === ProgramRole::Solution => AuditVerdict::Passes,
            default => AuditVerdict::FailsAsExpected,
        };
        $compile = new PhaseTiming($result->compileMs, $this->limits->compileMs($program->exercise->snapshot->language));
        $run = $result->phase === ExecutorPhase::Run ? new PhaseTiming($result->runMs, $this->limits->runMs) : null;
        $warning = $finding === null && ($this->limits->isNear($compile) || ($run !== null && $this->limits->isNear($run)));

        return JudgedProgram::judged($program, $verdict, $audit, $finding, $compile, $run, $result->oomKilled, $warning);
    }

    private function finding(AuditProgram $program, Verdict $verdict): ?FindingKind
    {
        if ($verdict->status === RunStatus::Timeout || in_array($verdict->reason, [RunReason::Oom, RunReason::PidsLimit], true)) {
            return FindingKind::LimitExceeded;
        }

        return $program->role === ProgramRole::Solution
            ? $this->solutionFinding($program, $verdict)
            : $this->starterFinding($program->exercise->kind, $verdict);
    }

    private function solutionFinding(AuditProgram $program, Verdict $verdict): ?FindingKind
    {
        if ($verdict->status !== RunStatus::Passed) {
            return FindingKind::SolutionNotPassed;
        }
        if ($program->customTest !== null && $verdict->custom !== $program->customTest->expected) {
            return FindingKind::CustomTestMismatch;
        }

        return null;
    }

    private function starterFinding(ExerciseKind $kind, Verdict $verdict): ?FindingKind
    {
        return match ($verdict->status) {
            RunStatus::Passed => FindingKind::StarterPassed,
            RunStatus::Failed => $verdict->reason === null ? null : FindingKind::StarterFailedWithoutTests,
            RunStatus::CompileError => $kind === ExerciseKind::Repair && $verdict->reason === null ? null : FindingKind::StarterCompileError,
            default => FindingKind::StarterRuntimeError,
        };
    }
}
