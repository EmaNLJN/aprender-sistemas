<?php

namespace App\Console\Commands;

use App\Progress\SyncOperationsPruner;
use App\Runs\Record\Instant;
use Illuminate\Console\Command;

final class PruneSyncOperations extends Command
{
    protected $signature = 'progress:prune-sync-operations';

    protected $description = 'Borra por lotes las operaciones de sincronización que cumplieron su retención';

    public function handle(SyncOperationsPruner $pruner): int
    {
        $deleted = $pruner->prune(Instant::now());

        $this->info("Operaciones de sincronización borradas: {$deleted}.");

        return self::SUCCESS;
    }
}
