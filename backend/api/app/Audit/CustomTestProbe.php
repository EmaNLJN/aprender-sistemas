<?php

namespace App\Audit;

use App\Runs\TestOutcome;

final readonly class CustomTestProbe
{
    public function __construct(public string $expression, public TestOutcome $expected) {}
}
