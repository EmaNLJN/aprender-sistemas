<?php

namespace App\Progress\Sync;

use Carbon\CarbonImmutable;

final readonly class SyncRequest
{
    /** @param list<array<string, mixed>> $operations each with a UUID v4 id, a text type and a valid at */
    public function __construct(
        public int $epoch,
        public CarbonImmutable $sentAt,
        public int $knownRevision,
        public ?string $knownContentVersion,
        public int $format,
        public array $operations,
    ) {}
}
