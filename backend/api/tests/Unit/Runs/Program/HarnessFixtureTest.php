<?php

use App\Runs\Program\ExpectedTest;
use App\Runs\Program\ProgramInput;
use App\Runs\Program\ProgramRenderer;
use App\Runs\RunLanguage;

/** @return array{nonce: string, cases: list<array<string, mixed>>} */
function harnessFixture(): array
{
    $path = dirname(__DIR__, 3).'/Fixtures/shared/harness-cases.json';

    return json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
}

/** @return array<string, string> */
function harnessTemplates(): array
{
    $path = dirname(__DIR__, 4).'/resources/content/harness.json';

    return json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
}

it('renders every case of the shared fixture to exactly its expected program (SC-009)', function () {
    $fixture = harnessFixture();
    $templates = harnessTemplates();
    $renderer = new ProgramRenderer;
    $differences = [];

    foreach ($fixture['cases'] as $case) {
        $tests = [];
        foreach ($case['tests'] as $position => $test) {
            $tests[] = new ExpectedTest($test['id'], $test['expression'], $position + 1);
        }
        $language = RunLanguage::from($case['language']);
        $input = new ProgramInput($case['code'], $tests, $case['customTest'] ?? null, $case['imports'] ?? [], $fixture['nonce']);

        $rendered = $renderer->render($language, $templates[$case['language']], $input);

        if ($rendered !== implode("\n", $case['program'])."\n") {
            $differences[] = $case['name'];
        }
    }

    expect($differences)->toBe([]);
});

it('keeps the fixture broad enough to mean something', function () {
    $fixture = harnessFixture();
    $cases = collect($fixture['cases']);

    expect($fixture['nonce'])->toMatch('/\A[0-9a-f]{32}\z/')
        ->and($cases->count())->toBeGreaterThanOrEqual(8)
        ->and($cases->pluck('language')->unique()->sort()->values()->all())->toBe(['go', 'rust'])
        ->and($cases->contains(fn (array $case) => ($case['customTest'] ?? '') !== ''))->toBeTrue()
        ->and($cases->contains(fn (array $case) => ($case['customTest'] ?? '') === ''))->toBeTrue()
        ->and($cases->contains(fn (array $case) => $case['language'] === 'go' && ($case['imports'] ?? []) !== []))->toBeTrue()
        ->and($cases->contains(fn (array $case) => $case['language'] === 'go' && ($case['imports'] ?? []) === []))->toBeTrue();
});
