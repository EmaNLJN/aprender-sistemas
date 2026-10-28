<?php

use App\Audit\AuditCatalogReader;
use App\Audit\AuditedExercise;
use App\Audit\AuditRefused;
use App\Audit\ExerciseKind;
use App\Runs\Admission\ExerciseReader;
use App\Runs\Program\ExpectedTest;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuditWorld;
use Tests\Support\ContentDatabase;

it('reads the active exercises of both languages in order, with their codes, kind, section and labels', function () {
    AuditWorld::curriculum();

    $catalog = app(AuditCatalogReader::class)->read();

    expect(array_map(fn (AuditedExercise $exercise) => $exercise->id(), $catalog->exercises))->toBe(AuditWorld::ACTIVE)
        ->and($catalog->find('rust-02')?->kind)->toBe(ExerciseKind::Repair)
        ->and($catalog->find('rust-01')?->kind)->toBe(ExerciseKind::Complete)
        ->and($catalog->find('go-02')?->section)->toBe('quests')
        ->and($catalog->find('go-01')?->section)->toBe('lab')
        ->and($catalog->find('rust-01')?->solution)->toBe("fn solution_rust_01() {}\n")
        ->and($catalog->find('rust-01')?->starter)->toBe("fn starter_rust_01() {}\n")
        ->and($catalog->find('rust-01')?->starterHash)->toBe(hash('sha256', 'rust-01'))
        ->and($catalog->find('rust-01')?->testLabels)->toBe(['Prueba t1', 'Prueba t2', 'Prueba t3'])
        ->and($catalog->find('rust-03'))->toBeNull();
});

it('builds for each exercise the same ExerciseSnapshot that B2 reads to run it (FR-003)', function (string $id) {
    AuditWorld::curriculum();

    $catalog = app(AuditCatalogReader::class)->read();

    expect($catalog->find($id)?->snapshot)->toEqual(app(ExerciseReader::class)->forRun($id));
})->with(AuditWorld::ACTIVE);

it('stamps the document hash, the harness hash and the source commit of the latest import (FR-020)', function () {
    AuditWorld::curriculum();
    DB::table('content_imports')->update(['source_commit' => str_repeat('ab12', 10)]);

    $catalog = app(AuditCatalogReader::class)->read();

    expect($catalog->documentHash)->toBe(AuditWorld::imageDocumentHash())
        ->and($catalog->harnessHash)->toBe(AuditWorld::imageHarnessHash())
        ->and($catalog->sourceCommit)->toBe(str_repeat('ab12', 10));
});

it('keeps a test key made of digits as text', function () {
    AuditWorld::curriculum([['key' => '123', 'expression' => 'true']]);

    $catalog = app(AuditCatalogReader::class)->read();

    expect($catalog->find('rust-01')?->snapshot->tests[0]->key)->toBe('123')
        ->and($catalog->find('rust-01')?->labelOf('123'))->toBe('Prueba 123');
});

it('refuses when nothing was imported (FR-013)', function () {
    expect(fn () => app(AuditCatalogReader::class)->read())
        ->toThrow(AuditRefused::class, 'No hay contenido importado: levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.');
});

it('refuses when the imported content is not the content of the image (R3)', function () {
    AuditWorld::curriculum();
    DB::table('content_imports')->update(['document_hash' => str_repeat('b', 64)]);

    expect(fn () => app(AuditCatalogReader::class)->read())->toThrow(
        AuditRefused::class,
        'El contenido importado (bbbbbbbbbbbb) no es el de esta imagen ('.substr(AuditWorld::imageDocumentHash(), 0, 12).'): levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.',
    );
});

it('refuses when the imported harness is not the harness of the image (R3)', function () {
    AuditWorld::curriculum();
    DB::table('content_imports')->update(['portion_hashes' => json_encode(['harness' => str_repeat('d', 64)], JSON_THROW_ON_ERROR)]);

    expect(fn () => app(AuditCatalogReader::class)->read())->toThrow(
        AuditRefused::class,
        'La plantilla importada (dddddddddddd) no es la de esta imagen ('.substr(AuditWorld::imageHarnessHash(), 0, 12).'): reimportá el contenido levantando el stack con «docker compose up --build -d --wait» y volvé a auditar.',
    );
});

it('orders the exercises by language, catalog, domain, position and id', function () {
    AuditWorld::curriculum();
    DB::table('exercises')->whereIn('id', ['rust-01', 'go-01'])->update(['position' => 2]);

    $catalog = app(AuditCatalogReader::class)->read();

    expect(array_map(fn (AuditedExercise $exercise) => $exercise->id(), $catalog->exercises))->toBe(['rust-02', 'rust-01', 'go-01', 'go-02']);
});

it('reads tests in position order, leaves out the retired ones and keeps the starter hash apart from the grading hash', function () {
    AuditWorld::curriculum([['key' => 'b', 'expression' => 'x == 1'], ['key' => 'a', 'expression' => 'y == 2'], ['key' => 'c', 'expression' => 'z == 3']]);
    DB::table('exercise_tests')->where('test_key', 'c')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);
    DB::table('exercises')->where('id', 'rust-01')->update(['starter_hash' => str_repeat('e', 64)]);

    $exercise = app(AuditCatalogReader::class)->read()->find('rust-01');

    expect($exercise?->snapshot)->toEqual(app(ExerciseReader::class)->forRun('rust-01'))
        ->and(array_map(fn (ExpectedTest $test) => $test->key, $exercise?->snapshot->tests ?? []))->toBe(['b', 'a'])
        ->and($exercise->testLabels)->toBe(['Prueba b', 'Prueba a'])
        ->and($exercise->starterHash)->toBe(str_repeat('e', 64))
        ->and($exercise->snapshot->gradingHash)->toBe(hash('sha256', 'rust-01'));
});

it('only selects while it reads (FR-012)', function () {
    AuditWorld::curriculum();

    $queries = ContentDatabase::queriesDuring(fn () => app(AuditCatalogReader::class)->read());

    expect($queries)->not->toBe([])
        ->and(array_values(array_filter($queries, fn (string $sql) => preg_match('/^\s*select\b/i', $sql) !== 1)))->toBe([])
        ->and(ContentDatabase::contentWritesDuring(fn () => app(AuditCatalogReader::class)->read()))->toBe([]);
});
