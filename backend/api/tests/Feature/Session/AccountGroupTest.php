<?php

use App\Auth\AccountStatus;
use App\Models\User;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers();
});

it('answers 401 unauthenticated in JSON to a guest without Accept', function () {
    $this->browser->withoutAccept()->get('/api/probe/account')
        ->assertUnauthorized()
        ->assertHeader('Content-Type', 'application/json')
        ->assertExactJson(['message' => 'Iniciá sesión para continuar.', 'code' => 'unauthenticated']);
});

it('serves the account to a signed in user', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user)->get('/api/probe/account')->assertOk()->assertJson(['id' => $user->id]);
});

it('answers 403 account_disabled to the request that finds the account disabled, and 401 to the next one', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);
    $user->forceFill(['status' => AccountStatus::Disabled])->save();

    $this->browser->get('/api/probe/account')
        ->assertForbidden()
        ->assertJsonPath('code', 'account_disabled');
    $this->browser->get('/api/probe/account')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');
});

it('answers 401 to an account that is being deleted', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);
    $user->forceFill(['status' => AccountStatus::Deleting])->save();

    $this->browser->get('/api/probe/account')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
});

it('lets a public route answer a guest when the session is invalid', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);
    $user->forceFill(['status' => AccountStatus::Disabled])->save();

    $this->browser->get('/api/probe/public')->assertOk()->assertExactJson(['id' => null]);
});
