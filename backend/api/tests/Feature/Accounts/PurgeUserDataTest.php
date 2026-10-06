<?php

use App\Accounts\Ownership;
use App\Accounts\UserData;
use App\Accounts\UserPurge;
use App\Admin\AccountChanges;
use App\Jobs\PurgeUserData;
use App\Models\User;
use App\Progress\AccountLock;
use App\Runs\Execution\ActiveRuns;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\PopulatedAccount;
use Tests\Support\RunWorld;
use Tests\Support\UserDataCoverage;

afterEach(fn () => Carbon::setTestNow());

function purgeJobRun(int $userId): void
{
    (new PurgeUserData($userId))->handle(app(UserPurge::class), app(ActiveRuns::class), app(AccountLock::class));
}

function purgeJobDeletingAccount(): User
{
    $user = PopulatedAccount::create();
    DB::table('users')->where('id', $user->id)->update(['created_at' => '2026-10-05 12:00:00.123']);
    app(AccountChanges::class)->beginDeletion($user->id);

    return $user;
}

/** @return array<string, int> */
function purgeJobRowsLeftOf(int $userId): array
{
    $left = [];
    foreach ((new UserData)->tables() as $table) {
        $ownedByUser = in_array($table->ownership, [Ownership::UserId, Ownership::Child], true);
        if ($ownedByUser && UserDataCoverage::exists($table->name)) {
            $left[$table->name] = UserDataCoverage::rowsOf($table, $userId);
        }
    }

    return $left;
}

it('leaves no row of the account, writes one ledger row and keeps another account intact', function () {
    Carbon::setTestNow('2026-10-06 08:30:00.456');
    $user = purgeJobDeletingAccount();
    $bystander = PopulatedAccount::create();
    $bystanderBefore = purgeJobRowsLeftOf($bystander->id);

    purgeJobRun($user->id);

    $ledger = DB::table('account_deletions')->where('user_id', $user->id)->get();
    expect(DB::table('users')->where('id', $user->id)->count())->toBe(0)
        ->and(array_sum(purgeJobRowsLeftOf($user->id)))->toBe(0)
        ->and($ledger)->toHaveCount(1)
        ->and($ledger[0]->user_created_at)->toBe('2026-10-05 12:00:00.123')
        ->and($ledger[0]->deleted_at)->toBe('2026-10-06 08:30:00.456')
        ->and(purgeJobRowsLeftOf($bystander->id))->toBe($bystanderBefore)
        ->and(DB::table('users')->where('id', $bystander->id)->count())->toBe(1);
});

it('does nothing and keeps the same ledger row on a second call', function () {
    $user = purgeJobDeletingAccount();
    purgeJobRun($user->id);
    $first = DB::table('account_deletions')->where('user_id', $user->id)->first();

    purgeJobRun($user->id);

    expect(DB::table('account_deletions')->where('user_id', $user->id)->get()->all())->toEqual([$first]);
});

it('does not touch an account that is not deleting and logs purge.skipped', function () {
    $user = PopulatedAccount::create();
    $before = purgeJobRowsLeftOf($user->id);
    Log::spy();

    purgeJobRun($user->id);

    Log::shouldHaveReceived('warning')->with('purge.skipped', ['user_id' => $user->id, 'status' => 'active'])->once();
    expect(DB::table('users')->where('id', $user->id)->count())->toBe(1)
        ->and(purgeJobRowsLeftOf($user->id))->toBe($before)
        ->and(DB::table('account_deletions')->count())->toBe(0);
});

it('finishes with the same result after being cut in the middle of the batches', function () {
    $user = purgeJobDeletingAccount();
    $cut = true;
    $deletedFromAttempts = false;
    DB::listen(function ($query) use (&$cut, &$deletedFromAttempts) {
        if (! $cut) {
            return;
        }
        if ($deletedFromAttempts) {
            $cut = false;
            throw new RuntimeException('cut after the first delete from attempts');
        }
        $deletedFromAttempts = str_starts_with($query->sql, 'delete from `attempts`');
    });

    expect(fn () => purgeJobRun($user->id))->toThrow(RuntimeException::class);

    expect(DB::table('users')->where('id', $user->id)->value('status'))->toBe('deleting')
        ->and(DB::table('attempts')->where('user_id', $user->id)->count())->toBe(0)
        ->and(DB::table('invitations')->where('invited_by', $user->id)->count())->toBe(0);

    purgeJobRun($user->id);

    expect(DB::table('users')->where('id', $user->id)->count())->toBe(0)
        ->and(array_sum(purgeJobRowsLeftOf($user->id)))->toBe(0)
        ->and(DB::table('account_deletions')->where('user_id', $user->id)->count())->toBe(1);
});

it('cancels the active runs before deleting runs', function () {
    $user = purgeJobDeletingAccount();
    RunWorld::run($user, ['exercise_id' => 'rust-01']);
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        $statements[] = $query->sql;
    });

    purgeJobRun($user->id);

    $firstRunUpdate = null;
    $firstRunDelete = null;
    foreach ($statements as $position => $sql) {
        $firstRunUpdate ??= str_starts_with($sql, 'update `runs`') ? $position : null;
        $firstRunDelete ??= str_starts_with($sql, 'delete from `runs`') ? $position : null;
    }
    expect($firstRunUpdate)->not->toBeNull()
        ->and($firstRunDelete)->not->toBeNull()
        ->and($firstRunUpdate)->toBeLessThan($firstRunDelete);
});

it('logs purge.cancel_failed with the exception class and keeps purging', function () {
    $user = purgeJobDeletingAccount();
    $run = RunWorld::run($user, ['exercise_id' => 'rust-01']);
    DB::statement('SET FOREIGN_KEY_CHECKS=0');
    DB::delete('delete from exercises where id = ?', [$run->exerciseId]);
    DB::statement('SET FOREIGN_KEY_CHECKS=1');
    Log::spy();

    purgeJobRun($user->id);

    Log::shouldHaveReceived('error')->withArgs(fn (string $message, array $context) => $message === 'purge.cancel_failed'
        && $context['user_id'] === $user->id
        && is_string($context['exception']))->once();
    expect(DB::table('users')->where('id', $user->id)->count())->toBe(0)
        ->and(DB::table('account_deletions')->where('user_id', $user->id)->count())->toBe(1);
});

it('locks the progress head before deleting the account and never updates users between batches', function () {
    $user = purgeJobDeletingAccount();
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        $statements[] = $query->sql;
    });

    purgeJobRun($user->id);

    $headLock = array_find_key($statements, fn (string $sql) => str_contains($sql, 'from `progress_heads`') && str_contains($sql, 'for update'));
    $deleteUser = array_find_key($statements, fn (string $sql) => str_starts_with($sql, 'delete from `users`'));
    $updatesOfUsers = array_filter($statements, fn (string $sql) => str_starts_with($sql, 'update `users`'));
    expect($headLock)->not->toBeNull()
        ->and($deleteUser)->not->toBeNull()
        ->and($headLock)->toBeLessThan($deleteUser)
        ->and($updatesOfUsers)->toBe([]);
});

it('finishes without error when the account disappears before the final transaction', function () {
    $user = purgeJobDeletingAccount();
    $removed = false;
    DB::listen(function ($query) use ($user, &$removed) {
        if (! $removed && str_starts_with($query->sql, 'delete from `attempts`')) {
            $removed = true;
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            DB::delete('delete from users where id = ?', [$user->id]);
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    });

    purgeJobRun($user->id);

    expect(DB::table('users')->where('id', $user->id)->count())->toBe(0);
});
