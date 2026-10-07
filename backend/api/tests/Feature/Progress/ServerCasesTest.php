<?php

use App\Progress\ProgressTables;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\MergeKinds;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\ServerCases;
use Tests\Support\Sync\SyncDevice;

/** @return array<string, array{array<string, mixed>}> */
function serverCaseDataset(): array
{
    $cases = [];
    foreach (ServerCases::all() as $case) {
        $cases[$case['id']] = [$case];
    }

    return $cases;
}

/**
 * @param  array<string, mixed>  $operation
 * @return array<string, mixed>
 */
function expandRepeats(array $operation): array
{
    return array_map(
        fn (mixed $value) => is_array($value) && isset($value['repeat']) ? str_repeat($value['repeat'], $value['times']) : $value,
        $operation,
    );
}

function stateRowCount(): int
{
    return array_sum(array_map(fn (string $table) => DB::table($table)->count(), ProgressTables::STATE));
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->device = SyncDevice::signedIn($this);
});

it('has the 43 server cases of the fixture', function () {
    expect(ServerCases::all())->toHaveCount(43);
});

it('answers and stores what a server case expects, through POST /api/sync', function (array $case) {
    $results = [];
    $sent = 0;
    foreach ($case['batches'] as $batch) {
        $this->travelTo(CarbonImmutable::parse($batch['serverNow']));
        $operations = array_map(expandRepeats(...), $batch['operations']);
        $sent += count($operations);

        $response = $this->device->sync($operations, ['sentAt' => $batch['sentAt']])->assertOk();

        array_push($results, ...array_map(fn (array $result) => Arr::except($result, 'id'), $response->json('results')));
    }

    expect($results)->toBe($case['expect']['results'])
        ->and(DB::table('sync_operations')->count())->toBe($sent);
    foreach ($case['expect']['stored'] as $stored) {
        expect(MergeKinds::read($this->device->user->id, $stored['kind']))->toBe($stored['state'], $stored['kind']);
    }
    ProgressInvariants::assertClean($this->device->user->id);
})->with(fn () => serverCaseDataset());

it('writes no state row for an operation that was rejected', function (array $case) {
    $this->travelTo(CarbonImmutable::parse($case['batches'][0]['serverNow']));
    $operations = array_map(expandRepeats(...), $case['batches'][0]['operations']);

    $this->device->sync($operations, ['sentAt' => $case['batches'][0]['sentAt']])->assertOk();

    expect(stateRowCount())->toBe(0)
        ->and((int) DB::table('progress_heads')->where('user_id', $this->device->user->id)->value('revision'))->toBe(0);
})->with(fn () => array_filter(serverCaseDataset(), fn (array $case) => $case[0]['expect']['stored'] === []));

it('applies only the valid operation of a mixed batch and leaves its revision at 1', function () {
    $case = ServerCases::find('reject/mixed-batch-applies-the-valid-one');
    $this->travelTo(CarbonImmutable::parse($case['batches'][0]['serverNow']));

    $this->device->sync($case['batches'][0]['operations'], ['sentAt' => $case['batches'][0]['sentAt']])->assertOk();

    expect(DB::table('exercise_progress')->count())->toBe(1)
        ->and(stateRowCount())->toBe(1)
        ->and((int) DB::table('progress_heads')->where('user_id', $this->device->user->id)->value('revision'))->toBe(1);
});

it('records the offset of the batch and the reception time of the server, as merge-rules.md section 7 says', function () {
    $case = ServerCases::find('clock/device-ahead-one-hour');
    $batch = $case['batches'][0];
    $this->travelTo(CarbonImmutable::parse($batch['serverNow']));

    $this->device->sync($batch['operations'], ['sentAt' => $batch['sentAt']])->assertOk();

    $record = DB::table('sync_operations')->first();
    expect((int) $record->clock_offset_ms)->toBe(-3600000)
        ->and($record->received_at)->toBe('2026-10-05 12:10:00.000');
});
