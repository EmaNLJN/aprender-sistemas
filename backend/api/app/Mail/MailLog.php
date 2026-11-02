<?php

namespace App\Mail;

use App\Auth\EmailFingerprint;
use Illuminate\Queue\MaxAttemptsExceededException;
use Illuminate\Support\Facades\Log;
use ReflectionClass;
use Throwable;

final class MailLog
{
    public static function queued(OutgoingMail $mail): void
    {
        Log::info('mail.queued', ['kind' => $mail->kind->value, 'recipient_hmac' => EmailFingerprint::of($mail->to)]);
    }

    public static function skipped(MailKind $kind): void
    {
        Log::info('mail.skipped', ['kind' => $kind->value, 'reason' => 'link_only']);
    }

    public static function sent(string $job, OutgoingMail $mail, int $attempt): void
    {
        Log::info('mail.sent', ['job' => $job, 'kind' => $mail->kind->value, 'recipient_hmac' => EmailFingerprint::of($mail->to), 'attempt' => $attempt]);
    }

    public static function attemptFailed(string $job, OutgoingMail $mail, int $attempt, Throwable $error): void
    {
        Log::warning('mail.attempt_failed', [
            'job' => $job,
            'kind' => $mail->kind->value,
            'recipient_hmac' => EmailFingerprint::of($mail->to),
            'attempt' => $attempt,
            'cause' => self::causeOf($error),
        ]);
    }

    public static function failed(string $job, OutgoingMail $mail, ?Throwable $error): void
    {
        Log::error('mail.failed', [
            'job' => $job,
            'kind' => $mail->kind->value,
            'recipient_hmac' => EmailFingerprint::of($mail->to),
            'cause' => $error === null ? 'unknown' : self::causeOf($error),
        ]);
    }

    public static function superseded(string $job, int $invitationId): void
    {
        Log::info('mail.superseded', ['job' => $job, 'invitation_id' => $invitationId]);
    }

    public static function resetSkipped(string $reason): void
    {
        Log::info('mail.reset_skipped', ['reason' => $reason]);
    }

    public static function appUrlLocal(string $host): void
    {
        Log::warning('mail.app_url_local', ['host' => $host]);
    }

    private static function causeOf(Throwable $error): string
    {
        return match (true) {
            $error instanceof MaxAttemptsExceededException => 'expired',
            $error instanceof MailNotSent => $error->cause(),
            default => (new ReflectionClass($error))->getShortName().' '.$error->getCode(),
        };
    }
}
