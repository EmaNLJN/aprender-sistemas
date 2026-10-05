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
}
