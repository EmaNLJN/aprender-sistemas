<?php

namespace App\Auth;

use App\Models\User;
use LogicException;

final readonly class PublishedUser
{
    private function __construct(
        private int $id,
        private string $name,
        private string $email,
        private string $role,
        private bool $privacyAccepted,
    ) {}

    public static function from(User $user): self
    {
        $id = $user->getKey();
        $role = $user->getAttributes()['role'] ?? null;

        if (! is_int($id) || ! is_string($role)) {
            throw new LogicException('A published user needs an integer id and a role.');
        }

        return new self(
            $id,
            (string) $user->name,
            (string) $user->email,
            $role,
            (new PrivacyNotice)->acceptedBy($user),
        );
    }

    /** @return array{id: int, name: string, email: string, role: string, privacyAccepted: bool} */
    public function toPublished(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'privacyAccepted' => $this->privacyAccepted,
        ];
    }
}
