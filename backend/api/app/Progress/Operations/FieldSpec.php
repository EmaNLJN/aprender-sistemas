<?php

namespace App\Progress\Operations;

final readonly class FieldSpec
{
    private function __construct(
        public string $name,
        public FieldType $type,
        public bool $optional,
        public ?string $limitKey,
        public int $columnBytes,
    ) {}

    public static function of(string $name, FieldType $type): self
    {
        return new self($name, $type, false, null, 0);
    }

    public static function optional(string $name, FieldType $type): self
    {
        return new self($name, $type, true, null, 0);
    }

    public static function text(string $name, string $limitKey, int $columnBytes, bool $nullable = false): self
    {
        return new self($name, $nullable ? FieldType::NullableText : FieldType::Text, false, $limitKey, $columnBytes);
    }
}
