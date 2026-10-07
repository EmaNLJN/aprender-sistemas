<?php

use App\Auth\Limiters;
use Illuminate\Support\Facades\Route;
use Tests\Feature\Limits\DatabaseDrivers;

beforeEach(function () {
    DatabaseDrivers::useWithFixedClock();
    Limiters::register();
    Route::prefix('api')->group(function () {
        Route::post('/probe/invitation', fn () => 'ok')->middleware('throttle:invitations');
        Route::post('/probe/reset', fn () => 'ok')->middleware('throttle:reset-password');
    });
    $this->from = fn (string $ip) => $this->withServerVariables(['REMOTE_ADDR' => $ip]);
});

afterEach(fn () => Carbon\Carbon::setTestNow());

it('allows ten invitation requests a minute per network and answers the eleventh with 429', function () {
    foreach (range(1, 10) as $ignored) {
        ($this->from)('10.0.0.1')->postJson('/api/probe/invitation')->assertOk();
    }

    ($this->from)('10.0.0.1')->postJson('/api/probe/invitation')
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJsonPath('code', 'too_many_requests');
});

it('does not count two networks together for invitations', function () {
    foreach (range(1, 10) as $ignored) {
        ($this->from)('10.0.0.1')->postJson('/api/probe/invitation')->assertOk();
    }

    ($this->from)('10.0.0.2')->postJson('/api/probe/invitation')->assertOk();
});

it('allows ten reset requests a minute per network', function () {
    foreach (range(1, 10) as $number) {
        ($this->from)('10.0.0.1')->postJson('/api/probe/reset', ['email' => "user{$number}@x.com"])->assertOk();
    }

    ($this->from)('10.0.0.1')->postJson('/api/probe/reset', ['email' => 'user11@x.com'])
        ->assertStatus(429)
        ->assertHeader('Retry-After');
});

it('allows five reset requests a minute per email across networks, canonicalizing the email', function () {
    $spellings = ['ana@x.com', 'ANA@x.com', ' Ana@X.com ', 'ana@x.com', 'ANA@X.COM'];
    foreach ($spellings as $number => $email) {
        ($this->from)("10.0.1.{$number}")->postJson('/api/probe/reset', ['email' => $email])->assertOk();
    }

    ($this->from)('10.0.2.1')->postJson('/api/probe/reset', ['email' => 'Ana@x.com'])
        ->assertStatus(429)
        ->assertHeader('Retry-After');
    ($this->from)('10.0.2.1')->postJson('/api/probe/reset', ['email' => 'bea@x.com'])->assertOk();
});

it('lets the limits go after a minute', function () {
    foreach (range(1, 11) as $ignored) {
        ($this->from)('10.0.0.1')->postJson('/api/probe/invitation');
    }

    $this->travel(61)->seconds();

    ($this->from)('10.0.0.1')->postJson('/api/probe/invitation')->assertOk();
});
