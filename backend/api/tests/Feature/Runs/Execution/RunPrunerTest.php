<?php

use App\Runs\Execution\PruneReport;
use App\Runs\Execution\RunPruner;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\RunWorld;

const PRUNE_NOW = '2026-10-05 12:00:00.000';

beforeEach(function () {
    $this->travelTo(Instant::parse(PRUNE_NOW));
});

function pruneNow(): CarbonImmutable
{
    return Instant::parse(PRUNE_NOW);
}

function pruneRunAged(int $days, string $status = 'passed'): string
{
    $id = (string) Str::uuid7(time: pruneNow()->subDays($days));
    RunWorld::run(RunWorld::user(), ['id' => $id, 'status' => $status]);

    return $id;
}

/** @return list<string> */
function remainingRuns(): array
{
    return DB::table('runs')->orderBy('id')->pluck('id')->all();
}

/** @return array<string, mixed> */
function attemptRow(int $userId, string $exerciseId, int $daysOld, string $outcome = 'passed'): array
{
    $at = Instant::format(pruneNow()->subDays($daysOld));

    return [
        'user_id' => $userId, 'exercise_id' => $exerciseId, 'epoch' => 1, 'outcome' => $outcome, 'reason' => null,
        'grading_hash' => hash('sha256', $exerciseId), 'code_sha256' => hash('sha256', 'code'), 'custom_outcome' => null,
        'output_truncated' => 0, 'executor_phase' => 'run', 'exit_code' => 0, 'compile_ms' => 1, 'run_ms' => 1,
        'attempted_at' => $at, 'started_at' => $at, 'finished_at' => $at, 'created_at' => $at,
    ];
}

function insertAttempt(int $userId, string $exerciseId, int $daysOld, string $outcome = 'passed'): int
{
    return DB::table('attempts')->insertGetId(attemptRow($userId, $exerciseId, $daysOld, $outcome));
}

function insertPayload(int $attemptId, int $daysOld): void
{
    DB::table('attempt_payloads')->insert([
        'attempt_id' => $attemptId, 'code' => 'fn main() {}', 'custom_test' => null, 'stdout' => '', 'stderr' => '',
        'created_at' => Instant::format(pruneNow()->subDays($daysOld)),
    ]);
}

function pointProgressAt(int $userId, string $exerciseId, ?int $proofAttemptId, ?int $lastAttemptId): void
{
    $at = Instant::format(pruneNow());
    DB::table('exercise_progress')->insert([
        'user_id' => $userId, 'exercise_id' => $exerciseId, 'proof_attempt_id' => $proofAttemptId, 'last_attempt_id' => $lastAttemptId,
        'created_at' => $at, 'updated_at' => $at,
    ]);
}

/** @return list<int> */
function remainingPayloads(): array
{
    return DB::table('attempt_payloads')->orderBy('attempt_id')->pluck('attempt_id')->map(fn (mixed $id): int => (int) $id)->all();
}

it('deletes finished runs older than 14 days and keeps the newer ones', function () {
    $old = pruneRunAged(15);
    $recent = pruneRunAged(13);

    $report = app(RunPruner::class)->prune(pruneNow());

    expect(remainingRuns())->toBe([$recent])
        ->and($report)->toEqual(new PruneReport(1, 0))
        ->and(in_array($old, remainingRuns(), true))->toBeFalse();
});

it('never deletes a queued or running run, however old', function (string $status) {
    $stuck = pruneRunAged(40, $status);

    app(RunPruner::class)->prune(pruneNow());

    expect(remainingRuns())->toBe([$stuck]);
})->with(['queued', 'running']);

it('deletes the payloads older than 90 days and keeps the newer ones', function () {
    $user = RunWorld::user();
    RunWorld::exercise('rust-01');
    $old = insertAttempt($user->id, 'rust-01', 91);
    $recent = insertAttempt($user->id, 'rust-01', 89);
    insertPayload($old, 91);
    insertPayload($recent, 89);

    $report = app(RunPruner::class)->prune(pruneNow());

    expect(remainingPayloads())->toBe([$recent])
        ->and($report)->toEqual(new PruneReport(0, 1))
        ->and(DB::table('attempts')->count())->toBe(2);
});

it('keeps the payload of the last pass and of the last attempt of each exercise while the account exists', function () {
    $user = RunWorld::user();
    RunWorld::exercise('rust-01');
    $proof = insertAttempt($user->id, 'rust-01', 200);
    $last = insertAttempt($user->id, 'rust-01', 100, 'failed');
    $forgotten = insertAttempt($user->id, 'rust-01', 150, 'failed');
    foreach ([$proof, $last, $forgotten] as $attemptId) {
        insertPayload($attemptId, 200);
    }
    pointProgressAt($user->id, 'rust-01', $proof, $last);

    $report = app(RunPruner::class)->prune(pruneNow());

    expect(remainingPayloads())->toBe([$proof, $last])
        ->and($report->payloads)->toBe(1)
        ->and(DB::table('attempts')->count())->toBe(3);
});

it('deletes the old payload of an exercise that has no progress row', function () {
    $user = RunWorld::user();
    RunWorld::exercise('rust-01');
    insertPayload(insertAttempt($user->id, 'rust-01', 100), 100);

    app(RunPruner::class)->prune(pruneNow());

    expect(remainingPayloads())->toBe([]);
});

it('does not take the pointer of another account or another exercise as a protection', function () {
    $user = RunWorld::user();
    $other = RunWorld::user();
    RunWorld::exercise('rust-01');
    RunWorld::exercise('rust-02');
    $attempt = insertAttempt($user->id, 'rust-01', 100);
    insertPayload($attempt, 100);
    pointProgressAt($other->id, 'rust-01', $attempt, $attempt);
    pointProgressAt($user->id, 'rust-02', $attempt, $attempt);

    app(RunPruner::class)->prune(pruneNow());

    expect(remainingPayloads())->toBe([]);
});

it('follows the 90 day rule for the payloads of an earlier epoch once the progress rows are gone', function () {
    $user = RunWorld::user();
    RunWorld::exercise('rust-01');
    $proof = insertAttempt($user->id, 'rust-01', 100);
    insertPayload($proof, 100);
    pointProgressAt($user->id, 'rust-01', $proof, $proof);
    app(RunPruner::class)->prune(pruneNow());
    expect(remainingPayloads())->toBe([$proof]);

    DB::table('exercise_progress')->where('user_id', $user->id)->delete();
    app(RunPruner::class)->prune(pruneNow());

    expect(remainingPayloads())->toBe([]);
});

function bulkOldRuns(int $count): void
{
    $template = (array) DB::table('runs')->where('id', pruneRunAged(1))->first();
    $rows = [];
    for ($n = 0; $n < $count; $n++) {
        $rows[] = [...$template, 'id' => (string) Str::uuid7(time: pruneNow()->subDays(20)), 'client_run_id' => (string) Str::uuid()];
    }
    foreach (array_chunk($rows, 500) as $chunk) {
        DB::table('runs')->insert($chunk);
    }
}

function bulkOldPayloads(int $count): void
{
    $user = RunWorld::user();
    if (! DB::table('exercises')->where('id', 'rust-01')->exists()) {
        RunWorld::exercise('rust-01');
    }
    $rows = [];
    for ($n = 0; $n < $count; $n++) {
        $rows[] = attemptRow($user->id, 'rust-01', 100);
    }
    foreach (array_chunk($rows, 500) as $chunk) {
        DB::table('attempts')->insert($chunk);
    }
    foreach (array_chunk(DB::table('attempts')->pluck('id')->all(), 500) as $ids) {
        DB::table('attempt_payloads')->insert(array_map(fn (mixed $id): array => [
            'attempt_id' => $id, 'code' => 'c', 'custom_test' => null, 'stdout' => '', 'stderr' => '',
            'created_at' => Instant::format(pruneNow()->subDays(100)),
        ], $ids));
    }
}

/** @return list<string> */
function deleteStatementsOn(string $table, Closure $body): array
{
    $statements = [];
    DB::listen(function ($query) use (&$statements, $table) {
        if (str_starts_with($query->sql, "delete from `{$table}`")) {
            $statements[] = $query->sql;
        }
    });
    $body();

    return $statements;
}

it('deletes 2500 old runs in three batches of the primary key and leaves the recent one', function () {
    bulkOldRuns(2500);

    $deletes = deleteStatementsOn('runs', fn () => app(RunPruner::class)->prune(pruneNow()));

    expect($deletes)->toHaveCount(3)
        ->and(DB::table('runs')->count())->toBe(1);
});

it('stops after prune_max batches of runs and the next run goes on', function () {
    config(['runs.batches.prune_max' => 2]);
    bulkOldRuns(2500);

    $first = app(RunPruner::class)->prune(pruneNow());
    expect($first->runs)->toBe(2000)
        ->and(DB::table('runs')->count())->toBe(501);

    $second = app(RunPruner::class)->prune(pruneNow());
    expect($second->runs)->toBe(500)
        ->and(DB::table('runs')->count())->toBe(1);
});

it('deletes 2500 old payloads in three batches and keeps every attempt', function () {
    bulkOldPayloads(2500);

    $deletes = deleteStatementsOn('attempt_payloads', fn () => app(RunPruner::class)->prune(pruneNow()));

    expect($deletes)->toHaveCount(3)
        ->and(DB::table('attempt_payloads')->count())->toBe(0)
        ->and(DB::table('attempts')->count())->toBe(2500);
});

it('stops after prune_max batches of payloads and the next run goes on', function () {
    config(['runs.batches.prune_max' => 2]);
    bulkOldPayloads(2500);

    $first = app(RunPruner::class)->prune(pruneNow());
    expect($first->payloads)->toBe(2000)
        ->and(DB::table('attempt_payloads')->count())->toBe(500);

    $second = app(RunPruner::class)->prune(pruneNow());
    expect($second->payloads)->toBe(500)
        ->and(DB::table('attempt_payloads')->count())->toBe(0);
});

it('walks past the protected payloads without getting stuck and without deleting them', function () {
    config(['runs.batches.prune' => 2]);
    $user = RunWorld::user();
    RunWorld::exercise('rust-01');
    RunWorld::exercise('rust-02');
    RunWorld::exercise('rust-03');
    $protected = [];
    foreach (['rust-01', 'rust-02', 'rust-03'] as $exerciseId) {
        $attempt = insertAttempt($user->id, $exerciseId, 200);
        insertPayload($attempt, 200);
        pointProgressAt($user->id, $exerciseId, $attempt, $attempt);
        $protected[] = $attempt;
    }
    foreach (range(1, 5) as $n) {
        $attempt = insertAttempt($user->id, 'rust-01', 100 + $n);
        insertPayload($attempt, 100 + $n);
    }

    $report = app(RunPruner::class)->prune(pruneNow());

    expect($report->payloads)->toBe(5)
        ->and(remainingPayloads())->toBe($protected);
});

it('does nothing the second time in a row', function () {
    bulkOldRuns(10);
    bulkOldPayloads(10);
    app(RunPruner::class)->prune(pruneNow());

    $again = app(RunPruner::class)->prune(pruneNow());

    expect($again)->toEqual(new PruneReport(0, 0));
});
