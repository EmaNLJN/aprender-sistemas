<?php

namespace App\Runs\Execution;

enum ClaimOutcome
{
    case Ready;
    case Discard;
    case Closed;
}
