<?php

namespace App\Http\Middleware;

use App\Auth\AccountSessions;
use App\Auth\AccountStatus;
use App\Auth\DropReason;
use App\Models\User;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Drops a session that no longer deserves to be one and lets the request go on as a guest (research.md, R3
 * and R4). AuthenticateSession decides on the password hash; its own logic is the framework's.
 */
final class DropInvalidSession
{
    public const DROPPED_ATTRIBUTE = 'session.dropped';

    private const AUTHENTICATED_AT_KEY = 'taller.authenticated_at';

    public function __construct(private AuthenticateSession $passwordHashProbe) {}

    public function handle(Request $request, Closure $next): Response
    {
        $reason = $this->reasonToDrop($request);
        if ($reason !== null) {
            $this->drop($request);
            $request->attributes->set(self::DROPPED_ATTRIBUTE, $reason);
        }

        $response = $next($request);
        $this->storePasswordHashIfMissing($request);

        return $response;
    }

    private function reasonToDrop(Request $request): ?DropReason
    {
        $user = $this->guard()->user();
        if (! $user instanceof User) {
            return null;
        }
        if ($this->passwordChanged($request)) {
            return DropReason::PasswordChanged;
        }
        if ($user->status === AccountStatus::Deleting) {
            return DropReason::Deleting;
        }
        if ($user->status === AccountStatus::Disabled) {
            return DropReason::Disabled;
        }

        return $this->exceededMaximumAge($request) ? DropReason::Expired : null;
    }

    private function passwordChanged(Request $request): bool
    {
        try {
            $this->passwordHashProbe->handle($request, fn () => response()->noContent());
        } catch (AuthenticationException) {
            return true;
        }

        return false;
    }

    private function exceededMaximumAge(Request $request): bool
    {
        $startedAt = $request->session()->get(self::AUTHENTICATED_AT_KEY);
        if (! is_int($startedAt)) {
            $request->session()->put(self::AUTHENTICATED_AT_KEY, now()->getTimestamp());

            return false;
        }
        $carriesRememberCookie = $request->hasCookie($this->guard()->getRecallerName());
        $maximumSeconds = config()->integer('taller.session_max_hours') * 3600;

        return ! $carriesRememberCookie && now()->getTimestamp() - $startedAt > $maximumSeconds;
    }

    private function drop(Request $request): void
    {
        $this->guard()->logoutCurrentDevice();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    private function storePasswordHashIfMissing(Request $request): void
    {
        if ($this->guard()->user() !== null && ! $request->session()->has(AccountSessions::PASSWORD_HASH_KEY)) {
            $this->passwordHashProbe->handle($request, fn () => response()->noContent());
        }
    }

    private function guard(): SessionGuard
    {
        return Auth::guard('web');
    }
}
