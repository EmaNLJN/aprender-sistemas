<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use Illuminate\Support\Arr;
use stdClass;

/**
 * The guide of the document ↔ its six tables. The root has no row: it always publishes
 * `resources`, `tracks` and `sources`, in that order.
 */
final readonly class Guide
{
    public const KEYS = ['resources', 'tracks', 'sources'];

    private const FILE = 'curriculum.json';

    /**
     * @param  list<GuideResource>  $resources
     * @param  array<string, GuideTrack>  $tracks  by language, in the order of `languages`
     * @param  list<GuideSource>  $sources
     */
    public function __construct(
        public array $resources,
        public array $tracks,
        public array $sources,
    ) {}

    /** @param list<string> $languages in the order of `languages.position` */
    public static function fromDocument(stdClass $guide, array $languages, string $path): self
    {
        if (KeyOrder::of($guide)->keys !== self::KEYS) {
            throw InvalidContent::at(self::FILE, $path, 'las claves de la guía tienen que ser resources, tracks y sources, en ese orden');
        }
        $resources = [];
        foreach (self::objectsAt($guide->resources, "{$path}.resources") as $index => $resource) {
            $resources[] = GuideResource::fromDocument($resource, $index, "{$path}.resources[{$index}]");
        }
        $sources = [];
        foreach (self::objectsAt($guide->sources, "{$path}.sources") as $index => $source) {
            $sources[] = GuideSource::fromDocument($source, $index, "{$path}.sources[{$index}]");
        }

        return new self($resources, self::tracksFromDocument($guide->tracks, $languages, "{$path}.tracks"), $sources);
    }

    /**
     * A non-empty list of objects: what the document holds wherever a record has children.
     *
     * @return list<stdClass>
     */
    public static function objectsAt(mixed $value, string $path): array
    {
        if (! is_array($value) || ! Arr::isList($value) || $value === []) {
            throw InvalidContent::at(self::FILE, $path, 'se esperaba una lista no vacía');
        }
        $objects = [];
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at(self::FILE, "{$path}[{$index}]", 'se esperaba un objeto');
            }
            $objects[] = $item;
        }

        return $objects;
    }

    /** @return array<string, list<array<string, int|string|null>>> rows by table */
    public function rowsByTable(): array
    {
        $resourceRows = [];
        foreach ($this->resources as $resource) {
            $resourceRows[] = $resource->toRow();
        }
        $sourceRows = [];
        foreach ($this->sources as $source) {
            $sourceRows[] = $source->toRow();
        }
        $trackRows = [];
        foreach ($this->tracks as $track) {
            $trackRows[] = $track->toRow();
        }
        $moduleRows = [];
        foreach ($this->modules() as $module) {
            $moduleRows[] = $module->toRow();
        }
        $stepRows = [];
        $linkRows = [];
        foreach ($this->steps() as $step) {
            $stepRows[] = $step->toRow();
            foreach ($step->resources as $link) {
                $linkRows[] = $link->toRow();
            }
        }

        return [
            'guide_resources' => $resourceRows,
            'guide_sources' => $sourceRows,
            'guide_tracks' => $trackRows,
            'guide_modules' => $moduleRows,
            'guide_steps' => $stepRows,
            'guide_step_resources' => $linkRows,
        ];
    }

    public function toPublished(): stdClass
    {
        $resources = [];
        foreach ($this->resources as $resource) {
            $resources[] = $resource->toPublished();
        }
        $tracks = new stdClass;
        foreach ($this->tracks as $language => $track) {
            $tracks->{$language} = $track->toPublished();
        }
        $sources = [];
        foreach ($this->sources as $source) {
            $sources[] = $source->toPublished();
        }

        $guide = new stdClass;
        $guide->resources = $resources;
        $guide->tracks = $tracks;
        $guide->sources = $sources;

        return $guide;
    }

    /**
     * @param  list<string>  $languages
     * @return array<string, GuideTrack>
     */
    private static function tracksFromDocument(mixed $tracks, array $languages, string $path): array
    {
        if (! $tracks instanceof stdClass || KeyOrder::of($tracks)->keys !== $languages) {
            throw InvalidContent::at(self::FILE, $path, 'un recorrido por lenguaje, en el orden de languages: '.implode(', ', $languages));
        }
        $parsed = [];
        foreach ($languages as $language) {
            $track = $tracks->{$language};
            if (! $track instanceof stdClass) {
                throw InvalidContent::at(self::FILE, "{$path}.{$language}", 'se esperaba un objeto');
            }
            $parsed[$language] = GuideTrack::fromDocument($track, $language, "{$path}.{$language}");
        }

        return $parsed;
    }

    /** @return list<GuideModule> */
    private function modules(): array
    {
        $modules = [];
        foreach ($this->tracks as $track) {
            foreach ($track->modules as $module) {
                $modules[] = $module;
            }
        }

        return $modules;
    }

    /** @return list<GuideStep> */
    private function steps(): array
    {
        $steps = [];
        foreach ($this->modules() as $module) {
            foreach ($module->steps as $step) {
                $steps[] = $step;
            }
        }

        return $steps;
    }
}
