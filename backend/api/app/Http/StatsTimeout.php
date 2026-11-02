<?php

namespace App\Http;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Log;

final class StatsTimeout extends HttpResponseException
{
    public static function after(int $elapsedMs): self
    {
        $route = request()->route();
        Log::warning('admin.stats_timeout', ['route' => $route instanceof Route ? $route->uri() : 'none', 'duration_ms' => $elapsedMs]);

        return new self(ApiError::of(ApiCode::StatsTimeout, headers: ['Retry-After' => (string) config()->integer('stats.retry_after_seconds')]));
    }
}
