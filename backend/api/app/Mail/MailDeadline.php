<?php

namespace App\Mail;

use Carbon\CarbonImmutable;

final class MailDeadline
{
    public static function for(CarbonImmutable $queuedAt, ?CarbonImmutable $linkExpiresAt): CarbonImmutable
    {
        $window = $queuedAt->addSeconds(config()->integer('taller.mail.retry_seconds'));

        return $linkExpiresAt === null ? $window : $linkExpiresAt->min($window);
    }
}
