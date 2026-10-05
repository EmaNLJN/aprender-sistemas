<?php

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\ContentSource;
use App\Content\Portion;
use App\Content\PortionAssembler;
use App\Content\PublishedJson;
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
    $this->assembler = new PortionAssembler(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec);
});

it('arma cada una de las 17 porciones con los bytes que fijó el generador', function (Portion $portion) {
    $bytes = $this->assembler->assemble($portion, $this->rows, $this->source->languages());

    expect(hash('sha256', $bytes))->toBe($this->source->meta['portions'][$portion->value]);
})->with(Portion::cases());

it('arma cada ejercicio con su contentHash', function () {
    $codec = new ExerciseCodec;
    $tests = collect($this->rows['exercise_tests'])->groupBy('exercise_id');
    $hints = collect($this->rows['exercise_hints'])->groupBy('exercise_id');
    $topics = collect($this->rows['topics'])->mapWithKeys(fn (array $topic) => ["{$topic['language']}|{$topic['topic_key']}" => $topic['label']]);

    $wrong = [];
    foreach ($this->rows['exercises'] as $exercise) {
        $record = $codec->toRecord(
            $exercise,
            $tests->get($exercise['id'], collect())->sortBy('position')->values()->all(),
            $hints->get($exercise['id'], collect())->sortBy('position')->values()->all(),
            $topics["{$exercise['language']}|{$exercise['topic_key']}"],
        );
        if (hash('sha256', PublishedJson::encode($record)) !== $this->source->meta['exercises'][$exercise['id']]['contentHash']) {
            $wrong[] = $exercise['id'];
        }
    }

    expect($wrong)->toBe([]);
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

// La base devuelve las filas en el orden de su índice, no en el del documento: el ensamblador
// ordena por position, así que el orden de llegada no cambia ni un byte.
it('arma los mismos bytes aunque las filas lleguen en otro orden', function (Portion $portion) {
    $reversed = array_map('array_reverse', $this->rows);

    $bytes = $this->assembler->assemble($portion, $reversed, $this->source->languages());

    expect(hash('sha256', $bytes))->toBe($this->source->meta['portions'][$portion->value]);
})->with(Portion::cases());

// Según cómo se conecte PDO, los enteros de MySQL pueden llegar como texto («3» en lugar de 3): los
// bytes publicados no pueden depender de eso.
it('arma los mismos bytes cuando la base devuelve los números como texto', function (Portion $portion) {
    $asText = array_map(
        fn (array $table) => array_map(
            fn (array $row) => array_map(fn ($value) => is_int($value) ? (string) $value : $value, $row),
            $table,
        ),
        $this->rows,
    );

    $bytes = $this->assembler->assemble($portion, $asText, $this->source->languages());

    expect(hash('sha256', $bytes))->toBe($this->source->meta['portions'][$portion->value]);
})->with(Portion::cases());
