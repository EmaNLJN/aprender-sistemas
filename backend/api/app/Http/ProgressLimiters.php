<?php

namespace App\Http;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

final class ProgressLimiters
{
    public static function register(): void
    {
        RateLimiter::for('sync', fn (Request $request): Limit => Limit::perMinute(config()->integer('progress.sync.throttle_per_minute'))
            ->by('sync:'.self::accountOrAddress($request)));
        RateLimiter::for('import', fn (Request $request): Limit => Limit::perHour(config()->integer('progress.import.throttle_per_hour', 3))
            ->by('import:'.self::accountOrAddress($request)));
        RateLimiter::for('reset', fn (Request $request): Limit => Limit::perDay(config()->integer('progress.reset.throttle_per_day', 3))
            ->by('reset:'.self::accountOrAddress($request)));
    }

    private static function accountOrAddress(Request $request): string
    {
        $user = $request->user();

        return $user instanceof User ? (string) $user->id : (string) $request->ip();
    }
}
