<?php

namespace App\Content;

use App\Content\Codec\FieldMap;
use stdClass;

/** The first path where two decoded JSON values differ, to explain a ContentMismatch. */
final class JsonDiff
{
    public static function first(mixed $expected, mixed $actual, string $path): ?string
    {
        if ($expected instanceof stdClass && $actual instanceof stdClass) {
            $want = FieldMap::keysOf($expected);
            $have = FieldMap::keysOf($actual);
            if ($want !== $have) {
                return "{$path}: claves distintas o en otro orden: se esperaba [".implode(', ', $want).'] y las tablas dan ['.implode(', ', $have).']';
            }
            foreach ($want as $key) {
                $difference = self::first($expected->{$key}, $actual->{$key}, "{$path}.{$key}");
                if ($difference !== null) {
                    return $difference;
                }
            }

            return null;
        }
        if (is_array($expected) && is_array($actual)) {
            if (count($expected) !== count($actual)) {
                return "{$path}: se esperaban ".count($expected).' elementos y las tablas dan '.count($actual);
            }
            foreach ($expected as $index => $item) {
                $difference = self::first($item, $actual[$index], "{$path}[{$index}]");
                if ($difference !== null) {
                    return $difference;
                }
            }

            return null;
        }

        return $expected === $actual ? null : "{$path}: se esperaba ".self::show($expected).' y las tablas dan '.self::show($actual);
    }

    private static function show(mixed $value): string
    {
        return '«'.mb_strimwidth(is_string($value) ? $value : PublishedJson::encode($value), 0, 80, '…').'»';
    }
}
