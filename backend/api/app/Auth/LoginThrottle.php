<?php

namespace App\Auth;

use Illuminate\Cache\RateLimiter;

final class LoginThrottle
{
    private const WINDOW_SECONDS = 60;

    private const MAX_PER_EMAIL_AND_NETWORK = 5;

    private const MAX_PER_NETWORK = 60;

    public function __construct(private RateLimiter $limiter) {}

    public function hit(string $emailKey, string $network): ?int
    {
        $waits = array_filter([
            $this->hitCounter($this->emailAndNetworkKey($emailKey, $network), self::MAX_PER_EMAIL_AND_NETWORK),
            $this->hitCounter($this->networkKey($network), self::MAX_PER_NETWORK),
        ]);

        return $waits === [] ? null : max($waits);
    }

    public function clear(string $emailKey, string $network): void
    {
        $this->limiter->clear($this->emailAndNetworkKey($emailKey, $network));
    }

    private function hitCounter(string $key, int $maxAttempts): ?int
    {
        $attempts = $this->limiter->hit($key, self::WINDOW_SECONDS);

        return $attempts > $maxAttempts ? max(1, $this->limiter->availableIn($key)) : null;
    }

    private function emailAndNetworkKey(string $emailKey, string $network): string
    {
        return 'login:attempts:email:'.hash('sha256', $emailKey).':'.$network;
    }

    private function networkKey(string $network): string
    {
        return 'login:attempts:network:'.$network;
    }
}
