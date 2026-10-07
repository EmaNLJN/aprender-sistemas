<?php

use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

it('has no phase, code, output or verdicts on an infrastructure error', function () {
    $verdict = Verdict::infraError(RunReason::ExecutorError);

    expect($verdict->status)->toBe(RunStatus::InfraError)
        ->and($verdict->reason)->toBe(RunReason::ExecutorError)
        ->and($verdict->phase)->toBeNull()
        ->and($verdict->exitCode)->toBeNull()
        ->and($verdict->truncated)->toBeNull()
        ->and($verdict->compileMs)->toBeNull()
        ->and($verdict->runMs)->toBeNull()
        ->and($verdict->stdout)->toBeNull()
        ->and($verdict->stderr)->toBeNull()
        ->and($verdict->tests)->toBe([])
        ->and($verdict->custom)->toBeNull();
});

it('has no phase, code, output or verdicts when canceled before running', function () {
    $verdict = Verdict::canceled();

    expect($verdict->status)->toBe(RunStatus::Canceled)
        ->and($verdict->reason)->toBeNull()
        ->and($verdict->phase)->toBeNull()
        ->and($verdict->exitCode)->toBeNull()
        ->and($verdict->stdout)->toBeNull()
        ->and($verdict->tests)->toBe([])
        ->and($verdict->custom)->toBeNull();
});

it('keeps the reason of a cancellation that the system decided', function () {
    expect(Verdict::canceled(RunReason::AccountDisabled)->reason)->toBe(RunReason::AccountDisabled);
});

it('keeps what the sandbox reported when a finished run is turned into a cancellation', function () {
    $failed = new Verdict(
        status: RunStatus::Failed, reason: RunReason::EvidenceInvalid, phase: ExecutorPhase::Run, exitCode: 0, truncated: true,
        compileMs: 412, runMs: 31, stdout: 'salida', stderr: 'error',
        tests: [new TestVerdict('t1', TestOutcome::Fail)], custom: TestOutcome::Pass,
    );

    $canceled = $failed->asCanceled();

    expect($canceled->status)->toBe(RunStatus::Canceled)
        ->and($canceled->reason)->toBeNull()
        ->and($canceled->phase)->toBe(ExecutorPhase::Run)
        ->and($canceled->exitCode)->toBe(0)
        ->and($canceled->truncated)->toBeTrue()
        ->and($canceled->compileMs)->toBe(412)
        ->and($canceled->runMs)->toBe(31)
        ->and($canceled->stdout)->toBe('salida')
        ->and($canceled->stderr)->toBe('error')
        ->and($canceled->tests)->toBe([])
        ->and($canceled->custom)->toBeNull()
        ->and($failed->status)->toBe(RunStatus::Failed);
});
