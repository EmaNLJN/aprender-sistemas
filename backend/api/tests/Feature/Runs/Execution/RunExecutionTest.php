<?php

use App\Auth\AccountStatus;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Execution\RunClaimer;
use App\Runs\Execution\RunExecution;
use App\Runs\Execution\RunExpiry;
use App\Runs\Execution\RunProcessor;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\NetworkTimeoutException;
use GuzzleHttp\Psr7\Request;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

const EXECUTION_CREATED = '2026-10-05 12:00:00.000';

beforeEach(function () {
    app()->when(ResultClassifier::class)->needs('$sandboxRuntime')->give('runsc');
    app()->bind(RunProcessor::class, RunExecution::class);
    config(['runs.executor.token' => 'a-token-of-at-least-thirty-two-bytes']);
    Http::preventStrayRequests();
    Sleep::fake();
    $this->travelTo(Instant::parse(EXECUTION_CREATED));
});

/** @param array<string, mixed> $overrides */
function queuedRun(array $overrides = []): RunRow
{
    return RunWorld::run(RunWorld::user(), $overrides);
}

/** @param list<string> $outcomes */
function harnessStdout(RunRow $run, array $outcomes, bool $withEnd = true): string
{
    $lines = [];
    foreach ($run->expectedTests as $index => $key) {
        $lines[] = "__TALLER_TEST__{$run->nonce}:{$key}:{$outcomes[$index]}";
    }
    if ($withEnd) {
        $lines[] = "__TALLER_END__{$run->nonce}:".count($run->expectedTests);
    }

    return implode("\n", $lines)."\n";
}

/** @param array<string, mixed> $changes */
function executorAnswer(array $changes = []): array
{
    return [
        'phase' => 'run', 'exitCode' => 0, 'stdout' => '', 'stderr' => '', 'truncated' => false, 'timedOut' => false,
        'oomKilled' => false, 'compileMs' => 10, 'runMs' => 20, ...$changes,
    ];
}

function process(string $runId): void
{
    app(RunProcessor::class)->process($runId);
}

/** @return array<string, mixed> */
function storedRun(string $runId): array
{
    return (array) DB::selectOne('select * from runs where id = ?', [$runId]);
}

/** @return list<array{string, string}> */
function attemptTests(): array
{
    return DB::table('attempt_tests')->orderBy('position')->get()->map(fn (stdClass $row): array => [(string) $row->test_key, (string) $row->outcome])->all();
}

it('closes the solution of an exercise as passed with its tests, its progress and its revision', function () {
    $run = queuedRun();
    Http::fake(['*' => Http::response(executorAnswer(['stdout' => harnessStdout($run, ['PASS', 'PASS', 'PASS'])]))]);

    process($run->id);

    $stored = storedRun($run->id);
    expect($stored['status'])->toBe('passed')
        ->and($stored['reason'])->toBeNull()
        ->and($stored['program'])->toBeNull()
        ->and(DB::table('attempts')->count())->toBe(1)
        ->and(DB::table('attempts')->value('outcome'))->toBe('passed')
        ->and(attemptTests())->toBe([['t1', 'pass'], ['t2', 'pass'], ['t3', 'pass']])
        ->and(DB::table('exercise_progress')->value('attempt_count'))->toBe(1)
        ->and(DB::table('exercise_progress')->value('solved_at'))->not->toBeNull()
        ->and(DB::table('progress_heads')->value('revision'))->toBe(1);
    Http::assertSentCount(1);
    RunInvariants::assertClean();
});

it('closes the starter code as failed with its tests failing', function () {
    $run = queuedRun();
    Http::fake(['*' => Http::response(executorAnswer(['stdout' => harnessStdout($run, ['FAIL', 'FAIL', 'FAIL'])]))]);

    process($run->id);

    expect(storedRun($run->id)['status'])->toBe('failed')
        ->and(storedRun($run->id)['reason'])->toBeNull()
        ->and(attemptTests())->toBe([['t1', 'fail'], ['t2', 'fail'], ['t3', 'fail']])
        ->and(DB::table('exercise_progress')->value('attempt_count'))->toBe(1)
        ->and(DB::table('exercise_progress')->value('solved_at'))->toBeNull();
    RunInvariants::assertClean();
});

it('classifies what the executor answered into the status and the reason of the run', function (array $answer, string $status, ?string $reason) {
    $run = queuedRun();
    Http::fake(['*' => Http::response(executorAnswer($answer))]);

    process($run->id);

    expect(storedRun($run->id)['status'])->toBe($status)
        ->and(storedRun($run->id)['reason'])->toBe($reason)
        ->and(DB::table('attempts')->count())->toBe(1);
    RunInvariants::assertClean();
})->with([
    'compile error' => [['phase' => 'compile', 'exitCode' => 1, 'stderr' => 'error[E0308]'], 'compile_error', null],
    'exit code 101' => [['exitCode' => 101, 'stderr' => 'panicked'], 'runtime_error', null],
    'timeout' => [['exitCode' => 124, 'timedOut' => true], 'timeout', null],
    'output cut before the tests' => [['stdout' => 'solo ruido', 'truncated' => true], 'failed', 'output_limit'],
    'invalid evidence' => [['stdout' => 'imprimí lo que quise'], 'failed', 'evidence_invalid'],
]);

it('puts a run back in the queue with a new job and no attempt when the executor is busy or not reached', function (Closure $answer) {
    $run = queuedRun();
    Http::fake(['*' => $answer]);

    process($run->id);

    $stored = storedRun($run->id);
    expect($stored['status'])->toBe('queued')
        ->and($stored['started_at'])->toBeNull()
        ->and(DB::table('jobs')->where('queue', 'runs')->count())->toBe(1)
        ->and(DB::table('attempts')->count())->toBe(0)
        ->and(DB::table('exercise_progress')->count())->toBe(0);
    RunInvariants::assertClean();
})->with([
    'a 503' => [fn () => fn () => Http::response('busy', 503, ['Retry-After' => '3'])],
    'a refused connection' => [fn () => function (): never {
        $message = 'cURL error 7: Failed to connect (see https://curl.se/libcurl/c/libcurl-errors.html)';

        throw new ConnectionException($message, 0, new ConnectException($message, new Request('POST', 'http://executor:8080/v1/run')));
    }],
]);

it('closes as infra_error executor_busy when the executor stays busy past the 600 seconds of the acceptance', function () {
    $run = queuedRun();
    Http::fake(['*' => function () {
        $this->travel(601)->seconds();

        return Http::response('busy', 503, ['Retry-After' => '1']);
    }]);

    process($run->id);

    expect(storedRun($run->id)['status'])->toBe('infra_error')
        ->and(storedRun($run->id)['reason'])->toBe('executor_busy')
        ->and(DB::table('jobs')->count())->toBe(0)
        ->and(DB::table('attempts')->count())->toBe(1);
    RunInvariants::assertClean();
});

it('closes as infra_error executor_error with one request and one executor_failed record, whatever the failure', function (Closure $answer, string $cause, ?int $status, string $level) {
    $run = queuedRun();
    $requests = new ArrayObject;
    Http::fake(['*' => function () use ($answer, $requests) {
        $requests->append(true);

        return $answer();
    }]);
    Log::spy();

    process($run->id);

    expect(storedRun($run->id)['status'])->toBe('infra_error')
        ->and(storedRun($run->id)['reason'])->toBe('executor_error')
        ->and($requests)->toHaveCount(1)
        ->and(DB::table('attempts')->count())->toBe(1)
        ->and((int) DB::table('exercise_progress')->sum('attempt_count'))->toBe(0);
    Log::shouldHaveReceived($level)->with('run.executor_failed', ['run_id' => $run->id, 'cause' => $cause, 'http_status' => $status])->once();
    RunInvariants::assertClean();
})->with([
    'a 500' => [fn () => Http::response('boom', 500), 'status', 500, 'warning'],
    'a 400' => [fn () => Http::response('bad', 400), 'status', 400, 'error'],
    'a 401' => [fn () => Http::response('who', 401), 'status', 401, 'error'],
    'a 413' => [fn () => Http::response('big', 413), 'status', 413, 'error'],
    'an invalid body' => [fn () => Http::response(['phase' => 'run']), 'invalid_body', 200, 'warning'],
    'a timeout' => [fn () => throw new ConnectionException('cURL error 28: timed out', 0, new NetworkTimeoutException('cURL error 28: timed out', new Request('POST', 'http://executor:8080/v1/run'))), 'connection', null, 'warning'],
]);

it('sends nothing when the claim is not ready', function (Closure $arrange, ?string $status, ?string $reason) {
    Http::fake();
    $runId = $arrange();

    process($runId);

    Http::assertNothingSent();
    if ($status !== null) {
        expect(storedRun($runId)['status'])->toBe($status)->and(storedRun($runId)['reason'])->toBe($reason);
    }
})->with([
    'a run that is no longer queued' => [fn () => queuedRun(['status' => 'passed'])->id, 'passed', null],
    'a run that expired in the queue' => [function () {
        $run = queuedRun();
        test()->travel(601)->seconds();

        return $run->id;
    }, 'infra_error', 'expired'],
    'an account that is not active' => [fn () => RunWorld::run(RunWorld::user(['status' => AccountStatus::Disabled]))->id, 'canceled', 'account_disabled'],
    'a run that does not exist' => [fn () => '01990000-0000-7000-8000-00000000dead', null, null],
]);

it('closes as canceled without touching the progress when the cancellation was requested while it ran', function () {
    $run = queuedRun();
    Http::fake(['*' => function () use ($run) {
        DB::update('update `runs` set `cancel_requested_at` = ? where `id` = ?', [Instant::format(Instant::now()), $run->id]);

        return Http::response(executorAnswer(['stdout' => harnessStdout($run, ['PASS', 'PASS', 'PASS'])]));
    }]);

    process($run->id);

    expect(storedRun($run->id)['status'])->toBe('canceled')
        ->and(DB::table('attempts')->value('outcome'))->toBe('canceled')
        ->and(DB::table('exercise_progress')->count())->toBe(0)
        ->and(DB::table('progress_heads')->value('revision'))->toBe(0);
    RunInvariants::assertClean();
});

it('discards its late result when the sweep already closed the run while the request was in flight', function () {
    $run = queuedRun();
    Http::fake(['*' => function () use ($run) {
        $this->travel(141)->seconds();
        app(RunExpiry::class)->expire($run->id);

        return Http::response(executorAnswer(['stdout' => harnessStdout($run, ['PASS', 'PASS', 'PASS'])]));
    }]);

    process($run->id);

    expect(storedRun($run->id)['status'])->toBe('infra_error')
        ->and(storedRun($run->id)['reason'])->toBe('expired')
        ->and(DB::table('attempts')->count())->toBe(1)
        ->and((int) DB::table('exercise_progress')->sum('attempt_count'))->toBe(0);
    Http::assertSentCount(1);
    RunInvariants::assertClean();
});

function failInsertsOfAttempts(int $times): void
{
    $remaining = $times;
    DB::listen(function (QueryExecuted $query) use (&$remaining) {
        if ($remaining > 0 && str_starts_with($query->sql, 'insert into `attempts`')) {
            $remaining--;

            throw new QueryException($query->connectionName, $query->sql, $query->bindings, new Exception('lost connection'));
        }
    });
}

it('closes at the third try when the first two writes fail, waiting 200 and 1000 milliseconds', function () {
    $run = queuedRun();
    Http::fake(['*' => Http::response(executorAnswer(['stdout' => harnessStdout($run, ['PASS', 'PASS', 'PASS'])]))]);
    failInsertsOfAttempts(2);

    process($run->id);

    expect(storedRun($run->id)['status'])->toBe('passed')
        ->and(DB::table('attempts')->count())->toBe(1);
    Sleep::assertSequence([Sleep::for(200)->milliseconds(), Sleep::for(1000)->milliseconds()]);
    Http::assertSentCount(1);
    RunInvariants::assertClean();
});

it('throws RunWriteFailed and leaves the run running when the three writes fail', function () {
    $run = queuedRun();
    Http::fake(['*' => Http::response(executorAnswer(['stdout' => harnessStdout($run, ['PASS', 'PASS', 'PASS'])]))]);
    failInsertsOfAttempts(3);

    expect(fn () => process($run->id))->toThrow(RunWriteFailed::class);

    expect(storedRun($run->id)['status'])->toBe('running')
        ->and(DB::table('attempts')->count())->toBe(0);
    Sleep::assertSleptTimes(2);
});

it('sends one request at most when a worker dies after claiming, and the sweep closes the run as expired', function () {
    $run = queuedRun();
    Http::fake();

    app(RunClaimer::class)->claim($run->id);
    $this->travel(141)->seconds();
    $closed = app(RunExpiry::class)->sweep(100);

    expect($closed)->toBe(1)
        ->and(storedRun($run->id)['status'])->toBe('infra_error')
        ->and(storedRun($run->id)['reason'])->toBe('expired')
        ->and(DB::table('attempts')->count())->toBe(1);
    Http::assertSentCount(0);
    RunInvariants::assertClean();
});

it('asks the executor outside of any transaction', function () {
    $run = queuedRun();
    $levelBefore = DB::transactionLevel();
    $levelDuringRequest = null;
    Http::fake(['*' => function () use (&$levelDuringRequest) {
        $levelDuringRequest = DB::transactionLevel();

        return Http::response(executorAnswer(['exitCode' => 101]));
    }]);

    process($run->id);

    expect($levelDuringRequest)->toBe($levelBefore)
        ->and(storedRun($run->id)['status'])->toBe('runtime_error');
});
