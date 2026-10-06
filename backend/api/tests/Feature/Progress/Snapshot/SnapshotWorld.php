<?php

namespace Tests\Feature\Progress\Snapshot;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\ProgressWorld;

final class SnapshotWorld
{
    public const CONTENT_VERSION = '0123456789abcdef0123456789abcdef';

    public const CLOCK = '2026-10-06 10:00:00.000';

    public const CLOCK_ISO = '2026-10-06T10:00:00.000Z';

    public static function seedContent(): void
    {
        ProgressWorld::seed([
            'contentVersion' => self::CONTENT_VERSION,
            'staleContentVersion' => 'fedcba9876543210fedcba9876543210',
            'exercises' => [
                ['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3],
                ['id' => 'fx-rust-02', 'language' => 'rust', 'hints' => 2, 'predictionOptions' => 3],
                ['id' => 'fx-go-01', 'language' => 'go', 'hints' => 3, 'predictionOptions' => 3],
            ],
            'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
            'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1', 'fx-obj-2'], 'steps' => ['e1', 'e2', 'e3', 'e4']]],
            'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => ['fx-res-1']],
            'milestones' => ['rust-memory', 'go-memory'],
        ]);
    }

    /** @param array<string, mixed> $columns */
    public static function insert(string $table, User $user, array $columns): void
    {
        $stamps = ['created_at' => self::CLOCK, 'updated_at' => self::CLOCK];
        if ($table === 'workshop_observations') {
            unset($stamps['updated_at']);
        }
        DB::table($table)->insert(['user_id' => $user->id, 'revision' => 0, ...$stamps, ...$columns]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @param  array<string, string>  $verdicts  outcome by test key, in the order of the tests
     */
    public static function attempt(User $user, string $exerciseId, array $overrides = [], array $verdicts = ['t1' => 'pass', 't2' => 'pass', 't3' => 'pass']): int
    {
        $gradingHash = DB::table('exercises')->where('id', $exerciseId)->value('grading_hash');
        $attemptId = DB::table('attempts')->insertGetId([
            'user_id' => $user->id, 'exercise_id' => $exerciseId, 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed', 'reason' => null,
            'grading_hash' => $gradingHash, 'code_sha256' => str_repeat('c', 64), 'custom_outcome' => null, 'output_truncated' => 0,
            'executor_phase' => 'run', 'exit_code' => 0, 'compile_ms' => 1, 'run_ms' => 1, 'attempted_at' => self::CLOCK, 'started_at' => self::CLOCK,
            'finished_at' => self::CLOCK, 'created_at' => self::CLOCK, ...$overrides,
        ]);
        $position = 0;
        foreach ($verdicts as $testKey => $outcome) {
            DB::table('attempt_tests')->insert(['attempt_id' => $attemptId, 'test_key' => $testKey, 'exercise_id' => $exerciseId, 'position' => ++$position, 'outcome' => $outcome]);
        }

        return $attemptId;
    }

    /** @param array<string, mixed> $columns */
    public static function exerciseProgress(User $user, string $exerciseId, array $columns = []): void
    {
        self::insert('exercise_progress', $user, ['exercise_id' => $exerciseId, ...$columns]);
    }
}
