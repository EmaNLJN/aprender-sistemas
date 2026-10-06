<?php

namespace App\Http\Controllers;

use App\Auth\AccountPasswords;
use App\Auth\AccountSessions;
use App\Auth\PasswordPolicy;
use App\Auth\PasswordProof;
use App\Auth\PasswordViolation;
use App\Auth\PlainPassword;
use App\Auth\PrivacyNotice;
use App\Auth\ProofOutcome;
use App\Auth\PublishedUser;
use App\Database\WriteTransaction;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\ProofFailure;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LogoutOthersRequest;
use App\Http\Requests\PrivacyRequest;
use App\Http\Requests\UpdateNameRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class MeController
{
    public function __construct(
        private PasswordProof $proof,
        private PasswordPolicy $policy,
        private AccountPasswords $passwords,
        private AccountSessions $sessions,
        private PrivacyNotice $privacyNotice,
    ) {}

    public function update(UpdateNameRequest $request): JsonResponse
    {
        $user = CurrentAccount::of($request);
        $user->name = $request->newName();
        $user->save();

        return $this->published($user);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = CurrentAccount::of($request);
        $proof = $this->proof->verify($user, $request->currentPassword(), $request);
        if ($proof->outcome !== ProofOutcome::Verified) {
            return ProofFailure::response($proof);
        }

        $newPassword = $request->newPassword();
        $violations = $this->policy->violations($newPassword, $user->name, $user->email);
        if ($violations !== []) {
            return $this->policyFailure($violations);
        }

        $this->replacePassword($user, $newPassword, $request);

        return $this->published($user);
    }

    public function acceptPrivacy(PrivacyRequest $request): Response
    {
        $this->privacyNotice->accept(CurrentAccount::of($request));

        return response()->noContent();
    }

    public function logoutOthers(LogoutOthersRequest $request): JsonResponse|Response
    {
        $user = CurrentAccount::of($request);
        $password = $request->password();
        $proof = $this->proof->verify($user, $password, $request);
        if ($proof->outcome !== ProofOutcome::Verified) {
            return ProofFailure::response($proof);
        }

        $this->sessions->endOthers($user, $request, $password);

        return response()->noContent();
    }

    private function replacePassword(User $user, PlainPassword $newPassword, Request $request): void
    {
        WriteTransaction::run(function () use ($user, $newPassword) {
            $this->passwords->set($user, $newPassword);
            $user->save();
        });
        $request->session()->regenerate();
        $this->sessions->endOthers($user, $request, $newPassword);
    }

    /** @param list<PasswordViolation> $violations */
    private function policyFailure(array $violations): JsonResponse
    {
        $messages = collect($violations)->map(fn (PasswordViolation $violation) => $violation->message())->all();

        return ApiError::of(ApiCode::ValidationFailed, ['errors' => ['password' => $messages]]);
    }

    private function published(User $user): JsonResponse
    {
        return response()->json(['data' => PublishedUser::from($user)->toPublished()]);
    }
}
