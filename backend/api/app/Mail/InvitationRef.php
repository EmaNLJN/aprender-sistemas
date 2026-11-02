<?php

namespace App\Mail;

final readonly class InvitationRef
{
    public function __construct(public int $id, public string $tokenHash) {}
}
