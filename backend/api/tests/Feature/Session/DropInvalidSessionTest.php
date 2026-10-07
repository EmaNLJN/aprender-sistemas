<?php

use App\Auth\AccountStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers();
});

afterEach(fn () => $this->travelBack());

function stayActiveFor(Browser $browser, int $minutes): void
{
    for ($elapsed = 25; $elapsed <= $minutes; $elapsed += 25) {
        test()->travel(25)->minutes();
        $browser->get('/api/probe/public');
    }
}

it('lets a guest through', function () {
    $this->browser->get('/api/probe/dropped')->assertOk()->assertJson(['reason' => null]);
});

it('keeps a healthy session', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);

    $this->browser->get('/api/probe/public')->assertJson(['id' => $user->id]);
    $this->browser->get('/api/probe/dropped')->assertJson(['reason' => null]);
});

it('drops the session of an account that became disabled, and the next request is a guest one', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);
    $user->forceFill(['status' => AccountStatus::Disabled])->save();

    $this->browser->get('/api/probe/dropped')->assertJson(['reason' => 'disabled']);
    $this->browser->get('/api/probe/public')->assertJson(['id' => null]);
});

it('drops the session of an account that is being deleted', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);
    $user->forceFill(['status' => AccountStatus::Deleting])->save();

    $this->browser->get('/api/probe/dropped')->assertJson(['reason' => 'deleting']);
    $this->browser->get('/api/probe/public')->assertJson(['id' => null]);
});

it('drops a session whose password hash is not the account one, leaving its row in sessions', function () {
    $user = User::factory()->withPassword('first-password')->create();
    $this->browser->signIn($user);
    $this->browser->get('/api/probe/public')->assertJson(['id' => $user->id]);
    $rowsBefore = DB::table('sessions')->where('user_id', $user->id)->count();

    $user->forceFill(['password' => 'second-password'])->save();
    $this->browser->get('/api/probe/dropped')->assertJson(['reason' => 'password_changed']);

    expect($rowsBefore)->toBe(1);
    $this->browser->get('/api/probe/public')->assertJson(['id' => null]);
});

it('keeps a session active for 7 hours and 55 minutes and drops it past the 8 hour maximum', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user);

    stayActiveFor($this->browser, 475);
    $this->browser->get('/api/probe/public')->assertJson(['id' => $user->id]);

    $this->travel(25)->minutes();
    $this->browser->get('/api/probe/dropped')->assertJson(['reason' => 'expired']);
    $this->browser->get('/api/probe/public')->assertJson(['id' => null]);
});

it('does not apply the 8 hour maximum to a request that carries the remember cookie', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user, remember: true);

    stayActiveFor($this->browser, 540);

    $this->browser->get('/api/probe/dropped')->assertJson(['reason' => null]);
    $this->browser->get('/api/probe/public')->assertJson(['id' => $user->id]);
});

it('signs a remembered student back in after the session expired and marks when that happened', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user, remember: true);

    $this->travel(9)->hours();

    $this->browser->get('/api/probe/public')->assertJson(['id' => $user->id]);
    $this->browser->get('/api/probe/authenticated-at')->assertJson(['at' => now()->getTimestamp()]);
});

it('does not bring back a remembered account that became disabled', function () {
    $user = User::factory()->create();
    $this->browser->signIn($user, remember: true);
    $user->forceFill(['status' => AccountStatus::Disabled])->save();
    $this->travel(31)->minutes();

    $this->browser->get('/api/probe/dropped')->assertJson(['reason' => 'disabled']);
    $this->browser->get('/api/probe/public')->assertJson(['id' => null]);
});
