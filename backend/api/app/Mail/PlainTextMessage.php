<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\HtmlString;

final class PlainTextMessage extends Mailable
{
    public function __construct(public readonly OutgoingMail $mail) {}

    public function envelope(): Envelope
    {
        return new Envelope(to: [$this->mail->to], subject: (new MailText)->subject($this->mail->kind));
    }

    /** @return array{text: HtmlString} */
    protected function buildView(): array
    {
        return ['text' => new HtmlString((new MailText)->body($this->mail))];
    }
}
