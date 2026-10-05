<?php

use App\Models\User;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::factory()->create());
});

function confirmedSecondsAgo(Browser $browser, int $seconds): void
{
    $browser->post('/api/probe/put-session', ['key' => 'auth.password_confirmed_at', 'value' => now()->getTimestamp() - $seconds])->assertNoContent();
}

it('answers 423 password_confirmation_required when the password was never confirmed', function () {
    $this->browser->get('/api/probe/sensitive')
        ->assertStatus(423)
        ->assertExactJson(['message' => 'Confirmá tu contraseña para continuar.', 'code' => 'password_confirmation_required']);
});

it('lets through a confirmation of 899 seconds ago and refuses one of 901', function () {
    confirmedSecondsAgo($this->browser, 899);
    $this->browser->get('/api/probe/sensitive')->assertOk();

    confirmedSecondsAgo($this->browser, 901);
    $this->browser->get('/api/probe/sensitive')->assertStatus(423);
});

it('isConfirmed is true at 899 seconds and false at 901', function () {
    confirmedSecondsAgo($this->browser, 899);
    $this->browser->get('/api/probe/is-confirmed')->assertExactJson(['confirmed' => true]);

    confirmedSecondsAgo($this->browser, 901);
    $this->browser->get('/api/probe/is-confirmed')->assertExactJson(['confirmed' => false]);
});

it('markConfirmed makes isConfirmed true and opens the sensitive route', function () {
    $this->browser->get('/api/probe/is-confirmed')->assertExactJson(['confirmed' => false]);

    $this->browser->post('/api/probe/mark-confirmed')->assertNoContent();

    $this->browser->get('/api/probe/is-confirmed')->assertExactJson(['confirmed' => true]);
    $this->browser->get('/api/probe/sensitive')->assertOk();
});
