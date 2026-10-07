<?php

use App\Auth\AccountLockout;
use App\Auth\AccountPasswords;
use App\Auth\PlainPassword;
use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter as RateLimiterFacade;
use Illuminate\Support\Sleep;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;
use Tests\TestCase;

beforeEach(function () {
    useSampleBlockedPasswords();
    ProbeRoutes::register();
    Sleep::fake();
    Carbon::setTestNow(Carbon::now());
    $this->browser = Browser::for($this)->useDatabaseDrivers();
    RateLimiterFacade::swap(new RateLimiter(Cache::store()));
    $this->ana = User::factory()->withPassword('correct horse battery')->create(['name' => 'Ana', 'email' => 'ana@x.com']);
});

afterEach(fn () => Carbon::setTestNow());

function logIn(Browser $browser, string $email, string $password, ?bool $remember = null)
{
    $body = ['email' => $email, 'password' => $password];
    if ($remember !== null) {
        $body['remember'] = $remember;
    }

    return $browser->post('/api/auth/login', $body);
}

function cookieOf($response, string $name): ?Cookie
{
    return collect($response->headers->getCookies())->first(fn (Cookie $cookie) => $cookie->getName() === $name);
}

function rememberCookieOf($response): ?Cookie
{
    return collect($response->headers->getCookies())->first(fn (Cookie $cookie) => str_starts_with($cookie->getName(), 'remember_web_'));
}

function failLogins(TestCase $test, int $times, string $email = 'ana@x.com', string $password = 'wrong', ?string $ipPrefix = null): void
{
    foreach (range(1, $times) as $attempt) {
        $browser = Browser::for($test)->useDatabaseDrivers();
        if ($ipPrefix !== null) {
            $browser->fromIp("{$ipPrefix}.{$attempt}");
        }
        logIn($browser, $email, $password)->assertStatus(422);
    }
}

it('signs in with the five keys of the user, a new session and the device cookie', function () {
    $this->browser->get('/api/probe/public');
    $guestSession = $this->browser->cookie('taller-session');

    $response = logIn($this->browser, 'ana@x.com', 'correct horse battery');

    $response->assertOk()->assertExactJson(['data' => [
        'id' => $this->ana->id, 'name' => 'Ana', 'email' => 'ana@x.com', 'role' => 'student', 'privacyAccepted' => false,
    ]]);
    $session = cookieOf($response, 'taller-session');
    expect($session->isHttpOnly())->toBeTrue()
        ->and($session->getSameSite())->toBe('lax')
        ->and($session->getValue())->not->toBe($guestSession)
        ->and(DB::table('sessions')->count())->toBe(1)
        ->and(DB::table('sessions')->value('user_id'))->toBe($this->ana->id);
    $device = cookieOf($response, 'taller-device');
    expect($device->isHttpOnly())->toBeTrue()
        ->and($device->getExpiresTime())->toBe(now()->addDays(180)->getTimestamp());
});

it('marks the instant of the sign in on the session', function () {
    logIn($this->browser, 'ana@x.com', 'correct horse battery')->assertOk();

    $this->browser->get('/api/probe/authenticated-at')->assertExactJson(['at' => now()->getTimestamp()]);
});

it('canonicalizes the email before looking the account up', function () {
    logIn($this->browser, '  ANA@X.com ', 'correct horse battery')->assertOk()->assertJsonPath('data.id', $this->ana->id);
});

it('accepts an email with accents', function () {
    $papa = User::factory()->withPassword('correct horse battery')->create(['email' => 'papá@ejemplo.com.ar']);

    logIn($this->browser, 'PAPÁ@Ejemplo.com.ar', 'correct horse battery')->assertOk()->assertJsonPath('data.id', $papa->id);
});

it('signs in with the composed letter a password that was set decomposed', function () {
    $passwords = app(AccountPasswords::class);
    $passwords->set($this->ana, PlainPassword::of("contrasen\u{0303}a larga y rara"));
    $this->ana->save();

    logIn($this->browser, 'ana@x.com', "contrase\u{00F1}a larga y rara")->assertOk();
});

it('issues the remember cookie for 30 days only to a student who asks for it', function (string $state, ?bool $remember, bool $issued) {
    $account = User::factory()->withPassword('correct horse battery')->create(['email' => 'z@x.com'] + ($state === 'admin' ? ['role' => 'admin'] : []));

    $response = logIn($this->browser, 'z@x.com', 'correct horse battery', $remember);

    $cookie = rememberCookieOf($response);
    expect($cookie !== null)->toBe($issued);
    if ($issued) {
        expect($cookie->isHttpOnly())->toBeTrue()
            ->and($cookie->getExpiresTime())->toBe(now()->addDays(30)->getTimestamp());
    }
})->with([
    'student who asks' => ['student', true, true],
    'student who does not ask' => ['student', null, false],
    'student who declines' => ['student', false, false],
    'admin who asks' => ['admin', true, false],
]);

it('answers the same to an unknown email and to a wrong password', function () {
    $unknown = logIn(Browser::for($this)->useDatabaseDrivers(), 'nobody@x.com', 'whatever whatever');
    $wrong = logIn(Browser::for($this)->useDatabaseDrivers(), 'ana@x.com', 'whatever whatever');

    $expected = ['message' => 'El email o la contraseña no son correctos.', 'code' => 'auth_failed'];
    $unknown->assertStatus(422)->assertExactJson($expected);
    $wrong->assertStatus(422)->assertExactJson($expected);
    $headersOf = fn ($response) => collect($response->headers->allPreserveCase())->except(['Set-Cookie', 'Date', 'X-Request-Id'])->all();
    expect($headersOf($unknown))->toEqual($headersOf($wrong));
});

it('takes between 150 and 200 ms on every path that evaluates a password', function (string $email, string $password) {
    logIn($this->browser, $email, $password);

    Sleep::assertSlept(fn ($duration) => $duration->totalMilliseconds >= 150 && $duration->totalMilliseconds <= 200, times: 1);
})->with([
    'unknown email' => ['nobody@x.com', 'whatever whatever'],
    'wrong password' => ['ana@x.com', 'whatever whatever'],
    'right password' => ['ana@x.com', 'correct horse battery'],
]);

it('hashes the dummy password with the configured cost', function () {
    $cost = password_get_info(app(AccountPasswords::class)->dummyHash())['options']['cost'];

    expect($cost)->toBe(config('hashing.bcrypt.rounds'));
});

it('answers 403 account_disabled, with no session, to a disabled account with the right password', function () {
    User::factory()->disabled()->withPassword('correct horse battery')->create(['email' => 'off@x.com']);

    $response = logIn($this->browser, 'off@x.com', 'correct horse battery');

    $response->assertStatus(403)->assertJson(['code' => 'account_disabled']);
    expect(DB::table('sessions')->whereNotNull('user_id')->count())->toBe(0)
        ->and(cookieOf($response, 'taller-device'))->toBeNull();
    $this->browser->get('/api/probe/public')->assertExactJson(['id' => null]);
});

it('answers 422 auth_failed to a disabled account with the wrong password', function () {
    User::factory()->disabled()->withPassword('correct horse battery')->create(['email' => 'off@x.com']);

    logIn($this->browser, 'off@x.com', 'wrong')->assertStatus(422)->assertJson(['code' => 'auth_failed']);
});

it('answers a deleting account as an unknown email, even with the right password', function () {
    User::factory()->deleting()->withPassword('correct horse battery')->create(['email' => 'gone@x.com']);

    logIn($this->browser, 'gone@x.com', 'correct horse battery')
        ->assertStatus(422)
        ->assertExactJson(['message' => 'El email o la contraseña no son correctos.', 'code' => 'auth_failed']);
});

it('throttles the sixth attempt of a minute for the same email and network', function () {
    failLogins($this, 5);

    $response = logIn(Browser::for($this)->useDatabaseDrivers(), 'ana@x.com', 'wrong');

    $response->assertStatus(429)->assertJson(['code' => 'too_many_requests']);
    expect((int) $response->headers->get('Retry-After'))->toBeBetween(1, 60);
});

it('throttles the 61st attempt of a minute from one network across emails', function () {
    foreach (range(1, 60) as $number) {
        logIn(Browser::for($this)->useDatabaseDrivers(), "user{$number}@x.com", 'wrong')->assertStatus(422);
    }

    logIn(Browser::for($this)->useDatabaseDrivers(), 'user61@x.com', 'wrong')->assertStatus(429);
});

it('lets four failures, a success and four more failures through', function () {
    failLogins($this, 4);
    logIn(Browser::for($this)->useDatabaseDrivers(), 'ana@x.com', 'correct horse battery')->assertOk();

    failLogins($this, 4);
});

it('counts the network and not X-Forwarded-For', function () {
    foreach (range(1, 5) as $attempt) {
        logIn($this->browser->withHeader('X-Forwarded-For', "203.0.113.{$attempt}"), 'ana@x.com', 'wrong')->assertStatus(422);
    }

    logIn($this->browser->withHeader('X-Forwarded-For', '203.0.113.99'), 'ana@x.com', 'wrong')->assertStatus(429);
});

it('lets 40 accounts behind one network sign in during the same minute', function () {
    foreach (range(1, 40) as $number) {
        User::factory()->withPassword('correct horse battery')->create(['email' => "alumno{$number}@x.com"]);
    }

    foreach (range(1, 40) as $number) {
        logIn(Browser::for($this)->useDatabaseDrivers(), "alumno{$number}@x.com", 'correct horse battery')->assertOk();
    }
});

it('rejects a body without email or password, or with an email that is not one', function (array $body) {
    $this->browser->post('/api/auth/login', $body)
        ->assertStatus(422)
        ->assertJson(['code' => 'validation_failed']);
})->with([
    'no email' => [['password' => 'correct horse battery']],
    'no password' => [['email' => 'ana@x.com']],
    'not an email' => [['email' => 'ana', 'password' => 'correct horse battery']],
    'an array as password' => [['email' => 'ana@x.com', 'password' => ['x']]],
]);

it('answers 419 to a POST without the CSRF token', function () {
    $this->browser->enforceCsrf();

    logIn($this->browser, 'ana@x.com', 'correct horse battery')->assertStatus(419)->assertJson(['code' => 'csrf_token_mismatch']);
});

describe('lockout by account', function () {
    it('locks unknown devices for a minute after ten failures and still lets the owner in', function () {
        $first = logIn(Browser::for($this)->useDatabaseDrivers(), 'ana@x.com', 'correct horse battery')->assertOk();
        $deviceCookie = cookieOf($first, 'taller-device')->getValue();

        failLogins($this, 10, ipPrefix: '10.0.0');

        $blocked = logIn(Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.1.1'), 'ana@x.com', 'correct horse battery');
        $blocked->assertStatus(429);
        expect((int) $blocked->headers->get('Retry-After'))->toBeBetween(59, 61);

        $owner = Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.1.2')->withCookie('taller-device', $deviceCookie);
        logIn($owner, 'ana@x.com', 'correct horse battery')->assertOk();

        $this->travel(61)->seconds();
        failLogins($this, 1, ipPrefix: '10.0.2');
        $second = logIn(Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.3.1'), 'ana@x.com', 'correct horse battery');
        $second->assertStatus(429);
        expect((int) $second->headers->get('Retry-After'))->toBeBetween(119, 121);
    });

    it('locks an email that has no account exactly as one that has', function () {
        failLogins($this, 10, 'nobody@x.com', ipPrefix: '10.0.0');

        $blocked = logIn(Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.1.1'), 'nobody@x.com', 'whatever whatever');

        $blocked->assertStatus(429);
        expect((int) $blocked->headers->get('Retry-After'))->toBeBetween(59, 61);
    });

    it('does not evaluate the password of a locked attempt nor count it as a failure', function () {
        failLogins($this, 10, ipPrefix: '10.0.0');
        $lockout = app(AccountLockout::class);

        logIn(Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.1.1'), 'ana@x.com', 'wrong')->assertStatus(429);

        expect($lockout->state('ana@x.com')->fails)->toBe(10);
    });

    it('stays locked until the lockout is cleared after 100 failures', function () {
        $lockout = app(AccountLockout::class);
        foreach (range(1, 100) as $ignored) {
            $lockout->recordFailure('ana@x.com');
        }

        $this->travel(20)->days();
        logIn(Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.1.1'), 'ana@x.com', 'correct horse battery')->assertStatus(429);

        $lockout->clear('ana@x.com');
        logIn(Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.1.2'), 'ana@x.com', 'correct horse battery')->assertOk();
    });

    it('throttles a known device after five failures in a minute without touching the account count', function () {
        $first = logIn(Browser::for($this)->useDatabaseDrivers(), 'ana@x.com', 'correct horse battery')->assertOk();
        $deviceCookie = cookieOf($first, 'taller-device')->getValue();

        foreach (range(1, 5) as $attempt) {
            $owner = Browser::for($this)->useDatabaseDrivers()->fromIp("10.0.0.{$attempt}")->withCookie('taller-device', $deviceCookie);
            logIn($owner, 'ana@x.com', 'wrong')->assertStatus(422);
        }
        $owner = Browser::for($this)->useDatabaseDrivers()->fromIp('10.0.0.6')->withCookie('taller-device', $deviceCookie);

        logIn($owner, 'ana@x.com', 'wrong')->assertStatus(429);
        expect(app(AccountLockout::class)->state('ana@x.com')->fails)->toBe(0);
    });
});

it('keeps the login counters in the database cache', function () {
    logIn($this->browser, 'ana@x.com', 'wrong')->assertStatus(422);

    expect(DB::table('cache')->where('key', 'like', '%login:attempts:%')->count())->toBeGreaterThan(0)
        ->and(DB::table('cache')->where('key', 'like', '%login:account:%')->count())->toBe(1);
});
