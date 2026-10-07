<?php

namespace App\Http\Middleware;

use App\Auth\DropReason;
use App\Http\ApiCode;
use App\Http\ApiError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->attributes->get(DropInvalidSession::DROPPED_ATTRIBUTE) === DropReason::Disabled) {
            return ApiError::of(ApiCode::AccountDisabled);
        }

        return $next($request);
    }
}
