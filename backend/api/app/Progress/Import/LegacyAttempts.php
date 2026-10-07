<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\LegacyResult;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use stdClass;

final class LegacyAttempts
{
    private const REUSE_WINDOW_SECONDS = 600;

    public function record(int $userId, int $epoch, string $exerciseId, LegacyResult $result, CarbonImmutable $now): RecordedAttempt
    {
        $codeHash = hash('sha256', $result->code);
        $existing = $this->namedByResult($userId, $exerciseId, $result)
            ?? $this->nearServerAttempt($userId, $exerciseId, $codeHash, $result->time)
            ?? $this->sameLegacyAttempt($userId, $exerciseId, $codeHash, $result->time);

        if ($existing !== null) {
            return new RecordedAttempt($this->pointerTo($existing), false);
        }

        $attemptId = $this->insert($userId, $epoch, $exerciseId, $codeHash, $result, $now);

        return new RecordedAttempt(new AttemptPointer($attemptId, $result->time, $result->success), true);
    }

    private function namedByResult(int $userId, string $exerciseId, LegacyResult $result): ?stdClass
    {
        if ($result->attemptId === null) {
            return null;
        }

        return DB::table('attempts')
            ->where('id', $result->attemptId)->where('user_id', $userId)->where('exercise_id', $exerciseId)
            ->first(['id', 'attempted_at', 'outcome']);
    }

    private function nearServerAttempt(int $userId, string $exerciseId, string $codeHash, CarbonImmutable $time): ?stdClass
    {
        $stamp = Instant::format($time);

        return DB::table('attempts')
            ->where('user_id', $userId)->where('exercise_id', $exerciseId)->where('legacy', 0)->where('code_sha256', $codeHash)
            ->whereBetween('attempted_at', [
                Instant::format($time->subSeconds(self::REUSE_WINDOW_SECONDS)),
                Instant::format($time->addSeconds(self::REUSE_WINDOW_SECONDS)),
            ])
            ->orderByRaw('ABS(TIMESTAMPDIFF(MICROSECOND, `attempted_at`, ?))', [$stamp])
            ->orderBy('id')
            ->first(['id', 'attempted_at', 'outcome']);
    }

    private function sameLegacyAttempt(int $userId, string $exerciseId, string $codeHash, CarbonImmutable $time): ?stdClass
    {
        return DB::table('attempts')
            ->where('user_id', $userId)->where('exercise_id', $exerciseId)->where('legacy', 1)->where('code_sha256', $codeHash)
            ->where('attempted_at', Instant::format($time))
            ->orderBy('id')
            ->first(['id', 'attempted_at', 'outcome']);
    }

    private function pointerTo(stdClass $attempt): AttemptPointer
    {
        return new AttemptPointer($attempt->id, Instant::parse($attempt->attempted_at), $attempt->outcome === 'passed');
    }

    private function insert(int $userId, int $epoch, string $exerciseId, string $codeHash, LegacyResult $result, CarbonImmutable $now): int
    {
        $time = Instant::format($result->time);
        $created = Instant::format($now);

        $attemptId = DB::table('attempts')->insertGetId([
            'user_id' => $userId, 'exercise_id' => $exerciseId, 'epoch' => $epoch, 'legacy' => 1,
            'outcome' => $this->outcomeOf($result), 'code_sha256' => $codeHash,
            'custom_outcome' => $result->customPassed ? 'pass' : null, 'output_truncated' => 0,
            'attempted_at' => $time, 'finished_at' => $time, 'created_at' => $created,
        ]);
        $this->insertTests($attemptId, $exerciseId, $result);
        DB::table('attempt_payloads')->insert([
            'attempt_id' => $attemptId, 'code' => $result->code, 'custom_test' => $result->customTest,
            'stdout' => $result->stdout, 'stderr' => $result->stderr, 'created_at' => $created,
        ]);

        return $attemptId;
    }

    private function outcomeOf(LegacyResult $result): string
    {
        return match (true) {
            $result->success => 'passed',
            $result->transportError => 'legacy_error',
            default => 'failed',
        };
    }

    private function insertTests(int $attemptId, string $exerciseId, LegacyResult $result): void
    {
        $rows = [];
        foreach ($result->tests as $index => $test) {
            $rows[] = [
                'attempt_id' => $attemptId, 'test_key' => $test['testKey'], 'exercise_id' => $exerciseId,
                'position' => $index + 1, 'outcome' => $test['passed'] ? 'pass' : 'fail',
            ];
        }
        if ($rows !== []) {
            DB::table('attempt_tests')->insert($rows);
        }
    }
}
