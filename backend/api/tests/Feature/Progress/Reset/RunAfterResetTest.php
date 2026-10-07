<?php

use App\Models\User;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;
use Tests\Support\Sync\SyncDevice;

const RUN_AFTER_RESET_PASSWORD = 'correct horse battery';

function runAfterResetPassedVerdict(): Verdict
{
    return new Verdict(
        RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 10, 10, 'ok', '',
        [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Pass), new TestVerdict('t3', TestOutcome::Pass)], null,
    );
}

beforeEach(function () {
    useSampleBlockedPasswords();
    ProgressWorld::seed(MergeFixture::world());
    $this->user = User::factory()->withPassword(RUN_AFTER_RESET_PASSWORD)->create();
    $this->device = SyncDevice::signedIn($this, $this->user);
    $this->device->browser->post('/api/auth/confirm-password', ['password' => RUN_AFTER_RESET_PASSWORD])->assertCreated();
    $this->activeRun = RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01', 'status' => 'running', 'started_at' => Instant::now()]);
});

function runAfterResetAssertNewEpochUntouched(SyncDevice $device, int $revisionAfterReset): void
{
    $photo = $device->snapshot()->assertOk();
    expect($photo->json('epoch'))->toBe(2)
        ->and($photo->json('revision'))->toBe($revisionAfterReset)
        ->and($photo->json('exercises'))->toBe([])
        ->and(DB::table('exercise_progress')->where('user_id', $device->user->id)->count())->toBe(0)
        ->and((int) DB::table('progress_heads')->where('user_id', $device->user->id)->value('revision'))->toBe($revisionAfterReset);
    ProgressInvariants::assertClean($device->user->id);
    RunInvariants::assertClean();
}

it('leaves a canceled attempt in the old epoch when the reset asked to cancel the run that closes later with a pass', function () {
    $revision = $this->device->browser->post('/api/progress/reset', ['format' => 2, 'epoch' => 1])->assertOk()->json('revision');
    $requestedAt = DB::table('runs')->where('id', $this->activeRun->id)->value('cancel_requested_at');

    $closed = app(RunCloser::class)->close($this->activeRun->id, runAfterResetPassedVerdict());

    $attempt = DB::table('attempts')->where('id', DB::table('runs')->where('id', $this->activeRun->id)->value('attempt_id'))->first();
    expect($requestedAt)->not->toBeNull()
        ->and($closed)->toBeTrue()
        ->and([$attempt->outcome, $attempt->epoch])->toBe(['canceled', 1]);
    runAfterResetAssertNewEpochUntouched($this->device, $revision);
});

it('leaves a passed attempt in the old epoch when the cancellation failed', function () {
    $armed = true;
    DB::beforeExecuting(function (string $query) use (&$armed) {
        if ($armed && str_contains($query, 'from `runs`')) {
            throw new RuntimeException('runs unavailable');
        }
    });
    $revision = $this->device->browser->post('/api/progress/reset', ['format' => 2, 'epoch' => 1])->assertOk()->json('revision');
    $armed = false;
    $requestedAt = DB::table('runs')->where('id', $this->activeRun->id)->value('cancel_requested_at');

    $closed = app(RunCloser::class)->close($this->activeRun->id, runAfterResetPassedVerdict());

    $attempt = DB::table('attempts')->where('id', DB::table('runs')->where('id', $this->activeRun->id)->value('attempt_id'))->first();
    expect($requestedAt)->toBeNull()
        ->and($closed)->toBeTrue()
        ->and([$attempt->outcome, $attempt->epoch])->toBe(['passed', 1]);
    runAfterResetAssertNewEpochUntouched($this->device, $revision);
});
