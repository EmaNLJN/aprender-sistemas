<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->user = User::factory()->withPassword('first-password')->create();
});

function sessionRowsOf(User $user): int
{
    return DB::table('sessions')->where('user_id', $user->id)->count();
}

it('endAll deletes every session row of the account and rotates the remember token, leaving other accounts alone', function () {
    $other = User::factory()->create();
    $first = Browser::for($this)->useDatabaseDrivers()->signIn($this->user, remember: true);
    Browser::for($this)->signIn($this->user);
    Browser::for($this)->signIn($other);
    $tokenBefore = $this->user->fresh()->remember_token;

    $first->post('/api/probe/end-all', ['id' => $this->user->id]);

    expect(sessionRowsOf($this->user))->toBe(0)
        ->and(sessionRowsOf($other))->toBe(1)
        ->and($this->user->fresh()->remember_token)->not->toBe($tokenBefore);
});

it('endOthers keeps this session, drops the rest and rotates the remember token', function () {
    $current = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
    $another = Browser::for($this)->signIn($this->user);
    $tokenBefore = $this->user->fresh()->remember_token;

    $current->post('/api/probe/end-others', ['password' => 'first-password'])->assertNoContent();

    expect(sessionRowsOf($this->user))->toBe(1)
        ->and($this->user->fresh()->remember_token)->not->toBe($tokenBefore);
    $current->get('/api/probe/public')->assertJson(['id' => $this->user->id]);
    $another->get('/api/probe/public')->assertJson(['id' => null]);
});

it('endOthers hands this device a new remember cookie with the rotated token', function () {
    $current = Browser::for($this)->useDatabaseDrivers()->signIn($this->user, remember: true);
    $before = $current->cookieStartingWith('remember_web_');

    $response = $current->post('/api/probe/end-others', ['password' => 'first-password']);

    $issued = collect($response->headers->getCookies())->first(fn ($cookie) => str_starts_with($cookie->getName(), 'remember_web_'));
    expect($issued)->not->toBeNull()
        ->and($issued->getValue())->not->toBe($before);
    $current->get('/api/probe/public')->assertJson(['id' => $this->user->id]);
});

it('endOthers does not hand out a remember cookie to a device that had none', function () {
    $current = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);

    $response = $current->post('/api/probe/end-others', ['password' => 'first-password']);

    expect(collect($response->headers->getCookies())->contains(fn ($cookie) => str_starts_with($cookie->getName(), 'remember_web_')))->toBeFalse();
});
