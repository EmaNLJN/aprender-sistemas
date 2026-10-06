<?php

namespace App\Admin;

use App\Models\User;

final readonly class LockedTarget
{
    public function __construct(public User $user, public int $otherActiveAdmins) {}
}
