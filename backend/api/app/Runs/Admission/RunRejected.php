<?php

namespace App\Runs\Admission;

use RuntimeException;

final class RunRejected extends RuntimeException
{
    public function __construct(public readonly Rejection $rejection)
    {
        parent::__construct("Run rejected: {$rejection->kind->name}");
    }
}
