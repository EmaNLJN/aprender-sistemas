<?php

namespace App\Progress\Import;

use Carbon\CarbonImmutable;

final readonly class AttemptPointer
{
    public function __construct(
        public int $attemptId,
        public CarbonImmutable $attemptedAt,
        public bool $passed,
    ) {}
}
