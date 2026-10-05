<?php

namespace App\Content;

use RuntimeException;

/** Los parámetros de un pedido de contenido no corresponden a ninguna porción (422). */
final class InvalidPortionRequest extends RuntimeException
{
    /** @param array<string, list<string>> $errors un mensaje por parámetro */
    public function __construct(public readonly array $errors)
    {
        parent::__construct('Los parámetros del pedido no son válidos.');
    }
}
