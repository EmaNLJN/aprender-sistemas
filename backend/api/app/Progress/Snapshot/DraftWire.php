<?php

namespace App\Progress\Snapshot;

use App\Content\Record\RowFields;

final class DraftWire
{
    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function of(array $row): array
    {
        $fields = new RowFields($row, 'drafts');

        return [
            'exerciseId' => $fields->string('exercise_id'),
            'code' => $fields->nullableString('code'),
            'starterHash' => $fields->nullableString('starter_hash'),
            'at' => Wire::instant($fields->nullableString('set_at')),
            'revision' => $fields->int('revision'),
        ];
    }
}
