<?php

namespace App\Http;

use Illuminate\Http\JsonResponse;

/** Error body of the whole API: `{message, code}` plus the fields of each code (ADR 0006 §8). */
final class ApiError
{
    /**
     * @param  array<string, mixed>  $extra
     * @param  array<string, string>  $headers
     */
    public static function response(int $status, string $code, string $message, array $extra = [], array $headers = []): JsonResponse
    {
        return response()->json(['message' => $message, 'code' => $code] + $extra, $status, $headers);
    }

    /**
     * `$status` is only for `BadRequest`, which keeps the original 4xx.
     *
     * @param  array<string, mixed>  $extra
     * @param  array<string, string>  $headers
     */
    public static function of(ApiCode $code, array $extra = [], array $headers = [], ?int $status = null): JsonResponse
    {
        return self::response($status ?? $code->status(), $code->value, $code->message(), $extra, $headers);
    }
}
