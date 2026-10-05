<?php

namespace App\Auth;

final readonly class LockoutState
{
    public const PERMANENT_AT = 100;

    public function __construct(public int $fails, public int $lockedUntil) {}

    public function isPermanent(): bool
    {
        return $this->fails >= self::PERMANENT_AT;
    }

    public function retryAfter(int $now): int
    {
        return max(0, $this->lockedUntil - $now);
    }
}
