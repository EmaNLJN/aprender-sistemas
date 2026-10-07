<?php

use Tests\TestCase;

uses(TestCase::class);

it('gives the runs their own database queue with a 140 second retry_after', function () {
    $runs = config('queue.connections.runs');

    expect($runs)->toMatchArray([
        'driver' => 'database',
        'table' => 'jobs',
        'queue' => 'runs',
        'retry_after' => 140,
        'after_commit' => false,
    ])->and(config('queue.connections.database.retry_after'))->toBe(90);
});
