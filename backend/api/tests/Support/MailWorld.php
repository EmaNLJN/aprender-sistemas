<?php

namespace Tests\Support;

use Illuminate\Mail\MailManager;
use Symfony\Component\Mailer\SentMessage;

final class MailWorld
{
    public static function available(): void
    {
        config(['taller.mail.required' => false]);
    }

    public static function onDatabaseQueue(): void
    {
        config(['queue.connections.mail.driver' => 'database']);
    }

    /** @return list<SentMessage> */
    public static function sent(): array
    {
        $mailer = app(MailManager::class)->mailer('array');
        $transport = $mailer->getSymfonyTransport();

        return $transport->messages()->all();
    }
}
