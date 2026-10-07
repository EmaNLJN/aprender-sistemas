<?php

namespace App\Auth;

use LogicException;

final class EmailFingerprint
{
    private const LENGTH = 16;

    public static function of(string $email): string
    {
        $key = config('taller.log_hmac_key');

        if (! is_string($key) || $key === '') {
            throw new LogicException('LOG_HMAC_KEY is not configured.');
        }

        return substr(hash_hmac('sha256', Email::canonical($email), $key), 0, self::LENGTH);
    }
}
