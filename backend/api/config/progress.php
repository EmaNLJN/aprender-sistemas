<?php

return [
    'sync' => [
        'formats' => [2],
        'max_operations' => 200,
        'throttle_per_minute' => 60,
        'clock_floor' => '2020-01-01T00:00:00.000Z',
    ],
    'limits' => ['draft_chars' => 30000, 'reflection_chars' => 10000, 'custom_test_chars' => 3000, 'workshop_note_chars' => 10000, 'route_note_chars' => 20000],
    'import' => ['formats' => [2], 'throttle_per_hour' => 3, 'raw_max_bytes' => 10485760, 'dedupe_window_minutes' => 10],
    'reset' => ['formats' => [2], 'throttle_per_day' => 3],
    'retention' => ['sync_operations_days' => 14, 'raw_payload_days' => 90],
    'batches' => ['prune' => 5000, 'prune_max' => 100],
];
