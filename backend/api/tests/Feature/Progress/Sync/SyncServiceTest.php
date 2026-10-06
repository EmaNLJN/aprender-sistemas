<?php

use App\Content\ContentImports;
use App\Progress\AccountLock;
use App\Progress\ContentNotImported;
use App\Progress\Operations\RejectionReason;
use App\Progress\ProgressAreas;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use App\Progress\Sync\OperationRegistry;
use App\Progress\Sync\ResultStatus;
use App\Progress\Sync\SyncRequest;
use App\Progress\Sync\SyncService;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\FakeChangesReader;
use Tests\Support\Sync\FakeOperationProcessor;

const SYNC_VERSION = '0123456789abcdef0123456789abcdef';
const SYNC_OTHER_VERSION = 'fedcba9876543210fedcba9876543210';
const SYNC_ID_1 = '00000000-0000-4000-8000-000000000001';
const SYNC_ID_2 = '00000000-0000-4000-8000-000000000002';
const SYNC_ID_3 = '00000000-0000-4000-8000-000000000003';
const SYNC_NOW = '2026-10-05T12:10:00.000Z';

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-05 12:10:00.000'));
    DB::table('content_imports')->insert([
        'document_hash' => SYNC_VERSION.str_repeat('0', 32), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => '2026-10-01 00:00:00.000',
    ]);
    $this->user = ProgressWorld::user();
    $this->processor = new FakeOperationProcessor;
    $this->reader = new FakeChangesReader;
    $this->service = new SyncService(new AccountLock, $this->processor, $this->reader, new OperationRegistry, new ContentImports);
});

/** @return array<string, mixed> */
function syncReflection(string $id = SYNC_ID_1, string $text = 'Hola', string $at = '2026-10-05T12:09:58.000Z'): array
{
    return ['id' => $id, 'type' => 'exercise.reflection', 'at' => $at, 'exerciseId' => 'fx-rust-01', 'text' => $text];
}

/**
 * @param  list<array<string, mixed>>  $operations
 * @param  array<string, mixed>  $overrides
 */
function syncRequest(array $operations = [], array $overrides = []): SyncRequest
{
    $values = $overrides + [
        'epoch' => 1, 'sentAt' => SYNC_NOW, 'knownRevision' => 1, 'knownContentVersion' => SYNC_VERSION, 'format' => 2,
    ];

    return new SyncRequest($values['epoch'], CarbonImmutable::parse($values['sentAt']), $values['knownRevision'], $values['knownContentVersion'], $values['format'], $operations);
}

/** @return list<array{string, ?string}> */
function syncStatuses($outcome): array
{
    return array_map(fn ($result) => [$result->status->value, $result->reason], $outcome->results);
}

function syncStoredHead(int $userId): object
{
    return DB::table('progress_heads')->where('user_id', $userId)->first();
}

describe('guards', function () {
    it('throws ClientOutdated for a format the server does not accept, before reading anything', function () {
        expect(fn () => $this->service->sync($this->user->id, syncRequest([syncReflection()], ['format' => 1])))->toThrow(ClientOutdated::class);

        expect($this->processor->decodedBatches)->toBe([])
            ->and(DB::table('progress_heads')->count())->toBe(0);
    });

    it('throws ContentNotImported when no content was imported', function () {
        DB::table('content_imports')->delete();

        expect(fn () => $this->service->sync($this->user->id, syncRequest([syncReflection()])))->toThrow(ContentNotImported::class);

        expect($this->processor->decodedBatches)->toBe([])
            ->and(DB::table('progress_heads')->count())->toBe(0);
    });

    it('throws EpochMismatch with the current epoch and revision before applying anything or remembering a uuid', function () {
        ProgressWorld::head($this->user, epoch: 3, revision: 7);

        try {
            $this->service->sync($this->user->id, syncRequest([syncReflection()], ['epoch' => 2]));
            $this->fail('expected EpochMismatch');
        } catch (EpochMismatch $mismatch) {
            expect([$mismatch->epoch, $mismatch->revision])->toBe([3, 7]);
        }

        expect($this->processor->applied)->toBe([])
            ->and(DB::table('sync_operations')->count())->toBe(0)
            ->and(syncStoredHead($this->user->id)->revision)->toBe(7);
    });
});

describe('the head and the revision', function () {
    it('creates the head of an account on its first sync, with epoch 1 and revision 0, and writes no operation for an empty batch', function () {
        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 0]));

        $head = syncStoredHead($this->user->id);
        expect([$head->epoch, $head->revision, $head->last_activity_at])->toBe([1, 0, null])
            ->and([$outcome->epoch, $outcome->revision, $outcome->results])->toBe([1, 0, []])
            ->and(DB::table('sync_operations')->count())->toBe(0);
    });

    it('raises the revision once and stamps the last activity when the batch changes something', function () {
        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'A'), syncReflection(SYNC_ID_2, 'B')]));

        $head = syncStoredHead($this->user->id);
        expect($head->revision)->toBe(1)
            ->and($head->last_activity_at)->toBe('2026-10-05 12:10:00.000')
            ->and($outcome->revision)->toBe(1)
            ->and(array_column($this->processor->applied, 'revision'))->toBe([1, 1]);
    });

    it('does not raise the revision when no operation changed anything, but still remembers them', function () {
        $this->processor->unchangedIds = [SYNC_ID_1];

        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection()]));

        $head = syncStoredHead($this->user->id);
        expect([$head->revision, $head->last_activity_at])->toBe([0, null])
            ->and($outcome->revision)->toBe(0)
            ->and(DB::table('sync_operations')->count())->toBe(1);
    });

    it('raises the revision when any operation of the batch changed something, even if the last one did not', function () {
        $this->processor->unchangedIds = [SYNC_ID_2];

        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1), syncReflection(SYNC_ID_2)]));

        expect($outcome->revision)->toBe(1);
    });

    it('leaves the revision for the next change: the revision after the first batch is the base of the second', function () {
        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1)]));

        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_2)]));

        expect(array_column($this->processor->applied, 'revision'))->toBe([1, 2])
            ->and(syncStoredHead($this->user->id)->revision)->toBe(2);
    });

    it('answers with the time of the server and the current content version', function () {
        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 0]));

        expect(Instant::iso($outcome->serverTime))->toBe(SYNC_NOW)
            ->and($outcome->contentVersion)->toBe(SYNC_VERSION);
    });
});

describe('idempotency', function () {
    it('answers applied, duplicate and duplicate to the same batch sent three times, and applies it once', function () {
        $batch = [syncReflection()];

        $first = $this->service->sync($this->user->id, syncRequest($batch));
        $second = $this->service->sync($this->user->id, syncRequest($batch));
        $third = $this->service->sync($this->user->id, syncRequest($batch));

        expect(syncStatuses($first))->toBe([['applied', null]])
            ->and(syncStatuses($second))->toBe([['duplicate', null]])
            ->and(syncStatuses($third))->toBe([['duplicate', null]])
            ->and($this->processor->applied)->toHaveCount(1)
            ->and(syncStoredHead($this->user->id)->revision)->toBe(1)
            ->and(DB::table('sync_operations')->count())->toBe(1);
    });

    it('answers uuid_reused to the same uuid with other content and keeps the first record', function () {
        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Hola')]));
        $stored = DB::table('sync_operations')->first();

        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Chau')]));

        expect(syncStatuses($outcome))->toBe([['uuid_reused', null]])
            ->and($this->processor->applied)->toHaveCount(1)
            ->and(DB::table('sync_operations')->count())->toBe(1)
            ->and(DB::table('sync_operations')->first())->toEqual($stored);
    });

    it('answers duplicate with the reason of a rejected operation sent again', function () {
        $this->processor->rejectOnCheck = [SYNC_ID_1 => RejectionReason::UnknownReference];

        $first = $this->service->sync($this->user->id, syncRequest([syncReflection()]));
        $second = $this->service->sync($this->user->id, syncRequest([syncReflection()]));

        expect(syncStatuses($first))->toBe([['rejected', 'unknown_reference']])
            ->and(syncStatuses($second))->toBe([['duplicate', 'unknown_reference']]);
    });

    it('answers duplicate with stale_content to an operation that was applied without its flag', function () {
        $this->processor->staleIds = [SYNC_ID_1];

        $first = $this->service->sync($this->user->id, syncRequest([syncReflection()]));
        $second = $this->service->sync($this->user->id, syncRequest([syncReflection()]));

        expect(syncStatuses($first))->toBe([['stale_content', null]])
            ->and(syncStatuses($second))->toBe([['duplicate', 'stale_content']]);
    });

    it('resolves two operations with the same uuid in one batch against the first', function (string $secondText, string $secondStatus) {
        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Hola'), syncReflection(SYNC_ID_1, $secondText)]));

        expect(syncStatuses($outcome))->toBe([['applied', null], [$secondStatus, null]])
            ->and($this->processor->applied)->toHaveCount(1)
            ->and(DB::table('sync_operations')->count())->toBe(1);
    })->with([
        'same content' => ['Hola', 'duplicate'],
        'other content' => ['Chau', 'uuid_reused'],
    ]);

    it('applies again a uuid whose record was already pruned', function () {
        $this->service->sync($this->user->id, syncRequest([syncReflection()]));
        DB::table('sync_operations')->where('user_id', $this->user->id)->delete();

        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection()]));

        expect(syncStatuses($outcome))->toBe([['applied', null]])
            ->and($this->processor->applied)->toHaveCount(2);
    });

    it('does not mix the uuids of two accounts', function () {
        $other = ProgressWorld::user();
        $this->service->sync($this->user->id, syncRequest([syncReflection()]));

        $outcome = $this->service->sync($other->id, syncRequest([syncReflection()]));

        expect(syncStatuses($outcome))->toBe([['applied', null]]);
    });
});

describe('the clock', function () {
    it('rejects with out_of_range an operation whose corrected clock is before 2020-01-01, without reaching the processor', function () {
        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Hola', '2019-12-31T23:59:59.000Z')]));

        expect(syncStatuses($outcome))->toBe([['rejected', 'out_of_range']])
            ->and($this->processor->applied)->toBe([])
            ->and(DB::table('sync_operations')->value('status'))->toBe('rejected')
            ->and(DB::table('sync_operations')->value('reason'))->toBe('out_of_range');
    });

    it('accepts an operation dated exactly at the floor', function () {
        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Hola', '2020-01-01T00:00:00.000Z')]));

        expect(syncStatuses($outcome))->toBe([['applied', null]]);
    });

    it('hands the processor the account, the corrected clock, the revision and the time of the server', function () {
        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Hola', '2026-10-05T13:09:55.000Z')], ['sentAt' => '2026-10-05T13:10:00.000Z']));

        $call = $this->processor->applied[0];
        expect($call['userId'])->toBe($this->user->id)
            ->and(Instant::iso($call['effectiveAt']))->toBe('2026-10-05T12:09:55.000Z')
            ->and($call['revision'])->toBe(1)
            ->and(Instant::iso($call['now']))->toBe(SYNC_NOW);
    });
});

describe('the results', function () {
    it('come in the order of the request, one per operation', function () {
        $this->processor->rejectOnDecode = [SYNC_ID_2 => RejectionReason::Invalid];
        $this->processor->staleIds = [SYNC_ID_3];

        $outcome = $this->service->sync($this->user->id, syncRequest([
            syncReflection(SYNC_ID_1), syncReflection(SYNC_ID_2), syncReflection(SYNC_ID_3),
        ]));

        expect(array_map(fn ($result) => $result->id, $outcome->results))->toBe([SYNC_ID_1, SYNC_ID_2, SYNC_ID_3])
            ->and(syncStatuses($outcome))->toBe([['applied', null], ['rejected', 'invalid'], ['stale_content', null]])
            ->and($outcome->results[2]->status)->toBe(ResultStatus::StaleContent);
    });

    it('apply only the operations that were not rejected, in order', function () {
        $this->processor->rejectOnCheck = [SYNC_ID_2 => RejectionReason::OutOfRange];

        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1), syncReflection(SYNC_ID_2), syncReflection(SYNC_ID_3)]));

        expect(array_column($this->processor->applied, 'id'))->toBe([SYNC_ID_1, SYNC_ID_3]);
    });

    it('checks the references against the current content version', function () {
        $this->service->sync($this->user->id, syncRequest([syncReflection()]));

        expect($this->processor->contentVersionsChecked)->toBe([SYNC_VERSION]);
    });
});

describe('sync_operations', function () {
    it('keeps one row per processed operation, rejected ones included, with the hash, the status, the reason and the offset of the batch', function () {
        $this->processor->rejectOnDecode = [SYNC_ID_2 => RejectionReason::Invalid];
        $this->processor->staleIds = [SYNC_ID_3];

        $this->service->sync($this->user->id, syncRequest(
            [syncReflection(SYNC_ID_1, 'Hola'), syncReflection(SYNC_ID_2, 'Hola'), syncReflection(SYNC_ID_3, 'Hola')],
            ['sentAt' => '2026-10-05T11:10:00.000Z'],
        ));

        $rows = DB::table('sync_operations')->orderBy('operation_id')->get();
        $hashOfHola = hash('sha256', '{"at":"2026-10-05T12:09:58.000Z","exerciseId":"fx-rust-01","text":"Hola","type":"exercise.reflection"}');
        expect($rows)->toHaveCount(3)
            ->and(array_map(fn ($row) => bin2hex($row->operation_id), $rows->all()))->toBe([
                '00000000000040008000000000000001', '00000000000040008000000000000002', '00000000000040008000000000000003',
            ])
            ->and(array_map(fn ($row) => [$row->status, $row->reason], $rows->all()))->toBe([['applied', null], ['rejected', 'invalid'], ['applied', 'stale_content']])
            ->and(array_unique(array_map(fn ($row) => bin2hex($row->payload_sha256), $rows->all())))->toBe([$hashOfHola])
            ->and(array_unique(array_map(fn ($row) => [$row->user_id, $row->clock_offset_ms, $row->received_at], $rows->all()), SORT_REGULAR))
            ->toBe([[$this->user->id, 3600000, '2026-10-05 12:10:00.000']]);
    });

    it('keeps nothing for a duplicate, a reused uuid or a batch of another epoch', function () {
        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Hola')]));

        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Hola')]));
        $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_1, 'Chau')]));
        try {
            $this->service->sync($this->user->id, syncRequest([syncReflection(SYNC_ID_2, 'Otra')], ['epoch' => 9]));
        } catch (EpochMismatch) {
        }

        expect(DB::table('sync_operations')->count())->toBe(1);
    });

    it('bounds the offset of a device years away to the range of an INT column', function () {
        $this->service->sync($this->user->id, syncRequest([syncReflection()], ['sentAt' => '2020-01-01T00:00:00.000Z']));

        expect(DB::table('sync_operations')->value('clock_offset_ms'))->toBe(2147483647);
    });
});

describe('changes', function () {
    it('asks for everything when the client knows revision 0', function () {
        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 0]));

        expect($this->reader->calls[0]['sinceRevision'])->toBeNull()
            ->and($outcome->full)->toBeTrue();
    });

    it('asks for everything when the client knows another content version, or none', function (?string $known) {
        ProgressWorld::head($this->user, revision: 5);

        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 3, 'knownContentVersion' => $known]));

        expect($this->reader->calls[0]['sinceRevision'])->toBeNull()
            ->and($outcome->full)->toBeTrue();
    })->with([
        'another version' => [SYNC_OTHER_VERSION],
        'none' => [null],
    ]);

    it('asks for everything when the client knows a revision beyond the one of the server', function () {
        ProgressWorld::head($this->user, revision: 5);

        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 6]));

        expect($this->reader->calls[0]['sinceRevision'])->toBeNull()
            ->and($outcome->full)->toBeTrue();
    });

    it('asks only for what changed after the known revision otherwise, up to the revision of the server included', function () {
        ProgressWorld::head($this->user, revision: 5);

        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 5]));

        expect($this->reader->calls[0]['sinceRevision'])->toBe(5)
            ->and($outcome->full)->toBeFalse();
    });

    it('asks after raising the revision, so the changes include the ones of this batch', function () {
        ProgressWorld::head($this->user, revision: 5);

        $outcome = $this->service->sync($this->user->id, syncRequest([syncReflection()], ['knownRevision' => 5]));

        expect($this->reader->calls)->toHaveCount(1)
            ->and($this->reader->calls[0]['headRevision'])->toBe(6)
            ->and($this->reader->calls[0]['sinceRevision'])->toBe(5)
            ->and($outcome->revision)->toBe(6);
    });

    it('hands back what the reader returned', function () {
        $areas = new ProgressAreas(routeNotes: [['language' => 'rust']]);
        $this->reader->areas = $areas;

        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 0]));

        expect($outcome->changes)->toBe($areas);
    });

    it('answers a batch with no operations with what changed, without writing', function () {
        ProgressWorld::head($this->user, revision: 5);

        $outcome = $this->service->sync($this->user->id, syncRequest([], ['knownRevision' => 2]));

        expect($outcome->results)->toBe([])
            ->and($this->reader->calls[0]['sinceRevision'])->toBe(2)
            ->and($this->processor->applied)->toBe([])
            ->and(DB::table('sync_operations')->count())->toBe(0)
            ->and(syncStoredHead($this->user->id)->revision)->toBe(5);
    });
});
