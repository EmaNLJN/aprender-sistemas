<?php

namespace App\Admin;

enum InviteOutcome: string
{
    case Created = 'created';
    case Renewed = 'renewed';
    case UserExists = 'user_exists';
    case Pending = 'invitation_pending';
}
