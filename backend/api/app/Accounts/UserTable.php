<?php

namespace App\Accounts;

final readonly class UserTable
{
    private function __construct(
        public string $name,
        public Ownership $ownership,
        public ?string $export,
        public ?string $excluded,
        public ?string $batchesBy,
        public ?string $note,
        public ?string $parent,
        public ?string $reason,
    ) {}

    public static function owned(string $name, ?string $export, ?string $excluded, ?string $batchesBy, ?string $note): self
    {
        return new self($name, Ownership::UserId, $export, $excluded, $batchesBy, $note, null, null);
    }

    public static function child(string $name, string $of, ?string $export, ?string $excluded, string $note): self
    {
        return new self($name, Ownership::Child, $export, $excluded, null, $note, $of, null);
    }

    public static function exception(string $name, Ownership $ownership, string $reason): self
    {
        return new self($name, $ownership, null, null, null, null, null, $reason);
    }
}
