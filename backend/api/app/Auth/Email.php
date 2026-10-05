<?php

namespace App\Auth;

final class Email
{
    public static function canonical(string $raw): string
    {
        return mb_strtolower(trim($raw));
    }
}
