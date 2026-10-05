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

        if (! is_int($id)) {
            throw new LogicException('A published user needs an integer id.');
        }

        return new self(
            $id,
            $user->name,
            $user->email,
            $user->role->value,
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
