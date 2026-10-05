<?php

use App\Content\ContentMeta;
use App\Content\InvalidContent;
use App\Content\Portion;
use App\Content\Record\Catalog;
use App\Content\Record\ExerciseHashes;
use App\Content\Record\Language;
use App\Content\Record\StepKey;
use Tests\Support\ContentFixture;

function typedImageMeta(): ContentMeta
{
    return ContentMeta::fromDocument(ContentFixture::fromImage()->meta);
}

it('reads the portion hashes of the meta file', function () {
    $file = ContentFixture::fromImage()->meta;
    $meta = typedImageMeta();

    expect($meta->documentHash)->toBe($file['documentHash'])
        ->and($meta->portionHash(Portion::LabRust))->toBe($file['portions']['lab.rust'])
        ->and($meta->portionHashes)->toBe($file['portions'])
        ->and($meta->portionHashes)->toHaveCount(17);
});

it('reads the 274 exercise hashes of the meta file', function () {
    $file = ContentFixture::fromImage()->meta['exercises'];
    $exercises = typedImageMeta()->exerciseHashes;

    expect($exercises)->toHaveCount(274);
    foreach ($file as $id => $hashes) {
        expect($exercises[$id])->toEqual(new ExerciseHashes($hashes['contentHash'], $hashes['gradingHash'], $hashes['starterHash']));
    }
});

it('reads the step keys of the 25 workshops of the meta file', function () {
    $file = ContentFixture::fromImage()->meta['workshopSteps'];
    $workshops = typedImageMeta()->workshopSteps;

    expect($workshops)->toHaveCount(25);
    foreach ($file as $workshop => $keys) {
        $expected = [];
        foreach ($keys as $key) {
            $expected[] = new StepKey($key['id'], $key['v1Index']);
        }
        expect($workshops[$workshop])->toEqual($expected);
    }
});

it('reads the catalogs without a chain position and the languages', function () {
    $meta = typedImageMeta();

    expect(array_map(fn (Catalog $catalog) => $catalog->code, $meta->catalogs))->toBe(['lab', 'quests', 'cores'])
        ->and(array_map(fn (Catalog $catalog) => $catalog->chainPosition, $meta->catalogs))->toBe([null, null, null])
        ->and($meta->languages)->toBe(['rust', 'go'])
        ->and($meta->sourceCommit)->toBe(ContentFixture::fromImage()->meta['sourceCommit'] ?? null);
});

it('turns a language and a catalog into the rows of C2', function () {
    $meta = typedImageMeta();

    expect((new Language('rust', 1))->toRow())->toBe(['code' => 'rust', 'position' => 1])
        ->and($meta->catalogs[0]->toRow())->toBe(['code' => 'lab', 'slice_by' => 'language', 'chain_position' => null]);
});

it('reads a language back from its row', function () {
    expect(Language::fromRow(['code' => 'go', 'position' => '2']))->toEqual(new Language('go', 2));
});

it('rejects a meta that does not describe the content', function (Closure $break, string $message) {
    $meta = ContentFixture::fromImage()->meta;

    expect(fn () => ContentMeta::fromDocument($break($meta)))->toThrow(InvalidContent::class, $message);
})->with([
    'commit that is not a hash' => [fn (array $meta) => ['sourceCommit' => 'master'] + $meta, 'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit'],
    'abbreviated commit' => [fn (array $meta) => ['sourceCommit' => '0123456'] + $meta, 'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit'],
    'uppercase commit' => [fn (array $meta) => ['sourceCommit' => str_repeat('A', 40)] + $meta, 'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit'],
    'commit with a trailing newline' => [fn (array $meta) => ['sourceCommit' => str_repeat('a', 40)."\n"] + $meta, 'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit'],
    'no languages' => [fn (array $meta) => ['languages' => []] + $meta, 'curriculum.meta.json: languages: se esperaba la lista de lenguajes'],
    'a language that is not a text' => [fn (array $meta) => ['languages' => ['rust', 2]] + $meta, 'curriculum.meta.json: languages: se esperaba la lista de lenguajes'],
    'languages that are not a list' => [fn (array $meta) => ['languages' => ['a' => 'rust']] + $meta, 'curriculum.meta.json: languages: se esperaba la lista de lenguajes'],
    'no catalogs' => [fn (array $meta) => ['catalogs' => []] + $meta, 'curriculum.meta.json: catalogs: se esperaba la lista de catálogos'],
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
    'catalog chain position as text' => [
        function (array $meta) {
            $meta['catalogs'][2]['chainPosition'] = '1';

            return $meta;
        },
        'curriculum.meta.json: catalogs[2]: se esperaba {code, sliceBy, chainPosition}',
    ],
    'catalog that is not an object' => [
        function (array $meta) {
            $meta['catalogs'][0] = 'lab';

            return $meta;
        },
        'curriculum.meta.json: catalogs[0]: se esperaba {code, sliceBy, chainPosition}',
    ],
    'one portion fewer' => [
        function (array $meta) {
            unset($meta['portions']['guide']);

            return $meta;
        },
        'curriculum.meta.json: portions: se esperaban las 17 porciones, en el orden de la API',
    ],
    'portions in another order' => [
        fn (array $meta) => ['portions' => array_reverse($meta['portions'], true)] + $meta,
        'curriculum.meta.json: portions: se esperaban las 17 porciones, en el orden de la API',
    ],
    'invalid portion hash' => [
        function (array $meta) {
            $meta['portions']['lab.go'] = 'not-a-hash';

            return $meta;
        },
        'curriculum.meta.json: portions.lab.go: se esperaba un sha256 en hexadecimal',
    ],
    'exercises that are not an object' => [fn (array $meta) => ['exercises' => 'none'] + $meta, 'curriculum.meta.json: exercises: se esperaba un objeto con las huellas de cada ejercicio'],
    'invalid grading hash' => [
        function (array $meta) {
            $meta['exercises']['rust-01']['gradingHash'] = 'x';

            return $meta;
        },
        'curriculum.meta.json: exercises.rust-01.gradingHash: se esperaba un sha256 en hexadecimal',
    ],
    'hashes that are not an object' => [
        function (array $meta) {
            $meta['exercises']['rust-01'] = 'x';

            return $meta;
        },
        'curriculum.meta.json: exercises.rust-01.contentHash: se esperaba un sha256 en hexadecimal',
    ],
    'steps that are not an object' => [fn (array $meta) => ['workshopSteps' => 'none'] + $meta, 'curriculum.meta.json: workshopSteps: se esperaba un objeto con las claves de etapa de cada taller'],
    'steps that are not a list' => [
        function (array $meta) {
            $meta['workshopSteps']['cache'] = ['a' => ['id' => 'x', 'v1Index' => 0]];

            return $meta;
        },
        'curriculum.meta.json: workshopSteps.cache: se esperaba una lista de claves de etapa',
    ],
    'step without a key' => [
        function (array $meta) {
            $meta['workshopSteps']['cache'][0] = ['v1Index' => 0];

            return $meta;
        },
        'curriculum.meta.json: workshopSteps.cache[0]: se esperaba {id, v1Index}',
    ],
    'step with a negative v1 index' => [
        function (array $meta) {
            $meta['workshopSteps']['cache'][0]['v1Index'] = -1;

            return $meta;
        },
        'curriculum.meta.json: workshopSteps.cache[0]: se esperaba {id, v1Index}',
    ],
]);
