<?php

use App\Content\ContentDiff;
use App\Content\ContentPlan;
use App\Content\ContentSource;
use App\Content\ContentTables;
use App\Content\InvalidContent;
use App\Content\LatestImport;
use App\Content\RowSet;
use Illuminate\Support\Arr;
use Tests\Support\ContentFixture;
use Tests\Support\ContentPipeline;

afterEach(fn () => ContentFixture::cleanup());

/** @return array{0: RowSet, 1: ContentSource} the rows of the (edited) document and its source */
function diffDesired(?Closure $edit = null, ?Closure $editMeta = null): array
{
    $fixture = ContentFixture::fromImage();
    if ($edit !== null) {
        $edit($fixture);
    }
    $source = ContentSource::fromDirectory($fixture->write(editMeta: $editMeta));
    $rows = ContentPipeline::rows();

    return [$rows->fromSource($source), $source];
}

/** What the tables hold after importing those rows: everything active. */
function storedRowsAfterImport(RowSet $rows): array
{
    $stored = [];
    foreach ($rows->toArray() as $table => $list) {
        foreach ($list as $row) {
            $stored[$table][ContentTables::keyOf($table, $row)] = in_array($table, ContentTables::WITHOUT_LIFECYCLE, true)
                ? $row
                : $row + ['status' => 'active', 'retired_at' => null, 'created_at' => '2026-10-05 00:00:00.000', 'updated_at' => '2026-10-05 00:00:00.000'];
        }
    }

    return $stored;
}

/** Marks the rows of an exercise as retired at the given time, the way an import leaves them. */
function retireExercise(array $stored, string $exerciseId, string $at): array
{
    foreach (['exercises' => 'id', 'exercise_tests' => 'exercise_id', 'exercise_hints' => 'exercise_id'] as $table => $column) {
        foreach ($stored[$table] as $key => $row) {
            if ($row[$column] === $exerciseId) {
                $stored[$table][$key]['status'] = 'deprecated';
                $stored[$table][$key]['retired_at'] = $at;
                $stored[$table][$key]['position'] = $table === 'exercise_hints' ? $row['position'] : null;
            }
        }
    }

    return $stored;
}

function gradingVersionsOf(RowSet $rows): array
{
    return collect($rows->rows('exercises'))->mapWithKeys(fn (array $row) => ["{$row['id']}\x1f{$row['grading_hash']}" => true])->all();
}

function latestImportFor(ContentSource $source, ?string $commit = null): LatestImport
{
    return new LatestImport(1, $source->documentHash(), $commit, $source->meta->portionHashes);
}

/** @return array<string, int> how many rows the plan writes, for each table that has any */
function writtenCounts(ContentPlan $plan): array
{
    return collect($plan->writes)->filter()->map(fn (array $rows) => count($rows))->all();
}

it('with the same document there is nothing to write or record', function () {
    [$rows, $source] = diffDesired();

    $plan = (new ContentDiff)->between($rows, storedRowsAfterImport($rows), gradingVersionsOf($rows), latestImportFor($source), $source->meta);

    expect($plan->isEmpty())->toBeTrue()
        ->and($plan->report->new)->toBe([])
        ->and($plan->report->counts['exercises'])->toBe(count(ContentFixture::fromImage()->meta['exercises']));
});

it('with an empty database everything is new and each exercise starts its grading version', function () {
    [$rows, $source] = diffDesired();

    $plan = (new ContentDiff)->between($rows, [], [], null, $source->meta);

    expect($plan->recordImport)->toBeTrue()
        ->and($plan->report->new)->toHaveCount(count(ContentFixture::fromImage()->meta['exercises']))
        ->and($plan->gradingVersions)->toHaveCount(count(ContentFixture::fromImage()->meta['exercises']))
        ->and(writtenCounts($plan))->toBe(Arr::map($rows->toArray(), fn (array $tableRows) => count($tableRows)));
});

it('a text change writes only the rows of that exercise and leaves the grading alone', function () {
    [$base] = diffDesired();
    $id = $base->rows('exercises')[3]['id'];
    [$rows, $source] = diffDesired(fn (ContentFixture $f) => $f->exercise($id)->intro .= ' (revisado)');

    $plan = (new ContentDiff)->between($rows, storedRowsAfterImport($base), gradingVersionsOf($base), latestImportFor(ContentSource::fromDirectory(ContentFixture::imagePath())), $source->meta);

    expect(writtenCounts($plan))->toBe(['exercises' => 1])
        ->and($plan->report->textChanged)->toBe([$id])
        ->and($plan->report->gradingChanged)->toBe([])
        ->and($plan->gradingVersions)->toBe([])
        ->and($plan->recordImport)->toBeTrue();
});

it('a change in a test changes the grading and adds its version', function () {
    [$base] = diffDesired();
    $id = $base->rows('exercises')[3]['id'];
    [$rows, $source] = diffDesired(fn (ContentFixture $f) => $f->exercise($id)->tests[0]->expression .= ' && true');

    $plan = (new ContentDiff)->between($rows, storedRowsAfterImport($base), gradingVersionsOf($base), null, $source->meta);

    expect(writtenCounts($plan))->toBe(['exercises' => 1, 'exercise_tests' => 1])
        ->and($plan->report->gradingChanged)->toBe([$id])
        ->and($plan->gradingVersions)->toHaveCount(1)
        ->and($plan->gradingVersions[0]['exercise_id'])->toBe($id);
});

it('a change that only reorders keys is written too', function () {
    [$base] = diffDesired();
    $id = $base->rows('exercises')[3]['id'];
    [$rows, $source] = diffDesired(function (ContentFixture $f) use ($id) {
        $exercise = $f->exercise($id);
        $title = $exercise->title;
        unset($exercise->title);
        $exercise->title = $title;
    });

    $plan = (new ContentDiff)->between($rows, storedRowsAfterImport($base), gradingVersionsOf($base), null, $source->meta);

    expect(writtenCounts($plan))->toBe(['exercises' => 1])
        ->and($plan->report->textChanged)->toBe([$id]);
});

it('exercises that only change position are written but not reported as changed', function () {
    [$base] = diffDesired();
    [$rows, $source] = diffDesired(fn (ContentFixture $f) => $f->document->lab->rust = array_reverse($f->document->lab->rust));

    $plan = (new ContentDiff)->between($rows, storedRowsAfterImport($base), gradingVersionsOf($base), null, $source->meta);

    expect(collect($plan->writes)->filter()->keys()->all())->toBe(['exercises'])
        ->and(count($plan->writes['exercises']))->toBeGreaterThan(1)
        ->and($plan->report->textChanged)->toBe([])
        ->and($plan->report->gradingChanged)->toBe([])
        ->and($plan->report->new)->toBe([]);
});

it('retires what leaves the document and reactivates what comes back', function () {
    [$full] = diffDesired();
    $id = ContentFixture::fromImage()->unreferencedLabExercise();
    [$without, $source] = diffDesired(fn (ContentFixture $f) => $f->withoutExercise($id));

    $retiring = (new ContentDiff)->between($without, storedRowsAfterImport($full), gradingVersionsOf($full), null, $source->meta);

    expect($retiring->report->retired)->toBe([$id])
        ->and(collect($retiring->retires)->filter()->keys()->all())->toContain('exercises', 'exercise_tests', 'exercise_hints')
        ->and(Arr::pluck($retiring->retires['exercises'], 'id'))->toBe([$id])
        // Positions are the index inside the portion, so the exercises after the retired one shift.
        ->and(Arr::pluck($retiring->writes['exercises'] ?? [], 'id'))->not->toContain($id);

    $stored = retireExercise(storedRowsAfterImport($full), $id, '2026-10-05 01:00:00.000');
    $returning = (new ContentDiff)->between($full, $stored, gradingVersionsOf($full), null, ContentSource::fromDirectory(ContentFixture::imagePath())->meta);

    expect($returning->report->reactivated)->toBe([$id])
        ->and(Arr::pluck($returning->writes['exercises'], 'id'))->toBe([$id]);
});

it('a test_key retired on its own is not reused, but comes back with its exercise', function () {
    [$full, $source] = diffDesired();
    $test = $full->rows('exercise_tests')[0];
    $stored = storedRowsAfterImport($full);
    $key = ContentTables::keyOf('exercise_tests', $test);
    $reuse = fn (array $stored) => (new ContentDiff)->between($full, $stored, gradingVersionsOf($full), null, $source->meta);

    // Retired on its own, with the exercise still active.
    $alone = $stored;
    $alone['exercise_tests'][$key]['status'] = 'deprecated';
    $alone['exercise_tests'][$key]['retired_at'] = '2026-10-05 01:00:00.000';
    expect(fn () => $reuse($alone))->toThrow(InvalidContent::class, "exercise_tests.{$test['exercise_id']}.{$test['test_key']}: el test_key se retiró y no se reutiliza: esa prueba no puede volver hasta que B2 quite la regla t{i+1} del generador");

    // Retired on its own, and the whole exercise later: the exercise comes back, the test does not.
    $later = retireExercise($alone, $test['exercise_id'], '2026-10-05 02:00:00.000');
    $later['exercise_tests'][$key]['retired_at'] = '2026-10-05 01:00:00.000';
    expect(fn () => $reuse($later))->toThrow(InvalidContent::class, 'el test_key se retiró y no se reutiliza');

    // Retired together with its exercise: both come back.
    $together = retireExercise($stored, $test['exercise_id'], '2026-10-05 02:00:00.000');
    expect($reuse($together)->report->reactivated)->toBe([$test['exercise_id']]);
});

it('the v1 index of a step is frozen', function () {
    [$base] = diffDesired();
    [$rows, $source] = diffDesired(editMeta: function (array $meta) {
        $meta['workshopSteps']['cache'][0]['v1Index'] = 3;
        $meta['workshopSteps']['cache'][3]['v1Index'] = 0;

        return $meta;
    });

    expect(fn () => (new ContentDiff)->between($rows, storedRowsAfterImport($base), gradingVersionsOf($base), null, $source->meta))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache.e1: el v1Index está congelado: era 0 y llega 3');
});

it('a v1 index cannot belong to two steps of a workshop', function () {
    [$rows, $source] = diffDesired(editMeta: function (array $meta) {
        $meta['workshopSteps']['cache'][1]['v1Index'] = 0;

        return $meta;
    });

    expect(fn () => (new ContentDiff)->between($rows, [], [], null, $source->meta))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache.e2: el v1Index 0 ya es el de la etapa e1');
});

it('a new step cannot take the v1 index of a step that left the document', function (string $status) {
    [$base] = diffDesired();
    $stored = storedRowsAfterImport($base);
    $leaving = ContentTables::keyOf('workshop_steps', ['workshop_id' => 'cache', 'step_key' => 'e3']);
    expect($stored['workshop_steps'][$leaving]['v1_position'])->toBe(2);
    if ($status === 'deprecated') {
        $stored['workshop_steps'][$leaving] = ['status' => 'deprecated', 'retired_at' => '2026-10-05 01:00:00.000', 'position' => null] + $stored['workshop_steps'][$leaving];
    }
    // The document no longer has e3 and a new e5 asks for its index.
    [$rows, $source] = diffDesired(editMeta: function (array $meta) {
        $meta['workshopSteps']['cache'][2]['id'] = 'e5';

        return $meta;
    });

    expect(fn () => (new ContentDiff)->between($rows, $stored, gradingVersionsOf($base), null, $source->meta))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache.e5: el v1Index 2 ya es el de la etapa e3, que lo conserva aunque se retire');
})->with([
    'retired by an earlier import' => ['deprecated'],
    'retired by this very import' => ['active'],
]);

it('records an import when the document or a portion changes, even if no table does', function () {
    [$rows, $source] = diffDesired();
    $stored = storedRowsAfterImport($rows);
    $diff = fn (?LatestImport $latest) => (new ContentDiff)->between($rows, $stored, gradingVersionsOf($rows), $latest, $source->meta);

    $otherDocument = new LatestImport(1, str_repeat('a', 64), null, $source->meta->portionHashes);
    expect($diff($otherDocument)->recordImport)->toBeTrue()->and($diff($otherDocument)->changesTables())->toBeFalse();

    $otherPortion = new LatestImport(1, $source->documentHash(), null, ['guide' => str_repeat('b', 64)] + $source->meta->portionHashes);
    expect($diff($otherPortion)->recordImport)->toBeTrue();

    // Another source commit with the same content is not a change.
    expect($diff(latestImportFor($source, str_repeat('c', 40)))->isEmpty())->toBeTrue();
});

it('grading versions only grow: going back to one that already applied adds no other', function () {
    [$base] = diffDesired();
    $id = $base->rows('exercises')[3]['id'];
    // The database holds grading B, and A and B both applied; the document goes back to A.
    $versions = gradingVersionsOf($base) + ["{$id}\x1f".str_repeat('b', 64) => true];
    $stored = storedRowsAfterImport($base);
    $stored['exercises'][$id]['grading_hash'] = str_repeat('b', 64);
    [$rows, $source] = diffDesired();

    $plan = (new ContentDiff)->between($rows, $stored, $versions, null, $source->meta);

    expect($plan->gradingVersions)->toBe([])
        ->and($plan->report->gradingChanged)->toBe([$id])
        ->and(Arr::pluck($plan->writes['exercises'], 'id'))->toBe([$id]);
});
