<?php

namespace App\Runs;

use App\Runs\Record\Instant;

final class RunPresenter
{
    /** @return array<string, mixed> */
    public function present(RunView $view): array
    {
        $run = $view->run;
        $tests = [];
        foreach ($view->tests as $test) {
            $tests[] = ['key' => $test->key, 'outcome' => $test->outcome->value];
        }

        return [
            'id' => $run->id,
            'status' => $run->status->value,
            'reason' => $run->reason?->value,
            'queuePosition' => $view->queuePosition,
            'exerciseId' => $run->exerciseId,
            'language' => $run->language->value,
            'createdAt' => Instant::iso($run->createdAt),
            'startedAt' => $run->startedAt === null ? null : Instant::iso($run->startedAt),
            'finishedAt' => $run->finishedAt === null ? null : Instant::iso($run->finishedAt),
            'phase' => $run->phase?->value,
            'exitCode' => $run->exitCode,
            'compileMs' => $run->compileMs,
            'runMs' => $run->runMs,
            'truncated' => $run->truncated,
            'stdout' => $run->stdout,
            'stderr' => $run->stderr,
            'tests' => $tests,
            'customTest' => $view->custom?->value,
        ];
    }
}
