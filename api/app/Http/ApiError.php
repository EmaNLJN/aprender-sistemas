<?php

namespace App\Http;

use Illuminate\Http\JsonResponse;

/**
 * El cuerpo de todo error de la API: `{message, code}` más los campos propios de cada código, con
 * el mensaje en español (ADR 0006 §8). La tabla de códigos crece con cada subplan.
 */
final class ApiError
{
    /**
     * @param  array<string, mixed>  $extra  campos que siguen a message y code
     * @param  array<string, string>  $headers
     */
    public static function response(int $status, string $code, string $message, array $extra = [], array $headers = []): JsonResponse
    {
        return response()->json(['message' => $message, 'code' => $code] + $extra, $status, $headers);
    }
}
