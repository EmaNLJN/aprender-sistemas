<?php

use App\Progress\ProgressTables;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\RunWorld;
use Tests\Support\Sync\RandomOperations;
use Tests\Support\Sync\SyncDevice;

const DELTA_BATCHES = 8;

const DELTA_AREA_KEYS = [
    'exercises' => ['exerciseId'],
    'drafts' => ['exerciseId'],
    'campaign.checkpoints' => ['worldId'],
    'workshops.progress' => ['workshopId', 'language'],
    'workshops.objectives' => ['workshopId', 'language', 'objectiveKey'],
    'workshops.steps' => ['workshopId', 'language', 'stepKey'],
    'route.marks' => ['kind', 'itemKey'],
    'route.quiz' => ['stepId'],
    'route.notes' => ['language', 'field'],
];

/** @return array<string, array{int}> */
function deltaSeeds(): array
{
    $random = random_int(1, 1000000);

    return ['seed 1' => [1], 'seed 20261005' => [20261005], 'seed 7' => [7], "random seed {$random}" => [$random]];
}

/** @param array<string, mixed> $row */
function deltaNaturalKey(array $row, array $fields): string
{
    return implode('|', array_map(fn (string $field) => $row[$field], $fields));
}

/**
 * @param  array<string, mixed>  $areas
 * @return list<array<string, mixed>>
 */
function deltaRowsOf(array $areas, string $area): array
{
    $rows = data_get($areas, $area);
    $keys = DELTA_AREA_KEYS[$area];
    usort($rows, fn (array $left, array $right) => strcmp(deltaNaturalKey($left, $keys), deltaNaturalKey($right, $keys)));

    return $rows;
}

/**
 * @param  array<string, mixed>  $snapshot
 * @param  array<string, mixed>  $changes
 * @return array<string, mixed> the areas of the snapshot with the changed rows replaced or added
 */
function deltaApplyChanges(array $snapshot, array $changes): array
{
    $merged = [];
    foreach (DELTA_AREA_KEYS as $area => $keys) {
        $byKey = [];
        foreach (($changes['full'] ? [] : deltaRowsOf($snapshot, $area)) as $row) {
            $byKey[deltaNaturalKey($row, $keys)] = $row;
        }
        foreach (deltaRowsOf($changes, $area) as $row) {
            $byKey[deltaNaturalKey($row, $keys)] = $row;
        }
        data_set($merged, $area, array_values($byKey));
    }
    $merged['preferences'] = $changes['preferences'] ?? ($changes['full'] ? null : $snapshot['preferences']);

    return $merged;
}

/**
 * @param  array<string, mixed>  $snapshot
 * @return array<string, mixed>
 */
function deltaNormalizedAreas(array $snapshot): array
{
    $areas = [];
    foreach (array_keys(DELTA_AREA_KEYS) as $area) {
        data_set($areas, $area, deltaRowsOf($snapshot, $area));
    }
    $areas['preferences'] = $snapshot['preferences'];

    return $areas;
}

/**
 * @param  array<string, mixed>  $snapshot
 * @return list<string>
 */
function deltaRowKeysOf(array $snapshot): array
{
    $keys = [];
    foreach (DELTA_AREA_KEYS as $area => $fields) {
        foreach (deltaRowsOf($snapshot, $area) as $row) {
            $keys[] = $area.':'.deltaNaturalKey($row, $fields);
        }
    }

    return $keys;
}

/**
 * @param  array<string, mixed>  $snapshot
 * @return list<string>
 */
function deltaRowsNewerThan(array $snapshot, int $revision): array
{
    $newer = [];
    foreach (DELTA_AREA_KEYS as $area => $fields) {
        foreach (deltaRowsOf($snapshot, $area) as $row) {
            if ($row['revision'] > $revision) {
                $newer[] = $area.':'.deltaNaturalKey($row, $fields);
            }
        }
    }

    return $newer;
}

function deltaCloseRun(object $test, int $userId, string $exerciseId, RunStatus $status): void
{
    $run = RunWorld::run(App\Models\User::findOrFail($userId), ['exercise_id' => $exerciseId, 'status' => 'running', 'started_at' => Instant::now()]);
    $outcome = $status === RunStatus::Passed ? TestOutcome::Pass : TestOutcome::Fail;
    $verdict = new Verdict($status, null, ExecutorPhase::Run, 0, false, 10, 10, 'ok', '', [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', $outcome), new TestVerdict('t3', TestOutcome::Pass)], null);

    expect(app(RunCloser::class)->close($run->id, $verdict))->toBeTrue();
}

beforeEach(function () {
    config(['logging.default' => 'null']);
    ProgressWorld::seed(MergeFixture::world());
    $this->device = SyncDevice::signedIn($this);
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:00.000Z'));
});

it('gives the full snapshot at R when the snapshot at the previous revision gets the delta applied, with no state row deleted', function (int $seed) {
    $batches = array_chunk(RandomOperations::sequence($seed, 40), (int) ceil(56 / DELTA_BATCHES));
    $known = $this->device->snapshot()->json();
    $keysBefore = deltaRowKeysOf($known);
    $statuses = [];

    foreach ($batches as $number => $operations) {
        if ($number === 2) {
            deltaCloseRun($this, $this->device->user->id, 'fx-rust-02', RunStatus::Passed);
        }
        if ($number === 5) {
            deltaCloseRun($this, $this->device->user->id, 'fx-go-02', RunStatus::Failed);
        }
        $response = $this->device->sync($operations, ['knownRevision' => $known['revision']])->assertOk();
        array_push($statuses, ...array_column($response->json('results'), 'status'));
        $full = $this->device->snapshot()->json();
        $delta = $response->json('changes');

        expect($response->json('revision'))->toBe($full['revision'], "seed {$seed}, batch {$number}")
            ->and(deltaNormalizedAreas(deltaApplyChanges($known, $delta)))->toBe(deltaNormalizedAreas($full), "seed {$seed}, batch {$number}")
            ->and($known['revision'] === 0 ? [] : deltaRowKeysOf(['full' => false] + $delta))->toEqualCanonicalizing(
                $known['revision'] === 0 ? [] : deltaRowsNewerThan($full, $known['revision']),
                "seed {$seed}, batch {$number}: the delta holds exactly the rows newer than the known revision",
            )
            ->and(array_diff($keysBefore, deltaRowKeysOf($full)))->toBe([], "seed {$seed}, batch {$number}: no row was deleted");
        $keysBefore = deltaRowKeysOf($full);
        $known = $full;
    }
    expect(array_values(array_unique($statuses)))->toEqualCanonicalizing(['applied', 'stale_content'], "seed {$seed}")
        ->and(count(deltaRowKeysOf($known)))->toBeGreaterThan(20);
    ProgressInvariants::assertClean($this->device->user->id);
})->with(fn () => deltaSeeds());

it('delivers the row that RunCloser changed in the delta of the next sync', function () {
    $first = $this->device->sync(RandomOperations::sequence(3, 0))->assertOk();
    deltaCloseRun($this, $this->device->user->id, 'fx-rust-02', RunStatus::Passed);

    $delta = $this->device->sync([], ['knownRevision' => $first->json('revision')])->assertOk();

    $closed = collect($delta->json('changes.exercises'))->firstWhere('exerciseId', 'fx-rust-02');
    expect($delta->json('changes.full'))->toBeFalse()
        ->and($closed['attemptCount'])->toBe(1)
        ->and($closed['proof']['state'])->toBe('current')
        ->and($closed['revision'])->toBeGreaterThan($first->json('revision'));
});

it('writes no state row for the snapshot read', function () {
    $this->device->sync(RandomOperations::sequence(5, 10))->assertOk();
    $counts = array_map(fn (string $table) => DB::table($table)->count(), ProgressTables::STATE);

    $this->device->snapshot()->assertOk();

    expect(array_map(fn (string $table) => DB::table($table)->count(), ProgressTables::STATE))->toBe($counts);
});
