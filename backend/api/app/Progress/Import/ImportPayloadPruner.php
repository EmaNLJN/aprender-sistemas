<?php

namespace App\Progress\Import;

use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class ImportPayloadPruner
{
    public function prune(CarbonImmutable $now): int
    {
        $cutoff = Instant::format($now->subDays(config()->integer('progress.retention.raw_payload_days')));
        $batchSize = config()->integer('progress.batches.prune');
        $pruned = 0;
        for ($batch = 0; $batch < config()->integer('progress.batches.prune_max'); $batch++) {
            $ids = DB::table('progress_imports')
                ->where('imported_at', '<', $cutoff)
                ->whereNotNull('raw_payload')
                ->orderBy('id')
                ->limit($batchSize)
                ->pluck('id')
                ->all();
            if ($ids === []) {
                break;
            }
            $pruned += DB::table('progress_imports')->whereIn('id', $ids)->update(['raw_payload' => null]);
            if (count($ids) < $batchSize) {
                break;
            }
        }

        return $pruned;
    }
}
