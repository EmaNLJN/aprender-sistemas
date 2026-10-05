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
