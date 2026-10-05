<?php

namespace App\Content\Record;

use stdClass;

/** An objective of a workshop: `objectives[i]` of the document ↔ a `workshop_objectives` row. */
final readonly class WorkshopObjective
{
    public const KEYS = ['id', 'label', 'why'];

    public function __construct(
        public string $workshopId,
        public string $objectiveKey,
        public int $position,
        public string $label,
        public string $why,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $objective, string $workshopId, int $position, string $path): self
    {
        $fields = DocumentFields::of($objective, $path, self::KEYS);

        return new self(
            workshopId: $workshopId,
            objectiveKey: $fields->text('id'),
            position: $position,
            label: $fields->text('label'),
            why: $fields->text('why'),
            keyOrder: $fields->keyOrder(),
        );
    }

    /** @param array<string, mixed> $row a `workshop_objectives` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'workshop_objectives');

        return new self(
            workshopId: $fields->string('workshop_id'),
            objectiveKey: $fields->string('objective_key'),
            position: $fields->int('position'),
            label: $fields->string('label'),
            why: $fields->string('why'),
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'workshop_id' => $this->workshopId,
            'objective_key' => $this->objectiveKey,
            'label' => $this->label,
            'why' => $this->why,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'id' => $this->objectiveKey,
            'label' => $this->label,
            'why' => $this->why,
        ]);
    }
}
