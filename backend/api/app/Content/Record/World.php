<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use Illuminate\Support\Arr;
use stdClass;

/**
 * A campaign world: `campaign.<language>[i]` of the document ↔ a `worlds` row and its
 * `world_exercises`. `trainingIds` are the `training` members, `challengeIds` the `challenge`
 * members plus the boss (the last challenge), and `bossId` the `boss` member.
 */
final readonly class World
{
    public const KEYS = ['id', 'level', 'title', 'subtitle', 'story', 'why', 'badge', 'concepts', 'guide', 'checkpoint', 'sources', 'trainingIds', 'challengeIds', 'bossId'];

    /** @param list<WorldExercise> $members */
    public function __construct(
        public string $id,
        public string $language,
        public int $position,
        public string $level,
        public string $title,
        public string $subtitle,
        public string $story,
        public string $why,
        public string $badge,
        public JsonValue $concepts,
        public JsonValue $guide,
        public JsonValue $checkpoint,
        public JsonValue $sources,
        public array $members,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $world, string $language, int $position, string $path): self
    {
        $fields = DocumentFields::of($world, $path, self::KEYS);
        $id = $fields->text('id');
        $level = $fields->text('level');
        $title = $fields->text('title');
        $subtitle = $fields->text('subtitle');
        $story = $fields->text('story');
        $why = $fields->text('why');
        $badge = $fields->text('badge');
        $concepts = $fields->json('concepts');
        $guide = $fields->json('guide');
        $checkpoint = $fields->json('checkpoint');
        $sources = $fields->json('sources');

        $trainingIds = self::ids($world, 'trainingIds', $path);
        $challengeIds = self::ids($world, 'challengeIds', $path);
        $bossId = $world->bossId ?? null;
        if ($bossId !== Arr::last($challengeIds)) {
            throw InvalidContent::at('curriculum.json', "{$path}.bossId", 'el jefe tiene que ser el último de challengeIds');
        }

        $members = [];
        foreach ($trainingIds as $index => $exerciseId) {
            $members[] = new WorldExercise($id, $exerciseId, WorldRole::Training, $index);
        }
        foreach ($challengeIds as $index => $exerciseId) {
            $role = $exerciseId === $bossId ? WorldRole::Boss : WorldRole::Challenge;
            $members[] = new WorldExercise($id, $exerciseId, $role, $index);
        }

        return new self($id, $language, $position, $level, $title, $subtitle, $story, $why, $badge, $concepts, $guide, $checkpoint, $sources, $members, $fields->keyOrder());
    }

    /**
     * @param  array<string, mixed>  $row  a `worlds` row
     * @param  list<WorldExercise>  $members  the world's `world_exercises`
     */
    public static function fromRow(array $row, array $members): self
    {
        $fields = new RowFields($row, 'worlds');

        return new self(
            id: $fields->string('id'),
            language: $fields->string('language'),
            position: $fields->int('position'),
            level: $fields->string('level'),
            title: $fields->string('title'),
            subtitle: $fields->string('subtitle'),
            story: $fields->string('story'),
            why: $fields->string('why'),
            badge: $fields->string('badge'),
            concepts: $fields->json('concepts_json'),
            guide: $fields->json('guide_json'),
            checkpoint: $fields->json('checkpoint_json'),
            sources: $fields->json('sources_json'),
            members: $members,
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'level' => $this->level,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'story' => $this->story,
            'why' => $this->why,
            'badge' => $this->badge,
            'concepts_json' => $this->concepts->toRow(),
            'guide_json' => $this->guide->toRow(),
            'checkpoint_json' => $this->checkpoint->toRow(),
            'sources_json' => $this->sources->toRow(),
            'language' => $this->language,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    /** @return array<string, list<array<string, int|string|null>>> rows by table */
    public function rowsByTable(): array
    {
        $memberRows = [];
        foreach ($this->members as $member) {
            $memberRows[] = $member->toRow();
        }

        return ['worlds' => [$this->toRow()], 'world_exercises' => $memberRows];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'id' => $this->id,
            'level' => $this->level,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'story' => $this->story,
            'why' => $this->why,
            'badge' => $this->badge,
            'concepts' => $this->concepts->toPublished(),
            'guide' => $this->guide->toPublished(),
            'checkpoint' => $this->checkpoint->toPublished(),
            'sources' => $this->sources->toPublished(),
            'trainingIds' => $this->exerciseIds(WorldRole::Training),
            'challengeIds' => $this->exerciseIds(WorldRole::Challenge, WorldRole::Boss),
            'bossId' => $this->exerciseIds(WorldRole::Boss)[0] ?? null,
        ]);
    }

    /** @return list<string> */
    private function exerciseIds(WorldRole ...$roles): array
    {
        $ofRoles = [];
        foreach ($this->members as $member) {
            if (in_array($member->role, $roles, true)) {
                $ofRoles[] = $member;
            }
        }
        usort($ofRoles, fn (WorldExercise $a, WorldExercise $b) => $a->position <=> $b->position);

        $ids = [];
        foreach ($ofRoles as $member) {
            $ids[] = $member->exerciseId;
        }

        return $ids;
    }

    /** @return list<string> */
    private static function ids(stdClass $world, string $key, string $path): array
    {
        $value = $world->{$key} ?? null;
        $invalid = InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista de IDs');
        if (! is_array($value) || ! Arr::isList($value) || $value === []) {
            throw $invalid;
        }

        $ids = [];
        foreach ($value as $id) {
            if (! is_string($id)) {
                throw $invalid;
            }
            $ids[] = $id;
        }

        return $ids;
    }
}
