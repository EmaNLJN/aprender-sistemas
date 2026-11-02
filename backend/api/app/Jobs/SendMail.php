<?php

namespace App\Jobs;

use App\Mail\InvitationSendStatus;
use App\Mail\MailAvailability;
use App\Mail\MailLog;
use App\Mail\MailNotSent;
use App\Mail\OutgoingMail;
use App\Mail\PlainTextMessage;
use DateTimeInterface;
use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\Timeout;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Throwable;

#[Timeout(60)]
final class SendMail implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    public function __construct(public readonly OutgoingMail $mail)
    {
        $this->onConnection('mail');
        $this->onQueue('mail');
    }

    public function retryUntil(): DateTimeInterface
    {
        return $this->mail->deadline;
    }

    /** @return array<int, int> */
    public function backoff(): array
    {
        return collect(config()->array('taller.mail.backoff'))
            ->map(fn (mixed $seconds) => is_int($seconds) ? $seconds : 60)
            ->values()
            ->all();
    }

    public function handle(Mailer $mailer, MailAvailability $availability, InvitationSendStatus $invitations): void
    {
        if (! $availability->isAvailable()) {
            $this->fail(MailNotSent::unavailable());

            return;
        }
        if ($this->mail->invitation !== null && ! $invitations->isCurrent($this->mail->invitation)) {
            MailLog::superseded($this->jobUuid(), $this->mail->invitation->id);

            return;
        }

        try {
            $mailer->send(new PlainTextMessage($this->mail));
        } catch (TransportExceptionInterface $error) {
            MailLog::attemptFailed($this->jobUuid(), $this->mail, $this->attempts(), $error);

            throw MailNotSent::from($error);
        }

        if ($this->mail->invitation !== null) {
            $invitations->markSent($this->mail->invitation);
        }
        MailLog::sent($this->jobUuid(), $this->mail, $this->attempts());
    }

    public function failed(?Throwable $error): void
    {
        if ($this->mail->invitation !== null) {
            app(InvitationSendStatus::class)->markFailed($this->mail->invitation);
        }
        MailLog::failed($this->jobUuid(), $this->mail, $error);
    }

    private function jobUuid(): string
    {
        return $this->job?->uuid() ?? 'sync';
    }
}
