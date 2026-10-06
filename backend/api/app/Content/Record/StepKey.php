<?php

namespace App\Content\Record;

use App\Content\InvalidContent;

/** The stable key of a workshop step and its frozen v1 index, from the meta (ADR 0006 D14). */
final readonly class StepKey
{
    public function __construct(
        public string $id,
        public ?int $v1Index,
    ) {}

    public static function fromDocument(mixed $key, string $path): self
    {
        $id = is_array($key) ? ($key['id'] ?? null) : null;
        $v1Index = is_array($key) ? ($key['v1Index'] ?? null) : null;
        if (! is_string($id) || ($v1Index !== null && (! is_int($v1Index) || $v1Index < 0))) {
            throw InvalidContent::at('curriculum.meta.json', $path, 'se esperaba {id, v1Index}');
        }

        return new self($id, $v1Index);
    }
}
