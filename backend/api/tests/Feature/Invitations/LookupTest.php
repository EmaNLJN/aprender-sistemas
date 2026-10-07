<?php

use App\Auth\Invitations;
use App\Auth\PlainPassword;
use App\Auth\Role;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    Carbon::setTestNow('2026-10-05 12:00:00');
    $this->invitations = app(Invitations::class);
    $this->browser = Browser::for($this)->useDatabaseDrivers();
});

afterEach(fn () => Carbon::setTestNow());

it('publishes only the email, the role and the expiry of a current invitation', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    $this->browser->post('/api/auth/invitations/lookup', ['token' => $issued->token])
        ->assertOk()
        ->assertExactJson(['email' => 'ana@x.com', 'role' => 'student', 'expiresAt' => '2026-10-12T12:00:00.000Z']);
});

it('publishes the role of an admin invitation', function () {
    $issued = $this->invitations->issue('root@x.com', Role::Admin, null);

    $this->browser->post('/api/auth/invitations/lookup', ['token' => $issued->token])
        ->assertOk()
        ->assertExactJson(['email' => 'root@x.com', 'role' => 'admin', 'expiresAt' => '2026-10-07T12:00:00.000Z']);
});

it('answers 410 invitation_expired once the invitation has expired', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);
    Carbon::setTestNow('2026-10-12 12:00:01');

    $this->browser->post('/api/auth/invitations/lookup', ['token' => $issued->token])
        ->assertStatus(410)
        ->assertJson(['code' => 'invitation_expired', 'message' => 'La invitación venció. Pedí una nueva a quien te invitó.']);
});

it('answers the same 404 for a used, a revoked, an invented and a malformed token', function () {
    $used = $this->invitations->issue('used@x.com', Role::Student, null);
    $this->invitations->accept($used->token, 'Ana Pérez', PlainPassword::of('x7Kp2mQ9vL4tZ8w'), config()->string('taller.privacy_version'));
    $revoked = $this->invitations->issue('revoked@x.com', Role::Student, null);
    DB::table('invitations')->where('email', 'revoked@x.com')->delete();

    $bodies = collect([$used->token, $revoked->token, str_repeat('a', 43), 'not a token'])->map(function (string $token) {
        $response = $this->browser->post('/api/auth/invitations/lookup', ['token' => $token]);
        $response->assertStatus(404);

        return $response->getContent();
    });

    expect($bodies->unique()->all())->toBe([json_encode([
        'message' => 'La invitación no existe o ya se usó.',
        'code' => 'invitation_not_found',
    ])]);
});

it('answers a malformed token without querying invitations', function () {
    $queries = [];
    DB::listen(function ($query) use (&$queries) {
        $queries[] = $query->sql;
    });

    $this->browser->post('/api/auth/invitations/lookup', ['token' => 'short'])->assertStatus(404);

    expect(collect($queries)->filter(fn ($sql) => str_contains($sql, 'invitations')))->toBeEmpty();
});

it('answers 422 validation_failed without a token', function () {
    $this->browser->post('/api/auth/invitations/lookup', [])
        ->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors('token');
});

it('is public: it does not ask for a session or for X-Taller-User', function () {
    ProbeRoutes::register();
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    $this->browser->get('/api/probe/account')->assertStatus(401);
    $this->browser->post('/api/auth/invitations/lookup', ['token' => $issued->token])->assertOk();
});

it('asks for the CSRF token', function () {
    $issued = $this->invitations->issue('ana@x.com', Role::Student, null);

    $this->browser->enforceCsrf()->post('/api/auth/invitations/lookup', ['token' => $issued->token])
        ->assertStatus(419)
        ->assertJson(['code' => 'csrf_token_mismatch']);
});
