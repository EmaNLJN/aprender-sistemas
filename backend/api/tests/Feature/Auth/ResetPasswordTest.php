<?php

use App\Auth\AccountLockout;
use App\Auth\AccountPasswords;
use App\Auth\PasswordResetLinks;
use App\Auth\PlainPassword;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

function tokenOfResetLink(string $url): string
{
    preg_match('/restablecer=([A-Za-z0-9]+)&/', $url, $found);

    return $found[1];
}

// Browser drops the cookies that expire before the real clock, so these tests live in the future.
beforeEach(function () {
    useSampleBlockedPasswords();
    Carbon::setTestNow('2030-01-01 12:00:00');
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers();
    $this->user = User::factory()->withPassword('the-old-password-123')->create(['email' => 'ana@x.com', 'name' => 'Ana Pérez']);
    $this->token = tokenOfResetLink(app(PasswordResetLinks::class)->issue($this->user)->url);
    $this->resetBody = fn (array $overrides = []) => $overrides + [
        'token' => $this->token,
        'email' => 'ana@x.com',
        'password' => 'x7Kp2mQ9vL4tZ8w',
        'password_confirmation' => 'x7Kp2mQ9vL4tZ8w',
    ];
});

afterEach(fn () => Carbon::setTestNow());

it('sets the new password and answers 200 with the object {}', function () {
    $response = $this->browser->post('/api/auth/reset-password', ($this->resetBody)());

    $response->assertOk();
    expect($response->getContent())->toBe('{}')
        ->and(app(AccountPasswords::class)->verify($this->user->fresh(), PlainPassword::of('x7Kp2mQ9vL4tZ8w')))->toBeTrue()
        ->and(app(AccountPasswords::class)->verify($this->user->fresh(), PlainPassword::of('the-old-password-123')))->toBeFalse();
});

it('verifies a password set decomposed with the composed form', function () {
    $this->browser->post('/api/auth/reset-password', ($this->resetBody)(['password' => "contrasen\u{0061}\u{0301}-larga-1234", 'password_confirmation' => "contrasen\u{0061}\u{0301}-larga-1234"]))->assertOk();

    expect(app(AccountPasswords::class)->verify($this->user->fresh(), PlainPassword::of("contrasen\u{00E1}-larga-1234")))->toBeTrue();
});

it('accepts the email in another spelling', function () {
    $this->browser->post('/api/auth/reset-password', ($this->resetBody)(['email' => '  ANA@x.com ']))->assertOk();
});

it('rotates the remember token, ends every session of the account and clears the lockout', function () {
    $signedIn = Browser::for($this)->signIn($this->user);
    $signedIn->get('/api/probe/account')->assertOk();
    $other = User::factory()->create();
    $otherSession = Browser::for($this)->signIn($other);
    $tokenBefore = $this->user->fresh()->remember_token;
    foreach (range(1, 12) as $ignored) {
        app(AccountLockout::class)->recordFailure('ana@x.com');
    }
    expect(app(AccountLockout::class)->state('ana@x.com')->fails)->toBe(12);

    $this->browser->post('/api/auth/reset-password', ($this->resetBody)())->assertOk();

    expect($this->user->fresh()->remember_token)->not->toBe($tokenBefore)
        ->and(DB::table('sessions')->where('user_id', $this->user->id)->count())->toBe(0)
        ->and(app(AccountLockout::class)->state('ana@x.com')->fails)->toBe(0);
    $signedIn->get('/api/probe/account')->assertStatus(401);
    $otherSession->get('/api/probe/account')->assertOk();
});

it('does not sign anybody in', function () {
    $this->browser->post('/api/auth/reset-password', ($this->resetBody)())->assertOk();

    $this->browser->get('/api/probe/public')->assertExactJson(['id' => null]);
});

it('does not serve the token a second time', function () {
    $this->browser->post('/api/auth/reset-password', ($this->resetBody)())->assertOk();

    $this->browser->post('/api/auth/reset-password', ($this->resetBody)(['password' => 'q9Zt4wB7nM2xK5r', 'password_confirmation' => 'q9Zt4wB7nM2xK5r']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('token');
});

it('answers the identical 422 for every reason the token cannot be used', function () {
    $expired = User::factory()->create(['email' => 'late@x.com']);
    $expiredToken = Password::broker()->createToken($expired);
    $disabled = User::factory()->disabled()->create(['email' => 'off@x.com']);
    $disabledToken = Password::broker()->createToken($disabled);
    $deleting = User::factory()->deleting()->create(['email' => 'gone@x.com']);
    $deletingToken = Password::broker()->createToken($deleting);
    Carbon::setTestNow('2030-01-01 13:01:00');

    $bodies = collect([
        'an invalid token' => ($this->resetBody)(['token' => str_repeat('a', 40)]),
        'an expired token' => ($this->resetBody)(['token' => $this->token]),
        'an expired token of another account' => ($this->resetBody)(['email' => 'late@x.com', 'token' => $expiredToken]),
        'an account that does not exist' => ($this->resetBody)(['email' => 'nobody@x.com']),
        'a disabled account' => ($this->resetBody)(['email' => 'off@x.com', 'token' => $disabledToken]),
        'an account being deleted' => ($this->resetBody)(['email' => 'gone@x.com', 'token' => $deletingToken]),
    ])->map(function (array $body) {
        $response = $this->browser->fromIp('10.1.1.'.random_int(1, 250))->post('/api/auth/reset-password', $body);
        $response->assertStatus(422)->assertJsonValidationErrors('token');

        return $response->getContent();
    });

    expect($bodies->unique())->toHaveCount(1);
});

it('keeps the password of a disabled account', function () {
    $disabled = User::factory()->disabled()->withPassword('the-old-password-123')->create(['email' => 'off@x.com']);
    $token = Password::broker()->createToken($disabled);
    $before = $disabled->fresh()->password;

    $this->browser->post('/api/auth/reset-password', ($this->resetBody)(['email' => 'off@x.com', 'token' => $token]))->assertStatus(422);

    expect($disabled->fresh()->password)->toBe($before);
});

it('applies the password policy first, with the same 422 for a valid and an invalid token', function () {
    $weak = ['password' => 'x7Kp2mQ9vL4tZ8', 'password_confirmation' => 'x7Kp2mQ9vL4tZ8'];

    $valid = $this->browser->post('/api/auth/reset-password', ($this->resetBody)($weak));
    $invalid = $this->browser->post('/api/auth/reset-password', ($this->resetBody)($weak + ['token' => str_repeat('a', 40)]));

    $valid->assertStatus(422)->assertJsonValidationErrors('password');
    expect($invalid->getContent())->toBe($valid->getContent());
    $this->browser->post('/api/auth/reset-password', ($this->resetBody)())->assertOk();
});

it('applies the policy to the name and the email of the request', function (string $password) {
    $this->browser->post('/api/auth/reset-password', ($this->resetBody)(['password' => $password, 'password_confirmation' => $password]))
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');
})->with([
    'the name' => 'zz-ana pérez-x7Kp2mQ9',
    'the email' => 'zz-ana@x.com-x7Kp2mQ9vL',
]);

it('limits ten requests a minute per network', function () {
    foreach (range(1, 10) as $number) {
        $this->browser->post('/api/auth/reset-password', ($this->resetBody)(['email' => "user{$number}@x.com", 'token' => 'x']))->assertStatus(422);
    }

    $this->browser->post('/api/auth/reset-password', ($this->resetBody)(['email' => 'user11@x.com']))
        ->assertStatus(429)
        ->assertHeader('Retry-After');
});

it('limits five requests a minute per email whatever the network', function () {
    foreach (range(1, 5) as $number) {
        Browser::for($this)->fromIp("10.2.0.{$number}")->post('/api/auth/reset-password', ($this->resetBody)(['token' => 'x']))->assertStatus(422);
    }

    Browser::for($this)->fromIp('10.2.0.99')->post('/api/auth/reset-password', ($this->resetBody)())
        ->assertStatus(429)
        ->assertHeader('Retry-After');
});

it('asks for the CSRF token', function () {
    $this->browser->enforceCsrf()->post('/api/auth/reset-password', ($this->resetBody)())
        ->assertStatus(419)
        ->assertJson(['code' => 'csrf_token_mismatch']);
});

it('rejects a body that is not shaped like a request with a validation error', function () {
    $this->browser->post('/api/auth/reset-password', [])
        ->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors(['token', 'email', 'password']);
});
