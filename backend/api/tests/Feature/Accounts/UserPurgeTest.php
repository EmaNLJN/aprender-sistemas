<?php

use App\Accounts\Ownership;
use App\Accounts\UserData;
use App\Accounts\UserPurge;
use App\Accounts\UserTable;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\PopulatedAccount;
use Tests\Support\RunWorld;
use Tests\Support\UserDataCoverage;

/** @return array{runs: int, exercise_progress: int, attempts: int} */
function rowsInBatchTables(int $userId): array
{
    return [
        'runs' => DB::table('runs')->where('user_id', $userId)->count(),
        'exercise_progress' => DB::table('exercise_progress')->where('user_id', $userId)->count(),
        'attempts' => DB::table('attempts')->where('user_id', $userId)->count(),
    ];
}

function growAccount(int $userId, int $runs, int $progress, int $attempts): void
{
    $at = '2026-10-05 12:00:00.000';
    $user = User::findOrFail($userId);
    if (! DB::table('exercises')->where('id', 'rust-01')->exists()) {
        RunWorld::exercise();
    }
    for ($n = 0; $n < $runs; $n++) {
        RunWorld::run($user);
    }
    for ($n = 0; $n < $progress; $n++) {
        RunWorld::exercise("extra-progress-{$n}");
        DB::table('exercise_progress')->insert(['user_id' => $userId, 'exercise_id' => "extra-progress-{$n}", 'created_at' => $at, 'updated_at' => $at]);
    }
    for ($n = 0; $n < $attempts; $n++) {
        $attemptId = DB::table('attempts')->insertGetId([
            'user_id' => $userId, 'exercise_id' => 'rust-01', 'epoch' => 1, 'outcome' => 'passed', 'grading_hash' => str_repeat('a', 64),
            'code_sha256' => str_repeat('b', 64), 'attempted_at' => $at, 'finished_at' => $at, 'created_at' => $at,
        ]);
        DB::table('attempt_tests')->insert(['attempt_id' => $attemptId, 'test_key' => 't1', 'exercise_id' => 'rust-01', 'position' => 1, 'outcome' => 'pass']);
        DB::table('attempt_payloads')->insert(['attempt_id' => $attemptId, 'code' => 'fn main() {}', 'stdout' => '', 'stderr' => '', 'created_at' => $at]);
    }
}

beforeEach(function () {
    config(['taller.purge.batch_size' => 2]);
});

it('deletes the rows of one account in batches of two and leaves the other account alone', function () {
    $bystander = PopulatedAccount::create();
    $victim = RunWorld::user();
    growAccount($victim->id, 5, 3, 5);
    $bystanderBefore = rowsInBatchTables($bystander->id);

    $deleted = (new UserPurge(new UserData))->inBatches($victim->id);

    expect($deleted)->toBe(13)
        ->and(rowsInBatchTables($victim->id))->toBe(['runs' => 0, 'exercise_progress' => 0, 'attempts' => 0])
        ->and(rowsInBatchTables($bystander->id))->toBe($bystanderBefore);
});

it('issues the statements per table in order, each with ORDER BY and LIMIT 2', function () {
    $user = RunWorld::user();
    growAccount($user->id, 4, 2, 2);
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        if (str_starts_with($query->sql, 'delete from')) {
            $statements[] = $query->sql;
        }
    });

    (new UserPurge(new UserData))->inBatches($user->id);

    $tables = array_map(fn (string $sql) => explode('`', $sql)[1], $statements);
    expect(array_values(array_unique($tables)))->toBe(['runs', 'exercise_progress', 'attempts'])
        ->and($statements[0])->toContain('where `user_id` = ?')->toContain('order by `id`')->toContain('limit 2');
    foreach ($statements as $statement) {
        expect($statement)->toContain('order by')->toEndWith('limit 2');
    }
});

it('deletes the children of attempts by the cascade', function () {
    $user = PopulatedAccount::create();

    (new UserPurge(new UserData))->inBatches($user->id);

    expect(DB::table('attempt_tests')->count())->toBe(0)
        ->and(DB::table('attempt_payloads')->count())->toBe(0);
});

it('returns 0 on a second run', function () {
    $user = PopulatedAccount::create();
    $purge = new UserPurge(new UserData);

    $purge->inBatches($user->id);

    expect($purge->inBatches($user->id))->toBe(0);
});

it('skips a declared table that does not exist', function () {
    $user = PopulatedAccount::create();
    $withMissing = new UserData([
        UserTable::owned('zz_missing', null, 'Never created.', 'id', null),
        ...array_filter((new UserData)->tables(), fn (UserTable $table) => $table->name === 'runs'),
    ]);

    expect((new UserPurge($withMissing))->inBatches($user->id))->toBe(1);
});

it('lets DELETE FROM users go through on a populated account and leaves no declared row behind', function () {
    $user = PopulatedAccount::create();

    DB::delete('delete from users where id = ?', [$user->id]);

    $left = [];
    foreach ((new UserData)->tables() as $table) {
        $ownedByUser = in_array($table->ownership, [Ownership::UserId, Ownership::Child], true);
        if ($ownedByUser && UserDataCoverage::exists($table->name) && DB::table($table->name)->count() > 0) {
            $left[] = $table->name;
        }
    }
    expect($left)->toBe([]);
});
