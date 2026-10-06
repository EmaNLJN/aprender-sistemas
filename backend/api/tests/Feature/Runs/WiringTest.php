<?php

use App\Auth\Events\AccountRestricted;
use App\Runs\Evidence\ExecutorResult;
use App\Runs\Evidence\ExpectedEvidence;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Execution\CancelRunsOfRestrictedAccount;
use App\Runs\Execution\RunExecution;
use App\Runs\Execution\RunProcessor;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;

it('runs the queued job through the run execution', function () {
    expect(app(RunProcessor::class))->toBeInstanceOf(RunExecution::class);
});

it('gives the classifier the sandbox runtime of the configuration', function (string $runtime, RunReason $reason) {
    config(['runs.executor.runtime' => $runtime]);
    $killed = new ExecutorResult(ExecutorPhase::Run, 137, '', '', false, false, false, 10, 20);

    $verdict = app(ResultClassifier::class)->classify($killed, new ExpectedEvidence('0123456789abcdef0123456789abcdef', ['t1'], false));

    expect($verdict->reason)->toBe($reason);
})->with([
    'gVisor kills on the pids limit' => ['runsc', RunReason::PidsLimit],
    'runc reports the signal' => ['runc', RunReason::Signal],
]);

it('registers the submit limiter', function () {
    expect(RateLimiter::limiter('runs-submit'))->not->toBeNull();
});

it('cancels the runs of a restricted account through its listener', function () {
    Event::fake();

    Event::assertListening(AccountRestricted::class, CancelRunsOfRestrictedAccount::class);
});
