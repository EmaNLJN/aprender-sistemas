<?php

use App\Accounts\Export\AttemptsSection;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunWorld;

function plantSectionAttempt(User $user, string $outcome = 'passed'): int
{
    return DB::table('attempts')->insertGetId([
        'user_id' => $user->id, 'exercise_id' => 'rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => $outcome,
        'grading_hash' => str_repeat('a', 64), 'code_sha256' => str_repeat('b', 64), 'output_truncated' => 0,
        'attempted_at' => '2026-10-06 12:00:00.000', 'finished_at' => '2026-10-06 12:00:01.000', 'created_at' => '2026-10-06 12:00:01.000',
    ]);
}

beforeEach(function () {
    RunWorld::exercise('rust-01');
    $this->user = User::factory()->create();
});

it('has the attempts key', function () {
    expect(app(AttemptsSection::class)->key())->toBe('attempts');
});

it('puts the tests of an attempt under tests without the attempt id', function () {
    $attemptId = plantSectionAttempt($this->user);
    DB::table('attempt_tests')->insert([
        ['attempt_id' => $attemptId, 'test_key' => 't1', 'exercise_id' => 'rust-01', 'position' => 1, 'outcome' => 'pass'],
        ['attempt_id' => $attemptId, 'test_key' => 't2', 'exercise_id' => 'rust-01', 'position' => 2, 'outcome' => 'fail'],
    ]);

    $attempts = iterator_to_array(app(AttemptsSection::class)->read($this->user->id), false);

    expect($attempts)->toHaveCount(1)
        ->and($attempts[0]['tests'])->toBe([
            ['testKey' => 't1', 'exerciseId' => 'rust-01', 'position' => 1, 'outcome' => 'pass'],
            ['testKey' => 't2', 'exerciseId' => 'rust-01', 'position' => 2, 'outcome' => 'fail'],
        ]);
});

it('delivers every attempt once and in id order across chunks', function () {
    config(['taller.export.chunk' => 2]);
    $ids = [];
    foreach (range(1, 5) as $ignored) {
        $ids[] = plantSectionAttempt($this->user);
    }
    plantSectionAttempt(User::factory()->create());

    $delivered = array_column(iterator_to_array(app(AttemptsSection::class)->read($this->user->id), false), 'id');

    expect($delivered)->toBe($ids);
});
