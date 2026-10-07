<?php

namespace App\Progress\Reset;

final readonly class ResetRequest
{
    public function __construct(public int $epoch, public int $format) {}
}
