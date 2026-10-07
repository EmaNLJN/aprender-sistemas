<?php

use App\Auth\Events\AccountRestricted;
use App\Auth\Events\AccountRestriction;
use App\Runs\Execution\ActiveRuns;
use App\Runs\Execution\CancelRunsOfRestrictedAccount;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\Record\RunRow;
use App\Runs\RunStatus;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunWorld;

function restrictedStatus(string $runId): RunStatus
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]))->status;
}

it('cancels the active runs of an account that is not active', function (string $accountStatus, AccountRestriction $reason) {
    $user = RunWorld::user(['status' => $accountStatus]);
    $run = RunWorld::run($user);

    app(CancelRunsOfRestrictedAccount::class)->handle(new AccountRestricted($user->id, $reason));

    expect(restrictedStatus($run->id))->toBe(RunStatus::Canceled);
})->with([
    'disabled' => ['disabled', AccountRestriction::Disabled],
    'deleting' => ['deleting', AccountRestriction::Deleting],
]);

it('does nothing for an account that is still active, as when an admin is demoted', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user);

    app(CancelRunsOfRestrictedAccount::class)->handle(new AccountRestricted($user->id, AccountRestriction::Demoted));

    expect(restrictedStatus($run->id))->toBe(RunStatus::Queued);
});

it('does nothing for an account that was already deleted', function () {
    $run = RunWorld::orphanRun(RunWorld::user());

    app(CancelRunsOfRestrictedAccount::class)->handle(new AccountRestricted($run->userId, AccountRestriction::Deleting));

    expect(restrictedStatus($run->id))->toBe(RunStatus::Queued);
});

it('does not throw when the cancellation fails: it logs the class of the exception', function () {
    $user = RunWorld::user(['status' => 'disabled']);
    $run = RunWorld::run($user);
    DB::statement('SET FOREIGN_KEY_CHECKS=0');
    DB::delete('delete from exercises where id = ?', [$run->exerciseId]);
    DB::statement('SET FOREIGN_KEY_CHECKS=1');
    Log::spy();

    app(CancelRunsOfRestrictedAccount::class)->handle(new AccountRestricted($user->id, AccountRestriction::Disabled));

    Log::shouldHaveReceived('error')->with('run.cancel_failed', ['user_id' => $user->id, 'exception' => RunWriteFailed::class])->once();
});

it('waits for the commit that restricted the account before cancelling', function () {
    $user = RunWorld::user(['status' => 'disabled']);
    $run = RunWorld::run($user);

    DB::transaction(function () use ($user, $run) {
        event(new AccountRestricted($user->id, AccountRestriction::Disabled));

        expect(restrictedStatus($run->id))->toBe(RunStatus::Queued);
    });

    expect(restrictedStatus($run->id))->toBe(RunStatus::Canceled)
        ->and(new CancelRunsOfRestrictedAccount(app(ActiveRuns::class)))->toBeInstanceOf(ShouldHandleEventsAfterCommit::class);
});
