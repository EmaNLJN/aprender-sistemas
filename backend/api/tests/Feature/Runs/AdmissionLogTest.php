<?php

use App\Runs\Admission\RunAdmission;
use App\Runs\Admission\RunRejected;
use App\Runs\Admission\SubmittedRun;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\RunLimiters;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

beforeEach(function () {
    config(['logging.default' => 'stderr']);
    $this->handler = new TestHandler;
    Log::channel('stderr')->getLogger()->setHandlers([$this->handler]);
    RunWorld::exercise();
    $this->sentinel = 'TALLER_CENTINELA_'.bin2hex(random_bytes(6));
});

function loggedText(TestHandler $handler): string
{
    return implode("\n", array_map(fn (LogRecord $record) => $record->message.' '.json_encode($record->context).' '.json_encode($record->extra), $handler->getRecords()));
}

it('logs an admission with the run, the account and the exercise, and never the code or the custom test', function () {
    $user = RunWorld::user();

    $result = app(RunAdmission::class)->admit($user->id, new SubmittedRun(
        '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21', 'rust-01', "fn main() {} // {$this->sentinel}", "x == 1 // {$this->sentinel}",
    ));

    $admitted = array_values(array_filter($this->handler->getRecords(), fn (LogRecord $record) => $record->message === 'run.admitted'));
    expect($admitted)->toHaveCount(1)
        ->and($admitted[0]->context['run_id'])->toBe($result->run->id)
        ->and($admitted[0]->context['user_id'])->toBe($user->id)
        ->and($admitted[0]->context['exercise_id'])->toBe('rust-01')
        ->and(loggedText($this->handler))->not->toContain($this->sentinel);
});

it('does not log a retry as a second admission', function () {
    $user = RunWorld::user();
    $request = new SubmittedRun('0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21', 'rust-01', 'fn main() {}', null);

    app(RunAdmission::class)->admit($user->id, $request);
    app(RunAdmission::class)->admit($user->id, $request);

    $admitted = array_filter($this->handler->getRecords(), fn (LogRecord $record) => $record->message === 'run.admitted');
    expect($admitted)->toHaveCount(1);
});

it('leaves the code out of every record when a rejection or a write failure happens', function () {
    $user = RunWorld::user();
    DB::table('exercises')->where('id', 'rust-01')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);
    $code = "fn main() {} // {$this->sentinel}";

    try {
        app(RunAdmission::class)->admit($user->id, new SubmittedRun('0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21', 'rust-01', $code, $code));
    } catch (RunRejected) {
    }
    DB::table('exercises')->where('id', 'rust-01')->update(['status' => 'active', 'retired_at' => null, 'position' => 1]);
    try {
        app(RunAdmission::class)->admit($user->id, new SubmittedRun('0199f4a2-8e03-7c5a-b3d1-9a77c0de4f22', 'rust-01', "{$code}\xFF", null));
    } catch (RunWriteFailed) {
    }

    expect(loggedText($this->handler))->not->toContain($this->sentinel);
});

it('logs a rejection over HTTP with the error code, the account and the exercise, and never the code', function (string $setup, string $expectedCode) {
    $user = RunWorld::user();
    if ($setup === 'quota') {
        RunWorld::run($user, ['status' => 'running', 'started_at' => now()]);
    }
    if ($setup === 'full queue') {
        config(['runs.queue.max_waiting' => 1]);
        RunWorld::run(RunWorld::user());
    }
    RunLimiters::register();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($user);

    $browser->post('/api/runs', [
        'clientRunId' => '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21',
        'exerciseId' => $setup === 'unknown exercise' ? 'rust-99' : 'rust-01',
        'code' => "fn main() {} // {$this->sentinel}",
        'customTest' => "x == 1 // {$this->sentinel}",
    ]);

    $rejected = array_values(array_filter($this->handler->getRecords(), fn (LogRecord $record) => $record->message === 'run.rejected'));
    expect($rejected)->toHaveCount(1)
        ->and($rejected[0]->context)->toBe(['user_id' => $user->id, 'exercise_id' => $setup === 'unknown exercise' ? 'rust-99' : 'rust-01', 'code' => $expectedCode])
        ->and(loggedText($this->handler))->not->toContain($this->sentinel);
})->with([
    'quota' => ['quota', 'quota_exceeded'],
    'unknown exercise' => ['unknown exercise', 'validation_failed'],
    'full queue' => ['full queue', 'queue_full'],
]);
