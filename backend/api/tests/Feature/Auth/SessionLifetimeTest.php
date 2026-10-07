<?php

use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
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
    $this->workContinuouslyFor = function (int $minutes): void {
        foreach (range(1, intdiv($minutes, 25)) as $ignored) {
            $this->travel(25)->minutes();
            $this->browser->get('/api/probe/account')->assertOk();
        }
        $this->travel($minutes % 25)->minutes();
    };
});

afterEach(fn () => Carbon::setTestNow());

function signInAna(Browser $browser, bool $remember): void
{
    $browser->post('/api/auth/login', ['email' => 'ana@x.com', 'password' => 'correct horse battery', 'remember' => $remember])->assertOk();
}

it('expires after 31 minutes of inactivity', function () {
    signInAna($this->browser, remember: false);

    $this->travel(31)->minutes();

    $this->browser->get('/api/probe/account')->assertStatus(401)->assertJson(['code' => 'unauthenticated']);
});

it('survives 29 minutes of inactivity', function () {
    signInAna($this->browser, remember: false);

    $this->travel(29)->minutes();

    $this->browser->get('/api/probe/account')->assertOk();
});

it('expires after eight hours and a minute of continuous activity without the remember cookie', function () {
    signInAna($this->browser, remember: false);

    ($this->workContinuouslyFor)(481);

    $this->browser->get('/api/probe/account')->assertStatus(401)->assertJson(['code' => 'unauthenticated']);
});

it('still serves a session of seven hours and a half of continuous activity', function () {
    signInAna($this->browser, remember: false);

    ($this->workContinuouslyFor)(450);

    $this->browser->get('/api/probe/account')->assertOk();
});

it('keeps serving past eight hours of continuous activity with the remember cookie', function () {
    signInAna($this->browser, remember: true);

    ($this->workContinuouslyFor)(481);

    $this->browser->get('/api/probe/account')->assertOk();
});
