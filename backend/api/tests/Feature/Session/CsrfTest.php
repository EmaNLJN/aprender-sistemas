<?php

use App\Models\User;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->enforceCsrf();
});

it('answers 419 csrf_token_mismatch to a POST without X-XSRF-TOKEN', function () {
    $this->browser->post('/api/probe/public')
        ->assertStatus(419)
        ->assertExactJson(['message' => 'La página venció: recargala e intentá de nuevo.', 'code' => 'csrf_token_mismatch']);
});

it('lets a POST through with the token of a previous GET', function () {
    $this->browser->get('/api/probe/public')->assertOk();

    $this->browser->post('/api/probe/public')->assertOk();
});

it('answers 419 to a POST with the token of another session', function () {
    $this->browser->get('/api/probe/public');
    $another = Browser::for($this)->useDatabaseDrivers()->enforceCsrf();
    $another->get('/api/probe/public');

    $this->browser->withCookie('XSRF-TOKEN', (string) $another->cookie('XSRF-TOKEN'))
        ->post('/api/probe/public')
        ->assertStatus(419);
});

it('answers 419 before 403, 401 and 409', function () {
    $user = User::factory()->create();
    $this->browser->get('/api/probe/public');
    $this->browser->signIn($user);
    $this->browser->forget('XSRF-TOKEN');

    $this->browser->withAccountHeader('999999')->post('/api/probe/account')->assertStatus(419);
});

it('decides on Sec-Fetch-Site before the token: only same-origin skips it', function (string $site, int $status) {
    $this->browser->get('/api/probe/public');
    $this->browser->forget('XSRF-TOKEN')->withHeader('Sec-Fetch-Site', $site);

    $this->browser->post('/api/probe/public')->assertStatus($status);
})->with([
    'cross-site' => ['cross-site', 419],
    'same-site, a subdomain is not the same origin' => ['same-site', 419],
    'none, a navigation typed by the user' => ['none', 419],
    'same-origin' => ['same-origin', 200],
]);

it('does not skip the token for a matching Origin or Referer, which Laravel never reads', function (string $header) {
    $this->browser->get('/api/probe/public');
    $this->browser->forget('XSRF-TOKEN')->withHeader($header, 'http://localhost');

    $this->browser->post('/api/probe/public')->assertStatus(419);
})->with(['Origin', 'Referer']);
