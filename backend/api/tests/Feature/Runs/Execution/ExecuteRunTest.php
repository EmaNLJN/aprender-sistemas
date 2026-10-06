<?php

use App\Jobs\ExecuteRun;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\Execution\RunProcessor;
use App\Runs\Record\Instant;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Illuminate\Queue\Attributes\FailOnTimeout;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunWorld;

it('is a single-attempt job with a 120 second timeout that fails on timeout', function () {
    $class = new ReflectionClass(ExecuteRun::class);

    expect($class->getAttributes(Tries::class)[0]->newInstance()->tries)->toBe(1)
        ->and($class->getAttributes(Timeout::class)[0]->newInstance()->timeout)->toBe(120)
        ->and($class->getAttributes(FailOnTimeout::class))->toHaveCount(1)
        ->and(ExecuteRun::TIMEOUT)->toBe(120);
});

it('travels through the runs connection and the runs queue', function () {
    $job = new ExecuteRun('01990000-0000-7000-8000-000000000000');

    expect($job->connection)->toBe('runs')
        ->and($job->queue)->toBe('runs');
});

it('leaves a row in jobs when dispatched, and none inside a transaction that rolls back', function () {
    ExecuteRun::dispatch('01990000-0000-7000-8000-000000000001');
    expect(DB::table('jobs')->where('queue', 'runs')->count())->toBe(1);

    try {
        DB::transaction(function () {
            ExecuteRun::dispatch('01990000-0000-7000-8000-000000000002');
            throw new RuntimeException('rollback');
        });
    } catch (RuntimeException) {
    }

    expect(DB::table('jobs')->count())->toBe(1);
});

it('hands its run to the bound processor', function () {
    $processor = new class implements RunProcessor
    {
        /** @var list<string> */
        public array $processed = [];

        public function process(string $runId): void
        {
            $this->processed[] = $runId;
        }
    };
    app()->instance(RunProcessor::class, $processor);

    app()->call([new ExecuteRun('01990000-0000-7000-8000-000000000003'), 'handle']);

    expect($processor->processed)->toBe(['01990000-0000-7000-8000-000000000003']);
});

it('closes an active run as infra_error job_failed when it fails and logs only the exception class', function () {
    $run = RunWorld::run(RunWorld::user(), ['status' => 'running', 'started_at' => Instant::now()]);
    Log::spy();

    (new ExecuteRun($run->id))->failed(new RuntimeException('secreto del alumno'));

    $stored = DB::selectOne('select status, reason from runs where id = ?', [$run->id]);
    expect($stored->status)->toBe(RunStatus::InfraError->value)
        ->and($stored->reason)->toBe(RunReason::JobFailed->value);
    Log::shouldHaveReceived('error')->with('run.job_failed', ['run_id' => $run->id, 'exception' => RuntimeException::class])->once();
});

it('does nothing to a run that already finished when it fails', function () {
    $run = RunWorld::run(RunWorld::user(), ['status' => 'running', 'started_at' => Instant::now()]);
    app(RunCloser::class)->close($run->id, Verdict::canceled());

    (new ExecuteRun($run->id))->failed(null);

    expect(DB::table('attempts')->count())->toBe(1)
        ->and(DB::table('runs')->where('id', $run->id)->value('status'))->toBe('canceled');
});

it('ends quietly when the close itself cannot be written, leaving the sweep to expire the run', function () {
    $run = RunWorld::run(RunWorld::user(), ['status' => 'running', 'started_at' => Instant::now()]);
    DB::statement('SET FOREIGN_KEY_CHECKS=0');
    DB::delete('delete from exercises where id = ?', [$run->exerciseId]);
    DB::statement('SET FOREIGN_KEY_CHECKS=1');

    (new ExecuteRun($run->id))->failed(new RuntimeException('x'));

    expect(DB::table('runs')->where('id', $run->id)->value('status'))->toBe('running');
});
