<?php

use App\Auth\InvitationToken;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;

beforeEach(function () {
    Carbon::setTestNow('2026-10-05 12:00:00');
    $this->admin = User::factory()->admin()->create(['name' => 'Ana']);
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
});

afterEach(fn () => Carbon::setTestNow());

function insertListedInvitation(string $email, string $role, string $createdAt, string $expiresAt, ?int $invitedBy, ?string $token = null): int
{
    return DB::table('invitations')->insertGetId([
        'email' => $email,
        'role' => $role,
        'delivery' => 'link',
        'token_hash' => InvitationToken::hash($token ?? InvitationToken::generate()),
        'invited_by' => $invitedBy,
        'expires_at' => $expiresAt,
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ]);
}

function insertFourListedInvitations(User $admin): array
{
    return [
        'a' => insertListedInvitation('a@x.com', 'admin', '2026-10-04 12:00:00.000', '2026-10-06 12:00:00.000', $admin->id),
        'b' => insertListedInvitation('b@x.com', 'student', '2026-10-05 12:00:00.000', '2026-10-12 12:00:00.000', $admin->id),
        'c' => insertListedInvitation('c@x.com', 'admin', '2026-09-25 12:00:00.000', '2026-09-27 12:00:00.000', $admin->id),
        'd' => insertListedInvitation('d@x.com', 'student', '2026-09-26 12:00:00.000', '2026-10-03 12:00:00.000', null),
    ];
}

function listedInvitationEmails(object $response): array
{
    return array_column($response->json('data'), 'email');
}

it('lists pending admin invitations first and then the rest by creation date, newest first', function () {
    insertFourListedInvitations($this->admin);

    $this->browser->get('/api/admin/invitations')->assertOk()
        ->assertJsonPath('meta', ['page' => 1, 'perPage' => 25, 'total' => 4, 'lastPage' => 1]);

    expect(listedInvitationEmails($this->browser->get('/api/admin/invitations')))->toBe(['a@x.com', 'b@x.com', 'd@x.com', 'c@x.com']);
});

it('breaks a tie of creation dates by id, newest first', function () {
    $first = insertListedInvitation('first@x.com', 'student', '2026-10-05 12:00:00.000', '2026-10-12 12:00:00.000', null);
    $second = insertListedInvitation('second@x.com', 'student', '2026-10-05 12:00:00.000', '2026-10-12 12:00:00.000', null);

    expect($second)->toBeGreaterThan($first)
        ->and(listedInvitationEmails($this->browser->get('/api/admin/invitations')))->toBe(['second@x.com', 'first@x.com']);
});

it('filters by state and by role', function (string $query, array $expected) {
    insertFourListedInvitations($this->admin);

    expect(listedInvitationEmails($this->browser->get("/api/admin/invitations?{$query}")))->toBe($expected);
})->with([
    'pending' => ['state=pending', ['a@x.com', 'b@x.com']],
    'expired' => ['state=expired', ['d@x.com', 'c@x.com']],
    'admin' => ['role=admin', ['a@x.com', 'c@x.com']],
    'student' => ['role=student', ['b@x.com', 'd@x.com']],
    'expired admin' => ['state=expired&role=admin', ['c@x.com']],
]);

it('publishes the shape of an invitation and never the token or its hash', function () {
    $token = InvitationToken::generate();
    insertListedInvitation('beto@x.com', 'student', '2026-10-05 12:00:00.000', '2026-10-12 12:00:00.000', $this->admin->id, $token);

    $response = $this->browser->get('/api/admin/invitations')->assertOk();

    $entry = $response->json('data.0');
    expect($entry)->toBe([
        'id' => $entry['id'],
        'email' => 'beto@x.com',
        'role' => 'student',
        'delivery' => 'link',
        'expiresAt' => '2026-10-12T12:00:00.000Z',
        'expired' => false,
        'sentAt' => null,
        'sendFailedAt' => null,
        'invitedBy' => ['id' => $this->admin->id, 'name' => 'Ana'],
        'createdAt' => '2026-10-05T12:00:00.000Z',
    ])->and($response->getContent())->not->toContain($token)->not->toContain(InvitationToken::hash($token));
});

it('publishes expired true for an expired invitation and a null inviter for one from the console', function () {
    insertListedInvitation('d@x.com', 'student', '2026-09-26 12:00:00.000', '2026-10-03 12:00:00.000', null);

    $entry = $this->browser->get('/api/admin/invitations')->json('data.0');

    expect($entry['expired'])->toBeTrue()->and($entry['invitedBy'])->toBeNull();
});

it('publishes a null inviter when the admin that invited no longer exists', function () {
    $gone = User::factory()->admin()->create();
    insertListedInvitation('beto@x.com', 'student', '2026-10-05 12:00:00.000', '2026-10-12 12:00:00.000', $gone->id);
    DB::table('users')->where('id', $gone->id)->delete();

    expect($this->browser->get('/api/admin/invitations')->json('data.0.invitedBy'))->toBeNull();
});

it('pages the list with the meta of the page', function () {
    foreach (range(1, 7) as $n) {
        insertListedInvitation("u{$n}@x.com", 'student', "2026-10-0{$n} 12:00:00.000", '2026-10-20 12:00:00.000', null);
    }

    $first = $this->browser->get('/api/admin/invitations?perPage=3');
    $last = $this->browser->get('/api/admin/invitations?perPage=3&page=3');
    $beyond = $this->browser->get('/api/admin/invitations?perPage=3&page=4');

    expect($first->json('meta'))->toBe(['page' => 1, 'perPage' => 3, 'total' => 7, 'lastPage' => 3])
        ->and(listedInvitationEmails($first))->toBe(['u7@x.com', 'u6@x.com', 'u5@x.com'])
        ->and(listedInvitationEmails($last))->toBe(['u1@x.com'])
        ->and($beyond->json('data'))->toBe([])
        ->and($beyond->json('meta.lastPage'))->toBe(3);
});

it('answers 422 to a parameter that does not comply', function (string $query, string $field) {
    $this->browser->get("/api/admin/invitations?{$query}")
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonStructure(['errors' => [$field]]);
})->with([
    'a state that does not exist' => ['state=sent', 'state'],
    'a role that does not exist' => ['role=teacher', 'role'],
    'zero per page' => ['perPage=0', 'perPage'],
    'a hundred and one per page' => ['perPage=101', 'perPage'],
    'page zero' => ['page=0', 'page'],
]);
