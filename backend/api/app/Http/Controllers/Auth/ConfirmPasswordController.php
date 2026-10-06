<?php

namespace App\Http\Controllers\Auth;

use App\Auth\PasswordProof;
use App\Auth\ProofOutcome;
use App\Http\CurrentAccount;
use App\Http\Middleware\RequirePassword;
use App\Http\ProofFailure;
use App\Http\Requests\ConfirmPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ConfirmPasswordController
{
    public function __construct(private PasswordProof $proof) {}

    public function store(ConfirmPasswordRequest $request): JsonResponse
    {
        $proof = $this->proof->verify(CurrentAccount::of($request), $request->password(), $request);
        if ($proof->outcome !== ProofOutcome::Verified) {
            return ProofFailure::response($proof);
        }

        RequirePassword::markConfirmed($request);
        $request->session()->regenerate();

        return response()->json((object) [], 201);
    }

    public function status(Request $request): JsonResponse
    {
        return response()->json(['confirmed' => RequirePassword::isConfirmed($request)]);
    }
}
