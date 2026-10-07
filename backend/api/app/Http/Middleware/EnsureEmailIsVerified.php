<?php

namespace App\Http\Middleware;

use App\Http\ApiCode;
use App\Http\ApiError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null) {
            return ApiError::of(ApiCode::Unauthenticated);
        }
        if (! $user->hasVerifiedEmail()) {
            return ApiError::of(ApiCode::EmailUnverified);
        }

        return $next($request);
    }
}
