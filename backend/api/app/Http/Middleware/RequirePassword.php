<?php

namespace App\Http\Middleware;

use App\Http\ApiCode;
use App\Http\ApiError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequirePassword
{
    private const CONFIRMED_AT_KEY = 'auth.password_confirmed_at';

    public function handle(Request $request, Closure $next): Response
    {
        if (! self::isConfirmed($request)) {
            return ApiError::of(ApiCode::PasswordConfirmationRequired);
        }

        return $next($request);
    }

    public static function isConfirmed(Request $request): bool
    {
        $confirmedAt = $request->session()->get(self::CONFIRMED_AT_KEY);

        return is_int($confirmedAt)
            && now()->getTimestamp() - $confirmedAt < config()->integer('auth.password_timeout');
    }

    public static function markConfirmed(Request $request): void
    {
        $request->session()->put(self::CONFIRMED_AT_KEY, now()->getTimestamp());
    }
}
