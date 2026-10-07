<?php

namespace App\Progress\Import;

use Carbon\CarbonImmutable;

final readonly class StoredImport
{
    public function __construct(
        public string $importId,
        public string $rawSha256,
        public int $epoch,
        public int $revision,
        public CarbonImmutable $importedAt,
        public ImportReport $report,
    ) {}
}
