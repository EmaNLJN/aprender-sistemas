<?php

namespace App\Stats;

final class Percentile
{
    /** @param list<int> $values */
    public static function of(array $values, int $percent): ?int
    {
        if ($values === []) {
            return null;
        }
        sort($values);
        $rank = (int) ceil($percent / 100 * count($values));

        return $values[max(1, $rank) - 1];
    }
}
