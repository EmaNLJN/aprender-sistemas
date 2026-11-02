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
        ->and(config()->integer('taller.long_transaction_seconds'))->toBe(30);
});

it('configures the mail channel for link-only mode, retries and the admin daily limit', function () {
    expect(config()->boolean('taller.mail.required'))->toBeTrue()
        ->and(config()->integer('taller.mail.retry_seconds'))->toBe(86400)
        ->and(config()->array('taller.mail.backoff'))->toBe([60, 300, 900, 3600])
        ->and(config()->integer('taller.mail.admin_daily_limit'))->toBe(300)
        ->and(config()->string('taller.mail.timezone'))->toBe('America/Argentina/Buenos_Aires');
});

it('keeps the registration closed with no allowed domains', function () {
    expect(config()->boolean('taller.registration.open'))->toBeFalse()
        ->and(config()->array('taller.registration.allowed_domains'))->toBe([]);
});

it('reads the allowed registration domains trimmed, lowercased and without blanks', function () {
    putenv('REGISTRATION_ALLOWED_DOMAINS= Escuela.edu.ar ,,otra.org');

    try {
        $this->refreshApplication();

        expect(config()->array('taller.registration.allowed_domains'))->toBe(['escuela.edu.ar', 'otra.org']);
    } finally {
        putenv('REGISTRATION_ALLOWED_DOMAINS');
        $this->refreshApplication();
    }
});

it('runs the mail queue on its own table, with a retry window above the job timeout', function () {
    expect(config()->string('queue.connections.mail.table'))->toBe('mail_jobs')
        ->and(config()->string('queue.connections.mail.queue'))->toBe('mail')
        ->and(config()->integer('queue.connections.mail.retry_after'))->toBe(120)
        ->and(config()->boolean('queue.connections.mail.after_commit'))->toBeTrue();
});

it('gives the SMTP transport a 20 second timeout, TLS and the submission port', function () {
    expect(config()->integer('mail.mailers.smtp.timeout'))->toBe(20)
        ->and(config()->boolean('mail.mailers.smtp.require_tls'))->toBeTrue()
        ->and(config()->integer('mail.mailers.smtp.port'))->toBe(587);
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

it('commits queued jobs after the transaction and retries them after the purge timeout', function () {
    expect(config()->boolean('queue.connections.database.after_commit'))->toBeTrue()
        ->and(config()->integer('queue.connections.database.retry_after'))->toBe(330)
        ->and(config()->boolean('queue.connections.runs.after_commit'))->toBeFalse()
        ->and(config()->integer('queue.connections.runs.retry_after'))->toBe(140);
});

it('sets the ledger, purge and export sizes', function () {
    expect(config()->integer('taller.ledger_days'))->toBe(35)
        ->and(config()->integer('taller.purge.batch_size'))->toBe(500)
        ->and(config()->integer('taller.purge.stuck_minutes'))->toBe(15)
        ->and(config()->integer('taller.export.chunk'))->toBe(100);
});
