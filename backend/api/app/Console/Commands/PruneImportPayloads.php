<?php

namespace App\Console\Commands;

use App\Progress\Import\ImportPayloadPruner;
use App\Runs\Record\Instant;
use Illuminate\Console\Command;

final class PruneImportPayloads extends Command
{
    protected $signature = 'progress:prune-import-payloads';

    protected $description = 'Pone en NULL por lotes el crudo de las importaciones que cumplieron su retención';

    public function handle(ImportPayloadPruner $pruner): int
    {
        $pruned = $pruner->prune(Instant::now());

        $this->info("Crudos de importación podados: {$pruned}.");

        return self::SUCCESS;
    }
}
