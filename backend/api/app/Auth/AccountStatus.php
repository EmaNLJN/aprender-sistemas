<?php

namespace App\Auth;

enum AccountStatus: string
{
    case Active = 'active';
    case Disabled = 'disabled';
    case Deleting = 'deleting';
}
