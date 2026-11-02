<?php

namespace App\Auth;

use App\Mail\MailAvailability;

final class Features
{
    public function __construct(private MailAvailability $mail) {}

    public function passwordReset(): bool
    {
        return $this->mail->isAvailable();
    }

    public function registration(): bool
    {
        return config()->boolean('taller.registration.open') && $this->mail->isAvailable();
    }
}
