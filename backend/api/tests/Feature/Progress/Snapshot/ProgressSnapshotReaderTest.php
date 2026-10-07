<?php

use App\Progress\Snapshot\NotModified;
use App\Progress\Snapshot\ProgressSnapshotReader;
use App\Progress\Snapshot\Snapshot;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Progress\Snapshot\SnapshotWorld;
use Tests\Support\ProgressWorld;
use Tests\Support\RunWorld;

const SNAPSHOT_EARLIER = '2026-10-05 09:00:00.000';
const SNAPSHOT_EARLIER_ISO = '2026-10-05T09:00:00.000Z';
const SNAPSHOT_CLOCK = SnapshotWorld::CLOCK;
const SNAPSHOT_CLOCK_ISO = SnapshotWorld::CLOCK_ISO;

beforeEach(function () {
    SnapshotWorld::seedContent();
    $this->user = ProgressWorld::user();
    $this->reader = new ProgressSnapshotReader;
});

function readSnapshot(int $userId): Snapshot
{
    $snapshot = (new ProgressSnapshotReader)->read($userId, SnapshotWorld::CONTENT_VERSION, fn (string $etag) => false);
    assert($snapshot instanceof Snapshot);

    return $snapshot;
}

it('gives an account without a head the empty snapshot of epoch 1 and revision 0', function () {
    $snapshot = readSnapshot($this->user->id);

    expect($snapshot->userId)->toBe($this->user->id)
        ->and($snapshot->epoch)->toBe(1)
        ->and($snapshot->revision)->toBe(0)
        ->and($snapshot->resetAt)->toBeNull()
        ->and($snapshot->contentVersion)->toBe(SnapshotWorld::CONTENT_VERSION)
        ->and($snapshot->areas->toArray(true))->toBe([
            'full' => true, 'exercises' => [], 'drafts' => [], 'campaign' => ['seals' => [], 'checkpoints' => []],
            'workshops' => ['progress' => [], 'objectives' => [], 'steps' => []], 'route' => ['marks' => [], 'quiz' => [], 'notes' => []],
            'preferences' => null,
        ]);
});

it('carries the epoch, the revision and the reset of the head', function () {
    DB::table('progress_heads')->insert([
        'user_id' => $this->user->id, 'epoch' => 3, 'revision' => 42, 'reset_at' => '2026-10-04 08:30:00.250', 'created_at' => SNAPSHOT_CLOCK, 'updated_at' => SNAPSHOT_CLOCK,
    ]);

    $snapshot = readSnapshot($this->user->id);

    expect($snapshot->epoch)->toBe(3)
        ->and($snapshot->revision)->toBe(42)
        ->and($snapshot->resetAt?->format('Y-m-d\TH:i:s.v'))->toBe('2026-10-04T08:30:00.250');
});

it('writes the exercise row of the contract, with the clocks of the legacy data as null', function () {
    $proof = SnapshotWorld::attempt($this->user, 'fx-rust-01');
    $last = SnapshotWorld::attempt($this->user, 'fx-rust-01', ['outcome' => 'failed'], ['t1' => 'pass', 't2' => 'fail', 't3' => 'missing']);
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', [
        'solved_at' => '2026-10-06 08:00:00.000', 'server_solved_at' => '2026-10-06 08:00:01.000',
        'proof_attempt_id' => $proof, 'proof_at' => '2026-10-06 08:00:02.000', 'last_attempt_id' => $last, 'last_attempt_at' => '2026-10-06 09:00:00.000',
        'attempt_count' => 3, 'prediction_answer' => 1, 'prediction_answer_set_at' => SNAPSHOT_CLOCK, 'prediction_correct' => 1, 'prediction_correct_at' => null,
        'assisted' => 1, 'solution_seen' => 0, 'hints_revealed' => 2, 'reflection' => 'Aprendí a prestar', 'reflection_set_at' => SNAPSHOT_CLOCK,
        'custom_test' => null, 'confidence' => 'practice', 'reviewed_at' => '2026-10-06 00:00:00.000', 'review_due_at' => '2026-10-09 00:00:00.000',
        'review_set_at' => SNAPSHOT_CLOCK, 'revision' => 5,
    ]);

    $exercises = readSnapshot($this->user->id)->areas->exercises;

    expect($exercises)->toBe([[
        'exerciseId' => 'fx-rust-01', 'revision' => 5,
        'prediction' => ['answer' => 1, 'at' => SNAPSHOT_CLOCK_ISO],
        'predictionCorrect' => ['value' => true, 'at' => null],
        'assisted' => true, 'solutionSeen' => false, 'hintsRevealed' => 2,
        'reflection' => ['text' => 'Aprendí a prestar', 'at' => SNAPSHOT_CLOCK_ISO],
        'customTest' => null,
        'review' => ['confidence' => 'practice', 'reviewedAt' => '2026-10-06T00:00:00.000Z', 'reviewDueAt' => '2026-10-09T00:00:00.000Z', 'at' => SNAPSHOT_CLOCK_ISO],
        'solvedAt' => '2026-10-06T08:00:00.000Z', 'serverSolvedAt' => '2026-10-06T08:00:01.000Z',
        'proof' => ['attemptId' => $proof, 'at' => '2026-10-06T08:00:02.000Z', 'state' => 'current', 'tests' => [
            ['testKey' => 't1', 'outcome' => 'pass'], ['testKey' => 't2', 'outcome' => 'pass'], ['testKey' => 't3', 'outcome' => 'pass'],
        ]],
        'lastAttempt' => ['attemptId' => $last, 'at' => '2026-10-06T09:00:00.000Z', 'outcome' => 'failed', 'legacy' => false, 'tests' => [
            ['testKey' => 't1', 'outcome' => 'pass'], ['testKey' => 't2', 'outcome' => 'fail'], ['testKey' => 't3', 'outcome' => 'missing'],
        ]],
        'attemptCount' => 3, 'legacyAttempts' => null,
    ]]);
});

it('writes an exercise row that has only a custom test, with nothing else', function () {
    SnapshotWorld::exerciseProgress($this->user, 'fx-go-01', ['custom_test' => 'x == 1', 'custom_test_set_at' => null, 'legacy_attempts' => 4, 'revision' => 2]);

    expect(readSnapshot($this->user->id)->areas->exercises)->toBe([[
        'exerciseId' => 'fx-go-01', 'revision' => 2, 'prediction' => null, 'predictionCorrect' => ['value' => false, 'at' => null],
        'assisted' => false, 'solutionSeen' => false, 'hintsRevealed' => null, 'reflection' => null,
        'customTest' => ['text' => 'x == 1', 'at' => null], 'review' => null, 'solvedAt' => null, 'serverSolvedAt' => null,
        'proof' => null, 'lastAttempt' => null, 'attemptCount' => 0, 'legacyAttempts' => 4,
    ]]);
});

it('writes the drafts, with the tombstone of "restore the start" as code null', function () {
    SnapshotWorld::insert('drafts', $this->user, ['exercise_id' => 'fx-rust-01', 'code' => 'fn main() {}', 'starter_hash' => str_repeat('a', 64), 'set_at' => SNAPSHOT_CLOCK, 'revision' => 4]);
    SnapshotWorld::insert('drafts', $this->user, ['exercise_id' => 'fx-go-01', 'code' => null, 'starter_hash' => null, 'set_at' => SNAPSHOT_EARLIER, 'revision' => 6]);

    expect(readSnapshot($this->user->id)->areas->drafts)->toBe([
        ['exerciseId' => 'fx-go-01', 'code' => null, 'starterHash' => null, 'at' => SNAPSHOT_EARLIER_ISO, 'revision' => 6],
        ['exerciseId' => 'fx-rust-01', 'code' => 'fn main() {}', 'starterHash' => str_repeat('a', 64), 'at' => SNAPSHOT_CLOCK_ISO, 'revision' => 4],
    ]);
});

it('writes the checkpoints, and leaves the seals for D1b as an empty list', function () {
    SnapshotWorld::insert('campaign_checkpoints', $this->user, [
        'world_id' => 'fx-world-1', 'passed' => 1, 'passed_at' => SNAPSHOT_CLOCK, 'last_answer' => 2, 'last_answer_set_at' => SNAPSHOT_EARLIER, 'revision' => 3,
    ]);

    $areas = readSnapshot($this->user->id)->areas;

    expect($areas->campaignSeals)->toBe([])
        ->and($areas->campaignCheckpoints)->toBe([
            ['worldId' => 'fx-world-1', 'passed' => true, 'passedAt' => SNAPSHOT_CLOCK_ISO, 'lastAnswer' => ['value' => 2, 'at' => SNAPSHOT_EARLIER_ISO], 'revision' => 3],
        ]);
});

it('writes a checkpoint without an answer as null', function () {
    SnapshotWorld::insert('campaign_checkpoints', $this->user, ['world_id' => 'fx-world-1', 'revision' => 1]);

    expect(readSnapshot($this->user->id)->areas->campaignCheckpoints)->toBe([
        ['worldId' => 'fx-world-1', 'passed' => false, 'passedAt' => null, 'lastAnswer' => null, 'revision' => 1],
    ]);
});

it('writes the workshop progress, its observed objectives and its marked steps', function () {
    SnapshotWorld::insert('workshop_progress', $this->user, [
        'workshop_id' => 'fx-workshop-1', 'language' => 'go', 'code_sealed' => 1, 'prediction_correct' => 1, 'prediction_correct_at' => SNAPSHOT_CLOCK,
        'answer' => 1, 'answer_set_at' => SNAPSHOT_EARLIER, 'note' => 'Una nota', 'note_set_at' => SNAPSHOT_CLOCK, 'revision' => 8,
    ]);
    SnapshotWorld::insert('workshop_observations', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'objective_key' => 'fx-obj-1', 'observed_at' => null, 'revision' => 8]);
    SnapshotWorld::insert('workshop_observations', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'objective_key' => 'fx-obj-2', 'observed_at' => SNAPSHOT_CLOCK, 'revision' => 9]);
    SnapshotWorld::insert('workshop_step_marks', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'step_key' => 'e1', 'marked' => 1, 'set_at' => SNAPSHOT_CLOCK, 'revision' => 8]);
    SnapshotWorld::insert('workshop_step_marks', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'step_key' => 'e2', 'marked' => 0, 'set_at' => SNAPSHOT_EARLIER, 'revision' => 9]);

    $areas = readSnapshot($this->user->id)->areas;

    expect($areas->workshopProgress)->toBe([[
        'workshopId' => 'fx-workshop-1', 'language' => 'go', 'codeSealed' => true, 'predictionCorrect' => ['value' => true, 'at' => SNAPSHOT_CLOCK_ISO],
        'answer' => ['value' => 1, 'at' => SNAPSHOT_EARLIER_ISO], 'note' => ['text' => 'Una nota', 'at' => SNAPSHOT_CLOCK_ISO], 'revision' => 8,
    ]])
        ->and($areas->workshopObjectives)->toBe([
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'objectiveKey' => 'fx-obj-1', 'observedAt' => null, 'revision' => 8],
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'objectiveKey' => 'fx-obj-2', 'observedAt' => SNAPSHOT_CLOCK_ISO, 'revision' => 9],
        ])
        ->and($areas->workshopSteps)->toBe([
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'stepKey' => 'e1', 'marked' => true, 'at' => SNAPSHOT_CLOCK_ISO, 'revision' => 8],
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'stepKey' => 'e2', 'marked' => false, 'at' => SNAPSHOT_EARLIER_ISO, 'revision' => 9],
        ]);
});

it('writes a workshop progress row without answer or note as null', function () {
    SnapshotWorld::insert('workshop_progress', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'revision' => 2]);

    expect(readSnapshot($this->user->id)->areas->workshopProgress)->toBe([[
        'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'codeSealed' => false, 'predictionCorrect' => ['value' => false, 'at' => null],
        'answer' => null, 'note' => null, 'revision' => 2,
    ]]);
});

it('writes the route marks, the quiz answers and the notes', function () {
    SnapshotWorld::insert('route_marks', $this->user, ['kind' => 'milestone', 'item_key' => 'rust-memory', 'marked' => 1, 'set_at' => SNAPSHOT_CLOCK, 'revision' => 4]);
    SnapshotWorld::insert('route_marks', $this->user, ['kind' => 'favorite', 'item_key' => 'fx-res-1', 'marked' => 0, 'set_at' => null, 'revision' => 5]);
    SnapshotWorld::insert('route_quiz_answers', $this->user, ['step_id' => 'fx-step-1', 'answer' => 2, 'set_at' => SNAPSHOT_CLOCK, 'revision' => 4]);
    SnapshotWorld::insert('route_notes', $this->user, ['language' => 'go', 'field' => 'next', 'body' => '', 'set_at' => SNAPSHOT_CLOCK, 'revision' => 6]);

    $areas = readSnapshot($this->user->id)->areas;

    expect($areas->routeMarks)->toBe([
        ['kind' => 'milestone', 'itemKey' => 'rust-memory', 'marked' => true, 'at' => SNAPSHOT_CLOCK_ISO, 'revision' => 4],
        ['kind' => 'favorite', 'itemKey' => 'fx-res-1', 'marked' => false, 'at' => null, 'revision' => 5],
    ])
        ->and($areas->routeQuiz)->toBe([['stepId' => 'fx-step-1', 'answer' => 2, 'at' => SNAPSHOT_CLOCK_ISO, 'revision' => 4]])
        ->and($areas->routeNotes)->toBe([['language' => 'go', 'field' => 'next', 'body' => '', 'at' => SNAPSHOT_CLOCK_ISO, 'revision' => 6]]);
});

it('writes the preferences with one clock for each of them', function () {
    SnapshotWorld::insert('preferences', $this->user, [
        'route_language' => 'go', 'route_language_set_at' => SNAPSHOT_CLOCK, 'focus_minutes' => 45, 'focus_minutes_set_at' => null,
        'lab_selected_rust' => 'fx-rust-01', 'lab_selected_rust_set_at' => SNAPSHOT_EARLIER, 'revision' => 7,
    ]);

    expect(readSnapshot($this->user->id)->areas->preferences)->toBe([
        'routeLanguage' => ['value' => 'go', 'at' => SNAPSHOT_CLOCK_ISO],
        'focusMinutes' => ['value' => 45, 'at' => null],
        'labSelected' => ['rust' => ['value' => 'fx-rust-01', 'at' => SNAPSHOT_EARLIER_ISO], 'go' => null],
        'revision' => 7,
    ]);
});

it('writes a preferences row with nothing chosen as null in each of them', function () {
    SnapshotWorld::insert('preferences', $this->user, ['revision' => 1]);

    expect(readSnapshot($this->user->id)->areas->preferences)->toBe([
        'routeLanguage' => null, 'focusMinutes' => null, 'labSelected' => ['rust' => null, 'go' => null], 'revision' => 1,
    ]);
});

it('sorts every list by the natural key of its row', function () {
    foreach (['fx-rust-02', 'fx-go-01', 'fx-rust-01'] as $exerciseId) {
        SnapshotWorld::exerciseProgress($this->user, $exerciseId);
        SnapshotWorld::insert('drafts', $this->user, ['exercise_id' => $exerciseId, 'code' => 'x', 'set_at' => SNAPSHOT_CLOCK]);
    }
    foreach (['rust', 'go'] as $language) {
        SnapshotWorld::insert('workshop_progress', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => $language]);
        foreach (['e3', 'e1', 'e2'] as $stepKey) {
            SnapshotWorld::insert('workshop_step_marks', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => $language, 'step_key' => $stepKey, 'marked' => 1, 'set_at' => SNAPSHOT_CLOCK]);
        }
    }
    foreach ([['step', 'fx-step-1'], ['favorite', 'fx-res-1'], ['milestone', 'rust-memory'], ['milestone', 'go-memory']] as [$kind, $itemKey]) {
        SnapshotWorld::insert('route_marks', $this->user, ['kind' => $kind, 'item_key' => $itemKey, 'marked' => 1, 'set_at' => SNAPSHOT_CLOCK]);
    }
    foreach ([['go', 'next'], ['rust', 'learned'], ['rust', 'next'], ['go', 'learned']] as [$language, $field]) {
        SnapshotWorld::insert('route_notes', $this->user, ['language' => $language, 'field' => $field, 'body' => 'x', 'set_at' => SNAPSHOT_CLOCK]);
    }

    $areas = readSnapshot($this->user->id)->areas;

    expect(array_column($areas->exercises, 'exerciseId'))->toBe(['fx-go-01', 'fx-rust-01', 'fx-rust-02'])
        ->and(array_column($areas->drafts, 'exerciseId'))->toBe(['fx-go-01', 'fx-rust-01', 'fx-rust-02'])
        ->and(array_map(fn (array $row) => "{$row['language']}/{$row['stepKey']}", $areas->workshopSteps))
        ->toBe(['rust/e1', 'rust/e2', 'rust/e3', 'go/e1', 'go/e2', 'go/e3'])
        ->and(array_map(fn (array $row) => "{$row['kind']}/{$row['itemKey']}", $areas->routeMarks))
        ->toBe(['step/fx-step-1', 'milestone/go-memory', 'milestone/rust-memory', 'favorite/fx-res-1'])
        ->and(array_map(fn (array $row) => "{$row['language']}/{$row['field']}", $areas->routeNotes))
        ->toBe(['rust/learned', 'rust/next', 'go/learned', 'go/next']);
});

it('includes the progress on an exercise, a world and a workshop that were retired', function () {
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['attempt_count' => 1]);
    SnapshotWorld::insert('campaign_checkpoints', $this->user, ['world_id' => 'fx-world-1', 'passed' => 1, 'passed_at' => SNAPSHOT_CLOCK]);
    SnapshotWorld::insert('workshop_progress', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'rust']);
    foreach (['exercises' => 'fx-rust-01', 'worlds' => 'fx-world-1', 'workshops' => 'fx-workshop-1'] as $table => $id) {
        DB::table($table)->where('id', $id)->update(['status' => 'deprecated', 'position' => null, 'retired_at' => SNAPSHOT_CLOCK]);
    }

    $areas = readSnapshot($this->user->id)->areas;

    expect($areas->exercises)->toHaveCount(1)
        ->and($areas->campaignCheckpoints)->toHaveCount(1)
        ->and($areas->workshopProgress)->toHaveCount(1);
});

it('gives the full snapshot to areas with a null revision', function () {
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['revision' => 1]);
    SnapshotWorld::insert('route_notes', $this->user, ['language' => 'rust', 'field' => 'next', 'body' => 'x', 'set_at' => SNAPSHOT_CLOCK, 'revision' => 9]);

    $areas = $this->reader->areas($this->user->id, null);

    expect($areas->exercises)->toHaveCount(1)
        ->and($areas->routeNotes)->toHaveCount(1);
});

it('does not mix the rows of another account', function () {
    $other = ProgressWorld::user();
    SnapshotWorld::exerciseProgress($other, 'fx-rust-01', ['attempt_count' => 9]);
    SnapshotWorld::insert('drafts', $other, ['exercise_id' => 'fx-rust-01', 'code' => 'ajeno', 'set_at' => SNAPSHOT_CLOCK]);
    SnapshotWorld::insert('preferences', $other, ['route_language' => 'go', 'route_language_set_at' => SNAPSHOT_CLOCK]);
    SnapshotWorld::insert('route_notes', $other, ['language' => 'rust', 'field' => 'next', 'body' => 'ajena', 'set_at' => SNAPSHOT_CLOCK]);
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['attempt_count' => 1]);

    $areas = readSnapshot($this->user->id)->areas;

    expect(array_column($areas->exercises, 'attemptCount'))->toBe([1])
        ->and($areas->drafts)->toBe([])
        ->and($areas->preferences)->toBeNull()
        ->and($areas->routeNotes)->toBe([]);
});

describe('the delta', function () {
    it('brings only the rows with a revision greater than the one given', function () {
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['revision' => 4]);
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-02', ['revision' => 5]);
        SnapshotWorld::insert('drafts', $this->user, ['exercise_id' => 'fx-go-01', 'code' => 'x', 'set_at' => SNAPSHOT_CLOCK, 'revision' => 3]);
        SnapshotWorld::insert('preferences', $this->user, ['revision' => 4]);
        SnapshotWorld::insert('route_quiz_answers', $this->user, ['step_id' => 'fx-step-1', 'answer' => 1, 'set_at' => SNAPSHOT_CLOCK, 'revision' => 6]);

        $areas = $this->reader->areas($this->user->id, 4);

        expect(array_column($areas->exercises, 'exerciseId'))->toBe(['fx-rust-02'])
            ->and($areas->drafts)->toBe([])
            ->and($areas->preferences)->toBeNull()
            ->and(array_column($areas->routeQuiz, 'stepId'))->toBe(['fx-step-1']);
    });

    it('brings a tombstone that was written after the revision', function () {
        SnapshotWorld::insert('workshop_progress', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'revision' => 1]);
        SnapshotWorld::insert('workshop_step_marks', $this->user, ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 0, 'set_at' => SNAPSHOT_CLOCK, 'revision' => 9]);
        SnapshotWorld::insert('route_marks', $this->user, ['kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 0, 'set_at' => SNAPSHOT_CLOCK, 'revision' => 9]);

        $areas = $this->reader->areas($this->user->id, 8);

        expect($areas->workshopProgress)->toBe([])
            ->and(array_column($areas->workshopSteps, 'marked'))->toBe([false])
            ->and(array_column($areas->routeMarks, 'marked'))->toBe([false]);
    });

    it('brings the row that the close of a run of B2 changed in the same revision', function () {
        $this->travelTo(Instant::parse('2026-10-06 12:00:00.000'));
        $run = RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01', 'status' => 'running', 'started_at' => Instant::now()]);
        app(RunCloser::class)->close($run->id, new Verdict(
            RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 10, 10, 'ok', '',
            [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Pass), new TestVerdict('t3', TestOutcome::Pass)], null,
        ));

        $changed = $this->reader->areas($this->user->id, 0)->exercises;

        expect(array_column($changed, 'exerciseId'))->toBe(['fx-rust-01'])
            ->and($changed[0]['revision'])->toBe(1)
            ->and($changed[0]['attemptCount'])->toBe(1)
            ->and($changed[0]['proof']['state'])->toBe('current')
            ->and($this->reader->areas($this->user->id, 1)->exercises)->toBe([]);
    });

    it('is empty for a revision with no changes', function () {
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['revision' => 4]);
        SnapshotWorld::insert('preferences', $this->user, ['revision' => 4]);

        expect($this->reader->areas($this->user->id, 4)->toArray(false))->toBe([
            'full' => false, 'exercises' => [], 'drafts' => [], 'campaign' => ['seals' => [], 'checkpoints' => []],
            'workshops' => ['progress' => [], 'objectives' => [], 'steps' => []], 'route' => ['marks' => [], 'quiz' => [], 'notes' => []],
            'preferences' => null,
        ]);
    });
});

describe('the state of the proof', function () {
    it('is current when the passed attempt was verified with the grading hash of the exercise', function () {
        $proof = SnapshotWorld::attempt($this->user, 'fx-rust-01');
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['proof_attempt_id' => $proof, 'proof_at' => SNAPSHOT_CLOCK]);

        expect(readSnapshot($this->user->id)->areas->exercises[0]['proof']['state'])->toBe('current');
    });

    it('is changed when the exercise has another grading hash than the one of the attempt', function () {
        $proof = SnapshotWorld::attempt($this->user, 'fx-rust-01');
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['proof_attempt_id' => $proof, 'proof_at' => SNAPSHOT_CLOCK]);
        DB::table('exercises')->where('id', 'fx-rust-01')->update(['grading_hash' => str_repeat('b', 64)]);

        expect(readSnapshot($this->user->id)->areas->exercises[0]['proof']['state'])->toBe('changed');
    });

    it('is legacy when the attempt comes from the import and has no grading hash', function () {
        $proof = SnapshotWorld::attempt($this->user, 'fx-rust-01', ['legacy' => 1, 'outcome' => 'legacy_error', 'grading_hash' => null], []);
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['proof_attempt_id' => $proof, 'proof_at' => SNAPSHOT_CLOCK, 'last_attempt_id' => $proof, 'last_attempt_at' => SNAPSHOT_CLOCK]);

        $row = readSnapshot($this->user->id)->areas->exercises[0];

        expect($row['proof'])->toBe(['attemptId' => $proof, 'at' => SNAPSHOT_CLOCK_ISO, 'state' => 'legacy', 'tests' => []])
            ->and($row['lastAttempt'])->toBe(['attemptId' => $proof, 'at' => SNAPSHOT_CLOCK_ISO, 'outcome' => 'legacy_error', 'legacy' => true, 'tests' => []]);
    });

    it('never carries the code or the output of an attempt', function () {
        $proof = SnapshotWorld::attempt($this->user, 'fx-rust-01');
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['proof_attempt_id' => $proof, 'proof_at' => SNAPSHOT_CLOCK, 'last_attempt_id' => $proof, 'last_attempt_at' => SNAPSHOT_CLOCK]);

        $row = readSnapshot($this->user->id)->areas->exercises[0];

        expect(array_keys($row['proof']))->toBe(['attemptId', 'at', 'state', 'tests'])
            ->and(array_keys($row['lastAttempt']))->toBe(['attemptId', 'at', 'outcome', 'legacy', 'tests'])
            ->and(array_keys($row['proof']['tests'][0]))->toBe(['testKey', 'outcome']);
    });

    it('is looked up by account and exercise, so an attempt of another account does not count', function () {
        $other = ProgressWorld::user();
        $foreign = SnapshotWorld::attempt($other, 'fx-rust-01');
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['proof_attempt_id' => $foreign, 'proof_at' => SNAPSHOT_CLOCK]);

        expect(readSnapshot($this->user->id)->areas->exercises[0]['proof'])->toBeNull();
    });

    it('is looked up by exercise, so an attempt on another exercise does not count', function () {
        $elsewhere = SnapshotWorld::attempt($this->user, 'fx-rust-02');
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['last_attempt_id' => $elsewhere, 'last_attempt_at' => SNAPSHOT_CLOCK]);

        expect(readSnapshot($this->user->id)->areas->exercises[0]['lastAttempt'])->toBeNull();
    });
});

describe('read', function () {
    it('answers NotModified, with the validator, when the callback accepts it', function () {
        DB::table('progress_heads')->insert(['user_id' => $this->user->id, 'epoch' => 2, 'revision' => 42, 'created_at' => SNAPSHOT_CLOCK, 'updated_at' => SNAPSHOT_CLOCK]);
        $offered = null;

        $result = $this->reader->read($this->user->id, SnapshotWorld::CONTENT_VERSION, function (string $etag) use (&$offered) {
            $offered = $etag;

            return true;
        });

        $expected = "W/\"u{$this->user->id}.e2.r42.c".SnapshotWorld::CONTENT_VERSION.'"';
        expect($result)->toBeInstanceOf(NotModified::class)
            ->and($result->etag)->toBe($expected)
            ->and($offered)->toBe($expected);
    });

    it('reads nothing but the head when the callback accepts the validator', function () {
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01');
        $statements = [];
        DB::listen(function ($query) use (&$statements) {
            $statements[] = $query->sql;
        });

        $this->reader->read($this->user->id, SnapshotWorld::CONTENT_VERSION, fn (string $etag) => true);

        expect($statements)->toHaveCount(1)
            ->and($statements[0])->toContain('progress_heads');
    });

    it('answers a Snapshot with the validator of the head when the callback refuses it', function () {
        DB::table('progress_heads')->insert(['user_id' => $this->user->id, 'epoch' => 2, 'revision' => 42, 'created_at' => SNAPSHOT_CLOCK, 'updated_at' => SNAPSHOT_CLOCK]);
        SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['revision' => 40]);

        $result = $this->reader->read($this->user->id, SnapshotWorld::CONTENT_VERSION, fn (string $etag) => false);

        expect($result)->toBeInstanceOf(Snapshot::class)
            ->and($result->epoch)->toBe(2)
            ->and($result->revision)->toBe(42)
            ->and($result->areas->exercises)->toHaveCount(1);
    });

    it('does not write anything when the account has no head', function () {
        $statements = [];
        DB::listen(function ($query) use (&$statements) {
            $statements[] = $query->sql;
        });

        $this->reader->read($this->user->id, SnapshotWorld::CONTENT_VERSION, fn (string $etag) => false);
        $this->reader->areas($this->user->id, null);
        $this->reader->areas($this->user->id, 0);

        $writes = array_filter($statements, fn (string $sql) => preg_match('/^\s*(insert|update|delete|replace|truncate|alter)\b/i', $sql) === 1);
        expect($statements)->not->toBeEmpty()
            ->and($writes)->toBe([])
            ->and(DB::table('progress_heads')->count())->toBe(0);
    });
});
