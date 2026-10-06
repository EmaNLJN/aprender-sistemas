<?php

namespace App\Runs;

use App\Runs\Evidence\TestVerdict;
use App\Runs\Record\RunRow;

final readonly class RunView
{
    /** @param list<TestVerdict> $tests */
    public function __construct(public RunRow $run, public ?int $queuePosition, public array $tests, public ?TestOutcome $custom) {}
}
