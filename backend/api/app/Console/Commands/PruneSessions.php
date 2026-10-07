<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class PruneSessions extends Command
{
    private const BATCH_SIZE = 1000;

    protected $signature = 'taller:prune-sessions';

    protected $description = 'Borra por lotes las sesiones vencidas';

    public function handle(): int
    {
        $cutoff = now()->getTimestamp() - config()->integer('session.lifetime') * 60;
        $deleted = 0;
        do {
            $batch = DB::table('sessions')
                ->where('last_activity', '<=', $cutoff)
                ->orderBy('last_activity')
                ->limit(self::BATCH_SIZE)
                ->delete();
            $deleted += $batch;
        } while ($batch === self::BATCH_SIZE);

        $this->info("Sesiones vencidas borradas: {$deleted}.");

        return self::SUCCESS;
    }
}
