<?php

namespace App\Auth;

use App\Models\Invitation;

final readonly class IssuedInvitation
{
    public function __construct(public Invitation $invitation, public string $token, public bool $renewed) {}

    public function link(): string
    {
        return rtrim(config()->string('app.url'), '/').'/#invitacion='.$this->token;
    }
}
