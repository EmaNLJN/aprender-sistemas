<?php

use App\Runs\Program\ExerciseSnapshot;
use App\Runs\Program\ExpectedTest;
use App\Runs\Program\ProgramComposer;
use App\Runs\Program\ProgramRenderer;
use App\Runs\RunLanguage;

function snapshotOf(RunLanguage $language, string $template, array $tests, array $imports = []): ExerciseSnapshot
{
    return new ExerciseSnapshot('rust-01', $language, 'hash', $tests, $imports, $template);
}

function programComposer(): ProgramComposer
{
    return new ProgramComposer(new ProgramRenderer);
}

const TEMPLATE_WITH_TESTS = "{{code}}\n{{#tests}}\n{{id}}\n{{/tests}}\n";

it('reports the test keys in order, the nonce it received and a custom test only when it has content', function (?string $custom, bool $expected) {
    $snapshot = snapshotOf(RunLanguage::Rust, TEMPLATE_WITH_TESTS, [
        new ExpectedTest('t1', 'a', 1),
        new ExpectedTest('123', 'b', 2),
    ]);

    $composed = programComposer()->compose($snapshot, 'code', $custom, 'abc');

    expect($composed->expectedTests)->toBe(['t1', '123'])
        ->and($composed->hasCustomTest)->toBe($expected)
        ->and($composed->nonce)->toBe('abc');
})->with([
    'none' => [null, false],
    'empty' => ['', false],
    'only whitespace' => [" \t\r\n", false],
    'with content' => ['x', true],
    'non-breaking space is content' => ["\u{A0}", true],
]);

it('composes the program text from the template', function () {
    $snapshot = snapshotOf(RunLanguage::Rust, TEMPLATE_WITH_TESTS, [new ExpectedTest('t1', 'a', 1)]);

    expect(programComposer()->compose($snapshot, 'fn x() {}', null, 'abc')->text)->toBe("fn x() {}\nt1\n");
});

it('fits the worst case inside the 131072 bytes the executor accepts', function () {
    $templates = json_decode((string) file_get_contents(dirname(__DIR__, 4).'/resources/content/harness.json'), true, 512, JSON_THROW_ON_ERROR);
    $go = $templates['go'];
    $tests = [];
    foreach ([1, 2, 3] as $position) {
        $tests[] = new ExpectedTest("t{$position}", str_repeat('e', 878), $position);
    }
    $imports = ['strings', 'os', 'math', 'sort', 'errors', 'bytes', 'time', 'unicode', 'strconv', 'bufio'];
    $snapshot = snapshotOf(RunLanguage::Go, $go, $tests, $imports);

    $composed = programComposer()->compose($snapshot, str_repeat('a', 65536), str_repeat('ñ', 3000), '0123456789abcdef0123456789abcdef');

    expect(strlen($composed->text))->toBeLessThan(131072);
});
