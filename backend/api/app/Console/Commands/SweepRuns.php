<?php

namespace App\Console\Commands;

use App\Runs\Execution\RunExpiry;
use App\Runs\RunLog;
use Illuminate\Console\Command;

final class SweepRuns extends Command
{
    protected $signature = 'runs:sweep';

    protected $description = 'Cierra las ejecuciones vencidas que ningún worker cerró';

    public function handle(RunExpiry $expiry): int
    {
        $closed = $expiry->sweep(config()->integer('runs.batches.sweep'));
        RunLog::swept($closed);

        $this->info("Ejecuciones vencidas cerradas: {$closed}.");

        return self::SUCCESS;
    }
}
