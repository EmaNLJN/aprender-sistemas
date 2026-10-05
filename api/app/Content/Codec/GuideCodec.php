<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use stdClass;

/**
 * La guía del documento ↔ sus seis tablas: `guide_resources`, `guide_sources`, `guide_tracks`,
 * `guide_modules`, `guide_steps` y `guide_step_resources`. La raíz de la guía no tiene fila: sus
 * claves son siempre estas, en este orden.
 */
final class GuideCodec
{
    /** @var list<string> */
    private const ROOT = ['resources', 'tracks', 'sources'];

    private FieldMap $resource;

    private FieldMap $source;

    private FieldMap $track;

    private FieldMap $module;

    private FieldMap $step;

    public function __construct()
    {
        $this->resource = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'url' => new Field('url', FieldType::Text),
            'languages' => new Field('languages_json', FieldType::Json),
            'category' => new Field('category', FieldType::Text),
            'cost' => new Field('cost', FieldType::Text),
            'format' => new Field('format', FieldType::Text),
            'description' => new Field('description', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'caveat' => new Field('caveat', FieldType::Text),
            'featured' => new Field('featured', FieldType::Flag),
        ]);
        $this->source = new FieldMap([
            'title' => new Field('title', FieldType::Text),
            'url' => new Field('url', FieldType::Text),
            'note' => new Field('note', FieldType::Text),
        ]);
        $this->track = new FieldMap([
            'title' => new Field('title', FieldType::Text),
            'description' => new Field('description', FieldType::Text),
        ], derived: ['modules']);
        $this->module = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'subtitle' => new Field('subtitle', FieldType::Text),
        ], derived: ['steps']);
        $this->step = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'minutes' => new Field('minutes', FieldType::Number),
            'objective' => new Field('objective', FieldType::Text),
            'task' => new Field('task', FieldType::Text),
            'doneWhen' => new Field('done_when', FieldType::Text),
            'quiz' => new Field('quiz_json', FieldType::Json),
        ], derived: ['resourceIds']);
    }

    /**
     * @param  list<string>  $languages  en el orden de `languages.position`
     * @return array<string, list<array<string, int|string|null>>> filas por tabla
     */
    public function toRows(stdClass $guide, array $languages, string $path): array
    {
        if (FieldMap::keysOf($guide) !== self::ROOT) {
            throw InvalidContent::at('curriculum.json', $path, 'las claves de la guía tienen que ser resources, tracks y sources, en ese orden');
        }
        $rows = array_fill_keys(
            ['guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'],
            [],
        );

        foreach ($this->objects($guide->resources, "{$path}.resources") as $index => $resource) {
            $rows['guide_resources'][] = $this->resource->toColumns($resource, "{$path}.resources[{$index}]")
                + ['position' => $index, 'key_order' => PublishedJson::encode(FieldMap::keysOf($resource))];
        }
        foreach ($this->objects($guide->sources, "{$path}.sources") as $index => $source) {
            $rows['guide_sources'][] = $this->source->toColumns($source, "{$path}.sources[{$index}]")
                + ['position' => $index, 'key_order' => PublishedJson::encode(FieldMap::keysOf($source))];
        }

        $tracks = $guide->tracks;
        if (! $tracks instanceof stdClass || FieldMap::keysOf($tracks) !== $languages) {
            throw InvalidContent::at('curriculum.json', "{$path}.tracks", 'un recorrido por lenguaje, en el orden de languages: '.implode(', ', $languages));
        }
        foreach ($languages as $language) {
            $trackPath = "{$path}.tracks.{$language}";
            $track = $tracks->{$language};
            if (! $track instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', $trackPath, 'se esperaba un objeto');
            }
            $rows['guide_tracks'][] = ['language' => $language] + $this->track->toColumns($track, $trackPath)
                + ['key_order' => PublishedJson::encode(FieldMap::keysOf($track))];
            foreach ($this->objects($track->modules ?? null, "{$trackPath}.modules") as $moduleIndex => $module) {
                $modulePath = "{$trackPath}.modules[{$moduleIndex}]";
                $moduleColumns = $this->module->toColumns($module, $modulePath);
                $rows['guide_modules'][] = $moduleColumns + [
                    'track_language' => $language,
                    'position' => $moduleIndex,
                    'key_order' => PublishedJson::encode(FieldMap::keysOf($module)),
                ];
                foreach ($this->objects($module->steps ?? null, "{$modulePath}.steps") as $stepIndex => $step) {
                    $stepPath = "{$modulePath}.steps[{$stepIndex}]";
                    $stepColumns = $this->step->toColumns($step, $stepPath);
                    $rows['guide_steps'][] = $stepColumns + [
                        'module_id' => $moduleColumns['id'],
                        'position' => $stepIndex,
                        'key_order' => PublishedJson::encode(FieldMap::keysOf($step)),
                    ];
                    $resourceIds = $step->resourceIds ?? null;
                    if (! is_array($resourceIds) || ! array_is_list($resourceIds) || $resourceIds === []) {
                        throw InvalidContent::at('curriculum.json', "{$stepPath}.resourceIds", 'se esperaba una lista de recursos');
                    }
                    foreach ($resourceIds as $index => $resourceId) {
                        $rows['guide_step_resources'][] = [
                            'step_id' => $stepColumns['id'],
                            'resource_id' => $resourceId,
                            'position' => $index,
                        ];
                    }
                }
            }
        }

        return $rows;
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows  filas activas de las seis tablas
     * @param  list<string>  $languages  en el orden de `languages.position`
     */
    public function toRecord(array $rows, array $languages): stdClass
    {
        $byPosition = function (array $list): array {
            usort($list, fn (array $a, array $b) => $a['position'] <=> $b['position']);

            return $list;
        };
        $record = fn (FieldMap $map, array $row, array $derived = []) => $map->fromColumns($row, PublishedJson::decode($row['key_order']), $derived);

        $tracks = new stdClass;
        foreach ($languages as $language) {
            $trackRow = $this->only($rows['guide_tracks'], 'language', $language);
            $modules = [];
            foreach ($byPosition($this->all($rows['guide_modules'], 'track_language', $language)) as $moduleRow) {
                $steps = [];
                foreach ($byPosition($this->all($rows['guide_steps'], 'module_id', $moduleRow['id'])) as $stepRow) {
                    $resourceIds = array_map(
                        fn (array $link) => $link['resource_id'],
                        $byPosition($this->all($rows['guide_step_resources'], 'step_id', $stepRow['id'])),
                    );
                    $steps[] = $record($this->step, $stepRow, ['resourceIds' => $resourceIds]);
                }
                $modules[] = $record($this->module, $moduleRow, ['steps' => $steps]);
            }
            $tracks->{$language} = $record($this->track, $trackRow, ['modules' => $modules]);
        }

        $guide = new stdClass;
        $guide->resources = array_map(fn (array $row) => $record($this->resource, $row), $byPosition($rows['guide_resources']));
        $guide->tracks = $tracks;
        $guide->sources = array_map(fn (array $row) => $record($this->source, $row), $byPosition($rows['guide_sources']));

        return $guide;
    }

    /** @return list<stdClass> */
    private function objects(mixed $value, string $path): array
    {
        if (! is_array($value) || ! array_is_list($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', $path, 'se esperaba una lista no vacía');
        }
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}[{$index}]", 'se esperaba un objeto');
            }
        }

        return $value;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function all(array $rows, string $column, string $value): array
    {
        return array_values(array_filter($rows, fn (array $row) => $row[$column] === $value));
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function only(array $rows, string $column, string $value): array
    {
        return $this->all($rows, $column, $value)[0]
            ?? throw new InvalidContent("guide_tracks: no hay una fila activa con {$column} = {$value}");
    }
}
