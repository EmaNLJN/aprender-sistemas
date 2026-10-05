<?php

namespace App\Content\Record;

use LogicException;

/** An exercise of a world: a `world_exercises` row. */
final readonly class WorldExercise
{
    public function __construct(
        public string $worldId,
        public string $exerciseId,
        public WorldRole $role,
        public int $position,
    ) {}

    /** @param array<string, mixed> $row a `world_exercises` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'world_exercises');
        $role = $fields->string('role');

        return new self(
            worldId: $fields->string('world_id'),
            exerciseId: $fields->string('exercise_id'),
            role: WorldRole::tryFrom($role) ?? throw new LogicException("world_exercises.role: el rol «{$role}» no existe"),
            position: $fields->int('position'),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'world_id' => $this->worldId,
            'exercise_id' => $this->exerciseId,
            'role' => $this->role->value,
            'position' => $this->position,
        ];
    }
}
