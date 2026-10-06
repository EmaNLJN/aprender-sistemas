<?php

namespace App\Accounts\Export;

use Generator;

interface ExportSection
{
    public function key(): string;

    /** @return array<array-key, mixed>|Generator<int, array<string, mixed>> */
    public function read(int $userId): array|Generator;
}
