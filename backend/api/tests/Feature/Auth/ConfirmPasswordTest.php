<?php

use App\Auth\AccountLockout;
use App\Auth\AccountPasswords;
use App\Auth\PlainPassword;
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
    $this->browser->signIn($this->ana);
});

afterEach(fn () => Carbon::setTestNow());

it('answers 201 with the object {} and not the list [], and changes the session id', function () {
    $sessionBefore = $this->browser->cookie('taller-session');

    $response = $this->browser->post('/api/auth/confirm-password', ['password' => 'correct horse battery']);

    $response->assertCreated();
    expect($response->getContent())->toBe('{}')
        ->and($this->browser->cookie('taller-session'))->not->toBe($sessionBefore);
});

it('reports the confirmation for 900 seconds and not one more', function () {
    $this->browser->get('/api/auth/confirmed-password-status')->assertOk()->assertExactJson(['confirmed' => false]);
    $this->browser->post('/api/auth/confirm-password', ['password' => 'correct horse battery'])->assertCreated();

    $this->travel(899)->seconds();
    $this->browser->get('/api/auth/confirmed-password-status')->assertExactJson(['confirmed' => true]);

    $this->travel(2)->seconds();
    $this->browser->get('/api/auth/confirmed-password-status')->assertExactJson(['confirmed' => false]);
});

it('lifts the 423 of a route that asks for a recent confirmation', function () {
    $this->browser->get('/api/probe/sensitive')->assertStatus(423)->assertExactJson([
        'message' => 'Confirmá tu contraseña para continuar.',
        'code' => 'password_confirmation_required',
    ]);

    $this->browser->post('/api/auth/confirm-password', ['password' => 'correct horse battery'])->assertCreated();

    $this->browser->get('/api/probe/sensitive')->assertOk();
});

it('answers 422 auth_failed to a wrong password, which counts for the account lockout', function () {
    $this->browser->post('/api/auth/confirm-password', ['password' => 'wrong'])
        ->assertStatus(422)
        ->assertExactJson(['message' => 'El email o la contraseña no son correctos.', 'code' => 'auth_failed']);

    expect(app(AccountLockout::class)->state('ana@x.com')->fails)->toBe(1);
    $this->browser->get('/api/auth/confirmed-password-status')->assertExactJson(['confirmed' => false]);
});

it('answers 429 to the sixth attempt of a minute, even with the right password', function () {
    foreach (range(1, 5) as $ignored) {
        $this->browser->post('/api/auth/confirm-password', ['password' => 'wrong'])->assertStatus(422);
    }

    $response = $this->browser->post('/api/auth/confirm-password', ['password' => 'correct horse battery']);

    $response->assertStatus(429)->assertJson(['code' => 'too_many_requests']);
    expect((int) $response->headers->get('Retry-After'))->toBeBetween(1, 60);
});

it('confirms with the composed letter a password that was set decomposed', function () {
    app(AccountPasswords::class)->set($this->ana, PlainPassword::of("contrasen\u{0303}a larga y rara"));
    $this->ana->save();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->ana);

    $this->browser->post('/api/auth/confirm-password', ['password' => "contrase\u{00F1}a larga y rara"])->assertCreated();
});

it('requires a password', function () {
    $this->browser->post('/api/auth/confirm-password', [])->assertStatus(422)->assertJson(['code' => 'validation_failed']);
});

it('answers 409 to a confirmation that does not carry the account header', function () {
    $this->browser->withoutAccountHeader()->post('/api/auth/confirm-password', ['password' => 'correct horse battery'])
        ->assertStatus(409)
        ->assertJson(['code' => 'account_mismatch']);
});

it('answers 401 to the status without a session', function () {
    Browser::for($this)->useDatabaseDrivers()->get('/api/auth/confirmed-password-status')->assertStatus(401);
});
