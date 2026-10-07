<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use stdClass;

/**
 * A step of a workshop: `steps[i]` of the document ↔ a `workshop_steps` row. Its key is published
 * as `id` and must match the meta; the v1 index comes from the meta and is not published (ADR 0006 D14).
 */
final readonly class WorkshopStep
{
    public const KEYS = ['id', 'title', 'task', 'why', 'done'];

    public function __construct(
        public string $workshopId,
        public string $stepKey,
        public int $position,
        public ?int $v1Position,
        public string $title,
        public string $task,
        public string $why,
        public string $done,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $step, string $workshopId, int $position, StepKey $key, string $path): self
    {
        $fields = DocumentFields::of($step, $path, self::KEYS);
        $documentId = $fields->text('id');
        if ($documentId !== $key->id) {
            throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$workshopId}", "la etapa «{$documentId}» del documento es «{$key->id}» en el meta: regenerá los dos archivos juntos");
        }

        return new self(
            workshopId: $workshopId,
            stepKey: $key->id,
            position: $position,
            v1Position: $key->v1Index,
            title: $fields->text('title'),
            task: $fields->text('task'),
            why: $fields->text('why'),
            done: $fields->text('done'),
            keyOrder: $fields->keyOrder(),
        );
    }

    /** @param array<string, mixed> $row a `workshop_steps` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'workshop_steps');

        return new self(
            workshopId: $fields->string('workshop_id'),
            stepKey: $fields->string('step_key'),
            position: $fields->int('position'),
            v1Position: $fields->nullableInt('v1_position'),
            title: $fields->string('title'),
            task: $fields->string('task'),
            why: $fields->string('why'),
            done: $fields->string('done'),
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'workshop_id' => $this->workshopId,
            'step_key' => $this->stepKey,
            'title' => $this->title,
            'task' => $this->task,
            'why' => $this->why,
            'done' => $this->done,
            'position' => $this->position,
            'v1_position' => $this->v1Position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'id' => $this->stepKey,
            'title' => $this->title,
            'task' => $this->task,
            'why' => $this->why,
            'done' => $this->done,
        ]);
    }
}
