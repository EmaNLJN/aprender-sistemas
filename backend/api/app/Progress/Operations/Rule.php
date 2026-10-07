<?php

namespace App\Progress\Operations;

enum Rule: string
{
    case Lww = 'lww';
    case LwwGroup = 'lww-group';
    case Tombstone = 'tombstone';
    case FlagOr = 'flag-or';
    case Max = 'max';
    case DatedFlag = 'dated-flag';
    case Observed = 'observed';
}
