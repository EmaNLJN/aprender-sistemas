<?php

namespace App\Runs\Evidence;

use App\Runs\TestOutcome;

/** A list of these, not an array keyed by test key: PHP turns a key such as '123' into an integer. */
final readonly class TestVerdict
{
    public function __construct(public string $key, public TestOutcome $outcome) {}
}
