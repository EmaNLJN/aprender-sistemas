<?php

use App\Progress\Operations\OperationHash;

// Both digests come from `printf '%s' '<canonical text>' | sha256sum`.
const REFLECTION_DIGEST = 'cf937cba1a9c89aba384830e546db4f367619c9943539034e9b0d33595a8ea4a';
const DRAFT_DIGEST = '3decb63e481e1711e43756399f78f8b36fcc3a3095471f2411bef12eb79a08e4';
const ALTERED_REFLECTION_DIGEST = 'f38bdcb5491fcd61bc8c11aee418298a2286424664c35723034dee147fb87f16';

function hashFixtureReflection(): array
{
    return [
        'id' => '6f1c0a52-1b7e-4c58-9d0e-2a4f8b3c7d10',
        'type' => 'exercise.reflection',
        'at' => '2026-10-05T12:00:00.000Z',
        'exerciseId' => 'fx-rust-01',
        'text' => 'Hola',
    ];
}

it('hashes the canonical form without the id', function () {
    expect(OperationHash::of(hashFixtureReflection()))->toBe(REFLECTION_DIGEST);
});

it('does not depend on the id or on the order of the keys', function () {
    $shuffled = [
        'text' => 'Hola',
        'type' => 'exercise.reflection',
        'exerciseId' => 'fx-rust-01',
        'id' => 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        'at' => '2026-10-05T12:00:00.000Z',
    ];

    expect(OperationHash::of($shuffled))->toBe(REFLECTION_DIGEST);
});

it('changes when one byte of the operation changes', function () {
    $altered = [...hashFixtureReflection(), 'text' => 'Hola.'];

    expect(OperationHash::of($altered))->toBe(ALTERED_REFLECTION_DIGEST);
});

it('keeps text unescaped and nulls explicit', function () {
    $draft = [
        'id' => '6f1c0a52-1b7e-4c58-9d0e-2a4f8b3c7d10',
        'type' => 'exercise.draft',
        'at' => '2026-10-05T12:00:00.000Z',
        'exerciseId' => 'fx-go-01',
        'code' => 'fn é() { a/b }',
        'starterHash' => null,
    ];

    expect(OperationHash::of($draft))->toBe(DRAFT_DIGEST);
});

it('hashes an operation with nested values or floats instead of failing', function () {
    $malformed = [...hashFixtureReflection(), 'text' => ['a' => 1.5, 'b' => [true, null]]];

    expect(OperationHash::of($malformed))->toMatch('/\A[0-9a-f]{64}\z/');
});
