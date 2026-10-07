<?php

namespace App\Runs\Evidence;

use App\Runs\TestOutcome;

final readonly class Evidence
{
    /** @param list<TestVerdict> $tests  one per expected test, in its order */
    public function __construct(public bool $complete, public array $tests, public ?TestOutcome $custom) {}
}
