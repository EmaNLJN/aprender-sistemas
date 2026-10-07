<?php

use App\Models\User;
use App\Progress\ProgressHead;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\Record\RunProgress;
use App\Runs\Record\RunRow;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

const CLOSER_ACCEPTED = '2026-10-05 12:00:00.100';
const CLOSER_STARTED = '2026-10-05 12:00:01.200';
const CLOSER_CLOSED = '2026-10-05 12:00:03.456';

/** @param list<TestVerdict> $tests */
function closerVerdict(
    RunStatus $status,
    array $tests = [],
    ?RunReason $reason = null,
    ?ExecutorPhase $phase = ExecutorPhase::Run,
    ?int $exitCode = 0,
    string $stdout = 'salida',
    string $stderr = 'error',
    ?TestOutcome $custom = null,
): Verdict {
    return new Verdict($status, $reason, $phase, $exitCode, true, 40, 15, $stdout, $stderr, $tests, $custom);
}

/** @return list<TestVerdict> */
function closerAllPass(): array
{
    return [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Pass), new TestVerdict('t3', TestOutcome::Pass)];
}

/** @param array<string, mixed> $overrides */
function closerRunning(User $user, array $overrides = []): RunRow
{
    test()->travelTo(Instant::parse(CLOSER_ACCEPTED));
    $run = RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::parse(CLOSER_STARTED), 'expires_at' => Instant::parse('2026-10-05 12:02:21.200'), ...$overrides]);
    test()->travelTo(Instant::parse(CLOSER_CLOSED));

    return $run;
}

function closerProgress(int $userId, string $exerciseId = 'rust-01'): ?RunProgress
{
    $row = DB::selectOne('select * from exercise_progress where user_id = ? and exercise_id = ?', [$userId, $exerciseId]);

    return $row === null ? null : RunProgress::fromRow((array) $row);
}

function closerHeadRevision(int $userId): int
{
    return ProgressHead::fromRow((array) DB::selectOne('select * from progress_heads where user_id = ?', [$userId]))->revision;
}

function closerStoredRun(string $runId): RunRow
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]));
}

it('closes a passed run with its attempt, verdicts, payload and progress', function () {
    $user = RunWorld::user();
    $run = closerRunning($user, ['code' => 'let código = "ñ";', 'custom_test' => 'assert!(true)']);
    $verdict = closerVerdict(RunStatus::Passed, closerAllPass(), custom: TestOutcome::Pass, stdout: 'completa');

    $closed = app(RunCloser::class)->close($run->id, $verdict);

    $stored = closerStoredRun($run->id);
    $attempt = DB::selectOne('select * from attempts where id = ?', [$stored->attemptId]);
    expect($closed)->toBeTrue()
        ->and($stored->status)->toBe(RunStatus::Passed)
        ->and($stored->reason)->toBeNull()
        ->and($stored->phase)->toBe(ExecutorPhase::Run)
        ->and($stored->exitCode)->toBe(0)
        ->and($stored->truncated)->toBeTrue()
        ->and($stored->compileMs)->toBe(40)
        ->and($stored->runMs)->toBe(15)
        ->and($stored->stdout)->toBe('completa')
        ->and($stored->stderr)->toBe('error')
        ->and($stored->program)->toBeNull()
        ->and($stored->expiresAt)->toBeNull()
        ->and($stored->finishedAt)->toEqual(Instant::parse(CLOSER_CLOSED))
        ->and(DB::table('attempts')->count())->toBe(1)
        ->and($attempt->user_id)->toBe($user->id)
        ->and($attempt->exercise_id)->toBe('rust-01')
        ->and($attempt->epoch)->toBe(1)
        ->and($attempt->outcome)->toBe('passed')
        ->and($attempt->counted)->toBe(1)
        ->and($attempt->legacy)->toBe(0)
        ->and($attempt->grading_hash)->toBe($run->gradingHash)
        ->and($attempt->code_sha256)->toBe(hash('sha256', 'let código = "ñ";'))
        ->and($attempt->custom_outcome)->toBe('pass')
        ->and($attempt->output_truncated)->toBe(1)
        ->and($attempt->executor_phase)->toBe('run')
        ->and($attempt->attempted_at)->toBe(CLOSER_ACCEPTED)
        ->and($attempt->started_at)->toBe(CLOSER_STARTED)
        ->and($attempt->finished_at)->toBe(CLOSER_CLOSED)
        ->and($attempt->created_at)->toBe(CLOSER_CLOSED);

    $tests = DB::table('attempt_tests')->where('attempt_id', $stored->attemptId)->orderBy('position')->get();
    expect($tests->pluck('test_key')->all())->toBe(['t1', 't2', 't3'])
        ->and($tests->pluck('position')->all())->toBe([1, 2, 3])
        ->and($tests->pluck('outcome')->unique()->all())->toBe(['pass'])
        ->and($tests->pluck('exercise_id')->unique()->all())->toBe(['rust-01']);

    $payload = DB::selectOne('select * from attempt_payloads where attempt_id = ?', [$stored->attemptId]);
    expect($payload->code)->toBe('let código = "ñ";')
        ->and($payload->custom_test)->toBe('assert!(true)')
        ->and($payload->stdout)->toBe('completa')
        ->and($payload->stderr)->toBe('error');

    $progress = closerProgress($user->id);
    expect($progress?->solvedAt)->toEqual(Instant::parse(CLOSER_ACCEPTED))
        ->and($progress?->serverSolvedAt)->toEqual(Instant::parse(CLOSER_ACCEPTED))
        ->and($progress?->proofAttemptId)->toBe($stored->attemptId)
        ->and($progress?->lastAttemptId)->toBe($stored->attemptId)
        ->and($progress?->attemptCount)->toBe(1)
        ->and(closerHeadRevision($user->id))->toBe(1)
        ->and($progress?->revision)->toBe(1);
    RunInvariants::assertClean();
});

it('closes a failed run with evidence, counting the attempt and recording its verdicts', function () {
    $user = RunWorld::user();
    $run = closerRunning($user);
    $tests = [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Fail), new TestVerdict('t3', TestOutcome::Missing)];

    app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::Failed, $tests));

    $progress = closerProgress($user->id);
    expect(DB::table('attempt_tests')->orderBy('position')->pluck('outcome')->all())->toBe(['pass', 'fail', 'missing'])
        ->and(DB::table('attempts')->value('outcome'))->toBe('failed')
        ->and($progress?->attemptCount)->toBe(1)
        ->and($progress?->solvedAt)->toBeNull()
        ->and($progress?->lastAttemptId)->not->toBeNull()
        ->and($progress?->proofAttemptId)->toBeNull();
    RunInvariants::assertClean();
});

it('counts a compile error, a runtime error or a timeout without verdicts', function (RunStatus $status, ?RunReason $reason) {
    $user = RunWorld::user();
    $run = closerRunning($user);

    app(RunCloser::class)->close($run->id, closerVerdict($status, reason: $reason, exitCode: 1));

    expect(DB::table('attempts')->value('counted'))->toBe(1)
        ->and(DB::table('attempt_tests')->count())->toBe(0)
        ->and(closerProgress($user->id)?->attemptCount)->toBe(1)
        ->and(closerHeadRevision($user->id))->toBe(1);
    RunInvariants::assertClean();
})->with([
    'compile error' => [RunStatus::CompileError, null],
    'runtime error' => [RunStatus::RuntimeError, RunReason::Signal],
    'timeout' => [RunStatus::Timeout, null],
]);

it('does not count an infra_error but moves the last attempt and raises the revision', function () {
    $user = RunWorld::user();
    $run = closerRunning($user);

    app(RunCloser::class)->close($run->id, Verdict::infraError(RunReason::ExecutorError));

    $stored = closerStoredRun($run->id);
    $progress = closerProgress($user->id);
    expect($stored->status)->toBe(RunStatus::InfraError)
        ->and($stored->reason)->toBe(RunReason::ExecutorError)
        ->and(DB::table('attempts')->value('counted'))->toBe(0)
        ->and(DB::table('attempt_payloads')->where('attempt_id', $stored->attemptId)->value('stdout'))->toBe('')
        ->and($progress?->lastAttemptId)->toBe($stored->attemptId)
        ->and($progress?->attemptCount)->toBe(0)
        ->and(closerHeadRevision($user->id))->toBe(1)
        ->and($progress?->revision)->toBe(1);
    RunInvariants::assertClean();
});

it('leaves the progress and the revision alone for a canceled run, but records the attempt', function () {
    $user = RunWorld::user();
    $run = closerRunning($user);

    app(RunCloser::class)->close($run->id, Verdict::canceled(RunReason::AccountDisabled));

    expect(closerStoredRun($run->id)->status)->toBe(RunStatus::Canceled)
        ->and(DB::table('attempts')->value('counted'))->toBe(0)
        ->and(DB::table('attempts')->value('reason'))->toBe('account_disabled')
        ->and(DB::table('exercise_progress')->count())->toBe(0)
        ->and(closerHeadRevision($user->id))->toBe(0);
    RunInvariants::assertClean();
});

it('cuts the payload by characters and keeps the full output in the run', function () {
    $user = RunWorld::user();
    $run = closerRunning($user);
    $stdout = str_repeat('a', 20000);
    $stderr = str_repeat('ñ', 20000);

    app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::RuntimeError, stdout: $stdout, stderr: $stderr));

    $payload = DB::selectOne('select * from attempt_payloads');
    $stored = closerStoredRun($run->id);
    expect(mb_strlen($payload->stdout))->toBe(12000)
        ->and(mb_strlen($payload->stderr))->toBe(18000)
        ->and($stored->stdout)->toBe($stdout)
        ->and($stored->stderr)->toBe($stderr);
});

it('keeps 12000 characters of a multibyte stdout, not 12000 bytes', function () {
    $run = closerRunning(RunWorld::user());

    app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::RuntimeError, stdout: str_repeat('ñ', 13000)));

    expect(DB::table('attempt_payloads')->value('stdout'))->toBe(str_repeat('ñ', 12000));
});

it('returns false for a second close and leaves one attempt', function () {
    $user = RunWorld::user();
    $run = closerRunning($user);
    $closer = app(RunCloser::class);

    $first = $closer->close($run->id, closerVerdict(RunStatus::Passed, closerAllPass()));
    $second = $closer->close($run->id, closerVerdict(RunStatus::Passed, closerAllPass()));

    expect($first)->toBeTrue()
        ->and($second)->toBeFalse()
        ->and(DB::table('attempts')->count())->toBe(1)
        ->and(closerProgress($user->id)?->attemptCount)->toBe(1)
        ->and(closerHeadRevision($user->id))->toBe(1);
    RunInvariants::assertClean();
});

it('turns a passed verdict into canceled when the owner asked to cancel, keeping what the sandbox reported', function () {
    $user = RunWorld::user();
    $run = closerRunning($user, ['cancel_requested_at' => Instant::parse('2026-10-05 12:00:02.000')]);

    app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::Passed, closerAllPass(), stdout: 'lo que dijo el sandbox'));

    $stored = closerStoredRun($run->id);
    expect($stored->status)->toBe(RunStatus::Canceled)
        ->and($stored->reason)->toBeNull()
        ->and($stored->phase)->toBe(ExecutorPhase::Run)
        ->and($stored->exitCode)->toBe(0)
        ->and($stored->stdout)->toBe('lo que dijo el sandbox')
        ->and(DB::table('attempts')->value('counted'))->toBe(0)
        ->and(DB::table('attempt_tests')->count())->toBe(0)
        ->and(DB::table('exercise_progress')->count())->toBe(0)
        ->and(closerHeadRevision($user->id))->toBe(0);
    RunInvariants::assertClean();
});

it('records the attempt of a run from an older epoch without touching the progress or the revision', function () {
    $user = RunWorld::user();
    $run = closerRunning($user);
    DB::table('progress_heads')->insert(['user_id' => $user->id, 'epoch' => 2, 'revision' => 5, 'created_at' => CLOSER_ACCEPTED, 'updated_at' => CLOSER_ACCEPTED]);

    app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::Passed, closerAllPass()));

    expect(DB::table('attempts')->value('epoch'))->toBe(1)
        ->and(DB::table('attempts')->value('outcome'))->toBe('passed')
        ->and(DB::table('attempt_payloads')->count())->toBe(1)
        ->and(DB::table('exercise_progress')->count())->toBe(0)
        ->and(closerHeadRevision($user->id))->toBe(5);
    RunInvariants::assertClean();
});

it('closes a run of an exercise that was retired while it ran', function () {
    $user = RunWorld::user();
    $run = closerRunning($user);
    DB::table('exercises')->where('id', 'rust-01')->update(['status' => 'deprecated', 'retired_at' => CLOSER_ACCEPTED, 'position' => null]);

    $closed = app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::Passed, closerAllPass()));

    expect($closed)->toBeTrue()
        ->and(DB::table('attempts')->value('exercise_id'))->toBe('rust-01');
});

it('has nothing to close when the account was deleted between the read and the lock', function () {
    $run = RunWorld::orphanRun(RunWorld::user());

    expect(app(RunCloser::class)->close($run->id, Verdict::infraError(RunReason::ExecutorError)))->toBeFalse()
        ->and(DB::table('attempts')->count())->toBe(0);
});

it('has nothing to close when the run no longer exists', function () {
    expect(app(RunCloser::class)->close('01990000-0000-7000-8000-000000000000', Verdict::infraError(RunReason::ExecutorError)))->toBeFalse();
});

it('logs one run.closed per close and none when nothing closed', function () {
    $run = closerRunning(RunWorld::user());
    Log::spy();

    app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::Passed, closerAllPass()));
    app(RunCloser::class)->close($run->id, closerVerdict(RunStatus::Passed, closerAllPass()));
    app(RunCloser::class)->close('01990000-0000-7000-8000-000000000000', Verdict::infraError(RunReason::Expired));

    Log::shouldHaveReceived('info')->with('run.closed', Mockery::on(fn (array $context) => $context['run_id'] === $run->id && $context['status'] === 'passed'))->once();
    Log::shouldHaveReceived('info')->with('run.closed', Mockery::any())->once();
});
