<?php

use App\Progress\Import\LegacyAttempts;
use App\Progress\Import\Legacy\LegacyResult;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\RunInvariants;

const LEGACY_ATTEMPTS_NOW = '2026-10-06T12:00:00.123Z';
const LEGACY_ATTEMPTS_TIME = '2026-10-04T08:00:00.500Z';

function legacyAttemptsResult(array $overrides = []): LegacyResult
{
    $fields = [
        'code' => 'fn main() {}', 'success' => true, 'transportError' => false, 'stdout' => 'salida', 'stderr' => 'error',
        'tests' => [['testKey' => 't1', 'passed' => true], ['testKey' => 't2', 'passed' => false], ['testKey' => 't3', 'passed' => true]],
        'time' => CarbonImmutable::parse(LEGACY_ATTEMPTS_TIME), 'customTest' => 'assert!(true)', 'customPassed' => true, 'attemptId' => null,
        ...$overrides,
    ];

    return new LegacyResult(
        $fields['code'], $fields['success'], $fields['transportError'], $fields['stdout'], $fields['stderr'],
        $fields['tests'], $fields['time'], $fields['customTest'], $fields['customPassed'], $fields['attemptId'],
    );
}

function legacyAttemptsRecord(int $userId, LegacyResult $result, string $exerciseId = 'fx-rust-01', int $epoch = 1)
{
    return (new LegacyAttempts)->record($userId, $epoch, $exerciseId, $result, CarbonImmutable::parse(LEGACY_ATTEMPTS_NOW));
}

function legacyAttemptsSeed(int $userId, array $columns = []): int
{
    $code = $columns['code'] ?? 'fn main() {}';
    unset($columns['code']);
    $legacy = ($columns['legacy'] ?? 0) === 1;

    return DB::table('attempts')->insertGetId([
        'user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed',
        'grading_hash' => $legacy ? null : str_repeat('a', 64), 'code_sha256' => hash('sha256', $code),
        'attempted_at' => '2026-10-04 08:00:00.500', 'finished_at' => '2026-10-04 08:00:00.500', 'created_at' => '2026-10-04 08:00:01.000',
        ...$columns,
    ]);
}

function legacyAttemptsCount(): int
{
    return DB::table('attempts')->count();
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->user = ProgressWorld::user();
    ProgressWorld::head($this->user, revision: 1);
});

it('inserts a legacy attempt with the columns of the result and a pointer to it', function () {
    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    $row = (array) DB::table('attempts')->where('id', $recorded->pointer->attemptId)->first();
    expect($recorded->inserted)->toBeTrue()
        ->and($recorded->pointer->passed)->toBeTrue()
        ->and($recorded->pointer->attemptedAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-04 08:00:00.500')
        ->and(legacyAttemptsCount())->toBe(1)
        ->and($row)->toMatchArray([
            'user_id' => $this->user->id, 'exercise_id' => 'fx-rust-01', 'epoch' => 1, 'legacy' => 1, 'outcome' => 'passed',
            'reason' => null, 'grading_hash' => null, 'code_sha256' => hash('sha256', 'fn main() {}'), 'custom_outcome' => 'pass',
            'output_truncated' => 0, 'executor_phase' => null, 'exit_code' => null, 'compile_ms' => null, 'run_ms' => null,
            'attempted_at' => '2026-10-04 08:00:00.500', 'started_at' => null, 'finished_at' => '2026-10-04 08:00:00.500',
            'counted' => 0, 'created_at' => '2026-10-06 12:00:00.123',
        ]);
});

it('stores the tests from position 1 and the payload with the date of the import', function () {
    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    $tests = DB::table('attempt_tests')->where('attempt_id', $recorded->pointer->attemptId)->orderBy('position')->get(['test_key', 'exercise_id', 'position', 'outcome']);
    $payload = (array) DB::table('attempt_payloads')->where('attempt_id', $recorded->pointer->attemptId)->first();
    expect($tests->map(fn ($test) => (array) $test)->all())->toBe([
        ['test_key' => 't1', 'exercise_id' => 'fx-rust-01', 'position' => 1, 'outcome' => 'pass'],
        ['test_key' => 't2', 'exercise_id' => 'fx-rust-01', 'position' => 2, 'outcome' => 'fail'],
        ['test_key' => 't3', 'exercise_id' => 'fx-rust-01', 'position' => 3, 'outcome' => 'pass'],
    ])->and($payload)->toBe([
        'attempt_id' => $recorded->pointer->attemptId, 'code' => 'fn main() {}', 'custom_test' => 'assert!(true)',
        'stdout' => 'salida', 'stderr' => 'error', 'created_at' => '2026-10-06 12:00:00.123',
    ]);
});

it('classifies the outcome and the custom test of the result', function (array $overrides, string $outcome, ?string $customOutcome) {
    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult($overrides));

    $row = DB::table('attempts')->where('id', $recorded->pointer->attemptId)->first();
    expect($row->outcome)->toBe($outcome)->and($row->custom_outcome)->toBe($customOutcome)->and($recorded->pointer->passed)->toBe($outcome === 'passed');
})->with([
    'passed' => [['success' => true], 'passed', 'pass'],
    'failed' => [['success' => false, 'customPassed' => false], 'failed', null],
    'transport error' => [['success' => false, 'transportError' => true, 'customPassed' => false], 'legacy_error', null],
]);

it('keeps an empty custom test as an empty string', function () {
    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult(['customTest' => '', 'customPassed' => false]));

    expect(DB::table('attempt_payloads')->where('attempt_id', $recorded->pointer->attemptId)->value('custom_test'))->toBe('');
});

it('reuses the attempt that the result names when it belongs to the account and the exercise', function () {
    $existing = legacyAttemptsSeed($this->user->id, ['outcome' => 'failed', 'attempted_at' => '2026-10-03 07:00:00.000', 'finished_at' => '2026-10-03 07:00:00.000']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult(['attemptId' => $existing, 'code' => 'otro código']));

    expect($recorded->inserted)->toBeFalse()
        ->and($recorded->pointer->attemptId)->toBe($existing)
        ->and($recorded->pointer->passed)->toBeFalse()
        ->and($recorded->pointer->attemptedAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-03 07:00:00.000')
        ->and(legacyAttemptsCount())->toBe(1);
});

it('ignores the attempt that the result names when it belongs to another account', function () {
    $stranger = ProgressWorld::user();
    $foreign = legacyAttemptsSeed($stranger->id, ['code' => 'otro código']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult(['attemptId' => $foreign]));

    expect($recorded->inserted)->toBeTrue()->and($recorded->pointer->attemptId)->not->toBe($foreign)->and(legacyAttemptsCount())->toBe(2);
});

it('ignores the attempt that the result names when it belongs to another exercise', function () {
    $other = legacyAttemptsSeed($this->user->id, ['exercise_id' => 'fx-rust-02', 'code' => 'otro código']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult(['attemptId' => $other]));

    expect($recorded->inserted)->toBeTrue()->and($recorded->pointer->attemptId)->not->toBe($other);
});

it('reuses a server attempt with the same code ten minutes from the result and not a millisecond further', function (string $attemptedAt, bool $reused) {
    $existing = legacyAttemptsSeed($this->user->id, ['attempted_at' => $attemptedAt, 'finished_at' => $attemptedAt]);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect($recorded->inserted)->toBe(! $reused)
        ->and($recorded->pointer->attemptId === $existing)->toBe($reused)
        ->and(legacyAttemptsCount())->toBe($reused ? 1 : 2);
})->with([
    'ten minutes before' => ['2026-10-04 07:50:00.500', true],
    'ten minutes after' => ['2026-10-04 08:10:00.500', true],
    'ten minutes and a millisecond before' => ['2026-10-04 07:50:00.499', false],
    'ten minutes and a millisecond after' => ['2026-10-04 08:10:00.501', false],
]);

it('does not reuse a server attempt with another code', function () {
    legacyAttemptsSeed($this->user->id, ['code' => 'otro código']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect($recorded->inserted)->toBeTrue();
});

it('reuses the server attempt closest to the time of the result', function () {
    legacyAttemptsSeed($this->user->id, ['attempted_at' => '2026-10-04 08:05:00.500', 'finished_at' => '2026-10-04 08:05:00.500']);
    $closest = legacyAttemptsSeed($this->user->id, ['attempted_at' => '2026-10-04 07:58:00.500', 'finished_at' => '2026-10-04 07:58:00.500']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect($recorded->pointer->attemptId)->toBe($closest);
});

it('reuses the attempt with the lowest id when two are equally close', function () {
    $first = legacyAttemptsSeed($this->user->id, ['attempted_at' => '2026-10-04 08:02:00.500', 'finished_at' => '2026-10-04 08:02:00.500']);
    legacyAttemptsSeed($this->user->id, ['attempted_at' => '2026-10-04 07:58:00.500', 'finished_at' => '2026-10-04 07:58:00.500']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect($recorded->pointer->attemptId)->toBe($first);
});

it('reuses a legacy attempt with the same date and code, whatever the epoch', function () {
    $existing = legacyAttemptsSeed($this->user->id, ['legacy' => 1, 'epoch' => 1, 'outcome' => 'legacy_error']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult(), epoch: 2);

    expect($recorded->inserted)->toBeFalse()
        ->and($recorded->pointer->attemptId)->toBe($existing)
        ->and($recorded->pointer->passed)->toBeFalse()
        ->and(legacyAttemptsCount())->toBe(1);
});

it('does not reuse a legacy attempt with another date', function () {
    legacyAttemptsSeed($this->user->id, ['legacy' => 1, 'attempted_at' => '2026-10-04 08:00:00.501', 'finished_at' => '2026-10-04 08:00:00.501']);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect($recorded->inserted)->toBeTrue();
});

it('does not reuse the attempt of another account', function () {
    $stranger = ProgressWorld::user();
    legacyAttemptsSeed($stranger->id);
    legacyAttemptsSeed($stranger->id, ['legacy' => 1]);

    $recorded = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect($recorded->inserted)->toBeTrue();
});

it('inserts the same result once when it is recorded twice', function () {
    $first = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());
    $second = legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect($second->inserted)->toBeFalse()->and($second->pointer->attemptId)->toBe($first->pointer->attemptId)->and(legacyAttemptsCount())->toBe(1);
});

it('does not change attempt_count and leaves the run invariants clean', function () {
    legacyAttemptsSeed($this->user->id, ['code' => 'otro código', 'attempted_at' => '2026-10-01 08:00:00.000', 'finished_at' => '2026-10-01 08:00:00.000']);
    DB::table('exercise_progress')->insert([
        'user_id' => $this->user->id, 'exercise_id' => 'fx-rust-01', 'attempt_count' => 1, 'revision' => 1,
        'created_at' => '2026-10-01 08:00:00.000', 'updated_at' => '2026-10-01 08:00:00.000',
    ]);

    legacyAttemptsRecord($this->user->id, legacyAttemptsResult());

    expect(DB::table('exercise_progress')->where('user_id', $this->user->id)->value('attempt_count'))->toBe(1);
    RunInvariants::assertClean();
});
