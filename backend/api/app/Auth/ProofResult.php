<?php

namespace App\Auth;

final readonly class ProofResult
{
    public function __construct(public ProofOutcome $outcome, public int $retryAfter = 0) {}
}
