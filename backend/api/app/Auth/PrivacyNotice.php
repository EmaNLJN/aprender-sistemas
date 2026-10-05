<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Date;

final class PrivacyNotice
{
    public function current(): string
    {
        return config()->string('taller.privacy_version');
    }

    public function isCurrent(string $version): bool
    {
        return $version === $this->current();
    }

    public function acceptedBy(User $user): bool
    {
        return $user->privacy_version !== null && $this->isCurrent($user->privacy_version);
    }

    public function accept(User $user): void
    {
        $user->privacy_version = $this->current();
        $user->privacy_accepted_at = Date::now();
        $user->save();
    }
}
