<?php

use App\Content\Portion;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Tests\Support\Browser;
use Tests\Support\ContentDatabase;
use Tests\Support\ContentFixture;

beforeEach(function () {
    Artisan::call('content:import');
    $this->meta = ContentFixture::fromImage()->meta;
    $this->browser = Browser::for($this)->useDatabaseDrivers();
});

afterEach(fn () => ContentFixture::cleanup());

const CONTENT_URLS = [
    '/api/exercises?catalog=lab&language=rust',
    '/api/exercises/rust-01',
    '/api/worlds?language=go',
    '/api/workshops?domain=pc',
    '/api/atlas?language=rust',
    '/api/guide',
];

function contentEtag(string $hash): string
{
    return '"'.substr($hash, 0, 32).'"';
}

it('answers 401 unauthenticated, in JSON and without a piece of content, with and without Accept', function (string $url, bool $acceptsJson) {
    $browser = $acceptsJson ? $this->browser : $this->browser->withoutAccept();

    $response = $browser->get($url);

    $response->assertStatus(401)
        ->assertExactJson(['message' => 'Iniciá sesión para continuar.', 'code' => 'unauthenticated']);
    expect($response->headers->get('Content-Type'))->toContain('application/json')
        ->and($response->headers->has('ETag'))->toBeFalse()
        ->and($response->headers->has('Content-Version'))->toBeFalse();
})->with(CONTENT_URLS)->with([true, false]);

it('answers 403 email_unverified to an account without a verified email, without content', function (string $url) {
    $this->browser->signIn(User::factory()->unverified()->create());

    $this->browser->get($url)
        ->assertStatus(403)
        ->assertExactJson(['message' => 'Verificá tu email para continuar.', 'code' => 'email_unverified']);
})->with(CONTENT_URLS);

it('gives an admin the same body and headers as a student', function (string $url) {
    $student = Browser::for($this)->useDatabaseDrivers()->signIn(User::factory()->create());
    $expected = $student->get($url)->assertOk();
    $this->browser->signIn(User::factory()->admin()->create());

    $response = $this->browser->get($url)->assertOk();

    expect($response->getContent())->toBe($expected->getContent())
        ->and($response->headers->get('ETag'))->toBe($expected->headers->get('ETag'))
        ->and($response->headers->get('Content-Version'))->toBe($expected->headers->get('Content-Version'))
        ->and($response->headers->get('Cache-Control'))->toBe($expected->headers->get('Cache-Control'));
})->with(CONTENT_URLS);

it('serves each portion with the generator bytes behind a session', function (Portion $portion) {
    $this->browser->signIn(User::factory()->create());
    $hash = $this->meta['portions'][$portion->value];

    $response = $this->browser->get(ContentDatabase::url($portion))->assertOk();

    expect(hash('sha256', $response->getContent()))->toBe($hash)
        ->and($response->headers->get('ETag'))->toBe(contentEtag($hash))
        ->and($response->headers->get('Content-Version'))->toBe(substr($this->meta['documentHash'], 0, 32));
})->with(Portion::cases());

it('serves each of the 274 exercises with the bytes of its contentHash behind a session', function () {
    $this->browser->signIn(User::factory()->create());

    $wrong = [];
    foreach ($this->meta['exercises'] as $id => $hashes) {
        $response = $this->browser->get("/api/exercises/{$id}");
        if ($response->status() !== 200 || hash('sha256', $response->getContent()) !== $hashes['contentHash']) {
            $wrong[] = $id;
        }
    }

    expect($this->meta['exercises'])->toHaveCount(274)->and($wrong)->toBe([]);
});

it('keeps Cache-Control private, no-cache, without Vary or rate-limit headers', function (string $url) {
    $this->browser->signIn(User::factory()->create());

    $response = $this->browser->get($url)->assertOk();

    $directives = collect(explode(',', $response->headers->get('Cache-Control')))->map(fn (string $directive) => trim($directive))->sort()->values()->all();
    expect($directives)->toBe(['no-cache', 'private'])
        ->and($response->headers->has('Vary'))->toBeFalse()
        ->and($response->headers->has('X-RateLimit-Limit'))->toBeFalse()
        ->and($response->headers->has('X-RateLimit-Remaining'))->toBeFalse();
})->with(CONTENT_URLS);

it('answers 304 to a strong and to a weak If-None-Match behind a session', function () {
    $this->browser->signIn(User::factory()->create());
    $etag = contentEtag($this->meta['portions']['lab.rust']);

    foreach ([$etag, "W/{$etag}"] as $header) {
        $this->browser->withHeader('If-None-Match', $header)->get(ContentDatabase::url(Portion::LabRust))
            ->assertStatus(304)
            ->assertHeader('ETag', $etag);
    }
});
