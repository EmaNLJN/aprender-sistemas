<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(fn () => ProbeRoutes::register());

it('replays the cookies of each response and copies XSRF-TOKEN into X-XSRF-TOKEN', function () {
    $browser = Browser::for($this)->useDatabaseDrivers()->enforceCsrf();

    $browser->post('/api/probe/public')->assertStatus(419);
    $browser->get('/api/probe/public')->assertOk();

    expect($browser->cookie('XSRF-TOKEN'))->not->toBeNull();
    $browser->post('/api/probe/public')->assertOk();
});

it('forgets a cookie on demand', function () {
    $browser = Browser::for($this)->useDatabaseDrivers();
    $browser->get('/api/probe/public');

    $browser->forget('taller-session');

    expect($browser->cookie('taller-session'))->toBeNull();
});

it('sends the account header only once it is told who signed in, and lets a test override it', function () {
    $user = User::factory()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($user);

    $browser->post('/api/probe/account')->assertOk()->assertJson(['id' => $user->id]);
    $browser->withAccountHeader('999999')->post('/api/probe/account')->assertStatus(409);
});

it('reads the session cookie from the database driver once told to', function () {
    Browser::for($this)->useDatabaseDrivers()->get('/api/probe/public')->assertOk();

    expect(DB::table('sessions')->count())->toBe(1);
});
