<?php

use App\Content\ContentSource;
use App\Content\InvalidContent;
use Closure;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

it('reads the document and its meta from the image', function () {
    $source = ContentSource::fromDirectory(ContentFixture::imagePath());

    expect($source->document)->toBe(file_get_contents(ContentFixture::imagePath().'/curriculum.json'))
        ->and($source->documentHash())->toBe(hash('sha256', $source->document))
        ->and($source->languages())->toBe(['rust', 'go'])
        ->and($source->meta['portions'])->toHaveCount(17)
        ->and($source->meta['exercises'])->toHaveCount(274)
        ->and($source->meta['workshopSteps'])->toHaveCount(25);
});

it('rejects a meta from another build', function () {
    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", file_get_contents("{$directory}/curriculum.json").' ');

    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json no corresponde a este curriculum.json');
});

it('names the file that is missing or is not JSON', function () {
    $directory = ContentFixture::fromImage()->write();
    unlink("{$directory}/curriculum.meta.json");
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, "curriculum.meta.json: no existe en {$directory}");

    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", '{"lab": ');
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.json: no es JSON válido');
});

it('requires the document and the meta to be objects', function () {
    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", '[]');
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.json: (raíz): se esperaba un objeto');

    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.meta.json", '"text"');
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: (raíz): se esperaba un objeto');
});

// FR-037: the source commit is null or the full hash (40 or 64 lowercase hexadecimal characters).
it('returns the source commit as is when it is null or a full hash', function (?string $commit) {
    $directory = ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => $commit] + $meta);

    expect(ContentSource::fromDirectory($directory)->sourceCommit())->toBe($commit);
})->with([
    'no commit' => [null],
    '40 characters' => [str_repeat('a', 40)],
    '64 characters' => [str_repeat('0123456789abcdef', 4)],
]);

it('rejects a source commit that is not the full hash', function (string $commit) {
    $directory = ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => $commit] + $meta);

    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit');
})->with([
    'abbreviated' => ['0123456'],
    '39 characters' => [str_repeat('a', 39)],
    '41 characters' => [str_repeat('a', 41)],
    'uppercase' => [str_repeat('A', 40)],
    'with a trailing newline' => [str_repeat('a', 40)."\n"],
]);

it('validates the meta and names the field', function (Closure $break, string $message) {
    $directory = ContentFixture::fromImage()->write(editMeta: $break);

    expect(fn () => ContentSource::fromDirectory($directory))->toThrow(InvalidContent::class, $message);
})->with([
    'commit that is not a hash' => [
        fn (array $meta) => ['sourceCommit' => 'master'] + $meta,
        'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit',
    ],
    'no languages' => [
        fn (array $meta) => ['languages' => []] + $meta,
        'curriculum.meta.json: languages: se esperaba la lista de lenguajes',
    ],
    'a language that is not a text' => [
        fn (array $meta) => ['languages' => ['rust', 2]] + $meta,
        'curriculum.meta.json: languages: se esperaba la lista de lenguajes',
    ],
    'catalog without the slice parameter' => [
        function (array $meta) {
            unset($meta['catalogs'][1]['sliceBy']);

            return $meta;
        },
        'curriculum.meta.json: catalogs[1]: se esperaba {code, sliceBy, chainPosition}',
    ],
    'catalog chain position below 1' => [
        function (array $meta) {
            $meta['catalogs'][0]['chainPosition'] = 0;

            return $meta;
        },
        'curriculum.meta.json: catalogs[0]: se esperaba {code, sliceBy, chainPosition}',
    ],
    'one portion fewer' => [
        function (array $meta) {
            unset($meta['portions']['guide']);

            return $meta;
        },
        'curriculum.meta.json: portions: se esperaban las 17 porciones',
    ],
    'invalid portion hash' => [
        function (array $meta) {
            $meta['portions']['lab.go'] = 'not-a-hash';

            return $meta;
        },
        'curriculum.meta.json: portions.lab.go: se esperaba un sha256 en hexadecimal',
    ],
    'invalid exercise hash' => [
        function (array $meta) {
            $meta['exercises']['rust-01']['gradingHash'] = 'x';

            return $meta;
        },
        'curriculum.meta.json: exercises.rust-01.gradingHash: se esperaba un sha256 en hexadecimal',
    ],
    'step without a key' => [
        function (array $meta) {
            $meta['workshopSteps']['cache'][0] = ['v1Index' => 0];

            return $meta;
        },
        'curriculum.meta.json: workshopSteps.cache[0]: se esperaba {id, v1Index}',
    ],
]);
