<?php

namespace App\Admin;

use App\Models\Invitation;
use App\Models\User;
use App\Support\Iso8601;
use Carbon\CarbonInterface;
use LogicException;

final readonly class PublishedInvitation
{
    /** @param array{id: int, name: string}|null $invitedBy */
    private function __construct(
        private int $id,
        private string $email,
        private string $role,
        private string $delivery,
        private CarbonInterface $expiresAt,
        private ?CarbonInterface $sentAt,
        private ?CarbonInterface $sendFailedAt,
        private ?array $invitedBy,
        private CarbonInterface $createdAt,
    ) {}

    public static function from(Invitation $invitation, ?User $inviter): self
    {
        $id = $invitation->getKey();
        $delivery = $invitation->getAttribute('delivery');
        $createdAt = $invitation->getAttribute('created_at');
        $sentAt = $invitation->getAttribute('sent_at');
        $sendFailedAt = $invitation->getAttribute('send_failed_at');

        if (! is_int($id) || ! is_string($delivery) || ! $createdAt instanceof CarbonInterface) {
            throw new LogicException('A published invitation needs an integer id, a delivery and a creation date.');
        }

        return new self(
            $id,
            $invitation->email,
            $invitation->role->value,
            $delivery,
            $invitation->expires_at,
            $sentAt instanceof CarbonInterface ? $sentAt : null,
            $sendFailedAt instanceof CarbonInterface ? $sendFailedAt : null,
            $inviter === null ? null : ['id' => $inviter->id, 'name' => $inviter->name],
            $createdAt,
        );
    }

    /** @return array{id: int, email: string, role: string, delivery: string, expiresAt: string, expired: bool, sentAt: string|null, sendFailedAt: string|null, invitedBy: array{id: int, name: string}|null, createdAt: string} */
    public function toPublished(): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $this->role,
            'delivery' => $this->delivery,
            'expiresAt' => Iso8601::utc($this->expiresAt),
            'expired' => $this->expiresAt->isPast(),
            'sentAt' => $this->sentAt === null ? null : Iso8601::utc($this->sentAt),
            'sendFailedAt' => $this->sendFailedAt === null ? null : Iso8601::utc($this->sendFailedAt),
            'invitedBy' => $this->invitedBy,
            'createdAt' => Iso8601::utc($this->createdAt),
        ];
    }
}
