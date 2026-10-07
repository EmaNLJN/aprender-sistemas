<?php

use App\Jobs\ExecuteRun;
use Tests\TestCase;

uses(TestCase::class);

it('gives up on the executor before the job times out, and on the job before the queue hands it out again', function () {
    $request = config()->integer('runs.executor.request_timeout');
    $retryAfter = config()->integer('queue.connections.runs.retry_after');

    expect($request)->toBeLessThan(ExecuteRun::TIMEOUT)
        ->and(ExecuteRun::TIMEOUT)->toBeLessThan($retryAfter)
        ->and(config()->integer('runs.expiry.running_seconds'))->toBeLessThanOrEqual($retryAfter);
});
