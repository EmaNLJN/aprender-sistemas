<?php

use App\Admin\AdminInvitations;
use App\Auth\EmailFingerprint;
use App\Auth\Role;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use Tests\Support\Browser;

const ADMIN_PASSWORD = 'correct horse battery';

beforeEach(function () {
    useSampleBlockedPasswords();
    Carbon::setTestNow('2026-10-05 12:00:00');
    $this->admin = User::factory()->admin()->withPassword(ADMIN_PASSWORD)->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
    $this->confirm = fn () => $this->browser->post('/api/auth/confirm-password', ['password' => ADMIN_PASSWORD])->assertCreated();
});

afterEach(fn () => Carbon::setTestNow());

function countAdminInvitations(): int
{
    return DB::table('invitations')->count();
}

function invitationTokenOf(string $url): string
{
    preg_match('/\/#invitacion=([A-Za-z0-9_-]{43})\z/', $url, $matches);

    return $matches[1];
}

it('rejects an invalid batch with 422 and the failing field', function (array $emails, string $errorKey) {
    $this->browser->post('/api/admin/invitations', ['emails' => $emails, 'role' => 'student', 'delivery' => 'link'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonStructure(['errors' => [$errorKey]]);

    expect(countAdminInvitations())->toBe(0);
})->with([
    'an empty batch' => [[], 'emails'],
    'one more than a hundred' => [array_map(fn (int $n) => "u{$n}@x.com", range(1, 101)), 'emails'],
    'an email without the shape of one' => [['no-es-un-email'], 'emails.0'],
    'an email repeated once canonicalized' => [['a@x.com', 'A@X.com'], 'emails.1'],
    'an email longer than 254 characters' => [[str_repeat('a', 250).'@x.com'], 'emails.0'],
]);

it('rejects a missing or unknown role and delivery with 422', function (array $body, string $errorKey) {
    $this->browser->post('/api/admin/invitations', $body + ['emails' => ['a@x.com']])
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => [$errorKey]]);
})->with([
    'no role' => [['delivery' => 'link'], 'role'],
    'a role that does not exist' => [['role' => 'teacher', 'delivery' => 'link'], 'role'],
    'no delivery' => [['role' => 'student'], 'delivery'],
    'a delivery that does not exist' => [['role' => 'student', 'delivery' => 'sms'], 'delivery'],
]);

it('asks for the password confirmation to invite an admin and creates nothing without it', function () {
    $this->browser->post('/api/admin/invitations', ['emails' => ['root@x.com'], 'role' => 'admin', 'delivery' => 'link'])
        ->assertStatus(423)
        ->assertJsonPath('code', 'password_confirmation_required');

    expect(countAdminInvitations())->toBe(0);
});

it('validates the body before it asks for the confirmation', function () {
    $this->browser->post('/api/admin/invitations', ['emails' => [], 'role' => 'admin', 'delivery' => 'link'])
        ->assertStatus(422);
});

it('answers 503 mail_unavailable with Retry-After to an email delivery and creates nothing', function () {
    $this->browser->post('/api/admin/invitations', ['emails' => ['beto@x.com'], 'role' => 'student', 'delivery' => 'email'])
        ->assertStatus(503)
        ->assertHeader('Retry-After', '3600')
        ->assertJsonPath('code', 'mail_unavailable');

    expect(countAdminInvitations())->toBe(0);
});

it('asks for the confirmation before it answers 503 to an admin invitation by email', function () {
    $this->browser->post('/api/admin/invitations', ['emails' => ['root@x.com'], 'role' => 'admin', 'delivery' => 'email'])
        ->assertStatus(423);

    ($this->confirm)();

    $this->browser->post('/api/admin/invitations', ['emails' => ['root@x.com'], 'role' => 'admin', 'delivery' => 'email'])
        ->assertStatus(503);
    expect(countAdminInvitations())->toBe(0);
});

it('creates a batch of three with a link each that the lookup of C3a accepts', function () {
    $response = $this->browser->post('/api/admin/invitations', [
        'emails' => ['  Ana@X.com', 'beto@x.com', 'carla@x.com'],
        'role' => 'student',
        'delivery' => 'link',
    ])->assertOk();

    $entries = $response->json('data');
    expect(array_column($entries, 'email'))->toBe(['ana@x.com', 'beto@x.com', 'carla@x.com'])
        ->and(array_column($entries, 'result'))->toBe(['created', 'created', 'created']);
    foreach ($entries as $entry) {
        expect(array_keys($entry))->toBe(['email', 'result', 'expiresAt', 'url'])
            ->and($entry['expiresAt'])->toBe('2026-10-12T12:00:00.000Z');
        $this->browser->post('/api/auth/invitations/lookup', ['token' => invitationTokenOf($entry['url'])])
            ->assertOk()
            ->assertJsonPath('email', $entry['email']);
    }
});

it('builds the link from APP_URL', function () {
    config(['app.url' => 'https://taller.example/']);

    $url = $this->browser->post('/api/admin/invitations', ['emails' => ['a@x.com'], 'role' => 'student', 'delivery' => 'link'])
        ->json('data.0.url');

    expect($url)->toStartWith('https://taller.example/#invitacion=')->and(strlen($url))->toBe(strlen('https://taller.example/#invitacion=') + 43);
});

it('reports user_exists, invitation_pending, renewed and created in the order of the request', function () {
    ($this->confirm)();
    User::factory()->create(['email' => 'ana@x.com']);
    app(AdminInvitations::class)->invite('vigente@x.com', Role::Student, $this->admin->id);
    app(AdminInvitations::class)->invite('vencida@x.com', Role::Student, $this->admin->id);
    DB::table('invitations')->where('email', 'vencida@x.com')->update([
        'created_at' => '2026-09-01 12:00:00.000',
        'expires_at' => '2026-09-08 12:00:00.000',
    ]);

    $data = $this->browser->post('/api/admin/invitations', [
        'emails' => ['ana@x.com', 'vigente@x.com', 'vencida@x.com', 'nueva@x.com'],
        'role' => 'admin',
        'delivery' => 'link',
    ])->assertOk()->json('data');

    expect(array_column($data, 'result'))->toBe(['user_exists', 'invitation_pending', 'renewed', 'created'])
        ->and($data[0])->toBe(['email' => 'ana@x.com', 'result' => 'user_exists'])
        ->and($data[1])->toBe(['email' => 'vigente@x.com', 'result' => 'invitation_pending'])
        ->and($data[2]['expiresAt'])->toBe('2026-10-07T12:00:00.000Z')
        ->and(invitationTokenOf($data[2]['url']))->toHaveLength(43)
        ->and(DB::table('invitations')->where('email', 'vencida@x.com')->value('role'))->toBe('admin');
});

it('logs one admin.invitation line per email with its HMAC and without the email', function () {
    config(['logging.default' => 'stderr', 'taller.log_hmac_key' => 'secret']);
    $handler = new TestHandler;
    Log::channel('stderr')->getLogger()->setHandlers([$handler]);
    User::factory()->create(['email' => 'ana@x.com']);

    $this->browser->post('/api/admin/invitations', ['emails' => ['ana@x.com', 'beto@x.com'], 'role' => 'student', 'delivery' => 'link'])->assertOk();

    $lines = collect($handler->getRecords())->filter(fn (LogRecord $record) => $record->message === 'admin.invitation')->values();
    expect($lines)->toHaveCount(2)
        ->and($lines[0]->context)->toBe(['result' => 'user_exists', 'role' => 'student', 'delivery' => 'link', 'email_hmac' => substr(hash_hmac('sha256', 'ana@x.com', 'secret'), 0, 16)])
        ->and($lines[1]->context['result'])->toBe('created')
        ->and($lines[1]->context['email_hmac'])->toBe(EmailFingerprint::of('beto@x.com'));
    foreach ($handler->getRecords() as $record) {
        expect(json_encode($record->context))->not->toContain('@x.com');
    }
});

function inviteAsAdmin(string $email, Role $role, int $adminId): array
{
    $result = app(AdminInvitations::class)->invite($email, $role, $adminId);

    return [Invitation::where('email', $email)->firstOrFail(), $result->issued->token];
}

it('asks for the confirmation to resend the invitation of an admin and not that of a student', function () {
    [$admin] = inviteAsAdmin('root@x.com', Role::Admin, $this->admin->id);
    [$student] = inviteAsAdmin('beto@x.com', Role::Student, $this->admin->id);

    $this->browser->post("/api/admin/invitations/{$admin->id}/resend")
        ->assertStatus(423)
        ->assertJsonPath('code', 'password_confirmation_required');
    $this->browser->post("/api/admin/invitations/{$student->id}/resend")->assertOk();
});

it('answers 404 to an invitation that does not exist or an id that is not a number', function (string $id) {
    ($this->confirm)();

    $this->browser->post("/api/admin/invitations/{$id}/resend")->assertStatus(404)->assertJsonPath('code', 'not_found');
    $this->browser->send('DELETE', "/api/admin/invitations/{$id}")->assertStatus(404)->assertJsonPath('code', 'not_found');
})->with(['an unknown id' => '9999', 'text' => 'abc']);

it('rotates the token on resend and publishes the new link once', function () {
    [$invitation, $oldToken] = inviteAsAdmin('beto@x.com', Role::Student, $this->admin->id);
    DB::table('invitations')->where('id', $invitation->id)->update(['expires_at' => '2026-10-06 12:00:00.000']);

    $response = $this->browser->post("/api/admin/invitations/{$invitation->id}/resend")->assertOk();

    $data = $response->json('data');
    expect(array_keys($data))->toBe(['id', 'email', 'role', 'delivery', 'expiresAt', 'url'])
        ->and($data['id'])->toBe($invitation->id)
        ->and($data['email'])->toBe('beto@x.com')
        ->and($data['role'])->toBe('student')
        ->and($data['delivery'])->toBe('link')
        ->and($data['expiresAt'])->toBe('2026-10-12T12:00:00.000Z')
        ->and(invitationTokenOf($data['url']))->not->toBe($oldToken);
    $this->browser->post('/api/auth/invitations/lookup', ['token' => $oldToken])
        ->assertStatus(404)->assertJsonPath('code', 'invitation_not_found');
    $this->browser->post('/api/auth/invitations/lookup', ['token' => invitationTokenOf($data['url'])])->assertOk();
});

it('answers 503 to a resend by email, with the delivery of the body or with that of the invitation', function () {
    [$invitation] = inviteAsAdmin('beto@x.com', Role::Student, $this->admin->id);

    $this->browser->post("/api/admin/invitations/{$invitation->id}/resend", ['delivery' => 'email'])
        ->assertStatus(503)->assertHeader('Retry-After', '3600');
    DB::table('invitations')->where('id', $invitation->id)->update(['delivery' => 'email']);
    $this->browser->post("/api/admin/invitations/{$invitation->id}/resend")->assertStatus(503);
    $this->browser->post("/api/admin/invitations/{$invitation->id}/resend", ['delivery' => 'link'])->assertOk()
        ->assertJsonPath('data.delivery', 'link');
});

it('asks for the confirmation before the 503 of an admin resend by email', function () {
    [$invitation] = inviteAsAdmin('root@x.com', Role::Admin, $this->admin->id);

    $this->browser->post("/api/admin/invitations/{$invitation->id}/resend", ['delivery' => 'email'])->assertStatus(423);
});

it('rejects a resend with an unknown delivery', function () {
    [$invitation] = inviteAsAdmin('beto@x.com', Role::Student, $this->admin->id);

    $this->browser->post("/api/admin/invitations/{$invitation->id}/resend", ['delivery' => 'sms'])
        ->assertStatus(422)->assertJsonStructure(['errors' => ['delivery']]);
});

it('revokes an invitation with 204 and its link stops working', function () {
    [$invitation, $token] = inviteAsAdmin('beto@x.com', Role::Student, $this->admin->id);

    $response = $this->browser->send('DELETE', "/api/admin/invitations/{$invitation->id}");

    expect($response->getContent())->toBe('');
    $response->assertNoContent();
    expect(countAdminInvitations())->toBe(0);
    $this->browser->post('/api/auth/invitations/lookup', ['token' => $token])->assertStatus(404);
});

it('revokes the invitation of an admin without the confirmation', function () {
    [$invitation] = inviteAsAdmin('root@x.com', Role::Admin, $this->admin->id);

    $this->browser->send('DELETE', "/api/admin/invitations/{$invitation->id}")->assertNoContent();

    expect(countAdminInvitations())->toBe(0);
});

it('logs the resend and the revocation with the id and without the email or the token', function () {
    config(['logging.default' => 'stderr']);
    $handler = new TestHandler;
    Log::channel('stderr')->getLogger()->setHandlers([$handler]);
    [$invitation] = inviteAsAdmin('beto@x.com', Role::Student, $this->admin->id);

    $this->browser->post("/api/admin/invitations/{$invitation->id}/resend")->assertOk();
    $this->browser->send('DELETE', "/api/admin/invitations/{$invitation->id}")->assertNoContent();

    $contexts = collect($handler->getRecords())->mapWithKeys(fn (LogRecord $record) => [$record->message => $record->context]);
    expect($contexts['admin.invitation_resent'])->toBe(['invitation_id' => $invitation->id, 'role' => 'student'])
        ->and($contexts['admin.invitation_revoked'])->toBe(['invitation_id' => $invitation->id]);
});
