<?php

namespace App\Mail;

final class MailAvailability
{
    public function isAvailable(): bool
    {
        if (! config()->boolean('taller.mail.required')) {
            return true;
        }

        $mailer = config()->string('mail.default');

        return ! in_array(config()->string("mail.mailers.{$mailer}.transport"), ['log', 'array'], true);
    }
}
