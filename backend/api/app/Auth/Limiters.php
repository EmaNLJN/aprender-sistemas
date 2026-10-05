<?php

namespace App\Auth;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

final class Limiters
{
    public static function register(): void
    {
        RateLimiter::for('invitations', fn (Request $request) => Limit::perMinute(10)->by(NetworkKey::of($request->ip())));

        RateLimiter::for('reset-password', fn (Request $request) => [
            Limit::perMinute(10)->by('network:'.NetworkKey::of($request->ip())),
            Limit::perMinute(5)->by('email:'.hash('sha256', Email::canonical($request->string('email')->toString()))),
        ]);
    }
}
