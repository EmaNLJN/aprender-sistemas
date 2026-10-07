<?php

namespace App\Progress\Snapshot;

use App\Content\Record\RowFields;

final class PreferencesWire
{
    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function of(array $row): array
    {
        $fields = new RowFields($row, 'preferences');

        return [
            'routeLanguage' => Wire::clockedOrNull($fields->nullableString('route_language'), $fields->nullableString('route_language_set_at')),
            'focusMinutes' => Wire::clockedOrNull($fields->nullableInt('focus_minutes'), $fields->nullableString('focus_minutes_set_at')),
            'labSelected' => [
                'rust' => Wire::clockedOrNull($fields->nullableString('lab_selected_rust'), $fields->nullableString('lab_selected_rust_set_at')),
                'go' => Wire::clockedOrNull($fields->nullableString('lab_selected_go'), $fields->nullableString('lab_selected_go_set_at')),
            ],
            'revision' => $fields->int('revision'),
        ];
    }
}
