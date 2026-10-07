<?php

use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunLimiters;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
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

it('shows the owner of a queued run its position: one plus the queued runs with a smaller id', function () {
    $ahead = RunWorld::run(RunWorld::user(), ['id' => '0199f4a2-0000-7000-8000-000000000001']);
    RunWorld::run(RunWorld::user(), ['id' => '0199f4a2-0000-7000-8000-000000000002', 'status' => 'running', 'started_at' => Instant::now()]);
    $mine = RunWorld::run($this->user, ['id' => '0199f4a2-0000-7000-8000-000000000003']);
    RunWorld::run(RunWorld::user(), ['id' => '0199f4a2-0000-7000-8000-000000000004']);

    $response = $this->browser->get("/api/runs/{$mine->id}");

    $response->assertOk()->assertJsonPath('data.id', $mine->id)->assertJsonPath('data.status', 'queued')->assertJsonPath('data.queuePosition', 2);
    expect($ahead->id)->toBeLessThan($mine->id)
        ->and($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
        ->and($response->headers->getCacheControlDirective('private'))->toBeTrue();
});

it('shows a finished run with its phase, times, output and the verdicts in the order of the tests', function () {
    $run = RunWorld::run($this->user, ['status' => 'running', 'started_at' => Instant::now(), 'custom_test' => 'x == 1']);
    app(RunCloser::class)->close($run->id, new Verdict(
        RunStatus::Failed, null, ExecutorPhase::Run, 0, true, 412, 31, "salida\n", 'error',
        [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Fail), new TestVerdict('t3', TestOutcome::Missing)],
        TestOutcome::Pass,
    ));

    $response = $this->browser->get("/api/runs/{$run->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data['status'])->toBe('failed')
        ->and($data['queuePosition'])->toBeNull()
        ->and($data['phase'])->toBe('run')
        ->and($data['exitCode'])->toBe(0)
        ->and($data['compileMs'])->toBe(412)
        ->and($data['runMs'])->toBe(31)
        ->and($data['truncated'])->toBeTrue()
        ->and($data['stdout'])->toBe("salida\n")
        ->and($data['stderr'])->toBe('error')
        ->and($data['finishedAt'])->toBe('2026-10-05T12:00:00.000Z')
        ->and($data['tests'])->toBe([
            ['key' => 't1', 'outcome' => 'pass'],
            ['key' => 't2', 'outcome' => 'fail'],
            ['key' => 't3', 'outcome' => 'missing'],
        ])
        ->and($data['customTest'])->toBe('pass');
});

it('answers 404 not_found to a run of another account, an unknown one, a pruned one and an id that is not a uuid', function (string $path) {
    $other = RunWorld::run(RunWorld::user(), ['id' => '0199f4a2-0000-7000-8000-00000000000a']);
    $path = str_replace('{other}', $other->id, $path);

    $this->browser->get($path)->assertNotFound()->assertJsonPath('code', 'not_found');
})->with([
    'another account' => '/api/runs/{other}',
    'unknown' => '/api/runs/0199f4a2-0000-7000-8000-00000000ffff',
    'not a uuid' => '/api/runs/not-a-uuid',
    'upper case' => '/api/runs/0199F4A2-0000-7000-8000-00000000000A',
]);

it('reads a run with at most four statements on runs and attempts', function () {
    $run = RunWorld::run($this->user, ['status' => 'running', 'started_at' => Instant::now()]);
    app(RunCloser::class)->close($run->id, new Verdict(
        RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 1, 1, '', '', [new TestVerdict('t1', TestOutcome::Pass)], null,
    ));
    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->browser->get("/api/runs/{$run->id}")->assertOk();

    $reads = collect(DB::getQueryLog())->pluck('query')->filter(fn (string $sql) => preg_match('/(from|join)\s+`(runs|attempts|attempt_tests)`/i', $sql) === 1);
    expect($reads->count())->toBeLessThanOrEqual(4);
});

it('does not limit how often a run is read', function () {
    $run = RunWorld::run($this->user);

    foreach (range(1, 100) as $reading) {
        $this->browser->get("/api/runs/{$run->id}")->assertOk();
    }
});
