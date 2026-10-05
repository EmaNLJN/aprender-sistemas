<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use stdClass;

/**
 * A Systems workshop of the document ↔ its rows: `workshops`, `workshop_objectives`,
 * `workshop_steps` and `workshop_related_exercises`. The `code` map has no table: it comes from
 * `exercises.workshop_id`. Steps do not publish their key or v1 index until D1 (ADR 0006 D14):
 * both come from the meta, in the same order.
 */
final class WorkshopCodec
{
    private FieldMap $workshop;

    private FieldMap $objective;

    private FieldMap $step;

    public function __construct()
    {
        $this->workshop = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'category' => new Field('category', FieldType::Text),
            'model' => new Field('model', FieldType::Text),
            'level' => new Field('level', FieldType::Text),
            'minutes' => new Field('minutes', FieldType::Number),
            'title' => new Field('title', FieldType::Text),
            'subtitle' => new Field('subtitle', FieldType::Text),
            'story' => new Field('story', FieldType::Text),
            'what' => new Field('what', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'limits' => new Field('limits', FieldType::Text),
            'uses' => new Field('uses_json', FieldType::Json),
            'prediction' => new Field('prediction_json', FieldType::Json),
            'sources' => new Field('sources_json', FieldType::Json),
            'bridge' => new Field('bridge_json', FieldType::Json),
        ], derived: ['objectives', 'steps', 'code', 'related']);

        $this->objective = new FieldMap([
            'id' => new Field('objective_key', FieldType::Text),
            'label' => new Field('label', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
        ]);

        $this->step = new FieldMap([
            'title' => new Field('title', FieldType::Text),
            'task' => new Field('task', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'done' => new Field('done', FieldType::Text),
        ]);
    }

    /**
     * @param  list<array{id: string, v1Index: ?int}>  $stepKeys  from the meta, one per published step
     * @param  list<string>  $languages  in the order of `languages.position`
     * @return array<string, list<array<string, int|string|null>>> rows by table
     */
    public function toRows(stdClass $workshop, string $domain, int $position, array $stepKeys, array $languages, string $path): array
    {
        $columns = $this->workshop->toColumns($workshop, $path);
        $id = $columns['id'];
        $rows = ['workshops' => [$columns + [
            'domain' => $domain,
            'position' => $position,
            'key_order' => PublishedJson::encode(FieldMap::keysOf($workshop)),
        ]]];

        $rows['workshop_objectives'] = [];
        foreach ($this->objects($workshop, 'objectives', $path) as $index => $objective) {
            $rows['workshop_objectives'][] = ['workshop_id' => $id]
                + $this->objective->toColumns($objective, "{$path}.objectives[{$index}]")
                + ['position' => $index, 'key_order' => PublishedJson::encode(FieldMap::keysOf($objective))];
        }

        $steps = $this->objects($workshop, 'steps', $path);
        if (count($steps) !== count($stepKeys)) {
            throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$id}", count($stepKeys).' claves para '.count($steps).' etapas: regenerá los dos archivos juntos');
        }
        $rows['workshop_steps'] = [];
        foreach ($steps as $index => $step) {
            $rows['workshop_steps'][] = ['workshop_id' => $id, 'step_key' => $stepKeys[$index]['id']]
                + $this->step->toColumns($step, "{$path}.steps[{$index}]")
                + [
                    'position' => $index,
                    'v1_position' => $stepKeys[$index]['v1Index'],
                    'key_order' => PublishedJson::encode(FieldMap::keysOf($step)),
                ];
        }

        $rows['workshop_related_exercises'] = [];
        $related = $workshop->related ?? null;
        foreach ($languages as $language) {
            $ids = $related instanceof stdClass ? ($related->{$language} ?? null) : null;
            if (! is_array($ids) || ! array_is_list($ids) || $ids === []) {
                throw InvalidContent::at('curriculum.json', "{$path}.related.{$language}", 'se esperaba una lista de ejercicios');
            }
            foreach ($ids as $index => $exerciseId) {
                $rows['workshop_related_exercises'][] = [
                    'workshop_id' => $id,
                    'exercise_id' => $exerciseId,
                    'position' => $index,
                ];
            }
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $workshop  `workshops` row
     * @param  list<array<string, mixed>>  $objectives  the workshop's objectives
     * @param  list<array<string, mixed>>  $steps  the workshop's steps
     * @param  array<string, list<string>>  $related  IDs by language, in `position` order
     * @param  array<string, string>  $code  core ID by language
     * @param  list<string>  $languages  in the order of `languages.position`
     */
    public function toRecord(array $workshop, array $objectives, array $steps, array $related, array $code, array $languages): stdClass
    {
        $byLanguage = function (array $values) use ($languages): stdClass {
            $map = new stdClass;
            foreach ($languages as $language) {
                $map->{$language} = $values[$language] ?? null;
            }

            return $map;
        };

        return $this->workshop->fromColumns($workshop, PublishedJson::decode($workshop['key_order']), [
            'objectives' => array_values(array_map(
                fn (array $row) => $this->objective->fromColumns($row, PublishedJson::decode($row['key_order'])),
                $objectives,
            )),
            'steps' => array_values(array_map(
                fn (array $row) => $this->step->fromColumns($row, PublishedJson::decode($row['key_order'])),
                $steps,
            )),
            'code' => $byLanguage($code),
            'related' => $byLanguage($related),
        ]);
    }

    /** @return list<stdClass> */
    private function objects(stdClass $record, string $key, string $path): array
    {
        $value = $record->{$key} ?? null;
        if (! is_array($value) || ! array_is_list($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista no vacía');
        }
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}.{$key}[{$index}]", 'se esperaba un objeto');
            }
        }

        return $value;
    }
}
