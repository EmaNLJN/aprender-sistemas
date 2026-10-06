<?php

namespace App\Auth\Events;

enum AccountRestriction: string
{
    case Disabled = 'disabled';
    case Demoted = 'demoted';
    case Deleting = 'deleting';
}
