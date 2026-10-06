<?php

use App\Progress\Merge\OperationWriter;
use App\Progress\Operations\Checked;
use App\Progress\Operations\OperationDecoder;
use App\Progress\Operations\RejectionReason;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;

const WRITER_CONTENT_VERSION = '0123456789abcdef0123456789abcdef';
const WRITER_STARTER_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function writerOperation(array $fields, bool $stale = false): Checked
{
    $raw = ['id' => '00000000-0000-4000-8000-000000000001', 'at' => '2026-10-05T12:00:00.000Z', ...$fields];
    $decoded = (new OperationDecoder)->decode([$raw])[0];

    return Checked::ready($decoded->operation ?? throw new LogicException('Test operation is invalid.'), $stale);
}

/** @return array{int, int} the user id and the revision that the transaction leaves */
function writerAccount(): array
{
    ProgressWorld::seed(MergeFixture::world());
    $user = ProgressWorld::user();
    ProgressWorld::head($user, revision: 6);

    return [$user->id, 6];
}

function writeOperation(int $userId, Checked $checked, ?string $at = '2026-10-05T12:00:00.000Z', int $revision = 6, string $now = '2026-10-06T12:00:00.000Z'): bool
{
    $effectiveAt = $at === null ? null : CarbonImmutable::parse($at);

    return (new OperationWriter)->write($userId, $checked, $effectiveAt, $revision, CarbonImmutable::parse($now))->changed;
}

function storedRow(string $table, int $userId, array $key): array
{
    return (array) DB::table($table)->where('user_id', $userId)->where($key)->first();
}

function plantExerciseProgress(int $userId, array $columns = []): void
{
    DB::table('exercise_progress')->insert([
        'user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'revision' => 5,
        'created_at' => '2026-10-05 11:00:00.000', 'updated_at' => '2026-10-05 11:00:00.000', ...$columns,
    ]);
}

dataset('operations and the columns they write', [
    'exercise.prediction' => [
        ['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => WRITER_CONTENT_VERSION],
        'exercise_progress', ['exercise_id' => 'fx-rust-01'],
        ['prediction_answer' => 1, 'prediction_answer_set_at' => '2026-10-05 12:00:00.000', 'prediction_correct' => 1, 'prediction_correct_at' => '2026-10-05 12:00:00.000'],
    ],
    'exercise.assist' => [
        ['type' => 'exercise.assist', 'exerciseId' => 'fx-rust-01', 'assisted' => true, 'solutionSeen' => true],
        'exercise_progress', ['exercise_id' => 'fx-rust-01'], ['assisted' => 1, 'solution_seen' => 1],
    ],
    'exercise.hints' => [
        ['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-01', 'revealed' => 2],
        'exercise_progress', ['exercise_id' => 'fx-rust-01'], ['hints_revealed' => 2],
    ],
    'exercise.reflection' => [
        ['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'Idea'],
        'exercise_progress', ['exercise_id' => 'fx-rust-01'], ['reflection' => 'Idea', 'reflection_set_at' => '2026-10-05 12:00:00.000'],
    ],
    'exercise.customTest' => [
        ['type' => 'exercise.customTest', 'exerciseId' => 'fx-rust-01', 'text' => 'assert!(true);'],
        'exercise_progress', ['exercise_id' => 'fx-rust-01'], ['custom_test' => 'assert!(true);', 'custom_test_set_at' => '2026-10-05 12:00:00.000'],
    ],
    'exercise.review' => [
        ['type' => 'exercise.review', 'exerciseId' => 'fx-rust-01', 'confidence' => 'practice', 'reviewedAt' => '2026-10-05T11:00:00.000Z', 'reviewDueAt' => '2026-10-06T11:00:00.000Z'],
        'exercise_progress', ['exercise_id' => 'fx-rust-01'],
        ['confidence' => 'practice', 'reviewed_at' => '2026-10-05 11:00:00.000', 'review_due_at' => '2026-10-06 11:00:00.000', 'review_set_at' => '2026-10-05 12:00:00.000'],
    ],
    'exercise.draft' => [
        ['type' => 'exercise.draft', 'exerciseId' => 'fx-rust-01', 'code' => 'fn a() {}', 'starterHash' => WRITER_STARTER_HASH],
        'drafts', ['exercise_id' => 'fx-rust-01'], ['code' => 'fn a() {}', 'starter_hash' => WRITER_STARTER_HASH, 'set_at' => '2026-10-05 12:00:00.000'],
    ],
    'checkpoint.answer' => [
        ['type' => 'checkpoint.answer', 'worldId' => 'fx-world-1', 'answer' => 1, 'passed' => true, 'contentVersion' => WRITER_CONTENT_VERSION],
        'campaign_checkpoints', ['world_id' => 'fx-world-1'],
        ['last_answer' => 1, 'last_answer_set_at' => '2026-10-05 12:00:00.000', 'passed' => 1, 'passed_at' => '2026-10-05 12:00:00.000'],
    ],
    'workshop.prediction' => [
        ['type' => 'workshop.prediction', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'answer' => 1, 'correct' => true, 'contentVersion' => WRITER_CONTENT_VERSION],
        'workshop_progress', ['workshop_id' => 'fx-workshop-1', 'language' => 'rust'],
        ['answer' => 1, 'answer_set_at' => '2026-10-05 12:00:00.000', 'prediction_correct' => 1, 'prediction_correct_at' => '2026-10-05 12:00:00.000'],
    ],
    'workshop.note' => [
        ['type' => 'workshop.note', 'workshopId' => 'fx-workshop-1', 'language' => 'go', 'text' => 'Nota'],
        'workshop_progress', ['workshop_id' => 'fx-workshop-1', 'language' => 'go'], ['note' => 'Nota', 'note_set_at' => '2026-10-05 12:00:00.000'],
    ],
    'workshop.objective' => [
        ['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'objectiveKey' => 'fx-obj-2'],
        'workshop_observations', ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'objective_key' => 'fx-obj-2'], ['observed_at' => '2026-10-05 12:00:00.000'],
    ],
    'workshop.step' => [
        ['type' => 'workshop.step', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e3', 'marked' => true],
        'workshop_step_marks', ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e3'], ['marked' => 1, 'set_at' => '2026-10-05 12:00:00.000'],
    ],
    'route.mark step' => [
        ['type' => 'route.mark', 'kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => true],
        'route_marks', ['kind' => 'step', 'item_key' => 'fx-step-1'], ['marked' => 1, 'set_at' => '2026-10-05 12:00:00.000'],
    ],
    'route.mark milestone' => [
        ['type' => 'route.mark', 'kind' => 'milestone', 'itemKey' => 'go-memory', 'marked' => false],
        'route_marks', ['kind' => 'milestone', 'item_key' => 'go-memory'], ['marked' => 0, 'set_at' => '2026-10-05 12:00:00.000'],
    ],
    'route.mark favorite' => [
        ['type' => 'route.mark', 'kind' => 'favorite', 'itemKey' => 'fx-res-1', 'marked' => true],
        'route_marks', ['kind' => 'favorite', 'item_key' => 'fx-res-1'], ['marked' => 1, 'set_at' => '2026-10-05 12:00:00.000'],
    ],
    'route.quiz' => [
        ['type' => 'route.quiz', 'stepId' => 'fx-step-1', 'answer' => 2, 'contentVersion' => WRITER_CONTENT_VERSION],
        'route_quiz_answers', ['step_id' => 'fx-step-1'], ['answer' => 2, 'set_at' => '2026-10-05 12:00:00.000'],
    ],
    'route.note' => [
        ['type' => 'route.note', 'language' => 'go', 'field' => 'next', 'body' => 'Lo siguiente'],
        'route_notes', ['language' => 'go', 'field' => 'next'], ['body' => 'Lo siguiente', 'set_at' => '2026-10-05 12:00:00.000'],
    ],
    'preference routeLanguage' => [
        ['type' => 'preference.set', 'name' => 'routeLanguage', 'value' => 'go'],
        'preferences', [], ['route_language' => 'go', 'route_language_set_at' => '2026-10-05 12:00:00.000'],
    ],
    'preference focusMinutes' => [
        ['type' => 'preference.set', 'name' => 'focusMinutes', 'value' => 45],
        'preferences', [], ['focus_minutes' => 45, 'focus_minutes_set_at' => '2026-10-05 12:00:00.000'],
    ],
    'preference labSelectedRust' => [
        ['type' => 'preference.set', 'name' => 'labSelectedRust', 'value' => 'fx-rust-02'],
        'preferences', [], ['lab_selected_rust' => 'fx-rust-02', 'lab_selected_rust_set_at' => '2026-10-05 12:00:00.000'],
    ],
    'preference labSelectedGo' => [
        ['type' => 'preference.set', 'name' => 'labSelectedGo', 'value' => 'fx-go-02'],
        'preferences', [], ['lab_selected_go' => 'fx-go-02', 'lab_selected_go_set_at' => '2026-10-05 12:00:00.000'],
    ],
]);

it('writes the columns of the field kinds of an operation with its revision', function (array $fields, string $table, array $key, array $expected) {
    [$userId, $revision] = writerAccount();

    $changed = writeOperation($userId, writerOperation($fields));

    $row = storedRow($table, $userId, $key);
    expect($changed)->toBeTrue()
        ->and(Arr::only($row, array_keys($expected)))->toEqual($expected)
        ->and((int) $row['revision'])->toBe($revision);
    ProgressInvariants::assertClean($userId);
})->with('operations and the columns they write');

it('leaves the other preference columns alone', function () {
    [$userId] = writerAccount();
    writeOperation($userId, writerOperation(['type' => 'preference.set', 'name' => 'routeLanguage', 'value' => 'rust']));

    writeOperation($userId, writerOperation(['type' => 'preference.set', 'name' => 'focusMinutes', 'value' => 25]), '2026-10-05T12:00:01.000Z');

    expect(Arr::only(storedRow('preferences', $userId, []), ['route_language', 'focus_minutes', 'lab_selected_rust', 'lab_selected_go']))
        ->toEqual(['route_language' => 'rust', 'focus_minutes' => 25, 'lab_selected_rust' => null, 'lab_selected_go' => null]);
});

it('does not change the columns of the closing of B2 or of the import in exercise_progress', function () {
    [$userId] = writerAccount();
    $owned = [
        'solved_at' => '2026-10-01 10:00:00.000', 'server_solved_at' => '2026-10-01 10:00:01.000', 'proof_at' => '2026-10-01 10:00:02.000',
        'last_attempt_at' => '2026-10-01 10:00:03.000', 'attempt_count' => 4, 'legacy_attempts' => 9,
    ];
    plantExerciseProgress($userId, $owned);
    $operations = [
        ['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => WRITER_CONTENT_VERSION],
        ['type' => 'exercise.assist', 'exerciseId' => 'fx-rust-01', 'assisted' => true, 'solutionSeen' => true],
        ['type' => 'exercise.hints', 'exerciseId' => 'fx-rust-01', 'revealed' => 3],
        ['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'Idea'],
        ['type' => 'exercise.customTest', 'exerciseId' => 'fx-rust-01', 'text' => 'assert!(true);'],
        ['type' => 'exercise.review', 'exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => '2026-10-05T11:00:00.000Z', 'reviewDueAt' => '2026-10-06T11:00:00.000Z'],
    ];

    foreach ($operations as $operation) {
        writeOperation($userId, writerOperation($operation));
    }

    expect(Arr::only(storedRow('exercise_progress', $userId, ['exercise_id' => 'fx-rust-01']), array_keys($owned)))->toEqual($owned);
});

it('does not change the legacy position of the children of a workshop or of a route mark', function () {
    [$userId] = writerAccount();
    DB::table('workshop_progress')->insert(['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'code_sealed' => 1, 'revision' => 5, 'created_at' => '2026-10-05 11:00:00.000', 'updated_at' => '2026-10-05 11:00:00.000']);
    DB::table('workshop_step_marks')->insert(['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 1, 'set_at' => null, 'legacy_position' => 3, 'revision' => 5, 'created_at' => '2026-10-05 11:00:00.000', 'updated_at' => '2026-10-05 11:00:00.000']);
    DB::table('route_marks')->insert(['user_id' => $userId, 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, 'set_at' => null, 'legacy_position' => 2, 'revision' => 5, 'created_at' => '2026-10-05 11:00:00.000', 'updated_at' => '2026-10-05 11:00:00.000']);

    writeOperation($userId, writerOperation(['type' => 'workshop.step', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e1', 'marked' => false]));
    writeOperation($userId, writerOperation(['type' => 'workshop.note', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'text' => 'Nota']));
    writeOperation($userId, writerOperation(['type' => 'route.mark', 'kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => false]));

    expect((int) DB::table('workshop_step_marks')->where('user_id', $userId)->value('legacy_position'))->toBe(3)
        ->and((int) DB::table('workshop_progress')->where('user_id', $userId)->value('code_sealed'))->toBe(1)
        ->and((int) DB::table('route_marks')->where('user_id', $userId)->value('legacy_position'))->toBe(2);
    ProgressInvariants::assertClean($userId);
});

it('creates the parent row of a workshop step with the new revision before the child', function () {
    [$userId, $revision] = writerAccount();

    $changed = writeOperation($userId, writerOperation(['type' => 'workshop.step', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e1', 'marked' => true]));

    $parent = storedRow('workshop_progress', $userId, ['workshop_id' => 'fx-workshop-1', 'language' => 'rust']);
    expect($changed)->toBeTrue()
        ->and((int) $parent['revision'])->toBe($revision)
        ->and($parent['created_at'])->toBe('2026-10-06 12:00:00.000');
});

it('creates the parent row of an objective and leaves an existing parent as it was', function () {
    [$userId, $revision] = writerAccount();
    DB::table('workshop_progress')->insert(['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'go', 'note' => 'Antes', 'revision' => 4, 'created_at' => '2026-10-04 11:00:00.000', 'updated_at' => '2026-10-04 11:00:00.000']);

    writeOperation($userId, writerOperation(['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'objectiveKey' => 'fx-obj-1']));
    writeOperation($userId, writerOperation(['type' => 'workshop.objective', 'workshopId' => 'fx-workshop-1', 'language' => 'go', 'objectiveKey' => 'fx-obj-1']));

    $created = storedRow('workshop_progress', $userId, ['workshop_id' => 'fx-workshop-1', 'language' => 'rust']);
    $existing = storedRow('workshop_progress', $userId, ['workshop_id' => 'fx-workshop-1', 'language' => 'go']);
    expect((int) $created['revision'])->toBe($revision)
        ->and([(int) $existing['revision'], $existing['note'], $existing['updated_at']])->toBe([4, 'Antes', '2026-10-04 11:00:00.000']);
});

it('does not write the flag of a prediction when the operation does not grant it', function (array $fields, bool $stale) {
    [$userId] = writerAccount();

    writeOperation($userId, writerOperation($fields, $stale));

    $row = storedRow('exercise_progress', $userId, ['exercise_id' => 'fx-rust-01']);
    expect([(int) $row['prediction_answer'], (int) $row['prediction_correct'], $row['prediction_correct_at']])->toBe([1, 0, null]);
    ProgressInvariants::assertClean($userId);
})->with([
    'stale content' => [['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => 'fedcba9876543210fedcba9876543210'], true],
    'a wrong answer' => [['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => false, 'contentVersion' => WRITER_CONTENT_VERSION], false],
]);

it('does not lower a flag that is already set when the operation does not grant it', function () {
    [$userId] = writerAccount();
    writeOperation($userId, writerOperation(['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => WRITER_CONTENT_VERSION]));

    writeOperation($userId, writerOperation(['type' => 'exercise.prediction', 'exerciseId' => 'fx-rust-01', 'answer' => 2, 'correct' => false, 'contentVersion' => WRITER_CONTENT_VERSION]), '2026-10-05T12:00:05.000Z');

    $row = storedRow('exercise_progress', $userId, ['exercise_id' => 'fx-rust-01']);
    expect([(int) $row['prediction_answer'], (int) $row['prediction_correct'], $row['prediction_correct_at']])->toBe([2, 1, '2026-10-05 12:00:00.000']);
});

it('writes created_at only when it inserts, and updated_at and revision only when the row changes', function () {
    [$userId] = writerAccount();
    plantExerciseProgress($userId, ['reflection' => 'Idea', 'reflection_set_at' => '2026-10-05 12:00:00.000']);
    $reflection = fn (string $text) => writerOperation(['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => $text]);

    $unchanged = writeOperation($userId, $reflection('Idea'), '2026-10-05T12:00:00.000Z', 6, '2026-10-06T12:00:00.000Z');
    $afterUnchanged = storedRow('exercise_progress', $userId, ['exercise_id' => 'fx-rust-01']);
    $changed = writeOperation($userId, $reflection('Otra idea'), '2026-10-05T12:00:01.000Z', 6, '2026-10-06T12:00:30.000Z');
    $afterChanged = storedRow('exercise_progress', $userId, ['exercise_id' => 'fx-rust-01']);

    expect($unchanged)->toBeFalse()
        ->and([(int) $afterUnchanged['revision'], $afterUnchanged['created_at'], $afterUnchanged['updated_at']])->toBe([5, '2026-10-05 11:00:00.000', '2026-10-05 11:00:00.000'])
        ->and($changed)->toBeTrue()
        ->and([(int) $afterChanged['revision'], $afterChanged['created_at'], $afterChanged['updated_at']])->toBe([6, '2026-10-05 11:00:00.000', '2026-10-06 12:00:30.000']);
});

it('stamps created_at and updated_at with the time of the transaction on insert', function () {
    [$userId] = writerAccount();

    writeOperation($userId, writerOperation(['type' => 'route.quiz', 'stepId' => 'fx-step-1', 'answer' => 1, 'contentVersion' => WRITER_CONTENT_VERSION]), now: '2026-10-06T12:00:07.250Z');

    $row = storedRow('route_quiz_answers', $userId, ['step_id' => 'fx-step-1']);
    expect([$row['created_at'], $row['updated_at']])->toBe(['2026-10-06 12:00:07.250', '2026-10-06 12:00:07.250']);
});

it('counts a text that differs only in case, accent or a trailing space as a change even with the same clock', function (string $stored, string $incoming) {
    [$userId] = writerAccount();
    plantExerciseProgress($userId, ['reflection' => $stored, 'reflection_set_at' => '2026-10-05 12:00:00.000']);

    $changed = writeOperation($userId, writerOperation(['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => $incoming]));

    $row = storedRow('exercise_progress', $userId, ['exercise_id' => 'fx-rust-01']);
    expect($changed)->toBeTrue()
        ->and([$row['reflection'], (int) $row['revision']])->toBe([$incoming, 6]);
})->with([
    'case' => ['Casa', 'casa'],
    'accent' => ['cafe', 'café'],
    'trailing space' => ['a', 'a '],
]);

it('stores an empty text and keeps the whitespace of a text', function (string $text) {
    [$userId] = writerAccount();

    writeOperation($userId, writerOperation(['type' => 'workshop.note', 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'text' => $text]));

    expect(storedRow('workshop_progress', $userId, ['workshop_id' => 'fx-workshop-1', 'language' => 'rust'])['note'])->toBe($text);
})->with(['empty' => [''], 'indentation and a line break' => ["  sangría\n  "]]);

it('writes a draft that restores the starter as a tombstone with its clock', function () {
    [$userId] = writerAccount();
    writeOperation($userId, writerOperation(['type' => 'exercise.draft', 'exerciseId' => 'fx-rust-01', 'code' => 'fn a() {}', 'starterHash' => WRITER_STARTER_HASH]));

    writeOperation($userId, writerOperation(['type' => 'exercise.draft', 'exerciseId' => 'fx-rust-01', 'code' => null, 'starterHash' => null]), '2026-10-05T12:00:05.000Z');

    $row = storedRow('drafts', $userId, ['exercise_id' => 'fx-rust-01']);
    expect([$row['code'], $row['starter_hash'], $row['set_at']])->toBe([null, null, '2026-10-05 12:00:05.000']);
    ProgressInvariants::assertClean($userId);
});

it('does not write a rejected operation', function () {
    [$userId] = writerAccount();
    $rejected = Checked::rejected('00000000-0000-4000-8000-000000000001', str_repeat('0', 64), RejectionReason::Invalid);

    expect(fn () => writeOperation($userId, $rejected))->toThrow(LogicException::class);
});
