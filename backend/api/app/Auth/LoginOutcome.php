<?php

namespace App\Auth;

use App\Models\User;

final readonly class LoginOutcome
{
    public function __construct(
        public LoginResult $result,
        public ?User $user = null,
        public ?DeviceToken $device = null,
        public int $retryAfter = 0,
    ) {}
}
