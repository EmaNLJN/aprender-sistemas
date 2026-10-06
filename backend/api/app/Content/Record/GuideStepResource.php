<?php

namespace App\Content\Record;

final readonly class GuideStepResource
{
    public function __construct(
        public string $stepId,
        public string $resourceId,
        public int $position,
    ) {}

    /** @param array<string, mixed> $row a `guide_step_resources` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'guide_step_resources');

        return new self(
            stepId: $fields->string('step_id'),
            resourceId: $fields->string('resource_id'),
            position: $fields->int('position'),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'step_id' => $this->stepId,
            'resource_id' => $this->resourceId,
            'position' => $this->position,
        ];
    }
}
