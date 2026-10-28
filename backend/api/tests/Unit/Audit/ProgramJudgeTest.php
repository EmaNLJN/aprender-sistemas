<?php

use App\Audit\AuditProgram;
use App\Audit\AuditVerdict;
use App\Audit\CustomTestProbe;
use App\Audit\Diagnostic;
use App\Audit\ExerciseKind;
use App\Audit\FindingKind;
use App\Audit\JudgedProgram;
use App\Audit\ProgramJudge;
use App\Audit\ProgramRole;
use App\Runs\Execution\ExecutorReply;
use App\Runs\ExecutorPhase;
use App\Runs\Program\ComposedProgram;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Tests\Support\AuditCases;

it('decides each row of the table of the spec', function (ProgramRole $role, ExerciseKind $kind, RunStatus $status, ?RunReason $reason, ?CustomTestProbe $probe, ?TestOutcome $custom, AuditVerdict $audit, ?FindingKind $finding) {
    $phase = $status === RunStatus::CompileError ? ExecutorPhase::Compile : ExecutorPhase::Run;

    $judged = (new ProgramJudge(AuditCases::limits()))->judge(
        AuditCases::program($role, $kind, $probe),
        AuditCases::result($phase),
        AuditCases::verdict($status, $reason, custom: $custom, phase: $phase),
    );

    expect($judged->audit)->toBe($audit)->and($judged->finding)->toBe($finding);
})->with([
    'a solution that passes' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Passed, null, null, null, AuditVerdict::Passes, null],
    'a solution that fails a test' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Failed, null, null, null, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a solution that does not compile' => [ProgramRole::Solution, ExerciseKind::Repair, RunStatus::CompileError, null, null, null, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a solution with its output cut' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Failed, RunReason::OutputLimit, null, null, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a starter that fails as expected' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::Failed, null, null, null, AuditVerdict::FailsAsExpected, null],
    'a repair starter that does not compile' => [ProgramRole::Starter, ExerciseKind::Repair, RunStatus::CompileError, null, null, null, AuditVerdict::FailsAsExpected, null],
    'a starter that passes' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::Passed, null, null, null, AuditVerdict::Finding, FindingKind::StarterPassed],
    'a complete starter that does not compile' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::CompileError, null, null, null, AuditVerdict::Finding, FindingKind::StarterCompileError],
    'an abort' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::RuntimeError, RunReason::Signal, null, null, AuditVerdict::Finding, FindingKind::StarterRuntimeError],
    'a non-zero exit' => [ProgramRole::Starter, ExerciseKind::Repair, RunStatus::RuntimeError, null, null, null, AuditVerdict::Finding, FindingKind::StarterRuntimeError],
    'a timeout' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::Timeout, null, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'invalid evidence' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::Failed, RunReason::EvidenceInvalid, null, null, AuditVerdict::Finding, FindingKind::StarterFailedWithoutTests],
    'output cut before the markers' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::Failed, RunReason::OutputLimit, null, null, AuditVerdict::Finding, FindingKind::StarterFailedWithoutTests],
    'the pids limit with runsc' => [ProgramRole::Starter, ExerciseKind::Complete, RunStatus::RuntimeError, RunReason::PidsLimit, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'memory at run time' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::RuntimeError, RunReason::Oom, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'memory while compiling a repair starter' => [ProgramRole::Starter, ExerciseKind::Repair, RunStatus::CompileError, RunReason::Oom, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'a custom test that passes as expected' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Pass, AuditVerdict::Passes, null],
    'a custom test that fails as expected' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 36', TestOutcome::Fail), TestOutcome::Fail, AuditVerdict::Passes, null],
    'a custom test reported otherwise' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Fail, AuditVerdict::Finding, FindingKind::CustomTestMismatch],
    'a custom test without its marker' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Missing, AuditVerdict::Finding, FindingKind::CustomTestMismatch],
    'a solution that aborts' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::RuntimeError, RunReason::Signal, null, null, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a solution that times out' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Timeout, null, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'a repair starter that passes' => [ProgramRole::Starter, ExerciseKind::Repair, RunStatus::Passed, null, null, null, AuditVerdict::Finding, FindingKind::StarterPassed],
    'a failing sample is not rescued by its custom test' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Failed, null, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Pass, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a sample whose custom marker is missing' => [ProgramRole::Solution, ExerciseKind::Complete, RunStatus::Failed, RunReason::EvidenceInvalid, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Missing, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a repair starter that does not compile with a reason' => [ProgramRole::Starter, ExerciseKind::Repair, RunStatus::CompileError, RunReason::Signal, null, null, AuditVerdict::Finding, FindingKind::StarterCompileError],
]);

it('measures both phases against their limits and only the compilation when the program did not run', function () {
    $judge = new ProgramJudge(AuditCases::limits());

    $ran = $judge->judge(AuditCases::program(), AuditCases::result(compileMs: 812, runMs: 34), AuditCases::verdict(RunStatus::Passed));
    $compiled = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(ExecutorPhase::Compile, 640, 0), AuditCases::verdict(RunStatus::CompileError, phase: ExecutorPhase::Compile, exitCode: 1));

    expect([$ran->compile?->ms, $ran->compile?->limitMs, $ran->run?->ms, $ran->run?->limitMs])->toBe([812, 20000, 34, 10000])
        ->and($compiled->run)->toBeNull()
        ->and($compiled->compile?->ms)->toBe(640);
});

it('warns a program that passes above half of a limit, never a finding (Q4, FR-022)', function () {
    $judge = new ProgramJudge(AuditCases::limits());

    $slow = $judge->judge(AuditCases::program(), AuditCases::result(compileMs: 11000), AuditCases::verdict(RunStatus::Passed));
    $slowRun = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(runMs: 5001), AuditCases::verdict(RunStatus::Failed));
    $slowFinding = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(compileMs: 11000), AuditCases::verdict(RunStatus::Passed));

    expect($slow->warning)->toBeTrue()->and($slow->audit)->toBe(AuditVerdict::Passes)
        ->and($slowRun->warning)->toBeTrue()
        ->and($slowFinding->warning)->toBeFalse();
});

it('keeps whether the memory ran out, and no diagnostic unless it is a finding (FR-023)', function () {
    $judge = new ProgramJudge(AuditCases::limits());

    $oom = $judge->judge(AuditCases::program(), AuditCases::result(oomKilled: true), AuditCases::verdict(RunStatus::RuntimeError, RunReason::Oom, stderr: "memory\n"));
    $fine = $judge->judge(AuditCases::program(), AuditCases::result(), AuditCases::verdict(RunStatus::Passed, stderr: "warning: unused\n"));

    expect($oom->oomKilled)->toBeTrue()->and($oom->diagnostic)->toBe('memory')
        ->and($fine->oomKilled)->toBeFalse()->and($fine->diagnostic)->toBeNull();
});

it('leaves a program without a verdict with the cause and the status of the reply (FR-008)', function () {
    $judged = JudgedProgram::noVerdict(AuditCases::program(), ExecutorReply::failed('status', 500));

    expect($judged->audit)->toBe(AuditVerdict::NoVerdict)
        ->and($judged->noVerdictCause)->toBe('status:500')
        ->and($judged->status)->toBeNull()
        ->and($judged->warning)->toBeFalse()
        ->and(JudgedProgram::noVerdict(AuditCases::program(), ExecutorReply::failed('connection', null))->noVerdictCause)->toBe('connection');
});

it('keeps the first eight lines of the diagnostic, without the markers, cut to 200 characters', function () {
    $stderr = implode("\n", ['', 'error[E0277]: one', '__TALLER_TEST__x:t1:FAIL', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']);

    expect(Diagnostic::excerpt($stderr, 'ignored'))->toBe("error[E0277]: one\ntwo\nthree\nfour\nfive\nsix\nseven\neight")
        ->and(Diagnostic::excerpt('', "panicked at main\n"))->toBe('panicked at main')
        ->and(Diagnostic::excerpt('', ''))->toBeNull()
        ->and(Diagnostic::excerpt(str_repeat('x', 300), null))->toBe(str_repeat('x', 199).'…');
});

it('measures a Go program against the Go compile limit', function () {
    $program = new AuditProgram(AuditCases::exercise('go-01', language: RunLanguage::Go), ProgramRole::Solution, null, new ComposedProgram('program', ['t1', 't2'], false, str_repeat('a', 32)), str_repeat('3', 64));

    $judged = (new ProgramJudge(AuditCases::limits()))->judge($program, AuditCases::result(compileMs: 7600), AuditCases::verdict(RunStatus::Passed));

    expect($judged->compile?->limitMs)->toBe(15000)->and($judged->warning)->toBeTrue();
});
