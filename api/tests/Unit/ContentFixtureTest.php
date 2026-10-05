<?php

use App\Content\ContentSource;
use App\Content\Portion;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

// Ata PublishedJson y el JSON canónico de la copia al generador (tools/content/meta.ts): con el
// contenido sin tocar, el meta que recalcula PHP tiene que ser el que escribió Node.
it('reproduce el meta del generador cuando el contenido no cambia', function () {
    $fixture = ContentFixture::fromImage();
    $original = $fixture->meta;

    $meta = $fixture->recomputedMeta($fixture->documentText());

    expect($meta['portions'])->toBe($original['portions'])
        ->and($meta['exercises'])->toBe($original['exercises'])
        ->and($meta['documentHash'])->toBe($original['documentHash']);
});

it('escribe un par que ContentSource acepta', function () {
    $fixture = ContentFixture::fromImage();
    $fixture->document->guide->sources[0]->note = 'Nota nueva';

    $source = ContentSource::fromDirectory($fixture->write());

    expect($source->part(Portion::Guide)->sources[0]->note)->toBe('Nota nueva');
});

// Las huellas sin tocar son las del generador (el primer test); acá, que editar un ejercicio mueve
// las suyas y las de su porción, y sólo esas.
it('recalcula las huellas de lo que se edita y sólo de eso', function () {
    $fixture = ContentFixture::fromImage();
    $original = $fixture->meta;
    $fixture->exercise('rust-01')->title = 'Otro título';

    $meta = ContentSource::fromDirectory($fixture->write())->meta;

    expect($meta['exercises']['rust-01']['contentHash'])->not->toBe($original['exercises']['rust-01']['contentHash'])
        ->and($meta['exercises']['rust-01']['gradingHash'])->toBe($original['exercises']['rust-01']['gradingHash'])
        ->and($meta['exercises']['rust-01']['starterHash'])->toBe($original['exercises']['rust-01']['starterHash'])
        ->and($meta['exercises']['rust-02'])->toBe($original['exercises']['rust-02'])
        ->and($meta['portions']['lab.rust'])->not->toBe($original['portions']['lab.rust'])
        ->and($meta['portions']['lab.go'])->toBe($original['portions']['lab.go'])
        ->and($meta['documentHash'])->not->toBe($original['documentHash']);
});

it('avisa cuando el ejercicio que se pide no está en el contenido', function () {
    ContentFixture::fromImage()->exercise('no-existe');
})->throws(LogicException::class, 'no-existe no está en el contenido');

it('saca un ejercicio del documento y del meta, y el par sigue siendo válido', function () {
    $fixture = ContentFixture::fromImage();
    $id = $fixture->unreferencedLabExercise();

    $source = ContentSource::fromDirectory($fixture->withoutExercise($id)->write());

    expect($source->meta['exercises'])->toHaveCount(273)->not->toHaveKey($id)
        ->and(array_column($source->part(Portion::LabRust), 'id'))->toHaveCount(99)->not->toContain($id);
});

it('escribe el documento compacto cuando se pide sin sangría', function () {
    $directory = ContentFixture::fromImage()->write(indent: null);

    // Un solo salto de línea: el del final. Los de los textos salen escapados.
    expect(substr_count(file_get_contents("{$directory}/curriculum.json"), "\n"))->toBe(1)
        ->and(ContentSource::fromDirectory($directory)->languages())->toBe(['rust', 'go']);
});
