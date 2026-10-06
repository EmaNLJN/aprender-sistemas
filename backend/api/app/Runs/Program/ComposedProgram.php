<?php

namespace App\Runs\Program;

final readonly class ComposedProgram
{
    /** @param list<string> $expectedTests */
    public function __construct(public string $text, public array $expectedTests, public bool $hasCustomTest, public string $nonce) {}
}
