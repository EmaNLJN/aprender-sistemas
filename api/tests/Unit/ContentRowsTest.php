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

it('rechaza un tema con dos etiquetas en el mismo lenguaje', function () {
    $fixture = ContentFixture::fromImage();
    [$first, $second] = $fixture->document->lab->rust;
    $second->topicId = $first->topicId;
    $second->topic = 'Otra etiqueta';

    expect(fn () => rowsOf($fixture))->toThrow(
        InvalidContent::class,
        "curriculum.json: lab.rust[1].topic: el tema {$first->topicId} de rust ya se llama «{$first->topic}» y acá dice «Otra etiqueta»",
    );
});

it('rechaza un ID de ejercicio repetido', function () {
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->lab->rust[0]->id;
    $fixture->document->lab->go[0]->id = $id;

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, "curriculum.json: lab.go[0].id: «{$id}» se repite");
});

it('rechaza una clave sin regla y una clave obligatoria que falta', function () {
    $extra = ContentFixture::fromImage();
    $extra->document->lab->rust[0]->extra = 1;
    expect(fn () => rowsOf($extra))->toThrow(InvalidContent::class, 'curriculum.json: lab.rust[0].extra: clave desconocida');

    $missing = ContentFixture::fromImage();
    unset($missing->document->lab->rust[0]->minutes);
    expect(fn () => rowsOf($missing))->toThrow(InvalidContent::class, 'curriculum.json: lab.rust[0]: falta la clave «minutes»');
});

it('exige que el jefe sea el último desafío del mundo', function () {
    $fixture = ContentFixture::fromImage();
    $world = $fixture->document->campaign->go[0];
    $world->bossId = $world->trainingIds[0];

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, 'curriculum.json: campaign.go[0].bossId: el jefe tiene que ser el último de challengeIds');
});

it('ata cada mundo, taller y concepto a ejercicios que existen, del catálogo y del lenguaje que corresponden', function (Closure $break, string $message) {
    $fixture = ContentFixture::fromImage();
    $break($fixture->document, $fixture);

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, $message);
})->with([
    'un mundo nombra un ejercicio inexistente' => [
        fn (stdClass $document) => $document->campaign->rust[0]->trainingIds[0] = 'no-existe',
        'curriculum.json: campaign.rust[0].trainingIds[0]: se esperaba un ejercicio de lab en rust',
    ],
    'un desafío de otro lenguaje' => [
        fn (stdClass $document, ContentFixture $fixture) => $document->campaign->rust[0]->challengeIds[0] = $document->quests->go[0]->id,
        'curriculum.json: campaign.rust[0].challengeIds[0]: se esperaba un ejercicio de quests en rust',
    ],
    'el Atlas apunta a un desafío en lugar de a un ejercicio del recorrido' => [
        fn (stdClass $document) => $document->atlas->rust[0]->labId = $document->quests->rust[0]->id,
        'curriculum.json: atlas.rust[0].labId: se esperaba un ejercicio de lab en rust',
    ],
    'un taller relaciona un ejercicio de otro lenguaje' => [
        fn (stdClass $document) => $document->workshops->infra[0]->related->rust[0] = $document->lab->go[0]->id,
        'curriculum.json: workshops.infra[0].related.rust[0]: se esperaba un ejercicio de rust',
    ],
    'el núcleo de un taller es del recorrido' => [
        fn (stdClass $document) => $document->workshops->lowlevel[0]->code->rust = $document->lab->rust[0]->id,
        'curriculum.json: workshops.lowlevel[0].code.rust: se esperaba un núcleo de lowlevel en rust',
    ],
    'el workshopId de un núcleo no es el taller que lo lista' => [
        function (stdClass $document) {
            // El primer núcleo de infra con workshopId es el de su primer taller.
            $core = $document->cores->infra[0];
            $core->workshopId = $document->workshops->lowlevel[0]->id;
        },
        'curriculum.json: cores.infra[0].workshopId: no es el taller que lista a rust-',
    ],
    'un paso de la guía pide un recurso inexistente' => [
        fn (stdClass $document) => $document->guide->tracks->go->modules[0]->steps[0]->resourceIds[] = 'no-existe',
        '«no-existe» no es un recurso de guide.resources',
    ],
    'un mapa por lenguaje en otro orden' => [
        function (stdClass $document) {
            $bridge = $document->workshops->lowlevel[0]->bridge;
            $document->workshops->lowlevel[0]->bridge = (object) ['go' => $bridge->go, 'rust' => $bridge->rust];
        },
        'curriculum.json: workshops.lowlevel[0].bridge: un valor por lenguaje, en el orden de languages: rust, go',
    ],
]);

it('exige una clave por etapa publicada y la cadena de catálogos contigua', function () {
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

it('exige que el meta y el documento tengan los mismos ejercicios y talleres', function () {
    $missing = ContentFixture::fromImage();
    expect(fn () => rowsOf($missing, function (array $meta) {
        $meta['exercises']['rust-999'] = $meta['exercises']['rust-01'];

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: exercises.rust-999: no está en curriculum.json: regenerá los dos archivos juntos');

    expect(fn () => rowsOf(ContentFixture::fromImage(), function (array $meta) {
        unset($meta['workshopSteps']['cache']);

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache: falta: regenerá los dos archivos juntos');
});

// Cada regla de forma de un registro se prueba con un valor que la rompe, y el mensaje nombra el
// campo del documento: lo que ve quien corrige el contenido.
it('rechaza un registro mal formado y nombra el campo', function (Closure $break, string $message) {
    $fixture = ContentFixture::fromImage();
    $break($fixture->document);

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, $message);
})->with([
    'un texto vacío' => [
        fn (stdClass $document) => $document->lab->rust[0]->title = '',
        'curriculum.json: lab.rust[0].title: se esperaba un texto no vacío',
    ],
    'un número que es un texto' => [
        fn (stdClass $document) => $document->lab->rust[0]->stage = '1',
        'curriculum.json: lab.rust[0].stage: se esperaba un entero',
    ],
    'un booleano que es un texto' => [
        fn (stdClass $document) => $document->guide->resources[0]->featured = 'sí',
        'curriculum.json: guide.resources[0].featured: se esperaba true o false',
    ],
    'un ejercicio sin el texto de su tema' => [
        fn (stdClass $document) => $document->lab->rust[0]->topic = '',
        'curriculum.json: lab.rust[0].topic: se esperaba un texto no vacío',
    ],
    'un ejercicio sin pruebas' => [
        fn (stdClass $document) => $document->lab->rust[0]->tests = [],
        'curriculum.json: lab.rust[0].tests: se esperaba una lista no vacía',
    ],
    'una pista vacía' => [
        fn (stdClass $document) => $document->lab->rust[0]->hints[0] = '  ',
        'curriculum.json: lab.rust[0].hints[0]: se esperaba un texto no vacío',
    ],
    'un taller sin ejercicios relacionados en un lenguaje' => [
        fn (stdClass $document) => $document->workshops->lowlevel[0]->related->go = [],
        'curriculum.json: workshops.lowlevel[0].related.go: se esperaba una lista de ejercicios',
    ],
    'un mundo sin desafíos' => [
        fn (stdClass $document) => $document->campaign->rust[0]->challengeIds = [],
        'curriculum.json: campaign.rust[0].challengeIds: se esperaba una lista de IDs',
    ],
    'la guía con sus claves en otro orden' => [
        function (stdClass $document) {
            $guide = $document->guide;
            $document->guide = (object) ['tracks' => $guide->tracks, 'resources' => $guide->resources, 'sources' => $guide->sources];
        },
        'curriculum.json: guide: las claves de la guía tienen que ser resources, tracks y sources, en ese orden',
    ],
    'los recorridos de la guía en otro orden' => [
        function (stdClass $document) {
            $tracks = $document->guide->tracks;
            $document->guide->tracks = (object) ['go' => $tracks->go, 'rust' => $tracks->rust];
        },
        'curriculum.json: guide.tracks: un recorrido por lenguaje, en el orden de languages: rust, go',
    ],
]);

// Las pruebas de un ejercicio se identifican por (exercise_id, test_key): una repetida no puede
// pasar a la base, donde la clave primaria es lo único que lo impediría.
it('rechaza una prueba repetida dentro de un ejercicio', function () {
    $fixture = ContentFixture::fromImage();
    $tests = $fixture->exercise('rust-01')->tests;
    $tests[1]->id = $tests[0]->id;

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, "curriculum.json: exercise_tests: la clave «rust-01 / {$tests[0]->id}» se repite");
});

// unreferencedLabExercise() y withoutExercise() son el insumo de las pruebas del import: que el
// documento sin ese ejercicio siga siendo válido lo comprueban las referencias de ContentRows,
// que no dependen del fixture.
it('arma las filas de un documento al que se le saca un ejercicio que nada referencia', function (string $language) {
    $before = rowsOf(ContentFixture::fromImage());
    $fixture = ContentFixture::fromImage();
    $id = $fixture->unreferencedLabExercise($language);
    $removedTests = count($fixture->exercise($id)->tests);

    $after = rowsOf($fixture->withoutExercise($id));

    expect($after->keyed('exercises'))->toHaveCount(count($before->keyed('exercises')) - 1)->not->toHaveKey($id)
        ->and($after->keyed('exercise_tests'))->toHaveCount(count($before->keyed('exercise_tests')) - $removedTests);
})->with(['rust', 'go']);

// Las columnas de la clave se unen con \x1f: un carácter que ningún ID ni clave del contenido usa.
it('identifica cada fila por las columnas de su clave primaria', function () {
    expect(ContentTables::keyOf('exercises', ['id' => 'rust-01', 'title' => 'x']))->toBe('rust-01')
        ->and(ContentTables::keyOf('exercise_tests', ['exercise_id' => 'rust-01', 'test_key' => 't1']))->toBe("rust-01\x1ft1")
        ->and(ContentTables::keyOf('exercise_hints', ['exercise_id' => 'rust-01', 'position' => 2]))->toBe("rust-01\x1f2");
});
