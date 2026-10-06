<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;

final class PasswordProof
{
    private const MAX_ATTEMPTS_PER_MINUTE = 5;

    private const WINDOW_SECONDS = 60;

    public function __construct(
        private AccountPasswords $passwords,
        private AccountLockout $lockout,
        private DeviceCookie $deviceCookie,
        private RateLimiter $limiter,
    ) {}

    public function verify(User $user, PlainPassword $password, Request $request): ProofResult
    {
        $emailKey = Email::canonical($user->email);
        $device = $this->deviceCookie->read($request, $user);

        if ($device === null) {
            $lockedFor = $this->lockout->state($emailKey)->retryAfter(now()->getTimestamp());
            if ($lockedFor > 0) {
                return new ProofResult(ProofOutcome::Locked, $lockedFor);
            }
        }

        $throttledFor = $this->throttledFor($user, $device);
        if ($throttledFor !== null) {
            return new ProofResult(ProofOutcome::Throttled, $throttledFor);
        }

        $this->limiter->hit($this->attemptsKey($user), self::WINDOW_SECONDS);

        if (! $this->passwords->verify($user, $password)) {
            $this->recordFailure($emailKey, $device);

            return new ProofResult(ProofOutcome::Wrong);
        }

        $this->clearCounters($user, $emailKey, $device);

        return new ProofResult(ProofOutcome::Verified);
    }

    private function throttledFor(User $user, ?DeviceToken $device): ?int
    {
        $key = $this->attemptsKey($user);
        $userWait = $this->limiter->tooManyAttempts($key, self::MAX_ATTEMPTS_PER_MINUTE)
            ? max(1, $this->limiter->availableIn($key))
            : null;
        $deviceWait = $device === null ? null : $this->deviceCookie->retryAfter($device);

        $waits = array_filter([$userWait, $deviceWait]);

        return $waits === [] ? null : max($waits);
    }

    private function recordFailure(string $emailKey, ?DeviceToken $device): void
    {
        if ($device === null) {
            $this->lockout->recordFailure($emailKey);

            return;
        }

        $this->deviceCookie->recordFailure($device);
    }

    private function clearCounters(User $user, string $emailKey, ?DeviceToken $device): void
    {
        $this->limiter->clear($this->attemptsKey($user));
        if ($device === null) {
            $this->lockout->clear($emailKey);

            return;
        }

        $this->deviceCookie->clear($device);
    }

    private function attemptsKey(User $user): string
    {
        return 'proof:'.$user->id;
    }
}
