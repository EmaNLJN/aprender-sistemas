<?php

use App\Runs\Evidence\EvidenceReader;
use App\Runs\Evidence\ExecutorResult;
use App\Runs\Evidence\ExpectedEvidence;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

const CLASSIFIER_NONCE = '0123456789abcdef0123456789abcdef';

function allPass(): string
{
    return "__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:PASS\n"
        ."__TALLER_TEST__0123456789abcdef0123456789abcdef:t2:PASS\n"
        ."__TALLER_TEST__0123456789abcdef0123456789abcdef:t3:PASS\n"
        ."__TALLER_END__0123456789abcdef0123456789abcdef:3\n";
}

function resultOf(
    ExecutorPhase $phase = ExecutorPhase::Run,
    int $exitCode = 0,
    string $stdout = '',
    bool $truncated = false,
    bool $timedOut = false,
    bool $oomKilled = false,
): ExecutorResult {
    return new ExecutorResult($phase, $exitCode, $stdout, 'err', $truncated, $timedOut, $oomKilled, 12, 34);
}

function classify(ExecutorResult $result, string $runtime = 'runsc', bool $custom = false): Verdict
{
    $classifier = new ResultClassifier(new EvidenceReader, $runtime);

    return $classifier->classify($result, new ExpectedEvidence(CLASSIFIER_NONCE, ['t1', 't2', 't3'], $custom));
}

it('classifies a failure before any evidence as the table says', function (ExecutorResult $result, string $runtime, RunStatus $status, ?RunReason $reason) {
    $verdict = classify($result, $runtime);

    expect($verdict->status)->toBe($status)
        ->and($verdict->reason)->toBe($reason)
        ->and($verdict->tests)->toBe([])
        ->and($verdict->custom)->toBeNull();
})->with([
    '1 timeout while compiling' => [resultOf(ExecutorPhase::Compile, 1, timedOut: true), 'runsc', RunStatus::Timeout, null],
    '1 timeout while running' => [resultOf(ExecutorPhase::Run, 124, timedOut: true), 'runsc', RunStatus::Timeout, null],
    '1 timeout wins over oom' => [resultOf(ExecutorPhase::Run, 137, timedOut: true, oomKilled: true), 'runsc', RunStatus::Timeout, null],
    '2 oom while running' => [resultOf(ExecutorPhase::Run, 137, oomKilled: true), 'runsc', RunStatus::RuntimeError, RunReason::Oom],
    '2 oom while compiling' => [resultOf(ExecutorPhase::Compile, 137, oomKilled: true), 'runsc', RunStatus::CompileError, RunReason::Oom],
    '3 compile error' => [resultOf(ExecutorPhase::Compile, 1), 'runsc', RunStatus::CompileError, null],
    '4 pids limit with runsc' => [resultOf(ExecutorPhase::Run, 137), 'runsc', RunStatus::RuntimeError, RunReason::PidsLimit],
    '5 137 with runc is a signal' => [resultOf(ExecutorPhase::Run, 137), 'runc', RunStatus::RuntimeError, RunReason::Signal],
    '5 139 is a signal' => [resultOf(ExecutorPhase::Run, 139), 'runsc', RunStatus::RuntimeError, RunReason::Signal],
    '6 exit code 101' => [resultOf(ExecutorPhase::Run, 101), 'runsc', RunStatus::RuntimeError, null],
    '6 exit code 128' => [resultOf(ExecutorPhase::Run, 128), 'runsc', RunStatus::RuntimeError, null],
]);

it('keeps the executor facts in the verdict', function () {
    $verdict = classify(resultOf(ExecutorPhase::Run, 101, 'out', truncated: true));

    expect($verdict->phase)->toBe(ExecutorPhase::Run)
        ->and($verdict->exitCode)->toBe(101)
        ->and($verdict->truncated)->toBeTrue()
        ->and($verdict->compileMs)->toBe(12)
        ->and($verdict->runMs)->toBe(34)
        ->and($verdict->stdout)->toBe('out')
        ->and($verdict->stderr)->toBe('err');
});

it('passes with exit code 0 and complete evidence of passing tests', function () {
    $verdict = classify(resultOf(stdout: allPass()));

    expect($verdict->status)->toBe(RunStatus::Passed)
        ->and($verdict->reason)->toBeNull()
        ->and(array_map(fn ($test) => $test->outcome, $verdict->tests))->toBe([TestOutcome::Pass, TestOutcome::Pass, TestOutcome::Pass]);
});

it('fails with complete evidence and a failing test', function () {
    $stdout = str_replace('t2:PASS', 't2:FAIL', allPass());

    $verdict = classify(resultOf(stdout: $stdout));

    expect($verdict->status)->toBe(RunStatus::Failed)
        ->and($verdict->reason)->toBeNull()
        ->and(array_map(fn ($test) => $test->outcome, $verdict->tests))->toBe([TestOutcome::Pass, TestOutcome::Fail, TestOutcome::Pass]);
});

it('fails as evidence_invalid when a test is absent and nothing was cut', function () {
    $stdout = str_replace("__TALLER_TEST__0123456789abcdef0123456789abcdef:t3:PASS\n", '', allPass());

    $verdict = classify(resultOf(stdout: $stdout));

    expect($verdict->status)->toBe(RunStatus::Failed)
        ->and($verdict->reason)->toBe(RunReason::EvidenceInvalid)
        ->and(array_map(fn ($test) => $test->outcome, $verdict->tests))->toBe([TestOutcome::Pass, TestOutcome::Pass, TestOutcome::Missing]);
});

it('fails as output_limit when evidence is incomplete and the output was truncated', function () {
    $stdout = str_replace("__TALLER_TEST__0123456789abcdef0123456789abcdef:t3:PASS\n", '', allPass());

    $verdict = classify(resultOf(stdout: $stdout, truncated: true));

    expect($verdict->status)->toBe(RunStatus::Failed)
        ->and($verdict->reason)->toBe(RunReason::OutputLimit)
        ->and($verdict->truncated)->toBeTrue();
});

it('passes with complete evidence even when another stream was truncated', function () {
    $verdict = classify(resultOf(stdout: allPass(), truncated: true));

    expect($verdict->status)->toBe(RunStatus::Passed)
        ->and($verdict->reason)->toBeNull()
        ->and($verdict->truncated)->toBeTrue();
});

it('reports the custom test apart and it never decides the status', function () {
    $stdout = str_replace('__TALLER_END__0123456789abcdef0123456789abcdef:3', "__TALLER_TEST__0123456789abcdef0123456789abcdef:custom:FAIL\n__TALLER_END__0123456789abcdef0123456789abcdef:4", allPass());

    $verdict = classify(resultOf(stdout: $stdout), custom: true);

    expect($verdict->status)->toBe(RunStatus::Passed)
        ->and($verdict->custom)->toBe(TestOutcome::Fail);
});
