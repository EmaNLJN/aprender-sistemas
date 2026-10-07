<?php

namespace App\Progress\Sync;

final readonly class RegisteredOperation
{
    public function __construct(
        public string $id,
        public string $hash,
        public bool $applied,
        public ?string $reason,
    ) {}
}
