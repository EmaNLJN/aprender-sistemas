<?php

use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunWorld;

function closeFailureRun(): string
{
    return RunWorld::run(RunWorld::user(), [
        'status' => 'running', 'started_at' => Instant::now(), 'code' => 'fn secreto() {}',
    ])->id;
}

function invalidUtf8Verdict(): Verdict
{
    return new Verdict(RunStatus::RuntimeError, null, null, 1, false, null, null, "\xFF", '', [], null);
}

it('throws RunWriteFailed without the code, the value or a previous exception when the database rejects the write', function () {
    $runId = closeFailureRun();

    try {
        app(RunCloser::class)->close($runId, invalidUtf8Verdict());
        $this->fail('expected RunWriteFailed');
    } catch (RunWriteFailed $failure) {
        expect($failure->getMessage())->toBe('La base rechazó la escritura (SQLSTATE HY000, error 1366).')
            ->and($failure->getMessage())->not->toContain('secreto')
            ->and($failure->getPrevious())->toBeNull();
    }
});

it('leaves the run active, with no attempt and no head moved', function () {
    $runId = closeFailureRun();

    try {
        app(RunCloser::class)->close($runId, invalidUtf8Verdict());
    } catch (RunWriteFailed) {
    }

    expect(DB::table('runs')->where('id', $runId)->value('status'))->toBe('running')
        ->and(DB::table('attempts')->count())->toBe(0)
        ->and(DB::table('progress_heads')->count())->toBe(0);
});

it('logs only the SQLSTATE and the driver code', function () {
    $runId = closeFailureRun();
    Log::spy();

    try {
        app(RunCloser::class)->close($runId, invalidUtf8Verdict());
    } catch (RunWriteFailed) {
    }

    Log::shouldHaveReceived('error')->with('run.write_failed', ['run_id' => $runId, 'sql_state' => 'HY000', 'driver_code' => 1366])->once();
});
