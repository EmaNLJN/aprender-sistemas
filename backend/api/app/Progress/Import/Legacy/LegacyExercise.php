<?php

namespace App\Progress\Import\Legacy;

use Carbon\CarbonImmutable;

final readonly class LegacyExercise
{
    public function __construct(
        public string $exerciseId,
        public bool $predictionCorrect,
        public bool $assisted,
        public bool $solutionSeen,
        public ?int $prediction,
        public ?int $hints,
        public ?string $draft,
        public ?string $reflection,
        public ?string $customTest,
        public ?int $attempts,
        public ?CarbonImmutable $solvedAt,
        public ?CarbonImmutable $reviewAt,
        public ?CarbonImmutable $reviewedAt,
        public ?string $confidence,
        public ?LegacyResult $result,
    ) {}
}
