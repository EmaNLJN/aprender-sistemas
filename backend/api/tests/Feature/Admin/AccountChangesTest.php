<?php

use App\Admin\AccountBeingDeleted;
use App\Admin\AccountChanges;
use App\Admin\LastAdmin;
use App\Admin\RestrictsItself;
use App\Auth\AccountStatus;
use App\Auth\Events\AccountRestricted;
use App\Auth\Events\AccountRestriction;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

function accountChanges(): AccountChanges
{
    return app(AccountChanges::class);
}

function invitationCreatedBy(User $admin, string $email): void
{
    DB::table('invitations')->insert([
        'email' => $email,
        'role' => 'student',
        'delivery' => 'link',
        'token_hash' => hash('sha256', $email),
        'invited_by' => $admin->id,
        'expires_at' => now()->addDay(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function recoveryTokenOf(User $user): void
{
    DB::table('password_reset_tokens')->insert(['email' => $user->email, 'token' => 'hashed', 'created_at' => now()]);
}

function sessionRowOf(User $user, string $id): void
{
    DB::table('sessions')->insert(['id' => $id, 'user_id' => $user->id, 'payload' => '', 'last_activity' => now()->getTimestamp()]);
}

function statementsWritingToTheDatabase(): int
{
    return collect(DB::getQueryLog())
        ->filter(fn (array $entry) => preg_match('/^\s*(update|insert|delete)\b/i', $entry['query']) === 1)
        ->count();
}

beforeEach(function () {
    $this->actor = User::factory()->admin()->create();
});

it('disables another admin, drops the recovery token and the invitations they created, and announces it', function () {
    Event::fake([AccountRestricted::class]);
    $other = User::factory()->admin()->create();
    invitationCreatedBy($other, 'one@x.com');
    invitationCreatedBy($other, 'two@x.com');
    invitationCreatedBy($this->actor, 'kept@x.com');
    recoveryTokenOf($other);

    $changed = accountChanges()->change($this->actor, $other->id, null, AccountStatus::Disabled);

    expect($changed->status)->toBe(AccountStatus::Disabled)
        ->and($other->fresh()->status)->toBe(AccountStatus::Disabled)
        ->and(DB::table('password_reset_tokens')->where('email', $other->email)->count())->toBe(0)
        ->and(DB::table('invitations')->where('invited_by', $other->id)->count())->toBe(0)
        ->and(DB::table('invitations')->where('invited_by', $this->actor->id)->count())->toBe(1);
    Event::assertDispatched(AccountRestricted::class, fn (AccountRestricted $event) => $event->userId === $other->id && $event->reason === AccountRestriction::Disabled);
    Event::assertDispatchedTimes(AccountRestricted::class, 1);
});

it('refuses with LastAdmin when the actor is a disabled admin and the target is the only active admin', function () {
    Event::fake([AccountRestricted::class]);
    $actor = User::factory()->admin()->disabled()->create();
    $target = $this->actor;

    expect(fn () => accountChanges()->change($actor, $target->id, null, AccountStatus::Disabled))->toThrow(LastAdmin::class);

    expect($target->fresh()->status)->toBe(AccountStatus::Active);
    Event::assertNotDispatched(AccountRestricted::class);
});

it('refuses with RestrictsItself without a single query when the only admin disables themselves', function () {
    Event::fake([AccountRestricted::class]);
    DB::enableQueryLog();

    expect(fn () => accountChanges()->change($this->actor, $this->actor->id, null, AccountStatus::Disabled))->toThrow(RestrictsItself::class);

    expect(DB::getQueryLog())->toBe([]);
});

it('refuses with RestrictsItself when the only admin demotes themselves', function () {
    Event::fake([AccountRestricted::class]);
    expect(fn () => accountChanges()->change($this->actor, $this->actor->id, Role::Student, null))->toThrow(RestrictsItself::class);

    expect($this->actor->fresh()->role)->toBe(Role::Admin);
});

it('refuses with RestrictsItself when an admin demotes themselves even if another admin exists', function () {
    Event::fake([AccountRestricted::class]);
    User::factory()->admin()->create();

    expect(fn () => accountChanges()->change($this->actor, $this->actor->id, Role::Student, AccountStatus::Active))->toThrow(RestrictsItself::class);
});

it('demotes another admin, drops the invitations they created, keeps their recovery token and announces Demoted only', function () {
    Event::fake([AccountRestricted::class]);
    $other = User::factory()->admin()->create();
    invitationCreatedBy($other, 'one@x.com');
    recoveryTokenOf($other);

    $changed = accountChanges()->change($this->actor, $other->id, Role::Student, null);

    expect($changed->role)->toBe(Role::Student)
        ->and($other->fresh()->role)->toBe(Role::Student)
        ->and(DB::table('invitations')->where('invited_by', $other->id)->count())->toBe(0)
        ->and(DB::table('password_reset_tokens')->where('email', $other->email)->count())->toBe(1);
    Event::assertDispatched(AccountRestricted::class, fn (AccountRestricted $event) => $event->userId === $other->id && $event->reason === AccountRestriction::Demoted);
    Event::assertDispatchedTimes(AccountRestricted::class, 1);
});

it('announces both restrictions when the change disables and demotes at once', function () {
    Event::fake([AccountRestricted::class]);
    $other = User::factory()->admin()->create();

    accountChanges()->change($this->actor, $other->id, Role::Student, AccountStatus::Disabled);

    Event::assertDispatched(AccountRestricted::class, fn (AccountRestricted $event) => $event->reason === AccountRestriction::Disabled);
    Event::assertDispatched(AccountRestricted::class, fn (AccountRestricted $event) => $event->reason === AccountRestriction::Demoted);
});

it('promotes a student, rotates their remember token and announces nothing', function () {
    Event::fake([AccountRestricted::class]);
    $student = User::factory()->create();
    $tokenBefore = $student->remember_token;

    $changed = accountChanges()->change($this->actor, $student->id, Role::Admin, null);

    expect($changed->role)->toBe(Role::Admin)
        ->and($student->fresh()->role)->toBe(Role::Admin)
        ->and($student->fresh()->remember_token)->not->toBe($tokenBefore);
    Event::assertNotDispatched(AccountRestricted::class);
});

it('re-enables a disabled account without announcing or deleting anything', function () {
    Event::fake([AccountRestricted::class]);
    $student = User::factory()->disabled()->create();
    recoveryTokenOf($student);

    $changed = accountChanges()->change($this->actor, $student->id, null, AccountStatus::Active);

    expect($changed->status)->toBe(AccountStatus::Active)
        ->and($student->fresh()->status)->toBe(AccountStatus::Active)
        ->and(DB::table('password_reset_tokens')->where('email', $student->email)->count())->toBe(1);
    Event::assertNotDispatched(AccountRestricted::class);
});

it('keeps the session rows of a disabled account', function () {
    Event::fake([AccountRestricted::class]);
    $student = User::factory()->create();
    sessionRowOf($student, 'first');
    sessionRowOf($student, 'second');

    accountChanges()->change($this->actor, $student->id, null, AccountStatus::Disabled);

    expect(DB::table('sessions')->where('user_id', $student->id)->count())->toBe(2);
});

it('refuses with AccountBeingDeleted when the target is being deleted', function () {
    Event::fake([AccountRestricted::class]);
    $student = User::factory()->deleting()->create();

    expect(fn () => accountChanges()->change($this->actor, $student->id, null, AccountStatus::Disabled))->toThrow(AccountBeingDeleted::class);

    expect($student->fresh()->status)->toBe(AccountStatus::Deleting);
});

it('returns the target with zero writes and no event when nothing changes', function () {
    Event::fake([AccountRestricted::class]);
    $student = User::factory()->create();
    DB::enableQueryLog();

    $changed = accountChanges()->change($this->actor, $student->id, Role::Student, AccountStatus::Active);

    expect($changed->is($student))->toBeTrue()
        ->and(statementsWritingToTheDatabase())->toBe(0);
    Event::assertNotDispatched(AccountRestricted::class);
});

it('throws ModelNotFoundException for a target that does not exist', function () {
    Event::fake([AccountRestricted::class]);
    expect(fn () => accountChanges()->change($this->actor, 999999, null, AccountStatus::Disabled))->toThrow(ModelNotFoundException::class);
});

it('announces outside the transaction of the change', function () {
    $levelsSeen = [];
    Event::listen(AccountRestricted::class, function (AccountRestricted $event) use (&$levelsSeen) {
        $levelsSeen[] = [$event->userId, $event->reason, DB::transactionLevel()];
    });
    $other = User::factory()->admin()->create();
    $levelBefore = DB::transactionLevel();

    accountChanges()->change($this->actor, $other->id, null, AccountStatus::Disabled);

    expect($levelsSeen)->toBe([[$other->id, AccountRestriction::Disabled, $levelBefore]]);
});
