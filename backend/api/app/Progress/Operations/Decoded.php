<?php

namespace App\Progress\Operations;

final readonly class Decoded
{
    private function __construct(
        public string $id,
        public string $hash,
        public ?Operation $operation,
        public ?RejectionReason $reason,
    ) {}

    public static function valid(Operation $operation): self
    {
        return new self($operation->id, $operation->hash, $operation, null);
    }

    public static function rejected(string $id, string $hash, RejectionReason $reason): self
    {
        return new self($id, $hash, null, $reason);
    }
}
