<?php

use App\Content\PublishedJson;

// Los esperados son lo que JSON.stringify de JavaScript da para el mismo valor (se comprobaron con
// node): es lo que hashea tools/content/meta.ts, así que PHP tiene que dar los mismos bytes.
it('codifica como JSON.stringify', function (mixed $value, string $expected) {
    expect(PublishedJson::encode($value))->toBe($expected);
})->with([
    'eñe' => ['ñ', '"ñ"'],
    'fuera del plano básico' => ['😀', '"😀"'],
    'separadores de línea y de párrafo, sin escapar' => ["a\u{2028}b\u{2029}c", "\"a\u{2028}b\u{2029}c\""],
    'barra sin escapar' => ['a/b', '"a/b"'],
    'control sin nombre, con hex en minúsculas' => ["x\u{1f}y", '"x\u001fy"'],
    'controles con nombre' => ["\x08\x0c\n\r\t", '"\b\f\n\r\t"'],
    'DEL sin escapar' => ["a\x7fb", "\"a\x7fb\""],
    'comillas y barra invertida' => ['he said "hi" \\ ok', '"he said \"hi\" \\\\ ok"'],
    '<, > y & sin escapar' => ['<a href="x">&\'</a>', '"<a href=\"x\">&\'</a>"'],
    'objeto vacío' => [new stdClass, '{}'],
    'lista vacía' => [[], '[]'],
    'objetos y listas vacíos anidados' => [(object) ['a' => new stdClass, 'b' => [], 'c' => [new stdClass]], '{"a":{},"b":[],"c":[{}]}'],
    'registro mixto' => [
        (object) ['id' => 'rust-01', 'tests' => [(object) ['id' => 't1']], 'n' => 3, 'ok' => true, 'no' => false],
        '{"id":"rust-01","tests":[{"id":"t1"}],"n":3,"ok":true,"no":false}',
    ],
    'null y enteros, el cero y los negativos' => [(object) ['a' => null, 'b' => 0, 'c' => -7], '{"a":null,"b":0,"c":-7}'],
    'las claves se escapan igual que los valores' => [(object) ["ñ \"x\" a/b\u{2028}" => 1], "{\"ñ \\\"x\\\" a/b\u{2028}\":1}"],
]);

it('un array con claves "0", "1"… sale como lista', function () {
    expect(PublishedJson::encode(['0' => 'a', '1' => 'b']))->toBe('["a","b"]');
});

// JSON.stringify ordenaría 0 antes que 1; PHP conserva el orden de inserción. El documento no tiene
// claves así: si apareciera una, el auto-chequeo del import fallaría en lugar de publicar otros bytes.
it('conserva el orden de inserción de un objeto, también con claves numéricas', function () {
    expect(PublishedJson::encode((object) ['1' => 'a', '0' => 'b']))->toBe('{"1":"a","0":"b"}');
});

it('decodifica con objetos para no convertir {} en []', function () {
    expect(PublishedJson::encode(PublishedJson::decode('{"a":{},"b":[],"c":[{"d":{}}]}')))
        ->toBe('{"a":{},"b":[],"c":[{"d":{}}]}');
});

it('rechaza un texto que no es UTF-8 en lugar de publicar otra cosa', function () {
    PublishedJson::encode("\xff");
})->throws(JsonException::class);
