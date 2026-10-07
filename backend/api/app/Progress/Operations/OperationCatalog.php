<?php

namespace App\Progress\Operations;

final class OperationCatalog
{
    private const TEXT_COLUMN_BYTES = 65535;

    private const MEDIUMTEXT_COLUMN_BYTES = 16777215;

    public static function spec(OperationType $type): OperationSpec
    {
        return match ($type) {
            OperationType::ExercisePrediction => self::exercise($type, [
                FieldSpec::of('answer', FieldType::Answer),
                FieldSpec::of('correct', FieldType::Bool),
                FieldSpec::of('contentVersion', FieldType::ContentVersion),
            ]),
            OperationType::ExerciseAssist => self::exercise($type, [
                FieldSpec::optional('assisted', FieldType::TrueFlag),
                FieldSpec::optional('solutionSeen', FieldType::TrueFlag),
            ]),
            OperationType::ExerciseHints => self::exercise($type, [FieldSpec::of('revealed', FieldType::HintCount)]),
            OperationType::ExerciseReflection => self::exercise($type, [FieldSpec::text('text', 'reflection_chars', self::TEXT_COLUMN_BYTES)]),
            OperationType::ExerciseCustomTest => self::exercise($type, [FieldSpec::text('text', 'custom_test_chars', self::TEXT_COLUMN_BYTES)]),
            OperationType::ExerciseReview => self::exercise($type, [
                FieldSpec::of('confidence', FieldType::Confidence),
                FieldSpec::of('reviewedAt', FieldType::StudyInstant),
                FieldSpec::of('reviewDueAt', FieldType::StudyInstant),
            ]),
            OperationType::ExerciseDraft => self::exercise($type, [
                FieldSpec::text('code', 'draft_chars', self::MEDIUMTEXT_COLUMN_BYTES, nullable: true),
                FieldSpec::of('starterHash', FieldType::StarterHash),
            ]),
            OperationType::CheckpointAnswer => new OperationSpec($type, ['world_id' => 'worldId'], [
                FieldSpec::of('worldId', FieldType::Key),
                FieldSpec::of('answer', FieldType::Answer),
                FieldSpec::of('passed', FieldType::Bool),
                FieldSpec::of('contentVersion', FieldType::ContentVersion),
            ]),
            OperationType::WorkshopPrediction => self::workshop($type, [
                FieldSpec::of('answer', FieldType::Answer),
                FieldSpec::of('correct', FieldType::Bool),
                FieldSpec::of('contentVersion', FieldType::ContentVersion),
            ]),
            OperationType::WorkshopNote => self::workshop($type, [FieldSpec::text('text', 'workshop_note_chars', self::TEXT_COLUMN_BYTES)]),
            OperationType::WorkshopObjective => self::workshop($type, [FieldSpec::of('objectiveKey', FieldType::Key)], ['objective_key' => 'objectiveKey']),
            OperationType::WorkshopStep => self::workshop($type, [
                FieldSpec::of('stepKey', FieldType::Key),
                FieldSpec::of('marked', FieldType::Bool),
            ], ['step_key' => 'stepKey']),
            OperationType::RouteMark => new OperationSpec($type, ['kind' => 'kind', 'item_key' => 'itemKey'], [
                FieldSpec::of('kind', FieldType::MarkKind),
                FieldSpec::of('itemKey', FieldType::Key),
                FieldSpec::of('marked', FieldType::Bool),
            ]),
            OperationType::RouteQuiz => new OperationSpec($type, ['step_id' => 'stepId'], [
                FieldSpec::of('stepId', FieldType::Key),
                FieldSpec::of('answer', FieldType::Answer),
                FieldSpec::of('contentVersion', FieldType::ContentVersion),
            ]),
            OperationType::RouteNote => new OperationSpec($type, ['language' => 'language', 'field' => 'field'], [
                FieldSpec::of('language', FieldType::Language),
                FieldSpec::of('field', FieldType::NoteField),
                FieldSpec::text('body', 'route_note_chars', self::MEDIUMTEXT_COLUMN_BYTES),
            ]),
            OperationType::PreferenceSet => new OperationSpec($type, [], [
                FieldSpec::of('name', FieldType::PreferenceName),
                FieldSpec::of('value', FieldType::PreferenceValue),
            ]),
        };
    }

    /** @param list<FieldSpec> $fields */
    private static function exercise(OperationType $type, array $fields): OperationSpec
    {
        return new OperationSpec($type, ['exercise_id' => 'exerciseId'], [FieldSpec::of('exerciseId', FieldType::ExerciseKey), ...$fields]);
    }

    /**
     * @param  list<FieldSpec>  $fields
     * @param  array<string, string>  $extraKeyColumns
     */
    private static function workshop(OperationType $type, array $fields, array $extraKeyColumns = []): OperationSpec
    {
        return new OperationSpec(
            $type,
            ['workshop_id' => 'workshopId', 'language' => 'language', ...$extraKeyColumns],
            [FieldSpec::of('workshopId', FieldType::Key), FieldSpec::of('language', FieldType::Language), ...$fields],
        );
    }
}
