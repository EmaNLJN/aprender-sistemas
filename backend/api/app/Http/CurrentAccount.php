<?php

namespace App\Http;

use App\Models\User;
use Illuminate\Http\Request;
use LogicException;

final class CurrentAccount
{
    public static function of(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new LogicException('The account group guarantees a signed in account.');
    }
}
