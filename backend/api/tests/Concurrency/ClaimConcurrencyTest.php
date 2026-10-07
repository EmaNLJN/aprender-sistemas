<?php

use App\Runs\Execution\RunClaimer;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Tests\Support\Parallel;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

it('hands a queued run to one of twenty processes that claim it at the same time', function () {
    $run = RunWorld::run(RunWorld::user());

    $claimers = [];
    foreach (range(1, 20) as $claimer) {
        $claimers[] = function () use ($run): array {
            $claim = app(RunClaimer::class)->claim($run->id);

            return [$claim->outcome->name, $claim->run === null || $claim->run->startedAt === null ? null : Instant::format($claim->run->startedAt)];
        };
    }
    $results = Parallel::run($claimers);

    $outcomes = array_count_values(array_column($results, 0));
    $winner = array_values(array_filter($results, fn (array $result) => $result[0] === 'Ready'))[0];
    expect($outcomes)->toEqual(['Ready' => 1, 'Discard' => 19])
        ->and(DB::table('runs')->where('id', $run->id)->value('started_at'))->toBe($winner[1]);
    RunInvariants::assertClean();
});
