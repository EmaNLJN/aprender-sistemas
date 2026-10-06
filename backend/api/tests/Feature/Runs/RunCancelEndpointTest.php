<?php

use App\Runs\Record\Instant;
use App\Runs\RunLimiters;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));
    RunLimiters::register();
    RunWorld::exercise();
    $this->user = RunWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

it('cancels a queued run at once and answers 200 with it canceled', function () {
    $run = RunWorld::run($this->user);

    $response = $this->browser->post("/api/runs/{$run->id}/cancel");

    $response->assertOk()->assertJsonPath('data.id', $run->id)->assertJsonPath('data.status', 'canceled')->assertJsonPath('data.queuePosition', null);
    expect($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
        ->and(DB::table('runs')->where('id', $run->id)->value('status'))->toBe('canceled');
});

it('accepts the cancellation of a running run with 202 and leaves it running', function () {
    $run = RunWorld::run($this->user, ['status' => 'running', 'started_at' => Instant::now()]);

    $response = $this->browser->post("/api/runs/{$run->id}/cancel");

    $response->assertStatus(202)->assertJsonPath('data.status', 'running');
    expect(DB::table('runs')->where('id', $run->id)->value('cancel_requested_at'))->not->toBeNull()
        ->and(DB::table('runs')->where('id', $run->id)->value('status'))->toBe('running');
});

it('answers 200 and changes nothing for a run that already finished', function () {
    $run = RunWorld::run($this->user, ['status' => 'passed', 'finished_at' => Instant::now()]);

    $this->browser->post("/api/runs/{$run->id}/cancel")->assertOk()->assertJsonPath('data.status', 'passed');

    expect(DB::table('runs')->where('id', $run->id)->value('status'))->toBe('passed');
});

it('answers 404 to a run of another account and to one that does not exist', function () {
    $other = RunWorld::run(RunWorld::user());

    $this->browser->post("/api/runs/{$other->id}/cancel")->assertNotFound()->assertJsonPath('code', 'not_found');
    $this->browser->post('/api/runs/0199f4a2-0000-7000-8000-00000000ffff/cancel')->assertNotFound();

    expect(DB::table('runs')->where('id', $other->id)->value('status'))->toBe('queued');
});

it('ignores the body of the request', function () {
    $run = RunWorld::run($this->user);

    $this->browser->post("/api/runs/{$run->id}/cancel", ['status' => 'passed', 'userId' => 99])->assertOk()->assertJsonPath('data.status', 'canceled');
});
