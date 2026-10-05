<?php

namespace App\Support;

use Carbon\CarbonInterface;

final class Iso8601
{
    public static function utc(CarbonInterface $instant): string
    {
        return $instant->toImmutable()->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}
