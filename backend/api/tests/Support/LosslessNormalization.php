<?php

namespace Tests\Support;

use stdClass;

final class LosslessNormalization
{
    public static function holds(mixed $original, mixed $projection): bool
    {
        if (is_array($original)) {
            return is_array($projection) && self::listHolds($original, $projection);
        }
        if ($original instanceof stdClass) {
            return $projection instanceof stdClass && self::objectHolds($original, $projection);
        }
        if (is_numeric($original) && ! is_string($original)) {
            return (is_int($projection) || is_float($projection)) && $original == $projection;
        }

        return $original === $projection;
    }

    /**
     * @param  array<array-key, mixed>  $original
     * @param  array<array-key, mixed>  $projection
     */
    private static function listHolds(array $original, array $projection): bool
    {
        foreach ($original as $index => $item) {
            if (! array_key_exists($index, $projection) || ! self::holds($item, $projection[$index])) {
                return false;
            }
        }

        return true;
    }

    private static function objectHolds(stdClass $original, stdClass $projection): bool
    {
        foreach (get_object_vars($original) as $key => $value) {
            if (! property_exists($projection, (string) $key) || ! self::holds($value, $projection->{$key})) {
                return false;
            }
        }

        return true;
    }
}
