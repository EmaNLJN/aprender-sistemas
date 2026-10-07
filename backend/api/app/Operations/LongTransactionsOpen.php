<?php

namespace App\Operations;

use RuntimeException;

final class LongTransactionsOpen extends RuntimeException
{
    /** @param list<int> $secondsOpen */
    public function __construct(public readonly array $secondsOpen)
    {
        parent::__construct(count($secondsOpen).' transacciones abiertas');
    }
}
