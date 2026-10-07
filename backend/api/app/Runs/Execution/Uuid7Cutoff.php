<?php

namespace App\Runs\Execution;

use Carbon\CarbonImmutable;

final class Uuid7Cutoff
{
    private const LOW_WORD = 65536;

    public static function at(CarbonImmutable $instant): string
    {
        $milliseconds = (int) $instant->format('Uv');

        return sprintf('%08x-%04x-7000-8000-000000000000', intdiv($milliseconds, self::LOW_WORD), $milliseconds % self::LOW_WORD);
    }
}
