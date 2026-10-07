<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

afterEach(fn () => $this->travelBack());

beforeEach(function () {
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers();
});

it('sets taller-session as HttpOnly and SameSite=Lax, with an encrypted value that is not the session id', function () {
    $response = $this->browser->get('/api/probe/public');

    $cookie = collect($response->headers->getCookies())->first(fn ($cookie) => $cookie->getName() === 'taller-session');
    $sessionId = DB::table('sessions')->value('id');

    expect($cookie)->not->toBeNull()
        ->and($cookie->isHttpOnly())->toBeTrue()
        ->and($cookie->getSameSite())->toBe('lax')
        ->and($cookie->getPath())->toBe('/')
        ->and($cookie->getValue())->not->toBe($sessionId)
        ->and($cookie->getValue())->not->toContain($sessionId);
});

it('sets XSRF-TOKEN readable by the front', function () {
    $response = $this->browser->get('/api/probe/public');

    $cookie = collect($response->headers->getCookies())->first(fn ($cookie) => $cookie->getName() === 'XSRF-TOKEN');

    expect($cookie)->not->toBeNull()
        ->and($cookie->isHttpOnly())->toBeFalse();
});

it('stores a guest session with a null user and an encrypted payload', function () {
    $this->browser->get('/api/probe/public');

    $row = DB::table('sessions')->first();

    expect($row->user_id)->toBeNull()
        ->and(base64_decode((string) base64_decode($row->payload, true), true))->toContain('"iv"')
        ->and(base64_decode($row->payload, true))->not->toContain('_token');
});

it('ends the session after 31 minutes of inactivity', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);

    $this->travel(31)->minutes();

    $this->browser->get('/api/probe/public')->assertJson(['id' => null]);
});

it('keeps the session after 29 minutes of inactivity', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);

    $this->travel(29)->minutes();

    $this->browser->get('/api/probe/public')->assertJson(['id' => $user->id]);
});
