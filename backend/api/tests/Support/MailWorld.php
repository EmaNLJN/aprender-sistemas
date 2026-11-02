<?php

namespace Tests\Support;

use Illuminate\Mail\MailManager;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
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

    public static function runWorker(): void
    {
        Artisan::call('queue:work', ['connection' => 'mail', '--queue' => 'mail', '--once' => true, '--stop-when-empty' => true]);
    }

    public static function captureLogs(): TestHandler
    {
        config(['logging.default' => 'stderr']);
        $handler = new TestHandler;
        Log::channel('stderr')->getLogger()->setHandlers([$handler]);

        return $handler;
    }

    /** @return list<LogRecord> */
    public static function recordsNamed(TestHandler $handler, string $message): array
    {
        return array_values(array_filter($handler->getRecords(), fn (LogRecord $record) => $record->message === $message));
    }

    public static function loggedText(TestHandler $handler): string
    {
        return implode("\n", array_map(
            fn (LogRecord $record) => $record->message.' '.json_encode($record->context).' '.json_encode($record->extra),
            $handler->getRecords(),
        ));
    }
}
