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
use Illuminate\Support\Arr;
use Tests\Support\ContentFixture;

// The contract without a database: the real document → rows → bytes. The expected values are the
// hashes the generator computed over the bytes of JSON.stringify (curriculum.meta.json), an oracle
// independent of the PHP code under test.
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

it('assembles each of the 17 portions with the bytes the generator fixed', function (Portion $portion) {
    $bytes = $this->assembler->assemble($portion, $this->rows, $this->source->languages());

    expect(hash('sha256', $bytes))->toBe($this->source->meta['portions'][$portion->value]);
})->with(Portion::cases());

it('assembles each exercise with its contentHash', function () {
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

it('builds the rows ADR 0006 §5.1 describes', function () {
    expect(Arr::map($this->rows, fn (array $table) => count($table)))->toBe([
        'languages' => 2, 'catalogs' => 3, 'topics' => 98, 'workshops' => 25, 'exercises' => 274,
        'exercise_tests' => 822, 'exercise_hints' => 822, 'workshop_objectives' => 75, 'workshop_steps' => 100,
        'workshop_related_exercises' => 118, 'worlds' => 8, 'world_exercises' => 48, 'atlas_concepts' => 32,
        'guide_resources' => 15, 'guide_sources' => 9, 'guide_tracks' => 2, 'guide_modules' => 8,
        'guide_steps' => 24, 'guide_step_resources' => 56,
    ]);
});

it('does not publish the step key or the v1 index, and stores them separately', function () {
    $first = collect($this->rows['workshop_steps'])->firstWhere('workshop_id', 'algebra');

    expect($first)->toMatchArray(['step_key' => 'e1', 'v1_position' => 0, 'position' => 0])
        ->and(json_decode($first['key_order']))->toBe(['title', 'task', 'why', 'done']);
});

it('leaves NULL what is not in the document: the level of a lab exercise and the further sources', function () {
    $withoutLevel = collect($this->rows['exercises'])->first(fn (array $row) => $row['catalog'] === 'lab' && $row['level'] === null);
    $furtherSources = collect($this->rows['atlas_concepts'])->whereNull('further_sources_json')->count();

    expect(json_decode($withoutLevel['key_order']))->not->toContain('level')
        ->and($furtherSources)->toBe(30);
});

it('stores the owning workshop of each core, including those that do not publish workshopId', function () {
    $cores = collect($this->rows['exercises'])->where('catalog', 'cores');

    expect($cores->whereNull('workshop_id')->count())->toBe(0)
        ->and($cores->filter(fn (array $row) => str_contains($row['key_order'], '"workshopId"'))->count())->toBe(16);
});

it('assembles the same bytes even if the rows arrive in another order', function (Portion $portion) {
    $reversed = Arr::map($this->rows, fn (array $table) => array_reverse($table));

    $bytes = $this->assembler->assemble($portion, $reversed, $this->source->languages());

    expect(hash('sha256', $bytes))->toBe($this->source->meta['portions'][$portion->value]);
})->with(Portion::cases());

it('assembles the same bytes when the database returns numbers as text', function (Portion $portion) {
    $asText = Arr::map($this->rows, fn (array $table) => Arr::map(
        $table,
        fn (array $row) => Arr::map($row, fn ($value) => is_int($value) ? (string) $value : $value),
    ));

    $bytes = $this->assembler->assemble($portion, $asText, $this->source->languages());

    expect(hash('sha256', $bytes))->toBe($this->source->meta['portions'][$portion->value]);
})->with(Portion::cases());
