<?php

use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter as RateLimiterFacade;
use Illuminate\Support\Sleep;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    useSampleBlockedPasswords();
    ProbeRoutes::register();
    Sleep::fake();
    Carbon::setTestNow(Carbon::now());
    $this->browser = Browser::for($this)->useDatabaseDrivers();
    RateLimiterFacade::swap(new RateLimiter(Cache::store()));
    $this->ana = User::factory()->withPassword('correct horse battery')->create(['email' => 'ana@x.com']);
    $this->signIn = function (bool $remember = false) {
        $this->browser->post('/api/auth/login', ['email' => 'ana@x.com', 'password' => 'correct horse battery', 'remember' => $remember])->assertOk();
        $this->browser->signedInAs($this->ana);
    };
});

afterEach(fn () => Carbon::setTestNow());

it('answers 204 without a body and the next request to an account route gets 401', function () {
    ($this->signIn)();

    $response = $this->browser->post('/api/auth/logout');

    $response->assertNoContent();
    expect($response->getContent())->toBe('');
    $this->browser->get('/api/probe/account')->assertStatus(401)->assertJson(['code' => 'unauthenticated']);
});

it('leaves no session row of this device that serves the account', function () {
    ($this->signIn)();
    $cookie = $this->browser->cookie('taller-session');

    $this->browser->post('/api/auth/logout')->assertNoContent();

    expect(DB::table('sessions')->where('user_id', $this->ana->id)->count())->toBe(0);
    $replay = Browser::for($this)->useDatabaseDrivers()->withCookie('taller-session', (string) $cookie);
    $replay->get('/api/probe/account')->assertStatus(401);
});

it('answers 401 to a sign out without a session', function () {
    $this->browser->post('/api/auth/logout')->assertStatus(401);
});

it('answers 409 to a sign out that does not carry the account header', function () {
    ($this->signIn)();

    $this->browser->withAccountHeader('999999')->post('/api/auth/logout')->assertStatus(409)->assertJson(['code' => 'account_mismatch']);
});
