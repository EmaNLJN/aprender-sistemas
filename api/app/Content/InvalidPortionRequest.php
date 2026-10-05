<?php

namespace App\Content;

use RuntimeException;

final class InvalidPortionRequest extends RuntimeException
{
    /** @param array<string, list<string>> $errors */
    public function __construct(public readonly array $errors)
    {
        parent::__construct('Los parámetros del pedido no son válidos.');
    }
}
