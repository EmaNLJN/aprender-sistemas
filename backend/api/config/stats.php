<?php

return [
    'timezone' => env('STATS_TIMEZONE', 'America/Argentina/Buenos_Aires'),
    'cache_seconds' => (int) env('STATS_CACHE_SECONDS', 600),
    'max_execution_ms' => (int) env('STATS_MAX_EXECUTION_MS', 5000),
    'retry_after_seconds' => (int) env('STATS_RETRY_AFTER_SECONDS', 30),
    'default_days' => 30,
    'max_days' => 366,
];
