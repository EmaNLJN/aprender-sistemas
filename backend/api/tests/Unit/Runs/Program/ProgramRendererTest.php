<?php

use App\Runs\Program\ExpectedTest;
use App\Runs\Program\ProgramInput;
use App\Runs\Program\ProgramRenderer;
use App\Runs\RunLanguage;

function inputWith(array $tests = [], ?string $custom = null, array $imports = []): ProgramInput
{
    $expected = [];
    foreach ($tests as $position => $expression) {
        $expected[] = new ExpectedTest('t'.($position + 1), $expression, $position + 1);
    }

    return new ProgramInput('CODE', $expected, $custom, $imports, 'N0NCE');
}

it('ignores the imports section of a Rust template even when imports arrive', function () {
    $template = "{{code}}\n{{#imports}}\nuse {{name}};\n{{/imports}}\nend\n";

    $program = (new ProgramRenderer)->render(RunLanguage::Rust, $template, inputWith(imports: ['strings']));

    expect($program)->toBe("CODE\nend\n");
});

it('counts the custom test in {{count}}', function () {
    $template = "{{#tests}}\nx\n{{/tests}}\n{{count}}\n";

    $program = (new ProgramRenderer)->render(RunLanguage::Rust, $template, inputWith(['a', 'b'], ' c '));

    expect($program)->toBe("x\nx\nx\n3\n");
});

it('writes no output for a section tag', function () {
    $template = "a\n{{#tests}}\nb\n{{/tests}}\nc\n";

    $program = (new ProgramRenderer)->render(RunLanguage::Rust, $template, inputWith([]));

    expect($program)->toBe("a\nc\n");
});

it('leaves a placeholder the grammar does not define as text', function () {
    $program = (new ProgramRenderer)->render(RunLanguage::Rust, "{{code}} {{other}} {{name}}\n", inputWith());

    expect($program)->toBe("CODE {{other}} {{name}}\n");
});

it('fills the id and the expression of each test inside the tests section', function () {
    $template = "{{#tests}}\n{{id}}={{expression}}@{{nonce}}\n{{/tests}}\n";

    $program = (new ProgramRenderer)->render(RunLanguage::Rust, $template, inputWith(['1 == 1', '2 == 2']));

    expect($program)->toBe("t1=1 == 1@N0NCE\nt2=2 == 2@N0NCE\n");
});
