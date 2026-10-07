<?php

use App\Progress\Operations\Decoded;
use App\Progress\Operations\OperationDecoder;
use App\Progress\Operations\OperationType;
use App\Progress\Operations\RejectionReason;
use Tests\TestCase;

uses(TestCase::class);

const DECODER_UUID = '6f1c0a52-1b7e-4c58-9d0e-2a4f8b3c7d10';
const DECODER_AT = '2026-10-05T12:00:00.000Z';
const DECODER_VERSION = '0123456789abcdef0123456789abcdef';
const DECODER_REFLECTION_DIGEST = 'cf937cba1a9c89aba384830e546db4f367619c9943539034e9b0d33595a8ea4a';

beforeEach(function () {
    config(['progress.limits' => [
        'draft_chars' => 30000,
        'reflection_chars' => 10000,
        'custom_test_chars' => 3000,
        'workshop_note_chars' => 10000,
        'route_note_chars' => 20000,
    ]]);
});

/**
 * @param  array<string, mixed>  $fields
 * @return array<string, mixed>
 */
function rawOperation(string $type, array $fields): array
{
    return ['id' => DECODER_UUID, 'type' => $type, 'at' => DECODER_AT, ...$fields];
}

function decodeOne(array $raw): Decoded
{
    return (new OperationDecoder)->decode([$raw])[0];
}

/** @return array<string, array{string, array<string, mixed>}> */
function validOperations(): array
{
    return [
        'exercise.prediction' => ['exercise.prediction', ['exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => DECODER_VERSION]],
        'exercise.assist' => ['exercise.assist', ['exerciseId' => 'fx-rust-01', 'assisted' => true, 'solutionSeen' => true]],
        'exercise.hints' => ['exercise.hints', ['exerciseId' => 'fx-rust-01', 'revealed' => 2]],
        'exercise.reflection' => ['exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => 'Hola']],
        'exercise.customTest' => ['exercise.customTest', ['exerciseId' => 'fx-rust-01', 'text' => 'assert_eq!(f(1), 2);']],
        'exercise.review' => ['exercise.review', ['exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => '2026-10-05T11:00:00.000Z', 'reviewDueAt' => '2026-10-06T11:00:00.000Z']],
        'exercise.draft' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => 'fn a() {}', 'starterHash' => str_repeat('a', 64)]],
        'checkpoint.answer' => ['checkpoint.answer', ['worldId' => 'fx-world-1', 'answer' => 1, 'passed' => true, 'contentVersion' => DECODER_VERSION]],
        'workshop.prediction' => ['workshop.prediction', ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'answer' => 0, 'correct' => false, 'contentVersion' => DECODER_VERSION]],
        'workshop.note' => ['workshop.note', ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'text' => 'Nota A']],
        'workshop.objective' => ['workshop.objective', ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'objectiveKey' => 'fx-obj-1']],
        'workshop.step' => ['workshop.step', ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e1', 'marked' => true]],
        'route.mark' => ['route.mark', ['kind' => 'favorite', 'itemKey' => 'res.1', 'marked' => false]],
        'route.quiz' => ['route.quiz', ['stepId' => 'fx-step-1', 'answer' => 2, 'contentVersion' => DECODER_VERSION]],
        'route.note' => ['route.note', ['language' => 'rust', 'field' => 'learned', 'body' => 'Aprendí A']],
        'preference.set' => ['preference.set', ['name' => 'focusMinutes', 'value' => 25]],
    ];
}

it('decodes a valid operation of each of the sixteen types with its fields', function (string $type, array $fields) {
    $decoded = decodeOne(rawOperation($type, $fields));

    $expectedValues = collect($fields)->except('contentVersion')->all();
    $expectedVersion = $fields['contentVersion'] ?? null;

    expect($decoded->reason)->toBeNull()
        ->and($decoded->id)->toBe(DECODER_UUID)
        ->and($decoded->operation?->type)->toBe(OperationType::from($type))
        ->and($decoded->operation?->values)->toBe($expectedValues)
        ->and($decoded->operation?->contentVersion)->toBe($expectedVersion)
        ->and($decoded->operation?->at->format('Y-m-d\TH:i:s.v\Z'))->toBe(DECODER_AT)
        ->and($decoded->operation?->id)->toBe(DECODER_UUID);
})->with(validOperations());

it('covers every operation type in the valid table', function () {
    $covered = collect(validOperations())->map(fn (array $case) => $case[0])->sort()->values()->all();
    $types = collect(OperationType::cases())->map(fn (OperationType $type) => $type->value)->sort()->values()->all();

    expect($covered)->toBe($types);
});

it('rejects a field of more in each of the sixteen types as invalid', function (string $type, array $fields) {
    $decoded = decodeOne(rawOperation($type, [...$fields, 'bogus' => 1]));

    expect($decoded->reason)->toBe(RejectionReason::Invalid)
        ->and($decoded->operation)->toBeNull();
})->with(validOperations());

it('rejects a missing field in each of the sixteen types as invalid', function (string $type, array $fields) {
    $required = collect(array_keys($fields))->reject(fn (string $field) => $type === 'exercise.assist' && $field !== 'exerciseId');

    foreach ($required as $field) {
        $without = collect($fields)->except($field)->all();

        expect(decodeOne(rawOperation($type, $without))->reason)->toBe(RejectionReason::Invalid, "{$type} without {$field}");
    }
})->with(validOperations());

it('accepts an assist with only one of the two flags', function (string $flag) {
    $decoded = decodeOne(rawOperation('exercise.assist', ['exerciseId' => 'fx-rust-01', $flag => true]));

    expect($decoded->reason)->toBeNull()
        ->and($decoded->operation?->values)->toBe(['exerciseId' => 'fx-rust-01', $flag => true]);
})->with(['assisted', 'solutionSeen']);

it('accepts the empty string, a draft tombstone and a draft without starter hash', function (string $type, array $fields) {
    expect(decodeOne(rawOperation($type, $fields))->reason)->toBeNull();
})->with([
    'empty reflection' => ['exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => '']],
    'empty route note' => ['route.note', ['language' => 'go', 'field' => 'next', 'body' => '']],
    'empty draft code' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => '', 'starterHash' => null]],
    'draft tombstone' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => null, 'starterHash' => null]],
    'draft without starter hash' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => 'fn a() {}', 'starterHash' => null]],
]);

it('validates the value of preference.set by its name', function (string $name, mixed $value, ?RejectionReason $reason) {
    $decoded = decodeOne(rawOperation('preference.set', ['name' => $name, 'value' => $value]));

    expect($decoded->reason)->toBe($reason);
})->with([
    'route language rust' => ['routeLanguage', 'rust', null],
    'route language go' => ['routeLanguage', 'go', null],
    'route language unknown' => ['routeLanguage', 'python', RejectionReason::Invalid],
    'route language number' => ['routeLanguage', 1, RejectionReason::Invalid],
    'focus 15' => ['focusMinutes', 15, null],
    'focus 45' => ['focusMinutes', 45, null],
    'focus 20' => ['focusMinutes', 20, RejectionReason::OutOfRange],
    'focus text' => ['focusMinutes', '25', RejectionReason::Invalid],
    'focus float' => ['focusMinutes', 25.0, RejectionReason::Invalid],
    'lab selected rust' => ['labSelectedRust', 'fx-rust-01', null],
    'lab selected go' => ['labSelectedGo', 'fx-go-01', null],
    'lab selected malformed key' => ['labSelectedGo', 'FX GO', RejectionReason::Invalid],
    'lab selected number' => ['labSelectedRust', 5, RejectionReason::Invalid],
    'unknown name' => ['volume', 3, RejectionReason::Invalid],
]);

it('rejects the shapes that http.md section 3.2 calls invalid', function (string $type, array $fields, RejectionReason $reason) {
    expect(decodeOne(rawOperation($type, $fields))->reason)->toBe($reason);
})->with([
    'answer as text' => ['exercise.prediction', ['exerciseId' => 'fx-rust-01', 'answer' => '1', 'correct' => true, 'contentVersion' => DECODER_VERSION], RejectionReason::Invalid],
    'answer as float with integer value' => ['exercise.prediction', ['exerciseId' => 'fx-rust-01', 'answer' => 1.0, 'correct' => true, 'contentVersion' => DECODER_VERSION], RejectionReason::Invalid],
    'correct as zero' => ['exercise.prediction', ['exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => 0, 'contentVersion' => DECODER_VERSION], RejectionReason::Invalid],
    'correct as text' => ['exercise.prediction', ['exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => 'true', 'contentVersion' => DECODER_VERSION], RejectionReason::Invalid],
    'content version in uppercase' => ['route.quiz', ['stepId' => 'fx-step-1', 'answer' => 1, 'contentVersion' => strtoupper(DECODER_VERSION)], RejectionReason::Invalid],
    'content version too short' => ['route.quiz', ['stepId' => 'fx-step-1', 'answer' => 1, 'contentVersion' => 'abc'], RejectionReason::Invalid],
    'revealed as text' => ['exercise.hints', ['exerciseId' => 'fx-rust-01', 'revealed' => '2'], RejectionReason::Invalid],
    'text as number' => ['exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => 5], RejectionReason::Invalid],
    'text as null' => ['exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => null], RejectionReason::Invalid],
    'marked as one' => ['workshop.step', ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e1', 'marked' => 1], RejectionReason::Invalid],
    'language outside the set' => ['workshop.note', ['workshopId' => 'fx-workshop-1', 'language' => 'python', 'text' => 'x'], RejectionReason::Invalid],
    'mark kind outside the set' => ['route.mark', ['kind' => 'badge', 'itemKey' => 'res.1', 'marked' => true], RejectionReason::Invalid],
    'note field outside the set' => ['route.note', ['language' => 'rust', 'field' => 'other', 'body' => 'x'], RejectionReason::Invalid],
    'assist flag as text' => ['exercise.assist', ['exerciseId' => 'fx-rust-01', 'assisted' => 'yes'], RejectionReason::Invalid],
    'review date that is not an instant' => ['exercise.review', ['exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => 'yesterday', 'reviewDueAt' => '2026-10-06T11:00:00.000Z'], RejectionReason::Invalid],
    'review date that does not exist' => ['exercise.review', ['exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => '2026-13-45T11:00:00.000Z', 'reviewDueAt' => '2026-10-06T11:00:00.000Z'], RejectionReason::Invalid],
    'review date as number' => ['exercise.review', ['exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => 1790000000, 'reviewDueAt' => '2026-10-06T11:00:00.000Z'], RejectionReason::Invalid],
    'starter hash of 63 characters' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => 'x', 'starterHash' => str_repeat('a', 63)], RejectionReason::Invalid],
    'starter hash in uppercase' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => 'x', 'starterHash' => str_repeat('A', 64)], RejectionReason::Invalid],
]);

it('treats a malformed key as invalid', function (string $type, string $field, string $key) {
    $fields = collect(validOperations())->first(fn (array $case) => $case[0] === $type)[1];

    expect(decodeOne(rawOperation($type, [...$fields, $field => $key]))->reason)->toBe(RejectionReason::Invalid);
})->with([
    'exercise id in uppercase' => ['exercise.reflection', 'exerciseId', 'Fx-rust-01'],
    'exercise id starting with a dash' => ['exercise.reflection', 'exerciseId', '-fx'],
    'exercise id with a dot' => ['exercise.reflection', 'exerciseId', 'fx.rust'],
    'exercise id of 65 characters' => ['exercise.reflection', 'exerciseId', 'a'.'-b'.str_repeat('c', 62)],
    'empty exercise id' => ['exercise.reflection', 'exerciseId', ''],
    'world id with a space' => ['checkpoint.answer', 'worldId', 'fx world'],
    'workshop id starting with a dot' => ['workshop.note', 'workshopId', '.fx'],
    'objective key with a slash' => ['workshop.objective', 'objectiveKey', 'a/b'],
    'step key empty' => ['workshop.step', 'stepKey', ''],
    'item key of 65 characters' => ['route.mark', 'itemKey', str_repeat('k', 65)],
]);

it('accepts the longest well-formed keys', function () {
    $longest = str_repeat('k', 64);

    expect(decodeOne(rawOperation('exercise.reflection', ['exerciseId' => $longest, 'text' => 'x']))->reason)->toBeNull()
        ->and(decodeOne(rawOperation('route.mark', ['kind' => 'step', 'itemKey' => 'A'.str_repeat('.', 63), 'marked' => true]))->reason)->toBeNull();
});

it('rejects numbers and texts out of their range as out_of_range', function (string $type, array $fields) {
    expect(decodeOne(rawOperation($type, $fields))->reason)->toBe(RejectionReason::OutOfRange);
})->with([
    'hints revealed zero' => ['exercise.hints', ['exerciseId' => 'fx-rust-01', 'revealed' => 0]],
    'hints revealed above 255' => ['exercise.hints', ['exerciseId' => 'fx-rust-01', 'revealed' => 256]],
    'answer above 255' => ['exercise.prediction', ['exerciseId' => 'fx-rust-01', 'answer' => 256, 'correct' => true, 'contentVersion' => DECODER_VERSION]],
    'negative answer' => ['route.quiz', ['stepId' => 'fx-step-1', 'answer' => -1, 'contentVersion' => DECODER_VERSION]],
    'focus minutes not allowed' => ['preference.set', ['name' => 'focusMinutes', 'value' => 20]],
    'reflection too long' => ['exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => str_repeat('x', 10001)]],
    'custom test too long' => ['exercise.customTest', ['exerciseId' => 'fx-rust-01', 'text' => str_repeat('x', 3001)]],
    'draft too long' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => str_repeat('x', 30001), 'starterHash' => null]],
    'workshop note too long' => ['workshop.note', ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'text' => str_repeat('x', 10001)]],
    'route note too long' => ['route.note', ['language' => 'rust', 'field' => 'next', 'body' => str_repeat('x', 20001)]],
    'review date before 2020' => ['exercise.review', ['exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => '2019-12-31T23:59:59.999Z', 'reviewDueAt' => '2026-10-06T11:00:00.000Z']],
    'review due date after 2100' => ['exercise.review', ['exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => '2026-10-05T11:00:00.000Z', 'reviewDueAt' => '2100-01-01T00:00:00.001Z']],
]);

it('accepts the texts and numbers that sit exactly on their limit', function (string $type, array $fields) {
    expect(decodeOne(rawOperation($type, $fields))->reason)->toBeNull();
})->with([
    'hints revealed one' => ['exercise.hints', ['exerciseId' => 'fx-rust-01', 'revealed' => 1]],
    'hints revealed 255' => ['exercise.hints', ['exerciseId' => 'fx-rust-01', 'revealed' => 255]],
    'answer zero' => ['route.quiz', ['stepId' => 'fx-step-1', 'answer' => 0, 'contentVersion' => DECODER_VERSION]],
    'answer 255' => ['route.quiz', ['stepId' => 'fx-step-1', 'answer' => 255, 'contentVersion' => DECODER_VERSION]],
    'reflection at its limit' => ['exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => str_repeat('x', 10000)]],
    'custom test at its limit' => ['exercise.customTest', ['exerciseId' => 'fx-rust-01', 'text' => str_repeat('x', 3000)]],
    'draft at its limit' => ['exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => str_repeat('x', 30000), 'starterHash' => null]],
    'workshop note at its limit' => ['workshop.note', ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'text' => str_repeat('x', 10000)]],
    'route note at its limit' => ['route.note', ['language' => 'rust', 'field' => 'next', 'body' => str_repeat('x', 20000)]],
    'review date on 2020-01-01' => ['exercise.review', ['exerciseId' => 'fx-rust-01', 'confidence' => 'again', 'reviewedAt' => '2020-01-01T00:00:00.000Z', 'reviewDueAt' => '2100-01-01T00:00:00.000Z']],
]);

it('counts characters, not bytes, against the limit of a text', function () {
    $emoji = '🙂';

    expect(decodeOne(rawOperation('exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => str_repeat($emoji, 10000)]))->reason)->toBeNull()
        ->and(decodeOne(rawOperation('exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => str_repeat($emoji, 10001)]))->reason)->toBe(RejectionReason::OutOfRange);
});

it('also measures a text in bytes against the capacity of its column', function () {
    config(['progress.limits.reflection_chars' => 20000, 'progress.limits.draft_chars' => 5000000]);
    $overTextColumn = str_repeat('🙂', 16384);
    $underTextColumn = str_repeat('🙂', 16383);

    expect(decodeOne(rawOperation('exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => $underTextColumn]))->reason)->toBeNull()
        ->and(decodeOne(rawOperation('exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => $overTextColumn]))->reason)->toBe(RejectionReason::OutOfRange)
        ->and(decodeOne(rawOperation('exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => $overTextColumn, 'starterHash' => null]))->reason)->toBeNull();
});

it('rejects a draft without code that still carries a starter hash', function () {
    $decoded = decodeOne(rawOperation('exercise.draft', ['exerciseId' => 'fx-rust-01', 'code' => null, 'starterHash' => str_repeat('a', 64)]));

    expect($decoded->reason)->toBe(RejectionReason::Invalid);
});

it('rejects an assist with no flag and one with a false flag', function (array $flags) {
    $decoded = decodeOne(rawOperation('exercise.assist', ['exerciseId' => 'fx-rust-01', ...$flags]));

    expect($decoded->reason)->toBe(RejectionReason::Invalid);
})->with([
    'no flag' => [[]],
    'assisted false' => [['assisted' => false]],
    'solution seen false' => [['solutionSeen' => false]],
    'one true and one false' => [['assisted' => true, 'solutionSeen' => false]],
]);

it('rejects an unknown type and the fields only the server or the importer write', function (string $type, array $fields) {
    expect(decodeOne(rawOperation($type, $fields))->reason)->toBe(RejectionReason::Invalid);
})->with([
    'unknown type' => ['exercise.solved', ['exerciseId' => 'fx-rust-01']],
    'server-owned field' => ['exercise.prediction', ['exerciseId' => 'fx-rust-01', 'answer' => 1, 'correct' => true, 'contentVersion' => DECODER_VERSION, 'solvedAt' => DECODER_AT]],
    'importer-only field' => ['workshop.prediction', ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'answer' => 1, 'correct' => true, 'contentVersion' => DECODER_VERSION, 'codeSealed' => true]],
]);

it('reports invalid before out_of_range when an operation has both problems', function () {
    $decoded = decodeOne(rawOperation('exercise.hints', ['exerciseId' => 'Bad Key', 'revealed' => 0]));

    expect($decoded->reason)->toBe(RejectionReason::Invalid);
});

it('gives each decoded operation the hash of what arrived, valid or not', function () {
    $valid = decodeOne(rawOperation('exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => 'Hola']));
    $invalid = decodeOne(rawOperation('exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => 'Hola', 'bogus' => 1]));

    expect($valid->hash)->toBe(DECODER_REFLECTION_DIGEST)
        ->and($valid->operation?->hash)->toBe(DECODER_REFLECTION_DIGEST)
        ->and($invalid->hash)->toMatch('/\A[0-9a-f]{64}\z/')
        ->and($invalid->hash)->not->toBe(DECODER_REFLECTION_DIGEST)
        ->and($invalid->id)->toBe(DECODER_UUID);
});

it('returns one result per raw operation, in the same order', function () {
    $first = rawOperation('exercise.reflection', ['exerciseId' => 'fx-rust-01', 'text' => 'Hola']);
    $second = [...rawOperation('exercise.hints', ['exerciseId' => 'fx-rust-01', 'revealed' => 0]), 'id' => '11111111-1111-4111-8111-111111111111'];
    $third = [...rawOperation('route.quiz', ['stepId' => 'fx-step-1', 'answer' => 1, 'contentVersion' => DECODER_VERSION]), 'id' => '22222222-2222-4222-8222-222222222222'];

    $decoded = (new OperationDecoder)->decode([$first, $second, $third]);

    expect(collect($decoded)->map(fn (Decoded $one) => $one->id)->all())->toBe([DECODER_UUID, '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'])
        ->and(collect($decoded)->map(fn (Decoded $one) => $one->reason?->value)->all())->toBe([null, 'out_of_range', null]);
});
