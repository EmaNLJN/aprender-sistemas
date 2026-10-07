<?php

namespace App\Runs\Execution;

use App\Runs\Record\Instant;
use App\Runs\Record\RunProgress;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class ProgressWriter
{
    public function lock(int $userId, string $exerciseId): ?RunProgress
    {
        $rows = DB::select('select * from `exercise_progress` where `user_id` = ? and `exercise_id` = ? for update', [$userId, $exerciseId]);

        return $rows === [] ? null : RunProgress::fromRow(get_object_vars($rows[0]));
    }

    public function write(RunProgress $progress, CarbonImmutable $at): void
    {
        $now = Instant::format($at);
        DB::insert(
            'insert into `exercise_progress` (`user_id`, `exercise_id`, `solved_at`, `server_solved_at`, `proof_attempt_id`, `proof_at`, `last_attempt_id`, `last_attempt_at`, `attempt_count`, `revision`, `created_at`, `updated_at`)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) as `n`
             on duplicate key update `solved_at` = `n`.`solved_at`, `server_solved_at` = `n`.`server_solved_at`, `proof_attempt_id` = `n`.`proof_attempt_id`, `proof_at` = `n`.`proof_at`,
             `last_attempt_id` = `n`.`last_attempt_id`, `last_attempt_at` = `n`.`last_attempt_at`, `attempt_count` = `n`.`attempt_count`, `revision` = `n`.`revision`, `updated_at` = `n`.`updated_at`',
            [
                $progress->userId, $progress->exerciseId, $this->format($progress->solvedAt), $this->format($progress->serverSolvedAt),
                $progress->proofAttemptId, $this->format($progress->proofAt), $progress->lastAttemptId, $this->format($progress->lastAttemptAt),
                $progress->attemptCount, $progress->revision, $now, $now,
            ],
        );
    }

    private function format(?CarbonImmutable $at): ?string
    {
        return $at === null ? null : Instant::format($at);
    }
}
