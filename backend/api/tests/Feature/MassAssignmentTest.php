<?php

use App\Auth\AccountStatus;
use App\Auth\Invitations;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Support\Carbon;
use Tests\Support\Browser;

// Browser drops the cookies that expire before the real clock, so the invitation tests live in the future.
beforeEach(function () {
    useSampleBlockedPasswords();
    Carbon::setTestNow('2030-01-01 12:00:00');
});

afterEach(fn () => Carbon::setTestNow());

it('ignores role and status when an account is created with User::create', function () {
    $user = User::create(['name' => 'Ana', 'email' => 'ana@x.com', 'password' => 'x7Kp2mQ9vL4tZ8w', 'role' => 'admin', 'status' => 'disabled']);

    $stored = $user->fresh();
    expect($stored->role)->toBe(Role::Student)->and($stored->status)->toBe(AccountStatus::Active);
});

it('changes only the name on PATCH /api/me, whatever else the body carries', function () {
    $other = User::factory()->create();
    $ana = User::factory()->create(['name' => 'Ana', 'email' => 'ana@x.com']);
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($ana);

    $browser->send('PATCH', '/api/me', ['name' => 'Ana María', 'role' => 'admin', 'status' => 'disabled', 'email' => 'otra@x.com', 'user_id' => $other->id])
        ->assertOk()
        ->assertJsonPath('data.name', 'Ana María')
        ->assertJsonPath('data.role', 'student');

    $stored = $ana->fresh();
    expect($stored->name)->toBe('Ana María')
        ->and($stored->role)->toBe(Role::Student)
        ->and($stored->status)->toBe(AccountStatus::Active)
        ->and($stored->email)->toBe('ana@x.com')
        ->and($other->fresh()->name)->toBe($other->name);
});

it('takes the role of the account from the invitation, not from the accept body', function () {
    $other = User::factory()->create(['name' => 'Beto']);
    $issued = app(Invitations::class)->issue('nueva@x.com', Role::Student, null);
    $browser = Browser::for($this)->useDatabaseDrivers();

    $browser->post('/api/auth/invitations/accept', [
        'token' => $issued->token,
        'name' => 'Nueva Cuenta',
        'password' => 'x7Kp2mQ9vL4tZ8w',
        'password_confirmation' => 'x7Kp2mQ9vL4tZ8w',
        'privacyVersion' => config()->string('taller.privacy_version'),
        'role' => 'admin',
        'status' => 'disabled',
        'user_id' => $other->id,
    ])->assertCreated()->assertJsonPath('data.role', 'student');

    $created = User::where('email', 'nueva@x.com')->firstOrFail();
    expect($created->role)->toBe(Role::Student)
        ->and($created->status)->toBe(AccountStatus::Active)
        ->and($created->id)->not->toBe($other->id)
        ->and($other->fresh()->name)->toBe('Beto')
        ->and($other->fresh()->email)->toBe($other->email);
});

it('changes only the role on PATCH /api/admin/users/{id}, whatever else the body carries', function () {
    $admin = User::factory()->admin()->create();
    $target = User::factory()->admin()->create(['name' => 'Beto', 'email' => 'beto@x.com']);
    $passwordHash = $target->password;
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($admin);
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

    $browser->send('PATCH', "/api/admin/users/{$target->id}", ['role' => 'student', 'email' => 'otra@x.com', 'name' => 'X', 'password' => 'x', 'user_id' => 99])
        ->assertOk()
        ->assertJsonPath('data.role', 'student')
        ->assertJsonPath('data.email', 'beto@x.com')
        ->assertJsonPath('data.name', 'Beto');

    $stored = $target->fresh();
    expect($stored->role)->toBe(Role::Student)
        ->and($stored->email)->toBe('beto@x.com')
        ->and($stored->name)->toBe('Beto')
        ->and($stored->password)->toBe($passwordHash)
        ->and($stored->id)->toBe($target->id)
        ->and(User::find(99))->toBeNull()
        ->and($admin->fresh()->name)->toBe($admin->name);
});
