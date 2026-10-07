<?php

namespace App\Auth;

final class NetworkKey
{
    private const UNKNOWN = 'unknown';

    private const IPV4_MAPPED_PREFIX = "\0\0\0\0\0\0\0\0\0\0\xff\xff";

    public static function of(?string $ip): string
    {
        if ($ip === null) {
            return self::UNKNOWN;
        }

        $packed = filter_var($ip, FILTER_VALIDATE_IP) === false ? false : inet_pton($ip);

        if ($packed === false) {
            return self::UNKNOWN;
        }

        if (strlen($packed) === 4) {
            return $ip;
        }

        if (str_starts_with($packed, self::IPV4_MAPPED_PREFIX)) {
            return (string) inet_ntop(substr($packed, 12));
        }

        return 'v6:'.bin2hex(substr($packed, 0, 8));
    }
}
