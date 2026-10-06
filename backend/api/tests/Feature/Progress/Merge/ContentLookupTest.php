<?php

use App\Progress\Operations\Checked;
use App\Progress\Operations\ContentLookup;
use App\Progress\Operations\OperationDecoder;
use App\Progress\Operations\RejectionReason;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;

const LOOKUP_CURRENT_VERSION = '0123456789abcdef0123456789abcdef';
const LOOKUP_OTHER_VERSION = 'fedcba9876543210fedcba9876543210';

function lookupRaw(array $fields, string $id = '00000000-0000-4000-8000-000000000001'): array
{
    return ['id' => $id, 'at' => '2026-10-05T12:00:00.000Z', ...$fields];
}

function lookupReason(array $fields): ?RejectionReason
{
    $checked = lookupCheck([lookupRaw($fields)])[0];

    return $checked->reason;
}

/** @return list<Checked> */
function lookupCheck(array $raws): array
{
    return (new ContentLookup)->check((new OperationDecoder)->decode($raws), LOOKUP_CURRENT_VERSION);
}

function retireRow(string $table, array $where, bool $positioned = true): void
{
    DB::table($table)->where($where)->update(['status' => 'deprecated', 'retired_at' => '2026-10-05 10:00:00.000', ...($positioned ? ['position' => null] : [])]);
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
});

it('accepts an existing reference of each class', function (array $fields) {
    $checked = lookupCheck([lookupRaw($fields)])[0];

    expect($checked->reason)->toBeNull()
        ->and($checked->operation)->not->toBeNull();
})->with([
    'exercise' => [['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'Idea']],
    'world' => [['type' => 'checkpoint.answer', 'worldId' => 'fx-world-1', 'answer' => 1, 'passed' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
    'workshop' => [['type' => 'workshop.note', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'text' => 'Nota']],
    'objective' => [['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'objectiveKey' => 'fx-obj-2']],
    'step key' => [['type' => 'workshop.step', 'workshopId' => 'fx-workshop-1', 'language' => 'go', 'stepKey' => 'e4', 'marked' => true]],
    'guide step in a mark' => [['type' => 'route.mark', 'kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => true]],
    'guide step in a quiz' => [['type' => 'route.quiz', 'stepId' => 'fx-step-1', 'answer' => 0, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
    'resource' => [['type' => 'route.mark', 'kind' => 'favorite', 'itemKey' => 'fx-res-1', 'marked' => true]],
    'milestone' => [['type' => 'route.mark', 'kind' => 'milestone', 'itemKey' => 'go-network', 'marked' => true]],
    'lab selection of the right language' => [['type' => 'preference.set', 'name' => 'labSelectedGo', 'value' => 'fx-go-02']],
    'a note, that has no reference' => [['type' => 'route.note', 'language' => 'rust', 'field' => 'learned', 'body' => 'Hoy']],
]);

it('accepts a retired reference of each class as an existing one', function (string $table, array $where, array $fields, bool $positioned) {
    retireRow($table, $where, $positioned);

    expect(lookupReason($fields))->toBeNull();
})->with([
    'exercise' => ['exercises', ['id' => 'fx-rust-01'], ['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'Idea'], true],
    'world' => ['worlds', ['id' => 'fx-world-1'], ['type' => 'checkpoint.answer', 'worldId' => 'fx-world-1', 'answer' => 1, 'passed' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION], true],
    'workshop' => ['workshops', ['id' => 'fx-workshop-1'], ['type' => 'workshop.note', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'text' => 'Nota'], true],
    'objective' => ['workshop_objectives', ['objective_key' => 'fx-obj-1'], ['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'objectiveKey' => 'fx-obj-1'], true],
    'step key' => ['workshop_steps', ['step_key' => 'e1'], ['type' => 'workshop.step', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e1', 'marked' => true], true],
    'guide step' => ['guide_steps', ['id' => 'fx-step-1'], ['type' => 'route.mark', 'kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => true], true],
    'resource' => ['guide_resources', ['id' => 'fx-res-1'], ['type' => 'route.mark', 'kind' => 'favorite', 'itemKey' => 'fx-res-1', 'marked' => true], true],
    'lab selected exercise' => ['exercises', ['id' => 'fx-go-01'], ['type' => 'preference.set', 'name' => 'labSelectedGo', 'value' => 'fx-go-01'], true],
]);

it('rejects the reference that the content does not have as unknown_reference', function (array $fields) {
    expect(lookupReason($fields))->toBe(RejectionReason::UnknownReference);
})->with([
    'unknown-exercise' => [['type' => 'exercise.reflection', 'exerciseId' => 'fx-no-existe', 'text' => 'Idea']],
    'unknown-world' => [['type' => 'checkpoint.answer', 'worldId' => 'fx-no-world', 'answer' => 1, 'passed' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
    'unknown-workshop' => [['type' => 'workshop.note', 'workshopId' => 'fx-no-workshop', 'language' => 'rust', 'text' => 'Nota']],
    'unknown-objective' => [['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'objectiveKey' => 'fx-obj-9']],
    'unknown-step-key' => [['type' => 'workshop.step', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e9', 'marked' => true]],
    'unknown-guide-step' => [['type' => 'route.mark', 'kind' => 'step', 'itemKey' => 'fx-no-step', 'marked' => true]],
    'unknown-resource' => [['type' => 'route.mark', 'kind' => 'favorite', 'itemKey' => 'fx-no-res', 'marked' => true]],
    'unknown-milestone' => [['type' => 'route.mark', 'kind' => 'milestone', 'itemKey' => 'rust-nada', 'marked' => true]],
    'unknown-lab-selected' => [['type' => 'preference.set', 'name' => 'labSelectedGo', 'value' => 'fx-go-99']],
    'unknown quiz step' => [['type' => 'route.quiz', 'stepId' => 'fx-no-step', 'answer' => 0, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
    'unknown workshop of a prediction' => [['type' => 'workshop.prediction', 'workshopId' => 'fx-no-workshop', 'language' => 'rust', 'answer' => 0, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
]);

it('finds an objective and a step only in their own workshop', function () {
    DB::table('workshops')->where('id', 'fx-workshop-1')->get()->each(function ($workshop) {
        $copy = (array) $workshop;
        $copy['id'] = 'fx-workshop-2';
        DB::table('workshops')->insert($copy);
    });

    expect(lookupReason(['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-2', 'language' => 'rust', 'objectiveKey' => 'fx-obj-1']))->toBe(RejectionReason::UnknownReference)
        ->and(lookupReason(['type' => 'workshop.step', 'workshopId' => 'fx-workshop-2', 'language' => 'rust', 'stepKey' => 'e1', 'marked' => true]))->toBe(RejectionReason::UnknownReference);
});

it('rejects an answer outside the options of the question as out_of_range', function (array $fields) {
    expect(lookupReason($fields))->toBe(RejectionReason::OutOfRange);
})->with([
    'answer-outside-options' => [['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 3, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
    'checkpoint' => [['type' => 'checkpoint.answer', 'worldId' => 'fx-world-1', 'answer' => 3, 'passed' => false, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
    'workshop prediction' => [['type' => 'workshop.prediction', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'answer' => 3, 'correct' => false, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
    'route quiz' => [['type' => 'route.quiz', 'stepId' => 'fx-step-1', 'answer' => 3, 'contentVersion' => LOOKUP_CURRENT_VERSION]],
]);

it('accepts the last option of the question', function () {
    expect(lookupReason(['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 2, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]))->toBeNull();
});

it('reads the number of options from the JSON of the row', function () {
    DB::table('exercises')->where('id', 'fx-rust-01')->update(['prediction_json' => json_encode(['question' => 'P', 'options' => ['a', 'b'], 'answer' => 0])]);

    $answerTwo = lookupReason(['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 2, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]);
    $answerOne = lookupReason(['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]);

    expect($answerTwo)->toBe(RejectionReason::OutOfRange)
        ->and($answerOne)->toBeNull();
});

it('reports the unknown reference before the range', function () {
    expect(lookupReason(['type' => 'exercise.prediction', 'exerciseId' => 'fx-no-existe', 'answer' => 200, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION]))->toBe(RejectionReason::UnknownReference);
});

it('bounds the hints by the active hints of the exercise', function (int $revealed, ?RejectionReason $expected) {
    expect(lookupReason(['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-01', 'revealed' => $revealed]))->toBe($expected);
})->with([
    'all three' => [3, null],
    'hints-beyond-the-exercise' => [4, RejectionReason::OutOfRange],
]);

it('counts only the active hints', function () {
    retireRow('exercise_hints', ['exercise_id' => 'fx-rust-01', 'position' => 3], positioned: false);

    expect(lookupReason(['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-01', 'revealed' => 2]))->toBeNull()
        ->and(lookupReason(['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-01', 'revealed' => 3]))->toBe(RejectionReason::OutOfRange);
});

it('rejects a hint count for an exercise that has none', function () {
    DB::table('exercise_hints')->where('exercise_id', 'fx-rust-02')->delete();

    expect(lookupReason(['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-02', 'revealed' => 1]))->toBe(RejectionReason::OutOfRange);
});

it('requires a lab selection of the language of the preference', function (string $name, string $exercise) {
    expect(lookupReason(['type' => 'preference.set', 'name' => $name, 'value' => $exercise]))->toBe(RejectionReason::Invalid);
})->with([
    'lab-selected-of-other-language' => ['labSelectedRust', 'fx-go-01'],
    'a Rust exercise for Go' => ['labSelectedGo', 'fx-rust-01'],
]);

it('marks an answer given with another content version as stale and the rest as current', function () {
    $checked = lookupCheck([
        lookupRaw(['type' => 'route.quiz', 'stepId' => 'fx-step-1', 'answer' => 1, 'contentVersion' => LOOKUP_OTHER_VERSION], '00000000-0000-4000-8000-000000000001'),
        lookupRaw(['type' => 'route.quiz', 'stepId' => 'fx-step-1', 'answer' => 1, 'contentVersion' => LOOKUP_CURRENT_VERSION], '00000000-0000-4000-8000-000000000002'),
        lookupRaw(['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'Idea'], '00000000-0000-4000-8000-000000000003'),
    ]);

    expect(array_map(fn ($item) => $item->stale, $checked))->toBe([true, false, false]);
});

it('keeps the order of the batch and the rejections of the decoder', function () {
    $checked = lookupCheck([
        lookupRaw(['type' => 'exercise.reflection', 'exerciseId' => 'fx-no-existe', 'text' => 'a'], '00000000-0000-4000-8000-000000000001'),
        lookupRaw(['type' => 'exercise.solved', 'exerciseId' => 'fx-rust-01'], '00000000-0000-4000-8000-000000000002'),
        lookupRaw(['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'b'], '00000000-0000-4000-8000-000000000003'),
        lookupRaw(['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-01', 'revealed' => 0], '00000000-0000-4000-8000-000000000004'),
    ]);

    expect(array_map(fn ($item) => $item->id, $checked))->toBe([
        '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004',
    ])->and(array_map(fn ($item) => $item->reason, $checked))->toBe([RejectionReason::UnknownReference, RejectionReason::Invalid, null, RejectionReason::OutOfRange])
        ->and($checked[1]->hash)->toHaveLength(64);
});

it('checks a batch of 200 operations with at most eight queries', function () {
    $raws = [];
    for ($index = 1; $index <= 200; $index++) {
        $id = sprintf('00000000-0000-4000-8000-%012d', $index);
        $raws[] = match ($index % 8) {
            0 => lookupRaw(['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION], $id),
            1 => lookupRaw(['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-02', 'revealed' => 2], $id),
            2 => lookupRaw(['type' => 'checkpoint.answer', 'worldId' => 'fx-world-1', 'answer' => 1, 'passed' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION], $id),
            3 => lookupRaw(['type' => 'workshop.prediction', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'answer' => 1, 'correct' => true, 'contentVersion' => LOOKUP_CURRENT_VERSION], $id),
            4 => lookupRaw(['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-1', 'language' => 'go', 'objectiveKey' => 'fx-obj-1'], $id),
            5 => lookupRaw(['type' => 'workshop.step', 'workshopId' => 'fx-workshop-1', 'language' => 'go', 'stepKey' => 'e2', 'marked' => true], $id),
            6 => lookupRaw(['type' => 'route.quiz', 'stepId' => 'fx-step-1', 'answer' => 1, 'contentVersion' => LOOKUP_CURRENT_VERSION], $id),
            default => lookupRaw(['type' => 'route.mark', 'kind' => 'favorite', 'itemKey' => 'fx-res-1', 'marked' => true], $id),
        };
    }
    $decoded = (new OperationDecoder)->decode($raws);

    DB::enableQueryLog();
    $checked = (new ContentLookup)->check($decoded, LOOKUP_CURRENT_VERSION);
    $queries = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect(array_filter(array_map(fn ($item) => $item->reason, $checked)))->toBe([])
        ->and($queries)->toBeLessThanOrEqual(8);
});

it('does not query the content when no operation refers to it', function () {
    DB::enableQueryLog();
    lookupCheck([lookupRaw(['type' => 'route.note', 'language' => 'rust', 'field' => 'next', 'body' => 'Hoy'])]);
    $queries = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($queries)->toBe(0);
});
