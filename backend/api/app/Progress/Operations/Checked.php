<?php

namespace App\Progress\Operations;

final readonly class Checked
{
    private function __construct(
        public string $id,
        public string $hash,
        public ?Operation $operation,
        public ?RejectionReason $reason,
        public bool $stale,
    ) {}

    public static function ready(Operation $operation, bool $stale): self
    {
        return new self($operation->id, $operation->hash, $operation, null, $stale);
    }

    public static function rejected(string $id, string $hash, RejectionReason $reason): self
    {
        return new self($id, $hash, null, $reason, false);
    }
}
