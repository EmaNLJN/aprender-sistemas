<?php

use App\Progress\Import\ImportRequest;
use App\Progress\Import\ImportService;
use App\Progress\Import\ImportSource;
use App\Progress\ProgressTables;
use App\Progress\Reset\ProgressReset;
use App\Progress\Reset\ResetRequest;
use App\Progress\Sync\EpochMismatch;
use App\Progress\Sync\SyncRequest;
use App\Progress\Sync\SyncService;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\Parallel;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncCall;

const CONCURRENT_IMPORT_ID = '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f';

/** @return array<string, mixed> */
function concurrentNormalized(): array
{
    return [
        'lab' => ['version' => 1, 'selected' => ['rust' => null, 'go' => null], 'records' => [
            'fx-rust-01' => ['predictionCorrect' => false, 'assisted' => true, 'solutionSeen' => false],
        ]],
        'campaign' => ['version' => 1, 'seals' => ['fx-rust-01' => ['code' => true, 'prediction' => false, 'assisted' => false]], 'checkpoints' => []],
    ];
}

function concurrentImport(int $userId, string $importId, string $raw, int $epoch, float $startAt): Closure
{
    $normalized = concurrentNormalized();

    return Closure::bind(static function () use ($userId, $importId, $raw, $epoch, $startAt, $normalized): array {
        SyncCall::waitUntil($startAt);
        $request = new ImportRequest($importId, $epoch, 2, ImportSource::Storage, $raw, $normalized, false);
        try {
            $outcome = app(ImportService::class)->import($userId, $request);
        } catch (EpochMismatch) {
            return ['status' => 409, 'body' => null];
        }

        return ['status' => $outcome->status(), 'body' => $outcome->toArray()];
    }, null, null);
}

function concurrentReset(int $userId, int $epoch, float $startAt): Closure
{
    return Closure::bind(static function () use ($userId, $epoch, $startAt): array {
        SyncCall::waitUntil($startAt);
        try {
            $outcome = app(ProgressReset::class)->reset($userId, new ResetRequest($epoch, 2));
        } catch (EpochMismatch) {
            return ['status' => 409, 'body' => null];
        }

        return ['status' => 200, 'body' => $outcome->toArray()];
    }, null, null);
}

function concurrentSync(int $userId, array $operations, int $epoch, float $startAt): Closure
{
    return Closure::bind(static function () use ($userId, $operations, $epoch, $startAt): array {
        SyncCall::waitUntil($startAt);
        $request = new SyncRequest($epoch, Instant::now(), 0, MergeFixture::world()['contentVersion'], 2, $operations);
        try {
            $outcome = app(SyncService::class)->sync($userId, $request);
        } catch (EpochMismatch) {
            return ['status' => 409, 'revision' => null];
        }

        return ['status' => 200, 'revision' => $outcome->revision];
    }, null, null);
}

function concurrentStateRows(int $userId): int
{
    return collect(ProgressTables::STATE)->sum(fn (string $table) => DB::table($table)->where('user_id', $userId)->count());
}

function concurrentRecentAt(): string
{
    return Instant::iso(Instant::now()->subSeconds(30));
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->user = ProgressWorld::user();
});

it('serializes an import against a sync of the same account into the next two revisions, with both effects at the end', function () {
    $userId = $this->user->id;
    $known = SyncCall::run($userId, [Ops::workshopNote(9, 'previa', concurrentRecentAt())])['revision'];
    $startAt = SyncCall::startIn(3);

    $results = Parallel::run([
        'import' => concurrentImport($userId, CONCURRENT_IMPORT_ID, '{"copy":"a"}', 1, $startAt),
        'sync' => concurrentSync($userId, [Ops::reflection(1, 'durante la importación', concurrentRecentAt())], 1, $startAt),
    ]);

    $revisions = [$results['import']['body']['revision'], $results['sync']['revision']];
    sort($revisions);
    $row = DB::table('exercise_progress')->where('user_id', $userId)->first();
    expect($results['import']['status'])->toBe(201)
        ->and($results['sync']['status'])->toBe(200)
        ->and($revisions)->toBe([$known + 1, $known + 2])
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('revision'))->toBe($known + 2)
        ->and([(bool) $row->assisted, $row->reflection])->toBe([true, 'durante la importación'])
        ->and(DB::table('campaign_seals')->where('user_id', $userId)->count())->toBe(1);
    ProgressInvariants::assertClean($userId);
});

it('answers one 201 and one 200 with the same report when two processes send the same import', function () {
    $userId = $this->user->id;
    $startAt = SyncCall::startIn(3);

    $results = Parallel::run([
        'first' => concurrentImport($userId, CONCURRENT_IMPORT_ID, '{"copy":"a"}', 1, $startAt),
        'second' => concurrentImport($userId, CONCURRENT_IMPORT_ID, '{"copy":"a"}', 1, $startAt),
    ]);

    $statuses = [$results['first']['status'], $results['second']['status']];
    sort($statuses);
    expect($statuses)->toBe([200, 201])
        ->and($results['first']['body'])->toBe($results['second']['body'])
        ->and(DB::table('progress_imports')->where('user_id', $userId)->count())->toBe(1)
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('revision'))->toBe($results['first']['body']['revision']);
    ProgressInvariants::assertClean($userId);
});

it('leaves no row of state after a reset that races a sync, whoever arrives first', function () {
    $userId = $this->user->id;
    $outcomes = [];

    foreach (range(1, 4) as $round) {
        $epoch = (int) DB::table('progress_heads')->where('user_id', $userId)->value('epoch') ?: 1;
        $startAt = SyncCall::startIn(3);

        $results = Parallel::run([
            'reset' => concurrentReset($userId, $epoch, $startAt),
            'sync' => concurrentSync($userId, [Ops::reflection($round, "ronda {$round}", concurrentRecentAt())], $epoch, $startAt),
        ]);

        $outcomes[] = $results['sync']['status'];
        expect($results['reset']['status'])->toBe(200)
            ->and($results['sync']['status'])->toBeIn([200, 409])
            ->and(concurrentStateRows($userId))->toBe(0)
            ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('epoch'))->toBe($epoch + 1);
        ProgressInvariants::assertClean($userId);
    }
    expect($outcomes)->each->toBeIn([200, 409]);
});

it('answers 200 to one reset and 409 epoch_mismatch to the other when two have the same epoch', function () {
    $userId = $this->user->id;
    SyncCall::run($userId, [Ops::workshopNote(9, 'previa', concurrentRecentAt())]);
    $startAt = SyncCall::startIn(3);

    $results = Parallel::run([
        'first' => concurrentReset($userId, 1, $startAt),
        'second' => concurrentReset($userId, 1, $startAt),
    ]);

    $statuses = [$results['first']['status'], $results['second']['status']];
    sort($statuses);
    $winner = $results['first']['status'] === 200 ? $results['first'] : $results['second'];
    expect($statuses)->toBe([200, 409])
        ->and($winner['body']['epoch'])->toBe(2)
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('epoch'))->toBe(2)
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('revision'))->toBe($winner['body']['revision'])
        ->and(concurrentStateRows($userId))->toBe(0);
});

it('either imports and deletes or answers 409 when an import races a reset', function () {
    $userId = $this->user->id;
    foreach (range(1, 4) as $round) {
        $epoch = (int) DB::table('progress_heads')->where('user_id', $userId)->value('epoch') ?: 1;
        $startAt = SyncCall::startIn(3);

        $results = Parallel::run([
            'import' => concurrentImport($userId, sprintf('6f1c2b9e-4a7d-4c1e-9b2f-%012d', $round), "{\"copy\":\"ronda {$round}\"}", $epoch, $startAt),
            'reset' => concurrentReset($userId, $epoch, $startAt),
        ]);

        expect($results['reset']['status'])->toBe(200)
            ->and($results['import']['status'])->toBeIn([201, 409])
            ->and(concurrentStateRows($userId))->toBe(0)
            ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('epoch'))->toBe($epoch + 1)
            ->and(DB::table('progress_imports')->where('user_id', $userId)->where('epoch', $epoch)->count())->toBe($results['import']['status'] === 201 ? 1 : 0);
        ProgressInvariants::assertClean($userId);
    }
});
