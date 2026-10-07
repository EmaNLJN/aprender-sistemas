<?php

use App\Auth\AccountPasswords;
use App\Auth\PlainPassword;
use App\Models\User;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    config(['hashing.bcrypt.rounds' => 5]);
});

function costOf(string $hash): int
{
    $cost = password_get_info($hash)['options']['cost'] ?? null;

    return is_int($cost) ? $cost : -1;
}

it('hashes with bcrypt at the configured rounds', function () {
    $hash = (new AccountPasswords)->hash(PlainPassword::of('x7Kp2mQ9vL4tZ8w'));

    expect($hash)->toStartWith('$2y$05$');
});

it('follows the configured rounds', function () {
    config(['hashing.bcrypt.rounds' => 6]);

    expect(costOf((new AccountPasswords)->hash(PlainPassword::of('x7Kp2mQ9vL4tZ8w'))))->toBe(6);
});

it('verifies the password it set and rejects another', function () {
    $passwords = new AccountPasswords;
    $user = new User;

    $passwords->set($user, PlainPassword::of('x7Kp2mQ9vL4tZ8w'));

    expect($passwords->verify($user, PlainPassword::of('x7Kp2mQ9vL4tZ8w')))->toBeTrue()
        ->and($passwords->verify($user, PlainPassword::of('x7Kp2mQ9vL4tZ8W')))->toBeFalse();
});

it('verifies a composed á against a password set with a decomposed á', function () {
    $passwords = new AccountPasswords;
    $user = new User;

    $passwords->set($user, PlainPassword::of("pa\u{0301}-pa\u{0301}-pa\u{0301}-pa\u{0301}"));

    expect($passwords->verify($user, PlainPassword::of("p\u{00E1}-p\u{00E1}-p\u{00E1}-p\u{00E1}")))->toBeTrue();
});

it('is false without an account and still pays the cost of a hash', function () {
    $passwords = new AccountPasswords;

    expect($passwords->verifyOrDummy(null, PlainPassword::of('x7Kp2mQ9vL4tZ8w')))->toBeFalse()
        ->and(costOf($passwords->dummyHash()))->toBe(5);
});

it('verifies against the account when there is one', function () {
    $passwords = new AccountPasswords;
    $user = new User;
    $passwords->set($user, PlainPassword::of('x7Kp2mQ9vL4tZ8w'));

    expect($passwords->verifyOrDummy($user, PlainPassword::of('x7Kp2mQ9vL4tZ8w')))->toBeTrue()
        ->and($passwords->verifyOrDummy($user, PlainPassword::of('otra-contraseña-larga')))->toBeFalse();
});

it('builds the dummy hash once per cost', function () {
    $passwords = new AccountPasswords;

    expect($passwords->dummyHash())->toBe((new AccountPasswords)->dummyHash());
});

it('builds the dummy hash again when the configured cost changes', function () {
    $passwords = new AccountPasswords;
    $first = $passwords->dummyHash();

    config(['hashing.bcrypt.rounds' => 6]);

    expect(costOf($passwords->dummyHash()))->toBe(6)->and($first)->not->toBe($passwords->dummyHash());
});
