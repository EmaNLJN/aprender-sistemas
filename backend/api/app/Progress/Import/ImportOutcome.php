<?php

namespace App\Progress\Import;

use App\Runs\Record\Instant;

final readonly class ImportOutcome
{
    public function __construct(public bool $repeated, public StoredImport $import) {}

    public function status(): int
    {
        return $this->repeated ? 200 : 201;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'importId' => $this->import->importId,
            'epoch' => $this->import->epoch,
            'revision' => $this->import->revision,
            'importedAt' => Instant::iso($this->import->importedAt),
            'report' => $this->import->report->toArray(),
        ];
    }
}
