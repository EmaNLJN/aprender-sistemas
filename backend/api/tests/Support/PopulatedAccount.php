<?php

namespace Tests\Support;

use App\Models\User;
use App\Progress\AccountLock;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PopulatedAccount
{
    private const EXERCISE_ID = 'rust-01';

    private const PROGRESS_AT = '2026-10-06 10:00:00.000';

    /** @param array<string, mixed> $state */
    public static function create(array $state = []): User
    {
        $user = RunWorld::user($state);
        $at = Instant::format(Instant::now());

        RunWorld::run($user, ['exercise_id' => self::EXERCISE_ID]);
        app(AccountLock::class)->within($user->id, fn () => null);
        self::insertSession($user);
        self::insertProgress($user, $at);
        self::insertAttempt($user, $at);
        self::insertSyncedProgress($user);
        self::insertInvitation($user, $at);
        DB::table('password_reset_tokens')->insert(['email' => $user->email, 'token' => Str::random(40), 'created_at' => $at]);

        return $user;
    }

    private static function insertSession(User $user): void
    {
        DB::table('sessions')->insert(['id' => Str::random(40), 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
    }

    private static function insertProgress(User $user, string $at): void
    {
        DB::table('exercise_progress')->insert(['user_id' => $user->id, 'exercise_id' => self::EXERCISE_ID, 'created_at' => $at, 'updated_at' => $at]);
    }

    private static function insertAttempt(User $user, string $at): void
    {
        $attemptId = DB::table('attempts')->insertGetId([
            'user_id' => $user->id, 'exercise_id' => self::EXERCISE_ID, 'epoch' => 1, 'outcome' => 'passed', 'grading_hash' => str_repeat('a', 64),
            'code_sha256' => str_repeat('b', 64), 'attempted_at' => $at, 'finished_at' => $at, 'created_at' => $at,
        ]);
        DB::table('attempt_tests')->insert(['attempt_id' => $attemptId, 'test_key' => 't1', 'exercise_id' => self::EXERCISE_ID, 'position' => 1, 'outcome' => 'pass']);
        DB::table('attempt_payloads')->insert(['attempt_id' => $attemptId, 'code' => 'fn main() {}', 'stdout' => '', 'stderr' => '', 'created_at' => $at]);
    }

    private static function insertSyncedProgress(User $user): void
    {
        self::seedProgressContent();
        $stamps = ['created_at' => self::PROGRESS_AT, 'updated_at' => self::PROGRESS_AT];
        $rows = [
            'drafts' => ['exercise_id' => self::EXERCISE_ID, 'code' => 'let x = 1;', 'starter_hash' => str_repeat('c', 64), 'set_at' => self::PROGRESS_AT],
            'campaign_checkpoints' => ['world_id' => 'fx-world-1', 'passed' => 1, 'passed_at' => self::PROGRESS_AT, 'last_answer' => 2, 'last_answer_set_at' => self::PROGRESS_AT],
            'workshop_progress' => [
                'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'code_sealed' => 1, 'prediction_correct' => 1, 'prediction_correct_at' => self::PROGRESS_AT,
                'answer' => 1, 'answer_set_at' => self::PROGRESS_AT, 'note' => 'Borrow first', 'note_set_at' => self::PROGRESS_AT,
            ],
            'workshop_observations' => ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'objective_key' => 'fx-obj-1', 'observed_at' => self::PROGRESS_AT],
            'workshop_step_marks' => ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 1, 'set_at' => self::PROGRESS_AT],
            'route_marks' => ['kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, 'set_at' => self::PROGRESS_AT],
            'route_quiz_answers' => ['step_id' => 'fx-step-1', 'answer' => 1, 'set_at' => self::PROGRESS_AT],
            'route_notes' => ['language' => 'rust', 'field' => 'learned', 'body' => 'Ownership moves', 'set_at' => self::PROGRESS_AT],
            'preferences' => [
                'route_language' => 'rust', 'route_language_set_at' => self::PROGRESS_AT, 'focus_minutes' => 25, 'focus_minutes_set_at' => self::PROGRESS_AT,
                'lab_selected_rust' => self::EXERCISE_ID, 'lab_selected_rust_set_at' => self::PROGRESS_AT,
            ],
        ];
        foreach ($rows as $table => $columns) {
            $rowStamps = $table === 'workshop_observations' ? ['created_at' => self::PROGRESS_AT] : $stamps;
            DB::table($table)->insert(['user_id' => $user->id, 'revision' => 0, ...$rowStamps, ...$columns]);
        }
        DB::table('sync_operations')->insert([
            'user_id' => $user->id, 'operation_id' => random_bytes(16), 'payload_sha256' => random_bytes(32), 'status' => 'applied',
            'reason' => null, 'clock_offset_ms' => 0, 'received_at' => self::PROGRESS_AT,
        ]);
    }

    private static function seedProgressContent(): void
    {
        if (DB::table('worlds')->where('id', 'fx-world-1')->exists()) {
            return;
        }
        ProgressWorld::seed([
            'contentVersion' => '0123456789abcdef0123456789abcdef',
            'exercises' => [],
            'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
            'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1'], 'steps' => ['e1']]],
            'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => []],
        ]);
    }

    private static function insertInvitation(User $user, string $at): void
    {
        DB::table('invitations')->insert([
            'email' => "invited-by-{$user->id}@example.test", 'role' => 'student', 'delivery' => 'link', 'token_hash' => hash('sha256', Str::random(40)),
            'invited_by' => $user->id, 'expires_at' => Instant::format(Instant::now()->addDays(7)), 'created_at' => $at, 'updated_at' => $at,
        ]);
    }
}
