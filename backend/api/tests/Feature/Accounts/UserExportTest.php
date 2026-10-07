<?php

use App\Accounts\Export\UserExport;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Support\PopulatedAccount;
use Tests\Support\RunWorld;

function exportedDocument(int $userId): array
{
    $document = app(UserExport::class)->document($userId);
    $document['attempts'] = iterator_to_array($document['attempts'], false);

    return $document;
}

function plantExportAttempt(User $user, array $overrides = [], ?array $payload = ['code' => 'fn main() {}']): int
{
    $attemptId = DB::table('attempts')->insertGetId([
        'user_id' => $user->id, 'exercise_id' => 'rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed',
        'grading_hash' => str_repeat('a', 64), 'code_sha256' => str_repeat('b', 64), 'output_truncated' => 0,
        'attempted_at' => '2026-10-06 12:00:00.000', 'finished_at' => '2026-10-06 12:00:01.000', 'created_at' => '2026-10-06 12:00:01.000',
        ...$overrides,
    ]);
    if ($payload !== null) {
        DB::table('attempt_payloads')->insert(['attempt_id' => $attemptId, 'stdout' => '', 'stderr' => '', 'created_at' => '2026-10-06 12:00:01.000', ...$payload]);
    }

    return $attemptId;
}

function plantExportProgress(User $user, string $exerciseId): void
{
    DB::table('exercise_progress')->insert([
        'user_id' => $user->id, 'exercise_id' => $exerciseId, 'attempt_count' => 2, 'solved_at' => '2026-10-06 12:00:00.123',
        'created_at' => '2026-10-06 12:00:01.000', 'updated_at' => '2026-10-06 12:00:01.000',
    ]);
}

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 15:30:00.123');
    RunWorld::exercise('rust-01');
    RunWorld::exercise('rust-02');
    $this->ana = User::factory()->create(['email' => 'ana@example.com', 'name' => 'Ana']);
    $this->beto = User::factory()->create(['email' => 'beto-secret@example.com']);
    plantExportProgress($this->ana, 'rust-01');
    plantExportProgress($this->ana, 'rust-02');
    plantExportProgress($this->beto, 'rust-01');
    $this->anaAttempts = [
        plantExportAttempt($this->ana, [], null),
        plantExportAttempt($this->ana),
        plantExportAttempt($this->ana),
    ];
    $this->betoAttempts = [plantExportAttempt($this->beto), plantExportAttempt($this->beto)];
    DB::table('attempt_tests')->insert(['attempt_id' => $this->anaAttempts[1], 'test_key' => 't1', 'exercise_id' => 'rust-01', 'position' => 1, 'outcome' => 'pass']);
});

it('builds the document with the keys in order and the versioned format', function () {
    $document = exportedDocument($this->ana->id);

    expect(array_keys($document))->toBe(['format', 'exportedAt', 'account', 'progress', 'attempts'])
        ->and($document['format'])->toBe('taller-export-2')
        ->and($document['exportedAt'])->toBe('2026-10-12T15:30:00.123Z');
});

it('exports exactly the account fields and none of the secrets', function () {
    $account = exportedDocument($this->ana->id)['account'];

    expect(array_keys($account))->toBe(['id', 'name', 'email', 'role', 'emailVerifiedAt', 'privacyVersion', 'privacyAcceptedAt', 'createdAt', 'updatedAt'])
        ->and($account['id'])->toBe($this->ana->id)
        ->and($account['email'])->toBe('ana@example.com')
        ->and($account['role'])->toBe('student')
        ->and($account['createdAt'])->toBe('2026-10-12T15:30:00.123Z');
});

it('exports the exercise rows of the account in the progress snapshot without the user id', function () {
    $exercises = exportedDocument($this->ana->id)['progress']['exercises'];

    expect($exercises)->toHaveCount(2)
        ->and(array_column($exercises, 'exerciseId'))->toBe(['rust-01', 'rust-02'])
        ->and($exercises[0]['solvedAt'])->toBe('2026-10-06T12:00:00.123Z')
        ->and($exercises[0])->not->toHaveKey('userId');
});

it('exports the snapshot areas of a populated account and nothing else', function () {
    $at = '2026-10-06T10:00:00.000Z';
    $progress = exportedDocument(PopulatedAccount::create()->id)['progress'];

    expect(array_keys($progress))->toBe(['exercises', 'drafts', 'campaign', 'workshops', 'route', 'preferences'])
        ->and($progress['drafts'])->toBe([['exerciseId' => 'rust-01', 'code' => 'let x = 1;', 'starterHash' => str_repeat('c', 64), 'at' => $at, 'revision' => 0]])
        ->and($progress['campaign'])->toBe(['seals' => [], 'checkpoints' => [[
            'worldId' => 'fx-world-1', 'passed' => true, 'passedAt' => $at, 'lastAnswer' => ['value' => 2, 'at' => $at], 'revision' => 0,
        ]]])
        ->and($progress['workshops']['progress'][0]['note'])->toBe(['text' => 'Borrow first', 'at' => $at])
        ->and($progress['workshops']['objectives'])->toBe([['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'objectiveKey' => 'fx-obj-1', 'observedAt' => $at, 'revision' => 0]])
        ->and($progress['workshops']['steps'])->toBe([['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'stepKey' => 'e1', 'marked' => true, 'at' => $at, 'revision' => 0]])
        ->and($progress['route']['marks'])->toBe([['kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => true, 'at' => $at, 'revision' => 0]])
        ->and($progress['route']['quiz'])->toBe([['stepId' => 'fx-step-1', 'answer' => 1, 'at' => $at, 'revision' => 0]])
        ->and($progress['route']['notes'])->toBe([['language' => 'rust', 'field' => 'learned', 'body' => 'Ownership moves', 'at' => $at, 'revision' => 0]])
        ->and($progress['preferences']['focusMinutes'])->toBe(['value' => 25, 'at' => $at])
        ->and($progress['preferences']['labSelected']['rust'])->toBe(['value' => 'rust-01', 'at' => $at])
        ->and($progress)->not->toHaveKey('full')
        ->and(json_encode($progress, JSON_THROW_ON_ERROR))->not->toContain('userId');
});

it('exports the attempts of the account with tests and payload, null when the payload is not kept', function () {
    $attempts = exportedDocument($this->ana->id)['attempts'];

    expect(array_column($attempts, 'id'))->toBe($this->anaAttempts)
        ->and($attempts[0]['payload'])->toBeNull()
        ->and($attempts[1]['payload']['code'])->toBe('fn main() {}')
        ->and($attempts[1]['tests'])->toBe([['testKey' => 't1', 'exerciseId' => 'rust-01', 'position' => 1, 'outcome' => 'pass']])
        ->and($attempts[0]['tests'])->toBe([])
        ->and($attempts[1]['attemptedAt'])->toBe('2026-10-06T12:00:00.000Z')
        ->and($attempts[1])->not->toHaveKey('userId');
});

it('leaves out everything that belongs to another account or is secret', function () {
    $text = json_encode(exportedDocument($this->ana->id), JSON_THROW_ON_ERROR);

    expect($text)->not->toContain('beto-secret@example.com')
        ->and($text)->not->toContain('password')
        ->and($text)->not->toContain('rememberToken')
        ->and($text)->not->toContain('userId');
    foreach ($this->betoAttempts as $attemptId) {
        expect(array_column(exportedDocument($this->ana->id)['attempts'], 'id'))->not->toContain($attemptId);
    }
});

it('lists the section keys that exist', function () {
    expect(app(UserExport::class)->sectionKeys())->toBe(['account', 'progress', 'attempts']);
});
