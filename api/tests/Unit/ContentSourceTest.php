<?php

use App\Content\ContentSource;
use App\Content\InvalidContent;
use Closure;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

it('lee el documento y su meta de la imagen', function () {
    $source = ContentSource::fromDirectory(ContentFixture::imagePath());

    expect($source->document)->toBe(file_get_contents(ContentFixture::imagePath().'/curriculum.json'))
        ->and($source->documentHash())->toBe(hash('sha256', $source->document))
        ->and($source->languages())->toBe(['rust', 'go'])
        ->and($source->meta['portions'])->toHaveCount(17)
        ->and($source->meta['exercises'])->toHaveCount(274)
        ->and($source->meta['workshopSteps'])->toHaveCount(25);
});

it('rechaza un meta de otro build', function () {
    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", file_get_contents("{$directory}/curriculum.json").' ');

    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json no corresponde a este curriculum.json');
});

it('nombra el archivo que falta o que no es JSON', function () {
    $directory = ContentFixture::fromImage()->write();
    unlink("{$directory}/curriculum.meta.json");
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, "curriculum.meta.json: no existe en {$directory}");

    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", '{"lab": ');
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.json: no es JSON válido');
});

it('exige que el documento y el meta sean objetos', function () {
    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", '[]');
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.json: (raíz): se esperaba un objeto');

    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.meta.json", '"texto"');
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: (raíz): se esperaba un objeto');
});

// FR-037: el commit de origen es null o el hash completo (40 o 64 hexadecimales en minúsculas).
it('devuelve el commit de origen tal cual cuando es null o un hash completo', function (?string $commit) {
    $directory = ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => $commit] + $meta);

    expect(ContentSource::fromDirectory($directory)->sourceCommit())->toBe($commit);
})->with([
    'sin commit' => [null],
    'de 40 caracteres' => [str_repeat('a', 40)],
    'de 64 caracteres' => [str_repeat('0123456789abcdef', 4)],
]);

it('rechaza un commit de origen que no es el hash completo', function (string $commit) {
    $directory = ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => $commit] + $meta);

    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit');
})->with([
    'abreviado' => ['0123456'],
    'de 39 caracteres' => [str_repeat('a', 39)],
    'de 41 caracteres' => [str_repeat('a', 41)],
    'en mayúsculas' => [str_repeat('A', 40)],
    'con un salto de línea al final' => [str_repeat('a', 40)."\n"],
]);

it('valida el meta y nombra el campo', function (Closure $break, string $message) {
    $directory = ContentFixture::fromImage()->write(editMeta: $break);

    expect(fn () => ContentSource::fromDirectory($directory))->toThrow(InvalidContent::class, $message);
})->with([
    'commit que no es un hash' => [
        fn (array $meta) => ['sourceCommit' => 'master'] + $meta,
        'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit',
    ],
    'sin lenguajes' => [
        fn (array $meta) => ['languages' => []] + $meta,
        'curriculum.meta.json: languages: se esperaba la lista de lenguajes',
    ],
    'catálogo sin el parámetro de corte' => [
        function (array $meta) {
            unset($meta['catalogs'][1]['sliceBy']);

            return $meta;
        },
        'curriculum.meta.json: catalogs[1]: se esperaba {code, sliceBy, chainPosition}',
    ],
    'posición de la cadena de catálogos menor que 1' => [
        function (array $meta) {
            $meta['catalogs'][0]['chainPosition'] = 0;

            return $meta;
        },
        'curriculum.meta.json: catalogs[0]: se esperaba {code, sliceBy, chainPosition}',
    ],
    'una porción menos' => [
        function (array $meta) {
            unset($meta['portions']['guide']);

            return $meta;
        },
        'curriculum.meta.json: portions: se esperaban las 17 porciones',
    ],
    'huella de porción inválida' => [
        function (array $meta) {
            $meta['portions']['lab.go'] = 'no-es-un-hash';

            return $meta;
        },
        'curriculum.meta.json: portions.lab.go: se esperaba un sha256 en hexadecimal',
    ],
    'huella de ejercicio inválida' => [
        function (array $meta) {
            $meta['exercises']['rust-01']['gradingHash'] = 'x';

            return $meta;
        },
        'curriculum.meta.json: exercises.rust-01.gradingHash: se esperaba un sha256 en hexadecimal',
    ],
    'etapa sin clave' => [
        function (array $meta) {
            $meta['workshopSteps']['cache'][0] = ['v1Index' => 0];

            return $meta;
        },
        'curriculum.meta.json: workshopSteps.cache[0]: se esperaba {id, v1Index}',
    ],
]);
