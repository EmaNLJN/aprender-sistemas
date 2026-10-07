<?php

use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

afterEach(fn () => Carbon::setTestNow());

it('FR-002: mass assignment cannot set role or status', function () {
    $user = User::create(['name' => 'Ana', 'email' => 'ana@x.com', 'password' => 'x', 'role' => 'admin', 'status' => 'disabled']);

    $stored = DB::table('users')->where('id', $user->id)->first();

    expect($stored->role)->toBe('student')
        ->and($stored->status)->toBe('active')
        ->and($user->role)->toBe(Role::Student)
        ->and($user->status)->toBe(AccountStatus::Active);
});

it('casts role and status to their enums', function () {
    $user = User::factory()->admin()->create();

    $reloaded = User::findOrFail($user->id);

    expect($reloaded->role)->toBe(Role::Admin)
        ->and($reloaded->status)->toBe(AccountStatus::Active);
});

it('the factory states set the role, the status and the verification', function () {
    expect(User::factory()->create()->role)->toBe(Role::Student)
        ->and(User::factory()->disabled()->create()->status)->toBe(AccountStatus::Disabled)
        ->and(User::factory()->deleting()->create()->status)->toBe(AccountStatus::Deleting)
        ->and(User::factory()->create()->hasVerifiedEmail())->toBeTrue()
        ->and(User::factory()->unverified()->create()->hasVerifiedEmail())->toBeFalse()
        ->and(User::factory()->unverified()->create()->email_verified_at)->toBeNull();
});

it('withPassword stores a hash that verifies the plain text', function () {
    $user = User::factory()->withPassword('correct horse battery')->create();

    expect($user->password)->not->toBe('correct horse battery')
        ->and(Hash::check('correct horse battery', $user->password))->toBeTrue();
});

it('stores and returns instants with milliseconds', function () {
    Carbon::setTestNow('2026-10-05 12:00:00.123');

    $user = User::factory()->create();

    expect(DB::table('users')->where('id', $user->id)->value('created_at'))->toBe('2026-10-05 12:00:00.123')
        ->and(User::findOrFail($user->id)->created_at?->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:00:00.123');
});

it('the privacy acceptance round-trips as a date', function () {
    $user = User::factory()->create();
    $user->forceFill(['privacy_version' => 'v1', 'privacy_accepted_at' => Carbon::parse('2026-10-05 08:30:00.456')])->save();

    expect(User::findOrFail($user->id)->privacy_accepted_at?->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 08:30:00.456');
});

function invitationExpiringAt(string $email, string $expiresAt): Invitation
{
    return Invitation::forceCreate([
        'email' => $email, 'role' => 'student', 'delivery' => 'link', 'token_hash' => hash('sha256', $email),
        'expires_at' => Carbon::parse($expiresAt), 'created_at' => '2026-08-01 00:00:00.000', 'updated_at' => '2026-08-01 00:00:00.000',
    ]);
}

it('prunes only invitations that expired more than 30 days ago', function () {
    Carbon::setTestNow('2026-10-05 12:00:00.000');
    invitationExpiringAt('old@x.com', '2026-09-04 11:59:59.000');
    invitationExpiringAt('recent@x.com', '2026-09-05 12:00:01.000');
    invitationExpiringAt('pending@x.com', '2026-10-10 00:00:00.000');

    Artisan::call('model:prune', ['--model' => Invitation::class]);

    expect(Invitation::orderBy('email')->pluck('email')->all())->toBe(['pending@x.com', 'recent@x.com']);
});

it('casts the invitation role and instants', function () {
    $invitation = invitationExpiringAt('ana@x.com', '2026-10-12 00:00:00.789');

    $reloaded = Invitation::findOrFail($invitation->id);

    expect($reloaded->role)->toBe(Role::Student)
        ->and($reloaded->expires_at->format('Y-m-d H:i:s.v'))->toBe('2026-10-12 00:00:00.789');
});
