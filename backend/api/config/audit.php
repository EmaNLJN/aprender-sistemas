<?php

return [
    'instance' => env('AUDIT_INSTANCE', 'auditoria'),
    'concurrency' => (int) env('AUDIT_CONCURRENCY', 4),
    'report_directory' => env('AUDIT_REPORT_DIRECTORY', '/audit'),
    'limits' => [
        'compile_ms' => ['rust' => 20000, 'go' => 15000],
        'run_ms' => 10000,
        'compile_memory_mib' => 1024,
        'run_memory_mib' => 256,
        'warning_ratio' => 0.5,
    ],
    'retry' => ['max_rounds' => 10, 'max_wait_seconds' => 30],
    'preflight' => ['connect_timeout' => 5, 'timeout' => 10],
    'batch_per_slot' => 8,
    'custom_test_sample' => [
        'rust' => ['exercise' => 'rust-01', 'passing' => 'energia(5) == 35', 'failing' => 'energia(5) == 36'],
        'go' => ['exercise' => 'go-01', 'passing' => 'Bytes(2) == 2048', 'failing' => 'Bytes(2) == 2049'],
    ],
];
