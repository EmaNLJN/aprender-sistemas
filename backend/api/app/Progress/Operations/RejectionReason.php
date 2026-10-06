<?php

namespace App\Progress\Operations;

enum RejectionReason: string
{
    case UnknownReference = 'unknown_reference';
    case Invalid = 'invalid';
    case OutOfRange = 'out_of_range';
}
