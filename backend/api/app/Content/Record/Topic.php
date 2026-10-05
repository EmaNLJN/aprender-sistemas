<?php

namespace App\Content\Record;

/** The label of a topic, shared by the exercises of a language with the same `topicId`: a `topics` row. */
final readonly class Topic
{
    public function __construct(
        public string $language,
        public string $topicKey,
        public string $label,
    ) {}

    /** @param array<string, mixed> $row a `topics` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'topics');

        return new self(
            language: $fields->string('language'),
            topicKey: $fields->string('topic_key'),
            label: $fields->string('label'),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'language' => $this->language,
            'topic_key' => $this->topicKey,
            'label' => $this->label,
        ];
    }
}
