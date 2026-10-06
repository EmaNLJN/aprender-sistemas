<?php

namespace App\Http\Middleware;

use App\Auth\Role;
use App\Http\ApiCode;
use App\Http\ApiError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->role !== Role::Admin) {
            return ApiError::of(ApiCode::Forbidden);
        }

        return $next($request);
    }
}
