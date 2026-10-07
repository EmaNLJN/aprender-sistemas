<?php

use App\Content\ContentImports;
use App\Progress\AccountLock;
use App\Progress\ContentNotImported;
use App\Progress\Import\ImportContent;
use App\Progress\Import\ImportLedger;
use App\Progress\Import\ImportNeedsConfirmation;
use App\Progress\Import\ImportReport;
use App\Progress\Import\ImportRequest;
use App\Progress\Import\ImportService;
use App\Progress\Import\ImportSource;
use App\Progress\Import\ImportWriteFailed;
use App\Progress\Import\LegacyDecoder;
use App\Progress\ProgressAreas;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use App\Runs\Record\Instant;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Monolog\Handler\TestHandler;
use Tests\Support\Import\FakeLegacyWriter;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\FakeChangesReader;

const IMPORT_SVC_ID_1 = '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f';
const IMPORT_SVC_ID_2 = '7a2d3c0f-5b8e-4d2f-8c3a-1b2c3d4e5f60';
const IMPORT_SVC_RAW = '{"taller-laboratorio-v1":"{}"}';
const IMPORT_SVC_OTHER_RAW = '{"taller-learning-v1":"{}"}';
const IMPORT_SVC_SENTINEL = 'zq7-centinela-crudo-privado-0451';

function importSvcWorld(): array
{
    return [
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'exercises' => [['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3]],
        'worlds' => [], 'workshops' => [], 'guide' => ['steps' => [], 'resources' => []],
    ];
}

function importSvcNormalized(array $record = []): array
{
    return ['lab' => ['version' => 1, 'selected' => ['rust' => null, 'go' => null], 'records' => [
        'fx-rust-01' => ['predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false, ...$record],
    ]]];
}

function importSvcRequest(array $overrides = []): ImportRequest
{
    $values = [
        'importId' => IMPORT_SVC_ID_1, 'epoch' => 1, 'format' => 2, 'source' => ImportSource::Storage,
        'raw' => IMPORT_SVC_RAW, 'normalized' => importSvcNormalized(), 'confirm' => false, ...$overrides,
    ];

    return new ImportRequest(...$values);
}

function importSvcService(FakeLegacyWriter $writer, FakeChangesReader $reader): ImportService
{
    return new ImportService(new AccountLock, new ImportContent, new LegacyDecoder, $writer, $reader, new ImportLedger, new ContentImports);
}

function importSvcDeadlock(): QueryException
{
    return new QueryException('mysql', 'select 1', [], new PDOException('Deadlock found when trying to get lock; try restarting transaction'));
}

function importSvcStoredHead(int $userId): object
{
    return DB::table('progress_heads')->where('user_id', $userId)->first();
}

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-06 12:00:00.123'));
    ProgressWorld::seed(importSvcWorld());
    $this->user = ProgressWorld::user();
    $this->writer = new FakeLegacyWriter;
    $this->reader = new FakeChangesReader;
    $this->service = importSvcService($this->writer, $this->reader);
});

describe('the errors, in the order of http-d1b.md section 2', function () {
    it('throws ClientOutdated for a format it does not accept, before looking for content', function () {
        DB::table('content_imports')->delete();

        expect(fn () => $this->service->import($this->user->id, importSvcRequest(['format' => 1])))->toThrow(ClientOutdated::class);
    });

    it('throws ContentNotImported when there is no content, before comparing the epoch', function () {
        DB::table('content_imports')->delete();
        ProgressWorld::head($this->user, epoch: 3);

        expect(fn () => $this->service->import($this->user->id, importSvcRequest(['epoch' => 1])))->toThrow(ContentNotImported::class);
    });

    it('throws EpochMismatch with the current epoch and revision, even when the normalized is invalid, and never decodes it', function () {
        ProgressWorld::head($this->user, epoch: 3, revision: 7);

        try {
            $this->service->import($this->user->id, importSvcRequest(['epoch' => 2, 'normalized' => ['route' => ['version' => 9]]]));
            $this->fail('expected EpochMismatch');
        } catch (EpochMismatch $mismatch) {
            expect([$mismatch->epoch, $mismatch->revision])->toBe([3, 7]);
        }

        expect($this->writer->calls)->toBe([])
            ->and(DB::table('progress_imports')->count())->toBe(0);
    });

    it('answers the epoch of an account without a head as 1 and writes no head to say so', function () {
        try {
            $this->service->import($this->user->id, importSvcRequest(['epoch' => 2]));
            $this->fail('expected EpochMismatch');
        } catch (EpochMismatch $mismatch) {
            expect([$mismatch->epoch, $mismatch->revision])->toBe([1, 0]);
        }

        expect(DB::table('progress_heads')->count())->toBe(0);
    });

    it('throws ValidationException with the path of a normalized that does not come from the parsers, and writes nothing', function () {
        $request = importSvcRequest(['normalized' => importSvcNormalized(['colour' => 'red'])]);

        try {
            $this->service->import($this->user->id, $request);
            $this->fail('expected ValidationException');
        } catch (ValidationException $invalid) {
            expect(array_keys($invalid->errors()))->toBe(['normalized.lab.records.fx-rust-01.colour']);
        }

        expect($this->writer->calls)->toBe([])
            ->and(DB::table('progress_heads')->count())->toBe(0);
    });
});

describe('what was already imported', function () {
    it('answers repeated with the stored report for the same importId, raw and epoch, and does not call the writer again', function () {
        $this->writer->counts = ['exercises' => 2];
        $first = $this->service->import($this->user->id, importSvcRequest());

        $second = $this->service->import($this->user->id, importSvcRequest());

        expect([$first->repeated, $second->repeated])->toBe([false, true])
            ->and($second->import->report->toArray())->toBe($first->import->report->toArray())
            ->and($second->import->importId)->toBe(IMPORT_SVC_ID_1)
            ->and($this->writer->calls)->toHaveCount(1)
            ->and(DB::table('progress_imports')->count())->toBe(1)
            ->and(importSvcStoredHead($this->user->id)->revision)->toBe(1);
    });

    it('throws a 422 on importId for the same id with another raw', function () {
        $this->service->import($this->user->id, importSvcRequest());

        try {
            $this->service->import($this->user->id, importSvcRequest(['raw' => IMPORT_SVC_OTHER_RAW, 'confirm' => true]));
            $this->fail('expected ValidationException');
        } catch (ValidationException $invalid) {
            expect(array_keys($invalid->errors()))->toBe(['importId']);
        }

        expect($this->writer->calls)->toHaveCount(1);
    });

    it('throws a 422 on importId for the same id and raw coming from an earlier epoch', function () {
        ProgressWorld::head($this->user, epoch: 1);
        $this->service->import($this->user->id, importSvcRequest());
        DB::table('progress_heads')->where('user_id', $this->user->id)->update(['epoch' => 2, 'reset_at' => '2026-10-06 11:00:00.000']);

        try {
            $this->service->import($this->user->id, importSvcRequest(['epoch' => 2, 'confirm' => true]));
            $this->fail('expected ValidationException');
        } catch (ValidationException $invalid) {
            expect(array_keys($invalid->errors()))->toBe(['importId']);
        }
    });

    it('answers repeated for the same raw under another importId in the epoch, without asking for confirmation', function () {
        $first = $this->service->import($this->user->id, importSvcRequest());

        $second = $this->service->import($this->user->id, importSvcRequest(['importId' => IMPORT_SVC_ID_2]));

        expect($second->repeated)->toBeTrue()
            ->and($second->import->importId)->toBe(IMPORT_SVC_ID_1)
            ->and($second->import->report->toArray())->toBe($first->import->report->toArray())
            ->and($this->writer->calls)->toHaveCount(1)
            ->and(DB::table('progress_imports')->count())->toBe(1);
    });

    it('applies the same raw again after a reset, with confirmation', function () {
        $this->service->import($this->user->id, importSvcRequest());
        DB::table('progress_heads')->where('user_id', $this->user->id)->update(['epoch' => 2, 'reset_at' => '2026-10-06 11:00:00.000']);

        expect(fn () => $this->service->import($this->user->id, importSvcRequest(['importId' => IMPORT_SVC_ID_2, 'epoch' => 2])))->toThrow(ImportNeedsConfirmation::class);
        $outcome = $this->service->import($this->user->id, importSvcRequest(['importId' => IMPORT_SVC_ID_2, 'epoch' => 2, 'confirm' => true]));

        expect($outcome->repeated)->toBeFalse()
            ->and($this->writer->calls)->toHaveCount(2)
            ->and(DB::table('progress_imports')->count())->toBe(2);
    });
});

describe('the confirmation', function () {
    it('asks for no confirmation on the first import of a clean account', function () {
        expect($this->service->import($this->user->id, importSvcRequest())->repeated)->toBeFalse();
    });

    it('asks for confirmation for each of the three reasons, and applies with confirm', function (Closure $arrange) {
        $arrange($this);

        expect(fn () => $this->service->import($this->user->id, importSvcRequest(['importId' => IMPORT_SVC_ID_2, 'raw' => IMPORT_SVC_OTHER_RAW])))
            ->toThrow(ImportNeedsConfirmation::class);
        expect($this->writer->calls)->toHaveCount(0);

        $outcome = $this->service->import($this->user->id, importSvcRequest(['importId' => IMPORT_SVC_ID_2, 'raw' => IMPORT_SVC_OTHER_RAW, 'confirm' => true]));

        expect($outcome->repeated)->toBeFalse()
            ->and($this->writer->calls)->toHaveCount(1);
    })->with([
        'the account imported another raw' => [function ($test) {
            $test->service->import($test->user->id, importSvcRequest(['raw' => IMPORT_SVC_RAW]));
            $test->writer->calls = [];
        }],
        'the account reset its progress' => [function ($test) {
            ProgressWorld::head($test->user);
            DB::table('progress_heads')->where('user_id', $test->user->id)->update(['reset_at' => '2026-10-06 11:00:00.000']);
        }],
        'another account imported the same raw' => [function ($test) {
            $other = ProgressWorld::user();
            $test->service->import($other->id, importSvcRequest(['raw' => IMPORT_SVC_OTHER_RAW]));
            $test->writer->calls = [];
        }],
    ]);
});

describe('applying', function () {
    it('hands the writer the revision after the head, inside the lock, with the epoch of the account', function () {
        ProgressWorld::head($this->user, epoch: 2, revision: 4);
        $baseline = DB::transactionLevel();

        $this->service->import($this->user->id, importSvcRequest(['epoch' => 2, 'confirm' => true]));

        $call = $this->writer->calls[0];
        expect([$call['userId'], $call['epoch'], $call['revision'], $call['headRevision']])->toBe([$this->user->id, 2, 5, 4])
            ->and($call['transactionLevel'])->toBe($baseline + 1)
            ->and(Instant::iso($call['now']))->toBe('2026-10-06T12:00:00.123Z')
            ->and($call['progress']->exercises[0]->exerciseId)->toBe('fx-rust-01');
    });

    it('raises the revision once and stamps the activity when the writer changed some row of state', function () {
        ProgressWorld::head($this->user, revision: 4);
        $this->writer->counts = ['exercises' => 2, 'drafts' => 1];

        $outcome = $this->service->import($this->user->id, importSvcRequest(['confirm' => true]));

        $head = importSvcStoredHead($this->user->id);
        expect([$head->revision, $head->last_activity_at])->toBe([5, '2026-10-06 12:00:00.123'])
            ->and([$outcome->import->epoch, $outcome->import->revision])->toBe([1, 5])
            ->and(DB::table('progress_imports')->value('revision'))->toBe(5);
    });

    it('does not raise the revision when only legacy attempts were inserted, and stores the revision it found', function () {
        ProgressWorld::head($this->user, revision: 4);
        $this->writer->counts = ['attempts' => 3];

        $outcome = $this->service->import($this->user->id, importSvcRequest(['confirm' => true]));

        $head = importSvcStoredHead($this->user->id);
        expect([$head->revision, $head->last_activity_at])->toBe([4, null])
            ->and($outcome->import->revision)->toBe(4)
            ->and($outcome->import->report->written['attempts'])->toBe(3);
    });

    it('records one import with the sha256 of the raw, the source and the time', function () {
        $this->service->import($this->user->id, importSvcRequest(['source' => ImportSource::Export]));

        $row = DB::table('progress_imports')->first();
        expect([$row->user_id, $row->import_id, $row->source, $row->raw_payload, $row->raw_sha256, $row->imported_at])->toBe([
            $this->user->id, IMPORT_SVC_ID_1, 'export', IMPORT_SVC_RAW, hash('sha256', IMPORT_SVC_RAW), '2026-10-06 12:00:00.123',
        ]);
    });

    it('gathers what was omitted, what was replaced, what the writer wrote and the conflicts in the report', function () {
        $this->writer->counts = ['exercises' => 1, 'drafts' => 1];
        $this->reader->areas = new ProgressAreas(exercises: [['exerciseId' => 'fx-rust-01', 'reflection' => ['text' => 'v2', 'at' => '2026-10-05T12:00:00.000Z']]]);
        $normalized = importSvcNormalized(['hints' => 5, 'reflection' => 'v1 con '."\u{FFFD}"]);

        $outcome = $this->service->import($this->user->id, importSvcRequest(['normalized' => $normalized, 'raw' => "{\"a\":\"\u{FFFD}\"}"]));

        expect($outcome->import->report->toArray())->toBe([
            'written' => ['exercises' => 1, 'drafts' => 1, 'attempts' => 0, 'campaignSeals' => 0, 'campaignCheckpoints' => 0, 'workshops' => 0,
                'workshopObjectives' => 0, 'workshopSteps' => 0, 'routeMarks' => 0, 'routeQuiz' => 0, 'routeNotes' => 0, 'preferences' => 0],
            'omitted' => [['path' => 'lab.records.fx-rust-01.hints', 'reason' => 'beyond_active_hints']],
            'replaced' => [
                ['path' => 'raw', 'reason' => 'replacement_character'],
                ['path' => 'lab.records.fx-rust-01.reflection', 'reason' => 'replacement_character'],
            ],
            'conflicts' => [['path' => 'lab.records.fx-rust-01.reflection', 'reason' => 'newer_value_kept']],
        ]);
    });

    it('reads the previous photo of the account inside the lock before writing, as the full snapshot', function () {
        ProgressWorld::head($this->user, revision: 4);

        $this->service->import($this->user->id, importSvcRequest(['confirm' => true]));

        expect($this->reader->calls)->toHaveCount(1)
            ->and($this->reader->calls[0]['sinceRevision'])->toBeNull()
            ->and($this->reader->calls[0]['headRevision'])->toBe(4)
            ->and($this->reader->calls[0]['transactionLevel'])->toBeGreaterThan(0);
    });

    it('returns an outcome with the body of the contract and the status that says if it was repeated', function () {
        $this->writer->counts = ['exercises' => 1];

        $first = $this->service->import($this->user->id, importSvcRequest());
        $second = $this->service->import($this->user->id, importSvcRequest());

        expect([$first->status(), $second->status()])->toBe([201, 200])
            ->and($first->toArray())->toBe([
                'importId' => IMPORT_SVC_ID_1, 'epoch' => 1, 'revision' => 1, 'importedAt' => '2026-10-06T12:00:00.123Z',
                'report' => (new ImportReport(['exercises' => 1], [], [], []))->toArray(),
            ])
            ->and($second->toArray())->toBe($first->toArray());
    });
});

describe('the database fails', function () {
    beforeEach(function () {
        $driverError = new class('Incorrect string value') extends PDOException
        {
            protected $code = 'HY000';
        };
        $driverError->errorInfo = ['HY000', 1366, 'Incorrect string value'];
        $this->failure = new QueryException('mysql', 'insert into `drafts` (`code`) values (?)', [IMPORT_SVC_SENTINEL], $driverError);
        config(['logging.default' => 'stderr']);
        $this->handler = new TestHandler;
        Log::channel('stderr')->getLogger()->setHandlers([$this->handler]);
    });

    it('throws ImportWriteFailed without the text, the statement or a previous exception, and leaves the SQLSTATE in the log', function () {
        $this->writer->failNextWriteWith($this->failure);

        try {
            $this->service->import($this->user->id, importSvcRequest(['raw' => '{"a":"'.IMPORT_SVC_SENTINEL.'"}']));
            $this->fail('expected ImportWriteFailed');
        } catch (ImportWriteFailed $failure) {
            expect($failure->getMessage())->toBe('La base rechazó la escritura (SQLSTATE HY000, error 1366).')
                ->and($failure->getPrevious())->toBeNull();
        }

        $logged = array_map(fn ($record) => json_encode([$record->message, $record->context]), $this->handler->getRecords());
        expect(implode("\n", $logged))->toContain('import.write_failed')->toContain('HY000')->not->toContain(IMPORT_SVC_SENTINEL)
            ->and(DB::table('progress_imports')->count())->toBe(0);
    });

    it('keeps the raw out of every log line of an import that succeeds, and logs how it went', function () {
        $this->service->import($this->user->id, importSvcRequest(['raw' => '{"a":"'.IMPORT_SVC_SENTINEL.'"}']));
        $this->service->import($this->user->id, importSvcRequest(['raw' => '{"a":"'.IMPORT_SVC_SENTINEL.'"}']));

        $records = collect($this->handler->getRecords())->filter(fn ($record) => str_starts_with($record->message, 'progress.import.'));
        expect($records->pluck('message')->all())->toBe(['progress.import.applied', 'progress.import.repeated'])
            ->and($records->first()->context)->toMatchArray(['user_id' => $this->user->id, 'import_id' => IMPORT_SVC_ID_1, 'source' => 'storage', 'epoch' => 1, 'revision' => 0, 'omitted' => 0, 'conflicts' => 0])
            ->and(array_keys($records->first()->context))->toContain('written', 'duration_ms', 'peak_memory_bytes')
            ->and(json_encode($this->handler->getRecords()))->not->toContain(IMPORT_SVC_SENTINEL);
    });
});

describe('a deadlock', function () {
    // RefreshDatabase wraps each test in a transaction, and a nested one never retries a deadlock: the retry belongs to the outermost.
    beforeEach(function () {
        DB::rollBack();
        DB::table('content_imports')->insert([
            'document_hash' => str_repeat('c', 32).str_repeat('0', 32), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => '2026-10-01 00:00:00.000',
        ]);
        $this->user = ProgressWorld::user();
        $this->writer = new FakeLegacyWriter(['exercises' => 1]);
        $this->service = importSvcService($this->writer, new FakeChangesReader);
        $this->campaignOnly = ['campaign' => ['version' => 1, 'seals' => [], 'checkpoints' => []]];
    });

    afterEach(function () {
        $this->user->delete();
        DB::table('content_imports')->delete();
    });

    it('leaves one row in progress_imports and one revision when the writer deadlocks in the first attempt', function () {
        $this->writer->failNextWriteWith(importSvcDeadlock());

        $outcome = $this->service->import($this->user->id, importSvcRequest(['normalized' => $this->campaignOnly]));

        expect($this->writer->calls)->toHaveCount(2)
            ->and(DB::table('progress_imports')->where('user_id', $this->user->id)->count())->toBe(1)
            ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision'))->toBe(1)
            ->and($outcome->import->revision)->toBe(1);
    });

    it('gives up as ImportWriteFailed when the deadlock repeats in the three attempts and leaves nothing', function () {
        foreach (range(1, 3) as $attempt) {
            $this->writer->failNextWriteWith(importSvcDeadlock());
        }

        expect(fn () => $this->service->import($this->user->id, importSvcRequest(['normalized' => $this->campaignOnly])))->toThrow(ImportWriteFailed::class)
            ->and(DB::table('progress_imports')->where('user_id', $this->user->id)->count())->toBe(0);
    });
});
