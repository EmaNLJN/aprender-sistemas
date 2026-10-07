<?php

namespace App\Runs;

enum CancelOutcome
{
    case Canceled;
    case Requested;
    case Unchanged;
    case NotFound;
}
