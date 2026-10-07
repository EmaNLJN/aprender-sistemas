<?php

namespace App\Runs;

use App\Http\ApiCode;
use App\Http\ApiError;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

final class RunLimiters
{
    public static function register(): void
    {
        RateLimiter::for('runs-submit', fn (Request $request): Limit => Limit::perMinute(config()->integer('runs.throttle_per_minute'))
            ->by('runs:'.self::accountOrAddress($request))
            ->response(fn (Request $request, array $headers): Response => ApiError::of(ApiCode::TooManyRequests, headers: ['Cache-Control' => 'private, no-store'] + self::asText($headers))));
    }

    private static function accountOrAddress(Request $request): string
    {
        $user = $request->user();

        return $user instanceof User ? (string) $user->id : (string) $request->ip();
    }

    /**
     * @param  array<array-key, mixed>  $headers
     * @return array<string, string>
     */
    private static function asText(array $headers): array
    {
        $text = [];
        foreach ($headers as $name => $value) {
            if (is_string($value) || is_int($value)) {
                $text[(string) $name] = (string) $value;
            }
        }

        return $text;
    }
}
