<?php

namespace App\Progress\Import;

final readonly class ImportRequest
{
    /** @param  array<array-key, mixed>  $normalized */
    public function __construct(
        public string $importId,
        public int $epoch,
        public int $format,
        public ImportSource $source,
        public string $raw,
        public array $normalized,
        public bool $confirm,
    ) {}
}
