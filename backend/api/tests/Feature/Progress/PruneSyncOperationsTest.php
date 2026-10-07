<?php

use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunWorld;

const PRUNE_NOW = '2026-10-20 12:00:00.000';

beforeEach(function () {
    $this->travelTo(Instant::parse(PRUNE_NOW));
});

function plantOperation(int $userId, string $receivedAt): void
{
    DB::table('sync_operations')->insert([
        'user_id' => $userId,
        'operation_id' => random_bytes(16),
        'payload_sha256' => random_bytes(32),
        'status' => 'applied',
        'reason' => null,
        'clock_offset_ms' => 0,
        'received_at' => $receivedAt,
    ]);
}

function operationAges(int $userId): array
{
    return DB::table('sync_operations')->where('user_id', $userId)->orderBy('received_at')->pluck('received_at')->all();
}

it('deletes an operation received 14 days and a millisecond ago and keeps one received 14 days minus a millisecond ago', function () {
    $user = RunWorld::user();
    plantOperation($user->id, '2026-10-06 11:59:59.999');
    plantOperation($user->id, '2026-10-06 12:00:00.001');

    $this->artisan('progress:prune-sync-operations')->assertSuccessful();

    expect(operationAges($user->id))->toBe(['2026-10-06 12:00:00.001']);
});

it('keeps an operation received exactly 14 days ago', function () {
    $user = RunWorld::user();
    plantOperation($user->id, '2026-10-06 12:00:00.000');

    $this->artisan('progress:prune-sync-operations')->assertSuccessful();

    expect(DB::table('sync_operations')->count())->toBe(1);
});

it('prunes the expired operations of every account and leaves the recent ones of each', function () {
    $first = RunWorld::user();
    $second = RunWorld::user();
    plantOperation($first->id, '2026-09-01 00:00:00.000');
    plantOperation($first->id, '2026-10-19 00:00:00.000');
    plantOperation($second->id, '2026-09-02 00:00:00.000');
    plantOperation($second->id, '2026-10-19 00:00:00.000');

    $this->artisan('progress:prune-sync-operations')->assertSuccessful();

    expect(operationAges($first->id))->toBe(['2026-10-19 00:00:00.000'])
        ->and(operationAges($second->id))->toBe(['2026-10-19 00:00:00.000']);
});

it('deletes in batches, every statement with a limit', function () {
    config(['progress.batches.prune' => 5]);
    $user = RunWorld::user();
    foreach (range(1, 12) as $day) {
        plantOperation($user->id, sprintf('2026-09-%02d 00:00:00.000', $day));
    }
    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->artisan('progress:prune-sync-operations')->assertSuccessful();

    $deletes = collect(DB::getQueryLog())->pluck('query')->filter(fn (string $sql) => str_starts_with($sql, 'delete'))->values()->all();
    $statement = 'delete from `sync_operations` where `received_at` < ? order by `received_at` limit 5';
    expect($deletes)->toBe([$statement, $statement, $statement])
        ->and(DB::table('sync_operations')->count())->toBe(0);
});

it('stops after the maximum number of batches per run', function () {
    config(['progress.batches.prune' => 5, 'progress.batches.prune_max' => 1]);
    $user = RunWorld::user();
    foreach (range(1, 12) as $day) {
        plantOperation($user->id, sprintf('2026-09-%02d 00:00:00.000', $day));
    }

    $this->artisan('progress:prune-sync-operations')->expectsOutput('Operaciones de sincronización borradas: 5.')->assertSuccessful();

    expect(DB::table('sync_operations')->count())->toBe(7);
});

it('removes the oldest operations first', function () {
    config(['progress.batches.prune' => 2, 'progress.batches.prune_max' => 1]);
    $user = RunWorld::user();
    plantOperation($user->id, '2026-09-03 00:00:00.000');
    plantOperation($user->id, '2026-09-01 00:00:00.000');
    plantOperation($user->id, '2026-09-02 00:00:00.000');

    $this->artisan('progress:prune-sync-operations')->assertSuccessful();

    expect(operationAges($user->id))->toBe(['2026-09-03 00:00:00.000']);
});

it('reports how many rows it deleted and a second run deletes none', function () {
    $user = RunWorld::user();
    plantOperation($user->id, '2026-09-01 00:00:00.000');
    plantOperation($user->id, '2026-09-02 00:00:00.000');
    plantOperation($user->id, '2026-10-19 00:00:00.000');

    $this->artisan('progress:prune-sync-operations')->expectsOutput('Operaciones de sincronización borradas: 2.')->assertExitCode(0);
    $this->artisan('progress:prune-sync-operations')->expectsOutput('Operaciones de sincronización borradas: 0.')->assertExitCode(0);
});

it('does not touch the progress head or the state tables', function () {
    $user = RunWorld::user();
    DB::table('progress_heads')->insert(['user_id' => $user->id, 'epoch' => 3, 'revision' => 9, 'created_at' => '2026-08-01 00:00:00.000', 'updated_at' => '2026-08-01 00:00:00.000']);
    DB::table('route_notes')->insert([
        'user_id' => $user->id, 'language' => 'rust', 'field' => 'learned', 'body' => 'ownership', 'revision' => 9,
        'created_at' => '2026-08-01 00:00:00.000', 'updated_at' => '2026-08-01 00:00:00.000',
    ]);
    plantOperation($user->id, '2026-08-01 00:00:00.000');

    $this->artisan('progress:prune-sync-operations')->assertSuccessful();

    expect(DB::table('sync_operations')->count())->toBe(0)
        ->and(DB::table('progress_heads')->where('user_id', $user->id)->value('revision'))->toBe(9)
        ->and(DB::table('route_notes')->where('user_id', $user->id)->count())->toBe(1);
});
