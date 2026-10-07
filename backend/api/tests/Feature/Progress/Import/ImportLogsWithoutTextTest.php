<?php

use App\Progress\Import\ImportRequest;
use App\Progress\Import\ImportService;
use App\Progress\Import\ImportSource;
use App\Progress\Import\ImportWriteFailed;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\SyncDevice;

const IMPORT_TEXT_SENTINEL = 'zq7-centinela-importacion-privada-0451';

const IMPORT_SENTINEL_PREFIX = 'zq7-centinel';

const IMPORT_SENTINEL_ID = '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f';

/** @return array<string, mixed> */
function importSentinelNormalized(): array
{
    return [
        'route' => [
            'version' => 1, 'language' => 'rust', 'completed' => [], 'milestones' => [], 'favorites' => [], 'quizAnswers' => [],
            'notes' => ['rust' => ['learned' => IMPORT_TEXT_SENTINEL.' recorrido', 'next' => ''], 'go' => ['learned' => '', 'next' => '']], 'minutes' => 25,
        ],
        'lab' => [
            'version' => 1, 'selected' => ['rust' => null, 'go' => null],
            'records' => ['fx-rust-01' => [
                'predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false,
                'draft' => 'fn main() { /* '.IMPORT_TEXT_SENTINEL.' */ }', 'reflection' => IMPORT_TEXT_SENTINEL.' reflexión',
            ]],
        ],
        'systems' => ['version' => 1, 'records' => ['rust:fx-workshop-1' => ['observed' => [], 'code' => false, 'predicted' => false, 'answer' => null, 'steps' => [], 'note' => IMPORT_TEXT_SENTINEL.' taller']]],
    ];
}

function importSentinelRaw(): string
{
    return json_encode(['taller-learning-v1' => IMPORT_TEXT_SENTINEL.' crudo'], JSON_THROW_ON_ERROR);
}

/** @return array<string, mixed> */
function importSentinelBody(): array
{
    return ['format' => 2, 'importId' => IMPORT_SENTINEL_ID, 'epoch' => 1, 'source' => 'storage', 'raw' => importSentinelRaw(), 'normalized' => importSentinelNormalized()];
}

function importDescribeThrowable(Throwable $error): string
{
    $text = '';
    for ($current = $error; $current !== null; $current = $current->getPrevious()) {
        $text .= get_class($current).'|'.$current->getMessage().'|'.$current->getCode().'|'.$current->getTraceAsString()."\n";
    }

    return $text;
}

function importRenderedLogRecords(TestHandler $handler): string
{
    return implode("\n", array_map(function (LogRecord $record): string {
        $context = array_map(fn (mixed $value) => $value instanceof Throwable ? importDescribeThrowable($value) : $value, $record->context);

        return json_encode([$record->message, $context, $record->extra], JSON_THROW_ON_ERROR | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }, $handler->getRecords()));
}

function importFailEveryWriteOfTheSentinel(): void
{
    DB::beforeExecuting(function (string $query, array $bindings) {
        if (preg_match('/^\s*insert/i', $query) === 1 && collect($bindings)->contains(fn (mixed $binding) => is_string($binding) && str_contains($binding, IMPORT_TEXT_SENTINEL))) {
            $driverError = new PDOException('Incorrect string value');
            $driverError->errorInfo = ['HY000', 1366, 'Incorrect string value'];

            throw new QueryException('mysql', $query, $bindings, $driverError);
        }
    });
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    config(['logging.default' => 'stderr']);
    $this->handler = new TestHandler;
    Log::channel('stderr')->getLogger()->setHandlers([$this->handler]);
    $this->device = SyncDevice::signedIn($this);
    $this->handler->clear();
});

it('keeps the text of the raw, a draft, a reflection and the notes out of every record, when it applies and when it repeats', function () {
    $this->device->browser->post('/api/progress/import', importSentinelBody())->assertCreated();
    $this->device->browser->post('/api/progress/import', importSentinelBody())->assertOk();

    expect(DB::table('exercise_progress')->value('reflection'))->toContain(IMPORT_TEXT_SENTINEL)
        ->and(DB::table('progress_imports')->value('raw_payload'))->toContain(IMPORT_TEXT_SENTINEL)
        ->and(collect($this->handler->getRecords())->pluck('message')->all())->toContain('progress.import.applied', 'progress.import.repeated')
        ->and(importRenderedLogRecords($this->handler))->not->toContain(IMPORT_SENTINEL_PREFIX);
});

it('keeps the text out of the response, the records and the exception when the database rejects the write', function () {
    importFailEveryWriteOfTheSentinel();

    $response = $this->device->browser->post('/api/progress/import', importSentinelBody());

    $response->assertStatus(500)->assertJsonPath('code', 'server_error');
    expect($response->getContent())->not->toContain(IMPORT_SENTINEL_PREFIX)
        ->and(importRenderedLogRecords($this->handler))->not->toContain(IMPORT_SENTINEL_PREFIX)
        ->and(collect($this->handler->getRecords())->pluck('message')->all())->toContain('import.write_failed');
});

it('throws an exception from the service that holds neither the text nor the failed statement', function () {
    importFailEveryWriteOfTheSentinel();
    $request = new ImportRequest(IMPORT_SENTINEL_ID, 1, 2, ImportSource::Storage, importSentinelRaw(), importSentinelNormalized(), false);

    try {
        app(ImportService::class)->import($this->device->user->id, $request);
        $this->fail('expected ImportWriteFailed');
    } catch (ImportWriteFailed $failure) {
        expect(importDescribeThrowable($failure))->not->toContain(IMPORT_SENTINEL_PREFIX)->not->toMatch('/insert into/i')
            ->and($failure->getPrevious())->toBeNull();
    }
});

it('stores nothing from the import when the write fails', function () {
    importFailEveryWriteOfTheSentinel();

    $this->device->browser->post('/api/progress/import', importSentinelBody())->assertStatus(500);

    expect(DB::table('progress_imports')->count())->toBe(0)
        ->and(DB::table('exercise_progress')->count())->toBe(0)
        ->and(DB::table('drafts')->count())->toBe(0)
        ->and(DB::table('attempts')->count())->toBe(0);
});
