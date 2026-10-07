<?php

use App\Auth\AccountStatus;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\Support\Browser;

beforeEach(function () {
    Route::middleware(['api', 'admin'])->get('api/_probe/admin', fn () => response()->json(['id' => Auth::id()]));
    Route::middleware(['api', 'admin'])->post('api/_probe/admin', fn () => response()->json(['id' => Auth::id()]));
    app('router')->getRoutes()->refreshNameLookups();
    $this->browserOf = fn (User $user) => Browser::for($this)->useDatabaseDrivers()->signIn($user);
});

it('answers 401 without a session', function () {
    Browser::for($this)->useDatabaseDrivers()->get('/api/_probe/admin')
        ->assertStatus(401)
        ->assertJsonPath('code', 'unauthenticated');
});

it('answers 403 forbidden to a verified student', function () {
    ($this->browserOf)(User::factory()->create())->get('/api/_probe/admin')
        ->assertStatus(403)
        ->assertJsonPath('code', 'forbidden');
});

it('answers email_unverified before forbidden to a student with an unverified email', function () {
    ($this->browserOf)(User::factory()->unverified()->create())->get('/api/_probe/admin')
        ->assertStatus(403)
        ->assertJsonPath('code', 'email_unverified');
});

it('lets an admin through', function () {
    $admin = User::factory()->admin()->create();

    ($this->browserOf)($admin)->get('/api/_probe/admin')
        ->assertOk()
        ->assertJsonPath('id', $admin->id);
});

it('answers 409 account_mismatch to an admin that modifies without the account header', function () {
    ($this->browserOf)(User::factory()->admin()->create())->withoutAccountHeader()->post('/api/_probe/admin')
        ->assertStatus(409)
        ->assertJsonPath('code', 'account_mismatch');
});

it('answers 403 account_disabled to a disabled account whose session is still alive', function () {
    $admin = User::factory()->admin()->create();
    $browser = ($this->browserOf)($admin);
    $admin->forceFill(['status' => AccountStatus::Disabled])->save();

    $browser->get('/api/_probe/admin')
        ->assertStatus(403)
        ->assertJsonPath('code', 'account_disabled');
});

it('answers 429 with Retry-After to the 121st request of a minute from the same admin', function () {
    $browser = ($this->browserOf)(User::factory()->admin()->create());
    foreach (range(1, 120) as $ignored) {
        $browser->get('/api/_probe/admin')->assertOk();
    }

    $browser->get('/api/_probe/admin')
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJsonPath('code', 'too_many_requests');
});
