<?php

namespace App\Runs\Execution;

use App\Runs\Evidence\Verdict;
use App\Runs\Record\RunRow;

final readonly class Claim
{
    private function __construct(
        public ClaimOutcome $outcome,
        public ?RunRow $run,
        public ?Verdict $verdict,
    ) {}

    public static function ready(RunRow $run): self
    {
        return new self(ClaimOutcome::Ready, $run, null);
    }

    public static function discard(): self
    {
        return new self(ClaimOutcome::Discard, null, null);
    }

    public static function closed(RunRow $run, Verdict $verdict): self
    {
        return new self(ClaimOutcome::Closed, $run, $verdict);
    }
}
