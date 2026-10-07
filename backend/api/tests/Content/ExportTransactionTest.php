<?php

use App\Accounts\Export\AttemptsSection;
use App\Models\User;
use Illuminate\Database\Events\TransactionBeginning;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\Support\RunWorld;

function plantManyAttempts(User $user, int $count): void
{
    $rows = [];
    foreach (range(1, $count) as $ignored) {
        $rows[] = [
            'user_id' => $user->id, 'exercise_id' => 'rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed',
            'grading_hash' => str_repeat('a', 64), 'code_sha256' => str_repeat('b', 64), 'output_truncated' => 0,
            'attempted_at' => '2026-10-06 12:00:00.000', 'finished_at' => '2026-10-06 12:00:01.000', 'created_at' => '2026-10-06 12:00:01.000',
        ];
    }
    DB::table('attempts')->insert($rows);
}

beforeEach(function () {
    RunWorld::exercise('rust-01');
    $this->user = User::factory()->create();
    plantManyAttempts($this->user, 250);
    config(['taller.export.chunk' => 100]);
});

it('never holds a transaction open while it delivers an attempt', function () {
    $levels = [];
    foreach (app(AttemptsSection::class)->read($this->user->id) as $ignored) {
        $levels[] = DB::transactionLevel();
    }

    expect($levels)->toHaveCount(250)
        ->and(array_unique($levels))->toBe([0]);
});

it('reads 250 attempts in exactly three short transactions, paged by key', function () {
    $begun = 0;
    Event::listen(TransactionBeginning::class, function () use (&$begun) {
        $begun++;
    });
    $queries = [];
    DB::listen(function ($query) use (&$queries) {
        $queries[] = $query->sql;
    });

    iterator_to_array(app(AttemptsSection::class)->read($this->user->id), false);

    $attemptReads = array_values(array_filter($queries, fn (string $sql) => str_starts_with($sql, 'select * from `attempts`')));
    expect($begun)->toBe(3)
        ->and($attemptReads)->toHaveCount(3)
        ->and($attemptReads[0])->toContain('where `user_id` = ? and `id` > ? order by `id` asc limit 100');
});
