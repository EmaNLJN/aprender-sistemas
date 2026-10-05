<?php

namespace App\Content\Record;

use App\Content\InvalidContent;

final readonly class ExerciseHint
{
    public function __construct(
        public string $exerciseId,
        public int $position,
        public string $text,
    ) {}

    public static function fromDocument(mixed $hint, string $exerciseId, int $position, string $path): self
    {
        if (! is_string($hint) || trim($hint) === '') {
            throw InvalidContent::at('curriculum.json', $path, 'se esperaba un texto no vacío');
        }

        return new self($exerciseId, $position, $hint);
    }

    /** @param array<string, mixed> $row an `exercise_hints` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'exercise_hints');

        return new self(
            exerciseId: $fields->string('exercise_id'),
            position: $fields->int('position'),
            text: $fields->string('text'),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'exercise_id' => $this->exerciseId,
            'position' => $this->position,
            'text' => $this->text,
        ];
    }
}
