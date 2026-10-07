<?php

namespace App\Accounts;

use RuntimeException;

final class MalformedLedger extends RuntimeException
{
    /** @param list<int> $lines */
    public function __construct(public readonly array $lines)
    {
        parent::__construct('El libro tiene líneas mal formadas: '.implode(', ', $lines).'.');
    }
}
