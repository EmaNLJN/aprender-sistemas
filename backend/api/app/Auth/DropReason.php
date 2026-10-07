<?php

namespace App\Auth;

enum DropReason: string
{
    case PasswordChanged = 'password_changed';
    case Deleting = 'deleting';
    case Disabled = 'disabled';
    case Expired = 'expired';
}
