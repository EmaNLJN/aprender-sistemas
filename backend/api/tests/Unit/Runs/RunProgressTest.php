<?php

use App\Progress\ProgressHead;
use App\Runs\Record\RunProgress;

it('builds the progress of an exercise from a driver row, ignoring the columns D1 owns', function () {
    $progress = RunProgress::fromRow([
        'user_id' => '7', 'exercise_id' => 'rust-01', 'solved_at' => '2026-10-05 12:00:00.001', 'server_solved_at' => '2026-10-05 12:00:00.002',
        'proof_attempt_id' => '11', 'proof_at' => '2026-10-05 12:00:00.003', 'last_attempt_id' => '12', 'last_attempt_at' => '2026-10-05 12:00:00.004',
        'attempt_count' => '3', 'revision' => '9', 'reflection' => 'una reflexión',
    ]);

    expect($progress->userId)->toBe(7)
        ->and($progress->exerciseId)->toBe('rust-01')
        ->and($progress->solvedAt?->format('H:i:s.v'))->toBe('12:00:00.001')
        ->and($progress->serverSolvedAt?->format('H:i:s.v'))->toBe('12:00:00.002')
        ->and($progress->proofAttemptId)->toBe(11)
        ->and($progress->proofAt?->format('H:i:s.v'))->toBe('12:00:00.003')
        ->and($progress->lastAttemptId)->toBe(12)
        ->and($progress->lastAttemptAt?->format('H:i:s.v'))->toBe('12:00:00.004')
        ->and($progress->attemptCount)->toBe(3)
        ->and($progress->revision)->toBe(9);
});

it('reads a fresh progress row with its nulls', function () {
    $progress = RunProgress::fromRow([
        'user_id' => '7', 'exercise_id' => 'rust-01', 'solved_at' => null, 'server_solved_at' => null, 'proof_attempt_id' => null,
        'proof_at' => null, 'last_attempt_id' => null, 'last_attempt_at' => null, 'attempt_count' => '0', 'revision' => '0',
    ]);

    expect($progress->solvedAt)->toBeNull()
        ->and($progress->serverSolvedAt)->toBeNull()
        ->and($progress->proofAttemptId)->toBeNull()
        ->and($progress->proofAt)->toBeNull()
        ->and($progress->lastAttemptId)->toBeNull()
        ->and($progress->lastAttemptAt)->toBeNull()
        ->and($progress->attemptCount)->toBe(0);
});

it('rejects a progress row that lacks a column', function () {
    RunProgress::fromRow(['user_id' => '7']);
})->throws(LogicException::class);

it('builds an account head from a driver row', function () {
    $head = ProgressHead::fromRow([
        'user_id' => '7', 'epoch' => '2', 'revision' => '15', 'reset_at' => '2026-10-04 08:30:00.000', 'last_activity_at' => '2026-10-05 12:00:00.123',
    ]);

    expect($head->userId)->toBe(7)
        ->and($head->epoch)->toBe(2)
        ->and($head->revision)->toBe(15)
        ->and($head->resetAt?->format('Y-m-d H:i:s.v'))->toBe('2026-10-04 08:30:00.000')
        ->and($head->lastActivityAt?->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:00:00.123');
});

it('reads a head that was just created, with no reset and no activity', function () {
    $head = ProgressHead::fromRow(['user_id' => '7', 'epoch' => '1', 'revision' => '0', 'reset_at' => null, 'last_activity_at' => null]);

    expect($head->resetAt)->toBeNull()
        ->and($head->lastActivityAt)->toBeNull();
});
