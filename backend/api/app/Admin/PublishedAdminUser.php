<?php

namespace App\Admin;

use App\Models\User;
use App\Support\Iso8601;
use LogicException;

final readonly class PublishedAdminUser
{
    private function __construct(
        private int $id,
        private string $name,
        private string $email,
        private string $role,
        private string $status,
        private bool $emailVerified,
        private ?string $privacyVersion,
        private string $createdAt,
        private string $updatedAt,
    ) {}

    public static function from(User $user): self
    {
        $id = $user->getKey();
        if (! is_int($id) || $user->created_at === null || $user->updated_at === null) {
            throw new LogicException('A published admin user needs an integer id and its timestamps.');
        }

        return new self(
            $id,
            $user->name,
            $user->email,
            $user->role->value,
            $user->status->value,
            $user->email_verified_at !== null,
            $user->privacy_version,
            Iso8601::utc($user->created_at),
            Iso8601::utc($user->updated_at),
        );
    }

    /** @return array{id: int, name: string, email: string, role: string, status: string, emailVerified: bool, privacyVersion: string|null, createdAt: string, updatedAt: string} */
    public function toPublished(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'emailVerified' => $this->emailVerified,
            'privacyVersion' => $this->privacyVersion,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
