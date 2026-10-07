<?php

namespace App\Progress\Operations;

final readonly class LoadedContent
{
    /**
     * @param  array<string, array{language: string, options: int}>  $exercises
     * @param  array<string, int>  $activeHints
     * @param  array<string, int>  $worldOptions
     * @param  array<string, int>  $workshopOptions
     * @param  array<string, true>  $objectives
     * @param  array<string, true>  $steps
     * @param  array<string, int>  $guideStepOptions
     * @param  array<string, true>  $resources
     */
    public function __construct(
        public array $exercises = [],
        public array $activeHints = [],
        public array $worldOptions = [],
        public array $workshopOptions = [],
        public array $objectives = [],
        public array $steps = [],
        public array $guideStepOptions = [],
        public array $resources = [],
    ) {}

    public static function pairKey(string $workshopId, string $key): string
    {
        return "{$workshopId}\0{$key}";
    }
}
