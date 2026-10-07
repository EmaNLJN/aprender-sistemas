<?php

use App\Admin\AccountChanges;
use App\Admin\LastAdmin;
use App\Auth\AccountStatus;
use App\Auth\Events\AccountRestricted;
use App\Auth\Events\AccountRestriction;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

function adminPendingInvitation(string $email, ?User $invitedBy = null): void
{
    DB::table('invitations')->insert([
        'email' => $email,
        'role' => 'student',
        'delivery' => 'link',
        'token_hash' => hash('sha256', $email),
        'invited_by' => $invitedBy?->id,
        'expires_at' => now()->addDay(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function adminLiveSession(User $user, string $id): void
{
    DB::table('sessions')->insert(['id' => $id, 'user_id' => $user->id, 'payload' => '', 'last_activity' => now()->getTimestamp()]);
}

beforeEach(function () {
    Event::fake([AccountRestricted::class]);
});

it('moves a student to deleting and takes away their sessions, tokens and pending invitation', function () {
    $student = User::factory()->create(['email' => 'ana@x.com']);
    adminLiveSession($student, 'first');
    adminLiveSession($student, 'second');
    DB::table('password_reset_tokens')->insert(['email' => 'ana@x.com', 'token' => 'hashed', 'created_at' => now()]);
    adminPendingInvitation('ana@x.com');
    adminPendingInvitation('other@x.com');
    $tokenBefore = $student->remember_token;

    $deleted = app(AccountChanges::class)->beginDeletion($student->id);

    expect($deleted->status)->toBe(AccountStatus::Deleting)
        ->and($student->fresh()->status)->toBe(AccountStatus::Deleting)
        ->and($student->fresh()->remember_token)->not->toBe($tokenBefore)
        ->and(DB::table('sessions')->where('user_id', $student->id)->count())->toBe(0)
        ->and(DB::table('password_reset_tokens')->where('email', 'ana@x.com')->count())->toBe(0)
        ->and(DB::table('invitations')->where('email', 'ana@x.com')->count())->toBe(0)
        ->and(DB::table('invitations')->where('email', 'other@x.com')->count())->toBe(1);
    Event::assertDispatched(AccountRestricted::class, fn (AccountRestricted $event) => $event->userId === $student->id && $event->reason === AccountRestriction::Deleting);
    Event::assertDispatchedTimes(AccountRestricted::class, 1);
});

it('drops the invitations that an admin created', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->admin()->create();
    adminPendingInvitation('one@x.com', $admin);
    adminPendingInvitation('two@x.com', $admin);

    app(AccountChanges::class)->beginDeletion($admin->id);

    expect(DB::table('invitations')->where('invited_by', $admin->id)->count())->toBe(0);
});

it('is idempotent: an account already deleting comes back with no writes and no event', function () {
    $student = User::factory()->deleting()->create();
    $updatedAt = $student->fresh()->updated_at;
    $this->travel(5)->minutes();
    DB::enableQueryLog();

    $deleted = app(AccountChanges::class)->beginDeletion($student->id);

    $writes = collect(DB::getQueryLog())->filter(fn (array $entry) => preg_match('/^\s*(update|insert|delete)\b/i', $entry['query']) === 1);
    expect($deleted->status)->toBe(AccountStatus::Deleting)
        ->and($writes)->toHaveCount(0)
        ->and($student->fresh()->updated_at->equalTo($updatedAt))->toBeTrue();
    Event::assertNotDispatched(AccountRestricted::class);
});

it('refuses with LastAdmin for the only active admin and changes nothing', function () {
    $admin = User::factory()->admin()->create();
    adminLiveSession($admin, 'kept');

    expect(fn () => app(AccountChanges::class)->beginDeletion($admin->id))->toThrow(LastAdmin::class);

    expect($admin->fresh()->status)->toBe(AccountStatus::Active)
        ->and(DB::table('sessions')->where('user_id', $admin->id)->count())->toBe(1);
    Event::assertNotDispatched(AccountRestricted::class);
});

it('proceeds on the only active admin without the guard', function () {
    $admin = User::factory()->admin()->create();

    $deleted = app(AccountChanges::class)->beginDeletion($admin->id, guardLastAdmin: false);

    expect($deleted->status)->toBe(AccountStatus::Deleting);
});

it('throws ModelNotFoundException for an id that does not exist', function () {
    expect(fn () => app(AccountChanges::class)->beginDeletion(999999))->toThrow(ModelNotFoundException::class);
});
