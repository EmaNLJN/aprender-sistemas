<?php

namespace App\Progress\Snapshot;

use App\Content\Record\RowFields;

final class RouteWire
{
    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function mark(array $row): array
    {
        $fields = new RowFields($row, 'route_marks');

        return [
            'kind' => $fields->string('kind'),
            'itemKey' => $fields->string('item_key'),
            'marked' => $fields->flag('marked'),
            'at' => Wire::instant($fields->nullableString('set_at')),
            'revision' => $fields->int('revision'),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function quiz(array $row): array
    {
        $fields = new RowFields($row, 'route_quiz_answers');

        return [
            'stepId' => $fields->string('step_id'),
            'answer' => $fields->int('answer'),
            'at' => Wire::instant($fields->nullableString('set_at')),
            'revision' => $fields->int('revision'),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function note(array $row): array
    {
        $fields = new RowFields($row, 'route_notes');

        return [
            'language' => $fields->string('language'),
            'field' => $fields->string('field'),
            'body' => $fields->string('body'),
            'at' => Wire::instant($fields->nullableString('set_at')),
            'revision' => $fields->int('revision'),
        ];
    }
}
