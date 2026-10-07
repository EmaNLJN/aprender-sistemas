<?php

use App\Runs\Execution\ActiveRuns;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

function activeStored(string $runId): RunRow
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]));
}

it('cancels the queued run and asks to cancel the running one, and counts both', function () {
    $user = RunWorld::user();
    $queued = RunWorld::run($user);
    $running = RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now()]);

    $count = app(ActiveRuns::class)->cancelAllOf($user->id);

    $storedQueued = activeStored($queued->id);
    $storedRunning = activeStored($running->id);
    expect($count)->toBe(2)
        ->and($storedQueued->status)->toBe(RunStatus::Canceled)
        ->and($storedQueued->reason)->toBe(RunReason::AccountDisabled)
        ->and($storedRunning->status)->toBe(RunStatus::Running)
        ->and($storedRunning->cancelRequestedAt)->not->toBeNull();
    RunInvariants::assertClean();
});

it('does not touch the runs of another account', function () {
    $user = RunWorld::user();
    $other = RunWorld::run(RunWorld::user());
    RunWorld::run($user);

    app(ActiveRuns::class)->cancelAllOf($user->id);

    expect(activeStored($other->id)->status)->toBe(RunStatus::Queued);
});

it('returns 0 for an account with no active runs', function () {
    $user = RunWorld::user();
    RunWorld::run($user, ['status' => 'infra_error', 'reason' => 'expired', 'finished_at' => Instant::now(), 'attempt_id' => null]);

    expect(app(ActiveRuns::class)->cancelAllOf($user->id))->toBe(0);
});

it('cancels a queued run with no reason when the caller passes null', function () {
    $user = RunWorld::user();
    $queued = RunWorld::run($user);

    $count = app(ActiveRuns::class)->cancelAllOf($user->id, null);

    $stored = activeStored($queued->id);
    expect($count)->toBe(1)
        ->and($stored->status)->toBe(RunStatus::Canceled)
        ->and($stored->reason)->toBeNull()
        ->and(DB::table('attempts')->where('id', $stored->attemptId)->value('reason'))->toBeNull();
    RunInvariants::assertClean();
});
