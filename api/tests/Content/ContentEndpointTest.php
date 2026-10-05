<?php

use App\Content\BodyCache;
use App\Content\Portion;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\ContentDatabase;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

function metaAt(string $directory): array
{
    return json_decode(file_get_contents("{$directory}/curriculum.meta.json"), true);
}

function importedMeta(): array
{
    Artisan::call('content:import');

    return metaAt(ContentFixture::imagePath());
}

function etagOf(string $hash): string
{
    return '"'.substr($hash, 0, 32).'"';
}

/**
 * Runs `$act` once, right after the first query on `$table` that the request makes outside a transaction
 * (or inside one, with `$insideTransaction`): the exact point where a race is staged. A failure of `$act`
 * is for the test to check afterwards, because an exception thrown inside a query listener only surfaces
 * as a 500.
 */
function afterFirstQueryOn(string $table, Closure $act, bool $insideTransaction = false): void
{
    $fired = false;
    DB::listen(function ($query) use (&$fired, $table, $act, $insideTransaction) {
        if ($fired || ! str_contains($query->sql, "from `{$table}`") || (DB::transactionLevel() > 0) !== $insideTransaction) {
            return;
        }
        $fired = true;
        $act();
    });
}

/** An import of `$directory` that commits right after the request's first query on `$table`. */
function importAfterFirstQueryOn(string $table, string $directory): stdClass
{
    $import = (object) ['exit' => null, 'output' => ''];
    afterFirstQueryOn($table, function () use ($import, $directory) {
        config(['content.path' => $directory]);
        $import->exit = Artisan::call('content:import');
        $import->output = Artisan::output();
    });

    return $import;
}

/** Without this the race never happened and the test proves nothing. */
function expectImportedInTheMiddle(stdClass $import): void
{
    if ($import->exit !== 0) {
        throw new RuntimeException('The import in the middle of the request '.($import->exit === null ? 'never ran' : "exited with {$import->exit}: {$import->output}"));
    }
    expect(DB::table('content_imports')->count())->toBe(2);
}

/**
 * A write to the intro of `$id` that another connection commits once the request's snapshot has started:
 * the first query it makes inside a transaction is the one that fixes what the snapshot sees. A whole
 * import cannot be staged here, because the snapshot's connection is in a read-only transaction.
 */
function writeAfterSnapshotStarts(string $id): stdClass
{
    $write = (object) ['updated' => null];
    afterFirstQueryOn('content_imports', function () use ($write, $id) {
        $write->updated = DB::connectUsing('race-writer', config('database.connections.mysql'), true)
            ->table('exercises')->where('id', $id)->update(['intro' => 'Edited by a writer that commits while the body is built.']);
    }, insideTransaction: true);

    return $write;
}

function expectWrittenInTheMiddle(stdClass $write): void
{
    if ($write->updated === null) {
        throw new RuntimeException('The write in the middle of the request never ran: the request did not read inside a transaction.');
    }
    expect($write->updated)->toBe(1);
}

/** @return array{string, string} the directory of the image content with one lab.rust exercise revised, and that exercise's ID */
function reviseLabExercise(): array
{
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->lab->rust[3]->id;
    $fixture->exercise($id)->intro .= ' (revised)';

    return [$fixture->write(), $id];
}

it('responds 503 in JSON, with Retry-After, while there is no import', function (string $url) {
    $this->get($url)
        ->assertStatus(503)
        ->assertHeader('Retry-After', '60')
        ->assertJson(['code' => 'content_not_imported', 'message' => 'Todavía no hay contenido importado.']);
})->with(['/api/exercises?catalog=lab&language=rust', '/api/exercises/rust-01', '/api/worlds?language=go', '/api/workshops?domain=pc', '/api/atlas?language=rust', '/api/guide']);

it('serves each portion with the generator bytes and its headers (US2)', function (Portion $portion) {
    $meta = importedMeta();

    $response = $this->get(ContentDatabase::url($portion));

    $response->assertOk()->assertHeader('Content-Type', 'application/json')
        ->assertHeader('ETag', etagOf($meta['portions'][$portion->value]))
        ->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32))
        ->assertHeaderMissing('Vary');
    expect(hash('sha256', $response->getContent()))->toBe($meta['portions'][$portion->value])
        ->and($response->headers->get('Cache-Control'))->toContain('private')->toContain('no-cache');
})->with(Portion::cases());

it('serves each exercise with the bytes of its contentHash', function () {
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

it('responds 304 to the strong ETag, to the weak one Nginx leaves after compressing and to *, without building anything (US3)', function () {
    $meta = importedMeta();
    $url = ContentDatabase::url(Portion::LabRust);
    $etag = etagOf($meta['portions']['lab.rust']);

    foreach ([$etag, "W/{$etag}", "\"other\", {$etag}", '*'] as $header) {
        $response = null;
        $queries = ContentDatabase::queriesDuring(function () use (&$response, $url, $header) {
            $response = $this->withHeaders(['If-None-Match' => $header])->get($url);
        });
        $response->assertStatus(304)->assertHeader('ETag', $etag)->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32));
        expect($response->getContent())->toBe('')
            ->and($queries)->toHaveCount(1)->and($queries[0])->toContain('content_imports');
    }
    $this->withHeaders(['If-None-Match' => '"other"'])->get($url)->assertOk();
});

it('responds 304 to an active exercise, strong or weak: it reads the latest import and the exercise row, nothing else (FR-018)', function () {
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
            ->and($queries)->toHaveCount(2)->and($queries[0])->toContain('content_imports')->and($queries[1])->toContain('exercises');
    }
});

it('serves the first request after an import from the cache, without querying the content tables', function () {
    importedMeta();

    $queries = ContentDatabase::queriesDuring(fn () => $this->get(ContentDatabase::url(Portion::CoresInfra))->assertOk());

    expect(array_filter($queries, fn (string $sql) => preg_match('/from `(exercises|exercise_tests|exercise_hints|topics)`/', $sql) === 1))->toBe([]);
});

it('builds the same body when the cache is empty and refills it; a tampered entry is not served', function () {
    $meta = importedMeta();
    $portion = Portion::AtlasGo;
    $hash = $meta['portions']['atlas.go'];
    $url = ContentDatabase::url($portion);

    DB::table('cache')->delete();
    $cold = $this->get($url);
    expect(hash('sha256', $cold->getContent()))->toBe($hash)->and(app(BodyCache::class)->has($portion, $hash))->toBeTrue();

    DB::table('cache')->where('key', 'like', "%content-body:atlas.go:{$hash}")->update(['value' => serialize('{"tampered":true}')]);
    $tampered = $this->get($url);

    expect(hash('sha256', $tampered->getContent()))->toBe($hash);
});

it('responds 422 with one message per parameter when one is missing or extra (FR-016)', function (string $url, array $parameters) {
    $response = $this->get($url)->assertStatus(422)->assertJson(['code' => 'validation_failed']);

    expect(array_keys($response->json('errors')))->toBe($parameters);
})->with([
    'no catalog' => ['/api/exercises', ['catalog']],
    'lab without language' => ['/api/exercises?catalog=lab', ['language']],
    'cores with language' => ['/api/exercises?catalog=cores&language=rust', ['language', 'domain']],
    'unknown language' => ['/api/worlds?language=cobol', ['language']],
    'workshops with language' => ['/api/workshops?domain=pc&language=rust', ['language']],
]);

it('responds 404 to an exercise that does not exist, and to a malformed ID without querying the database', function () {
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

it('responds 410 with the data of the retired exercise, before a 304 (US4)', function () {
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

it('changes only the validator of the portion an import changed; the other 16 stay at 304 (US3)', function () {
    $meta = importedMeta();
    $validators = [];
    foreach (Portion::cases() as $portion) {
        $validators[$portion->value] = $this->get(ContentDatabase::url($portion))->headers->get('ETag');
    }
    $fixture = ContentFixture::fromImage();
    $fixture->exercise($fixture->document->lab->rust[3]->id)->intro .= ' (revised)';
    config(['content.path' => $fixture->write()]);
    Artisan::call('content:import');

    $statuses = [];
    foreach (Portion::cases() as $portion) {
        $statuses[$portion->value] = $this->withHeaders(['If-None-Match' => $validators[$portion->value]])->get(ContentDatabase::url($portion))->status();
    }

    expect(array_keys(array_filter($statuses, fn (int $status) => $status === 200)))->toBe(['lab.rust'])
        ->and(count(array_filter($statuses, fn (int $status) => $status === 304)))->toBe(16);
});

it('gives 304 on all 17 portions, with the same version, after a new image with the same content (US3)', function () {
    importedMeta();
    $validators = [];
    $version = null;
    foreach (Portion::cases() as $portion) {
        $response = $this->get(ContentDatabase::url($portion));
        $validators[$portion->value] = $response->headers->get('ETag');
        $version = $response->headers->get('Content-Version');
    }
    config(['content.path' => ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => str_repeat('e', 40)] + $meta)]);
    Artisan::call('content:import');

    $statuses = [];
    foreach (Portion::cases() as $portion) {
        $response = $this->withHeaders(['If-None-Match' => $validators[$portion->value]])->get(ContentDatabase::url($portion));
        $statuses[] = [$response->status(), $response->headers->get('Content-Version')];
    }

    expect(array_unique($statuses, SORT_REGULAR))->toBe([[304, $version]]);
});

it('changes Content-Version when the document changes, so an import in the middle of a startup is detected (FR-020)', function () {
    importedMeta();
    $before = $this->get(ContentDatabase::url(Portion::Guide))->headers->get('Content-Version');
    $fixture = ContentFixture::fromImage();
    $fixture->exercise($fixture->document->lab->rust[3]->id)->intro .= ' (revised)';
    config(['content.path' => $fixture->write()]);
    Artisan::call('content:import');

    $after = $this->get(ContentDatabase::url(Portion::Guide))->headers->get('Content-Version');

    expect($after)->toMatch('/^[0-9a-f]{32}$/')->not->toBe($before);
});

it('does not serve a built body that lacks the import hash, as a stale php would after an import: 503 maintenance, logged (FR-044)', function () {
    importedMeta();
    DB::table('cache')->delete();
    $hashes = json_decode(DB::table('content_imports')->value('portion_hashes'), true);
    $hashes['guide'] = str_repeat('a', 64);
    DB::table('content_imports')->update(['portion_hashes' => json_encode($hashes)]);
    Log::spy();

    $this->get('/api/guide')->assertStatus(503)->assertHeader('Retry-After', '5')->assertJson(['code' => 'maintenance']);

    Log::shouldHaveReceived('error')->once();
    expect(DB::table('cache')->where('key', 'like', '%content-body:guide:%')->count())->toBe(0);
});

it('does not serve a built exercise that lacks its content_hash: 503 maintenance, logged (FR-044)', function () {
    $meta = importedMeta();
    $id = array_key_first($meta['exercises']);
    DB::table('exercises')->where('id', $id)->update(['content_hash' => str_repeat('a', 64)]);
    Log::spy();

    $this->get("/api/exercises/{$id}")->assertStatus(503)->assertHeader('Retry-After', '5')->assertJson(['code' => 'maintenance']);

    Log::shouldHaveReceived('error')->once();
});

it('serves the new import whole when one commits right after the request read the latest (FR-044)', function () {
    importedMeta();
    [$directory] = reviseLabExercise();
    $next = metaAt($directory);
    $import = importAfterFirstQueryOn('content_imports', $directory);

    $response = $this->get(ContentDatabase::url(Portion::LabRust));

    expectImportedInTheMiddle($import);
    $response->assertOk()
        ->assertHeader('ETag', etagOf($next['portions']['lab.rust']))
        ->assertHeader('Content-Version', substr($next['documentHash'], 0, 32));
    expect(hash('sha256', $response->getContent()))->toBe($next['portions']['lab.rust']);
});

it('answers 304 when the import that committed in the middle is the one the client already has (FR-044)', function () {
    importedMeta();
    [$directory] = reviseLabExercise();
    $next = metaAt($directory);
    $import = importAfterFirstQueryOn('content_imports', $directory);

    $response = $this->withHeaders(['If-None-Match' => etagOf($next['portions']['lab.rust'])])->get(ContentDatabase::url(Portion::LabRust));

    expectImportedInTheMiddle($import);
    $response->assertStatus(304)
        ->assertHeader('ETag', etagOf($next['portions']['lab.rust']))
        ->assertHeader('Content-Version', substr($next['documentHash'], 0, 32));
    expect($response->getContent())->toBe('');
});

it('answers 410 to an exercise that an import retires right after the request read its row (FR-015)', function () {
    importedMeta();
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    $title = $fixture->exercise($gone)->title;
    $import = importAfterFirstQueryOn('exercises', $fixture->withoutExercise($gone)->write());

    $response = $this->get("/api/exercises/{$gone}");

    expectImportedInTheMiddle($import);
    $response->assertStatus(410)->assertJson(['code' => 'content_retired', 'id' => $gone, 'title' => $title]);
    expect($response->json('retiredAt'))->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/');
});

it('serves an exercise with the bytes an import changed right after the request read its row (FR-044)', function () {
    importedMeta();
    [$directory, $id] = reviseLabExercise();
    $next = metaAt($directory);
    $import = importAfterFirstQueryOn('exercises', $directory);

    $response = $this->get("/api/exercises/{$id}");

    expectImportedInTheMiddle($import);
    $response->assertOk()
        ->assertHeader('ETag', etagOf($next['exercises'][$id]['contentHash']))
        ->assertHeader('Content-Version', substr($next['documentHash'], 0, 32));
    expect(hash('sha256', $response->getContent()))->toBe($next['exercises'][$id]['contentHash']);
});

it('builds a portion from one snapshot: a write that commits while it is built does not reach it (FR-044)', function () {
    $meta = importedMeta();
    DB::table('cache')->delete();
    $write = writeAfterSnapshotStarts(ContentFixture::fromImage()->document->lab->rust[3]->id);

    $response = $this->get(ContentDatabase::url(Portion::LabRust));

    expectWrittenInTheMiddle($write);
    $response->assertOk()->assertHeader('ETag', etagOf($meta['portions']['lab.rust']));
    expect(hash('sha256', $response->getContent()))->toBe($meta['portions']['lab.rust']);
});

it('builds an exercise from one snapshot: a write that commits while it is built does not reach it (FR-044)', function () {
    $meta = importedMeta();
    $id = array_key_first($meta['exercises']);
    $write = writeAfterSnapshotStarts($id);

    $response = $this->get("/api/exercises/{$id}");

    expectWrittenInTheMiddle($write);
    $response->assertOk()->assertHeader('ETag', etagOf($meta['exercises'][$id]['contentHash']));
    expect(hash('sha256', $response->getContent()))->toBe($meta['exercises'][$id]['contentHash']);
});
