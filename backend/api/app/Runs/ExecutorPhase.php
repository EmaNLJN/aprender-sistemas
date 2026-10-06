<?php

namespace App\Runs;

enum ExecutorPhase: string
{
    case Compile = 'compile';
    case Run = 'run';
}
