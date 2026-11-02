<?php

namespace App\Mail;

use LogicException;

final class MailText
{
    public function subject(MailKind $kind): string
    {
        return $this->line("mail.{$kind->value}.subject");
    }

    public function body(OutgoingMail $mail): string
    {
        $key = $mail->kind->value;
        $blocks = [$this->greeting($mail), $this->line("mail.{$key}.body")];

        if ($mail->kind->carriesLink()) {
            $blocks[] = (string) $mail->link;
            $blocks[] = $this->line("mail.{$key}.expires", ['expires' => $this->expiry($mail)]);
        }

        $blocks[] = $this->line("mail.{$key}.closing");
        $blocks[] = $this->line('mail.signature');

        return implode("\n\n", $blocks)."\n";
    }

    private function greeting(OutgoingMail $mail): string
    {
        if ($mail->kind === MailKind::Invitation || $mail->name === null) {
            return $this->line('mail.greeting_anonymous');
        }

        return $this->line('mail.greeting', ['name' => $mail->name]);
    }

    private function expiry(OutgoingMail $mail): string
    {
        $expiresAt = $mail->linkExpiresAt ?? throw new LogicException('A mail with a link has an expiry.');

        return $expiresAt
            ->setTimezone(config()->string('taller.mail.timezone'))
            ->format($this->line('mail.expires_format'));
    }

    /** @param array<string, string> $replace */
    private function line(string $key, array $replace = []): string
    {
        $line = __($key, $replace);

        return is_string($line) ? $line : throw new LogicException("The mail text {$key} is not a string.");
    }
}
