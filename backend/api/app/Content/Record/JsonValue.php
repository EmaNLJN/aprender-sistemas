<?php

namespace App\Content\Record;

use App\Content\PublishedJson;

final readonly class JsonValue
{
    private function __construct(public string $json) {}

    public static function fromDocument(mixed $value): self
    {
        return new self(PublishedJson::encode($value));
    }

    public static function fromRow(string $json): self
    {
        return new self($json);
    }

    public function toRow(): string
    {
        return $this->json;
    }

    public function toPublished(): mixed
    {
        return PublishedJson::decode($this->json);
    }
}
