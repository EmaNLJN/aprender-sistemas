<?php

use App\Content\BodyCache;
use App\Content\Portion;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\ContentDatabase;
use Tests\Support\ContentFixture;

// Los recursos de contenido por HTTP, contra MySQL real y con la caché de cuerpos en su store
// `database` (phpunit.xml pone CACHE_STORE=array sólo para el store por omisión).
afterEach(fn () => ContentFixture::cleanup());

function importedMeta(): array
{
    Artisan::call('content:import');

    return json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true);
}

function etagOf(string $hash): string
{
    return '"'.substr($hash, 0, 32).'"';
}

it('responde 503 en JSON, con Retry-After, mientras no haya un import', function (string $url) {
    $this->get($url)
        ->assertStatus(503)
        ->assertHeader('Retry-After', '60')
        ->assertJson(['code' => 'content_not_imported', 'message' => 'Todavía no hay contenido importado.']);
})->with(['/api/exercises?catalog=lab&language=rust', '/api/exercises/rust-01', '/api/worlds?language=go', '/api/workshops?domain=pc', '/api/atlas?language=rust', '/api/guide']);

it('sirve cada porción con los bytes del generador y sus cabeceras (US2)', function (Portion $portion) {
    $meta = importedMeta();

    $response = $this->get(ContentDatabase::url($portion));

    $response->assertOk()->assertHeader('Content-Type', 'application/json')
        ->assertHeader('ETag', etagOf($meta['portions'][$portion->value]))
        ->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32))
        ->assertHeaderMissing('Vary');
    expect(hash('sha256', $response->getContent()))->toBe($meta['portions'][$portion->value])
        ->and($response->headers->get('Cache-Control'))->toContain('private')->toContain('no-cache');
})->with(Portion::cases());

it('sirve cada ejercicio con los bytes de su contentHash', function () {
    $meta = importedMeta();

    $wrong = [];
    foreach ($meta['exercises'] as $id => $hashes) {
        $response = $this->get("/api/exercises/{$id}");
        if ($response->status() !== 200 || hash('sha256', $response->getContent()) !== $hashes['contentHash'] || $response->headers->get('ETag') !== etagOf($hashes['contentHash'])) {
            $wrong[] = $id;
        }
    }

    expect($wrong)->toBe([]);
});

it('responde 304 al ETag fuerte, al débil que deja Nginx al comprimir y a *, sin armar nada (US3)', function () {
    $meta = importedMeta();
    $url = ContentDatabase::url(Portion::LabRust);
    $etag = etagOf($meta['portions']['lab.rust']);

    foreach ([$etag, "W/{$etag}", "\"otro\", {$etag}", '*'] as $header) {
        $response = null;
        $queries = ContentDatabase::queriesDuring(function () use (&$response, $url, $header) {
            $response = $this->withHeaders(['If-None-Match' => $header])->get($url);
        });
        $response->assertStatus(304)->assertHeader('ETag', $etag)->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32));
        expect($response->getContent())->toBe('')
            // Un 304 sólo consulta cuál fue el último import.
            ->and($queries)->toHaveCount(1)->and($queries[0])->toContain('content_imports');
    }
    $this->withHeaders(['If-None-Match' => '"otro"'])->get($url)->assertOk();
});

it('responde 304 a un ejercicio activo, fuerte o débil: lee el último import y su fila, nada más (FR-018)', function () {
    $meta = importedMeta();
    $id = array_key_first($meta['exercises']);
    $etag = etagOf($meta['exercises'][$id]['contentHash']);

    foreach ([$etag, "W/{$etag}", '*'] as $header) {
        $response = null;
        $queries = ContentDatabase::queriesDuring(function () use (&$response, $id, $header) {
            $response = $this->withHeaders(['If-None-Match' => $header])->get("/api/exercises/{$id}");
        });
        $response->assertStatus(304)->assertHeader('ETag', $etag)->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32))->assertHeaderMissing('Vary');
        expect($response->getContent())->toBe('')
            ->and($response->headers->get('Cache-Control'))->toContain('private')->toContain('no-cache')
            // Un ejercicio retirado responde 410 antes que 304: por eso, además del último import, se lee su fila.
            ->and($queries)->toHaveCount(2)->and($queries[0])->toContain('content_imports')->and($queries[1])->toContain('exercises');
    }
});

it('el primer pedido después de un import sale de la caché: no consulta las tablas de contenido', function () {
    importedMeta();

    $queries = ContentDatabase::queriesDuring(fn () => $this->get(ContentDatabase::url(Portion::CoresInfra))->assertOk());

    expect(array_filter($queries, fn (string $sql) => preg_match('/from `(exercises|exercise_tests|exercise_hints|topics)`/', $sql) === 1))->toBe([]);
});

it('con la caché vacía arma el mismo cuerpo y la vuelve a llenar; una entrada adulterada no se sirve', function () {
    $meta = importedMeta();
    $portion = Portion::AtlasGo;
    $hash = $meta['portions']['atlas.go'];
    $url = ContentDatabase::url($portion);

    DB::table('cache')->delete();
    $cold = $this->get($url);
    expect(hash('sha256', $cold->getContent()))->toBe($hash)->and(app(BodyCache::class)->has($portion, $hash))->toBeTrue();

    DB::table('cache')->where('key', 'like', "%content-body:atlas.go:{$hash}")->update(['value' => serialize('{"adulterado":true}')]);
    $tampered = $this->get($url);

    expect(hash('sha256', $tampered->getContent()))->toBe($hash);
});

it('responde 422 con un mensaje por parámetro cuando falta o sobra uno (FR-016)', function (string $url, array $parameters) {
    $response = $this->get($url)->assertStatus(422)->assertJson(['code' => 'validation_failed']);

    expect(array_keys($response->json('errors')))->toBe($parameters);
})->with([
    'sin catálogo' => ['/api/exercises', ['catalog']],
    'lab sin lenguaje' => ['/api/exercises?catalog=lab', ['language']],
    'cores con lenguaje' => ['/api/exercises?catalog=cores&language=rust', ['language', 'domain']],
    'lenguaje desconocido' => ['/api/worlds?language=cobol', ['language']],
    'talleres con lenguaje' => ['/api/workshops?domain=pc&language=rust', ['language']],
]);

it('responde 404 a un ejercicio que no existe, y a un ID mal formado sin consultar la base', function () {
    importedMeta();

    $this->get('/api/exercises/rust-999')->assertNotFound()->assertJson(['code' => 'not_found']);
    $malformed = [];
    foreach (['RUST-01', 'rust 01', str_repeat('a', 65), '-rust', "rust-01\n"] as $id) {
        $queries = ContentDatabase::queriesDuring(fn () => $this->get('/api/exercises/'.rawurlencode($id))->assertNotFound());
        if ($queries !== []) {
            $malformed[] = $id;
        }
    }
    expect($malformed)->toBe([]);
});

it('responde 410 con los datos del ejercicio retirado, antes que un 304 (US4)', function () {
    $meta = importedMeta();
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    $title = $fixture->exercise($gone)->title;
    config(['content.path' => $fixture->withoutExercise($gone)->write()]);
    Artisan::call('content:import');

    $response = $this->withHeaders(['If-None-Match' => etagOf($meta['exercises'][$gone]['contentHash'])])->get("/api/exercises/{$gone}");

    $response->assertStatus(410)->assertJson(['code' => 'content_retired', 'id' => $gone, 'title' => $title]);
    expect(array_keys($response->json()))->toBe(['message', 'code', 'id', 'title', 'retiredAt'])
        ->and($response->json('retiredAt'))->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/');
});

it('después de un import cambia el validador de la porción que cambió y las otras 16 siguen en 304 (US3)', function () {
    $meta = importedMeta();
    $validators = [];
    foreach (Portion::cases() as $portion) {
        $validators[$portion->value] = $this->get(ContentDatabase::url($portion))->headers->get('ETag');
    }
    $fixture = ContentFixture::fromImage();
    $fixture->exercise($fixture->document->lab->rust[3]->id)->intro .= ' (revisado)';
    config(['content.path' => $fixture->write()]);
    Artisan::call('content:import');

    $statuses = [];
    foreach (Portion::cases() as $portion) {
        $statuses[$portion->value] = $this->withHeaders(['If-None-Match' => $validators[$portion->value]])->get(ContentDatabase::url($portion))->status();
    }

    expect(array_keys(array_filter($statuses, fn (int $status) => $status === 200)))->toBe(['lab.rust'])
        ->and(count(array_filter($statuses, fn (int $status) => $status === 304)))->toBe(16);
});

it('una imagen nueva con el mismo contenido da 304 en las 17 porciones y la misma versión (US3)', function () {
    importedMeta();
    $validators = [];
    $version = null;
    foreach (Portion::cases() as $portion) {
        $response = $this->get(ContentDatabase::url($portion));
        $validators[$portion->value] = $response->headers->get('ETag');
        $version = $response->headers->get('Content-Version');
    }
    // Otro build de la API trae el mismo contenido, con otro commit de origen.
    config(['content.path' => ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => str_repeat('e', 40)] + $meta)]);
    Artisan::call('content:import');

    $statuses = [];
    foreach (Portion::cases() as $portion) {
        $response = $this->withHeaders(['If-None-Match' => $validators[$portion->value]])->get(ContentDatabase::url($portion));
        $statuses[] = [$response->status(), $response->headers->get('Content-Version')];
    }

    expect(array_unique($statuses, SORT_REGULAR))->toBe([[304, $version]]);
});

it('Content-Version cambia cuando cambia el documento, así un import en medio de un arranque se detecta (FR-020)', function () {
    importedMeta();
    $before = $this->get(ContentDatabase::url(Portion::Guide))->headers->get('Content-Version');
    $fixture = ContentFixture::fromImage();
    $fixture->exercise($fixture->document->lab->rust[3]->id)->intro .= ' (revisado)';
    config(['content.path' => $fixture->write()]);
    Artisan::call('content:import');

    $after = $this->get(ContentDatabase::url(Portion::Guide))->headers->get('Content-Version');

    expect($after)->toMatch('/^[0-9a-f]{32}$/')->not->toBe($before);
});

it('si el cuerpo armado no tiene el hash del import, no lo sirve: 503 maintenance, y lo deja en el log', function () {
    importedMeta();
    DB::table('cache')->delete();
    // Un php viejo que sigue atendiendo después del COMMIT de un import nuevo: el registro dice otro hash.
    $hashes = json_decode(DB::table('content_imports')->value('portion_hashes'), true);
    $hashes['guide'] = str_repeat('a', 64);
    DB::table('content_imports')->update(['portion_hashes' => json_encode($hashes)]);
    Log::spy();

    $this->get('/api/guide')->assertStatus(503)->assertHeader('Retry-After', '5')->assertJson(['code' => 'maintenance']);

    Log::shouldHaveReceived('error')->once();
    expect(DB::table('cache')->where('key', 'like', '%content-body:guide:%')->count())->toBe(0);
});

it('si el ejercicio armado no tiene su content_hash, no lo sirve: 503 maintenance, y lo deja en el log', function () {
    $meta = importedMeta();
    $id = array_key_first($meta['exercises']);
    // La fila dice otro content_hash que el de los bytes que salen de las tablas.
    DB::table('exercises')->where('id', $id)->update(['content_hash' => str_repeat('a', 64)]);
    Log::spy();

    $this->get("/api/exercises/{$id}")->assertStatus(503)->assertHeader('Retry-After', '5')->assertJson(['code' => 'maintenance']);

    Log::shouldHaveReceived('error')->once();
});
