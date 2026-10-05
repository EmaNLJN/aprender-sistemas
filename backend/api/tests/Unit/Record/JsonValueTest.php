<?php

use App\Content\Record\JsonValue;

it('encodes and decodes a JSON value', function () {
    $value = JsonValue::fromDocument(new stdClass);
    expect($value->toRow())->toBe('{}');
    expect($value->toPublished())->toEqual(new stdClass);
});

it('encodes null', function () {
    expect(JsonValue::fromDocument(null)->toRow())->toBe('null');
});

it('preserves the order and escaping of keys and values', function () {
    $value = JsonValue::fromDocument((object) ['b' => [], 'a' => 'ñ/']);
    expect($value->toRow())->toBe('{"b":[],"a":"ñ/"}');
});

it('decodes to objects so {} does not become []', function () {
    $value = JsonValue::fromRow('{"x":1}');
    expect($value->toPublished())->toEqual((object) ['x' => 1]);
});
