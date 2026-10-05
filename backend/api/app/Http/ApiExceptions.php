<?php

namespace App\Http;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

final class ApiExceptions
{
    public static function render(Throwable $error, Request $request): ?JsonResponse
    {
        if ($error instanceof HttpResponseException) {
            return null;
        }
        if ($error instanceof ValidationException) {
            return ApiError::of(ApiCode::ValidationFailed, ['errors' => $error->errors()]);
        }
        if ($error instanceof AuthenticationException) {
            return ApiError::of(ApiCode::Unauthenticated);
        }
        if ($error instanceof HttpExceptionInterface) {
            return self::fromHttpException($error);
        }

        return ApiError::of(ApiCode::ServerError);
    }

    private static function fromHttpException(HttpExceptionInterface $error): JsonResponse
    {
        $status = $error->getStatusCode();
        $headers = self::stringHeaders($error->getHeaders());
        $code = match ($status) {
            401 => ApiCode::Unauthenticated,
            403 => ApiCode::Forbidden,
            404 => ApiCode::NotFound,
            405 => ApiCode::MethodNotAllowed,
            419 => ApiCode::CsrfTokenMismatch,
            429 => ApiCode::TooManyRequests,
            default => $status >= 400 && $status < 500 ? ApiCode::BadRequest : ApiCode::ServerError,
        };

        return $code === ApiCode::BadRequest
            ? ApiError::of($code, headers: $headers, status: $status)
            : ApiError::of($code, headers: $headers);
    }

    /**
     * @param  array<array-key, mixed>  $headers
     * @return array<string, string>
     */
    private static function stringHeaders(array $headers): array
    {
        $strings = [];
        foreach ($headers as $name => $value) {
            if (is_string($value) || is_int($value)) {
                $strings[(string) $name] = (string) $value;
            }
        }

        return $strings;
    }
}
