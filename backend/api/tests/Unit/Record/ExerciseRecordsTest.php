<?php

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use App\Content\Record\Exercise;
use App\Content\Record\ExerciseHashes;
use App\Content\Record\ExerciseHint;
use App\Content\Record\ExerciseTest;
use App\Content\Record\Topic;
use Tests\Support\ContentFixture;

/** @return list<array{catalog: string, domain: ?string, position: int, exercise: stdClass, path: string}> */
function documentExercises(?stdClass $document = null): array
{
    $document ??= ContentFixture::fromImage()->document;
    $exercises = [];
    foreach (['lab', 'quests', 'cores'] as $catalog) {
        foreach ($document->{$catalog} as $slice => $list) {
            foreach ($list as $position => $exercise) {
                $exercises[] = [
                    'catalog' => $catalog,
                    'domain' => $catalog === 'cores' ? $slice : null,
                    'position' => $position,
                    'exercise' => $exercise,
                    'path' => "{$catalog}.{$slice}[{$position}]",
                ];
            }
        }
    }

    return $exercises;
}

/** @return array<string, string> workshop ID by core ID, from the `code` maps of the workshops */
function coreOwners(stdClass $document): array
{
    $owners = [];
    foreach ($document->workshops as $workshops) {
        foreach ($workshops as $workshop) {
            foreach ($workshop->code as $coreId) {
                $owners[$coreId] = $workshop->id;
            }
        }
    }

    return $owners;
}

/** @param array<string, mixed> $meta */
function exerciseFromDocument(array $entry, array $meta, stdClass $document): Exercise
{
    $exercise = $entry['exercise'];

    return Exercise::fromDocument(
        $exercise,
        $entry['catalog'],
        $entry['domain'],
        $entry['position'],
        ExerciseHashes::fromDocument($meta['exercises'][$exercise->id], $exercise->id),
        coreOwners($document)[$exercise->id] ?? null,
        $entry['path'],
    );
}

/** @return array<string, mixed> */
function exerciseRowAsText(array $row): array
{
    return array_map(fn (mixed $value) => is_int($value) ? (string) $value : $value, $row);
}

function exerciseFromRows(Exercise $exercise, bool $integersAsText): Exercise
{
    $convert = fn (array $row): array => $integersAsText ? exerciseRowAsText($row) : $row;
    $rows = $exercise->rowsByTable();

    $tests = [];
    foreach ($rows['exercise_tests'] as $row) {
        $tests[] = ExerciseTest::fromRow($convert($row));
    }
    $hints = [];
    foreach ($rows['exercise_hints'] as $row) {
        $hints[] = ExerciseHint::fromRow($convert($row));
    }

    return Exercise::fromRow($convert($rows['exercises'][0]), $tests, $hints, Topic::fromRow($convert($rows['topics'][0])));
}

it('publishes each of the 274 exercises of the document byte for byte after a trip through its rows', function (bool $integersAsText) {
    $fixture = ContentFixture::fromImage();
    $entries = documentExercises($fixture->document);
    expect($entries)->toHaveCount(274);

    foreach ($entries as $entry) {
        $record = exerciseFromDocument($entry, $fixture->meta, $fixture->document);

        expect(PublishedJson::encode(exerciseFromRows($record, $integersAsText)->toPublished()))->toBe(PublishedJson::encode($entry['exercise']));
    }
})->with([[false], [true]]);

it('keeps the hashes, the workshop and the context of each exercise through its rows', function () {
    $fixture = ContentFixture::fromImage();
    $owners = coreOwners($fixture->document);

    foreach (documentExercises($fixture->document) as $entry) {
        $id = $entry['exercise']->id;
        $row = exerciseFromRows(exerciseFromDocument($entry, $fixture->meta, $fixture->document), false)->toRow();

        expect($row['catalog'])->toBe($entry['catalog']);
        expect($row['domain'])->toBe($entry['domain']);
        expect($row['position'])->toBe($entry['position']);
        expect($row['workshop_id'])->toBe($owners[$id] ?? null);
        expect($row['content_hash'])->toBe($fixture->meta['exercises'][$id]['contentHash']);
        expect($row['grading_hash'])->toBe($fixture->meta['exercises'][$id]['gradingHash']);
        expect($row['starter_hash'])->toBe($fixture->meta['exercises'][$id]['starterHash']);
    }
});

it('publishes workshopId only in the 16 cores that carry it, though every owned core stores its workshop', function () {
    $fixture = ContentFixture::fromImage();
    $owners = coreOwners($fixture->document);
    $publishing = 0;
    $storing = 0;

    foreach (documentExercises($fixture->document) as $entry) {
        $record = exerciseFromDocument($entry, $fixture->meta, $fixture->document);
        $published = $record->toPublished();
        $id = $entry['exercise']->id;

        expect(property_exists($published, 'workshopId'))->toBe(property_exists($entry['exercise'], 'workshopId'));
        $publishing += property_exists($published, 'workshopId') ? 1 : 0;
        $storing += $record->toRow()['workshop_id'] === null ? 0 : 1;
        expect($record->toRow()['workshop_id'])->toBe($owners[$id] ?? null);
    }

    expect($publishing)->toBe(16);
    expect($storing)->toBeGreaterThan(16);
});

it('does not publish an absent level or challengeType and stores them as NULL', function () {
    $fixture = ContentFixture::fromImage();
    $checked = ['level' => 0, 'challengeType' => 0];

    foreach (documentExercises($fixture->document) as $entry) {
        $record = exerciseFromDocument($entry, $fixture->meta, $fixture->document);
        $published = exerciseFromRows($record, false)->toPublished();
        foreach (['level' => 'level', 'challengeType' => 'challenge_type'] as $key => $column) {
            if (! property_exists($entry['exercise'], $key)) {
                expect(property_exists($published, $key))->toBeFalse();
                expect($record->toRow()[$column])->toBeNull();
                $checked[$key]++;
            }
        }
    }

    expect($checked['level'])->toBeGreaterThan(0);
    expect($checked['challengeType'])->toBeGreaterThan(0);
});

it('returns the exercise, topic, test and hint rows by table with the C2 keys and positions', function () {
    $fixture = ContentFixture::fromImage();
    $entry = documentExercises($fixture->document)[0];
    $exercise = $entry['exercise'];
    $id = $exercise->id;
    $hashes = $fixture->meta['exercises'][$id];

    $rows = exerciseFromDocument($entry, $fixture->meta, $fixture->document)->rowsByTable();

    expect(array_keys($rows))->toBe(['exercises', 'topics', 'exercise_tests', 'exercise_hints']);
    expect($rows['exercises'])->toHaveCount(1);
    expect($rows['exercises'][0])->toBe([
        'id' => $id,
        'language' => $exercise->language,
        'topic_key' => $exercise->topicId,
        'stage' => $exercise->stage,
        'level' => $exercise->level ?? null,
        'challenge_type' => $exercise->challengeType ?? null,
        'kind' => $exercise->kind,
        'minutes' => $exercise->minutes,
        'visual' => $exercise->visual,
        'title' => $exercise->title,
        'intro' => $exercise->intro,
        'why' => $exercise->why,
        'objective' => $exercise->objective,
        'transfer' => $exercise->transfer,
        'starter' => $exercise->starter,
        'solution' => $exercise->solution,
        'imports_json' => PublishedJson::encode($exercise->imports),
        'sources_json' => PublishedJson::encode($exercise->sources),
        'instructions_json' => PublishedJson::encode($exercise->instructions),
        'review_json' => PublishedJson::encode($exercise->review),
        'prediction_json' => PublishedJson::encode($exercise->prediction),
        'catalog' => 'lab',
        'domain' => null,
        'position' => 0,
        'workshop_id' => null,
        'key_order' => PublishedJson::encode(array_keys(get_object_vars($exercise))),
        'content_hash' => $hashes['contentHash'],
        'grading_hash' => $hashes['gradingHash'],
        'starter_hash' => $hashes['starterHash'],
    ]);
    expect($rows['topics'])->toBe([['language' => $exercise->language, 'topic_key' => $exercise->topicId, 'label' => $exercise->topic]]);

    $expectedTests = [];
    foreach ($exercise->tests as $index => $test) {
        $expectedTests[] = [
            'exercise_id' => $id,
            'test_key' => $test->id,
            'label' => $test->label,
            'expression' => $test->expression,
            'why' => $test->why,
            'failure' => $test->failure,
            'position' => $index,
            'key_order' => PublishedJson::encode(array_keys(get_object_vars($test))),
        ];
    }
    expect($rows['exercise_tests'])->toBe($expectedTests);

    $expectedHints = [];
    foreach ($exercise->hints as $index => $hint) {
        $expectedHints[] = ['exercise_id' => $id, 'position' => $index, 'text' => $hint];
    }
    expect($rows['exercise_hints'])->toBe($expectedHints);
});

it('publishes the tests and hints in the order of position whatever the order of the rows', function () {
    $fixture = ContentFixture::fromImage();
    $entry = documentExercises($fixture->document)[0];
    $rows = exerciseFromDocument($entry, $fixture->meta, $fixture->document)->rowsByTable();
    expect(count($rows['exercise_tests']))->toBeGreaterThan(1);

    $tests = [];
    foreach (array_reverse($rows['exercise_tests']) as $row) {
        $tests[] = ExerciseTest::fromRow($row);
    }
    $hints = [];
    foreach (array_reverse($rows['exercise_hints']) as $row) {
        $hints[] = ExerciseHint::fromRow($row);
    }

    $published = Exercise::fromRow($rows['exercises'][0], $tests, $hints, Topic::fromRow($rows['topics'][0]))->toPublished();

    expect(PublishedJson::encode($published))->toBe(PublishedJson::encode($entry['exercise']));
});

it('rejects an exercise row whose key order has an unknown key', function () {
    $fixture = ContentFixture::fromImage();
    $rows = exerciseFromDocument(documentExercises($fixture->document)[0], $fixture->meta, $fixture->document)->rowsByTable();
    $rows['exercises'][0]['key_order'] = PublishedJson::encode(['id', 'foo']);

    expect(fn () => Exercise::fromRow($rows['exercises'][0], [], [], Topic::fromRow($rows['topics'][0])))
        ->toThrow(LogicException::class, 'La clave «foo» no tiene regla en su códec.');
});

it('reports the C2 messages of an invalid exercise', function (Closure $edit, string $message) {
    $fixture = ContentFixture::fromImage();
    $edit($fixture->document->lab->rust[0]);

    $failure = null;
    foreach (documentExercises($fixture->document) as $entry) {
        try {
            exerciseFromDocument($entry, $fixture->meta, $fixture->document);
        } catch (InvalidContent $exception) {
            $failure = $exception->getMessage();
            break;
        }
    }

    expect($failure)->toBe($message);
})->with([
    'empty title' => [fn (stdClass $exercise) => $exercise->title = '', 'curriculum.json: lab.rust[0].title: se esperaba un texto no vacío'],
    'stage as text' => [fn (stdClass $exercise) => $exercise->stage = '1', 'curriculum.json: lab.rust[0].stage: se esperaba un entero'],
    'empty topic' => [fn (stdClass $exercise) => $exercise->topic = '', 'curriculum.json: lab.rust[0].topic: se esperaba un texto no vacío'],
    'no tests' => [fn (stdClass $exercise) => $exercise->tests = [], 'curriculum.json: lab.rust[0].tests: se esperaba una lista no vacía'],
    'test that is not an object' => [fn (stdClass $exercise) => $exercise->tests[0] = 'x', 'curriculum.json: lab.rust[0].tests[0]: se esperaba un objeto'],
    'blank hint' => [fn (stdClass $exercise) => $exercise->hints[0] = '  ', 'curriculum.json: lab.rust[0].hints[0]: se esperaba un texto no vacío'],
    'no hints' => [fn (stdClass $exercise) => $exercise->hints = [], 'curriculum.json: lab.rust[0].hints: se esperaba una lista no vacía'],
    'unknown key' => [fn (stdClass $exercise) => $exercise->extra = 'x', 'curriculum.json: lab.rust[0].extra: clave desconocida'],
    'unknown key in a test' => [fn (stdClass $exercise) => $exercise->tests[0]->extra = 'x', 'curriculum.json: lab.rust[0].tests[0].extra: clave desconocida'],
    'missing minutes' => [function (stdClass $exercise) {
        unset($exercise->minutes);
    }, 'curriculum.json: lab.rust[0]: falta la clave «minutes»'],
]);

it('rejects a row of a test, a hint or a topic with the wrong type', function () {
    expect(fn () => ExerciseHint::fromRow(['exercise_id' => 'e', 'position' => 0, 'text' => 5]))->toThrow(LogicException::class);
    expect(fn () => Topic::fromRow(['language' => 'rust', 'topic_key' => 'k']))->toThrow(LogicException::class);
});
