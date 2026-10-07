<?php

use App\Runs\CancelOutcome;
use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

it('has the nine states of the ADR, with their text values', function () {
    expect(array_map(fn (RunStatus $status) => $status->value, RunStatus::cases()))->toBe([
        'queued', 'running', 'passed', 'failed', 'compile_error', 'runtime_error', 'timeout', 'infra_error', 'canceled',
    ]);
});

it('is active only while queued or running', function (string $value, bool $active) {
    expect(RunStatus::from($value)->isActive())->toBe($active);
})->with([
    ['queued', true], ['running', true],
    ['passed', false], ['failed', false], ['compile_error', false], ['runtime_error', false],
    ['timeout', false], ['infra_error', false], ['canceled', false],
]);

it('counts as an attempt only when the code was judged (FR-029)', function (string $value, bool $counts) {
    expect(RunStatus::from($value)->countsAsAttempt())->toBe($counts);
})->with([
    ['passed', true], ['failed', true], ['compile_error', true], ['runtime_error', true], ['timeout', true],
    ['queued', false], ['running', false], ['infra_error', false], ['canceled', false],
]);

it('keeps the text values of the other run enums', function () {
    expect(array_map(fn ($case) => $case->value, RunReason::cases()))->toBe([
        'oom', 'signal', 'pids_limit', 'output_limit', 'evidence_invalid', 'executor_busy', 'executor_error', 'job_failed', 'expired', 'account_disabled',
    ])
        ->and(array_map(fn ($case) => $case->value, RunLanguage::cases()))->toBe(['rust', 'go'])
        ->and(array_map(fn ($case) => $case->value, ExecutorPhase::cases()))->toBe(['compile', 'run'])
        ->and(array_map(fn ($case) => $case->value, TestOutcome::cases()))->toBe(['pass', 'fail', 'missing'])
        ->and(array_map(fn ($case) => $case->name, CancelOutcome::cases()))->toBe(['Canceled', 'Requested', 'Unchanged', 'NotFound']);
});
