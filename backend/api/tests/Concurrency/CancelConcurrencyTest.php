<?php

use App\Runs\Execution\RunCanceller;
use App\Runs\Execution\RunClaimer;
use Illuminate\Support\Facades\DB;
use Tests\Support\Parallel;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

it('never both cancels and runs: a cancellation and a claim of the same queued run, ten times', function () {
    $runs = [];
    for ($index = 0; $index < 10; $index++) {
        $user = RunWorld::user();
        $runs[] = ['id' => RunWorld::run($user)->id, 'user' => $user->id];
    }

    $tasks = [];
    foreach ($runs as $index => $run) {
        $tasks["cancel-{$index}"] = function () use ($run): string {
            return app(RunCanceller::class)->cancel($run['user'], $run['id'])->name;
        };
        $tasks["claim-{$index}"] = function () use ($run): string {
            return app(RunClaimer::class)->claim($run['id'])->outcome->name;
        };
    }
    Parallel::run($tasks);

    $cancelWon = 0;
    $claimWon = 0;
    foreach ($runs as $run) {
        $stored = DB::selectOne('select status, cancel_requested_at from runs where id = ?', [$run['id']]);
        $attempts = DB::table('attempts')->where('user_id', $run['user'])->count();
        if ($stored->status === 'canceled') {
            $cancelWon++;
            expect($attempts)->toBe(1);
        } else {
            $claimWon++;
            expect($stored->status)->toBe('running')
                ->and($stored->cancel_requested_at)->not->toBeNull()
                ->and($attempts)->toBe(0);
        }
    }
    expect($cancelWon + $claimWon)->toBe(10);
    RunInvariants::assertClean();
});
