<?php

namespace App\Progress;

use RuntimeException;

final class AccountGone extends RuntimeException
{
    public function __construct(public readonly int $userId)
    {
        parent::__construct('La cuenta ya no existe.');
    }
}
