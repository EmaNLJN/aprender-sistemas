<?php

namespace App\Http\Controllers\Auth;

use App\Auth\AccountLockout;
use App\Auth\AccountPasswords;
use App\Auth\AccountSessions;
use App\Auth\Email;
use App\Auth\PlainPassword;
use App\Database\WriteTransaction;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\PasswordRejection;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Passwords\PasswordBroker;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Timebox;
use LogicException;

final class ResetPasswordController
{
    private const FLOOR_MICROSECONDS = 200_000;

    private const LOCK_SECONDS = 5;

    private const LOCK_WAIT_SECONDS = 2;

    public function __construct(
        private PasswordRejection $rejection,
        private AccountPasswords $passwords,
        private AccountSessions $sessions,
        private AccountLockout $lockout,
    ) {}

    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $email = Email::canonical($request->string('email')->toString());
        $password = PlainPassword::of($request->string('password')->toString());
        $this->rejection->assertAcceptable($password, null, $email);

        $token = $request->string('token')->toString();
        $status = (new Timebox)->call(fn () => $this->reset($email, $token, $password), self::FLOOR_MICROSECONDS);

        if ($status === Password::PASSWORD_RESET) {
            return response()->json((object) []);
        }

        return ApiError::of(ApiCode::ValidationFailed, ['errors' => ['token' => [__('passwords.token')]]]);
    }

    /** The lock makes a second request with the same token find it already deleted. */
    private function reset(string $email, string $token, PlainPassword $password): string
    {
        $status = Cache::lock('reset:'.hash('sha256', $email), self::LOCK_SECONDS)->block(
            self::LOCK_WAIT_SECONDS,
            fn () => WriteTransaction::run(fn () => $this->broker()->reset(
                ['email' => $email, 'status' => 'active', 'token' => $token, 'password' => $password->value],
                fn (User $user) => $this->replacePassword($user, $password, $email),
            )),
        );
        if (! is_string($status)) {
            throw new LogicException('The password broker answers with a status string.');
        }
        if ($status === Password::INVALID_USER) {
            $this->passwords->verifyOrDummy(null, PlainPassword::of($token));
        }

        return $status;
    }

    /** Laravel's broker has its own 200 ms floor, which would end before the dummy check and leave two floors. */
    private function broker(): PasswordBroker
    {
        $broker = Password::broker();
        assert($broker instanceof PasswordBroker);
        $broker->getTimebox()->returnEarly();

        return $broker;
    }

    private function replacePassword(User $user, PlainPassword $password, string $email): void
    {
        $this->rejection->assertAcceptable($password, $user->name, $email);
        $this->passwords->set($user, $password);
        $user->save();
        $this->sessions->endAll($user);
        $this->lockout->clear(Email::canonical($user->email));
    }
}
