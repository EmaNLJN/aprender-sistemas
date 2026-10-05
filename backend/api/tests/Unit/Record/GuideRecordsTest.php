<?php

use App\Content\Codec\GuideCodec;
use App\Content\InvalidContent;
use App\Content\PublishedJson;
use App\Content\Record\Guide;
use App\Content\Record\GuideModule;
use App\Content\Record\GuideResource;
use App\Content\Record\GuideSource;
use App\Content\Record\GuideStep;
use App\Content\Record\GuideStepResource;
use App\Content\Record\GuideTrack;
use Tests\Support\ContentFixture;

const GUIDE_LANGUAGES = ['rust', 'go'];

const GUIDE_TABLES = ['guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'];

function guideDocument(): stdClass
{
    return ContentFixture::fromImage()->document->guide;
}

/**
 * @param  array<string, list<array<string, int|string|null>>>  $rows
 * @return array<string, list<array<string, int|string|null>>>
 */
function guideWithTextIntegers(array $rows): array
{
    $textual = [];
    foreach ($rows as $table => $tableRows) {
        $textual[$table] = [];
        foreach ($tableRows as $row) {
            $textual[$table][] = array_map(fn (int|string|null $value) => is_int($value) ? (string) $value : $value, $row);
        }
    }

    return $textual;
}

/**
 * @param  array<string, list<array<string, int|string|null>>>  $rows
 * @return array<string, list<array<string, int|string|null>>>
 */
function guideWithSortedColumns(array $rows): array
{
    $sorted = [];
    foreach ($rows as $table => $tableRows) {
        $sorted[$table] = [];
        foreach ($tableRows as $row) {
            ksort($row);
            $sorted[$table][] = $row;
        }
    }

    return $sorted;
}

/**
 * @param  array<string, list<array<string, int|string|null>>>  $rows
 * @param  list<string>  $languages
 */
function guideFromRows(array $rows, array $languages): Guide
{
    $resources = [];
    foreach ($rows['guide_resources'] as $row) {
        $resources[] = GuideResource::fromRow($row);
    }
    $sources = [];
    foreach ($rows['guide_sources'] as $row) {
        $sources[] = GuideSource::fromRow($row);
    }
    $tracks = [];
    foreach ($languages as $language) {
        $modules = [];
        foreach ($rows['guide_modules'] as $moduleRow) {
            if ($moduleRow['track_language'] !== $language) {
                continue;
            }
            $steps = [];
            foreach ($rows['guide_steps'] as $stepRow) {
                if ($stepRow['module_id'] !== $moduleRow['id']) {
                    continue;
                }
                $links = [];
                foreach ($rows['guide_step_resources'] as $linkRow) {
                    if ($linkRow['step_id'] === $stepRow['id']) {
                        $links[] = GuideStepResource::fromRow($linkRow);
                    }
                }
                $steps[] = GuideStep::fromRow($stepRow, $links);
            }
            $modules[] = GuideModule::fromRow($moduleRow, $steps);
        }
        foreach ($rows['guide_tracks'] as $trackRow) {
            if ($trackRow['language'] === $language) {
                $tracks[$language] = GuideTrack::fromRow($trackRow, $modules);
            }
        }
    }

    return new Guide($resources, $tracks, $sources);
}

it('round-trips the whole guide with the bytes of the document', function () {
    $document = guideDocument();

    $guide = Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide');
    $rebuilt = guideFromRows($guide->rowsByTable(), GUIDE_LANGUAGES);

    expect(PublishedJson::encode($guide->toPublished()))->toBe(PublishedJson::encode($document))
        ->and(PublishedJson::encode($rebuilt->toPublished()))->toBe(PublishedJson::encode($document));
});

it('round-trips the whole guide when the integers of the rows are text', function () {
    $document = guideDocument();

    $rows = guideWithTextIntegers(Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide')->rowsByTable());
    $rebuilt = guideFromRows($rows, GUIDE_LANGUAGES);

    expect(PublishedJson::encode($rebuilt->toPublished()))->toBe(PublishedJson::encode($document))
        ->and(guideWithSortedColumns($rebuilt->rowsByTable()))->toBe(guideWithSortedColumns(Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide')->rowsByTable()));
});

it('gives the six tables in the order and with the rows of C2', function () {
    $document = guideDocument();

    $rows = Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide')->rowsByTable();
    $c2Rows = (new GuideCodec)->toRows($document, GUIDE_LANGUAGES, 'guide');

    expect(array_keys($rows))->toBe(GUIDE_TABLES)
        ->and(guideWithSortedColumns($rows))->toBe(guideWithSortedColumns($c2Rows));
});

it('stores featured as 0 or 1 in the row and as a boolean in what it publishes', function () {
    $document = guideDocument();
    $document->resources[0]->featured = true;
    $document->resources[1]->featured = false;

    $guide = Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide');
    $rows = $guide->rowsByTable()['guide_resources'];
    $published = $guide->toPublished()->resources;

    expect($rows[0]['featured'])->toBe(1)
        ->and($rows[1]['featured'])->toBe(0)
        ->and($published[0]->featured)->toBeTrue()
        ->and($published[1]->featured)->toBeFalse()
        ->and(guideFromRows($guide->rowsByTable(), GUIDE_LANGUAGES)->resources[0]->featured)->toBeTrue();
});

it('publishes the resource IDs of a step in the order of position', function () {
    $document = guideDocument();
    $step = $document->tracks->rust->modules[0]->steps[0];
    $step->resourceIds = ['third', 'first', 'second'];

    $guide = Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide');
    $links = array_values(array_filter(
        $guide->rowsByTable()['guide_step_resources'],
        fn (array $row) => $row['step_id'] === $step->id,
    ));

    expect($links)->toBe([
        ['step_id' => $step->id, 'resource_id' => 'third', 'position' => 0],
        ['step_id' => $step->id, 'resource_id' => 'first', 'position' => 1],
        ['step_id' => $step->id, 'resource_id' => 'second', 'position' => 2],
    ])
        ->and($guide->tracks['rust']->modules[0]->steps[0]->toPublished()->resourceIds)->toBe(['third', 'first', 'second']);
});

it('publishes resources, tracks and sources in that fixed order', function () {
    $published = Guide::fromDocument(guideDocument(), GUIDE_LANGUAGES, 'guide')->toPublished();

    expect(array_keys(get_object_vars($published)))->toBe(['resources', 'tracks', 'sources'])
        ->and(array_keys(get_object_vars($published->tracks)))->toBe(GUIDE_LANGUAGES);
});

it('rejects a featured that is not true or false', function () {
    $document = guideDocument();
    $document->resources[0]->featured = 'yes';

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.resources[0].featured: se esperaba true o false');
});

it('rejects the root keys in another order', function () {
    $document = guideDocument();
    $reordered = (object) ['tracks' => $document->tracks, 'resources' => $document->resources, 'sources' => $document->sources];

    expect(fn () => Guide::fromDocument($reordered, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide: las claves de la guía tienen que ser resources, tracks y sources, en ese orden');
});

it('rejects the tracks in another order', function () {
    $document = guideDocument();
    $document->tracks = (object) ['go' => $document->tracks->go, 'rust' => $document->tracks->rust];

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.tracks: un recorrido por lenguaje, en el orden de languages: rust, go');
});

it('rejects an empty resource list', function () {
    $document = guideDocument();
    $document->resources = [];

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.resources: se esperaba una lista no vacía');
});

it('rejects a source that is not an object', function () {
    $document = guideDocument();
    $document->sources[0] = 'text';

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.sources[0]: se esperaba un objeto');
});

it('rejects a track that is not an object', function () {
    $document = guideDocument();
    $document->tracks->go = 'text';

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.tracks.go: se esperaba un objeto');
});

it('rejects an empty module list', function () {
    $document = guideDocument();
    $document->tracks->rust->modules = [];

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.tracks.rust.modules: se esperaba una lista no vacía');
});

it('rejects an unknown key in a step', function () {
    $document = guideDocument();
    $document->tracks->rust->modules[0]->steps[0]->foo = 'x';

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.tracks.rust.modules[0].steps[0].foo: clave desconocida');
});

it('rejects an empty resourceIds', function () {
    $document = guideDocument();
    $document->tracks->rust->modules[0]->steps[0]->resourceIds = [];

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, 'curriculum.json: guide.tracks.rust.modules[0].steps[0].resourceIds: se esperaba una lista de recursos');
});

it('rejects a resourceIds element that is not text', function (mixed $element, string $shown) {
    $document = guideDocument();
    $step = $document->tracks->rust->modules[0]->steps[0];
    $step->resourceIds = [$element];

    expect(fn () => Guide::fromDocument($document, GUIDE_LANGUAGES, 'guide'))
        ->toThrow(InvalidContent::class, "curriculum.json: guide.steps.{$step->id}.resourceIds: «{$shown}» no es un recurso de guide.resources");
})->with([
    'integer' => [5, '5'],
    'null' => [null, 'null'],
    'list' => [['a'], '["a"]'],
]);
