<?php

use App\Auth\AccountLockout;
use App\Auth\AccountPasswords;
use App\Auth\PlainPassword;
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
    $this->ana = User::factory()->withPassword('correct horse battery')->create(['name' => 'Ana', 'email' => 'ana@x.com']);
    $this->signInWithPassword = function (Browser $browser, string $password = 'correct horse battery', bool $remember = false): Browser {
        $browser->post('/api/auth/login', ['email' => 'ana@x.com', 'password' => $password, 'remember' => $remember])->assertOk();

        return $browser->signedInAs($this->ana);
    };
    $this->secondDevice = fn (bool $remember = false) => ($this->signInWithPassword)(Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.0.9'), remember: $remember);
});

afterEach(fn () => Carbon::setTestNow());

function changePasswordBody(string $current, string $new): array
{
    return ['current_password' => $current, 'password' => $new, 'password_confirmation' => $new];
}

describe('PATCH /api/me', function () {
    it('changes the name and publishes the user', function () {
        $this->browser->signIn($this->ana);

        $this->browser->send('PATCH', '/api/me', ['name' => 'Ana Luz'])
            ->assertOk()
            ->assertExactJson(['data' => ['id' => $this->ana->id, 'name' => 'Ana Luz', 'email' => 'ana@x.com', 'role' => 'student', 'privacyAccepted' => false]]);
        expect($this->ana->fresh()->name)->toBe('Ana Luz');
    });

    it('ignores the email, the role, the status and the user id', function () {
        $this->browser->signIn($this->ana);

        $this->browser->send('PATCH', '/api/me', ['name' => 'Ana Luz', 'email' => 'other@x.com', 'role' => 'admin', 'status' => 'disabled', 'user_id' => 999, 'id' => 999])->assertOk();

        $stored = $this->ana->fresh();
        expect($stored->email)->toBe('ana@x.com')
            ->and($stored->role->value)->toBe('student')
            ->and($stored->status->value)->toBe('active')
            ->and($stored->id)->toBe($this->ana->id);
    });

    it('accepts a name of 80 characters and rejects the rest', function (mixed $name, int $status) {
        $this->browser->signIn($this->ana);

        $this->browser->send('PATCH', '/api/me', ['name' => $name])->assertStatus($status);
    })->with([
        'one character' => ['A', 200],
        '80 multibyte characters' => [str_repeat('ñ', 80), 200],
        'empty' => ['', 422],
        'missing' => [null, 422],
        '81 characters' => [str_repeat('a', 81), 422],
        'a control character' => ["Ana\u{0007}Luz", 422],
        'a line break' => ["Ana\nLuz", 422],
        'a list' => [['Ana'], 422],
    ]);

    it('answers 409 without the account header', function () {
        $this->browser->signIn($this->ana);

        $this->browser->withoutAccountHeader()->send('PATCH', '/api/me', ['name' => 'Ana Luz'])->assertStatus(409);
    });
});

describe('revocation', function () {
    it('answers 403 account_disabled to the next request of a disabled account, and 401 to the one after', function () {
        $this->browser->signIn($this->ana);
        $this->browser->get('/api/auth/confirmed-password-status')->assertOk();

        $this->ana->forceFill(['status' => 'disabled'])->save();

        $this->browser->get('/api/auth/confirmed-password-status')->assertStatus(403)->assertJson(['code' => 'account_disabled']);
        $this->browser->get('/api/auth/confirmed-password-status')->assertStatus(401);
    });

    it('cuts the second session, with its remember cookie, when the password changes in the first', function () {
        $first = ($this->signInWithPassword)(Browser::for($this)->useDatabaseDrivers(), remember: true);
        $second = ($this->secondDevice)(remember: true);

        $first->send('PUT', '/api/me/password', changePasswordBody('correct horse battery', 'a brand new passphrase'))->assertOk();

        $second->get('/api/auth/confirmed-password-status')->assertStatus(401);
        $first->get('/api/auth/confirmed-password-status')->assertOk();
    });
});

describe('PUT /api/me/password', function () {
    it('answers 200 with a new session id, keeps the first session and gives it the new remember token', function () {
        $first = ($this->signInWithPassword)(Browser::for($this)->useDatabaseDrivers(), remember: true);
        ($this->secondDevice)();
        $sessionBefore = $first->cookie('taller-session');
        $rememberBefore = $first->cookieStartingWith('remember_web_');
        $tokenBefore = $this->ana->fresh()->remember_token;

        $response = $first->send('PUT', '/api/me/password', changePasswordBody('correct horse battery', 'a brand new passphrase'));

        $response->assertOk()->assertJsonPath('data.id', $this->ana->id);
        expect($first->cookie('taller-session'))->not->toBe($sessionBefore)
            ->and($this->ana->fresh()->remember_token)->not->toBe($tokenBefore)
            ->and($first->cookieStartingWith('remember_web_'))->not->toBe($rememberBefore)
            ->and(DB::table('sessions')->where('user_id', $this->ana->id)->count())->toBe(1);
        $recallerName = Auth::guard('web')->getRecallerName();
        $alone = Browser::for($this)->useDatabaseDrivers()->withCookie($recallerName, (string) $first->cookieStartingWith('remember_web_'));
        $alone->get('/api/auth/confirmed-password-status')->assertOk();
        $stale = Browser::for($this)->useDatabaseDrivers()->withCookie($recallerName, (string) $rememberBefore);
        $stale->get('/api/auth/confirmed-password-status')->assertStatus(401);
    });

    it('signs in with the composed letter a password that was set decomposed', function () {
        $this->browser->signIn($this->ana);

        $this->browser->send('PUT', '/api/me/password', changePasswordBody('correct horse battery', "contrasen\u{0303}a larga y rara"))->assertOk();

        Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.0.5')
            ->post('/api/auth/login', ['email' => 'ana@x.com', 'password' => "contrase\u{00F1}a larga y rara"])
            ->assertOk();
    });

    it('verifies the current password typed composed when it was set decomposed', function () {
        app(AccountPasswords::class)->set($this->ana, PlainPassword::of("contrasen\u{0303}a larga y rara"));
        $this->ana->save();
        $this->browser->signIn($this->ana);

        $this->browser->send('PUT', '/api/me/password', changePasswordBody("contrase\u{00F1}a larga y rara", 'a brand new passphrase'))->assertOk();
    });

    it('answers 422 auth_failed to a wrong current password and counts it for the lockout', function () {
        $this->browser->signIn($this->ana);

        $this->browser->send('PUT', '/api/me/password', changePasswordBody('wrong', 'a brand new passphrase'))
            ->assertStatus(422)
            ->assertJson(['code' => 'auth_failed']);

        expect(app(AccountLockout::class)->state('ana@x.com')->fails)->toBe(1)
            ->and(Auth::guard('web')->getProvider()->retrieveById($this->ana->id)->password)->toBe($this->ana->fresh()->password);
    });

    it('answers 422 with errors.password, in Spanish, for a password that breaks the policy', function () {
        $this->browser->signIn($this->ana);

        $response = $this->browser->send('PUT', '/api/me/password', changePasswordBody('correct horse battery', 'too short'));

        $response->assertStatus(422)->assertExactJson([
            'message' => 'Hay datos que corregir.',
            'code' => 'validation_failed',
            'errors' => ['password' => ['Tiene que tener al menos 15 caracteres.']],
        ]);
        $this->browser->send('PUT', '/api/me/password', changePasswordBody('correct horse battery', 'ana@x.com is my address'))
            ->assertStatus(422)
            ->assertJsonPath('errors.password', ['No puede contener tu email.']);
    });

    it('answers 422 to a confirmation that does not match', function () {
        $this->browser->signIn($this->ana);

        $this->browser->send('PUT', '/api/me/password', ['current_password' => 'correct horse battery', 'password' => 'a brand new passphrase', 'password_confirmation' => 'another one entirely'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password', ['La confirmación de contraseña no coincide.']);
    });

    it('answers 429 to the sixth attempt of a minute', function () {
        $this->browser->signIn($this->ana);
        foreach (range(1, 5) as $ignored) {
            $this->browser->send('PUT', '/api/me/password', changePasswordBody('wrong', 'a brand new passphrase'))->assertStatus(422);
        }

        $this->browser->send('PUT', '/api/me/password', changePasswordBody('correct horse battery', 'a brand new passphrase'))
            ->assertStatus(429)
            ->assertJson(['code' => 'too_many_requests']);
    });

    it('answers 409 without the account header', function () {
        $this->browser->signIn($this->ana);

        $this->browser->withoutAccountHeader()->send('PUT', '/api/me/password', changePasswordBody('correct horse battery', 'a brand new passphrase'))->assertStatus(409);
    });
});

describe('POST /api/me/sessions/logout-others', function () {
    it('answers 204, cuts the other sessions, keeps this one and rotates the remember token', function () {
        $current = ($this->signInWithPassword)(Browser::for($this)->useDatabaseDrivers(), remember: true);
        $other = ($this->secondDevice)(remember: true);
        $tokenBefore = $this->ana->fresh()->remember_token;

        $current->post('/api/me/sessions/logout-others', ['password' => 'correct horse battery'])->assertNoContent();

        expect($this->ana->fresh()->remember_token)->not->toBe($tokenBefore);
        $other->get('/api/auth/confirmed-password-status')->assertStatus(401);
        $current->get('/api/auth/confirmed-password-status')->assertOk();
    });

    it('answers 422 auth_failed to a wrong password and leaves the other sessions alone', function () {
        $current = $this->browser->signIn($this->ana);
        $other = ($this->secondDevice)();

        $current->post('/api/me/sessions/logout-others', ['password' => 'wrong'])->assertStatus(422)->assertJson(['code' => 'auth_failed']);

        $other->get('/api/auth/confirmed-password-status')->assertOk();
        expect(app(AccountLockout::class)->state('ana@x.com')->fails)->toBe(1);
    });

    it('verifies the password typed composed when it was set decomposed', function () {
        app(AccountPasswords::class)->set($this->ana, PlainPassword::of("contrasen\u{0303}a larga y rara"));
        $this->ana->save();
        $this->browser->signIn($this->ana);

        $this->browser->post('/api/me/sessions/logout-others', ['password' => "contrase\u{00F1}a larga y rara"])->assertNoContent();
    });

    it('answers 409 without the account header', function () {
        $this->browser->signIn($this->ana);

        $this->browser->withoutAccountHeader()->post('/api/me/sessions/logout-others', ['password' => 'correct horse battery'])->assertStatus(409);
    });
});

describe('POST /api/me/privacy', function () {
    it('answers 204 for the current version and stores it with the instant', function () {
        $this->browser->signIn($this->ana);

        $this->browser->post('/api/me/privacy', ['privacyVersion' => config('taller.privacy_version')])->assertNoContent();

        $stored = $this->ana->fresh();
        expect($stored->privacy_version)->toBe(config('taller.privacy_version'))
            ->and($stored->privacy_accepted_at?->getTimestamp())->toBe(now()->getTimestamp());
        $this->browser->get('/api/session')->assertJsonPath('user.privacyAccepted', true);
    });

    it('answers 422 for another version and stores nothing', function () {
        $this->browser->signIn($this->ana);

        $this->browser->post('/api/me/privacy', ['privacyVersion' => 'an-older-notice'])
            ->assertStatus(422)
            ->assertJson(['code' => 'validation_failed'])
            ->assertJsonStructure(['errors' => ['privacyVersion']]);

        expect($this->ana->fresh()->privacy_version)->toBeNull();
    });

    it('answers 422 without a version', function () {
        $this->browser->signIn($this->ana);

        $this->browser->post('/api/me/privacy', [])->assertStatus(422);
    });

    it('answers 409 without the account header', function () {
        $this->browser->signIn($this->ana);

        $this->browser->withoutAccountHeader()->post('/api/me/privacy', ['privacyVersion' => config('taller.privacy_version')])->assertStatus(409);
    });
});

it('locks the account for unknown devices after ten wrong passwords across the three routes', function () {
    $this->browser->signIn($this->ana);
    $wrongAttempts = [
        fn () => $this->browser->post('/api/auth/confirm-password', ['password' => 'wrong']),
        fn () => $this->browser->send('PUT', '/api/me/password', changePasswordBody('wrong', 'a brand new passphrase')),
        fn () => $this->browser->post('/api/me/sessions/logout-others', ['password' => 'wrong']),
    ];
    foreach (range(0, 9) as $number) {
        if ($number === 5) {
            $this->travel(61)->seconds();
        }
        $wrongAttempts[$number % 3]()->assertStatus(422);
    }

    $blocked = Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.1.1')
        ->post('/api/auth/login', ['email' => 'ana@x.com', 'password' => 'correct horse battery']);

    $blocked->assertStatus(429);
    expect((int) $blocked->headers->get('Retry-After'))->toBeBetween(59, 61);
});
