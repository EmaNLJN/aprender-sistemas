<?php

namespace App\Auth;

use RuntimeException;

final class ResetLinkThrottled extends RuntimeException
{
    public function __construct(public readonly int $secondsLeft)
    {
        parent::__construct("A reset link was issued less than a minute ago: {$secondsLeft} seconds left.");
    }
}
