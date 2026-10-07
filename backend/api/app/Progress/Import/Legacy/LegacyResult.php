<?php

namespace App\Progress\Import\Legacy;

use Carbon\CarbonImmutable;

final readonly class LegacyResult
{
    /** @param  list<array{testKey: string, passed: bool}>  $tests */
    public function __construct(
        public string $code,
        public bool $success,
        public bool $transportError,
        public string $stdout,
        public string $stderr,
        public array $tests,
        public CarbonImmutable $time,
        public string $customTest,
        public bool $customPassed,
        public ?int $attemptId,
    ) {}
}
