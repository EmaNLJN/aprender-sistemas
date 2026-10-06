<?php

namespace App\Progress\Snapshot;

use App\Progress\ProgressAreas;
use Carbon\CarbonImmutable;

final readonly class Snapshot
{
    public function __construct(
        public int $userId,
        public int $epoch,
        public int $revision,
        public ?CarbonImmutable $resetAt,
        public string $contentVersion,
        public ProgressAreas $areas,
    ) {}
}
