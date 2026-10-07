<?php

namespace App\Auth;

use App\Models\User;
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

        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute(120)->by(self::accountKey($request)));
        RateLimiter::for('export', fn (Request $request) => Limit::perDay(3)->by(self::accountKey($request)));
    }

    private static function accountKey(Request $request): string
    {
        $user = $request->user();

        return $user instanceof User ? 'user:'.$user->id : 'network:'.NetworkKey::of($request->ip());
    }
}
