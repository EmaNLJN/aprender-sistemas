<?php

use App\Auth\PublishedUser;
use App\Models\User;
use Tests\TestCase;

uses(TestCase::class);

function storedUser(string $role = 'student', ?string $privacyVersion = '2026-10-dev'): User
{
    return (new User)->setRawAttributes([
        'id' => 7,
        'name' => 'Ana Luz',
        'email' => 'ana@x.com',
        'password' => '$2y$04$hashhashhashhashhashhashhashhashhashhashhashhashhashh',
        'remember_token' => 'remember-me-token',
        'role' => $role,
        'status' => 'active',
        'privacy_version' => $privacyVersion,
    ]);
}

beforeEach(function () {
    config(['taller.privacy_version' => '2026-10-dev']);
});

it('publishes exactly five keys in order', function () {
    expect(PublishedUser::from(storedUser())->toPublished())->toBe([
        'id' => 7,
        'name' => 'Ana Luz',
        'email' => 'ana@x.com',
        'role' => 'student',
        'privacyAccepted' => true,
    ]);
});

it('publishes the role as text', function () {
    expect(PublishedUser::from(storedUser('admin'))->toPublished()['role'])->toBe('admin');
});

it('says the privacy notice is not accepted when the version is not the current one', function (?string $version) {
    expect(PublishedUser::from(storedUser('student', $version))->toPublished()['privacyAccepted'])->toBeFalse();
})->with([null, '2026-09']);

it('never carries the status, the hash or the remember token', function () {
    $json = json_encode(PublishedUser::from(storedUser())->toPublished(), JSON_THROW_ON_ERROR);

    expect($json)->not->toContain('status')->not->toContain('password')->not->toContain('remember')
        ->not->toContain('$2y$')->not->toContain('remember-me-token');
});
