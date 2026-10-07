<?php

use App\Runs\CancelOutcome;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCanceller;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

function cancelStoredRun(string $runId): RunRow
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]));
}

it('closes a queued run as canceled at once, with an attempt that does not count and no progress change', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user);
    Log::spy();

    $outcome = app(RunCanceller::class)->cancel($user->id, $run->id);

    $stored = cancelStoredRun($run->id);
    expect($outcome)->toBe(CancelOutcome::Canceled)
        ->and($stored->status)->toBe(RunStatus::Canceled)
        ->and($stored->reason)->toBeNull()
        ->and($stored->attemptId)->not->toBeNull()
        ->and(DB::table('attempts')->value('counted'))->toBe(0)
        ->and(DB::table('exercise_progress')->count())->toBe(0)
        ->and((int) DB::table('progress_heads')->where('user_id', $user->id)->value('revision'))->toBe(0);
    Log::shouldHaveReceived('info')->with('run.closed', Mockery::any())->once();
    RunInvariants::assertClean();
});

it('stores the reason when a queued run is canceled with one', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user);

    app(RunCanceller::class)->cancel($user->id, $run->id, RunReason::AccountDisabled);

    expect(cancelStoredRun($run->id)->reason)->toBe(RunReason::AccountDisabled);
});

it('asks to cancel a running run once: asking again keeps the first time', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now()]);
    Log::spy();
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));

    $first = app(RunCanceller::class)->cancel($user->id, $run->id);
    $this->travelTo(Instant::parse('2026-10-05 12:00:09.000'));
    $second = app(RunCanceller::class)->cancel($user->id, $run->id);

    $stored = cancelStoredRun($run->id);
    expect($first)->toBe(CancelOutcome::Requested)
        ->and($second)->toBe(CancelOutcome::Requested)
        ->and($stored->status)->toBe(RunStatus::Running)
        ->and($stored->cancelRequestedAt)->toEqual(Instant::parse('2026-10-05 12:00:00.000'))
        ->and(DB::table('attempts')->count())->toBe(0);
    Log::shouldHaveReceived('info')->with('run.cancel_requested', Mockery::any())->once();
    RunInvariants::assertClean();
});

it('makes the later close canceled even if the sandbox reports a pass', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now()]);
    app(RunCanceller::class)->cancel($user->id, $run->id);
    $passed = new Verdict(
        RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 1, 1, 'ok', '',
        [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Pass), new TestVerdict('t3', TestOutcome::Pass)], null,
    );

    app(RunCloser::class)->close($run->id, $passed);

    expect(cancelStoredRun($run->id)->status)->toBe(RunStatus::Canceled)
        ->and(DB::table('exercise_progress')->count())->toBe(0);
});

it('changes nothing for a run that already finished', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now()]);
    app(RunCloser::class)->close($run->id, Verdict::infraError(RunReason::ExecutorError));
    $before = cancelStoredRun($run->id);

    $outcome = app(RunCanceller::class)->cancel($user->id, $run->id);

    expect($outcome)->toBe(CancelOutcome::Unchanged)
        ->and(cancelStoredRun($run->id))->toEqual($before)
        ->and(DB::table('attempts')->count())->toBe(1);
});

it('says NotFound for the run of another account without taking its head', function () {
    $owner = RunWorld::user();
    $stranger = RunWorld::user();
    $run = RunWorld::run($owner);

    $outcome = app(RunCanceller::class)->cancel($stranger->id, $run->id);

    expect($outcome)->toBe(CancelOutcome::NotFound)
        ->and(cancelStoredRun($run->id)->status)->toBe(RunStatus::Queued)
        ->and(DB::table('progress_heads')->where('user_id', $stranger->id)->exists())->toBeFalse();
});

it('says NotFound for a run that does not exist', function () {
    expect(app(RunCanceller::class)->cancel(RunWorld::user()->id, '01990000-0000-7000-8000-000000000000'))->toBe(CancelOutcome::NotFound);
});
