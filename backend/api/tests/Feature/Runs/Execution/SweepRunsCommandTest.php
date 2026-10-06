<?php

use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));
});

it('closes the expired runs with their attempt, prints the count and logs the sweep', function () {
    $user = RunWorld::user();
    $queued = RunWorld::run($user);
    $running = RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now(), 'expires_at' => Instant::now()->addSeconds(140)]);
    $fresh = RunWorld::run($user);
    $this->travel(141)->seconds();
    DB::update('update `runs` set `expires_at` = ? where `id` = ?', [Instant::format(Instant::now()->addMinutes(5)), $fresh->id]);
    Log::spy();

    $this->artisan('runs:sweep')->expectsOutput('Ejecuciones vencidas cerradas: 1.')->assertSuccessful();

    expect(DB::table('runs')->where('id', $running->id)->value('status'))->toBe('infra_error')
        ->and(DB::table('runs')->where('id', $running->id)->value('reason'))->toBe('expired')
        ->and(DB::table('attempts')->count())->toBe(1)
        ->and(DB::table('runs')->where('id', $queued->id)->value('status'))->toBe('queued')
        ->and(DB::table('runs')->where('id', $fresh->id)->value('status'))->toBe('queued');
    Log::shouldHaveReceived('info')->with('run.swept', ['closed' => 1])->once();
    RunInvariants::assertClean();
});

it('closes at most 100 runs per sweep', function () {
    $user = RunWorld::user();
    foreach (range(1, 101) as $ignored) {
        RunWorld::run($user);
    }
    $this->travel(601)->seconds();
    Log::spy();

    $this->artisan('runs:sweep')->expectsOutput('Ejecuciones vencidas cerradas: 100.')->assertSuccessful();

    expect(DB::table('runs')->where('status', 'queued')->count())->toBe(1);
});

it('prints 0 and succeeds when nothing is due', function () {
    RunWorld::run(RunWorld::user());
    Log::spy();

    $this->artisan('runs:sweep')->expectsOutput('Ejecuciones vencidas cerradas: 0.')->assertSuccessful();

    Log::shouldHaveReceived('info')->with('run.swept', ['closed' => 0])->once();
});
