<?php

use Tests\Support\LosslessNormalization;

function losslessHolds(string $originalJson, string $projectionJson): bool
{
    return LosslessNormalization::holds(json_decode($originalJson, false), json_decode($projectionJson, false));
}

it('accepts equal scalars and rejects different ones', function (string $original, string $projection, bool $expected) {
    expect(losslessHolds($original, $projection))->toBe($expected);
})->with([
    'equal strings' => ['"a"', '"a"', true],
    'different strings' => ['"a"', '"b"', false],
    'a trimmed string' => ['" x "', '"x"', false],
    'equal booleans' => ['true', 'true', true],
    'different booleans' => ['true', 'false', false],
    'null against null' => ['null', 'null', true],
    'null against a value' => ['null', '0', false],
    'a value against null' => ['0', 'null', false],
]);

it('lets the projection carry extra keys but not miss one', function (string $original, string $projection, bool $expected) {
    expect(losslessHolds($original, $projection))->toBe($expected);
})->with([
    'an extra key' => ['{"a":1}', '{"a":1,"b":2}', true],
    'an extra key in a nested object' => ['{"a":[{"b":"x"}]}', '{"a":[{"b":"x","c":0}],"d":null}', true],
    'a missing key' => ['{"a":1,"b":2}', '{"a":1}', false],
    'a changed value' => ['{"a":1}', '{"a":2}', false],
    'a null against a missing key' => ['{"a":null}', '{}', false],
    'a change in the third level' => ['{"a":{"b":{"c":1}}}', '{"a":{"b":{"c":2}}}', false],
]);

it('compares lists by index and lets the projection be longer', function (string $original, string $projection, bool $expected) {
    expect(losslessHolds($original, $projection))->toBe($expected);
})->with([
    'a longer list' => ['[1,2]', '[1,2,3]', true],
    'a shorter list' => ['[1,2,3]', '[1,2]', false],
    'a filtered item' => ['[1,2,3]', '[1,3]', false],
    'a reordered list' => ['[1,2]', '[2,1]', false],
    'an empty list' => ['[]', '[1]', true],
]);

it('tells an empty object from an empty list', function (string $original, string $projection, bool $expected) {
    expect(losslessHolds($original, $projection))->toBe($expected);
})->with([
    'object against list' => ['{}', '[]', false],
    'list against object' => ['[]', '{}', false],
    'object against object' => ['{}', '{"a":1}', true],
]);

it('compares numbers by value and strings by type', function (string $original, string $projection, bool $expected) {
    expect(losslessHolds($original, $projection))->toBe($expected);
})->with([
    'an integer against a float with the same value' => ['1', '1.0', true],
    'a float against an integer with the same value' => ['1.0', '1', true],
    'a string against a number' => ['"1"', '1', false],
    'a number against a string' => ['1', '"1"', false],
    'a boolean against a number' => ['true', '1', false],
    'a millisecond instant against its float' => ['1791073357221', '1791073357221.0', true],
    'different numbers' => ['1', '2', false],
]);
