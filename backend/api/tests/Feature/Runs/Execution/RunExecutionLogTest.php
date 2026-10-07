<?php

use App\Runs\Evidence\ResultClassifier;
use App\Runs\Execution\RunExecution;
use App\Runs\Execution\RunProcessor;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use Tests\Support\RunWorld;

const EXECUTION_SENTINEL = 'TALLER_CENTINELA_9f3a7c51';

beforeEach(function () {
    app()->when(ResultClassifier::class)->needs('$sandboxRuntime')->give('runsc');
    app()->bind(RunProcessor::class, RunExecution::class);
    config(['runs.executor.token' => 'a-token-of-at-least-thirty-two-bytes', 'logging.default' => 'stderr']);
    $this->handler = new TestHandler;
    Log::channel('stderr')->getLogger()->setHandlers([$this->handler]);
});

it('never logs the code, the custom test, the program or the output, and logs the claim and the close', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user, [
        'code' => 'fn main() { /* '.EXECUTION_SENTINEL.' code */ }',
        'custom_test' => 'assert!(true); // '.EXECUTION_SENTINEL.' custom',
        'program' => 'fn main() {} // '.EXECUTION_SENTINEL.' program',
    ]);
    $stdout = EXECUTION_SENTINEL." stdout\n__TALLER_TEST__{$run->nonce}:t1:PASS\n__TALLER_TEST__{$run->nonce}:t2:PASS\n__TALLER_TEST__{$run->nonce}:t3:PASS\n"
        ."__TALLER_TEST__{$run->nonce}:custom:PASS\n__TALLER_END__{$run->nonce}:4\n";
    Http::fake(['*' => Http::response([
        'phase' => 'run', 'exitCode' => 0, 'stdout' => $stdout, 'stderr' => EXECUTION_SENTINEL.' stderr', 'truncated' => false,
        'timedOut' => false, 'oomKilled' => false, 'compileMs' => 1, 'runMs' => 2,
    ])]);

    app(RunProcessor::class)->process($run->id);

    $records = array_map(
        fn (LogRecord $record) => ['message' => $record->message, 'context' => $record->context, 'extra' => $record->extra],
        $this->handler->getRecords(),
    );
    expect(json_encode($records, JSON_THROW_ON_ERROR))->not->toContain(EXECUTION_SENTINEL);
    $byMessage = array_column($records, 'context', 'message');
    expect($byMessage['run.claimed'])->toMatchArray(['run_id' => $run->id, 'user_id' => $user->id])
        ->and($byMessage['run.closed'])->toMatchArray(['run_id' => $run->id, 'user_id' => $user->id, 'status' => 'passed', 'reason' => null]);
});
