<?php

namespace App\Progress\Import\Legacy;

final readonly class LegacyProgress
{
    /**
     * @param  list<LegacyExercise>  $exercises
     * @param  ?array{rust: ?string, go: ?string}  $selected
     * @param  list<LegacySeal>  $seals
     * @param  list<LegacyCheckpoint>  $checkpoints
     * @param  list<LegacyWorkshop>  $workshops
     * @param  list<ReportEntry>  $omitted
     * @param  list<ReportEntry>  $replaced
     */
    public function __construct(
        public ?LegacyRoute $route,
        public array $exercises,
        public ?array $selected,
        public array $seals,
        public array $checkpoints,
        public array $workshops,
        public array $omitted,
        public array $replaced,
    ) {}
}
