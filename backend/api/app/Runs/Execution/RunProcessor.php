<?php

namespace App\Runs\Execution;

interface RunProcessor
{
    public function process(string $runId): void;
}
