<?php

namespace App\Runs\Execution;

use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\Evidence\Verdict;
use App\Runs\Record\AttemptFacts;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunLog;
use App\Runs\RunStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use LogicException;

final class RunCloser
{
    private const STDOUT_CHARACTERS = 12000;

    private const STDERR_CHARACTERS = 18000;

    public function __construct(
        private AccountLock $lock,
        private RunStore $store,
        private ProgressMerge $merge,
        private ProgressWriter $progress,
    ) {}

    public function close(string $runId, Verdict $verdict): bool
    {
        $userId = $this->store->ownerOf($runId);
        if ($userId === null) {
            return false;
        }
        try {
            $closed = $this->lock->within($userId, function (ProgressHead $head) use ($runId, $verdict): ?array {
                $run = $this->store->locked($runId);

                return $run === null || ! $run->status->isActive() ? null : [$run, $this->closeWithin($head, $run, $verdict)];
            });
        } catch (AccountGone) {
            return false;
        } catch (QueryException $error) {
            throw RunWriteFailed::reported($runId, $error);
        }
        if ($closed === null) {
            return false;
        }
        RunLog::closed($closed[0], $closed[1]);

        return true;
    }

    public function closeWithin(ProgressHead $head, RunRow $run, Verdict $verdict): Verdict
    {
        $at = Instant::now();
        $applied = $run->cancelRequestedAt === null ? $verdict : $verdict->asCanceled();
        $attemptId = $this->insertAttempt($run, $applied, $at);
        $this->insertVerdicts($attemptId, $run, $applied);
        $this->insertPayload($attemptId, $run, $applied, $at);
        $this->finishRun($run, $applied, $attemptId, $at);
        $this->advanceProgress($head, $run, $applied, $attemptId, $at);

        return $applied;
    }

    private function insertAttempt(RunRow $run, Verdict $verdict, CarbonImmutable $at): int
    {
        $closedAt = Instant::format($at);

        return DB::table('attempts')->insertGetId([
            'user_id' => $run->userId,
            'exercise_id' => $run->exerciseId,
            'epoch' => $run->epoch,
            'outcome' => $verdict->status->value,
            'reason' => $verdict->reason?->value,
            'grading_hash' => $run->gradingHash,
            'code_sha256' => hash('sha256', $run->code),
            'custom_outcome' => $verdict->custom?->value,
            'output_truncated' => $verdict->truncated === true ? 1 : 0,
            'executor_phase' => $verdict->phase?->value,
            'exit_code' => $verdict->exitCode,
            'compile_ms' => $verdict->compileMs,
            'run_ms' => $verdict->runMs,
            'attempted_at' => Instant::format($run->createdAt),
            'started_at' => $run->startedAt === null ? null : Instant::format($run->startedAt),
            'finished_at' => $closedAt,
            'created_at' => $closedAt,
        ]);
    }

    private function insertVerdicts(int $attemptId, RunRow $run, Verdict $verdict): void
    {
        $rows = [];
        foreach ($verdict->tests as $index => $test) {
            $rows[] = [
                'attempt_id' => $attemptId,
                'test_key' => $test->key,
                'exercise_id' => $run->exerciseId,
                'position' => $index + 1,
                'outcome' => $test->outcome->value,
            ];
        }
        if ($rows !== []) {
            DB::table('attempt_tests')->insert($rows);
        }
    }

    private function insertPayload(int $attemptId, RunRow $run, Verdict $verdict, CarbonImmutable $at): void
    {
        DB::table('attempt_payloads')->insert([
            'attempt_id' => $attemptId,
            'code' => $run->code,
            'custom_test' => $run->customTest,
            'stdout' => mb_substr($verdict->stdout ?? '', 0, self::STDOUT_CHARACTERS),
            'stderr' => mb_substr($verdict->stderr ?? '', 0, self::STDERR_CHARACTERS),
            'created_at' => Instant::format($at),
        ]);
    }

    private function finishRun(RunRow $run, Verdict $verdict, int $attemptId, CarbonImmutable $at): void
    {
        $affected = DB::update(
            'update `runs` set `status` = ?, `reason` = ?, `executor_phase` = ?, `exit_code` = ?, `truncated` = ?, `compile_ms` = ?, `run_ms` = ?,
             `stdout` = ?, `stderr` = ?, `attempt_id` = ?, `finished_at` = ?, `program` = null, `expires_at` = null
             where `id` = ? and `status` in (\'queued\', \'running\')',
            [
                $verdict->status->value, $verdict->reason?->value, $verdict->phase?->value, $verdict->exitCode,
                $verdict->truncated === null ? null : ($verdict->truncated ? 1 : 0), $verdict->compileMs, $verdict->runMs,
                $verdict->stdout, $verdict->stderr, $attemptId, Instant::format($at), $run->id,
            ],
        );
        if ($affected !== 1) {
            throw new LogicException("La ejecución {$run->id} dejó de estar activa bajo su candado.");
        }
    }

    private function advanceProgress(ProgressHead $head, RunRow $run, Verdict $verdict, int $attemptId, CarbonImmutable $at): void
    {
        if ($run->epoch !== $head->epoch || $verdict->status === RunStatus::Canceled) {
            return;
        }
        $facts = new AttemptFacts($attemptId, $run->userId, $run->exerciseId, $verdict->status, $verdict->status->countsAsAttempt(), $run->createdAt);
        $merged = $this->merge->afterAttempt($this->progress->lock($run->userId, $run->exerciseId), $facts, $head->revision + 1);
        if ($merged === null) {
            return;
        }
        $this->lock->advance($head, $at);
        $this->progress->write($merged, $at);
    }
}
