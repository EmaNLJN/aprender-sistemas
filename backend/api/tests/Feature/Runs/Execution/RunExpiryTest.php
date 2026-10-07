<?php

use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\Execution\RunExpiry;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

const EXPIRY_CREATED = '2026-10-05 12:00:00.000';
const EXPIRY_NOW = '2026-10-05 12:11:00.000';

/** @param array<string, mixed> $overrides */
function expiryRun(array $overrides = []): RunRow
{
    test()->travelTo(Instant::parse(EXPIRY_CREATED));
    $run = RunWorld::run(RunWorld::user(), $overrides);
    test()->travelTo(Instant::parse(EXPIRY_NOW));

    return $run;
}

function expiryStored(string $runId): RunRow
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]));
}

function expiredRunning(): array
{
    return ['status' => 'running', 'started_at' => Instant::parse('2026-10-05 12:00:05.000'), 'expires_at' => Instant::parse('2026-10-05 12:02:25.000')];
}

it('closes a queued run past 600 seconds and a running one past 140 as infra_error expired, with an attempt', function (array $overrides) {
    $run = expiryRun($overrides);

    $closed = app(RunExpiry::class)->expire($run->id);

    $stored = expiryStored($run->id);
    expect($closed)->toBeTrue()
        ->and($stored->status)->toBe(RunStatus::InfraError)
        ->and($stored->reason)->toBe(RunReason::Expired)
        ->and($stored->attemptId)->not->toBeNull()
        ->and($stored->finishedAt)->toEqual(Instant::parse(EXPIRY_NOW));
    RunInvariants::assertClean();
})->with([
    'queued' => [[]],
    'running' => [fn () => expiredRunning()],
]);

it('does not touch a run whose deadline has not passed, as when it was requeued or claimed in between', function () {
    $run = expiryRun(['status' => 'running', 'started_at' => Instant::parse('2026-10-05 12:10:30.000'), 'expires_at' => Instant::parse('2026-10-05 12:12:50.000')]);

    expect(app(RunExpiry::class)->expire($run->id))->toBeFalse()
        ->and(expiryStored($run->id)->status)->toBe(RunStatus::Running)
        ->and(DB::table('attempts')->count())->toBe(0);
});

it('closes as canceled an expired run whose cancellation was requested', function () {
    $run = expiryRun([...expiredRunning(), 'cancel_requested_at' => Instant::parse('2026-10-05 12:01:00.000')]);

    app(RunExpiry::class)->expire($run->id);

    expect(expiryStored($run->id)->status)->toBe(RunStatus::Canceled);
    RunInvariants::assertClean();
});

it('does not touch a finished run', function () {
    $run = expiryRun(expiredRunning());
    app(RunCloser::class)->close($run->id, Verdict::infraError(RunReason::ExecutorError));

    expect(app(RunExpiry::class)->expire($run->id))->toBeFalse()
        ->and(expiryStored($run->id)->reason)->toBe(RunReason::ExecutorError);
});

it('has nothing to expire for a run that does not exist or whose account is gone', function () {
    $orphan = RunWorld::orphanRun(RunWorld::user());

    expect(app(RunExpiry::class)->expire('01990000-0000-7000-8000-000000000000'))->toBeFalse()
        ->and(app(RunExpiry::class)->expire($orphan->id))->toBeFalse();
});

it('sweeps the expired active runs up to the limit and returns how many it closed', function () {
    $this->travelTo(Instant::parse(EXPIRY_CREATED));
    $expired = [RunWorld::run(RunWorld::user())->id, RunWorld::run(RunWorld::user())->id, RunWorld::run(RunWorld::user())->id];
    $fresh = RunWorld::run(RunWorld::user(), ['expires_at' => Instant::parse('2026-10-05 12:20:00.000')]);
    $this->travelTo(Instant::parse(EXPIRY_NOW));

    $first = app(RunExpiry::class)->sweep(2);
    $second = app(RunExpiry::class)->sweep(100);

    $statuses = DB::table('runs')->whereIn('id', $expired)->pluck('status')->all();
    expect($first)->toBe(2)
        ->and($second)->toBe(1)
        ->and($statuses)->toBe(['infra_error', 'infra_error', 'infra_error'])
        ->and(expiryStored($fresh->id)->status)->toBe(RunStatus::Queued);
    RunInvariants::assertClean();
});

it('uses the PHP clock, not the database one', function () {
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));
    $run = RunWorld::run(RunWorld::user(), ['expires_at' => Instant::parse('2026-10-05 12:10:00.000')]);

    $this->travelTo(Instant::parse('2026-10-05 12:09:59.000'));
    expect(app(RunExpiry::class)->sweep(100))->toBe(0);
    $this->travelTo(Instant::parse('2026-10-05 12:10:01.000'));
    expect(app(RunExpiry::class)->sweep(100))->toBe(1)
        ->and(expiryStored($run->id)->status)->toBe(RunStatus::InfraError);
});
