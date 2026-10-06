<?php

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use App\Content\Record\AtlasConcept;
use Tests\Support\ContentFixture;

function atlasConceptsOf(string $language): array
{
    return ContentFixture::fromImage()->document->atlas->{$language};
}

function stringifiedRow(array $row): array
{
    return array_map(fn (int|string|null $value) => is_int($value) ? (string) $value : $value, $row);
}

it('round-trips the 32 concepts of the image through the row to the published bytes', function () {
    $count = 0;
    foreach (['rust', 'go'] as $language) {
        foreach (atlasConceptsOf($language) as $position => $concept) {
            $row = AtlasConcept::fromDocument($concept, $language, $position, "atlas.{$language}[{$position}]")->toRow();

            expect(PublishedJson::encode(AtlasConcept::fromRow($row)->toPublished()))->toBe(PublishedJson::encode($concept));
            $count++;
        }
    }

    expect($count)->toBe(32);
});

it('reads the integers of a row that arrive as text', function () {
    $concept = atlasConceptsOf('go')[1];
    $row = AtlasConcept::fromDocument($concept, 'go', 1, 'atlas.go[1]')->toRow();

    $published = AtlasConcept::fromRow(stringifiedRow($row))->toPublished();

    expect(PublishedJson::encode($published))->toBe(PublishedJson::encode($concept))
        ->and(AtlasConcept::fromRow(stringifiedRow($row))->position)->toBe(1);
});

it('puts the language, the position and the key order in the row', function () {
    $concept = atlasConceptsOf('rust')[0];

    $row = AtlasConcept::fromDocument($concept, 'rust', 0, 'atlas.rust[0]')->toRow();

    expect($row['id'])->toBe($concept->id)
        ->and($row['lab_exercise_id'])->toBe($concept->labId)
        ->and($row['language'])->toBe('rust')
        ->and($row['position'])->toBe(0)
        ->and($row['key_order'])->toBe(PublishedJson::encode(array_keys(get_object_vars($concept))));
});

it('leaves furtherSources empty and unpublished in the 30 concepts that lack it', function () {
    $without = 0;
    foreach (['rust', 'go'] as $language) {
        foreach (atlasConceptsOf($language) as $position => $concept) {
            if (property_exists($concept, 'furtherSources')) {
                continue;
            }
            $record = AtlasConcept::fromDocument($concept, $language, $position, "atlas.{$language}[{$position}]");

            expect($record->toRow()['further_sources_json'])->toBeNull()
                ->and(property_exists($record->toPublished(), 'furtherSources'))->toBeFalse();
            $without++;
        }
    }

    expect($without)->toBe(30);
});

it('keeps furtherSources when the concept has it', function () {
    $concept = atlasConceptsOf('rust')[0];
    $concept->furtherSources = [];

    $record = AtlasConcept::fromDocument($concept, 'rust', 0, 'atlas.rust[0]');

    expect($record->toRow()['further_sources_json'])->toBe('[]')
        ->and(AtlasConcept::fromRow($record->toRow())->toPublished()->furtherSources)->toBe([]);
});

it('accepts a null furtherSources', function () {
    $concept = atlasConceptsOf('rust')[0];
    $concept->furtherSources = null;

    $row = AtlasConcept::fromDocument($concept, 'rust', 0, 'atlas.rust[0]')->toRow();

    expect($row['further_sources_json'])->toBe('null');
});

it('rejects a concept that breaks a rule and names the field', function (Closure $break, string $message) {
    $concept = atlasConceptsOf('rust')[0];
    $break($concept);

    expect(fn () => AtlasConcept::fromDocument($concept, 'rust', 0, 'atlas.rust[0]'))
        ->toThrow(InvalidContent::class, $message);
})->with([
    'an empty title' => [function (stdClass $concept) {
        $concept->title = '';
    }, 'curriculum.json: atlas.rust[0].title: se esperaba un texto no vacío'],
    'an unknown key' => [function (stdClass $concept) {
        $concept->foo = 'x';
    }, 'curriculum.json: atlas.rust[0].foo: clave desconocida'],
    'a missing why' => [function (stdClass $concept) {
        unset($concept->why);
    }, 'curriculum.json: atlas.rust[0]: falta la clave «why»'],
    'a missing quiz' => [function (stdClass $concept) {
        unset($concept->quiz);
    }, 'curriculum.json: atlas.rust[0]: falta la clave «quiz»'],
    'a labId that is a number' => [function (stdClass $concept) {
        $concept->labId = 7;
    }, 'curriculum.json: atlas.rust[0].labId: se esperaba un texto no vacío'],
]);
