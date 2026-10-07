<?php

use App\Auth\AccountStatus;
use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\Support\Browser;

const DELETE_USER_MESSAGE = 'Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';

function deleteUserConfirmed(Browser $browser): Browser
{
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

    return $browser;
}

function deleteUserAs(Browser $browser, int $id)
{
    return $browser->send('DELETE', "/api/admin/users/$id");
}

beforeEach(function () {
    Queue::fake();
    $this->admin = User::factory()->admin()->create();
    $this->otherAdmin = User::factory()->admin()->create();
    $this->student = User::factory()->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
});

it('answers 423 without the reconfirmed password', function () {
    deleteUserAs($this->browser, $this->student->id)->assertStatus(423);

    expect($this->student->fresh()->status)->toBe(AccountStatus::Active);
});

it('answers 403 to a student', function () {
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->student);

    deleteUserAs(deleteUserConfirmed($browser), $this->otherAdmin->id)->assertStatus(403);

    expect($this->otherAdmin->fresh()->status)->toBe(AccountStatus::Active);
});

it('answers 202 with the id, the status and the message of the administration, and queues the purge', function () {
    $response = deleteUserAs(deleteUserConfirmed($this->browser), $this->student->id)->assertStatus(202);

    expect($response->json())->toBe(['data' => ['id' => $this->student->id, 'status' => 'deleting'], 'message' => DELETE_USER_MESSAGE])
        ->and($this->student->fresh()->status)->toBe(AccountStatus::Deleting);
    Queue::assertPushed(PurgeUserData::class, fn (PurgeUserData $job) => $job->userId === $this->student->id);
});

it('answers 404 for an id that does not exist', function () {
    deleteUserAs(deleteUserConfirmed($this->browser), 999999)->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('answers 409 last_admin for the only active admin', function () {
    $this->otherAdmin->forceFill(['status' => AccountStatus::Disabled])->save();

    deleteUserAs(deleteUserConfirmed($this->browser), $this->admin->id)->assertStatus(409)->assertJsonPath('code', 'last_admin');

    expect($this->admin->fresh()->status)->toBe(AccountStatus::Active);
    Queue::assertNothingPushed();
});

it('deletes an admin who has another active admin and drops the invitations they created', function () {
    DB::table('invitations')->insert([
        'email' => 'invitada@example.test', 'role' => 'student', 'delivery' => 'link', 'token_hash' => hash('sha256', 'x'),
        'invited_by' => $this->otherAdmin->id, 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now(),
    ]);

    deleteUserAs(deleteUserConfirmed($this->browser), $this->otherAdmin->id)->assertStatus(202);

    expect(DB::table('invitations')->where('invited_by', $this->otherAdmin->id)->count())->toBe(0)
        ->and($this->otherAdmin->fresh()->status)->toBe(AccountStatus::Deleting);
});

it('answers 202 for an account already deleting without touching it and asks for the purge again', function () {
    $this->student->forceFill(['status' => AccountStatus::Deleting])->save();
    DB::table('users')->where('id', $this->student->id)->update(['updated_at' => '2026-10-01 10:00:00.000']);

    deleteUserAs(deleteUserConfirmed($this->browser), $this->student->id)->assertStatus(202);

    expect(DB::table('users')->where('id', $this->student->id)->value('updated_at'))->toBe('2026-10-01 10:00:00.000');
    Queue::assertPushed(PurgeUserData::class, 1);
});

it('keeps the shape of the administration answer for the admin own account and ends the session', function () {
    $response = deleteUserAs(deleteUserConfirmed($this->browser), $this->admin->id)->assertStatus(202);

    expect($response->json())->toBe(['data' => ['id' => $this->admin->id, 'status' => 'deleting'], 'message' => DELETE_USER_MESSAGE])
        ->and($this->admin->fresh()->status)->toBe(AccountStatus::Deleting);
    $this->browser->send('PATCH', '/api/me', ['name' => 'Otro'])->assertStatus(401);
});
