<?php

use App\Audit\AuditCatalogReader;
use App\Audit\AuditPlan;
use App\Audit\AuditProgram;
use App\Audit\AuditRefused;
use App\Audit\AuditSelection;
use App\Audit\ProgramRole;
use App\Runs\Admission\ExerciseReader;
use App\Runs\Program\ProgramComposer;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuditWorld;

it('runs each active exercise twice, solution then starter, alone and without a custom test (FR-002)', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));
    $plain = array_slice($programs, 0, 8);

    expect(array_map(fn (AuditProgram $program) => $program->exercise->id().':'.$program->role->value, $plain))->toBe([
        'rust-01:solution', 'rust-01:starter', 'rust-02:solution', 'rust-02:starter',
        'go-01:solution', 'go-01:starter', 'go-02:solution', 'go-02:starter',
    ]);
    foreach ($plain as $program) {
        expect($program->customTest)->toBeNull()
            ->and($program->composed->hasCustomTest)->toBeFalse()
            ->and($program->composed->expectedTests)->toBe(['t1', 't2', 't3']);
    }
});

it('adds the custom test sample: per language, one expression that passes and one that fails (Q5, FR-034)', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));
    $sample = array_slice($programs, 8);

    expect(array_map(fn (AuditProgram $program) => [$program->exercise->id(), $program->role, $program->customTest?->expression, $program->customTest?->expected], $sample))->toBe([
        ['rust-01', ProgramRole::Solution, 'energia(5) == 35', TestOutcome::Pass],
        ['rust-01', ProgramRole::Solution, 'energia(5) == 36', TestOutcome::Fail],
        ['go-01', ProgramRole::Solution, 'Bytes(2) == 2048', TestOutcome::Pass],
        ['go-01', ProgramRole::Solution, 'Bytes(2) == 2049', TestOutcome::Fail],
    ]);
    foreach ($sample as $program) {
        expect($program->composed->hasCustomTest)->toBeTrue()
            ->and($program->composed->expectedTests)->toBe(['t1', 't2', 't3']);
    }
});

it('composes the same program that B2 would compose with that code and that nonce (FR-003)', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));

    foreach ($programs as $program) {
        $b2 = app(ProgramComposer::class)->compose(
            app(ExerciseReader::class)->forRun($program->exercise->id()) ?? throw new LogicException('missing'),
            $program->exercise->code($program->role),
            $program->customTest?->expression,
            $program->composed->nonce,
        );
        expect($program->composed->text)->toBe($b2->text);
    }
});

it('gives each program a fresh 128-bit nonce', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));
    $nonces = array_map(fn (AuditProgram $program) => $program->composed->nonce, $programs);

    expect(array_unique($nonces))->toHaveCount(count($programs));
    foreach ($nonces as $nonce) {
        expect($nonce)->toMatch('/\A[0-9a-f]{32}\z/');
    }
});

it('fingerprints each program with the zero nonce, so two runs agree', function () {
    AuditWorld::curriculum();
    $catalog = app(AuditCatalogReader::class)->read();

    $first = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions(null, []));
    $second = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions(null, []));
    $zero = app(ProgramComposer::class)->compose($first[0]->exercise->snapshot, $first[0]->exercise->solution, null, '00000000000000000000000000000000');

    expect(array_map(fn (AuditProgram $program) => $program->fingerprint, $first))->toBe(array_map(fn (AuditProgram $program) => $program->fingerprint, $second))
        ->and($first[0]->fingerprint)->toBe(hash('sha256', $zero->text))
        ->and($first[0]->fingerprint)->not->toBe(hash('sha256', $first[0]->composed->text))
        ->and($first[0]->fingerprint)->not->toBe($first[1]->fingerprint)
        ->and($first[8]->fingerprint)->not->toBe($first[9]->fingerprint)
        ->and($first[8]->fingerprint)->not->toBe($first[0]->fingerprint);
});

it('changes the fingerprint of the solution program with a test, the solution or the template, and not with a title (SC-004)', function (string $change, bool $changes) {
    AuditWorld::curriculum();
    $before = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions('rust', ['rust-01']))[0]->fingerprint;

    match ($change) {
        'expression' => DB::table('exercise_tests')->where('exercise_id', 'rust-01')->where('test_key', 't1')->update(['expression' => 'false']),
        'solution' => DB::table('exercises')->where('id', 'rust-01')->update(['solution' => "fn other() {}\n"]),
        'template' => DB::table('harness_templates')->where('language', 'rust')->update(['template' => "// otra plantilla\n".DB::table('harness_templates')->where('language', 'rust')->value('template')]),
        'title' => DB::table('exercises')->where('id', 'rust-01')->update(['title' => 'Otro título']),
    };
    $after = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions('rust', ['rust-01']))[0]->fingerprint;

    expect($after !== $before)->toBe($changes);
})->with([
    'a test expression' => ['expression', true],
    'the solution' => ['solution', true],
    'the template' => ['template', true],
    'only a title' => ['title', false],
]);

it('runs only the chosen language with its sample, or only the chosen exercises without a sample, as a partial run (FR-015)', function () {
    AuditWorld::curriculum();
    $catalog = app(AuditCatalogReader::class)->read();

    $go = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions('go', []));
    $one = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions(null, ['rust-02', 'rust-02']));

    expect(array_map(fn (AuditProgram $program) => $program->exercise->id(), $go))->toBe(['go-01', 'go-01', 'go-02', 'go-02', 'go-01', 'go-01'])
        ->and(array_map(fn (AuditProgram $program) => $program->exercise->id(), $one))->toBe(['rust-02', 'rust-02'])
        ->and(AuditSelection::fromOptions('go', [])->isFull())->toBeFalse()
        ->and(AuditSelection::fromOptions(null, ['rust-02'])->isFull())->toBeFalse()
        ->and(AuditSelection::fromOptions(null, [])->isFull())->toBeTrue()
        ->and(array_map(fn (AuditProgram $program) => $program->role, $go))->toBe([ProgramRole::Solution, ProgramRole::Starter, ProgramRole::Solution, ProgramRole::Starter, ProgramRole::Solution, ProgramRole::Solution])
        ->and(AuditSelection::fromOptions(null, [])->languageNames())->toBe('rust y go')
        ->and(AuditSelection::fromOptions('go', [])->languageNames())->toBe('go');
});

it('refuses an unknown language, an inactive exercise and an exercise of another language (FR-013)', function (?string $language, array $exercises, string $message) {
    AuditWorld::curriculum();

    expect(fn () => AuditSelection::fromOptions($language, $exercises)->requireKnown(app(AuditCatalogReader::class)->read()))
        ->toThrow(AuditRefused::class, $message);
})->with([
    'an unknown language' => ['kotlin', [], '--language admite rust o go y llegó «kotlin».'],
    'a retired exercise' => [null, ['rust-03'], 'rust-03 no es un ejercicio activo de rust y go.'],
    'another language' => ['go', ['rust-01'], 'rust-01 no es un ejercicio activo de go.'],
]);

it('refuses when the sample exercise is not active', function () {
    AuditWorld::curriculum();
    config(['audit.custom_test_sample.rust.exercise' => 'rust-03']);

    expect(fn () => app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, [])))
        ->toThrow(AuditRefused::class, 'La muestra de la prueba propia necesita rust-03, que no es un ejercicio activo: actualizá audit.custom_test_sample.');
});

it('refuses a sample exercise that belongs to another language', function () {
    AuditWorld::curriculum();
    config(['audit.custom_test_sample.rust.exercise' => 'go-01']);

    expect(fn () => app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, [])))
        ->toThrow(AuditRefused::class, 'La muestra de la prueba propia necesita go-01, que no es un ejercicio activo: actualizá audit.custom_test_sample.');
});

it('drops repeated exercise ids from the selection', function () {
    expect(AuditSelection::fromOptions(null, ['rust-02', 'go-01', 'rust-02'])->exercises)->toBe(['rust-02', 'go-01']);
});
