<?php

namespace App\Accounts;

enum Ownership: string
{
    case UserId = 'user_id';
    case Child = 'child';
    case ByEmail = 'email';
    case Ledger = 'ledger';
}
