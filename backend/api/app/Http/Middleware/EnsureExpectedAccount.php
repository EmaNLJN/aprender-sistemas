<?php

namespace App\Http\Middleware;

use App\Http\ApiCode;
use App\Http\ApiError;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class EnsureExpectedAccount
{
    private const READING_METHODS = ['GET', 'HEAD', 'OPTIONS'];

    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->method(), self::READING_METHODS, true)) {
            return $next($request);
        }

        $header = $request->header('X-Taller-User');
        $isPositiveInteger = is_string($header) && preg_match('/^[1-9][0-9]*$/', $header) === 1;
        if (! $isPositiveInteger || $header !== (string) Auth::id()) {
            return ApiError::of(ApiCode::AccountMismatch);
        }

        return $next($request);
    }
}
