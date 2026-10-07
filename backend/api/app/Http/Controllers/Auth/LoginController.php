<?php

namespace App\Http\Controllers\Auth;

use App\Auth\DeviceCookie;
use App\Auth\LoginOutcome;
use App\Auth\LoginPipeline;
use App\Auth\LoginResult;
use App\Auth\PublishedUser;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\JsonResponse;
use LogicException;

final class LoginController
{
    public function __construct(private LoginPipeline $pipeline, private DeviceCookie $deviceCookie) {}

    public function store(LoginRequest $request): JsonResponse
    {
        $outcome = $this->pipeline->attempt($request->email(), $request->password(), $request->remember(), $request);

        return match ($outcome->result) {
            LoginResult::Success => $this->signedIn($outcome),
            LoginResult::Failed => ApiError::of(ApiCode::AuthFailed),
            LoginResult::Disabled => ApiError::of(ApiCode::AccountDisabled),
            LoginResult::Throttled, LoginResult::Locked => ApiError::of(
                ApiCode::TooManyRequests,
                headers: ['Retry-After' => (string) $outcome->retryAfter],
            ),
        };
    }

    private function signedIn(LoginOutcome $outcome): JsonResponse
    {
        $user = $outcome->user ?? throw new LogicException('A successful sign in carries its account.');

        return response()
            ->json(['data' => PublishedUser::from($user)->toPublished()])
            ->withCookie($this->deviceCookie->make($user, $outcome->device));
    }
}
