<?php

use App\Auth\AccountStatus;
use App\Auth\Events\AccountRestricted;
use App\Auth\Events\AccountRestriction;
use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Tests\Support\Browser;

const DELETE_ME_MESSAGE = 'Se está borrando tu cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';

function deleteMeConfirmed(Browser $browser): Browser
{
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

    return $browser;
}

beforeEach(function () {
    Queue::fake();
    Event::fake([AccountRestricted::class]);
    $this->student = User::factory()->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->student);
});

it('answers 423 without the reconfirmed password and changes nothing', function () {
    $this->browser->send('DELETE', '/api/me')->assertStatus(423)->assertJsonPath('code', 'password_confirmation_required');

    expect($this->student->fresh()->status)->toBe(AccountStatus::Active);
    Queue::assertNothingPushed();
});

it('answers 202 with exactly the contract body and starts the deletion', function () {
    Log::spy();

    $response = deleteMeConfirmed($this->browser)->send('DELETE', '/api/me')->assertStatus(202);

    expect($response->json())->toBe(['data' => ['status' => 'deleting'], 'message' => DELETE_ME_MESSAGE])
        ->and($this->student->fresh()->status)->toBe(AccountStatus::Deleting)
        ->and(DB::table('sessions')->where('user_id', $this->student->id)->count())->toBe(0);
    Queue::assertPushed(PurgeUserData::class, fn (PurgeUserData $job) => $job->userId === $this->student->id);
    Event::assertDispatched(AccountRestricted::class, fn (AccountRestricted $event) => $event->userId === $this->student->id && $event->reason === AccountRestriction::Deleting);
    Log::shouldHaveReceived('info')->with('account.deletion_requested', ['target_id' => $this->student->id])->once();
});

it('ends the session of the request: the next one is 401 and a login is refused', function () {
    deleteMeConfirmed($this->browser)->send('DELETE', '/api/me')->assertStatus(202);

    $this->browser->send('PATCH', '/api/me', ['name' => 'Otro'])->assertStatus(401)->assertJsonPath('code', 'unauthenticated');
    Browser::for($this)->useDatabaseDrivers()
        ->post('/api/auth/login', ['email' => $this->student->email, 'password' => 'password'])
        ->assertStatus(422)->assertJsonPath('code', 'auth_failed');
});

it('answers 409 last_admin for the only active admin and changes nothing', function () {
    $admin = User::factory()->admin()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($admin);

    deleteMeConfirmed($browser)->send('DELETE', '/api/me')->assertStatus(409)->assertJsonPath('code', 'last_admin');

    expect($admin->fresh()->status)->toBe(AccountStatus::Active);
    Queue::assertNothingPushed();
    Event::assertNotDispatched(AccountRestricted::class);
});

it('answers 202 for an admin when another active admin remains', function () {
    User::factory()->admin()->create();
    $admin = User::factory()->admin()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($admin);

    deleteMeConfirmed($browser)->send('DELETE', '/api/me')->assertStatus(202);

    expect($admin->fresh()->status)->toBe(AccountStatus::Deleting);
});

it('lets an account with an unverified email delete itself', function () {
    $unverified = User::factory()->unverified()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($unverified);

    deleteMeConfirmed($browser)->send('DELETE', '/api/me')->assertStatus(202);

    expect($unverified->fresh()->status)->toBe(AccountStatus::Deleting);
});
