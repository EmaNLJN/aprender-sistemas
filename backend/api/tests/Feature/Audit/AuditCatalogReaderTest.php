<?php

use App\Audit\AuditCatalogReader;
use App\Audit\AuditedExercise;
use App\Audit\AuditRefused;
use App\Audit\ExerciseKind;
use App\Runs\Admission\ExerciseReader;
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

    $catalog = app(AuditCatalogReader::class)->read();

    expect($catalog->documentHash)->toBe(AuditWorld::imageDocumentHash())
        ->and($catalog->harnessHash)->toBe(AuditWorld::HARNESS_HASH)
        ->and($catalog->sourceCommit)->toBeNull();
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

    expect(fn () => app(AuditCatalogReader::class)->read())->toThrow(AuditRefused::class, 'El contenido importado (bbbbbbbbbbbb) no es el de esta imagen');
});

it('writes nothing while it reads (FR-012)', function () {
    AuditWorld::curriculum();

    expect(ContentDatabase::contentWritesDuring(fn () => app(AuditCatalogReader::class)->read()))->toBe([]);
});
