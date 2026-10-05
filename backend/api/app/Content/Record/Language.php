<?php

namespace App\Content\Record;

/** A language of the curriculum, which fixes the order of every per-language map ↔ a `languages` row. */
final readonly class Language
{
    public function __construct(
        public string $code,
        public int $position,
    ) {}

    /** @param array<string, mixed> $row a `languages` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'languages');

        return new self($fields->string('code'), $fields->int('position'));
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return ['code' => $this->code, 'position' => $this->position];
    }
}
