<?php

namespace App\Content\Record;

use stdClass;

final readonly class GuideTrack
{
    public const KEYS = ['title', 'description', 'modules'];

    /** @param list<GuideModule> $modules in the order of `position` */
    public function __construct(
        public string $language,
        public string $title,
        public string $description,
        public KeyOrder $keyOrder,
        public array $modules,
    ) {}

    public static function fromDocument(stdClass $track, string $language, string $path): self
    {
        $fields = DocumentFields::of($track, $path, self::KEYS);
        $title = $fields->text('title');
        $description = $fields->text('description');
        $modules = [];
        foreach (Guide::objectsAt($track->modules ?? null, "{$path}.modules") as $index => $module) {
            $modules[] = GuideModule::fromDocument($module, $language, $index, "{$path}.modules[{$index}]");
        }

        return new self(
            language: $language,
            title: $title,
            description: $description,
            keyOrder: $fields->keyOrder(),
            modules: $modules,
        );
    }

    /**
     * @param  array<string, mixed>  $row  a `guide_tracks` row
     * @param  list<GuideModule>  $modules
     */
    public static function fromRow(array $row, array $modules): self
    {
        $fields = new RowFields($row, 'guide_tracks');

        return new self(
            language: $fields->string('language'),
            title: $fields->string('title'),
            description: $fields->string('description'),
            keyOrder: $fields->keyOrder(self::KEYS),
            modules: $modules,
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'language' => $this->language,
            'title' => $this->title,
            'description' => $this->description,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        $modules = [];
        foreach ($this->modules as $module) {
            $modules[] = $module->toPublished();
        }

        return $this->keyOrder->publish([
            'title' => $this->title,
            'description' => $this->description,
            'modules' => $modules,
        ]);
    }
}
