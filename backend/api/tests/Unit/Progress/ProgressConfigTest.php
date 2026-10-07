<?php

use Tests\TestCase;

uses(TestCase::class);

it('defaults to the values of the D1a plan', function () {
    expect(config('progress.sync'))->toBe([
        'formats' => [2],
        'max_operations' => 200,
        'throttle_per_minute' => 60,
        'clock_floor' => '2020-01-01T00:00:00.000Z',
    ])
        ->and(config('progress.limits'))->toBe([
            'draft_chars' => 30000,
            'reflection_chars' => 10000,
            'custom_test_chars' => 3000,
            'workshop_note_chars' => 10000,
            'route_note_chars' => 20000,
        ])
        ->and(config('progress.retention'))->toBe(['sync_operations_days' => 14])
        ->and(config('progress.batches'))->toBe(['prune' => 5000, 'prune_max' => 100]);
});
