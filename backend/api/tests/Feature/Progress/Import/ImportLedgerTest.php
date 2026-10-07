<?php

use App\Progress\Import\ImportLedger;
use App\Progress\Import\ImportReport;
use App\Progress\Import\ImportRequest;
use App\Progress\Import\ImportSource;
use App\Progress\Import\Legacy\ReportEntry;
use App\Progress\ProgressHead;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Tests\Support\ProgressWorld;

const LEDGER_ID_1 = '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f';
const LEDGER_ID_2 = '7a2d3c0f-5b8e-4d2f-8c3a-1b2c3d4e5f60';
const LEDGER_ID_3 = '8b3e4d1a-6c9f-4e30-9d4b-2c3d4e5f6071';

beforeEach(function () {
    $this->ledger = new ImportLedger;
    $this->user = ProgressWorld::user();
    $this->other = ProgressWorld::user();
    $this->at = Instant::parse('2026-10-06 12:00:00.123');
});

function ledgerRequest(string $importId = LEDGER_ID_1, string $raw = '{"a":1}', ImportSource $source = ImportSource::Storage): ImportRequest
{
    return new ImportRequest($importId, 1, 2, $source, $raw, ['campaign' => []], false);
}

function ledgerRecord(int $userId, string $importId = LEDGER_ID_1, string $raw = '{"a":1}', int $epoch = 1, int $revision = 3): void
{
    (new ImportLedger)->record($userId, ledgerRequest($importId, $raw), hash('sha256', $raw), new ImportReport([], [], [], []), $epoch, $revision, Instant::parse('2026-10-06 12:00:00.123'));
}

function ledgerHead(int $userId, bool $reset = false): ProgressHead
{
    return new ProgressHead($userId, 1, 3, $reset ? Instant::parse('2026-10-01 10:00:00.000') : null, null);
}

describe('record', function () {
    it('leaves the row with the raw, its sha256, the report in JSON, the epoch, the revision and the time', function () {
        $report = new ImportReport(['exercises' => 2], [new ReportEntry('lab.records.rust-02.reviewAt', 'date_out_of_range')], [], []);

        $stored = $this->ledger->record($this->user->id, ledgerRequest(raw: '{"nota":"ñandú"}'), hash('sha256', '{"nota":"ñandú"}'), $report, 2, 7, $this->at);

        $row = DB::table('progress_imports')->first();
        expect($row->user_id)->toBe($this->user->id)
            ->and($row->import_id)->toBe(LEDGER_ID_1)
            ->and($row->source)->toBe('storage')
            ->and($row->raw_payload)->toBe('{"nota":"ñandú"}')
            ->and($row->raw_sha256)->toBe(hash('sha256', '{"nota":"ñandú"}'))
            ->and(json_decode($row->report, true))->toBe($report->toArray())
            ->and([$row->epoch, $row->revision, $row->imported_at])->toBe([2, 7, '2026-10-06 12:00:00.123'])
            ->and($stored->importId)->toBe(LEDGER_ID_1)
            ->and([$stored->epoch, $stored->revision])->toBe([2, 7])
            ->and(Instant::iso($stored->importedAt))->toBe('2026-10-06T12:00:00.123Z')
            ->and($stored->report->toArray())->toBe($report->toArray());
    });

    it('keeps the source of an exported file', function () {
        $this->ledger->record($this->user->id, ledgerRequest(source: ImportSource::Export), hash('sha256', '{"a":1}'), new ImportReport([], [], [], []), 1, 0, $this->at);

        expect(DB::table('progress_imports')->value('source'))->toBe('export');
    });

    it('keeps the raw byte by byte, with the spaces and the empty strings that a trim would eat', function () {
        $raw = "  {\"a\":\"\"}\n ";

        $this->ledger->record($this->user->id, ledgerRequest(raw: $raw), hash('sha256', $raw), new ImportReport([], [], [], []), 1, 0, $this->at);

        expect(DB::table('progress_imports')->value('raw_payload'))->toBe($raw);
    });
});

describe('byImportId', function () {
    it('finds the import of the account by its id with its stored data', function () {
        ledgerRecord($this->user->id, epoch: 2, revision: 7);

        $stored = $this->ledger->byImportId($this->user->id, LEDGER_ID_1);

        expect($stored?->importId)->toBe(LEDGER_ID_1)
            ->and($stored?->rawSha256)->toBe(hash('sha256', '{"a":1}'))
            ->and([$stored?->epoch, $stored?->revision])->toBe([2, 7]);
    });

    it('finds nothing for an unknown id or for the id of another account', function () {
        ledgerRecord($this->other->id);

        expect($this->ledger->byImportId($this->user->id, LEDGER_ID_1))->toBeNull()
            ->and($this->ledger->byImportId($this->user->id, LEDGER_ID_2))->toBeNull();
    });
});

describe('byRawInEpoch', function () {
    it('finds the import of the account with the same raw in the same epoch', function () {
        ledgerRecord($this->user->id, LEDGER_ID_1, '{"a":1}', epoch: 2);

        expect($this->ledger->byRawInEpoch($this->user->id, hash('sha256', '{"a":1}'), 2)?->importId)->toBe(LEDGER_ID_1);
    });

    it('does not find the raw in another epoch, in another account or another raw', function () {
        ledgerRecord($this->user->id, LEDGER_ID_1, '{"a":1}', epoch: 1);
        ledgerRecord($this->other->id, LEDGER_ID_2, '{"b":2}', epoch: 2);

        expect($this->ledger->byRawInEpoch($this->user->id, hash('sha256', '{"a":1}'), 2))->toBeNull()
            ->and($this->ledger->byRawInEpoch($this->user->id, hash('sha256', '{"b":2}'), 2))->toBeNull();
    });

    it('answers with the first import when the same raw was imported twice in the epoch', function () {
        ledgerRecord($this->user->id, LEDGER_ID_1);
        ledgerRecord($this->user->id, LEDGER_ID_2);

        expect($this->ledger->byRawInEpoch($this->user->id, hash('sha256', '{"a":1}'), 1)?->importId)->toBe(LEDGER_ID_1);
    });
});

describe('needsConfirmation', function () {
    it('is false for an account with no history and a raw nobody imported', function () {
        expect($this->ledger->needsConfirmation(ledgerHead($this->user->id), hash('sha256', '{"a":1}')))->toBeFalse();
    });

    it('is true when the account reset its progress once', function () {
        expect($this->ledger->needsConfirmation(ledgerHead($this->user->id, reset: true), hash('sha256', '{"a":1}')))->toBeTrue();
    });

    it('is true when the account already imported another raw, in any epoch', function () {
        ledgerRecord($this->user->id, LEDGER_ID_1, '{"a":1}', epoch: 1);

        expect($this->ledger->needsConfirmation(ledgerHead($this->user->id), hash('sha256', '{"b":2}')))->toBeTrue();
    });

    it('is true when another account imported the same raw', function () {
        ledgerRecord($this->other->id, LEDGER_ID_2, '{"a":1}');

        expect($this->ledger->needsConfirmation(ledgerHead($this->user->id), hash('sha256', '{"a":1}')))->toBeTrue();
    });

    it('is false when the only import of the account is the same raw and no other account has it', function () {
        ledgerRecord($this->user->id, LEDGER_ID_1, '{"a":1}');
        ledgerRecord($this->other->id, LEDGER_ID_3, '{"c":3}');

        expect($this->ledger->needsConfirmation(ledgerHead($this->user->id), hash('sha256', '{"a":1}')))->toBeFalse();
    });
});
