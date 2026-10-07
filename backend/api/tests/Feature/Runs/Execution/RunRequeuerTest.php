<?php

use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RequeueOutcome;
use App\Runs\Execution\RunCloser;
use App\Runs\Execution\RunRequeuer;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

const REQUEUE_ACCEPTED = '2026-10-05 12:00:00.000';
const REQUEUE_NOW = '2026-10-05 12:01:40.000';

/** @param array<string, mixed> $overrides */
function requeueRunning(array $overrides = [], string $now = REQUEUE_NOW): RunRow
{
    test()->travelTo(Instant::parse(REQUEUE_ACCEPTED));
    $run = RunWorld::run(RunWorld::user(), ['status' => 'running', 'started_at' => Instant::parse('2026-10-05 12:00:05.000'), 'expires_at' => Instant::parse('2026-10-05 12:02:25.000'), ...$overrides]);
    test()->travelTo(Instant::parse($now));

    return $run;
}

function requeueStored(string $runId): RunRow
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]));
}

it('puts a running run back in the queue with its first deadline and a new delayed job', function () {
    $run = requeueRunning();

    $outcome = app(RunRequeuer::class)->requeue($run, 5);

    $stored = requeueStored($run->id);
    $job = DB::selectOne('select * from jobs');
    expect($outcome)->toBe(RequeueOutcome::Requeued)
        ->and($stored->status)->toBe(RunStatus::Queued)
        ->and($stored->startedAt)->toBeNull()
        ->and($stored->expiresAt)->toEqual(Instant::parse('2026-10-05 12:10:00.000'))
        ->and($stored->program)->toBe('fn main() {}')
        ->and(DB::table('jobs')->count())->toBe(1)
        ->and($job->queue)->toBe('runs')
        ->and($job->available_at)->toBe(Instant::parse(REQUEUE_NOW)->addSeconds(5)->getTimestamp())
        ->and(str_contains($job->payload, $run->id))->toBeTrue();
    RunInvariants::assertClean();
});

it('bounds the delay between 1 and 30 seconds', function (int $asked, int $used) {
    $run = requeueRunning();

    app(RunRequeuer::class)->requeue($run, $asked);

    expect(DB::table('jobs')->value('available_at'))->toBe(Instant::parse(REQUEUE_NOW)->addSeconds($used)->getTimestamp());
})->with([[0, 1], [500, 30], [12, 12]]);

it('commits the state change and the job together or nothing', function () {
    $run = requeueRunning();
    config(['queue.connections.runs.table' => 'no_existe']);

    expect(fn () => app(RunRequeuer::class)->requeue($run, 5))->toThrow(RunWriteFailed::class);

    expect(requeueStored($run->id)->status)->toBe(RunStatus::Running);
});

it('closes as infra_error executor_busy when 600 seconds passed since the acceptance', function () {
    $run = requeueRunning(now: '2026-10-05 12:10:01.000');

    $outcome = app(RunRequeuer::class)->requeue($run, 5);

    $stored = requeueStored($run->id);
    expect($outcome)->toBe(RequeueOutcome::Closed)
        ->and($stored->status)->toBe(RunStatus::InfraError)
        ->and($stored->reason)->toBe(RunReason::ExecutorBusy)
        ->and(DB::table('jobs')->count())->toBe(0);
    RunInvariants::assertClean();
});

it('closes as canceled a run whose cancellation was requested', function () {
    $run = requeueRunning(['cancel_requested_at' => Instant::parse('2026-10-05 12:01:00.000')]);

    $outcome = app(RunRequeuer::class)->requeue($run, 5);

    expect($outcome)->toBe(RequeueOutcome::Closed)
        ->and(requeueStored($run->id)->status)->toBe(RunStatus::Canceled)
        ->and(DB::table('jobs')->count())->toBe(0);
    RunInvariants::assertClean();
});

it('reports Gone when the sweep already closed the run', function () {
    $run = requeueRunning();
    app(RunCloser::class)->close($run->id, Verdict::infraError(RunReason::Expired));

    expect(app(RunRequeuer::class)->requeue($run, 5))->toBe(RequeueOutcome::Gone)
        ->and(DB::table('jobs')->count())->toBe(0);
});

it('reports Gone when the account was deleted', function () {
    test()->travelTo(Instant::parse(REQUEUE_NOW));
    $run = RunWorld::orphanRun(RunWorld::user(), ['status' => 'running', 'started_at' => Instant::now()]);

    expect(app(RunRequeuer::class)->requeue($run, 5))->toBe(RequeueOutcome::Gone);
});
