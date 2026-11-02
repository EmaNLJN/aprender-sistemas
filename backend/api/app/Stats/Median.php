<?php

namespace App\Stats;

use LogicException;

final class Median
{
    /** @param array<int, int> $frequencies */
    public static function of(array $frequencies): int|float|null
    {
        ksort($frequencies);
        $total = array_sum($frequencies);
        if ($total === 0) {
            return null;
        }
        $sum = self::valueAt($frequencies, intdiv($total - 1, 2)) + self::valueAt($frequencies, intdiv($total, 2));

        return $sum % 2 === 0 ? intdiv($sum, 2) : $sum / 2;
    }

    /** @param array<int, int> $frequencies */
    private static function valueAt(array $frequencies, int $position): int
    {
        $seen = 0;
        foreach ($frequencies as $value => $count) {
            $seen += $count;
            if ($position < $seen) {
                return $value;
            }
        }
        throw new LogicException('The position is outside the observations.');
    }
}
