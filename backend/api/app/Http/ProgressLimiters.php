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
    }

    private static function accountOrAddress(Request $request): string
    {
        $user = $request->user();

        return $user instanceof User ? (string) $user->id : (string) $request->ip();
    }
}
