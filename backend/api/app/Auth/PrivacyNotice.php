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
        $accepted = $user->getAttribute('privacy_version');

        return is_string($accepted) && $this->isCurrent($accepted);
    }

    public function accept(User $user): void
    {
        $user->setAttribute('privacy_version', $this->current());
        $user->setAttribute('privacy_accepted_at', Date::now());
        $user->save();
    }
}
