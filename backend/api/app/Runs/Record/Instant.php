<?php

namespace App\Runs\Record;

use Carbon\CarbonImmutable;
use LogicException;

final class Instant
{
    private const FORMAT = 'Y-m-d H:i:s.v';

    public static function now(): CarbonImmutable
    {
        return now()->toImmutable()->utc();
    }

    public static function parse(string $value): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!'.self::FORMAT, $value, 'UTC')
            ?: throw new LogicException("No es un DATETIME(3): {$value}");
    }

    public static function parseOrNull(?string $value): ?CarbonImmutable
    {
        return $value === null ? null : self::parse($value);
    }

    public static function format(CarbonImmutable $at): string
    {
        return $at->utc()->format(self::FORMAT);
    }

    public static function iso(CarbonImmutable $at): string
    {
        return $at->utc()->format('Y-m-d\TH:i:s.v\Z');
    }

    public static function secondsUntil(CarbonImmutable $from, CarbonImmutable $to): int
    {
        return max(1, (int) ceil(((int) $to->format('Uv') - (int) $from->format('Uv')) / 1000));
    }
}
