<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use Illuminate\Support\Arr;
use stdClass;

/**
 * A campaign world of the document ↔ its rows: `worlds` and `world_exercises`. The three ID
 * fields are split by role: `trainingIds` are the `training` rows, `challengeIds` the `challenge`
 * rows plus the boss (the last challenge), and `bossId` the `boss` row.
 */
final class WorldCodec
{
    private FieldMap $world;

    public function __construct()
    {
        $this->world = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'level' => new Field('level', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'subtitle' => new Field('subtitle', FieldType::Text),
            'story' => new Field('story', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'badge' => new Field('badge', FieldType::Text),
            'concepts' => new Field('concepts_json', FieldType::Json),
            'guide' => new Field('guide_json', FieldType::Json),
            'checkpoint' => new Field('checkpoint_json', FieldType::Json),
            'sources' => new Field('sources_json', FieldType::Json),
        ], derived: ['trainingIds', 'challengeIds', 'bossId']);
    }

    /** @return array<string, list<array<string, int|string|null>>> rows by table */
    public function toRows(stdClass $world, string $language, int $position, string $path): array
    {
        $columns = $this->world->toColumns($world, $path);
        $id = $columns['id'];
        $training = $this->ids($world, 'trainingIds', $path);
        $challenges = $this->ids($world, 'challengeIds', $path);
        $boss = $world->bossId ?? null;
        if ($boss !== Arr::last($challenges)) {
            throw InvalidContent::at('curriculum.json', "{$path}.bossId", 'el jefe tiene que ser el último de challengeIds');
        }

        $members = [];
        foreach ($training as $index => $exerciseId) {
            $members[] = ['world_id' => $id, 'exercise_id' => $exerciseId, 'role' => 'training', 'position' => $index];
        }
        foreach ($challenges as $index => $exerciseId) {
            $role = $exerciseId === $boss ? 'boss' : 'challenge';
            $members[] = ['world_id' => $id, 'exercise_id' => $exerciseId, 'role' => $role, 'position' => $index];
        }

        return [
            'worlds' => [$columns + [
                'language' => $language,
                'position' => $position,
                'key_order' => PublishedJson::encode(FieldMap::keysOf($world)),
            ]],
            'world_exercises' => $members,
        ];
    }

    /**
     * @param  array<string, mixed>  $world  `worlds` row
     * @param  list<array<string, mixed>>  $members  the world's `world_exercises` rows
     */
    public function toRecord(array $world, array $members): stdClass
    {
        $ofRole = fn (array $roles): array => collect($members)
            ->whereIn('role', $roles, true)
            ->sortBy('position')
            ->pluck('exercise_id')
            ->all();

        return $this->world->fromColumns($world, PublishedJson::decode($world['key_order']), [
            'trainingIds' => $ofRole(['training']),
            'challengeIds' => $ofRole(['challenge', 'boss']),
            'bossId' => $ofRole(['boss'])[0] ?? null,
        ]);
    }

    /** @return list<string> */
    private function ids(stdClass $world, string $key, string $path): array
    {
        $value = $world->{$key} ?? null;
        if (! is_array($value) || ! Arr::isList($value) || $value === [] || ! Arr::every($value, fn (mixed $id) => is_string($id))) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista de IDs');
        }

        return $value;
    }
}
