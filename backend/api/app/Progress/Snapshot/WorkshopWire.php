<?php

namespace App\Progress\Snapshot;

use App\Content\Record\RowFields;

final class WorkshopWire
{
    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function progress(array $row): array
    {
        $fields = new RowFields($row, 'workshop_progress');
        $note = $fields->nullableString('note');

        return [
            'workshopId' => $fields->string('workshop_id'),
            'language' => $fields->string('language'),
            'codeSealed' => $fields->flag('code_sealed'),
            'predictionCorrect' => Wire::clocked($fields->flag('prediction_correct'), $fields->nullableString('prediction_correct_at')),
            'answer' => Wire::clockedOrNull($fields->nullableInt('answer'), $fields->nullableString('answer_set_at')),
            'note' => $note === null ? null : ['text' => $note, 'at' => Wire::instant($fields->nullableString('note_set_at'))],
            'revision' => $fields->int('revision'),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function objective(array $row): array
    {
        $fields = new RowFields($row, 'workshop_observations');

        return [
            'workshopId' => $fields->string('workshop_id'),
            'language' => $fields->string('language'),
            'objectiveKey' => $fields->string('objective_key'),
            'observedAt' => Wire::instant($fields->nullableString('observed_at')),
            'revision' => $fields->int('revision'),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function step(array $row): array
    {
        $fields = new RowFields($row, 'workshop_step_marks');

        return [
            'workshopId' => $fields->string('workshop_id'),
            'language' => $fields->string('language'),
            'stepKey' => $fields->string('step_key'),
            'marked' => $fields->flag('marked'),
            'at' => Wire::instant($fields->nullableString('set_at')),
            'revision' => $fields->int('revision'),
        ];
    }
}
