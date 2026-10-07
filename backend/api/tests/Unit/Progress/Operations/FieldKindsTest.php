<?php

use App\Progress\Operations\FieldKinds;
use App\Progress\Operations\OperationType;
use App\Progress\Operations\Rule;

it('registers the 25 field kinds with the rule of merge-rules.md section 4', function () {
    $expected = [
        'exercise.prediction.answer' => Rule::Lww,
        'exercise.reflection' => Rule::Lww,
        'exercise.customTest' => Rule::Lww,
        'checkpoint.lastAnswer' => Rule::Lww,
        'workshop.answer' => Rule::Lww,
        'workshop.note' => Rule::Lww,
        'route.quiz' => Rule::Lww,
        'route.note' => Rule::Lww,
        'preference.routeLanguage' => Rule::Lww,
        'preference.focusMinutes' => Rule::Lww,
        'preference.labSelectedRust' => Rule::Lww,
        'preference.labSelectedGo' => Rule::Lww,
        'exercise.review' => Rule::LwwGroup,
        'exercise.draft' => Rule::LwwGroup,
        'workshop.step' => Rule::Tombstone,
        'route.mark.step' => Rule::Tombstone,
        'route.mark.milestone' => Rule::Tombstone,
        'route.mark.favorite' => Rule::Tombstone,
        'exercise.assisted' => Rule::FlagOr,
        'exercise.solutionSeen' => Rule::FlagOr,
        'exercise.hintsRevealed' => Rule::Max,
        'exercise.predictionCorrect' => Rule::DatedFlag,
        'checkpoint.passed' => Rule::DatedFlag,
        'workshop.predictionCorrect' => Rule::DatedFlag,
        'workshop.objective' => Rule::Observed,
    ];

    expect(FieldKinds::all())->toHaveCount(25)->toEqual($expected);
});

it('lets every operation type write the kinds of http.md section 3.2', function (string $type, array $kinds) {
    expect(FieldKinds::writtenBy(OperationType::from($type)))->toBe($kinds);
})->with([
    ['exercise.prediction', ['exercise.prediction.answer', 'exercise.predictionCorrect']],
    ['exercise.assist', ['exercise.assisted', 'exercise.solutionSeen']],
    ['exercise.hints', ['exercise.hintsRevealed']],
    ['exercise.reflection', ['exercise.reflection']],
    ['exercise.customTest', ['exercise.customTest']],
    ['exercise.review', ['exercise.review']],
    ['exercise.draft', ['exercise.draft']],
    ['checkpoint.answer', ['checkpoint.lastAnswer', 'checkpoint.passed']],
    ['workshop.prediction', ['workshop.answer', 'workshop.predictionCorrect']],
    ['workshop.note', ['workshop.note']],
    ['workshop.objective', ['workshop.objective']],
    ['workshop.step', ['workshop.step']],
    ['route.mark', ['route.mark.step', 'route.mark.milestone', 'route.mark.favorite']],
    ['route.quiz', ['route.quiz']],
    ['route.note', ['route.note']],
    ['preference.set', ['preference.routeLanguage', 'preference.focusMinutes', 'preference.labSelectedRust', 'preference.labSelectedGo']],
]);

it('writes the columns and the clock that merge-rules.md names for each kind', function (string $kind, string $table, array $columns, ?string $clock) {
    $definition = FieldKinds::definition($kind);

    expect($definition->table)->toBe($table)
        ->and($definition->columns)->toBe($columns)
        ->and($definition->clockColumn)->toBe($clock);
})->with([
    ['exercise.prediction.answer', 'exercise_progress', ['prediction_answer'], 'prediction_answer_set_at'],
    ['exercise.reflection', 'exercise_progress', ['reflection'], 'reflection_set_at'],
    ['exercise.customTest', 'exercise_progress', ['custom_test'], 'custom_test_set_at'],
    ['checkpoint.lastAnswer', 'campaign_checkpoints', ['last_answer'], 'last_answer_set_at'],
    ['workshop.answer', 'workshop_progress', ['answer'], 'answer_set_at'],
    ['workshop.note', 'workshop_progress', ['note'], 'note_set_at'],
    ['route.quiz', 'route_quiz_answers', ['answer'], 'set_at'],
    ['route.note', 'route_notes', ['body'], 'set_at'],
    ['preference.routeLanguage', 'preferences', ['route_language'], 'route_language_set_at'],
    ['preference.focusMinutes', 'preferences', ['focus_minutes'], 'focus_minutes_set_at'],
    ['preference.labSelectedRust', 'preferences', ['lab_selected_rust'], 'lab_selected_rust_set_at'],
    ['preference.labSelectedGo', 'preferences', ['lab_selected_go'], 'lab_selected_go_set_at'],
    ['exercise.review', 'exercise_progress', ['confidence', 'reviewed_at', 'review_due_at'], 'review_set_at'],
    ['exercise.draft', 'drafts', ['code', 'starter_hash'], 'set_at'],
    ['workshop.step', 'workshop_step_marks', ['marked'], 'set_at'],
    ['route.mark.step', 'route_marks', ['marked'], 'set_at'],
    ['route.mark.milestone', 'route_marks', ['marked'], 'set_at'],
    ['route.mark.favorite', 'route_marks', ['marked'], 'set_at'],
    ['exercise.assisted', 'exercise_progress', ['assisted'], null],
    ['exercise.solutionSeen', 'exercise_progress', ['solution_seen'], null],
    ['exercise.hintsRevealed', 'exercise_progress', ['hints_revealed'], null],
    ['exercise.predictionCorrect', 'exercise_progress', ['prediction_correct'], 'prediction_correct_at'],
    ['checkpoint.passed', 'campaign_checkpoints', ['passed'], 'passed_at'],
    ['workshop.predictionCorrect', 'workshop_progress', ['prediction_correct'], 'prediction_correct_at'],
    ['workshop.objective', 'workshop_observations', [], 'observed_at'],
]);

it('marks the prose and code columns that are compared as bytes', function () {
    $binary = collect(FieldKinds::definitions())
        ->filter(fn ($definition) => $definition->binaryColumns !== [])
        ->map(fn ($definition) => $definition->binaryColumns)
        ->all();

    expect($binary)->toEqual([
        'exercise.reflection' => ['reflection'],
        'exercise.customTest' => ['custom_test'],
        'workshop.note' => ['note'],
        'route.note' => ['body'],
        'exercise.draft' => ['code'],
    ]);
});
