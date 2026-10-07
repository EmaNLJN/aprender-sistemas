<?php

use App\Models\User;
use App\Progress\Reset\ProgressReset;
use App\Progress\Reset\ResetRequest;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncDevice;

const ENDPOINT_AREA_KEYS = [
    'exercises' => ['exerciseId'],
    'drafts' => ['exerciseId'],
    'campaign.seals' => ['exerciseId'],
    'campaign.checkpoints' => ['worldId'],
    'workshops.progress' => ['workshopId', 'language'],
    'workshops.objectives' => ['workshopId', 'language', 'objectiveKey'],
    'workshops.steps' => ['workshopId', 'language', 'stepKey'],
    'route.marks' => ['kind', 'itemKey'],
    'route.quiz' => ['stepId'],
    'route.notes' => ['language', 'field'],
];

function endpointImportId(string $rawTag): string
{
    $digest = md5($rawTag);

    return sprintf('%s-%s-4%s-8%s-%s', substr($digest, 0, 8), substr($digest, 8, 4), substr($digest, 12, 3), substr($digest, 15, 3), substr($digest, 18, 12));
}

/** @return array<string, mixed> */
function endpointBody(array $normalized, string $rawTag, array $overrides = []): array
{
    return [
        'format' => 2, 'importId' => endpointImportId($rawTag), 'epoch' => 1, 'source' => 'storage',
        'raw' => json_encode(['copy' => $rawTag], JSON_THROW_ON_ERROR), 'normalized' => $normalized,
        ...$overrides,
    ];
}

/** @return array<string, mixed> */
function endpointLab(array $records): array
{
    return ['lab' => ['version' => 1, 'selected' => ['rust' => null, 'go' => null], 'records' => $records]];
}

/** @return array<string, mixed> */
function endpointRecord(array $fields = []): array
{
    return ['predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false, ...$fields];
}

/** @return array<string, mixed> */
function endpointResult(bool $success, int $time): array
{
    return [
        'code' => 'fn main() {}', 'success' => $success, 'transportError' => false, 'stdout' => 'salida', 'stderr' => '',
        'tests' => [['id' => 't1', 'passed' => true], ['id' => 't2', 'passed' => $success], ['id' => 't3', 'passed' => true]],
        'time' => $time, 'customTest' => '', 'customPassed' => false,
    ];
}

/** @return array<string, mixed> */
function endpointRichNormalized(): array
{
    return [
        'route' => [
            'version' => 1, 'language' => 'go', 'completed' => ['fx-step-1'], 'milestones' => ['rust-memory'], 'favorites' => ['fx-res-1'],
            'quizAnswers' => ['fx-step-1' => 1],
            'notes' => ['rust' => ['learned' => 'aprendí', 'next' => ''], 'go' => ['learned' => '', 'next' => 'seguir']],
            'minutes' => 45,
        ],
        'lab' => [
            'version' => 1, 'selected' => ['rust' => 'fx-rust-01', 'go' => 'fx-go-01'],
            'records' => [
                'fx-rust-01' => endpointRecord([
                    'prediction' => 1, 'hints' => 2, 'draft' => 'fn borrador() {}', 'reflection' => 'reflexión del v1', 'customTest' => 'prueba propia',
                    'attempts' => 3, 'solvedAt' => 1790000000123, 'reviewAt' => 1790100000456, 'reviewedAt' => 1790000500789, 'confidence' => 'practice',
                    'result' => endpointResult(true, 1789999000321),
                ]),
                'fx-go-01' => endpointRecord(['assisted' => true]),
            ],
        ],
        'campaign' => [
            'version' => 1,
            'seals' => ['fx-rust-01' => ['code' => true, 'prediction' => false, 'assisted' => true], 'fx-go-01' => ['code' => false, 'prediction' => false, 'assisted' => false]],
            'checkpoints' => ['fx-world-1' => ['passed' => true, 'lastAnswer' => 1]],
        ],
        'systems' => [
            'version' => 1,
            'records' => ['rust:fx-workshop-1' => ['observed' => ['fx-obj-2', 'fx-obj-1'], 'code' => true, 'predicted' => true, 'answer' => 1, 'steps' => [1, 3], 'note' => 'nota del taller']],
        ],
    ];
}

function endpointCloseServerRun(User $user, string $exerciseId = 'fx-rust-01'): int
{
    $run = RunWorld::run($user, ['exercise_id' => $exerciseId, 'status' => 'running', 'started_at' => Instant::now()]);
    $verdict = new Verdict(
        RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 10, 10, 'ok', '',
        [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Pass), new TestVerdict('t3', TestOutcome::Pass)], null,
    );
    expect(app(RunCloser::class)->close($run->id, $verdict))->toBeTrue();

    return (int) DB::table('runs')->where('id', $run->id)->value('attempt_id');
}

/**
 * @param  array<string, mixed>  $areas
 * @return list<array<string, mixed>>
 */
function endpointRowsOf(array $areas, string $area): array
{
    $rows = data_get($areas, $area);
    $keys = ENDPOINT_AREA_KEYS[$area];
    usort($rows, fn (array $left, array $right) => strcmp(endpointNaturalKey($left, $keys), endpointNaturalKey($right, $keys)));

    return $rows;
}

/** @param array<string, mixed> $row */
function endpointNaturalKey(array $row, array $fields): string
{
    return implode('|', array_map(fn (string $field) => $row[$field], $fields));
}

/**
 * @param  array<string, mixed>  $snapshot
 * @param  array<string, mixed>  $changes
 * @return array<string, mixed>
 */
function endpointApplyChanges(array $snapshot, array $changes): array
{
    $merged = [];
    foreach (ENDPOINT_AREA_KEYS as $area => $keys) {
        $byKey = [];
        foreach (endpointRowsOf($snapshot, $area) as $row) {
            $byKey[endpointNaturalKey($row, $keys)] = $row;
        }
        foreach (endpointRowsOf($changes, $area) as $row) {
            $byKey[endpointNaturalKey($row, $keys)] = $row;
        }
        ksort($byKey);
        data_set($merged, $area, array_values($byKey));
    }
    $merged['preferences'] = $changes['preferences'] ?? $snapshot['preferences'];

    return $merged;
}

/**
 * @param  array<string, mixed>  $snapshot
 * @return array<string, mixed>
 */
function endpointAreasOf(array $snapshot): array
{
    $areas = [];
    foreach (array_keys(ENDPOINT_AREA_KEYS) as $area) {
        $rows = endpointRowsOf($snapshot, $area);
        data_set($areas, $area, $rows);
    }
    $areas['preferences'] = $snapshot['preferences'];

    return $areas;
}

function endpointImport(SyncDevice $device, array $normalized, string $rawTag, array $overrides = []): TestResponse
{
    return $device->browser->post('/api/progress/import', endpointBody($normalized, $rawTag, $overrides));
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->user = ProgressWorld::user();
    $this->device = SyncDevice::signedIn($this, $this->user);
});

describe('combining a v1 with the data of v2 (US1.4)', function () {
    beforeEach(function () {
        endpointImport($this->device, endpointLab(['fx-rust-01' => endpointRecord(['assisted' => true, 'customTest' => 'de la escuela'])]), 'escuela')->assertCreated();
        $this->device->sync([Ops::reflection(1, 'reflexión de v2', Instant::iso(Instant::now()->subMinute()))])->assertOk();
        $this->serverAttemptId = endpointCloseServerRun($this->user);
        $this->home = endpointRecord([
            'predictionCorrect' => true, 'solutionSeen' => true, 'reflection' => 'reflexión del v1', 'customTest' => 'de casa',
            'result' => endpointResult(false, 1789999000321),
        ]);
        $this->response = endpointImport($this->device, endpointLab(['fx-rust-01' => $this->home]), 'casa', ['confirm' => true]);
    });

    it('keeps the reflection of v2 and yields the custom test that had no clock', function () {
        $this->response->assertCreated();

        $exercise = $this->device->exercise();
        expect($exercise['reflection']['text'])->toBe('reflexión de v2')
            ->and($exercise['reflection']['at'])->not->toBeNull()
            ->and($exercise['customTest'])->toBe(['text' => 'de casa', 'at' => null]);
    });

    it('adds the achievements of both v1 copies', function () {
        $exercise = $this->device->exercise();

        expect($exercise['assisted'])->toBeTrue()
            ->and($exercise['predictionCorrect']['value'])->toBeTrue()
            ->and($exercise['solutionSeen'])->toBeTrue();
    });

    it('lists the conflicts of the reflection and of the result in the report', function () {
        expect($this->response->json('report.conflicts'))->toBe([
            ['path' => 'lab.records.fx-rust-01.reflection', 'reason' => 'newer_value_kept'],
            ['path' => 'lab.records.fx-rust-01.result', 'reason' => 'server_attempt_kept'],
        ]);
    });

    it('stores the result of v1 as a legacy attempt without touching the pointers to the server attempt', function () {
        $exercise = $this->device->exercise();

        $legacy = DB::table('attempts')->where('user_id', $this->user->id)->where('legacy', 1)->get();
        expect($legacy)->toHaveCount(1)
            ->and($legacy[0]->outcome)->toBe('failed')
            ->and($exercise['lastAttempt']['attemptId'])->toBe($this->serverAttemptId)
            ->and($exercise['lastAttempt']['legacy'])->toBeFalse()
            ->and($exercise['proof']['attemptId'])->toBe($this->serverAttemptId)
            ->and($exercise['attemptCount'])->toBe(1);
        ProgressInvariants::assertClean($this->user->id);
        RunInvariants::assertClean();
    });
});

describe('the confirmation (US1.5)', function () {
    it('answers the same 409 for each reason and 201 with confirm', function () {
        $normalized = endpointLab(['fx-rust-01' => endpointRecord(['reflection' => 'copia'])]);
        $alreadyImported = SyncDevice::signedIn($this, ProgressWorld::user());
        endpointImport($alreadyImported, endpointLab(['fx-rust-01' => endpointRecord()]), 'primera')->assertCreated();
        $afterReset = SyncDevice::signedIn($this, ProgressWorld::user());
        app(ProgressReset::class)->reset($afterReset->user->id, new ResetRequest(1, 2));
        $sharedRawOwner = SyncDevice::signedIn($this, ProgressWorld::user());
        endpointImport($sharedRawOwner, $normalized, 'compartida')->assertCreated();
        $sharesRaw = SyncDevice::signedIn($this, ProgressWorld::user());

        $answers = [
            'another raw already imported' => endpointImport($alreadyImported, $normalized, 'segunda'),
            'a reset in the account' => endpointImport($afterReset, $normalized, 'tras-reset', ['epoch' => 2]),
            'another account imported the same raw' => endpointImport($sharesRaw, $normalized, 'compartida'),
        ];

        foreach ($answers as $reason => $answer) {
            expect($answer->status())->toBe(409, $reason)
                ->and($answer->json())->toBe($answers['another raw already imported']->json(), $reason)
                ->and($answer->json('code'))->toBe('import_needs_confirmation', $reason);
        }
        expect(endpointImport($alreadyImported, $normalized, 'segunda', ['confirm' => true])->status())->toBe(201)
            ->and(endpointImport($afterReset, $normalized, 'tras-reset', ['epoch' => 2, 'confirm' => true])->status())->toBe(201)
            ->and(endpointImport($sharesRaw, $normalized, 'compartida', ['confirm' => true])->status())->toBe(201);
    });
});

describe('what v1 carries and v2 cannot keep as it is (US1.6)', function () {
    it('answers 201 and names the path of each omitted and replaced value', function () {
        $normalized = [
            'lab' => endpointLab([
                'fx-rust-01' => endpointRecord(['assisted' => true, 'solvedAt' => 253402300800000, 'reflection' => "texto roto \u{FFFD} aquí"]),
            ])['lab'],
            'systems' => ['version' => 1, 'records' => ['rust:fx-workshop-1' => ['observed' => [], 'code' => false, 'predicted' => false, 'answer' => null, 'steps' => [9], 'note' => '']]],
        ];

        $response = endpointImport($this->device, $normalized, 'rota');

        $response->assertCreated();
        expect($response->json('report.omitted'))->toEqualCanonicalizing([
            ['path' => 'lab.records.fx-rust-01.solvedAt', 'reason' => 'date_out_of_range'],
            ['path' => 'systems.records.rust:fx-workshop-1.steps[0]', 'reason' => 'unknown_step_position'],
        ])
            ->and($response->json('report.replaced'))->toBe([['path' => 'lab.records.fx-rust-01.reflection', 'reason' => 'replacement_character']])
            ->and($this->device->exercise()['assisted'])->toBeTrue()
            ->and($this->device->exercise()['reflection']['text'])->toBe("texto roto \u{FFFD} aquí");
    });
});

describe('the delta after an import', function () {
    it('brings every imported row to a device that knew the revision before, and the photo plus the delta is the full photo', function () {
        $this->device->sync([Ops::workshopNote(1, 'nota previa', Instant::iso(Instant::now()->subMinute()))])->assertOk();
        $before = $this->device->snapshot()->assertOk()->json();

        $imported = endpointImport($this->device, endpointRichNormalized(), 'rica')->assertCreated();
        $delta = $this->device->sync([], ['knownRevision' => $before['revision']])->assertOk()->json('changes');
        $full = $this->device->snapshot()->assertOk()->json();

        expect($delta['full'])->toBeFalse()
            ->and($imported->json('revision'))->toBe($before['revision'] + 1)
            ->and(array_column($delta['campaign']['seals'], 'exerciseId'))->toBe(['fx-go-01', 'fx-rust-01'])
            ->and(endpointApplyChanges($before, $delta))->toBe(endpointAreasOf($full));
    });
});

describe('the same request again', function () {
    it('answers 200 to the same request and moves nothing', function () {
        $first = endpointImport($this->device, endpointRichNormalized(), 'rica')->assertCreated();
        $photo = Arr::except($this->device->snapshot()->json(), 'serverTime');

        $again = endpointImport($this->device, endpointRichNormalized(), 'rica');

        $again->assertOk();
        expect($again->json())->toBe($first->json())
            ->and(Arr::except($this->device->snapshot()->json(), 'serverTime'))->toBe($photo);
    });
});

describe('the texts', function () {
    it('keep their whitespace and their empty values from the raw to the tables', function () {
        $raw = "  \n {\"copia\": \"con espacios\"} \t ";
        $normalized = endpointLab(['fx-rust-01' => endpointRecord(['reflection' => '', 'customTest' => '  con espacios  ', 'draft' => ''])]);

        endpointImport($this->device, $normalized, 'x', ['raw' => $raw])->assertCreated();

        $exercise = $this->device->exercise();
        $stored = DB::table('progress_imports')->first();
        expect($stored->raw_payload)->toBe($raw)
            ->and($stored->raw_sha256)->toBe(hash('sha256', $raw))
            ->and($exercise['reflection']['text'])->toBe('')
            ->and($exercise['customTest']['text'])->toBe('  con espacios  ')
            ->and(DB::table('drafts')->where('user_id', $this->user->id)->value('code'))->toBe('');
    });
});
