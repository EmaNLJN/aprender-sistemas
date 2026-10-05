<?php

use App\Content\PublishedJson;

// The expected values are what JavaScript's JSON.stringify gives for the same value (checked with
// node): tools/content/meta.ts hashes them, so PHP must produce the same bytes.
it('encodes like JSON.stringify', function (mixed $value, string $expected) {
    expect(PublishedJson::encode($value))->toBe($expected);
})->with([
    'n with tilde' => ['ñ', '"ñ"'],
    'outside the basic multilingual plane' => ['😀', '"😀"'],
    'line and paragraph separators, unescaped' => ["a\u{2028}b\u{2029}c", "\"a\u{2028}b\u{2029}c\""],
    'slash, unescaped' => ['a/b', '"a/b"'],
    'unnamed control character, lowercase hex' => ["x\u{1f}y", '"x\u001fy"'],
    'named control characters' => ["\x08\x0c\n\r\t", '"\b\f\n\r\t"'],
    'DEL, unescaped' => ["a\x7fb", "\"a\x7fb\""],
    'quotes and backslash' => ['he said "hi" \\ ok', '"he said \"hi\" \\\\ ok"'],
    '<, > and & unescaped' => ['<a href="x">&\'</a>', '"<a href=\"x\">&\'</a>"'],
    'empty object' => [new stdClass, '{}'],
    'empty list' => [[], '[]'],
    'nested empty objects and lists' => [(object) ['a' => new stdClass, 'b' => [], 'c' => [new stdClass]], '{"a":{},"b":[],"c":[{}]}'],
    'mixed record' => [
        (object) ['id' => 'rust-01', 'tests' => [(object) ['id' => 't1']], 'n' => 3, 'ok' => true, 'no' => false],
        '{"id":"rust-01","tests":[{"id":"t1"}],"n":3,"ok":true,"no":false}',
    ],
    'null and integers, zero and negatives' => [(object) ['a' => null, 'b' => 0, 'c' => -7], '{"a":null,"b":0,"c":-7}'],
    'keys are escaped like values' => [(object) ["ñ \"x\" a/b\u{2028}" => 1], "{\"ñ \\\"x\\\" a/b\u{2028}\":1}"],
]);

it('encodes an array with "0", "1"… keys as a list', function () {
    expect(PublishedJson::encode(['0' => 'a', '1' => 'b']))->toBe('["a","b"]');
});

// JSON.stringify would sort 0 before 1; PHP keeps insertion order. The document has no such keys:
// if one appeared, the import self-check would fail instead of publishing other bytes.
it('keeps the insertion order of an object, numeric keys included', function () {
    expect(PublishedJson::encode((object) ['1' => 'a', '0' => 'b']))->toBe('{"1":"a","0":"b"}');
});

it('decodes to objects so {} does not become []', function () {
    expect(PublishedJson::encode(PublishedJson::decode('{"a":{},"b":[],"c":[{"d":{}}]}')))
        ->toBe('{"a":{},"b":[],"c":[{"d":{}}]}');
});

it('rejects text that is not UTF-8 instead of publishing something else', function () {
    PublishedJson::encode("\xff");
})->throws(JsonException::class);
