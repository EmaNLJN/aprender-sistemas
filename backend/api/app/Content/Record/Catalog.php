<?php

namespace App\Content\Record;

use App\Content\InvalidContent;

final readonly class Catalog
{
    public function __construct(
        public string $code,
        public string $sliceBy,
        public ?int $chainPosition,
    ) {}

    public static function fromDocument(mixed $entry, string $path): self
    {
        $code = is_array($entry) ? ($entry['code'] ?? null) : null;
        $sliceBy = is_array($entry) ? ($entry['sliceBy'] ?? null) : null;
        $chainPosition = is_array($entry) ? ($entry['chainPosition'] ?? null) : null;
        if (! is_string($code) || ! in_array($sliceBy, ['language', 'domain'], true)
            || ($chainPosition !== null && (! is_int($chainPosition) || $chainPosition < 1))) {
            throw InvalidContent::at('curriculum.meta.json', $path, 'se esperaba {code, sliceBy, chainPosition}');
        }

        return new self($code, $sliceBy, $chainPosition);
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return ['code' => $this->code, 'slice_by' => $this->sliceBy, 'chain_position' => $this->chainPosition];
    }
}
