<?php

namespace App\Mail;

use App\Auth\InvitationToken;
use App\Auth\IssuedInvitation;
use App\Auth\IssuedResetLink;
use Carbon\CarbonImmutable;
use LogicException;

final readonly class OutgoingMail
{
    private function __construct(
        public MailKind $kind,
        public string $to,
        public ?string $name,
        public ?string $link,
        public ?CarbonImmutable $linkExpiresAt,
        public ?InvitationRef $invitation,
        public CarbonImmutable $queuedAt,
        public CarbonImmutable $deadline,
    ) {}

    public static function invitation(IssuedInvitation $issued): self
    {
        $invitation = $issued->invitation;
        $ref = new InvitationRef($invitation->id, InvitationToken::hash($issued->token));

        return self::build(MailKind::Invitation, $invitation->email, null, $issued->link(), CarbonImmutable::instance($invitation->expires_at), $ref);
    }

    public static function passwordReset(string $to, string $name, IssuedResetLink $issued): self
    {
        return self::build(MailKind::PasswordReset, $to, $name, $issued->url, $issued->expiresAt);
    }

    public static function emailVerification(string $to, string $name, string $link, CarbonImmutable $expiresAt): self
    {
        return self::build(MailKind::EmailVerification, $to, $name, $link, $expiresAt);
    }

    /** @throws LogicException for a kind that carries a link */
    public static function notice(MailKind $kind, string $to, ?string $name): self
    {
        if ($kind->carriesLink()) {
            throw new LogicException("The {$kind->value} mail carries a link and is not a notice.");
        }

        return self::build($kind, $to, $name, null, null);
    }

    private static function build(MailKind $kind, string $to, ?string $name, ?string $link, ?CarbonImmutable $linkExpiresAt, ?InvitationRef $invitation = null): self
    {
        $queuedAt = CarbonImmutable::now();

        return new self($kind, $to, $name, $link, $linkExpiresAt, $invitation, $queuedAt, MailDeadline::for($queuedAt, $linkExpiresAt));
    }
}
