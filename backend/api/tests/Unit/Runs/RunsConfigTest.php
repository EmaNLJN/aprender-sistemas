<?php

use Illuminate\Support\Env;
use Tests\TestCase;

uses(TestCase::class);

it('defaults to the values of ADR 0006 D27 and of the spec', function () {
    expect(config('runs.quota'))->toBe(['active' => 1, 'per_minute' => 10, 'per_day' => 300, 'sandbox_minutes_per_day' => 30])
        ->and(config('runs.queue'))->toBe(['max_waiting' => 32, 'retry_after_active' => 3, 'retry_after_full' => 10])
        ->and(config('runs.throttle_per_minute'))->toBe(30)
        ->and(config('runs.expiry'))->toBe(['queued_seconds' => 600, 'running_seconds' => 140])
        ->and(config('runs.executor.url'))->toBe('http://executor:8080')
        ->and(config('runs.executor.runtime'))->toBe('runsc')
        ->and(config('runs.executor.connect_timeout'))->toBe(5)
        ->and(config('runs.executor.request_timeout'))->toBe(100)
        ->and(config('runs.limits'))->toBe(['code_bytes' => 65536, 'custom_test_chars' => 3000])
        ->and(config('runs.retention'))->toBe(['runs_days' => 14, 'payload_days' => 90])
        ->and(config('runs.batches.sweep'))->toBe(100)
        ->and(config('runs.batches.prune'))->toBe(1000)
        ->and(config('runs.batches.prune_max'))->toBe(100);
});

it('reads a quota from the environment (FR-009)', function () {
    $repository = Env::getRepository();
    $repository->set('RUNS_QUOTA_PER_MINUTE', '3');

    try {
        $config = require config_path('runs.php');
    } finally {
        $repository->clear('RUNS_QUOTA_PER_MINUTE');
    }

    expect($config['quota']['per_minute'])->toBe(3)
        ->and($config['quota']['per_day'])->toBe(300);
});
