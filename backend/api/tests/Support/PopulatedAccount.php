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

    private static function insertInvitation(User $user, string $at): void
    {
        DB::table('invitations')->insert([
            'email' => "invited-by-{$user->id}@example.test", 'role' => 'student', 'delivery' => 'link', 'token_hash' => hash('sha256', Str::random(40)),
            'invited_by' => $user->id, 'expires_at' => Instant::format(Instant::now()->addDays(7)), 'created_at' => $at, 'updated_at' => $at,
        ]);
    }
}
