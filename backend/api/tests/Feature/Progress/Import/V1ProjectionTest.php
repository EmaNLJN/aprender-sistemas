<?php

use Illuminate\Support\Facades\DB;
use Tests\Support\ProgressWorld;
use Tests\Support\V1Projection;

const PROJECTION_PLANTED_AT = '2026-10-05 10:00:00.000';

function projectionWorld(): array
{
    return [
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'exercises' => [
            ['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3],
            ['id' => 'fx-rust-02', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3],
            ['id' => 'fx-go-01', 'language' => 'go', 'hints' => 3, 'predictionOptions' => 3],
        ],
        'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3], ['id' => 'fx-world-2', 'checkpointOptions' => 3]],
        'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1', 'fx-obj-2', 'fx-obj-3'], 'steps' => ['e1', 'e2', 'e3', 'e4']]],
        'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => ['fx-res-1']],
    ];
}

function projectionAccount(): int
{
    ProgressWorld::seed(projectionWorld());

    return ProgressWorld::user()->id;
}

function projectionPlant(string $table, array $row): void
{
    DB::table($table)->insert(['revision' => 0, 'created_at' => PROJECTION_PLANTED_AT, 'updated_at' => PROJECTION_PLANTED_AT, ...$row]);
}

function projectionAttempt(int $userId, array $overrides = []): int
{
    return DB::table('attempts')->insertGetId([
        'user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'epoch' => 1, 'legacy' => 1, 'outcome' => 'passed', 'code_sha256' => str_repeat('a', 64),
        'attempted_at' => PROJECTION_PLANTED_AT, 'finished_at' => PROJECTION_PLANTED_AT, 'created_at' => PROJECTION_PLANTED_AT, ...$overrides,
    ]);
}

function projectionPayload(int $attemptId, array $overrides = []): void
{
    DB::table('attempt_payloads')->insert([
        'attempt_id' => $attemptId, 'code' => 'fn main() {}', 'custom_test' => null, 'stdout' => '', 'stderr' => '', 'created_at' => PROJECTION_PLANTED_AT, ...$overrides,
    ]);
}

function projectedV1(int $userId): stdClass
{
    return json_decode(json_encode(V1Projection::of($userId), JSON_THROW_ON_ERROR), false, 512, JSON_THROW_ON_ERROR);
}

function expectedV1(string $json): stdClass
{
    return json_decode($json, false, 512, JSON_THROW_ON_ERROR);
}

it('projects an account with no rows as the v1 defaults', function () {
    $userId = projectionAccount();

    expect(projectedV1($userId))->toEqual(expectedV1(<<<'JSON'
        {
          "route": {"version": 1, "language": "rust", "completed": [], "milestones": [], "favorites": [], "quizAnswers": {},
                    "notes": {"rust": {"learned": "", "next": ""}, "go": {"learned": "", "next": ""}}, "minutes": 25},
          "lab": {"version": 1, "records": {}, "selected": {"rust": null, "go": null}},
          "campaign": {"version": 1, "seals": {}, "checkpoints": {}},
          "systems": {"version": 1, "records": {}}
        }
        JSON));
});

it('keeps empty maps as objects and empty lists as arrays in the encoded sections', function () {
    $json = json_encode(V1Projection::of(projectionAccount()), JSON_THROW_ON_ERROR);

    expect($json)->toContain('"quizAnswers":{}')
        ->and($json)->toContain('"records":{}')
        ->and($json)->toContain('"completed":[]');
});

it('projects the preferences, and falls back to rust, 25 and no selection when their columns are NULL', function () {
    $userId = projectionAccount();
    projectionPlant('preferences', ['user_id' => $userId]);

    expect(projectedV1($userId)->route)->toEqual(expectedV1('{"version":1,"language":"rust","completed":[],"milestones":[],"favorites":[],"quizAnswers":{},"notes":{"rust":{"learned":"","next":""},"go":{"learned":"","next":""}},"minutes":25}'))
        ->and(projectedV1($userId)->lab->selected)->toEqual(expectedV1('{"rust":null,"go":null}'));

    DB::table('preferences')->where('user_id', $userId)->update(['route_language' => 'go', 'focus_minutes' => 45, 'lab_selected_rust' => 'fx-rust-02', 'lab_selected_go' => 'fx-go-01']);

    $projected = projectedV1($userId);
    expect($projected->route->language)->toBe('go')
        ->and($projected->route->minutes)->toBe(45)
        ->and($projected->lab->selected)->toEqual(expectedV1('{"rust":"fx-rust-02","go":"fx-go-01"}'));
});

it('orders the route marks by legacy_position, then by created_at with the NULL positions last, and leaves tombstones out', function () {
    $userId = projectionAccount();
    $mark = fn (string $kind, string $key, ?int $position, string $createdAt, int $marked = 1) => projectionPlant('route_marks', [
        'user_id' => $userId, 'kind' => $kind, 'item_key' => $key, 'marked' => $marked, 'legacy_position' => $position, 'created_at' => $createdAt,
    ]);
    $mark('step', 'late', null, '2026-10-05 10:00:02.000');
    $mark('step', 'second', 1, '2026-10-05 10:00:09.000');
    $mark('step', 'early', null, '2026-10-05 10:00:01.000');
    $mark('step', 'first', 0, '2026-10-05 10:00:08.000');
    $mark('step', 'undone', 2, '2026-10-05 10:00:00.000', 0);
    $mark('milestone', 'rust-memory', 0, '2026-10-05 10:00:00.000');
    $mark('favorite', 'fx-res-1', null, '2026-10-05 10:00:00.000');

    $route = projectedV1($userId)->route;

    expect($route->completed)->toBe(['first', 'second', 'early', 'late'])
        ->and($route->milestones)->toBe(['rust-memory'])
        ->and($route->favorites)->toBe(['fx-res-1']);
});

it('projects the quiz answers and the notes, with an empty text for the notes that have no row', function () {
    $userId = projectionAccount();
    projectionPlant('route_quiz_answers', ['user_id' => $userId, 'step_id' => 'fx-step-1', 'answer' => 2]);
    projectionPlant('route_notes', ['user_id' => $userId, 'language' => 'go', 'field' => 'next', 'body' => "Repasar\nlifetimes"]);

    $route = projectedV1($userId)->route;

    expect($route->quizAnswers)->toEqual(expectedV1('{"fx-step-1":2}'))
        ->and($route->notes)->toEqual(expectedV1('{"rust":{"learned":"","next":""},"go":{"learned":"","next":"Repasar\nlifetimes"}}'));
});

it('projects a bare exercise row as a record with only its three booleans', function () {
    $userId = projectionAccount();
    projectionPlant('exercise_progress', ['user_id' => $userId, 'exercise_id' => 'fx-rust-01']);

    expect(projectedV1($userId)->lab->records)->toEqual(expectedV1('{"fx-rust-01":{"predictionCorrect":false,"assisted":false,"solutionSeen":false}}'));
});

it('projects every column of an exercise row, with its draft and its attempts, and the instants back to milliseconds', function () {
    $userId = projectionAccount();
    projectionPlant('exercise_progress', [
        'user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'solved_at' => '2026-10-06 12:00:00.123', 'prediction_answer' => 1, 'prediction_correct' => 1,
        'assisted' => 1, 'solution_seen' => 1, 'hints_revealed' => 2, 'legacy_attempts' => 4, 'reflection' => 'Lo entendí', 'custom_test' => 'assert!(true);',
        'confidence' => 'practice', 'reviewed_at' => '1000-01-01 00:00:00.000', 'review_due_at' => '2026-10-07 09:30:15.007',
    ]);
    projectionPlant('drafts', ['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'code' => "let x = 1;\n"]);

    expect(projectedV1($userId)->lab->records)->toEqual(expectedV1(<<<'JSON'
        {"fx-rust-01": {"predictionCorrect": true, "assisted": true, "solutionSeen": true, "prediction": 1, "hints": 2, "draft": "let x = 1;\n",
                        "reflection": "Lo entendí", "customTest": "assert!(true);", "attempts": 4, "solvedAt": 1791288000123,
                        "reviewAt": 1791365415007, "reviewedAt": -30610224000000, "confidence": "practice"}}
        JSON));
});

it('projects reviewAt without a confidence, and leaves out a draft row whose code is NULL', function () {
    $userId = projectionAccount();
    projectionPlant('exercise_progress', ['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'review_due_at' => '2026-10-01 08:00:00.000']);
    projectionPlant('drafts', ['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'code' => null]);

    expect(projectedV1($userId)->lab->records)->toEqual(expectedV1('{"fx-rust-01":{"predictionCorrect":false,"assisted":false,"solutionSeen":false,"reviewAt":1790841600000}}'));
});

it('builds result from last_attempt_id with its tests by position and its payload', function () {
    $userId = projectionAccount();
    $other = projectionAttempt($userId, ['outcome' => 'failed']);
    projectionPayload($other, ['code' => 'otro']);
    $last = projectionAttempt($userId, ['outcome' => 'passed', 'custom_outcome' => 'pass', 'attempted_at' => '2026-10-06 12:00:00.123']);
    projectionPayload($last, ['code' => 'fn main() {}', 'custom_test' => 'assert!(true);', 'stdout' => 'ok', 'stderr' => 'aviso']);
    foreach ([['t3', 3, 'fail'], ['t1', 1, 'pass'], ['t2', 2, 'missing']] as [$key, $position, $outcome]) {
        DB::table('attempt_tests')->insert(['attempt_id' => $last, 'test_key' => $key, 'exercise_id' => 'fx-rust-01', 'position' => $position, 'outcome' => $outcome]);
    }
    projectionPlant('exercise_progress', ['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'proof_attempt_id' => $other, 'last_attempt_id' => $last]);

    expect(projectedV1($userId)->lab->records->{'fx-rust-01'}->result)->toEqual(expectedV1(<<<'JSON'
        {"code": "fn main() {}", "success": true, "stdout": "ok", "stderr": "aviso", "transportError": false,
         "tests": [{"id": "t1", "passed": true}, {"id": "t2", "passed": false}, {"id": "t3", "passed": false}],
         "time": 1791288000123, "customTest": "assert!(true);", "customPassed": true}
        JSON));
});

it('projects a legacy transport error as not successful, and a missing custom test as an empty text that did not pass', function () {
    $userId = projectionAccount();
    $attempt = projectionAttempt($userId, ['outcome' => 'legacy_error', 'custom_outcome' => 'missing']);
    projectionPayload($attempt, ['code' => 'x']);
    projectionPlant('exercise_progress', ['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'last_attempt_id' => $attempt]);

    expect(projectedV1($userId)->lab->records->{'fx-rust-01'}->result)->toEqual(expectedV1(<<<'JSON'
        {"code": "x", "success": false, "stdout": "", "stderr": "", "transportError": true, "tests": [],
         "time": 1791194400000, "customTest": "", "customPassed": false}
        JSON));
});

it('projects the campaign seals as they are stored, even with the three flags false, and the checkpoints with a null last answer', function () {
    $userId = projectionAccount();
    DB::table('campaign_seals')->insert([
        ['user_id' => $userId, 'exercise_id' => 'fx-rust-01', 'code' => 1, 'prediction' => 0, 'assisted' => 1, 'imported_at' => PROJECTION_PLANTED_AT, 'revision' => 0],
        ['user_id' => $userId, 'exercise_id' => 'fx-rust-02', 'code' => 0, 'prediction' => 0, 'assisted' => 0, 'imported_at' => PROJECTION_PLANTED_AT, 'revision' => 0],
    ]);
    projectionPlant('campaign_checkpoints', ['user_id' => $userId, 'world_id' => 'fx-world-1', 'passed' => 1, 'last_answer' => 2]);
    projectionPlant('campaign_checkpoints', ['user_id' => $userId, 'world_id' => 'fx-world-2']);

    expect(projectedV1($userId)->campaign)->toEqual(expectedV1(<<<'JSON'
        {"version": 1,
         "seals": {"fx-rust-01": {"code": true, "prediction": false, "assisted": true}, "fx-rust-02": {"code": false, "prediction": false, "assisted": false}},
         "checkpoints": {"fx-world-1": {"passed": true, "lastAnswer": 2}, "fx-world-2": {"passed": false, "lastAnswer": null}}}
        JSON));
});

it('projects a workshop record with its objectives and steps in legacy order, the step positions of the v1 and its note', function () {
    $userId = projectionAccount();
    DB::table('workshop_steps')->where('workshop_id', 'fx-workshop-1')->where('step_key', 'e1')->update(['v1_position' => 0]);
    DB::table('workshop_steps')->where('workshop_id', 'fx-workshop-1')->where('step_key', 'e2')->update(['v1_position' => 1]);
    DB::table('workshop_steps')->where('workshop_id', 'fx-workshop-1')->where('step_key', 'e3')->update(['v1_position' => null]);
    $identity = ['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust'];
    projectionPlant('workshop_progress', [...$identity, 'code_sealed' => 1, 'prediction_correct' => 1, 'answer' => 1, 'note' => 'Medir antes']);
    foreach ([['fx-obj-3', null, '2026-10-05 10:00:01.000'], ['fx-obj-2', 1, '2026-10-05 10:00:09.000'], ['fx-obj-1', 0, '2026-10-05 10:00:08.000']] as [$key, $position, $createdAt]) {
        DB::table('workshop_observations')->insert([...$identity, 'objective_key' => $key, 'legacy_position' => $position, 'revision' => 0, 'created_at' => $createdAt]);
    }
    foreach ([['e1', 1, 1], ['e2', 0, 1], ['e3', 2, 1], ['e4', 3, 0]] as [$key, $position, $marked]) {
        projectionPlant('workshop_step_marks', [...$identity, 'step_key' => $key, 'marked' => $marked, 'legacy_position' => $position]);
    }

    expect(projectedV1($userId)->systems)->toEqual(expectedV1(<<<'JSON'
        {"version": 1, "records": {"rust:fx-workshop-1": {"observed": ["fx-obj-1", "fx-obj-2", "fx-obj-3"], "code": true, "predicted": true,
                                                          "answer": 1, "steps": [1, 0], "note": "Medir antes"}}}
        JSON));
});

it('projects a workshop row with nothing else as an empty record', function () {
    $userId = projectionAccount();
    projectionPlant('workshop_progress', ['user_id' => $userId, 'workshop_id' => 'fx-workshop-1', 'language' => 'go']);

    expect(projectedV1($userId)->systems)->toEqual(expectedV1('{"version":1,"records":{"go:fx-workshop-1":{"observed":[],"code":false,"predicted":false,"answer":null,"steps":[],"note":""}}}'));
});

it('does not project the rows of another account', function () {
    $userId = projectionAccount();
    $otherId = ProgressWorld::user()->id;
    projectionPlant('exercise_progress', ['user_id' => $otherId, 'exercise_id' => 'fx-rust-01', 'assisted' => 1]);
    projectionPlant('route_marks', ['user_id' => $otherId, 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1]);
    projectionPlant('workshop_progress', ['user_id' => $otherId, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust']);
    DB::table('campaign_seals')->insert(['user_id' => $otherId, 'exercise_id' => 'fx-rust-01', 'code' => 1, 'prediction' => 1, 'assisted' => 1, 'imported_at' => PROJECTION_PLANTED_AT, 'revision' => 0]);

    $projected = projectedV1($userId);

    expect($projected->lab->records)->toEqual(new stdClass)
        ->and($projected->route->completed)->toBe([])
        ->and($projected->systems->records)->toEqual(new stdClass)
        ->and($projected->campaign->seals)->toEqual(new stdClass);
});
