<?php

namespace App\Runs\Program;

final readonly class ExpectedTest
{
    public function __construct(public string $key, public string $expression, public int $position) {}
}
