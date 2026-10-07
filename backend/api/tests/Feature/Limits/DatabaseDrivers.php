<?php

namespace Tests\Feature\Limits;

use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter as RateLimiterFacade;

final class DatabaseDrivers
{
    public static function useWithFixedClock(): void
    {
        config(['cache.default' => 'database', 'session.driver' => 'database']);
        Cache::forgetDriver();
        RateLimiterFacade::swap(new RateLimiter(Cache::store()));
        Carbon::setTestNow('2026-10-05 12:00:00');
    }
}
