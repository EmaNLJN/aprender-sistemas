<?php

namespace App\Progress\Sync;

use RuntimeException;

final class EpochMismatch extends RuntimeException
{
    public function __construct(public readonly int $epoch, public readonly int $revision)
    {
        parent::__construct("La época del pedido no es la vigente ({$epoch}).");
    }
}
