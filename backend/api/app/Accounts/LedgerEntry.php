<?php

namespace App\Accounts;

use Carbon\CarbonImmutable;

final readonly class LedgerEntry
{
    public function __construct(public int $userId, public CarbonImmutable $userCreatedAt, public CarbonImmutable $deletedAt) {}
}
