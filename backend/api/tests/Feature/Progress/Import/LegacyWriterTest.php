<?php

use App\Progress\AccountLock;
use App\Progress\Import\DatabaseLegacyWriter;
use App\Progress\Import\Legacy\LegacyCheckpoint;
use App\Progress\Import\Legacy\LegacyExercise;
use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\Legacy\LegacyResult;
use App\Progress\Import\Legacy\LegacyRoute;
use App\Progress\Import\Legacy\LegacySeal;
use App\Progress\Import\Legacy\LegacyWorkshop;
use App\Progress\Import\LegacyAttempts;
use App\Progress\Import\WrittenRows;
use App\Progress\ProgressTables;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\RunInvariants;

const LEGACY_WRITER_NOW = '2026-10-06T12:00:00.123Z';
const LEGACY_WRITER_HEAD_REVISION = 5;

function legacyWriterExercise(array $overrides = []): LegacyExercise
{
    return new LegacyExercise(...[
        'exerciseId' => 'fx-rust-01', 'predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false,
        'prediction' => null, 'hints' => null, 'draft' => null, 'reflection' => null, 'customTest' => null, 'attempts' => null,
        'solvedAt' => null, 'reviewAt' => null, 'reviewedAt' => null, 'confidence' => null, 'result' => null,
        ...$overrides,
    ]);
}

function legacyWriterResult(array $overrides = []): LegacyResult
{
    return new LegacyResult(...[
        'code' => 'fn main() {}', 'success' => true, 'transportError' => false, 'stdout' => 'salida', 'stderr' => '',
        'tests' => [['testKey' => 't1', 'passed' => true], ['testKey' => 't2', 'passed' => true], ['testKey' => 't3', 'passed' => false]],
        'time' => CarbonImmutable::parse('2026-10-04T08:00:00.500Z'), 'customTest' => '', 'customPassed' => false, 'attemptId' => null,
        ...$overrides,
    ]);
}

function legacyWriterWorkshop(array $overrides = []): LegacyWorkshop
{
    return new LegacyWorkshop(...[
        'workshopId' => 'fx-workshop-1', 'language' => 'go', 'codeSealed' => false, 'predicted' => false,
        'answer' => null, 'observed' => [], 'steps' => [], 'note' => '',
        ...$overrides,
    ]);
}

function legacyWriterRoute(array $overrides = []): LegacyRoute
{
    return new LegacyRoute(...[
        'language' => 'go', 'minutes' => 25, 'completed' => [], 'milestones' => [], 'favorites' => [], 'quizAnswers' => [],
        'notes' => ['rust' => ['learned' => '', 'next' => ''], 'go' => ['learned' => '', 'next' => '']],
        ...$overrides,
    ]);
}

function legacyWriterProgress(array $overrides = []): LegacyProgress
{
    return new LegacyProgress(...[
        'route' => null, 'exercises' => [], 'selected' => null, 'seals' => [], 'checkpoints' => [], 'workshops' => [],
        'omitted' => [], 'replaced' => [],
        ...$overrides,
    ]);
}

function legacyWriterEverything(): LegacyProgress
{
    return legacyWriterProgress([
        'route' => legacyWriterRoute([
            'completed' => ['fx-step-1'], 'milestones' => ['rust-memory', 'go-memory'], 'favorites' => ['fx-res-1'], 'quizAnswers' => ['fx-step-1' => 2],
            'notes' => ['rust' => ['learned' => 'Aprendí', 'next' => ''], 'go' => ['learned' => '', 'next' => 'Sigo']],
        ]),
        'selected' => ['rust' => 'fx-rust-02', 'go' => null],
        'exercises' => [
            legacyWriterExercise([
                'predictionCorrect' => true, 'assisted' => true, 'solutionSeen' => true, 'prediction' => 1, 'hints' => 2, 'draft' => 'borrador',
                'reflection' => 'idea', 'customTest' => 'assert!(true)', 'attempts' => 4, 'solvedAt' => CarbonImmutable::parse('2026-10-04T09:00:00.250Z'),
                'reviewAt' => CarbonImmutable::parse('2026-10-20T09:00:00.000Z'), 'reviewedAt' => CarbonImmutable::parse('2026-10-05T09:00:00.000Z'),
                'confidence' => 'practice', 'result' => legacyWriterResult(),
            ]),
            legacyWriterExercise(['exerciseId' => 'fx-rust-02']),
            legacyWriterExercise(['exerciseId' => 'fx-go-01', 'reviewAt' => CarbonImmutable::parse('2026-10-21T09:00:00.000Z')]),
        ],
        'seals' => [new LegacySeal('fx-rust-01', true, false, true), new LegacySeal('fx-go-02', false, false, false)],
        'checkpoints' => [new LegacyCheckpoint('fx-world-1', true, 2)],
        'workshops' => [
            legacyWriterWorkshop([
                'codeSealed' => true, 'predicted' => true, 'answer' => 1, 'observed' => ['fx-obj-2', 'fx-obj-1'], 'steps' => ['e3', 'e1'], 'note' => 'nota',
            ]),
            legacyWriterWorkshop(['language' => 'rust']),
        ],
    ]);
}

function legacyWriterWrite(int $userId, LegacyProgress $progress, string $now = LEGACY_WRITER_NOW): WrittenRows
{
    $lock = new AccountLock;
    $head = $lock->peek($userId);
    $at = CarbonImmutable::parse($now);
    $rows = (new DatabaseLegacyWriter(new LegacyAttempts))->write($userId, $head->epoch, $progress, $head->revision + 1, $at);
    if ($rows->changed()) {
        $lock->advance($head, $at);
    }

    return $rows;
}

function legacyWriterCounts(array $overrides = []): array
{
    return [...array_fill_keys(WrittenRows::AREAS, 0), ...$overrides];
}

function legacyWriterRow(string $table, int $userId, array $key = []): array
{
    return (array) DB::table($table)->where('user_id', $userId)->where($key)->first();
}

function legacyWriterStateSnapshot(int $userId): array
{
    $snapshot = [];
    foreach (ProgressTables::STATE as $table) {
        $snapshot[$table] = DB::table($table)->where('user_id', $userId)->get()->map(fn ($row) => (array) $row)->all();
    }

    return $snapshot;
}

function legacyWriterAssertInvariants(int $userId): void
{
    ProgressInvariants::assertClean($userId);
    RunInvariants::assertClean();
    expect(RunInvariants::crossedPointers())->toHaveCount(0);
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->user = ProgressWorld::user();
    ProgressWorld::head($this->user, revision: LEGACY_WRITER_HEAD_REVISION);
});

it('writes a new account with the values of the v1, null clocks and the next revision', function () {
    $rows = legacyWriterWrite($this->user->id, legacyWriterEverything());

    $stamp = ['revision' => 6, 'created_at' => '2026-10-06 12:00:00.123', 'updated_at' => '2026-10-06 12:00:00.123'];
    $attempt = DB::table('attempts')->where('user_id', $this->user->id)->first();
    expect(legacyWriterRow('preferences', $this->user->id))->toMatchArray([
        'route_language' => 'go', 'route_language_set_at' => null, 'focus_minutes' => 25, 'focus_minutes_set_at' => null,
        'lab_selected_rust' => 'fx-rust-02', 'lab_selected_rust_set_at' => null, 'lab_selected_go' => null, 'lab_selected_go_set_at' => null, ...$stamp,
    ])
        ->and(legacyWriterRow('exercise_progress', $this->user->id, ['exercise_id' => 'fx-rust-01']))->toMatchArray([
            'solved_at' => '2026-10-04 09:00:00.250', 'server_solved_at' => null, 'legacy_attempts' => 4, 'attempt_count' => 0,
            'proof_attempt_id' => $attempt->id, 'proof_at' => '2026-10-04 08:00:00.500', 'last_attempt_id' => $attempt->id, 'last_attempt_at' => '2026-10-04 08:00:00.500',
            'prediction_answer' => 1, 'prediction_answer_set_at' => null, 'prediction_correct' => 1, 'prediction_correct_at' => null,
            'assisted' => 1, 'solution_seen' => 1, 'hints_revealed' => 2, 'reflection' => 'idea', 'reflection_set_at' => null,
            'custom_test' => 'assert!(true)', 'custom_test_set_at' => null,
            'confidence' => 'practice', 'reviewed_at' => '2026-10-05 09:00:00.000', 'review_due_at' => '2026-10-20 09:00:00.000', 'review_set_at' => null, ...$stamp,
        ])
        ->and(legacyWriterRow('drafts', $this->user->id, ['exercise_id' => 'fx-rust-01']))->toMatchArray(['code' => 'borrador', 'starter_hash' => null, 'set_at' => null, ...$stamp])
        ->and(legacyWriterRow('campaign_seals', $this->user->id, ['exercise_id' => 'fx-rust-01']))
        ->toMatchArray(['code' => 1, 'prediction' => 0, 'assisted' => 1, 'imported_at' => '2026-10-06 12:00:00.123', 'revision' => 6])
        ->and(legacyWriterRow('campaign_checkpoints', $this->user->id, ['world_id' => 'fx-world-1']))
        ->toMatchArray(['passed' => 1, 'passed_at' => null, 'last_answer' => 2, 'last_answer_set_at' => null, ...$stamp])
        ->and(legacyWriterRow('workshop_progress', $this->user->id, ['workshop_id' => 'fx-workshop-1', 'language' => 'go']))->toMatchArray([
            'code_sealed' => 1, 'prediction_correct' => 1, 'prediction_correct_at' => null, 'answer' => 1, 'answer_set_at' => null, 'note' => 'nota', 'note_set_at' => null, ...$stamp,
        ])
        ->and(legacyWriterRow('route_quiz_answers', $this->user->id, ['step_id' => 'fx-step-1']))->toMatchArray(['answer' => 2, 'set_at' => null, ...$stamp])
        ->and(legacyWriterRow('route_notes', $this->user->id, ['language' => 'rust', 'field' => 'learned']))->toMatchArray(['body' => 'Aprendí', 'set_at' => null, ...$stamp])
        ->and(legacyWriterRow('route_notes', $this->user->id, ['language' => 'go', 'field' => 'next']))->toMatchArray(['body' => 'Sigo', 'set_at' => null, ...$stamp])
        ->and($rows->counts)->toBe(legacyWriterCounts([
            'exercises' => 3, 'drafts' => 1, 'attempts' => 1, 'campaignSeals' => 2, 'campaignCheckpoints' => 1, 'workshops' => 2,
            'workshopObjectives' => 2, 'workshopSteps' => 2, 'routeMarks' => 4, 'routeQuiz' => 1, 'routeNotes' => 2, 'preferences' => 1,
        ]))
        ->and($rows->changed())->toBeTrue();
    legacyWriterAssertInvariants($this->user->id);
});

it('writes the marks, the observations and the steps with the index of the v1', function () {
    legacyWriterWrite($this->user->id, legacyWriterEverything());

    expect(DB::table('route_marks')->where('user_id', $this->user->id)->orderBy('kind')->orderBy('item_key')->get(['kind', 'item_key', 'marked', 'set_at', 'legacy_position', 'revision'])
        ->map(fn ($row) => (array) $row)->all())->toBe([
            ['kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, 'set_at' => null, 'legacy_position' => 0, 'revision' => 6],
            ['kind' => 'milestone', 'item_key' => 'go-memory', 'marked' => 1, 'set_at' => null, 'legacy_position' => 1, 'revision' => 6],
            ['kind' => 'milestone', 'item_key' => 'rust-memory', 'marked' => 1, 'set_at' => null, 'legacy_position' => 0, 'revision' => 6],
            ['kind' => 'favorite', 'item_key' => 'fx-res-1', 'marked' => 1, 'set_at' => null, 'legacy_position' => 0, 'revision' => 6],
        ])
        ->and(DB::table('workshop_observations')->where('user_id', $this->user->id)->orderBy('objective_key')->get(['objective_key', 'observed_at', 'legacy_position', 'revision'])
            ->map(fn ($row) => (array) $row)->all())->toBe([
                ['objective_key' => 'fx-obj-1', 'observed_at' => null, 'legacy_position' => 1, 'revision' => 6],
                ['objective_key' => 'fx-obj-2', 'observed_at' => null, 'legacy_position' => 0, 'revision' => 6],
            ])
        ->and(DB::table('workshop_step_marks')->where('user_id', $this->user->id)->orderBy('step_key')->get(['step_key', 'marked', 'set_at', 'legacy_position', 'revision'])
            ->map(fn ($row) => (array) $row)->all())->toBe([
                ['step_key' => 'e1', 'marked' => 1, 'set_at' => null, 'legacy_position' => 1, 'revision' => 6],
                ['step_key' => 'e3', 'marked' => 1, 'set_at' => null, 'legacy_position' => 0, 'revision' => 6],
            ]);
});

it('creates the row of an empty record of each area', function () {
    $rows = legacyWriterWrite($this->user->id, legacyWriterProgress([
        'exercises' => [legacyWriterExercise()],
        'seals' => [new LegacySeal('fx-rust-01', false, false, false)],
        'checkpoints' => [new LegacyCheckpoint('fx-world-1', false, null)],
        'workshops' => [legacyWriterWorkshop()],
    ]));

    expect(legacyWriterRow('exercise_progress', $this->user->id, ['exercise_id' => 'fx-rust-01']))->toMatchArray([
        'solved_at' => null, 'legacy_attempts' => null, 'proof_attempt_id' => null, 'last_attempt_id' => null, 'prediction_answer' => null,
        'prediction_correct' => 0, 'assisted' => 0, 'solution_seen' => 0, 'hints_revealed' => null, 'revision' => 6,
    ])
        ->and(legacyWriterRow('campaign_seals', $this->user->id))->toMatchArray(['code' => 0, 'prediction' => 0, 'assisted' => 0, 'revision' => 6])
        ->and(legacyWriterRow('campaign_checkpoints', $this->user->id))->toMatchArray(['passed' => 0, 'passed_at' => null, 'last_answer' => null, 'revision' => 6])
        ->and(legacyWriterRow('workshop_progress', $this->user->id))->toMatchArray(['code_sealed' => 0, 'prediction_correct' => 0, 'answer' => null, 'note' => null, 'revision' => 6])
        ->and($rows->counts)->toBe(legacyWriterCounts(['exercises' => 1, 'campaignSeals' => 1, 'campaignCheckpoints' => 1, 'workshops' => 1]));
    legacyWriterAssertInvariants($this->user->id);
});

it('does not write the empty notes of the route nor of a workshop', function () {
    $rows = legacyWriterWrite($this->user->id, legacyWriterProgress([
        'route' => legacyWriterRoute(['notes' => ['rust' => ['learned' => '', 'next' => ' '], 'go' => ['learned' => '', 'next' => '']]]),
        'workshops' => [legacyWriterWorkshop(['note' => ''])],
    ]));

    expect(DB::table('route_notes')->where('user_id', $this->user->id)->pluck('body', 'field')->all())->toBe(['next' => ' '])
        ->and(legacyWriterRow('workshop_progress', $this->user->id)['note'])->toBeNull()
        ->and($rows->counts['routeNotes'])->toBe(1);
});

it('keeps an incomplete review group as it came', function () {
    legacyWriterWrite($this->user->id, legacyWriterProgress([
        'exercises' => [legacyWriterExercise(['reviewAt' => CarbonImmutable::parse('2026-10-21T09:00:00.000Z')])],
    ]));

    expect(legacyWriterRow('exercise_progress', $this->user->id))->toMatchArray([
        'confidence' => null, 'reviewed_at' => null, 'review_due_at' => '2026-10-21 09:00:00.000', 'review_set_at' => null,
    ]);
    legacyWriterAssertInvariants($this->user->id);
});

it('writes nothing and keeps every revision when the same progress is written again', function () {
    legacyWriterWrite($this->user->id, legacyWriterEverything());
    $before = legacyWriterStateSnapshot($this->user->id);
    $attempts = DB::table('attempts')->count();

    $rows = legacyWriterWrite($this->user->id, legacyWriterEverything(), '2026-10-06T13:00:00.000Z');

    expect($rows->counts)->toBe(legacyWriterCounts())
        ->and($rows->changed())->toBeFalse()
        ->and(legacyWriterStateSnapshot($this->user->id))->toBe($before)
        ->and(DB::table('attempts')->count())->toBe($attempts)
        ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision'))->toBe(6);
    legacyWriterAssertInvariants($this->user->id);
});

it('leaves the data of v2 as it is and combines the rest', function () {
    $server = DB::table('attempts')->insertGetId([
        'user_id' => $this->user->id, 'exercise_id' => 'fx-rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => 'failed', 'grading_hash' => str_repeat('b', 64),
        'code_sha256' => hash('sha256', 'otro'), 'attempted_at' => '2026-10-05 10:00:00.000', 'finished_at' => '2026-10-05 10:00:00.000', 'created_at' => '2026-10-05 10:00:01.000',
    ]);
    $proof = DB::table('attempts')->insertGetId([
        'user_id' => $this->user->id, 'exercise_id' => 'fx-rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed', 'grading_hash' => str_repeat('b', 64),
        'code_sha256' => hash('sha256', 'prueba'), 'attempted_at' => '2026-10-05 09:30:00.000', 'finished_at' => '2026-10-05 09:30:00.000', 'created_at' => '2026-10-05 09:30:01.000',
    ]);
    DB::table('exercise_progress')->insert([
        'user_id' => $this->user->id, 'exercise_id' => 'fx-rust-01', 'solved_at' => '2026-10-05 12:00:00.000', 'server_solved_at' => '2026-10-05 12:30:00.000',
        'proof_attempt_id' => $proof, 'proof_at' => '2026-10-05 09:30:00.000', 'last_attempt_id' => $server, 'last_attempt_at' => '2026-10-05 10:00:00.000', 'attempt_count' => 2,
        'prediction_answer' => 2, 'prediction_answer_set_at' => '2026-10-05 11:00:00.000', 'hints_revealed' => 3, 'legacy_attempts' => 9,
        'reflection' => 'de v2', 'reflection_set_at' => '2026-10-05 11:00:00.000', 'assisted' => 0, 'revision' => 4,
        'created_at' => '2026-10-05 09:00:00.000', 'updated_at' => '2026-10-05 09:00:00.000',
    ]);
    DB::table('route_marks')->insert([
        ['user_id' => $this->user->id, 'kind' => 'milestone', 'item_key' => 'rust-memory', 'marked' => 0, 'set_at' => '2026-10-05 11:00:00.000', 'legacy_position' => null, 'revision' => 4, 'created_at' => '2026-10-05 09:00:00.000', 'updated_at' => '2026-10-05 09:00:00.000'],
        ['user_id' => $this->user->id, 'kind' => 'milestone', 'item_key' => 'go-memory', 'marked' => 1, 'set_at' => '2026-10-05 11:00:00.000', 'legacy_position' => null, 'revision' => 4, 'created_at' => '2026-10-05 09:00:00.000', 'updated_at' => '2026-10-05 09:00:00.000'],
    ]);
    DB::table('preferences')->insert([
        'user_id' => $this->user->id, 'route_language' => 'rust', 'route_language_set_at' => '2026-10-05 11:00:00.000', 'revision' => 4,
        'created_at' => '2026-10-05 09:00:00.000', 'updated_at' => '2026-10-05 09:00:00.000',
    ]);

    $rows = legacyWriterWrite($this->user->id, legacyWriterEverything());

    $exercise = legacyWriterRow('exercise_progress', $this->user->id, ['exercise_id' => 'fx-rust-01']);
    expect($exercise)->toMatchArray([
        'solved_at' => '2026-10-04 09:00:00.250', 'server_solved_at' => '2026-10-05 12:30:00.000', 'legacy_attempts' => 9, 'attempt_count' => 2,
        'prediction_answer' => 2, 'prediction_answer_set_at' => '2026-10-05 11:00:00.000', 'hints_revealed' => 3, 'reflection' => 'de v2',
        'assisted' => 1, 'solution_seen' => 1, 'prediction_correct' => 1, 'proof_attempt_id' => $proof, 'proof_at' => '2026-10-05 09:30:00.000', 'last_attempt_id' => $server,
        'last_attempt_at' => '2026-10-05 10:00:00.000', 'revision' => 6,
    ])
        ->and(legacyWriterRow('preferences', $this->user->id))->toMatchArray(['route_language' => 'rust', 'route_language_set_at' => '2026-10-05 11:00:00.000', 'focus_minutes' => 25])
        ->and(legacyWriterRow('route_marks', $this->user->id, ['item_key' => 'rust-memory']))->toMatchArray(['marked' => 0, 'legacy_position' => null, 'set_at' => '2026-10-05 11:00:00.000', 'revision' => 4])
        ->and(legacyWriterRow('route_marks', $this->user->id, ['item_key' => 'go-memory']))->toMatchArray(['marked' => 1, 'legacy_position' => 1, 'set_at' => '2026-10-05 11:00:00.000', 'revision' => 6])
        ->and($rows->counts['routeMarks'])->toBe(3)
        ->and(DB::table('attempts')->where('user_id', $this->user->id)->where('legacy', 1)->count())->toBe(1);
    legacyWriterAssertInvariants($this->user->id);
});

it('lets the second import win in the fields with a clock and keeps the first legacy position', function () {
    $first = legacyWriterProgress([
        'route' => legacyWriterRoute(['minutes' => 25, 'favorites' => ['fx-res-1', 'fx-res-2'], 'notes' => ['rust' => ['learned' => 'uno', 'next' => ''], 'go' => ['learned' => '', 'next' => '']]]),
        'exercises' => [legacyWriterExercise(['reflection' => 'uno', 'hints' => 1])],
        'workshops' => [legacyWriterWorkshop(['observed' => ['fx-obj-1', 'fx-obj-2']])],
    ]);
    $second = legacyWriterProgress([
        'route' => legacyWriterRoute(['minutes' => 45, 'favorites' => ['fx-res-2', 'fx-res-1'], 'notes' => ['rust' => ['learned' => 'dos', 'next' => ''], 'go' => ['learned' => '', 'next' => '']]]),
        'exercises' => [legacyWriterExercise(['reflection' => 'dos', 'hints' => 2])],
        'workshops' => [legacyWriterWorkshop(['observed' => ['fx-obj-2', 'fx-obj-1']])],
    ]);

    legacyWriterWrite($this->user->id, $first);
    $rows = legacyWriterWrite($this->user->id, $second, '2026-10-06T13:00:00.000Z');

    expect(legacyWriterRow('preferences', $this->user->id)['focus_minutes'])->toBe(45)
        ->and(legacyWriterRow('route_notes', $this->user->id, ['language' => 'rust', 'field' => 'learned'])['body'])->toBe('dos')
        ->and(legacyWriterRow('exercise_progress', $this->user->id))->toMatchArray(['reflection' => 'dos', 'hints_revealed' => 2, 'revision' => 7])
        ->and(DB::table('route_marks')->where('user_id', $this->user->id)->orderBy('item_key')->pluck('legacy_position', 'item_key')->all())->toBe(['fx-res-1' => 0, 'fx-res-2' => 1])
        ->and(DB::table('workshop_observations')->where('user_id', $this->user->id)->orderBy('objective_key')->pluck('legacy_position', 'objective_key')->all())->toBe(['fx-obj-1' => 0, 'fx-obj-2' => 1])
        ->and($rows->counts)->toBe(legacyWriterCounts(['exercises' => 1, 'routeNotes' => 1, 'preferences' => 1]));
    legacyWriterAssertInvariants($this->user->id);
});

it('does not name server_solved_at nor attempt_count in any statement', function () {
    DB::table('exercise_progress')->insert([
        'user_id' => $this->user->id, 'exercise_id' => 'fx-rust-01', 'server_solved_at' => '2026-10-05 12:30:00.000', 'attempt_count' => 0, 'revision' => 4,
        'created_at' => '2026-10-05 09:00:00.000', 'updated_at' => '2026-10-05 09:00:00.000',
    ]);
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        $statements[] = $query->sql;
    });

    legacyWriterWrite($this->user->id, legacyWriterEverything());

    $writes = array_filter($statements, fn (string $sql) => str_starts_with($sql, 'INSERT INTO `exercise_progress`') || str_starts_with($sql, 'insert into `exercise_progress`'));
    expect($writes)->not->toBeEmpty();
    foreach ($statements as $sql) {
        expect($sql)->not->toContain('server_solved_at')->and($sql)->not->toContain('attempt_count');
    }
    expect(legacyWriterRow('exercise_progress', $this->user->id, ['exercise_id' => 'fx-rust-01']))->toMatchArray(['server_solved_at' => '2026-10-05 12:30:00.000', 'attempt_count' => 0]);
});

it('does not write the progress of another account', function () {
    $other = ProgressWorld::user();
    ProgressWorld::head($other, revision: 2);

    legacyWriterWrite($this->user->id, legacyWriterEverything());

    foreach (ProgressTables::STATE as $table) {
        expect(DB::table($table)->where('user_id', $other->id)->count())->toBe(0);
    }
});
