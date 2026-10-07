<?php

use App\Progress\Import\ImportConflicts;
use App\Progress\Import\Legacy\LegacyCheckpoint;
use App\Progress\Import\Legacy\LegacyExercise;
use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\Legacy\LegacyResult;
use App\Progress\Import\Legacy\LegacyRoute;
use App\Progress\Import\Legacy\LegacySeal;
use App\Progress\Import\Legacy\LegacyWorkshop;
use App\Progress\ProgressAreas;
use Carbon\CarbonImmutable;

const CONFLICTS_CLOCK = '2026-10-05T12:00:00.000Z';

function conflictsExercise(array $fields = []): LegacyExercise
{
    return new LegacyExercise(...[
        'exerciseId' => 'fx-rust-01', 'predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false,
        'prediction' => null, 'hints' => null, 'draft' => null, 'reflection' => null, 'customTest' => null, 'attempts' => null,
        'solvedAt' => null, 'reviewAt' => null, 'reviewedAt' => null, 'confidence' => null, 'result' => null,
        ...$fields,
    ]);
}

function conflictsResult(): LegacyResult
{
    return new LegacyResult('fn main() {}', true, false, '', '', [], CarbonImmutable::parse('2026-10-01T10:00:00.000Z'), '', false, null);
}

function conflictsRoute(array $fields = []): LegacyRoute
{
    return new LegacyRoute(...[
        'language' => 'rust', 'minutes' => 25, 'completed' => [], 'milestones' => [], 'favorites' => [], 'quizAnswers' => [],
        'notes' => ['rust' => ['learned' => '', 'next' => ''], 'go' => ['learned' => '', 'next' => '']],
        ...$fields,
    ]);
}

function conflictsWorkshop(array $fields = []): LegacyWorkshop
{
    return new LegacyWorkshop(...[
        'workshopId' => 'fx-workshop-1', 'language' => 'go', 'codeSealed' => false, 'predicted' => false, 'answer' => null,
        'observed' => [], 'steps' => [], 'note' => '',
        ...$fields,
    ]);
}

function conflictsProgress(array $parts = []): LegacyProgress
{
    return new LegacyProgress(...[
        'route' => null, 'exercises' => [], 'selected' => null, 'seals' => [], 'checkpoints' => [], 'workshops' => [], 'omitted' => [], 'replaced' => [],
        ...$parts,
    ]);
}

function conflictsOf(LegacyProgress $progress, ProgressAreas $current): array
{
    return array_map(fn ($entry) => [$entry->path, $entry->reason], ImportConflicts::between($progress, $current));
}

function conflictsPhotoExercise(array $fields): ProgressAreas
{
    return new ProgressAreas(exercises: [['exerciseId' => 'fx-rust-01', ...$fields]]);
}

describe('exercise fields with a clock', function () {
    it('reports the prediction, the reflection and the custom test of the account when the clock is real and the value differs', function (array $v1, array $photo, string $path) {
        $conflicts = conflictsOf(conflictsProgress(['exercises' => [conflictsExercise($v1)]]), conflictsPhotoExercise($photo));

        expect($conflicts)->toBe([[$path, 'newer_value_kept']]);
    })->with([
        'prediction' => [['prediction' => 1], ['prediction' => ['answer' => 2, 'at' => CONFLICTS_CLOCK]], 'lab.records.fx-rust-01.prediction'],
        'reflection' => [['reflection' => 'v1'], ['reflection' => ['text' => 'v2', 'at' => CONFLICTS_CLOCK]], 'lab.records.fx-rust-01.reflection'],
        'custom test' => [['customTest' => 'v1'], ['customTest' => ['text' => 'v2', 'at' => CONFLICTS_CLOCK]], 'lab.records.fx-rust-01.customTest'],
    ]);

    it('reports nothing when the value of the account has no clock or equals the v1 one', function (array $v1, array $photo) {
        expect(conflictsOf(conflictsProgress(['exercises' => [conflictsExercise($v1)]]), conflictsPhotoExercise($photo)))->toBe([]);
    })->with([
        'prediction without clock' => [['prediction' => 1], ['prediction' => ['answer' => 2, 'at' => null]]],
        'prediction equal' => [['prediction' => 2], ['prediction' => ['answer' => 2, 'at' => CONFLICTS_CLOCK]]],
        'reflection without clock' => [['reflection' => 'v1'], ['reflection' => ['text' => 'v2', 'at' => null]]],
        'reflection equal' => [['reflection' => 'same'], ['reflection' => ['text' => 'same', 'at' => CONFLICTS_CLOCK]]],
        'custom test without clock' => [['customTest' => 'v1'], ['customTest' => ['text' => 'v2', 'at' => null]]],
        'custom test equal' => [['customTest' => 'same'], ['customTest' => ['text' => 'same', 'at' => CONFLICTS_CLOCK]]],
        'account without a value' => [['reflection' => 'v1'], ['reflection' => null]],
        'v1 without a value' => [[], ['reflection' => ['text' => 'v2', 'at' => CONFLICTS_CLOCK]]],
    ]);

    it('compares the review group as a whole and reports it once', function (array $v1, array $review) {
        $conflicts = conflictsOf(conflictsProgress(['exercises' => [conflictsExercise($v1)]]), conflictsPhotoExercise(['review' => $review]));

        expect($conflicts)->toBe([['lab.records.fx-rust-01.review', 'newer_value_kept']]);
    })->with([
        'other confidence' => [
            ['confidence' => 'again', 'reviewedAt' => CarbonImmutable::parse('2026-10-01T10:00:00.000Z'), 'reviewAt' => CarbonImmutable::parse('2026-10-02T10:00:00.000Z')],
            ['confidence' => 'confident', 'reviewedAt' => '2026-10-01T10:00:00.000Z', 'reviewDueAt' => '2026-10-02T10:00:00.000Z', 'at' => CONFLICTS_CLOCK],
        ],
        'other due date' => [
            ['confidence' => 'again', 'reviewedAt' => CarbonImmutable::parse('2026-10-01T10:00:00.000Z'), 'reviewAt' => CarbonImmutable::parse('2026-10-02T10:00:00.000Z')],
            ['confidence' => 'again', 'reviewedAt' => '2026-10-01T10:00:00.000Z', 'reviewDueAt' => '2026-10-09T10:00:00.000Z', 'at' => CONFLICTS_CLOCK],
        ],
        'legacy group without confidence against a group of the account' => [
            ['reviewAt' => CarbonImmutable::parse('2026-10-02T10:00:00.000Z')],
            ['confidence' => 'practice', 'reviewedAt' => null, 'reviewDueAt' => '2026-10-05T10:00:00.000Z', 'at' => CONFLICTS_CLOCK],
        ],
    ]);

    it('reports no review conflict when the group is equal, has no clock or the v1 has none', function (array $v1, ?array $review) {
        expect(conflictsOf(conflictsProgress(['exercises' => [conflictsExercise($v1)]]), conflictsPhotoExercise(['review' => $review])))->toBe([]);
    })->with([
        'equal' => [
            ['confidence' => 'again', 'reviewedAt' => CarbonImmutable::parse('2026-10-01T10:00:00.000Z'), 'reviewAt' => CarbonImmutable::parse('2026-10-02T10:00:00.000Z')],
            ['confidence' => 'again', 'reviewedAt' => '2026-10-01T10:00:00.000Z', 'reviewDueAt' => '2026-10-02T10:00:00.000Z', 'at' => CONFLICTS_CLOCK],
        ],
        'without clock' => [
            ['confidence' => 'again'],
            ['confidence' => 'confident', 'reviewedAt' => null, 'reviewDueAt' => null, 'at' => null],
        ],
        'v1 without a group' => [[], ['confidence' => 'confident', 'reviewedAt' => null, 'reviewDueAt' => null, 'at' => CONFLICTS_CLOCK]],
        'account without a group' => [['confidence' => 'again'], null],
    ]);

    it('reports the draft when the account has another one with a clock, and nothing for a draft without clock or the same text', function (?string $accountCode, ?string $at, array $expected) {
        $current = new ProgressAreas(drafts: [['exerciseId' => 'fx-rust-01', 'code' => $accountCode, 'starterHash' => null, 'at' => $at]]);

        expect(conflictsOf(conflictsProgress(['exercises' => [conflictsExercise(['draft' => 'fn v1() {}'])]]), $current))->toBe($expected);
    })->with([
        'other code with clock' => ['fn v2() {}', CONFLICTS_CLOCK, [['lab.records.fx-rust-01.draft', 'newer_value_kept']]],
        'restore-to-starter tombstone with clock' => [null, CONFLICTS_CLOCK, [['lab.records.fx-rust-01.draft', 'newer_value_kept']]],
        'other code without clock' => ['fn v2() {}', null, []],
        'same code' => ['fn v1() {}', CONFLICTS_CLOCK, []],
    ]);

    it('never reports the achievements: prediction correct, assisted, solution seen, hints, solved date and attempts', function () {
        $v1 = conflictsExercise(['predictionCorrect' => true, 'assisted' => true, 'solutionSeen' => true, 'hints' => 1, 'attempts' => 2, 'solvedAt' => CarbonImmutable::parse('2026-10-01T10:00:00.000Z')]);
        $photo = conflictsPhotoExercise([
            'predictionCorrect' => ['value' => false, 'at' => CONFLICTS_CLOCK], 'assisted' => false, 'solutionSeen' => false,
            'hintsRevealed' => 3, 'solvedAt' => '2026-09-01T10:00:00.000Z', 'attemptCount' => 9, 'legacyAttempts' => 9,
        ]);

        expect(conflictsOf(conflictsProgress(['exercises' => [$v1]]), $photo))->toBe([]);
    });

    it('ignores the records of exercises the account has no row for', function () {
        $current = new ProgressAreas(exercises: [['exerciseId' => 'fx-rust-02', 'reflection' => ['text' => 'v2', 'at' => CONFLICTS_CLOCK]]]);

        expect(conflictsOf(conflictsProgress(['exercises' => [conflictsExercise(['reflection' => 'v1'])]]), $current))->toBe([]);
    });
});

describe('the last attempt', function () {
    it('reports a last attempt of the server and keeps the result as history', function () {
        $photo = conflictsPhotoExercise(['lastAttempt' => ['attemptId' => 5, 'at' => CONFLICTS_CLOCK, 'outcome' => 'passed', 'legacy' => false, 'tests' => []]]);

        expect(conflictsOf(conflictsProgress(['exercises' => [conflictsExercise(['result' => conflictsResult()])]]), $photo))
            ->toBe([['lab.records.fx-rust-01.result', 'server_attempt_kept']]);
    });

    it('reports nothing for a legacy last attempt, for no last attempt or for a v1 without result', function (?array $lastAttempt, bool $withResult) {
        $exercise = conflictsExercise($withResult ? ['result' => conflictsResult()] : []);

        expect(conflictsOf(conflictsProgress(['exercises' => [$exercise]]), conflictsPhotoExercise(['lastAttempt' => $lastAttempt])))->toBe([]);
    })->with([
        'legacy last attempt' => [['attemptId' => 5, 'at' => null, 'outcome' => 'legacy_error', 'legacy' => true, 'tests' => []], true],
        'no last attempt' => [null, true],
        'server attempt but v1 without result' => [['attemptId' => 5, 'at' => CONFLICTS_CLOCK, 'outcome' => 'passed', 'legacy' => false, 'tests' => []], false],
    ]);
});

describe('campaign and workshops', function () {
    it('reports the last answer of a checkpoint with a real clock and another value', function (?int $accountAnswer, ?string $at, array $expected) {
        $current = new ProgressAreas(campaignCheckpoints: [['worldId' => 'fx-world-1', 'passed' => true, 'lastAnswer' => $accountAnswer === null ? null : ['value' => $accountAnswer, 'at' => $at]]]);
        $progress = conflictsProgress(['checkpoints' => [new LegacyCheckpoint('fx-world-1', true, 1)]]);

        expect(conflictsOf($progress, $current))->toBe($expected);
    })->with([
        'other answer with clock' => [2, CONFLICTS_CLOCK, [['campaign.checkpoints.fx-world-1.lastAnswer', 'newer_value_kept']]],
        'other answer without clock' => [2, null, []],
        'same answer' => [1, CONFLICTS_CLOCK, []],
        'no answer' => [null, null, []],
    ]);

    it('never reports a seal or a passed checkpoint', function () {
        $current = new ProgressAreas(
            campaignSeals: [['exerciseId' => 'fx-rust-01', 'code' => false, 'prediction' => false, 'assisted' => false, 'revision' => 1]],
            campaignCheckpoints: [['worldId' => 'fx-world-1', 'passed' => false, 'lastAnswer' => null]],
        );
        $progress = conflictsProgress(['seals' => [new LegacySeal('fx-rust-01', true, true, true)], 'checkpoints' => [new LegacyCheckpoint('fx-world-1', true, null)]]);

        expect(conflictsOf($progress, $current))->toBe([]);
    });

    it('reports the answer and the note of a workshop with a real clock and another value', function (array $v1, array $photo, string $path) {
        $current = new ProgressAreas(workshopProgress: [['workshopId' => 'fx-workshop-1', 'language' => 'go', ...$photo]]);

        expect(conflictsOf(conflictsProgress(['workshops' => [conflictsWorkshop($v1)]]), $current))->toBe([[$path, 'newer_value_kept']]);
    })->with([
        'answer' => [['answer' => 1], ['answer' => ['value' => 2, 'at' => CONFLICTS_CLOCK]], 'systems.records.go:fx-workshop-1.answer'],
        'note' => [['note' => 'v1'], ['note' => ['text' => 'v2', 'at' => CONFLICTS_CLOCK]], 'systems.records.go:fx-workshop-1.note'],
    ]);

    it('reports nothing for a workshop note that the v1 left empty, or for the same language of another workshop', function () {
        $current = new ProgressAreas(workshopProgress: [
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'note' => ['text' => 'v2', 'at' => CONFLICTS_CLOCK]],
            ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'answer' => ['value' => 2, 'at' => CONFLICTS_CLOCK]],
        ]);

        expect(conflictsOf(conflictsProgress(['workshops' => [conflictsWorkshop(['note' => '', 'answer' => 1])]]), $current))->toBe([]);
    });

    it('reports a step unmarked in the account with a real clock against a mark of the v1, by its position in the list', function () {
        $current = new ProgressAreas(workshopSteps: [
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'stepKey' => 'e2', 'marked' => false, 'at' => CONFLICTS_CLOCK],
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'stepKey' => 'e3', 'marked' => true, 'at' => CONFLICTS_CLOCK],
        ]);

        $conflicts = conflictsOf(conflictsProgress(['workshops' => [conflictsWorkshop(['steps' => ['e1', 'e2', 'e3']])]]), $current);

        expect($conflicts)->toBe([['systems.records.go:fx-workshop-1.steps[1]', 'newer_value_kept']]);
    });
});

describe('the route and the preferences', function () {
    it('reports a tombstone with a real clock against a mark of the v1, and nothing for a standing mark', function () {
        $current = new ProgressAreas(routeMarks: [
            ['kind' => 'step', 'itemKey' => 'fx-step-2', 'marked' => false, 'at' => CONFLICTS_CLOCK],
            ['kind' => 'milestone', 'itemKey' => 'rust-memory', 'marked' => false, 'at' => CONFLICTS_CLOCK],
            ['kind' => 'favorite', 'itemKey' => 'fx-res-1', 'marked' => false, 'at' => CONFLICTS_CLOCK],
            ['kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => true, 'at' => CONFLICTS_CLOCK],
        ]);
        $route = conflictsRoute(['completed' => ['fx-step-1', 'fx-step-2'], 'milestones' => ['rust-memory'], 'favorites' => ['fx-res-1']]);

        expect(conflictsOf(conflictsProgress(['route' => $route]), $current))->toBe([
            ['route.completed[1]', 'newer_value_kept'],
            ['route.milestones[0]', 'newer_value_kept'],
            ['route.favorites[0]', 'newer_value_kept'],
        ]);
    });

    it('does not mix the kinds of marks that share an item key', function () {
        $current = new ProgressAreas(routeMarks: [['kind' => 'favorite', 'itemKey' => 'shared', 'marked' => false, 'at' => CONFLICTS_CLOCK]]);

        expect(conflictsOf(conflictsProgress(['route' => conflictsRoute(['completed' => ['shared']])]), $current))->toBe([]);
    });

    it('reports a quiz answer with a real clock and another value', function (int $accountAnswer, ?string $at, array $expected) {
        $current = new ProgressAreas(routeQuiz: [['stepId' => 'fx-step-2', 'answer' => $accountAnswer, 'at' => $at]]);

        expect(conflictsOf(conflictsProgress(['route' => conflictsRoute(['quizAnswers' => ['fx-step-2' => 1]])]), $current))->toBe($expected);
    })->with([
        'other answer with clock' => [2, CONFLICTS_CLOCK, [['route.quizAnswers.fx-step-2', 'newer_value_kept']]],
        'other answer without clock' => [2, null, []],
        'same answer' => [1, CONFLICTS_CLOCK, []],
    ]);

    it('reports a route note with a real clock and another body, and ignores a note that the v1 left empty', function () {
        $current = new ProgressAreas(routeNotes: [
            ['language' => 'rust', 'field' => 'learned', 'body' => 'v2', 'at' => CONFLICTS_CLOCK],
            ['language' => 'rust', 'field' => 'next', 'body' => 'v2', 'at' => CONFLICTS_CLOCK],
            ['language' => 'go', 'field' => 'learned', 'body' => 'v2', 'at' => null],
        ]);
        $notes = ['rust' => ['learned' => 'v1', 'next' => ''], 'go' => ['learned' => 'v1', 'next' => '']];

        expect(conflictsOf(conflictsProgress(['route' => conflictsRoute(['notes' => $notes])]), $current))
            ->toBe([['route.notes.rust.learned', 'newer_value_kept']]);
    });

    it('reports the preferences with a real clock and another value', function () {
        $current = new ProgressAreas(preferences: [
            'routeLanguage' => ['value' => 'go', 'at' => CONFLICTS_CLOCK],
            'focusMinutes' => ['value' => 45, 'at' => CONFLICTS_CLOCK],
            'labSelected' => ['rust' => ['value' => 'fx-rust-02', 'at' => CONFLICTS_CLOCK], 'go' => ['value' => 'fx-go-02', 'at' => null]],
        ]);
        $progress = conflictsProgress(['route' => conflictsRoute(['language' => 'rust', 'minutes' => 25]), 'selected' => ['rust' => 'fx-rust-01', 'go' => 'fx-go-01']]);

        expect(conflictsOf($progress, $current))->toBe([
            ['route.language', 'newer_value_kept'],
            ['route.minutes', 'newer_value_kept'],
            ['lab.selected.rust', 'newer_value_kept'],
        ]);
    });

    it('reports nothing for equal preferences, a null v1 selection or an account without preferences', function () {
        $equal = new ProgressAreas(preferences: ['routeLanguage' => ['value' => 'rust', 'at' => CONFLICTS_CLOCK], 'focusMinutes' => null, 'labSelected' => ['rust' => ['value' => 'fx-rust-02', 'at' => CONFLICTS_CLOCK], 'go' => null]]);
        $progress = conflictsProgress(['route' => conflictsRoute(['language' => 'rust']), 'selected' => ['rust' => null, 'go' => 'fx-go-01']]);

        expect(conflictsOf($progress, $equal))->toBe([])
            ->and(conflictsOf($progress, new ProgressAreas))->toBe([]);
    });
});

it('lists the conflicts in the order of the v1: route, laboratory, campaign and workshops', function () {
    $current = new ProgressAreas(
        exercises: [['exerciseId' => 'fx-rust-01', 'reflection' => ['text' => 'v2', 'at' => CONFLICTS_CLOCK]]],
        campaignCheckpoints: [['worldId' => 'fx-world-1', 'passed' => false, 'lastAnswer' => ['value' => 2, 'at' => CONFLICTS_CLOCK]]],
        workshopProgress: [['workshopId' => 'fx-workshop-1', 'language' => 'go', 'answer' => ['value' => 2, 'at' => CONFLICTS_CLOCK]]],
        routeQuiz: [['stepId' => 'fx-step-2', 'answer' => 2, 'at' => CONFLICTS_CLOCK]],
    );
    $progress = conflictsProgress([
        'route' => conflictsRoute(['quizAnswers' => ['fx-step-2' => 1]]),
        'exercises' => [conflictsExercise(['reflection' => 'v1'])],
        'checkpoints' => [new LegacyCheckpoint('fx-world-1', false, 1)],
        'workshops' => [conflictsWorkshop(['answer' => 1])],
    ]);

    expect(array_column(conflictsOf($progress, $current), 0))->toBe([
        'route.quizAnswers.fx-step-2', 'lab.records.fx-rust-01.reflection', 'campaign.checkpoints.fx-world-1.lastAnswer', 'systems.records.go:fx-workshop-1.answer',
    ]);
});
