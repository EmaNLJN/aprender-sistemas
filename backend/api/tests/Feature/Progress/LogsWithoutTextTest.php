<?php

use App\Progress\Sync\SyncRequest;
use App\Progress\Sync\SyncService;
use App\Progress\Sync\SyncWriteFailed;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncDevice;

const TEXT_SENTINEL = 'zq7-centinela-texto-privado-0451';

const SENTINEL_PREFIX = 'zq7-centinel';

/** @return list<array<string, mixed>> */
function sentinelOperations(): array
{
    $at = '2026-10-05T12:09:00.000Z';

    return [
        Ops::reflection(1, TEXT_SENTINEL.' reflexión', $at),
        Ops::draft(2, 'fn main() { /* '.TEXT_SENTINEL.' */ }', $at),
        Ops::workshopNote(3, TEXT_SENTINEL.' taller', $at),
        Ops::routeNote(4, TEXT_SENTINEL.' recorrido', $at),
    ];
}

function describeThrowable(Throwable $error): string
{
    $text = '';
    for ($current = $error; $current !== null; $current = $current->getPrevious()) {
        $text .= get_class($current).'|'.$current->getMessage().'|'.$current->getCode().'|'.$current->getTraceAsString()."\n";
    }

    return $text;
}

/** @return list<string> */
function renderedLogRecords(TestHandler $handler): array
{
    return array_map(function (LogRecord $record): string {
        $context = array_map(fn (mixed $value) => $value instanceof Throwable ? describeThrowable($value) : $value, $record->context);

        return json_encode([$record->message, $context, $record->extra], JSON_THROW_ON_ERROR | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }, $handler->getRecords());
}

function failEveryWriteOfTheSentinel(): void
{
    DB::beforeExecuting(function (string $query, array $bindings) {
        if (preg_match('/^\s*insert/i', $query) === 1 && collect($bindings)->contains(fn (mixed $binding) => is_string($binding) && str_contains($binding, TEXT_SENTINEL))) {
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
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:00.000Z'));
    $this->handler->clear();
});

it('keeps the text of a reflection, a draft, a workshop note and a route note out of every record', function () {
    $this->device->sync(sentinelOperations())->assertOk();

    $this->device->sync(sentinelOperations())->assertOk();

    expect(DB::table('exercise_progress')->value('reflection'))->toContain(TEXT_SENTINEL)
        ->and(implode("\n", renderedLogRecords($this->handler)))->not->toContain(SENTINEL_PREFIX);
});

it('keeps the text out of the response, the records and the exception when the database rejects the write', function () {
    failEveryWriteOfTheSentinel();

    $response = $this->device->sync(sentinelOperations());

    $response->assertStatus(500)->assertJsonPath('code', 'server_error');
    expect($response->getContent())->not->toContain(SENTINEL_PREFIX)
        ->and(implode("\n", renderedLogRecords($this->handler)))->not->toContain(SENTINEL_PREFIX)
        ->and(collect($this->handler->getRecords())->pluck('message')->all())->toContain('sync.write_failed');
});

it('throws an exception from the service that holds neither the text nor the failed statement', function () {
    failEveryWriteOfTheSentinel();
    $request = new SyncRequest(1, CarbonImmutable::parse('2026-10-05T12:10:00.000Z'), 0, null, 2, sentinelOperations());

    try {
        app(SyncService::class)->sync($this->device->user->id, $request);
        $this->fail('expected SyncWriteFailed');
    } catch (SyncWriteFailed $failure) {
        expect(describeThrowable($failure))->not->toContain(SENTINEL_PREFIX)->not->toMatch('/insert into/i')
            ->and($failure->getPrevious())->toBeNull();
    }
});

it('stores nothing from the batch when the write fails', function () {
    failEveryWriteOfTheSentinel();

    $this->device->sync(sentinelOperations())->assertStatus(500);

    expect(DB::table('sync_operations')->count())->toBe(0)
        ->and(DB::table('exercise_progress')->count())->toBe(0)
        ->and(DB::table('drafts')->count())->toBe(0);
});
