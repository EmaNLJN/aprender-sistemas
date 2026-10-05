<?php

namespace App\Content\Codec;

use App\Content\PublishedJson;
use stdClass;

final class AtlasCodec
{
    private FieldMap $concept;

    public function __construct()
    {
        $this->concept = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'level' => new Field('level', FieldType::Text),
            'category' => new Field('category', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'summary' => new Field('summary', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'code' => new Field('code', FieldType::Text),
            'explanation' => new Field('explanation', FieldType::Text),
            'comparison' => new Field('comparison', FieldType::Text),
            'pitfall' => new Field('pitfall', FieldType::Text),
            'quiz' => new Field('quiz_json', FieldType::Json),
            'labId' => new Field('lab_exercise_id', FieldType::Text),
            'source' => new Field('source_json', FieldType::Json),
            'furtherSources' => new Field('further_sources_json', FieldType::Json, optional: true),
        ]);
    }

    /** @return array<string, list<array<string, int|string|null>>> rows by table */
    public function toRows(stdClass $concept, string $language, int $position, string $path): array
    {
        return ['atlas_concepts' => [$this->concept->toColumns($concept, $path) + [
            'language' => $language,
            'position' => $position,
            'key_order' => PublishedJson::encode(FieldMap::keysOf($concept)),
        ]]];
    }

    /** @param array<string, mixed> $row `atlas_concepts` row */
    public function toRecord(array $row): stdClass
    {
        return $this->concept->fromColumns($row, PublishedJson::decode($row['key_order']));
    }
}
