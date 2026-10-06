<?php

use App\Runs\ExecutorPhase;
use App\Runs\Record\RunRow;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;

/** @return array<string, mixed> a row as the MySQL driver returns it: integers and dates as text */
function driverRunRow(array $overrides = []): array
{
    return [
        'id' => '0199c0a0-0000-7000-8000-000000000001',
        'user_id' => '7',
        'client_run_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'exercise_id' => 'rust-01',
        'language' => 'rust',
        'epoch' => '2',
        'grading_hash' => str_repeat('a', 64),
        'expected_tests' => '["t1","123","t7"]',
        'nonce' => str_repeat('b', 32),
        'code' => 'fn main() {}',
        'custom_test' => null,
        'program' => null,
        'status' => 'queued',
        'reason' => null,
        'executor_phase' => null,
        'exit_code' => null,
        'truncated' => null,
        'compile_ms' => null,
        'run_ms' => null,
        'stdout' => null,
        'stderr' => null,
        'attempt_id' => null,
        'cancel_requested_at' => null,
        'created_at' => '2026-10-05 12:00:00.123',
        'started_at' => null,
        'finished_at' => null,
        'expires_at' => '2026-10-05 12:10:00.123',
        ...$overrides,
    ];
}

it('builds a typed record from a driver row', function () {
    $run = RunRow::fromRow(driverRunRow());

    expect($run->userId)->toBe(7)
        ->and($run->epoch)->toBe(2)
        ->and($run->language)->toBe(RunLanguage::Rust)
        ->and($run->status)->toBe(RunStatus::Queued)
        ->and($run->expectedTests)->toBe(['t1', '123', 't7'])
        ->and($run->createdAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:00:00.123')
        ->and($run->expiresAt?->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:10:00.123');
});

it('leaves the nullable columns null', function () {
    $run = RunRow::fromRow(driverRunRow());

    expect($run->customTest)->toBeNull()
        ->and($run->program)->toBeNull()
        ->and($run->reason)->toBeNull()
        ->and($run->phase)->toBeNull()
        ->and($run->exitCode)->toBeNull()
        ->and($run->truncated)->toBeNull()
        ->and($run->compileMs)->toBeNull()
        ->and($run->runMs)->toBeNull()
        ->and($run->stdout)->toBeNull()
        ->and($run->stderr)->toBeNull()
        ->and($run->attemptId)->toBeNull()
        ->and($run->cancelRequestedAt)->toBeNull()
        ->and($run->startedAt)->toBeNull()
        ->and($run->finishedAt)->toBeNull();
});

it('reads a closed run with its outcome columns', function () {
    $run = RunRow::fromRow(driverRunRow([
        'status' => 'runtime_error', 'reason' => 'signal', 'executor_phase' => 'run', 'exit_code' => '-11', 'truncated' => '1',
        'compile_ms' => '412', 'run_ms' => '31', 'stdout' => 'out', 'stderr' => 'err', 'attempt_id' => '55',
        'started_at' => '2026-10-05 12:00:01.000', 'finished_at' => '2026-10-05 12:00:02.000', 'expires_at' => null,
        'cancel_requested_at' => '2026-10-05 12:00:01.500', 'program' => null, 'custom_test' => 'assert!(true)',
    ]));

    expect($run->status)->toBe(RunStatus::RuntimeError)
        ->and($run->reason)->toBe(RunReason::Signal)
        ->and($run->phase)->toBe(ExecutorPhase::Run)
        ->and($run->exitCode)->toBe(-11)
        ->and($run->truncated)->toBeTrue()
        ->and($run->compileMs)->toBe(412)
        ->and($run->runMs)->toBe(31)
        ->and($run->attemptId)->toBe(55)
        ->and($run->customTest)->toBe('assert!(true)')
        ->and($run->cancelRequestedAt?->format('H:i:s.v'))->toBe('12:00:01.500')
        ->and($run->expiresAt)->toBeNull();
});

it('rejects an unknown status', function () {
    RunRow::fromRow(driverRunRow(['status' => 'paused']));
})->throws(ValueError::class);

it('rejects a row that lacks a column instead of guessing', function () {
    $row = driverRunRow();
    unset($row['nonce']);

    RunRow::fromRow($row);
})->throws(LogicException::class, 'nonce');

it('rejects expected tests that are not a JSON list of texts', function (string $json) {
    RunRow::fromRow(driverRunRow(['expected_tests' => $json]));
})->with(['not json' => ['t1,t2'], 'an object' => ['{"a":"b"}'], 'numbers' => ['[1,2]']])->throws(LogicException::class);
