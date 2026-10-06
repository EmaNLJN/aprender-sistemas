<?php

use App\Admin\AdminInvitations;
use App\Admin\InviteOutcome;
use App\Auth\InvitationNotFound;
use App\Auth\Invitations;
use App\Auth\Role;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow('2026-10-05 12:00:00');
    $this->admin = User::factory()->admin()->create();
    $this->invitations = app(AdminInvitations::class);
});

afterEach(fn () => Carbon::setTestNow());

function invitationRow(string $email): stdClass
{
    return DB::table('invitations')->where('email', $email)->first();
}

it('creates a student invitation with a 43 character token that expires in seven days', function () {
    $result = $this->invitations->invite('beto@x.com', Role::Student, $this->admin->id);

    $row = invitationRow('beto@x.com');
    $token = $result->issued->token;
    expect($result->outcome)->toBe(InviteOutcome::Created)
        ->and($result->email)->toBe('beto@x.com')
        ->and($token)->toMatch('/\A[A-Za-z0-9_-]{43}\z/')
        ->and($row->token_hash)->toBe(hash('sha256', $token))
        ->and($row->expires_at)->toBe('2026-10-12 12:00:00.000')
        ->and($row->role)->toBe('student')
        ->and($row->invited_by)->toBe($this->admin->id)
        ->and($row->delivery)->toBe('link')
        ->and($row->sent_at)->toBeNull()
        ->and($row->send_failed_at)->toBeNull();
});

it('creates an admin invitation that expires in forty-eight hours', function () {
    $this->invitations->invite('root@x.com', Role::Admin, $this->admin->id);

    $row = invitationRow('root@x.com');
    expect($row->role)->toBe('admin')
        ->and($row->expires_at)->toBe('2026-10-07 12:00:00.000');
});

it('answers invitation_pending and leaves a current invitation untouched', function () {
    $this->invitations->invite('beto@x.com', Role::Student, $this->admin->id);
    $before = invitationRow('beto@x.com');

    $result = $this->invitations->invite('beto@x.com', Role::Admin, $this->admin->id);

    expect($result->outcome)->toBe(InviteOutcome::Pending)
        ->and($result->issued)->toBeNull()
        ->and(invitationRow('beto@x.com'))->toEqual($before)
        ->and(DB::table('invitations')->count())->toBe(1);
});

it('renews an expired invitation with the requested role, a new token and a new expiry', function () {
    $first = $this->invitations->invite('beto@x.com', Role::Student, $this->admin->id);
    $oldHash = invitationRow('beto@x.com')->token_hash;
    $this->travel(8)->days();

    $result = $this->invitations->invite('beto@x.com', Role::Admin, $this->admin->id);

    $row = invitationRow('beto@x.com');
    expect($result->outcome)->toBe(InviteOutcome::Renewed)
        ->and($result->issued->token)->not->toBe($first->issued->token)
        ->and($row->token_hash)->toBe(hash('sha256', $result->issued->token))
        ->and($row->token_hash)->not->toBe($oldHash)
        ->and($row->role)->toBe('admin')
        ->and($row->expires_at)->toBe('2026-10-15 12:00:00.000')
        ->and(DB::table('invitations')->count())->toBe(1);
});

it('answers user_exists for an email that already has an account, canonicalized', function () {
    User::factory()->create(['email' => 'ana@x.com']);

    $result = $this->invitations->invite('  ANA@X.com ', Role::Student, $this->admin->id);

    expect($result->outcome)->toBe(InviteOutcome::UserExists)
        ->and($result->email)->toBe('ana@x.com')
        ->and($result->issued)->toBeNull()
        ->and(DB::table('invitations')->count())->toBe(0);
});

it('tells apart an email that differs only by an accent', function () {
    User::factory()->create(['email' => 'papá@x.com']);

    $result = $this->invitations->invite('papa@x.com', Role::Student, $this->admin->id);

    expect($result->outcome)->toBe(InviteOutcome::Created);
});

it('resends by rotating the token and the expiry according to the role', function () {
    $created = $this->invitations->invite('root@x.com', Role::Admin, $this->admin->id);
    $this->travel(1)->days();
    $invitation = Invitation::where('email', 'root@x.com')->firstOrFail();

    $issued = $this->invitations->resend($invitation);

    $row = invitationRow('root@x.com');
    expect($issued->token)->not->toBe($created->issued->token)
        ->and($row->token_hash)->toBe(hash('sha256', $issued->token))
        ->and($row->expires_at)->toBe('2026-10-08 12:00:00.000')
        ->and($row->invited_by)->toBe($this->admin->id)
        ->and($row->delivery)->toBe('link')
        ->and($row->sent_at)->toBeNull()
        ->and($row->send_failed_at)->toBeNull();
});

it('stops the previous link from working after a resend', function () {
    $created = $this->invitations->invite('beto@x.com', Role::Student, $this->admin->id);

    $this->invitations->resend(Invitation::where('email', 'beto@x.com')->firstOrFail());

    expect(fn () => app(Invitations::class)->lookup($created->issued->token))->toThrow(InvitationNotFound::class);
});

it('resends an expired invitation and clears the delivery marks of an email one', function () {
    $this->invitations->invite('beto@x.com', Role::Student, $this->admin->id);
    DB::table('invitations')->where('email', 'beto@x.com')->update([
        'delivery' => 'email',
        'sent_at' => '2026-10-05 12:00:00.000',
        'send_failed_at' => '2026-10-05 12:00:00.000',
    ]);
    $this->travel(8)->days();

    $issued = $this->invitations->resend(Invitation::where('email', 'beto@x.com')->firstOrFail());

    $row = invitationRow('beto@x.com');
    expect($row->expires_at)->toBe('2026-10-20 12:00:00.000')
        ->and($row->delivery)->toBe('link')
        ->and($row->sent_at)->toBeNull()
        ->and($row->send_failed_at)->toBeNull()
        ->and(app(Invitations::class)->lookup($issued->token)->email)->toBe('beto@x.com');
});

it('revokes an invitation so that its token stops working', function () {
    $created = $this->invitations->invite('beto@x.com', Role::Student, $this->admin->id);

    $this->invitations->revoke(Invitation::where('email', 'beto@x.com')->firstOrFail());

    expect(DB::table('invitations')->count())->toBe(0)
        ->and(fn () => app(Invitations::class)->lookup($created->issued->token))->toThrow(InvitationNotFound::class);
});

it('finds an invitation by id and fails for one that does not exist', function () {
    $this->invitations->invite('beto@x.com', Role::Student, $this->admin->id);
    $id = invitationRow('beto@x.com')->id;

    expect($this->invitations->find($id)->email)->toBe('beto@x.com')
        ->and(fn () => $this->invitations->find($id + 1))->toThrow(ModelNotFoundException::class);
});
