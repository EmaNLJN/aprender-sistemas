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
use Illuminate\Support\Facades\Log;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\FakeChangesReader;
use Tests\Support\Sync\FakeOperationProcessor;

const WRITE_FAILED_SENTINEL = 'sentinel-text-8841';

function writeFailedQueryException(): QueryException
{
    $driverError = new class('Incorrect string value') extends PDOException
    {
        protected $code = 'HY000';
    };
    $driverError->errorInfo = ['HY000', 1366, 'Incorrect string value'];

    return new QueryException('mysql', 'insert into `drafts` (`code`) values (?)', [WRITE_FAILED_SENTINEL], $driverError);
}

beforeEach(function () {
    Log::spy();
    DB::table('content_imports')->insert([
        'document_hash' => str_repeat('a', 32).str_repeat('0', 32), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => '2026-10-01 00:00:00.000',
    ]);
    $this->user = ProgressWorld::user();
    $this->processor = new FakeOperationProcessor;
    $this->processor->failNextApplyWith(writeFailedQueryException());
    $this->service = new SyncService(new AccountLock, $this->processor, new FakeChangesReader, new OperationRegistry, new ContentImports);
    $this->request = new SyncRequest(1, CarbonImmutable::parse('2026-10-05T12:10:00.000Z'), 0, null, 2, [
        ['id' => '00000000-0000-4000-8000-000000000001', 'type' => 'exercise.draft', 'at' => '2026-10-05T12:09:58.000Z', 'exerciseId' => 'fx-rust-01', 'code' => WRITE_FAILED_SENTINEL, 'starterHash' => null],
    ]);
});

it('throws SyncWriteFailed without the text of the student, the statement or a previous exception when the database rejects a write', function () {
    try {
        $this->service->sync($this->user->id, $this->request);
        $this->fail('expected SyncWriteFailed');
    } catch (SyncWriteFailed $failure) {
        expect($failure->getMessage())->toBe('La base rechazó la escritura (SQLSTATE HY000, error 1366).')
            ->and($failure->getMessage())->not->toContain(WRITE_FAILED_SENTINEL)
            ->and($failure->getPrevious())->toBeNull();
    }
});

it('logs only the SQLSTATE and the driver code', function () {
    try {
        $this->service->sync($this->user->id, $this->request);
    } catch (SyncWriteFailed) {
    }

    Log::shouldHaveReceived('error')->with('sync.write_failed', ['sql_state' => 'HY000', 'driver_code' => 1366])->once();
});

it('leaves no record of the operation and no revision moved', function () {
    try {
        $this->service->sync($this->user->id, $this->request);
    } catch (SyncWriteFailed) {
    }

    expect(DB::table('sync_operations')->count())->toBe(0)
        ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision'))->toBeNull();
});
