<?php

namespace App\Content\Record;

use stdClass;

/** A source of the guide: `guide.sources[i]` of the document ↔ a `guide_sources` row. */
final readonly class GuideSource
{
    public const KEYS = ['title', 'url', 'note'];

    public function __construct(
        public int $position,
        public string $title,
        public string $url,
        public string $note,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $source, int $position, string $path): self
    {
        $fields = DocumentFields::of($source, $path, self::KEYS);

        return new self(
            position: $position,
            title: $fields->text('title'),
            url: $fields->text('url'),
            note: $fields->text('note'),
            keyOrder: $fields->keyOrder(),
        );
    }

    /** @param array<string, mixed> $row a `guide_sources` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'guide_sources');

        return new self(
            position: $fields->int('position'),
            title: $fields->string('title'),
            url: $fields->string('url'),
            note: $fields->string('note'),
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'title' => $this->title,
            'url' => $this->url,
            'note' => $this->note,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'title' => $this->title,
            'url' => $this->url,
            'note' => $this->note,
        ]);
    }
}
