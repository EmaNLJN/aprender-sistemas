<?php

namespace App\Http\Controllers\Auth;

use App\Auth\PasswordProof;
use App\Auth\ProofOutcome;
use App\Auth\ProofResult;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\Middleware\RequirePassword;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;

final class ConfirmPasswordController
{
    public function __construct(private PasswordProof $proof) {}

    public function store(ConfirmPasswordRequest $request): JsonResponse
    {
        $proof = $this->proof->verify($this->account($request), $request->password(), $request);
        if ($proof->outcome !== ProofOutcome::Verified) {
            return $this->failureOf($proof);
        }

        RequirePassword::markConfirmed($request);
        $request->session()->regenerate();

        return response()->json((object) [], 201);
    }

    public function status(Request $request): JsonResponse
    {
        return response()->json(['confirmed' => RequirePassword::isConfirmed($request)]);
    }

    private function failureOf(ProofResult $proof): JsonResponse
    {
        return match ($proof->outcome) {
            ProofOutcome::Throttled, ProofOutcome::Locked => ApiError::of(
                ApiCode::TooManyRequests,
                headers: ['Retry-After' => (string) $proof->retryAfter],
            ),
            default => ApiError::of(ApiCode::AuthFailed),
        };
    }

    private function account(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new LogicException('The account group guarantees a signed in account.');
    }
}
