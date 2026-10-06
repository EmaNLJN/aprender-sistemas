<?php

use App\Auth\AccountStatus;
use App\Auth\Invitations;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

// Browser drops the cookies that expire before the real clock, so these tests live in the future.
beforeEach(function () {
    useSampleBlockedPasswords();
    Carbon::setTestNow('2030-01-01 12:00:00');
    ProbeRoutes::register();
    $this->invitations = app(Invitations::class);
    $this->browser = Browser::for($this)->useDatabaseDrivers();
    $this->issued = $this->invitations->issue('anaperez@x.com', Role::Student, null);
    $this->acceptBody = fn (array $overrides = []) => $overrides + [
        'token' => $this->issued->token,
        'name' => 'Ana Pérez',
        'password' => 'x7Kp2mQ9vL4tZ8w',
        'password_confirmation' => 'x7Kp2mQ9vL4tZ8w',
        'privacyVersion' => config()->string('taller.privacy_version'),
    ];
});

afterEach(fn () => Carbon::setTestNow());

it('creates the account, answers 201 with the published user and opens a new session', function () {
    $this->browser->get('/api/probe/public');
    $sessionBefore = $this->browser->cookie('taller-session');

    $response = $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)());

    $user = User::where('email', 'anaperez@x.com')->firstOrFail();
    $response->assertCreated()->assertExactJson(['data' => [
        'id' => $user->id,
        'name' => 'Ana Pérez',
        'email' => 'anaperez@x.com',
        'role' => 'student',
        'privacyAccepted' => true,
    ]]);
    expect($this->browser->cookie('taller-session'))->not->toBeNull()->not->toBe($sessionBefore)
        ->and($user->status)->toBe(AccountStatus::Active)
        ->and($user->email_verified_at)->not->toBeNull()
        ->and(DB::table('invitations')->count())->toBe(0);
});

it('leaves the browser signed in as the new account', function () {
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)())->assertCreated();
    $user = User::where('email', 'anaperez@x.com')->firstOrFail();

    $this->browser->get('/api/probe/account')->assertOk()->assertExactJson(['id' => $user->id]);
});

it('shows the new account, with the privacy notice accepted, in GET /api/session', function () {
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)())->assertCreated();
    $user = User::where('email', 'anaperez@x.com')->firstOrFail();

    $this->browser->get('/api/session')->assertOk()->assertJsonPath('user', [
        'id' => $user->id,
        'name' => 'Ana Pérez',
        'email' => 'anaperez@x.com',
        'role' => 'student',
        'privacyAccepted' => true,
    ]);
});

it('starts the clock of the session at the acceptance', function () {
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)())->assertCreated();

    $this->browser->get('/api/probe/authenticated-at')->assertExactJson(['at' => Carbon::now()->getTimestamp()]);
});

it('takes the role from the invitation', function () {
    $admin = $this->invitations->issue('root@x.com', Role::Admin, null);

    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)(['token' => $admin->token, 'name' => 'Root']))
        ->assertCreated()
        ->assertJsonPath('data.role', 'admin');
});

it('ignores role, status and user_id sent by the client', function () {
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)(['role' => 'admin', 'status' => 'disabled', 'user_id' => 999, 'id' => 999]))
        ->assertCreated();

    $user = User::where('email', 'anaperez@x.com')->firstOrFail();
    expect($user->role)->toBe(Role::Student)
        ->and($user->status)->toBe(AccountStatus::Active)
        ->and($user->id)->not->toBe(999);
});

it('rejects an invalid body with 422 and keeps the invitation current', function (array $overrides, string $field) {
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)($overrides))
        ->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors($field);

    $this->browser->post('/api/auth/invitations/lookup', ['token' => $this->issued->token])->assertOk();
    expect(User::where('email', 'anaperez@x.com')->exists())->toBeFalse();
})->with([
    'a password of 14 characters' => [['password' => 'x7Kp2mQ9vL4tZ8', 'password_confirmation' => 'x7Kp2mQ9vL4tZ8'], 'password'],
    'a password with the local part of the email' => [['password' => 'zz-anaperez-x7Kp2mQ9', 'password_confirmation' => 'zz-anaperez-x7Kp2mQ9'], 'password'],
    'a password with the name' => [['password' => 'zz-ana pérez-x7Kp2mQ9', 'password_confirmation' => 'zz-ana pérez-x7Kp2mQ9'], 'password'],
    'a blocked password' => [['password' => 'passwordpassword1', 'password_confirmation' => 'passwordpassword1'], 'password'],
    'a confirmation that differs' => [['password_confirmation' => 'x7Kp2mQ9vL4tZ8W'], 'password_confirmation'],
    'an old privacy version' => [['privacyVersion' => '2020-01-old'], 'privacyVersion'],
    'an empty name' => [['name' => ''], 'name'],
    'a name of 81 characters' => [['name' => str_repeat('a', 81)], 'name'],
    'a name with a control character' => [['name' => "Ana\x07"], 'name'],
]);

it('accepts a name of 80 characters', function () {
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)(['name' => str_repeat('a', 80)]))->assertCreated();
});

it('answers 404 for an unknown token and 410 for an expired invitation', function () {
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)(['token' => str_repeat('a', 43)]))
        ->assertStatus(404)
        ->assertJson(['code' => 'invitation_not_found']);

    Carbon::setTestNow('2030-01-08 12:00:01');
    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)())
        ->assertStatus(410)
        ->assertJson(['code' => 'invitation_expired']);
});

it('shares ten requests a minute per network between lookup and accept', function () {
    foreach (range(1, 6) as $ignored) {
        $this->browser->post('/api/auth/invitations/lookup', ['token' => $this->issued->token])->assertOk();
    }
    foreach (range(1, 4) as $ignored) {
        $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)(['name' => '']))->assertStatus(422);
    }

    $this->browser->post('/api/auth/invitations/lookup', ['token' => $this->issued->token])
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJson(['code' => 'too_many_requests']);
    Browser::for($this)->fromIp('10.9.9.9')->post('/api/auth/invitations/lookup', ['token' => $this->issued->token])->assertOk();
});

it('asks for the CSRF token', function () {
    $this->browser->enforceCsrf()->post('/api/auth/invitations/accept', ($this->acceptBody)())
        ->assertStatus(419)
        ->assertJson(['code' => 'csrf_token_mismatch']);
});

it('logs the acceptance once, without the token or the password', function () {
    Log::spy();

    $this->browser->post('/api/auth/invitations/accept', ($this->acceptBody)())->assertCreated();

    $user = User::where('email', 'anaperez@x.com')->firstOrFail();
    Log::shouldHaveReceived('info')
        ->withArgs(fn ($message, $context = []) => $message === 'invitation.accepted' && $context === ['invited_by' => null, 'user_id' => $user->id])
        ->once();
    Log::shouldNotHaveReceived('info', fn ($message, $context = []) => str_contains(json_encode($context), $this->issued->token) || str_contains(json_encode($context), 'x7Kp2mQ9vL4tZ8w'));
});
