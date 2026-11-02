<?php

namespace Tests\Support;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class StatsWorld
{
    public const NOW = '2026-10-20 15:00:00';

    public const CANARIES = [
        'reflexión privada de Ana', 'prueba privada de Ana', 'borrador privado de Ana', 'nota privada de Ana',
        'código privado de Ana', 'salida privada de Ana', 'crudo privado de Beto',
    ];

    private const STAMP = '2026-10-01 00:00:00.000';

    private const PASS = ['t1' => 'pass', 't2' => 'pass', 't3' => 'pass'];

    /** @return array{admin: int, ana: int, beto: int, caro: int, dani: int, eva: int, fede: int} */
    public static function create(): array
    {
        self::content();
        $ids = self::accounts();
        self::heads($ids);
        $attempts = self::attempts($ids);
        self::progress($ids, $attempts);
        self::campaignAndWorkshops($ids);
        self::route($ids);
        self::imports($ids);
        self::invitations($ids);
        self::runs($ids);
        DB::table('drafts')->insert([
            'user_id' => $ids['ana'], 'exercise_id' => 'rust-01', 'code' => 'borrador privado de Ana', 'starter_hash' => str_repeat('c', 64),
            'set_at' => self::STAMP, 'revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);

        return $ids;
    }

    private static function content(): void
    {
        $at = '2026-08-01 00:00:00.000';
        RunWorld::exercise('rust-01', 'rust');
        RunWorld::exercise('rust-02', 'rust');
        RunWorld::exercise('go-01', 'go');
        DB::table('catalogs')->insert([
            ['code' => 'quests', 'slice_by' => 'language', 'chain_position' => null, 'status' => 'active', 'created_at' => $at, 'updated_at' => $at],
            ['code' => 'essentials', 'slice_by' => 'language', 'chain_position' => 1, 'status' => 'active', 'created_at' => $at, 'updated_at' => $at],
        ]);
        RunWorld::exercise('q-rust-01', 'rust');
        RunWorld::exercise('ess-rust-01', 'rust');
        DB::table('exercises')->where('id', 'q-rust-01')->update(['catalog' => 'quests', 'level' => 'beginner']);
        DB::table('exercises')->where('id', 'ess-rust-01')->update(['catalog' => 'essentials']);
        DB::table('exercises')->where('id', 'rust-02')->update(['status' => 'deprecated', 'retired_at' => $at, 'position' => null]);
        ProgressWorld::seed([
            'contentVersion' => '0123456789abcdef0123456789abcdef',
            'exercises' => [],
            'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
            'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1'], 'steps' => ['e1', 'e2']]],
            'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => []],
        ]);
        DB::table('world_exercises')->insert([
            'world_id' => 'fx-world-1', 'exercise_id' => 'rust-01', 'role' => 'training', 'position' => 1, 'status' => 'active', 'created_at' => $at, 'updated_at' => $at,
        ]);
    }

    /** @return array{admin: int, ana: int, beto: int, caro: int, dani: int, eva: int, fede: int} */
    private static function accounts(): array
    {
        $at = fn (string $instant) => CarbonImmutable::parse($instant, 'UTC');

        return [
            'admin' => User::factory()->admin()->create(['name' => 'Ada Admin', 'email' => 'ada@stats.test', 'created_at' => $at('2026-08-01 12:00:00'), 'updated_at' => $at('2026-08-01 12:00:00')])->id,
            'ana' => User::factory()->create(['name' => 'Ana Pérez', 'email' => 'ana@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'beto' => User::factory()->create(['name' => 'Beto Ruiz', 'email' => 'beto@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'caro' => User::factory()->disabled()->create(['name' => 'Caro Díaz', 'email' => 'caro@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'dani' => User::factory()->create(['name' => 'Dani Sosa', 'email' => 'dani@stats.test', 'created_at' => $at('2026-10-08 12:00:00'), 'updated_at' => $at('2026-10-08 12:00:00')])->id,
            'eva' => User::factory()->deleting()->create(['name' => 'Eva Luna', 'email' => 'eva@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'fede' => User::factory()->create(['name' => 'Fede Gómez', 'email' => 'fede@stats.test', 'created_at' => $at('2026-10-03 12:00:00'), 'updated_at' => $at('2026-10-03 12:00:00')])->id,
        ];
    }

    /** @param array<string, int> $ids */
    private static function heads(array $ids): void
    {
        $head = fn (int $userId, string $lastActivity, int $epoch = 1, ?string $resetAt = null) => [
            'user_id' => $userId, 'epoch' => $epoch, 'revision' => 5, 'reset_at' => $resetAt, 'last_activity_at' => $lastActivity,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ];
        DB::table('progress_heads')->insert([
            $head($ids['admin'], '2026-10-07 12:00:00.000'),
            $head($ids['ana'], '2026-10-20 10:00:00.000'),
            $head($ids['beto'], '2026-10-15 12:00:00.000'),
            $head($ids['caro'], '2026-09-01 12:00:00.000'),
            $head($ids['eva'], '2026-10-19 12:00:00.000'),
            $head($ids['fede'], '2026-10-09 12:00:00.000', 2, '2026-10-09 12:00:00.000'),
        ]);
    }

    /**
     * @param  array<string, int>  $ids
     * @return array<string, int>
     */
    private static function attempts(array $ids): array
    {
        self::attempt($ids['ana'], 'rust-01', 'failed', '2026-10-05 12:00:00.000', ['t1' => 'pass', 't2' => 'fail', 't3' => 'missing']);
        $anaPassed = self::attempt($ids['ana'], 'rust-01', 'passed', '2026-10-05 13:00:00.000', self::PASS);
        $anaCompile = self::attempt($ids['ana'], 'go-01', 'compile_error', '2026-10-06 02:30:00.000');
        self::attempt($ids['beto'], 'rust-01', 'passed', '2026-10-02 10:00:00.000', [], legacy: true);
        self::attempt($ids['beto'], 'go-01', 'infra_error', '2026-10-10 12:00:00.000');
        self::attempt($ids['beto'], 'go-01', 'canceled', '2026-10-11 12:00:00.000');
        $betoQuest = self::attempt($ids['beto'], 'q-rust-01', 'passed', '2026-10-12 14:00:00.000', self::PASS);
        $caroPassed = self::attempt($ids['caro'], 'rust-01', 'passed', '2026-10-03 15:00:00.000', self::PASS);
        self::attempt($ids['fede'], 'rust-01', 'passed', '2026-10-04 12:00:00.000', self::PASS);
        $evaFailed = self::attempt($ids['eva'], 'rust-01', 'failed', '2026-10-07 12:00:00.000', ['t1' => 'fail', 't2' => 'fail', 't3' => 'fail']);
        $adaPassed = self::attempt($ids['admin'], 'rust-01', 'passed', '2026-10-07 12:00:00.000', self::PASS);

        return ['anaPassed' => $anaPassed, 'anaCompile' => $anaCompile, 'betoQuest' => $betoQuest, 'caroPassed' => $caroPassed, 'evaFailed' => $evaFailed, 'adaPassed' => $adaPassed];
    }

    /** @param array<string, string> $tests */
    private static function attempt(int $userId, string $exerciseId, string $outcome, string $at, array $tests = [], bool $legacy = false): int
    {
        $id = DB::table('attempts')->insertGetId([
            'user_id' => $userId, 'exercise_id' => $exerciseId, 'epoch' => 1, 'legacy' => $legacy ? 1 : 0, 'outcome' => $outcome,
            'grading_hash' => str_repeat('a', 64), 'code_sha256' => hash('sha256', "{$userId}|{$exerciseId}|{$at}"),
            'attempted_at' => $at, 'started_at' => $legacy ? null : $at, 'finished_at' => $at, 'created_at' => $at,
        ]);
        $position = 0;
        foreach ($tests as $key => $verdict) {
            DB::table('attempt_tests')->insert(['attempt_id' => $id, 'test_key' => $key, 'exercise_id' => $exerciseId, 'position' => ++$position, 'outcome' => $verdict]);
        }

        return $id;
    }

    /**
     * @param  array<string, int>  $ids
     * @param  array<string, int>  $attempts
     */
    private static function progress(array $ids, array $attempts): void
    {
        $row = fn (int $userId, string $exerciseId, array $columns) => [
            'user_id' => $userId, 'exercise_id' => $exerciseId, 'revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP, ...$columns,
        ];
        $solved = fn (string $at, int $attemptId) => ['solved_at' => $at, 'server_solved_at' => $at, 'proof_attempt_id' => $attemptId, 'proof_at' => $at, 'last_attempt_id' => $attemptId, 'last_attempt_at' => $at];
        foreach ([
            $row($ids['ana'], 'rust-01', [...$solved('2026-10-05 13:00:00.000', $attempts['anaPassed']), 'attempt_count' => 2, 'assisted' => 1, 'solution_seen' => 0,
                'hints_revealed' => 1, 'prediction_answer' => 2, 'prediction_answer_set_at' => self::STAMP, 'prediction_correct' => 1, 'prediction_correct_at' => self::STAMP,
                'confidence' => 'confident', 'reviewed_at' => '2026-10-05 13:00:00.000', 'review_due_at' => '2026-10-25 13:00:00.000', 'review_set_at' => self::STAMP,
                'reflection' => 'reflexión privada de Ana', 'reflection_set_at' => self::STAMP, 'custom_test' => 'prueba privada de Ana', 'custom_test_set_at' => self::STAMP]),
            $row($ids['ana'], 'go-01', ['attempt_count' => 1, 'last_attempt_id' => $attempts['anaCompile'], 'last_attempt_at' => '2026-10-06 02:30:00.000']),
            $row($ids['beto'], 'rust-01', ['solved_at' => '2026-10-02 10:00:00.000', 'attempt_count' => 0, 'legacy_attempts' => 1, 'hints_revealed' => 0,
                'prediction_answer' => 0, 'prediction_answer_set_at' => self::STAMP, 'prediction_correct' => 0, 'confidence' => 'again', 'review_set_at' => self::STAMP]),
            $row($ids['beto'], 'q-rust-01', [...$solved('2026-10-12 14:00:00.000', $attempts['betoQuest']), 'attempt_count' => 1]),
            $row($ids['caro'], 'rust-01', [...$solved('2026-10-03 15:00:00.000', $attempts['caroPassed']), 'attempt_count' => 1]),
            $row($ids['eva'], 'rust-01', ['attempt_count' => 1, 'last_attempt_id' => $attempts['evaFailed'], 'last_attempt_at' => '2026-10-07 12:00:00.000']),
            $row($ids['admin'], 'rust-01', [...$solved('2026-10-07 12:00:00.000', $attempts['adaPassed']), 'attempt_count' => 1]),
        ] as $progress) {
            DB::table('exercise_progress')->insert($progress);
        }
    }

    /** @param array<string, int> $ids */
    private static function campaignAndWorkshops(array $ids): void
    {
        $stamps = ['revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP];
        DB::table('campaign_checkpoints')->insert([
            ['user_id' => $ids['ana'], 'world_id' => 'fx-world-1', 'passed' => 1, 'passed_at' => '2026-10-06 12:00:00.000', 'last_answer' => 2, 'last_answer_set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['beto'], 'world_id' => 'fx-world-1', 'passed' => 0, 'passed_at' => null, 'last_answer' => 1, 'last_answer_set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['eva'], 'world_id' => 'fx-world-1', 'passed' => 1, 'passed_at' => '2026-10-07 12:00:00.000', 'last_answer' => 2, 'last_answer_set_at' => self::STAMP, ...$stamps],
        ]);
        DB::table('campaign_seals')->insert([
            'user_id' => $ids['beto'], 'exercise_id' => 'rust-01', 'code' => 1, 'prediction' => 0, 'assisted' => 0, 'imported_at' => '2026-10-02 10:00:00.000', 'revision' => 1,
        ]);
        DB::table('workshop_progress')->insert([
            ['user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'code_sealed' => 1, 'prediction_correct' => 1, 'prediction_correct_at' => self::STAMP,
                'answer' => 1, 'answer_set_at' => self::STAMP, 'note' => 'nota privada de Ana', 'note_set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['caro'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'code_sealed' => 0, 'prediction_correct' => 0, 'prediction_correct_at' => null,
                'answer' => null, 'answer_set_at' => null, 'note' => null, 'note_set_at' => null, ...$stamps],
        ]);
        DB::table('workshop_step_marks')->insert([
            ['user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 1, 'set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e2', 'marked' => 0, 'set_at' => self::STAMP, ...$stamps],
        ]);
        DB::table('workshop_observations')->insert([
            'user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'objective_key' => 'fx-obj-1',
            'observed_at' => '2026-10-06 12:00:00.000', 'revision' => 1, 'created_at' => self::STAMP,
        ]);
    }

    /** @param array<string, int> $ids */
    private static function route(array $ids): void
    {
        $stamps = ['set_at' => self::STAMP, 'revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP];
        DB::table('route_marks')->insert([
            ['user_id' => $ids['ana'], 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, ...$stamps],
            ['user_id' => $ids['ana'], 'kind' => 'milestone', 'item_key' => 'm-01', 'marked' => 1, ...$stamps],
            ['user_id' => $ids['beto'], 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, ...$stamps],
            ['user_id' => $ids['beto'], 'kind' => 'favorite', 'item_key' => 'rust-01', 'marked' => 0, ...$stamps],
        ]);
        DB::table('route_quiz_answers')->insert([
            ['user_id' => $ids['ana'], 'step_id' => 'fx-step-1', 'answer' => 1, ...$stamps],
            ['user_id' => $ids['beto'], 'step_id' => 'fx-step-1', 'answer' => 0, ...$stamps],
        ]);
        DB::table('route_notes')->insert(['user_id' => $ids['ana'], 'language' => 'rust', 'field' => 'learned', 'body' => 'nota privada de Ana', ...$stamps]);
    }

    /** @param array<string, int> $ids */
    private static function imports(array $ids): void
    {
        DB::table('progress_imports')->insert([
            'user_id' => $ids['beto'], 'import_id' => '0b0d3c1e-5f6a-4b7c-8d9e-0a1b2c3d4e5f', 'source' => 'storage',
            'raw_payload' => '{"note":"crudo privado de Beto"}', 'raw_sha256' => hash('sha256', 'crudo de Beto'),
            'report' => '{"replaced":["crudo privado de Beto"]}', 'epoch' => 1, 'revision' => 1, 'imported_at' => '2026-10-02 10:00:00.000',
        ]);
    }

    /** @param array<string, int> $ids */
    private static function invitations(array $ids): void
    {
        $invitation = fn (string $email, string $role, string $createdAt, string $expiresAt) => [
            'email' => $email, 'role' => $role, 'delivery' => 'link', 'token_hash' => hash('sha256', $email), 'invited_by' => $ids['admin'],
            'expires_at' => $expiresAt, 'created_at' => $createdAt, 'updated_at' => $createdAt,
        ];
        DB::table('invitations')->insert([
            $invitation('pendiente@stats.test', 'student', '2026-10-18 12:00:00.000', '2026-10-25 12:00:00.000'),
            $invitation('vencida@stats.test', 'student', '2026-10-03 12:00:00.000', '2026-10-10 12:00:00.000'),
            $invitation('admin@stats.test', 'admin', '2026-10-19 12:00:00.000', '2026-10-21 12:00:00.000'),
        ]);
    }

    /** @param array<string, int> $ids */
    private static function runs(array $ids): void
    {
        $id = fn (int $n) => sprintf('019a0000-0000-7000-8000-%012d', $n);
        RunWorld::run(User::findOrFail($ids['ana']), [
            'id' => $id(1), 'exercise_id' => 'rust-01', 'status' => 'passed', 'code' => 'código privado de Ana', 'stdout' => 'salida privada de Ana', 'stderr' => '',
            'program' => null, 'executor_phase' => 'run', 'exit_code' => 0, 'truncated' => 0, 'compile_ms' => 300, 'run_ms' => 200,
            'created_at' => '2026-10-20 14:00:00.000', 'started_at' => '2026-10-20 14:00:01.500', 'finished_at' => '2026-10-20 14:00:02.000', 'expires_at' => null,
        ]);
        RunWorld::run(User::findOrFail($ids['beto']), [
            'id' => $id(2), 'exercise_id' => 'go-01', 'status' => 'infra_error', 'reason' => 'executor_busy', 'program' => null,
            'created_at' => '2026-10-19 16:00:00.000', 'finished_at' => '2026-10-19 16:10:00.000', 'expires_at' => null,
        ]);
        RunWorld::run(User::findOrFail($ids['caro']), ['id' => $id(3), 'exercise_id' => 'rust-01', 'status' => 'queued', 'created_at' => '2026-10-20 14:59:00.000']);
        RunWorld::run(User::findOrFail($ids['eva']), ['id' => $id(4), 'exercise_id' => 'rust-01', 'status' => 'queued', 'created_at' => '2026-10-20 14:58:00.000']);
    }
}
