<?php

use App\Progress\ProgressAreas;
use App\Progress\Sync\OperationResult;
use App\Progress\Sync\ResultStatus;
use App\Progress\Sync\SyncOutcome;
use Carbon\CarbonImmutable;

it('builds the body of http.md section 3.4', function () {
    $outcome = new SyncOutcome(
        1,
        42,
        CarbonImmutable::parse('2026-10-06T12:00:00.123Z'),
        '0123456789abcdef0123456789abcdef',
        [new OperationResult('6f1c0000-0000-4000-8000-000000000001', ResultStatus::Applied)],
        new ProgressAreas,
        false,
    );

    expect($outcome->toArray())->toBe([
        'epoch' => 1,
        'revision' => 42,
        'serverTime' => '2026-10-06T12:00:00.123Z',
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'results' => [['id' => '6f1c0000-0000-4000-8000-000000000001', 'status' => 'applied']],
        'changes' => [
            'full' => false,
            'exercises' => [],
            'drafts' => [],
            'campaign' => ['seals' => [], 'checkpoints' => []],
            'workshops' => ['progress' => [], 'objectives' => [], 'steps' => []],
            'route' => ['marks' => [], 'quiz' => [], 'notes' => []],
            'preferences' => null,
        ],
    ]);
});

it('marks the changes as full when the outcome is', function () {
    $outcome = new SyncOutcome(1, 0, CarbonImmutable::parse('2026-10-06T12:00:00.000Z'), '0123456789abcdef0123456789abcdef', [], new ProgressAreas, true);

    expect($outcome->toArray()['changes']['full'])->toBeTrue();
});

it('writes the reason of a result only when it has one', function () {
    expect((new OperationResult('a', ResultStatus::Rejected, 'out_of_range'))->toArray())->toBe(['id' => 'a', 'status' => 'rejected', 'reason' => 'out_of_range'])
        ->and((new OperationResult('a', ResultStatus::Duplicate, 'stale_content'))->toArray())->toBe(['id' => 'a', 'status' => 'duplicate', 'reason' => 'stale_content'])
        ->and((new OperationResult('a', ResultStatus::UuidReused))->toArray())->toBe(['id' => 'a', 'status' => 'uuid_reused']);
});
