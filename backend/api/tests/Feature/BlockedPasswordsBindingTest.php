<?php

use App\Auth\PasswordPolicy;
use App\Auth\PasswordViolation;
use App\Auth\PlainPassword;

it('resolves the password policy with the configured blocked list', function () {
    useSampleBlockedPasswords();

    $violations = app(PasswordPolicy::class)->violations(PlainPassword::of('qwertyuiopasdfgh'), null, null);

    expect($violations)->toBe([PasswordViolation::Blocked]);
});

it('fails loudly when the configured blocked list is missing', function () {
    config(['taller.password_blocklist' => base_path('tests/Support/fixtures/no-such-list.txt')]);

    app(PasswordPolicy::class)->violations(PlainPassword::of('qwertyuiopasdfgh'), null, null);
})->throws(RuntimeException::class);
