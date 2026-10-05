<?php

namespace App\Content\Record;

use stdClass;

/** A module of a track: `modules[i]` of the document ↔ a `guide_modules` row. */
final readonly class GuideModule
{
    public const KEYS = ['id', 'title', 'subtitle', 'steps'];

    /** @param list<GuideStep> $steps in the order of `position` */
    public function __construct(
        public string $id,
        public string $trackLanguage,
        public int $position,
        public string $title,
        public string $subtitle,
        public KeyOrder $keyOrder,
        public array $steps,
    ) {}

    public static function fromDocument(stdClass $module, string $trackLanguage, int $position, string $path): self
    {
        $fields = DocumentFields::of($module, $path, self::KEYS);
        $id = $fields->text('id');
        $title = $fields->text('title');
        $subtitle = $fields->text('subtitle');
        $steps = [];
        foreach (Guide::objectsAt($module->steps ?? null, "{$path}.steps") as $index => $step) {
            $steps[] = GuideStep::fromDocument($step, $id, $index, "{$path}.steps[{$index}]");
        }

        return new self(
            id: $id,
            trackLanguage: $trackLanguage,
            position: $position,
            title: $title,
            subtitle: $subtitle,
            keyOrder: $fields->keyOrder(),
            steps: $steps,
        );
    }

    /**
     * @param  array<string, mixed>  $row  a `guide_modules` row
     * @param  list<GuideStep>  $steps
     */
    public static function fromRow(array $row, array $steps): self
    {
        $fields = new RowFields($row, 'guide_modules');

        return new self(
            id: $fields->string('id'),
            trackLanguage: $fields->string('track_language'),
            position: $fields->int('position'),
            title: $fields->string('title'),
            subtitle: $fields->string('subtitle'),
            keyOrder: $fields->keyOrder(self::KEYS),
            steps: $steps,
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'track_language' => $this->trackLanguage,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        $steps = [];
        foreach ($this->steps as $step) {
            $steps[] = $step->toPublished();
        }

        return $this->keyOrder->publish([
            'id' => $this->id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'steps' => $steps,
        ]);
    }
}
