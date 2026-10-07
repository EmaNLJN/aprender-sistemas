<?php

namespace App\Runs\Record;

use App\Runs\RunStatus;
use Carbon\CarbonImmutable;

final readonly class AttemptFacts
{
    public function __construct(
        public int $id,
        public int $userId,
        public string $exerciseId,
        public RunStatus $outcome,
        public bool $counted,
        public CarbonImmutable $attemptedAt,
    ) {}
}
