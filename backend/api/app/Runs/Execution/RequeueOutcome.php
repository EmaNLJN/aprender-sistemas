<?php

namespace App\Runs\Execution;

enum RequeueOutcome
{
    case Requeued;
    case Closed;
    case Gone;
}
