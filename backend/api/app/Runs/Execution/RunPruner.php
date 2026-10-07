<?php

namespace App\Runs\Execution;

use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class RunPruner
{
    private const EARLIEST_DATETIME = '1000-01-01 00:00:00.000';

    public function prune(CarbonImmutable $now): PruneReport
    {
        return new PruneReport($this->pruneRuns($now), $this->prunePayloads($now));
    }

    private function pruneRuns(CarbonImmutable $now): int
    {
        $cutoff = Uuid7Cutoff::at($now->subDays(config()->integer('runs.retention.runs_days')));
        $batchSize = config()->integer('runs.batches.prune');
        $deleted = 0;
        for ($batch = 0; $batch < config()->integer('runs.batches.prune_max'); $batch++) {
            $inBatch = DB::delete(
                "delete from `runs` where `id` < ? and `status` not in ('queued', 'running') order by `id` limit ?",
                [$cutoff, $batchSize],
            );
            $deleted += $inBatch;
            if ($inBatch < $batchSize) {
                break;
            }
        }

        return $deleted;
    }

    private function prunePayloads(CarbonImmutable $now): int
    {
        $cutoff = Instant::format($now->subDays(config()->integer('runs.retention.payload_days')));
        $batchSize = config()->integer('runs.batches.prune');
        $cursorAt = self::EARLIEST_DATETIME;
        $cursorId = 0;
        $deleted = 0;
        for ($batch = 0; $batch < config()->integer('runs.batches.prune_max'); $batch++) {
            $candidates = $this->payloadCandidates($cutoff, $cursorAt, $cursorId, $batchSize);
            if ($candidates === []) {
                break;
            }
            $deleted += $this->deletePayloads(array_column($candidates, 'attempt_id'));
            $last = $candidates[array_key_last($candidates)];
            $cursorAt = $last['created_at'];
            $cursorId = $last['attempt_id'];
            if (count($candidates) < $batchSize) {
                break;
            }
        }

        return $deleted;
    }

    /** @return list<array{attempt_id: int, created_at: string}> */
    private function payloadCandidates(string $cutoff, string $cursorAt, int $cursorId, int $limit): array
    {
        $rows = DB::select(
            'select p.`attempt_id`, p.`created_at`
             from `attempt_payloads` p
             join `attempts` a on a.`id` = p.`attempt_id`
             where p.`created_at` < ?
               and (p.`created_at` > ? or (p.`created_at` = ? and p.`attempt_id` > ?))
               and not exists (
                 select 1 from `exercise_progress` e
                 where e.`user_id` = a.`user_id` and e.`exercise_id` = a.`exercise_id`
                   and (e.`proof_attempt_id` = a.`id` or e.`last_attempt_id` = a.`id`))
             order by p.`created_at`, p.`attempt_id`
             limit ?',
            [$cutoff, $cursorAt, $cursorAt, $cursorId, $limit],
        );
        $candidates = [];
        foreach ($rows as $row) {
            $fields = new RowFields((array) $row, 'attempt_payloads');
            $candidates[] = ['attempt_id' => $fields->int('attempt_id'), 'created_at' => $fields->string('created_at')];
        }

        return $candidates;
    }

    /** @param list<int> $attemptIds */
    private function deletePayloads(array $attemptIds): int
    {
        $placeholders = implode(', ', array_fill(0, count($attemptIds), '?'));

        return DB::delete("delete from `attempt_payloads` where `attempt_id` in ({$placeholders})", $attemptIds);
    }
}
