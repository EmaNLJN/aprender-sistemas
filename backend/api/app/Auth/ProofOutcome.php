<?php

namespace App\Auth;

enum ProofOutcome: string
{
    case Verified = 'verified';
    case Wrong = 'wrong';
    case Throttled = 'throttled';
    case Locked = 'locked';
}
