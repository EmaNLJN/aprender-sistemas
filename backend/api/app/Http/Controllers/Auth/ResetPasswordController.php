<?php

namespace App\Http\Controllers\Auth;

use App\Auth\AccountLockout;
use App\Auth\AccountPasswords;
use App\Auth\AccountSessions;
use App\Auth\Email;
use App\Auth\PasswordPolicy;
use App\Auth\PlainPassword;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

final class ResetPasswordController
{
    public function __construct(
        private PasswordPolicy $policy,
        private AccountPasswords $passwords,
        private AccountSessions $sessions,
        private AccountLockout $lockout,
    ) {}

    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $email = Email::canonical($request->string('email')->toString());
        $password = PlainPassword::of($request->string('password')->toString());
        $this->assertAcceptable($password, User::where('email', $email)->first()?->name, $email);

        $status = Password::broker()->reset(
            ['email' => $email, 'status' => 'active', 'token' => $request->string('token')->toString(), 'password' => $password->value],
            fn (User $user) => $this->replacePassword($user, $password),
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json((object) []);
        }

        return ApiError::of(ApiCode::ValidationFailed, ['errors' => ['token' => [__('passwords.token')]]]);
    }

    private function assertAcceptable(PlainPassword $password, ?string $name, string $email): void
    {
        $violations = $this->policy->violations($password, $name, $email);
        if ($violations === []) {
            return;
        }

        $messages = [];
        foreach ($violations as $violation) {
            $messages[] = $violation->message();
        }

        throw ValidationException::withMessages(['password' => $messages]);
    }

    private function replacePassword(User $user, PlainPassword $password): void
    {
        $this->passwords->set($user, $password);
        $user->save();
        $this->sessions->endAll($user);
        $this->lockout->clear(Email::canonical($user->email));
    }
}
