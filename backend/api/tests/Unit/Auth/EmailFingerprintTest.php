<?php

use App\Auth\EmailFingerprint;
use Tests\TestCase;

uses(TestCase::class);

// The expected values come from `printf 'ana@x.com' | openssl dgst -sha256 -hmac <key>`, cut to 16 characters.
it('is the first 16 hexadecimals of the HMAC-SHA256 of the canonical email', function () {
    config(['taller.log_hmac_key' => 'secret']);

    expect(EmailFingerprint::of('ana@x.com'))->toBe('8a7122f355ddfdc8')
        ->and(EmailFingerprint::of('Ana@X.com'))->toBe('8a7122f355ddfdc8');
});

it('depends on the configured key', function () {
    config(['taller.log_hmac_key' => 'otra-clave']);

    expect(EmailFingerprint::of('ana@x.com'))->toBe('738e0f38b85ed75e');
});

it('fails loudly without a configured key', function (mixed $key) {
    config(['taller.log_hmac_key' => $key]);

    EmailFingerprint::of('ana@x.com');
})->with([null, ''])->throws(LogicException::class);
