<?php

use App\Auth\Events\AccountRestricted;
use App\Jobs\PurgeUserData;
use App\Models\User;
use App\Runs\Execution\ActiveRuns;
use App\Runs\Record\RunRow;
use App\Runs\RunStatus;
use App\Accounts\UserPurge;
use App\Progress\AccountLock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

function wiringRunStatus(string $runId): ?RunStatus
{
    $row = DB::selectOne('select * from runs where id = ?', [$runId]);

    return $row === null ? null : RunRow::fromRow((array) $row)->status;
}

function wiringConfirmed(Browser $browser): Browser
{
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

    return $browser;
}

beforeEach(function () {
    Queue::fake();
    $this->admin = User::factory()->admin()->create();
});

it('has the listener of B2 wired to the event', function () {
    expect(app('events')->hasListeners(AccountRestricted::class))->toBeTrue();
});

it('cancels the queued run of an account that an admin disables over HTTP', function () {
    $student = RunWorld::user();
    $run = RunWorld::run($student);
    $browser = wiringConfirmed(Browser::for($this)->useDatabaseDrivers()->signIn($this->admin));

    $browser->send('PATCH', "/api/admin/users/{$student->id}", ['status' => 'disabled'])->assertOk();

    expect(wiringRunStatus($run->id))->toBe(RunStatus::Canceled);
});

it('leaves the queued run as it was when an admin that stays active is demoted over HTTP', function () {
    $demoted = User::factory()->admin()->create();
    $run = RunWorld::run($demoted);
    $browser = wiringConfirmed(Browser::for($this)->useDatabaseDrivers()->signIn($this->admin));

    $browser->send('PATCH', "/api/admin/users/{$demoted->id}", ['role' => 'student'])->assertOk();

    expect(wiringRunStatus($run->id))->toBe(RunStatus::Queued);
});

it('cancels the queued run when an account deletes itself and the purge then deletes it', function () {
    $student = RunWorld::user();
    $run = RunWorld::run($student);
    $browser = wiringConfirmed(Browser::for($this)->useDatabaseDrivers()->signIn($student));

    $browser->send('DELETE', '/api/me')->assertStatus(202);

    expect(wiringRunStatus($run->id))->toBe(RunStatus::Canceled);

    (new PurgeUserData($student->id))->handle(app(UserPurge::class), app(ActiveRuns::class), app(AccountLock::class));

    expect(wiringRunStatus($run->id))->toBeNull()
        ->and(DB::table('users')->where('id', $student->id)->exists())->toBeFalse();
});
