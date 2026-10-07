<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class PruneCache extends Command
{
    private const BATCH_SIZE = 1000;

    protected $signature = 'taller:prune-cache';

    protected $description = 'Borra por lotes la caché y los candados vencidos';

    public function handle(): int
    {
        foreach (['cache', 'cache_locks'] as $table) {
            $deleted = $this->pruneExpired($table);
            $this->info("Filas vencidas borradas de {$table}: {$deleted}.");
        }

        return self::SUCCESS;
    }

    private function pruneExpired(string $table): int
    {
        $now = now()->getTimestamp();
        $deleted = 0;
        do {
            $batch = DB::table($table)
                ->where('expiration', '<=', $now)
                ->orderBy('expiration')
                ->limit(self::BATCH_SIZE)
                ->delete();
            $deleted += $batch;
        } while ($batch === self::BATCH_SIZE);

        return $deleted;
    }
}
