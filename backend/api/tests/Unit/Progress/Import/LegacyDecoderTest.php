<?php

use App\Progress\Import\Legacy\ContentFacts;
use App\Progress\Import\Legacy\LegacyExercise;
use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\LegacyDecoder;
use App\Runs\Record\Instant;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class);

const DECODER_SENTINEL = 'SENTINEL-9f3a71';
const DECODER_UNSET = '__unset__';

function decoderFacts(): ContentFacts
{
    return new ContentFacts(
        exercises: [
            'fx-rust-01' => ['language' => 'rust', 'predictionOptions' => 3, 'activeHints' => 3, 'testKeys' => ['t1', 't2', 't3']],
            'fx-rust-02' => ['language' => 'rust', 'predictionOptions' => 3, 'activeHints' => 2, 'testKeys' => ['t1']],
            'fx-go-01' => ['language' => 'go', 'predictionOptions' => 3, 'activeHints' => 3, 'testKeys' => ['t1', 't2']],
        ],
        checkpointOptions: ['fx-world-1' => 3],
        workshops: ['fx-workshop-1' => [
            'predictionOptions' => 3,
            'objectives' => ['fx-obj-1', 'fx-obj-2'],
            'stepsByV1Position' => [0 => 'e1', 1 => 'e2', 2 => 'e3', 3 => 'e4'],
        ]],
        quizOptions: ['fx-step-1' => 3, 'fx-step-2' => 0],
        resources: ['fx-res-1'],
    );
}

/** @return array<string, mixed> */
function decoderResult(array $overrides = []): array
{
    return [
        'code' => 'fn main() {}', 'success' => true, 'transportError' => false, 'stdout' => 'ok', 'stderr' => '',
        'tests' => [['id' => 't1', 'passed' => true], ['id' => 't3', 'passed' => false]],
        'time' => 1760000300789, 'customTest' => '', 'customPassed' => false,
        ...$overrides,
    ];
}

/** @return array<string, mixed> */
function decoderRecord(array $overrides = []): array
{
    return ['predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false, ...$overrides];
}

/** @return array<string, mixed> */
function validNormalized(): array
{
    return [
        'route' => [
            'version' => 1, 'language' => 'go', 'completed' => ['fx-step-1'], 'milestones' => ['rust-memory', 'go-network'],
            'favorites' => ['fx-res-1'], 'quizAnswers' => ['fx-step-1' => 2],
            'notes' => ['rust' => ['learned' => 'Aprendí', 'next' => ''], 'go' => ['learned' => '  ', 'next' => 'Seguir']],
            'minutes' => 45,
        ],
        'lab' => [
            'version' => 1,
            'records' => [
                'fx-rust-01' => decoderRecord([
                    'predictionCorrect' => true, 'solutionSeen' => true, 'prediction' => 2, 'hints' => 3, 'draft' => 'fn main() {}',
                    'reflection' => '', 'customTest' => 'assert!(true)', 'attempts' => 4, 'solvedAt' => 1760000000123,
                    'reviewAt' => 1760000100000, 'reviewedAt' => 1760000200456, 'confidence' => 'practice', 'result' => decoderResult(),
                ]),
                'fx-go-01' => decoderRecord(),
            ],
            'selected' => ['rust' => 'fx-rust-01', 'go' => null],
        ],
        'campaign' => [
            'version' => 1,
            'seals' => ['fx-rust-01' => ['code' => true, 'prediction' => false, 'assisted' => true]],
            'checkpoints' => ['fx-world-1' => ['passed' => true, 'lastAnswer' => 1]],
        ],
        'systems' => [
            'version' => 1,
            'records' => ['rust:fx-workshop-1' => [
                'observed' => ['fx-obj-2', 'fx-obj-1'], 'code' => true, 'predicted' => false, 'answer' => 2, 'steps' => [3, 0], 'note' => 'Nota',
            ]],
        ],
    ];
}

/** @param array<string, mixed> $changes */
function patched(array $changes): array
{
    $normalized = validNormalized();
    foreach ($changes as $path => $value) {
        if ($value === DECODER_UNSET) {
            Arr::forget($normalized, $path);
        } else {
            Arr::set($normalized, $path, $value);
        }
    }

    return $normalized;
}

function decoded(array $normalized): LegacyProgress
{
    return (new LegacyDecoder)->decode($normalized, decoderFacts());
}

function rejection(array $normalized): ValidationException
{
    try {
        decoded($normalized);
    } catch (ValidationException $error) {
        return $error;
    }

    throw new RuntimeException('The normalized was accepted');
}

/** @return list<array{path: string, reason: string}> */
function entries(array $reportEntries): array
{
    return array_map(fn ($entry) => $entry->toArray(), $reportEntries);
}

/** @return array<string, mixed> */
function exerciseView(LegacyExercise $exercise): array
{
    $iso = fn ($at) => $at === null ? null : Instant::iso($at);
    $result = $exercise->result;

    return [
        'id' => $exercise->exerciseId, 'predictionCorrect' => $exercise->predictionCorrect, 'assisted' => $exercise->assisted,
        'solutionSeen' => $exercise->solutionSeen, 'prediction' => $exercise->prediction, 'hints' => $exercise->hints,
        'draft' => $exercise->draft, 'reflection' => $exercise->reflection, 'customTest' => $exercise->customTest,
        'attempts' => $exercise->attempts, 'solvedAt' => $iso($exercise->solvedAt), 'reviewAt' => $iso($exercise->reviewAt),
        'reviewedAt' => $iso($exercise->reviewedAt), 'confidence' => $exercise->confidence,
        'result' => $result === null ? null : [
            'code' => $result->code, 'success' => $result->success, 'transportError' => $result->transportError,
            'stdout' => $result->stdout, 'stderr' => $result->stderr, 'tests' => $result->tests, 'time' => $iso($result->time),
            'customTest' => $result->customTest, 'customPassed' => $result->customPassed, 'attemptId' => $result->attemptId,
        ],
    ];
}

it('decodes a valid normalized with the four sections into their records', function () {
    $progress = decoded(validNormalized());

    expect($progress->route->language)->toBe('go')
        ->and($progress->route->minutes)->toBe(45)
        ->and($progress->route->completed)->toBe(['fx-step-1'])
        ->and($progress->route->milestones)->toBe(['rust-memory', 'go-network'])
        ->and($progress->route->favorites)->toBe(['fx-res-1'])
        ->and($progress->route->quizAnswers)->toBe(['fx-step-1' => 2])
        ->and($progress->route->notes)->toBe(['rust' => ['learned' => 'Aprendí', 'next' => ''], 'go' => ['learned' => '  ', 'next' => 'Seguir']])
        ->and($progress->selected)->toBe(['rust' => 'fx-rust-01', 'go' => null])
        ->and(array_map(exerciseView(...), $progress->exercises))->toBe([
            [
                'id' => 'fx-rust-01', 'predictionCorrect' => true, 'assisted' => false, 'solutionSeen' => true, 'prediction' => 2, 'hints' => 3,
                'draft' => 'fn main() {}', 'reflection' => '', 'customTest' => 'assert!(true)', 'attempts' => 4,
                'solvedAt' => '2025-10-09T08:53:20.123Z', 'reviewAt' => '2025-10-09T08:55:00.000Z', 'reviewedAt' => '2025-10-09T08:56:40.456Z',
                'confidence' => 'practice',
                'result' => [
                    'code' => 'fn main() {}', 'success' => true, 'transportError' => false, 'stdout' => 'ok', 'stderr' => '',
                    'tests' => [['testKey' => 't1', 'passed' => true], ['testKey' => 't3', 'passed' => false]],
                    'time' => '2025-10-09T08:58:20.789Z', 'customTest' => '', 'customPassed' => false, 'attemptId' => null,
                ],
            ],
            [
                'id' => 'fx-go-01', 'predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false, 'prediction' => null, 'hints' => null,
                'draft' => null, 'reflection' => null, 'customTest' => null, 'attempts' => null, 'solvedAt' => null, 'reviewAt' => null,
                'reviewedAt' => null, 'confidence' => null, 'result' => null,
            ],
        ])
        ->and(array_map(fn ($seal) => [$seal->exerciseId, $seal->code, $seal->prediction, $seal->assisted], $progress->seals))->toBe([['fx-rust-01', true, false, true]])
        ->and(array_map(fn ($checkpoint) => [$checkpoint->worldId, $checkpoint->passed, $checkpoint->lastAnswer], $progress->checkpoints))->toBe([['fx-world-1', true, 1]])
        ->and(array_map(
            fn ($workshop) => [$workshop->workshopId, $workshop->language, $workshop->codeSealed, $workshop->predicted, $workshop->answer, $workshop->observed, $workshop->steps, $workshop->note],
            $progress->workshops,
        ))->toBe([['fx-workshop-1', 'rust', true, false, 2, ['fx-obj-2', 'fx-obj-1'], ['e4', 'e1'], 'Nota']])
        ->and($progress->omitted)->toBe([])
        ->and($progress->replaced)->toBe([]);
});

it('leaves the absent sections null or empty', function () {
    $progress = decoded(['route' => validNormalized()['route']]);

    expect($progress->route)->not->toBeNull()
        ->and($progress->exercises)->toBe([])
        ->and($progress->selected)->toBeNull()
        ->and($progress->seals)->toBe([])
        ->and($progress->checkpoints)->toBe([])
        ->and($progress->workshops)->toBe([]);

    $withoutRoute = decoded(Arr::except(validNormalized(), 'route'));

    expect($withoutRoute->route)->toBeNull()
        ->and($withoutRoute->exercises)->not->toBe([]);
});

it('accepts the empty objects of a pristine browser, which json_decode turns into lists', function () {
    $progress = decoded([
        'lab' => ['version' => 1, 'records' => [], 'selected' => ['rust' => null, 'go' => null]],
        'campaign' => ['version' => 1, 'seals' => [], 'checkpoints' => []],
        'systems' => ['version' => 1, 'records' => []],
        'route' => ['version' => 1, 'language' => 'rust', 'completed' => [], 'milestones' => [], 'favorites' => [], 'quizAnswers' => [],
            'notes' => ['rust' => ['learned' => '', 'next' => ''], 'go' => ['learned' => '', 'next' => '']], 'minutes' => 25],
    ]);

    expect($progress->exercises)->toBe([])
        ->and($progress->selected)->toBe(['rust' => null, 'go' => null])
        ->and($progress->route->quizAnswers)->toBe([]);
});

it('keeps an optional attemptId of the result', function () {
    $progress = decoded(patched(['lab.records.fx-rust-01.result.attemptId' => 77]));

    expect($progress->exercises[0]->result->attemptId)->toBe(77);
});

it('accepts the instants at the edges of DATETIME(3)', function (int $milliseconds, string $iso) {
    $progress = decoded(patched(['lab.records.fx-rust-01.result.time' => $milliseconds]));

    expect(Instant::iso($progress->exercises[0]->result->time))->toBe($iso)
        ->and($progress->omitted)->toBe([]);
})->with([
    'year 1000' => [-30610224000000, '1000-01-01T00:00:00.000Z'],
    'year 9999' => [253402300799999, '9999-12-31T23:59:59.999Z'],
]);

it('keeps the texts as they came, empty strings and spaces included', function () {
    $progress = decoded(patched(['lab.records.fx-rust-01.draft' => '', 'lab.records.fx-rust-01.customTest' => ' ', 'systems.records.rust:fx-workshop-1.note' => '']));

    expect($progress->exercises[0]->draft)->toBe('')
        ->and($progress->exercises[0]->customTest)->toBe(' ')
        ->and($progress->workshops[0]->note)->toBe('');
});

it('counts characters and not bytes against the caps', function (string $path, int $cap) {
    $progress = decoded(patched([$path => str_repeat('😀', $cap)]));

    expect($progress->omitted)->toBe([]);
})->with([
    'draft' => ['lab.records.fx-rust-01.draft', 30000],
    'reflection' => ['lab.records.fx-rust-01.reflection', 10000],
    'custom test' => ['lab.records.fx-rust-01.customTest', 3000],
    'result code' => ['lab.records.fx-rust-01.result.code', 30000],
    'result stdout' => ['lab.records.fx-rust-01.result.stdout', 12000],
    'result stderr' => ['lab.records.fx-rust-01.result.stderr', 18000],
    'result custom test' => ['lab.records.fx-rust-01.result.customTest', 3000],
    'route note' => ['route.notes.rust.learned', 20000],
    'workshop note' => ['systems.records.rust:fx-workshop-1.note', 10000],
]);

dataset('invalid values', [
    'unknown field in normalized' => [['extra' => 1], 'normalized.extra', 'unknown_field'],
    'unknown field in route' => [['route.extra' => 1], 'normalized.route.extra', 'unknown_field'],
    'unknown field in notes' => [['route.notes.extra' => 1], 'normalized.route.notes.extra', 'unknown_field'],
    'unknown field in a language of notes' => [['route.notes.rust.extra' => 'x'], 'normalized.route.notes.rust.extra', 'unknown_field'],
    'unknown field in lab' => [['lab.extra' => 1], 'normalized.lab.extra', 'unknown_field'],
    'unknown field in selected' => [['lab.selected.extra' => 1], 'normalized.lab.selected.extra', 'unknown_field'],
    'unknown field in a lab record' => [['lab.records.fx-rust-01.extra' => 1], 'normalized.lab.records.fx-rust-01.extra', 'unknown_field'],
    'unknown field in a result' => [['lab.records.fx-rust-01.result.extra' => 1], 'normalized.lab.records.fx-rust-01.result.extra', 'unknown_field'],
    'unknown field in a result test' => [['lab.records.fx-rust-01.result.tests.0.extra' => 1], 'normalized.lab.records.fx-rust-01.result.tests[0].extra', 'unknown_field'],
    'unknown field in campaign' => [['campaign.extra' => 1], 'normalized.campaign.extra', 'unknown_field'],
    'unknown field in a seal' => [['campaign.seals.fx-rust-01.extra' => 1], 'normalized.campaign.seals.fx-rust-01.extra', 'unknown_field'],
    'unknown field in a checkpoint' => [['campaign.checkpoints.fx-world-1.extra' => 1], 'normalized.campaign.checkpoints.fx-world-1.extra', 'unknown_field'],
    'unknown field in systems' => [['systems.extra' => 1], 'normalized.systems.extra', 'unknown_field'],
    'unknown field in a workshop record' => [['systems.records.rust:fx-workshop-1.extra' => 1], 'normalized.systems.records.rust:fx-workshop-1.extra', 'unknown_field'],

    'a section that is not an object' => [['route' => 'x'], 'normalized.route', 'wrong_type'],
    'a null section' => [['campaign' => null], 'normalized.campaign', 'wrong_type'],
    'language that is not a string' => [['route.language' => 5], 'normalized.route.language', 'wrong_type'],
    'completed that is not a list' => [['route.completed' => 'fx-step-1'], 'normalized.route.completed', 'wrong_type'],
    'a completed item that is not a string' => [['route.completed' => [5]], 'normalized.route.completed[0]', 'wrong_type'],
    'minutes as a string' => [['route.minutes' => '25'], 'normalized.route.minutes', 'wrong_type'],
    'a quiz answer that is a string' => [['route.quizAnswers.fx-step-1' => '1'], 'normalized.route.quizAnswers.fx-step-1', 'wrong_type'],
    'a note that is not a string' => [['route.notes.go.next' => 5], 'normalized.route.notes.go.next', 'wrong_type'],
    'records as a list' => [['lab.records' => [decoderRecord()]], 'normalized.lab.records', 'wrong_type'],
    'a record that is not an object' => [['lab.records.fx-go-01' => 'x'], 'normalized.lab.records.fx-go-01', 'wrong_type'],
    'a flag as a string' => [['lab.records.fx-rust-01.assisted' => 'yes'], 'normalized.lab.records.fx-rust-01.assisted', 'wrong_type'],
    'hints as a string' => [['lab.records.fx-rust-01.hints' => '2'], 'normalized.lab.records.fx-rust-01.hints', 'wrong_type'],
    'hints as a boolean' => [['lab.records.fx-rust-01.hints' => true], 'normalized.lab.records.fx-rust-01.hints', 'wrong_type'],
    'attempts as null' => [['lab.records.fx-rust-01.attempts' => null], 'normalized.lab.records.fx-rust-01.attempts', 'wrong_type'],
    'a draft that is not a string' => [['lab.records.fx-rust-01.draft' => 5], 'normalized.lab.records.fx-rust-01.draft', 'wrong_type'],
    'confidence as a number' => [['lab.records.fx-rust-01.confidence' => 1], 'normalized.lab.records.fx-rust-01.confidence', 'wrong_type'],
    'a result that is not an object' => [['lab.records.fx-rust-01.result' => 'x'], 'normalized.lab.records.fx-rust-01.result', 'wrong_type'],
    'tests that are not a list' => [['lab.records.fx-rust-01.result.tests' => 'x'], 'normalized.lab.records.fx-rust-01.result.tests', 'wrong_type'],
    'passed as a number' => [['lab.records.fx-rust-01.result.tests.0.passed' => 1], 'normalized.lab.records.fx-rust-01.result.tests[0].passed', 'wrong_type'],
    'time as a string' => [['lab.records.fx-rust-01.result.time' => '1760000300789'], 'normalized.lab.records.fx-rust-01.result.time', 'wrong_type'],
    'success as a number' => [['lab.records.fx-rust-01.result.success' => 1], 'normalized.lab.records.fx-rust-01.result.success', 'wrong_type'],
    'attemptId as a string' => [['lab.records.fx-rust-01.result.attemptId' => '7'], 'normalized.lab.records.fx-rust-01.result.attemptId', 'wrong_type'],
    'selected as a list' => [['lab.selected' => ['fx-rust-01']], 'normalized.lab.selected', 'wrong_type'],
    'a selected exercise as a number' => [['lab.selected.rust' => 5], 'normalized.lab.selected.rust', 'wrong_type'],
    'a seal flag as a number' => [['campaign.seals.fx-rust-01.code' => 1], 'normalized.campaign.seals.fx-rust-01.code', 'wrong_type'],
    'a checkpoint passed as a string' => [['campaign.checkpoints.fx-world-1.passed' => 'x'], 'normalized.campaign.checkpoints.fx-world-1.passed', 'wrong_type'],
    'a last answer as a string' => [['campaign.checkpoints.fx-world-1.lastAnswer' => '1'], 'normalized.campaign.checkpoints.fx-world-1.lastAnswer', 'wrong_type'],
    'observed that is not a list' => [['systems.records.rust:fx-workshop-1.observed' => 'x'], 'normalized.systems.records.rust:fx-workshop-1.observed', 'wrong_type'],
    'a workshop answer as a string' => [['systems.records.rust:fx-workshop-1.answer' => '1'], 'normalized.systems.records.rust:fx-workshop-1.answer', 'wrong_type'],
    'a step position as a string' => [['systems.records.rust:fx-workshop-1.steps' => ['1']], 'normalized.systems.records.rust:fx-workshop-1.steps[0]', 'wrong_type'],
    'a workshop note that is not a string' => [['systems.records.rust:fx-workshop-1.note' => 5], 'normalized.systems.records.rust:fx-workshop-1.note', 'wrong_type'],

    'a missing route key' => [['route.minutes' => DECODER_UNSET], 'normalized.route.minutes', 'required'],
    'a missing lab selected' => [['lab.selected' => DECODER_UNSET], 'normalized.lab.selected', 'required'],
    'a missing record flag' => [['lab.records.fx-go-01.solutionSeen' => DECODER_UNSET], 'normalized.lab.records.fx-go-01.solutionSeen', 'required'],
    'a missing result key' => [['lab.records.fx-rust-01.result.stderr' => DECODER_UNSET], 'normalized.lab.records.fx-rust-01.result.stderr', 'required'],
    'a missing seal flag' => [['campaign.seals.fx-rust-01.assisted' => DECODER_UNSET], 'normalized.campaign.seals.fx-rust-01.assisted', 'required'],
    'a missing workshop answer' => [['systems.records.rust:fx-workshop-1.answer' => DECODER_UNSET], 'normalized.systems.records.rust:fx-workshop-1.answer', 'required'],

    'a route without version' => [['route.version' => DECODER_UNSET], 'normalized.route.version', 'unsupported_version'],
    'a lab with version 2' => [['lab.version' => 2], 'normalized.lab.version', 'unsupported_version'],
    'a campaign with a string version' => [['campaign.version' => '1'], 'normalized.campaign.version', 'unsupported_version'],
    'systems without version' => [['systems.version' => DECODER_UNSET], 'normalized.systems.version', 'unsupported_version'],

    'a language outside rust and go' => [['route.language' => 'ruby'], 'normalized.route.language', 'out_of_domain'],
    'minutes of 20' => [['route.minutes' => 20], 'normalized.route.minutes', 'out_of_domain'],
    'an unknown confidence' => [['lab.records.fx-rust-01.confidence' => 'maybe'], 'normalized.lab.records.fx-rust-01.confidence', 'out_of_domain'],

    'hints of 4' => [['lab.records.fx-rust-01.hints' => 4], 'normalized.lab.records.fx-rust-01.hints', 'out_of_range'],
    'negative hints' => [['lab.records.fx-rust-01.hints' => -1], 'normalized.lab.records.fx-rust-01.hints', 'out_of_range'],
    'negative attempts' => [['lab.records.fx-rust-01.attempts' => -1], 'normalized.lab.records.fx-rust-01.attempts', 'out_of_range'],
    'attempts of 2^53' => [['lab.records.fx-rust-01.attempts' => 9007199254740992], 'normalized.lab.records.fx-rust-01.attempts', 'out_of_range'],
    'solvedAt of 0' => [['lab.records.fx-rust-01.solvedAt' => 0], 'normalized.lab.records.fx-rust-01.solvedAt', 'out_of_range'],
    'solvedAt of 2^53' => [['lab.records.fx-rust-01.solvedAt' => 9007199254740992], 'normalized.lab.records.fx-rust-01.solvedAt', 'out_of_range'],
    'negative reviewAt' => [['lab.records.fx-rust-01.reviewAt' => -1], 'normalized.lab.records.fx-rust-01.reviewAt', 'out_of_range'],
    'negative reviewedAt' => [['lab.records.fx-rust-01.reviewedAt' => -1], 'normalized.lab.records.fx-rust-01.reviewedAt', 'out_of_range'],
    'a negative prediction' => [['lab.records.fx-rust-01.prediction' => -1], 'normalized.lab.records.fx-rust-01.prediction', 'out_of_range'],
    'a negative quiz answer' => [['route.quizAnswers.fx-step-1' => -1], 'normalized.route.quizAnswers.fx-step-1', 'out_of_range'],
    'a negative last answer' => [['campaign.checkpoints.fx-world-1.lastAnswer' => -1], 'normalized.campaign.checkpoints.fx-world-1.lastAnswer', 'out_of_range'],
    'a negative workshop answer' => [['systems.records.rust:fx-workshop-1.answer' => -1], 'normalized.systems.records.rust:fx-workshop-1.answer', 'out_of_range'],
    'a negative step position' => [['systems.records.rust:fx-workshop-1.steps' => [-1]], 'normalized.systems.records.rust:fx-workshop-1.steps[0]', 'out_of_range'],
    'an attemptId of 0' => [['lab.records.fx-rust-01.result.attemptId' => 0], 'normalized.lab.records.fx-rust-01.result.attemptId', 'out_of_range'],

    'a draft one character too long' => [['lab.records.fx-rust-01.draft' => str_repeat('a', 30001)], 'normalized.lab.records.fx-rust-01.draft', 'too_long'],
    'a reflection one character too long' => [['lab.records.fx-rust-01.reflection' => str_repeat('a', 10001)], 'normalized.lab.records.fx-rust-01.reflection', 'too_long'],
    'a custom test one character too long' => [['lab.records.fx-rust-01.customTest' => str_repeat('a', 3001)], 'normalized.lab.records.fx-rust-01.customTest', 'too_long'],
    'a result code one character too long' => [['lab.records.fx-rust-01.result.code' => str_repeat('a', 30001)], 'normalized.lab.records.fx-rust-01.result.code', 'too_long'],
    'a stdout one character too long' => [['lab.records.fx-rust-01.result.stdout' => str_repeat('a', 12001)], 'normalized.lab.records.fx-rust-01.result.stdout', 'too_long'],
    'a stderr one character too long' => [['lab.records.fx-rust-01.result.stderr' => str_repeat('a', 18001)], 'normalized.lab.records.fx-rust-01.result.stderr', 'too_long'],
    'a result custom test one character too long' => [['lab.records.fx-rust-01.result.customTest' => str_repeat('a', 3001)], 'normalized.lab.records.fx-rust-01.result.customTest', 'too_long'],
    'a route note one character too long' => [['route.notes.rust.next' => str_repeat('😀', 20001)], 'normalized.route.notes.rust.next', 'too_long'],
    'a workshop note one character too long' => [['systems.records.rust:fx-workshop-1.note' => str_repeat('a', 10001)], 'normalized.systems.records.rust:fx-workshop-1.note', 'too_long'],

    'an unknown exercise' => [['lab.records.fx-nope' => decoderRecord()], 'normalized.lab.records.fx-nope', 'unknown_id'],
    'an unknown selected exercise' => [['lab.selected.rust' => 'fx-nope'], 'normalized.lab.selected.rust', 'unknown_id'],
    'an unknown sealed exercise' => [['campaign.seals.fx-nope' => ['code' => true, 'prediction' => true, 'assisted' => true]], 'normalized.campaign.seals.fx-nope', 'unknown_id'],
    'an unknown world' => [['campaign.checkpoints.fx-nope' => ['passed' => true, 'lastAnswer' => null]], 'normalized.campaign.checkpoints.fx-nope', 'unknown_id'],
    'an unknown workshop' => [['systems.records.rust:fx-nope' => validNormalized()['systems']['records']['rust:fx-workshop-1']], 'normalized.systems.records.rust:fx-nope', 'unknown_id'],
    'a workshop of an unknown language' => [['systems.records.ruby:fx-workshop-1' => validNormalized()['systems']['records']['rust:fx-workshop-1']], 'normalized.systems.records.ruby:fx-workshop-1', 'unknown_id'],
    'an unknown objective' => [['systems.records.rust:fx-workshop-1.observed' => ['fx-obj-1', 'fx-obj-9']], 'normalized.systems.records.rust:fx-workshop-1.observed[1]', 'unknown_id'],
    'an unknown completed step' => [['route.completed' => ['fx-step-9']], 'normalized.route.completed[0]', 'unknown_id'],
    'an unknown quiz step' => [['route.quizAnswers' => ['fx-step-9' => 0]], 'normalized.route.quizAnswers.fx-step-9', 'unknown_id'],
    'an unknown resource' => [['route.favorites' => ['fx-res-9']], 'normalized.route.favorites[0]', 'unknown_id'],
    'an unknown milestone' => [['route.milestones' => ['rust-memory', 'rust-flying']], 'normalized.route.milestones[1]', 'unknown_id'],
    'an unknown test' => [['lab.records.fx-rust-01.result.tests.1.id' => 't9'], 'normalized.lab.records.fx-rust-01.result.tests[1].id', 'unknown_id'],

    'a selected exercise of the other language' => [['lab.selected.go' => 'fx-rust-01'], 'normalized.lab.selected.go', 'wrong_language'],

    'a repeated completed step' => [['route.completed' => ['fx-step-1', 'fx-step-2', 'fx-step-1']], 'normalized.route.completed[2]', 'duplicated'],
    'a repeated milestone' => [['route.milestones' => ['go-memory', 'go-memory']], 'normalized.route.milestones[1]', 'duplicated'],
    'a repeated favorite' => [['route.favorites' => ['fx-res-1', 'fx-res-1']], 'normalized.route.favorites[1]', 'duplicated'],
    'a repeated objective' => [['systems.records.rust:fx-workshop-1.observed' => ['fx-obj-1', 'fx-obj-1']], 'normalized.systems.records.rust:fx-workshop-1.observed[1]', 'duplicated'],
    'a repeated step position' => [['systems.records.rust:fx-workshop-1.steps' => [1, 2, 1]], 'normalized.systems.records.rust:fx-workshop-1.steps[2]', 'duplicated'],
    'a repeated test' => [['lab.records.fx-rust-01.result.tests' => [['id' => 't1', 'passed' => true], ['id' => 't1', 'passed' => false]]], 'normalized.lab.records.fx-rust-01.result.tests[1].id', 'duplicated'],
]);

it('rejects what a v1 parser cannot emit with the path in normalized and a Spanish message', function (array $changes, string $key, string $reason) {
    $error = rejection(patched($changes));

    expect(array_keys($error->errors()))->toBe([$key])
        ->and($error->errors()[$key])->toBe([trans("import.{$reason}")])
        ->and(trans("import.{$reason}"))->not->toStartWith('import.');
})->with('invalid values');

it('rejects a normalized without any section', function (array $normalized) {
    $error = rejection($normalized);

    expect(array_keys($error->errors()))->toBe(['normalized'])
        ->and($error->errors()['normalized'])->toBe([trans('import.no_sections')]);
})->with(['an empty one' => [[]]]);

it('never repeats a received value in a message', function (array $changes) {
    $messages = Arr::flatten(rejection(patched($changes))->errors());

    foreach ($messages as $message) {
        expect($message)->not->toContain(DECODER_SENTINEL);
    }
    expect($messages)->not->toBe([]);
})->with([
    'language' => [['route.language' => DECODER_SENTINEL]],
    'a step id' => [['route.completed' => [DECODER_SENTINEL]]],
    'an exercise id' => [['lab.records.'.DECODER_SENTINEL => decoderRecord()]],
    'a too long text' => [['lab.records.fx-rust-01.draft' => DECODER_SENTINEL.str_repeat('a', 30001)]],
    'a field name' => [['route.'.DECODER_SENTINEL => 1]],
    'a confidence' => [['lab.records.fx-rust-01.confidence' => DECODER_SENTINEL]],
    'a version' => [['lab.version' => DECODER_SENTINEL]],
]);

dataset('omissions', [
    'hints that are not an integer' => [
        ['lab.records.fx-rust-01.hints' => 2.5],
        [['path' => 'lab.records.fx-rust-01.hints', 'reason' => 'not_an_integer']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->hints)->toBeNull(),
    ],
    'hints beyond the active ones' => [
        ['lab.records.fx-rust-02' => decoderRecord(['hints' => 3])],
        [['path' => 'lab.records.fx-rust-02.hints', 'reason' => 'beyond_active_hints']],
        fn (LegacyProgress $progress) => expect($progress->exercises[2]->hints)->toBeNull(),
    ],
    'attempts that are not an integer' => [
        ['lab.records.fx-rust-01.attempts' => 1.5],
        [['path' => 'lab.records.fx-rust-01.attempts', 'reason' => 'not_an_integer']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->attempts)->toBeNull(),
    ],
    'a solvedAt that is not an integer' => [
        ['lab.records.fx-rust-01.solvedAt' => 1.5],
        [['path' => 'lab.records.fx-rust-01.solvedAt', 'reason' => 'date_out_of_range']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->solvedAt)->toBeNull(),
    ],
    'a solvedAt beyond year 9999' => [
        ['lab.records.fx-rust-01.solvedAt' => 253402300800000],
        [['path' => 'lab.records.fx-rust-01.solvedAt', 'reason' => 'date_out_of_range']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->solvedAt)->toBeNull(),
    ],
    'a reviewAt beyond year 9999' => [
        ['lab.records.fx-rust-01.reviewAt' => 253402300800000],
        [['path' => 'lab.records.fx-rust-01.reviewAt', 'reason' => 'date_out_of_range']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->reviewAt)->toBeNull(),
    ],
    'a reviewedAt that is not an integer' => [
        ['lab.records.fx-rust-01.reviewedAt' => 0.5],
        [['path' => 'lab.records.fx-rust-01.reviewedAt', 'reason' => 'date_out_of_range']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->reviewedAt)->toBeNull(),
    ],
    'a result time that is not an integer' => [
        ['lab.records.fx-rust-01.result.time' => 1760000300789.5],
        [['path' => 'lab.records.fx-rust-01.result', 'reason' => 'date_out_of_range']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->result)->toBeNull()->and($progress->exercises[0]->attempts)->toBe(4),
    ],
    'a result time before year 1000' => [
        ['lab.records.fx-rust-01.result.time' => -30610224000001],
        [['path' => 'lab.records.fx-rust-01.result', 'reason' => 'date_out_of_range']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->result)->toBeNull(),
    ],
    'a result time beyond year 9999' => [
        ['lab.records.fx-rust-01.result.time' => 253402300800000],
        [['path' => 'lab.records.fx-rust-01.result', 'reason' => 'date_out_of_range']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->result)->toBeNull(),
    ],
    'a prediction outside the options' => [
        ['lab.records.fx-rust-01.prediction' => 3],
        [['path' => 'lab.records.fx-rust-01.prediction', 'reason' => 'outside_options']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->prediction)->toBeNull(),
    ],
    'a quiz answer outside the options' => [
        ['route.quizAnswers' => ['fx-step-1' => 3, 'fx-step-2' => 0]],
        [['path' => 'route.quizAnswers.fx-step-1', 'reason' => 'outside_options'], ['path' => 'route.quizAnswers.fx-step-2', 'reason' => 'outside_options']],
        fn (LegacyProgress $progress) => expect($progress->route->quizAnswers)->toBe([]),
    ],
    'a checkpoint answer outside the options' => [
        ['campaign.checkpoints.fx-world-1.lastAnswer' => 3],
        [['path' => 'campaign.checkpoints.fx-world-1.lastAnswer', 'reason' => 'outside_options']],
        fn (LegacyProgress $progress) => expect($progress->checkpoints[0]->lastAnswer)->toBeNull()->and($progress->checkpoints[0]->passed)->toBeTrue(),
    ],
    'a workshop answer outside the options' => [
        ['systems.records.rust:fx-workshop-1.answer' => 3],
        [['path' => 'systems.records.rust:fx-workshop-1.answer', 'reason' => 'outside_options']],
        fn (LegacyProgress $progress) => expect($progress->workshops[0]->answer)->toBeNull()->and($progress->workshops[0]->codeSealed)->toBeTrue(),
    ],
    'a step position without a step' => [
        ['systems.records.rust:fx-workshop-1.steps' => [9, 0]],
        [['path' => 'systems.records.rust:fx-workshop-1.steps[0]', 'reason' => 'unknown_step_position']],
        fn (LegacyProgress $progress) => expect($progress->workshops[0]->steps)->toBe(['e1']),
    ],
    'a success that contradicts a transport error' => [
        ['lab.records.fx-rust-01.result.transportError' => true],
        [['path' => 'lab.records.fx-rust-01.result.success', 'reason' => 'contradicts_transport_error']],
        fn (LegacyProgress $progress) => expect($progress->exercises[0]->result->success)->toBeFalse()->and($progress->exercises[0]->result->transportError)->toBeTrue(),
    ],
]);

it('applies the rest and reports what it left out with its path and reason', function (array $changes, array $expected, Closure $effect) {
    $progress = decoded(patched($changes));

    expect(entries($progress->omitted))->toBe($expected)
        ->and($progress->replaced)->toBe([])
        ->and($progress->exercises[1]->exerciseId)->toBe('fx-go-01')
        ->and($progress->route->language)->toBe('go');
    $effect($progress);
})->with('omissions');

it('reports a text with a replacement character and keeps it as it is', function (string $path) {
    $text = "a\u{FFFD}b";
    $progress = decoded(patched([$path => $text]));

    expect(entries($progress->replaced))->toBe([['path' => $path, 'reason' => 'replacement_character']])
        ->and($progress->omitted)->toBe([]);
})->with([
    'a route note' => ['route.notes.rust.learned'],
    'a draft' => ['lab.records.fx-rust-01.draft'],
    'a reflection' => ['lab.records.fx-rust-01.reflection'],
    'a custom test' => ['lab.records.fx-rust-01.customTest'],
    'a result code' => ['lab.records.fx-rust-01.result.code'],
    'a stdout' => ['lab.records.fx-rust-01.result.stdout'],
    'a stderr' => ['lab.records.fx-rust-01.result.stderr'],
    'a result custom test' => ['lab.records.fx-rust-01.result.customTest'],
    'a workshop note' => ['systems.records.rust:fx-workshop-1.note'],
]);

it('keeps the text with the replacement character in the decoded record', function () {
    $text = "a\u{FFFD}b";
    $progress = decoded(patched(['lab.records.fx-rust-01.reflection' => $text, 'systems.records.rust:fx-workshop-1.note' => $text]));

    expect($progress->exercises[0]->reflection)->toBe($text)
        ->and($progress->workshops[0]->note)->toBe($text);
});
