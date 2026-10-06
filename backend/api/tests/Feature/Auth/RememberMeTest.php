<?php

use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
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
});

afterEach(fn () => Carbon::setTestNow());

function signInRemembered(Browser $browser, bool $remember): void
{
    $browser->post('/api/auth/login', ['email' => 'ana@x.com', 'password' => 'correct horse battery', 'remember' => $remember])->assertOk();
}

it('signs a student back in from the remember cookie once the session has expired', function () {
    signInRemembered($this->browser, remember: true);

    $this->travel(31)->minutes();

    $this->browser->get('/api/probe/account')->assertOk()->assertExactJson(['id' => $this->ana->id]);
    expect(DB::table('sessions')->where('user_id', $this->ana->id)->count())->toBe(1);
});

it('does not sign back in without the remember cookie once the session has expired', function () {
    signInRemembered($this->browser, remember: false);

    $this->travel(31)->minutes();

    $this->browser->get('/api/probe/account')->assertStatus(401)->assertJson(['code' => 'unauthenticated']);
});

it('stops honoring the remember cookie after signing out, and rotates the token', function () {
    signInRemembered($this->browser, remember: true);
    $recallerName = Auth::guard('web')->getRecallerName();
    $remember = (string) $this->browser->cookieStartingWith('remember_web_');
    $replayWithCookie = fn () => Browser::for($this)->useDatabaseDrivers()->withCookie($recallerName, $remember)->get('/api/probe/account');
    $replayWithCookie()->assertOk();
    $tokenBefore = $this->ana->fresh()->remember_token;

    $this->browser->withAccountHeader((string) $this->ana->id)->post('/api/auth/logout')->assertNoContent();

    expect($this->ana->fresh()->remember_token)->not->toBe($tokenBefore);
    $replayWithCookie()->assertStatus(401);
});
