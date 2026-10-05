<?php

namespace App\Content;

/**
 * El único codificador de lo que publica la API (ADR 0006 D10): da, byte a byte, lo mismo que
 * JSON.stringify de JavaScript sobre el mismo valor, que es lo que hashea el generador
 * (tools/content/meta.ts). Compacto, sin escapar Unicode, `/` ni U+2028/U+2029.
 *
 * Los objetos JSON son siempre stdClass: un array asociativo con claves «0», «1»… sale como lista
 * y uno vacío sale `[]`, así que `{}` sólo se conserva con un stdClass vacío.
 */
final class PublishedJson
{
    private const ENCODE = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR;

    public static function encode(mixed $value): string
    {
        return json_encode($value, self::ENCODE);
    }

    /** Decodifica con objetos (stdClass) para que `{}` siga siendo `{}` al volver a codificar. */
    public static function decode(string $json): mixed
    {
        return json_decode($json, false, 512, JSON_THROW_ON_ERROR);
    }
}
