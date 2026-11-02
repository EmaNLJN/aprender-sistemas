<?php

namespace App\Audit;

use Carbon\CarbonImmutable;

final readonly class AuditRun
{
    public function __construct(
        public CarbonImmutable $startedAt,
        public CarbonImmutable $finishedAt,
        public string $runtime,
        public string $instance,
        public int $concurrency,
        public AuditSelection $selection,
        public HostStamps $host,
    ) {}
}
