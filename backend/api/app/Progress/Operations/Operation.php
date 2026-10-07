<?php

namespace App\Progress\Operations;

use Carbon\CarbonImmutable;

final readonly class Operation
{
    /** @param array<string, string|int|bool|null> $values the validated fields by wire name, without id, type, at or contentVersion */
    public function __construct(
        public string $id,
        public OperationType $type,
        public CarbonImmutable $at,
        public array $values,
        public string $hash,
        public ?string $contentVersion,
    ) {}
}
