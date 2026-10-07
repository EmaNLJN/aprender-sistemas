<?php

use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\Record\RunRow;
use App\Runs\RunLog;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Tests\TestCase;

uses(TestCase::class);

const LOG_SENTINEL = 'TALLER_CENTINELA';

beforeEach(function () {
    config(['logging.default' => 'stderr']);
    $this->handler = new TestHandler;
    Log::channel('stderr')->getLogger()->setHandlers([$this->handler]);
});

function sentinelRun(): RunRow
{
    return RunRow::fromRow([
        'id' => '0199c0a0-0000-7000-8000-000000000001', 'user_id' => '7', 'client_run_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'exercise_id' => 'rust-01', 'language' => 'rust', 'epoch' => '2', 'grading_hash' => str_repeat('a', 64),
        'expected_tests' => '["t1"]', 'nonce' => str_repeat('b', 32), 'code' => LOG_SENTINEL.' code', 'custom_test' => LOG_SENTINEL.' custom',
        'program' => LOG_SENTINEL.' program', 'status' => 'running', 'reason' => null, 'executor_phase' => null, 'exit_code' => null,
        'truncated' => null, 'compile_ms' => null, 'run_ms' => null, 'stdout' => LOG_SENTINEL.' out', 'stderr' => LOG_SENTINEL.' err',
        'attempt_id' => null, 'cancel_requested_at' => null, 'created_at' => '2026-10-05 12:00:00.000', 'started_at' => '2026-10-05 12:00:01.000',
        'finished_at' => null, 'expires_at' => '2026-10-05 12:02:21.000',
    ]);
}

function sentinelVerdict(): Verdict
{
    return new Verdict(
        status: RunStatus::Failed, reason: RunReason::EvidenceInvalid, phase: ExecutorPhase::Run, exitCode: 0, truncated: true,
        compileMs: 412, runMs: 31, stdout: LOG_SENTINEL.' out', stderr: LOG_SENTINEL.' err',
        tests: [new TestVerdict('t1', TestOutcome::Fail)], custom: TestOutcome::Pass,
    );
}

/** @return array{message: string, level: string, context: array<string, mixed>} */
function loggedOnce(TestHandler $handler): array
{
    expect($handler->getRecords())->toHaveCount(1);
    $record = $handler->getRecords()[0];

    return ['message' => $record->message, 'level' => $record->level->getName(), 'context' => $record->context];
}

it('logs each fact with the message, the level and the keys of its signature and nothing else', function (Closure $log, string $message, string $level, array $context) {
    $log();

    expect(loggedOnce($this->handler))->toBe(['message' => $message, 'level' => $level, 'context' => $context]);
})->with([
    'admitted' => [
        fn () => RunLog::admitted(sentinelRun()), 'run.admitted', 'INFO',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'user_id' => 7, 'exercise_id' => 'rust-01', 'language' => 'rust', 'epoch' => 2],
    ],
    'rejected' => [
        fn () => RunLog::rejected(7, 'rust-01', 'quota_exceeded'), 'run.rejected', 'INFO',
        ['user_id' => 7, 'exercise_id' => 'rust-01', 'code' => 'quota_exceeded'],
    ],
    'claimed' => [
        fn () => RunLog::claimed(sentinelRun()), 'run.claimed', 'INFO',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'user_id' => 7, 'exercise_id' => 'rust-01'],
    ],
    'requeued' => [
        fn () => RunLog::requeued(sentinelRun(), 3), 'run.requeued', 'INFO',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'user_id' => 7, 'delay_seconds' => 3],
    ],
    'closed' => [
        fn () => RunLog::closed(sentinelRun(), sentinelVerdict()), 'run.closed', 'INFO',
        [
            'run_id' => '0199c0a0-0000-7000-8000-000000000001', 'user_id' => 7, 'exercise_id' => 'rust-01', 'status' => 'failed',
            'reason' => 'evidence_invalid', 'phase' => 'run', 'exit_code' => 0, 'compile_ms' => 412, 'run_ms' => 31,
        ],
    ],
    'closed without a phase' => [
        fn () => RunLog::closed(sentinelRun(), Verdict::infraError(RunReason::Expired)), 'run.closed', 'INFO',
        [
            'run_id' => '0199c0a0-0000-7000-8000-000000000001', 'user_id' => 7, 'exercise_id' => 'rust-01', 'status' => 'infra_error',
            'reason' => 'expired', 'phase' => null, 'exit_code' => null, 'compile_ms' => null, 'run_ms' => null,
        ],
    ],
    'cancel requested' => [
        fn () => RunLog::cancelRequested(sentinelRun()), 'run.cancel_requested', 'INFO',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'user_id' => 7],
    ],
    'executor failed with a 500' => [
        fn () => RunLog::executorFailed(sentinelRun(), 'server_error', 500), 'run.executor_failed', 'WARNING',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'cause' => 'server_error', 'http_status' => 500],
    ],
    'executor failed without a response' => [
        fn () => RunLog::executorFailed(sentinelRun(), 'connection_reset', null), 'run.executor_failed', 'WARNING',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'cause' => 'connection_reset', 'http_status' => null],
    ],
    'executor failed with our own mistake: 400' => [
        fn () => RunLog::executorFailed(sentinelRun(), 'bad_request', 400), 'run.executor_failed', 'ERROR',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'cause' => 'bad_request', 'http_status' => 400],
    ],
    'executor failed with our own mistake: 401' => [
        fn () => RunLog::executorFailed(sentinelRun(), 'unauthorized', 401), 'run.executor_failed', 'ERROR',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'cause' => 'unauthorized', 'http_status' => 401],
    ],
    'executor failed with our own mistake: 413' => [
        fn () => RunLog::executorFailed(sentinelRun(), 'too_large', 413), 'run.executor_failed', 'ERROR',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'cause' => 'too_large', 'http_status' => 413],
    ],
    'job failed' => [
        fn () => RunLog::jobFailed('0199c0a0-0000-7000-8000-000000000001', new RuntimeException(LOG_SENTINEL)), 'run.job_failed', 'ERROR',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'exception' => RuntimeException::class],
    ],
    'job failed without an exception' => [
        fn () => RunLog::jobFailed('0199c0a0-0000-7000-8000-000000000001', null), 'run.job_failed', 'ERROR',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'exception' => null],
    ],
    'write failed' => [
        fn () => RunLog::writeFailed('0199c0a0-0000-7000-8000-000000000001', '40001', 1213), 'run.write_failed', 'ERROR',
        ['run_id' => '0199c0a0-0000-7000-8000-000000000001', 'sql_state' => '40001', 'driver_code' => 1213],
    ],
    'cancel failed' => [
        fn () => RunLog::cancelFailed(7, new LogicException(LOG_SENTINEL)), 'run.cancel_failed', 'ERROR',
        ['user_id' => 7, 'exception' => LogicException::class],
    ],
    'swept' => [fn () => RunLog::swept(4), 'run.swept', 'INFO', ['closed' => 4]],
    'pruned' => [fn () => RunLog::pruned(120, 30), 'run.pruned', 'INFO', ['runs' => 120, 'payloads' => 30]],
]);

it('never writes the code, the custom test, the program or the output of a run (FR-042)', function () {
    $run = sentinelRun();
    $verdict = sentinelVerdict();

    RunLog::admitted($run);
    RunLog::claimed($run);
    RunLog::requeued($run, 3);
    RunLog::closed($run, $verdict);
    RunLog::cancelRequested($run);
    RunLog::executorFailed($run, 'server_error', 500);
    RunLog::jobFailed($run->id, new RuntimeException(LOG_SENTINEL));
    RunLog::cancelFailed(7, new RuntimeException(LOG_SENTINEL));

    expect($this->handler->getRecords())->toHaveCount(8);
    foreach ($this->handler->getRecords() as $record) {
        expect(json_encode($record->toArray()))->not->toContain(LOG_SENTINEL);
    }
});
