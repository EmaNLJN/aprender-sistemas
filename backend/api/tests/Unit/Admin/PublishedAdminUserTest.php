<?php

use App\Admin\PublishedAdminUser;
use App\Models\User;
use Tests\TestCase;

uses(TestCase::class);

function storedAdminUser(string $role = 'student', string $status = 'active', ?string $verifiedAt = '2026-10-05 12:00:00.000', ?string $privacyVersion = '2026-10-dev'): User
{
    return (new User)->setRawAttributes([
        'id' => 12,
        'name' => 'Ana Pérez',
        'email' => 'ana@x.com',
        'password' => '$2y$04$hashhashhashhashhashhashhashhashhashhashhashhashhashh',
        'remember_token' => 'remember-me-token',
        'role' => $role,
        'status' => $status,
        'email_verified_at' => $verifiedAt,
        'privacy_version' => $privacyVersion,
        'created_at' => '2026-10-05 12:00:00.000',
        'updated_at' => '2026-10-06 08:30:15.123',
    ]);
}

it('publishes exactly the nine keys in order, with the role and the status as text and the instants in UTC', function () {
    expect(PublishedAdminUser::from(storedAdminUser('admin', 'disabled'))->toPublished())->toBe([
        'id' => 12,
        'name' => 'Ana Pérez',
        'email' => 'ana@x.com',
        'role' => 'admin',
        'status' => 'disabled',
        'emailVerified' => true,
        'privacyVersion' => '2026-10-dev',
        'createdAt' => '2026-10-05T12:00:00.000Z',
        'updatedAt' => '2026-10-06T08:30:15.123Z',
    ]);
});

it('publishes emailVerified false and a null privacy version when there is none', function () {
    $published = PublishedAdminUser::from(storedAdminUser(verifiedAt: null, privacyVersion: null))->toPublished();

    expect($published['emailVerified'])->toBeFalse()
        ->and($published['privacyVersion'])->toBeNull();
});

it('never publishes the hash or the remember token', function () {
    expect(array_keys(PublishedAdminUser::from(storedAdminUser())->toPublished()))->not->toContain('password', 'rememberToken', 'remember_token');
});
