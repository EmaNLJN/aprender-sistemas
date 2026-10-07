<?php

namespace App\Runs\Execution;

enum ReplyKind
{
    case Result;
    case Busy;
    case NotReached;
    case Failed;
}
