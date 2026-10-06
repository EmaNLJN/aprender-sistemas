<?php

namespace App\Progress\Operations;

final class OperationHash
{
    /** @param array<array-key, mixed> $raw */
    public static function of(array $raw): string
    {
        unset($raw['id']);
        $canonical = json_encode(
            self::sortedKeys($raw),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR,
        );

        return hash('sha256', $canonical === false ? '' : $canonical);
    }

    private static function sortedKeys(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }
        if (! array_is_list($value)) {
            ksort($value, SORT_STRING);
        }

        return collect($value)->map(self::sortedKeys(...))->all();
    }
}
