<?php

namespace App\Console\Commands;

use App\Runs\Execution\RunPruner;
use App\Runs\Record\Instant;
use App\Runs\RunLog;
use Illuminate\Console\Command;

final class PruneRuns extends Command
{
    protected $signature = 'runs:prune';

    protected $description = 'Borra por lotes las ejecuciones y los payloads que cumplieron su retención';

    public function handle(RunPruner $pruner): int
    {
        $report = $pruner->prune(Instant::now());
        RunLog::pruned($report->runs, $report->payloads);

        $this->info("Ejecuciones borradas: {$report->runs}. Payloads borrados: {$report->payloads}.");

        return self::SUCCESS;
    }
}
