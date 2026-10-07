<?php

namespace App\Http\Controllers\Auth;

use App\Auth\EmailTaken;
use App\Auth\InvitationExpired;
use App\Auth\InvitationNotFound;
use App\Auth\Invitations;
use App\Auth\PlainPassword;
use App\Auth\PublishedUser;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\PasswordRejection;
use App\Http\Requests\AcceptInvitationRequest;
use App\Http\Requests\InvitationTokenRequest;
use App\Models\User;
use App\Support\Iso8601;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

final class InvitationController
{
    private const AUTHENTICATED_AT_KEY = 'taller.authenticated_at';

    public function __construct(private Invitations $invitations, private PasswordRejection $rejection) {}

    public function lookup(InvitationTokenRequest $request): JsonResponse
    {
        try {
            $invitation = $this->invitations->lookup($request->string('token')->toString());
        } catch (InvitationNotFound|InvitationExpired $unusable) {
            return $this->unusable($unusable);
        }

        return response()->json([
            'email' => $invitation->email,
            'role' => $invitation->role->value,
            'expiresAt' => Iso8601::utc($invitation->expires_at),
        ]);
    }

    public function accept(AcceptInvitationRequest $request): JsonResponse
    {
        try {
            $user = $this->createAccount($request);
        } catch (InvitationNotFound|InvitationExpired $unusable) {
            return $this->unusable($unusable);
        } catch (EmailTaken) {
            return ApiError::of(ApiCode::EmailTaken);
        }

        $this->signIn($user);

        return response()->json(['data' => PublishedUser::from($user)->toPublished()], 201);
    }

    private function createAccount(AcceptInvitationRequest $request): User
    {
        $token = $request->string('token')->toString();
        $name = $request->string('name')->toString();
        $password = PlainPassword::of($request->string('password')->toString());

        $invitation = $this->invitations->lookup($token);
        $this->rejection->assertAcceptable($password, $name, $invitation->email);

        return $this->invitations->accept($token, $name, $password, $request->string('privacyVersion')->toString());
    }

    private function signIn(User $user): void
    {
        Auth::guard('web')->login($user);
        session()->put(self::AUTHENTICATED_AT_KEY, now()->getTimestamp());
    }

    private function unusable(InvitationNotFound|InvitationExpired $reason): JsonResponse
    {
        return ApiError::of($reason instanceof InvitationExpired ? ApiCode::InvitationExpired : ApiCode::InvitationNotFound);
    }
}
