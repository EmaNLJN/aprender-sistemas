<?php

use Illuminate\Http\Request;

it('serves in Spanish', function () {
    expect(config('app.locale'))->toBe('es')
        ->and(config('app.fallback_locale'))->toBe('es');
});

it('keeps the session 30 minutes, encrypted, with a 0 in 100 sweep lottery', function () {
    expect(config('session.lifetime'))->toBe(30)
        ->and(config('session.encrypt'))->toBeTrue()
        ->and(config('session.lottery'))->toBe([0, 100]);
});

it('asks to confirm the password again after 900 seconds', function () {
    expect(config('auth.password_timeout'))->toBe(900);
});

it('reads BCRYPT_ROUNDS from the environment', function () {
    expect(config('hashing.bcrypt.rounds'))->toBe(4);
});

it('exposes the taller keys with typed accessors', function () {
    expect(config()->string('taller.privacy_version'))->toBe('2026-10-dev')
        ->and(config()->string('taller.password_blocklist'))->toBe(resource_path('passwords/blocked-15plus.txt'))
        ->and(config()->array('taller.invitations'))->toBe(['student_days' => 7, 'admin_hours' => 48, 'prune_days' => 30])
        ->and(config()->integer('taller.session_max_hours'))->toBe(8)
        ->and(config()->integer('auth.guards.web.remember'))->toBe(43200)
        ->and(config()->integer('taller.long_transaction_seconds'))->toBe(30)
        ->and(config()->array('taller.features'))->toBe(['password_reset' => false, 'registration' => false]);
});

it('configures the device cookie without Secure and independent of APP_ENV', function () {
    expect(config()->string('taller.device_cookie.name'))->toBe('taller-device')
        ->and(config()->boolean('taller.device_cookie.secure'))->toBeFalse()
        ->and(config()->string('taller.device_cookie.same_site'))->toBe('lax')
        ->and(config()->integer('taller.device_cookie.days'))->toBe(180);
});

it('leaves the log HMAC key to the environment', function () {
    expect(array_key_exists('log_hmac_key', config()->array('taller')))->toBeTrue();
});

it('trusts no proxy, so the client network is REMOTE_ADDR', function () {
    expect(Request::getTrustedProxies())->toBe([]);
});
