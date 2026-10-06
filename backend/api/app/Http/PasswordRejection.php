<?php

namespace App\Http;

use App\Auth\PasswordPolicy;
use App\Auth\PlainPassword;
use Illuminate\Validation\ValidationException;

final class PasswordRejection
{
    public function __construct(private PasswordPolicy $policy) {}

    /** @throws ValidationException with the violations under `password` */
    public function assertAcceptable(PlainPassword $password, ?string $name, ?string $email): void
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
}
