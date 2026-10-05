<?php

namespace App\Content\Record;

use stdClass;

final readonly class GuideResource
{
    public const KEYS = ['id', 'title', 'url', 'languages', 'category', 'cost', 'format', 'description', 'why', 'caveat', 'featured'];

    public function __construct(
        public string $id,
        public int $position,
        public string $title,
        public string $url,
        public JsonValue $languages,
        public string $category,
        public string $cost,
        public string $format,
        public string $description,
        public string $why,
        public string $caveat,
        public bool $featured,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $resource, int $position, string $path): self
    {
        $fields = DocumentFields::of($resource, $path, self::KEYS);

        return new self(
            id: $fields->text('id'),
            position: $position,
            title: $fields->text('title'),
            url: $fields->text('url'),
            languages: $fields->json('languages'),
            category: $fields->text('category'),
            cost: $fields->text('cost'),
            format: $fields->text('format'),
            description: $fields->text('description'),
            why: $fields->text('why'),
            caveat: $fields->text('caveat'),
            featured: $fields->flag('featured'),
            keyOrder: $fields->keyOrder(),
        );
    }

    /** @param array<string, mixed> $row a `guide_resources` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'guide_resources');

        return new self(
            id: $fields->string('id'),
            position: $fields->int('position'),
            title: $fields->string('title'),
            url: $fields->string('url'),
            languages: $fields->json('languages_json'),
            category: $fields->string('category'),
            cost: $fields->string('cost'),
            format: $fields->string('format'),
            description: $fields->string('description'),
            why: $fields->string('why'),
            caveat: $fields->string('caveat'),
            featured: $fields->flag('featured'),
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'url' => $this->url,
            'languages_json' => $this->languages->toRow(),
            'category' => $this->category,
            'cost' => $this->cost,
            'format' => $this->format,
            'description' => $this->description,
            'why' => $this->why,
            'caveat' => $this->caveat,
            'featured' => $this->featured ? 1 : 0,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'id' => $this->id,
            'title' => $this->title,
            'url' => $this->url,
            'languages' => $this->languages->toPublished(),
            'category' => $this->category,
            'cost' => $this->cost,
            'format' => $this->format,
            'description' => $this->description,
            'why' => $this->why,
            'caveat' => $this->caveat,
            'featured' => $this->featured,
        ]);
    }
}
