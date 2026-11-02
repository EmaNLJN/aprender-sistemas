<?php

namespace App\Stats;

use App\Runs\Record\Instant;

final class Moment
{
    public static function iso(?string $datetime): ?string
    {
        return $datetime === null ? null : Instant::iso(Instant::parse($datetime));
    }
}
