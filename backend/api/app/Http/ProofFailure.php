<?php

namespace App\Http;

use App\Auth\ProofOutcome;
use App\Auth\ProofResult;
use Illuminate\Http\JsonResponse;

final class ProofFailure
{
    public static function response(ProofResult $proof): JsonResponse
    {
        return match ($proof->outcome) {
            ProofOutcome::Throttled, ProofOutcome::Locked => ApiError::of(
                ApiCode::TooManyRequests,
                headers: ['Retry-After' => (string) $proof->retryAfter],
            ),
            default => ApiError::of(ApiCode::AuthFailed),
        };
    }
}
