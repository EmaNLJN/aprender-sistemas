<?php

use App\Content\InvalidContent;
use App\Content\Record\HarnessTemplate;

function harnessDocument(mixed $rust = "fn main() {}\n", mixed $go = 'package main'): stdClass
{
    return (object) ['rust' => $rust, 'go' => $go];
}

it('builds the template of a language from the harness document', function () {
    $template = HarnessTemplate::fromDocument(harnessDocument("{{code}}\n\"quoted\" \\ {{nonce}}\n"), 'rust');

    expect($template->language)->toBe('rust')
        ->and($template->template)->toBe("{{code}}\n\"quoted\" \\ {{nonce}}\n");
});

it('rejects a template that is missing, is not a text or is empty', function (stdClass $document, string $language) {
    expect(fn () => HarnessTemplate::fromDocument($document, $language))
        ->toThrow(InvalidContent::class, "harness.json: {$language}: se esperaba el texto de la plantilla");
})->with([
    'missing' => [(object) ['rust' => 'x'], 'go'],
    'a number' => [harnessDocument(7), 'rust'],
    'null' => [harnessDocument(null), 'rust'],
    'an empty text' => [harnessDocument(go: ''), 'go'],
]);

it('turns the record into a row and back', function () {
    $template = new HarnessTemplate('go', "package main\n");

    expect($template->toRow())->toBe(['language' => 'go', 'template' => "package main\n"])
        ->and(HarnessTemplate::fromRow($template->toRow()))->toEqual($template);
});

it('rejects a row without the template column', function () {
    HarnessTemplate::fromRow(['language' => 'rust']);
})->throws(LogicException::class, 'harness_templates: a la fila le falta la columna template');
