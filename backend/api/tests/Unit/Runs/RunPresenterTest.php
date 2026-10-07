<?php

use App\Runs\Evidence\TestVerdict;
use App\Runs\Record\RunRow;
use App\Runs\RunPresenter;
use App\Runs\RunView;
use App\Runs\TestOutcome;
use Tests\TestCase;

uses(TestCase::class);

/** @param array<string, mixed> $overrides */
function presenterRun(array $overrides = []): RunRow
{
    return RunRow::fromRow([
        'id' => '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21', 'user_id' => '7', 'client_run_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'exercise_id' => 'rust-01', 'language' => 'rust', 'epoch' => '2', 'grading_hash' => str_repeat('a', 64),
        'expected_tests' => '["t1","t2","t3"]', 'nonce' => str_repeat('b', 32), 'code' => 'SECRET CODE', 'custom_test' => 'SECRET CUSTOM',
        'program' => 'SECRET PROGRAM', 'status' => 'queued', 'reason' => null, 'executor_phase' => null, 'exit_code' => null,
        'truncated' => null, 'compile_ms' => null, 'run_ms' => null, 'stdout' => null, 'stderr' => null,
        'attempt_id' => null, 'cancel_requested_at' => null, 'created_at' => '2026-10-05 16:21:07.412', 'started_at' => null,
        'finished_at' => null, 'expires_at' => '2026-10-05 16:31:07.412',
        ...$overrides,
    ]);
}

const CONTRACT_KEYS = [
    'id', 'status', 'reason', 'queuePosition', 'exerciseId', 'language', 'createdAt', 'startedAt', 'finishedAt', 'phase', 'exitCode',
    'compileMs', 'runMs', 'truncated', 'stdout', 'stderr', 'tests', 'customTest',
];

it('presents a queued run with its position and nothing else that does not exist yet', function () {
    $json = (new RunPresenter)->present(new RunView(presenterRun(), 3, [], null));

    expect($json)->toBe([
        'id' => '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21',
        'status' => 'queued',
        'reason' => null,
        'queuePosition' => 3,
        'exerciseId' => 'rust-01',
        'language' => 'rust',
        'createdAt' => '2026-10-05T16:21:07.412Z',
        'startedAt' => null,
        'finishedAt' => null,
        'phase' => null,
        'exitCode' => null,
        'compileMs' => null,
        'runMs' => null,
        'truncated' => null,
        'stdout' => null,
        'stderr' => null,
        'tests' => [],
        'customTest' => null,
    ]);
});

it('presents a finished run as the example of the contract', function () {
    $run = presenterRun([
        'status' => 'passed', 'executor_phase' => 'run', 'exit_code' => '0', 'truncated' => '0', 'compile_ms' => '412', 'run_ms' => '31',
        'stdout' => "__TALLER_TEST__2f0c:t1:PASS\n", 'stderr' => '', 'started_at' => '2026-10-05 16:21:07.903', 'finished_at' => '2026-10-05 16:21:08.511',
        'program' => null, 'expires_at' => null,
    ]);
    $tests = [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Fail), new TestVerdict('t3', TestOutcome::Missing)];

    $json = (new RunPresenter)->present(new RunView($run, null, $tests, TestOutcome::Pass));

    expect($json['status'])->toBe('passed')
        ->and($json['queuePosition'])->toBeNull()
        ->and($json['startedAt'])->toBe('2026-10-05T16:21:07.903Z')
        ->and($json['finishedAt'])->toBe('2026-10-05T16:21:08.511Z')
        ->and($json['phase'])->toBe('run')
        ->and($json['exitCode'])->toBe(0)
        ->and($json['compileMs'])->toBe(412)
        ->and($json['runMs'])->toBe(31)
        ->and($json['truncated'])->toBeFalse()
        ->and($json['stdout'])->toBe("__TALLER_TEST__2f0c:t1:PASS\n")
        ->and($json['stderr'])->toBe('')
        ->and($json['tests'])->toBe([
            ['key' => 't1', 'outcome' => 'pass'],
            ['key' => 't2', 'outcome' => 'fail'],
            ['key' => 't3', 'outcome' => 'missing'],
        ])
        ->and($json['customTest'])->toBe('pass');
});

it('presents the reason of a run that ended without a verdict', function () {
    $run = presenterRun(['status' => 'infra_error', 'reason' => 'executor_busy', 'finished_at' => '2026-10-05 16:31:08.000', 'program' => null, 'expires_at' => null]);

    $json = (new RunPresenter)->present(new RunView($run, null, [], null));

    expect($json['status'])->toBe('infra_error')
        ->and($json['reason'])->toBe('executor_busy');
});

it('has exactly the eighteen keys of the contract and never the program, the code, the nonce or the test text', function () {
    $json = (new RunPresenter)->present(new RunView(presenterRun(), 1, [], TestOutcome::Fail));

    expect(array_keys($json))->toBe(CONTRACT_KEYS)
        ->and(json_encode($json))->not->toContain('SECRET')
        ->and(json_encode($json))->not->toContain(str_repeat('b', 32))
        ->and($json['customTest'])->toBe('fail');
});

it('keeps a test key made of digits as text', function () {
    $json = (new RunPresenter)->present(new RunView(presenterRun(), null, [new TestVerdict('123', TestOutcome::Pass)], null));

    expect($json['tests'][0]['key'])->toBe('123');
});
