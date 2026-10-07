<?php

namespace App\Progress\Snapshot;

use App\Content\Record\RowFields;

final class CampaignWire
{
    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function checkpoint(array $row): array
    {
        $fields = new RowFields($row, 'campaign_checkpoints');

        return [
            'worldId' => $fields->string('world_id'),
            'passed' => $fields->flag('passed'),
            'passedAt' => Wire::instant($fields->nullableString('passed_at')),
            'lastAnswer' => Wire::clockedOrNull($fields->nullableInt('last_answer'), $fields->nullableString('last_answer_set_at')),
            'revision' => $fields->int('revision'),
        ];
    }
}
