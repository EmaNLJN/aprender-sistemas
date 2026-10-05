<?php

namespace App\Auth;

enum PasswordViolation: string
{
    case TooShort = 'too_short';
    case TooLong = 'too_long';
    case TooManyBytes = 'too_many_bytes';
    case Blocked = 'blocked';
    case ContainsEmail = 'contains_email';
    case ContainsName = 'contains_name';

    public function message(): string
    {
        return __('password-policy.'.$this->value);
    }
}
