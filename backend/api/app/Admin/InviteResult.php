<?php

namespace App\Admin;

use App\Auth\IssuedInvitation;

final readonly class InviteResult
{
    public function __construct(public string $email, public InviteOutcome $outcome, public ?IssuedInvitation $issued) {}
}
