<?php

namespace App\Runs\Admission;

use Carbon\CarbonImmutable;

final readonly class QuotaUsage
{
    public function __construct(
        public int $active,
        public int $lastMinute,
        public ?CarbonImmutable $oldestInMinute,
        public int $lastDay,
        public ?CarbonImmutable $oldestInDay,
        public int $sandboxMs,
        public ?CarbonImmutable $oldestSandbox,
    ) {}
}
