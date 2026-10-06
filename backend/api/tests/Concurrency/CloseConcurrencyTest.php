<?php

use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Tests\Support\Parallel;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

it('closes one run once when twenty processes close it at the same time', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now()]);
    $verdict = new Verdict(
        RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 10, 10, 'ok', '',
        [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Pass), new TestVerdict('t3', TestOutcome::Pass)], null,
    );

    $closers = [];
    foreach (range(1, 20) as $closer) {
        $closers[] = function () use ($run, $verdict): bool {
            return app(RunCloser::class)->close($run->id, $verdict);
        };
    }
    $results = Parallel::run($closers);

    expect(array_count_values(array_map(fn (bool $closed) => $closed ? 'true' : 'false', $results)))->toEqual(['true' => 1, 'false' => 19])
        ->and(DB::table('attempts')->count())->toBe(1)
        ->and((int) DB::table('exercise_progress')->where('user_id', $user->id)->value('attempt_count'))->toBe(1)
        ->and((int) DB::table('progress_heads')->where('user_id', $user->id)->value('revision'))->toBe(1);
    RunInvariants::assertClean();
});
