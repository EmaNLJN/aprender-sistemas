<?php

namespace App\Progress\Operations;

final class FieldKinds
{
    /** @return array<string, Rule> */
    public static function all(): array
    {
        $rules = [];
        foreach (self::definitions() as $name => $definition) {
            $rules[$name] = $definition->rule;
        }

        return $rules;
    }

    /** @return list<string> */
    public static function writtenBy(OperationType $type): array
    {
        $names = [];
        foreach (self::definitions() as $name => $definition) {
            if ($definition->operation === $type) {
                $names[] = $name;
            }
        }

        return $names;
    }

    public static function definition(string $name): FieldKind
    {
        return self::definitions()[$name];
    }

    /** @return array<string, FieldKind> */
    public static function definitions(): array
    {
        $definitions = [];
        foreach (self::catalog() as $definition) {
            $definitions[$definition->name] = $definition;
        }

        return $definitions;
    }

    /** @return list<FieldKind> */
    private static function catalog(): array
    {
        return [
            ...self::exerciseKinds(),
            ...self::checkpointAndWorkshopKinds(),
            ...self::routeKinds(),
            ...self::preferenceKinds(),
        ];
    }

    /** @return list<FieldKind> */
    private static function exerciseKinds(): array
    {
        $progress = 'exercise_progress';

        return [
            new FieldKind('exercise.prediction.answer', Rule::Lww, OperationType::ExercisePrediction, $progress, ['answer'], ['prediction_answer'], 'prediction_answer_set_at'),
            new FieldKind('exercise.reflection', Rule::Lww, OperationType::ExerciseReflection, $progress, ['text'], ['reflection'], 'reflection_set_at', ['reflection']),
            new FieldKind('exercise.customTest', Rule::Lww, OperationType::ExerciseCustomTest, $progress, ['text'], ['custom_test'], 'custom_test_set_at', ['custom_test']),
            new FieldKind('exercise.review', Rule::LwwGroup, OperationType::ExerciseReview, $progress, ['confidence', 'reviewedAt', 'reviewDueAt'], ['confidence', 'reviewed_at', 'review_due_at'], 'review_set_at'),
            new FieldKind('exercise.draft', Rule::LwwGroup, OperationType::ExerciseDraft, 'drafts', ['code', 'starterHash'], ['code', 'starter_hash'], 'set_at', ['code']),
            new FieldKind('exercise.assisted', Rule::FlagOr, OperationType::ExerciseAssist, $progress, ['assisted'], ['assisted'], null),
            new FieldKind('exercise.solutionSeen', Rule::FlagOr, OperationType::ExerciseAssist, $progress, ['solutionSeen'], ['solution_seen'], null),
            new FieldKind('exercise.hintsRevealed', Rule::Max, OperationType::ExerciseHints, $progress, ['revealed'], ['hints_revealed'], null),
            new FieldKind('exercise.predictionCorrect', Rule::DatedFlag, OperationType::ExercisePrediction, $progress, ['correct'], ['prediction_correct'], 'prediction_correct_at'),
        ];
    }

    /** @return list<FieldKind> */
    private static function checkpointAndWorkshopKinds(): array
    {
        return [
            new FieldKind('checkpoint.lastAnswer', Rule::Lww, OperationType::CheckpointAnswer, 'campaign_checkpoints', ['answer'], ['last_answer'], 'last_answer_set_at'),
            new FieldKind('checkpoint.passed', Rule::DatedFlag, OperationType::CheckpointAnswer, 'campaign_checkpoints', ['passed'], ['passed'], 'passed_at'),
            new FieldKind('workshop.answer', Rule::Lww, OperationType::WorkshopPrediction, 'workshop_progress', ['answer'], ['answer'], 'answer_set_at'),
            new FieldKind('workshop.predictionCorrect', Rule::DatedFlag, OperationType::WorkshopPrediction, 'workshop_progress', ['correct'], ['prediction_correct'], 'prediction_correct_at'),
            new FieldKind('workshop.note', Rule::Lww, OperationType::WorkshopNote, 'workshop_progress', ['text'], ['note'], 'note_set_at', ['note']),
            new FieldKind('workshop.objective', Rule::Observed, OperationType::WorkshopObjective, 'workshop_observations', [], [], 'observed_at'),
            new FieldKind('workshop.step', Rule::Tombstone, OperationType::WorkshopStep, 'workshop_step_marks', ['marked'], ['marked'], 'set_at'),
        ];
    }

    /** @return list<FieldKind> */
    private static function routeKinds(): array
    {
        return [
            new FieldKind('route.mark.step', Rule::Tombstone, OperationType::RouteMark, 'route_marks', ['marked'], ['marked'], 'set_at', [], ['kind', 'step']),
            new FieldKind('route.mark.milestone', Rule::Tombstone, OperationType::RouteMark, 'route_marks', ['marked'], ['marked'], 'set_at', [], ['kind', 'milestone']),
            new FieldKind('route.mark.favorite', Rule::Tombstone, OperationType::RouteMark, 'route_marks', ['marked'], ['marked'], 'set_at', [], ['kind', 'favorite']),
            new FieldKind('route.quiz', Rule::Lww, OperationType::RouteQuiz, 'route_quiz_answers', ['answer'], ['answer'], 'set_at'),
            new FieldKind('route.note', Rule::Lww, OperationType::RouteNote, 'route_notes', ['body'], ['body'], 'set_at', ['body']),
        ];
    }

    /** @return list<FieldKind> */
    private static function preferenceKinds(): array
    {
        $type = OperationType::PreferenceSet;
        $table = 'preferences';

        return [
            new FieldKind('preference.routeLanguage', Rule::Lww, $type, $table, ['value'], ['route_language'], 'route_language_set_at', [], ['name', 'routeLanguage']),
            new FieldKind('preference.focusMinutes', Rule::Lww, $type, $table, ['value'], ['focus_minutes'], 'focus_minutes_set_at', [], ['name', 'focusMinutes']),
            new FieldKind('preference.labSelectedRust', Rule::Lww, $type, $table, ['value'], ['lab_selected_rust'], 'lab_selected_rust_set_at', [], ['name', 'labSelectedRust']),
            new FieldKind('preference.labSelectedGo', Rule::Lww, $type, $table, ['value'], ['lab_selected_go'], 'lab_selected_go_set_at', [], ['name', 'labSelectedGo']),
        ];
    }
}
