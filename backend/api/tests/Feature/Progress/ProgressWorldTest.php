<?php

use App\Content\ContentImports;
use App\Models\User;
use App\Progress\ProgressHead;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\AssertionFailedError;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;

// The `world` section of merge-rules.md section 8, written by hand: the fixture file is not in S0.
function referenceProgressWorld(): array
{
    return [
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'staleContentVersion' => 'fedcba9876543210fedcba9876543210',
        'exercises' => [
            ['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3],
            ['id' => 'fx-rust-02', 'language' => 'rust', 'hints' => 2, 'predictionOptions' => 3],
            ['id' => 'fx-go-01', 'language' => 'go', 'hints' => 3, 'predictionOptions' => 3],
            ['id' => 'fx-go-02', 'language' => 'go', 'hints' => 3, 'predictionOptions' => 3],
        ],
        'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
        'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1', 'fx-obj-2'], 'steps' => ['e1', 'e2', 'e3', 'e4']]],
        'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => ['fx-res-1']],
        'milestones' => ['rust-memory', 'go-memory'],
    ];
}

function plantProgressRow(string $table, array $row): void
{
    DB::table($table)->insert(['revision' => 0, 'created_at' => '2026-10-06 12:00:00.000', 'updated_at' => '2026-10-06 12:00:00.000', ...$row]);
}

function optionCount(string $table, string $id, string $column, string $key = 'id'): int
{
    return count(json_decode(DB::table($table)->where($key, $id)->value($column), true)['options']);
}

it('seeds the exercises with their hints and prediction options', function () {
    ProgressWorld::seed(referenceProgressWorld());

    expect(DB::table('exercises')->orderBy('id')->pluck('language', 'id')->all())->toBe(['fx-go-01' => 'go', 'fx-go-02' => 'go', 'fx-rust-01' => 'rust', 'fx-rust-02' => 'rust'])
        ->and(DB::table('exercise_hints')->where('exercise_id', 'fx-rust-01')->count())->toBe(3)
        ->and(DB::table('exercise_hints')->where('exercise_id', 'fx-rust-02')->count())->toBe(2)
        ->and(optionCount('exercises', 'fx-rust-01', 'prediction_json'))->toBe(3);
});

it('seeds a world with its checkpoint, a workshop with two objectives, four steps and a prediction, and a guide step with its quiz and a resource', function () {
    ProgressWorld::seed(referenceProgressWorld());

    expect(optionCount('worlds', 'fx-world-1', 'checkpoint_json'))->toBe(3)
        ->and(DB::table('workshop_objectives')->where('workshop_id', 'fx-workshop-1')->orderBy('objective_key')->pluck('objective_key')->all())->toBe(['fx-obj-1', 'fx-obj-2'])
        ->and(DB::table('workshop_steps')->where('workshop_id', 'fx-workshop-1')->orderBy('step_key')->pluck('step_key')->all())->toBe(['e1', 'e2', 'e3', 'e4'])
        ->and(optionCount('workshops', 'fx-workshop-1', 'prediction_json'))->toBe(3)
        ->and(optionCount('guide_steps', 'fx-step-1', 'quiz_json'))->toBe(3)
        ->and(DB::table('guide_resources')->pluck('id')->all())->toBe(['fx-res-1']);
});

it('leaves its own content import as the latest, and contentVersion is the first 32 hexadecimals of its document_hash', function () {
    ProgressWorld::seed(referenceProgressWorld());

    $latest = DB::table('content_imports')->orderByDesc('id')->value('document_hash');

    expect(ProgressWorld::contentVersion())->toBe('0123456789abcdef0123456789abcdef')
        ->and(substr($latest, 0, 32))->toBe('0123456789abcdef0123456789abcdef')
        ->and((new ContentImports)->latestVersion())->toBe('0123456789abcdef0123456789abcdef');
});

it('creates a user and its head', function () {
    ProgressWorld::seed(referenceProgressWorld());
    $user = ProgressWorld::user(['name' => 'Ana']);

    $head = ProgressWorld::head($user, epoch: 2, revision: 7);

    expect($user)->toBeInstanceOf(User::class)
        ->and($user->name)->toBe('Ana')
        ->and($head)->toBeInstanceOf(ProgressHead::class)
        ->and([$head->userId, $head->epoch, $head->revision])->toBe([$user->id, 2, 7])
        ->and((int) DB::table('progress_heads')->where('user_id', $user->id)->value('revision'))->toBe(7);
});

it('finds nothing in valid data', function () {
    ProgressWorld::seed(referenceProgressWorld());
    $user = ProgressWorld::user();
    ProgressWorld::head($user, revision: 5);
    plantProgressRow('route_marks', ['user_id' => $user->id, 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 0, 'set_at' => '2026-10-06 11:00:00.000', 'revision' => 5]);
    plantProgressRow('drafts', ['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'code' => null, 'set_at' => '2026-10-06 11:00:00.000']);
    plantProgressRow('workshop_progress', ['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'prediction_correct' => 1, 'prediction_correct_at' => '2026-10-06 11:00:00.000', 'note' => '', 'note_set_at' => '2026-10-06 11:00:00.000']);

    ProgressInvariants::assertClean();
    expect(ProgressInvariants::violations())->toBe([]);
});

it('names the rule that a planted violation breaks', function (Closure $plant, string $rule) {
    ProgressWorld::seed(referenceProgressWorld());
    $user = ProgressWorld::user();
    ProgressWorld::head($user, revision: 5);
    $plant($user);

    expect(array_keys(ProgressInvariants::violations()))->toBe([$rule]);
    expect(fn () => ProgressInvariants::assertClean())->toThrow(AssertionFailedError::class, $rule);
})->with([
    'a route tombstone without its clock' => [
        fn (User $user) => plantProgressRow('route_marks', ['user_id' => $user->id, 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 0, 'set_at' => null]),
        ProgressInvariants::TOMBSTONE_CLOCK,
    ],
    'a workshop step tombstone without its clock' => [
        function (User $user) {
            plantProgressRow('workshop_progress', ['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust']);
            plantProgressRow('workshop_step_marks', ['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 0, 'set_at' => null]);
        },
        ProgressInvariants::TOMBSTONE_CLOCK,
    ],
    'a draft without code and without a clock' => [
        fn (User $user) => plantProgressRow('drafts', ['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'code' => null, 'set_at' => null]),
        ProgressInvariants::DRAFT_CLOCK,
    ],
    'a workshop prediction date without its flag' => [
        fn (User $user) => plantProgressRow('workshop_progress', ['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'prediction_correct' => 0, 'prediction_correct_at' => '2026-10-06 11:00:00.000']),
        ProgressInvariants::DATE_WITHOUT_FLAG,
    ],
    'an exercise prediction date without its flag' => [
        fn (User $user) => plantProgressRow('exercise_progress', ['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'prediction_correct' => 0, 'prediction_correct_at' => '2026-10-06 11:00:00.000']),
        ProgressInvariants::DATE_WITHOUT_FLAG,
    ],
    'a checkpoint passed date without its flag' => [
        fn (User $user) => plantProgressRow('campaign_checkpoints', ['user_id' => $user->id, 'world_id' => 'fx-world-1', 'passed' => 0, 'passed_at' => '2026-10-06 11:00:00.000']),
        ProgressInvariants::DATE_WITHOUT_FLAG,
    ],
    'a workshop note clock without its value' => [
        fn (User $user) => plantProgressRow('workshop_progress', ['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'note' => null, 'note_set_at' => '2026-10-06 11:00:00.000']),
        ProgressInvariants::CLOCK_WITHOUT_VALUE,
    ],
    'an exercise reflection clock without its value' => [
        fn (User $user) => plantProgressRow('exercise_progress', ['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'reflection' => null, 'reflection_set_at' => '2026-10-06 11:00:00.000']),
        ProgressInvariants::CLOCK_WITHOUT_VALUE,
    ],
    'a checkpoint answer clock without its value' => [
        fn (User $user) => plantProgressRow('campaign_checkpoints', ['user_id' => $user->id, 'world_id' => 'fx-world-1', 'last_answer' => null, 'last_answer_set_at' => '2026-10-06 11:00:00.000']),
        ProgressInvariants::CLOCK_WITHOUT_VALUE,
    ],
    'a review with a confidence and without its dates' => [
        fn (User $user) => plantProgressRow('exercise_progress', ['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'confidence' => 'again', 'reviewed_at' => null, 'review_due_at' => null, 'review_set_at' => '2026-10-06 11:00:00.000']),
        ProgressInvariants::REVIEW_GROUP,
    ],
    'a row with a revision newer than the head of its account' => [
        fn (User $user) => plantProgressRow('route_quiz_answers', ['user_id' => $user->id, 'step_id' => 'fx-step-1', 'answer' => 1, 'revision' => 6]),
        ProgressInvariants::REVISION_AHEAD_OF_HEAD,
    ],
]);

it('looks only at the account that it is asked about', function () {
    ProgressWorld::seed(referenceProgressWorld());
    $clean = ProgressWorld::user();
    $broken = ProgressWorld::user();
    ProgressWorld::head($clean);
    ProgressWorld::head($broken);
    plantProgressRow('drafts', ['user_id' => $broken->id, 'exercise_id' => 'fx-rust-01', 'code' => null, 'set_at' => null]);

    ProgressInvariants::assertClean($clean->id);
    expect(fn () => ProgressInvariants::assertClean($broken->id))->toThrow(AssertionFailedError::class);
});
