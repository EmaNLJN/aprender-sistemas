<?php

namespace App\Auth;

use Illuminate\Support\Facades\Cache;

final class AccountLockout
{
    private const FIRST_LOCKED_FAIL = 10;

    private const FIRST_LOCK_SECONDS = 60;

    private const MAX_LOCK_SECONDS = 900;

    private const FORGET_AFTER_SECONDS = 86400;

    private const FORGET_PERMANENT_AFTER_SECONDS = 30 * 86400;

    public function state(string $emailKey): LockoutState
    {
        $stored = Cache::get($this->cacheKey($emailKey));

        if (is_array($stored) && is_int($stored['fails'] ?? null) && is_int($stored['lockedUntil'] ?? null)) {
            return new LockoutState($stored['fails'], $stored['lockedUntil']);
        }

        return new LockoutState(0, 0);
    }

    public function recordFailure(string $emailKey): LockoutState
    {
        $fails = $this->state($emailKey)->fails + 1;
        $now = now()->getTimestamp();
        $permanent = $fails >= LockoutState::PERMANENT_AT;
        $keptFor = $permanent ? self::FORGET_PERMANENT_AFTER_SECONDS : self::FORGET_AFTER_SECONDS;
        $lockedUntil = match (true) {
            $permanent => $now + self::FORGET_PERMANENT_AFTER_SECONDS,
            $fails >= self::FIRST_LOCKED_FAIL => $now + $this->lockSeconds($fails),
            default => 0,
        };

        Cache::put($this->cacheKey($emailKey), ['fails' => $fails, 'lockedUntil' => $lockedUntil], $keptFor);

        return new LockoutState($fails, $lockedUntil);
    }

    public function clear(string $emailKey): void
    {
        Cache::forget($this->cacheKey($emailKey));
    }

    private function lockSeconds(int $fails): int
    {
        $doublings = min($fails - self::FIRST_LOCKED_FAIL, 10);

        return min(self::MAX_LOCK_SECONDS, self::FIRST_LOCK_SECONDS * 2 ** $doublings);
    }

    private function cacheKey(string $emailKey): string
    {
        return 'login:account:'.hash('sha256', $emailKey);
    }
}
