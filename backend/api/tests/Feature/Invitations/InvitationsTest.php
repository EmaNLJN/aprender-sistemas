<?php

use App\Auth\AccountPasswords;
use App\Auth\AccountStatus;
use App\Auth\EmailTaken;
use App\Auth\InvitationExpired;
use App\Auth\InvitationNotFound;
use App\Auth\Invitations;
use App\Auth\PlainPassword;
use App\Auth\Role;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    Carbon::setTestNow('2026-10-05 12:00:00');
    $this->invitations = app(Invitations::class);
});

afterEach(fn () => Carbon::setTestNow());

function storedInvitation(string $email): stdClass
{
    return DB::table('invitations')->where('email', $email)->first();
}

it('issues a student invitation that expires in seven days', function () {
    $issued = $this->invitations->issue('  Ana@X.com ', Role::Student, null);

    $row = storedInvitation('ana@x.com');
    expect($row->email)->toBe('ana@x.com')
        ->and($row->role)->toBe('student')
        ->and($row->delivery)->toBe('link')
        ->and($row->invited_by)->toBeNull()
        ->and($row->expires_at)->toBe('2026-10-12 12:00:00.000')
        ->and($issued->renewed)->toBeFalse()
        ->and($issued->invitation->is(Invitation::findOrFail($row->id)))->toBeTrue();
});

it('issues an admin invitation that expires in forty-eight hours', function () {
    $this->invitations->issue('root@x.com', Role::Admin, null);

    expect(storedInvitation('root@x.com')->expires_at)->toBe('2026-10-07 12:00:00.000');
});

it('records who invited', function () {
    $inviter = User::factory()->admin()->create();

    $this->invitations->issue('ana@x.com', Role::Student, $inviter->id);

    expect(storedInvitation('ana@x.com')->invited_by)->toBe($inviter->id);
});

it('stores only the sha256 of a 43 character token', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    expect(strlen($issued->token))->toBe(43)
        ->and(storedInvitation('ana@x.com')->token_hash)->toBe(hash('sha256', $issued->token))
        ->and(DB::table('invitations')->where('email', $issued->token)->exists())->toBeFalse();
});

it('builds the link from APP_URL whatever the Host of the request', function () {
    config(['app.url' => 'https://taller.example']);
    request()->headers->set('Host', 'evil.example');

    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    expect($issued->link())->toBe("https://taller.example/#invitacion={$issued->token}");
});

it('renews a pending invitation in the same row with a new token, role and expiry', function () {
    $first = $this->invitations->issue('ana@x.com', Role::Student, null);
    Carbon::setTestNow('2026-10-06 12:00:00');

    $second = $this->invitations->issue('ANA@x.com', Role::Admin, null);

    expect(DB::table('invitations')->count())->toBe(1)
        ->and($second->renewed)->toBeTrue()
        ->and($second->token)->not->toBe($first->token)
        ->and(storedInvitation('ana@x.com')->token_hash)->toBe(hash('sha256', $second->token))
        ->and(storedInvitation('ana@x.com')->role)->toBe('admin')
        ->and(storedInvitation('ana@x.com')->expires_at)->toBe('2026-10-08 12:00:00.000');
    expect(fn () => $this->invitations->lookup($first->token))->toThrow(InvitationNotFound::class);
});

it('renews an expired invitation', function () {
    $first = $this->invitations->issue('ana@x.com', Role::Student, null);
    Carbon::setTestNow('2026-10-20 12:00:00');

    $second = $this->invitations->issue('ana@x.com', Role::Student, null);

    expect($second->renewed)->toBeTrue()
        ->and(storedInvitation('ana@x.com')->expires_at)->toBe('2026-10-27 12:00:00.000')
        ->and($this->invitations->lookup($second->token)->email)->toBe('ana@x.com');
});

it('refuses to invite an email that already has an account, whatever its case', function () {
    User::factory()->create(['email' => 'ana@x.com']);

    expect(fn () => $this->invitations->issue('ANA@x.com', Role::Student, null))->toThrow(EmailTaken::class);
    expect(DB::table('invitations')->count())->toBe(0);
});

it('tells emails that differ only by an accent apart', function () {
    User::factory()->create(['email' => 'papa.com.ar']);

    $issued = $this->invitations->issue('papá.com.ar', Role::Student, null);

    expect($issued->invitation->email)->toBe('papá.com.ar');
});

it('looks up a current invitation', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    expect($this->invitations->lookup($issued->token)->email)->toBe('ana@x.com');
});

it('looks up an invitation at its last second and rejects it one second later', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    Carbon::setTestNow('2026-10-12 12:00:00');
    expect($this->invitations->lookup($issued->token)->email)->toBe('ana@x.com');

    Carbon::setTestNow('2026-10-12 12:00:01');
    expect(fn () => $this->invitations->lookup($issued->token))->toThrow(InvitationExpired::class);
});

it('does not find an invented token', function () {
    expect(fn () => $this->invitations->lookup(str_repeat('a', 43)))->toThrow(InvitationNotFound::class);
});

it('does not query invitations for a malformed token', function () {
    $queries = [];
    DB::listen(function ($query) use (&$queries) {
        $queries[] = $query->sql;
    });

    expect(fn () => $this->invitations->lookup('short'))->toThrow(InvitationNotFound::class);

    expect(collect($queries)->filter(fn ($sql) => str_contains($sql, 'invitations')))->toBeEmpty();
});

function acceptInvitation(Invitations $invitations, string $token, string $password = 'x7Kp2mQ9vL4tZ8w'): User
{
    return $invitations->accept($token, 'Ana Pérez', PlainPassword::of($password), '2026-10-dev');
}

it('creates an active verified account with the invitation role, the name and the privacy notice', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Admin, null);

    $user = acceptInvitation($this->invitations, $issued->token);

    $stored = User::findOrFail($user->id);
    expect($stored->email)->toBe('ana@x.com')
        ->and($stored->name)->toBe('Ana Pérez')
        ->and($stored->role)->toBe(Role::Admin)
        ->and($stored->status)->toBe(AccountStatus::Active)
        ->and($stored->email_verified_at?->toDateTimeString())->toBe('2026-10-05 12:00:00')
        ->and($stored->privacy_version)->toBe('2026-10-dev')
        ->and($stored->privacy_accepted_at?->toDateTimeString())->toBe('2026-10-05 12:00:00')
        ->and(DB::table('invitations')->count())->toBe(0);
});

it('stores a password that verifies', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    $user = acceptInvitation($this->invitations, $issued->token, 'x7Kp2mQ9vL4tZ8w');

    expect(app(AccountPasswords::class)->verify($user, PlainPassword::of('x7Kp2mQ9vL4tZ8w')))->toBeTrue()
        ->and(app(AccountPasswords::class)->verify($user, PlainPassword::of('x7Kp2mQ9vL4tZ8x')))->toBeFalse();
});

it('verifies a password set decomposed with the composed form', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    $user = acceptInvitation($this->invitations, $issued->token, "contrasen\u{0061}\u{0301}-larga-1234");

    expect(app(AccountPasswords::class)->verify($user, PlainPassword::of("contrasen\u{00E1}-larga-1234")))->toBeTrue();
});

it('hashes the password before the transaction opens', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);
    $outsideTransaction = DB::transactionLevel();
    $recorder = new class(app('hash'))
    {
        /** @var list<int> */
        public array $levels = [];

        public function __construct(private object $real) {}

        public function make(string $value, array $options = []): string
        {
            $this->levels[] = DB::transactionLevel();

            return $this->real->make($value, $options);
        }

        /** @param array<int, mixed> $arguments */
        public function __call(string $method, array $arguments): mixed
        {
            return $this->real->{$method}(...$arguments);
        }
    };
    Hash::swap($recorder);

    acceptInvitation($this->invitations, $issued->token);

    expect($recorder->levels)->toBe([$outsideTransaction]);
});

it('logs the acceptance once with the inviter and the account, without secrets', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);
    Log::spy();

    $user = acceptInvitation($this->invitations, $issued->token, 'x7Kp2mQ9vL4tZ8w');

    Log::shouldHaveReceived('info')->once()->with('invitation.accepted', ['invited_by' => null, 'user_id' => $user->id]);
});

it('logs the inviter of the invitation that was accepted', function () {
    $inviter = User::factory()->admin()->create();
    $issued = $this->invitations->issue('ana@x.com', Role::Student, $inviter->id);
    Log::spy();

    $user = acceptInvitation($this->invitations, $issued->token);

    Log::shouldHaveReceived('info')->once()->with('invitation.accepted', ['invited_by' => $inviter->id, 'user_id' => $user->id]);
});

it('does not accept the same token twice', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);
    acceptInvitation($this->invitations, $issued->token);

    expect(fn () => acceptInvitation($this->invitations, $issued->token))->toThrow(InvitationNotFound::class);
    expect(User::where('email', 'ana@x.com')->count())->toBe(1);
});

it('does not accept an expired invitation and keeps it', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);
    Carbon::setTestNow('2026-10-12 12:00:01');

    expect(fn () => acceptInvitation($this->invitations, $issued->token))->toThrow(InvitationExpired::class);
    expect(User::where('email', 'ana@x.com')->exists())->toBeFalse()
        ->and(DB::table('invitations')->count())->toBe(1);
});

it('does not accept a malformed token', function () {
    expect(fn () => acceptInvitation($this->invitations, 'short'))->toThrow(InvitationNotFound::class);
});

it('reports an email taken when an account appeared after the invitation was issued and keeps the invitation', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);
    User::factory()->create(['email' => 'ANA@x.com']);

    expect(fn () => acceptInvitation($this->invitations, $issued->token))->toThrow(EmailTaken::class);
    expect(DB::table('invitations')->count())->toBe(1);
});
