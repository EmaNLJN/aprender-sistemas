<?php

namespace App\Auth\Events;

final readonly class AccountRestricted
{
    public function __construct(public int $userId, public AccountRestriction $reason) {}
}
