<?php

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use App\Content\Record\StepKey;
use App\Content\Record\Workshop;
use App\Content\Record\WorkshopObjective;
use App\Content\Record\WorkshopRelatedExercise;
use App\Content\Record\WorkshopStep;
use Tests\Support\ContentFixture;

const WORKSHOP_LANGUAGES = ['rust', 'go'];

/** @return list<array{0: string, 1: int, 2: stdClass}> domain, position and workshop of the document */
function workshopsOf(stdClass $document): array
{
    $workshops = [];
    foreach ($document->workshops as $domain => $list) {
        foreach ($list as $position => $workshop) {
            $workshops[] = [$domain, $position, $workshop];
        }
    }

    return $workshops;
}

/** @return list<StepKey> */
function stepKeysOf(array $meta, string $workshopId): array
{
    $keys = [];
    foreach ($meta['workshopSteps'][$workshopId] as $index => $key) {
        $keys[] = StepKey::fromDocument($key, "workshopSteps.{$workshopId}[{$index}]");
    }

    return $keys;
}

/** @return array<string, list<string>> */
function relatedOf(stdClass $workshop): array
{
    $related = [];
    foreach (WORKSHOP_LANGUAGES as $language) {
        $related[$language] = $workshop->related->{$language};
    }

    return $related;
}

/** @return array<string, string> */
function codeOf(stdClass $workshop): array
{
    $code = [];
    foreach (WORKSHOP_LANGUAGES as $language) {
        $code[$language] = $workshop->code->{$language};
    }

    return $code;
}

function workshopFromDocument(ContentFixture $fixture, string $domain, int $position, stdClass $workshop): Workshop
{
    return Workshop::fromDocument(
        $workshop,
        $domain,
        $position,
        stepKeysOf($fixture->meta, $workshop->id),
        WORKSHOP_LANGUAGES,
        codeOf($workshop),
        relatedOf($workshop),
        "workshops.{$domain}[{$position}]",
    );
}

/** @return array<string, string> language of each exercise ID of the document */
function exerciseLanguages(stdClass $document): array
{
    $languages = [];
    foreach (['lab', 'quests', 'cores'] as $catalog) {
        foreach ($document->{$catalog} as $list) {
            foreach ($list as $exercise) {
                $languages[$exercise->id] = $exercise->language;
            }
        }
    }

    return $languages;
}

function textIntegers(array $row): array
{
    return array_map(fn (int|string|null $value) => is_int($value) ? (string) $value : $value, $row);
}

function workshopFromRows(Workshop $workshop, stdClass $document, bool $integersAsText): Workshop
{
    $convert = fn (array $row): array => $integersAsText ? textIntegers($row) : $row;
    $rows = $workshop->rowsByTable();
    $languageOf = exerciseLanguages($document);

    $objectives = [];
    foreach ($rows['workshop_objectives'] as $row) {
        $objectives[] = WorkshopObjective::fromRow($convert($row));
    }
    $steps = [];
    foreach ($rows['workshop_steps'] as $row) {
        $steps[] = WorkshopStep::fromRow($convert($row));
    }
    $related = [];
    foreach ($rows['workshop_related_exercises'] as $row) {
        $related[$languageOf[$row['exercise_id']]][] = WorkshopRelatedExercise::fromRow($convert($row));
    }

    return Workshop::fromRow($convert($rows['workshops'][0]), $objectives, $steps, $related, codeOf($document->workshops->{$workshop->domain}[$workshop->position]), WORKSHOP_LANGUAGES);
}

it('round-trips the 25 workshops of the image through their rows to the published bytes', function (bool $integersAsText) {
    $fixture = ContentFixture::fromImage();
    $count = 0;

    foreach (workshopsOf($fixture->document) as [$domain, $position, $workshop]) {
        $record = workshopFromDocument($fixture, $domain, $position, $workshop);

        expect(PublishedJson::encode(workshopFromRows($record, $fixture->document, $integersAsText)->toPublished()))->toBe(PublishedJson::encode($workshop));
        $count++;
    }

    expect($count)->toBe(25);
})->with([[false], [true]]);

it('writes the workshops row with the document values, its context and its key order', function () {
    $fixture = ContentFixture::fromImage();
    [$domain, $position, $workshop] = workshopsOf($fixture->document)[1];

    expect(workshopFromDocument($fixture, $domain, $position, $workshop)->toRow())->toBe([
        'id' => $workshop->id,
        'category' => $workshop->category,
        'model' => $workshop->model,
        'level' => $workshop->level,
        'minutes' => $workshop->minutes,
        'title' => $workshop->title,
        'subtitle' => $workshop->subtitle,
        'story' => $workshop->story,
        'what' => $workshop->what,
        'why' => $workshop->why,
        'limits' => $workshop->limits,
        'uses_json' => PublishedJson::encode($workshop->uses),
        'prediction_json' => PublishedJson::encode($workshop->prediction),
        'sources_json' => PublishedJson::encode($workshop->sources),
        'bridge_json' => PublishedJson::encode($workshop->bridge),
        'domain' => $domain,
        'position' => $position,
        'key_order' => PublishedJson::encode(array_keys(get_object_vars($workshop))),
    ]);
});

it('keeps the step key and the v1 index in the row and out of the published step', function () {
    $fixture = ContentFixture::fromImage();
    foreach (workshopsOf($fixture->document) as [$domain, $position, $workshop]) {
        $record = workshopFromDocument($fixture, $domain, $position, $workshop);
        $stepRows = $record->rowsByTable()['workshop_steps'];

        foreach ($fixture->meta['workshopSteps'][$workshop->id] as $index => $key) {
            expect($stepRows[$index]['step_key'])->toBe($key['id'])
                ->and($stepRows[$index]['v1_position'])->toBe($key['v1Index'])
                ->and($stepRows[$index]['position'])->toBe($index)
                ->and(get_object_vars($record->toPublished()->steps[$index]))->not->toHaveKeys(['step_key', 'stepKey', 'v1_position', 'id']);
        }
    }
});

it('writes the objective rows in the order of the document', function () {
    $fixture = ContentFixture::fromImage();
    [$domain, $position, $workshop] = workshopsOf($fixture->document)[0];

    $rows = workshopFromDocument($fixture, $domain, $position, $workshop)->rowsByTable()['workshop_objectives'];

    $expected = [];
    foreach ($workshop->objectives as $index => $objective) {
        $expected[] = [
            'workshop_id' => $workshop->id,
            'objective_key' => $objective->id,
            'label' => $objective->label,
            'why' => $objective->why,
            'position' => $index,
            'key_order' => PublishedJson::encode(array_keys(get_object_vars($objective))),
        ];
    }
    expect($rows)->toBe($expected);
});

it('numbers the related exercises from zero within each language', function () {
    $fixture = ContentFixture::fromImage();
    foreach (workshopsOf($fixture->document) as [$domain, $position, $workshop]) {
        $rows = workshopFromDocument($fixture, $domain, $position, $workshop)->rowsByTable()['workshop_related_exercises'];

        $expected = [];
        foreach (WORKSHOP_LANGUAGES as $language) {
            foreach ($workshop->related->{$language} as $index => $exerciseId) {
                $expected[] = ['workshop_id' => $workshop->id, 'exercise_id' => $exerciseId, 'position' => $index];
            }
        }
        expect($rows)->toBe($expected);
    }
});

it('returns the four tables of a workshop', function () {
    $fixture = ContentFixture::fromImage();
    [$domain, $position, $workshop] = workshopsOf($fixture->document)[0];

    $rows = workshopFromDocument($fixture, $domain, $position, $workshop)->rowsByTable();

    expect(array_keys($rows))->toBe(['workshops', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises'])
        ->and($rows['workshops'])->toHaveCount(1)
        ->and($rows['workshop_steps'])->toHaveCount(count($workshop->steps));
});

it('publishes code and related in the order of the languages, null when one is missing', function () {
    $fixture = ContentFixture::fromImage();
    [$domain, $position, $workshop] = workshopsOf($fixture->document)[0];
    $rows = workshopFromDocument($fixture, $domain, $position, $workshop)->rowsByTable();

    $published = Workshop::fromRow($rows['workshops'][0], [], [], ['rust' => [new WorkshopRelatedExercise($workshop->id, 'r-1', 0)]], ['rust' => 'core-rust'], ['go', 'rust'])->toPublished();

    expect(array_keys(get_object_vars($published->code)))->toBe(['go', 'rust'])
        ->and($published->code->go)->toBeNull()
        ->and($published->code->rust)->toBe('core-rust')
        ->and(array_keys(get_object_vars($published->related)))->toBe(['go', 'rust'])
        ->and($published->related->go)->toBeNull()
        ->and($published->related->rust)->toBe(['r-1']);
});

it('publishes the related exercises in the order of position whatever the order of the rows', function () {
    $fixture = ContentFixture::fromImage();
    [$domain, $position, $workshop] = workshopsOf($fixture->document)[0];
    $rows = workshopFromDocument($fixture, $domain, $position, $workshop)->rowsByTable();
    $reversed = [
        'rust' => [new WorkshopRelatedExercise($workshop->id, 'second', 1), new WorkshopRelatedExercise($workshop->id, 'first', 0)],
    ];

    $published = Workshop::fromRow($rows['workshops'][0], [], [], $reversed, [], ['rust'])->toPublished();

    expect($published->related->rust)->toBe(['first', 'second']);
});

it('rejects a workshops row whose key order has an unknown key', function () {
    $fixture = ContentFixture::fromImage();
    [$domain, $position, $workshop] = workshopsOf($fixture->document)[0];
    $row = workshopFromDocument($fixture, $domain, $position, $workshop)->toRow();
    $row['key_order'] = PublishedJson::encode(['id', 'foo']);

    expect(fn () => Workshop::fromRow($row, [], [], [], [], WORKSHOP_LANGUAGES))->toThrow(LogicException::class, 'La clave «foo» no tiene regla en su códec.');
});

it('reports the C2 messages of an invalid workshop', function (Closure $edit, string $message) {
    $fixture = ContentFixture::fromImage();
    $workshop = $fixture->document->workshops->lowlevel[0];
    $edit($workshop);

    $failure = null;
    try {
        Workshop::fromDocument($workshop, 'lowlevel', 0, stepKeysOf($fixture->meta, $workshop->id), WORKSHOP_LANGUAGES, codeOf($workshop), relatedOf($workshop), 'workshops.lowlevel[0]');
    } catch (InvalidContent $exception) {
        $failure = $exception->getMessage();
    }

    expect($failure)->toBe($message);
})->with([
    'no objectives' => [fn (stdClass $workshop) => $workshop->objectives = [], 'curriculum.json: workshops.lowlevel[0].objectives: se esperaba una lista no vacía'],
    'step that is not an object' => [fn (stdClass $workshop) => $workshop->steps[0] = 'x', 'curriculum.json: workshops.lowlevel[0].steps[0]: se esperaba un objeto'],
    'minutes as text' => [fn (stdClass $workshop) => $workshop->minutes = '30', 'curriculum.json: workshops.lowlevel[0].minutes: se esperaba un entero'],
    'unknown key' => [fn (stdClass $workshop) => $workshop->extra = 'x', 'curriculum.json: workshops.lowlevel[0].extra: clave desconocida'],
    'missing story' => [function (stdClass $workshop) {
        unset($workshop->story);
    }, 'curriculum.json: workshops.lowlevel[0]: falta la clave «story»'],
]);

it('names the meta file when a workshop has one step key fewer than steps', function () {
    $fixture = ContentFixture::fromImage();
    $workshop = $fixture->document->workshops->lowlevel[0];
    $stepKeys = stepKeysOf($fixture->meta, $workshop->id);
    array_pop($stepKeys);
    $steps = count($workshop->steps);
    $keys = $steps - 1;

    expect(fn () => Workshop::fromDocument($workshop, 'lowlevel', 0, $stepKeys, WORKSHOP_LANGUAGES, codeOf($workshop), relatedOf($workshop), 'workshops.lowlevel[0]'))
        ->toThrow(InvalidContent::class, "curriculum.meta.json: workshopSteps.{$workshop->id}: {$keys} claves para {$steps} etapas: regenerá los dos archivos juntos");
});
