<?php

use App\Models\User;
use Tests\Support\Browser;

const OVERSIZED_ID = '99999999999999999999';

it('answers 404 not_found to an id of 20 digits', function (string $method, string $path) {
    $admin = User::factory()->admin()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($admin);
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

    $browser->send($method, str_replace('{id}', OVERSIZED_ID, $path))->assertStatus(404)->assertJsonPath('code', 'not_found');
})->with([
    'GET user' => ['GET', '/api/admin/users/{id}'],
    'PATCH user' => ['PATCH', '/api/admin/users/{id}'],
    'POST password-reset' => ['POST', '/api/admin/users/{id}/password-reset'],
    'DELETE user' => ['DELETE', '/api/admin/users/{id}'],
    'POST invitation resend' => ['POST', '/api/admin/invitations/{id}/resend'],
    'DELETE invitation' => ['DELETE', '/api/admin/invitations/{id}'],
]);
