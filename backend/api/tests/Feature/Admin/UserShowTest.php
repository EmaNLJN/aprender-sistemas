<?php

use App\Models\User;
use Tests\Support\Browser;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
});

it('shows exactly the nine AdminUser keys in order', function () {
    $ana = User::factory()->create(['name' => 'Ana Pérez', 'email' => 'ana@x.com', 'privacy_version' => '2026-10-dev', 'privacy_accepted_at' => now()]);

    $response = $this->browser->get("/api/admin/users/{$ana->id}")->assertOk();

    expect(array_keys($response->json('data')))->toBe(['id', 'name', 'email', 'role', 'status', 'emailVerified', 'privacyVersion', 'createdAt', 'updatedAt'])
        ->and($response->json('data.id'))->toBe($ana->id)
        ->and($response->json('data.role'))->toBe('student')
        ->and($response->json('data.status'))->toBe('active')
        ->and($response->json('data.emailVerified'))->toBeTrue()
        ->and($response->json('data.privacyVersion'))->toBe('2026-10-dev');
});

it('shows a null privacy version when none was accepted', function () {
    $ana = User::factory()->create();

    $this->browser->get("/api/admin/users/{$ana->id}")->assertOk()->assertJsonPath('data.privacyVersion', null);
});

it('shows emailVerified false for an unverified account', function () {
    $gala = User::factory()->unverified()->create();

    $this->browser->get("/api/admin/users/{$gala->id}")->assertOk()->assertJsonPath('data.emailVerified', false);
});

it('never shows the hash or the remember token', function () {
    $ana = User::factory()->create();

    $body = $this->browser->get("/api/admin/users/{$ana->id}")->assertOk()->getContent();

    expect($body)->not->toContain('password')->not->toContain('rememberToken')->not->toContain('remember_token');
});

it('answers 404 not_found for an id that does not exist', function () {
    $this->browser->get('/api/admin/users/999999')->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('answers 404 not_found when the id is not an integer', function () {
    $this->browser->get('/api/admin/users/abc')->assertStatus(404)->assertJsonPath('code', 'not_found');
});
