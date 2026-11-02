<?php

namespace Tests\Support;

use Closure;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

final class FailingTransport extends AbstractTransport
{
    public static int $calls = 0;

    public static string $reason = 'Connection refused';

    public static ?Closure $beforeFailing = null;

    public static function reset(): void
    {
        self::$calls = 0;
        self::$reason = 'Connection refused';
        self::$beforeFailing = null;
    }

    public static function install(): void
    {
        self::reset();
        config(['mail.default' => 'failing', 'mail.mailers.failing' => ['transport' => 'failing']]);
        app('mail.manager')->extend('failing', fn () => new self);
    }

    protected function doSend(SentMessage $message): void
    {
        self::$calls++;
        if (self::$beforeFailing !== null) {
            (self::$beforeFailing)();
        }

        throw new TransportException(self::$reason);
    }

    public function __toString(): string
    {
        return 'failing://';
    }
}
