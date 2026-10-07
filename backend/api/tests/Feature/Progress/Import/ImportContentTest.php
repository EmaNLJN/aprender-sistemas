<?php

use App\Progress\Import\ImportContent;
use App\Progress\Import\LegacyDecoder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\Support\ProgressWorld;

function contentFactsWorld(): array
{
    return [
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'exercises' => [
            ['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3],
            ['id' => 'fx-rust-02', 'language' => 'rust', 'hints' => 2, 'predictionOptions' => 4],
            ['id' => 'fx-go-01', 'language' => 'go', 'hints' => 1, 'predictionOptions' => 2],
        ],
        'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
        'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1', 'fx-obj-2'], 'steps' => ['e1', 'e2', 'e3', 'e4']]],
        'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3], ['id' => 'fx-step-2', 'quizOptions' => 2]], 'resources' => ['fx-res-1']],
    ];
}

function contentFactsNormalized(): array
{
    return [
        'route' => [
            'version' => 1, 'language' => 'rust', 'completed' => ['fx-step-1'], 'milestones' => ['rust-memory'], 'favorites' => ['fx-res-1'],
            'quizAnswers' => ['fx-step-2' => 1], 'notes' => ['rust' => ['learned' => '', 'next' => ''], 'go' => ['learned' => '', 'next' => '']], 'minutes' => 25,
        ],
        'lab' => [
            'version' => 1,
            'records' => [
                'fx-rust-01' => ['predictionCorrect' => true, 'assisted' => false, 'solutionSeen' => false, 'prediction' => 2, 'hints' => 3],
                'fx-nope' => ['predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false],
            ],
            'selected' => ['rust' => 'fx-rust-02', 'go' => null],
        ],
        'campaign' => [
            'version' => 1,
            'seals' => ['fx-go-01' => ['code' => true, 'prediction' => false, 'assisted' => false]],
            'checkpoints' => ['fx-world-1' => ['passed' => true, 'lastAnswer' => 2]],
        ],
        'systems' => [
            'version' => 1,
            'records' => ['go:fx-workshop-1' => ['observed' => ['fx-obj-2'], 'code' => false, 'predicted' => true, 'answer' => 1, 'steps' => [1, 4], 'note' => '']],
        ],
    ];
}

beforeEach(function () {
    ProgressWorld::seed(contentFactsWorld());
});

it('brings the facts of every class that the normalized names', function () {
    $facts = (new ImportContent)->factsFor(contentFactsNormalized());

    expect($facts->exercises)->toEqual([
        'fx-rust-01' => ['language' => 'rust', 'predictionOptions' => 3, 'activeHints' => 3, 'testKeys' => ['t1', 't2', 't3']],
        'fx-rust-02' => ['language' => 'rust', 'predictionOptions' => 4, 'activeHints' => 2, 'testKeys' => ['t1', 't2', 't3']],
        'fx-go-01' => ['language' => 'go', 'predictionOptions' => 2, 'activeHints' => 1, 'testKeys' => ['t1', 't2', 't3']],
    ])
        ->and($facts->checkpointOptions)->toBe(['fx-world-1' => 3])
        ->and($facts->workshops)->toBe([
            'fx-workshop-1' => ['predictionOptions' => 3, 'objectives' => ['fx-obj-1', 'fx-obj-2'], 'stepsByV1Position' => [1 => 'e1', 2 => 'e2', 3 => 'e3', 4 => 'e4']],
        ])
        ->and($facts->quizOptions)->toBe(['fx-step-1' => 3, 'fx-step-2' => 2])
        ->and($facts->resources)->toBe(['fx-res-1']);
});

it('does not know an id that the content does not have', function () {
    $facts = (new ImportContent)->factsFor(contentFactsNormalized());

    expect($facts->exercises)->not->toHaveKey('fx-nope');
});

it('counts only the active hints of an exercise', function () {
    DB::table('exercise_hints')->where(['exercise_id' => 'fx-rust-01', 'position' => 3])->update(['status' => 'deprecated', 'retired_at' => '2026-10-05 10:00:00.000']);

    $facts = (new ImportContent)->factsFor(contentFactsNormalized());

    expect($facts->exercises['fx-rust-01']['activeHints'])->toBe(2);
});

it('finds what the content retired as existing', function () {
    $retired = ['status' => 'deprecated', 'retired_at' => '2026-10-05 10:00:00.000', 'position' => null];
    DB::table('exercises')->where('id', 'fx-go-01')->update($retired);
    DB::table('exercise_tests')->where(['exercise_id' => 'fx-rust-01', 'test_key' => 't2'])->update($retired);
    DB::table('worlds')->where('id', 'fx-world-1')->update($retired);
    DB::table('workshops')->where('id', 'fx-workshop-1')->update($retired);
    DB::table('workshop_objectives')->where('objective_key', 'fx-obj-2')->update($retired);
    DB::table('workshop_steps')->where('step_key', 'e4')->update($retired);
    DB::table('guide_steps')->where('id', 'fx-step-1')->update($retired);
    DB::table('guide_resources')->where('id', 'fx-res-1')->update($retired);

    $facts = (new ImportContent)->factsFor(contentFactsNormalized());

    expect($facts->exercises)->toHaveKey('fx-go-01')
        ->and($facts->exercises['fx-rust-01']['testKeys'])->toEqualCanonicalizing(['t1', 't2', 't3'])
        ->and($facts->checkpointOptions)->toBe(['fx-world-1' => 3])
        ->and($facts->workshops['fx-workshop-1']['objectives'])->toEqualCanonicalizing(['fx-obj-1', 'fx-obj-2'])
        ->and($facts->workshops['fx-workshop-1']['stepsByV1Position'])->toHaveKey(4)
        ->and($facts->quizOptions)->toHaveKey('fx-step-1')
        ->and($facts->resources)->toBe(['fx-res-1']);
});

it('leaves out a step with no v1 position', function () {
    DB::table('workshop_steps')->where('step_key', 'e2')->update(['v1_position' => null]);

    $facts = (new ImportContent)->factsFor(contentFactsNormalized());

    expect($facts->workshops['fx-workshop-1']['stepsByV1Position'])->toBe([1 => 'e1', 3 => 'e3', 4 => 'e4']);
});

it('keeps a guide step without a quiz as a step with no options', function () {
    DB::table('guide_steps')->where('id', 'fx-step-1')->update(['quiz_json' => '{}']);

    $facts = (new ImportContent)->factsFor(contentFactsNormalized());

    expect($facts->quizOptions)->toBe(['fx-step-1' => 0, 'fx-step-2' => 2]);
});

it('does not fail on a shape the decoder will reject', function (array $normalized) {
    $facts = (new ImportContent)->factsFor($normalized);

    expect($facts->exercises)->toBe([])
        ->and($facts->checkpointOptions)->toBe([])
        ->and($facts->workshops)->toBe([])
        ->and($facts->quizOptions)->toBe([])
        ->and($facts->resources)->toBe([]);
})->with([
    'sections that are not objects' => [['route' => 'x', 'lab' => 5, 'campaign' => null, 'systems' => true]],
    'collections of the wrong kind' => [['route' => ['completed' => 5, 'favorites' => 'x', 'quizAnswers' => [1, 2]], 'lab' => ['records' => 'x', 'selected' => 'x'], 'campaign' => ['seals' => 5, 'checkpoints' => [[]]], 'systems' => ['records' => [1, 2]]]],
    'items of the wrong kind' => [['route' => ['completed' => [5, null, ['a']], 'favorites' => [1]], 'lab' => ['selected' => ['rust' => 5, 'go' => ['x']]], 'systems' => ['records' => ['no-separator' => []]]]],
    'nothing' => [[]],
]);

it('makes at most one query per class of reference, however many exercises the normalized names', function () {
    $normalized = contentFactsNormalized();
    for ($number = 1; $number <= 274; $number++) {
        $normalized['lab']['records']["fx-rust-extra-{$number}"] = ['predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false];
        $normalized['campaign']['seals']["fx-rust-extra-{$number}"] = ['code' => true, 'prediction' => true, 'assisted' => true];
    }

    DB::flushQueryLog();
    DB::enableQueryLog();
    $facts = (new ImportContent)->factsFor($normalized);
    $queries = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($queries)->toBeLessThanOrEqual(9)
        ->and(array_keys($facts->exercises))->toEqualCanonicalizing(['fx-rust-01', 'fx-rust-02', 'fx-go-01']);
});

it('feeds the decoder of a normalized from the test world end to end', function () {
    $normalized = contentFactsNormalized();
    unset($normalized['lab']['records']['fx-nope']);

    $progress = (new LegacyDecoder)->decode($normalized, (new ImportContent)->factsFor($normalized));

    expect($progress->exercises[0]->exerciseId)->toBe('fx-rust-01')
        ->and($progress->exercises[0]->prediction)->toBe(2)
        ->and($progress->selected)->toBe(['rust' => 'fx-rust-02', 'go' => null])
        ->and($progress->workshops[0]->steps)->toBe(['e1', 'e4'])
        ->and($progress->route->quizAnswers)->toBe(['fx-step-2' => 1])
        ->and($progress->checkpoints[0]->lastAnswer)->toBe(2)
        ->and($progress->omitted)->toBe([]);
});

it('lets the decoder reject an id the content does not have', function () {
    $normalized = contentFactsNormalized();

    expect(fn () => (new LegacyDecoder)->decode($normalized, (new ImportContent)->factsFor($normalized)))
        ->toThrow(ValidationException::class);
});
