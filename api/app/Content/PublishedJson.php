<?php

namespace App\Content;

/**
 * The only encoder for what the API publishes (ADR 0006 D10): byte for byte what JavaScript's
 * JSON.stringify gives for the same value, which is what the generator hashes
 * (tools/content/meta.ts). Compact, with Unicode, `/` and U+2028/U+2029 unescaped.
 *
 * JSON objects are always stdClass: an associative array with keys "0", "1"… comes out as a list
 * and an empty one comes out as `[]`, so `{}` is only kept with an empty stdClass.
 */
final class PublishedJson
{
    private const ENCODE = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR;

    public static function encode(mixed $value): string
    {
        return json_encode($value, self::ENCODE);
    }

    /** Decodes to objects (stdClass) so `{}` stays `{}` when encoded again. */
    public static function decode(string $json): mixed
    {
        return json_decode($json, false, 512, JSON_THROW_ON_ERROR);
    }
}
