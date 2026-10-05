<?php

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\ContentSource;
use Tests\Support\ContentFixture;

// El contrato sin base: el documento real → filas → bytes. Los esperados son las huellas que
// calculó el generador sobre los bytes de JSON.stringify (curriculum.meta.json): un oráculo
// independiente del código PHP que se prueba.
function contentRowsFor(ContentSource $source): array
{
    $rows = (new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec))->fromSource($source);

    return $rows->toArray();
}

beforeEach(function () {
    $this->source = ContentSource::fromDirectory(ContentFixture::imagePath());
    $this->rows = contentRowsFor($this->source);
});

it('arma las filas que dice el ADR 0006 §5.1', function () {
    expect(array_map('count', $this->rows))->toBe([
        'languages' => 2, 'catalogs' => 3, 'topics' => 98, 'workshops' => 25, 'exercises' => 274,
        'exercise_tests' => 822, 'exercise_hints' => 822, 'workshop_objectives' => 75, 'workshop_steps' => 100,
        'workshop_related_exercises' => 118, 'worlds' => 8, 'world_exercises' => 48, 'atlas_concepts' => 32,
        'guide_resources' => 15, 'guide_sources' => 9, 'guide_tracks' => 2, 'guide_modules' => 8,
        'guide_steps' => 24, 'guide_step_resources' => 56,
    ]);
});

it('no publica la clave ni el índice v1 de las etapas, y los guarda por separado', function () {
    $first = collect($this->rows['workshop_steps'])->firstWhere('workshop_id', 'algebra');

    expect($first)->toMatchArray(['step_key' => 'e1', 'v1_position' => 0, 'position' => 0])
        ->and(json_decode($first['key_order']))->toBe(['title', 'task', 'why', 'done']);
});

it('deja NULL lo que no está en el documento: el nivel de un ejercicio del recorrido y las fuentes adicionales', function () {
    $withoutLevel = collect($this->rows['exercises'])->first(fn (array $row) => $row['catalog'] === 'lab' && $row['level'] === null);
    $furtherSources = collect($this->rows['atlas_concepts'])->whereNull('further_sources_json')->count();

    expect(json_decode($withoutLevel['key_order']))->not->toContain('level')
        ->and($furtherSources)->toBe(30);
});

it('guarda el taller dueño de cada núcleo, también de los que no publican workshopId', function () {
    $cores = collect($this->rows['exercises'])->where('catalog', 'cores');

    expect($cores->whereNull('workshop_id')->count())->toBe(0)
        ->and($cores->filter(fn (array $row) => str_contains($row['key_order'], '"workshopId"'))->count())->toBe(16);
});
