<?php

namespace App\Progress\Sync;

use Carbon\CarbonImmutable;

final class ClockCorrection
{
    private const INT_MIN = -2147483648;

    private const INT_MAX = 2147483647;

    public static function effective(CarbonImmutable $at, CarbonImmutable $sentAt, CarbonImmutable $now): CarbonImmutable
    {
        $corrected = self::millis($at) + self::difference($now, $sentAt);

        return CarbonImmutable::createFromTimestampMsUTC(min($corrected, self::millis($now)));
    }

    public static function offsetMs(CarbonImmutable $sentAt, CarbonImmutable $now): int
    {
        return max(self::INT_MIN, min(self::INT_MAX, self::difference($now, $sentAt)));
    }

    private static function difference(CarbonImmutable $later, CarbonImmutable $earlier): int
    {
        return self::millis($later) - self::millis($earlier);
    }

    private static function millis(CarbonImmutable $instant): int
    {
        return $instant->getTimestamp() * 1000 + (int) $instant->format('v');
    }
}
