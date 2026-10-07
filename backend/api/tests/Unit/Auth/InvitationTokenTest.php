<?php

use App\Auth\InvitationToken;

it('hashes with sha256 in hexadecimal', function () {
    expect(InvitationToken::hash('abc'))
        ->toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

it('accepts a token of 43 base64url characters', function () {
    expect(InvitationToken::isWellFormed(str_repeat('aZ09_-', 7).'A'))->toBeTrue();
});

it('rejects a malformed token', function (string $token) {
    expect(InvitationToken::isWellFormed($token))->toBeFalse();
})->with([
    '42 characters' => [str_repeat('a', 42)],
    '44 characters' => [str_repeat('a', 44)],
    'plus sign' => [str_repeat('a', 42).'+'],
    'padding' => [str_repeat('a', 42).'='],
    'trailing newline' => [str_repeat('a', 43)."\n"],
    'empty' => [''],
]);

it('generates distinct well-formed tokens of 43 characters', function () {
    $first = InvitationToken::generate();
    $second = InvitationToken::generate();

    expect($first)->toHaveLength(43)->and(InvitationToken::isWellFormed($first))->toBeTrue()
        ->and(InvitationToken::isWellFormed($second))->toBeTrue()
        ->and($first)->not->toBe($second);
});
