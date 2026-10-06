<?php

namespace App\Runs\Evidence;

final readonly class ExpectedEvidence
{
    /** @param list<string> $testKeys */
    public function __construct(public string $nonce, public array $testKeys, public bool $hasCustomTest) {}
}
