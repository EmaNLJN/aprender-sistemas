<?php

use App\Runs\Execution\ProgressMerge;
use App\Runs\Record\AttemptFacts;
use App\Runs\Record\Instant;
use App\Runs\Record\RunProgress;
use App\Runs\RunStatus;
use Carbon\CarbonImmutable;

function mergeInstant(string $time): CarbonImmutable
{
    return Instant::parse("2026-10-05 {$time}.000");
}

function mergeAttempt(int $id, RunStatus $outcome, string $time): AttemptFacts
{
    return new AttemptFacts($id, 1, 'rust-01', $outcome, $outcome->countsAsAttempt(), mergeInstant($time));
}

function mergeProgress(
    ?string $solved = null,
    ?string $serverSolved = null,
    ?int $proofId = null,
    ?string $proofAt = null,
    ?int $lastId = null,
    ?string $lastAt = null,
    int $count = 0,
    int $revision = 3,
): RunProgress {
    return new RunProgress(
        1, 'rust-01', $solved === null ? null : mergeInstant($solved), $serverSolved === null ? null : mergeInstant($serverSolved),
        $proofId, $proofAt === null ? null : mergeInstant($proofAt), $lastId, $lastAt === null ? null : mergeInstant($lastAt), $count, $revision,
    );
}

it('creates the row of the first failed attempt with its last attempt, one count and no resolution', function () {
    $merged = (new ProgressMerge)->afterAttempt(null, mergeAttempt(5, RunStatus::Failed, '10:00:00'), 7);

    expect($merged)->toEqual(mergeProgress(lastId: 5, lastAt: '10:00:00', count: 1, revision: 7));
});

it('resolves the exercise with the date of the first passed attempt', function () {
    $merged = (new ProgressMerge)->afterAttempt(null, mergeAttempt(5, RunStatus::Passed, '10:00:00'), 7);

    expect($merged)->toEqual(mergeProgress('10:00:00', '10:00:00', 5, '10:00:00', 5, '10:00:00', 1, 7));
});

it('keeps the earliest resolution on a later pass and moves the proof and the last attempt', function () {
    $current = mergeProgress('10:00:00', '10:00:00', 5, '10:00:00', 5, '10:00:00', 1, 7);

    $merged = (new ProgressMerge)->afterAttempt($current, mergeAttempt(6, RunStatus::Passed, '11:00:00'), 8);

    expect($merged)->toEqual(mergeProgress('10:00:00', '10:00:00', 6, '11:00:00', 6, '11:00:00', 2, 8));
});

it('lowers the resolution when a pass that was accepted earlier closes later, and keeps the newer proof and last attempt', function () {
    $current = mergeProgress('11:00:00', '11:00:00', 6, '11:00:00', 6, '11:00:00', 1, 7);

    $merged = (new ProgressMerge)->afterAttempt($current, mergeAttempt(5, RunStatus::Passed, '10:00:00'), 8);

    expect($merged)->toEqual(mergeProgress('10:00:00', '10:00:00', 6, '11:00:00', 6, '11:00:00', 2, 8));
});

it('breaks a tie of dates with the greater attempt id', function () {
    $current = mergeProgress(null, null, null, null, 5, '10:00:00', 1, 7);

    $greater = (new ProgressMerge)->afterAttempt($current, mergeAttempt(6, RunStatus::Failed, '10:00:00'), 8);
    $smaller = (new ProgressMerge)->afterAttempt($current, mergeAttempt(4, RunStatus::Failed, '10:00:00'), 8);

    expect($greater?->lastAttemptId)->toBe(6)
        ->and($smaller?->lastAttemptId)->toBe(5)
        ->and($smaller?->attemptCount)->toBe(2);
});

it('sets the server resolution but leaves the imported one when the pass is later than the import', function () {
    $current = mergeProgress('09:00:00', null, null, null, null, null, 0, 7);

    $merged = (new ProgressMerge)->afterAttempt($current, mergeAttempt(5, RunStatus::Passed, '10:00:00'), 8);

    expect($merged?->solvedAt)->toEqual(mergeInstant('09:00:00'))
        ->and($merged?->serverSolvedAt)->toEqual(mergeInstant('10:00:00'));
});

it('moves the last attempt on a newer infra_error without changing the count', function () {
    $current = mergeProgress(null, null, null, null, 5, '10:00:00', 1, 7);

    $merged = (new ProgressMerge)->afterAttempt($current, mergeAttempt(6, RunStatus::InfraError, '11:00:00'), 8);

    expect($merged)->toEqual(mergeProgress(null, null, null, null, 6, '11:00:00', 1, 8));
});

it('changes nothing on an infra_error older than the last attempt', function () {
    $current = mergeProgress(null, null, null, null, 5, '10:00:00', 1, 7);

    expect((new ProgressMerge)->afterAttempt($current, mergeAttempt(4, RunStatus::InfraError, '09:00:00'), 8))->toBeNull();
});

it('changes nothing when the same uncounted attempt is merged again', function () {
    $current = mergeProgress(null, null, null, null, 6, '11:00:00', 1, 7);

    expect((new ProgressMerge)->afterAttempt($current, mergeAttempt(6, RunStatus::InfraError, '11:00:00'), 8))->toBeNull();
});

it('never merges a canceled attempt', function () {
    expect((new ProgressMerge)->afterAttempt(null, mergeAttempt(5, RunStatus::Canceled, '10:00:00'), 7))->toBeNull()
        ->and((new ProgressMerge)->afterAttempt(mergeProgress(lastId: 4, lastAt: '09:00:00', count: 1), mergeAttempt(5, RunStatus::Canceled, '10:00:00'), 7))->toBeNull();
});
