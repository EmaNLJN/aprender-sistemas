<?php

namespace App\Runs\Admission;

final readonly class SubmittedRun
{
    public function __construct(public string $clientRunId, public string $exerciseId, public string $code, public ?string $customTest) {}
}
