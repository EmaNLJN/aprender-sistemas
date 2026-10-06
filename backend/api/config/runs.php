<?php

return [
    'quota' => [
        'active' => (int) env('RUNS_QUOTA_ACTIVE', 1),
        'per_minute' => (int) env('RUNS_QUOTA_PER_MINUTE', 10),
        'per_day' => (int) env('RUNS_QUOTA_PER_DAY', 300),
        'sandbox_minutes_per_day' => (int) env('RUNS_QUOTA_SANDBOX_MINUTES', 30),
    ],
    'queue' => [
        'max_waiting' => (int) env('RUNS_QUEUE_MAX_WAITING', 32),
        'retry_after_active' => (int) env('RUNS_RETRY_AFTER_ACTIVE', 3),
        'retry_after_full' => (int) env('RUNS_RETRY_AFTER_FULL', 10),
    ],
    'throttle_per_minute' => (int) env('RUNS_THROTTLE_PER_MINUTE', 30),
    'expiry' => [
        'queued_seconds' => (int) env('RUNS_EXPIRY_QUEUED_SECONDS', 600),
        'running_seconds' => (int) env('RUNS_EXPIRY_RUNNING_SECONDS', 140),
    ],
    'executor' => [
        'url' => env('EXECUTOR_URL', 'http://executor:8080'),
        'token' => env('EXECUTOR_TOKEN'),
        'runtime' => env('EXECUTOR_RUNTIME', 'runsc'),
        'connect_timeout' => 5,
        'request_timeout' => 100,
    ],
    'limits' => ['code_bytes' => 65536, 'custom_test_chars' => 3000],
    'retention' => ['runs_days' => 14, 'payload_days' => 90],
    'batches' => ['sweep' => 100, 'prune' => 1000, 'prune_max' => (int) env('RUNS_PRUNE_MAX_BATCHES', 100)],
];
