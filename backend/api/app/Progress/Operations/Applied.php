<?php

namespace App\Progress\Operations;

final readonly class Applied
{
    public function __construct(public bool $changed) {}
}
