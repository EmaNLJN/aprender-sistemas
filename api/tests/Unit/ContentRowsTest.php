<?php

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\ContentSource;
use App\Content\ContentTables;
use App\Content\InvalidContent;
use App\Content\RowSet;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

function rowsOf(ContentFixture $fixture, ?Closure $editMeta = null): RowSet
{
    $rows = new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec);

    return $rows->fromSource(ContentSource::fromDirectory($fixture->write(editMeta: $editMeta)));
}

it('rejects a topic with two labels in the same language', function () {
    $fixture = ContentFixture::fromImage();
    [$first, $second] = $fixture->document->lab->rust;
    $second->topicId = $first->topicId;
    $second->topic = 'Another label';

    expect(fn () => rowsOf($fixture))->toThrow(
        InvalidContent::class,
        "curriculum.json: lab.rust[1].topic: el tema {$first->topicId} de rust ya se llama «{$first->topic}» y acá dice «Another label»",
    );
});

it('rejects a repeated exercise ID', function () {
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->lab->rust[0]->id;
    $fixture->document->lab->go[0]->id = $id;

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, "curriculum.json: lab.go[0].id: «{$id}» se repite");
});

it('rejects an exercise ID the API could never serve', function (string $id) {
    $fixture = ContentFixture::fromImage();
    $unreferenced = $fixture->unreferencedLabExercise();
    $position = array_search($unreferenced, array_column($fixture->document->lab->rust, 'id'), true);
    $fixture->exercise($unreferenced)->id = $id;

    expect(fn () => rowsOf($fixture))->toThrow(
        InvalidContent::class,
        "curriculum.json: lab.rust[{$position}].id: «{$id}» no es un ID de ejercicio válido: se esperaban minúsculas, dígitos y guiones, de 1 a 64 caracteres y sin empezar con guion",
    );
})->with([
    'an uppercase letter' => ['Rust-42'],
    'an underscore' => ['rust_42'],
    'a leading hyphen' => ['-rust-42'],
    'more than 64 characters' => [str_repeat('a', 65)],
    'a trailing line break' => ["rust-42\n"],
]);

it('accepts the shortest and the longest exercise ID, and one that starts with a digit', function (string $id) {
    $fixture = ContentFixture::fromImage();
    $fixture->exercise($fixture->unreferencedLabExercise())->id = $id;

    expect(rowsOf($fixture)->keyed('exercises'))->toHaveKey($id);
})->with([
    'one character' => ['a'],
    'a digit first' => ['0-intro'],
    'the longest, 64 characters' => [str_repeat('a', 64)],
]);

it('rejects a key without a rule and a missing required key', function () {
    $extra = ContentFixture::fromImage();
    $extra->document->lab->rust[0]->extra = 1;
    expect(fn () => rowsOf($extra))->toThrow(InvalidContent::class, 'curriculum.json: lab.rust[0].extra: clave desconocida');

    $missing = ContentFixture::fromImage();
    unset($missing->document->lab->rust[0]->minutes);
    expect(fn () => rowsOf($missing))->toThrow(InvalidContent::class, 'curriculum.json: lab.rust[0]: falta la clave «minutes»');
});

it('requires the boss to be the last challenge of the world', function () {
    $fixture = ContentFixture::fromImage();
    $world = $fixture->document->campaign->go[0];
    $world->bossId = $world->trainingIds[0];

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, 'curriculum.json: campaign.go[0].bossId: el jefe tiene que ser el último de challengeIds');
});

// ContentRows checks that each ID exists before the codec runs, so the codec's own check is only reachable directly.
it('rejects a world that lists an ID that is not a text', function () {
    $world = ContentFixture::fromImage()->document->campaign->rust[0];
    $world->trainingIds[0] = 7;

    expect(fn () => (new WorldCodec)->toRows($world, 'rust', 0, 'campaign.rust[0]'))
        ->toThrow(InvalidContent::class, 'curriculum.json: campaign.rust[0].trainingIds: se esperaba una lista de IDs');
});

it('ties each world, workshop and concept to existing exercises of the right catalog and language', function (Closure $break, string $message) {
    $fixture = ContentFixture::fromImage();
    $break($fixture->document, $fixture);

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, $message);
})->with([
    'a world names a nonexistent exercise' => [
        fn (stdClass $document) => $document->campaign->rust[0]->trainingIds[0] = 'no-such-exercise',
        'curriculum.json: campaign.rust[0].trainingIds[0]: se esperaba un ejercicio de lab en rust',
    ],
    'a challenge from another language' => [
        fn (stdClass $document, ContentFixture $fixture) => $document->campaign->rust[0]->challengeIds[0] = $document->quests->go[0]->id,
        'curriculum.json: campaign.rust[0].challengeIds[0]: se esperaba un ejercicio de quests en rust',
    ],
    'the Atlas points to a challenge instead of a lab exercise' => [
        fn (stdClass $document) => $document->atlas->rust[0]->labId = $document->quests->rust[0]->id,
        'curriculum.json: atlas.rust[0].labId: se esperaba un ejercicio de lab en rust',
    ],
    'a workshop relates an exercise from another language' => [
        fn (stdClass $document) => $document->workshops->infra[0]->related->rust[0] = $document->lab->go[0]->id,
        'curriculum.json: workshops.infra[0].related.rust[0]: se esperaba un ejercicio de rust',
    ],
    'the core of a workshop is a lab exercise' => [
        fn (stdClass $document) => $document->workshops->lowlevel[0]->code->rust = $document->lab->rust[0]->id,
        'curriculum.json: workshops.lowlevel[0].code.rust: se esperaba un núcleo de lowlevel en rust',
    ],
    'the workshopId of a core is not the workshop that lists it' => [
        function (stdClass $document) {
            $core = $document->cores->infra[0];
            $core->workshopId = $document->workshops->lowlevel[0]->id;
        },
        'curriculum.json: cores.infra[0].workshopId: no es el taller que lista a rust-',
    ],
    'a guide step asks for a nonexistent resource' => [
        fn (stdClass $document) => $document->guide->tracks->go->modules[0]->steps[0]->resourceIds[] = 'no-such-resource',
        '«no-such-resource» no es un recurso de guide.resources',
    ],
    'a per-language map in another order' => [
        function (stdClass $document) {
            $bridge = $document->workshops->lowlevel[0]->bridge;
            $document->workshops->lowlevel[0]->bridge = (object) ['go' => $bridge->go, 'rust' => $bridge->rust];
        },
        'curriculum.json: workshops.lowlevel[0].bridge: un valor por lenguaje, en el orden de languages: rust, go',
    ],
]);

it('requires one key per published step and a contiguous catalog chain', function () {
    $fixture = ContentFixture::fromImage();
    expect(fn () => rowsOf($fixture, function (array $meta) {
        array_pop($meta['workshopSteps']['cache']);

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache: 3 claves para 4 etapas: regenerá los dos archivos juntos');

    expect(fn () => rowsOf($fixture, function (array $meta) {
        $meta['catalogs'][0]['chainPosition'] = 1;
        $meta['catalogs'][2]['chainPosition'] = 3;

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: catalogs: la cadena de catálogos tiene que ser única y contigua, desde 1');
});

it('requires the meta and the document to have the same exercises and workshops', function () {
    $missing = ContentFixture::fromImage();
    expect(fn () => rowsOf($missing, function (array $meta) {
        $meta['exercises']['rust-999'] = $meta['exercises']['rust-01'];

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: exercises.rust-999: no está en curriculum.json: regenerá los dos archivos juntos');

    expect(fn () => rowsOf(ContentFixture::fromImage(), function (array $meta) {
        unset($meta['workshopSteps']['cache']);

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache: falta: regenerá los dos archivos juntos');

    expect(fn () => rowsOf(ContentFixture::fromImage(), function (array $meta) {
        $meta['workshopSteps']['no-such-workshop'] = $meta['workshopSteps']['cache'];

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.no-such-workshop: no está en curriculum.json: regenerá los dos archivos juntos');
});

it('rejects a malformed record and names the field', function (Closure $break, string $message) {
    $fixture = ContentFixture::fromImage();
    $break($fixture->document);

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, $message);
})->with([
    'an empty text' => [
        fn (stdClass $document) => $document->lab->rust[0]->title = '',
        'curriculum.json: lab.rust[0].title: se esperaba un texto no vacío',
    ],
    'a number that is a text' => [
        fn (stdClass $document) => $document->lab->rust[0]->stage = '1',
        'curriculum.json: lab.rust[0].stage: se esperaba un entero',
    ],
    'a boolean that is a text' => [
        fn (stdClass $document) => $document->guide->resources[0]->featured = 'yes',
        'curriculum.json: guide.resources[0].featured: se esperaba true o false',
    ],
    'an exercise without the text of its topic' => [
        fn (stdClass $document) => $document->lab->rust[0]->topic = '',
        'curriculum.json: lab.rust[0].topic: se esperaba un texto no vacío',
    ],
    'an exercise without tests' => [
        fn (stdClass $document) => $document->lab->rust[0]->tests = [],
        'curriculum.json: lab.rust[0].tests: se esperaba una lista no vacía',
    ],
    'an empty hint' => [
        fn (stdClass $document) => $document->lab->rust[0]->hints[0] = '  ',
        'curriculum.json: lab.rust[0].hints[0]: se esperaba un texto no vacío',
    ],
    'a workshop without related exercises in one language' => [
        fn (stdClass $document) => $document->workshops->lowlevel[0]->related->go = [],
        'curriculum.json: workshops.lowlevel[0].related.go: se esperaba una lista de ejercicios',
    ],
    'a world without challenges' => [
        fn (stdClass $document) => $document->campaign->rust[0]->challengeIds = [],
        'curriculum.json: campaign.rust[0].challengeIds: se esperaba una lista de IDs',
    ],
    'the guide with its keys in another order' => [
        function (stdClass $document) {
            $guide = $document->guide;
            $document->guide = (object) ['tracks' => $guide->tracks, 'resources' => $guide->resources, 'sources' => $guide->sources];
        },
        'curriculum.json: guide: las claves de la guía tienen que ser resources, tracks y sources, en ese orden',
    ],
    'the guide tracks in another order' => [
        function (stdClass $document) {
            $tracks = $document->guide->tracks;
            $document->guide->tracks = (object) ['go' => $tracks->go, 'rust' => $tracks->rust];
        },
        'curriculum.json: guide.tracks: un recorrido por lenguaje, en el orden de languages: rust, go',
    ],
]);

it('rejects a repeated test inside an exercise', function () {
    $fixture = ContentFixture::fromImage();
    $tests = $fixture->exercise('rust-01')->tests;
    $tests[1]->id = $tests[0]->id;

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, "curriculum.json: exercise_tests: la clave «rust-01 / {$tests[0]->id}» se repite");
});

it('builds the rows of a document with an unreferenced exercise taken out', function (string $language) {
    $before = rowsOf(ContentFixture::fromImage());
    $fixture = ContentFixture::fromImage();
    $id = $fixture->unreferencedLabExercise($language);
    $removedTests = count($fixture->exercise($id)->tests);

    $after = rowsOf($fixture->withoutExercise($id));

    expect($after->keyed('exercises'))->toHaveCount(count($before->keyed('exercises')) - 1)->not->toHaveKey($id)
        ->and($after->keyed('exercise_tests'))->toHaveCount(count($before->keyed('exercise_tests')) - $removedTests);
})->with(['rust', 'go']);

it('identifies each row by the columns of its primary key', function () {
    expect(ContentTables::keyOf('exercises', ['id' => 'rust-01', 'title' => 'x']))->toBe('rust-01')
        ->and(ContentTables::keyOf('exercise_tests', ['exercise_id' => 'rust-01', 'test_key' => 't1']))->toBe("rust-01\x1ft1")
        ->and(ContentTables::keyOf('exercise_hints', ['exercise_id' => 'rust-01', 'position' => 2]))->toBe("rust-01\x1f2");
});
