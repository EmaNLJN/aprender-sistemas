<?php

namespace App\Stats\Accounts;

use Carbon\CarbonImmutable;

final readonly class StudentFilters
{
    public function __construct(
        public int $page,
        public int $perPage,
        public ?string $q,
        public ?CarbonImmutable $inactiveSince,
        public string $sort,
    ) {}
}
