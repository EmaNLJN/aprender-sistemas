<?php

namespace App\Progress;

use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class SyncOperationsPruner
{
    public function prune(CarbonImmutable $now): int
    {
        $cutoff = Instant::format($now->subDays(config()->integer('progress.retention.sync_operations_days')));
        $batchSize = config()->integer('progress.batches.prune');
        $deleted = 0;
        for ($batch = 0; $batch < config()->integer('progress.batches.prune_max'); $batch++) {
            $inBatch = DB::delete(
                "delete from `sync_operations` where `received_at` < ? order by `received_at` limit {$batchSize}",
                [$cutoff],
            );
            $deleted += $inBatch;
            if ($inBatch < $batchSize) {
                break;
            }
        }

        return $deleted;
    }
}
