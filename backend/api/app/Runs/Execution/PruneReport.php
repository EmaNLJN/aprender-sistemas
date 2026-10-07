<?php

namespace App\Runs\Execution;

final readonly class PruneReport
{
    public function __construct(public int $runs, public int $payloads) {}
}
