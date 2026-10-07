<?php

namespace App\Progress\Import\Legacy;

final readonly class ReportEntry
{
    public function __construct(public string $path, public string $reason) {}

    /** @return array{path: string, reason: string} */
    public function toArray(): array
    {
        return ['path' => $this->path, 'reason' => $this->reason];
    }
}
