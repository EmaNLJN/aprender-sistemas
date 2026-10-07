<?php

namespace App\Auth;

enum LoginResult: string
{
    case Success = 'success';
    case Failed = 'failed';
    case Disabled = 'disabled';
    case Throttled = 'throttled';
    case Locked = 'locked';
}
