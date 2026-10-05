<?php

namespace App\Content\Record;

final readonly class WorkshopRelatedExercise
{
    public function __construct(
        public string $workshopId,
        public string $exerciseId,
        public int $position,
    ) {}

    /** @param array<string, mixed> $row a `workshop_related_exercises` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'workshop_related_exercises');

        return new self(
            workshopId: $fields->string('workshop_id'),
            exerciseId: $fields->string('exercise_id'),
            position: $fields->int('position'),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'workshop_id' => $this->workshopId,
            'exercise_id' => $this->exerciseId,
            'position' => $this->position,
        ];
    }
}
