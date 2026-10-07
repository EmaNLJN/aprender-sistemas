<?php

namespace App\Runs\Program;

final readonly class ProgramInput
{
    /**
     * @param  list<ExpectedTest>  $tests
     * @param  list<string>  $imports
     */
    public function __construct(
        public string $code,
        public array $tests,
        public ?string $customTest,
        public array $imports,
        public string $nonce,
    ) {}
}
