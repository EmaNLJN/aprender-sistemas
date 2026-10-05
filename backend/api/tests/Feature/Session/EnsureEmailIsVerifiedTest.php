<?php

use App\Models\User;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers();
});

it('answers 403 email_unverified to an account whose email is not verified', function () {
    $this->browser->signIn(User::factory()->unverified()->create())->get('/api/probe/study')
        ->assertForbidden()
        ->assertExactJson(['message' => 'Verificá tu email para continuar.', 'code' => 'email_unverified']);
});

it('lets a verified account through', function () {
    $user = User::factory()->create();

    $this->browser->signIn($user)->get('/api/probe/study')->assertOk()->assertJson(['id' => $user->id]);
});

it('does not ask an unverified account for verification on a route that is not for study', function () {
    $this->browser->signIn(User::factory()->unverified()->create())->get('/api/probe/account')->assertOk();
});
