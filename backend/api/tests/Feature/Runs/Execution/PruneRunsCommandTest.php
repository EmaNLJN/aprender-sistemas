<?php

use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\Support\RunWorld;

it('prunes, prints both counts and logs the result', function () {
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));
    $user = RunWorld::user();
    RunWorld::run($user, ['id' => (string) Str::uuid7(time: Instant::now()->subDays(15)), 'status' => 'passed']);
    RunWorld::run($user, ['id' => (string) Str::uuid7(time: Instant::now()->subDays(1)), 'status' => 'passed']);
    $at = Instant::format(Instant::now()->subDays(100));
    $attemptId = DB::table('attempts')->insertGetId([
        'user_id' => $user->id, 'exercise_id' => 'rust-01', 'epoch' => 1, 'outcome' => 'passed', 'grading_hash' => hash('sha256', 'rust-01'),
        'code_sha256' => hash('sha256', 'code'), 'output_truncated' => 0, 'attempted_at' => $at, 'finished_at' => $at, 'created_at' => $at,
    ]);
    DB::table('attempt_payloads')->insert(['attempt_id' => $attemptId, 'code' => 'c', 'stdout' => '', 'stderr' => '', 'created_at' => $at]);
    Log::spy();

    $this->artisan('runs:prune')->expectsOutput('Ejecuciones borradas: 1. Payloads borrados: 1.')->assertSuccessful();

    Log::shouldHaveReceived('info')->with('run.pruned', ['runs' => 1, 'payloads' => 1])->once();
    expect(DB::table('runs')->count())->toBe(1);
});
