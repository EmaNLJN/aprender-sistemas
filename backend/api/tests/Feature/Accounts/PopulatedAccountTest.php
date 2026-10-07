<?php

use App\Accounts\Ownership;
use App\Accounts\UserData;
use Illuminate\Support\Facades\DB;
use Tests\Support\PopulatedAccount;
use Tests\Support\UserDataCoverage;

it('leaves at least one row in every declared table that exists, directly or through its parent', function () {
    $user = PopulatedAccount::create();

    $empty = [];
    foreach ((new UserData)->tables() as $table) {
        $ownedByUser = in_array($table->ownership, [Ownership::UserId, Ownership::Child], true);
        if ($ownedByUser && UserDataCoverage::exists($table->name) && UserDataCoverage::rowsOf($table, $user->id) === 0) {
            $empty[] = $table->name;
        }
    }

    expect($empty)->toBe([]);
});

it('populates the tables of runs and attempts', function () {
    $user = PopulatedAccount::create();

    foreach (['sessions', 'progress_heads', 'runs', 'exercise_progress', 'attempts'] as $table) {
        expect(DB::table($table)->where('user_id', $user->id)->count())->toBeGreaterThan(0);
    }
    $attempt = DB::table('attempts')->where('user_id', $user->id)->value('id');
    expect(DB::table('attempt_tests')->where('attempt_id', $attempt)->count())->toBeGreaterThan(0)
        ->and(DB::table('attempt_payloads')->where('attempt_id', $attempt)->count())->toBe(1);
});

it('adds the invitation the user created and the recovery token of its email', function () {
    $user = PopulatedAccount::create();

    expect(DB::table('invitations')->where('invited_by', $user->id)->count())->toBe(1)
        ->and(DB::table('password_reset_tokens')->where('email', $user->email)->count())->toBe(1);
});

it('applies the given state to the user', function () {
    $user = PopulatedAccount::create(['name' => 'Ana']);

    expect($user->name)->toBe('Ana');
});

it('can populate two accounts without clashing', function () {
    $first = PopulatedAccount::create();
    $second = PopulatedAccount::create();

    expect($first->id)->not->toBe($second->id)
        ->and(DB::table('runs')->count())->toBe(2);
});
