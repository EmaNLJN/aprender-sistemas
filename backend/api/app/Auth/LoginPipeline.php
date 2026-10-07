<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Timebox;

/** The sign-in steps of ADR 0006 §4.2, in order (research.md, R6). */
final class LoginPipeline
{
    public const AUTHENTICATED_AT_KEY = 'taller.authenticated_at';

    private const MINIMUM_MICROSECONDS = 200_000;

    public function __construct(
        private AccountPasswords $passwords,
        private LoginThrottle $throttle,
        private AccountLockout $lockout,
        private DeviceCookie $deviceCookie,
    ) {}

    public function attempt(string $rawEmail, PlainPassword $password, bool $remember, Request $request): LoginOutcome
    {
        $emailKey = Email::canonical($rawEmail);
        $network = NetworkKey::of($request->ip());

        $throttledFor = $this->throttle->hit($emailKey, $network);
        if ($throttledFor !== null) {
            return new LoginOutcome(LoginResult::Throttled, retryAfter: $throttledFor);
        }

        $user = User::query()->where('email', $emailKey)->first();
        $device = $this->deviceCookie->read($request, $user);

        $turnedAway = $this->turnedAway($emailKey, $device);
        if ($turnedAway !== null) {
            return $turnedAway;
        }

        $outcome = (new Timebox)->call(
            fn () => $this->evaluate($user, $password, $emailKey, $device),
            self::MINIMUM_MICROSECONDS,
        );
        if ($outcome->result === LoginResult::Success && $user !== null) {
            $this->clearCounters($emailKey, $network, $device);
            $this->openSession($user, $remember, $request);
        }

        return $outcome;
    }

    private function turnedAway(string $emailKey, ?DeviceToken $device): ?LoginOutcome
    {
        if ($device !== null) {
            $waitFor = $this->deviceCookie->retryAfter($device);

            return $waitFor === null ? null : new LoginOutcome(LoginResult::Throttled, retryAfter: $waitFor);
        }

        $state = $this->lockout->state($emailKey);
        $remaining = $state->retryAfter(now()->getTimestamp());
        if ($state->isPermanent() || $remaining > 0) {
            return new LoginOutcome(LoginResult::Locked, retryAfter: max(1, $remaining));
        }

        return null;
    }

    private function evaluate(?User $user, PlainPassword $password, string $emailKey, ?DeviceToken $device): LoginOutcome
    {
        $passwordMatches = $this->passwords->verifyOrDummy($user, $password);

        if ($user === null || ! $passwordMatches || $user->status === AccountStatus::Deleting) {
            $this->recordFailure($emailKey, $device);

            return new LoginOutcome(LoginResult::Failed);
        }
        if ($user->status === AccountStatus::Disabled) {
            return new LoginOutcome(LoginResult::Disabled, $user);
        }

        return new LoginOutcome(LoginResult::Success, $user, $device);
    }

    private function recordFailure(string $emailKey, ?DeviceToken $device): void
    {
        if ($device === null) {
            $this->lockout->recordFailure($emailKey);

            return;
        }

        $this->deviceCookie->recordFailure($device);
    }

    /** A device that already earned its exemption leaves the account lockout as it was. */
    private function clearCounters(string $emailKey, string $network, ?DeviceToken $device): void
    {
        $this->throttle->clear($emailKey, $network);
        if ($device === null) {
            $this->lockout->clear($emailKey);

            return;
        }

        $this->deviceCookie->clear($device);
    }

    private function openSession(User $user, bool $remember, Request $request): void
    {
        Auth::guard('web')->login($user, $remember && $user->role === Role::Student);
        $request->session()->put(self::AUTHENTICATED_AT_KEY, now()->getTimestamp());
    }
}
