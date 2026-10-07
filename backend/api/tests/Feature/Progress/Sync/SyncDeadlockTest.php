<?php

use App\Content\ContentImports;
use App\Progress\AccountLock;
use App\Progress\Sync\OperationRegistry;
use App\Progress\Sync\SyncRequest;
use App\Progress\Sync\SyncService;
use App\Progress\Sync\SyncWriteFailed;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\FakeChangesReader;
use Tests\Support\Sync\FakeOperationProcessor;

function syncDeadlock(): QueryException
{
    return new QueryException('mysql', 'select 1', [], new PDOException('Deadlock found when trying to get lock; try restarting transaction'));
}

// RefreshDatabase wraps each test in a transaction, and a nested one never retries a deadlock: the retry belongs to the outermost.
beforeEach(function () {
    DB::rollBack();
    DB::table('content_imports')->insert([
        'document_hash' => str_repeat('b', 32).str_repeat('0', 32), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => '2026-10-01 00:00:00.000',
    ]);
    $this->user = ProgressWorld::user();
    $this->processor = new FakeOperationProcessor;
    $this->service = new SyncService(new AccountLock, $this->processor, new FakeChangesReader, new OperationRegistry, new ContentImports);
    $this->request = new SyncRequest(1, CarbonImmutable::parse('2026-10-05T12:10:00.000Z'), 0, null, 2, [
        ['id' => '00000000-0000-4000-8000-000000000001', 'type' => 'exercise.reflection', 'at' => '2026-10-05T12:09:58.000Z', 'exerciseId' => 'fx-rust-01', 'text' => 'Hola'],
        ['id' => '00000000-0000-4000-8000-000000000002', 'type' => 'exercise.reflection', 'at' => '2026-10-05T12:09:59.000Z', 'exerciseId' => 'fx-rust-02', 'text' => 'Chau'],
    ]);
});

afterEach(function () {
    $this->user->delete();
    DB::table('content_imports')->delete();
});

it('gives the same results and keeps one record per operation after a deadlock in the first attempt', function () {
    $this->processor->failNextApplyWith(syncDeadlock());

    $outcome = $this->service->sync($this->user->id, $this->request);

    expect(array_map(fn ($result) => $result->status->value, $outcome->results))->toBe(['applied', 'applied'])
        ->and(DB::table('sync_operations')->where('user_id', $this->user->id)->count())->toBe(2)
        ->and($outcome->revision)->toBe(1)
        ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision'))->toBe(1);
});

it('recovers from two deadlocks in a row with one record per operation', function () {
    $this->processor->failNextApplyWith(syncDeadlock());
    $this->processor->failNextApplyWith(syncDeadlock());

    $this->service->sync($this->user->id, $this->request);

    expect(DB::table('sync_operations')->where('user_id', $this->user->id)->count())->toBe(2);
});

it('gives up as SyncWriteFailed when the deadlock repeats in the three attempts', function () {
    foreach (range(1, 3) as $attempt) {
        $this->processor->failNextApplyWith(syncDeadlock());
    }

    expect(fn () => $this->service->sync($this->user->id, $this->request))->toThrow(SyncWriteFailed::class)
        ->and(DB::table('sync_operations')->where('user_id', $this->user->id)->count())->toBe(0);
});
